/**
 * ADR-0018's named selections over ONE list (TASK-043 §3): the rules that
 * may put a surname string on the landing page.
 *
 * Each rule runs over the rows in selection order (count descending, ties by
 * key in code-point order), so a selection is deterministic. A selection
 * below `NAMED_SURNAME_FLOOR` people is not named: the generator stores no
 * name for it.
 */
import { LIST_NAMED_TOP_SIZE, NAMED_SURNAME_FLOOR } from "@name-atlas/contracts";
import { LIST_NAMED_TOP_METHOD_VERSION } from "../version.js";
import { ListFactsInputError } from "./histogram.js";
import { selectionOrder } from "./rows.js";
import type { ListRow } from "./rows.js";

export interface NamedSurname {
  readonly key: string;
  readonly published: string;
  readonly count: number;
}

export interface ListNamedTop {
  readonly method_version: string;
  readonly items: readonly NamedSurname[];
}

/** True when `count` people are enough to name a surname (ADR-0018 §2.2). */
export function namable(count: number): boolean {
  return count >= NAMED_SURNAME_FLOOR;
}

/** The stored form of a selected row: key, source string, count. */
export function named(row: ListRow): NamedSurname {
  return { key: row.key, published: row.published, count: row.count };
}

/** Throws unless `rows` are in selection order: every rule below relies on it. */
export function assertSelectionOrder(rows: readonly ListRow[]): void {
  for (let i = 1; i < rows.length; i++) {
    if (selectionOrder(rows[i - 1]!, rows[i]!) >= 0) {
      throw new ListFactsInputError("the rows are not in selection order");
    }
  }
}

/**
 * The first row in selection order that `accepts`, named if it is at or
 * above the floor; null when there is none, or when it is below the floor.
 */
export function selectFirst(
  rows: readonly ListRow[],
  accepts: (row: ListRow) => boolean,
): NamedSurname | null {
  const row = rows.find(accepts);
  return row !== undefined && namable(row.count) ? named(row) : null;
}

/** `TOP_3`: the list's three most common surnames, those at or above the floor. */
export function listNamedTop(rows: readonly ListRow[]): ListNamedTop {
  return {
    method_version: LIST_NAMED_TOP_METHOD_VERSION,
    items: rows
      .slice(0, LIST_NAMED_TOP_SIZE)
      .filter((row) => namable(row.count))
      .map(named),
  };
}
