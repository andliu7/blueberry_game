/**
 * Writes dist/budget-subjects.json, the contract the validator suite's payload
 * and Ketcher isolation gates consume. See
 * packages/validators/src/measure/subject.ts for the contract's definition and
 * for why the gates refuse to guess the entry chunk by filename.
 *
 * Runs as the postbuild hook, so a production build cannot exist without its
 * manifest. Reads Vite's own build manifest (dist/.vite/manifest.json, emitted
 * because vite.config.ts sets build.manifest) and derives:
 *
 *   gameRouteEntry           the entry chunk index.html loads synchronously
 *   lazyChunks               chunks reachable only through a dynamic import
 *   additionalInitialAssets  CSS that loads with the route via <link>, which
 *                            no JS import graph walk can find
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const distDir = path.resolve(process.cwd(), "dist");
const manifestPath = path.join(distDir, ".vite", "manifest.json");

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));

const entries = Object.entries(manifest);
const entryPair = entries.find(([, chunk]) => chunk.isEntry === true);
if (entryPair === undefined) {
  throw new Error(`${manifestPath} contains no chunk with isEntry: true`);
}
const [entryKey, entryChunk] = entryPair;

// Walk static imports from the entry to find which chunks load initially and
// which CSS they pull in. Dynamic imports are boundaries: everything beyond
// one is lazy by construction.
const initialKeys = new Set();
const initialCss = new Set(entryChunk.css ?? []);
const queue = [entryKey];
while (queue.length > 0) {
  const key = queue.shift();
  if (initialKeys.has(key)) continue;
  initialKeys.add(key);
  const chunk = manifest[key];
  if (chunk === undefined) continue;
  for (const css of chunk.css ?? []) initialCss.add(css);
  for (const imported of chunk.imports ?? []) queue.push(imported);
}

const lazyChunks = entries
  .filter(([key, chunk]) => chunk.isDynamicEntry === true && !initialKeys.has(key))
  .map(([, chunk]) => chunk.file);

const subjects = {
  gameRouteEntry: entryChunk.file,
  lazyChunks,
  additionalInitialAssets: [...initialCss],
};

await writeFile(
  path.join(distDir, "budget-subjects.json"),
  `${JSON.stringify(subjects, null, 2)}\n`,
  "utf8",
);

console.log(
  `budget-subjects.json: entry ${subjects.gameRouteEntry}, ` +
    `${lazyChunks.length} lazy chunk(s), ${subjects.additionalInitialAssets.length} initial asset(s)`,
);
