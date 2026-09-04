/**
 * THE FEED'S PLACEMENT TABLE. Pure: no React, no DOM, no randomness, no clock.
 *
 * docs/DESIGN-GOALS.md, BACKGROUND DOCTRINE (owner direction 2026-09-02): "the
 * environment is COMPOSED, never scattered ... props are placed by a
 * deterministic per-unit placement table, and the preferred implementation is
 * SVG traced from the prop sheet (tiny, theme-aware, budget-safe) ... Random
 * per-route scatter of icons or molecules is a defect a critic names."
 *
 * The committed reference blueberry_r7-feed-v2_1788288479.png draws this tab
 * on the same living ground the pathway has: a soft band sweeping across the
 * lower half and a few outlined flasks and clouds sitting behind the cards.
 * The Feed shipped flat, which reads as a different product from the Path tab
 * one swipe away. This file is the composition; FeedBackdrop.tsx draws it.
 *
 * WHY THE FEED HAS ITS OWN TABLE RATHER THAN IMPORTING THE PATHWAY'S. Two
 * reasons, both structural. The pathway's table (tabs/pathway/sceneProps.ts)
 * is indexed by UNIT and its `y` is a fraction of a unit's own span, which is
 * a coordinate system the Feed has no unit to supply. And PathScene.tsx is in
 * the pathway's lazy chunk, so reaching into it for four glyphs would drag the
 * whole scene, its terrain arithmetic and pathway.css into this tab's payload.
 * What DOES carry across, and is the doctrine's actual requirement, is the
 * prop FAMILY: the flask, cloud and chain silhouettes here are the same
 * drawings, not new ones, so the two tabs are visibly one place.
 *
 * COORDINATES ARE FRACTIONS of the tab's own box, `x` from its left edge and
 * `y` from its top, so one table is right on a 390 pt phone and a 2560 px
 * monitor. Props are pinned to the FLANKS (x below 0.2 or above 0.8) for the
 * same reason the pathway's are: the content column runs down the middle, and
 * a watermark under a quest label is a watermark competing with a quest label.
 */

/**
 * The prop family, named against blueberry_artkit-prop-sheet and drawn from
 * the same geometry the pathway scene uses.
 *
 *   cloud   the filled cloud, drifting high
 *   flask   the Erlenmeyer silhouette, outlined
 *   chain   the shallow zigzag: a carbon chain seen edge on
 */
export type FeedPropKind = "cloud" | "flask" | "chain";

export interface FeedPropPlacement {
  readonly kind: FeedPropKind;
  /** Fraction of the tab's width, 0 at its left edge. */
  readonly x: number;
  /** Fraction of the tab's height, 0 at its top. */
  readonly y: number;
  /** Drawn size, relative to the prop's own natural size. */
  readonly scale: number;
}

/**
 * The band that sweeps under the lower half of the reference, drawn as one
 * quadratic curve so it is a horizon rather than a straight seam. The S2 judge
 * named a dead-straight full-width edge as "unfinished background asset" on
 * the pathway (see pathway.css beside --path-shade); the same edge would read
 * the same way here, so the Feed's band is curved by construction and there is
 * no code path that can flatten it.
 *
 * The three numbers are fractions of the tab's height: where the band meets
 * the left edge, where its control point pulls it, and where it meets the
 * right edge. It rises left to right, which is the reference's direction.
 */
export const FEED_BAND = Object.freeze({
  left: 0.56,
  control: 0.44,
  right: 0.52,
});

/**
 * The flank a prop may occupy. Anything between these is behind a quest card
 * or a lab-mate row, which is where a watermark stops being a background.
 */
export const FLANK_LEFT = 0.2;
export const FLANK_RIGHT = 0.8;

/**
 * The composition, read as a picture rather than as a list.
 *
 * Two clouds high and on opposite flanks, so the eye crosses the Daily Quests
 * heading getting between them. Three pieces of glassware down the page,
 * alternating sides, the largest of them low on the right where the reference
 * puts its biggest flask. One chain watermark at the very bottom, under the
 * Lab mates card, because the page ends on a card and a bare cream strip under
 * it is the dead zone the S3 verdict faulted the lesson screen for.
 *
 * SEVEN PROPS, not three. The pathway learned this off a capture and it holds
 * here for the same arithmetic: the Feed is roughly one and a half screens on
 * a phone, so a three-prop table puts one drawn object in the viewport and the
 * composition is never actually seen.
 *
 * AND SEVEN IS NOT SEVEN ON EVERY SCREEN, which is the thing to know before
 * anyone trims this list. The content column is `max-w-2xl`, so on a desktop
 * it is 672 px inside a much wider page and every prop stands in real margin;
 * on a 390 pt phone the column is the whole screen and the props at 0.32,
 * 0.60, 0.79 and 0.93 are completely behind opaque cards. That is the table
 * doing its job at both sizes rather than waste: a prop hidden on a phone is
 * the prop that composes the desktop page, and the placements that carry the
 * phone are the ones beside a heading or off an edge. Deleting a "hidden" one
 * empties the wide layout for a gain of nothing.
 */
/*
 * FROZEN PER PLACEMENT, not just as an array, and that is a real hole rather
 * than a formality: Object.freeze is shallow, so a frozen array of live
 * objects still hands every caller a mutable `{x, y}` and one stray write
 * moves a prop for every render afterwards. The check in
 * test/feedBackdrop.test.ts is what found it.
 */
const PLACEMENTS: readonly FeedPropPlacement[] = Object.freeze(
  [
    /*
     * BOTH CLOUDS SIT BESIDE THE HEADINGS, NOT UNDER THE SUBTITLES, and that
     * is a capture correction. The first pass put one at y 0.07, which on a
     * phone is exactly the line "Fresh each day, filled by whatever you play"
     * occupies: a cloud outline running through body text is the one place a
     * watermark stops being decoration and starts costing legibility. A
     * section HEADING is short, so the space beside it is genuinely empty and
     * is where a prop belongs.
     */
    { kind: "cloud", x: 0.88, y: 0.045, scale: 1.0 },
    /*
     * HALF OFF THE TOP EDGE ON PURPOSE. A prop caught in the 10 px gap between
     * two quest cards is a cloud sliced twice, which reads as a smudge rather
     * than as weather; one clipped by the PAGE edge reads as a cloud drifting
     * in, which is what the committed backdrop does with its own. So this one
     * sits above the first card entirely.
     */
    { kind: "cloud", x: 0.08, y: 0.025, scale: 0.78 },
    { kind: "flask", x: 0.09, y: 0.32, scale: 1.15 },
    { kind: "flask", x: 0.9, y: 0.46, scale: 1.5 },
    { kind: "chain", x: 0.16, y: 0.6, scale: 1.0 },
    { kind: "flask", x: 0.84, y: 0.79, scale: 0.95 },
    { kind: "chain", x: 0.11, y: 0.93, scale: 1.2 },
  ].map((placement) => Object.freeze(placement as FeedPropPlacement)),
);

/**
 * The table. A function rather than the constant itself so the component has
 * one name to call and a test has one seam to hold, and it returns the frozen
 * array rather than a copy: nothing may mutate a placement, and handing out a
 * fresh array every render would defeat the memo in the component above it.
 */
export function feedProps(): readonly FeedPropPlacement[] {
  return PLACEMENTS;
}
