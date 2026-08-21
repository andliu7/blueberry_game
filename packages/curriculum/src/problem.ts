/**
 * An authored problem, and the constructor that refuses a defective one.
 *
 * WHY THE CONSTRUCTOR THROWS. This is the repository's existing pattern:
 * chem-core's `createBond` refuses a bond from an atom to itself, because a
 * malformed structure that reaches a check produces a confusing failure a long
 * way from its cause. Everything `createProblem` refuses below is a defect an
 * author cannot find later by reading, and every one of them throws at the
 * moment the corpus module is imported, which is the earliest possible.
 *
 * The four refusals worth naming, because they are judgement calls rather than
 * type checks:
 *
 *   A DISTRACTOR THAT GRADES CORRECT. A predicted wrong answer that the checker
 *   marks right is either a second correct answer the author did not mean, or a
 *   bug in the checker. Both are worth stopping the build for. This is the single
 *   most useful check in this file: it runs the real checker over the real
 *   authored data every time the corpus loads, so a checker regression shows up
 *   as a corpus that will not import.
 *
 *   TWO DISTRACTORS AT THE SAME POINT. If two predicted wrong answers match each
 *   other, which explanation a student sees depends on authoring order. That is a
 *   coin flip wearing a teaching decision's clothes.
 *
 *   AN UNEXPLAINED OPTION ON A FINITE ANSWER SPACE. Multiple choice has four
 *   wrong answers and an author can write four explanations. Leaving one bare
 *   guarantees a Tier 3 hit that never had to happen, and CLAUDE.md's Budgets
 *   table gates the Tier 3 tail. Same rule for the candidate list on a major
 *   product problem. No other kind can be held to this, because no other kind has
 *   a finite answer space.
 *
 *   COPY THAT BREAKS THE VOICE CONTRACT. See explanation.ts. The lint is narrow
 *   and it is not a substitute for the human read.
 */

import { checkAnswer, statesMatch, type AnswerSpec, type AnswerState } from "./answer.js";
import type { CurriculumCauseId } from "./causes.js";
import { createExplanation, type Explanation } from "./explanation.js";
import type { DistractorId, LessonId, ProblemId } from "./ids.js";
import type { AnswerKind } from "./kinds.js";
import type { Tolerance } from "./answers/numeric.js";
import {
  isValidDifficulty,
  topicDefinition,
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  type CourseId,
  type Difficulty,
  type TopicId,
} from "./placement.js";

/**
 * Tier 2. One predicted wrong answer, with the explanation an instructor would
 * give the student who gave it.
 *
 * `state` is an `AnswerState` and not prose. See the note at the top of answer.ts
 * for why that is the whole point.
 */
export interface Distractor {
  readonly id: DistractorId;
  readonly state: AnswerState;
  readonly explanation: Explanation;
  /**
   * Optional classification, for counting which mistakes a corpus anticipates.
   * It never affects matching. Matching is on state.
   */
  readonly cause?: CurriculumCauseId;
  /** Numeric only. Widen the window this distractor catches. */
  readonly tolerance?: Tolerance;
}

export interface Problem {
  readonly id: ProblemId;
  /**
   * The course this problem is served in. It may differ from the topic's home
   * course: a DAT problem on gas laws is a DAT problem, and the topic still says
   * gas laws so mastery and the pathway graph stay in one place.
   */
  readonly course: CourseId;
  readonly topic: TopicId;
  /** See placement.ts. The number the Elo like rating moves against. */
  readonly difficulty: Difficulty;
  readonly prompt: string;
  readonly answer: AnswerSpec;
  readonly distractors: readonly Distractor[];
  /** Why the right answer is right. CLAUDE.md: a correct step says why it was right. */
  readonly solution: Explanation;
  readonly lesson?: LessonId;
  readonly tags: readonly string[];
}

export interface ProblemInput {
  readonly id: ProblemId;
  readonly course: CourseId;
  readonly topic: TopicId;
  readonly difficulty: Difficulty;
  readonly prompt: string;
  readonly answer: AnswerSpec;
  readonly solution: Explanation;
  readonly distractors?: readonly Distractor[];
  readonly lesson?: LessonId;
  readonly tags?: readonly string[];
}

export function answerKind(problem: Problem): AnswerKind {
  return problem.answer.kind;
}

export function createProblem(input: ProblemInput): Problem {
  if (input.id.trim() === "") throw new Error("a problem needs an id");
  if (input.prompt.trim() === "") throw new Error(`problem ${input.id} has an empty prompt`);
  // Throws on an unknown topic. Keeps the pathway graph and the corpus in step.
  topicDefinition(input.topic);
  if (!isValidDifficulty(input.difficulty)) {
    throw new Error(
      `problem ${input.id} has difficulty ${input.difficulty}, which is outside the rating scale ` +
        `${DIFFICULTY_MIN} to ${DIFFICULTY_MAX}, or is not a whole number`,
    );
  }

  // Throws on a voice violation, and freezes.
  const solution = createExplanation(input.solution);

  const distractors = input.distractors ?? [];
  const seen = new Set<DistractorId>();
  for (const distractor of distractors) {
    if (distractor.id.trim() === "") {
      throw new Error(`problem ${input.id} has a distractor with an empty id`);
    }
    if (seen.has(distractor.id)) {
      throw new Error(`problem ${input.id} has two distractors with id ${distractor.id}`);
    }
    seen.add(distractor.id);

    if (distractor.state.kind !== input.answer.kind) {
      throw new Error(
        `problem ${input.id} distractor ${distractor.id} is a ${distractor.state.kind} answer on a ` +
          `${input.answer.kind} problem`,
      );
    }
    createExplanation(distractor.explanation);

    const verdict = checkAnswer(input.answer, distractor.state);
    if (verdict.outcome === "correct") {
      throw new Error(
        `problem ${input.id} distractor ${distractor.id} grades CORRECT. Either it is a second ` +
          `right answer, or the checker for ${input.answer.kind} has a bug. Both need a person.`,
      );
    }
    if (verdict.outcome === "undecided") {
      throw new Error(
        `problem ${input.id} distractor ${distractor.id} cannot be graded: ${verdict.cause}. A ` +
          `distractor the checker cannot decide about can never match, so it would teach nobody.`,
      );
    }
  }

  for (let i = 0; i < distractors.length; i += 1) {
    for (let j = i + 1; j < distractors.length; j += 1) {
      const left = distractors[i];
      const right = distractors[j];
      if (left === undefined || right === undefined) continue;
      if (statesMatch(input.answer, left.state, right.state, left.tolerance)) {
        throw new Error(
          `problem ${input.id} distractors ${left.id} and ${right.id} are at the same point in ` +
            `answer space, so which explanation a student sees depends on authoring order`,
        );
      }
    }
  }

  assertFiniteSpaceIsCovered(input.id, input.answer, distractors);

  return Object.freeze({
    id: input.id,
    course: input.course,
    topic: input.topic,
    difficulty: input.difficulty,
    prompt: input.prompt,
    answer: input.answer,
    distractors: Object.freeze(distractors.map((distractor) => Object.freeze({ ...distractor }))),
    solution,
    ...(input.lesson === undefined ? {} : { lesson: input.lesson }),
    tags: Object.freeze([...(input.tags ?? [])]),
  });
}

/**
 * Multiple choice and major product have enumerable wrong answers, so every one
 * of them must carry an explanation. See the file header for why this rule
 * cannot apply to the other kinds.
 */
function assertFiniteSpaceIsCovered(
  problemId: ProblemId,
  answer: AnswerSpec,
  distractors: readonly Distractor[],
): void {
  if (answer.kind === "multiple_choice") {
    const explained = new Set(
      distractors
        .map((distractor) => distractor.state)
        .filter((state) => state.kind === "multiple_choice")
        .map((state) => state.optionId),
    );
    const bare = answer.options
      .map((option) => option.id)
      .filter((id) => id !== answer.correctOptionId && !explained.has(id));
    if (bare.length > 0) {
      throw new Error(
        `problem ${problemId} leaves option(s) ${bare.join(", ")} with no authored explanation. A ` +
          `multiple choice answer space is finite, so an unexplained option is a Tier 3 hit that ` +
          `did not have to happen.`,
      );
    }
    return;
  }
  if (answer.kind === "major_product") {
    const explained = new Set(
      distractors
        .map((distractor) => distractor.state)
        .filter((state) => state.kind === "major_product")
        .map((state) => state.candidateId),
    );
    const bare = answer.candidates
      .map((candidate) => candidate.id)
      .filter((id) => id !== answer.correctCandidateId && !explained.has(id));
    if (bare.length > 0) {
      throw new Error(
        `problem ${problemId} leaves candidate product(s) ${bare.join(", ")} with no authored ` +
          `explanation. The candidate list is finite and every wrong one is a mistake somebody makes.`,
      );
    }
  }
}

export interface DistractorCoverage {
  readonly problems: number;
  readonly withAtLeastOne: number;
  /** BUILD-PROMPT.md Phase 3 asks for this number on every run. */
  readonly percentWithAtLeastOne: number;
  readonly withNone: readonly ProblemId[];
  readonly distractorsTotal: number;
}

export function distractorCoverage(problems: readonly Problem[]): DistractorCoverage {
  const withNone = problems.filter((problem) => problem.distractors.length === 0).map((p) => p.id);
  const withAtLeastOne = problems.length - withNone.length;
  return {
    problems: problems.length,
    withAtLeastOne,
    percentWithAtLeastOne: problems.length === 0 ? 0 : (withAtLeastOne / problems.length) * 100,
    withNone,
    distractorsTotal: problems.reduce((sum, problem) => sum + problem.distractors.length, 0),
  };
}
