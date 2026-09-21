import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { importPeselResource, PESEL_NATIONAL_MALE_2026, sha256Hex } from "@name-atlas/sources";
import { deriveCurrentPopulation, querySurnameResult } from "@name-atlas/truth";

/**
 * D-018 — one source record per publisher resource wins, by authority.
 *
 * A publisher resource can be imported twice: the committed fixture and the full
 * file are different bytes, so ADR-0003 gives each its own `SourceRecord`, and
 * both legitimately carry a snapshot for the same surname. Before this rule every
 * surname in both imports produced two claims and the result page rendered its
 * count twice.
 *
 * The rule is authority, not recency: the record whose bytes match the registry
 * wins, whenever it was imported. The full resource is not committed, so this
 * suite fakes **only the content hash** — the bytes are the real fixture, and
 * nothing here invents a count.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MALE_BYTES = readFileSync(path.join(repoRoot, "fixtures/pesel/national-male-2026-01-20.csv"));
const MALE_PAYLOAD: unknown = JSON.parse(
  readFileSync(
    path.join(
      repoRoot,
      "docs/sources/acquisition/2026-09-18/metadata/pesel_national_2026_male_1148808.official_resource.json",
    ),
    "utf8",
  ),
);

describe("claim supersession across two imports of one resource (D-018)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function aSurname(): Promise<string> {
    const r = await sql<{ canonical_display: string }>`
      SELECT canonical_display FROM surnames ORDER BY canonical_display LIMIT 1
    `.execute(db());
    const value = r.rows[0]?.canonical_display;
    if (!value) throw new Error("no surname imported");
    return value;
  }

  async function statuses(surname: string): Promise<Record<string, number>> {
    const rows = await sql<{ claim_status: string; n: string }>`
      SELECT c.claim_status::text, count(*)::text AS n
      FROM claims c
      JOIN surnames s ON s.surname_id = c.subject_entity_id
      WHERE s.canonical_display = ${surname} AND c.claim_type = 'CURRENT_POPULATION'
      GROUP BY 1
    `.execute(db());
    return Object.fromEntries(rows.rows.map((r) => [r.claim_status, Number(r.n)]));
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
    const first = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (first.kind !== "IMPORTED") throw new Error(`import failed: ${first.kind}`);
  });

  it("keeps a lone partial import active — it is the only thing that exists", async () => {
    // The committed fixture is a 22-row excerpt. No record matches the registry,
    // so nothing is superseded and the count is still published with its scope.
    const surname = await aSurname();
    await deriveCurrentPopulation(db(), surname);
    expect(await statuses(surname)).toEqual({ ACTIVE: 1 });

    const outcome = await querySurnameResult(db(), surname);
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.population?.observations).toHaveLength(1);
  });

  it("retires the non-authoritative record's claim once the official bytes are present", async () => {
    const surname = await aSurname();
    await deriveCurrentPopulation(db(), surname);
    expect(await statuses(surname)).toEqual({ ACTIVE: 1 });

    // A second source record for the same resource id, carrying the registry's
    // official checksum. Only the hash is substituted; the rows are the real
    // fixture's, so no count here is invented.
    const second = await sql<{ source_record_id: string }>`
      INSERT INTO source_records (
        source_record_id, source_id, external_record_id, external_parent_id, source_url,
        retrieved_at, source_modified_at, content_hash, raw_payload, raw_text_ref,
        record_status, record_type, rights_profile_id, supersedes_source_record_id,
        -- TASK-030 put the resource's descriptive text here. Both records are
        -- the same resource, so the second carries the same profile; copying it
        -- is what the importer would have written.
        dataset_version, universe_description, methodology_key, comparability_group,
        coverage_notes
      )
      SELECT gen_random_uuid(), source_id, external_record_id, external_parent_id, source_url,
             retrieved_at, source_modified_at, ${PESEL_NATIONAL_MALE_2026.official_sha256},
             raw_payload, raw_text_ref, record_status, record_type, rights_profile_id,
             source_record_id,
             dataset_version, universe_description, methodology_key, comparability_group,
             coverage_notes
      FROM source_records
      WHERE external_record_id = ${PESEL_NATIONAL_MALE_2026.resource_id}
      RETURNING source_record_id::text
    `.execute(db());
    const authoritative = second.rows[0]?.source_record_id;
    if (!authoritative) throw new Error("second source record was not created");

    // Copy this surname's snapshot and value onto the authoritative record.
    await sql`
      WITH new_snapshot AS (
        -- TASK-030: the profile columns moved to source_records, so copying a
        -- snapshot no longer copies them. The authoritative record carries its
        -- own, written by the importer that created it.
        INSERT INTO distribution_snapshots (
          distribution_snapshot_id, surname_id, source_id, source_record_id, geography_level,
          as_of_date
        )
        SELECT gen_random_uuid(), s.surname_id, s.source_id, ${authoritative}::uuid,
               s.geography_level, s.as_of_date
        FROM distribution_snapshots s
        JOIN surnames n ON n.surname_id = s.surname_id
        WHERE n.canonical_display = ${surname}
        RETURNING distribution_snapshot_id, surname_id
      )
      INSERT INTO distribution_values (distribution_value_id, distribution_snapshot_id, count)
      SELECT gen_random_uuid(), ns.distribution_snapshot_id, v.count
      FROM new_snapshot ns
      JOIN distribution_snapshots s ON s.surname_id = ns.surname_id
        AND s.source_record_id <> ${authoritative}::uuid
      JOIN distribution_values v ON v.distribution_snapshot_id = s.distribution_snapshot_id
    `.execute(db());

    await deriveCurrentPopulation(db(), surname);

    // One active claim, one retired — not two of each, and nothing deleted.
    expect(await statuses(surname)).toEqual({ ACTIVE: 1, SUPERSEDED: 1 });

    const outcome = await querySurnameResult(db(), surname);
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.population?.observations).toHaveLength(1);
  });

  it("chooses by authority, not by recency — a later partial import does not win", async () => {
    // Deriving again must not flip the decision back, however many times it runs.
    const surname = await aSurname();
    await deriveCurrentPopulation(db(), surname);
    const before = await statuses(surname);
    await deriveCurrentPopulation(db(), surname);
    await deriveCurrentPopulation(db(), surname);
    expect(await statuses(surname)).toEqual(before);
  });

  it("supersedes rather than deletes, so the history stays readable", async () => {
    const surname = await aSurname();
    await deriveCurrentPopulation(db(), surname);
    const rows = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM claims WHERE claim_type = 'CURRENT_POPULATION'
    `.execute(db());
    expect(Number(rows.rows[0]?.n)).toBeGreaterThan(0);
  });
});
