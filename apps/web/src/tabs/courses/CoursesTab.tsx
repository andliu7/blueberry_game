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
import { Pill } from "../../app/ui/Card";
import { hrefForTab } from "../../app/routes";
import { COURSE_COMING, isCourseOpen } from "../../app/courses";
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

/**
 * The two or three characters that stand in for a course on a list row.
 *
 * WHY A MARK AT ALL. The reference course picker gives every option a big flat
 * emblem, and it does that whether or not the option is one a learner can take:
 * the grid reads as a shelf of objects and the eye lands on a shape before it
 * lands on a word. Ours was six paragraphs of text under a heading, which is a
 * settings page. A monogram is the honest local version of that flag: it is
 * this product's own mark, it needs no asset, and it says the same thing at
 * 48px that the course name says at 16.
 *
 * Not an icon per course, because the six differ by SUBJECT and not by object,
 * and six invented pictograms for "General Chemistry I" against "General
 * Chemistry II" would be six shapes a student has to learn before the list is
 * faster than the words already were.
 */
const COURSE_MARK: Record<CourseId, string> = {
  gen_chem_1: "G1",
  gen_chem_2: "G2",
  orgo_1: "O1",
  orgo_2: "O2",
  dat: "DAT",
  mcat: "MCAT",
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

/**
 * `?serveAll=1` lifts the gate for the capture scripts and nothing else. No
 * served topic has three problems today, so the combo interstitial at three
 * in a row is unreachable through the gate by real clicks; the gated gas law
 * questions are the shortest real path to it. This widens WHICH authored
 * problems are served, never how one is graded, the same family as
 * App.tsx's ?measure flag. See measurements/capture-economy.mjs.
 */
const SERVE_ALL =
  typeof window !== "undefined" && new URLSearchParams(window.location.search).get("serveAll") === "1";

export function problemsForTopic(topic: TopicId): readonly Problem[] {
  return SEED_CORPUS.filter((problem) => problem.topic === topic && (SERVE_ALL || SERVED_KINDS.has(problem.answer.kind)));
}

/**
 * The course list, one open course and five greyed.
 *
 * WHY A GREYED CARD AND NOT A MISSING ONE. Owner amendment of 2026-08-28: the
 * closed courses "render greyed with an honest coming treatment, never a dead
 * end and never a broken link". A student who was told this app covers General
 * Chemistry and finds no mention of it concludes the app lied; one who finds a
 * card saying what it is waiting on concludes it is being built. Same reasoning
 * as app/ui/NotOpenYet.tsx, one layer down.
 *
 * THE OPEN ONE LEADS, AND IT IS NOT A SIXTH OF THE SCREEN. Round one drew all
 * six as equal cards in source order, which put the one course a student can
 * actually open fourth, in white, surrounded by five larger-looking greyed ones.
 * That is the hierarchy exactly backwards: the loudest thing on the screen was
 * the part of the product that does not exist yet. So this is two sections and
 * not one grid. The open course is a full width card with the primary border
 * and the entry action on it; the five are a compact list underneath, under a
 * heading that says what they are. mobile-ui's rule that a section extends in
 * one direction only is satisfied by both halves.
 *
 * WHAT "GREYED" MEANS MECHANICALLY, and it is not `opacity: 0.6` on the whole
 * row. Fading a row fades its text with it, and text under an opacity is text
 * that quietly stops meeting the contrast floor in the Budgets table. So a
 * closed row keeps full strength ink and drops the two things that say
 * PRESSABLE: it is a <div> and not an <a>, and it is a dashed outline on the
 * page ground rather than a raised card. What is greyed is the affordance.
 *
 * Each closed row is still announced as unavailable through `aria-disabled`,
 * and the coming line is the accessible reason.
 */
function CourseList() {
  const snapshot = useProgress();
  const open = ALL_COURSE_IDS.filter((course) => isCourseOpen(course));
  const closed = ALL_COURSE_IDS.filter((course) => !isCourseOpen(course));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 pb-10 md:p-6">
      <div className="flex flex-col gap-1">
        <h1 className="title-face text-scale-2xl font-bold text-foreground">Courses</h1>
        <p className="text-scale-sm text-muted-foreground">
          One is open. The other five are scoped, and they arrive in the order below.
        </p>
      </div>

      {open.map((course) => {
        const topics = probeTopicIdsForCourse(course);
        const done = topics.filter((topic) => snapshot.lessons[topic] !== undefined).length;
        return (
          <a key={course} href={hrefForTab("courses", course)} className="press block">
            {/* The primary border, and it is the only one on the screen. A card
                that is the single thing you can press should say so with the
                colour the rest of the app uses for "you are here". */}
            <div className="flex flex-col gap-3 rounded-2xl border-2 border-[color:var(--primary-ink)] bg-card p-5">
              {/* THE EMBLEM SITS BESIDE THE NAME AND NOTHING ELSE SHARES THAT
                  ROW. At 390px the mark takes 56 of the card's width and the
                  status pill took another 90, which left "Organic Chemistry II"
                  about 150px and broke it over two lines with the pill floating
                  beside the first. The pill is a status, so it belongs on the
                  status row at the bottom with the count it qualifies. */}
              <div className="flex items-center gap-3">
                {/* THE DISC CARRIES THE COLOUR AND THE MARK RECEDES INTO IT.
                    Same object and same reasoning as app/ui/NotOpenYet.tsx and
                    the Me tab's rows: colour appears as a SURFACE, per sticker
                    rules 5 and 6, and a purple monogram on a purple tint would
                    be the palette twice and the surface never. The outline is
                    the one place the hue is allowed to be line work, because
                    that is what says the object is pressable. */}
                <span
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 border-[color:var(--primary-ink)] bg-[color:var(--tab-active)] font-bold text-foreground ${
                    COURSE_MARK[course].length > 2 ? "text-scale-sm" : "text-scale-lg"
                  }`}
                >
                  {COURSE_MARK[course]}
                </span>
                <h2 className="title-face min-w-0 flex-1 text-scale-xl font-bold leading-tight text-foreground">
                  {COURSE_LABEL[course]}
                </h2>
              </div>
              <p className="text-scale-sm text-muted-foreground">{COURSE_BLURB[course]}</p>
              {/* NO BUTTON INSIDE THE CARD. The whole card is the link, and a
                  filled pill inside a link is a control inside a control: two
                  press targets for one action, and mobile-ui's "do not nest"
                  applied to affordances rather than to padding. It is also what
                  the reference course picker does, which is nothing: the tile
                  IS the button. */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-scale-xs font-semibold text-muted-foreground">
                  {done} of {topics.length} topics done
                </span>
                {snapshot.course === course ? <Pill tone="primary">Your track</Pill> : null}
              </div>
            </div>
          </a>
        );
      })}

      <section className="flex flex-col gap-2">
        <h2 className="text-scale-xs font-bold uppercase tracking-wide text-muted-foreground">Being authored</h2>
        {closed.map((course) => (
          <div
            key={course}
            aria-disabled
            className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-border px-4 py-3"
          >
            {/* The same emblem, neutral rather than coloured, and its edge stays
                SOLID while the row's goes dashed. The dashed outline is the one
                thing on the row that says "not yet", and repeating it on the
                mark inside made the mark read as a ghost of an emblem rather
                than as the course's emblem. What is greyed is the affordance,
                which is the row; the identity is still an object. */}
            <span
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 border-border bg-muted font-bold text-muted-foreground ${
                COURSE_MARK[course].length > 2 ? "text-scale-xs" : "text-scale-sm"
              }`}
            >
              {COURSE_MARK[course]}
            </span>
            <div className="flex min-w-0 flex-1 flex-col gap-1">
            {/* The name is --muted-foreground, and that is a measured choice
                rather than a fade. It is 8.5:1 on this ground in light and
                6.9:1 in dark, both well over the AA floor, so the row is
                legible at full strength while reading as inactive. What is NOT
                done is an opacity over the card: an opacity multiplies the
                contrast of everything under it, and a row that is quietly
                below the floor is worse than a row that is loud. */}
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="title-face text-scale-base font-semibold text-muted-foreground">{COURSE_LABEL[course]}</h3>
              <span className="shrink-0 text-scale-xs font-semibold text-muted-foreground">Soon</span>
            </div>
            <p className="text-scale-xs text-muted-foreground">{COURSE_COMING[course]}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

/**
 * What `#/courses/gen_chem_1` renders. Not a 404 and not an empty topic list.
 *
 * The link is gone from the list above, but the route is not, and a hash a
 * student typed or kept in a bookmark has to land somewhere true. It also
 * catches the one case the list cannot: a placement that recommended a course
 * before that course was authored.
 */
function CourseComingSoon({ course }: { readonly course: CourseId }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-10 text-center md:py-16">
      <span className="rounded-full border-2 border-border bg-muted px-3 py-1 text-scale-xs font-bold text-muted-foreground">
        Being authored
      </span>
      <h1 className="title-face text-scale-2xl font-bold text-foreground">{COURSE_LABEL[course]}</h1>
      <p className="text-scale-base text-muted-foreground">{COURSE_BLURB[course]}</p>
      <p className="text-scale-sm font-medium text-muted-foreground">{COURSE_COMING[course]}</p>
      <a
        href={hrefForTab("courses", "orgo_2")}
        className="press mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-5 text-scale-base font-semibold text-primary-foreground"
      >
        Open Organic Chemistry II
      </a>
      <a href={hrefForTab("courses")} className="press inline-flex min-h-11 items-center text-scale-sm font-semibold text-muted-foreground">
        All courses
      </a>
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
  // A closed course resolves to its own honest screen at every depth, so
  // #/courses/gen_chem_1 and #/courses/gen_chem_1/gas_laws both land somewhere
  // true rather than on an empty list or a lesson with no problems in it.
  if (!isCourseOpen(courseParam)) return <CourseComingSoon course={courseParam} />;
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
