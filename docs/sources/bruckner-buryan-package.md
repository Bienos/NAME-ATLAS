# Brückner 1927 and Buryan 1933 — the owner-supplied digitisation package

> **Provenance.** Recorded on 2026-09-24 on branch `claude/trusting-wozniak-ktn6a9` as an update under D-002. That branch was based on an old commit, where D-002 was still open, and was never merged. Carried onto `main` on 2026-09-24 so the branch can be deleted. The facts below are unchanged. Only the closing "What this changes" paragraph was rewritten, because two of its statements are not true on `main`: D-002 is resolved there, and onomastics code exists.
>
> **How this relates to `main`.** D-002 was resolved on 2026-09-21 by ADR-0008 (Path B, attributed sources). Buryan 1933 is already a committed meaning source, `sources/onomastics/buryan-1933.json` (25 surnames), taken from the same Zielonogórska Biblioteka Cyfrowa edition 82526 that the package's PDF matches below. This record adds what `main` did not have: the package's checksums and checks, the Brückner 1927 analysis, the traced public copies with their rights basis, and coverage figures against the full male resource.

The project owner supplied a machine digitisation of two printed works, produced outside this repository (its report is dated `2026-09-23T23:02:54+00:00`). Four files were received and examined on 2026-09-24. The SQLite database, which the workbook names as the package's complete store, followed the same day as a zip. SHA-256 as received:

| File | Bytes | SHA-256 |
|---|---|---|
| `etymologia.xlsx` | 8,982,114 | `22280b39ea9f39a7795a4ec368f7f344cd70a99bb7248892e517e0b232f88291` |
| `raw_pages.jsonl` | 8,875,883 | `c64dc285f58bc8083dba062b7fbff6e3d31331b0f2f0becf37350b40e484b6d6` |
| `review_queue.csv` | 38,360 | `4d3bbd1e5ba4e15b728e34d6b94bde16dbc7e5856e352436f894b4e94a7febf6` |
| `raport_kontroli.md` | 2,071 | `47383fc29475db8048957a702caf1b2d1de0523d6f96fc83e54006e9a55b7e73` |
| `etymologia_master.sqlite.zip` | 6,096,111 | `42af4346284bf4c48b1df7cfc929a6b88b089d92dec1c64f74aadae27b347227` |
| `etymologia_master.sqlite` (inside the zip) | 37,376,000 | `321536d895ed49e6f512e94dfa228152a872c5d1095cc35c2d5f99603910bccd` |

Not supplied: the two source PDFs. The project owner said they came from the web. Both were then traced to public copies and matched byte for byte on 2026-09-24 (below).

**The two works**, identified from the title pages in the package's page text:

- **Aleksander Brückner, *Słownik etymologiczny języka polskiego*, Kraków 1927** (Krakowska Spółka Wydawnicza).
  - Source copy: the package's PDF is byte-identical to the file `Słownik etymologiczny języka polskiego.pdf` in the Internet Archive item `slownik_etymologiczny_jezyka_polskiego` (703,943,326 bytes, SHA-256 `c2e3a7195ba1d3ac88a2edde4199e242a31e522c7eb154c9a2d005405f2237e4`, streamed and hashed).
  - The item is a 2019 user upload. Its metadata, which uploaders supply, carries a CC0 1.0 mark. The PDF itself (415 pages, producer ABBYY Recognition Server, created 2015-04-16) does not name the institution that scanned it.
  - Rights: the Wielkopolska Biblioteka Cyfrowa catalogue gives Brückner's dates as "1856–1939". It holds a separate DjVu scan of the same 1927 edition (publication 510848, edition 426538), marked "Prawa: domena publiczna". On that death year the text is out of copyright in Poland, though attribution is still owed.
- **ks. Józef Buryan, *Skąd pochodzi twoje imię i nazwisko i nazwa miejscowości rodzinnej? (Zwięzły zarys imiennictwa polskiego)*, Warszawa 1933.** The title page reads "Wszelkie prawa zastrzeżone".
  - Source copy: the package's PDF is byte-identical to Zielonogórska Biblioteka Cyfrowa edition 82526 (publication 91798), downloaded from `https://www.zbc.uz.zgora.pl/Content/82526/download/` (17,117,073 bytes, SHA-256 `91d69b0eae2095f338133da6eb395a699bb35c2476bb232a60f25dcccc0ae43c`). The PDF has 48 pages, producer Adobe Acrobat 10.1.16 Paper Capture Plug-in, created 2025-01-23. The library added the record on 2025-01-27.
  - Rights: the record gives the author as "Buryan, Józef (ksiądz; 1883-1950)". Its `dc:rights` field names only "Biblioteka Uniwersytetu Zielonogórskiego" and states no licence. The National Library's authority file gives the same dates (`data.bn.org.pl` record 1938983). On that death year the work has been out of copyright in Poland since 2021. ZBC publishes no reuse terms: its information pages cover technical matters, the dLibra software and privacy.

**Checked on 2026-09-24, against the supplied files:**

- The package's counts match its report: 463 page records (415 + 48), 5,745 Brückner entries, 26,846 Brückner index rows, 199 Buryan fragments, 3,657 Buryan name mentions, 186 review items (9 HIGH, 43 MEDIUM, 134 LOW). `review_queue.csv` and the workbook's `Do_weryfikacji` sheet hold the same 186 IDs.
- The SQLite database passes `PRAGMA integrity_check` and `PRAGMA foreign_key_check`. Its 17 tables match the workbook's 17 data sheets cell for cell; `review_queue` and `qa_metrics` differ only in row order. Its `pages` table equals `raw_pages.jsonl`, and its `review_queue` table equals `review_queue.csv`. The database therefore holds no data the other files lack. Its `sources` table records the two PDF checksums matched below.
- All text is machine-extracted from the PDFs' embedded OCR. The package itself declares that nothing was proofread by hand and no second OCR was run. Brückner PDF pages 346 and 353 have visible text missing from the OCR layer, and so does Buryan's footnote 20 (PDF page 19).
- Brückner is a dictionary of common words, not of surnames. 13 of the 5,745 entries contain "nazwisk*", mostly in the older sense "name". A text search found none of the 15 Polish surnames in `fixtures/pesel/national-male-2026-01-20.csv` discussed there as a surname. What it offers is the etymology of root words, with derivatives nested under the root headword (`kowal` sits in the entry `kuć`, printed p. 279), so lookups have to go through the index. On its own it can support a root meaning, not a surname's origin (`docs/canonical/14` §26.1).
- Brückner's entry segmentation is noisier than the review queue shows. 309 headwords (5.4%) fail a simple one-word shape check, and 24 of them are in the queue. In a random sample of 25 of the 309, about 6 were false entry splits and about 5 had OCR-damaged headwords.
- Buryan discusses surnames directly: 1,546 mentions are typed `nazwisko` (1,475 unique forms), and 7 of the same 15 fixture surnames appear in its text. But all 3,657 mentions are `REVIEW_REQUIRED`, 3,596 of them were typed from section or list context, and `base_name`, `language_origin`, `meaning` and `derivatives` are empty in every row. It cites Brückner's dictionary (its footnote 1), so it is not independent of him where it repeats him.
- Coverage was checked against the full national male PESEL resource `1148808` (2026-01-20), downloaded with SHA-256 equal to `fixtures/pesel/source-manifest.json`, with surnames ranked by `Liczba`. Of the top 20, 100, 1,000 and 10,000, Buryan's surname index holds 4, 16, 122 and 425. Counting any capitalised occurrence in his text raises that to 8, 29, 228 and 782, an upper bound, since some matches are sentence starts or place names.
- The index misses surnames the text states outright. Of the top 20, it types Nowak as a place and omits Wójcik, Szymański and Dąbrowski. Surname-level use needs the text, not the index.

**What this changes** (rewritten for `main`; see Provenance): D-002 itself is settled on `main` by ADR-0008, so this record informs which further Path B works to add, not the decision. Path B has two concrete candidates here. One is out of copyright but not about surnames. The other is about surnames and, on the dates in two library authority records, is also out of copyright. Even together they reach a minority of common surnames, so under Path B alone most etymology results would be `INSUFFICIENT_DATA`. The package and the PDFs are not committed (about 55 MB unzipped and 721 MB, and there is no raw object storage yet, INF-001). Nothing from this package was ingested. `main`'s `sources/onomastics/buryan-1933.json` (committed 2026-09-23) cites the ZBC scan directly.

**Open before either work is used:**

- A rights statement per surface, as D-003 requires for Polona. The Internet Archive copy carries no institution's rights statement; WBC's copy of the same edition does, and printed page numbers carry across copies of an edition.
