#!/usr/bin/env bash
# Derives every surname's change over time on the database VM (TASK-051,
# ADR-0020): the migration that adds the claim type, then the batch that writes
# one SURNAME_DISTRIBUTION_SHIFT claim per surname and list, then a gate.
#
#   sudo bash shift.sh start ABSOLUTE_PATH_TO_ARCHIVE
#       1. unpack the pushed commit into $APP (data/ and node_modules/ kept),
#          pnpm install, as build.sh does;
#       2. record, once, what the gate must find unchanged: the surnames and
#          every ACTIVE claim count of another type;
#       3. migrate (0024 adds one enum value and one check), as the build user;
#       4. start the batch in the unit name-atlas-shift-batch and return.
#
#   sudo bash shift.sh finish
#       the gate, read access for the web role, VACUUM ANALYZE and a dump.
#       Refuses while the batch is running or has not completed.
#
# Two steps because the batch takes hours, more than one SSH session or workflow
# job may last, so it runs detached in a systemd unit, like the register build.
# It is resumable: the batch asks the claims table which surnames still need a
# claim, so a failure restarts it and it continues, and a second `start` after a
# new edition is loaded extends the claims (a new claim key supersedes the old
# claim). It is enabled, so a reboot resumes it, and the completion marker keeps
# it from starting again once it has finished.
#
# The rollout order (ADR-0020 §2.10) is this script, then the web deploy. The
# pages read the claim with a text comparison, so a deploy before the migration
# shows no change chapter rather than an error, but nothing is shown until the
# batch has run.
#
# Runs after finalize.sh and editions.sh (their markers are required).
set -euo pipefail

UNIT=name-atlas-shift-batch
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILD_USER=nameatlas
OPS_HOME=/srv/name-atlas
APP=$OPS_HOME/app
STATE=/var/lib/name-atlas
FINALIZED=$STATE/register-finalized
EDITIONS_LOADED=$STATE/editions-loaded
BEFORE=$STATE/shift-before
DONE=$STATE/shift-derived
BATCH_DONE=$OPS_HOME/.shift-batch-complete
BACKUP_DIR=$STATE/backup
REGISTER_UNIT=name-atlas-register-build
MODE=${1:-}
ARCHIVE=${2:-}

log() { echo "[shift] $*"; }
die() { echo "[shift] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

build_env=(env HOME="$OPS_HOME" COREPACK_ENABLE_DOWNLOAD_PROMPT=0 PATH=/usr/local/bin:/usr/bin:/bin
  DATABASE_URL="postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql")
as_build() {
  # shellcheck disable=SC2016 # $1 and $@ belong to the inner shell
  runuser -u "$BUILD_USER" -- "${build_env[@]}" bash -c 'cd "$1" && shift && exec "$@"' _ "$APP" "$@"
}

# Every ACTIVE claim count except this task's own, and the surnames: what the batch must not touch.
other_claims() {
  q "SELECT coalesce(string_agg(claim_type || '=' || n, ',' ORDER BY claim_type), '')
       FROM (SELECT claim_type::text AS claim_type, count(*) AS n FROM claims
              WHERE claim_status = 'ACTIVE' AND claim_type::text <> 'SURNAME_DISTRIBUTION_SHIFT'
              GROUP BY 1) c"
}

[ "$(id -u)" = 0 ] || die "run as root"
export LC_ALL=C.UTF-8
cd /
[ -d /run/systemd/system ] || die "systemd is required"
[ -f "$FINALIZED" ] || die "finalize has not run ($FINALIZED is missing)"
[ -f "$EDITIONS_LOADED" ] || die "editions has not run ($EDITIONS_LOADED is missing); there is nothing to compare"
reg_state=$(systemctl show -p ActiveState --value "$REGISTER_UNIT")
[ "$reg_state" = inactive ] || [ "$reg_state" = failed ] || die "the register build is running (ActiveState=$reg_state)"

case "$MODE" in
start)
  case "$ARCHIVE" in /*) ;; *) die "usage: shift.sh start ABSOLUTE_PATH_TO_ARCHIVE" ;; esac
  if [ ! -f "$ARCHIVE" ] || [ -L "$ARCHIVE" ] || [ ! -s "$ARCHIVE" ]; then
    die "$ARCHIVE must be a non-empty regular file"
  fi
  state=$(systemctl show -p ActiveState --value "$UNIT" 2>/dev/null || true)
  if [ "$state" = active ] || [ "$state" = activating ]; then
    log "already running ($state); nothing started. status.sh shows its progress."
    exit 0
  fi

  log "1/4 unpack the pushed commit into $APP and pnpm install (the register is left alone)"
  runuser -u "$BUILD_USER" -- mkdir -p "$APP"
  runuser -u "$BUILD_USER" -- find "$APP" -mindepth 1 -maxdepth 1 ! -name data ! -name node_modules -exec rm -rf {} +
  runuser -u "$BUILD_USER" -- tar -C "$APP" -xzf - <"$ARCHIVE"
  rm -f "$ARCHIVE"
  as_build pnpm install --frozen-lockfile --reporter=append-only | tail -n 5

  log "2/4 record what the gate must find unchanged (kept across a resumed run)"
  if [ ! -f "$BEFORE" ]; then
    printf '%s\n%s\n' "$(q "SELECT count(*) FROM surnames")" "$(other_claims)" >"$BEFORE"
  fi
  log "  surnames $(sed -n 1p "$BEFORE"); other ACTIVE claims $(sed -n 2p "$BEFORE")"

  log "3/4 migrate"
  as_build pnpm db:migrate 2>&1 | tail -n 5

  log "4/4 start $UNIT"
  # A deliberate start offers every surname again through the resumable query.
  runuser -u "$BUILD_USER" -- rm -f "$BATCH_DONE"
  rm -f "$DONE"
  cat >/etc/systemd/system/$UNIT.service <<UNITFILE
# Written by ops/vm/shift.sh (TASK-051). Do not edit by hand.
[Unit]
Description=Name Atlas: derive every surname's change over time
After=postgresql@17-main.service
# A failure restarts the batch, which resumes. Eight failures within 12 hours
# stop it, so a failure that repeats cannot loop forever. Once it has completed
# the marker keeps it from starting again, at boot or otherwise.
StartLimitIntervalSec=12h
StartLimitBurst=8
ConditionPathExists=!$BATCH_DONE

[Service]
Type=exec
User=$BUILD_USER
Group=$BUILD_USER
WorkingDirectory=$APP
Environment=HOME=$OPS_HOME
Environment=PATH=/usr/local/bin:/usr/bin:/bin
Environment=COREPACK_ENABLE_DOWNLOAD_PROMPT=0
Environment=DATABASE_URL=postgresql://$BUILD_USER@/$DB?host=/var/run/postgresql
# The batch is resumable, so a crash that loses the last few commits loses
# nothing the next run does not derive again; the gate proves it.
Environment="PGOPTIONS=-c synchronous_commit=off"
ExecStart=/bin/bash -c 'pnpm truth:derive-shift --concurrency 6 && touch $BATCH_DONE'
Restart=on-failure
RestartSec=120
Nice=5

[Install]
WantedBy=multi-user.target
UNITFILE
  systemctl daemon-reload
  systemctl enable --quiet "$UNIT"
  systemctl reset-failed "$UNIT" 2>/dev/null || true
  systemctl start --no-block "$UNIT"
  sleep 20
  systemctl show -p ActiveState,SubState,MainPID "$UNIT" | sed 's/^/[shift]   /'
  journalctl -u "$UNIT" -o cat --no-pager -n 20 | sed 's/^/[shift]   /'
  log "started. About 830,000 claims: expect hours. status.sh reports it; then run: shift.sh finish"
  ;;

finish)
  [ -f "$BEFORE" ] || die "$BEFORE is missing: run 'shift.sh start' first"
  state=$(systemctl show -p ActiveState --value "$UNIT" 2>/dev/null || true)
  case "$state" in
  active | activating) die "the batch is still running ($state); run finish when status.sh says it has completed" ;;
  esac
  [ -f "$BATCH_DONE" ] || die "the batch has not completed ($BATCH_DONE is missing); status.sh shows why"

  log "1/3 the gate"
  fail=0
  check() { # name expected actual
    if [ "$2" = "$3" ]; then echo "[shift]   ok   $1 = $3"; else echo "[shift]   FAIL $1 = $3, expected $2"; fail=1; fi
  }
  shift_claims="claim_type::text = 'SURNAME_DISTRIBUTION_SHIFT' AND claim_status = 'ACTIVE'"
  check "surnames unchanged" "$(sed -n 1p "$BEFORE")" "$(q "SELECT count(*) FROM surnames")"
  check "other ACTIVE claims unchanged" "$(sed -n 2p "$BEFORE")" "$(other_claims)"
  check "surnames with more than one ACTIVE change claim on one list" 0 \
    "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE $shift_claims
           GROUP BY subject_entity_id, structured_value->>'role' HAVING count(*) > 1) d")"
  check "ACTIVE change claims with fewer than two known points" 0 \
    "$(q "SELECT count(*) FROM claims c WHERE $shift_claims AND
           (SELECT count(*) FROM jsonb_array_elements(c.structured_value->'points') p
             WHERE p->>'status' = 'KNOWN') < 2")"
  for t in citations confidence_assessments claim_evidence; do
    check "ACTIVE change claims without a row in $t" 0 \
      "$(q "SELECT count(*) FROM claims c WHERE $shift_claims
             AND NOT EXISTS (SELECT 1 FROM $t x WHERE x.claim_id = c.claim_id)")"
  done
  check "change claims whose scope is not SURNAME_LEVEL" 0 \
    "$(q "SELECT count(*) FROM claims WHERE claim_type::text = 'SURNAME_DISTRIBUTION_SHIFT' AND scope <> 'SURNAME_LEVEL'")"
  # Complete: a second run, asked of the claims table, finds no surname without an up-to-date claim.
  again=$(as_build pnpm truth:derive-shift --concurrency 6 | grep -E '^\[shift\] finished' || true)
  echo "[shift]   $again"
  case "$again" in
  *"finished 0 surnames"*) echo "[shift]   ok   a second run finds every candidate derived" ;;
  *) echo "[shift]   FAIL a second run still found surnames to derive"; fail=1 ;;
  esac
  q "SELECT '[shift]   change claims: ' || count(*) || ' ACTIVE, ' ||
            (SELECT count(*) FROM claims WHERE claim_type::text = 'SURNAME_DISTRIBUTION_SHIFT'
                                          AND claim_status = 'SUPERSEDED') || ' superseded'
       FROM claims WHERE $shift_claims"
  q "SELECT '[shift]   database size ' || pg_size_pretty(pg_database_size(current_database()))"
  [ "$fail" = 0 ] || die "the gate failed; grants, statistics and the dump were not touched"

  log "2/3 read access for $WEB_ROLE, VACUUM ANALYZE"
  q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
  runuser -u postgres -- vacuumdb --analyze --jobs=2 --quiet -d "$DB"
  check "tables $WEB_ROLE cannot read" 0 "$(q "
    SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
       AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
  [ "$fail" = 0 ] || die "the web role cannot read every table"

  log "3/3 a dump beside the others"
  install -d -o postgres -g postgres -m 700 "$BACKUP_DIR"
  dump=$BACKUP_DIR/name_atlas-register-2026-01-20-change.dump
  # The definitions of schemas accounts and family go in, their rows never do (TASK-063, ADR-0027 §5.2;
  # ADR-0029): a restore leaves them empty and consistent with the migrations table, and no address,
  # password hash or person of a tree is copied into a file here. scripts/check-vm-dumps.sh holds every dump to it.
  runuser -u postgres -- pg_dump --format=custom --exclude-table-data='accounts.*' --exclude-table-data='family.*' -d "$DB" -f "$dump.partial"
  mv "$dump.partial" "$dump"
  log "  $(du -h "$dump" | cut -f1) $dump"

  rm -f "$BEFORE"
  date -u +%Y-%m-%dT%H:%M:%SZ >"$DONE"
  log "done: every surname's change over time is derived; deploy the web app to show it"
  ;;

*) die "usage: shift.sh start ABSOLUTE_PATH_TO_ARCHIVE | shift.sh finish" ;;
esac
