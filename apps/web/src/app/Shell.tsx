/**
 * The app shell: header, the tab bar, and the outlet the current tab renders in.
 *
 * Layout decision: the tab bar is a bottom bar under 768px (thumb reach on a
 * phone, the same place Duolingo and the reference capture put it) and a left
 * rail above. One component, two CSS layouts, no duplicated route logic.
 *
 * Every tab except the trainer is behind React.lazy, so a student who opens
 * the app for a mechanism downloads the mechanism. The trainer is a static
 * import on purpose: the payload gate in packages/validators weighs the entry
 * chunk as "the game route", and a trainer behind a dynamic import would make
 * the gate weigh an empty shell and call it the game. The skeleton fallbacks
 * are the loading contract: never a blank rectangle.
 */

import { lazy, Suspense, useState, type ReactNode } from "react";
import { TABS, hrefForTab, tabDefinition, type Route, type TabId } from "./routes";
import { TabSkeleton } from "./ui/Skeleton";
import { useReducedMotion, useTheme, setTheme } from "./hooks";
import { LanguageButton, LanguageSheet } from "./ui/LanguagePicker";
import { Hud } from "./ui/Hud";
import { BlueberryMark } from "../mascot/BlueberryMark";
import { TrainerTab } from "../tabs/trainer/TrainerTab";
import { TabIcon } from "./ui/TabIcon";

const PathwayTab = lazy(() => import("../tabs/pathway/PathwayTab"));
const CoursesTab = lazy(() => import("../tabs/courses/CoursesTab"));
const SearchTab = lazy(() => import("../tabs/search/SearchTab"));
const LeaderboardsTab = lazy(() => import("../tabs/leaderboards/LeaderboardsTab"));
const PeriodicTab = lazy(() => import("../tabs/periodic/PeriodicTab"));
const ChatTab = lazy(() => import("../tabs/chat/ChatTab"));
const MessagesTab = lazy(() => import("../tabs/messages/MessagesTab"));

/**
 * Theme and language are CHROME, and the header has readouts in it.
 *
 * They shipped as bordered white pills, which on a phone put two 44px discs
 * beside four flat numbers and made the loudest things in the header the two
 * that say the least. They are ghost buttons now: same 44px target, same press,
 * no box. The border was carrying "this is pressable", and next to things that
 * are visibly NOT pressable it no longer has to.
 *
 * Round two moved them out of the status row entirely, to the left of the
 * header beside the wordmark. Same buttons, same targets; what changed is which
 * half of the header a student's eye lands in when it is looking for a number.
 */
function ThemeToggle() {
  const theme = useTheme();
  const next = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="press inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-scale-base text-muted-foreground hover:text-foreground"
      onPointerDown={() => setTheme(next)}
      aria-label={`Switch to ${next} mode`}
      title={`Switch to ${next} mode`}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  );
}

function TabLink({ tab, active }: { readonly tab: TabId; readonly active: boolean }) {
  const definition = tabDefinition(tab);
  return (
    <a
      href={hrefForTab(tab)}
      aria-current={active ? "page" : undefined}
      className={`press flex min-h-11 min-w-11 flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1.5 text-scale-xs font-semibold md:flex-row md:justify-start md:gap-3 md:px-3 md:text-scale-sm ${
        active ? "bg-primary/10 text-primary-ink" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <TabIcon tab={tab} className="h-5 w-5" />
      <span className="md:hidden">{definition.short}</span>
      <span className="hidden md:inline">{definition.label}</span>
    </a>
  );
}

function Outlet({ route }: { readonly route: Route }) {
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
    case "courses":
      return <CoursesTab rest={rest} reducedMotion={reducedMotion} />;
    case "search":
      return <SearchTab query={rest[0] ?? ""} />;
    case "leaderboards":
      return <LeaderboardsTab />;
    case "periodic":
      return <PeriodicTab selected={rest[0] ?? null} />;
    case "chat":
      return <ChatTab />;
    case "messages":
      return <MessagesTab />;
    default: {
      const unreachable: never = route.tab;
      return <>{unreachable}</>;
    }
  }
}

export function Shell({ route, children }: { readonly route: Route; readonly children?: ReactNode }) {
  const [languageOpen, setLanguageOpen] = useState(false);
  const activeTab = route.kind === "tab" ? route.tab : null;
  const label = activeTab === null ? "the page" : tabDefinition(activeTab).label;

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <nav
        aria-label="Tabs"
        className="order-last fixed inset-x-0 bottom-0 z-20 grid grid-cols-8 gap-0.5 border-t border-border bg-card/90 px-1 pt-1 pb-safe backdrop-blur-md md:static md:order-first md:flex md:w-60 md:flex-col md:gap-1 md:border-t-0 md:border-r md:p-3"
      >
        <a href={hrefForTab("trainer")} className="mb-3 hidden items-center gap-2 px-2 md:flex" aria-label="Blueberry home">
          <BlueberryMark className="h-8 w-8" />
          <span className="title-face text-scale-lg font-semibold text-foreground">Blueberry</span>
        </a>
        {TABS.map((tab) => (
          <TabLink key={tab.id} tab={tab.id} active={tab.id === activeTab} />
        ))}
      </nav>

      <div className="flex min-h-dvh min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* No `border-b`. The header's bottom edge is the daily goal meter the
            HUD draws, and a border a pixel above a track is a seam rather than
            a design. See hud.css, "the daily goal edge". */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-1.5 bg-background/85 px-2 pb-2.5 pt-2 backdrop-blur-md sm:gap-3 sm:px-4 md:px-6">
          {/* CHROME ON THE LEFT, SCORES ON THE RIGHT. The blind critic's finding
              on round one was that the language code and the theme toggle sat in
              the status row at the same size and weight as the readouts, so the
              row had seven equal chips and no primacy. They are chrome: they
              belong beside the wordmark, muted, on the other side of the header
              from anything a student reads as a score.

              The wordmark TEXT is still the first thing to go on a phone, and
              the tab bar already says which app this is. The mark stays as the
              home link and keeps the accessible name. */}
          <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
            <a href={hrefForTab("trainer")} className="flex items-center gap-2 md:hidden" aria-label="Blueberry home">
              <BlueberryMark className="h-6 w-6 shrink-0" />
              <span className="title-face hidden text-scale-base font-semibold sm:inline">Blueberry</span>
            </a>
            <h1 className="hidden truncate text-scale-lg font-semibold text-foreground md:block">{label}</h1>
            <span className="mx-0.5 hidden h-5 w-px bg-border md:inline-block" aria-hidden />
            <LanguageButton onOpen={() => setLanguageOpen(true)} />
            <ThemeToggle />
          </div>
          <Hud />
        </header>

        <main className="min-h-0 flex-1">
          {children ?? (
            <Suspense fallback={<TabSkeleton label={label} />}>
              <Outlet route={route} />
            </Suspense>
          )}
        </main>
      </div>

      <LanguageSheet open={languageOpen} onClose={() => setLanguageOpen(false)} />
    </div>
  );
}
