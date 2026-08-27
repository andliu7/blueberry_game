/**
 * Lossless frame bursts of the economy and mascot pieces, for the gauntlet
 * loop's blind comparison against docs/reference/competitors/duolingo-live/.
 *
 * Modelled on capture-trainer.mjs: serves apps/web/dist over a local static
 * server, drives the built app with real pointer events through puppeteer-core,
 * writes PNG (never JPEG, for the reason that file records), in both themes and
 * at two viewports, desktop 1280x900 at 2x and phone 390x844 at 3x. Each moment
 * is a burst of four frames at 0, 400, 900 and 2500 ms after the press that
 * triggers it, the same cadence the bar's captures use, so a critic compares
 * like with like.
 *
 * ONE HOOK, AND WHY. Every moment below is reached by real clicks and real
 * grading from a fresh account, with no journal seeded. But the lesson player
 * serves only major product, reagent and structure questions today (the
 * SERVED_KINDS gate in src/tabs/courses/CoursesTab.tsx), and no topic has
 * three of those, so the combo interstitial at three in a row is unreachable
 * through the gate. `?serveAll=1` lifts the gate so the intro lesson at
 * #/start/lesson opens on the corpus's first topic, gas laws, whose three
 * authored numeric questions are the shortest real path to a run of three.
 * The hook changes which authored problems are served, never how one is
 * graded or what Bloom does about it. If a later piece needs an account in a
 * state clicks cannot reach, it seeds localStorage key blueberry.progress.v2
 * with an EconomyEvent journal (see src/app/progress.ts) and says so here.
 *
 * Usage, from apps/web:
 *   npm run build
 *   node measurements/capture-economy.mjs --piece P1 --out measurements/gauntlet-economy/P1-r1/self-check
 *
 * Exits nonzero if any moment did not appear: a shot of the wrong state is
 * never handed to a critic.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const FRAMES_MS = [0, 400, 900, 2500];
const VIEWPORTS = {
  desktop: { width: 1280, height: 900, deviceScaleFactor: 2 },
  phone: { width: 390, height: 844, deviceScaleFactor: 3 },
};
const THEMES = ["light", "dark"];

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index === -1 ? fallback : (process.argv[index + 1] ?? fallback);
}
const PIECE = argValue("--piece", "P1");
const OUT = path.resolve(process.cwd(), argValue("--out", `measurements/gauntlet-economy/${PIECE}/latest`));

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv !== undefined && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error("No Chrome or Edge executable found. Set CHROME_PATH to a Chromium browser executable.");
  }
  return found;
}

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  throw new Error("dist/index.html not found. Run `npm run build` first; this captures the built app.");
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.join(distDir, file);
  if (!target.startsWith(distDir) || !existsSync(target)) {
    response.writeHead(404).end("not found");
    return;
  }
  const body = await readFile(target);
  response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
  response.end(body);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A fresh page on a hash route, in a theme, with nothing stored. */
async function open(browser, viewport, theme, hash) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.evaluateOnNewDocument((wanted) => {
    localStorage.clear();
    localStorage.setItem("theme", wanted);
    document.documentElement.classList.toggle("dark", wanted === "dark");
  }, theme);
  await page.goto(`${origin}/${hash}`, { waitUntil: "networkidle0" });
  return page;
}

/** The centre of the first element matching `selector`, or null. */
async function centre(page, selector) {
  const handle = await page.$(selector);
  if (handle === null) return null;
  const box = await handle.boundingBox();
  if (box === null) return null;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** The centre of the first visible button whose text is exactly `text`. */
async function buttonByText(page, text) {
  const point = await page.evaluate((wanted) => {
    const buttons = [...document.querySelectorAll("button")];
    const match = buttons.find((button) => button.textContent?.trim() === wanted && button.getClientRects().length > 0);
    if (match === undefined) return null;
    // On the phone the Continue sits under the explanation, below the fold.
    match.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = match.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, text);
  return point;
}

/** A real press: down, a frame, up. Returns the press time for the burst clock. */
async function press(page, point, label) {
  if (point === null) {
    const seen = await page.evaluate(() => [...document.querySelectorAll("button")].map((b) => `${b.textContent?.trim()}${b.getClientRects().length > 0 ? "" : " (hidden)"}`));
    throw new Error(`nothing to press for "${label}". buttons on screen: ${seen.join(" | ")}`);
  }
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  const at = Date.now();
  await sleep(40);
  await page.mouse.up();
  return at;
}

/** Four PNGs at the burst cadence, measured from `startedAt`. Returns actual offsets. */
async function burst(page, dir, name, startedAt) {
  const actual = [];
  for (const wanted of FRAMES_MS) {
    const wait = startedAt + wanted - Date.now();
    if (wait > 0) await sleep(wait);
    const before = Date.now() - startedAt;
    await page.screenshot({ path: path.join(dir, `${name}-${String(wanted).padStart(4, "0")}ms.png`), type: "png" });
    actual.push({ wanted, at: before });
  }
  return actual;
}

/** Type a numeric answer and its unit into the lesson's numeric form. */
async function typeAnswer(page, value, unit) {
  await page.waitForSelector('input[aria-label="Numeric answer"]', { timeout: 10_000 });
  await page.click('input[aria-label="Numeric answer"]');
  await page.type('input[aria-label="Numeric answer"]', value);
  await page.click('input[aria-label="Unit"]');
  await page.type('input[aria-label="Unit"]', unit);
}

/**
 * The intro lesson's three gas law questions with their authored answers
 * (packages/curriculum/src/corpus/gasLaws.ts). The wrong answer is one of the
 * authored distractors, so the wrong moment shows a Tier 2 card rather than
 * the Tier 3 tail.
 */
const INTRO = [
  { value: "2.00", unit: "atm", wrong: "0.500" },
  { value: "5.60", unit: "L", wrong: "22.4" },
  { value: "0.400", unit: "atm", wrong: "0.800" },
];

async function captureP1(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const results = [];

  // 1. Correct: answer the first question right.
  {
    const page = await open(browser, viewport, theme, "?serveAll=1#/start/lesson");
    await typeAnswer(page, INTRO[0].value, INTRO[0].unit);
    const at = await press(page, await buttonByText(page, "Check"), "Check");
    const frames = await burst(page, dir, `${tag}-correct`, at);
    const reached = await page.$('[data-reaction="correct"]');
    results.push({ moment: "correct", reached: reached !== null, frames });
    await page.close();
  }

  // 2. Wrong: the authored distractor for the first question.
  {
    const page = await open(browser, viewport, theme, "?serveAll=1#/start/lesson");
    await typeAnswer(page, INTRO[0].wrong, INTRO[0].unit);
    const at = await press(page, await buttonByText(page, "Check"), "Check");
    const frames = await burst(page, dir, `${tag}-wrong`, at);
    const reached = await page.$('[data-reaction="wrong"]');
    results.push({ moment: "wrong", reached: reached !== null, frames });
    await page.close();
  }

  // 3. Combo: three right in a row, then Next brings the interstitial.
  {
    const page = await open(browser, viewport, theme, "?serveAll=1#/start/lesson");
    for (let i = 0; i < INTRO.length; i += 1) {
      await typeAnswer(page, INTRO[i].value, INTRO[i].unit);
      await press(page, await buttonByText(page, "Check"), `Check ${i + 1}`);
      await page.waitForSelector('[data-reaction="correct"]', { timeout: 5_000 });
      if (i < INTRO.length - 1) {
        await press(page, await buttonByText(page, "Next"), `Next ${i + 1}`);
        await sleep(250);
      }
    }
    const at = await press(page, await buttonByText(page, "Finish lesson"), "Finish lesson");
    const frames = await burst(page, dir, `${tag}-combo`, at);
    const reached = await page.$('[data-combo="3"]');
    results.push({ moment: "combo", reached: reached !== null, frames });
    await page.close();
  }

  return results;
}

const PIECES = { P1: captureP1 };
const capture = PIECES[PIECE];
if (capture === undefined) throw new Error(`unknown piece ${PIECE}; known: ${Object.keys(PIECES).join(", ")}`);

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--font-render-hinting=none"],
});

await mkdir(OUT, { recursive: true });
const report = [];
try {
  for (const viewportName of Object.keys(VIEWPORTS)) {
    for (const theme of THEMES) {
      const results = await capture(browser, viewportName, theme, OUT);
      report.push({ viewport: viewportName, theme, results });
    }
  }
} finally {
  await browser.close();
  server.close();
}

let missed = 0;
for (const entry of report) {
  for (const result of entry.results) {
    const status = result.reached ? "reached" : "NOT REACHED";
    if (!result.reached) missed += 1;
    const offsets = result.frames.map((frame) => `${frame.at}`).join("/");
    console.log(`${entry.viewport.padEnd(7)} ${entry.theme.padEnd(5)} ${result.moment.padEnd(7)} ${status}  frames at ${offsets} ms`);
  }
}
await writeFile(path.join(OUT, "capture.json"), `${JSON.stringify({ piece: PIECE, viewports: VIEWPORTS, frames: FRAMES_MS, report }, null, 2)}\n`);
if (missed > 0) {
  console.error(`${missed} moment(s) did not appear. The shots are not judgeable; fix the drive, do not judge these.`);
  process.exit(1);
}
