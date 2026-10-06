/**
 * Imports one resource of first names given to children, by year of birth
 * (ADR-0042, TASK-132), with TASK-078's posture:
 *
 *   rights gate → checksum → decode → parse fail-closed → classify
 *   → [one transaction] source record → lists → given names → counts
 *
 * One resource holds one list (2020 on) or forty (2000–2019, a year and a sex
 * each). Every list is stored with its year, its sex and the publisher's
 * cut-off for that year, so an absent name can later be said to be "fewer
 * than 5" or "fewer than 2", never zero. It derives nothing: no rank, no share.
 * A placeholder is reported, never a name; a doubtful form is stored and
 * flagged (ADR-0032 §3–4). Identical bytes are a no-op; a different version
 * supersedes the active record and its lists, never rewrites them.
 */
import type { Insertable, Kysely } from "kysely";
import type { DB } from "@name-atlas/db";
import { uuidv7 } from "@name-atlas/domain";
import { canonicalKey } from "@name-atlas/resolver";
import { decodePeselBytes } from "../decode.js";
import { PeselSchemaError } from "../errors.js";
import { insertChunked, rightsRefusal, sha256Hex } from "../importer.js";
import type { RightsProfileSeed } from "../registry.js";
import { parseBirthNameFile } from "./births-parser.js";
import type { BirthNameList } from "./births-parser.js";
import {
  BIRTH_NAMES_RIGHTS_PROFILE,
  BIRTH_NAMES_SOURCE,
  birthListComparabilityGroup,
} from "./births-registry.js";
import type { BirthListSex, BirthNameResourceDescriptor } from "./births-registry.js";
import { ensureGivenNameSource, ensureGivenNames } from "./importer.js";
import { GIVEN_NAME_PLACEHOLDERS, needsFormReview } from "./registry.js";

export interface ImportBirthNamesOptions {
  readonly resource: BirthNameResourceDescriptor;
  readonly bytes: Uint8Array;
  /** Passed explicitly: a fixture is an excerpt with its own checksum (TASK-004 §12 rule 1). */
  readonly expectedSha256: string;
  /** The publisher's resource object, stored verbatim as `raw_payload`. */
  readonly rawPayload: unknown;
  /** Overridable only so tests can exercise the rights gate. */
  readonly rightsProfile?: RightsProfileSeed;
}

export interface BirthNameListReport {
  readonly birthYear: number;
  readonly sex: BirthListSex;
  readonly publicationThreshold: number;
  readonly rowsRead: number;
  /** Children on every row read, placeholders included. */
  readonly peopleRead: number;
  readonly namesImported: number;
  readonly placeholders: readonly { readonly marker: string; readonly count: number }[];
}

export interface BirthNameImportReport {
  readonly resourceId: string;
  readonly rowsRead: number;
  readonly peopleRead: number;
  readonly namesImported: number;
  /** Given-name identities this import created; the rest already existed. */
  readonly namesCreated: number;
  /** Distinct names, across the resource's lists, that are flagged for review. */
  readonly namesFlagged: number;
  readonly lists: readonly BirthNameListReport[];
}

export type BirthNameImportOutcome =
  | {
      readonly kind: "IMPORTED";
      readonly sourceRecordId: string;
      readonly report: BirthNameImportReport;
    }
  | {
      readonly kind: "ALREADY_IMPORTED";
      readonly sourceRecordId: string;
      readonly report: BirthNameImportReport;
    }
  | {
      readonly kind: "FAILED";
      readonly reason:
        "RIGHTS_BLOCKED" | "CHECKSUM_MISMATCH" | "SCHEMA_VIOLATION" | "DUPLICATE_CANONICAL_KEY";
      readonly message: string;
    };

interface ClassifiedList {
  readonly list: BirthNameList;
  readonly names: { name: string; key: string; count: number; flagged: boolean }[];
  readonly placeholders: { marker: string; count: number }[];
}

export async function importBirthNameResource(
  db: Kysely<DB>,
  options: ImportBirthNamesOptions,
): Promise<BirthNameImportOutcome> {
  const { resource, bytes, expectedSha256, rawPayload } = options;
  const profile = options.rightsProfile ?? BIRTH_NAMES_RIGHTS_PROFILE;

  const refusal = rightsRefusal(profile);
  if (refusal) return { kind: "FAILED", reason: "RIGHTS_BLOCKED", message: refusal };

  const actualSha256 = sha256Hex(bytes);
  if (actualSha256 !== expectedSha256) {
    return {
      kind: "FAILED",
      reason: "CHECKSUM_MISMATCH",
      message: `expected sha256 ${expectedSha256}, got ${actualSha256}`,
    };
  }

  let lists: BirthNameList[];
  try {
    lists = parseBirthNameFile(decodePeselBytes(bytes), resource);
  } catch (cause: unknown) {
    if (cause instanceof PeselSchemaError) {
      return { kind: "FAILED", reason: "SCHEMA_VIOLATION", message: cause.message };
    }
    throw cause;
  }

  // Classify each list. Two rows of one list sharing a key would merge two
  // counts into one name: a shape change, refused rather than guessed.
  const classified: ClassifiedList[] = [];
  for (const list of lists) {
    const names: ClassifiedList["names"] = [];
    const placeholders: ClassifiedList["placeholders"] = [];
    const lineOfKey = new Map<string, { line: number; name: string }>();
    for (const row of list.rows) {
      if (GIVEN_NAME_PLACEHOLDERS.has(row.name)) {
        placeholders.push({ marker: row.name, count: row.count });
        continue;
      }
      const key = canonicalKey(row.name);
      const seen = lineOfKey.get(key);
      if (seen) {
        return {
          kind: "FAILED",
          reason: "DUPLICATE_CANONICAL_KEY",
          message:
            `${list.birthYear} ${list.sex}: lines ${seen.line} and ${row.line} share canonical key ` +
            `${JSON.stringify(key)}: ${JSON.stringify(seen.name)} and ${JSON.stringify(row.name)}`,
        };
      }
      lineOfKey.set(key, { line: row.line, name: row.name });
      names.push({ name: row.name, key, count: row.count, flagged: needsFormReview(row.name) });
    }
    classified.push({ list, names, placeholders });
  }

  const allNames = classified.flatMap((c) => c.names);
  const report = (imported: boolean, created: number): BirthNameImportReport => {
    const listReports = classified.map((c) => ({
      birthYear: c.list.birthYear,
      sex: c.list.sex,
      publicationThreshold: c.list.publicationThreshold,
      rowsRead: c.list.rows.length,
      peopleRead: c.list.rows.reduce((sum, r) => sum + r.count, 0),
      namesImported: imported ? c.names.length : 0,
      placeholders: c.placeholders,
    }));
    return {
      resourceId: resource.resource_id,
      rowsRead: listReports.reduce((sum, l) => sum + l.rowsRead, 0),
      peopleRead: listReports.reduce((sum, l) => sum + l.peopleRead, 0),
      namesImported: listReports.reduce((sum, l) => sum + l.namesImported, 0),
      namesCreated: created,
      namesFlagged: new Set(allNames.filter((n) => n.flagged).map((n) => n.key)).size,
      lists: listReports,
    };
  };

  return db.transaction().execute(async (trx) => {
    const sourceId = await ensureGivenNameSource(trx, profile, BIRTH_NAMES_SOURCE);

    const already = await trx
      .selectFrom("source_records")
      .select("source_record_id")
      .where("source_id", "=", sourceId)
      .where("external_record_id", "=", resource.resource_id)
      .where("content_hash", "=", actualSha256)
      .executeTakeFirst();
    if (already) {
      return {
        kind: "ALREADY_IMPORTED" as const,
        sourceRecordId: already.source_record_id,
        report: report(false, 0),
      };
    }

    const previous = await trx
      .selectFrom("source_records")
      .select("source_record_id")
      .where("source_id", "=", sourceId)
      .where("external_record_id", "=", resource.resource_id)
      .where("record_status", "=", "ACTIVE")
      .orderBy("retrieved_at", "desc")
      .executeTakeFirst();

    const sourceRecordId = uuidv7();
    await trx
      .insertInto("source_records")
      .values({
        source_record_id: sourceRecordId,
        source_id: sourceId,
        external_record_id: resource.resource_id,
        external_parent_id: null,
        record_type: "API_OBJECT",
        source_url: resource.official_source_url,
        raw_payload: JSON.stringify(rawPayload),
        raw_text_ref: null,
        content_hash: actualSha256,
        retrieved_at: resource.retrieved_at,
        source_modified_at: resource.portal_modified_at,
        dataset_version: `${resource.resource_id}@${actualSha256.slice(0, 12)}`,
        universe_description: resource.universe_description,
        methodology_key: resource.methodology_key,
        comparability_group: resource.comparability_group,
        coverage_notes: resource.coverage_notes,
        rights_profile_id: null,
        record_status: "ACTIVE",
        supersedes_source_record_id: previous?.source_record_id ?? null,
      })
      .execute();
    if (previous) {
      await trx
        .updateTable("source_records")
        .set({ record_status: "UPDATED" })
        .where("source_record_id", "=", previous.source_record_id)
        .execute();
    }

    const { ids, created } = await ensureGivenNames(trx, allNames);

    const listRows: Insertable<DB["given_name_birth_lists"]>[] = [];
    const counts: Insertable<DB["given_name_birth_counts"]>[] = [];
    for (const c of classified) {
      const listId = uuidv7();
      listRows.push({
        given_name_birth_list_id: listId,
        source_record_id: sourceRecordId,
        birth_year: c.list.birthYear,
        sex: c.list.sex,
        publication_threshold: c.list.publicationThreshold,
        row_count: c.list.rows.length,
        people_sum: c.list.rows.reduce((sum, r) => sum + r.count, 0),
        comparability_group: birthListComparabilityGroup(c.list.birthYear, c.list.sex),
      });
      for (const n of c.names) {
        counts.push({
          given_name_birth_count_id: uuidv7(),
          given_name_birth_list_id: listId,
          given_name_id: ids.get(n.key) as string,
          count: n.count,
        });
      }
    }
    await insertChunked(trx, "given_name_birth_lists", listRows);
    await insertChunked(trx, "given_name_birth_counts", counts);

    return { kind: "IMPORTED" as const, sourceRecordId, report: report(true, created) };
  });
}
