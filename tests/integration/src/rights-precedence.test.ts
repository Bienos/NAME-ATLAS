import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { sql } from "kysely";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import { importPeselResource, PESEL_NATIONAL_MALE_2026, sha256Hex } from "@name-atlas/sources";
import { classifyRightsState, evaluateAsset, loadEffectiveRights } from "@name-atlas/truth";

/**
 * TASK-021 AC-9 — `docs/canonical/12` §6.1's precedence chain against a real
 * PostgreSQL.
 *
 * The property that needs a database rather than a unit test is that
 * `source_records.rights_profile_id` — nullable and unwritten since migration
 * 0003 — actually participates in the fold when it is set, and that its
 * absence is an ordinary inheritance rather than a failure.
 *
 * GENUINE DATA: the source and record come from TASK-004's importer over the
 * committed real fixture. The second rights profile is synthetic and is
 * inserted here only to represent an object-level override; it asserts nothing
 * about any real rights holder's terms.
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

describe("rights precedence against a real PostgreSQL", () => {
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

  let sourceId = "";
  let recordId = "";

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
    const row = await db()
      .selectFrom("source_records")
      .select(["source_id", "source_record_id"])
      .executeTakeFirstOrThrow();
    sourceId = row.source_id;
    recordId = row.source_record_id;
  });

  /** Inserts a profile and points the imported record at it. */
  async function overrideRecordRights(values: {
    readonly metadata_rights?: string;
    readonly image_rights?: string;
    readonly transcription_rights?: string;
    readonly commercial_use?: string;
    readonly review_status?: string;
  }): Promise<void> {
    const id = randomUUID();
    await sql`
      INSERT INTO rights_profiles (
        rights_profile_id, checked_at, metadata_rights, image_rights,
        transcription_rights, database_rights, automated_access, commercial_use,
        redistribution, local_cache, attribution_required, contact_required,
        review_status, notes
      ) VALUES (
        ${id}, now(),
        ${values.metadata_rights ?? "ALLOWED"}::rights_permission,
        ${values.image_rights ?? "ALLOWED"}::rights_permission,
        ${values.transcription_rights ?? "ALLOWED"}::rights_permission,
        'ALLOWED'::rights_permission, 'ALLOWED'::rights_permission,
        ${values.commercial_use ?? "ALLOWED"}::rights_permission,
        'ALLOWED'::rights_permission, 'ALLOWED'::cache_permission,
        false, false,
        ${values.review_status ?? "APPROVED"}::rights_review_status,
        'Synthetic object-level override, TASK-021 integration test only.'
      )
    `.execute(db());
    await sql`
      UPDATE source_records SET rights_profile_id = ${id}
       WHERE source_record_id = ${recordId}
    `.execute(db());
  }

  it("returns the source default unchanged when no record override exists", async () => {
    const rights = await loadEffectiveRights(db(), { source_id: sourceId });
    const viaRecord = await loadEffectiveRights(db(), {
      source_id: sourceId,
      source_record_id: recordId,
    });
    expect(viaRecord).toEqual(rights);

    // The posture TASK-004 actually seeded for PESEL: metadata open and
    // commercially clear, with no image or transcription permission evidenced.
    expect(rights.metadata_rights).toBe("ALLOWED");
    expect(rights.commercial_use).toBe("ALLOWED");
    expect(rights.image_rights).toBe("UNKNOWN");
    expect(rights.transcription_rights).toBe("UNKNOWN");
    expect(classifyRightsState(rights)).toBe("METADATA_OPEN_IMAGE_RESTRICTED");
  });

  it("applies a record-level override that tightens the source default", async () => {
    await overrideRecordRights({ metadata_rights: "PROHIBITED" });
    const rights = await loadEffectiveRights(db(), {
      source_id: sourceId,
      source_record_id: recordId,
    });
    expect(rights.metadata_rights).toBe("PROHIBITED");
    expect(evaluateAsset(rights, "METADATA", "FREE").decision).toBe("BLOCKED");
  });

  it("ignores a record-level override that would loosen the source default", async () => {
    // PESEL's own profile says image_rights UNKNOWN. A record claiming ALLOWED
    // must not be able to unlock reproduction.
    await overrideRecordRights({ image_rights: "ALLOWED" });
    const rights = await loadEffectiveRights(db(), {
      source_id: sourceId,
      source_record_id: recordId,
    });
    expect(rights.image_rights).toBe("UNKNOWN");
  });

  it("lets an asset-level layer tighten further still", async () => {
    await overrideRecordRights({ transcription_rights: "ALLOWED" });
    const withoutAsset = await loadEffectiveRights(db(), {
      source_id: sourceId,
      source_record_id: recordId,
    });
    // The record cannot loosen the source's UNKNOWN either.
    expect(withoutAsset.transcription_rights).toBe("UNKNOWN");

    const withAsset = await loadEffectiveRights(db(), {
      source_id: sourceId,
      source_record_id: recordId,
      asset: { transcription_rights: "PROHIBITED" },
    });
    expect(withAsset.transcription_rights).toBe("PROHIBITED");
  });

  it("escalates a record-level review status to the whole chain", async () => {
    await overrideRecordRights({ review_status: "BLOCKED" });
    const rights = await loadEffectiveRights(db(), {
      source_id: sourceId,
      source_record_id: recordId,
    });
    expect(rights.review_status).toBe("BLOCKED");
    for (const surface of ["FREE", "PAID", "SEO"] as const) {
      expect(evaluateAsset(rights, "METADATA", surface).decision).toBe("BLOCKED");
    }
  });

  it("refuses a source with no reachable rights profile", async () => {
    await expect(loadEffectiveRights(db(), { source_id: randomUUID() })).rejects.toThrow(
      /MISSING_RIGHTS_PROFILE|no reachable rights profile/u,
    );
  });
});
