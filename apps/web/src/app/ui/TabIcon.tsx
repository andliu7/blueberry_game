/**
 * One inline icon per tab id. Inline SVG rather than an icon package so the
 * shell's entry chunk carries a handful of glyphs and not a font.
 *
 * THE FOUR BAR ICONS ARE STICKERS, THE SIX OFF-BAR ONES ARE GLYPHS, and that
 * is a deliberate split rather than an unfinished job.
 *
 * The bar's icons are the only ones a student sees at 32px on a phone with
 * nothing else beside them, and a 2px hairline outline at that size reads as a
 * settings menu. The reference bar draws its five as flat, chunky, CENTRE-FILLED
 * cut-outs, each in its own colour, and it keeps that colour whether or not the
 * item is the active one. Round one of this piece wrote that intent into this
 * comment ("a flat shape in the tab's own colour") and then drew every layer in
 * `currentColor`, so the shipped bar was four hairlines in one grey. The colour
 * is real now and lives in theme.css as `--tab-hue-*`.
 *
 * THREE KINDS OF LAYER, which is the whole construction:
 *
 *   line   a thick round-capped stroke in the hue, or in the tint when it is
 *          the highlight laid back over one. The track, the arrow shaft
 *   body   a flat fill in the hue's 22 percent tint, outlined in the hue. This
 *          is what makes a shape read as a cut-out pressed onto the page, per
 *          sticker rule 3, and the tint under the outline is what stops it
 *          reading as a solid blob
 *   ink    a flat fill in the hue at full strength, no outline. Used where one
 *          shape sits ON another and has to occlude it: the head over the
 *          shoulders, the arrowhead over the shaft, the card behind the card
 *          in front
 *
 * Layers paint in order, so occlusion is the order and there is no knockout
 * colour to keep in sync with the ground any more. That is why the old `paper`
 * layer is gone: an opaque tint occludes what is behind it by itself, and a
 * knockout that had to guess whether the bar was white or near-black was one
 * more thing to get wrong in a theme nobody screenshotted.
 *
 * The six off-bar ids stay single stroke paths in `currentColor` on purpose.
 * They are drawn in a header tool button, in a list row on the Me tab and
 * beside a course name, all at 20px next to text, where a filled sticker would
 * out-shout the label it is labelling. Same family, different job.
 *
 * No shadow on any of them. Depth here is the outline and the occlusion, per
 * sticker rule 3, and a drop shadow is the thing that language forbids.
 */

import type { TabId } from "../routes";

type LayerKind = "line" | "body" | "ink";

interface Layer {
  readonly d: string;
  readonly as: LayerKind;
  /** Stroke width, `line` layers only. Bodies are always the 1.9 outline. */
  readonly w?: number;
  /** A `line` drawn in the tint rather than the hue: a highlight over a shaft. */
  readonly tint?: boolean;
}

interface Sticker {
  /** The token holding this tab's hue. Its 22 percent tint is the same name with `tint`. */
  readonly hue: string;
  readonly layers: readonly Layer[];
}

/** The four that appear in the bar, drawn as cut-outs in their own colour. */
const STICKERS: Record<"pathway" | "trainer" | "cards" | "me", Sticker> = {
  /* Two nodes on a winding track, the small one behind and the big one ahead
     with a filled centre. The pathway tab draws exactly this, so the icon is a
     small picture of the screen it opens rather than a generic signpost, and
     the size difference between the two discs is what makes the line between
     them read as a direction rather than as a dumbbell. */
  pathway: {
    hue: "path",
    layers: [
      { d: "M6.8 18.2C6.8 12.4 17.2 13.8 17.2 6.4", as: "line", w: 3.2 },
      { d: "M6.8 14.7a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7z", as: "body" },
      { d: "M17.2 1.9a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9z", as: "body" },
      { d: "M17.2 4.7a1.7 1.7 0 1 1 0 3.4 1.7 1.7 0 0 1 0-3.4z", as: "ink" },
    ],
  },
  /* The curved arrow leaving an electron source. This is the one move the
     Mechanism Trainer is about, so the icon is the move.

     ROUND TWO REDREW THIS ONE TWICE. The first attempt put a lone pair, two
     dots, inside a tinted disc at the arrow's tail, which is the notation a
     chemist writes. At 32px the disc is ten pixels across and its outline eats
     six of them, so the two dots landed as two light gaps on a dark round
     shape and the icon read as a face. Correct notation, wrong size. What is
     drawn instead is one solid source and a shaft with a light stripe down its
     middle, which is where this sticker's two tones come from: the highlight
     is the same trick the reference uses on a shield, and it survives being
     small in a way an interior detail does not. */
  trainer: {
    hue: "train",
    layers: [
      { d: "M5.4 18.6C5.4 11.2 10.6 6.6 16.4 5.9", as: "line", w: 4.2 },
      { d: "M14.4 1.7 21.8 5.5 14.4 9.3z", as: "ink" },
      { d: "M5.4 15.4a3.2 3.2 0 1 1 0 6.4 3.2 3.2 0 0 1 0-6.4z", as: "ink" },
      { d: "M5.4 18.6C5.4 11.2 10.6 6.6 16.4 5.9", as: "line", w: 1.5, tint: true },
    ],
  },
  /* Two cards. The back one is solid so the front one, which is the tint, has
     something to sit on: a stack of two identical tints is one smudge, and the
     tone step is what says there are two of them. */
  cards: {
    hue: "cards",
    layers: [
      {
        d: "M11.8 2.6h6.4a3.2 3.2 0 0 1 3.2 3.2v6.4a3.2 3.2 0 0 1-3.2 3.2h-6.4a3.2 3.2 0 0 1-3.2-3.2V5.8a3.2 3.2 0 0 1 3.2-3.2z",
        as: "ink",
      },
      {
        d: "M5.8 8.6h6.4a3.2 3.2 0 0 1 3.2 3.2v6.4a3.2 3.2 0 0 1-3.2 3.2H5.8a3.2 3.2 0 0 1-3.2-3.2v-6.4a3.2 3.2 0 0 1 3.2-3.2z",
        as: "body",
      },
    ],
  },
  /* Head and shoulders. The shoulders are the outlined body and the head is
     solid ink over the top of them, which is the same two-tone move the cards
     make and the reason the head does not need an outline of its own. */
  me: {
    hue: "me",
    layers: [
      { d: "M3.2 21.6a8.8 8.8 0 0 1 17.6 0z", as: "body" },
      { d: "M12 2.8a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2z", as: "ink" },
    ],
  },
};

/** The six off-bar glyphs. Stroke only, in currentColor; see the header. */
const GLYPHS: Record<Exclude<TabId, keyof typeof STICKERS>, string> = {
  periodic: "M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z",
  search: "M10 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12zM14.5 14.5 20 20",
  courses: "M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z",
  leaderboards: "M4 20V10h4v10zM10 20V4h4v16zM16 20v-7h4v7z",
  chat: "M4 5h16v10H9l-5 4z",
  messages: "M3 6h18v12H3zM3 6l9 7 9-7",
};

function isSticker(tab: TabId): tab is keyof typeof STICKERS {
  return tab in STICKERS;
}

export function TabIcon({ tab, className = "" }: { readonly tab: TabId; readonly className?: string }) {
  if (!isSticker(tab)) {
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
        <path d={GLYPHS[tab]} />
      </svg>
    );
  }

  const sticker = STICKERS[tab];
  const hue = `var(--tab-hue-${sticker.hue})`;
  const tint = `var(--tab-tint-${sticker.hue})`;
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {sticker.layers.map((layer, index) => {
        // Index as the key is safe here and only here: the list is a frozen
        // literal above, so nothing is ever inserted, removed or reordered.
        if (layer.as === "line") {
          return <path key={index} d={layer.d} stroke={layer.tint === true ? tint : hue} strokeWidth={layer.w ?? 3} />;
        }
        if (layer.as === "ink") {
          return <path key={index} d={layer.d} fill={hue} />;
        }
        return <path key={index} d={layer.d} fill={tint} stroke={hue} strokeWidth={1.9} />;
      })}
    </svg>
  );
}
