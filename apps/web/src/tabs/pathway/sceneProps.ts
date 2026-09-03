/**
 * THE ENVIRONMENT'S PLACEMENT TABLE. Pure: no React, no DOM, no randomness.
 *
 * docs/DESIGN-GOALS.md, BACKGROUND DOCTRINE (owner direction 2026-09-02):
 * "the environment is COMPOSED, never scattered. The committed art kit
 * (env-backdrop, prop-sheet, unit-strip in design-goals/) is the reference;
 * props are placed by a deterministic per-unit placement table, and the
 * preferred implementation is SVG traced from the prop sheet (tiny,
 * theme-aware, budget-safe) ... Random per-route scatter of icons or
 * molecules is a defect a critic names."
 *
 * So this file is that table, and it is the whole of the placement logic.
 * PathScene draws SVG props (PathScene.tsx's Flask, CloudMark, MoleculeMark),
 * this says WHERE, and nothing anywhere calls Math.random.
 *
 * THE STRIP IS THE UNIT OF COMPOSITION, per blueberry_artkit-unit-strip: one
 * terrace transition with its props, a rhythm that repeats down the page.
 * There are four strips and they cycle by unit index, so a reader scrolling
 * fifteen units sees a landscape with a beat rather than fifteen copies of
 * one arrangement or fifteen unrelated ones.
 *
 * COORDINATES ARE FRACTIONS, not pixels, and that is what makes the same
 * table right on a 390pt phone and a 2560px monitor: `x` is a fraction of the
 * SCENE's width (the scene is full bleed, so 0 is the left edge of the
 * viewport) and `y` is a fraction of the unit's own span, so a prop keeps its
 * place in the unit as the unit grows or shrinks with its content.
 *
 * WHY THE EDGES ARE CROWDED AND THE MIDDLE IS NOT. The track column runs down
 * the middle, so every placement between about 0.3 and 0.7 is behind a chip
 * or a label. The clouds are the only props allowed in that band and they sit
 * at the TOP of a unit, above its first row, which is the gap the banner
 * leaves. Everything else lives in the flanks the goal image draws them in.
 */

export type PropKind = "cloud" | "flask" | "benzene" | "chain";

export interface PropPlacement {
  readonly kind: PropKind;
  /** Fraction of the scene's width, 0 at the viewport's left edge. */
  readonly x: number;
  /** Fraction of the unit's own vertical span, 0 at its top. */
  readonly y: number;
  /** Drawn size, relative to the prop's own natural size. */
  readonly scale: number;
}

/**
 * The four repeatable strips.
 *
 * Read them as compositions rather than as lists: each one carries a cloud
 * high, a piece of glassware or a watermark low, and the two are on opposite
 * flanks so the eye crosses the track on the way between them. Strip 0 and
 * strip 2 are mirror images of each other, which is what makes the rhythm
 * read as a landscape passing rather than as a pattern tiling.
 */
export const UNIT_STRIPS: readonly (readonly PropPlacement[])[] = [
  [
    { kind: "cloud", x: 0.2, y: 0.06, scale: 1 },
    { kind: "benzene", x: 0.86, y: 0.22, scale: 1.15 },
    { kind: "flask", x: 0.1, y: 0.62, scale: 1.1 },
    { kind: "cloud", x: 0.66, y: 0.46, scale: 0.72 },
  ],
  [
    { kind: "cloud", x: 0.78, y: 0.08, scale: 0.9 },
    { kind: "chain", x: 0.14, y: 0.34, scale: 1 },
    { kind: "flask", x: 0.9, y: 0.7, scale: 0.95 },
  ],
  [
    { kind: "cloud", x: 0.8, y: 0.05, scale: 1 },
    { kind: "benzene", x: 0.12, y: 0.24, scale: 1.05 },
    { kind: "flask", x: 0.88, y: 0.6, scale: 1.1 },
    { kind: "cloud", x: 0.3, y: 0.44, scale: 0.7 },
  ],
  [
    { kind: "cloud", x: 0.24, y: 0.1, scale: 0.85 },
    { kind: "chain", x: 0.88, y: 0.36, scale: 1.05 },
    { kind: "benzene", x: 0.1, y: 0.74, scale: 0.9 },
  ],
];

/** The strip a unit gets. Deterministic in the unit's index, and only that. */
export function propsForUnit(index: number): readonly PropPlacement[] {
  const strip = UNIT_STRIPS[((index % UNIT_STRIPS.length) + UNIT_STRIPS.length) % UNIT_STRIPS.length];
  return strip ?? [];
}

/**
 * A placement resolved to scene pixels, clamped so nothing is cropped.
 *
 * `margin` is the prop's own half width: a cloud at x 0.9 on a 390pt phone
 * would otherwise hang half off the right edge, which reads as a crop rather
 * than as a drawing. The clamp is what lets one table serve a phone and a
 * monitor without a second table for phones.
 */
export function placePropPx(
  placement: PropPlacement,
  sceneWidth: number,
  unitTop: number,
  unitBottom: number,
  margin: number,
): { readonly x: number; readonly y: number } {
  const span = Math.max(1, unitBottom - unitTop);
  const raw = placement.x * sceneWidth;
  const limit = Math.max(margin, sceneWidth - margin);
  return {
    x: Math.round(Math.max(Math.min(raw, limit), Math.min(margin, limit)) * 10) / 10,
    y: Math.round((unitTop + placement.y * span) * 10) / 10,
  };
}
