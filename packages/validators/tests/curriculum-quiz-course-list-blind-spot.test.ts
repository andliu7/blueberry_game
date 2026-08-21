import { describe, expect, it } from "vitest";

import type { CheckContext } from "../src/check.ts";

/**
 * ADVERSARY FINDING, Phase 3, attack surface 3 (the quiz walk) and attack
 * surface 6 (what a check structurally misses).
 *
 * curriculum-quiz.ts's own fleet loop reads:
 *
 *   const courses = ["gen_chem_1", "gen_chem_2", "orgo_1", "orgo_2", null] as const;
 *
 * `CourseId` in packages/curriculum/src/placement.ts has six members: those four,
 * plus "dat" and "mcat". The check never simulates a fleet for either of the two
 * it omits, so a defect that only shows up for those two claims is invisible to
 * this check by construction, no matter how many fixtures sit in fixtures/: the
 * course list is a literal array in the check's own source, which is outside
 * this adversary's write scope, the same shape of blind spot
 * feedback-copy-coverage.test.ts documents for a different check.
 *
 * The defect that list is blind to is real and is pinned down at the curriculum
 * layer in packages/curriculum/test/adversary-quiz-course-coverage.test.ts:
 * claiming "dat" or "mcat" at the placement quiz finishes the quiz having asked
 * zero questions and returns `startTopics: []`, which contradicts
 * `Recommendation.startTopics`'s own "Never empty" doc comment in
 * quiz/machine.ts. Every `CourseId` the registry admits is a value a real
 * onboarding flow can send, per QuizConfig.claimedCourse's own type.
 *
 * WHY THIS IS A PASSING TEST AND NOT A RED ONE, STATED RATHER THAN LEFT
 * IMPLICIT, per the brief's own instruction to say so when a control cannot be
 * built. feedback-copy-coverage.test.ts's check reads its subject through an
 * import this suite can `vi.mock`, so a fake cause id there makes the real check
 * genuinely fail. This check's course list is a plain array literal written
 * inside packages/validators/src/checks/curriculum/quiz.ts itself, never derived
 * from `@blueberry/curriculum` or from anything else this test can intercept.
 * Mocking `@blueberry/curriculum` changes what the check would see IF it asked
 * about "dat" or "mcat"; it cannot make the check ask about them, because which
 * courses to ask about is not data the check reads, it is code the check
 * contains. There is no fixture and no mock inside
 * packages/validators/fixtures/ or packages/validators/tests/ that can add
 * "dat" and "mcat" to that array, and widening this adversary's write scope to
 * quiz.ts itself is the boundary CLAUDE.md's git discipline section draws.
 *
 * So this test runs the REAL, unmodified `curriculumQuiz` check against the REAL
 * built `@blueberry/curriculum` package and shows it reports SUITE: PASS while
 * the broken walk above is reachable from the same corpus the check just
 * exercised. That is the blind spot stated as a fact about the shipped check,
 * not reconstructed from a description of it, and a passing assertion is the
 * honest way to record a check that is structurally incapable of seeing its own
 * gap.
 */

const emptyContext: CheckContext = {
  repoRoot: "",
  packageRoot: "",
  fixturesDir: "",
  fixtures: [],
};

describe("curriculum-quiz, a check whose course fleet list omits two valid CourseId values", () => {
  it("passes today even though claiming dat or mcat breaks the walk it exists to guard", async () => {
    const { curriculumQuiz } = await import("../src/checks/curriculum/quiz.ts");
    const curriculum = await import("@blueberry/curriculum");

    const result = await curriculumQuiz.run(emptyContext);

    // The check the suite actually runs: green, because "dat" and "mcat" are
    // never in its course list.
    expect(result.status).toBe("pass");

    // The same corpus, walked with a course the check never tries, breaks the
    // "Never empty" contract the check's own description claims to guard
    // ("the placement quiz reaches a recommendation for every simulated
    // student inside the question cap and the modelled 180 second budget").
    // A recommendation with zero start topics is not a recommendation a
    // student can act on, and nothing about the check catches it.
    const quiz = curriculum.createQuiz({ problems: curriculum.SEED_CORPUS, claimedCourse: "dat" });
    expect(quiz.phase).toBe("finished");
    expect(quiz.recommendation?.startTopics.length ?? 0).toBe(0);
  });
});
