/**
 * The universe completeness gate (TASK-009 §2, §9 AC-01 to AC-03).
 *
 * A rank is meaningless unless the set it ranks within is complete. The
 * repository's committed fixtures are 22-row and 23-row excerpts of resources
 * holding 408,182 and 420,082 rows, so a rank computed over what is ingested
 * by default would assert "NOWAK is rank 1 of 22" in the language of a
 * national ranking — and would be accidentally *correct* for the top fifteen,
 * because the fixtures were selected as the top fifteen by count plus a tail.
 * It would survive a casual review and be false from rank 16 on.
 *
 * So this predicate, not the ranking arithmetic, is the substance of the task.
 * It is deliberately:
 *
 *   - **pure** — it takes recorded facts and returns a verdict, touching no
 *     database, so it is testable without one;
 *   - **conjunctive** — the checksum *and* the row count must both agree. The
 *     checksum alone would pass a truncated import of the right file; the row
 *     count alone would pass a same-sized different file;
 *   - **fail-closed** — an unknown resource makes completeness undecidable,
 *     which is not the same as incomplete, and neither permits a rank;
 *   - **unconditional** — there is no option, flag or environment variable
 *     that lets a caller past it. AC-03 asserts no such switch exists.
 */

/** Why a universe was rejected. Each is a distinct, reportable situation. */
export type IncompleteReason =
  /** The imported bytes are not the official resource — an excerpt or a different file. */
  | "CONTENT_HASH_MISMATCH"
  /** The right bytes, but fewer rows persisted than the resource holds. */
  | "ROW_COUNT_SHORT"
  /** More rows than the resource holds; the universe is not what it claims. */
  | "ROW_COUNT_EXCESS"
  /** No registry descriptor, so there is nothing to compare against. */
  | "UNKNOWN_RESOURCE";

export type CompletenessVerdict =
  | {
      readonly kind: "COMPLETE";
      /** The size of the ranked set, taken from the observed persisted rows. */
      readonly universeSize: number;
    }
  | {
      readonly kind: "INCOMPLETE";
      readonly reason: IncompleteReason;
      readonly message: string;
      readonly expectedRowCount: number | null;
      readonly actualRowCount: number;
      readonly expectedContentHash: string | null;
      readonly actualContentHash: string;
    };

/** The recorded facts the gate compares. */
export interface CompletenessInputs {
  /** The publisher's resource id, as stored on `source_records`. */
  readonly externalRecordId: string | null;
  /** `source_records.content_hash` — the digest of the bytes actually imported. */
  readonly actualContentHash: string;
  /** Snapshots persisted against that source record. */
  readonly actualRowCount: number;
  /**
   * The registry descriptor's facts about the full official resource, or null
   * when no descriptor matches the resource id.
   */
  readonly descriptor: {
    readonly officialSha256: string;
    readonly officialRowCount: number;
  } | null;
}

/**
 * Decides whether a source record represents a complete resource version.
 *
 * Note the ordering: the checksum is checked first, because a mismatched
 * checksum explains a short row count and is the more precise finding. A
 * caller reporting both would mislead.
 */
export function assessUniverseCompleteness(inputs: CompletenessInputs): CompletenessVerdict {
  const { externalRecordId, actualContentHash, actualRowCount, descriptor } = inputs;

  if (!descriptor) {
    return {
      kind: "INCOMPLETE",
      reason: "UNKNOWN_RESOURCE",
      message:
        `resource ${externalRecordId ?? "(none)"} is not in the source registry, so whether ` +
        "the ingested universe is complete cannot be established; a rank may not be derived",
      expectedRowCount: null,
      actualRowCount,
      expectedContentHash: null,
      actualContentHash,
    };
  }

  if (actualContentHash !== descriptor.officialSha256) {
    return {
      kind: "INCOMPLETE",
      reason: "CONTENT_HASH_MISMATCH",
      message:
        `the imported bytes for resource ${externalRecordId ?? "(none)"} are not the official ` +
        `resource: content_hash ${actualContentHash} does not match the registry's ` +
        `${descriptor.officialSha256}. This is what an excerpt or fixture import looks like, ` +
        `and a rank over it would be false`,
      expectedRowCount: descriptor.officialRowCount,
      actualRowCount,
      expectedContentHash: descriptor.officialSha256,
      actualContentHash,
    };
  }

  if (actualRowCount < descriptor.officialRowCount) {
    return {
      kind: "INCOMPLETE",
      reason: "ROW_COUNT_SHORT",
      message:
        `resource ${externalRecordId ?? "(none)"} matches on checksum but only ` +
        `${actualRowCount} of ${descriptor.officialRowCount} rows are persisted; the import is ` +
        "partial or was interrupted, and a rank over it would be false",
      expectedRowCount: descriptor.officialRowCount,
      actualRowCount,
      expectedContentHash: descriptor.officialSha256,
      actualContentHash,
    };
  }

  if (actualRowCount > descriptor.officialRowCount) {
    return {
      kind: "INCOMPLETE",
      reason: "ROW_COUNT_EXCESS",
      message:
        `resource ${externalRecordId ?? "(none)"} has ${actualRowCount} persisted rows against ` +
        `the registry's ${descriptor.officialRowCount}; the universe contains rows the resource ` +
        "does not, which is a finding, not something to rank over",
      expectedRowCount: descriptor.officialRowCount,
      actualRowCount,
      expectedContentHash: descriptor.officialSha256,
      actualContentHash,
    };
  }

  return { kind: "COMPLETE", universeSize: actualRowCount };
}
