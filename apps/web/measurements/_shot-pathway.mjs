/**
 * Screenshots of the pathway at the reference widths, for the builder's own
 * eye before a critic's. Writes into measurements/_shots/ (gitignored path
 * is the caller's business; these are working images, not artifacts).
 *
 * WALL CLOCKS: none.
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_STORED, installSeed, pathwaySeed } from "./economy-moments.mjs";

const DIST = path.join(process.cwd(), "dist");
const OUT = path.join(process.cwd(), "measurements", "_shots");
mkdirSync(OUT, { recursive: true });
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

const scrolls = Number(process.env.SCROLLS ?? 3);
for (const [label, width, height] of [["phone", 390, 844], ["desk", 1280, 900]]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await installSeed(page, `http://localhost:${port}/`, pathwaySeed(), P3_STORED);
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  if (process.env.THEME === "dark") {
    await page.evaluate(() => localStorage.setItem("theme", "dark"));
    await page.reload({ waitUntil: "networkidle0" });
  }
  await new Promise((r) => setTimeout(r, 1500));
  for (let i = 0; i < scrolls; i += 1) {
    if (i > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), i * height * 0.85);
      await new Promise((r) => setTimeout(r, 700));
    }
    await page.screenshot({ path: path.join(OUT, `${label}-${i}.png`) });
  }
  await page.close();
}
await browser.close();
server.close();
console.log("shots in", OUT);
