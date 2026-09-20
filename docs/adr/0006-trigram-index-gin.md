# ADR-0006 — the trigram index is GIN, not GiST

- **Status:** Accepted
- **Date:** 2026-09-20
- **Deciders:** project owner (chose the recommended option on D-016) + the TASK-015 session
- **Deviates from:** `docs/canonical/13` §23.1, which names `USING GIST (search_key gist_trgm_ops)` as the P0 trigram index candidate and says to "evaluate GIN for batch/filter-heavy workload later"
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-016
- **Does not change:** anything about `canonical_key` itself, the exact tiers T0/T1, or the rule in §23.2 that surname token semantics are not delegated to `pg_trgm`
- **Implemented by:** `packages/db/migrations/0012_surname_trigram_index.ts`

## Context

`docs/canonical/13` §23.1 recommends GiST, and gives its reason: "For top-K nearest matches, PostgreSQL documentation notes GiST supports distance ordering efficiently." That is accurate. The `<->` operator is a GiST capability, and it returns the K nearest strings with no threshold at all.

TASK-015 needed to choose an index, so both were built on the real table and measured against the query the feature actually issues. The corpus is the ingested PESEL register: **598,476 surnames**, mean `canonical_key` length 8.90, range 2–57.

| Approach | Index size | Build time | Query latency, top 25 |
|---|---:|---:|---:|
| GiST, `ORDER BY canonical_key <-> input` | 43 MB | 6.4 s | 160 ms |
| GIN, `WHERE canonical_key % input` at 0.3 | 18 MB | 1.9 s | 18 ms |
| GIN, `WHERE canonical_key % input` at 0.4 | 18 MB | 1.9 s | 4.9 ms |
| GIN, `WHERE canonical_key % input` at 0.5 | 18 MB | 1.9 s | 2.4 ms |

GIN is 42% of the size, builds in under a third of the time, and answers between 9× and 66× faster depending on threshold.

## Decision

Use **GIN** (`gin_trgm_ops`) on `surnames.canonical_key`, and retrieve with a similarity threshold rather than with distance ordering.

## Why the canonical recommendation does not apply here

The one thing GiST offers that GIN does not is exactly the thing this feature must not do.

`<->` always returns the nearest neighbours, however far away they are. Measured on the real register, a four-character input has neighbours that are uniformly useless: `NOWK` returns `NOWS`, `NOWY`, `NOWE`, `NOWA` and `NOWC`, all real surnames, all at similarity 0.429, none of them a suggestion any reader would want. `docs/canonical/13` §21 already says a 1–3 character input does exact and known forms only; the measurement extends the same reasoning to 4–5 characters.

So the correct behaviour for an input with no near match is to return **nothing**, and a retrieval strategy built on a threshold expresses that directly. Under `<->` the threshold has to be applied after the fact, which pays GiST's cost and then discards its distinguishing feature.

§23.1's own wording anticipates this: it writes "Candidate:" rather than a requirement, and asks for GIN to be evaluated. This ADR is that evaluation, run on real data rather than deferred.

## Consequences

- An input whose best trigram similarity is below its length's threshold returns no candidates. That is deliberate and is asserted as an acceptance criterion, not a limitation to work around later.
- Top-K by distance is not available. Ranking is done in resolver code, where it belongs: `docs/canonical/13` §20.1 asks for edit-distance reranking after retrieval anyway, and the measurement says why — over 100 single-edit cases on real nine-to-eleven-character surnames, trigram order put the intended surname first in 53 while the resolver's rerank put it first in 80, so ordering by trigram distance in the database would be ordering by the wrong thing.
- If a later workload genuinely needs unthresholded nearest neighbours — historical archive query expansion is the plausible one (`docs/canonical/13` §19: "broad stages may still be used later") — a GiST index can be added alongside for that path. This ADR does not forbid it; it fixes the index for interactive resolution.
- Write amplification is lower than the canonical recommendation would have incurred, not higher. GIN on a text column of this size costs 18 MB against the table's 91 MB.

## Alternatives rejected

- **GiST as canonical says.** Rejected on the measurement: 33× the latency for a capability the feature deliberately does not use.
- **Both indexes.** Rejected: 61 MB and two indexes to maintain on one column, to avoid making a decision that the measurement already makes.
- **No index, sequential scan with `similarity()`.** Rejected without measuring in depth: a full scan of 598,476 rows per keystroke-adjacent query is not an interactive path, and `pg_trgm` exists precisely to avoid it.

## How to revisit this

Rebuild both indexes on the then-current register and re-run the three latency figures above. Replace this ADR if GIN's advantage has gone, or if a path appears that needs unthresholded top-K on the interactive surface. Do not revisit on the strength of §23.1's wording alone — that is what this ADR was written to answer.
