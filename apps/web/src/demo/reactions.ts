/**
 * The trainer's reaction library. Owner requirement, 2026-08-26: more reaction
 * examples, and the trainer must be replicatable for ANY reaction it is given.
 *
 * This file is the proof of that claim: a reaction here is a MechanismStep
 * built through chem-core's real constructors plus layout hints, and the
 * trainer consumes the registry as data. Adding a reaction is adding an entry;
 * no component changes. Each of the new entries deliberately matches one of
 * the downloaded Alchemie playlists (Acid Base, Carbonyl), so the parity loop
 * can judge our version of a reaction against the bar performing the same one.
 *
 * The SN2 step stays in its own module: the tutorial, the capture script and
 * three test files address it directly, and moving it would touch all of them
 * for zero behaviour.
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
  toAtom,
  toBondBetween,
  type MechanismStep,
} from "@blueberry/chem-core";
import type { LayoutHints } from "../render/layout/layout";
import { SN2_DEMO_STEP, SN2_FROM_HINTS, SN2_TO_HINTS } from "./sn2Step";

export interface TrainerReaction {
  readonly id: string;
  /** The picker label and the card heading. */
  readonly title: string;
  /** One line under the title: what to do, in the imperative. */
  readonly brief: string;
  /** The success card's headline, this reaction's own chemistry in one line. */
  readonly successLine: string;
  readonly step: MechanismStep;
  readonly fromHints: LayoutHints;
  readonly toHints: LayoutHints;
}

/* ------------------------------------------------------------------ */
/* Proton transfer: ammonia deprotonates hydrogen chloride.            */
/* The Acid Base playlist's opening move, and the single most common   */
/* step in the whole corpus.                                           */
/* ------------------------------------------------------------------ */

const ammonia = createSpecies({
  id: "sp-ammonia",
  atoms: [createAtom({ id: "n1", element: "N", lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

/** The acid's proton is explicit: it is the atom that MOVES. */
const hydrogenChloride = createSpecies({
  id: "sp-hcl",
  atoms: [createAtom({ id: "h1", element: "H" }), createAtom({ id: "cl1", element: "Cl", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hcl", a: "h1", b: "cl1" })],
});

const ammonium = createSpecies({
  id: "sp-ammonium",
  atoms: [
    createAtom({ id: "n1", element: "N", formalCharge: 1, lonePairs: 0, implicitHydrogens: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-nh", a: "n1", b: "h1" })],
});

const chloride = createSpecies({
  id: "sp-chloride",
  atoms: [createAtom({ id: "cl1", element: "Cl", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const PROTON_TRANSFER: MechanismStep = createStep({
  id: "proton-transfer-nh3-hcl",
  from: createState({
    id: "pt-before",
    members: [
      { species: ammonia, role: "nucleophile" },
      { species: hydrogenChloride, role: "substrate" },
    ],
  }),
  to: createState({
    id: "pt-after",
    members: [
      { species: ammonium, role: "product" },
      { species: chloride, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "proton_transfer",
    route: "acid_base_proton_transfer",
    reactionCenters: ["h1"],
  },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("n1"), sink: toBondBetween("n1", "h1") }),
    createArrow({ id: "a-release", source: fromBond("b-hcl"), sink: toAtom("cl1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Nucleophilic addition: hydroxide attacks formaldehyde.               */
/* The Carbonyl playlist's opening move, and Unit 0's first mechanism.  */
/* ------------------------------------------------------------------ */

const hydroxideNu = createSpecies({
  id: "sp-hydroxide-nu",
  atoms: [
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" })],
});

const formaldehyde = createSpecies({
  id: "sp-formaldehyde",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [createBond({ id: "b-co", a: "c1", b: "o2", order: 2 })],
});

const alkoxide = createSpecies({
  id: "sp-alkoxide",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "o2", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-oh", a: "o1", b: "h1" }),
    createBond({ id: "b-oc", a: "o1", b: "c1" }),
    createBond({ id: "b-co", a: "c1", b: "o2" }),
  ],
});

const CARBONYL_ADDITION: MechanismStep = createStep({
  id: "carbonyl-addition-oh-ch2o",
  from: createState({
    id: "ca-before",
    members: [
      { species: hydroxideNu, role: "nucleophile" },
      { species: formaldehyde, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ca-after",
    members: [{ species: alkoxide, role: "product" }],
  }),
  identity: {
    elementaryStep: "nucleophilic_attack",
    route: "nucleophilic_addition_carbonyl",
    reactionCenters: ["c1"],
  },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("o1"), sink: toBondBetween("o1", "c1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-co"), sink: toAtom("o2") }),
  ],
});

/* ------------------------------------------------------------------ */

export const TRAINER_REACTIONS: readonly TrainerReaction[] = [
  {
    id: "sn2",
    title: "Sₙ2 at bromomethane",
    brief: "Hydroxide attacks, bromide leaves. Draw both arrows.",
    successLine: "Back-side attack: the hydroxide lone pair forms the new C–O bond as the bromide leaves.",
    step: SN2_DEMO_STEP,
    fromHints: SN2_FROM_HINTS,
    toHints: SN2_TO_HINTS,
  },
  {
    id: "proton-transfer",
    title: "Proton transfer",
    brief: "Ammonia takes the acid's proton. Draw both arrows.",
    successLine: "The nitrogen lone pair takes the proton as the H–Cl bond's electrons settle onto chlorine.",
    step: PROTON_TRANSFER,
    fromHints: {
      n1: { x: -1.7, y: 0 },
      h1: { x: -0.45, y: 0 },
      cl1: { x: 0.55, y: 0 },
    },
    toHints: {
      n1: { x: -1.35, y: 0 },
      h1: { x: -0.35, y: 0 },
      cl1: { x: 1.7, y: 0 },
    },
  },
  {
    id: "carbonyl-addition",
    title: "Carbonyl addition",
    brief: "Hydroxide attacks the carbonyl carbon. Where do the π electrons go?",
    successLine: "The lone pair forms the new C–O bond and the π electrons climb onto the carbonyl oxygen.",
    step: CARBONYL_ADDITION,
    fromHints: {
      o1: { x: -1.9, y: 0 },
      h1: { x: -2.6, y: -0.72 },
      c1: { x: 0, y: 0 },
      o2: { x: 0.62, y: 0.78 },
    },
    toHints: {
      o1: { x: -1.0, y: 0 },
      h1: { x: -1.7, y: -0.72 },
      c1: { x: 0, y: 0 },
      o2: { x: 0.62, y: 0.78 },
    },
  },
];
