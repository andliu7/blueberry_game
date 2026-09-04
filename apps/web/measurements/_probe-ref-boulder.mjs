/** The adopted design's boulder and watermark tones, sampled. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
const UNITS = path.join(path.resolve(process.cwd(), "..", ".."), "docs", "reference", "design-goals", "units");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage(); await page.goto("about:blank");
const out={};
for (const [file, pts] of [
  ["unit01-path.jpg", [["boulder",0.795,0.727],["boulder2",0.845,0.742],["ground-beside",0.70,0.72],["flask-ink",0.196,0.418],["ground-by-flask",0.24,0.418],["watermark-ink",0.20,0.52],["ground-by-mark",0.26,0.52]]],
  ["unit02-path.jpg", [["watermark-ink",0.815,0.245],["ground-by-mark",0.76,0.245],["flask-ink",0.222,0.328],["ground-by-flask",0.27,0.328]]],
]) {
  const b64 = readFileSync(path.join(UNITS, file)).toString("base64");
  out[file] = await page.evaluate(async (src, points) => await new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
      const ctx=c.getContext("2d"); ctx.drawImage(img,0,0);
      const hex=v=>v.toString(16).padStart(2,"0");
      const PL=(r,g,b)=>0.2126*r+0.7152*g+0.0722*b;
      const res={};
      for(const [name,fx,fy] of points){
        const x=Math.round(fx*c.width), y=Math.round(fy*c.height);
        const d=ctx.getImageData(x,y,1,1).data;
        res[name]={hex:`#${hex(d[0])}${hex(d[1])}${hex(d[2])}`, lum:+PL(d[0],d[1],d[2]).toFixed(1), at:`${x},${y}`};
      }
      resolve(res);
    };
    img.src=src;
  }), `data:image/jpeg;base64,${b64}`, pts);
}
console.log(JSON.stringify(out,null,1));
await browser.close();
