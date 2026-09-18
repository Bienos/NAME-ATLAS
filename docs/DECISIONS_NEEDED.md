# DECISIONS_NEEDED.md — unresolved decisions

Only decisions that **materially affect implementation** and are not yet resolved. Speculative future choices do not belong here.

Resolved decisions move to `docs/adr/` and are deleted from this file.

Status legend: **BLOCKS TASK-00N** · **BLOCKS MILESTONE** · **NON-BLOCKING NOW**

---

## D-001 — RESOLVED (TASK-002)

**Resolution:** the exact official PESEL surname source is pinned, understood, and safety-railed. Full detail: `docs/sources/pesel.md`.

- **Dataset:** `dane.gov.pl` dataset `1681` ("Nazwiska występujące w rejestrze PESEL"), slug `1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel`, publisher institution `333` (Ministerstwo Cyfryzacji), licence CC0 1.0, updated yearly.
- **National production resources (the ingestion target):** male `1148808` ("Nazwiska męskie - stan na 2026-01-20"), female `1148811` ("Nazwiska żeńskie - stan na 2026-01-20"), both `data_date = 2026-01-20`.
- **File-level facts, verified directly from the actual downloaded bytes:** SHA-256 checksums, exact byte sizes, UTF-8 encoding (no BOM), comma delimiter, no quoting, CRLF line endings, exact header (`Nazwisko aktualne,Liczba`), 2 columns, row counts (408,182 male / 420,082 female), sort order, value ranges, and — directly from the bytes, not just from portal metadata — that no row has `Liczba ≤ 1`, corroborating the suppression rule.
- **Semantics confirmed:** living persons only, current-surname field, single-occurrence surnames excluded, missing row ≠ zero (`BELOW_PUBLICATION_THRESHOLD_OR_ABSENT`).
- **Deliverables:** `fixtures/pesel/national-male-2026-01-20.csv` and `national-female-2026-01-20.csv` (22/23 real rows each, verbatim from source, covering common surnames, Polish diacritics, the real suppression boundary, foreign-script surnames, a combining-mark artefact, an embedded-slash surname, and a trailing-whitespace artefact), `fixtures/pesel/source-manifest.json` (machine-readable metadata), and `@name-atlas/sources` (`packages/sources`) — a schema description and fail-closed parser/validator, tested against both real fixtures and a deliberately mutated case per drift category (21 tests, all passing).

**How it was resolved:** `dane.gov.pl`/`api.dane.gov.pl` remained network-egress-blocked for every session that worked this task (confirmed repeatedly: `WebFetch` → `EGRESS_BLOCKED`, `curl` → `CONNECT tunnel failed, response 403`, DNS resolves fine so this is a policy block, not a connectivity fault). The project owner manually retrieved the dataset metadata, then the resource listing, then the two actual national CSV files, and supplied each directly. Nothing was fabricated, inferred, or reconstructed from the canonical corpus to fill a gap at any stage; every item that could not yet be verified was carried forward as explicitly unresolved until the next supply closed it. No mirror or third-party source was used; no different (e.g. deceased-inclusive) dataset was substituted; no 2025-or-earlier resource was substituted for the current 2026 one.

**Two narrow residual items, carried forward as non-blocking notes for TASK-004 (not reasons this item is reopened):**

1. The literal per-resource download URL string was never supplied and is not guessed (`fixtures/pesel/source-manifest.json` records this explicitly). The resource IDs and checksum-pinned bytes are already verified, so TASK-004 does not need to guess or re-derive a URL to proceed.
2. The portal/dataset "updated" timestamp (`created`/`modified`/`verified`/`retrieved_at`) was never supplied at dataset or resource level, so it cannot be compared against the verified resource reference date (`data_date = 2026-01-20`). TASK-004's ingestion logic has a real resource reference date to use; the portal timestamp remains a distinct, still-unknown fact and must not be assumed equal to `data_date`.

The rarity/`1-in-X` denominator question from this decision's original scope (below) is a TASK-004/TASK-005 modelling decision, not a source-verification fact, and remains open for whichever task designs `RARITY_CONTEXT`.

**Original decision, for reference:** the source is the `dane.gov.pl` dataset *"Nazwiska występujące w rejestrze PESEL"*, dataset 1681, published by the Ministry of Digital Affairs, covering surnames of living people using the current-surname field, omitting surnames occurring only once, excluding deceased people, updated annually, national not regional. What had to be pinned before ingestion — resource ID(s) and file(s), the resource structure, the resource reference date distinct from the portal update date, a checksum, reuse/attribution metadata, and the absence-is-not-zero semantics — is now resolved as recorded above, except the two residual items noted.

**Why it blocked:** ingesting before this was pinned would have produced a `DistributionSnapshot` with unverifiable provenance and a rarity claim that may be arithmetically invalid. That risk is now closed for the national production pair.

Do not revisit unless the 2026 resources are superseded by a new annual snapshot (a routine, expected refresh — repeat this verification for the new resource, do not assume it matches this record) or a resource-level fact recorded above is found to be wrong on closer inspection.

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

**Status:** Source *existence* now VERIFIED (see below). Adoption decision, framing, and all implementation remain BLOCKED/future scope. NON-BLOCKING for the paid MVP critical path.
**Owner:** project owner (data licensing + framing decision).

### Update — current regional resource identified (project-owner-supplied, via TASK-002)

While verifying the national PESEL production resources for D-001, the project owner identified a current, official, dated regional resource pair on the same `dane.gov.pl` dataset 1681: male resource `1148786`, female resource `1148790`, both dated `2026-01-20` (same reference date as the national pair). Full detail: `docs/sources/pesel.md`.

**This verifies that a current, lawful, official regional PESEL resource exists** — the specific fact `docs/canonical/10` §5.2 flagged as unestablished. This is a narrower finding than "D-004 is resolved": it answers *whether a current source exists*, not *whether/how Name Atlas should use it*. The "Preferred" path below is accordingly closer than it was, but the decision below — and everything about actually building a map — is still open, and **no map, regional claim, or regional ingestion logic was built or is authorised by this finding.**

**Hard semantic restriction, established by the project owner and binding on any future use of this resource:** the regional dimension is *województwo zameldowania na pobyt stały* — voivodeship of **permanent registered residence** (a legal registration record) for the current-surname holder. It must never be presented as: surname origin, ancestry, birthplace, historical distribution, or (without qualification) necessarily current physical residence — registered domicile and actual current residence can differ. Any future claim built on this resource must state that exact scope, not a looser gloss.

No lawful, genuinely current regional surname dataset is established (`docs/canonical/10` §5.2). The open PESEL surname dataset is national.

Decision required — one of:

- **Preferred** — licence a lawful dataset with appropriately current counts at voivodeship/powiat or equivalent level. **A candidate now exists** (resources `1148786`/`1148790` above) — the remaining decision is whether registered-domicile geography, framed with the restriction above, is an acceptable basis for a "current regional distribution" product feature, and on what licence terms (resource-level licence not yet independently confirmed — assumed to inherit the dataset-level CC0 1.0 unless resource metadata states otherwise, which has not been checked).
- **Fallback A** — use an older regional dataset, labelled with its actual snapshot date (e.g. "regional distribution in the 2014 PESEL snapshot"), clearly marked as not current;
- **Fallback B** — ship without modern regional distribution, keeping current national count → rarity → origin/meaning → historical evidence.

**Forbidden regardless of decision:** distributing a current national total across regions using old proportions and presenting the result as current fact. Current national count, current regional distribution, older regional distribution and historical occurrence map are four distinct things and must never be collapsed. Presenting registered-domicile geography as surname origin, ancestry, birthplace, historical distribution, or unqualified current physical residence is equally forbidden (see restriction above).

Until the adoption/framing decision above is made, the current map stays conditional, no map is built, and the product ships without it. TASK-002 and every task before M2's current-geography capability must not implement any regional-distribution logic on the strength of this finding alone.

---

## D-005 — RESOLVED (TASK-001)

**Resolution:** pin `postgis/postgis:16-3.4@sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5` everywhere PostgreSQL is needed — local development, CI and Testcontainers.

- The digest was confirmed against Docker Hub's registry API at implementation time (not guessed): PostgreSQL 16, PostGIS 3.4.2.
- Used in `packages/testing/src/postgres-container.ts` (`POSTGRES_TEST_IMAGE`, Testcontainers), and in `.github/workflows/ci.yml`'s `services.postgres` block (same tag+digest, kept in sync by comment).
- Because `postgis/postgis` is built on top of the official `postgres` image, it carries every contrib module the stock image ships, including `pg_trgm`, in addition to PostGIS — one image satisfies both extensions.
- The bootstrap migration (`packages/db/migrations/0001_bootstrap_extensions.ts`) runs `CREATE EXTENSION IF NOT EXISTS postgis` and `CREATE EXTENSION IF NOT EXISTS pg_trgm`. Both are asserted present by `tests/integration/src/extensions.test.ts` (querying `pg_extension`), not by eye.
- Locally, this was additionally cross-checked against `postgresql-16` + the `postgresql-16-postgis-3` apt package (PostgreSQL 16.13, PostGIS 3.4.2) — see PROGRESS.md for why, and for the exact verification performed against a real database.

No further action needed. Do not revisit unless the pinned digest is deliberately rotated (a new ADR-0002-adjacent decision, not a re-litigation of the choice of image).

---

## Reviewed and not blocking TASK-001

Recorded so they are not re-raised:

- **Deployment host / blueprint details** — `docs/canonical/23` §6 recommends a single EU hosting plane. TASK-001 only needs CI and a local database; no hosting account is required to complete it.
- **Contract generator and OpenAPI version** — contract *semantics* are canonical (`docs/canonical/16` §1.3); generator choice is implementation detail, decided when contracts are actually built at M2.
- **Build orchestrator (Turborepo or equivalent)** — explicitly optional (`docs/canonical/23` §7). Not needed at TASK-001.
- **Analytics tooling** — decided in `docs/canonical/18`; not implemented before M2 and consent-gated when it is.
- **Payment provider** — decided in `docs/canonical/20`; irrelevant until M6 and deliberately blocked until premium inventory is proven.
