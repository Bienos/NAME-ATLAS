/**
 * The reconciliation report an import returns and the CLI prints
 * (TASK-004 §6 item 8, AC-23).
 *
 * Counts describe what the run actually did — never what it intended. On an
 * aborted run every write rolled back, so `rowsImported`, `valuesWritten`,
 * `snapshotsWritten`, `surnamesCreated` and `surnamesReused` are all zero
 * and `rowsRolledBack` says how many rows were lost with the transaction.
 */

/** Why a row could not be attached to exactly one surname. */
export type QuarantineReason =
  /** The resolver found more than one candidate surname and will not choose. */
  | "MULTIPLE_EXACT"
  /** Mixed-script input, held for human review (docs/canonical/13 §10). */
  | "REVIEW_REQUIRED"
  /** Validation-stage outcomes (docs/canonical/13 §4.1). */
  | "EMPTY"
  | "EXCEEDS_OPERATIONAL_LIMIT"
  | "MALFORMED_CONTROL_CHARACTERS";

export interface QuarantinedPeselRow {
  readonly line: number;
  /** The source string, verbatim. Never normalised for the report. */
  readonly raw: string;
  readonly canonicalKey: string;
  readonly reason: QuarantineReason;
  /** Candidate surname ids when the reason is MULTIPLE_EXACT; otherwise empty. */
  readonly candidateSurnameIds: readonly string[];
}

/** What happened to the run as a whole. */
export type PeselImportDisposition =
  /** Rows were written and the transaction committed. */
  | "IMPORTED"
  /** These exact bytes were already imported. Nothing read, nothing written. */
  | "ALREADY_IMPORTED"
  /** At least one row quarantined, so the whole run aborted (§14 U-5 answer (a)). */
  | "ABORTED_QUARANTINE";

export interface PeselImportReport {
  readonly disposition: PeselImportDisposition;
  readonly resourceRole: string;
  readonly externalRecordId: string;
  readonly contentHash: string;
  /** Data rows parsed from the file. Zero when the bytes were already imported. */
  readonly rowsRead: number;
  /** Rows that produced a committed DistributionValue. */
  readonly rowsImported: number;
  /** Rows that could not be attached to exactly one surname. */
  readonly rowsQuarantined: number;
  /** Rows lost when the run aborted, or skipped because the bytes were already imported. */
  readonly rowsRolledBack: number;
  readonly quarantinedByReason: Readonly<Partial<Record<QuarantineReason, number>>>;
  readonly quarantined: readonly QuarantinedPeselRow[];
  readonly surnamesCreated: number;
  readonly surnamesReused: number;
  readonly snapshotsWritten: number;
  readonly valuesWritten: number;
  /** The SourceRecord this run wrote, or the existing one it matched. */
  readonly sourceRecordId: string | null;
  /** Set when this run superseded a previous version of the same resource. */
  readonly supersededSourceRecordId: string | null;
}

export function tallyQuarantineReasons(
  rows: readonly QuarantinedPeselRow[],
): Readonly<Partial<Record<QuarantineReason, number>>> {
  const tally: Partial<Record<QuarantineReason, number>> = {};
  for (const row of rows) {
    tally[row.reason] = (tally[row.reason] ?? 0) + 1;
  }
  return tally;
}

/**
 * The reconciliation identity, checked as arithmetic rather than trusted.
 *
 * Every row read is accounted for exactly once:
 *
 *     rowsRead = rowsImported + rowsQuarantined + rowsRolledBack
 *
 * On a committed run `rowsRolledBack` is zero, which reduces this to
 * AC-23's `rows read = rows imported + rows quarantined`. The extra term
 * exists because the answer to §14 U-5 is to abort a run containing any
 * quarantined row: those runs import nothing, so rows that were otherwise
 * fine still have to be accounted for honestly instead of being counted as
 * "imported" when nothing was.
 */
export function reconciles(report: PeselImportReport): boolean {
  return (
    report.rowsRead === report.rowsImported + report.rowsQuarantined + report.rowsRolledBack &&
    report.rowsImported === report.valuesWritten &&
    report.rowsQuarantined === report.quarantined.length
  );
}

/** Human-readable reconciliation block for the CLI (AC-23). */
export function formatPeselImportReport(report: PeselImportReport): string {
  const lines = [
    `disposition:        ${report.disposition}`,
    `resource:           ${report.resourceRole} (external_record_id ${report.externalRecordId})`,
    `content hash:       ${report.contentHash}`,
    `rows read:          ${report.rowsRead}`,
    `rows imported:      ${report.rowsImported}`,
    `rows quarantined:   ${report.rowsQuarantined}`,
    `rows rolled back:   ${report.rowsRolledBack}`,
    `surnames created:   ${report.surnamesCreated}`,
    `surnames reused:    ${report.surnamesReused}`,
    `snapshots written:  ${report.snapshotsWritten}`,
    `values written:     ${report.valuesWritten}`,
    `source record:      ${report.sourceRecordId ?? "(none)"}`,
    `supersedes:         ${report.supersededSourceRecordId ?? "(none)"}`,
  ];
  const reasons = Object.entries(report.quarantinedByReason);
  if (reasons.length === 0) {
    lines.push("quarantined by reason: (none)");
  } else {
    lines.push("quarantined by reason:");
    for (const [reason, count] of reasons) {
      lines.push(`  ${reason}: ${String(count)}`);
    }
  }
  lines.push(`reconciles:         ${reconciles(report) ? "yes" : "NO"}`);
  return lines.join("\n");
}
