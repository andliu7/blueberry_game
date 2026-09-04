/** Find the trail ribbon's own fill and keyline in blueberry_r7-compiled-v2 by
 * scanning for the greenest pixels outside the completed chips. Read only.
 * WALL CLOCKS: none. */
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";
const ROOT = path.resolve(process.cwd(), "..", "..");
const file = path.join(ROOT, "docs", "reference", "design-goals", "blueberry_r7-compiled-v2_1788288474.png");
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe","C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe","C:/Program Files/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
const b64 = readFileSync(file).toString("base64");
const res = await page.evaluate(async (src) => await new Promise((resolve) => {
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const ctx = c.getContext("2d"); ctx.drawImage(img, 0, 0);
    const hex = (v) => v.toString(16).padStart(2, "0");
    // Horizontal scans across the ribbon, below the last completed node
    // (y 700..1050) so the sample is the ROAD AHEAD, not a chip.
    const rows = [700, 760, 900, 980, 1030];
    const out = {};
    for (const y of rows) {
      const line = [];
      const d = ctx.getImageData(0, y, img.naturalWidth, 1).data;
      for (let x = 100; x < 700; x += 1) {
        const r = d[x * 4], g = d[x * 4 + 1], b = d[x * 4 + 2];
        if (g > r + 8 && g > b + 20) line.push(`${x}:#${hex(r)}${hex(g)}${hex(b)}`);
      }
      out[y] = line.join(" ");
    }
    resolve(out);
  };
  img.src = src;
}), `data:image/png;base64,${b64}`);
await browser.close();
console.log(JSON.stringify(res, null, 2));
