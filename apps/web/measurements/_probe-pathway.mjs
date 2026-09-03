/**
 * A live read of the pathway surface at the reference phone width.
 *
 * Not a gate and not a capture: a probe, so the builder measures the claims
 * the design goals make rather than asserting them from source. It reports
 * the ground colours the critic sampled (body vs whatever the track is
 * printed on), the background inventory, the trail's stroke pair, the fork's
 * rejoin span, and whether the dialogue bubble is drawn at 390px.
 *
 * WALL CLOCKS: none. Everything here is geometry and computed colour.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed } from "./economy-moments.mjs";

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
  await installSeed(page, `http://localhost:${port}/`, P3_SEED, P3_STORED);
  await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
  await new Promise((r) => setTimeout(r, 1600));

  const report = await page.evaluate(() => {
    const cs = (el, prop) => (el === null ? null : getComputedStyle(el).getPropertyValue(prop).trim());
    const scene = document.querySelector(".path-scene");
    const q = (sel) => document.querySelectorAll(sel).length;
    const trailEdge = document.querySelector(".path-trail__edge");
    const trailFill = document.querySelector(".path-trail__fill");
    const bubble = document.querySelector(".path-trackmap__bubble");
    const bubbleBox = bubble === null ? null : bubble.getBoundingClientRect();
    // The diamond's rejoin span: from the concept chip to the gate arch that
    // closes it, inside the SAME unit section.
    const firstUnit = document.querySelector('[data-unit-id="u1"]');
    const concept = firstUnit?.querySelector(".path-fork__concept .path-node") ?? null;
    const gate = firstUnit?.querySelector(".path-gatenode") ?? null;
    const forkArms = firstUnit?.querySelectorAll('.path-fork__arm .path-node').length ?? 0;
    const between =
      concept === null || gate === null
        ? null
        : Math.round(gate.getBoundingClientRect().top - concept.getBoundingClientRect().bottom);
    const sizes = [...document.querySelectorAll(".path-node:not(.path-node--swatch)")].map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)}`;
    });
    return {
      bodyBg: cs(document.body, "background-color"),
      sceneExists: scene !== null,
      channelsDrawn: q(".path-channel"),
      curvesDrawn: q(".path-curve"),
      terraces: q(".path-terrace"),
      clouds: q(".path-cloud"),
      flasks: q(".path-prop"),
      molecules: q(".path-mark"),
      trailEdge: trailEdge === null ? null : `${cs(trailEdge, "stroke")} / ${cs(trailEdge, "stroke-width")}`,
      trailFill: trailFill === null ? null : `${cs(trailFill, "stroke")} / ${cs(trailFill, "stroke-width")}`,
      trailSegments: q(".path-trail__edge"),
      loopThreads: q(".path-trail__loop"),
      gates: q(".path-gatenode"),
      forks: q(".path-fork"),
      hubs: q(".path-hub"),
      loopRows: q(".path-row--loop"),
      videoBadges: q(".path-node__badge--video"),
      bubble: bubble === null ? "absent" : `${cs(bubble, "display")} at ${Math.round(bubbleBox.left)}..${Math.round(bubbleBox.right)} x ${Math.round(bubbleBox.top)}`,
      u1RejoinGapPx: between,
      u1ForkArmChips: forkArms,
      chipSizes: [...new Set(sizes)],
      lockedInFirstUnit: firstUnit === null ? null : firstUnit.querySelectorAll(".path-node--locked").length,
    };
  });
  console.log(width, JSON.stringify(report, null, 1));
  await page.close();
}

await browser.close();
server.close();
