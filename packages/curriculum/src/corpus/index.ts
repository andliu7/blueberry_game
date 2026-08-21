/**
 * The seed corpus.
 *
 * Sixteen problems across eight topics, four courses, and all five answer kinds.
 * It is a seed and not a syllabus: CLAUDE.md's content pipeline section puts the
 * Organic Chemistry II breakdown and the generated Organic Chemistry I scope in
 * later waves of this phase, reviewed at the same human gate as other authored
 * copy.
 *
 * WHAT THIS CORPUS IS FOR. It is the thing the checkers run against. A checker
 * with no authored data behind it is a set of functions nobody has ever pointed
 * at real chemistry, and every mistake in one shows up as a fixture that will not
 * load rather than as a wrong mark in front of a student. Importing this module
 * runs every constructor in the package over every problem, which means a broken
 * checker is a corpus that will not import. That is deliberate.
 *
 * ONE THING IT DELIBERATELY DOES NOT COVER. There is no structure problem with
 * stereochemistry in it, because answers/structure.ts compares constitution only
 * and problem.ts refuses to build one. That gap is named in both of those files
 * and it closes when canonical comparison through Indigo is wired on the lazy
 * editor route.
 */

import type { Problem } from "../problem.js";
import { ACID_BASE_PROBLEMS } from "./acidBase.js";
import { GAS_LAW_PROBLEMS } from "./gasLaws.js";
import { ORGANIC_PROBLEMS } from "./organic.js";
import { SPECTROSCOPY_PROBLEMS } from "./spectroscopy.js";
import { STOICHIOMETRY_PROBLEMS } from "./stoichiometry.js";

export const SEED_CORPUS: readonly Problem[] = Object.freeze([
  ...GAS_LAW_PROBLEMS,
  ...STOICHIOMETRY_PROBLEMS,
  ...ACID_BASE_PROBLEMS,
  ...SPECTROSCOPY_PROBLEMS,
  ...ORGANIC_PROBLEMS,
]);

export { ACID_BASE_PROBLEMS, GAS_LAW_PROBLEMS, ORGANIC_PROBLEMS, SPECTROSCOPY_PROBLEMS, STOICHIOMETRY_PROBLEMS };

/** Throws on an unknown id, because a missing problem is a defect in the caller. */
export function problemById(id: string): Problem {
  const problem = SEED_CORPUS.find((candidate) => candidate.id === id);
  if (problem === undefined) {
    throw new Error(`No problem with id ${id} in the seed corpus`);
  }
  return problem;
}
