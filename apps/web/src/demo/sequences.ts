/**
 * Multi-step problems: an ordered chain of MechanismSteps played as one
 * exercise, each step's own from/to states authored whole, exactly the
 * beat model in docs/DATA-MODEL.md. Owner spec, 2026-08-26: "build a version
 * without the arrows for a multi step problem" — sequences run ARROWLESS:
 * the electron primitive carries the gesture and no committed arrow glyphs
 * accumulate; each solved step plays its animation and the runner advances.
 *
 * The first sequence is Unit 7 spine chemistry: base-catalysed hydration of
 * formaldehyde. Step 1 is the registry's carbonyl addition (the tetrahedral
 * collapse the owner asked about by name); step 2 protonates the alkoxide
 * with hydronium to the gem-diol.
 */

import {
  createArrow,
  createAtom,
  createBond,
  createSpecies,
  createState,
  createStep,
  fromBond,
  fromLonePair,
  toBondBetween,
  toAtom,
  type MechanismStep,
} from "@blueberry/chem-core";
import type { LayoutHints } from "../render/layout/layout";

export interface TrainerSequence {
  readonly id: string;
  readonly title: string;
  readonly brief: string;
  readonly successLine: string;
  readonly steps: readonly {
    readonly step: MechanismStep;
    readonly stepBrief: string;
    readonly fromHints: LayoutHints;
    readonly toHints: LayoutHints;
  }[];
}

/* ---------------- step 2: the alkoxide takes a proton ---------------- */

const alkoxideIn = createSpecies({
  id: "sp-alkoxide-2",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-oh", a: "o1", b: "h1" }),
    createBond({ id: "b-oc", a: "o1", b: "c1" }),
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o2" }),
  ],
});

const hydronium = createSpecies({
  id: "sp-hydronium",
  atoms: [
    createAtom({ id: "o3", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "h4", element: "H" }),
    createAtom({ id: "h5", element: "H" }),
    createAtom({ id: "h6", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-oh4", a: "o3", b: "h4" }),
    createBond({ id: "b-oh5", a: "o3", b: "h5" }),
    createBond({ id: "b-oh6", a: "o3", b: "h6" }),
  ],
});

const gemDiol = createSpecies({
  id: "sp-gem-diol",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h4", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-oh", a: "o1", b: "h1" }),
    createBond({ id: "b-oc", a: "o1", b: "c1" }),
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o2" }),
    createBond({ id: "b-o2h4", a: "o2", b: "h4" }),
  ],
});

const water = createSpecies({
  id: "sp-water",
  atoms: [
    createAtom({ id: "o3", element: "O", lonePairs: 2 }),
    createAtom({ id: "h5", element: "H" }),
    createAtom({ id: "h6", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh5", a: "o3", b: "h5" }), createBond({ id: "b-oh6", a: "o3", b: "h6" })],
});

const ALKOXIDE_PROTONATION: MechanismStep = createStep({
  id: "alkoxide-protonation",
  from: createState({
    id: "akp-before",
    members: [
      { species: alkoxideIn, role: "nucleophile" },
      { species: hydronium, role: "substrate" },
    ],
  }),
  to: createState({
    id: "akp-after",
    members: [
      { species: gemDiol, role: "product" },
      { species: water, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "proton_transfer",
    route: "acid_base_proton_transfer",
    reactionCenters: ["h4"],
  },
  arrows: [
    createArrow({ id: "a-grab-h", source: fromLonePair("o2"), sink: toBondBetween("o2", "h4") }),
    createArrow({ id: "a-oh-release", source: fromBond("b-oh4"), sink: toAtom("o3") }),
  ],
});

const STEP2_FROM_HINTS: LayoutHints = {
  o1: { x: -2.3, y: 0.35 },
  h1: { x: -3.0, y: 0.95 },
  c1: { x: -1.35, y: -0.25 },
  h2: { x: -1.7, y: -1.2 },
  h3: { x: -0.6, y: -1.0 },
  o2: { x: -0.75, y: 0.55 },
  o3: { x: 1.15, y: 0.35 },
  h4: { x: 0.25, y: 0.55 },
  h5: { x: 1.85, y: 0.95 },
  h6: { x: 1.55, y: -0.45 },
};

const STEP2_TO_HINTS: LayoutHints = {
  o1: { x: -2.3, y: 0.35 },
  h1: { x: -3.0, y: 0.95 },
  c1: { x: -1.35, y: -0.25 },
  h2: { x: -1.7, y: -1.2 },
  h3: { x: -0.6, y: -1.0 },
  o2: { x: -0.75, y: 0.55 },
  h4: { x: -0.05, y: 1.15 },
  o3: { x: 1.75, y: 0.35 },
  h5: { x: 2.45, y: 0.95 },
  h6: { x: 2.15, y: -0.45 },
};

/* ================= SN1 solvolysis of tert-butyl bromide ================= */

const tButylBromide = createSpecies({
  id: "sp-tbubr",
  atoms: [
    createAtom({ id: "c0", element: "C" }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-01", a: "c0", b: "c1" }),
    createBond({ id: "b-02", a: "c0", b: "c2" }),
    createBond({ id: "b-03", a: "c0", b: "c3" }),
    createBond({ id: "b-0br", a: "c0", b: "br1" }),
  ],
});

const tButylCation = createSpecies({
  id: "sp-tbu-cation",
  atoms: [
    createAtom({ id: "c0", element: "C", formalCharge: 1 }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-01", a: "c0", b: "c1" }),
    createBond({ id: "b-02", a: "c0", b: "c2" }),
    createBond({ id: "b-03", a: "c0", b: "c3" }),
  ],
});

const bromideSn1 = createSpecies({
  id: "sp-bromide-sn1",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const IONISATION: MechanismStep = createStep({
  id: "sn1-ionisation",
  from: createState({ id: "sn1a-before", members: [{ species: tButylBromide, role: "substrate" }] }),
  to: createState({
    id: "sn1a-after",
    members: [
      { species: tButylCation, role: "intermediate" },
      { species: bromideSn1, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "bond_heterolysis", route: "sn1", reactionCenters: ["c0"] },
  arrows: [createArrow({ id: "a-ionise", source: fromBond("b-0br"), sink: toAtom("br1") })],
});

const waterNu = createSpecies({
  id: "sp-water-nu",
  atoms: [
    createAtom({ id: "ow", element: "O", lonePairs: 2 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ow1", a: "ow", b: "hw1" }), createBond({ id: "b-ow2", a: "ow", b: "hw2" })],
});

const protonatedAlcohol = createSpecies({
  id: "sp-tbu-oh2",
  atoms: [
    createAtom({ id: "c0", element: "C" }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-01", a: "c0", b: "c1" }),
    createBond({ id: "b-02", a: "c0", b: "c2" }),
    createBond({ id: "b-03", a: "c0", b: "c3" }),
    createBond({ id: "b-0o", a: "c0", b: "ow" }),
    createBond({ id: "b-ow1", a: "ow", b: "hw1" }),
    createBond({ id: "b-ow2", a: "ow", b: "hw2" }),
  ],
});

const CAPTURE: MechanismStep = createStep({
  id: "sn1-capture",
  from: createState({
    id: "sn1b-before",
    members: [
      { species: tButylCation, role: "intermediate" },
      { species: waterNu, role: "nucleophile" },
    ],
  }),
  to: createState({ id: "sn1b-after", members: [{ species: protonatedAlcohol, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "sn1", reactionCenters: ["c0"] },
  arrows: [createArrow({ id: "a-capture", source: fromLonePair("ow"), sink: toBondBetween("ow", "c0") })],
});

/* ================= Acyl substitution: add, then collapse ================= */

const acetylChloride = createSpecies({
  id: "sp-acetyl-chloride",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "cl1", element: "Cl", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-mc", a: "cm", b: "c2" }),
    createBond({ id: "b-co", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-ccl", a: "c2", b: "cl1" }),
  ],
});

const hydroxideAcyl = createSpecies({
  id: "sp-hydroxide-acyl",
  atoms: [
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o2", b: "h1" })],
});

const tetrahedral = createSpecies({
  id: "sp-tetrahedral",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cl1", element: "Cl", lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-mc", a: "cm", b: "c2" }),
    createBond({ id: "b-co", a: "c2", b: "o1" }),
    createBond({ id: "b-ccl", a: "c2", b: "cl1" }),
    createBond({ id: "b-co2", a: "c2", b: "o2" }),
    createBond({ id: "b-oh", a: "o2", b: "h1" }),
  ],
});

const ACYL_ADDITION: MechanismStep = createStep({
  id: "acyl-addition",
  from: createState({
    id: "acyl-a-before",
    members: [
      { species: hydroxideAcyl, role: "nucleophile" },
      { species: acetylChloride, role: "substrate" },
    ],
  }),
  to: createState({ id: "acyl-a-after", members: [{ species: tetrahedral, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["c2"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("o2"), sink: toBondBetween("o2", "c2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-co"), sink: toAtom("o1") }),
  ],
});

const aceticAcid = createSpecies({
  id: "sp-acetic-acid",
  atoms: [
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-mc", a: "cm", b: "c2" }),
    createBond({ id: "b-co", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-co2", a: "c2", b: "o2" }),
    createBond({ id: "b-oh", a: "o2", b: "h1" }),
  ],
});

const chlorideAcyl = createSpecies({
  id: "sp-chloride-acyl",
  atoms: [createAtom({ id: "cl1", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ACYL_COLLAPSE: MechanismStep = createStep({
  id: "acyl-collapse",
  from: createState({ id: "acyl-b-before", members: [{ species: tetrahedral, role: "intermediate" }] }),
  to: createState({
    id: "acyl-b-after",
    members: [
      { species: aceticAcid, role: "product" },
      { species: chlorideAcyl, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["c2"] },
  arrows: [
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-expel", source: fromBond("b-ccl"), sink: toAtom("cl1") }),
  ],
});

/* ================= The aldol: enolate, then the attack ================= */

const acetone = createSpecies({
  id: "sp-acetone",
  atoms: [
    // One alpha hydrogen explicit: it is the one the base takes.
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ha", element: "H" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-c1ha", a: "c1", b: "ha" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const hydroxideEnol = createSpecies({
  id: "sp-hydroxide-enol",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const enolate = createSpecies({
  id: "sp-enolate",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const waterEnol = createSpecies({
  id: "sp-water-enol",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha", a: "ob", b: "ha" })],
});

const ENOLATE_FORMATION: MechanismStep = createStep({
  id: "enolate-formation",
  from: createState({
    id: "enol-before",
    members: [
      { species: hydroxideEnol, role: "base" },
      { species: acetone, role: "substrate" },
    ],
  }),
  to: createState({
    id: "enol-after",
    members: [
      { species: enolate, role: "intermediate" },
      { species: waterEnol, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ha", "c1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "ha") }),
    createArrow({ id: "a-into-pi", source: fromBond("b-c1ha"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

const formaldehydeAldol = createSpecies({
  id: "sp-formaldehyde-aldol",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of", order: 2 }),
  ],
});

const aldolAlkoxide = createSpecies({
  id: "sp-aldol-alkoxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const ALDOL_ATTACK: MechanismStep = createStep({
  id: "aldol-attack",
  from: createState({
    id: "aldol-before",
    members: [
      { species: enolate, role: "nucleophile" },
      { species: formaldehydeAldol, role: "substrate" },
    ],
  }),
  to: createState({ id: "aldol-after", members: [{ species: aldolAlkoxide, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["c1", "cf"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "cf") }),
    createArrow({ id: "a-reform-co", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-pi-off", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ================= EAS nitration: attack, then rearomatize ================= */
/* One Kekule structure, written localised, the same convention the fixture
 * corpus uses for the benzenonium sigma complex (see the adjudication notes
 * in STATUS.md: the sp3 carbon reads as a stereocentre to RDKit only because
 * one resonance form is drawn; here nothing is chiral and the ring is plain). */

const benzene = createSpecies({
  id: "sp-benzene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
  ],
  bonds: [
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
  ],
});

const nitronium = createSpecies({
  id: "sp-nitronium",
  atoms: [
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [createBond({ id: "b-no1", a: "n1", b: "o1", order: 2 }), createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 })],
});

const arenium = createSpecies({
  id: "sp-arenium",
  atoms: [
    // c1 is sp3 now, its ring hydrogen EXPLICIT because step 2 takes it.
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "hx", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b1h", a: "c1", b: "hx" }),
    createBond({ id: "b12", a: "c1", b: "c2" }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c1", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "o1" }),
    createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 }),
  ],
});

const EAS_ATTACK: MechanismStep = createStep({
  id: "eas-attack",
  from: createState({
    id: "eas-a-before",
    members: [
      { species: benzene, role: "nucleophile" },
      { species: nitronium, role: "electrophile" },
    ],
  }),
  to: createState({ id: "eas-a-after", members: [{ species: arenium, role: "intermediate" }] }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_aromatic_substitution", reactionCenters: ["c1", "n1"] },
  arrows: [
    createArrow({ id: "a-ring-attacks", source: fromBond("b12"), sink: toBondBetween("c1", "n1") }),
    createArrow({ id: "a-no-relief", source: fromBond("b-no1"), sink: toAtom("o1") }),
  ],
});

/* Step 2: water takes the sp3 hydrogen and the ring rearomatizes. The arenium
 * here is the SAME structure, restated as its own from-state. */

const areniumIn = createSpecies({
  id: "sp-arenium-2",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "hx", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b1h", a: "c1", b: "hx" }),
    createBond({ id: "b12", a: "c1", b: "c2" }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c1", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "o1" }),
    createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 }),
  ],
});

const waterEas = createSpecies({
  id: "sp-water-eas",
  atoms: [
    createAtom({ id: "ow", element: "O", lonePairs: 2 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ow1", a: "ow", b: "hw1" }), createBond({ id: "b-ow2", a: "ow", b: "hw2" })],
});

const nitrobenzene = createSpecies({
  id: "sp-nitrobenzene",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c1", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "o1" }),
    createBond({ id: "b-no2", a: "n1", b: "o2", order: 2 }),
  ],
});

const hydroniumEas = createSpecies({
  id: "sp-hydronium-eas",
  atoms: [
    createAtom({ id: "ow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
    createAtom({ id: "hx", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-ow1", a: "ow", b: "hw1" }),
    createBond({ id: "b-ow2", a: "ow", b: "hw2" }),
    createBond({ id: "b-owx", a: "ow", b: "hx" }),
  ],
});

const EAS_REAROMATIZE: MechanismStep = createStep({
  id: "eas-rearomatize",
  from: createState({
    id: "eas-b-before",
    members: [
      { species: areniumIn, role: "intermediate" },
      { species: waterEas, role: "base" },
    ],
  }),
  to: createState({
    id: "eas-b-after",
    members: [
      { species: nitrobenzene, role: "product" },
      { species: hydroniumEas, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "electrophilic_aromatic_substitution", reactionCenters: ["hx", "c1"] },
  arrows: [
    createArrow({ id: "a-take-h", source: fromLonePair("ow"), sink: toBondBetween("ow", "hx") }),
    createArrow({ id: "a-rearomatize", source: fromBond("b1h"), sink: toBondBetween("c1", "c2") }),
  ],
});

/* ================= Wittig: betaine, then the collapse ================= */
/* Trimethylphosphonium ylide on screen where the flask holds triphenyl:
 * three CH3 groups keep the canvas readable and the electron accounting is
 * identical. The brief says so out loud. */

const ylide = createSpecies({
  id: "sp-ylide",
  atoms: [
    createAtom({ id: "cy", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 2 }),
    createAtom({ id: "p1", element: "P", formalCharge: 1 }),
    createAtom({ id: "m1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cp", a: "cy", b: "p1" }),
    createBond({ id: "b-pm1", a: "p1", b: "m1" }),
    createBond({ id: "b-pm2", a: "p1", b: "m2" }),
    createBond({ id: "b-pm3", a: "p1", b: "m3" }),
  ],
});

const formaldehydeW = createSpecies({
  id: "sp-formaldehyde-w",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of", order: 2 }),
  ],
});

const betaine = createSpecies({
  id: "sp-betaine",
  atoms: [
    createAtom({ id: "cy", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "p1", element: "P", formalCharge: 1 }),
    createAtom({ id: "m1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cp", a: "cy", b: "p1" }),
    createBond({ id: "b-pm1", a: "p1", b: "m1" }),
    createBond({ id: "b-pm2", a: "p1", b: "m2" }),
    createBond({ id: "b-pm3", a: "p1", b: "m3" }),
    createBond({ id: "b-yf", a: "cy", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const WITTIG_ATTACK: MechanismStep = createStep({
  id: "wittig-attack",
  from: createState({
    id: "wit-a-before",
    members: [
      { species: ylide, role: "nucleophile" },
      { species: formaldehydeW, role: "substrate" },
    ],
  }),
  to: createState({ id: "wit-a-after", members: [{ species: betaine, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cy", "cf"] },
  arrows: [
    createArrow({ id: "a-ylide", source: fromLonePair("cy"), sink: toBondBetween("cy", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

const ethene = createSpecies({
  id: "sp-ethene-wittig",
  atoms: [
    createAtom({ id: "cy", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-yf", a: "cy", b: "cf", order: 2 }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
  ],
});

const phosphineOxide = createSpecies({
  id: "sp-phosphine-oxide",
  atoms: [
    createAtom({ id: "p1", element: "P", formalCharge: 1 }),
    createAtom({ id: "m1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "m3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-pm1", a: "p1", b: "m1" }),
    createBond({ id: "b-pm2", a: "p1", b: "m2" }),
    createBond({ id: "b-pm3", a: "p1", b: "m3" }),
    createBond({ id: "b-po", a: "p1", b: "of" }),
  ],
});

const WITTIG_COLLAPSE: MechanismStep = createStep({
  id: "wittig-collapse",
  from: createState({ id: "wit-b-before", members: [{ species: betaine, role: "intermediate" }] }),
  to: createState({
    id: "wit-b-after",
    members: [
      { species: ethene, role: "product" },
      { species: phosphineOxide, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "ring_opening", route: "pericyclic", reactionCenters: ["cy", "p1"] },
  arrows: [
    createArrow({ id: "a-o-to-p", source: fromLonePair("of"), sink: toBondBetween("of", "p1") }),
    createArrow({ id: "a-cp-to-pi", source: fromBond("b-cp"), sink: toBondBetween("cy", "cf") }),
  ],
});

/* ================= HBr + butadiene: protonate, then 1,4 capture ================= */

const butadiene = createSpecies({
  id: "sp-butadiene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-34", a: "c3", b: "c4", order: 2 }),
  ],
});

const hbr = createSpecies({
  id: "sp-hbr-diene",
  atoms: [createAtom({ id: "hd", element: "H" }), createAtom({ id: "brd", element: "Br", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hbr", a: "hd", b: "brd" })],
});

const allylCation = createSpecies({
  id: "sp-allyl-from-diene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hd", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-1h", a: "c1", b: "hd" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-34", a: "c3", b: "c4", order: 2 }),
  ],
});

const bromideDiene = createSpecies({
  id: "sp-bromide-diene",
  atoms: [createAtom({ id: "brd", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const DIENE_PROTONATION: MechanismStep = createStep({
  id: "diene-protonation",
  from: createState({
    id: "dp-before",
    members: [
      { species: butadiene, role: "nucleophile" },
      { species: hbr, role: "substrate" },
    ],
  }),
  to: createState({
    id: "dp-after",
    members: [
      { species: allylCation, role: "intermediate" },
      { species: bromideDiene, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "pi_bond_attack", route: "electrophilic_addition_alkene", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-pi-grab", source: fromBond("b-12"), sink: toBondBetween("c1", "hd") }),
    createArrow({ id: "a-release", source: fromBond("b-hbr"), sink: toAtom("brd") }),
  ],
});

const bromide14 = createSpecies({
  id: "sp-bromide-14",
  atoms: [createAtom({ id: "brd", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const allylCation2 = createSpecies({
  id: "sp-allyl-from-diene-2",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hd", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-1h", a: "c1", b: "hd" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-34", a: "c3", b: "c4", order: 2 }),
  ],
});

const product14 = createSpecies({
  id: "sp-14-product",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hd", element: "H" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "brd", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-1h", a: "c1", b: "hd" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3", order: 2 }),
    createBond({ id: "b-34", a: "c3", b: "c4" }),
    createBond({ id: "b-4br", a: "c4", b: "brd" }),
  ],
});

const DIENE_CAPTURE_14: MechanismStep = createStep({
  id: "diene-capture-14",
  from: createState({
    id: "dc-before",
    members: [
      { species: allylCation2, role: "intermediate" },
      { species: bromide14, role: "nucleophile" },
    ],
  }),
  to: createState({ id: "dc-after", members: [{ species: product14, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "electrophilic_addition_alkene", reactionCenters: ["c4"] },
  arrows: [
    createArrow({ id: "a-capture", source: fromLonePair("brd"), sink: toBondBetween("brd", "c4") }),
    createArrow({ id: "a-allyl-shift", source: fromBond("b-34"), sink: toBondBetween("c2", "c3") }),
  ],
});

/* ================= SNAr: the Meisenheimer, then the expulsion ================= */
/* 1-fluoro-4-nitrobenzene + methoxide. The charge relay INTO the para nitro
 * group is the whole exam question, so both steps carry it explicitly:
 * four arrows in, four arrows out. One localised Kekule form throughout. */

const fluoronitrobenzene = createSpecies({
  id: "sp-fnb",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "f1", element: "F", lonePairs: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C" }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "on2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-cf", a: "c1", b: "f1" }),
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c4", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "on1" }),
    createBond({ id: "b-no2", a: "n1", b: "on2", order: 2 }),
  ],
});

const methoxideSnar = createSpecies({
  id: "sp-methoxide-snar",
  atoms: [
    createAtom({ id: "om", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-om", a: "om", b: "cm" })],
});

const meisenheimer = createSpecies({
  id: "sp-meisenheimer",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "f1", element: "F", lonePairs: 3 }),
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C" }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "on2", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cf", a: "c1", b: "f1" }),
    createBond({ id: "b-com", a: "c1", b: "om" }),
    createBond({ id: "b-om", a: "om", b: "cm" }),
    createBond({ id: "b12", a: "c1", b: "c2" }),
    createBond({ id: "b23", a: "c2", b: "c3", order: 2 }),
    createBond({ id: "b34", a: "c3", b: "c4" }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c4", b: "n1", order: 2 }),
    createBond({ id: "b-no1", a: "n1", b: "on1" }),
    createBond({ id: "b-no2", a: "n1", b: "on2" }),
  ],
});

const SNAR_ADDITION: MechanismStep = createStep({
  id: "snar-addition",
  from: createState({
    id: "snar-a-before",
    members: [
      { species: methoxideSnar, role: "nucleophile" },
      { species: fluoronitrobenzene, role: "substrate" },
    ],
  }),
  to: createState({ id: "snar-a-after", members: [{ species: meisenheimer, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_aromatic_substitution", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("om"), sink: toBondBetween("om", "c1") }),
    createArrow({ id: "a-relay-1", source: fromBond("b12"), sink: toBondBetween("c2", "c3") }),
    createArrow({ id: "a-relay-2", source: fromBond("b34"), sink: toBondBetween("c4", "n1") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-no2"), sink: toAtom("on2") }),
  ],
});

const nitroanisole = createSpecies({
  id: "sp-nitroanisole",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cm", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c4", element: "C" }),
    createAtom({ id: "c5", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c6", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "n1", element: "N", formalCharge: 1 }),
    createAtom({ id: "on1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "on2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-com", a: "c1", b: "om" }),
    createBond({ id: "b-om", a: "om", b: "cm" }),
    createBond({ id: "b12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b23", a: "c2", b: "c3" }),
    createBond({ id: "b34", a: "c3", b: "c4", order: 2 }),
    createBond({ id: "b45", a: "c4", b: "c5" }),
    createBond({ id: "b56", a: "c5", b: "c6", order: 2 }),
    createBond({ id: "b61", a: "c6", b: "c1" }),
    createBond({ id: "b-cn", a: "c4", b: "n1" }),
    createBond({ id: "b-no1", a: "n1", b: "on1" }),
    createBond({ id: "b-no2", a: "n1", b: "on2", order: 2 }),
  ],
});

const fluoride = createSpecies({
  id: "sp-fluoride",
  atoms: [createAtom({ id: "f1", element: "F", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const SNAR_EXPULSION: MechanismStep = createStep({
  id: "snar-expulsion",
  from: createState({ id: "snar-b-before", members: [{ species: meisenheimer, role: "intermediate" }] }),
  to: createState({
    id: "snar-b-after",
    members: [
      { species: nitroanisole, role: "product" },
      { species: fluoride, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_aromatic_substitution", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-o-back", source: fromLonePair("on2"), sink: toBondBetween("n1", "on2") }),
    createArrow({ id: "a-relay-back-1", source: fromBond("b-cn"), sink: toBondBetween("c3", "c4") }),
    createArrow({ id: "a-relay-back-2", source: fromBond("b23"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-expel", source: fromBond("b-cf"), sink: toAtom("f1") }),
  ],
});

/* ================= Claisen: attack, then the alkoxide expels methoxide ================= */

const esterEnolate = createSpecies({
  id: "sp-ester-enolate",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "oe1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-2oe", a: "c2", b: "oe1" }),
    createBond({ id: "b-oece", a: "oe1", b: "ce1" }),
  ],
});

const methylAcetate = createSpecies({
  id: "sp-methyl-acetate",
  atoms: [
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ck", element: "C" }),
    createAtom({ id: "ok", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-mck", a: "cm2", b: "ck" }),
    createBond({ id: "b-cko", a: "ck", b: "ok", order: 2 }),
    createBond({ id: "b-ckoe", a: "ck", b: "oe2" }),
    createBond({ id: "b-oece2", a: "oe2", b: "ce2" }),
  ],
});

const claisenTetrahedral = createSpecies({
  id: "sp-claisen-tet",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ck", element: "C" }),
    createAtom({ id: "ok", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "oe2", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-2oe", a: "c2", b: "oe1" }),
    createBond({ id: "b-oece", a: "oe1", b: "ce1" }),
    createBond({ id: "b-1ck", a: "c1", b: "ck" }),
    createBond({ id: "b-mck", a: "cm2", b: "ck" }),
    createBond({ id: "b-cko", a: "ck", b: "ok" }),
    createBond({ id: "b-ckoe", a: "ck", b: "oe2" }),
    createBond({ id: "b-oece2", a: "oe2", b: "ce2" }),
  ],
});

const CLAISEN_ATTACK: MechanismStep = createStep({
  id: "claisen-attack",
  from: createState({
    id: "cl-a-before",
    members: [
      { species: esterEnolate, role: "nucleophile" },
      { species: methylAcetate, role: "substrate" },
    ],
  }),
  to: createState({ id: "cl-a-after", members: [{ species: claisenTetrahedral, role: "intermediate" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_acyl_substitution", reactionCenters: ["c1", "ck"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "ck") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cko"), sink: toAtom("ok") }),
  ],
});

const ketoester = createSpecies({
  id: "sp-ketoester",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "oe1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ce1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cm2", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "ck", element: "C" }),
    createAtom({ id: "ok", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-2oe", a: "c2", b: "oe1" }),
    createBond({ id: "b-oece", a: "oe1", b: "ce1" }),
    createBond({ id: "b-1ck", a: "c1", b: "ck" }),
    createBond({ id: "b-mck", a: "cm2", b: "ck" }),
    createBond({ id: "b-cko", a: "ck", b: "ok", order: 2 }),
  ],
});

const methoxideOut2 = createSpecies({
  id: "sp-methoxide-out2",
  atoms: [
    createAtom({ id: "oe2", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "ce2", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-oece2", a: "oe2", b: "ce2" })],
});

const CLAISEN_COLLAPSE: MechanismStep = createStep({
  id: "claisen-collapse",
  from: createState({ id: "cl-b-before", members: [{ species: claisenTetrahedral, role: "intermediate" }] }),
  to: createState({
    id: "cl-b-after",
    members: [
      { species: ketoester, role: "product" },
      { species: methoxideOut2, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "nucleophilic_acyl_substitution", reactionCenters: ["ck"] },
  arrows: [
    createArrow({ id: "a-reform-pi", source: fromLonePair("ok"), sink: toBondBetween("ck", "ok") }),
    createArrow({ id: "a-expel", source: fromBond("b-ckoe"), sink: toAtom("oe2") }),
  ],
});

/* ================= Keto-enol tautomerism, base-catalyzed ================= */
/* Unit 9a's opening spine node. Both directions are real chemistry; this
 * sequence runs ketone -> enol so the enolate in the middle is the same
 * intermediate every later 9-node leans on. */

const acetoneTau = createSpecies({
  id: "sp-acetone-tau",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ha", element: "H" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-c1ha", a: "c1", b: "ha" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const hydroxideTau = createSpecies({
  id: "sp-hydroxide-tau",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const enolateTau = createSpecies({
  id: "sp-enolate-tau",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const waterTau = createSpecies({
  id: "sp-water-tau",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha", a: "ob", b: "ha" })],
});

const TAU_DEPROTONATE: MechanismStep = createStep({
  id: "tau-deprotonate",
  from: createState({
    id: "tau-a-before",
    members: [
      { species: hydroxideTau, role: "base" },
      { species: acetoneTau, role: "substrate" },
    ],
  }),
  to: createState({
    id: "tau-a-after",
    members: [
      { species: enolateTau, role: "intermediate" },
      { species: waterTau, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ha", "c1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "ha") }),
    createArrow({ id: "a-into-pi", source: fromBond("b-c1ha"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

/* The enolate reprotonates ON OXYGEN this time: that is the whole point of
 * an ambident nucleophile, and the product is the enol. */

const enolateTau2 = createSpecies({
  id: "sp-enolate-tau2",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const waterTau2 = createSpecies({
  id: "sp-water-tau2",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha", a: "ob", b: "ha" })],
});

const enol = createSpecies({
  id: "sp-enol",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "ha", element: "H" }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-oha", a: "o1", b: "ha" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const hydroxideTau2 = createSpecies({
  id: "sp-hydroxide-tau2",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const TAU_O_PROTONATE: MechanismStep = createStep({
  id: "tau-o-protonate",
  from: createState({
    id: "tau-b-before",
    members: [
      { species: enolateTau2, role: "intermediate" },
      { species: waterTau2, role: "substrate" },
    ],
  }),
  to: createState({
    id: "tau-b-after",
    members: [
      { species: enol, role: "product" },
      { species: hydroxideTau2, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["o1", "ha"] },
  arrows: [
    createArrow({ id: "a-o-grabs", source: fromLonePair("o1"), sink: toBondBetween("o1", "ha") }),
    createArrow({ id: "a-oh-release", source: fromBond("b-obha"), sink: toAtom("ob") }),
  ],
});

/* ================= Aldol condensation: the E1cb dehydration ================= */
/* Finishing the aldol story: the beta-hydroxy carbonyl loses water through
 * its enolate. Conjugation is the driving force and the copy says so. */

const aldolProduct = createSpecies({
  id: "sp-aldol-product",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "ha2", element: "H" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-c1ha2", a: "c1", b: "ha2" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-foh", a: "cf", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh" }),
  ],
});

const hydroxideCond = createSpecies({
  id: "sp-hydroxide-cond",
  atoms: [
    createAtom({ id: "ob", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" })],
});

const aldolEnolate = createSpecies({
  id: "sp-aldol-enolate",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-foh", a: "cf", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh" }),
  ],
});

const waterCond = createSpecies({
  id: "sp-water-cond",
  atoms: [
    createAtom({ id: "ob", element: "O", lonePairs: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "ha2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-obhb", a: "ob", b: "hb" }), createBond({ id: "b-obha2", a: "ob", b: "ha2" })],
});

const COND_DEPROTONATE: MechanismStep = createStep({
  id: "cond-deprotonate",
  from: createState({
    id: "cond-a-before",
    members: [
      { species: hydroxideCond, role: "base" },
      { species: aldolProduct, role: "substrate" },
    ],
  }),
  to: createState({
    id: "cond-a-after",
    members: [
      { species: aldolEnolate, role: "intermediate" },
      { species: waterCond, role: "byproduct" },
    ],
  }),
  identity: { elementaryStep: "proton_transfer", route: "acid_base_proton_transfer", reactionCenters: ["ha2", "c1"] },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("ob"), sink: toBondBetween("ob", "ha2") }),
    createArrow({ id: "a-into-pi", source: fromBond("b-c1ha2"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-onto-o", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

const aldolEnolate2 = createSpecies({
  id: "sp-aldol-enolate2",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "oh1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2", order: 2 }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf" }),
    createBond({ id: "b-foh", a: "cf", b: "oh1" }),
    createBond({ id: "b-ohh", a: "oh1", b: "hh" }),
  ],
});

const enone = createSpecies({
  id: "sp-enone",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1f", a: "c1", b: "cf", order: 2 }),
  ],
});

const hydroxideOut2 = createSpecies({
  id: "sp-hydroxide-out2",
  atoms: [
    createAtom({ id: "oh1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "hh", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ohh", a: "oh1", b: "hh" })],
});

const COND_EXPEL: MechanismStep = createStep({
  id: "cond-expel",
  from: createState({ id: "cond-b-before", members: [{ species: aldolEnolate2, role: "intermediate" }] }),
  to: createState({
    id: "cond-b-after",
    members: [
      { species: enone, role: "product" },
      { species: hydroxideOut2, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "leaving_group_departure", route: "e1cb", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-pi-swing", source: fromBond("b-12"), sink: toBondBetween("c1", "cf") }),
    createArrow({ id: "a-reform-co", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-oh-leaves", source: fromBond("b-foh"), sink: toAtom("oh1") }),
  ],
});

import { TRAINER_REACTIONS } from "./reactions";

const carbonyl = TRAINER_REACTIONS.find((entry) => entry.id === "carbonyl-addition");
if (carbonyl === undefined) throw new Error("sequences need the registry's carbonyl-addition step");

export const TRAINER_SEQUENCES: readonly TrainerSequence[] = [
  {
    id: "seq-hydration",
    title: "Hydration of formaldehyde · 2 steps",
    brief: "Two steps to the gem-diol: attack, then protonate. No arrows drawn — you move the electrons themselves.",
    successLine: "The whole path: hydroxide built the tetrahedral alkoxide, and the alkoxide took a proton from hydronium. That is base-catalysed hydration, start to finish.",
    steps: [
      {
        // The registry's own step, by reference: one authored truth for the
        // carbonyl attack, never a fork of it.
        step: carbonyl.step,
        stepBrief: "Step 1 · Hydroxide attacks the carbonyl carbon.",
        fromHints: carbonyl.fromHints,
        toHints: carbonyl.toHints,
      },
      {
        step: ALKOXIDE_PROTONATION,
        stepBrief: "Step 2 · The alkoxide takes a proton from hydronium.",
        fromHints: STEP2_FROM_HINTS,
        toHints: STEP2_TO_HINTS,
      },
    ],
  },
  {
    id: "seq-tautomer",
    title: "Keto–enol tautomerism · 2 steps",
    brief: "Base takes the α-proton, then the enolate protonates on OXYGEN: same atoms, new tautomer.",
    successLine: "Tautomerism whole: deprotonate at carbon, reprotonate at oxygen. The enolate in the middle is an ambident nucleophile, and which end takes the proton decides which tautomer you get — the equilibrium favours the ketone, but the enol is how half of Unit 9 happens.",
    steps: [
      {
        step: TAU_DEPROTONATE,
        stepBrief: "Step 1 · The base takes the α-hydrogen; three arrows to the enolate.",
        fromHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          c1: { x: -0.95, y: 0.35 },
          ha: { x: -1.7, y: 0.95 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
        toHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          ha: { x: -2.05, y: 1.6 },
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
      },
      {
        step: TAU_O_PROTONATE,
        stepBrief: "Step 2 · The enolate's OXYGEN takes a proton from water: the enol.",
        fromHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          ob: { x: 2.35, y: 1.35 },
          hb: { x: 3.1, y: 1.9 },
          ha: { x: 1.45, y: 1.1 },
        },
        toHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          ha: { x: 1.15, y: 1.4 },
          c3: { x: 0.6, y: -1.2 },
          ob: { x: 2.75, y: 1.35 },
          hb: { x: 3.5, y: 1.9 },
        },
      },
    ],
  },
  {
    id: "seq-condensation",
    title: "Aldol condensation · 2 steps",
    brief: "The aldol product loses water the E1cb way: enolate first, then the hydroxide is pushed out.",
    successLine: "The condensation whole: deprotonate alpha to the carbonyl, then the enolate's π swings over and expels hydroxide — the enone is conjugated, and that conjugation is the thermodynamic paycheck that drives the dehydration.",
    steps: [
      {
        step: COND_DEPROTONATE,
        stepBrief: "Step 1 · Base takes the α-H between the carbonyl and the alcohol arm.",
        fromHints: {
          ob: { x: -2.75, y: 1.15 },
          hb: { x: -3.5, y: 1.7 },
          c1: { x: -0.95, y: 0.35 },
          ha2: { x: -1.7, y: 1.0 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -2.9, y: -0.15 },
          hh: { x: -3.55, y: 0.5 },
        },
        toHints: {
          ob: { x: -2.75, y: 1.55 },
          hb: { x: -3.5, y: 2.1 },
          ha2: { x: -2.15, y: 2.1 },
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -2.9, y: -0.15 },
          hh: { x: -3.55, y: 0.5 },
        },
      },
      {
        step: COND_EXPEL,
        stepBrief: "Step 2 · The enolate's π swings onto the C–C bond and hydroxide leaves. E1cb.",
        fromHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -2.9, y: -0.15 },
          hh: { x: -3.55, y: 0.5 },
        },
        toHints: {
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
          cf: { x: -1.85, y: -0.45 },
          oh1: { x: -3.3, y: -0.35 },
          hh: { x: -3.95, y: 0.3 },
        },
      },
    ],
  },
  {
    id: "seq-snar",
    title: "SNAr · 2 steps",
    brief: "Aromatic reactivity inverts: the ring takes a nucleophile, and the nitro group holds the charge while it happens.",
    successLine: "SNAr whole: addition into the Meisenheimer complex, the negative charge parked on the nitro oxygen, then the relay runs backwards and fluoride leaves — the reversed leaving-group order makes sense the moment you see that addition, not C–F cleavage, is the hard step.",
    steps: [
      {
        step: SNAR_ADDITION,
        stepBrief: "Step 1 · Methoxide adds; the charge relays through the ring onto the nitro oxygen. Four arrows.",
        fromHints: {
          om: { x: -2.2, y: 1.55 },
          cm: { x: -3.15, y: 1.95 },
          c1: { x: 0.0, y: 1.0 },
          f1: { x: -1.0, y: 1.55 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
        },
        toHints: {
          om: { x: -0.9, y: 1.75 },
          cm: { x: -1.85, y: 2.15 },
          c1: { x: 0.0, y: 1.0 },
          f1: { x: -1.0, y: 0.55 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
        },
      },
      {
        step: SNAR_EXPULSION,
        stepBrief: "Step 2 · The relay runs backwards and fluoride is pushed out. Four arrows again.",
        fromHints: {
          om: { x: -0.9, y: 1.75 },
          cm: { x: -1.85, y: 2.15 },
          c1: { x: 0.0, y: 1.0 },
          f1: { x: -1.0, y: 0.55 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
        },
        toHints: {
          om: { x: -0.9, y: 1.55 },
          cm: { x: -1.85, y: 1.95 },
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 1.5 },
          c3: { x: 1.74, y: 1.0 },
          c4: { x: 1.74, y: 0.0 },
          c5: { x: 0.87, y: -0.5 },
          c6: { x: 0.0, y: 0.0 },
          n1: { x: 2.6, y: -0.5 },
          on1: { x: 3.5, y: 0.0 },
          on2: { x: 2.6, y: -1.5 },
          f1: { x: -1.6, y: -0.2 },
        },
      },
    ],
  },
  {
    id: "seq-claisen",
    title: "Claisen condensation · 2 steps",
    brief: "The ester enolate attacks another ester; the tetrahedral intermediate throws methoxide out.",
    successLine: "The Claisen whole: enolate carbon onto the ester carbonyl, then the alkoxide reforms the π and expels methoxide — a β-ketoester, and the doubly-activated proton it carries is what pulls the whole equilibrium over.",
    steps: [
      {
        step: CLAISEN_ATTACK,
        stepBrief: "Step 1 · The enolate carbon attacks the other ester's carbonyl. Three arrows.",
        fromHints: {
          c1: { x: -1.3, y: 0.2 },
          c2: { x: -2.25, y: -0.3 },
          o1: { x: -2.35, y: 0.8 },
          oe1: { x: -3.2, y: -0.9 },
          ce1: { x: -4.15, y: -0.5 },
          cm2: { x: 1.9, y: 1.0 },
          ck: { x: 0.95, y: 0.45 },
          ok: { x: 1.05, y: -0.65 },
          oe2: { x: 0.0, y: 1.05 },
          ce2: { x: -0.2, y: 2.1 },
        },
        toHints: {
          c1: { x: -1.1, y: 0.2 },
          c2: { x: -2.05, y: -0.3 },
          o1: { x: -2.15, y: 0.8 },
          oe1: { x: -3.0, y: -0.9 },
          ce1: { x: -3.95, y: -0.5 },
          ck: { x: 0.35, y: 0.4 },
          cm2: { x: 1.3, y: 0.95 },
          ok: { x: 0.45, y: -0.7 },
          oe2: { x: -0.6, y: 1.0 },
          ce2: { x: -0.8, y: 2.05 },
        },
      },
      {
        step: CLAISEN_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide reforms the carbonyl and methoxide leaves.",
        fromHints: {
          c1: { x: -1.1, y: 0.2 },
          c2: { x: -2.05, y: -0.3 },
          o1: { x: -2.15, y: 0.8 },
          oe1: { x: -3.0, y: -0.9 },
          ce1: { x: -3.95, y: -0.5 },
          ck: { x: 0.35, y: 0.4 },
          cm2: { x: 1.3, y: 0.95 },
          ok: { x: 0.45, y: -0.7 },
          oe2: { x: -0.6, y: 1.0 },
          ce2: { x: -0.8, y: 2.05 },
        },
        toHints: {
          c1: { x: -1.1, y: 0.2 },
          c2: { x: -2.05, y: -0.3 },
          o1: { x: -2.15, y: 0.8 },
          oe1: { x: -3.0, y: -0.9 },
          ce1: { x: -3.95, y: -0.5 },
          ck: { x: 0.35, y: 0.4 },
          cm2: { x: 1.3, y: 0.95 },
          ok: { x: 0.45, y: -0.7 },
          oe2: { x: -0.05, y: 1.75 },
          ce2: { x: -0.25, y: 2.8 },
        },
      },
    ],
  },
  {
    id: "seq-wittig",
    title: "Wittig olefination · 2 steps",
    brief: "The ylide attacks, then the betaine collapses to the alkene. Trimethyl on screen where the flask holds triphenyl; the electrons do not care.",
    successLine: "The Wittig whole: carbanion onto the carbonyl, then the alkoxide grabs phosphorus and the C–P bond becomes the new π. The alkene lands exactly where the carbonyl was, which is the whole point of the reaction.",
    steps: [
      {
        step: WITTIG_ATTACK,
        stepBrief: "Step 1 · The ylide's carbanion attacks the carbonyl.",
        fromHints: {
          cy: { x: -1.15, y: 0.15 },
          p1: { x: -2.25, y: -0.25 },
          m1: { x: -3.2, y: 0.35 },
          m2: { x: -2.6, y: -1.35 },
          m3: { x: -1.75, y: -1.05 },
          cf: { x: 0.35, y: -0.2 },
          hf1: { x: 0.1, y: -1.25 },
          hf2: { x: 1.35, y: -0.45 },
          of: { x: 0.85, y: 0.7 },
        },
        toHints: {
          cy: { x: -0.85, y: 0.1 },
          p1: { x: -1.95, y: -0.3 },
          m1: { x: -2.9, y: 0.3 },
          m2: { x: -2.3, y: -1.4 },
          m3: { x: -1.45, y: -1.1 },
          cf: { x: 0.35, y: -0.2 },
          hf1: { x: 0.1, y: -1.25 },
          hf2: { x: 1.35, y: -0.45 },
          of: { x: 0.85, y: 0.7 },
        },
      },
      {
        step: WITTIG_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide takes phosphorus; the C–P electrons become the alkene.",
        fromHints: {
          cy: { x: -0.85, y: 0.1 },
          p1: { x: -1.95, y: -0.3 },
          m1: { x: -2.9, y: 0.3 },
          m2: { x: -2.3, y: -1.4 },
          m3: { x: -1.45, y: -1.1 },
          cf: { x: 0.35, y: -0.2 },
          hf1: { x: 0.1, y: -1.25 },
          hf2: { x: 1.35, y: -0.45 },
          of: { x: 0.85, y: 0.7 },
        },
        toHints: {
          cy: { x: 0.0, y: 0.35 },
          cf: { x: 1.05, y: 0.0 },
          hf1: { x: 0.8, y: -1.05 },
          hf2: { x: 2.05, y: -0.25 },
          p1: { x: -2.15, y: -0.3 },
          m1: { x: -3.1, y: 0.3 },
          m2: { x: -2.5, y: -1.4 },
          m3: { x: -1.65, y: -1.1 },
          of: { x: -1.35, y: 0.55 },
        },
      },
    ],
  },
  {
    id: "seq-diene",
    title: "HBr + butadiene, 1,4 · 2 steps",
    brief: "Protonate the diene, then the bromide arrives at the FAR end through the allyl system.",
    successLine: "1,4-addition whole: the proton makes the allyl cation, and bromide captures the far end as the π slides over — the thermodynamic product, and Unit 1's whole argument about control.",
    steps: [
      {
        step: DIENE_PROTONATION,
        stepBrief: "Step 1 · The terminal π grabs the proton; the allyl cation is born.",
        fromHints: {
          c1: { x: -1.9, y: 0.35 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          hd: { x: -1.75, y: 1.6 },
          brd: { x: -0.75, y: 2.1 },
        },
        toHints: {
          c1: { x: -1.9, y: 0.35 },
          hd: { x: -2.5, y: 1.15 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          brd: { x: 0.1, y: 2.3 },
        },
      },
      {
        step: DIENE_CAPTURE_14,
        stepBrief: "Step 2 · Bromide takes C4 as the allyl π slides to the middle.",
        fromHints: {
          c1: { x: -1.9, y: 0.35 },
          hd: { x: -2.5, y: 1.15 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          brd: { x: 2.15, y: 0.5 },
        },
        toHints: {
          c1: { x: -1.9, y: 0.35 },
          hd: { x: -2.5, y: 1.15 },
          c2: { x: -0.95, y: -0.15 },
          c3: { x: 0.0, y: 0.35 },
          c4: { x: 0.95, y: -0.15 },
          brd: { x: 1.75, y: 0.5 },
        },
      },
    ],
  },
  {
    id: "seq-eas",
    title: "EAS nitration · 2 steps",
    brief: "The ring attacks, then gives the proton back: substitution that keeps aromaticity.",
    successLine: "Electrophilic aromatic substitution whole: the π attacks the nitronium, the arenium holds its breath, and losing the sp³ proton buys aromaticity back. Attack, then rearomatize — the same two beats under every reaction in this unit.",
    steps: [
      {
        step: EAS_ATTACK,
        stepBrief: "Step 1 · A ring π bond attacks the nitronium; one N=O relieves onto oxygen.",
        fromHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          n1: { x: 0.6, y: 2.15 },
          o1: { x: -0.35, y: 2.6 },
          o2: { x: 1.55, y: 2.6 },
        },
        toHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          hx: { x: -0.7, y: 1.7 },
          n1: { x: 0.6, y: 2.0 },
          o1: { x: -0.3, y: 2.5 },
          o2: { x: 1.55, y: 2.45 },
        },
      },
      {
        step: EAS_REAROMATIZE,
        stepBrief: "Step 2 · Water takes the sp³ hydrogen and the ring rearomatizes.",
        fromHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          hx: { x: -0.7, y: 1.7 },
          n1: { x: 0.6, y: 2.0 },
          o1: { x: -0.3, y: 2.5 },
          o2: { x: 1.55, y: 2.45 },
          ow: { x: -2.1, y: 1.9 },
          hw1: { x: -2.85, y: 2.45 },
          hw2: { x: -2.6, y: 1.1 },
        },
        toHints: {
          c1: { x: 0.0, y: 1.0 },
          c2: { x: 0.87, y: 0.5 },
          c3: { x: 0.87, y: -0.5 },
          c4: { x: 0.0, y: -1.0 },
          c5: { x: -0.87, y: -0.5 },
          c6: { x: -0.87, y: 0.5 },
          n1: { x: 0.6, y: 2.15 },
          o1: { x: -0.35, y: 2.6 },
          o2: { x: 1.55, y: 2.6 },
          ow: { x: -2.4, y: 1.9 },
          hw1: { x: -3.15, y: 2.45 },
          hw2: { x: -2.9, y: 1.1 },
          hx: { x: -1.75, y: 2.7 },
        },
      },
    ],
  },
  {
    id: "seq-sn1",
    title: "SN1 solvolysis · 2 steps",
    brief: "The bromide leaves on its own, then water captures the cation.",
    successLine: "That is SN1 whole: ionisation makes the flat tertiary cation, and water arrives on either face — which is why SN1 scrambles stereochemistry where SN2 inverts it.",
    steps: [
      {
        step: IONISATION,
        stepBrief: "Step 1 · Send the C–Br electrons onto bromine. Nothing pushes them; the cation's stability pulls.",
        fromHints: {
          c0: { x: 0, y: 0 },
          c1: { x: -0.55, y: 0.9 },
          c2: { x: -0.85, y: -0.5 },
          c3: { x: 0.2, y: -1.05 },
          br1: { x: 1.05, y: 0.35 },
        },
        toHints: {
          c0: { x: -0.2, y: 0 },
          c1: { x: -0.75, y: 0.9 },
          c2: { x: -1.05, y: -0.5 },
          c3: { x: 0.0, y: -1.05 },
          br1: { x: 1.75, y: 0.55 },
        },
      },
      {
        step: CAPTURE,
        stepBrief: "Step 2 · Water's lone pair takes the empty carbon.",
        fromHints: {
          c0: { x: 0, y: 0 },
          c1: { x: -0.55, y: 0.9 },
          c2: { x: -0.85, y: -0.5 },
          c3: { x: 0.2, y: -1.05 },
          ow: { x: 1.35, y: 0.45 },
          hw1: { x: 2.1, y: 1.0 },
          hw2: { x: 1.85, y: -0.35 },
        },
        toHints: {
          c0: { x: 0, y: 0 },
          c1: { x: -0.55, y: 0.9 },
          c2: { x: -0.85, y: -0.5 },
          c3: { x: 0.2, y: -1.05 },
          ow: { x: 1.05, y: 0.4 },
          hw1: { x: 1.8, y: 0.95 },
          hw2: { x: 1.55, y: -0.4 },
        },
      },
    ],
  },
  {
    id: "seq-acyl",
    title: "Acyl substitution · 2 steps",
    brief: "Add to the carbonyl, then the tetrahedral intermediate collapses. The ladder's own mechanism.",
    successLine: "Addition, then elimination: the tetrahedral intermediate is the whole story of the reactivity ladder, and the leaving group decides how fast the second step goes.",
    steps: [
      {
        step: ACYL_ADDITION,
        stepBrief: "Step 1 · Hydroxide attacks the acyl carbon; the π electrons step onto oxygen.",
        fromHints: {
          o2: { x: -1.7, y: -0.55 },
          h1: { x: -2.45, y: -1.15 },
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 0.75, y: -0.85 },
        },
        toHints: {
          o2: { x: -1.05, y: -0.45 },
          h1: { x: -1.8, y: -1.05 },
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 0.75, y: -0.85 },
        },
      },
      {
        step: ACYL_COLLAPSE,
        stepBrief: "Step 2 · The alkoxide reforms the π bond and pushes chloride out.",
        fromHints: {
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 0.75, y: -0.85 },
          o2: { x: -1.05, y: -0.45 },
          h1: { x: -1.8, y: -1.05 },
        },
        toHints: {
          cm: { x: -0.5, y: 1.3 },
          c2: { x: 0, y: 0.25 },
          o1: { x: 0.95, y: 0.85 },
          cl1: { x: 1.55, y: -1.25 },
          o2: { x: -1.05, y: -0.45 },
          h1: { x: -1.8, y: -1.05 },
        },
      },
    ],
  },
  {
    id: "seq-aldol",
    title: "Aldol addition · 2 steps",
    brief: "Make the enolate, then let its carbon attack the other carbonyl.",
    successLine: "The aldol, start to finish: base pulls the α-proton to make the enolate, and the enolate's CARBON attacks the second carbonyl — one new C–C bond, the skeleton grown.",
    steps: [
      {
        step: ENOLATE_FORMATION,
        stepBrief: "Step 1 · The base takes the α-hydrogen; three arrows land at once.",
        fromHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          c1: { x: -0.95, y: 0.35 },
          ha: { x: -1.7, y: 0.95 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
        toHints: {
          ob: { x: -2.55, y: 1.0 },
          hb: { x: -3.3, y: 1.55 },
          ha: { x: -2.05, y: 1.6 },
          c1: { x: -0.95, y: 0.35 },
          c2: { x: 0, y: -0.25 },
          o1: { x: 0.55, y: 0.65 },
          c3: { x: 0.6, y: -1.2 },
        },
      },
      {
        step: ALDOL_ATTACK,
        stepBrief: "Step 2 · The enolate carbon attacks; the carbonyl reforms behind it. Three arrows again.",
        fromHints: {
          c1: { x: -1.15, y: 0.15 },
          c2: { x: -2.1, y: -0.35 },
          o1: { x: -2.2, y: 0.75 },
          c3: { x: -3.05, y: -0.95 },
          cf: { x: 0.35, y: -0.35 },
          hf1: { x: 0.1, y: -1.4 },
          hf2: { x: 1.35, y: -0.6 },
          of: { x: 0.85, y: 0.55 },
        },
        toHints: {
          c1: { x: -1.15, y: 0.15 },
          c2: { x: -2.1, y: -0.35 },
          o1: { x: -2.2, y: 0.75 },
          c3: { x: -3.05, y: -0.95 },
          cf: { x: -0.15, y: -0.55 },
          hf1: { x: -0.4, y: -1.6 },
          hf2: { x: 0.85, y: -0.8 },
          of: { x: 0.35, y: 0.35 },
        },
      },
    ],
  },
];
