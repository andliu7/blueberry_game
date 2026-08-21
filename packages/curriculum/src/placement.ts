/**
 * Where a problem sits in the syllabus, and how hard it is.
 *
 * Two closed unions with typed record registries, the same construction
 * chem-core's causes.ts uses and for the same reason: a topic written as a free
 * string cannot be counted, cannot be grouped for mastery, and cannot be checked
 * for coverage. `CourseId` and `TopicId` are unions, `TOPICS` is typed
 * `Record<TopicId, TopicDefinition>`, so a topic in the union with no definition
 * is a compile error and a definition outside the union is a compile error too.
 *
 * This is the seed set, not the syllabus. CLAUDE.md's content pipeline section
 * says Organic Chemistry II arrives as the owner's full breakdown and Organic
 * Chemistry I is generated from the recorded topic scope. Both land in this file
 * in a later wave of Phase 3. What is here is the subset the seed corpus
 * actually uses, plus the structure those breakdowns will be poured into.
 */

export type CourseId =
  | "gen_chem_1"
  | "gen_chem_2"
  | "orgo_1"
  | "orgo_2"
  | "dat"
  | "mcat";

export type TopicId =
  // General Chemistry I
  | "stoichiometry"
  | "gas_laws"
  | "solutions_and_concentration"
  // General Chemistry II
  | "acid_base_equilibria"
  | "titration_curves"
  // Organic Chemistry I
  | "structure_and_bonding"
  | "substitution_and_elimination"
  | "alkene_addition"
  // Organic Chemistry II
  | "aromatic_substitution"
  | "alkyne_chemistry"
  | "carbonyl_chemistry"
  // Spans courses
  | "spectroscopy_ir"
  | "degrees_of_unsaturation";

export interface TopicDefinition {
  readonly id: TopicId;
  /** The course a student meets this topic in first. */
  readonly course: CourseId;
  /** Short label. Student facing, so it is a phrase and not an identifier. */
  readonly label: string;
  /**
   * Topics a student is assumed to have met already.
   *
   * This is the edge list of the pathway graph. The placement quiz walks it
   * backwards from a topic the student failed to find where to start them, and
   * the Duolingo shaped track in Phase 5 renders it forward as unlock gates.
   * Unlock STATE is progress and is enforced server side per the
   * non-negotiables; this is the static shape of the graph, which is content.
   */
  readonly prerequisites: readonly TopicId[];
}

export const TOPICS: Readonly<Record<TopicId, TopicDefinition>> = Object.freeze({
  stoichiometry: Object.freeze({
    id: "stoichiometry",
    course: "gen_chem_1",
    label: "Stoichiometry and limiting reactants",
    prerequisites: Object.freeze([] as const),
  }),
  gas_laws: Object.freeze({
    id: "gas_laws",
    course: "gen_chem_1",
    label: "Gas laws",
    prerequisites: Object.freeze(["stoichiometry"] as const),
  }),
  solutions_and_concentration: Object.freeze({
    id: "solutions_and_concentration",
    course: "gen_chem_1",
    label: "Solutions and concentration",
    prerequisites: Object.freeze(["stoichiometry"] as const),
  }),
  acid_base_equilibria: Object.freeze({
    id: "acid_base_equilibria",
    course: "gen_chem_2",
    label: "Acid and base equilibria",
    prerequisites: Object.freeze(["solutions_and_concentration"] as const),
  }),
  titration_curves: Object.freeze({
    id: "titration_curves",
    course: "gen_chem_2",
    label: "Titration curves",
    prerequisites: Object.freeze(["acid_base_equilibria"] as const),
  }),
  structure_and_bonding: Object.freeze({
    id: "structure_and_bonding",
    course: "orgo_1",
    label: "Structure and bonding",
    prerequisites: Object.freeze([] as const),
  }),
  substitution_and_elimination: Object.freeze({
    id: "substitution_and_elimination",
    course: "orgo_1",
    label: "Substitution and elimination",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  alkene_addition: Object.freeze({
    id: "alkene_addition",
    course: "orgo_1",
    label: "Alkene addition",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  aromatic_substitution: Object.freeze({
    id: "aromatic_substitution",
    course: "orgo_2",
    label: "Electrophilic aromatic substitution",
    prerequisites: Object.freeze(["alkene_addition"] as const),
  }),
  alkyne_chemistry: Object.freeze({
    id: "alkyne_chemistry",
    course: "orgo_2",
    label: "Alkyne chemistry",
    prerequisites: Object.freeze(["substitution_and_elimination"] as const),
  }),
  carbonyl_chemistry: Object.freeze({
    id: "carbonyl_chemistry",
    course: "orgo_2",
    label: "Carbonyl chemistry",
    prerequisites: Object.freeze(["alkene_addition"] as const),
  }),
  spectroscopy_ir: Object.freeze({
    id: "spectroscopy_ir",
    course: "orgo_1",
    label: "Infrared spectroscopy",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
  degrees_of_unsaturation: Object.freeze({
    id: "degrees_of_unsaturation",
    course: "orgo_1",
    label: "Degrees of unsaturation",
    prerequisites: Object.freeze(["structure_and_bonding"] as const),
  }),
});

export function allTopicIds(): readonly TopicId[] {
  return Object.keys(TOPICS) as TopicId[];
}

export function topicCount(): number {
  return allTopicIds().length;
}

/** Throws on an unknown id, because a lookup miss here is an authoring defect. */
export function topicDefinition(id: TopicId): TopicDefinition {
  const definition = TOPICS[id];
  if (definition === undefined) {
    throw new Error(`Unknown topic id: ${String(id)}`);
  }
  return definition;
}

export function topicIdsForCourse(course: CourseId): readonly TopicId[] {
  return allTopicIds().filter((id) => topicDefinition(id).course === course);
}

/**
 * Difficulty, on the same scale as the student rating it moves against.
 *
 * CLAUDE.md's Progression section: the rating is Elo LIKE, a student against a
 * problem rather than head to head, so a problem carries a difficulty for the
 * expected against actual comparison to have two numbers. The chess scale is the
 * named inspiration, so the bounds are the chess ones, and they are bounds rather
 * than a suggestion because a problem authored at 40 or at 40000 silently
 * saturates every expected score computed against it.
 *
 * The rating UPDATE is not in this package and must not arrive here. CLAUDE.md
 * puts it server side, computed from the append only attempt history, never
 * client supplied. This package ships the number a server side updater reads.
 */
export const DIFFICULTY_MIN = 400;
export const DIFFICULTY_MAX = 2400;

export type Difficulty = number;

export function isValidDifficulty(value: number): boolean {
  return Number.isInteger(value) && value >= DIFFICULTY_MIN && value <= DIFFICULTY_MAX;
}
