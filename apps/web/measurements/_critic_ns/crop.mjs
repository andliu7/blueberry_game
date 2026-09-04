import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const b = await puppeteer.launch({executablePath:chrome, headless:"new", args:["--no-sandbox"]});
const p = await b.newPage();
const args = JSON.parse(process.argv[2]);
const d = async (f)=> "data:image/png;base64," + (await readFile(f)).toString("base64");
const srcs = {};
for (const a of args) srcs[a.file] ??= await d(a.file);
await p.setContent(Object.entries(srcs).map(([f,u],i)=>`<img id="i${i}" src="${u}">`).join(""));
const keys = Object.keys(srcs);
await p.evaluate(()=>Promise.all([...document.images].map(i=>i.decode())));
for (const a of args) {
  const id = "i"+keys.indexOf(a.file);
  const buf = await p.evaluate((id,x,y,w,h,s)=>{const img=document.getElementById(id);const c=document.createElement("canvas");c.width=w*s;c.height=h*s;const g=c.getContext("2d");g.imageSmoothingEnabled=false;g.drawImage(img,x,y,w,h,0,0,w*s,h*s);return c.toDataURL("image/png");}, id,a.x,a.y,a.w,a.h,a.s||1);
  await writeFile(a.out, Buffer.from(buf.split(",")[1],"base64"));
}
const pxs = await p.evaluate((args,keys)=>{
  const out={};
  for(const a of args){ if(!a.px) continue; const id="i"+keys.indexOf(a.file); const img=document.getElementById(id); const c=document.createElement("canvas");c.width=img.naturalWidth;c.height=img.naturalHeight;const g=c.getContext("2d");g.drawImage(img,0,0);
    for(const [n,X,Y] of a.px){const d=g.getImageData(X,Y,1,1).data; out[n]=`#${[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("")}`;} }
  return out;
}, args, keys);
console.log(JSON.stringify(pxs,null,1));
await b.close();
