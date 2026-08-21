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
  // A classic script, not a module: some hosts rewrite module tags, and the
  // bundle is built as an IIFE for this mode so it needs no module semantics.
  // A closing script tag or an HTML comment opener inside the code would end
  // or corrupt the inline block early, so both are escaped.
  const safe = js.replace(/<\/script>/g, "<\\/script>").replace(/<!--/g, "<\\!--");
  // A replacer FUNCTION, never a string: minified code is full of "$&" and
  // "$1", which String.replace would expand as patterns and corrupt the bundle.
  // The tag sat in <head> as a deferred module; a classic inline script there
  // would run before #root exists. Remove it and append at the end of <body>.
  html = html.replace(match[0], "");
  html = html.replace("</body>", () => `<script>${safe}</script></body>`);
}

const linkTag = /<link rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g;
for (const match of [...html.matchAll(linkTag)]) {
  const css = await readFile(path.join(dir, match[1].replace(/^\.\//, "")), "utf8");
  html = html.replace(match[0], () => `<style>${css}</style>`);
}

// Modulepreload hints point at files that no longer exist as separate chunks.
html = html.replace(/<link rel="modulepreload"[^>]*>/g, "");

const out = path.join(dir, "blueberry.html");
await writeFile(out, html, "utf8");
console.log(`${out}: ${(Buffer.byteLength(html) / 1024).toFixed(0)} KB`);
