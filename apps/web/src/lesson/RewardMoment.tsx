/**
 * The reward moment. Duolingo is the bar for exactly this screen and nothing
 * else, per CLAUDE.md: one large number for the session, a full bleed state
 * visually distinct from the working one, a badge that means something because
 * it was scarce. No streak loss framing anywhere. Returning is rewarded (the
 * return bonus in progress.ts shows up as its own line); leaving is never
 * punished.
 *
 * The number counts up with requestAnimationFrame over about 900 ms, a ref
 * holding the frame id. Under reduced motion the final number renders at once,
 * which is the representative frame.
 *
 * The berry plays `celebrate` on a perfect lesson and `bounce` otherwise:
 * events wire to behaviours, not moods.
 */

import { useEffect, useRef, useState } from "react";
import { Press } from "../app/ui/Press";
import { Berry } from "../mascot/Berry";

export interface RewardProps {
  readonly diamondsEarned: number;
  readonly correct: number;
  readonly attempted: number;
  readonly returning: boolean;
  readonly reducedMotion: boolean;
  readonly onContinue: () => void;
  readonly continueLabel?: string;
}

function useCountUp(target: number, reducedMotion: boolean): number {
  const [value, setValue] = useState(reducedMotion ? target : 0);
  const frameRef = useRef<number | null>(null);
  useEffect(() => {
    if (reducedMotion) {
      setValue(target);
      return;
    }
    const started = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / 900);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(target * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, reducedMotion]);
  return value;
}

export function RewardMoment({ diamondsEarned, correct, attempted, returning, reducedMotion, onContinue, continueLabel = "Continue" }: RewardProps) {
  const shown = useCountUp(diamondsEarned, reducedMotion);
  const perfect = attempted > 0 && correct === attempted;
  const badge = perfect ? "Clean sweep" : correct / Math.max(1, attempted) >= 0.75 ? "Strong" : null;

  return (
    <div className="reward-rise fixed inset-0 z-30 flex flex-col items-center justify-center gap-6 bg-gradient-to-b from-primary to-accent-to p-6 text-white" role="dialog" aria-modal="true" aria-label="Lesson complete">
      <Berry behaviour={perfect ? "celebrate" : "bounce"} mood="happy" reducedMotion={reducedMotion} sizePx={120} />
      <p className="text-scale-lg font-semibold opacity-90">Lesson complete</p>
      <div className="flex items-baseline gap-3">
        <span className="title-face text-[5rem] font-semibold leading-none tabular-nums">{shown}</span>
        <span className="text-scale-xl font-semibold opacity-90">diamonds</span>
      </div>
      <p className="text-scale-base opacity-90">
        {correct} of {attempted} right
        {returning ? ", plus a bonus for coming back" : ""}
      </p>
      {badge !== null ? (
        <span className="badge-pop rounded-full border-2 border-white/70 bg-white/15 px-5 py-2 text-scale-base font-bold tracking-wide">
          {badge}
        </span>
      ) : null}
      <Press variant="secondary" className="mt-4 min-w-48" onPointerDown={onContinue}>
        {continueLabel}
      </Press>
    </div>
  );
}
