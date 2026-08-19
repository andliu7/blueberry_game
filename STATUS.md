# Status

Updated 2026-08-19.

## Preflight

Per `BUILD-PROMPT.md`. Phase 0 does not start until every row passes.

| # | Item | State | Note |
|---|---|---|---|
| 1 | FILL block resolves | FAIL | Two seeded test emails still blank. Everything else filled |
| 2 | Every `MANIFEST.md` file on disk | PASS | 10 of 10 filed, provenance table appended |
| 3 | `python --version` and RDKit imports | PASS | Python 3.13.9, RDKit 2026.03.5 |
| 4 | `dist/` in `.gitignore` | PASS | Line 5 |
| 5 | Blueberry repo readable, both files present | PASS | `berryBehaviour.ts` 402 lines, `molecule-canvas.tsx` present |

**Blocking:** row 1. Two email addresses that can receive an OTP code, for the Phase 5 RLS attack
test. Nothing else is outstanding.

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

| Phase | Mode | State |
|---|---|---|
| 0 Contracts and validators | Gauntlet loop | Not started, preflight blocked |
| 1 Chemistry core | Gauntlet loop | Not started |
| 2 Interaction layer | Gauntlet loop | Not started |
| 3 Rendering | Single pass, human gate | Not started |
| 4 Game shell | Single pass, human gate | Not started |
| 5 Auth, data, free tier | Gauntlet loop | Not started |
| 6 AI chat | Gauntlet loop | Not started |
| 7 Onboarding | Single pass, human gate | Not started |
| 8 Scale hardening | Single pass | Not started |

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
