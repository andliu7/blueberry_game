/**
 * Courses: the six in CLAUDE.md, each opening to its topics, each topic
 * opening to a lesson over the corpus problems authored for it.
 *
 * The route carries the drill down (#/courses, #/courses/orgo_2,
 * #/courses/orgo_2/aromaticity) so a refresh or a shared link lands on the
 * same screen. DAT and MCAT home no topics by design (placement.ts), so they
 * list every content course's topics through probeTopicIdsForCourse, which is
 * the same rule the placement quiz uses.
 *
 * Free tier: the introductory lessons are free and never gated. Nothing here
 * checks an entitlement, and nothing here should: the paid gate is server side
 * in Phase 6 and the only client side mention of it is the soft card at the
 * end of onboarding.
 */

import { useMemo } from "react";
import {
  ALL_COURSE_IDS,
  SEED_CORPUS,
  probeTopicIdsForCourse,
  topicDefinition,
  type CourseId,
  type Problem,
  type TopicId,
} from "@blueberry/curriculum";
import { Card, Pill } from "../../app/ui/Card";
import { hrefForTab } from "../../app/routes";
import { navigate } from "../../app/useHashRoute";
import { useProgress } from "../../app/hooks";
import { LessonPlayer } from "../../lesson/LessonPlayer";

export const COURSE_LABEL: Record<CourseId, string> = {
  gen_chem_1: "General Chemistry I",
  gen_chem_2: "General Chemistry II",
  orgo_1: "Organic Chemistry I",
  orgo_2: "Organic Chemistry II",
  dat: "DAT preparation",
  mcat: "MCAT preparation",
};

export const COURSE_BLURB: Record<CourseId, string> = {
  gen_chem_1: "Stoichiometry, gas laws, thermochemistry, and the habits of a correct number.",
  gen_chem_2: "Kinetics, equilibrium, acids and bases, titration curves, electrochemistry.",
  orgo_1: "Structure, stereochemistry, substitution and elimination, the first mechanisms.",
  orgo_2: "Spectroscopy first, then aromatics, the acyl ladder, enolates. The flagship.",
  dat: "A review track over all four courses, weighted to what the DAT asks.",
  mcat: "The same review, weighted to the MCAT's chemistry and biochemistry overlap.",
};

function isCourseId(value: string): value is CourseId {
  return (ALL_COURSE_IDS as readonly string[]).includes(value);
}

/**
 * Question kinds a lesson serves TODAY. Owner ruling, 2026-08-26: no fill-in
 * the-blank or multiple choice for now; reactions and concept work only, at
 * the easy level, with the longer stoichiometry problems returning when the
 * full Alchemie-style stoichiometry features exist (the unit-cancellation
 * keyboard and equation surfaces in the video corpus). The authored MCQ and
 * numeric corpus stays; it is gated, not deleted.
 */
const SERVED_KINDS = new Set(["major_product", "reagents", "structure"]);

export function problemsForTopic(topic: TopicId): readonly Problem[] {
  return SEED_CORPUS.filter((problem) => problem.topic === topic && SERVED_KINDS.has(problem.answer.kind));
}

function CourseList() {
  const snapshot = useProgress();
  return (
    <div className="mx-auto grid max-w-3xl gap-3 p-4 md:grid-cols-2 md:p-6">
      {ALL_COURSE_IDS.map((course) => {
        const topics = probeTopicIdsForCourse(course);
        const done = topics.filter((topic) => snapshot.lessons[topic] !== undefined).length;
        return (
          <a key={course} href={hrefForTab("courses", course)} className="press block">
            <Card className="flex h-full flex-col gap-2">
              <div className="flex items-center justify-between">
                <h2 className="title-face text-scale-lg font-semibold">{COURSE_LABEL[course]}</h2>
                {snapshot.course === course ? <Pill tone="primary">Your track</Pill> : null}
              </div>
              <p className="text-scale-sm text-muted-foreground">{COURSE_BLURB[course]}</p>
              <p className="mt-auto text-scale-xs text-muted-foreground">
                {done} of {topics.length} topics done
              </p>
            </Card>
          </a>
        );
      })}
    </div>
  );
}

function TopicList({ course }: { readonly course: CourseId }) {
  const snapshot = useProgress();
  const topics = useMemo(() => probeTopicIdsForCourse(course), [course]);
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-3 p-4 md:p-6">
      <a href={hrefForTab("courses")} className="press inline-flex min-h-11 items-center text-scale-sm font-semibold text-muted-foreground">
        ← All courses
      </a>
      <h2 className="title-face text-scale-2xl font-semibold">{COURSE_LABEL[course]}</h2>
      <p className="text-scale-sm text-muted-foreground">{COURSE_BLURB[course]}</p>
      <ol className="flex flex-col gap-2">
        {topics.map((topic, index) => {
          const definition = topicDefinition(topic);
          const count = problemsForTopic(topic).length;
          const record = snapshot.lessons[topic];
          return (
            <li key={topic}>
              <a
                href={count > 0 ? hrefForTab("courses", course, topic) : undefined}
                aria-disabled={count === 0}
                className={`press flex min-h-14 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-2 ${count === 0 ? "opacity-60" : ""}`}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-scale-xs font-bold ${
                    record !== undefined ? "bg-good-soft text-good-ink" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {record !== undefined ? "✓" : index + 1}
                </span>
                <span className="flex-1">
                  <span className="block text-scale-base font-medium">{definition.label}</span>
                  <span className="block text-scale-xs text-muted-foreground">
                    {count === 0 ? "Problems not yet authored" : `${count} problem${count === 1 ? "" : "s"}`}
                    {definition.course !== course ? ` · from ${COURSE_LABEL[definition.course]}` : ""}
                  </span>
                </span>
                {record !== undefined ? (
                  <span className="text-scale-xs text-muted-foreground">
                    {record.correct}/{record.attempted}
                  </span>
                ) : null}
              </a>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function CoursesTab({ rest, reducedMotion }: { readonly rest: readonly string[]; readonly reducedMotion: boolean }) {
  const courseParam = rest[0];
  const topicParam = rest[1];

  if (courseParam === undefined || !isCourseId(courseParam)) return <CourseList />;
  if (topicParam === undefined) return <TopicList course={courseParam} />;

  let topic: TopicId;
  try {
    topic = topicDefinition(topicParam as TopicId).id;
  } catch {
    return <TopicList course={courseParam} />;
  }
  return (
    <LessonPlayer
      key={topic}
      topic={topic}
      problems={problemsForTopic(topic)}
      reducedMotion={reducedMotion}
      onExit={() => navigate(hrefForTab("courses", courseParam))}
    />
  );
}
