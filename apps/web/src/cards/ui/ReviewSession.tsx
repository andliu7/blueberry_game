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
import { cardSchedulerState } from "./cardState";
import "./cards.css";
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

/**
 * Each rating's chip, from the cards.css 3D chip family, per the committed
 * button-types sheet: four small grade chips, each a fill under its own
 * measured ink. Again is the QUIET one, never red: it is not an error, and
 * the reference sheet's red Again is the one part of that drawing the voice
 * rules overrule. Good is the goal-green GO fill under dark ink (the
 * fill-only rule's legal shape); Easy is the teal alt-route family. The old
 * inline tone map put white on --good, which measured 1.9:1 in the dark
 * theme; every pairing here is measured in cards.css's own header.
 */
const RATING_CHIP: Readonly<Record<Rating, string>> = {
  again: "chip3d--quiet",
  hard: "chip3d--hard",
  good: "chip3d--go",
  easy: "chip3d--easy",
};

export function ReviewSession({ cards, source = decks, onExit, onDone }: ReviewSessionProps) {
  const [state, setState] = useState<ReviewSessionState>(() => startSession(cards));
  const snapshot = source.getSnapshot();
  const card = currentCard(state);
  const done = isFinished(state);
  const summary = useMemo(() => sessionSummary(state), [state]);

  if (done) {
    return (
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 p-6 text-center">
        <p className="title-face text-scale-display font-bold text-[color:var(--good)]">{summary.reviewed}</p>
        <h1 className="title-face text-scale-2xl font-bold text-foreground">{summaryHeadline(summary)}</h1>
        <p className="text-scale-base leading-normal text-muted-foreground">{summaryLine(summary)}</p>
        <p className="text-scale-base font-semibold text-[color:var(--diamond)]">
          {summary.diamonds} diamonds
        </p>
        {/* The committed button sheet's CONTINUE chip: periwinkle face, thick
            darker bottom edge, presses down. Round 2 shipped a flat violet
            slab with no edge and no depression here, which is the one screen
            in the deck where the shape language matters most.

            Deliberately CONTINUE and not the sheet's green CLAIM, though this
            is the end-of-session moment where a claim would sit: nothing on
            this screen is claimed. The diamonds line above is the run's
            tally, and CardsHome does not credit it to a balance, so a button
            reading "Claim" would promise a transaction that does not happen.
            When the economy store is wired to onDone, this is the button that
            becomes chip3d--go and says Claim, and not before. */}
        <button
          type="button"
          className="chip3d press title-face min-h-14 w-full rounded-full text-scale-lg font-bold"
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
      <div className="mx-auto flex w-full max-w-md flex-col gap-3 p-6">
        <p className="text-scale-base text-foreground">That card is no longer in your deck.</p>
        <button type="button" className="press min-h-11 rounded-xl bg-muted px-4 font-semibold" onClick={onExit}>
          Back to the decks
        </button>
      </div>
    );
  }

  // One clock read per render, per the wall-clock rule: the fallback state
  // and the badge both see the same instant.
  const at = new Date();
  const reviewState: ReviewState = snapshot.review[card.id] ?? startCard(card.id, at);
  const schedulerState = cardSchedulerState(snapshot.review[card.id], at);

  const press = (rating: Rating): void => {
    const outcome = rateCurrent(state, rating);
    if (outcome === null) return;
    // The rating is committed through the seam FIRST, so a student who closes
    // the tab mid session keeps the schedule they earned.
    source.rate(outcome.cardId, outcome.rating);
    setState(outcome.state);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="press min-h-11 rounded-xl px-2 text-scale-sm font-semibold text-muted-foreground"
          onClick={onExit}
        >
          Exit
        </button>
        {/* The session bar is the mastery bar: a filled bar is the progress
            semantic, so it takes the goal-green FILL closed by its own edge,
            not the correctness emerald it used to borrow. */}
        <div className="mastery-bar flex-1">
          <div
            className="mastery-bar__fill"
            style={{ width: `${Math.round(sessionProgress(state) * 100)}%` }}
          />
        </div>
        <span className="shrink-0 text-scale-sm font-semibold tabular-nums text-muted-foreground">
          {sessionCounter(state)}
        </span>
      </div>

      <CardFace
        card={card}
        revealed={state.revealed}
        onReveal={() => setState(reveal(state))}
        schedulerState={schedulerState}
      />

      {state.revealed ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RATINGS.map((rating) => (
            <button
              key={rating}
              type="button"
              className={`chip3d ${RATING_CHIP[rating]} press flex min-h-14 flex-col items-center justify-center font-bold`}
              /* The visible name alone would shift per card ("Good 8 days");
                 this keeps the rating word first and the consequence named. */
              aria-label={`${RATING_LABELS[rating]}, comes back in ${intervalLabel(nextInterval(reviewState, rating))}`}
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
        /* The committed button sheet draws this exact button type, CHECK, as a
           periwinkle 3D chip. Round 2 gave it a flat violet fill with a
           border and no edge, so it had no bottom slab and did not press
           down; the base .chip3d face IS the periwinkle, so no modifier. */
        <button
          type="button"
          className="chip3d press title-face min-h-14 w-full rounded-full text-scale-lg font-bold"
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
