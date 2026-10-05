#!/usr/bin/env bash
# Prepares the production database VM (ADR-0017, TASK-042): PostgreSQL 17 with
# PostGIS and pg_trgm, PgBouncer in front of it for the web app, the two
# database roles, and the host firewall rule for the pooler port.
#
# Runs as root on Ubuntu 24.04 (arm64 on the Oracle A1 VM). The
# `Register VM` workflow copies it over and runs it with the web role's
# password on stdin:
#
#   sudo bash provision.sh <<<"$VM_DB_WEB_PASSWORD"
#
# Idempotent: every step checks before it changes anything, so re-running it
# repairs a half-finished run and changes nothing after a complete one. It
# prints no secret. It refuses to run while the register build is running,
# because it may restart PostgreSQL.
set -euo pipefail

PG_MAJOR=17
CLUSTER=main
DB=name_atlas
BUILD_ROLE=nameatlas         # owns the database; the build connects as it over the socket (peer)
WEB_ROLE=nameatlas_web       # read-only; the web app connects as it through PgBouncer
APP_ROLE=nameatlas_app       # accounts only (TASK-063); created by accounts.sh, listed in PgBouncer here once it has a password
STAGING_DB=name_atlas_staging        # the staging copy (ADR-0039); made by staging.sh, listed in PgBouncer here
STAGING_ROLE=nameatlas_staging_web   # read-only on the staging copy; created by staging.sh, listed here once it has a password
OPS_HOME=/srv/name-atlas     # the build user's home: root never writes inside it
STATE=/var/lib/name-atlas    # root-owned: the finalized marker and the dump
POOLER_PORT=6432
NODE_VERSION=22.22.2         # .nvmrc
BUILD_UNIT=name-atlas-register-build

log() { echo "[provision] $*"; }
die() { echo "[provision] ERROR: $*" >&2; exit 1; }

[ "$(id -u)" = 0 ] || die "run as root"
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`), and
# `find` and others fail when they cannot return to it.
cd /
# shellcheck source=/dev/null
. /etc/os-release
[ "${VERSION_ID:-}" = "24.04" ] || die "expected Ubuntu 24.04, found ${PRETTY_NAME:-unknown}"

# The settings below are sized for 2 OCPUs and 12 GB, which is Oracle's whole
# Always Free A1 allowance, and the build's duration was projected for 2 cores.
# A smaller VM is a wrong shape, not a smaller setup. A larger one is not free:
# past the allowance Oracle bills it, or on a trial account disables it when the
# trial ends. Either way, set the shape in the console (Instance > More actions
# > Edit shape), then run provision again.
cpus=$(nproc)
mem_mb=$(awk '/^MemTotal:/ { print int($2 / 1024) }' /proc/meminfo)
if [ "$cpus" -ne 2 ] || [ "$mem_mb" -lt 10000 ] || [ "$mem_mb" -gt 13000 ]; then
  die "this VM has $cpus CPU(s) and $mem_mb MB; it must be exactly 2 OCPUs and 12 GB (Oracle's Always Free A1 allowance). Fix it in the Oracle console (Instance > More actions > Edit shape), then run provision again"
fi

HAVE_SYSTEMD=0
[ -d /run/systemd/system ] && HAVE_SYSTEMD=1

if [ "$HAVE_SYSTEMD" = 1 ] && systemctl is-active --quiet "$BUILD_UNIT"; then
  die "the register build is running; provision restarts PostgreSQL, so wait for it to finish"
fi

# The web role's password arrives on stdin, never in argv or the environment.
WEB_PASSWORD=""
if [ ! -t 0 ]; then IFS= read -r WEB_PASSWORD || true; fi
[ -n "$WEB_PASSWORD" ] || die "the web role's password must arrive on stdin"
[[ "$WEB_PASSWORD" =~ ^[A-Za-z0-9]{24,128}$ ]] ||
  die "the web role's password must be 24-128 letters and digits (it goes into a URL unescaped)"

export DEBIAN_FRONTEND=noninteractive
# A fresh cloud VM runs cloud-init, apt-daily and unattended-upgrades at first
# boot, and apt-get does not wait for their locks. Installs wait up to 10
# minutes for the dpkg lock; updates, whose lists lock has no timeout, retry.
# confold keeps this script's own pgbouncer.ini when a package upgrade ships a
# new default, instead of stopping at a prompt no one can answer.
APT_INSTALL=(apt-get install -y -q -o DPkg::Lock::Timeout=600
  -o Dpkg::Options::=--force-confdef -o Dpkg::Options::=--force-confold)
retry() { # retry CMD...: 10 tries, 30 s apart
  local i
  for i in $(seq 1 10); do "$@" && return 0; log "  retry $i/10 in 30 s: $*"; sleep 30; done
  die "failed 10 times: $*"
}
if command -v cloud-init >/dev/null; then cloud-init status --wait >/dev/null 2>&1 || true; fi

log "1/9 base packages and the en_US.UTF-8 locale (CI's collation)"
retry apt-get update -q
"${APT_INSTALL[@]}" ca-certificates curl gnupg iproute2 locales openssl xz-utils postgresql-common \
  unattended-upgrades
if ! locale -a | grep -i '^en_US\.utf8$' >/dev/null; then
  sed -i 's/^# *\(en_US.UTF-8 UTF-8\)/\1/' /etc/locale.gen
  grep -q '^en_US.UTF-8 UTF-8' /etc/locale.gen || echo 'en_US.UTF-8 UTF-8' >>/etc/locale.gen
  locale-gen
fi

log "2/9 swap (the VM has none; a 4 GB file keeps an out-of-memory kill away)"
if [ "$HAVE_SYSTEMD" = 1 ] && [ -z "$(swapon --show=NAME --noheadings)" ]; then
  [ -f /swapfile ] || { fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null; }
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi
swapon --show || true

log "3/9 PostgreSQL $PG_MAJOR, PostGIS 3 and PgBouncer from the PostgreSQL apt repository (PGDG)"
if [ ! -f /etc/apt/sources.list.d/pgdg.sources ] && [ ! -f /etc/apt/sources.list.d/pgdg.list ]; then
  retry /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y
fi
# PgBouncer faces the internet, so PGDG's security releases must arrive without
# anyone re-running this script. Minor PostgreSQL releases arrive the same way;
# a restart during the build is harmless, because the build resumes.
cat >/etc/apt/apt.conf.d/51name-atlas-pgdg <<'APT'
// Written by ops/vm/provision.sh (TASK-040): unattended upgrades also from PGDG.
Unattended-Upgrade::Origins-Pattern { "origin=apt.postgresql.org,codename=noble-pgdg"; };
APT
# The cluster is created below with an explicit locale, not by the package.
CC=/etc/postgresql-common/createcluster.conf
if grep -E '^#?[[:space:]]*create_main_cluster[[:space:]]*=' "$CC" >/dev/null; then
  sed -i -E 's/^#?[[:space:]]*create_main_cluster[[:space:]]*=.*/create_main_cluster = false/' "$CC"
else
  echo 'create_main_cluster = false' >>"$CC"
fi
"${APT_INSTALL[@]}" "postgresql-$PG_MAJOR" "postgresql-$PG_MAJOR-postgis-3" pgbouncer
dpkg-query -W -f='[provision]   ${Package} ${Version}\n' "postgresql-$PG_MAJOR" "postgresql-$PG_MAJOR-postgis-3" pgbouncer

log "4/9 the cluster ($PG_MAJOR/$CLUSTER, UTF8, en_US.UTF-8)"
if ! pg_lsclusters -h | awk '{print $1"/"$2}' | grep -x "$PG_MAJOR/$CLUSTER" >/dev/null; then
  other=$(pg_lsclusters -h | awk '$3 == 5432 { print $1"/"$2 }')
  [ -z "$other" ] || die "cluster $other already uses port 5432"
  pg_createcluster "$PG_MAJOR" "$CLUSTER" --port=5432 --encoding=UTF8 --locale=en_US.UTF-8
fi
port=$(pg_lsclusters -h | awk -v c="$PG_MAJOR/$CLUSTER" '$1"/"$2 == c { print $3 }')
[ "$port" = 5432 ] || die "cluster $PG_MAJOR/$CLUSTER listens on port $port, not 5432"
CONF_DIR=/etc/postgresql/$PG_MAJOR/$CLUSTER/conf.d
mkdir -p "$CONF_DIR"
# Sized for the A1 VM's 12 GB. shared_buffers holds a quarter of memory in use
# while the site is quiet, which is what keeps Oracle's idle reclamation (all
# of CPU, network and memory under 20% for 7 days) from applying; autoprewarm
# refills it after a restart.
cat >"$CONF_DIR/10-name-atlas.conf.new" <<'CONF'
# Written by ops/vm/provision.sh (TASK-040). Do not edit by hand.
listen_addresses = 'localhost'
shared_buffers = 3GB
effective_cache_size = 8GB
maintenance_work_mem = 1GB
work_mem = 32MB
max_wal_size = 4GB
checkpoint_timeout = 30min
wal_compression = on
random_page_cost = 1.1
shared_preload_libraries = 'pg_prewarm'
pg_prewarm.autoprewarm = on
password_encryption = 'scram-sha-256'
CONF
# The build writes ~16 GB; losing its last commits in a crash is harmless,
# because the build is resumable. finalize.sh removes this file.
BUILD_CONF="$CONF_DIR/20-build.conf"
install -d -o root -g root -m 755 "$STATE"
if [ ! -f "$STATE/register-finalized" ] && [ ! -f "$BUILD_CONF" ]; then
  printf '# Written by ops/vm/provision.sh for the register build; removed by finalize.sh.\nsynchronous_commit = off\n' >"$BUILD_CONF"
fi
restart_pg=0
if ! cmp -s "$CONF_DIR/10-name-atlas.conf.new" "$CONF_DIR/10-name-atlas.conf"; then
  mv "$CONF_DIR/10-name-atlas.conf.new" "$CONF_DIR/10-name-atlas.conf"
  restart_pg=1
else
  rm -f "$CONF_DIR/10-name-atlas.conf.new"
fi
chown -R postgres:postgres "$CONF_DIR"

pg_service() { # start|restart|reload
  if [ "$HAVE_SYSTEMD" = 1 ]; then
    systemctl enable --quiet "postgresql@$PG_MAJOR-$CLUSTER"
    systemctl "$1" "postgresql@$PG_MAJOR-$CLUSTER"
  else
    pg_ctlcluster "$PG_MAJOR" "$CLUSTER" "$1" || { [ "$1" = start ] && pg_ctlcluster "$PG_MAJOR" "$CLUSTER" status >/dev/null; }
  fi
}
# After an unclean stop, PostgreSQL replays up to max_wal_size (4 GB) of WAL
# before it accepts connections, which can outlast pg_ctl's 60 s wait. So a
# start that "did not start in time" is not a failure until pg_isready, given
# ten minutes, says it is.
if [ "$restart_pg" = 1 ]; then pg_service restart || true; else pg_service start || true; fi
for _ in $(seq 1 120); do pg_isready -q -p 5432 && break; sleep 5; done
pg_isready -q -p 5432 || die "PostgreSQL did not accept connections within 10 minutes"

psql_su() { runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 "$@"; }

log "5/9 roles and the database"
id -u "$BUILD_ROLE" >/dev/null 2>&1 ||
  useradd --system --create-home --home-dir "$OPS_HOME" --shell /usr/sbin/nologin "$BUILD_ROLE"
install -d -o "$BUILD_ROLE" -g "$BUILD_ROLE" -m 755 "$OPS_HOME"
psql_su -d postgres <<SQL
SELECT format('CREATE ROLE %I LOGIN', '$BUILD_ROLE')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$BUILD_ROLE') \gexec
SELECT format('CREATE ROLE %I LOGIN', '$WEB_ROLE')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$WEB_ROLE') \gexec
ALTER ROLE $WEB_ROLE SET default_transaction_read_only = on;
ALTER ROLE $WEB_ROLE SET statement_timeout = '30s';
ALTER ROLE $WEB_ROLE SET idle_in_transaction_session_timeout = '60s';
SQL
# Setting a password makes a new SCRAM secret (a new salt), which would rewrite
# PgBouncer's auth file and restart it. So it is set only when it does not
# already work. It is expanded into the heredoc (stdin), never passed in argv;
# it is letters and digits only, checked above, so it needs no quoting.
if PGPASSWORD="$WEB_PASSWORD" PGCONNECT_TIMEOUT=5 psql -X -h 127.0.0.1 -p 5432 -U "$WEB_ROLE" -d postgres \
  -tAc 'SELECT 1' >/dev/null 2>&1; then
  log "  $WEB_ROLE's password is already set"
else
  psql_su -d postgres <<SQL
ALTER ROLE $WEB_ROLE PASSWORD '$WEB_PASSWORD';
SQL
  log "  $WEB_ROLE's password set"
fi
if [ "$(runuser -u postgres -- psql -X -tAc "SELECT count(*) FROM pg_database WHERE datname = '$DB'")" != 1 ]; then
  runuser -u postgres -- createdb -O "$BUILD_ROLE" -E UTF8 --locale=en_US.UTF-8 -T template0 "$DB"
fi
# postgis is not a trusted extension, so the superuser creates both here and
# migration 0001's CREATE EXTENSION IF NOT EXISTS finds them present.
psql_su -d "$DB" <<SQL
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pg_prewarm;
REVOKE ALL ON DATABASE $DB FROM PUBLIC;
GRANT CONNECT ON DATABASE $DB TO $WEB_ROLE;
GRANT USAGE ON SCHEMA public TO $WEB_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE $BUILD_ROLE IN SCHEMA public GRANT SELECT ON TABLES TO $WEB_ROLE;
SQL
runuser -u postgres -- psql -X -tAc \
  "SELECT '[provision]   ' || datname || ' ' || pg_encoding_to_char(encoding) || ' ' || datcollate || ' owner=' || pg_get_userbyid(datdba) FROM pg_database WHERE datname = '$DB'"

log "6/9 PgBouncer on :$POOLER_PORT (TLS, SCRAM, transaction pooling, $WEB_ROLE and, once set up, $APP_ROLE and $STAGING_ROLE)"
PGB=/etc/pgbouncer
if [ ! -s "$PGB/server.key" ] || [ ! -s "$PGB/server.crt" ]; then
  # Self-signed: the app connects with uselibpqcompat=true&sslmode=require, which
  # encrypts without checking the certificate, as it does with Supabase today (ADR-0017 §2.4).
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 3650 \
    -subj '/CN=name-atlas-db' -keyout "$PGB/server.key" -out "$PGB/server.crt" 2>/dev/null
fi
chown postgres:postgres "$PGB/server.key" "$PGB/server.crt"
chmod 600 "$PGB/server.key"
chmod 644 "$PGB/server.crt"
# PgBouncer logs in to PostgreSQL with the client's own SCRAM secret, so the
# secret in the auth file must be byte-identical to pg_authid's. One line for
# each role that has one, the web role first: it always does, and the accounts
# role and the staging role do once ops/vm/accounts.sh and ops/vm/staging.sh have
# set their passwords, so running provision again keeps them in the pooler (and
# writes the file those scripts wrote, so nothing changes). The same loop is in
# accounts.sh and staging.sh.
umask 077
: >"$PGB/userlist.txt.new"
for role in "$WEB_ROLE" "$APP_ROLE" "$STAGING_ROLE"; do
  secret=$(runuser -u postgres -- psql -X -tAc "SELECT rolpassword FROM pg_authid WHERE rolname = '$role'")
  if [[ "$secret" == SCRAM-SHA-256\$* ]]; then
    printf '"%s" "%s"\n' "$role" "$secret" >>"$PGB/userlist.txt.new"
  elif [ "$role" = "$WEB_ROLE" ]; then
    die "$WEB_ROLE has no SCRAM secret"
  fi
done
umask 022
cat >"$PGB/pgbouncer.ini.new" <<INI
; Written by ops/vm/provision.sh (TASK-040). Do not edit by hand.
[databases]
$DB = host=127.0.0.1 port=5432 dbname=$DB
$STAGING_DB = host=127.0.0.1 port=5432 dbname=$STAGING_DB pool_size=5 max_db_connections=10

[pgbouncer]
listen_addr = 0.0.0.0
listen_port = $POOLER_PORT
unix_socket_dir = /var/run/postgresql
pidfile = /var/run/postgresql/pgbouncer.pid
logfile = /var/log/postgresql/pgbouncer.log
auth_type = scram-sha-256
auth_file = $PGB/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 20
max_db_connections = 40
max_prepared_statements = 200
; A connection that has not logged in within 10 s is dropped, and no packet may
; exceed 16 MB, so unauthenticated connections cannot hold slots or memory long.
client_login_timeout = 10
max_packet_size = 16777216
client_tls_sslmode = require
client_tls_key_file = $PGB/server.key
client_tls_cert_file = $PGB/server.crt
client_tls_protocols = secure
server_tls_sslmode = disable
ignore_startup_parameters = extra_float_digits
INI
restart_pgb=0
for f in pgbouncer.ini userlist.txt; do
  if ! cmp -s "$PGB/$f.new" "$PGB/$f"; then mv "$PGB/$f.new" "$PGB/$f"; restart_pgb=1; else rm -f "$PGB/$f.new"; fi
done
chown postgres:postgres "$PGB/pgbouncer.ini" "$PGB/userlist.txt"
chmod 640 "$PGB/pgbouncer.ini" "$PGB/userlist.txt"
if [ "$HAVE_SYSTEMD" = 1 ]; then
  # The packaged unit neither restarts PgBouncer after a crash nor raises the
  # 1024 open-file limit, which 1000 clients plus 40 server connections exceed.
  install -d /etc/systemd/system/pgbouncer.service.d
  cat >/etc/systemd/system/pgbouncer.service.d/10-name-atlas.conf.new <<'UNIT'
# Written by ops/vm/provision.sh (TASK-040). Do not edit by hand.
[Unit]
StartLimitIntervalSec=0

[Service]
Restart=always
RestartSec=2
LimitNOFILE=8192
UNIT
  dropin=/etc/systemd/system/pgbouncer.service.d/10-name-atlas.conf
  if ! cmp -s "$dropin.new" "$dropin"; then
    mv "$dropin.new" "$dropin"
    systemctl daemon-reload
    restart_pgb=1
  else
    rm -f "$dropin.new"
  fi
  systemctl enable --quiet pgbouncer
  if [ "$restart_pgb" = 1 ]; then systemctl restart pgbouncer; else systemctl start pgbouncer; fi
else
  if [ -f /var/run/postgresql/pgbouncer.pid ] && kill -0 "$(cat /var/run/postgresql/pgbouncer.pid)" 2>/dev/null; then
    [ "$restart_pgb" = 1 ] && kill -HUP "$(cat /var/run/postgresql/pgbouncer.pid)"
  else
    runuser -u postgres -- pgbouncer -d "$PGB/pgbouncer.ini"
  fi
fi

log "7/9 host firewall: accept new TCP connections on :$POOLER_PORT"
# Oracle's Ubuntu images end the INPUT chain with a REJECT. The rule goes above
# it and is saved with netfilter-persistent. Never UFW: Oracle's known issue says
# it can drop the rules the instance needs to reach its boot volume.
if command -v iptables >/dev/null && iptables -S INPUT 2>/dev/null | grep -- '-j REJECT' >/dev/null; then
  accept=(-p tcp -m state --state NEW --dport "$POOLER_PORT" -j ACCEPT)
  if ! iptables -C INPUT "${accept[@]}" 2>/dev/null; then
    n=$(iptables -L INPUT --line-numbers -n | awk '$2 == "REJECT" { print $1; exit }')
    iptables -I INPUT "$n" "${accept[@]}"
  fi
  # One address may hold at most 200 connections, far above what Vercel's
  # functions use (2 per instance), so no single host can fill max_client_conn.
  limit=(-p tcp --syn --dport "$POOLER_PORT" -m connlimit --connlimit-above 200 --connlimit-mask 32
    -j REJECT --reject-with tcp-reset)
  if ! iptables -C INPUT "${limit[@]}" 2>/dev/null; then
    n=$(iptables -L INPUT --line-numbers -n | awk -v p="dpt:$POOLER_PORT" '$2 == "ACCEPT" && index($0, p) { print $1; exit }')
    iptables -I INPUT "$n" "${limit[@]}"
  fi
  command -v netfilter-persistent >/dev/null || "${APT_INSTALL[@]}" iptables-persistent
  netfilter-persistent save >/dev/null
  iptables -L INPUT --line-numbers -n | sed 's/^/[provision]   /'
else
  log "  no REJECT rule in INPUT; nothing to open on this host"
fi

log "8/9 Node $NODE_VERSION and pnpm (through corepack) for the build"
case "$(uname -m)" in
  aarch64) node_arch=arm64; node_sha=e9e1930fd321a470e29bb68f30318bf58e3ecb4acb4f1533fb19c58328a091fe ;;
  x86_64) node_arch=x64; node_sha=88fd1ce767091fd8d4a99fdb2356e98c819f93f3b1f8663853a2dee9b438068a ;;
  *) die "unsupported architecture $(uname -m)" ;;
esac
NODE_DIR=/opt/node-v$NODE_VERSION-linux-$node_arch
if [ ! -x "$NODE_DIR/bin/node" ]; then
  tmp=$(mktemp -d)
  tarball=$tmp/node.tar.xz
  retry curl -fsSL -o "$tarball" "https://nodejs.org/dist/v$NODE_VERSION/node-v$NODE_VERSION-linux-$node_arch.tar.xz"
  echo "$node_sha  $tarball" | sha256sum -c --quiet -
  tar -C /opt -xJf "$tarball"
  rm -rf "$tmp"
fi
for b in node npm npx corepack; do ln -sfn "$NODE_DIR/bin/$b" "/usr/local/bin/$b"; done
/usr/local/bin/corepack enable --install-directory /usr/local/bin
log "  node $(/usr/local/bin/node --version)"

log "9/9 summary"
runuser -u postgres -- psql -X -tA -d "$DB" -c \
  "SELECT '[provision]   ' || extname || ' ' || extversion FROM pg_extension ORDER BY 1"
runuser -u postgres -- psql -X -tA -c "SELECT '[provision]   ' || version()"
if [ "$HAVE_SYSTEMD" = 1 ]; then
  for s in "postgresql@$PG_MAJOR-$CLUSTER" pgbouncer; do log "  $s: $(systemctl is-active "$s")"; done
fi
ss -ltn | awk 'NR == 1 || /:5432 |:6432 /' | sed 's/^/[provision]   /'
log "done"
