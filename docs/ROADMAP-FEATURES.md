# Feature roadmap, owner directions of 2026-09-01

Recorded the day they were given, per the same-conversation rule. Each entry names its
implementation home and phase so nothing here silently becomes scope for the wrong round.
Where an entry touches chemistry correctness it defers to CLAUDE.md and the cause registry;
where it touches money or access it defers to the server-side non-negotiables.

## 1. Acid-base emphasis, and the Keq check

Owner: exams stressed CHECKING Keq constantly to catch missed steps. This becomes an engine
feature, not just content weighting:

- Every proton-transfer step in a mechanism gets an automatic Keq sanity check: the engine
  compares donor and acceptor pKa (the adjustable per-professor pKa table already exists,
  see PkaSettings), computes Keq = 10^(delta pKa), and flags a step whose equilibrium lies
  heavily against the student as a likely MISSED STEP (wrong base, skipped protonation, or
  wrong order), with the numbers shown
- New named causes in the registry when chem-core work next opens (Phase 6+ or R-adjacent
  curriculum work, never mid-S3): unfavourable_proton_transfer_check_keq and
  skipped_protonation_state, each with Tier 1 authored copy that shows the two pKa values
  and the resulting Keq, so the student sees EXACTLY the arithmetic that catches the miss
- Curriculum weighting: acid-base carries more spine presence in Orgo II authoring; every
  mechanism lesson's recap asks the Keq question at least once
- Home: packages/chem-core (cause registry), packages/curriculum (weighting), pKa table
  already shipped. NOT part of the R design rebuild

## 2. Lone-pair hit-boxes

Owner: larger lone-pair targets so click-and-drag is easier. The 44px minimum stands;
lone pairs get an EXPANDED INVISIBLE hit area beyond their drawn size (drawn dot stays
small, touch target grows), and the mis-tap-rate measurement at tightest lone-pair spacing
(already a measured axis in CLAUDE.md) becomes the gate that proves it. Home: packages/
interaction hit geometry, verified in the trainer rounds. Also added to DESIGN-GOALS.

## 3. Team runthrough, the closing human gate

Owner: after R completes, a full product runthrough by the owner and team, walking every
surface and recording likes and dislikes. This is a HUMAN GATE, not a loop: no exit
condition, findings become the next round's briefs. Scheduled as the final stage of the R
plan, before any phase 6 work starts.

## 4. Mechanism input modes and the intermediate record

Two additions to the trainer's answer shapes, extending the Phase 2 four-mode contract:

- BOND-FIRST MODE: problems where the student drags bonds directly (break this, form that)
  WITHOUT drawing arrows. Pedagogically this sits between watching a worked example and
  full arrow pushing: it tests knowing WHAT changes before demanding HOW the electrons
  flow. Grading still runs through chem-core conservation checks; the arrows are inferred
  and shown back as the explanation, which teaches notation by exposure
- INTERMEDIATE SNAPSHOTS: the student can save each intermediate stage of a mechanism as
  they go, see the whole process laid out end to end afterward, and send that sequence to
  Cards as a multi-side card series (setup, each intermediate, product), using the
  three-sided card structure and the save-to-deck motion already committed in
  DESIGN-GOALS. A completed mechanism becomes a reviewable object, not a vanished event
- Home: packages/interaction (mode), packages/curriculum (grading shape), Cards surface
  (series). Trainer rounds judged against the Alchemie captures as always

## 5. Feedback specificity, reaffirmed and sharpened

Owner: feedback must be tailored, specific, detailed to the situation, so users know
EXACTLY and PRECISELY why a part was wrong and how to improve. This is already the
feedback axis and the three-tier system; what it adds:

- Per-STEP feedback in mechanisms: the named cause points at the exact step and the exact
  object (this arrow, this lone pair, this proton), never just the attempt
- The Keq check above is the first new Tier 1 cause built to this bar: it shows its
  arithmetic
- Tier 2 authored distractors remain the specificity champions per the Phase 3 ruling;
  every recurring Tier 3 hit still becomes a new Tier 2 entry
- The voice rules of CLAUDE.md apply unchanged: exact, warm, never condescending

## 6. Bring-your-own-AI features (post-R, server phases 6 to 8 adjacency)

Owner direction, three connected features:

- SYLLABUS AND SCHEDULE IMPORT: a student uploads their course syllabus or class schedule;
  the app maps it onto the course outline nodes and their exam dates
- CLASS PRACTICE PROBLEMS AND WALKTHROUGHS with the student's OWN model: we author and
  ship a CONTEXT PACK (a .md file: grading rubric, cause registry summary, worked-example
  format, voice rules) that the student's connected model must follow, which is how
  accuracy is protected without our tokens being spent. The student connects their own
  API key and pays for their own usage
- TAILORED CALENDAR AND STUDY PLAN: generated from the imported schedule plus the Anki
  scheduler's due forecast, exam-window pause integrated
- Non-negotiables applied: the student's key NEVER touches our servers (client-side calls
  only, key stored locally); our own metered AI tier stays server-enforced and separate;
  the context pack is authored content, reviewed at a human gate like all authored copy;
  imported syllabi are user data behind RLS like everything else
- Honest scope note: this is a feature cluster the size of a phase. It does not attach to
  R and is not scheduled yet; it is recorded so its design constraints are set before
  anyone builds it

## 7. Far future, explicitly parked: the study world

Owner: an interactive 3D world with cute characters students embody, studying with
friends, pomodoro timer with a todo list. Recorded as long-horizon vision, deliberately
after everything above. What it will borrow when its day comes: the mascot system and
berryBehaviour physics (D4), the existing charge pacing as the pomodoro backbone, and the
Feed social layer. Nothing in current phases builds toward it and nothing may cite it as
justification for scope.
