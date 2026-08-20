/**
 * What a shape reducer returns.
 *
 * Every shape reducer has the same signature: it takes its own draft and a
 * command, and gives back a draft plus whatever it wants to say and do. That
 * uniformity is what lets machine.ts hold "which shape am I in" as one field
 * instead of threading a shape check through every transition.
 *
 * A reducer that changed nothing returns the SAME draft object, not an equal
 * copy. machine.ts uses reference equality to decide whether to push an undo
 * entry, so returning a fresh object that happens to be equal would fill the
 * undo stack with steps that appear to do nothing when replayed.
 */

import type { InteractionEffect } from "../effects.js";
import type { InteractionNotice } from "../notices.js";

export interface ShapeOutcome<Draft> {
  readonly draft: Draft;
  readonly notices: readonly InteractionNotice[];
  readonly effects: readonly InteractionEffect[];
}

/** Nothing happened, and nothing to say about it. */
export function unchanged<Draft>(draft: Draft): ShapeOutcome<Draft> {
  return { draft, notices: [], effects: [] };
}

/** Nothing happened, and here is why. */
export function refused<Draft>(
  draft: Draft,
  notices: readonly InteractionNotice[],
  effects: readonly InteractionEffect[] = [],
): ShapeOutcome<Draft> {
  return { draft, notices, effects };
}

export function changed<Draft>(
  draft: Draft,
  effects: readonly InteractionEffect[] = [],
  notices: readonly InteractionNotice[] = [],
): ShapeOutcome<Draft> {
  return { draft, notices, effects };
}
