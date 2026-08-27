/**
 * The reward moment. Duolingo is the bar for exactly this screen and nothing
 * else, per CLAUDE.md: one large number for the session, a full bleed state
 * visually distinct from the working one, a badge that means something because
 * it was scarce. No streak loss framing anywhere.
 *
 * WHAT THIS ANIMATES. The economy RECEIPT and nothing else. docs/ECONOMY.md,
 * Anti-abuse: "The client animates what the server concluded. The reward
 * moment plays from the server's receipt, never from local math." So every
 * number on this screen is a line from `Receipt` (packages/economy/derive.ts)
 * or a sum of its lines, and the only local facts are the session's own
 * tally (right, attempted, elapsed), which are a stopwatch and a count and
 * were never an entitlement.
 *
 * HOW THE SEQUENCE IS ORCHESTRATED. One clock, `useStageClock`, gives the
 * elapsed milliseconds since the screen appeared. Every beat below is a start
 * time on that clock and every count-up is a pure function of it, so there is
 * one requestAnimationFrame loop and one place a tap can skip to the end:
 * setting the clock to END renders the final frame, which is also what
 * reduced motion renders at once. Nothing here chains setTimeouts.
 *
 *   0        Bloom in cheer + celebrate, the burst, "Lesson complete", the
 *            XP number on screen at 0 the way the bar's card is
 *   200      the XP number counts up, its receipt lines landing beneath
 *   900      the diamond falls, Bloom catches it, it socks to the counter
 *   1900     the streak lights if today counted, milestone card at 7/14/30
 *   2020     the stats row counts up: XP, accuracy, time
 *   2500     done. The first diamond a student ever earns gets a slower fall
 *            and a held beat with a caption, paid for out of the pause before
 *            the streak, because scarcity of ceremony is what keeps it
 *            meaningful and the end still has to land at 2500.
 *
 * WHY THE LAYOUT IS AS TIGHT AS IT IS. The whole moment has to fit a 390 by
 * 844 phone with the Continue button on screen at every frame: a reward the
 * student has to scroll to is not a moment. So the receipt's XP lines are a
 * chip row under the number rather than a list, the diamond and streak cards
 * share one row, and the stats row is the bar's three small cards. The middle
 * column still scrolls as a safety net, because a 365 day milestone card plus
 * a rest day caption is more than one phone screen, and clipping is worse
 * than scrolling.
 *
 * Bloom's states are the MASCOT.md progression rows: lesson complete is
 * cheer + celebrate, the diamond catch is cheer + celebrate replayed, the
 * streak lighting is excited + bounce. Nothing new is invented for the face.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { Receipt, ReceiptLine } from "@blueberry/economy";
import { Press } from "../app/ui/Press";
import { Berry } from "../mascot/Berry";
import type { BerryBehaviour } from "../mascot/berryBehaviour";
import type { BerryMood } from "../mascot/berryMood";

export interface RewardProps {
  readonly receipt: Receipt;
  /** Diamond balance after the receipt was applied. Derived by the store, never summed here. */
  readonly diamondBalance: number;
  /** True when the student had never earned a diamond before this receipt. */
  readonly firstDiamond: boolean;
  readonly correct: number;
  readonly attempted: number;
  readonly elapsedMs: number;
  readonly reducedMotion: boolean;
  readonly onContinue: () => void;
  readonly continueLabel?: string;
}

/** Streak lengths that earn a milestone card. ECONOMY.md, Streak, Milestones. */
const MILESTONE_CARD = new Set([7, 14, 30, 60, 100, 180, 365]);

/**
 * The receipt labels the engine writes for a no-wrong-arrow clear
 * (packages/economy/src/derive.ts). The badge keys off the receipt, not off
 * the session tally, because the engine is the one that decided it counted.
 */
const FLAWLESS_LABELS = new Set(["Flawless", "Flawless quiz"]);

interface Beats {
  readonly xpCard: number;
  readonly xpCountStart: number;
  readonly xpCountEnd: number;
  readonly lineFirst: number;
  readonly lineStep: number;
  readonly diamondCard: number;
  readonly fallStart: number;
  readonly fallEnd: number;
  readonly flyStart: number;
  readonly flyEnd: number;
  readonly diamondCountStart: number;
  readonly diamondCountEnd: number;
  readonly streak: number;
  readonly milestone: number;
  readonly stats: number;
  readonly statsCountEnd: number;
  readonly end: number;
}

function beatsFor(firstDiamond: boolean): Beats {
  // Everything ends at 2500 in both versions. The long first-diamond version
  // spends its extra time inside the catch (a slower fall, a held beat with
  // the caption) and takes it back from the pause before the streak, so the
  // 2500 ms frame is the finished screen either way.
  const fallStart = 900;
  const fallEnd = fallStart + 300 + (firstDiamond ? 220 : 0);
  const flyStart = fallEnd + 150 + (firstDiamond ? 130 : 0);
  const flyEnd = flyStart + 320;
  const streak = Math.max(1900, flyEnd);
  return {
    xpCard: 0,
    xpCountStart: 200,
    xpCountEnd: 850,
    lineFirst: 450,
    lineStep: 150,
    diamondCard: 950,
    fallStart,
    fallEnd,
    flyStart,
    flyEnd,
    diamondCountStart: flyStart + 100,
    diamondCountEnd: flyEnd + 150,
    streak,
    milestone: streak + 80,
    stats: streak + 120,
    statsCountEnd: 2400,
    end: 2500,
  };
}

/**
 * Elapsed milliseconds since mount, on one requestAnimationFrame loop, until
 * `end`. `skip` jumps to the end. Reduced motion starts at the end.
 */
function useStageClock(end: number, reducedMotion: boolean, skipped: boolean): number {
  const [elapsed, setElapsed] = useState(reducedMotion ? end : 0);
  const frame = useRef<number | null>(null);
  useEffect(() => {
    if (reducedMotion || skipped) {
      setElapsed(end);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(end, now - started);
      setElapsed(t);
      if (t < end) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [end, reducedMotion, skipped]);
  return elapsed;
}

/** 0 to 1, eased out, of where `now` sits between `from` and `to`. */
function progressAt(now: number, from: number, to: number): number {
  if (now <= from) return 0;
  if (now >= to) return 1;
  const t = (now - from) / (to - from);
  return 1 - Math.pow(1 - t, 3);
}

function sum(lines: readonly ReceiptLine[]): number {
  return lines.reduce((total, line) => total + line.amount, 0);
}

function formatTime(ms: number): string {
  const seconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

/** The burst: twenty CSS particles on token colours. No engine, no canvas. */
const BURST = Array.from({ length: 20 }, (_, i) => {
  const angle = (i / 20) * Math.PI * 2 + (i % 2 === 0 ? 0.12 : -0.08);
  const distance = 120 + (i % 3) * 42;
  return {
    dx: Math.round(Math.cos(angle) * distance),
    dy: Math.round(Math.sin(angle) * distance * 0.75) - 40,
    delay: (i % 5) * 35,
    tone: ["primary", "warn", "good", "diamond"][i % 4] as "primary" | "warn" | "good" | "diamond",
    shape: i % 3 === 0 ? "round" : "bar",
  };
});

function Burst({ reducedMotion }: { readonly reducedMotion: boolean }) {
  if (reducedMotion) return null;
  return (
    <div className="reward-burst pointer-events-none absolute inset-0" aria-hidden>
      {BURST.map((piece, i) => (
        <span
          key={i}
          className={`reward-spark reward-spark--${piece.tone} reward-spark--${piece.shape}`}
          style={{ "--dx": `${piece.dx}px`, "--dy": `${piece.dy}px`, "--delay": `${piece.delay}ms` } as CSSProperties}
        />
      ))}
    </div>
  );
}

function DiamondIcon({ className = "h-6 w-6" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M5 3h14l4 6-11 12L1 9z" fill="var(--diamond)" />
      <path d="M5 3l7 18L1 9z" fill="var(--reward-shine)" />
      <path d="M9 9h6l-3 8z" fill="var(--reward-shine)" />
    </svg>
  );
}

function BoltIcon({ className = "h-6 w-6" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill="var(--warn)" />
    </svg>
  );
}

function TargetIcon({ className = "h-6 w-6" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--good)" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="4.5" fill="none" stroke="var(--good)" strokeWidth="2.5" />
      <circle cx="12" cy="12" r="1.5" fill="var(--good)" />
    </svg>
  );
}

function ClockIcon({ className = "h-6 w-6" }: { readonly className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="var(--primary-ink)" strokeWidth="2.5" />
      <path d="M12 7v5l3.5 2.5" fill="none" stroke="var(--primary-ink)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** The flame, scaled to the streak: taller and fuller the longer it has burned. */
function Flame({ streak, lit, base = 30 }: { readonly streak: number; readonly lit: boolean; readonly base?: number }) {
  const size = base + Math.min(streak, 30) * 0.9;
  return (
    <svg
      viewBox="0 0 24 28"
      className="reward-flame shrink-0"
      style={{ width: size, height: size * 1.15 }}
      data-lit={lit ? "true" : "false"}
      aria-hidden
    >
      <path
        className="reward-flame__outer"
        d="M12 1c1 5 6 7 6 14a6 6 0 0 1-12 0c0-3 1.5-4.5 2.5-6.5C9 10.5 10 12 11 13c1-3 .5-8 1-12z"
      />
      <path className="reward-flame__inner" d="M12 15c.6 2.4 2.5 3.2 2.5 5.5a2.5 2.5 0 0 1-5 0c0-2 1.6-2.9 2.5-5.5z" />
    </svg>
  );
}

const MILESTONE_LINE: Readonly<Record<number, string>> = {
  7: "A whole week. That is a habit now.",
  14: "Two weeks straight. Most people never get here.",
  30: "Thirty days. Bloom has something for you.",
  60: "Sixty days. Exam prep does not get steadier than this.",
  100: "One hundred days. Say it out loud.",
  180: "Half a year of chemistry. Every day.",
  365: "A year. There is nothing above this.",
};

export function RewardMoment({
  receipt,
  diamondBalance,
  firstDiamond,
  correct,
  attempted,
  elapsedMs,
  reducedMotion,
  onContinue,
  continueLabel = "Continue",
}: RewardProps) {
  const beats = useMemo(() => beatsFor(firstDiamond), [firstDiamond]);
  const [skipped, setSkipped] = useState(false);
  const now = useStageClock(beats.end, reducedMotion, skipped);

  const xpTotal = sum(receipt.xp);
  const diamondTotal = sum(receipt.diamonds);
  const flawless = receipt.xp.some((line) => FLAWLESS_LABELS.has(line.label));
  const accuracy = attempted === 0 ? 0 : Math.round((correct / attempted) * 100);
  const streakOn = receipt.streak.counted && receipt.streak.current > 0;
  const milestone =
    receipt.streak.milestone !== undefined && MILESTONE_CARD.has(receipt.streak.milestone) ? receipt.streak.milestone : null;
  const done = now >= beats.end;

  // Counts. Each is the receipt's number scaled by where the clock sits.
  const xpShown = Math.round(xpTotal * progressAt(now, beats.xpCountStart, beats.xpCountEnd));
  const diamondsShown = Math.round(diamondTotal * progressAt(now, beats.diamondCountStart, beats.diamondCountEnd));
  const balanceShown = diamondBalance - diamondTotal + diamondsShown;
  const diamondsCounting = now >= beats.diamondCountStart && now < beats.diamondCountEnd;
  const statsT = progressAt(now, beats.stats, beats.statsCountEnd);
  const accuracyShown = Math.round(accuracy * statsT);
  const timeShown = Math.round(elapsedMs * statsT);

  // Where the diamond is in its arc. The fly target is the counter in the
  // stage's own header, measured once the fly beat arrives.
  const catchStage: "waiting" | "falling" | "held" | "flying" | "landed" =
    now < beats.fallStart ? "waiting" : now < beats.fallEnd ? "falling" : now < beats.flyStart ? "held" : now < beats.flyEnd ? "flying" : "landed";
  const diamondRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const [fly, setFly] = useState<{ dx: number; dy: number } | null>(null);
  useEffect(() => {
    if (catchStage !== "flying" || fly !== null) return;
    const from = diamondRef.current?.getBoundingClientRect();
    const to = counterRef.current?.getBoundingClientRect();
    if (from === undefined || to === undefined) {
      setFly({ dx: 0, dy: -240 });
      return;
    }
    setFly({ dx: to.left + to.width / 2 - (from.left + from.width / 2), dy: to.top + to.height / 2 - (from.top + from.height / 2) });
  }, [catchStage, fly]);

  // Bloom. Cheer and celebrate for the arrival, replayed on the catch, and
  // excited plus bounce when the streak lights.
  const berry = useMemo((): { mood: BerryMood; behaviour: BerryBehaviour; key: number; sparkle: number } => {
    if (streakOn && now >= beats.streak) return { mood: "excited", behaviour: "bounce", key: 3, sparkle: 3 };
    if (now >= beats.fallEnd) return { mood: "cheer", behaviour: "celebrate", key: 2, sparkle: 2 };
    return { mood: "cheer", behaviour: "celebrate", key: 1, sparkle: 0 };
  }, [now, beats, streakOn]);

  const show = (at: number) => now >= at;
  const revealClass = (at: number) => (show(at) ? "reward-reveal" : "reward-hidden");
  const accuracyBand = accuracy === 100 ? "Perfect" : accuracy >= 75 ? "Strong" : "Accuracy";

  return (
    <div
      className="reward-stage fixed inset-0 z-30 flex flex-col overflow-hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Lesson complete"
      data-reward={done ? "done" : "playing"}
      data-reward-first={firstDiamond ? "true" : "false"}
      data-reward-diamonds={diamondTotal}
      data-reward-rank-up={receipt.mastery.rankUp ?? ""}
      onPointerDown={() => {
        if (!done) setSkipped(true);
      }}
    >
      <div className="reward-glow pointer-events-none absolute inset-x-0 top-0 h-[58vh]" aria-hidden />

      {/* The stage's own counter, so the diamond has somewhere to go that is on screen. */}
      <header className="relative mx-auto flex w-full max-w-2xl shrink-0 items-center justify-end px-4 pt-3 md:px-6 md:pt-5">
        <div
          ref={counterRef}
          className="reward-counter inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-card px-3 text-scale-sm font-bold text-foreground tabular-nums"
          data-landed={catchStage === "landed" ? "true" : "false"}
          aria-label={`${diamondBalance} diamonds`}
        >
          <DiamondIcon className="h-4 w-4" />
          {balanceShown}
        </div>
      </header>

      {/* min-h-0 lets this column shrink inside the flex parent so Continue
          never leaves the screen; overflow-y-auto is the safety net named in
          the header. justify-center spends spare desktop height as air above
          and below rather than as a gap before the button. */}
      <div className="relative mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-4 md:px-6">
        {/* Bloom, the burst, and the diamond that falls into its arms. */}
        <div className="relative flex shrink-0 flex-col items-center">
          <Burst reducedMotion={reducedMotion} />
          <div
            ref={diamondRef}
            className="reward-diamond absolute left-1/2 top-0 z-10"
            data-stage={catchStage}
            style={fly !== null ? ({ "--fly-dx": `${fly.dx}px`, "--fly-dy": `${fly.dy}px` } as CSSProperties) : undefined}
            aria-hidden
          >
            <DiamondIcon className="h-10 w-10 md:h-12 md:w-12" />
          </div>
          <Berry
            mood={berry.mood}
            behaviour={berry.behaviour}
            behaviourKey={berry.key}
            sparkleKey={berry.sparkle}
            reducedMotion={reducedMotion}
            sizePx={128}
          />
          {firstDiamond && (catchStage === "held" || catchStage === "flying") ? (
            <p className="reward-reveal absolute -bottom-2 whitespace-nowrap rounded-full bg-card px-3 py-1 text-scale-xs font-bold uppercase tracking-[0.18em] text-diamond-ink shadow-sm">
              Your first diamond
            </p>
          ) : null}
        </div>

        <h2 className="reward-headline title-face mt-3 text-center text-scale-2xl font-semibold leading-none text-primary-ink md:text-scale-display">
          Lesson complete
        </h2>
        {flawless ? (
          <span className={`${show(beats.lineFirst) ? "reward-pop" : "reward-hidden"} reward-badge mt-2 rounded-full px-3 py-1 text-scale-xs font-bold uppercase tracking-[0.16em]`}>
            Flawless
          </span>
        ) : (
          <p className="mt-1.5 text-scale-sm font-medium text-muted-foreground">
            {correct} of {attempted} right
          </p>
        )}

        {/* The one large number: XP, the effort number. Its receipt lines sit
            beneath as a chip row, one per line, each landing on its own beat. */}
        <section className={`${revealClass(beats.xpCard)} mt-2 flex w-full max-w-md flex-col items-center`} aria-label="XP earned">
          <div className="flex items-end justify-center gap-1.5">
            <span className="reward-xp title-face font-semibold leading-none text-warn-ink tabular-nums">{xpShown}</span>
            <span className="mb-2 text-scale-lg font-bold text-warn-ink">XP</span>
          </div>
          <ul className="mt-2 flex flex-wrap items-center justify-center gap-1.5" aria-label="How it adds up">
            {receipt.xp.map((line, i) => (
              <li
                key={`${line.label}-${i}`}
                className={`${revealClass(beats.lineFirst + i * beats.lineStep)} reward-line inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-scale-xs`}
              >
                <span className="font-medium text-foreground">{line.label}</span>
                <span className="font-bold text-warn-ink tabular-nums">+{line.amount}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* The second card and the streak, side by side. Without a streak the
            diamond card takes the whole row, the way the bar's single card does. */}
        <div className={`mt-3 grid w-full max-w-md gap-2 md:gap-3 ${streakOn ? "grid-cols-2" : "grid-cols-1"}`}>
          <section className={`${revealClass(beats.diamondCard)} reward-card reward-card--diamond`} aria-label="Diamonds earned">
            <div className="reward-card__band">Diamonds</div>
            <div className="reward-card__body">
              <DiamondIcon className="h-6 w-6" />
              <span className={`text-scale-xl font-bold text-diamond-ink tabular-nums ${diamondsCounting ? "reward-shine" : ""}`}>
                +{diamondsShown}
              </span>
            </div>
            {receipt.diamonds.length > 0 ? (
              <p className="px-2 pb-1.5 text-center text-scale-xs leading-snug text-muted-foreground">
                {receipt.diamonds.map((line) => `${line.label} +${line.amount}`).join(" · ")}
              </p>
            ) : null}
          </section>

          {streakOn ? (
            <section className={`${revealClass(beats.streak)} reward-card reward-card--streak`} aria-label="Streak">
              <div className="reward-card__band">{receipt.streak.current === 1 ? "Streak started" : "Streak"}</div>
              <div className="reward-card__body">
                <Flame streak={receipt.streak.current} lit={show(beats.streak)} />
                <span className="flex items-baseline gap-1 leading-none">
                  <span className="text-scale-xl font-bold text-warn-ink tabular-nums">{receipt.streak.current}</span>
                  <span className="text-scale-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {receipt.streak.current === 1 ? "day" : "days"}
                  </span>
                </span>
              </div>
              {receipt.streak.savedBy !== undefined ? (
                <p className="px-2 pb-1.5 text-center text-scale-xs leading-snug text-muted-foreground">
                  {receipt.streak.savedBy === "rest_day" ? "A rest day held it. Streak safe." : "A freeze held it. Streak safe."}
                </p>
              ) : null}
            </section>
          ) : null}
        </div>

        {milestone !== null ? (
          <section
            className={`${show(beats.milestone) ? "reward-pop" : "reward-hidden"} reward-milestone mt-2 flex w-full max-w-md items-center gap-3 rounded-2xl px-4 py-2.5`}
            aria-label={`${milestone} day streak milestone`}
          >
            <Flame streak={milestone} lit base={26} />
            <div className="flex min-w-0 flex-col">
              <span className="text-scale-xs font-bold uppercase tracking-[0.16em] text-warn-ink">{milestone} day milestone</span>
              <span className="text-scale-sm font-medium leading-snug text-foreground">{MILESTONE_LINE[milestone] ?? "Another milestone lit."}</span>
            </div>
          </section>
        ) : null}

        {/* The stats row, the way the bar does it: three cards, each an icon and a count-up. */}
        <div className={`${revealClass(beats.stats)} mt-2 grid w-full max-w-md grid-cols-3 gap-2 md:mt-3 md:gap-3`} role="list" aria-label="Session stats">
          <div className="reward-card reward-card--xp" role="listitem">
            <div className="reward-card__band">XP</div>
            <div className="reward-card__body reward-card__body--stat">
              <BoltIcon className="h-5 w-5" />
              <span className="text-scale-lg font-bold text-warn-ink tabular-nums">{Math.round(xpTotal * statsT)}</span>
            </div>
          </div>
          <div className="reward-card reward-card--good" role="listitem">
            <div className="reward-card__band">{accuracyBand}</div>
            <div className="reward-card__body reward-card__body--stat">
              <TargetIcon className="h-5 w-5" />
              <span className="text-scale-lg font-bold text-good-ink tabular-nums">{accuracyShown}%</span>
            </div>
          </div>
          <div className="reward-card reward-card--time" role="listitem">
            <div className="reward-card__band">Time</div>
            <div className="reward-card__body reward-card__body--stat">
              <ClockIcon className="h-5 w-5" />
              <span className="text-scale-lg font-bold text-primary-ink tabular-nums">{formatTime(timeShown)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-2xl shrink-0 p-4 pb-safe md:p-6">
        <Press
          onPointerDown={(event) => {
            event.stopPropagation();
            onContinue();
          }}
          className="w-full"
        >
          {continueLabel}
        </Press>
      </div>
    </div>
  );
}
