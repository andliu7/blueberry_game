/**
 * Parity-loop captures: the orbit drag and the reaction library, judged
 * against frames extracted from the Alchemie video corpus.
 *
 * Sibling of capture-trainer.mjs, same rules: PNG only, committed script,
 * real PointerEvents, self-checking. Split into its own file because the
 * trainer script drives the SN2 answer and its self checks assert that
 * answer's states; mixing two drive plans behind flags is how a capture stops
 * being reproducible.
 *
 * Usage, from apps/web, after npm run build:
 *   node measurements/capture-parity.mjs [--tag p1]
 *
 * Shots, all light theme (the corpus is one theme; parity is judged there):
 *   parity-<tag>-<reaction>-resting.png   one per registry entry
 *   parity-<tag>-orbit-before.png         hydroxide H at its authored place
 *   parity-<tag>-orbit-mid.png            mid-swing, pointer held, H above O
 *   parity-<tag>-orbit-after.png          released on the far side, resettled
 */

import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import process from "node:process";
import puppeteer from "puppeteer-core";

const VIEWPORT = { width: 1280, height: 900, deviceScaleFactor: 2 };
const SETTLE_MS = 700;
const tagIndex = process.argv.indexOf("--tag");
const TAG = tagIndex === -1 ? "p1" : (process.argv[tagIndex + 1] ?? "p1");

const REACTIONS = ["sn2", "proton-transfer", "carbonyl-addition"];

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
  if (found === undefined) throw new Error("No Chrome or Edge found. Set CHROME_PATH.");
  return found;
}

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) throw new Error("dist/index.html not found. Run npm run build first.");
const shotsDir = path.resolve(process.cwd(), "measurements", "gauntlet-shots");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const file = url.pathname === "/" ? "/index.html" : url.pathname;
  const target = path.join(distDir, file);
  if (!target.startsWith(distDir) || !existsSync(target)) {
    response.writeHead(404).end("not found");
    return;
  }
  response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
  response.end(await readFile(target));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

async function siteAt(page, match) {
  const point = await page.evaluate((source) => {
    const wanted = new Function("t", `return (${source});`);
    const targets = window.__blueberryTargets ?? [];
    const found = targets.find((entry) => wanted(entry.target));
    if (found === undefined) return { error: `no target matched ${source}` };
    const svg = document.querySelector('svg[role="application"]');
    if (svg === null) return { error: "no draw canvas" };
    const ctm = svg.getScreenCTM();
    if (ctm === null) return { error: "no CTM" };
    const seed = svg.createSVGPoint();
    seed.x = found.centre.x;
    seed.y = found.centre.y;
    const screen = seed.matrixTransform(ctm);
    return { x: screen.x, y: screen.y };
  }, match);
  if (point.error !== undefined) throw new Error(point.error);
  return point;
}

async function shoot(page, name) {
  const file = path.join(shotsDir, `${name}.png`);
  const canvas = (await page.$('svg[role="application"]')) ?? (await page.$("section svg"));
  if (canvas === null) throw new Error("no canvas SVG");
  await canvas.screenshot({ path: file, type: "png", captureBeyondViewport: false });
  return file;
}

async function open(browser, reaction) {
  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  await page.goto(`${origin}/?targets=1&reaction=${reaction}#/trainer`, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => (window.__blueberryTargets ?? []).length > 0, { timeout: 10_000 });
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  return page;
}

const browser = await puppeteer.launch({ executablePath: findChrome(), headless: true, args: ["--force-device-scale-factor=2"] });
const results = { reactions: [], orbit: {} };

// One resting shot per registry entry: the reaction-library evidence.
for (const reaction of REACTIONS) {
  const page = await open(browser, reaction);
  const title = await page.evaluate(() => document.querySelector("h2")?.textContent ?? "");
  const file = await shoot(page, `parity-${TAG}-${reaction}-resting`);
  results.reactions.push({ reaction, title, file: path.basename(file) });
  await page.close();
}

// The orbit: press the hydroxide H, swing it in an arc over the O, shoot mid
// swing with the pointer still down, release on the far side, shoot settled.
{
  const page = await open(browser, "sn2");
  await shoot(page, `parity-${TAG}-orbit-before`);

  const h = await siteAt(page, `t.kind === "atom" && t.atomId === "h1"`);
  const o = await siteAt(page, `t.kind === "atom" && t.atomId === "o1"`);
  const radius = Math.hypot(h.x - o.x, h.y - o.y);
  const startAngle = Math.atan2(h.y - o.y, h.x - o.x);
  // Swing 200 degrees anticlockwise in 20 steps: from below-left to upper-right.
  const sweep = (-200 * Math.PI) / 180;
  await page.mouse.move(h.x, h.y);
  await page.mouse.down();
  let mid = null;
  for (let step = 1; step <= 20; step += 1) {
    const angle = startAngle + (sweep * step) / 20;
    const x = o.x + radius * 1.1 * Math.cos(angle);
    const y = o.y + radius * 1.1 * Math.sin(angle);
    await page.mouse.move(x, y);
    await new Promise((resolve) => setTimeout(resolve, 25));
    if (step === 10) mid = await shoot(page, `parity-${TAG}-orbit-mid`);
  }
  await page.mouse.up();
  await new Promise((resolve) => setTimeout(resolve, SETTLE_MS));
  const after = await shoot(page, `parity-${TAG}-orbit-after`);

  // Self check: the H target must have MOVED, and stayed one bond length out.
  const h2 = await siteAt(page, `t.kind === "atom" && t.atomId === "h1"`);
  const o2 = await siteAt(page, `t.kind === "atom" && t.atomId === "o1"`);
  const movedPx = Math.hypot(h2.x - h.x, h2.y - h.y);
  const newRadius = Math.hypot(h2.x - o2.x, h2.y - o2.y);
  results.orbit = { movedPx, radiusBefore: radius, radiusAfter: newRadius, mid: path.basename(mid ?? ""), after: path.basename(after) };
  await page.close();
}

await browser.close();
server.close();

for (const entry of results.reactions) console.log(`${entry.reaction.padEnd(18)} "${entry.title}"  ${entry.file}`);
const drift = Math.abs(results.orbit.radiusAfter - results.orbit.radiusBefore);
console.log(`orbit: moved ${results.orbit.movedPx.toFixed(1)}px, radius ${results.orbit.radiusBefore.toFixed(1)} -> ${results.orbit.radiusAfter.toFixed(1)} (drift ${drift.toFixed(2)}px)`);
await writeFile(path.join(shotsDir, `parity-${TAG}-capture.json`), `${JSON.stringify({ tag: TAG, results }, null, 2)}\n`);

if (results.orbit.movedPx < 30) {
  console.error("The orbit drag did not move the hydrogen. Not judgeable; fix the drive or the feature.");
  process.exit(1);
}
if (drift > 2) {
  console.error("The bond length drifted during the orbit. The constraint is broken; do not judge these.");
  process.exit(1);
}
