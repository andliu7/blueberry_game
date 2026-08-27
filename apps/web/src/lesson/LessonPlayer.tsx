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
 */

import { useMemo, useState } from "react";
import {
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
import { progress } from "../app/progress";
import { useProgress } from "../app/hooks";
import { ProblemView } from "./ProblemView";
import { Feedback } from "./Feedback";
import { RewardMoment } from "./RewardMoment";
import { LessonVideo } from "./LessonVideo";
import type { BerryBehaviour } from "../mascot/berryBehaviour";

export interface LessonPlayerProps {
  readonly topic: TopicId;
  readonly problems: readonly Problem[];
  readonly reducedMotion: boolean;
  readonly onExit: () => void;
  /** Called after the reward moment. Onboarding uses it to move to the paywall card. */
  readonly onFinished?: (correct: number, attempted: number) => void;
  readonly showVideo?: boolean;
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

export function LessonPlayer({ topic, problems, reducedMotion, onExit, onFinished, showVideo = true }: LessonPlayerProps) {
  const snapshot = useProgress();
  const definition = useMemo(() => topicDefinition(topic), [topic]);
  const [index, setIndex] = useState(0);
  const [result, setResult] = useState<GradingResult | null>(null);
  const [correct, setCorrect] = useState(0);
  const [attempted, setAttempted] = useState(0);
  const [videoDone, setVideoDone] = useState(!showVideo);
  const [finished, setFinished] = useState<{ earned: number; returning: boolean } | null>(null);
  const [behaviour, setBehaviour] = useState<BerryBehaviour>("idle");
  const [behaviourKey, setBehaviourKey] = useState(0);

  const problem = problems[index];
  const total = problems.length;

  const play = (next: BerryBehaviour) => {
    setBehaviour(next);
    setBehaviourKey((k) => k + 1);
  };

  const submit = (state: AnswerState) => {
    if (problem === undefined || result !== null) return;
    const graded = gradeAttempt(problem, state);
    setResult(graded);
    setAttempted((n) => n + 1);
    if (graded.kind === "correct") {
      setCorrect((n) => n + 1);
      play("bounce");
    } else {
      play("squash");
    }
  };

  const advance = () => {
    if (index + 1 < total) {
      setIndex(index + 1);
      setResult(null);
      play("leanIn");
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    const returning = snapshot.activeDays.length > 0 && !snapshot.activeDays.includes(today);
    const earned = progress.completeLesson(topic, correct, attempted, problems.map((p) => p.id));
    setFinished({ earned, returning });
  };

  const skip = () => {
    // A structure problem the shell cannot draw: not counted, not penalised.
    if (index + 1 < total) {
      setIndex(index + 1);
      setResult(null);
    } else {
      advance();
    }
  };

  if (finished !== null) {
    return (
      <RewardMoment
        diamondsEarned={finished.earned}
        correct={correct}
        attempted={attempted}
        returning={finished.returning}
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
          <Berry behaviour={behaviour} behaviourKey={behaviourKey} mood="focused" reducedMotion={reducedMotion} sizePx={56} className="shrink-0" />
        </div>

        <ProblemView key={problem.id} problem={problem} locked={result !== null} onSubmit={submit} onSkip={skip} />

        {result !== null ? (
          <>
            <Feedback result={result} />
            {result.kind !== "correct" ? (
              <details className="rounded-xl bg-muted p-3 text-scale-sm">
                <summary className="cursor-pointer font-semibold text-foreground">Show the worked answer</summary>
                <p className="mt-2 text-muted-foreground">{problem.solution.whatHappened}</p>
                <p className="mt-1 text-muted-foreground">{problem.solution.why}</p>
              </details>
            ) : null}
            <Press onPointerDown={advance}>{index + 1 < total ? "Next" : "Finish lesson"}</Press>
          </>
        ) : null}
      </Card>
    </div>
  );
}
