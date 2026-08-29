/**
 * The app shell: header, the tab bar, and the outlet the current tab renders in.
 *
 * FOUR TABS. Owner amendment of 2026-08-28, quoted in full in routes.ts and in
 * CLAUDE.md. Path, Train, Cards, Me. The periodic table and the reaction search
 * are header TOOLS now, not destinations; Courses collapsed to a link because
 * there is one course; leaderboards, chat and tutor messages sit behind
 * app/flags.ts. Every id still parses and every route still resolves, so a link
 * a student already has lands on a page.
 *
 * WHAT THE HEADER CARRIES, AND WHY IT CHANGED.
 *
 * The header's right half is the P3 HUD, which was won blind at round two and
 * is untouched here: three status items and the daily goal meter as the
 * header's bottom edge. The left half used to be the wordmark plus two ghost
 * chrome buttons, language and theme. It is now the language button and the two
 * tool buttons.
 *
 * That trade is the piece. A tool a student reaches for MID PROBLEM has to be
 * in the header or it is not reachable at all from inside a lesson, which is
 * the half of CLAUDE.md's "interactive, always reachable" that a tab never
 * satisfied. Theme is not that: it is a setting, it is chosen once, and it
 * belongs on the Me tab with the other settings. Language stays because it is
 * the closest thing this app has to the reference bar's course chip, and
 * because a student on a non-English course changes it far more often than
 * they change a colour scheme.
 *
 * The wordmark leaves the phone header for the same reason the reference bar
 * has no wordmark on a signed-in screen: the tab bar already says which app
 * this is, and 390px of header is worth more to a tool than to a logo. It
 * stays above the rail on the wide layout, where there is room.
 *
 * Every tab except the trainer is behind React.lazy, so a student who opens
 * the app for a mechanism downloads the mechanism. The trainer is a static
 * import on purpose: the payload gate in packages/validators weighs the entry
 * chunk as "the game route", and a trainer behind a dynamic import would make
 * the gate weigh an empty shell and call it the game. The skeleton fallbacks
 * are the loading contract: never a blank rectangle.
 */

import { lazy, Suspense, useCallback, useState, type ReactNode } from "react";
import { NAV_TABS, hrefForTab, tabDefinition, type Route, type TabId } from "./routes";
import { isFlagOn } from "./flags";
import { TabSkeleton } from "./ui/Skeleton";
import { useReducedMotion } from "./hooks";
import { LanguageButton, LanguageSheet } from "./ui/LanguagePicker";
import { Hud } from "./ui/Hud";
import { NotOpenYet } from "./ui/NotOpenYet";
import { ToolRail } from "./ui/ToolRail";
import { BlueberryMark } from "../mascot/BlueberryMark";
import { TrainerTab } from "../tabs/trainer/TrainerTab";
import { TabIcon } from "./ui/TabIcon";
import "./ui/tabs.css";

const PathwayTab = lazy(() => import("../tabs/pathway/PathwayTab"));
const CardsTab = lazy(() => import("../tabs/cards/CardsTab"));
const MeTab = lazy(() => import("../tabs/me/MeTab"));
const CoursesTab = lazy(() => import("../tabs/courses/CoursesTab"));
const SearchTab = lazy(() => import("../tabs/search/SearchTab"));
const LeaderboardsTab = lazy(() => import("../tabs/leaderboards/LeaderboardsTab"));
const PeriodicTab = lazy(() => import("../tabs/periodic/PeriodicTab"));
const ChatTab = lazy(() => import("../tabs/chat/ChatTab"));
const MessagesTab = lazy(() => import("../tabs/messages/MessagesTab"));

/**
 * One item in the bar.
 *
 * An <a> and not a button, so the browser's own middle click, back button and
 * "copy link" all work on a destination. `aria-current="page"` is both the
 * accessible state and the CSS hook the active chip hangs off, which means the
 * two can never disagree: there is no second boolean to keep in sync.
 */
function TabLink({ tab, active }: { readonly tab: TabId; readonly active: boolean }) {
  const definition = tabDefinition(tab);
  return (
    <a href={hrefForTab(tab)} aria-current={active ? "page" : undefined} className="press tabbar-item">
      <TabIcon tab={tab} className="tabbar-icon" />
      <span className="md:hidden">{definition.short}</span>
      <span className="hidden md:inline">{definition.label}</span>
    </a>
  );
}

/**
 * The three flagged surfaces render honestly rather than 404ing.
 *
 * flags.ts decides whether the app LINKS to a surface, never whether it
 * renders: a student who typed the hash or followed an old link has to land
 * somewhere true. With the flag off that landing is NotOpenYet; with it on the
 * built surface renders as it always did.
 */
function Flagged({ flag, children }: { readonly flag: "leaderboards" | "chat" | "messages"; readonly children: ReactNode }) {
  if (isFlagOn(flag)) return <>{children}</>;
  return <NotOpenYet surface={flag} />;
}

function Outlet({
  route,
  onImmersiveChange,
}: {
  readonly route: Route;
  readonly onImmersiveChange: (immersive: boolean) => void;
}) {
  // Hooks run before any early return, always, or React loses track of them
  // between renders.
  const reducedMotion = useReducedMotion();
  if (route.kind !== "tab") return null;
  const rest = route.rest;
  switch (route.tab) {
    case "trainer":
      return <TrainerTab reducedMotion={reducedMotion} />;
    case "pathway":
      return <PathwayTab reducedMotion={reducedMotion} />;
    case "cards":
      return <CardsTab onImmersiveChange={onImmersiveChange} />;
    case "me":
      return <MeTab />;
    case "courses":
      return <CoursesTab rest={rest} reducedMotion={reducedMotion} />;
    case "search":
      return <SearchTab query={rest[0] ?? ""} />;
    case "periodic":
      return <PeriodicTab selected={rest[0] ?? null} />;
    case "leaderboards":
      return (
        <Flagged flag="leaderboards">
          <LeaderboardsTab />
        </Flagged>
      );
    case "chat":
      return (
        <Flagged flag="chat">
          <ChatTab />
        </Flagged>
      );
    case "messages":
      return (
        <Flagged flag="messages">
          <MessagesTab />
        </Flagged>
      );
    default: {
      const unreachable: never = route.tab;
      return <>{unreachable}</>;
    }
  }
}

export function Shell({ route, children }: { readonly route: Route; readonly children?: ReactNode }) {
  const [languageOpen, setLanguageOpen] = useState(false);
  /**
   * True while a tab is running a full screen task and the bar should get out
   * of the way. mobile-ui: "The bar is contextual: entering an editor may
   * replace or hide it entirely."
   *
   * The state is here rather than in the tab because the bar is here. That is
   * LIFTING STATE UP, the React pattern for a flag one component owns and
   * another sets; useCallback keeps the setter identity stable so the tab's
   * reporting effect does not re-run on every shell render.
   */
  const [immersive, setImmersive] = useState(false);
  const onImmersiveChange = useCallback((next: boolean) => setImmersive(next), []);
  const activeTab = route.kind === "tab" ? route.tab : null;
  const label = activeTab === null ? "the page" : tabDefinition(activeTab).label;
  // The bar lights the tab the current route lives UNDER, so #/courses lights
  // Path and #/chat lights Me. A bar with nothing lit reads as broken, and six
  // of the ten routes are off-bar now. See TabDefinition.parent.
  const litTab = activeTab === null ? null : tabDefinition(activeTab).parent;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <nav aria-label="Tabs" className={`tabbar order-last md:order-first ${immersive ? "tabbar--away" : ""}`}>
        <a href={hrefForTab("pathway")} className="tabbar-brand" aria-label="Blueberry home">
          <BlueberryMark className="h-8 w-8" />
          <span className="title-face text-scale-lg font-semibold">Blueberry</span>
        </a>
        {NAV_TABS.map((tab) => (
          <TabLink key={tab.id} tab={tab.id} active={tab.id === litTab} />
        ))}
      </nav>

      <div className={`flex min-h-dvh min-w-0 flex-1 flex-col md:pb-0 ${immersive ? "pb-4" : "pb-24"}`}>
        {/* No `border-b`. The header's bottom edge is the daily goal meter the
            HUD draws, and a border a pixel above a track is a seam rather than
            a design. See hud.css, "the daily goal edge". */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-1.5 bg-background/85 px-2 pb-2.5 pt-2 backdrop-blur-md sm:gap-3 sm:px-4 md:px-6">
          {/* TOOLS ON THE LEFT, SCORES ON THE RIGHT. The blind critic's finding
              on the P3 round was that the header's left half held chrome at the
              same size and weight as the readouts, so the row had seven equal
              chips and no primacy. The split survives; what changed is that the
              left half is now worth its space. A tool is an OBJECT you pick up,
              so it carries an outline per sticker rule 3; the readouts opposite
              are flat because they are readings, not controls. Two different
              kinds of thing, drawn as two different kinds of thing. */}
          <div className="flex min-w-0 items-center gap-1.5">
            <h1 className="hidden truncate pr-1 text-scale-lg font-semibold text-foreground md:block">{label}</h1>
            <LanguageButton onOpen={() => setLanguageOpen(true)} />
            <ToolRail />
          </div>
          <Hud />
        </header>

        <main className="min-h-0 flex-1">
          {children ?? (
            <Suspense fallback={<TabSkeleton label={label} />}>
              <Outlet route={route} onImmersiveChange={onImmersiveChange} />
            </Suspense>
          )}
        </main>
      </div>

      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </div>
  );
}
