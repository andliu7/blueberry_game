import { EXIT_HARNESS_ERROR, EXIT_OK, EXIT_SUITE_MODIFIED } from "./exit-codes.ts";
import {
  checkIntegrity,
  formatIntegrityFailure,
  regenerateLock,
  HASH_ALGORITHM,
  LOCK_SCHEMA_VERSION,
} from "./integrity.ts";
import { LOCK_PATH, toPackageRelative } from "./paths.ts";

/**
 * The lock CLI. Two subcommands, no flags, no prompts.
 *
 *   check   compare the package against the committed lock, exit nonzero on any mismatch
 *   regen   write a fresh lock
 *
 * These are separate commands on purpose. CLAUDE.md: "Regenerating the lock is a
 * separate commit, made deliberately, never in the same commit as a fix to something the
 * suite was failing." Nothing here regenerates as a side effect of a failed check, and
 * the validator CLI has no path to regenerateLock() at all.
 */

const USAGE = [
  "usage: lock <check|regen>",
  "",
  "  check   compare packages/validators against validators.lock.json.",
  "          Exits 0 when identical, 2 on any difference. Writes nothing.",
  "  regen   write a fresh validators.lock.json from the current contents.",
  "          A deliberate act. Commit the result on its own.",
].join("\n");

async function commandCheck(): Promise<number> {
  const report = await checkIntegrity();

  if (report.status === "unmodified") {
    console.log("SUITE INTEGRITY: unmodified");
    console.log(`  files hashed: ${report.fileCountOnDisk}`);
    console.log(`  algorithm:    ${HASH_ALGORITHM}, lock schema v${LOCK_SCHEMA_VERSION}`);
    console.log(`  suite hash:   ${report.suiteHashOnDisk}`);
    return EXIT_OK;
  }

  for (const line of formatIntegrityFailure(report)) console.log(line);
  return EXIT_SUITE_MODIFIED;
}

async function commandRegen(): Promise<number> {
  const lock = await regenerateLock();
  console.log("SUITE INTEGRITY: lock regenerated");
  console.log(`  wrote:        ${toPackageRelative(LOCK_PATH)}`);
  console.log(`  files hashed: ${lock.fileCount}`);
  console.log(`  algorithm:    ${lock.algorithm}, lock schema v${lock.schemaVersion}`);
  console.log(`  suite hash:   ${lock.suiteHash}`);
  console.log("");
  console.log("Commit this on its own. Never in the same commit as a fix to something");
  console.log("the suite was failing, so the diff shows what was accepted and when.");
  return EXIT_OK;
}

async function main(argv: readonly string[]): Promise<number> {
  const subcommand = argv[0];

  switch (subcommand) {
    case "check":
      return await commandCheck();
    case "regen":
      return await commandRegen();
    default:
      console.log(USAGE);
      if (subcommand !== undefined) console.log(`\nunknown subcommand: ${subcommand}`);
      return EXIT_HARNESS_ERROR;
  }
}

try {
  process.exitCode = await main(process.argv.slice(2));
} catch (error) {
  console.log("LOCK HARNESS ERROR");
  console.log(`  ${error instanceof Error ? error.stack ?? error.message : String(error)}`);
  process.exitCode = EXIT_HARNESS_ERROR;
}
