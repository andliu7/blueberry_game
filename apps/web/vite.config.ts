import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/**
 * build.manifest makes Vite write dist/.vite/manifest.json, the machine readable
 * map from source entries to emitted chunks. scripts/emit-budget-subjects.mjs
 * (run by the postbuild hook) reads it and writes dist/budget-subjects.json, the
 * contract the validator suite's payload and Ketcher gates consume. See
 * packages/validators/src/measure/subject.ts for that contract; the gates refuse
 * to guess the entry chunk by filename, so the build must name it.
 *
 * base is "./" so the same build serves from a domain root (the measurement
 * scripts, vite preview) and from a subpath (GitHub Pages at /blueberry_game/)
 * without rebuilding. Hash routing means no server rewrite is ever needed.
 *
 * BLUEBERRY_SINGLE_FILE=1 collapses every dynamic import into the entry chunk so
 * scripts/inline-single-file.mjs can fold the whole app into one HTML file for
 * a shareable preview. That build is NOT the one the budget gates measure: it
 * deliberately defeats the lazy boundaries the gates exist to check, so it
 * writes to dist-single/ and never to dist/.
 */
const singleFile = process.env.BLUEBERRY_SINGLE_FILE === "1";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  build: {
    manifest: !singleFile,
    target: "es2022",
    outDir: singleFile ? "dist-single" : "dist",
    ...(singleFile
      ? {
          rollupOptions: { output: { inlineDynamicImports: true } },
          assetsInlineLimit: 1024 * 1024 * 16,
          cssCodeSplit: false,
        }
      : {}),
  },
});
