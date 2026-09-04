/** The adopted gate arch's real width, scanned rather than eyeballed. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
const UNITS = path.join(path.resolve(process.cwd(), "..", ".."), "docs", "reference", "design-goals", "units");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("about:blank");
const b64 = readFileSync(path.join(UNITS, "unit02-path.jpg")).toString("base64");
console.log(JSON.stringify(await page.evaluate(async (src) => await new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d"); ctx.drawImage(img,0,0);
    const d = ctx.getImageData(0,0,c.width,c.height).data;
    const at=(x,y)=>{const i=(y*c.width+x)*4;return [d[i],d[i+1],d[i+2]];};
    const near=(a,b,t)=>Math.abs(a[0]-b[0])<t&&Math.abs(a[1]-b[1])<t&&Math.abs(a[2]-b[2])<t;
    const mid=Math.round(c.height*0.5); const outer=at(2,mid);
    let L=0,R=c.width-1;
    while(L<c.width&&near(at(L,mid),outer,8))L+=1;
    while(R>L&&near(at(R,mid),outer,8))R-=1;
    const screen=R-L+1;
    const isPeri=([r,g,b])=>b>r+18&&b>g+10&&b>150;
    // The gate is the lowest periwinkle thing on the page: scan the bottom
    // fifth and take the widest span between the first and last periwinkle
    // pixel on a row.
    let best={w:0,y:0};
    for(let y=Math.round(c.height*0.80);y<c.height*0.865;y+=1){
      let a=-1,z=-1;
      for(let x=0;x<c.width;x+=1){ if(isPeri(at(x,y))){ if(a===-1)a=x; z=x; } }
      if(a!==-1&&z-a+1>best.w) best={w:z-a+1,y,a,z};
    }
    resolve({screen, gatePx:best.w, gatePctOfScreen:+((best.w/screen)*100).toFixed(1), atY:best.y});
  };
  img.src=src;
}), `data:image/jpeg;base64,${b64}`), null, 1));
await browser.close();
