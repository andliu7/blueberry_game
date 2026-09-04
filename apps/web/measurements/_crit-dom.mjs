import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
const CHROME = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c)=>c&&existsSync(c));
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args:["--hide-scrollbars"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.goto("http://localhost:5173/#/start/placement", { waitUntil: "networkidle0" });
await new Promise(r=>setTimeout(r,1500));
const out = await page.evaluate(() => {
  const res = [];
  document.querySelectorAll("body *").forEach((el)=>{
    const t = (el.textContent||"").trim();
    if (t === "Orgo II" && el.children.length === 0) {
      let p = el, chain = [];
      while (p && chain.length < 6) { chain.push(`${p.tagName.toLowerCase()}.${p.className||""}`); p = p.parentElement; }
      const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
      res.push({ chain, rect:[r.x|0,r.y|0,r.width|0,r.height|0], pos: cs.position, bg: cs.backgroundColor, border: cs.border });
    }
  });
  // full body outline
  const tree = [];
  const walk = (el, d) => { if (d>4) return; const r = el.getBoundingClientRect();
    tree.push(`${"  ".repeat(d)}${el.tagName.toLowerCase()}.${(el.className||"").toString().slice(0,60)} [${r.x|0},${r.y|0},${r.width|0}x${r.height|0}]`);
    for (const c of el.children) walk(c, d+1); };
  walk(document.body, 0);
  return { res, tree: tree.join("\n") };
});
console.log(JSON.stringify(out.res,null,2));
console.log(out.tree);
await browser.close();
