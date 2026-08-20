# Blueberry Mechanisms: build prompt

Paste everything below the line into a fresh Claude Code session at the root of this repository,
after the Alchemie reference images are committed under `docs/reference/alchemie/` and listed in
`MANIFEST.md`, and after the FILL block in `CLAUDE.md` has real values.

Do not paste this while that block still has blanks.

---

Read `CLAUDE.md`, then `docs/INHERITED-DECISIONS.md`, then `docs/DESIGN-TOKENS.md`, then
`docs/reference/alchemie/OBSERVATIONS.md`. `CLAUDE.md` wins over anything below.

`docs/INHERITED-DECISIONS.md` records eleven decisions already made on evidence in the sibling
repository `andliu7/blueberry`. Several of them are counterintuitive and all of them cost something
to learn. Do not reopen one silently. If you think one is wrong, say so and stop.

Run the preflight first and stop if any item fails. Report failures as a list and wait.

Preflight: every blank in the FILL block is filled with a value that resolves; every file listed in
`docs/reference/alchemie/MANIFEST.md` exists on disk; `python --version` succeeds and RDKit imports;
`dist/` is in `.gitignore`; the Blueberry repo is readable at the path given, and
`src/lib/berryBehaviour.ts` and `src/components/ui/molecule-canvas.tsx` are present in it.

Build an organic chemistry mechanism engine and two products over it: a game-mode web app and a
standalone Expo app, both consuming one engine. The engine is the part that must be correct and the
part that is expensive to write twice. The shells are cheap and platform specific.

You are the orchestrator. You do not write feature code. You spawn builder subagents with narrow
deliverables, validator subagents that run checks and report numbers, and one adversary subagent per
phase. Builders never grade their own work. Maintain `STATUS.md` with per phase pass and fail plus
current numbers, updated after every validator run.

Architectural decisions inside a package are yours. File layout, module boundaries, and internal
naming are yours. The contracts in `CLAUDE.md` and the decisions in `docs/INHERITED-DECISIONS.md`
are not.

PHASE 0: CONTRACTS AND VALIDATORS

Nothing else starts until this exists. This is the phase that makes every later loop terminate.

Write, in this order.

The molecule model. Atoms, bonds, formal charges, lone pairs, explicit and implicit hydrogens,
stereocenters. A state is a multiset of species per the system boundary rule. A mechanism step is a
transition between two states plus the electron flow connecting them.

Before writing it, read `src/lib/berryBehaviour.ts` in the Blueberry repo. It is the same author
solving the same shape of problem: a pure data and numbers machine with no React, no DOM, and no
`three`, so one machine can drive both a web and a React Native renderer. Its two-composing-axes
idea applies directly here. What a step *is* and what an attempt *resolved to* are two axes, not one
enum. Say in your plan whether you are taking that shape and why.

The validator suite, headless, exiting nonzero. Valence per atom given formal charge. Mass conserved
across every step, counting implicit hydrogens. Formal charge sum conserved over the full species
multiset. Electron count conserved, with each arrow's declared source, sink, and count matching the
resulting bond and lone pair deltas. Every proton source and sink a declared member of the multiset.
RDKit sanitization on every state through the Python sidecar, with aromaticity disagreements
reported for adjudication rather than auto failed. Aromaticity perception stable across steps that
should not affect it. Stereo descriptors from RDKit's CIP labeller matching authored expectation,
plus E and Z and meso detection. Reaction center outcome against mechanism type per the graded
chemistry rules. Steric accessibility as a graded score with named tiers, not a boolean.
Periplanarity for E2. Axial versus equatorial preference in cyclohexanes. Hybridization per atom with
consistent bond angles, rehybridization tracked so a carbocation center goes sp3 to sp2, and
conjugation verified through planarity and p orbital alignment rather than assumed.

The budget gates, measured rather than estimated. `chem-core` gzipped size as a CI check. Game route
initial payload excluding Ketcher. An import graph assertion, run against built output rather than
source, that the game route does not reach `ketcher-standalone` or `ketcher-react`, and that nothing
imports `@rdkit/rdkit`. Interaction to feedback timing. Hit target geometry and contrast computed
from the rendered tree. Frame timing in headless Chromium against the frame budget, which is the
automatable proxy; real device frame rate on the two named devices is a human gate, so produce a
repeatable measurement script and a results file schema rather than claiming a number you cannot
measure.

The suite integrity mechanism: generate `validators.lock.json` and wire the check that runs before
any validator reports results.

Then the deliberately broken fixtures, proving the suite fails when it should. One per check, plus
these four specifically: a step that balances on mass and charge while violating electron
bookkeeping; a proton transfer that changes only implicit hydrogen counts so an explicit atom walk
still reports conservation; a protonation whose proton source is not declared in the multiset; a
`chem-core` build that transitively reaches React, so the purity gate is shown to fire.

Exit: the suite runs headless, exits nonzero on every broken fixture, exits zero on a small set of
known good fixtures, and `validators.lock.json` is committed. A validator suite that has never
failed has not been tested.

PHASE 1: MECHANISM CORE

Builders, one per workstream. Molecule state and immutable transitions. Arrow semantics: which arrow
types exist, what each moves, what each is legal on. Mechanism step evaluation. Stereochemistry.
Scoring and partial credit.

ARROW LEGALITY IS THE HEADLINE AND IT IS ALREADY A KNOWN HOLE. The Phase 0 adversary proved an SN2
drawn with a lone pair teleporting onto a non adjacent atom reports zero violations, because
declared deltas total per atom and per atom pair and never ask whether a source and its sink are
adjacent. The fixture guarding it is committed. Close it first.

Also carried from the Phase 0 adversary, each with a committed fixture: spectator laundering across
two species ids, and species id uniqueness documented in state.ts and enforced nowhere.

Partial credit is a first class requirement. The four result types are the contract and every one
carries a named cause. Tier 1 feedback copy is written in this phase: authored teaching copy for
every named cause in packages/feedback, saying what the student did, why it is wrong, and what to
look at instead. A cause without copy is an incomplete cause.

Exit: full suite green on a corpus of at least 30 authored mechanisms spanning substitution,
elimination, addition, and carbonyl chemistry, fixture count reported and non decreasing. Mutation
testing on chem-core at or above 80 percent killed. At least 12 distinct named failure causes
reachable, with the percentage of corpus wrong attempts resolving to a named cause reported as a
number. Every named cause has authored copy. The adversary produces no new findings on a second pass.

Human gate: I check the partial credit taxonomy and read the feedback copy before Phase 2. Stop.

PHASE 2: INTERACTION LAYER

Platform agnostic interaction logic, still no rendering. Tap an atom to toggle lone pairs. Tap to
toggle implicit hydrogens. Drag from source to sink to draw a curved arrow with a dashed in flight
guide, which the committed capture extra/x01 shows. Bond end handles are the drag target rather than
the bond body, which extra/x02 shows.

FOUR ANSWER SHAPES, NOT ONE. See the table in CLAUDE.md. The state machine accepts a mechanism
drawing, a structure, a reagent set or ordered sequence, and a ranked choice among candidate products.
Only the first exists in chem-core today, so design the other three as input modes now and let Phase 3
supply their grading. A state machine built only for dragging arrows has to be rebuilt to take a
reagent list, and rebuilding this phase after Phase 3 depends on it is the expensive path.

Three pointer types, not two: mouse, touch, and pen. Pen is pointerType pen with pressure read and
palm rejection through touch-action none. iPad Safari with an Apple Pencil is a named target.

Every mechanism must also be completable tap only, with no drag gesture at any point. This is a hard
requirement and the clearest place to beat the bar on ergonomics.

Exit: 100 percent branch coverage on the state machine module, measured and reported, including
cancelled drags, drags released over empty space, drags released over the source atom, two
simultaneous drags, taps faster than state transitions, a drag interrupted by backgrounding, and pen
input with and without pressure support. Tap only completion verified across the full corpus.
Mis-tap rate against the synthetic fingertip model at both the tightest lone pair spacing and the
tightest bond handle to atom spacing, reported as numbers.

PHASE 3: CURRICULUM ENGINE AND PLACEMENT QUIZ

The second system. Most of the syllabus is not mechanisms and must not be routed through a mechanism
validator.

packages/curriculum: an authored problem schema, answer checking, and mastery mapping across General
Chemistry I and II, Organic Chemistry I and II, and DAT and MCAT scope. Numeric answers with
significant figures and units. Multiple choice. Structure answers, which may call chem-core.
Balanced equations. Titration curve reading. Spectra interpretation.

The three non mechanism answer shapes from CLAUDE.md are implemented here: predict the product,
supply the reagents including the ordered synthesis case, and pick the major product with its reason.
A synthesis is the reagent shape read backwards and must not become a fifth shape.

Tier 2 feedback is authored here: every problem carries predicted wrong answers with their own
authored explanation, matched on answer state rather than on prose. These are the mistakes an
instructor knows students make on that exact problem.

The placement quiz sits on top: real questions, adaptive enough to finish fast, ending in a course
recommendation. It runs before signup.

Exit: answer checking correct on an authored corpus with fixture count reported. Significant figures
and unit handling verified against a deliberately broken fixture set, because a checker that accepts
2.0 for 2.00 teaches students the wrong habit. Placement quiz reaches a recommendation in under 3
minutes of simulated input, measured. Percentage of authored problems carrying at least one Tier 2
distractor reported as a number. Adversary pass.

PHASE 4: RENDERING, single pass, not looped

Two renderers against one interface. 2D SVG, authored here. 3D through Three.js or React Three
Fiber, both already dependencies in the sibling repo.

Every 3D usage must answer a question 2D cannot. Stereochemistry qualifies. Orbital and p orbital
alignment for conjugation qualifies. Most steps do not.

Take three things from the Alchemie captures: implicit hydrogens on a faint arc rather than as
bonded nodes, charge as a badge outside the atom silhouette, and one button of chrome.

Respect prefers-reduced-motion to the sibling repo standard: drop to a static representative frame,
never simply remove the animation and leave no state.

Exit: measured frame budget in headless Chromium, plus the device measurement script and a results
file I can populate. Human gate: I review animation feel and run the devices. Stop.

PHASE 5: APP SHELL, TABS, PERIODIC TABLE, ONBOARDING, single pass, not looped

The tabs: Mechanism Trainer, Courses, Periodic Table, Chat, Messages. Level progression and unlock
logic. The reward moment per the Duolingo row in CLAUDE.md, rewarding returning and never punishing
leaving.

The interactive periodic table is bar matched against ptable.com. It is free, always reachable, and
works offline.

Onboarding: the placement quiz, then the free tutorial covering real mechanisms rather than a UI
tour, then the free introductory lessons. The paywall appears only after the student has succeeded
at something. Skippable, and skipping leads somewhere useful rather than to a wall.

Import the mascot behaviour machine from the sibling repo. Do not rebuild it. Wire game events to
behaviours, not moods.

Failure animations: an incorrect arrow snaps back elastically, a leaving group that will not leave
wobbles and stays put, a valid but wrong result is named out loud. No red X, and --destructive is not
the wrong answer color.

Human gate: I review the copy, the funnel, and the feel. Stop.

PHASE 6: AUTH, DATA, FREE TIER

Supabase. Google OAuth plus email OTP as a six digit code, for the recorded reason in D5.

Port the sibling repo schema patterns rather than inventing new ones: is_staff() and
current_user_role() as security definer stable functions reused in every policy, attempts append only
with no update or delete policy for anyone, staff_roster keyed by lowercase email, content tables
public read and staff write. The seven migrations in the sibling repo are the starting point.

Progress, attempts, placement results, and course enrollment go to Postgres, append only, indexed on
(user_id, created_at).

Free tier and paid entitlement gated in an Edge Function or an RLS policy, never in the client.

Exit: an authenticated user cannot read another user rows, verified by a test that actually attempts
it with the second seeded account. Not reasoned about. Attempted. A client attempting to write an
entitlement, role, or progress column it should not control is rejected by the database, verified the
same way, with column level GRANTs in place because RLS filters rows and not columns.

PHASE 7: AI CHAT AS THE TIER 3 TAIL

Decide first and state the reason: Supabase Edge Function or Google Apps Script. The recommendation
is an Edge Function, because the budget counter needs a transaction against the same Postgres holding
the usage rows.

Chat is the third tier of feedback, not the first. It is reached only when no named cause and no
authored distractor matched. Every Tier 3 hit is logged with the state that produced it, so a
recurring one can be authored into Tier 2 and never generated again.

The key is server side, always. Metering ships with the feature: per user daily token budget, per
user rate limit, global daily spend ceiling degrading gracefully rather than failing open, cost per
conversation logged and queryable.

Chat sees the student current state and recent attempts, passed explicitly. Do not infer the state.

Exit: a load test against a mock endpoint returning synthetic token counts confirms the ceiling stops
spending, including the concurrent case where two requests race the same counter. One live call
verifies the real accounting path. Percentage of wrong attempts reaching Tier 3 reported as a number
and at or under 10 percent. Do not load test against the live API.

PHASE 8: TUTOR MESSAGING

Shipped last because it is the only feature where the risk is people rather than code.

Async only. Tutor initiated, or student requested with a tutor accepting. Never open discovery. Every
message logged and retained. Reporting and blocking present from the first version, not added later.
Tutors are a staff_roster role, not self signup.

Assume some students are under 18. That drives retention, moderation, and what a tutor can see about
a student.

Exit: RLS verified by attempted cross conversation reads with seeded accounts. A blocked user cannot
send, verified by attempt. Reporting produces a staff visible record, verified by attempt. Rate
limits enforced server side.

PHASE 9: SCALE HARDENING, single pass, not looped

Only after 0 through 8 pass. Offline problem caching, attempt queueing, defined conflict resolution.
Supabase Pro, since the free tier pauses after seven days of inactivity and branching needs Pro.
Realtime connection count against the ceiling. Database egress under projected load. Backups, since
the free plan has none and attempt history cannot be rebuilt.

RULES THAT APPLY THROUGHOUT

Never weaken a check, loosen a tolerance, reduce a fixture set, or add a skip to reach green. This
includes checks you wrote yourself an hour ago.

Report the fixture count on every validator run. A green run on a shrunken fixture set is a failed
run and you lead with that.

Reject any adversary run whose diff touches a path outside `packages/validators/fixtures/` and
`packages/validators/tests/`.

Five iterations maximum on any looped workstream, then stop and report what failed, what you tried,
and what you believe the blocker is.

Never loop on aesthetics.

Explain architectural choices including reasoning, and name any non-obvious React pattern in one line
with what it is for. Report problems in adjacent code rather than fixing them. State assumptions
explicitly. No em dashes anywhere. PowerShell 5.1, so no `&&`, `curl.exe` for real curl, and
PowerShell file commands.
