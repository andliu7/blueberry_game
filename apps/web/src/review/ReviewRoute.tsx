/**
 * The review route, at `#/review`.
 *
 * WHY IT EXISTS NOW. The Charge sheet's empty state offers "Review drills are
 * always free" as its PRIMARY action, because docs/ECONOMY.md prices a review
 * drill at 0 and says "never gate what repairs decay". A primary action has to
 * lead somewhere or the sentence is a decoration, and until this file the three
 * screens in `src/cards/ui/` were built, tested and reachable from nothing:
 * their own barrel says "this is the screen the homepage links to" and no
 * homepage did.
 *
 * WHAT IT IS. The thinnest possible shell over the two screens that already
 * exist. The hub decides what to review and this file owns one piece of state,
 * which is whether a session is running. Neither screen reads a route, exactly
 * as `cards/ui/index.ts` describes, so the transitions live here.
 *
 * WHAT IT IS NOT. It is not a tab. CLAUDE.md fixes the tab list and its order,
 * and mobile-ui's own rule is that a tool reached mid task belongs behind a
 * route or a sheet rather than in the bar. A student arrives here from the
 * Charge sheet or by typing the hash, and leaves back to the pathway.
 *
 * CHARGE IS NOT SPENT HERE, and that is the point of the screen. Nothing in
 * this file calls `startNode`.
 */

import { useState } from "react";
import { MyDeck, ReviewSession } from "../cards/ui";
import type { Card } from "../cards/types";

export interface ReviewRouteProps {
  readonly onExit: () => void;
}

export default function ReviewRoute({ onExit }: ReviewRouteProps) {
  /** The cards of the running session, or null on the hub. */
  const [session, setSession] = useState<readonly Card[] | null>(null);

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-xl flex-col">
      <header className="flex items-center justify-between gap-3 px-4 pt-4">
        <button
          type="button"
          className="press inline-flex min-h-11 min-w-11 items-center gap-2 rounded-xl px-3 text-scale-sm font-semibold text-muted-foreground"
          onPointerDown={() => (session === null ? onExit() : setSession(null))}
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden>
            <path
              d="M14.5 5.5L8 12l6.5 6.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          {session === null ? "Pathway" : "My deck"}
        </button>
        {/* The one thing this screen has to keep saying, because it is why a
            student who ran out of charge was sent here. */}
        <span className="rounded-full border border-[color:color-mix(in_srgb,var(--good)_40%,transparent)] bg-good-soft px-3 py-1 text-scale-xs font-bold text-good-ink">
          Always free
        </span>
      </header>

      {session === null ? (
        <MyDeck onStartReview={setSession} />
      ) : (
        <ReviewSession cards={session} onExit={() => setSession(null)} onDone={() => setSession(null)} />
      )}
    </div>
  );
}
