/**
 * One pathway node in, one playable beat out.
 *
 * WHY THIS FILE EXISTS. Five beat surfaces were built in parallel, each behind
 * its own directory and each with its own props: the MCQ runner wants a node id
 * and plays every beat authored for it, the match board wants one MatchBeat,
 * the sort view wants a SortContent, and the synthesis beat wants one
 * SynthesisGapProblem. That is the right shape for each of them in isolation
 * and the wrong shape for the pathway, which knows one thing only: the id of
 * the node the student tapped. This file is the adapter between those two
 * facts, and it is the only place that knows all five exist.
 *
 * THE TWO ID NAMESPACES, and the reason there is a table below rather than a
 * lookup. Four of the five surfaces key their content on a PATHWAY NODE id
 * ("u3-directing"). The sort ladders key theirs on a CURRICULUM TOPIC id
 * ("oxidation_and_reduction_ladder"), because ladders are a property of the
 * chemistry rather than of one slot on the map. Neither choice is wrong and
 * neither should be rewritten to match the other: a ladder really is reusable
 * across nodes, and an MCQ really is authored for one slot. So the mapping
 * lives here, written out by hand, where a reader can see exactly which node
 * borrows which ladder.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO. It does not invent content. A node with
 * nothing authored for it resolves to null and the pathway renders it as
 * queued, exactly as it did before. CLAUDE.md's coverage number is only worth
 * having if it counts real beats, so a link to an empty slot is worse than no
 * link at all.
 */

import { Suspense, lazy, useMemo } from "react";

import type { MasteryLevel } from "./types";
import { mcqBeatsForNode } from "./mcq";
import { MATCH_BOARDS } from "./match";
import { sortContentById } from "./sort";
import { synthesisGapsForNode } from "./synthesis";

/** The match boards authored for one pathway node. None gives an empty list. */
function matchBoardsForNode(node: string) {
  return MATCH_BOARDS.filter((board) => board.node === node);
}

/* ------------------------------------------------------------------ */
/* The node to ladder table. See the header for why it is written out. */
/* ------------------------------------------------------------------ */

/**
 * Pathway nodes whose lesson IS a ladder, and the ladder each one borrows.
 *
 * These four ladders were authored against the chemistry rather than against
 * the map, so the map has to say which one it wants. Every id on the right is
 * a real SORT_LADDERS entry and there is a test that proves it.
 */
export const LADDER_FOR_NODE: Readonly<Record<string, string>> = Object.freeze({
  "u5-oxidation": "sort-oxidation-ladder",
  "u8-ladder": "sort-acyl-reactivity",
  "u10-basicity": "sort-basicity-vs-nucleophilicity",
});

/* ------------------------------------------------------------------ */
/* Resolution                                                          */
/* ------------------------------------------------------------------ */

export type ResolvedBeat =
  | { readonly kind: "mcq"; readonly node: string }
  | { readonly kind: "match"; readonly node: string }
  | { readonly kind: "sort"; readonly ladderId: string }
  | { readonly kind: "synthesis"; readonly node: string };

/**
 * What this node plays, or null when nothing is authored for it.
 *
 * Order matters and encodes a teaching decision rather than a technical one.
 * A node with both an MCQ and a ladder opens the MCQ, because the MCQ is the
 * gentler entry and CLAUDE.md's mastery ladder says the easy rung comes first.
 */
export function resolveBeat(node: string, level: MasteryLevel): ResolvedBeat | null {
  // Deliberately asks whether the node has an MCQ AT ALL rather than one at
  // this level. A beat authored only at levels 2 and 3 still means the node is
  // a real lesson, and filtering by level here would make the pathway show it
  // as queued forever. Choosing which rung to play is the runner's job.
  if (mcqBeatsForNode(node).length > 0) return { kind: "mcq", node };
  if (matchBoardsForNode(node).length > 0) return { kind: "match", node };

  const ladderId = LADDER_FOR_NODE[node];
  if (ladderId !== undefined && sortContentById(ladderId) !== undefined) {
    return { kind: "sort", ladderId };
  }

  if (synthesisGapsForNode(node).length > 0) return { kind: "synthesis", node };
  return null;
}

/** Whether the pathway should render this node as playable. */
export function nodeHasBeat(node: string): boolean {
  // Level 1 is the entry rung, so it is the honest question to ask of a node
  // the student has not started: is there anything here to open at all.
  return resolveBeat(node, 1) !== null;
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
 * Plays whatever this node has authored for it.
 *
 * Renders nothing but an honest message when the node has no beat. That case
 * should be unreachable from the pathway, which only links nodes that pass
 * nodeHasBeat, but a deep link can still arrive by hand.
 */
export function BeatRunner({ node, level = 1, onExit, reducedMotion = false }: BeatRunnerProps) {
  const resolved = useMemo(() => resolveBeat(node, level), [node, level]);

  if (resolved === null) {
    return (
      <div className="beat-runner beat-runner--empty" role="status">
        <p>This lesson is still being written. Nothing here is lost: pick another node and come back.</p>
        <button type="button" onClick={onExit}>
          Back to the pathway
        </button>
      </div>
    );
  }

  return (
    <div className="beat-runner">
      <Suspense fallback={<p role="status">Loading the lesson.</p>}>
        {resolved.kind === "mcq" ? <McqRunner node={resolved.node} level={level} onExit={onExit} /> : null}
        {resolved.kind === "match" ? (
          <MatchBoard beat={matchBoardsForNode(resolved.node)[0]!} level={level} onContinue={onExit} />
        ) : null}
        {resolved.kind === "sort" ? (
          <SortBeatView content={sortContentById(resolved.ladderId)!} level={level} />
        ) : null}
        {resolved.kind === "synthesis" ? (
          <SynthesisGapBeat
            problem={synthesisGapsForNode(resolved.node)[0]!}
            level={level}
            reducedMotion={reducedMotion}
            onResolved={() => undefined}
            onContinue={onExit}
          />
        ) : null}
      </Suspense>
    </div>
  );
}
