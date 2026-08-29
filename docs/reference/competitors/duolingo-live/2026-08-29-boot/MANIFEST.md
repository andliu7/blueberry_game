# Duolingo live capture, 2026-08-29, PHONE 390x844, LIGHT scheme, guest flow, no account

One moment, captured because none of the three committed runs holds it: the app's own **cold
open**, the window between asking for the app and the first screen being on it. S4's subject is
that window. The 2026-08-27 desktop run, the 2026-08-27-run2 phone run and the 2026-08-29-tabbar
run all navigate and then wait for the screen to settle, and waiting for the screen to settle is
waiting for exactly this window to close, so none of them ever photographed it.

`2026-08-27-run2/p04-course-picker-loading.png` is the nearest thing already committed and it is a
different event: a section of the onboarding funnel fetching its own data, mid flow, with the app
already open. It is not the open.

Reached by `apps/web/measurements/capture-duolingo-boot.mjs`: the guest walk of the tabbar script
to put the session on the learn path, then a blank tab, then `/learn` asked for again and
photographed from the instant navigation started. No account, no personal data, no non essential
cookies, no bot check. The colour scheme is emulated light rather than inherited from this
machine's Chrome, which reports dark.

**Two things about the method, both of which are why this file exists rather than four
`page.screenshot()` calls.** `Page.captureScreenshot` is served by the renderer, and the renderer
is the thing being torn down and rebuilt during a navigation: the first attempt inside the window
never returns and the run dies on a protocol timeout. This uses `Page.startScreencast`, which
pushes frames instead of being asked for them. And a reload was tried first and rejected: the
browser keeps the OLD screen painted until the new document commits, so the first 1.9 s of that
burst photographs the screen the student was already looking at. Coming from a blank tab is what
opening the app actually is.

Frames are the same 0/400/900/2500 ms burst the rest of the reference uses, measured from the
instant the app was asked for. The screencast only emits on a change, so each frame is the last
one **delivered at or before** its offset, which is by definition what was on the glass then.
`capture-log.json` carries the offset each frame was actually delivered at beside the one it was
asked for.

What is on screen, measured rather than described:

| Property | Value |
|---|---|
| First contentful paint | 1720 ms |
| Frames delivered before 900 ms | 1, at 38 ms, and it is blank |
| Blank window | about 0 to 1720 ms. No field, no mark, no progress, no word |
| First paint content | header readouts and the unit banner, with the path area still empty |
| Path fully on screen | by 2489 ms |
| Handover | none. Content appears in place. There is no transition out of a loading state |

| File | Screen | Bar for |
|---|---|---|
| b01-app-cold-open-0000ms.png | app cold open, 0 ms | loader and first reveal (S4) |
| b02-app-cold-open-0400ms.png | app cold open, 400 ms | loader and first reveal (S4) |
| b03-app-cold-open-0900ms.png | app cold open, 900 ms | loader and first reveal (S4) |
| b04-app-cold-open-2500ms.png | app cold open, 2500 ms | loader and first reveal (S4) |

The first three frames are blank white and that is the capture succeeding, not failing: it is what
the bar shows a student for the first 1.7 seconds of opening it.
