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
 * The comparison's two addresses (TASK-158), without their query: two first
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
 * (TASK-158). Everything under either page is one signed-in reader's.
 */
export function isBabyNamesPath(pathname: string): boolean {
  return [BABY_NAMES_PATHS.pl, BABY_NAMES_PATHS.en].some(
    (base) => pathname === base || pathname.startsWith(`${base}/`),
  );
}

/**
 * The free window (TASK-160, D-051): until this instant every signed-in reader
 * sees the 8,99 zł view (the years since 2000, the whole list, the comparison,
 * the paid share card) without buying it. An ISO 8601 instant with its offset,
 * e.g. `2026-10-08T23:59:59+02:00`. Unset, malformed or past: no window.
 */
export const BABY_NAMES_FREE_UNTIL_ENV = "BABY_NAMES_FREE_UNTIL";

const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/;

/** The end of the free window while it is open at `now`, else null. */
export function babyNamesFreeUntil(env: Env = process.env, now: Date = new Date()): Date | null {
  const raw = env[BABY_NAMES_FREE_UNTIL_ENV]?.trim() ?? "";
  if (!INSTANT.test(raw)) return null;
  const until = new Date(raw);
  if (Number.isNaN(until.getTime())) return null;
  return now.getTime() < until.getTime() ? until : null;
}

/**
 * What a signed-in reader may see. `paid`: the account holds a tier that
 * includes the view; claims are read on the PAID surface only then. `full`:
 * paid, or the free window is open; the view is shown, read on the FREE
 * surface, so the rights decide as for any free reader (ADR-0001).
 */
export interface BabyNamesAccess {
  readonly paid: boolean;
  readonly full: boolean;
  /** The window's end when `full` comes from it alone, else null. */
  readonly freeUntil: Date | null;
}

export async function readBabyNamesAccess(
  deps: {
    readonly hasFullView: (userId: string) => Promise<boolean>;
    readonly freeUntil?: () => Date | null;
  },
  userId: string,
): Promise<BabyNamesAccess> {
  const paid = await deps.hasFullView(userId);
  const freeUntil = paid ? null : (deps.freeUntil?.() ?? null);
  return { paid, full: paid || freeUntil !== null, freeUntil };
}
