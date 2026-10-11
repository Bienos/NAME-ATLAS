import { createAccountsDb, createPurchases } from "@name-atlas/accounts";
import type { Accounts, Mailer, Purchases } from "@name-atlas/accounts";
import { accountsRuntime } from "./accounts-runtime.js";
import {
  automaticTaxEnabled,
  checkoutMode,
  checkoutTesters,
  STRIPE_KEY_ENV,
  STRIPE_WEBHOOK_ENV,
} from "./checkout-config.js";
import type { CheckoutMode } from "./checkout-config.js";

/**
 * Checkout as the running site uses it (TASK-111, TASK-179): the purchases
 * store over the **accounts pool** (the table is in schema `accounts`, written
 * by the same role), Stripe's key and webhook secret, and the accounts'
 * mailer for the purchase confirmation, made on first use.
 *
 * `null` when checkout is off (`checkout-config.ts`) or accounts are, and in
 * live mode when there is no mailer: a real sale must be confirmed by email.
 * Nothing is created then and every checkout route answers 404.
 */

export interface CheckoutRuntime {
  readonly mode: CheckoutMode;
  readonly accounts: Pick<Accounts, "sessionFromToken">;
  readonly purchases: Purchases;
  readonly secretKey: string;
  readonly webhookSecret: string;
  readonly automaticTax: boolean;
  /** Null in test mode without Resend: no confirmation is sent. Never null in live mode. */
  readonly mailer: Mailer | null;
  /** The accounts that may buy in test mode (`CHECKOUT_TESTERS`, TASK-154); empty: nobody. */
  readonly testers: ReadonlySet<string>;
  /** `SITE_ORIGIN`, without a trailing slash. */
  readonly origin: string;
  readonly secure: boolean;
}

let cached: CheckoutRuntime | null | undefined;

export function checkoutRuntime(env: NodeJS.ProcessEnv = process.env): CheckoutRuntime | null {
  if (cached !== undefined) return cached;
  const mode = checkoutMode(env);
  if (mode === null) return (cached = null);
  const accounts = accountsRuntime(env);
  if (accounts === null) return (cached = null);
  if (mode === "live" && accounts.mailer === null) return (cached = null);
  cached = {
    mode,
    accounts: accounts.accounts,
    purchases: createPurchases({ db: createAccountsDb(accounts.pool) }),
    secretKey: (env[STRIPE_KEY_ENV] ?? "").trim(),
    webhookSecret: (env[STRIPE_WEBHOOK_ENV] ?? "").trim(),
    automaticTax: automaticTaxEnabled(env),
    mailer: accounts.mailer,
    testers: checkoutTesters(env),
    origin: accounts.origin,
    secure: accounts.secure,
  };
  return cached;
}
