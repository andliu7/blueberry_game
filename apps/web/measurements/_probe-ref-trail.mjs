/**
 * THE REFERENCE'S OWN RULER. Read only, writes nothing into the product.
 *
 * How wide the trail is and how wide a node is, in the adopted designs, so
 * "the reference trail is about 2 percent of screen width" is a number this
 * tree can check rather than a sentence it repeats. Both are measured as RUN
 * LENGTHS along horizontal scanlines: a run of green pixels is the trail, a
 * run of periwinkle is a node, and the phone's screen width is found from the
 * device body itself.
 */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(process.cwd(), "..", "..");
const UNITS = path.join(ROOT, "docs", "reference", "design-goals", "units");
const chrome = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("about:blank");

const out = {};
for (const file of ["unit01-path.jpg", "unit02-path.jpg"]) {
  const b64 = readFileSync(path.join(UNITS, file)).toString("base64");
  out[file] = await page.evaluate(
    async (src) =>
      await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height).data;
          const at = (x, y) => {
            const i = (y * c.width + x) * 4;
            return [d[i], d[i + 1], d[i + 2]];
          };
          const isGreen = ([r, g, b]) => g > r + 14 && g > b + 24;
          const isPeri = ([r, g, b]) => b > r + 18 && b > g + 10 && b > 150;
          // Runs of a predicate along one scanline, longest first.
          const runs = (y, test) => {
            const found = [];
            let start = -1;
            for (let x = 0; x < c.width; x += 1) {
              if (test(at(x, y))) {
                if (start === -1) start = x;
              } else if (start !== -1) {
                found.push({ x: start, w: x - start });
                start = -1;
              }
            }
            if (start !== -1) found.push({ x: start, w: c.width - start });
            return found;
          };
          /*
           * THE SCREEN, found from the device rather than assumed.
           *
           * The page behind the phone is one flat colour, sampled at the very
           * left edge of the image on a line that certainly crosses the
           * device. The screen is then the span between the first and last
           * column on that line that is NOT that colour, which is the phone
           * body; the bezel it includes is a couple of pixels and is reported
           * so a reader can see it.
           */
          const near = (a, b, tol) => Math.abs(a[0] - b[0]) < tol && Math.abs(a[1] - b[1]) < tol && Math.abs(a[2] - b[2]) < tol;
          const mid = Math.round(c.height * 0.5);
          const outer = at(2, mid);
          let left = 0;
          let right = c.width - 1;
          while (left < c.width && near(at(left, mid), outer, 8)) left += 1;
          while (right > left && near(at(right, mid), outer, 8)) right -= 1;
          const screen = right - left + 1;

          // Trail widths: every green run narrower than a fifth of the screen
          // (a wider one is a completed node, not a line), over many lines.
          const trail = [];
          const node = [];
          for (let y = Math.round(c.height * 0.22); y < c.height * 0.86; y += 2) {
            for (const run of runs(y, isGreen)) if (run.w > 2 && run.w < screen * 0.2) trail.push(run.w);
            for (const run of runs(y, isPeri)) if (run.w > screen * 0.08) node.push(run.w);
          }
          const median = (list) => {
            if (list.length === 0) return null;
            const s = [...list].sort((a, b) => a - b);
            return s[Math.floor(s.length / 2)];
          };
          resolve({
            imageWidth: c.width,
            screenPx: screen,
            trailSamples: trail.length,
            trailMedianPx: median(trail),
            trailPctOfScreen: median(trail) === null ? null : +((median(trail) / screen) * 100).toFixed(2),
            nodeSamples: node.length,
            nodeMaxPx: node.length === 0 ? null : Math.max(...node),
            nodePctOfScreen: node.length === 0 ? null : +((Math.max(...node) / screen) * 100).toFixed(2),
          });
        };
        img.src = src;
      }),
    `data:image/jpeg;base64,${b64}`,
  );
}
await browser.close();
console.log(JSON.stringify(out, null, 2));
