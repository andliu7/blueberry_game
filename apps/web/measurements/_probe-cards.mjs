// Throwaway probe for the cards builder: is CardsHome live on #/cards, does
// the fan fit 390px, is the mascot visible, is the empty mastery track
// neutral. Deleted after the run; not a committed instrument.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html":"text/html", ".js":"text/javascript", ".css":"text/css", ".json":"application/json", ".svg":"image/svg+xml", ".png":"image/png" };
const server = http.createServer(async (req,res)=>{
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if(!existsSync(f) || p==="/") f = path.join(DIST,"index.html");
  try { const b = await readFile(f); res.writeHead(200,{"content-type":MIME[path.extname(f)]??"application/octet-stream"}); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise(r=>server.listen(0,r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args:["--no-sandbox"] });
const page = await browser.newPage();
await page.setViewport({width:390,height:844,deviceScaleFactor:1});

// Seed: one personal deck of 7 cards spanning the scheduler states.
const DAY = 24*60*60*1000;
const NOW = Date.now();
const cards = {}; const ids = [];
for (let i=0;i<7;i+=1){ const id=`probe${i}`; ids.push(id); cards[id]={id,front:`Probe card ${i} front question`,back:"back",why:"why",tags:[],source:{kind:"lesson",lessonId:"l",beatId:`b${i}`}}; }
const review = {
  probe0: {cardId:"probe0",interval:0,ease:2.5,dueAt:new Date(NOW).toISOString(),lastRating:null},
  probe1: {cardId:"probe1",interval:0.007,ease:2.3,dueAt:new Date(NOW-1000).toISOString(),lastRating:"again"},
  probe2: {cardId:"probe2",interval:8,ease:2.5,dueAt:new Date(NOW-DAY).toISOString(),lastRating:"good"},
  probe3: {cardId:"probe3",interval:30,ease:2.5,dueAt:new Date(NOW+10*DAY).toISOString(),lastRating:"good"},
  probe4: {cardId:"probe4",interval:8,ease:2.5,dueAt:new Date(NOW+3*DAY).toISOString(),lastRating:"good"},
  probe5: {cardId:"probe5",interval:8,ease:2.5,dueAt:new Date(NOW-DAY).toISOString(),lastRating:"good",suspended:true},
  probe6: {cardId:"probe6",interval:0,ease:2.5,dueAt:new Date(NOW).toISOString(),lastRating:null},
};
const stored = { snapshot: { cards, decks: { "personal:probe": { id:"personal:probe", title:"Probe Deck", kind:"personal", cardIds: ids } }, review, pendingRecos: [] }, dismissedCardIds: [] };

await page.evaluateOnNewDocument((blob)=>{
  localStorage.clear();
  localStorage.setItem("theme","light");
  localStorage.setItem("blueberry.progress.v2", JSON.stringify({
    course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [],
    onboardingDone: true, displayName: "Probe", journal: [],
  }));
  localStorage.setItem("blueberry.cards.v1", blob);
}, JSON.stringify(stored));
await page.goto(`http://localhost:${port}/#/cards`, {waitUntil:"networkidle0"});
await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
await new Promise(r=>setTimeout(r,600));

const landing = await page.evaluate(()=>{
  const text = document.body.innerText;
  const hero = [...document.querySelectorAll("section")].find(s=>s.textContent.includes("Due today"));
  const mascot = hero ? hero.querySelector("svg") : null;
  const mascotVisible = mascot ? (r=>r.width>0&&r.height>0)(mascot.getBoundingClientRect()) : false;
  const bars = [...document.querySelectorAll(".mastery-bar")].map(b=>getComputedStyle(b).borderColor);
  return {
    dueToday: text.includes("Due today"),
    myDecks: text.includes("My decks"),
    newDeck: text.includes("+ New deck"),
    fromLessons: text.includes("From your lessons"),
    myMistakes: text.includes("My mistakes"),
    oldHub: text.includes("No cards yet") || text.includes("CSV"),
    mascotVisible,
    trackBorders: [...new Set(bars)],
  };
});

// Open the probe deck's tray.
await page.evaluate(()=>{
  const btn = [...document.querySelectorAll("button")].find(b=>b.textContent.includes("Probe Deck"));
  btn?.click();
});
await new Promise(r=>setTimeout(r,700));
const tray = await page.evaluate(()=>{
  const fan = document.querySelector(".fan");
  const cards = [...document.querySelectorAll(".fan__card")].map(el=>{
    const r = el.getBoundingClientRect();
    return { left: Math.round(r.left), right: Math.round(r.right), cls: [...el.classList].filter(c=>c.startsWith("fan__card--")).join(","), label: el.getAttribute("aria-label") };
  });
  const badges = [...document.querySelectorAll(".state-badge")].map(el=>[...el.classList].find(c=>c.startsWith("state-badge--")));
  return {
    fanWidth: fan ? Math.round(fan.getBoundingClientRect().width) : null,
    viewport: window.innerWidth,
    scrollOverflow: document.documentElement.scrollWidth > window.innerWidth,
    cards, badges,
    trayLabel: document.querySelector(".tray")?.innerText ?? null,
    pausedNote: document.body.innerText.includes("paused card"),
  };
});

console.log(JSON.stringify({landing, tray}, null, 1));

const SHOTS = process.env.SHOT_DIR;
if (SHOTS) {
  await page.screenshot({ path: `${SHOTS}/cards-tray.png` });
  // Lift a card, shoot, then back to landing.
  await page.evaluate(()=>{ [...document.querySelectorAll(".fan__card")][3]?.click(); });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({ path: `${SHOTS}/cards-tray-lifted.png` });
  await page.evaluate(()=>{ [...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Back to your decks")?.click(); });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({ path: `${SHOTS}/cards-landing.png` });
  await page.evaluate(()=>{ [...document.querySelectorAll("button")].find(b=>b.textContent.includes("+ New deck"))?.click(); });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({ path: `${SHOTS}/cards-composer.png` });
  await page.evaluate(()=>{ [...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Back to your decks")?.click(); });
  await new Promise(r=>setTimeout(r,300));
  await page.evaluate(()=>{ [...document.querySelectorAll("button")].find(b=>b.textContent.trim()==="Review")?.click(); });
  await new Promise(r=>setTimeout(r,500));
  await page.screenshot({ path: `${SHOTS}/cards-review.png` });
  await page.evaluate(()=>{ [...document.querySelectorAll("button")].find(b=>b.getAttribute("aria-label")==="Reveal the answer")?.click(); });
  await new Promise(r=>setTimeout(r,400));
  await page.screenshot({ path: `${SHOTS}/cards-review-revealed.png` });
}
await browser.close();
server.close();
