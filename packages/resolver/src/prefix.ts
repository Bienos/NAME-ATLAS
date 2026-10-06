/**
 * Suggest-as-you-type: real surnames that begin with what has been typed
 * (`docs/contracts/surname-prefix.md`).
 *
 * Like `candidates.ts`, everything here is a **suggestion a human picks**. It
 * never resolves: choosing one sends the reader to the normal search, which
 * resolves exactly or not at all.
 *
 * Matching is on the Polish-diacritic fold of the canonical key, so `wisn`
 * finds WIŚNIEWSKI (`docs/canonical/13` §6.1: the fold is for retrieval, never
 * identity). Surnames whose key starts with the input *as typed*, diacritics
 * included, come first, unless one found only through the fold is at least
 * {@link OTHER_SPELLING_RATIO} times as common (TASK-131,
 * {@link orderPrefixMatches}); then the more common; then alphabetical.
 *
 * "More common" is the larger of a surname's national counts, used **only to
 * order the list**. No figure leaves this function, and the two national
 * resources are never summed (TASK-004 §14 U-1).
 *
 * Cost is linear in the number of surnames the prefix matches, since all of
 * them are ordered before the first eight of each kind are kept: measured
 * 4.4 µs a match on a 408,182-surname database (111,111 matches, 490 ms;
 * 8 matches, 20 ms) before TASK-131 added the window. A real two-letter prefix
 * matches tens of thousands, so ~100–200 ms; three letters and more are fast.
 * The client waits for a pause in typing.
 *
 * Offered nothing: input shorter than {@link MIN_PREFIX_LENGTH}, input that
 * fails validation (including mixed script, as `suggestSurnames` refuses it),
 * and surnames flagged as script-confusable. Read-only, as `lookup.ts` is.
 */
import { sql } from "kysely";
import type { Kysely, Transaction } from "kysely";
import type { DB } from "@name-atlas/db";
import { canonicalKey, polishDiacriticFold } from "./normalize.js";
import { validateSurnameInput } from "./validation.js";

type ReadOnlyQueries = Pick<Transaction<DB>, "selectFrom">;

/** Two characters: one gives an alphabet walk, and three makes the reader wait. */
export const MIN_PREFIX_LENGTH = 2;

/** Largest list returned. A dropdown longer than this is a page. */
export const PREFIX_CAP = 8;

export interface PrefixSuggestion {
  readonly surname_id: string;
  readonly display_name: string;
}

/**
 * How many times as common a surname found only through the diacritic fold must
 * be before it is put ahead of one spelled as typed (TASK-131). The surname page
 * uses the same figure to say "Szukasz WIŚNIEWSKI?" on WISNIEWSKI's page.
 *
 * A product choice, recorded in `tasks/131-diacritic-spelling-hint.md`: an
 * ASCII spelling typed by a reader who dropped the diacritics competes with the
 * diacritic form only in the share of readers who type that way, so a form
 * five times as common is the likelier meaning unless fewer than one reader in
 * five drops them. On the register of 2026-01-20 it puts WIŚNIEWSKI (53,079)
 * before WISNIEWSKI (105), DĄBROWA (1,211) before DABROWA (7) and ŻMUDA
 * (4,828) before ZMUDA (689), and keeps ZMUDA TRZEBIATOWSKI (248) before
 * ŻMUDA TRZEBIATOWSKI (88).
 */
export const OTHER_SPELLING_RATIO = 5;

/**
 * Whether `other`, a surname's largest national count, makes it the likelier
 * meaning of an input that matched `typed`'s spelling: at least
 * {@link OTHER_SPELLING_RATIO} times as many. A known count outranks an absent
 * one, and an absent one outranks nothing: absent is not zero, it is unknown.
 */
export function outranksTypedSpelling(other: number | null, typed: number | null): boolean {
  if (other === null) return false;
  if (typed === null) return true;
  return other >= OTHER_SPELLING_RATIO * typed;
}

/** A surname the prefix matched, with its largest national count, for ordering only. */
export interface PrefixMatch extends PrefixSuggestion {
  readonly count: number | null;
}

/**
 * The list's order (TASK-131). `typed` holds the matches whose key starts with
 * the input as typed and `folded` those found only through the fold, each
 * already most common first. They are merged, and a folded match goes ahead of
 * a typed one only when {@link outranksTypedSpelling} says so. Since each list
 * is in count order, that one comparison orders the whole merge.
 */
export function orderPrefixMatches(
  typed: readonly PrefixMatch[],
  folded: readonly PrefixMatch[],
  limit: number,
): PrefixMatch[] {
  const out: PrefixMatch[] = [];
  let i = 0;
  let j = 0;
  while (out.length < limit) {
    const t = typed[i];
    const f = folded[j];
    if (t === undefined && f === undefined) break;
    if (f !== undefined && (t === undefined || outranksTypedSpelling(f.count, t.count))) {
      out.push(f);
      j += 1;
    } else if (t !== undefined) {
      out.push(t);
      i += 1;
    }
  }
  return out;
}

export type PrefixOutcome =
  | { readonly kind: "SUGGESTIONS"; readonly items: readonly PrefixSuggestion[] }
  | { readonly kind: "TOO_SHORT" }
  | { readonly kind: "INVALID_INPUT" };

/** Escapes `LIKE` metacharacters so `%` and `_` in a surname are literal. */
export function escapeLike(value: string): string {
  return value.replace(/[\\%_]/gu, (c) => `\\${c}`);
}

export async function prefixSuggestions(
  db: Kysely<DB>,
  rawInput: string,
  options: { readonly limit?: number } = {},
): Promise<PrefixOutcome> {
  if (validateSurnameInput(rawInput).status !== "VALID") return { kind: "INVALID_INPUT" };
  const key = canonicalKey(rawInput);
  if ([...key].length < MIN_PREFIX_LENGTH) return { kind: "TOO_SHORT" };
  const limit = Math.min(Math.max(1, options.limit ?? PREFIX_CAP), PREFIX_CAP);
  const folded = `${escapeLike(polishDiacriticFold(rawInput))}%`;
  const exact = `${escapeLike(key)}%`;

  const rows = await db
    .transaction()
    .setAccessMode("read only")
    .execute(async (trx) => {
      const read: ReadOnlyQueries = trx;
      // Each match's largest national count, and its place among the matches of
      // its own kind (spelled as typed, or found through the fold alone), so at
      // most `limit` of each kind leave the database.
      const matches = read
        .selectFrom("surnames as s")
        .leftJoin("distribution_snapshots as ds", (join) =>
          join
            .onRef("ds.surname_id", "=", "s.surname_id")
            .on("ds.geography_level", "=", "NATIONAL"),
        )
        .leftJoin("distribution_values as v", (join) =>
          join
            .onRef("v.distribution_snapshot_id", "=", "ds.distribution_snapshot_id")
            .on("v.place_id", "is", null),
        )
        .select([
          "s.surname_id",
          "s.canonical_display",
          sql<string | null>`max(v.count)`.as("count"),
          sql<boolean>`s.canonical_key LIKE ${exact} ESCAPE '\\'`.as("typed"),
          sql<string>`row_number() OVER (
            PARTITION BY s.canonical_key LIKE ${exact} ESCAPE '\\'
            ORDER BY max(v.count) DESC NULLS LAST, s.canonical_key
          )`.as("place"),
        ])
        .where(
          sql<boolean>`translate(s.canonical_key, 'ąćęłńóśźż', 'acelnoszz') LIKE ${folded} ESCAPE '\\'`,
        )
        .where("s.entity_status", "=", "ACTIVE")
        .where("s.merged_into_surname_id", "is", null)
        .where("s.script_confusable_flag", "=", false)
        .groupBy(["s.surname_id", "s.canonical_display", "s.canonical_key"])
        .as("m");
      return read
        .selectFrom(matches)
        .selectAll()
        .where("m.place", "<=", String(limit))
        .orderBy("m.place")
        .execute();
    });

  const match = (r: (typeof rows)[number]): PrefixMatch => ({
    surname_id: r.surname_id,
    display_name: r.canonical_display,
    count: r.count === null ? null : Number(r.count),
  });
  const ordered = orderPrefixMatches(
    rows.filter((r) => r.typed).map(match),
    rows.filter((r) => !r.typed).map(match),
    limit,
  );
  return {
    kind: "SUGGESTIONS",
    items: ordered.map((m) => ({ surname_id: m.surname_id, display_name: m.display_name })),
  };
}
