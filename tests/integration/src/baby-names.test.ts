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
import { deriveAllBirthNames, findBirthGivenName, readBirthNameFacts } from "@name-atlas/truth";
import type { BirthNameFacts, BirthSexFigures } from "@name-atlas/truth";
import { CANONICAL_KEY_VERSION, canonicalKey } from "@name-atlas/resolver";

/**
 * TASK-141: the baby-names page's reader on a real PostgreSQL, over the claims
 * TASK-137 and TASK-139 derive.
 *
 * GENUINE data: the full official boys' and girls' files of 2020 and 2025
 * (their checksums are the registry's) and TASK-136's excerpt of the
 * 2000–2019 file. By hand: LENA's `form_review`, to show a flagged form is
 * held back, and one given name with no birth-list count, as a name only on the
 * living-register lists (ADR-0032) would be.
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

const FILES = [
  { resource: BIRTH_NAMES_FIRST_2000_2019, bytes: fixture("first-2000-2019.csv") },
  { resource: resource("28020"), bytes: fixture("full-first-male-2020.csv") },
  { resource: resource("28021"), bytes: fixture("full-first-female-2020.csv") },
  { resource: resource("1159536"), bytes: fixture("full-first-male-2025.csv") },
  { resource: resource("1159538"), bytes: fixture("full-first-female-2025.csv") },
];

describe("the baby-names reader (TASK-141)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const file of FILES) {
      const outcome = await importBirthNameResource(db(), {
        resource: file.resource,
        bytes: file.bytes,
        expectedSha256: sha256Hex(file.bytes),
        rawPayload: payload(file.resource.resource_id),
      });
      if (outcome.kind !== "IMPORTED") throw new Error(JSON.stringify(outcome));
    }
    await deriveAllBirthNames(db(), { concurrency: 3, batchSize: 250 });
    // By hand, after the derivation: a form held for review is not shown.
    await sql`UPDATE given_names SET form_review = 'INITIAL_OR_ABBREVIATION'
               WHERE canonical_display = 'LENA'`.execute(db());
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  async function facts(typed: string, history: boolean): Promise<BirthNameFacts> {
    const found = await findBirthGivenName(db(), typed);
    if (found.kind !== "FOUND") throw new Error(`${typed}: ${found.kind}`);
    return readBirthNameFacts(db(), found.given_name, {
      surface: history ? "PAID" : "FREE",
      history,
    });
  }
  const sex = (f: BirthNameFacts, s: "MALE" | "FEMALE"): BirthSexFigures => {
    const found = f.sexes.find((x) => x.sex === s);
    if (found === undefined) throw new Error(`no ${s}`);
    return found;
  };

  it("finds a typed name through its canonical key, and holds back a flagged form", async () => {
    expect(await findBirthGivenName(db(), "  zofia ")).toMatchObject({
      kind: "FOUND",
      given_name: { display_name: "ZOFIA" },
    });
    expect(await findBirthGivenName(db(), "Lena")).toEqual({ kind: "HELD" });
    expect(await findBirthGivenName(db(), "Qwxyzzy")).toEqual({ kind: "NOT_FOUND" });
    expect(await findBirthGivenName(db(), "   ")).toEqual({ kind: "INVALID" });
    expect(await findBirthGivenName(db(), "A".repeat(61))).toEqual({ kind: "INVALID" });
  });

  it("gives ZOFIA's girls' 2025 count, rank 1 of 939 and STEADY, with sources and years", async () => {
    const zofia = await facts("Zofia", false);
    expect(zofia.state).toBe("READY");
    const girls = sex(zofia, "FEMALE");
    expect(girls.latest).toMatchObject({
      birth_year: 2025,
      count: { count: 4415, citation: { locator: "resource:1159538" } },
      rank: { rank: 1, universe_size: 939, citation: { locator: "resource:1159538" } },
    });
    expect(girls.trend).toMatchObject({
      direction: "STEADY",
      latest_year: 2025,
      earlier_year: 2020,
      window_years: 5,
      change_percent: 10,
    });
    expect(girls.trend?.citations.map((c) => c.locator).sort()).toEqual([
      "resource:1159538",
      "resource:28021",
    ]);
    // Not on the boys' 2025 list: below its stored cut-off, never 0; no direction.
    const boys = sex(zofia, "MALE");
    expect(boys.latest).toMatchObject({
      birth_year: 2025,
      list: { publication_threshold: 2 },
      count: null,
      rank: null,
    });
    expect(boys.trend).toBeNull();
    expect(girls.history).toBeNull();
  });

  it("gives the list's people_sum, each count's share and 1 in N, and the trend's two shares (TASK-151)", async () => {
    const zofia = await facts("Zofia", true);
    const girls = sex(zofia, "FEMALE");
    const latest = girls.latest;
    if (latest?.list === null || latest?.count == null) throw new Error("no latest count");
    // The 2025 girls' list holds 119 788 children (D-044 §6 as amended); the reader exposes it.
    expect(latest.list.people_sum).toBe(119_788);
    const stored = await sql<{ people_sum: number }>`
      SELECT people_sum FROM given_name_birth_lists
       WHERE given_name_birth_list_id = ${latest.list.list_id}::uuid`.execute(db());
    expect(stored.rows[0]?.people_sum).toBe(119_788);
    // 4 415 of 119 788: 36 856 per million rounded down, one in 27.
    expect(latest.count).toMatchObject({ count: 4415, share_per_million: 36856, one_in: 27 });
    // The trend claim's own shares are the same definition on each list's own sum.
    expect(girls.trend?.latest_share_per_million).toBe(36856);
    const earlier = girls.history?.find((y) => y.birth_year === 2020);
    if (earlier?.list === null || earlier?.count == null) throw new Error("no 2020 count");
    expect(girls.trend?.earlier_share_per_million).toBe(earlier.count.share_per_million);
    expect(earlier.count.share_per_million).toBe(
      Number((BigInt(earlier.count.count) * 1_000_000n) / BigInt(earlier.list.people_sum)),
    );
    expect(earlier.count.one_in).toBe(Math.round(earlier.list.people_sum / earlier.count.count));
    expect(earlier.list.people_sum).not.toBe(latest.list.people_sum);
    // The claim carries what the reader reads: nothing is recomputed differently.
    const claim = await sql<{ value: string }>`
      SELECT structured_value::text AS value FROM claims WHERE claim_id = ${girls.trend?.claim_id}::uuid`.execute(
      db(),
    );
    const value = JSON.parse(claim.rows[0]?.value ?? "{}") as {
      latest: { share_per_million: number; people_sum: number };
      earlier: { share_per_million: number; people_sum: number };
    };
    expect(value.latest).toMatchObject({ share_per_million: 36856, people_sum: 119_788 });
    expect(value.earlier).toMatchObject({
      share_per_million: earlier.count.share_per_million,
      people_sum: earlier.list.people_sum,
    });
    // A year the name is on no list has no count and so no share, never 0; the boys' latest too.
    const absent = girls.history?.find((y) => y.list !== null && y.count === null);
    expect(absent).toBeDefined();
    expect(sex(zofia, "MALE").latest?.count).toBeNull();
  });

  it("gives JAKUB FALLING on the boys' list", async () => {
    const boys = sex(await facts("JAKUB", false), "MALE");
    expect(boys.latest).toMatchObject({
      count: { count: 3386 },
      rank: { rank: 9, universe_size: 965 },
    });
    expect(boys.trend?.direction).toBe("FALLING");
  });

  it("gives the share cards their inputs (TASK-152): ZOFIA's girls, JAKUB's boys, and an earlier share the claim does not carry", async () => {
    // The free cards read the FREE surface: the latest count with its "1 in N", the rank, the trend's two shares.
    const zofia = sex(await facts("Zofia", false), "FEMALE");
    expect(zofia.latest?.count).toMatchObject({
      count: 4415,
      one_in: 27,
      share_per_million: 36856,
    });
    expect(zofia.trend).toMatchObject({
      direction: "STEADY",
      latest_share_per_million: 36856,
      earlier_share_per_million: 39999,
    });
    const jakub = sex(await facts("Jakub", false), "MALE");
    expect(jakub.latest?.count).toMatchObject({
      count: 3386,
      one_in: 37,
      share_per_million: 26787,
    });
    expect(jakub.trend).toMatchObject({
      direction: "FALLING",
      latest_share_per_million: 26787,
      earlier_share_per_million: 38383,
    });
    // MYROSLAVA is on the girls' 2025 list and below the 2020 list's cut-off: the claim carries no
    // earlier share, which the direction tile reads as "poniżej progu", never as 0.
    const myroslava = sex(await facts("Myroslava", false), "FEMALE");
    expect(myroslava.latest?.count).toMatchObject({ share_per_million: 275 });
    expect(myroslava.trend).toMatchObject({
      direction: "RISING",
      earlier_year: 2020,
      latest_share_per_million: 275,
      earlier_share_per_million: null,
    });
    // The paid card reads the PAID surface's history: a year with no count is a cut-off tick, never a zero bar.
    const history = sex(await facts("Jakub", true), "MALE").history ?? [];
    expect(history.every((y) => y.count === null || y.count.count > 0)).toBe(true);
    expect(history.filter((y) => y.list !== null && y.count === null).length).toBeGreaterThan(0);
  });

  it("gives the comparison its inputs (TASK-154): ZOFIA against JULIA on the girls' lists, one sex, nothing summed, no 0", async () => {
    // Both on the PAID surface with the history, as the comparison reads them, one sex at a time.
    const zofia = sex(await facts("Zofia", true), "FEMALE");
    const julia = sex(await facts("Julia", true), "FEMALE");
    expect(zofia.latest).toMatchObject({
      birth_year: 2025,
      count: { count: 4415 },
      rank: { rank: 1 },
    });
    expect(julia.latest).toMatchObject({ birth_year: 2025, count: { count: 3207 } });
    const zh = zofia.history ?? [];
    const jh = julia.history ?? [];
    expect(zh).toHaveLength(26);
    expect(jh).toHaveLength(26);
    // The same stored lists for both names, year by year: the comparison never mixes lists.
    expect(zh.map((y) => y.list?.list_id ?? null)).toEqual(jh.map((y) => y.list?.list_id ?? null));
    // ZOFIA is not in the 2000–2019 excerpt: every excerpt year is a stored list she is below, a cut-off tick, never 0.
    for (const year of [2000, 2005, 2010, 2015]) {
      expect(
        zh.find((y) => y.birth_year === year),
        String(year),
      ).toMatchObject({
        list: { publication_threshold: year <= 2012 ? 5 : 2 },
        count: null,
        rank: null,
      });
    }
    // JULIA has the excerpt's counts in 2005 and 2010 (their ranks refused: "—"), and no 2015 row.
    expect(jh.find((y) => y.birth_year === 2005)).toMatchObject({
      count: { count: 14232 },
      rank: null,
    });
    expect(jh.find((y) => y.birth_year === 2010)).toMatchObject({
      count: { count: 15445 },
      rank: null,
    });
    expect(jh.find((y) => y.birth_year === 2015)).toMatchObject({ count: null, rank: null });
    expect(jh.find((y) => y.birth_year === 2015)?.list).not.toBeNull();
    // 2021–2024 are not imported: no list for either, which reads "—", never 0.
    expect(zh.find((y) => y.birth_year === 2022)?.list).toBeNull();
    expect(jh.find((y) => y.birth_year === 2022)?.list).toBeNull();
    expect([...zh, ...jh].every((y) => y.count === null || y.count.count > 0)).toBe(true);
    // The direction with both shares for ZOFIA; JULIA's 2020 and 2025 shares as the claim carries them.
    expect(zofia.trend).toMatchObject({
      earlier_share_per_million: 39999,
      latest_share_per_million: 36856,
    });
    expect(julia.trend).toMatchObject({
      direction: "FALLING",
      earlier_year: 2020,
      latest_year: 2025,
    });
  });

  it("reads a name on the 2020 list and absent from 2025 as below 2025's cut-off", async () => {
    const kasandra = await facts("Kasandra", false);
    expect(kasandra.state).toBe("READY");
    for (const s of ["MALE", "FEMALE"] as const) {
      expect(sex(kasandra, s).latest).toMatchObject({
        birth_year: 2025,
        list: { publication_threshold: 2 },
        count: null,
      });
      expect(sex(kasandra, s).trend).toBeNull();
    }
  });

  it("gives the paid history from 2000, with the cut-off of each year and no list where none is stored", async () => {
    const boys = sex(await facts("JAKUB", true), "MALE");
    const history = boys.history ?? [];
    expect(history[0]).toMatchObject({ birth_year: 2000, count: { count: 14497 } });
    expect(history.at(-1)?.birth_year).toBe(2025);
    expect(history).toHaveLength(26);
    // The 2000–2019 excerpt is not the official file: its counts stand, its ranks were refused.
    expect(history[0]?.rank).toBeNull();
    expect(history.find((y) => y.birth_year === 2012)?.list?.publication_threshold).toBe(5);
    expect(history.find((y) => y.birth_year === 2013)?.list?.publication_threshold).toBe(2);
    expect(history.find((y) => y.birth_year === 2020)).toMatchObject({
      count: { count: 7162 },
      rank: { universe_size: 799 },
    });
    // 2021–2024 are not imported here: no list, which the page says, never 0.
    expect(history.find((y) => y.birth_year === 2022)).toEqual({
      birth_year: 2022,
      list: null,
      count: null,
      rank: null,
    });
  });

  it("names a name with no count on any list, though it is a given name", async () => {
    // As ADR-0032's importer writes a name: one row stands in for a living-register-only name.
    const id = "00000000-0000-7000-8000-000000000140";
    await sql`INSERT INTO knowledge_entities (entity_id, entity_type, scope, privacy_class, lifecycle_status)
              VALUES (${id}::uuid, 'GIVEN_NAME', 'SHARED', 'PUBLIC', 'ACTIVE')`.execute(db());
    await sql`INSERT INTO given_names (given_name_id, canonical_key, canonical_key_version,
                canonical_display, primary_script)
              VALUES (${id}::uuid, ${canonicalKey("ZDZISŁAWA")}, ${CANONICAL_KEY_VERSION},
                'ZDZISŁAWA', 'Latn')`.execute(db());
    const found = await findBirthGivenName(db(), "Zdzisława");
    if (found.kind !== "FOUND") throw new Error(found.kind);
    expect(
      (await readBirthNameFacts(db(), found.given_name, { surface: "FREE", history: false })).state,
    ).toBe("NOT_ON_ANY_LIST");
  });
});
