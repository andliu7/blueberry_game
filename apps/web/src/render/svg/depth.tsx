/**
 * The glyphs that give the 2D scene depth, shared by the draw canvas and the
 * playback renderer so the handoff between them does not go flat.
 *
 * What the Alchemie capture (docs/reference/alchemie/01-mechanism-canvas-full.png)
 * shows, taken as pattern and redrawn in Blueberry's own palette:
 *   - atoms are shaded spheres: an off centre highlight, a darker rim, a soft
 *     drop shadow, so they read as objects rather than discs
 *   - bonds are thick capsules with rounded ends that meet the atom SURFACE,
 *     never the centre, because a cylinder that pokes into a sphere is a
 *     drawing, and one that stops at its skin is a thing
 *   - the implicit hydrogen count sits on a faint arc outside the sphere
 *   - the charge badge is a small shaded disc with its own shadow
 *
 * Everything here is pure SVG. The gradients and the shadow filter are
 * declared once per <svg> through DepthDefs; the sphere and capsule reference
 * them by id. feDropShadow with a small blur is the cheapest shadow SVG has,
 * and it is applied to one group per species rather than per atom so the
 * playback renderer's 60 renders per second stay inside budget.
 */

import type { Point2 } from "@blueberry/interaction";

export const ELEMENT_FILL: Record<string, string> = {
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

export function fillFor(element: string): string {
  return ELEMENT_FILL[element] ?? "#334155";
}

function mixHex(hex: string, toward: number, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const channel = (shift: number) => {
    const c = (n >> shift) & 0xff;
    return Math.round(c + (toward - c) * t);
  };
  const r = channel(16);
  const g = channel(8);
  const b = channel(0);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

export const SHADOW_FILTER_ID = "depth-shadow";
export const BADGE_GRADIENT_ID = "depth-badge";

/** Gradient id for an element's sphere. Unknown elements share carbon's. */
export function sphereGradientId(element: string): string {
  return `depth-sphere-${element in ELEMENT_FILL ? element : "C"}`;
}

/** Declare once inside <defs>. Both renderers mount exclusively, so fixed ids are safe. */
export function DepthDefs() {
  return (
    <>
      {Object.entries(ELEMENT_FILL).map(([element, base]) => (
        // A TIGHT specular hotspot rather than a wide wash. Widening the
        // highlight brightens the whole sphere including the ground under the
        // white element letter, which costs contrast; pulling it into a small
        // bright spot up and left, and deepening the far rim, raises the
        // apparent brightness AND the modelling while the letter keeps sitting
        // on the base colour that was measured against it.
        <radialGradient key={element} id={sphereGradientId(element)} cx="33%" cy="27%" r="66%">
          <stop offset="0%" stopColor={mixHex(base, 0xff, 0.66)} />
          <stop offset="26%" stopColor={mixHex(base, 0xff, 0.16)} />
          <stop offset="58%" stopColor={base} />
          <stop offset="100%" stopColor={mixHex(base, 0x00, 0.46)} />
        </radialGradient>
      ))}
      <radialGradient id={BADGE_GRADIENT_ID} cx="36%" cy="30%" r="72%">
        <stop offset="0%" stopColor="#94a3b8" />
        <stop offset="50%" stopColor="#475569" />
        <stop offset="100%" stopColor="#1e293b" />
      </radialGradient>
      <filter id={SHADOW_FILTER_ID} x="-30%" y="-30%" width="160%" height="170%" colorInterpolationFilters="sRGB">
        <feDropShadow dx="0" dy="3" stdDeviation="2.5" floodColor="#0f172a" floodOpacity="0.32" />
      </filter>
    </>
  );
}

/** A shaded sphere with the element glyph. The shadow comes from the enclosing group's filter. */
export function AtomSphere({ centre, r, element, opacity = 1 }: { centre: Point2; r: number; element: string; opacity?: number }) {
  return (
    <g opacity={opacity}>
      <circle cx={centre.x} cy={centre.y} r={r} fill={`url(#${sphereGradientId(element)})`} />
      {/* A rim shade, the thin dark edge a sphere shows against its ground. */}
      <circle cx={centre.x} cy={centre.y} r={r - 0.75} fill="none" stroke="#0f172a" strokeOpacity={0.22} strokeWidth={1.5} />
      <text x={centre.x} y={centre.y} textAnchor="middle" dominantBaseline="central" fontSize={element === "H" ? 13 : 18} fontWeight={700} fill="#ffffff">
        {element}
      </text>
    </g>
  );
}

/** The point on the line from `centre` toward `toward`, `r` px out: the rim of an atom. */
export function rimPoint(centre: Point2, toward: Point2, r: number): Point2 {
  const dx = toward.x - centre.x;
  const dy = toward.y - centre.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: centre.x + (dx / len) * r, y: centre.y + (dy / len) * r };
}

export const BOND_WIDTH = 10;

/**
 * A rounded capsule from the surface of atom A to the surface of atom B. Two
 * strokes make the cylinder: the body in the bond colour and a narrower pale
 * highlight pulled a little toward the light, which is up and left here, the
 * same side the sphere highlight sits on.
 */
export function BondCapsule({
  a,
  b,
  rA,
  rB,
  order = 1,
  opacity = 1,
  forming = false,
}: {
  a: Point2;
  b: Point2;
  rA: number;
  rB: number;
  order?: number;
  opacity?: number;
  /**
   * A bond that does not exist yet. Same rod, same diameter, same joints, so
   * the canvas keeps ONE bond language; only the body is segmented, which is
   * how a chemist already writes a partial bond. Drawing a forming bond as a
   * solid rod asserts the sigma bond the student is being asked to make.
   */
  forming?: boolean;
}) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const offsets = order === 2 ? [-7, 7] : order === 3 ? [-11, 0, 11] : [0];
  const width = order === 1 ? BOND_WIDTH : BOND_WIDTH - 3;
  return (
    <g opacity={opacity}>
      {offsets.map((off) => {
        const oa = { x: a.x + px * off, y: a.y + py * off };
        const ob = { x: b.x + px * off, y: b.y + py * off };
        // ON the skin, not inside it. A two pixel inset puts the capsule's
        // round end under the sphere's front face, and a rod that overlaps the
        // ball it joins is the line-poking-into-a-circle look the capture does
        // not have: there, the rod stops at the silhouette and a ball joint
        // sits exactly on it. Half the stroke width is added back so the round
        // cap's OUTER edge, not its centre, lands on the rim.
        const start = rimPoint(oa, ob, rA + width / 2 - 1);
        const end = rimPoint(ob, oa, rB + width / 2 - 1);
        return (
          <g key={off}>
            <line
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="var(--bond-stroke)"
              strokeWidth={width}
              strokeLinecap="round"
              strokeDasharray={forming ? "9 7" : undefined}
            />
            <line
              x1={start.x - 1.2}
              y1={start.y - 1.6}
              x2={end.x - 1.2}
              y2={end.y - 1.6}
              stroke="#ffffff"
              strokeOpacity={0.42}
              strokeWidth={width * 0.34}
              strokeLinecap="round"
            />
            {/* Ball joints, sitting ON each silhouette. In the capture these
                are what make a bond read as a rod socketed into a ball rather
                than a stripe laid across two circles. Drawn a touch brighter
                than the rod so the joint catches the same light the spheres do. */}
            <circle cx={start.x} cy={start.y} r={width * 0.42} fill="var(--bond-stroke)" />
            <circle cx={end.x} cy={end.y} r={width * 0.42} fill="var(--bond-stroke)" />
            <circle cx={start.x - 0.8} cy={start.y - 1.1} r={width * 0.17} fill="#ffffff" fillOpacity={0.5} />
            <circle cx={end.x - 0.8} cy={end.y - 1.1} r={width * 0.17} fill="#ffffff" fillOpacity={0.5} />
          </g>
        );
      })}
    </g>
  );
}

const SUBSCRIPTS = ["", "", "₂", "₃", "₄"];

/**
 * The faint arc of implicit hydrogens, with an H-count glyph on it.
 * `openAngle` is in scene terms (y up); pixel y grows downward, so it negates.
 */
export function HydrogenArc({ centre, openAngle, count, r }: { centre: Point2; openAngle: number; count: number; r: number }) {
  if (count <= 0) return null;
  // Hugging the sphere, thin, short. An arc set far out with a big label reads
  // as a mouth under the atom rather than as an annotation on it; the capture
  // keeps the hydrogens tight against the skin and quiet.
  // One small H per hydrogen, spaced along a thin arc that hugs the sphere,
  // the way the capture draws a CH3. A single "H3" beside a 60 degree arc
  // reads as a parenthesis with a subscript next to it; three H's ON the arc
  // read as three hydrogens, which is what they are. Above four the count
  // wins, because seven H's on an arc is a smear.
  const arcR = r + 7;
  const HALF = count <= 1 ? 0.34 : 0.3 + count * 0.16;
  const a0 = -(openAngle - HALF);
  const a1 = -(openAngle + HALF);
  const start = { x: centre.x + arcR * Math.cos(a0), y: centre.y + arcR * Math.sin(a0) };
  const end = { x: centre.x + arcR * Math.cos(a1), y: centre.y + arcR * Math.sin(a1) };
  const letters =
    count <= 4
      ? Array.from({ length: count }, (_, i) => {
          // Spread across the arc, and a single hydrogen sits on its middle.
          const t = count === 1 ? 0.5 : i / (count - 1);
          const angle = -(openAngle - HALF + t * 2 * HALF);
          return { key: i, x: centre.x + (arcR + 6) * Math.cos(angle), y: centre.y + (arcR + 6) * Math.sin(angle), text: "H" };
        })
      : [{ key: 0, x: centre.x + (arcR + 7) * Math.cos(-openAngle), y: centre.y + (arcR + 7) * Math.sin(-openAngle), text: `H${SUBSCRIPTS[count] ?? `×${count}`}` }];
  return (
    <g>
      <path d={`M ${start.x} ${start.y} A ${arcR} ${arcR} 0 0 0 ${end.x} ${end.y}`} fill="none" stroke="var(--scene-faint)" strokeWidth={1.4} strokeLinecap="round" opacity={0.6} />
      {letters.map((letter) => (
        <text key={letter.key} x={letter.x} y={letter.y} textAnchor="middle" dominantBaseline="central" fontSize={10.5} fontWeight={600} fill="var(--scene-faint)">
          {letter.text}
        </text>
      ))}
    </g>
  );
}

/** Formal charge as a small shaded disc outside the silhouette. */
export function ChargeBadge({ at, charge, opacity = 1 }: { at: Point2; charge: number; opacity?: number }) {
  if (charge === 0 || opacity <= 0.01) return null;
  const sign = charge > 0 ? "+" : "−";
  const magnitude = Math.abs(charge);
  return (
    // FLAT, and deliberately not a sphere. Rendered in the same shaded material
    // as an atom it reads as a bonded fourth atom sitting off the oxygen, which
    // is what a blind critic saw. A charge is an annotation, so it is a flat
    // disc with a hairline ring and no highlight and no shadow: the only flat
    // filled circle on a canvas where every physical object is modelled.
    <g opacity={opacity}>
      <circle cx={at.x} cy={at.y} r={10} fill="var(--card)" stroke="var(--bond-stroke)" strokeWidth={1.6} />
      {/* --foreground, never a literal. #ffffff here made the sign INVISIBLE in
          light mode: the disc is --card, which is near white, so hydroxide read
          as neutral and the whole step lost its charge. Formal charge is
          chemistry, and the light and dark captures side by side are what
          showed it, because dark mode alone looked correct. */}
      <text x={at.x} y={at.y} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={700} fill="var(--foreground)">
        {magnitude > 1 ? `${magnitude}${sign}` : sign}
      </text>
    </g>
  );
}
