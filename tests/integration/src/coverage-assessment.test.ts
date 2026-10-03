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
  COVERAGE_DIMENSIONS,
  coverageRun,
  deriveArchiveAvailability,
  deriveCurrentPopulation,
  deriveCurrentRank,
  deriveRarityContext,
  deriveSurnameMeaning,
  querySurnameResult,
} from "@name-atlas/truth";
import type { CoverageAssessment, CoverageDimensionName } from "@name-atlas/truth";
import { raritySectionSchema, surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-074: coverage on the PAID surface, read through the query service from
 * a real PostgreSQL.
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

describe("coverage assessment (TASK-074)", () => {
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

  it("never reads Polona's search matches as STRONG (TASK-074 §6 U-2)", async () => {
    expect(of(await assessed("KOWALCZYK"), "ARCHIVES")).toMatchObject({
      availability: "PARTIAL",
      reason_code: "UNVERIFIED_SEARCH_MATCHES",
    });
  });

  it("reads a source whose commercial use is unknown as BLOCKED_RIGHTS on the paid surface (AC-4)", async () => {
    await sql`
      UPDATE rights_profiles SET commercial_use = 'UNKNOWN'
       WHERE rights_profile_id IN (
         SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
       )
    `.execute(db());
    try {
      expect(of(await assessed("KOWALCZYK"), "ETYMOLOGY")).toMatchObject({
        availability: "BLOCKED_RIGHTS",
      });
    } finally {
      await sql`
        UPDATE rights_profiles SET commercial_use = 'ALLOWED'
         WHERE rights_profile_id IN (
           SELECT default_rights_profile_id FROM sources WHERE source_type = 'DICTIONARY'
         )
      `.execute(db());
    }
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
});
