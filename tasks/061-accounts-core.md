# TASK-061 — Free accounts, the core: schema, library and tests, dark

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu`; record: `docs/progress/2026-10-01-accounts-core.md`.
- **Requested by:** the project owner, 2026-10-01: after the cards, "people login to share with friends and access the next tier"; "Email + password"; "Ok go" to the plan in ADR-0027.
- **Decision:** ADR-0027, which amends ADR-0017 §2.3. Also ADR-0026 (the tiers) and `ARCHITECTURE.md` §7.
- **Depends on:** TASK-057 (the offer page), on `main`.
- **Model guidance:** implementation session. Security-sensitive: review the diff adversarially.

## 1. Goal

A tested library that can create an account, verify its email, sign it in and out, reset its password and delete it, over a schema the register's role cannot read. Nothing calls it from the site yet, and nothing in production changes.

## 2. Facts (checked on `main` @ `c376dd1`, 2026-10-01)

1. The web app connects as `nameatlas_web`, `SELECT` only; `provision.sh` grants it `SELECT` on `public` and default privileges for tables the build role creates there. Schema `accounts` is outside both.
2. `packages/db/src/config.ts` is the only reader of `DATABASE_URL`. `createPool` is the pool factory. Workspace packages ship TypeScript source (`"exports": "./src/index.ts"`); the web app lists the ones it uses in `transpilePackages`.
3. Migrations run as the build role over the VM's socket; the test database runs them as the container's superuser. `canonical-key-v2.test.ts` steps down through every migration to `0006`.
4. TASK-062, TASK-063 and TASK-064 are free on `main` and in the open pull requests (#30, #44).

## 3. In scope

- **Migration `0027_accounts_schema`:** schema `accounts` with `users`, `sessions`, `email_tokens` and `sign_in_failures`. Its `down` refuses while any user exists.
- **`ops/vm/accounts-roles.sql`:** creates `nameatlas_app` (no password: the VM sets it), its timeouts, and its grants on `accounts` only, with default privileges for the build role's future tables. Idempotent, static SQL, run by `provision.sh` in TASK-063 and by the integration test now.
- **`loadAccountsDbConfig`** in `packages/db/src/config.ts`: `ACCOUNTS_DATABASE_URL`, or null.
- **`packages/accounts`** (`@name-atlas/accounts`):
  - password hashing and verification (scrypt), token generation and hashing, email and password validation;
  - the service functions of ADR-0027: sign-up (an address only), completing it (the password and the terms, by the mailbox's owner), sign-in, session lookup, sign-out, password-reset request and completion, account deletion, and a purge of what has expired;
  - the mail text in Polish and English, a `Mailer` interface, a Resend implementation over `fetch`, an in-memory one for tests;
  - config for the mail variables.
- **Tests:** unit tests for each module; an integration test over a real PostgreSQL for every flow, the throttle, the cascade, the down refusal, and the isolation of the two roles.
- `.env.example`, `docs/CODEMAP.md`, `STATUS.md`, a progress record.

## 4. Out of scope

- Routes, pages, cookies set on a response, the header link, the privacy notice and the terms, and the daily call of `purgeExpired`: TASK-062.
- The VM role's password, PgBouncer's user list, GitHub secrets, a Resend account and a sending domain: TASK-063 and the owner.
- Changing an email address or a password while signed in; two-factor; a check of passwords against a breach list; any social sign-in.
- The family tree and anything a reader saves.

## 5. Acceptance criteria

- **AC-1.** A sign-up for a new address stores a pending user, with no password and no terms, and returns the sign-up message; the same call for a complete account's address returns the same shape with no message and stores nothing new; for a pending address it returns a fresh message, at most three an hour (integration).
- **AC-2.** Completing sign-up needs the token, a password that passes the policy and the terms accepted. A weak password or unaccepted terms are refused and the token stays valid. It sets the password, the terms and the confirmation together, signs in, and spends the token once. A used, expired, unknown or malformed token is refused, and a malformed one never reaches the database (unit and integration).
- **AC-3.** Sign-in needs a complete account and the right password. An unknown address, a pending address and a wrong password all answer `REJECTED`. Eight failures for one address in 15 minutes answer `THROTTLED`, for any address, known or not (integration).
- **AC-3a.** Someone who signs up with another person's address cannot take the account: whatever they send at the form, the account stays pending with no password until the mailbox's owner completes it (integration).
- **AC-4.** A session token is stored only as its SHA-256, is found while unexpired, is renewed past the half-life, and is refused after sign-out, password reset or account deletion (integration).
- **AC-5.** A reset refuses a weak password without spending the token, then sets the password and ends every session, and refuses a pending account (integration). Deleting an account removes its user, sessions and tokens (integration). The purge removes expired sessions, old tokens, old failures and a lapsed pending address, and leaves a pending address with a live link (integration).
- **AC-6.** A hash records its parameters, verifies constant-time, differs for equal passwords, and a malformed or unsupported hash is refused (unit).
- **AC-7.** As `nameatlas_app`, a `SELECT` on a `public` table is refused and the `accounts` tables work; as `nameatlas_web`, `accounts.users` is refused (integration).
- **AC-8.** `0027` down refuses with a user stored and changes nothing; with none, it drops the schema (integration).
- **AC-9.** The Resend mailer sends the documented request and, on a non-2xx answer, throws an error that carries the status and neither the key nor the body (unit).
- **AC-10.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```
