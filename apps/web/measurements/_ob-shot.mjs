import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((c) => c !== undefined && existsSync(c));
if (!CHROME) throw new Error("no chrome");

const origin = process.env.ORIGIN ?? "http://localhost:5173";
const outDir = process.argv[2];
await mkdir(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--force-device-scale-factor=1"],
});
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
page.on("console", (m) => {
  if (m.type() === "error") console.log("CONSOLE", m.text());
});

await page.goto(`${origin}/#/start/welcome`, { waitUntil: "networkidle0" });
await sleep(1800);

const geom = async (label) => {
  const data = await page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x * 10) / 10,
        y: Math.round(r.y * 10) / 10,
        w: Math.round(r.width * 10) / 10,
        h: Math.round(r.height * 10) / 10,
      };
    };
    const body = document.querySelector(".ob__body");
    return {
      bar: box(".ob-bar"),
      back: box(".ob-back"),
      trail: box(".ob-headskip"),
      stem: box(".ob-stem"),
      firstTile: box(".ob-tile"),
      tiles: [...document.querySelectorAll(".ob-tile")].map((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      }),
      chips: [...document.querySelectorAll(".ob-chip")].map((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
      }),
      bubble: box(".ob-welcome__bubble"),
      berry: box(".ob-welcome__berry"),
      peek: box(".ob-peek__berry"),
      cta: box(".ob-cta"),
      gate: box(".ob-gate"),
      overflow: body ? body.scrollHeight - body.clientHeight : null,
      figures: document.querySelectorAll(".ob-tile__figure").length,
      visualName: document.querySelectorAll('.ob-tile[data-visual="name"]').length,
    };
  });
  console.log("==", label, JSON.stringify(data));
};

const steps = ["welcome", "intro", "hear", "why", "overview", "goal", "start"];
for (const s of steps) {
  await page.evaluate((h) => {
    window.location.hash = h;
  }, `#/start/${s}`);
  await sleep(900);
  await page.screenshot({ path: path.join(outDir, `${s}.png`) });
  await geom(s);
}

// placement: intro screen, then start the quiz
await page.evaluate(() => {
  window.location.hash = "#/start/placement";
});
await sleep(900);
await page.screenshot({ path: path.join(outDir, "placement-intro.png") });
await geom("placement-intro");

const startBtn = await page.$(".ob-cta");
if (startBtn) {
  await startBtn.click();
  await sleep(900);
}
await page.screenshot({ path: path.join(outDir, "placement-q1.png") });
await geom("placement-q1");

// pick the first tile so the picked state and CHECK enabled are visible
const tiles = await page.$$(".ob-tile");
if (tiles.length) {
  await tiles[0].click();
  await sleep(500);
  await page.screenshot({ path: path.join(outDir, "placement-q1-picked.png") });
}

// walk a couple of questions to see other stems
for (let i = 0; i < 3; i += 1) {
  const skip = await page.$(".ob-headskip");
  if (!skip) break;
  await skip.click();
  await sleep(700);
  await page.screenshot({ path: path.join(outDir, `placement-q${i + 2}.png`) });
  await geom(`placement-q${i + 2}`);
}

// hear, with the picked state
await page.evaluate(() => {
  window.location.hash = "#/start/hear";
});
await sleep(800);
const chips = await page.$$(".ob-chip");
if (chips.length) {
  await chips[0].click();
  await sleep(500);
}
await page.screenshot({ path: path.join(outDir, "hear-picked.png") });

await browser.close();
console.log("done ->", outDir);
