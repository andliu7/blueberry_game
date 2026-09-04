/**
 * THE LAG, MEASURED IN A REAL BROWSER, and the flow's frame cadence with it.
 *
 * The owner reported the same defect twice: "every time I scroll the path lags
 * behind the buttons." docs/DESIGN-GOALS.md names the cause as structural (a
 * sticky trail re-placed from a scroll callback can never beat compositor
 * scrolling) and the fix as architectural (the trail moves into the unit
 * sections, in the same scrolling layer as the chips). This script measures
 * whether the fix actually landed on the built page.
 *
 * It is a PROBE, not a gate: it prints what the browser reports. The gates are
 * vitest (test/pathwayTrailLayer.test.ts pins the architecture), hit-targets
 * and the contrast audit.
 *
 * FOUR BLOCKS.
 *
 * 1. THE LAYER. For a real chip and the real ribbon segment beside it, walk
 *    both element chains up to the scrolling element and report the nearest
 *    shared ancestor, plus every position:sticky or position:fixed ancestor
 *    found on the way. This is the honest form of "they move together": two
 *    boxes inside one non-sticky subtree of the scroller are moved by the
 *    compositor in one operation, and no callback can be late for it. On the
 *    old build the ribbon's chain reached a position:sticky svg and the two
 *    chains only met at the stage, one sticky boundary apart.
 *
 * 2. THE DIVERGENCE. The distance from the chip's centre to the nearest point
 *    on the drawn ribbon, sampled at seven scroll positions. If the ribbon is
 *    placed by a scroll callback this number moves with scroll (the S3 critic
 *    measured 198px at scrollY 0 falling to 0 by 400); if it rides the same
 *    layer the number is a constant, whatever the page does.
 *
 * 3. THE PER-FRAME WRITES. CSSStyleDeclaration.setProperty and setAttribute
 *    are wrapped for the duration of a scripted scroll and every write landing
 *    on or inside a trail element is counted. The fix's whole claim is that
 *    this number is zero: JavaScript is out of the loop.
 *
 * 4. THE FLOW'S FRAME CADENCE. The progress flow's CSS animation is started on
 *    every walked stretch on screen AT ONCE, which is strictly worse than the
 *    real staggered run, and frame gaps are collected from inside the page
 *    while it plays. Reported as average fps and worst frame.
 *
 * 5. REDUCED MOTION. The end state with no travel, which is what the goals
 *    ask for: the walked stretch is full length, no dash, no animation.
 *
 * WALL CLOCKS: only where a frame rate is the measurement. Everything in
 * blocks 1 to 3 is geometry or a counter.
 *
 * WHAT IT MEASURED, 2026-09-04, run against the build before this change and
 * the build after it. _probe-trail-lag.before.json is the first column and
 * _probe-trail-lag.json is the second.
 *
 *                                      before          after
 *   shared ancestor of chip + ribbon   none found      section.path-unit
 *   sticky boxes above the ribbon      svg.path-scene  none
 *   chip to ribbon, settled            0.1px           0.1px
 *   chip to ribbon, one frame after    110 to 174px    0 to 0.1px
 *   trail writes per scripted scroll   201 to 232      0
 *   fps during that scroll, phone      46.2            56.2
 *   fps during that scroll, desktop    40.2            51.7
 *   worst frame during that scroll     50.1ms          33.5ms
 *   fps during the flow animation      n/a             60.0
 *
 * The SETTLED row is the whole reason this bug survived three rounds of
 * captures: at rest the old trail was exactly where it belonged, and only the
 * frame after a scroll told the truth. The remaining dropped frames during
 * scroll belong to the sticky background parallax, which still reads two
 * rects per frame and which the owner's direction explicitly leaves sticky.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { LOCAL_TZ, S2_SEED, S2_STORED, installSeed, noonDaysAgo } from "./economy-moments.mjs";

/**
 * A WALKED UNIT, which the shared S2 seed does not have.
 *
 * S2 clears two nodes that are not adjacent on the spine, and a stretch is
 * only done when BOTH its ends are, so that seed draws no green ribbon at all
 * and block 4 would have nothing to animate. This clears unit one's spine in
 * document order, which is what a student who has walked a unit actually
 * looks like and is the state the flow exists for.
 */
const WALKED = ["u1-allylic", "u1-nbs", "u1-da", "u1-ied", "u1-poly", "u1-kvt", "u1-12v14"];
const SEED = [
  ...S2_SEED,
  ...WALKED.map((nodeId, index) => ({
    kind: "node_cleared",
    at: noonDaysAgo(8 - index),
    tz: LOCAL_TZ,
    nodeId,
    nodeKind: "reaction",
    flawless: true,
    stepsInOneSitting: 1,
    spine: true,
    difficulty: 3,
  })),
];

const DIST = path.join(process.cwd(), "dist");
const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
};
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(req.url.split("?")[0]);
  let f = path.join(DIST, p);
  if (!existsSync(f) || p === "/") f = path.join(DIST, "index.html");
  try {
    const b = await readFile(f);
    res.writeHead(200, { "content-type": MIME[path.extname(f)] ?? "application/octet-stream" });
    res.end(b);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });

const report = {};
for (const [label, width, height] of [
  ["phone", 390, 844],
  ["desk", 1280, 900],
]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await installSeed(page, `http://localhost:${port}/`, SEED, S2_STORED);
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1400));

  // 1. THE LAYER.
  const layer = await page.evaluate(() => {
    const chain = (element) => {
      const out = [];
      let node = element;
      while (node !== null && node !== document.documentElement) {
        out.push(node);
        node = node.parentElement;
      }
      return out;
    };
    const describe = (element) =>
      `${element.tagName.toLowerCase()}${element.className && typeof element.className === "string" ? "." + element.className.trim().split(/\s+/)[0] : ""}`;
    const section = document.querySelector("[data-unit-id]");
    if (section === null) return { error: "no unit section" };
    const chip = section.querySelector("[data-trail]");
    const ribbon = section.querySelector(".path-unit-trail path, .path-trail path");
    if (chip === null || ribbon === null) return { error: "no chip or no ribbon" };
    const chipChain = chain(chip);
    const ribbonChain = chain(ribbon);
    const shared = ribbonChain.find((node) => chipChain.includes(node)) ?? null;
    const stuck = (elements) =>
      elements
        .filter((node) => ["sticky", "fixed"].includes(getComputedStyle(node).position))
        .map((node) => `${describe(node)} [${getComputedStyle(node).position}]`);
    return {
      sharedAncestor: shared === null ? null : describe(shared),
      // How many boxes up from the ribbon that shared ancestor is: 1 means
      // the ribbon is a direct child of the box the chips are in.
      ribbonDepthToShared: shared === null ? -1 : ribbonChain.indexOf(shared),
      chipDepthToShared: shared === null ? -1 : chipChain.indexOf(shared),
      stickyAboveRibbon: stuck(ribbonChain),
      stickyAboveChip: stuck(chipChain),
      scroller: document.scrollingElement === document.documentElement ? "documentElement" : "other",
    };
  });

  // 2. THE DIVERGENCE, settled and one frame after the scroll.
  //
  // TWO READS PER POSITION, and the second one is the measurement that names
  // the bug. SETTLED is taken after the page has been left alone, which is
  // what a screenshot sees and is why the defect never showed up in one.
  // IMMEDIATE is taken in the SAME JavaScript turn as the scroll: scrolling is
  // synchronous for layout, so the chips have already moved, while a trail
  // placed from a rAF callback has not been rewritten yet. That gap IS the
  // frame the owner has been looking at. On a trail that rides the same layer
  // there is nothing to rewrite and the two numbers are the same.
  //
  // Points are mapped through getScreenCTM, so every ancestor transform and
  // viewBox scale is honoured whichever architecture is live.
  const divergence = [];
  for (const y of [0, 300, 700, 1400, 2800, 4200, 6000]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "auto" }), y);
    await new Promise((r) => setTimeout(r, 260));
    divergence.push(
      await page.evaluate((top) => {
        const vh = window.innerHeight;
        const onScreen = (r) => r.bottom > 8 && r.top < vh - 8 && r.width > 0;
        // The FALLBACK is what makes this an A/B rather than a self-portrait.
        // On the fixed build every section owns its ribbon; on the old build
        // there is one ribbon for the whole page, inside the sticky scene, so
        // without this the loop would find nothing to compare a chip against
        // and report a clean zero for the architecture it is supposed to catch.
        const global = [...document.querySelectorAll(".path-trail path")];
        const worstNow = () => {
          let worst = 0;
          let counted = 0;
          for (const section of document.querySelectorAll("[data-unit-id]")) {
            const own = [...section.querySelectorAll(".path-unit-trail path, .path-trail path")];
            const paths = own.length > 0 ? own : global;
            if (paths.length === 0) continue;
            for (const chip of section.querySelectorAll("[data-trail]")) {
              const box = chip.getBoundingClientRect();
              if (!onScreen(box)) continue;
              const cx = box.left + box.width / 2;
              const cy = box.top + box.height / 2;
              let best = Infinity;
              for (const p of paths) {
                const total = p.getTotalLength?.() ?? 0;
                if (total === 0) continue;
                const ctm = p.getScreenCTM();
                if (ctm === null) continue;
                const owner = p.ownerSVGElement;
                for (let i = 0; i <= 24; i += 1) {
                  const at = p.getPointAtLength((total * i) / 24);
                  const seed = owner.createSVGPoint();
                  seed.x = at.x;
                  seed.y = at.y;
                  const screen = seed.matrixTransform(ctm);
                  best = Math.min(best, Math.hypot(screen.x - cx, screen.y - cy));
                }
              }
              if (best !== Infinity) {
                worst = Math.max(worst, best);
                counted += 1;
              }
            }
          }
          return { worst: Number(worst.toFixed(1)), counted };
        };
        const settled = worstNow();
        // Scroll, then read WITHOUT yielding. No rAF has run in between.
        window.scrollTo({ top: top + 240, behavior: "auto" });
        const immediate = worstNow();
        window.scrollTo({ top, behavior: "auto" });
        return {
          scrollY: top,
          chips: settled.counted,
          settledWorstPx: settled.worst,
          oneFrameAfterScrollWorstPx: immediate.worst,
        };
      }, y),
    );
  }

  // 3. THE PER-FRAME WRITES during a scripted scroll.
  const writes = await page.evaluate(async () => {
    // A write COUNTS if it lands on the ribbon or on any box that contains
    // it. The second half matters for the A/B: the old build rewrote a CSS
    // variable on the sticky <svg> that HOLDS the trail rather than on the
    // trail itself, so a test that only looked inside the ribbon would have
    // reported a clean zero for the architecture it exists to catch.
    const inTrail = (element) =>
      element instanceof Element &&
      (element.closest(".path-unit-trail, .path-trail") !== null ||
        element.querySelector(".path-unit-trail, .path-trail") !== null);
    const setProperty = CSSStyleDeclaration.prototype.setProperty;
    const setAttribute = Element.prototype.setAttribute;
    let trailWrites = 0;
    let sceneWrites = 0;
    // element.style writes have no public back-pointer to their element, so
    // the trail's own per-frame writes are caught by the MutationObserver
    // below (a style write mutates the style attribute) and this counter only
    // reports the total custom-property traffic on the page, which is the
    // background parallax and is allowed.
    CSSStyleDeclaration.prototype.setProperty = function (...args) {
      if (typeof args[0] === "string" && args[0].startsWith("--")) sceneWrites += 1;
      return setProperty.apply(this, args);
    };
    Element.prototype.setAttribute = function (...args) {
      if (inTrail(this)) trailWrites += 1;
      return setAttribute.apply(this, args);
    };
    const observer = new MutationObserver((records) => {
      for (const record of records) if (inTrail(record.target)) trailWrites += 1;
    });
    observer.observe(document.body, {
      subtree: true,
      attributes: true,
      childList: true,
      attributeFilter: ["d", "style", "transform", "viewBox", "class", "width", "height"],
    });

    const start = performance.now();
    let y = 0;
    const frames = [];
    await new Promise((resolve) => {
      const step = (t) => {
        frames.push(t);
        y += 40;
        window.scrollTo({ top: y, behavior: "auto" });
        if (performance.now() - start > 1800) resolve();
        else requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    const gaps = frames.slice(1).map((t, i) => t - frames[i]).sort((a, b) => a - b);
    const span = frames[frames.length - 1] - frames[0];
    observer.disconnect();
    CSSStyleDeclaration.prototype.setProperty = setProperty;
    Element.prototype.setAttribute = setAttribute;
    return {
      scrolledToPx: y,
      trailGeometryWrites: trailWrites,
      cssVariableWritesAnywhere: sceneWrites,
      scrollFps: Number(((frames.length - 1) / (span / 1000)).toFixed(1)),
      scrollWorstFrameMs: Number(gaps[gaps.length - 1].toFixed(2)),
      scrollFramesOver20ms: gaps.filter((g) => g > 20).length,
    };
  });

  // 4. THE FLOW'S FRAME CADENCE.
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await new Promise((r) => setTimeout(r, 300));
  const flow = await page.evaluate(async () => {
    const groups = [...document.querySelectorAll(".path-trail__done")];
    const onScreen = groups;
    if (onScreen.length === 0) return { error: "no walked stretch on screen" };
    // Worse than the real run on purpose: every leg starts at once instead of
    // one after another, so nothing is hidden behind the stagger.
    for (const group of onScreen) {
      group.style.setProperty("--flow-index", "0");
      group.classList.add("path-trail__done--flow");
    }
    const frames = [];
    await new Promise((resolve) => {
      const start = performance.now();
      const tick = (t) => {
        frames.push(t);
        if (t - start > 900) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
    for (const group of onScreen) group.classList.remove("path-trail__done--flow");
    const gaps = frames.slice(1).map((t, i) => t - frames[i]);
    gaps.sort((a, b) => a - b);
    const total = frames[frames.length - 1] - frames[0];
    return {
      animatedStretches: onScreen.length,
      frames: frames.length,
      averageFps: Number(((frames.length - 1) / (total / 1000)).toFixed(1)),
      medianFrameMs: Number(gaps[Math.floor(gaps.length / 2)].toFixed(2)),
      worstFrameMs: Number(gaps[gaps.length - 1].toFixed(2)),
      framesOver20ms: gaps.filter((g) => g > 20).length,
    };
  });

  // 5. REDUCED MOTION: the colour changes, nothing travels.
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await page.reload({ waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1200));
  const reduced = await page.evaluate(() => {
    const groups = [...document.querySelectorAll(".path-trail__done")];
    if (groups.length === 0) return { error: "no walked stretch" };
    // Even if the class ever reached a reduced-motion viewer, the end state is
    // what must be on screen: full length, no dash, no running animation.
    for (const group of groups) group.classList.add("path-trail__done--flow");
    const style = getComputedStyle(groups[0]);
    const out = {
      walkedStretches: groups.length,
      animationName: style.animationName,
      strokeDasharray: style.strokeDasharray,
      strokeDashoffset: style.strokeDashoffset,
      runningAnimations: document.getAnimations().filter((a) => a.playState === "running").length,
    };
    for (const group of groups) group.classList.remove("path-trail__done--flow");
    return out;
  });
  await page.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "no-preference" }]);

  report[label] = { layer, divergence, writes, flow, reduced };
  await page.close();
}

await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
