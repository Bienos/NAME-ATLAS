#!/usr/bin/env bash
# Checks production's database server against TASK-041's acceptance criteria.
#
#   bash scripts/production/check-db.sh remote <host>   # from anywhere; needs no secret
#   sudo bash scripts/production/check-db.sh local      # on the VM
#   sudo bash scripts/production/check-db.sh stats      # on the VM, after the build
#
# `remote` proves what the internet sees: the certificate verifies for <host>,
# a connection without TLS is refused, a wrong password is refused, and
# PostgreSQL's own port is closed. `local` proves the rest with the real
# credentials. Each check prints PASS or FAIL; the exit status is 1 if any
# failed. Neither mode prints a password.
#
# CA_FILE=<path> replaces the system's trusted CAs, for a rehearsal whose
# certificate is self-signed.
set -uo pipefail

MODE="${1:-}"
PGB_PORT=6432
DB_NAME=name_atlas
CREDS=/root/name-atlas-credentials
FAILED=0

pass() { echo "PASS  $*"; }
fail() { echo "FAIL  $*"; FAILED=1; }
root_ca="${CA_FILE:-system}"

# expect_refused LABEL PATTERN CONNINFO — the connection must fail, with PATTERN in the error.
expect_refused() {
  local label=$1 pattern=$2 conninfo=$3 out
  if out=$(PGCONNECT_TIMEOUT=10 psql "$conninfo" -XAtc 'SELECT 1' 2>&1); then
    fail "$label: the connection was accepted"
  elif grep -qiE "$pattern" <<<"$out"; then
    pass "$label ($(head -1 <<<"$out" | sed 's/^psql: //' | cut -c1-110))"
  else
    fail "$label: refused, but not for the expected reason: $(head -1 <<<"$out")"
  fi
}

case "$MODE" in
  remote)
    host="${2:?usage: check-db.sh remote <host>}"
    ca_opt=()
    [[ -n "${CA_FILE:-}" ]] && ca_opt=(-CAfile "$CA_FILE")
    tls=$(openssl s_client -starttls postgres -connect "$host:$PGB_PORT" -servername "$host" \
      -verify_hostname "$host" -verify_return_error "${ca_opt[@]}" </dev/null 2>&1)
    if grep -q 'Verify return code: 0 (ok)' <<<"$tls"; then
      pass "AC-03 the certificate verifies for $host ($(grep -m1 -o 'Protocol *: *TLSv[0-9.]*' <<<"$tls" | tr -s ' '))"
    else
      fail "AC-03 the certificate does not verify for $host: $(grep -m1 -E 'Verify return code|error' <<<"$tls")"
    fi
    expect_refused "AC-03 a connection without TLS is refused" "SSL" \
      "host=$host port=$PGB_PORT dbname=$DB_NAME user=atlas_web password=not-the-password sslmode=disable"
    expect_refused "AC-03 a wrong password is refused" "password|SASL|authentication" \
      "host=$host port=$PGB_PORT dbname=$DB_NAME user=atlas_web password=not-the-password sslmode=verify-full sslrootcert=$root_ca"
    if timeout 5 bash -c "exec 3<>/dev/tcp/$host/5432" 2>/dev/null; then
      fail "PostgreSQL's own port 5432 is reachable from here"
    else
      pass "PostgreSQL's own port 5432 is not reachable from here"
    fi
    ;;

  local)
    [[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 2; }
    # shellcheck source=/dev/null
    . "$CREDS"
    host=$(sed -E 's#^postgres://[^@]*@([^:/]+).*#\1#' <<<"$WEB_DATABASE_URL")
    # host= is what the certificate is checked against; hostaddr= is where the
    # connection goes, so the check runs on the VM without leaving it.
    web="host=$host hostaddr=127.0.0.1 port=$PGB_PORT dbname=$DB_NAME user=atlas_web sslmode=verify-full sslrootcert=$root_ca"
    web_sql() { PGPASSWORD="$WEB_PASSWORD" PGCONNECT_TIMEOUT=10 psql "$web" -v ON_ERROR_STOP=1 -XAtc "$1" 2>&1; }
    su_sql() { runuser -u postgres -- psql -d "$DB_NAME" -XAtc "$1" 2>&1; }

    if out=$(web_sql "SELECT current_setting('server_version') || ' / PostGIS ' || postgis_lib_version()"); then
      pass "AC-02/AC-03 the web role connects through PgBouncer with verify-full: PostgreSQL $out"
    else
      fail "AC-03 the web role cannot connect: $out"
    fi
    if [[ "$(su_sql "SELECT count(*) FROM pg_extension WHERE extname IN ('postgis', 'pg_trgm')")" == 2 ]]; then
      pass "AC-02 postgis and pg_trgm are installed"
    else
      fail "AC-02 postgis or pg_trgm is missing"
    fi
    data_dir=$(su_sql "SHOW data_directory")
    if [[ "$data_dir" == /srv/pgdata/* ]]; then
      pass "AC-02 the data directory is on the data volume ($data_dir)"
    else
      fail "AC-02 the data directory is not on the data volume ($data_dir)"
    fi

    has_surnames=$(su_sql "SELECT to_regclass('public.surnames') IS NOT NULL")
    if [[ "$has_surnames" == t ]]; then
      if out=$(web_sql "SELECT count(*) FROM surnames"); then
        pass "AC-04 the web role can read ($out surnames)"
      else
        fail "AC-04 the web role cannot read: $out"
      fi
      for statement in \
        "INSERT INTO surnames DEFAULT VALUES" \
        "UPDATE surnames SET canonical_key = canonical_key WHERE false" \
        "DELETE FROM surnames WHERE false" \
        "DROP TABLE surnames"; do
        if out=$(web_sql "$statement"); then
          fail "AC-04 the web role was allowed: $statement"
        else
          pass "AC-04 refused to the web role: ${statement%% *} ($(head -1 <<<"$out" | cut -c1-80))"
        fi
      done
    else
      echo "SKIP  AC-04 reads and writes: the schema is not migrated yet"
    fi
    if out=$(web_sql "CREATE TABLE check_db_probe (id int)"); then
      fail "AC-04 the web role was allowed: CREATE TABLE"
      su_sql "DROP TABLE IF EXISTS check_db_probe" >/dev/null
    else
      pass "AC-04 refused to the web role: CREATE ($(head -1 <<<"$out" | cut -c1-80))"
    fi
    owner_pgb="host=$host hostaddr=127.0.0.1 port=$PGB_PORT dbname=$DB_NAME user=atlas_owner password=$OWNER_PASSWORD sslmode=verify-full sslrootcert=$root_ca"
    if PGCONNECT_TIMEOUT=10 psql "$owner_pgb" -XAtc 'SELECT 1' >/dev/null 2>&1; then
      fail "the owner role can log in through PgBouncer"
    else
      pass "the owner role cannot log in through PgBouncer, only on the VM itself"
    fi

    public_pg=$(ss -ltnH '( sport = :5432 )' | awk '{print $4}' | grep -vE '^(127\.0\.0\.1|\[::1\]):5432$' || true)
    if [[ -z "$public_pg" ]]; then
      pass "PostgreSQL listens on localhost only"
    else
      fail "PostgreSQL listens on: $public_pg"
    fi
    logging=$(su_sql "SELECT current_setting('log_statement') || ',' || current_setting('log_min_duration_statement') || ',' || current_setting('log_min_error_statement')")
    if [[ "$logging" == "none,-1,panic" ]]; then
      pass "no statement is logged, so no searched surname is (log_statement=none)"
    else
      fail "statement logging is on: $logging"
    fi
    if grep -q -- "--dport $PGB_PORT" /etc/iptables/rules.v4 2>/dev/null; then
      pass "AC-08 the firewall rule for $PGB_PORT is persisted"
    else
      fail "AC-08 no persisted firewall rule for $PGB_PORT in /etc/iptables/rules.v4"
    fi
    if apt-config dump | grep -q 'APT::Periodic::Unattended-Upgrade "1"'; then
      pass "AC-08 unattended security upgrades are on"
    else
      fail "AC-08 unattended security upgrades are off"
    fi
    ;;

  stats)
    [[ $EUID -eq 0 ]] || { echo "run as root" >&2; exit 2; }
    runuser -u postgres -- psql -d "$DB_NAME" -X <<'SQL'
\pset footer off
SELECT pg_size_pretty(pg_database_size(current_database())) AS database_size;
SELECT (SELECT count(*) FROM surnames) AS surnames,
       (SELECT count(*) FROM source_records) AS source_records,
       (SELECT count(*) FROM distribution_values) AS distribution_values;
SELECT claim_type, count(*) AS active_claims
  FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_type ORDER BY claim_type;
SQL
    exit 0
    ;;

  *)
    echo "usage: check-db.sh remote <host> | local | stats" >&2
    exit 2
    ;;
esac

exit "$FAILED"
