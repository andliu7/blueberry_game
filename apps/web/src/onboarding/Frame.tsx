/**
 * THE SHARED FRAME. Built first, on purpose, because it is the deliverable.
 *
 * The three committed goal images (blueberry_r9-onboard-welcome, -question and
 * -placement) draw one screen three times: a fat progress bar filling green
 * across the top, a mascot asking from a speech bubble, big option chips with a
 * picked state, and a full width action pinned to the bottom that is off until
 * a choice is made. Seven steps share that; nothing below re-lays it out.
 *
 * WHAT IS IN HERE AND WHAT IS NOT. This module owns the frame and the two chip
 * families. It owns no flow: it never reads the hash, never writes progress,
 * and holds no answer. The step components pass what to draw and what to do,
 * which is what lets flow.ts stay pure and testable and lets this stay a set of
 * presentational components with no branching to get wrong.
 *
 * THE PRESS, and this is the contract that matters most: every control here
 * acknowledges on POINTER DOWN. The acknowledgement is `:active` in
 * onboarding.css, which the browser paints the same frame the pointer lands
 * with no JavaScript in the path, so it cannot miss the 100 ms budget however
 * slow the handler behind it is. That is also why the ACT is on `onClick` and
 * never on `onPointerDown` for anything that navigates: pointer down is the
 * acknowledgement, click is the commitment, and a control that navigates on
 * pointer down cannot be cancelled by sliding off it, which is the one gesture
 * a student has for changing their mind.
 *
 * (The file this replaces navigated on `onPointerDown`. That read as honouring
 * the press contract and was actually the opposite: it made the press and the
 * act the same event, so there was no acknowledgement left to see.)
 */

import type { ReactNode } from "react";
import { Berry } from "../mascot/Berry";
import { BackIcon, CheckIcon, CloseIcon } from "./icons";
import { BACK_LABEL, LEAVE_LABEL, PROGRESS_LABEL, withoutMark } from "./copy";
import "./onboarding.css";

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export interface FrameProps {
  /** 0 to 100. The bar is visible from screen one, per the welcome image. */
  readonly percent: number;
  /** Null on the first step, where there is nowhere back to. */
  readonly onBack: (() => void) | null;
  /**
   * WHICH MARK THE LEADING CONTROL DRAWS, and it is not a style choice.
   * blueberry_r9-onboard-question draws a chevron and
   * blueberry_r9-onboard-placement draws an X. A chevron says "one question
   * back"; an X says "out of this". The placement is the only step a student
   * may want to leave as a whole, so it is the only one that asks for "leave".
   */
  readonly leading?: "back" | "leave";
  readonly children: ReactNode;
  /** The pinned bottom band: the action, and any second action. */
  readonly foot: ReactNode;
  /**
   * A FULL BLEED DECORATION BEHIND THE PAGE, and it exists because a negative
   * margin could not do the job.
   *
   * The welcome image draws the rise running off both screen edges with only
   * its top curve visible. The previous pass tried that with
   * `width: calc(100% + 2rem); margin-left: -1rem` on an element inside
   * `.ob__body`, and it arrived as a rectangle with three hard edges: the body
   * carries `overflow-y: auto` so its overflow-x computes to `auto` too, and
   * the bleed was clipped at the content box. CSS has no way to overflow one
   * axis of a scroll container.
   *
   * So the backdrop is a SIBLING of the scrolling body rather than a child of
   * it, absolutely positioned against `.ob` (which never scrolls) and painted
   * behind everything. Nothing about it is in flow, so it cannot push the
   * action off the screen either.
   */
  readonly backdrop?: ReactNode;
}

/*
 * THERE IS NO COUNTER PILL, and its absence is a decision rather than an
 * omission. blueberry_r9-onboard-placement draws a small empty grey pill at
 * the right end of the bar AND the line "Question 4 of 8 - placement" under
 * it. Only the second of those carries any text, so it is the one that says
 * the count; an earlier draft of this frame rendered both and told a student
 * the same number twice. The pill in the image reads as the charge meter that
 * lives in the app header, and onboarding has no charge to show, so drawing a
 * pill there would be an empty chrome element pretending to be a meter.
 *
 * THERE IS NO [HUMAN GATE] STAMP EITHER, AND THAT IS A REVERSAL. A previous
 * pass drew the mark once per screen at the end of the header row. Measured,
 * it took 79px plus its gaps out of a 358px header, which is why the progress
 * bar rendered at 55 percent of the frame instead of the ~76 percent all three
 * goal images draw, and none of the three images draws anything at all to the
 * right of the bar on the welcome or question screens. The gate declaration
 * did not move out of the product, it moved out of the CHROME: every string in
 * copy.ts still carries HUMAN_GATE_MARK, ALL_DRAFT_LINES still holds every one
 * of them, and onboardingFlow.test.ts still fails if a line slips out unmarked.
 * The mark is for the owner and for a critic reading the source, and it was
 * costing the student the one element that appears on all seven steps.
 */

export function Frame({ percent, onBack, leading = "back", children, foot, backdrop }: FrameProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  const leave = leading === "leave";
  return (
    <div className="ob">
      {backdrop === undefined ? null : <div className="ob__backdrop">{backdrop}</div>}
      {/*
        THE LEADING CONTROL IS A CHILD OF `.ob`, NOT OF THE HEADER ROW, and the
        nesting is the whole point rather than an accident of markup. It is
        absolutely positioned into the page GUTTER so it sits at the screen
        edge beside the bar without taking any width out of it, and an absolute
        box resolves against its nearest positioned ancestor: inside
        `.ob__head` that would be the header's content box, which starts after
        the gutter, and the control landed inside the column instead of beside
        it. Out here `.ob` is the containing block and the gutter is reachable.
      */}
      <button
        type="button"
        className="ob-back"
        data-empty={onBack === null ? "true" : "false"}
        aria-label={withoutMark(leave ? LEAVE_LABEL : BACK_LABEL)}
        aria-hidden={onBack === null || undefined}
        tabIndex={onBack === null ? -1 : undefined}
        onClick={() => onBack?.()}
      >
        {leave ? <CloseIcon width={22} height={22} /> : <BackIcon width={22} height={22} />}
      </button>
      <div className="ob__head">
        {/*
          A real progressbar role, so the percent reaches a screen reader even
          though the goal images carry no numeral on the track. The welcome
          draft prints "5%" inside the bar and the question draft prints
          nothing; the question image is what MANIFEST.md names as the lock on
          the SHARED FRAME, so the frame follows it and the number lives here,
          where it is available without being a second thing to read.
        */}
        <div
          className="ob-bar"
          role="progressbar"
          aria-label={withoutMark(PROGRESS_LABEL)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(clamped)}
        >
          <div className="ob-bar__fill" style={{ width: `${clamped}%` }} />
        </div>
      </div>
      <div className="ob__body">{children}</div>
      <div className="ob__foot">{foot}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The mascot asks                                                     */
/* ------------------------------------------------------------------ */

export interface AskProps {
  readonly line: string;
  readonly reducedMotion: boolean;
  /** The berry's size. The question image draws it small beside the bubble. */
  readonly berryPx?: number;
}

/**
 * Berry, then the bubble. Exactly one mascot instance per screen: the sticker
 * audit's rule 10 scores a second one, and the pathway goals say the same thing
 * in prose ("there is exactly ONE Berry on screen").
 */
export function Ask({ line, reducedMotion, berryPx = 76 }: AskProps) {
  return (
    <div className="ob-ask">
      {/* EYES OPEN. blueberry_r9-onboard-question draws Berry watching the
          student with round open eyes, which is the `curious` mood; `happy`
          renders the kind closed-eye smile, which reads as Berry pleased with
          himself rather than Berry waiting for an answer. The mascot itself is
          imported and never redrawn (D4), so matching the image is a matter of
          asking it for the right face. */}
      <Berry
        className="ob-ask__berry"
        behaviour="idle"
        mood="curious"
        reducedMotion={reducedMotion}
        sizePx={berryPx}
      />
      <p className="ob-bubble">{withoutMark(line)}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The option chip                                                     */
/* ------------------------------------------------------------------ */

export interface ChipProps {
  readonly picked: boolean;
  readonly onPick: () => void;
  readonly icon?: ReactNode;
  readonly label: string;
  /** A second line under the label. The goal step's XP and charge line. */
  readonly meta?: string | null;
}

/**
 * The big option chip of the question image: icon, label, and a check that
 * appears when it is picked.
 *
 * `aria-pressed` is both the accessible state and the CSS hook, so the picked
 * outline cannot drift away from what a screen reader is told. `data-stacking`
 * is the sticker audit's opt-in for the stacked edge (a solid box-shadow with
 * no blur, offset only on Y), which is BUTTON-MECHANICS' construction and not
 * the drop shadow rule 3 bans.
 */
export function Chip({ picked, onPick, icon, label, meta = null }: ChipProps) {
  return (
    <button
      type="button"
      className="ob-chip"
      aria-pressed={picked}
      data-stacking=""
      onClick={onPick}
    >
      {icon === undefined ? null : <span className="ob-chip__icon">{icon}</span>}
      <span className="ob-chip__label">
        {withoutMark(label)}
        {meta === null ? null : <span className="ob-chip__meta">{withoutMark(meta)}</span>}
      </span>
      {picked ? <CheckIcon className="ob-chip__check" /> : null}
    </button>
  );
}

/** The chip list. Two columns only where the layout actually reads; see flow.ts. */
export function ChipList({ grid = false, children }: { readonly grid?: boolean; readonly children: ReactNode }) {
  return <ul className={grid ? "ob-options ob-options--grid" : "ob-options"}>{children}</ul>;
}

/* ------------------------------------------------------------------ */
/* The actions                                                         */
/* ------------------------------------------------------------------ */

export interface ActionProps {
  readonly label: string;
  /** CONTINUE is gated on a choice. Disabled is a state, never a hidden button. */
  readonly disabled?: boolean;
  /**
   * THE PRIMARY ACTION IS A ROUNDED RECTANGLE ALMOST EVERYWHERE, and a stadium
   * on exactly one screen. blueberry_r9-onboard-question draws CONTINUE and
   * blueberry_r9-onboard-placement draws CHECK as rectangles with a corner
   * radius around 12 to 14 CSS pixels; only blueberry_r9-onboard-welcome draws
   * GET STARTED as a full stadium. A previous pass used 9999px for all three,
   * which matched one image out of three. The default is therefore the
   * majority shape and the welcome beat opts into the other one.
   */
  readonly shape?: "rect" | "stadium";
  readonly onPress: () => void;
}

export function Action({ label, disabled = false, shape = "rect", onPress }: ActionProps) {
  return (
    <button
      type="button"
      className="ob-cta"
      data-shape={shape}
      disabled={disabled}
      data-stacking=""
      onClick={onPress}
    >
      {withoutMark(label)}
    </button>
  );
}

/**
 * SKIP, drawn as the button taxonomy draws it: an outlined violet stadium with
 * no fill (`blueberry_spec-button-types`, the `skip` entry). It is a real
 * button because skipping is a real choice a student makes, and the goals put
 * it in the same row as start, check and continue rather than in a footnote.
 */
export function SkipAction({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <button type="button" className="ob-skip" onClick={onPress}>
      {withoutMark(label)}
    </button>
  );
}

/**
 * The underlined link under the welcome beat's action: "I already have an
 * account". Deliberately NOT the skip treatment above. This one leaves the
 * flow entirely, so it is drawn quieter than any control inside the flow, and
 * blueberry_r9-onboard-welcome draws it as underlined text for that reason.
 */
export function QuietAction({ label, onPress }: { readonly label: string; readonly onPress: () => void }) {
  return (
    <button type="button" className="ob-quiet" onClick={onPress}>
      {withoutMark(label)}
    </button>
  );
}
