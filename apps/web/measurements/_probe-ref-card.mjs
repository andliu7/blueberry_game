/** Crop and enlarge a region of a reference image, so a corner can be looked at. */
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer-core";

const ROOT = path.resolve(process.cwd(), "..", "..");
const UNITS = path.join(ROOT, "docs", "reference", "design-goals", "units");
const file = process.env.FILE ?? "unit02-path.jpg";
const box = (process.env.BOX ?? "0.68,0.58,0.98,0.68").split(",").map(Number);
const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"].find(existsSync);
const browser = await puppeteer.launch({ executablePath: chrome, headless: "new", args: ["--no-sandbox"] });
const page = await browser.newPage();
await page.goto("about:blank");
const b64 = readFileSync(path.join(UNITS, file)).toString("base64");
const out = await page.evaluate(
  async (src, b) =>
    await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const x = Math.round(b[0] * img.naturalWidth);
        const y = Math.round(b[1] * img.naturalHeight);
        const w = Math.round((b[2] - b[0]) * img.naturalWidth);
        const h = Math.round((b[3] - b[1]) * img.naturalHeight);
        const z = 6;
        const c = document.createElement("canvas");
        c.width = w * z;
        c.height = h * z;
        const ctx = c.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h, 0, 0, w * z, h * z);
        resolve(c.toDataURL("image/png"));
      };
      img.src = src;
    }),
  `data:image/jpeg;base64,${b64}`,
  box,
);
writeFileSync(path.join(process.cwd(), "measurements", "_ref-crop.png"), Buffer.from(out.split(",")[1], "base64"));
await browser.close();
console.log("wrote measurements/_ref-crop.png");
