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

/** What the seed must produce, read off the rendered header and never recomputed. */
const HUD_EXPECTED = {
  xp: "Daily goal, 14 of 20 XP today",
  diamonds: "137 diamonds",
  streak: "Streak, 5 days, today not counted yet",
  charge: "Charge, 17 of 30",
};

/**
 * Everything about the header a shot cannot show a critic: what each readout
 * claims, whether the row overflowed, and whether every target is 44px.
 */
async function readHud(page) {
  return page.evaluate(() => {
    const header = document.querySelector("header");
    const items = [...document.querySelectorAll("[data-hud]")].map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.getAttribute("data-hud"),
        label: node.getAttribute("aria-label"),
        width: Math.round(rect.width * 10) / 10,
        height: Math.round(rect.height * 10) / 10,
      };
    });
    const sheet = document.querySelector("dialog[data-hud-sheet][open]");
    return {
      items,
      // "Must work at 390px wide without wrapping the header": a header whose
      // content is wider than its box has either overflowed or wrapped, and
      // both are the same failure to a reader.
      headerScrollWidth: header === null ? -1 : header.scrollWidth,
      headerClientWidth: header === null ? -1 : header.clientWidth,
      headerHeight: header === null ? -1 : Math.round(header.getBoundingClientRect().height),
      sheet: sheet === null ? null : sheet.getAttribute("data-hud-sheet"),
      sheetHeadline: sheet === null ? "" : (sheet.querySelector("h2")?.textContent ?? "").trim(),
      sheetLines: sheet === null ? [] : [...sheet.querySelectorAll("p")].map((p) => (p.textContent ?? "").trim()),
    };
  });
}

/**
 * Four readouts, every target at least 44 by 44, and a header that did not
 * overflow its own box. True of every HUD moment whatever the numbers say.
 *
 * CLAUDE.md's budget table sets the 44 point floor. Half a pixel of slack,
 * because a fractional layout can land on 43.98.
 */
function hudGeometryHolds(state) {
  if (state.items.length !== 4) return false;
  for (const item of state.items) {
    if (item.width < 43.5 || item.height < 43.5) return false;
  }
  return state.headerScrollWidth <= state.headerClientWidth + 1;
}

/** True when every readout says what the seed was built to make it say. */
function hudMatches(state) {
  if (!hudGeometryHolds(state)) return false;
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
    labelOf(state, "xp").startsWith("Daily goal met") &&
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
    state.sheetHeadline === "17 of 30 charge" &&
    // The one sentence the piece is required to carry. Asserted verbatim,
    // because it is the promise ECONOMY.md makes about wrong answers.
    state.sheetLines.some((line) => line.includes("Starting a node costs some. Getting things wrong never does."));
  return { moment: "hud-charge", reached, at, trigger, state };
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
  "hud-lit": { seed: P3_LIT_SEED, stored: P3_STORED, hash: HUD_HASH, drive: (page, options) => driveHudLit(page, options) },
};
