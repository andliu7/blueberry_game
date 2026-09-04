/**
 * A LOOK AT THE TWO SURFACES THIS PIECE OWNS, and nothing else.
 *
 * The R rebuild moved the celebration's composition to the committed image
 * (blueberry_r6-lesson-complete_1788286354.png): the enormous number and Bloom
 * side by side, the headline under them, one row of outlined reason chips, two
 * 3D chips with a thick bottom edge. A change like that is judged on a still,
 * so this probe takes the stills rather than reasoning about them, and it
 * would take the Feed tab's too, once routes.ts resolves #/feed.
 *
 * It is a PROBE, not a measurement: it asserts nothing and it writes no
 * numbers into a results file. capture-economy.mjs stays the capture of
 * record, contrast-audit.mjs stays the arbiter of every colour pair, and this
 * exists so a builder can see the screen it just rebuilt without driving the
 * whole economy suite. Underscore prefix, same as the other probes here.
 *
 * Run it from apps/web with dist already built:
 *   npm run build ; node measurements/_probe-celebration.mjs
 */

import http from "node:http";
import path from "node:path";
import { existsSync } from "node:fs";
import { readFile, mkdir } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { P2_SEEDS, openSeeded, sleep } from "./economy-moments.mjs";

const CHROME = [
  process.env.CHROME_PATH,
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find((candidate) => candidate !== undefined && existsSync(candidate));
if (CHROME === undefined) throw new Error("No Chrome or Edge found. Set CHROME_PATH.");

const distDir = path.resolve(process.cwd(), "dist");
if (!existsSync(path.join(distDir, "index.html"))) throw new Error("dist/index.html not found. Run npm run build first.");

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2" };
const server = http.createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://localhost");
  const target = path.join(distDir, url.pathname === "/" ? "/index.html" : url.pathname);
  if (!target.startsWith(distDir) || !existsSync(target)) return void response.writeHead(404).end("not found");
  response.writeHead(200, { "content-type": MIME[path.extname(target)] ?? "application/octet-stream" });
  response.end(await readFile(target));
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const outDir = path.resolve(process.cwd(), "measurements/_shots-celebration");
await mkdir(outDir, { recursive: true });

const PHONE = { width: 390, height: 844, deviceScaleFactor: 2 };
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--force-device-scale-factor=1", "--hide-scrollbars"] });

for (const theme of ["light", "dark"]) {
  // The settled frame of the reward moment, on the seed that lights every
  // element at once: a streak, a milestone, diamonds and a flawless line.
  const page = await openSeeded(browser, { origin, viewport: PHONE, theme, hash: "?serveAll=1#/pathway", journal: P2_SEEDS.streak, stored: { onboardingDone: true, course: "orgo_2" } });
  await page.screenshot({ path: path.join(outDir, `arrival-${theme}.png`), type: "png" });
  // WALK THE LESSON UNTIL THE MOMENT IS ON SCREEN.
  //
  // driveReward's route through the onboarding lesson is unavailable while
  // that flow is being rebuilt in parallel, and the front door is not this
  // piece's to know, so the probe plays a PATHWAY node instead: pick an
  // option, press the forward control, repeat, and stop the moment the reward
  // stage mounts. It answers by clicking rather than by knowing the answers,
  // so the receipt it produces is whatever the grading gave it. That is fine
  // for a still of the composition and it is why this is a probe and not a
  // measurement: capture-economy.mjs remains the capture of record.
  // Into a lesson the way a student gets there: tap the current node, then
  // START in the sheet that opens.
  const tap = async (point) => {
    if (point === null) return false;
    await page.mouse.move(point.x, point.y);
    await page.mouse.down();
    await sleep(40);
    await page.mouse.up();
    await sleep(450);
    return true;
  };
  await tap(await page.evaluate(() => {
    const node = document.querySelector('[data-node-state="current"], [data-node-kind]');
    if (node === null) return null;
    node.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = node.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }));
  await tap(await page.evaluate(() => {
    const button = [...document.querySelectorAll("button")].find((b) => b.getClientRects().length > 0 && !b.disabled && /^(start|practice)/i.test((b.textContent ?? "").trim()));
    if (button === undefined) return null;
    button.scrollIntoView({ block: "center", behavior: "instant" });
    const rect = button.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }));

  for (let step = 0; step < 40; step += 1) {
    if ((await page.$("[data-reward]")) !== null) break;
    const target = await page.evaluate(() => {
      const scope = document.querySelector("main") ?? document.body;
      const visible = [...scope.querySelectorAll("button")].filter((b) => b.getClientRects().length > 0 && !b.disabled);
      const isForward = (b) => /^(check|continue|next|finish|start|got it)/i.test((b.textContent ?? "").trim());
      const forward = visible.find(isForward);
      const pick = forward ?? visible.find((b) => (b.textContent ?? "").trim().length > 0);
      if (pick === undefined) return null;
      pick.scrollIntoView({ block: "center", behavior: "instant" });
      const rect = pick.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    });
    if (target === null) break;
    await page.mouse.move(target.x, target.y);
    await page.mouse.down();
    await sleep(40);
    await page.mouse.up();
    await sleep(400);
  }
  const result = { reached: (await page.$("[data-reward]")) !== null };

  await sleep(2700);
  await page.screenshot({ path: path.join(outDir, `reward-${theme}.png`), type: "png" });
  console.log(`reward-${theme}: reached=${result.reached}`);
  await page.close();

  // THE FEED TAB IS NOT SHOOTABLE YET, and that is a wiring fact rather than
  // a bug: routes.ts has no `feed` id, so #/feed does not resolve to
  // FeedTab. The integrator owns that table. When the route lands, add a
  // second openSeeded here on #/feed and the pair judges together.
}

await browser.close();
server.close();
console.log(`shots in ${outDir}`);
