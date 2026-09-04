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
import { BackIcon, CheckIcon } from "./icons";
import { BACK_LABEL, PROGRESS_LABEL } from "./copy";
import "./onboarding.css";

/* ------------------------------------------------------------------ */
/* The page                                                            */
/* ------------------------------------------------------------------ */

export interface FrameProps {
  /** 0 to 100. The bar is visible from screen one, per the welcome image. */
  readonly percent: number;
  /** Null on the first step, where there is nowhere back to. */
  readonly onBack: (() => void) | null;
  readonly children: ReactNode;
  /** The pinned bottom band: the action, and any second action. */
  readonly foot: ReactNode;
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
 */

export function Frame({ percent, onBack, children, foot }: FrameProps) {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div className="ob">
      <div className="ob__head">
        <button
          type="button"
          className="ob-back"
          data-empty={onBack === null ? "true" : "false"}
          aria-label={BACK_LABEL}
          aria-hidden={onBack === null || undefined}
          tabIndex={onBack === null ? -1 : undefined}
          onClick={() => onBack?.()}
        >
          <BackIcon width={22} height={22} />
        </button>
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
          aria-label={PROGRESS_LABEL}
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
      <Berry
        className="ob-ask__berry"
        behaviour="idle"
        mood="happy"
        reducedMotion={reducedMotion}
        sizePx={berryPx}
      />
      <p className="ob-bubble">{line}</p>
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
        {label}
        {meta === null ? null : <span className="ob-chip__meta">{meta}</span>}
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
  readonly onPress: () => void;
}

export function Action({ label, disabled = false, onPress }: ActionProps) {
  return (
    <button type="button" className="ob-cta" disabled={disabled} data-stacking="" onClick={onPress}>
      {label}
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
      {label}
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
      {label}
    </button>
  );
}
