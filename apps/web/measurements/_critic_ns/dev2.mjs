import { existsSync } from "node:fs"; import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "../economy-moments.mjs";
const chrome=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const b=await puppeteer.launch({executablePath:chrome,headless:"new",args:["--no-sandbox"]});
const page=await b.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await installSeed(page,"http://localhost:5173/",P3_SEED,P3_STORED);
await page.goto("http://localhost:5173/#/pathway",{waitUntil:"networkidle0"}); await new Promise(r=>setTimeout(r,2200));
await page.click(".path-node--current"); await new Promise(r=>setTimeout(r,700));
await page.evaluate(()=>document.querySelector(".ns-menu").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})));
await new Promise(r=>setTimeout(r,900));
console.log(JSON.stringify(await page.evaluate(()=>{
  const cs=e=>getComputedStyle(e); const q=s=>document.querySelector(s);
  const out={};
  for(const s of [".gb-overlay",".gb-figure",".gb-strip",".gb-callout",".gb-callout__cap",".gb-checks",".gb-checks__mark",".gb-draft",".gb-badge",".gb-prop",".gb-section-head"]){
    const e=q(s); if(!e){out[s]=null;continue;} const c=cs(e);
    out[s]={bg:c.backgroundColor,color:c.color,shadow:c.boxShadow.slice(0,50),fs:c.fontSize,opacity:c.opacity};
  }
  out.propColor = (()=>{const e=q(".gb-prop svg path"); return e?cs(e).fill:null;})();
  out.headings=[...document.querySelectorAll(".gb-section-head")].map(h=>h.textContent.trim());
  out.hasMascotBlock = /mascot/i.test(document.querySelector(".gb-page").innerText);
  out.sections=[...document.querySelectorAll(".gb-page > *")].map(e=>e.className.toString().split(/\s+/)[0]||e.tagName);
  return out;
}),null,1));
await b.close();
