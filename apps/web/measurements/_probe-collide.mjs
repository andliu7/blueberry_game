/** Which label cards meet a chip, and by how much. Diagnostic only. */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { S2_SEED, S2_STORED, installSeed } from "./economy-moments.mjs";
const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png" };
const server = http.createServer(async (req,res)=>{const p=decodeURIComponent(req.url.split("?")[0]);let f=path.join(DIST,p);if(!existsSync(f)||p==="/")f=path.join(DIST,"index.html");try{const b=await readFile(f);res.writeHead(200,{"content-type":MIME[path.extname(f)]??"application/octet-stream"});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r));
const port=server.address().port;
const chrome=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser=await puppeteer.launch({executablePath:chrome,headless:"new",args:["--no-sandbox"]});
const page=await browser.newPage();
await page.setViewport({width:390,height:844});
await installSeed(page,`http://localhost:${port}/`,S2_SEED,S2_STORED);
await page.goto(`http://localhost:${port}/#/pathway`,{waitUntil:"networkidle0"});
await new Promise(r=>setTimeout(r,1600));
console.log(JSON.stringify(await page.evaluate(()=>{
  const labels=[...document.querySelectorAll(".path-label")];
  const chips=[...document.querySelectorAll(".path-node, .path-gatenode")];
  const out=[];
  for(const l of labels){
    const a=l.getBoundingClientRect();
    for(const c of chips){
      const b=c.getBoundingClientRect();
      const ox=Math.min(a.right,b.right)-Math.max(a.left,b.left);
      const oy=Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top);
      if(ox>1&&oy>1){
        out.push({label:l.textContent.trim().slice(0,26), side:[...l.classList].find(x=>x.startsWith("path-label--")), ox:Math.round(ox), oy:Math.round(oy),
          sameRow: l.closest(".path-row, .path-fork__cell, .path-hub__cell") === c.closest(".path-row, .path-fork__cell, .path-hub__cell"),
          chipIn: c.closest(".path-row") ? "row" : c.closest(".path-fork__cell") ? "fork" : c.closest(".path-hub__cell") ? "hub" : "gate"});
      }
    }
  }
  return {total:out.length, sample:out.slice(0,14)};
}),null,1));
await browser.close(); server.close();
