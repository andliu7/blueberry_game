/**
 * Eight inline icons, one per tab. Inline SVG rather than an icon package so
 * the shell's entry chunk carries exactly eight glyphs and not a font.
 */

import type { TabId } from "../routes";

const PATHS: Record<TabId, string> = {
  trainer: "M4 12c3-6 5-6 8 0s5 6 8 0M14 6l4 0 0 4",
  pathway: "M6 4v4m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v8M18 4v4m0 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 4v8M6 12h12",
  courses: "M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z",
  search: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14.5 14.5 20 20",
  leaderboards: "M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z",
  periodic: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  chat: "M4 5h16v10H9l-5 4z",
  messages: "M3 6h18v12H3zM3 6l9 7 9-7",
};

export function TabIcon({ tab, className = "" }: { readonly tab: TabId; readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={PATHS[tab]} />
    </svg>
  );
}
