# TASK-087 — Polona beyond the top 2,000: a rank limit for the `archive` step

- **Status:** IMPLEMENTED 2026-10-03 on `claude/wonderful-gates-ffvsn2`; record: `docs/progress/2026-10-03-archive-rank-limit.md`. **Not run on the production VM.**
- **Requested by:** the project owner, 2026-10-03: "start on Polona", on the finding that only the 2,723 surnames ranked within 2,000 on either list have been searched.
- **Decision:** ADR-0024 §2.6 ("the loader searches the surnames ranked highest in either register list, a rank limit at a time").
- **Depends on:** TASK-054 (`ops/vm/archive.sh`, `pnpm truth:archive-load --top-rank N`), on `main` @ `1d620d2`.

## 1. Goal

The owner can choose the rank limit of a production Polona pass from the Register VM workflow, without a code change.

## 2. Facts (checked on `main` @ `1d620d2`, 2026-10-03)

1. `ops/vm/archive.sh` takes the rank limit as its second argument (default 2000, digits only, at least 1) and passes it to `pnpm truth:archive-load --top-rank`.
2. `.github/workflows/register-vm.yml` calls it with one argument, so every production pass has used 2,000.
3. A pass skips every surname searched within the last 90 days (`ARCHIVE_REFRESH_DAYS`), so a higher limit searches only the surnames it adds.
4. Against the 2026-01-20 lists (male resource 1148808 and its female pair, ranked by count): 2,000 covers 2,722 distinct surnames; 5,000 covers 6,682; 10,000 covers 13,253; 20,000 covers 26,282. At about 7.3 s a surname (`ops/vm/README.md`), the additions take about 8, 21 and 48 hours.

## 3. In scope

- A `top_rank` input on `workflow_dispatch`, validated as a whole number and passed to `archive.sh`.
- `ops/vm/README.md`, `STATUS.md`, the progress record.

## 4. Out of scope

- Running the pass (the owner triggers it and chooses the limit).
- Any change to the loader, its pacing or the claim.

## 5. Acceptance criteria

- **AC-1.** With `top_rank` empty the step runs `archive.sh … 2000`, as before; with a whole number it passes that number; anything else fails the step before it reaches the VM.
- **AC-2.** The workflow file parses; `pnpm check:vm` and `pnpm check:ids` pass.

## 6. Verification

```
pnpm check:vm && pnpm check:ids && pnpm format:check
```
