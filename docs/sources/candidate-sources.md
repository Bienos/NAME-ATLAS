# Candidate sources — discovery list

> **Provenance.** Written on branch `claude/magical-euler-27ok85` (2026-09-23/24), which was based on an old commit and never merged. Carried onto `main` on 2026-09-24 so the branch can be deleted; the text is unchanged except for two cross-references (four places), rewritten because their numbers mean something else on `main`:
>
> - "D-006" (the unit of `Liczba`) is **TASK-004 §14 U-4** on `main`. The project owner decided it on 2026-09-20 under D-007 (unit `PEOPLE`; ADR-0004 amendment).
> - "TASK-010 spike" (Polona) is **TASK-031** on `main` (`tasks/031-polona-source-spike.md`).
>
> Also changed on `main` since this list was written: D-002 is resolved by ADR-0008 (Path B, attributed sources), D-003 by ADR-0007, and D-004 on 2026-09-20. TASK-005 ("Stage 1") is implemented.

Working list of documents and datasets that could supply the data the product needs, in the order they are proposed to be investigated. Built in conversation with the project owner on 2026-09-23.

**Status: DISCOVERY, PARTLY VERIFIED.** Nothing in this file is approved, ingested or rights-reviewed. No entry is a `Source`, `SourceRecord` or `RightsProfile`. Being listed here authorises nothing (`ARCHITECTURE.md` §5: public availability does not authorise scraping, extraction, caching or redistribution).

## How this list was built — read before relying on any line

- **2026-09-23 — search only.** Links were taken from web search result listings; the hosts were blocked by the session's network egress policy. Remarks marked *(search summary)* are what the search engine said and remain **unverified**.
- **2026-09-24 — direct verification.** After the project owner allowed the hosts, the facts marked **VERIFIED 2026-09-24** were read directly from the publisher's own pages, API or file bytes in this environment. Downloaded files were kept in the session scratchpad only; none was copied into the repository or ingested.
- Two sites answered with an automated "verifying browser" proof-of-work page (`journals.pan.pl` always; `rcin.org.pl` intermittently). It was not circumvented; those items are checked on the journal's own site or left for manual checking.
- Titles, dates and descriptions of works without a link come from general knowledge and are unverified. Items marked **(to confirm)** are the least certain.

## Standing rules for every source below

- Each source needs its own `RightsProfile` before any production surface. `commercial_use = UNKNOWN` blocks paid surfaces.
- Rights are recorded **per object/article**, not per portal: a journal or digital library can carry different terms per item.
- From lists of persons (address books, casualty lists, registers) take only **surname, place, year and exact locator**. No first names, no person entities — person-level matching is a non-goal (`PRODUCT.md` §8).
- Columns or classifications about religion, nationality or race are never used. No ethnicity or religion is inferred from a surname (`PRODUCT.md` §7 rule 8).
- Armorials and noble-descent material are out of scope (`PRODUCT.md` §8 item 5).
- Secondary surname websites without sources are not sources.
- Polish public domain rule of thumb: the author died in 1955 or earlier.

---

## Stage 1 — current count (unblocks TASK-005)

### 1. Dataset 1681 methodology + Ministry of Digital Affairs answer to a public-information request
- **Data sought:** whether one `Liczba` occurrence equals one living person; how double-barrelled surnames are counted; whether anything other than count = 1 is suppressed; total living persons in PESEL at 2026-01-20, overall and by sex.
- **Feeds:** `CURRENT_POPULATION`; denominator for `RARITY_CONTEXT`. Would confirm U-4 (the unit of `Liczba`) with a publisher statement.
- **Links:** [dataset page](https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel) · [API metadata](https://api.dane.gov.pl/1.4/datasets/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel)
- **VERIFIED 2026-09-24 — what the publisher's metadata says** ([metadata.csv](https://api.dane.gov.pl/1.4/datasets/1681/resources/metadata.csv?lang=pl), SHA-256 `c3dd70f58caea57028e92a784f150b1cea9c2cd1189925f7ef4124f08bf91993`): dataset description *"Wykaz nazwisk osób żyjących występujących w rejestrze PESEL. Przedmiotowe dane zostały opracowane na podstawie informacji zgromadzonych w rejestrze PESEL według pola nazwisko aktualne. Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu."*; licence `CC0 1.0`; "Warunki wykorzystywania" empty; no supplementary documents. Nothing states the unit of `Liczba` or how double-barrelled surnames are counted, so the request to the publisher is still needed.
- **VERIFIED 2026-09-24 — where to send the request** (same metadata): e-mail `kancelaria@cyfra.gov.pl`; ePUAP profile `MAiC`; e-Delivery address `AE:PL-45928-68514-CHARA-16`.
- **VERIFIED 2026-09-24 — arithmetic relevant to U-4** (computed from the bytes of the 2026-01-20 files, checksums matching `fixtures/pesel/source-manifest.json`): the national files sum to **21,197,537** (male) + **21,560,302** (female) = **42,757,839** occurrences, excluding suppressed single occurrences. GUS gives **37,332.51 thousand** residents at 2025-12-31 (18,026.904 thousand male, 19,305.606 thousand female; item 3). The PESEL sums therefore exceed the GUS population by about 5.4 million. So either the register's living universe is larger than the GUS resident population, or one occurrence is not one person — the files alone cannot say which. Either way GUS is not a compatible denominator.
- **Press lead, not a publisher statement:** [rp.pl](https://www.rp.pl/prawo-dla-ciebie/art959941-ile-osob-w-polsce-nosi-twoje-nazwisko-teraz-mozesz-to-sprawdzic) reportedly gave the example that the double-barrelled surname "Białkowska-Gajos" was absent because only one person bears it *(search summary)*. A newspaper cannot close U-4.
- **Do not confuse with dataset 568** — VERIFIED 2026-09-24: *"Nazwiska występujące w rejestrze PESEL z uwzględnieniem nazwisk osób zmarłych"*, CC0 1.0, 26 resources, latest 2026-01-20 (male `1148813`, female `1148815`). Its description says deceased persons' surnames are included. Its resource titles are identical to dataset 1681's ("Nazwiska męskie - stan na …"). It must never feed a count of living people.

### 2. All 21 resources of dataset 1681 — VERIFIED 2026-09-24
- **Feeds:** `SURNAME_DISTRIBUTION_SHIFT` (national trend across years); older regional snapshot (2025).
- **Method:** resource list from the publisher's metadata.csv; each resource's CSV fetched from its official `csv_download_url` (the 2019 female resource, native CSV, from its `file_url`); rows, header, count range and sum computed from the bytes. Scratchpad only.
- **Result:**

  | Reference date | Sex | Scope | Resource | Rows | Sum of `Liczba` | SHA-256 of CSV |
  |---|---|---|---|---:|---:|---|
  | 2019-06-30 | F | national | 18989 | 297,456 | 20,249,319 | `c35e44779eb3e655f66c453a71b1c8db192b309375e828f16893864822fdbba8` |
  | 2019-06-30 | M | national | 18990 | 277,108 | 19,859,783 | `e975ecc4226aec76a5144ce17ca32612e4aaba058dd9589f6b4cbd2db3e4a4bb` |
  | 2020-01-22 | F | national | 22815 | 299,612 | 20,220,345 | `b0ede69ca79698cd8f6b09462916234be67dd4322d888e6a9263b89a52bfd99b` |
  | 2020-01-22 | M | national | 22817 | 283,221 | 19,879,045 | `a6af514f921c30771591bced6785c6559d63f5e88868e25eaad130eb36fd805d` |
  | 2021-02-01 | M | national | 28052 | 298,692 | 19,987,207 | `ea466f2b8611be038913c6354bb13a5d029f5ff0ced07eea7ef282f5f52c215c` |
  | 2021-02-02 | F | national | 35279 | 311,240 | 20,263,212 | `9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0` |
  | 2022-01-27 | F | national | 38772 | 311,240 | 20,263,212 | `9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0` |
  | 2022-01-27 | M | national | 36401 | 322,232 | 20,203,548 | `4389d8964dd37c7ab71306d537e98b365e171831d2be9e63b84bdcaaf33ca68d` |
  | 2023-01-30 | M | national | 44647 | 363,360 | 20,808,071 | `7e95c307a2ebf62b1ea14b936925c46cc0b6db960dec8fc98c6b5fe8980f9af0` |
  | 2023-01-31 | F | national | 44646 | 389,365 | 21,369,477 | `326bfc3dcf2b55886073a46780acaefec3fb2bc4444f6ddbc052938c1aa05cb2` |
  | 2024-01-19 | F | national | 54098 | 400,764 | 21,479,386 | `7988d01d8f85f84cd84bb0069b9129c9b3944aba5349709cffca21555d6fcf28` |
  | 2024-01-19 | M | national | 54097 | 379,712 | 20,976,785 | `3c722cada73f0b52184931a4cc521a5c7d6905683f5103a417f867fd9547be0e` |
  | 2025-01-22 | F | national | 63888 | 411,012 | 21,535,515 | `9ac287db5266fc03d3e24a497244d071b3ef2fb4907c43c2b07844912db0d27a` |
  | 2025-01-22 | M | national | 63892 | 395,127 | 21,096,170 | `079695630265bf0bcb2f944743799850465123fbd280ead736f3274d867818cb` |
  | 2025-02-24 | F | regional | 65090 | 694,199 | 17,420,640 | `9322fc8c72e6ddaa2d4c51bf247f2847ce9ee96ea397587b87d9056039064e43` |
  | 2025-02-24 | M | regional | 65049 | 646,100 | 16,711,881 | `4e258a328cf7a8f66766a73e486505e760d2ebb0840814df72c09695c374ef39` |
  | 2026-01-20 | F | national | 1148811 | 420,082 | 21,560,302 | `c508680d084dd21949ca7c817339fd63d31342ee5318320c5266c6bf4909f6e6` |
  | 2026-01-20 | F | regional | 1148790 | 694,553 | 17,296,363 | `cd0c100e9205cffef594a16129e65c4a8373b62c49dcbb5fd7ed3ae27f7b6989` |
  | 2026-01-20 | M | national | 1148808 | 408,182 | 21,197,537 | `ce4238feda85e75c73b16a229eb8afc1dfccb8854a7809111ab85fb8672b62f4` |
  | 2026-01-20 | M | regional | 1148786 | 646,052 | 16,590,111 | `0eb31d19955fbbb0a04c7693fb3e2515bc821515c31486851215f1482bee1b51` |

  The 21st resource is the 2019 female file's native XLSX (18988); only its CSV twin was profiled.
- **Findings:**
  1. **Structure is stable from 2020.** Header `Nazwisko aktualne,Liczba` in every national file 2020–2026; UTF-8 without BOM, comma, CRLF; minimum count 2 in every file. The 2019 files use a different header (`nazwisko,liczba`) and their resource description does not say "osób żyjących" — treat 2019 as a separate case until clarified.
  2. **Data-quality defect: the "2022" female file is the 2021 file.** Resources 35279 (2021-02-02) and 38772 (2022-01-27) are byte-identical. There is no genuine 2022 female snapshot in this dataset. Worth reporting to the publisher.
  3. **The register total grows while the population falls.** Male sums rose from 19.86 M (2019) to 21.20 M (2026) and female from 20.25 M to 21.56 M, while GUS population fell from 38.38 M (2019-12-31) to 37.33 M (2025-12-31). The largest step is 2022 → 2023 (male +604,523). The cause is not stated anywhere; any trend claim needs the publisher's explanation of who enters the register.
  4. The search-summary row counts from 2026-09-23 (194,479 and 774,320) were **wrong**; the actual values are in the table.
- **Current pair:** the 2026-01-20 CSV bytes fetched today match the checksums pinned in `fixtures/pesel/source-manifest.json` for all four resources.

### 3. GUS — population by sex — VERIFIED 2026-09-24
- **Data sought:** total population by sex; GUS's definition of population.
- **Feeds:** context only. Not a compatible denominator for PESEL counts (item 1).
- **Values:** Table I of [*Ludność. Stan i struktura … 2025, stan w dniu 31 grudnia*](https://stat.gov.pl/obszary-tematyczne/ludnosc/ludnosc/ludnosc-stan-i-struktura-oraz-ruch-naturalny-w-przekroju-terytorialnym-w-2025-r-stan-w-dniu-31-grudnia,6,40.html) (tables ZIP SHA-256 `9f98514eef93e7da6f95fc190746060bac7e59d2ae25fd17e3abca54b1736d2e`): population at 31 Dec, thousands — 2019: 38,383; 2020: 38,089; 2021: 37,908; 2022: 37,766; 2023: 37,637; 2024: 37,489; 2025: 37,332.51 (male 18,026.904; female 19,305.606).

### 3a. Registered-residence counts from the same register — VERIFIED 2026-09-24
- **Dataset 1082**, [*Liczba osób zameldowanych na pobyt stały*](https://dane.gov.pl/pl/dataset/1082,liczba-osob-zameldowanych-na-pobyt-stay), CC0 1.0: *"Liczba osób zameldowanych na pobyt stały w podziale na poszczególne gminy. Przedmiotowe dane zostały opracowane na podstawie informacji zgromadzonych w rejestrze PESEL, dot. osób zameldowanych na pobyt stały tj. osób które na dzień wyboru z bazy nie miały w rejestrze PESEL zarejestrowanej daty zgonu"*. 12 resources; latest **2026-01-07** (resource `1040649`, CSV SHA-256 `ae811c6a3e63f6ab9a85b7adc6b2bf6c8e0a7c71424c0547a42c3116cd2cced4`): 3,238 communes by TERYT code, with totals by sex and by under/over 18.
- **Totals at 2026-01-07:** 35,186,590 registered for permanent residence (male 16,826,187; female 18,360,403).
- **Against the 2026-01-20 regional surname files** (different reference dates, 13 days apart): the surname sums equal **98.6 %** of registered men (97.5–99.0 % per voivodeship) and **94.2 %** of registered women (93.0–95.2 %). All 16 voivodeship names match exactly. The consistent gap is what suppressed single occurrences would produce; why it is about five points larger for women is not established.
- **Consequence for D-004:** dataset 1082 is a usable same-register denominator for a per-voivodeship share, provided the reference-date difference is stated. It is not a denominator for the national files: those hold about 7.6 M more occurrences (42.76 M) than there are registered residents (35.19 M).
- **Dataset 2082 is irrelevant**: VERIFIED as *"Liczba osób zameldowanych na pobyt stały z podziałem na osiedla w Przemyślu w latach 2017-2022"* — one city only.
- No dataset giving the **total number of living persons in PESEL** exists in what was checked. That question stays with the publisher (item 1).

## Stage 2 — meaning and origin (D-002)

### 4. K. Rymut, *Nazwiska Polaków. Słownik historyczno-etymologiczny* (1999–2001)
- **Data sought:** what the surname derives from (word, given name or place name), meaning of that base, suffix, earliest dated records, variants.
- **Feeds:** `LEXICAL_ROOT`, `ROOT_MEANING`, `FORMATION_MECHANISM`, `HISTORICAL_FORM_ATTESTED`.
- **Links:** none found yet. Copyright-protected; claim-by-claim citation or IJP PAN partnership.

### 5. W. Taszycki (ed.), *Słownik staropolskich nazw osobowych* (7 vols, 1965–1987)
- **Data sought:** exact written form of a name in the source, year, place, reference to the medieval source.
- **Feeds:** `EARLIEST_FOUND_OCCURRENCE`, `HISTORICAL_FORM_ATTESTED` (to c. 1500).
- **Links (RCIN):** [vol. 1](https://rcin.org.pl/dlibra/doccontent?id=19845) · [vol. 2](https://rcin.org.pl/dlibra/doccontent?id=19846) · [vol. 3](https://rcin.org.pl/dlibra/publication/39948/edition/19847/content) · [vol. 4](https://rcin.org.pl/dlibra/doccontent?id=19848) · [vol. 5](https://rcin.org.pl/dlibra/publication/39950/edition/19849?language=en) · [vol. 6](https://rcin.org.pl/dlibra/publication/39952/edition/19850/content) · [series](https://rcin.org.pl/dlibra/publication/39927?language=en)
- **Rights — VERIFIED 2026-09-24 (vol. 6 page on RCIN):** "Prawa: *Prawa zastrzeżone - dostęp nieograniczony*"; "Zasady wykorzystania: *Zasób wyłączony spod ochrony prawa autorskiego. Korzystanie dozwolone bez ograniczeń wynikających z autorskich praw majątkowych.*"; access "Otwarty"; format DjVu. The two statements contradict each other ("rights reserved" vs "excluded from copyright protection"), and the editor died in 1979. Legal review before any reuse beyond citation. The other volumes were not checked (RCIN browser check).

### 6. *Onomastica* (IJP PAN, annual since 1955, open access)
- **2026-09-29: dropped.** TASK-032 checked it (`docs/sources/onomastica.md`), and the project owner dropped it as a meaning source (D-022). The notes below are kept as they were.
- **Data sought:** articles discussing specific surnames or surname groups; the licence of each article; bibliography.
- **Feeds:** `SCHOLARLY_ONOMASTIC_STATEMENT` evidence for `ROOT_MEANING`, `SURNAME_CLASSIFICATION`, `GEOGRAPHIC_ORIGIN`, `LINGUISTIC_ORIGIN`.
- **Links:** [journal site (OJS) — issue archive](https://onomastica.ijppan.pl/index.php/ONOM/issue/archive) · [page supplied by the project owner (113382)](https://journals.pan.pl/onomastica/113382?language=pl) — not readable here (`journals.pan.pl` answers with a browser check), so its content is still unconfirmed.
- **VERIFIED 2026-09-24 — coverage:** the journal's own site holds vols 59 (2015) to 69 (2025), 373 items in total. Older volumes (e.g. vol. 57, 2013) appear only on the PAS repository *(search listing)*.
- **VERIFIED 2026-09-24 — licence, per article PDF:** sampled PDFs from vols 64 (2020), 66 (2022), 67 (2023) and 68 (2024) state: *"This is an Open Access article distributed under the terms of the Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) License (https://creativecommons.org/licenses/by-nd/4.0/), which permits copying and redistribution, commercial and non-commercial, provided that the article is properly cited."* Sampled PDFs from vols 59 (2015), 60 (2016) and 62 (2018) carry **no licence statement** on their first two pages. Neither the article pages nor the journal's "About" pages state a licence. So: CC BY-ND 4.0 from 2020 on (per article, still to be checked each time); no stated licence before that.
- **Reading of CC BY-ND (needs legal review):** commercial use and verbatim quotation with attribution allowed; translation or reworked passages not allowed without permission.
- **Surname-related articles on the journal site (titles matched on "surname/nazwisk/anthroponym", 47 hits; the most relevant):**
  - 59 (2015) Raszewska-Klimas, *Variantivity of the Nineteenth-century Surnames of Piotrków's Inhabitants* — `10.17651/ONOMAST.59.10` (no licence stated)
  - 60 (2016) Woźniak, *Sociolinguistic aspects of surname changes in the interwar period* — `10.17651/ONOMAST.60.8`
  - 60 (2016) Górny, *Folk image of human existence recorded in surnames* — `10.17651/ONOMAST.60.9`
  - 60 (2016) Magda-Czekaj, *The World of Nature Observed Through Surnames of Dialectal Origin* — `10.17651/ONOMAST.60.10`
  - 60 (2016) Horyń, *Polish Surnames Motivated by the Lexicon of the Salt Mining Field* — `10.17651/ONOMAST.60.11` (no licence stated)
  - 61/1 (2017) Walkowiak, *Function Words in Surnames* — `10.17651/ONOMAST.61.1.9`
  - 61/1 (2017) Łuc, *… 19th-Century Appellative-based Surnames* (Cieszyn Silesia) — `10.17651/ONOMAST.61.1.10`
  - 61/1 (2017) Górny, Skowronek, *Polish Anthroponymy of 16th–18th Century — 'End of History'?* — `10.17651/ONOMAST.61.1.15`
  - 62 (2018) Skowronek, Czopek-Kopciuch, *"The Most Popular Surnames in Poland — Past and Present. E-Dictionary". Progress report* — `10.17651/ONOMAST.62.16` (no licence stated)
  - 62 (2018) Heuser, Scheller, *Das Digitale Familiennamenwörterbuch Deutschlands* — `10.17651/ONOMAST.62.15`
  - 64 (2020) Walkowiak, *Contemporary Polish surnames of possible Lithuanian origin …* — `10.17651/ONOMAST.64.16` (CC BY-ND 4.0)
  - 66 (2022) Kurdyła, *The relatively rare and mysterious surname of Kurdyła: Meaning, origin, geography, morphology* — `10.17651/ONOMAST.66.8` (CC BY-ND 4.0)
  - 67 (2023) Wójcik, *From Midoń to Mitoński, from Bartosz to Bartosiewicz. Historical surnames of residents of Radwanowice* — `10.17651/ONOMAST.67.8` (CC BY-ND 4.0)
  - 68 (2024) Lica, *… parts of the human body … in German and Polish surnames* — `10.17651/ONOMAST.68.7`
  - 68 (2024) Górny, *Internet dictionary of Polish surnames — history, future, public perception* — `10.17651/ONOMAST.68.20` (CC BY-ND 4.0)

### 7. A. Brückner, *Słownik etymologiczny języka polskiego* (1927) — public domain (author died 1939)
- **Data sought:** meaning and origin of common words that surnames derive from.
- **Feeds:** `LEXICAL_ROOT`, `ROOT_MEANING` for the root only. It is a dictionary of words, not surnames, so it cannot establish that a surname derives from the word: at most `LIKELY`/`POSSIBLE`.
- **Links:** [Polona](https://polona.pl/item/slownik-etymologiczny-jezyka-polskiego,MTE2NjUxOA/45/) · [Internet Archive](https://archive.org/details/slownik_etymologiczny_jezyka_polskiego) · [WBC](https://www.wbc.poznan.pl/dlibra/publication/510848/edition/426538?language=pl) · [Wikisource transcription](https://pl.wikisource.org/wiki/Indeks:S%C5%82ownik_etymologiczny_j%C4%99zyka_polskiego_(Br%C3%BCckner))

### 8. S. B. Linde, *Słownik języka polskiego* (1807–1814) — public domain
- **Data sought:** historical meanings of words, especially obsolete occupations.
- **Feeds:** `ROOT_MEANING` for archaic words.
- **Links:** [KPBC, vols 1–6](https://kpbc.umk.pl/dlibra/publication/8173?language=pl) · [Polona vol. 1](https://polona.pl/preview/47964e34-3a71-4fb6-b4ce-c1f39aee3e52) · [Polona vol. 6](https://polona.pl/preview/3e16cf55-4a41-4950-b45e-0537f9448f68) · [Internet Archive](https://archive.org/details/sownikjzykapols02lindgoog) (edition to confirm)

### 9. *Nazwy miejscowe Polski. Historia, pochodzenie, zmiany* (IJP PAN, from 1996)
- **Data sought:** historical records of place names with dates, etymology, location.
- **Feeds:** `TOPONYMIC_ASSOCIATION` for surnames derived from place names — only ever "possible".
- **Links (RCIN):** [vol. 1](https://rcin.org.pl/dlibra/publication/15428/edition/2836) · [vol. 2](https://rcin.org.pl/dlibra/publication/15430/edition/2842/content) · [series](https://rcin.org.pl/dlibra/publication/15454?language=en)
- **Rights:** *(search summary)* copyright-protected; on RCIN available only on terminals at IJP PAN.

### 10. Surname dictionaries of other languages (German, Ukrainian, Czech, Lithuanian)
- **Data sought:** etymology of surnames of non-Polish origin.
- **Feeds:** `LINGUISTIC_ORIGIN`. Low priority; usually copyright-protected. Not searched yet.

### 11. IJP PAN, *Internetowy słownik nazwisk w Polsce* (ISNP)
- **Data sought:** the fields in `docs/canonical/12` §20.4 — only under an agreement.
- **Links:** [nazwiska.ijppan.pl](https://nazwiska.ijppan.pl/) — the site now presents itself as "wersja 2.0 (2025–2030)" *(search listing title)* · ["O słowniku" page — where the licence should be stated](https://nazwiska.ijppan.pl/info/oslowniku) · [DARIAH.lab page](https://dariah.ijppan.pl/main/zosoby/internetowy-slownik-nazwisk-w-polsce/) · [NPRH project page](https://ijppan.pl/en/projekty-nib/najczestsze-nazwiska-w-polsce-wspolczesnosc-i-historia-slownik-elektroniczny/)
- **VERIFIED 2026-09-24 — rights:** the dictionary's home page and its "O słowniku" page state only *"© 2026 - Instytut Języka Polskiego PAN"*, followed by the NPRH project line (*"Internetowy słownik nazwisk w Polsce. Kontynuacja", 2025–2030, umowa NPRH/DN/SP/0093/2024/14, Ministerstwo Nauki i Szkolnictwa Wyższego*). **No Creative Commons or other open licence is stated.** The CC BY-ND 4.0 attribution from the 2026-09-23 search belonged to the *Onomastica* article about ISNP (confirmed in that article's PDF, item 6). The lead is closed: ISNP stays **partnership required**, as `docs/canonical/12` §2.1 says. `robots.txt` contains only `User-agent: *` — which in any case would not be permission.
- **VERIFIED 2026-09-24 — data basis:** "O słowniku" states the frequency and geography data are *"rejestr PESEL z 2014 r."*, obtained free of charge from the Ministry of the Interior's population-records unit. Entries give counts per voivodeship, the 16 districts and 16 communes with the highest frequency, and a voivodeship map. Feminine forms in -ska/-cka/-dzka have their own entries for frequency; all other information sits in the masculine entry.
- **Useful for path B of D-002:** the page's source list names the works ISNP drew historical attestations from — *Słownik staropolskich nazw osobowych* (item 5); *Słownik etymologiczno-motywacyjny staropolskich nazw osobowych* (ed. A. Cieślikowa); *Antroponimia Polski od XVI do końca XVIII wieku* (ed. A. Cieślikowa, 6 vols, 2007–2016); *Słownik nazwisk mieszkańców Poznania XVI–XVIII wieku* (ed. I. Sarnowska-Giefing, 2 vols, 2011–2014); Rymut, *Nazwiska Polaków* (item 4); and regional monographs. These are candidates to investigate directly (not yet checked).

## Stage 3 — history: dated occurrences with a place

### 12. Polona (already planned — TASK-031 spike)
- **Data sought:** object title, date and place of publication, OCR hit with page number, rights stated separately for metadata, OCR text and scan.
- **Feeds:** `HISTORICAL_OCCURRENCE`, `ARCHIVE_REFERENCE_EXISTS`. D-003.

### 13. *Księga Adresowa Polski* (1926/27, 1928, 1929, 1930) and city address books
- **Data sought:** surname, locality, district, voivodeship, occupation, year, page.
- **Feeds:** `HISTORICAL_OCCURRENCE`, `HISTORICAL_PLACE_ASSOCIATION`. Covers business owners and craftsmen only — occurrences, never a distribution.
- **Links (1929 edition):** [Śląska BC](https://sbc.org.pl/dlibra/publication/1115789/edition/1018507/ksiega-adresowa-polski-wraz-z-w-m-gdanskiem-dla-handlu-przemyslu-rzemiosl-i-rolnictwa-1929) · [BC WBP Lublin](https://bc.wbp.lublin.pl/dlibra/publication/17555/edition/22209/ksiega-adresowa-polski-wraz-z-w-m-gdanskiem-dla-handlu-przemyslu-rzemiosl-i-rolnictwa-1929) · [UMCS](https://www.bc.umcs.pl/dlibra/publication/1598/edition/19465?language=pl) · [WBC](https://www.wbc.poznan.pl/dlibra/publication/6261/edition/11209?language=pl) · [Wikisource transcription](https://pl.wikisource.org/wiki/Polska_Ksi%C4%99ga_Adresowa_1929)

### 14. Austro-Hungarian casualty lists 1914–1919 (*Verlustliste*); Prussian casualty lists (to confirm)
- **Data sought:** surname, home municipality and district, year, list number and page.
- **Feeds:** `HISTORICAL_PLACE_ASSOCIATION`, strongest for Galicia and the Prussian partition.
- **Links:** [lists on ANNO](https://anno.onb.ac.at/cgi-content/anno?aid=vll) · [alphabetical index](https://anno.onb.ac.at/info/vlv_info.html) · [description](https://anno.onb.ac.at/info/vll_info.html)
- **Prussian / German Empire lists:** indexed and searchable by the Verein für Computergenealogie — [DES search](https://des.genealogy.net/eingabe-verlustlisten/search) · [GenWiki description](http://wiki-alt.genealogy.net/Verlustlisten_Erster_Weltkrieg). The original lists are official publications; the index is the association's work and its terms of use are unknown — treat as partnership/legal review, not as an open source.

### 15. *Lista strat Wojska Polskiego. Polegli i zmarli w wojnach 1918–1920* (Wojskowe Biuro Historyczne, 1934)
- **Data sought:** surname and place of origin, if the list gives one — still to be checked in the scan.
- **Links:** [Polona](https://polona.pl/item/lista-strat-wojska-polskiego-polegli-i-zmarli-w-wojnach-1918-1920,ODk3NjM5OTA/) · [JBC](https://jbc.bj.uj.edu.pl/dlibra/publication/263227/edition/251272/lista-strat-wojska-polskiego-polegli-i-zmarli-w-wojnach-1918-1920) · [WBC](https://www.wbc.poznan.pl/dlibra/doccontent?id=56413) · [Internet Archive (with OCR)](https://archive.org/details/jbc.bj.uj.edu.pl.DIGDRUK001281) · [FBC](https://fbc.pionier.net.pl/publication/658f76719434817b1863)
- **Rights:** *(search summary)* public domain. A name index (~47,000 names) exists at [straty.genealodzy.pl](https://straty.genealodzy.pl/) — that is PTG's work, so the partnership rule for PTG applies to the index, not to the 1934 book.

### 16. Newspapers in digital libraries (via FBC and regional libraries)
- **Data sought:** surname hit, newspaper title, issue date, place of publication, page, rights.
- **Caution:** false positives where a surname is also a common word (Kowal, Wróbel). Not searched yet.

### 17. *Słownik historyczno-geograficzny ziem polskich w średniowieczu* (IH PAN, electronic edition)
- **Data sought:** persons recorded at localities ("Jan z Zielina"), dates, source references.
- **Feeds:** earliest attestations of surnames derived from place names.
- **Links:** [slownik.ihpan.edu.pl](https://www.slownik.ihpan.edu.pl/)

### 18. Geneteka (PTG) — partnership only
- **Data sought (for an agreement):** record counts per surname by parish and decade; written forms. Statistics only, no persons.
- **Feeds:** `HISTORICAL_DISTRIBUTION`, `HISTORICAL_FORM_ATTESTED`.

## Stage 4 — historical geography (to place occurrences on a map)

### 19. *Słownik geograficzny Królestwa Polskiego i innych krajów słowiańskich* (1880–1902)
- **Data sought:** place name with German/Russian/Latin variants, commune, parish, district, governorate.
- **Links:** [all volumes on DIR](http://dir.icm.edu.pl/pl/Slownik_geograficzny/)

### 20. *Skorowidz miejscowości Rzeczypospolitej Polskiej* (GUS, 1923–1926, from the 1921 census)
- **Data sought:** name, type of locality, commune, district, voivodeship, population. Religion/nationality columns are not used.
- **Links:** [Polona 1924](https://polona.pl/item/skorowidz-miejscowosci-rzeczypospolitej-polskiej-opracowany-na-podstawie-wynikow,NjcwOTY1OTU/) · [Polona 1925](https://polona.pl/preview/38cae618-13f4-4c97-993e-df4247016852) · [vol. 1, Warszawskie](https://mbc.cyfrowemazowsze.pl/dlibra/publication/17128/edition/14615/content) · [vol. 11, Pomorskie](https://kpbc.ukw.edu.pl/dlibra/publication/11157/edition/29930?language=pl) · [vol. 13, Lwowskie](https://mbc.cyfrowemazowsze.pl/dlibra/publication/17140/edition/14645?language=en)

### 21. *Gemeindelexikon*, vol. 12 Galizien (1907); *Meyers Orts- und Verkehrs-Lexikon* (1912)
- **Data sought:** German and Polish commune names, district, parish, civil registry office. Links directly to item 14.
- **Links:** [FamilySearch Library](https://www.familysearch.org/library/books/records/item/232531-gemeindelexikon-der-im-reichsrate-vertretenen-konigreiche-und-lander-bd-12-galizien-galicia) (probably requires an account) · [Halgal](http://www.halgal.com/gemeindelexikon.html)
- **Meyers:** [MeyersGaz.org](https://www.meyersgaz.org/) — searchable online version with historical maps, gives civil registry office and parish *(search summary)*. It is a third party's transcription and translation of the 1912 book; the book is public domain, the website's work may not be. Use the site to find places; cite the 1912 book.
- **New lead:** [historical dataset of the administrative units of Galicia 1857–1910](https://www.tandfonline.com/doi/full/10.1080/01615440.2023.2252330) (journal article; data availability and licence unknown).

### 22. PRNG (GUGiK); TERYT, GeoNames, Getty TGN, Wikidata (already planned)
- **Data sought:** official name, coordinates, identifiers, alternative names.
- **Links:** [dane.gov.pl dataset 780](https://dane.gov.pl/pl/dataset/780,panstwowy-rejestr-nazw-geograficznych-prng) · [Geoportal](https://www.geoportal.gov.pl/en/data/national-register-of-geographical-names/) · [PRNG browser](https://prng.geoportal.gov.pl/) — national packages in SHP, GML and XLSX *(search summary)*.

### 23. Diocesan directories (*schematyzmy*, 19th–20th c.)
- **Data sought:** which villages belonged to which parish (locality → parish → archival registers).
- **Links:** [Schematyzm Diecezji Śląskiej, ŚBC](https://sbc.org.pl/dlibra/publication/14124/edition/17585/schematyzm-diecezji-slaskiej) · [Schematyzm Diecezji Przemyskiej, KUL](https://dlibra.kul.pl/dlibra/publication/edition/14347?id=14347&dirds=1&tab=1&language=pl) · [MTG digital library](https://mtg-malopolska.org.pl/bibliotekacyfrowa.html) · [Biblioteka Zasobów Kresowych (Vilnius archdiocese)](https://kresy.genealodzy.pl/) · [overview of Silesian directories](https://silesia.edu.pl/index.php/Schematyzmy,_katalogi_duchowie%C5%84stwa_i_parafii)
- **Lead:** a database built from the 1938–1939 directories — [Studia Geohistorica article](https://apcz.umk.pl/AZMDDP/article/view/59561). Data availability and licence unknown.

## Stage 5 — older surname maps (D-004)

### 24. K. Rymut (ed.), *Słownik nazwisk współcześnie w Polsce używanych* (10 vols, 1992–1994; PESEL data from 1990)
- **Data sought:** bearers (total, male, female) by the 49 voivodeships; data date; counting method.
- **Feeds:** an older regional distribution, always shown with its 1990 date — never as current.
- **Links:** [RCIN series](https://rcin.org.pl/ijp/dlibra/publication/15152/) · [vol. 1](https://rcin.org.pl/dlibra/publication/15370/edition/2722/content) · [vol. 5](https://rcin.org.pl/dlibra/publication/15362/edition/2718?language=en) · [description](https://przewodnik.tmjp.pl/snwwpu-slownik-nazwisk-wspolczesnie-w-polsce-uzywanych-red-kazimierz-rymut-1992-1994/) — scans with OCR, no login required *(search summary)*. Rights to confirm.

### 25. K. Rymut, surname data from c. 2002 (CD) (to confirm)
- **Data sought:** geographic level (district?) and data date.
- **Status:** found only on a private third-party website, which is not a source. Original not found online.

### 26. Boundaries of the 49 voivodeships, 1975–1998 (to find)
- **Data sought:** which communes belonged to which voivodeship, so 1990 data can be set honestly beside today's 16.
- **Status:** searched, not found. GUGiK's PRG ([dataset 726](https://dane.gov.pl/pl/dataset/726,panstwowy-rejestr-granic-i-powierzchni-jednostek-podziaow-terytorialnych-kraju/resource/29515)) holds current boundaries only. Next places to look: the 1975 administrative-division regulation and GUS publications from 1975–1998.

## Stage 6 — diaspora

### 27. US Census Bureau — surnames occurring 100 or more times (2000 and 2010 censuses)
- **Data sought:** surname, count, rank. Race/ethnicity columns are not used. US data drops Polish diacritics (Łuczak appears as Luczak); such forms are never merged automatically (`ARCHITECTURE.md` §10 invariant 8).
- **Feeds:** `DIASPORA_OCCURRENCE`.
- **VERIFIED 2026-09-24 (2010 file):** [names.zip](https://www2.census.gov/topics/genealogy/2010surnames/names.zip), SHA-256 `117c41cb4668727b7627b2845b6df3f83eb2a22a1813f42c0ff4bdcab86de135`, contains `Names_2010Census.csv` with 162,254 rows and columns `name, rank, count, prop100k, cum_prop100k, pctwhite, pctblack, pctapi, pctaian, pct2prace, pcthispanic`. The six `pct*` columns are race/ethnicity shares and are never used. Names are upper-case without diacritics. Spot checks: KOWALSKI 18,077 (rank 1,999); NOWAK 18,891 (rank 1,902); LUCZAK 1,394 — which cannot be assigned to Łuczak or Luczak. Census.gov's own terms page was not read.
- **Links:** [2010 surnames](https://census.gov/topics/population/genealogy/data/2010_surnames.html) · [2000 and 2010 files](https://www.census.gov/data/developers/data-sets/surnames.html) · [methodology PDF](https://www2.census.gov/topics/genealogy/2010surnames/surnames.pdf)

## Stage 7 — archive index (premium)

### 28–29. PRADZIAD and Szukaj w Archiwach
- **Data sought:** parish or civil registry office, register type (births, marriages, deaths), years, archive, fonds number, whether scans are online, stable link.
- **Feeds:** `ARCHIVE_COLLECTION_RELEVANT`. All register series for a place are listed, with no suggestion about the religion of surname bearers.
- **Links:** [Szukaj w Archiwach — vital-records search](https://www.szukajwarchiwach.gov.pl/en/wyszukiwanie-akt-metrykalnych) — reported to host PRADZIAD, which describes registers and holds no names *(search summary)*.

## Stage 8 — spelling-variant rules (internal search only)

### 30. Spelling before the 1936 orthography reform
- **Data sought:** spelling changes such as Mayewski → Majewski.
- **Links (starting points only):** [Wikipedia — the 1936 reform](https://pl.wikipedia.org/wiki/Wielka_reforma_ortografii_w_1936_r.) · [Wybrane zagadnienia z historii polskiej ortografii (ZPE, PDF)](https://zpe.gov.pl/pdf/Ptj9dMlx5). A scholarly history of Polish spelling is still needed as the actual source.

### 31. Cyrillic transliteration in Congress Poland registers, 1868–1917
- **Data sought:** letter and ending correspondences (-ский → -ski).
- **Links:** [Akta metrykalne po rosyjsku](https://zofiafederowicz.com/aktametrykalne/pl/) — a reading guide with handwritten-form tables, plus dictionaries of Polish given names and occupations written in Cyrillic *(search summary)* · [Acta Universitatis Lodziensis article (PDF)](https://cejsh.icm.edu.pl/cejsh/element/bwmeta1.element.ojs-doi-10_18778_1731-8025_13_02/c/1500-1162.pdf). Guides are reference material for building rules, not citable evidence.

### 32. Guides to register Latin; studies of female surname forms (-owa, -ówna, -anka)
- **Data sought:** how women's surnames were written and in which period.
- **Links (Latin, reference only):** [przodek.org glossary](https://przodek.org/genealogia/lacina-slownik-terminow-genealogicznych) · [Ornatowski Latin–Polish dictionary](https://ornatowski.com/genealogia/poradniki/slownik-lacinsko-polski/) · [guide to abbreviations and formulas](https://faraciechanow.pl/skroty-formuly-metryki-lacinskie). Female surname forms: not searched yet.

These rules only widen internal search. They can never establish an attested form (`docs/canonical/14` §4.8).

---

## Hosts this work needs

Allowed by the project owner on 2026-09-24 and reachable, except: `slownik.ihpan.edu.pl` (no response); `journals.pan.pl` (automated browser check on every request); `rcin.org.pl` (the same check, intermittently). The browser checks are not circumvented.

Hosts needed: `journals.pan.pl`, `onomastica.ijppan.pl`, `onomastica.ijp.pan.pl`, `nazwiska.ijppan.pl`, `rcin.org.pl`, `polona.pl`, `dir.icm.edu.pl`, `stat.gov.pl`, `census.gov`, `www2.census.gov`, `anno.onb.ac.at`, `dane.gov.pl`, `api.dane.gov.pl`, `slownik.ihpan.edu.pl`, `szukajwarchiwach.gov.pl`, `archive.org`, `pl.wikisource.org`
