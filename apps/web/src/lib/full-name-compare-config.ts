/**
 * Whether the full-name comparison exists (TASK-155, D-049): first names and
 * surnames of two to four people side by side, signed-in only, a 15,99 zł
 * product that cannot be sold yet (ADR-0023 §2.5).
 *
 * On only when `FULL_NAME_COMPARE_ENABLED` is exactly `1` (and, checked by the
 * page, accounts are on). Otherwise both addresses answer 404 and nothing links
 * to them.
 *
 * Reads the variable by name and imports nothing that reaches the database,
 * so the middleware and the pages can both use it.
 */

export const FULL_NAME_COMPARE_ENV = "FULL_NAME_COMPARE_ENABLED";

/** The page's two addresses, without their query. */
export const FULL_NAME_COMPARE_PATHS = {
  pl: "/pl/porownaj/imie-i-nazwisko",
  en: "/en/compare/full-name",
} as const;

/** At least two people make a comparison; a fifth is never read (D-049 §2). */
export const FULL_NAME_COMPARE_MIN_PEOPLE = 2;
export const FULL_NAME_COMPARE_MAX_PEOPLE = 4;

/** Sent with both addresses, on or off: the page is one signed-in reader's and never cached. */
export const FULL_NAME_COMPARE_CACHE_CONTROL = "private, no-store";

type Env = Readonly<Record<string, string | undefined>>;

export function fullNameCompareEnabled(env: Env = process.env): boolean {
  return env[FULL_NAME_COMPARE_ENV] === "1";
}

/** Whether a request path is one of the page's two addresses. */
export function isFullNameComparePath(pathname: string): boolean {
  return pathname === FULL_NAME_COMPARE_PATHS.pl || pathname === FULL_NAME_COMPARE_PATHS.en;
}
