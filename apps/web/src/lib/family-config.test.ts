import { describe, expect, it } from "vitest";
import { FAMILY_TREE_ENV, familyTreeEnabled } from "./family-config.js";
import { ACCOUNTS_ENV } from "./accounts-config.js";

const ACCOUNTS: Record<string, string> = Object.fromEntries(ACCOUNTS_ENV.map((n) => [n, "set"]));

describe("familyTreeEnabled (TASK-076, AC-1)", () => {
  it("is on only with accounts on and the variable exactly 1", () => {
    expect(familyTreeEnabled({ ...ACCOUNTS, [FAMILY_TREE_ENV]: "1" })).toBe(true);
    expect(familyTreeEnabled({ ...ACCOUNTS, [FAMILY_TREE_ENV]: " 1 " })).toBe(true);
    expect(familyTreeEnabled({ ...ACCOUNTS })).toBe(false);
    expect(familyTreeEnabled({ ...ACCOUNTS, [FAMILY_TREE_ENV]: "true" })).toBe(false);
    expect(familyTreeEnabled({ ...ACCOUNTS, [FAMILY_TREE_ENV]: "0" })).toBe(false);
    expect(familyTreeEnabled({ [FAMILY_TREE_ENV]: "1" })).toBe(false);
  });

  it("is off when any accounts variable is missing", () => {
    for (const name of ACCOUNTS_ENV) {
      const env: Record<string, string> = { ...ACCOUNTS, [FAMILY_TREE_ENV]: "1" };
      delete env[name];
      expect(familyTreeEnabled(env), name).toBe(false);
    }
  });
});
