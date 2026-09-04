// Cards-only contrast probe, round 3. Throwaway; not a committed instrument.
//
// WHY IT EXISTS. The committed gate, measurements/contrast-audit.mjs, aborts
// on the `reward-first` economy route ("the drive did not reach the moment"),
// a celebration surface another builder is mid-flight on during this fan-out.
// That abort is the instrument doing its job, and it is not this piece's to
// fix or to edit around. So this probe runs the gate's OWN in-page collector,
// lifted verbatim out of the file at runtime rather than reimplemented, over
// the four cards faces only. Same algorithm, same floors, narrower route list.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

const HERE = path.join(process.cwd(), "measurements");
const src = await readFile(path.join(HERE, "contrast-audit.mjs"), "utf8");
const start = src.indexOf("function auditInPage(rootSelector) {");
const end = src.indexOf("\nconst browser = await puppeteer.launch");
if (start < 0 || end < 0) throw new Error("could not lift auditInPage out of contrast-audit.mjs");
const auditSource = src.slice(start, end);
// eslint-disable-next-line no-new-func
const auditInPage = new Function(`${auditSource}; return auditInPage;`)();

const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if (!existsSync(f) || p === "/") f = path.join(DIST, "index.html");
  try { const b = await readFile(f); res.writeHead(200, { "content-type": MIME[path.extname(f)] ?? "application/octet-stream" }); res.end(b); } catch { res.writeHead(404); res.end(); }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const NAMES = ["Grignard", "SN2", "Diels-Alder", "Williamson", "Ozonolysis", "Wittig", "Aldol"];
const cards = {}; const ids = [];
NAMES.forEach((name, i) => {
  const id = `probe${i}`; ids.push(id);
  cards[id] = { id, front: name, back: "The one carrying the leaving group.", why: "Conditions: hv, heat", tags: ["probe"], source: { kind: "lesson", lessonId: "l", beatId: `b${i}` } };
});
const review = {
  probe0: { cardId: "probe0", interval: 0, ease: 2.5, dueAt: new Date(NOW).toISOString(), lastRating: null },
  probe1: { cardId: "probe1", interval: 0.007, ease: 2.3, dueAt: new Date(NOW - 1000).toISOString(), lastRating: "again" },
  probe2: { cardId: "probe2", interval: 8, ease: 2.5, dueAt: new Date(NOW - DAY).toISOString(), lastRating: "good" },
  probe3: { cardId: "probe3", interval: 30, ease: 2.5, dueAt: new Date(NOW + 10 * DAY).toISOString(), lastRating: "good" },
  probe4: { cardId: "probe4", interval: 8, ease: 2.5, dueAt: new Date(NOW + 3 * DAY).toISOString(), lastRating: "good" },
  probe5: { cardId: "probe5", interval: 8, ease: 2.5, dueAt: new Date(NOW - DAY).toISOString(), lastRating: "good", suspended: true },
  probe6: { cardId: "probe6", interval: 0, ease: 2.5, dueAt: new Date(NOW).toISOString(), lastRating: null },
};
const stored = {
  snapshot: {
    cards,
    decks: {
      "personal:probe": { id: "personal:probe", title: "Reaction Deck", kind: "personal", cardIds: ids },
      "personal:carbonyls": { id: "personal:carbonyls", title: "Carbonyls", kind: "personal", cardIds: [] },
      "lesson:aromaticity": { id: "lesson:aromaticity", title: "Aromaticity", kind: "lesson", cardIds: [] },
    },
    review,
    pendingRecos: [],
  },
  dismissedCardIds: [],
};

const rows = [];
for (const theme of ["light", "dark"]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument((blob, mode) => {
    localStorage.clear();
    localStorage.setItem("theme", mode);
    localStorage.setItem("blueberry.progress.v2", JSON.stringify({
      course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [],
      onboardingDone: true, displayName: "Probe", journal: [],
    }));
    localStorage.setItem("blueberry.cards.v1", blob);
  }, JSON.stringify(stored), theme);
  await page.goto(`http://localhost:${port}/#/cards`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 700));

  const take = async (name) => {
    const found = await page.evaluate(auditInPage, null);
    if (found === null) throw new Error(`${name}: nothing to audit`);
    for (const f of found) rows.push({ ...f, where: `${name} (${theme})` });
  };

  await take("landing");

  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Reaction Deck"))?.click(); });
  await new Promise((r) => setTimeout(r, 500));
  await take("tray");
  await page.evaluate(() => { document.querySelectorAll(".fan__card")[2]?.click(); });
  await new Promise((r) => setTimeout(r, 400));
  await take("tray-lifted");

  await page.evaluate(() => { document.querySelector(".tray-box__front")?.click(); });
  await new Promise((r) => setTimeout(r, 500));
  await take("review-front");
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Show the answer"))?.click(); });
  await new Promise((r) => setTimeout(r, 400));
  await take("review-graded");

  await page.goto(`http://localhost:${port}/#/cards`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
  await new Promise((r) => setTimeout(r, 600));
  await page.evaluate(() => { [...document.querySelectorAll("button")].find((b) => b.textContent.includes("New deck"))?.click(); });
  await new Promise((r) => setTimeout(r, 600));
  await take("composer");
  await page.evaluate(() => { document.querySelector(".deck-chip")?.click(); });
  await new Promise((r) => setTimeout(r, 400));
  await take("composer-chooser");

  await page.close();
}

const fails = rows.filter((r) => r.pass === false);
const unresolved = rows.filter((r) => r.unresolved === true);
console.log(`pairs measured: ${rows.length}`);
console.log(`FAILING: ${fails.length}`);
for (const f of fails) console.log(`  ${f.where} ${f.kind} ${f.label ?? ""} ${f.text ?? ""} ${f.fg} on ${f.bg} = ${f.ratio?.toFixed?.(2)} floor ${f.floor}`);
console.log(`UNRESOLVED: ${unresolved.length}`);
for (const u of unresolved.slice(0, 20)) console.log(`  ${u.where} ${u.kind} ${u.label ?? ""}`);

await browser.close();
server.close();
