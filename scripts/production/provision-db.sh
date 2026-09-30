#!/usr/bin/env bash
# Provisions production's database server (TASK-041, ADR-0016) on an Oracle
# Cloud Always Free Ampere A1 VM running Ubuntu 24.04. Run as root on the VM:
#
#   sudo DB_HOST=<name>.duckdns.org DUCKDNS_TOKEN=<token> LE_EMAIL=<email> \
#        DATA_DEVICE=/dev/sdb bash scripts/production/provision-db.sh
#
# It is idempotent: a second run changes nothing and fails on nothing.
#
# What it sets up:
#   - PostgreSQL 16 + PostGIS 3.4 from Ubuntu's archive, listening on localhost
#     only, with its data directory on the attached block volume;
#   - PgBouncer on port 6432, the only database port reachable from outside,
#     TLS required, and only the read-only web role can log in through it;
#   - a Let's Encrypt certificate for DB_HOST, obtained and renewed through a
#     DuckDNS TXT record, so the VM needs no open port 80;
#   - a DuckDNS updater that keeps DB_HOST pointing at this VM;
#   - the VM's own firewall rule for 6432, persisted;
#   - unattended security upgrades.
#
# Passwords are generated on the first run into /root/name-atlas-credentials
# (mode 0600) and are never printed. Do not paste that file anywhere.
#
# --rehearsal: for a plain Ubuntu 24.04 machine. Skips the block volume,
# DuckDNS, Let's Encrypt and the firewall; PgBouncer listens on 127.0.0.1 with
# a self-signed certificate for DB_HOST (default localhost).
set -euo pipefail

REHEARSAL=0
if [[ "${1:-}" == "--rehearsal" ]]; then REHEARSAL=1; fi

PG_MAJOR=16
DB_NAME=name_atlas
OWNER_ROLE=atlas_owner
WEB_ROLE=atlas_web
DATA_MOUNT=/srv/pgdata
PGB_PORT=6432
CREDS=/root/name-atlas-credentials
TLS_DIR=/etc/pgbouncer/tls
LIB_DIR=/usr/local/lib/name-atlas
ETC_DIR=/etc/name-atlas

log() { echo "[provision] $*"; }
die() { echo "[provision] ERROR: $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "run as root"

if ((REHEARSAL)); then
  DB_HOST="${DB_HOST:-localhost}"
  log "rehearsal: no block volume, DuckDNS, Let's Encrypt or firewall"
else
  : "${DB_HOST:?set DB_HOST to the DuckDNS name, e.g. nameatlas-db.duckdns.org}"
  : "${DUCKDNS_TOKEN:?set DUCKDNS_TOKEN to the DuckDNS account token}"
  : "${LE_EMAIL:?set LE_EMAIL to an email address for certificate expiry notices}"
  : "${DATA_DEVICE:?set DATA_DEVICE to the attached block volume, e.g. /dev/sdb}"
  [[ "$DB_HOST" == *.duckdns.org ]] || die "DB_HOST must be a duckdns.org name (TASK-041 U-1)"
  # Oracle's consistent device path is a symlink; the safety checks below need the device.
  DATA_DEVICE=$(readlink -f "$DATA_DEVICE")
fi

CHANGES=0

# put PATH MODE USER:GROUP < content — writes only when the content differs.
# Returns 0 when it wrote, 1 when the file was already right.
put() {
  local path=$1 mode=$2 owner=$3 tmp
  tmp=$(mktemp)
  cat >"$tmp"
  if [[ -f "$path" ]] && cmp -s "$tmp" "$path"; then
    rm -f "$tmp"
    return 1
  fi
  install -D -m "$mode" -o "${owner%%:*}" -g "${owner##*:}" "$tmp" "$path"
  rm -f "$tmp"
  log "wrote $path"
  CHANGES=$((CHANGES + 1))
  return 0
}

have_systemd() { [[ -d /run/systemd/system ]]; }

# --- 1. packages -------------------------------------------------------------

export DEBIAN_FRONTEND=noninteractive
packages=(postgresql-"$PG_MAJOR" postgresql-"$PG_MAJOR"-postgis-3 pgbouncer unattended-upgrades openssl curl)
if ((!REHEARSAL)); then
  packages+=(certbot iptables-persistent)
  echo "iptables-persistent iptables-persistent/autosave_v4 boolean true" | debconf-set-selections
  echo "iptables-persistent iptables-persistent/autosave_v6 boolean true" | debconf-set-selections
fi
missing=()
for p in "${packages[@]}"; do
  dpkg-query -W -f='${Status}' "$p" 2>/dev/null | grep -q 'install ok installed' || missing+=("$p")
done
if ((${#missing[@]})); then
  log "installing ${missing[*]}"
  apt-get update -q
  apt-get install -y -q "${missing[@]}"
  CHANGES=$((CHANGES + 1))
fi

# --- 2. the data volume ------------------------------------------------------

if ((!REHEARSAL)); then
  if findmnt -rn "$DATA_MOUNT" >/dev/null; then
    log "data volume already mounted at $DATA_MOUNT"
  else
    [[ -b "$DATA_DEVICE" ]] || die "$DATA_DEVICE is not a block device"
    if lsblk -nro TYPE "$DATA_DEVICE" | grep -q part; then
      die "$DATA_DEVICE has partitions; refusing to touch it"
    fi
    if [[ -n "$(lsblk -nro MOUNTPOINT "$DATA_DEVICE")" ]]; then
      die "$DATA_DEVICE is mounted elsewhere; refusing to touch it"
    fi
    # blkid exits non-zero when the device carries no filesystem signature.
    if ! blkid "$DATA_DEVICE" >/dev/null 2>&1; then
      log "formatting $DATA_DEVICE as ext4 (it carries no filesystem)"
      mkfs.ext4 -q -L pgdata "$DATA_DEVICE"
    fi
    uuid=$(blkid -o value -s UUID "$DATA_DEVICE")
    mkdir -p "$DATA_MOUNT"
    grep -q "UUID=$uuid" /etc/fstab || echo "UUID=$uuid $DATA_MOUNT ext4 defaults,noatime,nofail 0 2" >>/etc/fstab
    mount "$DATA_MOUNT"
    CHANGES=$((CHANGES + 1))
  fi
  chown postgres:postgres "$DATA_MOUNT"
  WANT_DIR="$DATA_MOUNT/$PG_MAJOR/main"
else
  WANT_DIR="/var/lib/postgresql/$PG_MAJOR/main"
fi

# --- 3. the cluster, on the volume ---------------------------------------------

cluster_dir() { pg_lsclusters -h | awk -v v="$PG_MAJOR" '$1==v && $2=="main" {print $6}'; }
psql_su() { runuser -u postgres -- psql -v ON_ERROR_STOP=1 -qAtX "$@"; }

current_dir=$(cluster_dir)
if [[ -z "$current_dir" ]]; then
  log "creating cluster $PG_MAJOR/main in $WANT_DIR"
  pg_createcluster "$PG_MAJOR" main -d "$WANT_DIR"
  CHANGES=$((CHANGES + 1))
elif [[ "$current_dir" != "$WANT_DIR" ]]; then
  pg_ctlcluster "$PG_MAJOR" main start 2>/dev/null || true
  if [[ -n "$(psql_su -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")" ]]; then
    die "cluster $PG_MAJOR/main at $current_dir already holds $DB_NAME; refusing to move it"
  fi
  log "moving the empty cluster from $current_dir to $WANT_DIR"
  pg_dropcluster --stop "$PG_MAJOR" main
  pg_createcluster "$PG_MAJOR" main -d "$WANT_DIR"
  CHANGES=$((CHANGES + 1))
fi

# --- 4. PostgreSQL settings --------------------------------------------------

mem_mb=$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo)
restart_pg=0
if put "/etc/postgresql/$PG_MAJOR/main/conf.d/10-name-atlas.conf" 0644 postgres:postgres <<EOF; then restart_pg=1; fi
# Managed by scripts/production/provision-db.sh (TASK-041). Edits here are overwritten.
# Only PgBouncer, on this machine, talks to PostgreSQL over the network.
listen_addresses = 'localhost'
port = 5432
max_connections = 60
password_encryption = 'scram-sha-256'
shared_buffers = '$((mem_mb / 4))MB'
effective_cache_size = '$((mem_mb * 2 / 3))MB'
maintenance_work_mem = '1GB'
work_mem = '32MB'
max_wal_size = '8GB'
min_wal_size = '1GB'
checkpoint_timeout = '15min'
wal_compression = on
random_page_cost = 1.1
effective_io_concurrency = 200
max_worker_processes = 4
max_parallel_workers = 2
max_parallel_workers_per_gather = 1
max_parallel_maintenance_workers = 2
# Privacy: no statement is logged, so neither is a surname someone searched for.
log_statement = 'none'
log_min_duration_statement = -1
log_min_error_statement = 'panic'
log_parameter_max_length = 0
log_parameter_max_length_on_error = 0
log_connections = off
log_disconnections = off
EOF

if have_systemd; then
  systemctl enable --quiet "postgresql@$PG_MAJOR-main"
  if ((restart_pg)); then systemctl restart "postgresql@$PG_MAJOR-main"; else systemctl start "postgresql@$PG_MAJOR-main"; fi
else
  if ((restart_pg)); then pg_ctlcluster "$PG_MAJOR" main restart; else pg_ctlcluster "$PG_MAJOR" main start >/dev/null 2>&1 || true; fi
fi

# --- 5. roles, database, extensions, privileges --------------------------------

if [[ ! -f "$CREDS" ]]; then
  (
    umask 077
    {
      echo "OWNER_PASSWORD=$(openssl rand -hex 24)"
      echo "WEB_PASSWORD=$(openssl rand -hex 24)"
    } >"$CREDS"
  )
  log "generated passwords into $CREDS"
  CHANGES=$((CHANGES + 1))
fi
# shellcheck source=/dev/null
. "$CREDS"

# Passwords reach psql through the environment, never through its arguments.
# A role's password is set only when the role is created, so a re-run keeps
# the stored SCRAM verifier, and with it PgBouncer's auth file, unchanged.
runuser -u postgres -- env OWNER_PASSWORD="$OWNER_PASSWORD" WEB_PASSWORD="$WEB_PASSWORD" \
  psql -v ON_ERROR_STOP=1 -qAtX -d postgres <<SQL
\getenv owner_pw OWNER_PASSWORD
\getenv web_pw WEB_PASSWORD
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', '$OWNER_ROLE', :'owner_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$OWNER_ROLE') \gexec
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', '$WEB_ROLE', :'web_pw')
  WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$WEB_ROLE') \gexec
ALTER ROLE $WEB_ROLE SET default_transaction_read_only = on;
SELECT 'CREATE DATABASE $DB_NAME OWNER $OWNER_ROLE'
  WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '$DB_NAME') \gexec
SQL

# Extensions are created by the superuser here; migration 0001's
# CREATE EXTENSION IF NOT EXISTS then finds them and does nothing.
psql_su -d "$DB_NAME" <<SQL
SET client_min_messages = warning;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
REVOKE ALL ON DATABASE $DB_NAME FROM PUBLIC;
GRANT CONNECT ON DATABASE $DB_NAME TO $WEB_ROLE;
GRANT USAGE ON SCHEMA public TO $WEB_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE $OWNER_ROLE IN SCHEMA public GRANT SELECT ON TABLES TO $WEB_ROLE;
SQL

owner_url="postgres://$OWNER_ROLE:$OWNER_PASSWORD@localhost:5432/$DB_NAME"
web_url="postgres://$WEB_ROLE:$WEB_PASSWORD@$DB_HOST:$PGB_PORT/$DB_NAME?sslmode=verify-full"
grep -q '^OWNER_DATABASE_URL=' "$CREDS" || echo "OWNER_DATABASE_URL=$owner_url" >>"$CREDS"
grep -q '^WEB_DATABASE_URL=' "$CREDS" || echo "WEB_DATABASE_URL=$web_url" >>"$CREDS"

# --- 6. the certificate ------------------------------------------------------

install -d -m 0750 -o postgres -g postgres "$TLS_DIR"
if ((REHEARSAL)); then
  if [[ ! -f "$TLS_DIR/server.crt" ]]; then
    log "rehearsal: self-signed CA and certificate for $DB_HOST"
    openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=name-atlas rehearsal CA" \
      -keyout "$TLS_DIR/ca.key" -out "$TLS_DIR/ca.crt" 2>/dev/null
    openssl req -newkey rsa:2048 -nodes -subj "/CN=$DB_HOST" \
      -keyout "$TLS_DIR/server.key" -out "$TLS_DIR/server.csr" 2>/dev/null
    openssl x509 -req -in "$TLS_DIR/server.csr" -CA "$TLS_DIR/ca.crt" -CAkey "$TLS_DIR/ca.key" \
      -CAcreateserial -days 30 -extfile <(printf 'subjectAltName=DNS:%s' "$DB_HOST") \
      -out "$TLS_DIR/server.crt" 2>/dev/null
    chown postgres:postgres "$TLS_DIR"/*
    chmod 0600 "$TLS_DIR/server.key" "$TLS_DIR/ca.key"
    CHANGES=$((CHANGES + 1))
  fi
else
  duck_domain=${DB_HOST%.duckdns.org}
  put "$ETC_DIR/duckdns.env" 0600 root:root <<EOF || true
DUCKDNS_DOMAIN=$duck_domain
DUCKDNS_TOKEN=$DUCKDNS_TOKEN
EOF
  # Keeps DB_HOST pointing at this VM's public address (DuckDNS takes the
  # caller's address when ip= is empty).
  put "$LIB_DIR/duckdns-update" 0700 root:root <<'EOF' || true
#!/bin/sh
. /etc/name-atlas/duckdns.env
curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&ip=" | grep -q '^OK'
EOF
  put /etc/systemd/system/duckdns-update.service 0644 root:root <<EOF || true
[Unit]
Description=Point the DuckDNS name at this VM (TASK-041)
Wants=network-online.target
After=network-online.target

[Service]
Type=oneshot
ExecStart=$LIB_DIR/duckdns-update
EOF
  put /etc/systemd/system/duckdns-update.timer 0644 root:root <<'EOF' || true
[Unit]
Description=Update the DuckDNS name every 5 minutes (TASK-041)

[Timer]
OnBootSec=1min
OnUnitActiveSec=5min

[Install]
WantedBy=timers.target
EOF
  systemctl daemon-reload
  systemctl enable --now --quiet duckdns-update.timer
  systemctl start duckdns-update.service

  # certbot's DNS-01 challenge through the DuckDNS TXT record.
  put "$LIB_DIR/certbot-duckdns-auth" 0700 root:root <<'EOF' || true
#!/bin/sh
. /etc/name-atlas/duckdns.env
curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&txt=${CERTBOT_VALIDATION}&verbose=true" | grep -q '^OK'
sleep 60
EOF
  put "$LIB_DIR/certbot-duckdns-cleanup" 0700 root:root <<'EOF' || true
#!/bin/sh
. /etc/name-atlas/duckdns.env
curl -fsS "https://www.duckdns.org/update?domains=${DUCKDNS_DOMAIN}&token=${DUCKDNS_TOKEN}&txt=removed&clear=true" >/dev/null
EOF
  # Runs after every issuance and renewal: hands the certificate to PgBouncer.
  put "$LIB_DIR/certbot-deploy" 0700 root:root <<EOF || true
#!/bin/sh
set -e
install -m 0644 -o postgres -g postgres /etc/letsencrypt/live/$DB_HOST/fullchain.pem $TLS_DIR/server.crt
install -m 0600 -o postgres -g postgres /etc/letsencrypt/live/$DB_HOST/privkey.pem $TLS_DIR/server.key
systemctl reload pgbouncer 2>/dev/null || true
EOF
  if [[ ! -f "/etc/letsencrypt/live/$DB_HOST/fullchain.pem" ]]; then
    log "requesting a Let's Encrypt certificate for $DB_HOST (takes about a minute)"
    certbot certonly --non-interactive --agree-tos -m "$LE_EMAIL" \
      --manual --preferred-challenges dns \
      --manual-auth-hook "$LIB_DIR/certbot-duckdns-auth" \
      --manual-cleanup-hook "$LIB_DIR/certbot-duckdns-cleanup" \
      --deploy-hook "$LIB_DIR/certbot-deploy" \
      -d "$DB_HOST"
    CHANGES=$((CHANGES + 1))
  fi
  [[ -f "$TLS_DIR/server.crt" ]] || "$LIB_DIR/certbot-deploy"
fi

# --- 7. PgBouncer ------------------------------------------------------------

listen_addr=0.0.0.0
((REHEARSAL)) && listen_addr=127.0.0.1
restart_pgb=0
if put /etc/pgbouncer/pgbouncer.ini 0640 postgres:postgres <<EOF; then restart_pgb=1; fi
; Managed by scripts/production/provision-db.sh (TASK-041). Edits here are overwritten.
; The one database port reachable from outside. TLS is required, and only the
; roles in auth_file (the read-only web role) can log in.
[databases]
$DB_NAME = host=127.0.0.1 port=5432 dbname=$DB_NAME

[pgbouncer]
listen_addr = $listen_addr
listen_port = $PGB_PORT
unix_socket_dir = /var/run/postgresql
pidfile = /var/run/postgresql/pgbouncer.pid
logfile = /var/log/postgresql/pgbouncer.log
auth_type = scram-sha-256
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 200
default_pool_size = 10
max_db_connections = 20
max_prepared_statements = 100
ignore_startup_parameters = extra_float_digits
client_tls_sslmode = require
client_tls_protocols = secure
client_tls_cert_file = $TLS_DIR/server.crt
client_tls_key_file = $TLS_DIR/server.key
log_connections = 0
log_disconnections = 0
EOF

# The web role's SCRAM verifier, as PostgreSQL stores it, so PgBouncer can
# check the client's proof and pass it on to the server.
web_secret=$(psql_su -d postgres -c "SELECT rolpassword FROM pg_authid WHERE rolname = '$WEB_ROLE'")
[[ "$web_secret" == SCRAM-SHA-256* ]] || die "$WEB_ROLE has no SCRAM verifier"
if put /etc/pgbouncer/userlist.txt 0640 postgres:postgres <<<"\"$WEB_ROLE\" \"$web_secret\""; then
  restart_pgb=1
fi

if have_systemd; then
  systemctl enable --quiet pgbouncer
  if ((restart_pgb)); then systemctl restart pgbouncer; else systemctl start pgbouncer; fi
else
  if ((restart_pgb)) || ! pgrep -u postgres -x pgbouncer >/dev/null; then
    pkill -u postgres -x pgbouncer 2>/dev/null || true
    sleep 1
    runuser -u postgres -- pgbouncer -d -q /etc/pgbouncer/pgbouncer.ini
  fi
fi

# --- 8. firewall -------------------------------------------------------------

if ((!REHEARSAL)); then
  # Oracle's Ubuntu images end INPUT with a REJECT rule, whatever the
  # security list allows; the new rule goes before it.
  if ! iptables -C INPUT -p tcp -m state --state NEW --dport "$PGB_PORT" -j ACCEPT 2>/dev/null; then
    reject_at=$(iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" {print $1; exit}')
    if [[ -n "$reject_at" ]]; then
      iptables -I INPUT "$reject_at" -p tcp -m state --state NEW --dport "$PGB_PORT" -j ACCEPT
    else
      iptables -A INPUT -p tcp -m state --state NEW --dport "$PGB_PORT" -j ACCEPT
    fi
    netfilter-persistent save
    log "opened TCP $PGB_PORT in the VM's firewall"
    CHANGES=$((CHANGES + 1))
  fi
fi

# --- 9. unattended security upgrades -------------------------------------------

put /etc/apt/apt.conf.d/20auto-upgrades 0644 root:root <<'EOF' || true
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

log "done: $CHANGES change(s)."
log "credentials and both connection strings are in $CREDS; never paste that file anywhere."
