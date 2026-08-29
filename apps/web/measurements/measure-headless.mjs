/**
 * Headless frame-budget measurement, the measurable half of the Phase 4 exit.
 *
 * What it does: serves dist/ over a local static server, opens the demo with
 * ?auto=1 (the animation loops forever) in headless Chromium via
 * puppeteer-core, lets it run for a fixed window, then reads the frame
 * timestamps the page itself records into window.__blueberryFrames (see
 * src/demo/useStepProgress.ts). The numbers are real paint-callback cadence
 * from inside the page, not an external sampler's guess.
 *
 * What it reports: frames observed, average fps, worst frame gap, and the
 * count of frames over 20 ms (a 60 fps frame budget is 16.7 ms; 20 ms allows
 * scheduling noise before a frame counts as dropped).
 *
 * What it is NOT: the device measurement. CLAUDE.md's reference devices are
 * the Pixel 6a and iPhone 12, and a desktop headless number is an upper
 * bound, not a substitute. measure-device.mjs is the script for the real
 * thing.
 *
 * Chrome discovery: set CHROME_PATH to the browser executable, or the script
 * tries the standard Windows install locations. puppeteer-core deliberately
 * ships no browser, so nothing here downloads one.
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const MEASURE_MS = 6000;
const DROP_THRESHOLD_MS = 20;

function findChrome() {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv !== undefined && existsSync(fromEnv)) return fromEnv;
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    `${process.env.LOCALAPPDATA ?? ""}/Google/Chrome/Application/chrome.exe`,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (found === undefined) {
    throw new Error(
      "No Chrome or Edge executable found. Set CHROME_PATH to a Chromium browser executable.",
    );
  }
  return found;
}

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) {
  throw new Error("dist/index.html not found. Run `npm run build` first; this measures the built app.");
}

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.join(distDir, file);
  try {
    const body = await readFile(target);
    response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
    response.end(body);
  } catch {
    response.writeHead(404);
    response.end("not found");
  }
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: true,
  args: ["--disable-gpu-vsync-off", "--force-device-scale-factor=2"],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 412, height: 915, deviceScaleFactor: 2 });
  await page.goto(`http://127.0.0.1:${port}/?auto=1#/trainer`, { waitUntil: "networkidle0" });
  await new Promise((resolve) => setTimeout(resolve, MEASURE_MS));

  const frames = await page.evaluate(() => window.__blueberryFrames ?? []);
  if (frames.length < 30) {
    throw new Error(`Only ${frames.length} frames recorded; the animation did not run.`);
  }

  function stats(stamps) {
    const gaps = [];
    for (let i = 1; i < stamps.length; i += 1) gaps.push(stamps[i] - stamps[i - 1]);
    const total = stamps[stamps.length - 1] - stamps[0];
    const dropped = gaps.filter((gap) => gap > DROP_THRESHOLD_MS).length;
    return {
      frames: stamps.length,
      averageFps: Number((((stamps.length - 1) / total) * 1000).toFixed(1)),
      worstFrameGapMs: Number(Math.max(...gaps).toFixed(1)),
      framesOver20ms: dropped,
      droppedFramePercent: Number(((dropped / gaps.length) * 100).toFixed(2)),
    };
  }

  // Steady state discards the first second: the page-load hitch (layout, font,
  // first paint) lands there and is a startup cost, not animation cadence. Both
  // windows are reported; hiding the cold start would overstate the result.
  const WARMUP_MS = 1000;
  const first = frames[0];
  const steady = frames.filter((stamp) => stamp - first >= WARMUP_MS);

  const results = {
    measured: new Date().toISOString(),
    environment: "headless Chromium on the development machine. Upper bound, not a device number.",
    viewport: "412x915 at 2x, a Pixel-class logical size",
    windowMs: MEASURE_MS,
    wholeRunIncludingLoad: stats(frames),
    steadyStateAfterWarmup: stats(steady),
    warmupDiscardMs: WARMUP_MS,
    target: "60 fps sustained during bond formation, per the Budgets table",
  };

  await writeFile(
    path.resolve(process.cwd(), "measurements", "headless-results.json"),
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
  console.log(JSON.stringify(results, null, 2));
} finally {
  await browser.close();
  server.close();
}
