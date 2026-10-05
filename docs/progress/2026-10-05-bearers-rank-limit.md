# 2026-10-05 — TASK-125: a rank limit for the `bearers` step

## Changed

- `.github/workflows/register-vm.yml`: the `bearers` step reads the existing `top_rank` input, validated as the `archive` step does (whitespace dropped; empty is 2000; otherwise `^[1-9][0-9]{0,5}$` or the step fails before it reaches the VM), prints `::notice::bearers rank limit: N` and runs `bearers.sh ~/name-atlas-ops/app.tar.gz N`. Before, it ran `bearers.sh` with one argument, so every pass used 2,000. The header comment and the input's description say the input applies to `bearers` too.
- `ops/vm/README.md`: the `bearers.sh` row and step 9 name the input; step 9 says a higher limit queries only the surnames it adds when started within 30 days of the last pass, and that the step has no restart input.
- `tasks/125-bearers-rank-limit.md`, `STATUS.md`.
- No change to `ops/vm/bearers.sh` (it already takes `TOP_RANK` as its second argument, default 2000), the loader or the claim.

## Does a higher limit re-query loaded surnames?

Read on `main` @ `93db9a1`, not run against a database: `selectBearersCandidates` leaves out every surname with an `ACTIVE` `wikidata-bearers:<surname_id>` source record retrieved within `BEARERS_REFRESH_DAYS` = 30 days, and `storeWikidataBearers` writes or refreshes that record for every surname queried, with or without bearers. So a pass with a higher limit queries only the surnames it adds, as `archive` does, **as long as it starts within 30 days of the earlier queries**. The 2,723 loaded in production were queried by 15:05 UTC on 2026-10-04; a pass started after about 2026-11-03 queries them again too (ADR-0030 §2.6, not changed here). Polona's window is 90 days.

## Verification

- `pnpm check:vm`: exit 0, "check-vm-dumps: 14 scripts parse, and 6 dumps exclude private rows or stream them directly into age".
- `pnpm check:ids`: exit 0, "check-unique-ids: every task, ADR, migration and decision number is used once".
- `pnpm format:check` (Prettier, which covers the workflow's YAML): exit 0, "All matched files use Prettier code style!".
- `actionlint` 1.7.7 on `.github/workflows/register-vm.yml` (not part of CI; installed in the session, without `shellcheck`, so the `run:` scripts were not shellchecked): exit 0, no findings; also exit 0 on `origin/main`'s file.
- **AC-1, the step's own script:** the workflow parsed with the `yaml` package, the `bearers` step's `run:` written to a file and run under `bash` with `ssh`, `scp` and `git archive` stubbed, for `TOP_RANK` values:
  - `''`, `'   '`, `'2000'`: notice "2000", `ssh vm "sudo bash ~/name-atlas-ops/bearers.sh ~/name-atlas-ops/app.tar.gz 2000"`, exit 0.
  - `'10000'`, `$' 10000 \n'`, `'1'`, `'999999'`: that number passed, exit 0.
  - `'0'`, `'1000000'`, `'abc'`, `'10e3'`, `'1; rm -rf /'`, `'-5'`, `'0100'`: `::error::top_rank must be a whole number from 1 to 999999, got '…'`, exit 1, no `ssh` call.
- **Production, read-only:** `GET https://name-atlas.pl/pl/nazwisko/wojtyla` and `/brzoza` at 16:39 UTC on 2026-10-05: 200, each with "Tego nazwiska jeszcze nie sprawdziliśmy w Wikidanych."; `/kowalski`: 200, without it.

## Not verified

- The step on GitHub Actions or the VM: not run. Running `bearers` with a higher `top_rank` (for example 10000) is the owner's step; GitHub Actions is blocked by a billing issue on the account (the owner, 2026-10-05).
- How many surnames a given limit adds, and how long the pass takes: not counted for Wikidata. The selection is the same `CURRENT_RANK` query as Polona's.
- Whether Polona's top-10,000 pass (running at 18:21 UTC on 2026-10-04) has finished: `bearers.sh` refuses while it runs.
- The rest of CI (`typecheck`, `lint`, unit, integration, golden, build, end-to-end): not run; this change touches no code they cover.
