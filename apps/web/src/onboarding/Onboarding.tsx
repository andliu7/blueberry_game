/**
 * Onboarding, per BUILD-PROMPT.md Phase 5: the placement quiz, then the free
 * tutorial covering a real mechanism, then a free introductory lesson, and
 * only after the student has succeeded at something, the paywall card. Every
 * step is skippable and skipping leads somewhere useful, never to a wall.
 *
 * Steps live in the hash (#/start/quiz) so the back button steps back.
 *
 *   welcome  the berry, one sentence, two buttons
 *   quiz     createQuiz over the seed corpus; elapsed seconds come from a
 *            performance.now() taken when the quiz mounted, because the
 *            machine reads no clock of its own
 *   placed   the recommendation, in the quiz's own voice
 *   tutorial the trainer, on the demo step, with the guidance strip on
 *   lesson   the first topic of the recommended track, free, no video gate
 *   paywall  a soft card with the comparison CLAUDE.md names (a fraction of a
 *            1200 dollar course). Copy and price are the human gate; what is
 *            here is the shape
 *
 * The paywall card is copy, not a gate. Nothing in this app checks an
 * entitlement on the client, per the non-negotiables.
 */

import { useMemo, useRef, useState } from "react";
import {
  ALL_COURSE_IDS,
  SEED_CORPUS,
  createQuiz,
  reduceQuiz,
  topicDefinition,
  type AnswerState,
  type CourseId,
  type QuizState,
} from "@blueberry/curriculum";
import { Press } from "../app/ui/Press";
import { Card, Pill } from "../app/ui/Card";
import { hrefForOnboarding, hrefForTab } from "../app/routes";
import { navigate } from "../app/useHashRoute";
import { progress } from "../app/progress";
import { useProgress } from "../app/hooks";
import { Berry } from "../mascot/Berry";
import { ProblemView } from "../lesson/ProblemView";
import { LessonPlayer } from "../lesson/LessonPlayer";
import { COURSE_LABEL, problemsForTopic } from "../tabs/courses/CoursesTab";
import { TrainerTab } from "../tabs/trainer/TrainerTab";

function finishOnboarding(to: string): void {
  progress.finishOnboarding();
  navigate(to);
}

function Welcome({ reducedMotion }: { readonly reducedMotion: boolean }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-6 p-6 text-center">
      <Berry behaviour="wave" mood="happy" reducedMotion={reducedMotion} sizePx={140} />
      <h1 className="title-face text-scale-display font-semibold leading-tight">Blueberry</h1>
      <p className="text-scale-lg text-muted-foreground">
        Chemistry you do, not chemistry you watch. Eight real questions place you on a track in
        under three minutes.
      </p>
      <Press className="w-full" onPointerDown={() => navigate(hrefForOnboarding("quiz"))}>
        Find my starting point
      </Press>
      <button type="button" className="press min-h-11 text-scale-sm font-semibold text-muted-foreground" onPointerDown={() => navigate(hrefForOnboarding("tutorial"))}>
        Skip, take me to a mechanism
      </button>
    </div>
  );
}

function Quiz({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const [claimed, setClaimed] = useState<CourseId | null | "unset">("unset");
  const startedAt = useRef<number>(0);
  const [state, setState] = useState<QuizState | null>(null);

  const begin = (course: CourseId | null) => {
    setClaimed(course);
    startedAt.current = performance.now();
    setState(createQuiz({ problems: SEED_CORPUS, claimedCourse: course }));
  };

  const elapsed = () => Math.round((performance.now() - startedAt.current) / 1000);

  if (claimed === "unset" || state === null) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <h2 className="title-face text-scale-2xl font-semibold">What are you studying?</h2>
        <p className="text-scale-sm text-muted-foreground">The quiz starts there and adapts. Not sure is a fine answer.</p>
        <div className="grid grid-cols-1 gap-2">
          {ALL_COURSE_IDS.map((course) => (
            <Press key={course} variant="secondary" className="justify-start" onPointerDown={() => begin(course)}>
              {COURSE_LABEL[course]}
            </Press>
          ))}
          <Press variant="ghost" onPointerDown={() => begin(null)}>
            Not sure, place me
          </Press>
        </div>
      </div>
    );
  }

  if (state.phase === "finished" && state.recommendation !== null) {
    const recommendation = state.recommendation;
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
        <Berry behaviour="bounce" mood="proud" reducedMotion={reducedMotion} sizePx={96} className="self-center" />
        <h2 className="title-face text-scale-2xl font-semibold text-center">{COURSE_LABEL[recommendation.course]}</h2>
        <p className="text-scale-base text-muted-foreground">{recommendation.copy}</p>
        <Card>
          <h3 className="text-scale-sm font-semibold text-muted-foreground">Start at</h3>
          <ul className="mt-1 flex flex-wrap gap-2">
            {recommendation.startTopics.map((topic) => (
              <li key={topic}>
                <Pill tone="primary">{topicDefinition(topic).label}</Pill>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-scale-xs text-muted-foreground">
            {recommendation.questionsAsked} questions, {state.elapsedSeconds} seconds, confidence {recommendation.confidence}.
          </p>
        </Card>
        <Press
          onPointerDown={() => {
            progress.setCourse(recommendation.course, recommendation.startTopics);
            navigate(hrefForOnboarding("tutorial"));
          }}
        >
          Try a mechanism
        </Press>
      </div>
    );
  }

  const problem = SEED_CORPUS.find((candidate) => candidate.id === state.currentProblem);
  if (problem === undefined) return null;

  const submit = (answer: AnswerState) => setState(reduceQuiz(state, { kind: "answerSubmitted", state: answer, elapsedSeconds: elapsed() }));
  const skip = () => setState(reduceQuiz(state, { kind: "skipped", elapsedSeconds: elapsed() }));

  return (
    <div className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between">
        <span className="text-scale-sm font-semibold text-muted-foreground">Question {state.asked.length + 1}</span>
        <button type="button" className="press min-h-11 px-2 text-scale-sm font-semibold text-muted-foreground" onPointerDown={skip}>
          Skip
        </button>
      </header>
      <Card className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <p className="text-scale-lg font-medium leading-relaxed">{problem.prompt}</p>
          <Berry mood="focused" reducedMotion={reducedMotion} sizePx={48} className="shrink-0" />
        </div>
        <ProblemView key={problem.id} problem={problem} locked={false} onSubmit={submit} onSkip={skip} />
      </Card>
      <button type="button" className="press min-h-11 self-center text-scale-xs font-semibold text-muted-foreground" onPointerDown={() => navigate(hrefForOnboarding("tutorial"))}>
        Stop the quiz and try a mechanism instead
      </button>
    </div>
  );
}

function Tutorial({ reducedMotion }: { readonly reducedMotion: boolean }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <TrainerTab reducedMotion={reducedMotion} tutorial onSolved={() => navigate(hrefForOnboarding("lesson"))} />
      <div className="mx-auto flex w-full max-w-4xl justify-between p-4">
        <button type="button" className="press min-h-11 text-scale-sm font-semibold text-muted-foreground" onPointerDown={() => navigate(hrefForOnboarding("lesson"))}>
          Skip to a lesson
        </button>
        <button type="button" className="press min-h-11 text-scale-sm font-semibold text-muted-foreground" onPointerDown={() => finishOnboarding(hrefForTab("trainer"))}>
          Skip onboarding
        </button>
      </div>
    </div>
  );
}

function IntroLesson({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const snapshot = useProgress();
  const topic = useMemo(() => {
    const preferred = snapshot.startTopics.find((candidate) => problemsForTopic(candidate).length > 0);
    if (preferred !== undefined) return preferred;
    // The first topic the lesson player can actually serve, not the corpus's
    // first problem: the corpus opens on gas laws, whose numeric problems are
    // gated (CoursesTab's SERVED_KINDS), and a student who skipped the quiz
    // was landing on "No problems are authored for this topic yet".
    const served = SEED_CORPUS.find((candidate) => problemsForTopic(candidate.topic).length > 0);
    return served?.topic ?? null;
  }, [snapshot.startTopics]);

  if (topic === null) {
    finishOnboarding(hrefForTab("trainer"));
    return null;
  }
  return (
    <LessonPlayer
      topic={topic}
      problems={problemsForTopic(topic).slice(0, 4)}
      reducedMotion={reducedMotion}
      showVideo={false}
      onExit={() => finishOnboarding(hrefForTab("pathway"))}
      onFinished={() => navigate(hrefForOnboarding("paywall"))}
    />
  );
}

function Paywall({ reducedMotion }: { readonly reducedMotion: boolean }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6">
      <Berry behaviour="celebrate" mood="cheer" reducedMotion={reducedMotion} sizePx={110} className="self-center" />
      <h2 className="title-face text-scale-2xl font-semibold text-center">You just did real chemistry.</h2>
      <p className="text-scale-base text-muted-foreground">
        The tutorial, the introductory lessons, the periodic table and five problems a day stay
        free, always. The full pathway, every mechanism cycle and the reaction database cost a
        fraction of what a summer course does.
      </p>
      <Card className="flex flex-col gap-1">
        <span className="text-scale-sm font-semibold text-muted-foreground">Owner decision pending</span>
        <p className="text-scale-sm text-muted-foreground">
          Price, trial and framing are set at the Phase 5 human gate. This card is the shape, not
          the offer, and nothing in the app checks it: the server enforces the free tier in Phase 6.
        </p>
      </Card>
      <Press variant="reward" onPointerDown={() => finishOnboarding(hrefForTab("pathway"))}>
        See my pathway
      </Press>
      <button type="button" className="press min-h-11 text-scale-sm font-semibold text-muted-foreground" onPointerDown={() => finishOnboarding(hrefForTab("trainer"))}>
        Keep going free
      </button>
    </div>
  );
}

export default function Onboarding({ step, reducedMotion }: { readonly step: string; readonly reducedMotion: boolean }) {
  switch (step) {
    case "quiz":
      return <Quiz reducedMotion={reducedMotion} />;
    case "tutorial":
      return <Tutorial reducedMotion={reducedMotion} />;
    case "lesson":
      return <IntroLesson reducedMotion={reducedMotion} />;
    case "paywall":
      return <Paywall reducedMotion={reducedMotion} />;
    default:
      return <Welcome reducedMotion={reducedMotion} />;
  }
}
