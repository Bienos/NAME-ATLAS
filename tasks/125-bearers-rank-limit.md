# TASK-125 — Well-known bearers beyond the top 2,000: a rank limit for the `bearers` step

- **Status:** IMPLEMENTED 2026-10-05 on `claude/focused-meitner-e7la35`; record: `docs/progress/2026-10-05-bearers-rank-limit.md`. **Not run on the production VM.**
- **Requested by:** the project owner, 2026-10-05, on the finding that WOJTYLA (#28,271) and BRZOZA (#2,035) both say "Tego nazwiska jeszcze nie sprawdziliśmy w Wikidanych" on production.
- **Decision:** none new. The rank limit is the loader's existing `--top-rank` (TASK-073); ADR-0030 §2.6 sets the 30-day refresh. No ADR.
- **Depends on:** TASK-077 (`ops/vm/bearers.sh`, `pnpm truth:bearers-load --top-rank N`) and TASK-087 (the `top_rank` input and its validation in the `archive` step), on `main` @ `93db9a1`.

## 1. Goal

The owner can choose the rank limit of a production well-known-bearers pass from the Register VM workflow, without a code change, as for Polona's.

## 2. Facts (checked on `main` @ `93db9a1`, 2026-10-05)

1. `ops/vm/bearers.sh` takes the rank limit as its second argument (default 2000, digits only, at least 1) and passes it to `pnpm truth:bearers-load --top-rank`.
2. `.github/workflows/register-vm.yml` calls it with one argument, so every production pass has used 2,000. The workflow's `top_rank` input exists, and only the `archive` step reads it.
3. **A higher limit queries only the surnames it adds, within 30 days of the last pass.** `selectBearersCandidates` (`packages/truth/src/bearers.ts`) leaves out every surname with an `ACTIVE` `wikidata-bearers:<surname_id>` source record retrieved within `--refresh-days`, which defaults to `BEARERS_REFRESH_DAYS` = 30 (`packages/truth/src/version.ts`; Polona's is 90). `storeWikidataBearers` (`packages/sources/src/wikidata/source.ts`) writes that record for every surname it queries, with or without bearers, and an unchanged answer refreshes its `retrieved_at`. A failed query writes nothing, so that surname is queried again by the next pass; the 2,000 pass in production skipped none.
4. **The window is 30 days, not Polona's 90.** The 2,723 surnames loaded in production were queried by 15:05 UTC on 2026-10-04. A pass started more than 30 days after a surname's query asks Wikidata again for it, by design (ADR-0030 §2.6). So a pass started before about 2026-11-03 queries only the added surnames; one started later also re-queries the earlier ones. This task does not change that.
5. `bearers.sh` refuses while the archive load (`name-atlas-archive-load`) or the change-over-time batch runs, and does nothing while a bearers load runs.

## 3. In scope

- The `bearers` step reads `inputs.top_rank`, with `archive`'s validation (whitespace dropped, empty is 2000, otherwise 1 to 999999 with no leading zero) and passes it to `bearers.sh`.
- The workflow's header comment and the input's description; `ops/vm/README.md`; `STATUS.md`; the progress record.

## 4. Out of scope

- Running the pass (the owner triggers it and chooses the limit; GitHub Actions is blocked by a billing issue on the account, per the owner, 2026-10-05).
- Any change to `bearers.sh`, the loader, its pacing, its refresh window or the claim.
- A restart input like `restart_archive`.

## 5. Acceptance criteria

- **AC-1.** With `top_rank` empty the step runs `bearers.sh … 2000`, as before; with a whole number it passes that number; anything else fails the step before it reaches the VM.
- **AC-2.** The workflow file parses; `pnpm check:vm`, `pnpm check:ids` and `pnpm format:check` pass.

## 6. Verification

```
pnpm check:vm && pnpm check:ids && pnpm format:check
```
