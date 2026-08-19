import { anthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";

/**
 * PLACEHOLDER. Swap the provider factory here for whichever one you are on.
 * The rest of the CLI only depends on the `LanguageModel` type, so nothing
 * else changes when this does.
 *
 *   OpenAI:  import { openai } from "@ai-sdk/openai";  openai(MODEL_ID)
 *   Google:  import { google } from "@ai-sdk/google";  google(MODEL_ID)
 */
export const MODEL_ID = process.env.BLUEBERRY_AI_MODEL ?? "claude-opus-5";

export const model: LanguageModel = anthropic(MODEL_ID);
