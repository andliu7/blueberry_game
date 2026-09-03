## Pass 1, 2026-09-01 23:51:39 EDT
- tsc apps/web/tsconfig.json --noEmit: exit 0, no errors.
- Grep #7ed957 in apps/web/src/cards/**: zero hits; no --progress token used in cards at all.
- Green as text: only var(--good) #065f46 (ReviewSession.tsx:83 summary number, :146 progress fill); distinct token from goal green, fill-only rule not violated.
- Scheduler intervals: all named constants in cards/scheduler.ts (AGAIN_MINUTES, GRADUATING_INTERVAL_DAYS, HARD_FACTOR...); UI reads nextInterval/intervalLabel, no hardcoded intervals in ui/**.
- Grade buttons (ReviewSession.tsx:153-163): no aria-label attribute, but accessible name present from visible text (label + interval). Not flagged as a violation; noting for the builder's awareness.
- Checked, clean at 23:51.
## Pass 1, 2026-09-02 10:00

- tsc apps/web: clean, exit 0.
- No #7ed957 / --progress-* usage anywhere in src/cards. Goal-green fill-only rule: no violations to find.
- Scheduler intervals: named constants in cards/scheduler.ts (DAY_MS, AGAIN_MINUTES, HARD_FACTOR); UI labels derive via intervalLabel(nextInterval()), not hardcoded. Clean.
- Grade buttons (ui/ReviewSession.tsx:153): visible text labels give the accessible name; no aria-label attribute and none needed. Deck toggle has role=checkbox + aria-checked. Clean on the aria check.
- FINDING ui/ReviewSession.tsx:70: easy grade button is text-white on bg var(--good). Dark theme --good is #34d399; white on it is about 1.9:1, under the 4.5 body floor. The code comment justifies light mode (#065f46, 7.68:1) only.
- FINDING ui/DeckPicker.tsx:218: CheckCircle tick stroke var(--good-ink) on var(--good) fill. ReviewSession's own comment records that pairing at 1.26:1; the tick is near invisible in both themes. Checked state still carried by the circle fill, but the drawn mark is dead ink.
- OBSERVATION ui/ReviewSession.tsx:83,139 and ui/CardFace.tsx:107: progress bar fill, done-count number and revealed answer use --good (correctness emerald), not the --progress family. DESIGN-GOALS names light green the progress semantic for filled bars and completed states; semantic token choice for the R round to rule on, not a contrast failure (measured pairs clear).

## Pass 2, 2026-09-02 10:01

- tsc apps/web: clean, exit 0.
- src/cards unchanged since pass 1 (newest mtime ui/MyDeck.tsx 2026-09-01 14:39; no writes today). Both pass 1 FINDINGs still stand, nothing new.
- Re-ran all four greps: still zero #7ed957 / --progress hits, zero hardcoded interval strings, grade buttons still carry visible text names.

## Pass 3, 2026-09-02 10:02

- tsc apps/web: clean, exit 0.
- src/cards still unchanged (same mtimes as pass 2). Checked, clean on all four asked greps at 2026-09-02 10:02: no goal-green anywhere in cards, no hardcoded intervals, grade buttons named by visible text.
- The two pass 1 FINDINGs (ReviewSession.tsx:70 white-on---good in dark theme; DeckPicker.tsx:218 tick at 1.26:1) remain open for the builder.
- Mailbox validator exiting after this pass.
## Mailbox validator, pass 1, 2026-09-02 15:35

- src/cards/ui/CardFace.tsx:44 tsc TS2322: {kind:"composed", at} not assignable to never (provenance union missing the composed member where it narrows)
- src/cards/ui/MyDeck.tsx:172 tsc TS2322: same composed-vs-never error
- (outside cards, for the record) src/beats/mcq/McqBeatView.tsx:100,299,301 tsc: ReactNode and Press not found
- src/cards/ui/ReviewSession.tsx:~152 grade buttons carry no aria-label; accessible name is the visible text plus the interval span, so the name shifts per card ("Good 8 days"), consider aria-label with the rating word
- src/cards/ui/ReviewSession.tsx:83 green as TEXT via var(--good); --good is #065f46 light / #34d399 dark, NOT the goal green, so fill-only rule not breached, noted only
- src/cards/ui/CardFace.tsx:107 same, answer text in var(--good), not #7ed957
- src/cards/ui/ReviewSession.tsx:139 session progress bar fill is var(--good), not var(--progress); DESIGN-GOALS says filled bars are the progress semantic
- hardcoded scheduler intervals: none found; intervalLabel.ts renders scheduler-produced days only
- #7ed957 as outline or color: none; only --progress-edge borders (derived, measured) and --progress fills in cards.css and Composer.tsx

## Mailbox validator, pass 2, 2026-09-02 15:35

- unchanged from pass 1: CardFace.tsx:44 and MyDeck.tsx:172 still fail tsc (TS2322 composed-vs-never); McqBeatView.tsx:100,299,301 still red outside cards
- ReviewSession.tsx grade buttons still have no aria-label (visible text is the only accessible name)
- ReviewSession.tsx:83 and CardFace.tsx:107 still green text via var(--good) (not the goal green; noted, not a fill-only breach)
- ReviewSession.tsx:139 progress bar fill still var(--good) rather than var(--progress)
- #7ed957 as text/outline: still none; hardcoded intervals: still none

## Mailbox validator, pass 3, 2026-09-02 15:36

- tsc unchanged: CardFace.tsx:44 and MyDeck.tsx:172 TS2322 composed-vs-never persists; types.ts is modified in the tree, so the new "composed" provenance kind likely lacks a branch in both UI switches (McqBeatView.tsx errors also persist, outside cards)
- ReviewSession.tsx grade buttons: still no aria-label
- green text via var(--good) still at CardFace.tsx:107 and ReviewSession.tsx:83 (not the goal green; noted only), progress bar fill at ReviewSession.tsx:139 still var(--good) not var(--progress)
- #7ed957 as text, outline, or color: property: none in any pass; hardcoded scheduler intervals: none in any pass
- tree state at this pass: cards/types.ts modified; Composer.tsx, Doodles.tsx, cards.css, composer.ts, landing.ts, mastery.ts present untracked

Third pass done. Mailbox validator exiting.
