import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sql } from "kysely";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  BIRTH_NAME_RESOURCES,
  BIRTH_NAMES_FIRST_2000_2019,
  importBirthNameResource,
  sha256Hex,
} from "@name-atlas/sources";
import type { BirthNameResourceDescriptor } from "@name-atlas/sources";
import { deriveAllBirthNames, deriveBirthName } from "@name-atlas/truth";

/**
 * TASK-137 (ADR-0043): count, rank and trend claims on the first names given
 * to children, by year, in a real PostgreSQL.
 *
 * GENUINE data: the full official files of the boys' and girls' lists of 2020
 * and 2025 (their checksums are the registry's), and TASK-136's excerpt of the
 * 2000–2019 file. The only data a test changes is one name's `form_review`,
 * set by hand to show that a flagged name gets no claim, and one excerpt cut
 * in the test from a full file, to show that an absence from an excerpt is
 * not read as an absence from the list.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const fixture = (f: string) => new Uint8Array(read(`fixtures/pesel-given-name-births/${f}`));
const resource = (id: string): BirthNameResourceDescriptor => {
  const found = BIRTH_NAME_RESOURCES.find((r) => r.resource_id === id);
  if (found === undefined) throw new Error(`no resource ${id}`);
  return found;
};
const payload = (id: string): unknown =>
  JSON.parse(
    read(
      `docs/sources/acquisition/2026-10-06/metadata/pesel_birth_given_names_first_${id}.official_resource.json`,
    ).toString("utf8"),
  );

const MALE_2020 = { resource: resource("28020"), bytes: fixture("full-first-male-2020.csv") };
const FEMALE_2020 = { resource: resource("28021"), bytes: fixture("full-first-female-2020.csv") };
const MALE_2025 = { resource: resource("1159536"), bytes: fixture("full-first-male-2025.csv") };
const FEMALE_2025 = {
  resource: resource("1159538"),
  bytes: fixture("full-first-female-2025.csv"),
};
const YEARS = { resource: BIRTH_NAMES_FIRST_2000_2019, bytes: fixture("first-2000-2019.csv") };

async function startDb(): Promise<TestDatabase> {
  const database = await startTestDatabase();
  await migrateTestDatabase(database);
  return database;
}

async function importFile(
  db: TestDatabase["db"],
  file: { resource: BirthNameResourceDescriptor; bytes: Uint8Array },
): Promise<void> {
  const outcome = await importBirthNameResource(db, {
    resource: file.resource,
    bytes: file.bytes,
    expectedSha256: sha256Hex(file.bytes),
    rawPayload: payload(file.resource.resource_id),
  });
  if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
}

interface ClaimRow {
  claim_type: string;
  scope: string;
  value: Record<string, unknown>;
}

async function claimsOf(db: TestDatabase["db"], name: string): Promise<ClaimRow[]> {
  const rows = await sql<ClaimRow>`
    SELECT c.claim_type, c.scope, c.structured_value AS value
      FROM claims c JOIN given_names g ON g.given_name_id = c.subject_entity_id
     WHERE g.canonical_display = ${name} AND c.claim_status = 'ACTIVE'
     ORDER BY c.claim_type, c.claim_key
  `.execute(db);
  return rows.rows;
}

describe("given-name birth claims on full official lists (TASK-137)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  async function n(query: ReturnType<typeof sql<{ n: string }>>): Promise<number> {
    return Number((await query.execute(db())).rows[0]?.n ?? "0");
  }
  const tableCounts = async () => ({
    claims: await n(sql`SELECT count(*)::text AS n FROM claims`),
    runs: await n(sql`SELECT count(*)::text AS n FROM research_runs`),
    evidence: await n(sql`SELECT count(*)::text AS n FROM evidence_items`),
    citations: await n(sql`SELECT count(*)::text AS n FROM citations`),
    assessments: await n(sql`SELECT count(*)::text AS n FROM confidence_assessments`),
  });

  beforeAll(async () => {
    database = await startDb();
    for (const file of [YEARS, MALE_2020, FEMALE_2020, MALE_2025, FEMALE_2025]) {
      await importFile(db(), file);
    }
    // By hand: ABDUL is only on the 2000–2019 excerpt (2012 and 2013).
    await sql`UPDATE given_names SET form_review = 'INITIAL_OR_ABBREVIATION'
               WHERE canonical_display = 'ABDUL'`.execute(db());
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("derives a count per stored row, ranks only on complete lists, and a trend per 2025 name", async () => {
    const tally = await deriveAllBirthNames(db(), { concurrency: 3, batchSize: 250 });
    const abdul = await n(sql`
      SELECT count(*)::text AS n FROM given_name_birth_counts c
        JOIN given_names g ON g.given_name_id = c.given_name_id
       WHERE g.canonical_display = 'ABDUL'`);
    expect(abdul).toBe(2);
    // 104 excerpt rows + 799 + 799 + 965 + 939 full rows, less ABDUL's two.
    expect(tally.flagged).toBe(1);
    expect(tally.count).toEqual({ derived: 3604, existing: 0, refused: {} });
    // The excerpt's forty lists are not the official file: no rank on them.
    expect(tally.rank).toEqual({
      derived: 799 + 799 + 965 + 939,
      existing: 0,
      refused: { CONTENT_HASH_MISMATCH: 102 },
    });
    expect(tally.trend_years).toEqual({
      MALE: { latest: 2025, earlier: 2020 },
      FEMALE: { latest: 2025, earlier: 2020 },
    });
    expect(tally.trend.derived).toBe(965 + 939);
    expect(tally.trend.refused).toEqual({});
    expect(tally.trend.directions).toEqual({
      MALE: { RISING: 621, STEADY: 98, FALLING: 246 },
      FEMALE: { RISING: 580, STEADY: 104, FALLING: 255 },
    });
  });

  it("states ZOFIA, ANTONI, JULIA and JAKUB for 2025 as the files give them", async () => {
    const expected = [
      ["ZOFIA", "FEMALE", 4415, 1, 939, 7073, "FALLING"],
      ["ANTONI", "MALE", 5253, 2, 965, 8368, "FALLING"],
      ["JULIA", "FEMALE", 3207, 6, 939, 7351, "FALLING"],
      ["JAKUB", "MALE", 3386, 9, 965, 7162, "FALLING"],
    ] as const;
    for (const [name, sex, count, rank, of, earlier, direction] of expected) {
      const claims = await claimsOf(db(), name);
      const in2025 = claims.filter((c) => c.value["birth_year"] === 2025);
      expect(in2025.find((c) => c.claim_type === "GIVEN_NAME_BIRTH_COUNT")?.value).toMatchObject({
        count,
        sex,
        publication_threshold: 2,
      });
      expect(in2025.find((c) => c.claim_type === "GIVEN_NAME_BIRTH_RANK")?.value).toMatchObject({
        rank,
        universe_size: of,
        ties_policy: "COMPETITION",
        sex,
      });
      const trends = claims.filter((c) => c.claim_type === "GIVEN_NAME_BIRTH_TREND");
      expect(trends).toHaveLength(1);
      expect(trends[0]?.value).toMatchObject({
        direction,
        sex,
        latest: { birth_year: 2025, count },
        earlier: { birth_year: 2020, count: earlier, below_publication_threshold: null },
        window_years: 5,
        change_percent: 10,
      });
      expect(claims.every((c) => c.scope === "SHARED")).toBe(true);
    }
  });

  it("calls a name absent in 2020 rising, citing the list's cut-off and never a zero", async () => {
    const [trend] = (await claimsOf(db(), "MYROSLAV")).filter(
      (c) => c.claim_type === "GIVEN_NAME_BIRTH_TREND",
    );
    expect(trend?.value).toMatchObject({
      direction: "RISING",
      latest: { birth_year: 2025, count: 17 },
      earlier: { birth_year: 2020, count: null, below_publication_threshold: 2 },
    });
    // Its derived evidence depends on the 2025 count and on the 2020 list as a universe.
    const roles = await sql<{ dependency_role: string }>`
      SELECT d.dependency_role FROM claims c
        JOIN claim_evidence ce ON ce.claim_id = c.claim_id
        JOIN evidence_dependencies d ON d.derived_evidence_item_id = ce.evidence_item_id
        JOIN given_names g ON g.given_name_id = c.subject_entity_id
       WHERE g.canonical_display = 'MYROSLAV' AND c.claim_type = 'GIVEN_NAME_BIRTH_TREND'
       ORDER BY d.dependency_role
    `.execute(db());
    expect(roles.rows.map((r) => r.dependency_role)).toEqual(["COUNT", "UNIVERSE"]);
    // Cited to both lists' resources.
    const cited = await sql<{ supporting_locator: string }>`
      SELECT ci.supporting_locator FROM citations ci
        JOIN claims c ON c.claim_id = ci.claim_id
        JOIN given_names g ON g.given_name_id = c.subject_entity_id
       WHERE g.canonical_display = 'MYROSLAV' AND c.claim_type = 'GIVEN_NAME_BIRTH_TREND'
       ORDER BY 1
    `.execute(db());
    expect(cited.rows.map((r) => r.supporting_locator)).toEqual([
      "resource:1159536",
      "resource:28020",
    ]);
  });

  it("keeps the boys' and girls' lists apart: each is ranked within itself", async () => {
    const firsts = await sql<{ name: string; sex: string; universe: number }>`
      SELECT g.canonical_display AS name, c.structured_value->>'sex' AS sex,
             (c.structured_value->>'universe_size')::int AS universe
        FROM claims c JOIN given_names g ON g.given_name_id = c.subject_entity_id
       WHERE c.claim_type = 'GIVEN_NAME_BIRTH_RANK'
         AND (c.structured_value->>'birth_year')::int = 2025
         AND (c.structured_value->>'rank')::int = 1
       ORDER BY sex
    `.execute(db());
    expect(firsts.rows).toEqual([
      { name: "ZOFIA", sex: "FEMALE", universe: 939 },
      { name: "NIKODEM", sex: "MALE", universe: 965 },
    ]);
  });

  it("writes no claim for a flagged name", async () => {
    expect(await claimsOf(db(), "ABDUL")).toEqual([]);
    expect(await deriveBirthName(db(), "ABDUL")).toMatchObject({ kind: "FLAGGED" });
    expect(await claimsOf(db(), "ABDUL")).toEqual([]);
  });

  it("refuses a birth claim at any scope but shared", async () => {
    await expect(
      sql`UPDATE claims SET scope = 'SURNAME_LEVEL'
           WHERE claim_type = 'GIVEN_NAME_BIRTH_TREND'`.execute(db()),
    ).rejects.toThrow(/claims_given_name_birth_scope/);
  });

  it("derives nothing on a second run", async () => {
    const before = await tableCounts();
    const tally = await deriveAllBirthNames(db(), { concurrency: 3 });
    expect(tally.count).toEqual({ derived: 0, existing: 3604, refused: {} });
    expect(tally.rank.derived).toBe(0);
    expect(tally.trend).toMatchObject({ derived: 0, existing: 965 + 939, refused: {} });
    expect(await tableCounts()).toEqual(before);
    const one = await deriveBirthName(db(), "zofia");
    if (one.kind !== "DERIVED") throw new Error(JSON.stringify(one));
    expect(one.lists.every((l) => l.count_claim.kind === "EXISTING")).toBe(true);
    expect(await tableCounts()).toEqual(before);
  });
});

describe("given-name birth trends without a complete earlier list (TASK-137)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  beforeAll(async () => {
    database = await startDb();
    await importFile(db(), MALE_2025);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("gives no trend while no list five years earlier is stored", async () => {
    const tally = await deriveAllBirthNames(db());
    expect(tally.trend).toMatchObject({ derived: 0, refused: { NO_EARLIER_LIST: 965 } });
    expect(tally.trend_years).toEqual({ MALE: { latest: 2025, earlier: null } });
    expect(tally.rank.derived).toBe(965);
  });

  it("does not read an absence from an excerpt of 2020 as an absence from the list", async () => {
    // The header and the first three lines of the genuine 2020 boys' file.
    const lines = Buffer.from(MALE_2020.bytes).toString("utf8").split("\r\n");
    const excerpt = new Uint8Array(Buffer.from(`${lines.slice(0, 4).join("\r\n")}\r\n`, "utf8"));
    await importFile(db(), { resource: MALE_2020.resource, bytes: excerpt });
    const tally = await deriveAllBirthNames(db());
    // Names on the excerpt and on 2025 get a trend; every other 2025 name is refused.
    const listed = (
      await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM given_name_birth_counts c
        JOIN given_name_birth_lists l USING (given_name_birth_list_id)
       WHERE l.birth_year = 2020
         AND c.given_name_id IN (
           SELECT c2.given_name_id FROM given_name_birth_counts c2
             JOIN given_name_birth_lists l2 USING (given_name_birth_list_id)
            WHERE l2.birth_year = 2025)
    `.execute(db())
    ).rows[0]?.n;
    expect(Number(listed)).toBe(3);
    expect(tally.trend).toMatchObject({
      derived: 3,
      existing: 0,
      refused: { CONTENT_HASH_MISMATCH: 962 },
    });
    expect(tally.rank).toMatchObject({
      derived: 0,
      existing: 965,
      refused: { CONTENT_HASH_MISMATCH: 3 },
    });
  });
});
