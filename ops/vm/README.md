# The production database VM

ADR-0017 decides it; TASK-042 builds it. One Oracle Cloud Always Free VM (Ampere A1, 2 OCPUs, 12 GB, Ubuntu 24.04 arm64, Frankfurt) runs PostgreSQL 17 with the complete PESEL register, and PgBouncer in front of it for the web app on Vercel.

```
Vercel fra1 ──TLS──▶ :6432 PgBouncer ──▶ 127.0.0.1:5432 PostgreSQL 17   (nameatlas_web, read-only)
GitHub runner ──SSH──▶ :22  ──▶ sudo ops/vm/*.sh ──socket, peer──▶ PostgreSQL (nameatlas, owner)
```

## Files

| File | What it does |
|---|---|
| `provision.sh` | Installs and configures everything. Idempotent. Reads the web role's password on stdin. |
| `build.sh` | Unpacks the pushed commit, runs `pnpm install` on the VM, starts the `name-atlas-register-build` unit (`scripts/local-setup.sh`) and returns. |
| `status.sh` | The build's state and log (`built: yes` only once it completed), the database's counts, the services, waiting security upgrades, memory and disk. Read-only. |
| `finalize.sh` | The gate (it names the surnames the import flagged as mixed-script, which get no figures by design, and checks every other one), durability back on, grants, `VACUUM ANALYZE`, `pg_prewarm`, and a `pg_dump` to `/var/lib/name-atlas/backup/`. |
| `extras.sh` | TASK-041, after `finalize`: downloads TERC and SIMC from GUS and checks them against `fixtures/teryt/source-manifest.json`, runs `seed:sources`, `import:teryt` and `import-onomastics` (Buryan 1933), derives each Buryan surname's meaning, runs its own gate, grants, `VACUUM ANALYZE`, and a second `pg_dump` beside `finalize`'s. Idempotent. |
| `editions.sh` | Every earlier PESEL edition (2019, 2020–2025, the 2025 regional pair) as dated snapshots, through `scripts/import-editions.sh`, with a gate that proves the surnames and every claim count unchanged, then grants, `VACUUM ANALYZE` and a third dump (TASK-045). Takes the pushed commit's archive, like `build.sh`, and leaves the register build alone. |
| `shift.sh` | TASK-051, after `finalize` and `editions`: `start` unpacks the pushed commit, records the surnames and claim counts the gate must find unchanged, runs the migration that adds `SURNAME_DISTRIBUTION_SHIFT`, and starts the batch (`pnpm truth:derive-shift`, one claim per surname and list) in the unit `name-atlas-shift-batch`, which survives the SSH session and resumes after a failure or a reboot; `finish` refuses until the batch has completed, runs the gate (one active claim per surname and list, none with fewer than two known points, every claim with its citation, confidence and evidence, nothing else changed, a second batch run finding nothing to do), grants, `VACUUM ANALYZE` and a fourth dump. |
| `archive.sh` | TASK-054, after `finalize`: unpacks the pushed commit, runs `pnpm install` and `pnpm db:migrate` (migration 0025, the `ARCHIVE_AVAILABILITY` claim type), checks the web role can read every table, starts the `name-atlas-archive-load` unit (`pnpm truth:archive-load --top-rank 2000`) and returns. The load asks Polona eight paced questions per surname, about 7 s each, so it takes hours; it resumes after a restart and writes `/var/lib/name-atlas/archive/loaded` only when a pass completes. |
| `bearers.sh` | TASK-077, after `finalize`, on `archive.sh`'s pattern: unpacks the pushed commit, runs `pnpm install` and `pnpm db:migrate` (migration 0029, the `NOTABLE_BEARERS` claim type, and 0028's empty `family` schema while it is pending; `accounts` grants that schema to `nameatlas_app`), checks the web role can read every table, starts the `name-atlas-bearers-load` unit (`pnpm truth:bearers-load --top-rank 2000`, TASK-073) and returns. The load asks the Wikidata Query Service one or two questions per surname, at least a second apart; it resumes after a restart and writes `/var/lib/name-atlas/bearers/loaded` only when a pass completes. It refuses while the archive load or the change-over-time batch runs, and `archive.sh` refuses while it runs. |
| `meanings.sh` | TASK-081, after `finalize` and `extras`: unpacks the pushed commit, runs `pnpm install` and `pnpm db:migrate`, imports the current `sources/onomastics/buryan-1933.json` (a new version replaces the one `extras` imported, which becomes `UPDATED`), derives every surname of the file in one process, and gates: every listed surname the register holds has a meaning, one `ACTIVE` claim per claim key, one `ACTIVE` version of the work. Repeatable. It refuses while the register build, the archive load, the bearers load or the change-over-time batch runs. |
| `accounts.sh` | TASK-063, after `provision` and `build`: unpacks the pushed commit, runs `pnpm install` and `pnpm db:migrate` (migration `0027` makes schema `accounts`; any earlier one still pending, `0026`'s index at the time of writing, comes with it), runs `accounts-roles.sql`, sets the role `nameatlas_app`'s password (from stdin, only if it does not already work), writes PgBouncer's user list for the web role and that role and reloads it only if the file changed, then checks, by the catalog and by connecting as the role through the pooler, that it writes `accounts` and nothing else. Repeatable: a second run changes nothing. |
| `accounts-roles.sql` | The role `nameatlas_app` and its grants on schema `accounts`, idempotent; `accounts.sh` runs it from the copy the workflow stages. |
| `request` | The step the workflow runs when a push changes this file. |
| `ssh_host_ed25519_key.pub` | The VM's SSH host key, pinned after the first `check`. |

`.github/workflows/register-vm.yml` runs one step over SSH. It starts by `workflow_dispatch` (the workflow is on the default branch, `main`), or on a push that changes `request` to a branch named in its `on.push` trigger: `claude/eager-brown-s2u6qh` and `claude/awesome-darwin-af7l50`.

## Setting it up: the project owner's part

Nobody pastes a secret into a chat. Secrets go into GitHub and Vercel only, and into a password manager for the one that Vercel needs later.

1. **Account.** Sign up at <https://www.oracle.com/cloud/free/>. Choose **Germany Central (Frankfurt)** as the home region: Always Free resources exist only there, and it cannot be changed later.
2. **VM.** In the console: Compute → Instances → Create instance.
   - Name: `name-atlas-db`.
   - Image: **Canonical Ubuntu 24.04** (not Minimal).
   - Shape: Ampere → **VM.Standard.A1.Flex**, **2 OCPUs**, **12 GB** memory.
   - Networking: create a new virtual cloud network with a public subnet, and **assign a public IPv4 address**.
   - SSH keys: **Generate a key pair for me**, then **Save private key**.
   - Boot volume: **Specify a custom boot volume size**, **150 GB**.
   - "Out of capacity" means Oracle has no free A1 in that availability domain right now. Try another one, or try again later.
   - The `check` step prints the machine's CPUs and memory. It must show **2** and about **11.7 GB** (`free -m`: about 11,900). Any other size is wrong, and `provision` refuses to run: smaller is too slow for the build, and larger is not free (2 OCPUs and 12 GB is Oracle's whole Always Free allowance; the console lets you type more). Fix it in the console: the instance's page → **More actions** → **Edit shape** → 2 OCPUs and 12 GB → **Save**. The VM restarts; its disk, address and SSH key stay.
3. **Port 6432.** On the instance page, open the subnet, then its Default Security List → Add Ingress Rules: source CIDR `0.0.0.0/0`, IP protocol TCP, destination port range `6432`, "Stateless" not ticked. Port 22 is open by default.
4. **GitHub secrets.** In the repository: Settings → Secrets and variables → Actions → New repository secret.
   - `VM_HOST`: the instance's public IP address.
   - `VM_SSH_KEY`: the whole text of the private key file saved in step 2, including the `BEGIN` and `END` lines.
   - `VM_DB_APP_PASSWORD` (TASK-063, only when accounts are to go live): the accounts role's password, again 40 random letters and digits, and **a different one** from the web role's. Keep a copy in a password manager: the Vercel variable below needs it.
   - `VM_DB_WEB_PASSWORD`: 40 random characters, letters and digits only (the password goes into a URL). **Keep a copy in a password manager**: step 5 needs it again, and GitHub never shows a saved secret. If it is lost, save a new `VM_DB_WEB_PASSWORD` and run `provision` again before step 5; that is safe at any time and changes the database role's password.
5. **Vercel**, only when the build is finalized: in the `name-atlas` project, Settings → Environment Variables, edit `DATABASE_URL` for Production to

   ```
   postgresql://nameatlas_web:<VM_DB_WEB_PASSWORD>@<VM_HOST>:6432/name_atlas?uselibpqcompat=true&sslmode=require
   ```

   `uselibpqcompat=true` is required. Without it, `pg` verifies the self-signed certificate and every page fails.

## Running it

Each step is one push that changes `request`, or one `workflow_dispatch`:

1. `check`: first contact. Prints the machine and the SSH host key. Commit the key, as printed, to `ssh_host_ed25519_key.pub`; no other step runs without it.
2. `provision`: about 5 minutes.
3. `build`: starts the build and returns in minutes. The build takes hours on the VM (projected 5–7).
4. `status`: repeat until it prints `built: yes`. The unit is enabled, so a reboot resumes it, and a failed step restarts after two minutes and resumes. Eight failures in 12 hours stop it; the log says why. `ActiveState=inactive` alone does not mean the build finished: if it prints `built: no` with the unit inactive, push `build` again.
5. `finalize`: refuses unless the build succeeded and the gate passes.
6. `extras` (TASK-041): refuses unless `finalize` has run. It adds 106,227 TERYT source records, so a later `finalize` fails its "source records = 4" check; that is expected, and the rest of its gate still applies.
7. `editions`, any time after `finalize` (and after `extras`, if it ran): the fifteen earlier editions. Its output ends with "done: every edition is loaded; the pages read the current resources only". About 15 downloads and imports; expect it to take a while.
8. `shift` then `shift-finish` (TASK-051), after `editions`: the change-over-time claims. `shift` returns in minutes; the batch runs for hours (about 830,000 claims; `status` reports the unit and its marker). `shift-finish` refuses until `shift batch complete: yes`, and ends with "done: every surname's change over time is derived". Run the web deploy only after it: the order is migration, batch, deploy (ADR-0020 §2.10).
9. `archive` (TASK-054), any time after `finalize`: migrates, then starts Polona's archive load and returns. `status` shows its progress under "archive load", one log line per surname, and `loaded:` once a pass completes. Ten Polona failures in a row stop the loader; the unit restarts it after ten minutes, at most six times in 12 hours. Running `archive` again later starts a new pass that searches only the surnames last searched more than 90 days earlier. `bearers` (TASK-077) works the same way for Wikidata's well-known bearers: `status` shows it under "bearers load", the web-role connection at the end prints the `NOTABLE_BEARERS` count, and a later run queries only the surnames last queried more than 30 days earlier. The pages read the claims as they are written; no redeploy is needed.
   `meanings` (TASK-081), any time after `extras`: loads the current Buryan 1933 file and derives its meanings in one run, then gates. A run with nothing new imports and derives nothing. The pages read the claims as they are written.
10. `accounts` (TASK-063), any time after `build`, and only when the owner has set the secret `VM_DB_APP_PASSWORD`: makes the production database ready for accounts and ends by connecting over the public port as `nameatlas_app`, the way Vercel will. It refuses while the register build, the archive load, the bearers load or the change-over-time batch is running. It is safe to run again, for example after `provision`, which keeps the role in PgBouncer's user list. Nothing in the web app uses the role until the owner sets the five Vercel variables (`ACCOUNTS_DATABASE_URL` is below).
11. The owner's step 5 above, then a production redeploy of the current production deployment (Vercel → Deployments, the one marked Current), so the app itself does not change. On 2026-09-30 that was `dpl_HbrhnkXxmSzU7PRjzr6hZA1KLyvu` (`main` @ `03d1efb`). Do not redeploy an older one: `0eb4814`, named here when this was first written, predates the landing atlas.

## Turning accounts on: the owner's part (ADR-0027, TASK-062, TASK-063)

Accounts are off until all of this is done, and nothing on the site changes before then.

1. A Resend account, an API key, and a sending domain verified in Resend (SPF and DKIM records on the domain's DNS). Without a verified domain Resend delivers only to the account's own address.
2. The GitHub secret `VM_DB_APP_PASSWORD` (above), then the `accounts` step of the `Register VM` workflow. Its output ends with the lines "ok through PgBouncer: ..." and then "done"; its last job step connects as `nameatlas_app` over the public port.
3. In Vercel (Production), Settings → Environment Variables, five variables, then a redeploy of the current production deployment, because the header link and the legal text are read at build:

   ```
   ACCOUNTS_DATABASE_URL=postgresql://nameatlas_app:<VM_DB_APP_PASSWORD>@<VM_HOST>:6432/name_atlas?uselibpqcompat=true&sslmode=require
   RESEND_API_KEY=<the API key>
   ACCOUNTS_MAIL_FROM=Name Atlas <konto@your-verified-domain>
   SITE_ORIGIN=https://<the site's address, no trailing slash>
   CRON_SECRET=<any long random string>
   ```

   `ACCOUNTS_DATABASE_URL` is the one that names the accounts role: never put these credentials in `DATABASE_URL`, whose read-only role has no grant on schema `accounts`.
4. Under Settings → Cron Jobs, `/api/cron/accounts-purge` is listed (it deletes sign-ups that were never confirmed after 7 days, which the privacy notice promises). It is read from `apps/web/vercel.json` only if `apps/web` is the project's root directory.

## Going back

Vercel keeps the previous production deployment with the old `DATABASE_URL` in it. An Instant Rollback to it returns production to Supabase at once, as long as no other production deployment has been made since, and as long as the Supabase project has not been paused for inactivity (free projects pause after a week).

## Keeping it

- **Idle reclamation.** Oracle may reclaim an Always Free instance whose CPU (95th percentile), network and memory all stay under 20% for 7 days. `shared_buffers` (3 GB) is filled by `pg_prewarm` and refilled after a restart, which keeps memory in use. Check the instance's Memory Utilization metric in the console during the first week; how Oracle counts memory is not documented.
- **The account.** Oracle may suspend an account left idle for 30 days. Sign in to the console now and then.
- **Firewall.** Never enable UFW on this image. Oracle's known issue: it can remove the rules the instance needs to reach its boot volume. `provision.sh` inserts its rule into iptables, limits one address to 200 connections, and saves both with `netfilter-persistent`.
- **Updates.** Security updates for the OS, PostgreSQL and PgBouncer install themselves nightly (`unattended-upgrades`, including the PostgreSQL repository). PgBouncer restarts itself after a crash. `status` lists any upgrade still waiting.
- **Backups.** None of the four dumps below contains a row of schema `accounts` (`--exclude-table-data='accounts.*'`, held by `pnpm check:vm`): they keep its definition, so a restore leaves accounts empty and consistent with the migrations table. Accounts exist only in the database until TASK-049's off-host, encrypted backup, which has to include them. `finalize.sh` leaves one `pg_dump` on the VM, `extras.sh` a second one with TERYT and Buryan in it, `editions.sh` a third, with the editions, and `shift.sh finish` a fourth, with the change claims. Restoring any of them has not been tested, and there is no copy off the VM.
