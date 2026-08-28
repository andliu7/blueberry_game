/**
 * What the header HUD says, as data. No React, no DOM, no colours.
 *
 * docs/ECONOMY.md: "Each number on screen answers exactly one question a
 * student is actually asking." Four of the five systems are in the header (XP,
 * Diamonds, Charge, Streak); Mastery is deliberately absent, because that file
 * says "Never show Mastery inside a node" and the header is on screen inside
 * every node.
 *
 * WHY THIS IS A SEPARATE FILE. Everything the HUD decides is a function of the
 * snapshot: which flame is lit, what the ring is a fraction of, and every word
 * of the coach copy. Keeping that here means it is testable without a DOM, and
 * Hud.tsx is left with only drawing. The same split the pathway's derivePathway
 * and the placement quiz's reducer already use.
 *
 * THE COPY IS PART OF THE MODEL, on purpose. CLAUDE.md's voice rule (a coach on
 * the student's side, specific rather than generic, never scolding) is a
 * property of the sentence, and a sentence assembled inline in JSX cannot be
 * read in one place or asserted in a test. Note what is NOT here: no "you
 * should have", no rhetorical question, and nothing that prices a mistake.
 * Charge's line says the opposite out loud, because ECONOMY.md's rule 2 is the
 * whole ethical argument for the mechanic and a student has to be told it.
 *
 * NOT THROUGH t(). Same rule as the chemistry strings in i18n.ts: these state
 * what the economy did, and a mistranslated "wrong answers cost nothing" is a
 * promise broken in another language.
 */

import type { DailyGoalTier, EconomySnapshot } from "@blueberry/economy";

export type HudItemId = "xp" | "diamonds" | "streak" | "charge";

export const HUD_ITEM_IDS: readonly HudItemId[] = Object.freeze(["xp", "diamonds", "streak", "charge"]);

/** What every item carries: the header glyph's number, its label, and its coach mark. */
export interface HudReadout {
  readonly id: HudItemId;
  /** The number as it appears in the header, already formatted. */
  readonly value: string;
  /** The header button's accessible name. It says the whole state, not the glyph. */
  readonly label: string;
  /** The small line above the popover's headline: which of the five systems this is. */
  readonly eyebrow: string;
  readonly headline: string;
  /** One line of coach copy. See the header for the rules it is written under. */
  readonly line: string;
}

export interface XpReadout extends HudReadout {
  readonly id: "xp";
  /** 0 to 1, the ring's arc. Clamped, so an overshoot past the goal reads as full. */
  readonly fraction: number;
  readonly met: boolean;
  readonly today: number;
  readonly goalXp: number;
}

export interface DiamondReadout extends HudReadout {
  readonly id: "diamonds";
  readonly balance: number;
}

export interface StreakReadout extends HudReadout {
  readonly id: "streak";
  readonly days: number;
  /** Today's goal is met, so the day is counted. The flame is lit only for this. */
  readonly lit: boolean;
  /** Unmet and past the evening hour. Copy changes; the flame does not. */
  readonly atRisk: boolean;
}

export interface ChargeReadout extends HudReadout {
  readonly id: "charge";
  /** 0 to 1, the meter and Bloom's halo. 1 in the exam window. */
  readonly fraction: number;
  readonly current: number;
  readonly cap: number;
  readonly examWindow: boolean;
  /** Days until the exam, 0 on the day itself. Null outside the window. */
  readonly daysLeft: number | null;
  /** The caption under the meter in the exam window, "9d". Empty otherwise. */
  readonly daysLabel: string;
}

export interface HudModel {
  readonly xp: XpReadout;
  readonly diamonds: DiamondReadout;
  readonly streak: StreakReadout;
  readonly charge: ChargeReadout;
}

/** docs/ECONOMY.md, Daily goals. The tier is the student's own bar, so it is named. */
const TIER_LABEL: Readonly<Record<DailyGoalTier, string>> = Object.freeze({
  casual: "Casual",
  regular: "Regular",
  serious: "Serious",
  exam: "Exam mode",
});

const clamp01 = (n: number): number => (n < 0 ? 0 : n > 1 ? 1 : n);

/** "1 day" and "2 days", written once so no sentence below has to remember. */
function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "today", "tomorrow", "in 9 days". The exam window's copy reads as a date, not a count. */
function whenExam(daysLeft: number): string {
  if (daysLeft <= 0) return "today";
  if (daysLeft === 1) return "tomorrow";
  return `in ${daysLeft} days`;
}

function xpReadout(snapshot: EconomySnapshot): XpReadout {
  const { today, goalXp, goalMet, goalTier } = snapshot.xp;
  const remaining = Math.max(0, goalXp - today);
  return {
    id: "xp",
    value: String(today),
    label: goalMet
      ? `Daily goal met, ${today} XP today`
      : `Daily goal, ${today} of ${goalXp} XP today`,
    eyebrow: `${TIER_LABEL[goalTier]} goal`,
    headline: goalMet ? "Daily goal met" : `${today} of ${goalXp} XP today`,
    line: goalMet
      ? "Today counts toward your streak. Anything past here is bonus."
      : `${remaining} more XP and today counts toward your streak.`,
    fraction: goalXp <= 0 ? 1 : clamp01(today / goalXp),
    met: goalMet,
    today,
    goalXp,
  };
}

function diamondReadout(snapshot: EconomySnapshot): DiamondReadout {
  const balance = snapshot.diamonds.balance;
  return {
    id: "diamonds",
    value: String(balance),
    label: `${plural(balance, "diamond", "diamonds")}`,
    eyebrow: "Diamonds",
    headline: plural(balance, "diamond", "diamonds"),
    // ECONOMY.md, rule 2: "Nothing buys correctness." Said plainly, because a
    // student who thinks the currency might buy an answer distrusts the grade.
    line: "Earned by clearing nodes, flawless runs and streak milestones. They buy costumes and freezes, never answers.",
    balance,
  };
}

function streakReadout(snapshot: EconomySnapshot): StreakReadout {
  const { current, todayCounted, atRisk } = snapshot.streak;
  if (current === 0 && !todayCounted) {
    return {
      id: "streak",
      value: "0",
      label: "Streak, no days yet",
      eyebrow: "Streak",
      headline: "No streak yet",
      line: "Hit today's daily goal and day one is yours.",
      days: 0,
      lit: false,
      atRisk,
    };
  }
  const headline = `${current} day streak`;
  return {
    id: "streak",
    value: String(current),
    label: todayCounted
      ? `Streak, ${plural(current, "day", "days")}, today counted`
      : `Streak, ${plural(current, "day", "days")}, today not counted yet`,
    eyebrow: "Streak",
    headline,
    // ECONOMY.md, Rest days: "the release valve". A student who is told about it
    // before they need it does not spend the evening afraid of the number.
    line: todayCounted
      ? "Today is counted. Hitting your daily goal is what keeps it lit."
      : atRisk
        ? "Hit your goal today to keep it. A free rest day covers you once a week."
        : "Today is not counted yet. Hitting your daily goal is what lights it.",
    days: current,
    lit: todayCounted,
    atRisk,
  };
}

function chargeReadout(snapshot: EconomySnapshot): ChargeReadout {
  const { current, cap, examWindow, examDaysLeft } = snapshot.charge;
  if (examWindow) {
    const daysLeft = examDaysLeft ?? 0;
    return {
      id: "charge",
      // The one glyph nobody has to be taught. The number it replaces is the
      // meter, and inside the window there is no meter to read.
      value: "∞",
      label: `Charge, no limits, exam ${whenExam(daysLeft)}`,
      eyebrow: "Charge",
      headline: `No limits, exam ${whenExam(daysLeft)}`,
      // ECONOMY.md: "This is the whole ethical argument for the mechanic in one
      // gesture."
      line: "Charge is switched off until your exam. Take on as much as you want.",
      fraction: 1,
      current: cap,
      cap,
      examWindow: true,
      daysLeft,
      daysLabel: daysLeft <= 0 ? "today" : `${daysLeft}d`,
    };
  }
  return {
    id: "charge",
    value: String(current),
    label: `Charge, ${current} of ${cap}`,
    eyebrow: "Charge",
    headline: `${current} of ${cap} charge`,
    // The second sentence is mandated by ECONOMY.md's Charge rules and is the
    // difference between this meter and the one it is a correction of.
    line: "Charge refills a point every 30 minutes. Starting a node costs some. Getting things wrong never does.",
    fraction: cap <= 0 ? 0 : clamp01(current / cap),
    current,
    cap,
    examWindow: false,
    daysLeft: examDaysLeft,
    daysLabel: "",
  };
}

/** The whole header, from one snapshot. Pure: same snapshot in, same words out. */
export function hudModel(snapshot: EconomySnapshot): HudModel {
  return {
    xp: xpReadout(snapshot),
    diamonds: diamondReadout(snapshot),
    streak: streakReadout(snapshot),
    charge: chargeReadout(snapshot),
  };
}

/** The four readouts in header order, for a caller that walks them. */
export function hudReadouts(model: HudModel): readonly HudReadout[] {
  return [model.xp, model.diamonds, model.streak, model.charge];
}
