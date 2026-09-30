#!/usr/bin/env bash
# Checks the finished register and makes it ready to serve (TASK-042):
#
#   1. the gate: the counts, hashes and claim invariants of a complete build
#      (the checks TASK-035's load workflow made, plus the regional ones);
#   2. durability back on (the build ran with synchronous_commit = off);
#   3. read access for the web role on every table, then VACUUM ANALYZE;
#   4. shared_buffers filled (pg_prewarm), so the quiet VM keeps its memory in use;
#   5. a pg_dump of the database on the VM. A rebuild from source would give
#      the 854 suffixed slugs new suffixes (they derive from UUIDv7 ids), so
#      this dump, not a rebuild, is what keeps every page address stable.
#
# Runs as root. Refuses unless the build wrote its completion marker and is not
# running. Idempotent: a second run repeats the checks and replaces the dump.
# Its own marker and the dump live under the root-owned $STATE, never in the
# build user's home.
set -euo pipefail

UNIT=name-atlas-register-build
DB=name_atlas
WEB_ROLE=nameatlas_web
BUILT=/srv/name-atlas/.register-built
STATE=/var/lib/name-atlas
BACKUP_DIR=$STATE/backup
BUILD_CONF=/etc/postgresql/17/main/conf.d/20-build.conf

log() { echo "[finalize] $*"; }
die() { echo "[finalize] ERROR: $*" >&2; exit 1; }
q() { runuser -u postgres -- psql -X -tA -v ON_ERROR_STOP=1 -d "$DB" -c "$1"; }

[ "$(id -u)" = 0 ] || die "run as root"
# The SSH user's home, where `sudo` leaves the working directory, is not
# readable by the users these scripts run commands as (`runuser -u ...`), and
# `find` and others fail when they cannot return to it.
cd /
if [ -d /run/systemd/system ]; then
  state=$(systemctl show -p ActiveState --value "$UNIT")
  [ "$state" = inactive ] || [ "$state" = failed ] || die "the build is running (ActiveState=$state)"
  [ -e "$BUILT" ] || die "the build has not completed ($BUILT is missing); push build again to resume it"
fi

log "1/5 the gate"
fail=0
check() { # name expected actual
  if [ "$2" = "$3" ]; then echo "[finalize]   ok   $1 = $3"; else echo "[finalize]   FAIL $1 = $3, expected $2"; fail=1; fi
}
check surnames 598476 "$(q "SELECT count(*) FROM surnames")"
# The current resources' values only: earlier editions (TASK-045, editions.sh)
# add dated snapshots under their own source records and change nothing here.
values_of() { # national|regional, the four current resource ids
  q "SELECT count(*) FROM distribution_values v
       JOIN distribution_snapshots ds ON ds.distribution_snapshot_id = v.distribution_snapshot_id
       JOIN source_records sr ON sr.source_record_id = ds.source_record_id
      WHERE v.place_id IS $1 NULL AND sr.external_record_id IN ($2)"
}
check "national values (408,182 + 420,082)" 828264 "$(values_of "" "'1148808', '1148811'")"
check "regional values (646,052 + 694,553)" 1340605 "$(values_of "NOT" "'1148786', '1148790'")"
check "source records" 4 "$(q "SELECT count(*) FROM source_records")"
# The four official SHA-256s pinned in packages/sources/src/registry.ts, sorted.
check "source hashes" \
  "0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51,c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6,cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989,ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4" \
  "$(q "SELECT string_agg(content_hash, ',' ORDER BY content_hash) FROM source_records")"
check "ACTIVE claims sharing a claim_key" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_key HAVING count(*) > 1) d")"
check "surnames with more than two ACTIVE claims of one type" 0 \
  "$(q "SELECT count(*) FROM (SELECT 1 FROM claims WHERE claim_status = 'ACTIVE' GROUP BY subject_entity_id, claim_type HAVING count(*) > 2) d")"
# Surnames the import flagged as mixed-script (a Latin name with a Cyrillic
# confusable in it) are in the register but get no figures: the resolver
# answers REVIEW_REQUIRED for them and derive writes nothing (TASK-010,
# docs/canonical/13 §10.4). The gate names them and checks the rest.
q "SELECT '[finalize]   set aside, flagged mixed-script at import: ' || canonical_display ||
          CASE WHEN EXISTS (SELECT 1 FROM distribution_snapshots ds WHERE ds.surname_id = s.surname_id AND ds.geography_level = 'REGION')
               THEN ' (has regional rows)' ELSE '' END
     FROM surnames s WHERE s.entity_status = 'ACTIVE' AND s.mixed_script ORDER BY canonical_display"
check "surnames flagged mixed-script at import (2 + 1 rows in the four files)" 2 \
  "$(q "SELECT count(*) FROM surnames WHERE entity_status = 'ACTIVE' AND mixed_script")"
check "other surnames missing population, rank or rarity" 0 "$(q "
  SELECT count(*) FROM surnames s WHERE s.entity_status = 'ACTIVE' AND NOT s.mixed_script AND NOT (
    EXISTS (SELECT 1 FROM claims c WHERE c.subject_entity_id = s.surname_id AND c.claim_type = 'CURRENT_POPULATION' AND c.claim_status = 'ACTIVE')
    AND EXISTS (SELECT 1 FROM claims c WHERE c.subject_entity_id = s.surname_id AND c.claim_type = 'CURRENT_RANK' AND c.claim_status = 'ACTIVE')
    AND EXISTS (SELECT 1 FROM claims c WHERE c.subject_entity_id = s.surname_id AND c.claim_type = 'RARITY_CONTEXT' AND c.claim_status = 'ACTIVE'))")"
check "other surnames with regional data missing their distribution" 0 "$(q "
  SELECT count(*) FROM surnames s WHERE s.entity_status = 'ACTIVE' AND NOT s.mixed_script
    AND EXISTS (SELECT 1 FROM distribution_snapshots ds WHERE ds.surname_id = s.surname_id AND ds.geography_level = 'REGION')
    AND NOT EXISTS (SELECT 1 FROM claims c WHERE c.subject_entity_id = s.surname_id AND c.claim_type = 'CURRENT_DISTRIBUTION' AND c.claim_status = 'ACTIVE')")"
q "SELECT '[finalize]   active claims ' || claim_type || ' ' || count(*) FROM claims WHERE claim_status = 'ACTIVE' GROUP BY claim_type ORDER BY claim_type"
q "SELECT '[finalize]   database size ' || pg_size_pretty(pg_database_size(current_database()))"
[ "$fail" = 0 ] || die "the gate failed; nothing was changed"

log "2/5 durability back on"
if [ -f "$BUILD_CONF" ]; then
  rm -f "$BUILD_CONF"
  runuser -u postgres -- psql -X -q -c "SELECT pg_reload_conf()" >/dev/null
fi
log "  synchronous_commit = $(runuser -u postgres -- psql -X -tAc 'SHOW synchronous_commit')"

log "3/5 read access for $WEB_ROLE, then VACUUM ANALYZE"
q "GRANT SELECT ON ALL TABLES IN SCHEMA public TO $WEB_ROLE" >/dev/null
runuser -u postgres -- vacuumdb --analyze --jobs=2 --quiet -d "$DB"
check "tables $WEB_ROLE cannot read" 0 "$(q "
  SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relkind IN ('r', 'v', 'm', 'p')
     AND NOT has_table_privilege('$WEB_ROLE', c.oid, 'SELECT')")"
[ "$fail" = 0 ] || die "the web role cannot read every table"

log "4/5 fill shared_buffers (largest relations first; autoprewarm keeps them across restarts)"
q "SELECT '[finalize]   prewarmed ' || sum(pg_prewarm(c.oid)) || ' blocks'
     FROM (SELECT c.oid FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND c.relkind IN ('r', 'i')
            ORDER BY pg_relation_size(c.oid) DESC) c"

log "5/5 pg_dump to $BACKUP_DIR"
install -d -o root -g root -m 755 "$STATE"
install -d -o postgres -g postgres -m 700 "$BACKUP_DIR"
dump=$BACKUP_DIR/name_atlas-register-2026-01-20.dump
runuser -u postgres -- pg_dump --format=custom -d "$DB" -f "$dump.partial"
mv "$dump.partial" "$dump"
log "  $(du -h "$dump" | cut -f1) $dump"

date -u +%Y-%m-%dT%H:%M:%SZ >"$STATE/register-finalized"
log "done: the register is complete and ready to serve"
