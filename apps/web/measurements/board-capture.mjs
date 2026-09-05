/**
 * Capture every screen of the app at real device size, then build a contact
 * sheet so the whole product can be LOOKED AT in one image.
 *
 * This exists because of a finding the owner made on 2026-09-04: the loop had
 * eyes (blind judges screenshot and score) but the orchestrator was reading
 * verdicts instead of looking. A reference nobody opens is not a reference,
 * and the same is true of your own build. Twelve screens per sheet is one
 * image read instead of twelve, which is what makes looking affordable enough
 * to actually do every round.
 *
 * Lives in measurements/ because that is where puppeteer-core resolves.
 */
import { launch } from "puppeteer-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BOARD_BASE ?? "http://localhost:5174";
const OUT = process.env.BOARD_OUT ?? "board";
const W = 393, H = 852;           // iPhone 15/16 Pro logical pixels

/** route, filename, and what has to happen before the shot is honest. */
const SCREENS = [
  ["#/pathway",      "pathway"],
  ["#/trainer",      "trainer"],
  ["#/cards",        "cards"],
  ["#/me",           "me"],
  ["#/periodic",     "periodic"],
  ["#/search",       "search"],
  ["#/courses",      "courses"],
  ["#/leaderboards", "leaderboards"],
  ["#/chat",         "chat"],
  ["#/messages",     "messages"],
];

const chrome =
  process.env.CHROME_PATH ??
  "C:/Program Files/Google/Chrome/Application/chrome.exe";

mkdirSync(OUT, { recursive: true });

const browser = await launch({
  executablePath: chrome,
  headless: "new",
  args: ["--force-device-scale-factor=2", "--hide-scrollbars"],
});

const page = await browser.newPage();
await page.setViewport({ width: W, height: H, deviceScaleFactor: 2, isMobile: true, hasTouch: true });

const report = [];
for (const [hash, name] of SCREENS) {
  await page.goto(BASE + "/" + hash, { waitUntil: "networkidle0" });
  // Let entrance transitions settle. The app animates the trail and the press
  // states, and a shot mid-transition is a shot of a state no student sees.
  await new Promise((r) => setTimeout(r, 900));
  const file = join(OUT, name + ".png");
  await page.screenshot({ path: file });
  const title = await page.evaluate(() => document.title);
  const text = await page.evaluate(() => (document.body.innerText || "").slice(0, 120).replace(/\s+/g, " "));
  report.push({ name, hash, title, text });
  console.log("captured", name, "|", text.slice(0, 70));
}

await browser.close();
writeFileSync(join(OUT, "report.json"), JSON.stringify(report, null, 2));
console.log("\nwrote", report.length, "screens to", OUT);
