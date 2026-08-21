/**
 * The interactive canvas: the step's `from` state with the student's arrows
 * over it, fed by pointer events into the interaction store.
 *
 * Why this is not MoleculeSvg with extra props: MoleculeSvg is one of two
 * implementations of the renderer contract (2D and 3D), and that contract is
 * a pure projection of a precomputed scene plus a progress number. Teaching
 * it about armed sources, in flight guides and bond handles would push the
 * same props into the 3D renderer, where they mean nothing. So the draw mode
 * is its own SVG that shares the scene, the pixel scale and the element
 * colours, and the playback after a correct answer hands off to MoleculeSvg.
 *
 * Pointer plumbing, the one place DOM types appear: a PointerEvent becomes a
 * PointerInput at this boundary. Coordinates go through the SVG's screen CTM
 * so the point is in the same pixel space the targets were computed in,
 * whatever size the canvas renders at. touch-action: none is palm rejection
 * for pen and lets a drag start without the page scrolling. setPointerCapture
 * keeps move and up events coming after the pointer leaves the SVG.
 *
 * Lone pairs render for revealed atoms (tap an atom to reveal, which is the
 * machine's rule, not this file's), bond end handles render on every bond,
 * and between-atom sites render only while a source is armed.
 */

import { useCallback, useRef, type PointerEvent as ReactPointerEvent } from "react";
import type { AtomId, ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import type { HitTarget, InFlightGuide, InteractionEvent, MechanismDraft, PointerInput, PointerKind, Point2 } from "@blueberry/interaction";
import type { StepScene } from "../../render/layout/stepScene";
import { PX, atomCentre, atomRadius, bondIdFor, lonePairSlots, mix, toPx, type DrawTarget } from "./hitLayout";

const ELEMENT_FILL: Record<string, string> = {
  C: "#334155",
  H: "#64748b",
  O: "#dc2626",
  N: "#2563eb",
  Br: "#9a3412",
  Cl: "#15803d",
  S: "#a16207",
  P: "#c2410c",
  F: "#0e7490",
  I: "#6d28d9",
};

export type FailureAnimation =
  | { readonly kind: "snapBack"; readonly key: number }
  | { readonly kind: "wobble"; readonly atomIds: readonly AtomId[]; readonly key: number }
  | null;

export interface DrawCanvasProps {
  readonly step: MechanismStep;
  readonly scene: StepScene;
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

export function DrawCanvas({ step, scene, draft, guide, targets, dispatch, failure, reducedMotion }: DrawCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);

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

  const handle = (kind: "pointerDown" | "pointerMove" | "pointerUp" | "pointerCancel") => (event: ReactPointerEvent<SVGSVGElement>) => {
    const pointer = toInput(event);
    if (pointer === null) return;
    if (kind === "pointerDown") event.currentTarget.setPointerCapture(event.pointerId);
    dispatch({ kind, pointer });
  };

  // View box from the from positions, same padding as MoleculeSvg.
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

  const armedTarget = draft.armed?.target;
  const wobbling = failure?.kind === "wobble" ? new Set(failure.atomIds) : new Set<AtomId>();
  const snapping = failure?.kind === "snapBack";

  return (
    <svg
      ref={svgRef}
      viewBox={viewBox}
      role="application"
      aria-label="Draw the mechanism. Tap an atom to show its lone pairs, tap a lone pair or bond handle to start an arrow, tap where it should go."
      className="h-full w-full select-none"
      style={{ touchAction: "none" }}
      onPointerDown={handle("pointerDown")}
      onPointerMove={handle("pointerMove")}
      onPointerUp={handle("pointerUp")}
      onPointerCancel={handle("pointerCancel")}
    >
      <defs>
        <marker id="draw-arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
        </marker>
      </defs>

      {/* Bonds. */}
      {scene.bonds
        .filter((bond) => bond.phase !== "forming")
        .map((bond) => {
          const a = atomCentre(scene, bond.a);
          const b = atomCentre(scene, bond.b);
          return <line key={bond.key} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--bond-stroke)" strokeWidth={4} strokeLinecap="round" />;
        })}

      {/* Bond end handles, the drag target per the Alchemie capture x02. */}
      {targets
        .filter((entry) => entry.target.kind === "bondEndHandle")
        .map((entry) => (
          <circle
            key={JSON.stringify(entry.target)}
            cx={entry.centre.x}
            cy={entry.centre.y}
            r={entry.radius}
            fill="var(--card)"
            stroke={sameTargetLoose(entry.target, armedTarget) ? "var(--primary)" : "var(--bond-stroke)"}
            strokeWidth={sameTargetLoose(entry.target, armedTarget) ? 3 : 1.5}
          />
        ))}

      {/* Atoms. */}
      {scene.atoms.map((atom) => {
        const c = toPx(atom.from.pos);
        const r = atomRadius(atom.element);
        const revealed = draft.revealedLonePairs.includes(atom.id);
        const armedHere = armedTarget?.kind === "lonePair" && armedTarget.atomId === atom.id;
        return (
          <g key={atom.id} className={wobbling.has(atom.id) ? "wobble" : undefined}>
            {armedHere ? <circle cx={c.x} cy={c.y} r={r + 8} fill="none" stroke="var(--primary)" strokeWidth={2} strokeDasharray="4 4" /> : null}
            <circle cx={c.x} cy={c.y} r={r} fill={ELEMENT_FILL[atom.element] ?? "#334155"} />
            <text x={c.x} y={c.y} textAnchor="middle" dominantBaseline="central" fontSize={atom.element === "H" ? 12 : 17} fontWeight={700} fill="#ffffff">
              {atom.element}
            </text>
            {atom.fromImplicitH > 0 ? (
              <text x={c.x} y={c.y + r + 14} textAnchor="middle" fontSize={13} fontWeight={600} fill="var(--scene-faint)">
                H{atom.fromImplicitH > 1 ? ["", "", "₂", "₃", "₄"][atom.fromImplicitH] ?? `×${atom.fromImplicitH}` : ""}
              </text>
            ) : null}
            {atom.fromCharge !== 0 ? (
              <g>
                <circle cx={c.x + r + 6} cy={c.y - r - 2} r={9} fill="var(--card)" stroke="var(--bond-stroke)" strokeWidth={1.5} />
                <text x={c.x + r + 6} y={c.y - r - 2} textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700} fill="var(--foreground)">
                  {atom.fromCharge > 0 ? "+" : "−"}
                </text>
              </g>
            ) : null}
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

      {/* Between atom sites, offered while a source is armed. */}
      {targets
        .filter((entry) => entry.target.kind === "betweenAtomsSite")
        .map((entry) => (
          <circle key={JSON.stringify(entry.target)} cx={entry.centre.x} cy={entry.centre.y} r={entry.radius} fill="var(--primary)" opacity={0.18} stroke="var(--primary)" strokeDasharray="3 3" />
        ))}

      {/* The student's arrows. */}
      {draft.arrows.map((arrow, index) => {
        const { from, to } = arrowEndpoints(step, scene, arrow);
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
            style={snapping ? ({ "--snap-dx": `${(to.x - from.x) * 0.6}px`, "--snap-dy": `${(to.y - from.y) * 0.6}px` } as React.CSSProperties) : undefined}
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
      <text x={minX - PAD + 8} y={maxY + PAD - 8} fontSize={11} fill="var(--scene-faint)">
        {PX} px per bond
      </text>
    </svg>
  );
}
