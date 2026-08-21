/**
 * Leaderboards. Daily, weekly, monthly, global.
 *
 * Two rules from CLAUDE.md, both visible in the markup: standings are computed
 * server side from attempts, never client reported, and the privacy floor is a
 * chosen display name with nothing else reachable from a row.
 *
 * Phase 6 supplies the standings. This tab renders from a Standings value and
 * today the only value is the empty one, which it says out loud rather than
 * inventing rows. The local diamonds count is deliberately NOT shown here as a
 * rank: a client number on a leaderboard is the exact thing the rule forbids.
 */

import { useState } from "react";
import { Card, Pill } from "../../app/ui/Card";
import { useProgress } from "../../app/hooks";
import { progress } from "../../app/progress";

export type Window = "daily" | "weekly" | "monthly";

export interface StandingRow {
  readonly rank: number;
  readonly displayName: string;
  readonly score: number;
}

export interface Standings {
  readonly window: Window;
  readonly computedAt: string | null;
  readonly rows: readonly StandingRow[];
}

/** Phase 6 replaces this with a fetch of the server computed table. */
function standingsFor(window: Window): Standings {
  return { window, computedAt: null, rows: [] };
}

const WINDOWS: readonly { readonly id: Window; readonly label: string }[] = [
  { id: "daily", label: "Today" },
  { id: "weekly", label: "This week" },
  { id: "monthly", label: "This month" },
];

export default function LeaderboardsTab() {
  const [window, setWindow] = useState<Window>("daily");
  const snapshot = useProgress();
  const standings = standingsFor(window);
  const [draft, setDraft] = useState(snapshot.displayName ?? "");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 p-4 md:p-6">
      <div className="flex gap-2" role="tablist" aria-label="Leaderboard window">
        {WINDOWS.map((w) => (
          <button
            key={w.id}
            type="button"
            role="tab"
            aria-selected={window === w.id}
            onPointerDown={() => setWindow(w.id)}
            className={`press min-h-11 rounded-full px-4 text-scale-sm font-semibold ${
              window === w.id ? "bg-primary text-primary-foreground" : "border border-border bg-card text-foreground"
            }`}
          >
            {w.label}
          </button>
        ))}
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-scale-lg font-semibold">Global, {WINDOWS.find((w) => w.id === window)?.label.toLowerCase()}</h2>
          <Pill>Phase 6 data</Pill>
        </div>
        {standings.rows.length === 0 ? (
          <p className="mt-3 text-scale-sm text-muted-foreground">
            Standings are computed on the server from everyone&apos;s attempts, and that server
            arrives in Phase 6. Nothing here is made up in the meantime: the table is empty
            because there is no honest number to put in it yet.
          </p>
        ) : (
          <ol className="mt-3 divide-y divide-border">
            {standings.rows.map((row) => (
              <li key={row.rank} className="flex items-center justify-between py-2">
                <span className="font-semibold">
                  {row.rank}. {row.displayName}
                </span>
                <span className="text-muted-foreground">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      <Card>
        <h2 className="text-scale-base font-semibold">Your display name</h2>
        <p className="mt-1 text-scale-sm text-muted-foreground">
          Leaderboards show a name you choose, never your real one, and no profile is reachable
          from a row. Leave it blank to stay off the boards entirely.
        </p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            progress.setDisplayName(draft);
          }}
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.currentTarget.value)}
            maxLength={24}
            placeholder="e.g. carbocation_kid"
            aria-label="Display name"
            className="min-h-11 flex-1 rounded-[9px] border border-input bg-card px-3 text-scale-base"
          />
          <button type="submit" className="press min-h-11 rounded-[9px] bg-primary px-4 font-semibold text-primary-foreground">
            Save
          </button>
        </form>
        {snapshot.displayName === null ? (
          <p className="mt-2 text-scale-xs text-muted-foreground">You are opted out of leaderboards.</p>
        ) : (
          <p className="mt-2 text-scale-xs text-muted-foreground">Showing as {snapshot.displayName}.</p>
        )}
      </Card>
    </div>
  );
}
