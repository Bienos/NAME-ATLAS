import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { createMigrator } from "@name-atlas/db";
import { canonicalKey, CANONICAL_KEY_VERSION } from "@name-atlas/resolver";
import { seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";
import { sql } from "kysely";

/**
 * D-013 / ADR-0005 — `canonical_key_v2` against a real PostgreSQL database.
 *
 * The defect v2 fixes is not a formatting preference: under
 * `canonical_key_v1`'s full case folding, `WEIẞ` and `WEISS` produced one key,
 * and `surnames.canonical_key` is UNIQUE, so the second insert failed and the
 * importer refused the whole resource. These tests prove the fix at the level
 * the defect actually bit: the database.
 *
 * Every surname here is a real spelling used only as a string. No count, no
 * claim, no source record.
 */

/**
 * The five pairs D-013 named. Each member is a distinct surname in the
 * register; `fullCaseFold` maps both members of a pair to one key.
 */
const SHARP_S_PAIRS: readonly (readonly [string, string])[] = [
  ["WEIẞ", "WEISS"],
  ["GROẞ", "GROSS"],
  ["GAUẞ", "GAUSS"],
  ["FUẞ", "FUSS"],
  ["BERGSTRÄẞER", "BERGSTRÄSSER"],
];

describe("canonical_key_v2 against a real PostgreSQL database", () => {
  let database: TestDatabase | undefined;

  function requireDatabase(): TestDatabase {
    if (!database) {
      throw new Error("Test database was not started — see beforeAll failure above.");
    }
    return database;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  it("stamps the identity tables with canonical_key_v2", async () => {
    const { db } = requireDatabase();
    await seedTestSurname(db, { canonical_display: "Kowalski" });

    const surnames = await sql<{ canonical_key_version: string }>`
      SELECT DISTINCT canonical_key_version FROM surnames
    `.execute(db);
    expect(surnames.rows.map((r) => r.canonical_key_version)).toEqual(["canonical_key_v2"]);
    expect(CANONICAL_KEY_VERSION).toBe("canonical_key_v2");
  });

  it("admits both members of every sharp-s pair — v1 could store only one", async () => {
    const { db } = requireDatabase();

    for (const [sharp, doubled] of SHARP_S_PAIRS) {
      const a = await seedTestSurname(db, { canonical_display: sharp });
      const b = await seedTestSurname(db, { canonical_display: doubled });
      expect(a.canonical_key).not.toBe(b.canonical_key);
      expect(a.surname_id).not.toBe(b.surname_id);
    }

    const stored = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM surnames
      WHERE canonical_display = ANY(${SHARP_S_PAIRS.flat()})
    `.execute(db);
    expect(stored.rows[0]?.n).toBe(String(SHARP_S_PAIRS.length * 2));
  });

  it("keeps the sharp s in the key rather than expanding it to ss", async () => {
    const { db } = requireDatabase();
    const row = await sql<{ canonical_key: string }>`
      SELECT canonical_key FROM surnames WHERE canonical_display = 'WEIẞ'
    `.execute(db);
    expect(row.rows[0]?.canonical_key).toBe("weiß");
  });

  it("stores a name form's search key under the same v2 rules", async () => {
    const { db } = requireDatabase();
    const surname = await seedTestSurname(db, { canonical_display: "SCHIEẞL" });
    await seedTestNameForm(db, {
      surname_id: surname.surname_id,
      form: "SCHIEẞL",
      form_type: "CANONICAL",
      attestation_status: "ATTESTED",
    });

    const row = await sql<{ search_key: string; normalization_version: string }>`
      SELECT search_key, normalization_version FROM name_forms WHERE form = 'SCHIEẞL'
    `.execute(db);
    expect(row.rows[0]?.search_key).toBe("schießl");
    expect(row.rows[0]?.normalization_version).toBe("canonical_key_v2");
  });

  it("every stored key equals what the live resolver computes from the display form", async () => {
    // This is what makes migration 0006's frozen copy trustworthy: the rows
    // it wrote agree with the function the application actually queries with.
    const { db } = requireDatabase();
    const rows = await sql<{ canonical_display: string; canonical_key: string }>`
      SELECT canonical_display, canonical_key FROM surnames
    `.execute(db);
    expect(rows.rows.length).toBeGreaterThan(0);
    for (const row of rows.rows) {
      expect(row.canonical_key).toBe(canonicalKey(row.canonical_display));
    }
  });

  it("refuses to migrate down while a sharp-s pair is stored, and changes nothing", async () => {
    // v1 cannot represent this data. Refusing is correct: the alternative is
    // merging two real surnames into one row. ADR-0005.
    const { db } = requireDatabase();
    const before = await sql<{ canonical_key: string; canonical_key_version: string }>`
      SELECT canonical_key, canonical_key_version FROM surnames ORDER BY canonical_key
    `.execute(db);

    // `0025` down to `0007` sit above `0006` and revert cleanly (two
    // constraints, the membership table, three indexes, the slug table, two
    // index swaps, a dropped constraint, six enum additions that cannot be
    // removed, the place tables, a data update and two dropped columns). They
    // come down in reverse order of application, which is why `0025` is first
    // here. The refusal under test is `0006`'s, so step past all of them, then
    // ask for the next step down.
    const migrator = createMigrator(db);
    for (const expected of [
      "0025_archive_availability",
      "0024_distribution_shift",
      "0023_administrative_memberships",
      "0022_universe_evidence_lookup_index",
      "0021_current_rank_top_index",
      "0020_surname_fold_prefix_index",
      "0019_snapshot_profile_to_source_record",
      "0018_surname_slugs",
      "0017_surname_slug_lookup_index",
      "0016_citations_per_source_record",
      "0015_surname_meaning_scope",
      "0014_surname_meaning",
      "0013_runtime_outbox",
      "0012_surname_trigram_index",
      "0011_current_distribution",
      "0010_places_core",
      "0009_rarity_context",
      "0008_pesel_rights_decision",
      "0007_script_flags",
    ]) {
      const step = await migrator.migrateDown();
      expect(step.error).toBeUndefined();
      expect(step.results?.map((r) => r.migrationName)).toEqual([expected]);
    }

    const result = await migrator.migrateDown();
    expect(result.error).toBeInstanceOf(Error);
    expect(String(result.error)).toMatch(/canonical key collision under canonical_key_v1/u);

    const after = await sql<{ canonical_key: string; canonical_key_version: string }>`
      SELECT canonical_key, canonical_key_version FROM surnames ORDER BY canonical_key
    `.execute(db);
    expect(after.rows).toEqual(before.rows);

    // Leave the database as the suite found it.
    const restored = await migrator.migrateToLatest();
    expect(restored.error).toBeUndefined();
  });
});
