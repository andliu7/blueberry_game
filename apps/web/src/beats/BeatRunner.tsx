/**
 * One pathway node in, one LESSON out: the node's authored beats played in
 * the seven-slot template order, under the recipe strip, closed by the
 * reward slot.
 *
 * WHY THIS FILE EXISTS. Five beat surfaces were built in parallel, each
 * behind its own directory and each with its own props: the MCQ runner wants
 * a node id, the match board wants one MatchBeat, the sort view wants a
 * SortContent, the synthesis beat wants one SynthesisGapProblem. That is the
 * right shape for each of them in isolation and the wrong shape for the
 * pathway, which knows one thing only: the id of the node the student
 * tapped. This file is the adapter between those two facts, and it is the
 * only place that knows all of them exist.
 *
 * WHAT CHANGED WITH THE TEMPLATE (S4 lesson-flow piece). The old runner
 * resolved a node to exactly ONE beat kind and played it, so a node carrying
 * an MCQ and a ladder never showed the ladder. Now template.ts plans every
 * authored beat into the slot ordering (hook, recognise, connect, order,
 * produce, recycle, reward) and this runner plays the plan in sequence, with
 * the recipe strip as the lesson's progress bar and a reward card closing
 * the run. The ordering rule, the run state machine and the strip's segments
 * are pure functions in template.ts, where the suite can hold them; this
 * file owns the useState and the wiring, nothing else. The node-to-ladder
 * table moved there with the plan, and is re-exported below so its readers
 * keep their import path.
 *
 * THE NON-OBVIOUS REACT PATTERN, named per the house rule: the
 * `if (seenNode !== node)` block is React's documented adjust-state-when-a-
 * prop-changes pattern. Setting state during render makes React restart the
 * render with the new state before anything reaches the screen, so a parent
 * that swaps `node` without a key still gets a fresh run rather than the
 * previous node's progress under the new lesson.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not invent content: a node
 * with nothing authored renders the honest empty screen, exactly as before.
 * It does not write progress. And its reward slot is the run's own modest
 * receipt, not the economy celebration: RewardMoment plays receipts the
 * progress store committed, this runner banks nothing, and a celebration
 * about numbers nobody banked would be a lie with confetti on it.
 */

import { Suspense, lazy, useMemo, useRef, useState, type ReactNode } from "react";

import { clearsBeat, type BeatResult, type MasteryLevel } from "./types";
import { mcqBeatsForNode } from "./mcq";
import { MATCH_BOARDS } from "./match";
import { sortContentById } from "./sort";
import { synthesisGapsForNode } from "./synthesis";
import { ToolRail } from "../app/ui/ToolRail";
import { Berry } from "../mascot/Berry";
import { ChipPress } from "./ChipPress";
import { RecipeStrip } from "./RecipeStrip";
import {
  currentStep,
  missedMcqIdsFrom,
  planLesson,
  recipeSegments,
  reportRecycle,
  reportStep,
  startRun,
  type LessonRun,
} from "./template";
import "./beat-chrome.css";

// The resolution API lives in template.ts now: one table and one ordering
// for the plan, the pathway and the tests. Re-exported to keep import paths.
export { LADDER_FOR_NODE, nodeHasBeat, resolveBeat, type ResolvedBeat } from "./template";

/** The match boards authored for one pathway node. None gives an empty list. */
function matchBoardsForNode(node: string) {
  return MATCH_BOARDS.filter((board) => board.node === node);
}

/* ------------------------------------------------------------------ */
/* The runner                                                          */
/* ------------------------------------------------------------------ */

// Each surface is lazy because the pathway loads long before any of them is
// needed, and CLAUDE.md's budget row counts the game route's initial payload.
// A Suspense fallback that is a blank rectangle is banned by the same file, so
// the fallback below says what it is waiting for.
const McqRunner = lazy(() => import("./mcq/McqRunner").then((m) => ({ default: m.McqRunner })));
const MatchBoard = lazy(() => import("./match/MatchBoard").then((m) => ({ default: m.MatchBoard })));
const SortBeatView = lazy(() => import("./sort/SortBeatView").then((m) => ({ default: m.SortBeatView })));
const SynthesisGapBeat = lazy(() =>
  import("./synthesis/SynthesisGapBeat").then((m) => ({ default: m.SynthesisGapBeat })),
);

export interface BeatRunnerProps {
  /** The pathway node the student tapped, for example "u3-directing". */
  readonly node: string;
  readonly level?: MasteryLevel;
  readonly onExit: () => void;
  /** Honours prefers-reduced-motion. The synthesis beat asks for it by name. */
  readonly reducedMotion?: boolean;
}

/**
 * Plays the node's lesson plan, step by step.
 *
 * Renders nothing but an honest message when the node has no beat. That case
 * should be unreachable from the pathway, which only links nodes that pass
 * nodeHasBeat, but a deep link can still arrive by hand.
 */
export function BeatRunner({ node, level = 1, onExit, reducedMotion = false }: BeatRunnerProps) {
  const plan = useMemo(() => planLesson(node), [node]);

  const [seenNode, setSeenNode] = useState(node);
  const [run, setRun] = useState<LessonRun | null>(() => (plan === null ? null : startRun(plan)));
  // The current MCQ step's within-step fraction, for the strip's green fill.
  const [mcqFraction, setMcqFraction] = useState(0);
  // The last graded result of a single-problem step, read when it advances.
  // A ref, not state: recording it must not re-render mid-animation, and
  // nothing draws from it.
  const stepResult = useRef<BeatResult | null>(null);

  // See the header: adjust-state-during-render, so a swapped node never plays
  // the previous node's run.
  if (seenNode !== node) {
    setSeenNode(node);
    setRun(plan === null ? null : startRun(plan));
    setMcqFraction(0);
    stepResult.current = null;
  }

  if (plan === null || run === null) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This lesson is still being written. Nothing here is lost: pick another node and come back.</p>
        <button type="button" onClick={onExit}>
          Back to the pathway
        </button>
      </div>
    );
  }

  const step = currentStep(run);
  const segments = recipeSegments(run);

  const advanceStep = (cleared: number, total: number, missedMcqIds?: readonly string[]) => {
    stepResult.current = null;
    setMcqFraction(0);
    setRun((r) =>
      r === null ? r : reportStep(r, { cleared, total, ...(missedMcqIds !== undefined ? { missedMcqIds } : {}) }),
    );
  };

  /** One-problem steps (match, sort, synthesis) advance from their Continue. */
  const advanceSingle = () => {
    const result = stepResult.current;
    advanceStep(result === null || clearsBeat(result) ? 1 : 0, 1);
  };

  // The strip element, one instance whichever slot is playing. For the MCQ
  // surfaces it rides down into the question screen's own top bar
  // (progressSlot), so each screen keeps exactly one bar and one exit, in
  // the committed lesson frame's shape: X, the recipe strip, the counters.
  const inMcq = step?.beat.kind === "mcq" || run.phase === "recycle";
  const strip = (
    <RecipeStrip
      segments={segments}
      {...(inMcq ? { currentFraction: mcqFraction } : {})}
      reducedMotion={reducedMotion}
    />
  );

  return (
    <div className="beat-runner">
      {/* THE TOOLS, INSIDE A LESSON. This is the half of CLAUDE.md's
          "interactive, always reachable" that a tab could never satisfy: a
          student three steps into a directing-effects beat who wants an
          electronegativity had to leave the beat to get it, and leaving was a
          decision they then had to reverse. The rail opens a sheet over this
          screen instead, so the lesson is still underneath it. See
          app/ui/ToolRail.tsx for why these two stopped being tabs. */}
      <header className="beat-runner-tools">
        <ToolRail />
      </header>

      {!inMcq && run.phase !== "reward" ? (
        <div className="mx-auto flex w-full max-w-xl items-center gap-3 px-4 pt-3 md:px-6">
          <button
            type="button"
            onPointerDown={onExit}
            aria-label="Leave this lesson"
            title="Leave this lesson"
            className="press flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border-2 border-border text-scale-lg font-semibold text-muted-foreground"
          >
            &#10005;
          </button>
          <div className="min-w-0 flex-1">{strip}</div>
        </div>
      ) : null}

      <Suspense fallback={<p role="status">Loading the lesson.</p>}>
        {step?.beat.kind === "mcq" ? (
          <McqRunner
            node={step.beat.node}
            level={level}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={strip}
            onProgress={(progress) => setMcqFraction(progress.fraction)}
            onDone={(results) =>
              advanceStep(results.filter((r) => clearsBeat(r)).length, results.length, missedMcqIdsFrom(results))
            }
          />
        ) : null}
        {step?.beat.kind === "match" ? (
          <MatchBoard
            beat={matchBoardsForNode(step.beat.node)[0]!}
            level={level}
            onComplete={(result) => {
              stepResult.current = result;
            }}
            onContinue={advanceSingle}
          />
        ) : null}
        {step?.beat.kind === "sort" ? (
          <SortBeatView
            content={sortContentById(step.beat.ladderId)!}
            level={level}
            onResult={(result) => {
              stepResult.current = result;
            }}
            onContinue={advanceSingle}
          />
        ) : null}
        {step?.beat.kind === "synthesis" ? (
          <SynthesisGapBeat
            problem={synthesisGapsForNode(step.beat.node)[0]!}
            level={level}
            reducedMotion={reducedMotion}
            onResolved={(result) => {
              stepResult.current = result;
            }}
            onContinue={advanceSingle}
          />
        ) : null}

        {run.phase === "recycle" ? (
          // The recycle slot: the missed quick questions come back, once.
          // Same surface, same rules, only the ones that got away.
          <McqRunner
            node={node}
            level={level}
            beats={mcqBeatsForNode(node).filter((beat) => run.missedMcqIds.includes(beat.id))}
            onExit={onExit}
            reducedMotion={reducedMotion}
            progressSlot={strip}
            onProgress={(progress) => setMcqFraction(progress.fraction)}
            onDone={(results) => {
              setMcqFraction(0);
              setRun((r) =>
                r === null ? r : reportRecycle(r, results.filter((res) => clearsBeat(res)).length, results.length),
              );
            }}
          />
        ) : null}

        {run.phase === "reward" ? (
          <RewardSlot run={run} strip={strip} reducedMotion={reducedMotion} onExit={onExit} />
        ) : null}
      </Suspense>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* The reward slot                                                     */
/* ------------------------------------------------------------------ */

/**
 * The template's closing slot: what this run held, said plainly, in the
 * coach's voice. See the file header for why this is not RewardMoment.
 */
function RewardSlot({
  run,
  strip,
  reducedMotion,
  onExit,
}: {
  readonly run: LessonRun;
  readonly strip: ReactNode;
  readonly reducedMotion: boolean;
  readonly onExit: () => void;
}) {
  const cleared = run.clearedBeats + run.recycleCleared;
  const played = run.totalBeats;
  const stillRough = run.recycled ? run.recycleTotal - run.recycleCleared : 0;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl flex-1 flex-col gap-4 p-4 md:p-6">
      <div className="min-w-0">{strip}</div>
      <div className="mt-auto flex flex-col items-center gap-3 rounded-2xl border-2 border-border bg-card p-6 text-center">
        <Berry mood="cheer" behaviour="celebrate" sizePx={96} reducedMotion={reducedMotion} />
        <h2 className="title-face text-scale-2xl font-bold text-foreground">Lesson complete</h2>
        <p className="text-scale-base text-foreground">
          You cleared {cleared} of {played}
          {run.recycled
            ? `, and brought back ${run.recycleCleared} of the ${run.recycleTotal} that slipped past the first time.`
            : "."}
        </p>
        {stillRough > 0 ? (
          <p className="text-scale-sm text-muted-foreground">
            {stillRough === 1 ? "One is" : `${stillRough} are`} still settling. That is what the next visit is for,
            and this node stays open on the pathway.
          </p>
        ) : null}
        <ChipPress variant="claim" className="mt-2 w-full" onClick={onExit}>
          Continue
        </ChipPress>
      </div>
    </div>
  );
}
