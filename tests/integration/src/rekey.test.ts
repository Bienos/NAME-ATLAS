import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey, CANONICAL_KEY_VERSION, NORMALIZATION_VERSION } from "@name-atlas/resolver";
import { seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";
import { rekeyCanonicalKeys } from "@name-atlas/sources";

/**
 * ADR-0005 — re-keying a database populated before `canonical_key_v2`.
 *
 * EVERY RECORD SEEDED HERE IS SYNTHETIC. `GROSS` and `GROẞ` are real
 * surname spellings used as realistic strings only; nothing below is a
 * PESEL row, a count, a claim or evidence of anything.
 *
 * The `v1` rows are made the way a pre-ADR database really holds them: seed
 * through the normal helper, then rewrite the key column to what full case
 * folding produced and stamp the old version. Recomputing them is the whole
 * point, so they must not start out already correct.
 */
describe("canonical key re-key (ADR-0005)", () => {
  let database: TestDatabase | undefined;

  function requireDatabase(): TestDatabase {
    if (!database) {
      throw new Error("Test database was not started - see beforeAll failure above.");
    }
    return database;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  /** Seeds a surname and then puts it back into its `canonical_key_v1` state. */
  async function seedStaleSurname(display: string, v1Key: string): Promise<string> {
    const { surname_id } = await seedTestSurname(requireDatabase().db, {
      canonical_display: display,
    });
    await requireDatabase()
      .db.updateTable("surnames")
      .set({ canonical_key: v1Key, canonical_key_version: "canonical_key_v1" })
      .where("surname_id", "=", surname_id)
      .execute();
    return surname_id;
  }

  async function surnameRow(surnameId: string) {
    return requireDatabase()
      .db.selectFrom("surnames")
      .select(["canonical_display", "canonical_key", "canonical_key_version"])
      .where("surname_id", "=", surnameId)
      .executeTakeFirstOrThrow();
  }

  it("recomputes a v1 key that full folding got wrong, and stamps the version", async () => {
    // "GROẞ" folded to "gross" under v1 — the same key as "GROSS", which is
    // why both could never be stored at once.
    const gross = await seedStaleSurname("GROẞ", "gross");

    const outcome = await rekeyCanonicalKeys(requireDatabase().db);
    expect(outcome.kind).toBe("REKEYED");
    if (outcome.kind !== "REKEYED") return;
    expect(outcome.report.surnamesRekeyed).toBe(1);
    expect(outcome.report.applied).toBe(true);

    const row = await surnameRow(gross);
    expect(row.canonical_key).toBe("groß");
    expect(row.canonical_key).toBe(canonicalKey(row.canonical_display));
    expect(row.canonical_key_version).toBe(CANONICAL_KEY_VERSION);
  });

  it("now admits the pair that could not coexist under v1", async () => {
    // The insert itself is the assertion: `canonical_key` is UNIQUE, so this
    // throws if the two still share a key.
    const { canonical_key } = await seedTestSurname(requireDatabase().db, {
      canonical_display: "GROSS",
    });
    expect(canonical_key).toBe("gross");

    const both = await requireDatabase()
      .db.selectFrom("surnames")
      .select(["canonical_display", "canonical_key"])
      .where("canonical_key", "in", ["gross", "groß"])
      .orderBy("canonical_key")
      .execute();
    expect(both.map((row) => row.canonical_display)).toEqual(["GROSS", "GROẞ"]);
  });

  it("stamps a row whose key was already right but whose version was stale", async () => {
    const nowak = await seedStaleSurname("NOWAK", "nowak");

    const outcome = await rekeyCanonicalKeys(requireDatabase().db);
    expect(outcome.kind).toBe("REKEYED");
    if (outcome.kind !== "REKEYED") return;
    expect(outcome.report.surnamesRekeyed).toBe(0);
    expect(outcome.report.surnameVersionsStamped).toBe(1);

    const row = await surnameRow(nowak);
    expect(row.canonical_key).toBe("nowak");
    expect(row.canonical_key_version).toBe(CANONICAL_KEY_VERSION);
  });

  it("re-keys name forms from the form, leaving unicode_nfc alone", async () => {
    const { surname_id } = await seedTestSurname(requireDatabase().db, {
      canonical_display: "WEIẞ",
    });
    const { name_form_id } = await seedTestNameForm(requireDatabase().db, {
      form: "WEIẞ",
      surname_id,
      form_type: "CANONICAL",
      attestation_status: "ATTESTED",
    });
    await requireDatabase()
      .db.updateTable("name_forms")
      .set({ search_key: "weiss", normalization_version: "canonical_key_v1" })
      .where("name_form_id", "=", name_form_id)
      .execute();

    const outcome = await rekeyCanonicalKeys(requireDatabase().db);
    expect(outcome.kind).toBe("REKEYED");
    if (outcome.kind !== "REKEYED") return;
    expect(outcome.report.nameFormsRekeyed).toBe(1);

    const row = await requireDatabase()
      .db.selectFrom("name_forms")
      .select(["form", "unicode_nfc", "search_key", "normalization_version"])
      .where("name_form_id", "=", name_form_id)
      .executeTakeFirstOrThrow();
    expect(row.search_key).toBe("weiß");
    expect(row.unicode_nfc).toBe("WEIẞ");
    expect(row.normalization_version).toBe(NORMALIZATION_VERSION);
  });

  it("is idempotent - a second run changes nothing", async () => {
    const outcome = await rekeyCanonicalKeys(requireDatabase().db);
    expect(outcome.kind).toBe("REKEYED");
    if (outcome.kind !== "REKEYED") return;
    expect(outcome.report.surnamesRekeyed).toBe(0);
    expect(outcome.report.surnameVersionsStamped).toBe(0);
    expect(outcome.report.nameFormsRekeyed).toBe(0);
    expect(outcome.report.nameFormVersionsStamped).toBe(0);
    expect(outcome.report.surnamesScanned).toBeGreaterThan(0);
  });

  it("a dry run reports the work and writes nothing", async () => {
    const strauss = await seedStaleSurname("STRAUẞ", "strauss");

    const outcome = await rekeyCanonicalKeys(requireDatabase().db, { dryRun: true });
    expect(outcome.kind).toBe("REKEYED");
    if (outcome.kind !== "REKEYED") return;
    expect(outcome.report.surnamesRekeyed).toBe(1);
    expect(outcome.report.applied).toBe(false);

    const row = await surnameRow(strauss);
    expect(row.canonical_key).toBe("strauss");
    expect(row.canonical_key_version).toBe("canonical_key_v1");
  });

  it("refuses the whole run when two rows would share a key, and writes nothing", async () => {
    // Two rows with the same display form and different stored keys: the
    // UNIQUE constraint never saw them as duplicates, the recompute does.
    const db = requireDatabase().db;
    const twin = uuidv7();
    await db
      .insertInto("knowledge_entities")
      .values({
        entity_id: twin,
        entity_type: "SURNAME",
        scope: "SURNAME_LEVEL",
        privacy_class: "PUBLIC",
        lifecycle_status: "ACTIVE",
      })
      .execute();
    await db
      .insertInto("surnames")
      .values({
        surname_id: twin,
        canonical_display: "STRAUẞ",
        canonical_key: "strauẞ-impostor",
        canonical_key_version: "canonical_key_v1",
        primary_script: "Latn",
        primary_locale: null,
        entity_status: "ACTIVE",
        merged_into_surname_id: null,
      })
      .execute();

    const outcome = await rekeyCanonicalKeys(db);
    expect(outcome.kind).toBe("COLLISION");
    if (outcome.kind !== "COLLISION") return;
    expect(outcome.collisions).toHaveLength(1);
    expect(outcome.collisions[0]?.key).toBe("strauß");

    // Nothing moved: the earlier stale row is still stale.
    const untouched = await surnameRow(twin);
    expect(untouched.canonical_key).toBe("strauẞ-impostor");
    const stale = await db
      .selectFrom("surnames")
      .select(["canonical_key"])
      .where("canonical_key", "=", "strauss")
      .execute();
    expect(stale).toHaveLength(1);
  });
});
