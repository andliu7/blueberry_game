/**
 * Does the sheet's START acknowledge the press on the DOWN edge, and inside
 * the 100 ms budget? Presses with a real pointer sequence and reads the
 * composited transform after pointerdown, before pointerup.
 */
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, openSeeded } from "./economy-moments.mjs";

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
const origin = `http://localhost:${server.address().port}`;
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await openSeeded(browser, {
  origin,
  viewport: { width: 390, height: 844, deviceScaleFactor: 1 },
  theme: "light",
  hash: "#/pathway",
  journal: P3_SEED,
  stored: P3_STORED,
});
await page.click(".path-node--current");
await page.waitForSelector(".ns-start", { visible: true, timeout: 10_000 });
await new Promise((r) => setTimeout(r, 400));

/*
 * THE PRESS CANNOT BE MEASURED BY PRESSING IT. START fires its callback on
 * pointerDOWN, by design, so the pathway unmounts the sheet before pointerup
 * and there is no element left to read a transform off. So the pressed frame
 * is forced with CDP's CSS.forcePseudoState, which asks the engine for the
 * :active rendering without dispatching an event: it measures what the
 * browser DRAWS on the down edge, which is the thing the 100 ms row is about.
 * That the callback fires on pointerdown is proved separately, by the sheet
 * being gone the moment the button goes down.
 */
const client = await page.createCDPSession();
await client.send("DOM.enable");
await client.send("CSS.enable");
const { root } = await client.send("DOM.getDocument");
const { nodeId } = await client.send("DOM.querySelector", { nodeId: root.nodeId, selector: ".ns-start" });

const rest = await page.evaluate(() => {
  const el = document.querySelector(".ns-start");
  return { transform: getComputedStyle(el).transform, top: el.getBoundingClientRect().top, shadow: getComputedStyle(el).boxShadow };
});
const t0 = Date.now();
await client.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: ["active"] });
const pressed = await page.evaluate(() => {
  const el = document.querySelector(".ns-start");
  return { transform: getComputedStyle(el).transform, top: el.getBoundingClientRect().top, shadow: getComputedStyle(el).boxShadow };
});
const elapsed = Date.now() - t0;
// One frame in, and again after the 90 ms transition has run out.
await new Promise((r) => setTimeout(r, 20));
const oneFrame = await page.evaluate(() => document.querySelector(".ns-start").getBoundingClientRect().top);
await new Promise((r) => setTimeout(r, 140));
const settled = await page.evaluate(() => document.querySelector(".ns-start").getBoundingClientRect().top);
await client.send("CSS.forcePseudoState", { nodeId, forcedPseudoClasses: [] });

// And the down edge really does act before pointerup: the sheet is gone.
await page.mouse.move(200, 700);
const before = await page.evaluate(() => document.querySelector(".ns-start") !== null);
const startBox = await page.evaluate(() => {
  const r = document.querySelector(".ns-start").getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
});
await page.mouse.move(startBox.x, startBox.y);
await page.mouse.down();
const afterDown = await page.evaluate(() => document.querySelector(".ns-start") !== null);
await page.mouse.up();

console.log(
  JSON.stringify(
    {
      restTransform: rest.transform,
      pressedTransform: pressed.transform,
      travelPxAtOneFrame: Math.round((oneFrame - rest.top) * 100) / 100,
      travelPxSettled: Math.round((settled - rest.top) * 100) / 100,
      restShadowCollapsed: rest.shadow !== pressed.shadow,
      msToPressedFrame: elapsed,
      withinBudget: elapsed < 100,
      startPresentBeforeDown: before,
      startPresentAfterDownBeforeUp: afterDown,
    },
    null,
    1,
  ),
);
await browser.close();
server.close();
