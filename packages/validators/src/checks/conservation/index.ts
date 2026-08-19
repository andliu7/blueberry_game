import type { Check } from "../../check.ts";
import { conservationCharge } from "./charge.ts";
import { conservationElectronFlow } from "./electron-flow.ts";
import { CONSERVATION_CHECK_NAMES } from "./fixture-schema.ts";
import { conservationMass } from "./mass.ts";
import { conservationProtonTransfer } from "./proton-transfer.ts";
import { conservationSpectatorDeclaration } from "./spectator.ts";
import { conservationValence } from "./valence.ts";

/**
 * The conservation check family.
 *
 * Six checks, one export. src/checks/index.ts spreads this array into the registry, so
 * adding a seventh check to this family is a change in this directory and nowhere else.
 *
 * ORDER IS THE ORDER A FAILURE IS EASIEST TO READ IN.
 *
 * Valence first, because an atom whose declared charge disagrees with its structure makes
 * every total downstream wrong in a way that reads as a conservation error. Then the
 * three conservation laws in the order CLAUDE.md states them. Then the two boundary
 * checks, which are about what was allowed into the arithmetic rather than about the
 * arithmetic.
 *
 * WHAT THE FAMILY DOES NOT COVER, so nobody reads a green run as more than it is.
 * Stereochemistry, sterics, reactivity, route ordering, and RDKit adjudication are other
 * families. A step can conserve everything here and still be chemically wrong.
 */
export const conservationChecks: readonly Check[] = [
  conservationValence,
  conservationMass,
  conservationCharge,
  conservationElectronFlow,
  conservationProtonTransfer,
  conservationSpectatorDeclaration,
];

/**
 * The registered names must be exactly the names a fixture is allowed to put in
 * `expect.mustFail`.
 *
 * Checked at module load rather than inside a check, because if the two lists drift then
 * a fixture's negative control points at a check that does not run, and every check in
 * the family would then have to notice separately. Throwing here is a harness error, and
 * src/cli.ts reports that as exit 3 with no results, which is the correct outcome for a
 * suite that cannot describe itself.
 */
const registeredNames = conservationChecks.map((check) => check.name).sort();
const declaredNames = [...CONSERVATION_CHECK_NAMES].sort();
if (registeredNames.join("|") !== declaredNames.join("|")) {
  throw new Error(
    `conservation family mismatch. Registered: ${registeredNames.join(", ")}. ` +
      `Nameable in a fixture's mustFail: ${declaredNames.join(", ")}. ` +
      `A fixture cannot name a check that does not run, and a check with no nameable ` +
      `name can never be given a negative control.`,
  );
}
