# Economy and Bloom gauntlet, 2026-08-27

Bar: Duolingo's live product, guest flow, captured lossless into
`docs/reference/competitors/duolingo-live/`. Each round: builder, capturer (labels
stripped, A/B assignment sealed in `assignment.json`), blindness audit, fresh judge.
The judge never learns the assignment; the script unblinds.

## P1 Bloom reactions

### Round 1: VOID, method error, not counted

Judge picked ours at 0.86. Not a win. The blindness audit reported the bar's owl
as "a recognisable trademark" and the re-strip step painted it out of the bar's
frames, so the judge faulted B for "no character anywhere on screen". A win over a
defaced reference is a lie. The audit now reports text and logos only, the re-strip
never touches a character, and a nonce forces capture and judgement to re-run.

What the judge held against OURS even while picking it, carried as the round 2 gap:
the 0 ms combo frame shows the dimmed lesson beneath, "Leave" overlapping the
progress bar, a ghosted "Finish lesson" under the mascot, then three quarters of
empty black with the streak count as a small caption rather than the largest thing.

Builder's round 1 work stands: berryReaction.ts (pure reaction table), ReactionStrip,
ComboInterstitial, Berry chain/sparkle/flash props, goggles up/down, capture-economy.mjs.

### Round 2: OURS WON BLIND, confidence 0.72. Exit met.

Blindness audit clean, both mascots untouched, no label stripping needed (viewport
captures carry no wordmark). Pairing: phone dark, ours vs run2 p30 (right), p23
(wrong), p61 to p64 (the "10 in a row" interstitial burst).

Why ours won, in the judge's words: the run interstitial puts the one number that
matters at display size with the 3 / 5 / 8 milestone ladder beneath it, so it reads
as a reward with a next target in under a second; the wrong frame explains the exact
error (ratio applied upside down) and offers the worked answer, where the bar shows
"Correct solution: gato" behind a hearts penalty modal.

What the judge held against ours even while picking it, queued for a later polish
pass and NOT looped on (the exit condition is the blind pick, not zero findings):
the 0 ms frame has the berry cut off by the footer with the bubble not yet in and two
sparkles floating; the middle 40 percent between the milestone pips and the character
is empty ground in every frame.

Builder note worth keeping: the round 1 edits were found in git stash@{0} (made on
294c5ea, during this round, by an interrupted attempt), applied with the entry left in
place. Foreign mistakeCard.test.ts still carries 2 failures of its own; not touched.

## P2 The reward moment

### Round 1: BAR WON, confidence 0.70

Audit clean. Pairing: phone dark, ours vs run2 p74 to p77. Ours (B) lost on
hierarchy: the settled screen shows XP three times (hero 25 XP, the First clear /
Flawless / Daily goal chips, and an XP 25 tile at the bottom) and flawless twice
(FLAWLESS pill, PERFECT 100% tile), so "the payoff decays into a dashboard" with seven
bordered containers under the hero. Transient bugs the burst exposed: the Diamonds
card reads +0 at 900 ms above a breakdown already summing to +95; TIME 0:02 is a
nonsense tile; the diamond icon lands on Bloom's eyes at 900 ms; Bloom barely reacts.

What the judge held against the BAR: its counter shows "00" at frame 1 and the "15"
at 900 ms has its digits on different baselines, a rendering glitch in the exact beat.

Gap for round 2: one hero number, at most two cards below the chips, stats row gone.

BLOCKER FOUND, being fixed in parallel: the web app never journals node_started, so
the mastery denominator (unlocked nodes) is 1 on a first clear and the receipt reads
+681 diamonds, New rank Exam Ready. The P2 capture seeds eight started intro nodes to
mask it; the real fix is a course-sized universe in deriveEconomy.

### Round 2, attempt 1: VOID, no verdict. Fable 5 credits exhausted

The builder and the parallel mastery fix both died on "out of usage credits" for
Fable 5, mid-edit. Neither produced a capture, so there is no verdict to record and
the round is not counted. Both left uncommitted partial work in the tree, which the
relaunch was told to finish deliberately rather than assume correct.

Model change, recorded because it changes who judges: rounds ran on Fable 5 by owner
direction (the reasoning is that a weak verdict is invisible and self-propagating,
where a weak calculation is loud). Fable credits are out, so from here builders and
judges run on Opus 5. The method is unchanged.

### Mastery denominator, fixed and then paid for

The fix landed (170 economy tests) and went further than briefed: flooring only the
no-course fallback left the bug alive, because three of four content courses are
narrower than the floor. Gen Chem I sums to difficulty 9, so one lesson read as
100 * 3 / 9 = 33, rank Mechanist, 250 diamonds. The floor now applies to every
denominator, and a course narrower than it caps below 100 on purpose.

It cost a budget regression, caught by re-measuring rather than by a gate: naming the
course made progress.ts import the corpus, and progress.ts ships in the game route's
entry chunk, so the initial payload went 176.4 to 260.9 KB gzipped. Under the 400 KB
ceiling, so nothing failed; it was still wrong. The universe is generated into
src/app/courseUniverse.generated.ts now and a drift test reads the real corpus.
Payload 178.7 KB.

OPEN, for the owner: ECONOMY.md says "a single node should move it a point at most"
and no authored course is wide enough. orgo_2 is the widest at 32 topics and gives
3.1 points per lesson; that needs roughly 100 nodes. Recorded rather than fixed,
because closing it is a content decision (finer lesson nodes than topics), not a
code one. ECONOMY.md is also not yet amended with the floor or the universe option.

### Round 2: OURS WON BLIND, confidence 0.72. Exit met.

Audit clean. Judge: ours makes the earned number the loudest thing on screen, a
large gold 25 XP counting up under falling confetti, with the reason chips (First
clear +10, Flawless +5, Daily goal +10) landing beneath so the student sees where it
came from, and a milestone card that says something specific ("A whole week. That is
a habit now."). The bar's payoff is a small 15 inside a box smaller than its own
headline, so it reads as a receipt; its mascot never changes expression across the
burst where ours opens its eyes and gets sparkles.

The builder also fixed, unprompted and correctly, the frame-zero stuck "0 XP" that
was the identical glitch round 1 had faulted the BAR for.

WHAT THE JUDGE HELD AGAINST OUR WINNER, and it is a real defect: the headline was
mid-purple on a purple-tinted ground, "the lowest-contrast text on the screen".
Fixed to --foreground.

THE INTERESTING PART: the contrast audit reported 0 failing over 1208 pairs and
missed it, because it walks eight tabs plus onboarding welcome and never finishes a
lesson. Every surface P1 and P2 built has therefore been unmeasured for contrast.
This is the failure mode STATUS.md already records once ("the token table was right;
the component did not use it"). The audit is being extended to seed and drive the
economy moments, sharing capture-economy's seeds through a new economy-moments.mjs.
A blind design critic found an accessibility defect that a dedicated accessibility
gate could not see, which is an argument for both and not for either.
