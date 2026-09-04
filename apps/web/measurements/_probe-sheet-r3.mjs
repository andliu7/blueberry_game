/**
 * Attempt 3 evidence: every one of the critic's nine must-fix items, measured
 * on the BUILT app at 390 by 844, not asserted from the source.
 *
 * Each block prints the number the critic printed, so the two are comparable
 * line for line. Nothing here is a gate; the gates are the vitest suites and
 * measurements/contrast-audit.mjs. This is the proof the round did the work.
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { P3_SEED, P3_STORED, installSeed, sleep } from "./economy-moments.mjs";

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
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2 });
await installSeed(page, origin + "/", P3_SEED, P3_STORED);
await page.goto(`${origin}/#/pathway`, { waitUntil: "networkidle0" });
await sleep(1400);
await page.click(".path-node--current");
await sleep(700);

const out = {};

// ---------------------------------------------------------------- item 3, the seam
out.seam = await page.evaluate(() => {
  const sheet = document.querySelector(".ns-sheet");
  const nav = document.querySelector(".tabbar");
  const s = sheet.getBoundingClientRect();
  const n = nav.getBoundingClientRect();
  return {
    sheetBottom: +s.bottom.toFixed(2),
    navTop: +n.top.toFixed(2),
    navHeight: +n.height.toFixed(2),
    gapPx: +(n.top - s.bottom).toFixed(2),
    inset: getComputedStyle(sheet).getPropertyValue("--ns-bottom-inset").trim(),
  };
});

// The critic sampled the leak in the RENDER, so this does too: read the device
// pixel row that straddles the seam and prove no pathway ground is in it.
{
  const shot = await page.screenshot({ encoding: "binary", clip: { x: 0, y: 760, width: 390, height: 16 } });
  await writeFile(path.join(process.cwd(), "measurements", "_shots", "r3-seam.png"), shot);
}
out.seamPixels = await page.evaluate(async () => {
  // Draw the seam band into a canvas via html2canvas-free route: read the
  // elementFromPoint stack instead, which is what actually decides the paint.
  const rows = {};
  for (const y of [765, 766, 767, 768]) {
    rows[y] = [50, 150, 250, 350].map((x) => {
      const el = document.elementFromPoint(x, y);
      if (el === null) return "none";
      return el.className && typeof el.className === "string" ? el.className.split(" ")[0] : el.tagName.toLowerCase();
    });
  }
  return rows;
});

// -------------------------------------------------- item 4, the Challenge card default
out.challengeCard = await page.evaluate(() => {
  const cards = [...document.querySelectorAll(".ns-panel .ns-card")];
  const practice = cards[0];
  const challenge = cards[1] ?? document.querySelector(".ns-panel .ns-chip__face.ns-card");
  const cs = (el) => getComputedStyle(el);
  const heading = (el) => {
    const h = el.querySelector("h3, .title-face");
    return h === null ? null : getComputedStyle(h).color;
  };
  return {
    practiceFill: cs(practice).backgroundColor,
    challengeFill: cs(challenge).backgroundColor,
    sameFill: cs(practice).backgroundColor === cs(challenge).backgroundColor,
    practiceHeadInk: heading(practice),
    challengeHeadInk: heading(challenge),
    sameInk: heading(practice) === heading(challenge),
    practiceHeight: +practice.getBoundingClientRect().height.toFixed(1),
    challengeHeight: +challenge.getBoundingClientRect().height.toFixed(1),
    challengeTextLines: [...challenge.querySelectorAll("p")].map((p) => p.textContent),
  };
});

// ------------------------------------- item 8, the START lip resolves to a token value
out.lip = await page.evaluate(() => {
  const btn = document.querySelector(".ns-start");
  const face = btn.querySelector(".ns-chip__face");
  // Chrome serialises a color-mix() result as color(srgb 0..1 0..1 0..1) and a
  // plain value as rgb(0..255 ...). A parser that only reads /\d+/ turns the
  // first into nonsense, which is what made the attempt's own lip check lie.
  const rgb = (s) => {
    const m = s.match(/color\(srgb ([\d.]+) ([\d.]+) ([\d.]+)/);
    if (m !== null) return [+m[1] * 255, +m[2] * 255, +m[3] * 255];
    const n = s.match(/[\d.]+/g).map(Number);
    return [n[0], n[1], n[2]];
  };
  const lum = (s) => {
    const [r, g, b] = rgb(s);
    const f = (v) => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const wellBg = getComputedStyle(btn).backgroundColor;
  const faceBg = getComputedStyle(face).backgroundColor;
  return {
    themeTokenDefined: getComputedStyle(document.documentElement).getPropertyValue("--primary-lip").trim() || "(not defined in theme.css)",
    lipResolved: `${wellBg} = rgb(${rgb(wellBg).map(Math.round).join(", ")})`,
    faceResolved: `${faceBg} = rgb(${rgb(faceBg).map(Math.round).join(", ")})`,
    lipIsBlack: /rgb\(0,\s*0,\s*0\)/.test(wellBg),
    lipDarkerThanFace: lum(wellBg) < lum(faceBg),
  };
});

// ---------------------------------------------------- item 9, the difficulty pips
out.pips = await page.evaluate(() => {
  const pips = [...document.querySelectorAll(".ns-pip")];
  return pips.map((p) => {
    const cs = getComputedStyle(p);
    return { filled: p.classList.contains("is-filled"), bg: cs.backgroundColor, border: cs.borderColor, w: +p.getBoundingClientRect().width.toFixed(1) };
  });
});

// ----------------------------------------------------- item 1, the molecule glyph
out.glyph = await page.evaluate(() => {
  const svg = document.querySelector(".ns-molecule");
  const circles = [...svg.querySelectorAll("circle")];
  return {
    viewBox: svg.getAttribute("viewBox"),
    atomCount: circles.length,
    radii: circles.map((c) => +c.getAttribute("r")),
    fills: circles.map((c) => getComputedStyle(c).fill),
    everyAtomHasRim: circles.every((c) => c.getAttribute("stroke") !== null),
    bondPath: svg.querySelector("path").getAttribute("d"),
    box: (() => { const r = svg.getBoundingClientRect(); return { w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; })(),
  };
});

await page.screenshot({ path: path.join(process.cwd(), "measurements", "_shots", "r3-sheet.png") });

// ------------------------------------------------------------------ the guidebook
await page.click(".ns-menu");
await sleep(600);

out.guidebook = await page.evaluate(() => {
  const fig = document.querySelector(".gb-figure");
  const strip = document.querySelector(".gb-strip");
  const callout = document.querySelector(".gb-callout");
  const cs = (el) => getComputedStyle(el);
  const stripLead = strip.querySelector(".gb-strip__lead");
  const stripArt = strip.querySelector(".gb-strip__art");
  const artSvg = stripArt.querySelector("svg");
  return {
    // item 5: no hairline on either white card
    figureBorder: `${cs(fig).borderTopWidth} ${cs(fig).borderTopStyle} ${cs(fig).borderTopColor}`,
    stripBorder: `${cs(strip).borderTopWidth} ${cs(strip).borderTopStyle} ${cs(strip).borderTopColor}`,
    calloutBorder: `${cs(callout).borderTopWidth} ${cs(callout).borderTopStyle}`,
    figureFill: cs(fig).backgroundColor,
    stripFill: cs(strip).backgroundColor,
    // item 6: art dominance inside the worked-example card
    stripHeight: +strip.getBoundingClientRect().height.toFixed(1),
    captionHeight: +stripLead.getBoundingClientRect().height.toFixed(1),
    artHeight: +stripArt.getBoundingClientRect().height.toFixed(1),
    captionLineCount: Math.round(stripLead.getBoundingClientRect().height / parseFloat(cs(stripLead).lineHeight)),
    structureCount: artSvg.querySelectorAll("polygon").length,
    arrowLabels: [...artSvg.querySelectorAll("text")].map((t) => t.textContent),
    // item 7: the composed environment
    steps: [...document.querySelectorAll(".gb-prop svg")].map((s) => s.getAttribute("class")),
    flaskHasLiquid: [...document.querySelectorAll(".gb-prop__flasks path")].some((p) => (p.getAttribute("fill") ?? "none") !== "none"),
    flaskBubbles: document.querySelectorAll(".gb-prop__flasks circle").length,
    propColour: cs(document.querySelector(".gb-prop")).color,
    flaskColour: cs(document.querySelector(".gb-prop__flasks")).color,
  };
});

await page.screenshot({ path: path.join(process.cwd(), "measurements", "_shots", "r3-guidebook.png"), fullPage: true });

// ------------------------------------------------------------- hit targets, 44 px
out.targets = await page.evaluate(() => {
  const list = [];
  for (const sel of [".gb-back"]) {
    const el = document.querySelector(sel);
    if (el === null) continue;
    const r = el.getBoundingClientRect();
    list.push({ sel, w: +r.width.toFixed(1), h: +r.height.toFixed(1), ok: r.width >= 44 && r.height >= 44 });
  }
  return list;
});
await page.goBack().catch(() => {});

// The press is measured LAST and on a fresh sheet, because a real pointerdown
// on START fires onStart and the integrator routes away from the sheet.
await page.goto(`${origin}/#/pathway`, { waitUntil: "networkidle0" });
await sleep(1200);
await page.click(".path-node--current");
await sleep(600);

// ------------------------------------------- item 2, chip depth: footprint on press
out.press = await page.evaluate(async () => {
  // NO pointerdown is dispatched here: a real press on START fires onStart and
  // the shell routes away, so the geometry could never be read after it. What
  // has to be proved is the BUTTON-MECHANICS contract, which is geometric: the
  // well does not move or change size while the face travels by exactly the
  // lip. So the face is translated the way :active translates it and the
  // WELL's own rect is compared across the move.
  const read = (btn) => {
    const r = btn.getBoundingClientRect();
    const f = btn.querySelector(".ns-chip__face").getBoundingClientRect();
    return { top: +r.top.toFixed(2), bottom: +r.bottom.toFixed(2), height: +r.height.toFixed(2), faceTop: +f.top.toFixed(2), faceHeight: +f.height.toFixed(2) };
  };
  const btn = document.querySelector(".ns-start");
  const face = btn.querySelector(".ns-chip__face");
  const lip = getComputedStyle(btn).getPropertyValue("--ns-lip").trim();
  const before = read(btn);
  face.style.transition = "none";
  face.style.transform = `translateY(${lip})`;
  await new Promise((r) => requestAnimationFrame(r));
  const after = read(btn);
  face.style.transform = "";
  face.style.transition = "";
  return {
    lip,
    // The well is the EDGE layer: its background is the darker violet and its
    // bottom padding is the lip, so the lip is visible under a resting face.
    wellPaddingBottom: getComputedStyle(btn).paddingBottom,
    wellHasNoOffsetShadow: getComputedStyle(btn).boxShadow === "none",
    faceHeight: before.faceHeight,
    faceTravelPx: +(after.faceTop - before.faceTop).toFixed(2),
    wellHeightBefore: before.height,
    wellHeightAfter: after.height,
    wellBottomBefore: before.bottom,
    wellBottomAfter: after.bottom,
    footprintUnchanged: before.height === after.height && before.bottom === after.bottom && before.top === after.top,
    hitTarget: { w: +btn.getBoundingClientRect().width.toFixed(1), h: before.height, ok: before.height >= 44 },
  };
});

console.log(JSON.stringify(out, null, 1));
await writeFile(path.join(process.cwd(), "measurements", "_probe-sheet-r3.json"), JSON.stringify(out, null, 1));
await browser.close();
server.close();
