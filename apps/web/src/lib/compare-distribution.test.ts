import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { SurnameResultResponse } from "@name-atlas/contracts";
import { surnameResultResponseSchema } from "@name-atlas/contracts";
import { compareDistribution } from "./compare.js";
import { ComparisonView } from "./compare-view.js";

/** Screen #2 — two regional breakdowns side by side. SYNTHETIC figures throughout. */
const SURFACE = { surface: "FREE", decision: "ALLOWED", reason_code: "RIGHTS_PERMIT_FREE_SURFACE" };
const CITATION = {
  id: "c1",
  title: "T",
  publisher: "P",
  publication_date: "2026-01-20",
  source_type: "OFFICIAL_DATASET",
  locator: null,
  url: null,
  attribution: null,
  terms: null,
  retrieved_at: null,
  source_page_url: null,
};
const UNAVAILABLE = { state: "UNAVAILABLE", reason_code: "NO_COMPLETE_UNIVERSE", surface: SURFACE };

function region(terc: string, name: string, count: number, share: number) {
  return {
    place_id: `01a0c057-0000-7000-8000-0000000000${terc}`,
    terc_code: terc,
    display_name: name,
    count,
    share_of_covered: share,
  };
}

function entry(
  regions: ReturnType<typeof region>[],
  group = "pesel_2026_regional_male",
  date = "2026-01-20",
) {
  const covered = regions.reduce((s, r) => s + r.count, 0);
  return {
    coverage_state: "READY",
    regions,
    covered_count: covered,
    national_count: covered,
    coverage_ratio: 1,
    coverage_basis: "covered_count / national_count",
    low_coverage_threshold: 0.3,
    universe_label_code: "PESEL_REGISTERED_VOIVODESHIP_COVERED_SET",
    scope_label_code: "PESEL_CURRENT_SURNAME",
    snapshot_date: date,
    country_code: "PL",
    comparability_group: group,
    confidence: { status: "VERIFIED", methodology_code: "m@1" },
    citation: CITATION,
  };
}

function response(name: string, entries: unknown[]): SurnameResultResponse {
  return surnameResultResponseSchema.parse({
    schema_version: "1.13",
    neighbours: {
      state: "UNAVAILABLE",
      lists: [],
      reason_code: "NO_COMPLETE_UNIVERSE",
      surface: SURFACE,
    },
    other_form: null,
    other_spelling: null,
    localities: {
      state: "NOT_LOADED",
      reference_date: null,
      places: [],
      total: null,
      confidence: null,
      citation: null,
      reason_code: "TERYT_NOT_LOADED",
      surface: SURFACE,
    },
    change: {
      state: "UNAVAILABLE",
      entries: [],
      reason_code: "NO_CHANGE_DERIVED",
      surface: SURFACE,
    },
    status: "RESOLVED",
    surname: { id: "01a0b9e3-34f3-7633-a239-2b8596dfc088", display_name: name, script: "Latn" },
    population: { ...UNAVAILABLE, observations: [] },
    rarity: { ...UNAVAILABLE, entries: [] },
    distribution: entries.length
      ? { state: "READY", entries, reason_code: null, surface: SURFACE }
      : { ...UNAVAILABLE, entries: [] },
    suggestions: null,
    meaning: {
      state: "NO_SOURCED_MEANING",
      interpretations: [],
      confidence: null,
      methodology_code: null,
      reason_code: "NO_ADMISSIBLE_ONOMASTIC_SOURCE",
      surface: SURFACE,
    },
    bearers: {
      state: "NOT_SEARCHED",
      searched_on: null,
      total: null,
      with_death_date: null,
      people: [],
      more: null,
      confidence: null,
      citation: null,
      reason_code: "BEARERS_NOT_SEARCHED",
      surface: {
        surface: "FREE",
        decision: "CONDITIONAL",
        reason_code: "COMMERCIAL_USE_UNRESOLVED",
      },
    },
    archive: {
      state: "NOT_SEARCHED",
      query: null,
      searched_on: null,
      catalogue_records: null,
      catalogue_by_category: [],
      pages: null,
      pages_by_period: [],
      pages_by_place: [],
      examples: [],
      confidence: null,
      citation: null,
      reason_code: "ARCHIVE_NOT_SEARCHED",
      surface: SURFACE,
    },
  });
}

// A: concentrated in one region. B: spread over two. Same resource.
const A = response("ALFA", [
  entry([region("30", "WIELKOPOLSKIE", 900, 0.9), region("14", "MAZOWIECKIE", 100, 0.1)]),
]);
const B = response("BETA", [
  entry([region("30", "WIELKOPOLSKIE", 500, 0.5), region("24", "ŚLĄSKIE", 500, 0.5)]),
]);

const render = (a: SurnameResultResponse, b: SurnameResultResponse, lang: "pl" | "en" = "pl") =>
  renderToStaticMarkup(
    createElement(ComparisonView, {
      a: { slug: "alfa", display: "ALFA", response: a, path: "/pl/nazwisko/alfa" },
      b: { slug: "beta", display: "BETA", response: b, path: "/pl/nazwisko/beta" },
      lang,
    }),
  );

describe("compareDistribution", () => {
  it("pairs entries from the same regional resource", () => {
    const [pair] = compareDistribution(A, B);
    expect(pair?.comparable).toBe(true);
  });

  it("refuses a pair from different dates or a missing side", () => {
    const later = response("BETA", [
      entry([region("30", "WIELKOPOLSKIE", 5, 1)], undefined, "2027-01-20"),
    ]);
    expect(compareDistribution(A, later)[0]).toMatchObject({
      comparable: false,
      reason: "DIFFERENT_SNAPSHOT_DATE",
    });
    const none = response("BETA", []);
    expect(compareDistribution(A, none)[0]).toMatchObject({
      comparable: false,
      reason: "MISSING_ON_ONE_SIDE",
    });
  });
});

describe("two maps on one scale", () => {
  it("draws two maps and one legend", () => {
    const html = render(A, B);
    expect(html.match(/class="vmap"/gu)).toHaveLength(2);
    expect(html.match(/class="vmap-legend"/gu)).toHaveLength(1);
    expect(html).toContain('aria-label="Mapa udziałów według województw: ALFA"');
    expect(html).toContain('aria-label="Mapa udziałów według województw: BETA"');
  });

  it("gives the same share the same shade on both maps", () => {
    const html = render(A, B);
    // Shared scale over 0.9 max → 20-point bands. 0.5 is band 2 on BETA's map;
    // on its own scale (max 0.5 → 10-point bands) it would have been band 4.
    const beta = html.slice(html.indexOf("<h3>BETA</h3>"));
    expect(beta).toMatch(/class="vmap-region vmap-b2"[^>]*aria-label="WIELKOPOLSKIE: 50,0%/u);
    expect(html).toContain("0%–20%");
  });

  it("puts both columns in the table, with not-listed where a side has no value", () => {
    const html = render(A, B);
    expect(html).toContain('<th scope="col">ALFA</th><th scope="col">BETA</th>');
    expect(html).toMatch(/ŚLĄSKIE<\/th><td>brak w zbiorze<\/td><td>50,0%/u);
  });

  it("says why when the two cannot be drawn together", () => {
    const html = render(A, response("BETA", []));
    expect(html).not.toContain('class="vmap"');
    expect(html).toContain("Tej wartości nie ma dla jednego z nazwisk");
  });
});
