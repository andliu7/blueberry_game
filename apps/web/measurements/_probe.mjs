import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";
const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png" };
const server = http.createServer(async (req,res)=>{
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if(!existsSync(f) || p==="/") f = path.join(DIST,"index.html");
  try { const b = await readFile(f); res.writeHead(200,{"content-type":MIME[path.extname(f)]??"application/octet-stream"}); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise(r=>server.listen(0,r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:1});
await installSeed(page, `http://localhost:${port}/`, P3_SEED, P3_STORED);
await page.goto(`http://localhost:${port}/#/pathway`, {waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1500));
console.log(JSON.stringify(await page.evaluate(()=>{
  const h=document.querySelector("header");
  const out=[{what:"header", ...h.getBoundingClientRect().toJSON()}];
  for(const el of h.querySelectorAll(":scope > div, :scope > div > *, .hud-charge, button, a")){
    const r=el.getBoundingClientRect();
    out.push({what:el.tagName+"."+(el.className.toString().split(/\s+/).slice(0,2).join(".")), x:Math.round(r.x), w:Math.round(r.width), right:Math.round(r.right), txt:(el.textContent||"").trim().slice(0,12)});
  }
  return out;
}),null,1));
await browser.close(); server.close();
