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
