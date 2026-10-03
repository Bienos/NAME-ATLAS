#!/usr/bin/env bash
# Makes the production database ready for accounts (TASK-063, ADR-0027 §5.2)
# and can be run again at any time:
#
#   1. unpack the pushed commit into $APP (data/ and node_modules/ kept) and
#      pnpm install, as archive.sh does;
#   2. pnpm db:migrate, as the build user: migration 0027 creates schema
#      `accounts`, and any earlier migration that has not run comes with it;
#   3. the role: ops/vm/accounts-roles.sql as the superuser (the role
#      `nameatlas_app` and its grants on `accounts` and nothing else), then the
#      role's password, set only when it does not already work, so a re-run
#      does not change the SCRAM salt;
#   4. PgBouncer: the user list gets a line for each of the web role and the
#      accounts role, and PgBouncer is reloaded only if the file changed;
#   5. the checks: by the catalog, then by connecting as the role through the
#      pooler, that it writes `accounts` and nothing else, that the web role
#      reads nothing of it, and that neither can create anything.
#
# It runs as root: `sudo bash accounts.sh ABSOLUTE_PATH_TO_ARCHIVE
# ABSOLUTE_PATH_TO_ROLES_SQL <<<"$VM_DB_APP_PASSWORD"`. The password arrives on
# stdin, never in argv or the environment, as provision.sh's does. The roles
# file is the copy the workflow staged in the SSH user's own directory, not the
# one inside the unpacked tree, which the build user could change before the
# superuser runs it. It prints no secret.
#
# After it, the web app's ACCOUNTS_DATABASE_URL is
#   postgresql://nameatlas_app:<VM_DB_APP_PASSWORD>@<VM_HOST>:6432/name_atlas?uselibpqcompat=true&sslmode=require
# (the owner sets it in Vercel; ops/vm/README.md).
set -euo pipefail

DB=name_atlas
BUILD_USER=nameatlas
WEB_ROLE=nameatlas_web
APP_ROLE=nameatlas_app
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
POOLER_PORT=6432
PGB=/etc/pgbouncer
# Long-running units that use the unpacked tree: unpacking now would change the code under them.
UNITS=(name-atlas-register-build name-atlas-archive-load name-atlas-shift-batch name-atlas-bearers-load)
ARCHIVE=${1:-}
ROLES_SQL=${2:-}

log() { echo "[accounts] $*"; }
die() { echo "[accounts] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

build_env=(env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PATH=/usr/local/bin:/usr/bin:/bin
  DATABASE_URL="postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql")
as_build() {
  # shellcheck disable=SC2016 # $1 and $@ belong to the inner shell
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -c 'cd "$1" && shift && exec "$@"' _ "$APP" "$@"
}

[ "$(id -u)" = 0 ] || die "run as root"
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`).
cd /
[ -d /run/systemd/system ] || die "systemd is required"

# The accounts role's password arrives on stdin.
APP_PASSWORD=""
if [ ! -t 0 ]; then IFS= read -r APP_PASSWORD || true; fi
[ -n "$APP_PASSWORD" ] || die "the accounts role's password must arrive on stdin"
[[ "$APP_PASSWORD" =~ ^[A-Za-z0-9]{24,128}$ ]] ||
  die "the accounts role's password must be 24-128 letters and digits (it goes into a URL unescaped)"

case "$ARCHIVE" in /*) ;; *) die "usage: accounts.sh ABSOLUTE_PATH_TO_ARCHIVE ABSOLUTE_PATH_TO_ROLES_SQL" ;; esac
case "$ROLES_SQL" in /*) ;; *) die "usage: accounts.sh ABSOLUTE_PATH_TO_ARCHIVE ABSOLUTE_PATH_TO_ROLES_SQL" ;; esac
for f in "$ARCHIVE" "$ROLES_SQL"; do
  if [ ! -f "$f" ] || [ -L "$f" ] || [ ! -s "$f" ]; then die "$f must be a non-empty regular file"; fi
done

for unit in "${UNITS[@]}"; do
  state=$(systemctl show -p ActiveState --value "$unit" 2>/dev/null || true)
  case "$state" in
    active | activating | deactivating | reloading) die "$unit is running (ActiveState=$state); run this when it has finished" ;;
  esac
done
[ "$(q "SELECT to_regclass('public.kysely_migration') IS NOT NULL")" = t ] ||
  die "the database has not been built (no kysely_migration table); run build first"
[ -s "$PGB/pgbouncer.ini" ] && [ -s "$PGB/userlist.txt" ] ||
  die "PgBouncer is not set up ($PGB); run provision first"

log "1/5 unpack the pushed commit into $APP and pnpm install"
runuser -u "$BUILD_USER" -- mkdir -p "$APP"
runuser -u "$BUILD_USER" -- find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
runuser -u "$BUILD_USER" -- tar -C "$APP" -xzf - <"$ARCHIVE"
rm -f "$ARCHIVE"
as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5

log "2/5 pnpm db:migrate"
as_build pnpm db:migrate | tail -n 10
q "SELECT '[accounts]   migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"
[ "$(q "SELECT to_regclass('accounts.users') IS NOT NULL")" = t ] ||
  die "schema accounts has no users table after the migration"

log "3/5 the role $APP_ROLE: grants, then its password"
runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d "$DB" <"$ROLES_SQL"
# Setting a password makes a new SCRAM secret (a new salt), which would rewrite
# PgBouncer's auth file and reload it. So it is set only when it does not
# already work. It is expanded into the heredoc (stdin), never passed in argv;
# it is letters and digits only, checked above, so it needs no quoting.
if PGPASSWORD="$APP_PASSWORD" PGCONNECT_TIMEOUT=5 psql -X -h 127.0.0.1 -p 5432 -U "$APP_ROLE" -d "$DB" \
  -tAc 'SELECT 1' >/dev/null 2>&1; then
  log "  $APP_ROLE's password is already set"
else
  runuser -u postgres -- psql -X -q -v ON_ERROR_STOP=1 -d postgres <<SQL
ALTER ROLE $APP_ROLE PASSWORD '$APP_PASSWORD';
SQL
  log "  $APP_ROLE's password set"
fi

log "4/5 PgBouncer's user list"
# One line for each role that has a SCRAM secret, the web role first: the same
# text provision.sh writes, so a later provision finds nothing to change.
# PgBouncer logs in to PostgreSQL with the client's own secret, so each must be
# byte-identical to pg_authid's.
umask 077
: >"$PGB/userlist.txt.new"
for role in "$WEB_ROLE" "$APP_ROLE"; do
  secret=$(runuser -u postgres -- psql -X -tAc "SELECT rolpassword FROM pg_authid WHERE rolname = '$role'")
  if [[ "$secret" == SCRAM-SHA-256\$* ]]; then
    printf '"%s" "%s"\n' "$role" "$secret" >>"$PGB/userlist.txt.new"
  else
    rm -f "$PGB/userlist.txt.new"
    die "$role has no SCRAM secret"
  fi
done
umask 022
if cmp -s "$PGB/userlist.txt.new" "$PGB/userlist.txt"; then
  rm -f "$PGB/userlist.txt.new"
  log "  unchanged; PgBouncer is not reloaded"
else
  mv "$PGB/userlist.txt.new" "$PGB/userlist.txt"
  chown postgres:postgres "$PGB/userlist.txt"
  chmod 640 "$PGB/userlist.txt"
  # A reload re-reads the auth file and keeps the clients connected.
  systemctl reload pgbouncer || systemctl restart pgbouncer
  log "  written ($(wc -l <"$PGB/userlist.txt") roles); PgBouncer reloaded"
  sleep 2
fi

log "5/5 what the role may and may not do"
fail=0
check() { # check NAME EXPECTED ACTUAL
  if [ "$3" = "$2" ]; then
    log "  ok   $1"
  else
    echo "[accounts]   FAIL $1: expected '$2', got '$3'" >&2
    fail=1
  fi
}
priv_any="SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER"
check "$APP_ROLE logs in and has no power beyond its grants" t "$(q "
  SELECT rolcanlogin AND NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole
         AND NOT rolreplication AND NOT rolbypassrls
    FROM pg_roles WHERE rolname = '$APP_ROLE'")"
check "$APP_ROLE belongs to no other role" 0 "$(q "
  SELECT count(*) FROM pg_auth_members
   WHERE member = (SELECT oid FROM pg_roles WHERE rolname = '$APP_ROLE')")"
# At least the four of migration 0027: a later migration may add tables to the schema.
check "schema accounts has the tables of migration 0027" t "$(q "
  SELECT count(*) >= 4 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'accounts' AND c.relkind IN ('r', 'p')")"
check "accounts tables $APP_ROLE cannot read and write" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'accounts' AND c.relkind IN ('r', 'p')
     AND NOT (has_table_privilege('$APP_ROLE', c.oid, 'SELECT') AND has_table_privilege('$APP_ROLE', c.oid, 'INSERT')
          AND has_table_privilege('$APP_ROLE', c.oid, 'UPDATE') AND has_table_privilege('$APP_ROLE', c.oid, 'DELETE'))")"
check "accounts tables $APP_ROLE may truncate, reference or put a trigger on" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'accounts' AND c.relkind IN ('r', 'p')
     AND (has_table_privilege('$APP_ROLE', c.oid, 'TRUNCATE') OR has_table_privilege('$APP_ROLE', c.oid, 'REFERENCES')
          OR has_table_privilege('$APP_ROLE', c.oid, 'TRIGGER'))")"
check "$APP_ROLE uses schema accounts and cannot create in it" "true|false" "$(q "
  SELECT has_schema_privilege('$APP_ROLE', 'accounts', 'USAGE') || '|' || has_schema_privilege('$APP_ROLE', 'accounts', 'CREATE')")"
check "$APP_ROLE cannot create in public" f "$(q "SELECT has_schema_privilege('$APP_ROLE', 'public', 'CREATE')")"
# PostGIS grants SELECT on its own catalog (spatial_ref_sys, geometry_columns,
# geography_columns) to everyone. That is not a table of the register and not the
# role's doing, so a privilege counts only where PUBLIC does not already hold it.
check "relations in public $APP_ROLE holds a privilege on that PUBLIC does not" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
     AND EXISTS (SELECT 1 FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) p
                  WHERE has_table_privilege('$APP_ROLE', c.oid, p)
                    AND NOT EXISTS (SELECT 1 FROM aclexplode(c.relacl) a WHERE a.grantee = 0 AND a.privilege_type = p))")"
everyone=$(q "
  SELECT coalesce(string_agg(c.relname, ', ' ORDER BY c.relname), '') FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p', 'f')
     AND EXISTS (SELECT 1 FROM aclexplode(c.relacl) a WHERE a.grantee = 0)")
[ -z "$everyone" ] || log "  note: readable by everyone, as PostGIS ships them: $everyone"
check "$WEB_ROLE has no use of schema accounts" f "$(q "SELECT has_schema_privilege('$WEB_ROLE', 'accounts', 'USAGE')")"
check "accounts tables $WEB_ROLE has any privilege on" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'accounts' AND c.relkind IN ('r', 'p')
     AND has_table_privilege('$WEB_ROLE', c.oid, '$priv_any')")"
check "grants to PUBLIC on schema accounts" 0 "$(q "
  SELECT count(*) FROM aclexplode((SELECT nspacl FROM pg_namespace WHERE nspname = 'accounts')) a WHERE a.grantee = 0")"
check "foreign keys from private schemas to the register" 0 "$(q "
  SELECT count(*) FROM pg_constraint k
    JOIN pg_class r ON r.oid = k.conrelid JOIN pg_class f ON f.oid = k.confrelid
    JOIN pg_namespace rn ON rn.oid = r.relnamespace JOIN pg_namespace fn ON fn.oid = f.relnamespace
   WHERE k.contype = 'f'
     AND ((rn.nspname IN ('accounts', 'family')) <> (fn.nspname IN ('accounts', 'family')))")"

# Now as the app connects: TLS, SCRAM, through PgBouncer on its own port.
conn="host=127.0.0.1 port=$POOLER_PORT dbname=$DB user=$APP_ROLE sslmode=require connect_timeout=10"
errors=$(mktemp)
trap 'rm -f "$errors"' EXIT
as_app() { PGPASSWORD="$APP_PASSWORD" psql "$conn" -X -v ON_ERROR_STOP=1 -tA "$@" 2>"$errors"; }
if login=$(as_app -c "SELECT current_user || '|' || current_setting('statement_timeout')"); then
  check "through PgBouncer: the role, and its statement timeout" "$APP_ROLE|10s" "$login"
else
  echo "[accounts]   FAIL through PgBouncer: $APP_ROLE cannot log in: $(head -n 1 "$errors")" >&2
  fail=1
fi
if users=$(as_app -c "SELECT count(*) FROM accounts.users"); then
  log "  ok   through PgBouncer: accounts.users is readable ($users users)"
else
  echo "[accounts]   FAIL through PgBouncer: accounts.users is not readable: $(head -n 1 "$errors")" >&2
  fail=1
fi
if as_app -c "BEGIN; INSERT INTO accounts.sign_in_failures (email_hash, failed_at)
     VALUES (decode(repeat('00', 32), 'hex'), now());
   DELETE FROM accounts.sign_in_failures WHERE email_hash = decode(repeat('00', 32), 'hex'); ROLLBACK" >/dev/null; then
  log "  ok   through PgBouncer: a write to accounts works (rolled back)"
else
  echo "[accounts]   FAIL through PgBouncer: a write to accounts failed: $(head -n 1 "$errors")" >&2
  fail=1
fi
# The probes that create something run inside a transaction that is rolled back,
# so a role that is wrongly allowed to create leaves nothing behind.
refused() { # refused NAME SQL: it must fail, and for lack of permission
  if as_app -c "$2" >/dev/null; then
    echo "[accounts]   FAIL through PgBouncer: $1 was allowed" >&2
    fail=1
  elif grep -q 'permission denied' "$errors"; then
    log "  ok   through PgBouncer: $1 is refused ($(head -n 1 "$errors"))"
  else
    echo "[accounts]   FAIL through PgBouncer: $1 failed, but not for permission: $(head -n 1 "$errors")" >&2
    fail=1
  fi
}
refused "reading a register table" "SELECT 1 FROM public.kysely_migration LIMIT 1"
refused "creating a table in public" "BEGIN; CREATE TABLE public.accounts_role_must_not_create (x int); ROLLBACK"
refused "creating a table in accounts" "BEGIN; CREATE TABLE accounts.accounts_role_must_not_create (x int); ROLLBACK"

[ "$fail" = 0 ] || die "a check failed; accounts are not ready on this VM"
log "done. In Vercel (Production): ACCOUNTS_DATABASE_URL=postgresql://$APP_ROLE:<VM_DB_APP_PASSWORD>@<VM_HOST>:$POOLER_PORT/$DB?uselibpqcompat=true&sslmode=require"
