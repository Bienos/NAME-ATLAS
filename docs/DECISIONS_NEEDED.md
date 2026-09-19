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

**Both previously-carried residual items are now CLOSED (2026-09-19).** They are recorded here so the history is readable; neither is outstanding work.

1. **Download URLs — CLOSED.** The literal per-resource endpoints are now recorded verbatim in `fixtures/pesel/source-manifest.json` (`official_source_url`, `official_source_media_file_url`, `official_resource_metadata_url`) for all four resources. They were read from genuine `api.dane.gov.pl` JSON:API metadata captured during the project owner's acquisition run, not constructed by this session from a URL pattern.
2. **Portal timestamps — CLOSED.** Resource-level `created`/`modified`/`verified` are `2026-01-28T13:47:34Z` (male `1148808`) and `2026-01-28T13:48:39Z` (female `1148811`); `retrieved_at` is `2026-09-18T17:40:00Z` and `2026-09-18T17:39:46Z` respectively. The comparison the residual asked for can now be made and the answer is that they differ: the portal timestamps are **eight days later** than the PESEL reference date `data_date = 2026-01-20`. The four concepts stay distinct fields and must still never be inferred from one another.

**One new source fact established while closing these (not a residual, a finding):** the resource's **native published format is XLSX**; the CSV that Name Atlas pins is a portal-generated conversion served from the official `csv_download_url` endpoint. Both checksum-pinned CSVs were independently corroborated along a second acquisition path (the project owner's automated run, archive generated `2026-09-18T17:44:29Z`, verified 46/46 against its own `SHA256SUMS.txt`) and matched `fixtures/pesel/source-manifest.json` byte-for-byte. TASK-004 must continue to pin the CSV bytes it actually parses by checksum, and must not assume CSV and XLSX are interchangeable without re-verification.

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

### Update — regional resource bytes and metadata now observed (2026-09-19), adoption still open

The same verification run that closed D-001's residual items also covered the regional pair. Now recorded in `fixtures/pesel/source-manifest.json` under `regional_resources_not_ingested`: SHA-256 checksums (`0eb31d19…1b51` male, `cd0c100e…6989` female), byte sizes (16,615,897 / 17,900,370), official download and metadata endpoints, portal timestamps (`created`/`modified`/`verified` = `2026-01-28T13:32:49Z` male, `13:35:13Z` female; `retrieved_at` `2026-09-18`), native format XLSX, and the **observed** header row `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` — read from the actual bytes, not assumed.

**The licence question below is not closed and got sharper, not softer.** The resource-level metadata returned by `api.dane.gov.pl` for these resources carries **no licence, rights or terms attribute at all** (checked across the full attribute set of both regional and both national resources). Licence is stated only at dataset level. So dataset-level CC0 1.0 remains the only licence statement on record, and "the resource inherits it" remains an assumption this project has not verified — it must be confirmed with the publisher before any regional adoption, not inferred from the absence of a contrary field.

**Nothing about adoption changed.** The regional files were not copied into the repository, not parsed, not fixtured, and no regional logic exists. Observing bytes is not authorisation to use them; the decision below is still the gate.

**Hard semantic restriction, established by the project owner and binding on any future use of this resource:** the regional dimension is *województwo zameldowania na pobyt stały* — voivodeship of **permanent registered residence** (a legal registration record) for the current-surname holder. It must never be presented as: surname origin, ancestry, birthplace, historical distribution, or (without qualification) necessarily current physical residence — registered domicile and actual current residence can differ. Any future claim built on this resource must state that exact scope, not a looser gloss.

No lawful, genuinely current regional surname dataset is established (`docs/canonical/10` §5.2). The open PESEL surname dataset is national.

Decision required — one of:

- **Preferred** — licence a lawful dataset with appropriately current counts at voivodeship/powiat or equivalent level. **A candidate now exists** (resources `1148786`/`1148790` above) — the remaining decision is whether registered-domicile geography, framed with the restriction above, is an acceptable basis for a "current regional distribution" product feature, and on what licence terms (resource metadata has now been checked and carries no licence field at all, so resource-level licence is still not independently confirmed — see the 2026-09-19 update above).
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

## D-006 — RESOLVED (TASK-004 specification, 2026-09-19)

**Resolution:** one `SourceRecord` per **resource version**; `external_record_id` stays the publisher's bare resource id; the uniqueness key becomes `(source_id, external_record_id, content_hash)`. Recorded in full, with the rejected alternatives and their costs, in **`docs/adr/0003-source-record-granularity.md`**.

The decision resolves a genuine contradiction between two canonical documents — `docs/canonical/12` §3.1/§9.2 (version-scoped `BULK_DATASET` import) versus `docs/canonical/11` §37.2's row-scoped worked example — and deliberately deviates from `docs/canonical/11`'s `UNIQUE source_records(source_id, external_record_id)` index line, which cannot coexist with the annual-refresh supersession requirement in `docs/canonical/12` §9.3 and `ARCHITECTURE.md` §10 invariant 6. ADR-0003 is the authority; the migration must carry a comment pointing at it.

No further action needed. Do not revisit except on the two conditions ADR-0003 names.

---

## D-007 — PESEL resource-level licence confirmation (gates paid surfaces, not ingestion)

**Status:** NON-BLOCKING for TASK-004 and M1. **BLOCKS M5/M6** — no PESEL-derived evidence may enter a paid report until this is closed.
**Owner:** project owner (publisher contact + legal review).

Split out of TASK-004 §14 U-2 when the project owner answered that item on 2026-09-19. U-2 settled *what posture to seed now*; it deliberately did **not** settle the underlying licence question, which is this entry.

### The gap

Licence is stated by the publisher at **dataset** level only: dataset `1681` carries `license_name = "CC0 1.0"`, read from the portal's own dataset metadata. The **resource**-level metadata returned by `api.dane.gov.pl` carries **no licence, rights or terms attribute at all** — checked across the full attribute set of all four 2026 resources (both national, both regional) and recorded in `fixtures/pesel/source-manifest.json` under `licence_provenance`. The same gap is noted from the regional angle in D-004.

"The resource inherits the dataset licence" is therefore an assumption this project has not verified. It is very probably correct — an open-government portal publishing a dataset under CC0 does not usually intend its resources to be differently licensed — but *probably correct* is not the standard for a term that a paid product would rely on.

### Current posture (already in effect, TASK-004 §14 U-2)

The seeded PESEL `RightsProfile` carries `commercial_use = UNKNOWN`, `redistribution = UNKNOWN` and `review_status = LEGAL_REVIEW_REQUIRED`. By `docs/canonical/12` §6.4 this sets `evidence.paid_surface_eligible = false` automatically, so the gate is already closed in code rather than by memory. Ingestion, internal use and the free surface are unaffected — the only hard gate on ingestion is `automated_access == PROHIBITED`, which is not met.

### What closing this requires

1. Confirmation from Ministerstwo Cyfryzacji, or from a portal term that binds resources to their dataset's licence, that resources `1148808` and `1148811` are covered by the dataset's CC0 1.0 dedication.
2. A read of dane.gov.pl's own terms of use — not yet done, and also the residual behind `automated_access = ALLOWED` in the same profile.
3. A legal review of commercial reuse, at which point `review_status` may move off `LEGAL_REVIEW_REQUIRED` and `commercial_use` / `redistribution` off `UNKNOWN`.

Because `RightsProfile` is versioned and immutable once applied (`docs/canonical/11` §9.4), closing this creates a **new** profile rather than editing the seeded one.

### Do not

- Do not set `commercial_use = ALLOWED` on the strength of the dataset-level statement alone. That is precisely the inference this entry exists to prevent.
- Do not treat the absence of a resource-level licence field as permission. Absence of a contrary field is not a grant — the same reasoning D-004 already records.

---

## Reviewed and not blocking TASK-001

Recorded so they are not re-raised:

- **Deployment host / blueprint details** — `docs/canonical/23` §6 recommends a single EU hosting plane. TASK-001 only needs CI and a local database; no hosting account is required to complete it.
- **Contract generator and OpenAPI version** — contract *semantics* are canonical (`docs/canonical/16` §1.3); generator choice is implementation detail, decided when contracts are actually built at M2.
- **Build orchestrator (Turborepo or equivalent)** — explicitly optional (`docs/canonical/23` §7). Not needed at TASK-001.
- **Analytics tooling** — decided in `docs/canonical/18`; not implemented before M2 and consent-gated when it is.
- **Payment provider** — decided in `docs/canonical/20`; irrelevant until M6 and deliberately blocked until premium inventory is proven.
