# TASK-051 — Each surname page shows how its count changed across the editions of its list

- **Status:** IMPLEMENTED 2026-10-01: built on `claude/inspiring-bohr-vten7x` (#43) and carried to `main` with TASK-054 under schema 1.9 (`docs/progress/2026-10-01-change-over-time-on-main.md`). BUILT 2026-09-30 on `claude/inspiring-bohr-vten7x`, on the merged `main`; awaiting the owner's merge. On the VM (AC-7's first sentence): the migration, the batch and the gate ran and passed on 2026-10-01; production showing the chapter is not yet seen. The record is in `docs/progress/2026-09-30-surname-change-over-time.md`.
- **Requested by:** the project owner, 2026-09-30: "build the change over time section". The same evening: the 2019 lists are living persons.
- **Milestone:** M2's free profile, extended; it is the first section that reads more than one dated edition. `PLAN.md` has no row for it.
- **Depends on:** TASK-045 (the fifteen editions in the database and the registry), ADR-0019 (the series and the refusal of the 2022 women's duplicate), ADR-0020 (this task's decision).
- **Decision:** ADR-0020.

## 1. Goal

A visitor who looks up a surname sees, below the count, rarity and map, a section "Zmiany w czasie" (EN "Change over time"): for each list that carries the surname, its count on every edition from 2019 to 2026 beside one in X on that edition's whole list, and what changed between the first and the last edition. The figures are claims with evidence, confidence and a citation. The section says what changed and never why.

## 2. Facts that shape the work (checked 2026-09-30)

1. **The data is loaded.** On the VM: 15 editions, 5,713,465 values; the current claims unchanged (`docs/progress/2026-09-30-pesel-editions-loaded-on-the-vm.md`). Each edition's snapshots hold only the surnames the current register has; the rest are counted and not written (TASK-045 §3).
2. **The request path reads claims and derives nothing** (`packages/truth/src/query.ts`). So the change needs a claim type, a batch derivation and a read, like rank and rarity.
3. **`claim_type` is a PostgreSQL enum** (`0004`, then one `ADD VALUE` per claim type). The taxonomy already names the type: `SURNAME_DISTRIBUTION_SHIFT` (`docs/canonical/14` §13.5).
4. **A database without the new enum value rejects a query that names it.** A deploy of the reading code before the migration would turn every surname page into an error. The read therefore compares `claim_type::text`, and the rollout order is migration, batch, deploy (ADR-0020 §2.10).
5. **The completeness gate of rank and rarity cannot apply to an edition**, whose stored rows are partial by design. The edition's bytes were verified in full at import (the checksum is the record's `content_hash`); its list total is pinned in the registry from the file's bytes (sums computed 2026-09-30 from the downloaded files; 2020–2026 also equal the list-facts artefact's `people`).
6. **List totals, from the bytes:** men 19,859,783 (2019), 19,879,045, 19,987,207, 20,203,548, 20,808,071, 20,976,785, 21,096,170, 21,197,537 (2026); women 20,249,319 (2019), 20,220,345, 20,263,212, 21,369,477, 21,479,386, 21,535,515, 21,560,302 (2026). There is no women's 2022.
7. **The batch is heavy.** About 830,000 claims (every surname of each list with at least two known points), each with up to ten or so rows. The register build's derivation wrote comparable volume in 2 h 51 min on the VM.

## 3. In scope

- **The registry** (`packages/sources/src/registry.ts`): `official_people_sum` on the national descriptors (the 2019 pair, the editions of ADR-0019's series, the 2026 pair), and `PESEL_TREND_EDITIONS`: per list the editions a trend reads, in date order, 2019 first, with the refused resource as a gap. A test pins every sum and checks 2020–2026 against the list-facts artefact.
- **The migration** `0024_distribution_shift`: `ALTER TYPE claim_type ADD VALUE 'SURNAME_DISTRIBUTION_SHIFT'`, and the check that it is surname-scope.
- **The derivation** (`packages/truth/src/shift.ts`): the pure construction of points (count, list total, one in X, absent point, gap, the 2019 code, the changes), and `deriveDistributionShift`, which writes the research run, the point evidence, the derived evidence with its dependencies, the claim, its confidence and its citation, idempotently, superseding the claim of an older edition set. Its constants in `version.ts`.
- **The batch** `packages/truth/bin/derive-shift-batch.ts` (`pnpm truth:derive-shift`): resumable, asked of the claims table, like `derive-batch`.
- **The read** (`readDistributionShift` in `read.ts`), **the contract** (`surname-result` 1.7: a nullable `change` section, present exactly when `RESOLVED`; `docs/contracts/surname-result.md`) and **`querySurnameResult`**.
- **The page** (`apps/web`): a chapter, PL and EN, with a table and a small chart of one in X per edition, the gap note, the 2019 note and the list-growth line; the chapter list and its numbering; no figure computed in the page.
- **The VM** (`ops/vm/shift.sh`, the workflow's `shift` step, `ops/vm/README.md`): unpack, migrate, batch, gate, grants, `VACUUM ANALYZE`.
- Tests at each layer; `docs/CODEMAP.md`; ADR-0020; the progress record; `STATUS.md`.

## 4. Out of scope

- The regional change (2025 to 2026): its coverage rules are D-004's.
- The landing atlas, its series and `list_facts`; amending ADR-0019 for 2019 there.
- Any cause, adjective or forecast. No "most popular", "declining", "rising".
- A premium framing, a paywall, the share card and the Open Graph image.
- Indexability and sitemap rules: unchanged.
- Naming surnames for their growth (ADR-0019 §2.5).

## 5. Acceptance criteria

- **AC-1.** `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm check:ids`, `shellcheck ops/vm/*.sh scripts/import-editions.sh` and `actionlint` pass.
- **AC-2.** The registry's people sums equal the bytes' sums (pinned) and, for 2020–2026, the committed list-facts artefact's per-edition `people`. `PESEL_TREND_EDITIONS` holds 2019 to 2026 for men (8) and 2019 to 2026 without 2022 for women (7), and the refused resource as a gap.
- **AC-3.** Against a real PostgreSQL (the integration suite, `TEST_DATABASE_URL`), with editions imported for one surname: one claim per list with the right points, list totals and one in X; absent editions as `NOT_ON_LIST`, never a count; the women's 2022 as a gap; the 2019 point flagged; one research run, `K` point evidence items, one derived evidence item depending on them, one confidence assessment, one citation; a second run writes nothing; a new edition supersedes the claim; a surname with one known point gets no claim; no edition produces a population, rank or rarity claim.
- **AC-4.** `querySurnameResult` returns `change` with state `READY` for such a surname, `UNAVAILABLE` (`NO_CHANGE_DERIVED`, or the population's own reason where the surname has no count) otherwise, `RIGHTS_BLOCKED` under a restrictive profile, and no change section, not an error, on a database without the enum value. The schema refuses a `READY` section with fewer than two known points, a point whose one in X does not follow its count and total, and points out of date order.
- **AC-5.** The page renders the chapter in Polish and English from the contract alone; shows the gap and the 2019 note where they apply; hides the chapter when the section is unavailable; uses none of the forbidden words (tested on the message catalogue).
- **AC-6.** Locally: migrate, the batch over a database with the editions, then the page in a browser at 390 px and desktop widths, with a screenshot.
- **AC-7.** On the VM: the `shift` step migrates, runs the batch to the end, and its gate passes (surnames and the other claim counts unchanged, one active claim per surname and list, no claim with fewer than two known points). Production, redeployed after it, shows the chapter for ADAMCZYK, NOWAK and BARAN, and the pages of surnames with no claim are unchanged.

## 6. Verification

```
pnpm typecheck && pnpm test && pnpm format:check && pnpm check:ids
shellcheck ops/vm/*.sh scripts/import-editions.sh && actionlint .github/workflows/register-vm.yml
TEST_DATABASE_URL=postgresql://… pnpm test:integration
```

Then AC-6 on a local database and, after the VM run, AC-7 by `curl` and in a browser.
