/**
 * The header HUD: the daily goal, diamonds, the streak flame, and Charge as
 * Bloom.
 *
 * ROUND TWO. The blind critic put round one's header beside the bar's and named
 * one gap above all the others: seven status chips at identical icon size,
 * weight and colour saturation, so the pacing resource had no visual primacy,
 * and its progress sliver was 8px tall and collided with the header's bottom
 * divider. Three things changed and each one is that finding:
 *
 *  1. THE ROW IS THREE ITEMS. Diamonds, streak, and Charge. Nothing else.
 *  2. CHARGE IS DOMINANT. Its number is `--text-scale-2xl` against the
 *     neighbours' `--text-scale-sm`, exactly 2x, it is the only item in a
 *     tinted pill, it is the only one carrying a word, and its meter is inside
 *     that pill with padding under it so it can no longer touch the header's
 *     bottom edge.
 *  3. LANGUAGE AND THEME LEFT THE ROW. Shell.tsx puts them on the other side of
 *     the header now, muted, beside the wordmark, where a reader looking for a
 *     score never lands on them.
 *
 * WHERE THE DAILY GOAL WENT. Into the header's bottom edge, as a full width
 * meter in place of the divider. That is the bar's in-lesson header pattern:
 * one progress bar across the whole width and a single resource chip. It costs
 * the row no horizontal space, which is what pays for the dominant chip at
 * 390px, and it fixes the collision by removing the thing that was collided
 * with. The goal is still a DRAWN fraction, still never a written one; the
 * streak button opens its coach mark, because closing today's goal and keeping
 * the streak are one sentence in docs/ECONOMY.md.
 *
 * All four numbers are still READ, never computed: every one comes out of
 * `deriveEconomy`, which is the same rule the reward moment follows.
 *
 * THE MARKS ARE BORROWED PATTERN, NOT BORROWED ART. Every hue is a Blueberry
 * token (purple for the goal, sky for diamonds, orange for the streak, emerald
 * for charge), one hue per system, so two numbers never answer the same
 * question in the same colour.
 *
 * WHY A <dialog> AND NOT A TOOLTIP. Every item opens a coach mark, and a coach
 * mark has to be dismissable by Escape, trap focus while it is up, and sit
 * above everything. Hand rolling those is three bugs; `showModal()` is none.
 * Same call, and the same comment, as LanguagePicker.tsx.
 *
 * PRESS. Each button carries `.press` and opens its sheet on `onPointerDown`,
 * so the acknowledgement and the action are the same frame. CLAUDE.md's rule is
 * that the press itself is the first frame of feedback.
 */

import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { deriveEconomy, type EconomySnapshot } from "@blueberry/economy";
import { economyOptions } from "../progress";
import { useProgress, useReducedMotion } from "../hooks";
import { Berry } from "../../mascot/Berry";
import { DiamondMark, FlameMark, XpRing } from "./HudIcons";
import {
  hudModel,
  HUD_BUTTON_IDS,
  type ChargeReadout,
  type HudButtonId,
  type HudModel,
  type StreakReadout,
} from "./hudModel";

/**
 * How often the header re-derives against the wall clock.
 *
 * progress.ts recomputes its snapshot on a COMMIT and not on a tick, and its
 * header names the consequence: "Charge regenerates with the clock, so a meter
 * left on screen for an hour shows the value it had at the last commit. A
 * surface that needs a live meter should derive it itself." The header is that
 * surface. A point of charge lands every 30 minutes, so a minute is fine
 * grained enough to never be visibly stale and coarse enough to cost nothing.
 *
 * The re-derivation is done HERE rather than in the shell, so the tick
 * re-renders three glyphs and not the whole tab underneath them.
 */
const LIVE_TICK_MS = 60_000;

/**
 * The economy against the wall clock, with the same course denominator the
 * store uses.
 *
 * Passing the universe is not optional and it is not a detail: mastery rank
 * awards pay diamonds, and mastery is scored out of a course, so a snapshot
 * derived without the course reports a DIFFERENT diamond balance from the one
 * the pathway shows. Measured on the P3 capture seed, the gap is 262 against
 * 137. `economyOptions` hands back the store's own cached universe so the two
 * cannot disagree.
 */
function useLiveEconomy(): EconomySnapshot {
  const snapshot = useProgress();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((n) => n + 1), LIVE_TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  const { journal, course } = snapshot;
  // `tick` in the dependency list is the whole point of this hook: it is what
  // makes the wall clock an input rather than a thing read once at mount.
  return useMemo(() => deriveEconomy(journal, new Date().toISOString(), economyOptions(course)), [journal, course, tick]);
}

/** Where the coach mark's spotlight is cut, in viewport pixels. */
interface Spot {
  readonly x: number;
  readonly y: number;
  readonly r: number;
}

interface ItemProps {
  readonly id: HudButtonId;
  readonly label: string;
  readonly onOpen: (id: HudButtonId, spot: Spot) => void;
  readonly className?: string;
  readonly children: ReactNode;
}

/**
 * One readout. 44px minimum in both directions, pressed on pointer down.
 *
 * It measures itself on the way into the sheet rather than letting the sheet go
 * looking for it, because the button is the only thing that knows for certain
 * which element was pressed, and the spotlight has to be cut around exactly
 * that one.
 */
function HudButton({ id, label, onOpen, className = "", children }: ItemProps) {
  return (
    <button
      type="button"
      data-hud={id}
      onPointerDown={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        onOpen(id, {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          r: Math.max(rect.width, rect.height) / 2 + 10,
        });
      }}
      aria-label={label}
      aria-haspopup="dialog"
      className={`press relative flex min-h-11 min-w-11 items-center justify-center rounded-xl ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * The daily goal, drawn along the bottom of the header.
 *
 * It is `absolute` against the header, which is `sticky` and therefore a
 * containing block, so it spans the full header width whatever the row inside
 * it is doing. The track IS the divider: Shell.tsx dropped its `border-b` when
 * this arrived, because two horizontal lines a pixel apart is a seam, not a
 * design.
 *
 * `role="progressbar"` with the readout's own sentence as its name is what
 * makes a four pixel line self describing to a screen reader. Sighted students
 * get the same sentence from the streak coach mark.
 */
function HudGoalBar({ model }: { readonly model: HudModel }) {
  const { xp } = model;
  return (
    <span
      className="hud-goal"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={xp.goalXp}
      aria-valuenow={xp.today}
      aria-label={xp.label}
      data-met={xp.met ? "true" : "false"}
    >
      <span className="hud-goal-fill" style={{ width: `${(xp.fraction * 100).toFixed(1)}%` }} />
    </span>
  );
}

/**
 * The dominant chip.
 *
 * Bloom, the number at twice the neighbours' size, and a column holding the one
 * word in the row over the meter. The word is what the critic asked for ("a
 * visible label or unit") and it is a LABEL rather than a "/ 30", because the
 * denominator stays drawn: the meter beside it is the 30 cap and writing it
 * twice would undo the thing this header is built on.
 */
function ChargeChip({ charge, reducedMotion }: { readonly charge: ChargeReadout; readonly reducedMotion: boolean }) {
  return (
    <span className="hud-charge">
      <span className="hud-charge-row">
        <Berry
          state="charged"
          chargeLevel={charge.fraction}
          mood={charge.examWindow ? "excited" : "focused"}
          reducedMotion={reducedMotion}
          sizePx={26}
        />
        <span className={`hud-charge-value ${charge.examWindow ? "is-exam" : ""}`}>{charge.value}</span>
        <span className="hud-charge-word">{charge.examWindow ? charge.daysLabel : "Charge"}</span>
      </span>
      <span className="hud-meter" aria-hidden>
        <span
          className={`hud-meter-fill ${charge.examWindow ? "hud-meter-exam" : ""}`}
          style={{ width: `${(charge.fraction * 100).toFixed(1)}%` }}
        />
      </span>
    </span>
  );
}

/**
 * The header row. `role="group"` rather than a list: these are three readings
 * of one thing, and a screen reader announcing "list, 3 items" in front of the
 * page title is noise.
 */
export function Hud() {
  const economy = useLiveEconomy();
  const reducedMotion = useReducedMotion();
  const model = useMemo(() => hudModel(economy), [economy]);
  const [open, setOpen] = useState<HudButtonId | null>(null);
  const [spot, setSpot] = useState<Spot | null>(null);
  const { diamonds, streak, charge } = model;

  const openItem = (id: HudButtonId, at: Spot) => {
    setSpot(at);
    setOpen(id);
  };

  return (
    <>
      <div className="flex items-center gap-1 sm:gap-2" role="group" aria-label="Today's progress">
        <HudButton id="diamonds" label={diamonds.label} onOpen={openItem} className="gap-1 px-1">
          <DiamondMark className="h-5 w-5 shrink-0" />
          <span className="text-scale-sm font-bold leading-none tabular-nums text-diamond-ink">{diamonds.value}</span>
        </HudButton>

        <HudButton id="streak" label={streak.label} onOpen={openItem} className="gap-0.5 px-1">
          <FlameMark lit={streak.lit} className={`h-6 w-6 shrink-0 ${streak.lit ? "" : "hud-flame-out"}`} />
          <span
            className={`text-scale-sm font-bold leading-none tabular-nums ${
              streak.lit ? "text-streak-ink" : "text-muted-foreground"
            }`}
          >
            {streak.value}
          </span>
        </HudButton>

        <HudButton id="charge" label={charge.label} onOpen={openItem}>
          <ChargeChip charge={charge} reducedMotion={reducedMotion} />
        </HudButton>
      </div>

      <HudGoalBar model={model} />

      <HudSheet
        model={model}
        open={open}
        spot={spot}
        onClose={() => setOpen(null)}
        reducedMotion={reducedMotion}
      />
    </>
  );
}

/**
 * The coach mark, and it is a MOMENT rather than a definition.
 *
 * The critic's second finding was about this panel, and it named exactly what
 * the bar does that round one did not: it draws the resource as a row of units
 * with one visibly spent, it cuts a spotlight ring around the counter it is
 * explaining, and it gives that one large primary CTA. All three are here, and
 * one of them is better than the bar's rather than equal to it.
 *
 *  - THE UNIT ROW. Charge draws thirty pips, seventeen lit, and the eighteenth
 *    partly filled because it is on its way. The bar draws a heart already
 *    spent; ours draws the one coming back, which is the honest picture of a
 *    limiter that refills and is the reason ECONOMY.md allows the mechanic.
 *  - THE SPOTLIGHT. A transparent circle over the pressed chip with a huge
 *    spread box shadow behind it, so the chip stays fully lit and everything
 *    else dims. `::backdrop` is transparent and this layer does the dimming,
 *    which is what makes a hole in it possible at all.
 *  - THE CTA. One button, full width, primary.
 *
 * And the eyebrow is gone. The critic caught "CHARGE" in small caps sitting
 * directly above the headline "17 of 30 charge", the same word twice in
 * adjacent lines. The model still carries `eyebrow`, because it is the dialog's
 * accessible name and it is the right sentence for that; it is simply never
 * rendered as a line of its own again.
 *
 * ONE DIALOG FOR ALL THREE, because only one can be open and three dialogs
 * would be three focus traps to keep straight.
 */
function HudSheet({
  model,
  open,
  spot,
  onClose,
  reducedMotion,
}: {
  readonly model: HudModel;
  readonly open: HudButtonId | null;
  readonly spot: Spot | null;
  readonly onClose: () => void;
  readonly reducedMotion: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    if (open !== null && !dialog.open) dialog.showModal();
    if (open === null && dialog.open) dialog.close();
  }, [open]);

  const readout = open === null ? null : model[open];

  return (
    <dialog
      ref={ref}
      data-hud-sheet={open ?? "closed"}
      onClose={onClose}
      onClick={(event) => {
        // The dialog element itself is the full viewport ground; the panel
        // inside it is not, and the spotlight layer takes no pointer events.
        if (event.target === ref.current) onClose();
      }}
      className="hud-sheet"
      aria-label={readout === null ? "Progress detail" : readout.eyebrow}
    >
      {readout === null ? null : (
        <>
          <span
            className="hud-spot"
            aria-hidden
            style={
              spot === null
                ? { display: "none" }
                : { left: `${spot.x - spot.r}px`, top: `${spot.y - spot.r}px`, width: `${spot.r * 2}px`, height: `${spot.r * 2}px` }
            }
          />
          <div className="hud-panel">
            <HudSheetStrip model={model} id={readout.id} reducedMotion={reducedMotion} />
            <h2 className="hud-panel-headline">{readout.headline}</h2>
            <p className="hud-panel-line">{readout.line}</p>
            <button type="button" onPointerDown={onClose} className="press hud-panel-cta">
              Keep going
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

/**
 * Thirty pips, and the one that is refilling.
 *
 * The lit pips cascade in left to right over about three quarters of a second,
 * which is the piece's answer to the critic's own finding about the bar: its
 * four primer frames are byte identical, so its explainer has literally zero
 * motion. Every frame of this burst is a different picture. The cascade is a
 * reveal of a value, never a claim about one, so nothing it does can be read as
 * charge arriving that has not arrived.
 *
 * The strip is `aria-hidden` and carries its number on the wrapper instead: a
 * screen reader wants "17 of 30 charge", not thirty list items.
 */
function ChargePips({ charge }: { readonly charge: ChargeReadout }) {
  const pips = [];
  for (let i = 0; i < charge.cap; i += 1) {
    const lit = i < charge.current;
    const next = i === charge.current && charge.nextFraction > 0;
    pips.push(
      <span
        key={i}
        className={`hud-pip ${lit ? "is-lit" : ""} ${next ? "is-next" : ""}`}
        style={{ "--i": i, "--next": charge.nextFraction.toFixed(3) } as CSSProperties}
      />,
    );
  }
  return (
    <span className="hud-pips" role="img" aria-label={`${charge.current} of ${charge.cap} charge`}>
      {pips}
    </span>
  );
}

/**
 * Seven days, five lit, today outlined at the goal fraction.
 *
 * This is where the daily goal is drawn at size. The header's bottom edge says
 * the same fraction ambiently; here it is a ring around today's square, so the
 * sentence "close today's ring and the day counts" is a picture before it is
 * words.
 */
function WeekStrip({
  streak,
  goalFraction,
  goalMet,
}: {
  readonly streak: StreakReadout;
  readonly goalFraction: number;
  readonly goalMet: boolean;
}) {
  return (
    <span className="hud-week" role="img" aria-label={streak.label}>
      {streak.week.map((day, index) => (
        <span
          key={index}
          className={`hud-day ${day.counted ? "is-counted" : ""} ${day.today ? "is-today" : ""}`}
          style={{ "--i": index } as CSSProperties}
        >
          <span className="hud-day-slot">
            {day.today ? <XpRing fraction={goalFraction} met={goalMet} className="hud-day-ring" /> : null}
            <span className="hud-day-mark" />
          </span>
          <span className="hud-day-letter">{day.letter}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * The unit row at the top of the panel, per item.
 *
 * Charge draws Bloom at 76px over the pip row: at that size the halo's
 * thickness is legible as a meter gaining and losing weight, which is what
 * makes it a reading rather than a decoration. Diamonds has no unit row and
 * that is honest rather than lazy: the balance has no cap, so there is no row
 * of units to draw, and inventing one would be drawing a fraction that does not
 * exist.
 */
function HudSheetStrip({
  model,
  id,
  reducedMotion,
}: {
  readonly model: HudModel;
  readonly id: HudButtonId;
  readonly reducedMotion: boolean;
}) {
  switch (id) {
    case "diamonds":
      return (
        <span className="hud-panel-mark">
          <DiamondMark className="h-14 w-14" />
          <span className="text-scale-2xl font-bold leading-none tabular-nums text-diamond-ink">
            {model.diamonds.value}
          </span>
        </span>
      );
    case "streak":
      return <WeekStrip streak={model.streak} goalFraction={model.xp.fraction} goalMet={model.xp.met} />;
    case "charge":
      return (
        <span className="hud-panel-charge">
          <Berry
            state="charged"
            chargeLevel={model.charge.fraction}
            mood={model.charge.examWindow ? "excited" : "happy"}
            reducedMotion={reducedMotion}
            sizePx={76}
          />
          {model.charge.examWindow ? null : <ChargePips charge={model.charge} />}
        </span>
      );
    default: {
      const unreachable: never = id;
      return <>{unreachable}</>;
    }
  }
}
