/**
 * `list_hyphenated@1` — ONE list's surnames whose key holds a hyphen, their
 * people, and ADR-0018 `HYPHENATED_TOP`: the most common of them, named at
 * or above the floor (TASK-043 §3, plate I).
 *
 * `canonical_key_v2` maps every dash-like character to `-`, so an en dash in
 * a source string counts as the hyphen it stands for; a space does not.
 */
import { LIST_HYPHENATED_METHOD_VERSION } from "../version.js";
import type { ListRow } from "./rows.js";
import { selectFirst } from "./selections.js";
import type { NamedSurname } from "./selections.js";

export interface ListHyphenated {
  readonly method_version: string;
  readonly surnames: number;
  readonly people: number;
  readonly top: NamedSurname | null;
}

const hyphenated = (row: ListRow): boolean => row.key.includes("-");

/** `rows` must be in selection order. */
export function listHyphenated(rows: readonly ListRow[]): ListHyphenated {
  let surnames = 0;
  let people = 0;
  for (const row of rows) {
    if (!hyphenated(row)) continue;
    surnames += 1;
    people += row.count;
  }
  return {
    method_version: LIST_HYPHENATED_METHOD_VERSION,
    surnames,
    people,
    top: selectFirst(rows, hyphenated),
  };
}
