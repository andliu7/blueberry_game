import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { installSeed } from "./economy-moments.mjs";
const OUT = path.join(process.cwd(), "measurements", "_critic");
mkdirSync(OUT, { recursive: true });
const now = Date.now();
const ago = (m) => new Date(now - m * 60000).toISOString();
const ids = ["u1-allylic","u1-12v14","u1-kvt","u1-x2","u2-huckel","u2-annulene","u2-hetero","u2-charged","u2-nmr","u3-arenium","u3-halo"];
const seed = ids.map((id,i) => ({ kind: "node_cleared", at: ago(600 - i*20), tz: "America/New_York", nodeId: id, flawless: true, xp: 20 }));
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await installSeed(page, "light", seed, { course: "orgo_2", startTopics: [], onboardingDone: true });
await page.goto("http://localhost:5173/#/pathway", { waitUntil: "networkidle0" });
await new Promise((r)=>setTimeout(r,2500));
const rep = await page.evaluate(() => {
  const st={}; document.querySelectorAll(".path-node").forEach(n=>{const c=[...n.classList].filter(x=>x.startsWith("path-node--")); st[c.join(" ")]=(st[c.join(" ")]||0)+1;});
  const done = document.querySelector(".path-node--done");
  const cs = done ? getComputedStyle(done) : null;
  const face = done ? getComputedStyle(done.querySelector(".path-node__face")) : null;
  return { classes: st, doneEdge: cs?.backgroundColor, doneBorder: cs?.borderColor, doneShadow: cs?.boxShadow, faceBg: face?.backgroundColor, faceColor: face?.color };
});
console.log(JSON.stringify(rep,null,1));
for (let i=0;i<4;i++){ if(i>0){await page.evaluate(y=>window.scrollTo({top:y}), i*844*0.8); await new Promise(r=>setTimeout(r,900));} await page.screenshot({path: path.join(OUT,`green-${i}.png`)}); }
await browser.close();
