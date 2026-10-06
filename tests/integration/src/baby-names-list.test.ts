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
import { deriveAllBirthNames, readActiveBirthLists, readBirthListPage } from "@name-atlas/truth";

/**
 * TASK-146: one list's page, read from claims on a real PostgreSQL. GENUINE
 * data: the full official 2020 and 2025 birth-name files (ranks and a trend
 * stand on them) and TASK-136's excerpt of 2000-2019 (an excerpt is not the
 * list, so no rank claim stands on it, TASK-137). The page's list view reads a
 * list through `readActiveBirthLists` and `readBirthListPage`
 * (`apps/web/src/lib/baby-names-list-page.tsx`, `runningDeps`).
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

describe("one birth-name list, a page of it (TASK-146)", () => {
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
  }, 240_000);

  afterAll(async () => {
    await database?.stop();
  });

  const listOf = async (year: number, sex: "MALE" | "FEMALE") => {
    const found = (await readActiveBirthLists(db())).find(
      (l) => l.birth_year === year && l.sex === sex,
    );
    if (found === undefined) throw new Error(`no list ${year} ${sex}`);
    return found;
  };
  const page = async (
    year: number,
    sex: "MALE" | "FEMALE",
    o: { limit?: number; offset?: number; trend?: boolean; direction?: "RISING" | "FALLING" } = {},
  ) =>
    readBirthListPage(db(), await listOf(year, sex), {
      surface: "FREE",
      limit: o.limit ?? 100,
      offset: o.offset ?? 0,
      withTrend: o.trend ?? false,
      direction: o.direction ?? null,
    });

  it("migration 0043's index serves a list's claims by type and list (§4)", async () => {
    const found = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM pg_indexes
       WHERE indexname = 'claims_given_name_birth_list_idx'`.execute(db());
    expect(Number(found.rows[0]?.n)).toBe(1);
  });

  it("the 2025 girls' list: rank 1 first, ordered by the rank claim, ties by name, one source (AC-4)", async () => {
    const p = await page(2025, "FEMALE", { limit: 100, trend: true });
    expect(p.state).toBe("READY");
    expect(p.rows).toHaveLength(100);
    expect(p.total).toBeGreaterThan(100);
    expect(p.rows[0]?.rank).toBe(1);
    for (let i = 1; i < p.rows.length; i++) {
      const a = p.rows[i - 1];
      const b = p.rows[i];
      if (a === undefined || b === undefined || a.rank === null || b.rank === null) {
        throw new Error("the top 100 are all ranked");
      }
      expect(b.rank).toBeGreaterThanOrEqual(a.rank);
      if (a.rank === b.rank) expect(a.display_name <= b.display_name).toBe(true);
      // Competition ranks: a rank is never above the number of names before it plus one.
      expect(b.rank).toBeLessThanOrEqual(i + 1);
    }
    expect(p.rows.every((r) => r.count >= 2 && r.universe_size === p.total)).toBe(true);
    expect(p.citations).toHaveLength(1);
    expect(p.citations[0]?.locator).toBe("resource:1159538");
  });

  it("paging: the next page continues the order and never repeats a name (AC-3)", async () => {
    const all = await page(2025, "MALE", { limit: 30, offset: 0 });
    const a = await page(2025, "MALE", { limit: 10, offset: 0 });
    const b = await page(2025, "MALE", { limit: 10, offset: 10 });
    const c = await page(2025, "MALE", { limit: 10, offset: 20 });
    expect([...a.rows, ...b.rows, ...c.rows].map((r) => r.given_name_id)).toEqual(
      all.rows.map((r) => r.given_name_id),
    );
    expect(b.total).toBe(all.total);
    const last = await page(2025, "MALE", { limit: 100, offset: all.total - 3 });
    expect(last.rows).toHaveLength(3);
    const beyond = await page(2025, "MALE", { limit: 100, offset: all.total });
    expect(beyond.rows).toEqual([]);
  });

  it("boys and girls are two lists, never merged or summed (AC-3)", async () => {
    const boys = await page(2025, "MALE", { limit: 1 });
    const girls = await page(2025, "FEMALE", { limit: 1 });
    expect(boys.list.sex).toBe("MALE");
    expect(girls.list.sex).toBe("FEMALE");
    expect(boys.rows[0]?.given_name_id).not.toBe(girls.rows[0]?.given_name_id);
    expect(boys.total + girls.total).not.toBe(boys.total);
    expect(boys.citations[0]?.locator).toBe("resource:1159536");
  });

  it("the direction is the latest list's only, and the filter keeps the matching names (AC-3)", async () => {
    const latest = await page(2025, "FEMALE", { limit: 100, trend: true });
    expect(latest.rows.some((r) => r.direction !== null)).toBe(true);
    const rising = await page(2025, "FEMALE", { limit: 100, trend: true, direction: "RISING" });
    expect(rising.total).toBeGreaterThan(0);
    expect(rising.total).toBeLessThan(latest.total);
    expect(rising.rows.every((r) => r.direction === "RISING")).toBe(true);
    const falling = await page(2025, "FEMALE", { limit: 100, trend: true, direction: "FALLING" });
    expect(falling.rows.every((r) => r.direction === "FALLING")).toBe(true);
    // Another year's list: no direction is read, and a filter asked for there is ignored.
    const older = await page(2020, "FEMALE", { limit: 100, trend: false, direction: "RISING" });
    expect(older.rows.every((r) => r.direction === null)).toBe(true);
    expect(older.total).toBeGreaterThan(rising.total);
  });

  it("an excerpt's list has counts and no rank: rank null, never 0 (AC-4)", async () => {
    const p = await page(2010, "FEMALE", { limit: 100 });
    expect(p.state).toBe("READY");
    expect(p.rows.length).toBeGreaterThan(0);
    expect(p.rows.every((r) => r.rank === null && r.universe_size === null)).toBe(true);
    const names = p.rows.map((r) => r.display_name);
    expect(names).toEqual([...names].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)));
  });

  it("reads claims only; a flagged form is absent (AC-4)", async () => {
    const before = await page(2025, "FEMALE", { limit: 100 });
    const top = before.rows[0];
    if (top === undefined) throw new Error("no top name");
    await sql`UPDATE given_names SET form_review = 'INITIAL_OR_ABBREVIATION'
               WHERE given_name_id = ${top.given_name_id}::uuid`.execute(db());
    const after = await page(2025, "FEMALE", { limit: 100 });
    expect(after.rows.map((r) => r.given_name_id)).not.toContain(top.given_name_id);
    expect(after.total).toBe(before.total - 1);
    // Without its claims the page would have nothing: the stored counts are not read.
    await sql`UPDATE claims SET claim_status = 'SUPERSEDED'
               WHERE claim_key LIKE 'GIVEN_NAME_BIRTH_COUNT|%'`.execute(db());
    const none = await page(2025, "FEMALE", { limit: 100 });
    expect(none.rows).toEqual([]);
  });
});
