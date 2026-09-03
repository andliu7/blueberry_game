import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";
const OUT = "C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/shots";
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await installSeed(page, "http://localhost:5173/", P3_SEED, P3_STORED);
await page.goto("http://localhost:5173/#/pathway", {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,3000));
const info = await page.evaluate(()=>{
  const cands = [document.scrollingElement, ...document.querySelectorAll("main, [data-path-content], div")].filter(Boolean);
  const s = cands.find(el=>el.scrollHeight > el.clientHeight + 200);
  return { tag: s ? s.tagName+"."+(s.className||"").toString().slice(0,60) : "none", sh: s?s.scrollHeight:0, ch: s?s.clientHeight:0 };
});
console.log(JSON.stringify(info));
await page.screenshot({path: OUT+"/s-top.png"});
const H = info.sh;
const steps = 9;
for (let i=1;i<=steps;i++){
  const y = Math.round((H-844)*i/steps);
  await page.evaluate((yy)=>{
    const cands = [document.scrollingElement, ...document.querySelectorAll("main, [data-path-content], div")].filter(Boolean);
    const s = cands.find(el=>el.scrollHeight > el.clientHeight + 200);
    if (s===document.scrollingElement) window.scrollTo(0,yy); else s.scrollTop = yy;
  }, y);
  await new Promise(r=>setTimeout(r,600));
  await page.screenshot({path: OUT+"/s-"+i+".png"});
}
await browser.close();
