# TASK-049 — An off-host copy of the production database, with one restore tested

- **Status:** TOOLING IMPLEMENTED 2026-10-02 in TASK-070; production upload and PostgreSQL 17 restore drill remain BLOCKED on the R2 credentials and the owner-held age identity. AC-1 is verified; AC-2 and AC-3 are not completed. One of five launch hygiene tasks (046–050).
- **Requested by:** the project owner, 2026-09-30 (see TASK-046).
- **Milestone:** none in `PLAN.md`.
- **Depends on:** TASK-042 (the VM) and its `finalize`; the owner's access to the VM or a working `Register VM` workflow.
- **Model guidance:** implementation session for the script; the run on the VM is the owner's or an SSH session's.

## 1. Goal

If the Oracle VM, its boot volume or the account is lost, the database can be rebuilt from a copy that does not live on that VM, and that has been restored at least once to prove it works.

## 2. Facts (checked on `main` @ `107ff65`, 2026-09-30)

1. `ops/vm/README.md` "Keeping it": `finalize.sh`, `extras.sh` and `editions.sh` each leave a `pg_dump --format=custom` in `/var/lib/name-atlas/backup/` on the VM. "Restoring any of them has not been tested, and there is no copy off the VM."
2. The latest dump, after the editions, is 1.7 GB; the database is 17 GB (`docs/progress/2026-09-30-pesel-editions-loaded-on-the-vm.md`).
3. The data changes only when an import runs; there is no user-written data. A copy after each load, not a nightly one, meets the need today.
   **Amended 2026-10-01 by ADR-0027:** accounts (an address, a password hash, sessions) are user-written data in schema `accounts` once they are switched on, and a family tree will be. Losing the VM would then lose readers' work, and "nothing writes between imports" stops being true for that schema. Until accounts are on, the sentence above stands. Before the family tree, this task comes first.
   **Amended 2026-10-01 by TASK-063:** the four on-VM dumps in fact 1 exclude the rows of schema `accounts` (`--exclude-table-data='accounts.*'`, held by `pnpm check:vm`), so that no address or password hash sits in a plain file on the VM. This task's backup is therefore the only copy of accounts, and it **must include them**, encrypted before it leaves the VM, restore-tested, and with a stated retention for a deleted account (the privacy notice says nothing about backups until this exists).
4. Oracle may reclaim an idle Always Free instance and suspend an idle account (`ops/vm/README.md`). A copy in the same Oracle account does not cover account suspension.
5. `docs/canonical/19` §95: backups encrypted, access-restricted, region-controlled, restore-tested.
6. Supabase still holds the old seven-surname slice as a rollback. It is not a backup of the register.

## 3. In scope

- `ops/vm/backup.sh`: takes the newest dump (or makes one), encrypts it (`age` or `gpg` to a public key the owner holds; the private key never on the VM), uploads it to the chosen destination (§5 U-1), verifies the uploaded object's size and SHA-256, and keeps the last N copies. Idempotent, `shellcheck`-clean, written like the other `ops/vm/*.sh`.
- A `backup` step in `register-vm.yml` beside `extras` and `editions`, and a line in `ops/vm/README.md` for running it over SSH while Actions is down.
- One restore drill: download, decrypt, `pg_restore` into a scratch PostgreSQL 17 with PostGIS (local or a Neon/Supabase branch), then compare the surname count (598,476), the four `ACTIVE` claim counts and one surname's page payload with production.
- `ops/vm/README.md` "Backups" rewritten with what now exists.

## 4. Out of scope

- Point-in-time recovery, WAL archiving or a replica.
- Scheduled backups (nothing writes between imports; add a timer when something does).
- Backing up Vercel's configuration or the repository.

## 5. Unknowns

- **U-1. Decided on 2026-09-30: Cloudflare R2.** The project owner said to "pick something convenient". R2 is outside the Oracle account, speaks the S3 API (`rclone`), and charges nothing for downloads, so a restore costs nothing. The session reads its free-tier limits on the day and records them with the date; if they do not fit about 1.7 GB per copy, it stops and reports. The original question follows.
- **U-1 (as asked).** The destination: a provider outside the Oracle account (e.g. Cloudflare R2, Backblaze B2, the owner's Google Drive) or Oracle Object Storage in another account/region. The session lists free-tier limits read from each provider's page on the day, with the date, and the owner picks. It needs one credential from the owner, given as a VM secret, never committed.
- **U-2.** The encryption public key, generated and held by the owner.

## 6. Acceptance criteria

- **AC-1.** `shellcheck ops/vm/*.sh` and `actionlint .github/workflows/register-vm.yml` pass.
- **AC-2.** A run on the VM uploads an encrypted dump; its size and SHA-256 at the destination match the local file. The output is recorded.
- **AC-3.** The restore drill in §3 is run and its counts match production's; the record states which database it was restored into and how long it took.
- **AC-4.** No credential, key or password is in the repository or in the run's printed output.

## 7. Verification

```
shellcheck ops/vm/*.sh && actionlint .github/workflows/register-vm.yml
```

Then the VM run and the restore drill, each with its real output in the progress record.
