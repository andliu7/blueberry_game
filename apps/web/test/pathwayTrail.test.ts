/**
 * The trail's arithmetic: the drawn ribbon, the diamond fork's geometry, the
 * F1 pill's miniature, and the terrace bands. All pure functions over points
 * and numbers, so the geometry the scene draws is testable without a
 * document, which is the same reason terrain.ts and pathwayLayout.ts are
 * tested and PathScene.tsx is not.
 *
 * The rules asserted here are the committed ones:
 *  - blueberry_branch-diamond_1788284291.png: the fork's arms leave the
 *    concept node and REJOIN at the unit gate; no direct spine connection
 *    crosses the diamond
 *  - the FILL-ONLY green (docs/DESIGN-GOALS.md): trail.ts only ever labels a
 *    stretch done when both endpoints are, so the green ends at the node the
 *    student stands on, and a loop detour is never done because enrichment
 *    is not progress
 *  - the track-map pill draws the unit's REAL shape: same wind function,
 *    completed stretch a literal prefix of the whole
 */

import { describe, expect, it } from "vitest";
import { trailSegments, trackMapModel, type TrackMapNode, type TrailPoint } from "../src/tabs/pathway/trail";
import { trackWind } from "../src/tabs/pathway/pathwayLayout";
import { terracePath, TERRACE_STEPS } from "../src/tabs/pathway/terrain";

function point(x: number, y: number, lane: TrailPoint["lane"], done = false): TrailPoint {
  return { x, y, lane, done };
}

/** First and last coordinate pair of a path string, for endpoint checks. */
function endpoints(d: string): { from: [number, number]; to: [number, number] } {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  return {
    from: [numbers[0]!, numbers[1]!],
    to: [numbers[numbers.length - 2]!, numbers[numbers.length - 1]!],
  };
}

describe("trailSegments", () => {
  it("returns nothing for fewer than two points, and never throws on any input", () => {
    expect(trailSegments([])).toEqual([]);
    expect(trailSegments([point(0, 0, "main")])).toEqual([]);
    expect(trailSegments([point(0, 0, "loop"), point(1, 1, "left")])).toEqual([]);
  });

  it("joins consecutive main points directly, one segment per gap", () => {
    const segments = trailSegments([point(0, 0, "main"), point(40, 100, "main"), point(-40, 200, "main")]);
    expect(segments).toHaveLength(2);
    expect(segments.every((segment) => !segment.loop)).toBe(true);
    expect(endpoints(segments[0]!.d).from).toEqual([0, 0]);
    expect(endpoints(segments[1]!.d).to).toEqual([-40, 200]);
  });

  it("draws the diamond: each arm runs concept to arm to gate, and the direct connection is suppressed", () => {
    const concept = point(0, 0, "main");
    const left = point(-60, 100, "left");
    const right = point(60, 100, "right");
    const gate = point(0, 200, "main");
    const segments = trailSegments([concept, left, right, gate]);
    // Two arms of two segments each; no fifth segment joining 0,0 to 0,200.
    expect(segments).toHaveLength(4);
    const direct = segments.find((segment) => {
      const { from, to } = endpoints(segment.d);
      return from[0] === 0 && from[1] === 0 && to[0] === 0 && to[1] === 200;
    });
    expect(direct).toBeUndefined();
    // Both arms leave the concept and both rejoin at the gate.
    const froms = segments.map((segment) => endpoints(segment.d).from.join(","));
    const tos = segments.map((segment) => endpoints(segment.d).to.join(","));
    expect(froms.filter((from) => from === "0,0")).toHaveLength(2);
    expect(tos.filter((to) => to === "0,200")).toHaveLength(2);
  });

  it("keeps the spine continuous past a side loop and draws the detour off it and back", () => {
    const a = point(0, 0, "main");
    const detour = point(90, 60, "loop");
    const b = point(0, 120, "main");
    const segments = trailSegments([a, detour, b]);
    expect(segments).toHaveLength(3);
    const direct = segments.filter((segment) => !segment.loop);
    const loops = segments.filter((segment) => segment.loop);
    expect(direct).toHaveLength(1);
    expect(loops).toHaveLength(2);
  });

  it("marks a stretch done only when BOTH endpoints are: the green ends at the node the student stands on", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(40, 100, "main", true),
      point(-40, 200, "main", false),
    ]);
    expect(segments.map((segment) => segment.done)).toEqual([true, false]);
  });

  it("never colours a loop detour done, because enrichment is not progress", () => {
    const segments = trailSegments([
      point(0, 0, "main", true),
      point(90, 60, "loop", true),
      point(0, 120, "main", true),
    ]);
    for (const segment of segments.filter((entry) => entry.loop)) {
      expect(segment.done).toBe(false);
    }
  });
});

describe("trackMapModel, the pill's miniature", () => {
  /** A plain winding unit at the absolute wind offsets the track would use. */
  function column(count: number, from: number, doneUpTo: number): TrackMapNode[] {
    return Array.from({ length: count }, (_, i) => ({
      wind: trackWind(from + i),
      lane: "main" as const,
      done: i <= doneUpTo,
    }));
  }

  it("returns an empty model for a degenerate box or an empty unit", () => {
    expect(trackMapModel([], 32, 170)).toEqual({ segments: [], points: [] });
    expect(trackMapModel(column(5, 0, 1), 0, 170)).toEqual({ segments: [], points: [] });
  });

  it("keeps every node dot inside the pill's box, whatever the wind does", () => {
    const width = 32;
    const height = 170;
    const model = trackMapModel(column(9, 0, 3), width, height);
    expect(model.points).toHaveLength(9);
    for (const dot of model.points) {
      expect(dot.x).toBeGreaterThanOrEqual(0);
      expect(dot.x).toBeLessThanOrEqual(width);
      expect(dot.y).toBeGreaterThanOrEqual(0);
      expect(dot.y).toBeLessThanOrEqual(height);
    }
  });

  /*
   * THE REGRESSION THE CRITIC MEASURED. The pill used to sample
   * trackWind(0..count-1) while the track sampled trackWind(first + i) off a
   * running GLOBAL index, and WIND_CYCLE has period four, so the outline was
   * visually identical standing in units whose start indices differed by a
   * multiple of four. Absolute offsets are handed in now, and this is the
   * assertion that says two units starting at different phases draw
   * different shapes.
   */
  it("draws a DIFFERENT shape for a unit that starts at a different point in the wind cycle", () => {
    const atZero = trackMapModel(column(5, 0, 1), 32, 170);
    const atOne = trackMapModel(column(5, 1, 1), 32, 170);
    expect(atOne.points.map((p) => p.x)).not.toEqual(atZero.points.map((p) => p.x));
  });

  it("puts a fork's two arms on the SAME rows, so a diamond unit reads as a diamond at pill size", () => {
    const nodes: TrackMapNode[] = [
      { wind: 0, lane: "main", done: true },
      { wind: -1.15, lane: "left", done: false },
      { wind: 1.15, lane: "right", done: false },
      { wind: 0, lane: "main", done: false },
    ];
    const model = trackMapModel(nodes, 32, 170);
    expect(model.points[1]!.y).toBe(model.points[2]!.y);
    expect(model.points[1]!.x).toBeLessThan(model.points[2]!.x);
    // Concept, two arms, gate: four rows collapse to three, and the two arm
    // chains are two segments each rather than one chain through both.
    expect(model.points[3]!.y).toBeGreaterThan(model.points[1]!.y);
    expect(model.segments).toHaveLength(4);
  });

  it("marks a done stretch only where both ends are done, and never marks a loop done", () => {
    const nodes: TrackMapNode[] = [
      { wind: 0.85, lane: "main", done: true },
      { wind: -2.55, lane: "loop", done: true },
      { wind: 1.7, lane: "main", done: true },
      { wind: -0.85, lane: "main", done: false },
    ];
    const model = trackMapModel(nodes, 32, 170);
    expect(model.segments.filter((segment) => segment.loop).every((segment) => !segment.done)).toBe(true);
    expect(model.segments.filter((segment) => segment.done)).toHaveLength(1);
  });
});

describe("terracePath, the stepping hills", () => {
  /** Every y that appears as a curve endpoint, in drawing order. */
  function stepYs(d: string): number[] {
    // Each cubic ends at "toX nextY"; take the final pair of every C command.
    return d
      .split(" C ")
      .slice(1)
      .map((command) => {
        const numbers = command.split("Z")[0]!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        return numbers[5]!;
      });
  }

  it("only ever steps DOWN: the goals' terraces descend, never climb", () => {
    for (let seed = 0; seed < 8; seed += 1) {
      const ys = stepYs(terracePath(100, 400, 390, seed));
      expect(ys).toHaveLength(TERRACE_STEPS);
      let previous = 100;
      for (const y of ys) {
        expect(y).toBeGreaterThan(previous);
        previous = y;
      }
    }
  });

  it("closes into a fillable band that starts at the given top", () => {
    const d = terracePath(120, 300, 390, 2);
    expect(d.startsWith("M ")).toBe(true);
    expect(d.trimEnd().endsWith("Z")).toBe(true);
    const numbers = d.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    expect(numbers[1]).toBe(120);
  });

  it("alternates direction by seed parity, so the run reads as switchbacks", () => {
    const even = terracePath(0, 100, 390, 0);
    const odd = terracePath(0, 100, 390, 1);
    const firstX = (d: string) => d.match(/-?\d+(?:\.\d+)?/g)!.map(Number)[0]!;
    // Even seeds start at the left bleed, odd seeds at the right.
    expect(firstX(even)).toBeLessThan(0);
    expect(firstX(odd)).toBeGreaterThan(390);
  });
});
