import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  BIRTH_NAMES_FIRST_2000_2019,
  BIRTH_NAMES_FIRST_FEMALE_2025,
  BIRTH_NAMES_FIRST_MALE_2022,
  BIRTH_NAMES_FIRST_MALE_2025,
  BIRTH_NAMES_RIGHTS_PROFILE,
  GIVEN_NAMES_FIRST_MALE_2026,
  importBirthNameResource,
  importGivenNameResource,
  sha256Hex,
} from "@name-atlas/sources";
import type { BirthNameResourceDescriptor } from "@name-atlas/sources";

/**
 * TASK-136 (ADR-0042): first names given to children, by year, into a real
 * PostgreSQL.
 *
 * GENUINE data: `fixtures/pesel-given-name-births/` holds whole lines of four
 * dataset 219 files, and the payloads are the publisher's own resource
 * objects read on 2026-10-06.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const fixture = (f: string) => new Uint8Array(read(`fixtures/pesel-given-name-births/${f}`));
const YEARS = fixture("first-2000-2019.csv");
const MALE_2022 = fixture("first-male-2022.csv");
const MALE_2025 = fixture("first-male-2025.csv");
const FEMALE_2025 = fixture("first-female-2025.csv");
const payload = (id: string): unknown =>
  JSON.parse(
    read(
      `docs/sources/acquisition/2026-10-06/metadata/pesel_birth_given_names_first_${id}.official_resource.json`,
    ).toString("utf8"),
  );

describe("given names by year of birth (TASK-136)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  async function n(query: ReturnType<typeof sql<{ n: string }>>): Promise<number> {
    return Number((await query.execute(db())).rows[0]?.n ?? "0");
  }
  const importFile = (resource: BirthNameResourceDescriptor, bytes: Uint8Array) =>
    importBirthNameResource(db(), {
      resource,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: payload(resource.resource_id),
    });

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("refuses changed bytes, a blocked profile and the wrong file, and writes nothing", async () => {
    const wrong = await importBirthNameResource(db(), {
      resource: BIRTH_NAMES_FIRST_2000_2019,
      bytes: YEARS,
      expectedSha256: BIRTH_NAMES_FIRST_2000_2019.official_sha256,
      rawPayload: payload("21457"),
    });
    expect(wrong).toMatchObject({ kind: "FAILED", reason: "CHECKSUM_MISMATCH" });
    const blocked = await importBirthNameResource(db(), {
      resource: BIRTH_NAMES_FIRST_2000_2019,
      bytes: YEARS,
      expectedSha256: sha256Hex(YEARS),
      rawPayload: payload("21457"),
      rightsProfile: { ...BIRTH_NAMES_RIGHTS_PROFILE, automated_access: "PROHIBITED" },
    });
    expect(blocked).toMatchObject({ kind: "FAILED", reason: "RIGHTS_BLOCKED" });
    // The girls' 2025 file offered as the boys': the sex column refuses it.
    const female = await importBirthNameResource(db(), {
      resource: BIRTH_NAMES_FIRST_MALE_2025,
      bytes: FEMALE_2025,
      expectedSha256: sha256Hex(FEMALE_2025),
      rawPayload: payload("1159536"),
    });
    expect(female).toMatchObject({ kind: "FAILED", reason: "SCHEMA_VIOLATION" });
    // 2022's header offered for 2025's file.
    const header = await importBirthNameResource(db(), {
      resource: BIRTH_NAMES_FIRST_MALE_2025,
      bytes: MALE_2022,
      expectedSha256: sha256Hex(MALE_2022),
      rawPayload: payload("1159536"),
    });
    expect(header).toMatchObject({ kind: "FAILED", reason: "SCHEMA_VIOLATION" });
    expect(await n(sql`SELECT count(*)::text AS n FROM given_names`)).toBe(0);
    expect(await n(sql`SELECT count(*)::text AS n FROM source_records`)).toBe(0);
  });

  it("imports 2000–2019 as forty lists, each with its year's cut-off", async () => {
    const outcome = await importFile(BIRTH_NAMES_FIRST_2000_2019, YEARS);
    if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    expect(outcome.report).toMatchObject({
      rowsRead: 104,
      peopleRead: 1006553,
      namesImported: 104,
      namesFlagged: 0,
    });
    expect(outcome.report.lists).toHaveLength(40);
    const lists = await sql<{ birth_year: number; sex: string; publication_threshold: number }>`
      SELECT birth_year, sex, publication_threshold FROM given_name_birth_lists
       WHERE birth_year IN (2012, 2013) ORDER BY birth_year, sex
    `.execute(db());
    expect(lists.rows).toEqual([
      { birth_year: 2012, sex: "FEMALE", publication_threshold: 5 },
      { birth_year: 2012, sex: "MALE", publication_threshold: 5 },
      { birth_year: 2013, sex: "FEMALE", publication_threshold: 2 },
      { birth_year: 2013, sex: "MALE", publication_threshold: 2 },
    ]);
    // The list's own totals are the file's, not the stored rows' sum alone.
    const sum = await n(sql`
      SELECT sum(people_sum)::text AS n FROM given_name_birth_lists
    `);
    expect(sum).toBe(1006553);
  });

  it("is a no-op on the same bytes", async () => {
    expect((await importFile(BIRTH_NAMES_FIRST_2000_2019, YEARS)).kind).toBe("ALREADY_IMPORTED");
    expect(await n(sql`SELECT count(*)::text AS n FROM given_name_birth_counts`)).toBe(104);
    expect(await n(sql`SELECT count(*)::text AS n FROM given_name_birth_lists`)).toBe(40);
  });

  it("keeps one identity per written form, and the boys' and girls' lists apart", async () => {
    for (const [resource, bytes] of [
      [BIRTH_NAMES_FIRST_MALE_2022, MALE_2022],
      [BIRTH_NAMES_FIRST_MALE_2025, MALE_2025],
      [BIRTH_NAMES_FIRST_FEMALE_2025, FEMALE_2025],
    ] as const) {
      const outcome = await importFile(resource, bytes);
      if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    }
    expect(
      await n(sql`SELECT count(*)::text AS n FROM given_names WHERE canonical_display = 'NIKOLA'`),
    ).toBe(1);
    const nikola = await sql<{ birth_year: number; sex: string; count: number; list: string }>`
      SELECT l.birth_year, l.sex, c.count, l.comparability_group AS list
        FROM given_name_birth_counts c
        JOIN given_name_birth_lists l USING (given_name_birth_list_id)
        JOIN given_names g USING (given_name_id)
       WHERE g.canonical_display = 'NIKOLA' AND l.birth_year IN (2007, 2019, 2022, 2025)
       ORDER BY 1, 2
    `.execute(db());
    expect(nikola.rows).toEqual([
      {
        birth_year: 2007,
        sex: "FEMALE",
        count: 4478,
        list: "pesel_birth_given_names_first_2007_female",
      },
      { birth_year: 2007, sex: "MALE", count: 5, list: "pesel_birth_given_names_first_2007_male" },
      {
        birth_year: 2019,
        sex: "FEMALE",
        count: 1814,
        list: "pesel_birth_given_names_first_2019_female",
      },
      { birth_year: 2019, sex: "MALE", count: 2, list: "pesel_birth_given_names_first_2019_male" },
      { birth_year: 2022, sex: "MALE", count: 2, list: "pesel_birth_given_names_first_2022_male" },
      {
        birth_year: 2025,
        sex: "FEMALE",
        count: 623,
        list: "pesel_birth_given_names_first_2025_female",
      },
    ]);
    // An absent year is no row, never a zero.
    expect(
      await n(sql`SELECT count(*)::text AS n FROM given_name_birth_counts WHERE count < 2`),
    ).toBe(0);
  });

  it("supersedes a changed version and keeps the old one's lists", async () => {
    // The excerpt without its last line stands in for a republished file.
    const lines = Buffer.from(MALE_2025).toString("utf8").split("\r\n");
    const shorter = new Uint8Array(Buffer.from(lines.slice(0, -2).join("\r\n") + "\r\n", "utf8"));
    const outcome = await importFile(BIRTH_NAMES_FIRST_MALE_2025, shorter);
    if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    const records = await sql<{ status: string; rows: number }>`
      SELECT sr.record_status AS status, l.row_count AS rows
        FROM source_records sr JOIN given_name_birth_lists l USING (source_record_id)
       WHERE sr.external_record_id = '1159536'
       ORDER BY 1
    `.execute(db());
    expect(records.rows).toEqual([
      { status: "ACTIVE", rows: 2 },
      { status: "UPDATED", rows: 3 },
    ]);
  });

  it("never touches the surname register or the living-register counts", async () => {
    expect(await n(sql`SELECT count(*)::text AS n FROM surnames`)).toBe(0);
    expect(await n(sql`SELECT count(*)::text AS n FROM distribution_snapshots`)).toBe(0);
    expect(await n(sql`SELECT count(*)::text AS n FROM given_name_counts`)).toBe(0);
  });

  it("shares the given-name identity with the living-register list (ADR-0032 §1)", async () => {
    const living = new Uint8Array(read("fixtures/pesel-given-names/first-male-2026-01-20.csv"));
    const outcome = await importGivenNameResource(db(), {
      resource: GIVEN_NAMES_FIRST_MALE_2026,
      bytes: living,
      expectedSha256: sha256Hex(living),
      rawPayload: {},
    });
    if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    // JAKUB, JAN and MATEUSZ are on both datasets' excerpts.
    expect(outcome.report.namesReused).toBe(3);
    const jan = await sql<{ births: string; living: string }>`
      SELECT (SELECT count(*) FROM given_name_birth_counts c WHERE c.given_name_id = g.given_name_id)::text AS births,
             (SELECT count(*) FROM given_name_counts c WHERE c.given_name_id = g.given_name_id)::text AS living
        FROM given_names g WHERE g.canonical_display = 'JAN'
    `.execute(db());
    expect(jan.rows).toEqual([{ births: "2", living: "1" }]);
  });
});
