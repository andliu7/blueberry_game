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

PHASE 1: CHEMISTRY CORE

Builders, one per workstream. Molecule state and immutable transitions. Arrow semantics: which arrow
types exist, what each moves, what each is legal on. Mechanism step evaluation. Stereochemistry:
assignment, inversion, retention, stereorandom outcomes. Scoring and partial credit.

Partial credit is a first class requirement. The four result types are the contract, and every one
carries a named cause. A student who builds an ether when asked for an ester made a different mistake
than one who violated valence, and a student who reached the right product by a different valid route
made no mistake at all. The engine must say which, in a sentence, not a symbol. The bar shows one
undifferentiated warning triangle for every failure it knows the cause of. That is the gap.

Exit: full suite green on a corpus of at least 30 authored mechanisms spanning substitution,
elimination, addition, and carbonyl chemistry, with fixture count reported and non decreasing.
Mutation testing on `chem-core` at or above 80 percent killed. At least 12 distinct named failure
causes reachable, with the percentage of corpus wrong-attempts resolving to a named cause reported as
a number. The adversary produces no new findings on a second pass.

Human gate: I check the partial credit taxonomy before Phase 2. Stop.

PHASE 2: INTERACTION LAYER

Platform agnostic interaction logic, still no rendering. Tap an atom to toggle lone pairs. Tap to
toggle implicit hydrogens. Drag from source to sink to draw a curved arrow with a dashed in flight
guide. Drag semantics distinguish lone pair to atom, bond to atom, and bond to bond. Snapping and hit
tolerance tuned so a fingertip can hit a lone pair at the tightest spacing in the corpus.

Three pointer types, not two: mouse, touch, and pen. Pen is `pointerType === 'pen'` with `e.pressure`
read and palm rejection through `touch-action: none`. iPad Safari with an Apple Pencil is a named
target. Do not fold pen into touch.

Every mechanism must also be completable tap only, with no drag gesture at any point. Some students
use a trackpad and some have motor impairments. This is a hard requirement and it is also the
clearest place to beat the bar on ergonomics, since nothing observed in it suggests a tap-only path
exists.

Model this as a state machine over pointer events with no DOM and no React Native dependency. Both
shells adapt native events into it.

Exit: 100 percent branch coverage on the state machine module, measured and reported, including
cancelled drags, drags released over empty space, drags released over the source atom, two
simultaneous drags, taps faster than state transitions, a drag interrupted by backgrounding, and pen
input with and without pressure support. Tap only completion verified across the full corpus. Mis-tap
rate against the synthetic fingertip model at both the tightest lone pair spacing and the tightest
bond handle to atom spacing, reported as numbers.

PHASE 3: RENDERING, single pass, not looped

Two renderers against one interface. 2D SVG, authored here rather than extended from elsewhere. 3D
through Three.js or React Three Fiber, both already dependencies in the sibling repo.

Every 3D usage must answer a question 2D cannot. Stereochemistry qualifies. Orbital and p-orbital
alignment for conjugation qualifies. Most steps do not. Do not add 3D because it looks impressive.

Animations: atoms converging as a bond forms, bonds breaking with electron flow visible along the
arrow path, stereocenter inversion as an actual umbrella flip rather than a cut.

Take three things from the bar, per `OBSERVATIONS.md`: implicit hydrogens on a faint arc rather than
as bonded nodes, charge as a badge outside the atom silhouette so it never fights the element letter,
and one button of chrome. Resist adding a toolbar.

Respect `prefers-reduced-motion` to the sibling repo's standard: drop to a static representative
frame, never simply remove the animation and leave no state. A stereocenter inversion with reduced
motion still has to show that inversion happened.

Exit: measured frame budget in headless Chromium, plus the device measurement script and a results
file I can populate. Human gate: I review animation feel and run the devices. Stop.

PHASE 4: GAME SHELL, single pass, not looped

Level progression and unlock logic. Failure animations: an incorrect arrow snaps back elastically, a
leaving group that will not leave wobbles and stays put, a valid but wrong result is named out loud.
No red X, and `--destructive` is not the wrong-answer color.

Import the mascot behaviour machine from the sibling repo. Do not rebuild it. Wire game events to
behaviours, not moods: correct resolves to `bounce`, wrong to `squash`, streak milestones to
`celebrate`. Mood and behaviour compose, so a student can be `stressed` during exam week and still
bounce on a correct answer.

Duolingo is the reference for the reward moment only: one large number for the session result, a
full bleed celebration state visually distinct from the working state, a tiered badge that means
something because it was scarce. Do not take the streak loss anxiety loop. This is used before exams
by people who are already stressed. Reward returning, do not punish leaving.

PHASE 5: AUTH, DATA, FREE TIER

Supabase. Google OAuth plus email OTP as a six digit code, for the recorded reason: GitHub Pages
serves from a subpath with no server to rewrite anything and the app routes on the hash, so a
confirmation link carrying its own `#access_token=` fights the router over one field. Requires the
Supabase email template to send `{{ .Token }}`.

Port the sibling repo's schema patterns rather than inventing new ones: `is_staff()` and
`current_user_role()` as `security definer stable` functions reused in every policy, attempts append
only with no update or delete policy for anyone, `staff_roster` keyed by lowercase email as the
authorization source of truth, content tables public read and staff write.

Progress and attempts go to Postgres, append only, indexed on `(user_id, created_at)`. The sibling
repo writes progress to localStorage only despite having the table, and that gap is inherited work,
not a pattern to copy.

Free tier gated in an Edge Function or an RLS policy, never in the client.

Exit: an authenticated user cannot read another user's rows, verified by a test that actually
attempts it with the second seeded account. Not reasoned about. Attempted. And a client attempting to
write an entitlement, role, or progress column it should not control is rejected by the database,
verified the same way, with column level GRANTs in place because RLS filters rows and not columns.

PHASE 6: AI CHAT

Decide first, and state the reason: Supabase Edge Function or Google Apps Script. The sibling repo
uses Apps Script, and its budget logic lives outside the inspectable repo so it is unproven rather
than absent. The recommendation is an Edge Function, because the budget counter needs a transaction
against the same Postgres holding the usage rows, and two concurrent requests racing a counter across
an HTTP boundary with separate storage is exactly the case that loses.

The key is server side, always. Metering ships with the feature: per user daily token budget, per
user rate limit, global daily spend ceiling degrading gracefully rather than failing open, cost per
conversation logged and queryable. All enforced before the first message renders.

Chat sees the student's current molecule state and recent attempts, passed explicitly, so it can
answer why this is wrong rather than answering in the abstract. Do not infer the state.

Exit: a load test against a mock endpoint returning synthetic token counts confirms the ceiling stops
spending, including the concurrent case where two requests race the same counter. One live call
verifies the real accounting path. Do not load test against the live API; that spends money to prove
a spend limit works and can trip your own ceiling.

PHASE 7: ONBOARDING, single pass, not looped

Free tutorial covering a small number of real mechanisms, not a UI tour and not a static image in a
modal, which is what the bar does. The paywall appears only after the student has succeeded at
something. Skippable, and skipping leads somewhere useful rather than to a wall. Human gate: I review
the copy. Stop.

PHASE 8: SCALE HARDENING, single pass, not looped

Only after 0 through 7 pass. Offline problem caching, attempt queueing, defined conflict resolution.
Supabase Pro, since the free tier pauses after seven days of inactivity. Realtime connection count
against the ceiling. Database egress under projected load. Backups, since the free plan has none and
attempt history cannot be rebuilt.

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
