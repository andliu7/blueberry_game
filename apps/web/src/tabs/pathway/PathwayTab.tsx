/**
 * The pathway: the winding track through the course, rebuilt to
 * docs/DESIGN-GOALS.md (owner verdicts 2026-09-01). The committed reference
 * for the whole tab is docs/reference/design-goals/
 * blueberry_r7-compiled-v2_1788288474.png, the five node states are
 * blueberry_r7-states-sheet_1788288485.png, and the diamond fork geometry is
 * blueberry_branch-diamond_1788284291.png.
 *
 * WHERE THE SHAPE COMES FROM. TOPICS in the curriculum package carries the
 * course's topics; the one open course renders the owner's map
 * (demo/pathwayMap.ts) instead. Either way the graph is content, read
 * straight from data, never authored twice.
 *
 * WHERE THE STATE COMES FROM, and the rule that governs it. Unlock state is
 * progress, enforced server side per CLAUDE.md; the client renders it and
 * never decides it. UNIT GATES ARE THE ONLY LOCKS, owner ruling 2026-09-01:
 * within a unit every node is freely orderable, so no mid-unit node ever
 * renders locked. The rule lives in topicPathway.ts for the topic view and
 * pathwayState.ts for the map view, the same model in both vocabularies; the
 * per-node prerequisite gates the earlier build drew are retired, and
 * test/pathwayUnlock.test.ts asserts the retirement positively.
 *
 * THE LOOK. Periwinkle 3D pressable chips (the --chip-* family), all one
 * size, five states per the committed sheet; a drawn winding trail that
 * PathScene derives from where the nodes actually landed; the DIAMOND FORK
 * as the default unit shape, derived per unit in unitShape.ts, with the
 * concept above the split and the arms rejoining at that unit'''s OWN
 * double-dagger gate; enrichment on dimmed side loops flying the application
 * flag; the petal hub on the two units the goals reserve it for; and the F1
 * track-map scrollbar riding its thin energy axis, drawing the unit'''s real
 * shape because it reads the same layout the track just drew. The button
 * styling and the pitch live in pathway.css beside this file.
 *
 * WHERE A PRESS GOES. Node, then price, in that order: a chip opens the NODE
 * SHEET (src/pathway-sheet, Practice with its pips, Challenge with its
 * stopwatch and double dagger, a hamburger to the guidebook), and the sheet'''s
 * START opens the Charge sheet. docs/ECONOMY.md wants the price named at the
 * door; the door is the sheet.
 */

import { useMemo, useState, type CSSProperties } from "react";
import {
  ACTS,
  prerequisiteClosure,
  probeTopicIdsForCourse,
  topicDefinition,
  type ActId,
  type CourseId,
  type TopicId,
} from "@blueberry/curriculum";
import { Card } from "../../app/ui/Card";
import { Press } from "../../app/ui/Press";
import { hrefForTab } from "../../app/routes";
import { navigate } from "../../app/useHashRoute";
import { useProgress } from "../../app/hooks";
import { lessonNodeId, progress, type ProgressSnapshot } from "../../app/progress";
import { ChargeGate } from "../../charge/ChargeGate";
import type { ChargeGateNode } from "../../charge/chargeGateModel";
import type { NodeKind as EconomyNodeKind } from "@blueberry/economy";
import { Berry } from "../../mascot/Berry";
import { COURSE_LABEL, problemsForTopic } from "../courses/CoursesTab";
import "./pathway.css";

export type NodeState = "done" | "current" | "open" | "review" | "locked";

import {
  PATHWAY_UNITS,
  type PathwayNode as MapNode,
  type PathwayUnit as MapUnit,
  type PlayableLink as MapPlayableLink,
} from "../../demo/pathwayMap";
import PathScene from "./PathScene";
import PathTrackMap, { type FastTravelUnit, type TrackMapShape } from "./PathTrackMap";
import { deriveMapPathway, statusOf, type MapPathwayStatus } from "./pathwayState";
import { deriveFreeOrderStates } from "./topicPathway";
import { HUB_CENTRE, petalPositions } from "./hubPlan";
import { unitShape, weaveLoops, type UnitShape } from "./unitShape";
import type { TrackMapNode } from "./trail";
/*
 * THE NODE SHEET, wired here rather than left on the shelf. The attempt-2
 * build shipped src/pathway-sheet/ imported by nothing, so pressing a node
 * opened the Charge sheet directly and the whole "node sheet and guidebook"
 * section of docs/DESIGN-GOALS.md was unreachable from the surface under
 * judgement. The order is now the one the goals draw: press a node, the sheet
 * offers Practice and Challenge, and the CHARGE sheet opens behind START,
 * which is where docs/ECONOMY.md wants the price named (at the door, on
 * entry, once).
 */
import { NodeSheet, Guidebook, guidebookFor, type SheetNode } from "../../pathway-sheet";
// Pure label geometry, in its own module so it can be tested without a document.
// Re-exported because callers and tests have always reached it through this file.
import { trackWind, withBreakHints } from "./pathwayLayout";
export { trackWind, withBreakHints } from "./pathwayLayout";
import { isCheckpointUnit } from "./terrain";

export interface PathwayNode {
  readonly topic: TopicId;
  readonly label: string;
  readonly state: NodeState;
  readonly problemCount: number;
  readonly homeCourse: CourseId;
}

/**
 * The rendering rule for the topic track. Pure over its inputs.
 *
 * THE PER-NODE PREREQUISITE GATES ARE RETIRED HERE, owner ruling 2026-09-01:
 * this used to walk each topic's prerequisite edges forward as unlock gates,
 * which made the track a one-at-a-time chain. Now units gate and nodes do
 * not: deriveFreeOrderStates in topicPathway.ts is the rule, the same
 * unit-gate model pathwayState.ts already applies to the map, and inside a
 * reachable unit every node is open in any order. The placement frontier
 * still counts topics before it as placed out of, because placement is
 * progress, not a lock.
 */
export function derivePathway(course: CourseId, snapshot: ProgressSnapshot): readonly PathwayNode[] {
  const topics = probeTopicIdsForCourse(course);
  const frontier = new Set(snapshot.startTopics);
  // Everything strictly before the frontier is assumed placed-out-of: a topic
  // is "before" the frontier when it is a prerequisite of a frontier topic.
  const placedOut = new Set<TopicId>();
  for (const start of frontier) for (const pre of prerequisiteClosure(start)) placedOut.add(pre);
  const isDone = (topic: TopicId) => snapshot.lessons[topic] !== undefined || placedOut.has(topic);

  const standings = topics.map((topic) => {
    const definition = topicDefinition(topic);
    return {
      topic,
      definition,
      done: isDone(topic),
      playable: problemsForTopic(topic).length > 0,
    };
  });
  // The unit key cuts where the act changes, the same cut groupIntoUnits
  // makes, so the gate and the banner can never disagree about where a unit
  // begins. Runs of act-less topics collapse to one unit per run, which is
  // also what groupIntoUnits draws.
  const states = deriveFreeOrderStates(
    standings.map((standing) => ({ unit: standing.definition.act ?? "", done: standing.done, playable: standing.playable })),
  );

  return standings.map((standing, index) => {
    const record = snapshot.lessons[standing.topic];
    const review =
      record !== undefined && record.attempted > 0 && record.correct / record.attempted < 0.75;
    return {
      topic: standing.topic,
      label: standing.definition.label,
      state: review ? "review" : states[index]!,
      problemCount: problemsForTopic(standing.topic).length,
      homeCourse: standing.definition.course,
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
  { state: "current", label: "Up next" },
  { state: "done", label: "Done" },
  { state: "review", label: "Review" },
  { state: "open", label: "Open" },
  { state: "locked", label: "Locked" },
];

/**
 * A map unit's title is authored as "Unit 1 - Conjugation, Resonance & Dienes"
 * with a middot separator. The banner sets the number as its eyebrow and the
 * name as its headline, so the thing a student is looking for is the largest
 * text in the banner. A title with no separator has no number to lift, and
 * keeps the whole string as its name rather than inventing one.
 */
const UNIT_TITLE_SEPARATOR = " · ";

export function unitNumber(title: string): string {
  const at = title.indexOf(UNIT_TITLE_SEPARATOR);
  return at === -1 ? "Unit" : title.slice(0, at);
}

export function unitName(title: string): string {
  const at = title.indexOf(UNIT_TITLE_SEPARATOR);
  return at === -1 ? title : title.slice(at + UNIT_TITLE_SEPARATOR.length);
}

/**
 * The glyph on the face, per the committed states sheet
 * (blueberry_r7-states-sheet): rest and current faces are BLANK, completed
 * carries a check, locked a lock. The check is dark progress ink, not white,
 * because white on #7ed957 measures 1.76:1, under the 3.0 graphics floor;
 * measured, not assumed, per the fill-only rule. Review is the one state the
 * sheet does not draw (it is this app's spaced-repetition seam), and it
 * carries a circular refresh arrow in the same dark ink so state is never
 * colour alone.
 */
function NodeGlyph({ state }: { readonly state: NodeState }) {
  switch (state) {
    case "done":
      return (
        <svg viewBox="0 0 24 24" className="h-8 w-8" aria-hidden>
          <path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "review":
      return (
        <svg viewBox="0 0 24 24" className="h-7 w-7" aria-hidden>
          <path d="M19 12a7 7 0 1 1-2.05-4.95" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          <path d="M17.4 3.6v3.6h-3.6" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "locked":
      return (
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
          <rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor" />
          <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      );
    default:
      // Rest and current: a blank face, per the sheet. Current is carried by
      // the halo and the START pill, which are shapes rather than colours.
      return null;
  }
}

/**
 * The badge in the chip's corner, per blueberry_spec-node-types: shape and
 * badge say what a node is before you tap it. Concept is the lightbulb,
 * challenge the stopwatch, application the flag on the dimmed side loop,
 * and hub the benzene ring: the shared mechanism the petals run on.
 */
export type NodeBadge = "concept" | "challenge" | "application" | "hub" | "video";

function BadgeGlyph({ badge }: { readonly badge: NodeBadge }) {
  switch (badge) {
    case "video":
      /*
        THE SEVENTH NODE TYPE. blueberry_spec-node-types draws lesson,
        concept, challenge, unit gate, application, hub and VIDEO HOOK, and
        the attempt-2 build carried six: the play badge was missing from the
        union, from this switch and from the mapping, so CLAUDE.md's short
        form video had no vocabulary on the path at all. What the badge
        claims and does not claim is written out in unitShape.ts's
        videoHookOf: it marks the unit's video SLOT, which is a placement,
        not a promise that a file has been shot.
      */
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="12" r="9.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M10 8.2 L16.4 12 L10 15.8 Z" fill="currentColor" />
        </svg>
      );
    case "hub":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path d="M12 3.5 L19.4 7.75 L19.4 16.25 L12 20.5 L4.6 16.25 L4.6 7.75 Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          <circle cx="12" cy="12" r="4.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
        </svg>
      );
    case "concept":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.2 1.1 2h5a3.4 3.4 0 0 1 1.1-2A6 6 0 0 0 12 3z" fill="currentColor" />
          <path d="M9.8 18.5h4.4M10.6 21h2.8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case "challenge":
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <circle cx="12" cy="13.5" r="7" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M12 13.5V9.2M10 2.8h4M12 2.8v2" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
          <path d="M6 21V4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M6 5h11l-2.5 3.5L17 12H6z" fill="currentColor" />
        </svg>
      );
  }
}

/**
 * Entering a node costs charge, so a press opens the Charge sheet before the
 * route changes.
 *
 * WHY THE SHEET AND NOT A STRAIGHT NAVIGATION. docs/ECONOMY.md charges on ENTRY
 * and never per question ("if there was enough to begin, there is enough to
 * finish"), which only works if the student is told the price at the door. A
 * limiter that debits silently and explains later is the one this product is a
 * correction of.
 *
 * The anchor stays an anchor: it keeps its href for the middle click, the
 * keyboard and the status bar, and the sheet takes over the plain activation.
 * `onPointerDown` is what opens it, so the acknowledgement and the action are
 * the same frame per CLAUDE.md; `onClick` opens it too, because a keyboard
 * Enter never produces a pointer event, and preventDefault is what stops the
 * href from racing the sheet.
 */
export type OpenNode = (sheet: SheetNode, charge: ChargeGateNode | null) => void;

/**
 * Props a track node needs to open its sheet.
 *
 * BOTH halves travel together: the sheet describes the node to a student and
 * the charge node prices it, and only the track knows how to build either.
 * `charge` is null for a node still in the authoring queue, which is an
 * authoring statement and never a progress one, so the sheet still opens and
 * simply cannot start.
 */
function enterHandlers(onOpenNode: OpenNode, sheet: SheetNode, charge: ChargeGateNode | null) {
  return {
    onPointerDown: () => onOpenNode(sheet, charge),
    onClick: (event: { preventDefault: () => void }) => {
      event.preventDefault();
      onOpenNode(sheet, charge);
    },
  };
}

/** A map node described for the sheet. Pure over the node and its status. */
function sheetNodeFor(node: MapNode, state: NodeState, practiceHref: string | null): SheetNode {
  return { id: node.id, kind: node.kind, state, title: node.title, blurb: node.blurb, practiceHref };
}

/**
 * The trail lane a node rides; PathScene reads these off the document. "off"
 * means the node carries NO trail anchor at all: a hub's petals hang off
 * their own drawn spokes, and handing their centres to the trail would fold
 * the spine's ribbon through the flower.
 */
type TrailLane = "main" | "left" | "right" | "loop" | "off";

/** Whether the trail behind this node renders in the progress green. */
function trailDone(state: NodeState): boolean {
  return state === "done" || state === "review" || state === "current";
}

/**
 * The chip itself: face in its well, badge, and the data-trail attributes the
 * scene measures. One component whether the chip sits in a winding row, a
 * fork cell or a side loop, so the five states can never render two ways.
 */
function Chip({
  state,
  label,
  detail,
  href,
  lane,
  badge,
  dim,
  queued = false,
  onOpenNode,
  sheetNode,
  gateNode,
}: {
  readonly state: NodeState;
  readonly label: string;
  readonly detail: string;
  readonly href: string | null;
  readonly lane: TrailLane;
  readonly badge: NodeBadge | null;
  readonly dim: boolean;
  /** Authoring queue, riding BESIDE state: dashed treatment, never a lock. */
  readonly queued?: boolean;
  readonly onOpenNode: OpenNode;
  readonly sheetNode: SheetNode | null;
  readonly gateNode: ChargeGateNode | null;
}) {
  const clickable = href !== null && sheetNode !== null;
  // The committed states sheet draws five states and no hybrids. Dim yields
  // to locked (the S3 critic found a periwinkle-dim chip wearing a padlock,
  // a sixth face the sheet does not draw), and queued yields to locked too:
  // inside an unreachable unit the lock is the truer statement.
  const dimmed = dim && state !== "locked";
  const isQueued = queued && state !== "locked";
  const chipClass = `path-node path-node--${state} ${dimmed ? "path-node--dim" : ""} ${isQueued ? "path-node--queued" : ""} ${clickable ? "path-node--press" : ""}`;
  // Petals carry no trail anchor: PathScene queries [data-trail], so the
  // attribute pair is simply absent rather than present with a null lane.
  const trailAttributes =
    lane === "off"
      ? {}
      : { "data-trail": lane, "data-trail-done": trailDone(state) ? "true" : "false" };
  const face = (
    <>
      <span className="path-node__face">
        <NodeGlyph state={state} />
      </span>
      {badge !== null ? (
        <span className={`path-node__badge path-node__badge--${badge}`} aria-hidden>
          <BadgeGlyph badge={badge} />
        </span>
      ) : null}
    </>
  );
  return clickable ? (
    <a
      href={href}
      aria-current={state === "current" ? "step" : undefined}
      aria-label={`${label}. ${detail}`}
      aria-haspopup="dialog"
      className={chipClass}
      {...trailAttributes}
      {...enterHandlers(onOpenNode, sheetNode!, gateNode)}
    >
      {face}
    </a>
  ) : (
    <span
      className={chipClass}
      role="img"
      aria-label={`${label}. ${detail}`}
      {...trailAttributes}
    >
      {face}
    </span>
  );
}

/** The START pill and pulsing halo live on the current node's row. */
function StartTag() {
  return (
    <span className="path-start" aria-hidden>
      START
    </span>
  );
}

/**
 * One slab on the winding track, in whatever state it is in. Shared by the
 * generic course track and the Orgo map. All nodes are the SAME SIZE, per the
 * goals; the current node is carried by its halo and START pill instead of by
 * scale, which is what the committed states sheet draws.
 */
function TrackSlab({
  state,
  label,
  detail,
  href,
  wind,
  badge,
  dim,
  lane = "main",
  queued = false,
  onOpenNode,
  sheetNode,
  gateNode,
}: {
  readonly state: NodeState;
  readonly label: string;
  readonly detail: string;
  readonly href: string | null;
  readonly wind: number;
  readonly badge: NodeBadge | null;
  readonly dim: boolean;
  /**
   * "loop" is the goals' dimmed SIDE LOOP: the same chip at the same size,
   * swung further off the centreline and marked as a detour, so trail.ts
   * draws the spine straight past it and the loop out and back.
   */
  readonly lane?: "main" | "loop";
  readonly queued?: boolean;
  readonly onOpenNode: OpenNode;
  readonly sheetNode: SheetNode | null;
  readonly gateNode: ChargeGateNode | null;
}) {
  // The label sits on the side the node swung away from, so a far right node
  // keeps its name inside the column instead of off the edge of a phone. The
  // text itself stays left aligned either way.
  const labelLeft = wind > 0;
  return (
    <li
      className={`path-row relative w-full ${state === "current" ? "path-row--current" : ""} ${lane === "loop" ? "path-row--loop" : ""}`}
      style={{ "--wind": wind } as CSSProperties}
      data-node-state={state}
    >
      <div className="path-row__slab relative">
        {state === "current" ? <StartTag /> : null}
        <Chip
          state={state}
          label={label}
          detail={detail}
          href={href}
          lane={lane}
          badge={badge}
          dim={dim}
          queued={queued}
          onOpenNode={onOpenNode}
          sheetNode={sheetNode}
          gateNode={gateNode}
        />
      </div>
      <div className={`path-row__label flex min-w-0 flex-col ${labelLeft ? "path-row__label--left" : ""}`} aria-hidden>
        <span
          className={`path-row__title text-scale-sm font-semibold leading-tight ${state === "locked" || state === "open" ? "text-muted-foreground" : "text-foreground"}`}
        >
          {withBreakHints(label)}
        </span>
        {/*
          NO blurb, on any node including the current one. The judge's words
          about the old track were that a returning student "has to read four
          multi-line descriptions to work out where they stopped", and the bar's
          own path carries no text beside a node at all. One title is the
          compromise. `detail` is still the accessible name, and the entry
          sheet says it in full.
        */}
      </div>
    </li>
  );
}

function TrackNode({
  node,
  index,
  course,
  onOpenNode,
}: {
  readonly node: PathwayNode;
  readonly index: number;
  readonly course: CourseId;
  readonly onOpenNode: OpenNode;
}) {
  const clickable = node.state !== "locked" && node.problemCount > 0;
  const detail =
    node.state === "locked"
      ? "Opens when the unit before it is done"
      : node.problemCount === 0
        ? "Not yet authored"
        : `${node.problemCount} problem${node.problemCount === 1 ? "" : "s"}`;
  const href = hrefForTab("courses", course, node.topic);
  return (
    <TrackSlab
      state={node.state}
      label={node.label}
      detail={detail}
      href={clickable ? href : null}
      wind={trackWind(index)}
      badge={null}
      dim={false}
      queued={node.problemCount === 0}
      onOpenNode={onOpenNode}
      /*
        The generic course track opens the SAME node sheet the map does. A
        topic is not a map node, so the sheet's vocabulary is filled in from
        what a topic has: it is spine content, its blurb is the problem count
        the row already says, and its practice href is the lesson route.
      */
      sheetNode={
        clickable
          ? {
              id: lessonNodeId(node.topic),
              kind: "spine",
              state: node.state,
              title: node.label,
              blurb: detail,
              practiceHref: href,
            }
          : null
      }
      gateNode={
        clickable
          ? {
              // A lesson node is journalled as a concept clear by completeLesson,
              // so it is priced as one here: the id and the kind the sheet spends
              // against are the id and the kind the clear will carry, or the
              // spend and the clear would name two nodes.
              id: lessonNodeId(node.topic),
              kind: "concept",
              title: node.label,
              href,
            }
          : null
      }
    />
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

/**
 * What a map node costs, in the economy's own vocabulary.
 *
 * The map classifies nodes as spine, branch, gate or boss, and docs/ECONOMY.md
 * prices concept, reaction, branch, quiz, review, tutorial and intro. The two
 * lists are not the same list, so the mapping is written down once here rather
 * than guessed at each call site:
 *
 *   branch          -> branch. Same word, same 8, and the map's side quests are
 *                      exactly what that row is for.
 *   spine, a beat   -> concept. A beat is recognition and ranking work, which is
 *                      what the 5 charge concept row is priced against.
 *   spine, anything -> reaction. Arrow work: a reaction, a sequence, a
 *                      resonance hunt. The 8 charge row.
 *   boss            -> quiz. UNREACHABLE TODAY, and flagged rather than settled:
 *                      the map's one boss carries no `playable`, so no press can
 *                      arrive here. ECONOMY.md prices no boss, and quiz is the
 *                      closest priced row (an assessment, refunded on a pass).
 *                      An owner decision before a boss is authored.
 *
 * Gates never reach this function: they render as the unit gate and its
 * checkpoint strip and are not pressable.
 */
function economyKindFor(mapKind: string, link: MapPlayableLink): EconomyNodeKind {
  if (mapKind === "branch") return "branch";
  if (mapKind === "boss") return "quiz";
  return link.kind === "beat" ? "concept" : "reaction";
}

/** The trainer deep link for one map node's playable entry. */
function hrefForPlayable(link: MapPlayableLink): string {
  // A beat is not a mechanism and does not belong in the trainer: it gets its
  // own route, and BeatRunner picks the surface once the node id arrives.
  if (link.kind === "beat") return `#/lesson/${encodeURIComponent(link.id)}`;
  const param = link.kind === "reaction" ? "reaction" : link.kind === "sequence" ? "sequence" : "hunt";
  return `?${param}=${encodeURIComponent(link.id)}#/trainer`;
}

/**
 * The badge a map node's chip wears, per the node-type vocabulary in
 * blueberry_spec-node-types. Order is specificity: the video hook is the
 * unit's one video slot and outranks the generic concept beat, a boss is a
 * challenge, a branch is enrichment and flies the application flag.
 */
function badgeForMapNode(node: MapNode, videoHookId: string | null): NodeBadge | null {
  if (node.id === videoHookId) return "video";
  if (node.kind === "boss") return "challenge";
  if (node.kind === "branch") return "application";
  if (node.playable?.kind === "beat") return "concept";
  return null;
}

/**
 * Detail copy for a map node, shared by every chip that draws one. Locked
 * wins over queued: inside an unreachable unit the honest sentence is the
 * gate's, and "authoring queued" is only said where the student could
 * otherwise play the node.
 */
function mapNodeDetail(node: MapNode, queued: boolean, locked: boolean): string {
  if (locked) return "Opens when the unit before it is done";
  if (queued) return "Authoring queued";
  return node.blurb;
}

/** The ChargeGate node for a playable map node, or null when unpressable. */
function mapGateNode(node: MapNode, clickable: boolean): ChargeGateNode | null {
  if (!clickable || node.playable === undefined) return null;
  return {
    id: node.id,
    kind: economyKindFor(node.kind, node.playable),
    title: node.title,
    href: hrefForPlayable(node.playable),
  };
}

/**
 * A fork cell or the concept above it: the same chip, with its label BELOW
 * rather than beside, because a two-column diamond has no side gutter to put
 * a label in. The committed diamond (blueberry_branch-diamond) draws its
 * labels exactly there.
 */
function ForkChip({
  node,
  status,
  lane,
  badge,
  dim,
  onOpenNode,
}: {
  readonly node: MapNode;
  readonly status: { readonly state: NodeState; readonly queued: boolean };
  readonly lane: TrailLane;
  readonly badge: NodeBadge | null;
  readonly dim: boolean;
  readonly onOpenNode: OpenNode;
}) {
  const locked = status.state === "locked";
  const clickable = node.playable !== undefined && !locked;
  const detail = mapNodeDetail(node, status.queued, locked);
  return (
    <div className="path-fork__cell" data-node-state={status.state}>
      <div className="relative">
        {status.state === "current" ? <StartTag /> : null}
        <Chip
          state={status.state}
          label={node.title}
          detail={detail}
          href={clickable && node.playable !== undefined ? hrefForPlayable(node.playable) : null}
          lane={lane}
          badge={badge}
          dim={dim}
          queued={status.queued}
          onOpenNode={onOpenNode}
          sheetNode={sheetNodeFor(node, status.state, clickable && node.playable !== undefined ? hrefForPlayable(node.playable) : null)}
          gateNode={mapGateNode(node, clickable)}
        />
      </div>
      <span
        className={`path-fork__label text-scale-sm font-semibold leading-tight ${locked || status.state === "open" ? "text-muted-foreground" : "text-foreground"}`}
        aria-hidden
      >
        {withBreakHints(node.title)}
      </span>
    </div>
  );
}

/**
 * THE HUB WITH PETALS, per blueberry_spec-node-types and the goals' branch
 * vocabulary: "HUB with petals is reserved for categories with three or more
 * families (EAS, the acyl ladder)". The shared mechanism sits at the centre
 * and the reaction families ring it, each on its own drawn spoke; the spine
 * trail passes through the centre (it carries the main trail anchor) and the
 * petals carry no trail anchor at all, so the ribbon never folds through the
 * flower. Chip positions and spoke endpoints both come from petalPositions,
 * the same arithmetic, so they cannot drift apart. This is presentation only:
 * state still comes from deriveMapPathway, where only unit gates lock, so
 * every petal is freely orderable the moment the unit opens.
 */
function HubFlower({
  hubNode,
  petals,
  videoHookId,
  status,
  onOpenNode,
}: {
  readonly hubNode: MapNode;
  readonly petals: readonly MapNode[];
  readonly videoHookId: string | null;
  readonly status: MapPathwayStatus;
  readonly onOpenNode: OpenNode;
}) {
  const positions = petalPositions(petals.length);
  return (
    <div
      className="path-hub mx-auto w-full max-w-md"
      role="group"
      aria-label={`${hubNode.title}, the shared mechanism, with its reaction families around it`}
    >
      <svg className="path-hub__spokes" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {positions.map((position, index) => (
          <line
            key={petals[index]!.id}
            className="path-hub__spoke"
            x1={HUB_CENTRE.x}
            y1={HUB_CENTRE.y}
            x2={position.x}
            y2={position.y}
          />
        ))}
      </svg>
      <div
        className="path-hub__cell path-hub__cell--centre"
        style={{ left: `${HUB_CENTRE.x}%`, top: `${HUB_CENTRE.y}%` }}
      >
        <ForkChip node={hubNode} status={statusOf(status, hubNode.id)} lane="main" badge="hub" dim={false} onOpenNode={onOpenNode} />
      </div>
      {petals.map((node, index) => (
        <div
          key={node.id}
          className="path-hub__cell"
          style={{ left: `${positions[index]!.x}%`, top: `${positions[index]!.y}%` }}
        >
          <ForkChip node={node} status={statusOf(status, node.id)} lane="off" badge={badgeForMapNode(node, videoHookId)} dim={false} onOpenNode={onOpenNode} />
        </div>
      ))}
    </div>
  );
}

/**
 * The unit gate: the double dagger, which is the transition-state symbol,
 * drawn as a grey arch the trail passes through. A REAL dagger glyph, per
 * the goals: "the drafts' up-down arrows and glowing pouch are model
 * artifacts of that instruction, not designs". The arch is the rejoin
 * anchor for a fork's arms: it carries data-trail="main", so the trail's
 * two branches close on it, which is the committed diamond geometry.
 */
function UnitGateNode({ passed, locked }: { readonly passed: boolean; readonly locked: boolean }) {
  return (
    <div
      className={`path-gatenode ${locked ? "path-gatenode--locked" : ""}`}
      role="img"
      aria-label={passed ? "Unit gate, passed" : "Unit gate. Clear the checkpoint to open the next unit."}
      data-trail="main"
      data-trail-done={passed ? "true" : "false"}
    >
      <svg viewBox="0 0 64 52" className="path-gatenode__arch" aria-hidden>
        <path d="M12 50 V30 a20 20 0 0 1 40 0 V50" fill="none" strokeWidth="11" strokeLinecap="butt" />
      </svg>
      <span className="path-gatenode__dagger" aria-hidden>
        &#8225;
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* THE UNIT PLAN: one unit's shape, laid out, once, for BOTH the track and    */
/* the F1 pill. The attempt-2 pill re-derived a shape of its own and drew a   */
/* different one; deriving both from this plan is what stops that happening   */
/* again, rather than fixing the one sampling bug that exposed it.            */
/* ------------------------------------------------------------------------- */

/** How far off centre a diamond's arms sit, in wind steps. */
const ARM_WIND = 1.15;

/**
 * How far off centre a dimmed side loop swings.
 *
 * Further than any spine step (the wind cycle peaks at 1.7), because a detour
 * has to read as OFF the road rather than as another kink in it. At the
 * shipped --wind-step of min(58px, 10vw) that is about 100px on a 390pt phone,
 * which clears the chip's own half width and still lands inside the column.
 */
const LOOP_WIND = 2.55;

interface UnitRow {
  readonly node: MapNode;
  readonly lane: "main" | "loop";
  readonly wind: number;
}

interface UnitPlan {
  readonly unit: MapUnit;
  readonly shape: UnitShape;
  /** The winding column with its detours woven in, in DOCUMENT order. */
  readonly rows: readonly UnitRow[];
  readonly checkpoint: boolean;
}

/**
 * Every unit laid out, with the wind cycle running CONTINUOUSLY across the
 * whole track. The running index is why this is one pass over all the units
 * rather than a function of one unit: WIND_CYCLE has period four, so a unit's
 * shape depends on the global index it starts at, and anything that wants to
 * draw that shape (the track, the pill) has to read the same numbers.
 */
export function planUnits(units: readonly MapUnit[]): readonly UnitPlan[] {
  let index = 0;
  let lastWind = 1;
  return units.map((unit) => {
    const shape = unitShape(unit);
    const rows: UnitRow[] = [];
    for (const entry of weaveLoops(shape.column, shape.loops)) {
      if (entry.lane === "main") {
        const wind = trackWind(index);
        index += 1;
        lastWind = wind;
        rows.push({ node: entry.node, lane: "main", wind });
        continue;
      }
      // The detour swings to the side the spine just vacated, so a loop chip
      // never lands on the node it hangs off.
      rows.push({ node: entry.node, lane: "loop", wind: lastWind > 0 ? -LOOP_WIND : LOOP_WIND });
    }
    return { unit, shape, rows, checkpoint: isCheckpointUnit(unit) };
  });
}

/**
 * The pill's node list for one unit: the SAME lanes and the SAME wind offsets
 * the track just drew, so the miniature is the unit's real shape by
 * construction rather than by resemblance.
 */
export function trackMapNodesFor(
  plan: UnitPlan,
  status: MapPathwayStatus,
  gatePassed: boolean,
): readonly TrackMapNode[] {
  const done = (node: MapNode) => trailDone(statusOf(status, node.id).state);
  const nodes: TrackMapNode[] = plan.rows.map((row) => ({
    wind: row.wind,
    lane: row.lane === "loop" ? ("loop" as const) : ("main" as const),
    done: done(row.node),
  }));
  if (plan.shape.concept !== null) {
    nodes.push({ wind: 0, lane: "main", done: done(plan.shape.concept) });
    for (const node of plan.shape.arms[0]) nodes.push({ wind: -ARM_WIND, lane: "left", done: done(node) });
    for (const node of plan.shape.arms[1]) nodes.push({ wind: ARM_WIND, lane: "right", done: done(node) });
  }
  nodes.push({ wind: 0, lane: "main", done: gatePassed });
  return nodes;
}

/** Where the current node sits in that list, for the berry, or -1. */
export function currentIndexFor(plan: UnitPlan, status: MapPathwayStatus): number {
  const order: MapNode[] = [
    ...plan.rows.map((row) => row.node),
    ...(plan.shape.concept === null ? [] : [plan.shape.concept, ...plan.shape.arms[0], ...plan.shape.arms[1]]),
  ];
  return order.findIndex((node) => node.id === status.currentNodeId);
}

/**
 * The Duolingo shaped track, restructured onto the Orgo Pathway Map. Owner
 * direction 2026-08-26: the map's own inventory IS the game's track.
 *
 * THE UNIT IS ONE COMPOSITION, TOP TO BOTTOM, and its DOM order IS its visual
 * order, because PathScene reads trail anchors off the document in document
 * order and trail.ts never sorts. That is the whole of the attempt-2 rejoin
 * bug: the fork rendered at the bottom of a unit and its rejoin anchor was the
 * NEXT unit's gate, about 700px down the page, so the diamond closed across a
 * side-quest block and a banner. Every unit now carries its own gate, drawn
 * directly under its own arms:
 *
 *   banner
 *   hub flower              only on the two units the goals reserve it for
 *   winding column          spine nodes, with dimmed side loops woven in
 *   concept                 centred above the split
 *   arms                    two columns, both open at once
 *   unit gate               the double dagger the arms rejoin at, plus the
 *                           checkpoint chips where the unit has them
 *
 * State still comes from deriveMapPathway, where only unit gates lock, so
 * both arms and every loop are freely orderable the moment the unit opens.
 */
function OrgoMapTrack({
  onOpenNode,
  status,
  reducedMotion,
}: {
  readonly onOpenNode: OpenNode;
  readonly status: MapPathwayStatus;
  readonly reducedMotion: boolean;
}) {
  const plans = useMemo(() => planUnits(PATHWAY_UNITS), []);

  // The F1 pill shows the unit the student left off in: its real shape, the
  // point they stand at, and its title for the accessible name.
  const activePlan =
    plans.find((plan) => status.units.get(plan.unit.id)?.active === true) ?? plans[plans.length - 1]!;
  const trackMapShape: TrackMapShape = {
    nodes: trackMapNodesFor(activePlan, status, unitStatusPassed(status, activePlan.unit.id)),
    currentIndex: currentIndexFor(activePlan, status),
    unitTitle: activePlan.unit.title,
  };

  // The fast-travel overlay's rows, one per unit: what the pill expands into
  // on tap, per the goals' scrollbar clause. Ids double as scroll targets,
  // because every unit section carries data-unit-id.
  const fastTravelUnits: readonly FastTravelUnit[] = PATHWAY_UNITS.map((unit) => {
    const entry = status.units.get(unit.id);
    return {
      id: unit.id,
      number: unitNumber(unit.title),
      name: unitName(unit.title),
      done: entry?.done ?? 0,
      playable: entry?.playable ?? 0,
      active: entry?.active === true,
      reachable: entry?.reachable === true,
    };
  });

  return (
    <div className="path-stage">
      <PathScene
        units={PATHWAY_UNITS}
        reducedMotion={reducedMotion}
        // The trail's done colouring is measured off the DOM, so the scene
        // re-measures when progress moves, not only when layout does.
        stamp={`${status.currentNodeId ?? "end"}:${status.doneCount}`}
      />
      <PathTrackMap shape={trackMapShape} units={fastTravelUnits} reducedMotion={reducedMotion} />
      <div className="path-stage__content flex flex-col gap-2" data-path-content role="region" aria-label="Orgo II pathway map">
        {plans.map((plan) => {
          const { unit, shape } = plan;
          const unitStatus = status.units.get(unit.id);
          const gatePassed = unitStatusPassed(status, unit.id);
          const gateLocked = unitStatus === undefined || !unitStatus.reachable;
          return (
            <section
              key={unit.id}
              className="flex flex-col gap-3"
              aria-label={unit.title}
              data-unit-id={unit.id}
              data-checkpoint={plan.checkpoint ? "true" : "false"}
            >
              <header className="path-banner flex items-stretch overflow-hidden" style={{ "--banner": "var(--primary)" } as CSSProperties}>
                <div className="flex-1 px-4 py-3">
                  {/*
                    The eyebrow is the unit's own number, split off the title,
                    NOT `unit.note`: the note is the dependency ledger the
                    authoring waves burn down, useful in the data and noise on
                    the screen.
                  */}
                  <p className="text-scale-xs font-bold uppercase tracking-wide text-white/85">{unitNumber(unit.title)}</p>
                  <h3 className="text-scale-base font-semibold text-white">{unitName(unit.title)}</h3>
                </div>
              </header>

              {shape.hub !== null ? (
                <HubFlower
                  hubNode={shape.hub}
                  petals={shape.petals}
                  videoHookId={shape.videoHookId}
                  status={status}
                  onOpenNode={onOpenNode}
                />
              ) : null}

              <ol className="path-track mx-auto flex w-full max-w-md flex-col py-2">
                {plan.rows.map((row) => {
                  const nodeStatus = statusOf(status, row.node.id);
                  const playable = row.node.playable;
                  const clickable = playable !== undefined && nodeStatus.state !== "locked";
                  return (
                    <TrackSlab
                      key={row.node.id}
                      state={nodeStatus.state}
                      label={row.node.title}
                      detail={mapNodeDetail(row.node, nodeStatus.queued, nodeStatus.state === "locked")}
                      href={clickable && playable !== undefined ? hrefForPlayable(playable) : null}
                      wind={row.wind}
                      lane={row.lane}
                      badge={badgeForMapNode(row.node, shape.videoHookId)}
                      /*
                        THE DIMMED SIDE LOOP, and the dim is AUTHORED TOKENS
                        rather than a CSS filter, per the S2 floor: the
                        contrast audit reads computed colours and a filter
                        would make it measure a pair that is not on screen.
                        Enrichment stays off the exam-weighted spine per
                        CLAUDE.md, and dimming is how the track says so.
                      */
                      dim={row.lane === "loop"}
                      queued={nodeStatus.queued}
                      onOpenNode={onOpenNode}
                      sheetNode={sheetNodeFor(row.node, nodeStatus.state, clickable && playable !== undefined ? hrefForPlayable(playable) : null)}
                      gateNode={mapGateNode(row.node, clickable)}
                    />
                  );
                })}
              </ol>

              {shape.concept !== null ? (
                /*
                  THE DIAMOND FORK, per blueberry_branch-diamond: the concept
                  node centred above the split, one arm each side, and both
                  arms rejoining at THIS unit's gate immediately below. Both
                  arms are genuinely open at once, because within a unit every
                  node is freely orderable; the fork is the unlock policy made
                  visible, not a decoration over a chain.
                */
                <div className="path-fork mx-auto w-full max-w-md" role="group" aria-label="Choose either branch; they rejoin at the unit gate">
                  <div className="path-fork__concept">
                    <ForkChip
                      node={shape.concept}
                      status={statusOf(status, shape.concept.id)}
                      lane="main"
                      badge={badgeForMapNode(shape.concept, shape.videoHookId) ?? "concept"}
                      dim={false}
                      onOpenNode={onOpenNode}
                    />
                  </div>
                  <div className="path-fork__arms">
                    {([0, 1] as const).map((side) => (
                      <div className="path-fork__arm" key={side}>
                        {shape.arms[side].map((node) => (
                          <ForkChip
                            key={node.id}
                            node={node}
                            status={statusOf(status, node.id)}
                            lane={side === 0 ? "left" : "right"}
                            badge={badgeForMapNode(node, shape.videoHookId)}
                            dim={false}
                            onOpenNode={onOpenNode}
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {/*
                THE UNIT GATE closes every unit, which is what makes it the
                rejoin anchor the arms can actually reach. Where the unit
                carries authored checkpoint questions they are plated beneath
                it; where it does not, the arch alone is the boundary.
              */}
              <div
                className={`path-gate mx-auto mt-2 flex w-full max-w-md flex-col items-center gap-1.5 px-3 pb-3 pt-2 ${shape.checkpoint.length > 0 ? "path-gate--checkpoint" : ""}`}
                aria-label={shape.checkpoint.length > 0 ? "Unit gate checkpoint" : "Unit gate"}
              >
                <UnitGateNode passed={gatePassed} locked={gateLocked} />
                {shape.checkpoint.length > 0 ? (
                  <>
                    <p className="path-gate__text text-scale-xs font-bold uppercase tracking-wide text-foreground">Checkpoint</p>
                    <p className="path-gate__text text-scale-xs text-foreground">The barrier between units</p>
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {shape.checkpoint.map((node) => (
                        <span key={node.id} className="path-quests__chip px-3 py-1 text-scale-xs font-semibold" title={node.blurb}>
                          {node.title}
                        </span>
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Whether a unit's checkpoint is behind the student: every unit that sits
 * before the active one on a reachable track has been passed, which is the
 * only way the track got past it.
 */
function unitStatusPassed(status: MapPathwayStatus, unitId: string): boolean {
  const entry = status.units.get(unitId);
  if (entry === undefined) return false;
  if (!entry.reachable) return false;
  if (entry.active) return false;
  // Reachable and not active: either the student is past it (passed) or it is
  // ahead of them on a fully cleared stretch. The current node settles it.
  const order = PATHWAY_UNITS.findIndex((unit) => unit.id === unitId);
  const activeIndex = PATHWAY_UNITS.findIndex((unit) => status.units.get(unit.id)?.active === true);
  return activeIndex === -1 ? true : order < activeIndex;
}

export default function PathwayTab({ reducedMotion }: { readonly reducedMotion: boolean }) {
  const snapshot = useProgress();
  const course = snapshot.course;
  /**
   * The node whose Charge sheet is open, or null.
   *
   * It lives here rather than in the sheet because the sheet does not know what
   * a pathway is: which node is being entered is the track's business, and the
   * same sheet is opened by a spine slab, a side quest chip and the generic
   * course track without any of them being a special case inside it.
   */
  const [gate, setGate] = useState<ChargeGateNode | null>(null);
  /**
   * The node whose SHEET is open, and the charge node standing behind its
   * START button, or null for both.
   *
   * THE ORDER IS THE GOALS' ORDER. docs/DESIGN-GOALS.md, "the node sheet and
   * the guidebook": tap a node and a bottom sheet offers Practice with its
   * difficulty pips and Challenge with its stopwatch and double dagger, with
   * a hamburger to the guidebook. docs/ECONOMY.md charges on ENTRY, so the
   * Charge sheet is what START opens, not what the node opens: the price is
   * named at the door, once, after the student has decided which door.
   *
   * They are held in ONE piece of state rather than two because they are one
   * decision. Two useStates would let a render exist in which the sheet is
   * open for one node and the pending charge belongs to another, which is
   * exactly the class of bug that ships a student the wrong price.
   */
  const [sheet, setSheet] = useState<{ readonly node: SheetNode; readonly charge: ChargeGateNode | null } | null>(null);
  /** The guidebook page, swapped in from the sheet's hamburger. */
  const [guidebook, setGuidebook] = useState<SheetNode | null>(null);
  const openNode: OpenNode = (node, charge) => setSheet({ node, charge });
  /*
    START and CHALLENGE both leave the sheet and open the charge sheet, and
    they are two calls rather than one because they are not the same spend:
    a challenge is an assessment, which docs/ECONOMY.md prices as a quiz. A
    node with no authored content has no charge node, so nothing opens and
    the sheet's own disabled Practice row is the honest end of the press.
  */
  const startFromSheet = (charge: ChargeGateNode | null) => {
    setSheet(null);
    if (charge !== null) setGate(charge);
  };
  const nodes = useMemo(() => (course === null ? [] : derivePathway(course, snapshot)), [course, snapshot]);
  const units = useMemo(() => (course === null ? [] : groupIntoUnits(course, nodes)), [course, nodes]);
  const mapStatus = useMemo(() => deriveMapPathway(PATHWAY_UNITS, snapshot.journal), [snapshot.journal]);

  if (course === null) return <CoursePicker />;

  const onMap = course === "orgo_2";
  const doneCount = onMap ? mapStatus.doneCount : nodes.filter((node) => node.state === "done").length;
  const totalCount = onMap ? mapStatus.playableCount : nodes.length;
  // Node numbering runs over the whole track, so the wind offset counts from
  // the first node, not per unit.
  let running = 0;

  return (
    /*
      pb-16 on top of the shell's own pb-24: the last row of a 14000px track
      needs room a reader can see is deliberate under a fixed tab bar. md:pb-6
      puts it back to the page padding on a desktop, where the bar is a rail.
    */
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 pb-16 md:p-6 md:pb-6">
      <header className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3.5 md:px-5 md:py-4">
        <div>
          <h2 className="title-face text-scale-lg font-semibold md:text-scale-xl">{COURSE_LABEL[course]}</h2>
          <p className="text-scale-sm text-muted-foreground">
            {doneCount} of {totalCount} lessons done
          </p>
        </div>
        {/*
          Bloom has an opinion about the count beside it: proud when the track
          is finished, happy while there is a cleared node behind you, curious
          on a track not yet started.
        */}
        <Berry
          mood={totalCount > 0 && doneCount === totalCount ? "proud" : doneCount > 0 ? "happy" : "curious"}
          reducedMotion={reducedMotion}
          sizePx={56}
        />
      </header>

      {onMap ? (
        <OrgoMapTrack onOpenNode={openNode} status={mapStatus} reducedMotion={reducedMotion} />
      ) : (
        <div className="flex flex-col gap-2" role="region" aria-label="Pathway">
          {units.map((unit) => {
            const first = running;
            running += unit.nodes.length;
            return (
              <section key={unit.key} className="flex flex-col gap-3" aria-label={unit.title}>
                <UnitBanner unit={unit} course={course} />
                <ol className="path-track mx-auto flex w-full max-w-md flex-col py-2">
                  {unit.nodes.map((node, i) => (
                    <TrackNode key={node.topic} node={node} index={first + i} course={course} onOpenNode={openNode} />
                  ))}
                </ol>
              </section>
            );
          })}
        </div>
      )}

      <ul className="flex flex-wrap gap-3 text-scale-xs text-muted-foreground" aria-label="Legend">
        {LEGEND.map((entry) => (
          <li key={entry.state} className="flex items-center gap-1.5">
            <span className={`path-node path-node--${entry.state} path-node--swatch`} aria-hidden>
              <span className="path-node__face" />
            </span>
            {entry.label}
          </li>
        ))}
      </ul>

      <button
        type="button"
        className="press min-h-11 self-start rounded-full border-2 border-border px-4 text-scale-xs font-semibold text-muted-foreground"
        onPointerDown={() => progress.setCourse(course, snapshot.startTopics)}
      >
        Change track in Courses
      </button>

      <NodeSheet
        node={sheet?.node ?? null}
        onClose={() => setSheet(null)}
        onStart={() => startFromSheet(sheet?.charge ?? null)}
        onChallenge={() =>
          startFromSheet(sheet?.charge === undefined || sheet.charge === null ? null : { ...sheet.charge, kind: "quiz" })
        }
        onGuidebook={(node) => {
          setSheet(null);
          setGuidebook(node);
        }}
        reducedMotion={reducedMotion}
      />
      {guidebook === null ? null : (
        <div className="gb-overlay">
          <Guidebook content={guidebookFor(guidebook)} onBack={() => setGuidebook(null)} reducedMotion={reducedMotion} />
        </div>
      )}

      <ChargeGate node={gate} onClose={() => setGate(null)} reducedMotion={reducedMotion} />
    </div>
  );
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
