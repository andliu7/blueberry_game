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

/** Energy to a distance from the centreline, in pixels, against a half width basis. */
export function channelHalfWidth(energy: number, basis: number): number {
  return basis * (CHANNEL_HALF - energy * CHANNEL_SWING);
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
  const x = (sample: TerrainSample) => geometry.centreX + side * channelHalfWidth(sample.energy, geometry.basis);
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
