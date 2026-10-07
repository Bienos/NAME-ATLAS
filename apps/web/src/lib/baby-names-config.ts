/**
 * Whether the baby-names page and its list exist (TASK-141, D-044; TASK-146, D-047): first names given to
 * children by year, signed-in only, with a paid view that cannot be sold yet
 * (ADR-0023 §2.5).
 *
 * On only when `BABY_NAMES_ENABLED` is exactly `1`. Otherwise every address
 * answers 404 and the header does not link to them (TASK-143).
 *
 * Reads the variable by name and imports nothing that reaches the database,
 * so the middleware and the pages can both use it.
 */

export const BABY_NAMES_ENV = "BABY_NAMES_ENABLED";

/** The page's two addresses, without their query. */
export const BABY_NAMES_PATHS = { pl: "/pl/imiona-dla-dziecka", en: "/en/baby-names" } as const;

/**
 * The whole list's two addresses, without their query (TASK-146, D-047): the
 * names of one year's list, ranked, boys and girls apart. Same flag, same
 * rules as the page itself.
 */
export const BABY_NAMES_LIST_PATHS = {
  pl: "/pl/imiona-dla-dziecka/lista",
  en: "/en/baby-names/list",
} as const;

/**
 * The share sheet's two addresses (TASK-152), without their query: the page's
 * cards for one name and sex, to share, save or link. The cards themselves are
 * `/pl/imiona-dla-dziecka/karta/{card}` and `/en/baby-names/card/{card}`
 * (`baby-names-share-facts.ts`). Same flag, same rules as the page.
 */
export const BABY_NAMES_SHARE_PATHS = {
  pl: "/pl/imiona-dla-dziecka/udostepnij",
  en: "/en/baby-names/share",
} as const;

/**
 * The comparison's two addresses (TASK-154), without their query: two first
 * names of one sex side by side, part of the 8,99 zł view (D-044). Same flag,
 * same rules as the page.
 */
export const BABY_NAMES_COMPARE_PATHS = {
  pl: "/pl/imiona-dla-dziecka/porownaj",
  en: "/en/baby-names/compare",
} as const;

/** Rows to a page of the list (the 8,99 zł view), and the rows the free view shows. */
export const BABY_NAMES_LIST_PAGE_SIZE = 100;
export const BABY_NAMES_LIST_FREE_ROWS = 10;

/** The search box's field, per language: `?imie=ZOFIA`, `?name=ZOFIA`. */
export const BABY_NAMES_FIELD = { pl: "imie", en: "name" } as const;

/** Sent with both pages, on or off: the page is one signed-in reader's and never cached. */
export const BABY_NAMES_CACHE_CONTROL = "private, no-store";

type Env = Readonly<Record<string, string | undefined>>;

export function babyNamesEnabled(env: Env = process.env): boolean {
  return env[BABY_NAMES_ENV] === "1";
}

/**
 * Whether a request path is the page's, or anything under it: the list
 * (TASK-146), the share sheet and the card images (TASK-152), the comparison
 * (TASK-154). Everything under either page is one signed-in reader's.
 */
export function isBabyNamesPath(pathname: string): boolean {
  return [BABY_NAMES_PATHS.pl, BABY_NAMES_PATHS.en].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}
