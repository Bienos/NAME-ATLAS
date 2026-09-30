import { CONTACT_EMAIL } from "./site-footer.js";

/**
 * `/.well-known/security.txt` (RFC 9116; TASK-047).
 *
 * `Expires` is a fixed date, not "a year from now" computed per request: the
 * RFC's point is that a reader can tell the file has been looked after, and a
 * date that moves by itself says nothing. Renew it before it passes; the test
 * fails once it is less than 30 days away.
 */
export const SECURITY_TXT_EXPIRES = "2027-09-30T00:00:00.000Z";

export function securityTxt(origin: string | null): string {
  return [
    `Contact: mailto:${CONTACT_EMAIL}`,
    `Expires: ${SECURITY_TXT_EXPIRES}`,
    "Preferred-Languages: pl, en",
    ...(origin === null ? [] : [`Canonical: ${origin}/.well-known/security.txt`]),
    "",
  ].join("\n");
}
