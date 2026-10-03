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
import {
  deriveCurrentPopulation,
  querySurnameResult,
  readOtherForm,
  readRankNeighbours,
} from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-055 AC-1: the deck's neighbours on a list and the other grammatical
 * form, read from `CURRENT_RANK` claims in a real PostgreSQL.
 *
 * GENUINE: the national excerpts, and the population claims derived from them.
 * SYNTHETIC: the rank claims. The completeness gate refuses to rank an excerpt
 * (TASK-009 AC-03), so they are inserted by cloning a population claim row, as
 * `common-surnames.test.ts` does. On the two national lists the counts are the
 * excerpts' and the ranks are their order within the excerpt; `tie_list` is
 * invented outright, to hold a tie. Nothing here asserts a surname's real rank.
 * Its ties are small enough that every tied surname is listed, so the choice
 * among tied surnames (by surname id, ADR-0025) never shows here.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const metadata = (name: string): unknown =>
  JSON.parse(
    read(`docs/sources/acquisition/2026-09-18/metadata/${name}.official_resource.json`).toString(
      "utf8",
    ),
  );

const MALE = "pesel_2026_national_male";
const FEMALE = "pesel_2026_national_female";
const TIES = "tie_list";

describe("rank neighbours and the other form", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  async function rankClaim(
    surname: string,
    group: string,
    rank: number,
    count: number,
    status: "ACTIVE" | "SUPERSEDED" = "ACTIVE",
  ): Promise<void> {
    await sql`
      INSERT INTO claims (claim_id, claim_key, claim_type, epistemic_type, scope,
                          subject_entity_id, structured_value, claim_status,
                          created_by_run_id, method_version)
      SELECT gen_random_uuid(), ${`CURRENT_RANK|TEST|${surname}|${group}|${status}`}, 'CURRENT_RANK',
             c.epistemic_type, c.scope, c.subject_entity_id,
             ${JSON.stringify({ rank, count, universe: { comparability_group: group }, snapshot_date: "2026-01-20" })}::jsonb,
             ${status}, c.created_by_run_id, c.method_version
      FROM claims c JOIN surnames s ON s.surname_id = c.subject_entity_id
      WHERE s.canonical_display = ${surname} AND c.claim_type = 'CURRENT_POPULATION'
      LIMIT 1
    `.execute(db());
  }

  async function idOf(display: string): Promise<string> {
    const r = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE canonical_display = ${display}
    `.execute(db());
    const id = r.rows[0]?.surname_id;
    if (!id) throw new Error(`${display} is not in the imported fixture`);
    return id;
  }

  const names = (list: { entries: readonly { display_name: string }[] } | undefined) =>
    list?.entries.map((e) => e.display_name);

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
    const men: [string, number][] = [
      ["NOWAK", 98387],
      ["KOWALSKI", 66589],
      ["WIŚNIEWSKI", 53079],
      ["WÓJCIK", 47734],
      ["KOWALCZYK", 46994],
      ["KAMIŃSKI", 45818],
    ];
    const women: [string, number][] = [
      ["NOWAK", 99738],
      ["KOWALSKA", 67308],
      ["WIŚNIEWSKA", 54177],
    ];
    const ties: [string, number, number][] = [
      ["MAZUR", 1, 10],
      ["JANKOWSKI", 2, 8],
      ["KWIATKOWSKI", 2, 8],
      ["WOŹNIAK", 4, 5],
      ["SZYMAŃSKI", 5, 3],
      ["DĄBROWSKI", 6, 2],
    ];
    const all = new Set([...men, ...women, ...ties].map(([s]) => s));
    for (const s of [...all, "JANKOWSKA"]) await deriveCurrentPopulation(db(), s);
    for (const [i, [s, n]] of men.entries()) await rankClaim(s, MALE, i + 1, n);
    for (const [i, [s, n]] of women.entries()) await rankClaim(s, FEMALE, i + 1, n);
    for (const [s, rank, n] of ties) await rankClaim(s, TIES, rank, n);
    // A superseded rank is never a neighbour.
    await rankClaim("MAZUR", MALE, 3, 50000, "SUPERSEDED");
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("lists two places either side on the same list, nearest first", async () => {
    const lists = await readRankNeighbours(db(), await idOf("WÓJCIK"));
    expect(lists).toHaveLength(1);
    const [male] = lists;
    expect(male?.comparability_group).toBe(MALE);
    expect(male?.snapshot_date).toBe("2026-01-20");
    expect(male?.entries).toEqual([
      expect.objectContaining({ display_name: "KOWALSKI", rank: 2, count: 66589, is_self: false }),
      expect.objectContaining({
        display_name: "WIŚNIEWSKI",
        rank: 3,
        count: 53079,
        is_self: false,
      }),
      expect.objectContaining({ display_name: "WÓJCIK", rank: 4, count: 47734, is_self: true }),
      expect.objectContaining({ display_name: "KOWALCZYK", rank: 5, count: 46994, is_self: false }),
      expect.objectContaining({ display_name: "KAMIŃSKI", rank: 6, count: 45818, is_self: false }),
    ]);
  });

  it("gives one list per list the surname is ranked on, and fewer places at the top", async () => {
    const lists = await readRankNeighbours(db(), await idOf("NOWAK"));
    expect(lists.map((l) => l.comparability_group)).toEqual([FEMALE, MALE]);
    expect(names(lists[0])).toEqual(["NOWAK", "KOWALSKA", "WIŚNIEWSKA"]);
    expect(names(lists[1])).toEqual(["NOWAK", "KOWALSKI", "WIŚNIEWSKI"]);
  });

  it("lists a tie above together, and leaves a tie at the surname's own place out", async () => {
    const below = await readRankNeighbours(db(), await idOf("WOŹNIAK"));
    expect(names(below[0])).toEqual([
      "JANKOWSKI",
      "KWIATKOWSKI",
      "WOŹNIAK",
      "SZYMAŃSKI",
      "DĄBROWSKI",
    ]);
    const tied = await readRankNeighbours(db(), await idOf("JANKOWSKI"));
    expect(names(tied[0])).toEqual(["MAZUR", "JANKOWSKI", "WOŹNIAK", "SZYMAŃSKI"]);
  });

  it("never lists a superseded rank, and gives nothing to a surname without one", async () => {
    const male = (await readRankNeighbours(db(), await idOf("WIŚNIEWSKI")))[0];
    expect(names(male)).not.toContain("MAZUR");
    expect(await readRankNeighbours(db(), await idOf("JANKOWSKA"))).toEqual([]);
  });

  it("pairs KOWALSKI with KOWALSKA on the women's list, and the reverse", async () => {
    expect(await readOtherForm(db(), "KOWALSKI")).toEqual({
      surname_id: await idOf("KOWALSKA"),
      display_name: "KOWALSKA",
      script: "Latn",
      comparability_group: FEMALE,
      snapshot_date: "2026-01-20",
      rank: 2,
      count: 67308,
    });
    expect(await readOtherForm(db(), "KOWALSKA")).toEqual(
      expect.objectContaining({ display_name: "KOWALSKI", comparability_group: MALE, rank: 2 }),
    );
    expect(await readOtherForm(db(), "WIŚNIEWSKI")).toEqual(
      expect.objectContaining({ display_name: "WIŚNIEWSKA", rank: 3, count: 54177 }),
    );
  });

  it("leaves unpaired a surname without the ending, and one whose other form has no rank", async () => {
    expect(await readOtherForm(db(), "NOWAK")).toBeNull();
    expect(await readOtherForm(db(), "WÓJCIK")).toBeNull();
    // JANKOWSKA is in the register but has no rank on the women's list here.
    expect(await readOtherForm(db(), "JANKOWSKI")).toBeNull();
  });

  it("is served by migration 0026's index, list first, with no sort", async () => {
    const plan = await db()
      .transaction()
      .execute(async (trx) => {
        await sql`SET LOCAL enable_seqscan = off`.execute(trx);
        return sql<{ "QUERY PLAN": string }>`
          EXPLAIN SELECT 1 FROM claims c
          WHERE c.claim_key LIKE 'CURRENT_RANK|%' AND c.claim_status = 'ACTIVE'
            AND c.structured_value->'universe'->>'comparability_group' = ${MALE}
            AND (c.structured_value->>'rank')::int < 40
          ORDER BY (c.structured_value->>'rank')::int DESC, c.subject_entity_id DESC LIMIT 2
        `.execute(trx);
      });
    const text = plan.rows.map((r) => r["QUERY PLAN"]).join("\n");
    expect(text).toContain("claims_current_rank_list_idx");
    // A sort here would sort a whole tie group: 106,813 surnames share the
    // men's last place on the 2026 list.
    expect(text).not.toMatch(/\bSort\b/u);
  });

  it("puts both sections in a response the contract accepts", async () => {
    const outcome = await querySurnameResult(db(), "KOWALSKI", { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    const parsed = surnameResultResponseSchema.parse(outcome.response);
    expect(parsed.schema_version).toBe("1.12");
    // The excerpt has no complete universe, so rarity, and with it the
    // neighbours and the other form, is unavailable here.
    expect(parsed.rarity?.state).toBe("UNAVAILABLE");
    expect(parsed.neighbours?.state).toBe("UNAVAILABLE");
    expect(parsed.neighbours?.lists).toEqual([]);
    expect(parsed.other_form).toBeNull();
  });
});
