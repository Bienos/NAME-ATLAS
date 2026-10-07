import { BABY_NAMES_FULL_TIERS, TREE_UNLOCK_TIERS } from "@name-atlas/accounts";
import type { AccountSummary, PurchaseView } from "@name-atlas/accounts";
import type { TreeSummary } from "@name-atlas/family";
import { CHECKOUT_TIERS, tierOffer } from "./checkout-config.js";
import type { PurchaseRow } from "./checkout-section.js";

/**
 * What the account's dashboard shows beyond the session (TASK-153): the
 * account's own facts, its purchases and the plan they add up to, and its
 * family trees.
 *
 * Every read can fail on its own, and a failed read is `null`, never an empty
 * list or a zero: a reader whose purchases cannot be read is not told they
 * have none (`AGENTS.md` §10, absent is not zero). The page says it could not
 * read them instead.
 *
 * The plan is derived from the purchases exactly as the entitlements are
 * checked (`Purchases.hasPurchaseOf` with `TREE_UNLOCK_TIERS` and
 * `BABY_NAMES_FULL_TIERS`), so the dashboard never claims more or less than the
 * tree and the baby-names page will actually allow.
 */

/** Which signed-in sections exist on this site, from their flags. */
export interface AccountFeatures {
  readonly tree: boolean;
  readonly babyNames: boolean;
}

export const NO_FEATURES: AccountFeatures = { tree: false, babyNames: false };

export interface TreeRow {
  readonly id: string;
  readonly title: string;
  readonly role: "OWNER" | "EDITOR" | "VIEWER";
  readonly people: number;
  /** `YYYY-MM-DD`. */
  readonly updatedOn: string;
}

export interface AccountOverview {
  /** `YYYY-MM-DD`, or null when it could not be read. */
  readonly memberSince: string | null;
  /** `YYYY-MM-DD`, or null when it could not be read or there is none. */
  readonly lastSignInOn: string | null;
  readonly googleLinked: boolean | null;
  readonly activeSessions: number | null;
  /** Newest first; null when they could not be read. */
  readonly purchases: readonly PurchaseRow[] | null;
  /** Null when the tree is off or the list could not be read. */
  readonly trees: readonly TreeRow[] | null;
}

/** What the dashboard knows when it has read nothing: every fact unknown. */
export const UNKNOWN_OVERVIEW: AccountOverview = {
  memberSince: null,
  lastSignInOn: null,
  googleLinked: null,
  activeSessions: null,
  purchases: null,
  trees: null,
};

export type Plan =
  | { readonly kind: "unknown" }
  | { readonly kind: "free" }
  | {
      readonly kind: "paid";
      /** The dearest tier held, which names the plan. */
      readonly top: string;
      /** The tiers held, cheapest first, each once. */
      readonly tiers: readonly string[];
      readonly treeUnlimited: boolean;
      readonly babyNamesFull: boolean;
      /** Everything paid, in grosze. */
      readonly spent: number;
    };

function holds(purchases: readonly PurchaseRow[], tiers: readonly string[]): boolean {
  return purchases.some((p) => tiers.includes(p.tier));
}

/** The plan a reader's purchases add up to. Unreadable purchases make an unknown plan, not a free one. */
export function planOf(purchases: readonly PurchaseRow[] | null): Plan {
  if (purchases === null) return { kind: "unknown" };
  if (purchases.length === 0) return { kind: "free" };
  const held = new Set(purchases.map((p) => p.tier));
  // Known tiers in the offer's order (cheapest first), then any the offer no longer lists.
  const known = CHECKOUT_TIERS.map((t) => t.key).filter((key) => held.has(key));
  const unknown = [...held].filter((key) => tierOffer(key) === null).sort();
  const tiers = [...known, ...unknown];
  return {
    kind: "paid",
    top: known.at(-1) ?? tiers[0] ?? "",
    tiers,
    treeUnlimited: holds(purchases, TREE_UNLOCK_TIERS),
    babyNamesFull: holds(purchases, BABY_NAMES_FULL_TIERS),
    spent: purchases.reduce((sum, p) => sum + p.amountTotal, 0),
  };
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function attempt<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

/**
 * Reads the dashboard's facts for one signed-in account, the three reads at
 * once. `trees` is null when the family tree is off.
 */
export async function loadAccountOverview(deps: {
  readonly userId: string;
  readonly summary: (userId: string) => Promise<AccountSummary | null>;
  readonly purchases: (userId: string) => Promise<readonly PurchaseView[]>;
  readonly trees: ((userId: string) => Promise<readonly TreeSummary[]>) | null;
}): Promise<AccountOverview> {
  const { userId, trees } = deps;
  const [summary, purchases, treeList] = await Promise.all([
    attempt(() => deps.summary(userId)),
    attempt(() => deps.purchases(userId)),
    trees === null ? Promise.resolve(null) : attempt(() => trees(userId)),
  ]);
  return {
    memberSince: summary === null ? null : day(summary.createdAt),
    lastSignInOn: summary?.lastSignInAt ? day(summary.lastSignInAt) : null,
    googleLinked: summary?.googleLinked ?? null,
    activeSessions: summary?.activeSessions ?? null,
    purchases:
      purchases === null
        ? null
        : purchases.map((p) => ({
            tier: p.tier,
            amountTotal: p.amountTotal,
            paidOn: day(p.paidAt),
          })),
    trees:
      treeList === null
        ? null
        : treeList.map((t) => ({
            id: t.tree_id,
            title: t.title,
            role: t.role,
            people: t.person_count,
            updatedOn: t.updated_at.slice(0, 10),
          })),
  };
}
