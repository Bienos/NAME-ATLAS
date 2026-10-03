import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  GIVEN_NAMES_FIRST_FEMALE_2026,
  GIVEN_NAMES_FIRST_MALE_2026,
  GIVEN_NAMES_RIGHTS_PROFILE,
  importGivenNameResource,
  sha256Hex,
} from "@name-atlas/sources";

/**
 * TASK-076 (ADR-0031): the PESEL given-name lists into a real PostgreSQL.
 *
 * GENUINE data: `fixtures/pesel-given-names/` holds whole lines of the two
 * 2026-01-20 first-name files, and the payloads are the publisher's own
 * resource objects read on 2026-10-03.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const MALE = new Uint8Array(read("fixtures/pesel-given-names/first-male-2026-01-20.csv"));
const FEMALE = new Uint8Array(read("fixtures/pesel-given-names/first-female-2026-01-20.csv"));
const payload = (id: string): unknown =>
  JSON.parse(
    read(
      `docs/sources/acquisition/2026-10-03/metadata/pesel_given_names_2026_first_${id}.official_resource.json`,
    ).toString("utf8"),
  );

describe("given-name ingestion (TASK-076)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  async function n(query: ReturnType<typeof sql<{ n: string }>>): Promise<number> {
    return Number((await query.execute(db())).rows[0]?.n ?? "0");
  }
  const importMale = () =>
    importGivenNameResource(db(), {
      resource: GIVEN_NAMES_FIRST_MALE_2026,
      bytes: MALE,
      expectedSha256: sha256Hex(MALE),
      rawPayload: payload("1159669"),
    });

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("refuses changed bytes and a blocked profile, and writes nothing", async () => {
    const wrong = await importGivenNameResource(db(), {
      resource: GIVEN_NAMES_FIRST_MALE_2026,
      bytes: MALE,
      expectedSha256: GIVEN_NAMES_FIRST_MALE_2026.official_sha256,
      rawPayload: payload("1159669"),
    });
    expect(wrong).toMatchObject({ kind: "FAILED", reason: "CHECKSUM_MISMATCH" });
    const blocked = await importGivenNameResource(db(), {
      resource: GIVEN_NAMES_FIRST_MALE_2026,
      bytes: MALE,
      expectedSha256: sha256Hex(MALE),
      rawPayload: payload("1159669"),
      rightsProfile: { ...GIVEN_NAMES_RIGHTS_PROFILE, automated_access: "PROHIBITED" },
    });
    expect(blocked).toMatchObject({ kind: "FAILED", reason: "RIGHTS_BLOCKED" });
    const female = await importGivenNameResource(db(), {
      resource: GIVEN_NAMES_FIRST_MALE_2026,
      bytes: FEMALE,
      expectedSha256: sha256Hex(FEMALE),
      rawPayload: payload("1159670"),
    });
    expect(female).toMatchObject({ kind: "FAILED", reason: "SCHEMA_VIOLATION" });
    expect(await n(sql`SELECT count(*)::text AS n FROM given_names`)).toBe(0);
    expect(await n(sql`SELECT count(*)::text AS n FROM source_records`)).toBe(0);
  });

  it("imports the male list: placeholders reported and left out, doubtful forms flagged", async () => {
    const outcome = await importMale();
    if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    expect(outcome.report).toMatchObject({
      rowsRead: 23,
      peopleRead: 5861812,
      namesImported: 20,
      namesCreated: 20,
      namesFlagged: 3,
      placeholders: [
        { marker: "BRAK DANYCH", count: 1001 },
        { marker: "BRAK IMIENIA", count: 30 },
        { marker: "-", count: 17 },
      ],
    });
    expect(
      await n(
        sql`SELECT count(*)::text AS n FROM given_names WHERE canonical_display LIKE 'BRAK%'`,
      ),
    ).toBe(0);
    const flagged = await sql<{ name: string }>`
      SELECT canonical_display AS name FROM given_names
       WHERE form_review = 'INITIAL_OR_ABBREVIATION' ORDER BY 1
    `.execute(db());
    expect(flagged.rows.map((r) => r.name)).toEqual(["I", "MD.", "ROMEO JR."]);
    const jan = await sql<{ count: number; display: string }>`
      SELECT c.count, g.canonical_display AS display
        FROM given_name_counts c JOIN given_names g USING (given_name_id)
       WHERE g.canonical_display = 'JAN'
    `.execute(db());
    expect(jan.rows).toEqual([{ count: 462503, display: "JAN" }]);
    expect(
      await n(
        sql`SELECT count(*)::text AS n FROM given_names WHERE canonical_display IN ('ALİ', 'JUAN CARLOS', 'JĀNIS')`,
      ),
    ).toBe(3);
  });

  it("is a no-op on the same bytes", async () => {
    expect((await importMale()).kind).toBe("ALREADY_IMPORTED");
    expect(await n(sql`SELECT count(*)::text AS n FROM given_name_counts`)).toBe(20);
  });

  it("keeps one identity per written form, with a separate count on each list", async () => {
    const outcome = await importGivenNameResource(db(), {
      resource: GIVEN_NAMES_FIRST_FEMALE_2026,
      bytes: FEMALE,
      expectedSha256: sha256Hex(FEMALE),
      rawPayload: payload("1159670"),
    });
    if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    // 21 rows, three placeholders; MARIA, ANNA and JAN are on both lists.
    expect(outcome.report).toMatchObject({ namesImported: 18, namesReused: 3, namesFlagged: 3 });
    const maria = await sql<{ list: string; count: number }>`
      SELECT sr.comparability_group AS list, c.count
        FROM given_name_counts c
        JOIN given_names g USING (given_name_id)
        JOIN source_records sr USING (source_record_id)
       WHERE g.canonical_display = 'MARIA'
       ORDER BY 1
    `.execute(db());
    expect(maria.rows).toEqual([
      { list: "pesel_given_names_2026_first_female", count: 566902 },
      { list: "pesel_given_names_2026_first_male", count: 55 },
    ]);
    expect(await n(sql`SELECT count(*)::text AS n FROM given_names`)).toBe(35);
  });

  it("never touches the surname register", async () => {
    expect(await n(sql`SELECT count(*)::text AS n FROM surnames`)).toBe(0);
    expect(await n(sql`SELECT count(*)::text AS n FROM distribution_snapshots`)).toBe(0);
  });
});
