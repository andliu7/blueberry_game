/**
 * The interactive canvas: the step's `from` state with the student's arrows
 * over it, fed by pointer events into the interaction store.
 *
 * Why this is not MoleculeSvg with extra props: MoleculeSvg is one of two
 * implementations of the renderer contract (2D and 3D), and that contract is
 * a pure projection of a precomputed scene plus a progress number. Teaching
 * it about armed sources, in flight guides and bond handles would push the
 * same props into the 3D renderer, where they mean nothing. So the draw mode
 * is its own SVG that shares the scene, the pixel scale, the element colours
 * and the depth glyphs (render/svg/depth.tsx), and the playback after a
 * correct answer hands off to MoleculeSvg.
 *
 * Pointer plumbing, the one place DOM types appear: a PointerEvent becomes a
 * PointerInput at this boundary. Coordinates go through the SVG's screen CTM
 * so the point is in the same pixel space the targets were computed in,
 * whatever size the canvas renders at. touch-action: none is palm rejection
 * for pen and lets a drag start without the page scrolling. setPointerCapture
 * keeps move and up events coming after the pointer leaves the SVG.
 *
 * MOVING A MOLECULE. The interaction machine has no movement threshold on
 * purpose (machine.ts, "why movement distance is not used to classify
 * anything"), so picking a species up and carrying it cannot be one of its
 * rules. It is this file's: a press the hit tester resolves to an atom BODY,
 * while nothing is armed, is a drag candidate. Once the pointer travels past
 * DRAG_START_PX the canvas owns the gesture: the species offset follows the
 * pointer and the machine is sent nothing until release, when it receives a
 * pointerUp at the original press point so R2 sees a plain tap and the
 * session closes. The press itself still went to the machine at pointer down
 * (R1 revealed the lone pairs, which is the acknowledgement), so a carry is
 * a tap with a journey in the middle, exactly the shape the machine expects.
 *
 * The attachments lag. Atoms move with the pointer; the bonds, hydrogen arcs
 * and lone pair dots of that species sit in a second group whose transform
 * has a 120 ms overshoot transition. Every move retargets it, so they trail
 * and then settle when the hand stops. Transform only, so the compositor
 * does the work; reduced motion drops the transition and they move as one.
 *
 * Lone pairs render for revealed atoms (tap an atom to reveal, which is the
 * machine's rule, not this file's), bond end handles render on every bond,
 * and between-atom sites render only while a source is armed.
 */

import { useCallback, useMemo, useRef, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import { inferSink, targetAtomId, type ArmedElectronSource, type HitTarget, type InFlightGuide, type InteractionEvent, type MechanismDraft, type PointerInput, type PointerKind, type Point2 } from "@blueberry/interaction";
import type { StepScene } from "../../render/layout/stepScene";
import { AtomSphere, BondCapsule, ChargeBadge, DepthDefs, HydrogenArc, SHADOW_FILTER_ID } from "../../render/svg/depth";
import {
  PX,
  atomCentre,
  atomRadius,
  bondIdFor,
  bondMidpoint,
  bowAwayFrom,
  createHitTester,
  lonePairSlots,
  mix,
  nearestLonePairSlot,
  rimPoint,
  sceneCentroid,
  speciesOf,
  targetAnchor,
  toPx,
  type DrawTarget,
  type SpeciesOffsets,
} from "./hitLayout";

/** Pixels of travel before a press on an atom body becomes a carry. */
const DRAG_START_PX = 6;
const LAG_MS = 120;
const LAG_EASE = "cubic-bezier(0.34, 1.56, 0.64, 1)";

export type FailureAnimation =
  | { readonly kind: "snapBack"; readonly key: number }
  | { readonly kind: "wobble"; readonly atomIds: readonly AtomId[]; readonly key: number }
  | null;

export interface DrawCanvasProps {
  readonly step: MechanismStep;
  /** The authored scene. Frames the view box so the canvas never chases a drag. */
  readonly scene: StepScene;
  /** The live scene: authored positions plus where each species was carried. Everything draws from this. */
  readonly live: StepScene;
  readonly offsets: SpeciesOffsets;
  readonly onSpeciesMove: (speciesId: string, offset: Point2) => void;
  readonly draft: MechanismDraft;
  readonly guide: InFlightGuide | null;
  readonly targets: readonly DrawTarget[];
  readonly dispatch: (event: InteractionEvent) => void;
  readonly failure: FailureAnimation;
  readonly reducedMotion: boolean;
}

function pointerKind(type: string): PointerKind {
  if (type === "pen") return "pen";
  if (type === "touch") return "touch";
  return "mouse";
}

function sameTargetLoose(a: HitTarget, b: HitTarget | undefined): boolean {
  if (b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** How far a curve's control point sits off its chord, in px. */
const BOW_PX = 34;
/**
 * Clearance between an arrowhead and the surface it points at.
 *
 * The head is a marker 7 units wide on a 3px stroke, so it occupies roughly
 * 20px along the path BEHIND its tip. A 3px gap therefore seated the tip just
 * off the sphere while the body of the triangle lay across the element letter,
 * which a blind critic read as the destination atom being hidden by the very
 * mark meant to point at it. The gap is the whole head plus air.
 */
const LAND_GAP = 16;
/** How far the armed lone pair dots glide toward the pointer, at most. */
const LP_GLIDE_PX = 7;

/**
 * A sink resolved to geometry. An atom sink lands on that atom's SURFACE, on
 * the side the curve arrives from. A between-atoms sink is a forming bond: a
 * dashed stub between the two atom surfaces, and the arrow lands on its middle.
 * `ring` is where a drop-site highlight is drawn and how big.
 */
interface SinkGeometry {
  readonly landing: Point2;
  readonly stub: { readonly a: Point2; readonly b: Point2 } | null;
  readonly ring: { readonly centre: Point2; readonly r: number };
}

function elementRadius(scene: StepScene, atomId: AtomId): number {
  return atomRadius(scene.atoms.find((atom) => atom.id === atomId)?.element ?? "C");
}

function atomSinkGeometry(scene: StepScene, atomId: AtomId, from: Point2, centroid: Point2): SinkGeometry {
  const centre = atomCentre(scene, atomId);
  const r = elementRadius(scene, atomId);
  // The curve arrives along the control point to centre direction, so the
  // landing is the rim point facing the control point, not facing the source.
  const ctrl = bowAwayFrom(from, centre, centroid, BOW_PX);
  return { landing: rimPoint(centre, ctrl, r + LAND_GAP), stub: null, ring: { centre, r: r + 7 } };
}

function bondSinkGeometry(scene: StepScene, atomIds: readonly [AtomId, AtomId]): SinkGeometry {
  const ca = atomCentre(scene, atomIds[0]);
  const cb = atomCentre(scene, atomIds[1]);
  const a = rimPoint(ca, cb, elementRadius(scene, atomIds[0]) + 1);
  const b = rimPoint(cb, ca, elementRadius(scene, atomIds[1]) + 1);
  const landing = mix(a, b, 0.5);
  return { landing, stub: { a, b }, ring: { centre: landing, r: 11 } };
}

/** Committed arrow: source anchor from the slot or bond it left, sink per the rules above. */
function committedArrowGeometry(step: MechanismStep, scene: StepScene, arrow: ElectronFlowArrow, centroid: Point2): { from: Point2; sink: SinkGeometry } {
  const sinkCentre =
    arrow.sink.kind === "atom"
      ? atomCentre(scene, arrow.sink.atomId)
      : mix(atomCentre(scene, arrow.sink.atomIds[0]), atomCentre(scene, arrow.sink.atomIds[1]), 0.5);
  let from: Point2;
  switch (arrow.source.kind) {
    case "lonePair":
    case "singleElectron":
      // The committed arrow does not remember which slot was tapped; the slot
      // facing the sink is the one the electrons left from.
      from = nearestLonePairSlot(scene, arrow.source.atomId, sinkCentre);
      break;
    case "bond":
      from = bondMidpoint(step, scene, arrow.source.bondId) ?? sinkCentre;
      break;
    default: {
      const unreachable: never = arrow.source;
      from = unreachable;
    }
  }
  const sink = arrow.sink.kind === "atom" ? atomSinkGeometry(scene, arrow.sink.atomId, from, centroid) : bondSinkGeometry(scene, arrow.sink.atomIds);
  return { from, sink };
}

/** The atom a committed arrow's electrons leave from: the lone pair's atom, or the first atom of the bond. */
function sourceAtomId(step: MechanismStep, arrow: ElectronFlowArrow): AtomId | null {
  if (arrow.source.kind !== "bond") return arrow.source.atomId;
  for (const member of step.from.members) {
    for (const bond of member.species.bonds) if (bond.id === arrow.source.bondId) return bond.a;
  }
  return null;
}

function curveAway(from: Point2, to: Point2, centroid: Point2): string {
  const ctrl = bowAwayFrom(from, to, centroid, BOW_PX);
  return `M ${from.x} ${from.y} Q ${ctrl.x} ${ctrl.y} ${to.x} ${to.y}`;
}

/**
 * The in flight guide, resolved: where it starts, where it ends, and what it
 * would land on. The landing is whatever the machine's own inference says a
 * release on `snappedTo` would make (a lone pair dropped on an atom forms a
 * bond to it, so the arrow lands on the forming bond's stub, not the atom's
 * centre), so the preview and the committed arrow cannot disagree. `hovered`
 * is the atom under the pointer, for a halo, when the landing is not on it.
 */
function guideGeometry(step: MechanismStep, scene: StepScene, guide: InFlightGuide, armed: ArmedElectronSource | null, centroid: Point2): { from: Point2; to: Point2; sink: SinkGeometry | null; hovered: AtomId | null; away: Point2 } {
  const from = targetAnchor(step, scene, guide.anchor) ?? guide.from;
  const snapped = guide.snappedTo;
  const overOwnSource = sameTargetLoose(snapped, guide.anchor) || (snapped.kind !== "empty" && targetAtomId(snapped) !== null && targetAtomId(snapped) === targetAtomId(guide.anchor));
  const inferred = armed === null || overOwnSource ? null : inferSink(armed, snapped, step.from);
  if (inferred !== null && inferred.ok) {
    const hovered = snapped.kind === "atom" ? snapped.atomId : null;
    if (inferred.sink.kind === "atom") {
      const sink = atomSinkGeometry(scene, inferred.sink.atomId, from, centroid);
      return { from, to: sink.landing, sink, hovered: null, away: centroid };
    }
    const sink = bondSinkGeometry(scene, inferred.sink.atomIds);
    return { from, to: sink.landing, sink, hovered, away: centroid };
  }
  // Over nothing the machine would accept: the head rides the finger, per x01.
  return { from, to: guide.to, sink: null, hovered: null, away: centroid };
}

/**
 * The bond that stretches while you drag, per docs/reference/alchemie/extra/x02.
 *
 * Two cases, one shape. Pulling a bond's end handle stretches THAT bond: the
 * end you did not grab stays put on its atom and the other end follows the
 * finger. Pulling a lone pair stretches the bond you are ABOUT to make: it
 * reaches out of the atom the electrons are leaving. Either way a student sees
 * a physical thing being pulled rather than a line being specified, which is
 * the whole difference between this and a diagram.
 *
 * Returns null when the gesture is not one that stretches a bond.
 */
interface Stretch {
  readonly from: Point2;
  readonly to: Point2;
  readonly rFrom: number;
  /** True while the release would land somewhere the machine accepts. */
  readonly landing: boolean;
  /** A bond being pulled apart, rather than one being formed. */
  readonly existing: boolean;
}

function stretchGeometry(step: MechanismStep, scene: StepScene, guide: InFlightGuide, sink: SinkGeometry | null): Stretch | null {
  const anchor = guide.anchor;
  const head = sink === null ? guide.to : sink.landing;

  if (anchor.kind === "bondEndHandle") {
    for (const bond of scene.bonds) {
      if (bondIdFor(step, bond.a, bond.b) !== anchor.bondId) continue;
      // The end that stays is the one you did not grab.
      const anchoredAt = bond.a === anchor.atomId ? bond.b : bond.a;
      return {
        from: atomCentre(scene, anchoredAt),
        to: head,
        rFrom: elementRadius(scene, anchoredAt),
        landing: sink !== null,
        existing: true,
      };
    }
    return null;
  }

  if (anchor.kind === "lonePair" || anchor.kind === "unpairedElectron") {
    return {
      from: atomCentre(scene, anchor.atomId),
      to: head,
      rFrom: elementRadius(scene, anchor.atomId),
      landing: sink !== null,
      existing: false,
    };
  }

  return null;
}

interface Carry {
  readonly pointerId: number;
  readonly speciesId: string;
  readonly down: PointerInput;
  readonly startOffset: Point2;
  /** False until the pointer has travelled DRAG_START_PX; until then the machine still owns the press. */
  active: boolean;
}

export function DrawCanvas({ step, scene, live, offsets, onSpeciesMove, draft, guide, targets, dispatch, failure, reducedMotion }: DrawCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const carryRef = useRef<Carry | null>(null);
  const targetsRef = useRef(targets);
  targetsRef.current = targets;
  // The same hit tester the machine uses, over the same live targets, so the
  // canvas and the machine agree about what "on an atom body" means.
  const hitTester = useMemo(() => createHitTester(() => targetsRef.current), []);
  const owner = useMemo(() => speciesOf(step), [step]);

  const toInput = useCallback((event: ReactPointerEvent<SVGSVGElement>): PointerInput | null => {
    const svg = svgRef.current;
    if (svg === null) return null;
    const ctm = svg.getScreenCTM();
    if (ctm === null) return null;
    const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
    return {
      pointerId: event.pointerId,
      pointerType: pointerKind(event.pointerType),
      point: { x: point.x, y: point.y },
      timestampMs: event.timeStamp,
      ...(event.pointerType === "pen" ? { pressure: event.pressure } : {}),
      ...(event.pointerType === "mouse" ? { buttonIsPrimary: event.button === 0 || event.buttons === 1 } : {}),
    };
  }, []);

  const onPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone (released before this ran, or not a
      // pointer the browser is tracking). Capture is a nicety; the press is not.
    }
    if (carryRef.current === null && draft.armed === null) {
      const hit = hitTester.hitTest({ point: pointer.point, pointerType: pointer.pointerType, armedSource: null });
      if (hit.primary.kind === "atom") {
        const speciesId = owner.get(hit.primary.atomId);
        if (speciesId !== undefined) {
          carryRef.current = { pointerId: pointer.pointerId, speciesId, down: pointer, startOffset: offsets[speciesId] ?? { x: 0, y: 0 }, active: false };
        }
      }
    }
    dispatch({ kind: "pointerDown", pointer });
  };

  const onPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    const carry = carryRef.current;
    if (carry !== null && carry.pointerId === pointer.pointerId) {
      const dx = pointer.point.x - carry.down.point.x;
      const dy = pointer.point.y - carry.down.point.y;
      if (!carry.active && Math.hypot(dx, dy) > DRAG_START_PX) carry.active = true;
      if (carry.active) {
        onSpeciesMove(carry.speciesId, clampToFrame(carry.speciesId, { x: carry.startOffset.x + dx, y: carry.startOffset.y + dy }));
        return;
      }
    }
    dispatch({ kind: "pointerMove", pointer });
  };

  const onPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    const carry = carryRef.current;
    if (carry !== null && carry.pointerId === pointer.pointerId) {
      carryRef.current = null;
      if (carry.active) {
        // The carry was the canvas's; the machine sees a tap where the press landed.
        dispatch({ kind: "pointerUp", pointer: { ...pointer, point: carry.down.point } });
        return;
      }
    }
    dispatch({ kind: "pointerUp", pointer });
  };

  const onPointerCancel = (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    if (carryRef.current?.pointerId === pointer.pointerId) carryRef.current = null;
    dispatch({ kind: "pointerCancel", pointer });
  };

  // View box from the AUTHORED from positions, same padding as MoleculeSvg.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const atom of scene.atoms) {
    const q = toPx(atom.from.pos);
    minX = Math.min(minX, q.x);
    maxX = Math.max(maxX, q.x);
    minY = Math.min(minY, q.y);
    maxY = Math.max(maxY, q.y);
  }
  const PAD = 64;
  const viewBox = `${minX - PAD} ${minY - PAD} ${maxX - minX + 2 * PAD} ${maxY - minY + 2 * PAD}`;

  // A carried species stays inside the frame. The frame does not follow the
  // molecule (that would cancel the drag visually), so the offset is clamped
  // to keep every atom of the species at least an atom's width from the edge.
  const clampToFrame = (speciesId: string, offset: Point2): Point2 => {
    const MARGIN = 30;
    let lo = { x: -Infinity, y: -Infinity };
    let hi = { x: Infinity, y: Infinity };
    for (const atom of scene.atoms) {
      if (owner.get(atom.id) !== speciesId) continue;
      const c = toPx(atom.from.pos);
      lo = { x: Math.max(lo.x, minX - PAD + MARGIN - c.x), y: Math.max(lo.y, minY - PAD + MARGIN - c.y) };
      hi = { x: Math.min(hi.x, maxX + PAD - MARGIN - c.x), y: Math.min(hi.y, maxY + PAD - MARGIN - c.y) };
    }
    return { x: Math.min(hi.x, Math.max(lo.x, offset.x)), y: Math.min(hi.y, Math.max(lo.y, offset.y)) };
  };

  const armedTarget = draft.armed?.target;
  const wobbling = failure?.kind === "wobble" ? new Set(failure.atomIds) : new Set<AtomId>();
  const snapping = failure?.kind === "snapBack";

  // Arrow geometry from the LIVE scene, because arrows span species and must
  // follow a carried molecule. A curve bows away from the centroid of the
  // species its electrons LEAVE, so it arcs outward from that molecule rather
  // than across it; the whole scene's centroid is the fallback when the source
  // atom is unknown.
  const awayFrom = (atomId: AtomId | null): Point2 => {
    const speciesId = atomId === null ? undefined : owner.get(atomId);
    if (speciesId === undefined) return sceneCentroid(live);
    return sceneCentroid({ ...live, atoms: live.atoms.filter((atom) => owner.get(atom.id) === speciesId) });
  };
  const inFlight = guide === null ? null : guideGeometry(step, live, guide, draft.armed, awayFrom(targetAtomId(guide.anchor)));
  const stretch = guide === null || inFlight === null ? null : stretchGeometry(step, live, guide, inFlight.sink);
  // The armed lone pair's dots glide a little toward the pointer while it
  // drags, so the electrons visibly start to move. The halo stays put: the
  // dots are the electrons, the halo is the slot.
  const glideOf = (slot: Point2): Point2 => {
    if (guide === null) return { x: 0, y: 0 };
    const dx = guide.to.x - slot.x;
    const dy = guide.to.y - slot.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return { x: 0, y: 0 };
    const k = Math.min(LP_GLIDE_PX, len * 0.15) / len;
    return { x: dx * k, y: dy * k };
  };

  // Species groups. Each species draws its atoms and attachments in AUTHORED
  // coordinates inside a <g> translated by its offset, so the carry is one
  // transform per group and the attachments' lag is one transition per group.
  const speciesIds = [...new Set(owner.values())];
  const lagStyle = (speciesId: string): CSSProperties => {
    const offset = offsets[speciesId] ?? { x: 0, y: 0 };
    return {
      transform: `translate(${offset.x}px, ${offset.y}px)`,
      transition: reducedMotion ? "none" : `transform ${LAG_MS}ms ${LAG_EASE}`,
    };
  };
  const bodyStyle = (speciesId: string): CSSProperties => {
    const offset = offsets[speciesId] ?? { x: 0, y: 0 };
    return { transform: `translate(${offset.x}px, ${offset.y}px)` };
  };

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      role="application"
      aria-label="Draw the mechanism. Tap an atom to show its lone pairs, tap a lone pair or bond handle to start an arrow, tap where it should go. Press and drag an atom to move its molecule."
      className="h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <defs>
        <DepthDefs />
        <marker id="draw-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
        </marker>
      </defs>

      {/* Attachments per species, on the lag: bonds, hydrogen arcs, lone pair dots. */}
      {speciesIds.map((speciesId) => (
        <g key={`lag-${speciesId}`} style={lagStyle(speciesId)} filter={`url(#${SHADOW_FILTER_ID})`}>
          {scene.bonds
            .filter((bond) => bond.phase !== "forming" && owner.get(bond.a) === speciesId)
            .map((bond) => (
              <BondCapsule
                key={bond.key}
                a={atomCentre(scene, bond.a)}
                b={atomCentre(scene, bond.b)}
                rA={atomRadius(scene.atoms.find((atom) => atom.id === bond.a)?.element ?? "C")}
                rB={atomRadius(scene.atoms.find((atom) => atom.id === bond.b)?.element ?? "C")}
                order={bond.order}
              />
            ))}
          {scene.atoms
            .filter((atom) => owner.get(atom.id) === speciesId)
            .map((atom) => {
              const c = toPx(atom.from.pos);
              const r = atomRadius(atom.element);
              const revealed = draft.revealedLonePairs.includes(atom.id);
              return (
                <g key={atom.id}>
                  <HydrogenArc centre={c} openAngle={atom.from.openAngle} count={atom.fromImplicitH} r={r} />
                  {revealed
                    ? lonePairSlots(scene, atom.id).map((slot, index) => {
                        const armedSlot = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id && armedTarget.slotIndex === index;
                        // Glide is measured against the live slot (the lag group is
                        // in authored coordinates, so the offset is species local either way).
                        const glide = armedSlot ? glideOf(lonePairSlots(live, atom.id)[index] ?? slot) : { x: 0, y: 0 };
                        // Once one pair is armed the others step back, so the
                        // source of the gesture is unambiguous. Before anything
                        // is armed they are equal: all are equally choosable.
                        const anyArmedHere = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id;
                        const dimmed = anyArmedHere && !armedSlot;
                        return (
                          <g key={index} opacity={dimmed ? 0.3 : 1}>
                            <circle cx={slot.x} cy={slot.y} r={12} fill={armedSlot ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" strokeWidth={armedSlot ? 2.5 : 1.5} opacity={armedSlot ? 0.95 : 0.5} />
                            <g style={{ transform: `translate(${glide.x}px, ${glide.y}px)`, transition: reducedMotion ? "none" : "transform 60ms ease-out" }}>
                              <circle cx={slot.x - 3.2} cy={slot.y} r={2.4} fill={armedSlot ? "#fff" : "var(--bond-stroke)"} />
                              <circle cx={slot.x + 3.2} cy={slot.y} r={2.4} fill={armedSlot ? "#fff" : "var(--bond-stroke)"} />
                            </g>
                          </g>
                        );
                      })
                    : lonePairSlots(scene, atom.id).map((slot, index) => (
                        // At rest the pairs are DRAWN, faintly, not described in
                        // words: "3 pairs" is a caption, and a student aims at
                        // dots. Same lobe-around-two-dots shape as the revealed
                        // state, just quiet: a blind critic praised the lobe for
                        // making a pair countable, then caught us using naked
                        // dots on some atoms and lobes on others, which is two
                        // visual languages for one idea. Tapping the atom
                        // promotes these to targets.
                        <g key={index} opacity={0.45}>
                          <circle cx={slot.x} cy={slot.y} r={11} fill="none" stroke="var(--scene-faint)" strokeWidth={1.2} />
                          <circle cx={slot.x - 3.2} cy={slot.y} r={2.2} fill="var(--bond-stroke)" />
                          <circle cx={slot.x + 3.2} cy={slot.y} r={2.2} fill="var(--bond-stroke)" />
                        </g>
                      ))}
                </g>
              );
            })}
        </g>
      ))}

      {/* Bond end handles, the drag target per the Alchemie capture x02. Live positions, no lag. */}
      {targets
        .filter((entry) => entry.target.kind === "bondEndHandle")
        .map((entry) => (
          <circle
            key={JSON.stringify(entry.target)}
            cx={entry.centre.x}
            cy={entry.centre.y}
            // A ball joint on the atom's skin, the way the capture draws it:
            // filled and light, the same family as the capsule, so it reads as
            // the end of the bond rather than as a ring floating over it.
            r={sameTargetLoose(entry.target, armedTarget) ? 8 : 6}
            fill={sameTargetLoose(entry.target, armedTarget) ? "var(--primary)" : "var(--bond-stroke)"}
            stroke={sameTargetLoose(entry.target, armedTarget) ? "var(--primary)" : "none"}
            strokeWidth={sameTargetLoose(entry.target, armedTarget) ? 3 : 0}
          />
        ))}

      {/* Atom bodies per species, moving with the pointer. */}
      {speciesIds.map((speciesId) => (
        <g key={`body-${speciesId}`} style={bodyStyle(speciesId)} filter={`url(#${SHADOW_FILTER_ID})`}>
          {scene.atoms
            .filter((atom) => owner.get(atom.id) === speciesId)
            .map((atom) => {
              const c = toPx(atom.from.pos);
              const r = atomRadius(atom.element);
              // The armed lone pair slot already fills solid; a ring around the
              // whole atom would read as a drop site, which it is not.
              const badgeAt = { x: c.x + (r + 6) * Math.cos(-atom.from.badgeAngle), y: c.y + (r + 6) * Math.sin(-atom.from.badgeAngle) };
              return (
                <g key={atom.id} className={wobbling.has(atom.id) ? "wobble" : undefined} style={{ cursor: "grab" }}>
                  <AtomSphere centre={c} r={r} element={atom.element} />
                  <ChargeBadge at={badgeAt} charge={atom.fromCharge} />
                </g>
              );
            })}
        </g>
      ))}

      {/* Between atom sites, offered while a source is armed: the forming bond
          a drop there would make, as a faint stub between the two surfaces. */}
      {targets
        .filter((entry) => entry.target.kind === "betweenAtomsSite")
        .map((entry) => {
          if (entry.target.kind !== "betweenAtomsSite") return null;
          const { stub } = bondSinkGeometry(live, entry.target.atomIds);
          if (stub === null) return null;
          return <line key={JSON.stringify(entry.target)} x1={stub.a.x} y1={stub.a.y} x2={stub.b.x} y2={stub.b.y} stroke="var(--primary)" strokeWidth={2.5} strokeDasharray="3 6" strokeLinecap="round" opacity={0.22} />;
        })}

      {/* The student's arrows, from live positions because they span species.
          Each starts on its source (lone pair slot or bond middle) and ends on
          its sink's surface, or on the dashed stub of the bond it forms. */}
      {draft.arrows.map((arrow) => {
        const centroid = awayFrom(sourceAtomId(step, arrow));
        const { from, sink } = committedArrowGeometry(step, live, arrow, centroid);
        const to = sink.landing;
        return (
          <g key={arrow.id} className={snapping ? "snap-back" : undefined} style={snapping ? ({ "--snap-dx": `${(to.x - from.x) * 0.6}px`, "--snap-dy": `${(to.y - from.y) * 0.6}px` } as CSSProperties) : undefined}>
            {sink.stub !== null ? <line x1={sink.stub.a.x} y1={sink.stub.a.y} x2={sink.stub.b.x} y2={sink.stub.b.y} stroke="var(--primary)" strokeWidth={3.5} strokeDasharray="4 5" strokeLinecap="round" opacity={0.7} /> : null}
            <path d={curveAway(from, to, centroid)} fill="none" stroke="var(--primary)" strokeWidth={3} strokeLinecap="round" markerEnd="url(#draw-arrowhead)" />
          </g>
        );
      })}

      {/* The dashed in flight guide, per capture x01: starts on the source,
          head at the finger, or on the drop site once the release would land
          there. The site itself gets a ring so the student sees the landing
          before letting go. The machine's snappedTo decides which; this only draws it. */}
      {inFlight !== null ? (
        <g style={{ pointerEvents: "none" }}>
          {/* The bond being pulled. Drawn UNDER the guide and the stub so the
              arrow stays the thing you read first. An existing bond keeps its
              own colour as it stretches; a forming one arrives in the accent,
              faint until the release would actually land. */}
          {stretch !== null ? (
            <g opacity={stretch.landing ? 0.95 : 0.55}>
              <line
                x1={rimPoint(stretch.from, stretch.to, stretch.rFrom - 2).x}
                y1={rimPoint(stretch.from, stretch.to, stretch.rFrom - 2).y}
                x2={stretch.to.x}
                y2={stretch.to.y}
                stroke={stretch.existing ? "var(--bond-stroke)" : "var(--primary)"}
                strokeWidth={stretch.existing ? 11 : 8}
                strokeLinecap="round"
              />
              <line
                x1={rimPoint(stretch.from, stretch.to, stretch.rFrom - 2).x - 1.2}
                y1={rimPoint(stretch.from, stretch.to, stretch.rFrom - 2).y - 1.6}
                x2={stretch.to.x - 1.2}
                y2={stretch.to.y - 1.6}
                stroke="#ffffff"
                strokeOpacity={0.4}
                strokeWidth={stretch.existing ? 3.6 : 2.6}
                strokeLinecap="round"
              />
            </g>
          ) : null}
          {inFlight.sink?.stub ? <line x1={inFlight.sink.stub.a.x} y1={inFlight.sink.stub.a.y} x2={inFlight.sink.stub.b.x} y2={inFlight.sink.stub.b.y} stroke="var(--primary)" strokeWidth={3.5} strokeDasharray="4 5" strokeLinecap="round" opacity={0.8} /> : null}
          {inFlight.hovered !== null ? <circle cx={atomCentre(live, inFlight.hovered).x} cy={atomCentre(live, inFlight.hovered).y} r={elementRadius(live, inFlight.hovered) + 6} fill="none" stroke="var(--primary)" strokeWidth={2} opacity={0.45} /> : null}
          {inFlight.sink !== null ? (
            <>
              {inFlight.sink.stub === null ? <circle cx={inFlight.sink.ring.centre.x} cy={inFlight.sink.ring.centre.y} r={inFlight.sink.ring.r + 2} fill="var(--primary)" opacity={0.12} /> : null}
              <circle cx={inFlight.sink.ring.centre.x} cy={inFlight.sink.ring.centre.y} r={inFlight.sink.ring.r} fill="none" stroke="var(--primary)" strokeWidth={inFlight.sink.stub === null ? 3 : 2.5} opacity={0.95} />
            </>
          ) : null}
          <path
            d={curveAway(inFlight.from, inFlight.to, inFlight.away)}
            fill="none"
            stroke="var(--primary)"
            // The guide carries the same weight and saturation as its head. A
            // thin translucent line under a solid arrowhead reads as two
            // different marks rather than one gesture, which is what a blind
            // critic saw: the head looked placed and the tail looked like a
            // hint. One stroke, one opacity.
            strokeWidth={3.5}
            strokeDasharray={reducedMotion ? undefined : "7 6"}
            strokeLinecap="round"
            markerEnd="url(#draw-arrowhead)"
          />
          <circle cx={inFlight.from.x} cy={inFlight.from.y} r={3} fill="var(--primary)" />
        </g>
      ) : null}
    </svg>
  );
}
