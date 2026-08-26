/**
 * Authored Tier 2 distractors for the demo step: the wrong arrows an
 * instructor KNOWS students draw on an SN2, each with copy written for that
 * exact mistake. Matched on mechanism state (the arrow's own key), never on
 * prose, per the feedback contract in CLAUDE.md.
 *
 * The first entry exists because the owner drew it and read the wrong
 * explanation. Sending hydroxide's electrons at bromine got back a generic
 * "bromide still has no reason to leave", which answers a different mistake.
 * The real reason the arrow is wrong is electrostatic: both ends of it are
 * electron rich. The copy leads with that.
 *
 * Voice per CLAUDE.md: a coach on the student's side. Name what happened
 * plainly, treat it as the normal step it is, make the next action feel
 * within reach. No scolding, no rhetorical questions.
 */

import type { ElectronFlowArrow, MechanismStep } from "@blueberry/chem-core";
import { arrowKey } from "./grade";

export interface TrainerDistractor {
  /** What the student did, plainly. */
  readonly what: string;
  /** Why the chemistry says no. */
  readonly why: string;
  /** Where to look instead. */
  readonly lookAt: string;
}

/**
 * Keyed by the offending arrow's key. Two spellings of the same idea both
 * land here: dropping ON bromine (an atom sink) and dropping between O and Br
 * (a forming-bond sink) are the same mistake with two gestures.
 */
const SN2_DEMO_DISTRACTORS: Readonly<Record<string, TrainerDistractor>> = {
  "2e lp:o1 -> atom:br1": {
    what: "You sent the oxygen's lone pair at bromine.",
    why: "Both ends of that arrow are electron rich. Hydroxide carries a full negative charge, and the C–Br bond leans its density onto bromine, so bromine already wears a partial negative charge. Like charges repel: there is nothing at bromine for a nucleophile to hold on to.",
    lookAt: "The carbon between them. Oxygen on one side and bromine on the other both pull density away from it, which leaves it slightly positive, and slightly positive is exactly what a nucleophile hunts.",
  },
  "2e lp:o1 -> between:br1+o1": {
    what: "You aimed the oxygen's lone pair at bromine, as a new O–Br bond.",
    why: "Both ends of that bond would be electron rich. Hydroxide is a full anion, and the C–Br bond leans its density onto bromine, so bromine wears a partial negative charge already. Like charges repel, and no bond forms between two centres that are both pushing electrons away.",
    lookAt: "The carbon between them. It is the one electron-poor atom on this canvas, and the backside of it, opposite bromine, is where the attack lands.",
  },
  "2e bond:b-cbr -> atom:c1": {
    what: "You collapsed the C–Br bond onto the carbon.",
    why: "That parks both electrons on carbon and makes a carbanion, and this carbon was never short of electrons. It is also carrying the incoming pair from oxygen in the same step, which would be two new pairs arriving at one small atom.",
    lookAt: "Bromine. It is the atom that can hold a full negative charge comfortably, which is what makes it a good leaving group: send the bond's electrons there and it departs as bromide.",
  },
};

/** The authored distractor for an arrow, or null when no one anticipated it. */
export function matchDistractor(step: MechanismStep, arrow: ElectronFlowArrow): TrainerDistractor | null {
  if (step.id !== "sn2-demo-step") return null;
  return SN2_DEMO_DISTRACTORS[arrowKey(arrow)] ?? null;
}
