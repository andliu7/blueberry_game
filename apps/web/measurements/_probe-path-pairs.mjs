/**
 * THE PATHWAY TRACK'S OWN CONTRAST, measured where it is actually composed.
 *
 * WHY THIS EXISTS, and it is a finding rather than a preference. The shared
 * contrast audit walks `?targets=1#/pathway` with NO SEED, and an unseeded
 * visit to that hash does not put the track on screen: measurements/
 * contrast-audit.json for that route contains 108 pairs and every one of them
 * is header, tool rail or tab chrome. There is not a single .path-node,
 * .path-label, .path-terrace or trail stroke in it. So "FAILING: 0" on the
 * pathway route has never been evidence about the pathway TRACK, before this
 * round or after it, and a round that repainted the chips, the cards, the
 * trail and the gate needed a number rather than that reassurance.
 *
 * This is not a replacement gate and it changes nothing in the audit. It
 * stands on the seeded track, reads the COMPUTED colours off the real
 * elements, resolves each one's real backdrop, and reports the ratio and the
 * floor that applies. Floors are WCAG 2.1, the audit's own: 4.5 body text,
 * 3.0 large text and graphics.
 *
 * DECORATIVE MARKS ARE REPORTED, NOT FAILED, and they are labelled as such:
 * the terrace plates and the watermark wash carry no state, are not controls
 * and are not required to understand the page, which is the 1.4.11 scope
 * question pathway.css answers in the --path-prop token comment. Reporting
 * them with their number is what lets a reader check the exemption instead of
 * taking it on trust.
 *
 * WALL CLOCKS: none. Every number is a computed style.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { S2_SEED, S2_STORED, installSeed } from "./economy-moments.mjs";

const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if (!existsSync(f) || p === "/") f = path.join(DIST, "index.html");
  try {
    const b = await readFile(f);
    res.writeHead(200, { "content-type": MIME[path.extname(f)] ?? "application/octet-stream" });
    res.end(b);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });

const out = {};
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await installSeed(page, `http://localhost:${port}/`, S2_SEED, S2_STORED);
  await page.evaluateOnNewDocument((wanted) => {
    try {
      localStorage.setItem("theme", wanted);
    } catch {
      /* a private context can refuse storage; the class below is what matters */
    }
    document.addEventListener("DOMContentLoaded", () => document.documentElement.classList.toggle("dark", wanted === "dark"));
  }, theme);
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1800));

  out[theme] = await page.evaluate(() => {
    const parse = (value) => {
      const text = String(value).trim();
      // Hex, because the terrace ramp and the resolved page ground are read
      // straight off custom properties and arrive as #rrggbb.
      const h = text.match(/^#([0-9a-f]{6})$/i);
      if (h !== null) return [0, 2, 4].map((i) => parseInt(h[1].slice(i, i + 2), 16)).concat([1]);
      const m = text.match(/-?[\d.]+/g);
      if (m === null) return null;
      const [r, g, b] = m.map(Number);
      const a = m.length > 3 ? Number(m[3]) : 1;
      return [r, g, b, a];
    };
    const over = (fg, bg) => [0, 1, 2].map((i) => fg[i] * fg[3] + bg[i] * (1 - fg[3])).concat([1]);
    const lum = ([r, g, b]) => {
      const lin = (v) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
    };
    const ratio = (a, b) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };
    const hex = (c) => `#${c.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;

    /** The first opaque background behind an element, composited on the way. */
    const backdrop = (el) => {
      let stack = [];
      let node = el.parentElement;
      while (node !== null) {
        const c = parse(getComputedStyle(node).backgroundColor);
        if (c !== null && c[3] > 0) {
          if (c[3] >= 0.999) {
            let result = c;
            for (let i = stack.length - 1; i >= 0; i -= 1) result = over(stack[i], result);
            return result;
          }
          stack.push(c);
        }
        node = node.parentElement;
      }
      return [255, 255, 255, 1];
    };

    const rows = [];
    const componentRows = [];
    /*
     * One half of a shape, listed for the record. `collapsed` marks the rows
     * whose verdict is not theirs alone: a fill and the stroke on the same
     * shape are ONE component under WCAG 1.4.11, which asks whether the
     * component is identifiable against its backdrop, so those rows are
     * reported and then judged together by `component` below. That is the
     * shared contrast audit's own rule, restated here rather than invented.
     */
    const add = (name, fgRaw, bgRaw, floor, decorative = false, collapsed = false) => {
      const fg = parse(fgRaw);
      const bg = parse(bgRaw);
      if (fg === null || bg === null) return;
      const composed = fg[3] < 1 ? over(fg, bg) : fg;
      rows.push({
        pair: name,
        fg: hex(composed),
        bg: hex(bg),
        ratio: +ratio(composed, bg).toFixed(2),
        floor,
        pass: ratio(composed, bg) >= floor - 0.005,
        decorative,
        collapsed,
      });
    };

    /** A shape judged as one thing: the better of its fill and its boundary. */
    const component = (name, parts, bgRaw, floor) => {
      const bg = parse(bgRaw);
      if (bg === null) return;
      let best = null;
      for (const [half, raw] of parts) {
        const fg = parse(raw);
        if (fg === null || fg[3] === 0) continue;
        const composed = fg[3] < 1 ? over(fg, bg) : fg;
        const r = ratio(composed, bg);
        if (best === null || r > best.ratio) best = { half, fg: hex(composed), ratio: r };
      }
      if (best === null) return;
      componentRows.push({
        pair: name,
        carriedBy: best.half,
        fg: best.fg,
        bg: hex(bg),
        ratio: +best.ratio.toFixed(2),
        floor,
        pass: best.ratio >= floor - 0.005,
      });
    };

    const addHalf = (name, fgRaw, bgRaw, floor) => add(name, fgRaw, bgRaw, floor, false, true);
    const page = backdrop(document.querySelector(".path-stage") ?? document.body);
    const pick = (sel) => document.querySelector(sel);
    const cs = (sel) => {
      const el = pick(sel);
      return el === null ? null : getComputedStyle(el);
    };

    // THE CHIP. Face, its cut edge on the page, and the engraved motif.
    const face = cs(".path-node--open .path-node__face") ?? cs(".path-node--current .path-node__face");
    const chip = cs(".path-node--open") ?? cs(".path-node--current");
    if (face !== null && chip !== null) {
      addHalf("chip face on page", face.backgroundColor, hex(page), 3);
      addHalf("chip cut edge on page", chip.borderTopColor, hex(page), 3);
      const cut = cs(".path-node--open .path-node__motif-cut") ?? cs(".path-node--current .path-node__motif-cut");
      if (cut !== null) add("motif engrave on chip face", cut.stroke, face.backgroundColor, 3);
    }
    const locked = cs(".path-node--locked .path-node__face");
    const lockedChip = cs(".path-node--locked");
    if (locked !== null && lockedChip !== null) {
      addHalf("locked face on page", locked.backgroundColor, hex(page), 3);
      addHalf("locked cut edge on page", lockedChip.borderTopColor, hex(page), 3);
      const cut = cs(".path-node--locked .path-node__motif-cut");
      if (cut !== null) add("locked motif on locked face", cut.stroke, locked.backgroundColor, 3);
    }
    const done = cs(".path-node--done .path-node__face");
    if (done !== null) {
      addHalf("done face on page", done.backgroundColor, hex(page), 3);
      const g = cs(".path-node--done .path-node__face svg path");
      if (g !== null) add("done check on green face", getComputedStyle(pick(".path-node--done")).color, done.backgroundColor, 3);
    }

    // THE NAME CARD. Its own surface on the page, and the ink on it.
    const card = cs(".path-label");
    if (card !== null) {
      add("label card on page", card.backgroundColor, hex(page), 3);
      add("label ink on card", card.color, card.backgroundColor, 4.5);
      const icon = cs(".path-label__icon");
      if (icon !== null) {
        const c = parse(icon.stroke);
        const o = Number(icon.opacity);
        if (c !== null) add("label icon on card", `rgba(${c[0]},${c[1]},${c[2]},${(c[3] * o).toFixed(3)})`, card.backgroundColor, 3);
      }
    }

    // THE TRAIL, both states, against the page it is drawn on.
    for (const [name, sel] of [
      ["trail ahead rim", ".path-trail__edge:not(.path-trail__edge--done)"],
      ["trail ahead fill", ".path-trail__fill:not(.path-trail__fill--done)"],
      ["trail walked rim", ".path-trail__edge--done"],
      ["trail walked fill", ".path-trail__fill--done"],
      ["loop rim", ".path-trail__loop-edge"],
      ["loop fill", ".path-trail__loop"],
    ]) {
      const s = cs(sel);
      if (s !== null) add(name + " on page", s.stroke, hex(page), 3, false, true);
    }

    // THE GATE.
    for (const [name, sel, prop] of [
      ["gate outer band", ".path-gatenode__arch-face", "fill"],
      ["gate outer keyline", ".path-gatenode__arch-face", "stroke"],
      ["gate inner band", ".path-gatenode__arch-inner", "fill"],
      ["gate dagger", ".path-gatenode__mark", "stroke"],
    ]) {
      const s = cs(sel);
      if (s !== null) add(name + " on page", s[prop], hex(page), 3, false, name !== "gate dagger");
    }

    // THE LANDSCAPE, reported as decoration with its number rather than
    // claimed compliant. Each is measured on the plate it actually sits on.
    const plate = (i) => getComputedStyle(document.documentElement).getPropertyValue(`--path-terrace-${i}`).trim();
    const mark = cs(".path-mark");
    if (mark !== null) add("watermark on mid plate", mark.stroke, plate(2), 3, true);
    const prop = cs(".path-prop");
    if (prop !== null) add("flask on mid plate", prop.stroke, plate(2), 3, true);
    const boulder = cs(".path-boulder:not(.path-boulder--far)");
    if (boulder !== null) add("boulder on deep plate", boulder.fill, plate(3), 3, true);
    const cloud = cs(".path-cloud");
    if (cloud !== null) {
      add("cloud fill on mid plate", cloud.fill, plate(2), 3, true);
      add("cloud outline on mid plate", cloud.stroke, plate(2), 3, true);
    }
    const ridge = cs(".path-ridge");
    if (ridge !== null) add("far ridge on lightest plate", ridge.fill, plate(0), 3, true);

    // The same shapes again, collapsed. THIS is the list a floor applies to.
    const pageHex = hex(page);
    if (face !== null && chip !== null) {
      component("rest chip", [["face fill", face.backgroundColor], ["cut edge", chip.borderTopColor]], pageHex, 3);
    }
    if (locked !== null && lockedChip !== null) {
      component("locked chip", [["face fill", locked.backgroundColor], ["cut edge", lockedChip.borderTopColor]], pageHex, 3);
    }
    const doneChip = cs(".path-node--done");
    if (done !== null && doneChip !== null) {
      component("done chip", [["face fill", done.backgroundColor], ["cut edge", doneChip.borderTopColor]], pageHex, 3);
    }
    for (const [name, edgeSel, fillSel] of [
      ["trail ahead", ".path-trail__edge:not(.path-trail__edge--done)", ".path-trail__fill:not(.path-trail__fill--done)"],
      ["trail walked", ".path-trail__edge--done", ".path-trail__fill--done"],
      ["loop detour", ".path-trail__loop-edge", ".path-trail__loop"],
    ]) {
      const e = cs(edgeSel);
      const f = cs(fillSel);
      if (e !== null && f !== null) component(name, [["rim", e.stroke], ["fill", f.stroke]], pageHex, 3);
    }
    const outer = cs(".path-gatenode__arch-face");
    const inner = cs(".path-gatenode__arch-inner");
    if (outer !== null) component("gate outer band", [["fill", outer.fill], ["keyline", outer.stroke]], pageHex, 3);
    if (inner !== null) component("gate inner band", [["fill", inner.fill], ["keyline", inner.stroke]], pageHex, 3);
    /*
     * THE NAME CARD IS THE ONE SHAPE WITH NO STROKE, by the pixel verdict's
     * own instruction ("warm cream, fully rounded, NO BORDER STROKE, soft
     * shadow"). Its boundary is therefore the cast shadow, so that is what is
     * measured: the shadow colour composited over the page, against the
     * card. A shadow is a real painted boundary; the point of measuring it
     * rather than waving at it is that a reader can see whether it is one.
     */
    const cardCs = cs(".path-label");
    if (cardCs !== null) {
      const shadow = cardCs.boxShadow.match(/rgba?\([^)]*\)/g);
      if (shadow !== null && shadow.length > 0) {
        const darkest = shadow
          .map((c) => parse(c))
          .filter((c) => c !== null)
          .sort((a, b) => b[3] - a[3])[0];
        if (darkest !== undefined) {
          const composed = `rgba(${darkest[0]},${darkest[1]},${darkest[2]},${darkest[3]})`;
          add("label card shadow against the page", composed, pageHex, 3);
          add("label card shadow against the card", composed, cardCs.backgroundColor, 3);
        }
      }
    }

    return { page: pageHex, rows, componentRows };
  });
  await page.close();
}

await browser.close();
server.close();

let failing = 0;
for (const [theme, result] of Object.entries(out)) {
  console.log("\n" + theme.toUpperCase() + "  page " + result.page);
  console.log("  COMPONENTS, fill and boundary collapsed to the better of the two (WCAG 1.4.11 asks whether the COMPONENT is identifiable):");
  for (const row of result.componentRows) {
    const tag = row.pass ? " PASS" : " FAIL";
    if (!row.pass) failing += 1;
    console.log("  " + tag + "  " + String(row.ratio).padStart(6) + ":1 (floor " + row.floor + ")  " + row.fg + " on " + row.bg + "   " + row.pair + ", carried by its " + row.carriedBy);
  }
  console.log("  INK AND MARKS, each on the surface it is actually drawn on:");
  for (const row of result.rows) {
    if (row.collapsed === true) continue;
    const tag = row.decorative ? "decor" : row.pass ? " PASS" : " FAIL";
    if (!row.decorative && !row.pass) failing += 1;
    console.log("  " + tag + "  " + String(row.ratio).padStart(6) + ":1 (floor " + row.floor + ")  " + row.fg + " on " + row.bg + "   " + row.pair);
  }
}
console.log("\nFAILING (non-decorative): " + failing);
process.exit(failing === 0 ? 0 : 1);
