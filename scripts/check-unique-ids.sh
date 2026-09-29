#!/usr/bin/env bash
# Fails when two files or entries claim the same number: a task
# (tasks/NNN-*.md), an ADR (docs/adr/NNNN-*.md), a migration
# (packages/db/migrations/NNNN_*.ts) or a decision (a "## D-NNN — …" heading in
# docs/DECISIONS_NEEDED.md).
#
# Numbers must be taken from main (AGENTS.md §11). Branches that each took
# "the next number" on their own base made TASK-006, ADR-0003 and D-007 mean
# different things on different branches. On a pull request, CI checks out the
# merge with main, which is where such a collision first shows.
set -euo pipefail
cd "$(dirname "$0")/.."

status=0

report_duplicates() {
  local label="$1"
  shift
  local duplicates
  duplicates="$(printf '%s\n' "$@" | sort | uniq -d | tr '\n' ' ')"
  if [ -n "${duplicates// /}" ]; then
    echo "check-unique-ids: duplicate ${label} number(s): ${duplicates}"
    status=1
  fi
}

report_duplicates "task" $(ls tasks | sed -n 's/^\([0-9]\{3\}\)-.*\.md$/\1/p')
report_duplicates "ADR" $(ls docs/adr | sed -n 's/^\([0-9]\{4\}\)-.*\.md$/\1/p')
report_duplicates "migration" $(ls packages/db/migrations | sed -n 's/^\([0-9]\{4\}\)_.*\.ts$/\1/p')
# "## D-004 — …" opens a decision; "## D-004 (original record) — …" is that
# same decision's history, so only the first form counts.
report_duplicates "decision" $(sed -n 's/^## D-\([0-9]\{3\}\) —.*/\1/p' docs/DECISIONS_NEEDED.md)

if [ "$status" -eq 0 ]; then
  echo "check-unique-ids: every task, ADR, migration and decision number is used once"
fi
exit "$status"
