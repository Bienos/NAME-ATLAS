import type { PeselSourceRow } from "./schema.js";

/**
 * Selecting part of an official resource, for an environment too small to
 * hold all of it (`docs/LOCAL_DATABASE.md`).
 *
 * **A slice never makes a partial import look complete.** The importer still
 * reads, checksums and counts the whole official file; a slice only decides
 * which parsed rows are persisted. The universe completeness gate
 * (`packages/truth/src/completeness.ts`) then compares persisted rows against
 * the registry's `official_row_count`, finds `ROW_COUNT_SHORT`, and withholds
 * rank and rarity with `NO_COMPLETE_UNIVERSE`. That gate is unconditional —
 * TASK-009 AC-03 asserts no flag can pass it — and this module deliberately
 * adds none. Counts stay true because a count needs no universe; the figures
 * that need one are refused rather than computed over the fragment.
 */
export type SliceSpec =
  | {
      /** Keep the `count` rows with the largest counts. */
      readonly kind: "TOP";
      readonly count: number;
    }
  | {
      /** Keep rows whose first letter folds into `[from, to]`, inclusive. */
      readonly kind: "PREFIX";
      readonly from: string;
      readonly to: string;
    };

/**
 * Polish letters that NFD does not decompose, mapped to the base letter a
 * reader means by "surnames starting with L". Every other Polish diacritic
 * (Ą Ć Ę Ń Ó Ś Ź Ż) decomposes, so stripping combining marks handles it.
 */
const INDECOMPOSABLE: Readonly<Record<string, string>> = { Ł: "L", ł: "L" };

/**
 * The letter a surname files under: NFD, combining marks removed, uppercased.
 * Returns null for a surname whose first character is not a letter — such a
 * row is never in an alphabetical range, and guessing would be invention.
 */
export function filingLetter(surname: string): string | null {
  const first = [...surname.normalize("NFC").trim()][0];
  if (first === undefined) return null;
  const mapped = INDECOMPOSABLE[first];
  if (mapped !== undefined) return mapped;
  const folded = first.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  return /^[A-Z]$/u.test(folded) ? folded : null;
}

/** Thrown for a slice expression this module cannot read. */
export class SliceSpecError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SliceSpecError";
  }
}

/**
 * Reads `top:N` or `prefix:A-F`. Fails closed: an unreadable expression is an
 * error, never a silently ignored filter that would import everything.
 */
export function parseSliceSpec(raw: string): SliceSpec {
  const top = /^top:(\d+)$/u.exec(raw);
  if (top?.[1] !== undefined) {
    const count = Number(top[1]);
    if (count <= 0) throw new SliceSpecError(`top:N needs N > 0, got ${raw}`);
    return { kind: "TOP", count };
  }
  const prefix = /^prefix:([A-Za-z])-([A-Za-z])$/u.exec(raw);
  if (prefix?.[1] !== undefined && prefix[2] !== undefined) {
    const from = prefix[1].toUpperCase();
    const to = prefix[2].toUpperCase();
    if (from > to) throw new SliceSpecError(`prefix:FROM-TO needs FROM <= TO, got ${raw}`);
    return { kind: "PREFIX", from, to };
  }
  throw new SliceSpecError(`unreadable slice ${JSON.stringify(raw)}; expected top:N or prefix:A-F`);
}

/** One parsed row and the 1-based line of the file it came from. */
export interface LinedRow {
  readonly row: PeselSourceRow;
  readonly line: number;
}

/**
 * Splits rows into those the slice keeps and those it excludes.
 *
 * **Input order is preserved in `kept`.** Line numbers travel with the row
 * rather than being recomputed from a position, because a reader told
 * "line 47" about a row that sits at line 338,202 has been told something
 * false — and the mixed-script findings this importer reports are located by
 * exactly that number.
 *
 * `TOP` breaks ties on count by surname, ascending, so a given file and a
 * given N always yield the same slice.
 */
export function applySlice(
  rows: readonly LinedRow[],
  spec: SliceSpec,
): { readonly kept: readonly LinedRow[]; readonly excluded: number } {
  const keep = new Set<number>();
  if (spec.kind === "TOP") {
    const ranked = [...rows].sort(
      (a, b) => b.row.count - a.row.count || a.row.surname.localeCompare(b.row.surname, "pl"),
    );
    for (const entry of ranked.slice(0, spec.count)) keep.add(entry.line);
  } else {
    for (const entry of rows) {
      const letter = filingLetter(entry.row.surname);
      if (letter !== null && letter >= spec.from && letter <= spec.to) keep.add(entry.line);
    }
  }
  const kept = rows.filter((entry) => keep.has(entry.line));
  return { kept, excluded: rows.length - kept.length };
}
