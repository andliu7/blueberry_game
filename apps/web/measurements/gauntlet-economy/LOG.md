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
