# TASK-026 — golden test corpus: named cases with EXPECTED and FORBIDDEN

- **Status:** IMPLEMENTED_UNVERIFIED 2026-09-21.
- **Priority:** P0. `docs/canonical/17` calls Layer 3 (Resolution), Layer 11 (Rights) and Layer 12
  (Product truthfulness) **Absolute P0**, and `docs/CODEMAP.md` has listed `tests/golden` as
  "filled per task" since TASK-001 with nothing in it.
- **Depends on:** TASK-003 (resolver), TASK-015 (candidates), TASK-021/ADR-0007 (per-asset rights).

## 1. Goal

Every regression test in this repository today asserts what the code does. None of them asserts
what the code must **never** do, by name, in a form a reviewer can read as a policy.

`docs/canonical/17` §4 states the principle this task implements:

> Every high-risk golden case must contain both `EXPECTED` and `FORBIDDEN`. […] This is
> substantially stronger than `expected top result = Łuczak`, because it protects semantics.

So: a corpus of named, versioned cases, each carrying an `expected` assertion **and** a list of
`forbidden` codes, where every forbidden code is an **executable predicate** rather than a comment.
A case that lists `AMBIGUOUS_SILENT_AUTO_RESOLUTION` causes that check to run against what the
system actually returned. `docs/canonical/17` §13's seven P0 hard fails and §21's four rights hard
fails become failing tests the moment a future change introduces them.

## 2. Acceptance criteria

- **AC-1** `tests/golden` is a workspace package with `typecheck` and `test:golden` scripts, and
  `pnpm test:golden` runs from the repository root.
- **AC-2** Every case carries all of `docs/canonical/17` §6's required metadata. The type system
  enforces it: a case missing `case_version`, `blocking_level`, `created_at`, `reviewed_at` or
  `linked_requirements` does not compile.
- **AC-3** Every `forbidden` code resolves to a predicate that runs. A code with no predicate is a
  compile error, and the registry test asserts that every declared code is referenced by at least
  one case — an unused rule is a rule nobody is checking.
- **AC-4** All seven of `docs/canonical/17` §13's resolution P0 hard fails are covered by at least
  one case each, and the mapping from case to canonical clause is in the file.
- **AC-5** All four of §21's rights P0 hard fails are covered, and §20's nine rights profiles are
  each evaluated independently against every **implemented** surface and asset kind. §20 also
  names a `SHARE` surface; no evaluator exists for one, and the gap is recorded rather than
  filled with an invented decision.
- **AC-6** §12's two launch-priority metrics — **false merge rate** and **false auto-resolve
  rate** — are computed over the whole corpus and asserted to be exactly zero.
- **AC-7** §11's assertion list is honoured: a resolution case asserts outcome, match type,
  decision mode, resolved ids, the three human-in-the-loop flags, candidate inclusion **and**
  exclusion, and candidate provenance. "Do not evaluate only top-1 string."
- **AC-8** No case fabricates source data. Every seeded surname is synthetic or a real Polish
  spelling used as a string only, per §7.2, and each case states which.

## 3. In scope

- `tests/golden/src/case.ts` — the case schema as TypeScript types (see §5 for the deviation).
- `tests/golden/src/forbidden.ts` — the executable registry, resolution and rights.
- `tests/golden/src/corpus/resolution.ts`, `corpus/rights.ts` — the cases.
- `tests/golden/src/*.test.ts` — the runners, plus the metrics and registry-coverage tests.
- `docs/CODEMAP.md`, `PROGRESS.md`, `docs/implementation/NAME_ATLAS_TASKS.md`.

## 4. Out of scope

- §8's full P0 corpus sizes (598 cases). The resolution and rights domains are built here because
  their fixtures exist. The evidence/claim corpus (§22, 125 cases) needs historical-source
  fixtures, the LLM corpus (§8, 60 cases) needs an LLM layer, and the E2E corpus needs Playwright —
  none of which exist. Stating a number the fixtures cannot support would be the fabrication
  `AGENTS.md` §9 forbids.
- Layer 9 (Frontend state) and Layer 12 (Product truthfulness) rendering assertions. These already
  exist as `apps/web/src/lib/*.test.ts` — including the honesty guard that forbids the substrings
  `mieszka`, `pochodzi`, `urodzon`, `lives in`, `comes from` and `originat` in any rendered string.
  Duplicating them here would give two owners for one truth (`AGENTS.md` §1).
- Playwright, Storybook, k6 and Pact (§3.3–§3.7). No new dependency.
- Fuzzy **recall** figures. No case asserts that a given fuzzy candidate *is* returned: a rate
  over a twelve-entity fixture is not a recall figure. Recall is measured on the real register by
  `pnpm measure:fuzzy-recall` (TASK-015). §4's own worked example writes `MAY_APPEAR` for exactly
  this reason, and what the cases assert is what §4 says they are for — that **if** a candidate
  appears it appears as a search-only suggestion under `USER_CONFIRM`.

## 5. Recorded deviation from `docs/canonical/17` §5

§5 recommends YAML and calls it "Recommended YAML format". This corpus is **TypeScript**:

1. No YAML parser is a dependency of this repository, and `AGENTS.md` §6 requires a justification
   for each new one. The justification would be weak: the corpus has one consumer.
2. §6 requires every case to carry ten metadata fields. In YAML that is a runtime schema check
   someone must remember to run. As a TypeScript type it is a compile error.
3. §4's `forbidden` list only protects semantics if each entry **executes**. A TypeScript union
   keyed to a predicate registry makes an unknown code a compile error; a YAML string cannot.

The field names, nesting and vocabulary of §5 are preserved exactly, so a later YAML loader is a
parser over the same shape and not a redesign. This deviation is recorded here and in
`tests/golden/README.md`; it changes no canonical document.

## 6. Verification

```
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
TEST_DATABASE_URL=… pnpm test:golden
TEST_DATABASE_URL=… pnpm test:integration
pnpm build
```

The golden resolution domain needs PostgreSQL for the same reason `tests/integration` does: an
exact resolver that is not exercised against a real `canonical_key` index proves nothing. Container
registries remain network-egress-blocked in this environment, so the `TEST_DATABASE_URL` fallback
is used and **the pinned `postgis/postgis` image is not exercised** — as in TASK-003 onwards.
