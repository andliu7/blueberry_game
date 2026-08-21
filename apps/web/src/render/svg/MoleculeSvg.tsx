/**
 * The 2D SVG renderer. The default renderer for everything in the product.
 *
 * A pure projection of MechanismRenderProps to SVG: no clock, no fetches, no
 * state beyond what React needs to render (it has none). Animation happens
 * because the parent re-renders with a new `progress`; at 60 fps that is 60
 * renders per second of a small element tree, which is exactly the boring,
 * debuggable way to animate and comfortably inside budget for scenes this size.
 *
 * The three Alchemie patterns taken on purpose (interaction patterns are fair
 * reference; the look here is Blueberry's own per docs/DESIGN-TOKENS.md):
 *   - implicit hydrogens on a faint arc, not as bonded nodes
 *   - formal charge as a badge outside the atom silhouette, plus a faint ring
 *   - the canvas is the app; this component draws zero chrome
 *
 * Animation phases over progress t in [0,1]:
 *   arrows draw on    0.00 to 0.25, fade out 0.78 to 0.95
 *   atoms glide       0.25 to 0.85 (smoothstep)
 *   forming bond      grows 0.30 to 0.85, from the donor end
 *   breaking bond     fades 0.35 to 0.85, release burst around 0.55
 *   charges crossfade 0.45 to 0.80
 */

import type { AtomId } from "@blueberry/chem-core";
import type { MechanismRenderProps } from "../contract";
import { REDUCED_MOTION_FRAME } from "../contract";
import type { AtomPlacement } from "../layout/layout";
import type { SceneAtom } from "../layout/stepScene";
import type { Vec } from "../layout/vec";
import { add, clamp01, fromAngle, lerp, midpoint, normalize, scale, smoothstep, sub } from "../layout/vec";

/** Pixels per scene unit (one bond length). */
const PX = 72;
/** Atom disc radius in px, by element size class. */
const ATOM_R = 21;
const ATOM_R_SMALL = 13;
/** Minimum hit target: 44 by 44 points, the accessibility floor in CLAUDE.md. */
const HIT_R = 22;

const ELEMENT_FILL: Record<string, string> = {
  // Saturated enough to hold white glyphs at 4.5:1+ in both themes.
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

function fillFor(element: string): string {
  return ELEMENT_FILL[element] ?? "#334155";
}

function radiusFor(element: string): number {
  return element === "H" ? ATOM_R_SMALL : ATOM_R;
}

function px(v: Vec): { x: number; y: number } {
  // SVG y grows downward; scene y grows upward. Flip once, here.
  return { x: v.x * PX, y: -v.y * PX };
}

function atomPosAt(atom: SceneAtom, glide: number): Vec {
  return lerp(atom.from.pos, atom.to.pos, glide);
}

function placementAt(atom: SceneAtom, glide: number): AtomPlacement {
  // Angles snap at the midpoint rather than interpolating, because tweening
  // through an angle wrap looks like the arc orbiting the atom.
  const late = glide > 0.5;
  return {
    pos: atomPosAt(atom, glide),
    openAngle: late ? atom.to.openAngle : atom.from.openAngle,
    badgeAngle: late ? atom.to.badgeAngle : atom.from.badgeAngle,
  };
}

const SUBSCRIPTS = ["", "", "₂", "₃", "₄"];

/** The faint arc of implicit hydrogens, with an H-count glyph on it. */
function HydrogenArc({ placement, count, r }: { placement: AtomPlacement; count: number; r: number }) {
  if (count <= 0) return null;
  const arcR = r + 13;
  const center = px(placement.pos);
  // Scene angles are mathematical (y up); px() flips y, so angles negate.
  const a0 = -(placement.openAngle - 0.7);
  const a1 = -(placement.openAngle + 0.7);
  const start = { x: center.x + arcR * Math.cos(a0), y: center.y + arcR * Math.sin(a0) };
  const end = { x: center.x + arcR * Math.cos(a1), y: center.y + arcR * Math.sin(a1) };
  const label = px(add(placement.pos, fromAngle(placement.openAngle, (arcR + 12) / PX)));
  return (
    <g>
      <path
        d={`M ${start.x} ${start.y} A ${arcR} ${arcR} 0 0 0 ${end.x} ${end.y}`}
        fill="none"
        stroke="var(--scene-faint)"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <text
        x={label.x}
        y={label.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={15}
        fontWeight={600}
        fill="var(--scene-faint)"
      >
        H{SUBSCRIPTS[count] ?? `×${count}`}
      </text>
    </g>
  );
}

/** Lone pairs as paired dots on the rim, fanned away from the hydrogen arc. */
function LonePairs({ placement, count, r }: { placement: AtomPlacement; count: number; r: number }) {
  if (count <= 0) return null;
  const dots: React.ReactElement[] = [];
  const rimR = (r + 7) / PX;
  for (let i = 0; i < count; i += 1) {
    // Fan starting opposite the open angle, stepping 72 degrees.
    const angle = placement.openAngle + Math.PI + (i - (count - 1) / 2) * 1.25;
    const rim = add(placement.pos, fromAngle(angle, rimR));
    const tangent = fromAngle(angle + Math.PI / 2, 3.4 / PX);
    const d1 = px(add(rim, tangent));
    const d2 = px(sub(rim, tangent));
    dots.push(
      <g key={i}>
        <circle cx={d1.x} cy={d1.y} r={2.4} fill="var(--bond-stroke)" />
        <circle cx={d2.x} cy={d2.y} r={2.4} fill="var(--bond-stroke)" />
      </g>,
    );
  }
  return <g>{dots}</g>;
}

/** Formal charge as a circled badge outside the silhouette, plus a faint ring. */
function ChargeBadge({
  placement,
  charge,
  r,
  opacity,
}: {
  placement: AtomPlacement;
  charge: number;
  r: number;
  opacity: number;
}) {
  if (charge === 0 || opacity <= 0.01) return null;
  const center = px(placement.pos);
  const badgeCenter = px(add(placement.pos, fromAngle(placement.badgeAngle, (r + 16) / PX)));
  const sign = charge > 0 ? "+" : "−";
  const magnitude = Math.abs(charge);
  return (
    <g opacity={opacity}>
      <circle cx={center.x} cy={center.y} r={r + 6} fill="none" stroke="var(--ring)" strokeWidth={1.5} opacity={0.4} />
      <circle cx={badgeCenter.x} cy={badgeCenter.y} r={10} fill="var(--card)" stroke="var(--bond-stroke)" strokeWidth={1.5} />
      <text
        x={badgeCenter.x}
        y={badgeCenter.y}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={13}
        fontWeight={700}
        fill="var(--foreground)"
      >
        {magnitude > 1 ? `${magnitude}${sign}` : sign}
      </text>
    </g>
  );
}

export function MoleculeSvg({
  scene,
  progress,
  reducedMotion,
  selectedAtomIds,
  onAtomPointerDown,
}: MechanismRenderProps) {
  const t = reducedMotion ? REDUCED_MOTION_FRAME : clamp01(progress);
  const glide = smoothstep(0.25, 0.85, t);
  const selected = new Set<AtomId>(selectedAtomIds ?? []);

  const positions = new Map<AtomId, Vec>();
  for (const atom of scene.atoms) positions.set(atom.id, atomPosAt(atom, glide));
  const at = (id: AtomId): Vec => {
    const v = positions.get(id);
    if (v === undefined) throw new Error(`Scene bond names atom ${id} with no scene atom`);
    return v;
  };

  // View box from the union of both endpoints of every atom tween.
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const atom of scene.atoms) {
    for (const p of [atom.from.pos, atom.to.pos]) {
      const q = px(p);
      minX = Math.min(minX, q.x);
      maxX = Math.max(maxX, q.x);
      minY = Math.min(minY, q.y);
      maxY = Math.max(maxY, q.y);
    }
  }
  const PAD = 64;
  const viewBox = `${minX - PAD} ${minY - PAD} ${maxX - minX + 2 * PAD} ${maxY - minY + 2 * PAD}`;

  const arrowOpacity = (1 - smoothstep(0.78, 0.95, t)) * smoothstep(0, 0.05, t);
  const arrowDraw = smoothstep(0, 0.25, t);

  return (
    <svg
      viewBox={viewBox}
      role="img"
      aria-label="Mechanism step"
      className="h-full w-full select-none"
      style={{ touchAction: "none" }}
    >
      <defs>
        {/* Curved-arrow head, oriented by the path direction. */}
        <marker id="arrowhead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--primary)" />
        </marker>
      </defs>

      {/* Bonds under atoms, so discs mask the joint. */}
      {scene.bonds.map((bond) => {
        const a = at(bond.a);
        const b = at(bond.b);
        let opacity = 1;
        let start = a;
        let end = b;
        if (bond.phase === "breaking") {
          opacity = 1 - smoothstep(0.35, 0.85, t);
        } else if (bond.phase === "forming") {
          const grow = smoothstep(0.3, 0.85, t);
          opacity = Math.min(1, grow * 1.6);
          const donor = bond.growFrom === bond.a ? a : b;
          const target = bond.growFrom === bond.a ? b : a;
          start = donor;
          end = lerp(donor, target, grow);
        }
        if (opacity <= 0.01) return null;
        const p1 = px(start);
        const p2 = px(end);
        if (bond.order === 1) {
          return (
            <line key={bond.key} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="var(--bond-stroke)" strokeWidth={7} strokeLinecap="round" opacity={opacity} />
          );
        }
        // Double and triple bonds: parallel lines offset perpendicular.
        const dir = normalize(sub(end, start));
        const perp = { x: -dir.y, y: dir.x, z: 0 };
        const lines: React.ReactElement[] = [];
        const offsets = bond.order === 2 ? [-4.5, 4.5] : [-7, 0, 7];
        offsets.forEach((off, i) => {
          const o = scale(perp, off / PX);
          const q1 = px(add(start, o));
          const q2 = px(add(end, o));
          lines.push(<line key={i} x1={q1.x} y1={q1.y} x2={q2.x} y2={q2.y} stroke="var(--bond-stroke)" strokeWidth={5} strokeLinecap="round" />);
        });
        return (
          <g key={bond.key} opacity={opacity}>
            {lines}
          </g>
        );
      })}

      {/* Release burst at a breaking bond's midpoint, a short radial shimmer.
          Ours is purple and restrained; the pattern (mark the break) is the
          reference's, the look is not. */}
      {scene.breakingMidpoints.map((mid, i) => {
        const bell = smoothstep(0.42, 0.55, t) * (1 - smoothstep(0.6, 0.78, t));
        if (bell <= 0.01) return null;
        const c = px(mid);
        const burstR = 10 + 16 * smoothstep(0.42, 0.78, t);
        return (
          <g key={i} opacity={bell * 0.9}>
            {[0, 1, 2, 3, 4, 5].map((k) => {
              const angle = (k * Math.PI) / 3 + 0.4;
              return (
                <line
                  key={k}
                  x1={c.x + Math.cos(angle) * burstR * 0.55}
                  y1={c.y + Math.sin(angle) * burstR * 0.55}
                  x2={c.x + Math.cos(angle) * burstR}
                  y2={c.y + Math.sin(angle) * burstR}
                  stroke="var(--primary-bright)"
                  strokeWidth={3}
                  strokeLinecap="round"
                />
              );
            })}
          </g>
        );
      })}

      {/* Electron flow arrows, drawn in from-state coordinates. */}
      {scene.arrows.map((arrow) => {
        if (arrowOpacity <= 0.01) return null;
        const start = px(arrow.start);
        const end = px(arrow.end);
        const mid = px(midpoint(arrow.start, arrow.end));
        const dir = normalize(sub(arrow.end, arrow.start));
        // Perpendicular bow, 0.55 scene units, alternating sides per arrow.
        const ctrl = {
          x: mid.x + -(-dir.y) * 0.55 * PX * arrow.bow * -1,
          y: mid.y + -(dir.x) * 0.55 * PX * arrow.bow * -1,
        };
        // Trim ends away from the glyphs they touch.
        const startTrim = { x: start.x + (ctrl.x - start.x) * 0.18, y: start.y + (ctrl.y - start.y) * 0.18 };
        const endTrim = { x: end.x + (ctrl.x - end.x) * 0.22, y: end.y + (ctrl.y - end.y) * 0.22 };
        return (
          <path
            key={arrow.id}
            d={`M ${startTrim.x} ${startTrim.y} Q ${ctrl.x} ${ctrl.y} ${endTrim.x} ${endTrim.y}`}
            fill="none"
            stroke="var(--primary)"
            strokeWidth={3.5}
            strokeLinecap="round"
            markerEnd="url(#arrowhead)"
            pathLength={1}
            strokeDasharray={1}
            strokeDashoffset={1 - arrowDraw}
            opacity={arrowOpacity}
          />
        );
      })}

      {/* Atoms: disc, element glyph, hydrogen arc, lone pairs, charge badge. */}
      {scene.atoms.map((atom) => {
        const placement = placementAt(atom, glide);
        const c = px(placement.pos);
        const r = radiusFor(atom.element);
        const chargeFade = smoothstep(0.45, 0.8, t);
        const lonePairs = glide > 0.5 ? atom.toLonePairs : atom.fromLonePairs;
        const implicitH = glide > 0.5 ? atom.toImplicitH : atom.fromImplicitH;
        const isSelected = selected.has(atom.id);
        return (
          <g key={atom.id}>
            <HydrogenArc placement={placement} count={implicitH} r={r} />
            <LonePairs placement={placement} count={lonePairs} r={r} />
            {isSelected ? (
              <circle cx={c.x} cy={c.y} r={r + 8} fill="none" stroke="var(--ring)" strokeWidth={3} />
            ) : null}
            <circle cx={c.x} cy={c.y} r={r} fill={fillFor(atom.element)} />
            <text
              x={c.x}
              y={c.y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={atom.element === "H" ? 14 : 18}
              fontWeight={700}
              fill="#ffffff"
            >
              {atom.element}
            </text>
            <ChargeBadge placement={placement} charge={atom.fromCharge} r={r} opacity={1 - chargeFade} />
            <ChargeBadge placement={placement} charge={atom.toCharge} r={r} opacity={chargeFade} />
            {/* Invisible hit disc: at least 44x44 points regardless of how
                small the visible atom is drawn. */}
            <circle
              cx={c.x}
              cy={c.y}
              r={Math.max(r, HIT_R)}
              fill="transparent"
              style={{ cursor: onAtomPointerDown ? "pointer" : "default" }}
              onPointerDown={onAtomPointerDown ? () => onAtomPointerDown(atom.id) : undefined}
            />
          </g>
        );
      })}
    </svg>
  );
}

export default MoleculeSvg;
