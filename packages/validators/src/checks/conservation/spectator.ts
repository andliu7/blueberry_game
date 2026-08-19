import {
  conservedTotals,
  findSpecies,
  isSpectator,
  nuclideDifference,
  orphanSpectatorDeclarations,
  type MechanismState,
  type MechanismStep,
  type Species,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";
import { formatSignedNuclides, labelledStates } from "./shared.ts";

/**
 * CHECK 6. Spectator declarations are well formed, and the exclusion is not what makes
 * conservation pass.
 *
 * CLAUDE.md allows spectators and then says the important half: declaring one is an
 * explicit, recorded act that a validator can see and an adversary can attack. This check
 * is both halves. The first four assertions are hygiene. The fifth is the attack surface,
 * and it is the reason this check exists at all.
 *
 * 1. A declaration names a species that is actually in the state. A declaration pointing
 *    at nothing is either a typo or a pre authorisation to exclude something added later.
 *
 * 2. No species is declared twice in one state.
 *
 * 3. Every declaration carries a justification and a name for who made the call. Both are
 *    required by state.ts and both are read by humans, not machines. An empty
 *    justification is an exclusion nobody can argue with later.
 *
 * 4. A species declared a spectator is declared on both sides of a step and is
 *    structurally identical on both sides. state.ts names this invariant and gives it a
 *    cause: spectator_changed_during_step. A spectator that changes is not a spectator,
 *    and a species excluded on one side only is an exclusion that moves the books by
 *    itself.
 *
 * 5. THE ATTACK. Conservation is recomputed with the spectators put back in. If the step
 *    conserves mass, charge, and electrons with spectators excluded but fails with them
 *    included, then the exclusion is load bearing: the declaration is not describing a
 *    molecule that sits out, it is hiding the difference. That is reported in full, with
 *    the quantity and the size of the difference, because it is the one way a correct
 *    looking corpus can be built on a lie and the other five checks will all pass.
 *
 * This check reads `conservedTotals(..., { includeSpectators: true })`, which is the
 * option bookkeeping.ts says exists for exactly this caller.
 */

/**
 * A canonical string for a species, for the "did the spectator change" comparison.
 *
 * Bond IDs are deliberately left out. ids.ts: bond ids are not stable across a step,
 * because a bond that breaks and a bond that forms are different bonds, and bonds are
 * matched by their endpoint atom ids. Comparing bond ids would report a spectator as
 * changed because somebody renumbered it. Atom ids ARE stable and are compared.
 */
function canonicalise(species: Species): string {
  const atoms = [...species.atoms]
    .sort((left, right) => left.id.localeCompare(right.id))
    .map(
      (atom) =>
        `${atom.id}:${atom.element}:${atom.isotope ?? "-"}:q${atom.formalCharge}` +
        `:lp${atom.lonePairs}:e${atom.unpairedElectrons}:h${atom.implicitHydrogens}`,
    );
  const bonds = [...species.bonds]
    .map((bond) => (bond.a < bond.b ? `${bond.a}|${bond.b}#${bond.order}` : `${bond.b}|${bond.a}#${bond.order}`))
    .sort();
  return `atoms[${atoms.join(",")}] bonds[${bonds.join(",")}]`;
}

function hygieneViolations(label: string, state: MechanismState): Violation[] {
  const violations: Violation[] = [];

  for (const declaration of orphanSpectatorDeclarations(state)) {
    violations.push({
      where: `${label} / spectator declaration for ${declaration.speciesId}`,
      expected: "the declared species to be a member of this state",
      actual:
        "no member has that species id. A declaration pointing at nothing is a typo, or a " +
        "pre authorisation to exclude something that gets added later",
      cause: "spectator_declared_without_justification",
    });
  }

  const seen = new Set<string>();
  for (const declaration of state.spectators) {
    if (seen.has(declaration.speciesId)) {
      violations.push({
        where: `${label} / spectator declaration for ${declaration.speciesId}`,
        expected: "one declaration per species per state",
        actual: "this species is declared a spectator more than once here",
        cause: "spectator_declared_without_justification",
      });
    }
    seen.add(declaration.speciesId);

    if (declaration.justification.trim() === "") {
      violations.push({
        where: `${label} / spectator declaration for ${declaration.speciesId}`,
        expected: `a non empty justification, alongside reason "${declaration.reason}"`,
        actual:
          "the justification is empty. Excluding something from the books is a decision, and " +
          "an undefended decision cannot be argued with later",
        cause: "spectator_declared_without_justification",
      });
    }
    if (declaration.declaredBy.trim() === "") {
      violations.push({
        where: `${label} / spectator declaration for ${declaration.speciesId}`,
        expected: "a non empty declaredBy, naming the author, problem, or tool that decided",
        actual: "it is empty, so nobody owns this exclusion",
        cause: "spectator_declared_without_justification",
      });
    }
  }

  return violations;
}

function stepViolations(step: MechanismStep): Violation[] {
  const violations: Violation[] = [];
  const where = `${step.id} (${step.from.id} to ${step.to.id})`;

  const declaredSpeciesIds = new Set<string>([
    ...step.from.spectators.map((declaration) => declaration.speciesId),
    ...step.to.spectators.map((declaration) => declaration.speciesId),
  ]);

  for (const speciesId of [...declaredSpeciesIds].sort()) {
    const before = findSpecies(step.from, speciesId);
    const after = findSpecies(step.to, speciesId);

    if (before !== undefined && after !== undefined) {
      const declaredBefore = isSpectator(step.from, speciesId);
      const declaredAfter = isSpectator(step.to, speciesId);
      if (declaredBefore !== declaredAfter) {
        violations.push({
          where: `${where} / species ${speciesId}`,
          expected: "a species present on both sides is declared a spectator on both sides or neither",
          actual:
            `it is a spectator in ${declaredBefore ? step.from.id : step.to.id} and a participant in ` +
            `${declaredBefore ? step.to.id : step.from.id}, so the totals either side are taken over ` +
            `different sets and the comparison is not like for like`,
          cause: "spectator_changed_during_step",
        });
      }

      const canonicalBefore = canonicalise(before);
      const canonicalAfter = canonicalise(after);
      if (canonicalBefore !== canonicalAfter) {
        violations.push({
          where: `${where} / species ${speciesId}`,
          expected: `a declared spectator is structurally identical on both sides: ${canonicalBefore}`,
          actual: `${canonicalAfter}. A spectator that changes is not a spectator`,
          cause: "spectator_changed_during_step",
        });
      }
    }
  }

  if (declaredSpeciesIds.size === 0) return violations;

  // THE ATTACK. Is excluding the spectators what makes this step balance?
  const excludedFrom = conservedTotals(step.from);
  const excludedTo = conservedTotals(step.to);
  const includedFrom = conservedTotals(step.from, { includeSpectators: true });
  const includedTo = conservedTotals(step.to, { includeSpectators: true });

  const excludedNuclides = nuclideDifference(excludedFrom.nuclides, excludedTo.nuclides);
  const includedNuclides = nuclideDifference(includedFrom.nuclides, includedTo.nuclides);

  const excludedBalances =
    Object.keys(excludedNuclides).length === 0 &&
    excludedFrom.charge === excludedTo.charge &&
    excludedFrom.valenceElectrons === excludedTo.valenceElectrons;

  if (!excludedBalances) return violations;

  const problems: string[] = [];
  if (Object.keys(includedNuclides).length !== 0) {
    problems.push(`mass by ${formatSignedNuclides(includedNuclides)}`);
  }
  if (includedFrom.charge !== includedTo.charge) {
    problems.push(`charge by ${includedTo.charge - includedFrom.charge}`);
  }
  if (includedFrom.valenceElectrons !== includedTo.valenceElectrons) {
    problems.push(`valence electrons by ${includedTo.valenceElectrons - includedFrom.valenceElectrons}`);
  }

  if (problems.length > 0) {
    violations.push({
      where: `${where} / spectators ${[...declaredSpeciesIds].sort().join(", ")}`,
      expected:
        "the step to conserve mass, charge, and electrons whether the declared spectators are " +
        "counted or not, since a spectator by definition changes nothing",
      actual:
        `it balances only with them excluded. Put them back and it fails on ${problems.join("; ")}. ` +
        `The exclusion is load bearing, so the declaration is hiding the difference rather than ` +
        `describing a molecule that sits out`,
      cause: "spectator_changed_during_step",
    });
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const { label, state } of labelledStates(fixture.pathway)) {
    violations.push(...hygieneViolations(label, state));
  }
  for (const step of fixture.pathway.steps) {
    violations.push(...stepViolations(step));
  }
  return violations;
};

export const conservationSpectatorDeclaration: Check = conservationCheck({
  name: "conservation-spectator-declaration",
  description:
    "every declared spectator is present, justified, owned, unchanged across the step, and not the reason the step balances",
  find,
});
