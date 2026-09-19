import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * TASK-003 §7.4 / §11: the read-only guarantee must be checkable, not just
 * documented. This test walks the lookup path's static import graph and
 * fails if it can ever reach the test-only seeding code — or any write
 * primitive at all.
 */

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IMPORT_PATTERN = /^\s*(?:import|export)\b[^'"]*?\bfrom\s+['"]([^'"]+)['"]/gmu;

/** Resolves a relative `.js` import back to its `.ts` source. */
function resolveLocal(fromFile: string, specifier: string): string {
  const target = path.resolve(path.dirname(fromFile), specifier);
  return target.replace(/\.js$/u, ".ts");
}

/** Every local module transitively reachable from `entry`, plus each file's external specifiers. */
function walkImports(entry: string): { files: Set<string>; externals: Set<string> } {
  const files = new Set<string>();
  const externals = new Set<string>();
  const queue = [entry];
  while (queue.length > 0) {
    const file = queue.pop();
    if (!file || files.has(file)) {
      continue;
    }
    files.add(file);
    const source = readFileSync(file, "utf-8");
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (!specifier) {
        continue;
      }
      if (specifier.startsWith(".")) {
        queue.push(resolveLocal(file, specifier));
      } else {
        externals.add(specifier);
      }
    }
  }
  return { files, externals };
}

const LOOKUP_ENTRY = path.join(__dirname, "lookup.ts");
const PUBLIC_ENTRY = path.join(__dirname, "index.ts");
const TESTING_DIR = path.join(__dirname, "testing") + path.sep;

describe("lookup path import boundary", () => {
  it("never reaches the test-only seeding module", () => {
    const { files } = walkImports(LOOKUP_ENTRY);
    const leaks = [...files].filter((file) => file.startsWith(TESTING_DIR));
    expect(leaks).toEqual([]);
  });

  it("the public entry point never re-exports the seeding module either", () => {
    const { files } = walkImports(PUBLIC_ENTRY);
    const leaks = [...files].filter((file) => file.startsWith(TESTING_DIR));
    expect(leaks).toEqual([]);
  });

  it("contains no write primitive in any reachable source file", () => {
    const { files } = walkImports(LOOKUP_ENTRY);
    const writePrimitives = /\b(insertInto|updateTable|deleteFrom|mergeInto|replaceInto)\b/u;
    const offenders = [...files].filter((file) =>
      writePrimitives.test(readFileSync(file, "utf-8")),
    );
    expect(offenders).toEqual([]);
  });

  it("does not call the Polish diacritic fold - retrieval-only helper, never identity (§6.4)", () => {
    const lookupSource = readFileSync(LOOKUP_ENTRY, "utf-8");
    const codeOnly = lookupSource.replace(/\/\*[\s\S]*?\*\//gu, "").replace(/\/\/.*$/gmu, "");
    expect(codeOnly).not.toMatch(/polishDiacriticFold\s*\(/u);
  });

  it("depends only on the database types, kysely and its own siblings", () => {
    const { externals } = walkImports(LOOKUP_ENTRY);
    expect([...externals].sort()).toEqual(["@name-atlas/db", "kysely"]);
  });
});
