import { accountsEnabled } from "./accounts-config.js";

/**
 * Whether the family tree's pages exist (TASK-073, ADR-0029 §2.5.19: the tree
 * is paid, so it stays dark until checkout exists; D-029).
 *
 * On only when accounts are on (`accounts-config.ts`: a tree belongs to an
 * account) **and** `FAMILY_TREE_ENABLED` is exactly `1`. Otherwise there is no
 * header link, every tree page and route answers 404, the terms version
 * recorded at sign-up stays the accounts variant's, and the legal pages read
 * as before. Production does not set the variable.
 *
 * Reads the variables by name and imports nothing that reaches the database,
 * so the header, which every page renders, stays free of the driver.
 */

export const FAMILY_TREE_ENV = "FAMILY_TREE_ENABLED";

type Env = Readonly<Record<string, string | undefined>>;

export function familyTreeEnabled(env: Env = process.env): boolean {
  return accountsEnabled(env) && (env[FAMILY_TREE_ENV]?.trim() ?? "") === "1";
}
