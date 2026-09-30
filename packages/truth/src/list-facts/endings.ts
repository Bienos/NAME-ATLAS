/**
 * `list_endings@1` — ONE list's surnames and people by the ending of the
 * surname's spelling (TASK-043 §3, plate IV).
 *
 * The endings are the partition's fixed set (`LIST_ENDINGS`: the male list's
 * `-ski` and `-cki`, the female list's `-ska` and `-cka`, and seven shared).
 * An ending is matched on the last letters of the `canonical_key_v2`, so it
 * counts a spelling, never an origin. The set is disjoint (no ending is a
 * suffix of another), so no surname counts twice.
 */
import { LIST_ENDINGS } from "@name-atlas/contracts";
import type { ListPartition } from "@name-atlas/contracts";
import { LIST_ENDINGS_METHOD_VERSION } from "../version.js";
import { ListFactsInputError, roundListValue } from "./histogram.js";
import type { ListRow } from "./rows.js";

export interface ListEnding {
  readonly ending: string;
  readonly surnames: number;
  readonly people: number;
  readonly share_of_people: number;
}

export interface ListEndings {
  readonly method_version: string;
  readonly entries: readonly ListEnding[];
}

/**
 * The endings' figures over `rows`, whose people are `people` (the list's
 * people, a sum within the list).
 */
export function countEndings(
  rows: readonly ListRow[],
  endings: readonly string[],
  people: number,
): ListEnding[] {
  endings.forEach((a, i) =>
    endings.forEach((b, j) => {
      if (i !== j && a.endsWith(b)) {
        throw new ListFactsInputError(`the endings overlap: -${b} is a suffix of -${a}`);
      }
    }),
  );
  return endings.map((ending) => {
    let surnames = 0;
    let bearers = 0;
    for (const row of rows) {
      if (!row.key.endsWith(ending)) continue;
      surnames += 1;
      bearers += row.count;
    }
    return {
      ending,
      surnames,
      people: bearers,
      share_of_people: roundListValue(bearers / people),
    };
  });
}

export function listEndings(
  rows: readonly ListRow[],
  partition: ListPartition,
  people: number,
): ListEndings {
  return {
    method_version: LIST_ENDINGS_METHOD_VERSION,
    entries: countEndings(rows, LIST_ENDINGS[partition], people),
  };
}
