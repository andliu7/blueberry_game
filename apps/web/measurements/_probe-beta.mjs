import puppeteer from "puppeteer-core";
const EXE = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const b = await puppeteer.launch({ executablePath: EXE, headless: "new", args: ["--no-sandbox"] });
const p = await b.newPage();
await p.setViewport({ width: 393, height: 852, deviceScaleFactor: 2 });
await p.goto("http://localhost:5174/?flags=unlockall,infinitecharge#/pathway", { waitUntil: "networkidle2", timeout: 30000 });
await new Promise(r => setTimeout(r, 2500));
const out = await p.evaluate(() => {
  const nodes = [...document.querySelectorAll(".path-node")];
  const cls = (n) => (n.className.baseVal ?? n.className ?? "").toString();
  const count = (frag) => nodes.filter(n => cls(n).includes(frag)).length;
  const doneTrail = document.querySelectorAll(".path-trail__fill--done").length;
  const raw = localStorage.getItem("blueberry.progress");
  let kinds = {};
  try { const j = JSON.parse(raw)?.journal ?? []; for (const e of j) kinds[e.kind] = (kinds[e.kind]||0)+1; } catch {}
  return { nodes: nodes.length, done: count("--done"), locked: count("--locked"),
    current: count("--current"), doneTrailSegments: doneTrail, storedJournalKinds: kinds,
    hasStored: raw !== null };
});
console.log(JSON.stringify(out, null, 1));
await b.close();
