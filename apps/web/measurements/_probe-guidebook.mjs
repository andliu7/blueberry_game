/**
 * Shoot the node sheet and the guidebook in both themes, at phone width.
 * Builder instrument for the R node-sheet piece; not part of any gate.
 */
import { existsSync, mkdirSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, openSeeded } from "./economy-moments.mjs";

const DIST = path.join(process.cwd(), "dist");
const SHOTS = path.join(process.cwd(), "measurements", "_shots");
mkdirSync(SHOTS, { recursive: true });
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
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });

const report = {};
for (const theme of ["light", "dark"]) {
  const page = await openSeeded(browser, {
    origin,
    viewport: { width: 390, height: 844, deviceScaleFactor: 2 },
    theme,
    hash: "#/pathway",
    journal: P3_SEED,
    stored: P3_STORED,
  });
  await page.click(".path-node--current");
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({ path: path.join(SHOTS, `sheet-${theme}.png`) });
  report[`sheet-${theme}`] = await page.evaluate(() => {
    const panel = document.querySelector(".ns-panel");
    const peek = document.querySelector(".ns-peek");
    const start = document.querySelector(".ns-start");
    const menu = document.querySelector(".ns-menu");
    const box = (el) => (el === null ? null : { w: Math.round(el.getBoundingClientRect().width), h: Math.round(el.getBoundingClientRect().height) });
    return {
      panel: box(panel),
      peek: box(peek),
      start: box(start),
      menu: box(menu),
      panelBottom: panel === null ? null : Math.round(window.innerHeight - panel.getBoundingClientRect().bottom),
      panelRadius: panel === null ? null : getComputedStyle(panel).borderRadius,
      panelBg: panel === null ? null : getComputedStyle(panel).backgroundColor,
      cardBg: getComputedStyle(document.querySelector(".ns-card")).backgroundColor,
    };
  });

  await page.click(".ns-menu");
  await new Promise((r) => setTimeout(r, 500));
  await page.screenshot({ path: path.join(SHOTS, `guidebook-${theme}.png`) });
  report[`guidebook-${theme}`] = await page.evaluate(() => ({
    headerH: Math.round(document.querySelector("header.sticky")?.getBoundingClientRect().height ?? 0),
    backTop: Math.round(document.querySelector(".gb-back")?.getBoundingClientRect().top ?? -1),
    page: document.querySelector(".gb-page") !== null,
    headerVisible: (() => {
      const h = document.querySelector("header.sticky");
      if (h === null) return null;
      const r = h.getBoundingClientRect();
      return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest("header.sticky") !== null;
    })(),
    draft: document.querySelector(".gb-draft")?.textContent ?? null,
    steps: document.querySelectorAll(".gb-steps li").length,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  await page.evaluate(() => document.querySelector(".gb-overlay")?.scrollTo(0, 620));
  await new Promise((r) => setTimeout(r, 300));
  await page.screenshot({ path: path.join(SHOTS, `guidebook-${theme}-2.png`) });
  await page.close();
}
console.log(JSON.stringify(report, null, 1));
await browser.close();
server.close();
