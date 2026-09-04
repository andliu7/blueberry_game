/**
 * A live read of the pathway claims THIS round makes, taken off the built
 * page rather than off the source.
 *
 * It is a PROBE and not a gate: nothing here is asserted into a pass or a
 * fail, it prints what the browser reports so the numbers in the report are
 * measurements. The gates are vitest, hit-targets.mjs and the contrast audit.
 *
 * Each block answers one line of the critic's must-fix list:
 *
 *   1. FORK DENSITY. "the image shows one fork per screen. The build shows
 *      four simultaneous forks at scrollY 0 and 2800, and six at 4200."
 *      Counted as detour MOUTHS whose chips fall inside the viewport, plus
 *      diamond forks, per scroll position.
 *   2. THE LATTICE. "five stopwatch challenge chips render as a 3-then-2
 *      lattice and four of the five have NO connector." Counted as chips
 *      sharing a row band, and as chips with no drawn ribbon within reach.
 *   3. THE SPINE. "a perfectly straight vertical line with four side loops
 *      hung off it." Read as the spread of spine-chip x within a viewport.
 *   4. PROPS ON NODES. "a cloud overlaps the top-left challenge chip."
 *      Counted as background prop boxes intersecting chip or signpost boxes.
 *   5. THE AXIS. "starts and stops partway down the viewport with hard ends."
 *      Read as the rail's box against the track area's box.
 *   6. NODE STATES. The completed face, its ink and its wall; the locked
 *      face and its ink; and whether a locked chip is focusable and presses.
 *
 * WALL CLOCKS: none. Every number here is geometry or a computed style, and
 * the seed is the fixed S2 journal (measurements/gauntlet-economy/LOG.md,
 * "The instruments that only worked before dark").
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

const report = {};
for (const [label, width, height] of [["phone", 390, 844], ["desk", 1280, 900]]) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await installSeed(page, `http://localhost:${port}/`, S2_SEED, S2_STORED);
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1400));

  const perScroll = [];
  for (const y of [0, 700, 1400, 2800, 4200]) {
    await page.evaluate((top) => window.scrollTo({ top, behavior: "auto" }), y);
    await new Promise((r) => setTimeout(r, 600));
    perScroll.push(
      await page.evaluate(() => {
        const vh = window.innerHeight;
        const onScreen = (r) => r.bottom > 0 && r.top < vh && r.width > 0;
        const chips = [...document.querySelectorAll("[data-trail]")].map((el) => ({
          lane: el.dataset.trail,
          r: el.getBoundingClientRect(),
        }));
        const visible = chips.filter((c) => onScreen(c.r));
        // A detour MOUTH: the first chip of a contiguous run of loop-lane
        // anchors in document order. One mouth is one visible fork.
        let mouths = 0;
        for (let i = 0; i < chips.length; i += 1) {
          if (chips[i].lane !== "loop") continue;
          if (i > 0 && chips[i - 1].lane === "loop") continue;
          let j = i;
          while (j < chips.length && chips[j].lane === "loop") j += 1;
          if (chips.slice(i, j).some((c) => onScreen(c.r))) mouths += 1;
        }
        const diamonds = [...document.querySelectorAll(".path-fork")].filter((el) =>
          onScreen(el.getBoundingClientRect()),
        ).length;
        const hubs = [...document.querySelectorAll(".path-hub")].filter((el) =>
          onScreen(el.getBoundingClientRect()),
        ).length;

        // Chips sharing a horizontal band: the lattice signature.
        const bands = new Map();
        for (const c of visible) {
          const key = Math.round((c.r.top + c.r.height / 2) / 24);
          bands.set(key, (bands.get(key) ?? 0) + 1);
        }
        const widestBand = Math.max(0, ...bands.values());

        // Every visible chip must have drawn ribbon within reach of its edge.
        const paths = [...document.querySelectorAll(".path-trail path, .path-hub__spoke")];
        const svg = document.querySelector(".path-scene");
        const svgBox = svg === null ? { left: 0, top: 0 } : svg.getBoundingClientRect();
        let orphans = 0;
        let worstGap = 0;
        for (const c of visible) {
          const cx = c.r.left + c.r.width / 2 - svgBox.left;
          const cy = c.r.top + c.r.height / 2 - svgBox.top;
          let best = Infinity;
          for (const p of paths) {
            const total = p.getTotalLength?.() ?? 0;
            if (total === 0) continue;
            for (let t = 0; t <= 1.0001; t += 0.05) {
              const q = p.getPointAtLength(total * t);
              const d = Math.hypot(q.x - cx, q.y - cy);
              if (d < best) best = d;
            }
          }
          if (best > 46) orphans += 1;
          if (best !== Infinity) worstGap = Math.max(worstGap, Math.round(best));
        }

        // Spine spread: how far the road actually wanders on this screen.
        const spineX = visible.filter((c) => c.lane === "main").map((c) => Math.round(c.r.left + c.r.width / 2));
        const spread = spineX.length < 2 ? 0 : Math.max(...spineX) - Math.min(...spineX);

        // Props over chips or signposts.
        const keep = [
          ...visible.map((c) => c.r),
          ...[...document.querySelectorAll(".path-banner")].map((el) => el.getBoundingClientRect()).filter(onScreen),
        ];
        let propHits = 0;
        let props = 0;
        for (const el of document.querySelectorAll(".path-layer--marks > *")) {
          const r = el.getBoundingClientRect();
          if (!onScreen(r) || r.width === 0) continue;
          props += 1;
          for (const k of keep) {
            if (r.right > k.left && r.left < k.right && r.bottom > k.top && r.top < k.bottom) {
              propHits += 1;
              break;
            }
          }
        }
        return { mouths, diamonds, hubs, forks: mouths + diamonds + hubs, chips: visible.length, widestBand, orphans, worstGap, spineSpread: spread, props, propHits };
      }),
    );
  }

  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "auto" }));
  await new Promise((r) => setTimeout(r, 500));
  const rest = await page.evaluate(() => {
    const px = (v) => Math.round(v);
    const rail = document.querySelector(".path-trackmap");
    const railBox = rail?.getBoundingClientRect();
    const pill = document.querySelector(".path-trackmap__pill");
    const axis = document.querySelector(".path-trackmap__axis");
    const done = document.querySelector(".path-node--done");
    const doneFace = done?.querySelector(".path-node__face");
    const doneMark = done?.querySelector("svg, path");
    const locked = document.querySelector(".path-node--locked");
    const lockedFace = locked?.querySelector(".path-node__face");
    const cs = (el) => (el === null || el === undefined ? null : getComputedStyle(el));
    return {
      rail: railBox === undefined ? null : { top: px(railBox.top), height: px(railBox.height), viewport: px(window.innerHeight) },
      pillOpacity: cs(pill)?.opacity ?? null,
      axisHeight: axis === null ? null : px(axis.getBoundingClientRect().height),
      berryOnRail: document.querySelectorAll(".path-trackmap__berry").length,
      berryInWorld: document.querySelectorAll(".path-berry").length,
      doneFace: cs(doneFace)?.backgroundColor ?? null,
      doneBorder: cs(doneFace)?.borderTopColor ?? null,
      doneWall: cs(done)?.backgroundColor ?? null,
      doneInk: cs(doneMark)?.color ?? cs(done)?.color ?? null,
      lockedFace: cs(lockedFace)?.backgroundColor ?? null,
      lockedWall: cs(locked)?.backgroundColor ?? null,
      lockedLine: cs(lockedFace)?.borderTopColor ?? null,
      lockedInk: cs(locked)?.color ?? null,
      lockedTag: locked?.tagName ?? null,
      lockedDisabled: locked?.getAttribute("aria-disabled") ?? null,
      lockedFocusable: locked === null ? null : locked.tabIndex >= 0,
      lockedHasPress: locked?.classList.contains("path-node--press") ?? null,
    };
  });

  // The locked chip's press, on pointer down, measured as a real transform.
  const press = await page.evaluate(async () => {
    const locked = document.querySelector(".path-node--locked");
    if (locked === null) return null;
    const face = locked.querySelector(".path-node__face");
    const before = getComputedStyle(face).transform;
    const box = locked.getBoundingClientRect();
    const t0 = performance.now();
    locked.dispatchEvent(
      new PointerEvent("pointerdown", { bubbles: true, clientX: box.left + box.width / 2, clientY: box.top + box.height / 2, pointerId: 1 }),
    );
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const after = getComputedStyle(face).transform;
    return { before, after, ms: Math.round(performance.now() - t0), moved: before !== after };
  });

  report[label] = { perScroll, rest, press };
  await page.close();
}
await browser.close();
server.close();
console.log(JSON.stringify(report, null, 2));
