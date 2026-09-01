/**
 * The easy MCQ beat on screen, in the shape of the reference captures: a top
 * bar, a scrolling sheet, and one full width button pinned at the bottom that
 * never moves.
 *
 * WHY THIS COMPONENT HOLDS NO STATE AT ALL. It used to hold its own answer and
 * grade on the first tap, and a harsh review found what that costs: a scroll
 * fling mis-tap was an irreversible wrong answer with a mistake card toast
 * behind it. The pick / commit split that fixes it lives in session.ts, where a
 * test can hold it, because the web suite runs in a node environment with no
 * DOM and any rule that lives in JSX is a rule nothing can test. So this file
 * is a controlled component: every value it renders arrives as a prop and every
 * gesture leaves as a callback. If you are debugging a wrong verdict at 1am, it
 * is not in this file. McqRunner.tsx is the piece that owns the session.
 *
 * THE THREE THINGS THE REFERENCE CAPTURES SHOW AND THE FIRST ATTEMPT MISSED.
 *
 *   1. PICK, THEN PRESS. "fill in the blank.png" and the how_to capture both
 *      put a full width CHECK under the options, and in the how_to capture it
 *      is visibly inactive because nothing is picked yet. A tap selects; the
 *      button commits. Selecting is free and changeable.
 *
 *   2. THE BUTTON DOES NOT MOVE. "short explanation.png" puts CONTINUE in the
 *      same full bleed slot at the bottom of the sheet that CHECK occupied,
 *      after an explanation that can be several lines. Here that is a sticky
 *      action bar rather than the last child of a growing column, so the way
 *      forward is in the same place before and after the answer. `pb-safe` is
 *      theme.css's safe area inset, so it clears the home indicator too.
 *
 *   3. THE TOP BAR CARRIES AN EXIT AND A FLAG. The reference shows X, a
 *      progress bar, a flag and a currency count on every question. A student
 *      who meets a confusing authored beat needs a way out and a way to say so;
 *      a level chip and a diamond count are not those.
 *
 * NO RED ON THIS SCREEN, the rule lesson/Feedback.tsx already set: the student
 * is learning, not being marked down. The answer is marked with `--good` and
 * the option they committed is marked with the soft primary card, both theme
 * tokens, so both themes are correct without this file knowing which is on.
 *
 * CONTRAST. The options that were neither the answer nor the pick are pushed
 * back with the `bg-muted` surface and nothing else. They used to carry
 * `opacity-70` on top of `text-muted-foreground`, which blends to 3.59:1 in
 * light and 4.05:1 in dark, both under the 4.5:1 body floor the Budgets table
 * fixes. De-emphasis comes from the surface, never from thinning the ink.
 *
 * KEYBOARD. The options stay focusable after the answer, marked `aria-disabled`
 * with the handler returning early, rather than `disabled`. A disabled element
 * leaves the tab order, and the element the student just activated leaving the
 * tab order dumps focus to the document and makes them Tab the whole page to
 * reach Continue. That is the same reason focus moves to the explanation when
 * it appears: it is one Tab from there to the button, and a screen reader hears
 * the explanation rather than a silent jump.
 *
 * `moleculeId` on a McqBeat is ignored here, and no beat in content.ts sets
 * one. A question needing a drawn structure needs the renderer, which is
 * another surface's; every question in this beat is answerable from its words.
 */

import { useEffect, useRef } from "react";

import { Press } from "../../app/ui/Press";
import { Berry } from "../../mascot/Berry";
import { masteryLabel, type MasteryLevel, type McqBeat } from "../types";
import { revealHeading, type McqReveal } from "./grade";
import type { McqProgress } from "./session";

export interface McqBeatViewProps {
  readonly beat: McqBeat;
  readonly level: MasteryLevel;
  /** The option under the finger. Not yet an answer. Null before the first tap. */
  readonly selectedId: string | null;
  /** The graded result, or null while the student is still picking. */
  readonly reveal: McqReveal | null;
  readonly progress: McqProgress;
  /** "Check" before the commit, "Continue" after. From session.commitLabel. */
  readonly primaryLabel: string;
  /** Whether the one button is live. Inactive with nothing picked, per the how_to capture. */
  readonly primaryEnabled: boolean;
  /** Commit the pick, or move on once it is committed. One slot, one handler. */
  readonly onPrimary: () => void;
  readonly onSelect: (optionId: string) => void;
  /** The X. Leaves the run without recording anything for this beat. */
  readonly onExit: () => void;
  /** The flag. Says this beat reads wrong or unclear. */
  readonly onReport: () => void;
  /** Whether this beat has already been flagged, so the bar can say it landed. */
  readonly reported: boolean;
  /**
   * The one line how to strip, in the shape of the reference capture where a
   * mascot says what this kind of question wants. Defaults to on at L0, the
   * first meeting and the only rung where it is news.
   */
  readonly showHowTo?: boolean;
  readonly reducedMotion?: boolean;
}

const HOW_TO_PICKING = "Pick one, then press Check. You can change your mind as many times as you like first.";
const HOW_TO_REVEALED = "Read the reason, then press Continue. Nothing here is timed.";

export function McqBeatView({
  beat,
  level,
  selectedId,
  reveal,
  progress,
  primaryLabel,
  primaryEnabled,
  onPrimary,
  onSelect,
  onExit,
  onReport,
  reported,
  showHowTo,
  reducedMotion = false,
}: McqBeatViewProps) {
  const answered = reveal !== null;
  const howTo = showHowTo ?? level === 0;
  const revealRef = useRef<HTMLElement | null>(null);

  // Move focus to the explanation the frame it appears. The React pattern is a
  // ref plus an effect keyed on the thing that changed, which is the ordinary
  // way to touch a DOM node after render. It is here so a keyboard or switch
  // user hears the explanation and is one Tab from the button, instead of being
  // dropped on the document because the option they pressed left the tab order.
  useEffect(() => {
    if (reveal !== null) revealRef.current?.focus();
  }, [reveal]);

  const choose = (optionId: string) => {
    if (answered) return;
    onSelect(optionId);
  };

  return (
    <div className="mcq-sheet mx-auto flex h-full max-h-full w-full max-w-xl flex-col">
      {/* The top bar, per the reference: a way out, how far along, a way to
          report, and the reward count. Fixed height so nothing below it moves. */}
      <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-2 md:px-6">
        <button
          type="button"
          onPointerDown={onExit}
          aria-label="Leave this lesson"
          title="Leave this lesson"
          className="press flex min-h-11 min-w-11 items-center justify-center rounded-full border-2 border-border text-scale-lg font-semibold text-muted-foreground"
        >
          &#10005;
        </button>

        <div
          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-label="Questions answered"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.answered}
        >
          <div
            className="h-full rounded-full bg-primary"
            style={{
              width: `${Math.round(progress.fraction * 100)}%`,
              transition: reducedMotion ? "none" : "width 220ms cubic-bezier(0.4, 0, 0.2, 1)",
            }}
          />
        </div>

        <button
          type="button"
          onPointerDown={onReport}
          aria-label={reported ? "You reported this question" : "Report this question"}
          aria-pressed={reported}
          title={reported ? "You reported this question" : "Report this question"}
          className={`press flex min-h-11 min-w-11 items-center justify-center rounded-full text-scale-base ${
            reported ? "text-primary-ink" : "text-muted-foreground"
          }`}
        >
          &#9873;
        </button>

        {beat.diamonds !== undefined ? (
          <span className="text-scale-sm font-semibold text-diamond-ink" aria-label={`${beat.diamonds} diamonds`}>
            {beat.diamonds}
          </span>
        ) : null}
      </div>

      {/* Everything that can grow lives in the one scrolling region, so the
          action bar below it is the only fixed thing on the screen. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4 md:px-6">
        {reported ? (
          <p className="fade-in rounded-2xl border border-border bg-muted px-3 py-2 text-scale-sm text-muted-foreground">
            Thanks, this one is flagged for review. Carry on when you are ready.
          </p>
        ) : null}

        {howTo ? (
          // Rendered at every stage rather than unmounted on answer. Unmounting
          // it was pulling the option list up under the student's finger at the
          // exact frame they tapped; the line changes, the row stays.
          <div className="flex items-center gap-3">
            <Berry mood="curious" sizePx={44} reducedMotion={reducedMotion} />
            <p className="flex min-h-13 items-center rounded-2xl border border-border bg-card px-3 py-2 text-scale-sm text-muted-foreground">
              {answered ? HOW_TO_REVEALED : HOW_TO_PICKING}
            </p>
          </div>
        ) : null}

        <div>
          <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-scale-xs font-semibold text-muted-foreground">
            {masteryLabel(level)}
          </span>
          <h2 className="title-face mt-2 text-scale-xl font-semibold text-foreground">{beat.prompt}</h2>
          {beat.brief !== undefined ? (
            <p className="mt-1 text-scale-sm text-muted-foreground">{beat.brief}</p>
          ) : null}
        </div>

        {/* A group of aria-pressed buttons rather than a radiogroup: a real
            radiogroup needs roving tabindex and arrow key handling, and this
            list is four items a student taps. Boring beats clever here. */}
        <div role="group" aria-label="Answer options" className="flex flex-col gap-2">
          {beat.options.map((option) => {
            const isAnswer = option.id === beat.correctOptionId;
            const isSelected = selectedId === option.id;

            let tone = "border-border bg-card text-foreground";
            if (!answered && isSelected) tone = "border-primary bg-primary/10 text-foreground";
            else if (answered && isAnswer) tone = "border-good/50 bg-good-soft text-good-ink";
            else if (answered && isSelected) tone = "border-primary/40 bg-primary/5 text-foreground";
            // De-emphasis is a surface change, never a thinner ink: opacity here
            // fails the AA contrast floor in both themes.
            else if (answered) tone = "border-border bg-muted text-muted-foreground";

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option.id)}
                aria-disabled={answered || undefined}
                aria-pressed={isSelected}
                className={`press flex min-h-14 w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left text-scale-base font-medium ${tone}`}
              >
                <span>{option.text}</span>
                {answered && isAnswer ? (
                  <span className="shrink-0 text-scale-sm font-semibold">answer</span>
                ) : !answered && isSelected ? (
                  <span aria-hidden className="shrink-0 text-scale-sm font-semibold text-primary-ink">
                    picked
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {reveal !== null ? (
          // The short explanation, in the shape of the reference capture: the
          // claim in full weight, then one muted line under it.
          <section
            ref={revealRef}
            tabIndex={-1}
            aria-live="polite"
            className={`fade-in rounded-2xl border p-4 outline-none ${
              reveal.matchedAnswer ? "border-good/40 bg-good-soft" : "border-primary/30 bg-primary/5"
            }`}
          >
            <h3
              className={`text-scale-base font-semibold ${
                reveal.matchedAnswer ? "text-good-ink" : "text-foreground"
              }`}
            >
              {revealHeading(reveal)}
            </h3>
            <p className="mt-2 text-scale-sm text-foreground">{reveal.chosenWhy}</p>
            {!reveal.matchedAnswer ? (
              <p className="mt-2 text-scale-sm text-muted-foreground">
                <span className="font-semibold text-foreground">{reveal.answerText}. </span>
                {reveal.answerWhy}
              </p>
            ) : null}
          </section>
        ) : null}
      </div>

      {/* The one slot the way forward always lives in. Sticky as well as last
          in a flex column, so it stays put whether this sheet has a bounded
          height of its own or scrolls with the page around it. */}
      <div className="pb-safe sticky bottom-0 shrink-0 border-t border-border bg-card px-4 pt-3 pb-3 md:px-6">
        <Press className="w-full" disabled={!primaryEnabled} onClick={onPrimary}>
          {primaryLabel}
        </Press>
      </div>
    </div>
  );
}
