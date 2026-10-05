import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  ensurePolonaSource,
  fetchPolonaInventory,
  importOnomasticSource,
  importPeselResource,
  PESEL_NATIONAL_MALE_2026,
  PolonaPacer,
  polonaInventoryRequests,
  sha256Hex,
  storePolonaInventory,
} from "@name-atlas/sources";
import type { PolonaFetchDeps } from "@name-atlas/sources";
import {
  assessCoverage,
  assessResponse,
  buildDiscoveryIndex,
  COVERAGE_DIMENSIONS,
  coverageRun,
  deriveArchiveAvailability,
  deriveCurrentPopulation,
  deriveCurrentRank,
  deriveRarityContext,
  deriveSurnameMeaning,
  DISCOVERY_CATEGORIES,
  discoveryRun,
  assessPremiumEligibility,
  buildReport,
  premiumEligibilityRun,
  querySurnameResult,
  REPORT_SECTION_TYPES,
} from "@name-atlas/truth";
import type {
  CoverageAssessment,
  CoverageDimensionName,
  DiscoveryCategory,
  DiscoveryIndex,
  PremiumEligibility,
  ReportSection,
} from "@name-atlas/truth";
import { raritySectionSchema, surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-080: coverage on the PAID surface, read through the query service from
 * a real PostgreSQL; TASK-116: the DiscoveryIndex over the same data; and
 * TASK-117: premium eligibility over both; and TASK-118: the frozen report.
 *
 * GENUINE surnames and counts (the committed PESEL national male excerpt).
 * SYNTHETIC meanings: `fixtures/onomastics/` carries `"synthetic": true`, and
 * nothing here asserts the origin of any Polish surname. KOWALCZYK's Polona
 * search is answered with ZAREMBA's recorded responses (`fixtures/polona-inventory`),
 * as TASK-054's own suite does.
 *
 * The PESEL excerpt is not a complete universe, so rank and rarity correctly
 * refuse here and every surname read from the database is MINIMAL. The higher
 * tiers are proved on a real response with a READY rarity section put in.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readBytes = (p: string): Uint8Array => readFileSync(path.join(repoRoot, p));
const MALE_BYTES = readBytes("fixtures/pesel/national-male-2026-01-20.csv");
const POLONA_DIR = path.join(repoRoot, "fixtures/polona-inventory");
const POLONA_MANIFEST = JSON.parse(
  readFileSync(path.join(POLONA_DIR, "source-manifest.json"), "utf8"),
) as { files: { request: string; path: string }[] };
const ZAREMBA: Record<string, string> = Object.fromEntries(
  POLONA_MANIFEST.files.map((f) => [
    f.request,
    readFileSync(path.join(POLONA_DIR, f.path), "utf8"),
  ]),
);

/** Polona answering `surname`'s requests with ZAREMBA's recorded responses. */
function polonaServing(surname: string): { deps: PolonaFetchDeps; pacer: PolonaPacer } {
  const byRequest = new Map(
    polonaInventoryRequests(surname).map((r) => [`${r.url}\n${r.body}`, r.name]),
  );
  let clock = Date.now();
  const deps: PolonaFetchDeps = {
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    fetch: async (url, init) => {
      const name = byRequest.get(`${url}\n${init.body}`);
      if (name === undefined) throw new Error(`unexpected request ${url}`);
      const text = ZAREMBA[name] ?? "";
      return { ok: true, status: 200, text: async () => text };
    },
  };
  return { deps, pacer: new PolonaPacer(deps) };
}

const MALE_PAYLOAD: unknown = JSON.parse(
  readFileSync(
    path.join(
      repoRoot,
      "docs/sources/acquisition/2026-09-18/metadata",
      "pesel_national_2026_male_1148808.official_resource.json",
    ),
    "utf8",
  ),
);

describe("coverage assessment (TASK-080)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  async function assessed(input: string): Promise<CoverageAssessment> {
    const outcome = await assessCoverage(db(), input);
    if (outcome.kind !== "ASSESSED") throw new Error(`${input}: ${outcome.kind}`);
    return outcome.assessment;
  }
  const of = (a: CoverageAssessment, d: CoverageDimensionName) =>
    a.dimensions.find((x) => x.dimension === d);

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    const imported = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (imported.kind !== "IMPORTED") throw new Error(`PESEL import: ${imported.kind}`);
    for (const surname of ["KOWALCZYK", "NOWAK", "MAZUR"]) {
      await deriveCurrentPopulation(db(), surname);
      await deriveCurrentRank(db(), surname);
      await deriveRarityContext(db(), surname);
    }
    await deriveCurrentPopulation(db(), "WÓJCIK");
    for (const work of ["synthetic-test-work.json", "synthetic-test-work-b.json"]) {
      const bytes = readBytes(`fixtures/onomastics/${work}`);
      await importOnomasticSource(db(), { bytes, allowSynthetic: true });
    }
    await deriveSurnameMeaning(db(), "KOWALCZYK");
    await deriveSurnameMeaning(db(), "NOWAK");
    const kowalczyk = await sql<{ id: string }>`
      SELECT surname_id::text AS id FROM surnames WHERE canonical_display = 'KOWALCZYK'
    `.execute(db());
    const surnameId = kowalczyk.rows[0]?.id;
    if (surnameId === undefined) throw new Error("KOWALCZYK is not in the excerpt");
    const sourceId = await ensurePolonaSource(db());
    const { deps, pacer } = polonaServing("KOWALCZYK");
    const fetched = await fetchPolonaInventory("KOWALCZYK", pacer, deps);
    await storePolonaInventory(db(), { sourceId, surnameId, fetched });
    await deriveArchiveAvailability(db(), surnameId);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("lists every dimension, and says 'not searched' rather than 'none' (AC-1)", async () => {
    const a = await assessed("MAZUR");
    expect(a.dimensions.map((d) => d.dimension)).toEqual([...COVERAGE_DIMENSIONS]);
    expect(of(a, "ARCHIVES")).toMatchObject({ availability: "NOT_RETRIEVED" });
    expect(of(a, "LOCALITIES")).toMatchObject({ availability: "NOT_RETRIEVED" });
    for (const d of ["ORIGIN", "VARIANTS", "HISTORICAL_OCCURRENCES", "MIGRATION"] as const) {
      expect(of(a, d)).toMatchObject({
        availability: "NOT_RETRIEVED",
        reason_code: "NO_SOURCE_YET",
      });
    }
    expect(of(a, "ETYMOLOGY")).toMatchObject({ availability: "NONE" });
    expect(of(a, "POPULATION")).toMatchObject({ availability: "STRONG", item_count: 1 });
    expect(a.people).toEqual([{ list: "pesel_2026_national_male", people: 34576 }]);
  });

  it("reads a meaning two works agree on as STRONG, and a conflicting one as PARTIAL", async () => {
    expect(of(await assessed("KOWALCZYK"), "ETYMOLOGY")).toMatchObject({
      availability: "STRONG",
      item_count: 2,
    });
    expect(of(await assessed("NOWAK"), "ETYMOLOGY")).toMatchObject({
      availability: "PARTIAL",
      reason_code: "CONFIDENCE_CONFLICTING",
    });
  });

  it("never reads Polona's search matches as STRONG (TASK-080 §6 U-2)", async () => {
    expect(of(await assessed("KOWALCZYK"), "ARCHIVES")).toMatchObject({
      availability: "PARTIAL",
      reason_code: "UNVERIFIED_SEARCH_MATCHES",
    });
  });

  /** Runs `check` with the meaning works' commercial use UNKNOWN, then restores it. */
  async function withMeaningCommercialUseUnknown(check: () => Promise<void>): Promise<void> {
    await sql`
      UPDATE rights_profiles SET commercial_use = 'UNKNOWN'
       WHERE rights_profile_id IN (
         SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
       )
    `.execute(db());
    try {
      await check();
    } finally {
      await sql`
        UPDATE rights_profiles SET commercial_use = 'ALLOWED'
         WHERE rights_profile_id IN (
           SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
         )
      `.execute(db());
    }
  }

  it("reads a source whose commercial use is unknown as BLOCKED_RIGHTS on the paid surface (AC-4)", async () => {
    await withMeaningCommercialUseUnknown(async () => {
      expect(of(await assessed("KOWALCZYK"), "ETYMOLOGY")).toMatchObject({
        availability: "BLOCKED_RIGHTS",
      });
    });
    expect(of(await assessed("KOWALCZYK"), "ETYMOLOGY")).toMatchObject({ availability: "STRONG" });
  });

  it("is MINIMAL without rank and rarity, and STANDARD once they are ready (AC-2)", async () => {
    expect((await assessed("KOWALCZYK")).tier).toBe("MINIMAL");
    const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "PAID" });
    if (outcome.kind !== "OK") throw new Error(outcome.kind);
    const observation = outcome.response.population?.observations[0];
    if (observation === undefined) throw new Error("no population");
    const rarity = raritySectionSchema.parse({
      state: "READY",
      entries: [
        {
          primary: { metric: "ONE_IN_X", value: 400 },
          supporting: [],
          methodology_code: "test@rarity@1",
          universe_label_code: "PESEL_CURRENT_SURNAME",
          numerator: 46994,
          denominator: 18797600,
          share: 0.0025,
          scope_label_code: "PESEL_CURRENT_SURNAME",
          snapshot_date: observation.snapshot_date,
          country_code: "PL",
          comparability_group: observation.comparability_group,
          confidence: { status: "VERIFIED", methodology_code: "test@confidence@1" },
          citation: observation.citation,
        },
      ],
      reason_code: null,
      surface: outcome.response.population?.surface,
    });
    const ready = surnameResultResponseSchema.parse({ ...outcome.response, rarity });
    expect(assessResponse(ready)?.tier).toBe("STANDARD");
  });

  it("assesses every surname of the register once, and weights people per list (AC-3)", async () => {
    const tally = await coverageRun(db(), { concurrency: 2, batchSize: 7 });
    const surnames = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM surnames WHERE entity_status = 'ACTIVE'
    `.execute(db());
    expect(tally.read).toBe(Number(surnames.rows[0]?.n));
    const tiers = Object.values(tally.tiers).reduce((sum, n) => sum + n, 0);
    expect(tiers + tally.not_resolved + tally.unavailable).toBe(tally.read);
    expect(Object.keys(tally.lists)).toEqual(["pesel_2026_national_male"]);
    expect(tally.dimensions.ETYMOLOGY.STRONG).toBe(1);
    expect(tally.dimensions.ARCHIVES.PARTIAL).toBe(1);
  });

  describe("the DiscoveryIndex (TASK-116)", () => {
    async function indexed(input: string): Promise<DiscoveryIndex> {
      const outcome = await buildDiscoveryIndex(db(), input);
      if (outcome.kind !== "INDEXED") throw new Error(`${input}: ${outcome.kind}`);
      return outcome.index;
    }
    const entry = (i: DiscoveryIndex, c: DiscoveryCategory) =>
      i.entries.find((e) => e.category === c);

    it("lists all eight categories, and says 'not searched' rather than 'none' (AC-1)", async () => {
      const i = await indexed("MAZUR");
      expect(i.entries.map((e) => e.category)).toEqual([...DISCOVERY_CATEGORIES]);
      expect(i.generation_version).toBe("discovery@0");
      expect(entry(i, "ORIGIN_ALTERNATIVES")).toMatchObject({
        availability_status: "NONE",
        eligible_count: 0,
        preview_allowed: false,
      });
      expect(entry(i, "ARCHIVE_REFERENCES")).toMatchObject({
        availability_status: "NOT_RETRIEVED",
      });
      for (const c of [
        "HISTORICAL_OCCURRENCES",
        "HISTORICAL_VARIANTS",
        "HISTORICAL_PLACES",
        "MIGRATION_CLUES",
        "HISTORICAL_LAYERS",
      ] as const) {
        expect(entry(i, c)).toMatchObject({
          availability_status: "NOT_RETRIEVED",
          reason_code: "NO_SOURCE_YET",
          validated_count: 0,
          eligible_count: 0,
          preview_allowed: false,
        });
      }
    });

    it("counts none of Polona's search matches as archive references (AC-2, canonical/17 §42)", async () => {
      const paid = await querySurnameResult(db(), "KOWALCZYK", { surface: "PAID" });
      if (paid.kind !== "OK") throw new Error(paid.kind);
      expect(paid.response.archive?.catalogue_records).toBeGreaterThan(0);
      expect(entry(await indexed("KOWALCZYK"), "ARCHIVE_REFERENCES")).toMatchObject({
        availability_status: "PARTIAL",
        reason_code: "UNVERIFIED_SEARCH_MATCHES",
        validated_count: 0,
        eligible_count: 0,
        preview_allowed: false,
      });
    });

    it("counts two works agreeing on a root as one alternative from two sources, and a conflict as two (AC-3)", async () => {
      const kowalczyk = await indexed("KOWALCZYK");
      expect(entry(kowalczyk, "ORIGIN_ALTERNATIVES")).toMatchObject({
        availability_status: "STRONG",
        validated_count: 1,
        eligible_count: 1,
        confidence_distribution: { LIKELY: 1 },
        preview_allowed: true,
      });
      expect(entry(kowalczyk, "SOURCES")).toMatchObject({ validated_count: 2, eligible_count: 2 });

      const nowak = await indexed("NOWAK");
      expect(entry(nowak, "ORIGIN_ALTERNATIVES")).toMatchObject({
        availability_status: "PARTIAL",
        reason_code: "CONFIDENCE_CONFLICTING",
        eligible_count: 2,
        confidence_distribution: { CONFLICTING: 2 },
      });
      expect(entry(nowak, "SOURCES")).toMatchObject({ eligible_count: 2 });
    });

    it("never counts rights-blocked evidence as paid inventory, but still sees it (AC-4, canonical/17 §42)", async () => {
      await withMeaningCommercialUseUnknown(async () => {
        const i = await indexed("KOWALCZYK");
        expect(entry(i, "ORIGIN_ALTERNATIVES")).toMatchObject({
          availability_status: "BLOCKED_RIGHTS",
          validated_count: 1,
          eligible_count: 0,
          confidence_distribution: {},
          preview_allowed: false,
        });
        expect(entry(i, "SOURCES")).toMatchObject({
          validated_count: 2,
          eligible_count: 0,
          preview_allowed: false,
        });
      });
    });

    it("indexes every surname of the register once, and tallies the inventory per list (AC-5)", async () => {
      const tally = await discoveryRun(db(), { concurrency: 2, batchSize: 7 });
      const surnames = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM surnames WHERE entity_status = 'ACTIVE'
      `.execute(db());
      expect(tally.read).toBe(Number(surnames.rows[0]?.n));
      expect(tally.not_resolved + tally.unavailable).toBe(0);
      expect(tally.with_inventory).toBe(2);
      expect(tally.categories.ORIGIN_ALTERNATIVES).toMatchObject({
        with_eligible: 2,
        eligible_items: 3,
        blocked_only: 0,
      });
      expect(tally.categories.SOURCES.eligible_items).toBe(4);
      expect(tally.categories.ARCHIVE_REFERENCES).toMatchObject({
        with_eligible: 0,
        eligible_items: 0,
      });
      expect(tally.categories.ARCHIVE_REFERENCES.availability.PARTIAL).toBe(1);
      expect(Object.keys(tally.lists)).toEqual(["pesel_2026_national_male"]);
      expect(tally.lists["pesel_2026_national_male"]?.with_inventory.surnames).toBe(2);
    });
  });
  describe("premium eligibility (TASK-117)", () => {
    async function assessedEligibility(input: string): Promise<PremiumEligibility> {
      const outcome = await assessPremiumEligibility(db(), input);
      if (outcome.kind !== "ASSESSED") throw new Error(`${input}: ${outcome.kind}`);
      return outcome.eligibility;
    }

    it("is not eligible with nothing to sell, and says why (AC-1)", async () => {
      expect(await assessedEligibility("MAZUR")).toMatchObject({
        eligible: false,
        state: "INSUFFICIENT_MEANINGFUL_CONTENT",
        reason_codes: ["NO_PREMIUM_INVENTORY", "COVERAGE_BELOW_STANDARD"],
        premium_categories: [],
        policy_version: "eligibility@0",
      });
    });

    it("never counts a meaning the free page already shows (AC-2, PRODUCT.md §6)", async () => {
      expect(await assessedEligibility("KOWALCZYK")).toMatchObject({
        eligible: false,
        reason_codes: ["ALL_SHOWN_FREE", "COVERAGE_BELOW_STANDARD"],
        premium_categories: [],
      });
    });

    it("counts a meaning the PAID surface allows and the free page cannot show (AC-2)", async () => {
      const before = await sql<{ metadata_rights: string }>`
        SELECT metadata_rights FROM rights_profiles
         WHERE rights_profile_id IN (
           SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
         )
      `.execute(db());
      const original = before.rows[0]?.metadata_rights;
      if (original === undefined) throw new Error("no dictionary rights profile");
      await sql`
        UPDATE rights_profiles SET metadata_rights = 'PROHIBITED'
         WHERE rights_profile_id IN (
           SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
         )
      `.execute(db());
      try {
        const free = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
        if (free.kind !== "OK") throw new Error(free.kind);
        expect(free.response.meaning?.state).toBe("RIGHTS_BLOCKED");
        expect(await assessedEligibility("KOWALCZYK")).toMatchObject({
          eligible: false,
          reason_codes: ["ONE_CATEGORY_ONLY", "COVERAGE_BELOW_STANDARD"],
          premium_categories: [{ category: "ORIGIN_ALTERNATIVES", premium_items: 1 }],
        });
      } finally {
        await sql`
          UPDATE rights_profiles SET metadata_rights = ${original}
           WHERE rights_profile_id IN (
             SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
           )
        `.execute(db());
      }
    });

    it("reports RIGHTS_BLOCKED when paid rights alone leave nothing (AC-3)", async () => {
      await withMeaningCommercialUseUnknown(async () => {
        expect(await assessedEligibility("KOWALCZYK")).toMatchObject({
          eligible: false,
          state: "RIGHTS_BLOCKED",
          reason_codes: ["PAID_RIGHTS_BLOCKED", "COVERAGE_BELOW_STANDARD"],
        });
      });
    });

    it("assesses every surname of the register once, and finds none eligible today (AC-4)", async () => {
      const tally = await premiumEligibilityRun(db(), { concurrency: 2, batchSize: 7 });
      const surnames = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM surnames WHERE entity_status = 'ACTIVE'
      `.execute(db());
      expect(tally.read).toBe(Number(surnames.rows[0]?.n));
      expect(tally.states.ELIGIBLE).toBe(0);
      expect(tally.states.INSUFFICIENT_MEANINGFUL_CONTENT + tally.states.RIGHTS_BLOCKED).toBe(
        tally.read - tally.not_resolved - tally.unavailable,
      );
      expect(tally.reasons.ALL_SHOWN_FREE).toBe(2);
      expect(tally.lists["pesel_2026_national_male"]?.eligible.surnames).toBe(0);
    });
  });
  describe("the frozen report (TASK-118)", () => {
    const section = (sections: readonly ReportSection[], type: string) =>
      sections.find((x) => x.section_type === type);

    it("freezes every section in order, each linked to the claims behind it (AC-1, AC-2)", async () => {
      const built = await buildReport(db(), "KOWALCZYK");
      if (built.kind !== "BUILT") throw new Error(built.kind);
      expect(built.version_number).toBe(1);
      expect(built.sections.map((x) => x.section_type)).toEqual([...REPORT_SECTION_TYPES]);
      expect(built.eligibility.state).toBe("INSUFFICIENT_MEANINGFUL_CONTENT");

      const origin = section(built.sections, "ORIGIN");
      expect(origin?.body_payload).toEqual({
        fields: ["meaning"],
        states: { meaning: "AVAILABLE" },
      });
      expect(origin?.claims.map((c) => c.presentation_role)).toEqual(["HERO"]);
      expect(origin?.section_confidence_summary).toEqual({ LIKELY: 1 });
      expect(section(built.sections, "DISTRIBUTION")?.claims[0]?.presentation_role).toBe("HERO");
      expect(section(built.sections, "ARCHIVES")?.claims.map((c) => c.presentation_role)).toEqual([
        "HERO",
      ]);
      for (const type of ["VARIANTS", "PLACES", "MIGRATION"]) {
        expect(section(built.sections, type)).toMatchObject({
          body_payload: { availability: "NOT_RETRIEVED", reason_code: "NO_SOURCE_YET" },
          claims: [],
        });
      }
      expect(
        (section(built.sections, "SOURCES")?.body_payload as { citation_ids: string[] })
          .citation_ids.length,
      ).toBeGreaterThan(0);
      expect(section(built.sections, "LIMITATIONS")?.body_payload).toMatchObject({
        eligibility: {
          state: "INSUFFICIENT_MEANINGFUL_CONTENT",
          reason_codes: ["ALL_SHOWN_FREE", "COVERAGE_BELOW_STANDARD"],
        },
      });

      const stored = await sql<{
        eligibility_state: string;
        display_name: string;
        entitlement_kind: string;
        sections: string;
        refs: string;
      }>`
        SELECT v.eligibility_state,
               v.rendered_payload -> 'response' -> 'surname' ->> 'display_name' AS display_name,
               r.entitlement_kind,
               (SELECT count(*) FROM report_sections s WHERE s.report_version_id = v.report_version_id)::text AS sections,
               (SELECT count(*) FROM report_claim_references c
                  JOIN report_sections s ON s.report_section_id = c.report_section_id
                 WHERE s.report_version_id = v.report_version_id)::text AS refs
          FROM report_versions v JOIN reports r ON r.report_id = v.report_id
         WHERE v.report_version_id = ${built.report_version_id}::uuid
      `.execute(db());
      expect(stored.rows[0]).toEqual({
        eligibility_state: "INSUFFICIENT_MEANINGFUL_CONTENT",
        display_name: "KOWALCZYK",
        entitlement_kind: "INTERNAL_TEST",
        sections: "9",
        refs: String(built.sections.reduce((n, x) => n + x.claims.length, 0)),
      });
    });

    it("builds a new version and leaves the old one as it was; the database refuses changes (AC-3)", async () => {
      const first = await sql<{ payload: string; generated_at: string }>`
        SELECT rendered_payload::text AS payload, generated_at::text
          FROM report_versions v JOIN reports r ON r.report_id = v.report_id
          JOIN surnames s ON s.surname_id = r.surname_id
         WHERE s.canonical_display = 'KOWALCZYK' AND v.version_number = 1
      `.execute(db());
      const again = await buildReport(db(), "KOWALCZYK");
      if (again.kind !== "BUILT") throw new Error(again.kind);
      expect(again.version_number).toBe(2);
      const after = await sql<{ payload: string; generated_at: string }>`
        SELECT rendered_payload::text AS payload, generated_at::text
          FROM report_versions v JOIN reports r ON r.report_id = v.report_id
          JOIN surnames s ON s.surname_id = r.surname_id
         WHERE s.canonical_display = 'KOWALCZYK' AND v.version_number = 1
      `.execute(db());
      expect(after.rows).toEqual(first.rows);

      await expect(
        sql`UPDATE report_versions SET eligibility_state = 'ELIGIBLE'`.execute(db()),
      ).rejects.toThrow(/immutable/);
      await expect(sql`DELETE FROM report_claim_references`.execute(db())).rejects.toThrow(
        /immutable/,
      );
      await expect(sql`DELETE FROM report_sections`.execute(db())).rejects.toThrow(/immutable/);
      await expect(
        sql`
          INSERT INTO reports (report_id, surname_id, report_type, entitlement_kind, status)
          SELECT gen_random_uuid(), surname_id, 'NAME_ATLAS', 'PAID', 'READY'
            FROM surnames WHERE canonical_display = 'MAZUR'
        `.execute(db()),
      ).rejects.toThrow(/reports_internal_test_only/);
    });

    it("references a claim the PAID surface cannot show as a LIMITATION (AC-4)", async () => {
      await withMeaningCommercialUseUnknown(async () => {
        const built = await buildReport(db(), "KOWALCZYK");
        if (built.kind !== "BUILT") throw new Error(built.kind);
        const origin = section(built.sections, "ORIGIN");
        expect(origin?.body_payload).toMatchObject({ states: { meaning: "RIGHTS_BLOCKED" } });
        expect(origin?.claims.map((c) => c.presentation_role)).toEqual(["LIMITATION"]);
        expect(built.eligibility.state).toBe("RIGHTS_BLOCKED");
      });
    });

    it("says what is missing for a surname with nothing deeper, and writes nothing for an unknown one (AC-5)", async () => {
      const built = await buildReport(db(), "MAZUR");
      if (built.kind !== "BUILT") throw new Error(built.kind);
      expect(section(built.sections, "ORIGIN")).toMatchObject({
        body_payload: { states: { meaning: "NO_SOURCED_MEANING" } },
        claims: [],
      });
      expect(section(built.sections, "ARCHIVES")).toMatchObject({
        body_payload: { states: { archive: "NOT_SEARCHED" } },
        claims: [],
      });

      const before = await sql<{ n: string }>`SELECT count(*)::text AS n FROM reports`.execute(
        db(),
      );
      expect((await buildReport(db(), "ZZZQXWYNOTASURNAME")).kind).toBe("NOT_RESOLVED");
      const after = await sql<{ n: string }>`SELECT count(*)::text AS n FROM reports`.execute(db());
      expect(after.rows).toEqual(before.rows);
    });
  });
});
