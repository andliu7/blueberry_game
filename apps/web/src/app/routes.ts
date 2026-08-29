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
  | { readonly kind: "onboarding"; readonly step: string }
  /**
   * One pathway node played as a lesson beat: "#/lesson/u3-directing". Its own
   * route rather than a tab because a beat is a full screen task with an exit,
   * the same shape onboarding has, and because the tab bar would offer an
   * escape hatch mid question.
   */
  | { readonly kind: "lesson"; readonly node: string }
  /**
   * The review hub and its session, at "#/review".
   *
   * Its own route rather than a tab: CLAUDE.md fixes the tab list and its
   * order, and a tool reached mid task belongs behind a route rather than in
   * the bar. It is what the Charge sheet's empty state offers as the free way
   * out, and docs/ECONOMY.md prices a review drill at 0 charge, so that offer
   * needed a real destination.
   */
  | { readonly kind: "review" }
  /**
   * Development surfaces. Deliberately NOT in TABS, so nothing renders a link
   * to them and the tab bar's grid keeps its eight columns. Reached by typing
   * the hash, which is the right amount of friction for a page whose audience
   * is a critic and an author rather than a student.
   */
  | { readonly kind: "gallery"; readonly name: string };

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
  // A lesson with no node is not a lesson, so it falls through to the trainer
  // rather than rendering an empty runner.
  if (head === "lesson" && parts[1] !== undefined) return { kind: "lesson", node: parts[1] };
  if (head === "review") return { kind: "review" };
  if (head === "gallery") return { kind: "gallery", name: parts[1] ?? "berry" };
  if (head !== undefined && TAB_IDS.has(head)) {
    return { kind: "tab", tab: head as TabId, rest: parts.slice(1) };
  }
  return { kind: "tab", tab: "trainer", rest: [] };
}

export function hrefForTab(tab: TabId, ...rest: readonly string[]): string {
  return `#/${[tab, ...rest].map(encodeURIComponent).join("/")}`;
}

export function hrefForLesson(node: string): string {
  return `#/lesson/${encodeURIComponent(node)}`;
}

/** The review hub. The Charge sheet's free way out points here. */
export function hrefForReview(): string {
  return "#/review";
}

export function hrefForOnboarding(step: string): string {
  return `#/start/${encodeURIComponent(step)}`;
}

/** Development only. Nothing in the shell renders this; it is typed by hand. */
export function hrefForGallery(name: string): string {
  return `#/gallery/${encodeURIComponent(name)}`;
}

export function tabDefinition(id: TabId): TabDefinition {
  const found = TABS.find((tab) => tab.id === id);
  if (found === undefined) throw new Error(`no tab ${id}`);
  return found;
}
