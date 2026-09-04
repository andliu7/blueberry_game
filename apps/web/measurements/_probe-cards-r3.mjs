// Throwaway probe for the cards builder, round 3. Measures exactly the things
// the round 2 critic measured, so the same ruler answers. Not a committed
// instrument; delete after the run.
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";

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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const NAMES = ["Grignardsis", "SN2", "Diels-Alder", "Williamson", "Ozonolysis", "Wittig", "Aldol"];
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

await page.evaluateOnNewDocument((blob) => {
  localStorage.clear();
  localStorage.setItem("theme", "light");
  localStorage.setItem("blueberry.progress.v2", JSON.stringify({
    course: "orgo_2", startTopics: [], lessons: {}, attemptedProblems: [],
    onboardingDone: true, displayName: "Probe", journal: [],
  }));
  localStorage.setItem("blueberry.cards.v1", blob);
}, JSON.stringify(stored));

const px = (n) => Math.round(n);
const box = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };

await page.goto(`http://localhost:${port}/#/cards`, { waitUntil: "networkidle0" });
await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
await new Promise((r) => setTimeout(r, 600));

await page.screenshot({ path: "measurements/_shots-cards/landing.png" });
const landing = await page.evaluate(() => {
  const b = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) }; };
  const tiles = [...document.querySelectorAll(".chip3d--card")];
  const bars = [...document.querySelectorAll(".mastery-bar")];
  const sketches = tiles.map((t) => { const s = t.querySelector("svg"); return s ? s.innerHTML.slice(0, 60) : null; });
  const hero = [...document.querySelectorAll("section")].find((s) => s.textContent.includes("Due today"));
  const review = hero ? hero.querySelector("button") : null;
  return {
    scrollHeight: document.documentElement.scrollHeight,
    tileFace: tiles[0] ? getComputedStyle(tiles[0]).backgroundColor : null,
    tileRadius: tiles[0] ? getComputedStyle(tiles[0]).borderRadius : null,
    tileShadow: tiles[0] ? getComputedStyle(tiles[0]).boxShadow : null,
    barTrack: bars[0] ? getComputedStyle(bars[0]).backgroundColor : null,
    barBorder: bars[0] ? getComputedStyle(bars[0]).borderTopWidth + " " + getComputedStyle(bars[0]).borderTopColor : null,
    reviewRadius: review ? getComputedStyle(review).borderRadius : null,
    reviewBox: review ? b(review) : null,
    distinctSketches: new Set(sketches).size + " of " + sketches.length,
    ringedBadges: document.querySelectorAll(".rounded-full.border svg[viewBox='0 0 12 14']").length,
  };
});

// Deck tray
await page.evaluate(() => {
  const tile = [...document.querySelectorAll("button")].find((b) => b.textContent.includes("Reaction Deck"));
  tile?.click();
});
await new Promise((r) => setTimeout(r, 500));
const tray = await page.evaluate(() => {
  const b = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
  const box = document.querySelector(".tray-box");
  const stack = document.querySelector(".tray-box__stack");
  const cards = [...document.querySelectorAll(".fan__card")];
  const names = cards.map((c) => { const n = c.querySelector(".fan__name"); return { text: n?.textContent, w: n ? Math.round(n.getBoundingClientRect().width) : 0, cardW: Math.round(c.getBoundingClientRect().width), padL: getComputedStyle(c).paddingLeft, border: getComputedStyle(c).borderLeftWidth }; });
  return {
    scrollHeight: document.documentElement.scrollHeight,
    headings: [...document.querySelectorAll("h1,h2")].map((h) => h.textContent),
    trayBox: box ? b(box) : null,
    trayFace: box ? getComputedStyle(box).backgroundColor : null,
    stackBox: stack ? b(stack) : null,
    stackEdges: stack ? stack.children.length : 0,
    cavity: !!document.querySelector(".tray-box__cavity"),
    notch: !!document.querySelector(".tray-box__notch"),
    frontIsButton: document.querySelector(".tray-box__front")?.tagName,
    cardBorders: cards.map((c) => getComputedStyle(c).borderTopWidth + " " + getComputedStyle(c).borderTopColor),
    cardFaces: [...new Set(cards.map((c) => getComputedStyle(c).backgroundColor))],
    names,
    fanSketches: new Set(cards.map((c) => c.querySelector("svg")?.innerHTML.slice(0, 60))).size + " of " + cards.length,
    paragraphs: [...document.querySelectorAll("p")].map((p) => p.textContent).filter((t) => t && t.length > 0),
  };
});

// Lift a card, check the glow has no ring
const lifted = await page.evaluate(() => {
  const card = document.querySelectorAll(".fan__card")[2];
  card?.click();
  return null;
});
await new Promise((r) => setTimeout(r, 400));
await page.screenshot({ path: "measurements/_shots-cards/tray.png" });
const liftedStyle = await page.evaluate(() => {
  const c = document.querySelector(".fan__card--lifted");
  return c ? { shadow: getComputedStyle(c).boxShadow, name: c.textContent } : null;
});

// Composer
await page.reload({ waitUntil: "networkidle0" });
await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20000 });
await new Promise((r) => setTimeout(r, 700));
const opened = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")].find((x) => x.textContent.includes("New deck"));
  if (b === undefined) return "no button";
  b.click();
  return "clicked";
});
await new Promise((r) => setTimeout(r, 700));
const composer = await page.evaluate(() => {
  const b = (el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height), bottom: Math.round(r.bottom) }; };
  const save = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Save to deck");
  const bar = document.querySelector(".tabbar");
  const pill = document.querySelector(".seg-pill");
  const cardEl = document.querySelector(".compose-card");
  const previews = [...document.querySelectorAll(".side-fan__card")];
  return {
    scrollHeight: document.documentElement.scrollHeight,
    viewport: window.innerHeight,
    saveBox: save ? b(save) : null,
    saveRadius: save ? getComputedStyle(save).borderRadius : null,
    saveFace: save ? getComputedStyle(save).backgroundColor : null,
    tabbarTop: bar ? Math.round(bar.getBoundingClientRect().top) : null,
    pillBg: pill ? getComputedStyle(pill).backgroundColor : null,
    pillBorder: pill ? getComputedStyle(pill).borderTopColor : null,
    composeFace: cardEl ? getComputedStyle(cardEl).backgroundColor : null,
    composeBorder: cardEl ? getComputedStyle(cardEl).borderTopWidth + " " + getComputedStyle(cardEl).borderTopColor : null,
    schemeCells: document.querySelectorAll(".scheme-cell").length,
    hasArrow: !!document.querySelector(".compose-scheme svg"),
    previewTones: previews.map((p) => getComputedStyle(p).backgroundColor + " / " + getComputedStyle(p).borderTopColor),
    saveIntoBlock: document.body.innerText.includes("Save into"),
    deckChip: !!document.querySelector(".deck-chip"),
  };
});

await page.screenshot({ path: "measurements/_shots-cards/composer.png" });
// The save-to-deck motion: fill the three sides, press Save, look for the
// ghost mid-flight and the +1 badge on the deck chip.
await page.evaluate(() => {
  const cells = [...document.querySelectorAll(".scheme-cell")];
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  const texts = ["cyclopentene + NBS", "hv, heat", "3-bromocyclopentene"];
  cells.forEach((c, i) => { setter.call(c, texts[i]); c.dispatchEvent(new Event("input", { bubbles: true })); });
});
await new Promise((r) => setTimeout(r, 300));
const beforeSave = await page.evaluate(() => {
  const save = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Save to deck");
  return { disabled: save?.disabled, face: save ? getComputedStyle(save).backgroundColor : null };
});
await page.evaluate(() => { [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Save to deck")?.click(); });
await new Promise((r) => setTimeout(r, 200));
const flight = await page.evaluate(() => {
  const g = document.querySelector(".save-flight");
  const badge = document.querySelector(".deck-chip__badge");
  return {
    ghost: g ? { anim: getComputedStyle(g).animationName, w: Math.round(g.getBoundingClientRect().width) } : null,
    badge: badge ? badge.textContent : null,
    status: document.querySelector('[role="status"]')?.textContent ?? null,
  };
});
await page.screenshot({ path: "measurements/_shots-cards/composer-flight.png" });
await new Promise((r) => setTimeout(r, 1000));
const afterFlight = await page.evaluate(() => ({
  ghost: !!document.querySelector(".save-flight"),
  badge: !!document.querySelector(".deck-chip__badge"),
}));

console.log(JSON.stringify({ landing, tray, liftedStyle, opened, composer, beforeSave, flight, afterFlight }, null, 1));
await browser.close();
server.close();
