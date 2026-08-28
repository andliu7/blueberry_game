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
 * P3, THE HEADER HUD, SEEDS THE JOURNAL TOO, and it has no choice: every
 * number in that header is a function of history, and a five day streak is
 * five days. Its seed and the arithmetic behind each of the four numbers are
 * in economy-moments.mjs beside the drives. It is also the first seed to set
 * the stored COURSE, because mastery rank awards pay diamonds and a snapshot
 * with no course denominator reports a different balance: 262 against 137, on
 * this exact journal.
 *
 * P2, THE REWARD MOMENT, SEEDS THE JOURNAL, and here is why. The moment is
 * reached by real clicks (three right answers, Finish lesson, Continue past
 * the combo interstitial), but two of its beats depend on history no click in
 * one session can create. "first" seeds nothing: the account has never earned
 * a diamond, so the long first-diamond catch plays. "streak" seeds a casual
 * daily goal and one concept clear on each of the six previous days, so
 * today's clear is the seventh counted day: the streak lights, the 7 day
 * milestone card shows, and the receipt carries the milestone's 75 diamonds
 * and the daily goal's 10 XP. The seed is an EconomyEvent journal and nothing
 * else; every number on the screen still comes out of deriveEconomy.
 *
 * BOTH P2 SEEDS ALSO UNLOCK THE INTRO COURSE, and this one is a workaround
 * that is recorded rather than hidden. Mastery is the decayed strength of
 * every UNLOCKED node (derive.ts, modelScoreAt), and a node is unlocked by a
 * node_started or node_cleared event. The web app never journals
 * node_started today, so a student's very first clear is one node of one,
 * which is 100 percent mastery, which pays every rank badge at once: the
 * real click path's first receipt reads "+681 diamonds, New rank: Exam
 * Ready". That is an economy package and pathway problem, not a reward
 * moment one, and it is reported with this piece. The seed puts eight of
 * the intro course's other topics into the journal as started intro nodes
 * (charge cost 0, no XP, no diamonds), which is the state the pathway will
 * put a real account in once it journals unlocks. "first" therefore still
 * has earned 0 diamonds before the lesson, so the long catch plays, and the
 * capture refuses a "first" frame whose receipt carries a rank line.
 *
 * Usage, from apps/web:
 *   npm run build
 *   node measurements/capture-economy.mjs --piece P1 --out measurements/gauntlet-economy/P1-r1/self-check
 *   node measurements/capture-economy.mjs --piece P2 --out measurements/gauntlet-economy/P2-r1/self-check
 *   node measurements/capture-economy.mjs --piece P3 --out measurements/gauntlet-economy/P3-r1/self-check
 *
 * Exits nonzero if any moment did not appear: a shot of the wrong state is
 * never handed to a critic.
 *
 * THE SEEDS AND THE DRIVES NOW LIVE IN economy-moments.mjs. Everything above
 * still describes them, because this script is where they were worked out and
 * where the reasoning belongs; what moved is the code, so the contrast audit
 * can stand in front of the same three surfaces instead of keeping a second
 * copy of the route to them that would drift. This file keeps what is its own:
 * the static server, the viewports, the burst cadence, and the PNGs.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";
import {
  HUD_HASH,
  LESSON_HASH,
  P2_SEEDS,
  P3_LIT_SEED,
  P3_SEED,
  P3_STORED,
  driveCombo,
  driveFeedback,
  driveHudCharge,
  driveHudLit,
  driveHudRest,
  driveReward,
  openSeeded,
  sleep,
} from "./economy-moments.mjs";

/**
 * The burst cadence, the bar's own: 0, 400, 900 and 2500 ms after the press.
 * `--frames 1500,1700` overrides it, for a builder who needs to see a beat
 * that falls between two of the judged frames (the diamond mid flight, say).
 * A judged run always uses the default, or it is not comparing like with like.
 */
const DEFAULT_FRAMES_MS = [0, 400, 900, 2500];
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
const framesArg = argValue("--frames", null);
const FRAMES_MS =
  framesArg === null
    ? DEFAULT_FRAMES_MS
    : framesArg.split(",").map((value) => {
        const ms = Number(value.trim());
        if (!Number.isFinite(ms) || ms < 0) throw new Error(`--frames wants non-negative milliseconds, got "${value}"`);
        return ms;
      });
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

/** A fresh page on a hash route, in a theme, seeded, on this script's server. */
const open = (browser, viewport, theme, hash, journal = null, stored = {}) =>
  openSeeded(browser, { origin, viewport, theme, hash, journal, stored });

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

async function captureP1(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const results = [];

  // 1 and 2. The graded answer strip, right and then the authored distractor.
  for (const outcome of ["correct", "wrong"]) {
    const page = await open(browser, viewport, theme, LESSON_HASH);
    const { reached, trigger } = await driveFeedback(page, outcome, { onTrigger: (at) => burst(page, dir, `${tag}-${outcome}`, at) });
    results.push({ moment: outcome, reached, frames: trigger });
    await page.close();
  }

  // 3. Combo: three right in a row, then Finish lesson brings the interstitial.
  {
    const page = await open(browser, viewport, theme, LESSON_HASH);
    const { reached, trigger } = await driveCombo(page, { onTrigger: (at) => burst(page, dir, `${tag}-combo`, at) });
    results.push({ moment: "combo", reached, frames: trigger });
    await page.close();
  }

  return results;
}

/** Play the intro lesson through to the reward moment and burst from the press that opens it. */
async function captureReward(browser, viewport, theme, dir, tag, seedName) {
  const page = await open(browser, viewport, theme, LESSON_HASH, P2_SEEDS[seedName]);
  const { moment, reached, trigger, state } = await driveReward(page, seedName, {
    onTrigger: (at) => burst(page, dir, `${tag}-reward-${seedName}`, at),
  });
  await page.close();
  return { moment, reached, frames: trigger, state };
}

async function captureP2(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const results = [];
  for (const seedName of Object.keys(P2_SEEDS)) {
    results.push(await captureReward(browser, viewport, theme, dir, tag, seedName));
  }
  return results;
}

/**
 * P3, the header HUD. Two moments on the pathway tab: the header at rest, and
 * the same header with the charge coach mark open.
 *
 * Unlike P1 and P2 this piece has no press to walk to, so the rest burst runs
 * from the moment the header settles rather than from a click. That is the
 * honest cadence for a readout: what a critic judges is what is on screen when
 * the tab opens, and the four frames still differ because the unlit flame
 * gutters.
 *
 * The seed is a journal and the stored blob names the course; economy-moments
 * explains at length why both halves are needed to land on 137 diamonds.
 */
async function captureP3(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const results = [];

  {
    const page = await open(browser, viewport, theme, HUD_HASH, P3_SEED, P3_STORED);
    const { moment, reached, trigger, state } = await driveHudRest(page, {
      onTrigger: (at) => burst(page, dir, `${tag}-hud-rest`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }

  {
    const page = await open(browser, viewport, theme, HUD_HASH, P3_SEED, P3_STORED);
    const { moment, reached, trigger, state } = await driveHudCharge(page, {
      onTrigger: (at) => burst(page, dir, `${tag}-hud-charge`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }

  // The lit half of the pair. Not one of the two moments the piece was asked
  // for, and named so a judge can leave it out of the comparison: it is here
  // because "the flame lights when today counted" is a claim, and a claim with
  // no frame behind it is the sort of thing a still capture quietly hides.
  {
    const page = await open(browser, viewport, theme, HUD_HASH, P3_LIT_SEED, P3_STORED);
    const { moment, reached, trigger, state } = await driveHudLit(page, {
      onTrigger: (at) => burst(page, dir, `${tag}-hud-lit`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }

  return results;
}

const PIECES = { P1: captureP1, P2: captureP2, P3: captureP3 };
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
    const extra = result.state === undefined ? "" : `  ${JSON.stringify(result.state)}`;
    console.log(`${entry.viewport.padEnd(7)} ${entry.theme.padEnd(5)} ${result.moment.padEnd(14)} ${status}  frames at ${offsets} ms${extra}`);
  }
}
await writeFile(path.join(OUT, "capture.json"), `${JSON.stringify({ piece: PIECE, viewports: VIEWPORTS, frames: FRAMES_MS, report }, null, 2)}\n`);
if (missed > 0) {
  console.error(`${missed} moment(s) did not appear. The shots are not judgeable; fix the drive, do not judge these.`);
  process.exit(1);
}
