# Owner direction: Mechanism Trainer interaction and look

Recorded 2026-08-21, during the Phase 4 human gate, from a conversation about the first
rendered SN2 demo. This is owner direction in the sense `CLAUDE.md` uses the phrase: it
shapes Phase 5 and later, and it is written here so it survives the conversation it came
from. Where it conflicts with an earlier ruling, the conflict is named in the last section
rather than resolved quietly.

## What the owner saw, and what the gap is

The Phase 4 demo has the right idea and the wrong feel. The arrow appears and disappears;
nothing is pulled, dragged, or drawn. That is the scope of Phase 4, not a bug: the renderer
contract takes a completed `MechanismStep` and tweens `from` to `to` by one progress number.
No pointer reaches the screen yet. `packages/interaction` already models the gesture (arm a
source, infer a sink, tap-only completion, 44 pt targets). Phase 5 is where the two meet.

The bar for feel is Duolingo: springs and overshoot, a logo that moves like it has mass,
handwriting recognition that accepts a stroke and shakes when it does not. Alchemie stays
the bar for the mechanism interaction itself and for nothing else.

## 1. The molecules are the product

Bond pulling, electron drag, arrow drawing. Everything else in this file is secondary and
must not make these harder to reach.

Three input paths, all resolving to the same `ArmedElectronSource` plus `ElectronSink` that
`arrowInference.ts` already consumes, so chem-core grading does not change:

- **Tap.** Already designed. Tap a source, tap a sink.
- **Drag.** The Alchemie gesture: the electron pair rides under the finger, the curved arrow
  draws in real time behind it, the candidate sink highlights as the finger nears it.
- **Freehand stroke.** New. Draw a curve anywhere; the stroke's start snaps to the nearest
  electron source and its end to the nearest sink; the snapped interpretation renders as a
  clean arrow. Lifting the finger commits, with undo. No modal confirm: Duolingo's character
  writing accepts or shakes, it never asks. This is an input mode, not a fifth answer shape.

Motion: bonds stretch and thin before they let go, forming bonds grow from the donor end,
atoms settle with a little overshoot. Spring based, not duration based. Boring, maintained
library or a hand rolled spring; nothing clever.

## 2. Stereochemistry beyond dashes and wedges

Dashes and wedges are the notation students are taught and they are the notation students
misread. The owner wants the molecule viewable as a **Newman projection** and a **Fischer
projection**, switched from the same molecule, and wants hybridisation to govern how atoms
orient in both the 2D and the 3D renderer.

Engine note: chem-core computes geometry but does not hold conformers. A Newman view needs a
sighting axis and a dihedral; a Fischer view needs a chosen vertical chain and the convention
that horizontal bonds come toward the viewer. Both are authoring time data on the problem,
like the precomputed CIP labels `CLAUDE.md` already mandates, never derived on device.

## 3. The look: an aqueous scene

Not Alchemie's low-poly green. The owner's image is a **dark pool with light shining through
onto the molecule**: the student is in water, in solution, because that is where the
chemistry happens. The molecule carries high contrast against that ground; the ground is
atmosphere, never competition.

Buttons and press feel come from Duolingo: every control acknowledges on pointer down, per
the rule already in `CLAUDE.md`.

This is the one item with a recorded conflict. See the last section.

## 4. Resonance mode

Two entry points, both owner phrasing:

- Prompted: "Can you find a resonance structure?"
- Discovered: "Maybe we found a resonance structure!" when the student's own arrows have
  produced one.

Entering the mode lets the student draw resonance arrows and see partial charges develop.

Engine note: a resonance step is the one case where arrows move electrons and the sigma
framework does not change. chem-core can assert exactly that: same atoms, same sigma bonds,
different pi and lone pair distribution, conservation still holding. Partial charges are a
model, not bookkeeping, and need either authored values or a stated heuristic. Decide which
before building; do not let a heuristic masquerade as computed truth.

## 5. Electron density pulsing

A subtle, continuous animation showing density pulled toward electron withdrawing groups and
away from donating groups. Subtle is the requirement; this is texture, not a control. Off
under reduced motion.

## 6. Simple by default, controls driven by the question

The interface stays simple. Views and modes appear when the question needs them:

- stereochemistry matters in this problem: the stereo view control is present
- it does not: the control is absent, and likewise resonance when resonance is not the point
- every view stays reachable from a settings toggle, so a curious student is never locked out

The problem schema in `packages/curriculum` therefore needs to declare which views a problem
needs. That is a schema change and belongs in the Phase 5 plan, not in a shell component's
guesswork.

## Reference material

The Alchemie YouTube channel, `@alchemie6361`, 171 videos, catalogued 2026-08-21. The ones
that show the mechanism interaction rather than the company:

- `Mechanisms App | How to Play`, 2:50, https://www.youtube.com/watch?v=vjKqG1hiCM8
- `Mechanisms: Student Introduction`, 3:30
- `Mechanisms app: A decision tree`, 1:11
- `How to use Ipad Pro to draw with ModelAR & Mechanisms`, 0:34, pen input
- roughly 100 worked mechanisms titled `Mechanisms: Structure N`, `Addition N`,
  `Carbonyl N`, `Acid Base N`, `Substitution N`, 30 to 90 seconds each

These are not captures in `docs/reference/alchemie/` and a critic must not cite them as the
bar. The bar is still the committed images. They are for a human deciding how drag should
feel, and a human has to watch them: frame grabs through the browser tool returned the
poster frame only.

## Open, for the owner to rule on

1. **Dark pool against light mode first.** `docs/DESIGN-TOKENS.md` records an owner ruling
   of 2026-08-20: light mode first, purple led, cream ground, Duolingo bright. The Phase 4
   gate item 5 checks exactly that. An aqueous dark scene for the mechanism canvas is the
   opposite. Possible resolutions, none chosen here: the canvas is a dark stage inside a
   light shell; the aqueous scene is the dark theme and light keeps a pale water treatment;
   the ruling flips. Contrast gates apply to whichever is picked.
2. **Partial charges**, authored or heuristic, per section 4.
3. **Which projections are in scope** for the flagship course, and whether Newman and
   Fischer are views of one problem or problem kinds of their own.
