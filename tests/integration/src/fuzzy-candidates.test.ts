import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  MIN_FUZZY_INPUT_LENGTH,
  RERANKED_CAP,
  resolveSurname,
  SHORTLIST_CAP,
  suggestSurnames,
  thresholdForLength,
} from "@name-atlas/resolver";
import { seedTestSurname } from "@name-atlas/resolver/testing";
import {
  deriveCurrentDistribution,
  deriveCurrentPopulation,
  deriveCurrentRank,
  deriveRarityContext,
} from "@name-atlas/truth";

/**
 * TASK-015 — fuzzy candidate retrieval against a real PostgreSQL.
 *
 * Every surname below is a **real Polish surname spelling**, seeded as an
 * identity row only: no count, no snapshot, no claim, no citation. That is the
 * same device `canonical-key-v2.test.ts` uses for the sharp-s pairs, and it is
 * what lets the ranking be asserted deterministically rather than against the
 * full register, which is not committed.
 *
 * The inputs are the real typos: `CICHWOSKI` for `CICHOWSKI` (one transposition),
 * `WISNIEWSKY` for a surname family with two equally near members, and `NOWK`,
 * which must return nothing at all.
 */

/** The `CICHOWSKI` neighbourhood as it exists in the register. */
const CICHO_FAMILY = [
  "CICHOWSKI",
  "CICHOSKI",
  "CICHALSKI",
  "CICHARSKI",
  "CICHEMSKI",
  "CICHERSKI",
  "CICHOLSKI",
  "CICHOMSKI",
] as const;

/** Two members equally near to `WISNIEWSKY`: canonical §33.4's "never auto-resolve". */
const WISNIEW_FAMILY = ["WISNIEWSKI", "WISNIEWSKA", "WISZNIEWSKI", "WISZNIEWSKA"] as const;

/** A real surname that is itself a near-miss spelling of two others (§32.3). */
const EXACT_TRAP = ["KOWALSKY", "KOWALSKI", "KOWALSKA"] as const;

/** Short surnames, to prove a short input is refused rather than served noise. */
const SHORT_NAMES = ["NOWAK", "NOWY", "NOWA", "NOWE", "NOWS"] as const;

describe("fuzzy candidate retrieval (TASK-015)", () => {
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
    for (const name of [...CICHO_FAMILY, ...WISNIEW_FAMILY, ...EXACT_TRAP, ...SHORT_NAMES]) {
      await seedTestSurname(db(), { canonical_display: name });
    }
  });

  it("AC-8: the trigram index exists and is the GIN one ADR-0006 chose", async () => {
    const rows = await sql<{ indexdef: string }>`
      SELECT indexdef FROM pg_indexes
      WHERE tablename = 'surnames' AND indexname = 'surnames_canonical_key_trgm'
    `.execute(db());
    expect(rows.rows).toHaveLength(1);
    expect(rows.rows[0]?.indexdef).toMatch(/USING gin/iu);
    expect(rows.rows[0]?.indexdef).toMatch(/gin_trgm_ops/u);
  });

  it("AC-1: an exact surname wins outright and is never offered a suggestion", async () => {
    // KOWALSKY is a real surname whose trigram neighbours include KOWALSKI and
    // KOWALSKA. docs/canonical/13 §32.3: the exact entity must win.
    const exact = await resolveSurname(db(), "KOWALSKY");
    expect(exact.kind).toBe("RESOLUTION");
    if (exact.kind !== "RESOLUTION") throw new Error("unreachable");
    expect(exact.resolution.resolution_status).toBe("EXACT");
    expect(exact.resolution.resolved_canonical_display).toBe("KOWALSKY");

    const suggested = await suggestSurnames(db(), "KOWALSKY");
    expect(suggested.kind).toBe("NO_SUGGESTIONS");
    if (suggested.kind !== "NO_SUGGESTIONS") throw new Error("unreachable");
    expect(suggested.reason).toBe("EXACT_MATCH_EXISTS");
  });

  it("AC-1: exact resolution behaviour is unchanged for every seeded surname", async () => {
    for (const name of [...CICHO_FAMILY, ...WISNIEW_FAMILY, ...EXACT_TRAP]) {
      const outcome = await resolveSurname(db(), name);
      expect(outcome.kind).toBe("RESOLUTION");
      if (outcome.kind !== "RESOLUTION") throw new Error("unreachable");
      expect(outcome.resolution.resolution_status).toBe("EXACT");
      expect(outcome.resolution.resolved_canonical_display).toBe(name);
    }
  });

  it("AC-3: CICHOWSKI is ranked first although trigram prefers CICHOSKI", async () => {
    // The headline behaviour. CICHWOSKI is one edit from both; trigram scores
    // CICHOSKI higher (0.583 against 0.429) and is wrong. The transposition
    // rule fixes it.
    const result = await suggestSurnames(db(), "CICHWOSKI");
    expect(result.kind).toBe("SUGGESTIONS");
    if (result.kind !== "SUGGESTIONS") throw new Error("unreachable");

    const forms = result.candidates.map((c) => c.generated_form);
    expect(forms.slice(0, 3)).toContain("CICHOWSKI");
    expect(forms[0]).toBe("CICHOWSKI");

    const first = result.candidates[0];
    expect(first?.features.transposition_detected).toBe(true);
    expect(first?.features.edit_distance).toBe(1);
    expect(first?.explanation_codes).toContain("ADJACENT_TRANSPOSITION");

    // And the one trigram would have put first is still offered, just lower.
    const cichoski = result.candidates.find((c) => c.generated_form === "CICHOSKI");
    expect(cichoski?.features.edit_distance).toBe(1);
    expect(cichoski?.features.transposition_detected).toBe(false);
    expect(cichoski?.features.trigram_similarity).toBeGreaterThan(
      first?.features.trigram_similarity ?? 1,
    );
  });

  it("AC-4: WISNIEWSKY returns both near members and resolves to neither", async () => {
    const exact = await resolveSurname(db(), "WISNIEWSKY");
    expect(exact.kind).toBe("RESOLUTION");
    if (exact.kind !== "RESOLUTION") throw new Error("unreachable");
    expect(exact.resolution.resolution_status).toBe("UNKNOWN");
    expect(exact.resolution.resolved_surname_id).toBeNull();

    const result = await suggestSurnames(db(), "WISNIEWSKY");
    expect(result.kind).toBe("SUGGESTIONS");
    if (result.kind !== "SUGGESTIONS") throw new Error("unreachable");
    const forms = result.candidates.map((c) => c.generated_form);
    expect(forms).toContain("WISNIEWSKI");
    expect(forms).toContain("WISNIEWSKA");
    expect(result.outcome).toBe("MULTIPLE_CANDIDATES");
    // §33.4: never auto-resolve when two strong candidates exist.
    expect(result.decision_mode).toBe("USER_CONFIRM");
    expect(result).not.toHaveProperty("resolved_surname_id");
  });

  it("AC-5: a short input gets no suggestions at all, not an alphabet walk", async () => {
    // NOWK's nearest real surnames are NOWS, NOWY, NOWE and NOWA, all seeded
    // above and all equally near. None is a correction worth showing.
    const result = await suggestSurnames(db(), "NOWK");
    expect(result.kind).toBe("NO_SUGGESTIONS");
    if (result.kind !== "NO_SUGGESTIONS") throw new Error("unreachable");
    expect(result.reason).toBe("INPUT_TOO_SHORT");
    expect(result.similarity_threshold).toBeNull();

    for (let length = 1; length < MIN_FUZZY_INPUT_LENGTH; length += 1) {
      expect(thresholdForLength(length)).toBeNull();
    }
  });

  it("AC-6: the reranked list is capped, and the cap is honoured against a large match set", async () => {
    // 40 near variants of one long base name, so the unfiltered match set is
    // well beyond both caps.
    const base = "ZABRZEZINSKI";
    for (let i = 0; i < 40; i += 1) {
      const suffix = String.fromCodePoint(97 + (i % 26)) + String(Math.floor(i / 26));
      await seedTestSurname(db(), { canonical_display: `${base}${suffix}` });
    }
    const result = await suggestSurnames(db(), `${base}XY`);
    expect(result.kind).toBe("SUGGESTIONS");
    if (result.kind !== "SUGGESTIONS") throw new Error("unreachable");
    expect(result.shortlist_size).toBeLessThanOrEqual(SHORTLIST_CAP);
    expect(result.candidates.length).toBeLessThanOrEqual(RERANKED_CAP);
    expect(result.candidates.length).toBeGreaterThan(1);

    const limited = await suggestSurnames(db(), `${base}XY`, { limit: 3 });
    if (limited.kind !== "SUGGESTIONS") throw new Error("unreachable");
    expect(limited.candidates).toHaveLength(3);
  });

  it("AC-7: every candidate explains itself, carries T4_FUZZY, and carries no confidence", async () => {
    const result = await suggestSurnames(db(), "CICHWOSKI");
    if (result.kind !== "SUGGESTIONS") throw new Error("unreachable");
    expect(result.candidates.length).toBeGreaterThan(0);

    for (const candidate of result.candidates) {
      expect(candidate.tier).toBe("T4_FUZZY");
      expect(candidate.method).toBe("FUZZY");
      expect(candidate.method_version).toBe("resolver_fuzzy_v1");
      expect(candidate.search_only).toBe(true);
      expect(candidate.explanation_codes.length).toBeGreaterThan(0);
      expect(candidate.retrieval_rank_score).toBeGreaterThan(0);

      // §25.3: a retrieval feature is never a confidence or a probability.
      const keys = [...Object.keys(candidate), ...Object.keys(candidate.features)];
      for (const forbidden of ["confidence", "probability", "identity_probability", "likelihood"]) {
        expect(keys).not.toContain(forbidden);
      }
      // §24: a field this stage cannot measure is absent, never false.
      expect(Object.keys(candidate.features)).not.toContain("phonetic_overlap");
      expect(Object.keys(candidate.features)).not.toContain("language_pack_compatible");
      expect(candidate.features.exact_canonical).toBe(false);
      expect(candidate.features.same_primary_script).toBe(true);
    }
  });

  it("AC-2: no fuzzy candidate can reach any of the four derivations", async () => {
    // A fuzzily-matchable input must produce no claim from any chain. The
    // derivations require EXACT and this asserts they still do.
    const before = await sql<{ n: string }>`SELECT count(*)::text AS n FROM claims`.execute(db());
    for (const derive of [
      deriveCurrentPopulation,
      deriveCurrentRank,
      deriveRarityContext,
      deriveCurrentDistribution,
    ]) {
      const result = await derive(db(), "CICHWOSKI");
      expect(result.kind).toBe("NO_RESULT");
      if (result.kind !== "NO_RESULT") throw new Error("unreachable");
      expect(["UNRESOLVED", "NO_APPLICABLE_EVIDENCE"]).toContain(result.reason);
      expect(result.surname).toBeNull();
    }
    const after = await sql<{ n: string }>`SELECT count(*)::text AS n FROM claims`.execute(db());
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
    expect(Number(after.rows[0]?.n)).toBe(0);
  });

  it("writes nothing: the whole suite leaves the surname count unchanged", async () => {
    const before = await sql<{ n: string }>`SELECT count(*)::text AS n FROM surnames`.execute(db());
    await suggestSurnames(db(), "CICHWOSKI");
    await suggestSurnames(db(), "WISNIEWSKY");
    await suggestSurnames(db(), "NOWK");
    await suggestSurnames(db(), "KOWALSKY");
    const after = await sql<{ n: string }>`SELECT count(*)::text AS n FROM surnames`.execute(db());
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
    // And no name_form was materialised for a generated candidate (§18.2).
    const forms = await sql<{ n: string }>`SELECT count(*)::text AS n FROM name_forms`.execute(
      db(),
    );
    expect(forms.rows[0]?.n).toBe("0");
  });

  it("returns a typed failure rather than an empty list when retrieval breaks", async () => {
    // The distinction TASK-003 §8 item 19 established for exact lookup: an
    // outage is never "this surname has no near matches".
    await sql`DROP INDEX surnames_canonical_key_trgm`.execute(db());
    await sql`ALTER TABLE surnames RENAME TO surnames_moved`.execute(db());
    try {
      const result = await suggestSurnames(db(), "CICHWOSKI");
      expect(result.kind).toBe("LOOKUP_FAILED");
    } finally {
      await sql`ALTER TABLE surnames_moved RENAME TO surnames`.execute(db());
      await sql`
        CREATE INDEX surnames_canonical_key_trgm
          ON surnames USING GIN (canonical_key gin_trgm_ops)
      `.execute(db());
    }
  });
});
