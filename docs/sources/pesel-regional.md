# PESEL regional surname resources — source record and `CURRENT_DISTRIBUTION` preflight

**Status: NOT ADOPTED · NOT INGESTED · NO DISTRIBUTION TASK WRITTEN.**

This is the read-only preflight record for a requested `CURRENT_DISTRIBUTION` truth-chain task
(TASK-008, 2026-09-19). The preflight found the capability **not actionable from current
repository evidence**, so no distribution truth-chain task file was created. This file records
what the repository actually knows about the *regional* PESEL resources, what is missing, and
the ordered prerequisites that would make a distribution task specifiable without guessing.

Ownership boundaries, unchanged by this file:

- the **decision** record is D-004 in `docs/DECISIONS_NEEDED.md`;
- the **national** PESEL source record is `docs/sources/pesel.md`;
- this file owns only the regional resources and the distribution-capability gap.

## How this record was built

Every fact below comes from evidence already committed to this repository. Nothing was
downloaded, and no regional data row was read by this session.

| Evidence | What it gave |
|---|---|
| `fixtures/pesel/source-manifest.json` → `regional_resources_not_ingested` | resource ids, checksums, byte sizes, endpoints, portal timestamps, observed header row |
| `docs/sources/acquisition/2026-09-18/metadata/pesel_regional_2026_*.official_resource.json` | the genuine `api.dane.gov.pl` resource objects — title, description, `data_date`, `regions`, `contains_protected_data`, formats, and the full attribute key set |
| `docs/sources/acquisition/2026-09-18/metadata/pesel_regional_2026_*.json` | the acquisition tool's own per-resource record, including its CSV structure inspection |
| `docs/sources/acquisition/2026-09-18/ACQUISITION_REPORT.md`, `SHA256SUMS.txt` | download outcomes for the regional pair and for TERYT TERC/SIMC |
| `docs/sources/pesel.md`, `docs/DECISIONS_NEEDED.md` (D-001, D-004), `PROGRESS.md` | the project's own verified national record and open decisions |
| `tasks/003-*.md`, `tasks/004-*.md`, and the task files on the sibling branches (see "Repository state") | what each accepted task does and explicitly does not do |
| `packages/db/src/generated/db.ts`, `packages/db/migrations/`, `packages/sources/src/schema.ts` | what actually exists in the schema and the parser |
| `docs/canonical/10` §5.2 · `11` §5, §6, §11, §12, §20.3, §32 · `12` §2.1, §9.4–§9.9, §10, §11 · `14` §13.1, §27.1, §29, §47, §58 · `23` §24, §60 | the canonical requirements a distribution capability must satisfy |
| `ARCHITECTURE.md` §2–§6, §10 · `PRODUCT.md` §5, §7, §10 · `PLAN.md` | invariants, product promises and sequencing |

**No session has read the regional bytes inside this repository.** The two files are not
committed (`AGENTS.md` §6 — raw source files stay out), the archive holding them is on the
project owner's machine, and `dane.gov.pl` has been network-egress-blocked in every session.
Where a fact below rests on the acquisition tool's inspection output rather than on the
project's own byte verification, it is labelled as such: that output is retained as evidence of
what an external tool observed, not as a Name Atlas assertion
(`docs/sources/acquisition/2026-09-18/README.md`).

## Verdict

**No approved production source contains geographic surname distribution, and three
independent prerequisites are missing. `CURRENT_DISTRIBUTION` cannot be specified honestly
today.**

1. **The approved source is national and has no geographic field.** The ingestion target is the
   national pair `1148808`/`1148811`: header `Nazwisko aktualne,Liczba`, two columns, portal
   `regions = Polska`.
2. **A current regional candidate exists but is unadopted.** Resources `1148786`/`1148790`
   (`data_date = 2026-01-20`, voivodeship level) are real, official and current — and explicitly
   gated: D-004 open, resource-level licence unconfirmed (D-004, D-007), excluded by TASK-004,
   and `PRODUCT.md` §10 still records that no lawful genuinely current regional dataset is
   established.
3. **The candidate carries no geographic identifier.** Its geography column holds an uppercase
   Polish voivodeship *name string*. There is no TERYT code, no ISO 3166-2, no code of any kind.
4. **There is no canonical geography to point at.** No `places`, `place_names`,
   `administrative_memberships` or `entity_external_ids` table exists on any branch; no TERYT
   connector exists; no TERC data is ingested, fixtured or rights-recorded.
5. **The semantics a distribution task must encode are unverified.** Per-cell suppression,
   presence of zero rows, the distinct geography value set, and the relationship between
   regional sums and national counts have never been observed from the bytes.

Writing TASK-008 today would require inventing geographic identity, guessing suppression
semantics, and stating a reconciliation invariant nobody has observed — each forbidden by
`ARCHITECTURE.md` §10 and `AGENTS.md` §9, and each explicitly forbidden by the request itself.

## Repository state as found (2026-09-19)

Recorded because it materially affects what a distribution task could depend on. The working
tree of the designated branch does **not** contain TASK-005, TASK-006 or any TASK-007; the
preflight located them on sibling branches, all forked from the same commit (`a528773`).

| Branch | Carries | Relevant to distribution |
|---|---|---|
| `claude/elegant-archimedes-w5ony1` (this branch) | TASK-001–003 implemented; TASK-004 **specified only**. Schema: `knowledge_entities`, `surnames`, `name_forms`, view `resolvable_name_forms`. No `sources`, `source_records`, `distribution_snapshots`, `distribution_values`, no truth-layer table. | The Truth Layer a distribution chain must extend does not exist here at all. |
| `origin/claude/sharp-bohr-ld17v3` | TASK-004, TASK-005 (`CURRENT_POPULATION` truth chain, migration `0004`, `packages/truth`) and TASK-006 (read API, first accepted contract) implemented and verified; ADR-0003, ADR-0004; D-008/D-009/D-010 resolved. | The `Claim`/`Evidence`/`Confidence`/`Citation` architecture a distribution claim must reuse. Still **no** geography: every `distribution_values.place_id` is null and every snapshot is `NATIONAL`. |
| `origin/claude/inspiring-johnson-x88mbo` | An independently produced `docs/sources/pesel-regional.md` recording the same not-actionable verdict, plus `tasks/007-pesel-regional-source-spike.md` — the regional source spike, specified but **not executed**. | The prerequisite spike is already specified there. It should be reconciled with this file on merge rather than duplicated. |

**Consequence.** The preconditions the request names — "TASK-005 Truth Layer", "TASK-006 read
boundary", "TASK-007 repository build baseline" — are not all satisfiable as stated. TASK-005 and
TASK-006 exist on one sibling branch. No task numbered 007 concerns workspace build
compatibility anywhere; number 007 is taken on the other sibling branch by the regional source
spike. The nearest real item is a carried-forward note from TASK-006: `apps/web` pins
`next build --webpack` because Turbopack cannot resolve the workspace packages' `.js`-extension
specifiers, and the clean fix (compiling packages to `dist`) was deliberately left out of that
task's scope. That is a genuine, separable piece of work. It is not a prerequisite for
distribution and is not specified here.

## Question-by-question findings

Answers to the fifteen questions the request required be settled from repository evidence
before any task file could be written.

| # | Question | Finding | Status |
|---|---|---|---|
| 1 | Does an approved production source contain geographic surname distribution? | **No.** The approved pair is national: `PESEL_HEADER = "Nazwisko aktualne,Liczba"`, `PESEL_COLUMN_COUNT = 2` (`packages/sources/src/schema.ts`), portal `regions = [{name: "Polska"}]`. The regional pair sits on the same dataset and is not approved: D-004 open; TASK-004 excludes regional ingestion; `docs/canonical/12` §9.8 requires the connector to declare `capabilities.regional_distribution = false` unless the *ingested* resource contains verified regional fields. | VERIFIED (negative) |
| 2 | Exact source | `dane.gov.pl` dataset `1681` ("Nazwiska występujące w rejestrze PESEL"), publisher Ministerstwo Cyfryzacji (institution `333`), resources `1148786` (*Nazwiska męskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20*) and `1148790` (*Nazwiska żeńskie …*). **Candidate, not approved.** | VERIFIED (existence) |
| 3 | Source version / snapshot / date | `data_date = 2026-01-20` (PESEL reference date, identical to the national pair). Portal `created` = `modified` = `verified` = `2026-01-28T13:32:49Z` (male) / `2026-01-28T13:35:13Z` (female). `retrieved_at` = `2026-09-18T17:43:16Z` / `17:42:32Z`. Media-file `last_modified` header `Thu, 29 Jan 2026 08:03:11 GMT` (male). Five distinct concepts; none inferred from another. | VERIFIED |
| 4 | Geographic granularity available | **Voivodeship (województwo) only — a single level.** Column 1 is `Województwo zameldowania na pobyt stały`; the observed header has exactly three columns. No powiat, no gmina, no locality. National totals are a separate resource pair, not a row in this file. | VERIFIED |
| 5 | Available stable geographic identifiers | **None. A name string only.** The acquisition tool's inspection recorded three headers and, in its five sample rows of each file, an uppercase voivodeship name (`DOLNOŚLĄSKIE`). There is no code column. The complete distinct value set, its size, exact spellings and whether any non-voivodeship category exists (no registered permanent residence, residence abroad, unknown) are **not verified**. | shape VERIFIED; value set NOT VERIFIED |
| 6 | Is TERYT or another official identifier system present or required? | **Required, absent.** `docs/canonical/11` §6.2: `DistributionValue.place_id` references `Place`, null only for a national aggregate, with `source_geography_key` holding the raw region identifier. §5.1 defines `Place`; §20.3 and §32 require external IDs (`EntityExternalId`, `provider_key = TERYT`) — "Same text name does not mean same place". `docs/canonical/12` §11 makes locally ingested TERYT TERC the canonical current administrative backbone. **In the repository:** no `places`, `place_names`, `administrative_memberships` or `entity_external_ids` table on any branch (`packages/db/src/generated/db.ts`; `GeographyColumns`/`GeometryColumns`/`SpatialRefSys` are PostGIS side tables, not domain geography); no TERYT connector; `packages/places` is planned for M3 (`docs/CODEMAP.md`). TERC (`teryt_terc__1cfbb50ebf97.zip`, 132,136 B) and SIMC were downloaded into the owner's archive but are not ingested, fixtured or rights-recorded here, and `teryt_wmrodz` failed (`HTML_ERROR_PAGE_NOT_DATA`). GUS's terms are recorded as verified free for commercial entities at `docs/canonical/12` §2.1 (snapshot 2026-09-17), not re-verified by this project. Because the resource carries no code, a name → TERC correspondence must be established from TERYT data and **never typed from memory**. | REQUIRED; NOT AVAILABLE |
| 7 | What each count actually represents | Column `Liczba`. The publisher's dataset notes say "liczba wystąpień" — occurrences of a current-surname value among living persons, deceased excluded. That one occurrence equals one living person is **not stated**. This is exactly TASK-004 §14 **U-4**, still open, and the reason ADR-0004 (sibling branch) emits `SURNAME_OCCURRENCES` rather than `"PEOPLE"` at the contract boundary. | UNRESOLVED (same open item as national) |
| 8 | Does the source distinguish surname forms or sex? | **It partitions into two resources** — "nazwiska męskie" / "nazwiska żeńskie", each described as *"Wykaz nazwisk męskich/żeńskich osób żyjących (wg pola nazwisko aktualne) … w podziale na województwa"*. Whether the partition is by bearer's sex or by grammatical gender of the surname form is **not stated** (TASK-004 §14 **U-1**). The two partitions must never be summed; TASK-004 enforces this structurally by giving them different `comparability_group` values. | PRESENT; basis UNRESOLVED |
| 9 | Are low counts suppressed? | Dataset-level rule: single-occurrence surnames are excluded ("Nazwiska z pojedynczą liczbą wystąpień … nie zostały uwzględnione"), confirmed for the *national* files directly from bytes — no row with `Liczba ≤ 1` exists (`PESEL_MIN_VALID_COUNT = 2`). **Whether the rule applies per (surname, voivodeship) cell or only to the national count is not stated, and the regional minimum has never been observed.** The acquisition tool's own warning on both regional records: "Regional cell suppression and reconciliation with national totals require review." | NOT VERIFIED for the regional grain |
| 10 | Are zero, missing, unavailable and suppressed distinguishable? | **Not from the resource.** An absent (surname, voivodeship) cell is any of: zero bearers, a suppressed small cell, or out of scope. Whether explicit `0` rows exist is not verified (the national files contain none). The binding rule holds regardless: absence or suppression is never zero (`ARCHITECTURE.md` §10 invariant 4; `docs/canonical/11` §6.2 "Critical rule"; `docs/canonical/12` §9.5 `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT`). A distribution result must therefore carry distinct typed states; it cannot derive them from row absence alone until item 9 is settled. | NOT VERIFIED; rule binding |
| 11 | Applicable source rights / publication restrictions | Dataset `1681` carries `license_name = "CC0 1.0"`. **Resource-level metadata carries no licence, rights or terms attribute at all** — verified negative across the full attribute key set of both regional resources. Both carry `contains_protected_data: false`, a portal flag and not a legal review. D-004: resource-level inheritance of CC0 "must be confirmed with the publisher before any regional adoption"; D-007 holds the same gap for the national pair and keeps `commercial_use = UNKNOWN`, `review_status = LEGAL_REVIEW_REQUIRED`, which blocks paid surfaces by `docs/canonical/12` §6.4. No `RightsProfile` exists for the regional resources. **Binding semantic restriction** (project owner, D-004 and `docs/sources/pesel.md`): the dimension is voivodeship of *permanent registered residence* and must never be presented as origin, ancestry, birthplace, historical distribution, or unqualified current physical residence. `docs/canonical/11` §34.1 additionally notes tiny-count geography may require surface suppression. | dataset-level VERIFIED; resource-level UNRESOLVED |
| 12 | Does TASK-004 already ingest the geographic data? | **No.** TASK-004 writes `geography_level = 'NATIONAL'` and `place_id = null` for every row, and its §8 excludes regional/voivodeship ingestion and `Place`/`PlaceName`/`PlaceGeometry`/`AdministrativeMembership`. Where implemented (sibling branch) the importer hard-codes `geography_level: "NATIONAL"`, `place_id: null`, `source_geography_key: null`, and its verified run recorded 0 rows with a non-null `place_id`. The parser hard-codes the two-column shape, so a three-column regional file **fails closed today** — correct behaviour, and direct proof the shape is unhandled. On this branch TASK-004 is not implemented at all. | VERIFIED (negative) |
| 13 | Is a separate geographic ingestion prerequisite required? | **Yes, and it is not a small extension.** Required before any regional `DistributionValue` can exist: the D-004 adoption decision; resource-level rights confirmation; TASK-004 implemented; a regional source spike settling items 5, 9, 10 and the reconciliation relationship; a voivodeship `Place` foundation with TERYT external IDs; then a regional importer writing `geography_level = 'REGION'` snapshots. Required before any regional *claim*: the Truth Layer, which does not exist on this branch. | VERIFIED |
| 14 | How geographic evidence should fit the Claim/Evidence/Confidence/Provenance architecture | The chain is unchanged and must be **reused, not duplicated**: `Source → SourceRecord → EvidenceItem → Claim → ClaimEvidence → ConfidenceAssessment → Citation`, with rights evaluated separately per surface (`ARCHITECTURE.md` §3, §5, §10 invariants 1–2). Storage: one surname-scoped `DistributionSnapshot` with `geography_level = 'REGION'` and one `DistributionValue` per region carrying `place_id`, `source_geography_key` and `count`, derived columns null unless a versioned derivation writes them (`docs/canonical/11` §6.1–§6.2). Claim type `CURRENT_DISTRIBUTION`: subject `Surname`, structured value place/count/rate, epistemic type FACT, expected evidence "approved dated regional dataset", typical confidence VERIFIED (`docs/canonical/11` §11; `14` §13.1, §27.1, §47); generated deterministically without an LLM "when source exists" (`14` §58); evidence type `OFFICIAL_DATASET_FIELD` per D-008's resolution. `REGIONAL_CONCENTRATION` is a separate derived claim. Naming note: `docs/canonical/12` §10 writes `VOIVODESHIP / POWIAT / GMINA` while `11` §6.1's enum is `NATIONAL, REGION, DISTRICT, MUNICIPALITY, LOCALITY, MIXED`; `11` is the data-model authority and the implemented enum matches it. | VERIFIED (specification); NOTHING IMPLEMENTED |
| 15 | Do current population and regional distribution share snapshot semantics? | **Partly, and the difference matters.** Both resource pairs carry the same `data_date = 2026-01-20` and the same sex partition, so `as_of_date`, `universe_description` and the partition caveat carry across unchanged. They are **not** the same snapshot: `DistributionSnapshot` is surname-scoped and per resource version (`ARCHITECTURE.md` §10 invariant 3; ADR-0003 on the sibling branch), so a regional import produces its own snapshot rows, its own `source_record`, its own `methodology_key` and its own `comparability_group`. A national count and a regional distribution are two of the four things `docs/canonical/10` §5.2 forbids collapsing, and `PRODUCT.md` §7 rule 5 forbids presenting a national count as regional distribution. Any reconciliation between them is therefore an **observation to be measured**, never an equality to assume — see item 9. | VERIFIED (specification) |

## Regional resource facts

| | Male `1148786` | Female `1148790` |
|---|---|---|
| Title | *Nazwiska męskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20* | *Nazwiska żeńskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20* |
| Publisher description (verbatim) | "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL (bez zgonów) w podziale na województwa, stan na 20.01.2026" | "Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL w podziale na województwa, stan na 20.01.2026" |
| `data_date` | `2026-01-20` | `2026-01-20` |
| `created` / `modified` / `verified` | `2026-01-28T13:32:49Z` (all three) | `2026-01-28T13:35:13Z` (all three) |
| `retrieved_at` (owner's run) | `2026-09-18T17:43:16Z` | `2026-09-18T17:42:32Z` |
| Native format / size | XLSX, 12,159,696 B | XLSX, 13,158,936 B |
| CSV (portal conversion) size | 16,615,897 B | 17,900,370 B |
| CSV SHA-256 | `0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51` | `cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989` |
| CSV endpoint | `https://api.dane.gov.pl/resources/1148786,nazwiska-meskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20/csv` | `https://api.dane.gov.pl/resources/1148790,nazwiska-zenskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20/csv` |
| Observed header row | `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` | same |
| Portal `regions` | `Polska` (`region_id` `85633723`) | same |
| Portal `contains_protected_data` | `false` | `false` |
| Resource-level licence attribute | **absent** (no licence/rights/terms key exists) | **absent** |
| Data rows — *acquisition tool's inspection, not verified in-repo* | 646,052 | 694,553 |
| First sample row — *acquisition tool, not verified in-repo* | `DOLNOŚLĄSKIE,NOWAK,5548` | `DOLNOŚLĄSKIE,NOWAK,5757` |

Not known about either file, because no session has read its bytes here: encoding and BOM as
observed (the tool reports strict UTF-8 compatibility and a null BOM; its `quotechar: "\""` is a
parser default, not an observation), line-ending convention, quoting, sort order, the distinct
voivodeship values and their row counts, minimum and maximum `Liczba`, presence of `0` or `1`,
duplicate (voivodeship, surname) pairs, Unicode artefacts, and the relationship between a
surname's regional sum and its count in the same-sex national resource.

## What is missing, in dependency order

Items 1 and 2 are decisions, not engineering. Nothing below them substitutes for them.

1. **D-004 adoption decision** (project owner): whether registered-domicile voivodeship
   geography, framed with the binding restriction, is an acceptable basis for a current
   distribution capability at all. `docs/canonical/12` §10 Scenario C (no lawful regional data)
   is a fully supported MVP state; `docs/canonical/23` §24 and §60 say the map chapter is marked
   unavailable, not faked, and does not block the MVP.
2. **Resource-level rights confirmation** (project owner, with the publisher): whether dataset
   `1681`'s CC0 1.0 dedication covers resources `1148786`/`1148790`. Absence of a contrary field
   is not a grant (D-004, D-007). The same enquiry would answer U-4.
3. **TASK-004 implemented on the branch that will carry the work** — `Source`, `RightsProfile`,
   `SourceRecord`, `DistributionSnapshot`, `DistributionValue` and the national importer.
   Specified here; implemented on `origin/claude/sharp-bohr-ld17v3`.
4. **TASK-005 Truth Layer implemented on that same branch** — `EvidenceItem`, `Claim`,
   `ClaimEvidence`, `ConfidenceAssessment`, `Citation`, `ResearchRun` and the deterministic
   derivation service. A distribution chain must extend this, never fork it.
5. **Regional source facts** — items 5, 9, 10 of the findings table plus the reconciliation
   relationship, verified from the bytes and recorded with a real fixture. **This is the
   smallest prerequisite; it is proposed below.**
6. **Voivodeship `Place` foundation** — `places` plus `entity_external_ids` carrying TERYT TERC
   codes, and whatever subset of `place_names`/`administrative_memberships` the mapping needs,
   populated from TERYT data with recorded provenance, so `DistributionValue.place_id` has
   something canonical to reference. Currently planned for M3 (`docs/CODEMAP.md`), so pulling it
   forward is itself a sequencing decision for the project owner.
7. **Regional ingestion** — a three-column schema description and fail-closed validator in
   `packages/sources`, plus an importer writing `geography_level = 'REGION'` snapshots with one
   value per region, on the TASK-004 pattern: checksum-pinned, idempotent, atomic per resource,
   sex partition preserved verbatim, nothing summed.
8. **Only then** the `CURRENT_DISTRIBUTION` truth chain. Its acceptance criteria for geographic
   identity, suppression, missing-versus-zero and reconciliation can only be written honestly
   once items 5 and 6 exist.

## Proposed smallest prerequisite — regional source spike (proposal only)

**No task file was created for this.** `AGENTS.md` §8 requires this session to stop after its
own task, and `origin/claude/inspiring-johnson-x88mbo` already carries an equivalent
specification at `tasks/007-pesel-regional-source-spike.md`. That file should be reconciled and
reused rather than forked; this section records the shape the work must take so the proposal
stands on its own if that branch is discarded.

**Goal.** Establish from the actual bytes, with a small real fixture, exactly what the two
regional resources contain — so D-004 can be decided on facts and a later ingestion task can be
specified without guessing. The pattern is TASK-002 applied to `1148786`/`1148790`.

**Precondition.** The project owner supplies both CSV files; the session verifies SHA-256 and
byte size against `fixtures/pesel/source-manifest.json` **before reading a single row**. Network
egress to `dane.gov.pl` is not assumed. D-004 stays open; the spike informs it and does not
decide it.

**In scope.**

1. File-level facts mirroring `docs/sources/pesel.md`: checksum, size, encoding, BOM, delimiter,
   quoting, line endings, exact header, column count on every row, row count, sort order,
   malformed rows, Unicode notes.
2. **Geography column:** the complete distinct value list with exact spelling and per-value row
   count; whether the two files' sets are identical; whether any value is not a voivodeship
   (no registered residence, abroad, unknown), recorded verbatim and uninterpreted.
3. **Suppression and zero:** minimum and maximum `Liczba`; the number of rows at the minimum;
   presence of `0` or `1`; and whether the single-occurrence exclusion applies per cell,
   established by comparing per-surname regional sums against the same surname's count in the
   same-sex **national** resource. Reported as an observation with its numbers — equal, lower or
   higher, how often and by how much — never as a rule the publisher did not state.
4. **Surname set:** whether every regional surname string appears in the same-sex national
   resource and vice versa; duplicate (voivodeship, surname) pairs. Matching is byte-identical on
   the raw field: no resolver, no normalisation, no case or diacritic folding.
5. **Rights:** the outcome of the publisher enquiry for resource-level licence, or that it is
   still pending. Nothing approved.
6. **Geographic identity groundwork, evidence only:** from checksum-verified TERYT TERC data,
   record the current voivodeship TERC codes and official names against the strings observed in
   item 2, with the comparison method and the TERC file's own identity. No table, no `Place` row.
   Codes are read from the data, never typed from memory.
7. **Fixtures:** real, verbatim regional rows covering every distinct geography value, one
   common surname across all its voivodeships, a diacritic surname, the minimum observed count,
   and any Unicode artefacts — committed only if the recorded rights position permits it, and
   never synthesised.
8. This record promoted item by item from NOT VERIFIED to verified or `UNRESOLVED — <reason>`;
   D-004 updated with findings only.

**Out of scope.** Any ingestion, validator, `Place`, `EntityExternalId`, migration, TERYT
connector, snapshot, evidence or claim; any map, UI, API, rank, share or concentration; summing
or comparing the two sex partitions; deciding D-004; approving a `RightsProfile`; committing raw
source files; reading any other source in the archive.

**Definition of done.** Every unverified item above is either verified with the command and
output that established it, or explicitly unresolved with the reason. Nothing is guessed, and
nothing the publisher did not state is attributed to the publisher.

## What this session did not do

- Did not create `tasks/008-current-distribution-truth-chain.md`, and did not create a task file
  of any other number.
- Did not download, read, parse or fixture either regional resource.
- Did not verify the voivodeship value set, suppression grain, zero rows or reconciliation —
  every such row above is marked NOT VERIFIED.
- Did not write, change or delete any code, migration, fixture, dependency or test.
- Did not merge, cherry-pick or alter the sibling branches.
- Did not decide D-004, change its status, or approve any rights posture.
- `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and
  `prompts/` are untouched.
