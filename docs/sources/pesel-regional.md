# PESEL regional surname resources — source record and `CURRENT_DISTRIBUTION` preflight

**Status: NOT ADOPTED · NOT INGESTED · NO DISTRIBUTION TASK WRITTEN · SPIKE BLOCKED ON SOURCE
SUPPLY.**

This document has two dated parts. The **preflight** below records why a `CURRENT_DISTRIBUTION`
truth chain is not actionable and what would make it so. The **TASK-008 execution attempt** at the
end records the regional source spike's outcome: blocked, because the source bytes were not
supplied and cannot be retrieved here, with three metadata-only acceptance items completed and
every other item marked unresolved with its reason.

This is the read-only preflight record for a requested `CURRENT_DISTRIBUTION` truth-chain task
(2026-09-19). The preflight found the capability **not actionable from current repository
evidence**, so no distribution truth-chain task file was created. The number 008 was
subsequently assigned, at the project owner's request, to the prerequisite source spike this
record proposes: `tasks/008-pesel-regional-source-spike.md`.

This file records what the repository actually knows about the *regional* PESEL resources, what
is missing, and the ordered prerequisites that would make a distribution task specifiable
without guessing.

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

Writing a distribution truth chain today would require inventing geographic identity, guessing
suppression semantics, and stating a reconciliation invariant nobody has observed — each
forbidden by `ARCHITECTURE.md` §10 and `AGENTS.md` §9, and each explicitly forbidden by the
request itself.

## Repository state as found by the preflight, and since resolved (2026-09-19)

Recorded because it materially affects what a distribution task could depend on. **When the
preflight ran**, the working tree of the designated branch did not contain TASK-005, TASK-006 or
any TASK-007; the preflight located them on sibling branches, all forked from the same commit
(`a528773`). The table below is that finding, preserved as it stood.

**This has since been resolved.** Both sibling branches were merged into
`claude/elegant-archimedes-w5ony1` later the same day, so the Truth Layer a distribution chain
must extend now exists here: migrations `0003` and `0004`, `packages/truth`, `packages/contracts`,
ADR-0003 and ADR-0004. The sibling's `tasks/007-pesel-regional-source-spike.md` was superseded by
`tasks/008-pesel-regional-source-spike.md`. See `PROGRESS.md`. Prerequisites 3 and 4 in the list
below are therefore met; 1, 2, 5, 6 and 7 remain open, and 5 is still the blocker.

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
| 14 | How geographic evidence should fit the Claim/Evidence/Confidence/Provenance architecture | The chain is unchanged and must be **reused, not duplicated**: `Source → SourceRecord → EvidenceItem → Claim → ClaimEvidence → ConfidenceAssessment → Citation`, with rights evaluated separately per surface (`ARCHITECTURE.md` §3, §5, §10 invariants 1–2). Storage: one surname-scoped `DistributionSnapshot` with `geography_level = 'REGION'` and one `DistributionValue` per region carrying `place_id`, `source_geography_key` and `count`, derived columns null unless a versioned derivation writes them (`docs/canonical/11` §6.1–§6.2). Claim type `CURRENT_DISTRIBUTION`: subject `Surname`, structured value place/count/rate, epistemic type FACT, expected evidence "approved dated regional dataset", typical confidence VERIFIED (`docs/canonical/11` §11; `14` §13.1, §27.1, §47); generated deterministically without an LLM "when source exists" (`14` §58); evidence type `OFFICIAL_DATASET_FIELD` per D-008's resolution. `REGIONAL_CONCENTRATION` is a separate derived claim. Two forward constraints on any later surface: `docs/canonical/16` §70 requires every map to carry an explicit `layer_type`, whose `MapLayerType` union names `CURRENT_DISTRIBUTION` separately from `HISTORICAL_OCCURRENCES`, `HISTORICAL_DISTRIBUTION` and `MIGRATION_HYPOTHESIS`, and forbids the frontend inferring map meaning from visual geometry; `docs/canonical/17` §34 requires each of those to be tested for a correct label, time scope, source type and coverage caveat. Naming note: `docs/canonical/12` §10 writes `VOIVODESHIP / POWIAT / GMINA` while `11` §6.1's enum is `NATIONAL, REGION, DISTRICT, MUNICIPALITY, LOCALITY, MIXED`; `11` is the data-model authority and the implemented enum matches it. | VERIFIED (specification); NOTHING IMPLEMENTED |
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
   smallest prerequisite, now specified as `tasks/008-pesel-regional-source-spike.md`.**
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

## Smallest prerequisite — regional source spike, now specified as TASK-008

**Specified at `tasks/008-pesel-regional-source-spike.md`** (created 2026-09-19 at the project
owner's request, later in the same session as this record). That file is the scope authority; the
summary below is retained as its origin and is not maintained separately.

A sibling branch, `origin/claude/inspiring-johnson-x88mbo`, carries an equivalent specification
numbered 007, produced independently on the same date. On a merge, reconcile the two into one file
rather than keeping both. Nothing depends on the number.

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

- Did not create `tasks/008-current-distribution-truth-chain.md` or any other distribution
  truth-chain task file. Later in the same session, at the project owner's request, the
  prerequisite spike was specified as `tasks/008-pesel-regional-source-spike.md` — the spike, not
  the distribution chain.
- Did not download, read, parse or fixture either regional resource.
- Did not verify the voivodeship value set, suppression grain, zero rows or reconciliation —
  every such row above is marked NOT VERIFIED.
- Did not write, change or delete any code, migration, fixture, dependency or test.
- Did not merge, cherry-pick or alter the sibling branches.
- Did not decide D-004, change its status, or approve any rights posture.
- `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and
  `prompts/` are untouched.

---

# TASK-008 execution attempt — BLOCKED on source bytes (2026-09-19)

Scope authority: `tasks/008-pesel-regional-source-spike.md`. Its §12 requires the environment
dependency be checked first and the blocker reported rather than worked around. That check failed:
**the two regional CSV files were not supplied and cannot be retrieved in this environment**, so
every acceptance item that depends on the bytes is unresolved for the stated reason.

Three items that do **not** depend on the bytes were completed, and they produced new verified
facts. Nothing was fabricated, no fixture was committed, no manifest entry was changed, and no
code was touched.

## The blocker, with its actual output

**No source file is on disk.** A search of `/home/user`, `/root`, `/tmp`, `/mnt`, `/data` and the
session scratchpad to depth 4 for `*pesel*`, `*nazwisk*`, `NAME_ATLAS_ALL_DOWNLOADED_DATA*` and
`*teryt*`, excluding this repository's own docs, fixtures and packages, returned only task files:

```text
/home/user/NAME-ATLAS/tasks/004-pesel-surname-ingestion.md
/home/user/NAME-ATLAS/tasks/002-pesel-source-spike.md
/home/user/NAME-ATLAS/tasks/004-pesel-ingestion-source-rights.md
/home/user/NAME-ATLAS/tasks/008-pesel-regional-source-spike.md
```

**Egress is policy-blocked, not broken.** DNS resolves; the gateway refuses the CONNECT tunnel.

```text
$ getent hosts api.dane.gov.pl dane.gov.pl
185.41.93.178   api.dane.gov.pl
185.41.93.178   dane.gov.pl

$ curl -sS -I --max-time 45 "https://api.dane.gov.pl/resources/1148786,…/csv"
curl: (56) CONNECT tunnel failed, response 403
HTTP/1.1 403 Forbidden
```

The proxy's own status endpoint names the reason:

```json
"recentRelayFailures": [
  { "ts": "2026-09-19T16:13:09.936Z",
    "kind": "connect_rejected",
    "detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
    "host": "api.dane.gov.pl:443" }
]
```

All four hosts the task could use are blocked the same way — `HTTP 000`, CONNECT rejected with
403: `api.dane.gov.pl`, `dane.gov.pl`, `api.stat.gov.pl` and `eteryt.stat.gov.pl`. The last two
are the GUS TERYT routes, so the TERC alternative in the task's §3 item 6 is closed too, and the
archive copy of `teryt_terc__1cfbb50ebf97.zip` is not on disk either.

This reproduces exactly what D-001 recorded for TASK-002: a policy block, not a connectivity
fault. **Supply remains manual.** To unblock, the project owner supplies
`nazwiska_męskie…wojewodztwo_zameldowania.csv` and its female counterpart, whose SHA-256 and byte
size the implementing session verifies against the manifest before reading a single row.

## What was completed — items 20, 21, and the committed-metadata half of 22

All three were established from metadata already committed to this repository, by running checks
whose output is reproduced here. None of them is a substitute for the bytes.

### Item 22 — the licence position, re-confirmed auditably

A recursive key scan of both regional resource objects for any key matching
`licen[cs]|rights|terms|condition|copyright|reuse|attribution|waiver|cc0`, excluding the JSON:API
container key `attributes`:

```text
male_1148786:   licence/rights/terms keys anywhere in the object: NONE   (34 attribute keys)
female_1148790: licence/rights/terms keys anywhere in the object: NONE   (34 attribute keys)
```

The full 34-key list is identical for both resources and contains no rights field of any kind:
`category, contains_protected_data, created, csv_download_url, csv_file_size, csv_file_url,
data_date, description, download_url, downloads_count, file_size, file_url, files, format,
has_dynamic_data, has_high_value_data, has_high_value_data_from_ec_list, has_research_data,
is_chart_creation_blocked, jsonld_download_url, jsonld_file_size, jsonld_file_url, language, link,
media_type, modified, openness_score, regions, special_signs, supplements, title, verified,
views_count, visualization_types`. The scan covered the nested `files` and `supplements` arrays,
not just the top level.

At **dataset** level the licence fields are, verbatim:

| Field | Value |
|---|---|
| `license_name` | `CC0 1.0` |
| `license_chosen` | `null` |
| `license_description` | `''` |
| `license_condition_custom_description` | `''` |
| `license_condition_db_or_copyrighted` | `''` |
| `license_condition_default_cc40` | `false` |
| `license_condition_original` | `null` |
| `license_condition_personal_data` | `null` |
| `license_condition_timestamp` | `null` |
| `current_condition_descriptions` | `{}` |

So the dataset carries a bare `CC0 1.0` label with every condition field empty or unset, and the
resources carry no licence statement at all. **This sharpens the gap rather than closing it:** the
absence of a contrary field is still not a grant, and the publisher confirmation D-004 and D-007
require has not been reported. `UNRESOLVED — publisher confirmation not reported by the project
owner.`

### Item 20 — resource metadata restated, with facts not previously recorded

| | Male `1148786` | Female `1148790` |
|---|---|---|
| `data_date` | `2026-01-20` | `2026-01-20` |
| `created` = `modified` = `verified` | `2026-01-28T13:32:49Z` | `2026-01-28T13:35:13Z` |
| Native `format` / `file_size` | `xlsx`, 12,159,696 B | `xlsx`, 13,158,936 B |
| `csv_file_size` | 16,615,897 B | 17,900,370 B |
| `jsonld_file_size` | **722,529,033 B** | **793,494,377 B** |
| `formats` offered, with per-file openness score | xlsx 2 · csv 3 · jsonld 4 | xlsx 2 · csv 3 · jsonld 4 |
| `media_type` / `language` / `openness_score` | `file` / `pl` / `4` | `file` / `pl` / `4` |
| `category` | `Społeczeństwo` | `Społeczeństwo` |
| `regions` | `Polska`, `region_id` `85633723` | identical |
| `contains_protected_data` | `false` | `false` |
| `has_dynamic_data` · `has_high_value_data` · `has_high_value_data_from_ec_list` · `has_research_data` | all `false` | all `false` |
| `is_chart_creation_blocked` | `false` | `false` |
| `visualization_types` | `['table']` | `['table']` |
| **`special_signs`** | **`[]`** | **`[]`** |
| `supplements` | `[]` | `[]` |

Three findings here are new to this repository's record:

1. **Each resource offers three formats, not one.** The pinned CSV is the middle openness tier; a
   JSON-LD representation also exists and is roughly 44 times the CSV's size. A later ingestion
   task must keep pinning the CSV bytes it actually parses, and must not treat the three
   representations as interchangeable without re-verification — the same caution D-001 recorded
   when it found the CSV to be a portal conversion of an XLSX upload.
2. **`special_signs` is empty on all four 2026 resources**, national and regional alike. The
   portal supports declaring special signs, the vocabulary a publisher would use to mark a
   suppressed, unavailable or not-applicable cell in band. Both regional resources declare none.
   This is evidence about the metadata, **not** about the bytes: it means no declared in-band
   marker exists for a suppressed cell, so a suppressed regional cell would have to be represented
   by row absence or not at all. It does not establish what the bytes contain.
3. **`contains_protected_data: false` sits alongside four other `false` flags** that are
   plainly portal classification fields. It remains a portal flag and not a legal review.

### Item 21 — the sex partition, verbatim and uninterpreted

Publisher descriptions, exactly as the portal serves them:

- Male `1148786`: `<p>Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne)
  występujących w rejestrze PESEL (bez zgonów) w podziale na województwa, stan na 20.01.2026</p>`
  followed by a second paragraph containing only a non-breaking space, `<p>\xa0</p>`.
- Female `1148790`: `<p>Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne)
  występujących w rejestrze PESEL w podziale na województwa, stan na 20.01.2026</p>`

Two asymmetries are recorded and not smoothed over: the male description says `(bez zgonów)`,
without deaths, and the female one does not; and the male description carries a trailing empty
paragraph the female one lacks. Both are HTML-level artefacts of the publisher's own text. Whether
the partition is by bearer's sex or by grammatical gender of the surname form is still not stated
anywhere — TASK-004 §14 **U-1** remains open. This record contains no male-plus-female sum and no
cross-file comparison.

### The publisher's suppression wording, quoted in full

The dataset-level `notes` field, verbatim:

> Wykaz nazwisk osób żyjących występujących w rejestrze PESEL. Przedmiotowe dane zostały
> opracowane na podstawie informacji zgromadzonych w rejestrze PESEL według pola nazwisko
> aktualne. Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały
> uwzględnione w zestawieniu.

This is the whole of what the publisher says about suppression, and it yields a genuine result for
item 18's first half. The rule is stated about **`nazwiska`** — surnames — being excluded from
**`zestawieniu`**, the compilation. It is written once, at dataset level, for a dataset that
contains both national and regional resources. **The publisher's text does not address the
per-cell grain at all.** So "does the single-occurrence exclusion apply per (surname, voivodeship)
cell?" cannot be answered from the publisher's wording in either direction, and attributing either
reading to the publisher would be the fabrication `AGENTS.md` §9 forbids. Only the bytes, compared
against the national counts per the task's §9, can settle it.

Recorded alongside, because the project forbids inferring these from one another: dataset
`created` is `2019-08-13T07:16:07Z`, `modified` is `2024-06-19T13:29:14Z`, `verified` is
`2026-01-28T13:48:39Z`, `update_frequency` is `Rocznie` (yearly). The dataset's `modified` stamp is
**older** than the 2026 resources' own timestamps, which is one more reason these date concepts
stay separate fields.

## Acceptance-item status

Every item of `tasks/008-pesel-regional-source-spike.md` §8, with its outcome.

| # | Item | Outcome |
|---|---|---|
| 1 | Checksums and sizes verified before reading | `UNRESOLVED — files not supplied; nothing on disk to checksum.` |
| 2 | Encoding and BOM from the bytes | `UNRESOLVED — bytes unavailable.` |
| 3 | Delimiter, quoting, newline, trailing terminator | `UNRESOLVED — bytes unavailable.` |
| 4 | Exact header row as bytes | `UNRESOLVED — bytes unavailable.` The manifest's `observed_header_row` comes from the project owner's earlier run and was **not** re-verified here. |
| 5 | Column count on every row | `UNRESOLVED — bytes unavailable.` |
| 6 | Row count vs the tool's 646,052 / 694,553 | `UNRESOLVED — bytes unavailable.` |
| 7 | Sort order | `UNRESOLVED — bytes unavailable.` |
| 8 | Mean and maximum geography rows per surname | `UNRESOLVED — bytes unavailable.` |
| 9 | Complete distinct geography value list with counts | `UNRESOLVED — bytes unavailable.` |
| 10 | Every value corresponds to a TERC voivodeship | `UNRESOLVED — depends on items 9 and 24, both unresolved.` |
| 11 | Case, diacritics, whitespace of the values | `UNRESOLVED — bytes unavailable.` |
| 12 | `Liczba` type, min, max, zeros, ones, count at minimum | `UNRESOLVED — bytes unavailable.` |
| 13 | Duplicate (voivodeship, surname) pairs | `UNRESOLVED — bytes unavailable.` |
| 14 | Surname-column Unicode notes | `UNRESOLVED — bytes unavailable.` |
| 15 | Surname-set relation to the national resources | `UNRESOLVED — bytes unavailable; full national files also not supplied.` |
| 16 | Per-surname reconciliation for the committed national fixtures | `UNRESOLVED — regional bytes unavailable.` The national side is ready: both fixtures and their counts are verified and recorded in the task's §3 item 4. |
| 17 | Population-wide reconciliation distribution | `UNRESOLVED — regional and full national bytes unavailable.` |
| 18 | Observed suppression behaviour, and the per-cell question | **Publisher wording: VERIFIED** and quoted above — it does not address the cell grain. **Observed behaviour: `UNRESOLVED — bytes unavailable`.** |
| 19 | Meaning of an absent cell | **VERIFIED as a stated rule:** zero, suppressed, or out of scope, never confirmably zero (`ARCHITECTURE.md` §10 invariant 4). Which applies in a given case stays unobservable until item 18's second half lands. Supported further by `special_signs: []`, which means no declared in-band marker exists. |
| 20 | Resource metadata restated | **VERIFIED** — table above, with three new findings. |
| 21 | Sex partition verbatim; no cross-file sum | **VERIFIED** — quoted above, including the two asymmetries. U-1 remains open. |
| 22 | Licence position | **Committed-metadata half VERIFIED** — resource-level absence re-confirmed by a recursive scan over all 34 keys; dataset-level fields tabulated. **`UNRESOLVED — publisher confirmation not reported by the project owner.`** Nothing approved. |
| 23 | TERC data identity | `UNRESOLVED — archive copy not on disk and both GUS hosts are egress-blocked (HTTP 000, CONNECT 403).` No TERC code was read, and none was written anywhere. |
| 24 | Voivodeship TERC correspondence file | `UNRESOLVED — not created; depends on items 9 and 23.` |
| 25 | Both fixtures, with the byte-identity check | `UNRESOLVED — not created; no source bytes to copy rows from.` No synthetic fixture was substituted. |
| 26 | Manifest extended | `UNRESOLVED — deliberately not edited.` Everything the task's §7 asks the manifest to carry is bytes-dependent. Verified metadata facts are recorded in this document instead, so the next session can extend the manifest once in a single edit alongside the real file-level facts. |
| 27 | Record, D-004, `PROGRESS.md`, `CODEMAP.md` | **DONE for this attempt.** Every unresolved item above carries its reason; D-004 has a dated findings update; `PROGRESS.md` records the attempt. `docs/canonical/` and the other read-only directories are untouched. |

## What this attempt did not do

- Did not read, download, parse or fixture either regional resource, because neither is available.
- Did not read a TERC code from anywhere, and did not write one.
- Did not commit a fixture, and did not substitute a synthetic one.
- Did not edit `fixtures/pesel/source-manifest.json`; the key stays
  `regional_resources_not_ingested`.
- Did not promote any NOT VERIFIED row to verified on the strength of metadata. The header row,
  the row counts and the sample rows remain the project owner's earlier run and the acquisition
  tool's observation respectively.
- Did not touch `packages/sources`; the two-column parser still fails closed on a three-column
  file, which is the correct behaviour.
- Did not change D-004's status, its options or its adoption gate, and approved no rights posture.
- Did not begin regional ingestion, a `Place` foundation, or any `CURRENT_DISTRIBUTION` work, and
  wrote no `tasks/009-*.md`.
