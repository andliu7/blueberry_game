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

/**
 * All three hydrogens EXPLICIT, not implicit. A blind critic on the video
 * frames caught the inconsistency: HCl's hydrogen was a sphere on a stick and
 * ammonia's were floating grey letters, one element in two languages in one
 * scene. In the bar's own acid-base clips every hydrogen on an ACTOR species
 * is a real sphere; ghost glyphs are for spectator CH3 groups.
 */
const ammonia = createSpecies({
  id: "sp-ammonia",
  atoms: [
    createAtom({ id: "n1", element: "N", lonePairs: 1 }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "h4", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-nh2", a: "n1", b: "h2" }),
    createBond({ id: "b-nh3", a: "n1", b: "h3" }),
    createBond({ id: "b-nh4", a: "n1", b: "h4" }),
  ],
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
    createAtom({ id: "n1", element: "N", formalCharge: 1, lonePairs: 0 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "h4", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-nh", a: "n1", b: "h1" }),
    createBond({ id: "b-nh2", a: "n1", b: "h2" }),
    createBond({ id: "b-nh3", a: "n1", b: "h3" }),
    createBond({ id: "b-nh4", a: "n1", b: "h4" }),
  ],
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

/**
 * The aldehyde hydrogens are explicit: they sit ON the reactive carbon, and a
 * critic caught them dematerialised as arc glyphs "on the very molecule where
 * attack-the-C-not-its-substituents matters". Ghost glyphs stay for spectator
 * CH3 groups; atoms of the electrophile itself are real.
 */
const formaldehyde = createSpecies({
  id: "sp-formaldehyde",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o2", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o2", order: 2 }),
  ],
});

const alkoxide = createSpecies({
  id: "sp-alkoxide",
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
/* Electrophilic addition, step 1: ethene protonated by HBr.           */
/* The Addition playlist's opening move: the pi bond is the nucleophile.*/
/* ------------------------------------------------------------------ */

const ethene = createSpecies({
  id: "sp-ethene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 2 }),
  ],
  bonds: [createBond({ id: "b-cc", a: "c1", b: "c2", order: 2 })],
});

const hydrogenBromide = createSpecies({
  id: "sp-hbr",
  atoms: [createAtom({ id: "h1", element: "H" }), createAtom({ id: "br1", element: "Br", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hbr", a: "h1", b: "br1" })],
});

const ethylCation = createSpecies({
  id: "sp-ethyl-cation",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 2 }),
  ],
  bonds: [createBond({ id: "b-cc", a: "c1", b: "c2" }), createBond({ id: "b-ch", a: "c1", b: "h1" })],
});

const bromide = createSpecies({
  id: "sp-bromide-add",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ALKENE_PROTONATION: MechanismStep = createStep({
  id: "alkene-protonation-hbr",
  from: createState({
    id: "ap-before",
    members: [
      { species: ethene, role: "nucleophile" },
      { species: hydrogenBromide, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ap-after",
    members: [
      { species: ethylCation, role: "product" },
      { species: bromide, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "pi_bond_attack",
    route: "electrophilic_addition_alkene",
    reactionCenters: ["c1", "c2"],
  },
  arrows: [
    createArrow({ id: "a-pi-grab", source: fromBond("b-cc"), sink: toBondBetween("c1", "h1") }),
    createArrow({ id: "a-hbr-release", source: fromBond("b-hbr"), sink: toAtom("br1") }),
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
      // The three N-H bonds fan away from the acid so the lone pair side of
      // the nitrogen FACES the proton it is about to take: the staged
      // geometry must agree with the reaction, per the video-frame critic.
      // 90, 180, 270 degrees, all exactly one bond length: the widest the
      // three N-H bonds can spread while the whole lone pair half-plane
      // faces the acid. Round 3 measured the old fan at adjacent angles
      // nearer 65 degrees, "a picture of ammonia a student will remember
      // incorrectly", with one bond visibly longer than the others.
      n1: { x: -1.45, y: 0 },
      h2: { x: -1.45, y: 1.0 },
      h3: { x: -2.45, y: 0 },
      h4: { x: -1.45, y: -1.0 },
      h1: { x: -0.25, y: 0 },
      cl1: { x: 0.75, y: 0 },
    },
    toHints: {
      n1: { x: -1.25, y: 0 },
      h2: { x: -1.25, y: 1.0 },
      h3: { x: -2.25, y: 0 },
      h4: { x: -1.25, y: -1.0 },
      h1: { x: -0.25, y: 0 },
      cl1: { x: 1.8, y: 0 },
    },
  },
  {
    id: "carbonyl-addition",
    title: "Carbonyl addition",
    brief: "Hydroxide attacks the carbonyl carbon. Where do the π electrons go?",
    successLine: "The lone pair forms the new C–O bond and the π electrons climb onto the carbonyl oxygen.",
    step: CARBONYL_ADDITION,
    fromHints: {
      // Below-left of the carbon, so the approach vector aims at C and away
      // from the carbonyl oxygen: the critic measured the old line landing
      // nearer the O end of the C=O than the carbon it attacks.
      o1: { x: -1.35, y: -0.45 },
      h1: { x: -2.1, y: -1.1 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o2: { x: 0.62, y: 0.78 },
    },
    toHints: {
      o1: { x: -0.95, y: -0.45 },
      h1: { x: -1.7, y: -1.1 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o2: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "alkene-protonation",
    title: "Alkene + HBr",
    brief: "The π bond grabs the proton. Draw both arrows.",
    successLine: "The π electrons pull the proton in, and the H–Br bond's electrons leave with bromide.",
    step: ALKENE_PROTONATION,
    fromHints: {
      // The double bond stands vertical on the left with the acid's proton
      // facing it, so the pi cloud and the H it grabs look at each other.
      c1: { x: -1.3, y: 0.5 },
      c2: { x: -1.3, y: -0.5 },
      h1: { x: 0.1, y: 0.15 },
      br1: { x: 1.1, y: 0.15 },
    },
    toHints: {
      c1: { x: -1.15, y: 0.5 },
      h1: { x: -0.3, y: 0.95 },
      c2: { x: -1.15, y: -0.5 },
      br1: { x: 1.6, y: 0.15 },
    },
  },
];
