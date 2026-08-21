/**
 * Adversary pass FOUR, Phase 2. Branch phase-2, commit 94eb3bd.
 *
 * Scope: the pass three fixes specifically, plus anything untouched across
 * passes one through three. Three findings below, none fixed. Each test
 * asserts the CURRENT, real behaviour and is green today, per the convention
 * adversaryPassThree.test.ts set: a passing test that documents a defect
 * proves the defect exists rather than merely describing it. A future fix
 * pass inverts these in place, the same way it inverted the earlier ones.
 *
 * FINDING 1: the revise window's arming condition (`hasSelection` on the
 * post-command draft) is coarse enough to reopen on a disarm-only change
 * whenever the shape has a SECOND, independent selection field that happens
 * to be armed. The structure shape is the one shape with two such fields
 * (`palette` and `pendingBondFrom`), and reviseLastTarget's undo+reapply can
 * then silently create a bond the student never asked for.
 *
 * FINDING 2: createMechanismDraft's duplicate-id throw, added in pass three,
 * guards exactly one entry point: the constructor itself. `setShape` installs
 * a `ShapeDraft` object wholesale with no call to `createMechanismDraft` and
 * no duplicate-id check of its own, so a MechanismDraft built any other way
 * (deserialised from storage, assembled by hand, round-tripped through JSON)
 * carries a duplicate-id starting state straight into a live session.
 *
 * FINDING 3: acceptExternalStructure and setPredictedState share one notice
 * id, `external_structure_duplicate_atom_ids`, for what notices.ts's own
 * header documents as the meeting point with student-facing copy in
 * packages/feedback ("keyed by these ids"). Nothing on InteractionNotice
 * distinguishes which of the two entry points produced it. Not exploitable
 * yet, because packages/feedback does not consume interaction NoticeIds at
 * all today (grep confirms zero references) -- recorded as a latent
 * dead-on-arrival design gap for whenever that copy is authored.
 */

import { describe, expect, it } from "vitest";

import {
  createAtom,
  createSpecies,
  createState,
  findAtomInState,
  findBondBetween,
  type MechanismState,
} from "@blueberry/chem-core";
import { createMechanismDraft, type MechanismDraft } from "../src/shapes/mechanism.js";
import { createStructureDraft, type StructureDraft } from "../src/shapes/structure.js";
import { Driver, P } from "./support.js";
import type { TableEntry } from "./support.js";

function structureDraftOf(d: Driver): StructureDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "structure") throw new Error("expected the structure shape");
  return draft;
}

function mechanismDraftOf(d: Driver): MechanismDraft {
  const draft = d.state.doc.draft;
  if (draft.shape !== "mechanism") throw new Error("expected the mechanism shape");
  return draft;
}

// ---------------------------------------------------------------------------
// FINDING 1: the revise window reopens on a structure-shape disarm because a
// SECOND, unrelated armed field (the palette) keeps hasSelection true.
// ---------------------------------------------------------------------------

describe("FINDING: a contested atom re-tap that only disarms pendingBondFrom reopens the revise window, because the palette is independently armed", () => {
  const atomPoint = { x: 1, y: 1 };
  const placementPointA = { x: 900, y: 900 };
  const placementPointB = { x: 901, y: 901 };

  it("demonstrates the masked reopen and the silent unintended bond it produces through revise", () => {
    // The atom id assigned by the first placement is deterministic
    // (createStructureDraft's own numbering), so the contested table entry
    // for the atom tap can be wired up front, in the same driver used for
    // everything else. Untabulated points (the two placement taps) fall
    // through the fake hit tester to `empty` with an infinite margin
    // regardless of what else is in the table, so this does not interfere
    // with placement.
    const contestedAtomEntries: TableEntry[] = [
      { point: atomPoint, target: { kind: "atom", atomId: "sa1" }, margin: 0.01 },
    ];
    const d = new Driver(createStructureDraft(), contestedAtomEntries);

    // Arm the palette, through the command entry point so no pointer event is
    // involved and the revise window cannot open from this step at all --
    // "a command is never a contested hit" per machine.ts.
    d.send({
      kind: "command",
      command: { kind: "selectTarget", target: { kind: "paletteElement", element: "C" } },
    });
    expect(structureDraftOf(d).palette).toBe("C");

    // Place two atoms by tapping empty space. placeAtom does not touch
    // `palette`, so it survives both placements.
    d.tap(placementPointA);
    d.tap(placementPointB);
    expect(structureDraftOf(d).palette).toBe("C");
    const sa1 = structureDraftOf(d).placements[0]!.atomId;
    const sa2 = structureDraftOf(d).placements[1]!.atomId;
    expect(sa1).toBe("sa1");
    expect(sa2).not.toBe(sa1);

    const withTable = d;

    // Tap 1: nothing pending, arms pendingBondFrom = sa1. Contested, doc
    // changed, hasSelection true (both palette and pendingBondFrom are set
    // now) -- a legitimate arm. The window opening here is correct.
    withTable.tap(atomPoint);
    expect(structureDraftOf(withTable).pendingBondFrom).toBe(sa1);
    expect(withTable.state.doc === withTable.state.reviseWindow).toBe(true);

    // Tap 2: same contested point, same atom. bondStep's toggle branch fires
    // (`draft.pendingBondFrom === atomId`) and disarms: pendingBondFrom -> null.
    // This is a genuine document change and the hit is still contested, so
    // machine.ts's arming condition asks `hasSelection(applied.state.doc.draft)`.
    // For the mechanism shape (a single `armed` field) this would now be
    // false and the window would close, exactly as adversaryPassThree.test.ts
    // proved is FIXED there. For the structure shape it is NOT false: the
    // palette is still "C", an entirely unrelated field this tap never
    // touched, so hasSelection reads true and the window is reopened, now
    // pointed at the DISARMED document.
    withTable.tap(atomPoint);
    expect(structureDraftOf(withTable).pendingBondFrom).toBeNull();
    expect(structureDraftOf(withTable).palette).toBe("C");
    // THE VIOLATION: per machine.ts's own documented invariant ("the arming
    // condition is the pass three fix ... a window opened on [a toggle off]
    // would make revise undo the disarm, resurrect the original wrong guess
    // ... Refusing to open the window there means revise refuses by name
    // instead of corrupting"), this window should be closed. It is not.
    expect(withTable.state.doc === withTable.state.reviseWindow).toBe(true);

    // A "did you mean" affordance, driven by the second target_was_ambiguous
    // notice, offers the other atom the tap could plausibly have meant. The
    // student, believing their double tap on sa1 was just a cancelled arm
    // (which is exactly what it was), never asked for a bond. They tap
    // "revise to sa2" believing it corrects an ambiguous SELECTION.
    withTable.clearLog();
    withTable.send({
      kind: "command",
      command: { kind: "reviseLastTarget", target: { kind: "atom", atomId: sa2 } },
    });

    // reviseLastTarget's guard passes (the window IS current), so it pops the
    // undo stack's top entry -- the disarm -- which restores pendingBondFrom
    // = sa1, the very selection the student's second tap just cancelled.
    // `selectTarget(atom sa2)` is then applied against THAT resurrected
    // state. Since pendingBondFrom is no longer null, bondStep does not arm
    // sa2; it calls bondAtoms(sa1, sa2) and commits an actual bond, silently.
    const bond = findBondBetween(
      findAtomInState(structureDraftOf(withTable).state, sa1)!.species,
      sa1,
      sa2,
    );
    expect(bond).toBeDefined();
    expect(structureDraftOf(withTable).pendingBondFrom).toBeNull();

    // No notice at all names this as a correction that turned into a bond.
    // "revise_refused_newer_work" never fires, because the staleness guard
    // was satisfied -- the window really was current, just wrongly opened.
    expect(withTable.sawNotice("revise_refused_newer_work")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// FINDING 2: setShape installs a whole ShapeDraft with no duplicate-id check
// of its own, bypassing createMechanismDraft's pass three throw entirely.
// ---------------------------------------------------------------------------

describe("FINDING: setShape is an unguarded duplicate-id entry point that bypasses createMechanismDraft's throw", () => {
  function duplicateIdState(order: "carbon-first" | "nitrogen-first"): MechanismState {
    const carbon = createSpecies({
      id: "species-a",
      atoms: [createAtom({ id: "X1", element: "C", formalCharge: 0 })],
    });
    const nitrogen = createSpecies({
      id: "species-b",
      atoms: [createAtom({ id: "X1", element: "N", formalCharge: 0 })],
    });
    const members =
      order === "carbon-first"
        ? [
            { species: carbon, role: "substrate" as const },
            { species: nitrogen, role: "nucleophile" as const },
          ]
        : [
            { species: nitrogen, role: "nucleophile" as const },
            { species: carbon, role: "substrate" as const },
          ];
    return createState({ id: `dup-${order}`, members });
  }

  it("createMechanismDraft still throws when called directly, confirming the guard exists at all", () => {
    expect(() => createMechanismDraft(duplicateIdState("carbon-first"))).toThrow(/X1/);
  });

  it("a hand-built MechanismDraft carrying the same duplicate-id state sails through setShape with no throw and no notice", () => {
    // This is exactly what a shell restoring a persisted or offline-queued
    // session would produce: a MechanismDraft object deserialised from JSON,
    // never having passed through createMechanismDraft, because
    // createMechanismDraft's own doc comment says it "runs at problem load,
    // called by the shell or a harness, never inside a reducer" -- setShape
    // IS a reducer-reachable path, and it is exactly where a restored draft
    // would be installed.
    const dup = duplicateIdState("carbon-first");
    const handBuilt: MechanismDraft = Object.freeze({
      shape: "mechanism" as const,
      state: dup,
      arrows: Object.freeze([]),
      armed: null,
      electrons: 2,
      revealedLonePairs: Object.freeze([]),
      revealedHydrogens: Object.freeze([]),
      predicted: null,
      nextArrowNumber: 1,
    });

    const d = new Driver(createMechanismDraft(createState({ id: "seed", members: [] })), []);
    d.send({ kind: "command", command: { kind: "setShape", draft: handBuilt } });

    // No refusal reaches the caller at all: setShape's own no-op guard only
    // compares reference identity against the CURRENT draft, and its reset
    // branch never calls duplicateAtomIds. Nothing in NoticeId's registry
    // fires here.
    expect(d.notices).toHaveLength(0);
    expect(mechanismDraftOf(d).state).toBe(dup);

    // The exact hazard createMechanismDraft's throw exists to prevent is now
    // live in a running session: the same atom id "X1" resolves to whichever
    // species is listed first, silently, and there is no species id on
    // HitTarget for the interaction layer to disambiguate with.
    const otherOrder = duplicateIdState("nitrogen-first");
    expect(findAtomInState(dup, "X1")?.atom.element).toBe("C");
    expect(findAtomInState(otherOrder, "X1")?.atom.element).toBe("N");
  });
});

// ---------------------------------------------------------------------------
// FINDING 3: acceptExternalStructure and setPredictedState share a notice id
// with no field to tell them apart, contradicting notices.ts's own stated
// contract that student copy is "authored in packages/feedback, keyed by
// these ids". Not exploitable today: packages/feedback does not yet consume
// any interaction NoticeId (confirmed by grep across packages/feedback/src),
// so no live code branches on this collision yet. Recorded because the
// collision will still be there the day that copy is written, and nothing in
// this package's types would stop it from being wired up wrong.
// ---------------------------------------------------------------------------

describe("FINDING (latent): external_structure_duplicate_atom_ids does not distinguish its two entry points", () => {
  function duplicateIdState(): MechanismState {
    const carbon = createSpecies({
      id: "species-a",
      atoms: [createAtom({ id: "Y1", element: "C", formalCharge: 0 })],
    });
    const nitrogen = createSpecies({
      id: "species-b",
      atoms: [createAtom({ id: "Y1", element: "N", formalCharge: 0 })],
    });
    return createState({
      id: "dup",
      members: [
        { species: carbon, role: "substrate" as const },
        { species: nitrogen, role: "nucleophile" as const },
      ],
    });
  }

  it("the structure shape's acceptExternalStructure refusal and the mechanism shape's setPredictedState refusal are identical in id and shape, distinguishable only by parsing the free-text detail string", () => {
    const structureDriver = new Driver(createStructureDraft(), []);
    structureDriver.send({
      kind: "command",
      command: { kind: "acceptExternalStructure", state: duplicateIdState() },
    });
    const fromStructure = structureDriver.notices.find(
      (n) => n.id === "external_structure_duplicate_atom_ids",
    );
    expect(fromStructure).toBeDefined();

    const mechanismDriver = new Driver(
      createMechanismDraft(createState({ id: "seed", members: [] })),
      [],
    );
    mechanismDriver.send({
      kind: "command",
      command: { kind: "setPredictedState", state: duplicateIdState() },
    });
    const fromMechanism = mechanismDriver.notices.find(
      (n) => n.id === "external_structure_duplicate_atom_ids",
    );
    expect(fromMechanism).toBeDefined();

    // Same id, same severity. InteractionNotice's optional fields (`target`,
    // `candidates`, `legality`) carry nothing that names which entry point
    // fired: there is no `origin` or `source` field for this id the way
    // `arrow_refused_by_legality` carries chem-core's own findings. A
    // consumer keyed purely on `id`, which is the contract notices.ts's own
    // header describes for packages/feedback, cannot tell these two apart,
    // and the only difference on the wire is the wording of `detail`, a
    // string documented in this same file as "engine facing... never shown
    // to a student."
    expect(fromStructure!.id).toBe(fromMechanism!.id);
    expect(fromStructure!.severity).toBe(fromMechanism!.severity);
    expect(fromStructure!.detail).not.toBe(fromMechanism!.detail);
    expect((fromStructure as unknown as Record<string, unknown>).origin).toBeUndefined();
    expect((fromMechanism as unknown as Record<string, unknown>).origin).toBeUndefined();
  });
});
