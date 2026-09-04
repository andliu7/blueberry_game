/**
 * The Feed's composed ground, held to the BACKGROUND DOCTRINE as a check
 * rather than as a comment.
 *
 * docs/DESIGN-GOALS.md, owner direction 2026-09-02: "the environment is
 * COMPOSED, never scattered ... props are placed by a deterministic per-unit
 * placement table ... Random per-route scatter of icons or molecules is a
 * defect a critic names." A doctrine nothing can fail is a doctrine that will
 * be broken by the next builder who reaches for Math.random because a
 * composition looked too regular, so the properties below are the ones a
 * critic would actually check: that the table is the same table every time,
 * that nothing sits under the content column, and that every prop is a member
 * of the declared family.
 *
 * THERE IS NO CLOCK HERE ON PURPOSE. measurements/gauntlet-economy/LOG.md's
 * wall-clock lesson is that a surface which reads the host clock cannot be
 * asserted; this table takes no arguments at all, which is the strongest form
 * of the same property, and the determinism block below is what pins it.
 */

import { describe, expect, it } from "vitest";
import {
  FEED_BAND,
  FLANK_LEFT,
  FLANK_RIGHT,
  feedProps,
  type FeedPropKind,
} from "../src/tabs/feed/backdropProps";

const FAMILY: readonly FeedPropKind[] = ["cloud", "flask", "chain"];

describe("the placement table", () => {
  it("is the same composition on every call, so no route scatters its own", () => {
    // Identity, not equality: a table that returned a fresh array each call
    // would also defeat the memo the component holds it in.
    expect(feedProps()).toBe(feedProps());
    expect(feedProps()).toEqual(feedProps());
  });

  it("is frozen, so no consumer can mutate the composition for everyone else", () => {
    expect(Object.isFrozen(feedProps())).toBe(true);
    for (const placement of feedProps()) expect(Object.isFrozen(placement)).toBe(true);
  });

  it("draws enough props to actually be seen in one viewport", () => {
    // The pathway learned this off a capture: a three-prop table over a page
    // and a half puts one drawn object on screen, so the composition is
    // composed correctly and then never looked at.
    expect(feedProps().length).toBeGreaterThanOrEqual(6);
  });

  it("only ever places members of the declared prop family", () => {
    for (const placement of feedProps()) {
      expect(FAMILY, `${placement.kind} is not on the prop sheet`).toContain(placement.kind);
    }
  });
});

describe("where a prop may sit", () => {
  it("keeps every prop inside the page box", () => {
    for (const { kind, x, y } of feedProps()) {
      expect(x, `${kind} x`).toBeGreaterThanOrEqual(0);
      expect(x, `${kind} x`).toBeLessThanOrEqual(1);
      expect(y, `${kind} y`).toBeGreaterThanOrEqual(0);
      expect(y, `${kind} y`).toBeLessThanOrEqual(1);
    }
  });

  it("keeps every prop on a FLANK, never under the content column", () => {
    // The quest cards and the lab-mate rows run down the middle. A watermark
    // behind a quest label is a watermark competing with a quest label, which
    // is the difference between a background and a mess.
    for (const { kind, x } of feedProps()) {
      const onFlank = x <= FLANK_LEFT || x >= FLANK_RIGHT;
      expect(onFlank, `${kind} at x ${x} is under the content column`).toBe(true);
    }
  });

  it("uses both flanks, so the composition is not a stripe down one side", () => {
    const left = feedProps().filter((p) => p.x <= FLANK_LEFT).length;
    const right = feedProps().filter((p) => p.x >= FLANK_RIGHT).length;
    expect(left).toBeGreaterThan(0);
    expect(right).toBeGreaterThan(0);
  });

  it("spreads down the whole page rather than crowding the first screenful", () => {
    const ys = feedProps().map((p) => p.y);
    expect(Math.min(...ys)).toBeLessThan(0.2);
    expect(Math.max(...ys)).toBeGreaterThan(0.8);
  });

  it("draws every prop at a real size", () => {
    for (const { kind, scale } of feedProps()) {
      expect(scale, `${kind} scale`).toBeGreaterThan(0);
      expect(scale, `${kind} scale`).toBeLessThanOrEqual(2);
    }
  });
});

describe("the band", () => {
  it("sits in the lower half, where the reference sweeps it", () => {
    expect(FEED_BAND.left).toBeGreaterThan(0.4);
    expect(FEED_BAND.right).toBeGreaterThan(0.4);
  });

  it("is a CURVE and never a straight seam", () => {
    // A dead-straight full-width edge across a landscape is the "unfinished
    // background asset" the S2 judge named on the pathway; the same edge would
    // read the same way here. The control point has to pull the curve off the
    // line joining its two ends, or the band is a horizon in name only.
    const chord = (FEED_BAND.left + FEED_BAND.right) / 2;
    expect(Math.abs(FEED_BAND.control - chord)).toBeGreaterThan(0.05);
  });

  it("keeps its whole span inside the page box", () => {
    for (const value of Object.values(FEED_BAND)) {
      expect(value).toBeGreaterThan(0);
      expect(value).toBeLessThan(1);
    }
  });
});
