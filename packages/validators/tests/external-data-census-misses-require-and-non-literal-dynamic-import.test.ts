import { describe, expect, it } from "vitest";

import { censusFindings, scanImports, type ImportCensus } from "../src/integrity.ts";

/**
 * ADVERSARY PASS FOUR, PHASE 1, ATTACK SURFACE 4: "look for any other syntax that moves
 * values without producing a value binding." The barrel export gap (`export * from "pkg"`
 * recorded as no value binding at all) was found by the third pass adversary and closed;
 * see `external-data-census-barrel-export-blind-spot.test.ts`. This file is the fourth way
 * in, found by asking the question the fix's own docstring does not ask: `scanImports`
 * only ever matches three shapes, `import ... from "x"`, `export ... from "x"`, the bare
 * side effect `import "x"`, and `import("x")` with a LITERAL quoted specifier immediately
 * inside the parentheses. Node has more than one way to pull a value in from a package, and
 * two of them are not any of those four shapes.
 *
 * ATTACK ONE. `require("pkg")`, CommonJS interop.
 *
 * `scanImports`'s regexes all anchor on the keywords `import` or `export`. `require` is
 * neither: it is an ordinary identifier bound to an ordinary function call,
 * `const thing = require("totally-new-external-package")`, and nothing in this file's
 * regex set is looking for the identifier `require` at all. This is not a theoretical
 * concern in an ESM package: `node:module`'s `createRequire` is a standard, working way to
 * obtain a working `require` inside an ES module, and `packages/validators` itself already
 * runs under `node --experimental-strip-types`, an environment CommonJS interop works in
 * exactly the same way it does in ordinary Node. A validator source file that wrote
 * `const req = createRequire(import.meta.url); const rdkit = req("@rdkit/rdkit");` would
 * import `@rdkit/rdkit` for its value with a working, executable line of code, and the
 * census would say nothing about it at all: not `seenPackages`, not `byPackage`, not a
 * `censusFindings` entry. This is a strictly worse blind spot than the barrel export gap
 * closed already, because that gap at least populated `seenPackages`; this one populates
 * neither set the scanner keeps, since `scanImports` returns no `ImportSite` for the line
 * whatsoever.
 *
 * ATTACK TWO. `import(specifier)` where `specifier` is not a string literal.
 *
 * The dynamic import regex is `/\bimport\s*\(\s*["']([^"'`]+)["']/`, which requires a
 * quote character immediately after the opening parenthesis. `await import(someVariable)`
 * has no quote there at all, so the regex does not match and the site is never recorded.
 * This is not a hypothetical shape invented for this test: `packages/validators` already
 * contains exactly this pattern, in production code, today.
 * `measure/bundle.ts`'s `loadEsbuild()` writes `const specifier = "esbuild";` on one line
 * and `const loaded = (await import(specifier))` on the next, and its own comment says
 * plainly that esbuild "is not declared in this package's package.json, which is a real
 * gap reported to the orchestrator rather than papered over here". That comment is honest
 * about esbuild specifically and does not generalise the shape: ANY package pulled in
 * through a variable passed to `import()`, not only esbuild, is invisible to this scanner
 * for the same reason, and nothing about the regex distinguishes an accepted, reported
 * exception from a new one nobody has looked at.
 *
 * WHY BOTH ARE TESTED AGAINST THE REAL EXPORTED PIPELINE RATHER THAN A MOCK, AND WHY THE
 * KEYWORDS ARE ASSEMBLED AT RUNTIME.
 *
 * Same reasoning as the neighbouring barrel test file: `scanImports` and `censusFindings`
 * are exercised unmodified and exported, `censusFromSource` below is copied line for line
 * from `censusOverHashedFiles`'s own construction so this is a faithful reproduction of the
 * production code path, and every keyword that would otherwise read as a real import of
 * this test file by the census that scans this package (`require`, `import(`) is assembled
 * from string pieces at runtime so this specimen text is never itself counted.
 *
 * THIS IS FILED AS OBSERVED, CURRENT BEHAVIOUR, NOT AS A FAILING SPEC.
 *
 * Every assertion below passes against the code on disk today. That is the finding: a
 * validator source file can import an entirely undeclared external package for its values,
 * through either shape, and `npm run validate` proceeds through all twenty seven checks
 * without one word about it. Fixture and test writing is this adversary's whole write
 * scope; the fix, whatever shape it takes (a `require(` scan, a warning on any
 * non-literal argument to `import(`, or refusing to build at all on a call whose specifier
 * this scanner cannot read, mirroring how `extractCompetingRoutes` refuses to guess at a
 * `competingRoutes` property it cannot parse rather than silently skipping it) is
 * implementation code and is reported rather than made here.
 */

const REQUIRE_KEYWORD = ["requ", "ire"].join("");
const IMPORT_KEYWORD = ["imp", "ort"].join("");

/**
 * censusOverHashedFiles's own construction, copied faithfully from src/integrity.ts, exactly
 * as the neighbouring barrel test file does, so this exercises the identical rule rather
 * than a paraphrase of it.
 */
function censusFromSource(specimen: { readonly relativePath: string; readonly source: string }): ImportCensus {
  const byPackage = new Map<string, Map<string, Set<string>>>();
  const seenPackages = new Set<string>();

  const isExternal = (specifier: string): boolean =>
    !specifier.startsWith(".") && !specifier.startsWith("/") && !specifier.startsWith("node:");
  const packageOf = (specifier: string): string => {
    const parts = specifier.split("/");
    return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : (parts[0] as string);
  };

  for (const site of scanImports(specimen.source)) {
    if (!isExternal(site.specifier)) continue;
    const pkg = packageOf(site.specifier);
    seenPackages.add(pkg);
    if (site.valueBindings.length === 0) continue;
    const bindings = byPackage.get(pkg) ?? new Map<string, Set<string>>();
    byPackage.set(pkg, bindings);
    for (const binding of site.valueBindings) {
      const where = bindings.get(binding) ?? new Set<string>();
      bindings.set(binding, where);
      where.add(specimen.relativePath);
    }
  }

  return { byPackage, seenPackages };
}

describe("scanImports sees an ordinary named import of a new package, the control case", () => {
  it("`import { x } from \"pkg\"` produces a site with the value binding", () => {
    const sites = scanImports(`${IMPORT_KEYWORD} { x } from "totally-new-external-package";`);
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("totally-new-external-package");
    expect(sites[0]?.valueBindings).toEqual(["x"]);
  });
});

describe("scanImports produces no ImportSite at all for require(), CommonJS interop", () => {
  it("a bare `const x = require(\"pkg\")` is invisible to the scanner, not merely unbound", () => {
    const source = `const x = ${REQUIRE_KEYWORD}("totally-new-external-package");`;
    const sites = scanImports(source);
    // Not "valueBindings is empty". Zero SITES: the specifier never appears anywhere in
    // the scanner's output, which is a stronger miss than the barrel export gap left,
    // because that gap still recorded the specifier in `seenPackages`.
    expect(sites).toHaveLength(0);
  });

  it("destructuring the require() result is equally invisible", () => {
    const source = `const { competingRoutesFor } = ${REQUIRE_KEYWORD}("totally-new-external-package");`;
    expect(scanImports(source)).toHaveLength(0);
  });

  it("createRequire(import.meta.url)(\"pkg\") is invisible past the createRequire import itself", () => {
    const source = [
      `import { createRequire } from "node:module";`,
      `const req = createRequire(import.meta.url);`,
      `const rdkit = req("totally-new-external-package");`,
    ].join("\n");
    const sites = scanImports(source);
    // node:module IS seen, because createRequire is imported the ordinary way and
    // node: specifiers are excluded downstream by isExternalSpecifier, not by the scanner.
    // The actual value pull, req("totally-new-external-package"), contributes nothing.
    expect(sites).toHaveLength(1);
    expect(sites[0]?.specifier).toBe("node:module");
    expect(sites.some((site) => site.specifier === "totally-new-external-package")).toBe(false);
  });
});

describe("scanImports also misses import() when the specifier is not a string literal", () => {
  it("`import(variable)` produces no ImportSite, unlike `import(\"literal\")`", () => {
    const literal = scanImports(`void ${IMPORT_KEYWORD}("totally-new-external-package");`);
    expect(literal).toHaveLength(1);
    expect(literal[0]?.specifier).toBe("totally-new-external-package");

    const dynamic = [
      `const specifier = "totally-new-external-package";`,
      `const loaded = await ${IMPORT_KEYWORD}(specifier);`,
    ].join("\n");
    expect(scanImports(dynamic)).toHaveLength(0);
  });

  it(
    "this exact shape already exists, accepted and reported, in measure/bundle.ts's " +
      "loadEsbuild(): a variable specifier defeats the regex for any package, not only esbuild",
    () => {
      // Reproduced from measure/bundle.ts's own loadEsbuild(), word for word except for the
      // package name, to show the shape is not invented for this test.
      const source = [
        `const specifier = "totally-new-external-package";`,
        `const loaded = (await ${IMPORT_KEYWORD}(specifier)) as unknown as EsbuildModule;`,
      ].join("\n");
      expect(scanImports(source)).toHaveLength(0);
    },
  );
});

describe(
  "the consequence: an entirely undeclared external package, imported for its values only " +
    "through require() or a non literal import(), produces zero censusFindings",
  () => {
    it("require() path: seenPackages, byPackage, and censusFindings all stay empty", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/smuggled-require.ts",
        source: `const rdkit = ${REQUIRE_KEYWORD}("totally-new-external-package");\n`,
      });

      // Contrast with the barrel gap: that one still set seenPackages.has(pkg) to true.
      // This one does not, because scanImports never emitted a site to seed it from.
      expect(census.seenPackages.has("totally-new-external-package")).toBe(false);
      expect(census.byPackage.has("totally-new-external-package")).toBe(false);

      const findings = censusFindings(census, []);
      expect(
        findings.some((finding) => finding.detail.includes("totally-new-external-package")),
      ).toBe(false);
      expect(findings).toEqual([]);
    });

    it("non literal import() path: the same silence, reproducing loadEsbuild()'s own shape", () => {
      const census = censusFromSource({
        relativePath: "src/checks/conservation/smuggled-dynamic-import.ts",
        source: [
          `const specifier = "totally-new-external-package";`,
          `const loaded = await ${IMPORT_KEYWORD}(specifier);`,
        ].join("\n"),
      });

      expect(census.seenPackages.has("totally-new-external-package")).toBe(false);
      expect(census.byPackage.has("totally-new-external-package")).toBe(false);
      expect(censusFindings(census, [])).toEqual([]);
    });

    it(
      "contrast: the same new package, pulled in through the two already closed holes, IS " +
        "caught, which is what makes the two above a live gap rather than a restatement",
      () => {
        const barrel = censusFromSource({
          relativePath: "src/checks/conservation/barrel.ts",
          source: `${["exp", "ort"].join("")} * from "totally-new-external-package";\n`,
        });
        expect(censusFindings(barrel, []).map((finding) => finding.kind)).toEqual([
          "undeclared-package",
        ]);

        const direct = censusFromSource({
          relativePath: "src/checks/conservation/direct.ts",
          source: `${IMPORT_KEYWORD} { thing } from "totally-new-external-package";\n`,
        });
        expect(censusFindings(direct, []).map((finding) => finding.kind)).toEqual([
          "undeclared-package",
        ]);
      },
    );
  },
);
