import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";
const OUT = path.join(process.cwd(), "measurements", "_critic");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await installSeed(page, "light", P3_SEED, P3_STORED);
await page.goto("http://localhost:5173/#/pathway", { waitUntil: "networkidle0" });
await new Promise(r=>setTimeout(r,2500));
for (const y of [3798, 9284]) {
  await page.evaluate(v=>window.scrollTo({top:v}), y);
  await new Promise(r=>setTimeout(r,900));
  await page.screenshot({path: path.join(OUT,`overlap-${y}.png`)});
}
// trail vs node divergence: for each chip with data-trail, find nearest point on any trail path
const div = await page.evaluate(() => {
  const svg = document.querySelector(".path-trail");
  if (!svg) return {err:"no .path-trail"};
  const paths = [...svg.querySelectorAll("path")];
  const anchors = [...document.querySelectorAll("[data-trail]")];
  const stage = document.querySelector(".path-stage").getBoundingClientRect();
  const worst = [];
  for (const a of anchors.slice(0, 60)) {
    const b = a.getBoundingClientRect();
    const cx = b.left + b.width/2, cy = b.top + b.height/2 - 4;
    let best = 1e9;
    for (const p of paths) {
      const L = p.getTotalLength();
      for (let t=0;t<=L;t+=Math.max(4,L/60)) {
        const pt = p.getPointAtLength(t);
        const scr = p.getBoundingClientRect();
        // points are in svg user units == css px for this svg (viewBox 1:1?)
        const ctm = p.getScreenCTM();
        const x = ctm.a*pt.x + ctm.c*pt.y + ctm.e, y2 = ctm.b*pt.x + ctm.d*pt.y + ctm.f;
        const d = Math.hypot(x-cx, y2-cy);
        if (d<best) best=d;
      }
    }
    worst.push({lane:a.dataset.trail, d: Math.round(best)});
  }
  worst.sort((p,q)=>q.d-p.d);
  return {worst: worst.slice(0,8), count: anchors.length};
});
console.log(JSON.stringify(div,null,1));
await browser.close();
