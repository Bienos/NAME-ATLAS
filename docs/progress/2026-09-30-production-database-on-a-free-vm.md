# 2026-09-30 — TASK-040: the free-VM database is scripted and rehearsed; nothing has run on the VM yet

Scope authority: `tasks/040-production-database-on-a-free-vm.md`. Decision: ADR-0015. It was written and implemented in this change. It was numbered TASK-038, then TASK-039, on a branch cut before #25 and #26 merged different tasks under those numbers (the source registry, the TERYT import), and renumbered to TASK-040 when the branch moved onto `main`. The owner created the Oracle VM, gave its public address and set `VM_SSH_KEY` and `VM_HOST`. The workflow's `check` and `provision` steps have run on the VM (below). The build, `status` and `finalize` have not, and the VM's port 6432 is not open from the internet yet.

## Changed

- `docs/adr/0015-production-database-on-a-free-vm.md`: production's database moves to a self-managed PostgreSQL 17 on an Oracle Cloud Always Free A1 VM, behind PgBouncer. Supersedes ADR-0011's choice of Neon; ADR-0011 gains a back-reference.
- `tasks/040-production-database-on-a-free-vm.md`: new. `tasks/035-…`: its status line records that TASK-040 supersedes it.
- `ops/vm/provision.sh`, `build.sh`, `status.sh`, `finalize.sh`, `request`, `README.md`: new.
- `.github/workflows/register-vm.yml`: new. It runs only on a push to `claude/eager-brown-s2u6qh` that changes `ops/vm/request`, or by `workflow_dispatch`.
- `STATUS.md`: the "Last rewritten" line, the TASK-035 line under Next (now TASK-040), the open-branches line, and the "Hosting ADR" owner item (resolved by ADR-0015, replaced by the VM's owner steps).
- `docs/CODEMAP.md`: ADR-0015, TASK-040, the workflow, and `ops/vm/` moved from Planned to current.

## Verified

A rehearsal on this session's machine: Ubuntu 24.04.4, x86_64, 4 CPUs, 15 GB. The VM is arm64, so the architecture differs; everything else is the same OS and packages. The machine already had a stopped, unused PostgreSQL 16 cluster on port 5432. After the first run failed (below), cluster 17/main, which that run had created on port 5433, was dropped by hand, and the 16 cluster was moved to port 5434.

| Command | Result |
|---|---|
| `shellcheck ops/vm/*.sh` (0.9.0) | exit 0, no findings |
| `actionlint .github/workflows/register-vm.yml` (1.7.7) | exit 0 |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `bash ops/vm/provision.sh < password-file`, first run | failed at step 4: the 16 cluster held 5432, so `pg_createcluster` chose 5433 for 17/main and the readiness check on 5432 failed. Fixed: the cluster is created with `--port=5432`, and the script stops if another cluster owns that port or if 17/main sits on another port. It does not repair a 17/main already created on the wrong port; only this first run could have made one. |
| second run | failed at the last line, rc 127: no `ss` on this machine. Fixed: `iproute2` is installed in step 1. |
| third run | rc 0. Installed `postgresql-17` 17.11-1.pgdg24.04+2, `postgresql-17-postgis-3` 3.6.4+dfsg-2.pgdg24.04+1, `pgbouncer` 1.26.0-1.pgdg24.04+1. Database `name_atlas` UTF8, `en_US.UTF-8`, owner `nameatlas`. Extensions postgis 3.6.4, pg_trgm 1.6, pg_prewarm 1.2. PgBouncer on 0.0.0.0:6432, PostgreSQL on 127.0.0.1:5432. |
| fourth run | rc 0 and no restart, but `userlist.txt` was rewritten: setting the password again made a new SCRAM salt. Fixed: the password is set only when it does not already log in. |
| fifth run | rc 0, "nameatlas_web's password is already set", every file under `/etc/pgbouncer` and `conf.d` byte-identical, `pg_postmaster_start_time()` unchanged, PgBouncer PID unchanged |
| a run with a new 40-character password | rc 0, "password set"; through PgBouncer the new password logs in and the old one gets `FATAL: SASL authentication failed` |
| a run with `abc` on stdin | "ERROR: the web role's password must be 24-128 letters and digits" |
| `SHOW shared_buffers`, `synchronous_commit`, `shared_preload_libraries` | `3GB`, `off` (the build setting), `pg_prewarm` |
| `psql "host=127.0.0.1 port=6432 … user=nameatlas_web sslmode=require" -c '\conninfo'` | "SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384 …)" |
| the same, `SELECT current_user, current_setting('default_transaction_read_only'), current_setting('statement_timeout')` | `nameatlas_web\|on\|30s` |
| the same, `CREATE TABLE public.x (i int)` | "ERROR: cannot execute CREATE TABLE in a read-only transaction" |
| the same with a wrong password | "FATAL: SASL authentication failed" |
| the same with `sslmode=disable` | "FATAL: SSL required" |
| the same as `user=postgres` | "FATAL: SASL authentication failed" |
| `pnpm install --frozen-lockfile` as `nameatlas` in `/srv/name-atlas/app` | "Done in 9.3s using pnpm v10.33.0" (pnpm through corepack, from `packageManager`). The session's proxy CA file had to be copied where `nameatlas` can read it; that is this machine's proxy, not the VM. |
| `DERIVE_LIMIT=300 DATABASE_URL='postgresql://nameatlas@/name_atlas?host=/var/run/postgresql' bash scripts/local-setup.sh` as `nameatlas` | rc 0 in 6 min 36 s. The four files downloaded and verified; migrations applied; imports: 408,182 + 420,082 national and 646,052 + 694,553 regional values; 2 + 1 mixed-script rows flagged; step 6 "finished 304 surnames in 11.0s … failed 0"; step 7 "finished 304 surnames in 7.5s … failed 0" |
| `bash ops/vm/finalize.sh` on that partial build | exit 1. ok: 598,476 surnames; 828,264 national and 1,340,605 regional values; 4 source records with the four official hashes; 0 duplicate and 0 surplus `ACTIVE` claims. FAIL: 597,868 surnames missing population, rank or rarity; 269,717 regional surnames missing their distribution. Then "the gate failed; nothing was changed", and `20-build.conf` was still in place. The first run had hit a SQL error in the claim summary (`GROUP BY 1` over an aggregate); fixed. |
| database size after the imports and 608 derived surnames | 1,480 MB |
| `pnpm --filter ./apps/web build` as `nameatlas` | exit 0 |
| `pnpm start` with `DATABASE_URL=postgresql://nameatlas_web:…@127.0.0.1:6432/name_atlas?uselibpqcompat=true&sslmode=require`, then `curl` | `/pl/nazwisko/adamczyk` 200: "22 435 osób … ADAMCZYK (mężczyźni)", "około 1 na 945", "#35 miejsce na liście nazwisk", "Zweryfikowane". `/pl/nazwisko/bąk`, `/pl/nazwisko/nowak`, `/en/surname/baran` 200 with counts. PgBouncer's log shows the app's logins with `tls=TLSv1.3/TLS_AES_256_GCM_SHA384`. |

### After an adversarial review of the change

Four reviewers (security, the real VM, the workflow, the documents) reported 15 findings; a second agent tried to refute each. 13 were confirmed and fixed, 2 were refuted (an `apt` lock race the verifier judged too unlikely to matter, and a CODEMAP wording the runbook already covers). What changed, and what was run again on the rehearsal machine (`provision.sh` runs 7 to 9):

| Change | Result |
|---|---|
| Root no longer writes inside the build user's home (a symlink there could have turned a root `chown` or write against the system): `build.sh` unpacks, cleans and marks as `nameatlas`; the finalized marker and the dump moved to the root-owned `/var/lib/name-atlas`; the workflow stages scripts in the SSH user's `~/name-atlas-ops`, not `/tmp` | `shellcheck` clean; `actionlint` clean. `build.sh` and `finalize.sh` were not run (see below). |
| The build unit is enabled, starts only while `/srv/name-atlas/.register-built` is absent, and writes it after `local-setup.sh` succeeds; `finalize.sh` requires it; `status.sh` prints `built: yes/no` | not run: needs systemd |
| PgBouncer: `client_login_timeout = 10`, `max_packet_size = 16777216`, `max_client_conn = 1000`, a systemd drop-in (`Restart=always`, `LimitNOFILE=8192`), and an iptables limit of 200 connections per address | the ini values are in `/etc/pgbouncer/pgbouncer.ini`, and PgBouncer serves the app's login after the change. The drop-in and the iptables rule were not run: no systemd, no REJECT rule on this machine. |
| Unattended upgrades also from the PostgreSQL repository (`/etc/apt/apt.conf.d/51name-atlas-pgdg`) | the file is written; no upgrade ran |
| apt: `DPkg::Lock::Timeout=600`, `--force-confold`, ten retries of `apt-get update` and the PGDG script, `cloud-init status --wait` | with the apt lists lock and dpkg frontend lock held for 45 s by another process, run 9 printed "retry 1/10" and "retry 2/10" and finished rc 0 |
| PostgreSQL start waits up to 10 minutes for crash recovery | after `kill -9` of the postmaster, run 9 came back "accepting connections" and PgBouncer answered `count(*) FROM surnames` with 598476. Run 7, before this change, had failed at step 4 with `pg_ctl: server did not start in time` while the server was still replaying WAL. |
| Second full run after the changes (run 8) | rc 0, "password is already set", every file under `/etc/pgbouncer` and `conf.d` and the apt snippet byte-identical, no PostgreSQL restart |
| The workflow's first-contact `ssh-keyscan` failure now prints the reason and a TCP test | `actionlint` clean; not run |
| ADR-0015: the description of production's seven-surname slice (other surnames are "not found", not "not prepared") and Render's free tier (1 GB, expiring) corrected; README: keep the password, the marker, the upgrades; STATUS's "Last rewritten" no longer carries the previous entry | reviewed against production: `curl https://name-atlas-two.vercel.app/pl/nazwisko/adamczyk` returns 200 with "Nie znaleziono takiego nazwiska" |

### On the VM (workflow `Register VM`, runs 36658375900, 36659258532, 36660157009, 36660342514 and 36660458190)

| Step | Result |
|---|---|
| attempt 1, `check` | failed at "Refuse without the VM's secrets": `VM_HOST` was not set; `VM_SSH_KEY` was |
| attempt 2, `check` (after the owner added `VM_HOST`) | success in 11 s. First contact: `ssh-keyscan` returned an ed25519 host key, trusted on first use and pinned in `ops/vm/ssh_host_ed25519_key.pub`. SSH as `ubuntu` with the owner's key worked, and `~/name-atlas-ops` was created. |
| what `check` printed | Ubuntu 24.04.5 LTS, kernel 6.17.0-1020-oracle, aarch64; **1 CPU; 5,903 MB memory**; no swap; root `/dev/sda1` 145 GB with 142 GB free; `en_US.utf8` present. `iptables -L INPUT`: rules 1–4 accept (established, ICMP, all, TCP 22 NEW) and rule 5 is `REJECT … icmp-host-prohibited`, as ADR-0015 assumed. |
| finding | the shape is 1 OCPU / 6 GB. `provision.sh` now refuses under 2 CPUs or 10,000 MB (its settings and the build's duration assume 2 OCPUs and 12 GB). The owner resizes the instance in the console (Edit shape), and `check` runs again. |
| `provision.sh` after the guard, on the rehearsal machine (4 CPUs, 15 GB) | rc 0, "password is already set" |
| run 36659258532, `check`, after the owner edited the shape | success in 8 s, and "Set up SSH with the VM's pinned host key" passed with `StrictHostKeyChecking yes`, so the pinned key matches after the restart. It printed **5 CPUs and 50,082 MB**: the owner typed more than the allowance (2 OCPUs and 12 GB is free; the console offers up to 41 and 277). The guard now refuses any size but 2 CPUs and 10,000 to 13,000 MB. The owner is asked to set 2 and 12. Rehearsal machine (4 CPUs) now fails that guard too, which is why the guard was checked only against the numbers, below. |
| the guard's condition, on numbers only: (1, 5903), (5, 50082), (2, 5903), (2, 11900), (2, 30000) | refuse, refuse, refuse, ok, refuse |

| run 36659258532, `check` | 5 CPUs, 50,082 MB (the owner had typed more than the allowance) |
| run 36660157009, `check`, after the owner corrected it | **2 CPUs, 11,927 MB**, the pinned host key accepted, same INPUT chain |
| run 36660342514, `provision` | stopped at the workflow's own password check, before the VM: `VM_DB_WEB_PASSWORD` was set but had 9 characters (rule: 24 to 128 letters and digits) |
| run 36660458190 attempt 2, `provision` (secret replaced) | the step succeeded in 51 s. Installed on aarch64: `postgresql-17` 17.11-1.pgdg24.04+2, `postgresql-17-postgis-3` 3.6.4+dfsg-2.pgdg24.04+1, `pgbouncer` 1.26.0-1.pgdg24.04+1. Cluster 17/main UTF8, `en_US.UTF-8`; database `name_atlas` owned by `nameatlas`; extensions postgis 3.6.4, pg_trgm 1.6, pg_prewarm 1.2; `nameatlas_web`'s password set. INPUT chain after it: 5 `REJECT … tcp dpt:6432 … #conn src/32 > 200 reject-with tcp-reset`, 6 `ACCEPT … state NEW tcp dpt:6432`, 7 `REJECT … icmp-host-prohibited`. `postgresql@17-main` and `pgbouncer` active; listening on 127.0.0.1:5432 and 0.0.0.0:6432; Node v22.22.2. |
| same run, the step "Connect as the web app does" | **failed**: `psql: error: connection to server … port 6432 failed: timeout expired`. The host firewall accepts 6432, so the block is upstream: Oracle's security list has no ingress rule for TCP 6432 (the owner's TASK-040 §3 item 3). The workflow now probes the port first and says so. |
| run 36660859923, `build` | **failed in 8 s** at build.sh step 1: `find: Failed to restore initial working directory: /home/ubuntu: Permission denied`. `sudo` leaves the working directory in the SSH user's home, which `nameatlas` cannot read, and `find` run as `nameatlas` exits 1 there. Reproduced on the rehearsal machine (`cd` into a root-owned 750 directory, then `runuser -u nameatlas -- find …`: rc 1; after `cd /`: rc 0). Fixed: all four scripts start with `cd /`, and `build.sh` requires an absolute archive path. |
| build.sh steps 1 and 2 on the rehearsal machine, run as root from that unreadable directory with the archive there (a copy of the script without the systemd steps) | rc 0: the tree unpacked into `/srv/name-atlas/app` with `data/` and `node_modules/` kept, `pnpm install --frozen-lockfile` "Done in 5.3s using pnpm v10.33.0", and the archive was removed |
| run 36661246048, `build` (after the fix) | success in 37 s. Unpacked; `pnpm install --frozen-lockfile` on aarch64 "Done in 8.9s using pnpm v10.33.0"; the unit `name-atlas-register-build` was `ActiveState=active SubState=running`, MainPID 7799, after its 20 s wait (about 02:45 UTC). Its journal: `[setup] DATABASE_URL=postgresql://nameatlas@/name_atlas?host=/var/run/postgresql` (no password), then step 1/7 downloaded and verified all four PESEL files (size and SHA-256) from api.dane.gov.pl. |
| the owner's first 6432 rule | added under Egress Rules instead of Ingress Rules (the owner's screenshots: Ingress held TCP 22 and two ICMP rules; Egress held all protocols and TCP 6432). The `status` run 36661905905 at 02:53 UTC still timed out on `nc -z -w 10 <host> 6432`, and the workflow's new error said so. |
| run 36662326820, `status`, after the owner added the rule under Ingress | success, including the last step. `Connection to *** 6432 port [tcp/*] succeeded!`; `psql` as `nameatlas_web` from the GitHub runner: `SSL connection (protocol: TLSv1.3, cipher: TLS_AES_256_GCM_SHA384, compression: off)`; `nameatlas_web\|on\|30s\|PostgreSQL 17.11 (Ubuntu 17.11-1.pgdg24.04+2) on aarch64-unknown-linux-gnu`; `surnames 598476` through PgBouncer; `a write as the web role is refused: ERROR:  cannot execute CREATE TABLE in a read-only transaction`. Same run, the `status` step at 02:59 UTC (build 14 minutes in): `built: no`; PostgreSQL and PgBouncer active; 32 min uptime, load average 7.25; 11,927 MB memory with 3,240 used, 4,095 MB swap with 0 used; 15 GB used of 145 GB disk; active claims `CURRENT_RANK` 36,729 and `CURRENT_DISTRIBUTION` 34,718; 8 connections from `nameatlas`. |
| `status` runs 36662548618, 36663699556, 36666333133 and 36671020045, the build's steps 6 and 7 | step 6 (`derive-batch --rank`, 270,021 surnames) ran with **0 failures** from about 02:51 UTC. Its cumulative rate was 30.2/s after 2,000 surnames, 39.3/s after 26,000, 40.9/s after 64,000 and 42.0/s after 154,000. At 04:55 UTC the `[derive]` lines came from a new process (PID 10940, before 8323) and read `118000 done \| 67.4/s \| 0 failed`: step 7 (`derive-batch --all --rank`, 328,455 surnames) had started, at about 04:26 UTC by that count. Step 6 therefore took about 95 minutes, 47 surnames a second on average. |
| the same run, 04:55 UTC | `built: no`. Database 12 GB. Active claims `CURRENT_POPULATION` 598,381, `CURRENT_RANK` 598,381, `RARITY_CONTEXT` 598,379, `CURRENT_DISTRIBUTION` 395,216; 8 connections from `nameatlas`. Memory 11,927 MB with 4,067 used, swap 796 KB used, disk 24 GB used of 145 GB, load average 6.05. The connection step (`nameatlas_web`, TLS 1.3, read-only, write refused, 598,476 surnames) passed again. |

## Not verified

- The build's completion on the VM: it started at about 02:45 UTC and was in step 6 of 7 at 02:59 UTC. Its total duration on 2 A1 cores and its final size are not known (the 5 to 7 hours and 16 GB are projections).
- `finalize.sh`'s passing path (the gate, durability back on, grants, `VACUUM ANALYZE`, prewarm, the dump) and the workflow's `finalize` step: neither has run.
- That the build unit resumes after a reboot or a failed step, and that the completion marker stops it starting again: the unit has run once, unbroken.
- That the nightly unattended upgrades from the PostgreSQL repository apply, and that PgBouncer restarts itself after a crash: both are configured (the apt snippet, the systemd drop-in) and not exercised.
- A restore of the dump. There is no copy of it off the VM.
- Whether a filled `shared_buffers` keeps Oracle's memory metric above its 20% idle line.
- The cutover and production (AC-7): Vercel's `DATABASE_URL` is unchanged, and production still reads Supabase.
