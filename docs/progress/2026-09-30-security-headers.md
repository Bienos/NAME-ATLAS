# 2026-09-30 — TASK-048: security headers on every response

## What changed

- `apps/web/src/lib/security-headers.ts` (new): `SECURITY_HEADERS` and `CONTENT_SECURITY_POLICY`. The headers are `Strict-Transport-Security: max-age=63072000; includeSubDomains` (no `preload`), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, a `Permissions-Policy` that turns off twelve features, and `Content-Security-Policy-Report-Only`. The policy is `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`.
- `apps/web/next.config.ts`: `headers()` applies them to `/:path*`. The `webpack` block (D-012) is untouched.
- `apps/web/src/lib/security-headers.test.ts` (new): 4 tests. They check that the config applies every header to every path, and that each baseline value is present. They also check that there is no enforced CSP, no `Cross-Origin-Resource-Policy`, no `Access-Control-Allow-Origin` and no `preload`. The last test checks that the policy has no `*`, no `unsafe-eval` and no inline scripts.
- `tasks/048-security-headers.md` (status), `STATUS.md`, `docs/CODEMAP.md`.

The project owner decided U-1 on 2026-09-30 (recorded in #45): report-only first. `frame-ancestors` has no effect in report-only mode, so `X-Frame-Options: DENY` is what blocks framing today. `apps/admin` is not changed. No record in `STATUS.md` or `docs/CODEMAP.md` says it is deployed; Vercel's project `name-atlas` serves `apps/web`.

## Verification (run 2026-09-30, from `main` @ `3a43bc8` plus this change)

- `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`: each exit 0.
- `pnpm exec vitest run src/lib/security-headers.test.ts` in `apps/web`: 4 passed.
- `pnpm start -p 3100` **without a database** (Docker has no daemon in the session). `curl -D -` on `/`, `/pl/nazwisko/nowak`, `/pl/porownaj`, `/api/health`, `/api/v1/surname-prefix?q=no` (500, no database) and `/opengraph-image` (404): all six headers were present on every response, including the error responses. None carried `Access-Control-Allow-Origin` or `Cross-Origin-*`.
- Chromium 1194 (Playwright) on `/`, `/pl/nazwisko/nowak`, `/pl/porownaj?a=nowak&b=kowalski` and `/en/surname/nowak`: status 200, and 0 enforced CSP blocks. Each page had 2 report-only messages, "Refused to execute inline script", from the App Router's inline scripts. There were no reports for styles, fonts, images or requests.

## Not verified

- AC-1 and AC-2 on a deployment. The surname and comparison pages ran without a database, so they showed their "no data" state, not the full page with its maps and plates. Checking a preview or production deployment after merge covers the full pages.
- A real surname page's `opengraph-image` route with the headers. That route needs the database. The headers set nothing that affects a cross-site fetch of it.
- Enforcing the CSP. It needs the inline scripts allowed, by nonces or hashes, which is a later change.
