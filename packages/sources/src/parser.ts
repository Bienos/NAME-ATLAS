import { PeselSchemaError } from "./errors.js";
import {
  PESEL_COLUMN_COUNT,
  PESEL_DELIMITER,
  PESEL_HEADER,
  PESEL_LINE_TERMINATOR,
  PESEL_MIN_VALID_COUNT,
} from "./schema.js";
import type { PeselSourceRow } from "./schema.js";

const COUNT_PATTERN = /^[0-9]+$/;

/**
 * Splits decoded resource text into lines on the confirmed CRLF
 * terminator only. Fails closed if a bare LF or CR is found anywhere —
 * both confirmed source files use CRLF exclusively, with no stray
 * LF-only or CR-only line (docs/sources/pesel.md).
 *
 * The trailing terminator after the last data row (confirmed present in
 * both files) produces one trailing empty string, which is dropped; any
 * other empty line is a violation, not a trailing artefact.
 */
function splitPeselLines(text: string): string[] {
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

function parseDataLine(line: string, lineNumber: number): PeselSourceRow {
  const parts = line.split(PESEL_DELIMITER);
  if (parts.length !== PESEL_COLUMN_COUNT) {
    throw new PeselSchemaError(
      "wrong_column_count",
      `expected ${PESEL_COLUMN_COUNT} columns, found ${parts.length}`,
      lineNumber,
    );
  }

  const [surname, countText] = parts as [string, string];
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
      `count ${count} is below the confirmed minimum valid value ${PESEL_MIN_VALID_COUNT} ` +
        "(the source excludes single-occurrence surnames; a lower value is a shape change, not a real suppressed row)",
      lineNumber,
    );
  }

  // Raw surname text is returned exactly as read: no trim, no case
  // change, no Unicode normalisation. This module preserves the source
  // byte-for-byte at the string level (ARCHITECTURE.md invariant 6/8;
  // docs/sources/pesel.md "Unicode notes").
  return { surname, count };
}

/**
 * Parses a full PESEL national surname resource from already-decoded
 * text. Fails closed on the first structural violation — the header not
 * matching exactly, a data row with the wrong column count, an empty
 * surname, a non-numeric or out-of-range count, or a line-ending problem.
 * This function never returns a partially valid result: either every row
 * conforms to the confirmed schema, or it throws {@link PeselSchemaError}.
 */
export function parsePeselFile(text: string): PeselSourceRow[] {
  const lines = splitPeselLines(text);
  if (lines.length === 0) {
    throw new PeselSchemaError("empty_file", "resource has no header row");
  }

  const [header, ...dataLines] = lines as [string, ...string[]];
  if (header !== PESEL_HEADER) {
    throw new PeselSchemaError(
      "unexpected_header",
      `expected header ${JSON.stringify(PESEL_HEADER)}, found ${JSON.stringify(header)}`,
      1,
    );
  }

  return dataLines.map((line, index) => parseDataLine(line, index + 2));
}
