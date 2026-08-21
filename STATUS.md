# Status

Updated 2026-08-19.

## Preflight

Per `BUILD-PROMPT.md`. Phase 0 does not start until every row passes.

| # | Item | State | Note |
|---|---|---|---|
| 1 | FILL block resolves | PASS | All four rows filled |
| 2 | Every `MANIFEST.md` file on disk | PASS | 10 of 10 filed, provenance table appended |
| 3 | `python --version` and RDKit imports | PASS | Python 3.13.9, RDKit 2026.03.5 |
| 4 | `dist/` in `.gitignore` | PASS | Line 5 |
| 5 | Blueberry repo readable, both files present | PASS | `berryBehaviour.ts` 402 lines, `molecule-canvas.tsx` present |

**GREEN, 5 of 5.** Phase 0 started.

## Environments

| Thing | Value |
|---|---|
| Git remote | `https://github.com/andliu7/blueberry_game.git`, reachable, zero commits pushed |
| Supabase production, read only reference | `kwoqzfvssoxxuvlzzhrp` (`blueberry`), 4 profiles, 6 staff rows. Do not attack |
| Supabase test environment | `gvixhlhzuqcjzvahozfc` (`blueberry-mechanisms-test`), us-east-1, free tier, empty |
| Blueberry sibling repo | `C:\Users\zeusa\Downloads\Projects\grignard\grignard-app-source` |

Branching off production was the first choice and is unavailable: Supabase branching requires the Pro
plan. A separate free project achieves the same isolation. Its schema is not yet applied; the sibling
repo carries 7 migrations including the D6 column GRANT at
`20260815181500_role_hardening.sql:121`, to be replayed when Phase 5 starts rather than now.

## Phases

Ten phases since the restructure to a learning platform. `BUILD-PROMPT.md` is authoritative.

| Phase | Mode | State |
|---|---|---|
| 0 Contracts and validators | Gauntlet loop | DONE, merged into `phase-1` history |
| 1 Mechanism core | Gauntlet loop | DONE, human gate passed, merged to `main` |
| 2 Interaction layer | Gauntlet loop | DONE, authorized structural cycle plus verification, merged to `main` |
| 3 Curriculum engine and placement quiz | Gauntlet loop | IN PROGRESS, waves 1 to 3 done, adversary pass next |
| 4 Rendering | Single pass, human gate | Not started |
| 5 App shell, tabs, periodic table, onboarding | Single pass, human gate | Not started |
| 6 Auth, data, free tier | Gauntlet loop | Not started |
| 7 AI chat as the Tier 3 tail | Gauntlet loop | Not started |
| 8 Tutor messaging | Gauntlet loop | Not started |
| 9 Scale hardening | Single pass | Not started |

## Phase 1 numbers

```
SUITE: pass   checks run: 27   passed: 27   failed: 0
FIXTURE COUNT: 94   (48 of them negative controls)
```

| Measure | Value | Floor |
|---|---|---|
| chem-core mutation score | 98.21 percent killed, 1472 of 1507 | 80 percent |
| Distinct named causes reachable | 30 of 51 defined | 12 |
| Wrong attempts resolving to a named cause | 100 percent, 48 of 48 | 90 percent |
| Named causes with authored copy | 51 of 51 | all |
| chem-core gzipped | 12259 bytes | 153600 |

### Adversary record for Phase 1

Fifteen findings across three passes, all fixed. Pass four running.

| Pass | Findings | Notable |
|---|---|---|
| One | 7 | Eleven arrow legality rules had no negative control. The annotation checks verified shape and not substance |
| Two | 4 | A false positive: the suite rejected two correctly annotated SN1 captures. Also the lock did not cover the answer key it grades against |
| Three | 4 | A bare `export *` was invisible to the census. Acyl substitution collapsed into one step passed clean |

Two findings are open on purpose, both needing reactivity modelling rather than
geometry, each with a fixture recording the limit: an arrow shaped
`bond(A,B) to between(A,C)` cannot be ranked without knowing which end is the
electrophile, and a spectator whose prose contradicts its own declared reason is
a human review problem rather than a mechanical one.

### How Phase 1 closed

Five adversary passes, twenty three findings, twenty one fixed. The loop hit the five iteration cap
in `CLAUDE.md` rather than converging to a clean pass, and that is recorded honestly rather than
smoothed over: pass five still produced findings.

Two are open on purpose, each with a fixture pinning exactly what it does not cover. Both need a
barrier model chem-core does not have, and building one under loop pressure is how a third false
positive ships. This phase already shipped two checks that rejected correct chemistry, which is the
argument for stopping.

The human gate passed on review of the 51 named causes.

### The four answer shapes, recorded before Phase 2 builds for one

A question is an answer shape, not only a prompt. There are four: draw the mechanism, predict the
product, supply the reagents including the ordered synthesis case, and pick the major product.
`StudentAttempt.built` is a `MechanismStep`, so the engine understands one of them. Phase 2 designs
the input state machine for all four; Phase 3 grades the other three.

A synthesis is the reagent shape read backwards, not a fifth shape.

## Phase 0 detail

Branch `phase-0`, base `2545ead` on `main`. Four commits. Workspace: npm workspaces,
`packages/chem-core` and `packages/validators`, TypeScript project references, Vitest. Vitest over
`node --test` because Phase 1 requires mutation testing at 80 percent killed and StrykerJS has a
maintained Vitest runner.

No blind A/B critic in this phase. `CLAUDE.md` lists depth of correctness verification as the one
axis with no judged half, so the loop is builder, then `chem-validator`, then `chem-adversary`.
Blind comparison against the captures begins at Phase 3.

### Current numbers

```
SUITE: pass   checks run: 18   passed: 18   failed: 0
SUITE INTEGRITY: unmodified
FIXTURE COUNT: 12   (previous run: 12)
```

Verified independently by `chem-validator`, which did not take the builders' numbers on trust: it
isolated `conservationMass.run()` in a scratch script outside the repo, fed it a real bug with the
fixture mislabelled as clean, and confirmed the check still fired. Checks compute violations from
structure and are blind to a fixture's self-description.

| Budget | Measured | Ceiling | State |
|---|---|---|---|
| `chem-core` gzipped | 10371 bytes | 153600 | pass, 7 percent of budget |
| Game route initial payload | NOT MEASURED | 409600 | `apps/web` absent, gate self arms when it appears |
| Ketcher route isolation | NOT MEASURED | n/a | same |

18 checks across four families: harness self test 1, conservation 6, budgets 5, oracle 6.
12 fixtures, 4 good and 8 deliberately broken, plus 8 negative corpus files under `python/negative/`.

### Rulings made this phase

**Unlabelled stereocentres fail.** The oracle was adjudicating them on authority taken from
`python/CONTRACT.md`, written by the builder it grades. `CLAUDE.md` grants one exception and grants
it to aromaticity perception only. Owner ruled hard failure. The rule immediately caught a sign
error: the bridged bromonium carbons were authored R,R where RDKit computes S,S. Those are the
carbons that decide meso against racemic in the Br2 addition fixtures `CLAUDE.md` names.

**Artifacts are declared, not excepted.** The benzenonium sp3 carbon is not a stereocentre; it reads
as one only because the corpus writes one localised resonance structure. It now carries an authored
declaration with a required justification, in the shape `CLAUDE.md` blesses for spectators. Five
cases, three of them failures.

**Fixture counting corrected.** `README.md` was counted as a fixture, so the corpus read 13 when it
was 12. The non-decreasing gate correctly failed the run. Confirmed against
`git log --diff-filter=D` that no fixture has ever been deleted before resetting the advisory
per-machine baseline. No gate weakened.

**Lock excludes stand.** `CLAUDE.md` says hash every file; the lock cannot hash itself without never
converging, and `results/` is written every run. The exclusion list is recorded inside the lock, so
it is auditable rather than hidden.

### Open

- Adjudications ride in `notMeasurable` behind a prefix, so they print under the wrong heading. The
  real fix is a fourth `CheckResult` channel. Deferred rather than done, to avoid changing report
  format while an adversary run is reading it.
- The oracle grades authored corpus states, not chem-core's own output. Closes when a
  `.oracle.json` produced by `serializeState()` lands in `fixtures/`. That is Phase 1.
- Adversary pass running.

## Phase 2 resolution

The owner authorized one structural fix cycle plus a verification pass beyond the loop cap, and
that is what closed the phase.

The structural fix: reducers report what they did through a closed six value ShapeReport, and
changed() requires one, so a reducer cannot return a fresh draft claiming nothing happened. The
revise window turns on report === armed, which killed the found bug by construction and silently
closed three latent siblings. setShape validates installed drafts including the predicted state.
The notice collision split into three ids.

The verification pass audited every changed() call site for report honesty, clean; verified the
revise window and the precedence rule solid; and found one CANNOT SHIP crash, a restored draft with
a stale id counter crashing reduce() uncaught one tap after passing every guard. Fixed by making
the counter a hint and the state the authority: minting scans to the first free number, so the
class cannot be constructed. Five crash tests inverted as guards.

Final: 377 interaction tests, 86 validators tests, branch coverage 100 on every non geometry file,
tap only completion 44 of 44 good fixtures replayed through the real machine, mis tap 1.04 percent
at the tightest handle spacing against the bar's measured 21.24.

## Phase 3 checkpoint, written for continuation across a context compaction

Branch `phase-3`. Suite: 30 checks green. Tests: chem-core 414, interaction 377, curriculum 154,
validators 86. Everything below is committed; nothing depends on conversation memory.

Done this phase, in commit order: the curriculum engine (five answer kinds, grading, 16 problem
seed corpus, 36 distractors); the real CHEM 241 course mined by three agents and synthesised into
`docs/COURSE-OUTLINE-ORGO2.md` (46 topics, three acts plus spectroscopy Act 0, prerequisite edges,
the six slot exam template, [EQ] equivalence groups); TOPICS grown 13 to 46 with ACTS, CONCEPTS and
an import time soundness assertion; stereoLabels and the pKa ladder reserved in the schema; the
curriculum-corpus check (16 problems, 100 percent distractor coverage, all five kinds); the
reaction database (73 rows, 22 equivalence groups, ten near miss pairs as negative tests); the
placement quiz (pure reducer, bounded at 8 questions and modelled 180 seconds, worst case measured
5 questions and 165 seconds, deterministic by seed) with the curriculum-quiz check.

Owner rulings this phase, all recorded in CLAUDE.md or the outline: exams are not exhaustive, side
content stays with weighting not exclusion; 2024 to 2026 materials outweigh older when semesters
disagree; question FORM inspiration sanctioned, content copying never; course materials stay in the
gitignored `reference images/` folder, mined for structure only.

Artifacts: build order 08bfb9d3, named causes 01410d95, cue card dc2c1184, course outline 78e3deaa
(rewritten chemistry first for the PhD reviewer, awaiting their ruling on ten questions).

## Phase 3 EXITED, 2026-08-21

The loop closed. Adversary pass ran at 8628286 (seven findings, one of the worst kind: a
self-declared spectator marking wrong chemistry correct). Authoring wave landed at 024ad95
(corpus 16 to 55 problems, 140 distractors, every one encoding a mined mistake pattern).
Fix cycle closed all seven findings at 3db980d; lock regenerated separately at de1f33f.

Suite at exit: 30 of 30 checks pass, integrity unmodified. Curriculum tests 171 of 171,
validators 87 of 87, typecheck clean. Quiz worst case 6 questions, 175 modelled seconds.
Distractor coverage 100 percent, 2.55 per problem. All five answer kinds exercised.

Fixes worth knowing about when reading the code:
- structure.ts ignores SUBMITTED spectator declarations; only authored ones are honoured
- multiset species matching is Kuhn's bipartite matching now, polynomial, 23 s worst case to 31 ms
- DAT and MCAT claims probe the four content courses via probeTopicIdsForCourse (placement.ts)
- RULING in quiz/machine.ts: cross-course starting frontiers are deliberate
- createProblem refuses notation-variant distractors (unreachable) and declared causes the
  checker contradicts
- reaction class search is word-start match ("amine" no longer surfaces enamine-only rows)
- unit symbols resolve case-insensitively where the fold is unambiguous ("ATM" works; m/M exact)
- the curriculum-quiz check derives its course fleet from ALL_COURSE_IDS, never a hardcoded list

Still open, NOT blocking the phase exit: the PhD ruling on the ten outline questions (content
human gate), Act 2/3 and Gen Chem authoring waves (corpus check gates at 15, passing at 55),
8 unprobeable topics reported honestly by the quiz check, reaction table chem-core join,
sig fig broken fixture family, Re/Si task-direction decision (blocks stereoLabels authoring),
9 RDKit adjudication queue items awaiting a human.

## Phase 4 BUILT, single pass complete, waiting at the human gate. 2026-08-21

Branch phase-4, commit 41abbb4, not yet merged: the merge waits for the gate.

apps/web exists: React 19 + Vite + Tailwind v4. One renderer contract
(src/render/contract.ts), two implementations: the 2D SVG renderer (the default,
the deliverable) and a lazy 3D renderer through @react-three/fiber that only the
2D/3D toggle reaches. Demo is SN2 at bromomethane, real chem-core constructors,
authored backside layout hints.

Measured at the exit: initial payload 74.4 KB gzipped against the 400 KB ceiling,
suite 30 of 30 with both web gates armed and measuring, headless steady state
56.4 fps with zero frames over 20 ms (apps/web/measurements/headless-results.json).

THE HUMAN GATE, what the owner reviews before merge:
1. `npm run dev -w @blueberry/web`, watch the step: does the animation feel right?
   Arrow draw, atom glide, bond growth from the donor end, the release burst.
2. Press feel: every control acknowledges on pointer down.
3. Reduced motion (OS setting): the page should show a frozen mid-step frame.
4. Device runs: `npm run build -w @blueberry/web` then
   `npm run measure:device -w @blueberry/web`, follow the printed steps on the
   Pixel 6a and iPhone 12, fill apps/web/measurements/device-results.json.
5. Token conformance: light mode, purple led, cream ground, per DESIGN-TOKENS.md.

## Done outside the phase plan## Done outside the phase plan

**Reference material filed.** 28 raw captures triaged. 10 into the required manifest slots, 9 more
into `docs/reference/alchemie/extra/`, 8 competitor captures into `docs/reference/competitors/` so no
critic mistakes them for the bar, and the gauntlet diagram into `docs/`.

**`tools/blueberry-ai/`.** Node CLI, AI SDK agentic loop with two tools. Typecheck clean, injector
verified against a fixture carrying dark mode tokens. Not part of the phase plan and not on any
budget gate.

## Open items, none blocking

1. `OBSERVATIONS.md` sends critics to `07-problem-canvas-full.png`, which does not exist. The full
   canvas is `01-mechanism-canvas-full.png`. A critic following it stops, by design.
2. `OBSERVATIONS.md` records five Alchemie modes. There are six. The sixth is a 3D builder with an AR
   toggle, filed as `extra/x05` through `x07`.
3. Distinct wrong answer presentations is recorded as one. Observed count is two: the yellow triangle
   and a separate black spiky atom outline, which `MANIFEST.md` already gives its own row. The count
   that matters is unchanged: zero name a cause in words.
4. `BUILD-PROMPT.md` says `INHERITED-DECISIONS.md` holds eleven decisions. It holds thirteen.
5. Both optional screen recordings are still missing. They are what would settle whether the feedback
   count is a real property of the app or an artifact of still captures.
