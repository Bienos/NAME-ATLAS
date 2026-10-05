/**
 * Response headers every route of the public site carries (TASK-048).
 *
 * `next.config.ts` applies them to every path through `headers()`, so they
 * reach static pages, dynamic pages, the API and the share cards alike, and no
 * route can forget them.
 *
 * The Content Security Policy is **report-only** by the project owner's ruling
 * of 2026-09-30 (TASK-048 §5 U-1): the strict policy is shipped so browsers
 * report what it would block, the pages stay statically rendered (an enforced
 * nonce policy would make every page dynamic), and enforcement is a later
 * change once the reports are known. Two directives are ignored by browsers in
 * report-only mode, so the protection they give is carried here by an enforced
 * header instead: `frame-ancestors` by `X-Frame-Options: DENY`, and there is no
 * `upgrade-insecure-requests`, which HSTS covers.
 *
 * Every origin the policy allows is traced to something the site loads:
 * - scripts, styles, fonts: the site's own `/_next/static/` files. The fonts
 *   come from `next/font/google`, which downloads them at build time and serves
 *   them from the site (`app/layout.tsx`), so no Google origin is needed;
 * - `style-src 'unsafe-inline'`: the pages set `style={…}` attributes (the atlas
 *   plates, the maps), and a style attribute cannot carry a nonce;
 * - `img-src 'self'`: every image is the site's own (icons, share cards); no
 *   page uses a `data:` or `blob:` image;
 * - `connect-src 'self'`: the only client requests are `/api/v1/surname-prefix`
 *   and `/api/v1/events`;
 * - Google Analytics on every page (TASK-109, TASK-115): its script
 *   from `www.googletagmanager.com`, and its hits to `*.google-analytics.com`
 *   and `*.analytics.google.com` (requests and, as a fallback, image pings).
 *
 * `script-src 'self'` has no `'unsafe-inline'`, so the reports will name the
 * inline scripts the App Router injects; deciding how to allow those (nonces or
 * hashes) is what enforcement needs.
 *
 * Deliberately **not** set: `Cross-Origin-Resource-Policy`, which would stop
 * other sites' crawlers embedding the `opengraph-image` share cards, and HSTS
 * `preload`, which needs the owner's decision and a domain of the project's own
 * (the site is on a `vercel.app` subdomain).
 */

export interface SecurityHeader {
  readonly key: string;
  readonly value: string;
}

export const CONTENT_SECURITY_POLICY: string = [
  "default-src 'self'",
  "script-src 'self' https://www.googletagmanager.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' https://*.google-analytics.com https://www.googletagmanager.com",
  "font-src 'self'",
  "connect-src 'self' https://*.google-analytics.com https://*.analytics.google.com https://www.googletagmanager.com",
  "object-src 'none'",
  "base-uri 'self'",
  // The buy form's 303 leads to Stripe's hosted checkout (TASK-111), and a
  // browser holds a form's redirect to `form-action` too.
  "form-action 'self' https://checkout.stripe.com",
  "frame-ancestors 'none'",
].join("; ");

/**
 * Features the site does not use, turned off for the page and anything it
 * might embed. The list is the ones a browser would otherwise let a page ask
 * for; nothing on the site asks for any of them.
 */
const PERMISSIONS_POLICY: string = [
  "accelerometer=()",
  "autoplay=()",
  "camera=()",
  "display-capture=()",
  "geolocation=()",
  "gyroscope=()",
  "magnetometer=()",
  "microphone=()",
  "midi=()",
  "payment=()",
  "usb=()",
  "browsing-topics=()",
].join(", ");

export const SECURITY_HEADERS: readonly SecurityHeader[] = [
  // Two years, the value browsers' preload lists expect, without `preload`.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: PERMISSIONS_POLICY },
  { key: "Content-Security-Policy-Report-Only", value: CONTENT_SECURITY_POLICY },
];
