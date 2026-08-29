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
 *   node measurements/capture-economy.mjs --piece P4 --out measurements/gauntlet-economy/P4-r1/self-check
 *   node measurements/capture-economy.mjs --piece P5 --out measurements/gauntlet-economy/P5-r1/self-check
 *   node measurements/capture-economy.mjs --piece S1 --out measurements/gauntlet-economy/S1-r1/self-check
 *   node measurements/capture-economy.mjs --piece S2 --out measurements/gauntlet-economy/S2-r1/self-check
 *   node measurements/capture-economy.mjs --piece S4 --out measurements/gauntlet-economy/S4-r1/self-check
 *
 * P5, THE CHARGE SURFACES, SEEDS THE JOURNAL for the same reason P3 and P4 do:
 * a meter at 14 of 30 is two node entries, an empty one is four, and an exam
 * nine days out is a settings event no press can produce. The seed is
 * EconomyEvents plus the stored course, and every number on the sheet still
 * comes out of deriveEconomy. Reaching the moment is otherwise a real press on
 * a real pathway node: the entry cost belongs at the door, so the door is where
 * the burst hangs.
 *
 * S1, THE FOUR TAB SHELL, IS THE FIRST PIECE HERE WHOSE SUBJECT IS CHROME.
 * Three moments: the bar at rest on the Path tab, a header tool open over a
 * pathway that is still mounted behind it, and the greyed course list. Two of
 * the three run their burst from the moment the screen settles rather than from
 * a press, for the reason P3's header gives: what a critic judges about a
 * readout or a bar is what is on screen when the tab opens. The tool sheet is
 * the exception and runs from the press, because a sheet rising IS the
 * transition being judged.
 *
 * It seeds P3's journal and stored blob unchanged. Not because the bar needs a
 * journal, but because the bar is drawn under a header full of numbers, and a
 * header of zeroes is a shot of a fresh install rather than of the product.
 * Using P3's exact seed also keeps the two pieces comparable: the header in an
 * S1 frame is the same header on the same account as the header in a P3 frame.
 * No hook of any kind is needed: every one of the three is reached by opening a
 * hash a student can open and, for the sheet, by one real press.
 *
 * P4, THE STREAK SCREEN, SEEDS THE JOURNAL for the same reason P3 does: a 47
 * day streak is 47 days. It is otherwise reached by real clicks, one press
 * further than P2 (the reward moment's own Continue), and the seed carries no
 * rest day: the gap is a day with no events and derive.ts applies the free
 * weekly rest day to it on its own, which is what makes the glyph on screen an
 * observation rather than a fixture. The arithmetic behind every number is in
 * economy-moments.mjs beside the drives.
 *
 * S4, THE FRONT DOOR, IS THE ONE PIECE WHOSE MOMENT IS THE COLD OPEN, so it
 * is the one piece that does not open its page through `openSeeded`. Every
 * other capture here navigates, waits for the network to go idle and then
 * drives; the loader is gone by then, by design. S4 installs a probe before the
 * document exists, navigates without waiting, aligns the burst clock to the
 * page's own navigation origin, and shoots. It uses NO hook: `?boot=hold`
 * exists for the contrast audit, which cannot be restructured that way, and
 * this script deliberately does not set it, because a photograph of a loader
 * that was told to wait is a photograph of something a student never sees.
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
  COURSES_HASH,
  HUD_HASH,
  LESSON_HASH,
  P2_SEEDS,
  P3_LIT_SEED,
  P3_SEED,
  P3_STORED,
  P4_SEEDS,
  P5_SEED_BUILDERS,
  P5_STORED,
  PATHWAY_HASH,
  BOOT_HASH,
  S2_SEED,
  S2_STORED,
  S4_SEED,
  S4_STORED,
  driveBoot,
  driveChargeCost,
  driveChargeEmpty,
  driveChargeExam,
  driveChargeSpend,
  driveCombo,
  driveFeedback,
  driveHudCharge,
  driveHudLit,
  driveHudRest,
  driveHudStreak,
  drivePathGate,
  drivePathRest,
  drivePathScroll,
  driveReward,
  driveShellBar,
  driveShellCourses,
  driveShellTool,
  driveStreak,
  installBootProbe,
  installSeed,
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
/**
 * The second burst S4 takes, inside its own reveal. Absolute milliseconds from
 * the same navigation: the reveal begins at the 1250 ms floor in Loader.tsx and
 * its longest transition is 820 ms, so these are the instant it starts, the
 * field just parted, most of the way open, and settled. Not a substitute for
 * the judged cadence, an addition to it.
 */
const WIPE_FRAMES_MS = [1250, 1480, 1670, 2250];
/**
 * The third burst, with prefers-reduced-motion emulated: the held field, the
 * instant the reveal starts, just after, and settled.
 *
 * THE 120 MS CROSS FADE ITSELF IS NOT PHOTOGRAPHED, and that is a limit of the
 * harness rather than an omission. One PNG encode at these sizes costs about
 * 200 ms, so no frame can be placed inside a 120 ms window: asking for one at
 * 1330 landed at 1466, past the end. The evidence that the reveal is the short
 * fade and not the wipe is in the drive's own state instead, and it is a
 * stronger form of evidence than a frame: `removedAt - revealAt` is about 165 ms
 * here against about 880 ms on the other two runs. The frames still show that
 * the first three beats hold, and the drive asserts Bloom did NOT blink, which
 * is the other half of reusing Berry.tsx's clock rather than writing a second.
 */
const REDUCED_FRAMES_MS = [900, 1250, 1450, 1700];
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

/**
 * PNGs at the burst cadence, measured from `startedAt`. Returns actual offsets.
 *
 * `frames` defaults to the judged cadence and is only ever passed for a moment
 * whose transition does not fall inside it. S4 is the one: its reveal starts at
 * the 1250 ms floor, so the default four frames step over the wipe entirely and
 * the piece would be judged on two stills of a field and one of a settled page.
 */
async function burst(page, dir, name, startedAt, frames = FRAMES_MS) {
  const actual = [];
  for (const wanted of frames) {
    const wait = startedAt + wanted - Date.now();
    if (wait > 0) await sleep(wait);
    const before = Date.now() - startedAt;
    // optimizeForSpeed trades PNG compression ratio for encode time. PNG is
    // lossless at every compression level, so the pixels are identical; what
    // changes is how long the encode blocks the NEXT frame in the burst. It was
    // costing 300 to 500 ms per frame on this machine, which is how a 900 ms
    // frame was landing at 1226 and stopping being a comparison with the bar.
    await page.screenshot({
      path: path.join(dir, `${name}-${String(wanted).padStart(4, "0")}ms.png`),
      type: "png",
      optimizeForSpeed: true,
    });
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
 * P3, the header HUD. Three moments on the pathway tab: the header at rest,
 * the same header with the charge coach mark open, and the streak coach mark,
 * which is where the week strip and the goal ring are drawn at size.
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

  {
    const page = await open(browser, viewport, theme, HUD_HASH, P3_SEED, P3_STORED);
    const { moment, reached, trigger, state } = await driveHudStreak(page, {
      onTrigger: (at) => burst(page, dir, `${tag}-hud-streak`, at),
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

/**
 * P4, the streak screen. Three moments, all of them one press past the reward
 * moment, and the burst runs from that press because it is the transition a
 * critic is judging.
 *
 * `rest` is the judged one: a 47 day run whose YESTERDAY was an auto rest day,
 * so the rest glyph and the streak beat are on screen together, and it is the
 * only one of the three a blind pair should use. `milestone` and `exam` are
 * named so a judge can leave them out: each is a claim this screen makes on
 * days the judged seed does not reach, and a claim with no frame behind it is
 * the sort of thing a still capture quietly hides.
 */
async function captureP4(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const results = [];
  for (const seedName of Object.keys(P4_SEEDS)) {
    const page = await open(browser, viewport, theme, LESSON_HASH, P4_SEEDS[seedName]);
    const { moment, reached, trigger, state } = await driveStreak(page, seedName, {
      onTrigger: (at) => burst(page, dir, `${tag}-streak-${seedName}`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }
  return results;
}

/**
 * P5, the Charge surfaces. Four moments, all on the pathway, all opened by a
 * real press on a real node.
 *
 * The three the piece is judged on are `cost`, `empty` and `exam`, which are
 * the three states the spec names. `spend` is the fourth and it is named so a
 * judge can leave it out of a blind pair: it is a TRANSITION rather than a
 * state, its last frame is the destination the student pressed toward, and a
 * still of a screen mid navigation is not comparable with a still of a screen
 * at rest. It is captured because "committing animates the halo thinning" is a
 * claim, and a claim with no frame behind it is the sort of thing a still
 * capture quietly hides.
 *
 * Every seed is a journal plus the stored course, for the reason P3's header
 * gives: a snapshot with no course denominator reports a different diamond
 * balance, and the empty state's top up button reads that balance.
 */
async function captureP5(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const drives = {
    cost: driveChargeCost,
    empty: driveChargeEmpty,
    exam: driveChargeExam,
    spend: driveChargeSpend,
  };
  const results = [];
  for (const name of Object.keys(drives)) {
    const page = await open(browser, viewport, theme, PATHWAY_HASH, P5_SEED_BUILDERS[name](), P5_STORED);
    // TWO throwaway frames, taken AFTER the track has painted, before the drive.
    // The first screenshot a page ever takes pays for the capture pipeline's own
    // warm up, and on the first page of a run that cost was landing INSIDE the
    // burst: the 400 ms frame was taken at 804 ms and the 900 at 1241, which is
    // not the cadence the bar's captures use and therefore not a comparison.
    // Taking them before the page had painted, which is what the first pass did,
    // warmed up a blank document and left the real cost still to pay. They write
    // nothing; the buffers are discarded.
    await page.waitForSelector("a.path-node--press", { timeout: 10_000 });
    await page.screenshot({ type: "png", optimizeForSpeed: true });
    await page.screenshot({ type: "png", optimizeForSpeed: true });
    const { moment, reached, trigger, state } = await drives[name](page, {
      onTrigger: (at) => burst(page, dir, `${tag}-charge-${name}`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }
  return results;
}

/**
 * S1, the four tab shell.
 *
 * Three moments and no seeds of its own; see this file's header for why it
 * borrows P3's account and why two of the three bursts run from a settle rather
 * than from a press.
 *
 * `bar` is the judged one, and it is judged at BOTH viewports on purpose. The
 * bar is the piece: at 390px it is four items across the bottom edge, at 1280px
 * it is the same four items as a rail, and a shot of only one of those is a
 * shot of half the claim. `tool` and `courses` are the two things that make
 * four tabs honest rather than amputated, which is the pair a blind critic
 * should be looking at when it asks where the periodic table went.
 *
 * Each drive asserts its own moment: four items in a bar whose narrowest target
 * still clears 44px, a sheet open over a pathway that is still in the document
 * behind it, and one selectable course card against five that carry no link at
 * all. A shot of the wrong state is never handed to a critic.
 */
async function captureS1(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const moments = [
    { name: "bar", hash: PATHWAY_HASH, drive: driveShellBar },
    { name: "tool", hash: PATHWAY_HASH, drive: driveShellTool },
    { name: "courses", hash: COURSES_HASH, drive: driveShellCourses },
  ];
  const results = [];
  for (const entry of moments) {
    const page = await open(browser, viewport, theme, entry.hash, P3_SEED, P3_STORED);
    // The same two throwaway frames P5 takes, and for the same measured reason:
    // the first screenshot a page ever takes pays for the capture pipeline's
    // warm up, and on the first page of a run that cost lands INSIDE the burst.
    // Taken after the bar has painted, so what is warmed up is a real document.
    await page.waitForSelector("nav.tabbar a.tabbar-item", { timeout: 10_000 });
    await page.screenshot({ type: "png", optimizeForSpeed: true });
    await page.screenshot({ type: "png", optimizeForSpeed: true });
    const { moment, reached, trigger, state } = await entry.drive(page, {
      onTrigger: (at) => burst(page, dir, `${tag}-shell-${entry.name}`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }
  return results;
}

/**
 * S2, the descending pathway and its backdrop.
 *
 * Three moments and one screen: the path at rest, the same path mid scroll, and
 * the path standing at a gate. That is deliberate. The subject is a CONTINUOUS
 * landscape derived from the unit data, and one still of it is a still of a
 * backdrop; three positions down the same run is the only way a frame burst can
 * show that the layers move against each other and that the curve draws itself.
 *
 * No hook. Everything here is a function of the journal and of where the page is
 * scrolled to, and a student produces both. The seed is P3's account plus two
 * map node clears, and economy-moments.mjs says at length why a fresh account is
 * the one state that cannot photograph this piece's claim.
 *
 * Each drive asserts its own moment by MEASURING the track rather than by
 * counting class names: one current node, a face measurably larger than every
 * other face, three different fills, a START tag, a ring, no right aligned
 * label, and a scene carrying two ground shapes and two drawn curves. The gap
 * this piece was assigned was five correct states rendering as one appearance,
 * so a capture that checks the class list would pass on exactly the defect it
 * exists to catch.
 */
async function captureS2(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  const moments = [
    { name: "rest", drive: drivePathRest },
    { name: "scroll", drive: drivePathScroll },
    { name: "gate", drive: drivePathGate },
  ];
  const results = [];
  for (const entry of moments) {
    const page = await open(browser, viewport, theme, PATHWAY_HASH, S2_SEED, S2_STORED);
    // The same two throwaway frames P5 and S1 take, and for the same measured
    // reason: the first screenshot a page ever takes pays for the capture
    // pipeline's warm up, and on the first page of a run that cost lands INSIDE
    // the burst. Taken after the track has painted, so a real document is warmed.
    await page.waitForSelector(".path-node--current", { timeout: 10_000 });
    await page.screenshot({ type: "png", optimizeForSpeed: true });
    await page.screenshot({ type: "png", optimizeForSpeed: true });
    const { moment, reached, trigger, state } = await entry.drive(page, {
      onTrigger: (at) => burst(page, dir, `${tag}-path-${entry.name}`, at),
    });
    results.push({ moment, reached, frames: trigger, state });
    await page.close();
  }
  return results;
}

/**
 * S4, the loader and the first reveal.
 *
 * One moment, and the whole piece is a transition, so unlike S1 and S2 there is
 * nothing to settle in front of: the burst runs from the navigation itself and
 * the four frames are the four beats. At the cadence the bar's captures use,
 * 0 is the field with the mark on it, 400 is the rule advancing, 900 is Bloom
 * having blinked with the rule at its end, and 2500 is the pathway revealed and
 * at rest with the loader out of the document.
 *
 * THE BURST CLOCK IS THE PAGE'S OWN. `page.goto` resolves when the harness
 * hears about the navigation, not when the browser began it, and on this
 * machine those differ by a hundred milliseconds or so. The page knows the
 * truth: `performance.now()` is milliseconds since the navigation started. So
 * the clock is set BACKWARDS from that reading, and every printed offset is
 * measured from the cold open rather than from puppeteer. The 0 ms frame is
 * therefore honestly late, and the report says by how much.
 *
 * The two throwaway frames P5, S1 and S2 take are taken here too and for the
 * same measured reason, with one difference that matters: they are taken on
 * about:blank BEFORE the navigation, because the whole point of this piece is
 * the first second of the real page and a warm up frame inside it would land in
 * the middle of the burst.
 */
let s4Warmed = false;

/**
 * One throwaway LOAD of the whole app before the first S4 burst.
 *
 * The two throwaway screenshots the other pieces take warm the capture
 * pipeline. They do not warm the BROWSER, and this is the one piece where that
 * matters: the first page of a run pays for fetching, parsing and compiling a
 * 190 KB bundle in a cold Chrome, and on this machine that put the first burst's
 * reveal at 7.1 seconds against 1.3 for every page after it. Since the reveal is
 * driven by real readiness rather than by a timer, that number was honest and
 * it was still not a comparison: three of the four runs would have been of one
 * product and the first of another. So the browser is warmed once, and every
 * burst including the first is then of a warm cold-open, which is what a
 * returning student on a warm cache actually gets.
 */
async function warmS4(browser, viewport, theme) {
  if (s4Warmed) return;
  s4Warmed = true;
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await installSeed(page, theme, S4_SEED, S4_STORED);
  await page.goto(`${origin}/${BOOT_HASH}`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => document.getElementById("boot") === null, { timeout: 20_000 }).catch(() => {});
  await page.close();
}

/**
 * One cold open, photographed at `frames`, in a browser context of its own.
 *
 * THE ISOLATION IS NOT TIDINESS. PNG encode blocks, and a page that is still
 * being torn down while the next one is starting steals main thread time from
 * the very transition the next burst exists to photograph: the reveal fired
 * 670 ms late, and its own capture is what made it late. A context per run plus
 * a beat of quiet between them is what makes the offsets repeatable.
 */
async function s4Run(browser, viewport, theme, dir, name, frames, reducedMotion = false) {
  const context = await browser.createBrowserContext();
  try {
    const page = await context.newPage();
    await page.setViewport(viewport);
    if (reducedMotion) await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    await installSeed(page, theme, S4_SEED, S4_STORED);
    await installBootProbe(page);
    await page.goto(`${origin}/${BOOT_HASH}`, { waitUntil: "domcontentloaded" });
    // The page knows when the navigation really started; puppeteer only knows
    // when it heard about it, and on this machine those differ by a hundred
    // milliseconds or more. Setting the clock backwards from performance.now()
    // makes every printed offset a measurement from the cold open.
    const elapsed = await page.evaluate(() => performance.now());
    const at = Date.now() - Math.round(elapsed);
    const result = await driveBoot(page, {
      at,
      reducedMotion,
      onTrigger: (from) => burst(page, dir, name, from, frames),
    });
    return result;
  } finally {
    await context.close();
    // A beat of quiet, so the next run does not start inside this one's teardown.
    // 400 ms was not enough once the piece grew to three runs per cell: a phone
    // frame is 3510 by 7596 device pixels and its PNG encode is still finishing
    // while the next context is being built, which showed up as a burst whose
    // first frame landed 842 ms into a navigation instead of 150.
    await sleep(1200);
  }
}

/**
 * S4, the loader and the first reveal.
 *
 * One moment and two bursts of it, because the piece is a transition and the
 * judged cadence steps over its own subject.
 *
 * `boot` is the judged one, at the bar's own 0/400/900/2500: the field with the
 * mark on it, the rule advancing, the rule at its end with Bloom having
 * blinked, and the pathway revealed and at rest. `boot-wipe` is the same cold
 * open with the burst moved inside the reveal, which runs from the 1250 ms
 * floor for about 800 ms and therefore falls in the gap between the third and
 * fourth judged frames. It is named rather than folded in so a judge can see it
 * is one event photographed twice and not two claims. `boot-reduced` is the
 * same open again with prefers-reduced-motion emulated, and it is named for the
 * same reason the P4 and P5 extras are: the reduced motion path is a promise
 * this piece makes and a still capture would otherwise hide whether it is kept.
 *
 * All three assert the same five things through driveBoot, so a shot of a
 * loader that never blinked, never filled its rule, or never left, is not
 * something this script can hand to anybody. The reduced run inverts exactly
 * one of the five, the blink, and asserts it absent.
 */
/**
 * ONE RETRY, AND IT IS PRINTED. Same shape the sticker audit already uses and
 * for the same reason it gives: re-running a check is not the same act as
 * loosening one. The assertion is untouched, a second failure still fails the
 * run, and the retry is on the line so a flake cannot hide behind a green one.
 *
 * What flakes, specifically: PNG encode blocks the page's main thread, so the
 * 900 ms frame of a 2560 by 1800 desktop burst can still be encoding when the
 * 1250 ms reveal timer is due, and once in a while the machine is busy enough
 * that the reveal lands at 2.4 s instead of 1.27. That is the capture delaying
 * the thing it is capturing, not the product being slow, and the drive is right
 * to refuse the frames either way.
 */
async function s4RunOnce(browser, viewport, theme, dir, name, frames, reducedMotion = false) {
  const first = await s4Run(browser, viewport, theme, dir, name, frames, reducedMotion);
  if (first.reached) return first;
  console.log(`  RETRY ${name}: reveal landed at ${first.state.revealAt} ms, outside the burst. Re-running once.`);
  return s4Run(browser, viewport, theme, dir, name, frames, reducedMotion);
}

async function captureS4(browser, viewportName, theme, dir) {
  const viewport = VIEWPORTS[viewportName];
  const tag = `${viewportName}-${theme}`;
  await warmS4(browser, viewport, theme);
  const open = await s4RunOnce(browser, viewport, theme, dir, `${tag}-boot`, FRAMES_MS);
  const wipe = await s4RunOnce(browser, viewport, theme, dir, `${tag}-boot-wipe`, WIPE_FRAMES_MS);
  const reduced = await s4RunOnce(browser, viewport, theme, dir, `${tag}-boot-reduced`, REDUCED_FRAMES_MS, true);
  return [
    { moment: "boot-open", reached: open.reached, frames: open.trigger, state: open.state },
    { moment: "boot-wipe", reached: wipe.reached, frames: wipe.trigger, state: wipe.state },
    { moment: "boot-reduced", reached: reduced.reached, frames: reduced.trigger, state: reduced.state },
  ];
}

const PIECES = { P1: captureP1, P2: captureP2, P3: captureP3, P4: captureP4, P5: captureP5, S1: captureS1, S2: captureS2, S4: captureS4 };
const capture = PIECES[PIECE];
if (capture === undefined) throw new Error(`unknown piece ${PIECE}; known: ${Object.keys(PIECES).join(", ")}`);

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--font-render-hinting=none"],
  // A screenshot that hangs is a bug in the drive, and the default 180 s means
  // finding out about it three minutes later. One minute is still far longer
  // than any frame here has ever taken.
  protocolTimeout: 60_000,
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
    console.log(`${entry.viewport.padEnd(7)} ${entry.theme.padEnd(5)} ${result.moment.padEnd(17)} ${status}  frames at ${offsets} ms${extra}`);
  }
}
await writeFile(path.join(OUT, "capture.json"), `${JSON.stringify({ piece: PIECE, viewports: VIEWPORTS, frames: FRAMES_MS, report }, null, 2)}\n`);
if (missed > 0) {
  console.error(`${missed} moment(s) did not appear. The shots are not judgeable; fix the drive, do not judge these.`);
  process.exit(1);
}
