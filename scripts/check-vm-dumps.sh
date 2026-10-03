#!/usr/bin/env bash
# Holds the database VM's scripts to two rules (TASK-063, ADR-0027 §5.2):
#
#   1. every script in ops/vm parses (`bash -n`);
#   2. every `pg_dump` those scripts run excludes the rows of schemas `accounts`
#      and `family` (`--exclude-table-data='accounts.*'` and `'family.*'`; TASK-066,
#      ADR-0029): the data-load steps dump the whole database, and without the
#      flags each would copy readers' addresses, password hashes and the people
#      of their trees into a plain file on the VM, which an account's deletion
#      would not reach.
#
# `scripts/check-vm-dumps.sh [DIR]` checks DIR instead of ops/vm, which is how
# a test breaks a copy on purpose. It finds the dumps by their options, so a
# comment or a log line that merely names pg_dump is not one.
set -euo pipefail
cd "$(dirname "$0")/.."

dir=${1:-ops/vm}
status=0
dumps=0

shopt -s nullglob
scripts=("$dir"/*.sh)
[ "${#scripts[@]}" -gt 0 ] || { echo "check-vm-dumps: no scripts in $dir" >&2; exit 1; }

for f in "${scripts[@]}"; do
  if ! bash -n "$f"; then
    echo "check-vm-dumps: $f does not parse" >&2
    status=1
  fi
done

while IFS=: read -r file line text; do
  dumps=$((dumps + 1))
  for schema in accounts family; do
    if [[ "$text" != *"--exclude-table-data='$schema.*'"* ]]; then
      echo "check-vm-dumps: $file:$line runs pg_dump without --exclude-table-data='$schema.*'" >&2
      status=1
    fi
  done
done < <(grep -nE '(^|[[:space:]])pg_dump[[:space:]]+--' "${scripts[@]}" | grep -vE '^[^:]+:[0-9]+:[[:space:]]*#' || true)

# A check that finds nothing checks nothing: the four data-load scripts take a dump each.
if [ "$dumps" -lt 4 ] && [ "$dir" = ops/vm ]; then
  echo "check-vm-dumps: found $dumps pg_dump invocations in $dir, expected at least 4" >&2
  status=1
fi

if [ "$status" = 0 ]; then
  echo "check-vm-dumps: ${#scripts[@]} scripts parse, and all $dumps pg_dump invocations exclude the rows of schemas accounts and family"
fi
exit "$status"
