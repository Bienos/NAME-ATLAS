# PESEL earlier editions (2019–2025) — rights and file-integrity check

> **Recovered 2026-09-30 from the unmerged branch `claude/peaceful-planck-u659j1`.** It was written on the old default-branch base, before TASK-043 and TASK-044 reached `main`, and is otherwise unedited except the appendix at the end. Its decision numbers are that branch's own. Its D-007 ("earlier editions as a time series") and its D-006 (the unit of `Liczba`) are not `main`'s D-007 (PESEL resource-level licence) or D-006 (`SourceRecord` granularity). On `main`, the unit is settled by ADR-0004 and `docs/sources/acquisition/2026-09-29-pesel-unit/`, and the use of earlier editions as a series by ADR-0019 and TASK-044. Statements below that these editions are "not ingested" describe that base.

Checked 2026-09-29/30 (UTC). Same dataset as the production pair recorded in `docs/sources/pesel.md`
(dane.gov.pl dataset 1681, "Nazwiska występujące w rejestrze PESEL", publisher Ministerstwo Cyfryzacji).
Evidence: `docs/sources/acquisition/2026-09-30/`.

**Status: acquired and verified at file level. Not ingested, not fixtured, not a usable time series.**
Nothing here changes the production source, the fixture or the importer. `docs/sources/pesel.md:56` still
holds: an earlier edition never stands in for the current count.

## Rights

- Dataset-level `license_name = "CC0 1.0"`, read live from `api.dane.gov.pl/1.4/datasets/1681` at
  2026-09-29T23:50:33Z. All `license_condition_*` fields are empty or null. Dataset `modified` 2024-06-19.
- Resource-level metadata for every earlier resource carries no licence field, exactly as for the 2026
  resources. The limitation recorded in `fixtures/pesel/source-manifest.json` (`licence_provenance`) applies
  unchanged: resource inheritance of the dataset licence is assumed, not verified.
- Result: the earlier editions have the same rights position as the 2026 pair. No separate restriction was
  found. Whether the licence shown at each edition's original publication date was also CC0 was not checked;
  CC0 is what the portal offers today.

## What was downloaded

All 17 resources in the dataset with `data_date` before 2026: 15 national, 2 regional. For each, the publisher's
native file (`download_url`) and the portal's CSV conversion (`csv_download_url`) where one exists. 33 files.
Resource 18989 is itself a native CSV and has no conversion. Full list with URLs, byte sizes, SHA-256 and fetch
times: `acquisition/2026-09-30/SOURCES.tsv`.

| data_date | Resource (sex, scope) | CSV rows | Header | Surname-column cell |
|---|---|---:|---|---|
| 2019-06-30 | 18988 F national (xlsx) + 18989 F national (csv) | 297,456 | `nazwisko,liczba` | `PRAWDA` text |
| 2019-06-30 | 18990 M national | 277,108 | `nazwisko,liczba` | `PRAWDA` text |
| 2020-01-22 | 22815 F national | 299,612 | `Nazwisko aktualne,Liczba` | boolean TRUE, count 285 |
| 2020-01-22 | 22817 M national | 283,221 | same | boolean TRUE, count 291 |
| 2021-02-01 | 28052 M national | 298,692 | same | boolean TRUE, count 284 |
| 2021-02-02 | 35279 F national | 311,240 | same | boolean TRUE, count 284 |
| 2022-01-27 | 36401 M national | 322,232 | same | boolean TRUE, count 282 |
| 2022-01-27 | 38772 F national | 311,240 | same | boolean TRUE, count 284 |
| 2023-01-30 | 44647 M national | 363,360 | same | `PRAWDA` text |
| 2023-01-31 | 44646 F national (title says "stan na 2023-01-30") | 389,365 | same | `PRAWDA` text |
| 2024-01-19 | 54097 M national | 379,712 | same | `PRAWDA` text |
| 2024-01-19 | 54098 F national | 400,764 | same | `PRAWDA` text |
| 2025-01-22 | 63892 M national | 395,127 | same | `PRAWDA` text |
| 2025-01-22 | 63888 F national | 411,012 | same | `PRAWDA` text |
| 2025-02-24 | 65049 M regional | 646,100 | `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` | `PRAWDA` text |
| 2025-02-24 | 65090 F regional | 694,199 | same | `PRAWDA` text |

"CSV rows" excludes the header. Sex labels are the publisher's titles ("Nazwiska męskie" / "żeńskie"); the
partition caveat in `docs/sources/pesel.md` applies to every edition.

## Findings

1. **All bytes check out.** All 33 files match the byte sizes the portal declares. All 16 CSV files match the
   SHA-256 values in `acquisition/2026-09-18/SHA256SUMS.txt`, so the publisher has not changed them since
   that run. The 17 native files were not in that archive; their checksums are new.
2. **The 2026 production pair was re-downloaded from the official endpoint** (`csv_download_url`, 2026-09-30)
   and matches `fixtures/pesel/source-manifest.json` exactly (`ce4238fe…` male, `c508680d…` female). Earlier
   sessions could not reach dane.gov.pl, so this is the first direct check of those checksums against the
   publisher.
3. **Female 2021 (35279) and female 2022 (38772) are the same data, at the publisher.** The two native xlsx
   files differ in bytes (5,186,584 vs 5,785,728) but their cell content is identical: 311,240 rows, same
   content hash, same first rows (NOWAK 102,503; KOWALSKA 69,240). Their CSV conversions are byte-identical.
   So this is not a portal conversion fault. The files do not say which reference date the data belongs to.
   Portal `created`: 35279 on 2021-12-21, 38772 on 2022-05-25. Not resolved.
4. **One surname cell is a spreadsheet boolean in every 2020–2022 file.** In all six native xlsx files one
   surname cell is type `b` (boolean) with value 1, not text (cells A11157, A10781, A11064, A11210, A11198,
   A11210). The portal's CSV conversion writes it as `True`. In the same files there is no `PRAWDA` row; in
   2019, 2023–2025 and 2026 there is a `PRAWDA` row with a similar count (276–293). Reading the TRUE cell as
   `PRAWDA` is an **inference**: a spreadsheet in Polish locale converts typed `PRAWDA` to boolean TRUE. The
   publisher has not confirmed it. No other non-text surname cell exists in any of the 16 xlsx files (column A
   in the national files, column B in the two regional files; all checked).
5. **The existing parser would not catch finding 4.** `packages/sources/src/parser.ts` accepts any non-empty
   surname, so `True` would enter as a surname. It requires the exact header, so the 2019 files
   (`nazwisko,liczba`) would fail closed. It is only used for the 2026 pair today, which has `PRAWDA` as text.
6. **Minimum `Liczba` is 2 in every national file**, consistent with the single-occurrence exclusion in
   `docs/canonical/12` §9.5. D-006 (unit of `Liczba`) remains open and applies to every edition.
7. **Row counts jump between 2022 and 2023** (male 322,232 → 363,360; female 311,240 → 389,365). The cause is
   not established. Do not read it as population change.
8. **Reference dates are irregular**: 2019-06-30, then late January or early February; male and female
   editions differ by a day in 2021 and 2023; resource 44646's title and `data_date` disagree.
9. **The 2025 regional pair** (65049, 65090) is the earlier edition of the D-004 resource. It was downloaded
   and hashed only. D-004's binding semantic restriction and adoption gate apply unchanged.

## What must happen before any "counts over time" use

See D-007 in `docs/DECISIONS_NEEDED.md`. In short: settle which year the 35279/38772 data belongs to (or exclude
both), decide how the boolean cell is handled (the project may not silently rewrite it to `PRAWDA`), handle the
2019 header variant, and resolve D-006. Publisher contact from the portal's institution record:
Ministerstwo Cyfryzacji, `kancelaria@cyfra.gov.pl`, +48 22 250 01 10
(`acquisition/2026-09-30/metadata/pesel_institution_333.official.json`).

## Where the bytes are

Not in this repository, by design (`acquisition/2026-09-18/README.md`). This session's copies are in an
ephemeral container. Re-fetch from the URLs in `acquisition/2026-09-30/SOURCES.tsv` and check against
`acquisition/2026-09-30/SHA256SUMS.txt`. A mismatch means the publisher changed the file, which is a finding.

## Appendix — placeholder surnames (recovered from `claude/optimistic-thompson-gy5uoc`)

Recorded on 2026-09-29 by another session, on an old base. It is **not in the checks above and was not re-verified when it was recovered.** The counts are that session's. The last paragraph says the importer has no rule against these values; On 2026-09-30 a search for `BRAK DANYCH` and `PRAWDA` found neither string in `main` (outside `docs/progress/`, `PROGRESS.md` and `fixtures/`), nor in `tasks/`, `packages/`, `ops/` or `docs/progress/` of `claude/inspiring-bohr-vten7x`, the branch that holds TASK-045. A rule that does not name them was not looked for.

**Update, same day.** TASK-045's importer rule is that an edition creates no surname entity and writes no row for a surname absent from the current register. That dropped these placeholder rows and the `True` rows (neither string is a surname of the current register) on 2026-09-30, and the gate's surname count stayed 598,476. `PRAWDA` therefore has no 2020, 2021 or 2022 data point in the database. See `docs/progress/2026-09-30-pesel-editions-loaded-on-the-vm.md`.

### Placeholder values published as surnames

| Value | Meaning | Where it appears (count) |
|---|---|---|
| `BRAK DANYCH` | "no data" | 2019 women 216, men 847; 2020 women 335, men 1,095; 2022 men 2,427 |
| `BRAK NAZWISKA` | "no surname" | 2019 women 118, men 326; 2020 women 117, men 327; 2022 men 326; 2025 women 161 |
| `5A5` | — | 2025 women 2 |
| `.` / `-` | — | 2019 only |

Neither `BRAK DANYCH` nor `BRAK NAZWISKA` is in the 2026 files. **Undetermined, present in every edition including 2026:** `BRAK` (2026: 184 women, 243 men), `NIEZNANY` (9 men / 4 women in 2026) and `NIEZNANA` (9 women). These may be real surnames or placeholders; this record does not decide which.

`packages/sources` has no rule against any of these values, so importing an affected edition would create a `Surname` for "BRAK DANYCH". Nothing was changed; this is recorded for whichever task first imports an edition other than 2026.
