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

## The contrast gate, rebuilt mid-run

The audit now seeds and drives five economy moments (feedback correct, feedback wrong,
combo, reward first, reward streak) as well as the nine hash routes, samples a
mid-animation frame as well as the settled one, and aborts rather than passing when a
drive fails to reach its moment or a root selector matches nothing. Composed pairs
1208 to 1992. The nine original routes behave identically, and the P1/P2 captures are
byte-identical after the refactor, so the change is inert where it should be.

FAILING went 0 to 7. Every one of these existed before; nothing regressed. They were
simply never composed anywhere the audit looked.

| # | ratio | floor | theme | pair | where |
|---|---|---|---|---|---|
| 1 | 2.76 | 3 | light | warn #d97706 on --reward-ground | Bloom's sparkles, reward moment |
| 2 | 2.81 | 3 | light | warn on --good-soft | the same sparkles in ReactionStrip |
| 3 | 2.90 | 3 | light | warn on the interstitial ground | the same sparkles, ComboInterstitial |
| 4 | 3.63 | 4.5 | dark | --primary text on --card | Pill tone primary, the answer-kind label |
| 5 | 4.10 | 4.5 | dark | --primary text on the page | "In a row", ComboInterstitial |
| 6 | 1.07 | 3 | light | --hud-track on the page | the daily goal ring, every tab |
| 7 | 1.81 | 3 | dark | --hud-track on the page | the same ring |

1 to 3 are one cause: the sparkle is --warn, which passes in dark and fails on every
light ground it actually lands on. Whether a decorative sparkle falls under 1.4.11 is
a human call and the audit deliberately does not make it; the practical argument for
fixing rather than exempting is that a sparkle at 2.8:1 is nearly invisible, and the
round 2 judge named the sparkles as a reason it picked ours.

6 and 7 are the P3 HUD's goal ring, found while P3's own round is still in flight. A
ring track at 1.07:1 is invisible, so the ring reads as a full circle at any value.

The fix pass waits for P3's round to close rather than editing the build under its
capture. The floor is RED until then, and is reported that way.

## P3 HUD header

### Round 1: BAR WON, confidence 0.72

Audit clean. The bar's at-rest header is two objects, a progress bar and a heart with
a numeral, so the pacing number is unmistakably the largest thing in it. Ours put
SEVEN chips up at identical size and weight (avatar, ringed XP, diamonds, streak,
charge, language, theme), so nothing answered "how much have I got left", and the
charge sliver was about 8px tall and collided with the header divider. The bar's
explainer is also a moment (a five heart row showing one spent, a spotlight ring cut
around the counter it explains) where ours is a labelled fraction that reads as a
settings tooltip.

Gap for round 2: one dominant pacing chip at 1.6 to 2x its neighbours, language and
theme out of the status row, three status items maximum.

What the judge held against the BAR, and it is worth keeping in view because it is
what ours should beat: its four burst frames are byte identical, so the moment has
literally zero motion, no heart drains, and no character appears in the modal at all.

TWO FINDINGS THAT ARE NOT ABOUT THE HUD, both fixed here:

1. The pathway banner rendered `unit.note` as an uppercase eyebrow ABOVE the unit
   title: "GATES UNIT 9'S CONTROL LOGIC AND ALL OF UNIT 12." That field is the
   dependency ledger the authoring waves burn down. It was engineering metadata
   pointed at a student, and it was the first thing the eye landed on. The banner now
   splits the authored title, so the eyebrow is "Unit 1" and the headline is the name.
   The field stays in the data where it is useful.
2. The bottom nav carries eight tabs across a 390pt phone, about 48pt each with 11px
   labels, and "Boards" and "Table" are unguessable. NOT fixed: the eight tabs and
   their order are CLAUDE.md's, so cutting to five with an overflow is an owner
   decision, not a builder's. Recorded for the human gate.

## Contrast fix pass: 7 to 0

All seven fixed in src, none by touching the audit.

- Sparkles now use --warn-ink-strong, which is what the table at the top of mascot.css
  already prescribes for the radical dot and the sparks. --warn passed on none of the
  three light grounds a sparkle is actually drawn on.
- Pill tone primary and the combo interstitial's text now use --primary-ink. The split
  between --primary as a surface and --primary-ink as ink exists for exactly this, and
  the 2026-08-27 audit created it for the same reason.
- --hud-track went from 26 percent to 65 percent of the muted foreground. The authored
  comment argued the track is "context, not information", and the measurement disagreed:
  at 1.07:1 the track is invisible, so the ring reads as a closed circle at every value
  and the daily goal always looks met. The fill carries the meaning; the track has to
  carry the extent.

One test caught the fix pass itself: berryState.test.ts scans the mascot CSS for
literal colours, and the explanatory comment quoted a hex value. The check was right
and the comment was changed, not the check.

Measured after: audit 0 failing over 1992 composed pairs, 836 web tests, 170 economy
tests, typecheck clean, suite 30 of 30, payload 181.7 KB against 400 KB.

### Round 2: OURS WON BLIND, confidence 0.78. Exit met. Highest confidence of the run.

Audit clean. The row is three items now (diamonds, streak, charge). The daily goal left
the row entirely and became the header's bottom EDGE, a full width 4px meter in place of
the border, which is the bar's in-lesson pattern rather than its path header's four equal
chips, and it costs the row zero horizontal space, which is what paid for a dominant chip
at 390px. Charge is 2.0x its neighbours, measured at 28px against 14px and floored at 1.6
by a new check, with 16px clearance from the header edge floored at 4 by another.

The judge's reasons are worth recording because two of them are ECONOMY.md's design being
validated blind, not our drawing:

- "Mistakes never cost charge" reassures a panicking student instead of threatening them.
  The bar's own framing, "Each mistake costs 1 heart! Stay sharp and focused", it called
  pure loss aversion aimed at a reader who is already stressed. That is the supersession
  argument in CLAUDE.md, decided independently by someone who could not see the file.
- Ours was "the only one that moves at all": the meter fills 7 segments to full across the
  burst and Bloom holds a warm expression, where all four of the bar's frames are
  byte identical, so its explainer renders fully formed and never changes.

Carried as the next polish gap, not looped on: six affordances still share the top row,
the charge tile is clipped against the top edge, and the same blueberry face appears four
times on one screen, so the number that matters fights five other glyphs.

Floors after: typecheck clean, 855 web tests, 170 economy tests, suite 30 of 30, contrast
0 failing over 1975 pairs, payload 183.6 KB.

## P4 Streak screen

### Round 1: OURS WON BLIND, confidence 0.72. Exit met on the first round.

Audit clean. Judge: ours makes the count the hero, it ticks 46 to 47 across the burst
so the moment has a payoff, the full week row fills in with Thursday marked as a rest
day, and a character says "Thursday was a rest day. Streak safe at 47." It called that
line "the only place in either screen where something on screen reacts to what the
student did."

THE ETHICS ARGUMENT VALIDATED A THIRD TIME, INDEPENDENTLY. The judge's sharpest
criticism of the BAR: its only sentence is "Practicing daily grows your streak, but
skipping a day resets it!", which it called, unprompted, "a threat, not a payoff"
delivered at the reward moment to a stressed student. That is CLAUDE.md's supersession
argument reached for the third time by a fresh critic with no access to the repo.

Two builder findings worth keeping:
- The seven day strip cannot be walked back from `current`, because a rest day bridges
  a gap WITHOUT incrementing the count, so the naive strip lights a day the student did
  not earn and hides the one the app gave them. streakModel.ts truncates the journal to
  the end of each previous day and re-derives, which is the honest way.
- The hero number was rendering in the display face, whose Georgia fallback has
  OLD-STYLE FIGURES, so a 30 day streak drew a small "3o" beside a full height 47. Now
  the sans stack with lining-nums.

### A STRUCTURAL FINDING THE BUILDER CORRECTLY REFUSED TO FIX ALONE

The streak now appears TWICE in one session: the reward moment renders its own streak
card and milestone card, then the streak screen shows the same thing one press later.
Duolingo's lesson-complete screen carries no streak at all; the streak gets a whole
screen to itself.

The builder could not act on it because **P2's capture asserts on the streak card**
(`[aria-label="Streak"]` and `data-reward-milestone === 7`), so removing it would fail a
won piece's capture. That is a ratchet: a passing assertion from an earlier round is
now preventing a correct structural change, which is exactly how a codebase quietly
ossifies. Recorded as its own queued piece rather than either forced through or dropped.
The resolution is deliberate: cut the streak and milestone cards from the reward moment,
amend P2's capture assertions in the same commit, and RE-JUDGE P2 blind rather than
assuming its win survives a change of that size.

Floors after: typecheck clean, 875 web tests, suite 30 of 30, contrast 0 failing over
2238 composed pairs, payload 185.4 KB.

## The sticker-ui validator, and its first baseline

`apps/web/measurements/sticker-audit.mjs` implements the ten mechanical checks in the
`sticker-ui` skill, over the built app, on 21 routes in both themes including the seeded
economy moments. 29,304 elements inspected. Exits 1.

**VIOLATIONS: 1027.** Not a failure of the run, the point of it. Baseline, by rule:

| count | rule |
|---|---|
| 188 | 5 radius floor |
| 160 | 3 no shadows on chrome |
| 150 | 4 outlines structural |
| 147 | 7 body recedes |
| 116 | 9 palette containment |
| 112 | 3 fake extrusion |
| 76 | 10 reachability |
| 56 | 2 no gradients |
| 22 | 6 colour as surface |
| 0 | 8 display floor |
| 0 | 1 paper canvas |

306 unresolved, scored neither way.

Every finding in the ruthless read is now a number. The fake-extrusion detector works:
112 hits, the pathway node lip among them, which a plain box-shadow check would have
waved through. Rule 6 is the most damning: saturated fill covers between **0.09 and 0.64
percent** of the painted page on every route measured. Colour is essentially absent as a
surface, which is exactly what the eye said and now has a figure.

**Two judgements the validator makes and declares rather than hiding.** It reports the
dark ground under rule 1 but does not score it, because light-first with dark as a choice
is a recorded owner decision rather than a violation. And it does not score the body's
hairline grid gradients under rule 2, because a 1px texture is not a colour ramp; it
flags them for a person instead. Both are the right call and both are stated in the
output, which is the difference between a judgement and a fudge.

**A false green it caught in itself, worth recording.** Rule 2 first reported clean, and
that was wrong: a gradient-painted element has no `background-color`, so the card test
could never see one. The check now reads `backgroundImage` directly and finds 56. A
validator that reports zero because it cannot see is worse than no validator, and this
is the second time this session that a gate has been measuring less than it claimed.

## P5 Charge meter: the round that stalled, and what it left

The workflow ran two builder attempts across roughly ten hours and never reported. The
first died on a session limit; the second stopped growing at 3.5 MB and sat there for
eight and a half hours. Killed deliberately under the rule written into the loop after
attempt one: if it fails or stalls again, split it rather than retry a third time.

**The work is real and it landed.** Typecheck clean, 931 web tests (up from 875, so the
builder added 56 and they pass), and the three failures the earlier audit found in its
own surfaces are fixed: contrast reads 0 failing over 5152 composed pairs. The builder
did the work and died before saying so.

**Three of four states exist:** the cost sheet, the empty sheet and the spend animation.
The exam window does not. The contrast audit found that for us by ABORTING rather than
scoring: "the drive did not reach the moment, so whatever is on screen is not the surface
under audit." That refusal is the feature. It is also why the gate could not run at all,
so the `charge-exam` route is withdrawn from the audit with a comment naming the exact
line to restore and the commit that should restore it. The drive is already written and
waiting. This is a withdrawal of a route for a surface that does not exist, not a
softened assertion, and the distinction is recorded because it is the kind of thing that
looks the same in a diff.

### The finding that should change the order of work

Sticker violations went **1027 to 1270** across three new routes, and fake-extrusion alone
went 112 to 196. Per route it is 48.9 to 52.9, so it is slightly worse per surface, not
just more surface.

The charge screens were built consistent with the house style, and the house style is
what the sticker validator is measuring against and finding wanting. So **every piece
built before the design sequence adds to the design debt it will have to pay off.** The
order already has S1 to S4 before P6 and P7, which is now not a preference but a
constraint: P6 and P7 should not be built in a style that S3 will then have to rewrite.

## S1 Four tab shell

### Round 1: BAR WON, confidence 0.72. But read where the gap actually sits.

Audit clean. The judge's biggest gap in ours: "every topic node renders in the same
purple fill at the same size with the same drop-shadow, so there is no current node, no
locked state, and no start affordance. A returning student has to read four multi-line
descriptions to work out where they stopped." It praised the bar for answering "what do
I tap right now" in under a second: one saturated node, ringed, labelled START, with
everything below it deliberately grey.

**That gap is real and it is not the tab shell.** `derivePathway` already computes five
states (done, current, open, review, locked) and has since Phase 5; the pathway simply
does not RENDER them distinctly. That is `PathwayTab.tsx`, which is S2's file and S2's
spec. A tab bar cannot be photographed alone, so S1 was judged on a full screen that the
pathway dominates, and it lost on the pathway.

So: **S1 is not recorded as won, its named gap is assigned to S2, and S1 is re-judged
after S2 lands.** Declaring it won because the defect belongs to a neighbour would be
exactly the kind of bookkeeping this loop exists to prevent.

### What S1 did achieve, measured

- Sticker, apples to apples on the 24 routes the baseline walked: **1270 to 1170**.
  Rule 10's nav half went **30 findings to 0**. Its mascot half improved 64 to 52 because
  the wordmark left the phone header. Rules 2, 3, 3-fake, 4, 5, 7 and 8 raised zero rows
  on pre-existing routes.
- Contrast 0 failing over **7858** composed pairs, up from 5152, because three shell
  moments joined the audit.
- 946 web tests, up from 931. Typecheck clean, suite 30 of 30, payload 189.0 KB.
- The owner amendment is written into CLAUDE.md as a PLACEMENT table (nav, tool,
  collapsed, flagged) rather than a shorter tab list, so every surface keeps its route
  and only its placement changes. It argues, correctly, that the periodic table's
  "always reachable" is strengthened by becoming a header tool: as a tab it was not
  reachable inside a lesson at all.
- It noticed the tab list was duplicated between the two audits and made
  economy-moments.mjs own it, which is the class of bug that bites exactly when a list
  changes.

### An escalation the builder raised rather than papered over

Rule 9 rose by 4 rows and could not be taken to zero honestly. All four are `#7c3aed`,
which is `--primary` in light AND the mascot's costume cape in `MASCOT_PALETTE`. Any new
surface using the brand colour adds rows, and the 154 baseline rows are the same
collision. **This needs an owner decision, not a builder's workaround:** either the cape
moves off the UI primary, or rule 9 must exclude the shared brand hue and say so. The
builder removed six other rows legitimately by moving tinted-disc glyphs to
`--muted-foreground`, which was the right call regardless.

## S2 Descending pathway and backdrop

### Round 1: BAR WON, confidence 0.78. Concept intact, execution buggy.

Audit clean. The judge credited ours with "more genuinely useful information (lesson
names, a unit title, a completion count)" and then faulted the execution: labels clipped
mid-glyph with no ellipsis, the active node's label touching its own progress ring, two
raw tan bars flanking the path, a static mascot identical at all four frames, and a bare
"4" on the locked node that could mean lesson 4 or 4 problems.

Its criticism of the BAR is the reason to keep going rather than retreat: "Not one node
carries a lesson name, five identical grey pucks, a chest and a trophy, so the screen
shows the shape of the course but not its content. A student who wants to know what
tomorrow's lesson is gets nothing but the next circle, which fails half the stated job."
Our information architecture is right. The rendering is not.

### The measured half moved a long way

| measure | before | after |
|---|---|---|
| sticker, baseline routes | 1170 | **1055** |
| 3-fake-extrusion | 196 | **0** |
| 5-radius-floor | 196 | 180 |
| 4-outlines-structural | 172 | 192 |
| contrast | 0 / 7858 | 0 / 7918 |
| payload | 189.0 KB | 188.9 KB |
| web tests | 946 | 974 |

The inherited S1 gap is fixed at the root: `OrgoMapTrack` never called `derivePathway` at
all. It derived state from a single boolean, `playable !== undefined`, so all 86 authored
nodes rendered identically no matter what the engine knew. `pathwayState.ts` now applies
derivePathway's rule line for line to the map's own ids, reading the journal because
`snapshot.lessons` is keyed by TopicId and a map node is not a topic.

Two decisions in that work worth keeping:

- **Desaturation is authored token values, not a CSS filter**, because the contrast audit
  reads computed colours and a filter would make it report a pair that is not on screen.
  That is a builder noticing one gate could lie to another and refusing to let it.
- **The node stopped being a fake extrusion.** The old `.path-node__edge` was a same-hue
  darker disc offset only on Y, which is the sticker language's own definition of a
  shadow. It is one shape now: a bordered well with a bordered face inset in it, depth
  paid for with an outline.

### A validator blind spot the builder declared rather than banked

Its words: the fake-extrusion detector scans previous siblings and pseudo-elements, so a
CHILD element is invisible to it, and the count going to 0 "is a consequence of the shape
changing, not the reason for it, and a person should confirm that against the captures."
That is exactly right and it is a real gap in `sticker-audit.mjs`: a fake extrusion nested
as a child would pass today. Queued as a validator fix, not a design one.

Gap for round 2: the label clipping first, then the tan bars, the static mascot, and the
ambiguous locked glyph.

### Round 2: OURS WON BLIND, confidence 0.72. Exit met.

Audit clean. The judge picked ours for the reason the piece exists: "B is the only one of
the two that actually answers the question this screen exists to answer: every node
carries a lesson title, completed nodes are green checkmarks, the next node wears START
with a partial progress ring, and the header states 2 of 86 lessons done. A is prettier
per pixel but semantically empty: five identical grey star discs with no titles, so a
student at 11pm can tell where they are in the run and nothing about what the run
contains."

It also faulted the bar for a contrast failure of its own: locked nodes at roughly 1.3:1,
"effectively invisible", reading as an unfinished render rather than as locked.

**Sticker: zero rows gained and zero lost against round 1's 1055, every rule identical.**
Contrast 0 failing over 7938 pairs. 990 web tests, up from 974. Payload 188.9 to 191.1 KB
for the terrain arithmetic and the label module. Suite 30 of 30.

Three pieces of engineering worth keeping in view:

- **The label clipping had a root cause, not a symptom.** `translateX` sat on the whole
  `<li>`, so the label column slid off the track with the node and was hard-clipped by
  `overflow: hidden`, while the space the node vacated on the other side went to nothing.
  The wind transform is on the slab only now, and the label reclaims the vacated gutter
  with a negative margin equal to the same offset, so a label opposite a node that swung
  66px away is 66px wider.
- **Chrome does not break at a solidus**, so "Allylic/resonance" was one 115px word in a
  105px column. `withBreakHints` inserts a zero width space after every solidus.
- **The tan bars were straight because the profile put three control points on a unit**,
  and a unit is 1200 to 2500px tall, so the boundary moved about 25px sideways over a
  screen height. Raising amplitude was blocked by the floor rule that the channel may
  never be narrower than the label column, so the wavelength shrank instead: a crest at
  each row's top and a trough at its centre, which is the real reaction coordinate of a
  multistep reaction, one step per lesson.

**Rule 4 did not come back to 172, and the builder reported why rather than forcing it.**
The pathway route contributes three rows to that rule and none is a pathway element: they
are `a.tabbar-brand`, `span.hud-goal` and the shared `Press` button, which appear on every
route and belong to S1 and the P pieces. Touching `Press` mid-gauntlet would move four
other pieces' surfaces. Left, and reported.

Carried as the next gap, for S3 rather than another S2 round: the torn-paper scroll edges
read as an unfinished background asset, muddy and asymmetric, and they cost horizontal
room the labels want.

### S1 Round 2, the re-judge: OURS WON BLIND, confidence 0.62. Exit met.

Audit clean. The judge picked ours for naming things: the course, "0 of 86 lessons done",
a real topic title beside every node, and a LABELLED bottom bar (Path, Train, Cards, Me)
where the bar ships five unlabelled icons and "the shield and the chest are a guess". It
also credited the header for ranking one counter above the rest instead of four
equal-weight icon-number pairs.

Sticker **1055 to 1020**, entirely from rule 5 (180 to 144). Contrast 0 failing over 8005
composed pairs. 990 web tests. Payload 191.5 KB. Suite 30 of 30.

**What the builder found when the verdict came through empty.** It went to the reference
and photographed the gap itself rather than guessing: the bar's icons are chunky
centre-filled cut-outs each holding its own colour, and ours were four hairline glyphs in
one grey, which is the shape of a settings menu. `TabIcon.tsx` had written that exact
intent into its own header in round one ("a flat shape in the tab's own colour") and then
drawn every layer in `currentColor`. Four hues now, measured 5.18 to 11.82 against the
3:1 floor 1.4.11 asks of a graphical object, and deliberately not the reference's green
per sticker-ui's rule about a brand's dominant colour.

**One edit the builder flagged for judgement rather than banking.** The rail wordmark was
an anchor to `#/pathway`, which is exactly where the Path tab directly beneath it goes:
two adjacent controls for one destination, only one labelled. Demoting it to a label
removed the redundancy and took 36 rows off rule 5 with it. Its words: "the finding count
moved because the design changed, not because anything in the audit did, but it is the one
edit where a number and a design argument pointed the same way and you should judge whether
you agree." Recorded because that is the right way to raise it.

### THE DEFECT IN OUR WINNER, assigned to S3

"The full-width purple bar directly under the header is unlabeled and sits about 70 percent
filled while the line immediately below it reads 0 of 86 lessons done. Either it duplicates
the charge fill four pixels above it, or it contradicts the progress text; either way it is
the first thing the eye lands on and it lies."

Verified in the code: it is the DAILY XP GOAL meter (`HudGoalBar`), correctly rendering
today's XP against today's goal. It carries `role="progressbar"` and an `aria-label`, so a
screen reader gets the truth and a sighted student does not. Two different progress
measures sit adjacent and only one is labelled.

It is not lying about its data and it still misleads, which is worse than a rendering bug
because nothing will ever fail. **Assigned to S3**, with a constraint: P3 won specifically
on the readouts being DRAWN fractions rather than written ones, with the goal meter as the
header's bottom edge costing zero horizontal space. Whatever disambiguates the two meters
must not undo that.

## S4 The loader and the first reveal

### Round 1: OURS WON BLIND, confidence 0.93. Exit met. Highest of the run.

Backfilled 2026-09-01 from the judge transcript in the workflow journal (session a42b2ba9,
wf_b742570f-e44), which the LOG missed when the round closed; until this entry the verdict
lived only in commit 7c5f2b3's subject line, which the calibration flagged as a record
defect. The assignment file (S4-r1/blind/assignment.json) seals ours as A; the judge picked
A at 0.93. In the judge's words: A puts something on screen at 0 ms, a branded field, the
mascot, a determinate progress bar that visibly advances across the 0/400/900 frames, and
one line of copy telling the student what the wait is buying, where B is a pure white void
for the first three frames and only snaps into its path at 2500 ms. On a phone at 1am that
difference is "the app is working on it" versus "did this crash or is my wifi dead".

Bar: the landonorris.com preloader captured 28 August, a full bleed colour field with one
small mark and a load word that WIPES away to reveal a page already at rest; and Duolingo's
own app open, which the live capture holds at `2026-08-27-run2/p04-course-picker-loading.png`:
white ground, wordmark, and three grey dots.

**What was there before: nothing.** `<div id="root"></div>` is empty until the entry chunk
has been downloaded, parsed and run, so the first thing every student has ever seen on a cold
open is a white rectangle, which CLAUDE.md already rules is never a loading state.

**The shape of the answer, and the one structural argument in it.** A React component cannot
close that gap, because a React component IS the thing being waited for. So the field, the
mark slot, the hairline rule and the word are markup in `index.html` and paint with the
document; `src/app/Loader.tsx` adopts that layer rather than redrawing it. One copy of the
design, in the place that paints first, and no second copy to drift. The reasoning behind
every CSS rule lives in Loader.tsx and not beside the rules, because comments inside an
inline `<style>` are shipped to every student uncompressed: moving the prose took index.html
from 3839 to 2776 bytes gzipped.

- Field: `#6d28d9` light, `#2e1065` dark. The mark is the live Bloom, portalled into the
  slot, so the blink is Berry.tsx's own rAF clock and not a second implementation.
- The rule reports three REAL milestones, never a timer: the document parsed (0.16, written
  by index.html), the entry chunk ran and the store was read (0.58), the route's own chunk
  resolved (0.92). The fourth position, 1.00, lands at the instant the field parts. "Ready"
  is not said until then, because writing it and then holding the door shut for another
  second is a sentence contradicted by the screen it is printed on.
- The middle word differs for the two students who see it: "Finding your place" when there
  is a journal to read, "Setting up" on a first run.
- The reveal: the mark scales to 2.15 and dissolves, and the field parts in two halves from
  the line the mark sits on, 820 ms, `cubic-bezier(0.5, 0.02, 0.2, 1)`. The pathway behind it
  was mounted and at rest the whole time. Transform and opacity only; `test/bootLoader.test.ts`
  parses the block and fails on anything else.
- `prefers-reduced-motion`: the first three beats hold and the reveal is a 120 ms cross fade.
  Measured, not asserted: `removedAt - revealAt` is about 165 ms on those runs against about
  880 ms on the others, and the drive requires Bloom did NOT blink there.

**Two capture findings worth keeping.**

The reveal is at the 1250 ms floor and the judged cadence is 0/400/900/2500, so the default
four frames step either side of the wipe and never inside it. `boot-wipe` is a second cold
open of the same moment with the burst moved to 1250/1480/1670/2250, named so a judge can see
it is one event photographed twice. And PNG encode blocks the page it is photographing: at
2560 by 1800 the 900 ms frame can still be encoding when the 1250 ms reveal timer is due, which
put one burst's reveal at 2.4 s. A context per run, 1200 ms of quiet between runs, and one
LOGGED retry in the shape sticker-audit.mjs already uses.

**A pre-existing measurement bug this piece had to fix to get a number.** The sticker audit
failed at `hud-streak` on the phone twice in a row, on both attempts, in different themes.
Cause: `readHud` measured `getBoundingClientRect()`, which is the TRANSFORMED box, on buttons
carrying `.press` (`transform: scale(0.96)`, 120 ms back), and the streak and charge drives
read the header immediately after pressing one. Four clean runs measured the same 44px button
at 43.9, 43.5, 44.0 and 43.8, and 43.5 is exactly the slack `hudGeometryHolds` allows. It now
reads `offsetWidth`, which is the layout box CLAUDE.md's 44 by 44 budget is actually about and
is immune to transforms: 44.0 on four of four runs, and `driveRetries` came back empty. The
tolerance was left alone; it is there for fractional layout, which is a different argument.

### Measured at the exit of round 1

- Contrast **0 failing over 8037 composed pairs**, up from 8005: the loader is a route in the
  audit now (`?boot=hold`, the piece's one hook, because a surface that removes itself after
  1.25 s cannot be reached by a script that navigates and then measures). Its two new pairs are
  the word on the field, 6.48:1 light and 12.83:1 dark against a 4.5 floor.
- Sticker **1020, unchanged, and +0 on every one of the ten rules.**
- Payload **192.2 KB** against 191.5 KB at S1 round 2, so **+0.7 KB** on the gate, all of it
  Loader.tsx in the entry chunk. Reported separately because the gate does not weigh it:
  index.html went 571 to 2776 bytes gzipped, so the real first request is about +2.9 KB.
- 999 web tests, up from 990. Typecheck clean. Suite 30 of 30, integrity unmodified.
- 48 frames in `S4-r1/self-check`, both themes, both viewports, three bursts each, every one
  asserted through `driveBoot`.

**What a critic will still have.** There is no wordmark: the bar's splash names the product
and ours shows only the character, which is the spec's "the mark alone" and is a real risk in
a blind pair. The wipe parts on one axis where "outward from the mark" suggests a radius, and
the argument for two panels rather than a growing hole is a browser support one, written in
Loader.tsx. The 1250 ms floor is time taken from every student on every cold open. And the
120 ms reduced motion fade is shorter than one PNG encode, so it is evidenced by a number in
the drive rather than by a frame.

## S3 The design pass

### Round 1 and round 2: both builders were interrupted. Round 3 finished the piece.

The two earlier attempts left a working tree rather than a report, and this round adopted it
instead of restarting. That is recorded plainly because the diff is theirs as much as mine:
the tally, the charge cell, the rule 7 ink sweep, the hit target script and the pathway
channel rework came out of rounds one and two, and round three's own additions are the tab
rail wordmark, the flank wash, the channel amplitude and every number below.

Three defects were carried in. All three are addressed and none of the three is finished.

### D1, the unlabelled goal meter, and why a label was not the fix

The judge's sentence was about what the EYE does: "a full width purple bar sits about 70
percent filled while the line immediately below it reads 0 of 86 lessons done". Round one of
this pass put a 10px "TODAY'S GOAL" caption at the left of the bar, and that answers a
different complaint. A labelled 70 percent bar four pixels above a 0 percent sentence is
still two progress statements of the same KIND, and a reader resolves kind before a 10px
caption.

So the KIND changed and the adjacency was broken, which are two fixes for one defect.

- **The strip is a tally.** Ten discrete ticks, inked from the left, the tick the student is
  inside filled to its own fraction rather than snapped. A row of countable units is a ration
  of a day and cannot be read as a percentage of a course, because a course does not come in
  ten parts. It is the move the charge coach mark already makes with its thirty pips.
- **The sentence moved onto an object.** The pathway's course header is a bordered cream card
  now, so "0 of 86 lessons done" is text inside a thing on the page rather than a caption
  hanging under the header's bottom edge. Two statements on two planes are two statements.
- **P3's win survives intact.** The fraction is still only DRAWN, there is no written
  "14 / 20" anywhere, the strip is still the header's bottom edge and still the divider
  Shell.tsx dropped its `border-b` for, and it still costs the readout row zero horizontal
  space. `hudGeometryHolds` reached all four HUD routes with `driveRetries` empty.
- **The second meter is still there.** The charge chip's own 112 by 6 meter sits in the same
  header. It is a different genus now, a continuous fill inside a control against a row of
  countable units on the header's edge, but a critic who counts meters still counts two.

The bar does not solve this because it never creates it: on its path screen Duolingo draws no
progress meter at all, and where it does draw one, in p21 and p16, there is exactly one per
screen and a control beside it naming its scope. Ours is a global header, so it cannot be one
per screen, and separation by kind is the move that was available.

### D2, the torn paper scroll edges, and the seam that replaced them

The muddy asymmetric hillside is gone: the `#9c7f4e` fill went in an earlier round and the
channel is the card's own cream with a 2px `--path-edge` hairline. Two things this round
found on top of that, both by sampling the capture rather than by looking at it.

- **The basis went back to the label column.** The scene had been passing 0.36 of the column
  where terrain.ts's own header states the invariant as half of it, and the consequence was
  measurable: on a desktop the channel was 357px against a 496px label column, so node titles
  were struck through by the boundary stroke and their first third sat on the bare lavender
  at 4.73:1, the thinnest margin in the app. The floor is the column plus a 12px gutter now,
  and the SWING absorbs the viewport instead.
- **The flank wash was a seam and it is gone.** Sampled at 2x off the round two capture, the
  flanks stepped from rgb(163,174,226) to rgb(157,167,218) on one dead straight full width
  line at y 205, because the scene is a sticky viewport sized surface whose flow position is
  the top of the TRACK, so the strip of page above it cannot be washed by anything the terrain
  draws. Two and a half percent of lightness is not worth a straight seam across a landscape,
  which is the "unfinished background asset" reading arriving in a new place. `--path-shade`
  is `transparent` in both themes: the flank is the page's own ground. Re-sampled after, the
  only colour change down that column is the header's own bottom edge.
- **The amplitude came down, 24px to 16px.** Against a wash the boundary was a soft change of
  surface; against the page's own lavender it is a hard colour edge, and a hard edge wandering
  24px over a 170px row pitch reads as a deckle. The recorded S2 constraint is that the
  WAVELENGTH carries the reaction coordinate and the amplitude does not, so this costs the
  meaning layer nothing.

### D3, the design debt, 194 rows to 32

Per rule, at 8c5cda6 and now. The audit script was not touched: `git log` shows
sticker-audit.mjs unchanged since 7c5f2b3, so this is design work and not a moved gate.

| rule | before | after |
|---|---|---|
| 1-paper-canvas | 0 | 0 |
| 2-no-gradients | 0 | 0 |
| 3-no-shadows | 0 | 0 |
| 3-fake-extrusion | 0 | 0 |
| 4-outlines-structural | 52 | 4 |
| 5-radius-floor | 8 | 4 |
| 6-colour-as-surface | 4 | 4 |
| 7-body-recedes | 64 | 0 |
| 8-display-floor | 0 | 0 |
| 9-palette-containment | 0 | 0 |
| 10-reachability | 66 | 20 |
| **total** | **194** | **32** |

What moved, and each one is a design sentence rather than a suppression:

- **Rule 7 to zero.** Every small coloured word went to the page's own ink and the colour
  stayed on the shape under it. That is not a concession to the audit, it is
  docs/DESIGN-TOKENS.md's own sentence about the glyph inside a `--tab-active` disc, applied
  everywhere it was true.
- **Rule 4, 52 to 4.** Filled primary controls carry `--primary-edge`, the courses card's
  outline moved onto the pressable rather than a box inside it, and the goal fill stopped
  being one 630 by 8 bare block.
- **Rule 10, 66 to 20, and it had not moved in four rounds.** Two mascot instances left one
  screen each. Bloom came out of the header charge chip, where his halo drew the charge
  fraction a second time at 26px beside a meter that draws it legibly, and a drawn charge cell
  took his place. And the desktop rail's wordmark lost its face: that 32px glyph was
  `BlueberryMark`, the exact component `Berry` renders, so every desktop screen drew the same
  character twice. **We are stricter than the bar on this, deliberately.** Duolingo's rail
  carries the owl above its nav while the owl is also on the page. Ours is a word where its is
  a mark, and the character is then worth something when it appears. It is the same shape of
  argument as rule 3, where the bar's own nodes are fake extrusions and ours are outlines.

### A budget violation no gate was reading, now gated

CLAUDE.md's Budgets table carries a 44 by 44 minimum hit target and nothing measured it: the
sticker audit scores colour and shape and never area, and `hudGeometryHolds` walks three
header readouts. The pathway's side quest chip had measured 154 by 34 since the S2 round, on a
live pressable link, on the tab a student opens first. `measurements/hit-targets.mjs` is the
gate, wired as `npm run hit:targets`, and it reads `offsetWidth` and `offsetHeight` rather than
`getBoundingClientRect` for the reason the S4 round found the hard way with `.press`'s
`scale(0.96)`. 838 controls over 11 routes and 2 viewports: one under the floor before, zero
after.

### Measured at the exit of round 3

| gate | before, 8c5cda6 | after |
|---|---|---|
| contrast, failing pairs | 0 of 8086 composed | 0 of 7855 composed |
| sticker audit total | 194 | 32 |
| game route payload, gzipped | 191.7 KB | 191.9 KB, ceiling 400 |
| web tests | 999 in 36 files | 999 in 36 files |
| typecheck | clean | clean |
| hit targets under 44 by 44 | 1 of 838 | 0 of 838 |
| validator suite | 30 of 30, integrity unmodified, 101 fixtures | identical |

The contrast pair count fell by 231 and the unresolved marks by 254, and that is one cause:
two mascot instances left the walk, and mascot internals are most of both buckets. Zero
failing on both sides is the number that matters; the denominator moving is reported so it is
not mistaken for coverage lost elsewhere.

`S3-r3/self-check` holds 96 frames, six moments, both themes, both viewports, all 24 reached.

### What a critic will still legitimately have

- **Two meters are still in one header.** The goal tally and the charge chip's fill are
  different genera now and both are still horizontal progress readings 13px apart. A judge
  who counts rather than reads will count two.
- **Rule 10 is 20, not 0, and every remaining row is a sheet over a page.** The charge sheet
  and the combo interstitial draw the character over a screen that already has one behind the
  scrim. The right fix is that a page under a full screen sheet should not also be drawing
  Bloom, and I did not take it: the pathway header's Bloom is there because a blind judge
  asked for a face with an opinion about the count beside it, and removing it to move a number
  would undo a judged win.
- **Rule 4 and rule 5 are both the same element, four rows each.** `div.backdrop__plate--drift`
  is the trainer's photographic wallpaper. The audit classifies it as a card because
  `paintsOwnSurface` returns true for any background-image, and rules 4 and 5 then ask a
  wallpaper for a border and a 12px radius, which are not things a wallpaper has. I did not
  add an exemption. Adding one in the same round that banks the number is exactly the pattern
  CLAUDE.md forbids, and a border on a full bleed tint would be a worse design than the eight
  rows. It is an audit limitation, it is named here, and it is somebody's to rule on when the
  round is not also the one reporting the total.
- **Rule 6 is 4 and I did not touch it.** Desktop dark feedback-correct at 0.49 percent,
  feedback-wrong at 0.34, onboarding at 1.67 light and dark, against a 2 percent floor. The
  diagnosis is real: in dark mode this app spends colour as alpha washes, `--good-soft` is
  `rgba(52,211,153,0.16)`, and an alpha wash is an accent rather than a surface, which is
  precisely what rule 6 exists to say. The fix is a flat token, which is also what
  DESIGN-TOKENS.md already ruled for `--tab-active`. I did not make it: `--good-soft` has
  about eighteen consumers, several of them composing `text-good-ink` on it, and re-deriving
  that many pairs against a 0-failing contrast gate is a risk out of proportion to four rows
  at the end of a round. hud.css also records the translucency as deliberate, so it is a
  decision to make with that piece rather than around it.
- **The channel edge still kinks.** At 16px of swing the boundary reads as a drawn curve for
  most of its length and still shows small sharp steps where two samples meet, most visible on
  the desktop frame around the third and fourth rows. That is the curve construction, not the
  amplitude, and it is the next thing I would fix.
- **The lavender palette's provenance is still unverifiable, and it is what most of the
  sticker fall rests on.** `theme.css` cites five approved concept images that are not in the
  repository, and CLAUDE.md's bar rule says a critic who cannot open its reference reports
  that and stops. docs/DESIGN-TOKENS.md now records the divergence and names the two ways to
  close it, which is the half a builder can do. Nothing was reverted on my judgement, and
  until the images are committed or the direction is recorded without them, a blind judge
  cannot check the ground colour against the thing it claims to come from.
- **Round 3 judged its own inherited work.** Rounds one and two wrote most of this diff and
  were interrupted before reporting. I re-ran every gate from a clean build rather than
  trusting their JSON, and the sticker total I inherited, 46 on their last run, differed from
  mine by the fourteen rows my own change removed. But no fresh critic has looked at the
  frames, and a builder reading his predecessors' comments is not a blind comparison.

### Round 4, the verification pass: the design work holds and the GATES ARE A CLOCK

Round 3 committed at 6db7a11 and reported its numbers. This round re-ran every one of
them from a clean build rather than reading the JSON, which is what found the following.

**The sticker audit and four of its routes are only reachable for part of the day.** Two
independent wall clock cliffs, both pre-existing, both dating to ee6c5b8 when the audit
first reached the economy surfaces, and neither of them anything the design pass did.

- **The mastery cliff, roughly 15:45 local, now FIXED.** `hudSeed()` mixed two anchors:
  its history sat at local noon via `noonDaysAgo` while its "today" events sat at
  `minutesAgo` from the wall clock, so the gap between the two grew as the day ran on and
  the history aged by up to twelve hours between a morning run and an evening one. Mastery
  decays, so the derived score fell with it: measured 16.8 just after local midnight, 15.7
  at 21:22. `MASTERY_RANKS` puts Arrow Pusher at exactly 16.0 with a 125 diamond award on
  it, so the seed's diamond balance flipped 137 to 12 partway through every afternoon and
  `HUD_EXPECTED.diamonds` stopped matching. All four HUD moments then failed to reach and
  the audit aborted, correctly, having measured nothing.

  Fixed by `exactDaysAgo`, a sibling to `noonDaysAgo` that subtracts whole 24 hour periods
  so an event keeps the local calendar day noon anchoring gives it while also keeping a
  CONSTANT AGE. Used in `hudSeed` only, so no other seed's asserted numbers move. Measured
  after: one distinct derived state over a 36 hour sweep, score a flat 16.2, earned 262,
  balance 137, and hud-rest reached on nine of nine browser attempts across both themes and
  both viewports. **No assertion was touched.** The seed now produces the state its own
  comment says it produces, which it had stopped doing.

- **The at risk cliff, 18:00 local, NOT FIXED, and it is the blocker.** `driveHudStreak`
  requires a sheet line containing the literal "daily goal". `hudModel.ts` writes three
  branches for that line and only two carry the phrase; the third is the at risk copy,
  which `derive.ts` selects when the goal is unmet and `localHour >= STREAK_AT_RISK_HOUR`,
  and that constant is 18. So after six in the evening the seed renders "Hit your goal
  today to keep it. A free rest day covers you once a week.", the clause fails, hud-streak
  does not reach, and the audit aborts. Everything else about the sheet is right: sheet
  streak, headline "5 day streak", seven units, one spotlight, one CTA, no eyebrow, three
  of three attempts.

  **I did not edit the clause and the audit is therefore RED for me.** It is tempting,
  because the check's own comment says it is testing that ECONOMY.md's release valve is
  named, and the at risk copy is the only one of the three branches that actually names
  the rest day. But CLAUDE.md's rule does not have an exception for an assertion that looks
  wrong to the person blocked by it, and rewriting a check while also reporting the total
  it produces is the exact pattern the rule exists to stop. It is somebody's to rule on
  with the P3 piece.

  The shape of the real fix, recorded so the next person does not re-derive it: the drive
  pins a copy BRANCH, and the seed cannot choose the branch because the branch is a
  function of the wall clock. Either the moment is split into its two honest states, at
  risk and not, each with its own drive and its own copy, or the harness pins the clock in
  the page. The second is the bigger change and it would need care around charge, which
  regenerates against the live clock and is asserted at "17 of 30".

**The evidence that this is not theoretical.** The `sticker-audit.json` committed at
6db7a11 carries `"generated": "2026-09-01T19:41:26.430Z"`, which is 15:41 local, inside
the last few minutes of the window before the mastery cliff and two hours before the at
risk one. Round 3's 32 is a real measurement honestly taken; it was also taken with about
four minutes to spare, and nobody knew the window existed.

### Round 4 gate numbers

Everything that could be run, was. The two that could not are named rather than estimated.

| gate | round 3 reported | round 4 re-measured |
|---|---|---|
| typecheck | clean | clean |
| web tests | 999 in 36 files | 999 in 36 files |
| validator suite | 30 of 30, integrity unmodified, 101 fixtures | identical |
| game route payload, gzipped | 191.9 KB | 191.9 KB, ceiling 400 |
| hit targets under 44 by 44 | 0 of 838 | 0 of 838, 11 routes x 2 viewports |
| contrast, failing pairs | 0 of 7855 composed | 0 of 7863 composed, 167 distinct, 1209 unresolved |
| sticker audit total | 32 | BLOCKED after 18:00 local, cause above |

The contrast audit does not walk the four HUD routes, which is why it runs at any hour;
its composed count moved by 8 pairs against round 3 and the failing count is 0 on both
sides. The largest near floor group is unchanged and is worth repeating because it is the
thinnest margin in the app: `rgb(57,65,83)` body text on the lavender ground at 4.73:1
against a 4.5 floor, 529 instances, which is 5 percent of headroom and is a direct
consequence of the palette turn whose provenance is still unverifiable.

**On the sticker number, and what is and is not verified.** The 32 in
`sticker-audit.json` is a real measurement of a source tree byte identical to the one on
disk now: nothing under `apps/web/src` has changed since 6db7a11, and this round touched
only `measurements/`. So the per rule split is checkable and was checked by reading the
JSON: rule 4 is four rows and rule 5 is four rows, both of them the same
`div.backdrop__plate--drift` trainer wallpaper; rule 6 is four route level rows on
feedback-correct, feedback-wrong and onboarding in dark and light desktop; rule 10 is
twenty rows on charge-cost, charge-empty, charge-exam, combo and hud-charge, every one of
them a sheet drawn over a page that already has a mascot, exactly as round 3 described.
What is NOT verified is that the audit still returns 32 when re-run, because it cannot be
re-run after 18:00 local. That is a claim about a number, not about the design, and it
should be re-taken in the morning before the piece is judged.

The design work itself was read rather than assumed, and it holds: the goal strip is ten
discrete ticks with the current tick filled to its own fraction, no written fraction
anywhere, still the header's bottom edge, still zero horizontal cost to the readout row,
and `hudGeometryHolds` green with `driveRetries` empty on every run this round.

## The operational finding that cost the most: the loop was killing its own builders

Every stalled or retried round in this run ends the same way. The transcript's last line
is `[Request interrupted by user]`, not an error and not a session limit.

Interrupts propagate from the orchestrating session to the workflow agents it spawned. So
every time the loop woke up to CHECK on a round, it had a chance of killing the builder
working on that round, and the workflow then restarted the piece from nothing.

The bill:

| round | cost |
|---|---|
| P5 charge | two builder attempts, about ten hours, never reported. Killed and split |
| S1 shell | one full builder attempt discarded |
| S3 look and feel | one builder attempt discarded at roughly three hours |

Lengthening the interval to an hour did not fix it, it only made the collisions rarer:
S3's builder was interrupted by the 11:39 wakeup after running cleanly since 09:40.

**The wakeups were also redundant.** A workflow posts a completion notification on its own,
including when it fails, so the scheduled check bought nothing that the notification did
not already provide, and it cost a builder every time it landed on one.

The dynamic loop is stopped. Rounds now wake this session only when they finish. The
watchdog rule stays for a genuinely hung workflow, but checking is now event driven rather
than polled, which is what it should have been from the first round.

## The instruments that only worked before dark

The S3 round 3 builder reported the blocker rather than editing the clause, and the fix
landed separately, as the discipline asks. Two wall-clock bugs, one root lesson.

driveHudStreak asserted a sheet line containing "daily goal", a phrase only the before-six
copy branch contains: derive.ts flips atRisk at STREAK_AT_RISK_HOUR (18) and hudModel swaps
the authored sentence, so the drive failed every evening and the sticker audit aborted
having measured nothing. The assertion is now exact per branch, full authored sentence
rather than substring, stronger where it used to pass, and after 18:00 it finally checks
what its own comment always claimed: that the rest-day release valve is named.

p4ExamSeed and p5ExamSeed built their exam date with toISOString(), which is UTC, while
the app counts exam days in local time. After 20:00 EDT the UTC calendar has rolled, the
seeded exam read "in 10 days", the drive asserted "in 9", and charge-exam stopped
reaching. Both seeds now use local calendar days via setDate, which is also DST-proof.

Proof both fixes hold: the full audit ran at 22:37 local, all 29 routes reached with
driveRetries empty, and reported 32, the same figure the round 3 builder inherited from
the 19:41Z JSON and could not reproduce that night. The number nobody could re-take after
dark is now a number anyone can.

The lesson, recorded for the next drive an author writes: THE CLOCK IS PART OF THE
SURFACE. A seed pins history; it cannot pin the hour. Any assertion downstream of copy or
counts that branch on wall time must either assert per branch or seed the clock itself.

## S3 look and feel: OURS WON BLIND, confidence 0.66. Exit met.

Four rounds to a verdict, and only one of them was about design. Round 1's builder died to
a connection drop. Round 2 built (6db7a11), captured, and was voided by our own audit for
a leak on the BAR'S side: the Spanish flag course chip plus SECTION 1, UNIT 1, Order at a
cafe named the product outright, so the pair was unfair in the bar's favour and the audit
refused it, which is the audit doing its job in the other direction for the first time.
Round 3's builder verified the design (sticker 194 to 32, rule 7 64 to 0, rule 4 52 to 4)
and was blocked from re-measuring by the wall-clock instrument bugs recorded above, which
it reported rather than edited. Round 4, after the instrument fix, captured a fair pair
(flags now named strippable marks, both sides stripped equally, audit clean), and the
judge picked ours.

Why ours won, in the judge's words: truthfulness and instant comprehension outrank polish.
The reward screen itemizes its headline number, First clear +10, Flawless +5, Daily goal
+10, summing exactly to the 25 shown; the charge meter pairs a number with a bar that does
not contradict it; the goal pips are captioned; every lesson on the path is named and all
four tabs are labelled, where the bar's nodes are anonymous grey discs, its bar icon-only,
and its TOTAL XP 15 arrives with no account of itself.

What the bar still does better, carried as R's brief: craft and finish across the board,
and specifically PAIR 2, the lesson question screen, the best single frame of the six on
their side and the worst on ours: a large dead zone, a floating mascot, and an outlined
Check whose disabled state is ambiguous where theirs is unmistakable. Their reward screen
also reports accuracy (92 percent), an honest performance measure ours omits. Both go to
the R rebuild: the lesson-flow piece owns the question screen, the celebration piece owns
the accuracy chip.

D1's residue stands as the round 3 builder wrote it: two meters of different genera still
share the header, a real argument a counting critic may still make. Recorded, not hidden.
