# Duolingo live capture, 2026-08-29, PHONE 390x844 @3x, LIGHT scheme, guest flow, no account

One screen, captured because neither committed run reached it: the learn path with the **bottom
tab bar** up. The 2026-08-27 desktop run and the 2026-08-27-run2 phone run both went straight from
the last onboarding beat into the lesson player and left at the create-a-profile wall, so neither
ever stood on the path screen and neither photographed the bar. S1's subject is the bar.

Reached by `apps/web/measurements/capture-duolingo-tabbar.mjs`: landing, Get started, Spanish, the
onboarding beats, then the lesson's own X to quit, then the close control on the last funnel sheet,
which is what a student presses when they want to look at the path first. No account, no personal
data, no non essential cookies, no bot check. The colour scheme is emulated light rather than
inherited from this machine's Chrome, which reports dark.

What is on screen, measured rather than described (`capture-log.json` carries the same numbers):

| Property | Value |
|---|---|
| Bar items | 5: home, leaderboards, quests, shop, profile |
| Labels | none. Icon only, no text under any item |
| Item box | 48 x 48 CSS px minimum |
| Position | bottom of the viewport, `top` 780 of 844, above a 1 px hairline |
| Header above the path | 4 readouts: course flag, streak, gems, hearts |

| File | Screen | Bar for |
|---|---|---|
| t01-path-tabbar-0000ms.png | learn path, bottom tab bar, 0 ms | bottom tab bar (S1) |
| t02-path-tabbar-0400ms.png | learn path, bottom tab bar, 400 ms | bottom tab bar (S1) |
| t03-path-tabbar-0900ms.png | learn path, bottom tab bar, 900 ms | bottom tab bar (S1) |
| t04-path-tabbar-2500ms.png | learn path, bottom tab bar, 2500 ms | bottom tab bar (S1) |

For how a not-yet-available option is presented, the matching captures stay where they are:
`2026-08-27/d03-course-picker.png` and `d04-course-picker-loading.png` on desktop, and
`2026-08-27-run2/p03-course-picker.png` on the phone shape.
