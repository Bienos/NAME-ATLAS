# PESEL annual series — identity and shape record

**Status: IDENTITY AND SHAPE ONLY · NOTHING HERE IS ADOPTED, INGESTED OR FIXTURED.**

The production source stays the 2026 national pair, resources `1148808` and `1148811`
(`docs/sources/pesel.md`, D-001). This file exists for one narrow purpose: **refresh safety.**
D-001 anticipates the annual refresh and instructs that the verification be repeated for a new
resource rather than assumed to match. This record is what a future refresh session should read
first, because two facts below mean a new annual resource cannot be trusted to look like the
current one.

**What this file deliberately is not.** It is not a year-over-year comparison. No count is compared
across years, no trend is computed, no claim is derived, and no earlier-year resource is proposed
for use. `docs/sources/acquisition/2026-09-18/README.md` rules out casual year-over-year use, and
the anomalies recorded here are exactly why. Historical or dated distribution is a separate
milestone from current population (`PLAN.md`; `ARCHITECTURE.md` §10 invariant 5), and nothing here
authorises it.

## Provenance

The project owner supplied 20 distinct CSV files from their 2026-09-18 acquisition archive during
the TASK-008 session on 2026-09-19. **Every one of the 20 digests appears in the archive's
`SHA256SUMS.txt`, which this repository already commits** — so these are authentic archive copies,
not re-saves. Only file identity and structural shape were read. The raw files are not committed
(`AGENTS.md` §6).

## The series as supplied

| Scope | Year | Sex | Resource | Bytes | Data rows | Header |
|---|---|---|---|---:|---:|---|
| national | 2019 | female | 18988 | 3,993,861 | 297,456 | `nazwisko,liczba` |
| national | 2019 | male | 18990 | 3,610,164 | 277,108 | `nazwisko,liczba` |
| national | 2020 | female | 22815 | 3,988,200 | 299,612 | `Nazwisko aktualne,Liczba` |
| national | 2020 | male | 22817 | 3,662,490 | 283,221 | `Nazwisko aktualne,Liczba` |
| national | 2021 | female | 35279 | 4,141,803 | 311,240 | `Nazwisko aktualne,Liczba` |
| national | 2021 | male | 28052 | 3,859,773 | 298,692 | `Nazwisko aktualne,Liczba` |
| national | 2022 | female | 38772 | 4,141,803 | 311,240 | `Nazwisko aktualne,Liczba` |
| national | 2022 | male | 36401 | 4,160,756 | 322,232 | `Nazwisko aktualne,Liczba` |
| national | 2023 | female | 44646 | 5,169,657 | 389,365 | `Nazwisko aktualne,Liczba` |
| national | 2023 | male | 44647 | 4,692,377 | 363,360 | `Nazwisko aktualne,Liczba` |
| national | 2024 | female | 54098 | 5,324,053 | 400,764 | `Nazwisko aktualne,Liczba` |
| national | 2024 | male | 54097 | 4,904,484 | 379,712 | `Nazwisko aktualne,Liczba` |
| national | 2025 | female | 63888 | 5,465,724 | 411,012 | `Nazwisko aktualne,Liczba` |
| national | 2025 | male | 63892 | 5,114,559 | 395,127 | `Nazwisko aktualne,Liczba` |
| **national** | **2026** | **female** | **1148811** | **5,592,881** | **420,082** | `Nazwisko aktualne,Liczba` |
| **national** | **2026** | **male** | **1148808** | **5,293,415** | **408,182** | `Nazwisko aktualne,Liczba` |
| regional | 2025 | female | 65090 | 17,891,156 | 694,199 | `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` |
| regional | 2025 | male | 65049 | 16,619,443 | 646,100 | `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` |
| regional | 2026 | female | 1148790 | 17,900,370 | 694,553 | `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` |
| regional | 2026 | male | 1148786 | 16,615,897 | 646,052 | `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` |

The two bold rows are the production resources. Every file carries a single consistent field count
on every row. Resource ids are not sequential by year and the male id is sometimes lower than the
female id of the same year, so **a resource id must never be derived from a year**.

## Finding 1 — the 2019 schema is different, and the field may not be the same field

The 2019 pair's header is **`nazwisko,liczba`**. From 2020 onward it is
**`Nazwisko aktualne,Liczba`**. Two differences, and only one of them is cosmetic:

- letter case differs, which is cosmetic; and
- the column is named **`nazwisko`** — surname — not **`nazwisko aktualne`** — *current* surname.

The whole project rests on the current-surname field. `docs/canonical/12` §9.4 requires the
surname field to be preserved as the source gives it, and D-001 records that the production
resources use the current-surname field specifically. **The 2019 resources do not say they carry
that field.** Whether the underlying data is the same and only the label changed, or the 2019
extract used a different field, is **not stated by the publisher and is not inferable from the
bytes.** Treat any pre-2020 resource as a different field until the publisher says otherwise.

The committed parser already enforces this and was confirmed to do so: it rejects the 2019 file
with `PeselSchemaError: line 1: expected header "Nazwisko aktualne,Liczba", found
"nazwisko,liczba"`. That is correct fail-closed behaviour and must not be relaxed to accept the
2019 shape.

## Finding 2 — two resource ids carry byte-identical files

```text
sha256 9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0
  pesel_national_2021_female_35279__9af26480ed30.csv
  pesel_national_2022_female_38772__9af26480ed30.csv
```

Both are 4,141,803 bytes with 311,240 data rows, and `cmp` reports no difference. **Two different
publisher resource ids, two different year labels, one identical file.** The archive's own
`SHA256SUMS.txt` already carries the digest twice; having both files confirms it rather than
inferring it.

At least one of those two year labels is therefore wrong, or the same content was genuinely
published twice under two resources, or the acquisition run fetched one resource's bytes for both.
**Which of those it is cannot be settled from the bytes**, and no version of it is safe to build a
series on. The male files for 2021 and 2022 differ normally, so the anomaly is confined to the
female pair.

## What a refresh session must do

1. **Never assume the new resource matches this record.** Re-verify the header, the column count,
   the row count, the encoding, the line endings and the suppression floor from the new bytes, as
   TASK-002 did and as TASK-008 did for the regional pair.
2. **Never derive a resource id from a year.** Read it from the portal's own resource listing.
3. **Check the new file's digest against every digest already recorded.** If it collides with an
   existing resource, stop and record it: finding 2 shows that happens.
4. **Treat a header change as a schema change, not a rename.** Finding 1 shows the field name itself
   moved once already.
5. **Keep the parser failing closed.** A new annual shape needs a deliberate, recorded decision, not
   a widened validator.
6. Per ADR-0003, a reissued resource creates a **new** `SourceRecord` superseding the old one; it
   never updates a row in place.

## Scope note on the 2025 regional pair

Resources `65090` and `65049` were supplied and appear above for identity only. Their **shape**
matches the 2026 regional pair, which is worth knowing for refresh planning. Nothing else about
them was read, no value was compared with the 2026 pair, and they remain outside every accepted
task. D-004 concerns the 2026 regional pair.
