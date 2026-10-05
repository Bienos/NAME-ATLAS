/**
 * Whether the report preview exists (TASK-120). It shows a stored internal
 * test report (TASK-119); nothing is sold.
 *
 * On only when `REPORT_PREVIEW_ENABLED` is exactly `1` (the owner, 2026-10-05:
 * the flag alone). Otherwise every preview address answers 404 and nothing
 * links to one. Production does not set the variable.
 *
 * Reads the variable by name and imports nothing that reaches the database,
 * so the middleware and the pages can both use it.
 */

export const REPORT_PREVIEW_ENV = "REPORT_PREVIEW_ENABLED";

/** Where a version's preview lives, before its id. */
export const REPORT_PATHS = { pl: "/pl/raport", en: "/en/report" } as const;

/** Sent with every preview, on or off: an internal artifact, never cached. */
export const REPORT_CACHE_CONTROL = "private, no-store";

type Env = Readonly<Record<string, string | undefined>>;

export function reportPreviewEnabled(env: Env = process.env): boolean {
  return env[REPORT_PREVIEW_ENV] === "1";
}

/** Whether a request path is a version's preview, `/pl/raport/{id}` or `/en/report/{id}`. */
export function isReportPath(pathname: string): boolean {
  return Object.values(REPORT_PATHS).some(
    (base) => pathname.startsWith(`${base}/`) && pathname.length > base.length + 1,
  );
}

/** A version's preview address in a language. */
export function reportPath(reportVersionId: string, lang: "pl" | "en"): string {
  return `${REPORT_PATHS[lang]}/${reportVersionId}`;
}
