import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "../economy-moments.mjs";
const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png" };
const server = http.createServer(async (req,res)=>{ const p=decodeURIComponent(req.url.split("?")[0]); let f=path.join(DIST,p); if(!existsSync(f)||p==="/") f=path.join(DIST,"index.html"); try{const b=await readFile(f); res.writeHead(200,{"content-type":MIME[path.extname(f)]??"application/octet-stream"}); res.end(b);}catch{res.writeHead(404);res.end();} });
await new Promise(r=>server.listen(0,r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await installSeed(page, `http://localhost:${port}/`, P3_SEED, P3_STORED);
await page.goto(`http://localhost:${port}/#/pathway`, {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1800));
const OUT = path.join(process.cwd(),"measurements","_critic_ns");
// list nodes
console.log(JSON.stringify(await page.evaluate(()=>[...document.querySelectorAll(".path-node")].map(n=>({c:n.className, s:n.getAttribute("data-state"), t:(n.getAttribute("aria-label")||"").slice(0,40)}))),null,0));
// try a done node
const done = await page.$('.path-node[data-state="done"], .path-node--done');
if(done){ await done.click(); await new Promise(r=>setTimeout(r,700)); await page.screenshot({path:path.join(OUT,"06-done-sheet.png")});
  console.log("done sheet h3s:", await page.evaluate(()=>[...document.querySelectorAll(".ns-panel h3, .ns-panel span.title-face, .ns-note")].map(e=>e.textContent)));
  await page.keyboard.press("Escape"); await new Promise(r=>setTimeout(r,500));
}
const locked = await page.$('.path-node[data-state="locked"], .path-node--locked');
console.log("locked node present:", locked!==null);
// leak check: is anything painted above the guidebook overlay
await page.click(".path-node--current"); await new Promise(r=>setTimeout(r,600));
await page.evaluate(()=>document.querySelector(".ns-menu").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})));
await new Promise(r=>setTimeout(r,700));
console.log(JSON.stringify(await page.evaluate(()=>{
  const ov=document.querySelector(".gb-overlay").getBoundingClientRect();
  const out=[];
  for(const el of document.querySelectorAll("body *")){
    if(el.closest(".gb-overlay")||el.closest("header")||el.closest(".tabbar")) continue;
    const c=getComputedStyle(el); const z=c.zIndex;
    if(c.position==="static"||z==="auto") continue;
    if(Number(z)<8) continue;
    const r=el.getBoundingClientRect(); if(r.width===0||r.height===0) continue;
    out.push({tag:el.tagName, cls:el.className.toString().slice(0,50), z, x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height), txt:(el.textContent||"").trim().slice(0,26)});
  }
  return out;
}),null,1));
await browser.close(); server.close();
