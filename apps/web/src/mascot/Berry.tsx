/**
 * The berry on screen: the flat mark, driven by the imported behaviour machine.
 *
 * Mood and behaviour compose, per docs/DESIGN-TOKENS.md. The page asks for a
 * BEHAVIOUR on a game event (correct resolves to bounce, wrong to squash, a
 * milestone to celebrate) and the face follows from the behaviour's own `mood`
 * when it names one, else from the `mood` prop. Nothing here wires an event to
 * a mood directly; that is the rule in CLAUDE.md and the whole reason the two
 * axes were kept apart in the sibling repo.
 *
 * HOW IT RUNS. berryBehaviour.ts only samples poses; it owns no clock. This
 * component runs the clock: one requestAnimationFrame loop (a ref holds the
 * frame id so unmount can cancel it) blends the previous pose toward the
 * current behaviour's pose over `blendMs`, then writes the result as a CSS
 * transform. A transform is a compositor-only property, so the berry animates
 * without triggering layout on the page around it.
 *
 * Event behaviours return to `idle` when they finish; the `returnTo` field on
 * the config says so and this loop honours it. A new behaviour arriving mid
 * flight retargets the blend rather than queueing, which is the machine's
 * "interruptible" guarantee: feedback never waits behind a finishing hop.
 *
 * Under prefers-reduced-motion the loop does not start and the berry holds the
 * rest pose with the requested mood, which is the representative static frame
 * the tokens document asks for: the face still says what happened.
 *
 * THE THIRD AND FOURTH AXES, added 2026-08-27 for docs/MASCOT.md.
 *
 * `state` is what the berry is MADE OF, and `costume` is what it is wearing.
 * Neither one is allowed to grow this loop. There is still exactly one rAF, it
 * still writes exactly one transform, and it gained exactly two terms: the
 * state's `liftExtra` folds into the pose's own lift, and `jitterPx` adds a
 * sub-pixel positional wobble. Everything else a state does is declarative CSS
 * on the elements below, keyed off `data-state` and a handful of custom
 * properties, which is why adding a state costs no frames.
 *
 * Two of those CSS effects are not transforms and that is deliberate: `darken`
 * is a filter and the halo is a border. Both are set ONCE when the state
 * changes and never animated, so neither is on the per-frame path the 60fps
 * budget measures. The rule the budget actually needs is that nothing which
 * runs every frame touches layout or paint, and nothing here does.
 *
 * `swayOverride` is honoured by scaling the pose's tilt, not by rewriting the
 * keyframes. When a state does not override (every state but `aromatic`), the
 * scale is 1 and the motion is bit for bit what it was before this prop
 * existed, which is the point: an aromatic berry stops leaning and no other
 * berry changes at all.
 *
 * `recoverMs` is on the shape and is deliberately NOT a timer in here. A state
 * belongs to whatever put the berry in it, and a component that cleared its own
 * props would fight its owner. The caller reads `STATE_SHAPE[state].recoverMs`
 * and clears the state; the gallery does exactly that as the worked example.
 *
 * THE 3D UPGRADE IS NOT HERE. The sibling repo's blueberry-bot-3d.tsx is 725
 * lines over three, @react-three/fiber, motion/react and a heart burst
 * component. Importing it means importing motion, which this app does not
 * carry yet; that is a Phase 5 human gate question (the webfont and motion
 * payload decision noted in theme.css), so the flat mark stands alone for now
 * and the upgrade is one lazy import away when the owner wants it.
 */

import { useEffect, useRef, type CSSProperties } from "react";
import {
  BEHAVIOURS,
  MODIFIERS,
  blendPose,
  poseAt,
  type BerryBehaviour,
  type SampledPose,
} from "./berryBehaviour";
import type { BerryMood } from "./berryMood";
import {
  STATE_SHAPE,
  composeStateAndMood,
  type BerryState,
  type StateShape,
} from "./berryState";
import type { BerryCostume } from "./berryCostume";
import { BlueberryMark } from "./BlueberryMark";

const REST: SampledPose = { scaleY: 1, scaleX: 1, scaleZ: 1, lift: 0, tilt: 0, pitch: 0 };

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/**
 * What a screen reader hears. The badge glyph is aria-hidden, because a `<div
 * role="img">` hides its own contents from the accessibility tree, so the state
 * has to reach the label or it does not reach anybody.
 */
const STATE_ALT: Record<BerryState, string> = {
  neutral: "",
  charged: ", charged",
  protonated: ", protonated",
  carbocation: ", a carbocation",
  radical: ", a radical",
  resonance: ", in resonance",
  aromatic: ", aromatic",
  charred: ", charred",
};

function transformFor(
  pose: SampledPose,
  breathe: number,
  sizePx: number,
  shape: StateShape,
  jitterX: number,
  jitterY: number,
): string {
  // lift is in body radii; the mark's body radius is 23 of 64 viewBox units.
  const liftPx = -(pose.lift + shape.liftExtra) * sizePx * (23 / 64);
  const scaleY = pose.scaleY * (1 + breathe);
  const scaleX = pose.scaleX * (1 - breathe * 0.5);
  // A state that pins sway scales the lean to match. null leaves it untouched.
  const tiltScale = shape.swayOverride === null ? 1 : clamp01(shape.swayOverride);
  const tiltDeg = pose.tilt * 57.3 * tiltScale;
  return (
    `translate(${jitterX.toFixed(2)}px, ${(liftPx + jitterY).toFixed(2)}px)` +
    ` rotate(${tiltDeg.toFixed(2)}deg)` +
    ` scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`
  );
}

/**
 * Deterministic wobble. Two sines at incommensurate frequencies never repeat on
 * a period an eye can spot, and unlike Math.random they produce the same frame
 * for the same clock, so a capture of a carbocation is reproducible.
 */
function jitterAt(now: number): { x: number; y: number } {
  return {
    x: Math.sin(now * 0.031) * Math.sin(now * 0.0117),
    y: Math.sin(now * 0.027 + 1.7) * Math.sin(now * 0.0143),
  };
}

/** Sparks and smoke are a fixed handful of CSS animated dots, never a particle engine. */
const PARTICLES = [0, 1, 2, 3];

export interface BerryProps {
  readonly mood?: BerryMood;
  /** The behaviour to play. Changing it retargets the blend mid flight. */
  readonly behaviour?: BerryBehaviour;
  /** A counter the caller bumps to replay the same event behaviour twice in a row. */
  readonly behaviourKey?: number;
  /** What the berry is made of. See berryState.ts and docs/MASCOT.md. */
  readonly state?: BerryState;
  /** What it is wearing. Cosmetic; it never affects mood, behaviour or state. */
  readonly costume?: BerryCostume;
  /**
   * 0 to 1, the Charge meter. Only read when `state` is `charged`: it drives the
   * halo's thickness, and 0 renders it flat grey rather than removing it,
   * because an empty meter still has to be visibly a meter.
   */
  readonly chargeLevel?: number;
  readonly reducedMotion: boolean;
  readonly sizePx?: number;
  readonly className?: string;
}

export function Berry({
  mood = "curious",
  behaviour = "idle",
  behaviourKey = 0,
  state = "neutral",
  costume,
  chargeLevel,
  reducedMotion,
  sizePx = 96,
  className = "",
}: BerryProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  // The blend's "from" pose and when the current behaviour started. Refs, not
  // state: they change 60 times a second and must never cause a React render.
  const fromPoseRef = useRef<SampledPose>(REST);
  const startedAtRef = useRef<number>(0);
  const currentRef = useRef<BerryBehaviour>(behaviour);
  const lastPoseRef = useRef<SampledPose>(REST);

  const shape = STATE_SHAPE[state];
  // A ref so the loop sees the current state without being torn down and
  // restarted every time the state changes, which would drop the blend.
  const shapeRef = useRef<StateShape>(shape);

  useEffect(() => {
    shapeRef.current = shape;
  }, [shape]);

  useEffect(() => {
    // Retarget: the pose we are leaving from is wherever we are right now.
    fromPoseRef.current = lastPoseRef.current;
    startedAtRef.current = performance.now();
    currentRef.current = behaviour;
  }, [behaviour, behaviourKey]);

  useEffect(() => {
    if (reducedMotion) {
      // The representative static frame: rest pose, but the state's own lift
      // still applies, so a protonated berry still floats fractionally higher.
      if (nodeRef.current) {
        nodeRef.current.style.transform = transformFor(REST, 0, sizePx, shapeRef.current, 0, 0);
      }
      return;
    }
    const tick = (now: number) => {
      const node = nodeRef.current;
      if (node === null) return;
      const name = currentRef.current;
      const config = BEHAVIOURS[name];
      const elapsed = now - startedAtRef.current;

      let progress: number;
      if (config.family === "ambient") {
        progress = (elapsed % config.durationMs) / config.durationMs;
      } else {
        progress = Math.min(1, elapsed / config.durationMs);
      }
      const target = poseAt(name, progress);
      const blend = Math.min(1, elapsed / Math.max(1, config.blendMs));
      const pose = blendPose(fromPoseRef.current, target, blend);
      lastPoseRef.current = pose;

      const damped = (MODIFIERS.breathing.dampedBy as readonly string[]).includes(name) ? 0.3 : 1;
      const breathe =
        Math.sin((now / MODIFIERS.breathing.periodMs) * Math.PI * 2) *
        (MODIFIERS.breathing.amplitude / 2) *
        damped;

      const live = shapeRef.current;
      const amplitude = live.jitterPx * (sizePx / 96);
      const noise = amplitude === 0 ? { x: 0, y: 0 } : jitterAt(now);
      node.style.transform = transformFor(
        pose,
        breathe,
        sizePx,
        live,
        noise.x * amplitude,
        noise.y * amplitude,
      );

      // A finished reactive or event behaviour returns where its config says.
      if (config.family !== "ambient" && progress >= 1 && config.returnTo !== undefined) {
        fromPoseRef.current = pose;
        startedAtRef.current = now;
        currentRef.current = config.returnTo;
      }
      frameRef.current = requestAnimationFrame(tick);
    };
    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [reducedMotion, sizePx]);

  const impliedMood = (BEHAVIOURS[behaviour].mood as BerryMood | undefined) ?? mood;
  const composed = composeStateAndMood(state, impliedMood);

  // `charged` is the one state whose halo is data rather than a constant: the
  // caller's meter reading replaces the shape's default, and 0 is a real value.
  const haloStrength =
    state === "charged" && chargeLevel !== undefined ? clamp01(chargeLevel) : shape.haloStrength;

  const vars = {
    width: sizePx,
    height: sizePx,
    "--berry-size": `${sizePx}px`,
    "--berry-halo": haloStrength,
    "--berry-blush": composed.blush,
    "--berry-darken": shape.darken,
  } as CSSProperties;

  const face = (
    <BlueberryMark eyes mood={impliedMood} costume={costume} className="h-full w-full drop-shadow-md" />
  );

  return (
    <div
      ref={nodeRef}
      className={`berry-origin ${className}`}
      style={vars}
      data-state={state}
      data-halo={shape.haloKind}
      data-ghosts={shape.ghostCount}
      // Only a state that contributes blush takes the blush over from the mood
      // CSS, so every mood the shell already renders is untouched.
      data-blush={shape.blush > 0 ? "state" : undefined}
      aria-label={`Blueberry, looking ${impliedMood}${STATE_ALT[state]}`}
      role="img"
    >
      {shape.haloKind !== "none" ? <span className="berry-halo" aria-hidden /> : null}

      <span className="berry-stack">
        {shape.split ? (
          <>
            <span className="berry-half berry-half--l">{face}</span>
            <span className="berry-half berry-half--r">{face}</span>
          </>
        ) : (
          <span className="berry-face">{face}</span>
        )}
        {shape.ghostCount === 2 ? <span className="berry-ghost">{face}</span> : null}
      </span>

      {shape.sparkRate > 0 ? (
        <span className="berry-sparks" aria-hidden>
          {PARTICLES.map((index) => (
            <span key={index} className="berry-spark" data-i={index} />
          ))}
        </span>
      ) : null}

      {shape.smokeRate > 0 ? (
        <span className="berry-smoke" aria-hidden>
          {PARTICLES.map((index) => (
            <span key={index} className="berry-puff" data-i={index} />
          ))}
        </span>
      ) : null}

      {shape.badge !== null ? (
        <span className="berry-badge" aria-hidden>
          {shape.badge}
        </span>
      ) : null}
    </div>
  );
}
