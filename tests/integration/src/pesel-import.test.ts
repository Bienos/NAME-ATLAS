import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { NORMALIZATION_VERSION, canonicalKey, resolveSurname } from "@name-atlas/resolver";
import { seedTestNameForm, seedTestSurname } from "@name-atlas/resolver/testing";
import {
  checkIngestionInvariants,
  checkNormalisationInvariants,
  countIngestionRows,
  importPeselResource,
  peselResource,
  reconciles,
  sha256Hex,
} from "@name-atlas/sources/pesel";
import type {
  IngestionRowCounts,
  PeselImportInput,
  PeselImportReport,
  PeselResourceMetadata,
  PeselResourceRole,
} from "@name-atlas/sources/pesel";
import { PeselSchemaError } from "@name-atlas/sources";

/**
 * TASK-004 §11 integration items 8–20, against a real PostgreSQL.
 *
 * ## What is real here and what is not
 *
 * The two CSV files under `fixtures/pesel/` are GENUINE: every row is
 * byte-identical to a line of the official dane.gov.pl resource, and the
 * selection method is documented in `docs/sources/pesel.md`. They are 22- and
 * 23-row EXCERPTS, so each test computes the fixture's OWN SHA-256 and passes
 * it explicitly — the official resource checksums in the source manifest
 * belong to the full files and are never presented as matching an excerpt
 * (TASK-004 §12 rule 1).
 *
 * Everything built by `syntheticResource()` below is SYNTHETIC: constructed
 * for this task, with mechanical counts, and it is not PESEL evidence of
 * anything (§12 rules 2 and 3). The same is true of every record seeded
 * through `@name-atlas/resolver/testing`.
 *
 * `retrievedAt` is a fixed test timestamp, not a provenance claim about the
 * fixture bytes. It is deliberately a different date from the resource's own
 * `data_date`, which is what §9 invariant 9 requires of real data too.
 */
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const FIXTURE_DIR = path.join(REPO_ROOT, "fixtures", "pesel");
const METADATA_DIR = path.join(
  REPO_ROOT,
  "docs",
  "sources",
  "acquisition",
  "2026-09-18",
  "metadata",
);

const FIXTURE_FILE: Readonly<Record<PeselResourceRole, string>> = {
  national_male: "national-male-2026-01-20.csv",
  national_female: "national-female-2026-01-20.csv",
};

const METADATA_FILE: Readonly<Record<PeselResourceRole, string>> = {
  national_male: "pesel_national_2026_male_1148808.official_resource.json",
  national_female: "pesel_national_2026_female_1148811.official_resource.json",
};

/** Fixed, so nothing in a stored row depends on when the test ran (AC-02). */
const RETRIEVED_AT = new Date("2026-09-19T12:00:00Z");

function fixtureBytes(role: PeselResourceRole): Uint8Array {
  return new Uint8Array(readFileSync(path.join(FIXTURE_DIR, FIXTURE_FILE[role])));
}

/**
 * The publisher's own metadata response, verbatim from the committed capture.
 * Its own status claims carry no authority here — it is retained as evidence
 * of what the publisher returned (§12 rule 5).
 */
function resourceMetadata(role: PeselResourceRole): PeselResourceMetadata {
  const parsed: unknown = JSON.parse(
    readFileSync(path.join(METADATA_DIR, METADATA_FILE[role]), "utf8"),
  );
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`metadata capture for ${role} is not a JSON object`);
  }
  return parsed as PeselResourceMetadata;
}

function fixtureInput(role: PeselResourceRole): PeselImportInput {
  const bytes = fixtureBytes(role);
  return {
    role,
    bytes,
    // The EXCERPT's own checksum, computed here — never the official one.
    expectedSha256: sha256Hex(bytes),
    resourceMetadata: resourceMetadata(role),
    retrievedAt: RETRIEVED_AT,
  };
}

/** Parsed data rows of a fixture, for arithmetic the tests should not hard-code. */
function fixtureRows(role: PeselResourceRole): { surname: string; count: number }[] {
  const text = new TextDecoder("utf-8", { fatal: true }).decode(fixtureBytes(role));
  return text
    .split("\r\n")
    .slice(1)
    .filter((line) => line !== "")
    .map((line) => {
      const index = line.lastIndexOf(",");
      return {
        surname: line.slice(0, index),
        count: Number.parseInt(line.slice(index + 1), 10),
      };
    });
}

/**
 * Builds a SYNTHETIC resource file in the confirmed source shape: exact
 * header, comma delimiter, CRLF throughout, trailing terminator. Counts are
 * mechanical values and are not attributed to anything real (§12 rule 3).
 */
function syntheticResource(rows: readonly (readonly [string, number])[]): Uint8Array {
  const lines = [
    "Nazwisko aktualne,Liczba",
    ...rows.map(([surname, count]) => `${surname},${String(count)}`),
    "",
  ];
  return new TextEncoder().encode(lines.join("\r\n"));
}

function syntheticInput(
  role: PeselResourceRole,
  bytes: Uint8Array,
  overrides: Partial<PeselImportInput> = {},
): PeselImportInput {
  return {
    role,
    bytes,
    expectedSha256: sha256Hex(bytes),
    resourceMetadata: resourceMetadata(role),
    retrievedAt: RETRIEVED_AT,
    ...overrides,
  };
}

async function freshDatabase(): Promise<TestDatabase> {
  const database = await startTestDatabase();
  await migrateTestDatabase(database);
  return database;
}

function requireDatabase(database: TestDatabase | undefined): TestDatabase {
  if (!database) {
    throw new Error("Test database was not started - see the beforeAll failure above.");
  }
  return database;
}

// ---------------------------------------------------------------------------

describe("importing the genuine male fixture", () => {
  let database: TestDatabase | undefined;
  let report: PeselImportReport | undefined;
  const rows = fixtureRows("national_male");

  beforeAll(async () => {
    database = await freshDatabase();
    report = await importPeselResource(requireDatabase(database).db, fixtureInput("national_male"));
  });

  afterAll(async () => {
    await database?.stop();
  });

  function requireReport(): PeselImportReport {
    if (!report) {
      throw new Error("import did not run");
    }
    return report;
  }

  it("reports a committed import that reconciles (§11 item 8, AC-23)", () => {
    const result = requireReport();
    expect(result.disposition).toBe("IMPORTED");
    expect(result.rowsRead).toBe(rows.length);
    expect(result.rowsImported).toBe(rows.length);
    expect(result.rowsQuarantined).toBe(0);
    expect(result.rowsRolledBack).toBe(0);
    expect(result.surnamesCreated).toBe(rows.length);
    expect(result.surnamesReused).toBe(0);
    expect(result.snapshotsWritten).toBe(rows.length);
    expect(result.valuesWritten).toBe(rows.length);
    expect(reconciles(result)).toBe(true);
    // AC-23's second identity, against the database rather than the report.
    expect(result.rowsRead).toBe(result.rowsImported + result.rowsQuarantined);
  });

  it("writes one registry entry and one row per fixture row (§11 item 8)", async () => {
    const counts = await countIngestionRows(requireDatabase(database).db);
    expect(counts).toEqual<IngestionRowCounts>({
      rights_profiles: 1,
      sources: 1,
      source_records: 1,
      surnames: rows.length,
      name_forms: rows.length,
      // One entity per surname and one per name form.
      knowledge_entities: rows.length * 2,
      distribution_snapshots: rows.length,
      distribution_values: rows.length,
    });
  });

  it("records the resource's provenance on the SourceRecord (§11 item 9, AC-06)", async () => {
    const resource = peselResource("national_male");
    const record = await requireDatabase(database)
      .db.selectFrom("source_records")
      .select([
        "external_record_id",
        "external_parent_id",
        "record_type",
        "source_url",
        "content_hash",
        "raw_payload",
        "raw_text_ref",
        "record_status",
        "supersedes_source_record_id",
        "rights_profile_id",
      ])
      .executeTakeFirstOrThrow();

    expect(record.external_record_id).toBe(resource.resource_id);
    expect(record.external_parent_id).toBe("1681");
    // One record per resource file version, whose retained payload is the
    // publisher's API object — not one record per CSV row.
    expect(record.record_type).toBe("API_OBJECT");
    expect(record.source_url).toBe(resource.csv_download_url);
    // The EXCERPT's checksum, because that is what was imported.
    expect(record.content_hash).toBe(sha256Hex(fixtureBytes("national_male")));
    expect(record.content_hash).not.toBe(resource.official_csv_sha256);
    expect(record.record_status).toBe("ACTIVE");
    expect(record.supersedes_source_record_id).toBeNull();
    // No resource-level rights evidence exists, so there is no override.
    expect(record.rights_profile_id).toBeNull();
    // No object storage exists, so the bytes cannot be preserved (§14 U-3).
    expect(record.raw_text_ref).toBeNull();

    // The publisher's own response, stored whole rather than summarised.
    const payload = record.raw_payload as { data?: { id?: string } } | null;
    expect(payload?.data?.id).toBe(resource.resource_id);
  });

  it("keeps the four date concepts distinct (§11 item 9, AC-06)", async () => {
    const resource = peselResource("national_male");
    const dates = await sql<{
      as_of_date: string;
      retrieved_at: string;
      source_modified_at: string;
      dataset_version: string;
    }>`
      SELECT s.as_of_date::text            AS as_of_date,
             r.retrieved_at::text          AS retrieved_at,
             r.source_modified_at::text    AS source_modified_at,
             s.dataset_version             AS dataset_version
        FROM distribution_snapshots s
        JOIN source_records r ON r.source_record_id = s.source_record_id
       LIMIT 1
    `.execute(requireDatabase(database).db);
    const row = dates.rows[0];
    if (!row) {
      throw new Error("no snapshot was written");
    }

    // as_of_date is the PESEL reference date — what the data describes.
    expect(row.as_of_date).toBe(resource.data_date);
    // The portal timestamp is a different, later date.
    expect(row.source_modified_at.startsWith(resource.data_date)).toBe(false);
    // retrieved_at is when the bytes were fetched, later still.
    expect(row.retrieved_at.startsWith(resource.data_date)).toBe(false);
    // dataset_version identifies the resource version, not a timestamp.
    expect(row.dataset_version).toBe(`${resource.resource_id}/${resource.data_date}`);
  });

  it("stores the source count and no derived value (§11 item 10, AC-15)", async () => {
    const values = await requireDatabase(database)
      .db.selectFrom("distribution_values")
      .innerJoin(
        "distribution_snapshots",
        "distribution_snapshots.distribution_snapshot_id",
        "distribution_values.distribution_snapshot_id",
      )
      .innerJoin("surnames", "surnames.surname_id", "distribution_snapshots.surname_id")
      .select([
        "surnames.canonical_display as display",
        "distribution_values.count as count",
        "distribution_values.place_id as place_id",
        "distribution_values.source_geography_key as source_geography_key",
        "distribution_values.population_denominator as population_denominator",
        "distribution_values.surname_share as surname_share",
        "distribution_values.population_rate as population_rate",
        "distribution_values.rank as rank",
        "distribution_values.derivation_version as derivation_version",
        "distribution_snapshots.geography_level as geography_level",
        "distribution_snapshots.universe_size as universe_size",
        "distribution_snapshots.surname_total_count as surname_total_count",
      ])
      .execute();

    expect(values).toHaveLength(rows.length);
    const byDisplay = new Map(values.map((value) => [value.display, value]));
    for (const row of rows) {
      const stored = byDisplay.get(row.surname.normalize("NFC"));
      expect(stored, `no value stored for ${JSON.stringify(row.surname)}`).toBeDefined();
      expect(Number(stored?.count)).toBe(row.count);
    }

    for (const value of values) {
      expect(value.place_id).toBeNull();
      expect(value.geography_level).toBe("NATIONAL");
      expect(value.source_geography_key).toBeNull();
      expect(value.population_denominator).toBeNull();
      expect(value.surname_share).toBeNull();
      expect(value.population_rate).toBeNull();
      expect(value.rank).toBeNull();
      expect(value.derivation_version).toBeNull();
      // §14 U-6: no verified denominator exists, so none is invented.
      expect(value.universe_size).toBeNull();
      expect(value.surname_total_count).toBeNull();
    }
  });

  it("preserves every source string exactly, including its oddities (AC-05)", async () => {
    const stored = await requireDatabase(database)
      .db.selectFrom("surnames")
      .select(["canonical_display", "canonical_key", "primary_script"])
      .execute();
    const displays = new Set(stored.map((row) => row.canonical_display));

    for (const row of rows) {
      expect(displays.has(row.surname.normalize("NFC"))).toBe(true);
    }
    // The genuine trailing-space row of the female resource is not in this
    // fixture; these are the male fixture's own oddities.
    expect(displays.has(`DOG${String.fromCodePoint(0x0308)}AN`.normalize("NFC"))).toBe(true);
    expect(displays.has("W/SILASSIE")).toBe(true);
    expect(displays.has("A/GADIR")).toBe(true);
    expect(displays.has("NGUYỄN".normalize("NFC"))).toBe(true);
    expect(displays.has("MÜLLER".normalize("NFC"))).toBe(true);

    // Polish diacritics are identity-bearing: nothing folded them away.
    expect(displays.has("WIŚNIEWSKI")).toBe(true);
    expect(displays.has("WISNIEWSKI")).toBe(false);
  });

  it("creates one attested CANONICAL NameForm per surname (AC-11, AC-13)", async () => {
    const forms = await requireDatabase(database)
      .db.selectFrom("name_forms")
      .select(["form", "form_type", "attestation_status", "surname_id", "normalization_version"])
      .execute();
    expect(forms).toHaveLength(rows.length);
    for (const form of forms) {
      expect(form.form_type).toBe("CANONICAL");
      // ATTESTED: an official source carried this exact spelling. Nothing was
      // generated, derived, transliterated or gender-inflected.
      expect(form.attestation_status).toBe("ATTESTED");
      expect(form.surname_id).not.toBeNull();
      expect(form.normalization_version).toBe(NORMALIZATION_VERSION);
    }
  });

  it("makes every imported identity directly resolvable (§11 item 17, AC-26)", async () => {
    const db = requireDatabase(database).db;
    // A real fixture surname, resolved through the unchanged TASK-003
    // resolver with no adapter in between.
    const outcome = await resolveSurname(db, "KOWALSKI");
    if (outcome.kind !== "RESOLUTION") {
      throw new Error(`lookup failed at ${outcome.stage}: ${outcome.message}`);
    }
    expect(outcome.resolution.resolution_status).toBe("EXACT");
    expect(outcome.resolution.outcome).toBe("RESOLVED");
    expect(outcome.resolution.resolved_canonical_display).toBe("KOWALSKI");
    expect(outcome.resolution.matched_name_form_id).toBeNull();

    // A case variant resolves to the same identity, still by exact match.
    const variant = await resolveSurname(db, "kowalski");
    if (variant.kind !== "RESOLUTION") {
      throw new Error("lookup failed");
    }
    expect(variant.resolution.resolution_status).toBe("EXACT");
    expect(variant.resolution.resolved_surname_id).toBe(outcome.resolution.resolved_surname_id);

    // A surname the resource does not carry stays UNKNOWN — absence is not a
    // zero and not a guess.
    const absent = await resolveSurname(db, "NIEISTNIEJACENAZWISKO");
    if (absent.kind !== "RESOLUTION") {
      throw new Error("lookup failed");
    }
    expect(absent.resolution.resolution_status).toBe("UNKNOWN");
  });

  it("reaches the RightsProfile from a value in one query (§11 item 19, AC-24)", async () => {
    const audit = await requireDatabase(database)
      .db.selectFrom("distribution_values")
      .innerJoin(
        "distribution_snapshots",
        "distribution_snapshots.distribution_snapshot_id",
        "distribution_values.distribution_snapshot_id",
      )
      .innerJoin(
        "source_records",
        "source_records.source_record_id",
        "distribution_snapshots.source_record_id",
      )
      .innerJoin("sources", "sources.source_id", "source_records.source_id")
      .innerJoin(
        "rights_profiles",
        "rights_profiles.rights_profile_id",
        "sources.default_rights_profile_id",
      )
      .innerJoin("surnames", "surnames.surname_id", "distribution_snapshots.surname_id")
      .select([
        "surnames.canonical_display as display",
        "distribution_values.count as count",
        "source_records.content_hash as content_hash",
        "source_records.source_url as source_url",
        "source_records.retrieved_at as retrieved_at",
        "sources.source_key as source_key",
        "sources.production_status as production_status",
        "rights_profiles.review_status as review_status",
        "rights_profiles.terms_version as terms_version",
        "rights_profiles.automated_access as automated_access",
        "rights_profiles.attribution_required as attribution_required",
      ])
      .where("surnames.canonical_display", "=", "KOWALSKI")
      .executeTakeFirstOrThrow();

    expect(Number(audit.count)).toBe(66589);
    expect(audit.source_key).toBe("pl_pesel_surnames");
    expect(audit.content_hash).toBe(sha256Hex(fixtureBytes("national_male")));
    expect(audit.source_url).toContain("api.dane.gov.pl");
    expect(audit.retrieved_at).toBeInstanceOf(Date);
    expect(audit.terms_version).toBe("CC0 1.0");
    expect(audit.automated_access).toBe("ALLOWED");
    expect(audit.attribution_required).toBe(false);
    // The rights posture the project owner set: ingestion proceeds, paid
    // surfaces stay blocked until a human review (§14 U-2).
    expect(audit.review_status).toBe("LEGAL_REVIEW_REQUIRED");
    expect(audit.production_status).toBe("LEGAL_REVIEW_REQUIRED");
  });

  it("quotes the publisher's own partition wording on every snapshot (AC-17)", async () => {
    const snapshot = await requireDatabase(database)
      .db.selectFrom("distribution_snapshots")
      .select(["universe_description", "coverage_notes", "methodology_key", "comparability_group"])
      .executeTakeFirstOrThrow();
    const resource = peselResource("national_male");
    expect(snapshot.universe_description).toContain(resource.resource_title);
    expect(snapshot.universe_description).toContain("wg pola nazwisko aktualne");
    expect(snapshot.coverage_notes).toContain(
      "THE PARTITION BASIS IS NOT DISAMBIGUATED BY THE PUBLISHER",
    );
    expect(snapshot.methodology_key).toBe(resource.methodology_key);
    expect(snapshot.comparability_group).toBe(resource.comparability_group);
  });
});

// ---------------------------------------------------------------------------

describe("importing both genuine fixtures", () => {
  let database: TestDatabase | undefined;
  let maleReport: PeselImportReport | undefined;
  let femaleReport: PeselImportReport | undefined;

  const maleRows = fixtureRows("national_male");
  const femaleRows = fixtureRows("national_female");
  const maleKeys = new Set(maleRows.map((row) => canonicalKey(row.surname)));
  const femaleKeys = new Set(femaleRows.map((row) => canonicalKey(row.surname)));
  const sharedKeys = [...femaleKeys].filter((key) => maleKeys.has(key));
  const distinctKeys = new Set([...maleKeys, ...femaleKeys]);

  beforeAll(async () => {
    database = await freshDatabase();
    const db = requireDatabase(database).db;
    maleReport = await importPeselResource(db, fixtureInput("national_male"));
    femaleReport = await importPeselResource(db, fixtureInput("national_female"));
  });

  afterAll(async () => {
    await database?.stop();
  });

  it("has an overlap worth testing", () => {
    // Guards the tests below: if the fixtures ever stopped overlapping, the
    // reuse assertions would pass vacuously.
    expect(sharedKeys.length).toBeGreaterThan(0);
    expect(distinctKeys.size).toBeLessThan(maleRows.length + femaleRows.length);
  });

  it("reuses existing surnames rather than duplicating them (§11 item 12, AC-19)", async () => {
    const male = maleReport;
    const female = femaleReport;
    if (!male || !female) {
      throw new Error("both imports must run");
    }
    // The first resource had nothing to reuse, so every row created identity.
    expect(male.disposition).toBe("IMPORTED");
    expect(male.surnamesCreated).toBe(maleRows.length);
    expect(male.surnamesReused).toBe(0);

    expect(female.disposition).toBe("IMPORTED");
    expect(female.surnamesReused).toBe(sharedKeys.length);
    expect(female.surnamesCreated).toBe(femaleRows.length - sharedKeys.length);

    const counts = await countIngestionRows(requireDatabase(database).db);
    // One Surname per distinct canonical key across both resources...
    expect(counts.surnames).toBe(distinctKeys.size);
    // ...and one snapshot and value per source row, in both resources.
    expect(counts.distribution_snapshots).toBe(maleRows.length + femaleRows.length);
    expect(counts.distribution_values).toBe(maleRows.length + femaleRows.length);
    // Two records for one source: the registry is seeded once.
    expect(counts.source_records).toBe(2);
    expect(counts.sources).toBe(1);
    expect(counts.rights_profiles).toBe(1);
  });

  it("gives a shared surname two separate snapshots (§11 item 12, AC-19)", async () => {
    const snapshots = await requireDatabase(database)
      .db.selectFrom("distribution_snapshots")
      .innerJoin("surnames", "surnames.surname_id", "distribution_snapshots.surname_id")
      .innerJoin(
        "distribution_values",
        "distribution_values.distribution_snapshot_id",
        "distribution_snapshots.distribution_snapshot_id",
      )
      .select([
        "distribution_snapshots.methodology_key as methodology_key",
        "distribution_snapshots.comparability_group as comparability_group",
        "distribution_values.count as count",
      ])
      .where("surnames.canonical_display", "=", "NOWAK")
      .orderBy("distribution_snapshots.methodology_key")
      .execute();

    expect(snapshots).toHaveLength(2);
    // Two partitions, two methodologies, two comparability groups — so the
    // two counts can never be summed or compared by accident.
    const methodologies = new Set(snapshots.map((row) => row.methodology_key));
    const groups = new Set(snapshots.map((row) => row.comparability_group));
    expect(methodologies.size).toBe(2);
    expect(groups.size).toBe(2);
    // Each snapshot carries its own resource's count, unaltered.
    expect(snapshots.map((row) => Number(row.count)).sort((a, b) => a - b)).toEqual([98387, 99738]);
  });

  it("gives a single-partition surname exactly one snapshot (§11 item 13)", async () => {
    const db = requireDatabase(database).db;
    // KOWALSKI appears in the male fixture only; KOWALSKA in the female only.
    for (const display of ["KOWALSKI", "KOWALSKA"]) {
      const found = await db
        .selectFrom("distribution_snapshots")
        .innerJoin("surnames", "surnames.surname_id", "distribution_snapshots.surname_id")
        .select((eb) => eb.fn.countAll<string>().as("n"))
        .where("surnames.canonical_display", "=", display)
        .executeTakeFirstOrThrow();
      expect(Number(found.n)).toBe(1);
    }
  });

  it("never stores a zero, a one, or an absent surname (§11 item 13, AC-16)", async () => {
    const db = requireDatabase(database).db;
    const suspicious = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM distribution_values WHERE count IS NULL OR count < 2
    `.execute(db);
    expect(Number(suspicious.rows[0]?.n)).toBe(0);

    // KOWALSKA is absent from the male resource. That absence produces no row
    // at all — it is BELOW_PUBLICATION_THRESHOLD_OR_ABSENT, not a zero.
    const maleSnapshotsForFemaleOnlyName = await db
      .selectFrom("distribution_snapshots")
      .innerJoin("surnames", "surnames.surname_id", "distribution_snapshots.surname_id")
      .select("distribution_snapshots.methodology_key as methodology_key")
      .where("surnames.canonical_display", "=", "KOWALSKA")
      .execute();
    expect(maleSnapshotsForFemaleOnlyName.map((row) => row.methodology_key)).toEqual([
      peselResource("national_female").methodology_key,
    ]);
  });

  it("satisfies every §9 data-integrity invariant (§11 item 20)", async () => {
    const db = requireDatabase(database).db;
    expect(await checkIngestionInvariants(db)).toEqual([]);
    // Invariants 5 and 6 compare stored keys against the resolver's own
    // functions, which are passed in so this cannot check a copy of them.
    expect(await checkNormalisationInvariants(db, canonicalKey, NORMALIZATION_VERSION)).toEqual([]);
  });

  it("computes no total across the two partitions", async () => {
    // AC-17 / §8: nothing in the schema or the data holds a male+female
    // total. surname_total_count is null everywhere, so no such number exists
    // to be mistaken for one.
    const totals = await sql<{ n: string }>`
      SELECT count(*)::text AS n FROM distribution_snapshots WHERE surname_total_count IS NOT NULL
    `.execute(requireDatabase(database).db);
    expect(Number(totals.rows[0]?.n)).toBe(0);
  });

  it("left no evidence, claim or derived table behind", async () => {
    // §8: their absence is a success condition.
    const tables = await sql<{ table_name: string }>`
      SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
       ORDER BY table_name
    `.execute(requireDatabase(database).db);
    const names = tables.rows.map((row) => row.table_name);
    expect(names).toEqual(
      [
        "distribution_snapshots",
        "distribution_values",
        "kysely_migration",
        "kysely_migration_lock",
        "knowledge_entities",
        "name_forms",
        "rights_profiles",
        "source_records",
        "sources",
        "spatial_ref_sys",
        "surnames",
      ].sort(),
    );
  });
});

// ---------------------------------------------------------------------------

describe("re-ingestion and supersession", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await freshDatabase();
  });

  afterAll(async () => {
    await database?.stop();
  });

  it("is a no-op for identical bytes (§11 item 11, AC-18)", async () => {
    const db = requireDatabase(database).db;
    const first = await importPeselResource(db, fixtureInput("national_male"));
    expect(first.disposition).toBe("IMPORTED");

    const before = await countIngestionRows(db);
    const again = await importPeselResource(db, fixtureInput("national_male"));
    const after = await countIngestionRows(db);

    expect(again.disposition).toBe("ALREADY_IMPORTED");
    expect(again.sourceRecordId).toBe(first.sourceRecordId);
    // Nothing read, nothing written, and the report still reconciles.
    expect(again.rowsRead).toBe(0);
    expect(again.rowsImported).toBe(0);
    expect(again.valuesWritten).toBe(0);
    expect(reconciles(again)).toBe(true);
    expect(after).toEqual(before);
  });

  it("supersedes a changed resource without rewriting the old record (§11 item 15, AC-22)", async () => {
    // A SYNTHETIC second version of the same resource id. Mechanical counts;
    // not PESEL evidence (§12 rules 2 and 3).
    const db = requireDatabase(database).db;
    const v1 = syntheticResource([
      ["SYNTHETICUS", 10],
      ["SYNTHETICA", 20],
    ]);
    const v2 = syntheticResource([
      ["SYNTHETICUS", 11],
      ["SYNTHETICA", 20],
    ]);

    const firstRun = await importPeselResource(db, syntheticInput("national_female", v1));
    expect(firstRun.disposition).toBe("IMPORTED");
    const firstRecordId = firstRun.sourceRecordId;
    expect(firstRecordId).not.toBeNull();

    const firstRecordBefore = await db
      .selectFrom("source_records")
      .selectAll()
      .where("source_record_id", "=", firstRecordId ?? "")
      .executeTakeFirstOrThrow();

    const secondRun = await importPeselResource(db, syntheticInput("national_female", v2));
    expect(secondRun.disposition).toBe("IMPORTED");
    expect(secondRun.sourceRecordId).not.toBe(firstRecordId);
    expect(secondRun.supersededSourceRecordId).toBe(firstRecordId);
    // Both surnames already existed, so the second run creates none.
    expect(secondRun.surnamesCreated).toBe(0);
    expect(secondRun.surnamesReused).toBe(2);

    const firstRecordAfter = await db
      .selectFrom("source_records")
      .selectAll()
      .where("source_record_id", "=", firstRecordId ?? "")
      .executeTakeFirstOrThrow();

    // The only permitted change to an existing record: its status.
    expect(firstRecordAfter.record_status).toBe("UPDATED");
    expect({ ...firstRecordAfter, record_status: "ACTIVE" }).toEqual(firstRecordBefore);

    const newRecord = await db
      .selectFrom("source_records")
      .select(["record_status", "supersedes_source_record_id", "content_hash"])
      .where("source_record_id", "=", secondRun.sourceRecordId ?? "")
      .executeTakeFirstOrThrow();
    expect(newRecord.record_status).toBe("ACTIVE");
    expect(newRecord.supersedes_source_record_id).toBe(firstRecordId);
    expect(newRecord.content_hash).toBe(sha256Hex(v2));

    // The old snapshots are untouched: a new annual or corrected version does
    // not overwrite the previous one (docs/canonical/12 §9.3).
    const snapshotsPerRecord = await sql<{ source_record_id: string; n: string }>`
      SELECT source_record_id, count(*)::text AS n
        FROM distribution_snapshots
       GROUP BY source_record_id
    `.execute(db);
    const counts = new Map(
      snapshotsPerRecord.rows.map((row) => [row.source_record_id, Number(row.n)]),
    );
    expect(counts.get(firstRecordId ?? "")).toBe(2);
    expect(counts.get(secondRun.sourceRecordId ?? "")).toBe(2);

    expect(await checkIngestionInvariants(db)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------

describe("failure behaviour writes nothing", () => {
  let database: TestDatabase | undefined;

  beforeAll(async () => {
    database = await freshDatabase();
    // A committed baseline, so "unchanged" is a real claim about a populated
    // database rather than about an empty one.
    await importPeselResource(requireDatabase(database).db, fixtureInput("national_male"));
  });

  afterAll(async () => {
    await database?.stop();
  });

  it("aborts on schema drift and leaves all eight tables untouched (§11 item 14, AC-20)", async () => {
    const db = requireDatabase(database).db;
    const before = await countIngestionRows(db);

    // SYNTHETIC drift cases, one per category the validator owns.
    const drifted: readonly (readonly [string, Uint8Array])[] = [
      ["wrong header", new TextEncoder().encode("Nazwisko,Liczba\r\nSYNTHETICUS,10\r\n")],
      ["missing column", new TextEncoder().encode("Nazwisko aktualne,Liczba\r\nSYNTHETICUS\r\n")],
      [
        "non-numeric count",
        new TextEncoder().encode("Nazwisko aktualne,Liczba\r\nSYNTHETICUS,ten\r\n"),
      ],
      [
        "count below the suppression floor",
        new TextEncoder().encode("Nazwisko aktualne,Liczba\r\nSYNTHETICUS,1\r\n"),
      ],
      [
        "LF-only line endings",
        new TextEncoder().encode("Nazwisko aktualne,Liczba\nSYNTHETICUS,10\n"),
      ],
      [
        "missing trailing terminator",
        new TextEncoder().encode("Nazwisko aktualne,Liczba\r\nSYNTHETICUS,10"),
      ],
    ];

    for (const [label, bytes] of drifted) {
      await expect(
        importPeselResource(db, syntheticInput("national_female", bytes)),
        label,
      ).rejects.toBeInstanceOf(PeselSchemaError);
      expect(await countIngestionRows(db), label).toEqual(before);
    }
  });

  it("aborts before parsing when the checksum does not match (AC-20)", async () => {
    const db = requireDatabase(database).db;
    const before = await countIngestionRows(db);
    await expect(
      importPeselResource(db, {
        ...fixtureInput("national_female"),
        expectedSha256: "0".repeat(64),
      }),
    ).rejects.toThrow(/do not match the expected checksum/u);
    expect(await countIngestionRows(db)).toEqual(before);
  });

  it("aborts when one file repeats a canonical key (AC-19)", async () => {
    const db = requireDatabase(database).db;
    const before = await countIngestionRows(db);
    // SYNTHETIC: two rows differing only in case, inside ONE resource.
    const bytes = syntheticResource([
      ["SYNTHETICUS", 10],
      ["Syntheticus", 20],
    ]);
    await expect(importPeselResource(db, syntheticInput("national_female", bytes))).rejects.toThrow(
      /already appeared on line 2/u,
    );
    expect(await countIngestionRows(db)).toEqual(before);
  });

  it("quarantines an unresolvable row, counts it, and creates no surname (§11 item 18, AC-12)", async () => {
    const db = requireDatabase(database).db;

    // SYNTHETIC ambiguity, constructed so tier T1 finds two eligible forms
    // pointing at two different surnames. Nothing here is PESEL data.
    const alfa = await seedTestSurname(db, { canonical_display: "Syntheticalfa" });
    const beta = await seedTestSurname(db, { canonical_display: "Syntheticbeta" });
    await seedTestNameForm(db, {
      form: "Ambigua",
      surname_id: alfa.surname_id,
      form_type: "MODERN_VARIANT",
      attestation_status: "ATTESTED",
    });
    await seedTestNameForm(db, {
      form: "AMBIGUA",
      surname_id: beta.surname_id,
      form_type: "MODERN_VARIANT",
      attestation_status: "ATTESTED",
    });

    const before = await countIngestionRows(db);
    const mixedScript = `NOWA${String.fromCodePoint(0x041a)}`; // Latin + Cyrillic К
    const withControl = `SYNTH${String.fromCodePoint(0x0009)}ETIC`;
    const bytes = syntheticResource([
      ["SYNTHETICUS", 10],
      ["AMBIGUA", 20],
      [mixedScript, 30],
      [withControl, 40],
    ]);

    const report = await importPeselResource(db, syntheticInput("national_female", bytes));

    expect(report.disposition).toBe("ABORTED_QUARANTINE");
    expect(report.rowsRead).toBe(4);
    expect(report.rowsQuarantined).toBe(3);
    expect(report.rowsImported).toBe(0);
    expect(report.rowsRolledBack).toBe(1);
    expect(report.quarantinedByReason).toEqual({
      MULTIPLE_EXACT: 1,
      REVIEW_REQUIRED: 1,
      MALFORMED_CONTROL_CHARACTERS: 1,
    });
    expect(reconciles(report)).toBe(true);

    const ambiguous = report.quarantined.find((row) => row.reason === "MULTIPLE_EXACT");
    expect(ambiguous?.raw).toBe("AMBIGUA");
    expect(ambiguous?.line).toBe(3);
    expect([...(ambiguous?.candidateSurnameIds ?? [])].sort()).toEqual(
      [alfa.surname_id, beta.surname_id].sort(),
    );

    // Nothing was written — not even for the one row that would have resolved.
    expect(await countIngestionRows(db)).toEqual(before);
  });

  it("rolls the whole transaction back on a database failure (§11 item 16, AC-21)", async () => {
    const db = requireDatabase(database).db;
    const before = await countIngestionRows(db);

    // SYNTHETIC fault injection: a trigger that raises once two values exist,
    // so the failure lands mid-import rather than at its start.
    await sql`
      CREATE FUNCTION synthetic_midimport_failure() RETURNS trigger AS $$
      BEGIN
        IF (SELECT count(*) FROM distribution_values) >= 2 THEN
          RAISE EXCEPTION 'synthetic mid-import failure';
        END IF;
        RETURN NEW;
      END
      $$ LANGUAGE plpgsql
    `.execute(db);
    await sql`
      CREATE TRIGGER synthetic_midimport_failure_trigger
        BEFORE INSERT ON distribution_values
        FOR EACH ROW EXECUTE FUNCTION synthetic_midimport_failure()
    `.execute(db);

    try {
      await expect(importPeselResource(db, fixtureInput("national_female"))).rejects.toThrow(
        /synthetic mid-import failure/u,
      );
      expect(await countIngestionRows(db)).toEqual(before);
    } finally {
      await sql`DROP TRIGGER synthetic_midimport_failure_trigger ON distribution_values`.execute(
        db,
      );
      await sql`DROP FUNCTION synthetic_midimport_failure()`.execute(db);
    }
  });

  it("refuses when the stored rights profile prohibits automated access (AC-08)", async () => {
    const db = requireDatabase(database).db;
    const before = await countIngestionRows(db);

    // Simulates a later legal review that blocked the source. The gate must
    // read the EFFECTIVE stored profile, not only the registry entry.
    await db.updateTable("rights_profiles").set({ automated_access: "PROHIBITED" }).execute();
    try {
      await expect(importPeselResource(db, fixtureInput("national_female"))).rejects.toThrow(
        /automated_access = PROHIBITED/u,
      );
      expect(await countIngestionRows(db)).toEqual(before);

      await db.updateTable("rights_profiles").set({ review_status: "BLOCKED" }).execute();
      await db.updateTable("rights_profiles").set({ automated_access: "ALLOWED" }).execute();
      await expect(importPeselResource(db, fixtureInput("national_female"))).rejects.toThrow(
        /review_status = BLOCKED/u,
      );
      expect(await countIngestionRows(db)).toEqual(before);
    } finally {
      await db
        .updateTable("rights_profiles")
        .set({ automated_access: "ALLOWED", review_status: "LEGAL_REVIEW_REQUIRED" })
        .execute();
    }
  });
});
