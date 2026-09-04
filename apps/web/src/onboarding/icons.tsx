/**
 * The onboarding icon set. SVG, one motif each, inheriting `currentColor`.
 *
 * DESIGN-GOALS, owner finding 2026-09-02: "ICONS ARE SVG, NEVER RASTER, NEVER
 * EMOJI. Every in-product icon is a traced SVG that inherits currentColor
 * (emoji vary per platform and are banned from product chrome; PNGs cannot
 * theme or scale)." The question goal image draws its chips with a coloured
 * illustration in that slot; a coloured illustration cannot take the picked
 * state's colour with it, and the chip's icon going violet with its outline is
 * what makes the picked state read as one object. So these are single-colour
 * line marks that follow the chip's ink, and that is a deliberate divergence
 * from the image's rendering in favour of the clause. The MOTIFS are the
 * image's: flask, stethoscope, life ring, sparkle.
 *
 * Every glyph is drawn on a 24 unit grid with a 2 unit stroke and round joins,
 * so they read as one family at the 36px the chip gives them. `aria-hidden` on
 * all of them: the chip's own label is the accessible name, and an icon that
 * repeats it is one more thing a screen reader has to say.
 */

import type { ReactNode, SVGProps } from "react";

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">;

function Glyph({ children, ...rest }: GlyphProps & { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Orgo II exam prep. The erlenmeyer, the course chip's own motif. */
export function FlaskIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M9.5 3v6.2L4.4 18.1A2 2 0 0 0 6.1 21h11.8a2 2 0 0 0 1.7-2.9L14.5 9.2V3" />
      <path d="M8 3h8" />
      <path d="M7.2 15h9.6" />
    </Glyph>
  );
}

/** DAT and MCAT. The stethoscope, the image's own mark for the health track. */
export function StethoscopeIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M6 3v5a4 4 0 0 0 8 0V3" />
      <path d="M4.5 3h3M12.5 3h3" />
      <path d="M10 12v2a5 5 0 0 0 5 5h.5" />
      <circle cx="18.5" cy="17.5" r="2.5" />
    </Glyph>
  );
}

/** Surviving my course. The life ring. */
export function LifeRingIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.6" />
      <path d="M12 2.9v5.5M12 15.6v5.5M2.9 12h5.5M15.6 12h5.5" />
    </Glyph>
  );
}

/** Curiosity. The four point sparkle, with its small companion. */
export function SparkleIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M14 3.5c0 3.6 2.4 6 6 6-3.6 0-6 2.4-6 6 0-3.6-2.4-6-6-6 3.6 0 6-2.4 6-6Z" />
      <path d="M6.5 15c0 1.9 1.1 3 3 3-1.9 0-3 1.1-3 3 0-1.9-1.1-3-3-3 1.9 0 3-1.1 3-3Z" />
    </Glyph>
  );
}

/** A friend or classmate. Two figures. */
export function FriendsIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20a6 6 0 0 1 12 0" />
      <path d="M16.5 5.4a3.2 3.2 0 0 1 0 6.2" />
      <path d="M17.5 13.6A6 6 0 0 1 21 19.4" />
    </Glyph>
  );
}

/** Social media. A speech bubble with a spark in it. */
export function SocialIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M20.5 12.5c0 4-3.8 7-8.5 7a10 10 0 0 1-2.6-.34L4.5 21l1.1-3.4A6.7 6.7 0 0 1 3.5 12.5c0-3.9 3.8-7 8.5-7s8.5 3.1 8.5 7Z" />
      <path d="M12 8.6c0 1.6 1.1 2.7 2.7 2.7-1.6 0-2.7 1.1-2.7 2.7 0-1.6-1.1-2.7-2.7-2.7 1.6 0 2.7-1.1 2.7-2.7Z" />
    </Glyph>
  );
}

/** Search. The magnifier. */
export function SearchIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m15.4 15.4 4.6 4.6" />
    </Glyph>
  );
}

/** My professor or TA. The mortarboard. */
export function ProfessorIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="m2.5 9 9.5-4.5L21.5 9 12 13.5 2.5 9Z" />
      <path d="M6.5 11v4.6c0 1.6 2.5 2.9 5.5 2.9s5.5-1.3 5.5-2.9V11" />
      <path d="M21.5 9v5" />
    </Glyph>
  );
}

/** The App Store. A phone. */
export function PhoneIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <rect x="6" y="2.5" width="12" height="19" rx="3" />
      <path d="M10.5 5.5h3" />
      <path d="M10.8 18.2h2.4" />
    </Glyph>
  );
}

/** Somewhere else. Three dots, the honest "none of the above". */
export function EllipsisIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <circle cx="5.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="18.5" cy="12" r="1.6" fill="currentColor" stroke="none" />
    </Glyph>
  );
}

/**
 * The daily goal tiers, as a rising three: one, two and three filled bars.
 *
 * `filled` is passed by the goal step from the tier's own position in
 * ONBOARDING_GOAL_TIERS, so a fourth tier arriving would draw a fourth bar
 * rather than needing a fourth glyph.
 */
export function GoalBarsIcon({ filled, ...rest }: GlyphProps & { readonly filled: number }) {
  const bars = [
    { x: 4.5, top: 15 },
    { x: 11, top: 10.5 },
    { x: 17.5, top: 6 },
  ];
  return (
    <Glyph {...rest}>
      {bars.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x - 1.75}
          y={bar.top}
          width={3.5}
          height={20 - bar.top}
          rx={1.5}
          fill={index < filled ? "currentColor" : "none"}
        />
      ))}
    </Glyph>
  );
}

/** Choose your start: the flag-free "carry on from here" chevron pair. */
export function ResumeIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M4 12h11" />
      <path d="m11.5 7.5 4.5 4.5-4.5 4.5" />
      <path d="M19.5 5v14" />
    </Glyph>
  );
}

/** Choose your start: back to the very beginning. */
export function RewindIcon(props: GlyphProps) {
  return (
    <Glyph {...props}>
      <path d="M20 12H9" />
      <path d="m12.5 7.5-4.5 4.5 4.5 4.5" />
      <path d="M4.5 5v14" />
    </Glyph>
  );
}

/** The picked mark. The question image draws it as a bare check, no disc. */
export function CheckIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={3} {...props}>
      <path d="m4.5 12.5 5 5 10-11" />
    </Glyph>
  );
}

/** Back. The header chevron. */
export function BackIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2.5} {...props}>
      <path d="m14.5 5-7 7 7 7" />
    </Glyph>
  );
}

/**
 * The welcome screen's horizon: two clouds and one flask, on a soft rise.
 *
 * The welcome goal image puts exactly these three props behind the promise
 * line, and DESIGN-GOALS' background doctrine says the environment is COMPOSED
 * and never scattered: this is one fixed composition traced from the prop
 * sheet's family, not a random sprinkle of icons. Flat fills with real
 * outlines, no gradient and no blur anywhere, so the sticker language's rule 2
 * and rule 3 both hold on the one onboarding route the audit visits.
 *
 * It is decoration and carries `aria-hidden`; nothing here is information.
 */
export function WelcomeHorizon(props: Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">) {
  return (
    <svg
      viewBox="0 0 390 150"
      fill="none"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
      {...props}
    >
      {/* The rise. One terrace edge, the pathway world's own language. */}
      <path
        d="M0 108c46-16 84-16 128 2s86 20 132 4 84-16 130 2v54H0Z"
        fill="var(--card)"
        stroke="var(--secondary)"
        strokeWidth={2}
      />
      {/* The flask, standing on the rise. */}
      <g stroke="var(--secondary)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round">
        <path d="M182 30v22l-16 40a6 6 0 0 0 5.6 8.3h29.8A6 6 0 0 0 207 92l-16-40V30" fill="var(--card)" />
        <path d="M178 30h17" />
      </g>
      {/* Two clouds, one left and one right, the sparse pair the image draws. */}
      <path
        d="M42 66a15 15 0 0 1 29-5 12 12 0 0 1 20 9 9 9 0 0 1-2 18H50a11 11 0 0 1-8-22Z"
        fill="var(--card)"
        stroke="var(--secondary)"
        strokeWidth={2}
      />
      <path
        d="M300 44a13 13 0 0 1 25-4 10 10 0 0 1 17 8 8 8 0 0 1-2 15h-35a10 10 0 0 1-5-19Z"
        fill="var(--card)"
        stroke="var(--secondary)"
        strokeWidth={2}
      />
    </svg>
  );
}
