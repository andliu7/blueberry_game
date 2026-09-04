import path from "node:path";
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
const CHROME = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c)=>c&&existsSync(c));
const outDir = process.argv[2];
await mkdir(outDir, { recursive: true });
const sleep=(ms)=>new Promise(r=>setTimeout(r,ms));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--hide-scrollbars","--force-device-scale-factor=1"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/#/start/why", { waitUntil: "networkidle0" });
await sleep(1500);
const chips = await page.$$(".ob-chip");
await chips[0].click();
await page.mouse.move(2,800);
await sleep(700);
await page.screenshot({ path: path.join(outDir,"why-picked.png") });

// placement intro
await page.evaluate(()=>{window.location.hash="#/start/placement";});
await sleep(900);
await page.mouse.move(2,800);
await sleep(400);
await page.screenshot({ path: path.join(outDir,"placement-intro.png") });
const cta = await page.$(".ob-cta");
await cta.click();
await page.mouse.move(2,800);
await sleep(1200);
await page.screenshot({ path: path.join(outDir,"placement-q1.png") });
// scroll body to top explicitly
await page.evaluate(()=>{document.querySelector(".ob__body").scrollTop=0;});
await sleep(300);
await page.screenshot({ path: path.join(outDir,"placement-q1-top.png") });
const boxes = await page.evaluate(()=>{
  const b=document.querySelector(".ob__body");
  const q=(s)=>{const e=document.querySelector(s); if(!e)return null; const r=e.getBoundingClientRect(); const cs=getComputedStyle(e);
    return {s,r:[Math.round(r.x),Math.round(r.y),Math.round(r.width),Math.round(r.height)],bg:cs.backgroundColor,color:cs.color,bs:cs.boxShadow,br:cs.borderRadius,border:cs.border};};
  return {scrollH:b.scrollHeight, clientH:b.clientHeight, els:[".ob-kicker",".ob-stem",".ob-tile",".ob-cta",".ob-skip",".ob-peek__berry",".ob-bar",".ob-bar__fill"].map(q)};
});
await writeFile(path.join(outDir,"placement-boxes.json"), JSON.stringify(boxes,null,2));
console.log(JSON.stringify(boxes,null,2));
await browser.close();
