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
import { polishDiacriticFold, PREFIX_CAP, prefixSuggestions } from "@name-atlas/resolver";
import { seedTestSurname } from "@name-atlas/resolver/testing";

/**
 * Suggest-as-you-type against a real PostgreSQL (`docs/contracts/surname-prefix.md`).
 *
 * GENUINE: the two national excerpts, imported through the real importer, so the
 * ordering is by the publisher's own counts. SYNTHETIC: `WISNIEWSKI` without
 * diacritics, DABROWA and DĄBROWA, ZMUDA TRZEBIATOWSKI and ŻMUDA TRZEBIATOWSKI,
 * and one script-confusable surname, seeded to reach the cases the excerpts do
 * not contain. The seeded national counts are each surname's larger count on the
 * 2026-01-20 register, as name-atlas.pl's API returned them on 2026-10-05
 * (TASK-125), attached by cloning an imported national snapshot.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => readFileSync(path.join(repoRoot, p));
const metadata = (name: string): unknown =>
  JSON.parse(
    read(`docs/sources/acquisition/2026-09-18/metadata/${name}.official_resource.json`).toString(
      "utf8",
    ),
  );

describe("prefix suggestions", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  const names = async (input: string) => {
    const outcome = await prefixSuggestions(db(), input);
    if (outcome.kind !== "SUGGESTIONS")
      throw new Error(`expected suggestions, got ${outcome.kind}`);
    return outcome.items.map((i) => i.display_name);
  };

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
      const outcome = await importPeselResource(db(), {
        resource,
        bytes,
        expectedSha256: sha256Hex(bytes),
        rawPayload: metadata(meta),
      });
      if (outcome.kind !== "IMPORTED") throw new Error(`import failed: ${JSON.stringify(outcome)}`);
    }
    for (const [display, count] of [
      ["WISNIEWSKI", 105],
      ["DABROWA", 7],
      ["DĄBROWA", 1211],
      ["ZMUDA TRZEBIATOWSKI", 248],
      ["ŻMUDA TRZEBIATOWSKI", 88],
    ] as const) {
      const seeded = await seedTestSurname(db(), { canonical_display: display });
      await sql`
        WITH snapshot AS (
          INSERT INTO distribution_snapshots
          SELECT (jsonb_populate_record(NULL::distribution_snapshots, to_jsonb(d) ||
                   jsonb_build_object('distribution_snapshot_id', gen_random_uuid(),
                                      'surname_id', ${seeded.surname_id}::uuid))).*
            FROM distribution_snapshots d WHERE d.geography_level = 'NATIONAL' LIMIT 1
          RETURNING distribution_snapshot_id
        )
        INSERT INTO distribution_values
        SELECT (jsonb_populate_record(NULL::distribution_values, to_jsonb(v) ||
                 jsonb_build_object('distribution_value_id', gen_random_uuid(),
                                    'distribution_snapshot_id', snapshot.distribution_snapshot_id,
                                    'count', ${count}::int))).*
          FROM snapshot, distribution_values v WHERE v.place_id IS NULL LIMIT 1
      `.execute(db());
    }
    await seedTestSurname(db(), { canonical_display: "WISNIEWSKIX" });
    const confusable = await seedTestSurname(db(), { canonical_display: "KOWALSKIJ" });
    await sql`
      UPDATE surnames SET mixed_script = true, script_confusable_flag = true
      WHERE surname_id = ${confusable.surname_id}::uuid
    `.execute(db());
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("orders by the larger national count, never a sum", async () => {
    // KOWALSKA 67,308 (female) > KOWALSKI 66,589 (male) > KOWALCZYK max(46,994, 48,264).
    expect(await names("kow")).toEqual(["KOWALSKA", "KOWALSKI", "KOWALCZYK"]);
  });

  it("finds diacritic surnames from input typed without diacritics, and puts the far more common first", async () => {
    // TASK-125: WISNIEWSKI (105) matches `wisn` as typed, but WIŚNIEWSKA (54,177) and
    // WIŚNIEWSKI (53,079) are more than five times as common. WISNIEWSKIX has no count.
    expect(await names("wisn")).toEqual(["WIŚNIEWSKA", "WIŚNIEWSKI", "WISNIEWSKI", "WISNIEWSKIX"]);
    expect(await names("dabrowa")).toEqual(["DĄBROWA", "DABROWA"]);
  });

  it("keeps the spelling as typed first where it is the more common one", async () => {
    expect(await names("zmuda t")).toEqual(["ZMUDA TRZEBIATOWSKI", "ŻMUDA TRZEBIATOWSKI"]);
  });

  it("puts surnames matching the diacritics as typed first", async () => {
    expect(await names("WIŚ")).toEqual(["WIŚNIEWSKA", "WIŚNIEWSKI", "WISNIEWSKI", "WISNIEWSKIX"]);
    expect(await names("ŻMUDA")).toEqual(["ŻMUDA TRZEBIATOWSKI", "ZMUDA TRZEBIATOWSKI"]);
  });

  it("breaks count ties alphabetically", async () => {
    expect(await names("aa")).toEqual(["AA", "AABARI", "AABEL", "AABID", "AACHARYA"]);
  });

  it("offers nothing for one character, and never more than the cap", async () => {
    expect(await prefixSuggestions(db(), "n")).toEqual({ kind: "TOO_SHORT" });
    expect(await prefixSuggestions(db(), "  n  ")).toEqual({ kind: "TOO_SHORT" });
    for (const input of ["ko", "a", "w"]) {
      const outcome = await prefixSuggestions(db(), `${input}a`);
      if (outcome.kind === "SUGGESTIONS")
        expect(outcome.items.length).toBeLessThanOrEqual(PREFIX_CAP);
    }
  });

  it("offers nothing for mixed-script input, and never a script-confusable surname", async () => {
    expect((await prefixSuggestions(db(), "KОW")).kind).toBe("INVALID_INPUT"); // Cyrillic О
    expect(await names("kowalskij")).toEqual([]);
  });

  it("treats LIKE metacharacters as letters", async () => {
    expect(await names("a/g")).toEqual(["A/GADIR"]);
    expect(await names("a_")).toEqual([]);
    expect(await names("a%")).toEqual([]);
  });

  it("indexes the same fold the resolver computes, letter for letter", async () => {
    const letters = "ąćęłńóśźż";
    const row = await sql<{ folded: string }>`
      SELECT translate(${letters}, 'ąćęłńóśźż', 'acelnoszz') AS folded
    `.execute(db());
    expect(row.rows[0]?.folded).toBe(polishDiacriticFold(letters));
    const index = await sql<{ indexdef: string }>`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'surnames_fold_key_trgm'
    `.execute(db());
    expect(index.rows[0]?.indexdef).toContain("gin_trgm_ops");
  });
});
