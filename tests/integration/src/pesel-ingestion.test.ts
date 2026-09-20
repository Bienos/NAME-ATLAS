import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { resolveSurname } from "@name-atlas/resolver";
import { seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";
import {
  importPeselResource,
  PESEL_HEADER,
  PESEL_LINE_TERMINATOR,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_RIGHTS_PROFILE,
  sha256Hex,
} from "@name-atlas/sources";

/**
 * TASK-004 §11 "Integration" — PESEL ingestion against a real PostgreSQL.
 *
 * ── What is genuine and what is synthetic ───────────────────────────────
 *
 * GENUINE, SOURCE-DERIVED: `fixtures/pesel/national-male-2026-01-20.csv`
 * and `…-female-…csv`. Every row is byte-identical to a real line of the
 * official resource (selection method in docs/sources/pesel.md), and the
 * resource-metadata payloads under docs/sources/acquisition/2026-09-18/
 * are verbatim captures of the publisher's own API response.
 *
 * SYNTHETIC: anything built by `syntheticCsv()` below, and every identity
 * seeded through `@name-atlas/resolver/testing`. These exist only to force
 * a code path. Their counts are mechanical values and are NOT figures
 * attributed to any real surname — they are not PESEL evidence.
 *
 * A fixture's checksum is NOT the official resource's checksum: the
 * fixtures are 22- and 23-row excerpts. Every import below therefore passes
 * the excerpt's own SHA-256 explicitly (TASK-004 §12 rule 1).
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

/** Builds a SYNTHETIC PESEL-shaped file. Never source evidence. */
function syntheticCsv(rows: readonly (readonly [string, number])[]): Uint8Array {
  const lines = [PESEL_HEADER, ...rows.map(([surname, count]) => `${surname},${String(count)}`)];
  return new TextEncoder().encode(lines.join(PESEL_LINE_TERMINATOR) + PESEL_LINE_TERMINATOR);
}

const MALE_BYTES = readFixture("national-male-2026-01-20.csv");
const FEMALE_BYTES = readFixture("national-female-2026-01-20.csv");
const MALE_PAYLOAD = readCapturedMetadata(
  "pesel_national_2026_male_1148808.official_resource.json",
);
const FEMALE_PAYLOAD = readCapturedMetadata(
  "pesel_national_2026_female_1148811.official_resource.json",
);

/** The eight tables an import can touch (TASK-004 AC-18, AC-21). */
const TOUCHED_TABLES = [
  "knowledge_entities",
  "surnames",
  "name_forms",
  "rights_profiles",
  "sources",
  "source_records",
  "distribution_snapshots",
  "distribution_values",
] as const;

type TableCounts = Record<(typeof TOUCHED_TABLES)[number], number>;

describe("PESEL ingestion against a real PostgreSQL", () => {
  let database: TestDatabase | undefined;

  function db(): TestDatabase["db"] {
    if (!database) {
      throw new Error("test database was not started — see beforeAll failure");
    }
    return database.db;
  }

  async function countAll(): Promise<TableCounts> {
    const counts = {} as TableCounts;
    for (const table of TOUCHED_TABLES) {
      const row = await sql<{ n: string }>`
        SELECT count(*)::text AS n FROM ${sql.table(table)}
      `.execute(db());
      counts[table] = Number(row.rows[0]?.n ?? "0");
    }
    return counts;
  }

  async function importMale(bytes: Uint8Array = MALE_BYTES) {
    return importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes,
      // The committed fixture is an EXCERPT; this is its own checksum.
      expectedSha256: sha256Hex(bytes),
      rawPayload: MALE_PAYLOAD,
    });
  }

  async function importFemale(bytes: Uint8Array = FEMALE_BYTES) {
    return importPeselResource(db(), {
      resource: PESEL_NATIONAL_FEMALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: FEMALE_PAYLOAD,
    });
  }

  /** Every surname string in a fixture, in file order. */
  function fixtureRows(bytes: Uint8Array): { surname: string; count: number }[] {
    const text = new TextDecoder().decode(bytes);
    return text
      .split(PESEL_LINE_TERMINATOR)
      .slice(1)
      .filter((line) => line !== "")
      .map((line) => {
        const idx = line.lastIndexOf(",");
        return { surname: line.slice(0, idx), count: Number(line.slice(idx + 1)) };
      });
  }

  const MALE_ROWS = fixtureRows(MALE_BYTES);
  const FEMALE_ROWS = fixtureRows(FEMALE_BYTES);

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);
  }, 120_000);

  afterAll(async () => {
    await database?.stop();
  });

  beforeEach(async () => {
    // Each test starts from an empty schema so counts are unambiguous.
    await sql`
      TRUNCATE distribution_values, distribution_snapshots, source_records,
               sources, rights_profiles, name_forms, surnames, knowledge_entities
      RESTART IDENTITY CASCADE
    `.execute(db());
  });

  it("the committed fixtures are excerpts, not the official resources", () => {
    // Guards against a future session pasting the official checksum onto a
    // fixture and so claiming provenance the bytes do not have.
    expect(sha256Hex(MALE_BYTES)).not.toBe(PESEL_NATIONAL_MALE_2026.official_sha256);
    expect(MALE_ROWS.length).toBeLessThan(PESEL_NATIONAL_MALE_2026.official_row_count);
  });

  it("imports the male fixture into registry, provenance, identity and distribution rows", async () => {
    const outcome = await importMale();
    expect(outcome.kind).toBe("IMPORTED");
    if (outcome.kind !== "IMPORTED") return;

    expect(outcome.report.rowsRead).toBe(MALE_ROWS.length);
    expect(outcome.report.rowsImported).toBe(MALE_ROWS.length);
    expect(outcome.report.rowsQuarantined).toBe(0);
    expect(outcome.report.surnamesCreated).toBe(MALE_ROWS.length);
    expect(outcome.report.surnamesReused).toBe(0);

    const counts = await countAll();
    expect(counts.sources).toBe(1);
    expect(counts.rights_profiles).toBe(1);
    expect(counts.source_records).toBe(1);
    expect(counts.surnames).toBe(MALE_ROWS.length);
    expect(counts.name_forms).toBe(MALE_ROWS.length);
    expect(counts.distribution_snapshots).toBe(MALE_ROWS.length);
    expect(counts.distribution_values).toBe(MALE_ROWS.length);
    // One knowledge entity per surname and per name form.
    expect(counts.knowledge_entities).toBe(MALE_ROWS.length * 2);
  });

  it("writes exactly one SourceRecord per resource version, carrying full provenance (AC-06)", async () => {
    await importMale();
    const record = await db().selectFrom("source_records").selectAll().executeTakeFirstOrThrow();

    // ADR-0003: one record per resource VERSION, never per CSV row.
    expect(await countAll()).toMatchObject({ source_records: 1 });
    expect(record.external_record_id).toBe("1148808");
    expect(record.record_type).toBe("API_OBJECT");
    expect(record.content_hash).toBe(sha256Hex(MALE_BYTES));
    expect(record.content_hash).toMatch(/^[0-9a-f]{64}$/u);
    expect(record.source_url).toBe(PESEL_NATIONAL_MALE_2026.official_source_url);
    expect(record.record_status).toBe("ACTIVE");
    expect(record.supersedes_source_record_id).toBeNull();
    // U-3: no object storage exists, so the bytes are identified by hash,
    // URL and payload rather than preserved.
    expect(record.raw_text_ref).toBeNull();
    expect(record.raw_payload).not.toBeNull();
  });

  it("keeps the PESEL reference date distinct from the portal timestamp and retrieval time (AC-06)", async () => {
    await importMale();
    const row = await sql<{ as_of: string; retrieved: string; modified: string }>`
      SELECT to_char(s.as_of_date, 'YYYY-MM-DD')                    AS as_of,
             to_char(r.retrieved_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS retrieved,
             to_char(r.source_modified_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS modified
      FROM distribution_snapshots s
      JOIN source_records r ON r.source_record_id = s.source_record_id
      LIMIT 1
    `.execute(db());
    const dates = row.rows[0];
    expect(dates?.as_of).toBe("2026-01-20");
    expect(dates?.modified).toBe("2026-01-28");
    expect(dates?.retrieved).toBe("2026-09-18");
  });

  it("stores the raw count and derives nothing (AC-15, AC-16)", async () => {
    await importMale();
    const values = await db()
      .selectFrom("distribution_values as v")
      .innerJoin(
        "distribution_snapshots as s",
        "s.distribution_snapshot_id",
        "v.distribution_snapshot_id",
      )
      .innerJoin("surnames as n", "n.surname_id", "s.surname_id")
      .select([
        "n.canonical_display",
        "v.count",
        "v.place_id",
        "v.surname_share",
        "v.population_rate",
        "v.rank",
        "v.derivation_version",
        "s.geography_level",
        "s.universe_size",
      ])
      .execute();

    expect(values).toHaveLength(MALE_ROWS.length);
    for (const value of values) {
      expect(value.place_id).toBeNull();
      expect(value.geography_level).toBe("NATIONAL");
      expect(value.surname_share).toBeNull();
      expect(value.population_rate).toBeNull();
      expect(value.rank).toBeNull();
      expect(value.derivation_version).toBeNull();
      // U-6: the PESEL living-population denominator is not verified.
      expect(value.universe_size).toBeNull();
    }

    // Each count equals the source's own Liczba, exactly.
    const byDisplay = new Map(values.map((v) => [v.canonical_display, String(v.count)]));
    for (const row of MALE_ROWS) {
      expect(byDisplay.get(row.surname.normalize("NFC"))).toBe(String(row.count));
    }
  });

  it("preserves Polish diacritics and the source's real oddities verbatim (AC-04, AC-05)", async () => {
    await importMale();
    const displays = (
      await db().selectFrom("surnames").select(["canonical_display", "canonical_key"]).execute()
    ).map((r) => r.canonical_display);

    // Real rows from the official resource, present in the committed fixture.
    expect(displays).toContain("WIŚNIEWSKI");
    expect(displays).toContain("WÓJCIK");
    expect(displays).toContain("KAMIŃSKI");
    expect(displays).toContain("WOŹNIAK");
    // A base letter plus a standalone combining mark, and an embedded slash.
    expect(displays.some((d) => d.includes("̈"))).toBe(true);
    expect(displays.some((d) => d.includes("/"))).toBe(true);

    // Diacritics are identity-bearing: nothing folded Ś to S anywhere.
    const keys = (await db().selectFrom("surnames").select("canonical_key").execute()).map(
      (r) => r.canonical_key,
    );
    expect(keys).toContain("wiśniewski");
    expect(keys).not.toContain("wisniewski");
  });

  it("preserves a surname with a real trailing space (AC-05)", async () => {
    // "SCHIED ,2" is a genuine data-quality artefact in the female resource.
    const withSpace = FEMALE_ROWS.filter((r) => r.surname !== r.surname.trim());
    expect(withSpace.length).toBeGreaterThan(0);
    await importFemale();
    const displays = (await db().selectFrom("surnames").select("canonical_display").execute()).map(
      (r) => r.canonical_display,
    );
    for (const row of withSpace) {
      expect(displays).toContain(row.surname);
    }
  });

  it("makes every written key agree with the resolver's own function (AC-10)", async () => {
    await importMale();
    const rows = await db()
      .selectFrom("surnames as s")
      .innerJoin("name_forms as f", "f.surname_id", "s.surname_id")
      .select([
        "s.canonical_display",
        "s.canonical_key",
        "s.canonical_key_version",
        "f.form",
        "f.search_key",
        "f.normalization_version",
        "f.form_type",
        "f.attestation_status",
      ])
      .execute();

    const { canonicalKey, CANONICAL_KEY_VERSION, NORMALIZATION_VERSION } =
      await import("@name-atlas/resolver");
    for (const row of rows) {
      expect(row.canonical_key).toBe(canonicalKey(row.canonical_display));
      expect(row.search_key).toBe(canonicalKey(row.form));
      expect(row.canonical_key_version).toBe(CANONICAL_KEY_VERSION);
      expect(row.normalization_version).toBe(NORMALIZATION_VERSION);
      // Attested by an official source, not generated (AC-11, AC-13).
      expect(row.form_type).toBe("CANONICAL");
      expect(row.attestation_status).toBe("ATTESTED");
    }
  });

  it("is idempotent: re-importing identical bytes writes nothing (AC-18)", async () => {
    await importMale();
    const before = await countAll();

    const again = await importMale();
    expect(again.kind).toBe("ALREADY_IMPORTED");

    expect(await countAll()).toEqual(before);
  });

  it("reuses existing surnames across the two partitions and adds a separate snapshot (AC-19)", async () => {
    await importMale();
    const afterMale = await countAll();

    const female = await importFemale();
    expect(female.kind).toBe("IMPORTED");
    if (female.kind !== "IMPORTED") return;

    // A surname string present in both files must produce ONE surname.
    const shared = MALE_ROWS.map((r) => r.surname).filter((s) =>
      FEMALE_ROWS.some((f) => f.surname === s),
    );
    expect(female.report.surnamesReused).toBe(shared.length);

    const after = await countAll();
    expect(after.surnames).toBe(afterMale.surnames + (FEMALE_ROWS.length - shared.length));
    expect(after.source_records).toBe(2);
    // Every female row still gets its own snapshot, shared surnames included.
    expect(after.distribution_snapshots).toBe(MALE_ROWS.length + FEMALE_ROWS.length);

    for (const surname of shared) {
      const snapshots = await sql<{ n: string }>`
        SELECT count(*)::text AS n
        FROM distribution_snapshots s
        JOIN surnames n ON n.surname_id = s.surname_id
        WHERE n.canonical_display = ${surname.normalize("NFC")}
      `.execute(db());
      expect(snapshots.rows[0]?.n).toBe("2");
    }
  });

  it("gives a surname present in only one partition exactly one snapshot, and writes no zero anywhere (AC-16)", async () => {
    await importMale();
    await importFemale();

    const maleOnly = MALE_ROWS.map((r) => r.surname).filter(
      (s) => !FEMALE_ROWS.some((f) => f.surname === s),
    );
    expect(maleOnly.length).toBeGreaterThan(0);
    for (const surname of maleOnly.slice(0, 5)) {
      const snapshots = await sql<{ n: string }>`
        SELECT count(*)::text AS n
        FROM distribution_snapshots s
        JOIN surnames n ON n.surname_id = s.surname_id
        WHERE n.canonical_display = ${surname.normalize("NFC")}
      `.execute(db());
      expect(snapshots.rows[0]?.n).toBe("1");
    }

    const low = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM distribution_values WHERE count IS NULL OR count < 2
    `.execute(db());
    expect(low.rows[0]?.n).toBe("0");
  });

  it("puts the two partitions in different comparability groups (AC-17)", async () => {
    await importMale();
    await importFemale();
    const groups = await sql<{ comparability_group: string; n: string }>`
      SELECT comparability_group, count(*)::text AS n
      FROM distribution_snapshots GROUP BY comparability_group ORDER BY comparability_group
    `.execute(db());
    expect(groups.rows.map((r) => r.comparability_group)).toEqual([
      "pesel_2026_national_female",
      "pesel_2026_national_male",
    ]);
  });

  it("leaves every table untouched when the file violates the confirmed schema (AC-20, AC-21)", async () => {
    await importMale();
    const before = await countAll();

    const broken = syntheticCsv([["AAA", 2]]).slice(0, -1); // drop the trailing terminator
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: broken,
      expectedSha256: sha256Hex(broken),
      rawPayload: MALE_PAYLOAD,
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("SCHEMA_VIOLATION");

    expect(await countAll()).toEqual(before);
  });

  it("supersedes the previous version when the bytes change, without mutating it (AC-22)", async () => {
    const first = await importMale();
    expect(first.kind).toBe("IMPORTED");
    if (first.kind !== "IMPORTED") return;
    const originalRecord = await db()
      .selectFrom("source_records")
      .selectAll()
      .executeTakeFirstOrThrow();

    // A SYNTHETIC "next year's file" for the same resource id.
    const changed = syntheticCsv([
      ["NOWAK", 98_000],
      ["SYNTHETICSURNAME", 7],
    ]);
    const second = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: changed,
      expectedSha256: sha256Hex(changed),
      rawPayload: MALE_PAYLOAD,
    });
    expect(second.kind).toBe("IMPORTED");
    if (second.kind !== "IMPORTED") return;
    expect(second.supersededSourceRecordId).toBe(originalRecord.source_record_id);

    const records = await db()
      .selectFrom("source_records")
      .selectAll()
      .orderBy("created_at")
      .execute();
    expect(records).toHaveLength(2);

    const [older, newer] = records;
    // Only record_status changed on the old row; everything else is intact.
    expect(older?.record_status).toBe("UPDATED");
    expect(older?.content_hash).toBe(originalRecord.content_hash);
    expect(older?.raw_payload).toEqual(originalRecord.raw_payload);
    expect(older?.retrieved_at).toEqual(originalRecord.retrieved_at);
    expect(newer?.record_status).toBe("ACTIVE");
    expect(newer?.external_record_id).toBe(older?.external_record_id);
    expect(newer?.content_hash).not.toBe(older?.content_hash);
  });

  it("rolls everything back when the write fails mid-import (AC-21)", async () => {
    await importMale();
    const before = await countAll();

    // Force a failure AFTER the source record and identities are inserted,
    // by making the last insert of the transaction raise.
    await sql`
      CREATE FUNCTION fail_on_distribution_value() RETURNS trigger AS $fn$
      BEGIN RAISE EXCEPTION 'synthetic mid-import failure'; END;
      $fn$ LANGUAGE plpgsql
    `.execute(db());
    await sql`
      CREATE TRIGGER t_fail_distribution_value BEFORE INSERT ON distribution_values
      FOR EACH ROW EXECUTE FUNCTION fail_on_distribution_value()
    `.execute(db());

    try {
      const outcome = await importFemale();
      expect(outcome.kind).toBe("FAILED");
      if (outcome.kind !== "FAILED") return;
      expect(outcome.reason).toBe("DATABASE_ERROR");
      expect(outcome.message).toMatch(/synthetic mid-import failure/u);
    } finally {
      await sql`DROP TRIGGER t_fail_distribution_value ON distribution_values`.execute(db());
      await sql`DROP FUNCTION fail_on_distribution_value()`.execute(db());
    }

    expect(await countAll()).toEqual(before);
  });

  it("quarantines an ambiguous row, counts it, and writes nothing (AC-12)", async () => {
    // SYNTHETIC ambiguity: two distinct surnames each carrying an eligible
    // name form with the same search key. The resolver must return
    // MULTIPLE_EXACT rather than pick one.
    const a = await seedTestSurname(db(), { canonical_display: "SyntheticAlpha" });
    const b = await seedTestSurname(db(), { canonical_display: "SyntheticBeta" });
    const ambiguous = {
      form: "AMBIGUOUSTEST",
      form_type: "CANONICAL" as const,
      attestation_status: "ATTESTED" as const,
    };
    await seedTestNameForm(db(), { ...ambiguous, surname_id: a.surname_id });
    await seedTestNameForm(db(), { ...ambiguous, surname_id: b.surname_id });

    const before = await countAll();
    const bytes = syntheticCsv([
      ["AMBIGUOUSTEST", 9],
      ["UNAMBIGUOUSTEST", 4],
    ]);
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes,
      expectedSha256: sha256Hex(bytes),
      rawPayload: MALE_PAYLOAD,
    });

    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("UNRESOLVED_ROWS");
    expect(outcome.quarantined).toHaveLength(1);
    expect(outcome.quarantined[0]?.surname).toBe("AMBIGUOUSTEST");
    expect(outcome.quarantined[0]?.reason).toBe("MULTIPLE_EXACT");
    expect(outcome.report?.rowsRead).toBe(2);
    expect(outcome.report?.rowsQuarantined).toBe(1);
    expect(outcome.report?.quarantinedByReason).toEqual({ MULTIPLE_EXACT: 1 });

    // U-5 option (a): the whole run aborts, so even the resolvable row is
    // not imported.
    expect(await countAll()).toEqual(before);
  });

  it("makes ingested identity directly resolvable by the TASK-003 resolver (AC-26)", async () => {
    await importMale();
    const sample = MALE_ROWS[0];
    if (!sample) throw new Error("fixture has no rows");

    const outcome = await resolveSurname(db(), sample.surname);
    expect(outcome.kind).toBe("RESOLUTION");
    if (outcome.kind !== "RESOLUTION") return;
    expect(outcome.resolution.resolution_status).toBe("EXACT");
    expect(outcome.resolution.resolved_canonical_display).toBe(sample.surname.normalize("NFC"));

    // A diacritic-stripped spelling must NOT resolve to it.
    const stripped = await resolveSurname(db(), "WISNIEWSKI");
    expect(stripped.kind).toBe("RESOLUTION");
    if (stripped.kind !== "RESOLUTION") return;
    expect(stripped.resolution.resolution_status).toBe("UNKNOWN");
  });

  it("traverses from a distribution value to its rights profile in one query (AC-24)", async () => {
    await importMale();
    const audit = await sql<{
      count: string;
      content_hash: string;
      source_url: string;
      source_key: string;
      review_status: string;
      commercial_use: string;
      terms_version: string;
    }>`
      SELECT v.count::text AS count,
             r.content_hash,
             r.source_url,
             src.source_key,
             rp.review_status::text  AS review_status,
             rp.commercial_use::text AS commercial_use,
             rp.terms_version
      FROM distribution_values v
      JOIN distribution_snapshots s ON s.distribution_snapshot_id = v.distribution_snapshot_id
      JOIN source_records r         ON r.source_record_id = s.source_record_id
      JOIN sources src              ON src.source_id = r.source_id
      JOIN rights_profiles rp       ON rp.rights_profile_id = src.default_rights_profile_id
      LIMIT 1
    `.execute(db());

    const row = audit.rows[0];
    expect(row).toBeDefined();
    expect(row?.content_hash).toBe(sha256Hex(MALE_BYTES));
    expect(row?.source_key).toBe("pl_pesel_surnames");
    expect(row?.terms_version).toBe("CC0 1.0");
    // The paid-surface gate is closed in the database, not just in a doc.
    expect(row?.review_status).toBe("APPROVED"); // D-007, decided 2026-09-20
    expect(row?.commercial_use).toBe("ALLOWED"); // D-007, decided 2026-09-20
  });

  it("refuses to import when rights forbid it, writing nothing (AC-08)", async () => {
    const before = await countAll();
    const outcome = await importPeselResource(db(), {
      resource: PESEL_NATIONAL_MALE_2026,
      bytes: MALE_BYTES,
      expectedSha256: sha256Hex(MALE_BYTES),
      rawPayload: MALE_PAYLOAD,
      rightsProfile: { ...PESEL_RIGHTS_PROFILE, automated_access: "PROHIBITED" },
    });
    expect(outcome.kind).toBe("FAILED");
    if (outcome.kind !== "FAILED") return;
    expect(outcome.reason).toBe("RIGHTS_BLOCKED");
    expect(await countAll()).toEqual(before);
  });

  describe("data integrity invariants after a full two-resource import (TASK-004 §9)", () => {
    beforeEach(async () => {
      await importMale();
      await importFemale();
    });

    async function scalar(query: ReturnType<typeof sql<{ n: string }>>): Promise<string> {
      const result = await query.execute(db());
      return result.rows[0]?.n ?? "";
    }

    it("1. every snapshot is surname-scoped", async () => {
      expect(
        await scalar(
          sql<{
            n: string;
          }>`SELECT count(*)::text AS n FROM distribution_snapshots WHERE surname_id IS NULL`,
        ),
      ).toBe("0");
    });

    it("2. every value is the national aggregate", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM distribution_values v
          JOIN distribution_snapshots s ON s.distribution_snapshot_id = v.distribution_snapshot_id
          WHERE v.place_id IS NOT NULL OR s.geography_level <> 'NATIONAL'
        `),
      ).toBe("0");
    });

    it("3. no count is zero, one, negative or null", async () => {
      expect(
        await scalar(
          sql<{
            n: string;
          }>`SELECT count(*)::text AS n FROM distribution_values WHERE count IS NULL OR count < 2`,
        ),
      ).toBe("0");
    });

    it("4. no derived field is populated", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM distribution_values
          WHERE surname_share IS NOT NULL OR population_rate IS NOT NULL
             OR rank IS NOT NULL OR derivation_version IS NOT NULL
        `),
      ).toBe("0");
    });

    it("5. canonical keys are unique and agree with the stored display form", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM (
            SELECT canonical_key FROM surnames GROUP BY canonical_key HAVING count(*) > 1
          ) dup
        `),
      ).toBe("0");
      const { canonicalKey } = await import("@name-atlas/resolver");
      const rows = await db()
        .selectFrom("surnames")
        .select(["canonical_display", "canonical_key"])
        .execute();
      for (const row of rows) {
        expect(row.canonical_key).toBe(canonicalKey(row.canonical_display));
      }
    });

    it("7. every content hash is a lowercase hex SHA-256, unique per (source, resource, hash)", async () => {
      expect(
        await scalar(
          sql<{
            n: string;
          }>`SELECT count(*)::text AS n FROM source_records WHERE content_hash !~ '^[0-9a-f]{64}$'`,
        ),
      ).toBe("0");
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM (
            SELECT source_id, external_record_id, content_hash FROM source_records
            GROUP BY source_id, external_record_id, content_hash HAVING count(*) > 1
          ) dup
        `),
      ).toBe("0");
    });

    it("8. supersession forms no cycle", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM source_records a
          JOIN source_records b ON a.supersedes_source_record_id = b.source_record_id
          WHERE b.supersedes_source_record_id = a.source_record_id
        `),
      ).toBe("0");
    });

    it("9. as_of_date is the source's reference date, never the retrieval date", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM distribution_snapshots s
          JOIN source_records r ON r.source_record_id = s.source_record_id
          WHERE s.as_of_date <> DATE '2026-01-20'
             OR s.as_of_date = (r.retrieved_at AT TIME ZONE 'UTC')::date
        `),
      ).toBe("0");
    });

    it("10. exactly one value per snapshot", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM (
            SELECT distribution_snapshot_id FROM distribution_values
            GROUP BY distribution_snapshot_id HAVING count(*) <> 1
          ) bad
        `),
      ).toBe("0");
    });

    it("11. no two snapshots share a (surname, source record)", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM (
            SELECT surname_id, source_record_id FROM distribution_snapshots
            GROUP BY surname_id, source_record_id HAVING count(*) > 1
          ) dup
        `),
      ).toBe("0");
    });

    it("12. every primary key is a UUIDv7", async () => {
      const { isUuidV7 } = await import("@name-atlas/domain");
      const ids = await sql<{ id: string }>`
        SELECT source_record_id AS id FROM source_records
        UNION ALL SELECT distribution_snapshot_id FROM distribution_snapshots
        UNION ALL SELECT distribution_value_id FROM distribution_values
        UNION ALL SELECT source_id FROM sources
        UNION ALL SELECT rights_profile_id FROM rights_profiles
        UNION ALL SELECT surname_id FROM surnames
        UNION ALL SELECT name_form_id FROM name_forms
      `.execute(db());
      expect(ids.rows.length).toBeGreaterThan(0);
      for (const row of ids.rows) {
        expect(isUuidV7(row.id)).toBe(true);
      }
    });

    it("13. every source's default rights profile exists", async () => {
      expect(
        await scalar(sql<{ n: string }>`
          SELECT count(*)::text AS n FROM sources s
          LEFT JOIN rights_profiles r ON r.rights_profile_id = s.default_rights_profile_id
          WHERE r.rights_profile_id IS NULL
        `),
      ).toBe("0");
    });

    it("the importer writes no evidence, claim, confidence or citation row (TASK-004 §8)", async () => {
      // These tables exist from TASK-005's migration 0004, but ingestion must
      // never populate them: source data and derived product claims stay
      // separate objects (docs/canonical/11 §13). Asserting emptiness is the
      // real invariant — asserting the tables are absent stopped being
      // meaningful once the truth layer landed.
      for (const table of [
        "evidence_items",
        "claims",
        "claim_evidence",
        "confidence_assessments",
        "citations",
        "research_runs",
      ]) {
        const result = await sql<{ n: string }>`
          SELECT count(*)::text AS n FROM ${sql.table(table)}
        `.execute(db());
        expect(result.rows[0]?.n).toBe("0");
      }
    });

    it("creates no table TASK-004 excluded", async () => {
      const tables = await sql<{ table_name: string }>`
        SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
      `.execute(db());
      const names = tables.rows.map((r) => r.table_name);
      for (const forbidden of ["digital_assets", "places", "name_form_relations"]) {
        expect(names).not.toContain(forbidden);
      }
    });
  });
});
