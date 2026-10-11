import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Checkout made ready for real payments (TASK-179, ADR-0052).
 * `accounts.purchases` learns what a real sale needs:
 *
 * - `payment_intent_id`: the PaymentIntent behind the Checkout Session. Stripe's
 *   refund and dispute events name the charge's PaymentIntent, not the session,
 *   so a purchase is found by it. Unique when present.
 * - `withdrawal_consent`: the version of the statement the buyer ticked before
 *   paying (immediate access, and losing the 14-day right of withdrawal). A
 *   live purchase must carry it and its PaymentIntent.
 * - `receipt_sent_at`: when the confirmation email went out; null until then,
 *   so a webhook Stripe retries sends it once it can.
 * - `revoked_at` and `revoked_reason` (`refunded` or `disputed`): a revoked
 *   purchase unlocks nothing. The row stays: it is the record of a sale.
 * - `purchases_test_only` is dropped. Whether a live event is recorded is
 *   decided by the site's configuration (`CHECKOUT_LIVE`), which only the owner
 *   sets once ADR-0023 §2.5's gates are met.
 *
 * No new grants: the app role's rights on schema `accounts` cover the columns.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`
    ALTER TABLE accounts.purchases
      ADD COLUMN payment_intent_id  text,
      ADD COLUMN withdrawal_consent text,
      ADD COLUMN receipt_sent_at    timestamptz,
      ADD COLUMN revoked_at         timestamptz,
      ADD COLUMN revoked_reason     text,
      ADD CONSTRAINT purchases_payment_intent_shape
        CHECK (payment_intent_id ~ '^pi_[A-Za-z0-9_]{1,250}$'),
      ADD CONSTRAINT purchases_consent_shape
        CHECK (withdrawal_consent ~ '^[a-z0-9-]{1,32}$'),
      ADD CONSTRAINT purchases_revoked_reason_known
        CHECK (revoked_reason IN ('refunded', 'disputed')),
      ADD CONSTRAINT purchases_revoked_pair
        CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL)),
      ADD CONSTRAINT purchases_live_complete
        CHECK (livemode = false OR (withdrawal_consent IS NOT NULL AND payment_intent_id IS NOT NULL)),
      DROP CONSTRAINT purchases_test_only
  `.execute(db);
  await sql`
    CREATE UNIQUE INDEX purchases_payment_intent_idx
      ON accounts.purchases (payment_intent_id) WHERE payment_intent_id IS NOT NULL
  `.execute(db);
}

/**
 * Refuses while a live or a revoked purchase is stored: a down migration must
 * never delete a record of a sale or of its refund. Test purchases' consent,
 * receipt and PaymentIntent are dropped with the columns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM accounts.purchases
     WHERE livemode = true OR revoked_at IS NOT NULL
  `.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error("refusing to undo 0048: live or revoked purchases are stored (TASK-179).");
  }
  await sql`DROP INDEX accounts.purchases_payment_intent_idx`.execute(db);
  await sql`
    ALTER TABLE accounts.purchases
      DROP CONSTRAINT purchases_live_complete,
      DROP COLUMN payment_intent_id,
      DROP COLUMN withdrawal_consent,
      DROP COLUMN receipt_sent_at,
      DROP COLUMN revoked_at,
      DROP COLUMN revoked_reason,
      ADD CONSTRAINT purchases_test_only CHECK (livemode = false)
  `.execute(db);
}
