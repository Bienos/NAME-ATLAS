import {
  FULL_NAME_COMPARE_MAX_PEOPLE,
  FULL_NAME_COMPARE_MIN_PEOPLE,
} from "./full-name-compare-config.js";

/**
 * The full-name comparison's query, read (TASK-155). Pure: no database.
 *
 * Person `n` (1–4) is `f{n}` (first name) and `s{n}` (surname), the same in
 * both languages, so the language switch carries the query unchanged. Each
 * value is trimmed and bounded; a fifth person is never read.
 */

export interface TypedPerson {
  readonly given: string;
  readonly surname: string;
}

export interface FullNameRequest {
  /** Every row of the form, as typed: always four, empty where nothing was typed. */
  readonly rows: readonly TypedPerson[];
  /** The rows with both a first name and a surname, in order. */
  readonly people: readonly TypedPerson[];
  /**
   * HALF: a row has one of its two fields. NEEDS_TWO: something was typed but
   * fewer than two people are complete. Null: nothing typed, or a comparison.
   */
  readonly error: "HALF" | "NEEDS_TWO" | null;
}

/** A typed value's bound: the longest first name the lookup accepts is 60. */
const MAX_LENGTH = 80;

type Query = Readonly<Record<string, string | string[] | undefined>>;

function one(query: Query, key: string): string {
  const value = query[key];
  const raw = (Array.isArray(value) ? value[0] : value) ?? "";
  return [...raw.trim()].slice(0, MAX_LENGTH).join("");
}

export function fullNameRequest(query: Query): FullNameRequest {
  const rows: TypedPerson[] = [];
  for (let n = 1; n <= FULL_NAME_COMPARE_MAX_PEOPLE; n += 1) {
    rows.push({ given: one(query, `f${n}`), surname: one(query, `s${n}`) });
  }
  const typed = rows.filter((r) => r.given !== "" || r.surname !== "");
  const people = typed.filter((r) => r.given !== "" && r.surname !== "");
  if (people.length !== typed.length) return { rows, people, error: "HALF" };
  if (typed.length > 0 && people.length < FULL_NAME_COMPARE_MIN_PEOPLE) {
    return { rows, people, error: "NEEDS_TWO" };
  }
  return { rows, people, error: null };
}

/** The query of the rows that hold anything, for the language switch: `?f1=…&s1=…`. */
export function fullNameQuery(rows: readonly TypedPerson[]): string {
  const params = new URLSearchParams();
  rows.forEach((row, i) => {
    if (row.given === "" && row.surname === "") return;
    params.set(`f${i + 1}`, row.given);
    params.set(`s${i + 1}`, row.surname);
  });
  const query = params.toString();
  return query === "" ? "" : `?${query}`;
}
