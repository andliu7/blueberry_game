# Alchemie reference: observed behaviour

Structured observations taken from screen captures of Alchemie's apps, recorded so a critic has
something concrete to compare against. This file is a substitute for pixels, not a replacement.
Drop the actual image files next to this one and fill `MANIFEST.md`, because a critic reasoning
from prose alone will drift toward whatever it read most recently.

Scope reminder. Interaction patterns are fair reference. Their assets, visual design, problem
sets, and authored content are theirs. Build the interaction, author your own content, keep the
visual language recognizably Blueberry.

---

## What was captured

Five distinct products or modes appear across the captures.

1. **Orbital viewer.** Black background, 3D sp3 and p orbital lobes in green and purple, a
   ball-and-stick skeleton underneath, a play control, and a top-right toggle switching between a
   filled sphere representation and a dumbbell orbital representation.
2. **Stoichiometry, dimensional analysis.** Grey and white. Draggable tiles for coefficients and
   formulas, a factor-label chain, and unit cancellation drawn as red strikethrough on matched
   units. Left rail: info, undo, redo, refresh, eraser, add.
3. **Net ionic equation builder.** A formula keyboard: digits, `(aq) (l) (g) (s)`, parentheses,
   plus, arrow, circled plus and minus, backspace, and a row of element tiles drawn as periodic
   table cells. A superscript mode is a toggle labelled `2X₂ / X²` with a tooltip reading
   "Turn On Superscript."
4. **Equation balancing.** Split canvas with a vertical divider, reactants left and products
   right, a periodic table sidebar down the right edge, an equation bar across the top with an
   `Update` button. Atoms are flat circles with element letters.
5. **Mechanisms.** Teal to green low-poly gradient background. This is the bar.

---

## Mechanisms: the interaction, as observed

**Atoms** are large black spheres with a white element letter. Implicit hydrogens render as small
grey `H` glyphs arranged on a faint arc around the atom rather than as bonded nodes. That arc is a
good idea and worth taking: it shows hydrogen count without spending a bond line or a hit target
on each one.

**Bonds** are thick white capsules. At each end sits a small white circular handle. Those handles,
not the bond body, appear to be the interactive targets for bond manipulation.

**Formal charge** renders as a small circled `+` badge attached to the lower LEFT of the atom,
outside the sphere, with a faint ring drawn around the atom. This originally said lower right and was
wrong. Measured in Phase 2: badge centre (280.9, 119.6) against oxygen centre (300.3, 85.5). Badge
diameter 24.0 points.

**Error state** on an atom renders as a black spiky or exploded outline replacing the smooth
sphere silhouette, paired with a yellow warning triangle.

**Bond breaking** renders as a small burst of yellow particles at the bond midpoint. The bond
capsule remains drawn during the burst.

**Success** renders as a `Goal Achieved` panel docked bottom right, styled as a bordered card.

**Chrome** is one hamburger button, top left. That is the entire persistent UI. This is a genuine
strength and should not be beaten by adding more.

**Tutorial** is a modal titled `Intro 4` containing a static raster image of a resonance
explanation, with `OK`, a list button, and a play button beneath it.

---

## Where it is beatable, by axis

These are the specific, checkable gaps. Each one maps to a measured half in `CLAUDE.md`.

### Feedback specificity: the largest gap, and the easiest to quantify

Across every mechanisms capture, the feedback for a wrong action is a **yellow warning triangle**.
A symbol, positioned near the offending atom or bond. No sentence. No name for what is wrong.

A student who puts a fifth bond on a carbon and a student who pushes an arrow from an electron
sink both get the same triangle. The app knows which one happened, because it had to know in order
to place the triangle, and it does not say.

This is the axis to win on, and the measurement is trivial: count their distinct failure
presentations, which appears to be one, and count ours. The target is a named cause per failure
class, in a sentence a student can act on, not a symbol they have to interpret.

### Touch ergonomics: strong on atoms, weak on bond handles

The atom spheres are large and easy targets. Beating them on size alone is not available and not
worth trying.

The bond end handles are small, roughly a quarter of an atom's diameter, and they sit adjacent to
the atom they attach to. That adjacency is the weak point: at a fingertip's contact radius, the
handle and its atom overlap, so a tap near the junction is ambiguous. Those numbers are now measured
and live in `MANIFEST.md`: handle 15.7 points across, 41.4 from its atom centre, atom 71.5 across.

Note the file this paragraph used to name, `07-problem-canvas-full.png`, does not exist. Slot 07 is
`07-goal-achieved.png` and the full canvas is `01-mechanism-canvas-full.png`. The measurements were
taken from `01` and from `extra/x02`, which shows a handle pulled clear of its bond.

Phase 2 turned the prose into a verdict. Under a 44 point minimum hit target, measured against the
exclusive area a target actually owns rather than the area it is drawn at, their bond handles reach
34 percent of budget and their lone pairs 93 percent. Those are two different defects: the handles
are crowded by the atom they sit on, and the lone pairs are simply drawn about 3 points too small
with nothing crowding them at all.

The second gap is that every capture shows a drag-based or drag-implying interaction. Nothing
observed suggests a tap-only path exists. Our tap-only completion requirement is therefore not
just an accessibility floor, it is a differentiator, and it is fully machine-checkable.

### Visual modernity: the clearest win, and the one not to loop on

The visual language is late-2010s skeuomorphic: low-poly gradient wallpaper, glossy spheres with
specular highlights, drop shadows on cards, a bordered dialog with a title bar. The stoichiometry
and net-ionic modes are plainer still, effectively unstyled grey system UI with an ad-hoc keyboard.

Blueberry's own language, cream `#f6f4ef` and stone dark, Fraunces for display and Inter for body,
indigo to fuchsia accents, glass surfaces, and springs rather than eased fades, is a generation
ahead without trying. See `docs/DESIGN-TOKENS.md`.

Measure it and stop: contrast ratios, type scale consistency, motion timing conformance. Whether
it looks current is a human gate. Do not put a critic on it.

### Correctness depth: unknown from outside, and that is the point

Nothing observable says how deep their verification goes. That is precisely why this axis is
measured against our own numbers rather than against theirs: check count, fixture count, adversary
findings per phase, mutation survival rate. It is the one axis with no judged half.

---

## What to take, unchanged

Three things are simply good and copying the pattern is legitimate.

- **The implicit hydrogen arc.** Hydrogen count communicated without spending bonds or hit targets.
- **One button of chrome.** The molecule is the interface. Resist adding a toolbar.
- **Charge as a badge outside the atom silhouette**, so it never fights the element letter for the
  same pixels.

## What not to take

- The static raster tutorial modal. Our tutorial is real mechanisms, not an image of one.
- The superscript mode toggle. A mode with a tooltip explaining the mode is a design that lost an
  argument with itself. Charges belong on a charge control, not on a shifted keyboard layer.
- The undifferentiated warning triangle. That is the thing we are beating.
