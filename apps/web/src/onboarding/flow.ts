/**
 * The onboarding flow model. Pure: no React, no DOM, no clock.
 *
 * The step list is the seven-step capture mapping from the Beats and Decks
 * record (docs/reference/competitors/duolingo-live/2026-08-27-run2, p05-p19):
 * two welcome beats, how-did-you-hear, learning reason, proficiency (our
 * placement quiz), course overview, daily goal, choose path. Steps live in
 * the hash (#/start/<step>) so the browser back button steps back, which the
 * file this replaced already did and which is kept deliberately.
 *
 * No wall clock is read anywhere in this module. Elapsed seconds reach the
 * quiz machine as event data measured by the shell with performance.now(),
 * the same discipline the machine itself documents, so every function here
 * gives the same answer at 9am and at 11pm.
 */

import {
  TIME_BUDGET_SECONDS,
  QUESTION_CAP,
  type CourseId,
  type Recommendation,
  type TopicId,
} from "@blueberry/curriculum";
import { DAILY_GOAL_XP, type DailyGoalTier } from "@blueberry/economy";

/** Every student facing sentence in this flow is a draft carrying this mark. */
export const HUMAN_GATE_MARK = "[HUMAN GATE]";

/**
 * The steps, in order. "welcome" and "intro" are the two welcome beats; the
 * rest map one to one onto the record's captures.
 */
export const STEP_IDS = [
  "welcome",
  "intro",
  "hear",
  "why",
  "placement",
  "overview",
  "goal",
  "start",
] as const;

export type StepId = (typeof STEP_IDS)[number];

/**
 * Hashes the previous flow handed out and that may sit in a student's
 * history. Every route resolves, so each maps to the nearest stage of the new
 * flow rather than to a 404: "quiz" was the placement quiz; "tutorial" and
 * "lesson" were post-quiz content, nearest surviving stage is the overview;
 * "paywall" was the closing screen, nearest is choose-your-start.
 */
const LEGACY_STEPS: Readonly<Record<string, StepId>> = Object.freeze({
  quiz: "placement",
  tutorial: "overview",
  lesson: "overview",
  paywall: "start",
});

export function normalizeStep(raw: string): StepId {
  if ((STEP_IDS as readonly string[]).includes(raw)) return raw as StepId;
  const legacy = LEGACY_STEPS[raw];
  return legacy ?? "welcome";
}

export function stepIndex(step: StepId): number {
  return STEP_IDS.indexOf(step);
}

export function prevStep(step: StepId): StepId | null {
  const index = stepIndex(step);
  const previous = STEP_IDS[index - 1];
  return previous ?? null;
}

export function nextStep(step: StepId): StepId | null {
  const index = stepIndex(step);
  const next = STEP_IDS[index + 1];
  return next ?? null;
}

/** The only step a student may pass without answering. */
export const SKIPPABLE_STEPS: readonly StepId[] = Object.freeze(["hear"]);

export function isSkippable(step: StepId): boolean {
  return SKIPPABLE_STEPS.includes(step);
}

/**
 * The fat progress bar, as a percent. Visible from screen one (the welcome
 * reference shows it at 5 percent) and monotone: each step's anchor is above
 * the last, and inside the placement the bar walks its band by questions
 * asked so eight answers never move it backwards or past the overview anchor.
 */
const STEP_PERCENT: Readonly<Record<StepId, number>> = Object.freeze({
  welcome: 5,
  intro: 14,
  hear: 24,
  why: 34,
  placement: 42,
  overview: 80,
  goal: 90,
  start: 96,
});

const PLACEMENT_BAND_END = 74;

export function progressPercent(step: StepId, placementAsked = 0): number {
  const base = STEP_PERCENT[step];
  if (step !== "placement") return base;
  const capped = Math.max(0, Math.min(placementAsked, QUESTION_CAP));
  const band = PLACEMENT_BAND_END - STEP_PERCENT.placement;
  return Math.round(STEP_PERCENT.placement + (band * capped) / QUESTION_CAP);
}

/** What brings you here. Ids are stable; the words live in copy.ts. */
export const WHY_CHOICES = ["orgo2_exam", "dat_mcat", "surviving", "curious"] as const;
export type WhyChoice = (typeof WHY_CHOICES)[number];

/**
 * The learning-reason answer doubles as the placement quiz's claimed course,
 * which is what keeps the flow inside the three minute budget: no second
 * "what are you studying" screen. A reason that does not name a course claims
 * nothing and the quiz places from scratch, which the machine supports as
 * claimedCourse null. DAT and MCAT probe the identical topic walk, so one
 * chip covers both without changing what gets asked.
 */
export function claimedCourseForWhy(why: WhyChoice | null): CourseId | null {
  switch (why) {
    case "orgo2_exam":
      return "orgo_2";
    case "dat_mcat":
      return "dat";
    default:
      return null;
  }
}

/** How-did-you-hear channels. Analytics fodder only; nothing branches on it. */
export const HEAR_CHOICES = ["friend", "social", "search", "professor", "app_store", "other"] as const;
export type HearChoice = (typeof HEAR_CHOICES)[number];

/**
 * The goal picker offers three of the four tiers. "exam" is offered only
 * inside the exam window per docs/ECONOMY.md, and onboarding has no exam date
 * yet, so it is deliberately absent here.
 */
export const ONBOARDING_GOAL_TIERS: readonly DailyGoalTier[] = Object.freeze([
  "casual",
  "regular",
  "serious",
]);

export function goalXp(tier: DailyGoalTier): number {
  return DAILY_GOAL_XP[tier];
}

/** Choose your start: trust the placement, or begin at the very beginning. */
export const START_CHOICES = ["placement", "beginning"] as const;
export type StartChoice = (typeof START_CHOICES)[number];

export interface StartResolution {
  readonly course: CourseId;
  readonly startTopics: readonly TopicId[];
}

/**
 * What choose-your-start writes into the progress store. "beginning" keeps
 * the course but empties the frontier, so nothing renders as already done.
 * A missing recommendation (quiz abandoned, or a deep link straight to the
 * end) falls back to the claimed course, then to orgo_2, the one course open
 * today per app/courses.ts.
 */
export function resolveStart(
  choice: StartChoice,
  recommendation: Recommendation | null,
  claimedCourse: CourseId | null,
): StartResolution {
  const course = recommendation?.course ?? claimedCourse ?? "orgo_2";
  if (choice === "placement" && recommendation !== null) {
    return { course: recommendation.course, startTopics: recommendation.startTopics };
  }
  return { course, startTopics: [] };
}

/** The answers the flow accumulates. Held by the shell, validated here. */
export interface FlowAnswers {
  readonly hear: HearChoice | null;
  readonly why: WhyChoice | null;
  readonly goal: DailyGoalTier | null;
  readonly start: StartChoice | null;
}

export const EMPTY_ANSWERS: FlowAnswers = Object.freeze({
  hear: null,
  why: null,
  goal: null,
  start: null,
});

/**
 * CONTINUE is gated on a choice wherever there is one to make. Steps whose
 * only control is CONTINUE (or whose gate is the quiz machine's own) are
 * always passable.
 */
export function canContinue(step: StepId, answers: FlowAnswers): boolean {
  switch (step) {
    case "hear":
      return answers.hear !== null;
    case "why":
      return answers.why !== null;
    case "goal":
      return answers.goal !== null;
    case "start":
      return answers.start !== null;
    default:
      return true;
  }
}

/**
 * The placement's own budget is the machine's, re-exported so the shell and
 * the tests cite one number. CLAUDE.md's row is "under 3 minutes"; the
 * machine enforces 180 seconds including a worst case reserve per question.
 */
export const PLACEMENT_TIME_BUDGET_SECONDS = TIME_BUDGET_SECONDS;
export const PLACEMENT_QUESTION_CAP = QUESTION_CAP;

/**
 * The placement reference frame is a 2x2 grid of option chips. That layout
 * only reads when there are exactly four options and each is a short label;
 * a long option in a half-width chip wraps into porridge, so anything else
 * renders as a single column.
 */
export function useTwoColumnGrid(options: readonly { readonly text: string }[]): boolean {
  return options.length === 4 && options.every((option) => option.text.length <= 24);
}
