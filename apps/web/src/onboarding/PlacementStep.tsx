/**
 * The placement quiz, drawn to blueberry_r9-onboard-placement and wired to the
 * quiz machine that already exists in packages/curriculum.
 *
 * NOTHING ABOUT PLACEMENT IS DECIDED HERE. `createQuiz` and `reduceQuiz` own
 * which topic gets probed next, when the walk goes backwards, when it stops,
 * and what the recommendation is. This file supplies three things the machine
 * deliberately does not have: a rendering, a pick, and a NUMBER OF SECONDS.
 *
 * THE CLOCK, and it is the part worth reading twice. The machine reads no clock
 * of its own; elapsed seconds arrive as event data (see the machine's header,
 * and LOG.md's "The instruments that only worked before dark"). The clock this
 * file starts is `performance.now()`, which is MONOTONIC and has no calendar in
 * it: nothing here branches on the hour, the date or the timezone, so this
 * screen behaves identically at 9am and at 11pm and a test can drive it without
 * seeding a clock. The wall clock never enters the placement.
 *
 * The timer starts when the student presses start, not when the step mounts.
 * The Budgets row is "onboarding quiz, time to a course recommendation: under 3
 * minutes", and a stopwatch that runs while the student reads what the quiz is
 * would be measuring the wrong thing and reporting a number that flatters us.
 *
 * THE SHAPES. The image draws a 2x2 of option tiles, which is the multiple
 * choice and major product shape and covers 100 of the seed corpus's 158
 * problems. The other five answer kinds are not this frame's to invent a layout
 * for, so they are handed to the lesson's own ProblemView inside the same
 * frame. That import is one-way and read-only: the lesson surface belongs to
 * another builder and nothing here edits it.
 *
 * MAJOR PRODUCT NEEDS BOTH PICKS BEFORE CHECK IS LIVE, and that is a
 * correctness decision rather than a design one. `checkMajorProduct` grades a
 * product picked with no ranking argument as WRONG (`right_product_wrong_reason`,
 * detail "product selected with no ranking argument"). Letting CHECK fire on
 * the product alone would feed the placement walk a wrong answer the student
 * was never asked to avoid, and the walk would then probe backwards on a gap
 * that is not there. So the gate is both.
 */

import { useMemo, useRef, useState } from "react";
import {
  QUESTION_CAP,
  SEED_CORPUS,
  createQuiz,
  reduceQuiz,
  type AnswerState,
  type CourseId,
  type Problem,
  type QuizState,
  type Recommendation,
} from "@blueberry/curriculum";
import { Berry } from "../mascot/Berry";
import { ProblemView } from "../lesson/ProblemView";
import { Action, ChipList, Frame, SkipAction } from "./Frame";
import { tileIsDense, twoColumnGrid, progressPercent } from "./flow";
import {
  CONTINUE,
  PLACEMENT_CHECK,
  PLACEMENT_COUNTER,
  PLACEMENT_DONE_ASK,
  PLACEMENT_INTRO_ASK,
  PLACEMENT_REASON_ASK,
  PLACEMENT_SKIP_QUESTION,
  PLACEMENT_SKIPPED_ASK,
  PLACEMENT_START,
  fill,
  withoutMark,
} from "./copy";
import "./onboarding.css";

/** What the student has picked on the current question, before CHECK. */
interface Pick {
  readonly optionId: string | null;
  readonly reasonId: string | null;
}

const NOTHING_PICKED: Pick = Object.freeze({ optionId: null, reasonId: null });

export interface PlacementStepProps {
  readonly claimedCourse: CourseId | null;
  readonly reducedMotion: boolean;
  readonly onBack: () => void;
  /**
   * The walk finished. The recommendation may be null when the student skipped
   * every question, which is a real outcome and not an error; choose-your-start
   * falls back to the claimed course in that case (see flow.resolveStart).
   */
  readonly onDone: (recommendation: Recommendation | null) => void;
}

export function PlacementStep({ claimedCourse, reducedMotion, onBack, onDone }: PlacementStepProps) {
  const [state, setState] = useState<QuizState | null>(null);
  const [pick, setPick] = useState<Pick>(NOTHING_PICKED);
  const startedAt = useRef<number>(0);

  const begin = () => {
    startedAt.current = performance.now();
    setPick(NOTHING_PICKED);
    setState(createQuiz({ problems: SEED_CORPUS, claimedCourse }));
  };

  const elapsed = () => Math.round((performance.now() - startedAt.current) / 1000);

  const advance = (event: Parameters<typeof reduceQuiz>[1]) => {
    setState((current) => (current === null ? current : reduceQuiz(current, event)));
    setPick(NOTHING_PICKED);
  };

  const submit = (answer: AnswerState) =>
    advance({ kind: "answerSubmitted", state: answer, elapsedSeconds: elapsed() });
  const skip = () => advance({ kind: "skipped", elapsedSeconds: elapsed() });

  const asked = state?.asked.length ?? 0;
  const percent = progressPercent("placement", asked);

  /* ---------------------------------------------------------------- */
  /* Before the stopwatch starts                                       */
  /* ---------------------------------------------------------------- */

  if (state === null) {
    return (
      <Frame
        percent={percent}
        onBack={onBack}
        foot={<Action label={PLACEMENT_START} onPress={begin} />}
      >
        {/* THE CENTRED HERO, not the small [berry][bubble] row the question
            steps use, and the reason is what this screen holds. A question
            step's row is small because four chips sit under it; this screen
            has nothing under it at all, and the row left three quarters of the
            page empty above a lone button. Same two objects, composed for a
            screen whose whole job is one sentence and one press. It is the
            welcome beat's composition, which the goal images already draw for
            exactly that case. */}
        <div className="ob-welcome">
          <div className="ob-welcome__hero">
            <Berry behaviour="idle" mood="curious" reducedMotion={reducedMotion} sizePx={132} />
            <p className="ob-bubble ob-welcome__bubble">{withoutMark(PLACEMENT_INTRO_ASK)}</p>
          </div>
        </div>
      </Frame>
    );
  }

  /* ---------------------------------------------------------------- */
  /* Finished                                                          */
  /* ---------------------------------------------------------------- */

  if (state.phase === "finished") {
    const recommendation = state.recommendation;
    return (
      <Frame
        percent={percent}
        onBack={onBack}
        foot={<Action label={CONTINUE} onPress={() => onDone(recommendation)} />}
      >
        {/* A student who skipped every question has no starting point to be
            shown, and "that is your starting point" would then be a sentence
            about nothing. The skipped line names what happens instead, plainly
            and without treating the skipping as a failure. */}
        <div className="ob-welcome">
          <div className="ob-welcome__hero">
            <Berry behaviour="wave" mood="happy" reducedMotion={reducedMotion} sizePx={132} />
            <p className="ob-bubble ob-welcome__bubble">
              {withoutMark(recommendation === null ? PLACEMENT_SKIPPED_ASK : PLACEMENT_DONE_ASK)}
            </p>
          </div>
        </div>
      </Frame>
    );
  }

  const problem = SEED_CORPUS.find((candidate) => candidate.id === state.currentProblem);
  // The machine only leaves `currentProblem` null in the finished phase, which
  // the branch above has already taken. This is the impossible case made
  // harmless rather than a crash on the first screen a student ever sees.
  if (problem === undefined) {
    return (
      <Frame
        percent={percent}
        onBack={onBack}
        foot={<Action label={CONTINUE} onPress={() => onDone(state.recommendation)} />}
      >
        <div className="ob-welcome">
          <div className="ob-welcome__hero">
            <Berry behaviour="wave" mood="happy" reducedMotion={reducedMotion} sizePx={132} />
            <p className="ob-bubble ob-welcome__bubble">{withoutMark(PLACEMENT_DONE_ASK)}</p>
          </div>
        </div>
      </Frame>
    );
  }

  return (
    <Question
      problem={problem}
      percent={percent}
      asked={asked}
      pick={pick}
      reducedMotion={reducedMotion}
      onBack={onBack}
      onPick={setPick}
      onSubmit={submit}
      onSkip={skip}
    />
  );
}

/* ------------------------------------------------------------------ */
/* One question                                                        */
/* ------------------------------------------------------------------ */

function Question({
  problem,
  percent,
  asked,
  pick,
  reducedMotion,
  onBack,
  onPick,
  onSubmit,
  onSkip,
}: {
  readonly problem: Problem;
  readonly percent: number;
  readonly asked: number;
  readonly pick: Pick;
  readonly reducedMotion: boolean;
  readonly onBack: () => void;
  readonly onPick: (pick: Pick) => void;
  readonly onSubmit: (state: AnswerState) => void;
  readonly onSkip: () => void;
}) {
  const answer = problem.answer;
  const counter = fill(PLACEMENT_COUNTER, { n: asked + 1, total: QUESTION_CAP });

  const options = useMemo(() => {
    if (answer.kind === "multiple_choice") return answer.options;
    if (answer.kind === "major_product") return answer.candidates;
    return null;
  }, [answer]);

  const reasons = answer.kind === "major_product" ? answer.reasons : null;

  /*
   * WHETHER THIS QUESTION GETS THE PICTURE-FIRST LAYOUT.
   *
   * blueberry_r9-onboard-placement draws a 2x2 of tiles, each one a drawn
   * structure over a short caption, and that composition only holds when there
   * are four options and each caption is a few words. An option that is a full
   * sentence has no picture in it and no room for one, so it renders as the
   * row it already is. Same predicate as the grid, because it is the same
   * question asked once: is this option a NAME for something, or is it prose.
   */
  const tiled = twoColumnGrid(options ?? []);

  const ready =
    answer.kind === "multiple_choice"
      ? pick.optionId !== null
      : answer.kind === "major_product"
        ? pick.optionId !== null && pick.reasonId !== null
        : false;

  const check = () => {
    if (answer.kind === "multiple_choice" && pick.optionId !== null) {
      onSubmit({ kind: "multiple_choice", optionId: pick.optionId });
      return;
    }
    if (answer.kind === "major_product" && pick.optionId !== null && pick.reasonId !== null) {
      onSubmit({ kind: "major_product", candidateId: pick.optionId, reasonId: pick.reasonId });
    }
  };

  return (
    <Frame
      percent={percent}
      onBack={onBack}
      /* THE X, NOT THE CHEVRON. blueberry_r9-onboard-placement draws an X at
         the head of a placement question, and back from here does leave the
         quiz rather than step one question inside it, so the mark and the act
         agree. The screens before the stopwatch starts keep the chevron: back
         from those really is one step of the flow. */
      leading="leave"
      foot={
        options === null ? (
          <SkipAction label={PLACEMENT_SKIP_QUESTION} onPress={onSkip} />
        ) : (
          <>
            <div className="ob-peek">
              <Action label={PLACEMENT_CHECK} disabled={!ready} onPress={check} />
              {/* BIG, AND CROPPED BY THE SCREEN EDGE. The image draws Berry
                  around 180px rising from BEHIND the CHECK button and running
                  off the right of the screen. At 76px and fully inside the
                  button he read as an icon printed on it. onboarding.css puts
                  him past the button's right end and lets the page crop him. */}
              <Berry
                className="ob-peek__berry"
                behaviour="idle"
                mood="curious"
                reducedMotion={reducedMotion}
                sizePx={168}
              />
            </div>
            <SkipAction label={PLACEMENT_SKIP_QUESTION} onPress={onSkip} />
          </>
        )
      }
    >
      <p className="ob-kicker">{withoutMark(counter)}</p>
      <p className="ob-stem">{problem.prompt}</p>

      {options === null ? (
        // Numeric, reagents, structure, ordering and matching. The lesson's own
        // view already draws each of them and already submits the right
        // AnswerState; re-implementing five boards inside onboarding would be
        // two surfaces to keep in step for no gain.
        <div className="ob-handoff">
          <ProblemView key={problem.id} problem={problem} locked={false} onSubmit={onSubmit} onSkip={onSkip} />
        </div>
      ) : (
        <ChipList grid={tiled}>
          {options.map((option) => (
            <li key={option.id}>
              <Tile
                picked={pick.optionId === option.id}
                caption={option.text}
                pictureFirst={tiled}
                onPick={() => onPick({ optionId: option.id, reasonId: pick.reasonId })}
              />
            </li>
          ))}
        </ChipList>
      )}

      {reasons === null || pick.optionId === null ? null : (
        <>
          <p className="ob-substep">{withoutMark(PLACEMENT_REASON_ASK)}</p>
          {/* THE REASON HALF IS NEVER PICTURE-FIRST, and that is the rule
              read correctly rather than an exemption from it. "Option cards
              are pictures with captions" is about the THING being reasoned
              about. A ranking argument is not a thing, it is a sentence, and
              there is no structure that draws "the tertiary cation is more
              stable", so the reasons stay text tiles at every length. */}
          <ChipList grid={twoColumnGrid(reasons)}>
            {reasons.map((reason) => (
              <li key={reason.id}>
                <Tile
                  picked={pick.reasonId === reason.id}
                  caption={reason.text}
                  pictureFirst={false}
                  onPick={() => onPick({ optionId: pick.optionId, reasonId: reason.id })}
                />
              </li>
            ))}
          </ChipList>
        </>
      )}
    </Frame>
  );
}

/**
 * One periwinkle answer tile.
 *
 * WHAT THE GOAL IMAGE ASKS FOR, AND WHAT THIS CAN HONESTLY GIVE. Ruling 2 of
 * 2026-09-04 says "the image comes first and the name comes second... OPTION
 * CARDS ARE PICTURES WITH CAPTIONS, not captions with pictures", and
 * blueberry_r9-onboard-placement draws it: four periwinkle tiles, each a drawn
 * carbocation over the words Methyl, Primary, Secondary and Tertiary.
 *
 * THE OPTION DATA CARRIES NO PICTURE, AND THAT IS A BLOCKER RATHER THAN A
 * CHOICE MADE HERE. `ChoiceOption` in packages/curriculum is `{ id, text }`
 * and its own comment says so in as many words: "a structure is referred to by
 * label here; rendering is Phase 4". `Problem` has no figure field either. No
 * option and no problem anywhere in SEED_CORPUS carries a SMILES, an atom list
 * or a figure, so there is nothing on this side of the boundary to draw. A
 * structure derived from an option's words would be a structure this shell
 * invented, and inventing chemistry in a shell is how a student is taught the
 * wrong molecule. It is reported upward rather than worked around; the fix is
 * a figure field on ChoiceOption and Problem, authored and reviewed in
 * packages/curriculum, which this builder does not own.
 *
 * WHAT REPLACED THE PLACEHOLDER, and why the placeholder had to go. The
 * previous pass drew a dashed frame containing a generic picture-frame glyph,
 * identical on all four tiles, borrowing ruling 4's queued treatment. Ruling 4
 * is about a pathway NODE with no authored content, and a critic was right
 * that it is not a licence to ship a question whose visual is four copies of
 * the same empty frame: four identical marks over four different answers teach
 * a student nothing and cost the tile its whole face.
 *
 * So the tile draws the OPTION ITSELF as its subject: the words, set large and
 * centred in the content face on the periwinkle field, which is the image's
 * composition, weight and colour with the one thing missing that the data does
 * not have. The tile is marked `data-visual="name"` so the gap is countable
 * from outside rather than being visible only to whoever reads this comment,
 * and it becomes `"figure"` on the day an option carries one.
 *
 * Periwinkle because DESIGN-GOALS makes it the LESSON colour and this is the
 * first lesson-shaped thing a student touches. `data-stacking` is the sticker
 * audit's opt-in for the stacked edge.
 */
function Tile({
  picked,
  caption,
  pictureFirst,
  onPick,
}: {
  readonly picked: boolean;
  /** The option's own words. */
  readonly caption: string;
  /** True in the 2x2, where the tile is tall and the words are its subject. */
  readonly pictureFirst: boolean;
  readonly onPick: () => void;
}) {
  return (
    <button
      type="button"
      className="ob-tile"
      aria-pressed={picked}
      data-visual="name"
      data-stacking=""
      onClick={onPick}
    >
      <span
        className="ob-tile__caption"
        data-layout={pictureFirst ? "tile" : "row"}
        data-dense={pictureFirst && tileIsDense(caption) ? "true" : "false"}
      >
        {caption}
      </span>
    </button>
  );
}
