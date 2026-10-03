import {
  createAccounts,
  createAccountsDb,
  createPasswordHasher,
  createResendMailer,
  loadMailConfig,
} from "@name-atlas/accounts";
import type { AccountLinks, Accounts, Mailer } from "@name-atlas/accounts";
import { createPool, loadAccountsDbConfig } from "@name-atlas/db";
import { accountPath } from "./account-paths.js";
import { accountsEnabled } from "./accounts-config.js";
import { familyTreeEnabled } from "./family-config.js";
import { ACCOUNTS_LEGAL_UPDATED, TREE_LEGAL_UPDATED } from "./legal-text.js";

/**
 * The accounts the running site uses (TASK-062, ADR-0027 §2.2): one pool for
 * schema `accounts`, the service over it, and the mailer, made on first use.
 *
 * **Its own pool**, from `ACCOUNTS_DATABASE_URL`, which names the role
 * `nameatlas_app`; the read-only pool of `db.ts` and its `DATABASE_URL` are
 * never used for an account, and this pool is never used for the register.
 * Two connections, as `db.ts` and for the same reason: on a serverless host
 * each instance has its own.
 *
 * `null` when accounts are off (`accounts-config.ts`), in which case nothing is
 * created, the database is not contacted and a build needs none of the
 * variables.
 */

export interface AccountsRuntime {
  readonly accounts: Accounts;
  /** The pool of schema `accounts`; the family tree's service shares it (TASK-076), as the same role. */
  readonly pool: ReturnType<typeof createPool>;
  readonly mailer: Mailer;
  /** Whether the site is served over HTTPS, which decides the cookie's name and `Secure`. */
  readonly secure: boolean;
  readonly cronSecret: string;
  /** The date of the terms a sign-up accepts: the tree variant's when the tree is on (TASK-076), else the accounts variant's. */
  readonly termsVersion: string;
}

const MAX_CONNECTIONS_PER_INSTANCE = 2;
const IDLE_TIMEOUT_MS = 10_000;
const CONNECTION_TIMEOUT_MS = 5_000;

let cached: AccountsRuntime | null | undefined;

/** The absolute addresses the mails link to: the page, in the reader's language, carrying the token. */
export function accountLinks(origin: string): AccountLinks {
  return {
    verify: (token, language) => `${origin}${accountPath(language, "confirm", { token })}`,
    reset: (token, language) => `${origin}${accountPath(language, "new-password", { token })}`,
  };
}

export function accountsRuntime(env: NodeJS.ProcessEnv = process.env): AccountsRuntime | null {
  if (cached !== undefined) return cached;
  if (!accountsEnabled(env)) return (cached = null);

  const database = loadAccountsDbConfig(env);
  const mail = loadMailConfig(env);
  const origin = env["SITE_ORIGIN"]?.trim().replace(/\/+$/u, "");
  const cronSecret = env["CRON_SECRET"]?.trim();
  if (database === null || mail === null || !origin || !cronSecret) return (cached = null);

  const pool = createPool(database, {
    max: MAX_CONNECTIONS_PER_INSTANCE,
    idleTimeoutMillis: IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  const accounts = createAccounts({
    db: createAccountsDb(pool),
    hasher: createPasswordHasher(),
    links: accountLinks(origin),
  });
  cached = {
    accounts,
    pool,
    mailer: createResendMailer(mail),
    secure: origin.startsWith("https://"),
    cronSecret,
    termsVersion: familyTreeEnabled(env) ? TREE_LEGAL_UPDATED : ACCOUNTS_LEGAL_UPDATED,
  };
  return cached;
}

/** Test-only: forget the memo so a test can observe a fresh runtime. */
export function resetAccountsRuntimeForTests(): void {
  cached = undefined;
}
