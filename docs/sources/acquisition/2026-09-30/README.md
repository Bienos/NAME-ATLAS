# Acquisition record — 2026-09-30

> **Recovered 2026-09-30 from the unmerged branch `claude/peaceful-planck-u659j1`.** It was written on the old default-branch base, before TASK-043 and TASK-044 reached `main`, and is otherwise unedited. Its decision numbers are that branch's own. Its D-007 ("earlier editions as a time series") and its D-006 (the unit of `Liczba`) are not `main`'s D-007 (PESEL resource-level licence) or D-006 (`SourceRecord` granularity). On `main`, the unit is settled by ADR-0004 and `docs/sources/acquisition/2026-09-29-pesel-unit/`, and the use of earlier editions as a series by ADR-0019 and TASK-044. The "see D-007" pointer in the table below is to that branch's numbering.

Provenance record for the candidate-source check requested by the project owner on 2026-09-29: find the five
sources that are not in the spec, check their rights as TASK-002 did for PESEL, and obtain what the terms allow.
**No raw source bytes are stored here**, by design (same rule as `../2026-09-18/README.md`).

The Name Atlas records of what each source is, and what may be done with it, live in `docs/sources/`:

| Source | Record | Outcome |
|---|---|---|
| PESEL earlier editions, 2019–2025 | `docs/sources/pesel-earlier-editions.md` | All 33 files downloaded and verified. Same rights as the 2026 pair. Not a clean series: see D-007. |
| Rymut, "Słownik nazwisk współcześnie w Polsce używanych" (1992–1994) | `docs/sources/rymut-1990.md` | Not acquired. In copyright; no licence for commercial reuse or automated download. Needs IJP PAN permission. |
| Słownik geograficzny Królestwa Polskiego (1880–1902) | `docs/sources/sgkp.md` | OCR text for all 16 volumes downloaded from Polona (Biblioteka Narodowa), Public Domain Mark, commercial use allowed. 12.1 GB of page scans not downloaded; URLs recorded. |
| Open-access onomastics papers | `docs/sources/onomastics-open-access.md` | 100 papers and 42 journals classified by licence; 12 papers allow commercial reuse, 8 of them downloaded (4 hosts failed or refused). |
| US Census 2010 surname file | `docs/sources/us-census-surnames.md` | Full file blocked from this environment by the Census firewall; the API needs a key. Top-1,000 extract and documentation downloaded. |

## What is kept here

| Path | What it is |
|---|---|
| `SOURCES.tsv` | Every file downloaded in this run: source, resource ID, reference date (for SGKP, the volume's publication year), kind (native file, portal CSV conversion, OCR text zip, sample or documentation), URL, bytes, SHA-256, fetch time (UTC), HTTP status. Enough to re-fetch and re-verify. |
| `SHA256SUMS.txt` | The same checksums in `sha256sum` format, with the paths the files had in the working session. |
| `metadata/pesel_*.official.json` | Verbatim `api.dane.gov.pl` responses: the dataset (licence fields), its full resource list (all 21 resources, including every earlier edition), and the publishing institution. |
| `metadata/sgkp_polona_*.front-office-details.official.json` | Verbatim Polona records for the 16 SGKP volumes used: licence object, rights text, title, date, imprint. |
| `onomastics/journals.tsv`, `articles.tsv`, `candidates_excluded.tsv` | The research agent's working tables: licence per journal (with verbatim DOAJ and policy quotes, and Crossref licences by year) and per paper (Crossref licence and commercial-reuse category). |
| `evidence/onomastics.unreachable.tsv` | Pages that could not be reached, and why. |
| `evidence/*.MANIFEST.tsv` | For each source whose rights were checked from web pages: every page relied on, with URL, fetch time and SHA-256. The pages themselves are not kept; the records quote them verbatim. |

Fetch times in the Rymut and US Census manifests are file modification times at download, as labelled in
their headers; the US Census documentation row in `SOURCES.tsv` uses the same method. The SGKP manifest's times
are as recorded by the research agent, except the 16 Polona record rows, which were logged at request time.

## Where the raw bytes live

Only in this session's ephemeral container, which is reclaimed when the session ends. To reproduce, re-download
from the URLs in `SOURCES.tsv` and check against `SHA256SUMS.txt`. A mismatch means the publisher changed the
file, which is itself a finding and must be recorded, not worked around.

## Not done

- Nothing from this run is parsed into the database, fixtured, or used by any code.
- None of the five sites the spec blocks (Ancestry, MyHeritage, Findmypast, Geneanet, GenBaza) was accessed.
