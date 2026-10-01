# TASK-062 — Free accounts, the pages: sign-up, sign-in, reset, the account, the header link, the privacy notice and terms, the daily purge

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu`; record: `docs/progress/2026-10-01-account-pages.md`.
- **Requested by:** the project owner, 2026-10-01: "can you do it", after TASK-061 was merged and ADR-0027 §5 named this as the next step.
- **Decision:** ADR-0027, amended by this task in three places (§4 below). Also ADR-0017 §2.3, `ARCHITECTURE.md` §7.
- **Depends on:** TASK-061 (`@name-atlas/accounts`, migration 0027), on `main` at `fd6a871`.
- **Model guidance:** implementation session. Security-sensitive: review the diff adversarially.

## 1. Goal

A reader can sign up with an address, follow the link in the mail, choose a password and accept the terms, sign in and out, reset a forgotten password, see their account and delete it, in Polish and English. **It is dark by configuration:** unless every variable of §2.4 is set, no link, page or route exists and the privacy notice and terms read as they do today. Production does not change when this merges. TASK-063 (the VM role, the migration on the production database) and the owner's variables turn it on.

## 2. Facts (checked on `main` @ `fd6a871`, 2026-10-01)

1. `@name-atlas/accounts` returns messages and never sends them; the caller sends after answering (ADR-0027 §2.8). `sessionFromToken` renews a session's row past half-life and returns the new `expiresAt` "so the cookie's lifetime can follow it". A server component cannot set a cookie, so the cookie is given a lifetime longer than any row's and the row decides (§4.2).
2. `apps/web/src/middleware.ts` rate-limits every request per client, per instance (a fixed window in a `Map`): pages 60 a minute, `/api/` 30. It is a speed bump, not a defence against a distributed flood (`lib/rate-limit.ts`'s own header says so).
3. `security-headers.ts` already sets `form-action 'self'`, `frame-ancestors 'none'` and `Referrer-Policy: strict-origin-when-cross-origin`. Vercel Web Analytics' `beforeSend` drops the query string and the hash (`lib/analytics-path.ts`, TASK-058), so a `?token=` never reaches it.
4. The privacy notice says in two places that the site has no accounts and stores no cookie (`legal-text.ts`, "Czego nie robimy" / "What we do not do"). Both become false once accounts are on.
5. `legal-text.ts`'s terms date is 2026-09-30 and its privacy date 2026-10-01. The legal pages are static: their text is built from code, and an environment variable read at render is read at build.
6. There is no `vercel.json`. `next` is a dependency of `apps/web` only, so the Vercel project's root directory is inferred to be `apps/web` (the setting itself was not readable from here). A cron is declared in `vercel.json` of the root directory.
7. Open pull requests: #65 holds ADR-0028 and D-025; #44 holds a TASK-046 file; #30 holds no task, ADR or decision file. None holds TASK-062 or D-026, which this task takes (D-026 for the product's name and domain).
8. Resend (the default sender, ADR-0027 §2.8) states on its own pages that it is certified under the EU–U.S. Data Privacy Framework (and the UK extension) and that its DPA carries standard contractual clauses (`resend.com/changelog/data-privacy-framework-certification`, `resend.com/legal/dpa`, seen through a web search on 2026-10-01; the DPA itself was not read in full).

## 3. In scope

- **`apps/web/src/lib/accounts-config.ts`:** the gate, `accountsEnabled(env)`, true only when `ACCOUNTS_DATABASE_URL`, `RESEND_API_KEY`, `ACCOUNTS_MAIL_FROM`, `SITE_ORIGIN` and `CRON_SECRET` are all set; the configuration it returns; the session cookie's name and attributes; the paths of the pages and the routes in both languages; the terms version.
- **`apps/web/src/lib/accounts-runtime.ts`:** the one pool for the `accounts` schema (two connections, as `db.ts`), the service and the mailer, made on first use. Nothing else in the web app touches it.
- **`apps/web/src/lib/account-routes.ts`:** the POST handlers as functions over an injected service, mailer and clock: sign-up, complete, sign-in, sign-out, reset-request, reset, delete. Each checks the request came from this site (`Origin`, or `Sec-Fetch-Site: same-origin` when there is none), reads a form body, answers with a 303 to a page carrying a status word and never a message or an address, and sends a mail only after answering. A route that cannot reach the service answers a status word, never a stack.
- **Route files:** `app/api/account/[action]/route.ts` (POST), `app/api/cron/accounts-purge/route.ts` (GET), `app/pl/konto/[[...step]]/page.tsx`, `app/en/account/[[...step]]/page.tsx`, and `apps/web/vercel.json` with one daily cron.
- **`apps/web/src/lib/account-page.tsx`, `account-text.ts`:** the six pages in both languages as plain HTML forms with no script: account, sign-in, sign-up, reset request, confirm (set the password and accept the terms), new password. `noindex`, `no-store`, `referrer: same-origin` on the two token pages, a token only in the query and the form's hidden field.
- **The header:** one more link, "Konto" / "Account", when accounts are on.
- **`legal-text.ts`:** the accounts variant of the privacy notice and the terms, shown only when accounts are on, with its own date; the unchanged text otherwise.
- **`middleware.ts`:** a bucket for `/api/account/` of its own: 10 a minute.
- **`@name-atlas/accounts`:** nothing changes in the package unless the pages need an export it does not have.
- **CSS:** the account forms drawn as the offer's.
- **Tests:** unit tests for the gate, the paths, the cookie, the origin check, every handler (over a fake service), the cron route, the texts' parity and the legal variants; the middleware bucket.
- **Docs:** this file, ADR-0027's amendments, `.env.example`, `docs/CODEMAP.md`, `docs/DECISIONS_NEEDED.md` (D-026: the product's name and domain), `STATUS.md`, a progress record.

## 4. The amendments to ADR-0027

1. **§5.3, the owner's variables:** accounts need five, not three: the three of the library, `SITE_ORIGIN` (the mail's links are absolute) and `CRON_SECRET` (Vercel sends it as the bearer of the daily purge, on which the 7-day retention of a pending address depends; without it that retention would silently not hold, so without it accounts are off).
2. **§2.5, the cookie:** its lifetime is 400 days, and the database row, 30 days from its last renewal, decides whether it is valid. A server component cannot extend a cookie when it renews the row, so a cookie that expired with the first 30 days would end every session at day 30, however often it was used.
3. **§2.9, terms:** the version recorded is the date of the terms text the reader saw, `2026-10-01` for the accounts variant. The server uses its own current version and never one the form sends. A changed version asking for acceptance again is not built: nothing has changed yet.

## 5. Out of scope

- The VM role, the migration on the production database, PgBouncer's user list, the role's password, a Resend account and sending domain, setting the five variables: TASK-063 and the owner.
- Gating the card download behind a sign-in (TASK-064; D-025 changes what it leads to).
- Changing an address or a password while signed in, two-factor, social sign-in, a breach-list check.
- The tree, and its clause on living people (ADR-0028 §2.6).
- Renaming the product. The owner chose to buy no domain yet; D-026 records the question.
- Distributed rate limiting. The per-address throttle in the database and Resend's own limits are the real controls; the per-client bucket is a speed bump.

## 6. Acceptance criteria

- **AC-1.** With any of the five variables unset, `accountsEnabled` is false, the header has no account link, every account page and route answers 404, the cron route answers 204 and does nothing, and `legalDocument` returns exactly the text it returns today for both documents and both languages (unit).
- **AC-2.** With all five set, the header links to the account page in both languages, and both legal documents are their accounts variants, which say that an account exists, which data it holds, the cookie, how long each part is kept, and that Resend sends the mail (unit).
- **AC-3.** A POST to any account route without a same-origin `Origin` (or `Sec-Fetch-Site: same-origin` when `Origin` is absent) is refused with 403 and calls nothing (unit).
- **AC-4.** Sign-up answers the same redirect for a new address and an existing one, sends the mail only after the answer, and answers `email` for a malformed address (unit).
- **AC-5.** Opening the confirm page spends nothing. Its POST with a good password and the terms ticked sets the session cookie (`HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`) and redirects to the account page; a weak password or unticked terms return to the form with the token and a status; a lapsed token answers `expired` (unit, local browser run).
- **AC-6.** Sign-in sets the cookie on success and answers `rejected` or `throttled` otherwise, with one page text for a wrong password, an unknown address and a pending one (unit).
- **AC-7.** Sign-out clears the cookie and ends the session; deletion needs the password and clears the cookie; neither works without a session (unit).
- **AC-8.** The reset request answers the same for any address; a reset sets the password, ends every session and sends the reader to sign in (unit, local browser run).
- **AC-9.** The cron route answers 401 without the bearer, runs `purgeExpired` with it and returns only counts; `vercel.json` declares it daily (unit).
- **AC-10.** Token pages carry `noindex`, `no-store` and `referrer: same-origin` (not `no-referrer`: that makes the browser write `Origin: null` on the page's own form, which the local browser run found, so the origin check also takes a `null` Origin when `Sec-Fetch-Site` is `same-origin`); `analyticsUrl` drops `?token=` (unit).
- **AC-11.** `/api/account/` has its own bucket of 10 a minute (unit).
- **AC-12.** Both languages have every text; no page text, redirect or log line carries an address, a password or a token (unit).
- **AC-13.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0. The whole flow runs in a browser against a real PostgreSQL with the roles file applied and a stand-in for Resend's endpoint: sign-up, the mail, confirm, sign-out, sign-in, reset, delete.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```

Then the local run of AC-13 with `next start`, a Playwright-driven Chromium and a preloaded `fetch` stand-in that records the request Resend would receive.
