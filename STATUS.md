# Status

Updated 2026-09-05. This file is a thin live index: current state and pointers, no detail
that has a better home. The parent CLAUDE.md names this file the live source. Keep it thin
and keep it current.

## Where things stand right now

- Branch `phase-5`, HEAD `db9ab0f`. **Uncommitted work is in the tree and it is real**:
  `src/charge/ChargeMeter.tsx` and its model, `src/mastery/`, `beats/LessonGems.tsx`,
  `app/ui/CourseFlask.tsx`, four new test files, and the integrator's Shell, routes and
  theme edits. It is green and it is not in a commit. Commit it before anything else
- The Economy and Bloom gauntlet is CLOSED with nine verdicts: F, P1, P2, P3, P4, S1, S2,
  S3 (0.66) and S4 (0.93, the highest). Full record:
  `apps/web/measurements/gauntlet-economy/LOG.md`
- **The R rebuild is in flight** and it judges differently: the exit is CONFORMANCE against
  a named image in `docs/reference/design-goals/`, not a blind pick against Duolingo. This
  run finished four pieces and got one verdict. celebration-feed and onboarding were built
  over two rounds each and NOT judged. P5's charge meter was rebuilt against the states
  sheet and NOT judged. lesson-flow ran three rounds, 105 minutes, was judged, and **DOES
  NOT CONFORM**. Integration landed: the bar is five tabs and the header carries the flask
  course chip
- The design direction is LAW: `docs/DESIGN-GOALS.md` plus 29 committed reference images.
  Four owner rulings of 2026-09-04 bind every surface: every question is visual first, the
  image before the name, fill in the blank scratched, every node carries its motif.
  `docs/THREE-TEACHERS.md` carries the borrowable qualities as testable sentences
- The lavender-versus-cream conflict is CLOSED. `docs/DESIGN-TOKENS.md` records the dated
  supersession and `theme.css` ships the warm cream ground (`--background` `#f1ede2` light)
- Feature roadmap in `docs/ROADMAP-FEATURES.md`. Every place a student answers something is
  inventoried in `docs/TRAINER-INVENTORY.md`

## Two gates are dark, and neither was weakened

- `npm run sticker:audit` **crashes before it reports**, in `economy-moments.mjs` at
  `driveFeedback`, waiting for `input[aria-label="Numeric answer"]`. Pre-existing, verified
  by rebuilding at `db9ab0f` with all other changes stashed. The fill-in-the-blank scratch
  and the lesson-flow round changed which beat the driven lesson serves, so the driver types
  into an input that is gone. **The five-tab bar and the new header are UNMEASURED on the
  sticker rules.** The last honest walk is `sticker-audit.json`, generated 2026-09-02, total
  34, and it predates every R piece
- `measurements/contrast-audit.json` on disk is a probe's output, not a full walk: 34 rows
  and `measured: 108`, all pathway SVG, where the audit reports thousands of composed pairs.
  Nobody can say from that file what the R surfaces measure

Neither was repaired in the round that reports its number, per CLAUDE.md. Both are the next
session's first job, in a commit of their own.

## Phases

| Phase | Mode | State |
|---|---|---|
| 0 Contracts and validators | Gauntlet loop | DONE |
| 1 Mechanism core | Gauntlet loop | DONE, merged to main |
| 2 Interaction layer | Gauntlet loop | DONE, merged to main |
| 3 Curriculum engine and placement | Gauntlet loop | DONE, merged to main |
| 4 Rendering | Single pass, human gate | DONE, merged to main |
| 5 App shell, economy, design | Gauntlet run on `phase-5` | Economy gauntlet closed. R rebuild in flight: lesson-flow re-round, three pieces unjudged, then the team runthrough gate |
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
| Phone harness | `npm run dev` opens `device.html`; `/` still serves the app |

## The gates, last full measurement

Typecheck clean. 1488 web tests in 67 files, 2753 across every workspace, none failing.
Validator suite 30 of 30, integrity unmodified, 101 fixtures. Hit targets 0 under 44 by 44
over 1902 controls. **Payload 351.8 KB gzipped against the 400 ceiling**, up from 191.9 and
the number to watch: 48.2 KB of headroom is left for every R piece not yet built, and the
authored figure sets are the growth. Contrast and sticker are the two dark gates above.
Numbers move; LOG.md and the measurement JSONs are authoritative.
