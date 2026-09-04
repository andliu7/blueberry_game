// Throwaway shot-taker for the cards builder, round 3 visual-fidelity pass.
// Takes a clean screenshot of each of the four faces WITHOUT interacting, so
// the resting composition is what gets compared against the goal images, and
// reports the geometry the round 3 critic measured. Delete after the run.
import { existsSync, mkdirSync } from "node:fs";
import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const DIST = path.join(process.cwd(), "dist");
const OUT = path.join(process.cwd(), "measurements", "_shots-cards");
mkdirSync(OUT, { recursive: true });
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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const NAMES = ["Grignard", "SN2", "Diels-Alder", "Williamson", "Ozonolysis", "Wittig", "Aldol"];
const cards = {}; const ids = [];
NAMES.forEach((name, i) => {
  const id = `probe${i}`; ids.push(id);
  cards[id] = { id, front: name, back: "back", why: "why", tags: [], source: { kind: "lesson", lessonId: "l", beatId: `b${i}` } };
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
      "personal:eas": { id: "personal:eas", title: "EAS Reactions", kind: "personal", cardIds: [] },
      "lesson:aromaticity": { id: "lesson:aromaticity", title: "Aromaticity", kind: "lesson", cardIds: [] },
    },
    review,
    pendingRecos: [],
  },
  dismissedCardIds: [],
};

const THEME = process.argv[2] ?? "light";
await page.evaluateOnNewDocument((blob, theme) => {
  localStorage.clear();
  localStorage.setItem("theme", theme);
  localStorage.setItem("blueberry.progress.v2", JSON.stringify({
    course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [],
    onboardingDone: true, displayName: "Probe", journal: [],
  }));
  localStorage.setItem("blueberry.cards.v1", blob);
}, JSON.stringify(stored), THEME);

const settle = (ms = 600) => new Promise((r) => setTimeout(r, ms));
const boot = async (hash) => {
  await page.goto(`http://localhost:${port}/#/${hash}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
  await settle();
};
const b = () => page.evaluate(() => {
  const r = (sel) => { const e = document.querySelector(sel); if (e === null) return null; const x = e.getBoundingClientRect(); return { y: Math.round(x.y), h: Math.round(x.height), w: Math.round(x.width), bottom: Math.round(x.bottom) }; };
  const cards = [...document.querySelectorAll(".fan__card")].map((c) => { const x = c.getBoundingClientRect(); return { y: Math.round(x.y), h: Math.round(x.height) }; });
  const stackKids = [...document.querySelectorAll(".tray-box__stack > span")].map((s) => { const x = s.getBoundingClientRect(); return { y: Math.round(x.y), w: Math.round(x.width) }; });
  return {
    scene: r(".deck-scene"),
    lifted: r(".fan__card--lifted"),
    fanTop: cards.length === 0 ? null : Math.min(...cards.map((c) => c.y)),
    fanBottom: cards.length === 0 ? null : Math.max(...cards.map((c) => c.y + c.h)),
    tray: r(".tray-box"),
    stack: r(".tray-box__stack"),
    stackKids,
    front: r(".tray-box__front"),
    frontMask: (() => { const e = document.querySelector(".tray-box__front"); return e === null ? null : getComputedStyle(e).maskImage.slice(0, 60); })(),
    hero: (() => { const e = document.querySelector(".hero-chip"); return e === null ? null : { bg: getComputedStyle(e).backgroundColor, ink: getComputedStyle(e).color }; })(),
  };
});

const shot = async (name) => { await page.screenshot({ path: path.join(OUT, `${name}-${THEME}.png`) }); };

const report = {};

await boot("cards");
report.landing = await b();
await shot("r3-landing");

await page.evaluate(() => { [...document.querySelectorAll("button")].find((x) => x.textContent.includes("Reaction Deck"))?.click(); });
await settle(700);
report.tray = await b();
await shot("r3-tray");

// The review face, reached through the tray's own front panel.
await page.evaluate(() => { document.querySelector(".tray-box__front")?.click(); });
await settle(600);
await page.evaluate(() => { [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Show the answer")?.click(); });
await settle(400);
await shot("r3-review");
report.review = await page.evaluate(() => {
  const chips = [...document.querySelectorAll(".chip3d--quiet, .chip3d--hard, .chip3d--go, .chip3d--easy")];
  return chips.map((c) => ({
    text: c.textContent.trim(),
    label: c.getAttribute("aria-label"),
    face: getComputedStyle(c).backgroundColor,
    w: Math.round(c.getBoundingClientRect().width),
    h: Math.round(c.getBoundingClientRect().height),
  }));
});

await page.goto("about:blank");
await boot("cards");
await page.evaluate(() => { [...document.querySelectorAll("button")].find((x) => x.textContent.includes("New deck"))?.click(); });
await settle(700);
await shot("r3-composer");
report.composer = await page.evaluate(() => {
  const save = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Save to deck");
  const r = (e) => { const x = e.getBoundingClientRect(); return { y: Math.round(x.y), h: Math.round(x.height), bottom: Math.round(x.bottom) }; };
  return {
    save: save === undefined ? null : { ...r(save), face: getComputedStyle(save).backgroundColor, shadow: getComputedStyle(save).boxShadow },
    doodlesInScheme: document.querySelectorAll(".compose-scheme svg[viewBox='0 0 52 44']").length,
    pencil: !!document.querySelector(".deck-chip svg[viewBox='0 0 22 22']"),
    deckChipText: document.querySelector(".deck-chip")?.textContent ?? "",
    tabbarTop: Math.round(document.querySelector(".tabbar")?.getBoundingClientRect().top ?? -1),
  };
});

console.log(JSON.stringify(report, null, 1));
await browser.close();
server.close();
