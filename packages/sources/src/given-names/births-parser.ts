/**
 * The first-name lists by year of birth (ADR-0042, TASK-135). Two layouts:
 *
 * - `YEARS_IN_ROWS` (2000–2019): `Rok,Imię,Liczba,Płeć`, sex `M` or `K`;
 * - `ONE_YEAR` (2020 on): name, sex, count, one year and one sex per file.
 *
 * Fails closed on any change of shape, as the TASK-078 parser does: CRLF only,
 * the exact header, the column count, a known year and sex, a plain count no
 * lower than the year's publication cut-off, and every expected (year, sex)
 * list present with no other. The name is returned exactly as read.
 */
import { PeselSchemaError } from "../errors.js";
import { COUNT_PATTERN, splitPeselLines } from "../parser.js";
import { BIRTH_NAMES_YEARS_SEX_VALUES, birthListPublicationThreshold } from "./births-registry.js";
import type { BirthListSex, BirthNameResourceDescriptor } from "./births-registry.js";

export interface BirthNameRow {
  readonly name: string;
  readonly count: number;
  /** The row's line in the file, the header being line 1. */
  readonly line: number;
}

/** One year's list for one sex, in file order. */
export interface BirthNameList {
  readonly birthYear: number;
  readonly sex: BirthListSex;
  /** The publisher's cut-off for the year: a lower count is never on the list. */
  readonly publicationThreshold: number;
  readonly rows: readonly BirthNameRow[];
}

const YEAR_PATTERN = /^[0-9]{4}$/;

function parseCount(text: string, birthYear: number, line: number): number {
  if (!COUNT_PATTERN.test(text)) {
    throw new PeselSchemaError(
      "non_numeric_count",
      `count column is not a plain non-negative integer: ${JSON.stringify(text)}`,
      line,
    );
  }
  const count = Number.parseInt(text, 10);
  const threshold = birthListPublicationThreshold(birthYear);
  if (count < threshold) {
    throw new PeselSchemaError(
      "count_below_publication_threshold",
      `count ${count} is below ${threshold}, the publisher's cut-off for ${birthYear}`,
      line,
    );
  }
  return count;
}

export function parseBirthNameFile(
  text: string,
  resource: BirthNameResourceDescriptor,
): BirthNameList[] {
  const lines = splitPeselLines(text);
  if (lines.length === 0) throw new PeselSchemaError("empty_file", "resource has no header row");
  const [header, ...dataLines] = lines as [string, ...string[]];
  if (header !== resource.header) {
    throw new PeselSchemaError(
      "unexpected_header",
      `expected header ${JSON.stringify(resource.header)}, found ${JSON.stringify(header)}`,
      1,
    );
  }

  const lists = new Map<string, { birthYear: number; sex: BirthListSex; rows: BirthNameRow[] }>();
  const listOf = (birthYear: number, sex: BirthListSex, line: number) => {
    if (!resource.years.includes(birthYear)) {
      throw new PeselSchemaError(
        "unexpected_year",
        `year ${birthYear} is not one this resource holds`,
        line,
      );
    }
    if (!resource.sexes.includes(sex)) {
      throw new PeselSchemaError(
        "unexpected_sex",
        `sex ${sex} is not one this resource holds`,
        line,
      );
    }
    const key = `${birthYear}:${sex}`;
    let list = lists.get(key);
    if (list === undefined) {
      list = { birthYear, sex, rows: [] };
      lists.set(key, list);
    }
    return list;
  };

  dataLines.forEach((line, index) => {
    const lineNumber = index + 2;
    const parts = line.split(",");
    if (resource.layout === "YEARS_IN_ROWS") {
      if (parts.length !== 4) {
        throw new PeselSchemaError(
          "wrong_column_count",
          `expected 4 columns, found ${parts.length}`,
          lineNumber,
        );
      }
      const [yearText, name, countText, sexText] = parts as [string, string, string, string];
      if (!YEAR_PATTERN.test(yearText)) {
        throw new PeselSchemaError(
          "non_numeric_year",
          `year column is not a four-digit year: ${JSON.stringify(yearText)}`,
          lineNumber,
        );
      }
      const birthYear = Number.parseInt(yearText, 10);
      const sex = BIRTH_NAMES_YEARS_SEX_VALUES[sexText];
      if (sex === undefined) {
        throw new PeselSchemaError(
          "unexpected_sex",
          `expected "M" or "K", found ${JSON.stringify(sexText)}`,
          lineNumber,
        );
      }
      if (name.length === 0) {
        throw new PeselSchemaError("empty_name", "name column is empty", lineNumber);
      }
      const count = parseCount(countText, birthYear, lineNumber);
      listOf(birthYear, sex, lineNumber).rows.push({ name, count, line: lineNumber });
    } else {
      if (parts.length !== 3) {
        throw new PeselSchemaError(
          "wrong_column_count",
          `expected 3 columns, found ${parts.length}`,
          lineNumber,
        );
      }
      const [name, sexText, countText] = parts as [string, string, string];
      if (name.length === 0) {
        throw new PeselSchemaError("empty_name", "name column is empty", lineNumber);
      }
      if (sexText !== resource.sex_value) {
        throw new PeselSchemaError(
          "unexpected_sex",
          `expected ${JSON.stringify(resource.sex_value)} on every row, found ${JSON.stringify(sexText)}`,
          lineNumber,
        );
      }
      const [birthYear] = resource.years as [number];
      const [sex] = resource.sexes as [BirthListSex];
      const count = parseCount(countText, birthYear, lineNumber);
      listOf(birthYear, sex, lineNumber).rows.push({ name, count, line: lineNumber });
    }
  });

  // Every expected list must be there: a year or a sex gone missing is a shape change.
  const out: BirthNameList[] = [];
  for (const birthYear of resource.years) {
    for (const sex of resource.sexes) {
      const list = lists.get(`${birthYear}:${sex}`);
      if (list === undefined) {
        throw new PeselSchemaError(
          "missing_list",
          `the resource holds no rows for ${birthYear}, ${sex}`,
        );
      }
      out.push({ ...list, publicationThreshold: birthListPublicationThreshold(birthYear) });
    }
  }
  return out;
}
