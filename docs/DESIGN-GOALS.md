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
- The tab bar background is cream or white, never purple

## The buttons

- Every node and button is a 3D pressable chip: thick darker bottom edge, and it visibly
  PRESSES DOWN on pointer down. This is the press-acknowledgement rule made physical, and the
  pressed frame must land inside the 100 ms budget
- The five node states are the committed states sheet: rest, pressed, completed (green with
  soft glow), locked (flat, grey), current (halo plus START pill)
- The glow is the completed-state language: static soft glow on finished path segments, a
  pulsing halo ONLY on the current node, and no pulse under reduced motion

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

## The scrollbar

- The F1 track map: a sticky pill holding a tiny outline of the unit's REAL path shape,
  completed stretch glowing green, riding a thin energy axis. Drag to scroll
- A small mascot marks where the student left off, with a short dialogue bubble ("Pick up
  here!"). Tap the pill to expand into the fast-travel overlay
- Constraint shared with the pathway: unit shapes stay simple enough that their outline reads
  as a track map at pill size

## Header and tabs

- No "Blueberry" wordmark in the header. Left: a cartoonish flask course chip (cute rounded
  erlenmeyer, violet liquid, sticker style) beside the course name, tappable to a course
  picker, Duolingo-flag style. Right: the cartoonish flat flame with streak count and the teal
  diamond with gems. The realistic comet fireball is eliminated
- Tab icons: Path is the winding green trail, Train is the FLASK AND DUMBBELL, Cards is the
  purple card fan, Feed is the blue NEWSPAPER, Me is the avatar
- OPEN OWNER DECISION: five tabs (Path, Train, Cards, Feed, Me) versus the recorded four-tab
  amendment of 2026-08-28. Five sits at mobile-ui's hard limit. Alternatives on the table:
  quests inside Me, or Feed behind the existing flag until its servers exist. Amending
  `routes.ts` placements is the owner's call and is not made here

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

- Neutral grotesque (Helvetica Neue with the system stack) for CONTENT: question stems,
  answer options, flashcard faces, guidebook body, chemical labels
- The rounded display face for CHROME: buttons, celebration numbers, streak counts, mascot
  speech. Personality lives at the celebration, not between the student and the chemistry
