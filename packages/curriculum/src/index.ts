/**
 * @blueberry/curriculum
 *
 * The second engine. Authored problems and answer checking for the two thirds of
 * the syllabus that is not mechanism chemistry.
 *
 * CLAUDE.md, content pipeline: "Most of the curriculum is not mechanism
 * chemistry. Gas laws, thermodynamics, kinetics, titration curves,
 * stoichiometry, and spectroscopy interpretation do not touch chem-core at all.
 * They need an authored problem and answer checking engine, which is a second
 * system alongside the first, not an extension of it. Do not route a limiting
 * reactant problem through a mechanism validator."
 *
 * THE DEPENDENCY DIRECTION. This package may depend on chem-core, for structure
 * questions, and chem-core must never depend on it. One file here imports
 * chem-core, answers/structure.ts, plus one corpus file that authors two
 * molecules. No React, no DOM, no RDKit, no dependencies beyond chem-core.
 *
 * WHAT IS IN HERE, in the order it is worth reading:
 *
 *   kinds.ts           The five answer kinds, and why `mechanism` is not one.
 *   ids.ts             Identifier aliases, and why a ProblemId never changes.
 *   placement.ts       Course and topic taxonomy, and the difficulty scale the
 *                      Elo like rating moves against.
 *   explanation.ts     The three field authored copy shape, and the voice lint.
 *   causes.ts          The named cause registry. Countable by construction.
 *   answers/units.ts   A small unit registry. Case sensitive on purpose.
 *   answers/numeric.ts Value, significant figures, and units. Read the header.
 *   answers/choice.ts  Multiple choice, and major product with its reason.
 *   answers/reagents.ts Reagent sets, and the ordered synthesis read backwards.
 *   answers/structure.ts Constitution comparison, and everything it cannot do.
 *   answer.ts          The spec against state distinction. Read this one early.
 *   problem.ts         The authored problem, and the constructor that refuses.
 *   grading.ts         The result type, the tier order, and the counters.
 *   corpus/            Sixteen authored problems with real distractors.
 *
 * NOT BUILT YET, and each has a seam rather than a stub:
 *
 *   The placement quiz. It walks `TOPICS`, which already carries the
 *   prerequisite edges, and it grades with `gradeAttempt` over problems it
 *   selects by `difficulty`. Nothing about it needs a new answer shape.
 *
 *   The reaction database. It is data with a search function, indexed by
 *   reagents, reactants and products. The reagent token vocabulary in
 *   answers/reagents.ts is the join key.
 *
 *   Spaced repetition. It is a scheduler over the append only attempt history,
 *   which is Phase 6 data. What this package owes it is `Attempt` and
 *   `GradingResult`, both of which are already serialisable.
 */

export type { AnswerKind } from "./kinds.js";
export { ANSWER_KINDS, answerKindCount } from "./kinds.js";

export type { AttemptId, DistractorId, LessonId, OptionId, ProblemId } from "./ids.js";

export type { CourseId, Difficulty, TopicDefinition, TopicId } from "./placement.js";
export {
  DIFFICULTY_MAX,
  DIFFICULTY_MIN,
  TOPICS,
  allTopicIds,
  isValidDifficulty,
  topicCount,
  topicDefinition,
  topicIdsForCourse,
} from "./placement.js";

export type { Explanation, VoiceViolation } from "./explanation.js";
export { createExplanation, voiceViolations } from "./explanation.js";

export type {
  CauseSpecificity,
  CurriculumCauseCategory,
  CurriculumCauseDefinition,
  CurriculumCauseId,
} from "./causes.js";
export {
  CURRICULUM_CAUSES,
  allCurriculumCauseIds,
  causeIdsForKind,
  causeSpecificity,
  curriculumCause,
  curriculumCauseCount,
} from "./causes.js";

export type { Dimension, UnitDefinition, UnitSymbol } from "./answers/units.js";
export {
  UNITS,
  allUnitSymbols,
  convert,
  dimensionOf,
  isAffine,
  resolveUnit,
  sameDimension,
  unitDefinition,
} from "./answers/units.js";

export type {
  NumericAnswerInput,
  NumericAnswerSpec,
  NumericParse,
  NumericState,
  NumericVerdict,
  ParsedNumber,
  SigFigPolicy,
  Tolerance,
  UnitPolicy,
} from "./answers/numeric.js";
export {
  checkNumeric,
  createNumericAnswer,
  defaultTolerance,
  numericStateMatches,
  parseNumber,
} from "./answers/numeric.js";

export type {
  ChoiceOption,
  ChoiceVerdict,
  MajorProductAnswerSpec,
  MajorProductState,
  MultipleChoiceAnswerSpec,
  MultipleChoiceState,
} from "./answers/choice.js";
export {
  assertOptionsValid,
  checkMajorProduct,
  checkMultipleChoice,
  createMajorProductAnswer,
  createMultipleChoiceAnswer,
  majorProductStateMatches,
  multipleChoiceStateMatches,
} from "./answers/choice.js";

export type {
  ReagentDirection,
  ReagentMode,
  ReagentState,
  ReagentStep,
  ReagentVerdict,
  ReagentsAnswerInput,
  ReagentsAnswerSpec,
} from "./answers/reagents.js";
export {
  checkReagents,
  createReagentsAnswer,
  normaliseReagent,
  reagentStateMatches,
} from "./answers/reagents.js";

export type { StructureAnswerSpec, StructureState, StructureVerdict } from "./answers/structure.js";
export {
  ISOMORPHISM_NODE_BUDGET,
  checkStructure,
  createStructureAnswer,
  hasStereoDeclarations,
  speciesAreEquivalent,
  structureStateMatches,
} from "./answers/structure.js";

export type { AnswerSpec, AnswerState, AnswerVerdict } from "./answer.js";
export { answerKindOf, checkAnswer, statesMatch } from "./answer.js";

export type { Distractor, DistractorCoverage, Problem, ProblemInput } from "./problem.js";
export { answerKind, createProblem, distractorCoverage } from "./problem.js";

export type { Attempt, FeedbackTier, GradingResult, Tier3Entry, TierBreakdown } from "./grading.js";
export { gradeAttempt, isWrong, tier3Entries, tierBreakdown } from "./grading.js";

export { SEED_CORPUS, problemById } from "./corpus/index.js";
