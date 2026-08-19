import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { tool } from "ai";
import { z } from "zod";
import { resolveInside, workspaceRoot } from "../paths.js";

const MAX_BYTES = 256 * 1024;

export type ReadFileResult =
  | { path: string; ok: true; bytes: number; truncated: boolean; content: string }
  | { path: string; ok: false; error: string };

export const readFiles = tool({
  description:
    "Read one or more text files from the workspace and return their contents. Use this before editing anything so you are working from the file as it actually is, not from memory.",
  parameters: z.object({
    paths: z
      .array(z.string().min(1))
      .min(1)
      .max(20)
      .describe("Workspace relative paths, for example src/index.css"),
  }),
  execute: async ({ paths }): Promise<{ root: string; files: ReadFileResult[] }> => {
    const root = workspaceRoot();
    const files = await Promise.all(
      paths.map(async (p): Promise<ReadFileResult> => {
        try {
          const abs = resolveInside(p, root);
          const info = await stat(abs);
          if (!info.isFile()) return { path: p, ok: false, error: "Not a regular file" };
          const raw = await readFile(abs, "utf8");
          const truncated = Buffer.byteLength(raw, "utf8") > MAX_BYTES;
          return {
            path: path.relative(root, abs).split(path.sep).join("/"),
            ok: true,
            bytes: Buffer.byteLength(raw, "utf8"),
            truncated,
            content: truncated ? `${raw.slice(0, MAX_BYTES)}\n/* ...truncated... */` : raw,
          };
        } catch (err) {
          return { path: p, ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }),
    );
    return { root, files };
  },
});
