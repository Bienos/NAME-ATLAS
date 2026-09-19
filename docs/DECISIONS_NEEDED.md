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

**Status:** Source *existence* now VERIFIED (see below). Adoption decision, framing, and all implementation remain BLOCKED/future scope. NON-BLOCKING for the paid MVP critical path. **BLOCKS any `CURRENT_DISTRIBUTION` task** — see the 2026-09-19 preflight update below.
**Owner:** project owner (data licensing + framing decision).

### Update — current regional resource identified (project-owner-supplied, via TASK-002)

While verifying the national PESEL production resources for D-001, the project owner identified a current, official, dated regional resource pair on the same `dane.gov.pl` dataset 1681: male resource `1148786`, female resource `1148790`, both dated `2026-01-20` (same reference date as the national pair). Full detail: `docs/sources/pesel.md`.

**This verifies that a current, lawful, official regional PESEL resource exists** — the specific fact `docs/canonical/10` §5.2 flagged as unestablished. This is a narrower finding than "D-004 is resolved": it answers *whether a current source exists*, not *whether/how Name Atlas should use it*. The "Preferred" path below is accordingly closer than it was, but the decision below — and everything about actually building a map — is still open, and **no map, regional claim, or regional ingestion logic was built or is authorised by this finding.**

### Update — regional resource bytes and metadata now observed (2026-09-19), adoption still open

The same verification run that closed D-001's residual items also covered the regional pair. Now recorded in `fixtures/pesel/source-manifest.json` under `regional_resources_not_ingested`: SHA-256 checksums (`0eb31d19…1b51` male, `cd0c100e…6989` female), byte sizes (16,615,897 / 17,900,370), official download and metadata endpoints, portal timestamps (`created`/`modified`/`verified` = `2026-01-28T13:32:49Z` male, `13:35:13Z` female; `retrieved_at` `2026-09-18`), native format XLSX, and the **observed** header row `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` — read from the actual bytes, not assumed.

**The licence question below is not closed and got sharper, not softer.** The resource-level metadata returned by `api.dane.gov.pl` for these resources carries **no licence, rights or terms attribute at all** (checked across the full attribute set of both regional and both national resources). Licence is stated only at dataset level. So dataset-level CC0 1.0 remains the only licence statement on record, and "the resource inherits it" remains an assumption this project has not verified — it must be confirmed with the publisher before any regional adoption, not inferred from the absence of a contrary field.

**Nothing about adoption changed.** The regional files were not copied into the repository, not parsed, not fixtured, and no regional logic exists. Observing bytes is not authorisation to use them; the decision below is still the gate.

### Update — `CURRENT_DISTRIBUTION` truth-chain preflight (2026-09-19): not actionable, no task file written

A planning session was asked to specify a `CURRENT_DISTRIBUTION` truth-chain task (requested as "TASK-007") and to first determine from repository evidence whether an approved source contains surname distribution by geography. Full record: `docs/sources/pesel-regional.md`.

**Finding:** the approved production source (national pair `1148808`/`1148811`) contains no geography. The regional pair above is the only candidate, and it cannot support the task yet:

- it carries **no administrative code** — column 1 is an uppercase voivodeship name string (observed: `DOLNOŚLĄSKIE`); the full value set is unverified; the repository has no `places`, no `entity_external_ids`, no TERYT data and no place connector, so canonical geographic identity cannot be assigned without inventing it;
- **suppression semantics are unverified** — whether the single-occurrence exclusion applies per (surname, voivodeship) cell or nationally is unstated, the minimum `Liczba` was never inspected, and the relationship between regional sums and national counts is unknown; the acquisition tool itself flagged both for review;
- resource-level licence remains unconfirmed (above);
- the tables and code the chain must build on do not exist: TASK-004 (`DistributionSnapshot`/`DistributionValue`, `Source`, `RightsProfile`, `SourceRecord`) is specified but not implemented; TASK-005 (`EvidenceItem`/`Claim`/`ConfidenceAssessment`/`Citation`) is neither specified nor implemented.

**Consequently no distribution truth-chain task file was created.** The gate for a distribution capability is now enumerated, in order: (1) the adoption decision below; (2) resource-level rights confirmation; (3) TASK-004 implemented; (4) TASK-005 implemented; (5) a **PESEL regional source spike** (the smallest prerequisite — evidence and fixtures only, TASK-002 pattern; now specified as `tasks/007-pesel-regional-source-spike.md`, not started); (6) a voivodeship `Place` foundation with TERYT external IDs; (7) regional ingestion; (8) the truth chain itself. Steps 5 and 1–2 can proceed in parallel — the spike produces the suppression, reconciliation and value-set facts this decision needs, without adopting anything.

**Not decided here:** adoption, framing, rights posture. The spike was numbered TASK-007 at the project owner's request; the distribution truth chain itself has no number yet. The reviewed plan's own TASK-007 is the search/profile API, and its TASK-006 is complete current-surname intelligence; a distribution task is not numbered anywhere in `PLAN.md` or the reviewed plan (current geography is "Track B — research/license; if unavailable: not blocking").

**Hard semantic restriction, established by the project owner and binding on any future use of this resource:** the regional dimension is *województwo zameldowania na pobyt stały* — voivodeship of **permanent registered residence** (a legal registration record) for the current-surname holder. It must never be presented as: surname origin, ancestry, birthplace, historical distribution, or (without qualification) necessarily current physical residence — registered domicile and actual current residence can differ. Any future claim built on this resource must state that exact scope, not a looser gloss.

No lawful, genuinely current regional surname dataset is established (`docs/canonical/10` §5.2). The open PESEL surname dataset is national.

Decision required — one of:

- **Preferred** — licence a lawful dataset with appropriately current counts at voivodeship/powiat or equivalent level. **A candidate now exists** (resources `1148786`/`1148790` above) — the remaining decision is whether registered-domicile geography, framed with the restriction above, is an acceptable basis for a "current regional distribution" product feature, and on what licence terms (resource metadata has now been checked and carries no licence field at all, so resource-level licence is still not independently confirmed — see the 2026-09-19 update above).
- **Fallback A** — use an older regional dataset, labelled with its actual snapshot date (e.g. "regional distribution in the 2014 PESEL snapshot"), clearly marked as not current;
- **Fallback B** — ship without modern regional distribution, keeping current national count → rarity → origin/meaning → historical evidence.

**Forbidden regardless of decision:** distributing a current national total across regions using old proportions and presenting the result as current fact. Current national count, current regional distribution, older regional distribution and historical occurrence map are four distinct things and must never be collapsed. Presenting registered-domicile geography as surname origin, ancestry, birthplace, historical distribution, or unqualified current physical residence is equally forbidden (see restriction above).

Until the adoption/framing decision above is made, the current map stays conditional, no map is built, and the product ships without it. TASK-002 and every task before M2's current-geography capability must not implement any regional-distribution logic on the strength of this finding alone.

### Findings — `CURRENT_DISTRIBUTION` preflight (2026-09-19). Status and decision unchanged.

A read-only preflight was run for a requested `CURRENT_DISTRIBUTION` truth-chain task. It found the capability **not actionable from current repository evidence** and wrote no task file. Findings only; this does not narrow or widen the decision above. Full record: `docs/sources/pesel-regional.md`.

What the preflight established from committed evidence:

- **The candidate resources carry no geographic identifier.** The geography column holds an uppercase voivodeship *name string*; there is no TERYT code, no ISO 3166-2, no code of any kind. Canonical requires `DistributionValue.place_id` → `Place` with a TERYT external ID (`docs/canonical/11` §6.2, §20.3, §32; `12` §11), and no `places`, `place_names`, `administrative_memberships` or `entity_external_ids` table exists, nor any TERYT connector or ingested TERC data. A voivodeship-name → TERC correspondence must be established from TERYT data and never typed from memory.
- **Granularity is one level only** — voivodeship. No powiat, no gmina, no locality.
- **The suppression grain is unverified.** The single-occurrence exclusion is confirmed for the *national* files from their bytes; whether it applies per (surname, voivodeship) cell, and whether any `0` or `1` rows exist regionally, has never been observed. The acquisition tool's own warning on both regional records: "Regional cell suppression and reconciliation with national totals require review."
- **Reconciliation with national totals is an observation nobody has made**, so no equality invariant between regional sums and national counts may be assumed or specified.
- **The resource-level licence gap is confirmed negative again**, from the full attribute key set of both regional resource objects: no licence, rights or terms attribute exists at resource level. This is the same gap D-007 tracks for the national pair.
- **`Liczba` means the same unverified thing regionally as nationally** — the publisher's "liczba wystąpień", occurrences, not stated people (TASK-004 §14 U-4, open). The male/female partition basis is likewise unstated (U-1, open), so the two partitions must never be summed.
- **No accepted task ingests geographic data.** TASK-004 writes `geography_level = 'NATIONAL'` and `place_id = null` for every row and excludes regional ingestion; the parser hard-codes the two-column national shape, so a three-column regional file fails closed today.

Consequence for sequencing: before any `CURRENT_DISTRIBUTION` task can be specified honestly, the decision above and the resource-level rights question must be answered, the Truth Layer must exist on the branch carrying the work, the regional bytes must be verified by a source spike — now specified as `tasks/008-pesel-regional-source-spike.md`, which informs this decision without deciding it — and a voivodeship `Place` foundation with TERYT external IDs must exist. Pulling that foundation forward from M3 is itself a sequencing decision for the project owner. `docs/canonical/12` §10 Scenario C and `docs/canonical/23` §24 remain fully supported: the map chapter is marked unavailable, not faked, and does not block the MVP.

### Findings — TASK-008 regional source spike, execution attempt BLOCKED (2026-09-19). Status and decision unchanged.

The spike was attempted and stopped at its own environment gate: the two regional CSV files were not supplied, and `api.dane.gov.pl`, `dane.gov.pl`, `api.stat.gov.pl` and `eteryt.stat.gov.pl` are all policy-blocked at the network gateway — DNS resolves to `185.41.93.178`, the CONNECT tunnel is refused with 403. The same block D-001 recorded for TASK-002. Supply remains manual. Full record with the commands and their output: `docs/sources/pesel-regional.md`.

Three acceptance items that do not depend on the bytes were completed, and they add findings here:

- **The resource-level licence gap is now confirmed by an auditable check, not an eyeball.** A recursive key scan of both regional resource objects for `licen[cs]|rights|terms|condition|copyright|reuse|attribution|waiver|cc0`, excluding the JSON:API container key, returns **NONE** across all 34 attribute keys of each, including the nested `files` and `supplements` arrays. At dataset level `license_name` is the bare string `CC0 1.0` while `license_chosen` is `null` and every `license_condition_*` field is empty, `false` or `null`. This sharpens the gap: there is no resource-level grant to inherit and no stated condition set at dataset level either. The publisher confirmation this decision and D-007 require is still not reported.
- **`special_signs` is empty on all four 2026 resources**, national and regional. The portal supports declaring special signs — the vocabulary for marking a suppressed, unavailable or not-applicable cell in band — and these resources declare none. This is evidence about the metadata, not the bytes: a suppressed regional cell would have to be represented by row absence rather than by any declared marker. It does not establish what the bytes contain.
- **The publisher's suppression wording does not address the per-cell grain.** The dataset `notes` field says, in full, that "Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu" — surnames with a single occurrence, and data on deceased persons, were not included in the compilation. It is written once, at dataset level, for a dataset holding both national and regional resources, and says nothing about (surname, voivodeship) cells. So whether the exclusion applies per cell cannot be answered from the publisher's text in either direction; only the bytes, reconciled against the national counts, can settle it. Attributing either reading to the publisher would be fabrication.
- **Each resource offers three representations** — XLSX native, CSV, and a JSON-LD roughly 44 times the CSV's size. Any future ingestion must keep pinning the bytes it actually parses and must not treat the three as interchangeable.

Nothing was adopted, ingested, fixtured or approved. No TERC code was read or written. The manifest was deliberately left unedited, because everything the spike would add to it is bytes-dependent.

### Findings — TASK-008 EXECUTED, regional bytes verified (2026-09-19). Status and decision still unchanged.

The project owner supplied both regional CSV files and both full national files. Each was checksum-verified against `fixtures/pesel/source-manifest.json` before any row was read. 23 of the spike's 27 acceptance items are now verified from the bytes. Full record, with every command and figure: `docs/sources/pesel-regional.md`, section "TASK-008 executed". Nothing was ingested, no `RightsProfile` exists, and this decision's status, options and adoption gate are untouched.

**Two findings materially change what an adoption decision is choosing between.**

**1. Suppression is per cell — previously unresolved, now settled from the bytes.** `Liczba` never falls below 2 and no row carries 0 or 1, in either file. The publisher's single-occurrence exclusion therefore applies to each (surname, voivodeship) cell, not only to the national count. About a fifth of all rows — 19.7% male, 21.6% female — sit exactly at that boundary of 2. Consequently **53.8% of national male surnames and 50.8% of female have no regional row at all**, and a surname with over a thousand bearers nationally can still be entirely absent. An absent cell means zero, or one suppressed bearer, or a bearer with no voivodeship value; never a confirmed zero.

**2. The 16 voivodeship values do not account for the national totals, and per-cell suppression cannot explain the gap.** Male: 21,197,537 nationally against 16,590,111 across all cells, leaving **4,607,426 bearers (21.74%) in no voivodeship row**. Female: 4,263,939 (19.78%). Suppression caps out at 684,961 and 676,743 respectively. The decisive proof: all 3,106 male and 3,561 female surnames present in **all 16** voivodeships — where suppression can hide nothing at all — are still short, by 971,775 and 849,705 bearers, a median of 10.2% and 8.1% of their national counts. `NOWAK` has a row in every voivodeship and is short by 11,418.

**A second mechanism exists and the publisher does not state what it is.** Candidates consistent with the field's own name, *voivodeship of permanent registered residence*: bearers with no permanent registration in Poland, bearers registered abroad, or a further undocumented exclusion. `UNRESOLVED`; none may be asserted.

**The gap is systematically biased**, which is what makes it a decision input rather than a footnote. Coverage rises from 78.6% for surnames with 2–9 male bearers to 89.3% above 10,000, and individual surnames diverge far more sharply: `MELNYK` 6,442 national against a regional sum of 210, `KOVALCHUK` 5,382 against 66, `SHEVCHENKO` 5,217 against 69, `BOIKO` 4,616 against 56, `NGUYỄN` 3,730 against 169 — against `NOWAK` at 86,969 of 98,387. Any regional surface built on this resource understates every region, unevenly, and most severely for surnames of recent-migration origin. That sharpens the binding restriction already recorded above: for some surnames this dimension describes only a small minority of their bearers, so even a correctly labelled "registered domicile" map would mislead unless the residual is shown alongside it.

**The only reconciliation invariant the source supports** is `regional sum ≤ national count`, which holds for every surname with zero exceptions in either file. Equality holds for roughly a quarter of surnames and must never be asserted or enforced.

**Still blocking, both on one missing input.** The geography column carries no administrative code of any kind, so a voivodeship-name to TERYT TERC correspondence could not be established: the TERC archive file was not supplied and `api.stat.gov.pl` and `eteryt.stat.gov.pl` are egress-blocked. No TERC code was read or written. A voivodeship `Place` foundation therefore remains unspecifiable, and the resource-level licence confirmation is still not reported.

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

## D-008 — RESOLVED (TASK-005 implementation, 2026-09-19)

**Resolution: Option A — `docs/canonical/11` binds. `docs/canonical/14`'s MODEL CHANGE PROPOSALS are not ratified and are not implemented.**

Decided by the project owner, 2026-09-19. Concretely:

- `EvidenceType` is `docs/canonical/11` §9.5's 9-member enum; the PESEL value is `OFFICIAL_DATASET_FIELD`, **not** `docs/canonical/14` §4's `OFFICIAL_DATASET_VALUE`.
- `EvidenceItem` carries §9.5's fields only. No `directness`, `evidence_scope`, `extraction_method`, `extraction_version`, `extraction_confidence`, `independence_group_id` or `source_authority_class` (14-A).
- `ClaimEvidence.relationship` is `SUPPORTS | CONTRADICTS | CONTEXT` (§10.2). No `QUALIFIES`, `CONTEXTUALISES` or `LEAD_ONLY` (14-D).
- The `CURRENT_POPULATION` payload uses `docs/canonical/14` §14.1's field naming (`count`, `distribution_snapshot_id`, `country_code`, `snapshot_date`, `source_population_scope`) — the dedicated claim-payload section, and the only one carrying `source_population_scope`.

**No ADR is required**, because nothing here deviates from a canonical specification: this selects the ratified schema over a document's own unratified proposals. `docs/canonical/14` §29.1's dataset caveats are carried by its second branch — "SourceRecord scope metadata" — which TASK-004 already persists on `distribution_snapshots.universe_description` and `coverage_notes`.

Adding a proposal field later is an additive, nullable-column migration. Do not revisit unless a proposal is actually ratified.

---

## D-009 — RESOLVED (TASK-005 implementation, 2026-09-19)

**Resolution: Option A — create a minimal synchronous `research_runs` table now.**

Decided by the project owner, 2026-09-19.

`docs/canonical/11` §248 marks `ResearchRun` **P0** and §22.1 gives its schema. `PLAN.md`'s M3 item is the *asynchronous runtime* — `ResearchModuleRun`, the outbox, Redis/Valkey, BullMQ — not the audit record itself. Creating the audit record at M1 therefore reconciles the two rather than deviating from either, and it is what makes `docs/canonical/14` §19's "why does Name Atlas currently believe this?" answerable at all.

Scope of what was built:

- One row per derivation invocation, written synchronously by the derivation service.
- `run_type = 'BASIC_SURNAME'`, `run_status` and `qa_status` set from the run's real outcome.
- `prompt_manifest` and `model_manifest` are stored as **empty JSON objects**, because no prompt and no model exist at M1. That emptiness is recorded in `PROGRESS.md` and must not later be read as "no prompt was used but one could have been" — it means the fields were genuinely inapplicable.
- No queue, no outbox, no module runs, no scheduler. Those remain M3.

`EvidenceItem.created_by_run_id` and `Claim.created_by_run_id` are consequently NOT NULL as `docs/canonical/11` specifies, with no lineage gap. **No ADR is required** — nothing deviates from a canonical specification.

---

## D-010 — RESOLVED (2026-09-19)

**Resolution: Option B — widen the unit enum. PESEL-derived `CURRENT_POPULATION` responses carry `SURNAME_OCCURRENCES`, not `"PEOPLE"`.**

Decided by the project owner, 2026-09-19. Recorded in full, with the rejected alternatives and the conditions for revisiting, in **`docs/adr/0004-population-value-unit.md`**.

This **deviates from `docs/canonical/16` §26**, which fixes the unit as a single-member literal `"PEOPLE"`. The deviation exists because the publisher describes *"liczba wystąpień"* — occurrences — and never states that one occurrence is one living person (TASK-004 §14 **U-4**, still open). Since `ARCHITECTURE.md` §6 forbids the frontend from deriving facts, the unit is fixed at the contract boundary, so a response built literally to §26 would publish an assertion the truth layer beneath it is forbidden to make.

`"PEOPLE"` remains in the enum, unused. It is what PESEL switches to if U-4 is answered affirmatively — a change of emitted value, not of schema. The contract schema must carry a comment pointing at ADR-0004.

`tasks/006-surname-result-read-api.md` is unblocked by this. **D-007 remains open** and the publisher enquiry is still worth sending: it is the route to answering U-4, and to opening the paid surface.

---

## Reviewed and not blocking TASK-001

Recorded so they are not re-raised:

- **Deployment host / blueprint details** — `docs/canonical/23` §6 recommends a single EU hosting plane. TASK-001 only needs CI and a local database; no hosting account is required to complete it.
- **Contract generator and OpenAPI version** — contract *semantics* are canonical (`docs/canonical/16` §1.3); generator choice is implementation detail, decided when contracts are actually built at M2.
- **Build orchestrator (Turborepo or equivalent)** — explicitly optional (`docs/canonical/23` §7). Not needed at TASK-001.
- **Analytics tooling** — decided in `docs/canonical/18`; not implemented before M2 and consent-gated when it is.
- **Payment provider** — decided in `docs/canonical/20`; irrelevant until M6 and deliberately blocked until premium inventory is proven.
