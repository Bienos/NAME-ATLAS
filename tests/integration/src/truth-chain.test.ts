import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { seedTestSurname } from "@name-atlas/resolver/testing";
import {
  importPeselResource,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import { deriveCurrentPopulation, evidenceSetHash } from "@name-atlas/truth";

/**
 * TASK-005 §11 "Integration" — the CURRENT_POPULATION truth chain against a
 * real PostgreSQL, over genuinely ingested data.
 *
 * ── Genuine vs synthetic ────────────────────────────────────────────────
 *
 * GENUINE: the chain is exercised by running TASK-004's importer over the
 * committed fixtures `fixtures/pesel/national-{male,female}-2026-01-20.csv`,
 * whose every row is byte-identical to a real line of the official resource,
 * with the publisher's verbatim metadata capture as raw_payload. No
 * distribution row is hand-inserted.
 *
 * SYNTHETIC: identities seeded through `@name-atlas/resolver/testing`, and
 * any directly-inserted row used to force a failure path. These exist only
 * to exercise mechanics and are NOT PESEL evidence.
 *
 * A fixture's checksum is NOT the official resource's checksum — the
 * fixtures are 22- and 23-row excerpts, so each import passes the excerpt's
 * own SHA-256 explicitly (TASK-004 §12 rule 1).
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function readFixture(name: string): Uint8Array {
  return readFileSync(path.join(repoRoot, "fixtures/pesel", name));
}
function readCapturedMetadata(name: string): unknown {
  return JSON.parse(
    readFileSync(path.join(repoRoot, "docs/sources/acquisition/2026-09-18/metadata", name), "utf8"),
  );
}

const MALE_BYTES = readFixture("national-male-2026-01-20.csv");
const FEMALE_BYTES = readFixture("national-female-2026-01-20.csv");
const MALE_PAYLOAD = readCapturedMetadata(
  "pesel_national_2026_male_1148808.official_resource.json",
);
const FEMALE_PAYLOAD = readCapturedMetadata(
  "pesel_national_2026_female_1148811.official_resource.json",
);

/** Tables the truth chain may write. */
const TRUTH_TABLES = [
  "research_runs",
  "evidence_items",
  "claims",
  "claim_evidence",
  "confidence_assessments",
  "citations",
] as const;

/** Tables the truth chain must never write. */
const SOURCE_TABLES = [
  "source_records",
  "distribution_snapshots",
  "distribution_values",
  "surnames",
  "name_forms",
] as const;

describe("CURRENT_POPULATION truth chain against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function countOf(table: string): Promise<number> {
    const result = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM ${sql.table(table)}
    `.execute(db());
    return Number(result.rows[0]?.n ?? "0");
  }

  async function countAll(tables: readonly string[]): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const table of tables) counts[table] = await countOf(table);
    return counts;
  }

  async function importBoth(): Promise<void> {
    const male = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (male.kind !== "IMPORTED") throw new Error(`male import failed: ${JSON.stringify(male)}`);
    const female = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_FEMALE_2026,
      bytes: FEMALE_BYTES,
      expectedSha256: sha256Hex(FEMALE_BYTES),
      rawPayload: FEMALE_PAYLOAD,
    });
    if (female.kind !== "IMPORTED") throw new Error(`female import failed`);
  }

  /** A surname string present in both fixtures (two snapshots). */
  function surnameInBothFixtures(): string {
    const parse = (bytes: Uint8Array): string[] =>
      new TextDecoder()
        .decode(bytes)
        .split("\r\n")
        .slice(1)
        .filter((l) => l !== "")
        .map((l) => l.slice(0, l.lastIndexOf(",")));
    const male = parse(MALE_BYTES);
    const female = new Set(parse(FEMALE_BYTES));
    const shared = male.find((s) => female.has(s));
    if (!shared) throw new Error("fixtures share no surname");
    return shared;
  }

  /** A surname string present only in the male fixture (one snapshot). */
  function surnameInMaleOnly(): string {
    const parse = (bytes: Uint8Array): string[] =>
      new TextDecoder()
        .decode(bytes)
        .split("\r\n")
        .slice(1)
        .filter((l) => l !== "")
        .map((l) => l.slice(0, l.lastIndexOf(",")));
    const female = new Set(parse(FEMALE_BYTES));
    const only = parse(MALE_BYTES).find((s) => !female.has(s));
    if (!only) throw new Error("no male-only surname in fixtures");
    return only;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    await sql`
      TRUNCATE citations, confidence_assessments, claim_evidence, claims, evidence_items,
               research_runs, distribution_values, distribution_snapshots, source_records,
               sources, rights_profiles, name_forms, surnames, knowledge_entities
      RESTART IDENTITY CASCADE
    `.execute(db());
  });

  it("derives a complete chain for an exactly-resolved surname with evidence", async () => {
    await importBoth();
    const surname = surnameInBothFixtures();

    const result = await deriveCurrentPopulation(db(), surname);
    expect(result.kind).toBe("RESULT");
    if (result.kind !== "RESULT") return;

    expect(result.resolution_status).toBe("EXACT");
    expect(result.surname.canonical_display).toBe(surname.normalize("NFC"));
    // Present in both resources → two claims, one per snapshot.
    expect(result.current_population).toHaveLength(2);

    for (const claim of result.current_population) {
      expect(claim.count).toBeGreaterThanOrEqual(2);
      expect(claim.snapshot_date).toBe("2026-01-20");
      expect(claim.country_code).toBe("PL");
      expect(claim.source_population_scope.length).toBeGreaterThan(0);
      expect(claim.confidence.status).toBe("VERIFIED");
      expect(claim.citation.url_or_reference).toContain("dane.gov.pl");
    }

    // Every link exists in the database, not just in the projection.
    expect(await countOf("evidence_items")).toBe(2);
    expect(await countOf("claims")).toBe(2);
    expect(await countOf("claim_evidence")).toBe(2);
    expect(await countOf("confidence_assessments")).toBe(2);
    expect(await countOf("citations")).toBe(2);
    expect(await countOf("research_runs")).toBe(2);
  });

  it("reports the two snapshots separately and never their sum (AC-21)", async () => {
    await importBoth();
    const result = await deriveCurrentPopulation(db(), surnameInBothFixtures());
    if (result.kind !== "RESULT") throw new Error("expected a result");

    const counts = result.current_population.map((c) => c.count);
    expect(counts).toHaveLength(2);
    const sum = counts.reduce((a, b) => a + b, 0);
    for (const claim of result.current_population) {
      expect(claim.count).not.toBe(sum);
    }
    // Different comparability groups are what make summing illegitimate.
    const groups = result.current_population.map((c) => c.comparability_group);
    expect(new Set(groups).size).toBe(2);
  });

  it("gives a surname present in one resource exactly one claim", async () => {
    await importBoth();
    const result = await deriveCurrentPopulation(db(), surnameInMaleOnly());
    if (result.kind !== "RESULT") throw new Error("expected a result");
    expect(result.current_population).toHaveLength(1);
  });

  it("traces claim → evidence → source record → source → rights in one query (AC-07)", async () => {
    await importBoth();
    await deriveCurrentPopulation(db(), surnameInMaleOnly());

    const audit = await sql<{
      count: string;
      content_hash: string;
      source_url: string;
      source_key: string;
      review_status: string;
      commercial_use: string;
      relationship: string;
    }>`
      SELECT c.structured_value->>'count' AS count,
             r.content_hash, r.source_url,
             src.source_key,
             rp.review_status::text  AS review_status,
             rp.commercial_use::text AS commercial_use,
             ce.relationship::text   AS relationship
      FROM claims c
      JOIN claim_evidence ce ON ce.claim_id = c.claim_id
      JOIN evidence_items e  ON e.evidence_item_id = ce.evidence_item_id
      JOIN source_records r  ON r.source_record_id = e.source_record_id
      JOIN sources src       ON src.source_id = r.source_id
      JOIN rights_profiles rp ON rp.rights_profile_id = src.default_rights_profile_id
      LIMIT 1
    `.execute(db());

    const row = audit.rows[0];
    expect(row).toBeDefined();
    expect(row?.relationship).toBe("SUPPORTS");
    expect(row?.content_hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(row?.source_key).toBe("pl_pesel_surnames");
    // The rights posture is reachable and unchanged by the truth chain.
    expect(row?.review_status).toBe("APPROVED"); // D-007, decided 2026-09-20
    expect(row?.commercial_use).toBe("ALLOWED"); // D-007, decided 2026-09-20
  });

  it("is idempotent: re-derivation writes nothing (AC-09)", async () => {
    await importBoth();
    const surname = surnameInBothFixtures();
    await deriveCurrentPopulation(db(), surname);
    const before = await countAll(TRUTH_TABLES);

    await deriveCurrentPopulation(db(), surname);
    await deriveCurrentPopulation(db(), surname);

    expect(await countAll(TRUTH_TABLES)).toEqual(before);
  });

  it("is deterministic: repeated derivation returns identical values (AC-10)", async () => {
    await importBoth();
    const surname = surnameInBothFixtures();
    const first = await deriveCurrentPopulation(db(), surname);
    const second = await deriveCurrentPopulation(db(), surname);
    expect(second).toEqual(first);
  });

  it("never mutates source, distribution or identity rows (AC-05)", async () => {
    await importBoth();
    const before = await countAll(SOURCE_TABLES);
    const snapshotsBefore = await sql<{ digest: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS digest
      FROM (SELECT * FROM distribution_snapshots) t
    `.execute(db());
    const valuesBefore = await sql<{ digest: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS digest
      FROM (SELECT * FROM distribution_values) t
    `.execute(db());
    const recordsBefore = await sql<{ digest: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS digest
      FROM (SELECT * FROM source_records) t
    `.execute(db());

    await deriveCurrentPopulation(db(), surnameInBothFixtures());
    await deriveCurrentPopulation(db(), surnameInMaleOnly());

    expect(await countAll(SOURCE_TABLES)).toEqual(before);
    const snapshotsAfter = await sql<{ digest: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS digest
      FROM (SELECT * FROM distribution_snapshots) t
    `.execute(db());
    const valuesAfter = await sql<{ digest: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS digest
      FROM (SELECT * FROM distribution_values) t
    `.execute(db());
    const recordsAfter = await sql<{ digest: string }>`
      SELECT md5(string_agg(t::text, '|' ORDER BY t::text)) AS digest
      FROM (SELECT * FROM source_records) t
    `.execute(db());

    expect(snapshotsAfter.rows[0]?.digest).toBe(snapshotsBefore.rows[0]?.digest);
    expect(valuesAfter.rows[0]?.digest).toBe(valuesBefore.rows[0]?.digest);
    expect(recordsAfter.rows[0]?.digest).toBe(recordsBefore.rows[0]?.digest);
  });

  it("returns UNRESOLVED for an unknown surname, and never a zero (AC-19)", async () => {
    await importBoth();
    const result = await deriveCurrentPopulation(db(), "Nieistniejące");
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") return;
    expect(result.reason).toBe("UNRESOLVED");
    expect(JSON.stringify(result)).not.toContain('"count":0');
    expect(await countOf("claims")).toBe(0);
  });

  it("returns NO_APPLICABLE_EVIDENCE for a resolved surname with no snapshot (AC-20)", async () => {
    await importBoth();
    // SYNTHETIC identity: resolvable, but carries no PESEL evidence.
    await seedTestSurname(db(), { canonical_display: "SyntheticNoEvidence" });
    const claimsBefore = await countOf("claims");

    const result = await deriveCurrentPopulation(db(), "SyntheticNoEvidence");
    expect(result.kind).toBe("NO_RESULT");
    if (result.kind !== "NO_RESULT") return;
    expect(result.reason).toBe("NO_APPLICABLE_EVIDENCE");
    expect(result.surname?.canonical_display).toBe("SyntheticNoEvidence");
    expect(result.message).toContain("not a count of zero");
    expect(await countOf("claims")).toBe(claimsBefore);
  });

  it("returns INVALID_INPUT for empty and control-character input", async () => {
    await importBoth();
    for (const input of ["", "   ", "a\u0000b"]) {
      const result = await deriveCurrentPopulation(db(), input);
      expect(result.kind).toBe("NO_RESULT");
      if (result.kind !== "NO_RESULT") continue;
      expect(result.reason).toBe("INVALID_INPUT");
    }
    expect(await countOf("claims")).toBe(0);
  });

  it("preserves Polish diacritics and does not fold them (AC-22)", async () => {
    await importBoth();
    const resolved = await deriveCurrentPopulation(db(), "WIŚNIEWSKI");
    expect(resolved.kind).toBe("RESULT");
    if (resolved.kind !== "RESULT") return;
    expect(resolved.surname.canonical_key).toBe("wiśniewski");

    // The diacritic-stripped spelling is a different surname, not a match.
    const stripped = await deriveCurrentPopulation(db(), "WISNIEWSKI");
    expect(stripped.kind).toBe("NO_RESULT");
    if (stripped.kind !== "NO_RESULT") return;
    expect(stripped.reason).toBe("UNRESOLVED");
  });

  it("resolves case-equivalent input to the same surname and value", async () => {
    await importBoth();
    const upper = await deriveCurrentPopulation(db(), "WIŚNIEWSKI");
    const lower = await deriveCurrentPopulation(db(), "wiśniewski");
    expect(lower).toEqual(upper);
  });

  it("carries the snapshot date from the source, never the retrieval date (AC-02)", async () => {
    await importBoth();
    const result = await deriveCurrentPopulation(db(), surnameInMaleOnly());
    if (result.kind !== "RESULT") throw new Error("expected a result");
    for (const claim of result.current_population) {
      expect(claim.snapshot_date).toBe("2026-01-20");
      // The bytes were retrieved on 2026-09-18; that must not appear here.
      expect(claim.snapshot_date).not.toBe("2026-09-18");
    }
    const stored = await sql<{ snapshot_date: string }>`
      SELECT structured_value->>'snapshot_date' AS snapshot_date FROM claims LIMIT 1
    `.execute(db());
    expect(stored.rows[0]?.snapshot_date).toBe("2026-01-20");
  });

  it("stores no unit, because the publisher never stated one (U-4)", async () => {
    await importBoth();
    await deriveCurrentPopulation(db(), surnameInMaleOnly());
    const payload = await sql<{ value: string }>`
      SELECT structured_value::text AS value FROM claims LIMIT 1
    `.execute(db());
    const body = payload.rows[0]?.value ?? "";
    expect(body).not.toContain("PEOPLE");
    expect(body).not.toContain('"unit"');
    // The publisher's own scope wording is carried instead.
    expect(body).toContain("source_population_scope");
  });

  it("projects confidence from the persisted assessment (AC-12)", async () => {
    await importBoth();
    const result = await deriveCurrentPopulation(db(), surnameInMaleOnly());
    if (result.kind !== "RESULT") throw new Error("expected a result");
    const claim = result.current_population[0];
    expect(claim?.confidence.status).toBe("VERIFIED");
    expect(claim?.confidence.human_review_required).toBe(false);

    const stored = await sql<{ status: string; hash: string; method: string }>`
      SELECT status::text AS status, evidence_set_hash AS hash, assessment_method AS method
      FROM confidence_assessments LIMIT 1
    `.execute(db());
    expect(stored.rows[0]?.status).toBe(claim?.confidence.status);
    expect(stored.rows[0]?.method).toBe(claim?.confidence.assessment_method);

    // The hash matches a recomputation over that claim's evidence set.
    const evidence = await sql<{ id: string }>`
      SELECT ce.evidence_item_id AS id FROM claim_evidence ce
      JOIN claims c ON c.claim_id = ce.claim_id LIMIT 1
    `.execute(db());
    expect(stored.rows[0]?.hash).toBe(evidenceSetHash(evidence.rows.map((r) => r.id)));
  });

  it("projects provenance from persisted values only (AC-15/AC-16)", async () => {
    await importBoth();
    const result = await deriveCurrentPopulation(db(), surnameInMaleOnly());
    if (result.kind !== "RESULT") throw new Error("expected a result");
    const citation = result.current_population[0]?.citation;

    expect(citation?.title).toBe("Nazwiska występujące w rejestrze PESEL");
    expect(citation?.publisher).toBe("Ministerstwo Cyfryzacji");
    expect(citation?.publication_date).toBe("2026-01-20");
    expect(citation?.terms_version).toBe("CC0 1.0");
    expect(citation?.supporting_locator).toMatch(/^resource:\d+$/u);
    expect(citation?.accessed_at).toContain("2026-09-18");

    const stored = await sql<{ title: string; url: string }>`
      SELECT title, url_or_reference AS url FROM citations LIMIT 1
    `.execute(db());
    expect(stored.rows[0]?.title).toBe(citation?.title);
    expect(stored.rows[0]?.url).toBe(citation?.url_or_reference);
  });

  it("exposes surface eligibility without touching confidence (AC-14/AC-17)", async () => {
    await importBoth();
    const normal = await deriveCurrentPopulation(db(), surnameInMaleOnly());
    if (normal.kind !== "RESULT") throw new Error("expected a result");

    const decisions = Object.fromEntries(
      normal.surface_eligibility.map((e) => [e.surface, e.decision]),
    );
    expect(decisions).toEqual({
      INTERNAL: "ALLOWED",
      FREE: "ALLOWED",
      PAID: "ALLOWED",
      SEO: "ALLOWED",
    });

    // Re-derive under a RESTRICTIVE rights posture. Since D-007 the seeded
    // profile is permissive, so the non-vacuous direction of
    // ARCHITECTURE.md §10 invariant 2 is now this one: a prohibition must
    // not LOWER confidence, just as a permissive licence must not raise it.
    const restrictive = await deriveCurrentPopulation(db(), surnameInMaleOnly(), {
      rightsOverride: {
        automated_access: "ALLOWED",
        commercial_use: "PROHIBITED",
        redistribution: "PROHIBITED",
        metadata_rights: "ALLOWED",
        review_status: "CONDITIONAL",
      },
    });
    if (restrictive.kind !== "RESULT") throw new Error("expected a result");

    expect(restrictive.current_population[0]?.confidence).toEqual(
      normal.current_population[0]?.confidence,
    );
    // ...while the surfaces close, proving the comparison is not vacuous.
    expect(restrictive.surface_eligibility.map((e) => e.decision)).toEqual([
      "ALLOWED",
      "CONDITIONAL",
      "BLOCKED",
      "BLOCKED",
    ]);
    expect(restrictive.surface_eligibility).not.toEqual(normal.surface_eligibility);
  });

  it("fails closed on a violated source invariant rather than publishing a number", async () => {
    await importBoth();
    // Force the invariant break directly: a count below the source's
    // confirmed minimum of 2. SYNTHETIC corruption of one row.
    await sql`
      ALTER TABLE distribution_values DROP CONSTRAINT distribution_values_count_positive
    `.execute(db());
    await sql`UPDATE distribution_values SET count = 0`.execute(db());

    await expect(deriveCurrentPopulation(db(), surnameInMaleOnly())).rejects.toThrow(
      /violates the source's confirmed minimum/u,
    );
    expect(await countOf("claims")).toBe(0);
  });

  it("detects conflicting active claims instead of choosing one", async () => {
    await importBoth();
    await deriveCurrentPopulation(db(), surnameInMaleOnly());

    // SYNTHETIC: duplicate the active claim, bypassing the partial unique
    // index, to prove the service notices rather than silently picking.
    await sql`DROP INDEX claims_active_claim_key_uq`.execute(db());
    await sql`
      INSERT INTO claims (claim_id, claim_key, claim_type, epistemic_type, scope,
                          subject_entity_id, structured_value, claim_status,
                          created_by_run_id, method_version)
      SELECT gen_random_uuid(), claim_key, claim_type, epistemic_type, scope,
             subject_entity_id, structured_value, claim_status,
             created_by_run_id, method_version
      FROM claims LIMIT 1
    `.execute(db());

    await expect(deriveCurrentPopulation(db(), surnameInMaleOnly())).rejects.toThrow(
      /active claims share claim_key/u,
    );
  });

  describe("data-integrity invariants after a full import and derivation (TASK-005 §9)", () => {
    beforeEach(async () => {
      await importBoth();
      await deriveCurrentPopulation(db(), surnameInBothFixtures());
      await deriveCurrentPopulation(db(), surnameInMaleOnly());
    });

    async function scalar(query: ReturnType<typeof sql<{ n: string }>>): Promise<string> {
      return (await query.execute(db())).rows[0]?.n ?? "";
    }

    it("2. every claim has at least one SUPPORTS relationship", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM claims c
          WHERE NOT EXISTS (
            SELECT 1 FROM claim_evidence ce
            WHERE ce.claim_id = c.claim_id AND ce.relationship = 'SUPPORTS'
          )
        `),
      ).toBe("0");
    });

    it("3/4. every support refers to persisted evidence with a persisted source record", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM claim_evidence ce
          LEFT JOIN evidence_items e ON e.evidence_item_id = ce.evidence_item_id
          LEFT JOIN source_records r ON r.source_record_id = e.source_record_id
          WHERE e.evidence_item_id IS NULL OR r.source_record_id IS NULL
        `),
      ).toBe("0");
    });

    it("5. a claim never cites another surname's evidence", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM claims c
          JOIN claim_evidence ce ON ce.claim_id = c.claim_id
          JOIN evidence_items e ON e.evidence_item_id = ce.evidence_item_id
          WHERE e.subject_entity_id IS DISTINCT FROM c.subject_entity_id
        `),
      ).toBe("0");
    });

    it("6. every claim payload carries a snapshot date and dataset scope", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM claims
          WHERE structured_value->>'snapshot_date' IS NULL
             OR structured_value->>'country_code' IS NULL
             OR structured_value->>'source_population_scope' IS NULL
        `),
      ).toBe("0");
    });

    it("7. no claim carries a count of zero, null or negative", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM claims
          WHERE (structured_value->>'count') IS NULL
             OR (structured_value->>'count')::bigint < 2
        `),
      ).toBe("0");
    });

    it("8. claim_key is unique among active claims", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM (
            SELECT claim_key FROM claims WHERE claim_status = 'ACTIVE'
            GROUP BY claim_key HAVING count(*) > 1
          ) dup
        `),
      ).toBe("0");
    });

    it("10. exactly one assessment per claim, and its hash matches its evidence", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM (
            SELECT claim_id FROM confidence_assessments
            GROUP BY claim_id HAVING count(*) <> 1
          ) bad
        `),
      ).toBe("0");

      const rows = await sql<{ claim_id: string; hash: string; ids: string[] }>`
        SELECT ca.claim_id, ca.evidence_set_hash AS hash,
               array_agg(ce.evidence_item_id::text ORDER BY ce.evidence_item_id::text) AS ids
        FROM confidence_assessments ca
        JOIN claim_evidence ce ON ce.claim_id = ca.claim_id
        GROUP BY ca.claim_id, ca.evidence_set_hash
      `.execute(db());
      expect(rows.rows.length).toBeGreaterThan(0);
      for (const row of rows.rows) {
        expect(row.hash).toBe(evidenceSetHash(row.ids));
      }
    });

    it("12. every citation's rights profile is the one in force for its source", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM citations c
          JOIN sources s ON s.source_id = c.source_id
          WHERE c.rights_profile_id <> s.default_rights_profile_id
        `),
      ).toBe("0");
    });

    it("13. every truth-layer primary key is a UUIDv7", async () => {
      const { isUuidV7 } = await import("@name-atlas/domain");
      const ids = await sql<{ id: string }>`
        SELECT claim_id AS id FROM claims
        UNION ALL SELECT evidence_item_id FROM evidence_items
        UNION ALL SELECT confidence_assessment_id FROM confidence_assessments
        UNION ALL SELECT citation_id FROM citations
        UNION ALL SELECT research_run_id FROM research_runs
      `.execute(db());
      expect(ids.rows.length).toBeGreaterThan(0);
      for (const row of ids.rows) expect(isUuidV7(row.id)).toBe(true);
    });

    it("every run records its lineage, with genuinely empty M1 manifests", async () => {
      const runs = await sql<{
        status: string;
        prompt: string;
        model: string;
        workflow: string;
      }>`
        SELECT run_status::text AS status, prompt_manifest::text AS prompt,
               model_manifest::text AS model, workflow_version AS workflow
        FROM research_runs
      `.execute(db());
      expect(runs.rows.length).toBeGreaterThan(0);
      for (const run of runs.rows) {
        expect(run.status).toBe("COMPLETE");
        // D-009: empty because no prompt and no model exist at M1.
        expect(run.prompt).toBe("{}");
        expect(run.model).toBe("{}");
        expect(run.workflow.length).toBeGreaterThan(0);
      }
    });

    it("creates no table this task excluded (TASK-005 §8)", async () => {
      const tables = await sql<{ table_name: string }>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `.execute(db());
      const names = tables.rows.map((r) => r.table_name);
      // `evidence_dependencies` was on this list until TASK-009. It is not a
      // TASK-005 table and TASK-005 still creates none of the lineage rows;
      // D-011 resolved that a derived claim needs the lineage
      // docs/canonical/14 §30 specifies, because a rank has two
      // differently-roled inputs, so migration 0005 owns the table. The
      // invariant this test protects — TASK-005 built no more than its own
      // slice — is unchanged, and `tests/integration/src/current-rank.test.ts`
      // asserts the table's shape.
      // `places` left this list at TASK-011, which owns the voivodeship Place
      // foundation. What TASK-005 must still not do is touch it: the assertion
      // below checks the table is empty and no value carries a place, which is
      // the property that actually mattered.
      // `runtime_outbox` left this list at TASK-020, which owns the
      // asynchronous runtime ADR-0001 deferred to M3. What TASK-005 must still
      // not do is use it: the assertion below checks it holds no row, which is
      // the property that actually mattered — a synchronous derivation enqueues
      // nothing.
      for (const forbidden of [
        "digital_assets",
        "research_module_runs",
        "surface_eligibility_assessments",
      ]) {
        expect(names).not.toContain(forbidden);
      }
      const outbox = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM runtime_outbox
      `.execute(db());
      expect(outbox.rows[0]?.n).toBe("0");

      const geographic = await sql<{ places: string; placed_values: string }>`
        SELECT (SELECT count(*)::text FROM places)                                  AS places,
               (SELECT count(*)::text FROM distribution_values WHERE place_id IS NOT NULL) AS placed_values
      `.execute(db());
      expect(geographic.rows[0]).toEqual({ places: "0", placed_values: "0" });
    });
  });
});
