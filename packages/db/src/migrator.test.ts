import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { MIGRATIONS_DIR } from "./migrator.js";

describe("MIGRATIONS_DIR", () => {
  it("resolves to an existing directory containing only the bootstrap migration", () => {
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".ts"));
    expect(files).toEqual(["0001_bootstrap_extensions.ts"]);
  });
});
