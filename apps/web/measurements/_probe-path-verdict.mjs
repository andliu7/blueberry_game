/**
 * THE PIXEL VERDICT, RE-MEASURED. A probe, not a gate.
 *
 * Every claim in docs/DESIGN-GOALS.md's "pixel verdict of 2026-09-04" section
 * is a number a critic read off a screenshot. This script reads the same
 * numbers off the built page and off the two adopted references, so a before
 * and an after are the same measurement rather than two descriptions.
 *
 * WALL CLOCKS: none. Every number here is a pixel or a computed style.
 */
import { existsSync, readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import puppeteer from "puppeteer-core";
import { S2_SEED, S2_STORED, installSeed } from "./economy-moments.mjs";

const DIST = path.join(process.cwd(), "dist");
const ROOT = path.resolve(process.cwd(), "..", "..");
const UNITS = path.join(ROOT, "docs", "reference", "design-goals", "units");
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

/*
 * ONE SET OF PIXEL STATISTICS, run over a data URL in a canvas. Shared by the
 * reference images and the build's own screenshots so the two are comparable
 * by construction. `crop` is the fraction of the image height that is the
 * SCENE: a reference jpg carries a phone bezel, a header and a tab bar, and
 * none of those are the landscape being judged.
 */
async function stats(page, dataUrl, crop) {
  return await page.evaluate(
    async (src, box) =>
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const x0 = Math.round(box.x0 * c.width);
          const x1 = Math.round(box.x1 * c.width);
          const y0 = Math.round(box.y0 * c.height);
          const y1 = Math.round(box.y1 * c.height);
          const w = x1 - x0;
          const h = y1 - y0;
          const d = ctx.getImageData(x0, y0, w, h).data;
          const lum = (r, g, b) => 0.2126 * r + 0.7152 * g + 0.0722 * b;
          let darkest = 1e9;
          let darkHex = "";
          let veryDark = 0;
          let pureBlack = 0;
          let green = 0;
          let nearWhite = 0;
          const bucket = new Map();
          const hex = (v) => Math.round(v).toString(16).padStart(2, "0");
          for (let i = 0; i < d.length; i += 4) {
            const r = d[i];
            const g = d[i + 1];
            const b = d[i + 2];
            const L = lum(r, g, b);
            if (L < darkest) {
              darkest = L;
              darkHex = `#${hex(r)}${hex(g)}${hex(b)}`;
            }
            if (L < 60) veryDark += 1;
            if (r < 12 && g < 12 && b < 12) pureBlack += 1;
            // A green PIXEL: the channel leads both others by a real margin,
            // which is what separates the trail's #b3df92 and #3f8c28 from
            // any tan (tans lead on red) and from the periwinkle (leads blue).
            if (g > r + 10 && g > b + 20) green += 1;
            if (r > 246 && g > 246 && b > 246) nearWhite += 1;
            const key = `${r >> 3}-${g >> 3}-${b >> 3}`;
            bucket.set(key, (bucket.get(key) ?? 0) + 1);
          }
          const total = w * h;
          const top = [...bucket.entries()].sort((a, z) => z[1] - a[1]).slice(0, 6).map(([k, n]) => {
            const [r, g, b] = k.split("-").map((v) => (Number(v) << 3) + 4);
            return { hex: `#${hex(r)}${hex(g)}${hex(b)}`, pct: +((n / total) * 100).toFixed(1) };
          });
          resolve({
            size: [w, h],
            darkestLum: +darkest.toFixed(1),
            darkestHex: darkHex,
            veryDarkPct: +((veryDark / total) * 100).toFixed(2),
            pureBlackPct: +((pureBlack / total) * 100).toFixed(2),
            greenPx: green,
            greenPct: +((green / total) * 100).toFixed(2),
            nearWhitePx: nearWhite,
            top,
          });
        };
        img.src = src;
      }),
    dataUrl,
    crop,
  );
}

const out = { reference: {}, build: {}, dom: {} };

// ---- the two adopted references -------------------------------------------
{
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 900 });
  await page.goto("about:blank");
  // The phone body inside the jpg's own margin, between the unit banner and
  // the tab bar. Read off the images: the device fills x 0.14..0.86 in
  // unit01 and 0.14..0.86 in unit02, the scene runs y 0.20..0.80.
  for (const [name, file, crop] of [
    ["unit01", "unit01-path.jpg", { x0: 0.16, x1: 0.85, y0: 0.21, y1: 0.79 }],
    ["unit02", "unit02-path.jpg", { x0: 0.16, x1: 0.85, y0: 0.21, y1: 0.85 }],
  ]) {
    const b64 = readFileSync(path.join(UNITS, file)).toString("base64");
    out.reference[name] = await stats(page, `data:image/jpeg;base64,${b64}`, crop);
  }
  await page.close();
}

// ---- the build -------------------------------------------------------------
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await installSeed(page, `http://localhost:${port}/`, S2_SEED, S2_STORED);
await page.goto(`http://localhost:${port}/#/pathway`, { waitUntil: "networkidle0" });
await new Promise((r) => setTimeout(r, 1800));

const measure = await browser.newPage();
await measure.goto("about:blank");

for (const y of [0, 500, 1000, 1600, 2200]) {
  await page.evaluate((to) => window.scrollTo(0, to), y);
  await new Promise((r) => setTimeout(r, 600));
  const shot = await page.screenshot({ encoding: "base64" });
  const inFrame = await page.evaluate(() => {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const hit = (sel) =>
      [...document.querySelectorAll(sel)].filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh && r.right > 0 && r.left < vw && r.width > 0;
      }).length;
    return {
      props: hit(".path-mark, .path-prop, .path-cloud, .path-boulder"),
      clouds: hit(".path-cloud"),
      boulders: hit(".path-boulder"),
      flasks: hit(".path-prop"),
      marks: hit(".path-mark"),
      chips: hit(".path-node"),
    };
  });
  // The scene only: below the sticky header, above the tab bar.
  const chrome = await page.evaluate(() => {
    const header = document.querySelector("header");
    const nav = document.querySelector("nav");
    return {
      headerBottom: header === null ? 0 : header.getBoundingClientRect().bottom,
      navTop: nav === null ? window.innerHeight : nav.getBoundingClientRect().top,
      h: window.innerHeight,
    };
  });
  out.build[`y${y}`] = {
    ...(await stats(measure, `data:image/png;base64,${shot}`, {
      x0: 0,
      x1: 1,
      y0: chrome.headerBottom / chrome.h,
      y1: chrome.navTop / chrome.h,
    })),
    inFrame,
  };
}

await page.evaluate(() => window.scrollTo(0, 0));
await new Promise((r) => setTimeout(r, 500));

// ---- the DOM claims --------------------------------------------------------
out.dom = await page.evaluate(() => {
  const px = (v) => Math.round(parseFloat(v) * 10) / 10;
  const vw = window.innerWidth;
  const read = (sel) => document.querySelector(sel);
  const all = (sel) => [...document.querySelectorAll(sel)];

  const fill = read(".path-trail__fill");
  const edge = read(".path-trail__edge");
  const doneFill = read(".path-trail__fill--done");
  const node = read(".path-node");
  const nodeCS = node === null ? null : getComputedStyle(node);

  // Motifs: how many chips carry a mark of any kind.
  const chips = all(".path-node");
  const withMark = chips.filter((c) => c.querySelector("svg") !== null);
  const locks = chips.filter((c) => c.querySelector(".path-node__face svg rect") !== null);

  /*
    Labels, measured DOCUMENT WIDE. A card is absolutely positioned and can
    reach a chip in the row above or below it, so a same-slab test (which is
    what this probe did first, and which reported zero) could never see the
    collision the verdict named.
  */
  const labels = all(".path-label");
  const labelBoxes = labels.map((l) => l.getBoundingClientRect());
  const chipBoxes = all(".path-node, .path-gatenode").map((c) => c.getBoundingClientRect());
  const hits = (a, b) => a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
  let collide = 0;
  let truncated = 0;
  let offscreen = 0;
  let labelCollide = 0;
  for (let i = 0; i < labels.length; i += 1) {
    const l = labels[i];
    const lb = labelBoxes[i];
    if (l.scrollWidth > l.clientWidth + 1 || l.scrollHeight > l.clientHeight + 1) truncated += 1;
    if (lb.left < -1 || lb.right > vw + 1) offscreen += 1;
    for (const cb of chipBoxes) if (hits(lb, cb)) collide += 1;
    for (let j = i + 1; j < labels.length; j += 1) if (hits(lb, labelBoxes[j])) labelCollide += 1;
  }

  const gateBand = read(".path-gatenode__arch-face");
  const gate = read(".path-gatenode__arch");
  const berry = read(".path-berry");
  const berryImg = berry === null ? null : berry.querySelector("img, svg");

  const ridge = read(".path-ridge");
  const marks = all(".path-mark");
  const clouds = all(".path-cloud");

  const hex = (c) => {
    const m = c.match(/\d+/g);
    return m === null ? c : `#${m.slice(0, 3).map((v) => (+v).toString(16).padStart(2, "0")).join("")}`;
  };

  return {
    viewportWidth: vw,
    trail: {
      edgeStroke: edge === null ? null : px(getComputedStyle(edge).strokeWidth),
      edgeColour: edge === null ? null : hex(getComputedStyle(edge).stroke),
      fillStroke: fill === null ? null : px(getComputedStyle(fill).strokeWidth),
      fillColour: fill === null ? null : hex(getComputedStyle(fill).stroke),
      doneSegments: all(".path-trail__done").length,
      doneColour: doneFill === null ? null : hex(getComputedStyle(doneFill).stroke),
      widestPctOfScreen: edge === null ? null : +((px(getComputedStyle(edge).strokeWidth) / vw) * 100).toFixed(2),
    },
    node: nodeCS === null ? null : {
      boxShadow: nodeCS.boxShadow.slice(0, 90),
      border: nodeCS.border,
      faceBorder: getComputedStyle(node.querySelector(".path-node__face")).border,
      lip: nodeCS.getPropertyValue("--node-lip").trim(),
      count: chips.length,
      withMotif: withMark.length,
      empty: chips.length - withMark.length,
      padlocks: locks.length,
    },
    labels: { count: labels.length, collidingWithChip: collide, collidingWithLabel: labelCollide, offscreen, truncated },
    gate: gate === null ? null : {
      boxWidthPx: px(gate.getBoundingClientRect().width),
      // The PAINTED band, which is what the verdict measured: the old box was
      // mostly padding around a much narrower arch.
      paintedWidthPx: gateBand === null ? null : px(gateBand.getBoundingClientRect().width),
      paintedPctOfScreen: gateBand === null ? null : +((gateBand.getBoundingClientRect().width / vw) * 100).toFixed(1),
      hasTextLabel: gate.closest(".path-gate") === null ? null : gate.closest(".path-gate").querySelector(".path-label") !== null,
    },
    berry: berry === null ? null : {
      boxWidthPx: px(berry.getBoundingClientRect().width),
      boxHeightPx: px(berry.getBoundingClientRect().height),
      // The DRAWN character inside the box, which is what the verdict counted
      // when it said "a 26px head": the mark fills about 0.72 of its box.
      drawnWidthPx: berryImg === null ? null : px(berryImg.getBoundingClientRect().width * 0.72),
      left: px(berry.getBoundingClientRect().left),
      right: px(berry.getBoundingClientRect().right),
      clipped: berry.getBoundingClientRect().left < -1 || berry.getBoundingClientRect().right > vw + 1,
      overlapsOwnChip: (() => {
        const chip = berry.parentElement === null ? null : berry.parentElement.querySelector(".path-node");
        if (chip === null) return null;
        const a = berry.getBoundingClientRect();
        const b = chip.getBoundingClientRect();
        return a.left < b.right - 1 && a.right > b.left + 1 && a.top < b.bottom - 1 && a.bottom > b.top + 1;
      })(),
      inner: berryImg === null ? null : berryImg.tagName,
    },
    scene: {
      ridges: all(".path-ridge").length,
      ridgeFill: ridge === null ? null : getComputedStyle(ridge).fill,
      marks: marks.length,
      markStroke: marks[0] === undefined ? null : hex(getComputedStyle(marks[0]).stroke),
      clouds: clouds.length,
      boulders: all(".path-boulder").length,
      // What is actually inside the viewport right now, which is the density
      // number the verdict is about ("one frame reads as a landscape").
      propsInFrame: all(".path-mark, .path-prop, .path-cloud, .path-boulder").filter((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < vw;
      }).length,
      markStrokeLum: (() => {
        const m = all(".path-mark")[0];
        if (m === undefined) return null;
        const c = getComputedStyle(m).stroke.match(/[0-9]+/g);
        return c === null ? null : +(0.2126 * +c[0] + 0.7152 * +c[1] + 0.0722 * +c[2]).toFixed(1);
      })(),
      terraceLums: [0, 1, 2, 3].map((i) => {
        const v = getComputedStyle(document.documentElement).getPropertyValue("--path-terrace-" + i).trim();
        const m = v.match(/^#(..)(..)(..)$/);
        if (m === null) return null;
        const parts = m.slice(1).map((h) => parseInt(h, 16));
        return +(0.2126 * parts[0] + 0.7152 * parts[1] + 0.0722 * parts[2]).toFixed(1);
      }),
      terraces: all(".path-terrace").length,
    },
  };
});

await browser.close();
server.close();
console.log(JSON.stringify(out, null, 2));
