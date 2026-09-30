import { securityTxt } from "../../../lib/security-txt.js";
import { siteOrigin } from "../../../lib/surname-page.js";

/**
 * `/.well-known/security.txt` (RFC 9116; TASK-047). A route rather than a
 * static file so `Canonical` names the deployment's own origin, as `robots.txt`
 * does, and is left out when the origin is not configured.
 */

export const dynamic = "force-dynamic";

export function GET(): Response {
  return new Response(securityTxt(siteOrigin()), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
