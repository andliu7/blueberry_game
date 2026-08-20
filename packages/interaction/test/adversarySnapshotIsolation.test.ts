/**
 * Adversary pass, Phase 2, attack surface 2: the snapshot restore.
 *
 * R3 says a cancel "puts the document back exactly as it was before R1 fired
 * for that pointer" (machine.ts header). `dropSession` implements this by
 * storing `state.doc` at press time on the session (`snapshot`) and, on a
 * restoring drop, assigning `doc: session.snapshot` UNCONDITIONALLY. That
 * assignment does not ask "has anything else happened to the document since
 * this snapshot was taken". It cannot: `PointerSession.snapshot` is a single
 * DocumentState captured once, not a diff against whatever is current.
 *
 * The three rules only talk about pointers. But `commands.ts` documents a
 * SECOND, pointer free way to reach the exact same `applyCommand` path: "A
 * keyboard, a switch device, a screen reader action, or an ordinary button in
 * the shell's own chrome" dispatches a `command` event directly, with no
 * pointer session involved at all (see machine.ts, `reduce`, the `command`
 * case, and shapes/index.ts's header, which calls this "the pointer free
 * entry point").
 *
 * That second path is not tracked by any session's snapshot. So: arm a
 * pointer (which takes a snapshot), let an UNRELATED command commit real
 * work on top of that snapshot, then cancel (or background) the original
 * pointer. The restore rolls the independent work back too, because the
 * snapshot has no idea it happened. This is exactly the "another session
 * commits, then the first cancels" question CLAUDE.md's Phase 2 adversary
 * brief calls the highest value one in the phase, reached through a route
 * that does not require two literal pointer sessions to coexist, only one
 * pointer session and one command dispatched while it is live -- which is
 * precisely what an assistive switch device, a screen reader, or a stray
 * accidental touch resting on the glass produces.
 */

import { describe, expect, it } from "vitest";

import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { Driver, P, sn2StartingState, sn2Targets } from "./support.js";

function mechanismDriver(): Driver {
  return new Driver(createMechanismDraft(sn2StartingState()), sn2Targets());
}

function mechanismDraftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

describe("R3 restore vs. the pointer free command entry point", () => {
  it("a pointerCancel wipes a whole arrow committed by an unrelated command while it was down", () => {
    const d = mechanismDriver();

    // Pointer 1 arms the oxygen lone pair. Its snapshot is the pristine,
    // pre-arrow document.
    d.down(P.oxygenLonePair);
    expect(mechanismDraftOf(d).armed).not.toBeNull();

    // An UNRELATED actor -- a switch device, a screen reader, a second person
    // driving the same session -- completes the arrow through the pointer
    // free `command` entry point while pointer 1 is still down. This commits
    // real, gradeable work: a full O-to-C nucleophilic attack arrow.
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    // Pointer 1 never moved and is now cancelled -- a palm lift, a system
    // gesture, anything R3 exists to cover. Nothing about this cancel is the
    // command's fault; the command was somebody else's input entirely.
    d.cancel(P.oxygenLonePair);

    // R3, read literally, restores ONLY what pointer 1's own press did. What
    // it actually does is blow away every committed change since pointer 1
    // went down, because the snapshot is a single document capture with no
    // memory of who touched it afterward.
    expect(mechanismDraftOf(d).arrows).toHaveLength(0);
    expect(d.sawNotice("drag_cancelled")).toBe(true);
    // The notice is the same generic "drag_cancelled" a harmless self
    // rollback produces. Nothing distinguishes "I undid my own arming" from
    // "I destroyed a completed arrow somebody else built", which is also a
    // feedback specificity failure riding on top of the data loss.
  });

  it("appBackgrounded (an incoming call) wipes the same unrelated commit the same way", () => {
    const d = mechanismDriver();

    d.down(P.oxygenLonePair);
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    // machine.ts: "Every platform stops sending pointer events at that
    // moment", so onBackgrounded uses the SAME owner.snapshot restore R3
    // uses. Same root cause, reached without any cancel event at all.
    d.background();

    expect(mechanismDraftOf(d).arrows).toHaveLength(0);
  });

  it("a cancel after a mid drag shape switch reverts the document to a stale shape entirely", () => {
    const d = mechanismDriver();

    // Pointer 1 arms a source in the mechanism shape. Snapshot: mechanism,
    // nothing armed.
    d.down(P.oxygenLonePair);
    expect(d.state.doc.draft.shape).toBe("mechanism");

    // The app switches answer shape mid gesture -- entirely plausible if a
    // problem transitions from "draw the mechanism" to "now predict the
    // product" the moment the arrow completes, or if this pointer is a
    // leftover from a shape the student already left. `setShape` is a
    // top level command, not a shape reducer command, and it touches only
    // `state.doc`; it does not know or care that a pointer session exists,
    // let alone invalidate that session's now stale snapshot.
    const structureDraft = createStructureDraft("adversary-structure");
    d.send({ kind: "command", command: { kind: "setShape", draft: structureDraft } });
    expect(d.state.doc.draft.shape).toBe("structure");

    // Real progress happens in the new shape.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "paletteElement", element: "C" } },
    });
    const structAfterProgress = d.state.doc.draft as StructureDraft;
    expect(structAfterProgress.shape).toBe("structure");
    expect(structAfterProgress.palette).toBe("C");

    // Pointer 1, armed back when the shape was still "mechanism", is now
    // cancelled.
    d.cancel(P.oxygenLonePair);

    // The restore does not merely lose the palette selection. It puts the
    // document's SHAPE FIELD back to "mechanism" -- the shape pointer 1's own
    // snapshot was taken in, one step before pointer 1's own R1 arming, since
    // the snapshot is captured before R1 applies -- even though the last
    // thing anyone deliberately did was switch to and start working in the
    // structure shape. Any shell that switched its rendering to the
    // structure editor is now silently out of sync with
    // `currentDraft(state).shape`, which reverted behind its back with only
    // the same generic "drag_cancelled" notice to go on -- a notice that
    // says nothing about a shape having reverted at all, and nothing a
    // renderer can use to know it must switch its own UI back too.
    expect(d.state.doc.draft.shape).toBe("mechanism");
    const revertedMechanism = d.state.doc.draft as MechanismDraft;
    // Also gone: the arming pointer 1's own press made, because the snapshot
    // predates R1 as well. Everything from pointer 1's own arm onward,
    // including the entire shape switch and the structure progress, is
    // erased by one stray cancel.
    expect(revertedMechanism.armed).toBeNull();
    expect(revertedMechanism.arrows).toHaveLength(0);
  });

  it("a reused pointer id (a platform that dropped the up) wipes the same unrelated commit again", () => {
    const d = mechanismDriver();

    // Pointer 1 arms a source. Its up never arrives -- the platform dropped
    // it, which is exactly the case `stale_pointer_session_replaced` exists
    // to name.
    d.down(P.oxygenLonePair, { pointerId: 1 });

    // While pointer 1 is stranded down, an unrelated command completes real
    // work, same as the cancel and background cases above.
    d.send({ kind: "command", command: { kind: "selectTarget", target: { kind: "atom", atomId: "C1" } } });
    expect(mechanismDraftOf(d).arrows).toHaveLength(1);

    // The platform reuses pointer id 1 for a fresh touch. onPointerDown finds
    // the stale session and calls the exact same
    // `dropSession(working, stale, { restore: stale.role === "owner" })`
    // that R3 and appBackgrounded call, using pointer 1's ORIGINAL snapshot.
    d.down(P.carbonAtom, { pointerId: 1 });

    expect(d.sawNotice("stale_pointer_session_replaced")).toBe(true);
    // The unrelated arrow is gone, exactly as it was for cancel and for
    // backgrounding, because all three call sites share the one restore path
    // and none of them can see what happened after the snapshot was taken.
    expect(mechanismDraftOf(d).arrows).toHaveLength(0);
  });
});
