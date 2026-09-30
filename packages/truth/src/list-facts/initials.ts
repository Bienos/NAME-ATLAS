/**
 * `list_initials@1` — ONE list's surnames and people by the first letter of
 * the surname (TASK-043 §3, plate V).
 *
 * The first letter is the key's first code point together with any combining
 * marks after it, so `A` followed by a combining mark is not `A`. It counts
 * under one of `LIST_INITIAL_LETTERS` (the Polish alphabet, then Q, V and X)
 * when it is that letter in lower case, as `canonical_key_v2` spells it, and
 * under `outside` otherwise.
 *
 * A letter no surname starts with is stored as absent, never as zero people.
 * `top` is the letter with the most people and `rarest_polish` the letter of
 * the Polish alphabet with the fewest, among the letters present; a tie goes
 * to the letter earlier in `LIST_INITIAL_LETTERS`.
 */
import { LIST_INITIAL_LETTERS, POLISH_ALPHABET } from "@name-atlas/contracts";
import type { ListInitial, ListInitialLetter } from "@name-atlas/contracts";
import { LIST_INITIALS_METHOD_VERSION } from "../version.js";
import { ListFactsInputError } from "./histogram.js";
import type { ListRow } from "./rows.js";

export interface ListInitials {
  readonly method_version: string;
  readonly letters: readonly ListInitial[];
  readonly top: ListInitialLetter;
  readonly rarest_polish: ListInitialLetter;
  readonly outside: { readonly surnames: number; readonly people: number };
}

/** The first letter of a key: its first code point and any combining marks after it. */
export function firstLetter(key: string): string {
  return /^.\p{M}*/su.exec(key)?.[0] ?? "";
}

export function listInitials(rows: readonly ListRow[]): ListInitials {
  const index = new Map<string, number>(
    LIST_INITIAL_LETTERS.map((letter, i) => [letter.toLowerCase(), i]),
  );
  const surnames = LIST_INITIAL_LETTERS.map(() => 0);
  const people = LIST_INITIAL_LETTERS.map(() => 0);
  const outside = { surnames: 0, people: 0 };
  for (const row of rows) {
    const i = index.get(firstLetter(row.key));
    if (i === undefined) {
      outside.surnames += 1;
      outside.people += row.count;
    } else {
      surnames[i] = (surnames[i] ?? 0) + 1;
      people[i] = (people[i] ?? 0) + row.count;
    }
  }

  const letters: ListInitial[] = LIST_INITIAL_LETTERS.map((letter, i) =>
    (surnames[i] ?? 0) === 0
      ? { letter, absent: true }
      : { letter, surnames: surnames[i] ?? 0, people: people[i] ?? 0 },
  );

  let top: ListInitialLetter | null = null;
  let topPeople = 0;
  let rarest: ListInitialLetter | null = null;
  let rarestPeople = Infinity;
  for (const [i, letter] of LIST_INITIAL_LETTERS.entries()) {
    const p = people[i] ?? 0;
    if ((surnames[i] ?? 0) === 0) continue;
    if (p > topPeople) {
      top = letter;
      topPeople = p;
    }
    if (POLISH_ALPHABET.includes(letter) && p < rarestPeople) {
      rarest = letter;
      rarestPeople = p;
    }
  }
  if (top === null || rarest === null) {
    throw new ListFactsInputError("no surname on the list starts with a letter of the alphabet");
  }
  return {
    method_version: LIST_INITIALS_METHOD_VERSION,
    letters,
    top,
    rarest_polish: rarest,
    outside,
  };
}
