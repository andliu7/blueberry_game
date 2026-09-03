/**
 * The winding trail, as arithmetic. Pure: no React, no DOM.
 *
 * The trail is the drawn ribbon that connects the nodes, the thing the
 * reference (blueberry_r7-compiled-v2) makes the backbone of the whole tab.
 * PathScene measures where the nodes actually landed and hands the centres
 * here; this module only turns ordered points into SVG path strings, so the
 * geometry is testable without a document and the trail can never disagree
 * with the layout, because it is derived from the layout.
 *
 * LANES. Every node declares a lane:
 *
 *   main   the spine. Consecutive main points are joined directly.
 *   left / right   a diamond fork's arms. Between the two main anchors that
 *          surround them the direct main connection is SUPPRESSED and each
 *          arm is drawn from the first anchor, through its own points, to the
 *          second: the concept node above the fork and the unit gate below it
 *          are those anchors, which is the committed diamond geometry.
 *   loop   a side loop. The main trail keeps its direct connection and the
 *          loop is drawn as a detour off it and back, because an application
 *          lesson is optional and the spine must read as continuous past it.
 *
 * DONE COLOURING. The progress green is a FILL-ONLY semantic (measured:
 * 1.60:1 as a line on cream), so a done stretch is never a bare green
 * hairline: the renderer draws every segment as a wide under-stroke in the
 * edge colour with the fill colour riding on it, and this module only says
 * WHICH stretches are done. A segment is done when both of its endpoints
 * are, so the green ends at the node the student is standing on.
 */

export type TrailLane = "main" | "left" | "right" | "loop";

export interface TrailPoint {
  readonly x: number;
  readonly y: number;
  readonly lane: TrailLane;
  readonly done: boolean;
}

export interface TrailSegment {
  readonly d: string;
  readonly done: boolean;
  /** Loop detours render dimmed, like the lessons they lead to. */
  readonly loop: boolean;
}

interface Chain {
  readonly points: readonly TrailPoint[];
  readonly loop: boolean;
}

/**
 * The smallest vertical tangent a full-size segment gets.
 *
 * It is a parameter rather than a constant because the F1 pill draws the SAME
 * shape at a twentieth of the size: 24px of grip on a 20px row pitch is not a
 * curve, it is a loop, and the miniature has to be the unit's real shape and
 * not a knot of it.
 */
export const TRAIL_GRIP_PX = 24;

/** A smooth vertical-tangent cubic between two points, boundaryPath's idiom. */
function cubic(from: TrailPoint, to: TrailPoint, minGrip: number): string {
  const grip = Math.max(minGrip, Math.abs(to.y - from.y) / 2);
  return `M ${from.x.toFixed(1)} ${from.y.toFixed(1)} C ${from.x.toFixed(1)} ${(from.y + grip).toFixed(1)}, ${to.x.toFixed(1)} ${(to.y - grip).toFixed(1)}, ${to.x.toFixed(1)} ${to.y.toFixed(1)}`;
}

/**
 * Points, in document order, to drawable segments.
 *
 * Total: any input yields a well formed list, and fewer than two points yield
 * an empty one. Points are consumed in the order given, which is the order
 * the nodes sit in the document; nothing here sorts, because the layout is
 * the authority on order.
 */
export function trailSegments(
  points: readonly TrailPoint[],
  minGrip: number = TRAIL_GRIP_PX,
): readonly TrailSegment[] {
  const chains: Chain[] = [];
  const mains = points.filter((point) => point.lane === "main");
  if (mains.length === 0) return [];

  let mainIndex = -1;
  let pending: TrailPoint[] = [];
  for (const point of points) {
    if (point.lane !== "main") {
      pending.push(point);
      continue;
    }
    const previous = mainIndex >= 0 ? mains[mainIndex]! : null;
    mainIndex += 1;
    if (previous === null) {
      pending = [];
      continue;
    }
    const arms = pending.filter((p) => p.lane === "left" || p.lane === "right");
    const loops = pending.filter((p) => p.lane === "loop");
    if (arms.length > 0) {
      for (const lane of ["left", "right"] as const) {
        const armPoints = arms.filter((p) => p.lane === lane);
        if (armPoints.length > 0) chains.push({ points: [previous, ...armPoints, point], loop: false });
      }
    } else {
      chains.push({ points: [previous, point], loop: false });
    }
    if (loops.length > 0) chains.push({ points: [previous, ...loops, point], loop: true });
    pending = [];
  }

  const segments: TrailSegment[] = [];
  for (const chain of chains) {
    for (let i = 1; i < chain.points.length; i += 1) {
      const from = chain.points[i - 1]!;
      const to = chain.points[i]!;
      segments.push({
        d: cubic(from, to, minGrip),
        // A loop detour never reads as progress: it is enrichment, off the
        // exam-weighted spine, and colouring it green would claim otherwise.
        done: !chain.loop && from.done && to.done,
        loop: chain.loop,
      });
    }
  }
  return segments;
}

/* -------------------------------------------------------------------------- */
/* The F1 track map: the unit's REAL shape, at pill size.                      */
/* -------------------------------------------------------------------------- */

/**
 * One node of the unit the pill is drawing, in the order the track lays it.
 *
 * `wind` is the ABSOLUTE offset the full-size row is drawn at, not an index
 * into a cycle. The attempt-2 pill sampled trackWind(0..count-1) while the
 * track sampled trackWind(first + i) off a running GLOBAL index, and WIND_CYCLE
 * has period four, so the pill drew the unit's real shape only when that unit
 * happened to start on a multiple of four: the critic measured the outline
 * identical standing in units 1, 3 and 9. Handing the offsets in rather than a
 * cycle function removes the class of bug, not just the instance.
 */
export interface TrackMapNode {
  readonly wind: number;
  readonly lane: TrailLane;
  readonly done: boolean;
}

export interface TrackMapModel {
  /** Drawable segments, carrying their own done and loop flags. */
  readonly segments: readonly TrailSegment[];
  /** One point per input node, in the same order; ticks and the berry ride these. */
  readonly points: readonly { readonly x: number; readonly y: number }[];
}

/** The grip a pill-sized segment gets; see TRAIL_GRIP_PX for why it differs. */
export const PILL_GRIP_PX = 5;

/** The widest wind step the full-size track uses, which sets the pill's scale. */
export const WIND_EXTENT = 1.7;

/**
 * Rows for a unit's nodes: a diamond's two arms SHARE rows.
 *
 * Without this the pill stacks a fork's arms one after another and the
 * miniature reads as a longer column rather than as a split, which is the
 * whole thing the outline is supposed to say. A left node and the right node
 * beside it get the same y and opposite x, so the shape widens and closes
 * exactly where the track does.
 */
export function trackMapRows(nodes: readonly TrackMapNode[]): { readonly rows: readonly number[]; readonly count: number } {
  const rows: number[] = new Array<number>(nodes.length).fill(0);
  let row = 0;
  let left = -1;
  let right = -1;
  const closeArms = () => {
    if (left < 0 && right < 0) return;
    row = Math.max(row, left, right);
    left = -1;
    right = -1;
  };
  nodes.forEach((node, index) => {
    if (node.lane === "left") {
      if (left < 0) left = row;
      rows[index] = left;
      left += 1;
      return;
    }
    if (node.lane === "right") {
      if (right < 0) right = row;
      rows[index] = right;
      right += 1;
      return;
    }
    closeArms();
    rows[index] = row;
    row += 1;
  });
  closeArms();
  return { rows, count: Math.max(1, row) };
}

/**
 * The miniature of a unit's real path shape.
 *
 * It runs the SAME trailSegments the full-size scene runs, over the same lane
 * vocabulary, so the pill cannot draw a shape the track does not have: a
 * diamond unit gets a diamond in the pill, a hub unit's spine gets its column,
 * and a unit with a side loop gets its detour. The constraint in DESIGN-GOALS
 * is that unit shapes stay simple enough to read at pill size, and deriving
 * both from one function is what makes the outline "the unit's REAL path
 * shape" rather than an icon of one.
 */
export function trackMapModel(
  nodes: readonly TrackMapNode[],
  width: number,
  height: number,
): TrackMapModel {
  if (nodes.length < 1 || width <= 0 || height <= 0) return { segments: [], points: [] };
  const { rows, count } = trackMapRows(nodes);
  const padY = Math.min(12, height * 0.08);
  const centreX = width / 2;
  // Wind steps run to WIND_EXTENT either side; scale so the widest stays in.
  const amplitude = Math.max(0, width / 2 - 3) / WIND_EXTENT;
  const step = count <= 1 ? 0 : (height - 2 * padY) / (count - 1);
  const points = nodes.map((node, index) => ({
    x: Number((centreX + node.wind * amplitude).toFixed(2)),
    y: Number((padY + rows[index]! * step).toFixed(2)),
  }));
  const trail: TrailPoint[] = points.map((point, index) => ({
    x: point.x,
    y: point.y,
    lane: nodes[index]!.lane,
    done: nodes[index]!.done,
  }));
  return { segments: trailSegments(trail, PILL_GRIP_PX), points };
}
