import { describe, expect, it } from "vitest";
import type { Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { WikidataRequestError } from "@name-atlas/sources";
import type { WikidataBatchOutcome } from "@name-atlas/sources";
import {
  MAX_FAILED_BATCHES,
  bearersBatchSize,
  bearersBatches,
  loadBearersInBatches,
} from "./bearers-batch.js";
import type { BearersCandidate } from "./bearers.js";

/** TASK-140 (ADR-0044): the bearers load in batches, without a database. SYNTHETIC candidates. */

const candidate = (n: number, rank: number): BearersCandidate => ({
  surname_id: `id-${String(n)}`,
  display_name: `S${String(n)}`,
  best_rank: rank,
});

describe("the batches", () => {
  it("are smaller where surnames are common", () => {
    expect(bearersBatchSize(2001)).toBe(50);
    expect(bearersBatchSize(10_000)).toBe(50);
    expect(bearersBatchSize(10_001)).toBe(100);
    expect(bearersBatchSize(50_001)).toBe(400);
    expect(bearersBatchSize(301_370)).toBe(400);
  });

  it("take the candidates in order, each sized by its first surname's rank", () => {
    const list = [
      candidate(1, 9_998),
      candidate(2, 9_999),
      candidate(3, 10_001),
      candidate(4, 60_000),
      candidate(5, 60_001),
    ];
    const sizes = (rank: number): number => (rank <= 10_000 ? 2 : 3);
    expect(bearersBatches(list, sizes).map((b) => b.map((c) => c.display_name))).toEqual([
      ["S1", "S2"],
      ["S3", "S4", "S5"],
    ]);
    expect(bearersBatches([], sizes)).toEqual([]);
  });
});

describe("the load", () => {
  it(`stops after ${String(MAX_FAILED_BATCHES)} batches in a row that failed entirely, writing nothing`, async () => {
    const asked: string[][] = [];
    const lines: string[] = [];
    const fetchBatch = (surnames: readonly string[]): Promise<readonly WikidataBatchOutcome[]> => {
      asked.push([...surnames]);
      return Promise.resolve(
        surnames.map((surname) => ({
          surname,
          error: new WikidataRequestError("bearers", 503, "bearers: HTTP 503"),
        })),
      );
    };
    // No query reaches the database: every surname failed.
    const db = {} as Kysely<DB>;
    const result = await loadBearersInBatches(db, {
      sourceId: "source",
      candidates: Array.from({ length: 30 }, (_, i) => candidate(i + 1, 60_000 + i)),
      fetchBatch,
      sizeFor: () => 2,
      log: (line) => lines.push(line),
    });
    expect(result.stopped).toBe(true);
    expect(result.tally).toEqual({ stored: 0, unchanged: 0, derived: 0, failed: 20 });
    // Ten batches written, and the eleventh already asked for while the tenth was.
    expect(asked).toHaveLength(MAX_FAILED_BATCHES + 1);
    expect(lines.at(-1)).toMatch(/10 batches in a row failed entirely; stopping/u);
  });

  it("refuses a batch that answers for other surnames than it was asked", async () => {
    const result = loadBearersInBatches({} as Kysely<DB>, {
      sourceId: "source",
      candidates: [candidate(1, 60_000)],
      fetchBatch: () =>
        Promise.resolve([
          { surname: "OTHER", error: new WikidataRequestError("bearers", 503, "x") },
        ]),
    });
    await expect(result).rejects.toThrow(/answered for OTHER/u);
  });
});
