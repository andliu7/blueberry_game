# Blueberry Mechanisms

An organic chemistry mechanism engine, plus a game-mode web app and a standalone Expo app built over
it. Sibling to [Blueberry](https://github.com/andliu7/blueberry), deliberately a separate repository.

Nothing is built yet. This repository currently holds the contracts, the reference material, and the
agent definitions that the build runs against.

## Read in this order

0. **`START-HERE.md`**. Getting Claude Code running against this repo, and the prompt to paste.
1. **`CLAUDE.md`**. The source of truth. Budgets, chemistry rules, result taxonomy, loop discipline.
   Claude Code reads this automatically on startup.
2. **`docs/INHERITED-DECISIONS.md`**. Thirteen decisions already made on evidence in the sibling
   repo. Several are counterintuitive and all of them cost something to learn. Read before Phase 0.
3. **`docs/VERIFICATION.md`**. Why the earlier draft of this prompt set was wrong and what changed.
   Seven blockers, nine serious issues, eight minor. Read it so a fixed problem is not reintroduced.
4. **`docs/DESIGN-TOKENS.md`**. The visual language, extracted from Blueberry so this app does not
   feel like a different product.
5. **`docs/reference/alchemie/`**. The bar. `OBSERVATIONS.md` records what was seen;
   `MANIFEST.md` lists the image files a critic must be able to open.
6. **`BUILD-PROMPT.md`**. The phase plan, agent topology, and exit conditions.

## Before the first run

Three things block Phase 0.

- **Reference images.** Drop the Alchemie captures into `docs/reference/alchemie/` under the
  filenames in `MANIFEST.md`. Without them a critic reconstructs the bar from memory and approves
  almost anything. This is the most common way the whole pattern fails.
- **The FILL block in `CLAUDE.md`.** Supabase test project ref, two seeded account emails, local path
  to the Blueberry repo.
- **Python with RDKit.** The validator suite runs it as a sidecar oracle. It never ships.

## Shape

```
packages/chem-core     Engine. No React, no DOM, no rendering, no RDKit. Pure TS.
packages/validators    Executable checks. Headless, exits nonzero. Dev only.
apps/web               React 19 + Vite + Tailwind v4.
apps/mobile            Expo / React Native.
docs/reference/        Reference artifacts for critics. Read only, never deployed.
```

## Three engines, three jobs

The decision most likely to be made inconsistently if it is not fixed up front.

| Engine | Runs | Job |
|---|---|---|
| `chem-core`, pure TS | Browser, every interaction | Valence, mass, charge, electron bookkeeping. Answers inside 100 ms |
| Indigo, via `ketcher-standalone` | Browser, lazy routes only | Canonical SMILES for structure equivalence |
| RDKit | CI only, Python sidecar | The oracle grading chem-core against a reference implementation |

Ketcher is 18.6 MB of inlined Indigo WASM. It is lazy-route only, and CI asserts the game route's
import graph never reaches it. `@rdkit/rdkit` is not a client dependency at all.

## The bar

Alchemie's Mechanisms, beaten on four named axes: mobile touch ergonomics, specificity of feedback
when a student is wrong, depth of correctness verification, and visual modernity. Each axis has a
measured half the loop runs on and a judged half that is a human gate. The loop never runs on the
judged half, because there is no exit condition for "looks good."

Interaction patterns are fair reference. Their assets, visual design, problem sets, and authored
content are not. Author your own.

## Windows

PowerShell 5.1. `&&` is a parse error, real curl is `curl.exe`, and file commands are the PowerShell
ones. No em dashes anywhere in code, comments, commit messages, or output.
