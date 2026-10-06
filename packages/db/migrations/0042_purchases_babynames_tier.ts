import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * The 8,99 zł "baby names" product (TASK-144, D-045): `accounts.purchases.tier`
 * may now also be `babynames`, beside `smaller`, `couple` and `family`
 * (migration 0036). It is sold in test-mode checkout only; `livemode = false`
 * (0036) still refuses a real payment.
 *
 * Only the CHECK `purchases_tier_known` changes. No new grants: the app role's
 * rights on schema `accounts` cover the table already.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE accounts.purchases DROP CONSTRAINT purchases_tier_known`.execute(db);
  await sql`
    ALTER TABLE accounts.purchases ADD CONSTRAINT purchases_tier_known
      CHECK (tier IN ('babynames', 'smaller', 'couple', 'family'))
  `.execute(db);
}

/** Refuses while a `babynames` purchase is stored: a down migration must never delete a record of a sale. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM accounts.purchases WHERE tier = 'babynames'
  `.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error("refusing to undo 0042: babynames purchases are stored (TASK-144).");
  }
  await sql`ALTER TABLE accounts.purchases DROP CONSTRAINT purchases_tier_known`.execute(db);
  await sql`
    ALTER TABLE accounts.purchases ADD CONSTRAINT purchases_tier_known
      CHECK (tier IN ('smaller', 'couple', 'family'))
  `.execute(db);
}
