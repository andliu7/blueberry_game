/** Which chips render an empty face. Diagnostic only. */
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
  const empty=[...document.querySelectorAll(".path-node")].filter(c=>c.querySelector("svg")===null);
  return {count:empty.length, which:empty.map(c=>({label:(c.getAttribute("aria-label")||"").slice(0,40), cls:c.className.toString().slice(0,80), where: c.closest(".path-hub")?"hub":c.closest(".path-fork")?"fork":"row"}))};
}),null,1));
await browser.close(); server.close();
