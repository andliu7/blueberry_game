// Throwaway: does the grey collected tray render for the mistakes deck.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if (!existsSync(f) || p === "/") f = path.join(DIST, "index.html");
  try { const b = await readFile(f); res.writeHead(200, { "content-type": MIME[path.extname(f)] ?? "application/octet-stream" }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  localStorage.clear();
  localStorage.setItem("theme", "light");
  localStorage.setItem("blueberry.progress.v2", JSON.stringify({ course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [], onboardingDone: true, displayName: "P", journal: [] }));
});
await page.goto(`http://localhost:${port}/#/cards`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
await new Promise((r) => setTimeout(r, 700));
await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("My mistakes"))?.click(); });
await new Promise((r) => setTimeout(r, 600));
console.log(JSON.stringify(await page.evaluate(() => {
  const box = document.querySelector(".tray-box");
  return {
    collected: box?.classList.contains("tray-box--collected") ?? null,
    face: box ? getComputedStyle(box).backgroundColor : null,
    front: document.querySelector(".tray-box__front")?.textContent ?? null,
    disabled: document.querySelector(".tray-box__front")?.disabled ?? null,
    emptyCopy: document.body.innerText.includes("Nothing in this deck yet"),
  };
}), null, 1));
await page.screenshot({ path: "measurements/_shots-cards/tray-mistakes.png" });
await browser.close(); server.close();
