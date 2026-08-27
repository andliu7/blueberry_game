# Design tokens, inherited from Blueberry

Extracted from `andliu7/blueberry`, chiefly `src/index.css` and `src/components/ui/*`. This app is
a sibling, not a fork, so it re-declares these rather than importing them. Keep them in sync by
hand and note any divergence here with a reason.

The point is that a student who uses Blueberry and then opens Mechanisms should not feel they
changed products.

## Color

**OWNER DIVERGENCE, recorded 2026-08-20, and it wins over everything below.** The app is LIGHT MODE
FIRST. The inherited Blueberry default of dark-unless-stored-light is reversed: default light, dark
available as a choice. The palette moves toward Duolingo's brightness and saturation but purple led
rather than green led: the primary is the purple family the existing indigo accent already points
toward, roughly the #7c3aed to #8b5cf6 violet range as the working centre, with the indigo to
fuchsia gradient kept as its natural companion. Cream and stone stay as the warm neutral ground so
the sibling app is still recognisable. Exact values are set in Phase 4 and run through the contrast
gate like everything else; what is fixed now is light first, purple led, Duolingo bright.

The pre-paint theme script still ships, with its default flipped. The reason it exists, no flash of
wrong theme, is unchanged.

### Inherited palette, now the DARK variant and the source of the neutrals


Class-based dark mode, not `prefers-color-scheme`. Tailwind v4 variant is repointed with
`@custom-variant dark (&:where(.dark, .dark *));`. An inline script in `index.html` runs pre-paint,
reads `localStorage['theme']`, and toggles `.dark` on `<html>`, defaulting to dark unless the
stored value is explicitly `"light"`. Copy that script or you will ship a flash of wrong theme.

| Token | Light | Dark |
|---|---|---|
| `--background` | `#f6f4ef` cream | `#0c0a09` stone-950 |
| `--foreground` | `#1e293b` slate-800 | `#e7e5e4` stone-200 |
| `--card`, `--popover` | `#ffffff` | `#1c1917` stone-900 |
| `--card-foreground` | `#0f172a` | `#f5f5f4` |
| `--primary` | `#0f172a` | `#f5f5f4` |
| `--primary-foreground` | `#ffffff` | `#1c1917` |
| `--secondary`, `--muted`, `--accent` | `#f1f5f9` slate-100 | `#292524` stone-800 |
| `--muted-foreground` | `#64748b` slate-500 | `#a8a29e` stone-400 |
| `--destructive` | `#e11d48` rose-600 | `#f43f5e` rose-500 |
| `--border`, `--input` | `#e2e8f0` slate-200 | `#44403c` stone-700 |
| `--ring` | `#818cf8` indigo-400 | `#818cf8` |

Accent gradient, used for sheen borders and glow: `#6366f1` indigo-500 to `#d946ef` fuchsia-500.
Blueberry mark gradient: `#bdefff` to `#3fa9ff` to `#3d63f5` to `#2b2fb0`.

Body carries a 28 by 28 px hairline grid, `rgba(15,23,42,0.025)` light and
`rgba(255,255,255,0.035)` dark. That 28 px is the app's soft spatial unit.

**Gap closed, 2026-08-27.** The success and non-binary outcome tokens exist in `theme.css`:
`--good` / `--good-ink` / `--good-soft`, `--alt-route`, `--not-requested`, and the warning family
`--warn` / `--warn-soft-solid` / `--warn-ink-strong`. None of them is red.

**The contrast gate is a script now: `apps/web/measurements/contrast-audit.mjs`.**

Run it after `npm run build`. It walks the BUILT app on every tab in both themes and measures every
composed pair the browser actually drew, rather than the pairs this table declares. That distinction
is the whole point: this table was right about the charge chip and the component drew a literal
`#ffffff` anyway, so a token table cannot be the gate. It exits nonzero on any pair under its floor.

Floors are WCAG 2.1: 4.5 for body text, 3.0 for large text and for graphics and interface
components under 1.4.11. Two rules in it are worth knowing before reading its output:

- **A shape is one component.** A shape's fill and its boundary collapse to the better of the two,
  because 1.4.11 asks whether a component is identifiable, not whether every colour in it clears the
  floor. `--bond-joint` is why: it must stay lighter than the rod it sits on, so no fill value can
  also clear a near white ground, and `--bond-joint-ring` in the rod's colour is what identifies it
- **What it cannot resolve, it refuses to score.** A mark sitting on another mark rather than on a
  styled box is reported UNRESOLVED and listed for a person, never counted either way. 175 marks are
  in that bucket today, nearly all of them mascot internals, where a white specular highlight is
  inside an illustration and is not an interface component at all

**Six failures it found on its first run, all fixed, each recorded with its reason in `theme.css`:**

| Token | Was | Now | Why |
|---|---|---|---|
| `--bond-stroke` light | `#8e9aab`, 2.37:1 | `#75839a`, 3.19:1 | A bond is the object a student grabs |
| `--bond-joint` light | `#c8d0da`, 1.29:1 | `#eef2f6` plus `--bond-joint-ring` | The ring carries it; see above |
| `--scene-faint` dark | alpha 0.55, 2.80:1 | alpha 0.72, 3.4:1 | The light half had been raised by hand; the dark half was missed |
| `--diamond` light | `#0ea5e9`, 2.77:1 | `#0284c7`, 4.10:1 | An icon that carries meaning |
| `--primary` dark | `#8b5cf6`, white on it 4.23:1 | `#8250f0`, 4.82:1 | The most pressed control in the app |
| `--primary` dark as TEXT | 4.39:1 on the card | new `--primary-ink` `#a78bfa`, 6.81:1 | See the split below |

**`--primary` carries two roles and one value cannot serve both.** As a surface it has white on it,
so it must be dark enough; as ink it sits on the near black page, so it must be light enough. The
two pull in opposite directions and there is no compromise value that clears both. `--primary` is
now the surface and `--primary-ink` is the ink, the same split `--good` and `--good-ink` already
use. Light mode needs no split and defines the token anyway so a component names one thing in both
themes.

**Do not use red for a wrong answer.** Per the game shell rules, an incorrect arrow snaps back and
a leaving group that will not leave wobbles. `--destructive` is for destructive actions, such as
deleting saved work, not for a student learning.

## Typography

- Body and UI: `"Inter Variable", Inter, ui-sans-serif, system-ui, sans-serif`
- Display, class `.title-face`: `"Fraunces Variable", "Iowan Old Style", Palatino, Georgia, serif`,
  `letter-spacing: 0.02em`
- Handwritten accent, class `.playful-face`: `"Caveat Variable"` and fallbacks. Short labels only,
  never body copy
- `.playful-body` keeps Inter at `letter-spacing: 0.01em; line-height: 1.7` for warm long copy

**This app defines one**, in `theme.css` under `@theme inline`: seven steps, roughly a 1.25 ratio,
snapped to whole pixels, used as `text-scale-xs` through `text-scale-display`.

| Step | Value | | Step | Value |
|---|---|---|---|---|
| `scale-xs` | 0.75rem | | `scale-xl` | 1.375rem |
| `scale-sm` | 0.875rem | | `scale-2xl` | 1.75rem |
| `scale-base` | 1rem | | `scale-display` | 2.5rem |
| `scale-lg` | 1.125rem | | | |

## Shape, depth, glass

- House radius is `rounded-xl`, 12 px. Deliberately not mapped onto Tailwind's `--radius-md`, so
  unrelated `rounded-md` usage is not reshaped
- Glass card: `rounded-[2rem]` outer with a `rounded-[1.75rem]` inner inset
- Pressable buttons: `rounded-[9px]`
- Glass surfaces: `backdrop-blur-sm` or `-md`, `bg-white/40 dark:bg-white/[0.06]`, plus layered
  inset box-shadows for the bevel. An SVG `feTurbulence` and `feDisplacementMap` filter adds
  refraction as progressive enhancement, never as a requirement
- Buttons are `h-11`, 44 px, one step taller than stock shadcn, explicitly for the touch target
  floor. That is the same 44 pt floor this app's accessibility budget names, so it is already
  consistent

## Motion

Two libraries, with a division of labour worth keeping.

- `motion` (the Framer successor) drives interaction: springs on buttons, toggles, toasts, nav.
  Typical spring `{ stiffness: 300 to 520, damping: 22 to 34, mass: 0.45 to 0.7 }`. Simple fades
  use `duration: 0.25 to 0.35s` with cubic-bezier `[0.4, 0, 0.2, 1]`
- `gsap` drives timeline-heavy sequences, such as the card fan carousel
- Plain CSS keyframes handle passive loops: shine borders at 2.6s linear, spotlight pulse at 1.8s
- Theme swap forces a 220 ms ease transition on color properties for 260 ms around the toggle

`prefers-reduced-motion` is respected pervasively, and correctly: animations drop to 1 ms or
freeze to a representative static frame, never simply vanish leaving no state. Match that
standard. A stereocenter inversion with reduced motion still has to show that inversion happened.

## The mascot

Both 2D and 3D, progressively enhanced, and already built. Do not rebuild any of it.

- `blueberry-mark.tsx`: flat inline SVG, viewBox `0 0 64 64`, radial-gradient sphere with a five
  lobed calyx crown. Animated eyes, blush, and smile driven by CSS classes and a `data-mood`
  attribute. Thirteen moods including curious, focused, thinking, shy, cheer, happy, proud, sleepy
- `blueberry.tsx`: renders the flat mark first for cheap first paint, then lazy loads the WebGL
  version only when the element is near viewport, WebGL is confirmed, and reduced motion is off.
  Cross-fades in over a 600 ms `berry-arrive` keyframe
- `berry-geometry.ts`: pure THREE geometry, an oblate spheroid at `OBLATE = 1.12` with a sculpted
  five lobed calyx depression. No mood or behaviour logic
- `berryBehaviour.ts`: the behaviour machine. See `docs/INHERITED-DECISIONS.md` D4

Mood and behaviour compose. Wire game events to behaviours, not to moods: correct resolves to
`bounce`, wrong to `squash`, streak milestones to `celebrate`. A student can be `stressed` during
exam week and still bounce on a correct answer, and that combination is the whole reason the two
axes are separate.

## Layout

- Practical breakpoints, from existing media queries: 480, 640, 768, 1024
- Radius ladder in practice: `rounded-xl` default, `rounded-2xl` for tiles and toasts, `rounded-full`
  for pills and avatars
- No global container convention. Widths are set per component, for example
  `w-[min(24rem,calc(100vw-2.5rem))]` on the toast stack

## Duolingo, as a second reference

Named as inspiration for the game shell only, not for the chemistry. What is worth taking is the
shape of the reward moment: a large single number for the session result, a full-bleed celebration
state that is visually distinct from the working state, and a tiered badge that means something
because it was scarce.

**Amended 2026-08-27.** The paragraph that stood here rejected the streak-loss anxiety loop
outright. Owner direction now ships a streak, a charge limiter and a decaying mastery score. Its
reasoning was not wrong and is preserved in `docs/ECONOMY.md`: this is a study tool used before
exams by people who are already stressed, and a mechanic built on fear of losing a number is the
wrong tool for that audience. What answers it is the mitigation set in that file. For token
purposes the consequence is narrow: a streak, charge or mastery surface never uses the critical
or error ramp, never counts down, and never animates a number falling. Loss states in this
product are rendered in the calm ramp, not the alarm one.
