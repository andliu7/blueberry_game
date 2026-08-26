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

/**
 * PROPENE, not ethene, and the swap was forced by a real hand on the canvas.
 * With ethene the two alkene carbons are chemically identical, but grading
 * compares against the authored arrow set, so grabbing the C=C by its bottom
 * handle built the mirror-image answer and was wobbled back as wrong: the
 * owner's report, "dragging from the bottom doesn't work but the top does."
 * Propene makes the two ends genuinely different: protonating the terminal
 * CH2 gives the secondary cation (Markovnikov, correct), protonating the
 * middle carbon gives the primary cation, which is now an authored
 * distractor that teaches instead of a symmetry accident that frustrates.
 */
const propene = createSpecies({
  id: "sp-propene",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-cc", a: "c1", b: "c2", order: 2 }), createBond({ id: "b-c23", a: "c2", b: "c3" })],
});

const hydrogenBromide = createSpecies({
  id: "sp-hbr",
  atoms: [createAtom({ id: "h1", element: "H" }), createAtom({ id: "br1", element: "Br", lonePairs: 3 })],
  bonds: [createBond({ id: "b-hbr", a: "h1", b: "br1" })],
});

const isopropylCation = createSpecies({
  id: "sp-isopropyl-cation",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "c2", element: "C", formalCharge: 1, implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cc", a: "c1", b: "c2" }),
    createBond({ id: "b-ch", a: "c1", b: "h1" }),
    createBond({ id: "b-c23", a: "c2", b: "c3" }),
  ],
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
      { species: propene, role: "nucleophile" },
      { species: hydrogenBromide, role: "substrate" },
    ],
  }),
  to: createState({
    id: "ap-after",
    members: [
      { species: isopropylCation, role: "product" },
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
/* E2 at 2-bromopropane: three arrows, one barrier. Unit 5 spine.       */
/* ------------------------------------------------------------------ */

const bromopropane = createSpecies({
  id: "sp-2-bromopropane",
  atoms: [
    // The beta hydrogen is explicit: it is the atom the base takes.
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "hb", element: "H" }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-c1hb", a: "c1", b: "hb" }),
    createBond({ id: "b-c12", a: "c1", b: "c2" }),
    createBond({ id: "b-c23", a: "c2", b: "c3" }),
    createBond({ id: "b-c2br", a: "c2", b: "br1" }),
  ],
});

const hydroxideE2 = createSpecies({
  id: "sp-hydroxide-e2",
  atoms: [
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "h1", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" })],
});

const propeneOut = createSpecies({
  id: "sp-propene-out",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-c12", a: "c1", b: "c2", order: 2 }), createBond({ id: "b-c23", a: "c2", b: "c3" })],
});

const waterE2 = createSpecies({
  id: "sp-water-e2",
  atoms: [
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "h1", element: "H" }),
    createAtom({ id: "hb", element: "H" }),
  ],
  bonds: [createBond({ id: "b-oh", a: "o1", b: "h1" }), createBond({ id: "b-ohb", a: "o1", b: "hb" })],
});

const bromideE2 = createSpecies({
  id: "sp-bromide-e2",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const E2_ELIMINATION: MechanismStep = createStep({
  id: "e2-2-bromopropane",
  from: createState({
    id: "e2-before",
    members: [
      { species: hydroxideE2, role: "base" },
      { species: bromopropane, role: "substrate" },
    ],
  }),
  to: createState({
    id: "e2-after",
    members: [
      { species: propeneOut, role: "product" },
      { species: waterE2, role: "byproduct" },
      { species: bromideE2, role: "leaving_group" },
    ],
  }),
  identity: {
    elementaryStep: "concerted_elimination",
    route: "e2",
    reactionCenters: ["hb", "c2"],
  },
  arrows: [
    createArrow({ id: "a-grab", source: fromLonePair("o1"), sink: toBondBetween("o1", "hb") }),
    createArrow({ id: "a-pi", source: fromBond("b-c1hb"), sink: toBondBetween("c1", "c2") }),
    createArrow({ id: "a-leave", source: fromBond("b-c2br"), sink: toAtom("br1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Cyanohydrin: cyanide attacks formaldehyde. Unit 7 branch, one step.  */
/* ------------------------------------------------------------------ */

const cyanide = createSpecies({
  id: "sp-cyanide",
  atoms: [
    createAtom({ id: "c9", element: "C", formalCharge: -1, lonePairs: 1 }),
    createAtom({ id: "n1", element: "N", lonePairs: 1 }),
  ],
  bonds: [createBond({ id: "b-cn", a: "c9", b: "n1", order: 3 })],
});

const formaldehydeCy = createSpecies({
  id: "sp-formaldehyde-cy",
  atoms: [
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o1", order: 2 }),
  ],
});

const cyanoalkoxide = createSpecies({
  id: "sp-cyanoalkoxide",
  atoms: [
    createAtom({ id: "c9", element: "C" }),
    createAtom({ id: "n1", element: "N", lonePairs: 1 }),
    createAtom({ id: "c1", element: "C" }),
    createAtom({ id: "h2", element: "H" }),
    createAtom({ id: "h3", element: "H" }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cn", a: "c9", b: "n1", order: 3 }),
    createBond({ id: "b-cc", a: "c9", b: "c1" }),
    createBond({ id: "b-ch2", a: "c1", b: "h2" }),
    createBond({ id: "b-ch3", a: "c1", b: "h3" }),
    createBond({ id: "b-co", a: "c1", b: "o1" }),
  ],
});

const CYANOHYDRIN_ATTACK: MechanismStep = createStep({
  id: "cyanohydrin-attack",
  from: createState({
    id: "cy-before",
    members: [
      { species: cyanide, role: "nucleophile" },
      { species: formaldehydeCy, role: "substrate" },
    ],
  }),
  to: createState({
    id: "cy-after",
    members: [{ species: cyanoalkoxide, role: "product" }],
  }),
  identity: {
    elementaryStep: "nucleophilic_attack",
    route: "nucleophilic_addition_carbonyl",
    reactionCenters: ["c1"],
  },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("c9"), sink: toBondBetween("c9", "c1") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-co"), sink: toAtom("o1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5 spine: Williamson ether synthesis, an SN2 wearing a new name. */
/* ------------------------------------------------------------------ */

const methoxide = createSpecies({
  id: "sp-methoxide",
  atoms: [
    createAtom({ id: "om", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-ome", a: "om", b: "cme" })],
});

const bromomethaneW = createSpecies({
  id: "sp-bromomethane-w",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "br1", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-cbr", a: "c1", b: "br1" })],
});

const dimethylEther = createSpecies({
  id: "sp-dimethyl-ether",
  atoms: [
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "c1", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-ome", a: "om", b: "cme" }), createBond({ id: "b-oc1", a: "om", b: "c1" })],
});

const bromideW = createSpecies({
  id: "sp-bromide-w",
  atoms: [createAtom({ id: "br1", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const WILLIAMSON: MechanismStep = createStep({
  id: "williamson-ether",
  from: createState({
    id: "wil-before",
    members: [
      { species: methoxide, role: "nucleophile" },
      { species: bromomethaneW, role: "substrate" },
    ],
  }),
  to: createState({
    id: "wil-after",
    members: [
      { species: dimethylEther, role: "product" },
      { species: bromideW, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "concerted_substitution", route: "sn2", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("om"), sink: toBondBetween("om", "c1") }),
    createArrow({ id: "a-leave", source: fromBond("b-cbr"), sink: toAtom("br1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 5b spine: epoxide opening, both regiochemistries, taught as a  */
/* pair. Propylene oxide so the two carbons genuinely differ.          */
/* ------------------------------------------------------------------ */

const propyleneOxide = createSpecies({
  id: "sp-propylene-oxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1o", a: "c1", b: "o1" }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
  ],
});

const methoxideEp = createSpecies({
  id: "sp-methoxide-ep",
  atoms: [
    createAtom({ id: "om", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-ome", a: "om", b: "cme" })],
});

const basicOpened = createSpecies({
  id: "sp-basic-opened",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", formalCharge: -1, lonePairs: 3 }),
    createAtom({ id: "om", element: "O", lonePairs: 2 }),
    createAtom({ id: "cme", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-1om", a: "c1", b: "om" }),
    createBond({ id: "b-ome", a: "om", b: "cme" }),
  ],
});

const EPOXIDE_BASIC: MechanismStep = createStep({
  id: "epoxide-basic",
  from: createState({
    id: "epb-before",
    members: [
      { species: methoxideEp, role: "nucleophile" },
      { species: propyleneOxide, role: "substrate" },
    ],
  }),
  to: createState({ id: "epb-after", members: [{ species: basicOpened, role: "product" }] }),
  identity: { elementaryStep: "ring_opening", route: "sn2", reactionCenters: ["c1"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("om"), sink: toBondBetween("om", "c1") }),
    createArrow({ id: "a-relieve", source: fromBond("b-1o"), sink: toAtom("o1") }),
  ],
});

const protonatedEpoxide = createSpecies({
  id: "sp-protonated-epoxide",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hp", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1o", a: "c1", b: "o1" }),
    createBond({ id: "b-2o", a: "c2", b: "o1" }),
    createBond({ id: "b-ohp", a: "o1", b: "hp" }),
  ],
});

const waterEp = createSpecies({
  id: "sp-water-ep",
  atoms: [
    createAtom({ id: "ow", element: "O", lonePairs: 2 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [createBond({ id: "b-ow1", a: "ow", b: "hw1" }), createBond({ id: "b-ow2", a: "ow", b: "hw2" })],
});

const acidOpened = createSpecies({
  id: "sp-acid-opened",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "hp", element: "H" }),
    createAtom({ id: "ow", element: "O", formalCharge: 1, lonePairs: 1 }),
    createAtom({ id: "hw1", element: "H" }),
    createAtom({ id: "hw2", element: "H" }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1o", a: "c1", b: "o1" }),
    createBond({ id: "b-ohp", a: "o1", b: "hp" }),
    createBond({ id: "b-2ow", a: "c2", b: "ow" }),
    createBond({ id: "b-ow1", a: "ow", b: "hw1" }),
    createBond({ id: "b-ow2", a: "ow", b: "hw2" }),
  ],
});

const EPOXIDE_ACIDIC: MechanismStep = createStep({
  id: "epoxide-acidic",
  from: createState({
    id: "epa-before",
    members: [
      { species: waterEp, role: "nucleophile" },
      { species: protonatedEpoxide, role: "substrate" },
    ],
  }),
  to: createState({ id: "epa-after", members: [{ species: acidOpened, role: "product" }] }),
  identity: { elementaryStep: "ring_opening", route: "sn1", reactionCenters: ["c2"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("ow"), sink: toBondBetween("ow", "c2") }),
    createArrow({ id: "a-relieve", source: fromBond("b-2o"), sink: toAtom("o1") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: the Grignard's methyl, drawn as the carbanion it      */
/* delivers; and the imine's first bond.                               */
/* ------------------------------------------------------------------ */

const methylCarbanion = createSpecies({
  id: "sp-methyl-carbanion",
  atoms: [createAtom({ id: "cg", element: "C", formalCharge: -1, lonePairs: 1, implicitHydrogens: 3 })],
  bonds: [],
});

const formaldehydeG = createSpecies({
  id: "sp-formaldehyde-g",
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

const ethoxideOut = createSpecies({
  id: "sp-ethoxide-out",
  atoms: [
    createAtom({ id: "cg", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-gc", a: "cg", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const GRIGNARD_METHYL: MechanismStep = createStep({
  id: "grignard-methyl",
  from: createState({
    id: "grig-before",
    members: [
      { species: methylCarbanion, role: "nucleophile" },
      { species: formaldehydeG, role: "substrate" },
    ],
  }),
  to: createState({ id: "grig-after", members: [{ species: ethoxideOut, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("cg"), sink: toBondBetween("cg", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

const methylamine = createSpecies({
  id: "sp-methylamine",
  atoms: [
    createAtom({ id: "nm", element: "N", lonePairs: 1, implicitHydrogens: 2 }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [createBond({ id: "b-nc", a: "nm", b: "cn" })],
});

const formaldehydeIm = createSpecies({
  id: "sp-formaldehyde-im",
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

const zwitterion = createSpecies({
  id: "sp-imine-zwitterion",
  atoms: [
    createAtom({ id: "nm", element: "N", formalCharge: 1, implicitHydrogens: 2 }),
    createAtom({ id: "cn", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-nc", a: "nm", b: "cn" }),
    createBond({ id: "b-nf", a: "nm", b: "cf" }),
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const IMINE_ATTACK: MechanismStep = createStep({
  id: "imine-attack",
  from: createState({
    id: "im-before",
    members: [
      { species: methylamine, role: "nucleophile" },
      { species: formaldehydeIm, role: "substrate" },
    ],
  }),
  to: createState({ id: "im-after", members: [{ species: zwitterion, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-attack", source: fromLonePair("nm"), sink: toBondBetween("nm", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 7 spine: hydride reduction, the H:- that NaBH4 delivers.        */
/* ------------------------------------------------------------------ */

const hydride = createSpecies({
  id: "sp-hydride",
  atoms: [createAtom({ id: "h9", element: "H", formalCharge: -1, lonePairs: 1 })],
  bonds: [],
});

const formaldehydeH = createSpecies({
  id: "sp-formaldehyde-h",
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

const methoxideOut = createSpecies({
  id: "sp-methoxide-out",
  atoms: [
    createAtom({ id: "cf", element: "C" }),
    createAtom({ id: "hf1", element: "H" }),
    createAtom({ id: "hf2", element: "H" }),
    createAtom({ id: "h9", element: "H" }),
    createAtom({ id: "of", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-cfh1", a: "cf", b: "hf1" }),
    createBond({ id: "b-cfh2", a: "cf", b: "hf2" }),
    createBond({ id: "b-cfh9", a: "cf", b: "h9" }),
    createBond({ id: "b-cfo", a: "cf", b: "of" }),
  ],
});

const HYDRIDE_REDUCTION: MechanismStep = createStep({
  id: "hydride-reduction",
  from: createState({
    id: "hyd-before",
    members: [
      { species: hydride, role: "nucleophile" },
      { species: formaldehydeH, role: "substrate" },
    ],
  }),
  to: createState({ id: "hyd-after", members: [{ species: methoxideOut, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "reduction", reactionCenters: ["cf"] },
  arrows: [
    createArrow({ id: "a-hydride", source: fromLonePair("h9"), sink: toBondBetween("h9", "cf") }),
    createArrow({ id: "a-pi-up", source: fromBond("b-cfo"), sink: toAtom("of") }),
  ],
});

/* ------------------------------------------------------------------ */
/* Unit 9 spine: alpha-bromination through the enolate, and the        */
/* Michael addition, four arrows moving as one.                        */
/* ------------------------------------------------------------------ */

const enolateBr = createSpecies({
  id: "sp-enolate-br",
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

const bromine = createSpecies({
  id: "sp-bromine",
  atoms: [
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
    createAtom({ id: "brb", element: "Br", lonePairs: 3 }),
  ],
  bonds: [createBond({ id: "b-brbr", a: "bra", b: "brb" })],
});

const bromoketone = createSpecies({
  id: "sp-bromoketone",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "bra", element: "Br", lonePairs: 3 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
  ],
  bonds: [
    createBond({ id: "b-1br", a: "c1", b: "bra" }),
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
  ],
});

const bromideAlpha = createSpecies({
  id: "sp-bromide-alpha",
  atoms: [createAtom({ id: "brb", element: "Br", formalCharge: -1, lonePairs: 4 })],
  bonds: [],
});

const ALPHA_BROMINATION: MechanismStep = createStep({
  id: "alpha-bromination",
  from: createState({
    id: "ab-before",
    members: [
      { species: enolateBr, role: "nucleophile" },
      { species: bromine, role: "electrophile" },
    ],
  }),
  to: createState({
    id: "ab-after",
    members: [
      { species: bromoketone, role: "product" },
      { species: bromideAlpha, role: "leaving_group" },
    ],
  }),
  identity: { elementaryStep: "nucleophilic_attack", route: "acid_base_proton_transfer", reactionCenters: ["c1", "bra"] },
  arrows: [
    createArrow({ id: "a-c-attacks", source: fromBond("b-12"), sink: toBondBetween("c1", "bra") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-brbr", source: fromBond("b-brbr"), sink: toAtom("brb") }),
  ],
});

const enolateMi = createSpecies({
  id: "sp-enolate-mi",
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

const acrolein = createSpecies({
  id: "sp-acrolein",
  atoms: [
    createAtom({ id: "cb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ca", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "cc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "oa", element: "O", lonePairs: 2 }),
  ],
  bonds: [
    createBond({ id: "b-ba", a: "cb", b: "ca", order: 2 }),
    createBond({ id: "b-ac", a: "ca", b: "cc" }),
    createBond({ id: "b-co", a: "cc", b: "oa", order: 2 }),
  ],
});

const michaelAdduct = createSpecies({
  id: "sp-michael-adduct",
  atoms: [
    createAtom({ id: "c1", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "c2", element: "C" }),
    createAtom({ id: "o1", element: "O", lonePairs: 2 }),
    createAtom({ id: "c3", element: "C", implicitHydrogens: 3 }),
    createAtom({ id: "cb", element: "C", implicitHydrogens: 2 }),
    createAtom({ id: "ca", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "cc", element: "C", implicitHydrogens: 1 }),
    createAtom({ id: "oa", element: "O", formalCharge: -1, lonePairs: 3 }),
  ],
  bonds: [
    createBond({ id: "b-12", a: "c1", b: "c2" }),
    createBond({ id: "b-2o", a: "c2", b: "o1", order: 2 }),
    createBond({ id: "b-23", a: "c2", b: "c3" }),
    createBond({ id: "b-1b", a: "c1", b: "cb" }),
    createBond({ id: "b-ba", a: "cb", b: "ca" }),
    createBond({ id: "b-ac", a: "ca", b: "cc", order: 2 }),
    createBond({ id: "b-co", a: "cc", b: "oa" }),
  ],
});

const MICHAEL_ADDITION: MechanismStep = createStep({
  id: "michael-addition",
  from: createState({
    id: "mi-before",
    members: [
      { species: enolateMi, role: "nucleophile" },
      { species: acrolein, role: "electrophile" },
    ],
  }),
  to: createState({ id: "mi-after", members: [{ species: michaelAdduct, role: "product" }] }),
  identity: { elementaryStep: "nucleophilic_attack", route: "nucleophilic_addition_carbonyl", reactionCenters: ["c1", "cb"] },
  arrows: [
    createArrow({ id: "a-nu", source: fromBond("b-12"), sink: toBondBetween("c1", "cb") }),
    createArrow({ id: "a-reform", source: fromLonePair("o1"), sink: toBondBetween("o1", "c2") }),
    createArrow({ id: "a-shift", source: fromBond("b-ba"), sink: toBondBetween("ca", "cc") }),
    createArrow({ id: "a-pi-off", source: fromBond("b-co"), sink: toAtom("oa") }),
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
      // 115, 180 and 245 degrees: a real pyramidal projection. Round 3
      // measured 65 degree spacing as cramped, round 4 read 90 degrees as
      // "square-ish geometry"; 65 degrees BETWEEN bonds with the whole fan
      // still clear of the acid's half-plane is the projection a textbook
      // draws.
      n1: { x: -1.45, y: 0 },
      h2: { x: -1.87, y: 0.91 },
      h3: { x: -2.45, y: 0 },
      h4: { x: -1.87, y: -0.91 },
      h1: { x: -0.25, y: 0 },
      cl1: { x: 0.75, y: 0 },
    },
    toHints: {
      n1: { x: -1.25, y: 0 },
      h2: { x: -1.67, y: 0.91 },
      h3: { x: -2.25, y: 0 },
      h4: { x: -1.67, y: -0.91 },
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
    title: "Propene + HBr",
    brief: "The π bond grabs the proton — but which carbon takes the H? Draw both arrows.",
    successLine: "Markovnikov: the H lands on the CH₂ end, so the positive charge sits on the more substituted carbon, where it is most stable.",
    step: ALKENE_PROTONATION,
    fromHints: {
      // The double bond stands vertical on the left with the acid's proton
      // facing it, so the pi cloud and the H it grabs look at each other.
      c1: { x: -1.3, y: 0.55 },
      c2: { x: -1.3, y: -0.45 },
      c3: { x: -2.25, y: -0.95 },
      h1: { x: 0.1, y: 0.15 },
      br1: { x: 1.1, y: 0.15 },
    },
    toHints: {
      c1: { x: -1.15, y: 0.55 },
      h1: { x: -0.35, y: 1.0 },
      c2: { x: -1.15, y: -0.45 },
      c3: { x: -2.1, y: -0.95 },
      br1: { x: 1.6, y: 0.15 },
    },
  },
  {
    id: "e2",
    title: "E2 elimination",
    brief: "Three arrows, one moment: the base pulls, the π forms, the bromide leaves.",
    successLine: "One concerted step: the base takes the β-hydrogen as its electrons become the π bond and bromide departs — anti-periplanar, all at once.",
    step: E2_ELIMINATION,
    fromHints: {
      o1: { x: -2.6, y: 1.15 },
      h1: { x: -3.35, y: 1.7 },
      c1: { x: -1.05, y: 0.15 },
      hb: { x: -1.75, y: 0.85 },
      c2: { x: 0.0, y: -0.35 },
      c3: { x: -0.25, y: -1.4 },
      br1: { x: 1.2, y: 0.35 },
    },
    toHints: {
      o1: { x: -2.6, y: 1.15 },
      h1: { x: -3.35, y: 1.7 },
      hb: { x: -1.95, y: 1.35 },
      c1: { x: -1.05, y: 0.15 },
      c2: { x: 0.0, y: -0.35 },
      c3: { x: -0.25, y: -1.4 },
      br1: { x: 1.75, y: 0.55 },
    },
  },
  {
    id: "cyanohydrin",
    title: "Cyanohydrin attack",
    brief: "Cyanide's carbon is the nucleophile. Two arrows.",
    successLine: "The carbanion carbon attacks the carbonyl and the π electrons climb onto oxygen: one new C–C bond, and a nitrile handle for later chemistry.",
    step: CYANOHYDRIN_ATTACK,
    fromHints: {
      c9: { x: -1.45, y: -0.35 },
      n1: { x: -2.45, y: -0.7 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o1: { x: 0.62, y: 0.78 },
    },
    toHints: {
      c9: { x: -0.95, y: -0.3 },
      n1: { x: -1.95, y: -0.65 },
      c1: { x: 0, y: 0 },
      h2: { x: -0.35, y: 0.94 },
      h3: { x: 0.95, y: -0.35 },
      o1: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "williamson",
    title: "Williamson ether",
    brief: "Methoxide attacks the methyl halide: an SN2 that builds an ether.",
    successLine: "Backside attack on the 1° carbon, bromide leaves: the Williamson is SN2 wearing a synthesis name, and it is why 3° halides eliminate instead.",
    step: WILLIAMSON,
    fromHints: {
      om: { x: -1.6, y: 0.1 },
      cme: { x: -2.55, y: 0.6 },
      c1: { x: 0, y: 0 },
      br1: { x: 1.2, y: 0 },
    },
    toHints: {
      om: { x: -1.05, y: 0.1 },
      cme: { x: -2.0, y: 0.6 },
      c1: { x: 0, y: 0 },
      br1: { x: 1.75, y: 0 },
    },
  },
  {
    id: "epoxide-basic",
    title: "Epoxide, basic opening",
    brief: "Strong nucleophile, no acid: which carbon does it hit?",
    successLine: "Under basic conditions the nucleophile attacks the LESS hindered carbon — clean SN2, backside, and the ring strain does the leaving group's job.",
    step: EPOXIDE_BASIC,
    fromHints: {
      om: { x: -1.85, y: -0.35 },
      cme: { x: -2.8, y: -0.8 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 1.3, y: -0.6 },
      o1: { x: 0.05, y: 1.05 },
    },
    toHints: {
      om: { x: -1.4, y: -0.3 },
      cme: { x: -2.35, y: -0.75 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 1.3, y: -0.6 },
      o1: { x: 0.55, y: 1.15 },
    },
  },
  {
    id: "epoxide-acidic",
    title: "Epoxide, acidic opening",
    brief: "The ring is protonated now. Same question: which carbon?",
    successLine: "Under acid the ring is activated and the MORE substituted carbon takes the hit: it carries the greater share of positive charge, so the weak nucleophile goes there.",
    step: EPOXIDE_ACIDIC,
    fromHints: {
      ow: { x: 1.95, y: -0.5 },
      hw1: { x: 2.7, y: 0.05 },
      hw2: { x: 2.45, y: -1.3 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 0.85, y: -0.85 },
      o1: { x: 0.05, y: 1.05 },
      hp: { x: 0.05, y: 2.05 },
    },
    toHints: {
      ow: { x: 1.35, y: -0.45 },
      hw1: { x: 2.1, y: 0.1 },
      hw2: { x: 1.85, y: -1.25 },
      c1: { x: -0.5, y: 0.15 },
      c2: { x: 0.55, y: 0.15 },
      c3: { x: 0.85, y: -0.85 },
      o1: { x: -0.35, y: 1.05 },
      hp: { x: -0.35, y: 2.05 },
    },
  },
  {
    id: "grignard-methyl",
    title: "Grignard addition",
    brief: "The Grignard's methyl, drawn as the carbanion it delivers. Two arrows.",
    successLine: "The carbanion attacks the carbonyl carbon and the π electrons step onto oxygen: a new C–C bond and the alkoxide the workup will protonate.",
    step: GRIGNARD_METHYL,
    fromHints: {
      cg: { x: -1.55, y: -0.35 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      cg: { x: -1.0, y: -0.3 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "imine-attack",
    title: "Imine, first bond",
    brief: "The amine's lone pair opens the imine story. Two arrows.",
    successLine: "Nitrogen attacks the carbonyl carbon and the zwitterion forms: N⁺ and O⁻ on neighbouring atoms, waiting for the proton shuffle that finishes the imine.",
    step: IMINE_ATTACK,
    fromHints: {
      nm: { x: -1.55, y: -0.3 },
      cn: { x: -2.5, y: -0.75 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      nm: { x: -1.0, y: -0.25 },
      cn: { x: -1.95, y: -0.7 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "hydride-reduction",
    title: "Hydride reduction",
    brief: "The H⁻ that NaBH₄ delivers. Two arrows.",
    successLine: "The hydride takes the carbonyl carbon and the π electrons climb onto oxygen: the alkoxide the workup will protonate to the alcohol.",
    step: HYDRIDE_REDUCTION,
    fromHints: {
      h9: { x: -1.35, y: -0.3 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
    toHints: {
      h9: { x: -0.85, y: -0.25 },
      cf: { x: 0, y: 0 },
      hf1: { x: -0.35, y: 0.94 },
      hf2: { x: 0.95, y: -0.35 },
      of: { x: 0.62, y: 0.78 },
    },
  },
  {
    id: "alpha-bromination",
    title: "α-Bromination",
    brief: "The enolate meets Br₂: three arrows.",
    successLine: "The enolate's carbon attacks bromine, the carbonyl reforms behind it, and bromide leaves: the α-carbon is functionalised, and under base this would run again — which is the haloform story.",
    step: ALPHA_BROMINATION,
    fromHints: {
      c1: { x: -1.0, y: 0.15 },
      c2: { x: -1.95, y: -0.35 },
      o1: { x: -2.05, y: 0.75 },
      c3: { x: -2.9, y: -0.95 },
      bra: { x: 0.35, y: -0.15 },
      brb: { x: 1.55, y: -0.5 },
    },
    toHints: {
      c1: { x: -1.0, y: 0.15 },
      bra: { x: 0.1, y: -0.2 },
      c2: { x: -1.95, y: -0.35 },
      o1: { x: -2.05, y: 0.75 },
      c3: { x: -2.9, y: -0.95 },
      brb: { x: 1.95, y: -0.6 },
    },
  },
  {
    id: "michael-addition",
    title: "Michael addition",
    brief: "Soft nucleophile, 1,4. Four arrows move as one.",
    successLine: "The enolate adds to the β-carbon, the enone's π system relays the charge down the chain, and it lands on the far oxygen: conjugate addition, the soft way in.",
    step: MICHAEL_ADDITION,
    fromHints: {
      c1: { x: -1.35, y: 0.2 },
      c2: { x: -2.3, y: -0.3 },
      o1: { x: -2.4, y: 0.8 },
      c3: { x: -3.25, y: -0.9 },
      cb: { x: 0.05, y: -0.2 },
      ca: { x: 1.05, y: 0.25 },
      cc: { x: 2.05, y: -0.2 },
      oa: { x: 3.0, y: 0.25 },
    },
    toHints: {
      c1: { x: -1.35, y: 0.2 },
      c2: { x: -2.3, y: -0.3 },
      o1: { x: -2.4, y: 0.8 },
      c3: { x: -3.25, y: -0.9 },
      cb: { x: -0.35, y: -0.35 },
      ca: { x: 0.65, y: 0.1 },
      cc: { x: 1.65, y: -0.35 },
      oa: { x: 2.6, y: 0.1 },
    },
  },
];
