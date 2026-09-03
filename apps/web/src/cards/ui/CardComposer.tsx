/**
 * The composer: a student writes a three-sided reaction card. Read this
 * header before trusting anything in this file.
 *
 * THE COMMITTED IMAGE IS blueberry_r6-composer in docs/reference/design-goals,
 * and its shape, top to bottom, is what this renders: a back arrow and title,
 * the Setup / Conditions / Product segmented pill (active segment FILLED
 * DARK, inactive outlined, which the pill's own border carries), one large
 * editing card for the active side, the three side previews fanned beneath so
 * the whole card stays visible while one side is edited, and Save to deck as
 * the violet 3D chip. The draft text in the image is model gibberish; the
 * layout and the pill states are what binds.
 *
 * WHERE THE LOGIC LIVES: composer.ts, all of it pure. This file owns exactly
 * the React state (which side is active, the draft, where it saves) and the
 * pixels. The save button's disabled reason is printed under it in the coach
 * voice, because a dead button with no sentence is a wall and a dead button
 * that names the next step is a checklist.
 *
 * FILENAME NOTE: this file is CardComposer.tsx rather than Composer.tsx
 * because composer.ts (the logic) lives beside it and Windows resolves the
 * two names case-insensitively, which makes "./Composer" ambiguous to tsc.
 *
 * THE PREVIEWS ARE BUTTONS, the same act as the pill: three ways to say
 * "edit this side" beat a preview you can see but not reach. Each is a 44pt
 * target and acknowledges the press through .press, per the contract.
 */

import { useMemo, useState } from "react";
import type { DeckId, DeckSource, ReactionSide, ReactionSides } from "../types";
import { decks as defaultDecks } from "../store";
import {
  EMPTY_SIDES,
  SIDE_HINTS,
  SIDE_LABELS,
  SIDE_ORDER,
  canSave,
  cardFromDraft,
  deckTitleProblem,
  draftProblems,
  newDeckId,
  setSide,
} from "./composer";
import { useDeckSnapshot } from "./useDeck";
import "./cards.css";

/** The sentinel the deck select uses for "a deck that does not exist yet". */
const NEW_DECK = "__new__";

/** Each preview's fan tilt, in degrees, left to right. */
const PREVIEW_TILT: Readonly<Record<ReactionSide, number>> = {
  setup: -6,
  conditions: 0,
  product: 6,
};

/**
 * Each side's preview tint. Warm, neutral-blue, green, matching the committed
 * image's three sticker colours through this app's own token families; the
 * green is the progress soft FILL under dark ink, per the fill-only rule.
 */
const PREVIEW_TONE: Readonly<Record<ReactionSide, string>> = {
  setup: "border-[color:var(--warn-ink-strong)] bg-[color:var(--warn-soft-solid)] text-foreground",
  conditions: "border-[color:var(--chip-edge)] bg-[color:var(--chip-face)] text-[color:var(--chip-ink)]",
  product: "border-[color:var(--progress-edge)] bg-[color:var(--progress-soft)] text-foreground",
};

export interface ComposerProps {
  readonly source?: DeckSource;
  /** Leave the composer. Saving does not leave; a student often writes a few. */
  readonly onBack: () => void;
  /** Injected for tests; the clock is read once per save, never per render. */
  readonly now?: () => Date;
}

export function Composer({ source = defaultDecks, onBack, now = () => new Date() }: ComposerProps) {
  const snapshot = useDeckSnapshot(source);
  const [sides, setSides] = useState<ReactionSides>(EMPTY_SIDES);
  const [active, setActive] = useState<ReactionSide>("setup");
  const [deckChoice, setDeckChoice] = useState<string>(NEW_DECK);
  const [newTitle, setNewTitle] = useState("");
  const [savedInto, setSavedInto] = useState<string | null>(null);

  const personalDecks = useMemo(
    () => Object.values(snapshot.decks).filter((deck) => deck.kind === "personal"),
    [snapshot],
  );

  const problems = draftProblems(sides);
  const titleProblem = deckChoice === NEW_DECK ? deckTitleProblem(newTitle) : null;
  const blocked = !canSave(sides) || titleProblem !== null;
  /**
   * The next sentence under the save button, or null when nothing is missing.
   * `problems[0]` is `string | undefined` and `titleProblem` is `string |
   * null`, so this narrows to `string | null` and NEVER to undefined. The
   * round 2 build then tested it for `=== undefined`, which is why its save
   * confirmation was unreachable dead code; the comparison is against null.
   */
  const helper: string | null = problems[0] ?? titleProblem;

  /**
   * A save wipes the draft, so the very next render always has a problem to
   * report ("Add a setup..."), and a confirmation gated behind "no problems"
   * could never show. The acknowledgement therefore WINS over the nag for as
   * long as it stands, and it stands until the student touches the draft
   * again, which is the moment the nag becomes useful advice rather than a
   * scolding response to a successful save. Every edit path clears it.
   */
  const clearSaved = (): void => setSavedInto(null);
  const editSide = (side: ReactionSide, text: string): void => {
    clearSaved();
    setSides(setSide(sides, side, text));
  };

  const save = (): void => {
    if (blocked) return;
    const at = now();
    let deckId: DeckId;
    let deckTitle: string;
    if (deckChoice === NEW_DECK) {
      deckTitle = newTitle.trim();
      deckId = newDeckId(deckTitle);
      source.createDeck({ id: deckId, title: deckTitle, kind: "personal", cardIds: [] });
    } else {
      deckId = deckChoice;
      deckTitle = snapshot.decks[deckId]?.title ?? deckId;
    }
    source.saveCard(cardFromDraft(sides, at), deckId);
    setSides(EMPTY_SIDES);
    setActive("setup");
    setSavedInto(deckTitle);
    if (deckChoice === NEW_DECK) setDeckChoice(deckId);
  };

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
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
        <h1 className="title-face text-scale-xl font-bold text-foreground">Create card</h1>
      </div>

      {/* The pill. aria-pressed carries the active state for both the
          stylesheet and assistive tech, one attribute doing both jobs. */}
      <div className="seg-pill" role="group" aria-label="Card side">
        {SIDE_ORDER.map((side) => (
          <button
            key={side}
            type="button"
            className="seg-pill__opt press text-scale-sm"
            aria-pressed={side === active}
            onClick={() => setActive(side)}
          >
            {SIDE_LABELS[side]}
          </button>
        ))}
      </div>

      {/* The screen's largest shape, and per the committed image it carries
          the 3D slab, not a flat outline. See .compose-card in cards.css.
          The bottom margin is the slab's own 14px, which a box-shadow does
          not reserve for itself. */}
      <label className="compose-card mb-3.5 flex min-h-[13rem] flex-col gap-2 border-2 border-border bg-card p-4">
        <span className="text-scale-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {SIDE_LABELS[active]}
        </span>
        <textarea
          className="min-h-[9rem] w-full flex-1 resize-none bg-transparent text-scale-lg font-semibold leading-snug text-card-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
          value={sides[active]}
          placeholder={SIDE_HINTS[active]}
          onChange={(event) => editSide(active, event.target.value)}
        />
      </label>

      {/* The fanned previews: the whole card at a glance while one side is
          being written. Buttons, so the fan is also the third way to switch. */}
      <div className="flex items-end justify-center gap-2 pt-1">
        {SIDE_ORDER.map((side) => (
          <button
            key={side}
            type="button"
            className={`side-fan__card press flex h-28 w-24 flex-col gap-1 rounded-xl border-2 p-2 text-left ${PREVIEW_TONE[side]} ${
              side === active ? "ring-2 ring-[color:var(--ring)]" : ""
            }`}
            style={{ "--fan-rot": `${PREVIEW_TILT[side]}deg` } as React.CSSProperties}
            onClick={() => setActive(side)}
            aria-label={`Edit the ${SIDE_LABELS[side].toLowerCase()} side`}
          >
            <span className="text-scale-xs font-bold">{SIDE_LABELS[side]}</span>
            <span className="line-clamp-4 whitespace-pre-line text-scale-xs leading-tight">
              {sides[side].trim().length > 0 ? sides[side] : "…"}
            </span>
          </button>
        ))}
      </div>

      {/* The three page dots the committed image draws under the fan. */}
      <div className="flex items-center justify-center gap-2" aria-hidden="true">
        {SIDE_ORDER.map((side) => (
          <span key={side} className={`page-dot ${side === active ? "page-dot--on" : ""}`} />
        ))}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
        <label className="flex flex-col gap-1">
          <span className="text-scale-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Save into
          </span>
          <select
            className="min-h-11 rounded-xl border border-border bg-card px-3 text-scale-base font-semibold text-card-foreground"
            value={deckChoice}
            onChange={(event) => {
              clearSaved();
              setDeckChoice(event.target.value);
            }}
          >
            {personalDecks.map((deck) => (
              <option key={deck.id} value={deck.id}>
                {deck.title}
              </option>
            ))}
            <option value={NEW_DECK}>New deck…</option>
          </select>
        </label>
        {deckChoice === NEW_DECK && (
          <input
            type="text"
            className="min-h-11 rounded-xl border border-border bg-card px-3 text-scale-base font-semibold text-card-foreground placeholder:font-normal placeholder:text-muted-foreground"
            placeholder="Name the new deck"
            value={newTitle}
            onChange={(event) => {
              clearSaved();
              setNewTitle(event.target.value);
            }}
            aria-label="New deck name"
          />
        )}
      </div>

      <button
        type="button"
        className="chip3d chip3d--primary press title-face min-h-14 w-full rounded-full text-scale-lg font-bold"
        disabled={blocked}
        onClick={save}
      >
        Save to deck
      </button>
      {/* The acknowledgement wins while it stands; see the note on clearSaved.
          role="status" so the save is announced, not only drawn. */}
      {savedInto !== null ? (
        <p className="text-center text-scale-sm font-semibold text-foreground" role="status">
          Saved to {savedInto}. Write another, or head back.
        </p>
      ) : (
        helper !== null && <p className="text-center text-scale-sm text-muted-foreground">{helper}</p>
      )}
    </div>
  );
}
