# TASK-139 — First names given to children: the trend compares shares of births, not counts

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-given-name-birth-trend-share.md`). Not on staging or production.
- **Requested by:** the project owner, 2026-10-06, in a Claude Code session: "yes switch to share and merge it".
- **Decision:** D-044 §6, amended 2026-10-06; ADR-0043 §4, amended. No new ADR, migration or claim type.
- **Number:** 139: the next free on `main` (`3ca15e1`) with no pull request open, checked at the start and again before the pull request.
- **Model guidance:** implementation session.

## 1. Goal

`GIVEN_NAME_BIRTH_TREND` compares a name's share of the children on each list, not its raw count, so that a name does not read FALLING only because fewer children were born.

## 2. Facts (2026-10-06)

1. The children on the published lists fell from 186,590 boys and 176,829 girls in 2020 to 126,404 and 119,788 in 2025 (−32%; TASK-136's record).
2. Under TASK-137's count rule, ZOFIA is rank 1 in 2025 but FALLING (4,415 against 7,073), though her share of listed girls went from 4.0% to 3.7%.
3. `given_name_birth_lists.people_sum` holds each list's children, read from the file at import (migration 0040). On an excerpt it is the excerpt's sum, not the list's.

## 3. In scope

- **The rule (D-044 §6, amended):** a name's share on a list is its count ÷ that list's `people_sum`. The latest list's share against the share five years earlier, on the same sex's list: more than 10% higher (relative) is RISING, more than 10% lower is FALLING, else STEADY. Whole numbers only: `L·Es·100 > E·Ls·110` and `L·Es·100 < E·Ls·90`, in `BigInt`.
- **Absent five years earlier:** the earlier count is at most that list's `publication_threshold` − 1. RISING only if the inequality holds for that count; otherwise INDETERMINATE (no claim, `BELOW_CUTOFF_TOO_CLOSE`). Never zero.
- **Both lists must pass the completeness gate:** a share needs the list's own `people_sum`.
- **`given_name_birth_trend@2`.** Both lists' `people_sum`, the shares (parts per million, rounded down) and the whole-number test in the claim's value and its derived evidence.
- **No `@1` trend claim stays ACTIVE once `@2` runs:** each is set SUPERSEDED (never deleted); a new claim with the same key names it in `supersedes_claim_id`.
- Unit and integration tests; ADR-0043 and D-044 §6 amended in place; progress record; `STATUS.md`.

## 4. Out of scope

- The window (5 years) and the threshold (10%); mixing boys' and girls' lists.
- Count and rank claims (unchanged, still `@1`).
- Any page, contract or API field; anything on staging, production or the VM.

## 5. Acceptance criteria

- AC-1: `birthTrend` decides by share, in whole numbers, with a test for each branch: RISING, STEADY, FALLING at and around the 10% bounds; absent-earlier RISING; absent-earlier INDETERMINATE under cut-offs 2 and 5; values at the PostgreSQL integer limit; invalid input refused.
- AC-2: the method version is `given_name_birth_trend@2`, and a trend claim's value holds both lists' `people_sum` and shares.
- AC-3: after the `@2` derivation, no ACTIVE trend claim has another method version; a second run derives and supersedes nothing.
- AC-4: on a disposable database with dataset 219's 13 files: totals per sex before (`@1`) and after (`@2`), and ZOFIA, JULIA, ANTONI and JAKUB in 2025 with their shares in 2020 and 2025.

## 6. Verification

`pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`, `pnpm test`, `pnpm build`, `pnpm test:integration`, `pnpm test:golden`; the full-dataset run of AC-4.
