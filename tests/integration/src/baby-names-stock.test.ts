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
  GIVEN_NAMES_FIRST_FEMALE_2026,
  GIVEN_NAMES_FIRST_MALE_2026,
  importBirthNameResource,
  importGivenNameResource,
  sha256Hex,
} from "@name-atlas/sources";
import type { BirthNameResourceDescriptor } from "@name-atlas/sources";
import {
  deriveAllBirthNames,
  deriveGivenName,
  findBirthGivenName,
  readActiveBirthLists,
  readBirthNameFacts,
  readGivenNameFacts,
  stockListOfSex,
} from "@name-atlas/truth";

/**
 * TASK-145: the register's count beside the birth-year figures, on a real
 * PostgreSQL. GENUINE data: the full official 2020 and 2025 birth-name files
 * and TASK-136's excerpt (as `baby-names.test.ts`), and the two committed
 * excerpts of the PESEL register's first-name lists of 2026-01-20
 * (`fixtures/pesel-given-names/`).
 *
 * The page's load reads a name through `findBirthGivenName`, `readBirthNameFacts`
 * and `readGivenNameFacts` (`apps/web/src/lib/baby-names-page.tsx`,
 * `runningDeps`); this test runs those three on the same rows. The excerpts are
 * not complete lists, so no register rank claim stands (TASK-122).
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const bytesOf = (p: string) => new Uint8Array(read(p));
const json = (p: string): unknown => JSON.parse(read(p).toString("utf8"));
const birth = (id: string): BirthNameResourceDescriptor => {
  const found = BIRTH_NAME_RESOURCES.find((r) => r.resource_id === id);
  if (found === undefined) throw new Error(`no resource ${id}`);
  return found;
};
const BIRTH_FILES = [
  { resource: BIRTH_NAMES_FIRST_2000_2019, file: "first-2000-2019.csv" },
  { resource: birth("28020"), file: "full-first-male-2020.csv" },
  { resource: birth("28021"), file: "full-first-female-2020.csv" },
  { resource: birth("1159536"), file: "full-first-male-2025.csv" },
  { resource: birth("1159538"), file: "full-first-female-2025.csv" },
];

describe("the baby-names page's register figures (TASK-145)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const { resource, file } of BIRTH_FILES) {
      const bytes = bytesOf(`fixtures/pesel-given-name-births/${file}`);
      const outcome = await importBirthNameResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: json(
          `docs/sources/acquisition/2026-10-06/metadata/pesel_birth_given_names_first_${resource.resource_id}.official_resource.json`,
        ),
      });
      if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    }
    await deriveAllBirthNames(db(), { concurrency: 3, batchSize: 250 });
    for (const [resource, file, id] of [
      [GIVEN_NAMES_FIRST_MALE_2026, "first-male-2026-01-20.csv", "1159669"],
      [GIVEN_NAMES_FIRST_FEMALE_2026, "first-female-2026-01-20.csv", "1159670"],
    ] as const) {
      const bytes = bytesOf(`fixtures/pesel-given-names/${file}`);
      const imported = await importGivenNameResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: json(
          `docs/sources/acquisition/2026-10-03/metadata/pesel_given_names_2026_first_${id}.official_resource.json`,
        ),
      });
      if (imported.kind !== "IMPORTED") throw new Error(`import ${id}: ${imported.kind}`);
    }
    for (const name of ["MARIA", "JAN", "JĀNIS"]) await deriveGivenName(db(), name);
  }, 240_000);

  afterAll(async () => {
    await database?.stop();
  });

  async function both(typed: string) {
    const found = await findBirthGivenName(db(), typed);
    if (found.kind !== "FOUND") throw new Error(`${typed}: ${found.kind}`);
    const [births, stock] = await Promise.all([
      readBirthNameFacts(db(), found.given_name, { surface: "FREE", history: false }),
      readGivenNameFacts(db(), found.given_name, "FREE"),
    ]);
    return { births, stock };
  }

  it("MARIA: the girls' birth-year figures and, apart, each register list's own count, never a sum (AC-1, AC-4)", async () => {
    const { births, stock } = await both("maria");
    const girls = births.sexes.find((s) => s.sex === "FEMALE");
    expect(girls?.latest?.birth_year).toBe(2025);
    expect(girls?.latest?.count?.count).toBeGreaterThan(0);

    expect(stock.state).toBe("READY");
    const women = stockListOfSex(stock.lists, "FEMALE");
    const men = stockListOfSex(stock.lists, "MALE");
    expect(women?.count.count).toBe(566_902);
    expect(men?.count.count).toBe(55);
    expect(women?.snapshot_date).toBe("2026-01-20");
    expect(women?.count.citation.locator).toBe("resource:1159670");
    expect(men?.count.citation.locator).toBe("resource:1159669");
    // Each figure is its own list's: nothing here is 566,957, nor a birth count added.
    expect(stock.lists.map((l) => l.count.count).sort((a, b) => a - b)).toEqual([55, 566_902]);
    // No rank claim stands on the excerpts: no rank, never a 0.
    expect(women?.rank).toBeNull();
    expect(men?.rank).toBeNull();
  });

  it("JAN: the men's register list is the men's, the women's is the women's (AC-1)", async () => {
    const { births, stock } = await both("Jan");
    expect(births.sexes.find((s) => s.sex === "MALE")?.latest?.count).not.toBeNull();
    expect(stockListOfSex(stock.lists, "MALE")?.count.count).toBe(462_503);
    expect(stockListOfSex(stock.lists, "FEMALE")?.count.count).toBe(14);
  });

  it("a name in the register only: no birth claim, a register count, and each sex's cut-off to show (AC-2)", async () => {
    const { births, stock } = await both("jānis");
    expect(births.state).toBe("NOT_ON_ANY_LIST");
    expect(stock.state).toBe("READY");
    expect(stockListOfSex(stock.lists, "MALE")?.count.count).toBe(173);
    expect(stockListOfSex(stock.lists, "FEMALE")).toBeNull();
    const lists = await readActiveBirthLists(db());
    const latest = Math.max(...lists.filter((l) => l.sex === "MALE").map((l) => l.birth_year));
    expect(latest).toBe(2025);
    expect(
      lists.find((l) => l.sex === "MALE" && l.birth_year === 2025)?.publication_threshold,
    ).toBe(2);
  });

  it("a name in neither dataset is not a given name here; a flagged form is held (AC-2)", async () => {
    expect(await findBirthGivenName(db(), "Qwxyzzy")).toEqual({ kind: "NOT_FOUND" });
    await sql`UPDATE given_names SET form_review = 'INITIAL_OR_ABBREVIATION'
               WHERE canonical_display = 'MARIA'`.execute(db());
    expect(await findBirthGivenName(db(), "Maria")).toEqual({ kind: "HELD" });
  });

  it("reads claims only: the register's figure is a claim's, with its citation (AC-4)", async () => {
    const { stock } = await both("jan");
    for (const list of stock.lists) {
      expect(list.count.claim_id).toMatch(/^[0-9a-f-]{36}$/u);
      expect(list.count.citation.id).not.toBe("");
      expect(list.count.citation.title).not.toBe("");
    }
    const claimIds = stock.lists.map((l) => l.count.claim_id);
    const found = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM claims
       WHERE claim_id = ANY(${claimIds}::uuid[]) AND claim_type::text = 'GIVEN_NAME_POPULATION'
         AND claim_status = 'ACTIVE'`.execute(db());
    expect(Number(found.rows[0]?.n)).toBe(claimIds.length);
  });
});
