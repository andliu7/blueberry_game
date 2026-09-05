# Mobbin pulls

Owner-curated exports from mobbin.com (subscription, 2026-09-02). Same rules as every
reference set here: critics compare against the file by filename, never from memory;
interaction patterns are fair reference, the apps' assets and visual design are theirs;
this directory never reaches a public build (deploy exclusion list, same as alchemie/).

Drop convention: `<app>--<flow>--<detail>.png`, one row per file below, in the same
commit as the drop when possible.

| File | App and flow | What it is reference FOR |
|---|---|---|
| `duolingo--onboarding--00.png` | Duolingo, Year in Review share card | The shareable stat card pattern: mascot, one identity line ("top 8% learner"), four stat chips, native share sheet. Reference for our shareable moments (daily mechanism result, streak milestones) |
| `duolingo--onboarding--01.png` | Duolingo, lesson complete "Flawless" | Their celebration: mascot with medal, one word headline, witty subline, THREE stat chips (XP, accuracy 100%, time). Confirms the S3 judge's accuracy-chip carry; note they show time, we chose not to (a TIME 0:02 tile was a named defect in our P2 round 1) |
| `duolingo--onboarding--02.png` | Duolingo, streak calendar page | Personal/Friends tabs, big count, Perfect Streak framing, month calendar with the streak drawn as a continuous flame band across days, freezes-used chip. Reference for a streak DETAIL page we do not have (ours is a moment, theirs is a destination) |
| `duolingo--onboarding--03.png` | Duolingo, streak day celebration | Big 5, week strip of checks, SHARE +20 GEMS (they PAY for sharing), CONTINUE as quiet text. Compare our P4 winner: ours explains the rest day in words, theirs bribes the share |
| `duolingo--onboarding--04.png` | Duolingo, in-lesson PERFECT combo | The combo burst OVER the working screen: 17 IN A ROW banner on the progress bar, PERFECT stamp across the answer, lightning ground burst, character screaming. Their answer to our P1 interstitial; theirs never leaves the lesson screen |
| `duolingo--onboarding--05.png` | Duolingo, current path screen | Per-node ICONS on path buttons (star, mic, review ring, headphones), chest as its own node, character scenes BESIDE the trail, section header card with guidebook icon, star-rating under scene, SIX-icon unlabelled tab bar. The node-icon idea is worth stealing; the six unlabelled tabs are what our S1 judge already beat |
| `duolingo--onboarding--06.png` | Duolingo, splash | Solid brand field, mascot face, wordmark bottom. What our S4 loader already beat blind at 0.93 |

## The 61-screen drop, `blueberry screens/` (owner, 2026-09-03)

Catalogued 2026-09-04. These were dropped and sat unread for a day, which is the direct
cause of the "you didn't follow the reference images" finding: a reference nobody opened
is not a reference. Files are `blueberry screens N.png`; the number is the ID below.

Read them with the contact sheets in `apps/web/measurements/_sheets/` rather than one at a
time. Twelve screens per sheet is one image read instead of twelve.

| IDs | App and flow | What it is reference FOR |
|---|---|---|
| 0-6 | Khan Academy, video lesson | Up-next list under the player, transcript as a timestamped panel, Bookmark/Share/Transcript as a three-icon row, fullscreen scrubber, "added to bookmarks" toast. Our `LessonVideo` has none of this |
| 7 | Vocabulary, MCQ question | THE question-screen reference: cream ground, one white rounded card holding the prompt, three full-width pill options, correct fills green with a check, hearts and a segment progress bar in the header, X to leave |
| 8 | Vocabulary, run result | "Lives are up!", the fraction 3/6 huge in a card, correct/incorrect chips under it, one primary button. Compare our RewardMoment |
| 9-12 | Duolingo Math, onboarding | "What do you want to learn?", course cards banded RECOMMENDED FOR ADULTS and CURRENTLY LEARNING, create-account interstitial, the notification-permission pre-prompt with an arrow pointing at the system dialog |
| 13 | Brainly, subject list | Subject rows with a drawn icon each, chemistry is a flask. Reference for the course sheet behind the header chip |
| 14-17 | Brainly, ask and answer | Question composer, comment threads, answer detail with a helpfulness vote |
| 18-21 | Brainly, Math Solver | "Your equation" then "The Solutions" as a list of ACTIONS (Evaluate, Differentiate, Graph in 2D). The closest thing in this set to our reaction search |
| 22-29 | Brainly, scan and paywall | Camera scan, a do/don't instruction card in green and red panels, "Pick a plan" with two plan cards and one highlighted |
| 30-37 | Quizlet, account | Signup with Google/Apple/email, settings as grouped rows, manage subscription, destructive delete in red |
| 38-47 | Quizlet, Learn | Green "Nice! True is correct" banner sliding over the answer, written answer with Don't know, an Options sheet of toggles, MCQ carrying a streak flame on a segmented progress bar, wrong answers outlined red with the right one dashed green, achievements and a streak calendar |
| 48-53 | Mimo | Pro paywall as a three-step TIMELINE (today, in 12 days, in 14 days), feature rows with icons, a coding-experience slider, mascot welcome, and a five-tab bar |
| 54-60 | Duolingo | Year in Review share card, Flawless celebration with three stat chips, streak calendar, the orange 5-day streak, the in-lesson PERFECT combo, the path screen with per-node icons, splash |

### The mapping this project builds against

| Our surface | Reference |
|---|---|
| MCQ beat | 7, then 43-45 for the streak flame and the wrong/right outline states |
| Answer feedback | 38 (green banner + Continue), 44 (red X on chosen, dashed green on correct) |
| Lesson result | 8 and 55 |
| Streak screen | 56, 57 |
| Pathway | 59 |
| Course sheet | 9, 10, 13 |
| Lesson video | 0-6 |
| Cards and decks | 39, 41, 42 |
| Me and settings | 33, 35, 36, 37 |
| Reaction search | 18-21 |
| Onboarding | 51, 52, 9 |
| Tab bar | 53, 17 |
