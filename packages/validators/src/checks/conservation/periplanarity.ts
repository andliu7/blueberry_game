import {
  findAtom,
  findBondBetween,
  type DeclaredTorsion,
  type MechanismPathway,
  type MechanismStep,
  type Species,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { requiredAnnotationViolations } from "./authoring.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 9. An E2 declares the torsion it turns on, and a syn periplanar one carries the
 * authored conformational justification CLAUDE.md says it must be flagged for.
 *
 * WHAT CLAUDE.md ASKS FOR, IN ITS OWN WORDS.
 *
 *   "E2 requires periplanarity, dihedral near 0 or 180 degrees. Anti is strongly preferred.
 *   Syn periplanar E2 is real in conformationally locked systems and is flagged as
 *   requiring an authored conformational justification, not rejected."
 *
 * Three separate instructions live in that sentence, and this check is all three.
 * Periplanarity is required. Syn is not rejected. Syn is flagged, and the flag is
 * satisfied by an authored justification rather than by the check deciding for itself
 * whether the cage really is locked.
 *
 * WHY EVERY E2 MUST DECLARE A TORSION, NOT ONLY THE SYN ONES.
 *
 * This is the load bearing decision in the file. If only fixtures that declared a syn
 * torsion had to carry a justification, then the way to author an unjustified syn E2 would
 * be to declare no torsion at all, and the check would never fire on the case it exists
 * for. The requirement to declare is what makes the requirement to justify reachable.
 * It also has a plain chemical reading: an E2 whose dihedral is unstated is a mechanism
 * whose central geometric precondition nobody has claimed is met.
 *
 * WHAT THE CHECK ASSERTS.
 *
 *   1. Every E2 concerted elimination step has exactly one declared torsion, in its `from`
 *      state, whose four atoms are all reaction centres of that step. Exactly one, because
 *      two torsions over the same four centres are two claims about one angle.
 *   2. That torsion is a real dihedral: four distinct atoms, all in one species, bonded in
 *      a chain A-B-C-D. A dihedral is the angle between the A-B-C and B-C-D planes, so four
 *      atoms that are not a bonded chain do not define one, whatever number is written next
 *      to them.
 *   3. Its `justification` is not empty. species.ts requires one because a stated torsion
 *      nobody defended is a number a validator will trust and a student is graded against.
 *   4. Its angle is stated in the convention this schema uses, degrees in [-180, 180].
 *   5. Its angle is periplanar: within the tolerance of 0, syn, or of 180, anti. Anything
 *      else fails with cause `e2_not_periplanar`, which is CLAUDE.md's requirement and the
 *      one hard geometric assertion in this file.
 *   6. If it is syn, the pathway carries exactly one `conformational_justification`
 *      annotation, with a value and a justification. Present, and the fixture passes. This
 *      check never decides whether the stated conformational reason is a good one.
 *
 * WHAT IT DOES NOT ASSERT.
 *
 * That anti is better than syn. Nothing here prefers, penalises, or ranks the two: a syn
 * periplanar E2 with the annotation passes exactly as cleanly as an anti one, which is what
 * "flagged, not rejected" means. `docs/VERIFICATION.md` S3 is the same instruction. It also
 * does not read the conformational justification for sense. Whether a bicyclo[2.2.1] cage
 * genuinely cannot reach 180 degrees is chemistry a human wrote down and a human reviews.
 *
 * THE TOLERANCE, AND WHY IT IS ONE NUMBER RATHER THAN TWO.
 *
 * 30 degrees either side. The two windows it creates, [-30, 30] and [150, 180] with its
 * mirror, are disjoint, so no angle is ever both syn and anti and no angle falls between
 * them without being reported. A tolerance is needed at all because real locked systems do
 * not sit at exactly 0: norbornane's exo-exo H-C-C-Br torsion is a few degrees off, and a
 * check demanding 0.0 would fail on correct chemistry, which is the S1 mistake wearing a
 * different hat. Loosening this number to make a fixture pass is a weakening, and the
 * fixture that would need it is a fixture whose geometry is not periplanar.
 */

/** Degrees either side of 0 or 180 that still count as periplanar. Fixed. */
const PERIPLANAR_TOLERANCE_DEGREES = 30;

/** Cause for a geometry that was never declared, or was declared unusably. */
const GEOMETRY_NOT_DECLARED = "stereocenter_created_without_declared_geometry";

interface DeclaredTorsionSite {
  readonly species: Species;
  readonly torsion: DeclaredTorsion;
}

function isE2Elimination(step: MechanismStep, pathway: MechanismPathway): boolean {
  if (step.identity.elementaryStep !== "concerted_elimination") return false;
  return (step.identity.route ?? pathway.route) === "e2";
}

/** Every torsion declared anywhere in this state, with the species that declared it. */
function declaredTorsionSites(step: MechanismStep): readonly DeclaredTorsionSite[] {
  const sites: DeclaredTorsionSite[] = [];
  for (const member of step.from.members) {
    for (const torsion of member.species.declaredTorsions ?? []) {
      sites.push({ species: member.species, torsion });
    }
  }
  return sites;
}

/** Is every atom of this torsion a declared reaction centre of this step? */
function coversTheStep(torsion: DeclaredTorsion, centers: ReadonlySet<string>): boolean {
  return torsion.atoms.every((atomId) => centers.has(atomId));
}

/**
 * Is this a dihedral at all?
 *
 * Four distinct atoms of one species, bonded A-B-C-D. Checked against the `from` state,
 * where the two sigma bonds that E2 breaks are still present.
 */
function shapeViolations(site: DeclaredTorsionSite, where: string): Violation[] {
  const violations: Violation[] = [];
  const { species, torsion } = site;
  const [a, b, c, d] = torsion.atoms;

  const distinct = new Set<string>(torsion.atoms);
  if (distinct.size !== 4) {
    violations.push({
      where,
      expected: "four distinct atoms, since a dihedral is measured over a chain of four",
      actual: `[${torsion.atoms.join(", ")}], which names ${distinct.size} distinct atom(s)`,
      cause: GEOMETRY_NOT_DECLARED,
    });
    return violations;
  }

  const missing = torsion.atoms.filter((atomId) => findAtom(species, atomId) === undefined);
  if (missing.length > 0) {
    violations.push({
      where,
      expected: `every atom of the torsion to be an atom of species ${species.id}, which declared it`,
      actual:
        `${missing.join(", ")} ${missing.length === 1 ? "is" : "are"} not in it. A torsion is a ` +
        `property of one molecule, and one declared over atoms that are not there is a number ` +
        `attached to nothing`,
      cause: GEOMETRY_NOT_DECLARED,
    });
    return violations;
  }

  for (const [left, right] of [
    [a, b],
    [b, c],
    [c, d],
  ] as const) {
    if (findBondBetween(species, left as string, right as string) === undefined) {
      violations.push({
        where,
        expected: `a bond between ${left} and ${right} in species ${species.id}`,
        actual:
          `there is none, so [${torsion.atoms.join(", ")}] is not a bonded chain and defines no ` +
          `dihedral. The angle is between the plane of the first three atoms and the plane of ` +
          `the last three, and both planes need their bonds`,
        cause: GEOMETRY_NOT_DECLARED,
      });
    }
  }

  return violations;
}

function angleViolations(
  pathway: MechanismPathway,
  site: DeclaredTorsionSite,
  where: string,
): Violation[] {
  const violations: Violation[] = [];
  const degrees = site.torsion.degrees;

  if (degrees < -180 || degrees > 180) {
    violations.push({
      where,
      expected: "a dihedral in degrees within [-180, 180], the convention this schema states",
      actual:
        `${degrees}. Outside that range the same geometry has more than one spelling, and a ` +
        `check that silently wrapped it would read 360 as syn periplanar without saying so`,
      cause: GEOMETRY_NOT_DECLARED,
    });
    return violations;
  }

  const fromSyn = Math.abs(degrees);
  const fromAnti = Math.abs(180 - Math.abs(degrees));

  if (fromSyn <= PERIPLANAR_TOLERANCE_DEGREES) {
    violations.push(
      ...requiredAnnotationViolations(pathway, {
        kind: "conformational_justification",
        where,
        cause: "e2_syn_periplanar_unjustified",
        because:
          `the declared dihedral is ${degrees} degrees, which is syn periplanar. CLAUDE.md says ` +
          `syn periplanar E2 is real in conformationally locked systems and is FLAGGED as ` +
          `requiring an authored conformational justification, not rejected. This is that flag. ` +
          `Say what locks the conformation, and the fixture passes`,
      }),
    );
    return violations;
  }

  if (fromAnti > PERIPLANAR_TOLERANCE_DEGREES) {
    violations.push({
      where,
      expected:
        `a periplanar dihedral, within ${PERIPLANAR_TOLERANCE_DEGREES} degrees of 0 (syn) or ` +
        `180 (anti)`,
      actual:
        `${degrees} degrees, which is ${Math.min(fromSyn, fromAnti)} degrees outside the nearer ` +
        `window. E2 forms the pi bond as the two sigma bonds break, so those bonds have to be ` +
        `aligned with the developing p orbitals. Near zero or near one hundred and eighty, and ` +
        `nothing in between`,
      cause: "e2_not_periplanar",
    });
  }

  return violations;
}

function stepViolations(pathway: MechanismPathway, step: MechanismStep): Violation[] {
  const centers = new Set<string>(step.identity.reactionCenters);
  const sites = declaredTorsionSites(step);
  const covering = sites.filter((site) => coversTheStep(site.torsion, centers));

  if (covering.length === 0) {
    return [
      {
        where: `${step.id}.from / E2 elimination at ${[...centers].join(", ")}`,
        expected:
          "one declared torsion whose four atoms are all reaction centres of this step, " +
          "normally the beta hydrogen, the two carbons, and the leaving group",
        actual:
          sites.length === 0
            ? "no species in this state declares any torsion, so the dihedral E2 turns on is " +
              "unstated and nothing here can tell an anti elimination from an unjustified syn one"
            : `${sites.length} torsion(s) are declared here and none is drawn over this step's ` +
              `reaction centres: ${sites.map((site) => `[${site.torsion.atoms.join(", ")}]`).join(" ")}`,
        cause: GEOMETRY_NOT_DECLARED,
      },
    ];
  }

  if (covering.length > 1) {
    return [
      {
        where: `${step.id}.from / E2 elimination at ${[...centers].join(", ")}`,
        expected: "exactly one declared torsion over this step's reaction centres",
        actual:
          `${covering.length}: ${covering.map((site) => `[${site.torsion.atoms.join(", ")}] at ${site.torsion.degrees} degrees`).join(", ")}. ` +
          `Two angles claimed for one elimination cannot both be the geometry it happens in`,
        cause: GEOMETRY_NOT_DECLARED,
      },
    ];
  }

  const site = covering[0] as DeclaredTorsionSite;
  const where =
    `${step.id}.from / species ${site.species.id} / torsion [${site.torsion.atoms.join(", ")}]`;

  const violations: Violation[] = [];
  const shape = shapeViolations(site, where);
  violations.push(...shape);

  if (site.torsion.justification.trim() === "") {
    violations.push({
      where,
      expected: "a non empty justification on the declared torsion",
      actual:
        "it is empty. species.ts requires one because a stated torsion that nobody defended is " +
        "a number a validator will trust and a student will be graded against",
      cause: GEOMETRY_NOT_DECLARED,
    });
  }

  // A number attached to atoms that are not a dihedral is not an angle to reason about, so
  // the periplanarity arm is not run on it. Reporting "this is not periplanar" about a
  // torsion that does not exist would be a second failure line about the first failure.
  if (shape.length === 0) {
    violations.push(...angleViolations(pathway, site, where));
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const pathway = fixture.pathway;
  const violations: Violation[] = [];
  for (const step of pathway.steps) {
    if (!isE2Elimination(step, pathway)) continue;
    violations.push(...stepViolations(pathway, step));
  }
  return violations;
};

export const conservationPeriplanarityDeclaration: Check = conservationCheck({
  name: "conservation-periplanarity-declaration",
  description:
    "every E2 elimination declares the dihedral it turns on as a well formed torsion over its reaction centres, that dihedral is periplanar, and a syn periplanar one carries an authored conformational justification rather than being rejected",
  find,
});
