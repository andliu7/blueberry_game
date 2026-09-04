import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http"; import path from "node:path"; import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "../economy-moments.mjs";
const DIST = path.join(process.cwd(), "dist");
const MIME={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".png":"image/png"};
const server=http.createServer(async(req,res)=>{const p=decodeURIComponent(req.url.split("?")[0]);let f=path.join(DIST,p);if(!existsSync(f)||p==="/")f=path.join(DIST,"index.html");try{const b=await readFile(f);res.writeHead(200,{"content-type":MIME[path.extname(f)]??"application/octet-stream"});res.end(b);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,r)); const port=server.address().port;
const chrome=["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser=await puppeteer.launch({executablePath:chrome,headless:"new",args:["--no-sandbox"]});
const page=await browser.newPage(); await page.setViewport({width:390,height:844,deviceScaleFactor:2});
await installSeed(page,`http://localhost:${port}/`,P3_SEED,P3_STORED);
await page.goto(`http://localhost:${port}/#/pathway`,{waitUntil:"networkidle0"}); await new Promise(r=>setTimeout(r,1600));
await page.click(".path-node--current"); await new Promise(r=>setTimeout(r,700));
console.log(JSON.stringify(await page.evaluate(()=>{
  const cs=(el)=>getComputedStyle(el);
  const panel=document.querySelector(".ns-panel"); const body=document.body;
  const t=(el,n)=>cs(el).getPropertyValue(n).trim();
  return {
    bodyBg: cs(body).backgroundColor,
    tokensOnPanel: ["--background","--card","--secondary","--primary","--primary-edge","--primary-lip","--ns-card-fill","--ns-quiet-mark"].map(n=>[n,t(panel,n)]),
    tokensOnRoot: ["--background","--card"].map(n=>[n,t(document.documentElement,n)]),
    panelParentChain: (()=>{let e=panel,out=[];while(e&&e!==document.documentElement){out.push(e.tagName+"."+e.className.toString().split(/\s+/).slice(0,2).join("."));e=e.parentElement;}return out;})(),
  };
}),null,1));
await browser.close(); server.close();
