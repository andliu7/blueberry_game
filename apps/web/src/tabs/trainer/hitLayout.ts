/**
 * What a student can touch on the draw canvas, and the hit tester that says
 * which one they touched.
 *
 * The interaction package declares the HitTester interface (geometryPort.ts)
 * and leaves its implementation to the shell, because only the shell knows
 * where things are drawn. This file computes target circles from the Phase 4
 * scene in the same pixel space MoleculeSvg uses (72 px per bond length, y
 * flipped), so the draw canvas and the hit test cannot disagree about where an
 * atom is.
 *
 * Tolerance by pointer: a fingertip gets slop, a mouse gets the drawn
 * silhouette, a pen sits between, per packages/interaction/src/geometry/
 * targets.ts. The numbers here are the touch profile's in points, applied to
 * the same kinds. Between-atom sites are offered only while a source is armed,
 * which is the rule targets.ts records for betweenAtomsSite.
 *
 * Every drawn target is at least 22 px in radius on touch (44 point diameter),
 * the hit floor in CLAUDE.md.
 */

import type { AtomId } from "@blueberry/chem-core";
import type { HitTarget, HitTestOutcome, HitTestQuery, HitTester, PointerKind, Point2 } from "@blueberry/interaction";
import type { MechanismStep } from "@blueberry/chem-core";
import type { StepScene } from "../../render/layout/stepScene";
import { add, fromAngle } from "../../render/layout/vec";
import type { Vec } from "../../render/layout/vec";

/** Linear interpolation in pixel space. Vec's lerp carries z, which pixels lack. */
export function mix(a: Point2, b: Point2, t: number): Point2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

export const PX = 72;
export const ATOM_R = 21;
export const ATOM_R_SMALL = 13;

export function toPx(v: Vec): Point2 {
  return { x: v.x * PX, y: -v.y * PX };
}

export function atomRadius(element: string): number {
  return element === "H" ? ATOM_R_SMALL : ATOM_R;
}

export interface DrawTarget {
  readonly target: HitTarget;
  readonly centre: Point2;
  /** Drawn radius in px. The hit radius adds pointer slop. */
  readonly radius: number;
}

const SLOP: Record<PointerKind, number> = { touch: 10, pen: 6, mouse: 0 };

/** Lone pair slot positions, the same fan MoleculeSvg draws. */
export function lonePairSlots(scene: StepScene, atomId: AtomId): readonly Point2[] {
  const atom = scene.atoms.find((candidate) => candidate.id === atomId);
  if (atom === undefined) return [];
  const r = atomRadius(atom.element);
  const rimR = (r + 7) / PX;
  const slots: Point2[] = [];
  for (let i = 0; i < atom.fromLonePairs; i += 1) {
    const angle = atom.from.openAngle + Math.PI + (i - (atom.fromLonePairs - 1) / 2) * 1.25;
    slots.push(toPx(add(atom.from.pos, fromAngle(angle, rimR))));
  }
  return slots;
}

export function atomCentre(scene: StepScene, atomId: AtomId): Point2 {
  const atom = scene.atoms.find((candidate) => candidate.id === atomId);
  if (atom === undefined) throw new Error(`no scene atom ${atomId}`);
  return toPx(atom.from.pos);
}

/** Bond ids come from the chem-core state; the scene keys bonds by atom pair. */
export function bondIdFor(step: MechanismStep, a: AtomId, b: AtomId): string | null {
  for (const member of step.from.members) {
    for (const bond of member.species.bonds) {
      if ((bond.a === a && bond.b === b) || (bond.a === b && bond.b === a)) return bond.id;
    }
  }
  return null;
}

export function buildTargets(
  step: MechanismStep,
  scene: StepScene,
  revealedLonePairs: readonly AtomId[],
  armedAtom: AtomId | null,
): readonly DrawTarget[] {
  const targets: DrawTarget[] = [];

  for (const atom of scene.atoms) {
    targets.push({
      target: { kind: "atom", atomId: atom.id },
      centre: toPx(atom.from.pos),
      radius: atomRadius(atom.element),
    });
    if (revealedLonePairs.includes(atom.id)) {
      lonePairSlots(scene, atom.id).forEach((centre, slotIndex) => {
        targets.push({ target: { kind: "lonePair", atomId: atom.id, slotIndex }, centre, radius: 12 });
      });
    }
  }

  for (const bond of scene.bonds) {
    if (bond.phase === "forming") continue;
    const bondId = bondIdFor(step, bond.a, bond.b);
    if (bondId === null) continue;
    const a = atomCentre(scene, bond.a);
    const b = atomCentre(scene, bond.b);
    const handleA = mix(a, b, 0.32);
    const handleB = mix(a, b, 0.68);
    targets.push({ target: { kind: "bondEndHandle", bondId, atomId: bond.a }, centre: handleA, radius: 11 });
    targets.push({ target: { kind: "bondEndHandle", bondId, atomId: bond.b }, centre: handleB, radius: 11 });
  }

  if (armedAtom !== null) {
    const origin = atomCentre(scene, armedAtom);
    for (const other of scene.atoms) {
      if (other.id === armedAtom) continue;
      if (bondIdFor(step, armedAtom, other.id) !== null) continue;
      const centre = mix(origin, toPx(other.from.pos), 0.5);
      targets.push({ target: { kind: "betweenAtomsSite", atomIds: [armedAtom, other.id] }, centre, radius: 14 });
    }
  }

  return targets;
}

function distance(a: Point2, b: Point2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Nearest target whose slop-widened circle contains the point wins; the
 * margin is the runner up's normalised distance minus the winner's, which the
 * machine compares against AMBIGUOUS_MARGIN to decide whether to ask.
 */
export function createHitTester(getTargets: () => readonly DrawTarget[]): HitTester {
  return {
    hitTest(query: HitTestQuery): HitTestOutcome {
      const slop = SLOP[query.pointerType];
      const scored = getTargets()
        .map((entry) => {
          const hitRadius = Math.max(entry.radius + slop, query.pointerType === "touch" ? 22 : entry.radius);
          const score = distance(query.point, entry.centre) / hitRadius;
          return { target: entry.target, score };
        })
        .filter((entry) => entry.score <= 1)
        .sort((a, b) => a.score - b.score);

      const best = scored[0];
      if (best === undefined) {
        return { primary: { kind: "empty", point: query.point }, candidates: [], margin: Number.POSITIVE_INFINITY };
      }
      const second = scored[1];
      return {
        primary: best.target,
        candidates: scored,
        margin: second === undefined ? Number.POSITIVE_INFINITY : second.score - best.score,
      };
    },
  };
}
