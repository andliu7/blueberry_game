/**
 * The review session. Read this header before trusting anything in this file.
 *
 * THE LOOP: a card front, tap to reveal, then Again, Hard, Good, Easy. That is
 * the Anki borrow CLAUDE.md names, and the instruction beside it is "take the
 * scheduler, leave the interface". So this screen is not Anki's grid of blue
 * boxes. It is the reference's single tall card
 * (docs/reference/competitors/orgosolver-02-flashcard-decks.png, right hand
 * phone) with a thin progress rule and an Exit at the top, and it carries the
 * four ratings that Anki's grid was hiding underneath a menu.
 *
 * THE BUTTONS SAY WHEN THE CARD COMES BACK. `scheduler.nextInterval` is pure
 * and was split out for exactly this, so Good reads "Good, 8 days". It turns a
 * mood rating into a choice with a visible consequence, and it is the one
 * piece of Anki's interface worth keeping.
 *
 * WHERE THE STATE LIVES. The session's own state is a reducer in session.ts,
 * so the queue and the counter can be replayed in a test. The card's SCHEDULE
 * is not this component's business: `source.rate` is the seam, the local store
 * behind it asks scheduler.ts what a rating does, and Phase 6 swaps a Supabase
 * backed source in without touching this file.
 *
 * VOICE. Nothing on this screen scolds. Again is a normal step and the copy
 * treats it as one, which is not a nicety: a student who feels judged for
 * pressing Again presses Good instead, and the scheduler is then working from
 * a lie. The one system the whole surface exists to feed depends on honest
 * self reports.
 */

import { useMemo, useState } from "react";
import type { Card, DeckSource, Rating, ReviewState } from "../types";
import { RATING_LABELS, RATINGS } from "../types";
import { decks } from "../store";
import { nextInterval, startCard } from "../scheduler";
import { CardFace } from "./CardFace";
import { intervalLabel } from "./intervalLabel";
import {
  currentCard,
  isFinished,
  rateCurrent,
  reveal,
  sessionCounter,
  sessionProgress,
  sessionSummary,
  startSession,
  summaryHeadline,
  summaryLine,
  type ReviewSessionState,
} from "./session";

export interface ReviewSessionProps {
  readonly cards: readonly Card[];
  /** Defaults to the app's local store. Injected in tests and in Phase 6. */
  readonly source?: DeckSource;
  /** Leaving early. The session is not saved; every rating already committed. */
  readonly onExit: () => void;
  /** Called when the last card is rated, with the diamonds the run displayed. */
  readonly onDone?: (diamonds: number) => void;
}

/** Each rating's tone. Again is neutral, never red: it is not an error. */
const RATING_TONE: Readonly<Record<Rating, string>> = {
  again: "border-border bg-muted text-foreground",
  hard: "border-border bg-card text-foreground",
  good: "border-[color:var(--primary-edge)] bg-primary text-primary-foreground",
  // WHITE, not --good-ink. --good-ink is the darker step of the same hue and it
  // is for TEXT ON A CARD; on the --good fill itself the two are 1.26:1. White
  // on #065f46 is 7.68:1. The lavender turn darkened --good (Bloom's charged
  // halo needs 3:1 on the new ground) which is what made this visible.
  easy: "border-[color:var(--good-ink)] bg-[color:var(--good)] text-white",
};

export function ReviewSession({ cards, source = decks, onExit, onDone }: ReviewSessionProps) {
  const [state, setState] = useState<ReviewSessionState>(() => startSession(cards));
  const snapshot = source.getSnapshot();
  const card = currentCard(state);
  const done = isFinished(state);
  const summary = useMemo(() => sessionSummary(state), [state]);

  if (done) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 p-6 text-center">
        <p className="title-face text-scale-display font-bold text-[color:var(--good)]">{summary.reviewed}</p>
        <h1 className="title-face text-scale-2xl font-bold text-foreground">{summaryHeadline(summary)}</h1>
        <p className="text-scale-base leading-normal text-muted-foreground">{summaryLine(summary)}</p>
        <p className="text-scale-base font-semibold text-[color:var(--diamond)]">
          {summary.diamonds} diamonds
        </p>
        <button
          type="button"
          className="press min-h-14 w-full rounded-2xl border-2 border-[color:var(--primary-edge)] bg-primary text-scale-lg font-bold text-primary-foreground"
          onClick={() => {
            onDone?.(summary.diamonds);
            onExit();
          }}
        >
          Done
        </button>
      </div>
    );
  }

  if (card === null) {
    // Only reachable if a card id outlived its card, which the store's trim
    // could do. Say so rather than rendering an empty frame.
    return (
      <div className="mx-auto flex max-w-md flex-col gap-3 p-6">
        <p className="text-scale-base text-foreground">That card is no longer in your deck.</p>
        <button type="button" className="press min-h-11 rounded-xl bg-muted px-4 font-semibold" onClick={onExit}>
          Back to the decks
        </button>
      </div>
    );
  }

  const reviewState: ReviewState = snapshot.review[card.id] ?? startCard(card.id, new Date());

  const press = (rating: Rating): void => {
    const outcome = rateCurrent(state, rating);
    if (outcome === null) return;
    // The rating is committed through the seam FIRST, so a student who closes
    // the tab mid session keeps the schedule they earned.
    source.rate(outcome.cardId, outcome.rating);
    setState(outcome.state);
  };

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="press min-h-11 rounded-xl px-2 text-scale-sm font-semibold text-muted-foreground"
          onClick={onExit}
        >
          Exit
        </button>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-[color:var(--good)] transition-[width] duration-200"
            style={{ width: `${Math.round(sessionProgress(state) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-scale-sm font-semibold tabular-nums text-muted-foreground">
          {sessionCounter(state)}
        </span>
      </div>

      <CardFace card={card} revealed={state.revealed} onReveal={() => setState(reveal(state))} />

      {state.revealed ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              className={`press flex min-h-14 flex-col items-center justify-center rounded-2xl border font-bold ${RATING_TONE[rating]}`}
              onClick={() => press(rating)}
            >
              <span className="text-scale-base">{RATING_LABELS[rating]}</span>
              <span className="text-scale-xs font-medium opacity-80">
                {intervalLabel(nextInterval(reviewState, rating))}
              </span>
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className="press min-h-14 w-full rounded-2xl border-2 border-[color:var(--primary-edge)] bg-primary text-scale-lg font-bold text-primary-foreground"
          onClick={() => setState(reveal(state))}
        >
          Show the answer
        </button>
      )}

      {state.requeued.includes(card.id) && (
        <p className="text-center text-scale-sm text-muted-foreground">
          Second time round for this one. Nothing is lost by that.
        </p>
      )}
    </div>
  );
}
