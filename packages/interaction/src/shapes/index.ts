/**
 * The four answer shapes, as one union and one dispatch.
 *
 * WHAT MAKES A SHAPE A MODE RATHER THAN A SPECIAL CASE.
 *
 * A special case would look like this, spread through the machine:
 *
 *   if (shape === "mechanism") { ...arrow handling... }
 *   else if (shape === "reagents") { ...list handling... }
 *
 * repeated at every transition, so that adding the fifth thing means finding
 * every one of those branches. A mode looks like this instead: the machine holds
 * exactly one field saying which draft it has, every draft answers the same two
 * functions, and machine.ts contains no shape name at all. Adding a shape is
 * adding a file and one arm of this switch.
 *
 * The pointer layer, the undo stack, the session ownership rules and the drag
 * cancel rules are written once and are shape blind. That is the difference
 * CLAUDE.md is asking for when it says a state machine built only for dragging
 * arrows has to be rebuilt to take a reagent list.
 *
 * `undo`, `reviseLastTarget` and `setShape` never reach a shape reducer. They are
 * document operations, handled in machine.ts, and a shape does not get an opinion
 * about them.
 */

import type { InteractionCommand } from "../commands.js";
import type { ArmedSourceHint } from "../geometryPort.js";
import { applyToMechanism, mechanismArmedHint, type MechanismDraft } from "./mechanism.js";
import type { ShapeOutcome } from "./outcome.js";
import { applyToRanking, type RankingDraft } from "./ranking.js";
import { applyToReagents, type ReagentsDraft } from "./reagents.js";
import { applyToStructure, type StructureDraft } from "./structure.js";

export type ShapeDraft = MechanismDraft | StructureDraft | ReagentsDraft | RankingDraft;

export type AnswerShape = ShapeDraft["shape"];

export const ALL_ANSWER_SHAPES: readonly AnswerShape[] = [
  "mechanism",
  "structure",
  "reagents",
  "ranking",
];

export function applyToShape(
  draft: ShapeDraft,
  command: InteractionCommand,
): ShapeOutcome<ShapeDraft> {
  switch (draft.shape) {
    case "mechanism":
      return applyToMechanism(draft, command);
    case "structure":
      return applyToStructure(draft, command);
    case "reagents":
      return applyToReagents(draft, command);
    case "ranking":
      return applyToRanking(draft, command);
  }
}

/** What the hit tester should know about the current selection, per shape. */
export function armedHintFor(draft: ShapeDraft): ArmedSourceHint | null {
  switch (draft.shape) {
    case "mechanism":
      return mechanismArmedHint(draft);
    case "structure":
      if (draft.pendingBondFrom === null) return null;
      return {
        atomId: draft.pendingBondFrom,
        target: { kind: "atom", atomId: draft.pendingBondFrom },
      };
    case "reagents":
    case "ranking":
      // Tiles and cards are laid out by the shell, not snapped to by geometry.
      return null;
  }
}

/** Whether something is armed and waiting for its second half. */
export function hasSelection(draft: ShapeDraft): boolean {
  switch (draft.shape) {
    case "mechanism":
      return draft.armed !== null;
    case "structure":
      return draft.pendingBondFrom !== null || draft.palette !== null;
    case "reagents":
      return draft.armedSlot !== null;
    case "ranking":
      return draft.armed !== null;
  }
}

export type { ShapeOutcome } from "./outcome.js";
export {
  applyToMechanism,
  createMechanismDraft,
  findingsIntroducedBy,
  mechanismArmedHint,
  STUDENT_ARROW_PREFIX,
  toggleId,
  type ArmedElectronSource,
  type MechanismDraft,
} from "./mechanism.js";
export {
  applyToStructure,
  createStructureDraft,
  MAX_IMPLICIT_HYDROGENS,
  type AtomPlacement,
  type StructureDraft,
} from "./structure.js";
export {
  applyToReagents,
  createReagentsDraft,
  move,
  type ReagentsDraft,
} from "./reagents.js";
export {
  applyToRanking,
  chosenCandidate,
  createRankingDraft,
  type RankingDraft,
} from "./ranking.js";
export { armedAtomId, inferSink, type SinkInference } from "./arrowInference.js";
