/**
 * Sample the committed goal images for the exact colours this round has to
 * match, so a value in pathway.css is a measurement rather than a guess.
 * Read only: it writes nothing into the product.
 *
 * WALL CLOCKS: none. Every number here is a pixel.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(process.cwd(), "..", "..");
const DIR = path.join(ROOT, "docs", "reference", "design-goals");
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();

// name -> [file, [[label, xFraction, yFraction], ...]]
const jobs = [
  ["compiled", "blueberry_r7-compiled-v2_1788288474.png", [
    ["ground", 0.5, 0.055],
    ["trail-ahead-fill", 0.503, 0.735],
    ["trail-behind-fill", 0.52, 0.235],
    ["done-face", 0.585, 0.19],
    ["current-face", 0.45, 0.5],
    ["locked-face", 0.765, 0.565],
    ["rail-fill", 0.205, 0.65],
    ["rail-edge", 0.185, 0.65],
    ["terrace", 0.8, 0.42],
  ]],
  ["states", "blueberry_r7-states-sheet_1788288485.png", [
    ["rest-face", 0.178, 0.45],
    ["rest-edge", 0.178, 0.535],
    ["done-face", 0.5, 0.45],
    ["locked-face", 0.66, 0.45],
    ["current-face", 0.822, 0.45],
    ["ground", 0.5, 0.12],
  ]],
  ["nodetypes", "blueberry_spec-node-types_1788291072.png", [
    ["lesson-face", 0.099, 0.42],
    ["lesson-edge", 0.099, 0.475],
    ["gate-arch", 0.5, 0.4],
    ["gate-arch-foot", 0.468, 0.45],
    ["application-face", 0.63, 0.43],
    ["hub-ring", 0.735, 0.41],
    ["ground", 0.5, 0.12],
  ]],
  ["diamond", "blueberry_branch-diamond_1788284291.png", [
    ["rule", 0.5, 0.336],
    ["locked-face", 0.29, 0.565],
    ["trail", 0.5, 0.72],
    ["ground", 0.5, 0.44],
  ]],
];

const out = {};
for (const [name, file, points] of jobs) {
  const b64 = readFileSync(path.join(DIR, file)).toString("base64");
  const sampled = await page.evaluate(
    async (src, pts) =>
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const hex = (v) => v.toString(16).padStart(2, "0");
          const res = { size: [img.naturalWidth, img.naturalHeight] };
          for (const [label, fx, fy] of pts) {
            const x = Math.round(fx * img.naturalWidth);
            const y = Math.round(fy * img.naturalHeight);
            const d = ctx.getImageData(x, y, 1, 1).data;
            res[label] = `#${hex(d[0])}${hex(d[1])}${hex(d[2])} @${x},${y}`;
          }
          resolve(res);
        };
        img.src = src;
      }),
    `data:image/png;base64,${b64}`,
    points,
  );
  out[name] = sampled;
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
