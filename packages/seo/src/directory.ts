import { sql } from "kysely";
import type { DB } from "@name-atlas/db";
import type { Kysely } from "kysely";
import type { SlugLocale } from "./slug.js";
import { eligible, seoBlockedSurnameIds } from "./sitemap.js";
import type { SitemapQueryOptions } from "./sitemap.js";

/**
 * The alphabetical surname directory (TASK-129; `docs/canonical/21` §111–§114).
 *
 * It lists exactly what the sitemap lists, through the same predicate
 * (`eligible` in `sitemap.ts`): surnames whose page serves `index` (§112). A
 * letter is the first character of the surname's `canonical_key`, which is the
 * lower-case display form with its diacritics, so Ł, Ś and Ż are letters of
 * their own, as in a Polish dictionary. A surname whose first character is none
 * of these is under `inne`, so every listed page is reachable (§111).
 */

/** The Polish alphabet's initial letters, and Q, V and X for surnames from elsewhere. */
export const DIRECTORY_LETTERS = [
  "a",
  "b",
  "c",
  "ć",
  "d",
  "e",
  "f",
  "g",
  "h",
  "i",
  "j",
  "k",
  "l",
  "ł",
  "m",
  "n",
  "o",
  "ó",
  "p",
  "q",
  "r",
  "s",
  "ś",
  "t",
  "u",
  "v",
  "w",
  "x",
  "y",
  "z",
  "ź",
  "ż",
] as const;

/** Every other first character: a foreign letter, an apostrophe, a digit. */
export const DIRECTORY_OTHER = "inne";

export type DirectoryLetter = (typeof DIRECTORY_LETTERS)[number] | typeof DIRECTORY_OTHER;

/** Links on one directory page. §114: never thousands on one page. */
export const DIRECTORY_PAGE_SIZE = 500;

export function isDirectoryLetter(value: string): value is DirectoryLetter {
  return value === DIRECTORY_OTHER || (DIRECTORY_LETTERS as readonly string[]).includes(value);
}

function letterFilter(letter: DirectoryLetter) {
  return letter === DIRECTORY_OTHER
    ? sql`AND NOT (left(s.canonical_key, 1) = ANY(${[...DIRECTORY_LETTERS]}::text[]))`
    : sql`AND left(s.canonical_key, 1) = ${letter}`;
}

export interface DirectoryEntry {
  readonly surname_id: string;
  readonly slug: string;
  readonly display_name: string;
}

/** The letters, in alphabetical order and then `inne`, that list at least one surname. */
export async function directoryLetters(
  db: Kysely<DB>,
  locale: SlugLocale,
  options: SitemapQueryOptions,
): Promise<readonly DirectoryLetter[]> {
  const blocked = await seoBlockedSurnameIds(db, options);
  const rows = await sql<{ letter: string }>`
    SELECT v.letter
      FROM unnest(${[...DIRECTORY_LETTERS]}::text[]) WITH ORDINALITY AS v(letter, n)
     WHERE EXISTS (${eligible(locale, blocked, sql`AND left(s.canonical_key, 1) = v.letter`)})
     ORDER BY v.n
  `.execute(db);
  const other = await sql<{ any: boolean }>`
    SELECT EXISTS (${eligible(locale, blocked, letterFilter(DIRECTORY_OTHER))}) AS any
  `.execute(db);
  const letters = rows.rows.map((r) => r.letter).filter(isDirectoryLetter);
  return other.rows[0]?.any === true ? [...letters, DIRECTORY_OTHER] : letters;
}

/** How many surnames a letter lists. */
export async function directoryCount(
  db: Kysely<DB>,
  locale: SlugLocale,
  letter: DirectoryLetter,
  options: SitemapQueryOptions,
): Promise<number> {
  const blocked = await seoBlockedSurnameIds(db, options);
  const rows = await sql<{ n: string }>`
    SELECT count(*)::text AS n FROM (${eligible(locale, blocked, letterFilter(letter))}) e
  `.execute(db);
  return Number(rows.rows[0]?.n ?? "0");
}

/** One page of a letter, in the order of `canonical_key`. */
export async function directoryEntries(
  db: Kysely<DB>,
  locale: SlugLocale,
  letter: DirectoryLetter,
  options: { readonly limit: number; readonly offset: number } & SitemapQueryOptions,
): Promise<readonly DirectoryEntry[]> {
  const blocked = await seoBlockedSurnameIds(db, options);
  const rows = await sql<{ surname_id: string; slug: string; canonical_display: string }>`
    SELECT e.surname_id::text AS surname_id, e.slug, e.canonical_display
      FROM (${eligible(locale, blocked, letterFilter(letter))}) e
     ORDER BY e.canonical_key, e.surname_id
     LIMIT ${options.limit} OFFSET ${options.offset}
  `.execute(db);
  return rows.rows.map((r) => ({
    surname_id: r.surname_id,
    slug: r.slug,
    display_name: r.canonical_display,
  }));
}
