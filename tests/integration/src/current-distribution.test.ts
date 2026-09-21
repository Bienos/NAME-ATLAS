import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselRegionalResource,
  importPeselResource,
  nationalCounterpartOf,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
  PESEL_REGIONAL_MALE_2026,
  seedVoivodeshipPlaces,
  sha256Hex,
} from "@name-atlas/sources";
import {
  currentDistributionClaimKey,
  deriveCurrentDistribution,
  deriveCurrentPopulation,
  querySurnameResult,
  readCurrentDistribution,
} from "@name-atlas/truth";
import { SURNAME_RESULT_SCHEMA_VERSION, surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-012 — the `CURRENT_DISTRIBUTION` chain against a real PostgreSQL.
 *
 * The committed regional fixtures are 40- and 38-row excerpts of resources
 * holding 646,052 and 694,553 rows, so **no universe here is complete and the
 * correct outcome of every derivation below is a refusal**. That is the same
 * constraint TASK-009's and TASK-014's suites document: a complete universe
 * needs the full resource, which is not committed.
 *
 * So this suite proves the gate, the absence states and the contract. The
 * passing path — AC-2 to AC-7 — is verified against the real imported
 * resources by SQL recomputation and recorded in `PROGRESS.md`, and the
 * arithmetic itself is unit-tested in `packages/truth/src/distribution.test.ts`
 * and `packages/contracts/src/surname-result.test.ts`.
 *
 * GENUINE DATA: every row imported below comes through the real importers from
 * the committed real fixtures. No count is synthetic.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readFixture = (name: string): Uint8Array =>
  readFileSync(path.join(repoRoot, "fixtures/pesel", name));
const readMetadata = (name: string): unknown =>
  JSON.parse(
    readFileSync(path.join(repoRoot, "docs/sources/acquisition/2026-09-18/metadata", name), "utf8"),
  );

const REGIONAL_MALE = readFixture("regional-male-2026-01-20.csv");
const REGIONAL_FEMALE = readFixture("regional-female-2026-01-20.csv");
const NATIONAL_MALE = readFixture("national-male-2026-01-20.csv");
const NATIONAL_FEMALE = readFixture("national-female-2026-01-20.csv");
const REGIONAL_MALE_PAYLOAD = readMetadata(
  "pesel_regional_2026_male_1148786.official_resource.json",
);
const REGIONAL_FEMALE_PAYLOAD = readMetadata(
  "pesel_regional_2026_female_1148790.official_resource.json",
);
const NATIONAL_MALE_PAYLOAD = readMetadata(
  "pesel_national_2026_male_1148808.official_resource.json",
);
const NATIONAL_FEMALE_PAYLOAD = readMetadata(
  "pesel_national_2026_female_1148811.official_resource.json",
);

/** A rights posture that permits everything, used to prove the gate ignores it. */
const PERMISSIVE = {
  automated_access: "ALLOWED",
  commercial_use: "ALLOWED",
  redistribution: "ALLOWED",
  metadata_rights: "ALLOWED",
  review_status: "APPROVED",
} as const;

describe("CURRENT_DISTRIBUTION against a real PostgreSQL (TASK-012)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function countOf(table: string): Promise<number> {
    const r = await sql<{ n: string }>`SELECT count(*)::text AS n FROM ${sql.table(table)}`.execute(
      db(),
    );
    return Number(r.rows[0]?.n ?? "0");
  }

  /** A surname the committed regional male fixture lists. */
  async function aRegionalSurname(): Promise<string> {
    const r = await sql<{ canonical_display: string }>`
      SELECT DISTINCT n.canonical_display
      FROM distribution_snapshots s
      JOIN surnames n ON n.surname_id = s.surname_id
      WHERE s.geography_level = 'REGION'
      ORDER BY n.canonical_display
      LIMIT 1
    `.execute(db());
    const value = r.rows[0]?.canonical_display;
    if (!value) throw new Error("no regional surname imported");
    return value;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    for (const table of [
      "evidence_dependencies",
      "citations",
      "confidence_assessments",
      "claim_evidence",
      "claims",
      "evidence_items",
      "research_runs",
      "distribution_values",
      "distribution_snapshots",
      "source_records",
      "sources",
      "rights_profiles",
      "entity_external_ids",
      "place_names",
      "places",
      "name_forms",
      "surnames",
      "knowledge_entities",
    ]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
    await seedVoivodeshipPlaces(db());
    for (const [resource, bytes, rawPayload] of [
      [PESEL_NATIONAL_MALE_2026, NATIONAL_MALE, NATIONAL_MALE_PAYLOAD],
      [PESEL_NATIONAL_FEMALE_2026, NATIONAL_FEMALE, NATIONAL_FEMALE_PAYLOAD],
    ] as const) {
      const outcome = await importPeselResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload,
      });
      if (outcome.kind !== "IMPORTED") throw new Error(`national import failed: ${outcome.kind}`);
    }
    for (const [resource, bytes, rawPayload] of [
      [PESEL_REGIONAL_MALE_2026, REGIONAL_MALE, REGIONAL_MALE_PAYLOAD],
      [PESEL_REGIONAL_FEMALE_2026, REGIONAL_FEMALE, REGIONAL_FEMALE_PAYLOAD],
    ] as const) {
      const outcome = await importPeselRegionalResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload,
      });
      if (outcome.kind !== "IMPORTED") throw new Error(`regional import failed: ${outcome.kind}`);
    }
  });

  it("AC-1: refuses over the committed regional fixtures and writes nothing", async () => {
    const surname = await aRegionalSurname();
    const before = {
      claims: await countOf("claims"),
      evidence: await countOf("evidence_items"),
      runs: await countOf("research_runs"),
      citations: await countOf("citations"),
    };

    const result = await deriveCurrentDistribution(db(), surname);
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    // The reported gap is the registry's expectation against what is persisted.
    const reported = result.incomplete_universes ?? [];
    expect(reported.length).toBeGreaterThan(0);
    for (const universe of reported) {
      expect(["CONTENT_HASH_MISMATCH", "ROW_COUNT_SHORT"]).toContain(universe.reason);
      expect(universe.actual_row_count).toBeLessThan(universe.expected_row_count ?? Infinity);
    }

    expect({
      claims: await countOf("claims"),
      evidence: await countOf("evidence_items"),
      runs: await countOf("research_runs"),
      citations: await countOf("citations"),
    }).toEqual(before);
  });

  it("AC-1: a permissive rights posture does not open the gate", async () => {
    // Rights and epistemic completeness are independent axes
    // (ARCHITECTURE.md §10 invariant 2). Permission to publish is not
    // permission to compute over a partial universe.
    const surname = await aRegionalSurname();
    const result = await deriveCurrentDistribution(db(), surname, {
      rightsOverride: PERMISSIVE,
    });
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    expect(await countOf("claims")).toBe(0);
  });

  it("AC-1: a lowered threshold does not open the gate either", async () => {
    // `lowCoverageThreshold` changes how a figure is presented, never whether
    // an incomplete universe may be used. There is no bypass at any value.
    const surname = await aRegionalSurname();
    for (const lowCoverageThreshold of [0, 0.01, 1]) {
      const result = await deriveCurrentDistribution(db(), surname, { lowCoverageThreshold });
      expect(result.kind).toBe("NO_RESULT");
      if (result.kind !== "NO_RESULT") throw new Error("unreachable");
      expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    }
    expect(await countOf("claims")).toBe(0);
  });

  it("reports NO_APPLICABLE_EVIDENCE, not a distribution of zeroes, for a surname with no regional rows", async () => {
    // A surname in the national fixture that the regional fixture omits.
    const r = await sql<{ canonical_display: string }>`
      SELECT n.canonical_display
      FROM surnames n
      WHERE EXISTS (
        SELECT 1 FROM distribution_snapshots s
        WHERE s.surname_id = n.surname_id AND s.geography_level = 'NATIONAL'
      )
      AND NOT EXISTS (
        SELECT 1 FROM distribution_snapshots s
        WHERE s.surname_id = n.surname_id AND s.geography_level = 'REGION'
      )
      ORDER BY n.canonical_display
      LIMIT 1
    `.execute(db());
    const surname = r.rows[0]?.canonical_display;
    if (!surname) throw new Error("expected a national-only surname in the fixtures");

    const result = await deriveCurrentDistribution(db(), surname);
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(result.reason).toBe("NO_APPLICABLE_EVIDENCE");
    expect(result.message).toMatch(/not a distribution of zeroes/u);
    expect(await countOf("claims")).toBe(0);
  });

  it("readCurrentDistribution returns [] rather than inventing a distribution", async () => {
    const surname = await aRegionalSurname();
    const r = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE canonical_display = ${surname}
    `.execute(db());
    const surnameId = r.rows[0]?.surname_id;
    if (!surnameId) throw new Error("surname not found");
    expect(await readCurrentDistribution(db(), surnameId)).toEqual([]);
  });

  it("AC-7: the API answers the current schema with the geography chapter UNAVAILABLE, not an empty map", async () => {
    const surname = await aRegionalSurname();
    await deriveCurrentPopulation(db(), surname);

    const outcome = await querySurnameResult(db(), surname);
    expect(outcome.kind).toBe("OK");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    // 1.3 since TASK-016 added the suggestions section; the geography rules
    // this test asserts are unchanged by it.
    expect(outcome.response.schema_version).toBe("1.5");
    expect(SURNAME_RESULT_SCHEMA_VERSION).toBe("1.5");
    expect(outcome.response.distribution?.state).toBe("UNAVAILABLE");
    expect(outcome.response.distribution?.reason_code).toBe("NO_COMPLETE_REGIONAL_UNIVERSE");
    // docs/canonical/16 §28: no fabricated empty features.
    expect(outcome.response.distribution?.entries).toEqual([]);
    // And the whole response still validates.
    expect(surnameResultResponseSchema.safeParse(outcome.response).success).toBe(true);
  });

  it("pairs each regional resource with the national one describing the same partition, and never the other sex", async () => {
    // The coverage ratio is this project's one comparison across comparability
    // groups, and this pairing is its entire justification (docs/canonical/11
    // §6.1). Getting it wrong would divide male counts by a female total.
    expect(nationalCounterpartOf(PESEL_REGIONAL_MALE_2026)).toBe(PESEL_NATIONAL_MALE_2026);
    expect(nationalCounterpartOf(PESEL_REGIONAL_FEMALE_2026)).toBe(PESEL_NATIONAL_FEMALE_2026);
    expect(nationalCounterpartOf(PESEL_NATIONAL_MALE_2026)).toBeUndefined();
    expect(nationalCounterpartOf(PESEL_NATIONAL_FEMALE_2026)).toBeUndefined();
    for (const regional of [PESEL_REGIONAL_MALE_2026, PESEL_REGIONAL_FEMALE_2026]) {
      const national = nationalCounterpartOf(regional);
      expect(national?.data_date).toBe(regional.data_date);
      expect(national?.role.replace("national", "")).toBe(regional.role.replace("regional", ""));
    }
  });

  it("AC-5: the claim key is per (surname, resource version), so the sexes never collide", async () => {
    const surname = await aRegionalSurname();
    const r = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE canonical_display = ${surname}
    `.execute(db());
    const surnameId = r.rows[0]?.surname_id;
    if (!surnameId) throw new Error("surname not found");
    const records = await sql<{ source_record_id: string }>`
      SELECT DISTINCT s.source_record_id::text
      FROM distribution_snapshots s
      WHERE s.surname_id = ${surnameId}::uuid AND s.geography_level = 'REGION'
    `.execute(db());
    const keys = records.rows.map((row) =>
      currentDistributionClaimKey(surnameId, row.source_record_id),
    );
    expect(new Set(keys).size).toBe(keys.length);
  });
});
