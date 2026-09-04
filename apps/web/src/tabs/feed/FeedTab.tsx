/**
 * The Feed tab. Two sections, per docs/DESIGN-GOALS.md ("Ours, not
 * Duolingo's") and the committed reference blueberry_r7-feed-v2_1788288479.png:
 *
 *   DAILY QUESTS   three rows, each led by a flask that FILLS as the quest
 *                  progresses, a green fill bar ending in a chest, and a
 *                  number beside the bar so the bar is never the only carrier
 *                  of the reading. Everything here derives from the LOCAL
 *                  journal through feedModel.ts; nothing is invented.
 *
 *   LAB MATES      other people's activity, which only a server can know. It
 *                  renders honestly not open, naming the Phase 6 server it
 *                  waits on, the same treatment LeaderboardsTab gives its
 *                  standings: the SHAPE is drawn (berry avatars in different
 *                  berry colours, the toast-a-flask cheer at the end of each
 *                  row) so the student sees what this becomes, and every row
 *                  says it is waiting rather than pretending to be a person.
 *
 * WHY THE QUEST BAR'S FILL IS THE GOAL GREEN. DESIGN-GOALS: light green is
 * the progress semantic everywhere, filled bars included, and it is FILL
 * ONLY. The fill here carries no text and no mark; the reading beside it is
 * the page's own ink on the card, and the track carries the boundary ring, so
 * the green is never the thing a reader has to resolve at a floor it fails.
 *
 * THE CLOCK. The model takes `now` as an argument (LOG.md: the clock is part
 * of the surface). This component reads it once per journal change, so a
 * finished lesson moves the bars on return to the tab, and no timer redraws a
 * static screen.
 *
 * No mascot on this tab. Bloom appears once per screen where he appears at
 * all (sticker rule 10), and the berry avatars here are deliberately OTHER
 * berries, drawn small and flat, never the imported mark.
 */

import { useId, useMemo } from "react";
import { Card, Pill } from "../../app/ui/Card";
import { useProgress } from "../../app/hooks";
import { FeedBackdrop } from "./FeedBackdrop";
import { feedModel, type QuestModel } from "./feedModel";
import "./feed.css";

/**
 * The tab-bar icon, re-exported so an older import of it from this module
 * still resolves. THE TAB BAR MUST NOT USE THIS ONE: importing it from here is
 * a static import of the lazy chunk, which a bundler answers by hoisting the
 * whole Feed into the initial payload. Import from "./FeedIcon" instead; that
 * file's header carries the reasoning.
 */
export { NewspaperMark } from "./FeedIcon";

/* ------------------------------------------------------------- the glyphs -- */

/**
 * The quest flask, filling as progress. The liquid is a rect clipped to the
 * flask's inner body, its height the quest's own fraction, so the icon and
 * the bar under it always agree: both are drawn from the same number.
 */
function QuestFlask({ fraction, hue }: { readonly fraction: number; readonly hue: string }) {
  const clip = useId();
  // The inner body the liquid can occupy: from under the neck (y 10) to the
  // floor (y 19.4). Empty draws nothing rather than a zero-height sliver.
  const top = 10;
  const bottom = 19.4;
  const level = bottom - fraction * (bottom - top);
  return (
    <svg viewBox="0 0 24 24" className="feed-flask" aria-hidden focusable="false">
      <defs>
        <clipPath id={clip}>
          <path d="M10.6 4.5h2.8v5.1l4.9 8.1a1.6 1.6 0 0 1-1.4 2.4H7.1a1.6 1.6 0 0 1-1.4-2.4l4.9-8.1z" />
        </clipPath>
      </defs>
      {/* The vessel: outlined, per sticker rule 3. */}
      <path
        d="M10.6 4.5h2.8v5.1l4.9 8.1a1.6 1.6 0 0 1-1.4 2.4H7.1a1.6 1.6 0 0 1-1.4-2.4l4.9-8.1z"
        fill="var(--card)"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      {/* The lip. */}
      <rect x="9.4" y="3" width="5.2" height="2.4" rx="1.2" fill="currentColor" />
      {fraction > 0 ? (
        <g clipPath={`url(#${clip})`}>
          <rect x="3" y={level} width="18" height={bottom - level + 1} fill={hue} />
          {/* One lighter facet on the surface, the house volume cue. */}
          <rect x="3" y={level} width="18" height="1.1" fill="#ffffff" fillOpacity="0.45" />
        </g>
      ) : null}
    </svg>
  );
}

/**
 * The chest a quest bar runs into. Drawn state, not a payout: see feedModel.
 *
 * GOLD WITH A DARK OUTLINE, which is what the committed image draws and what
 * the first pass got wrong: two flat browns read as a crate. The three hexes
 * below are ILLUSTRATION colours, the same category as the mascot's frozen
 * palette in MASCOT_PALETTE, not theme chrome: this object is a picture of a
 * treasure chest and gold is the only thing it can be made of. Nothing here
 * carries text, so nothing here is a contrast pair; the outline is what makes
 * the shape legible on either theme's card, which is why it is drawn rather
 * than implied.
 */
const CHEST_GOLD = "#f2b632";
const CHEST_GOLD_DEEP = "#d18f16";
const CHEST_OUTLINE = "#5f3c12";

function ChestMark({ open }: { readonly open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="feed-chest" data-open={open ? "true" : "false"} aria-hidden focusable="false">
      <g stroke={CHEST_OUTLINE} strokeWidth="1.5" strokeLinejoin="round">
        {/* The lid, a half round; the base under it; one band across the seam. */}
        <path d="M3.4 10.4V9A4.6 4.6 0 0 1 8 4.4h8A4.6 4.6 0 0 1 20.6 9v1.4z" fill={CHEST_GOLD} />
        <path d="M3.4 11.6h17.2v5.6a2.4 2.4 0 0 1-2.4 2.4H5.8a2.4 2.4 0 0 1-2.4-2.4z" fill={CHEST_GOLD} />
        <path d="M3.4 10.4h17.2v1.2H3.4z" fill={CHEST_GOLD_DEEP} />
      </g>
      {/* The latch, cut out in the card's colour so the shape is one component
          in both themes, with the keyhole punched through it. */}
      <rect x="10.2" y="8.8" width="3.6" height="5.4" rx="1.2" fill="var(--card)" stroke={CHEST_OUTLINE} strokeWidth="1.3" />
      <circle cx="12" cy="11.5" r="0.85" fill={CHEST_OUTLINE} />
    </svg>
  );
}

/** Three lab-mate berries, three berry colours, none of them the mascot. */
function BlueberryAvatar() {
  return (
    <svg viewBox="0 0 32 32" className="feed-avatar" aria-hidden focusable="false">
      <circle cx="16" cy="17" r="12" fill="#3d63f5" />
      <path d="M16 3.2 18 6.4h-4z M12.2 4.6l1.4 3-2.8.8z M19.8 4.6l1.4 3.8-2.8-.8z" fill="#2b2fb0" />
      <circle cx="12" cy="14" r="3" fill="#ffffff" fillOpacity="0.35" />
    </svg>
  );
}

function RaspberryAvatar() {
  return (
    <svg viewBox="0 0 32 32" className="feed-avatar" aria-hidden focusable="false">
      <path d="M14 4h4v4h-4z" fill="#43a047" />
      <g fill="#d23a68">
        <circle cx="11" cy="12" r="4.4" />
        <circle cx="21" cy="12" r="4.4" />
        <circle cx="8.5" cy="18.5" r="4.4" />
        <circle cx="16" cy="17" r="4.8" />
        <circle cx="23.5" cy="18.5" r="4.4" />
        <circle cx="12" cy="24" r="4.4" />
        <circle cx="20" cy="24" r="4.4" />
      </g>
      <circle cx="11" cy="12" r="1.4" fill="#ffffff" fillOpacity="0.4" />
    </svg>
  );
}

function BlackberryAvatar() {
  return (
    <svg viewBox="0 0 32 32" className="feed-avatar" aria-hidden focusable="false">
      <path d="M14 4h4v4h-4z" fill="#43a047" />
      <g fill="#4a2a6b">
        <circle cx="11" cy="12" r="4.4" />
        <circle cx="21" cy="12" r="4.4" />
        <circle cx="8.5" cy="18.5" r="4.4" />
        <circle cx="16" cy="17" r="4.8" />
        <circle cx="23.5" cy="18.5" r="4.4" />
        <circle cx="12" cy="24" r="4.4" />
        <circle cx="20" cy="24" r="4.4" />
      </g>
      <circle cx="11" cy="12" r="1.4" fill="#ffffff" fillOpacity="0.35" />
    </svg>
  );
}

/**
 * The toast-a-flask cheer: a raised, tipped flask with the cheer's fizz.
 *
 * IT IS THE QUEST FLASK, TIPPED, and that is the point rather than an economy
 * of drawing: the committed reference draws one piece of glassware in this
 * product and uses it twice on this screen, held upright to show a quest
 * filling and raised at an angle to cheer. Same outlined vessel, same violet
 * liquid, same lip; the rotation and the radiating cheer strokes are the whole
 * difference. A second, differently drawn flask beside the first is how a
 * vocabulary stops being one.
 *
 * THE FIZZ IS STROKES, NOT DOTS. The reference draws short lines radiating off
 * the flask's shoulder, which is the comic-book mark for a thing being raised;
 * three dots beside it read as bubbles escaping, which is the opposite motion.
 */
function ToastFlask() {
  return (
    <svg viewBox="0 0 24 24" className="feed-toast" aria-hidden focusable="false">
      <g transform="rotate(20 12 15)">
        {/* The vessel, outlined in the row's own ink so it reads on either
            theme's card, with the liquid clipped inside it by construction:
            the body is drawn twice, once filled violet and once as the
            outline over it, so no clip path and no id are needed. */}
        <path
          d="M10.4 5.4h3.2v4.6l4.4 7.3a1.5 1.5 0 0 1-1.3 2.3H7.3a1.5 1.5 0 0 1-1.3-2.3l4.4-7.3z"
          fill="var(--primary)"
        />
        <path
          d="M10.4 5.4h3.2v4.6l4.4 7.3a1.5 1.5 0 0 1-1.3 2.3H7.3a1.5 1.5 0 0 1-1.3-2.3l4.4-7.3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <rect x="9.2" y="3.9" width="5.6" height="2.2" rx="1.1" fill="currentColor" />
      </g>
      {/* The cheer. Three short strokes off the raised shoulder, in the
          streak family's warm core, which is the product's one celebratory
          hue and is already what a lit flame is drawn in. */}
      <g stroke="var(--streak-core)" strokeWidth="1.7" strokeLinecap="round">
        <path d="M18.6 4.4 20.6 2.6M20.4 7.6 22.6 6.6M17.4 8.2 18.6 6.6" />
      </g>
    </svg>
  );
}

/* --------------------------------------------------------------- the rows -- */

/** The liquid each quest's flask holds. Its own system's hue, per theme.css:
 *  XP is purple, the streak is the flame's orange, answers are the sky the
 *  diamond family owns. The BAR under all three stays the one progress green. */
const QUEST_HUE: Readonly<Record<QuestModel["id"], string>> = {
  "earn-xp": "var(--primary)",
  "keep-streak": "var(--streak)",
  "get-right": "var(--diamond)",
};

function QuestRow({ quest }: { readonly quest: QuestModel }) {
  return (
    <li
      className="feed-quest"
      data-quest={quest.id}
      data-done={quest.done ? "true" : "false"}
      aria-label={`${quest.label}: ${quest.reading}${quest.done ? ", done" : ""}`}
    >
      <span className="feed-quest-flask" aria-hidden>
        <QuestFlask fraction={quest.fraction} hue={QUEST_HUE[quest.id]} />
      </span>
      <div className="feed-quest-body">
        <div className="feed-quest-top">
          <span className="feed-quest-label">{quest.label}</span>
          <span className="feed-quest-reading">{quest.reading}</span>
        </div>
        <div className="feed-quest-track" aria-hidden>
          <span className="feed-quest-fill" style={{ width: `${Math.round(quest.fraction * 100)}%` }} />
          <ChestMark open={quest.done} />
        </div>
      </div>
    </li>
  );
}

const LAB_MATE_SHAPES = [
  { key: "blueberry", Avatar: BlueberryAvatar, width: "9rem" },
  { key: "raspberry", Avatar: RaspberryAvatar, width: "11rem" },
  { key: "blackberry", Avatar: BlackberryAvatar, width: "8rem" },
] as const;

/* ---------------------------------------------------------------- the tab -- */

export default function FeedTab() {
  const snapshot = useProgress();
  // Re-read the clock when the journal moves, not on a timer: the bars are
  // day totals, and the one thing that changes them mid visit is an event.
  const model = useMemo(() => feedModel(snapshot.journal, new Date().toISOString()), [snapshot.journal]);

  return (
    <div
      className="feed-page"
      data-feed-done={model.doneCount}
      data-feed-streak={model.snapshot.streak.todayCounted ? "true" : "false"}
    >
      {/* The composed ground, per BACKGROUND DOCTRINE and the committed
          reference. Behind everything, decorative, and placed by a table
          rather than scattered (backdropProps.ts). */}
      <FeedBackdrop />
      <div className="feed-column mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
        <section aria-label={`Daily quests, ${model.doneCount} of ${model.quests.length} done`}>
          <h2 className="text-scale-lg font-bold">Daily Quests</h2>
          <p className="mt-0.5 text-scale-xs text-muted-foreground">
            Fresh each day, filled by whatever you play.
          </p>
          <ul className="mt-3 flex flex-col gap-2.5">
            {model.quests.map((quest) => (
              <QuestRow key={quest.id} quest={quest} />
            ))}
          </ul>
        </section>

        <section aria-label="Lab mates">
          <h2 className="text-scale-lg font-bold">Lab mates</h2>
          <Card className="mt-3">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="text-scale-base font-semibold leading-tight">Your lab, cheering</h3>
                <p className="text-scale-xs text-muted-foreground">Friends&apos; clears and unlocks land here</p>
              </div>
              <Pill>Phase 6 data</Pill>
            </div>
            {/* The section's SHAPE, with no invented people in it: berry avatar,
                name, what they did, and the toast-a-flask cheer on the row's
                end. Same honesty device as LeaderboardsTab's placeholder rows. */}
            <ol className="mt-3 divide-y divide-border" aria-hidden>
              {LAB_MATE_SHAPES.map(({ key, Avatar, width }) => (
                <li key={key} className="flex items-center gap-3 py-2.5">
                  <Avatar />
                  <span className="skeleton h-4 flex-1 rounded-full" style={{ maxWidth: width }} />
                  {/* No seat, no ring. The reference draws the cheer as a bare
                      raised flask at the row's end; an outlined circle round it
                      would be chrome invented for a control that is not open
                      yet, and a 44 px target drawn on something unpressable is
                      a promise the screen cannot keep. */}
                  <span className="feed-toast-seat">
                    <ToastFlask />
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-scale-sm text-muted-foreground">
              Lab mates are other students, and other students live on the friends server, which
              arrives in Phase 6. Nothing here is made up in the meantime: these rows are the shape
              this takes, and the tipped flask is how you will toast a lab mate&apos;s clear.
            </p>
          </Card>
        </section>
      </div>
    </div>
  );
}
