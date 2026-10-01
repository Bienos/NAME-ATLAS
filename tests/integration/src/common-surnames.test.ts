import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import { deriveCurrentPopulation, mostCommonSurnames } from "@name-atlas/truth";

/**
 * The home page's most common surnames, read from `CURRENT_RANK` claims.
 *
 * GENUINE: the national excerpts and population claims derived from them.
 * SYNTHETIC: the rank claims. The completeness gate refuses to derive a rank
 * over an excerpt (TASK-009 AC-03), so they are inserted by cloning a real
 * claim row and giving it a rank payload — the same technique
 * `truth-chain.test.ts` uses. The ranks are therefore invented and assert
 * nothing about the register; the test is about reading them.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const metadata = (name: string): unknown =>
  JSON.parse(
    read(`docs/sources/acquisition/2026-09-18/metadata/${name}.official_resource.json`).toString(
      "utf8",
    ),
  );

describe("mostCommonSurnames", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  async function rankClaim(
    surname: string,
    group: string,
    rank: number,
    status: "ACTIVE" | "SUPERSEDED" = "ACTIVE",
  ): Promise<void> {
    await sql`
      INSERT INTO claims (claim_id, claim_key, claim_type, epistemic_type, scope,
                          subject_entity_id, structured_value, claim_status,
                          created_by_run_id, method_version)
      SELECT gen_random_uuid(), ${`CURRENT_RANK|TEST|${surname}|${group}|${status}`}, 'CURRENT_RANK',
             c.epistemic_type, c.scope, c.subject_entity_id,
             ${JSON.stringify({ rank, universe: { comparability_group: group }, snapshot_date: "2026-01-20" })}::jsonb,
             ${status}, c.created_by_run_id, c.method_version
      FROM claims c JOIN surnames s ON s.surname_id = c.subject_entity_id
      WHERE s.canonical_display = ${surname} AND c.claim_type = 'CURRENT_POPULATION'
      LIMIT 1
    `.execute(db());
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const [resource, file, meta] of [
      [
        PESEL_NATIONAL_MALE_2026,
        "national-male-2026-01-20.csv",
        "pesel_national_2026_male_1148808",
      ],
      [
        PESEL_NATIONAL_FEMALE_2026,
        "national-female-2026-01-20.csv",
        "pesel_national_2026_female_1148811",
      ],
    ] as const) {
      const bytes = read(`fixtures/pesel/${file}`);
      await importPeselResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: metadata(meta),
      });
    }
    for (const s of ["NOWAK", "KOWALSKI", "KOWALSKA", "MAZUR"])
      await deriveCurrentPopulation(db(), s);
    await rankClaim("NOWAK", "pesel_2026_national_male", 1);
    await rankClaim("KOWALSKI", "pesel_2026_national_male", 2);
    await rankClaim("NOWAK", "pesel_2026_national_female", 1);
    await rankClaim("KOWALSKA", "pesel_2026_national_female", 2);
    await rankClaim("MAZUR", "pesel_2026_national_male", 13);
    await rankClaim("MAZUR", "pesel_2026_national_female", 3, "SUPERSEDED");
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("returns one list per rank universe, in rank order, never merged", async () => {
    const lists = await mostCommonSurnames(db(), { limit: 10 });
    expect(lists).toEqual([
      {
        comparability_group: "pesel_2026_national_female",
        snapshot_date: "2026-01-20",
        items: [
          expect.objectContaining({ display_name: "NOWAK", rank: 1 }),
          expect.objectContaining({ display_name: "KOWALSKA", rank: 2 }),
        ],
      },
      {
        comparability_group: "pesel_2026_national_male",
        snapshot_date: "2026-01-20",
        items: [
          expect.objectContaining({ display_name: "NOWAK", rank: 1 }),
          expect.objectContaining({ display_name: "KOWALSKI", rank: 2 }),
        ],
      },
    ]);
  });

  it("leaves out ranks past the limit and claims that are not active", async () => {
    const names = (await mostCommonSurnames(db(), { limit: 10 })).flatMap((l) =>
      l.items.map((i) => i.display_name),
    );
    expect(names).not.toContain("MAZUR");
    const wider = await mostCommonSurnames(db(), { limit: 20 });
    const male = wider.find((l) => l.comparability_group === "pesel_2026_national_male");
    expect(male?.items.map((i) => i.display_name)).toContain("MAZUR");
  });

  it("can be served by the partial rank index", async () => {
    // SET LOCAL inside one transaction, so the setting cannot leak to another
    // pooled connection's queries.
    const plan = await db()
      .transaction()
      .execute(async (trx) => {
        await sql`SET LOCAL enable_seqscan = off`.execute(trx);
        return sql<{ "QUERY PLAN": string }>`
          EXPLAIN SELECT 1 FROM claims c
          WHERE c.claim_key LIKE 'CURRENT_RANK|%' AND c.claim_status = 'ACTIVE'
            AND (c.structured_value->>'rank')::int <= 10
        `.execute(trx);
      });
    // Either partial rank index serves it. On these few rows the planner may
    // take 0026's (list, rank, surname); on the full register it takes 0021's,
    // checked on 828,264 rank claims on 2026-10-01 (TASK-055).
    expect(plan.rows.map((r) => r["QUERY PLAN"]).join("\n")).toMatch(
      /claims_current_rank_(value|list)_idx/u,
    );
  });
});
