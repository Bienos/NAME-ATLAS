# Acquired source data — inventory

What was downloaded in the acquisition run of **2026-09-18**, what is in this repository, and what
each source would and would not let the product say.

Provenance for the whole run is committed: `docs/sources/acquisition/2026-09-18/` holds the report,
`SHA256SUMS.txt` for all 46 files, and the publisher's own resource metadata for every one of them.
**The data files themselves are not in this repository** — see §3.

## 1. What exists

All 46 files verified against the run's own `SHA256SUMS.txt` on 2026-09-21: **46 OK, 0 failed**.

| Source | Files | In the product? |
|---|---|---|
| **PESEL national**, `dane.gov.pl` dataset 1681 | 2019–2026, male + female, 16 files | **2026 imported and verified.** 408,182 + 420,082 rows, checksums match the registry exactly. |
| **PESEL regional** (voivodeship of permanent registered residence) | 2025 + 2026, male + female, 4 files | **2026 imported and verified.** 646,052 + 694,553 rows, checksums match. |
| **TERYT** TERC (regions) + SIMC (localities) | 2 zips | Partly. `fixtures/teryt/voivodeship-terc-correspondence.json` carries the 16 voivodeship codes; the full hierarchy is not loaded. |
| **GeoNames** PL, cities15000, countryInfo, admin1 | 5 files | No. |
| **Morfeusz** Polish morphological dictionary | 2 files (7.5 MB binary, 42 MB text) | No — and see the warning in §4. |
| **US Census** surnames 1990, 2000, 2020 | 3 files | No. |
| **France INSEE** national + department | 2 zips | No. |
| **Belgium** top-10,000 2017–2026, regions, municipalities | 12 files | No. |

Four of the fifty attempted sources failed and are **not** in the bundle: US Census 2010 (server
returned an HTML error page), TERYT WMRODZ (same), PRNG localities (XML DTD refused), PRG
voivodeship boundaries (feature type ambiguous). The last is the one that matters: it is the
boundary geometry a real map needs, and its absence is why the geography chapter is a table.

## 2. What this changed

The 2026 PESEL quartet is what made the product real. Before it, every derivation that needs a
complete universe refused, correctly, because the committed fixtures are 22- to 40-row excerpts.
With the full register imported (2026-09-21, verified against the registry's pinned checksums):

- 598,476 surnames;
- rank, rarity and distribution derive instead of refusing;
- `GEOGRAPHY` becomes a second substantive value family, so `docs/canonical/21` §42 is satisfiable
  and a surname page can be indexed at all.

The 2019–2025 national series is a **time series** nothing consumes yet. It would support
year-over-year claims, which need their own claim type, their own comparability rules and a decision
about how a changing register is described. That is a task, not an import.

The 2025 regional pair carries `data_date = 2025-02-24`, a different snapshot from 2026-01-20. It
would be a second `DistributionSnapshot`, not a correction of the first.

## 3. Why the data files are not committed

Two independent reasons, either sufficient:

- **Size.** 238 MB uncompressed. This repository commits small lawful excerpts (`fixtures/pesel` is
  22 and 23 real rows) precisely so that what is committed can be read and checked.
- **Rights.** `ARCHITECTURE.md` §5 and `docs/canonical/12` require a source to carry a rights profile
  before its data is used, and only PESEL has one (CC0 1.0 at dataset level; D-007). US Census,
  INSEE, Belgium Statbel, GeoNames and Morfeusz each carry their own terms, none assessed. Committing
  them would put data in the repository that nothing has cleared — the opposite of what the rights
  layer exists to prevent.

What is committed is everything needed to **re-acquire and verify**: the publisher's resource
metadata per file, every SHA-256, and the acquisition report. A future session can check any file it
is given against these without trusting it.

## 4. Warnings that are easy to get wrong

- **Morfeusz is morphology, not etymology.** It gives inflection and word formation. It is not an
  onomastic authority and it may not be used as a `SURNAME_MEANING` source: ADR-0008 (Path B)
  requires an attributed interpretation from a citable specialist work, and a morphological analyser
  attributing nothing is exactly the generated meaning that ADR forbids. Using it to say what a
  surname *means* would be the failure mode this project is built to avoid.
- **TERYT, SIMC, GeoNames and PRG are geography infrastructure.** A surname appearing in a place is
  not evidence that it originated there. The acquisition report says this too.
- **The foreign registers are not comparable with PESEL.** France is a birth-cohort dataset; the US
  releases apply disclosure thresholds that differ by year; Belgium publishes top-10,000 lists with
  municipal suppression. None shares PESEL's scope, date or denominator, so none may be set beside a
  PESEL figure — `docs/canonical/16` §24's comparability rule applies across countries as much as
  across sexes.
- **Suppressed is not zero**, in every one of these registers.

## 5. Where the bytes are

Supplied by the project owner as a five-part archive on 2026-09-21 and extracted into this session's
scratch space, which is **ephemeral**. Nothing outside this repository survives the session. Keeping
the archive is the owner's; re-acquiring from `dane.gov.pl` and the other publishers is possible for
anyone with network egress, and the committed checksums make the result verifiable.

## 6. Captured by source spikes

Not part of the 2026-09-18 run. These are small, real captures, each with its own manifest or checksum list. Polona's are committed as fixtures, and *Onomastica*'s as an acquisition record.

| Source | Files | In the product? |
|---|---|---|
| **Polona** (Biblioteka Narodowa's digital library): search, object records, OCR | `fixtures/polona/`: 10 search responses, 125 object records and 1 OCR page, captured 2026-09-29 by TASK-031; digests in `source-manifest.json` | **No.** A spike only. There is no connector, no `Source` or `RightsProfile`, and no claim. `automated_access` is `UNKNOWN` (D-021). Record: `docs/sources/polona.md`. |
| ***Onomastica*** (IJP PAN's journal): the OJS site, journals.pan.pl and RCIN | `docs/sources/acquisition/2026-09-29-onomastica/`, captured 2026-09-29 by TASK-032. `metadata/` holds verbatim OAI-PMH, DOAJ and Crossref responses and three `robots.txt` files. `inventory.csv` has one row per item per channel. `SHA256SUMS.txt` covers every byte retrieved. **No article bytes:** the 511 PDFs (383 from the OJS site, 128 from journals.pan.pl) and all HTML pages are listed by digest only. | **No.** A spike only. There is no `Source`, `RightsProfile`, source file or claim. The licence statements conflict, and the project owner dropped the journal as a meaning source (D-022, 2026-09-29). Record: `docs/sources/onomastica.md`. |
