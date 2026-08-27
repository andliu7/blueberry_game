/**
 * Turning a scheduler interval into the words on a rating button.
 *
 * scheduler.ts returns a number of DAYS, including fractions for the learning
 * steps: the Again step is ten minutes, which is 0.00694 days. Printing that
 * number is useless, so this file is the one place that decides how an
 * interval reads. It computes nothing about the schedule; it only renders a
 * number the scheduler already produced, which is why it lives beside the
 * surface rather than beside the policy.
 *
 * WHY THE BUTTONS CARRY THEIR INTERVALS AT ALL. This is the single most
 * useful thing Anki's review screen does and it costs one line of text: a
 * student pressing Good can see that the card goes away for eight days, so the
 * four buttons stop being a mood rating and start being a choice with a
 * consequence. It is also honesty about a system that is otherwise invisible.
 *
 * Rounding is deliberately coarse and never rounds DOWN to zero: an interval
 * under a minute still says "in a minute", because "in 0 minutes" reads as a
 * bug and the exact figure does not change anybody's press.
 */

const MINUTES_PER_DAY = 24 * 60;

/** "10 min", "1 day", "8 days", "3 weeks", "5 months". */
export function intervalLabel(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return "now";

  if (days < 1) {
    const minutes = Math.max(1, Math.round(days * MINUTES_PER_DAY));
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.round(minutes / 60);
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }

  const whole = Math.round(days);
  if (whole < 7) return whole === 1 ? "1 day" : `${whole} days`;
  if (whole < 31) {
    const weeks = Math.round(whole / 7);
    return weeks === 1 ? "1 week" : `${weeks} weeks`;
  }
  if (whole < 365) {
    const months = Math.round(whole / 30);
    return months === 1 ? "1 month" : `${months} months`;
  }
  const years = Math.round((whole / 365) * 10) / 10;
  return years === 1 ? "1 year" : `${years} years`;
}
