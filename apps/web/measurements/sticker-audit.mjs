/**
 * Sticker UI audit of the built app, measured from the rendered page.
 *
 * WHAT THIS IS. The flat-sticker-on-paper language shared by Duolingo, Slush,
 * Headspace and ClassDojo is eight rules, and every one of them is mechanically
 * checkable from computed styles. A paper ground, flat fills, structural
 * outlines, generous rounding, colour used as a surface, body copy that
 * recedes, a display face with a floor, and a character palette that never
 * touches chrome. This walks the BUILT app and reports where each one stands.
 *
 * WHY THE BUILT APP AND NOT THE STYLESHEET. Same reason contrast-audit.mjs
 * exists next to it: a token table can be right while the component ignores it.
 * theme.css reasoned about contrast carefully and the charge sign still shipped
 * as a literal #ffffff. A rule is only broken where it is composed, so this
 * reads what the browser drew.
 *
 * WHAT IT MEASURES, AND WHAT IT REFUSES TO. It scores nine of the ten checks.
 * Anything it cannot resolve is reported UNRESOLVED and scored neither way, the
 * same discipline the contrast audit applies to an SVG mark sitting on another
 * mark. A guessed number reads as authoritative and is not. In particular:
 *
 *   - Rule 8 has no recorded floor. docs/DESIGN-TOKENS.md names the display
 *     face (Fraunces, class `.title-face`) and the handwritten accent (Caveat,
 *     class `.playful-face`, "short labels only") and states no minimum size
 *     for either. Duolingo's feather is forbidden below 48px and Slush's
 *     Lateral starts at 70px, but neither number is this project's, so the
 *     audit reports the OBSERVED SIZE DISTRIBUTION and scores nothing. Record a
 *     floor in DESIGN-TOKENS.md and this becomes a scored rule.
 *   - Rule 1's dark ground. The light ground is `#f6f4ef`, warm paper. The dark
 *     ground is `#0c0a09`, which is the near-black app chrome rule 1 describes
 *     as the failure. But light-first with dark as a choice is a recorded owner
 *     decision, so whether this product's dark theme is allowed a near-black
 *     ground is a design call and not the audit's. The scored half of rule 1 is
 *     narrower and answerable: does the body actually paint the ground token.
 *   - The body's own background-image. It is two 1px linear-gradients drawing
 *     the 28px hairline grid. That is a texture, not a colour ramp, and rule 2
 *     is about chrome, so it is reported once as an observation rather than
 *     silently dropped or silently counted.
 *
 * THE ALLOW-LIST FOR SHADOWS IS EMPTY, AND THAT IS THE DESIGN. The language
 * permits a shadow only where stacking is the meaning: a deck of cards, a sheet
 * lifted mid-drag. That exemption has to be an explicit, recorded act a reader
 * can see in the markup, so it is spelled `[data-stacking]` and nothing in the
 * app carries it today. Adding the attribute is a visible diff; widening a
 * selector list buried in this file is not.
 *
 * WHICH SURFACES. Nine surfaces are reachable by a hash alone. The economy
 * moments are not: the reward screen, the combo interstitial, the graded answer
 * strip, the four HUD states and the three streak screens only exist after a
 * lesson has been played, and some need six days of history behind them. Those
 * come from economy-moments.mjs, the same drives capture-economy.mjs and
 * contrast-audit.mjs use, so the three cannot drift. An unvisited surface is an
 * unmeasured one, and this project has already paid for that lesson once.
 *
 * BOTH VIEWPORTS, because two of the ten rules are geometry. The tab bar is a
 * bottom nav at 390px and a sidebar at 1280px, and rule 10 is a claim about the
 * bottom nav; a desktop-only walk would report nothing and read as a pass.
 *
 * IT MEASURES THE SETTLED STATE. Unlike the contrast audit it takes no
 * mid-animation frame: border width, radius, font family and nav item count do
 * not change during a transition, and the two that could (a gradient or a
 * shadow that only exists mid-flight) would be reported at rest anyway if the
 * element declares them.
 *
 * Usage, from apps/web:
 *   npm run build
 *   node measurements/sticker-audit.mjs
 *
 * Writes measurements/sticker-audit.json and exits nonzero on any violation.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import { LESSON_HASH, MOMENTS, installSeed, sleep } from "./economy-moments.mjs";

/* ------------------------------------------------------------------ config */

/**
 * The radius floor.
 *
 * docs/DESIGN-TOKENS.md: "House radius is `rounded-xl`, 12 px", which is also
 * the skill's stated typical floor and Duolingo's 12px on everything. The same
 * file records `rounded-[9px]` for pressable buttons, and that is a divergence
 * from the house radius rather than a second floor, so it is measured against
 * 12 and reported.
 */
const RADIUS_FLOOR_PX = 12;

/**
 * What counts as a saturated colour, for rules 6 and 7.
 *
 * HSL saturation at or above this, with a lightness away from both ends, is a
 * hue a reader perceives as colour rather than as a neutral. The near-neutrals
 * in the palette (`--border` #e2e8f0 at S 0.32 but L 0.93, `--muted-foreground`
 * #475569 at S 0.20) sit outside the band by design, so a slate grey is not
 * reported as "the palette".
 */
const SATURATION_MIN = 0.3;
const LIGHTNESS_MIN = 0.12;
const LIGHTNESS_MAX = 0.9;

/**
 * Rule 6's threshold: how much of a route's painted area has to be a saturated
 * fill before the palette counts as a surface rather than as line work.
 *
 * This is the one judged number in the file and it is stated rather than
 * hidden. Two percent of the page area is roughly one full-width band 20px tall
 * on a 1000px page, or a single 150px sticker: below that the palette is not
 * appearing as a surface in any sense the language means. The measured
 * percentage is printed for every route whether it passes or not, so the
 * threshold can be argued with from the numbers rather than re-run.
 */
const SURFACE_MIN_FRACTION = 0.02;

/**
 * The character-art palette, read out of src/mascot/BlueberryMark.tsx.
 *
 * Rule 8 of the language: the mascot holds a SECOND palette that never touches
 * UI chrome. This is that palette, literally: the berry's radial-gradient
 * stops, the calyx, the eye ink, the blush, and the wardrobe.
 *
 * berryState.ts and berryCostume.ts hold no colours at all. They are numeric
 * knobs (darken, haloStrength, jitterPx) and enum names, and mascot.css draws
 * every state from SHARED THEME TOKENS: `--good` for the charged halo,
 * `--warn-ink-strong` for sparks, `--charge-chip` for the charge ring. So there
 * is no separate chemical-state palette to contain, and the audit says so
 * rather than inventing one to have something to check.
 */
const MASCOT_PALETTE = [
  { hex: "#bdefff", role: "berry gradient stop 0" },
  { hex: "#3fa9ff", role: "berry gradient stop 28" },
  { hex: "#3d63f5", role: "berry gradient stop 66" },
  { hex: "#2b2fb0", role: "berry gradient stop 100" },
  { hex: "#4a6cff", role: "calyx gradient top" },
  { hex: "#2a2496", role: "calyx gradient bottom" },
  { hex: "#241f7a", role: "calyx hub and costume ink" },
  { hex: "#0b0b14", role: "eye and smile ink" },
  { hex: "#fb7185", role: "blush" },
  { hex: "#f4f2ec", role: "costume cloth" },
  { hex: "#d8d3c8", role: "costume cloth shade" },
  { hex: "#a97d3e", role: "costume tweed" },
  { hex: "#cba36a", role: "costume tan" },
  { hex: "#b45309", role: "costume pack" },
  { hex: "#7c3d06", role: "costume pack strap" },
  { hex: "#f0a02a", role: "costume whistle" },
  { hex: "#7c3aed", role: "costume cape" },
  { hex: "#5b21b6", role: "costume cape fold" },
  { hex: "#8a6a3f", role: "costume loupe" },
  { hex: "#e8f6ff", role: "costume lens" },
  { hex: "#2a2724", role: "costume goggles" },
  { hex: "#5b4327", role: "costume trench" },
  { hex: "#7a5626", role: "costume trench shade" },
];

/**
 * The display and accent faces, from docs/DESIGN-TOKENS.md.
 *
 * `floorPx: null` means the project has recorded no minimum size for that face.
 * Fill one in and rule 8 starts scoring; until then it reports the observed
 * distribution and says that is what it is doing.
 */
const DISPLAY_FACES = [
  { name: "Fraunces", needle: "fraunces", floorPx: null, note: "the display face, class .title-face" },
  { name: "Caveat", needle: "caveat", floorPx: null, note: "the handwritten accent, class .playful-face, short labels only" },
];

/** The one shadow exemption, and it is opt-in in the markup. Nothing carries it today. */
const STACKING_ALLOW_SELECTOR = "[data-stacking]";

const TABS = ["trainer", "pathway", "courses", "search", "leaderboards", "periodic", "chat", "messages"];

/**
 * The economy moments as routes.
 *
 * `root` is null everywhere on purpose, unlike the contrast audit. That audit
 * scopes a full-screen stage to its own subtree because measuring pairs a
 * student is not looking at is noise. Half the sticker rules are aggregates
 * over a whole screen (rule 6 wants the route's painted area, rule 10 wants the
 * nav and the mascot count), and an aggregate over a subtree is a different
 * measurement with the same name. So every economy route measures the page, and
 * the drive is what guarantees the moment is the thing on top of it.
 */
const ECONOMY_ROUTES = [
  "feedback-correct",
  "feedback-wrong",
  "combo",
  "reward-first",
  "reward-streak",
  "hud-rest",
  "hud-lit",
  "hud-charge",
  "hud-streak",
  "streak-rest",
  "streak-milestone",
  "streak-exam",
];

const ROUTES = [
  ...TABS.map((tab) => ({ name: tab, hash: `#/${tab}` })),
  { name: "onboarding", hash: "#/start/welcome" },
  ...ECONOMY_ROUTES.map((name) => ({
    name,
    moment: name,
    seed: MOMENTS[name].seed,
    stored: MOMENTS[name].stored ?? {},
    momentHash: MOMENTS[name].hash ?? null,
    drive: MOMENTS[name].drive,
  })),
];

const VIEWPORTS = {
  phone: { width: 390, height: 844, deviceScaleFactor: 1 },
  desktop: { width: 1280, height: 900, deviceScaleFactor: 1 },
};

/* ------------------------------------------------------------------ server */

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv !== undefined && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) throw new Error("No Chrome or Edge found. Set CHROME_PATH.");
  return found;
}

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  throw new Error("dist/index.html not found. Run `npm run build` first.");
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.join(distDir, file);
  if (!target.startsWith(distDir) || !existsSync(target)) {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
  response.end(await readFile(target));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ------------------------------------------------------- the measurement */

/**
 * Every rule, as one function evaluated inside the page.
 *
 * It is passed as a function to page.evaluate rather than injected as a module
 * the app imports, because the built app is the artifact under test and adding
 * an import to it would change what is being measured.
 *
 * Returns { findings, observations, route metrics }. A finding is scored. An
 * observation is not: it is a number a person should see and the script has no
 * standing to grade.
 */
function stickerAuditInPage(config) {
  const { radiusFloor, saturationMin, lightnessMin, lightnessMax, mascotPalette, displayFaces, stackingAllow } = config;

  /* --- colour ------------------------------------------------------- */

  const parse = (value) => {
    const match = /rgba?\(([^)]+)\)/.exec(value ?? "");
    if (match === null) return null;
    const parts = match[1].split(/[,\s/]+/).filter((p) => p.length > 0).map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const hex = (c) => `#${[c.r, c.g, c.b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
  const hsl = ({ r, g, b }) => {
    const rn = r / 255;
    const gn = g / 255;
    const bn = b / 255;
    const max = Math.max(rn, gn, bn);
    const min = Math.min(rn, gn, bn);
    const l = (max + min) / 2;
    const d = max - min;
    if (d === 0) return { h: 0, s: 0, l };
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) * 60;
    else if (max === gn) h = ((bn - rn) / d + 2) * 60;
    else h = ((rn - gn) / d + 4) * 60;
    return { h, s, l };
  };
  const isSaturated = (colour) => {
    const { s, l } = hsl(colour);
    return s >= saturationMin && l >= lightnessMin && l <= lightnessMax;
  };
  /** Circular hue distance in degrees, treating near-neutrals as hue-compatible. */
  const hueGap = (a, b) => {
    const ha = hsl(a);
    const hb = hsl(b);
    if (ha.s < 0.1 && hb.s < 0.1) return 0;
    const raw = Math.abs(ha.h - hb.h);
    return Math.min(raw, 360 - raw);
  };

  /** Resolve any CSS colour expression (a var, a hex, an oklch) to rgb, via a probe. */
  const resolveToken = (expression) => {
    const probe = document.createElement("span");
    probe.style.cssText = `position:absolute;left:-9999px;top:-9999px;color:${expression}`;
    document.body.appendChild(probe);
    const value = getComputedStyle(probe).color;
    probe.remove();
    return parse(value);
  };

  /* --- geometry and classification ---------------------------------- */

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (Number(style.opacity) < 0.05) return false;
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
  };

  const label = (el) => {
    const id = el.id !== "" ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className !== "" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 110);
  };

  /**
   * A CONTROL is anything a student presses.
   *
   * The explicit roles, plus an `a[href]` that has been given a box. An anchor
   * still rendering `display: inline` is a link inside prose and is not a
   * control; the tab bar's links are flex boxes and are. That distinction is
   * mechanical and it is the one the rules mean: rule 3's "outlined buttons are
   * first-class" is not a claim about the word "here" in a sentence.
   */
  const CONTROL_ROLES = "button, input, select, textarea, summary, [role=button], [role=tab], [role=switch], [role=menuitem], [role=radio], [role=checkbox]";
  const isControl = (el) => {
    if (el.matches(CONTROL_ROLES)) return true;
    if (el.matches("a[href]")) return !getComputedStyle(el).display.startsWith("inline");
    return false;
  };

  /** A landmark bar. Chrome for the fill rules, exempt from the shape rules; see the report. */
  const isBar = (el) => el.matches("nav, header, footer, aside, [role=navigation], [role=banner], [role=contentinfo], [role=toolbar]");

  const viewportArea = window.innerWidth * window.innerHeight;
  const pageArea = Math.max(
    viewportArea,
    Math.max(document.documentElement.scrollWidth, window.innerWidth) * Math.max(document.documentElement.scrollHeight, window.innerHeight),
  );

  /** The composited opaque colour painted behind an element, climbing to the root. */
  const groundBehind = (el) => {
    let node = el.parentElement;
    while (node !== null) {
      const back = parse(getComputedStyle(node).backgroundColor);
      if (back !== null && back.a >= 0.9) return back;
      node = node.parentElement;
    }
    return { r: 255, g: 255, b: 255, a: 1 };
  };

  /**
   * A SURFACE is an element that paints its own ground.
   *
   * "Paints its own" means either a background-colour that differs from what is
   * behind it, or a background-image. THE SECOND CLAUSE IS LOAD BEARING and it
   * was missing on the first run: an element filled by a gradient has no
   * background-colour at all, so a colour-only test could never see the one
   * thing rule 2 exists to find, and the rule reported clean on an app with a
   * gradient on its leaderboard badge. A surface has to be at least 20 by 20 to
   * count, because the language's "buttons, pills and cards" includes small
   * tags but not a 6px dot, and a page-sized element is the ground rather than
   * a thing sitting on it.
   */
  const paintsOwnSurface = (el) => {
    if (el instanceof SVGElement) return false;
    if (el === document.body || el === document.documentElement) return false;
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    if (box.width * box.height < 400) return false;
    if (box.width >= window.innerWidth * 0.98 && box.height >= window.innerHeight * 0.9) return false;
    if (style.backgroundImage !== "none" && style.backgroundImage !== "") return true;
    const own = parse(style.backgroundColor);
    if (own === null || own.a < 0.5) return false;
    return hex(own) !== hex(groundBehind(el));
  };

  /**
   * A CARD is a surface big enough to be a container rather than a chip.
   *
   * The size split exists because the rules ask different things of the two.
   * Rules 2, 3 and 9 are about what a surface is FILLED with and apply to any
   * painted thing; rules 4 and 5 are about the shape of "buttons, pills and
   * cards", and a 24px decorative swatch is none of those. 2500 square pixels
   * is a 50 by 50 box, one step above the 44 point touch floor.
   */
  const isCard = (el) => {
    if (isControl(el) || isBar(el)) return false;
    if (!paintsOwnSurface(el)) return false;
    const box = el.getBoundingClientRect();
    return box.width * box.height >= 2500;
  };

  /* --- accumulators -------------------------------------------------- */

  const findings = [];
  const observations = [];
  const add = (rule, element, value, detail) => findings.push({ rule, element, value, detail: detail ?? null });
  const note = (rule, element, value, detail) => observations.push({ rule, element, value, detail: detail ?? null });

  const all = [...document.body.querySelectorAll("*")].filter((el) => !(el instanceof SVGElement) || el.tagName.toLowerCase() === "svg");

  /**
   * Chrome, in two tiers.
   *
   * `chrome` is everything the fill rules apply to: controls, landmark bars,
   * cards, and any smaller painted chip. `shaped` is the subset the shape rules
   * apply to: controls and cards, the language's "buttons, pills and cards".
   * A bar is in the first and not the second, because a full-bleed tab bar
   * legitimately has no radius and its border is one edge by design.
   */
  const chrome = [];
  for (const el of all) {
    if (!visible(el)) continue;
    const kind = isControl(el) ? "control" : isCard(el) ? "card" : isBar(el) ? "bar" : paintsOwnSurface(el) ? "chip" : null;
    if (kind !== null) chrome.push({ el, kind });
  }
  const shaped = chrome.filter((entry) => entry.kind === "control" || entry.kind === "card");

  /* --- 1. paper canvas ------------------------------------------------ */

  const bodyStyle = getComputedStyle(document.body);
  const bodyBg = parse(bodyStyle.backgroundColor);
  const groundToken = resolveToken("var(--background)");
  if (bodyBg === null || groundToken === null) {
    note("1-paper-canvas", "body", `${bodyStyle.backgroundColor} vs var(--background)`, "one of the two could not be parsed, so the pair is unresolved");
  } else if (bodyBg.a < 0.995) {
    note("1-paper-canvas", "body", `${hex(bodyBg)} alpha ${bodyBg.a}`, "the body ground is translucent, so what a reader sees depends on the browser's own canvas");
  } else if (hex(bodyBg) !== hex(groundToken)) {
    add("1-paper-canvas", "body", `${hex(bodyBg)}, token says ${hex(groundToken)}`, "the body paints a ground that is not the intended token");
  }
  {
    const ground = bodyBg === null ? null : hsl(bodyBg);
    if (ground !== null) {
      note(
        "1-paper-canvas",
        "body",
        `${hex(bodyBg)} lightness ${(ground.l * 100).toFixed(0)} percent`,
        ground.l >= 0.85
          ? "a paper ground"
          : "a dark ground. The language calls a near-black canvas the failure shape, but light-first with dark as a choice is a recorded owner decision, so this is reported and not scored",
      );
    }
    const bodyImage = bodyStyle.backgroundImage;
    if (bodyImage !== "none" && bodyImage.includes("gradient")) {
      note("1-paper-canvas", "body", bodyImage.slice(0, 90), "the body carries gradients. These draw the 28px hairline grid, a 1px texture rather than a colour ramp, so rule 2 does not score them; a person should confirm that reading");
    }
  }

  /* --- 2. no gradients on chrome -------------------------------------- */

  for (const { el, kind } of chrome) {
    const image = getComputedStyle(el).backgroundImage;
    if (image === "none" || !image.includes("gradient")) continue;
    add("2-no-gradients", label(el), `on a ${kind}: ${image.replace(/\s+/g, " ").slice(0, 96)}`, null);
  }

  /* --- 3. no shadows on chrome, and no fake extrusions ----------------- */

  /**
   * A computed box-shadow is a comma separated list, and most of the entries in
   * this app are Tailwind's own reset: `rgba(0,0,0,0) 0px 0px 0px 0px`, a fully
   * transparent layer at zero offset that paints nothing. Reporting those was
   * the first run's largest false positive. A layer counts only when its colour
   * has alpha and at least one of its lengths is non-zero.
   */
  const shadowLayers = (value) => {
    const parts = [];
    let depth = 0;
    let current = "";
    for (const character of value) {
      if (character === "(") depth += 1;
      if (character === ")") depth -= 1;
      if (character === "," && depth === 0) {
        parts.push(current);
        current = "";
        continue;
      }
      current += character;
    }
    parts.push(current);
    return parts.map((part) => part.trim()).filter((part) => part !== "");
  };
  const layerPaints = (layer) => {
    const colourMatch = /(?:rgba?|hsla?|color|oklch|oklab|lab|lch)\([^)]*\)/.exec(layer);
    let alpha = 1;
    if (colourMatch !== null) {
      const parsed = parse(colourMatch[0]);
      if (parsed !== null) alpha = parsed.a;
      else {
        const slash = /\/\s*([0-9.]+%?)\s*\)/.exec(colourMatch[0]);
        if (slash !== null) alpha = slash[1].endsWith("%") ? parseFloat(slash[1]) / 100 : parseFloat(slash[1]);
      }
    }
    if (alpha <= 0.02) return false;
    const rest = colourMatch === null ? layer : layer.replace(colourMatch[0], " ");
    const lengths = rest.match(/-?\d*\.?\d+px/g) ?? [];
    return lengths.some((length) => parseFloat(length) !== 0);
  };

  for (const { el, kind } of chrome) {
    if (el.closest(stackingAllow) !== null) continue;
    const shadow = getComputedStyle(el).boxShadow;
    if (shadow === "none" || shadow === "") continue;
    const painted = shadowLayers(shadow).filter(layerPaints);
    if (painted.length === 0) continue;
    const inset = painted.some((layer) => layer.includes("inset"));
    add(
      "3-no-shadows",
      label(el),
      `on a ${kind}, ${inset ? "inset (a bevel or a ring)" : "outset (a drop shadow)"}: ${painted.join(", ").replace(/\s+/g, " ").slice(0, 96)}`,
      null,
    );
  }

  /**
   * The fake extrusion.
   *
   * A solid darker block offset beneath an element to imply depth passes a
   * box-shadow check and violates the intent of rule 3 exactly. It is detected
   * as a sibling painted behind the element, of the same hue at lower
   * lightness, the same size, offset ONLY on Y. The pathway node's lip is the
   * known instance: `.path-node__edge` is a disc of `--node-edge` sitting 10px
   * below a face of `--node-face`, and the two are three steps apart on one
   * hue by explicit design.
   */
  for (const el of all) {
    if (!visible(el) || el instanceof SVGElement) continue;
    const front = parse(getComputedStyle(el).backgroundColor);
    if (front === null || front.a < 0.5) continue;
    const box = el.getBoundingClientRect();
    if (box.width < 8 || box.height < 8) continue;
    let sibling = el.previousElementSibling;
    while (sibling !== null) {
      const step = sibling;
      sibling = sibling.previousElementSibling;
      if (step instanceof SVGElement || !visible(step)) continue;
      const behind = parse(getComputedStyle(step).backgroundColor);
      if (behind === null || behind.a < 0.5) continue;
      const sBox = step.getBoundingClientRect();
      const sameWidth = Math.abs(sBox.width - box.width) <= Math.max(2, box.width * 0.15);
      const sameHeight = Math.abs(sBox.height - box.height) <= Math.max(2, box.height * 0.25);
      const alignedX = Math.abs(sBox.left - box.left) <= 2;
      const offsetY = sBox.top - box.top;
      if (!sameWidth || !sameHeight || !alignedX) continue;
      if (offsetY < 2 || offsetY > box.height * 0.5) continue;
      if (hueGap(front, behind) > 25) continue;
      if (hsl(behind).l >= hsl(front).l - 0.08) continue;
      add(
        "3-fake-extrusion",
        `${label(el)} over ${label(step)}`,
        `${hex(front)} over ${hex(behind)}, offset +${offsetY.toFixed(0)}px on Y only`,
        "a solid darker block of the same hue behind a control. A box-shadow check passes it; it is a shadow",
      );
    }
    for (const pseudo of ["::before", "::after"]) {
      const style = getComputedStyle(el, pseudo);
      if (style.content === "none" || style.content === "") continue;
      const back = parse(style.backgroundColor);
      if (back === null || back.a < 0.5) continue;
      if (hueGap(front, back) > 25) continue;
      if (hsl(back).l >= hsl(front).l - 0.08) continue;
      const top = style.top;
      const left = style.left;
      const right = style.right;
      const shifted = top !== "auto" && top !== "0px" && parseFloat(top) > 0;
      const flush = (left === "0px" || left === "auto") && (right === "0px" || right === "auto");
      if (shifted && flush) {
        add(
          "3-fake-extrusion",
          `${label(el)}${pseudo}`,
          `${hex(back)} under ${hex(front)}, top ${top}`,
          "a pseudo-element of the same hue at lower lightness, offset down and flush horizontally",
        );
      } else if (style.position === "absolute" || style.position === "fixed") {
        note(
          "3-fake-extrusion",
          `${label(el)}${pseudo}`,
          `${hex(back)} under ${hex(front)}, top ${top} left ${left} right ${right}`,
          "a darker same-hue pseudo-element whose offsets do not resolve to a pure Y shift. Its geometry is not readable from computed style alone, so it is not scored",
        );
      }
    }
  }

  /* --- 4. outlines are structural ------------------------------------- */

  /*
   * The scored half is the stated check: NO border at all on a control or a
   * card. A partly outlined element is a different thing and it is reported as
   * an observation rather than folded in, because "outlined on three of four
   * edges" is a deliberate divider in some places and a half-drawn sticker in
   * others, and the audit cannot tell which from a computed style.
   */
  for (const { el, kind } of shaped) {
    const style = getComputedStyle(el);
    const widths = ["borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth"].map((side) => parseFloat(style[side]) || 0);
    const styles = ["borderTopStyle", "borderRightStyle", "borderBottomStyle", "borderLeftStyle"].map((side) => style[side]);
    const drawn = widths.filter((w, i) => w > 0 && styles[i] !== "none" && styles[i] !== "hidden");
    if (drawn.length === 4) continue;
    if (drawn.length === 0) {
      add("4-outlines-structural", label(el), `a ${kind} with border-width 0px on all four edges`, null);
    } else {
      note("4-outlines-structural", label(el), `a ${kind} outlined on ${drawn.length} of 4 edges: ${widths.map((w) => `${w}px`).join(" ")}`, "a partial border can be a deliberate divider or a half-drawn sticker, and computed style cannot say which");
    }
  }

  /* --- 5. rounded to softness ----------------------------------------- */

  for (const { el, kind } of shaped) {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const corners =["borderTopLeftRadius", "borderTopRightRadius", "borderBottomRightRadius", "borderBottomLeftRadius"];
    let worst = { px: Infinity, raw: "" };
    for (const corner of corners) {
      const raw = style[corner];
      // A computed radius can be one length or two (a horizontal and a vertical
      // one) and can be a percentage. A percentage is resolved against the box
      // it is on, which is exactly how a 9999px or a 50% pill is authored.
      const first = raw.split(" ")[0];
      const px = first.endsWith("%") ? (parseFloat(first) / 100) * Math.min(box.width, box.height) : parseFloat(first) || 0;
      if (px < worst.px) worst = { px, raw };
    }
    if (!Number.isFinite(worst.px)) continue;
    if (worst.px >= radiusFloor - 0.01) continue;
    add("5-radius-floor", label(el), `a ${kind} at ${worst.px.toFixed(1)}px, floor ${radiusFloor}px`, `computed ${worst.raw}`);
  }

  /* --- 6. colour is a surface ----------------------------------------- */

  let chromeFillArea = 0;
  let artFillArea = 0;
  let firstScreenFillArea = 0;
  const clipped = (box) => {
    const w = Math.max(0, Math.min(box.right, window.innerWidth) - Math.max(box.left, 0));
    const h = Math.max(0, Math.min(box.bottom, window.innerHeight) - Math.max(box.top, 0));
    return w * h;
  };
  for (const el of all) {
    if (!visible(el)) continue;
    const colour = parse(getComputedStyle(el).backgroundColor);
    if (colour === null || colour.a < 0.5 || !isSaturated(colour)) continue;
    const box = el.getBoundingClientRect();
    chromeFillArea += box.width * box.height;
    firstScreenFillArea += clipped(box);
  }
  for (const el of document.body.querySelectorAll("svg *")) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    if (style.fill === "none") continue;
    const colour = parse(style.fill);
    if (colour === null || colour.a < 0.5 || !isSaturated(colour)) continue;
    const box = el.getBoundingClientRect();
    artFillArea += box.width * box.height;
    firstScreenFillArea += clipped(box);
  }
  let borderOnlyPalette = 0;
  for (const el of all) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    for (const side of ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"]) {
      const colour = parse(style[side]);
      if (colour !== null && colour.a >= 0.5 && isSaturated(colour)) {
        borderOnlyPalette += 1;
        break;
      }
    }
  }
  const surface = {
    chromeFillFraction: chromeFillArea / pageArea,
    artFillFraction: artFillArea / pageArea,
    totalFillFraction: (chromeFillArea + artFillArea) / pageArea,
    firstScreenFraction: firstScreenFillArea / viewportArea,
    saturatedBorderElements: borderOnlyPalette,
    pageArea,
  };

  /* --- 7. body recedes ------------------------------------------------ */

  for (const el of all) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (own.length === 0) continue;
    const style = getComputedStyle(el);
    const size = parseFloat(style.fontSize);
    if (size > 18) continue;
    const colour = parse(style.color);
    if (colour === null || colour.a < 0.5 || !isSaturated(colour)) continue;
    // A control's own label and a link are allowed their colour. The reference
    // states this directly: Spark Blue is "interactive links and outlined
    // secondary CTAs only", and the rule under audit is about BODY COPY, which
    // has to recede so the coloured headings own the page.
    if (el.closest(CONTROL_ROLES) !== null || el.closest("a[href]") !== null) continue;
    add("7-body-recedes", label(el), `${hex(colour)} at ${size}px`, `text: "${own.map((n) => n.textContent).join(" ").trim().replace(/\s+/g, " ").slice(0, 50)}"`);
  }

  /* --- 8. display face floor ------------------------------------------ */

  const faceSizes = {};
  for (const el of all) {
    if (!visible(el)) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (own.length === 0) continue;
    const style = getComputedStyle(el);
    const family = style.fontFamily.toLowerCase();
    for (const face of displayFaces) {
      if (!family.includes(face.needle)) continue;
      const size = Math.round(parseFloat(style.fontSize) * 10) / 10;
      faceSizes[face.name] = faceSizes[face.name] ?? {};
      faceSizes[face.name][size] = (faceSizes[face.name][size] ?? 0) + 1;
      if (face.floorPx !== null && parseFloat(style.fontSize) < face.floorPx) {
        add("8-display-floor", label(el), `${size}px, floor ${face.floorPx}px`, `${face.name}, ${face.note}`);
      }
    }
  }

  /* --- 9. character palette stays out of chrome ------------------------ */

  const tokenValues = new Map();
  for (const name of [
    "--background", "--foreground", "--card", "--card-foreground", "--primary", "--primary-bright",
    "--primary-ink", "--primary-foreground", "--secondary", "--muted", "--muted-foreground",
    "--destructive", "--border", "--input", "--ring", "--accent-from", "--accent-to", "--good",
    "--good-ink", "--good-soft", "--alt-route", "--not-requested", "--diamond", "--diamond-ink",
    "--warn", "--warn-ink", "--warn-ink-strong", "--streak", "--streak-core", "--streak-ink",
    "--streak-on", "--streak-band", "--charge-chip", "--charge-ink", "--charge-ring",
  ]) {
    const resolved = resolveToken(`var(${name})`);
    if (resolved !== null) tokenValues.set(hex(resolved), name);
  }
  /**
   * Component-scoped colour properties, so a finding can name where the value
   * came from instead of implying chrome reached into the mascot's paintbox.
   *
   * `--node-edge` is #5b21b6 and so is the cape's fold. Reporting that as "a
   * mascot-only value on a card" would be true and useless: what a builder
   * needs to read is that the pathway node's own token and the mascot's own
   * palette hold the same hex, which is what rule 8 of the language forbids
   * whichever of the two got there first. These are read raw off the element,
   * with no probe appended, because appending one would perturb a layout the
   * geometry rules above have already measured.
   */
  const COMPONENT_PROPS = [
    "--node-face", "--node-edge", "--node-ink", "--node-shine",
    "--card-accent", "--card-band", "--card-band-ink",
    "--strip-bg", "--strip-ink", "--strip-rule",
  ];
  const hexLiteral = (raw) => {
    const value = (raw ?? "").trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/.test(value)) return value;
    if (/^#[0-9a-f]{3}$/.test(value)) return `#${value.slice(1).split("").map((c) => c + c).join("")}`;
    return null;
  };

  const mascotByHex = new Map(mascotPalette.map((entry) => [entry.hex.toLowerCase(), entry.role]));
  // The four border sides collapse to one property. A 2px purple outline is one
  // decision and one fix; reporting it four times is the exact noise the
  // grouping rule exists to stop.
  const PAINT_PROPERTIES = [
    { name: "background", sides: ["backgroundColor"] },
    { name: "text colour", sides: ["color"] },
    { name: "border colour", sides: ["borderTopColor", "borderRightColor", "borderBottomColor", "borderLeftColor"] },
  ];
  for (const { el, kind } of chrome) {
    // A chrome element that IS the mascot is the mascot, not chrome borrowing
    // from it. The mark and the berry are excluded by identity, never by colour.
    if (el.closest(".berry-origin") !== null || el.querySelector('svg[aria-label="Blueberry"]') !== null) continue;
    const style = getComputedStyle(el);
    for (const property of PAINT_PROPERTIES) {
      const seen = new Set();
      for (const side of property.sides) {
        const colour = parse(style[side]);
        if (colour === null || colour.a < 0.5) continue;
        const key = hex(colour);
        const role = mascotByHex.get(key);
        if (role === undefined || seen.has(key)) continue;
        seen.add(key);
        const token = tokenValues.get(key);
        const local = COMPONENT_PROPS.find((name) => hexLiteral(style.getPropertyValue(name)) === key);
        const source =
          token !== undefined
            ? `it is also the theme token ${token}`
            : local !== undefined
              ? `it is also this element's ${local}`
              : "it matches no theme token this audit resolves, so a third source is painting it";
        add("9-palette-containment", label(el), `${key} as ${property.name} on a ${kind}`, `the mascot's ${role}. ${source}, so the two palettes are not disjoint`);
      }
    }
  }

  /* --- 10. reachability ------------------------------------------------ */

  const navs = [...document.querySelectorAll("nav, [role=navigation]")].filter(visible);
  let bottomNav = null;
  for (const nav of navs) {
    const box = nav.getBoundingClientRect();
    const position = getComputedStyle(nav).position;
    const atBottom = Math.abs(box.bottom - window.innerHeight) <= 4 && box.width >= window.innerWidth * 0.9;
    if (atBottom && (position === "fixed" || position === "sticky" || position === "absolute")) bottomNav = nav;
  }
  const countItems = (nav) => [...nav.querySelectorAll("a[href], button, [role=tab], [role=button]")].filter(visible).length;
  if (bottomNav !== null) {
    const items = countItems(bottomNav);
    if (items > 5) add("10-reachability", label(bottomNav), `${items} bottom nav items, ceiling 5`, "a bottom bar past five items stops being thumb-reachable and starts being a menu");
    note("10-reachability", label(bottomNav), `${items} bottom nav items`, "the bar is at the bottom at this viewport");
  } else {
    for (const nav of navs) note("10-reachability", label(nav), `${countItems(nav)} items`, "not a bottom bar at this viewport, so the five-item ceiling does not apply here");
  }

  const mascots = [...document.querySelectorAll('.berry-origin, svg[aria-label="Blueberry"]')].filter(
    (el) => visible(el) && (el.parentElement === null || el.parentElement.closest(".berry-origin") === null),
  );
  const describe = (el) => {
    const box = el.getBoundingClientRect();
    return `${el.matches("svg") ? "flat mark" : "berry"} ${Math.round(box.width)}px`;
  };
  if (mascots.length > 1) {
    add(
      "10-reachability",
      mascots.map(label).slice(0, 4).join(" + "),
      `${mascots.length} mascot instances on one screen`,
      `${mascots.map(describe).join(", ")}. More than one instance at different sizes reads as clip-art rather than as a character`,
    );
  }
  note("10-reachability", "mascot", `${mascots.length} instance(s)`, "counted as top-level berry roots, ghosts and costumes inside one root excluded");

  return { findings, observations, surface, faceSizes, chrome: chrome.length, elements: all.length };
}

/* ------------------------------------------------------------------- run */

const CONFIG = {
  radiusFloor: RADIUS_FLOOR_PX,
  saturationMin: SATURATION_MIN,
  lightnessMin: LIGHTNESS_MIN,
  lightnessMax: LIGHTNESS_MAX,
  mascotPalette: MASCOT_PALETTE,
  displayFaces: DISPLAY_FACES,
  stackingAllow: STACKING_ALLOW_SELECTOR,
};

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: "new" });
const findings = [];
const observations = [];
const routeMetrics = [];
const retries = [];
let elementsSeen = 0;

async function collect(page, routeName, theme, viewportName) {
  const result = await page.evaluate(stickerAuditInPage, CONFIG);
  const where = { theme, viewport: viewportName, route: routeName };
  for (const finding of result.findings) findings.push({ ...where, ...finding });
  for (const observation of result.observations) observations.push({ ...where, ...observation });
  routeMetrics.push({ ...where, ...result.surface, faceSizes: result.faceSizes, chrome: result.chrome });
  elementsSeen += result.elements;
}

try {
  for (const viewportName of Object.keys(VIEWPORTS)) {
    const viewport = VIEWPORTS[viewportName];
    for (const theme of ["light", "dark"]) {
      for (const route of ROUTES) {
        if (route.hash !== undefined) {
          const page = await browser.newPage();
          await page.setViewport(viewport);
          await page.evaluateOnNewDocument((wanted) => {
            localStorage.setItem("theme", wanted);
            document.documentElement.classList.toggle("dark", wanted === "dark");
          }, theme);
          await page.goto(`${origin}/?targets=1${route.hash}`, { waitUntil: "networkidle0" });
          await sleep(500);
          await collect(page, route.name, theme, viewportName);
          await page.close();
          continue;
        }
        // A seeded route in its own browser context. The seed clears
        // localStorage and writes a journal, and the hash routes share one
        // context and one origin with it, so without the isolation a played
        // lesson would follow them into the next theme's tabs.
        //
        // ONE RETRY, AND IT IS LOGGED. `driveHudStreak` reported not-reached
        // once at 1280 dark and then passed four times on the same build, so
        // there is a race in that drive between the press and the header's
        // settled geometry. Re-running a check is not the same act as
        // loosening one: the assertion is untouched, a second failure still
        // aborts the run, and every retry is printed and written to the JSON so
        // a flake cannot hide behind a green line. Fixing the race belongs in
        // economy-moments.mjs, which this script only reads.
        let attempt = 0;
        for (;;) {
          attempt += 1;
          const context = await browser.createBrowserContext();
          let reached = false;
          try {
            const page = await context.newPage();
            await page.setViewport(viewport);
            await installSeed(page, theme, route.seed, route.stored);
            await page.goto(`${origin}/${route.momentHash ?? LESSON_HASH}`, { waitUntil: "networkidle0" });
            const result = await route.drive(page, {});
            reached = result.reached;
            if (!reached && attempt >= 2) {
              throw new Error(`${route.name} (${theme}, ${viewportName}): the drive did not reach the moment on either attempt, so whatever is on screen is not the surface under audit.`);
            }
            if (reached) {
              await sleep(500);
              await collect(page, route.name, theme, viewportName);
            }
          } finally {
            await context.close();
          }
          if (reached) break;
          retries.push({ route: route.name, theme, viewport: viewportName });
          console.log(`  retrying ${route.name} (${theme}, ${viewportName}): the drive reported not reached on attempt ${attempt}`);
        }
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}

/* --------------------------------------------------------------- report */

/**
 * One row per (theme, viewport, route, rule, measured value).
 *
 * The same 0px border repeated across forty buttons on one route is one defect
 * and not forty, and a report that says forty buries the other nine rules. The
 * value is part of the key because two different radii on one route are two
 * different things to fix.
 */
function group(list) {
  const groups = new Map();
  for (const entry of list) {
    const key = `${entry.theme}|${entry.viewport}|${entry.route}|${entry.rule}|${entry.value}`;
    const existing = groups.get(key);
    if (existing === undefined) groups.set(key, { ...entry, count: 1, where: [entry.element] });
    else {
      existing.count += 1;
      if (existing.where.length < 4) existing.where.push(entry.element);
    }
  }
  return [...groups.values()];
}

const rows = group(findings);
const notes = group(observations);

// Rule 6 is an aggregate: it is decided from the route metrics, not per element.
const surfaceRows = [];
for (const metric of routeMetrics) {
  if (metric.totalFillFraction >= SURFACE_MIN_FRACTION) continue;
  surfaceRows.push({
    theme: metric.theme,
    viewport: metric.viewport,
    route: metric.route,
    rule: "6-colour-as-surface",
    element: "the route",
    value: `${(metric.totalFillFraction * 100).toFixed(2)} percent saturated fill, floor ${(SURFACE_MIN_FRACTION * 100).toFixed(0)} percent`,
    detail: `chrome fills ${(metric.chromeFillFraction * 100).toFixed(2)} percent, art fills ${(metric.artFillFraction * 100).toFixed(2)} percent, first screen ${(metric.firstScreenFraction * 100).toFixed(2)} percent, ${metric.saturatedBorderElements} element(s) carry a saturated border`,
    count: 1,
    where: ["the route"],
  });
}
const allRows = [...rows, ...surfaceRows];

const RULE_ORDER = [
  "1-paper-canvas",
  "2-no-gradients",
  "3-no-shadows",
  "3-fake-extrusion",
  "4-outlines-structural",
  "5-radius-floor",
  "6-colour-as-surface",
  "7-body-recedes",
  "8-display-floor",
  "9-palette-containment",
  "10-reachability",
];
const RULE_TITLE = {
  "1-paper-canvas": "Paper canvas: the body paints the intended ground token",
  "2-no-gradients": "No gradients on chrome",
  "3-no-shadows": "No shadows on chrome, outside the declared stacking allow-list",
  "3-fake-extrusion": "No fake extrusions: a solid darker block offset on Y is a shadow",
  "4-outlines-structural": "Outlines are structural: every control and card carries a visible border",
  "5-radius-floor": `Rounded to softness: nothing below ${RADIUS_FLOOR_PX}px on a control or card`,
  "6-colour-as-surface": "Colour is a surface, not only borders and text",
  "7-body-recedes": "Body recedes: no saturated hue on body-sized text",
  "8-display-floor": "Display face has a floor",
  "9-palette-containment": "Character palette stays out of chrome",
  "10-reachability": "Reachability: at most five bottom nav items, one mascot per screen",
};

const byRule = new Map(RULE_ORDER.map((rule) => [rule, []]));
for (const row of allRows) byRule.get(row.rule)?.push(row);
for (const list of byRule.values()) {
  list.sort((a, b) => `${a.viewport}${a.theme}${a.route}`.localeCompare(`${b.viewport}${b.theme}${b.route}`));
}

const violations = allRows.length;

await writeFile(
  path.resolve(process.cwd(), "measurements", "sticker-audit.json"),
  `${JSON.stringify(
    {
      generated: new Date().toISOString(),
      config: {
        radiusFloorPx: RADIUS_FLOOR_PX,
        saturationMin: SATURATION_MIN,
        surfaceMinFraction: SURFACE_MIN_FRACTION,
        stackingAllowSelector: STACKING_ALLOW_SELECTOR,
        displayFaces: DISPLAY_FACES,
        viewports: VIEWPORTS,
      },
      routes: ROUTES.map((route) => route.name),
      elementsInspected: elementsSeen,
      driveRetries: retries,
      violations,
      byRule: Object.fromEntries(RULE_ORDER.map((rule) => [rule, byRule.get(rule)])),
      unresolved: notes,
      routeMetrics,
    },
    null,
    2,
  )}\n`,
);

console.log(
  `sticker audit: ${ROUTES.length} routes x 2 themes x ${Object.keys(VIEWPORTS).length} viewports, ${elementsSeen} elements inspected, ${allRows.length} grouped findings`,
);
console.log("");
for (const rule of RULE_ORDER) {
  const list = byRule.get(rule);
  console.log(`${rule}  ${RULE_TITLE[rule]}  ->  ${list.length === 0 ? "clean" : `${list.length} finding(s)`}`);
  for (const row of list) {
    console.log(`  ${row.viewport.padEnd(7)} ${row.theme.padEnd(5)} ${row.route.padEnd(18)} ${row.value}${row.count > 1 ? `  x${row.count}` : ""}`);
    console.log(`      ${row.where.join(" | ")}${row.count > row.where.length ? ` (+${row.count - row.where.length} more)` : ""}`);
    if (row.detail !== null) console.log(`      ${row.detail}`);
  }
  console.log("");
}

/**
 * The unresolved bucket, and why it exists.
 *
 * Same rule the contrast audit follows for a mark sitting on another mark: what
 * the script cannot resolve it refuses to score, and lists for a person. Rule 8
 * is the large one here and it is unresolved by absence rather than by
 * ambiguity: no floor is recorded for either face, so the distribution is the
 * honest answer and a number invented from Duolingo's 48px would not be.
 */
console.log("UNRESOLVED, scored neither way:");
const faceTally = {};
for (const metric of routeMetrics) {
  for (const [face, sizes] of Object.entries(metric.faceSizes)) {
    faceTally[face] = faceTally[face] ?? {};
    for (const [size, count] of Object.entries(sizes)) faceTally[face][size] = (faceTally[face][size] ?? 0) + count;
  }
}
for (const face of DISPLAY_FACES) {
  const sizes = faceTally[face.name];
  console.log(`  rule 8, ${face.name} (${face.note}): no floor is recorded in docs/DESIGN-TOKENS.md, so nothing is scored.`);
  if (sizes === undefined) {
    console.log("      observed on no visible text in this walk.");
    continue;
  }
  const ordered = Object.entries(sizes).sort((a, b) => Number(a[0]) - Number(b[0]));
  console.log(`      observed sizes: ${ordered.map(([size, count]) => `${size}px x${count}`).join(", ")}`);
}
const otherNotes = notes.filter((note) => note.rule !== "10-reachability" || !note.value.includes("instance"));
for (const note of otherNotes.filter((n) => n.rule === "1-paper-canvas" || n.rule === "3-fake-extrusion")) {
  console.log(`  ${note.rule}  ${note.viewport.padEnd(7)} ${note.theme.padEnd(5)} ${note.route.padEnd(18)} ${note.value}${note.count > 1 ? `  x${note.count}` : ""}`);
  console.log(`      ${note.detail}`);
}
console.log("");

console.log("Rule 6 per route, the measured saturated-fill fraction of the painted page:");
for (const metric of [...routeMetrics].sort((a, b) => a.totalFillFraction - b.totalFillFraction).slice(0, 10)) {
  console.log(
    `  ${(metric.totalFillFraction * 100).toFixed(2).padStart(6)} percent  ${metric.viewport.padEnd(7)} ${metric.theme.padEnd(5)} ${metric.route.padEnd(18)} chrome ${(metric.chromeFillFraction * 100).toFixed(2)} / art ${(metric.artFillFraction * 100).toFixed(2)}`,
  );
}
console.log("");

if (retries.length > 0) {
  console.log(`DRIVE RETRIES, ${retries.length}. A drive reported not reached and was re-run once with the same assertion:`);
  for (const retry of retries) console.log(`  ${retry.viewport} ${retry.theme} ${retry.route}`);
  console.log("");
}

console.log(`wrote measurements/sticker-audit.json`);
console.log(`VIOLATIONS: ${violations}`);
if (violations > 0) process.exit(1);
