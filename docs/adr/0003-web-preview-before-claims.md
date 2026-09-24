# ADR-0003 — Web preview shows stored PESEL figures before the claim chain exists

- **Status:** Accepted (temporary — see "Exit")
- **Date:** 2026-09-24
- **Deciders:** project owner ("Real data, honestly labelled", chosen in the session that built the landing page)
- **Relates to:** ARCHITECTURE.md §6 and §10; D-006; TASK-004

## Context

The project owner asked for a landing page where a visitor enters a surname and then sees what the atlas holds for it now. What exists is the exact resolver (TASK-003) and the PESEL national lists stored as surname-scoped snapshots with raw counts (TASK-004). No `EvidenceItem`, `Claim`, `ConfidenceAssessment` or `Citation` exists, and TASK-005 is blocked on D-006.

ARCHITECTURE.md §6 says the frontend consumes validated presentation objects only and never receives raw evidence. Taken strictly, the results page could show that the surname resolved and nothing else. The owner was offered that option and chose to show the stored figures instead, honestly labelled.

## Decision

The web results page (`/en/surname?name=…`) may render the stored PESEL figures before the claim chain exists, under these constraints:

1. **The read lives in the owning package.** `readPeselRegister` (`packages/sources/src/pesel/read.ts`) returns one entry per current (`ACTIVE`) PESEL resource record: the published `Liczba` unchanged, or `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT`. The web app selects no sources and interprets nothing itself. It runs read-only, inside a `READ ONLY` transaction.
2. **No derivation.** No total across the two lists, no rank, share, rarity or rate, and no comparison between the lists (`peselCoverageNotes`).
3. **Honest units.** Figures are called occurrences, never people, until D-006 is resolved. The page says why.
4. **Scope and date always attached** (§10 invariant 5), with the publisher's wording available verbatim.
5. **Absence is not zero** (§10 invariant 4). The page says so wherever a list omits the surname.
6. **No confidence is shown**, because none has been assessed. The Atlas Thread's nodes are not confidence marks.
7. **Never indexed.** The page sends `noindex, nofollow`.

## Consequences

- The preview is useful now and stays truthful: every figure on it is published data with its scope and date.
- It is a second path from stored data to the screen, beside the claim chain that §6 and §10 invariant 1 describe. That is the cost, and it is why this decision is temporary.
- The PESEL rights profile still records `LEGAL_REVIEW_REQUIRED` (no legal review has been performed). This preview is not a paid surface. Putting it on a public production deployment should wait for that review (§10 invariant 13).

## Exit

When TASK-005 (or its successor) publishes `CURRENT_POPULATION` claims, replace `readPeselRegister` on the results page with the claim-backed projection. At that point the page shows confidence and citations from the claim chain, and this ADR is superseded.
