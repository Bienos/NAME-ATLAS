/**
 * The session cookie (TASK-062, ADR-0027 §2.5): an opaque 32-byte token,
 * `HttpOnly` so a script cannot read it, `SameSite=Lax` so another site's form
 * cannot send it on a POST, and `Secure` (with the `__Host-` prefix, which
 * forbids a `Domain` and demands `Path=/`) wherever the site is served over
 * HTTPS.
 *
 * Its lifetime is longer than any session's: **the database row decides**
 * whether it is valid, 30 days from its last renewal. A server component
 * cannot extend a cookie when it renews the row, so a cookie that expired with
 * the first 30 days would end every session at day 30, however often it was
 * used. A cookie that outlives its row is a token the database no longer knows.
 *
 * Pure: the header values are built here and set by the routes.
 */

export const SESSION_COOKIE_DAYS = 400;

const DAY_SECONDS = 86_400;

export function sessionCookieName(secure: boolean): string {
  return secure ? "__Host-na_session" : "na_session";
}

function attributes(secure: boolean, maxAgeSeconds: number): string {
  return `Path=/; Max-Age=${String(maxAgeSeconds)}; HttpOnly; SameSite=Lax${secure ? "; Secure" : ""}`;
}

/** The `Set-Cookie` value that signs a browser in. */
export function sessionCookie(token: string, secure: boolean): string {
  return `${sessionCookieName(secure)}=${token}; ${attributes(secure, SESSION_COOKIE_DAYS * DAY_SECONDS)}`;
}

/** The `Set-Cookie` value that removes it. */
export function clearedSessionCookie(secure: boolean): string {
  return `${sessionCookieName(secure)}=; ${attributes(secure, 0)}`;
}

/** The named cookie's value in a `Cookie` header, or null. */
export function cookieValue(header: string | null, name: string): string | null {
  if (header === null) return null;
  for (const part of header.split(";")) {
    const at = part.indexOf("=");
    if (at < 0) continue;
    if (part.slice(0, at).trim() !== name) continue;
    const value = part.slice(at + 1).trim();
    return value === "" ? null : value;
  }
  return null;
}
