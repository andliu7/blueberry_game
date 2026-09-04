/**
 * The 3.0 graphics floor (WCAG 1.4.11) on the marks the node sheet and the
 * guidebook draw, in BOTH themes. Text pairs are measured by
 * _probe-sheet-contrast.mjs; this walks the non-text marks that measurement
 * cannot see: the difficulty pips, the stopwatch and double dagger, the
 * hamburger, the molecule mark's rim and the checklist ticks.
 *
 * The repository gate stays measurements/contrast-audit.mjs. This is the
 * evidence for one piece, not a replacement for it.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, openSeeded } from "./economy-moments.mjs";

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
const origin = `http://localhost:${server.address().port}`;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);

/** Runs in the page. Passed as a real function, never as a string. */
function measureMarks() {
  const rgb = (s) => {
    // Chrome serialises a color-mix() result as color(srgb 0..1 0..1 0..1).
    const m = s.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)(?: *\/ *([\d.]+))?/);
    if (m !== null) return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a: m[4] === undefined ? 1 : +m[4] };
    const n = (s.match(/[\d.]+/g) ?? []).map(Number);
    if (n.length < 3) return null;
    return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
  };
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const groundOf = (el) => {
    const stack = [];
    let n = el;
    while (n !== null && n !== document.documentElement) {
      const c = rgb(getComputedStyle(n).backgroundColor);
      if (c !== null && c.a > 0) stack.push(c);
      n = n.parentElement;
    }
    stack.push(rgb(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 });
    let out = stack[stack.length - 1];
    for (let i = stack.length - 2; i >= 0; i -= 1) out = over(stack[i], out);
    return out;
  };
  const rows = [];
  const mark = (name, el, colour) => {
    const c = rgb(colour);
    if (c === null) return;
    const g = groundOf(el.parentElement ?? el);
    const r = ratio(over(c, g), g);
    rows.push({ name, colour, ratio: Math.round(r * 100) / 100, pass: r >= 3 });
  };

  for (const p of document.querySelectorAll(".ns-pip")) {
    const cs = getComputedStyle(p);
    const filled = p.classList.contains("is-filled");
    mark(filled ? "pip filled disc" : "pip empty ring", p, filled ? cs.backgroundColor : cs.borderTopColor);
  }
  for (const [name, sel] of [["hamburger", ".ns-menu"], ["challenge marks", ".ns-marks"], ["guidebook back", ".gb-back"], ["checklist tick", ".gb-checks__mark"]]) {
    const el = document.querySelector(sel);
    if (el !== null) mark(name, el, getComputedStyle(el).color);
  }
  const svg = document.querySelector(".ns-molecule");
  if (svg !== null) {
    const first = svg.querySelector("circle");
    mark("molecule atom rim", svg, getComputedStyle(first).stroke);
    mark("molecule bond stick", svg, getComputedStyle(svg.querySelector("path")).stroke);
  }
  return rows;
}

const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
let fails = 0;
for (const theme of ["light", "dark"]) {
  const page = await openSeeded(browser, { origin, viewport: { width: 390, height: 844, deviceScaleFactor: 1 }, theme, hash: "#/pathway", journal: P3_SEED, stored: P3_STORED });
  await page.click(".path-node--current");
  await page.waitForSelector(".ns-panel", { visible: true });
  const sheet = await page.evaluate(measureMarks);
  await page.click(".ns-menu");
  await page.waitForSelector(".gb-page", { visible: true });
  const book = await page.evaluate(measureMarks);
  for (const [where, rows] of [["sheet", sheet], ["book", book]]) {
    for (const row of rows) {
      if (!row.pass) fails += 1;
      console.log(`${row.pass ? "ok  " : "FAIL"} ${theme} ${where} ${row.name} ${row.ratio}:1`);
    }
  }
  await page.close();
}
console.log("FAILING GRAPHIC MARKS:", fails);
await browser.close();
server.close();
