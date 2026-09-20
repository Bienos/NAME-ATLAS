/**
 * Typed failure outcomes for PESEL ingestion (TASK-004 §10).
 *
 * Every failure mode in §10 is a named reason code on one of these errors.
 * Nothing escapes as an untyped exception, nothing is a silent skip, and no
 * failure leaves a partial write behind.
 */

/** Why an import refused to run or aborted. One code per §10 row. */
export type PeselImportErrorCode =
  /** The expected SHA-256 did not match the bytes on disk. Raised before parsing. */
  | "checksum_mismatch"
  /** The file could not be read at all. Raised before any database connection. */
  | "file_unreadable"
  /** Two data rows in one file share a canonical key (TASK-004 AC-19). */
  | "duplicate_canonical_key"
  /** The effective RightsProfile forbids automated ingestion (docs/canonical/12 §6.4). */
  | "rights_gate"
  /** The resolver could not reach the database. An outage, never an unknown surname. */
  | "resolver_lookup_failed"
  /** A database error inside the write transaction. The transaction rolled back. */
  | "database_failure";

/*
 * There is deliberately no code for "a row was quarantined". A quarantine is
 * reported, not thrown: the run's disposition is recorded on the
 * reconciliation report (TASK-004 §14 U-5), so the caller always receives the
 * quarantined rows and their reasons rather than an exception that loses them.
 */

/**
 * Raised by the PESEL importer for every condition in TASK-004 §10 other
 * than source-shape drift, which stays `PeselSchemaError` from the existing
 * validator so the parsing contract has exactly one error type.
 */
export class PeselImportError extends Error {
  readonly reasonCode: PeselImportErrorCode;
  /** Set when a specific data line caused the failure. */
  readonly line: number | undefined;

  constructor(reasonCode: PeselImportErrorCode, message: string, line?: number) {
    super(line === undefined ? message : `line ${line}: ${message}`);
    this.name = "PeselImportError";
    this.reasonCode = reasonCode;
    this.line = line;
  }
}
