# TASK-015 — fuzzy candidate retrieval (trigram shortlist + edit-distance rerank)

- **Status:** IMPLEMENTED 2026-09-20. All nine acceptance criteria met; figures in `PROGRESS.md`.
  Both decisions were answered as recommended: **D-016** GIN (ADR-0006) and **D-017** option (a),
  a six-character minimum below which nothing is suggested.
- **One correction made during implementation.** §2.1's figures (2 of 34 and 18 of 34) came from an
  independent probe at specification time and stand as what was known then. The implementation's own
  first `damerauLevenshtein` had a bug — it reported `kowalskii` against `kowalski` as distance 0 —
  and the first sweep ran on it. The bug was caught by a unit test, fixed, covered by property tests
  over the metric laws, and every threshold and figure was re-measured before being recorded. The
  corrected, richer measurements are in `PROGRESS.md`; the threshold choices were unchanged by the
  fix, only the recall numbers.
- **Created:** 2026-09-20, after TASK-012 completed the current-surname truth vertical.
- **Milestone:** M2. This is the front door of M2's exit journey — *search* → resolution → result.
- **Depends on:** TASK-003 (the exact resolver, `canonical_key_v2`, the T0/T1 tiers and
  `resolveSurname`'s contract), TASK-001 (`pg_trgm` is already enabled by `0001`).
- **Canonical basis:** `docs/canonical/13` §19 (staged retrieval order, stages 8 and 9), §20.1
  (`pg_trgm` for retrieval, Damerau-style edit analysis for rerank), §21 (length policy) and §21.1
  (candidate caps), §23.1 (search index architecture), §24 (candidate feature model), §25 (ranking:
  tier first, `retrieval_rank_score` never "confidence"), §31 (the three-dimensional status model),
  §32.2/§32.4/§32.5 (user-facing behaviour), §33 (auto-correct policy), §18 (`SearchCandidate` as a
  value object, not a row).

## 1. Goal

Given an input that resolves to nothing exactly, return a ranked, explained shortlist of real
surnames it might be — as **suggestions that a human confirms**, never as a resolution. Exact
resolution behaviour must not change at all.

## 2. What was measured before this was specified

Every figure below was measured on the ingested register (598,476 surnames, mean canonical key
length 8.90, range 2–57), not assumed. The probe built each candidate index on the real table and
ran the real queries. **These numbers are why the task is shaped the way it is.**

### 2.1 Trigram alone ranks the right answer first almost never

34 of Poland's most common male surnames, each given **one adjacent transposition** — the single
hardest edit class for trigrams, because transposing two adjacent characters destroys three of the
roughly `n+1` trigrams in the string:

| Similarity threshold | Target present in a 25-row shortlist | Trigram ranked it 1st | Damerau rerank ranked it 1st | Mean shortlist size |
|---:|---:|---:|---:|---:|
| 0.3 | 31 of 34 | **2 of 34** | **18 of 34** | 22.2 |
| 0.4 | 24 of 34 | 0 of 34 | 11 of 34 | 9.1 |
| 0.5 | 5 of 34 | 0 of 34 | 5 of 34 | 1.4 |

Two conclusions, both binding on this task:

1. **Shipping trigram similarity as the ranking would be actively misleading.** It puts the right
   answer first in 2 of 34 cases. The rerank is not polish; it is the feature.
2. **Even with the rerank, roughly half of these typos do not come back first.** The task must
   therefore be honest about what it does not do (§4) rather than imply a working "did you mean".

The canonical spec's own showcase example behaves exactly this way. For `CICHWOSKI`, the real
register ranks `CICHOSKI` first (similarity 0.583) and the intended `CICHOWSKI` **twelfth** (0.429).
Both are one edit away; only one is the likely typo. That is the whole argument for stage 9.

### 2.2 A single global threshold cannot work, because similarity tracks length

The same one-transposition edit, measured against the real strings:

| Surname | Length | Similarity after one transposition |
|---|---:|---:|
| `WÓJCIK` | 6 | 0.273 |
| `NOWAK` | 5 | 0.333 |
| `KOWALSKI` | 8 | 0.385 |
| `WIŚNIEWSKI` | 10 | 0.467 |

A threshold that admits `WÓJCIK`'s typo (below 0.30) pulls thousands of unrelated neighbours for a
ten-character surname; a threshold that keeps a long surname's shortlist small (0.50) loses short
surnames entirely. `docs/canonical/13` §21 already prescribes length-dependent behaviour; this
measurement says the length must govern the **threshold itself**, not merely whether fuzzy runs.

### 2.3 The diacritic fold is not reachable by trigram

`similarity('luczak', 'łuczak')` is **0.400** — below any threshold that keeps precision usable. And
`LUCZAK` is itself a real surname in the register, scoring 1.000 against that input, which is
exactly canonical §32.3's case: the exact entity must win. So the diacritic-fold candidate (stage 4)
cannot be delivered as a by-product of stage 8. It needs its own key and its own task, and this task
must not pretend to cover it.

### 2.4 Two real ambiguity cases exist in the register and must be handled

- `KOWALSKY` is a real surname (similarity 1.000 to itself) whose neighbours include `KOWALSKA` and
  `KOWALSKI` at 0.636. Exact must win; the neighbours are at most suggestions.
- `WISNIEWSKY` yields `WISNIEWSKI` and `WISNIEWSKA` **tied at 0.692**. Canonical §33.4 forbids
  auto-resolving when two strong candidates exist. This is not hypothetical.

## 3. The index decision — this contradicts canonical §23.1

`docs/canonical/13` §23.1 names GiST as the P0 candidate (`USING GIST (search_key gist_trgm_ops)`)
because GiST supports `<->` distance ordering, and says to "evaluate GIN ... later". Measured on the
real table, for the query this task actually issues:

| Approach | Index size | Build time | Query latency (top 25) |
|---|---:|---:|---:|
| GiST, `ORDER BY key <-> input` | 43 MB | 6.4 s | 160 ms |
| GIN, `WHERE key % input` at 0.3 | 18 MB | 1.9 s | 18 ms |
| GIN, `WHERE key % input` at 0.4 | 18 MB | 1.9 s | 4.9 ms |
| GIN, `WHERE key % input` at 0.5 | 18 MB | 1.9 s | 2.4 ms |

GIN is smaller and between 9× and 66× faster here. The one thing GiST gives that GIN does not is
true top-K with no threshold: a query below threshold returns nothing under GIN, whereas GiST always
returns its nearest neighbours. Given §2.2, a *threshold* is wanted anyway — returning nothing for
`NOWK` is the correct behaviour, not a limitation (see §2.5 below).

**Per `AGENTS.md` §2 this may not be resolved silently in code.** The implementing session must
either write an ADR superseding §23.1's index recommendation with these measurements, or use GiST as
canonical says and record the cost. **Recommendation: ADR for GIN.** This is decision **D-016**.

### 2.5 Short inputs must return nothing rather than noise

`NOWK` (4 characters) returns `NOWS`, `NOWY`, `NOWE`, `NOWA`, `NOWC` — all at 0.429, all real
surnames, none of them a suggestion any reader would want. Canonical §21 already says 1–3 characters
do exact/known forms only. The measurement extends that: at 4–5 characters the shortlist is
indistinguishable from an alphabet walk. Returning `UNRESOLVED` with no suggestion is the honest
answer and an acceptance criterion, not a gap.

## 4. The second open decision: the honest limit on short inputs

Given §2.1 and §2.2, a single-transposition typo of a short surname is not recoverable at acceptable
precision by trigram retrieval. Three options:

- **(a) Declare it out of scope.** Fuzzy suggestions are offered only at and above a minimum input
  length, and shorter inputs return `UNRESOLVED` with no suggestion. Smallest, honest, ships now.
  **Recommended.**
- **(b) Add a second retrieval path for short inputs** — a bounded Levenshtein scan over the
  length-filtered subset, or a deletion-neighbourhood key. Better recall, materially more work, and
  it needs its own measurement before anyone can claim it works.
- **(c) Lower the threshold for short inputs and accept the noise.** Rejected: §2.5 shows what the
  user would be shown, and `PRODUCT.md`'s honesty commitments do not permit it.

The implementing session must not choose (c). If the owner picks (b) it belongs in a **separate**
task, and this one ships (a) first. This is decision **D-017**.

## 5. In scope

1. **Migration `0012_surname_trigram_index`** — the trigram index on `surnames.canonical_key`, per
   the §3 decision. Index only; no table, column or enum.
2. **A length-dependent threshold table**, in one named, versioned constant with its measured
   rationale, reflecting §2.2 rather than a single global number. It is an operational rule tuned on
   the corpus, and its comment must say so (canonical §21: "initial operational rules, not
   linguistic truths").
3. **`packages/resolver/src/candidates.ts`** — the two-stage generator:
   - stage 8: the trigram shortlist, capped at **25** (canonical §21.1), inside the same READ ONLY
     transaction discipline `lookup.ts` already uses;
   - stage 9: Damerau-Levenshtein rerank (adjacent transposition counted as one edit — the whole
     point of §2.1), capped at **10** reranked.
   Both stages pure where they can be: the distance function and the ranking comparator are exported
   and unit-tested without a database.
4. **`SearchCandidate` as a value object** (canonical §18.1, §18.2 P0): `input_form`,
   `generated_form`, `candidate_surname_id`, `method`, `method_version`, `tier`, `features`,
   `explanation_codes`, `search_only`. **No database row per generated string.** `features` carries
   the §24 fields this task can actually fill — `trigram_similarity`, `edit_distance`,
   `transposition_detected`, `same_primary_script`, `exact_canonical`, `exact_known_form` — and
   omits every field it cannot (`phonetic_overlap`, `language_pack_compatible`, the context fields).
   A field it cannot fill is absent, never `false`.
5. **`retrieval_rank_score`**, versioned, never named `confidence`, `probability` or
   `identity_probability` (canonical §25.3). Lexicographic ordering first — tier, then hard
   contradiction, then string features, then a stable tie-break — not a single black-box score
   (§25.1).
6. **Tier `T4_FUZZY`** on every candidate this task produces (canonical §25.2). It never emits
   `T0`–`T3` and never `T5`.
7. **A new resolver entry point** that returns suggestions, leaving `resolveSurname` byte-identical
   in behaviour for every input it already handles. The existing status values gain nothing; the new
   outcome is carried on the new surface. `resolution_status` may take canonical §4.5's reserved
   `FUZZY_MATCH` **only** in the suggestion surface, never in a value any derivation reads.
8. **`pnpm demo:surname-candidates`**, printing the shortlist, each candidate's features and
   explanation codes, and the length threshold that applied.
9. Tests, `PROGRESS.md`, `docs/CODEMAP.md`, and an ADR per §3.

## 6. Out of scope

- **Any change to what the truth chains accept.** `deriveCurrentPopulation`, `deriveCurrentRank`,
  `deriveRarityContext` and `deriveCurrentDistribution` require `EXACT` and must keep requiring it.
  A fuzzy candidate must never reach a claim, a count, or a citation.
- **Auto-resolution on a fuzzy match, at any score, ever** (canonical §33.4, §33.2).
- The diacritic fold (stage 4) — §2.3 shows why it is a separate task with a separate key.
- Gender forms (stage 3), language-pack morphology (5), transliteration (6–7), phonetics (10), OCR
  (11), Jaro-Winkler (canonical §20.3 warns against it as primary), a bespoke n-gram service (§20.4),
  weighted edit costs (§20.5).
- The search API endpoint and the result UI. Those consume this; specifying them together would
  make one unreviewable change out of two.
- Persisting candidates as `NameForm` rows or any new table (canonical §18.2 forbids it at P0).
- Entity creation, merge or split from a fuzzy match (canonical §28.5, §29).
- Caching (canonical §37). No Redis; M3 owns that.

## 7. Acceptance criteria

- **AC-1** Every input that resolves `EXACT` today still resolves `EXACT`, with the same
  `resolved_surname_id`, and produces **no** suggestion call. Asserted over the committed fixtures
  and over the real `KOWALSKY` case from §2.4, where an exact surname must beat its neighbours.
- **AC-2** No fuzzy candidate can reach a derivation: a test drives each of the four derive
  functions with an input that only matches fuzzily and asserts `UNRESOLVED` with nothing written.
- **AC-3** `CICHWOSKI` returns `CICHOWSKI` in the reranked top 3 although trigram ranks it 12th.
  This is the task's headline behaviour and the reason stage 9 exists.
- **AC-4** `WISNIEWSKY` returns both `WISNIEWSKI` and `WISNIEWSKA` and resolves to **neither** —
  outcome `SUGGESTION_REQUIRED` or `MULTIPLE_CANDIDATES`, decision mode `USER_CONFIRM`, never `AUTO`.
- **AC-5** `NOWK` returns `UNRESOLVED` with an empty suggestion list, not the 0.429 alphabet walk of
  §2.5. A 1–3 character input never runs stage 8 at all.
- **AC-6** The shortlist is capped at 25 and the reranked list at 10, asserted against an input
  whose unfiltered match set is larger (threshold 0.3 over a long surname returns thousands).
- **AC-7** Every candidate carries `tier = T4_FUZZY`, a `method_version`, and at least one
  explanation code; no candidate carries a field named `confidence`, `probability` or
  `identity_probability`; and `features` omits rather than falsifies what this task cannot measure.
- **AC-8** Migrations apply from empty and re-run clean; generated types are unchanged (an index
  changes no type); a recorded query latency for the real 598,476-row table is in `PROGRESS.md`
  alongside the index actually chosen.
- **AC-9** The measured recall of this implementation is **recorded as a number, not claimed as
  working**: re-run §2.1's probe as a committed script and put its table in `PROGRESS.md`. If the
  rerank recovers 18 of 34 single-transposition cases, `PROGRESS.md` says 18 of 34.

## 8. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
DATABASE_URL=… pnpm db:migrate && pnpm db:generate-types && git status --short packages/db/src/generated/db.ts
pnpm demo:surname-candidates "CICHWOSKI"   # CICHOWSKI in the reranked top 3
pnpm demo:surname-candidates "WISNIEWSKY"  # two candidates, resolves to neither
pnpm demo:surname-candidates "NOWK"        # no suggestions, and say so
pnpm demo:surname "NOWAK" && pnpm demo:surname-rank "NOWAK" && pnpm demo:surname-rarity "NOWAK" && pnpm demo:surname-distribution "NOWAK"
pnpm build
```

The four `demo:surname*` commands must print exactly what they print today. That is the regression
this task most needs to not cause.

## 9. Do not

- Do not auto-resolve a fuzzy match, however high the score, and do not silently replace the user's
  input (canonical §32.2: "Do not silently replace input").
- Do not call any similarity, distance or rank a confidence, a probability or a likelihood. They are
  diagnostic retrieval features (canonical §24, §25.3).
- Do not choose between candidates by count or popularity (canonical §32.4: "Never choose based only
  on popularity"). The surname with more bearers is not more likely to be the one meant.
- Do not lower a threshold to make a test pass. If recall is poor, record the number (AC-9) and let
  §4 be decided on evidence.
- Do not create a `NameForm`, a `Surname`, or any row for a generated candidate.
- Do not widen `resolveSurname`'s existing return values, and do not let `FUZZY_MATCH` appear in any
  field a truth-chain derivation reads.
- Do not add Elasticsearch, Redis, a phonetic index or a second n-gram implementation.
