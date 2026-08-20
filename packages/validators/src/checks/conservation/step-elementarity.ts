import {
  findAtomInState,
  neighborIds,
  type AtomId,
  type MechanismState,
  type MechanismStep,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import { arrowClusters, stepArrowFacts, type ArrowCluster } from "./arrow-facts.ts";
import { conservationCheck, type Violation, type ViolationFinder } from "./family.ts";

/**
 * CHECK 12. One step is one transition state, so its arrows have to be able to belong to
 * one.
 *
 * THE HOLE THIS CLOSES, IN THE SECOND PASS ADVERSARY'S WORDS.
 *
 *   "An SN2 at one carbon and an unrelated deprotonation four carbons away are drawn as one
 *   step and every check is silent. Nothing partitions a step's arrows by connected
 *   component to ask whether they plausibly belong to one transition state. This is
 *   precisely what step_not_elementary means, and that cause is currently emitted by
 *   nothing."
 *
 * chem-core has carried the cause since Phase 1: "Several separate steps are drawn as one.
 * One elementary step is one transition state. Bond formation and an unrelated proton
 * transfer are two barriers, so they are two steps, even when both are inevitable."
 * routes.ts states the same rule at the definition of `ElementaryStepKind`. Until this
 * file, no check could emit it, so the sentence was authored, reviewed, and unreachable.
 *
 * WHY EVERY OTHER CHECK IS SILENT ON THAT FIXTURE, WHICH IS WHY THIS ONE HAS TO EXIST.
 *
 * Both halves of it are individually correct chemistry. Each arrow is individually
 * drawable, so arrow legality passes them one at a time, which is what it is for. Mass,
 * charge, valence and electron flow are all sums over the whole multiset, and two correct
 * half reactions added together sum correctly. Step identity compares the declared kind
 * against the arrows and its own docstring already lists "concerted_substitution from a two
 * step sequence drawn as one" under what it cannot discriminate. Nothing anywhere asked
 * whether the arrows BELONG TOGETHER.
 *
 * THE CRITERION, AND EVERY REASON IT IS THIS CAUTIOUS.
 *
 * Two conditions, both required before a word is said:
 *
 *   1. The step's arrows fall into more than one group, where two arrows are in the same
 *      group if they share an atom, transitively. `arrowClusters` in arrow-facts.ts.
 *   2. Two groups are more than three bonds apart in the `from` state, or are in different
 *      species with no arrow joining them at all.
 *
 * Condition 1 alone would be a rule about drawing style and it is nearly, but not quite,
 * enough on its own: every genuinely concerted multi centre step draws its arrows head to
 * tail, so they share an atom at every join and come back as ONE group. E2 shares the
 * beta hydrogen and then the alpha carbon. A pericyclic step shares an atom at each corner
 * of the ring. The four centre hydroboration shares boron. Radical propagation shares the
 * hydrogen being abstracted. Concerted substitution shares the carbon under attack. That is
 * not a coincidence about this corpus, it is what a curved arrow notation for a single
 * continuous flow of electrons means.
 *
 * Condition 2 is the safety margin on top, and it is there because "nearly" is not "quite"
 * and because CLAUDE.md is explicit that a check which guesses wrong on correct chemistry
 * is the worse failure. Two events three bonds apart or closer might be sharing one
 * developing orbital array, through space or through a partial bond that no arrow was drawn
 * for, and this check says nothing about them. Three bonds is chosen because the sigma
 * framework of a six membered cyclic transition state, the largest that is common, spans at
 * most three bonds between the two ends of its reacting array; anything within that could
 * close into one ring. Widening the number weakens the check and narrowing it starts
 * guessing, so it is fixed and it is not to be adjusted to make a fixture pass either way.
 *
 * WHAT THIS DELIBERATELY DOES NOT ASSERT. Stated plainly, because a green run here is worth
 * exactly what these exclusions leave.
 *
 *   It does not assert that a step with one arrow group is elementary. A two step sequence
 *   drawn as one at the SAME centre, an addition and an elimination sharing the carbonyl
 *   carbon for instance, has one connected arrow group and passes here. That is a real
 *   blind spot and closing it needs a model of how many barriers a given array of arrows
 *   crosses, which is a different and much harder claim than the one made here.
 *
 *   It does not assert that a step with two distant groups is impossible. It asserts that
 *   nothing in the drawing connects them, so the file is claiming one barrier where it has
 *   drawn two. If a mechanism genuinely does couple two distant sites in one transition
 *   state, and some do, the remedy is to draw the arrow that couples them, and then this
 *   check goes quiet on its own without anybody editing an assertion.
 *
 *   It does not rank or read `identity.elementaryStep` at all. No kind is exempted and no
 *   kind is targeted. A `pericyclic_step` and a `proton_transfer` are held to exactly the
 *   same two conditions, because the conditions are about the arrows and the geometry
 *   rather than about the label, and a rule with a list of exempt kinds would be a rule an
 *   author could satisfy by changing a label.
 *
 *   It does not look at the `to` state. Distances are measured in `from`, where the bonds
 *   the step is about are still present, which is the same convention `periplanarity.ts`
 *   uses for the E2 torsion and for the same reason.
 *
 * WHEN IT STANDS DOWN ENTIRELY. Fewer than two arrows, nothing to partition. Any arrow
 * reference that does not resolve, because a group assembled from arrows pointing at
 * nothing is smaller than the truth and `conservation-arrow-legality` owns that finding
 * with a better message.
 */

/**
 * Bonds between two arrow groups that still leaves them able to share one transition state.
 *
 * Fixed at three. See the criterion note above for where the number comes from. This is a
 * tolerance in the same sense as the periplanarity window: loosening it to make a fixture
 * pass is a weakening, and the fixture that would need it is one whose two halves are
 * further apart than any single transition state reaches.
 */
const MAX_SEPARATION_BONDS = 3;

const CAUSE = "step_not_elementary";

/**
 * Shortest path in bonds between two atoms of one species in this state.
 *
 * Undefined when they are in different species, or in the same species but not connected.
 * Breadth first, so the first time an atom is reached is by a shortest path.
 */
function bondDistance(state: MechanismState, from: AtomId, to: AtomId): number | undefined {
  if (from === to) return 0;
  const located = findAtomInState(state, from);
  if (located === undefined) return undefined;
  const species = located.species;
  if (!species.atoms.some((atom) => atom.id === to)) return undefined;

  const seen = new Set<AtomId>([from]);
  let frontier: AtomId[] = [from];
  let distance = 0;

  while (frontier.length > 0) {
    distance += 1;
    const next: AtomId[] = [];
    for (const atomId of frontier) {
      for (const neighbourId of neighborIds(species, atomId)) {
        if (seen.has(neighbourId)) continue;
        if (neighbourId === to) return distance;
        seen.add(neighbourId);
        next.push(neighbourId);
      }
    }
    frontier = next;
  }

  return undefined;
}

/** The closest any atom of one group comes to any atom of the other. */
function separation(
  state: MechanismState,
  left: ArrowCluster,
  right: ArrowCluster,
): number | undefined {
  let best: number | undefined;
  for (const leftId of left.atomIds) {
    for (const rightId of right.atomIds) {
      const distance = bondDistance(state, leftId, rightId);
      if (distance === undefined) continue;
      if (best === undefined || distance < best) best = distance;
    }
  }
  return best;
}

/**
 * Groups merged again, this time by proximity rather than by shared atoms.
 *
 * Three groups where A is near B and B is near C but A is far from C are one array, not
 * two: the flow is continuous through B even though A and C never meet. Merging by
 * proximity first and counting afterwards is what stops that being reported as a defect.
 * Returned as indices into the original list so the failure line can still name arrows.
 */
function proximityComponents(
  state: MechanismState,
  clusters: readonly ArrowCluster[],
): readonly (readonly number[])[] {
  const componentOf = clusters.map((_, index) => index);
  const resolve = (index: number): number => {
    let root = index;
    while (componentOf[root] !== root) root = componentOf[root] as number;
    return root;
  };

  for (let left = 0; left < clusters.length; left += 1) {
    for (let right = left + 1; right < clusters.length; right += 1) {
      const distance = separation(
        state,
        clusters[left] as ArrowCluster,
        clusters[right] as ArrowCluster,
      );
      if (distance === undefined || distance > MAX_SEPARATION_BONDS) continue;
      componentOf[resolve(right)] = resolve(left);
    }
  }

  const grouped = new Map<number, number[]>();
  for (let index = 0; index < clusters.length; index += 1) {
    const root = resolve(index);
    const existing = grouped.get(root);
    if (existing === undefined) grouped.set(root, [index]);
    else existing.push(index);
  }
  return [...grouped.values()];
}

function describe(clusters: readonly ArrowCluster[], component: readonly number[]): string {
  const arrowIds: string[] = [];
  const atomIds: string[] = [];
  for (const index of component) {
    const cluster = clusters[index] as ArrowCluster;
    arrowIds.push(...cluster.arrowIds);
    atomIds.push(...cluster.atomIds);
  }
  return `arrow(s) ${arrowIds.sort().join(", ")} acting on {${atomIds.sort().join(", ")}}`;
}

function stepViolations(step: MechanismStep): readonly Violation[] {
  if (step.arrows.length < 2) return [];
  const facts = stepArrowFacts(step);
  if (!facts.allReferencesResolve) return [];

  const clusters = arrowClusters(facts);
  if (clusters.length < 2) return [];

  const components = proximityComponents(step.from, clusters);
  if (components.length < 2) return [];

  // One line, however many components there are. They are all the same finding: this
  // drawing contains more than one independent event.
  const descriptions = components.map((component) => describe(clusters, component));
  const gaps: string[] = [];
  for (let left = 0; left < components.length; left += 1) {
    for (let right = left + 1; right < components.length; right += 1) {
      const distance = separation(
        step.from,
        { arrowIds: [], atomIds: unionAtoms(clusters, components[left] as readonly number[]) },
        { arrowIds: [], atomIds: unionAtoms(clusters, components[right] as readonly number[]) },
      );
      gaps.push(
        distance === undefined
          ? `groups ${left + 1} and ${right + 1} are in different species and no arrow joins them`
          : `groups ${left + 1} and ${right + 1} are ${distance} bonds apart`,
      );
    }
  }

  return [
    {
      where: `${step.id} / ${components.length} independent groups of arrows`,
      expected:
        "the arrows of one step to describe one transition state: one continuous push of " +
        "electrons, or several that at least reach each other",
      actual:
        `they fall into ${components.length} groups that share no atom and are not near each ` +
        `other. ${descriptions.map((text, index) => `Group ${index + 1}: ${text}`).join(". ")}. ` +
        `${gaps.join("; ")}, further than the ${MAX_SEPARATION_BONDS} bonds a single cyclic ` +
        `transition state reaches. Each group is a separate barrier, so this is more than one ` +
        `elementary step drawn as one, however certain both are to happen. Draw them in ` +
        `sequence with the intermediate in between, or, if they really are coupled, draw the ` +
        `arrow that couples them`,
      cause: CAUSE,
    },
  ];
}

/** The atoms of every cluster in one component, as one set. */
function unionAtoms(
  clusters: readonly ArrowCluster[],
  component: readonly number[],
): ReadonlySet<AtomId> {
  const atomIds = new Set<AtomId>();
  for (const index of component) {
    for (const atomId of (clusters[index] as ArrowCluster).atomIds) atomIds.add(atomId);
  }
  return atomIds;
}

const find: ViolationFinder = (fixture) => {
  const violations: Violation[] = [];
  for (const step of fixture.pathway.steps) violations.push(...stepViolations(step));
  return violations;
};

export const conservationStepElementarity: Check = conservationCheck({
  name: "conservation-step-elementarity",
  description:
    "no step draws two independent events as one: its arrows form one connected push of electrons, or groups of arrows that at least come within three bonds of each other in the state the step starts from",
  find,
});
