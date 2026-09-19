import { describe, expect, it } from "vitest";
import fs from "node:fs";
import { MIGRATIONS_DIR } from "./migrator.js";

describe("MIGRATIONS_DIR", () => {
  it("resolves to an existing directory containing exactly the migrations added so far, in order", () => {
    // One entry per task that added schema; a migration appearing here
    // before the task that owns it is scope creep (AGENTS.md §6).
    expect(fs.existsSync(MIGRATIONS_DIR)).toBe(true);
    const files = fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".ts"));
    expect(files).toEqual([
      "0001_bootstrap_extensions.ts", // TASK-001
      "0002_identity_core.ts", // TASK-003
    ]);
  });
});
