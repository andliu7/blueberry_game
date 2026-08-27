/**
 * Lossless capture of Duolingo's LIVE web product, guest flow, so a blind
 * critic compares our onboarding, reward moment, HUD, streak and energy screens
 * against the real thing and never against a description of it.
 *
 * WHY THIS EXISTS. CLAUDE.md: critics compare against the artifact, never
 * against the product name and never from memory. The committed captures in
 * docs/reference/competitors/inspirations/ are hand shot, mixed format, and
 * nobody can reproduce them. This is the reproducible version: PNG only (see
 * the header of capture-trainer.mjs for what JPEG cost us), numbered in walk
 * order, with a JSON log recording what was on screen for every shot so the
 * MANIFEST is written from evidence rather than from recall.
 *
 * WHAT IT DOES. Opens https://www.duolingo.com HEADFUL, presses Get started as
 * a GUEST, picks Spanish, walks every onboarding beat, plays the first lesson,
 * captures the lesson complete and streak screens as four frame bursts, and
 * STOPS at the create-a-profile wall. Two passes: 1280x900 at DSF 2 and
 * 390x844 at DSF 3 for the phone shape.
 *
 * WHAT IT NEVER DOES. Create an account, type an email or any other personal
 * data, accept non essential cookies, or solve a captcha or bot check. If a bot
 * wall appears the run stops and says so, and the fallback is a human walk
 * through the Chrome MCP tools, never a bypass.
 *
 * THREE THINGS THE LIVE DOM MADE NECESSARY, all found by probing it:
 *
 * 1. The guest onboarding funnel lives at /register and then /welcome. /register
 *    here is the QUESTIONNAIRE, not a signup form, so a "we are at /register so
 *    this must be the profile wall" test is wrong and stops the walk on screen
 *    three. The profile wall is detected by a visible credential input or by the
 *    wall's own copy, never by the path.
 *
 * 2. Duolingo's onboarding screens type their line out before enabling
 *    CONTINUE, and one beat asks the browser for notification permission. So
 *    every press is a retry loop rather than a single click, and permissions are
 *    denied up front through the browser context. Denying is not accepting.
 *
 * 3. Hearts are finite and the reward moment is behind them. Answering every
 *    challenge by taking the first option burns roughly four of the five hearts
 *    before the lesson ends, and an out-of-hearts wall would cost us the single
 *    most important capture in the run. So the walk reads the answer key out of
 *    the session JSON the browser already fetched (prompt, choices, correctIndex)
 *    and answers correctly, spending exactly ONE heart on purpose on the first
 *    challenge so the wrong-answer feedback is captured too. Reading a response
 *    the page itself requested is observation, not a bypass.
 *
 * Usage, from apps/web:
 *   node measurements/capture-duolingo.mjs [--out <dir>] [--pass desktop|phone|both]
 *
 * Chrome discovery matches capture-trainer.mjs: CHROME_PATH, else the standard
 * Windows install locations. puppeteer-core ships no browser and nothing here
 * downloads one.
 */

import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const DATE = "2026-08-27";
const ORIGIN = "https://www.duolingo.com";

const outIndex = process.argv.indexOf("--out");
const OUT_DIR = path.resolve(
  outIndex === -1
    ? path.join(process.cwd(), "..", "..", "docs", "reference", "competitors", "duolingo-live", DATE)
    : process.argv[outIndex + 1],
);
const passIndex = process.argv.indexOf("--pass");
const PASS = passIndex === -1 ? "both" : (process.argv[passIndex + 1] ?? "both");

const PASSES = {
  desktop: { prefix: "d", viewport: { width: 1280, height: 900, deviceScaleFactor: 2 } },
  phone: {
    prefix: "p",
    viewport: { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true },
  },
};

/** Frames of an animated screen, ms after it appeared. */
const BURST_MS = [0, 400, 900, 2500];
const MAX_ONBOARDING_SCREENS = 20;
const MAX_LESSON_STEPS = 30;
const MAX_AFTER_LESSON_SCREENS = 10;

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
  if (found === undefined) {
    throw new Error("No Chrome or Edge executable found. Set CHROME_PATH to a Chromium browser executable.");
  }
  return found;
}

class BotWall extends Error {}

/** The words a bot wall uses. Seeing one stops the run; nothing here tries to get past one. */
const BOT_WALL_PHRASES = [
  "verify you are human",
  "checking your browser",
  "access denied",
  "attention required",
  "are you a robot",
  "captcha",
];

/** Copy that only the create-a-profile wall uses. The path is NOT a signal; /register is the questionnaire. */
const PROFILE_WALL_PHRASES = [
  "create a profile",
  "create your profile",
  "save your progress",
  "sign up to save",
  "create an account",
];

/** Selectors used to advance, in preference order. All were read off the live DOM. */
const ADVANCE = [
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
  "claim",
  "claim xp",
  "collect",
  "done",
];

/**
 * The answer key, read out of the session JSON the page itself fetched.
 *
 * `correct` maps a challenge prompt ("cat") to the phrase that answers it
 * ("gato"). `hintOf` maps a phrase to its English hint, which is what the
 * matching-pairs challenge needs to pair its tokens. Both are best effort: if
 * the payload shape changes, the walk falls back to answering blind and the log
 * records that it did.
 */
class AnswerKey {
  constructor() {
    this.correct = new Map();
    this.hintOf = new Map();
    this.challenges = 0;
  }

  ingest(json) {
    const lists = [json?.challenges, json?.adaptiveChallenges, json?.adaptiveInterleavedChallenges];
    for (const list of lists) {
      if (!Array.isArray(list)) continue;
      for (const challenge of list) {
        const choices = challenge?.choices;
        if (!Array.isArray(choices)) continue;
        this.challenges += 1;
        for (const choice of choices) {
          if (typeof choice?.phrase === "string" && typeof choice?.hint === "string") {
            this.hintOf.set(choice.phrase.toLowerCase(), choice.hint.toLowerCase());
          }
        }
        const index = challenge?.correctIndex;
        const prompt = challenge?.prompt;
        if (typeof index === "number" && typeof prompt === "string") {
          const answer = choices[index];
          const phrase = typeof answer === "string" ? answer : answer?.phrase;
          if (typeof phrase === "string") this.correct.set(prompt.toLowerCase(), phrase);
        }
      }
    }
  }

  /**
   * The phrase that answers this challenge, or null.
   *
   * Two prompt shapes in the first lesson. A select challenge quotes its prompt
   * in the header (Which one of these is "cat"?). An assist challenge's header
   * is the generic "Select the correct meaning" and the prompt word sits in the
   * body, which is why this is given the prompt AREA and not the header: reading
   * only the header answered every assist challenge blind, and four wrong
   * answers is four hearts, which is the whole heart budget.
   *
   * The caller must pass text with the CHOICES removed. Choice text is drawn
   * from the same small vocabulary, so leaving it in matches a prompt against
   * some other challenge's answer.
   */
  answerFor(promptText) {
    const quoted = promptText.match(/[“"']([^“”"']+)[”"']/);
    const quotedPrompt = (quoted?.[1] ?? "").toLowerCase().trim();
    if (quotedPrompt !== "" && this.correct.has(quotedPrompt)) return this.correct.get(quotedPrompt);
    const words = new Set(promptText.toLowerCase().match(/[\p{L}]+/gu) ?? []);
    // Longest prompt first, so "mom" cannot win over a longer prompt containing it.
    const byLength = Array.from(this.correct.keys()).sort((a, b) => b.length - a.length);
    for (const key of byLength) {
      if (key.split(/\s+/).every((word) => words.has(word))) return this.correct.get(key);
    }
    return null;
  }
}

/**
 * One pass's walker. Owns the shot counter, so filenames are numbered in walk
 * order, and the log, so the MANIFEST is written from what was actually on
 * screen rather than from what we expected to be.
 */
class Walker {
  constructor(page, prefix, key) {
    this.page = page;
    this.prefix = prefix;
    this.key = key;
    this.n = 0;
    this.log = [];
    this.notes = [];
  }

  async text() {
    return this.page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  }

  async heading() {
    return this.page
      .evaluate(() => {
        const node = document.querySelector("[data-test='challenge-header'], h1, h2");
        return (node?.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
      })
      .catch(() => "");
  }

  async assertNoBotWall() {
    const body = (await this.text()).toLowerCase();
    const hit = BOT_WALL_PHRASES.find((phrase) => body.includes(phrase));
    // "captcha" turns up in privacy footers, so it only counts on a short page.
    if (hit !== undefined && (hit !== "captcha" || body.length < 1500)) {
      throw new BotWall(`bot check detected ("${hit}") at ${this.page.url()}`);
    }
  }

  /** One PNG, numbered in walk order, plus a log row. `did` is what the student just did to get here. */
  async shot(what, did, options = {}) {
    this.n += 1;
    const file = `${this.prefix}${String(this.n).padStart(2, "0")}-${what}.png`;
    await this.page
      .screenshot({ path: path.join(OUT_DIR, file), type: "png", ...options })
      .catch((error) => console.error(`  screenshot failed for ${file}: ${error.message}`));
    const heading = await this.heading();
    this.log.push({ file, what, did, heading, url: this.page.url() });
    console.log(`  ${file}${heading ? `  "${heading}"` : ""}`);
    return file;
  }

  /**
   * Four frames of an animated screen at fixed offsets from "it just appeared".
   *
   * A PNG at DSF 2 or 3 takes real time to encode, so the nominal offset is the
   * filename and the measured offset is the log. Naming a frame 0400ms when it
   * landed at 0680 is the kind of quiet inaccuracy a disputed verdict turns on.
   */
  async burst(what, did) {
    const started = Date.now();
    for (const at of BURST_MS) {
      const wait = started + at - Date.now();
      if (wait > 0) await sleep(wait);
      const actual = Date.now() - started;
      await this.shot(`${what}-${String(at).padStart(4, "0")}ms`, did);
      this.log[this.log.length - 1].burstNominalMs = at;
      this.log[this.log.length - 1].burstActualMs = actual;
    }
  }

  /** The top strip of the page, where every product puts its HUD. */
  async hudShot(what, did) {
    const height = Math.min(140, Math.round(this.page.viewport().height / 4));
    return this.shot(what, did, { clip: { x: 0, y: 0, width: this.page.viewport().width, height } });
  }

  /**
   * Press the first control that is present, visible and enabled, retrying for
   * a while. Onboarding types its line out before enabling CONTINUE, so a
   * single click misses more often than it lands.
   */
  async press(selectors, { labels = [], tries = 24, gap = 700 } = {}) {
    for (let attempt = 0; attempt < tries; attempt += 1) {
      if (attempt > 0) await sleep(gap);
      const hit = await this.page.evaluate(
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
              return `${selector}:${(el.innerText ?? "").trim().slice(0, 24)}`;
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

  /** Wait until some control this walk knows how to press is on screen. */
  async waitForControl(timeout = 60_000) {
    return this.page
      .waitForFunction(
        () =>
          Array.from(
            document.querySelectorAll(
              "[data-test='funboarding-continue-button'], [data-test='player-next'], [data-test^='challenge '], [data-test='hearts-intro-continue-button'], input",
            ),
          ).some((el) => el.getBoundingClientRect().width > 0),
        { timeout },
      )
      .then(() => true)
      .catch(() => false);
  }

  async isProfileWall() {
    const credential = await this.page.evaluate(() =>
      Array.from(document.querySelectorAll("input")).some((el) => {
        const type = (el.type ?? "").toLowerCase();
        const name = `${el.name ?? ""} ${el.getAttribute("autocomplete") ?? ""}`.toLowerCase();
        return (
          el.getBoundingClientRect().width > 0 &&
          (type === "email" || type === "password" || /email|password|username/.test(name))
        );
      }),
    );
    if (credential) return true;
    const body = (await this.text()).toLowerCase();
    return PROFILE_WALL_PHRASES.some((phrase) => body.includes(phrase));
  }

  async challengeKind() {
    return this.page.evaluate(
      () => document.querySelector("[data-test^='challenge ']")?.getAttribute("data-test")?.trim() ?? "",
    );
  }

  /** Decline non essential cookies if a banner is up. It never accepts. */
  async declineCookies() {
    const hit = await this.press([], {
      labels: ["reject all", "reject", "decline", "only necessary", "necessary only", "manage cookies"],
      tries: 2,
      gap: 400,
    });
    if (hit !== null) {
      this.notes.push(`cookies declined via ${hit}`);
      console.log(`  cookies: declined via ${hit}`);
      await sleep(400);
    }
  }
}

/** Landing page, then Get started. */
async function landAndStart(w) {
  await w.page.goto(`${ORIGIN}/`, { waitUntil: "networkidle2", timeout: 60_000 });
  await sleep(2000);
  await w.assertNoBotWall();
  await w.declineCookies();
  await w.shot("landing", "Opened duolingo.com as a guest, no account");
  await w.hudShot("landing-header", "The landing header, site language control at the right");

  const started = await w.press(["[data-test='get-started-top']", "[data-test='get-started-bottom']"], {
    labels: ["get started", "start learning"],
    tries: 8,
  });
  if (started === null) throw new Error("no Get started control on the landing page");
  await w.page.waitForSelector("[data-test~='flag-spanish']", { timeout: 45_000 });
  await sleep(1000);
  await w.assertNoBotWall();
}

/** The course picker, then Spanish. */
async function pickSpanish(w) {
  await w.shot("course-picker", "Pressed Get started; the I want to learn grid");
  const picked = await w.press(["[data-test~='flag-spanish']"], { labels: ["spanish"], tries: 6 });
  if (picked === null) throw new Error("could not find Spanish on the course picker");
  await w.shot("course-picker-loading", "Chose Spanish; the funnel is loading the first beat");
  await w.waitForControl();
  await sleep(1200);
  await w.assertNoBotWall();
}

/**
 * Wait until the screen stops changing.
 *
 * The onboarding beats type their line out and mount their options a beat after
 * the URL changes, so a screenshot taken the moment a control appears catches a
 * half built screen and, worse, an option pick taken then finds nothing to pick
 * and leaves CONTINUE disabled forever. This is the fix for both. It is used for
 * still screens only; the animated ones are captured as bursts on purpose.
 */
async function settleScreen(w, { maxMs = 15_000, quietMs = 650 } = {}) {
  let last = null;
  let stable = 0;
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const signature = await w.page
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

/** The first option on a screen that offers options, retried while the screen mounts. */
async function pickFirstOption(w, tries = 6, gap = 600) {
  for (let attempt = 0; attempt < tries; attempt += 1) {
    if (attempt > 0) await sleep(gap);
    const picked = await w.page.evaluate(() => {
      const visible = (el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      };
      for (const selector of ["[role='radio']", "[role='option']", "[data-test$='-option']", "[data-test*='card']"]) {
        const el = Array.from(document.querySelectorAll(selector)).filter(visible)[0];
        if (el) {
          el.click();
          return (el.innerText ?? "").trim().replace(/\s+/g, " ").slice(0, 60);
        }
      }
      return null;
    });
    if (picked !== null) return picked;
    // No options here, and the beat is already ready to advance: it is a
    // read-and-continue beat, not a slow mounting one.
    const ready = await w.page.evaluate(() => {
      const el = document.querySelector("[data-test='funboarding-continue-button']");
      return el !== null && !el.disabled && el.getAttribute("aria-disabled") !== "true";
    });
    if (ready) return null;
  }
  return null;
}

/** A stable name for an onboarding screen: its own welcomeStep, else its heading. */
async function screenSlug(w, fallback) {
  return w.page
    .evaluate(() => {
      const step = new URL(location.href).searchParams.get("welcomeStep");
      if (step) return step;
      const node = document.querySelector("h1, h2");
      return (node?.textContent ?? "").trim();
    })
    .then((raw) => {
      const slug = (raw ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 36);
      return slug === "" ? fallback : slug;
    })
    .catch(() => fallback);
}

/** Every onboarding beat until the lesson player opens. */
async function walkOnboarding(w) {
  // Two consecutive beats can share a welcomeStep (choosePath carries its own
  // screen and then two motivational cards), so a repeated slug is suffixed
  // rather than left to collide in the filename.
  const seen = new Map();
  for (let i = 0; i < MAX_ONBOARDING_SCREENS; i += 1) {
    await w.assertNoBotWall();
    if ((await w.challengeKind()) !== "") return "lesson";
    if (await w.isProfileWall()) return "profile-wall";

    await settleScreen(w);
    if ((await w.challengeKind()) !== "") return "lesson";
    const base = await screenSlug(w, `beat-${i + 1}`);
    const times = (seen.get(base) ?? 0) + 1;
    seen.set(base, times);
    const slug = times === 1 ? base : `${base}-${times}`;
    await w.shot(`onboarding-${slug}`, "Arrived on this onboarding beat; nothing chosen yet");

    const picked = await pickFirstOption(w);
    if (picked !== null) {
      await sleep(700);
      await w.shot(`onboarding-${slug}-picked`, `Chose the first option, "${picked}"`);
    }

    const went = await w.press(ADVANCE, { labels: ADVANCE_LABELS });
    if (went === null) {
      w.notes.push(`onboarding stopped: nothing to press on ${slug}`);
      return "stuck";
    }
    await sleep(1500);
    await w.waitForControl(45_000);
    await sleep(900);
  }
  return "screen-cap";
}

/**
 * Answer a select challenge. Returns what was chosen and whether it was
 * deliberately wrong. `wantWrong` spends one heart on purpose, because the
 * wrong-answer feedback is one of the screens this capture exists for.
 */
async function answerSelect(w, wantWrong) {
  // The challenge's own text with every choice removed: the prompt area alone.
  const promptText = await w.page.evaluate(() => {
    const challenge = document.querySelector("[data-test^='challenge ']");
    if (challenge === null) return "";
    // innerText needs layout, so a detached clone reads back empty. Subtract the
    // choices from the live text instead of trying to delete them from a copy.
    let text = (challenge.innerText ?? "").replace(/\s+/g, " ").trim();
    for (const choice of challenge.querySelectorAll("[data-test='challenge-choice']")) {
      const chunk = (choice.innerText ?? "").replace(/\s+/g, " ").trim();
      if (chunk !== "") text = text.split(chunk).join(" ");
    }
    return text.replace(/\s+/g, " ").trim();
  });
  const answer = w.key.answerFor(promptText);
  const chosen = await w.page.evaluate(
    (phrase, avoid) => {
      const visible = (el) => el.getBoundingClientRect().width > 0;
      const choices = Array.from(document.querySelectorAll("[data-test='challenge-choice']")).filter(visible);
      if (choices.length === 0) return null;
      const textOf = (el) => (el.innerText ?? "").replace(/\s+/g, " ").trim();
      const matches = (el) => phrase !== null && textOf(el).toLowerCase().includes(phrase.toLowerCase());
      const target = avoid
        ? (choices.find((el) => phrase !== null && !matches(el)) ?? choices[0])
        : (choices.find(matches) ?? choices[0]);
      target.click();
      return textOf(target);
    },
    answer,
    wantWrong,
  );
  return { chosen, answer, blind: answer === null };
}

/**
 * Solve the matching-pairs challenge.
 *
 * Two routes. If the session payload gave us phrase to hint mappings, pair the
 * tokens directly. If it did not, brute force: a matched token is marked
 * aria-disabled="true" and a wrong pair simply deselects, so trying every
 * remaining partner terminates and costs nothing.
 */
async function answerMatch(w) {
  const tokens = () =>
    w.page.evaluate(() =>
      Array.from(document.querySelectorAll("[data-test$='-challenge-tap-token']"))
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => ({
          dt: el.getAttribute("data-test"),
          word: (el.getAttribute("data-test") ?? "").replace(/-challenge-tap-token$/, ""),
          done: el.getAttribute("aria-disabled") === "true",
        })),
    );
  const tap = (dt) =>
    w.page.evaluate((selectorValue) => {
      const el = document.querySelector(`[data-test="${selectorValue}"]`);
      if (el === null) return false;
      el.click();
      return true;
    }, dt);

  for (let round = 0; round < 40; round += 1) {
    const open = (await tokens()).filter((token) => !token.done);
    if (open.length === 0) return "matched-all";
    const first = open[0];
    // The payload's hint dictionary, when we have it, names the partner outright.
    const hint = w.key.hintOf.get(first.word.toLowerCase());
    const partnerByHint =
      hint === undefined
        ? open.find((token) => w.key.hintOf.get(token.word.toLowerCase()) === first.word.toLowerCase())
        : open.find((token) => token.word.toLowerCase() === hint);
    const candidates = partnerByHint
      ? [partnerByHint, ...open.slice(1).filter((token) => token.dt !== partnerByHint.dt)]
      : open.slice(1);
    for (const candidate of candidates) {
      await tap(first.dt);
      await sleep(160);
      await tap(candidate.dt);
      await sleep(420);
      const after = await tokens();
      if (after.find((token) => token.dt === first.dt)?.done === true) break;
    }
  }
  return "match-cap";
}

/**
 * Is the lesson complete screen on screen?
 *
 * It CANNOT be inferred from the absence of a challenge: the Lesson Complete
 * slide leaves a stale data-test="challenge challenge-select" wrapper in the
 * DOM, so the walk read the reward moment as an unanswerable challenge and
 * stopped one press short of the whole point of the run. Its own copy and its
 * REVIEW LESSON button are the reliable signal.
 */
async function isLessonComplete(w) {
  return w.page
    .evaluate(() => {
      const body = (document.body?.innerText ?? "").toLowerCase();
      if (body.includes("lesson complete")) return true;
      return Array.from(document.querySelectorAll("button, a, [role='button']")).some(
        (el) => el.getBoundingClientRect().width > 0 && /review lesson/i.test(el.innerText ?? ""),
      );
    })
    .catch(() => false);
}

/** Poll until the challenge on screen is no longer `signature`, or give up. */
async function waitForChallengeChange(w, signature, maxMs) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    if (`${await w.challengeKind()}|${await w.heading()}` !== signature) return true;
    await sleep(300);
  }
  return false;
}

/**
 * The first lesson, challenge by challenge.
 *
 * Deliberately wrong on the FIRST challenge only: that is the wrong-answer
 * feedback and the hearts primer, both of which are screens we want, and it
 * leaves four hearts for the rest of the lesson so the reward moment is
 * reachable. Typing challenges are never answered, only skipped, because this
 * script does not type into a live product.
 */
async function playLesson(w) {
  let heartsShot = false;
  let hudShot = false;
  let reactions = 0;
  for (let step = 0; step < MAX_LESSON_STEPS; step += 1) {
    await w.assertNoBotWall();
    if (await isLessonComplete(w)) return "complete";
    if (await w.isProfileWall()) return "profile-wall";
    // An empty player is AMBIGUOUS, three ways, and getting this wrong ended
    // the walk six challenges early twice:
    //   - the gap between two challenges, which just needs waiting out
    //   - a mid-lesson CHARACTER REACTION, Duo saying "You're getting good at
    //     this!" over a half full progress bar, which waits on CONTINUE. This is
    //     a screen the capture wants, so it is shot as a burst, not skipped
    //   - the actual end of the lesson
    let kind = await w.challengeKind();
    if (kind === "") {
      await settleScreen(w, { maxMs: 6000 });
      kind = await w.challengeKind();
    }
    if (kind === "") {
      const body = (await w.text()).toLowerCase();
      if (/lesson complete|you earned|total xp|\bxp\b/.test(body)) return "complete";
      const canAdvance = (await w.page.$("[data-test='player-next'], [data-test='funboarding-continue-button']")) !== null;
      if (canAdvance) {
        reactions += 1;
        await w.burst(
          `character-reaction-${reactions}`,
          "Mid lesson, the player handed over to the character instead of the next challenge",
        );
        const past = await w.press(ADVANCE, { labels: ADVANCE_LABELS, tries: 10 });
        if (past === null) return "complete";
        await sleep(1400);
        continue;
      }
      const returned = await w.page
        .waitForFunction(() => document.querySelector("[data-test^='challenge ']") !== null, { timeout: 8000 })
        .then(() => true)
        .catch(() => false);
      if (!returned) return "complete";
      kind = await w.challengeKind();
    }

    await settleScreen(w, { maxMs: 8000 });
    const index = String(step + 1).padStart(2, "0");
    const short = kind.replace(/^challenge\s+challenge-/, "");
    await w.shot(`lesson-${index}-${short}-prompt`, "A challenge, before answering");
    if (!hudShot) {
      await w.hudShot(`lesson-hud`, "The lesson HUD: quit, progress bar, hearts");
      hudShot = true;
    }

    const before = `${kind}|${await w.heading()}`;
    let did = "";
    // Dispatch on what the challenge actually OFFERS, not on what its name
    // suggests. The first lesson alone serves select, assist and match, and a
    // "select" named challenge with no choice cards turned up at step 17 and
    // ended the walk. Anything this cannot answer is skipped, never typed into.
    const hasChoices = (await w.page.$("[data-test='challenge-choice']")) !== null;
    if (short === "match") {
      const outcome = await answerMatch(w);
      did = `Paired every token (${outcome})`;
    } else if (hasChoices) {
      const wantWrong = step === 0;
      const { chosen, answer, blind } = await answerSelect(w, wantWrong);
      did =
        chosen === null
          ? ""
          : wantWrong
            ? `Chose "${chosen}" on purpose, which is not the answer, to capture the wrong-answer feedback`
            : `Chose "${chosen}"${blind ? " (no answer key, chose blind)" : ` (the answer key says ${answer})`}`;
    }
    if (did === "") {
      const skipped = await w.press(["[data-test='player-skip']"], { labels: ["skip"], tries: 4 });
      if (skipped === null) {
        w.notes.push(`could not answer or skip ${kind} at step ${index}`);
        return `unanswerable:${kind}`;
      }
      did = "Pressed SKIP: this challenge wants typing or speech, and this script never types into a live product";
    }
    await sleep(400);
    await w.shot(`lesson-${index}-${short}-answered`, did);

    const checked = await w.press(["[data-test='player-next']"], { labels: ["check"], tries: 10 });
    if (checked === null) {
      // The player moved on without us. Re-read the screen rather than abort:
      // an aborted walk loses the reward moment, which is the point of the run.
      w.notes.push(`no CHECK on ${short} at step ${index}; re-reading the screen`);
      continue;
    }
    await sleep(900);

    // The matching-pairs challenge takes a CHECK and then advances straight to
    // the next challenge with no feedback ribbon, because there is nothing to
    // say about a grid that is already all correct. Shooting "feedback" here
    // would file the NEXT challenge's prompt under the wrong name.
    if (await waitForChallengeChange(w, before, 1200)) {
      w.notes.push(`${short} advanced straight after CHECK with no feedback ribbon, so it has no feedback shot`);
      console.log(`  ${short} advanced with no ribbon`);
      continue;
    }

    const verdict = await w.page.evaluate(() => {
      const blame = document.querySelector("[data-test^='blame']")?.getAttribute("data-test") ?? "";
      if (blame.includes("incorrect")) return "wrong";
      if (blame.includes("correct")) return "right";
      return "feedback";
    });
    await w.shot(`lesson-${index}-${short}-${verdict}`, `Pressed CHECK; the ${verdict} feedback ribbon`);

    // The hearts primer rides in over the challenge the first time a heart is lost.
    if (!heartsShot && (await w.page.$("[data-test='hearts-intro-continue-button']")) !== null) {
      await w.burst("energy-hearts-primer", "Lost the first heart; the hearts primer appeared over the player");
      heartsShot = true;
      await w.press(["[data-test='hearts-intro-continue-button']"], { labels: ["keep going"], tries: 6 });
      await sleep(800);
    }

    const went = await w.press(["[data-test='player-next']"], { labels: ADVANCE_LABELS, tries: 12 });
    if (went === null) {
      if ((await w.challengeKind()) === "") return "complete";
      w.notes.push(`no CONTINUE after ${short} at step ${index}; re-reading the screen`);
      continue;
    }
    // Poll for what comes next rather than sleeping a fixed beat. The reward
    // moment animates its XP count-up from the frame it mounts, so every 100 ms
    // spent asleep here is 100 ms of that animation the burst cannot show.
    for (let waited = 0; waited < 5000; waited += 150) {
      await sleep(150);
      if (await isLessonComplete(w)) return "complete";
      if ((await w.challengeKind()) !== "") break;
    }
  }
  return "step-cap";
}

/** Lesson complete, then every screen after it, each as a burst, until the profile wall. */
async function walkAfterLesson(w) {
  for (let i = 0; i < MAX_AFTER_LESSON_SCREENS; i += 1) {
    await w.assertNoBotWall();
    // No settling pause before the FIRST screen: it is the reward moment, and
    // its count-up starts the frame it mounts.
    if (i > 0) await sleep(600);
    if (await w.isProfileWall()) {
      await w.shot("profile-wall", "Reached the create-a-profile wall. STOPPED HERE. No account was created");
      return "profile-wall";
    }
    const body = (await w.text()).toLowerCase();
    const kind = /lesson complete|nice work|great job|combo/.test(body)
      ? "reward-lesson-complete"
      : body.includes("streak")
        ? "streak"
        : /heart|energy/.test(body)
          ? "energy"
          : /\bxp\b/.test(body)
            ? "reward-xp"
            : "after-lesson";
    const slug = await screenSlug(w, `${i + 1}`);
    await w.burst(`${kind}-${slug}`, "This screen appeared on its own after the lesson ended");

    const went = await w.press(ADVANCE, { labels: ADVANCE_LABELS, tries: 12 });
    if (went === null) {
      w.notes.push(`after lesson: nothing to press on ${kind}-${slug}`);
      return "no-continue";
    }
    await sleep(1600);
  }
  return "screen-cap";
}

/** The guest learn path and its HUD, if the site shows one before the wall. */
async function tryGuestPath(w) {
  if (!w.page.url().includes("/learn")) return false;
  await sleep(2000);
  await w.shot("learn-path", "The guest learn path");
  await w.hudShot("learn-path-hud", "The learn path HUD: streak, gems, hearts, course flag");
  return true;
}

async function runPass(name, config) {
  const { width, height, deviceScaleFactor } = config.viewport;
  console.log(`\n== ${name} pass, ${width}x${height} at DSF ${deviceScaleFactor} ==`);
  // A throwaway profile per pass, so the second pass is a fresh guest and not a
  // returning one. Nothing is kept.
  const profileDir = await mkdtemp(path.join(os.tmpdir(), "duo-capture-"));
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: false,
    userDataDir: profileDir,
    defaultViewport: null,
    args: [
      `--window-size=${Math.max(width, 480) + 24},${Math.min(height, 1000) + 140}`,
      "--font-render-hinting=none",
      // Headful, so the lesson audio would otherwise play through the owner's
      // speakers for the whole walk. Screenshots do not need sound.
      "--mute-audio",
      "--disable-features=TranslateUI",
      "--no-first-run",
      "--no-default-browser-check",
    ],
  });
  // Deny every permission the site may ask for. One onboarding beat asks for
  // notifications, and a native permission bubble blocks the page until it is
  // answered. Denying up front is the answer; nothing here grants anything.
  await browser.defaultBrowserContext().overridePermissions(ORIGIN, []);

  const page = (await browser.pages())[0] ?? (await browser.newPage());
  await page.setViewport(config.viewport);

  const key = new AnswerKey();
  page.on("response", async (response) => {
    if (!/\/sessions(\?|$)/.test(response.url())) return;
    await response
      .json()
      .then((json) => key.ingest(json))
      .catch(() => {});
  });

  const w = new Walker(page, config.prefix, key);
  let outcome = "unknown";
  try {
    await landAndStart(w);
    await pickSpanish(w);
    const onboarding = await walkOnboarding(w);
    console.log(`  onboarding: ${onboarding}, answer key holds ${key.correct.size} prompts`);
    if (onboarding === "lesson") {
      outcome = await playLesson(w);
      console.log(`  lesson: ${outcome}`);
      if (outcome === "complete") outcome = await walkAfterLesson(w);
    } else {
      outcome = `no-lesson:${onboarding}`;
    }
    await tryGuestPath(w);
  } catch (error) {
    if (error instanceof BotWall) {
      console.error(`STOP: ${error.message}. Not bypassing. Walk it by hand with the Chrome MCP tools instead.`);
      outcome = `bot-wall: ${error.message}`;
    } else {
      console.error(`pass failed: ${error.message}`);
      outcome = `error: ${error.message}`;
    }
    await w.shot("final-state", "The page as the script stopped").catch(() => {});
  } finally {
    await browser.close().catch(() => {});
    await rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
  return {
    pass: name,
    viewport: config.viewport,
    outcome,
    answerKeyPrompts: key.correct.size,
    notes: w.notes,
    shots: w.log,
  };
}

await mkdir(OUT_DIR, { recursive: true });
const results = [];
const wanted = PASS === "both" ? ["desktop", "phone"] : [PASS];
for (const name of wanted) {
  if (!(name in PASSES)) throw new Error(`--pass must be desktop, phone or both, got "${name}"`);
  results.push(await runPass(name, PASSES[name]));
}
await writeFile(path.join(OUT_DIR, "capture-log.json"), `${JSON.stringify({ date: DATE, results }, null, 2)}\n`);
console.log("");
for (const result of results) {
  console.log(`${result.pass}: ${result.shots.length} shots, outcome ${result.outcome}`);
}
// The judgeability gate. A run that never reached the reward moment produced
// shots a critic cannot use for the surface this capture exists for, and saying
// so beats letting someone judge against a half walk.
const reachedReward = results.some((result) => result.shots.some((shot) => shot.what.startsWith("reward-")));
if (!reachedReward) {
  console.error("No lesson-complete screen was captured. The reward moment is the point of this walk; fix the drive.");
  process.exit(1);
}
