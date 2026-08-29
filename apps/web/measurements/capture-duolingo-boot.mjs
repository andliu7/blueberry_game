/**
 * Lossless capture of ONE moment neither committed Duolingo run reached: the
 * app's own COLD OPEN, the full screen loader and the first reveal of the
 * screen behind it. Phone shape, guest, no account.
 *
 * WHY A THIRD SCRIPT. capture-duolingo.mjs walks the funnel and the first
 * lesson; capture-duolingo-tabbar.mjs stands on the path and shoots the bottom
 * bar. Neither ever photographs a boot, because both navigate and then wait for
 * the screen to settle, which is precisely the window a preloader lives in.
 * S4's subject IS that window, and CLAUDE.md is explicit that a critic compares
 * against the artifact and never against a description, so the artifact has to
 * exist.
 *
 * HOW IT GETS THERE. The guest walk of capture-duolingo-tabbar.mjs, reused to
 * put the session on the learn path. Then a RELOAD, photographed from the
 * instant navigation starts. Reloading the app you are already inside is the
 * same event ours captures: the shell boots, covers the gap, and hands over to
 * the first screen. No account is created and no personal data is entered.
 *
 * WHAT IT NEVER DOES, same rules as its two siblings: no account, no email or
 * any other personal data, no non essential cookies, no captcha or bot check.
 * A bot wall stops the run and is reported, never worked around.
 *
 * Usage, from apps/web:
 *   node measurements/capture-duolingo-boot.mjs [--out <dir>] [--prefix b]
 */

import { Buffer } from "node:buffer";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const ORIGIN = "https://www.duolingo.com";
const BURST_MS = [0, 400, 900, 2500];
const VIEWPORT = { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true };

const outIndex = process.argv.indexOf("--out");
const OUT_DIR = path.resolve(
  outIndex === -1
    ? path.join(process.cwd(), "..", "..", "docs", "reference", "competitors", "duolingo-live", "2026-08-29-boot")
    : process.argv[outIndex + 1],
);
const prefixIndex = process.argv.indexOf("--prefix");
const PREFIX = prefixIndex === -1 ? "b" : process.argv[prefixIndex + 1];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
  if (found === undefined) throw new Error("No Chrome or Edge executable found. Set CHROME_PATH.");
  return found;
}

const BOT_WALL_PHRASES = [
  "verify you are human",
  "checking your browser",
  "access denied",
  "attention required",
  "are you a robot",
];

const ADVANCE_SELECTORS = [
  "[data-test='funboarding-continue-button']",
  "[data-test='hearts-intro-continue-button']",
  "[data-test='player-next']",
];
const ADVANCE_LABELS = [
  "continue",
  "next",
  "got it",
  "let's go",
  "keep going",
  "start",
  "start learning",
  "start lesson",
  "i can do it",
  "claim",
  "done",
  "no thanks",
  "maybe later",
];

async function text(page) {
  return page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
}

async function assertNoBotWall(page) {
  const body = (await text(page)).toLowerCase();
  const hit = BOT_WALL_PHRASES.find((phrase) => body.includes(phrase));
  if (hit !== undefined) throw new Error(`bot check detected ("${hit}") at ${page.url()}`);
}

async function press(page, selectors, { labels = [], tries = 10, gap = 600 } = {}) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    if (attempt > 0) await sleep(gap);
    const hit = await page.evaluate(
      (wantedSelectors, wantedLabels) => {
        const usable = (el) => {
          if (el === null) return false;
          const rect = el.getBoundingClientRect();
          const style = getComputedStyle(el);
          return (
            rect.width > 0 &&
            rect.height > 0 &&
            style.visibility !== "hidden" &&
            style.display !== "none" &&
            !el.disabled &&
            el.getAttribute("aria-disabled") !== "true"
          );
        };
        for (const selector of wantedSelectors) {
          const el = document.querySelector(selector);
          if (usable(el)) {
            el.click();
            return `${selector}`;
          }
        }
        if (wantedLabels.length > 0) {
          const nodes = Array.from(document.querySelectorAll("button, a, [role='button'], [data-test]"));
          const match = nodes.find(
            (el) => usable(el) && wantedLabels.includes((el.innerText ?? el.textContent ?? "").trim().toLowerCase()),
          );
          if (match) {
            match.click();
            return `text:${(match.innerText ?? "").trim().slice(0, 24)}`;
          }
        }
        return null;
      },
      selectors,
      labels,
    );
    if (hit !== null) return hit;
  }
  return null;
}

/** Same measured definition of the path screen the tabbar script uses. */
async function readTabBar(page) {
  return page.evaluate(() => {
    const wantedHrefs = ["/learn", "/leaderboard", "/quests", "/shop", "/profile"];
    const wantedTests = ["home", "leaderboards", "leaderboard", "quests", "shop", "profile", "more"];
    const onTop = (el) => {
      const rect = el.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
      return hit !== null && (el === hit || el.contains(hit) || hit.contains(el));
    };
    const items = Array.from(document.querySelectorAll("a[href], [data-test]")).filter((el) => {
      const href = el.getAttribute("href") ?? "";
      const test = el.getAttribute("data-test") ?? "";
      if (!wantedHrefs.includes(href) && !wantedTests.includes(test)) return false;
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && onTop(el);
    });
    if (items.length < 3) return null;
    const bottom = items.filter((el) => el.getBoundingClientRect().top > window.innerHeight * 0.66);
    if (bottom.length < 3) return null;
    return { items: bottom.length };
  });
}

async function clickFirstOption(page) {
  const box = await page.evaluate(() => {
    const visible = (el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 40 && rect.height > 24 && rect.top >= 0 && rect.bottom <= window.innerHeight;
    };
    for (const selector of [
      "[role='radio']",
      "[role='option']",
      "[data-test$='-option']",
      "[data-test*='card']",
      "[data-test*='choice']",
    ]) {
      const el = Array.from(document.querySelectorAll(selector)).filter(visible)[0];
      if (el) {
        const rect = el.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    }
    return null;
  });
  if (box === null) return null;
  await page.mouse.click(box.x, box.y);
  return true;
}

async function settleScreen(page, { maxMs = 12_000, quietMs = 600 } = {}) {
  let last = null;
  let stable = 0;
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const signature = await page
      .evaluate(() => {
        const tests = Array.from(document.querySelectorAll("[data-test]"))
          .map((el) => el.getAttribute("data-test"))
          .join("|");
        return `${location.href}::${tests}::${(document.body?.innerText ?? "").length}`;
      })
      .catch(() => "");
    if (signature !== "" && signature === last) {
      stable += 1;
      if (stable >= 2) return true;
    } else {
      stable = 0;
      last = signature;
    }
    await sleep(quietMs);
  }
  return false;
}

/** Walk the guest funnel until the learn path is up. Reused from the tabbar script. */
async function reachPath(page) {
  await page.goto(`${ORIGIN}/`, { waitUntil: "networkidle2", timeout: 60_000 });
  await sleep(2000);
  await assertNoBotWall(page);
  await press(page, [], { labels: ["reject all", "reject", "decline", "only necessary"], tries: 2, gap: 400 });

  const started = await press(page, ["[data-test='get-started-top']", "[data-test='get-started-bottom']"], {
    labels: ["get started", "start learning"],
    tries: 8,
  });
  if (started === null) throw new Error("no Get started control on the landing page");

  await page.waitForSelector("[data-test~='flag-spanish']", { timeout: 45_000 });
  await sleep(1000);
  const picked = await press(page, ["[data-test~='flag-spanish']"], { labels: ["spanish"], tries: 6 });
  if (picked === null) throw new Error("could not find Spanish on the course picker");

  let bar = null;
  for (let step = 0; step < 40 && bar === null; step += 1) {
    await sleep(1200);
    await assertNoBotWall(page);
    bar = await readTabBar(page);
    if (bar !== null) break;

    const inLesson = await page.evaluate(
      () => document.querySelector("[data-test^='challenge '], [data-test='quit-button']") !== null,
    );
    console.log(`  step ${step}: ${page.url()} inLesson=${inLesson}`);
    if (inLesson) {
      const quit = await press(page, ["[data-test='quit-button']"], { tries: 4, gap: 500 });
      if (quit !== null) {
        await sleep(900);
        await press(page, ["[data-test='quit-button-yes']"], {
          labels: ["quit", "end session", "yes", "end lesson"],
          tries: 6,
          gap: 500,
        });
        await sleep(1500);
        continue;
      }
    }

    await settleScreen(page);
    const closed = await press(page, ["[data-test='close-button']"], { tries: 1, gap: 0 });
    if (closed !== null) {
      await sleep(1500);
      continue;
    }
    await clickFirstOption(page);
    await sleep(600);
    await press(page, ADVANCE_SELECTORS, { labels: ADVANCE_LABELS, tries: 6, gap: 700 });
  }

  if (bar === null) {
    await page.goto(`${ORIGIN}/learn`, { waitUntil: "networkidle2", timeout: 60_000 });
    await sleep(3000);
    bar = await readTabBar(page);
  }
  if (bar === null) throw new Error("never reached the learn path, so there is no app to cold open");
  return bar;
}

/**
 * Photograph a cold open. Navigation is STARTED and not awaited, because
 * awaiting the load is awaiting the end of the exact window this script exists
 * to photograph.
 *
 * WHY A SCREENCAST RATHER THAN page.screenshot(). Page.captureScreenshot is
 * served by the renderer, and the renderer is exactly what is being torn down
 * and rebuilt during a navigation: the first attempt inside that window never
 * returns and the run dies on a protocol timeout. Page.startScreencast pushes
 * frames out instead of being asked for them, so it survives the commit. It is
 * recorded for the whole window and the frame nearest each burst offset is
 * kept, which is why every frame carries the offset it was ACTUALLY delivered
 * at beside the one it was asked for.
 */
async function shootColdOpen(page, writeFrame, label, target) {
  // A blank tab first. A reload leaves the OLD screen painted until the new
  // document commits, so the first second of the burst photographs the page
  // the student was already looking at rather than the open. Coming from
  // about:blank is what opening the app actually is.
  await page.goto("about:blank", { waitUntil: "load", timeout: 30_000 });
  await sleep(600);

  const client = await page.createCDPSession();
  const captured = [];
  client.on("Page.screencastFrame", (frame) => {
    captured.push({ atMs: Date.now(), data: frame.data });
    client.send("Page.screencastFrameAck", { sessionId: frame.sessionId }).catch(() => {});
  });
  await client.send("Page.startScreencast", {
    format: "png",
    maxWidth: VIEWPORT.width * VIEWPORT.deviceScaleFactor,
    maxHeight: VIEWPORT.height * VIEWPORT.deviceScaleFactor,
    everyNthFrame: 1,
  });

  const started = Date.now();
  const navigation = page.goto(target, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});
  await sleep(Math.max(...BURST_MS) + 1200);
  await navigation;
  await client.send("Page.stopScreencast").catch(() => {});

  if (captured.length === 0) throw new Error("the screencast delivered no frames across the cold open");

  // DUO_PROBE=1 writes the whole strip, every delivered frame with the offset
  // it arrived at, into strip/. That is how the shape of this boot was read;
  // it is off by default so a normal run leaves the reference folder holding
  // only the four frames of the burst.
  if (process.env.DUO_PROBE === "1") {
    await mkdir(path.join(OUT_DIR, "strip"), { recursive: true });
    for (const frame of captured) {
      const at = String(frame.atMs - started).padStart(5, "0");
      await writeFile(path.join(OUT_DIR, "strip", `${at}ms.png`), Buffer.from(frame.data, "base64"));
    }
    console.log(`  strip: ${captured.length} frames written`);
  }

  const frames = [];
  const used = new Set();
  for (const at of BURST_MS) {
    const want = started + at;
    let best = null;
    for (const frame of captured) {
      // Never look forward past the requested instant: a frame delivered later
      // shows a screen the student had not been shown yet at that offset.
      if (frame.atMs > want && best !== null) continue;
      if (best === null || Math.abs(frame.atMs - want) < Math.abs(best.atMs - want)) best = frame;
    }
    const file = await writeFrame(`${label}-${String(at).padStart(4, "0")}ms`, best.data);
    frames.push({ file, nominalMs: at, actualMs: best.atMs - started, reusedEarlierFrame: used.has(best) });
    used.add(best);
  }

  const timing = await page
    .evaluate(() => {
      const paint = performance.getEntriesByType("paint").find((e) => e.name === "first-contentful-paint");
      return { firstContentfulPaintMs: paint ? Math.round(paint.startTime) : null };
    })
    .catch(() => ({ firstContentfulPaintMs: null }));

  const settled = await readTabBar(page).catch(() => null);
  await client.detach().catch(() => {});
  return { frames, screencastFrames: captured.length, timing, pathUpAfterBurst: settled !== null };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "duo-boot-"));
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    defaultViewport: VIEWPORT,
    userDataDir: profileDir,
    args: ["--window-size=430,940", "--mute-audio"],
  });
  const log = [];
  let n = 0;

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(ORIGIN, []);
  const page = (await browser.pages())[0] ?? (await browser.newPage());
  await page.setViewport(VIEWPORT);
  const scheme = process.env.DUO_SCHEME === "dark" ? "dark" : "light";
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);

  const writeFrame = async (what, base64) => {
    n += 1;
    const file = `${PREFIX}${String(n).padStart(2, "0")}-${what}.png`;
    await writeFile(path.join(OUT_DIR, file), Buffer.from(base64, "base64"));
    log.push({ file, what });
    console.log(`  ${file}`);
    return file;
  };

  try {
    const bar = await reachPath(page);
    console.log(`  on the learn path: ${JSON.stringify(bar)}`);
    await sleep(1500);

    const cold = await shootColdOpen(page, writeFrame, "app-cold-open", `${ORIGIN}/learn`);
    console.log(
      `  cold open: ${cold.screencastFrames} screencast frames, ${JSON.stringify(cold.timing)}, pathUpAfterBurst=${cold.pathUpAfterBurst}`,
    );
    for (const frame of cold.frames) console.log(`    ${frame.file} asked ${frame.nominalMs} got ${frame.actualMs}`);

    await writeFile(
      path.join(OUT_DIR, "capture-log.json"),
      `${JSON.stringify({ viewport: VIEWPORT, scheme, burstMs: BURST_MS, cold, log }, null, 2)}\n`,
    );
    console.log(`wrote ${log.length} frames to ${OUT_DIR}`);
  } finally {
    await browser.close().catch(() => {});
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
