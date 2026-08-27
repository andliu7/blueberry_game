/**
 * Mastery, and the four presentation rules ECONOMY.md calls not optional: never
 * render decay as a loss, cap the visible dip at 2 a day, ranks have a floor,
 * and lead with the claim rather than the number.
 *
 * The model is the one the brief fixes: strength 1.0 on a clear, exponential
 * decay with a half life that starts at 7 days and doubles on every successful
 * review, and a score of 100 times the difficulty weighted strength of the
 * cleared nodes over the difficulty of every node UNLOCKED. That denominator is
 * why a real student sits low early: the pathway unlocks far more than it clears.
 */

import { describe, expect, it } from "vitest";
import { deriveEconomy } from "../src/derive.ts";
import type { EconomyEvent } from "../src/journal.ts";
import { at, cleared, started, TZ } from "./helpers.ts";

const DAY = "2026-08-03";

function plusDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

describe("the score", () => {
  it("is zero for a student who has cleared nothing", () => {
    const journal = Array.from({ length: 10 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    expect(deriveEconomy(journal, at(DAY, "12:00")).mastery.score).toBe(0);
    expect(deriveEconomy(journal, at(DAY, "12:00")).mastery.rank).toBe("Reader");
  });

  it("moves about a point on one node, against a hundred node pathway", () => {
    const unlockedOnly = Array.from({ length: 100 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    const before = deriveEconomy(unlockedOnly, at(DAY, "12:00")).mastery.score;
    const after = deriveEconomy([...unlockedOnly, cleared("n0", "concept", DAY, { time: "10:00" })], at(DAY, "12:00")).mastery
      .score;
    expect(before).toBe(0);
    expect(after).toBeGreaterThan(0.8);
    expect(after).toBeLessThan(1.2);
  });

  it("weights a hard node above an easy one", () => {
    const unlockedOnly = [started("easy", "concept", DAY, "09:00"), started("hard", "concept", DAY, "09:00")];
    const easy = deriveEconomy([...unlockedOnly, cleared("easy", "concept", DAY, { time: "10:00", difficulty: 1 })], at(DAY, "12:00"));
    const hard = deriveEconomy([...unlockedOnly, cleared("hard", "concept", DAY, { time: "10:00", difficulty: 5 })], at(DAY, "12:00"));
    expect(hard.mastery.score).toBeGreaterThan(easy.mastery.score);
  });

  it("counts every unlocked node in the denominator, cleared or not", () => {
    // Read at the instant of the clear, so decay is not also in the number.
    const now = at(DAY, "10:00");
    const one = deriveEconomy([cleared("n0", "concept", DAY, { time: "10:00" })], now);
    const diluted = deriveEconomy(
      [started("n1", "tutorial", DAY, "09:00"), cleared("n0", "concept", DAY, { time: "10:00" })],
      now,
    );
    expect(one.mastery.score).toBe(100);
    expect(diluted.mastery.score).toBe(50);
  });
});

describe("decay", () => {
  const single = [cleared("n0", "concept", DAY, { time: "12:00" })];

  it("halves the strength of a cleared node after seven days", () => {
    expect(deriveEconomy(single, at(DAY, "12:00")).mastery.score).toBe(100);
    expect(deriveEconomy(single, at(plusDays(DAY, 7), "12:00")).mastery.score).toBe(50);
    expect(deriveEconomy(single, at(plusDays(DAY, 14), "12:00")).mastery.score).toBe(25);
  });

  it("doubles the half life on a review clear, so the second seven days cost nothing", () => {
    const reviewed = [...single, cleared("n0", "concept", plusDays(DAY, 7), { time: "12:00" })];
    // Back to 1.0 at the review, then a 14 day half life from there.
    expect(deriveEconomy(reviewed, at(plusDays(DAY, 7), "12:00")).mastery.score).toBe(100);
    expect(deriveEconomy(reviewed, at(plusDays(DAY, 21), "12:00")).mastery.score).toBe(50);
  });

  it("treats a correct attempt after the clear as a review too", () => {
    const attempt: EconomyEvent = {
      kind: "attempt",
      at: at(plusDays(DAY, 7), "12:00"),
      tz: TZ,
      nodeId: "n0",
      problemId: "p1",
      correct: true,
    };
    const reviewed = [...single, attempt];
    expect(deriveEconomy(reviewed, at(plusDays(DAY, 21), "12:00")).mastery.score).toBe(50);
  });

  it("does not treat the attempts that made up the first clear as reviews", () => {
    const attempt: EconomyEvent = {
      kind: "attempt",
      at: at(DAY, "11:59"),
      tz: TZ,
      nodeId: "n0",
      problemId: "p1",
      correct: true,
    };
    // The attempt precedes the clear, so the half life is still the starting 7 days.
    expect(deriveEconomy([attempt, ...single], at(plusDays(DAY, 7), "12:00")).mastery.score).toBe(50);
  });

  it("names the cleared nodes whose strength has fallen under a half", () => {
    const two = [cleared("fresh", "concept", plusDays(DAY, 8), { time: "12:00" }), ...single];
    const snapshot = deriveEconomy(two, at(plusDays(DAY, 8), "12:00"));
    expect(snapshot.mastery.cracking).toEqual(["n0"]);
  });

  it("does not call a node cracking at exactly the threshold", () => {
    expect(deriveEconomy(single, at(plusDays(DAY, 7), "12:00")).mastery.cracking).toEqual([]);
  });
});

describe("the presentation rules", () => {
  const single = [cleared("n0", "concept", DAY, { time: "12:00" })];

  it("caps the visible dip at two points a day, however harsh the model is", () => {
    const now = at(plusDays(DAY, 7), "12:00");
    const snapshot = deriveEconomy(single, now);
    // The model has fallen 50 points in a week. The display has fallen 14.
    expect(snapshot.mastery.score).toBe(50);
    expect(snapshot.mastery.visible).toBeGreaterThan(80);
    expect(snapshot.mastery.visible).toBeLessThan(82);
  });

  it("lets the visible number rise as fast as the model does", () => {
    const journal = [
      started("a", "concept", DAY, "09:00"),
      started("b", "concept", DAY, "09:00"),
      cleared("a", "concept", DAY, { time: "10:00" }),
      cleared("b", "concept", DAY, { time: "11:00" }),
    ];
    const snapshot = deriveEconomy(journal, at(DAY, "12:00"));
    expect(snapshot.mastery.score).toBeGreaterThan(99);
    expect(snapshot.mastery.visible).toBeGreaterThan(99);
  });

  it("never lowers a rank once it has been reached", () => {
    const snapshot = deriveEconomy(single, at(plusDays(DAY, 7), "12:00"));
    expect(snapshot.mastery.rank).toBe("Retrosynthesist");
    expect(snapshot.mastery.floorRank).toBe("Exam Ready");
  });

  it("names the next rank and what it takes to reach it", () => {
    const journal = Array.from({ length: 100 }, (unused, i) => started(`n${i}`, "tutorial", DAY, "09:00"));
    const snapshot = deriveEconomy(journal, at(DAY, "12:00"));
    expect(snapshot.mastery.rank).toBe("Reader");
    expect(snapshot.mastery.nextRank).toEqual({ name: "Arrow Pusher", at: 16 });
  });

  it("has no next rank at the top", () => {
    expect(deriveEconomy(single, at(DAY, "12:00")).mastery.nextRank).toBeNull();
  });

  it("pays a rank award once, on the floor rank, however far the score later sags", () => {
    const early = deriveEconomy(single, at(DAY, "12:00"));
    const late = deriveEconomy(single, at(plusDays(DAY, 30), "12:00"));
    // 125 four times plus 250 for Exam Ready, on top of the 10 for the clear.
    expect(early.diamonds.earned).toBe(10 + 125 * 4 + 250);
    expect(late.diamonds.earned).toBe(early.diamonds.earned);
  });
});
