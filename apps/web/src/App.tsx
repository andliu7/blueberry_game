/**
 * The Phase 4 demo route: one real mechanism step, animated, judged by a human.
 *
 * Structure decisions, and why:
 *
 *   - The step scene is built ONCE at module scope. The step and its layouts
 *     are immutable data; rebuilding them per render would be waste dressed as
 *     purity. Only `progress` changes per frame.
 *
 *   - Scene3D is behind React.lazy (code splitting: the import happens the
 *     first time the component renders, downloading a separate chunk). The
 *     Suspense fallback is a visible skeleton, never a blank rectangle, per
 *     the loading contract in CLAUDE.md. This is also what keeps three out of
 *     the initial payload the budget gate weighs.
 *
 *   - prefers-reduced-motion is read through a matchMedia subscription
 *     (useSyncExternalStore is the React 18+ hook for subscribing to browser
 *     state outside React) and passed DOWN as a prop, so policy is decided
 *     once here and every renderer obeys the same answer.
 *
 *   - ?auto=1 in the URL makes the animation loop forever. That exists for the
 *     frame measurement scripts, which need a page that animates without a
 *     hand on it. ?renderer=3d starts on the 3D renderer for the same reason.
 */

import { lazy, Suspense, useEffect, useState, useSyncExternalStore } from "react";
import { MoleculeSvg } from "./render/svg/MoleculeSvg";
import { layoutState } from "./render/layout/layout";
import { buildStepScene } from "./render/layout/stepScene";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "./demo/sn2Step";
import { useStepProgress } from "./demo/useStepProgress";

const Scene3D = lazy(() => import("./render/three/Scene3D"));

const fromLayout = layoutState(SN2_DEMO_STEP.from, SN2_FROM_HINTS);
const toLayout = layoutState(SN2_DEMO_STEP.to, SN2_TO_HINTS);
const scene = buildStepScene(SN2_DEMO_STEP, fromLayout, toLayout);

const params = new URLSearchParams(window.location.search);
const AUTO_LOOP = params.get("auto") === "1";
const START_3D = params.get("renderer") === "3d";
const SHOW_STATS = params.get("stats") === "1";

const STEP_DURATION_MS = 2000;

function subscribeReducedMotion(onChange: () => void): () => void {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function readReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * On-screen fps readout for the device measurement (?stats=1). Reads the frame
 * log the animation hook already keeps and shows a rolling average plus the
 * lowest one-second window seen, which is the "dip" the results file asks for.
 */
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
  return (
    <div className="absolute left-4 top-4 rounded-lg bg-foreground/80 px-3 py-1.5 font-mono text-scale-sm text-background">
      {text}
    </div>
  );
}

/** The Suspense fallback while the three chunk downloads. Visible, animated. */
function CanvasSkeleton() {
  return (
    <div className="skeleton flex h-full w-full items-center justify-center rounded-2xl">
      <span className="text-scale-sm font-medium text-muted-foreground">
        Loading the 3D view
      </span>
    </div>
  );
}

export default function App() {
  const reducedMotion = useSyncExternalStore(subscribeReducedMotion, readReducedMotion);
  const { progress, playing, play, scrub } = useStepProgress(STEP_DURATION_MS, AUTO_LOOP);
  const [renderer, setRenderer] = useState<"2d" | "3d">(START_3D ? "3d" : "2d");
  const [selected, setSelected] = useState<readonly string[]>([]);

  // Autoplay for the measurement scripts, and a first play for a human too:
  // the page opens on motion, not on a static diagram needing a manual before
  // anything happens. Reduced motion skips this; the static frame IS the view.
  useEffect(() => {
    if (!reducedMotion) play();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderProps = {
    step: SN2_DEMO_STEP,
    scene,
    progress,
    reducedMotion,
    selectedAtomIds: selected,
    onAtomPointerDown: (atomId: string) =>
      setSelected((current) => (current.includes(atomId) ? [] : [atomId])),
  } as const;

  return (
    <main className="mx-auto flex h-dvh max-w-4xl flex-col gap-4 p-6">
      <header className="flex items-baseline justify-between">
        <h1 className="title-face text-scale-2xl font-semibold text-foreground">
          S<sub>N</sub>2 at bromomethane
        </h1>
        <p className="text-scale-sm text-muted-foreground">
          hydroxide attacks, bromide leaves
        </p>
      </header>

      <section className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {renderer === "2d" ? (
          <MoleculeSvg {...renderProps} />
        ) : (
          <Suspense fallback={<CanvasSkeleton />}>
            <Scene3D {...renderProps} />
          </Suspense>
        )}

        {SHOW_STATS ? <StatsOverlay /> : null}

        {/* One button of chrome on the canvas, per the Alchemie observation.
            The 2D/3D toggle earns its place because it IS the phase deliverable. */}
        <button
          type="button"
          className="press absolute right-4 top-4 min-h-11 min-w-11 rounded-full border border-border bg-card px-4 text-scale-sm font-semibold text-foreground shadow-sm"
          onPointerDown={() => setRenderer((r) => (r === "2d" ? "3d" : "2d"))}
          aria-label={renderer === "2d" ? "Switch to the 3D view" : "Switch to the 2D view"}
        >
          {renderer === "2d" ? "3D" : "2D"}
        </button>
      </section>

      <section className="flex items-center gap-4">
        <button
          type="button"
          className="press min-h-11 rounded-full bg-primary px-6 text-scale-base font-semibold text-primary-foreground shadow-sm"
          onPointerDown={play}
          disabled={reducedMotion}
          title={reducedMotion ? "Motion is reduced; the frame shown is the whole step" : undefined}
        >
          {playing ? "Replay" : "Play step"}
        </button>
        <label className="flex min-h-11 flex-1 items-center gap-3">
          <span className="text-scale-sm text-muted-foreground">Scrub</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(progress * 1000)}
            onChange={(event) => scrub(Number(event.currentTarget.value) / 1000)}
            className="w-full accent-[var(--primary)]"
            aria-label="Scrub through the step"
          />
        </label>
      </section>
    </main>
  );
}
