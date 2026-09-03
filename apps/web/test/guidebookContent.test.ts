/**
 * The guidebook drafts, over the REAL map.
 *
 * The check that carries the weight: every draft this generator can produce
 * is marked placeholder, because DESIGN-GOALS makes the copy a human-gate
 * deliverable and a draft that can pass as authored is the promotion
 * CLAUDE.md's feedback section forbids. The rest is format: the goals lock a
 * numbered worked-example strip, so the numbering is asserted consecutive
 * from 1, and the key idea must be the node's own authored blurb rather than
 * generated chemistry, which is the line between placeholder layout and
 * placeholder claims.
 */

import { describe, expect, it } from "vitest";
import { PATHWAY_UNITS } from "../src/demo/pathwayMap";
import { guidebookFor } from "../src/pathway-sheet/guidebookContent";
import { HUMAN_GATE_MARK, type SheetNode } from "../src/pathway-sheet/nodeSheetModel";

/** Every node on the owner's map, shaped the way the sheet receives one. */
function allNodes(): SheetNode[] {
  const nodes: SheetNode[] = [];
  for (const unit of PATHWAY_UNITS) {
    for (const node of unit.nodes) {
      nodes.push({
        id: node.id,
        kind: node.kind,
        state: "open",
        title: node.title,
        blurb: node.blurb,
        practiceHref: node.playable === undefined ? null : "#/x",
      });
    }
  }
  return nodes;
}

describe("guidebookFor, over all map nodes", () => {
  const nodes = allNodes();

  it("walks the real inventory, not a toy fixture", () => {
    expect(nodes.length).toBeGreaterThan(100);
  });

  it("every draft is marked placeholder and carries the gate mark", () => {
    for (const node of nodes) {
      const content = guidebookFor(node);
      expect(content.placeholder, node.id).toBe(true);
      expect(content.gateMark, node.id).toBe(HUMAN_GATE_MARK);
    }
  });

  it("titles the page with the node and keys the callout to the authored blurb", () => {
    for (const node of nodes) {
      const content = guidebookFor(node);
      expect(content.title, node.id).toBe(node.title);
      // The one chemistry sentence in a draft is the map's own authored line.
      // A generated chemistry claim here would be wrong on some node.
      expect(content.keyIdea, node.id).toBe(node.blurb);
      expect(content.intro, node.id).toContain(node.title);
    }
  });

  it("numbers the worked example consecutively from 1, with method-only captions", () => {
    for (const node of nodes) {
      const steps = guidebookFor(node).workedExample.steps;
      expect(steps.length, node.id).toBeGreaterThanOrEqual(3);
      steps.forEach((step, i) => {
        expect(step.n, `${node.id} step ${i}`).toBe(i + 1);
        expect(step.caption.length, `${node.id} step ${i}`).toBeGreaterThan(0);
      });
    }
  });

  it("badges by kind, distinctly", () => {
    const badges = new Set(
      (["spine", "branch", "gate", "boss"] as const).map(
        (kind) => guidebookFor({ id: "x", kind, state: "open", title: "T", blurb: "B", practiceHref: null }).badge,
      ),
    );
    expect(badges.size).toBe(4);
  });

  it("holds the voice: no scolding, no rhetorical questions, no em dashes", () => {
    for (const node of nodes.slice(0, 30)) {
      const content = guidebookFor(node);
      const copy = [content.intro, ...content.workedExample.steps.map((step) => step.caption)].join(" ");
      expect(copy).not.toContain("?");
      expect(copy.toLowerCase()).not.toContain("you should have");
      expect(copy).not.toMatch(/\u2014/);
    }
  });
});
