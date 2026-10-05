/**
 * Whether a paid surname report may be offered for a surname, and why not
 * (TASK-117, M4's third step; `docs/canonical/23` §22 PRE-002,
 * `docs/canonical/16` §58, `docs/canonical/17` §44).
 *
 * Read from TASK-116's DiscoveryIndex and TASK-080's coverage tier, never from
 * claims directly, and nothing is stored. The browser never decides it
 * (`docs/canonical/16` §58), and checkout for a surname report may begin only
 * after ELIGIBLE (`docs/canonical/20` §26).
 *
 * The policy `eligibility@0` is the project owner's of 2026-10-05 (TASK-117
 * §6). A surname is ELIGIBLE only when all of these hold:
 *
 * - at least two **kinds** of deeper evidence have premium items. A kind is a
 *   DiscoveryIndex category other than SOURCES, which only names the works
 *   behind the other kinds' items;
 * - an item is **premium** only if the PAID surface allows it and the free
 *   page does not already show it: "premium sells depth and synthesis, never
 *   the answer already promised free" (`PRODUCT.md` §6);
 * - the coverage tier is STANDARD or RICH;
 * - not every premium item is UNCONFIRMED or INSUFFICIENT_DATA. A kind whose
 *   items carry no confidence counts as unconfirmed.
 *
 * Every condition that fails is reported, so a surname that is not eligible
 * says why. RIGHTS_BLOCKED is reported when paid rights, and nothing else,
 * leave no premium item.
 */
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import type { ConfidenceStatus } from "./confidence.js";
import { COVERAGE_ASSESSMENT_VERSION, forEachActiveSurname } from "./coverage-assessment.js";
import type { CoverageRunOptions, CoverageTier } from "./coverage-assessment.js";
import {
  buildDiscoveryIndex,
  DISCOVERY_CATEGORIES,
  DISCOVERY_INDEX_VERSION,
  discoveryIndexOf,
} from "./discovery-index.js";
import type { DiscoveryCategory, DiscoveryIndex } from "./discovery-index.js";
import { querySurnameResult } from "./query.js";

export const PREMIUM_ELIGIBILITY_VERSION = "eligibility@0";

/**
 * `docs/canonical/16` §58's states that `eligibility@0` can produce.
 * RESEARCHING needs a research run, which does not exist yet; NOT_AVAILABLE is
 * a surname that did not resolve or could not be read, which
 * {@link assessPremiumEligibility} reports as its outcome instead.
 */
export const PREMIUM_ELIGIBILITY_STATES = [
  "ELIGIBLE",
  "INSUFFICIENT_MEANINGFUL_CONTENT",
  "RIGHTS_BLOCKED",
] as const;
export type PremiumEligibilityState = (typeof PREMIUM_ELIGIBILITY_STATES)[number];

/** Why a surname is not eligible. More than one may apply. */
export const PREMIUM_INELIGIBILITY_REASONS = [
  /** No kind has an item the PAID surface allows. */
  "NO_PREMIUM_INVENTORY",
  /** Items exist on the PAID surface, but the free page shows all of them. */
  "ALL_SHOWN_FREE",
  /** Paid rights, and nothing else, leave no premium item. */
  "PAID_RIGHTS_BLOCKED",
  /** One kind of deeper evidence has premium items; the policy needs two. */
  "ONE_CATEGORY_ONLY",
  /** Every premium item is UNCONFIRMED or INSUFFICIENT_DATA. */
  "UNCONFIRMED_ONLY",
  /** The coverage tier is LIMITED or MINIMAL. */
  "COVERAGE_BELOW_STANDARD",
] as const;
export type PremiumIneligibilityReason = (typeof PREMIUM_INELIGIBILITY_REASONS)[number];

/** One kind of deeper evidence with items beyond the free page. */
export interface PremiumCategory {
  readonly category: DiscoveryCategory;
  /** Items the PAID surface allows that the free page does not show. */
  readonly premium_items: number;
}

export interface PremiumEligibility {
  readonly surname_id: string;
  readonly display_name: string;
  readonly eligible: boolean;
  readonly state: PremiumEligibilityState;
  /** Empty exactly when ELIGIBLE. */
  readonly reason_codes: readonly PremiumIneligibilityReason[];
  readonly premium_categories: readonly PremiumCategory[];
  readonly coverage_tier: CoverageTier;
  readonly policy_version: string;
  readonly discovery_index_version: string;
  readonly coverage_assessment_version: string;
}

/** The kinds of deeper evidence: every category but SOURCES. */
const KINDS: readonly DiscoveryCategory[] = DISCOVERY_CATEGORIES.filter((c) => c !== "SOURCES");

/** Confidence that does not confirm anything (`UNCONFIRMED_ONLY`). */
const UNCONFIRMING: readonly ConfidenceStatus[] = ["UNCONFIRMED", "INSUFFICIENT_DATA"];

/**
 * The policy over a surname's DiscoveryIndex on the PAID surface, the same
 * index built from its FREE response (what the free page shows; null when no
 * kind has an item, so there is nothing to subtract), and its coverage tier.
 *
 * Premium items are the PAID surface's eligible items less the ones the free
 * page shows. The query service allows or blocks each section whole, so the
 * difference of the two counts is the items the free page does not show.
 */
export function premiumEligibilityOf(
  paid: DiscoveryIndex,
  free: DiscoveryIndex | null,
  tier: CoverageTier,
): PremiumEligibility {
  const entry = (index: DiscoveryIndex | null, c: DiscoveryCategory) =>
    index?.entries.find((e) => e.category === c);

  const premium: PremiumCategory[] = [];
  let anyEligible = false;
  let anyBlocked = false;
  let anyConfirming = false;
  for (const category of KINDS) {
    const e = entry(paid, category);
    if (e === undefined) continue;
    if (e.eligible_count > 0) anyEligible = true;
    else if (e.validated_count > 0) anyBlocked = true;
    const shownFree = entry(free, category)?.eligible_count ?? 0;
    const items = Math.max(0, e.eligible_count - shownFree);
    if (items === 0) continue;
    premium.push({ category, premium_items: items });
    if (
      Object.entries(e.confidence_distribution).some(
        ([status, n]) => (n ?? 0) > 0 && !UNCONFIRMING.includes(status as ConfidenceStatus),
      )
    ) {
      anyConfirming = true;
    }
  }

  const reasons: PremiumIneligibilityReason[] = [];
  if (premium.length === 0) {
    if (anyEligible) reasons.push("ALL_SHOWN_FREE");
    else if (anyBlocked) reasons.push("PAID_RIGHTS_BLOCKED");
    else reasons.push("NO_PREMIUM_INVENTORY");
  } else {
    if (premium.length === 1) reasons.push("ONE_CATEGORY_ONLY");
    if (!anyConfirming) reasons.push("UNCONFIRMED_ONLY");
  }
  if (tier !== "RICH" && tier !== "STANDARD") reasons.push("COVERAGE_BELOW_STANDARD");

  return {
    surname_id: paid.surname_id,
    display_name: paid.display_name,
    eligible: reasons.length === 0,
    state:
      reasons.length === 0
        ? "ELIGIBLE"
        : reasons.includes("PAID_RIGHTS_BLOCKED")
          ? "RIGHTS_BLOCKED"
          : "INSUFFICIENT_MEANINGFUL_CONTENT",
    reason_codes: reasons,
    premium_categories: premium,
    coverage_tier: tier,
    policy_version: PREMIUM_ELIGIBILITY_VERSION,
    discovery_index_version: paid.generation_version,
    coverage_assessment_version: paid.coverage_assessment_version,
  };
}

export type PremiumEligibilityOutcome =
  | {
      readonly kind: "ASSESSED";
      readonly eligibility: PremiumEligibility;
      /** The known count on each list, for weighting a register-wide run. */
      readonly people: readonly { readonly list: string; readonly people: number }[];
    }
  | { readonly kind: "NOT_RESOLVED" }
  | { readonly kind: "UNAVAILABLE"; readonly reason: string };

/**
 * Builds the surname's DiscoveryIndex and, only when some kind has an item
 * the PAID surface allows, reads the FREE surface to subtract what the free
 * page shows; then applies the policy.
 */
export async function assessPremiumEligibility(
  db: Kysely<DB>,
  input: string,
): Promise<PremiumEligibilityOutcome> {
  const built = await buildDiscoveryIndex(db, input);
  if (built.kind !== "INDEXED") return built;

  let free: DiscoveryIndex | null = null;
  if (built.index.entries.some((e) => e.category !== "SOURCES" && e.eligible_count > 0)) {
    const read = await querySurnameResult(db, input, { surface: "FREE" });
    if (read.kind === "UNAVAILABLE") return { kind: "UNAVAILABLE", reason: read.reason };
    if (read.kind !== "OK") return { kind: "NOT_RESOLVED" };
    free = discoveryIndexOf(read.response);
    if (free === null) return { kind: "NOT_RESOLVED" };
  }

  return {
    kind: "ASSESSED",
    eligibility: premiumEligibilityOf(built.index, free, built.coverage.tier),
    people: built.coverage.people,
  };
}

/** Register-wide tallies of {@link assessPremiumEligibility}. */
export interface PremiumEligibilityRunTally {
  readonly policy_version: string;
  readonly discovery_index_version: string;
  readonly coverage_assessment_version: string;
  readonly read: number;
  readonly not_resolved: number;
  readonly unavailable: number;
  readonly states: Readonly<Record<PremiumEligibilityState, number>>;
  /** Surnames per reason; one surname may count under several. */
  readonly reasons: Readonly<Record<PremiumIneligibilityReason, number>>;
  /** Per list: surnames and people, and those eligible. Lists are never summed. */
  readonly lists: Readonly<
    Record<
      string,
      {
        readonly surnames: number;
        readonly people: number;
        readonly eligible: { readonly surnames: number; readonly people: number };
      }
    >
  >;
}

function zeroes<K extends string>(keys: readonly K[]): Record<K, number> {
  return Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>;
}

/**
 * Assesses every active surname in the register and tallies the result.
 * Read-only, through the same query service as a page.
 */
export async function premiumEligibilityRun(
  db: Kysely<DB>,
  options: CoverageRunOptions = {},
): Promise<PremiumEligibilityRunTally> {
  const states = zeroes(PREMIUM_ELIGIBILITY_STATES);
  const reasons = zeroes(PREMIUM_INELIGIBILITY_REASONS);
  const lists: Record<
    string,
    { surnames: number; people: number; eligible: { surnames: number; people: number } }
  > = {};
  let notResolved = 0;
  let unavailable = 0;

  const read = await forEachActiveSurname(db, options, async (surname) => {
    const outcome = await assessPremiumEligibility(db, surname);
    if (outcome.kind === "NOT_RESOLVED") notResolved += 1;
    else if (outcome.kind === "UNAVAILABLE") unavailable += 1;
    else {
      const e = outcome.eligibility;
      states[e.state] += 1;
      for (const r of e.reason_codes) reasons[r] += 1;
      for (const p of outcome.people) {
        const list = (lists[p.list] ??= {
          surnames: 0,
          people: 0,
          eligible: { surnames: 0, people: 0 },
        });
        list.surnames += 1;
        list.people += p.people;
        if (e.eligible) {
          list.eligible.surnames += 1;
          list.eligible.people += p.people;
        }
      }
    }
  });

  return {
    policy_version: PREMIUM_ELIGIBILITY_VERSION,
    discovery_index_version: DISCOVERY_INDEX_VERSION,
    coverage_assessment_version: COVERAGE_ASSESSMENT_VERSION,
    read,
    not_resolved: notResolved,
    unavailable,
    states,
    reasons,
    lists,
  };
}

/** The tally as Markdown: states, reasons, and the eligible per list. */
export function premiumEligibilityRunMarkdown(t: PremiumEligibilityRunTally): string {
  return [
    `Premium eligibility \`${t.policy_version}\` over DiscoveryIndex \`${t.discovery_index_version}\` ` +
      `and coverage \`${t.coverage_assessment_version}\`. ${t.read} surnames read; ` +
      `${t.not_resolved} did not resolve and ${t.unavailable} could not be read.`,
    "",
    "| State | Surnames |",
    "|---|---:|",
    ...PREMIUM_ELIGIBILITY_STATES.map((s) => `| ${s} | ${t.states[s]} |`),
    "",
    "| Reason not eligible | Surnames |",
    "|---|---:|",
    ...PREMIUM_INELIGIBILITY_REASONS.map((r) => `| ${r} | ${t.reasons[r]} |`),
    "",
    "| List | Surnames | People | Eligible surnames | Their people |",
    "|---|---:|---:|---:|---:|",
    ...Object.entries(t.lists)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(
        ([list, l]) =>
          `| ${list} | ${l.surnames} | ${l.people} | ${l.eligible.surnames} | ${l.eligible.people} |`,
      ),
    "",
    "A surname may count under several reasons. Eligible needs coverage STANDARD or RICH, " +
      "two kinds of evidence beyond the free page, and not only unconfirmed items.",
  ].join("\n");
}
