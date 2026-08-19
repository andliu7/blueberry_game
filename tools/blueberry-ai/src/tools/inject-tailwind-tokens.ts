import { readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import postcss, { type AtRule, type Declaration, type Root } from "postcss";
import { tool } from "ai";
import { z } from "zod";
import { resolveInside, workspaceRoot } from "../paths.js";

const CUSTOM_PROPERTY = /^--[A-Za-z0-9_-]+$/;

export type InjectOutcome = {
  file: string;
  added: string[];
  skippedExisting: string[];
  rejected: { token: string; reason: string }[];
  createdThemeBlock: boolean;
  dryRun: boolean;
};

/**
 * Tailwind v4 keeps design tokens in a top level `@theme` at-rule. Everything else
 * in the stylesheet, including the dark palette, lives in ordinary rules such as
 * `.dark { ... }` or inside `@media (prefers-color-scheme: dark)`.
 *
 * That distinction is the whole safety argument for this function: we resolve the
 * `@theme` node once and then only ever append to it. A `.dark` rule is a `Rule`,
 * not an `AtRule` named "theme", so it is never visited and cannot be rewritten.
 */
function findThemeBlock(root: Root): AtRule | undefined {
  let found: AtRule | undefined;
  root.walkAtRules("theme", (node) => {
    // `@theme` and `@theme inline` are both valid and both hold tokens. Take the
    // first one at the document's top level; a nested `@theme` inside a media
    // query is a scoped override and appending to it would change its condition.
    if (!found && node.parent?.type === "root") found = node;
  });
  return found;
}

function createThemeBlock(root: Root): AtRule {
  const block = postcss.atRule({ name: "theme", raws: { before: "\n\n", between: " ", after: "\n" } });
  // Tailwind v4 requires `@import "tailwindcss"` to precede the theme it extends,
  // so anchor after the final top level at-rule import rather than at the very top.
  let lastImport: AtRule | undefined;
  root.walkAtRules("import", (node) => {
    if (node.parent?.type === "root") lastImport = node;
  });
  if (lastImport) lastImport.after(block);
  else root.prepend(block);
  return block;
}

/** Existing token names, so an injection never clobbers a value already declared. */
function existingProps(block: AtRule): Set<string> {
  const props = new Set<string>();
  block.walkDecls((decl: Declaration) => {
    props.add(decl.prop.trim());
  });
  return props;
}

export async function injectTokens(
  filePath: string,
  tokens: Record<string, string>,
  dryRun: boolean,
): Promise<InjectOutcome> {
  const root = workspaceRoot();
  const abs = resolveInside(filePath, root);
  const css = await readFile(abs, "utf8");
  const ast = postcss.parse(css, { from: abs });

  let block = findThemeBlock(ast);
  const createdThemeBlock = block === undefined;
  if (!block) block = createThemeBlock(ast);

  const present = existingProps(block);
  const added: string[] = [];
  const skippedExisting: string[] = [];
  const rejected: { token: string; reason: string }[] = [];

  for (const [rawProp, rawValue] of Object.entries(tokens)) {
    const prop = rawProp.trim();
    const value = String(rawValue).trim();
    if (!CUSTOM_PROPERTY.test(prop)) {
      rejected.push({ token: prop, reason: "Not a CSS custom property name of the form --name" });
      continue;
    }
    if (value.length === 0) {
      rejected.push({ token: prop, reason: "Empty value" });
      continue;
    }
    if (value.includes("}") || value.includes("{")) {
      rejected.push({ token: prop, reason: "Value contains a brace, which would break out of the block" });
      continue;
    }
    if (present.has(prop)) {
      skippedExisting.push(prop);
      continue;
    }
    // Append rather than prepend: later declarations win in CSS, and appending keeps
    // any hand written ordering in the existing block intact.
    block.append(postcss.decl({ prop, value, raws: { before: "\n  ", between: ": " } }));
    present.add(prop);
    added.push(prop);
  }

  if (!dryRun && (added.length > 0 || createdThemeBlock)) {
    // Write to a sibling temp file then rename, so an interrupted run cannot leave
    // a half written stylesheet behind.
    const tmp = `${abs}.${process.pid}.tmp`;
    await writeFile(tmp, ast.toResult().css, "utf8");
    await rename(tmp, abs);
  }

  return {
    file: path.relative(root, abs).split(path.sep).join("/"),
    added,
    skippedExisting,
    rejected,
    createdThemeBlock,
    dryRun,
  };
}

export const injectTailwindTokens = tool({
  description:
    "Inject new CSS custom properties into the Tailwind v4 @theme block of a stylesheet. Existing tokens are never overwritten and declarations outside @theme, including dark mode palettes, are never touched. Set dryRun to preview which tokens would land.",
  parameters: z.object({
    path: z.string().min(1).describe("Workspace relative path to the stylesheet, for example src/index.css"),
    tokens: z
      .record(z.string())
      .describe('Token name to value, for example { "--text-ink": "#1e293b", "--bg-inset": "#f1f5f9" }'),
    dryRun: z.boolean().default(false).describe("Report the plan without writing to disk"),
  }),
  execute: ({ path: filePath, tokens, dryRun }) => injectTokens(filePath, tokens, dryRun),
});
