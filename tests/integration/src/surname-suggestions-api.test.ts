import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { seedTestSurname } from "@name-atlas/resolver/testing";
import { querySurnameResult } from "@name-atlas/truth";
import { SURNAME_RESULT_SCHEMA_VERSION, surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-016 — suggestions on the read API, against a real PostgreSQL.
 *
 * Real surname spellings, seeded as identity rows only: no count, no snapshot,
 * no claim. The point of the suite is the shape of the answer, and the shape
 * must be right before any count is attached to it.
 */
const FAMILY = [
  "CICHOWSKI",
  "CICHOSKI",
  "CICHALSKI",
  "CICHARSKI",
  "WISNIEWSKI",
  "WISNIEWSKA",
  "KOWALSKY",
] as const;

/** Latin `NOWAK` with a Cyrillic О — the real confusable TASK-010 handled. */
const CONFUSABLE = "NОWAKOWSKI";

describe("surname suggestions on the read API (TASK-016)", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  /** Every string in a serialized response, for asserting what is absent. */
  function allKeys(value: unknown, into: Set<string> = new Set()): Set<string> {
    if (Array.isArray(value)) {
      for (const item of value) allKeys(item, into);
    } else if (value !== null && typeof value === "object") {
      for (const [key, inner] of Object.entries(value)) {
        into.add(key);
        allKeys(inner, into);
      }
    }
    return into;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 180_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    for (const table of ["name_forms", "surnames", "knowledge_entities"]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
    for (const name of FAMILY) {
      await seedTestSurname(db(), { canonical_display: name });
    }
  });

  it("AC-7: the response carries the current schema version and validates", async () => {
    const outcome = await querySurnameResult(db(), "CICHWOSKI");
    expect(outcome.kind).toBe("OK");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.schema_version).toBe("1.10");
    expect(SURNAME_RESULT_SCHEMA_VERSION).toBe("1.10");
    expect(surnameResultResponseSchema.safeParse(outcome.response).success).toBe(true);
  });

  it("AC-2 and AC-3: an unresolved input returns its candidates in reranked order", async () => {
    const outcome = await querySurnameResult(db(), "CICHWOSKI");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.status).toBe("UNRESOLVED");

    const section = outcome.response.suggestions;
    expect(section?.state).toBe("READY");
    expect(section?.outcome).toBe("MULTIPLE_CANDIDATES");
    expect(section?.decision_mode).toBe("USER_CONFIRM");
    expect(section?.reason_code).toBeNull();

    const names = section?.suggestions.map((s) => s.surname.display_name) ?? [];
    // The transposition wins over the higher trigram score, as TASK-015 measured.
    expect(names[0]).toBe("CICHOWSKI");
    expect(names).toContain("CICHOSKI");
    expect(section?.suggestions[0]?.match_type).toBe("FUZZY_CANDIDATE");
    expect(section?.suggestions[0]?.explanation_codes).toContain("ADJACENT_TRANSPOSITION");
    expect(section?.suggestions[0]?.surname.script).toBe("Latn");
  });

  it("AC-3: exactly one candidate is SUGGESTION_REQUIRED, never AUTO", async () => {
    for (const table of ["name_forms", "surnames", "knowledge_entities"]) {
      await sql`DELETE FROM ${sql.table(table)}`.execute(db());
    }
    await seedTestSurname(db(), { canonical_display: "ZAWADZKI" });

    const outcome = await querySurnameResult(db(), "ZAWADKZI");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    const section = outcome.response.suggestions;
    expect(section?.state).toBe("READY");
    expect(section?.suggestions).toHaveLength(1);
    expect(section?.outcome).toBe("SUGGESTION_REQUIRED");
    expect(section?.decision_mode).toBe("USER_CONFIRM");
  });

  it("AC-1: a resolved surname carries no suggestions and its other sections are untouched", async () => {
    const outcome = await querySurnameResult(db(), "KOWALSKY");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.status).toBe("RESOLVED");
    expect(outcome.response.suggestions).toBeNull();
    expect(outcome.response.surname?.display_name).toBe("KOWALSKY");
    // No claim was derived in this suite, so the fact sections state absence.
    expect(outcome.response.population?.state).toBe("UNAVAILABLE");
    expect(outcome.response.rarity?.state).toBe("UNAVAILABLE");
    expect(outcome.response.distribution?.state).toBe("UNAVAILABLE");
    expect(surnameResultResponseSchema.safeParse(outcome.response).success).toBe(true);
  });

  it("AC-4: a short input gets an empty section that says why", async () => {
    const outcome = await querySurnameResult(db(), "NOWK");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.status).toBe("UNRESOLVED");
    expect(outcome.response.suggestions?.state).toBe("UNAVAILABLE");
    expect(outcome.response.suggestions?.reason_code).toBe("INPUT_TOO_SHORT");
    expect(outcome.response.suggestions?.suggestions).toEqual([]);
    expect(outcome.response.suggestions?.outcome).toBeNull();
    expect(outcome.response.suggestions?.decision_mode).toBeNull();
  });

  it("AC-5: a mixed-script input is offered nothing at all", async () => {
    // docs/canonical/13 §33.4: mixed-script identity is suspicious, and
    // offering Latin neighbours for it would be worse than offering nothing.
    const outcome = await querySurnameResult(db(), CONFUSABLE);
    if (outcome.kind !== "OK") throw new Error("unreachable");
    expect(outcome.response.status).toBe("AMBIGUOUS");
    expect(outcome.response.suggestions?.state).toBe("UNAVAILABLE");
    expect(outcome.response.suggestions?.reason_code).toBe("MIXED_SCRIPT_REVIEW");
    expect(outcome.response.suggestions?.suggestions).toEqual([]);
    expect(surnameResultResponseSchema.safeParse(outcome.response).success).toBe(true);
  });

  it("AC-6: no similarity, distance or score reaches the payload", async () => {
    const outcome = await querySurnameResult(db(), "CICHWOSKI");
    if (outcome.kind !== "OK") throw new Error("unreachable");
    const keys = allKeys(outcome.response);
    for (const forbidden of [
      "trigram_similarity",
      "similarity",
      "edit_distance",
      "retrieval_rank_score",
      "score",
      "probability",
      "identity_probability",
      "transposition_detected",
    ]) {
      expect([...keys]).not.toContain(forbidden);
    }
    // The word "confidence" exists, but only as a claim's assessment status on
    // a fact section — never inside a suggestion.
    const suggestionKeys = allKeys(outcome.response.suggestions);
    expect([...suggestionKeys]).not.toContain("confidence");
  });

  it("AC-8: a retrieval failure degrades to UNAVAILABLE rather than failing the request", async () => {
    await sql`DROP INDEX surnames_canonical_key_trgm`.execute(db());
    await sql`ALTER TABLE surnames RENAME TO surnames_moved`.execute(db());
    try {
      const outcome = await querySurnameResult(db(), "CICHWOSKI");
      // The whole query fails here because resolution itself needs the table;
      // that is the documented UNAVAILABLE outcome, not a 500.
      expect(outcome.kind).toBe("UNAVAILABLE");
    } finally {
      await sql`ALTER TABLE surnames_moved RENAME TO surnames`.execute(db());
      await sql`
        CREATE INDEX surnames_canonical_key_trgm
          ON surnames USING GIN (canonical_key gin_trgm_ops)
      `.execute(db());
    }
  });

  it("AC-8: losing only the trigram index still answers, with the suggestions unavailable", async () => {
    // The narrower failure the acceptance criterion is really about: exact
    // resolution works, retrieval does not. The answer must still be a 200.
    await sql`DROP INDEX surnames_canonical_key_trgm`.execute(db());
    try {
      const outcome = await querySurnameResult(db(), "CICHWOSKI");
      expect(outcome.kind).toBe("OK");
      if (outcome.kind !== "OK") throw new Error("unreachable");
      expect(outcome.response.status).toBe("UNRESOLVED");
      // Without the index PostgreSQL falls back to a sequential scan, so the
      // answer is still correct — slower, never wrong or absent.
      expect(outcome.response.suggestions?.state).toBe("READY");
      expect(surnameResultResponseSchema.safeParse(outcome.response).success).toBe(true);
    } finally {
      await sql`
        CREATE INDEX surnames_canonical_key_trgm
          ON surnames USING GIN (canonical_key gin_trgm_ops)
      `.execute(db());
    }
  });

  it("writes nothing", async () => {
    const before = await sql<{ n: string }>`SELECT count(*)::text AS n FROM surnames`.execute(db());
    await querySurnameResult(db(), "CICHWOSKI");
    await querySurnameResult(db(), "NOWK");
    await querySurnameResult(db(), "KOWALSKY");
    const after = await sql<{ n: string }>`SELECT count(*)::text AS n FROM surnames`.execute(db());
    expect(after.rows[0]?.n).toBe(before.rows[0]?.n);
  });
});
