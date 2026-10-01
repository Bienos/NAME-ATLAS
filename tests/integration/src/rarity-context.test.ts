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
  deriveCurrentPopulation,
  deriveRarityContext,
  querySurnameResult,
  rarityContextClaimKey,
  readRarityContext,
} from "@name-atlas/truth";

/**
 * TASK-014 — the `RARITY_CONTEXT` chain against a real PostgreSQL.
 *
 * The committed fixtures are 22- and 23-row excerpts, so no universe here is
 * complete and **the correct outcome of every derivation below is a refusal**.
 * That is the same constraint TASK-009's suite documents: a complete universe
 * needs the full 408,182-row resource, which is not committed. The passing
 * path is verified against the real imported data and recorded in
 * `PROGRESS.md`; the arithmetic itself is unit-tested in
 * `packages/truth/src/rarity.test.ts`.
 *
 * GENUINE DATA: everything imported below comes through TASK-004's importer
 * from the committed real fixtures. No count is synthetic.
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

describe("RARITY_CONTEXT against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function count(table: string): Promise<number> {
    const r = await sql<{ n: string }>`SELECT count(*)::text AS n FROM ${sql.table(table)}`.execute(
      db(),
    );
    return Number(r.rows[0]?.n ?? "0");
  }

  /** A real surname from the committed male fixture. */
  async function aSurname(): Promise<string> {
    const r = await sql<{ canonical_display: string }>`
      SELECT canonical_display FROM surnames ORDER BY canonical_display LIMIT 1
    `.execute(db());
    const value = r.rows[0]?.canonical_display;
    if (!value) throw new Error("no surname imported");
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
      "name_forms",
      "surnames",
      "knowledge_entities",
    ]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
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
  });

  it("refuses over the committed fixtures and writes nothing — no complete universe, no denominator", async () => {
    const surname = await aSurname();
    await deriveCurrentPopulation(db(), surname);
    const before = { claims: await count("claims"), evidence: await count("evidence_items") };

    const result = await deriveRarityContext(db(), surname);
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") return;
    expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
    expect(result.incomplete_universes?.length).toBeGreaterThan(0);
    expect(result.message).toMatch(/complete universe/u);

    expect(await count("claims")).toBe(before.claims);
    expect(await count("evidence_items")).toBe(before.evidence);
    const rarity = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM claims WHERE claim_type = 'RARITY_CONTEXT'
    `.execute(db());
    expect(rarity.rows[0]?.n).toBe("0");
  });

  it("reports the checksum mismatch, so the refusal is auditable rather than mysterious", async () => {
    const result = await deriveRarityContext(db(), await aSurname());
    if (result.kind !== "NO_RESULT") throw new Error("expected a refusal");
    for (const universe of result.incomplete_universes ?? []) {
      expect(universe.reason).toBe("CONTENT_HASH_MISMATCH");
      expect(universe.expected_row_count).toBeGreaterThan(universe.actual_row_count);
    }
  });

  it("has no bypass: a fully permissive rights posture still refuses", async () => {
    const result = await deriveRarityContext(db(), await aSurname(), {
      rightsOverride: {
        automated_access: "ALLOWED",
        commercial_use: "ALLOWED",
        redistribution: "ALLOWED",
        metadata_rights: "ALLOWED",
        review_status: "APPROVED",
      },
    });
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") return;
    expect(result.reason).toBe("INCOMPLETE_UNIVERSE");
  });

  it("never emits a figure of zero, or a one-in-zero, on any refusal path", async () => {
    for (const input of [await aSurname(), "NIEISTNIEJACETESTOWE", "", "A\tB"]) {
      const result = await deriveRarityContext(db(), input);
      expect(result.kind).toBe("NO_RESULT");
      expect(JSON.stringify(result)).not.toMatch(/"one_in_x":\s*0/u);
    }
  });

  it("distinguishes an unresolved surname from an incomplete universe", async () => {
    const unresolved = await deriveRarityContext(db(), "NIEISTNIEJACETESTOWE");
    if (unresolved.kind !== "NO_RESULT") throw new Error("expected a refusal");
    expect(unresolved.reason).toBe("UNRESOLVED");
    expect(unresolved.incomplete_universes).toBeUndefined();
  });

  it("refuses identically however many times it is called, and stays a no-op", async () => {
    const surname = await aSurname();
    const before = await count("claims");
    const first = await deriveRarityContext(db(), surname);
    const second = await deriveRarityContext(db(), surname);
    expect(second).toEqual(first);
    expect(await count("claims")).toBe(before);
  });

  it("leaves universe_size null: the register's living-person total is still unknown (U-6)", async () => {
    const r = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM distribution_snapshots WHERE universe_size IS NOT NULL
    `.execute(db());
    expect(r.rows[0]?.n).toBe("0");
  });

  it("does not disturb the CURRENT_POPULATION chain", async () => {
    const surname = await aSurname();
    const before = await deriveCurrentPopulation(db(), surname);
    await deriveRarityContext(db(), surname);
    const after = await deriveCurrentPopulation(db(), surname);
    expect(after).toEqual(before);
  });

  it("reads back no rarity claims, and the API says so rather than inventing a figure", async () => {
    const surname = await aSurname();
    await deriveCurrentPopulation(db(), surname);
    await deriveRarityContext(db(), surname);

    const surnameRow = await sql<{ surname_id: string }>`
      SELECT surname_id::text AS surname_id FROM surnames WHERE canonical_display = ${surname}
    `.execute(db());
    const surnameId = surnameRow.rows[0]?.surname_id;
    if (!surnameId) throw new Error("surname missing");
    expect(await readRarityContext(db(), surnameId)).toEqual([]);

    const outcome = await querySurnameResult(db(), surname, { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    // Population is READY (a count needs no complete universe); rarity is not.
    expect(outcome.response.population?.state).toBe("READY");
    expect(outcome.response.rarity?.state).toBe("UNAVAILABLE");
    expect(outcome.response.rarity?.reason_code).toBe("NO_COMPLETE_UNIVERSE");
    expect(outcome.response.rarity?.entries).toHaveLength(0);
    // 1.3 since TASK-012 added the geography chapter and TASK-016 the
    // suggestions section; the rarity rules above are unchanged by both.
    expect(outcome.response.schema_version).toBe("1.9");
  });

  it("keys a rarity claim on the source record, so one exists per resource version", () => {
    const a = rarityContextClaimKey(
      "11111111-1111-7111-8111-111111111111",
      "22222222-2222-7222-8222-222222222222",
    );
    const b = rarityContextClaimKey(
      "11111111-1111-7111-8111-111111111111",
      "33333333-3333-7333-8333-333333333333",
    );
    expect(a).not.toBe(b);
    expect(a.startsWith("RARITY_CONTEXT|")).toBe(true);
  });

  it("migration 0009 added RARITY_CONTEXT and the DENOMINATOR lineage role", async () => {
    const claimTypes = await sql<{ enumlabel: string }>`
      SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'claim_type' ORDER BY e.enumsortorder
    `.execute(db());
    expect(claimTypes.rows.map((r) => r.enumlabel)).toContain("RARITY_CONTEXT");

    const roles = await sql<{ enumlabel: string }>`
      SELECT enumlabel FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'evidence_dependency_role' ORDER BY e.enumsortorder
    `.execute(db());
    expect(roles.rows.map((r) => r.enumlabel)).toEqual(["COUNT", "UNIVERSE", "DENOMINATOR"]);
  });
});
