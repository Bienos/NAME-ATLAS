# TASK-014 — `RARITY_CONTEXT` truth chain over the published universe (U-6)

- **Status:** IMPLEMENTED AND VERIFIED 2026-09-20, all eight acceptance criteria, including AC-7 on
  the real imported data (`NOWAK`: about 1 in 215 male, 1 in 216 female). Evidence: `PROGRESS.md`.
- **Created:** 2026-09-20, at the project owner's direction, resolving TASK-004 §14 **U-6**: the
  rarity denominator is the **published universe** — the sum of the published counts of the same
  resource — labelled as such, never "of Poles".
- **Milestone:** M2 (`PLAN.md`: "`CURRENT_RANK` and `RARITY_CONTEXT`"). The last M2 capability.
- **Depends on:** TASK-005 (`CURRENT_POPULATION`), TASK-009 (`CURRENT_RANK`, the universe
  evidence and `evidence_dependencies`), TASK-006 (the read contract it widens), D-007
  (surfaces now open, so this claim is published, not only stored).
- **Canonical basis:** `docs/canonical/11` §8 row `RARITY_CONTEXT` ("1-in-X / percentile + method;
  count + denominator/universe; VERIFIED if method valid"); `docs/canonical/14` §30 (derived
  statistics with lineage) and its confidence table ("valid count + compatible denominator + method
  → VERIFIED"); `docs/canonical/16` §27 (`RarityDTO`: structured metrics, never an arbitrary
  `87/100`); `docs/canonical/11` §6.1 (`universe_size` stored "only if methodologically valid" —
  it stays null; the denominator is a derived claim input, not a source fact).

## 1. Goal

For a resolved surname and each complete national universe it appears in, derive and publish
**one in X** with its method, where X = (sum of published counts in that resource) / (the surname's
count), rounded to a stated rule, plus the existing rank as a supporting metric — and say exactly
what X is a share of.

## 2. What the denominator is, and is not (U-6, binding)

- **Is:** the sum of every `distribution_values.count` on the checksum-matched, complete source
  record of one resource — 21,197,537 for `1148808` at `2026-01-20`. Exact, derivable, reproducible,
  and per sex.
- **Is not:** the register's living-person total (unknown: single-bearer surnames are excluded from
  publication and the register holds emigrants), nor GUS resident population (a different universe;
  the male sum alone exceeds resident men). Either would make the figure quietly wrong.
- **Is labelled:** "of people counted in the register" / "osób ujętych w rejestrze", never "of
  Poles", "of men in Poland", or unqualified. The label is part of the claim payload and the DTO,
  not a frontend afterthought.
- **Never combined across sexes.** Two universes, two figures (U-1).

## 3. In scope

1. **Migration `0009_rarity_context`** — `ALTER TYPE claim_type ADD VALUE 'RARITY_CONTEXT'` and
   `ALTER TYPE evidence_dependency_role ADD VALUE 'DENOMINATOR'` (the role D-011 anticipated).
   Per the tested constraint, no row using either value in the same migration transaction.
2. **Denominator evidence** — a `DERIVED_STATISTIC` `EvidenceItem` per complete universe: the sum
   of counts, with `derivation_method = "published_universe_sum@1"`, depending (role `UNIVERSE`) on
   the same `AUTHORITATIVE_INDEX` universe evidence `CURRENT_RANK` uses. Computed in SQL as one
   aggregate; refused, exactly as the rank is, unless the completeness gate passes
   (`assessUniverseCompleteness`, no bypass).
3. **`RARITY_CONTEXT` claim** — key `RARITY_CONTEXT|{surname}|{source_record}`; payload: `one_in_x`
   (integer, rounding rule stated as `ROUND_HALF_UP` on denominator / count), `numerator` (the
   count), `denominator`, `denominator_kind = "PUBLISHED_UNIVERSE_SUM"`, `universe_label_code =
   "PESEL_PUBLISHED_UNIVERSE"`, `share` (numeric, count / denominator, 9 places), `method_version =
   "rarity_context@1"`, `snapshot_date`, `comparability_group`, and the supporting `rank` /
   `universe_size` from the `CURRENT_RANK` claim when it exists. Lineage: `COUNT` → the population
   evidence, `DENOMINATOR` → the denominator evidence, `UNIVERSE` → the universe evidence.
4. **Confidence** — `assessDerivedStatistic` extended for the rarity rule: `VERIFIED` when the count
   evidence is `VERIFIED`, the universe is complete, and the method is the recorded one; otherwise
   the weakest input's status. Rights never enter (invariant 2).
5. **Read contract** — `docs/contracts/surname-result.md` schema `1.1` (additive): a `rarity`
   chapter carrying canonical/16 §27's `RarityDTO` — `primary: {metric: "ONE_IN_X", value}`,
   `supporting: [{metric: "RANK", value}]`, `methodology_code: "PESEL_PUBLISHED_UNIVERSE_SUM_V1"` —
   plus `universe_label_code` and the observation's `scope_label_code`, one entry per universe,
   under the same surface rules as population.
6. **Accepted rendering** (recorded in the contract, rendered by a frontend): EN *"About 1 in
   {x} people counted in the PESEL register ({sex}) bore the surname {surname} on {date}."*; PL
   *"Około 1 na {x} osób ujętych w rejestrze PESEL ({sex}) nosiło nazwisko {surname} na dzień
   {date}."* "About" is correct here and only here: X is rounded.
7. `pnpm demo:surname-rarity`, tests, `PROGRESS.md`, `docs/CODEMAP.md`, U-6 recorded closed.

## 4. Out of scope

- Percentiles, rarity *bands* ("rare", "very rare"), or any adjective. Canonical §27 allows
  `PERCENTILE`; it is not needed to ship one-in-X and would need its own method statement.
- Any denominator other than the published-universe sum. Storing a value in
  `distribution_snapshots.universe_size`.
- Regional rarity (TASK-011/012 first).
- Changing `CURRENT_RANK` or `CURRENT_POPULATION`.

## 5. Acceptance criteria

- **AC-1** Over the committed fixtures the derivation refuses (`INCOMPLETE_UNIVERSE`) and writes
  nothing — the same gate, the same reason, no bypass (a permissive `rightsOverride` still refuses).
- **AC-2** Over a complete universe, `one_in_x = ROUND_HALF_UP(denominator / count)`, `share =
  count / denominator`, `denominator = SUM(count)` over that source record's national values —
  each asserted against a SQL recomputation, not against the code's own output.
- **AC-3** Lineage: three `evidence_dependencies` rows per claim with roles `COUNT`, `DENOMINATOR`,
  `UNIVERSE`; the denominator evidence depends on the universe evidence.
- **AC-4** Two universes → two claims with different denominators; no combined figure anywhere in
  the payload or the DTO.
- **AC-5** Idempotent: deriving twice yields one claim per universe, unchanged.
- **AC-6** The DTO validates against schema `1.1`; `methodology_code` and `universe_label_code` are
  present on every entry; no entry ever says or implies "of Poles".
- **AC-7** Real data: `NOWAK` male → `one_in_x` = ROUND_HALF_UP(21,197,537 / 98,387) = **215**,
  female analogously over 1148811's sum; both `VERIFIED`; both `PAID`-eligible now that D-007 is
  decided.
- **AC-8** `0001`–`0009` apply from empty and re-run clean; generated types byte-identical.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
DATABASE_URL=… pnpm db:migrate && pnpm db:generate-types && git status --short packages/db/src/generated/db.ts
pnpm demo:surname "NOWAK" && pnpm demo:surname-rank "NOWAK" && pnpm demo:surname-rarity "NOWAK"
pnpm build
```

## 7. Do not

- Do not divide by anything but the published-universe sum, and do not sum across sexes.
- Do not write `universe_size`. Do not add a rarity adjective.
- Do not let the gate through: an incomplete universe has no denominator.
