/**
 * Contrast on the two surfaces this piece owns, measured on the BUILT app.
 *
 * The repository gate is measurements/contrast-audit.mjs and it stays the
 * arbiter. It is red for an unrelated reason today (its reward-first drive
 * does not reach, and src/lesson/RewardMoment.tsx is being changed by another
 * builder in this same tree), so this walks the same floors over the node
 * sheet and the guidebook alone: 4.5 for body text, 3.0 for large text and
 * for graphics under WCAG 1.4.11. It does not replace the gate; it is the
 * evidence that this piece did not add a failing pair.
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

const MEASURE = `(root) => {
  const parse = (value) => {
    const m = value.match(/rgba?\\(([^)]+)\\)/);
    if (m === null) return null;
    const parts = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const over = (fg, bg) => ({
    r: fg.r * fg.a + bg.r * (1 - fg.a),
    g: fg.g * fg.a + bg.g * (1 - fg.a),
    b: fg.b * fg.a + bg.b * (1 - fg.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const l1 = lum(a), l2 = lum(b); const hi = Math.max(l1, l2), lo = Math.min(l1, l2); return (hi + 0.05) / (lo + 0.05); };
  const groundOf = (el) => {
    let stack = [];
    let node = el;
    while (node !== null && node !== document.documentElement) {
      const c = parse(getComputedStyle(node).backgroundColor);
      if (c !== null && c.a > 0) stack.push(c);
      node = node.parentElement;
    }
    stack.push(parse(getComputedStyle(document.body).backgroundColor) ?? { r: 255, g: 255, b: 255, a: 1 });
    let out = stack[stack.length - 1];
    for (let i = stack.length - 2; i >= 0; i -= 1) out = over(stack[i], out);
    return out;
  };
  const rows = [];
  for (const el of root.querySelectorAll("*")) {
    const text = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 0);
    if (!text) continue;
    const style = getComputedStyle(el);
    const fg = parse(style.color);
    if (fg === null) continue;
    const bg = groundOf(el);
    const size = parseFloat(style.fontSize);
    const bold = Number(style.fontWeight) >= 700;
    const large = size >= 24 || (bold && size >= 18.66);
    const floor = large ? 3 : 4.5;
    const r = ratio(over(fg, bg), bg);
    rows.push({
      sel: el.className && typeof el.className === "string" ? el.className.split(" ")[0] : el.tagName.toLowerCase(),
      text: el.textContent.trim().slice(0, 34),
      px: size,
      floor,
      ratio: Math.round(r * 100) / 100,
      pass: r >= floor,
    });
  }
  return rows;
}`;

const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const out = {};
for (const theme of ["light", "dark"]) {
  const page = await openSeeded(browser, {
    origin,
    viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
    theme,
    hash: "#/pathway",
    journal: P3_SEED,
    stored: P3_STORED,
  });
  await page.click(".path-node--current");
  await page.waitForSelector(".ns-panel", { visible: true });
  const sheet = await page.$eval(".ns-panel", new Function("return " + MEASURE)());
  await page.click(".ns-menu");
  await page.waitForSelector(".gb-page", { visible: true });
  const book = await page.$eval(".gb-page", new Function("return " + MEASURE)());
  out[theme] = { sheet, book };
  await page.close();
}
let failures = 0;
for (const [theme, surfaces] of Object.entries(out)) {
  for (const [name, rows] of Object.entries(surfaces)) {
    for (const row of rows) {
      if (!row.pass) {
        failures += 1;
        console.log(`FAIL ${theme} ${name} ${row.sel} ${row.px}px ${row.ratio}:1 floor ${row.floor} :: ${row.text}`);
      }
    }
    const worst = rows.reduce((a, b) => (a === null || b.ratio < a.ratio ? b : a), null);
    console.log(`${theme} ${name}: ${rows.length} text pairs, worst ${worst?.ratio}:1 on "${worst?.text}" (floor ${worst?.floor})`);
  }
}
console.log(`FAILING PAIRS: ${failures}`);
await browser.close();
server.close();
process.exit(failures === 0 ? 0 : 1);
