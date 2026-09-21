import { describe, expect, it } from "vitest";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import {
  assessIndexability,
  distinctCitations,
  indexingEnabled,
  publishableFamilies,
} from "./seo.js";

/**
 * TASK-024 AC-4 — docs/canonical/21 §40–§43 as code. Fixtures are synthetic,
 * shaped to exercise the rule; none is PESEL evidence.
 */

const SURFACE = { surface: "FREE" as const, decision: "ALLOWED" as const, reason_code: "X" };
const citation = (id: string) => ({
  id,
  title: `Source ${id}`,
  publisher: "Publisher",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: null,
  url: null,
  attribution: null,
  terms: "CC0 1.0",
  retrieved_at: "2026-09-18T17:40:00Z",
});
const observation = (cit: string, group: string) => ({
  value: { status: "KNOWN" as const, value: 100, unit: "PEOPLE" as const, scope_label_code: "S" },
  snapshot_date: "2026-01-20",
  country_code: "PL",
  source_population_scope: "scope",
  coverage_notes: null,
  comparability_group: group,
  confidence: { status: "VERIFIED" as const, methodology_code: "m@1" },
  citation: citation(cit),
});

function response(patch: Partial<SurnameResultResponse>): SurnameResultResponse {
  const base = {
    schema_version: "1.5",
    status: "RESOLVED",
    surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc088", display_name: "TEST", script: "Latn" },
    population: {
      state: "READY",
      observations: [observation("c1", "g_male")],
      reason_code: null,
      surface: SURFACE,
    },
    rarity: {
      state: "UNAVAILABLE",
      entries: [],
      reason_code: "NO_COMPLETE_UNIVERSE",
      surface: SURFACE,
    },
    distribution: {
      state: "UNAVAILABLE",
      entries: [],
      reason_code: "NO_COMPLETE_REGIONAL_UNIVERSE",
      surface: SURFACE,
    },
    suggestions: null,
    meaning: {
      state: "NO_SOURCED_MEANING",
      interpretations: [],
      confidence: null,
      methodology_code: null,
      reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
      surface: SURFACE,
    },
    ...patch,
  };
  return surnameResultResponseSchema.parse(base);
}

const GEO = {
  state: "READY" as const,
  entries: [
    {
      coverage_state: "READY" as const,
      regions: [
        {
          place_id: "01a0c057-0000-7000-8000-000000000030",
          terc_code: "30",
          display_name: "WIELKOPOLSKIE",
          count: 60,
          share_of_covered: 0.6,
        },
        {
          place_id: "01a0c057-0000-7000-8000-000000000014",
          terc_code: "14",
          display_name: "MAZOWIECKIE",
          count: 40,
          share_of_covered: 0.4,
        },
      ],
      covered_count: 100,
      national_count: 100,
      coverage_ratio: 1,
      coverage_basis: "basis",
      low_coverage_threshold: 0.5,
      universe_label_code: "U",
      scope_label_code: "S",
      snapshot_date: "2026-01-20",
      country_code: "PL",
      comparability_group: "g_male",
      confidence: { status: "VERIFIED" as const, methodology_code: "m@1" },
      citation: citation("c2"),
    },
  ],
  reason_code: null,
  surface: SURFACE,
};

describe("indexingEnabled", () => {
  it("is on only for the exact string true", () => {
    expect(indexingEnabled({})).toBe(false);
    expect(indexingEnabled({ SEO_INDEXING_ENABLED: "1" })).toBe(false);
    expect(indexingEnabled({ SEO_INDEXING_ENABLED: "true" })).toBe(true);
  });
});

describe("assessIndexability", () => {
  it("is NOINDEX with the flag off, whatever the page holds", () => {
    const r = response({ distribution: GEO });
    expect(
      assessIndexability(r, { enabled: false, seoSurfaceAllowed: true, privacyPublic: true }),
    ).toMatchObject({
      indexability: "NOINDEX",
      reason_code: "INDEXING_DISABLED",
    });
  });

  it("is NOINDEX for CURRENT_STATS alone even with the flag on (§43)", () => {
    expect(
      assessIndexability(response({}), {
        enabled: true,
        seoSurfaceAllowed: true,
        privacyPublic: true,
      }),
    ).toMatchObject({
      indexability: "NOINDEX",
      reason_code: "SINGLE_VALUE_FAMILY",
    });
  });

  it("is INDEX for two families and two citations with the flag on (§42)", () => {
    const r = response({ distribution: GEO });
    expect(publishableFamilies(r)).toEqual(["CURRENT_STATS", "GEOGRAPHY"]);
    expect(distinctCitations(r)).toBe(2);
    expect(
      assessIndexability(r, { enabled: true, seoSurfaceAllowed: true, privacyPublic: true }),
    ).toMatchObject({
      indexability: "INDEX",
    });
  });

  it("does not count a LOW_COVERAGE distribution as a geography family", () => {
    const low = {
      ...GEO,
      entries: [
        {
          ...GEO.entries[0]!,
          coverage_state: "LOW_COVERAGE" as const,
          national_count: 1000,
          coverage_ratio: 0.1,
        },
      ],
    };
    expect(publishableFamilies(response({ distribution: low }))).toEqual(["CURRENT_STATS"]);
  });

  it("needs two distinct citations, not two sections citing one source", () => {
    const sameCitation = { ...GEO, entries: [{ ...GEO.entries[0]!, citation: citation("c1") }] };
    expect(
      assessIndexability(response({ distribution: sameCitation }), {
        enabled: true,
        seoSurfaceAllowed: true,
        privacyPublic: true,
      }),
    ).toMatchObject({ indexability: "NOINDEX", reason_code: "FEWER_THAN_TWO_CITATIONS" });
  });

  it("is BLOCKED when rights withhold the stats", () => {
    const blocked = {
      state: "RIGHTS_BLOCKED" as const,
      observations: [],
      reason_code: "COMMERCIAL_USE_UNRESOLVED",
      surface: { ...SURFACE, decision: "BLOCKED" as const },
    };
    expect(
      assessIndexability(response({ population: blocked }), {
        enabled: true,
        seoSurfaceAllowed: true,
        privacyPublic: true,
      }),
    ).toMatchObject({
      indexability: "BLOCKED",
    });
  });

  it("is NOINDEX when the SEO surface is not allowed, whatever else passes", () => {
    // docs/canonical/21 §40 requires both the public and the SEO surface.
    const r = response({ distribution: GEO });
    expect(
      assessIndexability(r, { enabled: true, seoSurfaceAllowed: false, privacyPublic: true }),
    ).toMatchObject({
      indexability: "NOINDEX",
      reason_code: "SEO_SURFACE_NOT_ALLOWED",
    });
  });

  it("does not count a section whose surface decision is only CONDITIONAL", () => {
    const conditional = {
      state: "READY" as const,
      observations: [observation("c1", "g_male")],
      reason_code: null,
      surface: { surface: "FREE" as const, decision: "CONDITIONAL" as const, reason_code: "X" },
    };
    expect(publishableFamilies(response({ population: conditional, distribution: GEO }))).toEqual([
      "GEOGRAPHY",
    ]);
  });
});
