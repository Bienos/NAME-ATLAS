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
 * included, come first; then the more common; then alphabetical.
 *
 * "More common" is the larger of a surname's national counts, used **only to
 * order the list**. No figure leaves this function, and the two national
 * resources are never summed (TASK-004 §14 U-1).
 *
 * Cost is linear in the number of surnames the prefix matches, since all of
 * them are ordered before the first eight are kept: measured 4.4 µs a match on
 * a 408,182-surname database (111,111 matches, 490 ms; 8 matches, 20 ms). A
 * real two-letter prefix matches tens of thousands, so ~100–200 ms; three
 * letters and more are fast. The client waits for a pause in typing.
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

  const items = await db
    .transaction()
    .setAccessMode("read only")
    .execute(async (trx) => {
      const read: ReadOnlyQueries = trx;
      return read
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
        .select(["s.surname_id", "s.canonical_display"])
        .where(
          sql<boolean>`translate(s.canonical_key, 'ąćęłńóśźż', 'acelnoszz') LIKE ${folded} ESCAPE '\\'`,
        )
        .where("s.entity_status", "=", "ACTIVE")
        .where("s.merged_into_surname_id", "is", null)
        .where("s.script_confusable_flag", "=", false)
        .groupBy(["s.surname_id", "s.canonical_display", "s.canonical_key"])
        .orderBy(sql`bool_or(s.canonical_key LIKE ${exact} ESCAPE '\\') desc`)
        .orderBy(sql`max(v.count) desc nulls last`)
        .orderBy("s.canonical_key")
        .limit(limit)
        .execute();
    });

  return {
    kind: "SUGGESTIONS",
    items: items.map((r) => ({ surname_id: r.surname_id, display_name: r.canonical_display })),
  };
}
