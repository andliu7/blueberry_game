/**
 * WCAG contrast audit of the built app, measured from the rendered page.
 *
 * WHY THIS AND NOT A TOKEN TABLE. theme.css already reasons about contrast in
 * its comments, carefully, and it was still possible to ship a formal charge
 * sign in a literal #ffffff on a near white disc: the token table was right and
 * the component did not use it. A pair only fails where it is actually
 * composed, so the audit walks what the browser drew rather than what the
 * stylesheet declared. It is the same reason the capture script drives real
 * PointerEvents instead of trusting the state machine's own account.
 *
 * WHAT IT MEASURES. Every element with visible text, and every SVG mark with a
 * fill or a stroke, on every tab, in both themes. For each one it resolves the
 * effective backdrop by climbing ancestors until something opaque, compositing
 * translucent layers on the way, and it treats a gradient backdrop as EVERY one
 * of its colour stops, reporting the worst. Floors are WCAG 2.1: 4.5 for body
 * text, 3.0 for large text (>= 24px, or >= 18.66px at weight 700+) and for
 * graphics and interface components per 1.4.11.
 *
 * WHAT IT CANNOT SEE. Text over a photograph or a video frame, which this app
 * does not have yet; a mark whose backdrop is another mark rather than a styled
 * box, because the climb reads boxes; and whether a passing ratio is legible,
 * which is a different question from whether it is compliant. Anything it
 * cannot resolve is reported as UNRESOLVED and counted, never silently skipped:
 * a contrast audit that quietly drops what it cannot handle reads as a pass.
 *
 * Usage, from apps/web:
 *   npm run build
 *   node measurements/contrast-audit.mjs [--json]
 *
 * Exits nonzero when any pair is below its floor, so it can gate a build.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const TABS = ["trainer", "pathway", "courses", "search", "leaderboards", "periodic", "chat", "messages"];
const ROUTES = [...TABS.map((tab) => ({ name: tab, hash: `#/${tab}` })), { name: "onboarding", hash: "#/start/welcome" }];
const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: 1 };

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

/**
 * The whole measurement, as one function evaluated inside the page.
 *
 * It lives here as a string-free function passed to page.evaluate rather than
 * in a module the page imports, because the built app is the artifact under
 * test and adding an import to it would change what is being measured.
 */
function auditInPage() {
  const parse = (value) => {
    const match = /rgba?\(([^)]+)\)/.exec(value ?? "");
    if (match === null) return null;
    const parts = match[1].split(/[,\s/]+/).filter((p) => p.length > 0).map(Number);
    if (parts.length < 3 || parts.some((n) => Number.isNaN(n))) return null;
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (top, bottom) => ({
    r: top.r * top.a + bottom.r * (1 - top.a),
    g: top.g * top.a + bottom.g * (1 - top.a),
    b: top.b * top.a + bottom.b * (1 - top.a),
    a: 1,
  });
  const luminance = ({ r, g, b }) => {
    const channel = (v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  };
  const ratio = (a, b) => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };

  /** Every candidate backdrop behind an element: opaque box colours and gradient stops. */
  const backdrops = (el) => {
    const stack = [];
    let node = el;
    while (node !== null && node !== document.documentElement.parentNode) {
      const style = getComputedStyle(node);
      const image = style.backgroundImage;
      if (image !== undefined && image !== "none") {
        const stops = image.match(/rgba?\([^)]+\)/g) ?? [];
        // Tailwind v4 writes its gradients as var(--tw-gradient-stops), and the
        // computed background-image keeps the var rather than resolving it, so
        // the literal scan finds nothing and the climb falls through to the
        // card BELOW the gradient. That reported the leaderboard's white trophy
        // as white on white when it is white on indigo. Read the custom
        // properties directly.
        if (stops.length === 0 && image.includes("gradient")) {
          for (const name of ["--tw-gradient-from", "--tw-gradient-via", "--tw-gradient-to"]) {
            const value = style.getPropertyValue(name).trim();
            const colour = parse(value);
            if (colour !== null && colour.a > 0.02) stops.push(value);
          }
        }
        let opaqueGradient = stops.length > 0;
        for (const stop of stops) {
          const colour = parse(stop);
          if (colour !== null && colour.a > 0.02) stack.push({ colour, from: "gradient" });
          if (colour === null || colour.a < 0.995) opaqueGradient = false;
        }
        // A gradient we still could not read is an unknown backdrop, and the
        // layer under it is the wrong answer, not a safe one.
        if (stops.length === 0 && image.includes("gradient")) return null;
        // An opaque gradient HIDES everything under it. Collecting the card
        // below as a further candidate is what reported the leaderboard's white
        // trophy as white on white: it is white on indigo, and the white card
        // three levels down is not on screen behind it at all.
        if (opaqueGradient) break;
      }
      const back = parse(style.backgroundColor);
      if (back !== null && back.a > 0.02) {
        stack.push({ colour: back, from: "background-color" });
        if (back.a >= 0.995) break;
      }
      node = node.parentElement ?? (node.parentNode instanceof ShadowRoot ? node.parentNode.host : null);
    }
    // Composite each translucent candidate over the first opaque one below it,
    // so a 16 percent wash is measured as what the eye receives, not as itself.
    const opaque = stack.find((entry) => entry.colour.a >= 0.995)?.colour ?? { r: 255, g: 255, b: 255, a: 1 };
    const resolved = stack.map((entry) => (entry.colour.a >= 0.995 ? entry.colour : over(entry.colour, opaque)));
    return resolved.length > 0 ? resolved : null;
  };

  const visible = (el) => {
    const style = getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    if (Number(style.opacity) < 0.15) return false;
    const box = el.getBoundingClientRect();
    return box.width > 1 && box.height > 1;
  };

  const label = (el) => {
    const id = el.id !== "" ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className !== "" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
    return `${el.tagName.toLowerCase()}${id}${cls}`.slice(0, 110);
  };

  let keySeed = 0;
  const keys = new WeakMap();
  /** A stable id per SVG element, so its fill and its boundary pair up later. */
  const svgKey = (el) => {
    let value = keys.get(el);
    if (value === undefined) {
      value = `svg${(keySeed += 1)}`;
      keys.set(el, value);
    }
    return value;
  };

  const findings = [];
  /**
   * Can this element's backdrop be trusted?
   *
   * The climb reads CSS boxes. An HTML element always has one. An SVG mark
   * usually sits on ANOTHER MARK, which has no background-color, so the climb
   * walks straight past the sphere a letter is drawn on and reports the page
   * behind the whole canvas instead. Measuring that pair is not a lenient
   * measurement, it is a measurement of something that is not on screen: it
   * reported the oxygen's white "O" as white on cream, and the "O" is on a red
   * sphere.
   *
   * So an SVG mark is resolvable only when nothing inside its own <svg> is
   * painted under it: no earlier sibling, and no earlier sibling of any
   * ancestor, whose box overlaps it. Everything else is reported UNRESOLVED and
   * listed for a person. Never counted as a pass, never as a failure.
   */
  const svgBackdropIsTrustworthy = (el) => {
    const root = el.ownerSVGElement;
    if (root === null) return true;
    const box = el.getBoundingClientRect();
    const overlaps = (other) => {
      const b = other.getBoundingClientRect();
      return !(b.right <= box.left || b.left >= box.right || b.bottom <= box.top || b.top >= box.bottom);
    };
    let node = el;
    while (node !== null && node !== root) {
      let sibling = node.previousElementSibling;
      while (sibling !== null) {
        if (sibling.tagName.toLowerCase() !== "defs") {
          if (visible(sibling) && overlaps(sibling)) return false;
          for (const descendant of sibling.querySelectorAll("*")) {
            if (visible(descendant) && overlaps(descendant)) return false;
          }
        }
        sibling = sibling.previousElementSibling;
      }
      node = node.parentElement;
    }
    return true;
  };

  const record = (el, kind, colour, text, floor) => {
    const options = backdrops(el);
    const worst = (options ?? []).reduce(
      (acc, back) => {
        // A translucent foreground is measured as what the eye receives, not
        // as its own declared colour: --scene-faint is an rgba, and reading it
        // raw would report a contrast the student never sees.
        const value = ratio(colour.a >= 0.995 ? colour : over(colour, back), back);
        return value < acc.value ? { value, back } : acc;
      },
      { value: Infinity, back: null },
    );
    if (!Number.isFinite(worst.value) || (el instanceof SVGElement && !svgBackdropIsTrustworthy(el))) {
      findings.push({
        kind,
        unresolved: true,
        element: label(el),
        text: (text ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
        fg: `rgb(${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)})`,
        floor,
      });
      return;
    }
    findings.push({
      kind,
      element: label(el),
      text: (text ?? "").trim().replace(/\s+/g, " ").slice(0, 60),
      fg: `rgb(${Math.round(colour.r)},${Math.round(colour.g)},${Math.round(colour.b)})`,
      bg: `rgb(${Math.round(worst.back.r)},${Math.round(worst.back.g)},${Math.round(worst.back.b)})`,
      ratio: Math.round(worst.value * 100) / 100,
      floor,
      pass: worst.value >= floor - 0.005,
      // Which paint this was, so a shape's fill and its boundary can be judged
      // together below. Text is never merged: a letter is read, not identified
      // by its outline, so its fill has to clear the floor on its own.
      paint: el instanceof SVGElement && !(text ?? "").trim() ? kind.replace("svg-", "") : null,
      key: el instanceof SVGElement ? svgKey(el) : null,
    });
  };

  // Text: every element that owns a non-empty text node of its own, so a
  // paragraph is measured once rather than once per ancestor.
  for (const el of document.querySelectorAll("body *")) {
    if (el instanceof SVGElement) continue;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim() !== "");
    if (own.length === 0 || !visible(el)) continue;
    const style = getComputedStyle(el);
    const colour = parse(style.color);
    if (colour === null || colour.a < 0.15) continue;
    const size = parseFloat(style.fontSize);
    const weight = Number(style.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    record(el, large ? "large-text" : "text", colour, own.map((n) => n.textContent).join(" "), large ? 3 : 4.5);
  }

  // SVG marks. Text glyphs carry the text floor; everything else is a graphic
  // under 1.4.11 and carries 3.0. Strokes count: a bond is an interface object.
  for (const el of document.querySelectorAll("svg *")) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const tag = el.tagName.toLowerCase();
    const isText = tag === "text" || tag === "tspan";
    // <g> and <line> never paint a fill: a group has no geometry of its own and
    // a line is a stroke. Both inherit the initial black, so measuring their
    // fill reported twelve black-on-black failures for marks that draw nothing.
    const paintsFill = tag !== "g" && tag !== "line" && tag !== "polyline" && tag !== "marker";
    const fill = parse(style.fill);
    if (paintsFill && fill !== null && fill.a >= 0.15 && style.fill !== "none") {
      const size = parseFloat(style.fontSize);
      const weight = Number(style.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && weight >= 700);
      record(el, isText ? (large ? "svg-large-text" : "svg-text") : "svg-fill", fill, isText ? el.textContent : "", isText && !large ? 4.5 : 3);
    }
    const stroke = parse(style.stroke);
    const width = parseFloat(style.strokeWidth);
    if (stroke !== null && stroke.a >= 0.15 && style.stroke !== "none" && width >= 1) {
      record(el, "svg-stroke", stroke, "", 3);
    }
  }
  /**
   * A shape is ONE component, not two.
   *
   * WCAG 1.4.11 asks whether a component is identifiable against what is
   * adjacent to it, and a boundary that clears 3:1 identifies a shape whatever
   * its fill does. The bond joint is the case that forced this: it has to stay
   * lighter than the rod it sits on, so its fill cannot also clear a near white
   * ground, and a ring in the rod's colour is what makes it findable. Reporting
   * the fill alone as a failure would demand a colour that cannot exist.
   *
   * So fill and stroke on the same shape collapse to the BETTER of the two, and
   * the report names which one carried it. Text never merges: a letter is read,
   * not identified by its outline.
   */
  const merged = [];
  const byKey = new Map();
  for (const finding of findings) {
    if (finding.paint === null || finding.key === null || finding.unresolved === true) {
      merged.push(finding);
      continue;
    }
    const existing = byKey.get(finding.key);
    if (existing === undefined) {
      byKey.set(finding.key, finding);
      merged.push(finding);
      continue;
    }
    if (finding.ratio > existing.ratio) {
      existing.ratio = finding.ratio;
      existing.fg = finding.fg;
      existing.bg = finding.bg;
      existing.pass = finding.pass;
      existing.paint = finding.paint;
    }
    existing.carriedBy = existing.paint;
  }
  return merged;
}

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: "new" });
const all = [];
try {
  for (const theme of ["light", "dark"]) {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      await page.setViewport(VIEWPORT);
      await page.evaluateOnNewDocument((wanted) => {
        localStorage.setItem("theme", wanted);
        document.documentElement.classList.toggle("dark", wanted === "dark");
      }, theme);
      await page.goto(`${origin}/?targets=1${route.hash}`, { waitUntil: "networkidle0" });
      await new Promise((resolve) => setTimeout(resolve, 500));
      const findings = await page.evaluate(auditInPage);
      for (const finding of findings) all.push({ theme, route: route.name, ...finding });
      await page.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}

// One row per distinct (theme, foreground, background, floor): the same token
// pair repeated across forty buttons is one defect, not forty, and a report
// that says forty buries the other three.
const groups = new Map();
for (const finding of all) {
  if (finding.unresolved === true) continue;
  const key = `${finding.theme}|${finding.fg}|${finding.bg}|${finding.floor}|${finding.kind}`;
  const existing = groups.get(key);
  if (existing === undefined) groups.set(key, { ...finding, count: 1, where: new Set([`${finding.route}:${finding.element}`]) });
  else {
    existing.count += 1;
    if (existing.where.size < 4) existing.where.add(`${finding.route}:${finding.element}`);
  }
}
const rows = [...groups.values()].sort((a, b) => a.ratio - b.ratio);
const unresolvedGroups = new Map();
for (const finding of all) {
  if (finding.unresolved !== true) continue;
  const key = `${finding.theme}|${finding.fg}|${finding.kind}`;
  const existing = unresolvedGroups.get(key);
  if (existing === undefined) unresolvedGroups.set(key, { ...finding, count: 1, where: new Set([`${finding.route}:${finding.element}`]) });
  else {
    existing.count += 1;
    if (existing.where.size < 3) existing.where.add(`${finding.route}:${finding.element}`);
  }
}
const failing = rows.filter((row) => !row.pass);
const unresolved = all.filter((finding) => finding.unresolved === true);

if (process.argv.includes("--json")) {
  await writeFile(
    path.resolve(process.cwd(), "measurements", "contrast-audit.json"),
    `${JSON.stringify({ measured: all.length, distinct: rows.length, failing: failing.length, unresolved: unresolved.length, rows: rows.map((r) => ({ ...r, where: [...r.where] })) }, null, 2)}\n`,
  );
}

console.log(`measured ${all.length} composed pairs, ${rows.length} distinct, ${unresolved.length} unresolved`);
console.log(`FAILING: ${failing.length}`);
for (const row of failing) {
  console.log(
    `  ${row.ratio.toFixed(2)}:1 (needs ${row.floor})  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} on ${row.bg}  x${row.count}\n      ${[...row.where].join("\n      ")}${row.text ? `\n      text: "${row.text}"` : ""}`,
  );
}
if (unresolvedGroups.size > 0) {
  console.log(`
UNRESOLVED, ${unresolved.length} marks in ${unresolvedGroups.size} groups. These sit on other SVG`);
  console.log(`marks rather than on a styled box, so the backdrop climb cannot see what is under them.`);
  console.log(`Neither passed nor failed. Judge them against a capture:`);
  for (const row of [...unresolvedGroups.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} x${row.count}  ${[...row.where].join(", ")}${row.text ? `  text: "${row.text}"` : ""}`);
  }
}

if (unresolvedGroups.size > 0) {
  console.log(`
UNRESOLVED: ${unresolved.length} marks in ${unresolvedGroups.size} groups. Each sits on another`);
  console.log(`SVG mark rather than on a styled box, so the climb cannot see what is beneath it.`);
  console.log(`Neither passed nor failed. Judge these against a capture:`);
  for (const row of [...unresolvedGroups.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} x${row.count}  ${[...row.where].join(", ")}${row.text ? `  text: "${row.text}"` : ""}`);
  }
}

const tight = rows.filter((row) => row.pass && row.ratio < row.floor * 1.15).slice(0, 12);
if (tight.length > 0) {
  console.log(`\nPASSING but within 15 percent of the floor, worth knowing before a token moves:`);
  for (const row of tight) console.log(`  ${row.ratio.toFixed(2)}:1 (floor ${row.floor})  ${row.theme.padEnd(5)} ${row.kind.padEnd(14)} ${row.fg} on ${row.bg}  x${row.count}`);
}
if (failing.length > 0) process.exit(1);
