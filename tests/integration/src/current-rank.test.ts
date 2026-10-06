import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import {
  competitionRank,
  deriveCurrentPopulation,
  deriveCurrentRank,
  currentRankClaimKey,
} from "@name-atlas/truth";
import type { RankTableCache } from "@name-atlas/truth";

/**
 * TASK-009 §9 — `CURRENT_RANK` against a real PostgreSQL.
 *
 * ── What this file proves, and what it cannot ───────────────────────────
 *
 * The completeness gate makes the *refusing* path the one reachable from the
 * committed fixtures, and that is the path that matters: the fixtures are
 * 22- and 23-row excerpts of resources holding 408,182 and 420,082 rows, so
 * the default state of this repository is one where no rank may be derived.
 * Every test below exercises real ingested data through TASK-004's importer.
 *
 * The gate's *passing* path cannot be reached from a fixture by construction:
 * it requires the imported bytes to hash to the official resource's digest AND
 * every one of its rows to be persisted. Seeding that would mean inserting
 * 408,182 snapshots. It is therefore verified once, out of band, against the
 * real full resource, and the observed output is recorded in `PROGRESS.md`.
 * Making it reachable from a test by adding an override would be the bypass
 * AC-03 forbids, so it is deliberately not done.
 *
 * GENUINE: everything imported through `importPeselResource` from the
 * committed fixtures. SYNTHETIC: nothing here hand-inserts a distribution row.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readFixture(name: string): Uint8Array {
  return readFileSync(path.join(repoRoot, "fixtures/pesel", name));
}
function readCapturedMetadata(name: string): unknown {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "docs/sources/acquisition/2026-09-18/metadata", name), "utf8"),
  );
}

const MALE_BYTES = readFixture("national-male-2026-01-20.csv");
const FEMALE_BYTES = readFixture("national-female-2026-01-20.csv");
const MALE_PAYLOAD = readCapturedMetadata(
  "pesel_national_2026_male_1148808.official_resource.json",
);
const FEMALE_PAYLOAD = readCapturedMetadata(
  "pesel_national_2026_female_1148811.official_resource.json",
);

const TRUTH_TABLES = [
  "research_runs",
  "evidence_items",
  "evidence_dependencies",
  "claims",
  "claim_evidence",
  "confidence_assessments",
  "citations",
] as const;

const SOURCE_TABLES = [
  "source_records",
  "distribution_snapshots",
  "distribution_values",
  "surnames",
  "name_forms",
] as const;

describe("CURRENT_RANK: the completeness gate over real ingested data", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function countOf(table: string): Promise<number> {
    const result = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM ${sql.table(table)}
    `.execute(db());
    return Number(result.rows[0]?.n ?? "0");
  }

  async function countAll(tables: readonly string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const table of tables) counts[table] = await countOf(table);
    return counts;
  }

  async function importBoth(): Promise<void> {
    const male = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (male.kind !== "IMPORTED") throw new Error(`male import failed: ${JSON.stringify(male)}`);
    const female = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_FEMALE_2026,
      bytes: FEMALE_BYTES,
      expectedSha256: sha256Hex(FEMALE_BYTES),
      rawPayload: FEMALE_PAYLOAD,
    });
    if (female.kind !== "IMPORTED")
      throw new Error(`female import failed: ${JSON.stringify(female)}`);
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
      "name_forms",
      "surnames",
      "knowledge_entities",
    ]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
    await importBoth();
  });

  it("refuses to derive a rank over the committed fixtures and writes nothing", async () => {
    const before = await countAll(TRUTH_TABLES);

    const result = await deriveCurrentRank(db(), "NOWAK");

    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    expect(result.resolution_status).toBe("EXACT");
    // The surname DID resolve — this is not an identity failure.
    expect(result.surname?.canonical_display).toBe("NOWAK");

    const after = await countAll(TRUTH_TABLES);
    expect(after).toEqual(before);
    expect(after["claims"]).toBe(0);
  });

  it("reports the expected and actual figures, so the gap is auditable", async () => {
    const result = await deriveCurrentRank(db(), "NOWAK");
    if (result.kind !== "NO_RESULT") throw new Error("expected refusal");

    const universes = result.incomplete_universes ?? [];
    // NOWAK is in both fixtures, so both resource versions are rejected.
    expect(universes).toHaveLength(2);

    const male = universes.find((u) => u.external_record_id === "1148808");
    expect(male).toBeDefined();
    expect(male?.reason).toBe("CONTENT_HASH_MISMATCH");
    expect(male?.expected_row_count).toBe(PESEL_NATIONAL_MALE_2026.official_row_count);
    expect(male?.actual_row_count).toBe(22);

    const female = universes.find((u) => u.external_record_id === "1148811");
    expect(female?.expected_row_count).toBe(PESEL_NATIONAL_FEMALE_2026.official_row_count);
    expect(female?.actual_row_count).toBe(23);
  });

  it("names the checksum, not the row count, as the reason — an excerpt is not a partial import", async () => {
    const result = await deriveCurrentRank(db(), "WIŚNIEWSKI");
    if (result.kind !== "NO_RESULT") throw new Error("expected refusal");
    for (const u of result.incomplete_universes ?? []) {
      expect(u.reason).toBe("CONTENT_HASH_MISMATCH");
    }
  });

  it("refuses for every surname in the fixtures, not just the common ones", async () => {
    for (const input of ["NOWAK", "KOWALSKI", "MÜLLER", "NGUYỄN", "A/GADIR"]) {
      const result = await deriveCurrentRank(db(), input);
      expect(result.kind).toBe("NO_RESULT");
      if (result.kind !== "NO_RESULT") throw new Error("unreachable");
      expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    }
    expect(await countOf("claims")).toBe(0);
  });

  it("would have produced a plausible-looking wrong answer: the trap is real", async () => {
    // NOWAK is the highest count in the male fixture, so a gate-less
    // implementation would have said "rank 1" — correct by accident, and
    // false for anything below the fixture's top fifteen. This asserts the
    // shape of the trap the gate exists to prevent, by showing the universe
    // that a naive implementation would have ranked within.
    const size = await sql<{ n: string }>`
      SELECT count(*)::text AS n
      FROM distribution_snapshots s
      JOIN distribution_values v ON v.distribution_snapshot_id = s.distribution_snapshot_id
      JOIN source_records sr ON sr.source_record_id = s.source_record_id
      WHERE sr.external_record_id = '1148808' AND v.place_id IS NULL
    `.execute(db());
    expect(Number(size.rows[0]?.n)).toBe(22);
    expect(PESEL_NATIONAL_MALE_2026.official_row_count).toBe(408_182);
    // 22 against 408,182: any rank derived here would be off by four orders of
    // magnitude in its universe.
  });

  it("distinguishes an unresolved surname from an incomplete universe", async () => {
    const unresolved = await deriveCurrentRank(db(), "WISNIEWSKI");
    expect(unresolved.kind).toBe("NO_RESULT");
    if (unresolved.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(unresolved.reason).toBe("UNRESOLVED");
    expect(unresolved.incomplete_universes).toBeUndefined();

    const incomplete = await deriveCurrentRank(db(), "WIŚNIEWSKI");
    if (incomplete.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(incomplete.reason).toBe("INCOMPLETE_UNIVERSE");
  });

  it("distinguishes invalid input, and writes nothing for any refusal", async () => {
    const before = await countAll(TRUTH_TABLES);
    for (const [input, reason] of [
      ["", "INVALID_INPUT"],
      ["   ", "INVALID_INPUT"],
      ["Nieistniejące", "UNRESOLVED"],
      ["NOWAK", "INCOMPLETE_UNIVERSE"],
    ] as const) {
      const result = await deriveCurrentRank(db(), input);
      expect(result.kind).toBe("NO_RESULT");
      if (result.kind !== "NO_RESULT") throw new Error("unreachable");
      expect(result.reason).toBe(reason);
    }
    expect(await countAll(TRUTH_TABLES)).toEqual(before);
  });

  it("never emits a rank of zero on any refusal path", async () => {
    for (const input of ["", "WISNIEWSKI", "NOWAK", "Nieistniejące"]) {
      const result = await deriveCurrentRank(db(), input);
      const body = JSON.stringify(result);
      expect(body).not.toContain('"rank":0');
      expect(body).not.toContain('"rank": 0');
    }
  });

  it("leaves distribution_values.rank and derivation_version null — a rank is a claim", async () => {
    await deriveCurrentRank(db(), "NOWAK");
    const result = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM distribution_values
      WHERE rank IS NOT NULL OR derivation_version IS NOT NULL
    `.execute(db());
    expect(Number(result.rows[0]?.n)).toBe(0);
  });

  it("mutates no source row (ARCHITECTURE.md §10 invariant 6)", async () => {
    const before = await countAll(SOURCE_TABLES);
    const digestBefore = await sql<{ d: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS d
      FROM (SELECT * FROM distribution_values) t
    `.execute(db());

    await deriveCurrentRank(db(), "NOWAK");
    await deriveCurrentPopulation(db(), "NOWAK");
    await deriveCurrentRank(db(), "NOWAK");

    expect(await countAll(SOURCE_TABLES)).toEqual(before);
    const digestAfter = await sql<{ d: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS d
      FROM (SELECT * FROM distribution_values) t
    `.execute(db());
    expect(digestAfter.rows[0]?.d).toBe(digestBefore.rows[0]?.d);
  });

  it("refuses identically however many times it is called, and stays a no-op", async () => {
    const before = await countAll(TRUTH_TABLES);
    const first = await deriveCurrentRank(db(), "NOWAK");
    const second = await deriveCurrentRank(db(), "NOWAK");
    const third = await deriveCurrentRank(db(), "nowak");
    expect(second).toEqual(first);
    expect(third.kind).toBe(first.kind);
    expect(await countAll(TRUTH_TABLES)).toEqual(before);
  });

  it("does not interfere with the CURRENT_POPULATION chain", async () => {
    // The rank refusal must not prevent or corrupt the population claim that
    // TASK-005 derives from the same data.
    await deriveCurrentRank(db(), "NOWAK");
    const population = await deriveCurrentPopulation(db(), "NOWAK");
    expect(population.kind).toBe("RESULT");
    if (population.kind !== "RESULT") throw new Error("unreachable");
    expect(population.current_population).toHaveLength(2);
    const counts = population.current_population.map((c) => c.count).sort((a, b) => a - b);
    expect(counts).toEqual([98_387, 99_738]);

    // And only CURRENT_POPULATION claims exist — no rank slipped through.
    const types = await sql<{ claim_type: string; n: string }>`
      SELECT claim_type::text AS claim_type, count(*)::text AS n
      FROM claims GROUP BY 1 ORDER BY 1
    `.execute(db());
    expect(types.rows).toEqual([{ claim_type: "CURRENT_POPULATION", n: "2" }]);
  });

  it("has no bypass: no option, flag or env var makes a rank emit over a partial universe", async () => {
    // A rights override exists for testing the rights boundary. It must not
    // move the gate. Passing a fully permissive profile changes nothing.
    const permissive = {
      automated_access: "ALLOWED",
      commercial_use: "ALLOWED",
      redistribution: "ALLOWED",
      metadata_rights: "ALLOWED",
      review_status: "APPROVED",
    } as const;
    const result = await deriveCurrentRank(db(), "NOWAK", { rightsOverride: permissive });
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") throw new Error("unreachable");
    expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    expect(await countOf("claims")).toBe(0);
  });

  it("ranks identically through the run-scoped table and the per-surname count", async () => {
    // The gate is not involved: this compares the two ways of computing the
    // same number, over every national value the importer actually wrote.
    const values = await sql<{ source_record_id: string; count: number }>`
      SELECT s.source_record_id, v.count
      FROM distribution_snapshots s
      JOIN distribution_values v USING (distribution_snapshot_id)
      WHERE v.place_id IS NULL
    `.execute(db());
    expect(values.rows.length).toBe(45);

    const cache: RankTableCache = new Map();
    for (const { source_record_id, count } of values.rows) {
      const counted = await competitionRank(db(), source_record_id, Number(count));
      const looked = await competitionRank(db(), source_record_id, Number(count), cache);
      expect(looked).toBe(counted);
    }
    // One table per universe, not per surname: male and female stay separate.
    expect(cache.size).toBe(2);
    const totals = [...cache.values()].map((t) => t.total).sort((a, b) => a - b);
    expect(totals).toEqual([22, 23]);
  });

  it("keys a rank claim on the source record, so one exists per resource version", () => {
    // Pure, but asserted here too because it is the property that makes two
    // resource versions two universes rather than one merged rank.
    expect(currentRankClaimKey("s", "a")).not.toBe(currentRankClaimKey("s", "b"));
  });

  it("created evidence_dependencies with its role enum and constraints", async () => {
    const cols = await sql<{ column_name: string; data_type: string }>`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'evidence_dependencies' ORDER BY column_name
    `.execute(db());
    expect(cols.rows.map((r) => r.column_name)).toEqual([
      "created_at",
      "dependency_role",
      "depends_on_evidence_item_id",
      "derived_evidence_item_id",
      "evidence_dependency_id",
    ]);

    const roles = await sql<{ enumlabel: string }>`
      SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'evidence_dependency_role' ORDER BY e.enumsortorder
    `.execute(db());
    expect(roles.rows.map((r) => r.enumlabel)).toEqual(["COUNT", "UNIVERSE", "DENOMINATOR"]); // DENOMINATOR: 0009
  });

  it("added CURRENT_RANK to claim_type without disturbing CURRENT_POPULATION", async () => {
    const values = await sql<{ enumlabel: string }>`
      SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'claim_type' ORDER BY e.enumsortorder
    `.execute(db());
    expect(values.rows.map((r) => r.enumlabel)).toEqual([
      "CURRENT_POPULATION",
      "CURRENT_RANK",
      "RARITY_CONTEXT", // 0009
      "CURRENT_DISTRIBUTION", // 0011
      "SURNAME_MEANING", // 0014
      "SURNAME_DISTRIBUTION_SHIFT", // 0024
      "ARCHIVE_AVAILABILITY", // 0025
      "NOTABLE_BEARERS", // 0029
      "GIVEN_NAME_POPULATION", // 0038
      "GIVEN_NAME_RANK", // 0038
      "GIVEN_NAME_BIRTH_COUNT", // 0041
      "GIVEN_NAME_BIRTH_RANK", // 0041
      "GIVEN_NAME_BIRTH_TREND", // 0041
      "GIVEN_NAME_MEANING", // 0044
    ]);
  });

  it("forbids a self-dependency in the lineage table", async () => {
    // Needs real evidence rows to violate the constraint against: the rank
    // refusal writes none, so the population chain supplies them. An earlier
    // version of this test inserted from an empty table, affected zero rows
    // and passed vacuously.
    await deriveCurrentPopulation(db(), "NOWAK");
    expect(await countOf("evidence_items")).toBeGreaterThan(0);

    // The cheapest cycle to forbid outright, checked by constraint.
    await expect(
      sql`
        INSERT INTO evidence_dependencies
          (evidence_dependency_id, derived_evidence_item_id, depends_on_evidence_item_id,
           dependency_role)
        SELECT gen_random_uuid(), e.evidence_item_id, e.evidence_item_id, 'COUNT'
        FROM evidence_items e LIMIT 1
      `.execute(db()),
    ).rejects.toThrow();
  });
});
