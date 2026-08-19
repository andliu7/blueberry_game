import type { Check, CheckFailure, CheckResult } from "../../check.ts";
import { failed, passed } from "../../check.ts";
import type { Adjudication, Evaluation } from "./adjudication.ts";
import { toNotMeasurable } from "./adjudication.ts";
import type { CorpusState } from "./corpus.ts";
import type { SpeciesPayload, SpeciesResult } from "./payload.ts";
import { oracleRun, unusableFailure, type ResultByRef } from "./run.ts";

/**
 * CHECK: authored stereodescriptors match the ones RDKit assigns.
 *
 * CLAUDE.md, "CIP stereodescriptors": chem-core does not implement CIP, RDKit assigns
 * descriptors in validators, and labels needed at runtime are precomputed at authoring
 * time and stored on the problem. This check is what makes that precomputation safe. The
 * authored label is a claim; rdCIPLabeler's answer is the reference; a disagreement is a
 * failure and the authored label is the thing presumed wrong.
 *
 * THIS IS NOT THE AROMATICITY EXCEPTION. CLAUDE.md's carve out is for aromaticity
 * perception and for sanitisation of reactive intermediates, not for CIP. An R that RDKit
 * calls S is a wrong label on a student's screen. It fails.
 *
 * FOUR THINGS ARE ASSERTED, each closing a way a wrong label can survive.
 *
 *   1. Authored and RDKit descriptors are equal, recomputed here rather than read off the
 *      sidecar's `agrees` field. CONTRACT.md says `agrees` is a convenience for a human
 *      reading raw output; a check that trusts the thing it is checking has checked
 *      nothing. The sidecar's own `agrees` is then compared against the recomputation, so
 *      a bug in either one is visible.
 *
 *   2. Every authored descriptor in the payload appears in the results. A descriptor the
 *      sidecar silently dropped would otherwise be a label nothing ever verified, which
 *      reads identically to a label that passed.
 *
 *   3. An authored descriptor at a centre RDKit does not label is a failure, not a pass.
 *      RDKit declining to assign means it does not see a defined stereocentre there, and
 *      an authored R on a centre that is not one is exactly the kind of thing that ends
 *      up drawn on a problem card.
 *
 *   4. A centre RDKit calls stereogenic that the author left unconfigured is an
 *      ADJUDICATION item, not a failure. Two entries in the current corpus are legitimate
 *      cases of this: the bridged bromonium's two carbons and the arenium ion's sp3
 *      carbon. Both are real chemistry where the configuration is either undefined or not
 *      the point, and failing them would make the suite red on correct chemistry. A human
 *      decides whether the corpus should pin them.
 *
 * A species carrying authored descriptors that did not sanitise is an adjudication item
 * rather than a pass or a failure: CONTRACT.md has the sidecar report nothing downstream
 * of a failed sanitisation, so there is no RDKit answer to compare against. The
 * sanitisation check owns the verdict on that state, and this check records only that the
 * comparison could not be made, so a declaration cannot silently take a descriptor
 * comparison with it.
 */

const CHECK_NAME = "oracle-stereo-descriptors";

const ATOM_DESCRIPTORS = ["R", "S"];
const BOND_DESCRIPTORS = ["E", "Z"];

function speciesPayloads(state: CorpusState): Map<string, SpeciesPayload> {
  const byId = new Map<string, SpeciesPayload>();
  for (const species of state.payload.species) byId.set(species.id, species);
  return byId;
}

function checkVocabulary(
  value: string | null,
  allowed: readonly string[],
  who: string,
  where: string,
  fixture: string,
): CheckFailure | null {
  if (value === null || value === undefined) return null;
  if (allowed.includes(value)) return null;
  return {
    expected: `${who} at ${where} is one of ${allowed.join(", ")}, or null`,
    actual: JSON.stringify(value),
    fixture,
  };
}

function evaluateSpecies(
  state: CorpusState,
  payload: SpeciesPayload,
  result: SpeciesResult,
  failures: CheckFailure[],
  adjudications: Adjudication[],
): void {
  const fixture = state.stateRef;
  const where = `${state.stateRef} species:${payload.id}`;

  if (!result.sanitization.ok) {
    const authoredAtoms = payload.atoms.filter((atom) => atom.stereo?.authoredDescriptor != null);
    const authoredBonds = payload.bonds.filter((bond) => bond.stereo?.authoredDescriptor != null);
    if (authoredAtoms.length > 0 || authoredBonds.length > 0) {
      adjudications.push({
        category: "not-comparable",
        where,
        finding:
          `${authoredAtoms.length} authored atom descriptor(s) and ` +
          `${authoredBonds.length} authored bond descriptor(s) could not be compared ` +
          `against RDKit, because this species did not sanitise ` +
          `(${result.sanitization.errorKind ?? "unknown"}). The sanitisation check owns ` +
          `the verdict on the state. These labels remain unverified.`,
      });
    }
    return;
  }

  const atomResults = new Map(result.atomDescriptors.map((one) => [one.atomId, one]));
  const bondResults = new Map(result.bondDescriptors.map((one) => [one.bondId, one]));

  for (const atom of payload.atoms) {
    const authored = atom.stereo?.authoredDescriptor ?? null;
    if (authored === null) continue;
    const descriptor = atomResults.get(atom.id);
    if (descriptor === undefined) {
      failures.push({
        expected: `an RDKit descriptor for atom ${atom.id}, which the author labelled ${authored}`,
        actual: "the oracle returned no descriptor for it, so the label was never verified",
        fixture,
      });
    }
  }

  for (const bond of payload.bonds) {
    const authored = bond.stereo?.authoredDescriptor ?? null;
    if (authored === null) continue;
    const descriptor = bondResults.get(bond.id);
    if (descriptor === undefined) {
      failures.push({
        expected: `an RDKit descriptor for bond ${bond.id}, which the author labelled ${authored}`,
        actual: "the oracle returned no descriptor for it, so the label was never verified",
        fixture,
      });
    }
  }

  for (const descriptor of result.atomDescriptors) {
    const at = `${where} atom:${descriptor.atomId}`;
    const badRdkit = checkVocabulary(descriptor.rdkit, ATOM_DESCRIPTORS, "the RDKit descriptor", at, fixture);
    if (badRdkit !== null) failures.push(badRdkit);
    const badAuthored = checkVocabulary(descriptor.authored, ATOM_DESCRIPTORS, "the authored descriptor", at, fixture);
    if (badAuthored !== null) failures.push(badAuthored);

    const agree = descriptor.rdkit === descriptor.authored;
    if (descriptor.agrees !== agree) {
      failures.push({
        expected: `the sidecar's agrees flag matches a recomputation: ${agree}`,
        actual: `the sidecar reported agrees ${descriptor.agrees} for rdkit ${String(descriptor.rdkit)} against authored ${String(descriptor.authored)}`,
        fixture,
      });
    }

    if (descriptor.authored === null) continue;
    if (descriptor.rdkit === null) {
      failures.push({
        expected: `RDKit assigns ${descriptor.authored} at ${at}`,
        actual:
          "RDKit assigned no CIP descriptor there, so it does not see a defined " +
          "stereocentre at that atom",
        fixture,
      });
      continue;
    }
    if (descriptor.rdkit !== descriptor.authored) {
      failures.push({
        expected: `authored ${descriptor.authored} at ${at}`,
        actual:
          `RDKit says ${descriptor.rdkit}. CLAUDE.md: where RDKit and chem-core disagree, ` +
          `RDKit is presumed correct. The authored label is wrong`,
        fixture,
      });
    }
  }

  for (const descriptor of result.bondDescriptors) {
    const at = `${where} bond:${descriptor.bondId}`;
    const badRdkit = checkVocabulary(descriptor.rdkit, BOND_DESCRIPTORS, "the RDKit descriptor", at, fixture);
    if (badRdkit !== null) failures.push(badRdkit);
    const badAuthored = checkVocabulary(descriptor.authored, BOND_DESCRIPTORS, "the authored descriptor", at, fixture);
    if (badAuthored !== null) failures.push(badAuthored);

    const agree = descriptor.rdkit === descriptor.authored;
    if (descriptor.agrees !== agree) {
      failures.push({
        expected: `the sidecar's agrees flag matches a recomputation: ${agree}`,
        actual: `the sidecar reported agrees ${descriptor.agrees} for rdkit ${String(descriptor.rdkit)} against authored ${String(descriptor.authored)}`,
        fixture,
      });
    }

    if (descriptor.authored === null) continue;
    if (descriptor.rdkit === null) {
      failures.push({
        expected: `RDKit assigns ${descriptor.authored} at ${at}`,
        actual:
          "RDKit assigned no CIP descriptor there, so it does not see a defined " +
          "stereogenic double bond. CONTRACT.md warns that arrangement and " +
          "authoredDescriptor are different statements: cis is geometry, Z is CIP",
        fixture,
      });
      continue;
    }
    if (descriptor.rdkit !== descriptor.authored) {
      failures.push({
        expected: `authored ${descriptor.authored} at ${at}`,
        actual:
          `RDKit says ${descriptor.rdkit}. CLAUDE.md: where RDKit and chem-core disagree, ` +
          `RDKit is presumed correct. The authored label is wrong`,
        fixture,
      });
    }
  }

  for (const element of result.unspecifiedPotentialStereo) {
    adjudications.push({
      category: "stereo-unspecified",
      where: `${where} ${element.kind}:${element.ref ?? "unmapped"}`,
      finding:
        `RDKit sees a potential ${element.kind} stereo element here with no configuration ` +
        `on it. Species SMILES ${result.canonicalSmiles ?? "unavailable"}. A human decides ` +
        `whether the corpus should pin a configuration or whether it is genuinely ` +
        `undefined at this step.`,
    });
  }
}

export function evaluateStereoDescriptors(
  states: readonly CorpusState[],
  resultByRef: ResultByRef,
): Evaluation {
  const failures: CheckFailure[] = [];
  const adjudications: Adjudication[] = [];

  for (const state of states) {
    const result = resultByRef.get(state.stateRef);
    if (result === undefined) {
      failures.push({
        expected: "a sidecar result for every corpus state",
        actual: "none came back",
        fixture: state.stateRef,
      });
      continue;
    }

    const payloads = speciesPayloads(state);
    const analysed = new Set(result.species.map((one) => one.id));

    for (const [speciesId, payload] of payloads) {
      if (analysed.has(speciesId)) continue;
      const authored =
        payload.atoms.filter((atom) => atom.stereo?.authoredDescriptor != null).length +
        payload.bonds.filter((bond) => bond.stereo?.authoredDescriptor != null).length;
      if (authored === 0) continue;
      failures.push({
        expected: `${authored} authored descriptor(s) on species ${speciesId} verified against RDKit`,
        actual:
          "the species produced no result at all, so nothing was verified. A build error " +
          "is a data error in the corpus and is never covered by a sanitizationMayFail " +
          "declaration",
        fixture: state.stateRef,
      });
    }

    for (const species of result.species) {
      const payload = payloads.get(species.id);
      if (payload === undefined) continue; // Reported by oracle-sanitization.
      evaluateSpecies(state, payload, species, failures, adjudications);
    }
  }

  return { failures, adjudications };
}

export const oracleStereoDescriptors: Check = {
  name: CHECK_NAME,
  description:
    "every authored R/S and E/Z label equals the descriptor rdCIPLabeler assigns to the same atom or bond",

  async run(context): Promise<CheckResult> {
    const run = await oracleRun(context);
    if (run.kind === "unusable") return failed([unusableFailure(CHECK_NAME, null)]);

    const evaluation = evaluateStereoDescriptors(run.data.corpus.states, run.data.resultByRef);
    const notMeasurable = toNotMeasurable(CHECK_NAME, evaluation.adjudications);

    if (evaluation.failures.length > 0) {
      return failed(evaluation.failures, { notMeasurable });
    }
    return passed({ notMeasurable });
  },
};
