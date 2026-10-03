# PESEL given-name lists (dane.gov.pl dataset 1667)

Source record for TASK-078 (ADR-0031). Read on 2026-10-03.

- **Dataset:** "Lista imion występujących w rejestrze PESEL", Ministerstwo Cyfryzacji, https://dane.gov.pl/pl/dataset/1667,lista-imion-wystepujacych-w-rejestrze-pesel (API: `https://api.dane.gov.pl/1.4/datasets/1667`).
- **Licence:** "CC0 1.0", as the dataset's metadata states. Update frequency "Rocznie" (yearly).
- **The publisher's note:** "Zestawienie imion żeńskich i męskich występujących w rejestrze PESEL wraz z liczbą wystąpień. … Pojedyncze wystąpienia oraz dane dot. osób zmarłych nie zostały umieszczone na liście." In English: single occurrences and data on deceased people are not on the list.
- **Resources:**
  - One file per sex and name position (`imię pierwsze`, `imię drugie`).
  - Snapshots from 2019-07-18 to 2026-01-20.
  - From 2021 the files are XLSX with a portal-generated CSV at `csv_download_url`. The 2020 files are also published as CSV.
- **Imported (TASK-078):** 1159669 (male, first) and 1159670 (female, first), dated 2026-01-20. Their checksums, sizes, row counts and totals are pinned in `packages/sources/src/given-names/registry.ts`, and the publisher's resource objects are saved verbatim in `acquisition/2026-10-03/metadata/`.
- **Shape:**
  - The files are UTF-8 with no byte-order mark and CRLF line ends.
  - The header is `IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ`.
  - The sex column is `MĘŻCZYZNA` or `KOBIETA` and is constant per file.
  - The count is at least 2, and rows are ordered by count.
- **What the lists hold besides names (ADR-0031 §3–4):**
  - **Placeholders:** `BRAK DANYCH` (male 1,001; female 128), `BRAK IMIENIA`, `BRAK`, `BRAKDANYCH`, `-` and `XXX`.
  - **One-character forms:** `I`, `M`, `E`.
  - **Abbreviated forms:** `MD.`, `MA.`, `MA. CRISTINA`, `ROMEO JR.`.
  - **Compound foreign names in one field:** `JUAN CARLOS`.
  - **Non-Polish diacritics:** `ALİ`, `THỊ`, `JĀNIS`.
- **Related, not imported:**
  - dataset 1501, the same lists with the deceased included, CC0 1.0;
  - dataset 219, names given to newborns per year 2000–2026, CC0 1.0. Its cut-off for a published name fell from 5 to 2 in 2013.
