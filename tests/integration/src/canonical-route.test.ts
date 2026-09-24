import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { importPeselResource, PESEL_NATIONAL_MALE_2026, sha256Hex } from "@name-atlas/sources";
import { backfillSlugs, shortSlugId } from "@name-atlas/seo";
import { canonicalSlug, resolveSlug } from "../../../apps/web/src/lib/slug.js";

/**
 * TASK-024 AC-1/AC-2/AC-3 and TASK-027 AC-3/AC-4 — slug resolution against a
 * real PostgreSQL.
 *
 * The property that needs a database is the one a unit test cannot reach: that a
 * slug maps back to **exactly one** surname, and that a surname whose display
 * form contains a separator still resolves.
 *
 * ADR-0010 changed what happens to a colliding slug. It used to resolve to
 * neither entity, leaving both permanently unreachable; now the backfill gives
 * one the bare slug and the other a suffix derived from its own id, so **both**
 * are reachable and neither is misattributed. The test below asserts that, and
 * asserts which one keeps the bare slug — because "whichever was imported first"
 * would be an address that moves.
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
      "surname_slugs",
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
    // ADR-0010: a surname has no address until it is assigned one.
    await backfillSlugs(db());
  });

  it("resolves a plain surname's slug to exactly that surname", async () => {
    const resolved = await resolveSlug(db(), "kowalczyk");
    expect(resolved).toMatchObject({ kind: "RESOLVED", display_name: "KOWALCZYK" });
  });

  it("resolves a slug carrying Polish letters", async () => {
    // WÓJCIK is in the committed fixture, and its slug keeps the Ó.
    // `resolveSlug` receives the decoded form — Next decodes the segment for
    // `generateMetadata`, and the page decodes the percent-encoded copy Next
    // hands it (`pageSlug`) — so the encoding never reaches it.
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

  it("gives both entities an address when two surnames produce the same slug", async () => {
    // A hyphenated and a space-separated form share one slug. The register does
    // not contain such a pair, so it is constructed here (ADR-0010 §2).
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
    await backfillSlugs(db());

    const first = "01a0c400-0000-7000-8000-000000000001";
    const second = "01a0c400-0000-7000-8000-000000000002";

    // The lower surname_id keeps the bare slug. A function of the entities, so
    // re-importing in the other order assigns the same two addresses.
    await expect(resolveSlug(db(), "test-collision")).resolves.toMatchObject({
      kind: "RESOLVED",
      surname_id: first,
      display_name: "TEST-COLLISION",
    });

    // And the other is reachable — which it was not before ADR-0010 — at an
    // address derived from its own id rather than from import order.
    const suffixed = `test-collision-${shortSlugId(second)}`;
    await expect(resolveSlug(db(), suffixed)).resolves.toMatchObject({
      kind: "RESOLVED",
      surname_id: second,
      display_name: "TEST COLLISION",
    });
  });

  it("assigns the same addresses however many times the backfill runs", async () => {
    // AC-3. Idempotence is what lets the backfill run after every import, and
    // stability is what lets a URL be put in a search index.
    const before = await sql<{ slug: string; surname_id: string }>`
      SELECT slug, surname_id::text FROM surname_slugs WHERE locale = 'pl' ORDER BY slug
    `.execute(db());
    const second = await backfillSlugs(db());
    const third = await backfillSlugs(db());
    expect(second.created).toBe(0);
    expect(third.created).toBe(0);
    expect(second.stale).toEqual([]);
    const after = await sql<{ slug: string; surname_id: string }>`
      SELECT slug, surname_id::text FROM surname_slugs WHERE locale = 'pl' ORDER BY slug
    `.execute(db());
    expect(after.rows).toEqual(before.rows);
  });

  it("refuses to store two entities at one address", async () => {
    // AC-1. The collision guarantee is the UNIQUE index, not the backfill's care.
    const taken = await sql<{ slug: string; surname_id: string }>`
      SELECT slug, surname_id::text FROM surname_slugs WHERE locale = 'pl' LIMIT 1
    `.execute(db());
    const row = taken.rows[0];
    if (!row) throw new Error("the backfill assigned no addresses");
    const other = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE surname_id::text <> ${row.surname_id} LIMIT 1
    `.execute(db());
    const rival = other.rows[0];
    if (!rival) throw new Error("the fixture holds only one surname");
    await expect(
      sql`
        INSERT INTO surname_slugs (surname_slug_id, locale, slug, surname_id, is_current)
        VALUES (gen_random_uuid(), 'pl', ${row.slug}, ${rival.surname_id}::uuid, true)
      `.execute(db()),
    ).rejects.toThrow(/surname_slugs_locale_slug_uq|duplicate key/u);
  });

  it("refuses to store two current addresses for one entity", async () => {
    // AC-1, the other index. Without it a surname could have two live URLs and
    // the canonical tag would name whichever the query happened to return.
    const taken = await sql<{ slug: string; surname_id: string }>`
      SELECT slug, surname_id::text FROM surname_slugs WHERE locale = 'pl' LIMIT 1
    `.execute(db());
    const row = taken.rows[0];
    if (!row) throw new Error("the backfill assigned no addresses");
    await expect(
      sql`
        INSERT INTO surname_slugs (surname_slug_id, locale, slug, surname_id, is_current)
        VALUES (gen_random_uuid(), 'pl', ${`${row.slug}-alt`}, ${row.surname_id}::uuid, true)
      `.execute(db()),
    ).rejects.toThrow(/surname_slugs_current_uq|duplicate key/u);
  });

  it("answers a retired address with the current one, so an indexed link survives", async () => {
    // AC-4/AC-5's read half. Retiring an address is the reason ADR-0010 chose a
    // table over a column, so the path is exercised rather than assumed.
    const taken = await sql<{ slug: string; surname_id: string }>`
      SELECT slug, surname_id::text FROM surname_slugs WHERE locale = 'pl' LIMIT 1
    `.execute(db());
    const row = taken.rows[0];
    if (!row) throw new Error("the backfill assigned no addresses");
    await sql`
      UPDATE surname_slugs SET is_current = false
       WHERE locale = 'pl' AND slug = ${row.slug}
    `.execute(db());
    await sql`
      INSERT INTO surname_slugs (surname_slug_id, locale, slug, surname_id, is_current)
      VALUES (gen_random_uuid(), 'pl', ${`${row.slug}-renamed`}, ${row.surname_id}::uuid, true)
    `.execute(db());

    await expect(resolveSlug(db(), row.slug)).resolves.toEqual({
      kind: "MOVED",
      current_slug: `${row.slug}-renamed`,
    });
    await expect(resolveSlug(db(), `${row.slug}-renamed`)).resolves.toMatchObject({
      kind: "RESOLVED",
      surname_id: row.surname_id,
    });
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
      // Every surname resolves to itself at its own address. Before ADR-0010 a
      // colliding pair was allowed to resolve to neither; now the backfill has
      // given each one an address, so "unreachable" is no longer an acceptable
      // answer and the assertion is unconditional.
      expect(resolved).toMatchObject({ kind: "RESOLVED", surname_id: row.surname_id });
    }
  });
});
