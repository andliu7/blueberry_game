/**
 * How to reach the economy moments in the built app, shared by every script
 * that needs to be standing in front of one.
 *
 * WHY THIS EXISTS. capture-economy.mjs owned the only route to the reward
 * moment, the combo interstitial and the answer feedback strip: the seeds, the
 * three gas law answers, and the order of presses. The contrast audit walks
 * eight tabs and the onboarding welcome, so those three surfaces had never been
 * measured, and STATUS.md records what an unmeasured surface costs: theme.css
 * reasons about contrast in its own comments, carefully, and the formal charge
 * sign still shipped as a literal #ffffff. A pair only fails where it is
 * composed, so a surface no script visits is a surface no audit has an opinion
 * about. Rather than copy the drive into the audit and let the two drift, both
 * scripts import it from here.
 *
 * WHAT A DRIVE FUNCTION PROMISES. It leaves the page with the moment actually
 * on screen, and it says so: every one returns `reached`, read off the same
 * data attribute the capture script asserts on. A caller that wants frames
 * during the animation passes `onTrigger`, which is awaited immediately after
 * the press that opens the moment and receives that press's timestamp. That is
 * the seam the capture's four frame burst hangs on, and the seam the audit uses
 * to sample a mid-animation frame: a colour that only exists during a
 * transition is still a colour a student reads.
 *
 * THE ORDERING BUG, kept here because it is the reason installSeed is a
 * function and not four inlined lines. Inside evaluateOnNewDocument the
 * document element does not exist yet, so `document.documentElement.classList`
 * throws, and everything after the throw silently never runs. The seed is
 * therefore written BEFORE the class toggle, and the toggle is guarded. A null
 * seed hid that for a whole round of P1.
 */

/** The machine's zone, which is also the headless browser's, so seeded days are the browser's days. */
export const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * The lesson the moments are reached through.
 *
 * `?serveAll=1` lifts the SERVED_KINDS gate in src/tabs/courses/CoursesTab.tsx
 * so the intro lesson opens on gas laws, whose three authored numeric questions
 * are the shortest real path to a run of three. The hook changes which authored
 * problems are served, never how one is graded or what Bloom does about it.
 */
export const LESSON_HASH = "?serveAll=1#/start/lesson";

/** An instant at local noon `daysAgo` days before today. Noon keeps it inside the day in any offset. */
export function noonDaysAgo(daysAgo) {
  const at = new Date();
  at.setHours(12, 0, 0, 0);
  at.setDate(at.getDate() - daysAgo);
  return at.toISOString();
}

/**
 * Six counted days behind today. A casual goal is 10 XP, and a concept node's
 * first clear pays exactly that, so one clear a day meets it (rules.ts).
 */
export function streakSeed() {
  const journal = [{ kind: "settings", at: noonDaysAgo(7), tz: LOCAL_TZ, dailyGoal: "casual" }];
  for (let daysAgo = 6; daysAgo >= 1; daysAgo -= 1) {
    journal.push({
      kind: "node_cleared",
      at: noonDaysAgo(daysAgo),
      tz: LOCAL_TZ,
      nodeId: `seed:day-${daysAgo}`,
      nodeKind: "concept",
      flawless: false,
      stepsInOneSitting: 1,
      spine: false,
      difficulty: 2,
    });
  }
  return journal;
}

/**
 * The intro course's other topics, journalled as started (unlocked) intro
 * nodes eight days ago. Mastery is the decayed strength of every UNLOCKED node
 * (derive.ts, modelScoreAt), and the web app never journals node_started today,
 * so a student's very first clear is one node of one, which is 100 percent
 * mastery, which pays every rank badge at once. These eight put the account in
 * the state the pathway will put a real one in once it journals unlocks. Intro
 * nodes cost 0 charge and earn nothing on start, so a "first" seed has still
 * earned 0 diamonds and the long first-diamond catch plays.
 */
export const INTRO_COURSE_TOPICS = [
  "stoichiometry",
  "solutions_and_concentration",
  "acid_base_equilibria",
  "titration_curves",
  "structure_and_bonding",
  "resonance_and_delocalisation",
  "nucleophiles_and_leaving_groups",
  "substitution_and_elimination",
];

export function unlockSeed() {
  return INTRO_COURSE_TOPICS.map((topic) => ({
    kind: "node_started",
    at: noonDaysAgo(8),
    tz: LOCAL_TZ,
    nodeId: `lesson:${topic}`,
    nodeKind: "intro",
  }));
}

/** The two reward seeds by name. "first" has no history; "streak" is six counted days deep. */
export const P2_SEEDS = {
  first: unlockSeed(),
  streak: [...unlockSeed(), ...streakSeed()],
};

/**
 * The intro lesson's three gas law questions with their authored answers
 * (packages/curriculum/src/corpus/gasLaws.ts). The wrong answer is one of the
 * authored distractors, so the wrong moment shows a Tier 2 card rather than
 * the Tier 3 tail.
 */
export const INTRO = [
  { value: "2.00", unit: "atm", wrong: "0.500" },
  { value: "5.60", unit: "L", wrong: "22.4" },
  { value: "0.400", unit: "atm", wrong: "0.800" },
];

/**
 * Theme and seed onto a page, before it navigates.
 *
 * Order is load bearing; see the header. Nothing else is stored: the moments
 * are otherwise reached by real clicks and real grading.
 */
export async function installSeed(page, theme, journal = null, stored = {}) {
  await page.evaluateOnNewDocument(
    (wanted, seed, extra) => {
      localStorage.clear();
      localStorage.setItem("theme", wanted);
      if (seed !== null) {
        localStorage.setItem(
          "blueberry.progress.v2",
          JSON.stringify({
            course: null,
            startTopics: [],
            lessons: {},
            attemptedProblems: [],
            onboardingDone: false,
            displayName: null,
            journal: seed,
            ...extra,
          }),
        );
      }
      if (document.documentElement !== null) document.documentElement.classList.toggle("dark", wanted === "dark");
    },
    theme,
    journal,
    stored,
  );
}

/**
 * A fresh page on a hash route, in a theme, with nothing stored except an
 * optional seeded journal under the progress store's key.
 */
export async function openSeeded(browser, { origin, viewport, theme, hash, journal = null, stored = {} }) {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await installSeed(page, theme, journal, stored);
  await page.goto(`${origin}/${hash}`, { waitUntil: "networkidle0" });
  return page;
}

/** The centre of the first visible button whose text is exactly `text`. */
export async function buttonByText(page, text) {
  return page.evaluate((wanted) => {
    const buttons = [...document.querySelectorAll("button")];
    const match = buttons.find((button) => button.textContent?.trim() === wanted && button.getClientRects().length > 0);
    if (match === undefined) return null;
    // On the phone the Continue sits under the explanation, below the fold.
    match.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = match.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, text);
}

/** A real press: down, a frame, up. Returns the press time for the burst clock. */
export async function press(page, point, label) {
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

/** Type a numeric answer and its unit into the lesson's numeric form. */
export async function typeAnswer(page, value, unit) {
  await page.waitForSelector('input[aria-label="Numeric answer"]', { timeout: 10_000 });
  await page.click('input[aria-label="Numeric answer"]');
  await page.type('input[aria-label="Numeric answer"]', value);
  await page.click('input[aria-label="Unit"]');
  await page.type('input[aria-label="Unit"]', unit);
}

/**
 * Answer the first question and press Check.
 *
 * `outcome` is "correct" or "wrong"; the wrong value is the authored
 * distractor, so the strip carries a Tier 2 explanation rather than the tail.
 */
export async function driveFeedback(page, outcome, { onTrigger = null } = {}) {
  const question = INTRO[0];
  await typeAnswer(page, outcome === "wrong" ? question.wrong : question.value, question.unit);
  const at = await press(page, await buttonByText(page, "Check"), "Check");
  const trigger = onTrigger === null ? null : await onTrigger(at);
  await page.waitForSelector(`[data-reaction="${outcome}"]`, { timeout: 5_000 }).catch(() => {});
  const reached = (await page.$(`[data-reaction="${outcome}"]`)) !== null;
  return { moment: `feedback-${outcome}`, reached, at, trigger };
}

/** All three questions right, then Finish lesson, which brings the interstitial. */
export async function driveCombo(page, { onTrigger = null } = {}) {
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
  const trigger = onTrigger === null ? null : await onTrigger(at);
  await page.waitForSelector('[data-combo="3"]', { timeout: 5_000 }).catch(() => {});
  const reached = (await page.$('[data-combo="3"]')) !== null;
  return { moment: "combo", reached, at, trigger };
}

/**
 * Through the combo interstitial to the reward moment, and only then resolve.
 *
 * A first lesson that pays a rank badge is the one-node-universe problem in the
 * seed notes above, and a Continue the student has to scroll to is not a
 * moment. The streak seed is six counted days behind today, so today's clear is
 * the seventh: anything but a 7 day milestone means the seed did not land and
 * whatever is on screen is some other account's evening.
 */
export async function driveReward(page, seedName, { onTrigger = null } = {}) {
  for (let i = 0; i < INTRO.length; i += 1) {
    await typeAnswer(page, INTRO[i].value, INTRO[i].unit);
    await press(page, await buttonByText(page, "Check"), `Check ${i + 1}`);
    await page.waitForSelector('[data-reaction="correct"]', { timeout: 5_000 });
    if (i < INTRO.length - 1) {
      await press(page, await buttonByText(page, "Next"), `Next ${i + 1}`);
      await sleep(250);
    }
  }
  // Three right in a row: Finish lesson shows the combo interstitial first,
  // and its Continue is the press that opens the reward moment.
  await press(page, await buttonByText(page, "Finish lesson"), "Finish lesson");
  await page.waitForSelector('[data-combo="3"]', { timeout: 5_000 });
  await sleep(300);
  const at = await press(page, await buttonByText(page, "Continue"), "Continue (combo)");
  const trigger = onTrigger === null ? null : await onTrigger(at);
  // The stage settles at 2500 ms. A caller with no onTrigger has not waited for
  // it, so wait here: a drive resolves with the moment on screen, not before.
  await page.waitForSelector('[data-reward="done"]', { timeout: 6_000 }).catch(() => {});
  const state = await page.evaluate(() => {
    const stage = document.querySelector("[data-reward]");
    if (stage === null) return null;
    return {
      first: stage.getAttribute("data-reward-first"),
      streak: document.querySelector('[aria-label="Streak"]') !== null,
      // The milestone used to be read off an element whose aria-label ended
      // in "milestone", which meant the check passed on any element anyone
      // happened to label that way and could not tell 7 from 30. The stage
      // publishes the number the component actually resolved, so the assert
      // below can name the day it expects.
      milestone: Number(stage.getAttribute("data-reward-milestone") ?? 0),
      xp: document.querySelector('[aria-label="XP earned"]')?.textContent ?? "",
      diamonds: Number(stage.getAttribute("data-reward-diamonds")),
      rankUp: stage.getAttribute("data-reward-rank-up") ?? "",
      done: stage.getAttribute("data-reward"),
      continueOnScreen: (() => {
        const button = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Continue");
        if (button === undefined) return false;
        const rect = button.getBoundingClientRect();
        return rect.top >= 0 && rect.bottom <= window.innerHeight;
      })(),
    };
  });
  const reached =
    state !== null &&
    state.continueOnScreen &&
    (seedName === "first"
      ? state.first === "true" && state.rankUp === "" && state.milestone === 0
      : state.streak === true && state.milestone === 7 && state.diamonds > 0);
  return { moment: `reward-${seedName}`, reached, at, trigger, state };
}

/* ============================================================== P3, the HUD ==
 *
 * The header readouts: today's XP against the goal, diamonds, the streak flame,
 * and Charge as Bloom. The moment is the pathway tab at rest, and the same
 * header with the charge coach mark open.
 *
 * THIS ONE IS SEEDED, AND UNAVOIDABLY SO. Every number in the header is a
 * function of history: a five day streak is five days, and no sequence of
 * clicks inside one session can produce one. So the seed is a journal, the
 * same shape the server will hold, and every number on screen still comes out
 * of deriveEconomy. Nothing is written as a balance anywhere.
 *
 * WHY THESE EXACT EVENTS. The piece asks for a five day streak, 14 of 20 daily
 * XP, 137 diamonds and 17 of 30 charge, and the journal is worked backwards
 * from those four numbers against packages/economy/src/rules.ts:
 *
 *   THE STREAK. A day counts when the daily XP goal is met. A flawless spine
 *   reaction clear pays 15 plus 5, which is exactly the Regular goal, so one
 *   clear a day on each of the five previous days is five counted days. Today
 *   is deliberately NOT counted, which is what makes the flame the interesting
 *   half of the pair: a lit flame is a solved problem, a guttering one is the
 *   state a student actually opens the app in.
 *
 *   THE XP. 14 has to be built out of the award table, and it is the sum of a
 *   resonance find (8) and a unit quiz node cleared in three steps in one
 *   sitting (3 per extra step, so 6). The quiz base is 0 because a unit quiz
 *   pays through quiz_passed, which this student has not reached yet.
 *
 *   THE CHARGE. 30 minus a concept node entered (5) minus a reaction node
 *   entered (8) is 17. The two node_started events are placed a few minutes
 *   before now, inside one regeneration interval, so the meter has not ticked
 *   back up by the time the page loads. Regeneration is one point per 30
 *   minutes, so the capture has half an hour of slack and uses seconds of it.
 *
 *   THE DIAMONDS. The five clears pay 20 each (first clear 10, spine 5,
 *   flawless 5), the four resonance finds pay 8, the review drill pays 5, and
 *   reaching Arrow Pusher pays 125: 262 earned. One costume at 125, inside
 *   ECONOMY.md's 100 to 300 band for that sink, leaves 137.
 *
 * THE COURSE IS SET, and that is load bearing rather than decoration. Mastery
 * is scored out of a course, rank awards pay diamonds, and a seed with no
 * course is scored out of whatever it happened to unlock: measured, this same
 * journal reports 262 diamonds without the course and 137 with it. The stored
 * blob therefore names orgo_2, and the node ids are that course's own.
 *
 * The drives ASSERT all four numbers off the rendered aria-labels rather than
 * trusting the arithmetic above, so a rule that moves in packages/economy fails
 * the capture instead of quietly shipping a shot of some other account.
 */

/** An instant `minutes` before now. Used for today's events, inside one regen interval. */
export function minutesAgo(minutes) {
  return new Date(Date.now() - minutes * 60_000).toISOString();
}

/** Five days of a flawless spine clear, at 20 XP each against the Regular goal. */
const P3_STREAK_NODES = [
  "lesson:aromaticity",
  "lesson:aromatic_substitution",
  "lesson:eas_directing_effects",
  "lesson:carbonyl_chemistry",
  "lesson:enols_and_enolates",
];

export function hudSeed() {
  const journal = [{ kind: "settings", at: noonDaysAgo(6), tz: LOCAL_TZ, dailyGoal: "regular" }];
  for (let i = 0; i < P3_STREAK_NODES.length; i += 1) {
    journal.push({
      kind: "node_cleared",
      at: noonDaysAgo(5 - i),
      tz: LOCAL_TZ,
      nodeId: P3_STREAK_NODES[i],
      nodeKind: "reaction",
      flawless: true,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: 3,
    });
  }
  // A week's worth of side work: three resonance finds and one review drill.
  journal.push({ kind: "resonance_found", at: noonDaysAgo(5), tz: LOCAL_TZ, nodeId: "lesson:conjugation_and_mo" });
  journal.push({ kind: "resonance_found", at: noonDaysAgo(4), tz: LOCAL_TZ, nodeId: "lesson:diene_addition" });
  journal.push({ kind: "resonance_found", at: noonDaysAgo(2), tz: LOCAL_TZ, nodeId: "lesson:phenols" });
  journal.push({
    kind: "node_cleared",
    at: noonDaysAgo(3),
    tz: LOCAL_TZ,
    nodeId: "review:week-1",
    nodeKind: "review",
    flawless: false,
    stepsInOneSitting: 1,
    spine: false,
    difficulty: 3,
  });
  // Bloom's lab coat, bought with the Arrow Pusher award. This is what takes
  // 262 earned down to the 137 the header shows.
  journal.push({ kind: "spend", at: minutesAgo(10), tz: LOCAL_TZ, sink: "costume", cost: 125, ref: "goggles-and-lab-coat" });
  // Today, inside one regeneration interval: two nodes entered, 13 charge gone.
  journal.push({ kind: "node_started", at: minutesAgo(9), tz: LOCAL_TZ, nodeId: "lesson:diels_alder", nodeKind: "concept" });
  journal.push({ kind: "node_started", at: minutesAgo(7), tz: LOCAL_TZ, nodeId: "lesson:amines", nodeKind: "reaction" });
  journal.push({ kind: "resonance_found", at: minutesAgo(6), tz: LOCAL_TZ, nodeId: "lesson:diels_alder" });
  journal.push({
    kind: "node_cleared",
    at: minutesAgo(5),
    tz: LOCAL_TZ,
    nodeId: "unit:aromatics-quiz",
    nodeKind: "quiz",
    flawless: false,
    stepsInOneSitting: 3,
    spine: true,
    difficulty: 3,
  });
  return journal;
}

/** The stored blob P3 opens with. The course is the mastery denominator; see above. */
export const P3_SEED = hudSeed();
export const P3_STORED = { course: "orgo_2", startTopics: [], onboardingDone: true };

/**
 * The same account, with today already counted.
 *
 * The rest moment above is deliberately the state a student OPENS the app in:
 * goal unmet, flame guttering. That leaves the lit half of every pair
 * unphotographed, and "the flame is lit when today counted" is half of what
 * this piece claims. So this seed appends one more flawless spine clear today,
 * which pays 20 XP against the Regular goal and therefore meets it: the ring
 * closes and turns, the flame lights, and the streak reads six.
 *
 * Its assertion is structural rather than numeric, on purpose. The rest moment
 * pins all four numbers exactly, because the seed was built backwards from
 * them and a drift there is a bug. Here what matters is the STATE, so the check
 * is that the goal reads met and the day reads counted; pinning the arithmetic
 * a second time would only be a second place to update.
 */
export function hudLitSeed() {
  return [
    ...hudSeed(),
    {
      kind: "node_cleared",
      at: minutesAgo(3),
      tz: LOCAL_TZ,
      nodeId: "lesson:diels_alder",
      nodeKind: "reaction",
      flawless: true,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: 3,
    },
  ];
}

export const P3_LIT_SEED = hudLitSeed();

/** The tab the header is judged on. */
export const HUD_HASH = "#/pathway";

/**
 * What the seed must produce, read off the rendered header and never recomputed.
 *
 * THREE ITEMS, not four. Round two moved the daily goal out of the status row
 * and into the header's own bottom edge, because the blind critic's finding was
 * that seven equal chips left the pacing resource with no primacy. The goal is
 * still asserted, and by the same sentence it always carried; it is read off
 * the progressbar now instead of off a button.
 */
const HUD_EXPECTED = {
  diamonds: "137 diamonds",
  streak: "Streak, 5 days, today not counted yet",
  charge: "Charge, 17 of 30",
};

/** The goal, now the header's bottom edge rather than one of the chips. */
const HUD_EXPECTED_GOAL = "Daily goal, 14 of 20 XP today";

/**
 * How much bigger the dominant readout has to be than its neighbours.
 *
 * The verdict asked for "roughly 1.6 to 2x the type size of its neighbours",
 * and the build answers with --text-scale-2xl against --text-scale-sm, which is
 * exactly 2. This floor is what stops a later type scale edit from quietly
 * flattening the row back to what lost round one, so it is a check on the
 * finding and not on the implementation.
 */
const HUD_DOMINANT_MIN_RATIO = 1.6;

/**
 * Everything about the header a shot cannot show a critic: what each readout
 * claims, whether the row overflowed, whether every target is 44px, whether the
 * dominant chip is actually dominant, and how close the charge meter gets to
 * the header's bottom edge.
 */
async function readHud(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const headerRect = header === null ? null : header.getBoundingClientRect();
    const fontPx = (node) => (node === null ? 0 : Number.parseFloat(getComputedStyle(node).fontSize));
    const items = [...document.querySelectorAll("[data-hud]")].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.getAttribute("data-hud"),
        label: node.getAttribute("aria-label"),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
        // The number's own type size, which is what the verdict measured.
        numberPx: fontPx(node.querySelector(".hud-charge-value") ?? node.querySelector("span:last-child")),
      };
    });
    const goal = document.querySelector(".hud-goal");
    const meter = document.querySelector("[data-hud='charge'] .hud-meter");
    const sheet = document.querySelector("dialog[data-hud-sheet][open]");
    return {
      items,
      goalLabel: goal === null ? null : goal.getAttribute("aria-label"),
      // How far the charge meter's bottom sits above the header's bottom edge.
      // The critic measured the round one sliver colliding with the divider, so
      // the clearance is measured rather than asserted in a comment.
      meterClearancePx:
        meter === null || headerRect === null
          ? -1
          : Math.round((headerRect.bottom - meter.getBoundingClientRect().bottom) * 10) / 10,
      // "Must work at 390px wide without wrapping the header": a header whose
      // content is wider than its box has either overflowed or wrapped, and
      // both are the same failure to a reader.
      headerScrollWidth: header === null ? -1 : header.scrollWidth,
      headerClientWidth: header === null ? -1 : header.clientWidth,
      headerHeight: headerRect === null ? -1 : Math.round(headerRect.height),
      sheet: sheet === null ? null : sheet.getAttribute("data-hud-sheet"),
      sheetHeadline: sheet === null ? "" : (sheet.querySelector("h2")?.textContent ?? "").trim(),
      sheetLines: sheet === null ? [] : [...sheet.querySelectorAll("p")].map((p) => (p.textContent ?? "").trim()),
      // The unit row. Its presence is what makes the coach mark a moment rather
      // than a definition, so it is a reached / not reached fact.
      sheetUnits: sheet === null ? 0 : sheet.querySelectorAll(".hud-pip, .hud-day").length,
      sheetSpotlight: sheet === null ? 0 : sheet.querySelectorAll(".hud-spot").length,
      sheetCtas: sheet === null ? 0 : sheet.querySelectorAll(".hud-panel-cta").length,
      sheetEyebrows: sheet === null ? 0 : sheet.querySelectorAll("[data-hud-eyebrow]").length,
    };
  });
}

/**
 * Three readouts, every target at least 44 by 44, a dominant chip that really
 * is dominant, a charge meter clear of the header's bottom edge, and a header
 * that did not overflow its own box. True of every HUD moment whatever the
 * numbers say.
 *
 * CLAUDE.md's budget table sets the 44 point floor. Half a pixel of slack,
 * because a fractional layout can land on 43.98.
 */
function hudGeometryHolds(state) {
  if (state.items.length !== 3) return false;
  for (const item of state.items) {
    if (item.width < 43.5 || item.height < 43.5) return false;
  }
  const charge = state.items.find((item) => item.id === "charge");
  const others = state.items.filter((item) => item.id !== "charge");
  if (charge === undefined || others.length === 0) return false;
  const biggestNeighbour = Math.max(...others.map((item) => item.numberPx));
  if (biggestNeighbour <= 0) return false;
  if (charge.numberPx / biggestNeighbour < HUD_DOMINANT_MIN_RATIO) return false;
  if (state.meterClearancePx < 4) return false;
  return state.headerScrollWidth <= state.headerClientWidth + 1;
}

/** True when every readout, and the goal edge, says what the seed built it to say. */
function hudMatches(state) {
  if (!hudGeometryHolds(state)) return false;
  if (state.goalLabel !== HUD_EXPECTED_GOAL) return false;
  return state.items.every((item) => HUD_EXPECTED[item.id] === item.label);
}

/** The label a readout is currently showing, or the empty string. */
function labelOf(state, id) {
  return state.items.find((item) => item.id === id)?.label ?? "";
}

/** The header with today's goal met: ring closed, flame lit, streak up one. */
export async function driveHudLit(page, { onTrigger = null } = {}) {
  await page.waitForSelector("[data-hud='charge']", { timeout: 10_000 });
  await page.waitForSelector("[role='region']", { timeout: 10_000 }).catch(() => {});
  await sleep(500);
  const at = Date.now();
  const trigger = onTrigger === null ? null : await onTrigger(at);
  const state = await readHud(page);
  const reached =
    hudGeometryHolds(state) &&
    (state.goalLabel ?? "").startsWith("Daily goal met") &&
    labelOf(state, "streak").endsWith("today counted");
  return { moment: "hud-lit", reached, at, trigger, state };
}

/** The header at rest on the pathway. The burst runs from the moment it settles. */
export async function driveHudRest(page, { onTrigger = null } = {}) {
  await page.waitForSelector("[data-hud='charge']", { timeout: 10_000 });
  // The pathway is lazy; a shot of its skeleton is a shot of a loading state.
  await page.waitForSelector("[role='region']", { timeout: 10_000 }).catch(() => {});
  await sleep(500);
  const at = Date.now();
  const trigger = onTrigger === null ? null : await onTrigger(at);
  const state = await readHud(page);
  return { moment: "hud-rest", reached: hudMatches(state), at, trigger, state };
}

/**
 * The charge coach mark, opened by a real press on the charge readout.
 *
 * The press is handled on pointerdown, so the burst's first frame catches the
 * pressed state and the dialog's entry together, which is what CLAUDE.md's
 * press contract is actually claiming.
 */
export async function driveHudCharge(page, { onTrigger = null } = {}) {
  await page.waitForSelector("[data-hud='charge']", { timeout: 10_000 });
  await page.waitForSelector("[role='region']", { timeout: 10_000 }).catch(() => {});
  await sleep(500);
  const point = await page.evaluate(() => {
    const node = document.querySelector("[data-hud='charge']");
    if (node === null) return null;
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  const at = await press(page, point, "charge readout");
  const trigger = onTrigger === null ? null : await onTrigger(at);
  await page.waitForSelector("dialog[data-hud-sheet='charge'][open]", { timeout: 5_000 }).catch(() => {});
  const state = await readHud(page);
  const reached =
    hudMatches(state) &&
    state.sheet === "charge" &&
    // NOT "17 of 30 charge". The verdict called that a labelled fraction that
    // reads as a settings tooltip, and asked for a moment: a rule, a drawn row
    // of units, a spotlight cut around the counter, one large CTA. Each of those
    // is a condition here, so a build that drifts back to a definition fails
    // rather than merely looking worse.
    state.sheetHeadline === "Mistakes never cost charge" &&
    state.sheetUnits === 30 &&
    state.sheetSpotlight === 1 &&
    state.sheetCtas === 1 &&
    // The word CHARGE sat directly above a headline that said charge again. The
    // eyebrow is gone from the panel entirely; this is what keeps it gone.
    state.sheetEyebrows === 0 &&
    // The one sentence the piece is required to carry. Asserted verbatim,
    // because it is the promise ECONOMY.md makes about wrong answers.
    state.sheetLines.some((line) => line.includes("Starting a node costs some. Getting things wrong never does."));
  return { moment: "hud-charge", reached, at, trigger, state };
}

/**
 * The streak coach mark, opened by a real press on the flame.
 *
 * It is here because the week strip is the other half of the claim this piece
 * makes about coach marks: that they are moments rather than definitions. Seven
 * squares with five of them lit and today drawn as the goal ring is the same
 * gesture the bar uses for its hearts, applied to the resource the bar keeps in
 * a different screen entirely. A claim with no frame behind it is the sort of
 * thing a still capture quietly hides.
 */
export async function driveHudStreak(page, { onTrigger = null } = {}) {
  await page.waitForSelector("[data-hud='streak']", { timeout: 10_000 });
  await page.waitForSelector("[role='region']", { timeout: 10_000 }).catch(() => {});
  await sleep(500);
  const point = await page.evaluate(() => {
    const node = document.querySelector("[data-hud='streak']");
    if (node === null) return null;
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  const at = await press(page, point, "streak readout");
  const trigger = onTrigger === null ? null : await onTrigger(at);
  await page.waitForSelector("dialog[data-hud-sheet='streak'][open]", { timeout: 5_000 }).catch(() => {});
  const state = await readHud(page);
  const reached =
    hudMatches(state) &&
    state.sheet === "streak" &&
    state.sheetHeadline === "5 day streak" &&
    // Seven days drawn, a spotlight cut round the flame, one CTA, no eyebrow.
    state.sheetUnits === 7 &&
    state.sheetSpotlight === 1 &&
    state.sheetCtas === 1 &&
    state.sheetEyebrows === 0 &&
    // ECONOMY.md's release valve, named before a student needs it rather than
    // after they have lost something.
    state.sheetLines.some((line) => line.includes("daily goal"));
  return { moment: "hud-streak", reached, at, trigger, state };
}

/* ==================================================== P4, the streak screen ==
 *
 * The stage that follows the reward moment on the one day it applies. It is
 * reached by REAL CLICKS from the lesson (three right answers, Finish lesson,
 * Continue past the combo interstitial, Continue past the reward moment) and
 * the only thing seeded is history, for the same reason P3's header is seeded:
 * a 47 day streak is 47 days and no sequence of presses inside one session can
 * produce one.
 *
 * WHY THIS EXACT SEED. The piece asks for a 47 day streak where YESTERDAY was
 * an auto rest day and today's goal has just been met, so both the rest day
 * glyph and the streak beat are on screen at once, and the seed is worked
 * backwards from that against packages/economy/src/rules.ts:
 *
 *   THE DAY COUNT. A day counts when the daily XP goal is met, and a concept
 *   node's first clear pays exactly the Casual goal of 10. So one clear a day
 *   on days 47 back through 2 is 46 counted days, day 1 carries no clear at
 *   all, and today's lesson is the 47th. The 46 are unbroken, so no earlier
 *   week ever spends its rest day and the one free rest day is still there
 *   when yesterday needs it.
 *
 *   THE REST DAY IS NOT SEEDED, and that is the point. Nothing in the journal
 *   says "rest day"; the gap is simply a day with no events, and derive.ts
 *   applies the free weekly rest day to it on its own. The capture then reads
 *   the glyph back off the rendered strip, so a change to the protection order
 *   fails the capture instead of quietly shipping a shot of a broken streak.
 *
 *   THE FREEZE. One streak_freeze spend, ten days back. The rest day is spent
 *   before any freeze (derive.ts's own order), so yesterday takes the free one
 *   and this stays HELD: the freeze row shows one of two slots filled and the
 *   purchase card is live. 46 first clears pay 10 diamonds each, so the 75 is
 *   comfortably affordable and the card is not shot in its disabled state.
 *
 * TWO MORE MOMENTS, named so a judge can leave them out of the blind pair. The
 * milestone band and the exam window banner are both claims this piece makes,
 * and a claim with no frame behind it is the sort of thing a still capture
 * quietly hides. `streak-milestone` lands today on day 30; `streak-exam` sets
 * an exam date nine days out, which is the sentence ECONOMY.md specifies.
 */

/** One concept clear, which pays exactly the Casual daily goal of 10 XP. */
function countedDay(daysAgo, nodeId) {
  return {
    kind: "node_cleared",
    at: noonDaysAgo(daysAgo),
    tz: LOCAL_TZ,
    nodeId,
    nodeKind: "concept",
    flawless: false,
    stepsInOneSitting: 1,
    spine: false,
    difficulty: 2,
  };
}

/**
 * A run of counted days ending today-exclusive, on the Casual goal, with the
 * days named in `skip` left empty. Today is deliberately empty too: the lesson
 * the drive plays is what counts it.
 */
function streakHistory(daysBack, skip = []) {
  const journal = [{ kind: "settings", at: noonDaysAgo(daysBack + 1), tz: LOCAL_TZ, dailyGoal: "casual" }];
  for (let daysAgo = daysBack; daysAgo >= 1; daysAgo -= 1) {
    if (skip.includes(daysAgo)) continue;
    journal.push(countedDay(daysAgo, `seed:day-${daysAgo}`));
  }
  return journal;
}

/** 46 counted days, yesterday empty, one freeze held. Today's lesson makes 47. */
export function p4RestSeed() {
  return [
    ...unlockSeed(),
    ...streakHistory(47, [1]),
    { kind: "spend", at: noonDaysAgo(10), tz: LOCAL_TZ, sink: "streak_freeze", cost: 75, ref: "seed" },
  ];
}

/** 29 counted days with no gaps, so today's clear is the 30 day milestone. */
export function p4MilestoneSeed() {
  return [...unlockSeed(), ...streakHistory(29)];
}

/**
 * Twelve counted days and an exam nine days out.
 *
 * The settings event is stamped 20 days back so the exam date is in force for
 * the whole run; the window itself is the last 14 days before the exam, which
 * is where the seed's later days and today sit.
 */
export function p4ExamSeed() {
  const examDate = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
  return [
    ...unlockSeed(),
    ...streakHistory(12),
    { kind: "settings", at: noonDaysAgo(20), tz: LOCAL_TZ, examDate },
  ];
}

export const P4_SEEDS = {
  rest: p4RestSeed(),
  milestone: p4MilestoneSeed(),
  exam: p4ExamSeed(),
};

/** What each P4 moment must be showing, read off the rendered stage. */
const P4_EXPECTED = {
  rest: { days: 47, saved: "rest_day", milestone: "", exam: "false", rest: 1, freeze: 0, freezesHeld: 1 },
  milestone: { days: 30, saved: "", milestone: "30", exam: "false", rest: 0, freeze: 0, freezesHeld: 0 },
  exam: { days: 13, saved: "", milestone: "", exam: "true", rest: 0, freeze: 0, freezesHeld: 0 },
};

/** Everything about the streak stage a still cannot prove: the state behind the picture. */
async function readStreak(page) {
  return page.evaluate(() => {
    const stage = document.querySelector("[data-streak]");
    if (stage === null) return null;
    const cells = [...stage.querySelectorAll(".streak-day")];
    const buy = stage.querySelector("[data-buy-freeze]");
    const rect = (node) => (node === null ? null : node.getBoundingClientRect());
    const continueButton = [...stage.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Continue") ?? null;
    const box = rect(continueButton);
    const buyBox = rect(buy);
    const scroller = stage.querySelector(".overflow-y-auto");
    return {
      done: stage.getAttribute("data-streak"),
      days: Number(stage.getAttribute("data-streak-days")),
      saved: stage.getAttribute("data-streak-saved") ?? "",
      milestone: stage.getAttribute("data-streak-milestone") ?? "",
      exam: stage.getAttribute("data-streak-exam") ?? "",
      freezesHeld: Number(stage.getAttribute("data-streak-freezes")),
      cells: cells.length,
      kinds: cells.map((cell) => cell.getAttribute("data-kind")),
      note: (stage.querySelector(".streak-note")?.textContent ?? "").trim(),
      examLine: (stage.querySelector(".streak-exam")?.textContent ?? "").trim(),
      // The 44 point floor from CLAUDE.md's budget table, on the two controls
      // this screen owns. Half a pixel of slack for fractional layout.
      buyTarget: buyBox === null ? null : { w: Math.round(buyBox.width * 10) / 10, h: Math.round(buyBox.height * 10) / 10 },
      continueTarget: box === null ? null : { w: Math.round(box.width * 10) / 10, h: Math.round(box.height * 10) / 10 },
      // A moment whose CTA is below the fold is not a moment.
      continueOnScreen: box !== null && box.top >= 0 && box.bottom <= window.innerHeight,
      // A stage whose content column scrolls has more on it than a phone can
      // hold, which is the dashboard failure this screen is one edit away from
      // at any time.
      scrolls: scroller !== null && scroller.scrollHeight > scroller.clientHeight + 1,
    };
  });
}

/** True of every P4 moment whatever the numbers say. */
function streakGeometryHolds(state) {
  if (state === null) return false;
  if (state.cells !== 7) return false;
  if (!state.continueOnScreen || state.scrolls) return false;
  if (state.continueTarget === null || state.continueTarget.h < 43.5) return false;
  if (state.buyTarget !== null && (state.buyTarget.h < 43.5 || state.buyTarget.w < 43.5)) return false;
  // Nothing on this screen may frame a day as lost. It is asserted on the
  // RENDERED text, not on the model, because the model is not what a student
  // reads. The bar's own streak screen fails this line.
  const words = /\b(lose|lost|losing|reset|resets|broke|breaks|failed)\b/i;
  if (words.test(state.note) || words.test(state.examLine)) return false;
  return true;
}

/**
 * Play the intro lesson, pass the reward moment, and land on the streak screen.
 *
 * The burst hangs on the press that opens it, which is the reward moment's own
 * Continue: that press is the transition a critic is judging, so the frames are
 * measured from it and not from an arbitrary settle.
 */
export async function driveStreak(page, seedName, { onTrigger = null } = {}) {
  for (let i = 0; i < INTRO.length; i += 1) {
    await typeAnswer(page, INTRO[i].value, INTRO[i].unit);
    await press(page, await buttonByText(page, "Check"), `Check ${i + 1}`);
    await page.waitForSelector('[data-reaction="correct"]', { timeout: 5_000 });
    if (i < INTRO.length - 1) {
      await press(page, await buttonByText(page, "Next"), `Next ${i + 1}`);
      await sleep(250);
    }
  }
  await press(page, await buttonByText(page, "Finish lesson"), "Finish lesson");
  await page.waitForSelector('[data-combo="3"]', { timeout: 5_000 });
  await sleep(300);
  await press(page, await buttonByText(page, "Continue"), "Continue (combo)");
  // The reward moment settles at 2500 ms and its Continue is the press that
  // opens this piece's stage, so the drive waits for the settled frame rather
  // than racing it.
  await page.waitForSelector('[data-reward="done"]', { timeout: 8_000 });
  await sleep(200);
  const at = await press(page, await buttonByText(page, "Continue"), "Continue (reward)");
  const trigger = onTrigger === null ? null : await onTrigger(at);
  await page.waitForSelector('[data-streak="done"]', { timeout: 8_000 }).catch(() => {});
  const state = await readStreak(page);
  const want = P4_EXPECTED[seedName];
  const reached =
    streakGeometryHolds(state) &&
    state.done === "done" &&
    state.days === want.days &&
    state.saved === want.saved &&
    state.milestone === want.milestone &&
    state.exam === want.exam &&
    state.freezesHeld === want.freezesHeld &&
    state.kinds.filter((kind) => kind === "rest").length === want.rest &&
    state.kinds.filter((kind) => kind === "freeze").length === want.freeze &&
    // Today is the last square and today counted, or the moment on screen is
    // some other account's evening.
    state.kinds[6] === "counted";
  return { moment: `streak-${seedName}`, reached, at, trigger, state };
}

/* ================================================ P5, the Charge surfaces ==
 *
 * Three states on the pathway, reached by pressing a real node.
 *
 * WHY THE JOURNAL IS SEEDED. Charge is f(journal, now) like everything else, so
 * a meter at 14 is two node entries and an empty one is four. No sequence of
 * presses inside one session can produce an exam date fourteen days out either.
 * The seed is EconomyEvents and nothing else; every number on the sheet still
 * comes out of deriveEconomy, and the assertions below read the RENDERED sheet
 * rather than the seed that built it.
 *
 * WHY THE PATHWAY AND NOT A LESSON. The entry cost is shown at the door, which
 * is the pathway node, and docs/ECONOMY.md charges on entry and never per
 * question. The press that opens the sheet is the press a student makes when
 * they choose what to do next, so that is the press the burst hangs on.
 *
 * THE NODE PRESSED is the first playable spine slab of the Orgo II map,
 * "Allylic/resonance delocalization", which is a resonance hunt and therefore a
 * REACTION node at 8 charge (PathwayTab's economyKindFor records the mapping).
 * It is picked by position rather than by id so the moment survives an
 * authoring wave reordering the map, and the drive asserts the cost it found.
 */

/** The tab the Charge sheet is opened from. Same tab P3 is judged on. */
export const PATHWAY_HASH = "#/pathway";

/** The course the sheet is opened in. Mastery's denominator, and the map's own track. */
export const P5_STORED = { course: "orgo_2", startTopics: [], onboardingDone: true };

/**
 * Entering `count` reaction nodes today, two minutes apart, the most recent
 * `sinceMinutes` ago.
 *
 * The two minute spacing is not cosmetic. Regeneration accrues over the whole
 * span the journal covers, so entries spread over 47 minutes hand a point back
 * mid drain and an account that should read empty reads 1. Tight entries are
 * also what a real sitting looks like.
 *
 * The age of the last entry is load bearing for the empty state: regeneration
 * is one point per 30 minutes computed from server time on read, so an entry 12
 * minutes ago puts the refilling pip two fifths of the way up and the countdown
 * at 18 minutes. A seed that spent everything a second ago would draw an empty
 * pip and read as a meter that is not coming back.
 */
function entries(count, sinceMinutes) {
  const events = [];
  for (let i = 0; i < count; i += 1) {
    events.push({
      kind: "node_started",
      at: minutesAgo(sinceMinutes + (count - 1 - i) * 2),
      tz: LOCAL_TZ,
      nodeId: `seed:entry-${i}`,
      nodeKind: "reaction",
    });
  }
  return events;
}

/**
 * A working meter: 30 cap, two entries gone, 14 left.
 *
 * Deliberately not full. A full meter draws thirty identical lit pips, so the
 * eight about to leave are the only thing on the row with an edge, which makes
 * the picture easier than the one a student usually sees. Fourteen lit, eight
 * of them outlined and sixteen dark is the honest composition.
 */
export function p5ReadySeed() {
  return [{ kind: "settings", at: noonDaysAgo(6), tz: LOCAL_TZ, dailyGoal: "regular" }, ...entries(2, 12)];
}

/**
 * A drained meter: four entries, 32 charge against a cap of 30, so nothing is
 * left but the point that has been coming back for 18 minutes.
 *
 * One clear yesterday puts a real balance behind the top up button, and it is
 * deliberately UNDER 60: the interesting screen is the one where the paid way
 * out is not free money, because that is the screen where the free way out has
 * to carry the student on its own.
 */
export function p5EmptySeed() {
  return [
    { kind: "settings", at: noonDaysAgo(6), tz: LOCAL_TZ, dailyGoal: "regular" },
    {
      kind: "node_cleared",
      at: noonDaysAgo(1),
      tz: LOCAL_TZ,
      nodeId: "lesson:aromaticity",
      nodeKind: "reaction",
      flawless: true,
      stepsInOneSitting: 1,
      spine: true,
      difficulty: 3,
    },
    ...entries(4, 12),
  ];
}

/**
 * The exam window: an exam nine days out, and a meter that is NOT full.
 *
 * The empty half matters. Inside the window Charge is off, so a sheet drawing a
 * full meter would be indistinguishable from a well rested account and the
 * claim "the meter is replaced rather than shown full" could not be checked
 * from a still. This account has spent everything today and the sheet still
 * says no limits, which is only true because the meter is gone.
 */
export function p5ExamSeed() {
  const examDate = new Date(Date.now() + 9 * 86_400_000).toISOString().slice(0, 10);
  return [
    { kind: "settings", at: noonDaysAgo(20), tz: LOCAL_TZ, dailyGoal: "regular", examDate },
    ...entries(4, 12),
  ];
}

/**
 * The P5 seeds as BUILDERS rather than as values, and the difference is a bug
 * this run actually hit.
 *
 * Every other piece's seed is a value computed once at import, which is fine
 * because a 47 day streak is a 47 day streak whenever the page opens. Charge is
 * not: it regenerates a point every 30 minutes from server time on read, so a
 * seed frozen at import drifts toward the next boundary while the capture walks
 * two viewports and two themes. The empty account measured 20 minutes stale on
 * the first page and 26 on the last, and a slow enough run would have handed a
 * point back mid capture and turned an empty meter into a one point meter.
 *
 * Building the journal per page pins the ages to the moment the page opens, so
 * every one of the sixteen shots is of the same account in the same state.
 */
export const P5_SEED_BUILDERS = {
  cost: p5ReadySeed,
  spend: p5ReadySeed,
  empty: p5EmptySeed,
  exam: p5ExamSeed,
};

/** Everything about the sheet a still cannot prove: the state behind the picture. */
async function readCharge(page) {
  return page.evaluate(() => {
    const sheet = document.querySelector("dialog.charge-sheet");
    const text = (node) => (node === null ? "" : (node.textContent ?? "").trim());
    const pips = [...document.querySelectorAll(".charge-pip")];
    return {
      open: sheet !== null && sheet.hasAttribute("open"),
      // MODALITY, MEASURED. The piece is built on a native <dialog> so that
      // focus trapping, Escape and the top layer are the browser's rather than
      // ours, and every one of those follows from showModal() having been the
      // call that opened it. `open` alone cannot tell that apart from an `open`
      // attribute set by hand, which renders the same panel with no focus trap,
      // no Escape and no scrim. `:modal` is the one thing that can.
      modal: sheet !== null && sheet.matches(":modal"),
      // What the scrim actually resolves to. A backdrop rule that is declared
      // and not painted is exactly the sort of thing a still hides.
      scrim: sheet === null ? "" : getComputedStyle(sheet, "::backdrop").backgroundColor,
      state: sheet === null ? "" : (sheet.getAttribute("data-charge-state") ?? ""),
      phase: sheet === null ? "" : (sheet.getAttribute("data-charge-phase") ?? ""),
      title: text(document.querySelector(".charge-title")),
      headline: text(document.querySelector(".charge-headline")),
      line: text(document.querySelector(".charge-line")),
      promise: text(document.querySelector(".charge-promise")),
      primary: text(document.querySelector("[data-charge-primary]")),
      topUp: text(document.querySelector("[data-charge-topup]")),
      note: text(document.querySelector(".charge-note")),
      pips: pips.length,
      lit: pips.filter((pip) => pip.classList.contains("is-lit")).length,
      leaving: pips.filter((pip) => pip.classList.contains("is-leaving")).length,
      refilling: pips.filter((pip) => pip.classList.contains("is-next")).length,
      band: document.querySelectorAll(".charge-exam-band").length,
      bandWord: text(document.querySelector(".charge-exam-word")),
      // Every control on the sheet, and whether it clears the 44pt floor in
      // BOTH directions. A sheet that fails this is not judgeable on a phone
      // whatever it looks like.
      targets: [...document.querySelectorAll(".charge-panel button")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { w: Math.round(rect.width), h: Math.round(rect.height) };
      }),
      hash: location.hash,
    };
  });
}

/** The 44 by 44 floor from CLAUDE.md's Budgets table, on every control. */
function targetsHold(state) {
  return state.targets.length > 0 && state.targets.every((target) => target.w >= 44 && target.h >= 44);
}

/** The centre of the first playable slab matching `selector`. */
async function firstPlayableNode(page, selector) {
  return page.evaluate((wanted) => {
    const node = document.querySelector(wanted);
    if (node === null) return null;
    node.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }, selector);
}

/** Every playable spine slab. The first one is a resonance hunt: a reaction node, 8 charge. */
const SPINE_SLAB = "a.path-node--press";

/**
 * A slab whose destination is a HASH route, which is what the commit moment
 * needs and the reason it does not press the same node the other three do.
 *
 * Two href shapes hang off this track. A beat is "#/lesson/u1-kvt" and a
 * trainer deep link is "?reaction=seq-eas#/trainer", a query and a hash, so
 * following it is a full document load. Screenshotting a page mid reload hung
 * `Page.captureScreenshot` for the whole protocol timeout on this machine, and
 * the burst's 2500 ms frame lands exactly there. A beat is a hash change: no
 * reload, and the frame is of the destination rather than of a blank document
 * being replaced. The commit being judged is the same commit either way.
 */
const BEAT_SLAB = 'a.path-node--press[href^="#/lesson/"]';

/** Open the sheet by pressing a real node, and burst from that press. */
async function openChargeSheet(page, onTrigger, selector = SPINE_SLAB) {
  await page.waitForSelector(selector, { timeout: 10_000 });
  await sleep(500);
  const at = await press(page, await firstPlayableNode(page, selector), "pathway node");
  const trigger = onTrigger === null ? null : await onTrigger(at);
  return { at, trigger };
}

/**
 * The entry cost, before anything is spent.
 *
 * The assertions are the piece's own claims, so a build that drifts back to a
 * silent debit fails rather than merely looking worse: the sheet is open on the
 * ready state, the meter is drawn as its thirty units, exactly the cost is
 * drawn as LEAVING, and the sentence docs/ECONOMY.md calls load bearing is on
 * screen. The stored journal is asserted untouched: opening the sheet must not
 * spend anything.
 */
export async function driveChargeCost(page, { onTrigger = null } = {}) {
  const before = await page.evaluate(() => localStorage.getItem("blueberry.progress.v2") ?? "");
  const { at, trigger } = await openChargeSheet(page, onTrigger);
  await page.waitForSelector("dialog.charge-sheet[open]", { timeout: 5_000 }).catch(() => {});
  const state = await readCharge(page);
  const after = await page.evaluate(() => localStorage.getItem("blueberry.progress.v2") ?? "");
  const reached =
    state.open &&
    state.modal &&
    state.state === "ready" &&
    state.phase === "idle" &&
    state.pips === 30 &&
    state.lit === 14 &&
    state.leaving === 8 &&
    // The PRICE is the headline. The node's name is above it, not in its
    // place: a sheet whose headline is sometimes a title and sometimes a
    // notice is two sheets, and the price is the thing this one exists to say.
    state.headline === "8 charge to start" &&
    state.title === "Allylic/resonance delocalization" &&
    state.line === "You will have 6 left, and it refills on its own." &&
    state.promise.includes("Wrong answers cost nothing") &&
    state.primary === "Start" &&
    targetsHold(state) &&
    // NOTHING IS SPENT BY LOOKING. The whole point of the state is that the
    // price is shown before the debit, so the stored journal is byte identical.
    after === before;
  return { moment: "charge-cost", reached, at, trigger, state };
}

/**
 * The commit, which is where the halo thins.
 *
 * The burst hangs on the Start press, so frame 0 is the pressed state with the
 * meter still full, 400 is mid drain, and 900 is the settled spent frame. The
 * route changes at 1000 ms by design, so the 2500 ms frame is the destination:
 * this moment is a TRANSITION and its last frame is the payoff, which is said
 * here rather than left for a judge to work out.
 */
export async function driveChargeSpend(page, { onTrigger = null } = {}) {
  await openChargeSheet(page, null, BEAT_SLAB);
  await page.waitForSelector("dialog.charge-sheet[open]", { timeout: 5_000 });
  await sleep(400);
  const point = await page.evaluate(() => {
    const button = document.querySelector("[data-charge-primary]");
    if (button === null) return null;
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  const at = await press(page, point, "Start");
  // Read the drain WHILE it is happening. After the navigation the sheet is
  // gone, so a check that ran only at the end could never tell an animated
  // commit from an instant one.
  const during = await readCharge(page);
  const spent = await page.evaluate(() =>
    (localStorage.getItem("blueberry.progress.v2") ?? "").includes("node_started"),
  );
  const trigger = onTrigger === null ? null : await onTrigger(at);
  // WAIT FOR THE ARRIVAL RATHER THAN FOR THE CALLER. The commit holds the sheet
  // for a second so the drain can be read, and the first pass checked the
  // destination immediately after onTrigger returned. That made the assertion a
  // function of how long the CALLER took: the frame burst runs to 2500 ms and
  // passed, the contrast audit measures one 300 ms frame and failed on a commit
  // that was working perfectly. A drive must assert the same thing whoever
  // calls it.
  await page.waitForFunction(() => window.location.hash.startsWith("#/lesson/"), { timeout: 5_000 }).catch(() => {});
  const state = await readCharge(page);
  const reached =
    during.modal &&
    during.phase === "spending" &&
    // A beat is a concept node, so five pips are on their way out rather than
    // the eight the other three moments show. Both numbers come from
    // CHARGE_COST in rules.ts by way of the sheet; neither is typed in the app.
    during.leaving === 5 &&
    // The spend reached the journal, which is what the animation is playing.
    spent &&
    // And the student arrived where they were going.
    !state.open;
  return { moment: "charge-spend", reached, at, trigger, state: { ...state, during: during.phase } };
}

/**
 * Zero charge. Bloom flat grey and sleepy, the refill drawn and dated, and the
 * free way out as the primary.
 */
export async function driveChargeEmpty(page, { onTrigger = null } = {}) {
  const { at, trigger } = await openChargeSheet(page, onTrigger);
  await page.waitForSelector("dialog.charge-sheet[open]", { timeout: 5_000 }).catch(() => {});
  const state = await readCharge(page);
  const reached =
    state.open &&
    state.modal &&
    state.state === "empty" &&
    state.pips === 30 &&
    state.lit === 0 &&
    // The point that is on its way back. It is the difference between a limiter
    // drawn going away and one drawn coming back, and it is the reason
    // docs/ECONOMY.md permits the mechanic at all.
    state.refilling === 1 &&
    state.headline === "Charge refills on its own" &&
    // A real plural in a real capital. "unit quizs cost 10" shipped once.
    state.line.startsWith("Reaction nodes cost 8, and you have 0.") &&
    /Next point in \d+ min/.test(state.line) &&
    /full by /.test(state.line) &&
    // The honest way out is the PRIMARY, and it is true: review drills are
    // priced at 0 in rules.ts.
    state.primary === "Review drills are always free" &&
    state.topUp.includes("60") &&
    state.promise.includes("Being wrong has never cost you charge") &&
    targetsHold(state);
  return { moment: "charge-empty", reached, at, trigger, state };
}

/**
 * The exam window. The meter is REPLACED, which is checkable: there is no pip
 * on the sheet at all, and the band is in its place.
 */
export async function driveChargeExam(page, { onTrigger = null } = {}) {
  const { at, trigger } = await openChargeSheet(page, onTrigger);
  await page.waitForSelector("dialog.charge-sheet[open]", { timeout: 5_000 }).catch(() => {});
  const state = await readCharge(page);
  const reached =
    state.open &&
    state.modal &&
    state.state === "exam" &&
    // Not "thirty pips all lit". Replaced.
    state.pips === 0 &&
    state.band === 1 &&
    state.headline === "Exam in 9 days. No limits until then." &&
    // The meter's readout, in the meter's slot. Not the headline's sentence
    // repeated: see charge.css's exam band block for why it stopped being one.
    state.bandWord === "Unlimited" &&
    state.primary === "Start" &&
    targetsHold(state);
  return { moment: "charge-exam", reached, at, trigger, state };
}

/**
 * Every moment by name: the seed it needs and the drive that reaches it. A
 * caller opens the moment's `hash` (LESSON_HASH unless the entry names another)
 * with `seed` and `stored`, then awaits `drive(page, options)`.
 */
export const MOMENTS = {
  "feedback-correct": { seed: null, drive: (page, options) => driveFeedback(page, "correct", options) },
  "feedback-wrong": { seed: null, drive: (page, options) => driveFeedback(page, "wrong", options) },
  combo: { seed: null, drive: (page, options) => driveCombo(page, options) },
  "reward-first": { seed: P2_SEEDS.first, drive: (page, options) => driveReward(page, "first", options) },
  "reward-streak": { seed: P2_SEEDS.streak, drive: (page, options) => driveReward(page, "streak", options) },
  "hud-rest": { seed: P3_SEED, stored: P3_STORED, hash: HUD_HASH, drive: (page, options) => driveHudRest(page, options) },
  "hud-charge": { seed: P3_SEED, stored: P3_STORED, hash: HUD_HASH, drive: (page, options) => driveHudCharge(page, options) },
  "hud-streak": { seed: P3_SEED, stored: P3_STORED, hash: HUD_HASH, drive: (page, options) => driveHudStreak(page, options) },
  "hud-lit": { seed: P3_LIT_SEED, stored: P3_STORED, hash: HUD_HASH, drive: (page, options) => driveHudLit(page, options) },
  "streak-rest": { seed: P4_SEEDS.rest, drive: (page, options) => driveStreak(page, "rest", options) },
  "streak-milestone": { seed: P4_SEEDS.milestone, drive: (page, options) => driveStreak(page, "milestone", options) },
  "streak-exam": { seed: P4_SEEDS.exam, drive: (page, options) => driveStreak(page, "exam", options) },
  // `seed` is a GETTER on these four, so every read builds a fresh journal
  // against the wall clock. See P5_SEED_BUILDERS for why Charge cannot use a
  // seed frozen at import the way the other pieces do.
  "charge-cost": { get seed() { return p5ReadySeed(); }, stored: P5_STORED, hash: PATHWAY_HASH, drive: (page, options) => driveChargeCost(page, options) },
  "charge-spend": { get seed() { return p5ReadySeed(); }, stored: P5_STORED, hash: PATHWAY_HASH, drive: (page, options) => driveChargeSpend(page, options) },
  "charge-empty": { get seed() { return p5EmptySeed(); }, stored: P5_STORED, hash: PATHWAY_HASH, drive: (page, options) => driveChargeEmpty(page, options) },
  "charge-exam": { get seed() { return p5ExamSeed(); }, stored: P5_STORED, hash: PATHWAY_HASH, drive: (page, options) => driveChargeExam(page, options) },
};
