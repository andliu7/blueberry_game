/**
 * The pathway node sheet and its guidebook. Public surface for the integrator.
 *
 * In-tree wiring (preferred): render <NodeSheet> beside the Charge sheet in
 * PathwayTab, holding the open node as state exactly as `gate` is held today,
 * and route the guidebook wherever the shell wants it. Imperative wiring:
 * mountNodeSheet(host, handlers) returns an open/close/dispose controller and
 * carries its own guidebook overlay.
 */

export { NodeSheet, type NodeSheetProps } from "./NodeSheet";
export { Guidebook, type GuidebookProps } from "./Guidebook";
export { mountNodeSheet, type NodeSheetController, type NodeSheetHandlers } from "./mount";
export {
  nodeSheetModel,
  difficultyFor,
  PIP_COUNT,
  HUMAN_GATE_MARK,
  type NodeSheetModel,
  type SheetNode,
  type SheetNodeKind,
  type SheetNodeState,
} from "./nodeSheetModel";
export { guidebookFor, type GuidebookContent, type WorkedStep, type StepGlyph } from "./guidebookContent";
