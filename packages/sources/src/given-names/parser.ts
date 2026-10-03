/**
 * The PESEL first-name files (ADR-0032, TASK-078): CRLF lines, a header, and
 * three columns — the name, the list's sex, the count. Fails closed on any
 * change of shape, as the surname parser does. The name is returned exactly as
 * read: no trim, no case change, no normalisation.
 */
import { PeselSchemaError } from "../errors.js";
import { COUNT_PATTERN, splitPeselLines } from "../parser.js";
import { PESEL_MIN_VALID_COUNT } from "../schema.js";
import { GIVEN_NAMES_FIRST_HEADER } from "./registry.js";
import type { GivenNameResourceDescriptor } from "./registry.js";

export interface GivenNameSourceRow {
  readonly name: string;
  readonly count: number;
  /** The row's line in the file, the header being line 1. */
  readonly line: number;
}

export function parseGivenNameFile(
  text: string,
  resource: Pick<GivenNameResourceDescriptor, "sex_value">,
): GivenNameSourceRow[] {
  const lines = splitPeselLines(text);
  if (lines.length === 0) throw new PeselSchemaError("empty_file", "resource has no header row");
  const [header, ...dataLines] = lines as [string, ...string[]];
  if (header !== GIVEN_NAMES_FIRST_HEADER) {
    throw new PeselSchemaError(
      "unexpected_header",
      `expected header ${JSON.stringify(GIVEN_NAMES_FIRST_HEADER)}, found ${JSON.stringify(header)}`,
      1,
    );
  }
  return dataLines.map((line, index) => {
    const lineNumber = index + 2;
    const parts = line.split(",");
    if (parts.length !== 3) {
      throw new PeselSchemaError(
        "wrong_column_count",
        `expected 3 columns, found ${parts.length}`,
        lineNumber,
      );
    }
    const [name, sex, countText] = parts as [string, string, string];
    if (name.length === 0)
      throw new PeselSchemaError("empty_name", "name column is empty", lineNumber);
    if (sex !== resource.sex_value) {
      throw new PeselSchemaError(
        "unexpected_sex",
        `expected ${JSON.stringify(resource.sex_value)} on every row, found ${JSON.stringify(sex)}`,
        lineNumber,
      );
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
        `count ${count} is below ${PESEL_MIN_VALID_COUNT}: the publisher leaves out single occurrences`,
        lineNumber,
      );
    }
    return { name, count, line: lineNumber };
  });
}
