#!/usr/bin/env bash
# Reports the database VM's state (TASK-040): the register build, the database,
# PgBouncer and the machine. Read-only. Runs as root; prints no secret (the
# build's connection string has no password).
set -uo pipefail

UNIT=name-atlas-register-build
DB=name_atlas
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`), and
# `find` and others fail when they cannot return to it.
cd /

q() { runuser -u postgres -- psql -X -tA -d "$DB" -c "$1" 2>&1; }

echo "== build ($UNIT)"
if systemctl cat "$UNIT" >/dev/null 2>&1; then
  systemctl show -p ActiveState,SubState,Result,ExecMainStatus,NRestarts,ActiveEnterTimestamp,InactiveEnterTimestamp "$UNIT"
  echo "-- last 40 lines of its log"
  journalctl -u "$UNIT" -o short-iso --no-pager -n 40
else
  echo "not started"
fi
# The build is complete only when its marker exists: after a reboot the unit
# also reads inactive/success without having finished.
if [ -e /srv/name-atlas/.register-built ]; then echo "built: yes"; else echo "built: no"; fi
if [ -f /var/lib/name-atlas/register-finalized ]; then
  echo "finalized: $(head -c 40 /var/lib/name-atlas/register-finalized)"
else
  echo "finalized: no"
fi

echo
echo "== database"
if [ "$(q "SELECT to_regclass('public.surnames') IS NOT NULL")" = t ]; then
  q "SELECT 'size ' || pg_size_pretty(pg_database_size(current_database()))"
  q "SELECT 'surnames ' || count(*) FROM surnames"
  q "SELECT 'source records ' || count(*) FROM source_records"
  q "SELECT 'active claims ' || claim_type || ' ' || count(*) FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_type ORDER BY claim_type"
  q "SELECT 'migrations ' || count(*) || ', last ' || max(name) FROM kysely_migration"
else
  echo "no schema yet"
fi
q "SELECT 'connections ' || coalesce(usename, '(background)') || ' ' || count(*) FROM pg_stat_activity WHERE datname = '$DB' GROUP BY usename ORDER BY 1"

echo
echo "== services"
for s in postgresql@17-main pgbouncer; do echo "$s: $(systemctl is-active "$s")"; done
ss -ltn | awk 'NR == 1 || /:5432 |:6432 /'
echo "-- upgrades waiting (unattended-upgrades applies them nightly)"
apt list --upgradable 2>/dev/null | grep -E '^(pgbouncer|postgresql-17|postgresql-17-postgis-3)/' || echo "none"

echo
echo "== machine"
uptime
free -m
df -h / | tail -n 1
swapon --show
