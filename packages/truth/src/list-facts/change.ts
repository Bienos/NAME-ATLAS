/**
 * `list_change@1` — one list's first edition against its last (ADR-0019
 * §2.3, TASK-044 §1): what changed, never why.
 *
 * Surnames are compared by `canonical_key_v2`, exactly: `ŁUCZAK` and
 * `LUCZAK` are two surnames. A surname on one edition only is "not on the
 * list" on the other, never zero people: it may be below the publisher's
 * floor there. Every figure is an integer, and every difference is taken
 * here and stored, so no page subtracts.
 *
 * Both editions are of the same list. Nothing here can be given the other
 * list, and nothing here adds two editions.
 */
import { LIST_CHANGE_METHOD_VERSION, LIST_CHANGE_TOP_SIZE } from "../version.js";
import type { EditionFigures } from "./editions.js";
import { ListFactsInputError } from "./histogram.js";
import type { ListRow } from "./rows.js";
import { assertSelectionOrder } from "./selections.js";

export interface ListChange {
  readonly method_version: string;
  readonly first_data_date: string;
  readonly last_data_date: string;
  readonly surnames_first: number;
  readonly surnames_last: number;
  readonly surnames_delta: number;
  readonly people_first: number;
  readonly people_last: number;
  readonly people_delta: number;
  readonly on_last_not_first: { readonly surnames: number; readonly people: number };
  readonly on_first_not_last: { readonly surnames: number; readonly people_on_first: number };
  readonly top3_first_counts: readonly {
    readonly key: string;
    readonly count_first: number | null;
  }[];
  readonly top10_unchanged: boolean;
}

/** An edition's figures and its keyed rows in selection order. */
export interface EditionRows {
  readonly edition: EditionFigures;
  readonly rows: readonly ListRow[];
}

function checked({ edition, rows }: EditionRows): Map<string, number> {
  assertSelectionOrder(rows);
  const byKey = new Map(rows.map((row) => [row.key, row.count]));
  if (byKey.size !== rows.length || rows.length !== edition.surnames) {
    throw new ListFactsInputError(
      `edition ${edition.resource_id}: its rows must be its ${edition.surnames} surnames, each key once`,
    );
  }
  return byKey;
}

/**
 * The change from `first` to `last`. `namedTop` is the last edition's
 * ADR-0018 `TOP_3` (`named_top.items`); each one's count on the first
 * edition is stored, or null when it is not on the first edition.
 */
export function listChange(
  first: EditionRows,
  last: EditionRows,
  namedTop: readonly { readonly key: string }[],
): ListChange {
  if (!(first.edition.data_date < last.edition.data_date)) {
    throw new ListFactsInputError("the first edition must come before the last");
  }
  const firstByKey = checked(first);
  const lastByKey = checked(last);
  for (const item of namedTop) {
    if (!lastByKey.has(item.key)) {
      throw new ListFactsInputError(`named surname ${item.key} is not on the last edition`);
    }
  }

  let newSurnames = 0;
  let newPeople = 0;
  for (const row of last.rows) {
    if (!firstByKey.has(row.key)) {
      newSurnames += 1;
      newPeople += row.count;
    }
  }
  let goneSurnames = 0;
  let gonePeople = 0;
  for (const row of first.rows) {
    if (!lastByKey.has(row.key)) {
      goneSurnames += 1;
      gonePeople += row.count;
    }
  }

  const topKeys = (rows: readonly ListRow[]) =>
    rows.slice(0, LIST_CHANGE_TOP_SIZE).map((row) => row.key);
  const topFirst = topKeys(first.rows);
  const topLast = topKeys(last.rows);

  return {
    method_version: LIST_CHANGE_METHOD_VERSION,
    first_data_date: first.edition.data_date,
    last_data_date: last.edition.data_date,
    surnames_first: first.edition.surnames,
    surnames_last: last.edition.surnames,
    surnames_delta: last.edition.surnames - first.edition.surnames,
    people_first: first.edition.people,
    people_last: last.edition.people,
    people_delta: last.edition.people - first.edition.people,
    on_last_not_first: { surnames: newSurnames, people: newPeople },
    on_first_not_last: { surnames: goneSurnames, people_on_first: gonePeople },
    top3_first_counts: namedTop.map((item) => ({
      key: item.key,
      count_first: firstByKey.get(item.key) ?? null,
    })),
    top10_unchanged:
      topFirst.length === topLast.length && topFirst.every((key, i) => key === topLast[i]),
  };
}
