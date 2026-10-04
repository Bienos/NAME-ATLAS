import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Test-mode checkout (TASK-111): schema `accounts` learns what a reader bought.
 *
 * - `purchases`: one row per paid Stripe Checkout Session, written only by the
 *   signed webhook (never by the success page). `checkout_session_id` is
 *   unique, so a webhook Stripe sends twice records one purchase.
 * - `tier` is one of the three sellable tiers of ADR-0037 (`smaller`,
 *   `couple`, `family`); the 800 zł tier is not sold until its consumer terms
 *   exist (ADR-0023 §2.5).
 * - `livemode` must be false: real payments wait on the owner's legal and tax
 *   gates (ADR-0023 §2.4–§2.5), so a live purchase cannot be stored.
 * - `user_id` is set to null, not deleted, when the account is deleted: the
 *   record of a sale outlives the account (it holds no address, only Stripe's
 *   session id, the tier and the amount).
 *
 * The app role's grants on schema `accounts` cover the table by the default
 * privileges `ops/vm/accounts-roles.sql` sets; that file does not change.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    CREATE TABLE accounts.purchases (
      purchase_id         uuid PRIMARY KEY,
      user_id             uuid REFERENCES accounts.users (user_id) ON DELETE SET NULL,
      tier                text NOT NULL,
      checkout_session_id text NOT NULL,
      amount_total        integer NOT NULL,
      currency            text NOT NULL,
      livemode            boolean NOT NULL,
      paid_at             timestamptz NOT NULL,
      CONSTRAINT purchases_tier_known CHECK (tier IN ('smaller', 'couple', 'family')),
      CONSTRAINT purchases_session_shape CHECK (checkout_session_id ~ '^cs_[A-Za-z0-9_]{1,250}$'),
      CONSTRAINT purchases_session_unique UNIQUE (checkout_session_id),
      CONSTRAINT purchases_amount_positive CHECK (amount_total > 0),
      CONSTRAINT purchases_currency_pln CHECK (currency = 'pln'),
      CONSTRAINT purchases_test_only CHECK (livemode = false)
    )
  `.execute(db);
  await sql`CREATE INDEX purchases_user_idx ON accounts.purchases (user_id)`.execute(db);
}

/** Refuses while any purchase is stored: a down migration must never delete a record of a sale. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM accounts.purchases
  `.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error("refusing to undo 0035: purchases are stored (TASK-111).");
  }
  await sql`DROP TABLE accounts.purchases`.execute(db);
}
