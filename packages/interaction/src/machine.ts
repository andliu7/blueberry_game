/**
 * The pointer state machine.
 *
 * Pure. No DOM, no React, no React Native, no timers, no clock, no randomness.
 * `reduce(state, event, environment)` is a function, and the same three inputs
 * always give the same output. Everything a shell needs to do that is not a
 * state change comes back as an effect.
 *
 * THREE RULES ARE THE ENTIRE POINTER LAYER. They are worth reading before
 * anything else in this file.
 *
 *   R1  Every pointerDown selects whatever is under it.
 *   R2  Every pointerUp selects whatever is under it, but ONLY if that is a
 *       different target from the one the press was on.
 *   R3  Every pointerCancel selects nothing and puts the document back exactly
 *       as it was before R1 fired for that pointer.
 *
 * A tap is the case where R2 finds the same target and does nothing. A drag is
 * the case where it finds a different one. There is no tap branch, no drag
 * branch, no movement threshold, and no double tap window. That is what makes
 * tap only completion first class rather than bolted on: the tap path is not an
 * alternative to the drag path, it is the same path with a shorter journey.
 *
 * It also disposes of a whole class of edge case by construction:
 *
 *   a drag released over empty space      R2 selects `empty`, which clears
 *   a drag released over its own source   R2 finds the same target, nothing
 *   a tap faster than a state transition  there are no timers to be faster than
 *   a shaky hand on a small handle        no distance threshold to cross
 *
 * WHY MOVEMENT DISTANCE IS NOT USED TO CLASSIFY ANYTHING.
 *
 * Whether a wobble is still on the handle is a hit testing question, and it is
 * answered by the fingertip model in the geometry package, which knows the
 * contact radius for each pointer kind. A pixel threshold here would be a second
 * opinion on the same question, tuned by hand, and the two would disagree at the
 * worst moment. `maxDistanceFromDown` is recorded for renderers, never read for
 * a decision.
 *
 * WHY ONE POINTER OWNS THE MACHINE.
 *
 * There is no two handed gesture in this product. A second contact during a drag
 * is a palm, a resting knuckle, or a second person, and destroying the drag in
 * progress is the worst answer. The first pointer down owns the machine, later
 * ones are tracked and apply nothing. `touch-action: none` at the shell boundary
 * stops the browser turning that palm into a scroll; this is the other half of
 * the same job.
 *
 * The one exception is a pen arriving during a touch drag, which is a hand
 * resting on an iPad while the Pencil comes down. The pen wins, and the touch it
 * displaces is cancelled by R3 rather than committed. See D11.
 */

import { applyToShape, armedHintFor, hasSelection, type ShapeDraft } from "./shapes/index.js";
import { commitDraft, createDocument, resetDocument, undoDocument, type DocumentState } from "./document.js";
import type { InteractionCommand } from "./commands.js";
import type { InteractionEffect } from "./effects.js";
import { isContested, type HitTestOutcome, type InteractionEnvironment } from "./geometryPort.js";
import type { CommandSeq } from "./ids.js";
import { notice, type InteractionNotice } from "./notices.js";
import {
  distance2,
  isPrimaryButton,
  readPressure,
  type Point2,
  type PointerInput,
  type PointerKind,
  type PressureReading,
} from "./pointer.js";
import { sameTarget, type HitTarget } from "./targets.js";

/**
 * `owner` drives the document. `ignored` is tracked so its release can be
 * matched and discarded, and so a renderer can draw it if it wants to.
 */
export type SessionRole = "owner" | "ignored";

export interface PointerSession {
  readonly pointerId: number;
  readonly pointerType: PointerKind;
  readonly role: SessionRole;
  readonly downPoint: Point2;
  readonly downTarget: HitTarget;
  readonly point: Point2;
  /** What is under the pointer right now. Refreshed on every move. */
  readonly target: HitTarget;
  /** Recorded for renderers. Never read to decide anything. See the header. */
  readonly maxDistanceFromDown: number;
  /** True once the pointer has been over something other than where it started. */
  readonly leftDownTarget: boolean;
  readonly pressure: PressureReading;
  readonly downTimestampMs: number;
  readonly lastTimestampMs: number;
  /** The document as it was before this session touched it. R3 restores this. */
  readonly snapshot: DocumentState;
}

export interface InteractionState {
  readonly doc: DocumentState;
  readonly sessions: readonly PointerSession[];
  /** Increments once per command applied. Stamped onto notices so they can be traced. */
  readonly commandSeq: CommandSeq;
}

export type InteractionEvent =
  | { readonly kind: "pointerDown"; readonly pointer: PointerInput }
  | { readonly kind: "pointerMove"; readonly pointer: PointerInput }
  | { readonly kind: "pointerUp"; readonly pointer: PointerInput }
  | { readonly kind: "pointerCancel"; readonly pointer: PointerInput }
  /**
   * The app lost the foreground mid gesture: a phone call, a task switch, a
   * Safari tab going to the background. Every platform stops sending pointer
   * events at that moment and most never send the matching up, so a machine that
   * waits for one waits forever with a dashed line frozen on screen. Shells map
   * visibilitychange, blur, and React Native's AppState to this.
   */
  | { readonly kind: "appBackgrounded"; readonly timestampMs: number }
  /**
   * The pointer free entry point. A keyboard, a switch device, a screen reader
   * action, or an ordinary button in the shell's own chrome. Everything a tap can
   * do, this can do, because a tap is only a way of producing one of these.
   */
  | { readonly kind: "command"; readonly command: InteractionCommand };

export interface Transition {
  readonly state: InteractionState;
  readonly notices: readonly InteractionNotice[];
  readonly effects: readonly InteractionEffect[];
}

export function createInteractionState(draft: ShapeDraft): InteractionState {
  return Object.freeze({
    doc: createDocument(draft),
    sessions: Object.freeze([]),
    commandSeq: 0,
  });
}

export function reduce(
  state: InteractionState,
  event: InteractionEvent,
  env: InteractionEnvironment,
): Transition {
  switch (event.kind) {
    case "pointerDown":
      return onPointerDown(state, event.pointer, env);
    case "pointerMove":
      return onPointerMove(state, event.pointer, env);
    case "pointerUp":
      return onPointerUp(state, event.pointer, env);
    case "pointerCancel":
      return onPointerCancel(state, event.pointer);
    case "appBackgrounded":
      return onBackgrounded(state);
    case "command":
      return applyCommand(state, event.command, env);
  }
}

// ---------------------------------------------------------------------------
// Pointer handling
// ---------------------------------------------------------------------------

function onPointerDown(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): Transition {
  const notices: InteractionNotice[] = [];
  let working = state;

  // A second down for a pointer already down means an up went missing, which
  // happens when a platform drops events under load. Treat the old one as
  // cancelled rather than carrying two sessions with the same id.
  const stale = findSession(working, pointer.pointerId);
  if (stale !== undefined) {
    working = dropSession(working, stale, { restore: stale.role === "owner" });
    notices.push(
      notice(
        "stale_pointer_session_replaced",
        "info",
        `pointer ${pointer.pointerId} went down twice without an up`,
      ),
    );
  }

  // A right or middle mouse button belongs to the platform's context menu.
  if (!isPrimaryButton(pointer)) {
    notices.push(
      notice(
        "non_primary_button_ignored",
        "info",
        `pointer ${pointer.pointerId} used a non primary button`,
      ),
    );
    return {
      state: addSession(working, buildSession(working, pointer, "ignored", emptyAt(pointer.point))),
      notices,
      effects: [],
    };
  }

  const owner = ownerSession(working);
  if (owner !== undefined) {
    const penTakesOver = pointer.pointerType === "pen" && owner.pointerType === "touch";
    if (penTakesOver) {
      // The hand resting on the iPad loses to the Pencil. R3 on the touch.
      working = dropSession(working, owner, { restore: true });
      notices.push(
        notice(
          "pen_preempted_touch",
          "info",
          `pen ${pointer.pointerId} took over from touch ${owner.pointerId}, whose selection was rolled back`,
        ),
      );
    } else {
      notices.push(
        notice(
          "secondary_pointer_ignored",
          "info",
          `pointer ${pointer.pointerId} arrived while pointer ${owner.pointerId} was drawing`,
        ),
      );
      const hit = hitTest(working, pointer, env);
      return {
        state: addSession(working, buildSession(working, pointer, "ignored", hit.primary)),
        notices,
        effects: [],
      };
    }
  }

  const hit = hitTest(working, pointer, env);
  const session = buildSession(working, pointer, "owner", hit.primary);
  working = addSession(working, session);

  // R1.
  const applied = applyCommand(working, { kind: "selectTarget", target: hit.primary }, env);
  return {
    state: applied.state,
    notices: [...notices, ...ambiguityNotices(hit, applied.state.commandSeq), ...applied.notices],
    effects: applied.effects,
  };
}

function onPointerMove(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): Transition {
  const session = findSession(state, pointer.pointerId);
  if (session === undefined) {
    return {
      state,
      notices: [unknownPointer(pointer.pointerId, "move")],
      effects: [],
    };
  }

  const notices: InteractionNotice[] = [];
  if (pointer.timestampMs < session.lastTimestampMs) {
    notices.push(
      notice(
        "timestamp_went_backwards",
        "info",
        `pointer ${pointer.pointerId} reported ${pointer.timestampMs} after ${session.lastTimestampMs}; nothing here reads the clock, so this is a diagnostic only`,
      ),
    );
  }

  // Moves never apply a command. They keep the in flight guide honest and
  // nothing else.
  const hit = hitTest(state, pointer, env);
  const moved = distance2(session.downPoint, pointer.point);
  const updated: PointerSession = Object.freeze({
    ...session,
    point: pointer.point,
    target: hit.primary,
    maxDistanceFromDown: Math.max(session.maxDistanceFromDown, moved),
    leftDownTarget: session.leftDownTarget || !sameTarget(hit.primary, session.downTarget),
    pressure: readPressure(pointer),
    lastTimestampMs: pointer.timestampMs,
  });

  return { state: replaceSession(state, updated), notices, effects: [] };
}

function onPointerUp(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): Transition {
  const session = findSession(state, pointer.pointerId);
  if (session === undefined) {
    return { state, notices: [unknownPointer(pointer.pointerId, "up")], effects: [] };
  }

  const notices: InteractionNotice[] = [];
  if (pointer.timestampMs < session.lastTimestampMs) {
    notices.push(
      notice(
        "timestamp_went_backwards",
        "info",
        `pointer ${pointer.pointerId} released at ${pointer.timestampMs}, before its last move at ${session.lastTimestampMs}`,
      ),
    );
  }

  const hit = hitTest(state, pointer, env);
  const working = dropSession(state, session, { restore: false });

  if (session.role !== "owner") {
    return { state: working, notices, effects: [] };
  }

  // R2. Same target as the press means the press already said everything.
  if (sameTarget(hit.primary, session.downTarget)) {
    if (session.leftDownTarget && hasSelection(working.doc.draft)) {
      notices.push(
        notice(
          "drag_ended_on_its_own_source",
          "info",
          "the pointer wandered off and came back, so the selection was left as it was",
        ),
      );
    }
    return { state: working, notices, effects: [] };
  }

  const applied = applyCommand(working, { kind: "selectTarget", target: hit.primary }, env);
  return {
    state: applied.state,
    notices: [...notices, ...ambiguityNotices(hit, applied.state.commandSeq), ...applied.notices],
    effects: applied.effects,
  };
}

function onPointerCancel(state: InteractionState, pointer: PointerInput): Transition {
  const session = findSession(state, pointer.pointerId);
  if (session === undefined) {
    return { state, notices: [unknownPointer(pointer.pointerId, "cancel")], effects: [] };
  }

  // R3. Everything this session did goes back, history included.
  const working = dropSession(state, session, { restore: session.role === "owner" });
  const notices =
    session.role === "owner"
      ? [
          notice(
            "drag_cancelled",
            "info",
            `pointer ${pointer.pointerId} was cancelled by the platform; the document was rolled back`,
          ),
        ]
      : [];
  return { state: working, notices, effects: [] };
}

function onBackgrounded(state: InteractionState): Transition {
  if (state.sessions.length === 0) {
    return { state, notices: [], effects: [] };
  }

  // Every live session is cancelled. The owner's snapshot is the one that
  // matters, because ignored sessions never changed anything.
  const owner = ownerSession(state);
  const doc = owner === undefined ? state.doc : owner.snapshot;
  return {
    state: Object.freeze({ ...state, doc, sessions: Object.freeze([]) }),
    notices: [
      notice(
        "backgrounded_mid_drag",
        "info",
        `the app lost the foreground with ${state.sessions.length} pointer(s) down; all were cancelled`,
      ),
    ],
    effects: [],
  };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function applyCommand(
  state: InteractionState,
  command: InteractionCommand,
  env: InteractionEnvironment,
): Transition {
  const seq = state.commandSeq + 1;

  switch (command.kind) {
    case "undo": {
      const undone = undoDocument(state.doc);
      if (undone === null) {
        return {
          state: bumpSeq(state, seq),
          notices: [stamp(notice("nothing_to_undo", "info", "the draft is already at its start"), seq)],
          effects: [],
        };
      }
      return { state: Object.freeze({ ...state, doc: undone, commandSeq: seq }), notices: [], effects: [] };
    }

    case "reviseLastTarget": {
      // "No, I meant that one." Built from undo rather than from a special case
      // in the pointer layer, so it works the same whether the mis-hit came from
      // a tap, a drag, or a keyboard.
      const undone = undoDocument(state.doc);
      const rolled = undone === null ? state : Object.freeze({ ...state, doc: undone });
      return applyCommand(rolled, { kind: "selectTarget", target: command.target }, env);
    }

    case "setShape":
      return {
        state: Object.freeze({
          ...state,
          doc: resetDocument(command.draft),
          commandSeq: seq,
        }),
        notices: [],
        effects: [],
      };

    default: {
      const outcome = applyToShape(state.doc.draft, command);
      const doc = commitDraft(state.doc, outcome.draft);
      return {
        state: Object.freeze({ ...state, doc, commandSeq: seq }),
        notices: outcome.notices.map((n) => stamp(n, seq)),
        effects: outcome.effects,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// Selectors, for renderers
// ---------------------------------------------------------------------------

/**
 * The dashed line in `docs/reference/alchemie/extra/x01-drag-inflight-dashed-guide.png`.
 *
 * Null when nothing is being dragged, or when a pointer is down but nothing is
 * armed, because a guide from nowhere to somewhere means nothing.
 *
 * `from` is where the pointer pressed, not where the source is drawn. The state
 * machine has no idea where anything is on screen. A renderer that knows the
 * source's true anchor should draw from there instead; `anchor` names the target
 * so it can look it up.
 */
export interface InFlightGuide {
  readonly anchor: HitTarget;
  readonly from: Point2;
  readonly to: Point2;
  /** What the release would select right now, so the guide can preview the snap. */
  readonly snappedTo: HitTarget;
  readonly pointerType: PointerKind;
  readonly pressure: PressureReading;
  readonly distance: number;
}

export function inFlightGuide(state: InteractionState): InFlightGuide | null {
  const owner = ownerSession(state);
  if (owner === undefined) return null;
  if (!hasSelection(state.doc.draft)) return null;
  return {
    anchor: owner.downTarget,
    from: owner.downPoint,
    to: owner.point,
    snappedTo: owner.target,
    pointerType: owner.pointerType,
    pressure: owner.pressure,
    distance: owner.maxDistanceFromDown,
  };
}

export function ownerSession(state: InteractionState): PointerSession | undefined {
  return state.sessions.find((session) => session.role === "owner");
}

export function activePointerCount(state: InteractionState): number {
  return state.sessions.length;
}

export function currentDraft(state: InteractionState): ShapeDraft {
  return state.doc.draft;
}

export function canUndo(state: InteractionState): boolean {
  return state.doc.past.length > 0;
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function hitTest(
  state: InteractionState,
  pointer: PointerInput,
  env: InteractionEnvironment,
): HitTestOutcome {
  return env.hitTester.hitTest({
    point: pointer.point,
    pointerType: pointer.pointerType,
    armedSource: armedHintFor(state.doc.draft),
  });
}

function ambiguityNotices(hit: HitTestOutcome, seq: CommandSeq): readonly InteractionNotice[] {
  if (!isContested(hit)) return [];
  return [
    stamp(
      notice(
        "target_was_ambiguous",
        "info",
        "two targets were too close to separate at this contact radius; the best guess was used",
        { candidates: hit.candidates },
      ),
      seq,
    ),
  ];
}

function stamp(value: InteractionNotice, seq: CommandSeq): InteractionNotice {
  return value.commandSeq === undefined ? { ...value, commandSeq: seq } : value;
}

function unknownPointer(pointerId: number, phase: string): InteractionNotice {
  return notice(
    "unknown_pointer_ignored",
    "info",
    `pointer ${pointerId} sent a ${phase} with no matching down`,
  );
}

function emptyAt(point: Point2): HitTarget {
  return { kind: "empty", point };
}

function buildSession(
  state: InteractionState,
  pointer: PointerInput,
  role: SessionRole,
  target: HitTarget,
): PointerSession {
  return Object.freeze({
    pointerId: pointer.pointerId,
    pointerType: pointer.pointerType,
    role,
    downPoint: pointer.point,
    downTarget: target,
    point: pointer.point,
    target,
    maxDistanceFromDown: 0,
    leftDownTarget: false,
    pressure: readPressure(pointer),
    downTimestampMs: pointer.timestampMs,
    lastTimestampMs: pointer.timestampMs,
    snapshot: state.doc,
  });
}

function findSession(state: InteractionState, pointerId: number): PointerSession | undefined {
  return state.sessions.find((session) => session.pointerId === pointerId);
}

function addSession(state: InteractionState, session: PointerSession): InteractionState {
  return Object.freeze({ ...state, sessions: Object.freeze([...state.sessions, session]) });
}

function replaceSession(state: InteractionState, session: PointerSession): InteractionState {
  return Object.freeze({
    ...state,
    sessions: Object.freeze(
      state.sessions.map((existing) =>
        existing.pointerId === session.pointerId ? session : existing,
      ),
    ),
  });
}

function dropSession(
  state: InteractionState,
  session: PointerSession,
  options: { readonly restore: boolean },
): InteractionState {
  const sessions = state.sessions.filter((existing) => existing.pointerId !== session.pointerId);
  return Object.freeze({
    ...state,
    doc: options.restore ? session.snapshot : state.doc,
    sessions: Object.freeze(sessions),
  });
}

function bumpSeq(state: InteractionState, seq: CommandSeq): InteractionState {
  return Object.freeze({ ...state, commandSeq: seq });
}
