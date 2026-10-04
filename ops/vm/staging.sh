#!/usr/bin/env bash
# The staging database (ADR-0039): a copy of the production database beside it,
# on the same PostgreSQL cluster, for staging.name-atlas.pl. Vercel builds
# `main` there; name-atlas.pl is built from the branch `production`.
#
#   sudo bash staging.sh refresh ABSOLUTE_PATH_TO_ARCHIVE <<<"$VM_DB_STAGING_WEB_PASSWORD"
#   sudo bash staging.sh migrate ABSOLUTE_PATH_TO_ARCHIVE
#
# refresh, then everything migrate does:
#   1. the role nameatlas_staging_web, read-only like nameatlas_web, and its
#      password from stdin, set only when it does not already work, so a re-run
#      keeps the SCRAM salt and PgBouncer's user list;
#   2. the old copy is dropped and a new one restored under a temporary name:
#      pg_dump of production streams straight into pg_restore, so no dump file
#      is written. The rows of `accounts` and `family` are left out, so no
#      reader's address and no tree reaches staging; their tables arrive empty;
#   3. the new copy becomes name_atlas_staging only once the restore completed.
# migrate:
#   4. the pushed commit is unpacked into $STAGING_APP, a tree of its own:
#      production's $APP, which the long-running units use, is left alone.
#      Then pnpm install, and pnpm db:migrate against the copy only;
#   5. grants: the staging role connects to the copy and reads its `public`;
#      no other role may connect to it, and it may not connect to production;
#   6. PgBouncer: the copy's line in pgbouncer.ini (the same one provision.sh
#      writes, so a later provision changes nothing) and the role's SCRAM secret
#      in the user list. A reload, which keeps production's clients connected;
#   7. the checks.
#
# Production is only read. pg_dump reads it from one snapshot, and the copy runs
# at lower CPU and disk priority than the site's queries. It still reads the whole
# database, so expect production to be slower while it runs. It refuses while the
# register build runs, and before finalize.
set -euo pipefail

DB=name_atlas
STAGING_DB=name_atlas_staging
NEXT_DB=name_atlas_staging_next
BUILD_USER=nameatlas
WEB_ROLE=nameatlas_web
APP_ROLE=nameatlas_app
STAGING_ROLE=nameatlas_staging_web
OPS_HOME=/srv/name-atlas
STAGING_APP=$OPS_HOME/staging-app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
BUILD_UNIT=name-atlas-register-build
PGB=/etc/pgbouncer
# Byte for byte the line provision.sh writes under [databases]. Its own small
# pool keeps staging from taking production's server connections.
DB_LINE="$DB = host=127.0.0.1 port=5432 dbname=$DB"
STAGING_LINE="$STAGING_DB = host=127.0.0.1 port=5432 dbname=$STAGING_DB pool_size=5 max_db_connections=10"
COMMAND=${1:-}
ARCHIVE=${2:-}

log() { echo "[staging] $*"; }
die() { echo "[staging] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$1" -c "$2"; }

build_env=(env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PATH=/usr/local/bin:/usr/bin:/bin
  DATABASE_URL="postgresql://$BUILD_USER@/$STAGING_DB?host=/var/run/postgresql")
as_build() {
  # shellcheck disable=SC2016 # $1 and $@ belong to the inner shell
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -c 'cd "$1" && shift && exec "$@"' _ "$STAGING_APP" "$@"
}

[ "$(id -u)" = 0 ] || die "run as root"
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`).
cd /
[ -d /run/systemd/system ] || die "systemd is required"
case "$COMMAND" in refresh | migrate) ;; *) die "usage: staging.sh refresh|migrate ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
case "$ARCHIVE" in /*) ;; *) die "usage: staging.sh refresh|migrate ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then die "$ARCHIVE must be a non-empty regular file"; fi

STAGING_PASSWORD=""
if [ "$COMMAND" = refresh ]; then
  # The staging role's password arrives on stdin, never in argv or the environment.
  if [ ! -t 0 ]; then IFS= read -r STAGING_PASSWORD || true; fi
  [ -n "$STAGING_PASSWORD" ] || die "the staging role's password must arrive on stdin"
  [[ "$STAGING_PASSWORD" =~ ^[A-Za-z0-9]{24,128}$ ]] ||
    die "the staging role's password must be 24-128 letters and digits (it goes into a URL unescaped)"
fi

[ -f "$FINALIZED" ] || die "finalize has not run ($FINALIZED is missing)"
state=$(systemctl show -p ActiveState --value "$BUILD_UNIT" 2>/dev/null || true)
case "$state" in
  active | activating | deactivating | reloading) die "$BUILD_UNIT is running (ActiveState=$state); run this when it has finished" ;;
esac
[ -s "$PGB/pgbouncer.ini" ] && [ -s "$PGB/userlist.txt" ] || die "PgBouncer is not set up ($PGB); run provision first"
grep -qxF "$DB_LINE" "$PGB/pgbouncer.ini" || die "pgbouncer.ini has no line '$DB_LINE'; run provision first"

exists() { [ "$(q postgres "SELECT count(*) FROM pg_database WHERE datname = '$1'")" = 1 ]; }

if [ "$COMMAND" = refresh ]; then
  log "1/7 the role $STAGING_ROLE"
  runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d postgres <<SQL
SELECT format('CREATE ROLE %I LOGIN', '$STAGING_ROLE')
 WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$STAGING_ROLE') \gexec
ALTER ROLE $STAGING_ROLE CONNECTION LIMIT 20;
ALTER ROLE $STAGING_ROLE SET default_transaction_read_only = on;
ALTER ROLE $STAGING_ROLE SET statement_timeout = '30s';
ALTER ROLE $STAGING_ROLE SET idle_in_transaction_session_timeout = '60s';
SQL
  # Setting a password makes a new SCRAM secret (a new salt), which would rewrite
  # PgBouncer's user list. So it is set only when it does not already work. It
  # is expanded into the heredoc (stdin), never passed in argv; it is letters and
  # digits only, checked above, so it needs no quoting. The probe connects to
  # `postgres`, which holds no data, as provision.sh's does for the web role.
  if PGPASSWORD="$STAGING_PASSWORD" PGCONNECT_TIMEOUT=5 psql -X -h 127.0.0.1 -p 5432 -U "$STAGING_ROLE" \
    -d postgres -tAc 'SELECT 1' >/dev/null 2>&1; then
    log "  $STAGING_ROLE's password is already set"
  else
    runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d postgres <<SQL
ALTER ROLE $STAGING_ROLE PASSWORD '$STAGING_PASSWORD';
SQL
    log "  $STAGING_ROLE's password set"
  fi

  log "2/7 copy $DB into $NEXT_DB, without the rows of accounts and family"
  data_dir=$(q postgres 'SHOW data_directory')
  size=$(q postgres "SELECT pg_database_size('$DB')")
  old=0
  if exists "$STAGING_DB"; then old=$(q postgres "SELECT pg_database_size('$STAGING_DB')"); fi
  if exists "$NEXT_DB"; then old=$((old + $(q postgres "SELECT pg_database_size('$NEXT_DB')"))); fi
  avail=$(df --output=avail -B1 "$data_dir" | tail -n 1 | tr -d ' ')
  # The copy, a fifth again for the index builds' sort files and the WAL, and
  # 10 GiB the production database keeps in hand.
  need=$((size + size / 5 + 10 * 1024 * 1024 * 1024))
  gib() { echo "$(($1 / 1024 / 1024 / 1024)) GiB"; }
  log "  production $(gib "$size"); free $(gib "$avail"), plus $(gib "$old") the old copy frees; needed $(gib "$need")"
  [ $((avail + old)) -ge "$need" ] || die "not enough disk for a copy; nothing was changed"
  # The old copy goes first, so the disk holds one copy at a time. Staging is
  # unavailable from here until step 3, which a re-run of refresh repairs.
  q postgres "DROP DATABASE IF EXISTS $NEXT_DB WITH (FORCE)" >/dev/null
  q postgres "DROP DATABASE IF EXISTS $STAGING_DB WITH (FORCE)" >/dev/null
  runuser -u postgres -- createdb -O "$BUILD_USER" -E UTF8 --locale=en_US.UTF-8 -T template0 "$NEXT_DB"
  q postgres "REVOKE ALL ON DATABASE $NEXT_DB FROM PUBLIC" >/dev/null
  # --no-acl: production's grants name production's roles; step 5 grants the copy's.
  started=$(date +%s)
  runuser -u postgres -- nice -n 10 ionice -c 2 -n 7 pg_dump --format=custom --exclude-table-data='accounts.*' --exclude-table-data='family.*' -d "$DB" |
    runuser -u postgres -- nice -n 10 ionice -c 2 -n 7 pg_restore --no-acl --exit-on-error -d "$NEXT_DB"
  log "  restored in $(( ($(date +%s) - started) / 60 )) min"

  log "3/7 $NEXT_DB becomes $STAGING_DB"
  q postgres "ALTER DATABASE $NEXT_DB RENAME TO $STAGING_DB" >/dev/null
fi

exists "$STAGING_DB" || die "$STAGING_DB does not exist; run the staging step (refresh) first"
[ "$(q postgres "SELECT count(*) FROM pg_roles WHERE rolname = '$STAGING_ROLE'")" = 1 ] ||
  die "the role $STAGING_ROLE does not exist; run the staging step (refresh) first"

log "4/7 unpack the pushed commit into $STAGING_APP, pnpm install, pnpm db:migrate on $STAGING_DB"
runuser -u "$BUILD_USER" -- mkdir -p "$STAGING_APP"
runuser -u "$BUILD_USER" -- find "$STAGING_APP" -mindepth 1 -maxdepth 1 ! -name node_modules -exec rm -rf {} +
runuser -u "$BUILD_USER" -- tar -C "$STAGING_APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5
as_build pnpm db:migrate | tail -n 10
q "$STAGING_DB" "SELECT '[staging]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"

log "5/7 grants"
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d "$STAGING_DB" <<SQL
REVOKE ALL ON DATABASE $STAGING_DB FROM PUBLIC;
GRANT CONNECT ON DATABASE $STAGING_DB TO $STAGING_ROLE;
GRANT USAGE ON SCHEMA public TO $STAGING_ROLE;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO $STAGING_ROLE;
ALTER DEFAULT PRIVILEGES FOR ROLE $BUILD_USER IN SCHEMA public GRANT SELECT ON TABLES TO $STAGING_ROLE;
SQL

log "6/7 PgBouncer: the database line and the user list"
reload=0
if ! grep -qxF "$STAGING_LINE" "$PGB/pgbouncer.ini"; then
  awk -v db="$DB_LINE" -v line="$STAGING_LINE" '{ print } $0 == db { print line }' \
    "$PGB/pgbouncer.ini" >"$PGB/pgbouncer.ini.new"
  grep -qxF "$STAGING_LINE" "$PGB/pgbouncer.ini.new" || { rm -f "$PGB/pgbouncer.ini.new"; die "could not add the line to pgbouncer.ini"; }
  mv "$PGB/pgbouncer.ini.new" "$PGB/pgbouncer.ini"
  chown postgres:postgres "$PGB/pgbouncer.ini"
  chmod 640 "$PGB/pgbouncer.ini"
  reload=1
  log "  pgbouncer.ini: $STAGING_DB added"
fi
# One line for each role that has a SCRAM secret, in the order provision.sh and
# accounts.sh write them, so either one run later finds nothing to change.
# PgBouncer logs in to PostgreSQL with the client's own secret, so each must be
# byte-identical to pg_authid's.
umask 077
: >"$PGB/userlist.txt.new"
for role in "$WEB_ROLE" "$APP_ROLE" "$STAGING_ROLE"; do
  secret=$(runuser -u postgres -- psql -X -tAc "SELECT rolpassword FROM pg_authid WHERE rolname = '$role'")
  if [[ "$secret" == SCRAM-SHA-256\$* ]]; then
    printf '"%s" "%s"\n' "$role" "$secret" >>"$PGB/userlist.txt.new"
  elif [ "$role" != "$APP_ROLE" ]; then
    rm -f "$PGB/userlist.txt.new"
    die "$role has no SCRAM secret"
  fi
done
umask 022
if cmp -s "$PGB/userlist.txt.new" "$PGB/userlist.txt"; then
  rm -f "$PGB/userlist.txt.new"
else
  mv "$PGB/userlist.txt.new" "$PGB/userlist.txt"
  chown postgres:postgres "$PGB/userlist.txt"
  chmod 640 "$PGB/userlist.txt"
  reload=1
  log "  userlist.txt: written ($(wc -l <"$PGB/userlist.txt") roles)"
fi
if [ "$reload" = 1 ]; then
  # A reload re-reads both files and keeps the clients connected.
  systemctl reload pgbouncer || systemctl restart pgbouncer
  log "  PgBouncer reloaded"
  sleep 2
else
  log "  unchanged; PgBouncer is not reloaded"
fi

log "7/7 checks"
fail=0
check() { # check NAME EXPECTED ACTUAL
  if [ "$3" = "$2" ]; then
    log "  ok   $1"
  else
    echo "[staging]   FAIL $1: expected '$2', got '$3'" >&2
    fail=1
  fi
}
check "$STAGING_ROLE logs in and has no power beyond its grants" t "$(q postgres "
  SELECT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
         AND NOT rolreplication AND NOT rolbypassrls
    FROM pg_roles WHERE rolname = '$STAGING_ROLE'")"
check "$STAGING_ROLE belongs to no other role" 0 "$(q postgres "
  SELECT count(*) FROM pg_auth_members
   WHERE member = (SELECT oid FROM pg_roles WHERE rolname = '$STAGING_ROLE')")"
check "$STAGING_ROLE may connect to $STAGING_DB" t "$(q postgres "SELECT has_database_privilege('$STAGING_ROLE', '$STAGING_DB', 'CONNECT')")"
check "$STAGING_ROLE may not connect to $DB" t "$(q postgres "SELECT NOT has_database_privilege('$STAGING_ROLE', '$DB', 'CONNECT')")"
check "roles other than the owner and $STAGING_ROLE that may connect to $STAGING_DB" "" "$(q postgres "
  SELECT coalesce(string_agg(rolname, ', ' ORDER BY rolname), '') FROM pg_roles
   WHERE rolcanlogin AND NOT rolsuper AND rolname NOT IN ('$BUILD_USER', '$STAGING_ROLE')
     AND has_database_privilege(oid, '$STAGING_DB', 'CONNECT')")"
check "tables in public $STAGING_ROLE cannot read" 0 "$(q "$STAGING_DB" "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
     AND NOT has_table_privilege('$STAGING_ROLE', c.oid, 'SELECT')")"
check "tables $STAGING_ROLE may write" 0 "$(q "$STAGING_DB" "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname NOT IN ('pg_catalog', 'information_schema') AND c.relkind IN ('r', 'p')
     AND has_table_privilege('$STAGING_ROLE', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE')")"
check "private schemas (accounts, family) $STAGING_ROLE may use" 0 "$(q "$STAGING_DB" "
  SELECT count(*) FROM pg_namespace
   WHERE nspname IN ('accounts', 'family') AND has_schema_privilege('$STAGING_ROLE', oid, 'USAGE')")"
# The copy carries no reader's rows, and nothing on staging writes them.
check "rows in the tables of accounts and family" 0 "$(q "$STAGING_DB" "
  SELECT coalesce(sum((xpath('/row/c/text()', query_to_xml(format('SELECT count(*) AS c FROM ONLY %I.%I', n.nspname, c.relname), false, true, '')))[1]::text::bigint), 0)
    FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname IN ('accounts', 'family') AND c.relkind = 'r'")"
check "$STAGING_LINE in pgbouncer.ini" 1 "$(grep -cxF "$STAGING_LINE" "$PGB/pgbouncer.ini")"
check "$STAGING_ROLE in PgBouncer's user list" 1 "$(grep -c "^\"$STAGING_ROLE\" " "$PGB/userlist.txt")"
q "$STAGING_DB" "SELECT '[staging]   surnames ' || count(*) FROM surnames"
q "$STAGING_DB" "SELECT '[staging]   size ' || pg_size_pretty(pg_database_size(current_database()))"
q "$DB" "SELECT '[staging]   production migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"

[ "$fail" = 0 ] || die "a check failed"
log "done. In Vercel (Preview, branch main): DATABASE_URL=postgresql://$STAGING_ROLE:<VM_DB_STAGING_WEB_PASSWORD>@<VM_HOST>:6432/$STAGING_DB?uselibpqcompat=true&sslmode=require"
