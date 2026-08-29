/**
 * The pathway's backdrop: one continuous landscape that scrolls with the path.
 *
 * Not a tiled texture and not wallpaper. terrain.ts explains the motif; this
 * file is the drawing and the one animation frame that moves it.
 *
 * WHY IT IS ALL INSIDE ONE <svg>. Three reasons, in order of weight. A landscape
 * is artwork rather than chrome, and the sticker language's rules about borders,
 * radii and fills are about controls and cards, so drawing it as a stack of divs
 * would put a dozen borderless rectangles in front of an audit that is right to
 * ask about them. Masks, stroke-dashoffset draws and mirrored curves are native
 * here and awkward anywhere else. And one element means one paint layer for the
 * whole backdrop instead of seven.
 *
 * THE LAYERS, back to front, with the rate each moves at relative to the page.
 * layered-motion's stack, trimmed to what "simple and plain" leaves standing:
 *
 *   ground         0.04   the warm low energy region. Nearly anchored
 *   energy curve   0.04   THE MEANING LAYER. Drawn from the unit's own data
 *   props          0.14   an Erlenmeyer on the far shelf at each checkpoint
 *   (the track)    1.00   real DOM, not in here
 *   vapour         -0.12  passes over the path and holds the lens
 *
 * Every one of those is a transform on a <g>, written in ONE requestAnimationFrame
 * from ONE cached scroll value, per layered-motion's rule. Nothing here animates
 * a layout property and nothing here takes a pointer event.
 *
 * THE LENS. The foreground vapour is masked, and the mask carries two holes: one
 * that follows the pointer, and one anchored on the node the student is meant to
 * tap next. The second is not a nicety. Touch has no hover, so a lens bound only
 * to a pointer is invisible on the device most of this product is used on, and
 * layered-motion is explicit that a hover revealed thing needs a non hover path.
 *
 * REDUCED MOTION renders a settled frame: the curve fully drawn, every layer at
 * rest, the lens parked on the current node. A real frame of the design, never
 * an empty box.
 */

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PathwayUnit } from "../../demo/pathwayMap";
import {
  boundaryPath,
  channelHalfWidth,
  energyProfile,
  groundPath,
  isCheckpointUnit,
  unitEnergies,
  type TerrainSample,
  type UnitSpan,
} from "./terrain";

/** What one measurement pass reads off the built page. */
interface SceneMetrics {
  /** The SCENE box: the viewport, because the surface is sticky. */
  readonly width: number;
  readonly height: number;
  /** The whole track, which is what the curve is drawn over. */
  readonly worldHeight: number;
  /** The track column's centreline, in scene coordinates. */
  readonly centreX: number;
  /** Half the track column, capped, so the landscape keeps its shape on a monitor. */
  readonly basis: number;
  readonly spans: readonly UnitSpan[];
  /** Scene y of each checkpoint unit's centre, for the hump band and the prop. */
  readonly checkpoints: readonly { readonly unitId: string; readonly y: number }[];
  /** Where the START node sits, so the lens has somewhere to be on touch. */
  readonly focus: { readonly x: number; readonly y: number } | null;
}

const EMPTY: SceneMetrics = {
  width: 0,
  height: 0,
  worldHeight: 0,
  centreX: 0,
  basis: 0,
  spans: [],
  checkpoints: [],
  focus: null,
};

/**
 * The widest the landscape's own shape is allowed to get.
 *
 * Without it the hillsides walk off the sides of a 2560px monitor and the
 * channel stops being a channel. With it the terrain is the same shape at every
 * width, and a wide screen simply shows more open ground either side, which is
 * what a landscape does.
 */
const MAX_BASIS_PX = 300;

/**
 * Parallax rates, one per layer. See the header for what each layer is.
 *
 * A second, flatter ridge behind the ground was cut rather than kept. It was the
 * bottom mark in the scene, which is the one mark the contrast audit can resolve
 * a background for, and at #f1e9d9 on cream it measured 1.05:1 against a 3:1
 * floor for a graphical object. The honest fix was not an exemption for artwork,
 * it was to stop drawing two soft bands and draw one ground that clears the
 * floor, which the section below explains.
 */
const RATES = { ground: 0.04, props: 0.14, vapour: -0.12 } as const;
/** No layer ever slides further than this, so no layer can expose its own edge. */
const MAX_SHIFT_PX = 110;

function measure(svg: SVGSVGElement, stage: HTMLElement): SceneMetrics {
  // FULL BLEED, measured rather than assumed. `margin-left: calc(50% - 50vw)`
  // is the usual trick and it is wrong here: it centres against the CONTAINING
  // BLOCK, and on a wide screen the track column is not centred in the viewport,
  // it sits to the right of the navigation rail. That left a bare white strip
  // down the side of the landscape. The stage's own left edge is the honest
  // number, and it does not depend on this margin, so reading it after zeroing
  // the margin cannot oscillate.
  svg.style.marginLeft = "0px";
  const box = stage.getBoundingClientRect();
  svg.style.marginLeft = `${(-box.left).toFixed(1)}px`;
  const scene = svg.getBoundingClientRect();
  // The CONTENT column, not the stage, is what the channel is measured against.
  // The channel is never narrower than its basis (terrain.ts explains why that
  // is a contrast rule), so if the basis were half the stage there would be no
  // room for a hillside inside a 390pt phone at all and the landscape would be
  // entirely off screen. The content column is deliberately a little narrower
  // than the stage, and the difference is exactly the ground a phone can show.
  const column = stage.querySelector<HTMLElement>("[data-path-content]") ?? stage;
  const columnBox = column.getBoundingClientRect();
  const spans: UnitSpan[] = [];
  const checkpoints: { unitId: string; y: number }[] = [];
  for (const section of stage.querySelectorAll<HTMLElement>("[data-unit-id]")) {
    const rect = section.getBoundingClientRect();
    const span = { unitId: section.dataset.unitId ?? "", top: rect.top - box.top, bottom: rect.bottom - box.top };
    spans.push(span);
    if (section.dataset.checkpoint === "true") {
      checkpoints.push({ unitId: span.unitId, y: (span.top + span.bottom) / 2 });
    }
  }
  const current = stage.querySelector<HTMLElement>("[data-node-state='current']");
  const focus =
    current === null
      ? null
      : (() => {
          const rect = current.getBoundingClientRect();
          return { x: rect.left - box.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
        })();
  return {
    width: scene.width,
    height: scene.height,
    worldHeight: box.height,
    // The scene is full bleed and the track column is not, so the centreline is
    // where the column actually is inside the scene, never simply the middle.
    centreX: columnBox.left - scene.left + columnBox.width / 2,
    basis: Math.min(MAX_BASIS_PX, columnBox.width / 2),
    spans,
    checkpoints,
    focus,
  };
}

/**
 * An Erlenmeyer silhouette, drawn small on the ground beside a checkpoint.
 *
 * "Small chemistry props, kept rare and small" is the owner's own wording. One
 * per checkpoint means roughly one every three units, which is rare, and it is
 * drawn in the ground's own ink so it reads as part of the landscape rather than
 * as a sticker someone put on it.
 */
function Flask({ x, y, scale }: { readonly x: number; readonly y: number; readonly scale: number }) {
  return (
    <g className="path-prop" transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M-4 -14 h8 v9 l7 15 a3 3 0 0 1 -3 4 h-16 a3 3 0 0 1 -3 -4 l7 -15 z" />
      <path d="M-6 -15 h12" strokeWidth="2.5" fill="none" />
    </g>
  );
}

/**
 * The scene measures its OWN PARENT rather than taking a ref to it.
 *
 * That is not a style choice, it is the bug this file shipped with for one
 * build. React attaches refs and runs layout effects bottom up, so a child's
 * layout effect runs BEFORE its parent host element's ref is attached: a ref
 * handed down from the stage is still null when this component first measures,
 * the effect returns early, and because its dependencies never change it never
 * runs again. The whole backdrop silently rendered nothing. Reading
 * `svg.parentElement` cannot have that failure, because the svg is always in the
 * document by the time its own ref exists.
 */
export default function PathScene({
  units,
  reducedMotion,
}: {
  readonly units: readonly PathwayUnit[];
  readonly reducedMotion: boolean;
}) {
  const [metrics, setMetrics] = useState<SceneMetrics>(EMPTY);
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Measure after layout, and again whenever the stage changes size. The curve
  // is derived from where the units actually landed, so a font swap or an
  // authoring wave moves it without anyone editing a number.
  useLayoutEffect(() => {
    const svg = svgRef.current;
    const stage = svg?.parentElement ?? null;
    if (svg === null || stage === null) return;
    const read = () => setMetrics(measure(svg, stage));
    read();
    const observer = new ResizeObserver(read);
    observer.observe(stage);
    window.addEventListener("resize", read, { passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [units]);

  // One rAF, one cached scroll value, every layer written from it.
  useEffect(() => {
    const svg = svgRef.current;
    const stage = svg?.parentElement ?? null;
    if (svg === null || stage === null) return;
    // Sliding the world under the window is NOT motion: it is what keeps a
    // sticky, viewport sized surface showing the right slice of a 14000px track.
    // So it is written in both branches, and only the parallax, the draw and the
    // pointer lens are held back under reduced motion.
    const world = () => svg.style.setProperty("--world-y", String(stage.getBoundingClientRect().top.toFixed(1)) + "px");
    if (reducedMotion) {
      world();
      svg.style.setProperty("--path-progress", "1");
      svg.style.setProperty("--shift-ground", "0px");
      svg.style.setProperty("--shift-props", "0px");
      svg.style.setProperty("--shift-vapour", "0px");
      window.addEventListener("scroll", world, { passive: true });
      window.addEventListener("resize", world, { passive: true });
      return () => {
        window.removeEventListener("scroll", world);
        window.removeEventListener("resize", world);
      };
    }
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    const write = () => {
      frame = 0;
      const box = stage.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // ONE rect read, shared by every layer, rather than each layer asking.
      svg.style.setProperty("--world-y", box.top.toFixed(1) + "px");
      // How far the stage has travelled through the viewport, 0 to 1.
      const travel = Math.max(0, Math.min(1, (viewport - box.top) / (viewport + box.height)));
      const swing = (rate: number) => `${(Math.max(-1, Math.min(1, travel * 2 - 1)) * rate * MAX_SHIFT_PX).toFixed(1)}px`;
      svg.style.setProperty("--shift-ground", swing(RATES.ground));
      svg.style.setProperty("--shift-props", swing(RATES.props));
      svg.style.setProperty("--shift-vapour", swing(RATES.vapour));
      // The curve draws itself as the page is travelled. Never fully undrawn:
      // a backdrop that is blank on arrival is the empty box the brief forbids.
      svg.style.setProperty("--path-progress", (0.35 + travel * 0.65).toFixed(3));
      if (pointer !== null) {
        const scene = svg.getBoundingClientRect();
        svg.style.setProperty("--lens-x", (pointer.x - scene.left).toFixed(0) + "px");
        svg.style.setProperty("--lens-y", (pointer.y - scene.top).toFixed(0) + "px");
        svg.style.setProperty("--lens-r", "1");
      }
    };
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(write);
    };
    const onPointer = (event: PointerEvent) => {
      // Touch keeps the anchored lens: a finger is ON the thing it is pointing
      // at, so a hole under it reveals nothing and costs a repaint.
      if (event.pointerType === "touch") return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    };
    write();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
    };
  }, [reducedMotion, metrics.height]);

  const { width, height } = metrics;
  const energies = unitEnergies(units);
  const samples = width < 2 || metrics.worldHeight < 2 ? [] : energyProfile(energies, metrics.spans);
  const geometry = { width, height: metrics.worldHeight, centreX: metrics.centreX, basis: metrics.basis };

  const focus = metrics.focus ?? { x: metrics.centreX, y: metrics.worldHeight * 0.2 };

  return (
    <svg
      ref={svgRef}
      className="path-scene"
      viewBox={`0 0 ${Math.max(1, width)} ${Math.max(1, height)}`}
      aria-hidden
      focusable="false"
      style={{ "--anchor-x": `${focus.x}px`, "--anchor-y": `${focus.y}px` } as React.CSSProperties}
    >
      {samples.length === 0 ? null : (
      <>
      <defs>
        {/*
          The mask lives in the WORLD's coordinate space, because the element
          that references it is inside the translated world group. So it has to
          cover the whole track and not one viewport: a viewport sized rect made
          the fog stop dead partway down the page and left its lens hole sitting
          in open ground like a smudge.
        */}
        <mask id="path-vapour-lens" maskUnits="userSpaceOnUse" x={-width} y={-2000} width={width * 3} height={metrics.worldHeight + 4000}>
          <rect x={-width} y={-2000} width={width * 3} height={metrics.worldHeight + 4000} fill="#ffffff" />
          <circle className="path-lens path-lens--anchor" cx="0" cy="0" r={Math.min(150, width * 0.34)} fill="url(#path-lens-falloff)" />
          <circle className="path-lens path-lens--pointer" cx="0" cy="0" r={Math.min(170, width * 0.38)} fill="url(#path-lens-falloff)" />
        </mask>
        <radialGradient id="path-lens-falloff">
          <stop offset="0%" stopColor="#000000" />
          <stop offset="62%" stopColor="#000000" stopOpacity="0.82" />
          <stop offset="100%" stopColor="#000000" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/*
        THE WORLD. Everything inside this group is drawn in TRACK coordinates,
        and the group slides under a viewport sized window.

        The first build drew the scene at the full height of the track. On a
        390pt phone at 3x that is a 1170 by 43557 pixel layer, roughly 200 MB,
        and it killed the renderer outright: the capture run died with the page
        session closed. A sticky surface the size of the viewport, with the world
        translated inside it, paints one screen and clips the rest, which is what
        a parallax backdrop should have been doing in the first place.
      */}
      <g className="path-world">
      <g className="path-layer path-layer--ground">
        <path className="path-ground" d={groundPath(samples, geometry, -1)} />
        <path className="path-ground" d={groundPath(samples, geometry, 1)} />
        {/* The meaning layer: the energy curve itself, drawn as the page is read. */}
        <path className="path-curve" d={boundaryPath(samples, geometry, -1)} pathLength={1} />
        <path className="path-curve" d={boundaryPath(samples, geometry, 1)} pathLength={1} />
        {/*
          The hump. A checkpoint is the activation barrier between two wells, so
          it is drawn as the crest the path has to climb over: an arc across the
          channel at the unit's own centre, in the ground's ink.

          It spans WIDER than the channel and rises well above the strip, because
          the first build tucked it inside the channel at the unit centre and the
          checkpoint panel painted straight over it. The crest is now the thing
          the chips sit on.
        */}
        {metrics.checkpoints.map((checkpoint) => {
          const energy = energies.find((entry) => entry.unitId === checkpoint.unitId);
          const half = channelHalfWidth(-(energy?.barrier ?? 0.5), metrics.basis) * 1.35;
          const rise = 74 + (energy?.barrier ?? 0.5) * 60;
          return (
            <path
              key={checkpoint.unitId}
              className="path-hump"
              d={`M ${(metrics.centreX - half).toFixed(1)} ${checkpoint.y.toFixed(1)} Q ${metrics.centreX.toFixed(1)} ${(checkpoint.y - rise * 2).toFixed(1)}, ${(metrics.centreX + half).toFixed(1)} ${checkpoint.y.toFixed(1)}`}
            />
          );
        })}
      </g>

      <g className="path-layer path-layer--props">
        {metrics.checkpoints.map((checkpoint, index) => {
          const side = index % 2 === 0 ? -1 : 1;
          const energy = energies.find((entry) => entry.unitId === checkpoint.unitId);
          const half = channelHalfWidth(-(energy?.wellDepth ?? 0.5), metrics.basis);
          return (
            <Flask
              key={checkpoint.unitId}
              x={metrics.centreX + side * (half + 26)}
              y={checkpoint.y - 90}
              scale={0.9}
            />
          );
        })}
      </g>

      {/*
        The vapour sits on the GROUND and never over the channel. That is a
        contrast rule rather than a composition one: every node label lives in
        the channel, and a foreground wash over text is how a moving layer
        quietly breaks a pair the audit measured as passing. So the fog is the
        hillsides only, and the lens parts it where the student is looking.
      */}
      <g className="path-layer path-layer--vapour" mask="url(#path-vapour-lens)">
        <path className="path-vapour" d={groundPath(samples, geometry, -1)} />
        <path className="path-vapour" d={groundPath(samples, geometry, 1)} />
      </g>
      </g>
      </>
      )}
    </svg>
  );
}
