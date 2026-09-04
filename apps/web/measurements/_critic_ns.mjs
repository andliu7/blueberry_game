import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";
const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png", ".woff2":"font/woff2" };
const server = http.createServer(async (req,res)=>{ const p=decodeURIComponent(req.url.split("?")[0]); let f=path.join(DIST,p); if(!existsSync(f)||p==="/") f=path.join(DIST,"index.html"); try{const b=await readFile(f); res.writeHead(200,{"content-type":MIME[path.extname(f)]??"application/octet-stream"}); res.end(b);}catch{res.writeHead(404);res.end();} });
await new Promise(r=>server.listen(0,r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await installSeed(page, `http://localhost:${port}/`, P3_SEED, P3_STORED);
await page.goto(`http://localhost:${port}/#/pathway`, {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1800));
const OUT = path.join(process.cwd(),"measurements","_critic_ns");
await page.screenshot({path: path.join(OUT,"00-path.png")});
await page.click(".path-node--current");
await new Promise(r=>setTimeout(r,800));
await page.screenshot({path: path.join(OUT,"01-sheet.png")});
console.log(JSON.stringify(await page.evaluate(()=>{
  const g = (s)=>{const e=document.querySelector(s); if(!e) return null; const r=e.getBoundingClientRect(); const c=getComputedStyle(e);
    return {sel:s, x:+r.x.toFixed(1), y:+r.y.toFixed(1), w:+r.width.toFixed(1), h:+r.height.toFixed(1), bg:c.backgroundColor, color:c.color, radius:c.borderRadius, border:c.border, shadow:c.boxShadow.slice(0,90), fs:c.fontSize, fw:c.fontWeight, ff:c.fontFamily.slice(0,40)};};
  return {
    open: document.querySelector(".ns-sheet")?.hasAttribute("open"),
    els: [".ns-sheet",".ns-panel",".ns-grabber",".ns-head",".ns-badge",".ns-head__title",".ns-menu",".ns-card",".ns-card__row",".ns-pips",".ns-pip",".ns-start",".ns-start .ns-chip__face",".ns-card--half",".ns-marks",".ns-peek",".tabbar"].map(g),
    pips: [...document.querySelectorAll(".ns-pip")].map(p=>{const c=getComputedStyle(p);return {cls:p.className,bg:c.backgroundColor,bd:c.borderColor,bw:c.borderWidth,w:c.width};}),
    h3s: [...document.querySelectorAll(".ns-panel h3, .ns-panel span.title-face")].map(h=>h.textContent),
  };
}),null,1));
// press states
await page.evaluate(()=>{});
const start = await page.$(".ns-start");
if(start){ const b=await start.boundingBox(); await page.mouse.move(b.x+b.width/2,b.y+b.height/2); await page.mouse.down(); await new Promise(r=>setTimeout(r,120)); await page.screenshot({path: path.join(OUT,"02-start-pressed.png")}); await page.mouse.up(); }
await new Promise(r=>setTimeout(r,500));
console.log("after start press, url:", page.url());
await browser.close(); server.close();
