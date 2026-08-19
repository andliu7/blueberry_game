# Blueberry AI

A Node CLI that gives a model two tools and lets it drive: read files in this workspace, and inject
design tokens into a Tailwind v4 `@theme` block without breaking what is already there.

## Run

```
cd tools\blueberry-ai
npm install
$env:ANTHROPIC_API_KEY = "sk-ant-..."
npx tsx src/index.ts "read fixtures/index.css and add --text-ink #1e293b and --bg-inset #f1f5f9"
```

`BLUEBERRY_AI_MODEL` overrides the model id. `BLUEBERRY_AI_ROOT` overrides the workspace root, which
otherwise is the current directory. Every path the model supplies is resolved against that root and
rejected if it escapes, so a path with `..` in it fails instead of reaching your home directory.

## Verify

```
npx tsx src/verify.ts
```

Runs the injector against `fixtures/index.css`, which deliberately contains a `@theme` block, a
`:root` block, a `.dark` block, and a `prefers-color-scheme` media query. It asserts the dark tokens
survive byte for byte, an existing token is not overwritten, a malformed token name is rejected, and
a value containing a brace cannot break out of the block. It also runs the injection twice to confirm
it is idempotent.

## The two tools

**`readFiles`** takes up to 20 workspace relative paths, returns contents, and caps each file at
256 KB with a truncation marker rather than blowing the context window.

**`injectTailwindTokens`** takes a path and a record of token name to value. It never overwrites.
An existing token is reported under `skippedExisting` and left alone, which is deliberate: silently
changing a token the model did not read is how a palette drifts. `dryRun: true` returns the same
report without writing.

## Why it cannot eat your dark mode

Tailwind v4 keeps tokens in a top level `@theme` at-rule. Dark palettes live somewhere else, in a
`.dark` rule or inside a media query. The injector resolves the `@theme` node once through
`root.walkAtRules("theme", ...)` and only ever appends to that node. A `.dark` rule is a PostCSS
`Rule`, not an `AtRule` named `theme`, so the traversal never visits it and no code path can rewrite
it. A nested `@theme` inside a media query is skipped for the same reason in reverse: appending to it
would attach tokens to that query's condition.

Writes go to a sibling temp file and are then renamed, so an interrupted run cannot leave a half
written stylesheet on disk.

## Version note

This targets AI SDK v4, where the agentic loop is `maxSteps: 5` on `generateText` and tool schemas
use `parameters`. On v5 those became `stopWhen: stepCountIs(5)` and `inputSchema`. If you upgrade,
those are the two edits.
