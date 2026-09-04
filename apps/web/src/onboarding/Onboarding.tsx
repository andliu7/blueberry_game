/**
 * Onboarding: eight screens over the seven step capture mapping, on one shared
 * frame.
 *
 * THE MAPPING, which is flow.ts's STEP_IDS and not a list invented here:
 * two welcome beats, how-did-you-hear (skippable), what brings you, THE
 * PLACEMENT QUIZ, the achieve overview, the daily goal, and choose your start.
 *
 * STEPS LIVE IN THE HASH. `#/start/why` is a real URL, the browser back button
 * steps back through the flow, and a deep link into the middle lands on a
 * screen that renders. The file this replaces did that and it was right; what
 * has changed is only which steps exist. Legacy hashes from that file
 * (`quiz`, `tutorial`, `lesson`, `paywall`) are still in students' history and
 * still resolve, mapped in flow.ts to the nearest surviving stage, because
 * CLAUDE.md's amendment says every route resolves.
 *
 * WHERE THE ANSWERS LIVE, and why not in the hash with the step. The step is in
 * the URL because the back button is a navigation gesture; the answers are in
 * React state because they are not. Putting four picks in the query string
 * would make every chip tap a history entry, and back would then walk pick by
 * pick instead of screen by screen, which is the opposite of what a student
 * pressing back means. The component stays mounted across a hash change (App
 * renders one <Onboarding> and passes the step down), so state survives a step
 * and a reload starts clean with CONTINUE gated, which is the honest fallback.
 *
 * ALL COPY IS PLACEHOLDER. Every sentence comes from copy.ts and every one of
 * them carries "[HUMAN GATE]". CLAUDE.md rules the onboarding funnel a human
 * gate rather than a loop, so the flow and the frames are the deliverable and
 * the words are the owner's.
 *
 * WHAT THIS FILE WRITES. Exactly three things, all at the last screen and all
 * at once: the course and start topics, the daily goal, and the
 * onboarding-done flag. Nothing here checks an entitlement and nothing here
 * decides an unlock; per the non-negotiables that is server side, and the
 * progress store is a local record of what the student chose.
 */

import { useMemo, useState, type ReactElement } from "react";
import { topicDefinition, type Recommendation } from "@blueberry/curriculum";
import type { DailyGoalTier } from "@blueberry/economy";
import { hrefForOnboarding, hrefForTab } from "../app/routes";
import { navigate } from "../app/useHashRoute";
import { progress } from "../app/progress";
import { Berry } from "../mascot/Berry";
import { Action, Ask, Chip, ChipList, Frame, QuietAction, SkipAction } from "./Frame";
import { PlacementStep } from "./PlacementStep";
import {
  EMPTY_ANSWERS,
  GOAL_CHARGE_CAP,
  HEAR_CHOICES,
  ONBOARDING_GOAL_TIERS,
  START_CHOICES,
  WHY_CHOICES,
  blockOfTopic,
  canContinue,
  claimedCourseForWhy,
  goalChargeCost,
  goalLessonsPerDay,
  goalXp,
  isSkippable,
  nextStep,
  normalizeStep,
  overviewBlocks,
  prevStep,
  progressPercent,
  resolveStart,
  type FlowAnswers,
  type HearChoice,
  type StartChoice,
  type StepId,
  type WhyChoice,
} from "./flow";
import {
  CONTINUE,
  GOAL_ASK,
  GOAL_LABEL,
  GOAL_NOTE,
  GOAL_PACING_LINE,
  GOAL_XP_LINE,
  HEAR_ASK,
  HEAR_LABEL,
  HEAR_NOTE,
  HEAR_SKIP,
  INTRO_ASK,
  INTRO_NOTE,
  OVERVIEW_ASK,
  OVERVIEW_ASSUMES_LABEL,
  OVERVIEW_NOTE,
  OVERVIEW_TOPICS_LABEL,
  START_ASK,
  START_FINISH,
  START_LABEL,
  START_NOTE,
  WELCOME_GREETING,
  WELCOME_PROMISE,
  WELCOME_RETURNING,
  WELCOME_START,
  WHY_ASK,
  WHY_LABEL,
  fill,
} from "./copy";
import {
  EllipsisIcon,
  FlaskIcon,
  FriendsIcon,
  GoalBarsIcon,
  LifeRingIcon,
  PhoneIcon,
  ProfessorIcon,
  ResumeIcon,
  RewindIcon,
  SearchIcon,
  SocialIcon,
  SparkleIcon,
  StethoscopeIcon,
  WelcomeHorizon,
} from "./icons";
import "./onboarding.css";

/* ------------------------------------------------------------------ */
/* The icon per choice. Motifs are the goal image's.                   */
/* ------------------------------------------------------------------ */

const WHY_ICON: Readonly<Record<WhyChoice, () => ReactElement>> = Object.freeze({
  orgo2_exam: () => <FlaskIcon width="100%" height="100%" />,
  dat_mcat: () => <StethoscopeIcon width="100%" height="100%" />,
  surviving: () => <LifeRingIcon width="100%" height="100%" />,
  curious: () => <SparkleIcon width="100%" height="100%" />,
});

const HEAR_ICON: Readonly<Record<HearChoice, () => ReactElement>> = Object.freeze({
  friend: () => <FriendsIcon width="100%" height="100%" />,
  social: () => <SocialIcon width="100%" height="100%" />,
  search: () => <SearchIcon width="100%" height="100%" />,
  professor: () => <ProfessorIcon width="100%" height="100%" />,
  app_store: () => <PhoneIcon width="100%" height="100%" />,
  other: () => <EllipsisIcon width="100%" height="100%" />,
});

const START_ICON: Readonly<Record<StartChoice, () => ReactElement>> = Object.freeze({
  placement: () => <ResumeIcon width="100%" height="100%" />,
  beginning: () => <RewindIcon width="100%" height="100%" />,
});

/* ------------------------------------------------------------------ */
/* The router                                                          */
/* ------------------------------------------------------------------ */

export default function Onboarding({
  step: rawStep,
  reducedMotion,
}: {
  readonly step: string;
  readonly reducedMotion: boolean;
}) {
  const step = normalizeStep(rawStep);
  const [answers, setAnswers] = useState<FlowAnswers>(EMPTY_ANSWERS);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(null);

  const go = (to: StepId) => navigate(hrefForOnboarding(to));
  const back = () => {
    const previous = prevStep(step);
    if (previous !== null) go(previous);
  };
  const forward = () => {
    const next = nextStep(step);
    if (next !== null) go(next);
  };

  const set = (patch: Partial<FlowAnswers>) => setAnswers((current) => ({ ...current, ...patch }));

  const percent = progressPercent(step);
  const onBack = prevStep(step) === null ? null : back;
  const claimedCourse = claimedCourseForWhy(answers.why);

  /**
   * The last screen. Everything the flow gathered is committed here in one go,
   * then the shell takes over. `finishOnboarding` last, because it is the flag
   * App.tsx watches to stop redirecting back into this flow, and flipping it
   * before the course was written would race the redirect against the write.
   */
  const finish = () => {
    const start = resolveStart(answers.start ?? "beginning", recommendation, claimedCourse);
    progress.setCourse(start.course, start.startTopics);
    if (answers.goal !== null) progress.setSettings({ dailyGoal: answers.goal });
    progress.finishOnboarding();
    navigate(hrefForTab("pathway"));
  };

  switch (step) {
    case "welcome":
      return <Welcome percent={percent} reducedMotion={reducedMotion} onStart={forward} />;

    case "intro":
      return <Bond percent={percent} reducedMotion={reducedMotion} onBack={onBack} onGo={forward} />;

    case "hear":
      return (
        <ChoiceStep
          percent={percent}
          ask={HEAR_ASK}
          note={HEAR_NOTE}
          reducedMotion={reducedMotion}
          onBack={onBack}
          choices={HEAR_CHOICES}
          label={(choice) => HEAR_LABEL[choice]}
          icon={(choice) => HEAR_ICON[choice]()}
          picked={answers.hear}
          onPick={(choice) => set({ hear: choice })}
          canGo={canContinue(step, answers)}
          onGo={forward}
          // The one skippable step, per flow.SKIPPABLE_STEPS. Skipping leads
          // onward, never to a wall: it is analytics and nothing branches on it.
          skip={isSkippable(step) ? { label: HEAR_SKIP, onPress: forward } : null}
        />
      );

    case "why":
      return (
        <ChoiceStep
          percent={percent}
          ask={WHY_ASK}
          note={null}
          reducedMotion={reducedMotion}
          onBack={onBack}
          choices={WHY_CHOICES}
          label={(choice) => WHY_LABEL[choice]}
          icon={(choice) => WHY_ICON[choice]()}
          picked={answers.why}
          onPick={(choice) => set({ why: choice })}
          canGo={canContinue(step, answers)}
          onGo={forward}
          skip={null}
        />
      );

    case "placement":
      return (
        <PlacementStep
          claimedCourse={claimedCourse}
          reducedMotion={reducedMotion}
          onBack={back}
          onDone={(result) => {
            setRecommendation(result);
            forward();
          }}
        />
      );

    case "overview":
      return (
        <Overview
          percent={percent}
          reducedMotion={reducedMotion}
          recommendation={recommendation}
          claimedCourse={claimedCourse}
          onBack={onBack}
          onGo={forward}
        />
      );

    case "goal":
      return (
        <ChoiceStep
          percent={percent}
          ask={GOAL_ASK}
          note={GOAL_NOTE}
          reducedMotion={reducedMotion}
          onBack={onBack}
          choices={ONBOARDING_GOAL_TIERS}
          label={(tier) => GOAL_LABEL[tier]}
          meta={(tier) =>
            `${fill(GOAL_XP_LINE, { n: goalXp(tier) })} - ${fill(GOAL_PACING_LINE, {
              n: goalLessonsPerDay(tier),
              c: goalChargeCost(tier),
              cap: GOAL_CHARGE_CAP,
            })}`
          }
          icon={(tier) => (
            <GoalBarsIcon width="100%" height="100%" filled={ONBOARDING_GOAL_TIERS.indexOf(tier) + 1} />
          )}
          picked={answers.goal}
          onPick={(tier) => set({ goal: tier })}
          canGo={canContinue(step, answers)}
          onGo={forward}
          skip={null}
        />
      );

    case "start":
      return (
        <ChoiceStep
          percent={percent}
          ask={START_ASK}
          note={START_NOTE}
          reducedMotion={reducedMotion}
          onBack={onBack}
          choices={START_CHOICES}
          label={(choice) => START_LABEL[choice]}
          icon={(choice) => START_ICON[choice]()}
          picked={answers.start}
          onPick={(choice) => set({ start: choice })}
          canGo={canContinue(step, answers)}
          goLabel={START_FINISH}
          onGo={finish}
          skip={null}
        />
      );

    default: {
      // StepId is a closed union and every member is handled above. The
      // annotation is what makes adding a step a compile error here rather
      // than a blank screen a student finds.
      const unreachable: never = step;
      return <>{unreachable}</>;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Welcome                                                             */
/* ------------------------------------------------------------------ */

/**
 * The welcome beat, per blueberry_r9-onboard-welcome: the bar already at its
 * first notch, Berry large and centred with a greeting bubble beside it, the
 * one line promise, the horizon behind it, GET STARTED and the returning
 * student link.
 *
 * The returning-student link points at the pathway rather than at a sign-in
 * screen, because there is no auth surface until Phase 6 and a link into
 * nothing is the dead end CLAUDE.md forbids. It skips the flow, which is what
 * a returning student is asking for, and it is marked here as the thing to
 * repoint the day sign-in exists.
 */
function Welcome({
  percent,
  reducedMotion,
  onStart,
}: {
  readonly percent: number;
  readonly reducedMotion: boolean;
  readonly onStart: () => void;
}) {
  const enterReturning = () => {
    progress.finishOnboarding();
    navigate(hrefForTab("pathway"));
  };
  return (
    <Frame
      percent={percent}
      onBack={null}
      foot={
        <>
          <Action label={WELCOME_START} onPress={onStart} />
          <QuietAction label={WELCOME_RETURNING} onPress={enterReturning} />
        </>
      }
    >
      <div className="ob-welcome">
        <div className="ob-welcome__hero">
          <Berry behaviour="wave" mood="happy" reducedMotion={reducedMotion} sizePx={150} />
          <p className="ob-bubble ob-welcome__bubble">{WELCOME_GREETING}</p>
        </div>
        <p className="ob-promise">{WELCOME_PROMISE}</p>
        <WelcomeHorizon className="ob-welcome__horizon" />
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* The bonding beat                                                    */
/* ------------------------------------------------------------------ */

/**
 * THE SCREEN THAT ONLY BONDS. This one is in the flow on purpose and it is the
 * one a later pass will be tempted to cut, so the reason is written here.
 *
 * docs/THREE-TEACHERS.md, the Duolingo funnel list: "SCREENS THAT ONLY BOND.
 * At least one onboarding screen teaches nothing and exists so the mascot is a
 * relationship rather than a UI element." This is that screen. It asks nothing,
 * grades nothing, records nothing and branches on nothing. Berry is large and
 * he waves, the student presses CONTINUE, and the only thing that happened is
 * that they met him.
 *
 * It is the SECOND beat rather than the first because the first screen has a
 * job (start the flow) and this one deliberately has none. Cutting it would
 * shorten the funnel by one screen and cost the mascot the only moment in the
 * product where he is not attached to a task.
 *
 * `onboardingFlow.test.ts` asserts that a bonding step exists and that it
 * carries no choice, so removing it fails a test rather than passing quietly.
 */
function Bond({
  percent,
  reducedMotion,
  onBack,
  onGo,
}: {
  readonly percent: number;
  readonly reducedMotion: boolean;
  readonly onBack: (() => void) | null;
  readonly onGo: () => void;
}) {
  return (
    <Frame percent={percent} onBack={onBack} foot={<Action label={CONTINUE} onPress={onGo} />}>
      <div className="ob-welcome">
        <div className="ob-welcome__hero">
          <Berry behaviour="wave" mood="happy" reducedMotion={reducedMotion} sizePx={150} />
          <p className="ob-bubble ob-welcome__bubble">{INTRO_ASK}</p>
        </div>
        <p className="ob-note ob-note--centre">{INTRO_NOTE}</p>
      </div>
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* The question step, which is four of the eight screens               */
/* ------------------------------------------------------------------ */

/**
 * One question: Berry asks, chips answer, CONTINUE is off until one is picked.
 *
 * Generic over the choice type so hear, why, goal and start are the same
 * screen with different data rather than four near-copies. The gate comes from
 * `canContinue` in flow.ts, so what CONTINUE is waiting for is stated once, in
 * a pure function a test can drive, and never re-derived in JSX.
 */
function ChoiceStep<T extends string>({
  percent,
  ask,
  note,
  reducedMotion,
  onBack,
  choices,
  label,
  meta,
  icon,
  picked,
  onPick,
  canGo,
  goLabel = CONTINUE,
  onGo,
  skip,
}: {
  readonly percent: number;
  readonly ask: string;
  readonly note: string | null;
  readonly reducedMotion: boolean;
  readonly onBack: (() => void) | null;
  readonly choices: readonly T[];
  readonly label: (choice: T) => string;
  readonly meta?: (choice: T) => string;
  readonly icon: (choice: T) => ReactElement;
  readonly picked: T | null;
  readonly onPick: (choice: T) => void;
  readonly canGo: boolean;
  readonly goLabel?: string;
  readonly onGo: () => void;
  readonly skip: { readonly label: string; readonly onPress: () => void } | null;
}) {
  return (
    <Frame
      percent={percent}
      onBack={onBack}
      foot={
        <>
          <Action label={goLabel} disabled={!canGo} onPress={onGo} />
          {skip === null ? null : <SkipAction label={skip.label} onPress={skip.onPress} />}
        </>
      }
    >
      <Ask line={ask} reducedMotion={reducedMotion} />
      <ChipList>
        {choices.map((choice) => (
          <li key={choice}>
            <Chip
              picked={picked === choice}
              label={label(choice)}
              meta={meta === undefined ? null : meta(choice)}
              icon={icon(choice)}
              onPick={() => onPick(choice)}
            />
          </li>
        ))}
      </ChipList>
      {note === null ? null : <p className="ob-note">{note}</p>}
    </Frame>
  );
}

/* ------------------------------------------------------------------ */
/* The achieve overview                                                */
/* ------------------------------------------------------------------ */

/**
 * What the course is, act by act, and where the placement put you in it.
 *
 * EVERY WORD OF CHEMISTRY HERE IS READ, NEVER TYPED. The act labels and the
 * "what this act assumes and never re-teaches" lines come from `ACTS` in
 * packages/curriculum, which is docs/COURSE-OUTLINE-ORGO2.md section 2 mined
 * into data; the topic names come from `TOPICS`. Retyping either into this
 * component would create a second source of truth that goes stale the first
 * time a topic changes act, and CLAUDE.md names that outline as authoritative.
 *
 * The start topics are marked in place rather than listed separately, so
 * "where you land" is a position in the whole course and not a second list a
 * student has to reconcile with the first.
 */
function Overview({
  percent,
  reducedMotion,
  recommendation,
  claimedCourse,
  onBack,
  onGo,
}: {
  readonly percent: number;
  readonly reducedMotion: boolean;
  readonly recommendation: Recommendation | null;
  readonly claimedCourse: ReturnType<typeof claimedCourseForWhy>;
  readonly onBack: (() => void) | null;
  readonly onGo: () => void;
}) {
  const course = recommendation?.course ?? claimedCourse ?? "orgo_2";
  const blocks = useMemo(() => overviewBlocks(course), [course]);
  const starts = recommendation?.startTopics ?? [];
  const startBlocks = useMemo(
    () => new Set(starts.map((topic) => blockOfTopic(blocks, topic)).filter((id) => id !== null)),
    [blocks, starts],
  );

  return (
    <Frame
      percent={percent}
      onBack={onBack}
      foot={<Action label={CONTINUE} onPress={onGo} />}
    >
      <Ask line={OVERVIEW_ASK} reducedMotion={reducedMotion} />
      <ul className="ob-acts">
        {blocks.map((block) => (
          <li key={block.id} className="ob-act">
            <div className="ob-act__top">
              <span className="ob-act__label">{block.label}</span>
              <span className="ob-act__count">
                {block.topics.length} {OVERVIEW_TOPICS_LABEL}
              </span>
            </div>
            <ul className="ob-act__topics">
              {block.topics.map((topic) => (
                <li
                  key={topic}
                  className="ob-act__topic"
                  data-start={starts.includes(topic) ? "true" : "false"}
                >
                  {topicDefinition(topic).label}
                </li>
              ))}
            </ul>
            {block.assumes === null || !startBlocks.has(block.id) ? null : (
              <p className="ob-act__assumes">
                {OVERVIEW_ASSUMES_LABEL}: {block.assumes}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="ob-note">{OVERVIEW_NOTE}</p>
    </Frame>
  );
}
