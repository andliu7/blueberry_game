/**
 * The header HUD: today's XP against the goal, diamonds, the streak flame, and
 * Charge as Bloom.
 *
 * It replaces the single diamond pill the shell shipped with. Four of
 * docs/ECONOMY.md's five systems are here; Mastery is not, because that file
 * says "Never show Mastery inside a node" and this header is on screen inside
 * every node. All four numbers are READ, never computed: every one comes out of
 * `deriveEconomy`, which is the same rule the reward moment follows.
 *
 * LAYOUT, and why it survives 390px. Four buttons of exactly 44px, the minimum
 * hit target in CLAUDE.md's budget table, sit in a row with the language and
 * theme controls. The number lives beside its mark rather than under it, and no
 * item carries a denominator in text: the ring's arc is the XP goal and the bar
 * under Bloom is the charge cap, so the two fractions are drawn rather than
 * written. That is what buys the width. capture-economy.mjs asserts the header
 * does not overflow at 390px, so this is measured rather than hoped.
 *
 * THE MARKS ARE BORROWED PATTERN, NOT BORROWED ART. The reference header is
 * icon plus a bold number in the icon's own colour, spread across the row with
 * no boxes: a readout, not a control. Ours does the same and every hue is a
 * Blueberry token (purple for XP, sky for diamonds, orange for the streak,
 * emerald for charge), one hue per system, so two numbers never answer the
 * same question in the same colour. The language and theme buttons keep their
 * bordered pill on purpose: those are controls, and the border is the line
 * between something you read and something you press.
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

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { deriveEconomy, type EconomySnapshot } from "@blueberry/economy";
import { economyOptions } from "../progress";
import { useProgress, useReducedMotion } from "../hooks";
import { Berry } from "../../mascot/Berry";
import { DiamondMark, FlameMark, XpRing } from "./HudIcons";
import { hudModel, type ChargeReadout, type HudItemId, type HudModel } from "./hudModel";

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
 * re-renders four glyphs and not the whole tab underneath them.
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

interface ItemProps {
  readonly id: HudItemId;
  readonly label: string;
  readonly onOpen: (id: HudItemId) => void;
  readonly children: ReactNode;
}

/** One readout. 44px minimum in both directions, pressed on pointer down. */
function HudButton({ id, label, onOpen, children }: ItemProps) {
  return (
    <button
      type="button"
      data-hud={id}
      onPointerDown={() => onOpen(id)}
      aria-label={label}
      aria-haspopup="dialog"
      className="press relative flex min-h-11 min-w-11 flex-col items-center justify-center rounded-xl px-0.5"
    >
      {children}
    </button>
  );
}

/**
 * The bar under Bloom. It is the only place the 30 cap is drawn.
 *
 * It is absolutely positioned, which is not a layout shortcut: in flow it grew
 * the charge button's content box, which lifted that item's glyph four pixels
 * above the other three and left the row visibly uneven in the round one
 * capture. Out of flow, all four icon rows share one centre line.
 */
function ChargeMeter({ charge }: { readonly charge: ChargeReadout }) {
  return (
    <span className="pointer-events-none absolute inset-x-0 bottom-[3px] flex justify-center" aria-hidden>
      {charge.examWindow ? (
        <span className="text-[0.5625rem] font-bold uppercase leading-none tracking-wide text-primary-ink">
          {charge.daysLabel}
        </span>
      ) : (
        <span className="hud-meter">
          <span className="hud-meter-fill" style={{ width: `${(charge.fraction * 100).toFixed(1)}%` }} />
        </span>
      )}
    </span>
  );
}

/**
 * The header row. `role="group"` rather than a list: these are four readings of
 * one thing, and a screen reader announcing "list, 4 items" in front of the
 * page title is noise.
 */
export function Hud() {
  const economy = useLiveEconomy();
  const reducedMotion = useReducedMotion();
  const model = useMemo(() => hudModel(economy), [economy]);
  const [open, setOpen] = useState<HudItemId | null>(null);
  const { xp, diamonds, streak, charge } = model;

  return (
    <>
      <div className="flex items-center gap-0.5 sm:gap-1.5" role="group" aria-label="Today's progress">
        <HudButton id="xp" label={xp.label} onOpen={setOpen}>
          <span className="relative flex h-7 w-7 items-center justify-center">
            <XpRing fraction={xp.fraction} met={xp.met} className="h-7 w-7" />
            <span
              className={`absolute font-bold leading-none tabular-nums ${xp.met ? "text-good-ink" : "text-primary-ink"} ${
                xp.value.length > 2 ? "text-[0.5625rem]" : "text-[0.6875rem]"
              }`}
            >
              {xp.value}
            </span>
          </span>
        </HudButton>

        <HudButton id="diamonds" label={diamonds.label} onOpen={setOpen}>
          <span className="flex items-center gap-1">
            <DiamondMark className="h-5 w-5" />
            <span className="text-scale-sm font-bold leading-none tabular-nums text-diamond-ink">{diamonds.value}</span>
          </span>
        </HudButton>

        <HudButton id="streak" label={streak.label} onOpen={setOpen}>
          <span className="flex items-center gap-0.5" data-lit={streak.lit ? "true" : "false"}>
            <FlameMark lit={streak.lit} className={`h-6 w-6 ${streak.lit ? "" : "hud-flame-out"}`} />
            <span
              className={`text-scale-sm font-bold leading-none tabular-nums ${
                streak.lit ? "text-streak-ink" : "text-muted-foreground"
              }`}
            >
              {streak.value}
            </span>
          </span>
        </HudButton>

        <HudButton id="charge" label={charge.label} onOpen={setOpen}>
          <span className="flex items-center gap-0.5">
            <Berry
              state="charged"
              chargeLevel={charge.fraction}
              mood="focused"
              reducedMotion={reducedMotion}
              sizePx={28}
            />
            <span
              className={`text-scale-sm font-bold leading-none tabular-nums ${
                charge.examWindow ? "text-primary-ink" : "text-good-ink"
              }`}
            >
              {charge.value}
            </span>
          </span>
          <ChargeMeter charge={charge} />
        </HudButton>
      </div>

      <HudSheet model={model} open={open} onClose={() => setOpen(null)} reducedMotion={reducedMotion} />
    </>
  );
}

/**
 * The coach mark. One dialog for all four items, because only one can be open
 * and four dialogs would be four focus traps to keep straight.
 *
 * The item's own mark is redrawn LARGE at the top rather than a caret pointing
 * back at the header, for the reason the reference primer does the same: the
 * backdrop dims the header, so an arrow would point at something the student
 * can no longer see, while the mark at size is unmistakably the thing they
 * pressed.
 */
function HudSheet({
  model,
  open,
  onClose,
  reducedMotion,
}: {
  readonly model: HudModel;
  readonly open: HudItemId | null;
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
        // The dialog element itself is the backdrop; the panel inside it is not.
        if (event.target === ref.current) onClose();
      }}
      className="hud-sheet rounded-2xl border border-border bg-card p-0 text-foreground backdrop:bg-black/55"
      aria-label={readout === null ? "Progress detail" : readout.eyebrow}
    >
      {readout === null ? null : (
        <div className="flex flex-col items-center gap-3 px-5 pb-5 pt-6 text-center">
          <HudSheetMark model={model} id={readout.id} reducedMotion={reducedMotion} />
          <p className="text-scale-xs font-bold uppercase tracking-wide text-muted-foreground">{readout.eyebrow}</p>
          <h2 className="text-scale-xl font-semibold leading-tight text-foreground">{readout.headline}</h2>
          <p className="text-scale-sm leading-relaxed text-muted-foreground">{readout.line}</p>
          <button
            type="button"
            onPointerDown={onClose}
            className="press mt-1 min-h-12 w-full rounded-xl bg-primary text-scale-base font-semibold text-primary-foreground"
          >
            Got it
          </button>
        </div>
      )}
    </dialog>
  );
}

/**
 * The item's mark at coach mark size. Charge draws Bloom at 88px because that
 * is where the halo's thickness is legible: the same border formula that reads
 * as a colour shift at 26px reads as a ring gaining and losing weight here,
 * which is what makes it a meter rather than a decoration.
 */
function HudSheetMark({
  model,
  id,
  reducedMotion,
}: {
  readonly model: HudModel;
  readonly id: HudItemId;
  readonly reducedMotion: boolean;
}) {
  switch (id) {
    case "xp":
      return (
        <span className="relative flex h-20 w-20 items-center justify-center">
          <XpRing fraction={model.xp.fraction} met={model.xp.met} className="h-20 w-20" />
          <span
            className={`absolute text-scale-xl font-bold leading-none tabular-nums ${
              model.xp.met ? "text-good-ink" : "text-primary-ink"
            }`}
          >
            {model.xp.value}
          </span>
        </span>
      );
    case "diamonds":
      return (
        <span className="flex items-center gap-2">
          <DiamondMark className="h-12 w-12" />
          <span className="text-scale-2xl font-bold leading-none tabular-nums text-diamond-ink">{model.diamonds.value}</span>
        </span>
      );
    case "streak":
      return (
        <span className="flex items-center gap-1">
          <FlameMark lit={model.streak.lit} className={`h-12 w-12 ${model.streak.lit ? "" : "hud-flame-out"}`} />
          <span
            className={`text-scale-2xl font-bold leading-none tabular-nums ${
              model.streak.lit ? "text-streak-ink" : "text-muted-foreground"
            }`}
          >
            {model.streak.value}
          </span>
        </span>
      );
    case "charge":
      return (
        <span className="flex flex-col items-center gap-2">
          <Berry
            state="charged"
            chargeLevel={model.charge.fraction}
            mood={model.charge.examWindow ? "excited" : "focused"}
            reducedMotion={reducedMotion}
            sizePx={88}
          />
          <span className="hud-meter hud-meter-wide" aria-hidden>
            <span
              className={`hud-meter-fill ${model.charge.examWindow ? "hud-meter-exam" : ""}`}
              style={{ width: `${(model.charge.fraction * 100).toFixed(1)}%` }}
            />
          </span>
        </span>
      );
    default: {
      const unreachable: never = id;
      return <>{unreachable}</>;
    }
  }
}
