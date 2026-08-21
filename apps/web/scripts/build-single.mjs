/** Runs the single file build then inlines it. One command, no env var juggling on PowerShell. */
import { execSync } from "node:child_process";
execSync("npx vite build", { stdio: "inherit", env: { ...process.env, BLUEBERRY_SINGLE_FILE: "1" } });
execSync("node scripts/inline-single-file.mjs", { stdio: "inherit" });
