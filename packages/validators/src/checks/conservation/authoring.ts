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
 * The exceptions are narrow, and each is stated where it happens. `rate-comparison.ts`
 * scans a justification for the name of a `MechanismRoute`, because "names the competing
 * pathway" is a requirement about naming and the set of route names is closed and finite.
 * `annotationGroundingViolations` below asks that a claim about a site names the site, by
 * atom id or species id. Neither grades the claim. Both check that a name from a known,
 * finite list is present, which is a requirement about reference rather than about
 * content, and the difference is the whole reason they are allowed here.
 *
 * The Phase 1 adversary showed why presence alone was not enough: an annotation of "z"
 * and "z" satisfied every rule in this file while saying nothing. The answer is not a
 * character count, which two words defeat. See the long note on
 * `annotationGroundingViolations`.
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

/**
 * The names an annotation can be about: every atom id and species id in these states.
 *
 * Used by the grounding rule below. Ids rather than labels, because an id is what another
 * tool can look up and a label is prose that may be rewritten without changing anything.
 */
export function annotationVocabulary(
  states: readonly MechanismState[],
): ReadonlySet<string> {
  const vocabulary = new Set<string>();
  for (const state of states) {
    for (const member of state.members) {
      vocabulary.add(member.species.id);
      for (const atom of member.species.atoms) vocabulary.add(atom.id);
    }
  }
  return vocabulary;
}

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Names from the vocabulary that appear in this text as whole words. */
export function namesIn(text: string, vocabulary: ReadonlySet<string>): readonly string[] {
  const found: string[] = [];
  for (const name of vocabulary) {
    if (name.trim() === "") continue;
    const pattern = new RegExp(
      `(^|[^A-Za-z0-9_])${escapeForRegExp(name)}([^A-Za-z0-9_]|$)`,
      "i",
    );
    if (pattern.test(text)) found.push(name);
  }
  return found.sort();
}

/**
 * An authored claim about a specific site has to name the site.
 *
 * WHAT THIS ASSERTS, AND EXACTLY HOW FAR IT GOES.
 *
 * The value and justification, read together, name at least one atom id or species id that
 * is present in the state the claim is about. Nothing else. It does not read the sentence,
 * does not judge whether the reasoning is sound, and above all does not count characters.
 *
 * WHY NOT A LENGTH THRESHOLD, WHICH IS THE OBVIOUS FIX AND THE WRONG ONE.
 *
 * The Phase 1 adversary filed two fixtures whose annotations are the single character "z"
 * and the pair "x" and "y". A minimum length would catch both and would be satisfied by
 * typing two words, so it would trade a hole for a slightly narrower hole while reading in
 * a report as though content were being checked. A grounding requirement is not a grade
 * either, but it is a different KIND of requirement: it forces the claim to be about
 * something that exists in the fixture, and a claim about nothing cannot be about
 * something by accident.
 *
 * WHAT REMAINS HUMAN, STATED PLAINLY RATHER THAN IMPLIED.
 *
 * Whether the sentence is true. Whether a bicyclo[2.2.1] cage really cannot reach 180
 * degrees, whether 50 to 80 percent racemisation is the right range for this substrate in
 * this solvent, whether the reasoning teaches. None of that is machine checkable and no
 * amount of structural requirement makes it so. It is a human review gate, and
 * BUILD-PROMPT.md already stops for one. This rule is a floor under the gate, not the gate.
 *
 * It is gameable by writing an atom id and nothing else. That is worth saying out loud and
 * is still strictly more than the old rule, which was gameable by writing anything at all.
 */
export function annotationGroundingViolations(
  annotation: AuthoredAnnotation,
  vocabulary: ReadonlySet<string>,
  where: string,
  cause: string,
): readonly Violation[] {
  const text = `${annotation.value} ${annotation.justification}`;
  if (text.trim() === "") return [];
  if (namesIn(text, vocabulary).length > 0) return [];

  return [
    {
      where,
      expected:
        "the value or the justification to name at least one atom id or species id from " +
        "the state this claim is about, so the claim is anchored to something that exists",
      actual:
        `neither names any of them. The state holds ${vocabulary.size} name(s) and the ` +
        `annotation mentions none, so nothing connects what was written to the chemistry it ` +
        `is supposed to be about. This is a floor and not a grade: whether the claim is TRUE ` +
        `is a human review gate, and no check here reads for sense`,
      cause,
    },
  ];
}

/** The species in a state that contains this atom id, if any. */
export function speciesContaining(state: MechanismState, atomId: string): Species | undefined {
  return state.members
    .map((member) => member.species)
    .find((species) => species.atoms.some((atom) => atom.id === atomId));
}
