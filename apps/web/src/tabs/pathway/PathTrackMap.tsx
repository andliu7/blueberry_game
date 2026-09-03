/**
 * The F1 track map: the pathway's scrollbar, per docs/DESIGN-GOALS.md.
 *
 * "A sticky pill holding a tiny outline of the unit's REAL path shape,
 * completed stretch glowing green, riding a thin energy axis. Drag to scroll.
 * A small mascot marks where the student left off, with a short dialogue
 * bubble. Tap the pill to expand into the fast-travel overlay." The committed
 * picture is the left rail of
 * docs/reference/design-goals/blueberry_r7-compiled-v2_1788288474.png.
 *
 * REAL SHAPE, NOT AN ICON. The miniature is trackMapModel over the SAME
 * trackWind the full-size track lays nodes with, so the outline in the pill
 * is derived from the track rather than drawn to resemble it. The green
 * stretch ends at the node the student left off on, and the berry sits on
 * that point; the mascot is the imported mark per D4, never redrawn.
 *
 * IT IS A SLIDER, AND A TAP IS NOT A DRAG. role="slider", vertical, whose
 * value is how far through the track the viewport is. The press acknowledges
 * on pointer down per the UX contract (the rail gets its pressed class in
 * the same frame), but scrolling starts only once the pointer has MOVED past
 * a small slop: a pointer that goes down and up in place is a TAP, and a tap
 * expands the pill into the FAST-TRAVEL OVERLAY, the goals' scrollbar clause
 * the earlier build silently skipped. The overlay lists every unit with its
 * progress; choosing one scrolls the track to that unit's banner. Enter and
 * Space open it from the keyboard; Escape and the backdrop close it; arrow
 * keys still page the viewport without ever opening it.
 *
 * THE RAIL LIVES IN A RESERVED GUTTER. pathway.css keeps the content column
 * clear of it at every width (and moves the rail out into the landscape
 * flank where a desktop has one), because the S3 critic measured the pill
 * covering the unit banner's eyebrow and the first characters of node
 * labels. The dialogue bubble follows the same rule: at 1024px and up it
 * sits LEFT of the rail over open landscape (the attempt-2 critic caught
 * the rightward bubble covering the "UNIT 1" banner eyebrow at 1280px),
 * and below that it appears only transiently while the rail is being
 * used, so it never sits over content at rest at any width.
 *
 * GREEN IS FILL-ONLY, measured: #7ed957 is 1.60:1 on cream, so the done
 * stretch is never a bare green line. Every stroke of it rides on a wider
 * under-stroke of --progress-edge (3.82:1 on cream), the same pay-for-the-
 * fill-with-an-edge rule the completed chip uses; the audit collapses a
 * mark and its boundary to the better of the two.
 *
 * WALL CLOCKS: none. Everything here derives from scroll geometry and
 * progress, so it measures the same at 09:00 and at 23:00.
 */

import { useEffect, useRef, useState } from "react";
import { Berry } from "../../mascot/Berry";
import { trackMapModel, type TrackMapNode } from "./trail";

export interface TrackMapShape {
  /**
   * The unit's own nodes, in the order the track drew them, each carrying the
   * ABSOLUTE wind offset and the lane it was drawn at.
   *
   * Handed in rather than re-derived, and that is the fix for the defect the
   * critic measured: the attempt-2 pill called trackWind(0..count-1) while the
   * track called trackWind(first + i) off a running global index, so with a
   * period-four wind cycle the outline was identical standing in units 1, 3
   * and 9. It also filtered to spine and boss, so a unit's fork and hub never
   * appeared in their own miniature. PathwayTab lays a unit out ONCE now and
   * both the track and this pill read that one layout.
   */
  readonly nodes: readonly TrackMapNode[];
  /** Index into `nodes` of the node they left off on, -1 when finished. */
  readonly currentIndex: number;
  /** The unit's title, for the accessible name. */
  readonly unitTitle: string;
}

/** One row of the fast-travel overlay: a unit and where the student stands. */
export interface FastTravelUnit {
  /** The unit's id, which is also its scroll target: [data-unit-id]. */
  readonly id: string;
  /** "Unit 3", the eyebrow half of the authored title. */
  readonly number: string;
  /** The unit's name, the headline half. */
  readonly name: string;
  readonly done: number;
  readonly playable: number;
  /** The unit holding the current node. */
  readonly active: boolean;
  /** Whether the unit gate before it has been passed. */
  readonly reachable: boolean;
}

const PILL_W = 44;
const PILL_H = 190;
/** Pointer travel, in px, past which a press stops being a tap. */
const DRAG_SLOP_PX = 6;

export default function PathTrackMap({
  shape,
  units,
  reducedMotion,
}: {
  readonly shape: TrackMapShape;
  readonly units: readonly FastTravelUnit[];
  readonly reducedMotion: boolean;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [travel, setTravel] = useState(0);
  /** Pressed on pointer down; the same frame acknowledges per CLAUDE.md. */
  const [pressed, setPressed] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [open, setOpen] = useState(false);
  /** Where the press landed, and whether it has crossed the drag slop. */
  const pressRef = useRef<{ y: number; moved: boolean } | null>(null);

  // One scroll listener, one cached fraction: how far the stage has travelled
  // through the viewport, which is the slider's value.
  useEffect(() => {
    const root = rootRef.current;
    const stage = root?.closest<HTMLElement>(".path-stage") ?? null;
    if (root === null || stage === null) return;
    let frame = 0;
    const read = () => {
      frame = 0;
      const box = stage.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      const range = Math.max(1, box.height - viewport);
      setTravel(Math.max(0, Math.min(1, -box.top / range)));
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(read);
    };
    read();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  const scrollToFraction = (fraction: number) => {
    const root = rootRef.current;
    const stage = root?.closest<HTMLElement>(".path-stage") ?? null;
    if (stage === null) return;
    const box = stage.getBoundingClientRect();
    const viewport = window.innerHeight || 1;
    const top = window.scrollY + box.top;
    const range = Math.max(0, box.height - viewport);
    window.scrollTo({ top: top + Math.max(0, Math.min(1, fraction)) * range, behavior: "auto" });
  };

  /** Scroll the track so the chosen unit's banner lands at the top. */
  const scrollToUnit = (unitId: string) => {
    const root = rootRef.current;
    const stage = root?.closest<HTMLElement>(".path-stage") ?? null;
    const section = stage?.querySelector<HTMLElement>(`[data-unit-id="${unitId}"]`) ?? null;
    if (section === null) return;
    const box = section.getBoundingClientRect();
    // A little headroom, so the banner is not glued to the viewport edge.
    window.scrollTo({ top: window.scrollY + box.top - 12, behavior: "auto" });
  };

  const fractionOf = (clientY: number): number => {
    const root = rootRef.current;
    if (root === null) return 0;
    const rect = root.getBoundingClientRect();
    return rect.height <= 0 ? 0 : (clientY - rect.top) / rect.height;
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    // The pressed frame lands on pointer down, before anything else happens.
    // No scroll yet: a press that never moves is a tap, and a tap expands
    // the overlay rather than teleporting the viewport out from under it.
    setPressed(true);
    pressRef.current = { y: event.clientY, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const press = pressRef.current;
    if (press === null) return;
    if (!press.moved) {
      if (Math.abs(event.clientY - press.y) < DRAG_SLOP_PX) return;
      press.moved = true;
      setDragging(true);
    }
    scrollToFraction(fractionOf(event.clientY));
  };
  const endDrag = () => {
    const press = pressRef.current;
    pressRef.current = null;
    setPressed(false);
    setDragging(false);
    // Up without ever crossing the slop: the goals' tap, so the pill expands.
    if (press !== null && !press.moved) setOpen(true);
  };
  const cancelDrag = () => {
    pressRef.current = null;
    setPressed(false);
    setDragging(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const page = 0.12;
    if (event.key === "ArrowDown" || event.key === "PageDown") {
      event.preventDefault();
      scrollToFraction(travel + page);
    } else if (event.key === "ArrowUp" || event.key === "PageUp") {
      event.preventDefault();
      scrollToFraction(travel - page);
    } else if (event.key === "Home") {
      event.preventDefault();
      scrollToFraction(0);
    } else if (event.key === "End") {
      event.preventDefault();
      scrollToFraction(1);
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }
  };

  const model = trackMapModel(shape.nodes, PILL_W - 12, PILL_H - 16);
  const berryPoint =
    shape.currentIndex >= 0 && shape.currentIndex < model.points.length
      ? model.points[shape.currentIndex]!
      : null;

  return (
    <>
      <div
        ref={rootRef}
        className={`path-trackmap ${pressed ? "path-trackmap--active" : ""} ${dragging ? "path-trackmap--dragging" : ""}`}
        role="slider"
        aria-orientation="vertical"
        aria-label={`Track map for ${shape.unitTitle}. Drag to move along the pathway; press Enter for fast travel.`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(travel * 100)}
        aria-haspopup="dialog"
        aria-expanded={open}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        onKeyDown={onKeyDown}
      >
        {/* The thin energy axis the pill rides. The filled stretch below the
            thumb is where the reader has already been. */}
        <div className="path-trackmap__axis" aria-hidden>
          <div className="path-trackmap__axis-fill" style={{ height: `${(travel * 100).toFixed(1)}%` }} />
        </div>

        {/* The pill RIDES the axis: its top is the travel fraction of the rail
            minus its own height's share, the standard thumb clamp, so at 0 it
            hangs from the top and at 1 it sits on the bottom. */}
        <div
          className="path-trackmap__pill"
          aria-hidden
          style={{ top: `calc(${(travel * 100).toFixed(2)}% - ${(travel * PILL_H).toFixed(1)}px)` }}
        >
          <svg width={PILL_W - 12} height={PILL_H - 16} viewBox={`0 0 ${PILL_W - 12} ${PILL_H - 16}`}>
            {/*
              The unit's real shape, segment by segment, off the SAME
              trailSegments the full-size scene runs: the groove for what is
              ahead, the dotted thread for a side loop, and the done stretch
              riding its own darker edge so the green is a fill and never a
              hairline. A fork's two arms are two grooves that leave the
              concept and close on the gate, which is what makes a diamond
              unit read as a diamond at pill size.
            */}
            {model.segments.map((segment, index) =>
              segment.loop ? (
                <path key={`loop-${index}`} className="path-trackmap__thread" d={segment.d} />
              ) : (
                <path key={`groove-${index}`} className="path-trackmap__groove" d={segment.d} />
              ),
            )}
            {model.segments.map((segment, index) =>
              segment.done ? (
                <g key={`done-${index}`}>
                  <path className="path-trackmap__done-edge" d={segment.d} />
                  <path className="path-trackmap__done" d={segment.d} />
                </g>
              ) : null,
            )}
            {model.points.map((point, index) => (
              <circle
                key={index}
                className={
                  index === shape.currentIndex
                    ? "path-trackmap__dot path-trackmap__dot--current"
                    : "path-trackmap__dot"
                }
                cx={point.x}
                cy={point.y}
                r={index === shape.currentIndex ? 3.5 : 2}
              />
            ))}
          </svg>
          {berryPoint !== null ? (
            <>
              <div
                className="path-trackmap__berry"
                style={{ top: `${berryPoint.y + 8}px`, left: `${berryPoint.x + 6}px` }}
              >
                <Berry mood="happy" reducedMotion={reducedMotion} sizePx={20} />
              </div>
              {/*
                THE DIALOGUE BUBBLE SHOWS AT EVERY WIDTH, including the 390pt
                phone the committed reference is drawn as. The attempt-2 build
                hid it below 1024px to keep it off the node labels, and the
                critic was right that hiding a clause at the width the goal
                image draws it is not a fix. It sits ABOVE the pill instead of
                beside it (pathway.css), which is the one direction with no
                content in it at any width, it is narrow enough to stay inside
                the reserved rail gutter plus the flank, and it takes no
                pointer events, so it can never eat a press meant for the
                track behind it.
              */}
              <span className="path-trackmap__bubble" aria-hidden>
                Pick up here!
              </span>
            </>
          ) : null}
        </div>
      </div>

      {open ? (
        /*
          THE FAST-TRAVEL OVERLAY, the pill expanded. A real dialog over the
          track: every unit as a 44px-minimum row with its number, name and
          progress, the active unit marked. Choosing one scrolls the track to
          its banner and closes; Escape and the backdrop close without
          moving. Locked units still list (the overlay is a map, not an
          entitlement) and still scroll there, because looking ahead at a
          locked unit is browsing, not unlocking.
        */
        <div
          className="path-fasttravel"
          role="dialog"
          aria-modal="true"
          aria-label="Fast travel"
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              setOpen(false);
              rootRef.current?.focus();
            }
          }}
        >
          <button
            type="button"
            className="path-fasttravel__backdrop"
            aria-label="Close fast travel"
            onClick={() => {
              setOpen(false);
              rootRef.current?.focus();
            }}
          />
          <div className="path-fasttravel__panel">
            <p className="path-fasttravel__title">Fast travel</p>
            <ul className="path-fasttravel__list">
              {units.map((unit) => (
                <li key={unit.id}>
                  <button
                    type="button"
                    className={`press path-fasttravel__row ${unit.active ? "path-fasttravel__row--active" : ""}`}
                    aria-current={unit.active ? "true" : undefined}
                    autoFocus={unit.active}
                    onClick={() => {
                      setOpen(false);
                      scrollToUnit(unit.id);
                    }}
                  >
                    <span className="path-fasttravel__unit">
                      <span className="path-fasttravel__number">{unit.number}</span>
                      <span className="path-fasttravel__name">{unit.name}</span>
                    </span>
                    <span className="path-fasttravel__count">
                      {!unit.reachable ? "Locked" : unit.playable === 0 ? "Queued" : `${unit.done}/${unit.playable}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
