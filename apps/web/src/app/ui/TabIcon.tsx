/**
 * One inline icon per tab id. Inline SVG rather than an icon package so the
 * shell's entry chunk carries a handful of glyphs and not a font.
 *
 * THE FOUR BAR ICONS ARE STICKERS, THE SIX OFF-BAR ONES ARE GLYPHS, and that
 * is a deliberate split rather than an unfinished job.
 *
 * The bar's icons are the only ones a student sees at 28px on a phone with
 * nothing else beside them, and a 2px hairline outline at that size reads as a
 * settings menu. The reference bar draws its six as flat, chunky, filled
 * cut-outs; sticker-ui says the same thing in rule 3, that a visible outline
 * around a flat fill is what makes a shape read as a cut-out pressed onto the
 * page. So each of the four is built in three layers, which is the sticker
 * construction:
 *
 *   fill    a flat shape in the tab's own colour. No gradient, ever
 *   paper   a shape knocked out in the GROUND colour, so the layer in front
 *           actually occludes the one behind instead of blending with it
 *   stroke  the outline that turns the whole thing into a cut-out
 *
 * `paper` is what makes the card stack read as two cards rather than one
 * smudge, and it is why this component takes the ground as a CSS variable
 * (--tab-paper) rather than assuming white: the bar is white on the light theme
 * and near-black on the dark one, and a knockout that assumes one of them is
 * wrong in the other.
 *
 * The six off-bar ids stay single stroke paths on purpose. They are drawn in a
 * header tool button, in a list row on the Me tab and beside a course name, all
 * at 20px next to text, where a filled sticker would out-shout the label it is
 * labelling. Same family, different job.
 *
 * No shadow on any of them. Depth here is the outline and the knockout, per
 * sticker rule 3, and a drop shadow is the thing that language forbids.
 */

import type { TabId } from "../routes";

interface Sticker {
  /** Flat fill, drawn first, furthest back. */
  readonly fill?: string;
  /** Knocked out in the ground colour so the front layer occludes the back. */
  readonly paper?: string;
  /** The outline. Every icon has one. */
  readonly stroke: string;
}

const ICONS: Record<TabId, Sticker> = {
  /* Two nodes on a winding track. The pathway tab draws exactly this, numbered
     discs zig-zagging down a curve, so the icon is a small picture of the screen
     it opens rather than a generic signpost.

     Round one drew ONE disc on an S curve and it read as a squiggle with a dot,
     close enough to a lowercase s to be nothing. Two discs is what makes the
     line between them read as a route: a track needs somewhere it goes. */
  pathway: {
    fill: "M6.6 15.9a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2zM17.4 1.9a3.1 3.1 0 1 1 0 6.2 3.1 3.1 0 0 1 0-6.2z",
    stroke: "M6.6 15.5c0-4.6 10.8-2.9 10.8-7.2",
  },
  /* The curly arrow leaving a filled electron source. This is the one move the
     Mechanism Trainer is about, so the icon is the move. */
  trainer: {
    fill: "M4.6 17a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8zM13.3 2.1 20 5.5l-6 4z",
    stroke: "M5 17.2C5 10.6 9.2 6.3 14.6 5.5",
  },
  /* Two cards, the front one knocked out of the back one. The knockout is the
     whole point: without it the two rectangles merge into one at 28px. */
  cards: {
    fill: "M10 2.6h8a3.4 3.4 0 0 1 3.4 3.4v8a3.4 3.4 0 0 1-3.4 3.4h-8A3.4 3.4 0 0 1 6.6 14V6A3.4 3.4 0 0 1 10 2.6z",
    paper: "M6 7h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z",
    stroke: "M6 7h8a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3v-8a3 3 0 0 1 3-3z",
  },
  /* Head and shoulders. The head is the fill so the glyph still has a solid
     mass at 28px; the shoulders are the outline that makes it a cut-out. */
  me: {
    fill: "M12 3a4.1 4.1 0 1 1 0 8.2A4.1 4.1 0 0 1 12 3z",
    stroke: "M4.4 20.8a7.6 7.6 0 0 1 15.2 0",
  },

  /* The six off-bar glyphs. Stroke only; see the header. */
  periodic: { stroke: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" },
  search: { stroke: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14.5 14.5 20 20" },
  courses: {
    stroke: "M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z",
  },
  leaderboards: { stroke: "M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z" },
  chat: { stroke: "M4 5h16v10H9l-5 4z" },
  messages: { stroke: "M3 6h18v12H3zM3 6l9 7 9-7" },
};

export function TabIcon({ tab, className = "" }: { readonly tab: TabId; readonly className?: string }) {
  const icon = ICONS[tab];
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {icon.fill === undefined ? null : <path d={icon.fill} fill="currentColor" stroke="none" />}
      {/* The knockout. `--tab-paper` is set by whatever draws the icon; the
          fallback is the card colour, which is the ground under every place
          this component is used today. */}
      {icon.paper === undefined ? null : (
        <path d={icon.paper} fill="var(--tab-paper, var(--card))" stroke="none" />
      )}
      <path d={icon.stroke} />
    </svg>
  );
}
