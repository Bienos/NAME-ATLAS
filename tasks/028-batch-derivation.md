# TASK-028 — batch derivation over the register

- **Status:** IMPLEMENTED AND VERIFIED 2026-09-21.
- **Priority:** P0 for indexing at scale. Follows TASK-027, which made one page indexable.
- **Depends on:** the full PESEL register (supplied 2026-09-21), TASK-027 (slugs, sitemap, gates).

## 1. Goal

Derive `CURRENT_POPULATION` and `CURRENT_DISTRIBUTION` for every surname that **can** satisfy
`docs/canonical/21` §42, so that the sitemap lists real pages rather than a demonstration of 300.

## 2. The ceiling, measured before building anything

| | Surnames |
|---|---:|
| In the register | 598,476 |
| With any regional evidence | 270,021 |
| With a partition whose coverage clears 50% | **248,406** |

§42 needs two substantive value families. `CURRENT_STATS` is available for all 598,476;
`GEOGRAPHY` needs a `CURRENT_DISTRIBUTION` claim, which needs regional evidence. **350,070 surnames
— 58.5% — are published nationally and suppressed regionally**, falling under the per-region
publication threshold, so they can never carry a second family.

Their page would be a single count, which is what §43 withholds as thin. **"Every surname is
indexable" is therefore not an achievable goal**, and the task is written against 248,406 rather
than against 598,476, because an acceptance criterion that cannot be met is not an acceptance
criterion.

## 3. Acceptance criteria

- **AC-1** `pnpm truth:derive-batch` derives both claim types for the surnames that carry regional
  evidence, and reports a rate and a failure count.
- **AC-2** **Resumable.** The work remaining is a query against the claims table, not a stored
  cursor, so an interrupted run and a fresh one behave identically. Asserted by killing a run and
  observing the next one continue.
- **AC-3** **Idempotent.** A completed run re-run writes nothing, because the derivations are
  idempotent. `--limit` and `--concurrency` bound a run without changing its outcome.
- **AC-4** A single surname failing is counted and named, and the run continues. One bad row does
  not abandon 248,000 others.
- **AC-5** The universe-completeness count is memoised per run, and **a test asserts the memo is
  populated and consulted** — not merely that the arithmetic is right.
- **AC-6** `--all` derives population for every surname, including those that cannot be indexable.
  Their pages improve; their indexability does not change.

## 4. In scope

- `packages/truth/bin/derive-batch.ts`, wired as `pnpm truth:derive-batch`.
- `UniverseSizeCache` in `packages/truth/src/universe.ts`, threaded through `distribution.ts`.
- `tests/integration/src/universe-cache.test.ts`.

## 5. Out of scope

- The queue (`packages/queue`, BullMQ). A batch job that runs to completion in under an hour and is
  resumable does not need a broker; TASK-020's runtime is for work triggered by requests.
- Rank and rarity. They derive per surname and are not needed for §42's two families.
- Making the 350,070 suppressed surnames indexable. Nothing can, short of a source that publishes
  them regionally.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build
pnpm test:golden
pnpm test:integration
```

Measured on the full register: **71.1 surnames/second** at concurrency 8 after the cache fix,
against 0.65/s before. `PROGRESS.md` records the cache bug and how it was found.
