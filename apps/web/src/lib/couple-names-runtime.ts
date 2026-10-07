import type { Accounts } from "@name-atlas/accounts";
import { apiKeyFromEnv, completeJson } from "@name-atlas/llm";
import {
  countReadingsSince,
  findBirthGivenName,
  findReading,
  readGivenNameMeaning,
  storeReading,
} from "@name-atlas/truth";
import { accountsRuntime } from "./accounts-runtime.js";
import {
  COUPLE_NAMES_DAILY_CAP,
  COUPLE_NAMES_MODEL,
  COUPLE_NAMES_PROMPT_VERSION,
  coupleNamesEnabled,
} from "./couple-names-config.js";
import type { CoupleNamesDeps } from "./couple-names-page.js";
import type { CoupleNamesRouteDeps } from "./couple-names-routes.js";
import type { AccountLog } from "./account-routes.js";
import { db } from "./db.js";

/**
 * The couple first-names page as the running site uses it (TASK-156): the
 * flag, the accounts service (a session is required), and the model's key,
 * read once per process. `null` when the page is off or accounts are, in
 * which case nothing is created and every route answers 404.
 *
 * The claims and the readings are on the read pool of `db.ts`; the readings
 * table is the one thing the web role writes in `public` (migration 0047),
 * so the role must have `INSERT` on it where the page is on.
 */

export interface CoupleNamesRuntime {
  readonly accounts: Pick<Accounts, "sessionFromToken">;
  readonly secure: boolean;
  /** Undefined when `OPENAI_API_KEY` is unset: readings are unavailable and nothing is sent. */
  readonly apiKey: string | undefined;
}

let cached: CoupleNamesRuntime | null | undefined;

export function coupleNamesRuntime(
  env: NodeJS.ProcessEnv = process.env,
): CoupleNamesRuntime | null {
  if (cached !== undefined) return cached;
  if (!coupleNamesEnabled(env)) return (cached = null);
  const accounts = accountsRuntime(env);
  if (accounts === null) return (cached = null);
  cached = { accounts: accounts.accounts, secure: accounts.secure, apiKey: apiKeyFromEnv(env) };
  return cached;
}

/** The page's deps over the shared handle. */
export function runningCoupleNamesDeps(env: NodeJS.ProcessEnv = process.env): CoupleNamesDeps {
  return {
    findName: (typed) => findBirthGivenName(db(), typed),
    readMeaning: (id) => readGivenNameMeaning(db(), id, "FREE"),
    findReading: (key) => findReading(db(), key),
    readingsAvailable: apiKeyFromEnv(env) !== undefined,
  };
}

/** The route's deps: the page's, the store, and the model call with the key read at call time. */
export function runningCoupleNamesRouteDeps(
  runtime: CoupleNamesRuntime,
  log: AccountLog,
): CoupleNamesRouteDeps {
  const page = runningCoupleNamesDeps();
  return {
    accounts: runtime.accounts,
    secure: runtime.secure,
    findName: page.findName,
    readMeaning: page.readMeaning,
    findReading: page.findReading,
    storeReading: (key, reading) => storeReading(db(), key, reading),
    countReadingsSince: (since) => countReadingsSince(db(), since),
    complete:
      runtime.apiKey === undefined
        ? null
        : (input) => completeJson(input, { apiKey: runtime.apiKey }),
    model: COUPLE_NAMES_MODEL,
    promptVersion: COUPLE_NAMES_PROMPT_VERSION,
    dailyCap: COUPLE_NAMES_DAILY_CAP,
    log,
  };
}

/** Test-only: forget the memo so a test can observe a fresh runtime. */
export function resetCoupleNamesRuntimeForTests(): void {
  cached = undefined;
}
