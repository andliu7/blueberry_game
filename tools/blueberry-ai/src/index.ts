#!/usr/bin/env node
import { generateText } from "ai";
import { model, MODEL_ID } from "./model.js";
import { readFiles } from "./tools/read-files.js";
import { injectTailwindTokens } from "./tools/inject-tailwind-tokens.js";
import { workspaceRoot } from "./paths.js";

const SYSTEM = `You are Blueberry AI, a design token assistant for a Tailwind v4 codebase.

Rules:
- Read a file before you change it. Never infer current contents.
- Tokens go in the @theme block through injectTailwindTokens. Never hand edit CSS text.
- injectTailwindTokens will not overwrite an existing token. If a token already exists and
  the value is wrong, say so and stop. Do not invent a differently named token to get around it.
- Prefer one injectTailwindTokens call carrying every token over several calls.
- When finished, state plainly which tokens landed and which were skipped.`;

const MAX_STEPS = 5;

function usage(): never {
  console.error("Usage: blueberry-ai \"<instruction>\"\n");
  console.error("Example:");
  console.error('  blueberry-ai "read src/index.css and add --text-ink and --bg-inset tokens"');
  process.exit(1);
}

async function main(): Promise<void> {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) usage();

  console.log(`blueberry-ai  model=${MODEL_ID}  root=${workspaceRoot()}  maxSteps=${MAX_STEPS}\n`);

  const result = await generateText({
    model,
    system: SYSTEM,
    prompt,
    tools: { readFiles, injectTailwindTokens },
    maxSteps: MAX_STEPS,
    onStepFinish: ({ toolCalls, toolResults, finishReason, usage: stepUsage }) => {
      for (const call of toolCalls) {
        console.log(`  -> ${call.toolName}(${JSON.stringify(call.args)})`);
      }
      for (const res of toolResults) {
        const preview = JSON.stringify(res.result);
        console.log(
          `  <- ${res.toolName}: ${preview.length > 400 ? `${preview.slice(0, 400)}...` : preview}`,
        );
      }
      console.log(
        `  step done  reason=${finishReason}  tokens=${stepUsage.totalTokens ?? "n/a"}\n`,
      );
    },
  });

  console.log(`steps=${result.steps.length}  totalTokens=${result.usage.totalTokens ?? "n/a"}\n`);
  console.log(result.text);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? `${err.name}: ${err.message}` : String(err));
  process.exit(1);
});
