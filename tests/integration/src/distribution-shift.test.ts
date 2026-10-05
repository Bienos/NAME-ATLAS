import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { createMigrator } from "@name-atlas/db";
import {
  importPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import type { PeselResourceDescriptor } from "@name-atlas/sources";
import {
  deriveCurrentPopulation,
  deriveDistributionShift,
  querySurnameResult,
  readDistributionShift,
} from "@name-atlas/truth";
import type { ShiftEdition, ShiftEditionSet } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-051 — the `SURNAME_DISTRIBUTION_SHIFT` chain against a real PostgreSQL.
 *
 * GENUINE: the four 2026 resources come from the committed fixtures through
 * TASK-004's importer, and the surnames and the population claim are derived
 * from them as in production.
 *
 * SYNTHETIC: the older editions. The real ones are 400,000-row files that are
 * not committed, and the derivation only trusts an edition whose bytes hash to
 * the registry's pinned checksum, so a test cannot present a fixture as one.
 * Each test edition here carries the registry's real resource id and date (so
 * the importer treats it as an earlier edition, as in production) but a small
 * CSV of invented counts, with its own checksum and its own invented list
 * total, handed to the derivation as the set of editions to read
 * (`DeriveShiftOptions.editions`). The arithmetic is therefore checkable by
 * eye. None of it is PESEL evidence.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readFixture = (name: string): Uint8Array =>
  readFileSync(path.join(repoRoot, "fixtures/pesel", name));
const readMetadata = (name: string): unknown =>
  JSON.parse(
    readFileSync(path.join(repoRoot, "docs/sources/acquisition/2026-09-18/metadata", name), "utf8"),
  );

const MALE_BYTES = readFixture("national-male-2026-01-20.csv");
const FEMALE_BYTES = readFixture("national-female-2026-01-20.csv");
const MALE_PAYLOAD = readMetadata("pesel_national_2026_male_1148808.official_resource.json");
const FEMALE_PAYLOAD = readMetadata("pesel_national_2026_female_1148811.official_resource.json");

type Rows = readonly (readonly [string, number])[];

interface TestEdition {
  readonly descriptor: PeselResourceDescriptor;
  readonly bytes: Uint8Array;
  readonly shift: ShiftEdition;
}

/** An edition built on a real descriptor's shape, with invented bytes, checksum and list total. */
function makeEdition(
  base: PeselResourceDescriptor,
  id: string,
  date: string,
  rows: Rows,
  listTotal: number,
  note = false,
): TestEdition {
  const bytes = new TextEncoder().encode(
    ["Nazwisko aktualne,Liczba", ...rows.map(([name, count]) => `${name},${count}`)].join("\r\n") +
      "\r\n",
  );
  const descriptor: PeselResourceDescriptor = {
    ...base,
    resource_id: id,
    resource_title: `SYNTHETIC edition ${id}`,
    data_date: date,
    official_source_url: `https://example.invalid/resources/${id}`,
    official_resource_metadata_url: `https://example.invalid/resources/${id}/metadata`,
    official_sha256: sha256Hex(bytes),
    official_byte_size: bytes.length,
    official_row_count: rows.length,
    comparability_group: `synthetic_${id}`,
    series: null,
  };
  return {
    descriptor,
    bytes,
    shift: {
      resource_id: id,
      data_date: date,
      official_sha256: descriptor.official_sha256,
      official_people_sum: listTotal,
      official_source_url: descriptor.official_source_url,
      universe_note_code: note ? "UNIVERSE_DESCRIPTION_DIFFERS" : null,
    },
  };
}

// Men: four editions. WIŚNIEWSKI is not on the first; MAZUR is on the third only.
const M1 = makeEdition(
  PESEL_NATIONAL_MALE_2026,
  "18990",
  "2019-06-30",
  [
    ["NOWAK", 5000],
    ["KOWALSKI", 3000],
  ],
  1_000_000,
  true,
);
const M2 = makeEdition(
  PESEL_NATIONAL_MALE_2026,
  "22817",
  "2020-01-22",
  [
    ["NOWAK", 5100],
    ["KOWALSKI", 3000],
    ["WIŚNIEWSKI", 2000],
  ],
  1_010_000,
);
const M3 = makeEdition(
  PESEL_NATIONAL_MALE_2026,
  "28052",
  "2021-02-01",
  [
    ["NOWAK", 5200],
    ["KOWALSKI", 2900],
    ["WIŚNIEWSKI", 2100],
    ["MAZUR", 4],
  ],
  1_050_000,
);
const M4 = makeEdition(
  PESEL_NATIONAL_MALE_2026,
  "36401",
  "2022-01-27",
  [
    ["NOWAK", 5300],
    ["KOWALSKI", 2800],
    ["WIŚNIEWSKI", 2200],
  ],
  1_100_000,
);
// Women: three editions and, between the second and the third, a resource that repeats the second.
const F1 = makeEdition(
  PESEL_NATIONAL_FEMALE_2026,
  "18989",
  "2019-06-30",
  [
    ["NOWAK", 5200],
    ["KOWALSKA", 3100],
  ],
  1_200_000,
  true,
);
const F2 = makeEdition(
  PESEL_NATIONAL_FEMALE_2026,
  "35279",
  "2021-02-02",
  [
    ["NOWAK", 5300],
    ["KOWALSKA", 3150],
  ],
  1_250_000,
);
const F3 = makeEdition(
  PESEL_NATIONAL_FEMALE_2026,
  "44646",
  "2023-01-30",
  [
    ["NOWAK", 5400],
    ["KOWALSKA", 3200],
  ],
  1_300_000,
);

const EDITIONS: ShiftEditionSet = {
  national_male: { editions: [M1, M2, M3, M4].map((e) => e.shift), gaps: [] },
  national_female: {
    editions: [F1, F2, F3].map((e) => e.shift),
    gaps: [
      {
        resource_id: "38772",
        data_date: "2022-01-27",
        reason_code: "PUBLISHER_DUPLICATE",
        duplicate_of: "35279",
      },
    ],
  },
};

/** The same set with the last edition of each list left out: the state before it was loaded. */
const EARLIER: ShiftEditionSet = {
  national_male: { editions: EDITIONS.national_male.editions.slice(0, 3), gaps: [] },
  national_female: {
    editions: EDITIONS.national_female.editions.slice(0, 2),
    gaps: EDITIONS.national_female.gaps,
  },
};

describe("SURNAME_DISTRIBUTION_SHIFT against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function count(table: string, where = sql``): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM ${sql.table(table)} ${where}
    `.execute(db());
    return Number(r.rows[0]?.n ?? "0");
  }

  async function surnameIdOf(display: string): Promise<string> {
    const r = await sql<{ surname_id: string }>`
      SELECT surname_id::text AS surname_id FROM surnames WHERE canonical_display = ${display}
    `.execute(db());
    const id = r.rows[0]?.surname_id;
    if (!id) throw new Error(`${display} is not in the test database`);
    return id;
  }

  async function shiftClaims(display: string, status = "ACTIVE") {
    const id = await surnameIdOf(display);
    const r = await sql<{
      claim_id: string;
      claim_key: string;
      structured_value: {
        role: string;
        points: Record<string, unknown>[];
        gaps: Record<string, unknown>[];
        summary: Record<string, unknown>;
      };
      supersedes_claim_id: string | null;
      claim_status: string;
    }>`
      SELECT claim_id::text AS claim_id, claim_key, structured_value,
             supersedes_claim_id::text AS supersedes_claim_id, claim_status::text AS claim_status
        FROM claims
       WHERE subject_entity_id = ${id}::uuid
         AND claim_type::text = 'SURNAME_DISTRIBUTION_SHIFT'
         AND claim_status::text = ${status}
       ORDER BY claim_key
    `.execute(db());
    return r.rows;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    await sql`
      TRUNCATE citations, confidence_assessments, evidence_dependencies, claim_evidence, claims,
               evidence_items, research_runs, distribution_values, distribution_snapshots,
               source_records, sources, rights_profiles, name_forms, surnames, knowledge_entities
      RESTART IDENTITY CASCADE
    `.execute(db());

    // The current register, genuinely, so the surnames exist as in production.
    for (const [resource, bytes, rawPayload] of [
      [PESEL_NATIONAL_MALE_2026, MALE_BYTES, MALE_PAYLOAD],
      [PESEL_NATIONAL_FEMALE_2026, FEMALE_BYTES, FEMALE_PAYLOAD],
    ] as const) {
      const outcome = await importPeselResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload,
      });
      if (outcome.kind !== "IMPORTED") throw new Error(`import failed: ${outcome.kind}`);
    }
    // The older editions, synthetic, each with its own checksum.
    for (const edition of [M1, M2, M3, M4, F1, F2, F3]) {
      const outcome = await importPeselResource(db(), {
        resource: edition.descriptor,
        bytes: edition.bytes,
        expectedSha256: edition.descriptor.official_sha256,
        rawPayload: { synthetic_test_edition: edition.descriptor.resource_id },
      });
      if (outcome.kind !== "IMPORTED") {
        throw new Error(`edition ${edition.descriptor.resource_id} failed: ${outcome.kind}`);
      }
    }
  });

  it("derives one claim per list for a surname on both, each over that list's own editions", async () => {
    const result = await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    if (result.kind !== "RESULT")
      throw new Error(`expected a result, got ${JSON.stringify(result)}`);
    expect(result.distribution_shift.map((c) => [c.role, c.known_points, c.created])).toEqual([
      ["national_male", 4, true],
      ["national_female", 3, true],
    ]);

    const claims = await shiftClaims("NOWAK");
    expect(claims.map((c) => c.structured_value.role).sort()).toEqual([
      "national_female",
      "national_male",
    ]);
  });

  it("carries each point's count, its edition's own total and one in X over that total", async () => {
    await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    const claims = await shiftClaims("NOWAK");
    const male = claims.find((c) => c.structured_value.role === "national_male");
    const female = claims.find((c) => c.structured_value.role === "national_female");

    const pick = (points: Record<string, unknown>[] | undefined) =>
      points?.map((p) => [p["data_date"], p["count"], p["list_total"], p["one_in_x"]]);
    // Hand-computed from the invented counts and totals: 1,000,000/5,000 = 200;
    // 1,010,000/5,100 = 198.04; 1,050,000/5,200 = 201.92; 1,100,000/5,300 = 207.55.
    expect(pick(male?.structured_value.points)).toEqual([
      ["2019-06-30", 5000, 1_000_000, 200],
      ["2020-01-22", 5100, 1_010_000, 198],
      ["2021-02-01", 5200, 1_050_000, 202],
      ["2022-01-27", 5300, 1_100_000, 208],
    ]);
    expect(pick(female?.structured_value.points)).toEqual([
      ["2019-06-30", 5200, 1_200_000, 231],
      ["2021-02-02", 5300, 1_250_000, 236],
      ["2023-01-30", 5400, 1_300_000, 241],
    ]);
    // The list total is the registry's, not the sum of the few rows the database holds.
    const stored = await sql<{ n: string }>`
      SELECT sum(v.count)::text AS n FROM distribution_values v
        JOIN distribution_snapshots s ON s.distribution_snapshot_id = v.distribution_snapshot_id
        JOIN source_records r ON r.source_record_id = s.source_record_id
       WHERE r.external_record_id = '18990'
    `.execute(db());
    expect(Number(stored.rows[0]?.n)).toBe(8000);

    expect(male?.structured_value.summary).toEqual({
      known_points: 4,
      first: { data_date: "2019-06-30", count: 5000, list_total: 1_000_000 },
      last: { data_date: "2022-01-27", count: 5300, list_total: 1_100_000 },
      count_change_percent: 6,
      list_change_percent: 10,
    });
    expect(female?.structured_value.summary).toMatchObject({
      count_change_percent: 3.8,
      list_change_percent: 8.3,
    });
  });

  it("flags the 2019 point, carries the women's 2022 duplicate as a gap, and never a count for it", async () => {
    await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    const claims = await shiftClaims("NOWAK");
    for (const claim of claims) {
      expect(claim.structured_value.points[0]?.["note_code"]).toBe("UNIVERSE_DESCRIPTION_DIFFERS");
      expect(claim.structured_value.points.slice(1).every((p) => p["note_code"] === null)).toBe(
        true,
      );
    }
    const female = claims.find((c) => c.structured_value.role === "national_female");
    expect(female?.structured_value.gaps).toEqual([
      {
        resource_id: "38772",
        data_date: "2022-01-27",
        reason_code: "PUBLISHER_DUPLICATE",
        duplicate_of: "35279",
      },
    ]);
    expect(female?.structured_value.points.map((p) => p["resource_id"])).not.toContain("38772");
    const male = claims.find((c) => c.structured_value.role === "national_male");
    expect(male?.structured_value.gaps).toEqual([]);
  });

  it("records an edition that does not list the surname as NOT_ON_LIST, with no count", async () => {
    await deriveDistributionShift(db(), "WIŚNIEWSKI", { editions: EDITIONS });
    const [claim, ...rest] = await shiftClaims("WIŚNIEWSKI");
    expect(rest).toHaveLength(0);
    const first = claim?.structured_value.points[0];
    expect(first?.["status"]).toBe("NOT_ON_LIST");
    expect(first).not.toHaveProperty("count");
    expect(JSON.stringify(claim?.structured_value)).not.toMatch(/"count":\s*0\b/u);
    // Three known points, from the second edition on: the change is over those.
    expect(claim?.structured_value.summary).toMatchObject({
      known_points: 3,
      first: { data_date: "2020-01-22", count: 2000, list_total: 1_010_000 },
      last: { data_date: "2022-01-27", count: 2200, list_total: 1_100_000 },
      count_change_percent: 10,
      list_change_percent: 8.9,
    });
  });

  it("gives a surname on one edition only no claim: one edition is a count, not a change", async () => {
    const before = await count("claims");
    const result = await deriveDistributionShift(db(), "MAZUR", { editions: EDITIONS });
    if (result.kind !== "NO_RESULT") throw new Error("expected a refusal");
    expect(result.reason).toBe("NOT_ENOUGH_EDITIONS");
    expect(await count("claims")).toBe(before);
    expect(await count("research_runs")).toBe(0);
  });

  it("writes the chain: one run, a verified field per known point, one derived item over them, confidence and one citation", async () => {
    await deriveDistributionShift(db(), "KOWALSKI", { editions: EDITIONS });
    // KOWALSKI is on the men's list only: one claim, four known points.
    const claims = await shiftClaims("KOWALSKI");
    expect(claims).toHaveLength(1);
    expect(await count("research_runs")).toBe(1);
    expect(await count("evidence_items", sql`WHERE evidence_type = 'OFFICIAL_DATASET_FIELD'`)).toBe(
      4,
    );
    expect(await count("evidence_items", sql`WHERE evidence_type = 'DERIVED_STATISTIC'`)).toBe(1);
    const deps = await sql<{ n: string; roles: string[] }>`
      SELECT count(*)::text AS n, array_agg(DISTINCT dependency_role::text) AS roles
        FROM evidence_dependencies
    `.execute(db());
    expect(deps.rows[0]?.n).toBe("4");
    expect(deps.rows[0]?.roles).toEqual(["COUNT"]);
    expect(await count("claim_evidence")).toBe(1);
    expect(await count("confidence_assessments")).toBe(1);
    expect(await count("citations")).toBe(1);

    const confidence = await sql<{ status: string; human_review_required: boolean }>`
      SELECT status::text AS status, human_review_required FROM confidence_assessments
    `.execute(db());
    expect(confidence.rows[0]?.status).toBe("VERIFIED");
    expect(confidence.rows[0]?.human_review_required).toBe(false);
    const citation = await sql<{ supporting_locator: string }>`
      SELECT supporting_locator FROM citations
    `.execute(db());
    expect(citation.rows[0]?.supporting_locator).toBe("resources:18990,22817,28052,36401");
  });

  it("is idempotent: a second run writes nothing and returns the same claims", async () => {
    const first = await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    const tables = [
      "claims",
      "evidence_items",
      "evidence_dependencies",
      "claim_evidence",
      "confidence_assessments",
      "citations",
      "research_runs",
    ];
    const before = await Promise.all(tables.map((t) => count(t)));
    const second = await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    expect(await Promise.all(tables.map((t) => count(t)))).toEqual(before);
    if (first.kind !== "RESULT" || second.kind !== "RESULT") throw new Error("expected results");
    expect(second.distribution_shift.map((c) => [c.claim_id, c.created])).toEqual(
      first.distribution_shift.map((c) => [c.claim_id, false]),
    );
  });

  it("supersedes the claim when another edition is stored, and never rewrites it", async () => {
    await deriveDistributionShift(db(), "NOWAK", { editions: EARLIER });
    const earlier = await shiftClaims("NOWAK");
    expect(earlier).toHaveLength(2);
    expect(earlier.map((c) => c.structured_value.points.length).sort()).toEqual([2, 3]);

    await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    const active = await shiftClaims("NOWAK");
    expect(active).toHaveLength(2);
    expect(active.map((c) => c.structured_value.points.length).sort()).toEqual([3, 4]);
    const superseded = await shiftClaims("NOWAK", "SUPERSEDED");
    expect(superseded.map((c) => c.claim_id).sort()).toEqual(earlier.map((c) => c.claim_id).sort());
    // Each new claim names the one it replaced.
    expect(active.map((c) => c.supersedes_claim_id).sort()).toEqual(
      earlier.map((c) => c.claim_id).sort(),
    );
    // The earlier claim's payload is what it was.
    expect(
      superseded.find((c) => c.structured_value.role === "national_male")?.structured_value.points,
    ).toHaveLength(3);
  });

  it("does not read an edition whose bytes are not the registry's: its checksum is the gate", async () => {
    // The same set, but the last men's edition claims a checksum the stored record does not have.
    const tampered: ShiftEditionSet = {
      ...EDITIONS,
      national_male: {
        ...EDITIONS.national_male,
        editions: EDITIONS.national_male.editions.map((e) =>
          e.resource_id === "36401" ? { ...e, official_sha256: "0".repeat(64) } : e,
        ),
      },
    };
    await deriveDistributionShift(db(), "NOWAK", { editions: tampered });
    const male = (await shiftClaims("NOWAK")).find(
      (c) => c.structured_value.role === "national_male",
    );
    expect(male?.structured_value.points.map((p) => p["resource_id"])).toEqual([
      "18990",
      "22817",
      "28052",
    ]);
  });

  it("refuses when no edition is stored at all, writing nothing", async () => {
    const none: ShiftEditionSet = {
      national_male: {
        editions: [{ ...M1.shift, official_sha256: "1".repeat(64) }],
        gaps: [],
      },
      national_female: { editions: [], gaps: [] },
    };
    const result = await deriveDistributionShift(db(), "NOWAK", { editions: none });
    if (result.kind !== "NO_RESULT") throw new Error("expected a refusal");
    expect(result.reason).toBe("NO_EDITIONS_LOADED");
    expect(await count("claims")).toBe(0);
  });

  it("makes no population, rank or rarity claim from an edition, and leaves the current claims alone", async () => {
    await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
    const types = await sql<{ claim_type: string }>`
      SELECT DISTINCT claim_type::text AS claim_type FROM claims
    `.execute(db());
    expect(types.rows.map((r) => r.claim_type)).toEqual(["SURNAME_DISTRIBUTION_SHIFT"]);

    // Deriving the current population afterwards sees the four current resources only.
    const population = await deriveCurrentPopulation(db(), "NOWAK");
    if (population.kind !== "RESULT") throw new Error("expected a population result");
    expect(population.current_population).toHaveLength(2);
    expect(await count("claims", sql`WHERE claim_type = 'CURRENT_POPULATION'`)).toBe(2);
  });

  it("rejects a change claim that is not surname scope, in the schema", async () => {
    await deriveDistributionShift(db(), "KOWALSKI", { editions: EDITIONS });
    await expect(
      sql`UPDATE claims SET scope = 'PERSON_LEVEL' WHERE claim_type::text = 'SURNAME_DISTRIBUTION_SHIFT'`.execute(
        db(),
      ),
    ).rejects.toThrow(/claims_surname_distribution_shift_is_surname_level/u);
  });

  describe("read and the result contract", () => {
    it("reads a surname's claims back with their confidence, citation and rights", async () => {
      await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
      const read = await readDistributionShift(db(), await surnameIdOf("NOWAK"));
      expect(read.map((c) => c.role).sort()).toEqual(["national_female", "national_male"]);
      const male = read.find((c) => c.role === "national_male");
      expect(male?.confidence_status).toBe("VERIFIED");
      expect(male?.citation_locator).toBe("resources:18990,22817,28052,36401");
      expect(male?.rights.review_status).toBeDefined();
      expect(await readDistributionShift(db(), await surnameIdOf("MAZUR"))).toEqual([]);
    });

    it("returns the change section READY, both lists, and validates against the contract", async () => {
      await deriveCurrentPopulation(db(), "NOWAK");
      await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
      const outcome = await querySurnameResult(db(), "NOWAK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");

      const parsed = surnameResultResponseSchema.parse(
        JSON.parse(JSON.stringify(outcome.response)),
      );
      expect(parsed.schema_version).toBe("1.13");
      expect(parsed.change?.state).toBe("READY");
      expect(parsed.change?.entries.map((e) => e.list).sort()).toEqual(["FEMALE", "MALE"]);
      const male = parsed.change?.entries.find((e) => e.list === "MALE");
      expect(male?.points).toHaveLength(4);
      expect(male?.summary.count_change_percent).toBe(6);
      expect(male?.confidence.status).toBe("VERIFIED");
      expect(male?.citation.title.length).toBeGreaterThan(0);
      // The lineage ids stored with the claim do not cross the boundary.
      expect(JSON.stringify(outcome.response.change)).not.toMatch(
        /source_record_id|distribution_snapshot_id|distribution_value_id/u,
      );
    });

    it("says no change was derived, and does not guess why, before the batch has run", async () => {
      await deriveCurrentPopulation(db(), "NOWAK");
      const outcome = await querySurnameResult(db(), "NOWAK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");
      expect(outcome.response.population?.state).toBe("READY");
      expect(outcome.response.change?.state).toBe("UNAVAILABLE");
      expect(outcome.response.change?.reason_code).toBe("NO_CHANGE_DERIVED");
      expect(outcome.response.change?.entries).toHaveLength(0);
    });

    it("is UNAVAILABLE where the surname has no count at all, like the other sections", async () => {
      // KOWALCZYK is in the register and not derived: the population is NOT_DERIVED_YET.
      const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");
      expect(outcome.response.population?.reason_code).toBe("NOT_DERIVED_YET");
      expect(outcome.response.change?.state).toBe("UNAVAILABLE");
      expect(outcome.response.change?.reason_code).toBe("NOT_DERIVED_YET");
    });

    it("omits the points entirely when the surface is rights-blocked", async () => {
      await deriveCurrentPopulation(db(), "NOWAK");
      await deriveDistributionShift(db(), "NOWAK", { editions: EDITIONS });
      await sql`
        UPDATE rights_profiles SET commercial_use = 'PROHIBITED'
         WHERE rights_profile_id =
           (SELECT default_rights_profile_id FROM sources WHERE source_key = 'pl_pesel_surnames')
      `.execute(db());
      const blocked = await querySurnameResult(db(), "NOWAK", { surface: "PAID" });
      if (blocked.kind !== "OK") throw new Error("expected OK");
      expect(blocked.response.change?.state).toBe("RIGHTS_BLOCKED");
      expect(blocked.response.change?.entries).toHaveLength(0);
      expect(JSON.stringify(blocked.response.change)).not.toContain("5300");
      // Confidence is not rights: the same claim on INTERNAL still carries its points.
      const internal = await querySurnameResult(db(), "NOWAK", { surface: "INTERNAL" });
      if (internal.kind !== "OK") throw new Error("expected OK");
      expect(internal.response.change?.state).toBe("READY");
    });
  });

  describe("on a database that has not run migration 0024", () => {
    it("answers with no claims rather than an error, where naming the enum value would fail", async () => {
      const old = await startTestDatabase();
      try {
        const migrator = createMigrator(old.db);
        const result = await migrator.migrateTo("0023_administrative_memberships");
        expect(result.error).toBeUndefined();

        // The hazard: a statement that names the new value is refused by PostgreSQL.
        await expect(
          sql`SELECT 1 FROM claims WHERE claim_type = 'SURNAME_DISTRIBUTION_SHIFT'`.execute(old.db),
        ).rejects.toThrow(/invalid input value for enum claim_type/u);
        // The read compares as text, so the same database simply holds no such claim.
        expect(await readDistributionShift(old.db, "01a0c057-0000-7000-8000-000000000001")).toEqual(
          [],
        );
      } finally {
        await old.stop();
      }
    });
  });
});
