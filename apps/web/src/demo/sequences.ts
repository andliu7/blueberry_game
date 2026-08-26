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
];
