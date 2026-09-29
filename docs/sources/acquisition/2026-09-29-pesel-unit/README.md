# Acquisition record — 2026-09-29, the PESEL unit statement

The evidence underneath the "Unit of `Liczba`" section of `docs/sources/pesel.md`: the publisher's own published
reading of its counts, captured verbatim, and a check of its figures against the dataset's bytes. It fills the gap
that section recorded ("its verbatim sentences and publication date are **not** in this repository").
**No source bytes are stored here** (same policy as `../2026-09-18/README.md`).

It changes no decision. TASK-004 §14 U-4 was decided by the project owner on 2026-09-20 as unit `PEOPLE`
(ADR-0004 amendment). This record is the publisher confirmation that amendment anticipated, and it agrees with it.

## What is kept here

| Path | What it is |
|---|---|
| `SHA256SUMS.txt` | Every byte retrieved. Paths under `metadata/` are committed. The other three are listed so a re-download can be checked; they are not committed. |
| `metadata/dataset_1681.json`, `metadata/resource_28052.json`, `metadata/resource_35279.json` | Verbatim `api.dane.gov.pl/1.4` responses, byte for byte as served (`curl -sS`), excluded from formatting by `.prettierignore`. |

## Retrieval

`curl` through the session's HTTPS proxy, 2026-09-29. `dane.gov.pl` and `api.dane.gov.pl` answered HTTP 200, as did
`www.gov.pl`.

| URL | Bytes | SHA-256 |
|---|---:|---|
| `https://www.gov.pl/web/cyfryzacja/nowak-znowu-pierwszy` | 37,430 | `e6ac90874bd0d9f0d515912d7c019599fec92cae7cb6dfdec44ce35dea2dee16` |
| `https://api.dane.gov.pl/resources/28052,nazwiska-meskie-stan-na-2021-02-01/csv` | 3,859,773 | `ea466f2b8611be038913c6354bb13a5d029f5ff0ced07eea7ef282f5f52c215c` |
| `https://api.dane.gov.pl/resources/35279,nazwiska-zenskie-stan-na-2021-02-02/csv` | 4,141,803 | `9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0` |

The gov.pl page is a dynamic CMS page. Its checksum records what was observed, not a stable identifier.

## The publisher's statement

- **Publisher:** Ministerstwo Cyfryzacji (institution `333`), the publisher of dataset 1681.
- **Page title:** `Nic nowego - Nowak znowu pierwszy`
- **Publication date shown on the page:** `10.02.2021`

Sentences quoted verbatim, with HTML tags stripped and entities decoded:

> Najwięcej, bo aż 203 120 Polek i Polaków ma na nazwisko Nowak.

> Listę tych najpopularniejszych tworzymy na podstawie danych z rejestru PESEL i publikujemy na portalu

(the link that follows is labelled `nazwiska występujące w Rejestrze PESEL`)

> Mowa o Nowaku. Takie nazwisko nosi 203 120 Polek i Polaków.

> Nowak – tak na nazwisko ma 102 503 kobiet i 100 617 mężczyzn

> Na tym miejscu wśród mężczyzn znajduje się nazwisko Woźniak. Nazywa się tak 43 487 mężczyzn. Wśród kobiet, przed panią Woźniak znajduje się Dąbrowska – 44 204 osób.

## The figures are the dataset's `Liczba` values

The two CSVs above are the 2021 national resources of dataset 1681. Both have the header `Nazwisko aktualne,Liczba`,
the same as the 2026 pair. Their SHA-256 values are **identical** to lines 5–6 of `../2026-09-18/SHA256SUMS.txt`,
so they are the same bytes the project owner's archive verified.

| Figure in the release | Row in the resource | Match |
|---|---|---|
| `100 617 mężczyzn` (Nowak) | `28052`: `NOWAK,100617` | exact |
| `102 503 kobiet` (Nowak) | `35279`: `NOWAK,102503` | exact |
| `203 120 Polek i Polaków` | 100,617 + 102,503 | exact |
| `43 487 mężczyzn` (Woźniak) | `28052`: `WOŹNIAK,43487` | exact |
| `44 204 osób` (Dąbrowska, among women) | `35279`: `DĄBROWSKA,44204` | exact |

All five figures are exact `Liczba` values from those two resources.

## Facts read from the metadata

- **Dataset `notes`:** `Wykaz nazwisk osób żyjących występujących w rejestrze PESEL. Przedmiotowe dane zostały opracowane na podstawie informacji zgromadzonych w rejestrze PESEL według pola nazwisko aktualne. Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu.` Dataset `modified` is `2024-06-19T13:29:14Z`.
- **`28052`:**
  - description `Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 01.02.2021`
  - `created` `2021-02-03T11:01:24Z`
- **`35279`:**
  - description `Wykaz nazwisk żeńskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL, stan na 02.02.2021`
  - `created` `2021-12-21T13:22:40Z`. That is after the release, but the figures still match its bytes exactly. Why the resource record postdates the release is not known.
- **The 2026 resources** (`1148808`, `1148811`, see `../2026-09-18/metadata/`) use the same description template, word for word. Only the date changes.

## What this does and does not establish

**Does:** the publisher, in its own words, describes `Liczba` values of dataset 1681 as numbers of people (`kobiet`,
`mężczyzn`, `osób`, `Polek i Polaków`). One `Liczba` unit is one living person with that current surname. That is the
reading the project owner decided on 2026-09-20.

**Does not, strictly:** the statement is about the 2021 edition, not the 2026 one. They are linked by the same
dataset, publisher, column header and description template. That link is documented, but it is not a separate
statement about 2026. A future edition whose header, notes or description change must be re-checked.

**Also bears on TASK-004 §14 U-1, and decides nothing:** the release calls the two partitions `kobiet` and
`mężczyzn`, and it sums them into one total (`203 120 Polek i Polaków`). That is the publisher's reading on the
partition basis. Whether it changes the rule against totals across partitions is the project owner's call.
