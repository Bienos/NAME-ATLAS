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
  importGivenNameMeanings,
  importGivenNameResource,
  importOnomasticSource,
  sha256Hex,
} from "@name-atlas/sources";
import {
  countReadingsSince,
  deriveAllGivenNameMeanings,
  findBirthGivenName,
  findReading,
  readGivenNameMeaning,
  readingKey,
  storeReading,
} from "@name-atlas/truth";
import type { GivenNameMeaningFacts } from "@name-atlas/truth";

/**
 * TASK-156: readings of two first names' meanings on a real PostgreSQL
 * (migration 0047). GENUINE data: the committed first-name excerpts, Buryan's
 * surname file and the two first-name meaning files, derived as TASK-147
 * derives them. The reading texts are the test's own; no model is called.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const read = (p: string) => new Uint8Array(readFileSync(path.join(repoRoot, p)));
const json = (p: string): unknown =>
  JSON.parse(readFileSync(path.join(repoRoot, p)).toString("utf8"));
const PROMPT = "couple_names_reading@1";

describe("readings of two first names' meanings (TASK-156)", () => {
  let database: TestDatabase | undefined;
  const db = (): TestDatabase["db"] => {
    if (!database) throw new Error("test database was not started");
    return database.db;
  };
  const sideOf = async (name: string) => {
    const found = await findBirthGivenName(db(), name);
    if (found.kind !== "FOUND") throw new Error(`${name}: ${found.kind}`);
    const meaning = await readGivenNameMeaning(db(), found.given_name.id, "FREE");
    return { id: found.given_name.id, meaning };
  };
  const claimOf = (m: GivenNameMeaningFacts): string => {
    if (m.state !== "READY") throw new Error(`no claim: ${m.state}`);
    return m.claim_id;
  };

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
    for (const [resource, file, id] of [
      [GIVEN_NAMES_FIRST_MALE_2026, "first-male-2026-01-20.csv", "1159669"],
      [GIVEN_NAMES_FIRST_FEMALE_2026, "first-female-2026-01-20.csv", "1159670"],
    ] as const) {
      const bytes = read(`fixtures/pesel-given-names/${file}`);
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
    const surnames = await importOnomasticSource(db(), {
      bytes: read("sources/onomastics/buryan-1933.json"),
    });
    if (surnames.kind !== "IMPORTED") throw new Error(`Buryan surnames: ${surnames.kind}`);
    for (const file of ["buryan-1933.json", "yonge-1884.json"]) {
      const outcome = await importGivenNameMeanings(db(), {
        bytes: read(`sources/given-name-meanings/${file}`),
      });
      if (outcome.kind !== "IMPORTED") throw new Error(`${file}: ${outcome.kind}`);
    }
    await deriveAllGivenNameMeanings(db());
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("reads both works' claims on the FREE surface: a quoted meaning for Małgorzata and Piotr, an origin only for Anna (TASK-156 §2.1)", async () => {
    const malgorzata = await sideOf("Małgorzata");
    const piotr = await sideOf("Piotr");
    const anna = await sideOf("Anna");
    expect(malgorzata.meaning.state).toBe("READY");
    expect(piotr.meaning.state).toBe("READY");
    expect(anna.meaning.state).toBe("READY");
    if (malgorzata.meaning.state !== "READY" || anna.meaning.state !== "READY") return;
    expect(malgorzata.meaning.works.map((w) => w.literal_gloss)).toEqual(["pearl", null]);
    expect(anna.meaning.works.every((w) => w.literal_gloss === null)).toBe(true);
  });

  it("stores a reading once per pair, finds it either way round, counts it, and refuses to change it (ADR-0047 §2.4)", async () => {
    const malgorzata = await sideOf("Małgorzata");
    const piotr = await sideOf("Piotr");
    const forward = readingKey(
      { given_name_id: malgorzata.id, claim_id: claimOf(malgorzata.meaning) },
      { given_name_id: piotr.id, claim_id: claimOf(piotr.meaning) },
      PROMPT,
    );
    const backward = readingKey(
      { given_name_id: piotr.id, claim_id: claimOf(piotr.meaning) },
      { given_name_id: malgorzata.id, claim_id: claimOf(malgorzata.meaning) },
      PROMPT,
    );
    expect(backward).toEqual(forward);
    expect(await findReading(db(), forward)).toBeNull();
    const before = new Date(Date.now() - 1_000);
    expect(await countReadingsSince(db(), before)).toBe(0);

    const stored = await storeReading(db(), forward, {
      reading_id: "0199a1b2-0000-7000-8000-00000000c001",
      model: "test-model",
      text_pl: "Tekst po polsku.",
      text_en: "Text in English.",
    });
    expect(stored).toMatchObject({
      reading_id: "0199a1b2-0000-7000-8000-00000000c001",
      given_name_a_id: forward.a.given_name_id,
      given_name_b_id: forward.b.given_name_id,
      prompt_version: PROMPT,
      model: "test-model",
      text_pl: "Tekst po polsku.",
      text_en: "Text in English.",
    });
    expect(stored.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/u);
    expect(await findReading(db(), backward)).toEqual(stored);
    expect(await countReadingsSince(db(), before)).toBe(1);

    // A second store of the same key keeps the first text.
    const again = await storeReading(db(), backward, {
      reading_id: "0199a1b2-0000-7000-8000-00000000c002",
      model: "test-model",
      text_pl: "Inny tekst.",
      text_en: "Another text.",
    });
    expect(again).toEqual(stored);
    expect(await countReadingsSince(db(), before)).toBe(1);

    // A new prompt version is a new row; the old one stays.
    const next = await storeReading(
      db(),
      { ...forward, prompt_version: "couple_names_reading@2" },
      {
        reading_id: "0199a1b2-0000-7000-8000-00000000c003",
        model: "test-model",
        text_pl: "Tekst po polsku, nowy.",
        text_en: "Text in English, new.",
      },
    );
    expect(next.reading_id).toBe("0199a1b2-0000-7000-8000-00000000c003");
    expect(await findReading(db(), forward)).toEqual(stored);
    expect(await countReadingsSince(db(), before)).toBe(2);

    await expect(
      sql`UPDATE given_name_readings SET text_pl = 'x' WHERE reading_id = ${stored.reading_id}::uuid`.execute(
        db(),
      ),
    ).rejects.toThrow(/immutable/u);
    await expect(
      sql`DELETE FROM given_name_readings WHERE reading_id = ${stored.reading_id}::uuid`.execute(
        db(),
      ),
    ).rejects.toThrow(/immutable/u);
    await expect(
      sql`INSERT INTO given_name_readings (reading_id, given_name_a_id, given_name_b_id, claim_a_id, claim_b_id, prompt_version, model, text_pl, text_en)
          VALUES ('0199a1b2-0000-7000-8000-00000000c004', ${forward.b.given_name_id}::uuid, ${forward.a.given_name_id}::uuid, ${forward.b.claim_id}::uuid, ${forward.a.claim_id}::uuid, 'x', 'm', 'a', 'b')`.execute(
        db(),
      ),
    ).rejects.toThrow(/pair_ordered/u);
  });
});
