/**
 * The three drawn marks in the header HUD: the XP ring, the diamond, and the
 * streak flame. Bloom is the fourth and is the imported mascot, never redrawn
 * (CLAUDE.md, and docs/INHERITED-DECISIONS.md D4).
 *
 * Every one is inline SVG with token fills. No sprite sheet, no icon font, no
 * emoji: an emoji flame is a different drawing on every platform and a font is
 * bytes the game route pays for on a budget that already counts them.
 *
 * WHY THEY ARE CHUNKY. The bar's header marks are solid shapes with one lighter
 * facet and no outline, read at about 24px on a phone. A hairline stroke icon
 * at that size reads as a settings row rather than as a score, which is the
 * whole difference between a game HUD and an admin panel. So each mark here is
 * a filled silhouette plus exactly one lighter facet for volume, and nothing
 * else. The facet is a white or black wash at low alpha ON the mark, so it
 * never has to clear a contrast floor against the page: the silhouette does
 * that, in a token measured for it.
 *
 * The one place a stroke is right is the ring, because a ring IS a stroke: the
 * arc's length is the number.
 */

/**
 * The daily goal ring. The full circle is the goal, so the ring carries the
 * goal tier by construction: a Casual student's circle closes at 10 XP and an
 * Exam mode student's at 60, and both read "how much of today is done".
 *
 * The arc is drawn with stroke-dasharray on a circle rotated a quarter turn, so
 * it starts at twelve o'clock. dashoffset is transitioned in hud.css, which is
 * why XP landing mid session animates the arc rather than jumping it.
 */
export function XpRing({ fraction, met, className = "" }: { readonly fraction: number; readonly met: boolean; readonly className?: string }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg viewBox="0 0 32 32" className={`-rotate-90 ${className}`} aria-hidden focusable="false">
      <circle cx="16" cy="16" r={radius} fill="none" stroke="var(--hud-track)" strokeWidth="4.5" />
      <circle
        className="hud-ring-arc"
        cx="16"
        cy="16"
        r={radius}
        fill="none"
        stroke={met ? "var(--good)" : "var(--primary)"}
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - fraction)}
      />
    </svg>
  );
}

/**
 * The diamond. A brilliant cut seen from above: a table facet across the top,
 * the crown falling away to a point. The table is the lighter facet; the right
 * pavilion takes a dark wash so the stone has a lit side and a shaded side.
 */
export function DiamondMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d="M6.2 2.5h11.6L23 9.1 12 22 1 9.1z" fill="var(--diamond)" />
      <path d="M6.2 2.5h11.6L23 9.1H1z" fill="#ffffff" fillOpacity="0.34" />
      <path d="M12 22 23 9.1h-6.4z" fill="#000000" fillOpacity="0.16" />
      <path d="M9 4.6h6l1.4 4.5H7.6z" fill="#ffffff" fillOpacity="0.22" />
    </svg>
  );
}

/**
 * The streak flame. Two shapes: the body, and the inner tongue.
 *
 * BOTH SHAPES SURVIVE WHEN IT IS OUT, and that is a correction of the first
 * draft rather than a preference. Round one drew the unlit flame as the
 * silhouette alone, and in the capture it read as a raindrop: what identifies
 * fire at 22px is the two tone core, not the outline. So an unlit flame keeps
 * its tongue at 0.42 alpha of the same grey, which is a lighter core on a grey
 * body, and hud.css leans the whole thing slowly from the base so it reads as
 * guttering rather than as disabled.
 *
 * The silhouette itself is asymmetric on purpose: the tip leans, and the right
 * shoulder carries the small fold a flame makes as it curls. A symmetric
 * teardrop is a drop of water, whatever colour it is filled with.
 *
 * ECONOMY.md's whole mitigation set argues against rendering an unmet day as a
 * loss, so the unlit flame is still a flame and there is no red anywhere near
 * it.
 */
export function FlameMark({ lit, className = "" }: { readonly lit: boolean; readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        className="hud-flame-body"
        d="M12.6 1.2c-.4 2.9-2 4.3-3.4 5.6C7.2 8.6 4.8 11 4.8 15.2 4.8 19.1 8 22.2 12 22.2s7.2-3.1 7.2-7c0-2.8-1.2-4.7-2.6-6.2-.2 1.5-1 2.6-2.1 3 1-3.6-.6-8.2-1.9-10.8z"
        fill={lit ? "var(--streak)" : "var(--hud-out)"}
      />
      <path
        className="hud-flame-core"
        d="M12 10.4c1.9 1.9 3 3.4 3 5.1a3 3 0 0 1-6 0c0-1.6 1.1-3.2 3-5.1z"
        // Lighter than the body in BOTH states, because that is what a hot core
        // is. A first pass drew the unlit core in --hud-out at 0.42, which is
        // the body's own colour over the body: opaque grey on opaque grey, so
        // the flame lost its structure and the capture showed a raindrop. A
        // white wash lightens either theme's mid grey.
        fill={lit ? "var(--streak-core)" : "#ffffff"}
        fillOpacity={lit ? 1 : 0.42}
      />
    </svg>
  );
}
