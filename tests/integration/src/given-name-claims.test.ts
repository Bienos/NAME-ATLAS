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
  importGivenNameResource,
  sha256Hex,
} from "@name-atlas/sources";
import {
  deriveAllGivenNames,
  deriveGivenName,
  givenNamePopulationClaimKey,
} from "@name-atlas/truth";

/**
 * TASK-121: `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` against a real
 * PostgreSQL, on the committed first-name excerpts (genuine lines of the
 * official files, `fixtures/pesel-given-names/`).
 *
 * The excerpts are not the complete lists, so every rank here is refused by
 * the completeness gate, as surname ranks are on their excerpts
 * (`current-rank.test.ts`). The passing path needs the full official files;
 * it was run out of band and its output is in the progress record. Adding an
 * override to reach it here would be the bypass the gate forbids.
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

describe("given-name claims (TASK-121)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  async function n(query: ReturnType<typeof sql<{ n: string }>>): Promise<number> {
    return Number((await query.execute(db())).rows[0]?.n ?? "0");
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const [resource, bytes, id] of [
      [GIVEN_NAMES_FIRST_MALE_2026, MALE, "1159669"],
      [GIVEN_NAMES_FIRST_FEMALE_2026, FEMALE, "1159670"],
    ] as const) {
      const imported = await importGivenNameResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: payload(id),
      });
      if (imported.kind !== "IMPORTED") throw new Error(`import ${id}: ${imported.kind}`);
    }
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("gives a name on both lists two counts that never meet, and refuses a rank over an excerpt (AC-1, AC-3)", async () => {
    const outcome = await deriveGivenName(db(), "Jan");
    if (outcome.kind !== "DERIVED") throw new Error(outcome.kind);
    expect(outcome.display_name).toBe("JAN");
    expect(
      outcome.lists.map((l) => [l.comparability_group, l.count, l.population.kind, l.rank]),
    ).toEqual([
      [
        "pesel_given_names_2026_first_female",
        14,
        "DERIVED",
        { kind: "REFUSED", reason: "CONTENT_HASH_MISMATCH" },
      ],
      [
        "pesel_given_names_2026_first_male",
        462503,
        "DERIVED",
        { kind: "REFUSED", reason: "CONTENT_HASH_MISMATCH" },
      ],
    ]);
    expect(
      await n(sql`SELECT count(*)::text AS n FROM claims WHERE claim_type = 'GIVEN_NAME_RANK'`),
    ).toBe(0);
  });

  it("stores the count as the publisher's, dated, cited and assessed, at shared scope (AC-1)", async () => {
    const outcome = await deriveGivenName(db(), "JAN");
    if (outcome.kind !== "DERIVED") throw new Error(outcome.kind);
    const male = outcome.lists.find((l) => l.comparability_group?.endsWith("_male"));
    if (male === undefined) throw new Error("no male list");
    const stored = await sql<{
      claim_type: string;
      scope: string;
      claim_key: string;
      value: { count: number; snapshot_date: string; comparability_group: string };
      status: string;
      locator: string;
      run_type: string;
    }>`
      SELECT c.claim_type, c.scope, c.claim_key, c.structured_value AS value,
             ca.status, ci.supporting_locator AS locator, rr.run_type
        FROM claims c
        JOIN confidence_assessments ca ON ca.claim_id = c.claim_id
        JOIN citations ci ON ci.claim_id = c.claim_id
        JOIN research_runs rr ON rr.research_run_id = c.created_by_run_id
       WHERE c.claim_key = ${givenNamePopulationClaimKey(outcome.given_name_id, male.source_record_id)}
    `.execute(db());
    expect(stored.rows).toEqual([
      {
        claim_type: "GIVEN_NAME_POPULATION",
        scope: "SHARED",
        claim_key: `GIVEN_NAME_POPULATION|${outcome.given_name_id}|${male.source_record_id}`,
        value: expect.objectContaining({
          count: 462503,
          snapshot_date: "2026-01-20",
          comparability_group: "pesel_given_names_2026_first_male",
        }) as unknown,
        status: "VERIFIED",
        locator: "resource:1159669",
        run_type: "BASIC_GIVEN_NAME",
      },
    ]);
  });

  it("is idempotent: deriving again reuses every claim (AC-2)", async () => {
    const before = await n(sql`SELECT count(*)::text AS n FROM claims`);
    const again = await deriveGivenName(db(), "jan");
    if (again.kind !== "DERIVED") throw new Error(again.kind);
    expect(again.lists.map((l) => l.population.kind)).toEqual(["EXISTING", "EXISTING"]);
    expect(await n(sql`SELECT count(*)::text AS n FROM claims`)).toBe(before);
  });

  it("finds no placeholder as a name, and derives a flagged form without showing it (AC-4)", async () => {
    expect((await deriveGivenName(db(), "BRAK DANYCH")).kind).toBe("NOT_FOUND");
    const flagged = await deriveGivenName(db(), "MA.");
    if (flagged.kind !== "DERIVED") throw new Error(flagged.kind);
    expect(flagged.lists.map((l) => [l.count, l.population.kind])).toEqual([[20, "DERIVED"]]);
  });

  it("refuses a given-name claim at any scope but shared (AC-1)", async () => {
    await expect(
      sql`UPDATE claims SET scope = 'SURNAME_LEVEL' WHERE claim_type = 'GIVEN_NAME_POPULATION'`.execute(
        db(),
      ),
    ).rejects.toThrow(/claims_given_name_scope/);
  });

  it("derives every stored name once, a count per list and no rank over an excerpt (AC-5)", async () => {
    const tally = await deriveAllGivenNames(db(), { concurrency: 2, batchSize: 7 });
    const names = await n(sql`SELECT count(*)::text AS n FROM given_names`);
    const counts = await n(sql`SELECT count(*)::text AS n FROM given_name_counts`);
    expect(tally.names).toBe(names);
    expect(tally.population.derived + tally.population.existing).toBe(counts);
    expect(tally.population.refused).toBe(0);
    expect(tally.rank).toEqual({
      derived: 0,
      existing: 0,
      refused: { CONTENT_HASH_MISMATCH: counts },
    });
    expect(
      await n(
        sql`SELECT count(*)::text AS n FROM claims WHERE claim_type = 'GIVEN_NAME_POPULATION'`,
      ),
    ).toBe(counts);
  });
});
