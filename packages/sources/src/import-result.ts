/**
 * Typed outcomes for a PESEL resource import (TASK-004 §10).
 *
 * Every failure mode is a named value, never an exception that escapes
 * untyped and never a silent skip. A caller must handle the union; there is
 * no "it probably worked" path.
 */

/** Why a row could not be turned into canonical data. Never guessed away. */
export interface QuarantinedRow {
  /** 1-based line number in the source file, header included. */
  readonly line: number;
  /** The source surname string, exactly as read. */
  readonly surname: string;
  /** The resolver's own status, e.g. MULTIPLE_EXACT / REVIEW_REQUIRED. */
  readonly reason: string;
}

/**
 * A row imported WITH a review finding rather than refused (TASK-010,
 * docs/canonical/13 §10.4). Stored verbatim; the finding is persisted on the
 * surname as `mixed_script` / `script_confusable_flag`.
 */
export interface FlaggedRow {
  /** 1-based line number in the source file, header included. */
  readonly line: number;
  /** The source surname string, exactly as read. */
  readonly surname: string;
}

/**
 * What an import actually did, in numbers that must reconcile.
 *
 * `rowsRead === rowsImported + rowsQuarantined` is asserted by the importer
 * itself, not only by a test (AC-23).
 */
export interface ReconciliationReport {
  readonly resourceId: string;
  readonly rowsRead: number;
  readonly rowsImported: number;
  readonly rowsQuarantined: number;
  readonly quarantinedByReason: Readonly<Record<string, number>>;
  readonly surnamesCreated: number;
  readonly surnamesReused: number;
  readonly snapshotsWritten: number;
  readonly valuesWritten: number;
  /**
   * Rows imported with a `MIXED_SCRIPT_REVIEW` finding. Counted inside
   * `rowsImported`, never inside `rowsQuarantined`: they are stored.
   */
  readonly mixedScriptRows: readonly FlaggedRow[];
}

export type ImportFailureReason =
  /** Effective rights forbid running the connector at all. */
  | "RIGHTS_BLOCKED"
  /** Bytes do not match the expected SHA-256. Detected before parsing. */
  | "CHECKSUM_MISMATCH"
  /** The file violates the confirmed PESEL shape (PeselSchemaError). */
  | "SCHEMA_VIOLATION"
  /** Two rows in one file share a canonical key — shape change, not data. */
  | "DUPLICATE_CANONICAL_KEY"
  /** At least one row could not be resolved unambiguously (U-5 option (a)). */
  | "UNRESOLVED_ROWS"
  /** The resolver could not reach the database. Infrastructure, not data. */
  | "RESOLVER_LOOKUP_FAILED"
  /** The write transaction failed and rolled back. */
  | "DATABASE_ERROR";

export type ImportOutcome =
  | {
      readonly kind: "IMPORTED";
      readonly sourceRecordId: string;
      /** Set when this import superseded an earlier version of the resource. */
      readonly supersededSourceRecordId: string | null;
      readonly report: ReconciliationReport;
    }
  | {
      readonly kind: "ALREADY_IMPORTED";
      readonly sourceRecordId: string;
      readonly report: ReconciliationReport;
    }
  | {
      readonly kind: "FAILED";
      readonly reason: ImportFailureReason;
      readonly message: string;
      /** Present for UNRESOLVED_ROWS; empty otherwise. */
      readonly quarantined: readonly QuarantinedRow[];
      /** Present when enough of the run completed to count anything. */
      readonly report: ReconciliationReport | null;
      readonly cause?: unknown;
    };

/** An empty report for a resource, used when a run fails before counting. */
export function emptyReport(resourceId: string): ReconciliationReport {
  return {
    resourceId,
    rowsRead: 0,
    rowsImported: 0,
    rowsQuarantined: 0,
    quarantinedByReason: {},
    surnamesCreated: 0,
    surnamesReused: 0,
    snapshotsWritten: 0,
    valuesWritten: 0,
    mixedScriptRows: [],
  };
}

/** Tallies quarantine reasons into the shape the report carries. */
export function tallyReasons(rows: readonly QuarantinedRow[]): Record<string, number> {
  const tally: Record<string, number> = {};
  for (const row of rows) {
    tally[row.reason] = (tally[row.reason] ?? 0) + 1;
  }
  return tally;
}

/**
 * Proves the report's arithmetic before anyone reads it (AC-23). A report
 * that does not reconcile is a bug in the importer, so this throws rather
 * than returning a value a caller might ignore.
 */
export function assertReconciles(report: ReconciliationReport): void {
  if (report.rowsRead !== report.rowsImported + report.rowsQuarantined) {
    throw new Error(
      `reconciliation failed for ${report.resourceId}: rowsRead=${report.rowsRead} ` +
        `!= rowsImported=${report.rowsImported} + rowsQuarantined=${report.rowsQuarantined}`,
    );
  }
  const tallied = Object.values(report.quarantinedByReason).reduce((a, b) => a + b, 0);
  if (tallied !== report.rowsQuarantined) {
    throw new Error(
      `reconciliation failed for ${report.resourceId}: quarantine tally=${tallied} ` +
        `!= rowsQuarantined=${report.rowsQuarantined}`,
    );
  }
}

/**
 * What a regional import did (TASK-011). A separate shape from
 * {@link ReconciliationReport} on purpose: the facts differ, and a widened
 * national report would invite reading a regional figure as a national one.
 *
 * `rowsRead === rowsImported + rowsQuarantined` still holds. `valuesWritten`
 * counts (surname, voivodeship) cells; `snapshotsWritten` counts surnames,
 * since a `DistributionSnapshot` is surname-scoped.
 */
export interface RegionalReconciliationReport {
  readonly resourceId: string;
  readonly rowsRead: number;
  readonly rowsImported: number;
  readonly rowsQuarantined: number;
  readonly quarantinedByReason: Readonly<Record<string, number>>;
  readonly surnamesCreated: number;
  readonly surnamesReused: number;
  readonly snapshotsWritten: number;
  readonly valuesWritten: number;
  /** Distinct voivodeship places referenced. 16 for a complete resource. */
  readonly placesReferenced: number;
  readonly mixedScriptRows: readonly FlaggedRow[];
  /**
   * The sum of every count in this resource, **reported, never asserted as
   * equal to anything**. TASK-008 established the one supported invariant:
   * a surname's regional sum is at most its national count, with a large
   * residual the voivodeships do not account for.
   */
  readonly regionalCountSum: number;
  /** Surnames present regionally with no national row. TASK-008 observed 0. */
  readonly surnamesWithoutNationalRow: number;
}

export type RegionalImportOutcome =
  | {
      readonly kind: "IMPORTED";
      readonly sourceRecordId: string;
      readonly supersededSourceRecordId: string | null;
      readonly report: RegionalReconciliationReport;
    }
  | {
      readonly kind: "ALREADY_IMPORTED";
      readonly sourceRecordId: string;
      readonly report: RegionalReconciliationReport;
    }
  | {
      readonly kind: "FAILED";
      readonly reason: ImportFailureReason;
      readonly message: string;
      readonly quarantined: readonly QuarantinedRow[];
      readonly report: RegionalReconciliationReport | null;
      readonly cause?: unknown;
    };

/** An empty regional report, used when a run fails before counting. */
export function emptyRegionalReport(resourceId: string): RegionalReconciliationReport {
  return {
    resourceId,
    rowsRead: 0,
    rowsImported: 0,
    rowsQuarantined: 0,
    quarantinedByReason: {},
    surnamesCreated: 0,
    surnamesReused: 0,
    snapshotsWritten: 0,
    valuesWritten: 0,
    placesReferenced: 0,
    mixedScriptRows: [],
    regionalCountSum: 0,
    surnamesWithoutNationalRow: 0,
  };
}

/** The same arithmetic guard as {@link assertReconciles}, for a regional run. */
export function assertRegionalReconciles(report: RegionalReconciliationReport): void {
  if (report.rowsRead !== report.rowsImported + report.rowsQuarantined) {
    throw new Error(
      `regional reconciliation failed for ${report.resourceId}: rowsRead ${report.rowsRead} !== ` +
        `rowsImported ${report.rowsImported} + rowsQuarantined ${report.rowsQuarantined}`,
    );
  }
  if (report.rowsImported > 0 && report.valuesWritten !== report.rowsImported) {
    throw new Error(
      `regional reconciliation failed for ${report.resourceId}: valuesWritten ` +
        `${report.valuesWritten} !== rowsImported ${report.rowsImported}; every imported row is ` +
        "exactly one (surname, voivodeship) value",
    );
  }
}
