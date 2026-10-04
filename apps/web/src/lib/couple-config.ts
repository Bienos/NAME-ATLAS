/**
 * Whether the couple report's pages exist (TASK-100, ADR-0035 §2.5: the report
 * belongs to a paid tier, so it stays dark until checkout exists).
 *
 * On only when `COUPLE_REPORT_ENABLED` is exactly `1`. Otherwise both pages
 * answer 404 and nothing links to them. Production does not set the variable.
 *
 * Reads the variable by name and imports nothing that reaches the database,
 * so the middleware and the pages can both use it.
 */

export const COUPLE_REPORT_ENV = "COUPLE_REPORT_ENABLED";

/** The report's two addresses, without their query. */
export const COUPLE_PATHS = { pl: "/pl/para", en: "/en/couple" } as const;

/** Sent with both pages, on or off: the report is one reader's and never cached. */
export const COUPLE_CACHE_CONTROL = "private, no-store";

type Env = Readonly<Record<string, string | undefined>>;

export function coupleReportEnabled(env: Env = process.env): boolean {
  return env[COUPLE_REPORT_ENV] === "1";
}

/** Whether a request path is one of the report's pages. */
export function isCouplePath(pathname: string): boolean {
  return pathname === COUPLE_PATHS.pl || pathname === COUPLE_PATHS.en;
}
