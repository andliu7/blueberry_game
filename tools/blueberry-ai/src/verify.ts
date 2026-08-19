import { copyFile, readFile, rm } from "node:fs/promises";
import assert from "node:assert/strict";
import { injectTokens } from "./tools/inject-tailwind-tokens.js";

const SRC = "fixtures/index.css";
const WORK = "fixtures/.work.css";

async function main(): Promise<void> {
  await copyFile(SRC, WORK);
  const before = await readFile(WORK, "utf8");

  const outcome = await injectTokens(
    WORK,
    {
      "--text-ink": "#1e293b",
      "--bg-inset": "#f1f5f9",
      "--color-destructive": "#ff0000",
      "bad-name": "#000",
      "--broken": "red; } .evil { color: blue",
    },
    false,
  );

  const after = await readFile(WORK, "utf8");

  assert.deepEqual(outcome.added.sort(), ["--bg-inset", "--text-ink"]);
  assert.deepEqual(outcome.skippedExisting, ["--color-destructive"]);
  assert.equal(outcome.rejected.length, 2);
  assert.equal(outcome.createdThemeBlock, false);

  assert.match(after, /--color-destructive: #e11d48;/);
  assert.doesNotMatch(after, /#ff0000/);
  assert.doesNotMatch(after, /\.evil/);

  for (const darkToken of [
    "--background: #0c0a09;",
    "--foreground: #e7e5e4;",
    "--card: #1c1917;",
    "--muted-foreground: #a8a29e;",
    "--border: #44403c;",
  ]) {
    assert.ok(after.includes(darkToken), `dark token lost: ${darkToken}`);
  }

  assert.equal(
    (after.match(/\.dark \{/g) ?? []).length,
    (before.match(/\.dark \{/g) ?? []).length,
  );
  assert.ok(after.includes("@media (prefers-color-scheme: dark)"));

  const themeBody = after.slice(after.indexOf("@theme"), after.indexOf("\n:root"));
  assert.ok(themeBody.includes("--text-ink: #1e293b;"));
  assert.ok(themeBody.includes("--bg-inset: #f1f5f9;"));

  const second = await injectTokens(WORK, { "--text-ink": "#000000" }, false);
  assert.deepEqual(second.added, []);
  assert.deepEqual(second.skippedExisting, ["--text-ink"]);
  assert.match(await readFile(WORK, "utf8"), /--text-ink: #1e293b;/);

  await rm(WORK);
  console.log("PASS");
  console.log(JSON.stringify(outcome, null, 2));
  console.log("\n--- resulting @theme ---");
  console.log(themeBody.trim());
}

main().catch((err: unknown) => {
  console.error("FAIL");
  console.error(err);
  process.exit(1);
});
