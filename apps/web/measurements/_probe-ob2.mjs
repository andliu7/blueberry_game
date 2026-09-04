import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
const CHROME = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1","--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await page.goto("http://localhost:5173/#/start/why", { waitUntil: "networkidle0" });
await new Promise(r=>setTimeout(r,1200));
const chips = await page.$$(".ob-chip");
await chips[0].click();
await new Promise(r=>setTimeout(r,400));
await page.screenshot({path:"C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/pick.png"});
const out = await page.evaluate(() => {
  const el = document.querySelector(".ob-chip[aria-pressed=true]");
  const rects = (sel) => { const e = document.querySelector(sel); if(!e) return null; const r=e.getBoundingClientRect(); return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)}; };
  const hits = [...document.querySelectorAll("*")].filter((n)=>n.children.length===0 && (n.textContent||"").trim()==="Orgo II").map((n)=>{const r=n.getBoundingClientRect(); return {tag:n.tagName, cls:n.className && n.className.baseVal!==undefined?n.className.baseVal:n.className, x:Math.round(r.x),y:Math.round(r.y), self:n.outerHTML, style:(()=>{const c=getComputedStyle(n);return c.position+" z"+c.zIndex+" "+c.border+" "+c.borderRadius+" bg"+c.backgroundColor;})(), sibIndex:[...n.parentElement.children].indexOf(n), siblings:[...n.parentElement.children].map(c=>c.tagName+"."+(typeof c.className==="string"?c.className:""))};});
  const pseudo = (()=>{const lbl=document.querySelector(".ob-chip__label"); if(!lbl) return null; const a=getComputedStyle(lbl,"::after"); const b=getComputedStyle(lbl,"::before"); return {after:a.content, before:b.content};})();
  return { hits, pseudo, html: el ? el.outerHTML.slice(0,120) : null,
    bar: rects(".ob-bar"), chip: rects(".ob-chip"), cta: rects(".ob-cta"), back: rects(".ob-back"), ob: rects(".ob"),
    lastChip: (()=>{const l=[...document.querySelectorAll(".ob-chip")].pop(); const r=l.getBoundingClientRect(); return {y:Math.round(r.bottom)};})(),
  };
});
console.log(JSON.stringify(out,null,1));
await browser.close();
