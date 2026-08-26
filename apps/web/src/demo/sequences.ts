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
