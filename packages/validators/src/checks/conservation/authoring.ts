import type { AuthoredAnnotation, MechanismPathway, MechanismState, Species } from "@blueberry/chem-core";

import type { Violation } from "./family.ts";

/**
 * Shared machinery for the three schema v2 annotation checks. No chemistry decisions here.
 *
 * WHAT AN ANNOTATION CHECK IS ALLOWED TO ASSERT, WHICH IS THE WHOLE DESIGN.
 *
 * It asserts that a human wrote something down. It never asserts what they wrote. CLAUDE.md
 * draws that line twice and `docs/VERIFICATION.md` S1 draws it a third time: the SN1
 * racemisation ratio "is an authoring annotation, never a computed assertion", and a
 * validator asserting 50:50 "fails on correct chemistry, and an app built on it tells
 * students something an instructor will mark wrong". So these checks read `kind`, they read
 * whether `value` and `justification` are empty, and they count how many annotations of a
 * kind there are. They do not parse a ratio, compare a number, or grade prose.
 *
 * The one exception is narrow and stated where it happens: `rate-comparison.ts` scans a
 * justification for the name of a `MechanismRoute`, because "names the competing pathway"
 * is a requirement about naming and the set of route names is closed and finite. That is
 * still not grading the claim, it is checking that a name from a known list is present.
 *
 * WHY MORE THAN ONE ANNOTATION OF A REQUIRED KIND IS A FAILURE.
 *
 * Two racemisation ratios on one pathway are two authored claims about the same centre,
 * and nothing downstream can pick between them. A reader takes the first, a renderer takes
 * the last, and neither is wrong about what the file says. One authored claim per required
 * kind keeps the annotation a statement rather than a menu. Kinds that no check requires,
 * `condition_note` most of all, are not held to this and may repeat.
 */

export type AnnotationKind = AuthoredAnnotation["kind"];

export function annotationsOfKind(
  pathway: MechanismPathway,
  kind: AnnotationKind,
): readonly AuthoredAnnotation[] {
  return (pathway.annotations ?? []).filter((annotation) => annotation.kind === kind);
}

export interface RequiredAnnotation {
  readonly kind: AnnotationKind;
  /** Where in the fixture the requirement was triggered, for the failure line. */
  readonly where: string;
  /** The chem-core CauseId a missing or empty annotation maps to. */
  readonly cause: string;
  /** One sentence: why this pathway has to carry it. Rendered verbatim into the failure. */
  readonly because: string;
}

/**
 * The presence and shape rules every required annotation is held to.
 *
 * Missing, duplicated, empty value, or empty justification. Nothing about content. The
 * parser accepts an empty string on purpose, following the spectator declaration
 * precedent, so that the negative control for the empty case can exist on disk; this is
 * the half that refuses it.
 */
export function requiredAnnotationViolations(
  pathway: MechanismPathway,
  required: RequiredAnnotation,
): readonly Violation[] {
  const found = annotationsOfKind(pathway, required.kind);
  const violations: Violation[] = [];

  if (found.length === 0) {
    violations.push({
      where: required.where,
      expected: `an authored annotation of kind "${required.kind}" on pathway ${pathway.id}`,
      actual:
        `the pathway carries ${(pathway.annotations ?? []).length === 0 ? "no annotations at all" : `kinds [${(pathway.annotations ?? []).map((annotation) => annotation.kind).join(", ")}]`}. ` +
        required.because,
      cause: required.cause,
    });
    return violations;
  }

  if (found.length > 1) {
    violations.push({
      where: required.where,
      expected: `exactly one "${required.kind}" annotation on pathway ${pathway.id}`,
      actual:
        `${found.length} of them: ${found.map((annotation) => JSON.stringify(annotation.value)).join(" and ")}. ` +
        `Two authored claims about the same thing cannot both be the one on file, and nothing ` +
        `downstream can pick between them`,
      cause: required.cause,
    });
  }

  for (const [index, annotation] of found.entries()) {
    if (annotation.value.trim() === "") {
      violations.push({
        where: `${required.where} / annotation[${index}] kind ${annotation.kind}`,
        expected: "a non empty value, which is the authored claim itself",
        actual:
          "the value is empty, so the annotation records that somebody knew a claim was " +
          "needed here and not what the claim is",
        cause: required.cause,
      });
    }
    if (annotation.justification.trim() === "") {
      violations.push({
        where: `${required.where} / annotation[${index}] kind ${annotation.kind}`,
        expected: "a non empty justification saying why the value is what it is",
        actual:
          "the justification is empty. step.ts requires one so a validator can see that a " +
          "human made the claim rather than the engine inventing it, and an undefended claim " +
          "cannot be argued with later",
        cause: required.cause,
      });
    }
  }

  return violations;
}

/** The species in a state that contains this atom id, if any. */
export function speciesContaining(state: MechanismState, atomId: string): Species | undefined {
  return state.members
    .map((member) => member.species)
    .find((species) => species.atoms.some((atom) => atom.id === atomId));
}
