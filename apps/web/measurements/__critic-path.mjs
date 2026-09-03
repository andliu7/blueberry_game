import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
const OUT = "C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad";
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe",`${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });

const now = new Date().toISOString();
const cleared = (id, nodeKind="reaction") => ({kind:"node_cleared", nodeId:id, nodeKind, flawless:false, stepsInOneSitting:1, spine:true, difficulty:2, at:now, tz:"America/New_York"});

async function shoot(name, journal, actions) {
  const page = await browser.newPage();
  await page.setViewport({width:390,height:844,deviceScaleFactor:2});
  await page.evaluateOnNewDocument((j) => {
    localStorage.clear();
    localStorage.setItem("theme", "light");
    localStorage.setItem("blueberry.progress.v2", JSON.stringify({
      course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [],
      onboardingDone: true, displayName: null, journal: j,
    }));
  }, journal);
  await page.goto("http://localhost:5173/#/path", {waitUntil:"networkidle0"});
  await new Promise(r=>setTimeout(r,2500));
  if (actions) await actions(page);
  await page.screenshot({path: `${OUT}/${name}.png`});
  await page.close();
}

// 1 fresh top
await shoot("path-fresh-top", []);
// 2 fresh scrolled to fork (side loop + diamond)
await shoot("path-fresh-fork", [], async p => {
  await p.evaluate(() => { document.querySelector(".path-fork")?.scrollIntoView({block:"center"}); });
  await new Promise(r=>setTimeout(r,900));
});
// 3 fresh checkpoint / gate (unit 2)
await shoot("path-fresh-gate", [], async p => {
  await p.evaluate(() => { document.querySelector(".path-gatenode")?.scrollIntoView({block:"center"}); });
  await new Promise(r=>setTimeout(r,900));
});
// 4 progress: first node cleared -> done green + trail
await shoot("path-done-top", [cleared("u1-allylic","reaction")]);
// 5 pressed state on current node
await shoot("path-pressed", [], async p => {
  const el = await p.$(".path-node--current");
  if (el) {
    const b = await el.boundingBox();
    await p.mouse.move(b.x+b.width/2, b.y+b.height/2);
    await p.mouse.down();
    await new Promise(r=>setTimeout(r,150));
  }
});
// 6 reduced motion current node
await shoot("path-reduced", [], async p => {
  await p.emulateMediaFeatures([{name:"prefers-reduced-motion", value:"reduce"}]);
  await new Promise(r=>setTimeout(r,600));
});
await browser.close();
console.log("done");
