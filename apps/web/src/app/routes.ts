/**
 * The route table. One place that knows what a URL hash means.
 *
 * Hash routing, not path routing, for the reason docs/INHERITED-DECISIONS.md D5
 * records: a static host serves files and rewrites nothing, so "/pathway" 404s
 * on refresh while "#/pathway" never leaves index.html. The sibling repo made
 * the same call for the same reason.
 *
 * Routes are data here and nowhere else. A tab component never reads
 * window.location; it receives what it needs as props from the shell.
 */

export type TabId =
  | "trainer"
  | "pathway"
  | "courses"
  | "search"
  | "leaderboards"
  | "periodic"
  | "chat"
  | "messages";

export interface TabDefinition {
  readonly id: TabId;
  readonly label: string;
  /** Short label for the narrow bottom bar. */
  readonly short: string;
  /** Which phase ships the data behind it. Rendered honestly on stub tabs. */
  readonly dataPhase: 5 | 6 | 7 | 8;
}

/** Order here is the order in the tab bar. CLAUDE.md lists them in this order. */
export const TABS: readonly TabDefinition[] = Object.freeze([
  { id: "trainer", label: "Mechanism Trainer", short: "Trainer", dataPhase: 5 },
  { id: "pathway", label: "Pathway", short: "Pathway", dataPhase: 6 },
  { id: "courses", label: "Courses", short: "Courses", dataPhase: 5 },
  { id: "search", label: "Reaction search", short: "Search", dataPhase: 5 },
  { id: "leaderboards", label: "Leaderboards", short: "Boards", dataPhase: 6 },
  { id: "periodic", label: "Periodic table", short: "Table", dataPhase: 5 },
  { id: "chat", label: "AI chat", short: "Chat", dataPhase: 7 },
  { id: "messages", label: "Tutor messages", short: "Tutors", dataPhase: 8 },
]);

export type Route =
  | { readonly kind: "tab"; readonly tab: TabId; readonly rest: readonly string[] }
  | { readonly kind: "onboarding"; readonly step: string };

const TAB_IDS = new Set<string>(TABS.map((tab) => tab.id));

/** "#/courses/orgo_2/aromaticity" gives tab courses, rest [orgo_2, aromaticity]. */
export function parseHash(hash: string): Route {
  const parts = hash
    .replace(/^#\/?/, "")
    .split("?")[0]!
    .split("/")
    .filter((part) => part.length > 0)
    .map(decodeURIComponent);

  const head = parts[0];
  if (head === "start") return { kind: "onboarding", step: parts[1] ?? "welcome" };
  if (head !== undefined && TAB_IDS.has(head)) {
    return { kind: "tab", tab: head as TabId, rest: parts.slice(1) };
  }
  return { kind: "tab", tab: "trainer", rest: [] };
}

export function hrefForTab(tab: TabId, ...rest: readonly string[]): string {
  return `#/${[tab, ...rest].map(encodeURIComponent).join("/")}`;
}

export function hrefForOnboarding(step: string): string {
  return `#/start/${encodeURIComponent(step)}`;
}

export function tabDefinition(id: TabId): TabDefinition {
  const found = TABS.find((tab) => tab.id === id);
  if (found === undefined) throw new Error(`no tab ${id}`);
  return found;
}
