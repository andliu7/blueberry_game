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
import type { HitTarget, InFlightGuide, InteractionEvent, MechanismDraft, PointerInput, PointerKind, Point2 } from "@blueberry/interaction";
import type { StepScene } from "../../render/layout/stepScene";
import { AtomSphere, BondCapsule, ChargeBadge, DepthDefs, HydrogenArc, SHADOW_FILTER_ID } from "../../render/svg/depth";
import { PX, atomCentre, atomRadius, bondIdFor, createHitTester, lonePairSlots, mix, speciesOf, toPx, type DrawTarget, type SpeciesOffsets } from "./hitLayout";

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

function arrowEndpoints(step: MechanismStep, scene: StepScene, arrow: ElectronFlowArrow): { from: Point2; to: Point2 } {
  let from: Point2;
  switch (arrow.source.kind) {
    case "lonePair":
    case "singleElectron": {
      const slots = lonePairSlots(scene, arrow.source.atomId);
      from = slots[0] ?? atomCentre(scene, arrow.source.atomId);
      break;
    }
    case "bond": {
      const bondId = arrow.source.bondId;
      let found: Point2 | null = null;
      for (const bond of scene.bonds) {
        if (bondIdFor(step, bond.a, bond.b) === bondId) {
          found = mix(atomCentre(scene, bond.a), atomCentre(scene, bond.b), 0.5);
        }
      }
      from = found ?? { x: 0, y: 0 };
      break;
    }
    default: {
      const unreachable: never = arrow.source;
      from = unreachable;
    }
  }
  const to =
    arrow.sink.kind === "atom"
      ? atomCentre(scene, arrow.sink.atomId)
      : mix(atomCentre(scene, arrow.sink.atomIds[0]), atomCentre(scene, arrow.sink.atomIds[1]), 0.5);
  return { from, to };
}

function curve(from: Point2, to: Point2, bow: number): string {
  const mid = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * bow;
  const ny = (dx / len) * bow;
  return `M ${from.x} ${from.y} Q ${mid.x + nx} ${mid.y + ny} ${to.x} ${to.y}`;
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
                        return (
                          <g key={index}>
                            <circle cx={slot.x} cy={slot.y} r={12} fill={armedSlot ? "var(--primary)" : "var(--card)"} stroke="var(--primary)" strokeWidth={1.5} opacity={armedSlot ? 0.9 : 0.5} />
                            <circle cx={slot.x - 3.2} cy={slot.y} r={2.4} fill={armedSlot ? "#fff" : "var(--bond-stroke)"} />
                            <circle cx={slot.x + 3.2} cy={slot.y} r={2.4} fill={armedSlot ? "#fff" : "var(--bond-stroke)"} />
                          </g>
                        );
                      })
                    : atom.fromLonePairs > 0 && (
                        <text x={c.x} y={c.y - r - 12} textAnchor="middle" fontSize={11} fill="var(--scene-faint)">
                          {atom.fromLonePairs} pair{atom.fromLonePairs === 1 ? "" : "s"}
                        </text>
                      )}
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
            // Drawn as the capsule's end cap, a bead smaller than its hit circle (entry.radius), so the bond stays visible.
            r={sameTargetLoose(entry.target, armedTarget) ? 8 : 6.5}
            fill="var(--card)"
            stroke={sameTargetLoose(entry.target, armedTarget) ? "var(--primary)" : "var(--bond-stroke)"}
            strokeWidth={sameTargetLoose(entry.target, armedTarget) ? 3 : 2}
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
              const armedHere = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id;
              const badgeAt = { x: c.x + (r + 6) * Math.cos(-atom.from.badgeAngle), y: c.y + (r + 6) * Math.sin(-atom.from.badgeAngle) };
              return (
                <g key={atom.id} className={wobbling.has(atom.id) ? "wobble" : undefined} style={{ cursor: "grab" }}>
                  {armedHere ? <circle cx={c.x} cy={c.y} r={r + 8} fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 4" /> : null}
                  <AtomSphere centre={c} r={r} element={atom.element} />
                  <ChargeBadge at={badgeAt} charge={atom.fromCharge} />
                </g>
              );
            })}
        </g>
      ))}

      {/* Between atom sites, offered while a source is armed. */}
      {targets
        .filter((entry) => entry.target.kind === "betweenAtomsSite")
        .map((entry) => (
          <circle key={JSON.stringify(entry.target)} cx={entry.centre.x} cy={entry.centre.y} r={entry.radius} fill="var(--primary)" opacity={0.18} stroke="var(--primary)" strokeDasharray="3 3" />
        ))}

      {/* The student's arrows, from live positions because they span species. */}
      {draft.arrows.map((arrow, index) => {
        const { from, to } = arrowEndpoints(step, live, arrow);
        const bow = (index % 2 === 0 ? 1 : -1) * 28;
        return (
          <path
            key={arrow.id}
            d={curve(from, to, bow)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={3}
            strokeLinecap="round"
            markerEnd="url(#draw-arrowhead)"
            className={snapping ? "snap-back" : undefined}
            style={snapping ? ({ "--snap-dx": `${(to.x - from.x) * 0.6}px`, "--snap-dy": `${(to.y - from.y) * 0.6}px` } as CSSProperties) : undefined}
          />
        );
      })}

      {/* The dashed in flight guide, per capture x01. */}
      {guide !== null ? (
        <line
          x1={guide.from.x}
          y1={guide.from.y}
          x2={guide.to.x}
          y2={guide.to.y}
          stroke="var(--primary)"
          strokeWidth={2.5}
          strokeDasharray={reducedMotion ? undefined : "6 6"}
          strokeLinecap="round"
          opacity={0.8}
        />
      ) : null}
      <text x={maxX + PAD - 8} y={minY - PAD + 14} textAnchor="end" fontSize={9} fill="var(--scene-faint)">
        {PX} px per bond
      </text>
    </svg>
  );
}
