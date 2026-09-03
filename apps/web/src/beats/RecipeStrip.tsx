/**
 * The recipe strip: a lesson's progress bar built from beat-type badges in
 * order, per the committed spec blueberry_spec-question-badges_*.png. A
 * lesson shows its beat composition up front; completed segments are the
 * progress green, the current segment is the violet family, what is left
 * reads flat and quiet.
 *
 * A CONTROLLED, STATELESS VIEW. The segments arrive computed (template.ts's
 * recipeSegments for the beat runner, the lesson player's own mapping for
 * curriculum problems), because the web suite has no DOM and any rule living
 * in JSX is a rule nothing can test. This file only draws.
 *
 * ACCESSIBILITY. An ordered list rather than a progressbar role: a recipe is
 * a sequence of named things, and "step 3 of 6, matching, current" is more
 * information than a percentage. The current segment carries
 * aria-current="step"; each item names its beat and state to a reader. The
 * badge glyphs are aria-hidden because the text names them.
 *
 * The within-step fraction (`currentFraction`) is the S3 goal-strip
 * precedent: the current segment fills to its own fraction, as a green fill
 * and never a written number. FILL-ONLY green, dark-ink badges; the measured
 * reasons are in beat-chrome.css.
 */

import type { ReactNode } from "react";
import type { BadgeKind, RecipeSegment } from "./template";
import "./beat-chrome.css";

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** Tiny glyphs, one per badge kind in the committed badge vocabulary. */
const GLYPH: Readonly<Record<BadgeKind, ReactNode>> = {
  // A over B, the fraction the spec badge draws: the pick-one badge.
  mcq: (
    <g>
      <g fill="currentColor" stroke="none" fontWeight={700}>
        <text x="8" y="6.6" fontSize="6.8" textAnchor="middle">
          A
        </text>
        <text x="8" y="15" fontSize="6.8" textAnchor="middle">
          B
        </text>
      </g>
      <path d="M4.5 8.4h7" {...STROKE} />
    </g>
  ),
  // Two cards, offset: the matching badge.
  match: (
    <g {...STROKE}>
      <rect x="2.5" y="2.5" width="7" height="9" rx="1.5" />
      <rect x="6.5" y="5" width="7" height="9" rx="1.5" />
    </g>
  ),
  // Bars of falling length with the swap arrow: the sort badge.
  sort: (
    <g {...STROKE}>
      <path d="M3 4h7M3 8h5M3 12h3" />
      <path d="M12.5 4.5v7m0 0-1.7-1.9m1.7 1.9 1.7-1.9" />
    </g>
  ),
  // A flask with a rising bubble: the build badge.
  synthesis: (
    <g {...STROKE}>
      <path d="M6.5 2.5h3M7 2.5v3.2L3.6 12a1.6 1.6 0 0 0 1.5 2.2h5.8a1.6 1.6 0 0 0 1.5-2.2L9 5.7V2.5" />
      <circle cx="8" cy="10.5" r="0.9" />
    </g>
  ),
  // The curved return arrow: misses coming back.
  recycle: (
    <g {...STROKE}>
      <path d="M12.5 8a4.5 4.5 0 1 1-1.7-3.5" />
      <path d="M11 1.8l-.2 2.9 2.9.2" />
    </g>
  ),
  // The check: the lesson pays out.
  reward: (
    <g {...STROKE}>
      <path d="M3.5 8.5 6.7 11.5 12.5 4.5" />
    </g>
  ),
  // A reagent bottle with a plus.
  reagents: (
    <g {...STROKE}>
      <path d="M4.5 2.5h4M5.3 2.5v2L3.5 7v6A1.5 1.5 0 0 0 5 14.5h3A1.5 1.5 0 0 0 9.5 13V7L7.7 4.5v-2" />
      <path d="M11.3 4.2h3M12.8 2.7v3" />
    </g>
  ),
  // A flask with a question mark: predict the product.
  product: (
    <g {...STROKE}>
      <path d="M6.5 2.5h3M7 2.5v3.2L3.6 12a1.6 1.6 0 0 0 1.5 2.2h5.8a1.6 1.6 0 0 0 1.5-2.2L9 5.7V2.5" />
      <path d="M6.9 9.4a1.1 1.1 0 1 1 1.3 1.1v.6" />
      <path d="M8.2 12.6h.01" />
    </g>
  ),
  // A ruled sum: work the number.
  numeric: (
    <g {...STROKE}>
      <path d="M4 4.5h8M4 8h8" />
      <path d="M9.5 11.5h3M4.5 11.5h3" />
    </g>
  ),
  // A hexagon: draw the structure.
  structure: (
    <g {...STROKE}>
      <path d="M8 2.5 12.6 5.2v5.6L8 13.5 3.4 10.8V5.2Z" />
    </g>
  ),
};

const STATE_WORD: Readonly<Record<RecipeSegment["state"], string>> = {
  done: "done",
  current: "you are here",
  todo: "coming up",
};

export interface RecipeStripProps {
  readonly segments: readonly RecipeSegment[];
  /**
   * 0 to 1: how far through the CURRENT segment's own beats the student is.
   * Rendered as a green fill inside the current segment, never as a number.
   * Omit it for single-beat segments, where partway does not exist.
   */
  readonly currentFraction?: number;
  readonly reducedMotion?: boolean;
  readonly className?: string;
}

export function RecipeStrip({ segments, currentFraction, reducedMotion = false, className = "" }: RecipeStripProps) {
  const position = segments.findIndex((segment) => segment.state === "current");
  return (
    <ol
      className={`recipe-strip ${reducedMotion ? "recipe-strip--still" : ""} ${className}`}
      aria-label={`Lesson recipe, ${position < 0 ? segments.length : position + 1} of ${segments.length}`}
    >
      {segments.map((segment, index) => {
        const current = segment.state === "current";
        const fraction = current && currentFraction !== undefined ? Math.min(1, Math.max(0, currentFraction)) : null;
        return (
          <li
            key={`${segment.slot}-${index}`}
            className="recipe-strip__seg"
            data-state={segment.state}
            data-badge={segment.badge}
            aria-current={current ? "step" : undefined}
            title={segment.label}
          >
            {fraction !== null && fraction > 0 ? (
              <span className="recipe-strip__fill" aria-hidden style={{ width: `${Math.round(fraction * 100)}%` }} />
            ) : null}
            <span className="recipe-strip__badge" aria-hidden>
              <svg viewBox="0 0 16 16" role="presentation" focusable="false">
                {GLYPH[segment.badge]}
              </svg>
            </span>
            <span className="sr-only">
              {segment.label}, {STATE_WORD[segment.state]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
