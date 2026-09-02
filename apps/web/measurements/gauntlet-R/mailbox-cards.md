## Pass 1, 2026-09-01 23:51:39 EDT
- tsc apps/web/tsconfig.json --noEmit: exit 0, no errors.
- Grep #7ed957 in apps/web/src/cards/**: zero hits; no --progress token used in cards at all.
- Green as text: only var(--good) #065f46 (ReviewSession.tsx:83 summary number, :146 progress fill); distinct token from goal green, fill-only rule not violated.
- Scheduler intervals: all named constants in cards/scheduler.ts (AGAIN_MINUTES, GRADUATING_INTERVAL_DAYS, HARD_FACTOR...); UI reads nextInterval/intervalLabel, no hardcoded intervals in ui/**.
- Grade buttons (ReviewSession.tsx:153-163): no aria-label attribute, but accessible name present from visible text (label + interval). Not flagged as a violation; noting for the builder's awareness.
- Checked, clean at 23:51.
