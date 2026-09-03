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
import { feedModel, type QuestModel } from "./feedModel";
import "./feed.css";

/* ------------------------------------------------------------- the glyphs -- */

/**
 * The newspaper, DESIGN-GOALS' own icon for this tab. Exported for the
 * integrator's tab bar; drawn like HudIcons.tsx, a filled silhouette with the
 * cut-outs in the card's colour so it is one component in both themes.
 */
export function NewspaperMark({ className = "" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path
        d="M4 4.5A1.5 1.5 0 0 1 5.5 3h11A1.5 1.5 0 0 1 18 4.5V19a2 2 0 0 0 2-2V7.5h1A1 1 0 0 1 22 8.5V18a3 3 0 0 1-3 3H5a3 3 0 0 1-3-3V4.5z"
        fill="currentColor"
      />
      <path d="M6 6h6v4H6zM14 6h2v1.6h-2zM14 8.4h2V10h-2zM6 12h10v1.6H6zM6 15h10v1.6H6z" fill="var(--card)" />
    </svg>
  );
}

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

/** The chest a quest bar runs into. Drawn state, not a payout: see feedModel. */
function ChestMark({ open }: { readonly open: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="feed-chest" data-open={open ? "true" : "false"} aria-hidden focusable="false">
      {/* Lid and base in two browns of one family; the latch is cut out in the
          card's colour so the shape is one component. */}
      <path d="M3 10V8.5A4.5 4.5 0 0 1 7.5 4h9A4.5 4.5 0 0 1 21 8.5V10z" fill="#7a4a1f" />
      <path d="M3 11h18v6.5A2.5 2.5 0 0 1 18.5 20h-13A2.5 2.5 0 0 1 3 17.5z" fill="#9a6428" />
      <rect x="10.4" y="8.6" width="3.2" height="5" rx="1.1" fill="var(--card)" />
      <rect x="11.2" y="9.4" width="1.6" height="3.4" rx="0.8" fill="#7a4a1f" />
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

/** The toast-a-flask cheer: a raised, tipped flask with the cheer's fizz. */
function ToastFlask() {
  return (
    <svg viewBox="0 0 24 24" className="feed-toast" aria-hidden focusable="false">
      <g transform="rotate(-18 12 14)">
        <path
          d="M10.8 6h2.4v3.8l3.9 6.5a1.5 1.5 0 0 1-1.3 2.2H8.2a1.5 1.5 0 0 1-1.3-2.2l3.9-6.5z"
          fill="var(--primary)"
        />
        <rect x="9.8" y="4.8" width="4.4" height="2" rx="1" fill="var(--primary)" />
      </g>
      <g fill="var(--streak-core)">
        <circle cx="18.5" cy="5" r="1.2" />
        <circle cx="21" cy="8" r="0.9" />
        <circle cx="17" cy="9.2" r="0.7" />
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
      className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6"
      data-feed-done={model.doneCount}
      data-feed-streak={model.snapshot.streak.todayCounted ? "true" : "false"}
    >
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
  );
}
