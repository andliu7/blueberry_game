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
 *
 * THE LOOK. docs/reference/competitors/inspirations/duolingo path or track.png
 * and progress & buttons.png are the bar for the track itself: large round
 * lesson buttons with a visible 3D edge that depress on press, a floating
 * START tag over the current one, unit banners cutting the track into acts.
 * The button styling lives in pathway.css beside this file.
 */

import { useMemo, type CSSProperties } from "react";
import {
  ACTS,
  prerequisiteClosure,
  probeTopicIdsForCourse,
  topicDefinition,
  type ActId,
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
import "./pathway.css";

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

/* ------------------------------------------------------------------------- */
/* Rendering. Everything below is presentation over the nodes derived above.  */
/* ------------------------------------------------------------------------- */

/**
 * A unit of the track: one act's worth of nodes under one banner. Only
 * orgo_2 topics carry an act, so every other course renders as a single unit
 * named after the course. Pure, like derivePathway, and it never reorders:
 * nodes keep the order the curriculum gave them, units are cut where the act
 * changes.
 */
export interface PathwayUnit {
  readonly key: string;
  readonly title: string;
  readonly subtitle: string;
  readonly act: ActId | null;
  readonly nodes: readonly PathwayNode[];
}

export function groupIntoUnits(course: CourseId, nodes: readonly PathwayNode[]): readonly PathwayUnit[] {
  const units: PathwayUnit[] = [];
  for (const node of nodes) {
    const act = topicDefinition(node.topic).act ?? null;
    const last = units[units.length - 1];
    if (last !== undefined && last.act === act) {
      units[units.length - 1] = { ...last, nodes: [...last.nodes, node] };
      continue;
    }
    const definition = act === null ? null : ACTS[act];
    units.push({
      key: act ?? `course-${units.length}`,
      title: definition === null ? COURSE_LABEL[course] : definition.label,
      subtitle: definition === null ? "Unit 1" : definition.id === "act_0" ? "On every exam" : `Act ${definition.id.slice(-1)}`,
      act,
      nodes: [node],
    });
  }
  return units;
}

/** Banner colour per act. White text clears WCAG AA on each. */
const BANNER_COLOUR: Record<ActId | "course", string> = {
  course: "var(--primary)",
  act_0: "var(--primary)",
  act_1: "#4f46e5",
  act_2: "#0f766e",
  act_3: "#be185d",
};

const LEGEND: readonly { readonly state: NodeState; readonly label: string }[] = [
  { state: "done", label: "Done" },
  { state: "current", label: "Current" },
  { state: "open", label: "Open" },
  { state: "review", label: "Review" },
  { state: "locked", label: "Locked" },
];

const STAR_PATH = "M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.7L12 17.5l-5.9 3.3 1.3-6.7L2.5 9.5l6.6-.8z";

/** The glyph on the face. SVG so it scales and never depends on a font's emoji. */
function NodeGlyph({ state, index }: { readonly state: NodeState; readonly index: number }) {
  switch (state) {
    case "done":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "review":
    case "current":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
          <path d={STAR_PATH} fill="currentColor" />
        </svg>
      );
    case "locked":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    default:
      return <span className="text-scale-lg font-extrabold">{index + 1}</span>;
  }
}

function UnitBanner({ unit, course }: { readonly unit: PathwayUnit; readonly course: CourseId }) {
  const colour = BANNER_COLOUR[unit.act ?? "course"];
  return (
    <header className="path-banner flex items-stretch overflow-hidden" style={{ "--banner": colour } as CSSProperties}>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 px-4 py-3">
        <span className="text-scale-xs font-bold uppercase tracking-wider opacity-90">{unit.subtitle}</span>
        <span className="text-scale-base font-bold leading-tight">{unit.title}</span>
      </div>
      <a
        href={hrefForTab("courses", course)}
        className="path-banner__guide press flex min-h-11 min-w-14 items-center justify-center px-3 text-white"
        aria-label={`Guidebook for ${unit.title}`}
        title="Guidebook"
      >
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <path d="M5 4.5h9.5a2.5 2.5 0 0 1 2.5 2.5v12.5H7.5A2.5 2.5 0 0 1 5 17z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <path d="M8.5 9h5M8.5 12.5h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </a>
    </header>
  );
}

/**
 * Horizontal wander of node i on the track, in steps of -2..2. The reference
 * path swings a full node width or more either side of centre, so the cycle
 * is centre, right, far right, right, centre, left, far left, left. The step
 * size lives in pathway.css (.path-row) so it can shrink with the viewport.
 */
const WIND_CYCLE: readonly number[] = [0, 1, 2, 1, 0, -1, -2, -1];
export function trackWind(index: number): number {
  return WIND_CYCLE[index % WIND_CYCLE.length] ?? 0;
}

function TrackNode({
  node,
  index,
  course,
}: {
  readonly node: PathwayNode;
  readonly index: number;
  readonly course: CourseId;
}) {
  const clickable = node.state !== "locked" && node.problemCount > 0;
  const slabClass = `path-node path-node--${node.state} ${clickable ? "path-node--press" : ""}`;
  const detail =
    node.state === "locked"
      ? "Locked until the topics before it are done"
      : node.problemCount === 0
        ? "Not yet authored"
        : `${node.problemCount} problem${node.problemCount === 1 ? "" : "s"}`;

  // The slab: a floor disc, then the face that drops onto it. The glyph rides
  // on the face so it moves with the press.
  const slab = (
    <>
      <span className="path-node__edge" aria-hidden />
      <span className="path-node__face">
        <NodeGlyph state={node.state} index={index} />
      </span>
    </>
  );

  const wind = trackWind(index);
  // The label sits on the side the node swung away from, so a far right node
  // keeps its name inside the column instead of off the edge of a phone.
  const labelLeft = wind > 0;

  return (
    <li className="path-row relative w-full py-5" style={{ "--wind": wind } as CSSProperties}>
      <div className="path-row__slab relative">
        {node.state === "current" ? <span className="path-halo" aria-hidden /> : null}
        {node.state === "current" ? (
          <span className="path-start" aria-hidden>
            START
          </span>
        ) : null}
        {clickable ? (
          <a
            href={hrefForTab("courses", course, node.topic)}
            aria-current={node.state === "current" ? "step" : undefined}
            aria-label={`${node.label}. ${detail}`}
            className={slabClass}
          >
            {slab}
          </a>
        ) : (
          <span className={slabClass} role="img" aria-label={`${node.label}. ${detail}`}>
            {slab}
          </span>
        )}
      </div>
      <div className={`path-row__label flex min-w-0 flex-col ${labelLeft ? "path-row__label--left items-end text-right" : ""}`} aria-hidden>
        <span className={`text-scale-sm font-semibold leading-tight ${node.state === "locked" ? "text-muted-foreground" : "text-foreground"}`}>
          {node.label}
        </span>
        <span className="text-scale-xs text-muted-foreground">
          {node.homeCourse !== course ? `Detour into ${COURSE_LABEL[node.homeCourse]} · ` : ""}
          {node.state === "locked" ? "locked" : detail.toLowerCase()}
        </span>
      </div>
    </li>
  );
}

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
  const units = useMemo(() => (course === null ? [] : groupIntoUnits(course, nodes)), [course, nodes]);

  if (course === null) return <CoursePicker />;

  const doneCount = nodes.filter((node) => node.state === "done").length;
  // Node numbering runs over the whole track, so the wind offset and the
  // number on an open face both count from the first node, not per unit.
  let running = 0;

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

      <div className="flex flex-col gap-2" role="region" aria-label="Pathway">
        {units.map((unit) => {
          const first = running;
          running += unit.nodes.length;
          return (
            <section key={unit.key} className="flex flex-col gap-3" aria-label={unit.title}>
              <UnitBanner unit={unit} course={course} />
              <ol className="path-track mx-auto flex w-full max-w-md flex-col py-6">
                {unit.nodes.map((node, i) => (
                  <TrackNode key={node.topic} node={node} index={first + i} course={course} />
                ))}
              </ol>
            </section>
          );
        })}
      </div>

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
            <span className={`path-node path-node--${entry.state} path-node--swatch`} aria-hidden>
              <span className="path-node__edge" />
              <span className="path-node__face" />
            </span>
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
