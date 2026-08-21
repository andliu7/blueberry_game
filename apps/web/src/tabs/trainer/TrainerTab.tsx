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

import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { causeCopyEntry } from "@blueberry/feedback";
import {
  createInteractionStore,
  createMechanismDraft,
  currentDraft,
  inFlightGuide,
  type InteractionNotice,
  type InteractionState,
  type MechanismDraft,
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
import { buildTargets, createHitTester, type DrawTarget } from "./hitLayout";
import { gradeDrawing, missingArrows, type DrawVerdict } from "./grade";

const Scene3D = lazy(() => import("../../render/three/Scene3D"));

const fromLayout = layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS);
const toLayout = layoutState(SN2_DEMO_STEP.to, SN2_TO_HINTS);
const scene = buildStepScene(SN2_DEMO_STEP, fromLayout, toLayout);

const params = new URLSearchParams(window.location.search);
const AUTO_LOOP = params.get("auto") === "1";
const START_3D = params.get("renderer") === "3d";
const SHOW_STATS = params.get("stats") === "1";
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
  "Check the step.",
];

export function TrainerTab({ reducedMotion, tutorial = false, onSolved }: TrainerTabProps) {
  const step = SN2_DEMO_STEP;
  const [mode, setMode] = useState<"draw" | "play">(AUTO_LOOP ? "play" : "draw");
  const [renderer, setRenderer] = useState<"2d" | "3d">(START_3D ? "3d" : "2d");
  const [verdict, setVerdict] = useState<DrawVerdict | null>(null);
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
  const targets = useMemo(() => buildTargets(step, scene, mechanism.revealedLonePairs, armedAtom), [step, mechanism.revealedLonePairs, armedAtom]);
  targetsRef.current = targets;
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

  const check = useCallback(() => {
    const result = gradeDrawing(step, mechanism.arrows);
    setVerdict(result);
    if (result.kind === "correct") {
      // The success copy and the playback ARE the reward for this step; the
      // tutorial's Continue button below hands off only when the student
      // chooses, never on a timer and never before the copy has been read.
      bump("bounce");
      setMode("play");
      if (!reducedMotion) play();
      return;
    }
    if (result.kind === "invalid") {
      bump("squash");
      setFailure({ kind: "snapBack", key: Date.now() });
      // After the snap the arrows are gone: a fresh draft, the verdict stays.
      window.setTimeout(() => {
        setFailure(null);
        setEpoch((n) => n + 1);
      }, reducedMotion ? 1 : 430);
      return;
    }
    if (result.kind === "not_requested") {
      bump("squash");
      const stuck = missingArrows(step, mechanism.arrows)
        .map((arrow) => (arrow.sink.kind === "atom" ? arrow.sink.atomId : null))
        .filter((id): id is string => id !== null);
      setFailure({ kind: "wobble", atomIds: stuck, key: Date.now() });
      window.setTimeout(() => setFailure(null), reducedMotion ? 1 : 500);
      return;
    }
    bump("wideEyed");
  }, [step, mechanism.arrows, play, reducedMotion]);

  const reset = () => {
    setVerdict(null);
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

      <section className="relative min-h-72 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm" style={{ minHeight: "20rem" }}>
        {mode === "draw" ? (
          <DrawCanvas key={epoch} step={step} scene={scene} draft={mechanism} guide={guide} targets={targets} dispatch={store.dispatch} failure={failure} reducedMotion={reducedMotion} />
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

      {verdict !== null ? <VerdictCard verdict={verdict} /> : null}

      <section className="flex flex-wrap items-center gap-3">
        {mode === "draw" ? (
          <>
            <Press onPointerDown={check} disabled={mechanism.arrows.length === 0}>
              Check the step
            </Press>
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

function VerdictCard({ verdict }: { readonly verdict: DrawVerdict }) {
  switch (verdict.kind) {
    case "correct": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in rounded-2xl border border-good/40 bg-good-soft p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-good-ink">Correct, by the requested route.</h3>
          <p className="mt-1 text-scale-sm text-foreground">{copy.whatYouDid}</p>
          <p className="mt-1 text-scale-sm text-muted-foreground">{copy.why}</p>
          <p className="mt-1 text-scale-sm text-muted-foreground">{copy.lookAt}</p>
        </section>
      );
    }
    case "invalid": {
      const copy = causeCopyEntry(verdict.cause);
      return (
        <section className="fade-in rounded-2xl border border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-foreground">That arrow cannot be drawn there.</h3>
          <p className="mt-1 text-scale-sm text-foreground">{copy.whatYouDid}</p>
          <p className="mt-1 text-scale-sm text-muted-foreground">{copy.why}</p>
          <p className="mt-1 text-scale-sm text-muted-foreground">{copy.lookAt}</p>
        </section>
      );
    }
    case "not_requested":
      return (
        <section className="fade-in rounded-2xl border border-not-requested/40 bg-not-requested-soft p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-not-requested">Every arrow is legal, and this is not the S<sub>N</sub>2 step.</h3>
          <p className="mt-1 text-scale-sm text-foreground">
            {verdict.missing > 0 ? `${verdict.missing} of the requested arrows ${verdict.missing === 1 ? "is" : "are"} not drawn` : ""}
            {verdict.missing > 0 && verdict.extra > 0 ? ", and " : ""}
            {verdict.extra > 0 ? `${verdict.extra} arrow${verdict.extra === 1 ? "" : "s"} go${verdict.extra === 1 ? "es" : ""} somewhere the step does not` : ""}.
          </p>
          <p className="mt-1 text-scale-sm text-muted-foreground">
            The engine cannot yet name which transformation these arrows describe; that resolver is an open item in chem-core. What it can say is that the bromide has not been given a reason to leave.
          </p>
        </section>
      );
    case "incomplete":
      return (
        <section className="fade-in rounded-2xl border border-border bg-muted p-4" aria-live="polite">
          <h3 className="text-scale-base font-semibold text-foreground">Good so far.</h3>
          <p className="mt-1 text-scale-sm text-muted-foreground">
            {verdict.drawn} of {verdict.needed} arrows, every one of them legal. The step needs {verdict.needed - verdict.drawn} more.
          </p>
        </section>
      );
    default: {
      const unreachable: never = verdict;
      return <>{unreachable}</>;
    }
  }
}
