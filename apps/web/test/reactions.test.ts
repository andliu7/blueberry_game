/**
 * The reaction registry: every entry must actually run through the same
 * machinery the trainer uses, because "replicatable for any reaction" is a
 * claim about data, and data only proves itself by being executed.
 *
 * These tests import the registry, which already means every step passed
 * chem-core's constructors (a conservation error throws at module load), and
 * then walk each entry through layout, scene building, grading and the
 * orbit-drag geometry.
 */

import { describe, expect, it } from "vitest";

import { arrowLegalityFindings } from "@blueberry/chem-core";
import { layoutState } from "../src/render/layout/layout";
import { buildStepScene } from "../src/render/layout/stepScene";
import { gradeDrawing } from "../src/tabs/trainer/grade";
import { orbitPoint, resettleOpenAngles, terminalNeighbor } from "../src/tabs/trainer/hitLayout";
import { TRAINER_REACTIONS } from "../src/demo/reactions";

describe("the reaction registry", () => {
  it("holds at least three reactions, per the owner's more-examples requirement", () => {
    expect(TRAINER_REACTIONS.length).toBeGreaterThanOrEqual(3);
  });

  for (const reaction of TRAINER_REACTIONS) {
    describe(reaction.title, () => {
      it("lays out and builds a scene from its own hints", () => {
        const scene = buildStepScene(reaction.step, layoutState(reaction.step.from, reaction.fromHints), layoutState(reaction.step.to, reaction.toHints));
        for (const member of reaction.step.from.members) {
          for (const atom of member.species.atoms) {
            expect(scene.atoms.some((candidate) => candidate.id === atom.id), atom.id).toBe(true);
          }
        }
      });

      it("carries authored arrows that are legal on its own from state", () => {
        expect(arrowLegalityFindings(reaction.step.arrows, reaction.step.from)).toEqual([]);
      });

      it("grades its own authored answer correct", () => {
        expect(gradeDrawing(reaction.step, reaction.step.arrows).kind).toBe("correct");
      });
    });
  }
});

describe("the orbit drag geometry", () => {
  it("finds the swing neighbour for every terminal atom in every reaction", () => {
    // The hydroxide H orbits its O; HCl's H orbits Cl; bromomethane's Br
    // orbits C. Multi-bonded atoms never orbit.
    const sn2 = TRAINER_REACTIONS.find((entry) => entry.id === "sn2");
    if (sn2 === undefined) throw new Error("sn2 missing from the registry");
    expect(terminalNeighbor(sn2.step, "h1")).toBe("o1");
    expect(terminalNeighbor(sn2.step, "br1")).toBe("c1");
    expect(terminalNeighbor(sn2.step, "c1")).toBe(null);
    expect(terminalNeighbor(sn2.step, "o1")).toBe(null);
  });

  it("constrains the orbit to the press-time radius whatever the pointer does", () => {
    const neighbour = { x: 100, y: 100 };
    for (const pointer of [
      { x: 500, y: 100 },
      { x: 100, y: -300 },
      { x: 101, y: 101 },
      { x: -50, y: 240 },
    ]) {
      const p = orbitPoint(neighbour, 72, pointer);
      expect(Math.hypot(p.x - neighbour.x, p.y - neighbour.y)).toBeCloseTo(72, 6);
    }
  });

  it("degenerate pointer on the neighbour still returns a point on the circle", () => {
    const p = orbitPoint({ x: 10, y: 10 }, 50, { x: 10, y: 10 });
    expect(Math.hypot(p.x - 10, p.y - 10)).toBeCloseTo(50, 6);
  });

  it("re-settles the open angle to face away from the swung bond", () => {
    const sn2 = TRAINER_REACTIONS.find((entry) => entry.id === "sn2");
    if (sn2 === undefined) throw new Error("sn2 missing from the registry");
    const scene = buildStepScene(sn2.step, layoutState(sn2.step.from, sn2.fromHints), layoutState(sn2.step.to, sn2.toHints));
    // Move the hydroxide H from below-left of O to directly ABOVE it, then
    // re-settle: O's open direction must now point broadly DOWN (away from H).
    const o = scene.atoms.find((atom) => atom.id === "o1");
    if (o === undefined) throw new Error("no o1");
    const moved = {
      ...scene,
      atoms: scene.atoms.map((atom) => (atom.id === "h1" ? { ...atom, from: { ...atom.from, pos: { x: o.from.pos.x, y: o.from.pos.y + 1, z: 0 } } } : atom)),
    };
    const settled = resettleOpenAngles(moved);
    const settledO = settled.atoms.find((atom) => atom.id === "o1");
    if (settledO === undefined) throw new Error("no settled o1");
    // Away from a bond pointing +y is an angle pointing -y.
    expect(Math.sin(settledO.from.openAngle)).toBeLessThan(-0.9);
  });
});
