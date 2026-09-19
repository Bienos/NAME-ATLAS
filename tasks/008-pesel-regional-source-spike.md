# TASK-008 — PESEL regional source spike

- **Status:** **EXECUTED 2026-09-19 — 23 of 27 acceptance items VERIFIED from the bytes; 4 open,
  all on two missing inputs.** The project owner supplied both regional CSV files and both full
  national files; each was checksum-verified against the manifest before any row was read. Open:
  items 23 and 24 (TERYT TERC identity and the voivodeship correspondence) because the TERC
  register was not supplied and both GUS hosts are egress-blocked; item 10 (every geography value
  maps to a current TERC code) because it depends on them; and half of item 22 (the publisher's
  licence confirmation), which is not this task's to close. Outcome and every figure:
  `docs/sources/pesel-regional.md`, section "TASK-008 executed"; summary in `PROGRESS.md`; findings
  in D-004. Deliverables committed: both regional fixtures and the extended manifest. **Nothing was
  ingested, no `RightsProfile` was created, and D-004's status and adoption gate are unchanged.**
  To close the remainder, supply `raw/polska_teryt/teryt_terc__1cfbb50ebf97.zip`.
- **Created:** 2026-09-19, at the project owner's request, immediately after the
  `CURRENT_DISTRIBUTION` preflight found a distribution truth chain not actionable
  (`docs/sources/pesel-regional.md`). This file is that preflight's first prerequisite, promoted
  from a proposal to a specified task.
- **Milestone:** none of `PLAN.md`'s M0–M8. It is the "current regional surname data search and
  licensing" item of `PLAN.md`'s parallel non-code track, and matches `docs/canonical/23` §13's
  SPIKE-01 pattern as TASK-002 executed it for the national pair.
- **Depends on:** TASK-002 only — the pinned national resources, their manifest entries and the
  two committed fixtures are the baseline every reconciliation check in §9 compares against.
- **Independent of:** TASK-003, TASK-004, TASK-005, TASK-006. This task writes no application
  code and touches no database, so it can run before, after or alongside any of them.
- **Informs:** D-004 in `docs/DECISIONS_NEEDED.md`. It does **not** decide it.
- **Blocks:** any regional ingestion task, any voivodeship `Place` foundation task, and any
  `CURRENT_DISTRIBUTION` truth-chain task. None of those may be specified on guesses about the
  facts this task establishes.
- **Canonical authority:** `docs/canonical/11` §5.1 (`Place`), §6.1–§6.2 (`DistributionSnapshot`,
  `DistributionValue`, the "Critical rule"), §20.3 and §32 (external IDs); `docs/canonical/12`
  §2.1 (PESEL and TERYT verified facts), §9.4–§9.9 (raw fields, suppression, regional geography,
  refresh), §10 (current geography strategy), §11 (TERYT connector); `docs/canonical/10` §5.2;
  `docs/canonical/14` §27.1, §47; `docs/canonical/23` §13, §24, §60; `ARCHITECTURE.md` §10
  invariants 3–7; `AGENTS.md` §9.
- **Model guidance:** fresh session. The project owner must supply the source bytes — see §12
  "Environment dependency". Do not start substantive work until they are on disk and
  checksum-verified.

**Numbering note.** A sibling branch (`origin/claude/inspiring-johnson-x88mbo`) carried an
equivalent specification as `tasks/007-pesel-regional-source-spike.md`, produced independently on
the same date. That branch was merged into this one on 2026-09-19 and its `007` file was
**deleted**: the project owner assigned the number 008, and both files said to reconcile into one
rather than keep both. This file is the single surviving scope authority for the spike. It is a
superset of the `007` version — same goal, inputs and out-of-scope list, plus one more acceptance
item, the verified national fixture digests and counts, the fixture-versus-resource checksum
distinction, the requirement that `@name-atlas/sources` keep failing closed on a three-column
file, and the reasoning in §9 for why per-surname reconciliation against the committed fixtures is
population-valid while the set-level questions are not. There is deliberately no `tasks/007-*.md`
on this branch.

---

## 1. Goal

Establish, from the actual bytes and with a small real fixture, exactly what the two current
regional PESEL resources contain — so that D-004 can be decided on facts, and so that a later
ingestion task and a later `CURRENT_DISTRIBUTION` task can be specified without guessing about
geographic identifiers, suppression, zero-versus-missing, or reconciliation with national totals.

This task produces **understanding and safety rails, not a pipeline.** It adopts nothing, ingests
nothing, and decides nothing. Its output is the same kind of record TASK-002 produced for the
national resources: verified facts with the commands and outputs that established them, explicit
`UNRESOLVED — <reason>` for anything the bytes and metadata cannot settle, a real fixture, and an
extended manifest.

## 2. Why this task exists

`docs/sources/pesel-regional.md` records everything the repository already knows about resources
`1148786` (male) and `1148790` (female): titles, verbatim publisher descriptions,
`data_date = 2026-01-20`, portal timestamps, native XLSX and portal-converted CSV sizes, SHA-256
checksums, endpoints, the observed header row
`Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba`, the verified-negative absence
of any resource-level licence attribute, and the acquisition tool's inspection output.

It also records what **no session has verified**, because no session has read the regional bytes
inside this repository:

- the complete set of distinct values in the geography column, their exact spelling and per-value
  row count, and whether any value is not a voivodeship;
- whether the publisher's single-occurrence exclusion applies per (surname, voivodeship) cell or
  only nationally; the minimum `Liczba`; whether any `0` or `1` rows exist;
- the relationship between a surname's regional sum and its count in the same-sex national
  resource;
- whether the regional and national surname sets coincide;
- encoding, BOM, quoting, line endings, sort order, duplicates and Unicode artefacts as observed;
- the correspondence between the geography strings and official TERYT TERC voivodeship codes,
  which the resource does not carry.

Without these, a distribution task would have to invent geographic identity, guess suppression
semantics, and state a reconciliation invariant nobody has observed — each forbidden by
`ARCHITECTURE.md` §10 and `AGENTS.md` §9. This task closes that gap or names precisely what
remains open.

## 3. Inputs to inspect

In order, and no further than §8 requires.

1. **The two regional CSV files**, supplied by the project owner from
   `NAME_ATLAS_ALL_DOWNLOADED_DATA.zip` or a fresh download from the endpoints recorded in
   `fixtures/pesel/source-manifest.json`. **Before reading a single row**, verify each file's
   SHA-256 and byte size against that manifest's `regional_resources_not_ingested` entries:

   | | Male `1148786` | Female `1148790` |
   |---|---|---|
   | SHA-256 | `0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51` | `cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989` |
   | Byte size | 16,615,897 | 17,900,370 |

   A mismatch is a finding, not something to work around (§12).

2. `fixtures/pesel/source-manifest.json` — the recorded metadata for all four 2026 resources. The
   two national entries are the reconciliation baseline: `1148808` checksum
   `ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4`, 5,293,415 B, 408,182 data
   rows; `1148811` checksum `c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6`,
   5,592,881 B, 420,082 data rows. Its `file_structure` block is the verified national shape to
   compare the regional shape against.

3. **The two national CSV files**, same supply path, verified against the checksums above before
   use. Needed only for the set-level questions in §9. If unavailable, those items are marked
   `UNRESOLVED — national files not supplied`; the per-surname checks still run against the
   committed fixtures — see §9 on why those are population-valid.

4. `fixtures/pesel/national-male-2026-01-20.csv` (22 data rows, SHA-256
   `426f44a2304a1f80a5f51c3c7d5f37498d4ecef92076ec7b3ef73a4266be2448`) and
   `national-female-2026-01-20.csv` (23 data rows, SHA-256
   `72ff8dfa2b20741951d3400942acbf1900da3f33b1086f7506c7473e6afeeea8`). Every surname in them gets
   an explicit per-surname reconciliation result (§8 item 16).

5. `docs/sources/acquisition/2026-09-18/metadata/pesel_regional_2026_*.official_resource.json` —
   the genuine `api.dane.gov.pl` resource objects; `pesel_dataset_official.json` for the
   dataset-level licence. The sibling `pesel_regional_2026_*.json` files hold the acquisition
   tool's own record, including its CSV structure inspection. That inspection is **an external
   tool's observation, not a Name Atlas assertion**
   (`docs/sources/acquisition/2026-09-18/README.md`): it reports 3 columns, the three headers,
   646,052 male / 694,553 female data rows, `encoding_used: utf-8` with
   `encoding_evidence: STRICT_UTF8_COMPATIBLE`, `bom: null`, and five sample rows per file
   beginning `DOLNOŚLĄSKIE,NOWAK,5548` (male) and `DOLNOŚLĄSKIE,NOWAK,5757` (female). Confirm or
   correct each of those from the bytes; do not restate them as verified.

6. **TERYT TERC** — for §4 item 8 only. Either the archive's
   `raw/polska_teryt/teryt_terc__1cfbb50ebf97.zip`, SHA-256
   `1cfbb50ebf97dfc797aca94331029983bc7f1e752dff94c973026437ba7d2768`, 132,136 B per
   `docs/sources/acquisition/2026-09-18/SHA256SUMS.txt`, or an official GUS download whose URL and
   retrieval date are recorded as actually used. Rights basis: `docs/canonical/12` §2.1, "GUS
   states that TERYT ws1 is available to public and commercial entities and that the service/data
   are free of charge" — quote it; do not claim to have re-verified it unless the GUS page was
   actually reached. Note that `teryt_wmrodz` failed in the owner's run with
   `HTML_ERROR_PAGE_NOT_DATA`, so do not expect it to be present.

7. `docs/sources/pesel.md` "File-level facts" — mirror that section's structure exactly, so the
   two records read the same way.

8. `docs/canonical/12` §9.4–§9.8, §10, §11 and `docs/canonical/11` §5.1, §6.1–§6.2, §20.3, §32 —
   by line range, not in full.

Do **not** read `docs/canonical/13`, `15`, `16`, `17`, or `14` beyond §27.1 and §47. Do not read
any resolver, evidence, claim or API code. Do not read any other file in the acquisition archive:
earlier PESEL years, the 2025 regional pair, other countries, GeoNames, SIMC and Morfeusz are all
unauthorised here, and `docs/sources/acquisition/2026-09-18/README.md` finding 1 already rules out
casual year-over-year use.

## 4. In scope

1. **Byte verification and file-level facts, per resource** — exactly the rows of
   `docs/sources/pesel.md` "File-level facts": byte size, SHA-256, format, encoding from the bytes,
   BOM, delimiter, quoting (whether any `"` occurs anywhere, whether any field contains a comma),
   newline convention on every line and the presence of a trailing terminator, exact header row,
   column count on every row, row count excluding header, sort order, `Liczba` range, rows with
   `Liczba = 0` or `= 1`, duplicate (voivodeship, surname) pairs, malformed rows.
2. **The geography column** — the complete list of distinct values of
   `Województwo zameldowania na pobyt stały`, verbatim bytes, with the row count per value, in each
   file; whether the two files' value sets are identical; letter case, diacritics and any
   leading or trailing whitespace as observed; and — recorded, not interpreted — any value that is
   not a voivodeship name. The size of the set is to be read, never assumed.
3. **The count column** — type from observed values, minimum, maximum, the number of rows at the
   minimum, and whether any cell is `0` or `1`.
4. **The surname column** — the same Unicode checks the national record made: NFC status,
   base-letter-plus-combining-mark rows, trailing whitespace, embedded `/`, non-Latin scripts —
   counts and verbatim examples in each case.
5. **Reconciliation against the same-sex national resource**, per §9: the surname-set relation,
   the per-surname regional sum versus the national count, an explicit result for every surname in
   the committed national fixture, and the resulting **observed** suppression behaviour — stated
   as an observation with its numbers, never as a rule the publisher did not state.
6. **Semantics recorded verbatim** — publisher descriptions, `regions`,
   `contains_protected_data`, the binding registered-permanent-residence restriction, the sex
   partition preserved and never summed, and the meaning of a missing (surname, voivodeship) cell
   stated consistently with item 5 and `ARCHITECTURE.md` §10 invariant 4.
7. **Rights position** — the resource-level licence status as reported by the project owner:
   publisher confirmation obtained, requested and pending, or not requested, with whatever
   evidence exists such as date and channel, recorded exactly. Re-confirm from the committed
   metadata that the dataset states CC0 1.0 and that no resource-level licence field exists.
   Nothing is approved; no `RightsProfile` is created.
8. **Voivodeship identity correspondence, evidence only** — from the TERC data in §3 item 6, the
   TERC voivodeship code and official TERC name for each distinct value observed in item 2,
   produced by a documented comparison (exact match, or a documented deterministic normalisation
   such as case folding, stated precisely), together with the TERC file's own identity: name,
   checksum, byte size, source URL as used, and the register's stated reference date. Any observed
   value with no TERC counterpart stays unmapped and is recorded verbatim. **Codes are read from
   the TERC data, never typed from memory.** No `Place`, no table, no connector — a documented,
   checked correspondence a later task can load.
9. **Fixtures** per §6, and the manifest extended per §7.
10. **The record** — `docs/sources/pesel-regional.md` updated in place: every row of its
    findings table currently marked NOT VERIFIED becomes VERIFIED with the command and output, or
    `UNRESOLVED — <reason>`; its "Regional resource facts" table gains the file-level facts; the
    acquisition tool's row counts and sample rows are confirmed or corrected from the bytes.
11. **D-004** updated with the findings only — the observed suppression behaviour, the
    reconciliation result, the geography value set and its TERC correspondence, and the rights
    position. Its status, its decision options and its adoption gate are unchanged by this task.

## 5. Out of scope

Their absence is a success condition. Anything here appearing in the diff is a defect.

- Any ingestion, importer, or `packages/sources` change — **including** a three-column schema
  description or validator. The regional validator belongs to the regional ingestion task, once
  D-004 permits one. The existing two-column parser must keep failing closed on a regional file.
- `Place`, `PlaceName`, `PlaceGeometry`, `AdministrativeMembership`, `EntityExternalId`, any
  migration, any table, any TERYT connector, any `packages/places`.
- `Source`, `SourceRecord`, `RightsProfile`, `DistributionSnapshot`, `DistributionValue`;
  `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation`; any
  `CURRENT_DISTRIBUTION` or `REGIONAL_CONCENTRATION` value.
- Deciding D-004, approving any rights posture, or presenting `contains_protected_data: false` as
  a legal review.
- Any use of `@name-atlas/resolver`, `canonicalKey`, NFC normalisation, case folding, diacritic
  folding, fuzzy or phonetic matching to compare surname strings between files. §9's comparison is
  byte-identical on the raw field, deliberately.
- Any map, chart, UI, API, rank, share, rate, concentration, 1-in-X or trend; any comparison with
  the 2025 regional resources or any earlier year.
- Summing, comparing or reconciling the male and female files with each other.
- Committing the full regional or national files, the archive, or any TERYT raw file; committing
  any file from the archive's other sources.
- Any new workspace package, dependency, or script under `apps/` or `packages/`. Throwaway
  analysis scripts run from the session scratchpad; the record keeps the commands and their output.
- Downloading anything if the environment cannot reach `dane.gov.pl` or GUS. Supply is manual
  (§12).
- TASK-009, regional ingestion, and any `CURRENT_DISTRIBUTION` task. Do not write
  `tasks/009-*.md`.

## 6. The fixtures

- **Files:** `fixtures/pesel/regional-male-2026-01-20.csv` and
  `fixtures/pesel/regional-female-2026-01-20.csv`, each with the real header row and the source's
  real line-ending convention. The national fixtures end with a trailing CRLF; match whatever the
  regional source actually does.
- **Source:** rows copied verbatim from the checksum-verified regional files. Never synthesised,
  never retyped, never edited — including any trailing whitespace the source has.
- **Size:** larger than the national fixtures' 22 and 23 rows, because multi-region coverage of one
  surname needs one row per voivodeship. State the actual count and the reason. Do not exceed what
  the coverage below requires.
- **Required coverage, by real rows where the source allows, per file:**
  1. **Every** row for `NOWAK`, which appears in both national fixtures — one row per voivodeship
     in which it appears — so the fixture itself supports the per-surname reconciliation check in
     §8 item 16 against the national fixture values: male `NOWAK,98387`, female `NOWAK,99738`.
  2. **Every** row for one Polish-diacritic surname present in the same-sex national fixture:
     male `WIŚNIEWSKI` (national count 53,079), female `WIŚNIEWSKA` (54,177).
  3. The first three rows, in file order, at the **minimum observed `Liczba`** — the real
     suppression boundary, whatever it turns out to be.
  4. At least one row for a foreign-script or extended-Latin surname present in the same-sex
     national fixture, if it appears regionally: `NGUYỄN` (male 3,730 / female 2,132) or `MÜLLER`
     (1,462 / 1,874).
  5. One row per Unicode artefact category observed in §4 item 4, if present — a standalone
     combining mark (the national fixtures carry male `DOG̈AN`, female `SCHA̋FER`), an embedded
     slash (male `W/SILASSIE`, `A/GADIR`; female `W/RUFAEL`), trailing whitespace (female
     `SCHIED ` at length 7).
  6. At least one row for **every** distinct value of the geography column, including any
     non-voivodeship value, so the fixture exhibits the complete value set.
- **Provenance recorded alongside**, in `docs/sources/pesel-regional.md` and the manifest: resource
  id, the source file's checksum, the selection method as actually applied, the fixture row count,
  the fixture's own SHA-256, and the recorded check that every fixture data row appears
  byte-identically in the source (§10).
- **A fixture's checksum is not the resource's checksum.** The national fixtures are excerpts with
  their own digests, recorded in §3 item 4; keep the two kinds of checksum clearly separate, as
  TASK-002 and TASK-004 did.
- **Rights condition:** commit the fixtures only if the recorded rights position in §4 item 7 does
  not forbid it. Dataset-level CC0 1.0 is the same basis on which the national fixtures were
  committed. If the project owner reports a contrary publisher statement, do not commit the
  fixtures, mark §8 item 25 unresolved with the reason, and stop. Never substitute a synthetic
  fixture.

## 7. Expected repository outputs

- `docs/sources/pesel-regional.md` — updated in place per §4 item 10. It remains the single record
  for the regional resources. Every figure shown with the command that produced it; a throwaway
  script may be pasted as a code block.
- `fixtures/pesel/regional-male-2026-01-20.csv` and `regional-female-2026-01-20.csv` — per §6.
- `fixtures/pesel/source-manifest.json` — the two `regional_resources_not_ingested` entries
  extended with the verified file-level facts, the geography value set and the fixture provenance,
  reusing the national entries' field names wherever the same fact exists
  (`row_count_excluding_header`, `encoding`, `format_supplied`, and so on). **The key stays
  `regional_resources_not_ingested`** — that is still true after this task.
- `fixtures/teryt/voivodeship-terc-correspondence.json` — the §4 item 8 correspondence: for each
  observed geography string, the TERC code, the TERC name, the comparison method, and the TERC
  file's identity. Created only if the TERC data was checksum-verified or freshly obtained from GUS
  with its URL recorded; otherwise omitted, with items 23–24 marked unresolved.
- `docs/DECISIONS_NEEDED.md` — D-004 findings update only, under a dated subsection.
- `docs/CODEMAP.md` — the `fixtures/pesel/` row extended; a `fixtures/teryt/` row added if that
  file is created.
- `PROGRESS.md` — facts only: what was verified from which bytes on which date, the commands run
  and their results, and every `UNRESOLVED` item with its reason.

## 8. Acceptance criteria

Each item must have a recorded answer in `docs/sources/pesel-regional.md` — a verified fact with
the command and output that established it, **or** an explicit `UNRESOLVED — <reason>`. A
plausible-sounding guess is a failure of this task.

**Bytes and structure, per resource**

1. SHA-256 and byte size of each supplied regional file equal the manifest values in §3 item 1,
   checked **before any row was read**.
2. Encoding confirmed from the bytes by strict decode, with the count of invalid sequences,
   expected zero; BOM present or absent, from the first bytes.
3. Delimiter; quoting, meaning whether any `"` occurs anywhere and whether any field contains a
   comma; newline convention on every line; presence of a trailing terminator.
4. Exact header row as bytes, compared with the manifest's `observed_header_row`.
5. Column count on every row, and the number of rows that do not have exactly three fields,
   expected zero, with verbatim examples if any.
6. Row count excluding header, compared with the acquisition tool's 646,052 male / 694,553 female
   — match or mismatch stated explicitly.
7. Sort order as observed for the whole file: by geography then descending count, by count alone,
   or something else. The national files are descending by `Liczba` throughout; say whether the
   regional files differ.
8. Mean and maximum number of geography rows per surname, computed and recorded. The tool's
   regional row count exceeds the verified national row count of 408,182, which is consistent with
   one row per (surname, voivodeship) cell; confirm that reading rather than assume it.

**Geography column**

9. The complete distinct value list with per-value row counts, per file, verbatim; whether the two
   files' value sets are identical.
10. Whether every value corresponds to a current TERYT TERC voivodeship (item 24), and every value
    that does not, verbatim and uninterpreted.
11. Case, diacritics and whitespace form of the values as observed.

**Count column**

12. `Liczba` type from observed values; minimum; maximum; the number of rows with `0`; the number
    with `1`; the number at the minimum.
13. Duplicate (voivodeship, surname) pairs within a file — count, with verbatim examples if any.

**Surname column**

14. Unicode notes as in the national record: NFC status; combining-mark rows with count and
    examples; trailing-whitespace rows; embedded `/`; non-Latin scripts — counts and verbatim
    examples.

**Reconciliation against the same-sex national resource, per §9**

15. Surname-set relation: how many regional surname strings have no byte-identical national row,
    and how many national strings have no regional row — per sex, with up to ten verbatim examples
    of each, and where a near-miss is visible such as whitespace, the pair shown verbatim without
    merging.
16. For every surname in the committed national fixture of the same sex: its national count, its
    regional sum, the number of geography rows it has, and the difference — as a table. This item
    does not depend on the full national files; see §9.
17. For every surname string present in both full files, if they were supplied: the number whose
    regional sum equals the national count, the number lower, the number higher; the minimum,
    maximum and median of national minus regional sum; and the number of surnames whose shortfall
    equals the count of geography rows one would expect under per-cell exclusion — reported as
    numbers, with the method shown.
18. **Observed suppression behaviour**, stated as an observation with its numbers, and the explicit
    status of the question "is the exclusion applied per cell?" — verified-as-observed or
    `UNRESOLVED`. The publisher's own wording is quoted; nothing is attributed to the publisher
    that it did not state.
19. The meaning of a (surname, voivodeship) cell absent from the file, stated consistently with
    item 18 and `ARCHITECTURE.md` §10 invariant 4: zero, suppressed, or out of scope — never
    confirmably zero.

**Semantics and rights**

20. Publisher descriptions, `regions`, `contains_protected_data`, `data_date`, portal timestamps
    and native format restated from the committed official metadata, with the note that
    `contains_protected_data` is a portal flag and not a review.
21. The sex partition recorded verbatim and uninterpreted — TASK-004 §14 U-1 remains open — and the
    record contains no male-plus-female sum and no cross-file comparison.
22. Resource-level licence position as reported by the project owner, with date and channel where
    available; the dataset-level CC0 1.0 statement and the absence of any resource-level licence
    field re-confirmed from `pesel_dataset_official.json` and the two `official_resource.json`
    files. Nothing approved.

**TERYT correspondence**

23. TERC data identity: file name, SHA-256 equal to `1cfbb50e…2768` if the archive copy is used,
    byte size, source URL as actually used, the register's stated reference date, and the quoted
    rights statement from `docs/canonical/12` §2.1 with a note on whether the GUS page was reached.
24. The correspondence file: one entry per observed geography value with TERC code, TERC name, the
    comparison method actually used, and `null` for any value with no counterpart; plus the number
    of observed values, the number mapped and the number unmapped.

**Fixtures, manifest, record**

25. Both fixtures exist per §6 with the selection method recorded; a recorded check shows every
    fixture data row appears byte-identically in its source file; and the fixture's `NOWAK` rows
    sum to a number that is compared with the national fixture value and reported — equal or not,
    either is a finding.
26. `fixtures/pesel/source-manifest.json` extended per §7, still under
    `regional_resources_not_ingested`, parsing as valid JSON.
27. Every NOT VERIFIED row of the findings table in `docs/sources/pesel-regional.md` is now
    VERIFIED or `UNRESOLVED — <reason>`; D-004 carries the findings; `PROGRESS.md` and
    `docs/CODEMAP.md` carry facts only; `docs/canonical/` is untouched.

## 9. Reconciliation method

This is a **file-to-file comparison of source strings**, not surname resolution. It establishes
what the publisher's two representations of the same register field say about each other.
Therefore:

- Match `Nazwisko aktualne` between the regional and the same-sex national file **byte-identically
  on the raw field**. No NFC normalisation — the national values are already NFC, so verify
  whether the regional ones are and report any that are not rather than normalising them. No case
  folding, no trimming, no diacritic folding, no resolver. A regional string differing from a
  national one only by whitespace is a near-miss to report verbatim, not a match.
- Never compare across sexes.
- For each surname string in the regional file, sum `Liczba` across all its rows, including any
  non-voivodeship geography value. If such a value exists, additionally report the sum over
  voivodeship values only, so the effect of that category is visible.
- Compare with the national `Liczba` for the identical string.
- **The committed national fixtures are population-valid for item 16.** Their rows are verbatim
  copies of real resource lines, so the count beside `NOWAK` is that surname's full national count,
  not a fixture-scoped subtotal. A per-surname comparison for the 22 male and 23 female surnames
  they contain is therefore a genuine check even when the full national files are unavailable —
  provided the regional side carries **all** of that surname's geography rows. What genuinely
  needs the full national files is the set-level question in item 15 and the population-wide
  distribution in item 17. If they are not supplied, mark those two `UNRESOLVED — national files
  not supplied` and say so plainly; do not silently relabel a fixture-scoped result as
  population-wide.
- State the observed suppression behaviour only in terms the numbers support. Two acceptable
  forms: "every cell has `Liczba` at or above N, and for 100% of matched surnames the regional sum
  is at or below the national count", or "regional sums exceed the national count for N surnames,
  unexplained, UNRESOLVED". An unacceptable form: "the publisher suppresses cells with one bearer"
  unless the publisher says so.

## 10. Verification

Everything below is run and reported with its actual output. Nothing is reported as passing from
inspection.

```bash
# before reading any row — per supplied file, against fixtures/pesel/source-manifest.json
sha256sum <regional-male.csv> <regional-female.csv>
stat -c %s <regional-male.csv> <regional-female.csv>

# TERC data, if the archive copy is used
sha256sum <teryt_terc zip>

# after the fixtures and manifest are written
sha256sum fixtures/pesel/regional-male-2026-01-20.csv fixtures/pesel/regional-female-2026-01-20.csv
python3 -c "import json; json.load(open('fixtures/pesel/source-manifest.json'))"
python3 -c "import json; json.load(open('fixtures/teryt/voivodeship-terc-correspondence.json'))"  # only if created

# every fixture data row is a byte-identical line of its source (record the script and its output)

pnpm test          # unchanged — no code changed; run it to prove that
git status --porcelain docs/canonical docs/library docs/archive docs/reference docs/review prompts   # must be empty
git diff --check
```

The unit-test baseline on this branch is **95 tests across 9 packages**, with 28 integration tests
(`PROGRESS.md`, TASK-003 verification). `pnpm test` must still report 95 and nothing may regress.

`pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:integration` are **not required** — no
code changes — and must not be reported as run if they were not. `pnpm format:check` covers no
file this task writes: `.prettierignore` excludes `*.md` and
`docs/sources/acquisition/**/metadata/`, and a `.csv` fixture is not a Prettier target. Run it if
`fixtures/pesel/source-manifest.json` is reformatted; otherwise say it was not needed and why.
Note that `node_modules` may be absent in a fresh session, so `pnpm test` needs
`pnpm install --frozen-lockfile` first; if that cannot run for environment reasons, say so rather
than reporting an untested tree as clean.

## 11. Definition of done

- Every item in §8 is answered with its command and output, or explicitly
  `UNRESOLVED — <reason>`. Nothing is guessed, and nothing the publisher did not state is
  attributed to the publisher.
- The fixtures are real and verbatim, their provenance and their own checksums are recorded, and
  the manifest is extended and parses.
- The TERC correspondence exists with its provenance, or items 23–24 are marked unresolved with
  the reason.
- D-004 carries the findings; its status and the adoption decision are unchanged by this task.
- `docs/CODEMAP.md` and `PROGRESS.md` record facts only; `docs/canonical/` and the other read-only
  directories are untouched.
- The complete `git diff` has been reviewed file by file against §5 and §14.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin regional ingestion, a `Place` foundation, or a `CURRENT_DISTRIBUTION`
  task. Do not write `tasks/009-*.md`.

## 12. Failure conditions and fail-closed behaviour

- **Environment dependency — check this first.** `dane.gov.pl`, `api.dane.gov.pl` and container
  registries have been network-egress-blocked in every session so far. This task does not
  download. If the project owner has not supplied the regional files, **stop and report the
  blocker.** Do not reconstruct facts from the metadata, from the acquisition tool's inspection
  output, or from the canonical corpus and present them as verified from bytes.
- **Checksum mismatch.** If a supplied file's SHA-256 or byte size differs from the manifest, do
  not read it as the pinned resource. A changed publisher file is a finding: record it, mark every
  bytes-dependent item unresolved, and stop.
- **Never fabricate** a geography value, a TERC code, a count, a threshold, a licence term or a
  reconciliation figure. If the TERC data cannot be checksum-verified or freshly obtained with its
  URL recorded, omit the correspondence file and mark items 23–24 unresolved. A code typed from
  memory is a defect even if it happens to be right.
- **Rights.** If the project owner reports a publisher statement that forbids reproducing rows,
  commit no fixture, mark item 25 unresolved, and stop.
- **D-004.** Whatever the bytes show, this task does not change D-004's status or its adoption
  gate. A clean reconciliation and a complete value set are inputs to that decision, not the
  decision.
- **Non-voivodeship values.** If the geography column contains a value that is not a voivodeship,
  record it verbatim with its row count, leave it unmapped, and never fold it into a voivodeship or
  drop it from a sum without also reporting the sum that includes it.
- **Sex partition.** If a comparison across the male and female files seems necessary to explain a
  number, it is not. Record the number as unexplained.
- **The two-column parser must keep failing closed.** If a regional file is accidentally run
  through `@name-atlas/sources`, the correct outcome is a `PeselSchemaError`. Do not widen the
  parser to accept three columns; that is the ingestion task's work, not this one's.

## 13. Preflight for the implementing session

Read-only and targeted; no repository-wide exploration.

1. This file; `docs/sources/pesel-regional.md`, whose findings table is the checklist;
   `docs/sources/pesel.md` "File-level facts", the format to mirror.
2. `PROGRESS.md` current-state table and the TASK-003 verification counts; D-004 in
   `docs/DECISIONS_NEEDED.md`.
3. `fixtures/pesel/source-manifest.json` — the regional entries and the national baseline; both
   national fixtures.
4. `docs/sources/acquisition/2026-09-18/README.md` and the two regional `official_resource.json`
   files, plus the tool's own two `pesel_regional_2026_*.json` records.
5. `docs/canonical/12` §9.5, §9.8, §10, §11 and `docs/canonical/11` §6.2 "Critical rule", §20.3 —
   by line range, not in full.
6. `git status`, confirming a clean tree on the designated branch; then confirm the supplied files
   are on disk and run the checksum step of §10 **before anything else**.

## 14. Diff review

Before declaring the task complete, inspect the entire diff file by file and confirm:

1. Nothing from §5 is present — no code, no package, no migration, no validator, no place, no
   snapshot, no claim, no dependency.
2. Every committed fixture row is byte-identical to a source line, the §10 check ran and passed,
   and no row was retyped, trimmed or normalised.
3. No TERC code appears anywhere that was not read from the recorded TERC file.
4. No figure in the record lacks the command that produced it.
5. No statement attributes a rule to the publisher that the publisher's own text does not contain.
6. No male-plus-female sum, no cross-sex comparison, no comparison with 2025 or earlier resources.
7. `regional_resources_not_ingested` is still the manifest key, and D-004's status line and
   decision options are unchanged.
8. Fixture checksums and resource checksums are not conflated anywhere.
9. `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and
   `prompts/` are untouched; no raw source file is committed; no debug artefact or stray file
   remains.

## 15. Documentation and handoff

- `docs/sources/pesel-regional.md` is the record. It must let a later session specify regional
  ingestion and a voivodeship `Place` foundation without re-reading the bytes.
- `docs/DECISIONS_NEEDED.md` D-004 — findings only, under a dated subsection. The decision stays
  with the project owner.
- `docs/CODEMAP.md` — extend the `fixtures/pesel/` row; add `fixtures/teryt/` if created.
- `PROGRESS.md` — TASK-008 status, files added, commands run with their results, and every
  `UNRESOLVED` item with its reason. No session diary.
