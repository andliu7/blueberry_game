# The 3D chip, mechanics

Owner supplied a reference implementation of an animated 3D button, 2026-09-03, with the
instruction "use this to help with the button design". This file records what to take from
it and what to leave, so a builder does not have to rediscover either. It is a mechanics
note; the visual bar stays the committed states sheet
(`blueberry_r7-states-sheet_1788288485.png`) and the button taxonomy
(`blueberry_spec-button-types_1788291091.png`).

## What to take

**The layer structure.** The reference builds its depth from stacked layers rather than a
box-shadow, which is the same conclusion the S2 round reached by a different route (a
same-hue darker disc offset on Y is a shadow, and shadows are a sticker-language
violation). The useful shape, named in our terms:

- an EDGE layer, the darker slab that sits under the face and is the only thing visible at
  the bottom of a resting chip
- a FACE layer, the periwinkle top surface that carries the label or icon
- an OUTLINE, a real border on the face rather than a glow, per sticker rule 3

A press moves the FACE down onto the EDGE. The chip's total height does not change, so
nothing around it reflows. That is the whole trick, and it is why a pressed chip reads as
physical rather than as a colour change.

**Transform, not layout.** The press animates `transform: translateY()` on the face, which
is compositor-only and cannot miss the 100 ms acknowledgement budget. Never animate
`top`, `margin`, or `height` for a press: those are layout and they will miss it.

**Content swap by state.** The reference keeps two labelled spans (`state-1`, `state-2`)
in the same slot and swaps them. That is the right pattern for our CHECK becoming CONTINUE
in the lesson action bar, which the goals already require to occupy one slot that does not
move.

**The burst on activation.** Its splash SVG fires outward from the control on success.
That belongs on the celebration CLAIM and on a correct answer, never on an ordinary press.

**The stagger custom property.** Per-character `--i` driving an animation delay is a clean
way to do the reward number's per-letter entrance. Reserve it for celebration.

## What to leave, and why

- **The palette.** It hardcodes `#f9c6fe`. Every colour in this product comes from a token
  and passes the contrast gate; a literal hex in a component is a validator failure
- **Letter stagger on a utility button.** Animating each character of an ordinary control
  costs attention every press. Personality belongs at the celebration, per the typography
  split
- **The unused `useState(0)`.** Dead state in a presentational component
- **No reduced-motion handling.** Every animation here ships behind
  `prefers-reduced-motion`, and the press acknowledgement must still occur without it
- **`cn` and the shadcn import paths.** This app has neither and does not need them; the
  chip is a class on our own `Press`, not a new component library

## The one hard rule this note exists to protect

The pressed state renders on POINTER DOWN, before any work begins, under 100 ms. The
reference's animation is triggered on click, which is too late. Whatever depth it lends,
the trigger stays pointer down.
