/**
 * Fail-closed parser for the PESEL regional resources (TASK-011).
 *
 * Deliberately a sibling of `parser.ts` rather than a generalisation of it:
 * the two files are different shapes with separately verified facts, and a
 * parser that accepted either by branching would be one mistake away from
 * reading a three-column file as two columns. Both share the line-ending
 * and count rules, which live in `schema.ts` and are imported, not copied.
 */
import { PeselSchemaError } from "./errors.js";
import { PESEL_DELIMITER, PESEL_LINE_TERMINATOR, PESEL_MIN_VALID_COUNT } from "./schema.js";
import {
  isPeselRegionalGeographyValue,
  PESEL_REGIONAL_COLUMN_COUNT,
  PESEL_REGIONAL_HEADER,
} from "./regional-schema.js";
import type { PeselRegionalSourceRow } from "./regional-schema.js";

const COUNT_PATTERN = /^[0-9]+$/;

/** Splits on the confirmed CRLF only; a bare LF or CR is a shape change. */
function splitLines(text: string): string[] {
  const withoutTerminators = text.replaceAll(PESEL_LINE_TERMINATOR, "");
  if (withoutTerminators.includes("\n") || withoutTerminators.includes("\r")) {
    throw new PeselSchemaError(
      "bad_line_ending",
      "found a bare LF or CR line ending outside CRLF pairs",
    );
  }
  const lines = text.split(PESEL_LINE_TERMINATOR);
  if (lines.length === 0 || lines[lines.length - 1] !== "") {
    throw new PeselSchemaError(
      "missing_trailing_terminator",
      "resource does not end with the confirmed trailing line terminator",
    );
  }
  return lines.slice(0, -1);
}

function parseDataLine(line: string, lineNumber: number): PeselRegionalSourceRow {
  const parts = line.split(PESEL_DELIMITER);
  if (parts.length !== PESEL_REGIONAL_COLUMN_COUNT) {
    throw new PeselSchemaError(
      "wrong_column_count",
      `expected ${PESEL_REGIONAL_COLUMN_COUNT} columns, found ${parts.length}`,
      lineNumber,
    );
  }
  const [geography, surname, countText] = parts as [string, string, string];

  // The 16 values are a closed set. An unrecognised value is never mapped,
  // guessed at, or passed through: without a TERC correspondence there is no
  // Place to reference, and inventing one is what D-004 forbids.
  if (!isPeselRegionalGeographyValue(geography)) {
    throw new PeselSchemaError(
      "unknown_geography_value",
      `geography column ${JSON.stringify(geography)} is not one of the 16 confirmed ` +
        "voivodeship values; a new value is a shape change, not a region to accommodate",
      lineNumber,
    );
  }
  if (surname.length === 0) {
    throw new PeselSchemaError("empty_surname", "surname column is empty", lineNumber);
  }
  if (!COUNT_PATTERN.test(countText)) {
    throw new PeselSchemaError(
      "non_numeric_count",
      `count column is not a plain non-negative integer: ${JSON.stringify(countText)}`,
      lineNumber,
    );
  }
  const count = Number.parseInt(countText, 10);
  if (count < PESEL_MIN_VALID_COUNT) {
    throw new PeselSchemaError(
      "count_below_suppression_threshold",
      `count ${count} is below the confirmed minimum valid value ${PESEL_MIN_VALID_COUNT}; ` +
        "suppression is applied per (surname, voivodeship) cell and no 0 or 1 row exists in " +
        "either regional file, so a lower value is a shape change, not a real suppressed row",
      lineNumber,
    );
  }

  // Raw strings, exactly as read: no trim, no case change, no normalisation.
  return { geography, surname, count };
}

/**
 * Parses a full regional resource from already-decoded text. Fails closed on
 * the first structural violation and never returns a partial result.
 */
export function parsePeselRegionalFile(text: string): PeselRegionalSourceRow[] {
  const lines = splitLines(text);
  const header = lines[0];
  if (header !== PESEL_REGIONAL_HEADER) {
    throw new PeselSchemaError(
      "header_mismatch",
      `header does not match the confirmed regional header exactly: ${JSON.stringify(header)}`,
      1,
    );
  }
  return lines.slice(1).map((line, index) => parseDataLine(line, index + 2));
}
