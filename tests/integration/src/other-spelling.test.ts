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
import { seedTestSurname } from "@name-atlas/resolver/testing";
import { deriveCurrentPopulation, querySurnameResult, readOtherSpelling } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-131: the surname page's other spelling, read from `CURRENT_RANK` claims
 * in a real PostgreSQL.
 *
 * GENUINE: the national excerpts, and WIŚNIEWSKI's population claim derived from
 * them. SYNTHETIC: every rank claim, inserted by cloning that population claim
 * row, as `rank-neighbours.test.ts` does, and the surnames the excerpts lack. The
 * counts are those of the 2026-01-20 register as name-atlas.pl's API returned
 * them on 2026-10-05; the ranks are invented and nothing here reads them.
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

describe("the other spelling", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  const ids = new Map<string, string>();
  const idOf = (display: string): string => {
    const id = ids.get(display);
    if (id === undefined) throw new Error(`${display} was not set up`);
    return id;
  };

  async function rankClaim(
    display: string,
    group: string,
    count: number,
    status: "ACTIVE" | "SUPERSEDED" = "ACTIVE",
  ): Promise<void> {
    await sql`
      INSERT INTO claims (claim_id, claim_key, claim_type, epistemic_type, scope,
                          subject_entity_id, structured_value, claim_status,
                          created_by_run_id, method_version)
      SELECT gen_random_uuid(), ${`CURRENT_RANK|TEST|${display}|${group}|${status}`}, 'CURRENT_RANK',
             c.epistemic_type, c.scope, ${idOf(display)}::uuid,
             ${JSON.stringify({ rank: 1, count, universe: { comparability_group: group }, snapshot_date: "2026-01-20" })}::jsonb,
             ${status}, c.created_by_run_id, c.method_version
      FROM claims c WHERE c.claim_type = 'CURRENT_POPULATION'
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
    await deriveCurrentPopulation(db(), "WIŚNIEWSKI");
    const imported = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE canonical_display = 'WIŚNIEWSKI'
    `.execute(db());
    ids.set("WIŚNIEWSKI", imported.rows[0]?.surname_id ?? "");
    for (const display of [
      "WISNIEWSKI",
      "DABROWA",
      "DĄBROWA",
      "ZMUDA TRZEBIATOWSKI",
      "ŻMUDA TRZEBIATOWSKI",
      "ŻMUDA-TRZEBIATOWSKI",
      "KOWALSKIJ",
      "KÓWALSKIJ",
    ]) {
      ids.set(display, (await seedTestSurname(db(), { canonical_display: display })).surname_id);
    }
    // A script-confusable surname is never offered (as in suggest-as-you-type).
    await sql`
      UPDATE surnames SET mixed_script = true, script_confusable_flag = true
      WHERE surname_id = ${idOf("KÓWALSKIJ")}::uuid
    `.execute(db());
    const counts: [string, string, number][] = [
      ["WIŚNIEWSKI", MALE, 53079],
      ["WIŚNIEWSKI", FEMALE, 203],
      ["WISNIEWSKI", MALE, 105],
      ["WISNIEWSKI", FEMALE, 95],
      ["DABROWA", MALE, 2],
      ["DABROWA", FEMALE, 7],
      ["DĄBROWA", MALE, 1142],
      ["DĄBROWA", FEMALE, 1211],
      ["ZMUDA TRZEBIATOWSKI", MALE, 248],
      ["ZMUDA TRZEBIATOWSKI", FEMALE, 2],
      ["ŻMUDA TRZEBIATOWSKI", MALE, 88],
      ["ŻMUDA-TRZEBIATOWSKI", MALE, 224],
      // SYNTHETIC, to hold the two exclusions.
      ["KOWALSKIJ", MALE, 2],
      ["KÓWALSKIJ", MALE, 900],
    ];
    for (const [display, group, count] of counts) await rankClaim(display, group, count);
    // A superseded rank is never read: were it, DABROWA would be the larger.
    await rankClaim("DABROWA", MALE, 900_000, "SUPERSEDED");
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("gives WISNIEWSKI's page WIŚNIEWSKI, on its larger list", async () => {
    expect(await readOtherSpelling(db(), idOf("WISNIEWSKI"), "WISNIEWSKI")).toEqual({
      surname_id: idOf("WIŚNIEWSKI"),
      display_name: "WIŚNIEWSKI",
      script: "Latn",
      comparability_group: MALE,
      snapshot_date: "2026-01-20",
      count: 53079,
    });
  });

  it("gives DABROWA's page DĄBROWA, on the women's list where it is larger", async () => {
    expect(await readOtherSpelling(db(), idOf("DABROWA"), "DABROWA")).toEqual(
      expect.objectContaining({
        display_name: "DĄBROWA",
        comparability_group: FEMALE,
        count: 1211,
      }),
    );
  });

  it("gives nothing where the ASCII spelling is the more common one, or for the rarer form's page", async () => {
    // ZMUDA TRZEBIATOWSKI 248 against ŻMUDA TRZEBIATOWSKI 88. ŻMUDA-TRZEBIATOWSKI
    // has a hyphen, so its key does not fold to the same key.
    expect(
      await readOtherSpelling(db(), idOf("ZMUDA TRZEBIATOWSKI"), "ZMUDA TRZEBIATOWSKI"),
    ).toBeNull();
    expect(
      await readOtherSpelling(db(), idOf("ŻMUDA TRZEBIATOWSKI"), "ŻMUDA TRZEBIATOWSKI"),
    ).toBeNull();
    expect(await readOtherSpelling(db(), idOf("WIŚNIEWSKI"), "WIŚNIEWSKI")).toBeNull();
    expect(await readOtherSpelling(db(), idOf("DĄBROWA"), "DĄBROWA")).toBeNull();
  });

  it("never offers a script-confusable surname", async () => {
    expect(await readOtherSpelling(db(), idOf("KOWALSKIJ"), "KOWALSKIJ")).toBeNull();
  });

  it("puts the section in a response the contract accepts", async () => {
    const outcome = await querySurnameResult(db(), "WISNIEWSKI", { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    const parsed = surnameResultResponseSchema.parse(outcome.response);
    expect(parsed.schema_version).toBe("1.13");
    // The excerpt has no complete universe, so rarity, and with it the other
    // spelling, is unavailable here, as the neighbours are.
    expect(parsed.rarity?.state).toBe("UNAVAILABLE");
    expect(parsed.other_spelling).toBeNull();
  });
});
