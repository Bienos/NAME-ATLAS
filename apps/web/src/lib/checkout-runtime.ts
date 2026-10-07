import { createAccountsDb, createPurchases } from "@name-atlas/accounts";
import type { Accounts, Purchases } from "@name-atlas/accounts";
import { accountsRuntime } from "./accounts-runtime.js";
import {
  automaticTaxEnabled,
  checkoutEnabled,
  checkoutTesters,
  STRIPE_KEY_ENV,
  STRIPE_WEBHOOK_ENV,
} from "./checkout-config.js";

/**
 * Test-mode checkout as the running site uses it (TASK-111): the purchases
 * store over the **accounts pool** (the table is in schema `accounts`, written
 * by the same role), and Stripe's test key and webhook secret, made on first
 * use.
 *
 * `null` when checkout is off (`checkout-config.ts`) or accounts are: nothing
 * is created and every checkout route answers 404.
 */

export interface CheckoutRuntime {
  readonly accounts: Pick<Accounts, "sessionFromToken">;
  readonly purchases: Purchases;
  readonly secretKey: string;
  readonly webhookSecret: string;
  readonly automaticTax: boolean;
  /** The accounts that may buy in test mode (`CHECKOUT_TESTERS`, TASK-154); empty: nobody. */
  readonly testers: ReadonlySet<string>;
  /** `SITE_ORIGIN`, without a trailing slash. */
  readonly origin: string;
  readonly secure: boolean;
}

let cached: CheckoutRuntime | null | undefined;

export function checkoutRuntime(env: NodeJS.ProcessEnv = process.env): CheckoutRuntime | null {
  if (cached !== undefined) return cached;
  if (!checkoutEnabled(env)) return (cached = null);
  const accounts = accountsRuntime(env);
  if (accounts === null) return (cached = null);
  cached = {
    accounts: accounts.accounts,
    purchases: createPurchases({ db: createAccountsDb(accounts.pool) }),
    secretKey: (env[STRIPE_KEY_ENV] ?? "").trim(),
    webhookSecret: (env[STRIPE_WEBHOOK_ENV] ?? "").trim(),
    automaticTax: automaticTaxEnabled(env),
    testers: checkoutTesters(env),
    origin: accounts.origin,
    secure: accounts.secure,
  };
  return cached;
}
