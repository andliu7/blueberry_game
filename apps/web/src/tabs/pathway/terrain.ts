/**
 * The backdrop, as arithmetic. Pure: no React, no DOM, no measurement.
 *
 * THE MOTIF IS CHEMISTRY AND NOT DECORATION. Owner direction 2026-08-28: the
 * path descends as you scroll, and the backdrop is designed to match the flow
 * of the lessons. A reaction coordinate diagram runs downhill, so a descending
 * path is the reaction proceeding, and downhill agrees with the only gesture a
 * phone user makes without thinking. Units are WELLS the path settles into. A
 * checkpoint unit is the HUMP between two wells, which is literally the
 * activation barrier, and a student scrolls past that shape every time.
 *
 * THE AXES, because a rotated diagram confuses people if it is not stated. The
 * reaction coordinate runs DOWN the page: scrolling is progress. Energy runs
 * ACROSS it. The ground is the low energy region, so it fills the two edges of
 * the page and its boundary is the energy curve. A barrier squeezes the channel
 * the path runs through; a well opens it into a basin. Both edges carry the
 * same curve mirrored, so the composition stays centred on a 390pt phone
 * instead of listing to one side.
 *
 * EVERY NUMBER COMES FROM THE UNIT'S OWN DATA. Nothing here is hand placed per
 * screen, because a hand drawn curve becomes a lie the moment the content
 * behind it moves, and the map gains nodes every authoring wave:
 *
 *   barrier    what it costs to ENTER the unit. Its share of the track's spine
 *              work, plus a fixed premium when the unit is a checkpoint, because
 *              a checkpoint IS the barrier rather than a lesson.
 *   wellDepth  how far the path settles once inside. Its share of the whole
 *              inventory, spine and branches together, because "how much it
 *              unlocks" is how much of the map hangs off it.
 *   drift      the overall exergonic slope. Every unit sits a little lower than
 *              the one before it, so the run reads as downhill end to end and
 *              not as a row of identical bumps.
 */

import type { PathwayUnit } from "../../demo/pathwayMap";

export interface UnitEnergy {
  readonly unitId: string;
  /** 0..1. The crest between this unit and the one before it. */
  readonly barrier: number;
  /** 0..1. How far the channel opens at the unit's centre. */
  readonly wellDepth: number;
  /** Every node in it is a gate: this unit is a checkpoint, not a lesson set. */
  readonly isCheckpoint: boolean;
}

/** A checkpoint unit is one whose track nodes are all gates. */
export function isCheckpointUnit(unit: PathwayUnit): boolean {
  const track = unit.nodes.filter((node) => node.kind !== "branch");
  return track.length > 0 && track.every((node) => node.kind === "gate");
}

/** The premium a checkpoint adds to its own barrier. A quiz is the wall. */
const CHECKPOINT_PREMIUM = 0.45;

export function unitEnergies(units: readonly PathwayUnit[]): readonly UnitEnergy[] {
  if (units.length === 0) return [];
  const spine = units.map((unit) => unit.nodes.filter((node) => node.kind === "spine" || node.kind === "boss").length);
  const inventory = units.map((unit) => unit.nodes.length);
  const maxSpine = Math.max(1, ...spine);
  const maxInventory = Math.max(1, ...inventory);
  return units.map((unit, index) => {
    const checkpoint = isCheckpointUnit(unit);
    const barrier = Math.min(1, (spine[index]! / maxSpine) * 0.6 + (checkpoint ? CHECKPOINT_PREMIUM : 0));
    return {
      unitId: unit.id,
      barrier,
      wellDepth: inventory[index]! / maxInventory,
      isCheckpoint: checkpoint,
    };
  });
}

/** Where one unit sits in the scroller, measured off the built page. */
export interface UnitSpan {
  readonly unitId: string;
  /** Top and bottom of the unit's section, in scene coordinates. */
  readonly top: number;
  readonly bottom: number;
}

export interface TerrainGeometry {
  /** The scene's own box, which is the VIEWPORT and not the whole track. */
  readonly width: number;
  readonly height: number;
  /** Where the track's centreline sits inside that box. */
  readonly centreX: number;
  /**
   * The half width the channel is measured against, in pixels.
   *
   * Not simply half the scene, because the scene is full bleed: on a 2560px
   * monitor a fraction of the viewport would push the hillsides off the sides of
   * the world. The caller caps it, so the landscape stays the same shape on a
   * phone and on a desktop and only the amount of open ground either side grows.
   */
  readonly basis: number;
  /**
   * How far past the basis the channel may swell at zero energy, in pixels.
   *
   * It is a PIXEL budget rather than a fraction of the basis because the two
   * numbers answer to different things. The basis answers to the label column:
   * it is half of it, and the channel is never narrower, or body copy ends up on
   * the ground this file's header says it must never sit on. The swing answers
   * to the viewport: it is whatever room is left between the paper and the
   * screen edge, so the widest crest still has ground beside it. On a desktop
   * that room is plentiful and the swing is the old 16 percent of the basis; on
   * a 390pt phone it is a few pixels, and a few pixels is the honest answer
   * there, because a phone has no room for both a full width reading column and
   * a landscape beside it.
   *
   * Optional so a caller that only cares about the shape, including this
   * package's own tests, gets the 16 percent by default and nothing about their
   * arithmetic moves.
   */
  readonly swingPx?: number;
}

/**
 * The channel half-width at rest, and how far energy is allowed to move it, as
 * fractions of the scene width.
 *
 * THE FLOOR IS A CONTRAST RULE AND IT IS ARITHMETIC, NOT TASTE.
 *
 * Node labels live in the channel, and the contrast audit CANNOT SEE the ground
 * behind them: an SVG mark under a text box is not that box's CSS ancestor, so
 * the climb reports the page and the pair is measured against a surface the
 * reader is not looking at. That makes this the one place a moving layer could
 * quietly break a pair the audit reports as passing, so the geometry has to
 * guarantee it instead.
 *
 * And there is no colour that dodges it. The ground must clear 3:1 against the
 * page as a graphical object, which caps its lightness at about 0.25; body text
 * must clear 4.5:1 on whatever it sits on, which needs at least 0.28. No value
 * satisfies both, so text simply must not sit on the ground.
 *
 * The basis is HALF THE TRACK COLUMN, so CHANNEL_HALF at 1.16 means the channel
 * is never narrower than the column itself even at the tightest barrier
 * (1.16 - 0.16 = 1.00). The hillsides therefore start at the column's own edge
 * and grow outward: a real valley on a desktop, where the viewport is far wider
 * than the column, and two warm edges on a 390pt phone, where there is
 * genuinely no room beside the text and pretending otherwise would put body
 * copy on a 3.3:1 ground.
 */
export const CHANNEL_HALF = 1.16;
export const CHANNEL_SWING = 0.16;
/**
 * The highest total energy the channel may ever carry.
 *
 * It is the floor rule solved for energy rather than a second number to keep in
 * step: at this value `channelHalfWidth` returns exactly the basis, which is
 * half the track column, so a label is still inside the channel. Anything the
 * profile adds on top of a unit's own crest is capped against this, and that is
 * why the ripple below cannot walk a hillside under a label.
 */
export const ENERGY_CEILING = (CHANNEL_HALF - 1) / CHANNEL_SWING;
/**
 * How far the terrain runs past the first and last unit.
 *
 * Without it the ground has a hard horizontal top edge exactly where the first
 * unit begins, which reads as a rectangle someone dropped on the page rather
 * than as a hillside the path runs through. A landscape has no beginning on
 * screen, so the profile is extended off both ends.
 */
export const LEAD_PX = 1400;
/** The whole run drops this far in energy from first unit to last. */
export const EXERGONIC_DRIFT = 0.35;

export interface TerrainSample {
  readonly y: number;
  /** Signed energy, positive is a barrier and negative is a well. */
  readonly energy: number;
}

/**
 * The energy profile as a list of samples down the page.
 *
 * Three control points per unit: the crest at its top edge, the trough at its
 * centre, and the climb back out at its bottom edge. Between them the caller
 * draws a smooth curve, so the shape is entirely determined by the data and by
 * where the units actually landed.
 */
export function energyProfile(
  energies: readonly UnitEnergy[],
  spans: readonly UnitSpan[],
): readonly TerrainSample[] {
  const byId = new Map(energies.map((entry) => [entry.unitId, entry]));
  const ordered = spans.filter((span) => byId.has(span.unitId));
  if (ordered.length === 0) return [];
  const last = ordered.length - 1;
  const samples: TerrainSample[] = [];
  const firstEnergy = byId.get(ordered[0]!.unitId)!;
  samples.push({ y: ordered[0]!.top - LEAD_PX, energy: firstEnergy.barrier });
  ordered.forEach((span, index) => {
    const energy = byId.get(span.unitId)!;
    // Downhill: each unit's whole shape sits lower than the one before it.
    const drift = last === 0 ? 0 : (index / last) * EXERGONIC_DRIFT;
    const crest = energy.barrier - drift;
    const trough = -energy.wellDepth - drift;
    samples.push({ y: span.top, energy: crest });
    samples.push({ y: (span.top + span.bottom) / 2, energy: trough });
    samples.push({ y: span.bottom, energy: crest * 0.55 - drift * 0.5 });
  });
  const tail = samples[samples.length - 1]!;
  samples.push({ y: ordered[last]!.bottom + LEAD_PX, energy: tail.energy });
  return samples;
}

/* -------------------------------------------------------------------------- */
/* The per lesson ripple, and the defect it exists to fix.                      */
/* -------------------------------------------------------------------------- */

/**
 * A blind judge read the landscape on a phone as "two solid tan vertical bars
 * with no rounding, label or content", and that reading was correct arithmetic
 * rather than a matter of taste. The unit profile above puts three control
 * points on a unit, and a unit is 1200 to 2500 pixels tall, so the boundary
 * moves about 25 pixels sideways over a whole screen height. A line that
 * deviates 25px over 850px is a straight vertical line to an eye.
 *
 * The fix is not a bigger swing, because the floor rule caps that: the channel
 * may never be narrower than the track column or a label ends up composed on
 * the ground, where the contrast audit cannot see the pair. The fix is a
 * shorter WAVELENGTH, and the data already has one.
 *
 * A multi step reaction coordinate does not run from one well to the next in a
 * single arc. Every step has its own barrier and its own intermediate, and on
 * this track every step is a lesson. So each spine row contributes a small
 * crest at its top edge and a small trough at its centre: the hillside now
 * scallops once per lesson, at the track's own pitch of roughly 110px, which is
 * six or seven turns per screen instead of none. The bars stop reading as bars
 * because they stop being straight, and what makes them bend is the lesson
 * list, which is the same rule the rest of this file follows.
 */
export const STEP_RIPPLE = 0.34;

/**
 * How much of a step's ripple survives, per row.
 *
 * A ripple of one constant size at one constant pitch is not a landform, it is
 * a milled edge, and the first build of this read exactly that way on a desktop:
 * a 300px hillside with a perfectly repeating scallop down both sides, mirrored,
 * looks like clip art of a canyon rather than a canyon. Real steps are not the
 * same size as each other.
 *
 * The multiplier is the golden ratio sequence, which is the standard way to get
 * a spread with no visible period: successive values never repeat and never
 * clump, and index i always gives the same value, so a capture of the third
 * unit is the same picture every run. Nothing here is random.
 */
const GOLDEN = 0.6180339887498949;
export function rippleScale(index: number): number {
  const fraction = (index * GOLDEN) % 1;
  return 0.55 + 0.45 * fraction;
}

/** One track row's box in scene coordinates. */
export interface RowSpan {
  readonly top: number;
  readonly bottom: number;
}

/**
 * The base profile read at an arbitrary y, by linear interpolation.
 *
 * Linear and not the drawn cubic on purpose: this is the ENVELOPE the ripple is
 * hung off, and a straight chord between two control points is close enough to
 * the drawn curve at the scale a 110px ripple cares about, while being cheap
 * and having no turning points of its own to fight.
 */
export function envelopeAt(samples: readonly TerrainSample[], y: number): number {
  if (samples.length === 0) return 0;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  if (y <= first.y) return first.energy;
  if (y >= last.y) return last.energy;
  for (let i = 1; i < samples.length; i += 1) {
    const to = samples[i]!;
    if (to.y < y) continue;
    const from = samples[i - 1]!;
    const span = to.y - from.y;
    if (span <= 0) return to.energy;
    const t = (y - from.y) / span;
    return from.energy + (to.energy - from.energy) * t;
  }
  return last.energy;
}

/**
 * The unit envelope with one step's worth of ripple added per track row.
 *
 * Pure and total: no rows, or fewer than two base samples, returns the base
 * unchanged, so a page that has not measured yet draws exactly what it drew
 * before. The result stays sorted by y and never exceeds ENERGY_CEILING, which
 * is what keeps the floor rule true of the rippled profile and not only of the
 * envelope.
 */
export function stepProfile(
  base: readonly TerrainSample[],
  rows: readonly RowSpan[],
  amplitude: number = STEP_RIPPLE,
): readonly TerrainSample[] {
  if (base.length < 2 || rows.length === 0 || amplitude <= 0) return base;
  const added: TerrainSample[] = [];
  rows.forEach((row, index) => {
    const size = amplitude * rippleScale(index);
    const centre = (row.top + row.bottom) / 2;
    const crestBase = envelopeAt(base, row.top);
    // The upward half is scaled to whatever headroom the envelope leaves, so a
    // ripple on top of a checkpoint crest cannot push the channel under a label.
    const up = Math.min(size, Math.max(0, ENERGY_CEILING - crestBase));
    added.push({ y: row.top, energy: crestBase + up });
    added.push({ y: centre, energy: envelopeAt(base, centre) - size });
  });
  // One merge of two sorted lists. Samples sharing a y would draw a horizontal
  // step in the boundary, so the ripple wins the tie and the envelope's own
  // point is dropped.
  const merged = [...base, ...added].sort((a, b) => a.y - b.y);
  const out: TerrainSample[] = [];
  for (const sample of merged) {
    const previous = out[out.length - 1];
    if (previous !== undefined && Math.abs(previous.y - sample.y) < 0.5) {
      out[out.length - 1] = { y: previous.y, energy: Math.max(previous.energy, sample.energy) };
      continue;
    }
    out.push(sample);
  }
  return out;
}

/**
 * Energy to a distance from the centreline, in pixels, against a half width
 * basis.
 *
 * The floor is enforced HERE rather than left to the arithmetic of the two
 * constants. It was already true that CHANNEL_HALF minus CHANNEL_SWING is
 * exactly 1, so no unit energy in 0..1 could close the channel past the column;
 * once the profile gained a ripple, "no energy exceeds 1" stopped being
 * something a reader could check by looking at two constants. A clamp says it
 * once, at the only place a channel width is ever produced.
 */
export function channelHalfWidth(
  energy: number,
  basis: number,
  swingPx: number = basis * CHANNEL_SWING,
): number {
  // Identical to `basis * (CHANNEL_HALF - energy * CHANNEL_SWING)` at the default
  // swing, which is why no existing number moved when the swing became a
  // parameter: CHANNEL_HALF is 1 + CHANNEL_SWING by construction, so
  // basis + (1 - energy) * basis * CHANNEL_SWING is the same expression
  // rearranged. What the pixel form buys is a caller that can shrink the swell
  // without shrinking the floor, which the fraction form could not express.
  return Math.max(basis, basis + (1 - energy) * swingPx);
}

/**
 * A smooth vertical curve through the samples, as an SVG path.
 *
 * Cubic segments with vertical tangents, so every crest and trough is a real
 * turning point rather than a corner. `side` is -1 for the left boundary and
 * +1 for the right, which is the mirror that keeps the composition centred.
 */
export function boundaryPath(
  samples: readonly TerrainSample[],
  geometry: TerrainGeometry,
  side: -1 | 1,
): string {
  if (samples.length === 0) return "";
  const x = (sample: TerrainSample) => geometry.centreX + side * channelHalfWidth(sample.energy, geometry.basis, geometry.swingPx);
  let d = `M ${x(samples[0]!).toFixed(2)} ${samples[0]!.y.toFixed(2)}`;
  for (let i = 1; i < samples.length; i += 1) {
    const from = samples[i - 1]!;
    const to = samples[i]!;
    const grip = (to.y - from.y) / 2;
    d += ` C ${x(from).toFixed(2)} ${(from.y + grip).toFixed(2)}, ${x(to).toFixed(2)} ${(to.y - grip).toFixed(2)}, ${x(to).toFixed(2)} ${to.y.toFixed(2)}`;
  }
  return d;
}

/** The boundary closed out to the page edge, so the ground is a filled shape. */
/**
 * THE PAPER RIBBON: the channel itself, as one closed shape.
 *
 * The lavender turn made the page a ground and the card a warm cream, and the
 * pathway's channel is the same relationship at landscape scale: a strip of
 * paper the track is printed on, running down a lavender ground. So the channel
 * needs a FILL, which it never had: it used to be the gap between two hillsides.
 *
 * It is the left boundary walked down, a step across the bottom, and the right
 * boundary walked back up. Reversing a cubic segment is exact rather than
 * approximate: a segment P0 C1 C2 P3 run backwards is P3 C2 C1 P0, so the shape
 * closes on the same curve the boundary stroke draws and no seam can open
 * between the fill and its own edge.
 */
export function channelPath(
  samples: readonly TerrainSample[],
  geometry: TerrainGeometry,
): string {
  if (samples.length === 0) return "";
  const x = (sample: TerrainSample, side: -1 | 1) =>
    geometry.centreX + side * channelHalfWidth(sample.energy, geometry.basis, geometry.swingPx);
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  let d = `M ${x(first, -1).toFixed(2)} ${first.y.toFixed(2)}`;
  for (let i = 1; i < samples.length; i += 1) {
    const from = samples[i - 1]!;
    const to = samples[i]!;
    const grip = (to.y - from.y) / 2;
    d += ` C ${x(from, -1).toFixed(2)} ${(from.y + grip).toFixed(2)}, ${x(to, -1).toFixed(2)} ${(to.y - grip).toFixed(2)}, ${x(to, -1).toFixed(2)} ${to.y.toFixed(2)}`;
  }
  d += ` L ${x(last, 1).toFixed(2)} ${last.y.toFixed(2)}`;
  for (let i = samples.length - 1; i > 0; i -= 1) {
    const to = samples[i]!;
    const from = samples[i - 1]!;
    const grip = (to.y - from.y) / 2;
    d += ` C ${x(to, 1).toFixed(2)} ${(to.y - grip).toFixed(2)}, ${x(from, 1).toFixed(2)} ${(from.y + grip).toFixed(2)}, ${x(from, 1).toFixed(2)} ${from.y.toFixed(2)}`;
  }
  return `${d} Z`;
}

export function groundPath(
  samples: readonly TerrainSample[],
  geometry: TerrainGeometry,
  side: -1 | 1,
): string {
  const boundary = boundaryPath(samples, geometry, side);
  if (boundary === "") return "";
  const edge = side === -1 ? 0 : geometry.width;
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  return `${boundary} L ${edge} ${last.y.toFixed(2)} L ${edge} ${first.y.toFixed(2)} Z`;
}

/* -------------------------------------------------------------------------- */
/* The terraces: the hills the goals ask for, as bands with one drawn edge.    */
/* -------------------------------------------------------------------------- */

/**
 * One terrace band per unit: a filled band whose visible edge is its wavy TOP,
 * stepping down across the page, per docs/DESIGN-GOALS.md ("terraced hills
 * stepping down"). Each band is drawn OVER the one before it, so the only
 * stroke a reader ever sees is the top edge; the sides and bottom run past the
 * viewport and under the next band.
 *
 * WHY FILL AND STROKE LIVE ON ONE PATH, and it is a contrast rule. The audit
 * collapses a shape's fill and its boundary to the better of the two, because
 * WCAG 1.4.11 asks whether a component is identifiable. A terrace's fill is
 * deliberately a hair off the page (a faint warm wash is the whole point of a
 * watermark landscape), so the EDGE is what identifies it, and the edge only
 * counts if it is the same path's stroke. A separate stroke path would leave
 * the fill an unidentifiable 1.1:1 rectangle, which is exactly what the audit
 * failed the first ridge for.
 *
 * The steps use the golden-ratio spread rippleScale already provides, so no
 * two terraces have the same step heights and index i always draws the same
 * terrace: deterministic, like everything else in this file.
 */
export const TERRACE_STEPS = 4;
export const TERRACE_DROP_PX = 26;
/** How far past the viewport's sides and the band's own span the fill runs. */
export const TERRACE_BLEED_PX = 90;

export function terracePath(top: number, bottom: number, width: number, seed: number): string {
  const left = -TERRACE_BLEED_PX;
  const right = width + TERRACE_BLEED_PX;
  const depth = bottom - top + 600;
  // Even seeds descend left to right, odd seeds right to left, so the run
  // reads as switchbacks rather than as one long slope.
  const forward = seed % 2 === 0;
  const xs: number[] = [];
  for (let i = 0; i <= TERRACE_STEPS; i += 1) {
    const x = left + ((right - left) * i) / TERRACE_STEPS;
    xs.push(forward ? x : right - (x - left));
  }
  let y = top;
  let d = `M ${xs[0]!.toFixed(1)} ${y.toFixed(1)}`;
  for (let i = 1; i <= TERRACE_STEPS; i += 1) {
    const drop = TERRACE_DROP_PX * rippleScale(seed * TERRACE_STEPS + i);
    const nextY = y + drop;
    const fromX = xs[i - 1]!;
    const toX = xs[i]!;
    const mid = (fromX + toX) / 2;
    // Horizontal tangents at both ends: each step is a shelf easing into the
    // next, which is what makes the edge read as a terrace and not a ramp.
    d += ` C ${mid.toFixed(1)} ${y.toFixed(1)}, ${mid.toFixed(1)} ${nextY.toFixed(1)}, ${toX.toFixed(1)} ${nextY.toFixed(1)}`;
    y = nextY;
  }
  const floor = top + depth;
  d += ` L ${xs[TERRACE_STEPS]!.toFixed(1)} ${floor.toFixed(1)} L ${xs[0]!.toFixed(1)} ${floor.toFixed(1)} Z`;
  return d;
}
