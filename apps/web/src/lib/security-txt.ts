import { contactPath } from "./site-links.js";

/**
 * `/.well-known/security.txt` (RFC 9116; TASK-047).
 *
 * `Contact` is the contact page, in each language: since 2026-10-06 the site
 * publishes no address (the owner's request). The field must be a URI, so it
 * takes the deployment's origin; without one it falls back to the path alone,
 * as `Canonical` is then left out.
 *
 * `Expires` is a fixed date, not "a year from now" computed per request: the
 * RFC's point is that a reader can tell the file has been looked after, and a
 * date that moves by itself says nothing. Renew it before it passes; the test
 * fails once it is less than 30 days away.
 */
export const SECURITY_TXT_EXPIRES = "2027-09-30T00:00:00.000Z";

export function securityTxt(origin: string | null): string {
  const base = origin ?? "";
  return [
    `Contact: ${base}${contactPath("pl")}`,
    `Contact: ${base}${contactPath("en")}`,
    `Expires: ${SECURITY_TXT_EXPIRES}`,
    "Preferred-Languages: pl, en",
    ...(origin === null ? [] : [`Canonical: ${origin}/.well-known/security.txt`]),
    "",
  ].join("\n");
}
