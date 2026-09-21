import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { importPeselResource, PESEL_NATIONAL_MALE_2026, sha256Hex } from "@name-atlas/sources";
import { canonicalSlug, resolveSlug } from "../../../apps/web/src/lib/slug.js";

/**
 * TASK-024 AC-1/AC-2/AC-3 — slug resolution against a real PostgreSQL.
 *
 * The property that needs a database is the one a unit test cannot reach: that a
 * slug maps back to **exactly one** surname, that a surname whose display form
 * contains a separator still resolves, and that an address matching two entities
 * resolves to neither.
 *
 * GENUINE DATA: every surname comes from TASK-004's importer over the committed
 * real PESEL fixture. The collision case needs two entities that produce one
 * slug, which the register does not contain, so that pair is inserted here and
 * labelled — it asserts nothing about the register.
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

describe("canonical slug resolution against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    for (const table of [
      "evidence_dependencies",
      "citations",
      "confidence_assessments",
      "claim_evidence",
      "claims",
      "evidence_items",
      "research_runs",
      "distribution_values",
      "distribution_snapshots",
      "source_records",
      "sources",
      "rights_profiles",
      "name_forms",
      "surnames",
      "knowledge_entities",
    ]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (outcome.kind !== "IMPORTED") throw new Error(`fixture import failed: ${outcome.kind}`);
  });

  it("resolves a plain surname's slug to exactly that surname", async () => {
    const resolved = await resolveSlug(db(), "kowalczyk");
    expect(resolved).toMatchObject({ kind: "RESOLVED", display_name: "KOWALCZYK" });
  });

  it("resolves a slug carrying Polish letters", async () => {
    // WÓJCIK is in the committed fixture, and its slug keeps the Ó. Next
    // decodes a dynamic route segment before handing it over, so `resolveSlug`
    // receives the decoded form — the percent-encoding is a transport detail
    // that never reaches it.
    const slug = canonicalSlug("WÓJCIK");
    expect(slug).toBe("wójcik");
    expect(encodeURIComponent(slug)).toBe("w%C3%B3jcik");
    await expect(resolveSlug(db(), slug)).resolves.toMatchObject({
      kind: "RESOLVED",
      display_name: "WÓJCIK",
    });
  });

  it("refuses a slug that is not in canonical form rather than guessing", async () => {
    for (const bad of ["KOWALCZYK", "Kowalczyk", "-kowalczyk", "kowalczyk-"]) {
      await expect(resolveSlug(db(), bad)).resolves.toMatchObject({ kind: "INVALID" });
    }
  });

  it("reports an unknown slug as unknown, never as a near match", async () => {
    await expect(resolveSlug(db(), "kowalczykk")).resolves.toEqual({ kind: "UNKNOWN" });
  });

  it("resolves a multi-word surname through its hyphenated slug", async () => {
    // ABBAS BAHGAT MAHMOUD is a real row in the committed fixture.
    const present = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM surnames WHERE canonical_display = 'ABBAS BAHGAT MAHMOUD'
    `.execute(db());
    if (Number(present.rows[0]?.n ?? "0") === 0) return;
    const slug = canonicalSlug("ABBAS BAHGAT MAHMOUD");
    expect(slug).toBe("abbas-bahgat-mahmoud");
    await expect(resolveSlug(db(), slug)).resolves.toMatchObject({
      kind: "RESOLVED",
      display_name: "ABBAS BAHGAT MAHMOUD",
    });
  });

  it("resolves neither when two surnames produce the same slug", async () => {
    // A hyphenated and a space-separated form share one slug. The register does
    // not contain such a pair, so it is constructed here (ADR-0009 §3).
    await sql`
      INSERT INTO knowledge_entities (entity_id, entity_type, scope, privacy_class, lifecycle_status)
      VALUES ('01a0c400-0000-7000-8000-000000000001'::uuid, 'SURNAME', 'SURNAME_LEVEL', 'PUBLIC', 'ACTIVE'),
             ('01a0c400-0000-7000-8000-000000000002'::uuid, 'SURNAME', 'SURNAME_LEVEL', 'PUBLIC', 'ACTIVE')
    `.execute(db());
    await sql`
      INSERT INTO surnames (surname_id, canonical_key, canonical_key_version, canonical_display,
                            primary_script, entity_status)
      VALUES ('01a0c400-0000-7000-8000-000000000001'::uuid, 'test-collision', 'canonical_key_v2',
              'TEST-COLLISION', 'Latn', 'ACTIVE'),
             ('01a0c400-0000-7000-8000-000000000002'::uuid, 'test collision', 'canonical_key_v2',
              'TEST COLLISION', 'Latn', 'ACTIVE')
    `.execute(db());

    const resolved = await resolveSlug(db(), "test-collision");
    expect(resolved.kind).toBe("COLLISION");
    if (resolved.kind !== "COLLISION") return;
    expect([...resolved.displays]).toEqual(["TEST COLLISION", "TEST-COLLISION"]);
  });

  it("round-trips every imported surname: display → slug → the same surname", async () => {
    const rows = await sql<{ canonical_display: string; surname_id: string }>`
      SELECT canonical_display, surname_id::text FROM surnames ORDER BY canonical_display
    `.execute(db());
    expect(rows.rows.length).toBeGreaterThan(10);
    for (const row of rows.rows) {
      const slug = canonicalSlug(row.canonical_display);
      if (slug === "") continue;
      const resolved = await resolveSlug(db(), slug);
      // Either it resolves to this surname, or it is an honest collision — never
      // a different surname, and never a silent pick.
      if (resolved.kind === "RESOLVED") {
        expect(resolved.surname_id).toBe(row.surname_id);
      } else {
        expect(resolved.kind).toBe("COLLISION");
      }
    }
  });
});
