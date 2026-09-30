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
| `finalize.sh` | The gate, durability back on, grants, `VACUUM ANALYZE`, `pg_prewarm`, and a `pg_dump` to `/var/lib/name-atlas/backup/`. |
| `request` | The step the workflow runs when a push changes this file. |
| `ssh_host_ed25519_key.pub` | The VM's SSH host key, pinned after the first `check`. |

`.github/workflows/register-vm.yml` runs one step over SSH. It starts on a push to `claude/eager-brown-s2u6qh` that changes `request`, or, once the workflow is on the default branch (`main`), by `workflow_dispatch`.

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
6. The owner's step 5 above, then a production redeploy of the current production deployment (Vercel → Deployments, the one marked Current), so the app itself does not change. On 2026-09-30 that was `dpl_HbrhnkXxmSzU7PRjzr6hZA1KLyvu` (`main` @ `03d1efb`). Do not redeploy an older one: `0eb4814`, named here when this was first written, predates the landing atlas.

## Going back

Vercel keeps the previous production deployment with the old `DATABASE_URL` in it. An Instant Rollback to it returns production to Supabase at once, as long as no other production deployment has been made since, and as long as the Supabase project has not been paused for inactivity (free projects pause after a week).

## Keeping it

- **Idle reclamation.** Oracle may reclaim an Always Free instance whose CPU (95th percentile), network and memory all stay under 20% for 7 days. `shared_buffers` (3 GB) is filled by `pg_prewarm` and refilled after a restart, which keeps memory in use. Check the instance's Memory Utilization metric in the console during the first week; how Oracle counts memory is not documented.
- **The account.** Oracle may suspend an account left idle for 30 days. Sign in to the console now and then.
- **Firewall.** Never enable UFW on this image. Oracle's known issue: it can remove the rules the instance needs to reach its boot volume. `provision.sh` inserts its rule into iptables, limits one address to 200 connections, and saves both with `netfilter-persistent`.
- **Updates.** Security updates for the OS, PostgreSQL and PgBouncer install themselves nightly (`unattended-upgrades`, including the PostgreSQL repository). PgBouncer restarts itself after a crash. `status` lists any upgrade still waiting.
- **Backups.** `finalize.sh` leaves one `pg_dump` on the VM. Restoring it has not been tested, and there is no copy off the VM.
