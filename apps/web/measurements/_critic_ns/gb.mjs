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
await page.click(".path-node--current");
await new Promise(r=>setTimeout(r,700));
// forced pressed frame
await page.addStyleTag({content:".ns-start .ns-chip__face{transform:translateY(4px)!important} .ns-menu{border-color:var(--border)!important}"});
await page.screenshot({path: path.join(OUT,"03-forced-press.png")});
await page.evaluate(()=>{const s=document.querySelectorAll("style");s[s.length-1].remove();});
// guidebook
await page.evaluate(()=>document.querySelector(".ns-menu").dispatchEvent(new PointerEvent("pointerdown",{bubbles:true})));
await new Promise(r=>setTimeout(r,900));
await page.screenshot({path: path.join(OUT,"04-guidebook.png")});
const info = await page.evaluate(()=>{
  const g=(s)=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); const c=getComputedStyle(e);
    return {sel:s,x:+r.x.toFixed(1),y:+r.y.toFixed(1),w:+r.width.toFixed(1),h:+r.height.toFixed(1),bg:c.backgroundColor,color:c.color,radius:c.borderRadius,border:c.border,shadow:c.boxShadow.slice(0,70),fs:c.fontSize,fw:c.fontWeight,ff:c.fontFamily.slice(0,26)};};
  const cls=[...new Set([...document.querySelectorAll(".gb-page *")].map(e=>e.className.toString().split(/\s+/)[0]).filter(c=>c.startsWith("gb-")))];
  return {classes:cls, body: document.querySelector(".gb-page")?.innerText?.slice(0,900),
    els:[".gb-overlay",".gb-page",".gb-back",".gb-title",".gb-badge",".gb-body",".gb-figure",".gb-callout",".gb-worked",".gb-step",".gb-scheme"].map(g)};
});
console.log(JSON.stringify(info,null,1));
const h = await page.evaluate(()=>document.querySelector(".gb-page").scrollHeight);
await page.setViewport({width:390,height:Math.min(h+120,2400),deviceScaleFactor:2});
await new Promise(r=>setTimeout(r,600));
await page.screenshot({path: path.join(OUT,"05-guidebook-full.png"), fullPage:false});
await browser.close(); server.close();
