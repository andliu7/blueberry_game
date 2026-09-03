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
  channelHalfWidth,
  CHANNEL_SWING,
  energyProfile,
  groundPath,
  isCheckpointUnit,
  stepProfile,
  terracePath,
  unitEnergies,
  type RowSpan,
  type TerrainSample,
  type UnitSpan,
} from "./terrain";
import { placePropPx, propsForUnit } from "./sceneProps";
import { trailSegments, type TrailLane, type TrailPoint } from "./trail";

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
  /**
   * Every trail anchor on the page, in document order: chip centres with the
   * lane and done flag their data-trail attributes declare. trail.ts turns
   * these into the drawn ribbon, so the trail is derived from where the nodes
   * actually landed and can never disagree with the layout.
   */
  readonly trail: readonly TrailPoint[];
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
  trail: [],
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
/**
 * The room a prop keeps from the scene's edge, in pixels.
 *
 * The placement table is written in fractions of the scene width, and the
 * scene is the whole viewport, so a prop at 0.9 on a 390pt phone would hang
 * half off the right edge. Clamping by the widest prop's half width (the
 * cloud, about 34px at scale 1) turns that into a prop sitting AT the edge,
 * which is a composition, rather than one cut by it, which is a defect.
 */
const PROP_MARGIN_PX = 38;

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
  // The trail anchors, in DOCUMENT ORDER, which is the order the track lays
  // them down: trail.ts is explicit that nothing sorts, because the layout is
  // the authority. X is scene relative and Y is stage relative, the same split
  // the focus uses and for the same reason (the world group is translated by
  // the stage's own top; the scene is full bleed).
  const trail: TrailPoint[] = [];
  for (const anchor of stage.querySelectorAll<HTMLElement>("[data-trail]")) {
    const rect = anchor.getBoundingClientRect();
    const lane = anchor.dataset.trail;
    trail.push({
      x: rect.left - scene.left + rect.width / 2,
      y: rect.top - box.top + rect.height / 2,
      lane: lane === "left" || lane === "right" || lane === "loop" ? (lane as TrailLane) : "main",
      done: anchor.dataset.trailDone === "true",
    });
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
    trail,
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
 * The molecule line-art watermarks the goals ask for, one per unit on the
 * flank, alternating a benzene ring with a skeletal chain so the landscape
 * reads as a chemist's margin doodles rather than a repeated tile. Outlined
 * in the prop ink, faint by WEIGHT rather than by a colour under the
 * graphics floor; see .path-mark in pathway.css for the measured reasoning.
 */
function MoleculeMark({
  x,
  y,
  kind,
  scale = 1,
}: {
  readonly x: number;
  readonly y: number;
  readonly kind: "benzene" | "chain";
  readonly scale?: number;
}) {
  const at = `translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`;
  return kind === "benzene" ? (
    <g className="path-mark" transform={at}>
      <path d="M 0 -22 L 19.1 -11 L 19.1 11 L 0 22 L -19.1 11 L -19.1 -11 Z" />
      <circle cx="0" cy="0" r="12.5" />
    </g>
  ) : (
    <g className="path-mark" transform={at}>
      <path d="M -32 8 L -16 -8 L 0 8 L 16 -8 L 32 8" />
      <path d="M -28.5 2 L -19.5 -7" />
    </g>
  );
}

/**
 * A cloud, drifting over the terraces.
 *
 * FILLED, unlike the flask and the molecule watermarks, because that is what
 * the committed backdrop draws: white clouds over the cream ground, not
 * outlines of clouds. White on cream is 1.10:1 on its own, which is why the
 * shape also carries the terrace ink as a boundary; fill and stroke ride on
 * ONE path, so the contrast audit collapses them to the better of the two and
 * the stroke is what identifies the shape, exactly the argument every card in
 * this app carries a border on.
 */
function CloudMark({ x, y, scale }: { readonly x: number; readonly y: number; readonly scale: number }) {
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${scale})`}>
      <path
        className="path-cloud"
        d="M -26 8 a 9 9 0 0 1 2 -17.6 a 12.5 12.5 0 0 1 24 -4.4 a 9.5 9.5 0 0 1 13 8.4 a 7 7 0 0 1 -2.6 13.6 z"
      />
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
  stamp = "",
}: {
  readonly units: readonly PathwayUnit[];
  readonly reducedMotion: boolean;
  /**
   * A progress fingerprint (current node id plus done count). The trail's
   * done colouring is measured off the DOM, and clearing a lesson changes
   * the DOM without changing `units`, so the measurement re-runs when this
   * string moves. Layout-only changes are already covered by the
   * ResizeObserver below.
   */
  readonly stamp?: string;
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
  }, [units, stamp]);

  // One rAF, one cached scroll value, every layer written from it.
  useEffect(() => {
    const svg = svgRef.current;
    const stage = svg?.parentElement ?? null;
    if (svg === null || stage === null) return;
    // Sliding the world under the window is NOT motion: it is what keeps a
    // sticky, viewport sized surface showing the right slice of a 14000px track.
    // So it is written in both branches, and only the parallax, the draw and the
    // pointer lens are held back under reduced motion.
    // THE TRANSLATE IS THE STUCK-STATE DELTA: stage.top MINUS the scene's own
    // top, never stage.top alone. The scene is sticky, so once it is stuck its
    // own top is 0 and the two numbers coincide, which is how the bug hid: at
    // landing scroll the scene still sits at the stage's flow position, and
    // stage.top alone double-offsets the whole drawn world, trail included.
    // The S3 critic measured 198px of divergence between the current chip's
    // centre and the nearest trail endpoint at scrollY 0, converging to 0 only
    // at scrollY 400, on the first screen a student sees. World coordinates
    // are stage-relative, so the honest translate is where the stage sits
    // relative to the scene element itself, in every scroll state.
    const world = () => {
      const sceneTop = svg.getBoundingClientRect().top;
      svg.style.setProperty("--world-y", (stage.getBoundingClientRect().top - sceneTop).toFixed(1) + "px");
    };
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
      const scene = svg.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // ONE pair of rect reads, shared by every layer, rather than each layer
      // asking. The translate is the stuck-state delta (box.top - scene.top),
      // per the comment on world() above: stage.top alone is only correct
      // once the sticky scene is stuck, and at landing scroll it double-
      // offset the whole world by the stage's flow position.
      svg.style.setProperty("--world-y", (box.top - scene.top).toFixed(1) + "px");
      // How far the stage has travelled through the viewport, 0 to 1.
      const travel = Math.max(0, Math.min(1, (viewport - box.top) / (viewport + box.height)));
      const swing = (rate: number) => `${(Math.max(-1, Math.min(1, travel * 2 - 1)) * rate * MAX_SHIFT_PX).toFixed(1)}px`;
      svg.style.setProperty("--shift-ground", swing(RATES.ground));
      svg.style.setProperty("--shift-props", swing(RATES.props));
      // The curve draws itself as the page is travelled. Never fully undrawn:
      // a backdrop that is blank on arrival is the empty box the brief forbids.
      svg.style.setProperty("--path-progress", (0.35 + travel * 0.65).toFixed(3));
      if (pointer !== null) {
        // The lens circles live in the mask, which is WORLD coordinate space
        // (the referencing group rides inside the translated world). So the
        // y is stage-relative, pointer.y - box.top, the same split the focus
        // anchor uses; the old scene-relative y was only right in the one
        // scroll state where the two frames coincide, the same family of bug
        // as the --world-y double offset above. X carries no world translate,
        // so scene-relative is correct there.
        svg.style.setProperty("--lens-x", (pointer.x - scene.left).toFixed(0) + "px");
        svg.style.setProperty("--lens-y", (pointer.y - box.top).toFixed(0) + "px");
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
        {/*
          THE TERRACES, which are also the descending energy bands.
          docs/DESIGN-GOALS.md asks the background for "terraced hills stepping
          down ... a gentle descending energy-band gradient" and for the energy
          metaphor where "each unit ends lower than it began". One band per
          unit, each drawn OVER the one before it so the only visible stroke is
          its wavy top edge, satisfies all three with one mechanism rather than
          three stacked layers: the step IS the drop in energy across the unit.
          Each band runs far past its own span so the next band's fill ends it.
        */}
        {metrics.spans.map((span, index) => (
          <path key={span.unitId} className="path-terrace" d={terracePath(span.top + 8, span.bottom, width, index)} />
        ))}
        <path className="path-ground" d={groundPath(samples, geometry, -1)} />
        <path className="path-ground" d={groundPath(samples, geometry, 1)} />
      </g>

      {/*
        The margin doodles: a molecule watermark per unit on one flank, a
        cloud on the other every second unit. Deterministic from the spans,
        clamped inside the scene so a phone's narrow flanks show what fits
        rather than clipping mid-shape. They ride at the ground's rate,
        unmasked: the lens lightens the ground, it does not erase the drawings.
      */}
      <g className="path-layer path-layer--marks">
        {metrics.spans.flatMap((span, index) =>
          propsForUnit(index).map((placement, slot) => {
            const point = placePropPx(placement, width, span.top, span.bottom, PROP_MARGIN_PX);
            const key = `${span.unitId}-${slot}`;
            if (placement.kind === "cloud") return <CloudMark key={key} x={point.x} y={point.y} scale={placement.scale} />;
            if (placement.kind === "flask") return <Flask key={key} x={point.x} y={point.y} scale={placement.scale} />;
            return <MoleculeMark key={key} x={point.x} y={point.y} kind={placement.kind} scale={placement.scale} />;
          }),
        )}
      </g>
      <g className="path-layer path-layer--paper">
        {/*
          THE WHITE CHANNEL AND ITS TWO BOUNDARY RULES ARE GONE, and their
          going is the biggest single change in this pass.
          `.path-channel` was `fill: var(--card)`, which the warm cream regime
          resolves to #ffffff: the paper the entire track was printed on was
          PURE WHITE on a cream page, edged with a hard 2px slate rule each
          side, so the tab read as a white document taped onto cream with two
          vertical rules the committed reference has nowhere. The critic
          measured it live at 390px (body rgb(251,243,230), channel
          rgb(255,255,255), cream surviving only in ~25px flanks) and every
          layer below (15 terraces, 23 marks, 2 grounds, 2 props) was painted
          and then covered by it.

          The channel was not a mistake when it was written: under the lavender
          turn the page ground was #a3aee2 and body copy genuinely could not
          sit on it, so a cream strip under the labels was load bearing. The
          warm cream regime (DESIGN-TOKENS.md, Supersession 2026-09-01) makes
          the PAGE the cream, so every ink on this track was already derived
          against the surface it now sits on, and the strip has nothing left to
          do but hide the landscape. terrain.ts keeps channelPath and
          boundaryPath, and their tests keep passing, because the geometry was
          never the thing that was wrong.
        */}
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

      {/*
        THE TRAIL: the winding drawn ribbon connecting the chips, derived from
        their measured centres (trail.ts). Edges first, then fills, so
        consecutive segments join seamlessly instead of each segment's edge
        overpainting its neighbour's fill. The loop detours are dotted and
        never green; the done stretches ride the fill-on-edge rule pathway.css
        documents. No parallax: the trail is pinned to the track it connects.
      */}
      {(() => {
        const segments = trailSegments(metrics.trail);
        const roads = segments.filter((segment) => !segment.loop);
        return (
          <g className="path-trail">
            {segments
              .filter((segment) => segment.loop)
              .map((segment, index) => (
                <path key={`loop-${index}`} className="path-trail__loop" d={segment.d} />
              ))}
            {roads.map((segment, index) => (
              <path
                key={`edge-${index}`}
                className={segment.done ? "path-trail__edge path-trail__edge--done" : "path-trail__edge"}
                d={segment.d}
              />
            ))}
            {roads.map((segment, index) => (
              <path
                key={`fill-${index}`}
                className={segment.done ? "path-trail__fill path-trail__fill--done" : "path-trail__fill"}
                d={segment.d}
              />
            ))}
          </g>
        );
      })()}

      {/*
        THE PER-CHECKPOINT FLASK LAYER IS GONE, folded into the placement
        table above. It was the only prop in the scene placed by a rule of its
        own ("one every three units, beside the checkpoint panel"), which is
        precisely the scatter the BACKGROUND DOCTRINE names: two placement
        systems in one landscape cannot compose, because neither knows what
        the other drew. There is one table now, and glassware is in it.
      */}

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
