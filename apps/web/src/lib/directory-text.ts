import { DIRECTORY_OTHER } from "@name-atlas/seo";
import type { DirectoryLetter } from "@name-atlas/seo";
import { formatInteger, pluralPl } from "./messages.js";

/**
 * The surname directory's words (TASK-129; `docs/canonical/21` §111–§114).
 * Polish only, as the directory is: `/pl/` is the indexed locale (§20).
 *
 * Its own module, so the footer and the surname page's breadcrumb can name the
 * directory without importing the page, which imports both of them.
 */

/** The breadcrumb step between the site and a surname, and the directory's own crumb. */
export const DIRECTORY_NAME = "Nazwiska";

/** The footer's link. */
export const DIRECTORY_LINK = "Nazwiska A–Ż";

/** The root's heading and title. */
export const DIRECTORY_HEADING = "Nazwiska od A do Ż";

/**
 * Who is listed: exactly the surnames whose page serves `index`, which the
 * directory shares with the sitemap. Each has a cited count and a ready
 * regional distribution, so the sentence names those two and nothing else
 * (§67's truth rule).
 */
export const DIRECTORY_LEDE =
  "Alfabetyczny spis nazwisk, dla których Name Atlas pokazuje, ile osób je nosi i gdzie w Polsce występuje. Wybierz pierwszą literę.";

export const DIRECTORY_LETTERS_LABEL = "Litery";
export const DIRECTORY_PAGES_LABEL = "Strony";

/** "K", "Ł"; `inne` as words. */
export function letterLabel(letter: DirectoryLetter): string {
  return letter === DIRECTORY_OTHER ? "Inne" : letter.toLocaleUpperCase("pl");
}

/** §113: "Nazwiska na literę K". */
export function letterHeading(letter: DirectoryLetter): string {
  return letter === DIRECTORY_OTHER
    ? "Nazwiska na inne znaki"
    : `Nazwiska na literę ${letterLabel(letter)}`;
}

/** "18 452 nazwiska. Strona 2 z 37: od KAB do KAC." */
export function letterLede(
  count: number,
  page: number,
  pages: number,
  first: string,
  last: string,
): string {
  const total = `${formatInteger(count, "pl")} ${pluralPl(count, "nazwisko", "nazwiska", "nazwisk")}.`;
  const range = first === last ? first : `od ${first} do ${last}`;
  return pages > 1
    ? `${total} Strona ${String(page)} z ${String(pages)}: ${range}.`
    : `${total} ${range.charAt(0).toLocaleUpperCase("pl")}${range.slice(1)}.`;
}

/** The page's name, its page number after the first: "Nazwiska na literę K, strona 2". */
export function letterPageName(letter: DirectoryLetter, page: number): string {
  const heading = letterHeading(letter);
  return page > 1 ? `${heading}, strona ${String(page)}` : heading;
}

export function letterTitle(letter: DirectoryLetter, page: number): string {
  return `${letterPageName(letter, page)} | Name Atlas`;
}

export function letterDescription(letter: DirectoryLetter, count: number): string {
  return `${letterHeading(letter)} w Name Atlas: ${formatInteger(count, "pl")}. Przy każdym: ile osób je nosi i gdzie w Polsce występuje.`;
}
