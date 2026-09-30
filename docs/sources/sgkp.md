# Słownik geograficzny Królestwa Polskiego (SGKP) — availability and rights check

Checked 2026-09-29/30 (UTC). Evidence manifest: `docs/sources/acquisition/2026-09-30/evidence/sgkp.MANIFEST.tsv`.
Verbatim Polona records for the 16 volumes used: `acquisition/2026-09-30/metadata/sgkp_polona_*.json`.

**Status: acquired as OCR text for all 16 volumes from Polona (Biblioteka Narodowa), marked Public Domain.
Not ingested. OCR quality not measured.** The 12.1 GB of page scans were not downloaded; their URLs and sizes
are below.

## The work

From Polona's per-volume records (metadata mapped from the Biblioteka Narodowa catalogue):

- "Słownik geograficzny Królestwa Polskiego i innych krajów słowiańskich". Warsaw. Imprint of T.1: "Warszawa :
  F. Sulimierski i Wł. Walewski, 1880 (Warszawa : Druk. "Wieku")". From T.12 the imprint adds "z zasiłku Kasy
  pomocy dla osób pracujących na polu naukowem im. …".
- 16 physical volumes: T.1–T.14 and T.15 in two parts. Years from the records: T.1 1880, T.2 1881, T.4 1883,
  T.5 1884, T.6 1885, T.7 1886, T.8 1887, T.9 1888, T.10 1889, T.11 1890, T.12 1892, T.13 1893, T.14 1895,
  T.15 cz.1 1900, T.15 cz.2 1902. T.3's record carries no date.
- Contributors named in the volume records (each record names one; T.1's names none): Sulimierski, Filip
  (1843–1885); Chlebowski, Bronisław (1846–1918); Walewski, Władysław (1818–1890); and on T.14 Krzywicki,
  Józef (1838–1908).
- Not verified: DIR gives the series date as "1880-1914"; one Lithuanian catalogue record lists an index volume
  ("[Tom 16], Indeks").

## Copies found and their terms

| Copy | Format | Coverage | Terms | Commercial | Automated |
|---|---|---|---|---|---|
| **Polona, Biblioteka Narodowa copies** | PDF per volume, image per page, OCR as TXT zip and ALTO zip | All 16 | Every volume's licence object: `"baseName":"Domena Publiczna"`, `"baseUrl":"https://creativecommons.org/publicdomain/mark/1.0/"`, `"downloadable":true`, `"copyrightProtected":false`. In 13 of 16 records the rights field also reads: "Domena Publiczna. Wolno zwielokrotniać, zmieniać i rozpowszechniać oraz wykonywać utwór, nawet w celach komercyjnych, bez konieczności pytania o zgodę. Wykorzystując utwór należy pamiętać o poszanowaniu autorskich praw osobistych Twórcy." (T.2, T.12 and T.14 have an empty rights field and the same licence object.) | **Yes** | No robots.txt. The rules for registered users forbid "technik lub urządzeń mogących zakłócić pracę RCBN". A public search API is documented. |
| DIR / ICM, `dir.icm.edu.pl/Slownik_geograficzny/` | Page images; OCR text per page and per volume | All 16 | **Silent**: no terms page, no rights field in its RDF, robots.txt returns 404 | Not established | Not established |
| Wikisource | Proofread transcription | T.I (about 9,760 entries) and part of T.II only | Site footer: CC BY-SA ("additional terms may apply"); page tag PD-US-1923-abroad/PL | Under BY-SA | Via database dumps only |
| Wikimedia Commons | DjVu / PDF | All | `{{PD-old}}`, but files come from MBC (T.1–2) and CRISPA (T.3–15/2), whose own terms are below | Inherits the upstream problem | Via API |
| Małopolska Biblioteka Cyfrowa | Scans | All | Rules §7: "Użytkownik może wykorzystywać Zasoby … do celów niekomercyjnych"; "Zabroniona jest masowa reprodukcja, redystrybucja…" | **No** | **No** |
| CRISPA / BUW | DjVu with 2010 OCR | T.3, T.7, T.15/1 checked | "Licencja BUW"; licence text not found | Not established | **No** (robots.txt) |
| Internet Archive `slownik-1` … `slownik-15.2` | PDF, OCR | All | Uploader, a private person, declared Public Domain Mark; source of the scans not given | Unclear | robots.txt allows |
| Google / Harvard scans on Internet Archive | PDF, OCR | T.1 and T.5 only | "Make non-commercial use of the files"; "Refrain from automated querying" | **No** | **No** |
| Europeana | Aggregator | — | Lithuanian Academy copies CC BY-NC-SA 4.0; Bavarian State Library NoC-NC; BUW and MBC In Copyright | **No** for these | — |

Not reached: RCIN (served a proof-of-work browser challenge, not bypassed), Google Books direct (API quota),
Atlas Fontium (no SGKP dataset found). No Wikidata identifier property for SGKP entries was found; that search
was not exhaustive.

## What was downloaded

The Polona OCR text (TXT zip) for all 16 volumes, from
`https://polona.pl/api/search-service/fulltext/polona/fulltext/content/{objectId}`, fetched one at a time with
a 5-second pause. 76,076,511 bytes in total. URLs, sizes, SHA-256 and fetch times are in
`acquisition/2026-09-30/SOURCES.tsv` (`sgkp_polona_bn`).

- Every zip is intact. Each holds one full-text file plus one text file per page: 5–13 fewer page files than
  Polona's scan count for the volume (covers and blank leaves are the likely reason; not checked).
- The volume mapping was checked by content. Opening entries match the Polona title range where the record
  has a title (T.7 Netrebka, T.9 Pożajście, T.12 Szlurpkiszki) and follow on from the previous volume's range
  where it has none (T.8 Perepiatycha, T.10 Rukszki, T.13 Warmbrunn, T.14 Worowo).
- For T.9 and T.10 the copies used are the 968-page ones that have PDFs. The other Polona copies of T.9
  (1,776 pages, no PDF) and T.10 (888 pages) were not used.
- OCR quality was **not measured**. The sample shows words split at line ends ("Histo rycznie", "Krew ną") and
  misread letters ("źel." for "żel.").

One DIR page was also downloaded as a format sample (T.1 page 20, 10,439 bytes). DIR's terms are silent, so its
text may be used for cross-checking only unless ICM grants permission.

## Page scans, not downloaded

Polona per-volume PDFs, `https://polona.pl/api/download/digital-content/{fileId}`, sizes from `Content-Length`:
12,112,705,755 bytes for all 16 (checked 2026-09-30T00:02:24Z). Not downloaded: they would not survive this
ephemeral environment, and place-name work needs the text, not the images.

| Vol | fileId | Bytes | Vol | fileId | Bytes |
|---|---|---:|---|---|---:|
| T.1 | 34c8bd1e-6b04-4658-b935-49388205cfdb | 785,082,948 | T.9 | 80c065de-9bff-4e02-b777-bda526e4cb70 | 641,220,294 |
| T.2 | f0040990-4fea-42e1-ba08-5f005be4109d | 781,379,939 | T.10 | 38977874-548c-48b1-8256-31731df1f3bc | 566,573,288 |
| T.3 | 19f778de-143c-4dd5-8937-bae4af978762 | 820,294,197 | T.11 | 47c33f26-0629-4ec3-a718-5f4938952cee | 840,225,812 |
| T.4 | 941a1b1f-974c-4cd4-9eee-a5a6921dbbc6 | 804,965,681 | T.12 | 1e7e4173-d4e3-458f-ad0b-9c7c692613c6 | 795,404,939 |
| T.5 | fd847766-2563-4993-b9a0-45bacc38fffd | 624,572,133 | T.13 | ef2b2945-d00b-431a-b308-6286e14f89a8 | 774,926,722 |
| T.6 | 1530f562-1ea5-4d0f-9247-5f7dd1c4544b | 612,213,233 | T.14 | f26b6748-390b-4a39-bdda-ebc8b0a8cbcc | 711,593,359 |
| T.7 | 88ecb679-f421-4b9a-9524-11666de305b7 | 1,095,766,268 | T.15 cz.1 | d10d24d9-1d89-466f-b079-d617596f1221 | 541,948,299 |
| T.8 | 544f757c-5b89-47f3-9da4-cebf702c464e | 1,113,305,604 | T.15 cz.2 | 5bb57ed4-15c8-43b6-abbe-36cf106d2cbb | 603,233,039 |

T.6 and T.15 cz.2 each have a second PDF on Polona; the other T.10 copy (888 pages) has a 774,434,576-byte PDF.

## Obligations if used

- Attribution: title, editors, and "Polona / Biblioteka Narodowa" as the source. Polona's FAQ: "zawsze
  wskazywać imię i nazwisko autora oraz tytuł dzieła (o ile te informacje są dostępne)".
- Respect authors' moral rights: no misattribution, no presenting altered text as the original.
- Keep automated access slow and sequential.
- This is 19th-century place description. It is evidence for historical places and place-name forms. It says
  nothing on its own about where a surname came from.

## Process notes

The research agent made about 25 requests to Wikimedia paths (`/w/index.php?action=raw`, `/w/api.php`) before
reading Wikimedia's robots.txt, which disallows them, and received 429 rate-limit replies. It also made one
request to RCIN's disallowed `/dlibra/results` path, and read Google's usage notice with a 6 KB range request.
