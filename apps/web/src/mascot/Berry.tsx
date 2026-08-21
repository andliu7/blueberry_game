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
 * THE 3D UPGRADE IS NOT HERE. The sibling repo's blueberry-bot-3d.tsx is 725
 * lines over three, @react-three/fiber, motion/react and a heart burst
 * component. Importing it means importing motion, which this app does not
 * carry yet; that is a Phase 5 human gate question (the webfont and motion
 * payload decision noted in theme.css), so the flat mark stands alone for now
 * and the upgrade is one lazy import away when the owner wants it.
 */

import { useEffect, useRef } from "react";
import {
  BEHAVIOURS,
  MODIFIERS,
  blendPose,
  poseAt,
  type BerryBehaviour,
  type SampledPose,
} from "./berryBehaviour";
import type { BerryMood } from "./berryMood";
import { BlueberryMark } from "./BlueberryMark";

const REST: SampledPose = { scaleY: 1, scaleX: 1, scaleZ: 1, lift: 0, tilt: 0, pitch: 0 };

function transformFor(pose: SampledPose, breathe: number, sizePx: number): string {
  // lift is in body radii; the mark's body radius is 23 of 64 viewBox units.
  const liftPx = -pose.lift * sizePx * (23 / 64);
  const scaleY = pose.scaleY * (1 + breathe);
  const scaleX = pose.scaleX * (1 - breathe * 0.5);
  return `translateY(${liftPx.toFixed(2)}px) rotate(${(pose.tilt * 57.3).toFixed(2)}deg) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
}

export interface BerryProps {
  readonly mood?: BerryMood;
  /** The behaviour to play. Changing it retargets the blend mid flight. */
  readonly behaviour?: BerryBehaviour;
  /** A counter the caller bumps to replay the same event behaviour twice in a row. */
  readonly behaviourKey?: number;
  readonly reducedMotion: boolean;
  readonly sizePx?: number;
  readonly className?: string;
}

export function Berry({
  mood = "curious",
  behaviour = "idle",
  behaviourKey = 0,
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

  useEffect(() => {
    // Retarget: the pose we are leaving from is wherever we are right now.
    fromPoseRef.current = lastPoseRef.current;
    startedAtRef.current = performance.now();
    currentRef.current = behaviour;
  }, [behaviour, behaviourKey]);

  useEffect(() => {
    if (reducedMotion) {
      if (nodeRef.current) nodeRef.current.style.transform = transformFor(REST, 0, sizePx);
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

      node.style.transform = transformFor(pose, breathe, sizePx);

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

  return (
    <div
      ref={nodeRef}
      className={`berry-origin ${className}`}
      style={{ width: sizePx, height: sizePx }}
      aria-label={`Blueberry, looking ${impliedMood}`}
      role="img"
    >
      <BlueberryMark eyes mood={impliedMood} className="h-full w-full drop-shadow-md" />
    </div>
  );
}
