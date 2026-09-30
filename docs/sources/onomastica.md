# *Onomastica* — TASK-032 source record

The verification record for *Onomastica*, the proper-names journal of the Institute of Polish Language, Polish Academy of Sciences (Instytut Języka Polskiego PAN, IJP PAN). The TASK-032 spike wrote it on **2026-09-29**. It answers every item of `tasks/032-onomastica-source-spike.md` §7 from observation, or marks it `UNRESOLVED` with the reason.

- **Evidence:** `docs/sources/acquisition/2026-09-29-onomastica/`. It holds the provenance README, `inventory.csv` (one row per item per channel), `SHA256SUMS.txt` for every byte retrieved, and the verbatim OAI-PMH responses under `metadata/`.
- **No article bytes are committed.** No PDF, page image or article text is in the repository. The 511 PDFs (383 from the OJS site, 128 from journals.pan.pl), the HTML pages and the text extracted from them stayed in the session's scratch space. Their SHA-256 values are in `SHA256SUMS.txt`.
- **Nothing is ingested.** There is no table, no `Source` or `RightsProfile` row, no source file under `sources/onomastics/`, no code and no claim. The `Source` and `RightsProfile` values in §11 and §12 are proposals in this document only.
- **One decision is raised:** **D-022**, whether Name Atlas may rely on the licence the journal declares for vol. 64 (2020) onward, given the statements that contradict it (§8, §9).
- **Resolved 2026-09-29: dropped. Reversed 2026-09-30:** the project owner answered D-022 again with option (b). The printed CC BY-ND 4.0 licence of the OJS copies of vols 64 onward is relied on, and TASK-046 imports the first article (`sources/onomastics/onomastica-64-16-walkowiak.json`). This record's findings are unchanged.

## At a glance

| §7 item | Answer |
|---|---|
| 1. Channels | Three, all named by the publisher on its "Essential facts" page (§1): the journal's own OJS site, `onomastica.ijppan.pl` (the old host `onomastica.ijp.pan.pl` redirects there); the Electronic Library of the Polish Academy of Sciences, `journals.pan.pl` (dLibra); and the RCIN repository, `rcin.org.pl` (dLibra). No page names one of them as canonical. The journal's DOIs resolve to the OJS site. |
| 2. Coverage | OJS: vols 59 (2015) to 69 (2025), 13 issues, 373 items. journals.pan.pl: No 56 (2012) to No 64 (2020), 298 items listed, of which 260 were harvested. RCIN: **UNRESOLVED**, because every request received a browser-verification page (§2). |
| 3. Identifiers | OJS: article and galley ids, OAI ids, and DOIs `10.17651/ONOMAST.<vol>[.<issue>].<n>` on 315 of 373 items. journals.pan.pl: dLibra edition ids, with no DOI and no publication id in `oai_dc`. 63 items are linked across the two channels on identical volume, pages and title. The rest are left unlinked (§3). |
| 4. OAI-PMH | OJS: `https://onomastica.ijppan.pl/index.php/ONOM/oai`, 5 formats, 7 sets, 384 records (373 live, 11 deleted). journals.pan.pl: set `pan:journals:onomastica`, 5 formats, `completeListSize` 298. RCIN: **UNRESOLVED** (§4). |
| 5. Inventory | `inventory.csv`, with one row per item per channel and an HTTP outcome for each. OJS: 373 rows; 371 PDFs retrieved, and 2 items have no file. journals.pan.pl: 260 rows, one per harvested record, each with its `/Content/` outcome. 128 files were retrieved (HTTP 200, `application/pdf`); for the other 132 items, `/Content/` redirected to a plain-HTTP whole-volume file, which was recorded and not requested. The 38 records the set lists but that were not harvested have no row (§4). |
| 6. Printed statements | OJS, per article PDF: vols 59–62 print **nothing** (S0). Vol 63 prints "Open Access … available at … © Copyright by Instytut Języka Polskiego PAN" and names no licence (S1). Vols 64–69 print **CC BY-ND 4.0 International** plus the © line (S2). Every statement is printed once, on page 1 (§6). journals.pan.pl copies: No 60–62 print nothing, and No 63 prints S1, as on OJS. **No 64 prints S3:** "… Creative Commons Attribution-NoDerivatives 4.0 **Poland** (CC BY-ND 4.0) License (https://creativecommons.org/licenses/**by-nc-nd**/4.0/deed.pl) …", with link annotations to `by-nd/4.0/legalcode.pl`. The editorial pages of 63 and 64 print a © line only (S4). |
| 7. Metadata rights fields | OJS `oai_dc` `dc:rights`: "Copyright (c) <year> Onomastica" on 175 items, none on 198, and never a licence. The licence-URL `DC.Rights` tag is empty on all 373 article pages. JATS carries a copyright statement and no `<license>`. `rfc1807`: empty. MARC 540: an untranslated placeholder. journals.pan.pl `oai_dc`: no rights field at all. The other four journals.pan.pl formats: **UNRESOLVED**, because `GetRecord` received the browser-verification page. (§7) |
| 8. Journal-level terms | The OJS site states **four different things**: CC BY-ND 4.0 from vol. 64 ("Essential facts" page and DOAJ); a Creative Commons licence only "in the future" (Guidelines page); CC BY-ND 3.0 with a BY-SA 3.0 URL (the agreement template); and an unlinked BY-ND 3.0 badge on every page. journals.pan.pl and RCIN: **UNRESOLVED**, because their pages served a browser-verification page (§8). |
| 9. The No 64 inconsistency | **Refuted for the OJS copies.** All 27 OJS PDFs of vol. 64 that print a statement name CC BY-ND 4.0 International, print the `by-nd/4.0/` URL, and link `by-nd/4.0/legalcode.pl`. **Confirmed for the journals.pan.pl copies:** all 23 vol. 64 articles there print S3, which names "CC BY-ND 4.0" and "4.0 Poland", prints the BY-NC-ND URL and links the BY-ND legal code. No file is byte-identical across the two channels. The OJS channel does state other licences at journal level (§8). |
| 10. Terms for No 56–63 | No published statement grants a licence for vols 59–63 on the OJS channel. The "Essential facts" policy starts at vol. 64. journals.pan.pl: No 60–62 print nothing, and No 63 prints S1 (§6). No 56–59 have no hosted file: `/Content/` redirects to whole-volume PDFs on plain-HTTP hosts, which were not requested, so their printed terms are **UNRESOLVED — file on a plain-HTTP host, not requested**. |
| 11. `Source` proposal | One `Source` per article in ADR-0008's curated-file format: `C_SCHOLARLY_SECONDARY`, `LEGAL_REVIEW_REQUIRED`. Three misfits with `importOnomasticSource`'s fixed values are recorded (§11). |
| 12. `RightsProfile` proposals | Five, one per licence situation (R1a, R1b, R2, R3, R4). Every permission is `UNKNOWN`, because no situation has a licence that no other statement contradicts. They were evaluated with `evaluateRightsMatrix` and `evaluateAllSurfaces` (§12). |
| 13. Questions | §20.5's fifteen questions are mapped: two are answered for vol. 64 onward, if the declared licence holds; the rest stay open. Nine new questions for the rights holder (§13). |
| 14. ADR-0008 §4 | No licence situation meets all four conditions today. Conditions 1 (citable) and 3 (scholarly) are met. Condition 4 is not met for vols 59–63 and is contested for vols 64–69. Condition 2 follows from the `UNKNOWN` profiles (§14). |

## How this record was made

- **Date:** every request was made on 2026-09-29, between 13:27 and 16:46 UTC. Each request is logged with its URL, UTC time, status, redirect chain, content type, size and SHA-256. The log is summarised in the acquisition README.
- **Client:** Python `urllib` through the session's HTTPS proxy, with the user agent `name-atlas-source-spike/0.1 (TASK-032; sequential research requests)`.
- **Pacing:** requests were sequential per host. The pause between requests was 1.5 s on the OJS site; 8 s for OAI on journals.pan.pl and RCIN; and 4 s, then 2.5 s, for journals.pan.pl's `/Content/` files.
- **Browser-verification page:** on journals.pan.pl and RCIN a request often returned "High Load - Verifying Browser". That page is a JavaScript proof-of-work puzzle. Such a response was never counted as data, and **no attempt was made to solve or bypass the puzzle** (task §5, §10). The client backed off (20 s up to 480 s) and retried later.
- **`robots.txt`** was read first on each host, and every disallowed path was avoided (§8).
- **PDF analysis:** `pypdf` 6.19.0 read link annotations, document info and XMP; `pdfminer.six` 20260107 read the text layer.
  - Statements are quoted from the text layer with runs of whitespace collapsed to one space. Nothing else is changed.
  - The analysis tools lived in the session's scratch space and are not repository dependencies.
- **ADR-0007 evaluation:** a throwaway script outside the repository imports `packages/truth/src/rights.ts` and prints the decisions (§12).
- **Interruption:** the session's container restarted at about 14:25 UTC and the journals.pan.pl harvest stopped after 13 of 15 pages. When it resumed at 15:02, the saved resumption token had expired (`badResumptionToken`). The completion path (`ListIdentifiers`, then `GetRecord`) is described in §4. The journals.pan.pl files did not receive the verification page. `/Content/` requests ran from 15:38 to 16:36 UTC. Connection resets were retried after 15 s, as the 2026-09-24 note observed them.

## 1. Channels

| Channel | Base URL | Platform | Access used | Named by the publisher |
|---|---|---|---|---|
| The journal's site | `https://onomastica.ijppan.pl/index.php/ONOM`. `https://onomastica.ijp.pan.pl/` answers 301 to `https://onomastica.ijppan.pl/`. | Open Journal Systems 3.1.2.3 (`<meta name="generator">`) | OAI-PMH; issue and article pages; file downloads `/article/download/<article>/<galley>` and `/issue/download/<issue>/<galley>` | "Essential facts": archived "at the journal's website". About: "Full texts of articles with abstracts and keywords are published on the journal's website." The 2019 PDFs: "available at: https://onomastica.ijp.pan.pl". |
| Electronic Library of the Polish Academy of Sciences | `https://journals.pan.pl`, the journal at `/dlibra/journal/113058` | dLibra | OAI-PMH, set `pan:journals:onomastica`; files `/Content/<edition>/…` | "Essential facts": "archived … in the Electronic Library of the Polish Academy of Sciences", linking `http://journals.pan.pl/dlibra/journal/113058`. |
| RCIN (Repozytorium Cyfrowe Instytutów Naukowych) | `https://rcin.org.pl` | dLibra | **UNRESOLVED**: every request to its OAI-PMH endpoint received the browser-verification page (§2) | "Essential facts": "archived in the RCIN repository". The 2019 PDFs: "available at: … https://rcin.org.pl". |

**Which channel is canonical: not stated.** No page calls one channel canonical. Three facts point to the OJS site:

- From the About page: "From 2019 (issue 63), the original version of the journal is the electronic version, and each article has a DOI number. Full texts of articles with abstracts and keywords are published on the journal's website."
- One DOI per volume, vols 59–69, was resolved at `doi.org`. All 13 answered 302 to an OJS article page: 12 on the old host `onomastica.ijp.pan.pl` and one (vol. 69) on `onomastica.ijppan.pl`.
- The publisher's DOAJ record (§7) gives the journal URL as `https://onomastica.ijp.pan.pl`.

## 2. Coverage

**OJS**, from its OAI records, issue pages and files. The S codes are the printed statements of §6.

| Vol. (year) | OJS issue id | Live OAI records | In the issue's contents | PDF galley | DOI | `dc:rights` | S0 | S1 | S2 | CC link annotation on p. 1 |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 59 (2015) | 9 | 42 | 42 | 42 | 25 | 0 | 42 | 0 | 0 | 0 |
| 60 (2016) | 8 | 37 | 37 | 37 | 25 | 0 | 37 | 0 | 0 | 0 |
| 61/1 (2017) | 6 | 28 | 28 | 28 | 18 | 0 | 28 | 0 | 0 | 0 |
| 61/2 (2017) | 7 | 33 | 32 | 31 | 33 | 0 | 31 | 0 | 0 | 0 |
| 62 (2018) | 3 | 29 | 29 | 29 | 16 | 1 | 29 | 0 | 0 | 0 |
| 63 (2019) | 2 | 27 | 27 | 27 | 26 | 0 | 1 | 26 | 0 | 0 |
| 64 (2020) | 10 | 28 | 28 | 28 | 27 | 26 | 1 | 0 | 27 | 27 |
| 65/1 (2021) | 11 | 23 | 23 | 23 | 22 | 22 | 0 | 0 | 23 | 23 |
| 65/2 (2021) | 12 | 21 | 21 | 21 | 20 | 21 | 0 | 0 | 21 | 21 |
| 66 (2022) | 13 | 28 | 28 | 28 | 28 | 28 | 0 | 0 | 28 | 6 |
| 67 (2023) | 14 | 25 | 25 | 25 | 25 | 25 | 0 | 0 | 25 | 2 |
| 68 (2024) | 15 | 26 | 26 | 26 | 26 | 26 | 0 | 0 | 26 | 5 |
| 69 (2025) | 17 | 26 | 26 | 26 | 24 | 26 | 2 | 0 | 24 | 24 |
| **Total** | | **373** | **372** | **371** | **315** | **175** | **171** | **26** | **174** | **108** |

Notes on the OJS figures:

- **Coverage matches the 2026-09-24 note.** `docs/sources/candidate-sources.md` item 6 recorded vols 59–69 and 373 items; both are confirmed.
- **Two items have no file.**
  - Article 169, "The Name Maria in Italian Onymy" (61/2), is in its issue's contents but has no galley.
  - Article 183 (61/2) is in OAI only. It appears in no issue's contents and has no galley.
- **Whole-issue PDFs:** 12 exist, one per issue except vol. 59.
- **Sections** (OAI sets): Articles 235, Reviews/discussions/polemics 56, Chronicle 28, In Memoriam 24, Onomastic research 22, Materials & announcements 8.
- **Items printing nothing after 2019:** the S0 items in vols 63, 64 and 69 are four one-page In Memoriam or Chronicle notes.

**journals.pan.pl**, from the OAI records harvested (260 of the 298 the set lists):

| No (year) | Records harvested | `/Content/` → PDF | `/Content/` → plain-HTTP target, not followed | Not requested | S0 | S1 | S3 | S4 | CC link annotation on p. 1 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 56 (2012) | 26 | 0 | 26 | 0 | 0 | 0 | 0 | 0 | 0 |
| 57 (2013) | 43 | 0 | 43 | 0 | 0 | 0 | 0 | 0 | 0 |
| 58 (2014) | 41 | 0 | 41 | 0 | 0 | 0 | 0 | 0 | 0 |
| 59 (2015) | 22 | 0 | 22 | 0 | 0 | 0 | 0 | 0 | 0 |
| 60 (2016) | 36 | 36 | 0 | 0 | 36 | 0 | 0 | 0 | 0 |
| 61 (2017) | 26 | 26 | 0 | 0 | 26 | 0 | 0 | 0 | 0 |
| 62 (2018) | 24 | 24 | 0 | 0 | 24 | 0 | 0 | 0 | 0 |
| 63 (2019) | 15 | 15 | 0 | 0 | 3 | 11 | 0 | 1 | 0 |
| 64 (2020) | 27 | 27 | 0 | 0 | 3 | 0 | 23 | 1 | 23 |
| **Total** | **260** | **128** | **132** | **0** | **92** | **11** | **23** | **2** | **23** |

On this channel, the 128 records that name a file give a plain-HTTP URL: 106 under `/Content/<edition>/PDF-MASTER/` and 22 under `/Content/<edition>/PDF/`. Those URLs were not requested. `/Content/<edition>` answered 302 in every case.

- **No 60–64:** to a PDF under `/Content/<edition>/PDF/…`. For the 106 records naming a `PDF-MASTER/` file, that path differs from the one named. Only the served file was retrieved.
- **No 56–59:** to `/Content/<edition>/url-publication.xml`, which answered 302 to a whole-volume PDF on a plain-HTTP host, with a `#page=` anchor. The targets are:
  - `http://195.187.97.25:8080/images/data/ono/wydania/No_56_20112/No_56_2012.pdf`
  - `http://195.187.97.25:8080/images/data/ono/wydania/No_57_2013/Onomastyka_57.pdf`
  - `http://195.187.97.25:8080/images/data/ono/wydania/No_58_2014/Onomastica_2014-do_druku-30-11.pdf`
  - for No 59, `http://195.187.97.25:8080/images/data/ono/wydania/No_59_2015/Onomastyka_2015_DRUK.pdf` or `http://ono.czasopisma.pan.pl/images/data/ono/wydania/No_59_2015/Onomastyka_2015_DRUK.pdf`, depending on the item.

  These targets were recorded and not requested.
- **Front matter:** journals.pan.pl lists the title, editorial and contents pages of 63 and 64 as items. The OJS channel does not.
- **No linked pair is byte-identical.** Of the 63 pairs linked in §3, 61 have the same page count and different bytes; two vol. 60 pairs differ in page count.

**RCIN: UNRESOLVED — site served a browser-verification page.**

- 2026-09-29, from 13:59 to 16:06 UTC: every OAI-PMH request (`Identify`, then `ListSets`) received the "High Load - Verifying Browser" page.
- `https://rcin.org.pl/robots.txt` answered normally (§8).
- The first of those responses came labelled `text/xml`, so the spike's first check logged it as a success. The check was corrected to read the body, and that response is counted here as the verification page.

## 3. Identifiers and cross-channel mapping

**OJS:**

- The article id is in `/article/view/<article>`; the galley id is in `/article/view/<article>/<galley>` and `/article/download/<article>/<galley>`.
- OAI identifiers take the form `oai:ojs2.onomastica.ijppan.pl:article/<article>`. The 11 deleted records carry the old prefix `oai:ojs2.onomastica.ijp.pan.pl:`.
- The DOI is in `dc:identifier`, e.g. `10.17651/ONOMAST.64.16`. It is present on 315 of 373 items; the 58 without are vol. 59 (17), 60 (12), 61/1 (10), 62 (13), 63 (1), 64 (1), 65/1 (1), 65/2 (1) and 69 (2).
- Volume, issue and pages are in `dc:source`, e.g. "Onomastica; Vol. 62 (2018): Onomastica LXII; 15-31".
- **Link targets can differ from printed text.** One observed example: the vol. 64 article 113's PDF carries a DOI link annotation to `http://dx.doi.org/10.17651/ONOMAST.63.2`, while its OAI record gives `10.17651/ONOMAST.64.15`.

**journals.pan.pl:**

- The OAI identifier is `oai:journals.pan.pl:<edition>`, where `<edition>` is the dLibra edition id.
- `dc:identifier` gives `https://journals.pan.pl/dlibra/publication/edition/<edition>/content` and, for hosted items, the file URL above.
- `dc:source` gives "Onomastica; <year>; No <n>[; <pages>]". It is written "NO 59" in vol. 59's records.
- No record carries a DOI or a dLibra publication id. A publication id appears only in HTML page URLs, which served the browser-verification page.

**Linking the two channels.** Following task §4 item 2, rows are linked only on an identical DOI, or on identical volume, pages and title. journals.pan.pl has no DOIs, so only the second rule could apply. Titles were compared after Unicode NFC normalisation and whitespace collapsing, and nothing else. Of the 260 harvested records:

| Outcome | Records |
|---|---:|
| Linked: identical volume + pages + title | 63 |
| Not linked: the record gives no pages | 167 |
| Not linked: pages given, no OJS title identical | 30 |

The 30 include near-matches that differ in dashes, spacing or completeness. One example: "Milan Majtán 3.5.1934 – 30.6.2018" against OJS's "Milan Majtán (03.05.1934 – 30.06.2018)". They are left unlinked rather than guessed. Links are recorded in `inventory.csv` (`cross_channel_key`).

## 4. OAI-PMH endpoints

| | OJS | journals.pan.pl | RCIN |
|---|---|---|---|
| Base URL | `https://onomastica.ijppan.pl/index.php/ONOM/oai` | `https://journals.pan.pl/dlibra/oai-pmh-repository.xml` | `https://rcin.org.pl/dlibra/oai-pmh-repository.xml` |
| `Identify` | `repositoryName` "Onomastica"; `earliestDatestamp` 2019-12-18T01:29:11Z; `deletedRecord` persistent; toolkit Open Journal Systems | `earliestDatestamp` 2016-09-05T14:29:53Z; `deletedRecord` persistent; `repositoryName` empty | **UNRESOLVED**: browser-verification page |
| Formats | `oai_dc`, `rfc1807`, `oai_marc`, `marcxml`, `jats` | `oai_dc`, `dlibra_avs`, `mets`, `oai_qdc`, `oai_etdms` | UNRESOLVED |
| Sets | `ONOM` and six section sets: `ONOM:ART`, `ONOM:REV`, `ONOM:CHR`, `ONOM:MEMO`, `ONOM:RES`, `ONOM:MAT` | `pan:journals:onomastica` (records also carry `pan:journals` and `pan`) | UNRESOLVED |
| `ListRecords` (`oai_dc`) | `completeListSize` 384, 100 per page, 4 pages, all retrieved: 373 live, 11 deleted | `completeListSize` 298, 20 per page. Pages 1–13 (260 records) were retrieved at 13:36–14:25 UTC. After the restart the resumption token was refused. A fresh `ListIdentifiers` returned two pages, at 16:36 and 16:43 UTC (100 identifiers, all among the 260 harvested; `completeListSize` 298); every other OAI request from 15:18 to 16:46 UTC received the browser-verification page. **38 records are therefore not harvested: UNRESOLVED — site served a browser-verification page.** The server's `responseDate` runs two hours ahead of UTC while marked `Z`. | UNRESOLVED |

## 5. Inventory

`docs/sources/acquisition/2026-09-29-onomastica/inventory.csv` has one row per item per channel. Each row gives:

- volume, issue, year, pages and section or type;
- title, authors, DOI and the channel's identifiers;
- the file URL, the retrieval time, HTTP status, content type, size and SHA-256;
- the printed-statement code (§6), licence link targets, metadata rights and the cross-channel key.

| Channel | Rows | The channel's own total | Difference |
|---|---:|---:|---|
| OJS | 373 | 373 live OAI records (384 including 11 deleted) | none. 371 files were retrieved (HTTP 200, `application/pdf`); 2 items have no file (§2). |
| journals.pan.pl | 260 | 298 (`completeListSize`) | 38 listed records were not harvested (§4) and have no row, because their identifiers are unknown. |
| RCIN | 0 | UNRESOLVED | the endpoint never answered with data |

The 12 whole-issue PDFs on OJS are not items. They are recorded in the acquisition README with their SHA-256 values.

## 6. Printed rights statements

Statement codes, quoted from the PDF text layer with whitespace collapsed:

- **S0: nothing.** No rights, licence, copyright or open-access statement appears on any page, and there is no licence link annotation.
- **S1 (vol. 63, 2019):** "This is an Open Access article available at: https://onomastica.ijp.pan.pl, https://rcin.org.pl © Copyright by Instytut Języka Polskiego PAN, Kraków 2019. Publisher: Institute of Polish Language, Polish Academy of Sciences [Wydawca: Instytut Języka Polskiego Polskiej Akademii Nauk]". No licence is named. In 16 of the 26 files the text layer has no space before "©" and "Publisher"; the words are the same.
- **S2 (vols 64–69, 2020–2025):** "This is an Open Access article distributed under the terms of the Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) License (https://creativecommons.org/licenses/by-nd/4.0/), which permits copying and redistribution, commercial and non-commercial, provided that the article is properly cited." It is followed by "© Copyright by Instytut Języka Polskiego PAN, Kraków <year>." and the same "Publisher:" line.
  - The year printed is the volume's year.
  - One vol. 64 file encodes the statement's hyphens as soft hyphens (U+00AD) in its text layer; the words are the same.
- **S3 (vol. 64 on journals.pan.pl only):** "This is an Open Access article distributed under the terms of the Creative Commons Attribution-NoDerivatives 4.0 Poland (CC BY-ND 4.0) License (https://creativecommons.org/licenses/by-nc-nd/4.0/deed.pl), which permits copying and redistribution, commercial and non-commercial, provided that the article is properly cited." It is followed by the same © and "Publisher:" lines as S2.
  - The name says BY-ND, "4.0 Poland"; the printed URL is the **non-commercial** BY-NC-ND deed; the link annotations point to the BY-ND legal code.
  - One file encodes the hyphens as soft hyphens, as above.
- **S4 (journals.pan.pl's editorial pages of 63 and 64):** "© Copyright by Instytut Języka Polskiego PAN, Kraków <year>" and no licence or open-access statement.

| Channel | Code | Files | Where | Licence link annotations |
|---|---|---:|---|---|
| OJS | S0 | 171 | none | none |
| OJS | S1 | 26 | page 1, once per file | none |
| OJS | S2 | 174 | page 1, once per file | 108 files carry them, all on page 1: `https://creativecommons.org/licenses/by-nd/4.0/legalcode.pl` in vols 64–68 and 3 of vol. 69, and `https://creativecommons.org/licenses/by-nd/4.0/` in 21 of vol. 69. None point anywhere else. |
| journals.pan.pl | S0 | 92 | none | none |
| journals.pan.pl | S1 | 11 | page 1, once per file | none |
| journals.pan.pl | S3 | 23 | page 1, once per file | all 23, two annotations each, to `https://creativecommons.org/licenses/by-nd/4.0/legalcode.pl` |
| journals.pan.pl | S4 | 2 | the editorial pages of 63 and 64 | none |

- **No PDF carries rights in its XMP or document info.** None of the 511 files from either channel has an XMP rights field, and none has an info key naming rights, copyright or licence.
- **Other mentions are not statements.** Twenty-three other matches of "licen…", "Creative Commons" or similar in the OJS files, and one in the journals.pan.pl files, were checked by hand. All are article text: "prace licencjackie" (bachelor's theses), the Latin "licenciatus", the verb "license", "licensed production", and one article describing a different work's CC BY 3.0 scans on Polona.

**Whole-issue files (OJS)**, imprint page (p. 2, or p. 3 for 65/1):

| Vols | Imprint |
|---|---|
| 60, 61/1, 61/2, 62 (2016–2018) | "© Copyright by Polska Akademia Nauk — Komitet Językoznawstwa and Instytut Języka Polskiego, Kraków <year>" |
| 63 (2019) | "PL ISSN 0078-4648 ISBN 978-83-64007-60-6 © Copyright by Instytut Języka Polskiego PAN, Kraków 2019" |
| 64–69 (2020–2025) | "ISSN 0078-4648 (Print) ISSN 2658-2783 (Online) © Copyright by Instytut Języka Polskiego PAN, Kraków <year>" |

No imprint names a licence. From vol. 64 on, only the articles inside print S2.

## 7. Rights fields in each metadata format

**OJS:**

- **`oai_dc` `dc:rights`:** "Copyright (c) <year> Onomastica" on 175 of 373 items and absent on 198. It never names a licence. By year: 2018 on 1 item, 2020 on 26, 2021 on 43, 2022 on 28, 2023 on 25, 2024 on 26, 2025 on 26.
- **Article pages:** each carries two `<meta name="DC.Rights">` tags. OJS 3.1.2-3's Dublin Core plugin writes the first from the copyright statement and the second from `$article->getLicenseURL()`. That is observed in `plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.inc.php` at tag `ojs-3_1_2-3`; the file's SHA-256 is in the README.
  - The first tag reads "Copyright (c) <year> Onomastica", or "Copyright (c)" with no year or holder.
  - **The licence-URL tag is empty on all 373 article pages.**
- **`jats`** (records for articles 21 and 400): `<permissions>` holds `<copyright-statement>Copyright (c) <year> Onomastica</copyright-statement>`, `<copyright-year>` and `<copyright-holder>Onomastica</copyright-holder>`. There is **no `<license>` element**.
- **`rfc1807`:** `<copyright>` is empty.
- **`marcxml` and `oai_marc`:** field 540 ("terms governing use") holds the literal `##submission.copyrightStatement##`, an untranslated OJS locale key.
- **Visible text:** no article page shows a copyright or licence statement.

**journals.pan.pl:**

- **`oai_dc`:** no `dc:rights` in any harvested record.
- **Publishers:** two `dc:publisher` values, "Komitet Językoznawstwa PAN" and "Instytut Języka Polskiego PAN".
- The other four formats, `dlibra_avs`, `mets`, `oai_qdc` and `oai_etdms`: **UNRESOLVED — site served a browser-verification page** to `GetRecord`.

**Third-party records made by the publisher**, not channels:

- **DOAJ** (search by print ISSN 0078-4648; record created 2020-04-28, last updated 2026-09-17):
  - licence `{"type": "CC BY-ND", "url": "https://creativecommons.org/licenses/by-nd/4.0/", "BY": true, "ND": true, "NC": false, "SA": false}`;
  - copyright `{"author_retains": false, "url": "https://onomastica.ijppan.pl/index.php/ONOM/essential-facts"}`;
  - `boai` true, `oa_start` 2015, `deposit_policy.has_policy` false.
  - A search by e-ISSN 2658-2783 returned no record.
- **Crossref:** for one DOI per volume (13 DOIs, vols 59–69), the work record has **no `license` field**.

## 8. Journal-level terms

**OJS**, quoted as published and read 2026-09-29. Each page's SHA-256 is in `SHA256SUMS.txt`.

1. **"Essential facts"**, `/ONOM/essential-facts`, which DOAJ names as the journal's licence terms and open-access statement:
   - Copyright and Licensing Policy: "From vol. 64 (2020) the articles published in Onomastica are available under a Creative Commons licence Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)". The link points to `https://creativecommons.org/licenses/by-nd/4.0/legalcode`.
   - The same block then shows the image `https://licensebuttons.net/l/by-nd/3.0/88x31.png` and continues: "The authors of the accepted contributions are obliged to fill and send a signed statement confirming the transfer of proprietary copyrights to the publisher (download file). The content published in the journal is fully protected by the copyright law."
   - The "download file" link, `/public/journals/1/Onomastica_Proprietary_copyrights_statement.docx`, **answered 404**.
   - Access: "Onomastica applies an Open Access policy in line with BOAI principles. An open access to an electronic version of published contributions is provided with no embargo period."
   - Author Self-Archiving: "Authors may make their Onomastica contributions available online in repositories, websites and other platforms."
   - Archiving: "Content of recent volumes is archived in the RCIN repository as well as in the Electronic Library of the Polish Academy of Sciences and at the journal's website."
   - Peer review: "double-blind peer-review".
2. **Guidelines**, `/ONOM/guidelines`: "The authors of the accepted contributions are obliged to fill and send a signed statement confirming the transfer of proprietary copyrights to the publisher (download template). The content published in the journal is fully protected by the copyright law. **The Editors are currently working on introducing a specified type of the Creative Commons license in the future.**"
3. **The linked template**, `/public/journals/1/Onomastica_Proprietary_copyrigths_template.pdf` (the file name is spelled that way):
   - Title: "Publication agreement … concerning transfer of copyright free of charge including commitment to offer CC-BY-ND license".
   - §3.1: the author transfers the authorship property rights "with the application of the principle of exclusiveness".
   - §5.1: "The Publisher commits to sign a free of charge license agreement with the Author for an indeterminate period (until copyright expires): a Creative Commons - Attribution - No Derivative Works (CC BY-ND)."
   - §5.2 sets the copyright note: "Copyright by Instytut Języka Polskiego PAN, Kraków 2020. Some rights reserved Creative Commons – Attribution – No Derivative Works (CC BY–ND)".
   - §6.2: "The work [title of Work] … can be used according to the Creative Commons Attribution - No Derivative Works 3.0 (also known as CC-BY-ND), available at http://creativecommons.org/licenses/by-sa/3.0/, or according to a different-language version of the license, or any later version thereof". **The name is BY-ND 3.0; the URL is BY-SA 3.0.**
4. **Footer:** every one of the 401 HTML pages fetched shows the image `https://licensebuttons.net/l/by-nd/3.0/88x31.png` in its footer, with no link and no text.
5. **About:**
   - "It has appeared continuously since 1955."
   - "From 2019 (issue 63), the original version of the journal is the electronic version, and each article has a DOI number."
   - It lists indexing in Scopus, DOAJ and others, and COPE membership. It names no licence.
6. **Issue pages:** issues 64–69 print "© Copyright by Instytut Języka Polskiego PAN, Kraków <year>" in the issue description. Issues 59–63 print none.
7. **Other pages:**
   - Submissions (`/about/submissions`) has a privacy statement and no copyright notice.
   - Ethics: "The journal Onomastica uses the double-blind peer-review process." No licence.
   - Announcements: no licence.
   - Aims & Scope: "proper names in all their aspects and varieties", with submissions in English, Polish, German, French and all Slavic languages.
8. **`robots.txt`:** `User-agent: *` / `Disallow: /cache/`.
9. **Polish-language versions: not read.** The site switches language through a session cookie. Without one, `/user/setLocale/pl_PL` redirected back and served the English page, byte-identical to the English fetch.

**journals.pan.pl:**

- **Journal pages:** **UNRESOLVED — site served a browser-verification page.** Every HTML page request was answered with it, and no HTML page was retrieved.
- **`robots.txt`** (read at 13:29 UTC, when it answered normally) disallows `/Content/*/zip*`, `/Content/*/download*`, `/dlibra/ajax.xml*` and a list of search paths (`/dlibra/results*`, `/dlibra/metadatasearch*` and others). It does not disallow `/Content/<edition>` or the OAI endpoint.

**RCIN:**

- **Terms:** **UNRESOLVED — site served a browser-verification page.**
- **`robots.txt`** disallows the same dLibra paths plus `/demo/*` and `/c3po/*`.

**Automated access.** No page read on any channel mentions automated access, harvesting, caching or rate limits. `robots.txt` is not permission.

## 9. The No 64 inconsistency

The 2026-09-24 observation (task §2, item 5) concerned the vol. 64 PDFs hosted on journals.pan.pl. It found a statement naming "Creative Commons Attribution-NoDerivatives 4.0 Poland (CC BY-ND 4.0)", a printed URL `…/by-nc-nd/4.0/deed.pl`, and a link annotation to `…/by-nd/4.0`.

- **OJS copies: refuted.**
  - All 27 vol. 64 PDFs that print a statement print S2: "4.0 International", the URL `https://creativecommons.org/licenses/by-nd/4.0/`, and link annotations to `https://creativecommons.org/licenses/by-nd/4.0/legalcode.pl`.
  - None prints "Poland" or a `by-nc-nd` URL. The name, printed URL and link target agree within each file.
  - Creative Commons publishes no 4.0 "Poland" port. `https://creativecommons.org/licenses/by-nd/4.0/pl/` answered 301 to the Polish-language deed of the international licence, "Uznanie autorstwa - Bez Utworów Zależnych 4.0 Międzynarodowa".
- **journals.pan.pl copies: confirmed.** All 23 vol. 64 articles there print S3: it names "CC BY-ND 4.0" and "4.0 Poland" and prints the BY-NC-ND URL. Their link annotations point to `https://creativecommons.org/licenses/by-nd/4.0/legalcode.pl`. No file is byte-identical across the two channels (§2).
- **Does the OJS channel state a different licence for the same items? Yes, at journal level:**
  - the Guidelines page says a Creative Commons licence is only planned;
  - the template names BY-ND 3.0 with a BY-SA 3.0 URL;
  - the footer and "Essential facts" show a BY-ND 3.0 badge;
  - the article metadata carries no licence URL.

  The "Essential facts" policy, the DOAJ record and the per-article statements agree on BY-ND 4.0 International from vol. 64. None of these statements is chosen here.

## 10. Terms for No 56–63

- **Vols 59–62 (2015–2018), OJS:** no statement in any article file (S0). The whole-issue imprints for 60–62 give only "© Copyright by Polska Akademia Nauk — Komitet Językoznawstwa and Instytut Języka Polskiego". Vol. 59 has no whole-issue file.
- **Vol. 63 (2019), OJS:** S1, which is open access and ©, with no licence.
- **Journal level:** the "Essential facts" policy grants CC BY-ND 4.0 "From vol. 64 (2020)" and says nothing about earlier volumes. DOAJ's `oa_start` is 2015, and it states open access, not a licence.
- **journals.pan.pl:** No 60–62 print nothing, and No 63 prints S1 (§6). No 56–59 have no hosted file: `/Content/` redirects to whole-volume PDFs on plain-HTTP hosts, which were not requested, so their printed terms are **UNRESOLVED — file on a plain-HTTP host, not requested**.

**Answer:** no published statement establishes a licence for vols 56–63. The journals.pan.pl copies of No 56–59 are whole-volume files on plain-HTTP hosts. They were not requested, so for No 56–58 the terms are **UNRESOLVED — file on a plain-HTTP host, not requested**. No 59 is on OJS, where it prints nothing.

## 11. Proposed `Source` values

`packages/sources/src/onomastics.ts` imports **one work per file**: author or publisher, title, year and a locator per entry. The committed `sources/onomastics/buryan-1933.json` follows that shape. An *Onomastica* article is such a work, so the proposal is **one `Source` per article**. A journal-level row is not proposed, because nothing in the current model reads one.

Every enum value used exists in migration `0003`. No later migration on `main` changes `sources`, `rights_profiles` or their enums, as checked on 2026-09-29.

| Field | Proposal | Why |
|---|---|---|
| `source_key` | `onomastica_<vol>[_<issue>]_<n>` from the DOI suffix, e.g. `onomastica_64_16` for `10.17651/ONOMAST.64.16` | Stable, and unique per article. The 58 items without a DOI would need another key, such as the OJS article id. |
| `name` | the article's title as served, in the language the record gives first | a verbatim value |
| `publisher` | "Instytut Języka Polskiego Polskiej Akademii Nauk" | OJS `dc:publisher`, the © lines and the "Essential facts" ownership line. journals.pan.pl also names "Komitet Językoznawstwa PAN". |
| `source_type` | `PUBLICATION` | a serial publication, ISSN 0078-4648 and e-ISSN 2658-2783 |
| `granularity` | `DOCUMENT` | one article |
| `geographic_scope` | **UNRESOLVED** | The journal states no geographic scope. Aims & Scope covers "proper names in all their aspects and varieties", in several languages. |
| `temporal_from` / `temporal_to` | `null` | Articles discuss names of any period, and nothing states the evidence's time span. The publication years are in §2. |
| `authority_tier` | `C_SCHOLARLY_SECONDARY` | "The journal Onomastica uses the double-blind peer-review process" (Ethics page). |
| `production_status` | `LEGAL_REVIEW_REQUIRED` | The licence statements conflict (§8, §9). |
| `homepage_or_reference_url` | the article's DOI URL, or its OJS page where there is no DOI | the DOI resolves to the OJS page (§1) |
| `parent_source_id` | none | Not warranted now. IJP PAN also publishes ISNP, which is partnership-required (`docs/canonical/12` §2.1) under different terms, and nothing reads a provider row. |

**Misfits with `importOnomasticSource`, recorded and not resolved.** The importer writes these values for every work:

- `source_type = DICTIONARY`, whereas an article is a `PUBLICATION`;
- `granularity = SURNAME`, whereas an article is a `DOCUMENT`;
- `geographic_scope = {PL}`, which the journal does not state.

A later ingestion task would have to change the importer or accept these values; that is its decision. Its `licence_basis` and rights block map onto §12 and §14.

## 12. Proposed `RightsProfile`s

One profile per licence situation found. A field is filled only from a recorded statement or licence text, and is `UNKNOWN` otherwise. **Where statements conflict, the more permissive reading sets no field** (task §10).

| Field | R1a | R1b | R2 | R3 | R4 |
|---|---|---|---|---|---|
| Situation | S0 in vols 60–62: nothing in the article; the whole-issue imprint names the holders | S0 in vol. 59, the one-page notes and the front matter: nothing anywhere | S1, vol. 63: open access and ©, no licence. Also S4, the editorial pages of 63 and 64: © only | S2, vols 64–69: CC BY-ND 4.0 International printed and declared, and contradicted at journal level | S3, the journals.pan.pl copies of vol. 64: "CC BY-ND 4.0" and "4.0 Poland" named, the BY-NC-ND URL printed, and the BY-ND legal code linked |
| `metadata_rights` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `transcription_rights` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `image_rights` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `database_rights` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `automated_access` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `commercial_use` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `redistribution` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `local_cache` | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN |
| `attribution_required` | true | true | true | true | true |
| `source_owner` | "Polska Akademia Nauk — Komitet Językoznawstwa and Instytut Języka Polskiego" | null | "Instytut Języka Polskiego PAN" | "Instytut Języka Polskiego PAN" | "Instytut Języka Polskiego PAN" |
| `rights_url` | null | null | null | `https://creativecommons.org/licenses/by-nd/4.0/` (as printed) | null: the file names two licences |
| `contact_required` | true | true | true | true | true |
| `review_status` | LEGAL_REVIEW_REQUIRED | LEGAL_REVIEW_REQUIRED | LEGAL_REVIEW_REQUIRED | LEGAL_REVIEW_REQUIRED | LEGAL_REVIEW_REQUIRED |
| ADR-0008 licence basis | none | none | none | `OPEN_LICENCE` "CC BY-ND 4.0" is printed, and is contradicted (§14) | contradictory |

Why the fields are set this way:

- **R3 keeps `commercial_use`, `redistribution` and `transcription_rights` at `UNKNOWN`,** even though BY-ND 4.0's text grants them. The licence text grants "reproduce and Share the Licensed Material, in whole or in part", with no NonCommercial restriction. But the same channel's Guidelines page says a Creative Commons licence is only planned and the content is "fully protected by the copyright law". Its template names a different version and a different licence URL. Setting the fields to `ALLOWED` would let the permissive reading win.
- **`attribution_required` is `true` in every profile.** It is the restrictive value: it never widens use, and every licence named anywhere (BY) requires attribution.
- **`contact_required` is `true`** because each open question is the rights holder's to answer (§13).

**Evaluated by the repository's code.** The command runs from `packages/truth`, with a throwaway script outside the repository that imports `src/rights.ts`: `../../node_modules/.bin/tsx <scratch>/evaluate-profiles.ts`. The meaning chain gates a claim with `evaluateAllSurfaces(source.rights)`, per `packages/truth/src/meaning.ts`. `evaluateRightsMatrix` is ADR-0007's full matrix.

| Profile | `evaluateAllSurfaces` FREE / PAID / SEO | Matrix: metadata FREE | Matrix: transcription FREE, PAID, SEO | Matrix: image FREE | Matrix: every PAID and SEO cell |
|---|---|---|---|---|---|
| R1a | CONDITIONAL / BLOCKED / BLOCKED (`COMMERCIAL_USE_UNRESOLVED`) | LOCATOR_ONLY | BLOCKED `TRANSCRIPTION_RIGHTS_UNKNOWN` | LOCATOR_ONLY `IMAGE_RIGHTS_UNKNOWN` | BLOCKED |
| R1b | CONDITIONAL / BLOCKED / BLOCKED | **BLOCKED `ATTRIBUTION_REQUIRED_BUT_UNAVAILABLE`** | BLOCKED | BLOCKED `METADATA_NOT_PUBLISHABLE` | BLOCKED |
| R2 | CONDITIONAL / BLOCKED / BLOCKED | LOCATOR_ONLY | BLOCKED | LOCATOR_ONLY | BLOCKED |
| R3 | CONDITIONAL / BLOCKED / BLOCKED | LOCATOR_ONLY, attributed "Instytut Języka Polskiego PAN — https://creativecommons.org/licenses/by-nd/4.0/" | BLOCKED | LOCATOR_ONLY | BLOCKED |
| R4 | CONDITIONAL / BLOCKED / BLOCKED | LOCATOR_ONLY | BLOCKED | LOCATOR_ONLY | BLOCKED |

In every profile, `INTERNAL` is `ALLOWED INTERNAL_USE` for all three assets.

**What a confirmation would change. This is not a proposal.** Suppose the rights holder confirmed CC BY-ND 4.0 for an item. The licence text would then support `transcription_rights`, `image_rights`, `commercial_use` and `redistribution` = `ALLOWED` and `review_status` = `APPROVED`. The same code then returns:

- **`evaluateAllSurfaces`:** ALLOWED on FREE, PAID and SEO;
- **every matrix cell:** `ALLOWED_WITH_ATTRIBUTION`;
- **`metadata_rights`:** stays `UNKNOWN`, because the licence covers the article, not the catalogue record.

The "no derivatives" condition is not something ADR-0007's fields express. Whether a gloss, a root or a paraphrase in a claim is "Adapted Material" is a legal question (§13, question N7).

## 13. The §20.5 questions, and new ones

`docs/canonical/12` §20.5's questions concern ISNP. The spike maps each onto *Onomastica* content.

| # | Question | What the recorded statements say |
|---|---|---|
| 1 | Who owns database rights in the compiled work? | Not stated. The © lines name IJP PAN (2019–2025), or PAN's Komitet Językoznawstwa and IJP (2016–2018 imprints). |
| 2 | Commercial consumer product use? | For vols 64–69, "Essential facts", DOAJ and the PDFs say BY-ND 4.0, which permits commercial sharing. Contradicted at journal level (§8). For vols 56–63: not stated. **Open.** |
| 3 | Local caching? | Not stated anywhere. **Open.** |
| 4 | Transformation into structured derived claims? | Not stated. BY-ND forbids sharing Adapted Material. Whether a structured claim is one is **open** (N7). |
| 5 | Quotation or paraphrase, and limits? | Verbatim sharing "in whole or in part" under BY-ND 4.0, for vols 64–69, if the licence holds. Paraphrase: **open** (N7). |
| 6 | Storing historical attestations? | Not stated. **Open.** |
| 7 | Storing and visualising regional values? | Not applicable to the journal as observed. |
| 8 | Restrictions inherited from underlying works? | Not stated. Articles quote other works. **Open.** |
| 9 | API or bulk export? | Two OAI-PMH endpoints are publicly offered: OJS, and journals.pan.pl behind the verification page. No terms address their use. **Open** (N6). |
| 10 | Paid licence or partnership? | Not stated. **Open.** |
| 11 | Required attribution? | BY-ND 4.0 requires attribution; the PDFs ask that "the article is properly cited". The form is not stated. **Open** for exact wording. |
| 12 | Update feed? | The OJS OAI supports datestamps and persistent deletions. No feed terms. |
| 13 | Distinguishing newer content from older? | For this journal, by volume: the declared licence starts at vol. 64 (2020). |
| 14 | Commercial SEO pages using derived facts? | Not stated. **Open.** |
| 15 | Different rights for metadata, prose and excerpts? | Not stated. No metadata licence exists; OAI `dc:rights` is copyright only. **Open.** |

**New questions for the rights holder, raised by this spike:**

- **N1.** Does CC BY-ND 4.0 International govern every article from vol. 64 (2020) on? Is the Guidelines sentence saying a licence is only planned out of date?
- **N2.** What do the agreement template's "CC BY-ND … 3.0" and its link to BY-SA 3.0 mean? Does the 3.0 badge on every page imply any other licence?
- **N3.** What terms govern vols 56–63 (2012–2019)? Nothing states a licence for them.
- **N4.** Do terms differ between the journal's site, journals.pan.pl and RCIN? They do: the journal's site prints "4.0 International" with the BY-ND URL for vol. 64, and journals.pan.pl prints "4.0 Poland" with a BY-NC-ND URL. No file is byte-identical across the two channels.
- **N5.** Who holds the rights to be attributed? The OAI records say "Onomastica", the © lines "Instytut Języka Polskiego PAN", and the 2016–2018 imprints also "Polska Akademia Nauk — Komitet Językoznawstwa".
- **N6.** May the OAI-PMH endpoints be harvested automatically, and at what rate? Neither channel's terms address it, and journals.pan.pl and RCIN answer automated clients with a browser-verification page.
- **N7.** Under BY-ND, may Name Atlas store and show a structured claim (root, root language, gloss, formation type) drawn from an article, or only verbatim excerpts with attribution?
- **N8.** Does any licence cover the catalogue metadata (titles, abstracts, keywords) served over OAI-PMH?
- **N9.** Why does the "download file" on "Essential facts" answer 404, and which agreement version applies to which volumes?

## 14. ADR-0008 §4 assessment

ADR-0008 §4's four conditions are all required, and an entry failing one is refused at import.

| Condition | R1a / R1b (S0) | R2 (S1, S4) | R3 (S2) | R4 (S3) |
|---|---|---|---|---|
| 1. Citable: author or publisher, title, year, locator | **Met** for all 373 OJS items, which each have creator, title, year and pages. 12 of the 260 journals.pan.pl records have no creator and 167 no pages; the OJS record supplies them where linked. | Met | Met | Met: the same articles as R3's vol. 64, linked in §3 or found on OJS |
| 2. Rights permit the surface (ADR-0007) | **Not met on PAID and SEO.** FREE is CONDITIONAL in `evaluateAllSurfaces`; text is blocked on every public surface (§12). R1b also blocks metadata on FREE. | Not met on PAID and SEO; FREE CONDITIONAL | Not met on PAID and SEO; FREE CONDITIONAL. With a confirmation it would be met (§12). | Not met |
| 3. `C_SCHOLARLY_SECONDARY` or better | **Met** (proposed): double-blind peer review | Met | Met | Met |
| 4. Licence basis stated | **Not met:** no licence stated | **Not met:** "Open Access … ©" names no licence | **UNRESOLVED — contradicted.** "CC BY-ND 4.0" is stated by name in the article and in the journal's policy, and contradicted by the Guidelines page, the template and the badge (§8). D-022. | **UNRESOLVED — contradictory within the file:** BY-ND named, the BY-NC-ND URL printed (§6). D-022. |

**Result:** no *Onomastica* item is admissible under ADR-0008 today. Vols 64–69 turn on D-022. Vols 56–63 would need a licence from the rights holder (Path A) or a published statement that does not exist yet. D-002 and ADR-0008 are unchanged.

## Out of scope, and absent as required

- There is no table, migration, row, domain type, source file, connector, text extraction, index or claim.
- No PDF, page image or article text is in the repository.
- IJP PAN was not contacted, and no browser-verification page was bypassed.
- No request went to a plain-HTTP host. The `http://` file URLs named in journals.pan.pl records were not requested. Each item's file was requested through `https://journals.pan.pl/Content/<edition>`, and every redirect to a plain-HTTP URL was recorded and not followed.
- No other journal, ISNP or Polona was examined.
