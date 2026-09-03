/**
 * Guidebook content: the placeholder generator, marked for the human gate.
 *
 * docs/DESIGN-GOALS.md locks the FORMAT: a text-and-image explainer, a
 * key-idea callout card, and a numbered worked-example strip (the
 * worked-example emphasis from docs/LEARNING-SCIENCE.md given a surface).
 * The COPY is explicitly not this phase's deliverable: it is placeholder,
 * marked as such, and it goes through the human gate before a student reads
 * it as authored. So this file generates a complete, honest draft for any
 * node on the map, every draft carries `placeholder: true`, and the page
 * renders the HUMAN_GATE_MARK pill so nobody can mistake a draft for a
 * reviewed lesson. A generated explanation is never promoted to authored by
 * accident; that promotion is exactly what CLAUDE.md's feedback section
 * forbids.
 *
 * The worked-example steps are STUDY METHOD, not chemistry claims: they say
 * how to work a problem of this node's shape, not what this reaction does.
 * That is deliberate. A generic mechanism sentence attached to, say, a
 * nomenclature node would be wrong chemistry, and wrong chemistry in a draft
 * is still wrong chemistry. The one chemistry sentence a draft carries is the
 * node's own authored blurb, which the map already shows students today.
 */

import { HUMAN_GATE_MARK, type SheetNode, type SheetNodeKind } from "./nodeSheetModel";

/** Which little structure the strip draws for a step. Art direction, not chemistry. */
export type StepGlyph = "substrate" | "arrows" | "product";

export interface WorkedStep {
  /** 1-based, consecutive. The strip numbers them and the tests hold it. */
  readonly n: number;
  readonly caption: string;
  readonly glyph: StepGlyph;
}

export interface GuidebookContent {
  /**
   * Literally true for every draft this file can produce. When authored copy
   * lands (post human gate), it arrives as data with this flag false, and the
   * draft pill disappears with it.
   */
  readonly placeholder: boolean;
  /** The visible mark on a placeholder page. One string, shared with the tests. */
  readonly gateMark: string;
  readonly title: string;
  /** The pill beside the title: the node's kind in the sheet's own words. */
  readonly badge: string;
  /** Two or three sentences above the figure. Content face, per the goals. */
  readonly intro: string;
  /** The key-idea callout card's body. The node's own authored blurb leads. */
  readonly keyIdea: string;
  readonly workedExample: {
    readonly heading: string;
    readonly steps: readonly WorkedStep[];
  };
}

const BADGE: Record<SheetNodeKind, string> = {
  spine: "Reaction",
  branch: "Side quest",
  gate: "Checkpoint",
  boss: "Boss",
};

/**
 * The method steps. Universally true for any graded problem in this product:
 * find what the prompt points at, do the work in small steps, then check the
 * books balance. The third one is CLAUDE.md's conservation rule said to a
 * student instead of to a validator.
 */
const METHOD_STEPS: readonly { caption: string; glyph: StepGlyph }[] = [
  { caption: "Read the prompt and find the site it points at before touching anything.", glyph: "substrate" },
  { caption: "Work one small step at a time, from what you have toward what the prompt asks for.", glyph: "arrows" },
  { caption: "Check the result: mass, charge and electron count all have to balance.", glyph: "product" },
];

export function guidebookFor(node: SheetNode): GuidebookContent {
  return {
    placeholder: true,
    gateMark: HUMAN_GATE_MARK,
    title: node.title,
    badge: BADGE[node.kind],
    intro:
      `${node.title}, on one page: what it is, where it shows up on the exam, ` +
      `and the pattern to look for when a prompt hands it to you. ` +
      `A short read before you press START, not a chapter.`,
    keyIdea: node.blurb,
    workedExample: {
      heading: "Worked example",
      steps: METHOD_STEPS.map((step, i) => ({ n: i + 1, caption: step.caption, glyph: step.glyph })),
    },
  };
}
