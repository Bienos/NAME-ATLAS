# 2026-10-03 — TASK-087: a rank limit for the Register VM `archive` step

Scope authority: `tasks/087-archive-rank-limit.md`. Decision: ADR-0024 §2.6.

## What changed

- `.github/workflows/register-vm.yml`: a `top_rank` input on `workflow_dispatch` (optional, empty by default). The `archive` step strips whitespace, uses 2000 when it is empty, refuses anything but a whole number from 1 to 999999 before contacting the VM, and passes it to `archive.sh` as its second argument, which `archive.sh` (TASK-054) already took.
- `ops/vm/README.md`, `STATUS.md`, the task file.

## The sizes (from the 2026-01-20 male resource 1148808 and its female pair, ranked by count, distinct surnames on either list)

| Limit | Surnames | Beyond 2,000 | At 7.3 s each |
|---:|---:|---:|---:|
| 2,000 | 2,722 | — | — |
| 5,000 | 6,682 | 3,960 | about 8 h |
| 10,000 | 13,253 | 10,531 | about 21 h |
| 20,000 | 26,282 | 23,560 | about 48 h |

Production holds 2,723 `ARCHIVE_AVAILABILITY` claims for the 2,000 limit (`STATUS.md`); the one-surname difference was not investigated. A pass skips surnames searched within 90 days, so a higher limit searches only what it adds. The unit restarts after a failure and resumes; a pass longer than the workflow's 180-minute job is not a problem, because the step returns once the unit has started.

## Verification (run 2026-10-03 on this branch, `main` @ `1d620d2` underneath)

- The workflow file loads as YAML (`python3 yaml.safe_load`).
- The `archive` step's script, extracted from the YAML with its `git`, `scp` and `ssh` calls replaced by `echo`, run with `TOP_RANK` set to each case: `''` → `archive.sh … 2000`, exit 0; `10000` → `… 10000`, exit 0; `' 5000 '` → `… 5000`, exit 0; `0`, `12a`, `1000000` and `5000; rm -rf /` → the `::error::` line, exit 1.
- `pnpm check:vm`: "11 scripts parse, and all 4 pg_dump invocations exclude the rows of schemas accounts and family". `pnpm check:ids`, `pnpm format:check`: exit 0.

## Not verified

- The step has not run on the VM; no pass beyond 2,000 has run.
- Whether Polona answers 10,000 more surnames' queries without throttling: TASK-031 observed no rate limit over 184 paced requests, and the 2,000 pass ran without a skip.
