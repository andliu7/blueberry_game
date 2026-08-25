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
