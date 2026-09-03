/**
 * The deck tray: one deck, browsed as a hand of cards. Read this header
 * before trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_r6-deck-tray in docs/reference/design-goals:
 * named reaction cards fanned in an arc over a violet tray carrying the count
 * and the deck's name, one card lifted under the pointer with its mastery
 * dots showing, and THE WHOLE ARC INSIDE THE FRAME. The geometry and the
 * words come from tray.ts; the mastery dots from mastery.ts; the scheduler
 * state edge and corner badge from cardState.ts and StateBadge.tsx, per the
 * committed states sheet: a card's edge and badge say where it is in the
 * scheduler, before it is tapped.
 *
 * EVERY FANNED CARD DRAWS A STRUCTURE ABOVE ITS NAME. Both committed sheets
 * insist on it: the deck tray draws a skeleton on all six cards, and the
 * flashcard-states sheet draws one on every one of its five states. The round
 * 2 build shipped blank white above the label, which is a card back, not a
 * reaction card. The mark is the same DeckDoodle the landing tiles already
 * carry, picked per CARD by landing.ts's `doodleFor` so a card keeps its face
 * across visits. It is DECORATION and Doodles.tsx says so: it is aria-hidden,
 * it is not generated from the card's chemistry, and it never claims to be. A
 * real structure would mean MoleculeSvg, which needs a `structure:` tag most
 * cards do not have and renders far too fine to read at 68px; drawing a real
 * molecule for the cards that have one and nothing for the rest would make
 * the fan look broken rather than honest.
 *
 * THE FAN IS LAID OUT FOR THE WIDTH IT ACTUALLY HAS, AND DEALS FEWER CARDS
 * WHEN THAT WIDTH CANNOT PAY FOR THEM. tray.ts now solves against two bounds,
 * a fit ceiling and a legibility floor (see its header), so `fanCards` returns
 * 4 cards at 320px, 5 at the 390px reference phone and 6 at the column cap
 * instead of squeezing seven into an unreadable stack. This component measures
 * its own box with a ResizeObserver and re-lays-out when it changes. The one
 * non-obvious React pattern here is the REF plus STATE pair for measurement:
 * the ref reaches the DOM node (state cannot hold a live element before
 * render), the observer pushes the measured width into state, and the state
 * is what re-renders the slots. First paint lays out for the reference phone
 * width and is corrected by the observer's initial callback.
 *
 * THE FAN IS FULL BLEED inside the padded column (the negative margins), for
 * the same arithmetic reason: every 16px of side padding is 16px the step
 * cannot spend, and at 390px that padding is the difference between five
 * readable names and four. The committed image runs its arc edge to edge too.
 *
 * A FANNED CARD IS A BUTTON with two presses: the first lifts it (the
 * .fan__card--lifted glow, this app's you-are-here language), the second
 * opens it as a one-card review, front first. The lift also reveals the
 * card's actions row, where PAUSE lives: suspension is a real scheduler
 * state on the sheet, so it is a real act here, and a paused card stays
 * visible in the fan (grey, pause badge), out of every queue, resumable in
 * the same spot. aria-pressed carries the lifted state.
 *
 * THE MISTAKES DECK IS ASSEMBLED, NOT STORED, per landing.ts: its cards are
 * the journal's drafts merged with the saved copies. This component takes
 * `cards` as a prop and stays deck-shape agnostic; CardsHome decides which
 * assembly to hand it, so the tray never reaches into the journal itself.
 */

import { useEffect, useRef, useState } from "react";
import type { Card, DeckSnapshot } from "../types";
import { isSuspended } from "../types";
import {
  fanCards,
  fanLayout,
  trayLabel,
  trayTitle,
  FAN_CARD_H,
  FAN_CARD_W,
  FAN_REFERENCE_WIDTH,
} from "./tray";
import { masteryDots, MASTERY_DOTS } from "./mastery";
import { cardSchedulerState, CARD_STATE_LABELS } from "./cardState";
import { doodleFor } from "./landing";
import { DeckDoodle } from "./Doodles";
import { StateBadge } from "./StateBadge";
import "./cards.css";

export interface DeckTrayProps {
  readonly title: string;
  readonly cards: readonly Card[];
  /** For the dots and the state edges. The tray reads review state, never writes it. */
  readonly snapshot: DeckSnapshot;
  readonly onBack: () => void;
  /** Run this deck as a review session, paused cards excluded. */
  readonly onReview: (cards: readonly Card[]) => void;
  /** Open one card for a closer look, front first. */
  readonly onOpenCard: (card: Card) => void;
  /** Pause or resume one card's reviews. CardsHome wires this to the seam. */
  readonly onSetSuspended: (card: Card, suspended: boolean) => void;
  /** Injected in tests, per the wall-clock rule. Read once per render. */
  readonly now?: () => Date;
}

export function DeckTray({
  title,
  cards,
  snapshot,
  onBack,
  onReview,
  onOpenCard,
  onSetSuspended,
  now = () => new Date(),
}: DeckTrayProps) {
  const [lifted, setLifted] = useState<string | null>(null);
  const fanRef = useRef<HTMLDivElement | null>(null);
  const [fanWidth, setFanWidth] = useState(FAN_REFERENCE_WIDTH);

  useEffect(() => {
    const node = fanRef.current;
    if (node === null || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width !== undefined && width > 0) setFanWidth(width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const at = now();
  const hand = fanCards(cards, fanWidth);
  const liftedCard = hand.find((card) => card.id === lifted) ?? null;
  const reviewable = cards.filter((card) => !isSuspended(snapshot.review[card.id]));
  const pausedCount = cards.length - reviewable.length;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="press flex min-h-11 min-w-11 items-center justify-center rounded-xl text-scale-lg font-bold text-foreground"
          onClick={onBack}
          aria-label="Back to your decks"
        >
          <svg viewBox="0 0 20 20" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M12 4 L5 10 L12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h1 className="title-face text-scale-xl font-bold text-foreground">{title}</h1>
      </div>

      {hand.length === 0 ? (
        <p className="rounded-2xl border border-border bg-card p-4 text-scale-base text-muted-foreground">
          Nothing in this deck yet. Save a card from a lesson or write one of your own.
        </p>
      ) : (
        <div
          ref={fanRef}
          className="fan -mx-4 h-40 md:-mx-6"
          role="group"
          aria-label={`${title}, ${cards.length} cards`}
        >
          {hand.map((card, index) => {
            const slot = fanLayout(hand.length, index, fanWidth);
            const isLifted = lifted === card.id;
            const state = cardSchedulerState(snapshot.review[card.id], at);
            return (
              <button
                key={card.id}
                type="button"
                /* Not a chip3d: the 3D press translate would clobber the
                   fan's own transform. cards.css carries a fan-aware press
                   rule and its own bottom edge instead, so the card keeps
                   the sheet's 3D language and the acknowledgement happens
                   in the card's own slot. */
                className={`fan__card fan__card--${state} press flex flex-col items-center justify-between gap-1 rounded-xl border-2 border-border bg-card px-1 pb-2 pt-2 ${
                  isLifted ? "fan__card--lifted" : ""
                }`}
                style={
                  {
                    width: `${FAN_CARD_W}px`,
                    height: `${FAN_CARD_H}px`,
                    "--fan-x": `${slot.x}px`,
                    "--fan-y": `${slot.y}px`,
                    "--fan-rot": `${slot.rot}deg`,
                    zIndex: isLifted ? 10 : index,
                  } as React.CSSProperties
                }
                aria-pressed={isLifted}
                onClick={() => (isLifted ? onOpenCard(card) : setLifted(card.id))}
                aria-label={`${trayTitle(card)}, ${CARD_STATE_LABELS[state].toLowerCase()}. ${
                  isLifted ? "Press again to open" : "Press to lift"
                }`}
              >
                <StateBadge state={state} />
                {/* The skeleton, per both committed sheets. Decoration, not
                    chemistry: see the header and Doodles.tsx. */}
                <DeckDoodle
                  variant={doodleFor(card.id)}
                  className="h-8 w-10 shrink-0 text-muted-foreground"
                />
                <span
                  className={`fan__name text-scale-xs font-bold leading-none ${
                    state === "suspended" ? "" : "text-card-foreground"
                  }`}
                >
                  {trayTitle(card)}
                </span>
                <MasteryDotRow dots={masteryDots(snapshot.review[card.id])} />
              </button>
            );
          })}
        </div>
      )}

      {/* The lifted card's actions. Pause lives here rather than on the card
          itself so the card's two presses stay two: lift, then open. */}
      {liftedCard !== null && (
        <div className="flex items-center justify-center gap-2">
          {isSuspended(snapshot.review[liftedCard.id]) ? (
            <button
              type="button"
              className="press min-h-11 rounded-full border-2 border-[color:var(--primary-edge)] px-4 text-scale-sm font-bold text-[color:var(--primary-ink)]"
              onClick={() => onSetSuspended(liftedCard, false)}
            >
              Resume reviews
            </button>
          ) : (
            <button
              type="button"
              className="press min-h-11 rounded-full border-2 border-border px-4 text-scale-sm font-bold text-foreground"
              onClick={() => onSetSuspended(liftedCard, true)}
            >
              Pause this card
            </button>
          )}
        </div>
      )}

      {cards.length > hand.length && (
        <p className="text-center text-scale-sm text-muted-foreground">
          The fan holds {hand.length} at this width, so every name stays readable. The tray holds
          all {cards.length}, and a review runs through every one that is due.
        </p>
      )}

      {/* The violet tray, exactly the committed image's label: count, dot, name. */}
      <div className="tray">
        <div className="tray__cavity" aria-hidden="true" />
        <p className="title-face text-center text-scale-lg font-bold">{trayLabel(cards.length, title)}</p>
      </div>

      <button
        type="button"
        className="chip3d chip3d--go press title-face min-h-14 w-full rounded-full text-scale-lg font-bold"
        disabled={reviewable.length === 0}
        onClick={() => onReview(reviewable)}
      >
        Review this deck
      </button>
      {pausedCount > 0 && (
        <p className="text-center text-scale-sm text-muted-foreground">
          {pausedCount === 1
            ? "1 paused card sits this one out."
            : `${pausedCount} paused cards sit this one out.`}
        </p>
      )}
    </div>
  );
}

/** The dots under a fanned card's name. Filled left to right, never green. */
function MasteryDotRow({ dots }: { readonly dots: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center gap-1"
      role="img"
      aria-label={`${dots} of ${MASTERY_DOTS} mastery dots`}
    >
      {Array.from({ length: MASTERY_DOTS }, (_, i) => (
        <span key={i} className={`mastery-dot ${i < dots ? "mastery-dot--on" : ""}`} />
      ))}
    </span>
  );
}
