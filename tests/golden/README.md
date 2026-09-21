# `tests/golden` — the golden test corpus

Implements `docs/canonical/17` §4–§13 and §20–§21 for the two QA layers whose
fixtures exist today: **Layer 3 (Resolution)** and **Layer 11 (Rights)**, both of
which §2 marks *Absolute P0*.

## What makes this different from the other test suites

Everything in `packages/*/src/*.test.ts` and `tests/integration` asserts what the
code **does**. This corpus also asserts what it must **never** do, by name.
`docs/canonical/17` §4:

> Every high-risk golden case must contain both `EXPECTED` and `FORBIDDEN`. […]
> This is substantially stronger than `expected top result = Łuczak`, because it
> protects semantics.

Each case therefore carries a `forbidden` list, and **every code in it is an
executable predicate**, not a comment. Listing
`AMBIGUOUS_SILENT_AUTO_RESOLUTION` on a case makes that check run against what
the system actually returned and actually stored; a code with no predicate does
not compile; and `registry.test.ts` fails if any declared rule is exercised by no
case, because an unchecked rule looks exactly like a passing one.

Two suites also run **every** rule against **every** case, not only the ones each
case lists. The per-case list says what a case is *about*; §13 and §21 are
absolute.

## Layout

| File | What it holds |
|---|---|
| `src/case.ts` | §5/§6's case schema and required metadata, as types |
| `src/forbidden-resolution.ts` | §13's seven hard fails + four adjacent invariants, as predicates |
| `src/forbidden-rights.ts` | §21's four hard fails + ADR-0007's obligations, as predicates |
| `src/corpus/resolution.ts` | the resolution cases |
| `src/corpus/rights.ts` | §20's rights profiles |
| `src/fixtures.ts` | `surname-set-v1` — the seeded entities, all synthetic |
| `src/metrics.ts` | §12's two launch-priority rates |
| `src/observe.ts`, `src/observe-rights.ts` | what each domain observes |
| `src/registry.test.ts` | the corpus's own invariants — no database needed |
| `src/rights.test.ts` | the rights corpus — no database needed |
| `src/resolution-inputs.test.ts` | the resolution corpus's input properties — no database needed |
| `src/resolution.test.ts` | the resolution corpus — **needs PostgreSQL** |

## Running it

```
pnpm test:golden                      # from the repository root
TEST_DATABASE_URL=… pnpm test:golden  # substitute for the pinned container
```

`registry.test.ts`, `rights.test.ts` and `resolution-inputs.test.ts` are pure and run
anywhere — 175 assertions, including the proof that every resolution case is
*satisfiable* at all (a case expecting `EXACT` against a display form whose
canonical key differs from its input could only ever fail, and nothing would
have said so until someone ran it with a database).
`resolution.test.ts` starts a real PostgreSQL through `@name-atlas/testing`,
because the tiers it tests *are* a unique index and a view: exercised against a
stub it would prove nothing about either.

## Recorded deviation from §5

§5 recommends YAML. This corpus is TypeScript. The reasons are in
`tasks/026-golden-test-corpus.md` §5: no YAML parser is a dependency and
`AGENTS.md` §6 wants a justification for each new one; §6's ten required
metadata fields become a compile error instead of a runtime check somebody has
to remember to run; and a `forbidden` entry only protects semantics if it
executes, which a string in a YAML array cannot.

§5's field names, nesting and vocabulary are preserved exactly, so a later YAML
loader is a parser over the same shape and not a redesign.

## Recorded gaps

These are gaps, not omissions to be quietly forgotten:

- **§8's corpus sizes.** §8 sizes the P0 corpus at 598 cases across nine
  domains. Resolution and rights are built because their fixtures exist. The
  evidence/claim corpus (§22) needs historical-source fixtures, the LLM corpus
  needs an LLM layer, and the E2E corpus needs Playwright. Stating a count the
  fixtures cannot support would be the fabrication `AGENTS.md` §9 forbids.
- **§20's `SHARE` surface.** There is no evaluator for one. TASK-024's share
  control puts this page's own URL on a clipboard and carries no evidence, so
  nothing here asserts a share decision.
- **Fuzzy recall.** No case asserts that a particular fuzzy candidate *is*
  returned. Whether one clears a `pg_trgm` threshold is a measured property of a
  corpus, and a rate over a 12-entity fixture is not a recall figure. Recall is
  measured on the real 598,476-surname register by `pnpm measure:fuzzy-recall`
  (TASK-015). What the cases assert is §4's actual subject: that **if** a
  candidate appears, it appears as a search-only suggestion under `USER_CONFIRM`
  with declared provenance and no score a consumer could read as confidence.
- **Review.** Every case carries `reviewed_at: null`. The rights cases ask for
  a `LEGAL` reviewer and have not had one.

## Data honesty

Every entity in `src/fixtures.ts` is synthetic in the sense §7.2 requires: real
Polish spellings used as realistic *strings*, with no count, region, date or
evidence attached to any of them. A surname appearing in this package says
nothing about how many people bear it or where they live. Every rights profile
in `src/corpus/rights.ts` is likewise invented and describes no real
institution's terms.
