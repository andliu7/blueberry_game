/**
 * The Mechanism Trainer tab. The crown jewel, wired end to end for one step:
 * the Phase 2 interaction machine drives the Phase 4 scene, the shell grades
 * (see grade.ts for exactly how far that honesty extends), packages/feedback
 * supplies the words, and the Phase 4 animation plays the step back when it
 * is right.
 *
 * Two modes on one canvas:
 *   draw   DrawCanvas, fed by the interaction store
 *   play   MoleculeSvg or the lazy Scene3D, driven by useStepProgress
 *
 * The store is created once per step in useMemo and read with
 * useSyncExternalStore, the same pattern the interaction package documents on
 * store.ts. Notices and effects arrive through callbacks; haptics go to
 * navigator.vibrate where it exists, which is the one platform effect the
 * package leaves to the shell.
 *
 * Failure animations, per BUILD-PROMPT.md Phase 5, all without red:
 *   invalid        every drawn arrow snaps back elastically, then the draft
 *                  resets, and the Tier 1 copy for the named cause renders
 *   not requested  legal arrows that are not the step: the leaving group
 *                  that the drawing left in place wobbles and stays, and the
 *                  result is named out loud
 *   incomplete     no animation; the strip says how many arrows remain
 *
 * The URL flags from Phase 4 still work here (?auto=1 loops playback for the
 * frame scripts, ?renderer=3d, ?stats=1), because the measurement scripts
 * load the default route and this is it.
 */

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { causeCopyEntry } from "@blueberry/feedback";
import {
  createInteractionStore,
  createMechanismDraft,
  currentDraft,
  inFlightGuide,
  type InteractionNotice,
  type InteractionState,
  type MechanismDraft,
  type Point2,
} from "@blueberry/interaction";
import { MoleculeSvg } from "../../render/svg/MoleculeSvg";
import { layoutState } from "../../render/layout/layout";
import { buildStepScene } from "../../render/layout/stepScene";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "../../demo/sn2Step";
import { useStepProgress } from "../../demo/useStepProgress";
import { Press } from "../../app/ui/Press";
import { Berry } from "../../mascot/Berry";
import type { BerryBehaviour } from "../../mascot/berryBehaviour";
import { DrawCanvas, type FailureAnimation } from "./DrawCanvas";
import { applySpeciesOffsets, buildTargets, createHitTester, type DrawTarget, type SpeciesOffsets } from "./hitLayout";
import { gradeDrawing, type DrawVerdict } from "./grade";
import { matchDistractor, type TrainerDistractor } from "./distractors";
import { playWrongSound } from "./feedbackSound";

const Scene3D = lazy(() => import("../../render/three/Scene3D"));

const fromLayout = layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS);
const toLayout = layoutState(SN2_DEMO_STEP.to, SN2_TO_HINTS);
const scene = buildStepScene(SN2_DEMO_STEP, fromLayout, toLayout);

const params = new URLSearchParams(window.location.search);
const AUTO_LOOP = params.get("auto") === "1";
const START_3D = params.get("renderer") === "3d";
const SHOW_STATS = params.get("stats") === "1";
/**
 * Publish the drop sites on `window` for the capture script.
 *
 * The same family as `window.__blueberryFrames` in useStepProgress.ts, and it
 * exists for the same reason: the thing a measurement needs is inside React and
 * nothing in the DOM carries it. Every drop site here is drawn into one SVG
 * with no element of its own, so a script has no selector to click and no way
 * to derive the geometry without reimplementing layout.ts.
 *
 * Behind a flag, so a student's run never publishes it.
 */
const EXPOSE_TARGETS = params.get("targets") === "1";

declare global {
  interface Window {
    __blueberryTargets?: readonly DrawTarget[];
  }
}
const STEP_DURATION_MS = 2000;

function StatsOverlay() {
  const [text, setText] = useState("measuring");
  useEffect(() => {
    let lowest = Infinity;
    const timer = setInterval(() => {
      const frames = window.__blueberryFrames ?? [];
      const now = performance.now();
      const recent = frames.filter((stamp) => now - stamp <= 1000);
      if (recent.length < 2) return;
      const fps = recent.length;
      if (fps < lowest) lowest = fps;
      setText(`${fps} fps, dip ${lowest}`);
    }, 500);
    return () => clearInterval(timer);
  }, []);
  return <div className="absolute left-4 top-4 rounded-lg bg-foreground/80 px-3 py-1.5 font-mono text-scale-sm text-background">{text}</div>;
}

function CanvasSkeleton() {
  return (
    <div className="skeleton flex h-full w-full items-center justify-center rounded-2xl">
      <span className="text-scale-sm font-medium text-muted-foreground">Loading the 3D view</span>
    </div>
  );
}

export interface TrainerTabProps {
  readonly reducedMotion: boolean;
  /** Onboarding: show the guidance strip and report the first correct answer. */
  readonly tutorial?: boolean;
  readonly onSolved?: () => void;
}

const TUTORIAL_STEPS = [
  "Tap the oxygen to show its lone pairs.",
  "Tap one lone pair. It is now the source of an arrow.",
  "Tap the carbon, or the space between O and C, to send the pair there.",
  "Now the leaving group: tap the handle on the C–Br bond nearest bromine, then tap bromine.",
  "The step checks itself the moment the last arrow lands.",
];

export function TrainerTab({ reducedMotion, tutorial = false, onSolved }: TrainerTabProps) {
  const step = SN2_DEMO_STEP;
  const [mode, setMode] = useState<"draw" | "play">(AUTO_LOOP ? "play" : "draw");
  const [renderer, setRenderer] = useState<"2d" | "3d">(START_3D ? "3d" : "2d");
  const [verdict, setVerdict] = useState<DrawVerdict | null>(null);
  const [distractor, setDistractor] = useState<TrainerDistractor | null>(null);
  const [failure, setFailure] = useState<FailureAnimation>(null);
  const [notice, setNotice] = useState<InteractionNotice | null>(null);
  const [behaviour, setBehaviour] = useState<BerryBehaviour>("idle");
  const [behaviourKey, setBehaviourKey] = useState(0);
  const { progress, playing, play, scrub } = useStepProgress(STEP_DURATION_MS, AUTO_LOOP);

  // The targets depend on the draft (revealed lone pairs, the armed atom), and
  // the hit tester reads them through a ref so the store never needs rebuilding
  // mid-drawing. A reset bumps `epoch`, which builds a fresh store over a fresh
  // draft: the machine has an undo stack but no "clear" command by design, and
  // a new document is the honest way to start over.
  const [epoch, setEpoch] = useState(0);
  const targetsRef = useRef<readonly DrawTarget[]>([]);
  const store = useMemo(
    () =>
      createInteractionStore({
        initialDraft: createMechanismDraft(step.from),
        environment: { hitTester: createHitTester(() => targetsRef.current) },
        onEffect: (effect) => {
          if (effect.kind === "haptic" && typeof navigator.vibrate === "function") navigator.vibrate(12);
        },
        onNotice: (item) => {
          setNotice(item);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, epoch],
  );
  const state: InteractionState = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const draft = currentDraft(state);
  if (draft.shape !== "mechanism") throw new Error("the trainer only holds a mechanism draft");
  const mechanism: MechanismDraft = draft;
  const armedAtom = mechanism.armed === null ? null : mechanism.armed.target.kind === "lonePair" || mechanism.armed.target.kind === "bondEndHandle" ? mechanism.armed.target.atomId : null;
  // Where each species has been carried, in px. The live scene is the authored
  // one plus these, and it is what the targets and the canvas read, so a drop
  // site stays on its atom wherever the student put the molecule. Positions
  // survive a reset on purpose: an arrangement is not an answer.
  const [offsets, setOffsets] = useState<SpeciesOffsets>({});
  const live = useMemo(() => applySpeciesOffsets(scene, step, offsets), [step, offsets]);
  const onSpeciesMove = useCallback((speciesId: string, offset: Point2) => setOffsets((prev) => ({ ...prev, [speciesId]: offset })), []);
  const targets = useMemo(() => buildTargets(step, live, mechanism.revealedLonePairs, armedAtom), [step, live, mechanism.revealedLonePairs, armedAtom]);
  targetsRef.current = targets;
  useEffect(() => {
    if (EXPOSE_TARGETS) window.__blueberryTargets = targets;
  }, [targets]);
  const guide = inFlightGuide(state);

  // Backgrounding ends any gesture, per the machine's appBackgrounded event.
  useEffect(() => {
    const onHidden = () => {
      if (document.visibilityState === "hidden") store.dispatch({ kind: "appBackgrounded", timestampMs: performance.now() });
    };
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("blur", onHidden);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("blur", onHidden);
    };
  }, [store]);

  useEffect(() => {
    if (AUTO_LOOP && !reducedMotion) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const bump = (next: BerryBehaviour) => {
    setBehaviour(next);
    setBehaviourKey((k) => k + 1);
  };

  /**
   * IMMEDIATE grading, owner requirement 2026-08-25: every committed arrow is
   * judged the moment it lands, with a sound, the failure animated, and the
   * explanation on screen, and no button between the mistake and the feedback.
   * The Check button is gone; this effect is what replaced it.
   *
   * Only the count going UP grades. The count goes down when the machine's own
   * undo takes a wrong arrow back, and regrading that transition would judge
   * the revert as if the student had drawn something.
   *
   * The revert itself: because every earlier arrow already passed this gate,
   * the offending arrow is always the LAST one, so one undo puts the draft
   * back exactly where it was before the mistake. That is the owner's "go
   * back to what we had", and it is why this dispatches undo rather than
   * nuking the draft with a fresh epoch: the arrows the student got right
   * stay earned.
   */
  const gradedCountRef = useRef(0);
  useEffect(() => {
    const drawn = mechanism.arrows.length;
    if (drawn <= gradedCountRef.current) {
      gradedCountRef.current = drawn;
      return;
    }
    gradedCountRef.current = drawn;
    const result = gradeDrawing(step, mechanism.arrows);
    setVerdict(result);

    if (result.kind === "correct") {
      // The success copy and the playback ARE the reward for this step; the
      // tutorial's Continue button below hands off only when the student
      // chooses, never on a timer and never before the copy has been read.
      setDistractor(null);
      bump("bounce");
      setMode("play");
      if (!reducedMotion) play();
      return;
    }
    if (result.kind === "invalid") {
      setDistractor(null);
      playWrongSound();
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
      bump("squash");
      setFailure({ kind: "snapBack", key: Date.now() });
      window.setTimeout(() => {
        setFailure(null);
        store.dispatch({ kind: "command", command: { kind: "undo" } });
      }, reducedMotion ? 1 : 430);
      return;
    }
    if (result.kind === "not_requested") {
      // The molecule tried it and it did not work: name the exact mistake if
      // an instructor anticipated it (Tier 2), wobble the atom the electrons
      // were wrongly sent to, then take the one wrong arrow back.
      const last = mechanism.arrows[mechanism.arrows.length - 1];
      setDistractor(last !== undefined ? matchDistractor(step, last) : null);
      playWrongSound();
      if (typeof navigator.vibrate === "function") navigator.vibrate([24, 60, 24]);
      bump("squash");
      const sentTo = last === undefined ? null : last.sink.kind === "atom" ? last.sink.atomId : last.sink.atomIds[1];
      setFailure({ kind: "wobble", atomIds: sentTo === null ? [] : [sentTo], key: Date.now() });
      window.setTimeout(() => {
        setFailure(null);
        store.dispatch({ kind: "command", command: { kind: "undo" } });
      }, reducedMotion ? 1 : 500);
      return;
    }
    // Incomplete: legal so far. Quiet card, no sound; progress is not an error.
    setDistractor(null);
    bump("leanIn");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mechanism.arrows, step, play, reducedMotion, store]);

  const reset = () => {
    setVerdict(null);
    setDistractor(null);
    gradedCountRef.current = 0;
    setNotice(null);
    setMode("draw");
    scrub(0);
    bump("leanIn");
    setEpoch((n) => n + 1);
  };

  const tutorialIndex = (() => {
    if (!tutorial) return -1;
    if (mechanism.arrows.length >= 2) return 4;
    if (mechanism.arrows.length === 1) return 3;
    if (mechanism.armed !== null) return 2;
    if (mechanism.revealedLonePairs.length > 0) return 1;
    return 0;
  })();

  const renderProps = { step, scene, progress, reducedMotion } as const;

  return (
    <div className="mx-auto flex h-full max-w-4xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="title-face text-scale-xl font-semibold">
            S<sub>N</sub>2 at bromomethane
          </h2>
          <p className="text-scale-sm text-muted-foreground">Hydroxide attacks, bromide leaves. Draw both arrows.</p>
        </div>
        <Berry behaviour={behaviour} behaviourKey={behaviourKey} mood="curious" reducedMotion={reducedMotion} sizePx={56} />
      </header>

      {tutorialIndex >= 0 ? (
        <ol className="flex flex-col gap-1 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-scale-sm" aria-label="Tutorial">
          {TUTORIAL_STEPS.map((text, index) => (
            <li key={text} className={index === tutorialIndex ? "font-semibold text-foreground" : index < tutorialIndex ? "text-good-ink line-through" : "text-muted-foreground"}>
              {index + 1}. {text}
            </li>
          ))}
        </ol>
      ) : null}

      <section
        // The canvas gets its own GROUND, not the card colour: a modelled atom
        // needs a surface to sit on, and the darkest atom loses its lower edge
        // against a flat one. Lighter at the top, matching the light on the
        // spheres.
        className="relative min-h-72 flex-1 overflow-hidden rounded-2xl border border-border shadow-sm"
        style={{
          minHeight: "20rem",
          background: "linear-gradient(180deg, var(--scene-ground-top), var(--scene-ground-bottom))",
        }}
      >
        {mode === "draw" ? (
          <DrawCanvas key={epoch} step={step} scene={scene} live={live} offsets={offsets} onSpeciesMove={onSpeciesMove} draft={mechanism} guide={guide} targets={targets} dispatch={store.dispatch} failure={failure} reducedMotion={reducedMotion} />
        ) : renderer === "2d" ? (
          <MoleculeSvg {...renderProps} />
        ) : (
          <Suspense fallback={<CanvasSkeleton />}>
            <Scene3D {...renderProps} />
          </Suspense>
        )}
        {SHOW_STATS ? <StatsOverlay /> : null}
        {mode === "play" ? (
          <button
            type="button"
            className="press absolute right-4 top-4 min-h-11 min-w-11 rounded-full border border-border bg-card px-4 text-scale-sm font-semibold text-foreground shadow-sm"
            onPointerDown={() => setRenderer((r) => (r === "2d" ? "3d" : "2d"))}
            aria-label={renderer === "2d" ? "Switch to the 3D view" : "Switch to the 2D view"}
          >
            {renderer === "2d" ? "3D" : "2D"}
          </button>
        ) : null}
      </section>

      {notice !== null && isContestedNotice(notice) ? (
        <p className="text-scale-xs text-muted-foreground" aria-live="polite">
          Two things were close under that tap. The nearer one was taken; tap again to change it.
        </p>
      ) : null}

      {verdict !== null ? <VerdictCard verdict={verdict} distractor={distractor} /> : null}

      <section className="flex flex-wrap items-center gap-3">
        {mode === "draw" ? (
          <>
            <span className="text-scale-sm text-muted-foreground">
              {mechanism.arrows.length} of {step.arrows.length} arrows
              {mechanism.armed !== null ? ", source armed" : ""}
            </span>
            {mechanism.arrows.length > 0 ? (
              <Press variant="ghost" onPointerDown={reset}>
                Start over
              </Press>
            ) : null}
          </>
        ) : (
          <>
            <Press onPointerDown={play} disabled={reducedMotion} title={reducedMotion ? "Motion is reduced; the frame shown is the whole step" : undefined}>
              {playing ? "Replay" : "Play step"}
            </Press>
            <label className="flex min-h-11 flex-1 items-center gap-3">
              <span className="text-scale-sm text-muted-foreground">Scrub</span>
              <input type="range" min={0} max={1000} value={Math.round(progress * 1000)} onChange={(event) => scrub(Number(event.currentTarget.value) / 1000)} className="w-full accent-[var(--primary)]" aria-label="Scrub through the step" />
            </label>
            <Press variant="secondary" onPointerDown={reset}>
              Draw it again
            </Press>
            {onSolved !== undefined && verdict?.kind === "correct" ? (
              <Press variant="reward" onPointerDown={onSolved}>
                Continue
              </Press>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}

function isContestedNotice(notice: InteractionNotice): boolean {
  return notice.id === "target_was_ambiguous";
}

/**
 * The plain English line, per arrow legality rule. Authored copy, held to the
 * voice contract in CLAUDE.md: it names what happened in the drawing, treats
 * the mistake as the normal step it is, and points at the next thing to look
 * at. The subject is the arrow, never the student.
 *
 * These are deliberately NOT the registry's `whatYouDid`, which is a paragraph.
 * This is the one sentence a stressed student reads in two seconds; the
 * paragraph is one press away under Show more.
 */
const PLAIN_BY_RULE: Record<string, string> = {
  source_has_no_lone_pair: "That arrow starts on an atom with no lone pair to give.",
  source_has_no_unpaired_electron: "A fishhook needs a single unpaired electron to start from, and that atom has none.",
  single_electron_source_moved_a_pair: "A fishhook moves one electron; that arrow moved a pair.",
  source_bond_overdrawn: "That bond is being asked for more electrons than it holds.",
  lone_pairs_overdrawn: "That atom is being asked for more lone pair electrons than it has.",
  unpaired_electrons_overdrawn: "That atom is being asked for more unpaired electrons than it has.",
  endpoints_share_no_atom: "The arrow's start and finish are not connected, so the electrons have nowhere to travel.",
  sink_bonds_an_atom_to_itself: "That arrow would bond an atom to itself.",
  arrow_declares_no_change: "That arrow ends where it started, so nothing moves.",
  source_atom_not_in_state: "That arrow starts on something that is not in this reaction.",
  source_bond_not_in_state: "That arrow starts on a bond that is not in this reaction.",
  sink_atom_not_in_state: "That arrow points at something that is not in this reaction.",
};

/** One sentence per verdict. The headline, and often all a student needs. */
function plainLine(verdict: DrawVerdict): string {
  switch (verdict.kind) {
    case "correct":
      return "Back-side attack: the hydroxide lone pair forms the new C–O bond as the bromide leaves.";
    case "invalid":
      return PLAIN_BY_RULE[verdict.finding.rule] ?? "That arrow cannot move electrons the way it is drawn.";
    case "not_requested":
      return verdict.missing > 0
        ? "Every arrow you drew is legal, and the bromide still has no reason to leave."
        : "Every arrow you drew is legal, and together they describe a different transformation.";
    case "incomplete":
      return `${verdict.drawn} of ${verdict.needed} arrows, ${verdict.drawn === 1 ? "and it holds up" : "all legal so far"}. One more: something has to break.`;
    default: {
      const unreachable: never = verdict;
      return unreachable;
    }
  }
}

/**
 * The detail, behind one press. `<details>` is the native disclosure: it is
 * keyboard operable and screen reader announced without any state of ours, and
 * the summary carries the press class so the acknowledgement paints on pointer
 * down like every other control.
 */
function ShowMore({ children }: { readonly children: ReactNode }) {
  return (
    <details className="mt-2 group">
      <summary className="press inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-scale-sm font-semibold text-primary">
        <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-90" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M9 6l6 6-6 6" />
        </svg>
        <span className="group-open:hidden">Show more</span>
        <span className="hidden group-open:inline">Show less</span>
      </summary>
      <div className="mt-1 flex flex-col gap-2">{children}</div>
    </details>
  );
}

function Detail({ label, text }: { readonly label: string; readonly text: string }) {
  return (
    <div>
      <h4 className="text-scale-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</h4>
      <p className="text-scale-sm text-foreground">{text}</p>
    </div>
  );
}

function VerdictCard({ verdict, distractor = null }: { readonly verdict: DrawVerdict; readonly distractor?: TrainerDistractor | null }) {
  const line = plainLine(verdict);

  switch (verdict.kind) {
    case "correct": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in rounded-2xl border border-good/40 bg-good-soft p-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-good px-2.5 py-0.5 text-scale-xs font-bold text-white">
              S<sub>N</sub>2
            </span>
            <span className="text-scale-xs font-semibold text-good-ink">back-side attack</span>
          </div>
          <p className="mt-1.5 text-scale-lg font-semibold leading-snug text-good-ink">{line}</p>
          <ShowMore>
            <Detail label="What you did" text={copy.whatYouDid} />
            <Detail label="Why" text={copy.why} />
            <Detail label="Look at" text={copy.lookAt} />
          </ShowMore>
        </section>
      );
    }
    case "invalid": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in rounded-2xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <p className="text-scale-lg font-semibold leading-snug text-foreground">{line}</p>
          <ShowMore>
            <Detail label="What you did" text={copy.whatYouDid} />
            <Detail label="Why" text={copy.why} />
            <Detail label="Look at" text={copy.lookAt} />
          </ShowMore>
        </section>
      );
    }
    case "not_requested":
      // An authored distractor is the specific mistake an instructor predicted,
      // and specificity wins over tier number per CLAUDE.md: when one matched,
      // its copy IS the card, headline included, and the generic concerted-step
      // paragraph never shows. The owner hit the generic path drawing O to Br
      // and it answered a different mistake than the one made.
      if (distractor !== null) {
        return (
          <section className="fade-in rounded-2xl border border-not-requested/40 bg-not-requested-soft p-4" aria-live="polite">
            <p className="text-scale-lg font-semibold leading-snug text-not-requested">{distractor.what}</p>
            <ShowMore>
              <Detail label="Why" text={distractor.why} />
              <Detail label="Look at" text={distractor.lookAt} />
            </ShowMore>
          </section>
        );
      }
      return (
        <section className="fade-in rounded-2xl border border-not-requested/40 bg-not-requested-soft p-4" aria-live="polite">
          <p className="text-scale-lg font-semibold leading-snug text-not-requested">{line}</p>
          <ShowMore>
            <Detail
              label="What you did"
              text={
                [
                  verdict.missing > 0 ? `${verdict.missing} of the arrows this step needs ${verdict.missing === 1 ? "is" : "are"} not drawn` : "",
                  verdict.extra > 0 ? `${verdict.extra} arrow${verdict.extra === 1 ? "" : "s"} go${verdict.extra === 1 ? "es" : ""} somewhere this step does not` : "",
                ]
                  .filter((part) => part !== "")
                  .join(", and ") + "."
              }
            />
            <Detail
              label="Why"
              text="An S(N)2 is one concerted step: the nucleophile arrives as the leaving group departs. Carbon cannot hold five bonds even for an instant, so the bond to bromine has to break in the same step the bond to oxygen forms."
            />
            <Detail
              label="Look at"
              text="The C–Br bond. Grab its handle on the bromine side and send those electrons onto bromine, which leaves as bromide."
            />
          </ShowMore>
        </section>
      );
    case "incomplete":
      return (
        <section className="fade-in rounded-2xl border border-border bg-muted p-4" aria-live="polite">
          <p className="text-scale-lg font-semibold leading-snug text-foreground">{line}</p>
          <ShowMore>
            <Detail label="Why" text="Every arrow you have drawn holds up on its own. The step is not finished until the electrons that were holding the leaving group have somewhere to go." />
            <Detail label="Look at" text="Which bond has to break for this product to exist, and which atom keeps those electrons." />
          </ShowMore>
        </section>
      );
    default: {
      const unreachable: never = verdict;
      return <>{unreachable}</>;
    }
  }
}
