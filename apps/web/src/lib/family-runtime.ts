import { createFamily, createFamilyDb } from "@name-atlas/family";
import type { Family } from "@name-atlas/family";
import type { Accounts } from "@name-atlas/accounts";
import { accountsRuntime } from "./accounts-runtime.js";
import { familyTreeEnabled } from "./family-config.js";
import { TREE_LEGAL_UPDATED } from "./legal-text.js";

/**
 * The family tree the running site uses (TASK-076, ADR-0029 §2.1): the service
 * over schema `family`, on the **accounts pool**, made on first use. The same
 * role (`nameatlas_app`) reads and writes both schemas, and one pool per
 * instance is what the serverless host can afford (`accounts-runtime.ts`).
 * The read-only pool of `db.ts` is never used for a tree; the birthplace
 * lookup uses it, with no user id in that query (`tree-places.ts`).
 *
 * `null` when the tree is off (`family-config.ts`): nothing is created.
 */

export interface FamilyRuntime {
  readonly family: Family;
  readonly accounts: Pick<Accounts, "sessionFromToken" | "acceptTerms">;
  readonly secure: boolean;
  /** The terms version an account must carry to hold a living person (ADR-0029 §2.4.12). */
  readonly livingTermsVersion: string;
}

let cached: FamilyRuntime | null | undefined;

export function familyRuntime(env: NodeJS.ProcessEnv = process.env): FamilyRuntime | null {
  if (cached !== undefined) return cached;
  if (!familyTreeEnabled(env)) return (cached = null);
  const accounts = accountsRuntime(env);
  if (accounts === null) return (cached = null);
  cached = {
    family: createFamily({ db: createFamilyDb(accounts.pool) }),
    accounts: accounts.accounts,
    secure: accounts.secure,
    livingTermsVersion: TREE_LEGAL_UPDATED,
  };
  return cached;
}

/** Test-only: forget the memo so a test can observe a fresh runtime. */
export function resetFamilyRuntimeForTests(): void {
  cached = undefined;
}
