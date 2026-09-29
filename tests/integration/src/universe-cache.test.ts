import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { importPeselResource, PESEL_NATIONAL_MALE_2026, sha256Hex } from "@name-atlas/sources";
import { publishedUniverseSum, regionalUniverseSize, universeSize } from "@name-atlas/truth";
import type { UniverseSizeCache, UniverseSumCache } from "@name-atlas/truth";
import { sql } from "kysely";

/**
 * TASK-028 — the universe-size cache actually caches.
 *
 * The count is 379 ms against the real register and identical for every
 * surname, so a batch derivation that misses this cache spends essentially all
 * of its time re-counting the same rows. When it was first written
 * `regionalUniverseSize` had the cache *read* and no *write*: it compiled, every
 * test passed, and the batch job ran at 0.5 surnames a second instead of 71.
 * Nothing caught it because nothing asserted the caching itself.
 *
 * Two assertions, because "returns the right number" does not distinguish a
 * working cache from no cache at all:
 *
 *   1. one call **populates** the cache — the missing write;
 *   2. a poisoned entry is **returned** — proving the read is consulted rather
 *      than the database being asked again and happening to agree.
 *
 * TASK-036 adds the same two assertions for the rarity's denominator, the
 * published-universe sum. It had no cache at all, so against the real register
 * `derive-batch --rank` ran at 5 surnames a second.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MALE_BYTES = readFileSync(path.join(repoRoot, "fixtures/pesel/national-male-2026-01-20.csv"));
const MALE_PAYLOAD: unknown = JSON.parse(
  readFileSync(
    path.join(
      repoRoot,
      "docs/sources/acquisition/2026-09-18/metadata",
      "pesel_national_2026_male_1148808.official_resource.json",
    ),
    "utf8",
  ),
);

describe("the universe-size cache", () => {
  let database: TestDatabase | undefined;
  let sourceRecordId = "";

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (outcome.kind !== "IMPORTED") throw new Error(`fixture import failed: ${outcome.kind}`);
    const row = await sql<{ source_record_id: string }>`
      SELECT source_record_id::text FROM distribution_snapshots LIMIT 1
    `.execute(db());
    sourceRecordId = row.rows[0]?.source_record_id ?? "";
    expect(sourceRecordId).not.toBe("");
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("populates the cache on the first national call", () => {
    const cache: UniverseSizeCache = new Map();
    return universeSize(db(), sourceRecordId, cache).then((size) => {
      expect(size).toBeGreaterThan(0);
      // The assertion that was missing. Without it a read-only cache passes.
      expect(cache.size).toBe(1);
    });
  });

  it("populates the cache on the first regional call", async () => {
    const cache: UniverseSizeCache = new Map();
    await regionalUniverseSize(db(), sourceRecordId, cache);
    expect(cache.size).toBe(1);
  });

  it("returns what the cache holds rather than re-counting", async () => {
    const cache: UniverseSizeCache = new Map();
    const real = await universeSize(db(), sourceRecordId, cache);
    cache.set(sourceRecordId, real + 12_345);
    expect(await universeSize(db(), sourceRecordId, cache)).toBe(real + 12_345);
  });

  it("keys the regional count separately from the national one", async () => {
    // They count the same tables filtered differently — place_id IS NULL versus
    // IS NOT NULL — so one key for both would return the wrong figure and the
    // completeness gate would pass or fail on it.
    const cache: UniverseSizeCache = new Map();
    const national = await universeSize(db(), sourceRecordId, cache);
    const regional = await regionalUniverseSize(db(), sourceRecordId, cache);
    expect(cache.size).toBe(2);
    expect(national).not.toBe(regional);
  });

  it("counts the same as an uncached call", async () => {
    const cache: UniverseSizeCache = new Map();
    expect(await universeSize(db(), sourceRecordId, cache)).toBe(
      await universeSize(db(), sourceRecordId),
    );
  });

  describe("the published-universe-sum cache (the rarity's denominator)", () => {
    it("populates the cache on the first call", async () => {
      const cache: UniverseSumCache = new Map();
      const total = await publishedUniverseSum(db(), sourceRecordId, cache);
      expect(total).toBeGreaterThan(0);
      expect(cache.get(sourceRecordId)).toBe(total);
    });

    it("returns what the cache holds rather than summing again", async () => {
      const cache: UniverseSumCache = new Map();
      const real = await publishedUniverseSum(db(), sourceRecordId, cache);
      cache.set(sourceRecordId, real + 12_345);
      expect(await publishedUniverseSum(db(), sourceRecordId, cache)).toBe(real + 12_345);
    });

    it("sums the same as an uncached call and as the national values themselves", async () => {
      const cache: UniverseSumCache = new Map();
      const cached = await publishedUniverseSum(db(), sourceRecordId, cache);
      expect(cached).toBe(await publishedUniverseSum(db(), sourceRecordId));
      const direct = await sql<{ total: string }>`
        SELECT sum(v.count)::text AS total
          FROM distribution_snapshots s
          JOIN distribution_values v ON v.distribution_snapshot_id = s.distribution_snapshot_id
         WHERE s.source_record_id = ${sourceRecordId} AND v.place_id IS NULL
      `.execute(db());
      expect(cached).toBe(Number(direct.rows[0]?.total));
    });
  });

  it("serves the universe-evidence lookup from its partial index (0022)", async () => {
    // The lookup `deriveRarityContext` and `deriveCurrentDistribution` run for
    // every surname: the earliest subject-less AUTHORITATIVE_INDEX item on a
    // source record. Without the index it reads every such item, one per ranked
    // surname. SET LOCAL inside one transaction, so the setting cannot leak.
    const plan = await db()
      .transaction()
      .execute(async (trx) => {
        await sql`SET LOCAL enable_seqscan = off`.execute(trx);
        return sql<{ "QUERY PLAN": string }>`
          EXPLAIN SELECT evidence_item_id FROM evidence_items
          WHERE source_record_id = ${sourceRecordId}
            AND evidence_type = 'AUTHORITATIVE_INDEX'
            AND subject_entity_id IS NULL
          ORDER BY created_at
          LIMIT 1
        `.execute(trx);
      });
    expect(plan.rows.map((r) => r["QUERY PLAN"]).join("\n")).toContain(
      "evidence_items_universe_lookup_idx",
    );
  });
});
