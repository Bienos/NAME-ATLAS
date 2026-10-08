# 2026-10-08: the web role may insert couple first-name readings

The owner asked to take the couple first-names page (TASK-156, ADR-0047) live ("go live"). Built on `main` @ `5798578`.

## What changed

- `ops/vm/given-names.sh`: after the read grant, `GRANT INSERT ON given_name_readings TO nameatlas_web`, and a gate check that `has_table_privilege('nameatlas_web', 'given_name_readings', 'INSERT')` is true. Before this, migration 0047 and no VM script gave the web role any write on that table, so on production every requested reading would have failed when stored. Insert only: 0047's trigger already refuses `UPDATE` and `DELETE`.
- `STATUS.md`: the couple first-names line names the grant and the launch order.

## Verification

- `bash -n ops/vm/given-names.sh`: passed.
- `pnpm check:vm`: "16 scripts parse, and 6 dumps exclude private rows or stream them directly into age"; exit 0.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `shellcheck`: not installed in the session; not run.

## Not verified

- The script was not run against a database; the grant has not been applied anywhere.
- Read from Vercel (production) on 2026-10-08: neither `COUPLE_NAMES_ENABLED` nor `OPENAI_API_KEY` is set. Neither was set by this change.
- Still to do, in order: merge; the Register VM `given-names` step on `main` (applies 0047 and the grant); `OPENAI_API_KEY` and `COUPLE_NAMES_ENABLED=1` in Vercel production; the Release workflow (the owner's). Setting the flag before 0047 is applied would make the page query a table that does not exist.
