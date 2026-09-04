/**
 * The pathway's own contrast pairs, measured off the built page rather than
 * asserted in a comment. WALL CLOCKS: none.
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
  try { const b = await readFile(f); res.writeHead(200, { "content-type": MIME[path.extname(f)] ?? "application/octet-stream" }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await installSeed(page, `http://localhost:${port}/`, S2_SEED, S2_STORED);
  if (theme === "dark") await page.evaluateOnNewDocument(() => localStorage.setItem("theme", "dark"));
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 900));
  const out = await page.evaluate(() => {
    const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); };
    const lum = (rgb) => 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
    const parse = (s) => (s.match(/\d+(\.\d+)?/g) ?? [0, 0, 0]).slice(0, 3).map(Number);
    const ratio = (a, b) => { const [x, y] = [lum(parse(a)) + 0.05, lum(parse(b)) + 0.05]; return Number((Math.max(x, y) / Math.min(x, y)).toFixed(2)); };
    const v = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
    const hex = (h) => { const c = document.createElement("span"); c.style.color = h; document.body.appendChild(c); const r = getComputedStyle(c).color; c.remove(); return r; };
    const page = hex(v("--background"));
    const pairs = {
      "white check on completed face": ratio("rgb(255,255,255)", hex(v("--progress-deep"))),
      "completed face on page": ratio(hex(v("--progress-deep")), page),
      "chip edge on darkest terrace": ratio(hex(v("--chip-edge")), hex(v("--path-terrace-3"))),
      "body ink on darkest terrace": ratio(hex(v("--foreground")), hex(v("--path-terrace-3"))),
      "trail rim on darkest terrace": ratio(hex(v("--path-edge")), hex(v("--path-terrace-3"))),
      // In DARK the ground is the dark surface, so the identifying member of
      // each pair flips: the chip's FACE and the trail's FILL are what lift
      // off the night terrace, not their edges. Both pairs are reported so
      // the better of the two is visible per theme rather than assumed.
      "chip FACE on darkest terrace": ratio(hex(v("--chip-face")), hex(v("--path-terrace-3"))),
      "trail FILL on darkest terrace": ratio(hex(v("--path-trail-rest")), hex(v("--path-terrace-3"))),
      "loop trail on page": ratio(hex(v("--path-trail-loop")), page),
      // The arch is a light band with a keyline; the keyline is what
      // identifies the shape, exactly as a card's border does.
      "gate arch KEYLINE on page": ratio(hex(v("--path-gate-arch-line")), page),
      "gate arch keyline on its own face": ratio(hex(v("--path-gate-arch-line")), hex(v("--path-gate-arch"))),
      "START ink on its fill": ratio(hex(v("--primary-ink")), hex(v("--path-start-fill"))),
      "START border on page": ratio(hex(v("--primary")), page),
      "hub counter ink on its pill": ratio("rgb(255,255,255)", hex(v("--chip-edge"))),
      "concept badge glyph on gold": ratio("rgb(42,42,66)", hex(v("--path-badge-gold"))),
      "application flag on violet": ratio("rgb(255,255,255)", hex(v("--primary"))),
    };
    const live = [...document.querySelectorAll(".path-node")].slice(0, 12).map((el) => {
      const face = el.querySelector(".path-node__face");
      const cs = getComputedStyle(el);
      const fs = face === null ? null : getComputedStyle(face);
      return { cls: el.className.replace(/path-node ?/, "").trim(), ink: cs.color, face: fs?.backgroundColor ?? null, wall: cs.backgroundColor, inkOnFace: fs === null ? null : ratio(cs.color, fs.backgroundColor) };
    });
    return { pairs, live };
  });
  console.log(theme, JSON.stringify(out, null, 1));
  await page.close();
}
await browser.close(); server.close();
