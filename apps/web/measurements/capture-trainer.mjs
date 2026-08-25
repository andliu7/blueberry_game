/**
 * Lossless capture of the Mechanism Trainer, for the gauntlet loop's blind
 * comparison against docs/reference/alchemie/.
 *
 * WHY THIS EXISTS. STATUS.md records a method error worth not repeating: three
 * pathway rounds were judged from JPEG captures, and at 68 px on a near black
 * ground JPEG smears a hard terminator into what two critics separately called
 * a radial gradient. The computed styles had neither. Rounds of work went into
 * chasing a compression artifact. So captures are PNG here, never JPEG, and the
 * script is committed rather than improvised per round, because an improvised
 * capture is a capture nobody can reproduce when the verdict is disputed.
 *
 * WHAT IT DOES. Serves apps/web/dist over a local static server, opens the
 * trainer, drives the five taps that complete the S_N2 answer, and writes one
 * PNG per theme of the canvas alone, cropped to the drawing surface, plus one
 * of the whole tab for context.
 *
 * HOW IT CLICKS. Every drop site is drawn into a single SVG with no element of
 * its own, so there is no selector for "the oxygen's second lone pair".
 * TrainerTab publishes the geometry on window.__blueberryTargets behind
 * ?targets=1, the same family as window.__blueberryFrames, and this script maps
 * those user units to client px through the SVG's own getScreenCTM. The taps go
 * in as real PointerEvents through page.mouse, so the machine sees the same
 * press, move and release a finger produces.
 *
 * WHAT IT IS NOT. It is not a verdict, and it is not a frame measurement. It
 * produces the artifact a critic reads. measure-headless.mjs is the frame
 * script, and it stays the one that talks about fps.
 *
 * Usage, from apps/web:
 *   npm run build
 *   node measurements/capture-trainer.mjs [--tag r7]
 *
 * Chrome discovery matches measure-headless.mjs: CHROME_PATH, else the standard
 * Windows install locations. puppeteer-core ships no browser and nothing here
 * downloads one.
 */

import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: 2 };
const SETTLE_MS = 700;

const tagIndex = process.argv.indexOf("--tag");
const TAG = tagIndex === -1 ? "latest" : (process.argv[tagIndex + 1] ?? "latest");

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
  throw new Error("dist/index.html not found. Run `npm run build` first; this captures the built app.");
}
const shotsDir = path.resolve(process.cwd(), "measurements", "gauntlet-shots");

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
};

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.join(distDir, file);
  if (!target.startsWith(distDir) || !existsSync(target)) {
    response.writeHead(404).end("not found");
    return;
  }
  const body = await readFile(target);
  response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
  response.end(body);
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
const origin = `http://127.0.0.1:${port}`;

/**
 * Client px for one drop site, read out of the page.
 *
 * `match` runs against each published target and returns true for the one
 * wanted. It is a source string rather than a function because it crosses into
 * the page's own context.
 */
async function siteAt(page, match) {
  const point = await page.evaluate((source) => {
    const wanted = new Function("t", `return (${source});`);
    const targets = window.__blueberryTargets ?? [];
    const found = targets.find((entry) => wanted(entry.target));
    if (found === undefined) {
      return { error: `no target matched ${source}. published: ${targets.map((e) => JSON.stringify(e.target)).join(", ")}` };
    }
    const svg = document.querySelector('svg[role="application"]');
    if (svg === null) return { error: "the draw canvas is not on screen" };
    const ctm = svg.getScreenCTM();
    if (ctm === null) return { error: "the canvas has no screen CTM, so it is not rendered" };
    const seed = svg.createSVGPoint();
    seed.x = found.centre.x;
    seed.y = found.centre.y;
    const screen = seed.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
  }, match);
  if (point.error !== undefined) throw new Error(point.error);
  return point;
}

/** One tap: press, hold a frame, release, on the same spot. */
async function tap(page, point) {
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  await new Promise((resolve) => setTimeout(resolve, 40));
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, 160));
}

async function tapSite(page, match) {
  await tap(page, await siteAt(page, match));
}

/**
 * The five taps of the answer, in the order TUTORIAL_STEPS names them.
 *
 * Both arrows, so the capture is a COMPLETED answer. Round five's verdict found
 * two defects a mid drag could not show, which is why this drives to the end.
 */
async function drawTheAnswer(page) {
  // 1. the oxygen, which reveals its lone pairs
  await tapSite(page, `t.kind === "atom" && t.atomId === "o1"`);
  // 2. one lone pair, arming the source
  await tapSite(page, `t.kind === "lonePair" && t.atomId === "o1" && t.slotIndex === 0`);
  // 3. the forming O to C bond, which is where those electrons land
  await tapSite(page, `t.kind === "betweenAtomsSite" && t.atomIds.includes("o1") && t.atomIds.includes("c1")`);
  // 4. the C-Br bond's handle at the bromine end: the bond is the source now
  await tapSite(page, `t.kind === "bondEndHandle" && t.bondId === "b-cbr" && t.atomId === "br1"`);
  // 5. bromine, which keeps the pair as it leaves
  await tapSite(page, `t.kind === "atom" && t.atomId === "br1"`);
}

async function shoot(page, name) {
  const file = path.join(shotsDir, `${name}.png`);
  const canvas = await page.$('svg[role="application"]');
  if (canvas === null) throw new Error("the draw canvas is not on screen");
  // The canvas alone, which is what the bar's captures show, and the tab around
  // it, because a critic judging the trainer judges the strip and the header too.
  await canvas.screenshot({ path: file, type: "png", captureBeyondViewport: false });
  await page.screenshot({ path: path.join(shotsDir, `${name}-tab.png`), type: "png" });
  return file;
}

async function captureTheme(browser, theme) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.evaluateOnNewDocument((wanted) => {
    localStorage.setItem("theme", wanted);
    document.documentElement.classList.toggle("dark", wanted === "dark");
  }, theme);
  await page.goto(`${origin}/?targets=1#/trainer`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => (window.__blueberryTargets ?? []).length > 0, { timeout: 10_000 });
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

  await drawTheAnswer(page);
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));

  const arrows = await page.evaluate(() => document.querySelectorAll('path[marker-end="url(#draw-arrowhead)"]').length);
  const file = await shoot(page, `trainer-${TAG}-${theme}-committed`);
  await page.close();
  return { theme, file, arrows };
}

const browser = await puppeteer.launch({
  executablePath: findChrome(),
  headless: "new",
  args: ["--force-device-scale-factor=2", "--font-render-hinting=none"],
});

await mkdir(shotsDir, { recursive: true });
const results = [];
try {
  for (const theme of ["light", "dark"]) {
    results.push(await captureTheme(browser, theme));
  }
} finally {
  await browser.close();
  server.close();
}

for (const result of results) {
  // The arrow count is the capture's own check that it drew the answer rather
  // than photographing an empty canvas. Two arrows is the S_N2 step.
  const state = result.arrows === 2 ? "committed, 2 arrows" : `INCOMPLETE, ${result.arrows} arrow(s) drawn`;
  console.log(`${result.theme.padEnd(5)} ${state}  ${path.relative(process.cwd(), result.file)}`);
}
await writeFile(
  path.join(shotsDir, `trainer-${TAG}-capture.json`),
  `${JSON.stringify({ tag: TAG, viewport: VIEWPORT, results }, null, 2)}\n`,
);
if (results.some((result) => result.arrows !== 2)) {
  console.error("A capture did not reach a completed answer. The shots are not judgeable; fix the drive, do not judge these.");
  process.exit(1);
}
