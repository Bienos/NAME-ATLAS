# PESEL surname source — TASK-002 research record

Reproducible source-verification record for `tasks/002-pesel-source-spike.md` (D-001 in `docs/DECISIONS_NEEDED.md`).

**Status: COMPLETE for the national production pair.** Dataset-level facts, the four current production/regional resource IDs, and now the actual file-level facts (structure, encoding, checksum, real rows) for the two national resources are verified against real source bytes. **D-001 is RESOLVED** for TASK-002's mandate — see the D-001 status section below for the two narrow residual items carried forward as non-blocking notes, and `docs/DECISIONS_NEEDED.md` for the authoritative decision record.

## How this record is being built

Automated access to `dane.gov.pl` and `api.dane.gov.pl` is blocked by this session's network egress policy (confirmed repeatedly: `WebFetch` returns `EGRESS_BLOCKED`; `curl` returns `CONNECT tunnel failed, response 403`; DNS resolves fine, so this is a policy block, not a connectivity fault — see `docs/DECISIONS_NEEDED.md` D-001 and `PROGRESS.md` for the exact checks run).

Per TASK-002 §11, the project owner is supplying the required evidence manually instead. **Facts recorded below as "source: project owner" were retrieved by the project owner directly from the official API and relayed into this session — not independently fetched or verified by this session.** Nothing below has been inferred, guessed, or reconstructed from the canonical corpus to fill a gap; every unresolved item is marked as such.

## Dataset-level facts — VERIFIED (source: project owner, manual retrieval from the official `dane.gov.pl` API, dataset 1681)

| Fact | Value | Corresponds to TASK-002 §8 item |
|---|---|---|
| Dataset ID | `1681` | 1 |
| Dataset slug (full, API form) | `1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel` | 1 |
| Dataset title | *Nazwiska występujące w rejestrze PESEL* | 1 |
| Publishing institution | Institution ID `333` — Ministerstwo Cyfryzacji (the Polish ministry `docs/canonical/12` §2.1 calls "the Ministry of Digital Affairs" — same institution, English gloss varies) | 1 |
| Licence | CC0 1.0 | 17 |
| Update frequency (stated) | Yearly | corroborates `docs/canonical/12` §2.1 ("updated annually"); not item 6/7 itself |
| Geography | Poland | context for D-004 — national scope confirmed, not regional; does not resolve D-004 |
| Population scope | Living persons only; deceased persons excluded | 12 |
| Surname field used | Current-surname field | 13 |
| Suppression rule | Surnames occurring exactly once are excluded | 14 |
| Dataset formats offered (platform-wide, not yet tied to a specific resource) | CSV, JSON-LD, XLSX | context for item 5 — not yet resource-specific |
| Resource count | 21 | context for item 2 — the set to narrow down |

### Item 15 — meaning of a missing surname row (derived, not independently new evidence)

Following directly from the verified suppression rule (item 14) and `docs/canonical/12` §9.5 / ARCHITECTURE.md §10 invariant 4: a surname absent from a PESEL surname resource means one of — zero living people carry it with that current-surname value, **or** exactly one person does (suppressed), **or** it is otherwise outside the resource's scope. It does **not** mean a confirmed zero. This is the `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` state `docs/canonical/12` §9.5 anticipates. Marked verified on the strength of item 14; resource-level inspection should still confirm no additional, undisclosed suppression rule exists beyond "count = 1".

### Explicitly NOT inferred from dataset-level metadata (per the project owner's instruction)

- `verified` (a dataset-level verification timestamp) and `modified` (dataset-level "last modified") are **dataset metadata fields, not the PESEL data reference date**. Their existence is noted; their actual values were not included in what was relayed to this session, so they are not recorded here as dates. Do not treat either as item 6 or item 7 until a resource-level date is found and the relationship between the two is explicitly stated.
- No resource ID, title, download URL, format, checksum, header, field type or male/female split has been inferred from the dataset-level response. The dataset having 21 resources does not tell us which are the current male/female production resources — that is exactly what remains open.

## Resource-level facts — VERIFIED: current national production resources (source: project owner, manual retrieval from `/resources?per_page=100` on dataset 1681)

Retrieved via the resource listing endpoint. No session working this task could reach `api.dane.gov.pl` directly — it was network-egress-blocked throughout — so the project owner performed the retrieval and supplied the response.

Per the project owner's explicit instruction, `data_date`, `created`, `modified`, `verified` and `retrieved_at` are distinct metadata fields and are **not** inferred from one another. At the time of this section only `data_date` had a stated value; the other four were recorded as "not yet supplied" rather than assumed. **All four were subsequently supplied and verified** — see "Update — both residual items closed" below for the actual values.

| | Male | Female |
|---|---|---|
| Resource ID | `1148808` | `1148811` |
| Title | *Nazwiska męskie - stan na 2026-01-20* | *Nazwiska żeńskie - stan na 2026-01-20* |
| `data_date` | `2026-01-20` | `2026-01-20` |
| `created` | `2026-01-28T13:47:34Z` (verified later — see below) | `2026-01-28T13:48:39Z` (verified later — see below) |
| `modified` | `2026-01-28T13:47:34Z` | `2026-01-28T13:48:39Z` |
| `verified` | `2026-01-28T13:47:34Z` | `2026-01-28T13:48:39Z` |
| `retrieved_at` | `2026-09-18T17:40:00Z` | `2026-09-18T17:39:46Z` |
| Formats offered | XLSX, CSV, JSON-LD | XLSX, CSV, JSON-LD |

These two resources are recorded as the current 2026 national production pair (male/female separate resources, per item 4) for the same `data_date`. **Do not fall back to a 2025 or earlier resource** — noted per the project owner's explicit instruction, in case a future session is tempted to substitute an older resource for convenience.

`data_date` (`2026-01-20`) is the **resource reference date** (item 6) — the resource's own stated date, distinct from the portal-update timestamp. Item 7 (the portal "updated" date) is now also **verified** as `2026-01-28` — eight days later, confirming the two are genuinely different fields and must never be conflated (`docs/canonical/12` §2.1, D-001). See "Update — both residual items closed" below.

## Resource-level facts — VERIFIED: current regional resources (same retrieval)

| | Male | Female |
|---|---|---|
| Resource ID | `1148786` | `1148790` |
| Title | *Nazwiska męskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20* | *Nazwiska żeńskie wg województwa zameldowania na pobyt stały - stan na 2026-01-20* |
| `data_date` | `2026-01-20` | `2026-01-20` |

**These establish that a current (2026-01-20), lawful, official regional resource exists** — relevant to D-004 in `docs/DECISIONS_NEEDED.md`. This is a fact about resource *existence*, not a decision to build a regional map; see D-004 for the current status and what remains open.

### Hard semantic restriction on the regional resources

The regional dimension is **województwo zameldowania na pobyt stały** — voivodeship of *permanent registered residence* (a legal registration record), for the current-surname holder. Per the project owner's explicit instruction, this **must never be described, in any future task, claim, or UI copy, as**:

- surname origin;
- ancestry;
- birthplace;
- historical distribution;
- necessarily current physical residence (registered domicile and actual current residence can differ — people do not always update registration when they move).

It is, at most, a current administrative registration snapshot. Any future claim built on this resource must carry that exact scope in its methodology, not a looser gloss such as "where the surname comes from" or "where people with this surname currently live."

## File-level facts — VERIFIED from actual source bytes (source: project owner, uploaded the two national CSV files directly; stated to be downloaded from the official dane.gov.pl resource endpoints)

This session did **not** download these files itself (`dane.gov.pl`/`api.dane.gov.pl` remained network-egress-blocked throughout TASK-002 — reconfirmed multiple times, including against the specific resource path). The project owner supplied the actual file bytes as uploads. Every fact in this section was derived by this session directly from those bytes (checksums computed, encoding inspected byte-by-byte, every row parsed and checked) — not asserted from the upload alone.

| | Male (`1148808`) | Female (`1148811`) |
|---|---|---|
| Byte size | 5,293,415 bytes | 5,592,881 bytes |
| SHA-256 | `ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4` | `c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6` |
| Format | CSV (one of the three formats the resource offers; XLSX and JSON-LD not inspected) | CSV |
| Encoding | UTF-8, strictly valid (every byte decodes; no replacement characters needed) | UTF-8, strictly valid |
| BOM | Absent — file begins with the literal header bytes `4e 61 7a…` ("Naz…"), not `EF BB BF` | Absent, same check |
| Delimiter | Comma (`,`) | Comma |
| Quoting | None observed — no field in the entire file contains a comma or a literal quote character | None observed |
| Newline convention | CRLF (`\r\n`) throughout; no bare LF or CR anywhere; trailing CRLF after the final data row | CRLF throughout, same |
| Header row (exact) | `Nazwisko aktualne,Liczba` | `Nazwisko aktualne,Liczba` (byte-identical to male) |
| Column count | 2, consistently, every row | 2, consistently, every row |
| Row count (excluding header) | 408,182 | 420,082 |
| Sort order | Descending by `Liczba`, for the entire file | Descending by `Liczba`, for the entire file |
| `Liczba` (count) range | 2 – 98,387 | 2 – 99,738 |
| Rows with `Liczba = 0` or `= 1` | **Zero** — confirms the suppression rule directly from the bytes, not just from portal metadata | **Zero**, same confirmation |
| Duplicate surnames within the file | None | None |
| Malformed rows (wrong column count, non-numeric count) | **Zero** — the real file is completely clean | **Zero** |

Full machine-readable detail (including the value-type and Unicode notes below) is captured in `fixtures/pesel/source-manifest.json`.

### Value types

- **`Nazwisko aktualne`** — non-empty string. Observed alphabet spans plain `A`–`Z`, the complete set of Polish diacritics (`Ł Ś Ż Ź Ć Ń Ó Ą Ę`), and — because PESEL includes naturalised citizens — a much wider range of scripts: Vietnamese (e.g. `NGUYỄN`, `TRẦN`, `PHẠM`), German/Central European umlauts and carons (`MÜLLER`, `KRÜGER`, `SCHRÖDER`, `KÖNIG`), Hungarian, Romanian, and at least one Cyrillic-adjacent example. Space, apostrophe, hyphen, period, parentheses and forward slash also occur in real surnames.
- **`Liczba`** — a positive integer, confirmed to always be ≥ 2 (item 14/16's suppression rule, confirmed from the bytes). No leading zeros, no thousands separators, no decimal points observed.

### Unicode and data-quality notes (item 11 — do not "fix" any of these; they are the real source, verbatim)

- Every surname value is already NFC-normalised.
- A small number of rows — 7 in the male file, 5 in the female file — contain a base Latin letter immediately followed by a **standalone Unicode combining mark**, for a combination that has no precomposed character (e.g. `DOG̈AN`, `GLA̋SSNER`). This is a genuine property of the official source (most plausibly an upstream transliteration artefact), not a parsing bug, and it is preserved exactly by the parser (see `packages/sources`).
- One row in the female file, `SCHIED ,2`, has a **trailing space in the surname field** — a real data-quality artefact in the official source. Preserved as-is; the parser does not trim surname values.
- A handful of rows contain a **forward slash within the surname** (e.g. `A/GADIR`, `W/SILASSIE`, `W/RUFAEL`) — real values (each still exactly 2 comma-separated fields), not delimiter confusion.

### Item 15 — meaning of a missing surname row (now doubly confirmed)

The dataset-level suppression statement (item 14) is now directly corroborated by the file bytes: no row with `Liczba ≤ 1` exists in either file. A surname absent from the resource therefore means one of — zero living people currently carry it, **or** exactly one does (suppressed), **or** it is outside the resource's scope. It is never confirmably zero (`docs/canonical/12` §9.5, ARCHITECTURE.md §10 invariant 4; the `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` state).

## Fixture (item 19)

Committed at `fixtures/pesel/national-male-2026-01-20.csv` (22 rows) and `fixtures/pesel/national-female-2026-01-20.csv` (23 rows), plus `fixtures/pesel/source-manifest.json` (machine-readable metadata for both national resources and, for D-004's record, the two regional resource IDs).

**Selection method (real rows only, verified byte-for-byte identical to the source — every fixture row was checked to appear verbatim in the original file):**

1. The top 15 rows by count (the most common surnames), in source order — covers common Polish surnames and the bulk of the confirmed Polish diacritic set (`WIŚNIEWSKI`, `WÓJCIK`, `KAMIŃSKI`, `LEWANDOWSKI`, `ZIELIŃSKI`, `WOŹNIAK`, `SZYMAŃSKI`, `DĄBROWSKI`/`DĄBROWSKA`, `KOZŁOWSKI`, `JANKOWSKI`, `KWIATKOWSKI`, …).
2. The first 3 rows (in file order) with `Liczba = 2` — the real suppression-boundary value, per resource.
3. Up to 2 rows demonstrating a non-Polish extended-Latin/foreign-script surname (`MÜLLER`, `NGUYỄN`).
4. 1 row containing a base-letter-plus-combining-mark surname where present (male: `DOG̈AN`; female: `SCHA̋FER`).
5. 1 row containing a forward slash (male: `W/SILASSIE`; female: `W/RUFAEL`).
6. (Female file only) the one row with trailing whitespace in the surname (`SCHIED ,2`).

No row was invented, retyped, or edited — each is copy-identical to its source line, including the trailing CRLF convention.

## Schema description and fail-closed validator (item 20)

Implemented in `packages/sources` (`@name-atlas/sources`, no runtime dependencies): `schema.ts` records the confirmed header, column count, delimiter, line terminator, and minimum valid count exactly as verified above; `decode.ts` fails closed on invalid UTF-8 or an unexpected BOM; `parser.ts` fails closed on the first row that doesn't match the confirmed shape (wrong header, wrong column count, empty surname, non-numeric count, a count below the confirmed suppression threshold, a bare LF/CR line ending, or a missing trailing terminator) and otherwise returns the surname text completely unmodified — no trim, no case change, no Unicode normalisation.

Tested (`packages/sources/src/*.test.ts`, 21 tests, all passing) against:

- both real committed fixtures, including the combining-mark, slash, whitespace and suppression-boundary rows, asserting the parser preserves each exactly;
- one deliberately mutated case per drift category the task requires: wrong header, missing column, extra column, non-numeric count, count of exactly 1, count of 0, negative count, empty surname, LF-only line endings, a missing trailing terminator, a completely empty file, and (in `decode.test.ts`) an unexpected BOM and an invalid UTF-8 byte sequence.

The real source files contain **zero** malformed rows (item 13) — there was nothing to demonstrate fail-closed behaviour with directly from the source, so every drift test uses a minimal deliberately mutated file, as TASK-002 §4 item 13 anticipated.

## Update — both residual items closed, and the bytes independently corroborated (2026-09-19)

The project owner supplied an acquisition archive (`NAME_ATLAS_ALL_DOWNLOADED_DATA.zip`, generated `2026-09-18T17:44:29Z`, 138,623,907 bytes, `sha256 555bc4da551058746a181dc16acaa66e28f39bd98e8ef3c405ff89270a9fb6ea`), split into six parts for upload and reassembled in-session. This session verified all 46 of its data files against the archive's own `SHA256SUMS.txt` — **46/46 OK, zero mismatches** — and then cross-checked it against this record.

**Independent corroboration of the national pair.** The archive downloaded both 2026 national resources from the official endpoint on its own run, and its checksums are byte-identical to the ones recorded above from the separately-supplied files:

```text
ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4   male   1148808   5,293,415 B
c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6   female 1148811   5,592,881 B
```

Two independent acquisition paths, the same bytes. The archive's recorded `final_url` filenames (`2_-_nazwiska_męskie-osoby_żyjące.csv`, `2_-_nazwiska_żeńskie-osoby_żyjące.csv`) also match the filenames of the files supplied earlier.

**Item 3 — exact download/API identifier: RESOLVED.** The archive captured genuine `api.dane.gov.pl` JSON:API responses (`meta`/`data`/`jsonapi`/`links`), stored under `metadata/`, giving the literal endpoints. Both rows below are attribute values read verbatim from that response (`csv_download_url` and `csv_file_url`); this session observed no HTTP redirect, having never reached the host:

| | Male `1148808` | Female `1148811` |
|---|---|---|
| CSV download endpoint | `https://api.dane.gov.pl/resources/1148808,nazwiska-meskie-stan-na-2026-01-20/csv` | `https://api.dane.gov.pl/resources/1148811,nazwiska-zenskie-stan-na-2026-01-20/csv` |
| Direct media file URL (`csv_file_url`) | `…/media/resources/20260128/2_-_nazwiska_m%C4%99skie-osoby_%C5%BCyj%C4%85ce.csv` | `…/media/resources/20260128/2_-_nazwiska_%C5%BCe%C5%84skie-osoby_%C5%BCyj%C4%85ce.csv` |
| Resource metadata endpoint | `https://api.dane.gov.pl/1.4/resources/1148808,nazwiska-meskie-stan-na-2026-01-20` | `https://api.dane.gov.pl/1.4/resources/1148811,nazwiska-zenskie-stan-na-2026-01-20` |

**Item 7 — portal timestamps, distinct from the reference date: RESOLVED.** The official resource metadata supplies all four dates, and they are genuinely different values, which is exactly the distinction this record insisted on keeping:

| Field | Male `1148808` | Female `1148811` | What it means |
|---|---|---|---|
| `data_date` | `2026-01-20` | `2026-01-20` | PESEL reference date — what the data describes |
| `created` | `2026-01-28T13:47:34Z` | `2026-01-28T13:48:39Z` | portal metadata timestamp |
| `modified` | `2026-01-28T13:47:34Z` | `2026-01-28T13:48:39Z` | portal metadata timestamp |
| `verified` | `2026-01-28T13:47:34Z` | `2026-01-28T13:48:39Z` | portal metadata timestamp |
| `retrieved_at` | `2026-09-18T17:40:00Z` | `2026-09-18T17:39:46Z` | when the project owner fetched the bytes |

The portal date (`2026-01-28`) matches what `docs/canonical/12` §2.1 recorded as the dataset's update date, and is eight days later than the reference date (`2026-01-20`). **Four distinct concepts; none is inferred from another.**

**New provenance fact — the CSV is a conversion, not the native upload.** Both resources declare `format: xlsx` natively (`file_size` 7,621,712 male / 7,972,934 female). The CSV this record verified is served by the portal's own `csv_download_url` conversion endpoint — official, but a derived representation of the publisher's XLSX. **TASK-004 must decide deliberately which representation it ingests** and record that choice; the two are not the same bytes and a conversion step is a place where a source can change shape without the publisher changing anything.

Regional resources (`1148786`, `1148790`) now also have confirmed checksums, endpoints and a real observed header row (`Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba`) recorded in `fixtures/pesel/source-manifest.json`. They remain **not downloaded into the repository, not parsed, not ingested** — D-004's decision is untouched by this.

The archive additionally contains PESEL national data for 2019–2025, regional for 2025, and non-Polish sources (US Census, France INSEE, Belgium, GeoNames, TERYT, Morfeusz). **None of it is ingested, validated, or rights-reviewed**, and multi-country coverage is an explicit MVP non-goal (`PRODUCT.md` §8 item 9). Earlier annual snapshots are not trend data: comparable methodology across years is unproven, and the archive's own report says so.

## D-001 status

**RESOLVED** (`docs/DECISIONS_NEEDED.md` has the authoritative record). All 20 items in TASK-002 §8 now have a verified answer sourced above — including items 3 and 7, which were previously carried forward as residuals and are closed by the evidence in the section above. Nothing was guessed.

One item from D-001's original "what is not settled" list remains open by design: the **rarity/`1-in-X` denominator** question is a TASK-004/TASK-005 modelling decision, not a source-verification fact, and was never part of TASK-002 §8's 20 items. It belongs to whichever task designs `RARITY_CONTEXT`.
