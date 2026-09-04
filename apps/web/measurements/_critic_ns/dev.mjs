import { existsSync } from "node:fs"; import path from "node:path"; import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "../economy-moments.mjs";
const chrome=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser=await puppeteer.launch({executablePath:chrome,headless:"new",args:["--no-sandbox"]});
const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2});
const BASE="http://localhost:5173/";
await installSeed(page,BASE,P3_SEED,P3_STORED);
await page.goto(BASE+"#/pathway",{waitUntil:"networkidle0"}); await new Promise(r=>setTimeout(r,2500));
const OUT=path.join(process.cwd(),"measurements","_critic_ns");
await page.click(".path-node--current"); await new Promise(r=>setTimeout(r,800));
await page.mouse.move(5,5); await new Promise(r=>setTimeout(r,300));
await page.screenshot({path:path.join(OUT,"D1-sheet.png")});
console.log(JSON.stringify(await page.evaluate(()=>{
  const p=document.querySelector(".ns-panel"), c=document.querySelector(".ns-card"), s=document.querySelector(".ns-start .ns-chip__face"), g=document.querySelector(".ns-grabber");
  const cs=e=>getComputedStyle(e);
  return {bg:cs(document.documentElement).getPropertyValue("--background").trim(), card:cs(document.documentElement).getPropertyValue("--card").trim(),
    panelBg:cs(p).backgroundColor, cardBg:cs(c).backgroundColor, startBg:cs(s).backgroundColor, startBorder:cs(s).borderColor, grabber:cs(g).backgroundColor,
    pips:[...document.querySelectorAll(".ns-pip")].map(x=>cs(x).backgroundColor), cardH:c.getBoundingClientRect().height, headH:document.querySelector(".ns-head").getBoundingClientRect().height};
}),null,1));
await page.evaluate(()=>document.querySelector(".ns-menu").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})));
await new Promise(r=>setTimeout(r,900));
const h=await page.evaluate(()=>document.querySelector(".gb-page").scrollHeight);
await page.setViewport({width:390,height:Math.min(h+130,2400),deviceScaleFactor:2}); await new Promise(r=>setTimeout(r,700));
await page.screenshot({path:path.join(OUT,"D2-guidebook.png")});
console.log(JSON.stringify(await page.evaluate(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();return {s,x:+r.x.toFixed(0),y:+r.y.toFixed(0),w:+r.width.toFixed(0),h:+r.height.toFixed(0)};};
 return [".gb-strip",".gb-strip__art",".gb-strip__art svg",".gb-figure",".gb-callout",".gb-checks"].map(g);}),null,1));
await browser.close();
