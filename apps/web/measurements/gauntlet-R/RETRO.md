# R rebuild retro, run of 2026-09-05

Rounds and minutes per piece, against the S series baseline of about two rounds to a
verdict. Then one brief-delta per piece, written to be pasted into the next workflow
without editing.

The full narrative is in `apps/web/measurements/gauntlet-economy/LOG.md` under
"The R rebuild, 2026-09-05". This file is the arithmetic and the hand-back.

## Rounds and minutes

| piece | rounds | minutes | verdict | against the baseline |
|---|---|---|---|---|
| celebration-feed | 2 | not recorded | none, not judged | on the baseline for rounds, and the rounds bought no verdict |
| onboarding | 2 | not recorded | none, not judged | same |
| lesson-flow | 3 | 105 | judged, DOES NOT CONFORM | one round over, and the extra round did not close it |
| P5 charge meter | not recorded | not recorded | none, not judged | the piece that stalled twice in the economy run has a build and still has no verdict |
| integrate | 1 | not recorded | done, one blocker | the blocker is an instrument, not a design |

Three pieces, seven rounds, 2.33 rounds per piece against an S series 2.25 (S1 two, S2 two,
S3 four of which one was about design, S4 one). **The round count is normal and the verdict
count is not.** The S series turned nine rounds into four verdicts. This run turned seven
into one, and that one was negative.

**Minutes were recorded for one piece of five.** 105 for lesson-flow and nothing else, so
there is no per-round cost to compare against anything and no way to say whether the
three-round piece was the expensive one. Recording elapsed minutes per round is a workflow
change, not a builder change, and it is the cheapest instrument in this list.

**The thing to read off this table.** Rounds are being spent on building and not on
judging. Four of five pieces finished with the critic never opening the goal image, so the
run produced a large, green, well-argued diff whose conformance to the specification is
unknown. A gauntlet that stops judging is a build loop with extra steps.

## Brief-deltas, one per piece

Paste-ready. Each is a delta on that piece's existing brief, not a new brief.

### celebration-feed

```
DELTA: the piece was built over two rounds and never judged. Do not build. JUDGE FIRST.
Round 1 of the next go is a conformance verdict only: hold the built reward moment against
docs/reference/design-goals/blueberry_r6-lesson-complete_1788286354.png and the built Feed
against blueberry_r7-feed-v2_1788288479.png, and report conforms true or false with the
element-by-element list. Build only what that verdict names.
Carried in from S3's verdict and still unbuilt: their reward screen reports accuracy (92
percent) and ours omits it. The accuracy chip is this piece's, per that verdict.
Also yours to finish: src/mastery/ (MasteryCard, RankMark, RankUpMoment, masteryModel,
mastery.css) and beats/LessonGems.tsx are green and UNCOMMITTED. Commit them in your first
turn before touching anything, and say in the message which piece authored them.
```

### onboarding

```
DELTA: built over two rounds, never judged. Do not build. JUDGE FIRST, against three files:
blueberry_r9-onboard-welcome_1788289471.png, blueberry_r9-onboard-question_1788289477.png,
blueberry_r9-onboard-placement_1788289481.png. Report conforms true or false per screen.
The rulings this piece already implemented and the critic must check rather than assume:
every question carries a drawn structure (src/onboarding/figures.ts, StructureFigure.tsx),
the name sits UNDER the structure in the muted ink and never the body ink, option cards are
pictures with captions, and the questions are short with no compound sentences.
The COPY remains a human gate and is not yours to judge or to loop on. Judge the design.
```

### lesson-flow

```
DELTA: judged at round 3 and it DOES NOT CONFORM. The exit is not met and this piece is not
finished. Two problems to fix in order.
1. THE VERDICT HAS NO TRANSCRIPT. The run recorded the flag and not the reasons, so nobody
can act on it. Re-judge first, fresh context, against blueberry_r9-lesson-mechanism,
-reaction, -resonance and -synthesis (1788289491 / 506 / 496 / 500) plus the recipe strip in
blueberry_spec-question-badges_1788291079.png, and WRITE THE ELEMENT-BY-ELEMENT LIST INTO
apps/web/measurements/gauntlet-R/ before building. A verdict that is not in the repo did not
happen.
2. Then build only against that list. Cap: two more rounds. This piece is already one over
the S baseline.
Do not re-litigate two things that are settled and measured: the graded options carry a MARK
as well as a hue (WCAG 1.4.1, tick 4.79:1 against a 3.0 graphics floor, "your pick" 7.03:1
against 4.5), and there is NO RED on this screen per beat-chrome.css and CLAUDE.md's voice
section. Fill in the blank stays scratched.
```

### P5 charge meter

```
DELTA: rebuilt against blueberry_spec-meter-states_1788291102.png, top row, and never
judged. verdict null, unblind null. It is not a win and it is not a loss.
FIRST TURN: commit it. src/charge/ChargeMeter.tsx, chargeMeterModel.ts, meter.css, index.ts
and test/chargeMeter.test.ts are untracked, and ChargeGate.tsx and charge.css are modified.
THEN JUDGE, all four states plus the exam pause, against that sheet.
The builder's two arguments are on the record and a critic should test them rather than
accept them: the thirty pips became one capsule because the sheet draws a capsule, with the
"which end is leaving" reading kept as an OUTLINED ghost stretch beyond the solid fill; and
the full-state halo is a flat blurred fill of --progress-glow, not a box-shadow, so sticker
rule 3 is not engaged.
KNOWN STALE INSTRUMENT, and it is not yours to edit in a round that reports its number: the
measurement drives still count .charge-pip, which the superseded design had and this one
does not.
```

### integrate

```
DELTA: integration landed. Five tabs (Path, Train, Cards, Feed, Me), flask course chip in
the header, header clears the device cutout, shellRoutes.test.ts current.
THE ONE BLOCKER, and it is the next session's first job, in a commit of its own and NOT in
the same commit as anything that reports a number:
  npm run sticker:audit crashes in economy-moments.mjs at driveFeedback, waiting for
  input[aria-label="Numeric answer"]. PRE-EXISTING: verified by stashing every change and
  rebuilding at db9ab0f, where it crashes identically. Cause: the fill-in-the-blank scratch
  and the lesson-flow round changed which beat the driven lesson serves, so the driver types
  into an input that no longer exists.
Consequence to carry until it is fixed: the sticker rule counts for the five-tab bar and the
new header are UNMEASURED. The last honest walk is sticker-audit.json of 2026-09-02, total
34, and it predates every R piece. Do not quote 34 as a current number.
SECOND, same commit or its own: measurements/contrast-audit.json has been overwritten by a
probe. It holds 34 pathway SVG rows and measured 108, not a full composed walk. Restore the
gate's output and re-run it.
THIRD, not a blocker but the number to watch: game route payload 191.9 to 351.8 KB gzipped
in one round against a 400 KB ceiling. 48.2 KB of headroom for every piece not yet built.
The authored figure sets (mcqFigures.ts 773 lines, figures.ts 729, lessonFigures.ts 624) are
the obvious growth and the obvious lazy-chunk candidates. Decide it in a round that is not
also reporting the payload.
```

## One process change, and it is the cheapest thing in this file

Record elapsed minutes per round for every piece, and write every verdict into
`apps/web/measurements/gauntlet-R/` as a file rather than returning it as a field. This run
has one number for five pieces and one verdict with no reasons, and both gaps are workflow
plumbing rather than anything a builder or a critic did wrong.
