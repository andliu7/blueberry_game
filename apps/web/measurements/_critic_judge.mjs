import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";

const OUT = path.join(process.cwd(), "measurements", "_critic");
mkdirSync(OUT, { recursive: true });
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const BASE = "http://localhost:5173";
for (const [label, width, height] of [["phone", 390, 844], ["desk", 1280, 900]]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 2 });
  await installSeed(page, "light", P3_SEED, P3_STORED);
  await page.goto(`${BASE}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 2500));
  for (let i = 0; i < 5; i += 1) {
    if (i > 0) {
      await page.evaluate((y) => window.scrollTo({ top: y, behavior: "auto" }), i * height * 0.8);
      await new Promise((r) => setTimeout(r, 900));
    }
    await page.screenshot({ path: path.join(OUT, `${label}-${i}.png`) });
  }
  if (label === "phone") {
    const report = await page.evaluate(() => {
      const out = {};
      const rail = document.querySelector(".path-trackmap");
      const pill = document.querySelector(".path-trackmap__pill");
      const bubble = document.querySelector(".path-trackmap__bubble");
      const berry = document.querySelector(".path-trackmap__berry");
      const r = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return {x:Math.round(b.x),y:Math.round(b.y),w:Math.round(b.width),h:Math.round(b.height), op: getComputedStyle(el).opacity, vis: getComputedStyle(el).visibility, display: getComputedStyle(el).display}; };
      out.rail = r(rail); out.pill = r(pill); out.bubble = r(bubble); out.berry = r(berry);
      out.bubbleText = bubble ? bubble.textContent : null;
      out.pillPointerEvents = pill ? getComputedStyle(pill).pointerEvents : null;
      out.berryPointerEvents = berry ? getComputedStyle(berry).pointerEvents : null;
      // node states present
      const states = {};
      document.querySelectorAll("[data-node-state]").forEach((n) => { states[n.dataset.nodeState] = (states[n.dataset.nodeState]||0)+1; });
      out.states = states;
      out.chipCount = document.querySelectorAll(".path-node").length;
      // node sizes
      const sizes = new Set();
      document.querySelectorAll(".path-node:not(.path-node--swatch)").forEach((n) => { const b=n.getBoundingClientRect(); sizes.add(`${Math.round(b.width)}x${Math.round(b.height)}`); });
      out.nodeSizes = [...sizes];
      out.startPill = !!document.querySelector(".path-start");
      out.forks = document.querySelectorAll(".path-fork").length;
      out.hubs = document.querySelectorAll(".path-hub").length;
      out.gates = document.querySelectorAll(".path-gatenode").length;
      out.badges = [...document.querySelectorAll(".path-node__badge")].map(b=>b.className);
      out.legend = [...document.querySelectorAll('[aria-label="Legend"] li')].map(l=>l.textContent.trim());
      return out;
    });
    console.log(JSON.stringify(report, null, 1));
  }
  await page.close();
}
await browser.close();
