# 2026-09-30 — TASK-041: provisioning scripts and runbook, rehearsed

This adds to `2026-09-30-oracle-postgres-hosting.md` (ADR-0016 and TASK-041's specification) and does not rewrite it.

## Changed

- **TASK-041 §13 decided.** The project owner asked for the session's answers ("what your answers to TASK-041's six questions"). After an explanation of what each is for, they accepted them: "ok go ahead i want this".
  - U-1: a DuckDNS name;
  - U-2: Pay As You Go with a budget alert;
  - U-3: PgBouncer;
  - U-4: rebuild from source plus weekly volume backups;
  - U-5: the owner runs the commands and pastes output;
  - U-6: Supabase kept 14 days for rollback.

  The task's status is IN PROGRESS.
- **ADR-0016 §2 items 7–8:** PgBouncer's 6432 is the one public port, PostgreSQL listens on `localhost`, and only the read-only web role can log in from outside.
- **`scripts/production/provision-db.sh`, new.** It is idempotent and runs as root on the VM:
  - Ubuntu's `postgresql-16`, `postgresql-16-postgis-3` and `pgbouncer`;
  - the data directory on the block volume. It formats a device only if it has no partitions, no mount and no filesystem signature;
  - memory-proportional settings;
  - `log_statement = none`, `log_min_error_statement = panic` and parameter logging off, so no searched surname reaches a log;
  - owner and read-only web roles, with passwords generated into `/root/name-atlas-credentials` (0600) and passed to `psql` through the environment only;
  - extensions created by the superuser;
  - `SELECT` plus default privileges for the web role, and `default_transaction_read_only = on`;
  - PgBouncer in transaction mode, TLS required, protocols `secure`, the web role's SCRAM verifier as its only auth entry;
  - a Let's Encrypt certificate through a DuckDNS DNS-01 hook, with a deploy hook into PgBouncer;
  - a DuckDNS IP-update timer;
  - an `iptables` rule for 6432 inserted before Oracle's REJECT and persisted;
  - unattended upgrades.

  `--rehearsal` skips the volume, DuckDNS, Let's Encrypt and the firewall, and uses a self-signed CA.
- **`scripts/production/build-register.sh`, new.**
  - It installs `.nvmrc`'s Node from nodejs.org only if the tarball matches `SHASUMS256.txt`.
  - It enables corepack.
  - It creates an unprivileged `atlas` user and runs `pnpm install --frozen-lockfile && bash scripts/local-setup.sh` as that user.
  - On a systemd host it does this as the transient unit `name-atlas-build`, with the connection string supplied through `EnvironmentFile`, not the command line. `--foreground` runs it in the terminal.
- **`scripts/production/check-db.sh`, new.**
  - `remote <host>` needs no secret. It checks that the certificate verifies for the host, that a non-TLS connection is refused, that a wrong password is refused, and that 5432 is unreachable.
  - `local` checks the rest with the credentials.
  - `stats` gives the database size and counts.
- **`docs/PRODUCTION_DATABASE.md`, new.** The runbook: what data is on the server and what never is, the owner's console steps, provisioning, the build, the outside check, cutover, rollback, renewal and rebuild.
- **`STATUS.md` and `docs/CODEMAP.md`:** the lines this makes untrue. `main` (#32, TASK-040 the landing atlas) was merged in; the conflicts in both files were resolved keeping both sides.

## Verified

All in this session's container: Ubuntu 24.04.4, **amd64**, **no systemd**, 4 CPUs, 16 GB. It is not the target VM; see "Not verified".

| Command | Result |
|---|---|
| `shellcheck scripts/production/*.sh` (0.9.0) | No findings, after two fixes of its own findings: an apostrophe inside `${VAR:?…}` that broke parsing, and one intentional single-quoted `$$` marked with a directive. |
| `bash scripts/production/provision-db.sh --rehearsal`, run 1 | Exit 0, `done: 6 change(s).` It installed `pgbouncer` 1.22.0, `unattended-upgrades`, the settings, credentials, the self-signed CA and the two PgBouncer files. |
| the same, run 2 | Exit 0, `done: 0 change(s).` |
| the same, run 3, after the last edits to the script | Exit 0, `done: 0 change(s).` |
| `DERIVE_LIMIT=300 bash scripts/production/build-register.sh --foreground` from a copy of the repository in `/opt/name-atlas` | `build exit 0`. See below. |
| `bash scripts/production/check-db.sh stats` | See below. |

**The build rehearsal:**
- All four official files downloaded from api.dane.gov.pl and were "saved and verified" against the registry's SHA-256.
- All 23 migrations, `0001` to `0023`, applied as the **non-superuser** `atlas_owner`. `0001`'s `CREATE EXTENSION IF NOT EXISTS` found the extensions the script had created as superuser.
- Both national and both regional imports completed. Page addresses were assigned.
- Derivation was limited to 300 surnames per step, and reported `rate 17.9/s | failed 0` and `rate 23.9/s | failed 0`.
- Step durations were not captured in foreground mode.

**`check-db.sh stats` after that build:**
- `database_size` 1480 MB;
- 598,476 surnames, 4 source records, 2,168,869 distribution values;
- `ACTIVE` claims: `CURRENT_POPULATION` 1,216, `CURRENT_RANK` 1,216, `RARITY_CONTEXT` 1,216, `CURRENT_DISTRIBUTION` 607.

These are **not** the complete register's figures, because derivation was limited.

**The web app through PgBouncer.** `next start` for `apps/web` ran with `DATABASE_URL` = the `atlas_web` role on `localhost:6432`, `sslmode=verify-full`, and the rehearsal CA as `sslrootcert`:
- `GET /api/v1/surname-results` answered as follows:

  | Surname | Status | Population |
  |---|---|---|
  | `NOWAK` | `RESOLVED` | `READY`, [98387, 99738] |
  | `KOWALSKI` | `RESOLVED` | `READY`, [66589, 535] |
  | `WÓJCIK` | `RESOLVED` | `READY`, [47734, 48568] |
  | `Xyzzyq` | `UNRESOLVED` | — |

- `/pl/nazwisko/nowak` answered 200.
- The server log held no connection, TLS or certificate error.

This is the app's read path under transaction pooling, as the read-only role, with the certificate and host name verified.

**`CA_FILE=… check-db.sh local`:** 12 PASS, 3 FAIL.
- **PASS:**
  - PostgreSQL 16.13 and PostGIS 3.4.2 through PgBouncer with `verify-full`;
  - both extensions present;
  - the web role reads (598,476 surnames);
  - INSERT, UPDATE, DELETE, DROP and CREATE refused to it ("cannot execute … in a read-only transaction");
  - the owner role cannot log in through PgBouncer;
  - PostgreSQL listens on localhost only;
  - `log_statement=none`;
  - unattended upgrades on.
- **FAIL, all expected in a rehearsal:**
  - the data directory is not on a data volume, since there is none here;
  - there is no persisted firewall rule for 6432, since the rehearsal skips the firewall.
- **FAIL, a bug in the check, now fixed:** "unattended upgrades off". With `pipefail`, `grep -q`'s early exit sent SIGPIPE to `apt-config dump`, so the check failed although the setting was on. It now reads a string, and the re-run shows PASS.

**`CA_FILE=… check-db.sh remote localhost`:**
- **PASS:**
  - the certificate verifies for `localhost`;
  - without TLS: "FATAL: SSL required";
  - a wrong password: "FATAL: SASL authentication failed".
- **FAIL, expected here:** "port 5432 reachable". Run against `localhost`, PostgreSQL's loopback listener is reachable by design. The check is meant for a real outside machine.
- **Fixed:** the TLS version printed empty. OpenSSL 3 reports it as `New, TLSv1.3`, and the re-run prints `TLSv1.3`.

**Checked in the repository:**
- `pnpm check:ids`: every number is used once.
- `pnpm format:check`: passed.
- `git grep` for a DuckDNS token or a password in `scripts/` and the runbook found only the deliberate wrong password `not-the-password` in `check-db.sh`.

## Rehearsal-only differences

- **The proxy certificate.** The container's egress proxy certificate (`/root/.ccr/ca-bundle.crt`) is readable by root only. The `atlas` user's `pnpm install` stalled at 0 downloads until `NODE_EXTRA_CA_CERTS` and `SSL_CERT_FILE` pointed at a readable copy. The VM has no such proxy.
- **No systemd.** The scripts' non-systemd branches ran: `pg_ctlcluster`, and `pgbouncer -d` run directly. The systemd branches did not run: `systemctl`, `systemd-run`, and the DuckDNS timer.
- **No block volume, DuckDNS, Let's Encrypt or firewall.**

## Not verified

Everything that needs the VM:
- the arm64 package versions;
- the volume formatting and mount;
- the systemd paths, including the build unit;
- DuckDNS, and the certbot DNS-01 and deploy hooks;
- the `iptables` rule on Oracle's image;
- a reboot;
- the **complete** build's duration and final size;
- the cutover and rollback.

These are TASK-041's remaining acceptance criteria, after the owner's runbook §1–§3. Still open as well:
- whether Pay As You Go exempts an instance from idle reclamation;
- whether Vercel offers fixed outbound addresses on this plan.
