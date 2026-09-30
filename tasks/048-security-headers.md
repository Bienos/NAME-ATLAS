# TASK-048 — Security headers on every response

- **Status:** IMPLEMENTED 2026-09-30 on `claude/tender-dirac-lxsnjb`, the CSP in report-only mode per U-1 (`docs/progress/2026-09-30-security-headers.md`). AC-1 and AC-2 were checked locally without a database, not yet on a deployment. One of five launch hygiene tasks (046–050).
- **Requested by:** the project owner, 2026-09-30 (see TASK-046).
- **Milestone:** none in `PLAN.md`.
- **Depends on:** nothing.
- **Model guidance:** implementation session.

## 1. Goal

Every HTML page and API response carries a baseline set of security headers, with a Content Security Policy built from what the site actually loads, not from a template.

## 2. Facts (checked on `main` @ `107ff65`, 2026-09-30)

1. `apps/web/next.config.ts` sets no `headers()`. There is no `vercel.json`. `apps/web/src/middleware.ts` does rate limiting only.
2. `next.config.ts` warns that its `webpack` block is governed by D-012; adding a `headers()` key does not touch that block.
3. `docs/canonical/19` §75 sets the CSP aim: `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, explicit `script-src` (nonces), explicit `connect-src` and `img-src`, no `*`, no `unsafe-eval` unless justified. §77: no `Access-Control-Allow-Origin: *` on the API.
4. Next.js App Router injects inline scripts. A strict `script-src` needs per-request nonces from middleware, which makes every page dynamic. Whether that is acceptable for pages that are statically rendered today is the one design choice here (§5 U-1).
5. The share cards (`opengraph-image`) must stay fetchable by other sites' crawlers; `frame-ancestors`/`X-Frame-Options` do not affect that, but a `Cross-Origin-Resource-Policy: same-origin` would. It must not be set on those routes.

## 3. In scope

- Through `headers()` in `apps/web/next.config.ts` (static headers) and, if U-1 picks nonces, the existing middleware:
  - `Strict-Transport-Security: max-age=63072000; includeSubDomains` (no `preload` without the owner's decision; the site is on a `vercel.app` subdomain).
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `X-Frame-Options: DENY` and `frame-ancestors 'none'`
  - `Permissions-Policy` turning off camera, microphone, geolocation, payment and the rest the site does not use.
  - `Content-Security-Policy` per §2.3, with every allowed origin traced to something the site loads. Shipped first as `Content-Security-Policy-Report-Only` if the session cannot show that no page breaks under enforcement.
- `apps/admin`: the same, if it is deployed anywhere; if it is not, say so and leave it.
- A test that reads the configured headers and fails when one is removed.

## 4. Out of scope

- A CSP reporting endpoint or collector.
- WAF or CDN rules (the note in `middleware.ts` about distributed floods stays a separate matter).
- HSTS preload submission.

## 5. Unknowns

- **U-1. Decided by the project owner on 2026-09-30: report-only first.** Ship the strict policy (no `'unsafe-inline'` scripts) as `Content-Security-Policy-Report-Only`, keep pages static, and enforce in a later change once the violations are known. The original question follows.
- **U-1 (as asked).** Nonce-based `script-src` (every page becomes dynamic, more database load at the rate-limited edge) or hash/`'self'` with `'unsafe-inline'` for scripts as a documented, temporary exception. The session measures what changes in `pnpm build`'s route table and proposes one; the owner decides. Recorded in `docs/DECISIONS_NEEDED.md` if not decided in the session.

## 6. Acceptance criteria

- **AC-1.** `curl -sI` on `/`, a surname page, a comparison page, an API route and an `opengraph-image` route of a preview deployment shows the headers in §3, and the share card still loads.
- **AC-2.** The landing, a surname page and the comparison page load in Chromium (Playwright) with no CSP violation in the console.
- **AC-3.** The API responses carry no `Access-Control-Allow-Origin: *`.
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
curl -sI <deployment>/ <deployment>/pl/nazwisko/nowak <deployment>/api/health
```

Plus the Playwright console check, recorded with its output.
