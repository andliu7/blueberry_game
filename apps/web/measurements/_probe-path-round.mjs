/**
 * A live read of the four claims this round makes about the pathway, taken
 * off the built page rather than off the source.
 *
 * It is a PROBE and not a gate: nothing here is asserted into a pass or a
 * fail, it prints what the browser actually reports so the numbers in the
 * report are measurements. The gates are vitest, hit-targets.mjs and the
 * contrast audit, and they are run separately.
 *
 *   1. THE PRESS. docs/DESIGN-GOALS.md: "it visibly PRESSES DOWN on pointer
 *      down ... the pressed frame must land inside the 100 ms budget". Read
 *      as the face's own transform before and after a real pointerdown, and
 *      as the wall time from dispatch to the changed computed style.
 *   2. THE REVEAL, goals amended 2026-09-03: at rest the rail shows only the
 *      axis and the berry; hover expands the pill. Read as the pill's
 *      computed opacity in both states, and as the rail's own box before and
 *      after, because the clause says "never a layout shift".
 *   3. THE TRAIL FOLLOWS THE BUTTONS: "A trail that visibly diverges from its
 *      nodes is a failing bug". Read as the distance from every chip's centre
 *      to the nearest point on the drawn ribbon.
 *   4. THE UNLOCK POLICY: no mid-unit node renders locked. Read off the DOM
 *      of the active unit rather than off the model.
 *
 * WALL CLOCKS: none. Every number here is geometry or a computed style.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { S2_SEED, S2_STORED, installSeed } from "./economy-moments.mjs";

const DIST = path.join(process.cwd(), "dist");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png" };
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

for (const width of [390, 1280]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height: width === 390 ? 844 : 900, deviceScaleFactor: 1 });
  await installSeed(page, `http://localhost:${port}/`, S2_SEED, S2_STORED);
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1600));

  /*
   * 2. THE REVEAL: rest, then a real hover ON THE AXIS, and the rail's box
   * across both, because the clause forbids a layout shift.
   */
  const reveal = { rest: null, hover: null, restored: null };
  const readRail = () =>
    page.evaluate(() => {
      const r = document.querySelector(".path-trackmap");
      if (r === null) return null;
      const pill = r.querySelector(".path-trackmap__pill");
      const bubble = r.querySelector(".path-trackmap__bubble");
      const berry = r.querySelector(".path-trackmap__berry");
      const box = r.getBoundingClientRect();
      return {
        pillOpacity: getComputedStyle(pill).opacity,
        pillTransform: getComputedStyle(pill).transform,
        bubbleOpacity: bubble === null ? "absent" : getComputedStyle(bubble).opacity,
        berryOpacity: berry === null ? "absent" : getComputedStyle(berry).opacity,
        axisOpacity: getComputedStyle(r.querySelector(".path-trackmap__axis")).opacity,
        rail: [Math.round(box.width), Math.round(box.height)],
      };
    });
  const railPoint = await page.evaluate(() => {
    const r = document.querySelector(".path-trackmap");
    if (r === null) return null;
    const b = r.getBoundingClientRect();
    // The axis sits 20px in from the rail's left edge; aim at it rather than
    // at the rail's centre, which is what a reader hovering the axis does.
    return { x: b.left + 20, y: b.top + b.height / 2 };
  });
  reveal.rest = await readRail();
  if (railPoint !== null) {
    await page.mouse.move(railPoint.x, railPoint.y);
    await new Promise((r) => setTimeout(r, 320));
    reveal.hover = await readRail();
    await page.mouse.move(railPoint.x + 400, railPoint.y);
    await new Promise((r) => setTimeout(r, 320));
    reveal.restored = await readRail();
  }

  /* 3. THE TRAIL FOLLOWS THE BUTTONS. */
  const trail = await page.evaluate(() => {
    const svg = document.querySelector(".path-scene svg") ?? document.querySelector("svg.path-scene");
    const roads = [...document.querySelectorAll(".path-trail__edge")];
    if (roads.length === 0) return { ok: false, why: "no trail drawn" };
    // Sample every road densely in SCREEN space, so the comparison is against
    // where the ribbon is actually painted rather than against its own
    // untransformed user units.
    const points = [];
    for (const road of roads) {
      const total = road.getTotalLength();
      const ctm = road.getScreenCTM();
      for (let t = 0; t <= total; t += Math.max(2, total / 60)) {
        const p = road.getPointAtLength(t);
        points.push(ctm === null ? p : { x: p.x * ctm.a + p.y * ctm.c + ctm.e, y: p.x * ctm.b + p.y * ctm.d + ctm.f });
      }
    }
    const chips = [...document.querySelectorAll("[data-trail]")].filter((c) => c.getAttribute("data-trail") !== "loop");
    const gaps = chips.map((chip) => {
      const b = chip.getBoundingClientRect();
      // The trail is drawn to the FACE's centre, which sits half a lip above
      // the well's own centre, so that is what the distance is measured to.
      const face = chip.querySelector(".path-node__face")?.getBoundingClientRect() ?? b;
      const cx = face.left + face.width / 2;
      const cy = face.top + face.height / 2;
      let best = Infinity;
      for (const p of points) best = Math.min(best, Math.hypot(p.x - cx, p.y - cy));
      return Math.round(best);
    });
    return { ok: true, chips: chips.length, samples: points.length, maxGapPx: Math.max(...gaps), medianGapPx: gaps.sort((a, b) => a - b)[Math.floor(gaps.length / 2)] };
  });

  /* 4. THE UNLOCK POLICY, read off the rendered DOM. */
  const unlock = await page.evaluate(() => {
    const sections = [...document.querySelectorAll("[data-unit-id]")];
    const rows = sections.map((section) => {
      const nodes = [...section.querySelectorAll(".path-node")];
      const locked = nodes.filter((n) => n.classList.contains("path-node--locked")).length;
      return { unit: section.getAttribute("data-unit-id"), nodes: nodes.length, locked };
    });
    // A unit is "open" if any of its nodes is not locked. In an open unit the
    // policy says NOTHING is locked, so `locked` must be 0 there.
    const open = rows.filter((r) => r.nodes > 0 && r.locked < r.nodes);
    return { units: rows.length, open: open.length, openUnitsWithAnyLock: open.filter((r) => r.locked > 0) };
  });

  /*
   * 4. THE PRESS, and it is measured LAST for a reason worth writing down:
   * a real pointerdown on a chip OPENS THE CHARGE SHEET, which is the correct
   * product behaviour and also a modal over the whole track, so every reading
   * taken after it is a reading of the sheet. An earlier version of this probe
   * pressed first and then reported that the rail's hover reveal did not work,
   * which was the sheet's doing and not the rail's.
   *
   * The press is therefore read in two halves, each with the right instrument:
   *
   *   the CSS CONTRACT, via CDP's forcePseudoState, which is what actually
   *   answers "does :active sink the face by exactly one lip". A dispatched
   *   PointerEvent cannot set :active at all, and a real one is gone before a
   *   computed style can be read across the CDP round trip.
   *
   *   the ACKNOWLEDGEMENT PATH, via a real pointerdown, timed to the sheet
   *   appearing. That is CLAUDE.md's "notices are emitted synchronously on
   *   pointer down" made observable.
   */
  const session = await page.createCDPSession();
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  let press = { ok: false, why: "no pressable chip on screen" };
  const nodeInfo = await page.evaluate(() => {
    const chip = document.querySelector("a.path-node.path-node--press");
    if (chip === null) return null;
    chip.setAttribute("data-probe-chip", "1");
    const b = chip.getBoundingClientRect();
    return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: Math.round(b.width), h: Math.round(b.height) };
  });
  if (nodeInfo !== null) {
    const { root } = await session.send("DOM.getDocument");
    const { nodeId } = await session.send("DOM.querySelector", { nodeId: root.nodeId, selector: "[data-probe-chip]" });
    const readFace = () =>
      page.evaluate(() => {
        const face = document.querySelector("[data-probe-chip] .path-node__face");
        const cs = getComputedStyle(face);
        return { transform: cs.transform, background: cs.backgroundColor };
      });
    const rest = await readFace();
    await session.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
    await new Promise((r) => setTimeout(r, 200));
    const active = await readFace();
    await session.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });

    // The acknowledgement path, on the real pipeline, timed to the sheet.
    const started = Date.now();
    await page.mouse.move(nodeInfo.x, nodeInfo.y);
    await page.mouse.down();
    let sheetMs = null;
    for (let i = 0; i < 60; i += 1) {
      // .ns-sheet is the node sheet's own root (src/pathway-sheet/, another
      // piece's file). It carries no role="dialog", which is noted in the
      // report as an adjacent-code finding rather than changed from here.
      const there = await page.evaluate(() => document.querySelector(".ns-sheet") !== null);
      if (there) {
        sheetMs = Date.now() - started;
        break;
      }
      await new Promise((r) => setTimeout(r, 5));
    }
    await page.mouse.up();
    press = {
      ok: true,
      rest,
      active,
      sinkPx: Number((/matrix\([^)]*?,\s*([-\d.]+)\)$/.exec(active.transform)?.[1] ?? "0")),
      lip: await page.evaluate(() => getComputedStyle(document.querySelector("[data-probe-chip]")).getPropertyValue("--node-lip").trim()),
      darkened: rest.background !== active.background,
      chip: [nodeInfo.w, nodeInfo.h],
      msToSheetOnPointerDown: sheetMs,
    };
  }

  console.log(JSON.stringify({ width, press, reveal, trail, unlock }, null, 2));
  await page.close();
}
await browser.close();
server.close();
