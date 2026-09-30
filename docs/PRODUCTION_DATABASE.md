# Production database — Oracle Cloud runbook

How production's database is set up, built, switched to, checked, renewed, rolled back and rebuilt. The decision is ADR-0016. The task is TASK-041, whose §13 holds the owner's choices this runbook follows.

**Never paste `/root/name-atlas-credentials`, a connection string or a token into a chat, an issue or a commit.** Everything below that you paste back — script output, `journalctl` lines — contains no secret.

## What goes to the server, and what does not

### Stored on the server

1. **The four official PESEL files.**
   - They are published by Ministerstwo Cyfryzacji on dane.gov.pl under CC0.
   - The build downloads them and refuses any whose size or SHA-256 differs from `packages/sources/src/registry.ts`.
   - They are about 45 MB together, kept in the clone's `data/` folder.
   - They contain exactly these columns and nothing else:

     | Files | Columns |
     |---|---|
     | National, men and women | `Nazwisko aktualne, Liczba`: a surname and how many people in the PESEL register carry it |
     | Regional, men and women | `Województwo zameldowania na pobyt stały, Nazwisko aktualne, Liczba`: a voivodeship, a surname and a count |

   - The Ministry does not publish a surname carried by only one person.
2. **What the build derives from those files.** This is the database, about 16 GB projected:
   - each surname and its written forms, and its page address;
   - the 16 voivodeships;
   - a record of the source, its licence, and the publisher's own description of each file;
   - each surname's counts;
   - the published figures: count, rank, 1-in-X and regional distribution, each with its evidence, confidence and citation.
3. **Software:**
   - the repository's code, cloned with a read-only token;
   - Node, from nodejs.org, checked against its published SHA-256;
   - the npm packages the lockfile pins;
   - Ubuntu's packages.
4. **Secrets made on the server:**
   - the database passwords, in `/root/name-atlas-credentials`, readable by root only;
   - the Let's Encrypt certificate;
   - the DuckDNS token you provide, in `/etc/name-atlas/duckdns.env`, root only.

### Sent to the server while the site runs

For each page or lookup, the Vercel app sends one query over TLS, carrying the surname being looked up. It is not stored:
- the web role can only read;
- PostgreSQL logs no statements (`log_statement = none`);
- PgBouncer logs no connections.

### Never on the server

- **No data about any person.** The PESEL files hold no first names, no PESEL numbers, no dates of birth and no addresses: only how many people carry a surname.
- **No data about visitors.**
  - There are no accounts, no cookies, no analytics and no search history.
  - The database sees connections from Vercel, never a visitor's address.
  - The family surnames page (TASK-040) sends each surname as an ordinary lookup. Its labels never leave the browser.
- **Nothing copied from Supabase.** The server builds everything fresh from the official files.

### Who else sees something

| Party | What it sees |
|---|---|
| Oracle | Hosts the VM, and can see its resource use. |
| DuckDNS | The VM's public IP address, and the certificate challenge. |
| Let's Encrypt | The DuckDNS name. Every certificate is listed in public Certificate Transparency logs, so the name is public. That is why the protection is TLS, a password and a read-only role, not a secret address. |
| dane.gov.pl, nodejs.org, the npm registry, Ubuntu's mirrors, GitHub | The VM's IP address, when it downloads from them. |

The only data that leaves the server is query results, which are the public figures the site shows, sent to Vercel.

## 1. Oracle console, once

1. **Billing.** Upgrade the account to Pay As You Go, and create a budget with an alert at the smallest amount (U-2). Always Free resources stay free.
2. **Compute → Instances → Create instance,** in `eu-frankfurt-1`:
   - image: Canonical Ubuntu 24.04, the aarch64 build;
   - shape: `VM.Standard.A1.Flex`, 2 OCPUs and 12 GB of memory;
   - boot volume: 50 GB;
   - a public IPv4 address, and your SSH public key.
3. **Block Storage → Block volumes → Create:** 150 GB, in the instance's availability domain.
   - Attach it to the instance as **paravirtualized**, with the device path `/dev/oracleoci/oraclevdb`.
   - Assign a backup policy with one weekly backup, keeping at most 4. The free tier includes 5 volume backups (U-4).
4. **Networking → the instance's subnet → security list → Add ingress rule:** TCP, destination port **6432**, source `0.0.0.0/0`. Do not open 5432 or 80.

## 2. DuckDNS, once

Sign in at duckdns.org and add a subdomain, for example `nameatlas-db`. The full name is `nameatlas-db.duckdns.org`. Keep the account token for the next step.

## 3. Provision the server

Over SSH as `ubuntu`:

```bash
sudo apt-get update && sudo apt-get install -y git
# Git asks for a username and a password: give a fine-grained GitHub token with
# read-only "Contents" on Bienos/NAME-ATLAS as the password.
sudo git clone https://github.com/Bienos/NAME-ATLAS /opt/name-atlas
cd /opt/name-atlas

read -rsp 'DuckDNS token: ' DUCKDNS_TOKEN; echo   # typed, so it stays out of the shell history
sudo DB_HOST=nameatlas-db.duckdns.org DUCKDNS_TOKEN="$DUCKDNS_TOKEN" LE_EMAIL=you@example.com \
     DATA_DEVICE=/dev/oracleoci/oraclevdb bash scripts/production/provision-db.sh
```

- Run the same command a second time. It must end with `done: 0 change(s).` (AC-01).
- Then `sudo reboot`, reconnect, and run `sudo bash scripts/production/check-db.sh local` (AC-02, AC-04, AC-08).
- Paste both outputs back.

## 4. Build the register

```bash
cd /opt/name-atlas
sudo bash scripts/production/build-register.sh
journalctl -u name-atlas-build -f        # Ctrl-C stops following, not the build
```

- It runs as the systemd unit `name-atlas-build`, so closing SSH does not stop it.
- It takes hours. Its time on this VM has never been measured, and this run is the first measurement (AC-06).
- If it stops, run the script again; `local:setup` resumes.
- When the unit has finished, run `sudo bash scripts/production/check-db.sh stats` and `sudo bash scripts/production/check-db.sh local`, and paste both outputs back.
- To time each step: `journalctl -u name-atlas-build -o short-iso | grep '\[setup\] ==='`.

## 5. Check from outside

From any machine with `psql` and `openssl`:

```bash
bash scripts/production/check-db.sh remote nameatlas-db.duckdns.org
```

It needs no password (AC-03). A session can run it for you.

## 6. Cutover

1. **Keep Supabase's value for rollback.** In Vercel, project `name-atlas` → Settings → Environment Variables → `DATABASE_URL` (Production): copy the current value into your password manager.
2. **Read the new value on the server,** and paste it **only into Vercel**:

   ```bash
   sudo grep '^WEB_DATABASE_URL=' /root/name-atlas-credentials | cut -d= -f2-
   ```

3. **Save it as `DATABASE_URL`** for Production.
4. **Make a production deployment of `main`.** A merge does not deploy (`STATUS.md`).
5. **Check a page for a surname outside the old seven-surname slice.** Its count, rank and rarity must show (AC-09).

## 7. Rollback

Set `DATABASE_URL` back to the Supabase value from your password manager, and redeploy. Rehearse this on a preview deployment before the cutover (AC-10).

Supabase stays untouched for 14 days after a successful cutover. Then delete the project and its GitHub integration (U-6).

## 8. Certificate renewal

It is automatic: Ubuntu's `certbot.timer` renews the certificate, and the deploy hook hands it to PgBouncer. To test it: `sudo certbot renew --dry-run` (AC-07).

## 9. If the server is lost

There is nothing to restore; everything is rebuilt from public files (U-4).

1. Create a new instance and volume (§1), keeping the same DuckDNS name.
2. Repeat §3 and §4.
3. Point Vercel at the new `WEB_DATABASE_URL`.

The weekly volume backups shorten this if one is recent.
