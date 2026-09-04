import { existsSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
const CHROME = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c)=>c&&existsSync(c));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
const [file, mode, frac] = [process.argv[2], process.argv[3], parseFloat(process.argv[4])];
const b64 = readFileSync(file).toString("base64");
const r = await page.evaluate(async (b64, mode, frac) => {
  const img = new Image(); img.src="data:image/png;base64,"+b64; await img.decode();
  const c=document.createElement("canvas"); c.width=img.width; c.height=img.height;
  const ctx=c.getContext("2d"); ctx.drawImage(img,0,0);
  const runs=[]; let prev=null, start=0;
  const N = mode==="col" ? img.height : img.width;
  const fixed = Math.round(frac * (mode==="col" ? img.width : img.height));
  for (let i=0;i<N;i++){
    const d = mode==="col" ? ctx.getImageData(fixed,i,1,1).data : ctx.getImageData(i,fixed,1,1).data;
    const hex=`#${[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`;
    if (prev===null){prev=hex;start=i;continue;}
    const p=[parseInt(prev.slice(1,3),16),parseInt(prev.slice(3,5),16),parseInt(prev.slice(5,7),16)];
    if (Math.abs(p[0]-d[0])+Math.abs(p[1]-d[1])+Math.abs(p[2]-d[2])>18){ if(i-start>=3) runs.push([start,i-1,prev]); prev=hex; start=i; }
  }
  if (N-start>=3) runs.push([start,N-1,prev]);
  return {size:[img.width,img.height], fixed, runs};
}, b64, mode, frac);
console.log(JSON.stringify(r.size), "at", r.fixed);
for (const [a,b,h] of r.runs) console.log(`${a}-${b} (${b-a+1}) ${h}  ${(a/(r.size[ mode==="col"?1:0])*100).toFixed(1)}%-${(b/(r.size[mode==="col"?1:0])*100).toFixed(1)}%`);
await browser.close();
