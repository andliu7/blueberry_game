# Web inspiration, fetchable

Owner asked for more references than the committed captures, 2026-08-21. These are live pages a
critic can open in a browser. They supplement the bars in `CLAUDE.md`; they do not replace them.
A critic compares against the artifact it can reach, never against a memory of the product.

## The trainer, arrow drawing

- Alchemie Mechanisms, the product page with its own capture strip: https://www.alchem.ie/mechanisms
- Mechanisms on the App Store, screenshot set: https://apps.apple.com/us/app/mechanisms-organic-chemistry/id1157056029
- Aktiv Learning, organic arrow drawing, the other shipped drag-an-arrow grader: https://aktiv.com/organic-arrow-drawing/
- realochem mechanism drawing practice, a web canvas that validates per arrow: https://realochem.study/mechanism-draw/
- ChemInteractive curved arrow problems: https://cheminteractive.ie/mech1.php

## The pathway, tabs, reward moment

- Duolingo's own write-up of the core tabs redesign, consistency and header hierarchy: https://blog.duolingo.com/core-tabs-redesign
- Apple Developer, Behind the Design: Duolingo: https://developer.apple.com/news/?id=jhkvppla
- Duolingo screen library, every core screen captured: https://www.banani.co/references/apps/duolingo

## Committed captures, the actual bar

`inspirations/` in this folder: the path, the leaderboard, progress and buttons, rewards and the
guidebook, the blocked node, the animation focus state, Memrise's UI, the tutor finder, Quizlet's
subscription plan page.

## Reference clones, source you can read

Owner supplied three repository URLs, 2026-08-24, for the same surfaces the Phase 5 loop is
judging. Cloned shallow into `repos/` and **gitignored**: 5.9 MB of third party code under their
own licences, not ours to vendor, and D1 is about repository size. Re-clone with
`git clone --depth 1 <url>` into `docs/reference/competitors/repos/<name>`.

These are reference for STRUCTURE, never for the blind comparison. The bars in `CLAUDE.md` stay
the bars: a critic judging our pathway compares against the committed capture in `inspirations/`,
not against someone's clone of it. What a clone is good for is the question a still cannot answer,
which is how the thing is assembled.

| Repo | Stack | Read it for |
|---|---|---|
| `repos/duolingo-clone` (sanidhyy) | Next.js app router, Drizzle, Clerk | `app/(main)/learn/lesson-button.tsx` is the node geometry problem we solved differently, and `unit.tsx` / `unit-banner.tsx` are how a track groups into units. `app/lesson/` is a whole lesson player: `quiz.tsx`, `challenge.tsx`, `footer.tsx`, `result-card.tsx`. `app/(main)/leaderboard/` and `app/(main)/quests/` |
| `repos/ludolang` (jokerhutt) | Vite + React + TanStack Query | `src/features/SectionPath/UnitPath.tsx` and `SectionPage.tsx`, the track laid out from a flat tree (`src/Types/Catalog/FlatSectionTree.ts`, `src/Hooks/Logic/Catalog/useSectionTree.tsx`). `src/features/Leaderboard/`, `src/Effects/ModalSheet/` beside our native `<dialog>` picker, and `src/features/Lesson/LessonComplete/` for the reward moment |
| `repos/ludolang-backend` (jokerhutt) | Kotlin, Spring Boot, Postgres | The half our non-negotiables care about: `leaderboard/app/service/LeaderboardService.kt` computes standings server side rather than accepting them from a client. Phase 6 reading, not Phase 5 |

Both ludolang repos are one author's non commercial portfolio project, stated in their README. The
duolingo-clone repo is a tutorial build. Neither is a shipped product, so their choices are worth
understanding and are not evidence about what works at scale. Our four bars are.
