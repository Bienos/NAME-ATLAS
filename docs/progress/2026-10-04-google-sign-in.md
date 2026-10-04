# 2026-10-04 — TASK-084: Google sign-in, and the family tree's ways in from the header and the landing page (dark)

## What changed

- **Decisions.** ADR-0033 (Google sign-in beside email and password, by hand, with no identity service; amends ADR-0027 §2.1). D-034: the family tree is free with an account (the owner, 2026-10-04: "tree free with sign up"), superseding D-029. ADR-0027 and ADR-0029 carry an "Amended by" line.
- **Migration 0032** (`0032_accounts_google_identities.ts`): `accounts.identities` (provider `GOOGLE`, Google's `sub`, the user; unique per provider and subject, and per user and provider; cascades with the user); `users_pending_or_complete` now lets a complete account have no password; token purpose `GOOGLE_TERMS`. Its down migration refuses while an identity or a password-less account is stored.
- **`@name-atlas/accounts`.** `google.ts`: `loadGoogleConfig`, `googleAuthorizeUrl` (code flow, `openid email`, state, PKCE S256), `exchangeGoogleCode` (token endpoint over `fetch`), `identityFromIdToken` (issuer, audience/`azp`, expiry, issue time; the signature is not checked, ADR-0033 §2.3). Service: `signInWithGoogle`, `completeGoogleSignUp`, `deleteAccount` with `confirmed` for an account without a password, `Session.hasPassword`. No new dependency.
- **Web app.** `accounts-config.ts`: accounts on with `ACCOUNTS_DATABASE_URL`, `SITE_ORIGIN`, `CRON_SECRET` and either Resend's pair or Google's pair (`mailEnabled`, `googleEnabled`). `google-routes.ts` and `app/api/account/google/` (start, callback). The `google-complete` action and the terms step (`/pl/konto/witaj`, `/en/account/welcome`). "Kontynuuj z Google" above the email form on sign-in and sign-up; with Google alone, no email form, and the reset, confirm and new-password steps and the sign-up and reset-request routes 404. The account page for an account without a password (a line about Google, "Ustaw hasło" when mail is on, deletion by a ticked box). `safeNext` accepts the tree's page; the tree's sign-in redirects and its landing page's buttons carry `next` to it.
- **Header.** The account link is last and drawn as a pill button.
- **Landing.** With the tree on: one line under the search ("Chcesz zapisać swoją rodzinę? Zacznij drzewo rodzinne · Zaloguj się") and a section after "Co dostaniesz" with three lines, "Zacznij z Google" (only with Google on) and "Inny sposób".
- **Offer page.** The tree moves from "Nazwisko i rodzina" (29,99 zł) to the free tier's "coming soon" note, and both ledes say so (D-034).
- **Privacy notice.** With Google on: a section "Logowanie przez Google" / "Signing in with Google" and Google Ireland Limited in the list; date `GOOGLE_LEGAL_UPDATED` 2026-10-04. The terms are unchanged.
- **Runbook.** `ops/vm/README.md` gains the owner's Google steps.

## Verification (run in this session)

- `pnpm typecheck`: exit 0.
- `pnpm lint`: exit 0.
- `pnpm format:check`: "All matched files use Prettier code style!"
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm test`: exit 0; `apps/web` 65 files, 710 tests; `packages/accounts` 6 files, 50 tests (with the new `google.test.ts`); every other package passed.
- `pnpm build`: exit 0. `apps/web` compiled "with warnings": one warning, a Node API in Next's own code imported by `src/middleware.ts`, which this change does not touch.
- `TEST_DATABASE_URL=postgres://postgres@127.0.0.1:5433/postgres pnpm test:integration` against a local PostgreSQL 16.14 with PostGIS 3: exit 0, 33 files, 399 tests. `accounts.test.ts` has 35 tests, 11 of them new for Google and migration 0032. `canonical-key-v2.test.ts` and `extensions.test.ts` were updated for the new migration's name.
- `TEST_DATABASE_URL=… pnpm test:golden`: exit 0, 4 files, 364 tests. A first run without `TEST_DATABASE_URL` failed with "Could not find a working container runtime strategy": this container has no Docker.
- **A local run of the built site** (`next build --webpack`, `next start`) against a migrated local database, with the roles file run, Google's two variables set to dummy values, no Resend variables and `FAMILY_TREE_ENABLED=1`, checked with `curl` and Playwright's Chromium:
  - `/pl/konto/zaloguj?next=/pl/konto/drzewa`: 200, the tree line, "Kontynuuj z Google" with `next`, no email form. `/pl/konto/reset`: 404.
  - `GET /api/account/google`: 303 to `accounts.google.com` with `scope=openid+email`, a state, an S256 challenge and the local callback; `Set-Cookie: na_google=…; Path=/; Max-Age=600; HttpOnly; SameSite=Lax`.
  - The callback without the cookie: 303 to `/pl/konto/zaloguj?status=google-failed`.
  - `/pl/konto/drzewa` signed out: 307 to `/pl/konto/zaloguj?next=%2Fpl%2Fkonto%2Fdrzewa`.
  - `/`: the hero line, the section with "Zacznij z Google", and the header's `nav-account`. `/pl/prywatnosc`: the Google section and Google Ireland Limited.
  - What Google's return leads to, simulated: `signInWithGoogle` called directly against the local database gave a terms token. `/pl/konto/witaj?token=…&next=/pl/konto/drzewa` returned 200 with the form. Its POST returned a 303 to `/pl/konto/drzewa` with the session cookie, and that page returned 200 with the session. The account page showed the Google line and the deletion checkbox.
  - Screenshots, desktop and phone, showed the Google button's and the landing button's text in amber, against Google's white and the shell (`.dusk a` outweighed the button rules). Fixed in this change with `a.`-qualified selectors and checked again on new screenshots.

- **Again after rebasing onto `main` @ `85312b9`** (with migrations 0030 and 0031 and the Konstelacja view, #98): `check:ids`, `format:check`, `typecheck`, `lint`, `test` (web 729 tests), `build` exit 0; `test:integration` 36 files, 431 tests, and `test:golden` 364 tests, exit 0, against the same local PostgreSQL.

## Not verified

- **A real sign-in with Google.** No Google OAuth client exists yet, and Google's token endpoint was not called. The code exchange and the callback are covered by unit tests with a stubbed `fetch`, and the service by the integration tests.
- The Google Cloud console steps in `ops/vm/README.md` follow Google's current "Google Auth Platform" pages from memory. They were not clicked through in this session.
- The privacy text about Google Ireland Limited, like the rest of the account text, has had no lawyer's review (ADR-0023 §2.5).
- **Migration order:** 0030 and 0031 (#81) are on `main` before 0032, so the order on the VM is the order of the numbers. Which of 0030–0032 the VM has applied was not read.
- Nothing in production changed or was checked.
