/**
 * The Charge sheet: what a node costs, said before anything is spent.
 *
 * WHY A SHEET AND NOT A SCREEN. mobile-ui's rule for an in-context choice: a
 * bottom sheet keeps the student where they were. Tapping a node on the pathway
 * and being thrown to a full page about a currency is a context switch for a
 * question that takes one line to answer, and the answer is usually yes. So the
 * track stays visible behind it on the phone, and on a wide viewport the panel
 * centres because there is no bottom edge worth anchoring to.
 *
 * WHY A NATIVE <dialog>. Modality, focus trapping, Escape and the top layer are
 * the browser's. Hand rolling those is three bugs; `showModal()` is none. Same
 * call and the same reasoning as LanguagePicker.tsx and Hud.tsx.
 *
 * THE THREE STATES THE PIECE IS, and the fourth that has to exist:
 *
 *   ready  The cost is DRAWN as the pips that are about to go, and written once
 *          underneath. Pressing Start commits: the doomed pips extinguish right
 *          to left, Bloom's halo thins to the new level, the number counts down,
 *          and only then does the route change. The animation is the receipt.
 *   empty  Bloom flat grey and sleepy, the meter dark with the next point
 *          visibly filling, when it lands and when the meter is full again, and
 *          the free way out as the PRIMARY action, because it is true.
 *   exam   The meter is REPLACED by a band that says there is no meter. Drawing
 *          it full would still be drawing a meter, and the claim is that this
 *          fortnight has none.
 *   free   Review, tutorial and intro cost nothing, ever. The meter is drawn
 *          untouched and the sheet says why it is free in that kind's own words.
 *
 * EVERY NUMBER IS READ. docs/ECONOMY.md, Anti-abuse: "The client animates what
 * the server concluded." The cost comes from `chargeCostFor` in the economy
 * package, the balance and the regeneration come off `deriveEconomy`, and the
 * spend is an appended event whose consequences are derived, never assigned.
 * Nothing on this sheet is added up here.
 *
 * THE PRESS IS THE COMMIT. CLAUDE.md: the pressed state renders on pointer down
 * before any work happens. Start spends on `onPointerDown`, so the first frame
 * of the halo thinning and the first frame of the pressed state are the same
 * frame. Under reduced motion the spend still happens on that press and the
 * route changes immediately: the settled frame is the destination.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { deriveEconomy, type EconomySnapshot } from "@blueberry/economy";
import { Berry } from "../mascot/Berry";
import { DiamondMark } from "../app/ui/HudIcons";
import { economyOptions, progress } from "../app/progress";
import { useProgress } from "../app/hooks";
import { navigate } from "../app/useHashRoute";
import { hrefForReview } from "../app/routes";
import { chargeGateModel, type ChargeGateModel, type ChargeGateNode } from "./chargeGateModel";
import "./charge.css";

/**
 * How often the sheet re-derives while it is open and nothing has been pressed.
 *
 * A second, because the empty state carries a countdown to the next point and a
 * countdown that does not count is a screenshot. The derivation is pure
 * arithmetic over a short journal, and it stops the moment the student commits:
 * see `phase`, which freezes the model so the numbers the animation is playing
 * cannot move under it.
 */
const TICK_MS = 1000;

/**
 * How long the commit holds the sheet before the route changes.
 *
 * Long enough for the drain to finish and be READ: the doomed pips go out over
 * about 500 ms including their stagger and the halo thins over 620, so a second
 * lands the student on the settled frame rather than cutting the receipt off
 * mid animation. It is skipped entirely under reduced motion, and skipped for a
 * free node, where there is nothing to animate and a wait would be theatre.
 */
const COMMIT_MS = 1000;

/** Where "Review drills are always free" goes. Named by the route table, never typed here. */
export const REVIEW_HREF = hrefForReview();

type Phase = "idle" | "spending";

/**
 * Go where the node points, whatever shape its href is.
 *
 * Two shapes exist on the pathway and only one of them is a hash. A beat is
 * "#/lesson/u3-directing"; a trainer deep link is "?reaction=seq-eas#/trainer",
 * a query AND a hash, because the trainer reads its subject from the search
 * string. `navigate` assigns to location.hash, so handing it the second shape
 * produces "#?reaction=seq-eas#/trainer", which routes to the trainer's default
 * demo and silently loses the reaction the student pressed.
 *
 * This was invisible while the node was a plain anchor, because the browser
 * resolved the href itself. Interposing a sheet made the shell responsible for
 * the navigation, so the shell has to handle both: a hash goes through the
 * router, and anything else is resolved the way the anchor would have.
 */
function go(href: string): void {
  if (href.startsWith("#")) {
    navigate(href);
    return;
  }
  window.location.assign(href);
}

/**
 * The economy against the wall clock, with the store's own course denominator.
 *
 * `economyOptions` hands back the cached universe the pathway and the header
 * both use, so three surfaces reading one journal cannot report three balances.
 * progress.ts's header says exactly why that is not optional.
 */
function useLiveEconomy(live: boolean): EconomySnapshot {
  const snapshot = useProgress();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!live) return;
    const id = window.setInterval(() => setTick((n) => n + 1), TICK_MS);
    return () => window.clearInterval(id);
  }, [live]);
  const { journal, course } = snapshot;
  // `tick` is the point of the hook: it makes the wall clock an input rather
  // than something read once at mount.
  return useMemo(
    () => deriveEconomy(journal, new Date().toISOString(), economyOptions(course)),
    [journal, course, tick],
  );
}

/** The tick under the promise line. Not a decoration: it is the mark for "this is true". */
function CheckMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        d="M5 12.5l4.5 4.5L19 7.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The meter, drawn as its units, with three kinds of pip.
 *
 * The header's coach mark already draws thirty pips with the next one filling;
 * this is that row with one thing added, and the addition is the whole piece:
 * the pips that are ABOUT to be spent are drawn differently from the ones that
 * are staying. A student can see which end of the meter is leaving before they
 * commit, which a single bar cannot say at any width.
 *
 * On commit the leaving pips go out from the right, 30 ms apart, so the meter
 * visibly drains rather than jumping to a smaller number between two frames.
 *
 * `aria-hidden` with the count on the wrapper: a screen reader wants "22 of 30
 * charge, 8 leaving", not thirty list items.
 */
function ChargeStrip({ model, phase }: { readonly model: ChargeGateModel; readonly phase: Phase }) {
  const { before, after, cap, refill } = model;
  const pips = [];
  for (let i = 0; i < cap; i += 1) {
    const leaving = i >= after && i < before;
    const lit = i < before && !(leaving && phase === "spending");
    // The one point on its way back, in the empty state only. It is filled to
    // however far the wall clock has carried it.
    const next = refill !== null && i === before && refill.nextFraction > 0;
    pips.push(
      <span
        key={i}
        className={`charge-pip${lit ? " is-lit" : ""}${leaving ? " is-leaving" : ""}${next ? " is-next" : ""}`}
        style={
          {
            "--i": i,
            // Rightmost leaves first, so the row drains toward the number that
            // is left rather than eating into it.
            "--out": Math.max(0, before - 1 - i),
            "--next": refill === null ? 0 : refill.nextFraction.toFixed(3),
          } as CSSProperties
        }
      />,
    );
  }
  const label =
    model.cost > 0 && model.state === "ready"
      ? `${before} of ${cap} charge, ${model.cost} leaving`
      : `${before} of ${cap} charge`;
  return (
    <span className="charge-strip" role="img" aria-label={label}>
      {pips}
    </span>
  );
}

/**
 * What stands where the meter stood, inside the exam window.
 *
 * docs/ECONOMY.md switches Charge off completely for the fortnight before the
 * exam and calls that "the whole ethical argument for the mechanic in one
 * gesture". A meter drawn full is still a meter, and a student reading one
 * still counts. So the row of units is not rendered at all: a solid band in the
 * app's own purple takes its place, which is a different KIND of object rather
 * than a fuller version of the same one.
 */
function ExamBand() {
  return (
    <span className="charge-exam-band" role="img" aria-label="Charge is off until your exam">
      <span className="charge-exam-glyph" aria-hidden>
        ∞
      </span>
      {/* A METER'S READOUT, not a sentence. The band stands in the meter's
          slot, so it says what the meter would have said, in the uppercase
          tracked register the HUD's own "CHARGE" caption uses and no button in
          this app uses. The sentence about the exam is the headline
          underneath; saying it here as well put it on the card twice. */}
      <span className="charge-exam-word">Unlimited</span>
    </span>
  );
}

export interface ChargeGateProps {
  /** The node being entered, or null when the sheet is closed. */
  readonly node: ChargeGateNode | null;
  readonly onClose: () => void;
  readonly reducedMotion: boolean;
}

/**
 * The sheet. One dialog, four states, one commit path.
 *
 * The component is mounted by the pathway and holds no node of its own: which
 * node is being entered is the caller's state, so the pathway can open the
 * sheet from a track node, a side quest, or anywhere else that costs charge,
 * without the sheet knowing what a pathway is.
 */
export function ChargeGate({ node, onClose, reducedMotion }: ChargeGateProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  /** The model at the instant of the commit, so the animation's endpoints hold still. */
  const [frozen, setFrozen] = useState<ChargeGateModel | null>(null);
  const timer = useRef<number | null>(null);

  const economy = useLiveEconomy(node !== null && phase === "idle");
  const live = useMemo(() => (node === null ? null : chargeGateModel(economy, node)), [economy, node]);
  const model = phase === "spending" ? frozen : live;

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (node !== null && !dialog.open) dialog.showModal();
    if (node === null && dialog.open) dialog.close();
  }, [node]);

  // A sheet that is dismissed mid commit must not navigate afterwards.
  useEffect(() => {
    if (node !== null) return;
    setPhase("idle");
    setFrozen(null);
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  }, [node]);

  useEffect(
    () => () => {
      if (timer.current !== null) window.clearTimeout(timer.current);
    },
    [],
  );

  /**
   * The commit. Everything that costs anything happens here and nowhere else.
   *
   * The order matters and it is the order docs/ECONOMY.md describes: the event
   * is appended FIRST, so the balance on screen a moment later is derived from
   * a journal that already contains the spend, and the animation is playing a
   * conclusion rather than predicting one. `node_started` is what spends charge;
   * the derivation prices it from CHARGE_COST and this file never subtracts.
   */
  const start = (): void => {
    if (model === null || phase === "spending") return;
    setFrozen(model);
    progress.startNode(model.node.id, model.node.kind);
    if (reducedMotion || model.cost === 0) {
      go(model.node.href);
      onClose();
      return;
    }
    setPhase("spending");
    timer.current = window.setTimeout(() => {
      go(model.node.href);
      onClose();
    }, COMMIT_MS);
  };

  const topUp = (): void => {
    if (model === null || model.topUp === null || !model.topUp.affordable) return;
    // A spend, journalled like any other. The meter it refills is derived from
    // the same journal one line later, so the sheet updates itself.
    progress.spend("charge_topup", model.topUp.cost, model.node.id);
  };

  return (
    <dialog
      ref={ref}
      className="charge-sheet"
      data-charge-state={model === null ? "closed" : model.state}
      data-charge-phase={phase}
      aria-label={model === null ? "Charge" : model.label}
      onClose={onClose}
      onClick={(event) => {
        // The dialog element is the whole viewport; the panel inside it is not.
        if (event.target === ref.current) onClose();
      }}
    >
      {model === null ? null : (
        <div className="charge-panel">
          <span className="charge-grabber" aria-hidden />

          <div className="charge-hero">
            <Berry
              state="charged"
              chargeLevel={
                model.state === "exam" ? 1 : model.cap <= 0 ? 0 : (phase === "spending" ? model.after : model.before) / model.cap
              }
              mood={model.state === "empty" ? "sleepy" : model.state === "exam" ? "cheer" : "focused"}
              behaviour={model.state === "empty" ? "sleepy" : "idle"}
              reducedMotion={reducedMotion}
              sizePx={72}
            />
            {model.state === "exam" ? <ExamBand /> : <ChargeStrip model={model} phase={phase} />}
          </div>

          <p className="charge-kind">{model.kindLabel}</p>
          {/* The node the student pressed, kept small and above the rule.
              They already know its name; what they came for is the price, so
              the price is the thing set in display type underneath. */}
          <p className="charge-title">{model.node.title}</p>
          <h2 className="charge-headline">{model.headline}</h2>
          <p className="charge-line">{model.line}</p>

          {model.promise === "" ? null : (
            <p className="charge-promise">
              <CheckMark className="charge-promise-mark" />
              <span>{model.promise}</span>
            </p>
          )}

          <button
            type="button"
            data-charge-primary
            className="press charge-cta"
            onPointerDown={() => {
              if (model.state === "empty") {
                navigate(REVIEW_HREF);
                onClose();
                return;
              }
              start();
            }}
          >
            {model.primaryLabel}
          </button>

          {model.topUp === null ? null : (
            <button
              type="button"
              data-charge-topup
              disabled={!model.topUp.affordable}
              className="press charge-second"
              onPointerDown={topUp}
            >
              <DiamondMark className="h-5 w-5 shrink-0" />
              <span>{model.topUp.label}</span>
            </button>
          )}
          {model.topUp === null ? null : <p className="charge-note">{model.topUp.note}</p>}

          <button type="button" className="press charge-dismiss" onPointerDown={onClose}>
            {model.dismissLabel}
          </button>
        </div>
      )}
    </dialog>
  );
}
