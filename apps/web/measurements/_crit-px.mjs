import { existsSync, readFileSync } from "node:fs";
import puppeteer from "puppeteer-core";
const CHROME = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c)=>c&&existsSync(c));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
const page = await browser.newPage();
const files = JSON.parse(process.argv[2]);
const out = {};
for (const [name, spec] of Object.entries(files)) {
  const b64 = readFileSync(spec.path).toString("base64");
  const r = await page.evaluate(async (b64, pts) => {
    const img = new Image();
    img.src = "data:image/png;base64," + b64;
    await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
    const ctx = c.getContext("2d"); ctx.drawImage(img,0,0);
    const res = { size: [img.width, img.height] };
    for (const [label, fx, fy] of pts) {
      const x = Math.round(fx*img.width), y = Math.round(fy*img.height);
      const d = ctx.getImageData(x,y,1,1).data;
      res[label] = `#${[d[0],d[1],d[2]].map(v=>v.toString(16).padStart(2,"0")).join("")} @(${x},${y})`;
    }
    return res;
  }, b64, spec.pts);
  out[name] = r;
}
console.log(JSON.stringify(out,null,2));
await browser.close();
