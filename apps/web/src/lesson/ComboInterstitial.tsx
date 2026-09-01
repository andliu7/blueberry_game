/**
 * The combo interstitial: a full screen beat between two problems when the
 * student has hit 3, 5 or 8 correct in a row.
 *
 * The bar's shape, which is what a critic compares against: the lesson stops,
 * the character rises from the bottom edge, one line in a speech bubble
 * beside it, a Continue that acknowledges on pointer down. The header keeps
 * the lesson's progress bar so the student still knows where they are.
 *
 * Three rules from the round 2 verdict, each of which this file answers:
 *
 * 1. The stage owns the viewport from its FIRST frame. Round 1 faded the whole
 *    stage in over 200 ms, so the 0 ms frame was the dimmed lesson showing
 *    through an almost transparent ground, with "Leave" and "Finish lesson"
 *    ghosting under the mascot. The ground is now opaque with no opacity
 *    animation at all; only the things ON the ground move (the count pops,
 *    the berry rises, the bubble follows).
 * 2. The run count is the largest element on screen. It sits at the centre in
 *    the display face, the same treatment RewardMoment gives the session
 *    number, because a run of three is the smaller sibling of that moment.
 * 3. The vertical space is used. Header, then the count with its milestone
 *    track (3, 5, 8 with the ones reached lit, so the number says where it
 *    sits in the escalation), then the character and its line, then Continue.
 *    The count block and the character block each take half of what is left
 *    (both flex-1), so on a phone the character is centred in the lower half
 *    rather than pinned to the footer with a void above it.
 *
 * And one thing the probe of this round showed: the rise is CLIPPED. The
 * character row hides overflow, so at 0 ms the berry is emerging from the
 * row's bottom edge, the way the bar's character rises from the footer rule,
 * instead of being painted over the Continue button on its first frame.
 *
 * The line is specific to what the student did (count and topic) per the
 * voice rule in CLAUDE.md. Loss never appears here: the track only ever lights
 * up, per the token rule that a streak surface never counts down.
 */

import { Press } from "../app/ui/Press";
import { Berry } from "../mascot/Berry";
import type { BerryCostume } from "../mascot/berryCostume";
import { COMBO_MILESTONES, comboLine, type Reaction } from "../mascot/berryReaction";

export interface ComboInterstitialProps {
  readonly count: number;
  readonly topicLabel: string;
  readonly reaction: Reaction;
  readonly reactionKey: number;
  readonly costume: BerryCostume;
  readonly reducedMotion: boolean;
  readonly progress: { readonly index: number; readonly total: number };
  readonly onContinue: () => void;
}

export function ComboInterstitial({ count, topicLabel, reaction, reactionKey, costume, reducedMotion, progress, onContinue }: ComboInterstitialProps) {
  return (
    <div
      className="combo-stage fixed inset-0 z-40 flex flex-col overflow-hidden bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={`${count} in a row`}
      data-combo={count}
    >
      {/* A soft primary glow behind the count. Painted on the opaque ground, so it never reveals the lesson. */}

      <header className="relative mx-auto flex w-full max-w-2xl items-center gap-3 p-4 md:p-6">
        <div className="flex-1">
          <div className="h-2 w-full overflow-hidden rounded-full border border-border bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.index}>
            <div className="h-full rounded-full bg-primary" style={{ width: `${(progress.index / progress.total) * 100}%` }} />
          </div>
        </div>
        <span className="text-scale-sm font-semibold text-muted-foreground tabular-nums">
          {progress.index}/{progress.total}
        </span>
      </header>

      {/* The count. flex-1 here and on the character block splits the vertical space between them. */}
      <div className="relative flex flex-1 flex-col items-center justify-center gap-2 px-6 pt-2 text-center">
        {/* The eyebrow is NEUTRAL and the number below it is not. Sticker rule
            7: body-sized text recedes so the colour leads, and the colour here
            is the 110px count, which is display size and owns the screen. */}
        <p className="text-scale-sm font-bold uppercase tracking-[0.2em] text-muted-foreground">In a row</p>
        <p className="combo-count title-face font-semibold leading-none text-primary-ink tabular-nums" aria-hidden>
          {count}
        </p>
        <ol className="combo-track mt-4 flex items-center gap-3" aria-label="Combo milestones">
          {COMBO_MILESTONES.map((milestone) => (
            <li
              key={milestone}
              data-lit={milestone <= count ? "true" : "false"}
              className="combo-pip flex h-9 min-w-9 items-center justify-center rounded-full px-3 text-scale-sm font-bold tabular-nums"
              aria-current={milestone === count ? "step" : undefined}
            >
              {milestone}
            </li>
          ))}
        </ol>
      </div>

      {/* The character rising from the bottom edge, with its one line beside it. */}
      <div className="relative flex flex-1 flex-col justify-end">
        <div className="combo-row mx-auto flex w-full max-w-2xl flex-1 items-end gap-4 overflow-hidden px-4 pt-6 md:px-6">
          <div className="combo-rise shrink-0">
            <Berry
              mood={reaction.mood}
              behaviour={reaction.behaviour}
              behaviourKey={reactionKey}
              chain={reaction.chain}
              sparkleKey={reactionKey}
              state={reaction.state}
              costume={costume}
              reducedMotion={reducedMotion}
              sizePx={184}
            />
          </div>
          <div className="combo-bubble mb-10 min-w-0 max-w-md flex-1 rounded-2xl border-2 border-border bg-card px-4 py-3 md:flex-none md:px-5 md:py-4">
            <p className="text-scale-base font-medium leading-snug text-foreground md:text-scale-lg">{comboLine(count, topicLabel)}</p>
          </div>
        </div>
        <div className="border-t border-border bg-card">
          <div className="mx-auto flex w-full max-w-2xl justify-end p-4 pb-safe md:p-6">
            <Press onPointerDown={onContinue} className="w-full md:w-auto md:min-w-48">
              Continue
            </Press>
          </div>
        </div>
      </div>
    </div>
  );
}
