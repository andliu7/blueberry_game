/**
 * Every student facing sentence in onboarding, in one file, and every one of
 * them is a DRAFT.
 *
 * CLAUDE.md, loop discipline: "Phase 5 carries the onboarding funnel and the
 * free lessons, which are the highest leverage copy in the product. That makes
 * it a human gate, not a loop. There is no exit condition for 'this lesson
 * converts.'" So the flow and the frames are the deliverable here and the words
 * are the owner's. Each string carries HUMAN_GATE_MARK so a reader can see at a
 * glance which sentences are still waiting on that gate, and so a test can
 * assert none of them slipped out unmarked.
 *
 * The mark is a PREFIX rather than a suffix on purpose: a truncated line in a
 * narrow chip still shows it.
 *
 * WHY THE STRINGS LIVE APART FROM THE COMPONENTS. Two reasons and they agree.
 * The owner rewrites this file at the gate without opening a single .tsx, and
 * the test that checks the voice contract reads one module rather than walking
 * JSX. The ids are stable; only the words move.
 *
 * VOICE, per CLAUDE.md: a coach on the student's side. Name what happens
 * plainly, treat every answer as a normal answer, make the next action feel
 * within reach. No scolding, no rhetorical questions, no faux patience. These
 * drafts are written to that contract so the gate is reviewing the words and
 * not the tone from scratch.
 */

import { HUMAN_GATE_MARK, type HearChoice, type StartChoice, type WhyChoice } from "./flow";
import type { DailyGoalTier } from "@blueberry/economy";

/** Marks one draft line. Exported so a test can rebuild the expectation. */
export function draft(line: string): string {
  return `${HUMAN_GATE_MARK} ${line}`;
}

/** What the mascot says at the top of a step, and what the step is called. */
export interface StepCopy {
  /** The bubble line. The mascot asks; the chips answer. */
  readonly ask: string;
  /** A quiet line under the chips. Null where the step needs none. */
  readonly note: string | null;
}

export const WELCOME_GREETING = draft("Hi! I'm Berry.");
export const WELCOME_PROMISE = draft("Learn organic chemistry by doing it.");
export const WELCOME_START = draft("Get started");
export const WELCOME_RETURNING = draft("I already have an account");

/*
 * THE BONDING BEAT'S TWO LINES. They teach nothing and they ask nothing, which
 * is the point of the screen (see the Bond component in Onboarding.tsx and the
 * THREE-TEACHERS quality it implements). If the human gate rewrites these, the
 * one thing to preserve is that neither line gives the student a task.
 */
export const INTRO_ASK = draft("I will be right here the whole way.");
export const INTRO_NOTE = draft("Nothing coming up is a test, and nothing is locked in.");

export const HEAR_ASK = draft("How did you hear about Blueberry?");
export const HEAR_NOTE = draft("This one is only for us. Skip it if you would rather.");
export const HEAR_SKIP = draft("Skip");

export const HEAR_LABEL: Readonly<Record<HearChoice, string>> = Object.freeze({
  friend: draft("A friend or classmate"),
  social: draft("Social media"),
  search: draft("Search"),
  professor: draft("My professor or TA"),
  app_store: draft("The App Store"),
  other: draft("Somewhere else"),
});

export const WHY_ASK = draft("What brings you to chemistry?");
export const WHY_NOTE = draft("This picks where the placement starts. Nothing is locked in.");

export const WHY_LABEL: Readonly<Record<WhyChoice, string>> = Object.freeze({
  orgo2_exam: draft("Orgo II exam prep"),
  dat_mcat: draft("DAT / MCAT"),
  surviving: draft("Surviving my course"),
  curious: draft("Curiosity"),
});

export const PLACEMENT_INTRO_ASK = draft(
  "Eight real questions, under three minutes. Skip any of them freely.",
);
export const PLACEMENT_START = draft("Start the placement");
export const PLACEMENT_SKIP_QUESTION = draft("Skip this one");
export const PLACEMENT_CHECK = draft("Check");
/** The counter over the question. `%d` slots are filled by the view. */
export const PLACEMENT_COUNTER = draft("Question %n of %total");
/** The second half of a major-product question: the ranking argument. */
export const PLACEMENT_REASON_ASK = draft("And why does that one win?");
export const PLACEMENT_DONE_ASK = draft("That is your starting point.");
export const PLACEMENT_SKIPPED_ASK = draft(
  "No placement, no problem. We will start you at the beginning.",
);

export const OVERVIEW_ASK = draft("Here is the whole course, and where you land in it.");
export const OVERVIEW_NOTE = draft(
  "Every unit ends lower than it began. That is the energy diagram, and it is also the point.",
);
/** Beside each act block: what it assumes comes from the outline, not from here. */
export const OVERVIEW_ASSUMES_LABEL = draft("Assumes");
export const OVERVIEW_TOPICS_LABEL = draft("topics");
export const OVERVIEW_START_HERE = draft("You start here");

export const GOAL_ASK = draft("How much chemistry a day?");
export const GOAL_NOTE = draft(
  "A full charge meter covers a day at every one of these. Mistakes never cost charge.",
);
export const GOAL_LABEL: Readonly<Record<DailyGoalTier, string>> = Object.freeze({
  casual: draft("Casual"),
  regular: draft("Regular"),
  serious: draft("Serious"),
  exam: draft("Exam week"),
});
/** The `%n` slots are filled by the view from the economy tables, never typed here. */
export const GOAL_XP_LINE = draft("%n XP a day");
export const GOAL_PACING_LINE = draft("about %n a day, %c of %cap charge");

export const START_ASK = draft("Where would you like to begin?");
export const START_NOTE = draft("Either way the whole course stays open to browse.");
export const START_LABEL: Readonly<Record<StartChoice, string>> = Object.freeze({
  placement: draft("Start where the placement put me"),
  beginning: draft("Start at the very beginning"),
});
export const START_FINISH = draft("Take me in");

export const CONTINUE = draft("Continue");
export const BACK_LABEL = draft("Go back");
export const PROGRESS_LABEL = draft("Getting set up");

/**
 * Fills the `%n`, `%total`, `%c` and `%cap` slots above. A tiny formatter
 * rather than template literals in the view, because the owner rewriting a
 * line at the gate must be able to move a number inside the sentence without
 * touching a component.
 *
 * THE ALTERNATION IS ORDERED LONGEST FIRST, and it is a real bug fix rather
 * than a style choice. A JavaScript regex alternation is first-match, not
 * longest-match, so `%(n|total|c|cap)` matched the `%c` branch inside `%cap`
 * and left a stray "ap" in front of the student: "16 of 30ap charge". Any slot
 * added later must keep this order, so a prefix of another slot never comes
 * first in the list.
 */
export function fill(line: string, values: Readonly<Record<string, string | number>>): string {
  return line.replace(/%(total|cap|n|c)/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

/** Every draft line this module exports, for the marking test. */
export const ALL_DRAFT_LINES: readonly string[] = Object.freeze([
  WELCOME_GREETING,
  WELCOME_PROMISE,
  WELCOME_START,
  WELCOME_RETURNING,
  INTRO_ASK,
  INTRO_NOTE,
  HEAR_ASK,
  HEAR_NOTE,
  HEAR_SKIP,
  ...Object.values(HEAR_LABEL),
  WHY_ASK,
  WHY_NOTE,
  ...Object.values(WHY_LABEL),
  PLACEMENT_INTRO_ASK,
  PLACEMENT_START,
  PLACEMENT_SKIP_QUESTION,
  PLACEMENT_CHECK,
  PLACEMENT_REASON_ASK,
  PLACEMENT_COUNTER,
  PLACEMENT_DONE_ASK,
  PLACEMENT_SKIPPED_ASK,
  OVERVIEW_ASK,
  OVERVIEW_NOTE,
  OVERVIEW_ASSUMES_LABEL,
  OVERVIEW_TOPICS_LABEL,
  OVERVIEW_START_HERE,
  GOAL_ASK,
  GOAL_NOTE,
  ...Object.values(GOAL_LABEL),
  GOAL_XP_LINE,
  GOAL_PACING_LINE,
  START_ASK,
  START_NOTE,
  ...Object.values(START_LABEL),
  START_FINISH,
  CONTINUE,
  BACK_LABEL,
  PROGRESS_LABEL,
]);
