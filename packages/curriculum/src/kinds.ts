/**
 * The answer kinds this package owns.
 *
 * CLAUDE.md, "Four answer shapes, not one", lists four shapes. `mechanism` is
 * the first and it belongs to chem-core, which already grades it against the
 * four result types. It is deliberately NOT a member of this union: a mechanism
 * routed through a curriculum checker would be graded twice by two engines with
 * two opinions, and CLAUDE.md's repository layout gives that job to one of them.
 *
 * Three of the members are the other three shapes from that table:
 *
 *   structure       Predict the product. The student supplies a structure.
 *   reagents        Supply the reagents. A set, or for a synthesis an ordered
 *                   sequence of sets.
 *   major_product   Pick the major product, and the reason it wins.
 *
 * A synthesis is the reagent shape read backwards, per CLAUDE.md: the product is
 * given and the reagents are the answer. It is a `direction` field on the
 * reagent answer, not a fifth kind, because retrosynthesis grading is the same
 * comparison run in the other direction.
 *
 * The other two are this package's own, and they are why the package exists.
 * CLAUDE.md's content pipeline section: gas laws, thermodynamics, kinetics,
 * titration curves, stoichiometry, and spectroscopy interpretation do not touch
 * chem-core at all.
 *
 *   numeric         A number, with significant figures and a unit.
 *   multiple_choice A choice from an authored list.
 */

export type AnswerKind =
  | "numeric"
  | "multiple_choice"
  | "structure"
  | "reagents"
  | "major_product";

export const ANSWER_KINDS: readonly AnswerKind[] = Object.freeze([
  "numeric",
  "multiple_choice",
  "structure",
  "reagents",
  "major_product",
]);

export function answerKindCount(): number {
  return ANSWER_KINDS.length;
}
