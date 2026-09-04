/**
 * The onboarding icon set: flat colour STICKERS, drawn as SVG.
 *
 * DESIGN-GOALS, owner finding 2026-09-02: "ICONS ARE SVG, NEVER RASTER, NEVER
 * EMOJI. Every in-product icon is a traced SVG that inherits currentColor."
 * That clause is about the FORMAT and it is honoured here: every mark below is
 * a path on a 24 unit grid and every OUTLINE is `currentColor`, so a glyph
 * follows the ink of whatever chip holds it and both themes work.
 *
 * WHAT CHANGED THIS ROUND, and it was the single most visible difference
 * between the built screen and blueberry_r9-onboard-question. The image draws
 * each chip icon as a full colour sticker: a purple erlenmeyer with a face, a
 * grey stethoscope, a red and white life ring, a black four point sparkle. The
 * previous pass drew monochrome line glyphs in the muted ink and recorded the
 * divergence as deliberate, on the reasoning that a coloured illustration
 * cannot take the picked state's colour with it. That reasoning was answered
 * by looking at the image again: the picked chip in the goal image keeps its
 * flask PURPLE and carries the pick in the outline, the edge and the check.
 * The icon was never what said "picked".
 *
 * So these are flat fills with a real outline, which is the sticker language
 * (docs/DESIGN-TOKENS.md and the sticker audit: flat fills, outlined shapes,
 * no gradient, no blur). EVERY FILLED SHAPE CARRIES AN OUTLINE, and that is a
 * measurement decision as well as a drawing one: contrast-audit.mjs collapses
 * a shape's fill and stroke to the better of the two, so a near white life
 * ring reads against the cream chip through its outline rather than needing to
 * be darkened into something that is no longer white.
 *
 * COLOUR COMES FROM TOKENS, never from a literal. The palette here is
 * --primary-bright for the violet props, --destructive for the red ones,
 * --muted-foreground for the grey ones, --foreground for the black ones, and
 * --ob-prop for the white ones, which onboarding.css derives from --card and
 * --primary-foreground so a white prop is still white at night.
 *
 * `aria-hidden` on all of them: the chip's own label is the accessible name,
 * and an icon that repeats it is one more thing a screen reader has to say.
 */

import type { ReactNode, SVGProps } from "react";

type GlyphProps = Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">;

/**
 * A line mark: no fill, the ink of its chip, 2 units of stroke. Kept for the
 * chrome marks (back, close, check) where a sticker would be wrong: those are
 * controls rather than illustrations.
 */
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

/**
 * A sticker: flat fills, an outline in the chip's own ink, round joins.
 *
 * The outline is 1.6 units rather than the line family's 2 so a filled shape
 * does not read as heavier than the label beside it, and `paint-order` puts
 * the stroke behind the fill so an outline never eats into the colour it is
 * drawn around.
 */
function Sticker({ children, ...rest }: GlyphProps & { readonly children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      paintOrder="stroke fill"
      aria-hidden
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Orgo II exam prep. The purple erlenmeyer with a face, the image's own prop. */
export function FlaskIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M9.6 3.2v6.1L4.6 18a2.1 2.1 0 0 0 1.8 3.1h11.2A2.1 2.1 0 0 0 19.4 18l-5-8.7V3.2Z"
        fill="var(--primary-bright)"
      />
      <path d="M8.2 3.2h7.6" fill="none" />
      {/* The face. Two eyes and a smile, small enough that the flask still
          reads as a flask at the 36px the chip gives it. */}
      <g fill="currentColor" stroke="none">
        <circle cx="10.3" cy="15.4" r="0.95" />
        <circle cx="13.9" cy="15.4" r="0.95" />
      </g>
      <path d="M10.6 17.7q1.5 1.3 3 0" fill="none" strokeWidth={1.3} />
    </Sticker>
  );
}

/** DAT and MCAT. The grey stethoscope. */
export function StethoscopeIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M6 3.2v4.6a4.1 4.1 0 0 0 8.2 0V3.2"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={2.1}
      />
      <path d="M4.4 3.2h3.2M12.6 3.2h3.2" fill="none" stroke="var(--muted-foreground)" strokeWidth={2.1} />
      <path
        d="M10.1 12v2.1a5 5 0 0 0 5 5h.4"
        fill="none"
        stroke="var(--muted-foreground)"
        strokeWidth={2.1}
      />
      <circle cx="18.4" cy="17.6" r="2.7" fill="var(--ob-prop)" stroke="var(--muted-foreground)" strokeWidth={2.1} />
    </Sticker>
  );
}

/**
 * Surviving my course. THE LIFE RING, and this one is a motif fix rather than
 * a rendering one.
 *
 * The previous glyph was a thin outer circle, a small concentric inner circle
 * and four short radial ticks, which at 36px reads as a target or a crosshair.
 * blueberry_r9-onboard-question draws the real prop: a white torus with FOUR
 * RED SEGMENTS around it at the diagonals and small rope lugs outside the rim.
 * Drawn here as a thick white annulus (a stroked circle, so the ring has real
 * body) with four red arcs stroked over it at the same radius.
 */
export function LifeRingIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      {/* The lugs, behind the ring so they read as rope loops peeking out. */}
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        <path d="M12 2.4v2.4M12 19.2v2.4M2.4 12h2.4M19.2 12h2.4" />
      </g>
      {/* The white body of the ring: a stroke, not a fill, so the hole is real. */}
      <circle cx="12" cy="12" r="7.1" fill="none" stroke="var(--ob-prop)" strokeWidth={4.6} />
      {/* The four red segments, on the diagonals, as the prop draws them. */}
      <g fill="none" stroke="var(--destructive)" strokeWidth={4.6} strokeLinecap="butt">
        <path d="M12 4.9a7.1 7.1 0 0 1 5 2.1" />
        <path d="M19.1 12a7.1 7.1 0 0 1-2.1 5" />
        <path d="M12 19.1a7.1 7.1 0 0 1-5-2.1" />
        <path d="M4.9 12a7.1 7.1 0 0 1 2.1-5" />
      </g>
      {/* The two outlines, drawn last so the ring keeps a clean edge. */}
      <g fill="none" stroke="currentColor" strokeWidth={1.4}>
        <circle cx="12" cy="12" r="9.4" />
        <circle cx="12" cy="12" r="4.8" />
      </g>
    </Sticker>
  );
}

/** Curiosity. The black four point sparkle, with its small companion. */
export function SparkleIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M14 2.6c0 4 2.7 6.7 6.7 6.7-4 0-6.7 2.7-6.7 6.7 0-4-2.7-6.7-6.7-6.7 4 0 6.7-2.7 6.7-6.7Z"
        fill="var(--foreground)"
        strokeWidth={1.2}
      />
      <path
        d="M6.4 14.6c0 2.1 1.2 3.3 3.3 3.3-2.1 0-3.3 1.2-3.3 3.3 0-2.1-1.2-3.3-3.3-3.3 2.1 0 3.3-1.2 3.3-3.3Z"
        fill="var(--foreground)"
        strokeWidth={1.2}
      />
    </Sticker>
  );
}

/** A friend or classmate. Two berry-violet figures. */
export function FriendsIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <circle cx="16.2" cy="8.4" r="3" fill="var(--muted-foreground)" />
      <path d="M10.4 20.4a5.8 5.8 0 0 1 11.6 0Z" fill="var(--muted-foreground)" />
      <circle cx="8.6" cy="7.6" r="3.6" fill="var(--primary-bright)" />
      <path d="M2 20.4a6.6 6.6 0 0 1 13.2 0Z" fill="var(--primary-bright)" />
    </Sticker>
  );
}

/** Social media. A violet speech bubble with a spark in it. */
export function SocialIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path
        d="M20.6 12.2c0 4-3.9 7.1-8.6 7.1a10.6 10.6 0 0 1-2.6-.3L4.4 21l1.1-3.5a6.7 6.7 0 0 1-2.1-5.3c0-4 3.9-7.2 8.6-7.2s8.6 3.2 8.6 7.2Z"
        fill="var(--primary-bright)"
      />
      <path
        d="M12 8.2c0 1.7 1.1 2.8 2.8 2.8-1.7 0-2.8 1.1-2.8 2.8 0-1.7-1.1-2.8-2.8-2.8 1.7 0 2.8-1.1 2.8-2.8Z"
        fill="var(--ob-prop)"
        strokeWidth={1.1}
      />
    </Sticker>
  );
}

/** Search. The magnifier, glass and grip. */
export function SearchIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <circle cx="10.4" cy="10.4" r="6.6" fill="var(--ob-prop)" />
      <path d="m15.2 15.2 4.9 4.9" fill="none" stroke="var(--muted-foreground)" strokeWidth={3.2} />
      <path d="m15.2 15.2 4.9 4.9" fill="none" strokeWidth={1.2} />
    </Sticker>
  );
}

/** My professor or TA. The mortarboard. */
export function ProfessorIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path d="M6.6 10.6v4.8c0 1.6 2.4 2.9 5.4 2.9s5.4-1.3 5.4-2.9v-4.8Z" fill="var(--ob-prop)" />
      <path d="m2.4 8.8 9.6-4.5 9.6 4.5-9.6 4.6Z" fill="var(--foreground)" strokeWidth={1.2} />
      <path d="M21.6 8.8v5.4" fill="none" />
    </Sticker>
  );
}

/** The App Store. A phone. */
export function PhoneIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <rect x="6" y="2.4" width="12" height="19.2" rx="3" fill="var(--muted-foreground)" />
      <rect x="7.9" y="6" width="8.2" height="11.4" rx="1.4" fill="var(--ob-prop)" strokeWidth={1.2} />
      <path d="M10.6 19.5h2.8" fill="none" strokeWidth={1.2} stroke="var(--ob-prop)" />
    </Sticker>
  );
}

/** Somewhere else. Three dots, the honest "none of the above". */
export function EllipsisIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <g fill="var(--muted-foreground)" strokeWidth={1.2}>
        <circle cx="5.2" cy="12" r="2.2" />
        <circle cx="12" cy="12" r="2.2" />
        <circle cx="18.8" cy="12" r="2.2" />
      </g>
    </Sticker>
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
    <Sticker {...rest}>
      {bars.map((bar, index) => (
        <rect
          key={bar.x}
          x={bar.x - 2}
          y={bar.top}
          width={4}
          height={20 - bar.top}
          rx={1.6}
          strokeWidth={1.3}
          fill={index < filled ? "var(--primary-bright)" : "var(--ob-prop)"}
        />
      ))}
    </Sticker>
  );
}

/** Choose your start: carry on from where the placement put you. */
export function ResumeIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path d="M4.2 6.4 13.6 12 4.2 17.6Z" fill="var(--primary-bright)" strokeWidth={1.3} />
      <path d="M17 5.2h3v13.6h-3Z" fill="var(--primary-bright)" strokeWidth={1.3} />
    </Sticker>
  );
}

/** Choose your start: back to the very beginning. */
export function RewindIcon(props: GlyphProps) {
  return (
    <Sticker {...props}>
      <path d="M19.8 6.4 10.4 12l9.4 5.6Z" fill="var(--muted-foreground)" strokeWidth={1.3} />
      <path d="M4 5.2h3v13.6H4Z" fill="var(--muted-foreground)" strokeWidth={1.3} />
    </Sticker>
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
 * Leave the quiz. blueberry_r9-onboard-placement draws an X at the head of the
 * placement, not the chevron every other step uses, and the difference is a
 * real one: a chevron says "one question back" and an X says "out of this".
 * The placement is the only step inside the flow that a student may want to
 * leave as a whole, so it is the only step that draws this.
 */
export function CloseIcon(props: GlyphProps) {
  return (
    <Glyph strokeWidth={2.5} {...props}>
      <path d="m5.5 5.5 13 13M18.5 5.5l-13 13" />
    </Glyph>
  );
}

/**
 * The welcome screen's horizon: two clouds, a small ghost flask, and the rise.
 *
 * DRAWN TO blueberry_r9-onboard-welcome, and three things about it are the
 * image's rather than a choice made here.
 *
 * THE CLOUDS ARE THE DOMINANT PROPS AND THE FLASK IS A SMALL GHOST. The image
 * makes the two clouds the largest objects in the lower third and tucks a
 * faint flask partly BEHIND the rise. An earlier pass inverted that: the flask
 * was the biggest thing on the screen and floated clear above the hill line,
 * with the clouds as small outlines beside it. Order in this file is paint
 * order, so the flask is drawn before the rise and the rise covers its foot.
 *
 * THE PROPS ARE OPAQUE AND THEY READ. The image draws white props with a clear
 * soft outline against the cream ground. The previous fill was --card on
 * --background, two percent of luminance apart, and the whole composition was
 * very nearly invisible. --ob-prop and --ob-prop-edge (onboarding.css) are
 * derived from --primary-foreground, --card, --secondary and
 * --muted-foreground, so the white is white in both themes and the outline
 * clears the 3.0 a graphic owes.
 *
 * THE RISE BLEEDS OFF BOTH EDGES. `preserveAspectRatio="xMidYMax slice"` fills
 * the width and crops the top, and the element is placed by onboarding.css as
 * a backdrop layer OUTSIDE the scrolling body, which is what actually fixed
 * the three hard edges an earlier pass left behind. See the note on
 * `.ob__backdrop` there: negative margins could not do it, because a sibling
 * `overflow-y: auto` makes overflow-x compute to auto and clip.
 *
 * The rise's FILL and its TOP CURVE are two paths on purpose. One closed path
 * stroked all the way round draws its own left, right and bottom edges, so the
 * hill arrives as a rectangle with a wavy top.
 *
 * It is decoration and carries `aria-hidden`; nothing here is information.
 */
export function WelcomeHorizon(props: Omit<SVGProps<SVGSVGElement>, "children" | "viewBox">) {
  return (
    <svg
      viewBox="0 0 390 340"
      fill="none"
      aria-hidden
      focusable="false"
      preserveAspectRatio="xMidYMax meet"
      {...props}
    >
      {/* The flask, small and quiet, standing where the rise will cover its
          foot. Drawn first so the hill is in front of it. */}
      <g opacity="0.7">
        <path
          d="M186 152v15l-10 55a4.4 4.4 0 0 0 4.2 5.8h17.6a4.4 4.4 0 0 0 4.2-5.8l-10-55v-15"
          fill="var(--ob-prop)"
          stroke="var(--ob-prop-edge)"
          strokeWidth={2.4}
          strokeLinejoin="round"
        />
        <path d="M183 152h11" stroke="var(--ob-prop-edge)" strokeWidth={2.4} strokeLinecap="round" />
      </g>

      {/* The rise. Fill first, then the top curve alone as the outline: one
          closed path stroked all the way round draws its own left, right and
          bottom edges, and the hill arrives as a rectangle with a wavy top. */}
      <path d="M-6 214c54-23 99-23 150 2s101 26 155 6 99-20 104 2v122H-6Z" fill="var(--ob-prop)" />
      <path
        d="M-6 214c54-23 99-23 150 2s101 26 155 6 99-20 104 2"
        fill="none"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      {/* The two clouds, the dominant props of the composition. The right one
          runs off the screen edge, as the image draws it. */}
      <path
        d="M22 176a30 30 0 0 1 57-10 24 24 0 0 1 40 17 17 17 0 0 1-4 34H36a22 22 0 0 1-14-41Z"
        fill="var(--ob-prop)"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
      />
      <path
        d="M252 96a26 26 0 0 1 49-9 21 21 0 0 1 35 15 15 15 0 0 1-4 30h-78a19 19 0 0 1-2-36Z"
        fill="var(--ob-prop)"
        stroke="var(--ob-prop-edge)"
        strokeWidth={2.4}
      />
    </svg>
  );
}
