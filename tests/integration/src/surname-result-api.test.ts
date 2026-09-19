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
import { deriveCurrentPopulation, querySurnameResult } from "@name-atlas/truth";
import { surnameResultResponseSchema } from "@name-atlas/contracts";

/**
 * TASK-006 §11 — the surname result read path against a real PostgreSQL,
 * over genuinely ingested and genuinely derived data.
 *
 * GENUINE: every test imports the committed PESEL fixtures through TASK-004's
 * importer and derives through TASK-005's service. Nothing is hand-inserted
 * into a distribution, claim or citation row.
 *
 * SYNTHETIC: identities seeded through `@name-atlas/resolver/testing`, and
 * any directly-modified row used to force a failure path. Not PESEL evidence.
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

/** Every table a read must leave untouched. */
const ALL_TABLES = [
  "knowledge_entities",
  "surnames",
  "name_forms",
  "rights_profiles",
  "sources",
  "source_records",
  "distribution_snapshots",
  "distribution_values",
  "research_runs",
  "evidence_items",
  "claims",
  "claim_evidence",
  "confidence_assessments",
  "citations",
] as const;

describe("surname result read API against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) throw new Error("test database was not started");
    return database.db;
  }

  async function countAll(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {};
    for (const table of ALL_TABLES) {
      const r = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM ${sql.table(table)}
      `.execute(db());
      counts[table] = Number(r.rows[0]?.n ?? "0");
    }
    return counts;
  }

  function fixtureSurnames(bytes: Uint8Array): string[] {
    return new TextDecoder()
      .decode(bytes)
      .split("\r\n")
      .slice(1)
      .filter((l) => l !== "")
      .map((l) => l.slice(0, l.lastIndexOf(",")));
  }

  const MALE_NAMES = fixtureSurnames(MALE_BYTES);
  const FEMALE_NAMES = new Set(fixtureSurnames(FEMALE_BYTES));

  function surnameInBoth(): string {
    const shared = MALE_NAMES.find((s) => FEMALE_NAMES.has(s));
    if (!shared) throw new Error("fixtures share no surname");
    return shared;
  }
  function surnameInMaleOnly(): string {
    const only = MALE_NAMES.find((s) => !FEMALE_NAMES.has(s));
    if (!only) throw new Error("no male-only surname");
    return only;
  }

  /** Import both fixtures and derive claims for the surnames under test. */
  async function seedRealData(): Promise<void> {
    const male = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
    });
    if (male.kind !== "IMPORTED") throw new Error("male import failed");
    const female = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_FEMALE_2026,
      bytes: FEMALE_BYTES,
      expectedSha256: sha256Hex(FEMALE_BYTES),
      rawPayload: FEMALE_PAYLOAD,
    });
    if (female.kind !== "IMPORTED") throw new Error("female import failed");
    await deriveCurrentPopulation(db(), surnameInBoth());
    await deriveCurrentPopulation(db(), surnameInMaleOnly());
    await deriveCurrentPopulation(db(), "WIŚNIEWSKI");
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

  it("returns a complete result for a known exact surname", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly());

    expect(outcome.kind).toBe("OK");
    if (outcome.kind !== "OK") return;
    const body = outcome.response;

    expect(body.status).toBe("RESOLVED");
    expect(body.surname?.display_name).toBe(surnameInMaleOnly().normalize("NFC"));
    expect(body.population?.state).toBe("READY");
    expect(body.population?.observations).toHaveLength(1);

    const observation = body.population?.observations[0];
    expect(observation?.value.status).toBe("KNOWN");
    expect(observation?.value.value).toBeGreaterThanOrEqual(2);
    expect(observation?.snapshot_date).toBe("2026-01-20");
    expect(observation?.country_code).toBe("PL");
  });

  it("serializes against the published contract schema", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly());
    if (outcome.kind !== "OK") throw new Error("expected OK");

    // Round-trip through JSON, exactly as the route handler would.
    const serialized: unknown = JSON.parse(JSON.stringify(outcome.response));
    const parsed = surnameResultResponseSchema.safeParse(serialized);
    expect(parsed.success).toBe(true);
  });

  it("carries the unit ADR-0004 fixes, never asserting PEOPLE", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly());
    if (outcome.kind !== "OK") throw new Error("expected OK");

    expect(outcome.response.population?.observations[0]?.value.unit).toBe("SURNAME_OCCURRENCES");
    expect(JSON.stringify(outcome.response)).not.toContain("PEOPLE");
  });

  it("returns two observations for a surname in both resources, and no total", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInBoth());
    if (outcome.kind !== "OK") throw new Error("expected OK");

    const observations = outcome.response.population?.observations ?? [];
    expect(observations).toHaveLength(2);

    const counts = observations.map((o) => o.value.value ?? 0);
    const sum = counts.reduce((a, b) => a + b, 0);
    // Nothing in the payload equals the sum — the two partitions are not
    // summable and the contract exposes no total.
    expect(JSON.stringify(outcome.response)).not.toContain(String(sum));
    // Different comparability groups are why.
    expect(new Set(observations.map((o) => o.comparability_group)).size).toBe(2);
  });

  it("resolves a case-equivalent surname to the same result", async () => {
    await seedRealData();
    const upper = await querySurnameResult(db(), "WIŚNIEWSKI");
    const lower = await querySurnameResult(db(), "wiśniewski");
    expect(lower).toEqual(upper);
  });

  it("does not resolve a diacritic-stripped spelling", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), "WISNIEWSKI");
    if (outcome.kind !== "OK") throw new Error("expected OK");
    expect(outcome.response.status).toBe("UNRESOLVED");
    expect(outcome.response.surname).toBeNull();
    expect(outcome.response.population).toBeNull();
  });

  it("returns UNRESOLVED for an unknown surname, never a zero", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), "Nieistniejące");
    if (outcome.kind !== "OK") throw new Error("expected OK");
    expect(outcome.response.status).toBe("UNRESOLVED");
    expect(JSON.stringify(outcome.response)).not.toContain('"value":0');
  });

  it("rejects invalid input as INVALID_INPUT, not as a result", async () => {
    await seedRealData();
    for (const input of ["", "   ", "a\u0000b"]) {
      const outcome = await querySurnameResult(db(), input);
      expect(outcome.kind).toBe("INVALID_INPUT");
    }
  });

  it("reports UNAVAILABLE for a resolved surname with no derived evidence", async () => {
    await seedRealData();
    // SYNTHETIC identity: resolvable, no PESEL evidence behind it.
    await seedTestSurname(db(), { canonical_display: "SyntheticNoEvidence" });

    const outcome = await querySurnameResult(db(), "SyntheticNoEvidence");
    if (outcome.kind !== "OK") throw new Error("expected OK");
    expect(outcome.response.status).toBe("RESOLVED");
    expect(outcome.response.population?.state).toBe("UNAVAILABLE");
    expect(outcome.response.population?.observations).toHaveLength(0);
    expect(outcome.response.population?.reason_code).toBe("NO_APPLICABLE_EVIDENCE");
    // Absence is not zero.
    expect(JSON.stringify(outcome.response)).not.toContain('"value":0');
  });

  it("omits values entirely when the surface is rights-blocked", async () => {
    await seedRealData();
    // The seeded PESEL profile has commercial_use = UNKNOWN, so the PAID
    // surface is blocked by docs/canonical/12 §6.4.
    const outcome = await querySurnameResult(db(), surnameInMaleOnly(), { surface: "PAID" });
    if (outcome.kind !== "OK") throw new Error("expected OK");

    expect(outcome.response.population?.state).toBe("RIGHTS_BLOCKED");
    expect(outcome.response.population?.observations).toHaveLength(0);
    expect(outcome.response.population?.surface.decision).toBe("BLOCKED");

    // The value is not in the payload at all — not sent and flagged hidden.
    const known = await querySurnameResult(db(), surnameInMaleOnly(), { surface: "INTERNAL" });
    if (known.kind !== "OK") throw new Error("expected OK");
    const value = known.response.population?.observations[0]?.value.value;
    expect(value).toBeGreaterThan(0);
    expect(JSON.stringify(outcome.response)).not.toContain(String(value));
  });

  it("surfaces values on FREE with the conditional decision carried", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly(), { surface: "FREE" });
    if (outcome.kind !== "OK") throw new Error("expected OK");
    expect(outcome.response.population?.state).toBe("READY");
    expect(outcome.response.population?.surface.decision).toBe("CONDITIONAL");
    expect(outcome.response.population?.surface.reason_code).toBe("COMMERCIAL_USE_UNRESOLVED");
  });

  it("keeps confidence identical across surfaces — rights never touch it", async () => {
    await seedRealData();
    const free = await querySurnameResult(db(), surnameInMaleOnly(), { surface: "FREE" });
    const internal = await querySurnameResult(db(), surnameInMaleOnly(), { surface: "INTERNAL" });
    if (free.kind !== "OK" || internal.kind !== "OK") throw new Error("expected OK");

    expect(free.response.population?.observations[0]?.confidence).toEqual(
      internal.response.population?.observations[0]?.confidence,
    );
    // ...while the surface decisions genuinely differ, so this is not vacuous.
    expect(free.response.population?.surface.decision).not.toBe(
      internal.response.population?.surface.decision,
    );
  });

  it("projects confidence from the persisted assessment, without its rationale", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly());
    if (outcome.kind !== "OK") throw new Error("expected OK");

    const confidence = outcome.response.population?.observations[0]?.confidence;
    expect(confidence?.status).toBe("VERIFIED");
    expect(confidence?.methodology_code).toBe("pesel_current_population_rule@confidence@1");

    const stored = await sql<{ status: string; rationale: string }>`
      SELECT status::text AS status, rationale FROM confidence_assessments LIMIT 1
    `.execute(db());
    expect(stored.rows[0]?.status).toBe(confidence?.status);
    // docs/canonical/11 §10.3: the rationale is internal. It must not ship.
    const rationale = stored.rows[0]?.rationale ?? "";
    expect(rationale.length).toBeGreaterThan(0);
    expect(JSON.stringify(outcome.response)).not.toContain(rationale);
  });

  it("projects provenance from persisted values only", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly());
    if (outcome.kind !== "OK") throw new Error("expected OK");

    const citation = outcome.response.population?.observations[0]?.citation;
    expect(citation?.title).toBe("Nazwiska występujące w rejestrze PESEL");
    expect(citation?.publisher).toBe("Ministerstwo Cyfryzacji");
    expect(citation?.publication_date).toBe("2026-01-20");
    expect(citation?.source_type).toBe("OFFICIAL_DATASET");
    expect(citation?.terms).toBe("CC0 1.0");
    expect(citation?.locator).toMatch(/^resource:\d+$/u);
    expect(citation?.url).toContain("dane.gov.pl");

    const stored = await sql<{ title: string; url: string }>`
      SELECT title, url_or_reference AS url FROM citations LIMIT 1
    `.execute(db());
    expect(stored.rows[0]?.title).toBe(citation?.title);
    expect(stored.rows[0]?.url).toBe(citation?.url);
  });

  it("leaks no internal representation", async () => {
    await seedRealData();
    const outcome = await querySurnameResult(db(), surnameInMaleOnly());
    if (outcome.kind !== "OK") throw new Error("expected OK");
    const serialized = JSON.stringify(outcome.response);

    for (const leak of [
      "raw_payload",
      "raw_excerpt",
      "content_hash",
      "source_record_id",
      "evidence_item_id",
      "claim_id",
      "claim_key",
      "distribution_snapshot_id",
      "created_by_run_id",
      "rights_profile_id",
      "canonical_key",
    ]) {
      expect(serialized).not.toContain(leak);
    }
  });

  it("writes nothing during reads, including miss and error paths", async () => {
    await seedRealData();
    const before = await countAll();

    await querySurnameResult(db(), surnameInBoth());
    await querySurnameResult(db(), surnameInMaleOnly());
    await querySurnameResult(db(), "Nieistniejące");
    await querySurnameResult(db(), "");
    await querySurnameResult(db(), surnameInMaleOnly(), { surface: "PAID" });
    await querySurnameResult(db(), "SyntheticNoEvidence");

    expect(await countAll()).toEqual(before);
  });

  it("is deterministic across repeated reads", async () => {
    await seedRealData();
    const first = await querySurnameResult(db(), surnameInBoth());
    const second = await querySurnameResult(db(), surnameInBoth());
    const third = await querySurnameResult(db(), surnameInBoth());
    expect(second).toEqual(first);
    expect(third).toEqual(first);
  });

  it("never returns one surname's facts for another", async () => {
    await seedRealData();
    const a = await querySurnameResult(db(), surnameInMaleOnly());
    const b = await querySurnameResult(db(), "WIŚNIEWSKI");
    if (a.kind !== "OK" || b.kind !== "OK") throw new Error("expected OK");

    expect(a.response.surname?.id).not.toBe(b.response.surname?.id);
    const aCount = a.response.population?.observations[0]?.value.value;
    expect(JSON.stringify(b.response)).not.toContain(`"value":${String(aCount)}`);
  });

  it("maps an infrastructure failure to UNAVAILABLE, not to 'surname unknown'", async () => {
    await seedRealData();
    // A destroyed handle: the resolver reports LOOKUP_FAILED, which must not
    // be reported to a caller as an unresolved surname.
    const { createDb, createPool } = await import("@name-atlas/db");
    const dead = createDb(createPool({ databaseUrl: database?.connectionUri ?? "" }));
    await sql`SELECT 1`.execute(dead);
    await dead.destroy();

    const outcome = await querySurnameResult(dead, surnameInMaleOnly());
    expect(outcome.kind).toBe("UNAVAILABLE");
    if (outcome.kind !== "UNAVAILABLE") return;
    expect(outcome.reason).not.toContain("SELECT");
  });

  describe("through the HTTP route handler (AC-22)", () => {
    it("serves a complete result end to end", async () => {
      await seedRealData();
      process.env["DATABASE_URL"] = database?.connectionUri ?? "";
      const { GET } = await import("../../../apps/web/src/app/api/v1/surname-results/route.js");

      const response = await GET(
        new Request(
          `http://localhost/api/v1/surname-results?surname=${encodeURIComponent(surnameInMaleOnly())}`,
        ),
      );
      expect(response.status).toBe(200);

      const body: unknown = await response.json();
      const parsed = surnameResultResponseSchema.safeParse(body);
      expect(parsed.success).toBe(true);
      if (!parsed.success) return;
      expect(parsed.data.status).toBe("RESOLVED");
      expect(parsed.data.population?.state).toBe("READY");
      expect(parsed.data.population?.observations[0]?.value.unit).toBe("SURNAME_OCCURRENCES");
    });

    it("returns 400 with the error envelope for invalid input", async () => {
      await seedRealData();
      process.env["DATABASE_URL"] = database?.connectionUri ?? "";
      const { GET } = await import("../../../apps/web/src/app/api/v1/surname-results/route.js");

      const response = await GET(
        new Request("http://localhost/api/v1/surname-results?surname=%20%20"),
      );
      expect(response.status).toBe(400);
      const body = (await response.json()) as { error: { code: string } };
      expect(body.error.code).toBe("INVALID_SURNAME_INPUT");
    });

    it("returns 200 with an explicit status for an unknown surname", async () => {
      await seedRealData();
      process.env["DATABASE_URL"] = database?.connectionUri ?? "";
      const { GET } = await import("../../../apps/web/src/app/api/v1/surname-results/route.js");

      const response = await GET(
        new Request("http://localhost/api/v1/surname-results?surname=Nieistniej%C4%85ce"),
      );
      // An expected miss is a successful response, not an error.
      expect(response.status).toBe(200);
      const body = (await response.json()) as { status: string };
      expect(body.status).toBe("UNRESOLVED");
    });
  });
});
