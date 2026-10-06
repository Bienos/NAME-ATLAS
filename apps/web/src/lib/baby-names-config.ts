/**
 * Whether the baby-names page exists (TASK-141, D-044): first names given to
 * children by year, signed-in only, with a paid view that cannot be sold yet
 * (ADR-0023 §2.5), so it stays dark.
 *
 * On only when `BABY_NAMES_ENABLED` is exactly `1`. Otherwise both pages
 * answer 404 and nothing links to them. Production does not set the variable.
 *
 * Reads the variable by name and imports nothing that reaches the database,
 * so the middleware and the pages can both use it.
 */

export const BABY_NAMES_ENV = "BABY_NAMES_ENABLED";

/** The page's two addresses, without their query. */
export const BABY_NAMES_PATHS = { pl: "/pl/imiona-dla-dziecka", en: "/en/baby-names" } as const;

/** The search box's field, per language: `?imie=ZOFIA`, `?name=ZOFIA`. */
export const BABY_NAMES_FIELD = { pl: "imie", en: "name" } as const;

/** Sent with both pages, on or off: the page is one signed-in reader's and never cached. */
export const BABY_NAMES_CACHE_CONTROL = "private, no-store";

type Env = Readonly<Record<string, string | undefined>>;

export function babyNamesEnabled(env: Env = process.env): boolean {
  return env[BABY_NAMES_ENV] === "1";
}

/** Whether a request path is one of the page's two addresses. */
export function isBabyNamesPath(pathname: string): boolean {
  return pathname === BABY_NAMES_PATHS.pl || pathname === BABY_NAMES_PATHS.en;
}
