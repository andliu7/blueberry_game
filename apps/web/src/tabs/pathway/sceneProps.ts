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
 * this says WHERE and HOW BIG, and nothing anywhere calls Math.random.
 *
 * WHAT CHANGED ON 2026-09-04, and it is the owner's note in two halves: "the
 * background is small and does not flow well".
 *
 * SMALL was literal. The props were drawn at their prop-sheet proportions and
 * then placed in a viewport-wide scene, so a flask was 35 by 40 device pixels
 * on a 390pt phone where blueberry_artkit-env-backdrop draws it at about 55 by
 * 62 in the same frame. Sizes are now declared once, here, as the drawn half
 * extent times a per-kind draw scale, and both the renderer and the keep-out
 * test read the same two numbers, so a prop cannot be drawn at one size and
 * tested at another. That mismatch was real: the cloud was tested as 92 wide
 * and drawn 54.
 *
 * DOES NOT FLOW was structural. Placements used to be fractions of a UNIT's
 * own span, so the whole composition restarted at every unit boundary: a unit
 * was a strip with its own beginning and end, which is exactly what the owner
 * saw. They are fractions of a TERRACE BAND now, and terrain.ts lays the bands
 * at one constant pitch down the whole track, so the rhythm crosses unit
 * boundaries without a seam. What the unit still decides is its CHARACTER:
 * which watermark family stands on its flanks, how often glassware and weather
 * appear, and which side it opens on. Crossing into unit 4 changes all four
 * without a single new drawing.
 *
 * COORDINATES ARE RELATIVE TO THE TRACK COLUMN, not to the scene, and that is
 * the other correction. `x` used to be a fraction of the viewport, and the
 * viewport is not where the track is: on a desktop the column sits to the
 * right of the navigation rail, so every placement at 0.10 of the scene landed
 * under the rail and was never seen, while on a 390pt phone the same 0.10 was
 * on top of the chips. A placement now says WHICH SIDE of the column it stands
 * on and HOW FAR OUT toward the page edge, and placePropPx turns that into
 * pixels against the measured column. One table, right on both devices.
 */

/*
 * THE PROP FAMILY, renamed against blueberry_artkit-prop-sheet.
 *
 * "benzene" was an honest name for what the build drew and a wrong name for
 * what the reference draws. The committed backdrop's watermarks are multi-ring
 * SKELETONS with heteroatoms (a fused bicycle with a ring nitrogen, an aryl
 * amide), and the prop sheet's molecule row is a fused tricycle beside a
 * substituted ring. A single empty hexagon is not that, and a critic said so.
 *
 *   ring    a fused bicycle with a ring nitrogen, the quinoline-shaped
 *           watermark the backdrop puts at the top right of its sky
 *   amide   ring, carbonyl, N-H, second ring: the aryl amide low on the
 *           backdrop's second terrace
 *   chain   the prop sheet's zigzag chevron, a carbon chain drawn small and
 *           flat. It is on the sheet, so it stays; what it is not is the
 *           two-peak mountain the build drew it as
 *
 * NO FLAG. docs/DESIGN-GOALS.md, owner 2026-09-03: "the small flag on a pole
 * reads as a destination and competes with the real nodes. Cut from the prop
 * family." It is named here so nobody re-adds it as an oversight.
 */
export type PropKind = "cloud" | "flask" | "ring" | "amide" | "chain";

/** The molecule watermarks, which are the props a unit's character selects. */
export type MarkKind = "ring" | "amide" | "chain";

export interface PropPlacement {
  readonly kind: PropKind;
  /** Which flank of the track column it stands on: -1 left, 1 right. */
  readonly side: -1 | 1;
  /**
   * How far out from the column's edge, 0 at the edge and 1 at the page's.
   *
   * A fraction of the ROOM rather than of the page, because the room is what
   * differs between devices: a desktop has 300px of it beside the column and a
   * phone has about 30, and a prop should stand in the middle of whatever
   * there is rather than at a fixed pixel offset that is a margin on one and
   * off-screen on the other.
   */
  readonly out: number;
  /** Fraction of the terrace band's own height, 0 at its top. */
  readonly y: number;
  /** Drawn size, relative to the prop's own natural size. */
  readonly scale: number;
}

/**
 * THE DRAWN HALF EXTENT of each prop at scale 1, in SVG units.
 *
 * These are measured off the path data in PathScene, not guessed: the cloud
 * path spans -26..28 across and -22..8 down, the fused bicycle spans -44..44,
 * and so on. They exist so the keep-out test and the renderer agree; see the
 * header for the 92-tested / 54-drawn cloud this replaces.
 */
export const PROP_HALF: Record<PropKind, { readonly w: number; readonly h: number }> = {
  cloud: { w: 27, h: 15 },
  flask: { w: 14, h: 17 },
  ring: { w: 44, h: 24 },
  amide: { w: 47, h: 28 },
  chain: { w: 34, h: 10 },
};

/**
 * How much bigger than its natural size each prop is drawn.
 *
 * The owner's "small" measured against blueberry_artkit-env-backdrop and the
 * per-unit designs, where a flask is roughly a seventh of the phone's width
 * and a molecule watermark roughly a quarter of it. At scale 1 the flask was a
 * fourteenth. These numbers are the ratio between the two, rounded.
 */
export const PROP_DRAW_SCALE: Record<PropKind, number> = {
  cloud: 1.75,
  flask: 1.95,
  ring: 1.25,
  amide: 1.2,
  chain: 1.6,
};

/** The size a prop is actually drawn at: its own scale times its kind's. */
export function drawScale(placement: PropPlacement): number {
  return placement.scale * PROP_DRAW_SCALE[placement.kind];
}

/** The half extent a prop occupies on the page, in scene pixels. */
export function propExtent(placement: PropPlacement): { readonly w: number; readonly h: number } {
  const half = PROP_HALF[placement.kind];
  const scale = drawScale(placement);
  return { w: half.w * scale, h: half.h * scale };
}

/**
 * What one unit's stretch of landscape is made of.
 *
 * Everything here is derived from the unit's INDEX and nothing else, so the
 * fifth unit is the same place on every render and on every device, and an
 * authoring wave that adds a lesson does not redecorate the map.
 */
export interface UnitCharacter {
  /** The watermark family standing on this unit's flanks. */
  readonly mark: MarkKind;
  /** The second family, so a unit is not a single repeated stamp. */
  readonly companion: MarkKind;
  /** Glassware appears once every this many bands. */
  readonly glassEvery: number;
  /** Weather appears once every this many bands. */
  readonly cloudEvery: number;
  /** Which flank the unit's first watermark stands on. */
  readonly flank: -1 | 1;
  /** A unit-wide size multiplier, so some stretches read nearer than others. */
  readonly scale: number;
}

const MARKS: readonly MarkKind[] = ["ring", "amide", "chain"];
/** The golden ratio: a spread with no visible period, and stable in the index. */
const GOLDEN = 0.6180339887498949;

/**
 * A unit's character, deterministic in its index.
 *
 * Three of the four numbers come off the same golden-ratio sequence terrain.ts
 * uses for its ripple, for the same reason: consecutive units never land on
 * the same value and the sequence never visibly repeats, so fourteen units are
 * fourteen places rather than four places shown three and a half times.
 */
export function unitCharacter(index: number): UnitCharacter {
  const safe = Math.max(0, Math.floor(index));
  const a = (safe * GOLDEN) % 1;
  const b = ((safe + 1) * GOLDEN * 2) % 1;
  const mark = MARKS[Math.floor(a * MARKS.length) % MARKS.length]!;
  const companion = MARKS[(Math.floor(a * MARKS.length) + 1 + Math.floor(b * 2)) % MARKS.length]!;
  return {
    mark,
    companion,
    glassEvery: 2 + Math.floor(b * 2),
    cloudEvery: 2 + Math.floor(a * 2),
    flank: safe % 2 === 0 ? -1 : 1,
    scale: 0.92 + b * 0.3,
  };
}

/**
 * The props one terrace band carries.
 *
 * READ IT AS A COMPOSITION rather than as a list. Every band gets a watermark
 * on one flank and the flank ALTERNATES band to band, so the eye crosses the
 * track on the way down and the landscape reads as a zigzag passing rather
 * than as two columns of decals. Glassware and weather arrive on the opposite
 * flank on the unit's own cycle, which is what keeps a long unit from becoming
 * a repeat of one arrangement.
 *
 * Two to three props per 230px band is the density the reference carries in a
 * phone-shaped frame. The previous table put six or seven across a whole unit,
 * which is one screen with two props in it and one with none.
 */
export function propsForBand(bandIndex: number, character: UnitCharacter): readonly PropPlacement[] {
  const band = Math.max(0, Math.floor(bandIndex));
  const near: -1 | 1 = band % 2 === 0 ? character.flank : (-character.flank as -1 | 1);
  const far: -1 | 1 = -near as -1 | 1;
  const out: PropPlacement[] = [
    {
      kind: band % 3 === 0 ? character.companion : character.mark,
      side: near,
      // Mid-flank, so the shape has room either side of it rather than being
      // pinned to the page edge like a margin note.
      out: 0.42,
      y: 0.46,
      scale: character.scale,
    },
  ];
  if (band % Math.max(2, character.glassEvery) === 0) {
    out.push({ kind: "flask", side: far, out: 0.5, y: 0.74, scale: character.scale });
  }
  if (band % Math.max(2, character.cloudEvery) === 1) {
    // Weather sits high in the band and further out, because a cloud is the
    // one FILLED prop and a filled shape near the track competes with the
    // chips. See PathScene's keep-out split.
    out.push({ kind: "cloud", side: far, out: 0.62, y: 0.16, scale: character.scale * 0.95 });
  }
  if (band % 5 === 3) {
    // The chevron lies near the horizon, low and flat, on the near flank
    // under the watermark: the prop sheet draws it as ground detail.
    out.push({ kind: "chain", side: near, out: 0.7, y: 0.88, scale: character.scale * 0.9 });
  }
  return out;
}

/** The measured frame a placement is resolved against. */
export interface SceneFrame {
  /** The scene's own width, which is the viewport: the surface is full bleed. */
  readonly width: number;
  /** Where the track column's centreline sits inside it. */
  readonly centreX: number;
  /** Half the track column. Props never come inside this. */
  readonly basis: number;
}

/**
 * A placement resolved to scene pixels.
 *
 * `margin` is the prop's own half width plus whatever air it should keep from
 * the page edge, so a prop at the far end of a phone's narrow flank sits AT
 * the edge, which is a composition, rather than being cut by it, which is a
 * defect.
 *
 * WHEN THERE IS NO ROOM, which is a phone, the inner limit is past the outer
 * one and the prop lands on the outer limit: hard against the page edge,
 * partly behind the chip column. That is the honest answer at 390pt, it is
 * what the per-unit designs draw (unit04's watermarks run behind the label
 * cards), and it is only allowed for the outlined props: the renderer drops a
 * filled cloud that meets a chip rather than sliding it under one.
 */
export function placePropPx(
  placement: PropPlacement,
  frame: SceneFrame,
  bandTop: number,
  bandBottom: number,
  margin: number,
): { readonly x: number; readonly y: number } {
  const span = Math.max(1, bandBottom - bandTop);
  const inner = frame.centreX + placement.side * frame.basis;
  const outer = placement.side === -1 ? margin : frame.width - margin;
  const x = inner + (outer - inner) * Math.max(0, Math.min(1, placement.out));
  const low = Math.min(margin, frame.width - margin);
  const high = Math.max(margin, frame.width - margin);
  return {
    x: Math.round(Math.max(low, Math.min(high, x)) * 10) / 10,
    y: Math.round((bandTop + placement.y * span) * 10) / 10,
  };
}
