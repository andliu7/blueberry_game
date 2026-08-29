/**
 * Lossless capture of ONE screen the two committed Duolingo runs never reached:
 * the learn path with the BOTTOM TAB BAR up, phone shape, guest, no account.
 *
 * WHY A SECOND SCRIPT. capture-duolingo.mjs walks the funnel and the first
 * lesson, and both of its runs went straight from the last onboarding beat into
 * the lesson player and then out at the create-a-profile wall. Neither ever
 * stood on the path screen, so neither ever photographed the bottom tab bar.
 * S1's subject IS the bar, and CLAUDE.md is explicit that a critic compares
 * against the artifact and never against a description, so the artifact has to
 * exist. This script's whole job is to stand on that screen and shoot it.
 *
 * HOW IT GETS THERE. Landing, Get started, pick a course, press through the
 * onboarding beats, and then, if the funnel drops the student into a lesson,
 * press the lesson's own X and confirm. Quitting a lesson is what a real
 * student does and it lands on the path, which is where the bar lives.
 *
 * WHAT IT NEVER DOES, same rules as capture-duolingo.mjs: no account, no email
 * or any other personal data, no non essential cookies, no captcha or bot check.
 * A bot wall stops the run and is reported, never worked around.
 *
 * Usage, from apps/web:
 *   node measurements/capture-duolingo-tabbar.mjs [--out <dir>] [--prefix t]
 */

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
    ? path.join(process.cwd(), "..", "..", "docs", "reference", "competitors", "duolingo-live", "2026-08-29-tabbar")
    : process.argv[outIndex + 1],
);
const prefixIndex = process.argv.indexOf("--prefix");
const PREFIX = prefixIndex === -1 ? "t" : process.argv[prefixIndex + 1];

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

/**
 * Press the first control that is present, visible and enabled, retrying.
 * Onboarding types its line out before it enables CONTINUE, so one click misses.
 */
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

/**
 * The bottom tab bar, measured rather than assumed: a container holding links
 * to at least three of the product's top level destinations, sitting in the
 * bottom third of the viewport. Returns null when it is not on screen.
 */
async function readTabBar(page) {
  return page.evaluate(() => {
    const wantedHrefs = ["/learn", "/leaderboard", "/quests", "/shop", "/profile"];
    // The live bar's items carry a data-test rather than an href on some
    // builds, so both are accepted and neither is assumed.
    const wantedTests = ["home", "leaderboards", "leaderboard", "quests", "shop", "profile", "more"];
    // Hit tested, not merely present. The shell mounts its nav underneath the
    // onboarding funnel, so "the anchor exists and has a box" is true on every
    // beat of the funnel and would photograph the wrong screen.
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
    const boxes = bottom.map((el) => el.getBoundingClientRect());
    return {
      items: bottom.length,
      hrefs: bottom.map((el) => el.getAttribute("href") ?? `data-test:${el.getAttribute("data-test")}`),
      labels: bottom.map((el) => (el.innerText ?? "").trim().replace(/\s+/g, " ")),
      minWidth: Math.min(...boxes.map((b) => b.width)),
      minHeight: Math.min(...boxes.map((b) => b.height)),
      top: Math.min(...boxes.map((b) => b.top)),
      viewportHeight: window.innerHeight,
    };
  });
}

/**
 * Choose the first option on a beat that offers options, with a REAL pointer
 * press at the card's centre rather than a synthetic el.click(). Two of the
 * beats (proficiency, choosePath) only enable CONTINUE off a pointer sequence,
 * so a synthetic click leaves the funnel sitting on the same screen forever.
 */
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
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          label: (el.innerText ?? "").trim().replace(/\s+/g, " ").slice(0, 40),
        };
      }
    }
    return null;
  });
  if (box === null) return null;
  await page.mouse.click(box.x, box.y);
  return box.label;
}

/**
 * Wait until the screen stops changing. The beats type their line out and mount
 * their options a beat after the URL changes, so acting the moment a control
 * appears finds nothing to pick and leaves CONTINUE disabled forever.
 */
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

async function main() {
  await mkdir(OUT_DIR, { recursive: true });
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "duo-tabbar-"));
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    defaultViewport: VIEWPORT,
    userDataDir: profileDir,
    args: ["--window-size=430,940", "--mute-audio"],
  });
  const log = [];
  let n = 0;
  const shot = async (what, did) => {
    n += 1;
    const file = `${PREFIX}${String(n).padStart(2, "0")}-${what}.png`;
    await page.screenshot({ path: path.join(OUT_DIR, file), type: "png" });
    log.push({ file, what, did, url: page.url() });
    console.log(`  ${file}`);
    return file;
  };

  const context = browser.defaultBrowserContext();
  await context.overridePermissions(ORIGIN, []);
  const page = (await browser.pages())[0] ?? (await browser.newPage());
  await page.setViewport(VIEWPORT);
  // Duolingo's web theme follows the system, and this machine's Chrome reports
  // dark. Ours is captured in both, so the scheme is named rather than inherited.
  const scheme = process.env.DUO_SCHEME === "dark" ? "dark" : "light";
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: scheme }]);

  try {
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

    // Walk the funnel. Every loop: if the bar is up we are done; if a lesson
    // opened, quit it, which is what puts a student on the path screen.
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
      // DUO_PROBE=1 dumps the live DOM's data-test attributes and a frame per
      // walk step into walk/. That is how the close control on the last funnel
      // sheet was found; it is off by default so a normal run leaves the
      // reference folder holding only the capture.
      if (process.env.DUO_PROBE === "1") {
        const tests = await page.evaluate(() =>
          Array.from(document.querySelectorAll("[data-test]"))
            .filter((el) => el.getBoundingClientRect().width > 0)
            .map((el) => `${el.tagName.toLowerCase()}#${el.getAttribute("data-test")}`)
            .join(" , "),
        );
        console.log(`    data-test: ${tests}`);
        await mkdir(path.join(OUT_DIR, "walk"), { recursive: true });
        await page
          .screenshot({ path: path.join(OUT_DIR, "walk", `step-${String(step).padStart(2, "0")}.png`), type: "png" })
          .catch(() => {});
      }
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

      // The funnel's last beat is a sheet drawn OVER the path, with its own
      // close control. Dismissing it is what a student does when they want to
      // look at the path first, and it is what puts the bar on screen.
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
      // Last resort that is still a thing a student can do: ask for the path.
      await page.goto(`${ORIGIN}/learn`, { waitUntil: "networkidle2", timeout: 60_000 });
      await sleep(3000);
      bar = await readTabBar(page);
    }

    if (bar === null) throw new Error("never reached a screen with the bottom tab bar up");
    console.log(`  tab bar: ${JSON.stringify(bar)}`);

    const started2 = Date.now();
    for (const at of BURST_MS) {
      const wait = started2 + at - Date.now();
      if (wait > 0) await sleep(wait);
      await shot(`path-tabbar-${String(at).padStart(4, "0")}ms`, "Standing on the learn path, bottom tab bar up");
      log[log.length - 1].burstNominalMs = at;
      log[log.length - 1].tabBar = bar;
    }

    await writeFile(path.join(OUT_DIR, "capture-log.json"), `${JSON.stringify({ viewport: VIEWPORT, log }, null, 2)}\n`);
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
