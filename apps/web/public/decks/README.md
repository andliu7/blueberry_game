# Study deck imagery

Product shots of the Blueberry study decks, for marketing surfaces and for the
deck screens in the app.

| File | Shape | What it is |
|---|---|---|
| `hero-float.webp` | 16:9 | Three boxes tumbling, one open. Headline space on the left. |
| `lineup.webp` | 16:9 | Four colourways in a row: the range shot. |
| `open-fan.webp` | 1:1 | One box open with the cards fanned out. Square, suits a card. |
| `in-hand.webp` | 4:5 | A box held up. Warm, human, portrait. |

Generated 2026-08-28 on `gemini-3.1-flash-lite-image/edit` via fal.ai. The full
prompts and costs are in the JSON sidecars next to the originals in
`C:\Users\zeusa\generations\`. The mascot was passed as a real reference file,
`generations/refs/bloom-mascot.png`, rendered from this app's own
`#/gallery/berry` surface, so Bloom is genuinely him rather than a description a
model guessed at. Regenerate with that same reference or he will drift.

## THE CHEMISTRY ON THESE BOXES IS NOT CORRECT

Owner note, 2026-08-28: these are decorative. The skeletal structures, the curved
arrows and the orbital shapes were generated, and they read as organic chemistry
from two feet away while being nonsense to anyone who looks closely. The owner
wants them redone properly later.

So, until that happens:

- Fine on marketing surfaces, a hero, a store page, an empty state, a thumbnail.
- NOT fine anywhere a student could mistake them for content. Never beside a real
  problem, never in a lesson, never at a size where the structures are legible
  enough to read as a claim.

The fix when it comes is not a better prompt. It is compositing real structures
from this repo's own SVG renderer (`apps/web/src/render/svg/`) onto the box
faces, because that renderer draws chemistry the validators already check. A
generated molecule can always be subtly wrong; a rendered one cannot be, because
it comes from the same engine the trainer grades against.

There is deliberately no text on any of these. Generated lettering comes out as
convincing gibberish, which is worse than blank. Deck names get set in the app,
or generated on GPT Image 2, which is the recipe's model for readable text.
