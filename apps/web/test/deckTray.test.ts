/**
 * The deck tray's fan: geometry a critic can hold a ruler to.
 *
 * The committed deck-tray image draws a symmetric hand of cards WHOLLY INSIDE
 * the phone frame AND READS EVERY NAME ON IT. Round 1 escaped the frame, so
 * this suite grew THE RULER, the exact fit inequality. Round 2 fitted and was
 * still wrong, because THE RULER was only an upper bound: the fan legally
 * squeezed to a 22 to 28px step against a 112px card and the critic measured
 * 10 to 14 percent of five of the six names visible. Fifteen tests were green
 * over a fan that read one word.
 *
 * So the suite now holds BOTH ends. THE FLOOR below is the second half, and
 * it asserts the property the critic actually measured: the visible band of
 * every dealt card contains that card's whole name box. It is written as the
 * geometry a DOM sampler would see (each card is overlapped from the right by
 * its successor, since z-index rises with index), not as a restatement of
 * tray.ts's own formula, so a change to that formula has to survive it.
 */

import { describe, expect, it } from "vitest";

import {
  FAN_CARD_H,
  FAN_CARD_W,
  FAN_EDGE_GUTTER,
  FAN_MAX,
  FAN_NAME_STRIP,
  FAN_REFERENCE_WIDTH,
  FAN_ROT_MAX,
  FAN_X_STEP_MAX,
  nameWidthPx,
  fanCapacity,
  fanCards,
  fanLayout,
  fanNameFloor,
  fanStep,
  rotatedHalfWidth,
  trayLabel,
  trayTitle,
} from "../src/cards/ui/tray";
import type { Card } from "../src/cards/types";

function card(id: string, overrides: Partial<Card> = {}): Card {
  return {
    id,
    front: "Which carbon does the nucleophile hit?",
    back: "The one carrying the leaving group.",
    why: "Backside attack needs the sigma star.",
    tags: [],
    source: { kind: "lesson", lessonId: "l", beatId: "b" },
    ...overrides,
  };
}

/** Every width worth asserting at: smallest phone, reference, column cap. */
const WIDTHS = [320, 360, FAN_REFERENCE_WIDTH, 414, 448] as const;

describe("the fan's geometry", () => {
  it("a hand of one sits dead centre and upright", () => {
    expect(fanLayout(1, 0)).toEqual({ x: 0, y: 0, rot: 0 });
  });

  it("is symmetric: slot i mirrors slot n-1-i", () => {
    for (let count = 2; count <= FAN_MAX; count += 1) {
      for (let i = 0; i < count; i += 1) {
        const left = fanLayout(count, i);
        const right = fanLayout(count, count - 1 - i);
        expect(left.x).toBeCloseTo(-right.x);
        expect(left.rot).toBeCloseTo(-right.rot);
        expect(left.y).toBeCloseTo(right.y);
      }
    }
  });

  it("an odd hand's middle card is centred, upright, and the hand's highest", () => {
    for (const count of [5, 7]) {
      const middle = fanLayout(count, (count - 1) / 2);
      expect(middle.x).toBe(0);
      expect(middle.rot).toBe(0);
      for (let i = 0; i < count; i += 1) {
        expect(fanLayout(count, i).y).toBeGreaterThanOrEqual(middle.y);
      }
    }
  });

  it("slots march left to right, in order, drooping toward the edges", () => {
    for (let count = 2; count <= FAN_MAX; count += 1) {
      for (let i = 1; i < count; i += 1) {
        expect(fanLayout(count, i).x).toBeGreaterThan(fanLayout(count, i - 1).x);
        expect(fanLayout(count, i).rot).toBeGreaterThan(fanLayout(count, i - 1).rot);
      }
    }
  });

  it("tilt and step stay inside their caps at every hand size", () => {
    for (let count = 1; count <= FAN_MAX; count += 1) {
      for (let i = 0; i < count; i += 1) {
        const slot = fanLayout(count, i);
        expect(Math.abs(slot.rot)).toBeLessThanOrEqual(FAN_ROT_MAX * ((count - 1) / 2) + 1e-9);
        expect(Math.abs(slot.x)).toBeLessThanOrEqual(FAN_X_STEP_MAX * ((count - 1) / 2) + 1e-9);
      }
    }
  });

  it("THE RULER: every card's rotated extent fits its container, at every width", () => {
    // 320 is the smallest phone the breakpoints in DESIGN-TOKENS name below
    // 480; 390 is the reference device; 448 is the max-w-md column cap. The
    // inequality is the exact horizontal bounding box of a centre-rotated
    // rectangle, which is the real painted extent, not the untransformed
    // border box. Held for EVERY count, not only the dealt one, so the
    // ceiling cannot quietly stop being a ceiling if capacity changes.
    for (const width of [...WIDTHS, 768]) {
      for (let count = 1; count <= FAN_MAX; count += 1) {
        for (let i = 0; i < count; i += 1) {
          const slot = fanLayout(count, i, width);
          const extent = Math.abs(slot.x) + rotatedHalfWidth(slot.rot);
          expect(extent).toBeLessThanOrEqual(width / 2 - FAN_EDGE_GUTTER + 1e-9);
        }
      }
    }
  });

  it("round 1's escape is dead: a full hand at 390px stays on screen", () => {
    // The critic measured the old fan at left=-84 and right=474 on a 390px
    // host. Reconstruct both edges from the new slots and assert they sit
    // inside [0, 390].
    for (let i = 0; i < FAN_MAX; i += 1) {
      const slot = fanLayout(FAN_MAX, i, 390);
      const centre = 390 / 2 + slot.x;
      const half = rotatedHalfWidth(slot.rot);
      expect(centre - half).toBeGreaterThanOrEqual(0);
      expect(centre + half).toBeLessThanOrEqual(390);
    }
  });

  it("two cards sit further apart per card than seven do", () => {
    const two = fanLayout(2, 1).x - fanLayout(2, 0).x;
    const seven = fanLayout(7, 1).x - fanLayout(7, 0).x;
    expect(two).toBeGreaterThan(seven);
  });

  it("the card box is portrait and the name fits inside it", () => {
    // DeckTray sizes each card FROM these constants (style, not classes), so
    // paint and geometry cannot drift; what still needs asserting is that the
    // box is a card shape and that a name can fit in it at all, since a name
    // wider than its own card could never be wholly visible at any step.
    expect(FAN_CARD_H).toBeGreaterThan(FAN_CARD_W);
    expect(FAN_NAME_STRIP).toBeLessThanOrEqual(FAN_CARD_W);
  });

  it("rotatedHalfWidth is exact at the angles a hand uses", () => {
    expect(rotatedHalfWidth(0)).toBeCloseTo(FAN_CARD_W / 2);
    // 90 degrees would present the card's height as width.
    expect(rotatedHalfWidth(90)).toBeCloseTo(FAN_CARD_H / 2);
    // Symmetric in sign, monotone over a hand's range.
    expect(rotatedHalfWidth(-20)).toBeCloseTo(rotatedHalfWidth(20));
    expect(rotatedHalfWidth(30)).toBeGreaterThan(rotatedHalfWidth(10));
  });
});

describe("THE FLOOR: every dealt card's name is readable", () => {
  /**
   * What a DOM sampler over the name strips would see. Card i is drawn under
   * card i+1 (z-index rises with index) and over card i-1, so the band of
   * card i that nothing covers runs from its own left edge to its successor's
   * left edge. The last card is wholly visible. Returns the fraction of the
   * centred name box that survives, which is the number the round 2 critic
   * measured at 10 to 14 percent.
   */
  function nameVisibleFraction(count: number, index: number, width: number): number {
    const step = fanStep(count, width);
    const centre = fanLayout(count, index, width).x;
    const cardLeft = centre - FAN_CARD_W / 2;
    const coverLeft = index === count - 1 ? Infinity : centre + step - FAN_CARD_W / 2;
    const nameLeft = centre - FAN_NAME_STRIP / 2;
    const nameRight = centre + FAN_NAME_STRIP / 2;
    const visibleLeft = Math.max(nameLeft, cardLeft);
    const visibleRight = Math.min(nameRight, coverLeft);
    return Math.max(0, visibleRight - visibleLeft) / FAN_NAME_STRIP;
  }

  it("is the derived inequality, not a taste value", () => {
    expect(fanNameFloor()).toBe((FAN_CARD_W + FAN_NAME_STRIP) / 2);
  });

  it("a dealt hand's step always clears the floor", () => {
    for (const width of WIDTHS) {
      const dealt = fanCapacity(width);
      expect(dealt).toBeGreaterThanOrEqual(1);
      if (dealt > 1) expect(fanStep(dealt, width)).toBeGreaterThanOrEqual(fanNameFloor());
    }
  });

  it("EVERY name on a dealt hand is 100 percent visible, at every width", () => {
    // The round 2 measurement, run as arithmetic: 14/13/13/10/13/13 percent
    // for six of seven cards, 100 only for the top one. Nothing under 100 is
    // acceptable here, because a spine label half covered is not a name.
    for (const width of WIDTHS) {
      const dealt = fanCapacity(width);
      for (let i = 0; i < dealt; i += 1) {
        expect(nameVisibleFraction(dealt, i, width)).toBeGreaterThanOrEqual(1 - 1e-9);
      }
    }
  });

  it("catches the round 2 fan: an over-dealt hand fails the same measurement", () => {
    // The floor is only worth having if it can fail. Deal one more card than
    // the width can pay for and the property must break, at every width where
    // the ceiling has not already capped the hand.
    for (const width of WIDTHS) {
      const over = fanCapacity(width) + 1;
      if (over > FAN_MAX) continue;
      const fractions = Array.from({ length: over }, (_, i) => nameVisibleFraction(over, i, width));
      expect(Math.min(...fractions)).toBeLessThan(1);
    }
  });

  it("capacity is monotone in width, so a wider frame never deals fewer", () => {
    for (let i = 1; i < WIDTHS.length; i += 1) {
      expect(fanCapacity(WIDTHS[i]!)).toBeGreaterThanOrEqual(fanCapacity(WIDTHS[i - 1]!));
    }
  });

  it("the step is non-increasing in hand size, which is what lets capacity be a search", () => {
    for (const width of WIDTHS) {
      for (let count = 3; count <= FAN_MAX; count += 1) {
        expect(fanStep(count, width)).toBeLessThanOrEqual(fanStep(count - 1, width) + 1e-9);
      }
    }
  });

  it("the reference phone reads five names, not one", () => {
    // The committed image reads six by letting its labels overhang their
    // cards; tray.ts's header records why that is not copied and why five is
    // the honest number at 390px. This is the regression pin for the number.
    expect(fanCapacity(FAN_REFERENCE_WIDTH)).toBe(5);
    expect(fanCapacity(320)).toBe(4);
    expect(fanCapacity(448)).toBe(6);
  });
});

describe("what the fan deals", () => {
  it("caps the hand at FAN_MAX and at what the width can read", () => {
    const cards = Array.from({ length: FAN_MAX + 3 }, (_, i) => card(`c${i}`));
    for (const width of WIDTHS) {
      const hand = fanCards(cards, width);
      expect(hand).toHaveLength(Math.min(FAN_MAX, fanCapacity(width)));
      expect(hand.length).toBeLessThanOrEqual(FAN_MAX);
      expect(hand[0]?.id).toBe("c0");
    }
  });

  it("a short deck is dealt whole, never padded to capacity", () => {
    const cards = [card("a"), card("b")];
    expect(fanCards(cards, 448)).toHaveLength(2);
  });
});

describe("the words on the cards", () => {
  it("a composed reaction card goes by its setup", () => {
    const composed = card("x", {
      sides: { setup: "Grignard", conditions: "Et2O", product: "an alcohol" },
    });
    expect(trayTitle(composed)).toBe("Grignard");
  });

  it("the committed image's own names survive uncut", () => {
    // Every name the reference draws fits the strip. If FAN_NAME_STRIP ever
    // drops below what these need, the fan stops being able to render the
    // very image it is built from.
    for (const name of ["Grignard", "SN2", "Diels-Alder", "Williamson", "Ozonolysis", "Wittig"]) {
      expect(trayTitle(card("n", { front: name }))).toBe(name);
      expect(nameWidthPx(name)).toBeLessThanOrEqual(FAN_NAME_STRIP);
    }
  });

  it("NO title paints wider than the strip, whatever it is made of", () => {
    // The property the character cap could not hold: at 12px bold "i" is
    // 3.42px and "W" is 12.06px, so eleven characters is anything from 38px
    // to 133px. These are the widths that broke it.
    const fronts = [
      "WWWWWWWWWWWWWWWWWWWW",
      "mmmmmmmmmmmmmmmmmmmm",
      "iiiiiiiiiiiiiiiiiiii",
      "cyclopentene + NBS",
      "Which carbon does the nucleophile hit?",
      "Baeyer-Villiger oxidation",
      "1,2-hydride shift to a tertiary cation",
      "………………",
      "Müller-Rochow direct process",
      "",
    ];
    for (const front of fronts) {
      const title = trayTitle(card("t", { front }));
      expect(nameWidthPx(title)).toBeLessThanOrEqual(FAN_NAME_STRIP + 1e-9);
    }
  });

  it("a cut title still ends in an ellipsis and keeps real words", () => {
    // A boundary past half the budget wins: "Which carbon does..." keeps the
    // whole first word rather than stopping mid "carbon".
    expect(trayTitle(card("y"))).toBe("Which…");
    expect(trayTitle(card("w", { front: "Grignard addition" }))).toBe("Grignard…");
    // A single long word is cut mid-word rather than thrown away entirely.
    const long = trayTitle(card("l", { front: "cyclopentadienyl" }));
    expect(long.endsWith("…")).toBe(true);
    expect(long.length).toBeGreaterThan(4);
  });

  it("a short name is left exactly as written", () => {
    expect(trayTitle(card("z", { front: "SN2" }))).toBe("SN2");
  });

  it("the tray label is the committed image's shape: count, dot, name", () => {
    expect(trayLabel(24, "Reaction Deck")).toBe("24 · Reaction Deck");
  });
});
