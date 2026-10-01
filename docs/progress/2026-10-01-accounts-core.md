# 2026-10-01 — TASK-061: free accounts, the core: schema, library and tests, dark

Branch `claude/friendly-brown-6n5iwu`, built on `main` @ `c376dd1` (#63). Task file: `tasks/061-accounts-core.md`. Decision: `docs/adr/0027-free-accounts.md`.

## Why

The project owner, after the cards: "people login to share with friends and access the next tier"; "Email + password"; "Ok go" to the plan in ADR-0027. The share-card download and the 29,99 zł tier both need to know who a reader is. This change is the part with no page in it: the storage, the rules and the tests, so the pages (TASK-062) have something already reviewed to call. Nothing on the site calls it, and no environment variable is set, so production behaves as before.

## What changed

- **ADR-0027** (new) records twelve decisions: email + password; a separate schema `accounts` written and read only by its own database role; scrypt from Node's `crypto`; address-first sign-up (the mailbox's owner chooses the password and accepts the terms at completion, so a stranger who types someone else's address cannot take the account); no account enumeration; a per-address sign-in throttle; mail returned by the service and sent by the route after it answers; Resend over `fetch`; accounts off unless three variables are set. ADR-0017 gained "Amended in part by: ADR-0027" (its "no user-written data" premise). `tasks/049-off-host-database-backup.md` carries a note to the same effect: the backup will now hold accounts.
- **Migration `0027_accounts_schema`:** schema `accounts` with `users` (a pending row has no password and no terms; a CHECK keeps the two states apart), `sessions` and `email_tokens` (both store SHA-256 only), `sign_in_failures` (keyed by the SHA-256 of the address). Every user table cascades. `down` refuses while any user exists, otherwise drops the schema.
- **`ops/vm/accounts-roles.sql`** (new, idempotent): creates `nameatlas_app` with no password, with a 10 s statement timeout and a 30 s idle-in-transaction timeout, and grants it `accounts` only (`USAGE`, and `SELECT, INSERT, UPDATE, DELETE` with default privileges for the build role's future tables). It has no privilege on any `public` table. Nothing runs this file yet: TASK-063 wires it into `provision.sh`.
- **`packages/db`:** `loadAccountsDbConfig(env)` returns `ACCOUNTS_DATABASE_URL` or null and never falls back to `DATABASE_URL`.
- **`packages/accounts`** (new, `@name-atlas/accounts`, depends on `@name-atlas/db` and the `kysely` version already in the repo; no new dependency): `password.ts` (scrypt N=65536, r=8, p=2, hash format records its parameters, bounds on what a stored row may claim, NFKC, `timingSafeEqual`, `needsRehash`), `tokens.ts`, `validation.ts` (address shape; password 10–128 code points, a short blocklist, not equal to the address), `mail-text.ts` (Polish and English, HTML escaped), `mailer.ts` (Resend over `fetch` with an 8 s timeout, errors carry the status only; an in-memory mailer for tests), `config.ts`, `schema.ts`, `service.ts` (`signUp`, `completeSignUp`, `signIn`, `sessionFromToken`, `signOut`, `requestPasswordReset`, `resetPassword`, `deleteAccount`, `purgeExpired`).
- **Tests:** 27 unit tests in five files in `packages/accounts`, and new ones for `loadAccountsDbConfig` in `packages/db/src/config.test.ts`; `tests/integration/src/accounts.test.ts` runs every flow through a real pooled connection as `nameatlas_app` with the roles file executed. Migration pins in `packages/db/src/migrator.test.ts`, `tests/integration/src/extensions.test.ts` and `tests/integration/src/canonical-key-v2.test.ts` now include `0027`.
- `.env.example` (three new variables, commented), `docs/CODEMAP.md` (a row), `STATUS.md`.

## Verification

Run on 2026-10-01, on the tree that was committed, with the last edits (comments and documents only) made before the final `format:check`:

- `pnpm format:check`, `pnpm typecheck`, `pnpm lint`, `pnpm check:ids`, `pnpm build` — exit 0.
- `pnpm test` — exit 0, 1,709 tests.
- `TEST_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres pnpm test:integration` — exit 0: 30 files, 366 tests passed. The output holds one line, `pool_idle_client_error … 57P01 terminating connection due to administrator command`: the harness drops each test database `WITH (FORCE)` (`packages/testing/src/postgres-container.ts:150`), which ends any idle pooled connection; `accounts.test.ts` contains no terminate call.
- `pnpm test:golden` — exit 0: 4 files, 364 tests passed.
- Three mutations made by hand, each run against the integration test, then reverted: the read-only web role granted `accounts` (caught by the roles test, AC-7); no hash spent on an unknown address (caught by the sign-in test, AC-3); a completed sign-up's token left unspent (first run: **survived**, because completion also requires the pending state; an assertion that no unspent token remains was added to the AC-2 test, and the second run caught it).
- Role isolation checked in the integration test against a real server: as `nameatlas_app`, `SELECT` on a `public` table fails with `42501` and the `accounts` tables work; as `nameatlas_web`, `accounts.users` fails with `42501`; no foreign key crosses the two schemas.

## Not verified

- The Resend request against the real API: tested with a stubbed `fetch` only (the documented URL, headers and body; a non-2xx answer yields an error with the status only). No Resend account or verified sending domain exists yet.
- `ops/vm/accounts-roles.sql` on the production VM and through PgBouncer: it ran on a stock PostgreSQL container only. The VM role's password, the PgBouncer user list and the GitHub secret are TASK-063 and the owner.
- Migration `0027` on the production database: it runs with the next deploy's migrate step, and the schema stays empty and unread until TASK-062 and TASK-063.
- scrypt's wall time on a Vercel function at N=65536 (about 64 MiB per hash): measured only on this machine's build, not on the deployed runtime. TASK-062 measures it before a sign-in route ships.
- Anything a browser touches: there is no page, route or cookie in this change.
