import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";
const OUT = path.join(process.cwd(), "measurements", "_critic");
mkdirSync(OUT, { recursive: true });
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await installSeed(page, "light", P3_SEED, P3_STORED);
await page.goto("http://localhost:5173/#/pathway", { waitUntil: "networkidle0" });
await new Promise(r=>setTimeout(r,2500));
const rep = await page.evaluate(() => {
  const out = {};
  // Force a done node to inspect its real (non-swatch) rendering
  const chip = document.querySelector(".path-node--current");
  chip.classList.remove("path-node--current"); chip.classList.add("path-node--done");
  const cs = getComputedStyle(chip), f = getComputedStyle(chip.querySelector(".path-node__face"));
  out.doneWell = cs.backgroundColor; out.doneGlow = cs.boxShadow; out.doneFace = f.backgroundColor; out.doneInk = f.color;
  // Trail strokes actually in the DOM
  const svgs = [...document.querySelectorAll(".path-trail path, .path-trail line, svg.path-trail *")];
  out.trailClasses = [...new Set([...document.querySelectorAll("[class*='path-trail__']")].map(e=>e.getAttribute("class")))];
  // any element whose computed COLOR (text) or borderColor is the goal green
  const green = ["rgb(126, 217, 87)"];
  const offenders = [];
  document.querySelectorAll("*").forEach(el => {
    const s = getComputedStyle(el);
    if (green.includes(s.color) && el.textContent && el.textContent.trim().length) offenders.push({tag:el.tagName, cls:el.className?.toString?.().slice(0,60), text:el.textContent.trim().slice(0,30), why:"text"});
    if (green.includes(s.borderTopColor) && parseFloat(s.borderTopWidth) > 0 && parseFloat(s.borderTopWidth) < 4) offenders.push({tag:el.tagName, cls:el.className?.toString?.().slice(0,60), why:"thin border "+s.borderTopWidth});
    if (green.includes(s.stroke) && parseFloat(s.strokeWidth||0) < 4) offenders.push({tag:el.tagName, cls:el.getAttribute?.("class"), why:"thin stroke "+s.strokeWidth});
  });
  out.greenOffenders = offenders.slice(0,20);
  // one fork per screen check: count .path-fork + .path-hub intersecting viewport at several scrolls
  return out;
});
console.log(JSON.stringify(rep,null,1));
// fork-per-screen sweep
const sweep = await page.evaluate(() => {
  const h = window.innerHeight;
  const total = document.body.scrollHeight;
  const res = [];
  const forks = [...document.querySelectorAll(".path-fork, .path-hub")];
  for (let y=0; y<total-h; y+=h*0.5) {
    const n = forks.filter(f => { const b=f.getBoundingClientRect(); const top=b.top+window.scrollY; return top < y+h && top+b.height > y; }).length;
    if (n>1) res.push({y:Math.round(y), n});
  }
  return {overlaps: res.slice(0,10), totalForks: forks.length};
});
console.log(JSON.stringify(sweep,null,1));
await page.screenshot({path: path.join(OUT,"forced-done.png")});
await browser.close();
