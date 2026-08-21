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
 */
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    manifest: true,
    target: "es2022",
  },
});
