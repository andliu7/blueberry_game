/**
 * Category: route. Three causes, two blocking and one advisory.
 *
 * These are about the shape of the whole mechanism rather than about any single
 * arrow, so every `lookAt` sends the student back to the sequence or to the
 * reagent line rather than to an atom.
 */

import type { CauseId } from "@blueberry/chem-core";
import type { CauseCopy } from "../types.ts";

type RouteCauseId = Extract<
  CauseId,
  "step_out_of_order" | "step_not_elementary" | "route_requires_conditions_not_present"
>;

export const ROUTE_COPY: Readonly<Record<RouteCauseId, CauseCopy>> = Object.freeze({
  step_out_of_order: {
    whatYouDid: "You used a species that has not been made yet.",
    why: "A mechanism is a sequence, and each step starts from exactly what the step before it produced. The thing you reached for is created later in your own drawing.",
    lookAt: "Read your steps back in order and check that every species you touch is already present at that point. If the step really does have to come first, move it and redraw the ones after it from the new intermediate.",
  },
  step_not_elementary: {
    whatYouDid: "You drew several separate steps as one.",
    why: "One elementary step is one transition state and one energy barrier. Forming a bond and moving a proton somewhere unrelated are two barriers, so they are two steps, even when both are certain to happen.",
    lookAt: "Split wherever an intermediate exists, even a short lived one. Addition to a carbonyl under acid is three steps: protonate the carbonyl oxygen, attack the carbon, then deprotonate, with the tetrahedral intermediate drawn in between.",
  },
  route_requires_conditions_not_present: {
    whatYouDid: "Your route needs conditions the question did not give you.",
    why: "Which pathway runs is set by the reagents, the solvent, and the temperature as much as by the substrate. A mechanism that needs heat, or a strong base, or a different solvent is describing a different experiment from the one on the page.",
    lookAt: "Reread the reagent line and list what it actually hands you: the nucleophile or base and how strong it is, the solvent and whether it is protic, and the temperature. Then pick the route those support.",
  },
});
