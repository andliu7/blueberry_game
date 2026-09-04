import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((c) => c !== undefined && existsSync(c));
if (!CHROME) throw new Error("no chrome");

const origin = "http://localhost:5173";
const outDir = process.argv[2];
await mkdir(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1", "--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => { if (m.type() === "error") console.log("CONSOLE", m.text()); });

await page.goto(`${origin}/#/start/welcome`, { waitUntil: "networkidle0" });
await sleep(1500);

const steps = ["welcome", "intro", "hear", "why", "overview", "goal", "start"];
for (const s of steps) {
  await page.evaluate((h) => { window.location.hash = h; }, `#/start/${s}`);
  await sleep(1000);
  await page.screenshot({ path: path.join(outDir, `${s}.png`) });
}

// why with pick
await page.evaluate(() => { window.location.hash = "#/start/why"; });
await sleep(800);
let chips = await page.$$(".ob-chip");
if (chips.length) { await chips[0].click(); await sleep(600); }
await page.screenshot({ path: path.join(outDir, "why-picked.png") });

// placement: intro then start the quiz
await page.evaluate(() => { window.location.hash = "#/start/placement"; });
await sleep(1000);
await page.screenshot({ path: path.join(outDir, "placement-intro.png") });
const cta = await page.$(".ob-cta");
if (cta) { await cta.click(); await sleep(1200); }
await page.screenshot({ path: path.join(outDir, "placement-q1.png") });
const tiles = await page.$$(".ob-tile");
console.log("tiles", tiles.length);
if (tiles.length) { await tiles[tiles.length-1].click(); await sleep(600); }
await page.screenshot({ path: path.join(outDir, "placement-q1-picked.png") });

const dump = await page.evaluate(() => {
  const one = (el, sel) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return { sel, rect: { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
      color: cs.color, bg: cs.backgroundColor, border: cs.border, radius: cs.borderRadius,
      shadow: cs.boxShadow, font: `${cs.fontSize}/${cs.fontWeight} ${cs.fontFamily.split(",")[0]}`,
      letter: cs.letterSpacing, tt: cs.textTransform };
  };
  const g = (sel) => { const el = document.querySelector(sel); return el ? one(el, sel) : null; };
  return [".ob",".ob__head",".ob-bar",".ob-bar__fill",".ob-back",".ob-tile","[aria-pressed=true]",".ob-cta",".ob-skip",".ob-kicker",".ob-stem",".ob-peek__berry"].map(g).filter(Boolean);
});
await writeFile(path.join(outDir, "styles-placement.json"), JSON.stringify(dump, null, 2));
await browser.close();
console.log("done");
