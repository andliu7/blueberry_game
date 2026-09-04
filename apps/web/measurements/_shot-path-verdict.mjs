/** Screenshots of the pathway at four scroll positions, for eyes. */
import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { S2_SEED, S2_STORED, installSeed } from "./economy-moments.mjs";

const DIST = path.join(process.cwd(), "dist");
const OUT = path.join(process.cwd(), "measurements", process.env.OUT ?? "_shots-verdict");
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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await installSeed(page, `http://localhost:${port}/`, S2_SEED, S2_STORED);
await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1800));
for (const y of [0, 500, 1000, 1600, 2200]) {
  await page.evaluate((to) => window.scrollTo(0, to), y);
  await new Promise((r) => setTimeout(r, 600));
  await writeFile(path.join(OUT, `y${y}.png`), await page.screenshot());
}
await browser.close();
server.close();
console.log("wrote", OUT);
