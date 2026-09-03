/**
 * The node sheet: what a tapped pathway node offers, before anything starts.
 *
 * Reference: blueberry_r5-node-sheet-v2_1788286114.png. Drag-handle grabber,
 * rounded top, a Practice card with difficulty pips and the violet 3D START,
 * a Challenge card with the stopwatch and the transition-state double dagger,
 * a hamburger in the corner to the guidebook, and the mascot peeking over the
 * sheet edge. Per docs/DESIGN-GOALS.md there is no separate Concept row; the
 * guidebook is the concept surface.
 *
 * WHY A NATIVE <dialog>. Modality, focus trapping, Escape and the top layer
 * are the browser's; hand rolling those is three bugs. Same call and the same
 * reasoning as ChargeGate.tsx, LanguagePicker.tsx and Hud.tsx.
 *
 * WHO HOLDS THE NODE. The caller. The sheet renders whatever SheetNode it is
 * handed and owns no pathway knowledge, exactly as the Charge sheet owns no
 * pathway knowledge: which node was tapped is the track's business. START and
 * Challenge only call back; anything that costs charge stays behind the
 * Charge sheet the integrator opens next, so this component touches no
 * economy state at all.
 *
 * THE PRESS IS ACKNOWLEDGED ON POINTER DOWN. Callbacks fire on onPointerDown,
 * with onClick as the keyboard path (Enter and Space produce no pointer
 * event), and preventDefault so a wrapping form or anchor cannot race it.
 * A pointer activation is followed by a click for the same gesture, so
 * callbacks must be idempotent per activation; the pathway's enterHandlers
 * set the same contract and setState-shaped callers meet it for free.
 */

import { useEffect, useRef } from "react";
import { Berry } from "../mascot/Berry";
import { nodeSheetModel, type SheetNode } from "./nodeSheetModel";
import "./pathway-sheet.css";

/** The pointer-down-first activation pair. See the header note on idempotence. */
function pressHandlers(act: () => void) {
  return {
    onPointerDown: () => act(),
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      act();
    },
  };
}

/** Small molecule glyph for the badge beside the title. Decoration. */
function MoleculeGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M7 8.5l5-3 5 3v6l-5 3-5-3z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="7" cy="8.5" r="2" fill="currentColor" />
      <circle cx="17" cy="14.5" r="2" fill="currentColor" />
    </svg>
  );
}

function HamburgerGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M4.5 7h15M4.5 12h15M4.5 17h15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function StopwatchGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <circle cx="12" cy="13.5" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M10 3.5h4M12 3.5v3M12 13.5l3-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/** The enabled Challenge card's forward affordance; see .ns-card--go. */
function ChevronGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M9.5 5.5L16 12l-6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden>
      <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The difficulty row: one accessible label, never four unnamed dots. */
function Pips({ filled, total, label }: { readonly filled: number; readonly total: number; readonly label: string }) {
  const dots = [];
  for (let i = 0; i < total; i += 1) {
    dots.push(<span key={i} className={`ns-pip${i < filled ? " is-filled" : ""}`} />);
  }
  return (
    <span className="ns-pips" role="img" aria-label={label}>
      {dots}
    </span>
  );
}

export interface NodeSheetProps {
  /** The node being looked at, or null when the sheet is closed. */
  readonly node: SheetNode | null;
  readonly onClose: () => void;
  /** Practice START. The integrator routes this into the Charge sheet. */
  readonly onStart: (node: SheetNode) => void;
  /** The timed run. Enabled by the model only after a first clear. */
  readonly onChallenge: (node: SheetNode) => void;
  /** The hamburger. The integrator routes this to the Guidebook page. */
  readonly onGuidebook: (node: SheetNode) => void;
  readonly reducedMotion: boolean;
}

export function NodeSheet({ node, onClose, onStart, onChallenge, onGuidebook, reducedMotion }: NodeSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const model = node === null ? null : nodeSheetModel(node);

  // The dialog element mounts once and opens or closes as the node comes and
  // goes, the same lifecycle ChargeGate uses: showModal cannot be declared in
  // JSX, so an effect reconciles the prop onto the element.
  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (node !== null && !dialog.open) dialog.showModal();
    if (node === null && dialog.open) dialog.close();
  }, [node]);

  return (
    <dialog
      ref={ref}
      className="ns-sheet"
      aria-label={model === null ? "Lesson" : model.label}
      data-node-state={node === null ? "closed" : node.state}
      onClose={onClose}
      onClick={(event) => {
        // The dialog element is the whole viewport; the panel inside is not.
        if (event.target === ref.current) onClose();
      }}
    >
      {model === null || node === null ? null : (
        <div className="ns-panel">
          <span className="ns-grabber" aria-hidden />

          <header className="ns-head">
            <span className="ns-badge" aria-hidden>
              <MoleculeGlyph />
            </span>
            <div className="ns-head__text">
              <h2 className="title-face text-scale-xl font-bold leading-tight">{node.title}</h2>
              <p className="ns-kind text-scale-xs font-semibold">
                {model.kindLabel}
                {model.cleared ? (
                  <span className="ns-cleared text-scale-xs">
                    <CheckGlyph />
                    Cleared
                  </span>
                ) : null}
              </p>
            </div>
            <button type="button" className="ns-menu press" aria-label={model.guidebookLabel} {...pressHandlers(() => onGuidebook(node))}>
              <HamburgerGlyph />
            </button>
          </header>

          <section className="ns-card" aria-label={`Practice. ${model.pips.label}.`}>
            <div className="ns-card__row">
              <h3 className="title-face text-scale-lg font-bold">Practice</h3>
              <Pips filled={model.pips.filled} total={model.pips.total} label={model.pips.label} />
            </div>
            <p className="text-scale-sm text-muted-foreground">{node.blurb}</p>
            {model.practice.enabled ? (
              <button type="button" className="ns-start title-face text-scale-base" {...pressHandlers(() => onStart(node))}>
                START
              </button>
            ) : (
              <p className="ns-note text-scale-sm">{model.practice.note}</p>
            )}
          </section>

          {model.challenge.enabled ? (
            <button
              type="button"
              className="ns-card ns-card--go"
              aria-label={`Challenge. A timed run of ${node.title}.`}
              {...pressHandlers(() => onChallenge(node))}
            >
              <div className="ns-card__row">
                <h3 className="title-face text-scale-lg font-bold">Challenge</h3>
                <span className="ns-card__end">
                  <span className="ns-marks" aria-hidden>
                    <StopwatchGlyph />
                    <span className="ns-dagger">‡</span>
                  </span>
                  <span className="ns-go" aria-hidden>
                    <ChevronGlyph />
                  </span>
                </span>
              </div>
              <p className="text-scale-sm text-muted-foreground">Same chemistry, against the clock.</p>
            </button>
          ) : (
            <section className="ns-card ns-card--flat" aria-label="Challenge">
              <div className="ns-card__row">
                <h3 className="title-face text-scale-lg font-bold">Challenge</h3>
                <span className="ns-marks" aria-hidden>
                  <StopwatchGlyph />
                  <span className="ns-dagger">‡</span>
                </span>
              </div>
              <p className="ns-note text-scale-sm">{model.challenge.note}</p>
            </section>
          )}

          {/* The peek: cropped by its wrapper so only the head clears the
              sheet's bottom edge. Decorative; the sheet's meaning is above. */}
          <div className="ns-peek" aria-hidden>
            <span className="ns-peek__b">
              <Berry mood="curious" reducedMotion={reducedMotion} sizePx={88} />
            </span>
          </div>
        </div>
      )}
    </dialog>
  );
}
