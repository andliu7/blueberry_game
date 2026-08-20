import {
  findAtomInState,
  neighborIds,
  type AtomId,
  type MechanismState,
  type MechanismStep,
} from "@blueberry/chem-core";

import type { Check } from "../../check.ts";
import {
  arrowClusters,
  stepArrowFacts,
  type ArrowCluster,
  type StepArrowFacts,
} from "./arrow-facts.ts";
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
 * THERE ARE TWO INDEPENDENT RULES IN THIS FILE. RULE A IS THE ORIGINAL ONE AND IS ABOUT
 * ARROWS THAT DO NOT REACH EACH OTHER. RULE B IS ABOUT ARROWS THAT ALL TOUCH ONE ATOM.
 *
 * They are independent: a step can fail either without failing the other, and neither is a
 * special case of the other. Rule A asks whether the arrows are in the same place. Rule B
 * asks whether the arrows move in one direction while they are there.
 *
 * RULE A, THE CRITERION, AND EVERY REASON IT IS THIS CAUTIOUS.
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
 * RULE B, THE BOND THAT IS BROKEN AND MADE AGAIN INSIDE ONE STEP.
 *
 * Rule A's own exclusion list used to open with this sentence: "It does not assert that a
 * step with one arrow group is elementary. A two step sequence drawn as one at the SAME
 * centre, an addition and an elimination sharing the carbonyl carbon for instance, has one
 * connected arrow group and passes here." The third pass adversary took that sentence and
 * filed the fixture, and it is the one on this list that teaches wrong chemistry rather
 * than merely failing to teach right chemistry: nucleophilic acyl substitution with the
 * addition and the elimination collapsed into one step teaches a student that acyl
 * substitution has no tetrahedral intermediate, which is the single most common wrong
 * answer on that transformation.
 *
 * All four of its arrows touch the carbonyl carbon, so rule A's condition 1 is not met and
 * the check returned before the proximity test was reached. Widening rule A cannot close
 * it. Connectivity is what a genuinely concerted step LOOKS LIKE, so a rule that punished
 * connectivity would reject E2, hydroboration, and every pericyclic step in the corpus.
 *
 * THE CRITERION, WHICH IS A DIFFERENT QUESTION ABOUT THE SAME ARROWS.
 *
 *   In one elementary step, no pair of atoms both loses bonding and gains bonding.
 *
 * An arrow drawn out of a bond says that bond is coming apart on the way to the transition
 * state. An arrow drawn into the space between two atoms says a bond there is coming
 * together. One transition state is one continuous reorganisation, so each pair of atoms is
 * doing one of those two things, not both. A pair that does both has gone out and come
 * back, and the place it came back from is an intermediate, which is by definition a second
 * barrier. In the acyl fixture the pair is the carbonyl carbon and its oxygen: arrow a2
 * pushes the C=O pi bond onto the oxygen, and arrow a3 pushes it straight back. The
 * tetrahedral intermediate is the state between those two arrows, and it is exactly the
 * species the fixture declines to write down.
 *
 * WHY THIS DOES NOT FIRE ON CONCERTED CHEMISTRY, WHICH IS THE THING THAT MATTERS MOST.
 *
 * Every concerted mechanism in the corpus moves electrons through a pair once and in one
 * direction. SN2 forms one bond and breaks another and they are different pairs. E2 breaks
 * C-H, forms C=C, breaks C-LG: three pairs, three single directions. Hydroboration's four
 * centre array breaks B-H and C=C while forming H-C and C-B: four pairs, one direction
 * each. A pericyclic step alternates around a ring and no bond in the ring is touched
 * twice. Radical propagation abstracts and forms at different pairs. This is not a
 * coincidence about this corpus either: a curved arrow that leaves a bond and a curved
 * arrow that arrives at the same bond, in the same drawing, are two statements about that
 * bond's fate that cannot both describe one continuous motion.
 *
 * Two shapes that look adjacent to this and are deliberately NOT caught. Two arrows out of
 * ONE bond, which is how the corpus draws homolysis, is two breaks and no form: both
 * arrows point the same way, so nothing has come back. And one single arrow whose source
 * bond and whose sink pair are the same two atoms is an arrow that declares no change,
 * which `conservation-arrow-legality` already owns with a better message, so the break and
 * the form are required to come from DIFFERENT arrows before a word is said here.
 *
 * WHAT RULE B DOES NOT ASSERT. This is a narrow, decidable signature of a round trip, not
 * a barrier model. It says nothing about how many barriers an arbitrary array of arrows
 * crosses, because answering that in general needs a model of transition state energies
 * that chem-core does not have and that this package is not the place to invent. A
 * collapsed two step sequence whose two halves happen to touch no common pair twice is
 * still missed, and so is any collapse whose second half acts on bonds the first half never
 * touched. Rule B also says nothing about the ORDER of the arrows, since a drawing has no
 * order, and nothing about the net change on the pair: a bond that ends at the order it
 * started is caught for the same reason as one that does not, because the finding is the
 * round trip and not the arithmetic.
 *
 * WHAT THIS DELIBERATELY DOES NOT ASSERT. Stated plainly, because a green run here is worth
 * exactly what these exclusions leave.
 *
 *   It does not assert that a step with one arrow group and no round tripped bond is
 *   elementary. Rule B closes the shape the second pass adversary predicted and the third
 *   pass adversary filed, and it closes it by naming one decidable signature rather than by
 *   deciding the general question. The general question is still open and still needs a
 *   model of how many barriers a given array of arrows crosses.
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

/** An unordered pair of atom ids, as one stable key. */
function pairKey(left: AtomId, right: AtomId): string {
  return left < right ? `${left}|${right}` : `${right}|${left}`;
}

function pairLabel(key: string): string {
  return key.split("|").join("-");
}

/**
 * Rule B. Pairs of atoms this step's arrows both pull apart and push together.
 *
 * A bond source contributes the break, at the pair the bond joins. A `betweenAtoms` sink
 * contributes the form, at the pair it names. An `atom` sink contributes neither: those
 * electrons localise on one atom rather than bonding a pair. Lone pair and single electron
 * sources contribute no break for the same reason.
 *
 * The break and the form have to come from different arrows. One arrow whose bond source
 * and whose `betweenAtoms` sink are the same two atoms is an arrow that declares no change,
 * which `conservation-arrow-legality` reports with a message about that arrow rather than
 * about this step.
 */
interface RoundTrippedPair {
  /** The atom pair, as a stable key. Rendered through `pairLabel`. */
  readonly key: string;
  /** Arrows drawing electrons out of the bond at that pair. */
  readonly broken: readonly string[];
  /** Arrows drawing electrons into a bond at that pair. */
  readonly formed: readonly string[];
}

function roundTrippedPairs(facts: StepArrowFacts): readonly RoundTrippedPair[] {
  const broken = new Map<string, string[]>();
  const formed = new Map<string, string[]>();

  for (const resolved of facts.arrows) {
    if (!resolved.resolves) continue;
    const arrowId = resolved.arrow.id;
    const bond = resolved.sourceBond;
    if (bond !== undefined) {
      const key = pairKey(bond.a, bond.b);
      broken.set(key, [...(broken.get(key) ?? []), arrowId]);
    }
    if (resolved.arrow.sink.kind === "betweenAtoms") {
      const key = pairKey(resolved.arrow.sink.atomIds[0], resolved.arrow.sink.atomIds[1]);
      formed.set(key, [...(formed.get(key) ?? []), arrowId]);
    }
  }

  const found: RoundTrippedPair[] = [];
  for (const [key, breakers] of broken) {
    const makers = formed.get(key);
    if (makers === undefined) continue;
    // Different arrows, not one arrow declaring no change. See the note above.
    if (!breakers.some((arrowId) => makers.some((other) => other !== arrowId))) continue;
    found.push({ key, broken: [...breakers].sort(), formed: [...makers].sort() });
  }

  found.sort((left, right) => left.key.localeCompare(right.key));
  return found;
}

function roundTripViolations(
  step: MechanismStep,
  facts: StepArrowFacts,
): readonly Violation[] {
  return roundTrippedPairs(facts).map((pair) => ({
    where: `${step.id} / bond ${pairLabel(pair.key)} both broken and made again`,
    expected:
      "each pair of atoms in one step to be doing one thing: coming apart, or coming " +
      "together. One transition state is one continuous reorganisation",
    actual:
      `arrow(s) ${pair.broken.join(", ")} push electrons OUT of the bond between ` +
      `${pairLabel(pair.key)} and arrow(s) ${pair.formed.join(", ")} push electrons back ` +
      `INTO it, in the same step. That bond goes away and comes back, so the drawing passes ` +
      `through a structure it never writes down, and that structure is an intermediate ` +
      `between two barriers. This is the addition and elimination of an addition elimination ` +
      `collapsed into one step: at a carbonyl it is the tetrahedral intermediate, and a step ` +
      `drawn this way teaches that the intermediate does not exist. Draw the two barriers in ` +
      `sequence with the intermediate between them. Nothing here objects to the arrows ` +
      `sharing an atom, which is what a genuinely concerted step looks like, only to the same ` +
      `pair being taken apart and put back`,
    cause: CAUSE,
  }));
}

function stepViolations(step: MechanismStep): readonly Violation[] {
  if (step.arrows.length < 2) return [];
  const facts = stepArrowFacts(step);
  if (!facts.allReferencesResolve) return [];

  const violations: Violation[] = [...roundTripViolations(step, facts)];

  const clusters = arrowClusters(facts);
  if (clusters.length < 2) return violations;

  const components = proximityComponents(step.from, clusters);
  if (components.length < 2) return violations;

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

  violations.push({
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
  });

  return violations;
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
