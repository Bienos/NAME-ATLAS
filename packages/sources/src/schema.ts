/**
 * Confirmed schema for the official dane.gov.pl PESEL national surname
 * resources (dataset 1681; male resource 1148808, female resource
 * 1148811; both data_date 2026-01-20).
 *
 * Every fact here was derived from the actual resource bytes supplied by
 * the project owner during TASK-002 (docs/sources/pesel.md), not assumed.
 * This module has no knowledge of Name Atlas domain concepts — it does
 * not know what a `Surname`, `Source`, `SourceRecord` or `Claim` is. It
 * describes one external file format only.
 */

/** The exact header row, byte for byte, in both the male and female files. */
export const PESEL_HEADER = "Nazwisko aktualne,Liczba";

/** The two columns, in order, as they literally appear in the header. */
export const PESEL_COLUMNS = ["Nazwisko aktualne", "Liczba"] as const;

export const PESEL_COLUMN_COUNT = PESEL_COLUMNS.length;

export const PESEL_DELIMITER = ",";

/**
 * Both resources use CRLF line endings throughout, with a trailing CRLF
 * after the final data row. A file using LF-only or CR-only line endings,
 * or missing the trailing terminator, does not match the confirmed shape.
 */
export const PESEL_LINE_TERMINATOR = "\r\n";

/**
 * The confirmed suppression rule (docs/canonical/12 §9.5): surnames
 * occurring exactly once are excluded. Confirmed directly from the
 * resource bytes — no row with Liczba <= 1 exists in either file.
 * `MIN_VALID_COUNT` is the lowest value a valid row's count may take.
 */
export const PESEL_MIN_VALID_COUNT = 2;

/**
 * One parsed, raw row from a PESEL national surname resource.
 *
 * This is source-shaped data, not a domain object. `surname` is the raw
 * "Nazwisko aktualne" string exactly as the source encodes it —
 * including any combining marks, embedded punctuation, or stray
 * whitespace the source itself contains (docs/sources/pesel.md
 * "Unicode notes"). Nothing here normalises, trims, or reinterprets it.
 */
export interface PeselSourceRow {
  readonly surname: string;
  readonly count: number;
}
