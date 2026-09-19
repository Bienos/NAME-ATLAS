# TASK-007 — PESEL regional source spike

- **Status:** NOT STARTED — specification only.
- **Number:** assigned at the project owner's request on 2026-09-19. The task originally requested under this number — a `CURRENT_DISTRIBUTION` truth chain — was found not actionable (`docs/sources/pesel-regional.md`, D-004 in `docs/DECISIONS_NEEDED.md`); this spike is its first prerequisite. Nothing depends on the number; renumbering is free.
- **Milestone:** none of `PLAN.md`'s M0–M8 — it is the "current regional surname data search and licensing" item of `PLAN.md`'s parallel non-code track (`docs/canonical/23` "Track B — current geography: research/license; if unavailable: not blocking"). Pattern: SPIKE-01 (`docs/canonical/23` §13) as executed by TASK-002.
- **Depends on:** TASK-002 (the pinned national resources, their manifest and fixtures — the baseline every reconciliation check in §9 compares against).
- **Independent of:** TASK-003, TASK-004, TASK-005. This task writes no application code and touches no database; it can run before, after or alongside them.
- **Informs:** D-004 (does **not** decide it). **Blocks:** any regional ingestion task, any voivodeship `Place` foundation task, and any `CURRENT_DISTRIBUTION` truth-chain task — none of which may be specified on guesses about the facts this task establishes.
- **Canonical authority:** `docs/canonical/11` §5 (`Place`), §6 (`DistributionSnapshot`/`DistributionValue`, "Critical rule"), §20.3 and §32 (external IDs); `docs/canonical/12` §2.1 (PESEL, TERYT verified facts), §9.4–§9.8 (raw fields, suppression, regional geography), §10 (current geography strategy), §11 (TERYT connector); `docs/canonical/10` §5.2; `docs/canonical/14` §27.1, §47; `ARCHITECTURE.md` §10 invariants 3–7; `AGENTS.md` §9.
- **Model guidance:** fresh session. The project owner must supply the source bytes (see §12 "Environment dependency"); do not start substantive work until they are on disk and checksum-verified.

---

## 1. Goal

Establish, from the actual bytes and with a small real fixture, exactly what the two current regional PESEL resources contain — so that D-004 can be decided on facts, and so that a later ingestion task and a later `CURRENT_DISTRIBUTION` task can be specified without guessing about geography identifiers, suppression, zero-versus-missing, or reconciliation with national totals.

This task produces **understanding and safety rails**, not a pipeline. It adopts nothing, ingests nothing, and decides nothing. Its output is the same kind of record TASK-002 produced for the national resources: verified facts with their commands and outputs, explicit `UNRESOLVED — <reason>` for anything the bytes and metadata cannot settle, a real fixture, and an extended manifest.

## 2. Why this task exists

`docs/sources/pesel-regional.md` (the 2026-09-19 preflight) records everything the repository already knows about resources `1148786` (male) and `1148790` (female): titles, publisher descriptions, `data_date = 2026-01-20`, portal timestamps, native XLSX and portal-converted CSV sizes, SHA-256 checksums, endpoints, the observed header row `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba`, and the acquisition tool's inspection output (row counts and first five rows — external tool output, not Name Atlas assertions).

It also records what **no session has verified**, because no session has read the regional bytes:

- the complete set of distinct values in the geography column, their exact spelling, and whether any value is not a voivodeship (no registered permanent residence, residence abroad, unknown);
- whether the publisher's single-occurrence exclusion applies per (surname, voivodeship) cell or only nationally; the minimum `Liczba`; whether any `0` or `1` rows exist;
- the relationship between a surname's regional sum and its count in the same-sex national resource;
- whether the regional and national surname sets coincide;
- encoding, quoting, line endings, sort order, duplicates and Unicode artefacts as observed;
- the resource-level licence position (dataset-level CC0 1.0 only; no resource-level licence field exists — D-004);
- the correspondence between the geography strings and official TERYT TERC voivodeship codes, which the resource does not carry.

Without these, any distribution task would have to invent geographic identity, guess suppression semantics, and state a reconciliation invariant nobody has observed — each forbidden by `ARCHITECTURE.md` §10 and `AGENTS.md` §9. This task closes that gap or names precisely what remains open.

## 3. Inputs and sources to inspect

In order, and no further than needed to answer §8:

1. **The two regional CSV files**, supplied by the project owner (from `NAME_ATLAS_ALL_DOWNLOADED_DATA.zip` or a fresh download from the endpoints in `fixtures/pesel/source-manifest.json`). **Before reading a single row**, verify each file's SHA-256 and byte size against the manifest's `regional_resources_not_ingested` entries (`0eb31d19…1b51`, 16,615,897 B male; `cd0c100e…6989`, 17,900,370 B female). A mismatch is a finding, not something to work around (§12).
2. `fixtures/pesel/source-manifest.json` — the recorded metadata for all four 2026 resources; the two national entries are the reconciliation baseline (`row_count_excluding_header` 408,182 / 420,082; `checksum_sha256`).
3. **The two national CSV files** (same supply path; verify against the manifest's national checksums `ce4238fe…62f4` / `c508680d…f6e6` before use). Needed only for §9; if unavailable, §9 runs against the committed national fixtures alone and says so.
4. `fixtures/pesel/national-male-2026-01-20.csv`, `national-female-2026-01-20.csv` — the 22/23 real national fixture rows; every fixture surname gets an explicit per-surname reconciliation result (§9).
5. `docs/sources/acquisition/2026-09-18/metadata/pesel_regional_2026_*.official_resource.json` — the genuine `api.dane.gov.pl` responses (publisher description, `regions`, `contains_protected_data`, dates, formats); `pesel_dataset_official.json` (dataset-level `license_name`, `notes`).
6. **TERYT TERC** — the current register of territorial units, for §4 item 8 only. Either the archive's `raw/polska_teryt/teryt_terc__1cfbb50ebf97.zip` (SHA-256 `1cfbb50ebf97dfc797aca94331029983bc7f1e752dff94c973026437ba7d2768`, 132,136 B per `docs/sources/acquisition/2026-09-18/SHA256SUMS.txt`), or an official GUS download whose URL and date are recorded as actually used. Rights basis: `docs/canonical/12` §2.1 ("GUS states that TERYT ws1 is available to public and commercial entities and that the service/data are free of charge") — quote it; do not claim to have re-verified it unless the GUS page was actually reached.
7. `docs/sources/pesel.md` — the national record; mirror its "File-level facts" section structure so the two records read the same way.
8. `docs/canonical/12` §9.4–§9.8, §10, §11; `docs/canonical/11` §5.1, §6.1–§6.2, §20.3, §32 — the connector-level and model-level expectations this spike must confirm, correct, or leave explicitly open.

Do **not** read `docs/canonical/13`, `14` (beyond §27.1/§47), `15`, `16`, `17`, or any resolver/evidence/API code. Do not read any other file in the acquisition archive (earlier PESEL years, other countries, GeoNames, SIMC, Morfeusz) — none is authorised, and `docs/sources/acquisition/2026-09-18/README.md` finding 1 already rules out casual year-over-year use.

## 4. In scope

1. **Byte verification and file-level facts, per resource** — exactly the columns of `docs/sources/pesel.md` "File-level facts": byte size, SHA-256, format, encoding (from bytes), BOM, delimiter, quoting (any quote character anywhere; any field containing a comma), newline convention and trailing terminator, exact header row, column count on every row, row count excluding header, sort order, `Liczba` range, rows with `Liczba = 0` or `= 1`, duplicate (voivodeship, surname) pairs, malformed rows.
2. **The geography column** — the complete list of distinct values of `Województwo zameldowania na pobyt stały`, verbatim bytes, with the row count per value, in each file; whether the two files' sets are identical; letter case and diacritics as observed; any leading/trailing whitespace; and — recorded, not interpreted — any value that is not a voivodeship name.
3. **The count column** — type, minimum, maximum; whether any cell is `0` or `1`; the distribution of the smallest values (how many rows at the minimum).
4. **The surname column** — the same Unicode notes as the national record: NFC status, base-letter-plus-combining-mark rows, trailing whitespace, embedded `/`, non-Latin scripts — counts and verbatim examples.
5. **Reconciliation against the same-sex national resource** per §9: surname-set relation, per-surname regional sum versus national count, the explicit result for every committed national fixture surname, and the resulting **observed** suppression behaviour, stated as an observation with its numbers, never as a rule the publisher did not state.
6. **Semantics recorded verbatim** — publisher descriptions, `regions`, `contains_protected_data`, the binding registered-permanent-residence restriction, the sex partition (preserved; never summed or compared across files), and the meaning of a missing (surname, voivodeship) cell stated consistently with item 5 and `ARCHITECTURE.md` §10 invariant 4.
7. **Rights position** — the resource-level licence status as reported by the project owner (publisher confirmation obtained, requested and pending, or not requested), with whatever evidence exists (date, channel), recorded exactly; the dataset-level CC0 1.0 statement and the absence of a resource-level licence field re-confirmed from the committed metadata. Nothing is approved; no `RightsProfile` exists or is created.
8. **Voivodeship identity correspondence, evidence only** — from TERYT TERC data (§3 item 6): the TERC voivodeship code and official TERC name for each distinct value observed in item 2, produced by a documented comparison (exact, or a documented deterministic normalisation such as case folding — stated precisely), with the TERC file's own identity (name, checksum, size, source URL as used, the register's stated reference date). Any observed value with no TERC counterpart stays unmapped and is recorded verbatim. **Codes are read from the TERC data, never typed from memory.** No `Place`, no table, no connector — a checked correspondence a later task can load.
9. **Fixtures** per §6, and the manifest extended per §7.
10. **The record** — `docs/sources/pesel-regional.md` updated: every row of its findings table marked NOT VERIFIED becomes VERIFIED (with the command and output) or `UNRESOLVED — <reason>`; the "Regional resource facts" table gains the file-level facts; the acquisition tool's row counts and sample rows are confirmed or corrected from the bytes.
11. **D-004** updated with the findings only — the observed suppression behaviour, the reconciliation result, the geography value set and its TERC correspondence, and the rights position. Its status and the adoption decision are not changed by this task.

## 5. Out of scope

Their absence is a success condition. Anything here in the diff is a defect.

- Any ingestion, importer, or `packages/sources` change — including a three-column schema description or validator. The regional validator belongs to the regional ingestion task, once D-004 permits one.
- `Place`, `PlaceName`, `PlaceGeometry`, `AdministrativeMembership`, `EntityExternalId`, any migration, any table, any TERYT connector, any `packages/places`.
- `Source`, `SourceRecord`, `RightsProfile`, `DistributionSnapshot`, `DistributionValue` (TASK-004); `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation` (TASK-005); any `CURRENT_DISTRIBUTION` or `REGIONAL_CONCENTRATION` value.
- Deciding D-004, approving any rights posture, or presenting `contains_protected_data: false` as a legal review.
- Any use of `@name-atlas/resolver`, `canonicalKey`, NFC normalisation, case folding, diacritic folding, fuzzy or phonetic matching to compare surname strings between files. §9's comparison is byte-identical on the raw field, deliberately (see §9).
- Any map, chart, UI, API, rank, share, rate, concentration, "1-in-X", trend, or comparison with the 2025 regional resources or any earlier year.
- Summing, comparing or reconciling the male and female files with each other.
- Committing the full regional or national files, the archive, or any TERYT raw file; committing any file from the archive's other sources.
- Any new workspace package, dependency, or script under `apps/`/`packages/`. Throwaway analysis scripts run from the scratchpad; the record keeps the commands and their output.
- Downloading anything if the environment cannot reach `dane.gov.pl` or GUS — supply is manual (§12).
- TASK-008. Do not write `tasks/008-*.md`.

## 6. The fixtures

- **Files:** `fixtures/pesel/regional-male-2026-01-20.csv` and `fixtures/pesel/regional-female-2026-01-20.csv`, each with the real header row and the source's real line-ending convention.
- **Source:** rows copied verbatim from the checksum-verified regional files. Never synthesised, never retyped, never edited — including any trailing whitespace the source has.
- **Size:** larger than TASK-002's 20–50 because multi-region coverage of one surname needs one row per voivodeship: roughly 40–80 rows per file. State the actual count and the reason. Do not exceed what the coverage below needs.
- **Required coverage, each by real rows where the source allows, per file:**
  1. **Every** row for one common surname present in the same-sex national fixture (`NOWAK` is in both national fixtures) — one row per voivodeship in which it appears — so the fixture itself supports a per-surname regional-sum check against the committed national fixture value (male `NOWAK,98387`; female `NOWAK,99738`).
  2. **Every** row for one Polish-diacritic surname present in the same-sex national fixture (for example male `WIŚNIEWSKI`, female `WIŚNIEWSKA`).
  3. The first three rows, in file order, at the **minimum observed `Liczba`** — the real suppression boundary, whatever it is.
  4. At least one row for a foreign-script or extended-Latin surname present in the national fixture (`NGUYỄN`, `MÜLLER`) if it appears regionally.
  5. One row per Unicode artefact category observed in item 4 of §4 (combining mark, embedded slash, trailing whitespace), if present.
  6. At least one row for **every** distinct value of the geography column, including any non-voivodeship value, so the fixture shows the complete value set.
- **Provenance recorded alongside** (in `docs/sources/pesel-regional.md` and the manifest): resource ID, checksum of the source file, the selection method as actually applied, the row count, and the recorded check that every fixture row appears byte-identically in the source (§10).
- **Rights condition:** commit the fixtures only if the recorded rights position (§4 item 7) does not forbid it. Dataset-level CC0 1.0 is the same basis on which the national fixtures were committed; if the project owner reports a contrary publisher statement, do not commit the fixtures, mark §8 item 24 unresolved with the reason, and stop.

## 7. Expected repository outputs

- `docs/sources/pesel-regional.md` — updated in place (§4 items 10); it remains the single record for the regional resources. Every command shown with its actual output; a throwaway script may be pasted as a code block.
- `fixtures/pesel/regional-male-2026-01-20.csv`, `fixtures/pesel/regional-female-2026-01-20.csv` — per §6.
- `fixtures/pesel/source-manifest.json` — the two `regional_resources_not_ingested` entries extended with the verified file-level facts and fixture provenance, using the same field names as the national entries where the same fact exists (`row_count_excluding_header`, `encoding`, `format_supplied`, …), plus the geography value set. **The key stays `regional_resources_not_ingested`** — that is still true.
- `fixtures/teryt/voivodeship-terc-correspondence.json` — the §4 item 8 correspondence: for each observed geography string, the TERC code and TERC name, the comparison method, and the TERC file identity (name, checksum, size, URL as used, register reference date). Created only if the TERC data was checksum-verified or freshly obtained from GUS with its URL recorded; otherwise omitted and item 8 marked unresolved.
- `docs/DECISIONS_NEEDED.md` — D-004 findings update only (§4 item 11).
- `docs/CODEMAP.md` — `fixtures/pesel/` row extended; `fixtures/teryt/` row added if created.
- `PROGRESS.md` — facts only: what was verified from which bytes on which date, the commands run and their results, what could not be verified and why.

## 8. Acceptance criteria

Each item must have a recorded answer in `docs/sources/pesel-regional.md` — a verified fact with the command and output that established it, **or** an explicit `UNRESOLVED — <reason>`. A plausible-sounding guess is a failure of this task.

**Bytes and structure (per resource)**

1. SHA-256 and byte size of each supplied regional file equal the manifest values, checked before any row was read.
2. Encoding confirmed from the bytes (strict decode, with the count of invalid sequences — expected zero); BOM present or absent, from the first bytes.
3. Delimiter, quoting (whether any `"` occurs anywhere; whether any field contains `,`), newline convention on every line, and presence of a trailing terminator — from the bytes.
4. Exact header row as bytes, equal to the manifest's `observed_header_row`.
5. Column count on every row; the number of rows that do not have exactly three fields (expected zero), with verbatim examples if any.
6. Row count excluding header, compared with the acquisition tool's 646,052 (male) / 694,553 (female) — match or mismatch stated.
7. Sort order as observed (by geography then count? by count? other?), for the whole file.

**Geography column**

8. The complete distinct value list with per-value row counts, per file, verbatim; whether the two files' value sets are identical.
9. Whether every value corresponds to a current TERYT TERC voivodeship (item 22), and every value that does not, verbatim and uninterpreted.
10. Case, diacritics and whitespace form of the values as observed.

**Count column**

11. `Liczba` type from observed values; minimum; maximum; number of rows with `0`; number with `1`; number at the minimum.
12. Duplicate (voivodeship, surname) pairs within a file — count, with verbatim examples if any.

**Surname column**

13. Unicode notes as in the national record: NFC status; combining-mark rows (count, examples); trailing-whitespace rows; embedded `/`; non-Latin scripts — counts and verbatim examples.

**Reconciliation against the same-sex national resource (§9)**

14. Surname-set relation: how many regional surname strings have no byte-identical national row, and how many national strings have no regional row — per sex, with up to ten verbatim examples of each and, where a near-miss is visible (e.g. whitespace), the pair shown verbatim without merging.
15. For every surname string present in both: the number whose regional sum equals the national count, the number lower, the number higher; the minimum, maximum and median of (national − regional sum); the count of surnames where the difference is exactly the number of "missing" cells one would expect under per-cell exclusion — reported as numbers, with the method shown.
16. For every surname in the committed national fixture of the same sex: its national count, its regional sum, the number of voivodeship rows it has, and the difference — as a table.
17. **Observed suppression behaviour**, stated as an observation with its numbers (for example: "no cell below N exists; regional sums are below the national count for X of Y surnames; the shortfall is consistent with per-cell exclusion of single occurrences"), and the explicit status of the question "is the exclusion applied per cell?" — VERIFIED-as-observed or `UNRESOLVED`. The publisher's own wording is quoted; nothing is attributed to the publisher that it did not state.
18. The meaning of a (surname, voivodeship) cell absent from the file, stated consistently with item 17 and `ARCHITECTURE.md` §10 invariant 4: zero, suppressed, or out of scope — never confirmably zero.

**Semantics and rights**

19. Publisher descriptions, `regions`, `contains_protected_data`, `data_date`, portal timestamps and native format restated from the committed official metadata, with the note that `contains_protected_data` is a portal flag, not a review.
20. The sex partition recorded verbatim and uninterpreted (TASK-004 §14 U-1 remains the open item); the record contains no male+female sum and no cross-file comparison.
21. Resource-level licence position as reported by the project owner (obtained / pending / not requested, with date and channel where available); the dataset-level CC0 1.0 statement and the absence of a resource-level licence field re-confirmed from `pesel_dataset_official.json` and the two `official_resource.json` files. Nothing approved.

**TERYT correspondence**

22. TERC data identity: file name, SHA-256 (equal to `1cfbb50e…2768` if the archive copy is used), byte size, source URL as actually used, the register's stated reference date, and the quoted rights statement from `docs/canonical/12` §2.1 with a note on whether the GUS page was actually reached.
23. The correspondence table (`fixtures/teryt/voivodeship-terc-correspondence.json`): one entry per observed geography value with TERC code, TERC name, the comparison method actually used, and `null` for any value with no counterpart; the number of observed values, the number mapped, the number unmapped.

**Fixtures, manifest, record**

24. Both fixtures exist per §6, with the selection method recorded; a recorded check shows every fixture data row appears byte-identically in its source file, and the fixture's `NOWAK` rows sum to a number that is compared with the national fixture value and reported (equal or not — either is a finding).
25. `fixtures/pesel/source-manifest.json` extended per §7, still under `regional_resources_not_ingested`, parses as JSON and passes `pnpm format:check`.
26. Every NOT VERIFIED row of the findings table in `docs/sources/pesel-regional.md` is now VERIFIED or `UNRESOLVED — <reason>`; D-004 carries the findings; `PROGRESS.md` and `docs/CODEMAP.md` carry facts only; `docs/canonical/` is untouched.

## 9. Reconciliation method

This is a **file-to-file comparison of source strings**, not surname resolution. It establishes what the publisher's two representations of the same register field say about each other. Therefore:

- Match `Nazwisko aktualne` between the regional and the same-sex national file **byte-identically on the raw field** — no NFC normalisation (the national values are already NFC; verify that the regional ones are, and report any that are not rather than normalising), no case folding, no trimming, no diacritic folding, no resolver. A regional string that differs from a national one only by whitespace is a near-miss to report verbatim, not a match.
- Never compare across sexes.
- For each surname string in the regional file, sum `Liczba` across all its rows (all geography values, including any non-voivodeship value — and additionally report the sum over voivodeship values only if a non-voivodeship value exists, so the effect of that category is visible).
- Compare with the national `Liczba` for the identical string. Report the counts in §8 item 15 and the fixture table in item 16.
- Report the surname-set differences in both directions (item 14).
- State the observed suppression behaviour (item 17) only in terms the numbers support. Two examples of acceptable statements: "every cell has `Liczba ≥ 2`, and for 100% of matched surnames the regional sum is ≤ the national count" or "regional sums exceed the national count for N surnames — unexplained; UNRESOLVED". An unacceptable statement: "the publisher suppresses cells with one bearer" unless the publisher says so.
- If the full national files are not supplied, run items 14–17 against the committed national fixtures only, label the results as fixture-scoped, and mark the population-level questions `UNRESOLVED — national files not supplied`.

## 10. Verification

Everything below is run and reported with its actual output. Nothing is reported as passing from inspection.

```bash
# before reading any row — per supplied file, against fixtures/pesel/source-manifest.json
sha256sum <regional-male.csv> <regional-female.csv>
stat -c %s <regional-male.csv> <regional-female.csv>
# TERC data, if the archive copy is used
sha256sum <teryt_terc zip>

# after the fixtures and manifest are written
python3 -c "import json; json.load(open('fixtures/pesel/source-manifest.json'))"
python3 -c "import json; json.load(open('fixtures/teryt/voivodeship-terc-correspondence.json'))"   # only if created
# every fixture data row is a byte-identical line of its source (record the script and its output)
pnpm format:check
pnpm test                    # unchanged — no code changed; run to prove it
git status --porcelain docs/canonical docs/library docs/archive docs/reference docs/review prompts   # must be empty
git diff --check
```

`pnpm typecheck`, `pnpm lint`, `pnpm build` and `pnpm test:integration` are not required — no code changes — and must not be reported as run if they were not.

## 11. Definition of done

- Every item in §8 is answered with its command and output, or explicitly `UNRESOLVED — <reason>`. Nothing is guessed, and nothing the publisher did not state is attributed to the publisher.
- The fixtures are real, verbatim, and their provenance is recorded; the manifest is extended and clean.
- The TERC correspondence exists with its provenance, or item 22–23 are marked unresolved with the reason.
- D-004 carries the findings; its status and the adoption decision are unchanged by this task.
- `docs/CODEMAP.md` and `PROGRESS.md` record facts only; `docs/canonical/` and the other read-only directories are untouched.
- The complete `git diff` has been reviewed file by file against §5 and §14.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin regional ingestion, a `Place` foundation, TASK-004, TASK-005 or a `CURRENT_DISTRIBUTION` task. Do not write `tasks/008-*.md`.

## 12. Failure conditions / fail-closed behaviour

- **Environment dependency — check this first.** `dane.gov.pl`, `api.dane.gov.pl` and container registries have been network-egress-blocked in every session so far. This task does not download. If the project owner has not supplied the regional files, **stop and report the blocker**; do not reconstruct facts from metadata, from the acquisition tool's inspection output, or from the canonical corpus and present them as verified from bytes.
- **Checksum mismatch.** If a supplied file's SHA-256 or size differs from the manifest, do not read it as the pinned resource. Record the mismatch (a changed publisher file is a finding), mark every bytes-dependent item unresolved, and stop.
- **Never fabricate** a geography value, a TERC code, a count, a threshold, a licence term, or a reconciliation figure. If the TERC data cannot be checksum-verified or freshly obtained with its URL recorded, omit the correspondence file and mark items 22–23 unresolved. Codes are read from the TERC data; a code typed from memory is a defect even if it happens to be right.
- **Rights.** If the project owner reports a publisher statement that forbids reproducing rows, commit no fixture, mark item 24 unresolved, and stop. Never substitute a synthetic fixture.
- **D-004.** Whatever the bytes show, this task does not change D-004's status or adoption gate. A clean reconciliation and a complete value set are inputs to that decision, not the decision.
- **Non-voivodeship values.** If the geography column contains a value that is not a voivodeship, record it verbatim with its row count, leave it unmapped, and do not fold it into any voivodeship or drop it from any sum without also reporting the sum with it included.
- **Sex partition.** If a comparison across the male and female files seems necessary to explain a number, it is not — record the number as unexplained.

## 13. Preflight for the implementing session

Read-only and targeted; no repository-wide exploration.

1. This file; `docs/sources/pesel-regional.md` (the findings table is the checklist); `docs/sources/pesel.md` "File-level facts" (the format to mirror).
2. `PROGRESS.md` current-state table; D-004 in `docs/DECISIONS_NEEDED.md`.
3. `fixtures/pesel/source-manifest.json` (regional entries and the national baseline); both national fixtures.
4. `docs/sources/acquisition/2026-09-18/README.md` and the two regional `official_resource.json` files.
5. `docs/canonical/12` §9.5, §9.8, §10, §11 and `docs/canonical/11` §6.2 "Critical rule", §20.3 — by line range, not in full.
6. `git status` (clean tree, correct branch); confirm the supplied files are on disk and run the checksum step of §10 before anything else.

## 14. Diff review

Before declaring the task complete, inspect the entire diff file by file and confirm:

1. Nothing from §5 is present — no code, no package, no migration, no validator, no place, no claim, no dependency.
2. Every committed fixture row is byte-identical to a source line (the §10 check ran and passed); no row was retyped, trimmed or normalised.
3. No TERC code appears anywhere that was not read from the recorded TERC file.
4. No figure in the record lacks the command that produced it.
5. No statement attributes a rule to the publisher that the publisher's own text does not contain.
6. No male+female sum, no cross-sex comparison, no comparison with 2025 or earlier resources.
7. `regional_resources_not_ingested` is still the manifest key; D-004's status line and decision options are unchanged.
8. `docs/canonical/`, `docs/library/`, `docs/archive/`, `docs/reference/`, `docs/review/` and `prompts/` are untouched; no raw source file is committed; no debug artefact or stray file remains.

## 15. Documentation / handoff

- `docs/sources/pesel-regional.md` is the record; it must let a later session specify regional ingestion and a voivodeship `Place` foundation without re-reading the bytes.
- `docs/DECISIONS_NEEDED.md` D-004 — findings only, under a dated subsection; the decision stays with the project owner.
- `docs/CODEMAP.md` — `fixtures/pesel/` row extended; `fixtures/teryt/` added if created.
- `PROGRESS.md` — TASK-007 status, files added, commands run with PASS/FAIL, every `UNRESOLVED` item and its reason. No session diary.
