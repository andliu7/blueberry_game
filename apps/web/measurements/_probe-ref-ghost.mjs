/**
 * HOW GHOSTED THE ADOPTED DESIGN'S WALLPAPER IS, as a luminance delta.
 * For a rectangle that contains a watermark and its ground and nothing else,
 * the delta is (the 99th percentile luminance) minus (the 1st percentile),
 * which is the ground against the ink without letting one stray jpg pixel
 * decide the number.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
const UNITS = path.join(path.resolve(process.cwd(), "..", ".."), "docs", "reference", "design-goals", "units");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage(); await page.goto("about:blank");
const jobs = [
  ["unit01-path.jpg", { flask: [0.16,0.38,0.26,0.47], "flask-2": [0.15,0.53,0.25,0.62], molecule: [0.36,0.28,0.60,0.36], boulder: [0.66,0.68,0.80,0.78] }],
  ["unit02-path.jpg", { molecule: [0.72,0.21,0.92,0.30], flask: [0.15,0.32,0.26,0.42], "flask-right": [0.74,0.46,0.90,0.56] }],
];
const out={};
for (const [file, boxes] of jobs) {
  const b64 = readFileSync(path.join(UNITS, file)).toString("base64");
  out[file] = await page.evaluate(async (src, bs) => await new Promise((resolve)=>{
    const img=new Image();
    img.onload=()=>{
      const c=document.createElement("canvas"); c.width=img.naturalWidth; c.height=img.naturalHeight;
      const ctx=c.getContext("2d"); ctx.drawImage(img,0,0);
      const res={};
      for(const [name,b] of Object.entries(bs)){
        const x=Math.round(b[0]*c.width), y=Math.round(b[1]*c.height);
        const w=Math.round((b[2]-b[0])*c.width), h=Math.round((b[3]-b[1])*c.height);
        const d=ctx.getImageData(x,y,w,h).data;
        const lums=[];
        for(let i=0;i<d.length;i+=4) lums.push(0.2126*d[i]+0.7152*d[i+1]+0.0722*d[i+2]);
        lums.sort((a,z)=>a-z);
        const p=(q)=>lums[Math.min(lums.length-1,Math.max(0,Math.round(q*(lums.length-1))))];
        res[name]={ground:+p(0.99).toFixed(1), ink:+p(0.01).toFixed(1), delta:+(p(0.99)-p(0.01)).toFixed(1)};
      }
      resolve(res);
    };
    img.src=src;
  }), `data:image/jpeg;base64,${b64}`, boxes);
}
console.log(JSON.stringify(out,null,1));
await browser.close();
