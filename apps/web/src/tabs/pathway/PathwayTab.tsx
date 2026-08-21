/**
 * The pathway: the Duolingo shaped track, with
 * docs/reference/competitors/orgosolver-03-skill-tree-progression.png as the
 * committed worked example. Nodes on a winding vertical track, five states
 * (done, current, open, review, locked), one legend.
 *
 * WHERE THE SHAPE COMES FROM. TOPICS in the curriculum package carries the
 * prerequisite edges, and placement.ts documents that this tab renders them
 * forward as unlock gates. So the graph here is content, read straight from
 * the package, and never authored twice.
 *
 * WHERE THE STATE COMES FROM, and the rule that governs it. Unlock state is
 * progress, enforced server side per CLAUDE.md; the client renders it and
 * never decides it. Today the local progress store is the only source, and
 * the derivation below is the rendering rule Phase 6's server will apply to
 * the real attempt history: a topic is done when its lesson is complete or it
 * sits before the placement frontier, open when every prerequisite is done,
 * current when it is the first open topic in order, locked otherwise. Review
 * nodes are topics whose lesson was completed under three quarters correct,
 * which is the spaced repetition seam (the Anki borrow) until Phase 6 gives
 * it a real scheduler over attempts.
 *
 * Mechanism cycles are unlockables on this track. The trainer's demo step is
 * linked from the first organic topic that has mechanisms, so the pathway
 * leads into the crown jewel rather than around it.
 */

import { useMemo } from "react";
import {
  prerequisiteClosure,
  probeTopicIdsForCourse,
  topicDefinition,
  type CourseId,
  type TopicId,
} from "@blueberry/curriculum";
import { Card, Pill } from "../../app/ui/Card";
import { Press } from "../../app/ui/Press";
import { hrefForTab } from "../../app/routes";
import { navigate } from "../../app/useHashRoute";
import { useProgress } from "../../app/hooks";
import { progress, type ProgressSnapshot } from "../../app/progress";
import { Berry } from "../../mascot/Berry";
import { COURSE_LABEL, problemsForTopic } from "../courses/CoursesTab";

export type NodeState = "done" | "current" | "open" | "review" | "locked";

export interface PathwayNode {
  readonly topic: TopicId;
  readonly label: string;
  readonly state: NodeState;
  readonly problemCount: number;
  readonly homeCourse: CourseId;
}

/** The rendering rule. Pure, so it can be unit tested without React. */
export function derivePathway(course: CourseId, snapshot: ProgressSnapshot): readonly PathwayNode[] {
  const topics = probeTopicIdsForCourse(course);
  const frontier = new Set(snapshot.startTopics);
  // Everything strictly before the frontier is assumed placed-out-of: a topic
  // is "before" the frontier when it is a prerequisite of a frontier topic.
  const placedOut = new Set<TopicId>();
  for (const start of frontier) for (const pre of prerequisiteClosure(start)) placedOut.add(pre);

  const isDone = (topic: TopicId) => snapshot.lessons[topic] !== undefined || placedOut.has(topic);
  // A prerequisite homed outside this track (an Organic I topic gating the
  // first Organic II node) is assumed met unless the placement frontier said
  // otherwise, or the whole track would be locked on arrival. Inside the
  // track, prerequisites are real gates.
  const inTrack = new Set(topics);
  const prerequisiteMet = (topic: TopicId) => isDone(topic) || !inTrack.has(topic);
  let currentAssigned = false;

  return topics.map((topic) => {
    const definition = topicDefinition(topic);
    const record = snapshot.lessons[topic];
    let state: NodeState;
    if (record !== undefined && record.attempted > 0 && record.correct / record.attempted < 0.75) {
      state = "review";
    } else if (isDone(topic)) {
      state = "done";
    } else if (definition.prerequisites.every(prerequisiteMet)) {
      state = currentAssigned ? "open" : "current";
      currentAssigned = true;
    } else {
      state = "locked";
    }
    return {
      topic,
      label: definition.label,
      state,
      problemCount: problemsForTopic(topic).length,
      homeCourse: definition.course,
    };
  });
}

const NODE_CLASS: Record<NodeState, string> = {
  done: "bg-good text-white border-good",
  current: "bg-primary text-primary-foreground border-primary ring-4 ring-primary/25",
  open: "bg-card text-primary border-primary",
  review: "bg-card text-not-requested border-not-requested border-dashed",
  locked: "bg-muted text-muted-foreground border-border",
};

const LEGEND: readonly { readonly state: NodeState; readonly label: string }[] = [
  { state: "done", label: "Done" },
  { state: "current", label: "Current" },
  { state: "open", label: "Open" },
  { state: "review", label: "Review" },
  { state: "locked", label: "Locked" },
];

function CoursePicker() {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 md:p-6">
      <Card className="flex flex-col items-center gap-3 text-center">
        <Berry mood="curious" behaviour="wave" reducedMotion={false} sizePx={88} />
        <h2 className="title-face text-scale-xl font-semibold">Pick a track</h2>
        <p className="text-scale-sm text-muted-foreground">
          The placement quiz picks one for you in under three minutes, or choose a course directly.
        </p>
        <Press onPointerDown={() => navigate("#/start/quiz")}>Take the placement quiz</Press>
        <div className="mt-2 grid w-full grid-cols-2 gap-2">
          {(Object.keys(COURSE_LABEL) as CourseId[]).map((course) => (
            <Press key={course} variant="secondary" className="text-scale-sm" onPointerDown={() => progress.setCourse(course, [])}>
              {COURSE_LABEL[course]}
            </Press>
          ))}
        </div>
      </Card>
    </div>
  );
}

export default function PathwayTab({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const snapshot = useProgress();
  const course = snapshot.course;
  const nodes = useMemo(() => (course === null ? [] : derivePathway(course, snapshot)), [course, snapshot]);

  if (course === null) return <CoursePicker />;

  const doneCount = nodes.filter((node) => node.state === "done").length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 p-4 md:p-6">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h2 className="title-face text-scale-xl font-semibold">{COURSE_LABEL[course]}</h2>
          <p className="text-scale-sm text-muted-foreground">
            {doneCount} of {nodes.length} topics done
          </p>
        </div>
        <Berry mood={doneCount === nodes.length && nodes.length > 0 ? "proud" : "curious"} reducedMotion={reducedMotion} sizePx={56} />
      </header>

      <ol className="relative flex flex-col gap-1 py-2" aria-label="Pathway">
        {nodes.map((node, index) => {
          // The winding track: a gentle sine across the column, as the
          // reference does, so the eye follows a path rather than a list.
          const offset = Math.round(Math.sin(index * 0.9) * 36);
          const clickable = node.state !== "locked" && node.problemCount > 0;
          const inner = (
            <>
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 text-scale-sm font-bold ${NODE_CLASS[node.state]}`}
                aria-hidden
              >
                {node.state === "done" ? "✓" : node.state === "review" ? "★" : index + 1}
              </span>
              <span className="flex flex-col">
                <span className={`text-scale-sm font-semibold ${node.state === "locked" ? "text-muted-foreground" : "text-foreground"}`}>
                  {node.label}
                </span>
                <span className="text-scale-xs text-muted-foreground">
                  {node.homeCourse !== course ? `Detour into ${COURSE_LABEL[node.homeCourse]} · ` : ""}
                  {node.problemCount === 0 ? "not yet authored" : `${node.problemCount} problem${node.problemCount === 1 ? "" : "s"}`}
                </span>
              </span>
            </>
          );
          return (
            <li key={node.topic} className="relative" style={{ transform: `translateX(${offset}px)` }}>
              {index > 0 ? <span className="absolute left-6 -top-3 h-3 w-0.5 bg-border" aria-hidden /> : null}
              {clickable ? (
                <a
                  href={hrefForTab("courses", course, node.topic)}
                  aria-current={node.state === "current" ? "step" : undefined}
                  className="press flex min-h-14 items-center gap-3 rounded-2xl px-2 py-1"
                >
                  {inner}
                </a>
              ) : (
                <div className="flex min-h-14 items-center gap-3 rounded-2xl px-2 py-1" aria-disabled>
                  {inner}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <Card className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h3 className="text-scale-base font-semibold">Mechanism cycle</h3>
          <Pill tone="primary">Unlockable</Pill>
        </div>
        <p className="text-scale-sm text-muted-foreground">
          The trainer opens with S<sub>N</sub>2 at bromomethane. Cycles unlock along this track as
          lessons complete; the server keeps that state from Phase 6.
        </p>
        <a href={hrefForTab("trainer")} className="press inline-flex min-h-11 items-center justify-center rounded-[9px] bg-primary px-5 font-semibold text-primary-foreground">
          Open the trainer
        </a>
      </Card>

      <ul className="flex flex-wrap gap-3 text-scale-xs text-muted-foreground" aria-label="Legend">
        {LEGEND.map((entry) => (
          <li key={entry.state} className="flex items-center gap-1.5">
            <span className={`inline-block h-3 w-3 rounded-full border ${NODE_CLASS[entry.state]}`} aria-hidden />
            {entry.label}
          </li>
        ))}
      </ul>

      <button type="button" className="press min-h-11 self-start text-scale-xs font-semibold text-muted-foreground" onPointerDown={() => progress.setCourse(course, snapshot.startTopics)}>
        Change track in Courses
      </button>
    </div>
  );
}
