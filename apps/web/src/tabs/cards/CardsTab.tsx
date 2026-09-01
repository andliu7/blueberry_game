/**
 * Cards: the spaced repetition deck, and the third of the four tabs.
 *
 * WHY IT IS A TAB NOW. It used to be `#/review`, a route the Charge sheet
 * handed out and nothing else linked to, with a comment in the old file saying
 * outright that "CLAUDE.md fixes the tab list and its order" so it could not be
 * one. The owner amendment of 2026-08-28 unfixed that list, and this is the
 * surface that most obviously earned a place in it: CLAUDE.md's learning
 * science section cites the AAMC's 2020 to 2024 self study data, flashcard use
 * up from 67.4 to 71.4 percent of examinees and free flashcard programs from
 * 37.3 to 50.2, as evidence for both the Anki style scheduler and "a flashcard
 * surface the product does not yet have". A daily habit that a student is
 * measurably already in the habit of is a destination, not a detour.
 *
 * The old hash still works. routes.ts maps `#/review` onto this tab, because
 * that link is in students' history and in the Charge sheet's copy.
 *
 * THE BAR HIDES DURING A SESSION, and that is deliberate rather than an
 * oversight in the layout. mobile-ui: "The bar is contextual: entering an
 * editor may replace or hide it entirely", and a review session is exactly an
 * editor, a full screen task with one job and its own way out. The hub keeps
 * the bar because the hub is a destination.
 *
 * How that is wired is worth naming because it is the one non-obvious React
 * pattern here: LIFTING STATE UP. The bar lives in the shell, above this
 * component, so this component cannot hide it; instead the shell owns the
 * boolean and passes down a setter, and this component reports. The alternative
 * would have been a context or writing an attribute onto document.body from an
 * effect, and both are heavier than one prop for a flag with exactly one reader.
 */

import { useEffect, useState } from "react";
import { MyDeck, ReviewSession } from "../../cards/ui";
import type { Card } from "../../cards/types";

export interface CardsTabProps {
  /** Told when a full screen session starts and ends, so the shell can hide the bar. */
  readonly onImmersiveChange?: (immersive: boolean) => void;
}

export default function CardsTab({ onImmersiveChange }: CardsTabProps) {
  /** The cards of the running session, or null on the hub. */
  const [session, setSession] = useState<readonly Card[] | null>(null);

  // Reported from an effect rather than from the press handler, so leaving this
  // tab by any route (a tab press, the back button, a deep link) also puts the
  // bar back. A handler would only cover the ways out this file knows about.
  useEffect(() => {
    onImmersiveChange?.(session !== null);
    return () => onImmersiveChange?.(false);
  }, [session, onImmersiveChange]);

  if (session !== null) {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col">
        <ReviewSession cards={session} onExit={() => setSession(null)} onDone={() => setSession(null)} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col">
      {/* The one thing this screen has to keep saying, because a student who
          ran out of Charge was sent here by a sheet promising it. Every price
          in docs/ECONOMY.md for a review drill is 0, and "never gate what
          repairs decay" is the sentence this badge is standing in for. */}
      <div className="flex justify-end px-4 pt-4">
        <span className="rounded-full border-2 border-[color:color-mix(in_srgb,var(--good)_40%,transparent)] bg-good-soft px-3 py-1 text-scale-xs font-bold text-foreground">
          Always free
        </span>
      </div>
      <MyDeck onStartReview={setSession} />
    </div>
  );
}
