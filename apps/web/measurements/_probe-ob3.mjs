import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const out = process.argv[2];
await mkdir(out, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1","--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await page.goto("http://localhost:5173/#/start/placement", { waitUntil: "networkidle0" });
await sleep(1400);
await page.screenshot({ path: path.join(out, "p0-intro.png") });
// press START
const cta = await page.$(".ob-cta");
await cta.click();
await sleep(700);
await page.screenshot({ path: path.join(out, "p1-question.png") });
const tiles = await page.$$(".ob-tile");
if (tiles.length) { await tiles[3].click(); await sleep(400); }
await page.screenshot({ path: path.join(out, "p2-picked.png") });
const geo = await page.evaluate(() => {
  const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
  return { tiles: [...document.querySelectorAll(".ob-tile")].map((e)=>{const b=e.getBoundingClientRect();return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height)};}), stem: r(".ob-stem"), cta: r(".ob-cta"), back: r(".ob-back"), peek: r(".ob-peek__berry") };
});
console.log(JSON.stringify(geo));
await browser.close();
