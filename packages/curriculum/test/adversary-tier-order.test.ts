/**
 * ADVERSARY FINDING: a distractor that is a notation-only variant of the correct
 * answer is silently accepted by `createProblem`, and it can never fire.
 *
 * grading.ts's own header poses this exact question and leaves it unresolved:
 * "A distractor whose state is a notation variant of the correct answer: does
 * createProblem catch it, or does it sit as a trap that captures correct
 * students?"
 *
 * The tier order in grading.ts is fixed: a notation cause (wrong significant
 * figures, a missing unit, and so on) is checked BEFORE any authored distractor,
 * on every reading of CLAUDE.md's refinement. That means a distractor whose own
 * state differs from the correct answer only in notation (same value, fewer or
 * more significant figures) can never be reached by ANY submission: the moment a
 * student's submission lands on that exact state, `checkAnswer` reports the
 * notation cause first and `gradeAttempt` returns before the distractor list is
 * even walked.
 *
 * `createProblem` refuses a distractor that grades "correct" and refuses two
 * distractors that collide with each other, but it does not refuse a distractor
 * that is provably unreachable for this reason. The result is authoring effort
 * that teaches nobody, and a distractor count that overstates how much Tier 2
 * coverage a problem actually has.
 */

import { describe, expect, it } from "vitest";
import { createNumericAnswer } from "../src/answers/numeric.ts";
import { gradeAttempt } from "../src/grading.ts";
import { createProblem } from "../src/problem.ts";

describe("a distractor that is a notation variant of the correct answer", () => {
  const answer = createNumericAnswer({ text: "2.00", unit: "atm" });

  const buildWithDeadDistractor = () =>
    createProblem({
      id: "adversary-dead-distractor",
      course: "gen_chem_1",
      topic: "gas_laws",
      difficulty: 800,
      prompt: "What is the pressure.",
      answer,
      solution: {
        whatHappened: "The pressure is 2.00 atm.",
        why: "This is fixture text standing in for real chemistry.",
        lookAt: "The value and the unit together.",
      },
      distractors: [
        {
          // Same value and unit as the correct answer, written with one fewer
          // significant figure. `checkAnswer` grades this "wrong" with cause
          // "significant_figures_too_few", so `createProblem`'s "does this
          // distractor grade correct" refusal does not catch it.
          id: "same-value-fewer-sig-figs",
          state: { kind: "numeric", text: "2.0", unit: "atm" },
          explanation: {
            whatHappened: "This writes the pressure with only two significant figures.",
            why: "The starting data supports three figures, and two undercounts the precision.",
            lookAt: "Count the figures in every measurement that went into the answer.",
          },
        },
      ],
    });

  it("is accepted by createProblem today, which is the defect", () => {
    // This is the failing assertion: an unreachable distractor should be
    // refused at authoring time, the same way a same-point collision between
    // two distractors is refused. It is not refused today.
    expect(buildWithDeadDistractor).toThrow(/never|unreachable|notation/i);
  });

  it("demonstrates the distractor can never fire, regardless of the authoring refusal", () => {
    // Build without going through the (currently absent) refusal above, so the
    // reachability claim itself is verified directly against gradeAttempt.
    const problem = createProblem({
      id: "adversary-dead-distractor-direct",
      course: "gen_chem_1",
      topic: "gas_laws",
      difficulty: 800,
      prompt: "What is the pressure.",
      answer,
      solution: {
        whatHappened: "The pressure is 2.00 atm.",
        why: "This is fixture text standing in for real chemistry.",
        lookAt: "The value and the unit together.",
      },
      distractors: [
        {
          id: "same-value-fewer-sig-figs",
          state: { kind: "numeric", text: "2.0", unit: "atm" },
          explanation: {
            whatHappened: "This writes the pressure with only two significant figures.",
            why: "The starting data supports three figures, and two undercounts the precision.",
            lookAt: "Count the figures in every measurement that went into the answer.",
          },
        },
      ],
    });

    // A student submits exactly the distractor's own state.
    const result = gradeAttempt(problem, { kind: "numeric", text: "2.0", unit: "atm" });

    // The distractor's author-written explanation is never what the student
    // sees: the generic notation cause pre-empts it every time, silently.
    expect(result.kind).not.toBe("matched_distractor");
    expect(result.kind).toBe("named_cause");
    if (result.kind === "named_cause") {
      expect(result.cause).toBe("significant_figures_too_few");
    }
  });
});
