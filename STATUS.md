# Status

Updated 2026-09-01. This file is a thin live index: current state and pointers, no detail
that has a better home. The parent CLAUDE.md names this file the live source, and its
previous edition was eleven days and two amendments stale, which a calibration run flagged
as the worst kind of wrong. Keep it thin and keep it current.

## Where things stand right now

- Branch `phase-5`, pushed through `4388ed7`. Phase 5 became a gauntlet run by owner ruling
  (2026-08-21): four surfaces loop against committed captures, onboarding copy stays a
  human gate
- The Economy and Bloom gauntlet has EIGHT WINS (F, P1, P2, P3, P4, S1, S2, S4, with S4 at
  0.93 the highest), P5 stalled twice to an operational bug since fixed, and S3's build is
  committed with its blind verdict round running as of tonight. Full record:
  `apps/web/measurements/gauntlet-economy/LOG.md`
- The design direction is now LAW: `docs/DESIGN-GOALS.md` plus 29 committed reference
  images in `docs/reference/design-goals/`. The R rebuild implements it, judged blind
  against those images, launching after S3's verdict
- Owner rulings of 2026-09-01, all committed: FIVE tabs (supersedes the 2026-08-28
  four-tab amendment; Feed joins the bar, server-backed sections honest-not-open), system
  font stack for content, the goal green fill-only on measured contrast, free lesson order
  within a unit with only unit gates locking
- Feature roadmap recorded in `docs/ROADMAP-FEATURES.md`: the Keq check, bond-first
  mechanism mode, intermediate snapshots as card series, the BYO-AI cluster, the team
  runthrough gate, the parked 3D world
- Known open conflict, owner's to settle at the S3 verdict review: the lavender ground
  (owner direction 2026-08-29, implemented in theme.css) versus the warm cream ground of
  the 2026-09-01 design goals. Reported in `docs/DESIGN-TOKENS.md`'s amendment section

## Phases

| Phase | Mode | State |
|---|---|---|
| 0 Contracts and validators | Gauntlet loop | DONE |
| 1 Mechanism core | Gauntlet loop | DONE, merged to main |
| 2 Interaction layer | Gauntlet loop | DONE, merged to main |
| 3 Curriculum engine and placement | Gauntlet loop | DONE, merged to main |
| 4 Rendering | Single pass, human gate | DONE, merged to main |
| 5 App shell, economy, design | Gauntlet run on `phase-5` | S3 verdict pending, R rebuild queued, then the team runthrough gate |
| 6 Auth, data, free tier | Gauntlet loop | Not started |
| 7 AI chat as the Tier 3 tail | Gauntlet loop | Not started |
| 8 Tutor messaging | Gauntlet loop | Not started |
| 9 Scale hardening | Single pass | Not started |

## Environments

| Thing | Value |
|---|---|
| Git remote | `https://github.com/andliu7/blueberry_game.git` |
| Supabase production, read only reference | `kwoqzfvssoxxuvlzzhrp` (`blueberry`). Do not attack |
| Supabase test environment | `gvixhlhzuqcjzvahozfc` (`blueberry-mechanisms-test`), us-east-1 |
| Blueberry sibling repo | `C:\Users\zeusa\Downloads\Projects\grignard\grignard-app-source` |

## The gates, last full measurement

Suite 30/30 with integrity unmodified, 999 web tests, 170 economy tests, typecheck clean,
payload 191.9 KB against the 400 ceiling, contrast 0 failing over 8037 pairs, sticker 32
from a 1270 peak (re-measured 2026-09-01 22:37 after the wall-clock instrument fix, see
LOG.md's closing section). Numbers move; LOG.md and the measurement JSONs are authoritative.
