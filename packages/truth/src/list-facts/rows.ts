/**
 * The keyed rows of one published list (TASK-043, ADR-0018): each surname's
 * `canonical_key_v2`, its source string exactly as published, and its count.
 *
 * `list_facts_pipeline@1` dropped the surname column straight after parsing.
 * `@2` keeps it for the methods that need the spelling (endings, initials,
 * hyphens) and for ADR-0018's named selections and overlap. Identity is the
 * exact key (`canonicalKey`), never a Polish fold: `ŁUCZAK` and `LUCZAK` stay
 * two surnames.
 *
 * One list only. Nothing here accepts, or can be given, two lists at once.
 */
import { canonicalKey } from "@name-atlas/resolver";
import { ListFactsInputError } from "./histogram.js";

export interface ListRow {
  /** `canonical_key_v2` of the published string. */
  readonly key: string;
  /** The surname exactly as the source file spells it. */
  readonly published: string;
  readonly count: number;
}

/** Orders two strings by Unicode code point (not by UTF-16 code unit, as `<` does). */
export function compareCodePoints(a: string, b: string): number {
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    const x = a.codePointAt(i) ?? 0;
    const y = b.codePointAt(j) ?? 0;
    if (x !== y) return x - y;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  return a.length - i - (b.length - j);
}

/**
 * The selection order of ADR-0018 §2.1: count descending, ties broken by key
 * in code-point order. Keys are unique on a list, so the order is total.
 */
export function selectionOrder(a: ListRow, b: ListRow): number {
  return b.count - a.count || compareCodePoints(a.key, b.key);
}

/**
 * Keys the parsed rows of one list and returns them in selection order.
 * Refuses a list on which two rows share a key: the register lists each
 * surname once, so a shared key would mean an identity the pipeline cannot
 * tell apart, and every per-surname figure would be wrong.
 */
export function buildListRows(
  parsed: readonly { readonly surname: string; readonly count: number }[],
): ListRow[] {
  const seen = new Map<string, string>();
  const rows: ListRow[] = [];
  for (const { surname, count } of parsed) {
    const key = canonicalKey(surname);
    const earlier = seen.get(key);
    if (earlier !== undefined) {
      throw new ListFactsInputError(
        `two rows of one list share the key ${JSON.stringify(key)}: ` +
          `${JSON.stringify(earlier)} and ${JSON.stringify(surname)}`,
      );
    }
    seen.set(key, surname);
    rows.push({ key, published: surname, count });
  }
  return rows.sort(selectionOrder);
}
