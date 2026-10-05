import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import type { AccountsDB, PurchaseTier } from "./schema.js";

/**
 * What a reader bought (TASK-111, migration 0036). Written only from Stripe's
 * signed webhook; read by the account page.
 *
 * `record` is idempotent on the Checkout Session's id: Stripe may send the
 * same event more than once, and both `checkout.session.completed` and
 * `checkout.session.async_payment_succeeded` can name one session.
 */

export interface PaidCheckout {
  readonly userId: string;
  readonly tier: PurchaseTier;
  readonly checkoutSessionId: string;
  readonly amountTotal: number;
  readonly currency: "pln";
  readonly livemode: boolean;
}

export interface PurchaseView {
  readonly tier: PurchaseTier;
  readonly amountTotal: number;
  readonly paidAt: Date;
}

export interface Purchases {
  /** True when this call stored the purchase, false when it was already stored. */
  record(paid: PaidCheckout): Promise<boolean>;
  listForUser(userId: string): Promise<readonly PurchaseView[]>;
}

export function createPurchases(deps: {
  readonly db: Kysely<AccountsDB>;
  readonly now?: () => Date;
  readonly newId?: () => string;
}): Purchases {
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? randomUUID;
  return {
    async record(paid) {
      const inserted = await deps.db
        .insertInto("purchases")
        .values({
          purchase_id: newId(),
          // A session whose account was deleted before the webhook arrived still records
          // the sale, with no user: the subquery is null instead of breaking the foreign key.
          user_id: sql<
            string | null
          >`(SELECT user_id FROM accounts.users WHERE user_id = ${paid.userId}::uuid)`,
          tier: paid.tier,
          checkout_session_id: paid.checkoutSessionId,
          amount_total: paid.amountTotal,
          currency: paid.currency,
          livemode: paid.livemode,
          paid_at: now(),
        })
        .onConflict((c) => c.column("checkout_session_id").doNothing())
        .returning("purchase_id")
        .executeTakeFirst();
      return inserted !== undefined;
    },
    async listForUser(userId) {
      const rows = await deps.db
        .selectFrom("purchases")
        .select(["tier", "amount_total", "paid_at"])
        .where("user_id", "=", userId)
        .orderBy("paid_at", "desc")
        .execute();
      return rows.map((r) => ({ tier: r.tier, amountTotal: r.amount_total, paidAt: r.paid_at }));
    },
  };
}
