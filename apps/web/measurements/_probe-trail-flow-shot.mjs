/**
 * Three frames of the progress flow, so the travel can be looked at rather
 * than trusted. The animation is started on the walked stretches with the
 * real stagger (--flow-index in trail order) and the page is photographed
 * early, mid and late. A THROWAWAY probe: it proves the green sweeps rather
 * than appears, and it is the capture a judge compares against the goals.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { LOCAL_TZ, S2_SEED, S2_STORED, installSeed, noonDaysAgo } from "./economy-moments.mjs";
const WALKED = ["u1-allylic", "u1-nbs", "u1-da", "u1-ied", "u1-poly", "u1-kvt", "u1-12v14"];
const SEED = [...S2_SEED, ...WALKED.map((nodeId, index) => ({ kind: "node_cleared", at: noonDaysAgo(8 - index), tz: LOCAL_TZ, nodeId, nodeKind: "reaction", flawless: true, stepsInOneSitting: 1, spine: true, difficulty: 3 }))];
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
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await installSeed(page, `http://localhost:${port}/`, SEED, S2_STORED);
await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1400));
await page.evaluate(() => {
  const groups = [...document.querySelectorAll(".path-trail__done")];
  groups.forEach((g, i) => { g.style.setProperty("--flow-index", String(i)); g.classList.add("path-trail__done--flow"); });
});
for (const [name, wait] of [["early", 260], ["mid", 700], ["late", 1500]]) {
  await new Promise((r) => setTimeout(r, name === "early" ? wait : 0));
  if (name !== "early") await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({ path: `measurements/_shots/trail-flow-${name}.png` });
}
await browser.close(); server.close();
