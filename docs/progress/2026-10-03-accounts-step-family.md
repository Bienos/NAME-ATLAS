# 2026-10-03 — The VM's `accounts` step learns schema `family`; migration 0028 is on production

**Change:** `ops/vm/accounts.sh`, `ops/vm/editions.sh`, `ops/vm/extras.sh`, `ops/vm/finalize.sh`, `ops/vm/shift.sh`, `scripts/check-vm-dumps.sh`, `STATUS.md`, this file. No task number: it is the VM side of ADR-0029 that TASK-066 left out, found by the first production run of the step after #67 merged.

## Why

At the owner's "set the vars and run accounts" (2026-10-03), the `Register VM` workflow's `accounts` step ran on `main` @ `4dce85f` (run 37133545054, 15:31:32–15:32:23 UTC). It applied migrations **0028_family_schema** and **0029_notable_bearers** on the production database, re-ran the roles file (grants on `family` as on `accounts`, both schemas already present), found the password and PgBouncer's user list unchanged, and then **failed one of its isolation checks**: "foreign keys between accounts and any other schema: expected '0', got '5'". The five are the family tree's references to `accounts.users` (`trees.owner_user_id`, `persons.created_by`, `members.user_id`, `members.invited_by`, `audit_events.user_id`), which ADR-0029 §2.1.2 requires: no key leaves the two private schemas except into `accounts.users`. The check predates the tree and knew only `accounts`. Every other check passed, including the ones through PgBouncer, and the step ended with "ERROR: a check failed; accounts are not ready on this VM" (exit 1). The migrations stay applied; the step is repeatable.

The same gap showed in the four data-load dumps: they excluded the rows of `accounts` and not of `family`, so a future dump on the VM would have copied the people of every tree into a plain file there.

## What changed

- `ops/vm/accounts.sh`: the schema-scoped checks cover both private schemas (`accounts`, `family`): the app role reads and writes every table of both and may truncate, reference or trigger none; it uses each schema and cannot create in it; the web role has no use of either and no privilege on any table; no grant to PUBLIC on either; **the foreign-key check counts keys that cross the boundary of the pair** (`accounts`, `family`) with any other schema, so the five keys from `family` into `accounts.users` are inside it and a key into or out of the register would still fail it. New: "schema family has the tables of migration 0028" (at least five) and, through PgBouncer, that `family.trees` is readable. The header names 0028 and the two schemas.
- The four dumps add `--exclude-table-data='family.*'` beside `'accounts.*'`, with the comment saying so; `scripts/check-vm-dumps.sh` requires both flags on every `pg_dump` (`pnpm check:vm`).

## Verification

- `pnpm check:vm` — exit 0: "9 scripts parse, and all 4 pg_dump invocations exclude the rows of schemas accounts and family". `bash -n ops/vm/accounts.sh` — exit 0. `shellcheck` is not installed here.
- The new catalog queries, run as the superuser on the local database `na_e2e` (PostgreSQL 16, migrated through 0028 with `ops/vm/accounts-roles.sql` applied, the one the browser flow of TASK-076 used): the old boundary query returns **5** (the production failure reproduced), the new one **0**; `family` has at least five tables (true); the app role cannot read-and-write on 0 tables and may truncate, reference or trigger 0; its `family` USAGE|CREATE is `true|false`; the web role's `family` USAGE is false and it holds a privilege on 0 tables of the two schemas; PUBLIC holds 0 grants on the two schemas.
- `pnpm format:check`, `pnpm check:ids` — exit 0.

## Not verified

- The whole step on the VM with this change: it runs when the owner (or the next session) re-runs `Register VM` → `accounts` on `main` after this merges. PgBouncer is not installed in this container, so the pooler part was not rehearsed.
- The dumps with the new flag: the four data-load steps are not re-run for this; the next one that runs takes a dump that leaves `family` out.

## Production, as of this change (read 2026-10-03, 15:31–15:36 UTC)

- Vercel production variables set by this session at 15:31 UTC at the owner's word: `CRON_SECRET` (sensitive, generated), `ACCOUNTS_MAIL_FROM` = `Name Atlas <konto@name-atlas.pl>`, `FAMILY_TREE_ENABLED` = `1`. Present before: `RESEND_API_KEY`, `SITE_ORIGIN`, `DATABASE_URL`. **Still missing: `ACCOUNTS_DATABASE_URL`** (it carries `VM_DB_APP_PASSWORD`, which only the owner can read), so accounts and the tree remain off; the production deployment of `4dce85f` (`dpl_DhN9WQHqn8kpaWbM5UQPHQp6Dh9X`, READY at 15:24 UTC) was built before the variables and carries none of them. Whether `name-atlas.pl` is verified in Resend is not known to this session.
