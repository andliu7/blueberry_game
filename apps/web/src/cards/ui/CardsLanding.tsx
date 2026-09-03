/**
 * The Cards tab landing. Read this header before trusting anything in this
 * file.
 *
 * THE COMMITTED IMAGE IS blueberry_cards-landing in docs/reference/design-goals,
 * and its order, top to bottom, is a decision this file only renders: the tab
 * OPENS ON THE REVIEW DECISION, not on browsing. First the Due-today hero, a
 * periwinkle chip with one big number and a green REVIEW fill; then the
 * My-decks grid, each tile a structure doodle, a count and a thin green
 * mastery bar, with "+ New deck" beside the heading and My mistakes as a
 * first-class member of the grid; then the From-your-lessons row, every deck
 * in it carrying the lightning auto marker so authored and auto-collected
 * decks read differently at a glance.
 *
 * EVERY NUMBER COMES FROM landing.ts, which derives the hero's number and the
 * REVIEW queue from the same computation, so the button can never start a
 * different session than the one the number promised. This file holds no
 * arithmetic at all; it is the pixels over that file's model, which is what
 * lets test/cardsLanding.test.ts assert the numbers without rendering.
 *
 * THE CLOCK IS READ ONCE PER RENDER and handed down, per the gauntlet log's
 * wall-clock rule: the surface takes `now` as an injectable so a test can ask
 * about any hour, and the default reads the real clock at render, not at
 * module load.
 */

import { useMemo } from "react";
import type { Card, DeckId, DeckSource } from "../types";
import { decks as defaultDecks } from "../store";
import { loadMistakes, type SavedMistake } from "../../tabs/trainer/mistakes";
import { BlueberryMark } from "../../mascot/BlueberryMark";
import {
  heroModel,
  lessonDeckTiles,
  myDeckTiles,
  reviewQueue,
  type DeckTile,
} from "./landing";
import { AutoBolt, DeckDoodle } from "./Doodles";
import { useDeckSnapshot } from "./useDeck";
import "./cards.css";

export interface CardsLandingProps {
  readonly source?: DeckSource;
  /** Injected in tests. The default reads the journal the trainer writes. */
  readonly mistakes?: readonly SavedMistake[];
  /** Injected in tests, so the hero can be asked about any hour. */
  readonly now?: () => Date;
  /** Start the session the hero promised. The queue IS the hero's number. */
  readonly onReview: (cards: readonly Card[]) => void;
  /** Open one deck's tray. */
  readonly onOpenDeck: (deckId: DeckId) => void;
  /** The + New deck button, and the composer is where a new deck is born. */
  readonly onCompose: () => void;
}

export function CardsLanding({
  source = defaultDecks,
  mistakes,
  now = () => new Date(),
  onReview,
  onOpenDeck,
  onCompose,
}: CardsLandingProps) {
  const snapshot = useDeckSnapshot(source);
  const journal = useMemo(() => mistakes ?? loadMistakes(), [mistakes, snapshot]);
  const at = now();
  const hero = heroModel(snapshot, journal, at);
  const queue = useMemo(() => reviewQueue(snapshot, journal, at), [snapshot, journal, at]);
  const grid = useMemo(() => myDeckTiles(snapshot, journal), [snapshot, journal]);
  const lessonRow = useMemo(() => lessonDeckTiles(snapshot), [snapshot]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4 md:p-6">
      {/* The hero. A chip, not a button: the green REVIEW fill inside it is
          the press target, and the number is the queue it starts. */}
      <section className="hero-chip relative flex flex-col items-center gap-1 px-6 py-6 text-center">
        <h1 className="title-face text-scale-lg font-bold">{hero.title}</h1>
        <p className="title-face text-scale-display font-bold leading-none" aria-hidden="true">
          {hero.due}
        </p>
        <p className="text-scale-sm font-semibold">
          <span className="sr-only">{hero.due} </span>
          {hero.subline}
        </p>
        <button
          type="button"
          className="chip3d chip3d--go press title-face mt-3 min-h-11 rounded-full px-10 text-scale-base font-bold uppercase tracking-wide"
          disabled={hero.buttonDisabled}
          onClick={() => onReview(queue)}
        >
          {hero.buttonLabel}
        </button>
        {/* The mascot leans on the hero's right edge AT EVERY WIDTH: the
            committed landing image is itself a phone frame and draws it
            there, so hiding it below 640px was hiding it exactly where the
            reference shows it. It hangs inside the hero's own footprint
            (right: 0.25rem), so nothing overflows the frame at 320px. */}
        <span className="pointer-events-none absolute right-1 -bottom-3" aria-hidden="true">
          <BlueberryMark className="h-16 w-16" eyes mood={hero.due === 0 ? "happy" : "curious"} />
        </span>
      </section>

      {/* My decks: the authored grid, mistakes included as a full member. */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="title-face text-scale-xl font-bold text-foreground">My decks</h2>
          <button
            type="button"
            className="press min-h-11 rounded-full border-2 border-[color:var(--primary-edge)] px-4 text-scale-sm font-bold text-[color:var(--primary-ink)]"
            onClick={onCompose}
          >
            + New deck
          </button>
        </div>
        {grid.length === 0 ? (
          <p className="text-scale-sm text-muted-foreground">No decks yet.</p>
        ) : (
          <ul className="grid grid-cols-2 gap-3">
            {grid.map((tile) => (
              <li key={tile.deckId}>
                <DeckTileButton tile={tile} onOpen={onOpenDeck} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* From your lessons: the auto-collected row, every tile bolted. */}
      {lessonRow.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="title-face text-scale-xl font-bold text-foreground">From your lessons</h2>
          <ul className="flex gap-3 overflow-x-auto pb-1">
            {lessonRow.map((tile) => (
              <li key={tile.deckId} className="w-44 shrink-0">
                <DeckTileButton tile={tile} onOpen={onOpenDeck} compact />
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

/**
 * One deck tile: doodle, name, count, thin mastery bar, and the marker that
 * says which kind of deck this is. The whole tile is the button; the mastery
 * bar's fill is the goal green closed by its own edge, per the fill-only rule.
 */
function DeckTileButton({
  tile,
  onOpen,
  compact = false,
}: {
  readonly tile: DeckTile;
  readonly onOpen: (deckId: DeckId) => void;
  readonly compact?: boolean;
}) {
  return (
    <button
      type="button"
      className={`chip3d chip3d--card press flex w-full flex-col items-center gap-1.5 p-4 text-center ${
        compact ? "min-h-32" : "min-h-40"
      }`}
      onClick={() => onOpen(tile.deckId)}
    >
      <span className="relative text-muted-foreground">
        <DeckDoodle variant={tile.doodle} className={compact ? "h-8 w-10" : "h-10 w-12"} />
        {tile.marker === "auto" && (
          <span className="absolute -right-3 -top-1">
            <AutoBolt />
          </span>
        )}
        {tile.marker === "mistakes" && (
          <span className="absolute -right-4 -top-2" aria-hidden="true">
            <BlueberryMark className="h-6 w-6" eyes mood="focused" />
          </span>
        )}
      </span>
      <span className="w-full truncate text-scale-base font-bold text-card-foreground">{tile.title}</span>
      <span className="text-scale-sm text-muted-foreground">
        {tile.count === 1 ? "1 card" : `${tile.count} cards`}
        {tile.marker === "auto" ? " · auto" : ""}
      </span>
      <span
        className="mastery-bar mt-auto block w-full"
        role="img"
        aria-label={`${Math.round(tile.mastery * 100)} percent mastered`}
      >
        <span className="mastery-bar__fill block" style={{ width: `${Math.round(tile.mastery * 100)}%` }} />
      </span>
    </button>
  );
}
