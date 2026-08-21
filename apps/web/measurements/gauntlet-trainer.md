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
