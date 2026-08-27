/**
 * A lesson: the problems of one topic, one at a time, graded by the curriculum
 * package, ending in the reward moment.
 *
 * Why the lesson is "a topic's problems" and not an authored lesson object:
 * the curriculum corpus carries a topic on every problem and a LessonId on
 * none of them yet (ids.ts reserves the alias for Phase 5 and the authoring
 * waves have not filled it). Grouping by topic is the honest unit the data
 * supports today; when lessons are authored, this component takes a problem
 * list from them instead and nothing else changes.
 *
 * State is a small reducer-free useState set, because the flow is linear:
 * index, the current result, the tally. A useReducer would be ceremony here.
 *
 * Grading calls gradeAttempt and nothing else, so the tier order (notation
 * causes, authored distractors, diagnostic causes, the logged tail) is the
 * package's decision and this file cannot reorder it by accident.
 *
 * BLOOM'S REACTIONS, piece P1, 2026-08-27. The character has an opinion in
 * the same render as the grade: `submit` decides the outcome and the run, and
 * `reactionFor` (src/mascot/berryReaction.ts) turns those into the face, the
 * motion and the state. Nothing here names a mood directly, so the lesson and
 * the trainer make the same face for the same outcome. The two timers below
 * are the tone rule: a sad face settles inside a second, and a charred berry
 * clears with a flash on the next correct answer, never on a clock.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  curriculumCause,
  gradeAttempt,
  topicDefinition,
  type AnswerState,
  type GradingResult,
  type Problem,
  type TopicId,
} from "@blueberry/curriculum";
import { Press } from "../app/ui/Press";
import { Card, Pill } from "../app/ui/Card";
import { Berry } from "../mascot/Berry";
import { costumeForSurface, type BerrySurface } from "../mascot/berryCostume";
import type { BerryState } from "../mascot/berryState";
import type { BerryMood } from "../mascot/berryMood";
import {
  CHARRED_LINE,
  SETTLED_AFTER_MISS,
  reactionFor,
  type Reaction,
  type ReactionOutcome,
} from "../mascot/berryReaction";
import { progress } from "../app/progress";
import type { Receipt } from "@blueberry/economy";
import { useProgress } from "../app/hooks";
import { ProblemView } from "./ProblemView";
import { FeedbackBody, feedbackHeadline } from "./Feedback";
import { ReactionStrip } from "./ReactionStrip";
import { ComboInterstitial } from "./ComboInterstitial";
import { RewardMoment } from "./RewardMoment";
import { LessonVideo } from "./LessonVideo";

export interface LessonPlayerProps {
  readonly topic: TopicId;
  readonly problems: readonly Problem[];
  readonly reducedMotion: boolean;
  readonly onExit: () => void;
  /** Called after the reward moment. Onboarding uses it to move to the paywall card. */
  readonly onFinished?: (correct: number, attempted: number) => void;
  readonly showVideo?: boolean;
  /**
   * Where the lesson is standing, for the costume. When absent it is derived
   * per problem: a reagent, product or structure question is reaction work
   * (lab coat), anything else is concept work (tweed).
   */
  readonly surface?: BerrySurface;
}

const KIND_LABEL: Record<Problem["answer"]["kind"], string> = {
  multiple_choice: "Pick one",
  major_product: "Major product",
  numeric: "Calculate",
  reagents: "Supply the reagents",
  ordering: "Put in order",
  matching: "Match the pairs",
  structure: "Draw",
};

function surfaceForProblem(problem: Problem): BerrySurface {
  switch (problem.answer.kind) {
    case "reagents":
    case "major_product":
    case "structure":
      return "reactionNode";
    default:
      return "conceptNode";
  }
}

/** The working face: focused, and leaning in when a new problem arrives. */
const WORKING_MOOD: BerryMood = "focused";

/**
 * A graded result as an outcome the mascot understands. A notation cause is
 * the near miss: the chemistry was right and the reporting slipped, which is
 * the curriculum's counterpart of the trainer's valid but not requested route.
 */
function outcomeOf(result: GradingResult): ReactionOutcome {
  if (result.kind === "correct") return "correct";
  if (result.kind === "named_cause" && curriculumCause(result.cause).specificity === "notation") return "nearMiss";
  return "wrong";
}

export function LessonPlayer({ topic, problems, reducedMotion, onExit, onFinished, showVideo = true, surface }: LessonPlayerProps) {
  const snapshot = useProgress();
  const definition = useMemo(() => topicDefinition(topic), [topic]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [videoDone, setVideoDone] = useState(!showVideo);
  // What the reward moment plays: the store's receipt for the clear, the
  // balance the store derived after it, whether this was the student's first
  // diamond ever (the long catch), and the session stopwatch. Nothing here is
  // added up locally; ECONOMY.md, "the client animates what the server
  // concluded".
  const [finished, setFinished] = useState<{
    receipt: Receipt;
    diamondBalance: number;
    firstDiamond: boolean;
    elapsedMs: number;
  } | null>(null);
  const startedAtRef = useRef<number>(performance.now());

  // The reaction in play and a key that bumps each time one fires, so the
  // same reaction twice in a row still replays. `settled` is the post-sad
  // face; `charred` outlives the reaction it arrived with (see the header).
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [reactionKey, setReactionKey] = useState(0);
  const [settled, setSettled] = useState(false);
  const [charred, setCharred] = useState(false);
  const [flashKey, setFlashKey] = useState(0);
  const [combo, setCombo] = useState<number | null>(null);
  const [showCombo, setShowCombo] = useState(false);
  const correctRunRef = useRef(0);
  const missRunRef = useRef(0);
  const settleTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const problem = problems[index];
  const total = problems.length;
  const costume = costumeForSurface(surface ?? (problem === undefined ? "conceptNode" : surfaceForProblem(problem)));

  const fire = (next: Reaction) => {
    if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
    setReaction(next);
    setReactionKey((k) => k + 1);
    setSettled(false);
    if (next.holdMs !== null) {
      // The sad beat ends on this timer; the face settles to the hint offer.
      settleTimer.current = window.setTimeout(() => setSettled(true), reducedMotion ? 1 : next.holdMs);
    }
  };

  const submit = (state: AnswerState) => {
    if (problem === undefined || result !== null) return;
    const graded = gradeAttempt(problem, state);
    const outcome = outcomeOf(graded);
    setResult(graded);
    setAttempted((n) => n + 1);

    if (outcome === "correct") {
      setCorrect((n) => n + 1);
      correctRunRef.current += 1;
      missRunRef.current = 0;
      if (charred) {
        // The recovery beat: a brighter puff clears the char.
        setCharred(false);
        setFlashKey((k) => k + 1);
      }
    } else if (outcome === "wrong") {
      correctRunRef.current = 0;
      missRunRef.current += 1;
    } else {
      // A near miss breaks neither run: the chemistry was right.
    }

    const next = reactionFor(outcome, { correctRun: correctRunRef.current, missRun: missRunRef.current });
    if (next.state === "charred") setCharred(true);
    setCombo(next.combo);
    fire(next);
  };

  const goToNext = () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setResult(null);
      setReaction(null);
      setSettled(false);
      setReactionKey((k) => k + 1);
      return;
    }
    const firstDiamond = snapshot.economy.diamonds.earned === 0;
    progress.completeLesson(topic, correct, attempted, problems.map((p) => p.id));
    // The store commits synchronously, so the receipt for this clear is the
    // snapshot's lastReceipt by the time completeLesson returns.
    const after = progress.getSnapshot();
    const receipt = after.lastReceipt;
    if (receipt === null) return;
    setFinished({
      receipt,
      diamondBalance: after.economy.diamonds.balance,
      firstDiamond: firstDiamond && receipt.diamonds.length > 0,
      elapsedMs: performance.now() - startedAtRef.current,
    });
  };

  const advance = () => {
    // A milestone answer shows its interstitial before the next problem.
    if (combo !== null && !showCombo) {
      setShowCombo(true);
      return;
    }
    setShowCombo(false);
    setCombo(null);
    goToNext();
  };

  const skip = () => {
    // A structure problem the shell cannot draw: not counted, not penalised.
    if (index + 1 < total) {
      setIndex(index + 1);
      setResult(null);
      setReaction(null);
    } else {
      goToNext();
    }
  };

  if (finished !== null) {
    return (
      <RewardMoment
        receipt={finished.receipt}
        diamondBalance={finished.diamondBalance}
        firstDiamond={finished.firstDiamond}
        correct={correct}
        attempted={attempted}
        elapsedMs={finished.elapsedMs}
        reducedMotion={reducedMotion}
        onContinue={() => (onFinished === undefined ? onExit() : onFinished(correct, attempted))}
      />
    );
  }

  if (problem === undefined) {
    return (
      <Card>
        <p className="text-scale-sm text-muted-foreground">No problems are authored for this topic yet.</p>
        <Press variant="secondary" className="mt-3" onPointerDown={onExit}>
          Back
        </Press>
      </Card>
    );
  }

  // The berry's props for the moment. While working: focused, goggles down
  // when the coat has them, leaning in at a fresh problem. After grading: the
  // reaction, then the settled face once a sad beat has had its second.
  const state: BerryState = charred ? "charred" : "neutral";
  const berryReacting = reaction !== null && result !== null;
  const berry = berryReacting
    ? {
        mood: settled && reaction.holdMs !== null ? SETTLED_AFTER_MISS.mood : reaction.mood,
        behaviour: settled && reaction.holdMs !== null ? SETTLED_AFTER_MISS.behaviour : reaction.behaviour,
        behaviourKey: reactionKey + (settled ? 1000 : 0),
        chain: reaction.chain,
        sparkleKey: reaction.sparkles ? reactionKey : 0,
        flashKey,
        state,
        costume,
        working: false,
        reducedMotion,
      }
    : {
        mood: WORKING_MOOD,
        behaviour: "leanIn" as const,
        behaviourKey: reactionKey,
        state,
        costume,
        working: true,
        reducedMotion,
      };

  const outcome = result === null ? null : outcomeOf(result);
  const nextLabel = index + 1 < total ? "Next" : "Finish lesson";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <button type="button" onPointerDown={onExit} className="press min-h-11 rounded-full px-3 text-scale-sm font-semibold text-muted-foreground">
          ← Leave
        </button>
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={index}>
            <div className="h-full rounded-full bg-primary transition-[width] duration-300" style={{ width: `${(index / total) * 100}%` }} />
          </div>
        </div>
        <span className="text-scale-sm font-semibold text-muted-foreground tabular-nums">
          {index + 1}/{total}
        </span>
      </header>

      {!videoDone ? (
        <LessonVideo title={definition.label} onSkip={() => setVideoDone(true)} />
      ) : null}

      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <Pill tone="primary">{KIND_LABEL[problem.answer.kind]}</Pill>
              <Pill>{definition.label}</Pill>
            </div>
            <p className="mt-2 text-scale-lg font-medium leading-relaxed text-foreground">{problem.prompt}</p>
          </div>
          {!berryReacting ? <Berry {...berry} sizePx={72} className="shrink-0" /> : null}
        </div>

        <ProblemView key={problem.id} problem={problem} locked={result !== null} onSubmit={submit} onSkip={skip} />

        {result !== null && outcome !== null && berryReacting ? (
          <ReactionStrip
            outcome={outcome}
            headline={feedbackHeadline(result)}
            caption={reaction.state === "charred" ? CHARRED_LINE : null}
            berry={berry}
            continueLabel={nextLabel}
            onContinue={advance}
          >
            <FeedbackBody result={result} />
            {result.kind !== "correct" ? (
              <details className="rounded-xl bg-card/70 p-3 text-scale-sm">
                <summary className="cursor-pointer font-semibold text-foreground">Show the worked answer</summary>
                <p className="mt-2 text-muted-foreground">{problem.solution.whatHappened}</p>
                <p className="mt-1 text-muted-foreground">{problem.solution.why}</p>
              </details>
            ) : null}
          </ReactionStrip>
        ) : null}
      </Card>

      {showCombo && combo !== null && reaction !== null ? (
        <ComboInterstitial
          count={combo}
          topicLabel={definition.label}
          reaction={reaction}
          reactionKey={reactionKey + 5000}
          costume={costume}
          reducedMotion={reducedMotion}
          progress={{ index: index + 1, total }}
          onContinue={advance}
        />
      ) : null}
    </div>
  );
}
