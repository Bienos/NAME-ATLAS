import { describe, expect, it } from "vitest";
import type { ConfidenceStatus } from "./confidence.js";
import { DISCOVERY_CATEGORIES, DISCOVERY_COUNT_SEMANTICS } from "./discovery-index.js";
import type { DiscoveryCategory, DiscoveryIndex } from "./discovery-index.js";
import { premiumEligibilityOf } from "./premium-eligibility.js";

interface Items {
  readonly validated?: number;
  readonly eligible: number;
  readonly confidence?: ConfidenceStatus;
}

/** A DiscoveryIndex with the given counts and every other category empty. */
function index(given: Partial<Record<DiscoveryCategory, Items>>): DiscoveryIndex {
  return {
    surname_id: "00000000-0000-0000-0000-000000000001",
    display_name: "SYNTHETIC",
    entries: DISCOVERY_CATEGORIES.map((category) => {
      const g = given[category];
      const eligible = g?.eligible ?? 0;
      return {
        category,
        validated_count: g?.validated ?? eligible,
        eligible_count: eligible,
        count_semantics: DISCOVERY_COUNT_SEMANTICS[category],
        confidence_distribution:
          g?.confidence !== undefined && eligible > 0 ? { [g.confidence]: eligible } : {},
        availability_status: eligible > 0 ? "STRONG" : "NOT_RETRIEVED",
        reason_code: null,
        preview_allowed: eligible > 0,
      };
    }),
    coverage_assessment_version: "coverage@0",
    generation_version: "discovery@0",
  };
}

/** Two kinds of evidence, both likely, both beyond the free page. */
const TWO_KINDS = {
  ORIGIN_ALTERNATIVES: { eligible: 2, confidence: "LIKELY" },
  ARCHIVE_REFERENCES: { eligible: 5, confidence: "VERIFIED" },
  SOURCES: { eligible: 3 },
} as const;

describe("premium eligibility, eligibility@0 (TASK-117 §3, canonical/17 §44)", () => {
  it("RICH_ELIGIBLE and STANDARD_ELIGIBLE: two kinds beyond the free page", () => {
    for (const tier of ["RICH", "STANDARD"] as const) {
      const e = premiumEligibilityOf(index(TWO_KINDS), null, tier);
      expect(e).toMatchObject({ eligible: true, state: "ELIGIBLE", reason_codes: [] });
      expect(e.premium_categories).toEqual([
        { category: "ORIGIN_ALTERNATIVES", premium_items: 2 },
        { category: "ARCHIVE_REFERENCES", premium_items: 5 },
      ]);
    }
  });

  it("LIMITED_NOT_ELIGIBLE and MINIMAL_NOT_ELIGIBLE: the same inventory below STANDARD", () => {
    for (const tier of ["LIMITED", "MINIMAL"] as const) {
      expect(premiumEligibilityOf(index(TWO_KINDS), null, tier)).toMatchObject({
        eligible: false,
        state: "INSUFFICIENT_MEANINGFUL_CONTENT",
        reason_codes: ["COVERAGE_BELOW_STANDARD"],
      });
    }
  });

  it("ONE_CATEGORY_ONLY: one kind is not enough, and SOURCES is not a kind", () => {
    const e = premiumEligibilityOf(
      index({
        ORIGIN_ALTERNATIVES: { eligible: 2, confidence: "LIKELY" },
        SOURCES: { eligible: 2 },
      }),
      null,
      "STANDARD",
    );
    expect(e).toMatchObject({ eligible: false, reason_codes: ["ONE_CATEGORY_ONLY"] });
  });

  it("UNCONFIRMED_ONLY: unconfirmed items, or items with no confidence, never make an offer", () => {
    expect(
      premiumEligibilityOf(
        index({
          ORIGIN_ALTERNATIVES: { eligible: 1, confidence: "UNCONFIRMED" },
          ARCHIVE_REFERENCES: { eligible: 4 },
        }),
        null,
        "RICH",
      ),
    ).toMatchObject({ eligible: false, reason_codes: ["UNCONFIRMED_ONLY"] });
  });

  it("RIGHTS_BLOCKED: validated inventory the PAID surface does not allow", () => {
    expect(
      premiumEligibilityOf(
        index({
          ORIGIN_ALTERNATIVES: { validated: 2, eligible: 0 },
          ARCHIVE_REFERENCES: { validated: 3, eligible: 0 },
        }),
        null,
        "STANDARD",
      ),
    ).toMatchObject({
      eligible: false,
      state: "RIGHTS_BLOCKED",
      reason_codes: ["PAID_RIGHTS_BLOCKED"],
      premium_categories: [],
    });
  });

  it("never sells what the free page already shows (PRODUCT.md §6)", () => {
    const allFree = premiumEligibilityOf(index(TWO_KINDS), index(TWO_KINDS), "RICH");
    expect(allFree).toMatchObject({
      eligible: false,
      state: "INSUFFICIENT_MEANINGFUL_CONTENT",
      reason_codes: ["ALL_SHOWN_FREE"],
      premium_categories: [],
    });

    const archivesFree = premiumEligibilityOf(
      index(TWO_KINDS),
      index({ ARCHIVE_REFERENCES: TWO_KINDS.ARCHIVE_REFERENCES }),
      "RICH",
    );
    expect(archivesFree).toMatchObject({ eligible: false, reason_codes: ["ONE_CATEGORY_ONLY"] });
    expect(archivesFree.premium_categories).toEqual([
      { category: "ORIGIN_ALTERNATIVES", premium_items: 2 },
    ]);
  });

  it("an empty index is not eligible, and says every reason that applies", () => {
    expect(premiumEligibilityOf(index({}), null, "MINIMAL")).toMatchObject({
      eligible: false,
      state: "INSUFFICIENT_MEANINGFUL_CONTENT",
      reason_codes: ["NO_PREMIUM_INVENTORY", "COVERAGE_BELOW_STANDARD"],
      policy_version: "eligibility@0",
    });
  });
});
