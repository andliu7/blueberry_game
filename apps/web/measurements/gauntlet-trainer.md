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
