# Gauntlet log: Mechanism Trainer

One entry per builder round. The bar for this surface is Alchemie's Mechanisms, by the committed
captures in `docs/reference/alchemie/`, never from memory.

## 2026-08-21, depth-and-molecule-drag, round 1

Bar: `docs/reference/alchemie/01-mechanism-canvas-full.png`.

What changed:

- `apps/web/src/render/svg/depth.tsx` (new): shared depth glyphs. Atoms are shaded spheres (radial
  gradient with an off centre highlight, a rim shade, one feDropShadow filter per species group).
  Bonds are thick capsules that stop at the atom surface, with a pale highlight stroke for the
  cylinder read. The implicit hydrogen count sits on a faint arc at the atom's open angle. The
  charge badge is a small shaded disc with its own shadow.
- `DrawCanvas.tsx`: draws from the glyphs above. A press the hit tester resolves to an atom body,
  with nothing armed, becomes a carry once the pointer travels 6 px; the canvas moves the species
  and sends the machine nothing until release, when it dispatches a pointerUp at the original press
  point so the machine sees a tap. Bonds, hydrogen arcs and lone pair dots sit in a per species
  group whose transform has a 120 ms overshoot transition, so they trail and settle; reduced motion
  drops it. The carry is clamped to the frame. Bond end handles draw as small end caps (hit radius
  unchanged at 11).
- `hitLayout.ts`: `applySpeciesOffsets` builds the live scene from the authored one plus per species
  pixel offsets; `speciesOf` maps atoms to species. Targets are built from the live scene, so drop
  sites follow the atoms.
- `TrainerTab.tsx`: holds the offsets, derives the live scene, passes both to the canvas.
- `MoleculeSvg.tsx`: playback uses the same glyphs so the handoff after a correct answer does not go flat.

Measured: `npx tsc -b apps/web` clean; `npm run validate` 30 of 30; headless steady state 60 fps,
worst gap 17 ms, framesOver20ms 0.

Screenshots (synthetic PointerEvents, mouse, 120 px down-right from the C atom body):

- mid drag, held: `apps/web/measurements/gauntlet-shots/depth-and-molecule-drag-r1-mid.jpg`
- 400 ms after release: `apps/web/measurements/gauntlet-shots/depth-and-molecule-drag-r1-end.jpg`

Known limits: a still cannot show the 120 ms lag, so the two shots look alike by design. The drag
ran through dispatched PointerEvents because the browser tool has no held mouse down.

## 2026-08-21, arrow-anchor-and-drop-sites, round 1

Bar: `docs/reference/alchemie/extra/x01-drag-inflight-dashed-guide.png`.

What changed (`apps/web` only; `chem-core`, `interaction`, `validators` untouched):

- `hitLayout.ts`: `bowAwayFrom(from, to, away, magnitude)` picks the quadratic control point on the
  side farther from `away`, so a curve arcs around a molecule rather than across it.
- `DrawCanvas.tsx`: every arrow, in flight and committed, starts on its source anchor via
  `targetAnchor` (the tapped lone pair slot, or the bond's midpoint; a committed lone pair arrow
  uses the slot facing its sink since the arrow does not remember the slot). Sinks resolve to
  geometry: an atom sink lands on the atom SURFACE on the side the curve arrives from
  (`rimPoint` toward the control point, 3 px clearance); a between-atoms sink is a forming bond,
  drawn as a dashed stub between the two atom surfaces, and the arrow lands on its middle. The
  curve bows away from the centroid of the species the electrons leave.
- In flight: the guide is a dashed curve with the head at the finger. Its landing comes from the
  machine's own `inferSink(draft.armed, guide.snappedTo, step.from)`, so the preview shows exactly
  what a release would commit (a lone pair dropped on C forms the O to C bond, so the guide lands
  on that stub and C gets a halo, not a centre-of-atom ring). When the release would land, the drop
  site gets a ring; otherwise the head rides the pointer. The machine decides; the canvas only draws.
- The armed lone pair's dots glide up to 7 px toward the pointer (60 ms ease) so the electrons
  visibly start to move. The halo stays on the slot.
- Removed the dashed ring around the armed atom: with the slot already solid it read as a second
  drop site. The offered between-atom sites now draw as faint dashed stubs between surfaces instead
  of filled discs at the midpoint.
- Hit targets unchanged: touch still floors at 22 px radius (44 pt).

Measured: `npx tsc -b apps/web` clean; `npm run validate` 30 of 30; headless see the commit message.

Screenshots (synthetic PointerEvents in CSS px, mouse; the browser tool has no held press):

- mid drag, held over C: `apps/web/measurements/gauntlet-shots/arrow-anchor-and-drop-sites-r1-mid.jpg`
- after release on C: `apps/web/measurements/gauntlet-shots/arrow-anchor-and-drop-sites-r1-end.jpg`

Known limits: the glide and the 60 ms settle cannot show in a still. The release on C commits an
O to C forming bond sink (the machine's inference), so the committed arrow lands on the stub, not
on C's surface; that is the correct SN2 arrow and the preview now matches it.

## 2026-08-25, round 7: a committed capture that can be reproduced

Bar: `docs/reference/alchemie/01-mechanism-canvas-full.png`, `extra/x01`, `extra/x02`.

**The capture is a script now, not an improvisation.** `measurements/capture-trainer.mjs`, run as
`node measurements/capture-trainer.mjs --tag r7` after `npm run build`. It serves `dist/`, opens the
trainer, drives the five taps of the S_N2 answer through real PointerEvents, and writes PNG. Three
things it fixes about how earlier rounds were judged:

- **PNG, never JPEG.** STATUS.md records rounds one to three chasing a JPEG artifact that two
  critics independently read as a gradient the computed styles did not have. A capture of an edge
  has to be lossless or it is not evidence.
- **Both themes, every time.** The defect below existed only in light mode. Judging one theme is
  judging half the product, and the dark capture alone looked correct.
- **It checks itself.** The script counts committed arrowheads and exits nonzero unless there are
  two, so a shot of an empty canvas can never be handed to a critic as a shot of an answer.

Driving it needed `window.__blueberryTargets`, published behind `?targets=1`, the same family as the
existing `window.__blueberryFrames`. Every drop site is drawn into one SVG with no element of its
own, so there is no selector for "the oxygen's second lone pair" and no way to derive the geometry
without reimplementing `layout.ts` inside the script. `?targets=1` joins `?auto=1` and `?stats=1` in
App.tsx's `MEASURING`, so onboarding does not stand in front of the canvas.

**Two defects the paired captures found, both real and neither taste.**

1. **The formal charge was invisible in light mode.** `ChargeBadge` drew its disc in `--card` and its
   sign in a literal `#ffffff`. In dark mode that is white on a dark disc and reads perfectly; in
   light mode it is white on near-white, so hydroxide rendered as a blank white circle and the step
   lost its charge entirely. Formal charge is chemistry, and the Budgets table's WCAG AA row covers
   it. Now `--foreground`, the pair the rest of the type uses.

2. **The leaving group arrow never touched bromine.** It drew as a vertical stub over the middle of
   the C-Br bond pointing back down at it, which reads as electrons flowing INTO the bond, the exact
   opposite of a leaving group. The cause is arithmetic and worth writing down because the shape of
   it will recur: `atomSinkGeometry` landed on the rim point facing the source, plus a flat 16 unit
   clearance. Bromine's radius is 21.4 and the C-Br midpoint is 38.2 from its centre, so the landing
   came out 0.8 units from where the arrow started, and `bowAwayFrom` treats a chord under 1 as
   degenerate and bows straight up. A flat clearance is a subtraction from a distance nobody checked
   was large enough.

   The rule now: the clearance is budgeted against the room actually available, at most half the gap
   between the source and the rim, and if the straight landing still leaves too short a chord the
   landing SWINGS around the rim, away from the molecule, until the chord reaches 34 units. That is
   also how the arrow is drawn on paper, out and over and down onto the atom that is leaving. Where
   there is already room the swing is zero, so no long arrow moved: `landingOnRim` has a test for
   exactly that, because a fix that silently moved every other arrow would be worse than the bug.

`landingOnRim` moved to `hitLayout.ts` beside `rimPoint` and `bowAwayFrom`, which is where the pure
geometry lives, and `test/arrowLanding.test.ts` holds six cases: the short chord, never landing
inside the sphere, the long arrow staying put, the swing picking the side away from the molecule,
finite output when two atoms overlap, and the swing clamp.

Measured: `npx tsc -b apps/web` clean, `npm test -w @blueberry/web` 15 of 15, `npm run validate`
30 of 30 with `BLUEBERRY_PYTHON` pointed at the anaconda interpreter.

Captures: `gauntlet-shots/trainer-r7-light-committed.png`, `trainer-r7-dark-committed.png`, and the
`-tab.png` pair for the surrounding strip.

**Not yet judged.** These are the artifacts for the blind comparison; no critic has run on them.
Known and unfixed, recorded so a verdict is not needed to know it: the forming O-C bond's segmented
body draws as overlapping round caps, so at this size it reads as a chain of beads rather than a rod
under construction.

## 2026-08-25, round 8: an A/B of the in flight primitive

Bar: `docs/reference/alchemie/01-mechanism-canvas-full.png`, `extra/x01`, plus `IMG_1640` and
`IMG_1645` from `reference images/`, which are the two captures that actually settle this.

**Why this round is an A/B and not a fix.** Reading all 88 images in `reference images/` produced a
finding that reframes rounds 1 through 7: **Alchemie never draws an arrowhead.** In every one of the
29 mechanism captures, what the student drags is the ELECTRONS, drawn as a lit white sphere inside a
warm halo on a dashed tether. There is no head anywhere in the folder, in flight or committed.

Rounds 4 through 7 each produced exactly one verdict, and every one of them was a defect of the
arrowhead: its size against the atoms (round 4), where it landed (round 5), which way it pointed
(round 6), and a backwards tangent on a short chord (round 7). Those are not four unrelated bugs.
They are four symptoms of drawing an oriented mark mid-drag, and a sphere has no orientation to get
wrong.

**Owner ruling, 2026-08-25: both.** No head in flight, a real curved arrow with a head on the
committed step. The gesture matches the bar; the record matches what CHEM 241 grades on paper. So
this round captures both primitives from one build and hands them to a blind critic rather than
asserting the new one is better.

**What changed.**

- `DrawCanvas.tsx`: a module scope `PRIMITIVE`, `"electron"` by default and `"arrow"` under
  `?primitive=arrow`, which restores the rounds 1 to 7 rendering. In `electron` the in flight path
  drops its `markerEnd` and gains three concentric circles at the leading end: a 13 unit halo at
  0.55, an 8.5 unit halo at 0.85, and a 5 unit core.
- `theme.css`: `--electron-glow` and `--electron-core`, both themes. Amber on purpose. The arrow,
  the forming bond, every drop site and the armed slot are all `--primary`, so a second purple mark
  inside the same gesture would be one more thing to disambiguate. Amber is the only warm hue on the
  canvas, which makes the electrons the only warm thing on it.
- The committed rendering is untouched. The light committed PNGs for the two primitives are
  byte-identical at 232396 bytes, which is the check that this change is confined to the drag.

**What changed in the capture script**, because a committed shot cannot show a mid-drag primitive:

- `--primitive electron|arrow`, threaded into the URL.
- `captureMidDrag`: presses on the armed lone pair, walks to the sink in six steps so the machine
  sees real movement rather than a teleport it would swallow as a tap, holds, and shoots before
  releasing.
- Two bugs found while writing it, both worth recording. `betweenAtomsSite` is only published once a
  source is armed, so the drag targets the CARBON instead and lets `inferSink` resolve the forming
  bond, which is what a finger does anyway. And a second `page.goto` to the same URL is a
  same-document hash navigation that does not reload, so the committed pass was inheriting the mid
  drag's state and its first tap un-revealed the lone pairs it was about to look for. One fresh page
  per capture now.

Measured: `npx tsc -b apps/web` clean. Eight PNGs, both primitives, both themes, mid and committed.
Both committed captures report 2 arrows, so neither is a shot of an empty canvas.

Captures: `gauntlet-shots/trainer-r8-{electron,arrow}-{light,dark}-{mid,committed}.png`.
Blind copies for the critic, labels stripped: `blind-r8/candidate-{A,B}-{light,dark}.png`, where A is
electron and B is arrow. That mapping is recorded here and not in the folder the critic reads.

**Verdict: pending.** The critic is running as this is written.

### Round 8 verdict, and round 9's fixes

**The critic picked B, the arrow.** Against the recommendation that produced the ruling. Its argument
is worth recording in full because it is not a preference:

> A copies the vocabulary and breaks the grammar: in x01 the amber-haloed sphere sits exactly on a
> real atom, so the glow is a snap indication that says "this atom is the target." In A the amber
> sphere sits at roughly the 48 percent point of the O to C span, on bare stick, marking nothing.

And on direction: a headless dashed line has two ends and no heading, so a student reading it cold
cannot tell whether the hydroxide is attacking the carbon or the carbon is donating to the oxygen.
Direction is the entire chemical content of a curved arrow.

The caveat the critic volunteered and which keeps this from settling the ruling: "the bar also earns
its headless line through motion and through the fact that the glow anchors on an atom; a still frame
of A has neither." So the still is decisive about AMBIGUITY, not about how the drag feels in a hand.
The synthesis it points at, and which nobody has built yet, is that the glow belongs ON the resolved
sink rather than under the fingertip.

**Four defects the round found in BOTH candidates, so none of them depends on which primitive wins.
Two teach wrong chemistry. All four fixed in round 9.**

1. **The forming O-C bond was indistinguishable from the real C-Br bond**, which asserts the sigma
   bond the student is being asked to make. Cause, and it is one line: `BondCapsule` dashed the rod
   body for a forming bond but drew the white specular highlight over it SOLID at full length, so
   the highlight filled every gap back in. Both now carry the same dasharray.
2. **The stretched bond never declared itself forming.** `DrawCanvas` passed `opacity={0.5}` and no
   `forming` prop, so the O-C stretch drew as a solid rod at half opacity. Opacity does not read as
   provisional, it reads as further away.
3. **The formal charge chip was invisible in DARK mode**, a near black disc on the near black canvas
   ground, reading as a hole punched in the page. This is the same bug round 7 fixed in light mode
   and it recurred inverted, for the same structural reason: the chip referenced `--card`, a surface
   it is not drawn on, so it is wrong in whichever theme `--card` matches the ground. It has its own
   token pair now, light chip and dark sign in both themes.
4. **The lone pair rings and dots were under any contrast floor in LIGHT mode.** `--scene-faint` was
   slate at 0.5 alpha on a warm off-white ground. The lone pair is the object a student must find and
   grab before the gesture can start at all, so this was the primary affordance failing the Budgets
   table's WCAG AA row. Raised to 0.82.

**Still open, carried honestly rather than claimed.** The critic named these and round 9 did not
touch them:

- The two offered between-atom stubs are colinear with the O-C-Br axis, so they read as ONE dashed
  line running through the carbon and onto the C-Br bond, which is the bond that breaks. A student
  could read a second electron path toward bromine. The fix is a design change to how an offered
  site is drawn, not a parameter, so it waits for the owner.
- The arrowhead lands short of the drop ring and is rotated off the curve's local tangent.
- The white casing overshoots the head, leaving a light nub past the tip.
- The tail doubles back into a hook with a detached blob beside it at the oxygen, so which of the
  three lone pairs was picked up is unreadable.

Captures: `gauntlet-shots/trainer-r9-arrow-{light,dark}-{mid,committed}.png`.

## 2026-08-26, round 10: Alchemie parity round 1, four pieces from the owner's hand-on session

The owner ran the trainer in a browser and the run produced four rulings plus one bug. The bug,
the O-Br site sitting on the carbon, is fixed and tested in its own commit (occludedSite.test.ts).
This round builds round 1 of the four rulings; the loop prompt is recorded in the conversation and
the exit is a fresh-context critic picking ours blind, five rounds per piece.

**Built this round.**

- **Lone pairs are INVISIBLE at rest.** The resting faint rings are gone; tapping the atom reveals,
  which is the machine's existing rule. Reverses round 3's faint-resting decision, and the trade is
  recorded in the code comment: that decision bought first-canvas discoverability with permanent
  clutter, and the bar shows nothing at rest.
- **Hydroxide's H is explicit.** A real H sphere and an O-H rod, the way the bar draws it
  (IMG_1644). Carbons keep implicit hydrogens as quiet upright glyphs hugging the sphere, and the
  atom tap that reveals lone pairs now also OPENS the arc: further out, wider, full ink.
- **Immediate per-arrow grading.** The Check button is gone. Every committed arrow grades the
  moment it lands: correct plays, invalid snaps back with the named cause, a legal-but-wrong arrow
  wobbles the atom it was sent to, plays the wrong sound (two descending sine blips, synthesised,
  quiet), vibrates, shows the card, and then the machine's own undo takes exactly that one arrow
  back, so the earned arrows stay. The offending arrow is always the last one, which is what makes
  one undo the exact revert.
- **Three authored Tier 2 distractors** for the demo step, matched on the arrow's own key. The one
  the owner asked for leads with electrostatics: hydroxide is a full anion, the C-Br bond leans its
  density onto bromine, like charges repel. The generic concerted-step paragraph shows only when no
  distractor matched.

**Capture script reshaped.** Immediate grading deleted the resting two-arrow state, so the shots
are now resting, mid-drag, first-arrow, success, and wrong-drop, each with its own self check
(exactly 1 arrow, the success card text, the distractor card text). The success shot falls back to
the playback SVG because success flips modes now.

Measured: suite 30 of 30, integrity unmodified, web tests 19 of 19, typecheck clean, payload
115.1 KB of 400. Captures: `gauntlet-shots/trainer-r10-arrow-*`.

**Verdicts: pending, four critics launching after this commit.**

### Round 10 verdicts: OURS WON ALL FOUR PIECES BLIND. Round 11 fixes what the critics named anyway.

Two fresh-context critics, four pieces, labels stripped. Every verdict picked ours over the bar:

- **Resting canvas: ours.** "A is not a working surface at rest; it is a lesson slide." The bar's own
  noise beat it. The named cost of our win: at rest nothing is marked grabbable, which is the
  deliberate trade the owner ruled for, recorded in the code.
- **Hydrogens: ours.** The glyph-versus-sphere hierarchy read as "scenery versus participant".
- **Failure feedback: ours**, because a named specific cause beats a bare glyph. The critic's words
  for the bar's triangle: "exactly the failure mode this comparison exists to expose".
- **In-flight drag: ours.** And the same critic, knowing nothing of rounds 1 to 9, independently
  rejected the bar's headless tether for the same reason our round 8 critic did: "no directionality;
  nothing on screen says which way the electrons flow, which is the entire content of the notation."
  Two independent blind critics have now picked the arrowhead over the electron sphere. The round 8
  ruling's premise is contradicted twice over; the owner should re-decide with both verdicts in hand.

**Exit met on all four pieces, round 1 of the parity loop.** The loop closes. What follows was fixed
anyway because critics named defects that teach wrong chemistry, and CLAUDE.md does not let those
ride on a won comparison:

- **The five-bonded carbon.** Mid-drag showed intact C-Br plus forming O-C plus three H with no
  departure cue: "the leaving group is a bystander in its own departure." Bonds the step BREAKS now
  dim to 0.45 while the in-flight gesture has a resolved landing. The scene already classified
  phases; this is a read, not a guess.
- **The carbon-coloured hydrogen.** Both critics called the slate H sphere an element identification
  error. H is CPK pale now, dark glyph, and bromine outgrew carbon (three radius tiers) because size
  is one of the few things a sphere can teach.
- **The canvas contradicted the card.** By the time the card was read, the undo had erased the wrong
  arrow: "the failure moment shows no failure." A rejected arrow now freezes on the canvas in
  warning amber with the bar's triangle on the atom it wrongly targeted, swapped in at the same
  frame the undo takes the real arrow, held until the next touch.
- **The teaching was behind a click.** The distractor card's why is visible by default now; only
  look-at folds.
- **"source armed" leaked engine vocabulary** into the always-on status line. Student words now.

Found while fixing: `var(--warn)` was referenced before it existed in theme.css, and an unset var in
an SVG attribute falls back to black, which is how r11's first capture grew a black arrowhead. And
the ghost was originally set at wobble start, drawing casing-on-casing beside the still-committed
arrow; it now swaps in exactly when the undo fires.

Measured at close: suite 30 of 30, integrity unmodified, web 19 of 19, interaction 377 of 377,
typecheck clean, payload 115.5 KB of 400. Captures `trainer-r11b-arrow-*`.

**Left open, named honestly:** the wrongly-inferred O-Br stub still crosses behind the carbon during
the wobble window (it is the student's own asserted bond, so drawing it is defensible, but the
critic's strike-mark idea is better and unbuilt); the H glyph arc still parks all three below the
carbon rather than splaying the umbrella perpendicular to the attack axis, which costs the Walden
inversion picture; matching presentation, currency name, free tier shape and negative XP are still
open questions for the owner.

## 2026-08-26, parity loop against the VIDEO corpus: the orbit drag and the reaction library

The bar changed under owner direction: the Alchemie YouTube corpus, downloaded whole into
`reference images/alchemie-video/` (gitignored, 92 clips, 242 MB: Addition 20, Carbonyl 20,
Acid Base 20, Structure 30, plus How to Play and ModelAR). Motion was the weakness of every still
capture so far; the corpus is the bar performing the interactions themselves. 392 PNG frames
extracted from five key clips into `alchemie-video/frames/` by 1 fps sample plus top interframe
motion, cv2, no ffmpeg needed.

Read before building, per the working agreement. What the frames settle that stills never did:
the bar's H spheres are LARGE pale balls; spectator bonds are dark grey while PARTICIPATING bonds
render white; structure-1's implicit H glyphs sit AROUND the atom at varied angles, not one arc
below, which is the exact defect round 10's critic named.

**Built.**

- **The orbit drag.** Owner's words: "if I drag the hydrogen I should be able to circle the oxygen.
  Bonds should follow dynamically." A terminal atom now swings around its neighbour on a circle of
  the bond's press-time radius; the rest of the molecule stays put; open angles re-derive from live
  geometry every render, so lone pairs, hydrogen arcs and the charge badge migrate away from the
  swung bond, which is the "neighbour re-settles" half. Measured by the capture's own self check:
  the hydrogen moved 308.3 px around the oxygen with 0.00 px of bond-length drift.
- **Terminal is chemistry, not topology.** The first cut said "one explicit bond means orbit" and
  bromomethane's carbon qualified, because its hydrogens are implicit: both ends orbited and
  nothing could carry the molecule. The rule now weighs explicit bonds plus implicit hydrogens, so
  CH3's carbon is a four-way centre that carries, Br swings around it, and on a degree tie the
  smaller atom orbits (you swing the hydrogen around the oxygen, never the reverse).
- **The render was blind to orbits, and the first capture proved it.** Targets and bonds read the
  live scene while the spheres read the authored one, so the hydrogen's hit circle swung and the
  hydrogen stayed put, two ball joints floating where the bond thought its atom was. The species
  render blocks now draw from the orbited scene; species carry stays on the group transform, so
  nothing shifts twice.
- **The reaction library.** `demo/reactions.ts`: a registry the trainer consumes as data, which is
  the owner's "replicatable for any reaction I give you" made executable. Three entries: the SN2,
  a proton transfer (NH3 + HCl, the Acid Base playlist's family) and a carbonyl addition
  (hydroxide + formaldehyde, the Carbonyl playlist's family), each a real chem-core step with its
  own hints, brief and success line. A picker in the header, `?reaction=` deep links for captures.
  Adding a reaction is adding an entry; no component changes, and `reactions.test.ts` walks every
  entry through layout, scene build, arrow legality and grading.

Measured: suite 30 of 30, integrity unmodified, web tests 33 of 33, typecheck clean, payload
117.1 KB of 400. Captures `parity-p2-*` with per-shot self checks (orbit movement, zero drift).

**Verdicts: pending, two critics on the video frames.**
