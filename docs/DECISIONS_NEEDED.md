# DECISIONS_NEEDED.md — unresolved decisions

Only decisions that **materially affect implementation** and are not yet resolved. Speculative future choices do not belong here.

Resolved decisions move to `docs/adr/` and are deleted from this file.

Status legend: **BLOCKS TASK-00N** · **BLOCKS MILESTONE** · **NON-BLOCKING NOW**

---

## D-001 — Exact production PESEL resource, scope and version metadata

**Status:** BLOCKS TASK-004 (PESEL ingestion). Does not block TASK-001.
**Owner:** project owner + TASK-002 source spike.

What is settled (`docs/canonical/12` §2.1): the source is the `dane.gov.pl` dataset *"Nazwiska występujące w rejestrze PESEL"*, dataset 1681, published by the Ministry of Digital Affairs. It covers surnames of living people using the current-surname field, omits surnames occurring only once, excludes deceased people, is updated annually, and was updated 2026-01-28. It is national, not regional.

What is not settled and must be pinned before ingestion:

- exact resource ID(s) and file(s) to import, and whether male and female surnames are separate resources;
- the resource structure: headers, column types, encoding, delimiter;
- the **resource reference date** as distinct from the **portal/dataset updated date** — both are needed, and they are not the same field;
- checksum of the exact file imported;
- reuse/attribution metadata sufficient to populate a `RightsProfile`;
- the denominator to be used for any `1-in-X` claim, and whether its population universe is actually compatible with the dataset's universe (living PESEL entries with a current-surname field) — if not, rarity is expressed as rank/percentile only;
- how "absent from the dataset" is represented, given single-occurrence suppression. Absence is not zero; a state such as `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` is required.

**Why it blocks:** ingesting before this is pinned produces a `DistributionSnapshot` with unverifiable provenance and a rarity claim that may be arithmetically invalid.

---

## D-002 — Onomastics rights and source strategy

**Status:** BLOCKS the meaning/etymology capability (M2 onward). NON-BLOCKING for M0–M1.
**Owner:** project owner (commercial/legal outreach).

IJP PAN's *Internet Dictionary of Polish Surnames* is the strongest specialist source, but (`docs/canonical/12` §2.1, `docs/canonical/10` §5.3):

- its PESEL frequency/geography base is **2014**, so it is not a current-data source;
- being free to read establishes no permission for bulk commercial ingestion, caching or redistribution — status is partnership-required / legal-review.

Decision required:

- **Path A** — secure a commercial licence or partnership with IJP PAN or another specialist onomastic rights holder; or
- **Path B** — build meaning/origin claim-by-claim from lawful scholarly and public-domain sources, accepting lower coverage and more `INSUFFICIENT_DATA` results.

Either way, define what the product shows when neither path yields evidence for a surname. The answer must be an honest gap, never a generated etymology.

---

## D-003 — Polona rights per surface: metadata, OCR/transcription, image

**Status:** BLOCKS M3 (historical discovery). NON-BLOCKING now.
**Owner:** project owner + rights review, informed by the TASK-010 Polona spike.

Polona exposes object-level rights and they differ per object (`docs/canonical/12` §16.4). Three permissions must be modelled and evaluated **independently**: `metadata_rights`, `transcription_rights` (OCR), `image_rights`.

Decision required:

- the default posture when an object's rights are unknown or unreadable (proposed: fail closed — internal use only, no free/premium/SEO surface);
- whether OCR text extracted from a public-domain scan may be stored, excerpted and cited, and at what length;
- whether scans may be reproduced at all, or only linked with a stable locator;
- which surfaces (free / premium / SEO / share) each permission combination unlocks;
- attribution text and format required per rights state.

Consequence if unresolved: historical evidence can be discovered but not lawfully surfaced, which turns M3 into internal-only work.

---

## D-004 — Current regional surname map availability

**Status:** BLOCKS the current-geography capability indefinitely. NON-BLOCKING for the paid MVP critical path.
**Owner:** project owner (data licensing).

No lawful, genuinely current regional surname dataset is established (`docs/canonical/10` §5.2). The open PESEL surname dataset is national.

Decision required — one of:

- **Preferred** — licence a lawful dataset with appropriately current counts at voivodeship/powiat or equivalent level;
- **Fallback A** — use an older regional dataset, labelled with its actual snapshot date (e.g. "regional distribution in the 2014 PESEL snapshot"), clearly marked as not current;
- **Fallback B** — ship without modern regional distribution, keeping current national count → rarity → origin/meaning → historical evidence.

**Forbidden regardless of decision:** distributing a current national total across regions using old proportions and presenting the result as current fact. Current national count, current regional distribution, older regional distribution and historical occurrence map are four distinct things and must never be collapsed.

Until this is resolved, the current map stays conditional and the product ships without it.

---

## D-005 — Local/CI PostgreSQL image providing PostGIS and pg_trgm

**Status:** **BLOCKS TASK-001** if it cannot be satisfied.
**Owner:** TASK-001 implementation session — resolve in-task, do not escalate unless it fails.

TASK-001 must provide a PostgreSQL environment where both `postgis` and `pg_trgm` can be enabled, locally and in CI, and where Testcontainers can start the same image (ADR-0002; `docs/canonical/23` §12).

To be settled by the implementing session, then recorded in `PROGRESS.md`:

- the exact image and tag used (a PostGIS-bundled PostgreSQL image is expected, since `postgis` is not present in the stock image);
- the same image is used by local development, CI and Testcontainers — no divergence;
- both extensions are enabled by the bootstrap migration and the enablement is asserted by a test.

This is the only item on this list that genuinely blocks TASK-001, and it is expected to be resolvable within the task. If it cannot be — for example the CI runner cannot pull or run the image — stop and report rather than substituting a stock PostgreSQL image without PostGIS.

---

## Reviewed and not blocking TASK-001

Recorded so they are not re-raised:

- **Deployment host / blueprint details** — `docs/canonical/23` §6 recommends a single EU hosting plane. TASK-001 only needs CI and a local database; no hosting account is required to complete it.
- **Contract generator and OpenAPI version** — contract *semantics* are canonical (`docs/canonical/16` §1.3); generator choice is implementation detail, decided when contracts are actually built at M2.
- **Build orchestrator (Turborepo or equivalent)** — explicitly optional (`docs/canonical/23` §7). Not needed at TASK-001.
- **Analytics tooling** — decided in `docs/canonical/18`; not implemented before M2 and consent-gated when it is.
- **Payment provider** — decided in `docs/canonical/20`; irrelevant until M6 and deliberately blocked until premium inventory is proven.
