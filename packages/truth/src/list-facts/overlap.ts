/**
 * `list_overlap@1` — the two lists' sets of surnames compared (ADR-0018
 * §2.3, TASK-043 §3, plate VI): the one comparison across the two lists the
 * artefact holds.
 *
 * Surnames are compared by `canonical_key_v2`, exactly: `ŁUCZAK` and
 * `LUCZAK` are two surnames. The figures are counts of surnames, never of
 * people; nothing here adds the people of the two lists.
 *
 *   - `ON_BOTH_TOP`: the male list's most common surname that is also on the
 *     female list, with its source string and count on each list; named only
 *     if both counts are at or above the floor.
 *   - `ONE_LIST_TOP`: each list's most common surname absent from the other.
 */
import { LIST_OVERLAP_METHOD_VERSION } from "../version.js";
import { ListFactsInputError } from "./histogram.js";
import type { ListRow } from "./rows.js";
import { assertSelectionOrder, namable, selectFirst } from "./selections.js";
import type { NamedSurname } from "./selections.js";

export interface OnBothTop {
  readonly key: string;
  readonly male: { readonly published: string; readonly count: number };
  readonly female: { readonly published: string; readonly count: number };
}

export interface ListOverlap {
  readonly method_version: string;
  readonly male_only: number;
  readonly both: number;
  readonly female_only: number;
  readonly on_both_top: OnBothTop | null;
  readonly one_list_top: {
    readonly male: NamedSurname | null;
    readonly female: NamedSurname | null;
  };
}

/** Both lists' rows must be in selection order, each key once per list. */
export function listOverlap(male: readonly ListRow[], female: readonly ListRow[]): ListOverlap {
  assertSelectionOrder(male);
  assertSelectionOrder(female);
  const femaleByKey = new Map(female.map((row) => [row.key, row]));
  const maleKeys = new Set(male.map((row) => row.key));
  if (maleKeys.size !== male.length || femaleByKey.size !== female.length) {
    throw new ListFactsInputError("a key appears twice on one list");
  }

  let both = 0;
  for (const row of male) if (femaleByKey.has(row.key)) both += 1;

  const onBoth = male.find((row) => femaleByKey.has(row.key));
  const onBothFemale = onBoth === undefined ? undefined : femaleByKey.get(onBoth.key);
  const on_both_top =
    onBoth !== undefined &&
    onBothFemale !== undefined &&
    namable(onBoth.count) &&
    namable(onBothFemale.count)
      ? {
          key: onBoth.key,
          male: { published: onBoth.published, count: onBoth.count },
          female: { published: onBothFemale.published, count: onBothFemale.count },
        }
      : null;

  return {
    method_version: LIST_OVERLAP_METHOD_VERSION,
    male_only: male.length - both,
    both,
    female_only: female.length - both,
    on_both_top,
    one_list_top: {
      male: selectFirst(male, (row) => !femaleByKey.has(row.key)),
      female: selectFirst(female, (row) => !maleKeys.has(row.key)),
    },
  };
}
