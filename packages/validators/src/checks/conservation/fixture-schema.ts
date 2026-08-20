import fs from "node:fs/promises";
import path from "node:path";

import {
  allMechanismRoutes,
  createArrow,
  createAtom,
  createBond,
  createPathway,
  createSpecies,
  createState,
  createStep,
  isElement,
  type AuthoredAnnotation,
  type BondOrder,
  type DeclaredTorsion,
  type ElectronCount,
  type ElectronFlowArrow,
  type ElectronSink,
  type ElectronSource,
  type ElementaryStepKind,
  type MechanismPathway,
  type MechanismRoute,
  type MechanismState,
  type MechanismStep,
  type SpeciesRole,
  type SpectatorReason,
  type StateMember,
} from "@blueberry/chem-core";

/**
 * The on disk fixture format, and the only thing that turns bytes into chem-core objects.
 *
 * WHY JSON AND NOT TYPESCRIPT.
 *
 * A fixture is evidence. Evidence that is also code can compute its own answer, import a
 * helper that happens to be the thing under test, or quietly call a chem-core constructor
 * that normalises the very field the fixture was written to break. JSON cannot do any of
 * that. It is inert, it diffs line by line in a review, it is hashed by
 * validators.lock.json as data, and an adversary can author one without touching a build.
 *
 * WHY THE PARSER IS STRICT ABOUT UNKNOWN KEYS.
 *
 * A fixture that carries "justifcation" instead of "justification" would otherwise read as
 * a spectator with no justification, which is a real finding produced by a typo rather
 * than by chemistry. Worse, a typo in "mustFail" would silently downgrade a negative
 * control to an ordinary fixture, and the check it was meant to prove would go unproven.
 * Unknown keys are rejected everywhere.
 *
 * WHY EMPTY STRINGS ARE NOT REJECTED HERE.
 *
 * `justification: ""` on a spectator declaration is exactly what
 * `conservation-spectator-declaration` exists to catch. If the parser rejected it, the
 * negative control could not be written, and the check could never be shown to fire.
 * The parser enforces shape. The checks enforce chemistry and policy.
 *
 * WHAT V2 ADDED, AND WHY THE VERSION WENT UP.
 *
 * V1 carried no declared torsions and no authored annotations, on the stated ground that
 * a field no check reads is a field that can be wrong forever without anyone noticing.
 * That was right at the time and it stopped being right the moment CLAUDE.md's three
 * graded chemistry requirements had nowhere to live but prose. `MechanismPathway` in
 * chem-core already carried `annotations`, and `Species` already carried
 * `DeclaredTorsion`, so the corpus could not say what the engine could already model:
 *
 *   the SN1 racemisation ratio, which is an authoring annotation and never a computed
 *   assertion, so it has to be readable as data before any check can require it,
 *   the conformational justification a syn periplanar E2 is flagged as requiring,
 *   the rate comparison that names the competing pathway on a strongly disfavoured but
 *   permitted step.
 *
 * V2 adds `pathway.annotations` and `species.declaredTorsions`, shaped exactly like the
 * chem-core types they are parsed into. No parallel shape, no second vocabulary: the
 * annotation kinds are `AuthoredAnnotation["kind"]` and a torsion is a `DeclaredTorsion`.
 * Three checks read them, and each has a negative control, so the rule above still holds.
 *
 * BREAKING, DELIBERATELY. A fixture still declaring `schemaVersion: 1` is refused by
 * parseFixture with a load error, which every check in the family reports as a failure.
 * There is no silent upgrade path and there should not be one: a v1 file loaded as v2
 * would be a syn periplanar E2 with no torsion and no annotation, which is precisely what
 * the new checks exist to catch, and it would be read as an authoring gap rather than as a
 * stale file.
 *
 * WHAT THIS SCHEMA STILL DELIBERATELY DOES NOT CARRY.
 *
 * Stereo configuration itself. No R/S, no E/Z, no wedge and hash, no coordinates. A
 * declared torsion is one authored number about one four atom chain, which is what E2
 * periplanarity turns on and nothing more. CIP descriptors are RDKit's job in the oracle
 * corpus (`.oracle.json`), per CLAUDE.md: chem-core computes geometry and never assigns
 * descriptors. When a stereochemistry family is written it extends this schema again, and
 * the version number goes up again.
 */

export const FIXTURE_SCHEMA_VERSION = 2;

/** Only files matching this are loaded. Anything else in fixtures/ is reported. */
export const FIXTURE_SUFFIX = ".fixture.json";

/**
 * The oracle's own fixture extension, documented in corpus.ts and python/CONTRACT.md.
 * Named here so the stray file sweep can tell "not a conservation fixture" apart from
 * "should not be in this directory at all".
 */
export const ORACLE_FIXTURE_SUFFIX = ".oracle.json";

/**
 * Files allowed to sit in fixtures/ without being fixtures.
 *
 * Kept short and explicit. Anything not on this list and not ending in the fixture suffix
 * is a loud failure, because a fixture saved as ".json" instead of ".fixture.json" would
 * otherwise sit in the corpus verifying nothing while inflating the count.
 */
import { NON_FIXTURE_FILES } from "../../fixtures.ts";
export { NON_FIXTURE_FILES };

/**
 * The names of the ten checks in this family.
 *
 * A fixture's `expect.mustFail` names checks from this list. Naming anything else is a
 * failure rather than a no-op, so a renamed check cannot silently orphan its own negative
 * control.
 *
 * `conservation-arrow-legality` is the seventh and was added after the Phase 0 adversary
 * showed that nothing in the package asked whether a single arrow was drawable, only
 * whether all of them summed to the right total. The fixture that proved it,
 * good-adversarial-sn2-with-swapped-arrows-producing-identical-declared-deltas, recorded
 * in its own note that it could not be declared broken because "there is no check name in
 * CONSERVATION_CHECK_NAMES this package could declare as the one that is supposed to catch
 * it". This line is that name.
 *
 * The last three arrived with schema v2 and are the same story a second time. The Phase 1
 * corpus builder recorded three CLAUDE.md requirements it could not express as data and
 * had to leave as prose in `expect.note`, where no check could read them. These are their
 * names. They are annotation checks rather than arithmetic checks, and they sit in this
 * family because they run over the same corpus, use the same two sided good and broken
 * declaration, and would otherwise need a second copy of family.ts to say the same things.
 */
export const CONSERVATION_CHECK_NAMES = [
  "conservation-valence",
  "conservation-mass",
  "conservation-charge",
  "conservation-electron-flow",
  "conservation-arrow-legality",
  "conservation-proton-transfer",
  "conservation-spectator-declaration",
  "conservation-stereorandom-annotation",
  "conservation-periplanarity-declaration",
  "conservation-disfavoured-rate-comparison",
] as const;

export type ConservationCheckName = (typeof CONSERVATION_CHECK_NAMES)[number];

function isConservationCheckName(value: string): value is ConservationCheckName {
  return (CONSERVATION_CHECK_NAMES as readonly string[]).includes(value);
}

/**
 * Runtime allowlists for chem-core unions that have no runtime member list.
 *
 * Each is declared as a Record over the union, so leaving a member out is a compile
 * error rather than a fixture that mysteriously will not parse. `allMechanismRoutes()`
 * already exists in chem-core, so routes are read from there instead of restated.
 */
const SPECIES_ROLES: Readonly<Record<SpeciesRole, true>> = {
  substrate: true,
  reagent: true,
  nucleophile: true,
  electrophile: true,
  acid: true,
  base: true,
  catalyst: true,
  counterion: true,
  solvent: true,
  intermediate: true,
  leaving_group: true,
  product: true,
  byproduct: true,
};

const SPECTATOR_REASONS: Readonly<Record<SpectatorReason, true>> = {
  inert_solvent: true,
  unreacting_counterion: true,
  bulk_medium: true,
  authored_simplification: true,
};

const ELEMENTARY_STEP_KINDS: Readonly<Record<ElementaryStepKind, true>> = {
  proton_transfer: true,
  nucleophilic_attack: true,
  leaving_group_departure: true,
  concerted_substitution: true,
  concerted_elimination: true,
  bond_heterolysis: true,
  bond_homolysis: true,
  pi_bond_attack: true,
  hydride_shift: true,
  alkyl_shift: true,
  ring_opening: true,
  ring_closure: true,
  radical_addition_step: true,
  radical_abstraction: true,
  radical_recombination: true,
  tautomerisation: true,
  coordination: true,
  pericyclic_step: true,
};

/**
 * The authored annotation kinds, taken from chem-core rather than restated as strings.
 *
 * Typed `Record<AuthoredAnnotation["kind"], true>` for the same reason as every allowlist
 * above it: adding a kind in chem-core and forgetting it here is a compile error, not a
 * fixture that mysteriously will not parse. The reverse, a kind here that chem-core does
 * not define, is also a compile error.
 */
const ANNOTATION_KINDS: Readonly<Record<AuthoredAnnotation["kind"], true>> = {
  racemisation_ratio: true,
  conformational_justification: true,
  rate_comparison: true,
  condition_note: true,
  cip_label_source: true,
};

export interface FixtureExpectation {
  readonly kind: "good" | "broken";
  /** Checks this fixture is declared to break. Empty for a good fixture. */
  readonly mustFail: readonly ConservationCheckName[];
  /** Why it is broken, for the human reading a failure. Empty for a good fixture. */
  readonly note: string;
}

export interface LoadedFixture {
  /** Absolute path on disk. */
  readonly absolutePath: string;
  /** Package relative, forward slashes. This is what appears in a report. */
  readonly relativePath: string;
  readonly id: string;
  readonly title: string;
  readonly expect: FixtureExpectation;
  readonly pathway: MechanismPathway;
}

/** A fixture file that could not be turned into a pathway, and why. */
export interface FixtureLoadError {
  readonly relativePath: string;
  readonly message: string;
}

export interface FixtureCorpus {
  readonly fixtures: readonly LoadedFixture[];
  readonly loadErrors: readonly FixtureLoadError[];
  /** Files in fixtures/ that are neither a fixture nor on the allowlist. */
  readonly strayFiles: readonly string[];
}

class FixtureError extends Error {
  constructor(at: string, message: string) {
    super(`${at}: ${message}`);
    this.name = "FixtureError";
  }
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "an array";
  return typeof value;
}

function asObject(value: unknown, at: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FixtureError(at, `expected an object, got ${describe(value)}`);
  }
  return value as Record<string, unknown>;
}

function requireKeys(
  object: Record<string, unknown>,
  at: string,
  required: readonly string[],
  optional: readonly string[],
): void {
  const allowed = new Set<string>([...required, ...optional]);
  for (const key of Object.keys(object)) {
    if (!allowed.has(key)) {
      throw new FixtureError(
        at,
        `unknown key "${key}". Allowed keys: ${[...allowed].sort().join(", ")}`,
      );
    }
  }
  for (const key of required) {
    if (!Object.prototype.hasOwnProperty.call(object, key)) {
      throw new FixtureError(at, `missing required key "${key}"`);
    }
  }
}

function asString(object: Record<string, unknown>, key: string, at: string): string {
  const value = object[key];
  if (typeof value !== "string") {
    throw new FixtureError(`${at}.${key}`, `expected a string, got ${describe(value)}`);
  }
  return value;
}

function asNonEmptyString(object: Record<string, unknown>, key: string, at: string): string {
  const value = asString(object, key, at);
  if (value.trim() === "") {
    throw new FixtureError(`${at}.${key}`, "expected a non empty string");
  }
  return value;
}

function asInteger(
  object: Record<string, unknown>,
  key: string,
  at: string,
  fallback?: number,
): number {
  const value = object[key];
  if (value === undefined) {
    if (fallback !== undefined) return fallback;
    throw new FixtureError(`${at}.${key}`, "missing, and this field has no default");
  }
  if (typeof value !== "number" || !Number.isInteger(value)) {
    throw new FixtureError(`${at}.${key}`, `expected an integer, got ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * A finite number, integral or not.
 *
 * Torsion angles are the only non integer quantity in the schema, and a dihedral of 60.5
 * degrees is an ordinary thing for an author to state. No range is enforced here: whether
 * a number is a legal dihedral, and whether it is near enough to 0 or 180 to be
 * periplanar, is chemistry, and chemistry lives in the checks. NaN and Infinity are shape
 * errors and are refused, because neither can be compared against a tolerance and both
 * would make every downstream comparison quietly false.
 */
function asFiniteNumber(object: Record<string, unknown>, key: string, at: string): number {
  const value = object[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new FixtureError(
      `${at}.${key}`,
      `expected a finite number, got ${JSON.stringify(value) ?? describe(value)}`,
    );
  }
  return value;
}

function asArray(object: Record<string, unknown>, key: string, at: string): readonly unknown[] {
  const value = object[key];
  if (!Array.isArray(value)) {
    throw new FixtureError(`${at}.${key}`, `expected an array, got ${describe(value)}`);
  }
  return value;
}

function parseAtom(raw: unknown, at: string) {
  const object = asObject(raw, at);
  requireKeys(
    object,
    at,
    ["id", "element"],
    ["formalCharge", "lonePairs", "unpairedElectrons", "implicitHydrogens", "isotope"],
  );

  const id = asNonEmptyString(object, "id", at);
  const element = asNonEmptyString(object, "element", at);
  if (!isElement(element)) {
    throw new FixtureError(`${at}.element`, `"${element}" is not in the chem-core element table`);
  }

  const isotopePresent = Object.prototype.hasOwnProperty.call(object, "isotope");

  return createAtom({
    id,
    element,
    formalCharge: asInteger(object, "formalCharge", at, 0),
    lonePairs: asInteger(object, "lonePairs", at, 0),
    unpairedElectrons: asInteger(object, "unpairedElectrons", at, 0),
    implicitHydrogens: asInteger(object, "implicitHydrogens", at, 0),
    ...(isotopePresent ? { isotope: asInteger(object, "isotope", at) } : {}),
  });
}

function parseBond(raw: unknown, at: string) {
  const object = asObject(raw, at);
  requireKeys(object, at, ["id", "a", "b"], ["order"]);

  const order = asInteger(object, "order", at, 1);
  if (order !== 1 && order !== 2 && order !== 3) {
    throw new FixtureError(`${at}.order`, `bond order must be 1, 2, or 3, got ${order}`);
  }

  return createBond({
    id: asNonEmptyString(object, "id", at),
    a: asNonEmptyString(object, "a", at),
    b: asNonEmptyString(object, "b", at),
    order: order as BondOrder,
  });
}

/**
 * One authored torsion angle. Schema v2.
 *
 * `atoms` is exactly four ids, because that is what a dihedral is measured over, and the
 * tuple type in chem-core says so. Whether those four are a bonded chain, whether they
 * exist in the state at all, and whether the angle is a legal one are all checked by
 * `conservation-periplanarity-declaration`, not here. The parser is shape.
 *
 * `justification` is read with `asString` and not `asNonEmptyString`, following the
 * spectator declaration precedent above. species.ts requires a justification because a
 * stated torsion nobody defended is a number a validator will trust and a student will be
 * graded against, and the negative control for that rule is a fixture carrying an empty
 * one. A parser that refused it would make that control unwritable.
 */
function parseDeclaredTorsion(raw: unknown, at: string): DeclaredTorsion {
  const object = asObject(raw, at);
  requireKeys(object, at, ["atoms", "degrees", "justification"], []);

  const ids = asArray(object, "atoms", at);
  if (ids.length !== 4) {
    throw new FixtureError(
      `${at}.atoms`,
      `a dihedral is measured over exactly 4 atoms, got ${ids.length}`,
    );
  }
  const atoms = ids.map((entry, index) => {
    if (typeof entry !== "string" || entry.trim() === "") {
      throw new FixtureError(`${at}.atoms[${index}]`, "expected a non empty atom id");
    }
    return entry;
  });

  return {
    atoms: [atoms[0] as string, atoms[1] as string, atoms[2] as string, atoms[3] as string],
    degrees: asFiniteNumber(object, "degrees", at),
    justification: asString(object, "justification", at),
  };
}

function parseSpecies(raw: unknown, at: string) {
  const object = asObject(raw, at);
  requireKeys(object, at, ["id", "atoms"], ["label", "bonds", "declaredTorsions"]);

  const atoms = asArray(object, "atoms", at).map((entry, index) =>
    parseAtom(entry, `${at}.atoms[${index}]`),
  );
  const bonds = Object.prototype.hasOwnProperty.call(object, "bonds")
    ? asArray(object, "bonds", at).map((entry, index) => parseBond(entry, `${at}.bonds[${index}]`))
    : [];

  const labelPresent = Object.prototype.hasOwnProperty.call(object, "label");
  const torsionsPresent = Object.prototype.hasOwnProperty.call(object, "declaredTorsions");

  return createSpecies({
    id: asNonEmptyString(object, "id", at),
    atoms,
    bonds,
    ...(labelPresent ? { label: asNonEmptyString(object, "label", at) } : {}),
    ...(torsionsPresent
      ? {
          declaredTorsions: asArray(object, "declaredTorsions", at).map((entry, index) =>
            parseDeclaredTorsion(entry, `${at}.declaredTorsions[${index}]`),
          ),
        }
      : {}),
  });
}

function parseMember(raw: unknown, at: string): StateMember {
  const object = asObject(raw, at);
  requireKeys(object, at, ["role", "species"], []);

  const role = asNonEmptyString(object, "role", at);
  if (!Object.prototype.hasOwnProperty.call(SPECIES_ROLES, role)) {
    throw new FixtureError(
      `${at}.role`,
      `"${role}" is not a SpeciesRole. Known roles: ${Object.keys(SPECIES_ROLES).sort().join(", ")}`,
    );
  }

  return { role: role as SpeciesRole, species: parseSpecies(object["species"], `${at}.species`) };
}

function parseSpectatorDeclaration(raw: unknown, at: string) {
  const object = asObject(raw, at);
  requireKeys(object, at, ["speciesId", "reason", "justification", "declaredBy"], []);

  const reason = asNonEmptyString(object, "reason", at);
  if (!Object.prototype.hasOwnProperty.call(SPECTATOR_REASONS, reason)) {
    throw new FixtureError(
      `${at}.reason`,
      `"${reason}" is not a SpectatorReason. Known reasons: ` +
        `${Object.keys(SPECTATOR_REASONS).sort().join(", ")}`,
    );
  }

  // justification and declaredBy are read with asString, not asNonEmptyString. An empty
  // justification is the thing conservation-spectator-declaration exists to catch, and a
  // parser that rejected it would make that negative control unwritable.
  return {
    speciesId: asNonEmptyString(object, "speciesId", at),
    reason: reason as SpectatorReason,
    justification: asString(object, "justification", at),
    declaredBy: asString(object, "declaredBy", at),
  };
}

function parseState(raw: unknown, at: string): MechanismState {
  const object = asObject(raw, at);
  requireKeys(object, at, ["id", "members"], ["spectators"]);

  const members = asArray(object, "members", at).map((entry, index) =>
    parseMember(entry, `${at}.members[${index}]`),
  );
  const spectators = Object.prototype.hasOwnProperty.call(object, "spectators")
    ? asArray(object, "spectators", at).map((entry, index) =>
        parseSpectatorDeclaration(entry, `${at}.spectators[${index}]`),
      )
    : [];

  return createState({ id: asNonEmptyString(object, "id", at), members, spectators });
}

function parseSource(raw: unknown, at: string): ElectronSource {
  const object = asObject(raw, at);
  const kind = asNonEmptyString(object, "kind", at);

  switch (kind) {
    case "lonePair":
    case "singleElectron":
      requireKeys(object, at, ["kind", "atomId"], []);
      return { kind, atomId: asNonEmptyString(object, "atomId", at) };
    case "bond":
      requireKeys(object, at, ["kind", "bondId"], []);
      return { kind, bondId: asNonEmptyString(object, "bondId", at) };
    default:
      throw new FixtureError(
        `${at}.kind`,
        `"${kind}" is not an ElectronSource kind. Known kinds: bond, lonePair, singleElectron`,
      );
  }
}

function parseSink(raw: unknown, at: string): ElectronSink {
  const object = asObject(raw, at);
  const kind = asNonEmptyString(object, "kind", at);

  switch (kind) {
    case "atom":
      requireKeys(object, at, ["kind", "atomId"], []);
      return { kind, atomId: asNonEmptyString(object, "atomId", at) };
    case "betweenAtoms": {
      requireKeys(object, at, ["kind", "atomIds"], []);
      const ids = asArray(object, "atomIds", at);
      if (ids.length !== 2) {
        throw new FixtureError(`${at}.atomIds`, `expected exactly 2 atom ids, got ${ids.length}`);
      }
      const [first, second] = ids;
      if (typeof first !== "string" || typeof second !== "string") {
        throw new FixtureError(`${at}.atomIds`, "both entries must be strings");
      }
      return { kind, atomIds: [first, second] };
    }
    default:
      throw new FixtureError(
        `${at}.kind`,
        `"${kind}" is not an ElectronSink kind. Known kinds: atom, betweenAtoms`,
      );
  }
}

function parseArrow(raw: unknown, at: string): ElectronFlowArrow {
  const object = asObject(raw, at);
  requireKeys(object, at, ["id", "source", "sink"], ["electrons"]);

  const electrons = asInteger(object, "electrons", at, 2);
  if (electrons !== 1 && electrons !== 2) {
    throw new FixtureError(`${at}.electrons`, `must be 1 or 2, got ${electrons}`);
  }

  return createArrow({
    id: asNonEmptyString(object, "id", at),
    source: parseSource(object["source"], `${at}.source`),
    sink: parseSink(object["sink"], `${at}.sink`),
    electrons: electrons as ElectronCount,
  });
}

function parseRoute(value: string, at: string): MechanismRoute {
  const routes = allMechanismRoutes();
  if (!(routes as readonly string[]).includes(value)) {
    throw new FixtureError(at, `"${value}" is not a MechanismRoute. Known: ${routes.join(", ")}`);
  }
  return value as MechanismRoute;
}

function parseStep(raw: unknown, at: string): MechanismStep {
  const object = asObject(raw, at);
  requireKeys(object, at, ["id", "from", "to", "identity"], ["arrows"]);

  const identityRaw = asObject(object["identity"], `${at}.identity`);
  requireKeys(identityRaw, `${at}.identity`, ["elementaryStep", "reactionCenters"], ["route"]);

  const elementaryStep = asNonEmptyString(identityRaw, "elementaryStep", `${at}.identity`);
  if (!Object.prototype.hasOwnProperty.call(ELEMENTARY_STEP_KINDS, elementaryStep)) {
    throw new FixtureError(
      `${at}.identity.elementaryStep`,
      `"${elementaryStep}" is not an ElementaryStepKind. Known kinds: ` +
        `${Object.keys(ELEMENTARY_STEP_KINDS).sort().join(", ")}`,
    );
  }

  const reactionCenters = asArray(identityRaw, "reactionCenters", `${at}.identity`).map(
    (entry, index) => {
      if (typeof entry !== "string" || entry.trim() === "") {
        throw new FixtureError(
          `${at}.identity.reactionCenters[${index}]`,
          "expected a non empty atom id",
        );
      }
      return entry;
    },
  );

  const routePresent = Object.prototype.hasOwnProperty.call(identityRaw, "route");

  const arrows = Object.prototype.hasOwnProperty.call(object, "arrows")
    ? asArray(object, "arrows", at).map((entry, index) =>
        parseArrow(entry, `${at}.arrows[${index}]`),
      )
    : [];

  return createStep({
    id: asNonEmptyString(object, "id", at),
    from: parseState(object["from"], `${at}.from`),
    to: parseState(object["to"], `${at}.to`),
    arrows,
    identity: {
      elementaryStep: elementaryStep as ElementaryStepKind,
      reactionCenters,
      ...(routePresent
        ? {
            route: parseRoute(
              asNonEmptyString(identityRaw, "route", `${at}.identity`),
              `${at}.identity.route`,
            ),
          }
        : {}),
    },
  });
}

/**
 * One authored annotation. Schema v2.
 *
 * step.ts calls this "an annotation the author asserts that the engine must never
 * compute", and that sentence is the whole reason it is a field on the fixture rather than
 * something a check derives. The SN1 racemisation ratio depends on substrate, solvent,
 * leaving group, and ion pairing, and CLAUDE.md is explicit that it is an authoring
 * annotation and never a computed assertion. A number the corpus states is a number a
 * human can be held to. A number the engine computes is a number that will be wrong.
 *
 * `value` and `justification` are read with `asString`. Same precedent, same reason: the
 * checks below reject an empty one and each has a fixture proving it.
 */
function parseAnnotation(raw: unknown, at: string): AuthoredAnnotation {
  const object = asObject(raw, at);
  requireKeys(object, at, ["kind", "value", "justification"], []);

  const kind = asNonEmptyString(object, "kind", at);
  if (!Object.prototype.hasOwnProperty.call(ANNOTATION_KINDS, kind)) {
    throw new FixtureError(
      `${at}.kind`,
      `"${kind}" is not an AuthoredAnnotation kind. Known kinds: ` +
        `${Object.keys(ANNOTATION_KINDS).sort().join(", ")}`,
    );
  }

  return {
    kind: kind as AuthoredAnnotation["kind"],
    value: asString(object, "value", at),
    justification: asString(object, "justification", at),
  };
}

function parsePathway(raw: unknown, at: string): MechanismPathway {
  const object = asObject(raw, at);
  requireKeys(object, at, ["id", "route", "steps"], ["annotations"]);

  const steps = asArray(object, "steps", at).map((entry, index) =>
    parseStep(entry, `${at}.steps[${index}]`),
  );
  if (steps.length === 0) {
    throw new FixtureError(`${at}.steps`, "a pathway with no steps verifies nothing");
  }

  const annotationsPresent = Object.prototype.hasOwnProperty.call(object, "annotations");

  return createPathway({
    id: asNonEmptyString(object, "id", at),
    route: parseRoute(asNonEmptyString(object, "route", at), `${at}.route`),
    steps,
    ...(annotationsPresent
      ? {
          annotations: asArray(object, "annotations", at).map((entry, index) =>
            parseAnnotation(entry, `${at}.annotations[${index}]`),
          ),
        }
      : {}),
  });
}

function parseExpectation(raw: unknown, at: string): FixtureExpectation {
  const object = asObject(raw, at);
  requireKeys(object, at, ["kind"], ["mustFail", "note"]);

  const kind = asNonEmptyString(object, "kind", at);
  if (kind !== "good" && kind !== "broken") {
    throw new FixtureError(`${at}.kind`, `must be "good" or "broken", got "${kind}"`);
  }

  const mustFailRaw = Object.prototype.hasOwnProperty.call(object, "mustFail")
    ? asArray(object, "mustFail", at)
    : [];
  const mustFail: ConservationCheckName[] = [];
  for (const [index, entry] of mustFailRaw.entries()) {
    if (typeof entry !== "string" || !isConservationCheckName(entry)) {
      throw new FixtureError(
        `${at}.mustFail[${index}]`,
        `"${String(entry)}" is not a check in this family. Known: ` +
          `${CONSERVATION_CHECK_NAMES.join(", ")}`,
      );
    }
    if (mustFail.includes(entry)) {
      throw new FixtureError(`${at}.mustFail[${index}]`, `"${entry}" is listed twice`);
    }
    mustFail.push(entry);
  }

  const note = Object.prototype.hasOwnProperty.call(object, "note") ? asString(object, "note", at) : "";

  if (kind === "good" && mustFail.length > 0) {
    throw new FixtureError(at, "a good fixture cannot declare mustFail entries");
  }
  if (kind === "broken" && mustFail.length === 0) {
    throw new FixtureError(
      at,
      "a broken fixture must name at least one check in mustFail, otherwise it is a " +
        "negative control that proves nothing",
    );
  }
  if (kind === "broken" && note.trim() === "") {
    throw new FixtureError(at, "a broken fixture must carry a note saying what is wrong with it");
  }

  return { kind, mustFail, note };
}

/** Turn one file's text into a fixture. Throws FixtureError on anything malformed. */
export function parseFixture(text: string, absolutePath: string, relativePath: string): LoadedFixture {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new FixtureError("<file>", `not valid JSON: ${String(error)}`);
  }

  const object = asObject(raw, "<root>");
  requireKeys(object, "<root>", ["schemaVersion", "id", "title", "expect", "pathway"], []);

  const schemaVersion = asInteger(object, "schemaVersion", "<root>");
  if (schemaVersion !== FIXTURE_SCHEMA_VERSION) {
    throw new FixtureError(
      "<root>.schemaVersion",
      `is ${schemaVersion}, this loader understands ${FIXTURE_SCHEMA_VERSION}`,
    );
  }

  const id = asNonEmptyString(object, "id", "<root>");
  const expectedId = path.basename(absolutePath, FIXTURE_SUFFIX);
  if (id !== expectedId) {
    throw new FixtureError(
      "<root>.id",
      `is "${id}" but the file is named "${expectedId}${FIXTURE_SUFFIX}". ` +
        `They must match, so a copy pasted fixture cannot hide behind a new filename.`,
    );
  }

  return {
    absolutePath,
    relativePath,
    id,
    title: asNonEmptyString(object, "title", "<root>"),
    expect: parseExpectation(object["expect"], "<root>.expect"),
    pathway: parsePathway(object["pathway"], "<root>.pathway"),
  };
}

function toPosix(value: string): string {
  return value.split(path.sep).join("/");
}

/**
 * Load every fixture the harness handed us.
 *
 * `context.fixtures` is the harness's own recursive scan of fixtures/, so this function
 * never walks the directory itself. Counting fixtures in two places is how the two counts
 * end up disagreeing.
 *
 * Files that are neither a fixture nor on NON_FIXTURE_FILES come back in `strayFiles`
 * rather than being ignored. A fixture saved with the wrong extension is invisible to
 * every check while still raising the corpus count, which is the shape of a green run
 * that verified less than the run before it.
 */
export async function loadCorpus(
  fixturePaths: readonly string[],
  packageRoot: string,
): Promise<FixtureCorpus> {
  const fixtures: LoadedFixture[] = [];
  const loadErrors: FixtureLoadError[] = [];
  const strayFiles: string[] = [];

  for (const absolutePath of fixturePaths) {
    const relativePath = toPosix(path.relative(packageRoot, absolutePath));
    const base = path.basename(absolutePath);

    if (!base.endsWith(FIXTURE_SUFFIX)) {
      // A `.oracle.json` here is a fixture, just not one of ours.
      //
      // corpus.ts and python/CONTRACT.md both document the fixtures directory as the
      // sanctioned place for a chem-core state to reach the RDKit oracle: any file whose
      // name ends `.oracle.json` is picked up automatically. Nobody widened this
      // allowlist when that path was built, so the documented capability was unusable.
      // The first such file made all six conservation checks report a stray and the
      // suite went red on a file that was exactly where it was supposed to be. Found by
      // the Phase 0 adversary, which could not fix it from inside fixtures/.
      //
      // It is deliberately not added to NON_FIXTURE_FILES: an oracle fixture is real
      // corpus and must keep counting toward the fixture total. It is only not a
      // conservation fixture.
      if (!NON_FIXTURE_FILES.includes(base) && !base.endsWith(ORACLE_FIXTURE_SUFFIX)) {
        strayFiles.push(relativePath);
      }
      continue;
    }

    let text: string;
    try {
      text = await fs.readFile(absolutePath, "utf8");
    } catch (error) {
      loadErrors.push({ relativePath, message: `could not be read: ${String(error)}` });
      continue;
    }

    try {
      fixtures.push(parseFixture(text, absolutePath, relativePath));
    } catch (error) {
      loadErrors.push({
        relativePath,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  const seenIds = new Map<string, string>();
  for (const fixture of fixtures) {
    const previous = seenIds.get(fixture.id);
    if (previous !== undefined) {
      loadErrors.push({
        relativePath: fixture.relativePath,
        message: `fixture id "${fixture.id}" is also used by ${previous}`,
      });
    }
    seenIds.set(fixture.id, fixture.relativePath);
  }

  fixtures.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  loadErrors.sort((left, right) => left.relativePath.localeCompare(right.relativePath));
  strayFiles.sort();

  return { fixtures, loadErrors, strayFiles };
}
