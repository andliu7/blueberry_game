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
| 1 Mechanism core | Gauntlet loop | IN PROGRESS, branch `phase-1`, adversary iteration 4 of 5 |
| 2 Interaction layer | Gauntlet loop | Not started |
| 3 Curriculum engine and placement quiz | Gauntlet loop | Not started |
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

### Remaining Phase 1 exit conditions

1. An adversary pass that produces no new findings. Iteration 4 of 5 running.
2. **Your gate.** Read the 51 causes and judge whether the wording teaches.
   `npm run review -w packages/feedback` prints all of it. No agent can do this,
   and it is the axis where the bar shows a yellow triangle and nothing else.

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
