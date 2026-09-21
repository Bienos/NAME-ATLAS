import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { InspectionView } from "./inspector-view.js";
import type { Inspection } from "./inspect.js";

/**
 * TASK-018 AC-2, AC-3, AC-4, AC-6, AC-7 — against rendered markup.
 *
 * The fixture is `NOWAK`'s real shape after D-018: two source records for one
 * publisher resource, one authoritative, and one claim of each status.
 */

const FOUND: Inspection = {
  kind: "FOUND",
  identity: {
    surname_id: "01a0b9e3-34f3-7633-a239-2b8596dfc088",
    canonical_display: "NOWAK",
    canonical_key: "nowak",
    canonical_key_version: "canonical_key_v2",
    primary_script: "Latn",
    mixed_script: false,
    script_confusable_flag: false,
    entity_status: "ACTIVE",
  },
  source_records: [
    {
      source_record_id: "sr-full",
      source_name: "Nazwiska występujące w rejestrze PESEL",
      publisher: "Ministerstwo Cyfryzacji",
      external_record_id: "1148808",
      content_hash: "aaaaaaaaaaaabbbbbbbbbbbb",
      retrieved_at: "2026-09-18T17:40:00Z",
      persisted_rows: 408_182,
      registry_sha256: "aaaaaaaaaaaabbbbbbbbbbbb",
      registry_row_count: 408_182,
      checksum_matches: true,
      row_count_matches: true,
    },
    {
      source_record_id: "sr-fixture",
      source_name: "Nazwiska występujące w rejestrze PESEL",
      publisher: "Ministerstwo Cyfryzacji",
      external_record_id: "1148808",
      content_hash: "ccccccccccccdddddddddddd",
      retrieved_at: "2026-09-18T17:39:00Z",
      persisted_rows: 22,
      registry_sha256: "aaaaaaaaaaaabbbbbbbbbbbb",
      registry_row_count: 408_182,
      checksum_matches: false,
      row_count_matches: false,
    },
  ],
  snapshots: [
    {
      distribution_snapshot_id: "snap-1",
      source_record_id: "sr-full",
      external_record_id: "1148808",
      geography_level: "NATIONAL",
      comparability_group: "pesel_2026_national_male",
      as_of_date: "2026-01-20",
      universe_description: "Wykaz nazwisk męskich osób żyjących…",
      values: [{ place: null, terc_code: null, count: 98_387 }],
    },
  ],
  claims: [
    {
      claim_id: "claim-active",
      claim_key: "CURRENT_POPULATION|nowak|snap-1",
      claim_type: "CURRENT_POPULATION",
      claim_status: "ACTIVE",
      epistemic_type: "FACT",
      method_version: "current_population@1",
      source_record_id: "sr-full",
      external_record_id: "1148808",
      confidence_status: "VERIFIED",
      assessment_method: "pesel_current_population_rule",
      assessment_version: "confidence@1",
      rationale: "Official dataset field, lawful source, dated snapshot.",
      human_review_required: false,
      citation_title: "Nazwiska występujące w rejestrze PESEL",
      citation_locator: "resource:1148808",
      citation_terms: "CC0 1.0",
      evidence: [
        {
          evidence_item_id: "ev-1",
          evidence_type: "OFFICIAL_DATASET_FIELD",
          verification_status: "VERIFIED",
          derivation_method: null,
          derivation_version: null,
          supporting_locator: "distribution_value:dv-1",
          depends_on: [],
        },
      ],
    },
    {
      claim_id: "claim-stale",
      claim_key: "CURRENT_POPULATION|nowak|snap-0",
      claim_type: "CURRENT_POPULATION",
      claim_status: "SUPERSEDED",
      epistemic_type: "FACT",
      method_version: "current_population@1",
      source_record_id: "sr-fixture",
      external_record_id: "1148808",
      confidence_status: "VERIFIED",
      assessment_method: "pesel_current_population_rule",
      assessment_version: "confidence@1",
      rationale: "Derived from the fixture import.",
      human_review_required: false,
      citation_title: "Nazwiska występujące w rejestrze PESEL",
      citation_locator: "resource:1148808",
      citation_terms: "CC0 1.0",
      evidence: [],
    },
    {
      claim_id: "claim-rarity",
      claim_key: "RARITY_CONTEXT|nowak|sr-full",
      claim_type: "RARITY_CONTEXT",
      claim_status: "ACTIVE",
      epistemic_type: "FACT",
      method_version: "rarity_context@1",
      source_record_id: "sr-full",
      external_record_id: "1148808",
      confidence_status: "VERIFIED",
      assessment_method: "derived_statistic_rule",
      assessment_version: "derived_confidence@1",
      rationale: "Computation reproducible; inputs complete.",
      human_review_required: false,
      citation_title: "Nazwiska występujące w rejestrze PESEL",
      citation_locator: "resource:1148808",
      citation_terms: "CC0 1.0",
      evidence: [
        {
          evidence_item_id: "ev-derived",
          evidence_type: "DERIVED_STATISTIC",
          verification_status: "VERIFIED",
          derivation_method: "one_in_x_over_published_universe_sum",
          derivation_version: "rarity_context@1",
          supporting_locator: "source_record:sr-full",
          depends_on: [
            { role: "COUNT", evidence_item_id: "ev-1" },
            { role: "DENOMINATOR", evidence_item_id: "ev-2" },
            { role: "UNIVERSE", evidence_item_id: "ev-3" },
          ],
        },
      ],
    },
  ],
  rights: [
    {
      rights_profile_id: "rp-1",
      source_name: "Nazwiska występujące w rejestrze PESEL",
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      metadata_rights: "ALLOWED",
      review_status: "APPROVED",
      terms_version: "CC0 1.0",
    },
  ],
};

function render(inspection: Inspection): string {
  return renderToStaticMarkup(createElement(InspectionView, { inspection }));
}

function text(markup: string): string {
  return markup
    .replace(/<[^>]+>/gu, " ")
    .replace(/&#x27;/gu, "'")
    .replace(/&amp;/gu, "&")
    .replace(/[ \t\n\r]+/gu, " ");
}

describe("AC-2: the whole chain is shown", () => {
  it("renders identity, source records, snapshots, claims, evidence and rights", () => {
    const body = text(render(FOUND));
    expect(body).toContain("NOWAK");
    expect(body).toContain("canonical_key_v2");
    expect(body).toContain("1148808");
    expect(body).toContain("NATIONAL");
    expect(body).toContain("pesel_2026_national_male");
    expect(body).toContain("98387");
    expect(body).toContain("CURRENT_POPULATION");
    expect(body).toContain("RARITY_CONTEXT");
    expect(body).toContain("OFFICIAL_DATASET_FIELD");
    expect(body).toContain("CC0 1.0");
    expect(body).toContain("APPROVED");
  });

  it("shows the lineage roles that make a derived figure auditable", () => {
    const body = text(render(FOUND));
    expect(body).toContain("COUNT, DENOMINATOR, UNIVERSE");
  });

  it("shows the internal rationale, which no consumer surface may carry", () => {
    expect(text(render(FOUND))).toContain("Computation reproducible");
  });
});

describe("AC-3: a superseded claim is shown and distinguishable", () => {
  it("renders both statuses with different tags", () => {
    const markup = render(FOUND);
    expect(markup).toContain("SUPERSEDED");
    expect(markup).toContain("ACTIVE");
    expect(markup).toContain("tag-stale");
    expect(markup).toContain("tag-ok");
  });

  it("counts the active claims against the total", () => {
    expect(text(render(FOUND))).toContain("Claims — 2 active of 3");
  });
});

describe("AC-4: registry authority is stated per source record", () => {
  it("marks one record authoritative and the other not", () => {
    const body = text(render(FOUND));
    expect(body).toContain("authoritative");
    expect(body).toContain("not authoritative");
    // The row counts are shown against the registry's, so the gap is visible.
    expect(body).toContain("408,182 / 408,182");
    expect(body).toContain("22 / 408,182");
  });

  it("says so plainly when the registry does not know a resource", () => {
    const unknown: Inspection = {
      ...FOUND,
      source_records: [
        {
          ...FOUND.source_records[0]!,
          external_record_id: "999999",
          registry_sha256: null,
          registry_row_count: null,
          checksum_matches: null,
          row_count_matches: null,
        },
      ],
    };
    expect(text(render(unknown))).toContain("not in registry");
  });
});

describe("AC-6: an unknown surname says so", () => {
  it("renders a not-found state that does not imply zero bearers", () => {
    const body = text(render({ kind: "NOT_FOUND", query: "zzzznope" }));
    expect(body).toContain("Not found");
    expect(body).toContain("zzzznope");
    expect(body).toMatch(/not the same as a surname with no bearers/u);
  });
});

describe("AC-7: no search-candidate panel", () => {
  it("renders nothing about search candidates", () => {
    const body = text(render(FOUND)).toLowerCase();
    expect(body).not.toContain("search candidate");
    expect(body).not.toContain("t4_fuzzy");
    expect(body).not.toContain("trigram");
  });
});

describe("a surname with no claims", () => {
  it("says none has been derived rather than rendering an empty section", () => {
    expect(text(render({ ...FOUND, claims: [] }))).toContain("No claim has been derived");
  });
});
