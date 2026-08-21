/**
 * Folds dist-single/ into one HTML file, dist-single/blueberry.html, for a
 * shareable preview of the app's current state. Every <script type="module"
 * src> and <link rel="stylesheet"> in index.html is replaced by its content
 * inline. Run after `BLUEBERRY_SINGLE_FILE=1 vite build`.
 *
 * This is a preview artifact, not a release. The real build stays code split
 * and is what the budget gates measure.
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const dir = path.resolve(process.cwd(), "dist-single");
let html = await readFile(path.join(dir, "index.html"), "utf8");

const scriptTag = /<script type="module"[^>]*src="([^"]+)"[^>]*><\/script>/g;
for (const match of [...html.matchAll(scriptTag)]) {
  const js = await readFile(path.join(dir, match[1].replace(/^\.\//, "")), "utf8");
  // A closing script tag inside a string literal would end the inline block early.
  html = html.replace(match[0], `<script type="module">${js.replace(/<\/script>/g, "<\\/script>")}</script>`);
}

const linkTag = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
for (const match of [...html.matchAll(linkTag)]) {
  const css = await readFile(path.join(dir, match[1].replace(/^\.\//, "")), "utf8");
  html = html.replace(match[0], `<style>${css}</style>`);
}

// Modulepreload hints point at files that no longer exist as separate chunks.
html = html.replace(/<link rel="modulepreload"[^>]*>/g, "");

const out = path.join(dir, "blueberry.html");
await writeFile(out, html, "utf8");
console.log(`${out}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
