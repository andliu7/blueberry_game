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
 *   shade          0.04   the wash either side of the paper. Holds the lens
 *   paper          0.04   THE MEANING LAYER. The ribbon's width IS the energy
 *                         profile, and its edge is drawn from the unit's data
 *   props          0.14   an Erlenmeyer on the far shelf at each checkpoint
 *   (the track)    1.00   real DOM, not in here
 *
 * Every one of those is a transform on a <g>, written in ONE requestAnimationFrame
 * from ONE cached scroll value, per layered-motion's rule. Nothing here animates
 * a layout property and nothing here takes a pointer event.
 *
 * THE LENS. The shade layer is masked, and the mask carries two holes: one that
 * follows the pointer, and one anchored on the node the student is meant to tap
 * next. It used to mask a fog layer of its own; the fog is gone with the
 * hillsides it sat on, and the same effect now costs one layer instead of two. The second is not a nicety. Touch has no hover, so a lens bound only
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
  CHANNEL_SWING,
  channelPath,
  energyProfile,
  groundPath,
  isCheckpointUnit,
  stepProfile,
  unitEnergies,
  type RowSpan,
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
  /** Pixels of swell the channel may add at zero energy. See terrain.ts. */
  readonly swingPx: number;
  readonly spans: readonly UnitSpan[];
  /** Every track row's box, which is where the per lesson ripple hangs. */
  readonly rows: readonly RowSpan[];
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
  swingPx: 0,
  spans: [],
  rows: [],
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
const MAX_BASIS_PX = 360;

/**
 * How far the paper reaches past the label column, each side.
 *
 * The channel is the surface the node titles are printed on, so it has to clear
 * them rather than meet them: a boundary stroke landing on the first glyph of
 * "Kinetic vs thermodynamic control" is what the S3 grounding pass measured in
 * the desktop capture.
 */
const LABEL_GUTTER_PX = 12;

/**
 * How much lavender is kept beside the paper at the widest crest.
 *
 * Small, because on a phone this is competing with the reading column and the
 * reading column wins. It exists so the paper never runs flush to the screen
 * edge, which would read as a bleed rather than as a sheet.
 */
const SCENE_EDGE_PX = 10;

/**
 * The most the paper's edge may swell, in pixels, whatever the basis allows.
 *
 * The S2 defect was "torn paper scroll edges", and amplitude is what produced
 * that reading: at 16 percent of a 305px basis the edge moved 49px sideways
 * between rows about 170px apart, which is a 16 degree slope and reads as a rip
 * rather than as a curve. The constraint that came out of S2 is explicit that
 * the WAVELENGTH carries the reaction coordinate and the amplitude does not, so
 * this ceiling costs the meaning layer nothing and buys a deckle that reads as
 * a drawn edge. 24px over the same 170px pitch is about 8 degrees.
 */
const MAX_SWING_PX = 16;

/*
 * 24 IN ROUND TWO OF THIS PASS, 16 NOW, and the difference is what the desktop
 * capture showed once the flank wash came off. With a 2.5 percent wash beside
 * it the boundary was a soft change of surface; against the page's own lavender
 * it is a hard colour edge, and a hard edge wandering 24px each way over a
 * 170px row pitch is read as a deckle rather than as a curve. 16 over the same
 * pitch is about five degrees.
 *
 * It costs the meaning layer nothing, and that is the recorded S2 constraint
 * rather than my judgement: the WAVELENGTH carries the reaction coordinate and
 * the amplitude does not. terrain.ts's own header says the ribbon's width is
 * the energy profile, and both are true at once: the width still rises and
 * falls with the barrier, it simply does so over five degrees instead of eight.
 */

/**
 * Parallax rates, one per layer. See the header for what each layer is.
 *
 * A second, flatter ridge behind the ground was cut rather than kept. It was the
 * bottom mark in the scene, which is the one mark the contrast audit can resolve
 * a background for, and at #f1e9d9 on cream it measured 1.05:1 against a 3:1
 * floor for a graphical object. The honest fix was not an exemption for artwork,
 * it was to stop drawing two soft bands and draw one ground that clears the
 * floor, which the section below explains.
 *
 * THE VAPOUR MOVES AT THE GROUND'S RATE, and that is a fix rather than a
 * simplification.
 *
 * The fog is drawn as the SAME SHAPE as the ground, so the only thing moving it
 * RELATIVE TO THE GROUND does is uncover ground along the boundary. That was
 * harmless while the boundary was a smooth near vertical line: sliding a
 * vertical edge vertically exposes nothing. Once the profile gained its per
 * lesson ripple the boundary became a scalloped edge, and the 16px of relative
 * travel between -0.12 and 0.04 left a dark olive fringe down one flank of
 * every scallop, which reads exactly like a misregistered second plate in a
 * print. Both fringes were confirmed in this round's light desktop capture, the
 * second one after the first fix set the rate to zero and left the GROUND's own
 * 0.04 as the mismatch.
 *
 * No independent rate fixes it, because any offset of a shape against itself
 * uncovers something, and clipping does not either: a clip stops the fog
 * painting where it should not, and this is the opposite problem, fog ABSENT
 * where it should be. So the fog is pinned to its own ground, and the
 * foreground motion this layer was for is carried by the lens, which moves over
 * the path in earnest and is the thing a reader actually watches.
 */
const RATES = { ground: 0.04, props: 0.14 } as const;
/** No layer ever slides further than this, so no layer can expose its own edge. */
const MAX_SHIFT_PX = 110;
/** How long the pointer lens stays open after the pointer stops moving. */
const LENS_IDLE_MS = 900;
/** How far the crest clears the checkpoint panel's top edge, and how far its ends fall. */
const HUMP_LIFT = 8;
const HUMP_DROP = 110;

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
      // THE CREST IS ANCHORED ON THE CHECKPOINT PANEL'S TOP EDGE, not on the
      // unit's centre. Drawn from the centre, the arc rose through the middle of
      // the panel, and an arc that climbs from lower left to a top centre apex
      // crosses ANY horizontal band of text that spans the panel: the capture
      // had the dashed curve struck through the word CHECKPOINT. There is no
      // amplitude that avoids it and no alignment of the heading that survives a
      // narrower phone. Anchored on the panel's top edge the arc passes OVER the
      // panel, which is the reading the design wanted in the first place: the
      // chips are what sits under the barrier.
      const gate = section.querySelector<HTMLElement>(".path-gate");
      const gateBox = gate === null ? null : gate.getBoundingClientRect();
      checkpoints.push({
        unitId: span.unitId,
        y: gateBox === null ? (span.top + span.bottom) / 2 : gateBox.top - box.top,
      });
    }
  }
  // The ROW carries the state attribute and the NODE carries the wind offset,
  // and since round two the offset is a transform on the node rather than on
  // the row. A row's own rect does not move with its child's transform, so
  // asking the row where the node is would park the lens on the centreline
  // whatever the node did. Ask the node.
  const current = stage.querySelector<HTMLElement>("[data-node-state='current'] .path-node");
  const focus =
    current === null
      ? null
      : (() => {
          const rect = current.getBoundingClientRect();
          // X IS SCENE RELATIVE AND Y IS STAGE RELATIVE, and that is not a
          // typo. The scene is full bleed and starts at the viewport's left
          // edge, so an x measured against the STAGE is short by the stage's
          // own offset, which on a desktop is the 240px rail plus the centring
          // margin, about 500px. The first build measured both against the
          // stage and the anchored lens landed 500px left of the node it is
          // supposed to be pointing at: a soft dark disc sitting in the middle
          // of the hillside with nothing under it, visible in every desktop
          // capture of round one and round two. Y stays stage relative because
          // the world group is translated by the stage's own top, which is what
          // puts the world's origin there.
          return { x: rect.left - scene.left + rect.width / 2, y: rect.top - box.top + rect.height / 2 };
        })();
  const rows: RowSpan[] = [];
  for (const row of stage.querySelectorAll<HTMLElement>("[data-unit-id] .path-row")) {
    const rect = row.getBoundingClientRect();
    rows.push({ top: rect.top - box.top, bottom: rect.bottom - box.top });
  }
  const centreX = columnBox.left - scene.left + columnBox.width / 2;
  const channelBasis = Math.min(MAX_BASIS_PX, columnBox.width / 2 + LABEL_GUTTER_PX);
  // The nearer side is what limits the swell, because the channel is symmetric
  // about the centreline and a desktop centreline is not the viewport's.
  const roomHalf = Math.min(centreX, scene.width - centreX) - SCENE_EDGE_PX;
  const channelSwing = Math.max(0, Math.min(channelBasis * CHANNEL_SWING, MAX_SWING_PX, roomHalf - channelBasis));

  return {
    width: scene.width,
    height: scene.height,
    worldHeight: box.height,
    // The scene is full bleed and the track column is not, so the centreline is
    // where the column actually is inside the scene, never simply the middle.
    centreX,
    // HALF THE COLUMN PLUS A GUTTER, which is what terrain.ts always said this
    // was and what the code stopped doing.
    //
    // The history matters because both halves of it were right. terrain.ts's
    // header states the invariant and the reason: "text simply must not sit on
    // the ground", because the ground has to clear 3:1 as a graphic, which caps
    // its lightness, and body copy has to clear 4.5:1, which needs more, and no
    // single value does both. It then says the basis is half the track column so
    // the channel is never narrower than the column. The scene passed 0.36 of
    // the column instead, for a real reason: at half, the ribbon at its widest
    // was 400 to 452px on a 390pt phone, wider than the screen, so the landscape
    // was invisible on the device this is mostly used on.
    //
    // What 0.36 actually bought was 21 to 42 points of visible ground and a
    // broken invariant. Measured on the built app at S3: the channel was 357px
    // wide against a 496px label column on a desktop, so "Kinetic vs
    // thermodynamic control" was struck through by the right boundary stroke and
    // the first third of every left label sat on the lavender ground at 4.73:1,
    // which is the thinnest contrast margin in the app and is exactly the pair
    // terrain.ts warns the audit cannot see.
    //
    // So the floor goes back to the column and the SWING absorbs the viewport
    // instead. The channel is never narrower than the labels; the swell either
    // side is whatever room is actually left. On a desktop that is the old 16
    // percent and the energy profile is unchanged. On a phone it is a few
    // pixels, and a phone genuinely does not have room for a full width reading
    // column and a landscape beside it: the honest shape there is a sheet of
    // paper with a hairline edge, which is also what the bar draws (its path
    // canvas is plain white edge to edge with no flank at all).
    basis: channelBasis,
    swingPx: channelSwing,
    spans,
    rows,
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
      window.addEventListener("scroll", world, { passive: true });
      window.addEventListener("resize", world, { passive: true });
      return () => {
        window.removeEventListener("scroll", world);
        window.removeEventListener("resize", world);
      };
    }
    let frame = 0;
    let pointer: { x: number; y: number } | null = null;
    /**
     * The pointer lens CLOSES when the pointer stops.
     *
     * Left open it is a soft dark disc parked wherever the cursor last was, and
     * on the hillside that is what it looks like: a smudge on the artwork with
     * nothing under it to explain itself. A lens is a thing you are holding, so
     * it belongs where the hand is and nowhere when the hand has gone. The
     * anchored lens on the current node is the one that stays, because that one
     * is pointing at something.
     */
    let idle = 0;
    const close = () => {
      idle = 0;
      pointer = null;
      svg.style.setProperty("--lens-r", "0");
    };
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
      if (idle !== 0) window.clearTimeout(idle);
      idle = window.setTimeout(close, LENS_IDLE_MS);
      schedule();
    };
    write();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("pointermove", onPointer, { passive: true });
    window.addEventListener("blur", close);
    return () => {
      if (frame !== 0) cancelAnimationFrame(frame);
      if (idle !== 0) window.clearTimeout(idle);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("blur", close);
    };
  }, [reducedMotion, metrics.height]);

  const { width, height } = metrics;
  const energies = unitEnergies(units);
  const samples =
    width < 2 || metrics.worldHeight < 2
      ? []
      : stepProfile(energyProfile(energies, metrics.spans), metrics.rows);
  const geometry = { width, height: metrics.worldHeight, centreX: metrics.centreX, basis: metrics.basis, swingPx: metrics.swingPx };

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
        <mask id="path-lens-mask" maskUnits="userSpaceOnUse" x={-width} y={-2000} width={width * 3} height={metrics.worldHeight + 4000}>
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
      {/*
        THE PAPER RIBBON, and it is what replaced the torn-paper flanks.

        Two blind judges called the old hillsides "an unfinished background
        asset": a muddy olive #9c7f4e either side of the track with a scalloped
        edge that read as a misregistered plate, and they cost the node labels
        horizontal room they wanted. That colour was not a taste failure, it was
        forced: the flanks were a FILL on a cream page, so they had to clear the
        3:1 graphics floor on their own, and the only fills that do on cream are
        dark and warm.

        The lavender turn removes the constraint by removing the fill. The ground
        IS the page now, the channel is a strip of the card's own cream running
        down it, and the shape that used to be a hillside is a soft shade beside
        the paper rather than a body of land. The ribbon carries a permanent
        hairline edge for the same arithmetic every card in the app now carries
        one: cream on lavender is 1.96:1 and a boundary needs 3:1, so the edge is
        what identifies the shape and the fill rides on it (the contrast audit
        collapses a fill and its stroke to the better of the two, and says so).
      */}
      <g className="path-layer path-layer--ground" mask="url(#path-lens-mask)">
        <path className="path-ground" d={groundPath(samples, geometry, -1)} />
        <path className="path-ground" d={groundPath(samples, geometry, 1)} />
      </g>
      <g className="path-layer path-layer--paper">
        <path className="path-channel" d={channelPath(samples, geometry)} />
        {/* The meaning layer: the energy curve itself, drawn as the page is read.
            It inks in over the ribbon's own hairline as the page is travelled,
            so the edge is never absent and the draw is still a real reveal. */}
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
          const half = channelHalfWidth(-(energy?.barrier ?? 0.5), metrics.basis, metrics.swingPx) * 1.35;
          // The apex clears the panel's top edge by HUMP_LIFT and the ends fall
          // HUMP_DROP below it, so the arc is above the panel across the panel's
          // own width and only comes down beside it. A quadratic's apex is
          // halfway between its endpoints and its control point, so the control
          // is placed twice as far up as the apex is wanted.
          const drop = HUMP_DROP + (energy?.barrier ?? 0.5) * 50;
          const ends = checkpoint.y + drop;
          const control = checkpoint.y - 2 * HUMP_LIFT - drop;
          return (
            <path
              key={checkpoint.unitId}
              className="path-hump"
              d={`M ${(metrics.centreX - half).toFixed(1)} ${ends.toFixed(1)} Q ${metrics.centreX.toFixed(1)} ${control.toFixed(1)}, ${(metrics.centreX + half).toFixed(1)} ${ends.toFixed(1)}`}
            />
          );
        })}
      </g>

      <g className="path-layer path-layer--props">
        {metrics.checkpoints.map((checkpoint, index) => {
          const side = index % 2 === 0 ? -1 : 1;
          const energy = energies.find((entry) => entry.unitId === checkpoint.unitId);
          const half = channelHalfWidth(-(energy?.wellDepth ?? 0.5), metrics.basis, metrics.swingPx);
          return (
            <Flask
              key={checkpoint.unitId}
              x={metrics.centreX + side * (half + 26)}
              // Beside the panel, not above it: the anchor is the panel's top
              // edge now, and 90px above that is over the unit banner.
              y={checkpoint.y + 120}
              scale={0.9}
            />
          );
        })}
      </g>

      {/*
        THE VAPOUR LAYER IS GONE AND ITS LENS MOVED DOWN ONE.

        The fog existed to sit on the hillsides and be parted where the student
        was looking. There are no hillsides any more, only a shade beside the
        paper, so a second copy of that shape with a wash on it would be a layer
        with no host. The lens now masks the shade itself, which is the same
        effect with one layer instead of two: the ground lightens around the
        pointer and around the node the student is meant to tap next, and touch
        still gets the anchored hole because touch has no hover.
      */}
      </g>
      </>
      )}
    </svg>
  );
}
