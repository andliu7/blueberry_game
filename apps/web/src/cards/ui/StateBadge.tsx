/**
 * The corner badge a card wears, per the committed states sheet
 * (blueberry_spec-card-states in docs/reference/design-goals): a card's edge
 * and badge say where it is in the scheduler. cardState.ts decides the word;
 * cards.css owns the colours; this file owns the glyphs.
 *
 * THE GLYPHS ARE INLINE SVG, never emoji and never raster, per the
 * design-goals icon ruling: they inherit currentColor from their badge class
 * so the measured token pairs in cards.css are the only colours drawn.
 *
 * The badge is aria-hidden DECORATION: every surface that wears one also
 * speaks the state's word in its accessible name (the fan card's aria-label,
 * the review face's visible chip), so nothing is said only in colour, per
 * the sheet's own point that the edge and badge are a vocabulary, not the
 * sole carrier.
 *
 * "young" wears no badge: the sheet draws five states and young is the calm
 * in-between the five never have to lie about, per cardState.ts.
 */

import type { CardSchedulerState } from "./cardState";

function Glyph({ state }: { readonly state: CardSchedulerState }) {
  switch (state) {
    case "new":
      // The sheet's small dot: simply "here, unmet".
      return (
        <svg viewBox="0 0 12 12" className="h-2 w-2" aria-hidden="true">
          <circle cx="6" cy="6" r="4" fill="currentColor" />
        </svg>
      );
    case "learning":
      // The flask from the sheet's learning card, traced small.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <path d="M4.5 1.5 h3 M5 1.5 v3 L2.5 9 a1 1 0 0 0 .9 1.5 h5.2 a1 1 0 0 0 .9 -1.5 L7 4.5 v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "due":
      // The sheet's clock.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
          <circle cx="6" cy="6" r="4.4" />
          <path d="M6 3.8 V6 l1.7 1.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "mastered":
      // The sheet's check.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M2.5 6.5 L5 9 L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "suspended":
      // The sheet's pause bars.
      return (
        <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor" aria-hidden="true">
          <rect x="3" y="2.5" width="2.2" height="7" rx="1" />
          <rect x="6.8" y="2.5" width="2.2" height="7" rx="1" />
        </svg>
      );
    case "young":
      return null;
  }
}

export interface StateBadgeProps {
  readonly state: CardSchedulerState;
}

/** The disc in the card's corner. Renders nothing for "young", on purpose. */
export function StateBadge({ state }: StateBadgeProps) {
  if (state === "young") return null;
  return (
    <span className={`state-badge state-badge--${state}`} aria-hidden="true">
      <Glyph state={state} />
    </span>
  );
}
