/**
 * What Vercel Web Analytics may be told about a page (TASK-058).
 *
 * The site's own logs never hold a searched surname (`events.ts`, TASK-024;
 * `docs/canonical/19`: "no raw surname by default"). The analytics script would
 * send the page's full address, so a surname page's slug is replaced by the
 * route's parameter before the event leaves the browser, and the query string
 * (`?surname=…` on the landing, `?a=…&b=…` on the comparison) and the hash are
 * dropped. The card routes keep the card's name, which is not a surname.
 *
 * A tree page's address carries a tree's id and a person's id (TASK-073 AC-7);
 * both are replaced the same way, and the one-question flow's draft, which is
 * in the query, goes with the query.
 *
 * Pure: `site-analytics.tsx` hands it to `beforeSend`.
 */

/** The routes whose third segment is a surname's slug. */
const SURNAME_PREFIXES = ["/pl/nazwisko/", "/en/surname/"] as const;

export const SLUG_PLACEHOLDER = "[slug]";

/** The routes under which the fourth segment is a tree's id and the sixth a person's. */
const TREE_PREFIXES = ["/pl/konto/drzewa/", "/en/account/trees/"] as const;

export const TREE_PLACEHOLDER = "[tree]";
export const PERSON_PLACEHOLDER = "[person]";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/** The path with a tree's and a person's id replaced; other paths as they are. */
export function redactTreePath(pathname: string): string {
  for (const prefix of TREE_PREFIXES) {
    if (!pathname.startsWith(prefix)) continue;
    const parts = pathname.split("/");
    // ["", "pl", "konto", "drzewa", tree, "osoba", person]
    if (parts.length >= 5 && UUID.test(parts[4] ?? "")) parts[4] = TREE_PLACEHOLDER;
    if (parts.length >= 7 && UUID.test(parts[6] ?? "")) parts[6] = PERSON_PLACEHOLDER;
    return parts.join("/");
  }
  return pathname;
}

/** The path with the surname's slug replaced; other paths as they are. */
export function redactSurnamePath(pathname: string): string {
  for (const prefix of SURNAME_PREFIXES) {
    if (!pathname.startsWith(prefix)) continue;
    const parts = pathname.split("/");
    // ["", "pl", "nazwisko", slug, ...rest]
    if (parts.length < 4 || parts[3] === "") return pathname;
    parts[3] = SLUG_PLACEHOLDER;
    return parts.join("/");
  }
  return pathname;
}

/**
 * The address an analytics event may carry, or null when it cannot be read,
 * in which case the event is not sent at all.
 */
export function analyticsUrl(url: string): string | null {
  let parsed: URL;
  const absolute = /^[a-z][a-z0-9+.-]*:/iu.test(url);
  try {
    parsed = new URL(url, "http://localhost");
  } catch {
    return null;
  }
  parsed.search = "";
  parsed.hash = "";
  parsed.pathname = redactTreePath(redactSurnamePath(parsed.pathname));
  return absolute ? parsed.toString() : parsed.pathname;
}
