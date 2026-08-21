/**
 * ADVERSARY FINDING: claiming the DAT or MCAT course at the placement quiz
 * violates the quiz's own documented invariant, and a student who correctly
 * claims a course they are entitled to claim gets no starting point at all.
 *
 * `CourseId` in placement.ts includes "dat" and "mcat", and
 * `QuizConfig.claimedCourse` in quiz/machine.ts accepts any `CourseId`. But every
 * entry in the 46 row `TOPICS` registry has a home `course` of "gen_chem_1",
 * "gen_chem_2", "orgo_1" or "orgo_2": nothing is filed under "dat" or "mcat".
 * `topicIdsForCourse("dat")` and `topicIdsForCourse("mcat")` are therefore always
 * empty, independent of how many problems the corpus carries tagged with those
 * courses.
 *
 * `nextProbe` in quiz/machine.ts walks `courseTopics(course)` to find the first
 * question. When that list is empty and the backlog is empty (which it always is
 * on the first question), `nextProbe` returns `problem: null` immediately, and
 * `createQuiz` finishes the quiz having asked zero questions.
 *
 * `Recommendation.startTopics`'s own doc comment in quiz/machine.ts reads:
 * "Never empty; a student who missed everything starts at the course's first
 * topic, which is a starting point and not a judgement." For "dat" and "mcat"
 * this promise does not hold: `startTopics` comes back empty, `questionsAsked`
 * is 0, and the generated copy reads "the fastest route to the material you are
 * aiming for runs through 0 topics worth firming up first", which is not a
 * sentence a student can act on.
 *
 * curriculum-quiz.ts's own validator check never catches this: its course list
 * is `["gen_chem_1", "gen_chem_2", "orgo_1", "orgo_2", null]`, which omits both
 * "dat" and "mcat" even though both are valid `CourseId` values a real onboarding
 * flow can send.
 */

import { describe, expect, it } from "vitest";
import { SEED_CORPUS } from "../src/corpus/index.ts";
import { createQuiz } from "../src/quiz/machine.ts";
import { topicIdsForCourse } from "../src/placement.ts";

describe("claiming a course the topic registry never assigns any topic to", () => {
  it("has zero topics for dat and mcat in the pathway registry, which is what makes the walk break", () => {
    // This half is not the bug by itself: it is the precondition that produces
    // the bug below. Recorded here so the cause is not left implicit.
    expect(topicIdsForCourse("dat")).toEqual([]);
    expect(topicIdsForCourse("mcat")).toEqual([]);
  });

  it.each(["dat", "mcat"] as const)(
    "gives claimedCourse %s a non-empty starting frontier, per the recommendation's own contract",
    (course) => {
      const quiz = createQuiz({ problems: SEED_CORPUS, claimedCourse: course });

      expect(quiz.phase).toBe("finished");
      expect(quiz.recommendation).not.toBeNull();

      // This is the failing assertion. quiz/machine.ts's own Recommendation
      // doc comment says startTopics is "Never empty", and today it is empty
      // for both DAT and MCAT.
      expect(quiz.recommendation?.startTopics.length ?? 0).toBeGreaterThan(0);
    },
  );

  it("produces copy that names a topic count rather than the nonsensical zero", () => {
    const quiz = createQuiz({ problems: SEED_CORPUS, claimedCourse: "dat" });
    // Today this reads "...runs through 0 topics worth firming up first.",
    // which is the visible symptom of the empty startTopics list above.
    expect(quiz.recommendation?.copy ?? "").not.toMatch(/\b0 topics\b/);
  });
});
