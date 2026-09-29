# Fact-lab data folder (scratchpad only — never commit these data files)

All files downloaded 2026-09-29. Checksums: pesel_sha256.txt. Source URLs: pesel_urls.tsv.

## PESEL surname files (Ministry of Digital Affairs, dane.gov.pl, CC0 1.0 at dataset level)
Folder: pesel/. File name pattern: <dataset>_<sex M|F>_<reference date>_r<resource id>.csv
Surnames are UPPERCASE, UTF-8. Single occurrences are suppressed in every file (a missing surname = "fewer than 2 entries or absent", NEVER zero).

- 1681_*  = living persons, current surname, national. 16 files: M and F for 2019-06-30, 2020-01-22, 2021-02-01/02, 2022-01-27, 2023-01-30, 2024-01-19, 2025-01-22, 2026-01-20.
  Header "nazwisko,liczba" (2019) or "Nazwisko aktualne,Liczba" (2020+). Values may need .strip().
  QUIRK: 1681_F_2021-02-02_r35279.csv and 1681_F_2022-01-27_r38772.csv are BYTE-IDENTICAL (same SHA-256): the portal's "2022" female resource is a copy of 2021. There is no real female 2022 snapshot.
  QUIRK: 2019 reference date is June, all others January. Distinct male surnames rise 277,108 (2019) -> 408,182 (2026).
  The 2026 national CSVs are byte-identical to the checksums pinned in the repo (fixtures/pesel/source-manifest.json).
- 1681woj_* = living persons by "województwo zameldowania na pobyt stały" (voivodeship of PERMANENT REGISTERED residence), M/F, 2025-02-24 and 2026-01-20.
  Header "Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba". Voivodeship names uppercase (e.g. DOLNOŚLĄSKIE).
  The 2026 voivodeship files share the reference date 2026-01-20 with the 2026 national files, so they can be reconciled.
- 568_*   = INCLUDING deceased persons (dataset 568), national: M/F 2024-01-19, M/F 2025-01-22, F 2026-01-20 (no M 2026 exists). Header misspelt "Nawisko aktualne,Liczba".
  QUIRK: earlier 568 files (2017, 2019-04) are internally inconsistent with the living series — not included here except:
- 568woj_* = including deceased, by voivodeship WITH TERYT code, 2017-12-31 (header "Województwo,TERYT,Nazwisko,Liczba wystąpień"). Different universe from 1681woj; compare shares only, with a caveat.

## Other datasets
- us/Names2020_LastNames_RaceHispanic.xlsx — US Census Bureau, 2020 Census last names (released 2026-04-14): 156,621 surnames with >=100 bearers, statistical noise ~±2, diacritics stripped (WISNIEWSKI). Header row is the 3rd row. DROP ALL race/Hispanic columns on load — never use them.
- us/names2000/app_c.csv — 2000 Census surnames (>=100 bearers). Columns name,rank,count,prop100k,cum_prop100k + race columns (DROP race columns). 2010 file could not be downloaded (census.gov WAF blocked this environment).
- wwi/Verlustlisten_1WK_Deutschland.parquet — Verein für Computergenealogie, German WWI casualty lists 1914–1919, 8,551,758 entries, CC0 (Zenodo DOI 10.5281/zenodo.18330751), documentation PDF alongside.
  Columns: id, uuid, page, lastname, firstname, Ausgabe, Datum, Ort, Liste, "Reg. o.ä.", Status, GOV-Id, Dienstgrad, "Bemerk.", Geburtsdatum. Entries are list entries, not unique people.
- ../prng/PRNG_MIEJSCOWOSCI_XLSX.xlsx — official register of geographic names (GUGiK), localities export 2026-09-28, 124,247 rows; column "przymiotnik" = official adjective form (e.g. "abramowski"); "województwo", "współrzędne geograficzne" (DMS). Licence CC BY 4.0 (dane.gov.pl dataset 780) — credit GUGiK.
- ../sgjp.tab.gz — SGJP inflection data (Morfeusz 2 release 2026-08-24, BSD-2 licence text in header). Tab-separated: form, lemma:tag-id, morphosyntactic tag, qualifier (e.g. "nazwisko"). ../surnames_sgjp.txt = extracted surname lemmas.
- ../sjp_odm.zip — sjp.pl word list with inflected forms (odm.txt, CC BY 4.0 or Apache 2.0). Lines: comma-separated forms of one lexeme, base form first.
