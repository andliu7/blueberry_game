# Design goals, owner verdicts of 2026-09-01

Recorded from seven design rounds run with generated concept screens. These are GOALS for the
gauntlet design rounds that follow S3: a builder builds toward them, and a critic judging a
design round compares against the committed images in `docs/reference/design-goals/` (see its
`MANIFEST.md` for which file locks which decision). This file does not replace
`DESIGN-TOKENS.md`; exact color values, faces and timings land there, through the contrast
gate, when the rebuild round implements this. Where the two disagree before then, this file is
the owner's newer word and the conflict gets reported, not silently resolved.

## Palette and surfaces

- Warm tech ground: cream paper, the round 1 "warm tech" direction. Calm-and-tranquil is
  eliminated as a palette; its whitespace discipline survives on lesson screens
- Lesson nodes are PERIWINKLE, between light blue and lavender, around `#9BA8F5` pending the
  contrast gate
- Light green (around `#7ed957`) is the PROGRESS semantic everywhere: completed nodes, filled
  bars, correct states, checkmarks. Violet stays identity: brand, primary buttons, current
  items. Green says "you moved", violet says "this is Blueberry"
- FILL-ONLY RULE for the goal green, decided 2026-09-01 on measured contrast: #7ed957 is
  1.60:1 on cream, failing every floor as text or thin outline, and 9.66:1 with dark ink on
  it. So the green appears ONLY as a fill carrying dark ink or a white check on a large
  shape, never as text, never as a hairline. The contrast gate stays the arbiter; white
  checkmarks on green count as large graphics against the 3.0 floor and get measured, not
  assumed
- The tab bar background is cream or white, never purple

## The buttons

- Every node and button is a 3D pressable chip: thick darker bottom edge, and it visibly
  PRESSES DOWN on pointer down. This is the press-acknowledgement rule made physical, and the
  pressed frame must land inside the 100 ms budget
- The five node states are the committed states sheet: rest, pressed, completed (green with
  soft glow), locked (flat, grey), current (halo plus START pill)
- HOW the chip gets its depth is recorded in `docs/reference/design-goals/BUTTON-MECHANICS.md`
  (owner reference, 2026-09-03): stacked edge and face layers rather than a box-shadow, the
  press moving the face down onto the edge by transform so nothing reflows, and the trigger
  staying pointer down. Read it before building any pressable
- The glow is the completed-state language: static soft glow on finished path segments, a
  pulsing halo ONLY on the current node, and no pulse under reduced motion
- Lone-pair and bond handles in the trainer carry an EXPANDED invisible hit area beyond
  their drawn size (owner direction 2026-09-01): the drawn dot stays small, the touch
  target does not. The mis-tap-rate measurement at tightest lone-pair spacing is the gate

## The pathway

- Winding trail, never a straight central spine
- Branch vocabulary: DIAMOND fork is the default unit shape (concept node above the fork,
  branches rejoin at the unit gate). HUB with petals is reserved for categories with three or
  more families (EAS, the acyl ladder). Dimmed SIDE LOOPS mark application and enrichment
  lessons, which stay off the exam-weighted spine per CLAUDE.md
- At most one fork visible per screen, and all nodes the same size
- UNLOCK POLICY, owner ruling 2026-09-01: reactions within a unit are freely orderable. Branch
  nodes carry no locks; only UNIT GATES lock, and gate unlock stays server side per the
  non-negotiables. A student picks their own order inside a unit
- The unit gate is drawn with a real double dagger, the transition-state symbol. The drafts'
  up-down arrows and glowing pouch are model artifacts of that instruction, not designs
- The background is layered and alive: terraced hills stepping down, faint molecule line-art
  watermarks, clouds, outlined flasks, a gentle descending energy-band gradient. OPEN ITEM:
  the owner marked the current background treatment as needing work; this is the known weak
  spot for the next round
- The energy metaphor: lessons are intermediates (valleys), challenges are transition states
  (peaks), each unit ends lower than it began
- BACKGROUND DOCTRINE, owner direction 2026-09-02: the environment is COMPOSED, never
  scattered. The committed art kit (env-backdrop, prop-sheet, unit-strip in design-goals/)
  is the reference; props are placed by a deterministic per-unit placement table, and the
  preferred implementation is SVG traced from the prop sheet (tiny, theme-aware, budget-
  safe), with compressed raster only where tracing genuinely cannot match. Random per-route
  scatter of icons or molecules is a defect a critic names
- THE TRAIL IS CODE, ALWAYS: it is derived from the node layout so it follows the buttons
  by construction. A trail that visibly diverges from its nodes is a failing bug, never an
  art-direction question, and no background image may substitute for it

## The pathway node, settled by owner review of the per-unit designs, 2026-09-03

Reviewed against `docs/reference/design-goals/units/`. Named files, so a builder compares
against an image rather than this prose.

- THE BUTTON: `unit02-path.jpg` is the adopted node. A periwinkle disc SUNKEN into the
  page with its darker edge below it, reading as a key pressed into paper rather than a
  sticker floating above it
- ICONS ARE ENGRAVED INTO THE FACE, `unit07-path.jpg`: the motif is cut into the chip in a
  darker tone of the chip's own colour, never a separate badge on top of or beside it. One
  motif per node: curved arrow mechanism, lightbulb concept, stopwatch challenge, play video
- NAME LABELS ARE DEFAULT AND ALWAYS VISIBLE. Cream cards attached beside each node
  carrying the real lesson name. Never on hover, never a reveal. This supersedes every
  hover-reveal line elsewhere in this file
- THE MASCOT POINTS AT THE CURRENT LESSON, and there is exactly ONE Berry on screen.
  `unit02-path.jpg` draws two, which is a defect in the draft, not the design
- THE UNIT GATE is the simple arch of `unit02-path.jpg`: one clean mark, sunken, violet
  family, no ornament. ON THE GLYPH: the owner liked it as "just a hashtag", which is what
  the draft rendered; the correct symbol is a single cleanly drawn double dagger.
  `unit07-path.jpg` draws it doubled and muddy, which is what made unit 2 read simpler.
  Simplicity is the adopted quality; the glyph is a proper double dagger drawn once
- BRANCHES: `unit08-path.jpg` is REJECTED. Its geometry crowds the labels and its two
  columns read as a ladder rather than a fork. The later units are the reference: a clear
  split, room for a label on each side, a clear rejoin
- NO FLAGS IN THE BACKGROUND. The small flag on a pole reads as a destination and competes
  with the real nodes. Cut from the prop family
- ONE FIRE IN THE HEADER, the cartoonish flat flame. The comet fireball beside it is cut

## Every question is visual first, owner 2026-09-04

The strongest single rule to come out of looking at the built screens, and it applies to
every beat type, every onboarding step and every card.

- EVERY QUESTION CARRIES A VISUAL. A structure, a spectrum, a scheme, a mechanism frame.
  This is chemistry: the thing being reasoned about is a picture, and a question that is
  only prose has already lost the student. THE IR AND NMR QUESTIONS TOO: a spectroscopy
  question shows the actual trace, not a description of it. A beat that cannot show
  something is a beat that needs authoring, not a beat that ships as text
- THE IMAGE COMES FIRST AND THE NAME COMES SECOND. Where a molecule has a name, the
  structure is drawn and the name sits UNDER it, small and light (the muted ink, never the
  body ink), because the name is a label on the thing rather than the thing. A student who
  reads the name first has been taught to memorise a word; a student who sees the structure
  first has been taught to read chemistry
- OPTION CARDS ARE PICTURES WITH CAPTIONS, not captions with pictures. The same rule
  applies to answer choices: the structure is the option, the name is its caption

## Onboarding is simple, and the questions are short

Owner 2026-09-04, looking at the built flow: the onboarding questions are too complex. One
short question per screen, plain words, no compound sentences, no chemistry vocabulary in
the framing. The placement quiz is the only place a real chemistry question appears, and
even there the rule above holds: structure first, name under it, small and grey.

## Fill in the blank is scratched, owner 2026-09-04

Not deleted from the vocabulary, and not judged as a failure: withdrawn for now. Any beat
that asks a student to type into a gap in a sentence comes out of the lesson template and
out of the authoring queue until the owner reinstates it. Where a lesson used one, it uses
a picture-first beat instead. Recorded with the date so nobody re-adds it as an oversight.

## Every node carries its motif

Owner 2026-09-04: implement the icons everywhere. A node with no playable content still
shows what KIND it will be rather than an empty face, because an empty chip reads as broken
rather than as unauthored. Queued authoring keeps its motif and takes the dashed treatment.

## Backgrounds vary by unit

Owner 2026-09-03: more creative backgrounds, changing slightly unit to unit, the way
Duolingo's SECTIONS change character as a course runs. The prop family and the terrace
language stay constant so the product still reads as one place; what varies per unit is the
placement table, the terrain silhouette, and which props appear. Crossing from Unit 3 to
Unit 4 should feel like somewhere new without anything being redrawn.

## The scrollbar

- The F1 track map: a sticky pill holding a tiny outline of the unit's REAL path shape,
  completed stretch glowing green, riding a thin energy axis. Drag to scroll
- SUPERSEDED SAME DAY, 2026-09-03, owner after seeing it: REMOVE THE HOVER
  REVEAL. The berry on the scroll track and its hover or hold behaviour are cut.
  The track map is either always visible or absent; it does not appear and
  disappear under the pointer. The dated reversal is kept rather than deleted so
  the next round does not rebuild what was just removed. The clause below is the
  superseded text.
- BRANCHES CURVE, owner 2026-09-03: fork and rejoin geometry is smooth. No hard
  angles where a branch leaves or meets the spine; the split and the merge are
  continuous curves that keep the trail reading as one path that widens, which
  is also what makes the unit outline legible at track-map size.
- (SUPERSEDED) AMENDED 2026-09-03, owner: THE THUMB IS A BLUEBERRY. The draggable scroll thumb is Berry
  itself riding the energy axis at the student's position, not a generic dot with a mascot
  beside it. The berry IS the scrollbar handle; dragging it drags the student's viewpoint
  down the unit
- THE MAP REVEALS ON HOVER, and by the touch equivalent. At rest the edge shows only the
  thin energy axis and the berry, so the screen stays quiet. Hovering the axis (desktop) or
  touching and holding the berry (touch, where hover does not exist) expands the track map
  pill: the unit's real path outline, completed stretch glowing green. Tap-to-expand into
  the full fast-travel overlay stays. The reveal is a width and opacity transition, never a
  layout shift, and it respects reduced motion by appearing without the animation
- The dialogue bubble ("Pick up here!") is attached to the berry and shows on the same
  reveal, not permanently
- Constraint shared with the pathway: unit shapes stay simple enough that their outline reads
  as a track map at pill size

## Header and tabs

- No "Blueberry" wordmark in the header. Left: a cartoonish flask course chip (cute rounded
  erlenmeyer, violet liquid, sticker style) beside the course name, tappable to a course
  picker, Duolingo-flag style. Right: the cartoonish flat flame with streak count and the teal
  diamond with gems. The realistic comet fireball is eliminated
- Tab icons: Path is the winding green trail, Train is the FLASK AND DUMBBELL, Cards is the
  purple card fan, Feed is the blue NEWSPAPER, Me is the avatar
- Owner direction 2026-09-02: Train's tab is TRANSITIONAL; the bar trends toward Path,
  Cards, Feed, Me once Train's surfaces have a re-homing design. The committed icon set
  above stays the vocabulary either way
- ICONS ARE SVG, NEVER RASTER, NEVER EMOJI, owner finding 2026-09-02: the trainer's tool
  icons are AI-generated PNG tiles with baked backgrounds that stopped matching when the
  ground changed and blur on Retina at 3x. Every in-product icon is a traced SVG that
  inherits currentColor (emoji vary per platform and are banned from product chrome; PNGs
  cannot theme or scale). The trainer tool icons (public/icons/*.png and their img tags in
  TrainerTools.tsx) are the named migration, a follow-up after R, judged against the
  committed icon vocabulary
- DECIDED 2026-09-01 at the calibration gate: FIVE tabs (Path, Train, Cards, Feed, Me).
  The owner amended the 2026-08-28 four-tab ruling deliberately; the supersession is
  recorded in CLAUDE.md's tab section. Feed's server-backed sections render honestly
  not-open until their servers exist. The five-tab goal images are now binding on tab count

## The node sheet and the guidebook

- Tap a node: bottom sheet with Practice (difficulty pips, violet 3D START) and Challenge
  (stopwatch, double dagger). A hamburger in the sheet corner opens the GUIDEBOOK page; there
  is no separate Concept row
- Guidebook format locked: text-and-image explainer, key-idea callout card, numbered
  worked-example strip. This is the worked-example emphasis (see `LEARNING-SCIENCE.md`) given
  a surface
- The mascot peeking over the sheet edge stays

## Cards

- Reaction cards are three-sided: Setup / Conditions / Product, switched by a segmented pill
  (active segment filled, inactive outlined)
- Deck browser: fanned named reaction cards with mastery dots over the violet tray
- Save-to-deck motion follows the committed storyboard in `reference images/onboarding/`:
  tap, card scales to 0.92, arcs to the deck icon, +1 badge
- The Cards tab OPENS on the review decision, not on browsing: a Due-today hero with one big
  number and a REVIEW button, My-decks grid beneath (structure doodle, count, thin mastery
  bar per deck), then auto-collected decks from lessons
- "My mistakes" is a first-class deck fed by the Tier 2 distractor log, and auto-collected
  decks carry a lightning marker so authored and auto decks read differently at a glance

## Celebration

- Big single number, reason chips beneath, XP and streak as 3D chips, green CLAIM button,
  goggles-up mascot. The P2-winning hierarchy restated in the warm palette

## Feed

- Ours, not Duolingo's: flask quest icons (a flask filling as progress), berry avatars in
  different berry colors, "Lab mates" naming, a toast-a-flask cheer action. The newspaper tab
  icon is adopted

## The mascot

- Rendering level locked to `design-goals/blueberry_branch-sidequests_*.png`: soft realistic
  shading on a cartoon body, glossy highlight. Peeking and leaning poses are wanted. The
  mascot itself is imported per D4, never redrawn

## Typography

- Neutral grotesque for CONTENT: question stems, answer options, flashcard faces,
  guidebook body, chemical labels. DECIDED 2026-09-01: the SYSTEM STACK is the spec
  (SF on iOS, Roboto on Android, Segoe on Windows); Helvetica Neue is not licensed and
  appears only where a platform ships it natively. Goal images drawn in a Helvetica-like
  face are binding on hierarchy and size, not on the exact glyphs
- The rounded display face for CHROME: buttons, celebration numbers, streak counts, mascot
  speech. Personality lives at the celebration, not between the student and the chemistry
