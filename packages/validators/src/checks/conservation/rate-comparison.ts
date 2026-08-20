import {
  allMechanismRoutes,
  findAtom,
  neighborIds,
  type MechanismPathway,
  type MechanismStep,
  type Species,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { annotationsOfKind, requiredAnnotationViolations, speciesContaining } from "./authoring.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 10. A strongly disfavoured but permitted step is permitted, and names what beats it.
 *
 * WHAT CLAUDE.md ASKS FOR, IN ITS OWN WORDS.
 *
 *   "Neopentyl systems are strongly disfavored for SN2, roughly 10^-5 relative to ethyl.
 *   Not blocked. The engine says 'strongly disfavored, competing pathway likely' and names
 *   the competing pathway, because the methyl shift to a tertiary cation is the actual
 *   lesson. A boolean reject deletes it."
 *
 * `docs/VERIFICATION.md` S2 is the same finding with the reason attached: a boolean block
 * is chemically wrong and pedagogically wrong, because the interesting thing about
 * neopentyl is that it is slow enough for competing pathways to win.
 *
 * WHAT THIS CHECK ASSERTS.
 *
 *   1. A strongly hindered SN2 centre is DETECTED FROM THE STRUCTURE, not from a flag the
 *      author set. See below. An author cannot opt out by not mentioning it.
 *   2. Such a pathway carries exactly one `rate_comparison` annotation, with a value and a
 *      justification, saying how much slower this is.
 *   3. That annotation names a competing MechanismRoute, by its chem-core route id, and
 *      that route is not the disfavoured one itself. "Strongly disfavoured" with nothing
 *      said about what wins instead is the half answer CLAUDE.md warns about.
 *
 * WHAT IT DOES NOT ASSERT, AND THIS IS THE HALF THAT MATTERS MOST.
 *
 * That the step is wrong. A hindered SN2 with the annotation passes. Nothing in this
 * family rejects it, no other check fires on it, and there is a good fixture in the corpus
 * proving exactly that. The check also does not assert the rate factor: 10^-5 is CLAUDE.md
 * quoting a textbook, not a number this package compares against. The value string is read
 * for emptiness and for nothing else. It does not assert that the named competing route is
 * the right one either, only that a route is named. Which pathway actually wins is
 * chemistry a human wrote down.
 *
 * HOW A STRONGLY HINDERED CENTRE IS DETECTED, AND WHY IT IS COMPUTED RATHER THAN DECLARED.
 *
 * A `concerted_substitution` step on route sn2, at a carbon that is primary, one carbon
 * neighbour, whose single carbon neighbour carries three further carbons. That is the
 * neopentyl pattern: a CH2 with a quaternary carbon behind it, three methyls sitting across
 * the trajectory the nucleophile has to travel. It is a graph property of the `from` state
 * and needs no stereochemistry, no geometry, and no authored flag, which is the point. If
 * the trigger were an authored field, the fixture that forgot the annotation would also
 * have forgotten the flag, and the check would pass on precisely the file it exists for.
 *
 * WHAT THE DETECTOR DELIBERATELY DOES NOT CATCH. Tertiary SN2, which is a separate cause
 * (`sn2_at_tertiary_center`) and a separate rule, and beta branching short of quaternary,
 * isobutyl for instance, which is disfavoured by a factor of about 10^-2 rather than 10^-5
 * and is not what CLAUDE.md's paragraph is about. Widening this detector is a later phase's
 * work and needs its own fixtures; a detector that fires on cases nobody authored an
 * annotation for would fail correct chemistry.
 *
 * WHY "NAMES THE COMPETING PATHWAY" IS CHECKED BY LOOKING FOR A ROUTE ID.
 *
 * The requirement is literally about naming, and routes.ts exists so that names are a
 * closed union rather than free strings: "you cannot count, group, or compare names that
 * are arbitrary strings". So the convention is that the annotation writes the competing
 * route's chem-core id, `carbocation_rearrangement` for the neopentyl case, somewhere in
 * its value or justification. The check looks for one of those ids as a whole word. That
 * is not grading prose, it is requiring a name from a known list to be present, and it is
 * the only content assertion any of the three annotation checks makes.
 */

/** Cause id for the detected geometry. Advisory in chem-core, and advisory here. */
const CAUSE = "sn2_center_strongly_hindered";

interface HinderedCentre {
  readonly step: MechanismStep;
  readonly species: Species;
  readonly atomId: string;
  readonly betaCarbonId: string;
  readonly betaSubstituentCount: number;
}

function isSn2Substitution(step: MechanismStep, pathway: MechanismPathway): boolean {
  if (step.identity.elementaryStep !== "concerted_substitution") return false;
  return (step.identity.route ?? pathway.route) === "sn2";
}

function carbonNeighbours(species: Species, atomId: string): readonly string[] {
  return neighborIds(species, atomId).filter(
    (neighbourId) => findAtom(species, neighbourId)?.element === "C",
  );
}

/**
 * The neopentyl pattern, read off the graph of the `from` state.
 *
 * Primary carbon under attack, exactly one carbon neighbour, and that neighbour carrying
 * three carbons besides this one. Implicit hydrogens are not consulted: what blocks the
 * backside trajectory is carbon substituents, and a count of them is the same number
 * whether the remaining hydrogens are drawn or implied.
 */
function hinderedCentres(step: MechanismStep): readonly HinderedCentre[] {
  const found: HinderedCentre[] = [];

  for (const atomId of step.identity.reactionCenters) {
    const species = speciesContaining(step.from, atomId);
    if (species === undefined) continue;
    if (findAtom(species, atomId)?.element !== "C") continue;

    const alphaCarbons = carbonNeighbours(species, atomId);
    if (alphaCarbons.length !== 1) continue;

    const betaCarbonId = alphaCarbons[0] as string;
    const betaSubstituents = carbonNeighbours(species, betaCarbonId).filter(
      (neighbourId) => neighbourId !== atomId,
    );
    if (betaSubstituents.length < 3) continue;

    found.push({
      step,
      species,
      atomId,
      betaCarbonId,
      betaSubstituentCount: betaSubstituents.length,
    });
  }

  return found;
}

/**
 * Route ids named anywhere in the annotation, as whole words.
 *
 * Word boundaries matter: without them "sn1" would match inside a longer identifier and
 * "oxidation" inside "deoxidation". Route ids are the vocabulary because they are the
 * closed union; a label such as "carbocation rearrangement" is prose for a reader, and the
 * id is what another tool can look up.
 */
function routesNamedIn(text: string): readonly string[] {
  const haystack = text.toLowerCase();
  return allMechanismRoutes().filter((route) =>
    new RegExp(`(^|[^a-z0-9_])${route}([^a-z0-9_]|$)`).test(haystack),
  );
}

function competingRouteViolations(
  pathway: MechanismPathway,
  where: string,
  disfavouredRoute: string,
): Violation[] {
  const violations: Violation[] = [];

  for (const [index, annotation] of annotationsOfKind(pathway, "rate_comparison").entries()) {
    const named = routesNamedIn(`${annotation.value} ${annotation.justification}`).filter(
      (route) => route !== disfavouredRoute,
    );
    if (named.length > 0) continue;

    violations.push({
      where: `${where} / annotation[${index}] kind rate_comparison`,
      expected:
        "the competing pathway named by its chem-core MechanismRoute id, so it can be looked " +
        "up rather than only read",
      actual:
        `neither the value nor the justification names a route other than ${disfavouredRoute}. ` +
        `CLAUDE.md: the engine "says strongly disfavored, competing pathway likely AND NAMES ` +
        `THE COMPETING PATHWAY, because the methyl shift to a tertiary cation is the actual ` +
        `lesson". Saying only that this is slow leaves out the half that teaches`,
      cause: CAUSE,
    });
  }

  return violations;
}

const find: ViolationFinder = (fixture) => {
  const pathway = fixture.pathway;
  const centres = pathway.steps
    .filter((step) => isSn2Substitution(step, pathway))
    .flatMap((step) => hinderedCentres(step));

  if (centres.length === 0) return [];

  const where =
    `pathway ${pathway.id} / strongly hindered SN2 at ` +
    centres
      .map(
        (centre) =>
          `${centre.step.id} atom ${centre.atomId} (neighbour ${centre.betaCarbonId} carries ` +
          `${centre.betaSubstituentCount} further carbons)`,
      )
      .join("; ");

  const violations: Violation[] = [];
  violations.push(
    ...requiredAnnotationViolations(pathway, {
      kind: "rate_comparison",
      where,
      cause: CAUSE,
      because:
        "the attacked carbon is primary with a quaternary carbon behind it, the neopentyl " +
        "pattern, which reacts by SN2 roughly 10^-5 as fast as ethyl. CLAUDE.md says this is " +
        "NOT blocked and that the engine states how disfavoured it is and names the competing " +
        "pathway. Nothing here rejects the step; what is missing is the statement",
    }),
  );
  violations.push(...competingRouteViolations(pathway, where, "sn2"));

  return violations;
};

export const conservationDisfavouredRateComparison: Check = conservationCheck({
  name: "conservation-disfavoured-rate-comparison",
  description:
    "a strongly hindered SN2 centre detected from the structure is permitted, never blocked, and carries exactly one authored rate_comparison annotation that names the competing MechanismRoute by id",
  find,
});
