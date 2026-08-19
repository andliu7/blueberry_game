# Blueberry Mechanisms

An organic chemistry mechanism engine plus two shells: a game-mode web app, and a standalone Expo
mobile app.

This file is the single source of truth. Where the build prompt, a subagent instruction, or a code
comment disagrees with this file, this file wins. If you find a conflict, report it rather than
picking silently.

Read `docs/INHERITED-DECISIONS.md` before Phase 0. It records decisions already made on evidence
in the sibling repository. Reopening one costs time and, in two cases, costs a repository.

## Repository layout

```
packages/chem-core     Engine. No React, no DOM, no rendering, no RDKit. Pure TS.
packages/validators    Executable checks. Headless, exits nonzero on failure. Dev only.
apps/web               React 19 + Vite + Tailwind v4. New app, not the Blueberry app.
apps/mobile            Expo / React Native.
docs/reference/        Reference artifacts for critics. Read only.
```

`apps/web` is a **new** application in this repository. It is not the existing Blueberry app and it
does not live inside it. See `docs/INHERITED-DECISIONS.md` D1 for the two measured reasons, both of
which are about repository size and neither of which is stylistic.

Anything that imports React does not belong in `chem-core`. If you find yourself wanting to, the
abstraction is wrong. Stop and say so rather than working around it. `berryBehaviour.ts` in the
sibling repo is the proof this constraint is holdable, by the same author, on a comparable problem.

## Environment

- Windows, PowerShell 5.1
- `&&` is a parse error. Use separate commands or `;`
- `curl` is aliased to `Invoke-WebRequest`. Real curl is `curl.exe`
- `rm -rf` is `Remove-Item -Recurse -Force`. `cp -r` is `Copy-Item -Recurse`
- Package manager: npm
- Python 3 with RDKit is required for the validator suite. Verify before Phase 0 and report if absent
- `dist/` is in `.gitignore` from the first commit. Never commit build output

## FILL BEFORE RUNNING PHASE 0

The run does not start until these are real. A validator built on a placeholder checks nothing.

- Alchemie reference images present in `docs/reference/alchemie/` and listed in `MANIFEST.md`: yes
- Supabase project ref for the test environment: `gvixhlhzuqcjzvahozfc`
- Two seeded test account emails for the RLS attack test: `zeus.andrewliu+rlstest1@gmail.com` and `zeus.andrewliu+rlstest2@gmail.com`
- Blueberry repo available locally for import reference at: `C:\Users\zeusa\Downloads\Projects\grignard\grignard-app-source`

## Budgets

Fixed. Do not adjust one to make a check pass.

| Budget | Value |
|---|---|
| `chem-core` bundle ceiling | 150 KB gzipped, enforced by CI |
| Game route initial payload, Ketcher excluded | 400 KB gzipped |
| Ketcher route | Lazy only. Must never be reachable from the game route's initial chunk |
| Reference devices for frame rate | Pixel 6a and iPhone 12 |
| Sustained frame rate target | 60 fps during bond formation animation |
| Interaction to visual feedback | under 100 ms |
| Minimum hit target | 44 by 44 points |
| Text contrast | WCAG AA |
| Free tier | 5 problems per day plus the full tutorial |
| AI chat per user | 20,000 tokens per day |
| AI chat global ceiling | 25 USD per day |

The Ketcher rows exist because `ketcher-standalone` inlines the Indigo WASM engine at 15.5 MB, with
`ketcher-react` a further 3.1 MB. A single unguarded import puts that download in front of every
student. A CI check must assert that the game route's dependency graph does not reach it.

## The bar

The reference is Alchemie's Mechanisms. Critics compare against the artifacts committed under
`docs/reference/alchemie/`, never against the app name and never from memory. A critic that cannot
open its assigned reference file reports that and stops. It does not reconstruct the reference from
description. `docs/reference/alchemie/OBSERVATIONS.md` records structured observations and is a
supplement to the images, not a substitute for them.

Interaction patterns are fair reference. Alchemie's assets, visual design, problem sets, and
authored content are theirs. Author your own content and keep the visual language recognizably
Blueberry, per `docs/DESIGN-TOKENS.md`.

Four win axes. Each has a measured half the loop runs on and a judged half that is a human gate.

| Axis | Measured, loop runs on this | Judged, human gate |
|---|---|---|
| Mobile touch ergonomics | Hit target geometry, mis-tap rate against a synthetic fingertip model at the tightest lone-pair and bond-handle spacing, time to first successful arrow, tap-only completion possible for every mechanism, pen pointer handled distinctly from touch | Whether it feels good in the hand |
| Feedback specificity when wrong | Count of distinct named failure causes, percentage of wrong attempts resolving to a named cause rather than a generic failure. The bar's observed count is one, a yellow triangle | Whether the wording teaches |
| Depth of correctness verification | Check count, fixture count, adversary findings per phase, mutation survival rate | None. Fully measurable |
| Visual modernity | Contrast ratios, type scale consistency, motion timing conformance to `docs/DESIGN-TOKENS.md` | Whether it looks current |

## Non-negotiables

**Never weaken a check to make it pass.** If a validator fails repeatedly, report the blocker.
Editing the assertion, loosening a tolerance, narrowing a fixture set, or adding a skip is a
failure, not a fix. This applies to validators written in the same session.

**Never put secrets in `VITE_` variables.** Anything prefixed `VITE_` is inlined into the public
bundle at build time. `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and
`VITE_GOOGLE_CLIENT_ID` are non-secret by design. The Supabase `sb_secret_...` key and the Anthropic
API key live server side only.

**Server side enforcement for anything that costs money or gates access.** Free tier limits, rate
limits, and token budgets are enforced in Edge Functions or RLS policies. A client side check is a
suggestion, not a limit.

**Row Level Security on every user scoped table**, written and attacked before any client code reads
from it. RLS filters rows, not columns. Any table with an entitlement or progress column also needs
a column level GRANT. See `docs/INHERITED-DECISIONS.md` D6 for the real escalation this prevented.

**Heavy imports are lazy.** Every multi-megabyte dependency sits behind `React.lazy` and `Suspense`
with a real loading state, not a blank rectangle.

## Chemistry correctness

Every mechanism step must conserve mass, formal charge, and electron count. Every state must pass
valence checks. These are not warnings. A mechanism that violates them is a bug that teaches
students wrong chemistry.

### System boundary

A state is a multiset of species, not a single molecule. Reagents, counterions, and any solvent
molecule that participates are members. Conservation is asserted over the multiset. A species not in
the multiset cannot donate or accept anything.

Spectators may be declared and excluded, but declaring a spectator is an explicit, recorded act that
a validator can see and an adversary can attack.

This exists because protonation and deprotonation are the most common steps in the corpus, and they
do not conserve charge on the substrate alone. Without this, the suite is red from the first fixture
and the loop burns five iterations on a modelling error.

### Three engines, three jobs

See `docs/INHERITED-DECISIONS.md` D3 for the full table. Summary:

- `chem-core`, pure TypeScript, runs in the browser on every interaction. Valence, mass, charge,
  electron bookkeeping, arrow legality. Must answer inside 100 ms
- Indigo, already loaded via `ketcher-standalone` on editor routes, does canonical SMILES for
  structure equivalence. The sibling repo's `checkAnswer.ts` already does this
- RDKit, CI only, Python sidecar, is the oracle that grades chem-core against a reference
  implementation. CIP descriptors, meso detection. It never ships

Do not add `@rdkit/rdkit` WASM to the client. Where RDKit and chem-core disagree, RDKit is presumed
correct and chem-core presumed buggy, with one exception: RDKit's aromaticity perception is a model,
not ground truth, and legitimate reactive intermediates can fail its sanitization. Aromaticity
disagreements go to human adjudication rather than auto-failing.

### CIP stereodescriptors

`chem-core` does not implement CIP. Correct CIP needs the hierarchical digraph with duplicate atoms,
ring handling, and like/unlike auxiliary descriptors, and shipped implementations have carried bugs
in this for years. chem-core computes geometry. RDKit assigns descriptors in validators. Labels
needed at runtime are precomputed at authoring time and stored on the problem, never derived on
device.

### Graded chemistry, not boolean chemistry

- Neopentyl systems are strongly disfavored for SN2, roughly 10^-5 relative to ethyl. **Not blocked.**
  The engine says "strongly disfavored, competing pathway likely" and names the competing pathway,
  because the methyl shift to a tertiary cation is the actual lesson. A boolean reject deletes it
- E2 requires periplanarity, dihedral near 0 or 180 degrees. Anti is strongly preferred. Syn
  periplanar E2 is real in conformationally locked systems and is flagged as requiring an authored
  conformational justification, not rejected
- SN1 is stereorandom at the reaction center, meaning both configurations appear in the product set.
  **It is not asserted as 50:50.** Ion pairing gives net inversion excess, commonly 50 to 80 percent
  racemization depending on substrate, solvent, and leaving group. Ratio is an authoring annotation,
  never a computed assertion
- SN2 inverts. This one is a hard assertion
- Anti addition outcomes are verified per substrate geometry. Reference fixtures: Br2 addition to
  cis-2-butene gives the racemic 2,3-dibromobutane pair; to trans-2-butene it gives the meso
  compound. If an implementation swaps these, it has a sign error in the addition geometry

### Result types

A student attempt never resolves to a boolean. Four outcomes:

1. `correct` via the requested route
2. `correct_alternative_route`, correct product by a different valid mechanism, carrying the name of
   the route taken
3. `valid_not_requested`, chemically sound but a different transformation, carrying the name of what
   they actually built
4. `invalid`, chemically impossible, carrying the specific rule violated

Case 2 exists because students reach right answers by legitimate other paths, and grading that as
"not the requested transformation" is unfair and generates support mail.

The sibling repo's `checkAnswer.ts` returns `{ ok, mine, theirs }`, which is richer than a boolean
and still short of this. Treat it as a starting point, not the target.

Every one of the four carries a named cause. The bar shows a yellow triangle and nothing else. That
gap is the win condition on the feedback axis.

## Loop discipline

Loop until the stated numeric exit condition is met, or five iterations, whichever comes first. On
the fifth failure, stop and write a report: what failed, what was tried, what you believe the
blocker is.

Never loop on subjective quality. There is no exit condition for "looks good" and the loop will not
terminate. Visual and pacing judgment are human review gates.

Run the full builder / validator / adversary loop on Phases 0, 1, 2, 5, and 6 only. Use single pass
builders on Phases 3, 4, 7, and 8, and stop for human review. Rendering feel, game pacing, and
onboarding copy are judgment calls, and a critic will loop on them indefinitely while producing
nothing you would not have decided faster yourself.

## Suite integrity

`packages/validators` carries a committed `validators.lock.json` holding a hash of every file in the
package. Every validator run recomputes and compares first. On mismatch the validator reports
MODIFIED with the changed file list and refuses to report results.

Regenerating the lock is a separate commit, made deliberately, never in the same commit as a fix to
something the suite was failing.

## Git discipline

One branch per phase. Commit before and after every adversary run so its diff is auditable. No force
push. The orchestrator rejects any adversary run whose diff touches a path outside
`packages/validators/fixtures/` and `packages/validators/tests/`.

## Communication

The author is strong in Python and Java and weak in React and TypeScript, can read code and follow
along but does not yet reliably tell normal React patterns from exotic ones, and wants to understand
this codebase rather than accumulate diffs. So:

- Explain the why of a structural decision before writing the code for it
- Name any non-obvious React pattern in one line and say what it is for. Refs, context, portals,
  `useSyncExternalStore`, custom hooks, render props
- If a request is a bad idea, say so and why, then say what you would do instead. Do not just build it
- Prefer boring and well maintained over clever. This has to be debuggable alone at 1am before an exam
- Report problems noticed in adjacent code rather than silently fixing them
- State assumptions explicitly rather than picking silently
- No em dashes in code, comments, commit messages, or output
