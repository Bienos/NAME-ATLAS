import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  importOnomasticSource,
  importPeselResource,
  PESEL_NATIONAL_MALE_2026,
  sha256Hex,
} from "@name-atlas/sources";
import {
  deriveCurrentPopulation,
  deriveSurnameMeaning,
  querySurnameResult,
  readSurnameMeaning,
  surnameMeaningClaimKey,
} from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-022 — the `SURNAME_MEANING` chain against a real PostgreSQL.
 *
 * SYNTHETIC MEANING DATA, GENUINE SURNAMES. The surnames come from TASK-004's
 * importer over the committed real PESEL fixture. The *meanings* come from
 * `fixtures/onomastics/`, where every value is a placeholder and both files
 * carry `"synthetic": true` — see that directory's README. Nothing in this file
 * asserts anything about the origin of a Polish surname.
 *
 * The property that needs a real database rather than a unit test: that zero
 * admissible works produce **zero claims** and a stated gap, that one produces
 * `POSSIBLE`, that two agreeing produce `LIKELY`, that two disagreeing produce
 * `CONFLICTING` with both readings retained, and that re-derivation adds
 * nothing.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readBytes = (p: string): Uint8Array => readFileSync(path.join(repoRoot, p));
const MALE_BYTES = readBytes("fixtures/pesel/national-male-2026-01-20.csv");
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
const WORK_A = readBytes("fixtures/onomastics/synthetic-test-work.json");
const WORK_B = readBytes("fixtures/onomastics/synthetic-test-work-b.json");

describe("SURNAME_MEANING against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function count(table: string, where = "TRUE"): Promise<number> {
    const r = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM ${sql.table(table)} WHERE ${sql.raw(where)}
    `.execute(db());
    return Number(r.rows[0]?.n ?? "0");
  }

  async function surnameIdOf(display: string): Promise<string> {
    const r = await sql<{ surname_id: string }>`
      SELECT surname_id::text FROM surnames WHERE canonical_display = ${display}
    `.execute(db());
    const id = r.rows[0]?.surname_id;
    if (!id) throw new Error(`${display} is not in the imported fixture`);
    return id;
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
    if (outcome.kind !== "IMPORTED") {
      throw new Error(`fixture import did not succeed: ${outcome.kind}`);
    }
  });

  describe("AC-4: a synthetic file cannot be imported by accident", () => {
    it("refuses without allowSynthetic, and writes nothing", async () => {
      const before = await count("sources");
      const outcome = await importOnomasticSource(db(), { bytes: WORK_A });
      expect(outcome.kind).toBe("REFUSED");
      if (outcome.kind !== "REFUSED") return;
      expect(outcome.reason_code).toBe("SYNTHETIC_SOURCE_NOT_ALLOWED");
      expect(await count("sources")).toBe(before);
    });

    it("imports with allowSynthetic, and is idempotent on identical bytes", async () => {
      const first = await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      expect(first.kind).toBe("IMPORTED");
      if (first.kind !== "IMPORTED") return;
      expect(first.entries).toBe(2);

      const second = await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      expect(second.kind).toBe("ALREADY_IMPORTED");
      if (second.kind !== "ALREADY_IMPORTED") return;
      expect(second.source_record_id).toBe(first.source_record_id);
      expect(await count("source_records", "record_type = 'ARTICLE'")).toBe(1);
    });
  });

  describe("AC-1: no admissible work means no claim and a stated gap", () => {
    it("derives nothing, and says so", async () => {
      const result = await deriveSurnameMeaning(db(), "KOWALCZYK");
      expect(result.kind).toBe("RESULT");
      if (result.kind !== "RESULT") return;
      expect(result.meaning).toBeNull();
      expect(await count("claims", "claim_type = 'SURNAME_MEANING'")).toBe(0);
    });

    it("reports NO_SOURCED_MEANING on the read contract, not an omitted field", async () => {
      const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
      expect(outcome.kind).toBe("OK");
      if (outcome.kind !== "OK") return;
      const parsed = surnameResultResponseSchema.parse(outcome.response);
      expect(parsed.meaning).not.toBeNull();
      expect(parsed.meaning?.state).toBe("NO_SOURCED_MEANING");
      expect(parsed.meaning?.reason_code).toBe("NO_ADMISSIBLE_ONOMASTIC_SOURCE");
      expect(parsed.meaning?.interpretations).toEqual([]);
      expect(parsed.meaning?.confidence).toBeNull();
    });
  });

  describe("AC-2: confidence follows the works, and disagreement is kept", () => {
    it("one work yields POSSIBLE", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      const result = await deriveSurnameMeaning(db(), "KOWALCZYK");
      if (result.kind !== "RESULT" || !result.meaning) throw new Error("expected a claim");
      expect(result.meaning.confidence_status).toBe("POSSIBLE");
      expect(result.meaning.interpretations).toHaveLength(1);
    });

    it("two agreeing works yield LIKELY", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await importOnomasticSource(db(), { bytes: WORK_B, allowSynthetic: true });
      const result = await deriveSurnameMeaning(db(), "KOWALCZYK");
      if (result.kind !== "RESULT" || !result.meaning) throw new Error("expected a claim");
      expect(result.meaning.confidence_status).toBe("LIKELY");
      expect(result.meaning.interpretations).toHaveLength(2);
    });

    it("two disagreeing works yield CONFLICTING, retaining both readings", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await importOnomasticSource(db(), { bytes: WORK_B, allowSynthetic: true });
      const result = await deriveSurnameMeaning(db(), "NOWAK");
      if (result.kind !== "RESULT" || !result.meaning) throw new Error("expected a claim");
      expect(result.meaning.confidence_status).toBe("CONFLICTING");
      const roots = result.meaning.interpretations.map((i) => i.root_form).sort();
      expect(roots).toEqual(["PLACEHOLDER-ROOT-2", "PLACEHOLDER-ROOT-DIFFERENT"]);
    });

    it("matches a work's own casing through the resolver's canonical key", async () => {
      // Work B spells the entry `kowalczyk`. It must still match.
      await importOnomasticSource(db(), { bytes: WORK_B, allowSynthetic: true });
      const result = await deriveSurnameMeaning(db(), "KOWALCZYK");
      if (result.kind !== "RESULT" || !result.meaning) throw new Error("expected a claim");
      expect(result.meaning.interpretations).toHaveLength(1);
    });

    it("never assesses a meaning VERIFIED", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await importOnomasticSource(db(), { bytes: WORK_B, allowSynthetic: true });
      for (const surname of ["KOWALCZYK", "NOWAK"]) {
        const result = await deriveSurnameMeaning(db(), surname);
        if (result.kind !== "RESULT" || !result.meaning) continue;
        expect(result.meaning.confidence_status).not.toBe("VERIFIED");
      }
    });
  });

  describe("AC-7: re-derivation is idempotent", () => {
    it("creates no second live claim, and no second evidence set", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      const first = await deriveSurnameMeaning(db(), "KOWALCZYK");
      const evidenceAfterFirst = await count(
        "evidence_items",
        "evidence_type = 'SCHOLARLY_SOURCE'",
      );
      const second = await deriveSurnameMeaning(db(), "KOWALCZYK");

      if (first.kind !== "RESULT" || second.kind !== "RESULT") throw new Error("expected results");
      expect(second.meaning?.claim_id).toBe(first.meaning?.claim_id);
      expect(await count("claims", "claim_type = 'SURNAME_MEANING'")).toBe(1);
      expect(await count("evidence_items", "evidence_type = 'SCHOLARLY_SOURCE'")).toBe(
        evidenceAfterFirst,
      );
    });

    it("keys the claim by surname alone", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");
      const expected = surnameMeaningClaimKey(await surnameIdOf("KOWALCZYK"));
      expect(await count("claims", `claim_key = '${expected}'`)).toBe(1);
    });
  });

  describe("AC-8: every work is cited with its locator", () => {
    it("writes one citation per work, carrying the page reference", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await importOnomasticSource(db(), { bytes: WORK_B, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");

      const citations = await sql<{ locator: string | null; title: string }>`
        SELECT cit.supporting_locator AS locator, cit.title AS title
        FROM citations cit
        JOIN claims c ON c.claim_id = cit.claim_id
        WHERE c.claim_type = 'SURNAME_MEANING'
        ORDER BY cit.title
      `.execute(db());
      expect(citations.rows).toHaveLength(2);
      expect(citations.rows.map((r) => r.locator)).toEqual(["p. 1, entry 1", "p. 44, col. 2"]);
      expect(citations.rows[0]?.title).toMatch(/Synthetic Test Work A/u);
    });

    it("links every evidence item to the claim and records its locator", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");
      const evidence = await sql<{ locator: string | null; status: string }>`
        SELECT ei.supporting_locator AS locator, ei.verification_status::text AS status
        FROM evidence_items ei
        JOIN claim_evidence ce ON ce.evidence_item_id = ei.evidence_item_id
        JOIN claims c ON c.claim_id = ce.claim_id
        WHERE c.claim_type = 'SURNAME_MEANING'
      `.execute(db());
      expect(evidence.rows).toHaveLength(1);
      expect(evidence.rows[0]?.locator).toBe("p. 1, entry 1");
      // Read out of a supplied file with no human review. Saying VERIFIED or
      // REVIEWED here would overstate what happened.
      expect(evidence.rows[0]?.status).toBe("MACHINE_EXTRACTED");
    });
  });

  describe("AC-5: rights close the surface without leaking the text", () => {
    it("omits every interpretation when the source's rights block the surface", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");

      // Block the work after the claim exists: the read path must refuse on the
      // rights in force now, not on those in force at derivation.
      await sql`
        UPDATE rights_profiles rp SET review_status = 'BLOCKED'
         FROM sources src
        WHERE src.default_rights_profile_id = rp.rights_profile_id
          AND src.source_type = 'DICTIONARY'
      `.execute(db());

      const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");
      const parsed = surnameResultResponseSchema.parse(outcome.response);
      expect(parsed.meaning?.state).toBe("RIGHTS_BLOCKED");
      expect(parsed.meaning?.interpretations).toEqual([]);
      // Not sent and marked hidden: absent from the payload entirely.
      expect(JSON.stringify(parsed)).not.toContain("PLACEHOLDER");
    });

    // Two agreeing works support KOWALCZYK, so the claim has two citations with
    // two rights profiles. Publishing the claim publishes both works' readings,
    // so blocking *either* must close the section. A gate that read only the
    // display citation would publish in one of these two cases, whichever work
    // that citation happened to be.
    it.each(["synthetic_test_onomastic_work_a", "synthetic_test_onomastic_work_b"])(
      "omits every interpretation when one of two supporting works is blocked (%s)",
      async (blockedSourceKey) => {
        await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
        await importOnomasticSource(db(), { bytes: WORK_B, allowSynthetic: true });
        await deriveSurnameMeaning(db(), "KOWALCZYK");

        await sql`
          UPDATE rights_profiles rp SET review_status = 'BLOCKED'
           FROM sources src
          WHERE src.default_rights_profile_id = rp.rights_profile_id
            AND src.source_key = ${blockedSourceKey}
        `.execute(db());
        // Exactly one of the two citations is now under a blocked profile.
        const blocked = await sql<{ n: string }>`
          SELECT count(*)::text AS n
            FROM citations cit
            JOIN claims c          ON c.claim_id = cit.claim_id
            JOIN rights_profiles rp ON rp.rights_profile_id = cit.rights_profile_id
           WHERE c.claim_type = 'SURNAME_MEANING' AND c.claim_status = 'ACTIVE'
           GROUP BY rp.review_status = 'BLOCKED'
           ORDER BY rp.review_status = 'BLOCKED'
        `.execute(db());
        expect(blocked.rows.map((r) => r.n)).toEqual(["1", "1"]);

        const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
        if (outcome.kind !== "OK") throw new Error("expected OK");
        const parsed = surnameResultResponseSchema.parse(outcome.response);
        expect(parsed.meaning?.state).toBe("RIGHTS_BLOCKED");
        expect(parsed.meaning?.interpretations).toEqual([]);
        expect(JSON.stringify(parsed)).not.toContain("PLACEHOLDER");
      },
    );

    it("keeps the meaning's rights independent of the register's", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveCurrentPopulation(db(), "KOWALCZYK");
      await deriveSurnameMeaning(db(), "KOWALCZYK");

      // Block PESEL, not the scholarly work. Population must close and the
      // meaning must stay open: different sources, different rights.
      await sql`
        UPDATE rights_profiles rp SET review_status = 'BLOCKED'
         FROM sources src
        WHERE src.default_rights_profile_id = rp.rights_profile_id
          AND src.source_type = 'OFFICIAL_DATASET'
      `.execute(db());

      const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");
      const parsed = surnameResultResponseSchema.parse(outcome.response);
      expect(parsed.population?.state).toBe("RIGHTS_BLOCKED");
      expect(parsed.meaning?.state).toBe("AVAILABLE");
    });
  });

  describe("AC-9: the read projection satisfies the contract", () => {
    it("carries the work, the locator and the confidence", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");

      const outcome = await querySurnameResult(db(), "KOWALCZYK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");
      const parsed = surnameResultResponseSchema.parse(outcome.response);
      expect(parsed.schema_version).toBe("1.10");
      expect(parsed.meaning?.state).toBe("AVAILABLE");
      expect(parsed.meaning?.confidence).toBe("POSSIBLE");

      const first = parsed.meaning?.interpretations[0];
      expect(first?.work.title).toMatch(/Synthetic Test Work A/u);
      expect(first?.work.year).toBe(1900);
      expect(first?.locator).toBe("p. 1, entry 1");
      expect(first?.formation_type).toBe("OCCUPATIONAL");
    });

    it("reads the claim back out of the database unchanged", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");
      const persisted = await readSurnameMeaning(db(), await surnameIdOf("KOWALCZYK"));
      expect(persisted).toHaveLength(1);
      expect(persisted[0]?.supporting_works).toBe(1);
      expect(persisted[0]?.works_agree).toBe(true);
      expect(persisted[0]?.agreement_basis).toMatch(/identical root_form and root_language/u);
    });

    it("leaves a surname with no meaning entry at the gap, even with a source imported", async () => {
      // WOJCIK is in the PESEL fixture and in neither synthetic work.
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      const present = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM surnames WHERE canonical_key = 'wójcik'
      `.execute(db());
      if (Number(present.rows[0]?.n ?? "0") === 0) return;

      const outcome = await querySurnameResult(db(), "WÓJCIK", { surface: "FREE" });
      if (outcome.kind !== "OK") throw new Error("expected OK");
      const parsed = surnameResultResponseSchema.parse(outcome.response);
      expect(parsed.meaning?.state).toBe("NO_SOURCED_MEANING");
    });
  });

  describe("the scope constraint holds in the schema", () => {
    it("refuses a SURNAME_MEANING claim that is not SURNAME_LEVEL", async () => {
      await importOnomasticSource(db(), { bytes: WORK_A, allowSynthetic: true });
      await deriveSurnameMeaning(db(), "KOWALCZYK");
      await expect(
        sql`
          UPDATE claims SET scope = 'PERSON_LEVEL'
           WHERE claim_type = 'SURNAME_MEANING'
        `.execute(db()),
      ).rejects.toThrow(/claims_surname_meaning_is_surname_level/u);
    });
  });
});
