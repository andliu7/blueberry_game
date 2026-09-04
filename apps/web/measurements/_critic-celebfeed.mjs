import puppeteer from "puppeteer-core";
import { existsSync } from "node:fs";
import path from "node:path";
import { P2_SEEDS, openSeeded, driveReward, sleep, buttonByText, press } from "./economy-moments.mjs";

const CHROME = [process.env.CHROME_PATH,"C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find((c) => c !== undefined && existsSync(c));
const OUT = "C:/Users/zeusa/AppData/Local/Temp/claude/C--Users-zeusa-downloads-Projects-blueberry-game/8d213512-4692-46a4-8b7a-fae58bd99369/scratchpad/shots";
const origin = "http://localhost:5173";
const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1", "--hide-scrollbars"] });
const page = await openSeeded(browser, { origin, viewport: PHONE, theme: "light", hash: "?serveAll=1#/start/lesson", journal: P2_SEEDS.streak, stored: { onboardingDone: true, course: "orgo_2" } });

for (let i = 0; i < 6; i += 1) {
  const has = await page.$('input[aria-label="Numeric answer"]');
  if (has !== null) break;
  const btns = await page.evaluate(() => [...document.querySelectorAll("button")].filter(b=>b.getClientRects().length>0).map(b=>b.textContent?.trim()));
  console.log("step", i, "buttons:", btns.join(" | ").slice(0,200));
  const pick = await page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => x.getClientRects().length > 0 && /^(Casual|Right at the start)/.test(x.textContent?.trim() ?? ""));
    if (b === undefined) return null;
    const r = b.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (pick !== null) { await press(page, pick, "pick goal"); await sleep(300); }
  const p = (await buttonByText(page, "Continue")) ?? (await buttonByText(page, "Take me in"));
  if (p === null) break;
  await press(page, p, "advance");
  await sleep(800);
}

const tap = async (point) => { if (point === null) return false; await page.mouse.move(point.x, point.y); await page.mouse.down(); await sleep(40); await page.mouse.up(); await sleep(450); return true; };
await tap(await page.evaluate(() => { const n = document.querySelector('[data-node-state="current"], [data-node-kind]'); if (n === null) return null; n.scrollIntoView({block:"center",behavior:"instant"}); const r = n.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }));
await tap(await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((x)=>x.getClientRects().length>0 && !x.disabled && /^(start|practice)/i.test((x.textContent??"").trim())); if (b===undefined) return null; b.scrollIntoView({block:"center",behavior:"instant"}); const r=b.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; }));
for (let step = 0; step < 40; step += 1) {
  if ((await page.$("[data-reward]")) !== null) break;
  const t = await page.evaluate(() => { const scope = document.querySelector("main") ?? document.body; const vis = [...scope.querySelectorAll("button")].filter(b=>b.getClientRects().length>0 && !b.disabled); const fwd = vis.find(b=>/^(check|continue|next|finish|start|got it|claim)/i.test((b.textContent??"").trim())); const pick = fwd ?? vis.find(b=>(b.textContent??"").trim().length>0); if (pick===undefined) return null; pick.scrollIntoView({block:"center",behavior:"instant"}); const r=pick.getBoundingClientRect(); return {x:r.left+r.width/2,y:r.top+r.height/2}; });
  if (t === null) break;
  await page.mouse.move(t.x,t.y); await page.mouse.down(); await sleep(40); await page.mouse.up(); await sleep(400);
}
console.log("reached:", (await page.$("[data-reward]")) !== null);
await sleep(2700);
await page.screenshot({ path: path.join(OUT, "reward-light.png") });
await browser.close();
