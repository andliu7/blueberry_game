# Status

Updated 2026-08-21.

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
| 3 Curriculum engine and placement quiz | Gauntlet loop | DONE, exited 2026-08-21, merged to `main` |
| 4 Rendering | Single pass, human gate | DONE, merged to `main` on owner go-ahead; device runs still open |
| 5 App shell, tabs, periodic table, onboarding | Single pass, human gate | BUILT on `phase-5`, waiting at the human gate |
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

## Phase 4 gate, 2026-08-21

Merged to `main` at 0436757 on the owner's "keep going". Items 1, 2, 3 and 5 of the gate
were exercised in a browser during the Phase 5 smoke test (animation, press feel, reduced
motion frame, light purple cream tokens). Item 4, the Pixel 6a and iPhone 12 runs, is NOT
done: `apps/web/measurements/device-results.json` is still all nulls and only a hand on the
phones fills it. Carried as open, not claimed.

## Phase 5 BUILT, single pass complete, waiting at the human gate. 2026-08-21

Branch `phase-5`, off `main` after the Phase 4 merge. Not merged: the merge waits for the gate.

What exists, all under `apps/web/src`:

- `app/` the shell. Hash routing (`routes.ts`, `useHashRoute.ts`, same reason as D5), a
  bottom tab bar under 768 px and a left rail above, eight tabs in the CLAUDE.md order, a
  diamond badge, a theme toggle. Every tab except the trainer is `React.lazy` behind a visible
  skeleton. The trainer stays in the entry chunk on purpose so the payload gate keeps
  weighing the real game route rather than an empty shell
- `app/progress.ts` the SEAM for Phase 6. `ProgressSource` interface, one local
  implementation over localStorage, documented in its header as a rendering cache and never
  an entitlement. Phase 6 swaps the implementation; the tabs read the interface
- `mascot/` `berryBehaviour.ts` and `berryMood.ts` copied verbatim from the sibling repo
  (one guarded index read in `poseAt` for this repo's stricter compiler, noted in place),
  the flat mark adapted, the mood CSS copied, and `Berry.tsx` driving the machine with one
  rAF loop and a CSS transform. Events wire to behaviours, never moods. The 3D berry is NOT
  imported: it carries `motion/react` and three, and adding `motion` is a gate question
- `tabs/trainer/` the Mechanism Trainer wired end to end: the Phase 2 interaction store
  over a shell hit tester built from the Phase 4 scene, the draw canvas (tap and drag both,
  pen and touch distinguished at the boundary, `touch-action: none`), grading, and the
  Phase 4 playback on success. Failure animations: snap back for an illegal arrow, wobble on
  the leaving group for a legal but wrong drawing, the result named out loud, no red
- `tabs/pathway/` the Duolingo shaped track from `TOPICS`, five node states, the
  `derivePathway` rule pure and exported. Cross course prerequisites count as met unless the
  placement frontier says otherwise, or the first node of every track is locked on arrival
- `tabs/courses/` six courses, topics, and `lesson/LessonPlayer.tsx` over the corpus
  problems of a topic, grading through `gradeAttempt` only, feedback per tier, the reward
  moment (`RewardMoment.tsx`: large number, full bleed, scarce badge, return bonus, no
  streak loss), and the video slot (`LessonVideo.tsx`: never autoplay, always skippable,
  transcript slot, marked Template)
- `tabs/search/` over `searchReactions`, says which axis matched
- `tabs/periodic/` 118 elements authored in `elements.ts`, 18 column grid with the f block
  below, four colourings, detail panel, symbol in the URL. `public/sw.js` caches the shell
  for offline, registered in production only
- `tabs/leaderboards/`, `tabs/chat/`, `tabs/messages/` render their shape with an honest
  empty state and the phase that supplies the data. The leaderboard display name field
  exists and opt out is the default
- `onboarding/` welcome, the placement quiz over the real reducer and corpus, the
  recommendation in the quiz's own voice, the tutorial (trainer with a guidance strip),
  an intro lesson, then the paywall card, which is copy and not a gate. Every step skips
  to somewhere useful

Measured at the exit: suite 30 of 30, integrity unmodified, fixture count 101. Game route
initial payload 107.5 KB gzipped against 400 KB (was 74.4 KB in Phase 4; the interaction,
feedback and curriculum-free trainer wiring is the difference). Ketcher isolation pass, 9
lazy chunks. Headless steady state 60 fps, worst gap 17.1 ms, zero frames over 20 ms.
Typecheck clean across the repo. Browser smoke test on the production build: onboarding
through quiz, tutorial (tap only, both arrows, graded correct), a three problem lesson
with one Tier 1 miss, the reward moment, the paywall card, pathway, periodic table, search.

THE HUMAN GATE, what the owner reviews before merge:
1. `npm run dev -w @blueberry/web`, clear localStorage, walk onboarding start to finish.
   The copy on every screen is the review: welcome, recommendation, tutorial strip,
   paywall card. Price, trial, and framing are yours to set on that card.
2. The feel: tab bar placement, the pathway's winding track against
   `docs/reference/competitors/orgosolver-03-skill-tree-progression.png`, the reward moment
   against Duolingo's, the periodic table against ptable.com.
3. The trainer's "legal but not requested" card says chem-core cannot name the
   transformation. Decide whether that wording ships or waits for the resolver below.
4. Whether to bring the 3D berry across (adds `motion` to the shell payload).
5. The Phase 4 device runs, still owed.

Gaps found while building, none of them shell bugs, each needing an owner or a later phase:
- chem-core has no runtime resolver from a drawn step to an `AttemptResolution`. The
  validators compute resolutions from authored fixtures only. `tabs/trainer/grade.ts`
  grades by legality plus arrow set equality and says so. The resolver belongs in chem-core
- The curriculum cause registry has no student facing copy (`summary` and `teaches` are
  engine facing by contract), so a curriculum Tier 1 miss shows `teaches` plus the checker
  detail and reads as a fragment. `packages/feedback` covers chem-core causes only. A
  curriculum copy set is authoring work, reviewed at a content gate
- No `LessonId` is set on any corpus problem, so a lesson is "a topic's problems". When
  lessons are authored the player takes their list and nothing else changes
- Structure answers cannot be drawn in the shell (Ketcher is lazy by budget and not wired);
  a structure problem is skipped without penalty and says why

## Phase 5 gauntlet loop, running. 2026-08-21

Owner ruling recorded in CLAUDE.md: four Phase 5 surfaces loop against a committed capture
instead of stopping at the human gate, because "single pass" produced a shell that worked and
did not feel like the bar. The exit is a fresh-context critic picking ours blind, five rounds
per piece.

**The bars.** Trainer: `docs/reference/alchemie/01-mechanism-canvas-full.png` and `extra/x01`,
`extra/x02`. Pathway, leaderboard, language picker: `docs/reference/competitors/inspirations/`,
the owner's own Duolingo, Memrise and Quizlet captures. Live pages a critic can also open are
listed in `docs/reference/competitors/WEB-INSPIRATION.md`.

**Rounds so far.** Three builder rounds on the pathway button and two on the trainer ran as
subagent workflows before both runs died on usage limits; the remaining work was done inline.
Blind verdicts: round one, the bar beat us on BOTH surfaces. Round two ran after the fixes below.
Verdict captures live in `apps/web/measurements/gauntlet-shots/`, and the two progress logs are
`gauntlet-trainer.md` and `gauntlet-pathway.md` beside them.

**What the critics actually caught, worth knowing because each was a real defect and not taste:**

- The bond capsule inset 2px INTO each sphere, so a rod overlapped the ball it joined. It ends
  on the rim now, plus half its own stroke, with a ball joint on the silhouette
- The arrowhead used the default `markerUnits`, `strokeWidth`, so a 7 unit marker on a 3.5px
  stroke rendered 24 units long, larger than the 21 unit atoms it pointed at. Pinned to user
  space, and the land gap now clears the whole head rather than just its tip
- `bowAwayFrom` used a flat 34px offset. On a short chord that puts the control point past the
  endpoint, and a quadratic whose control point is beyond its end has a backwards tangent there:
  the head aimed away from its target. Capped at a third of the chord
- The stretched forming bond stopped at the arrow's landing, the middle of the new bond, so the
  bond looked half built. It spans to the far atom and attaches
- Lone pairs were lobes where revealed and naked dots elsewhere, two languages for one idea. The
  lobe is the resting shape too, and arming one dims its siblings
- Hydrogens were a 60 degree arc with an H3 beside it, which reads as a parenthesis with a
  subscript. One small H per hydrogen along the arc, the count only above four
- The pathway's side wall was invisible in dark mode: locked had an edge of `#1c1917` on a
  `#0c0a09` page, the same value as the ground, so a node with a real 10px wall still read as a
  flat disc. Dark edges are mid tones now
- The wind cycle had period eight, so the five nodes a viewport holds were all one limb of the
  wave and the track read as a diagonal list. Period four puts a turn on every screen

**Open at this checkpoint.** The leaderboard segmented control and the language picker have not
been built; both were queued behind the pathway when the run died. The trainer has never been
judged on a released-and-committed arrow, only mid-drag. `/generate` is blocked: no image
provider key is set in `C:\Users\zeusa\.claude\.env`.

## Done outside the phase plan

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
