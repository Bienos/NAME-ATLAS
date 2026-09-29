# Polish official, archival and public-domain historical data sources for Name Atlas (status 2026-09-29)

Research-environment notes (these describe how facts were obtained, not the sources themselves). In this session dane.gov.pl and api.dane.gov.pl answered HTTP 200, unlike earlier sessions, so dataset metadata and files were read and downloaded directly. Statute texts come from the Sejm ELI API (api.sejm.gov.pl), consolidated texts current on 2026-09-29. szukajwarchiwach.gov.pl returned only an Imperva/Incapsula bot-challenge page to automated requests, and web.archive.org was unreachable (connection reset). SWA terms are therefore quoted from search snippets and sister-archive pages. data.atlasfontium.pl failed TLS verification (certificate chain) and slownik.ihpan.edu.pl failed DNS resolution; neither was bypassed. The session's web-search budget ran out part-way through, so some Q4/Q5 items remain gaps. Labels used: **[observed]** = seen directly by the researcher on 2026-09-29; **[computed]** = calculated by the researcher from downloaded official files; **[snippet]** = search-result text only, page not fetched verbatim; **UNVERIFIED**; **needs counsel**. Nothing here is legal advice.

## 1. PESEL surname time series (dataset 1681 and related), older snapshots, other PESEL-derived name datasets

### Takeaway
All eight annual national "living persons" surname snapshots (2019-06-30 to 2026-01-20, male and female) remain downloadable from dataset 1681. A second Ministry of Digital Affairs dataset not on the project's list (dataset 568) publishes surnames **including deceased persons** from 2017-12-31 onward, including a 2017 voivodeship breakdown with TERYT codes. A year-over-year series is technically possible but needs normalisation. Reference dates, headers and scope drift between files; singletons are suppressed; and change is dominated by newly registered foreigners (e.g., male MELNYK 1,626 → 6,442). The 1990 (Rymut), 2002 (moikrewni.pl) and 2014 (ISNP) extracts are not published as open data.

### Cited Findings

**Dataset 1681, "Nazwiska występujące w rejestrze PESEL" (Ministerstwo Cyfryzacji)**
- Dataset-level licence `license_name: "CC0 1.0"`; all `license_condition_*` fields empty/None; `license_condition_default_cc40: False`; created 2019-08-13; frequency "Rocznie"; verified 2026-01-28 — [API datasets/1681](https://api.dane.gov.pl/1.4/datasets/1681) [observed]
- Scope (verbatim): "Wykaz nazwisk osób żyjących występujących w rejestrze PESEL. Przedmiotowe dane zostały opracowane na podstawie informacji zgromadzonych w rejestrze PESEL według pola nazwisko aktualne. Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu." — [API datasets/1681](https://api.dane.gov.pl/1.4/datasets/1681)
- 21 resources:
  - national male/female files for 2019-06-30 (xlsx; the female file also as csv), 2020-01-22, 2021-02-01 (male) / 2021-02-02 (female), 2022-01-27, 2023-01-30, 2024-01-19, 2025-01-22 and 2026-01-20;
  - voivodeship-of-permanent-residence files for 2025-02-24 (65049 male, 65090 female) and 2026-01-20 (1148786, 1148790).
  - Source: [API datasets/1681/resources](https://api.dane.gov.pl/1.4/datasets/1681/resources?page=1&per_page=100) [observed]
- Older files still download: resources 18990 (2019-06-30), 22817 (2020-01-22), 28052 (2021-02-01) and 65049 (2025-02-24) all returned xlsx content (HTTP 206 range request) — e.g. [18990](https://api.dane.gov.pl/resources/18990,nazwiska-meskie-stan-na-2019-06-30/file), [22817](https://api.dane.gov.pl/resources/22817,nazwiska-meskie-stan-na-2020-01-22/file), [28052](https://api.dane.gov.pl/resources/28052,nazwiska-meskie-stan-na-2021-02-01/file) [observed]
- **Resource-level licence (open project item):** API v1.4 resource objects have **no licence attributes at all**. Their full attribute set includes title, description, data_date, format, file_size, openness_score, has_high_value_data and contains_protected_data, and nothing licence-related. The only machine-readable licence for the voivodeship files 1148786/1148790 is the dataset-level CC0 1.0. Their description reads, e.g., "Wykaz nazwisk męskich osób żyjących (wg pola nazwisko aktualne) występujących w rejestrze PESEL (bez zgonów) w podziale na województwa, stan na 20.01.2026" — [API datasets/1681/resources](https://api.dane.gov.pl/1.4/datasets/1681/resources?page=1&per_page=100) [observed]

**Dataset 568 (new to the project), "Nazwiska występujące w rejestrze PESEL z uwzględnieniem nazwisk osób zmarłych"**
- CC0 1.0; created 2018-02-12; annual; Ministerstwo Cyfryzacji. Note (verbatim): "…według pola nazwisko aktualne. W zestawieniu uwzględnione zostały nazwiska osób zmarłych. Pojedyncze wystąpienia nie zostały umieszczone na liście." — [API datasets/568](https://api.dane.gov.pl/1.4/datasets/568); [portal page](https://dane.gov.pl/pl/dataset/568,nazwiska-wystepujace-w-rejestrze-pesel)
- 25 resources:
  - 2017-12-31: national male/female **and voivodeship male/female** files (xlsx + csv);
  - national files for 2019-04-15, 2020-01-22, 2021-02-01, 2022-01-27, 2023-01-30, 2024-01-19 and 2025-01-22;
  - 2026-01-20: **female only** (1148815). No 2026 male incl.-deceased resource is listed.
  - Source: [API datasets/568/resources](https://api.dane.gov.pl/1.4/datasets/568/resources?page=1&per_page=100) [observed]
- The 2017-12-31 voivodeship CSV header is `Województwo,TERYT,Nazwisko,Liczba wystąpień`; its first row is `DOLNOŚLĄSKIE,02,NOWAK,5983` — [resource 8162](https://api.dane.gov.pl/resources/8162,nazwiska-meskie-wg-wojewodztw-stan-na-2017-12-31/file) [observed]

**Male file statistics.** Only surnames with ≥2 bearers are listed, so sums are lower bounds. [computed]

| Snapshot | Scope | Distinct surnames | Sum of counts | NOWAK | KOWALSKI | MELNYK | Distinct "-ENKO" surnames |
|---|---|---|---|---|---|---|---|
| 2019-06-30 | living | 277,108 | 19,859,783 | 101,473 | 68,692 | 1,626 | 3,385 |
| 2020-01-22 | living | 283,221 | 19,879,045 | 101,036 | 68,406 | 1,923 | 3,807 |
| 2021-02-01 | living | 298,692 | 19,987,207 | 100,617 | 68,061 | 2,485 | 4,343 |
| 2022-01-27 | living | 322,232 | 20,203,548 | 100,154 | 67,732 | 3,372 | 5,057 |
| 2023-01-30 | living | 363,360 | 20,808,071 | 99,803 | 67,505 | 5,198 | 6,819 |
| 2024-01-19 | living | 379,712 | 20,976,785 | 99,310 | 67,218 | 5,632 | 7,065 |
| 2025-01-22 | living | 395,127 | 21,096,170 | 98,859 | 66,891 | 6,001 | 7,240 |
| 2026-01-20 | living | 408,182 | 21,197,537 | 98,387 | 66,589 | 6,442 | 7,421 |
| 2017-12-31 | incl. deceased | 185,363 | 17,780,382 | 92,867 | 63,635 | 150 | 868 |
| 2019-04-15 | incl. deceased | 270,006 | 26,078,024 | 142,280 | 91,747 | 1,005 | 2,618 |
| 2020-01-22 | incl. deceased | 300,324 | 26,607,490 | 143,437 | 92,540 | 1,960 | 3,898 |
| 2025-01-22 | incl. deceased | 414,949 | 29,045,826 | 147,672 | 95,511 | 6,068 | 7,361 |

- Table source: the official files were downloaded from `https://api.dane.gov.pl/resources/{id}/file`.
  - Dataset 1681: [18990](https://api.dane.gov.pl/resources/18990,nazwiska-meskie-stan-na-2019-06-30/file), [22817](https://api.dane.gov.pl/resources/22817,nazwiska-meskie-stan-na-2020-01-22/file), [28052](https://api.dane.gov.pl/resources/28052,nazwiska-meskie-stan-na-2021-02-01/file), [36401](https://api.dane.gov.pl/resources/36401,nazwiska-meskie-stan-na-2022-01-27/file), [44647](https://api.dane.gov.pl/resources/44647,nazwiska-meskie-stan-na-2023-01-30/file), [54097](https://api.dane.gov.pl/resources/54097,nazwiska-meskie-stan-na-2024-01-19/file), [63892](https://api.dane.gov.pl/resources/63892,nazwiska-meskie-stan-na-2025-01-22/file), [1148808](https://api.dane.gov.pl/resources/1148808,nazwiska-meskie-stan-na-2026-01-20/file).
  - Dataset 568: [8129](https://api.dane.gov.pl/resources/8129,nazwiska-meskie-w-polsce-stan-na-2017-12-31/file), [17219](https://api.dane.gov.pl/resources/17219,nazwiska-meskie-w-polsce-stan-na-2019-04-15/file), [22811](https://api.dane.gov.pl/resources/22811,nazwiska-meskie-stan-na-2020-01-22/file), [63886](https://api.dane.gov.pl/resources/63886,nazwiska-meskie-stan-na-2025-01-22/file).
- Schema drift across files [observed]:
  - Headers: `nazwisko, liczba` (2019-06-30); `Nazwisko aktualne, Liczba` (2020 onward); `Nawisko aktualne, Liczba` [sic] (2025-01-22 incl.-deceased); `Nazwisko, Liczba wystąpień` (2017 and 2019-04-15 incl.-deceased).
  - Older CSVs use a space as the thousands separator (e.g., `NOWAK,92 867`).
  - The 2026 voivodeship file has columns `Województwo zameldowania na pobyt stały, Nazwisko aktualne, Liczba` and 646,052 data rows, with no TERYT column.
  - The minimum count is 2 in every file checked.
  - Sources: [8158 CSV](https://api.dane.gov.pl/resources/8158,nazwiska-meskie-w-polsce-stan-na-2017-12-31/file), [1148786](https://api.dane.gov.pl/resources/1148786,nazwiska-meskie-wg-wojewodztwa-zameldowania-na-pobyt-stay-stan-na-2026-01-20/file)
- The PESEL register covers "cudzoziemców zamieszkujących na terytorium Rzeczypospolitej Polskiej" (Art. 7 ust. 1 pkt 3 of the Population Records Act) — [Ustawa o ewidencji ludności, t.j. Dz.U. 2026 poz. 384](https://api.sejm.gov.pl/eli/acts/DU/2026/384/text.pdf)

**Older snapshots**
- **Rymut, 1990 data.** "Słownik nazwisk współcześnie w Polsce używanych" (ed. Kazimierz Rymut) was compiled from "a 1990 database maintained by a Polish government agency" covering about 94% of the population. It gives totals per surname and a breakdown by the 49 pre-1999 provinces. Dom Polonii in Pułtusk put it online as a searchable database at herby.com.pl/indexslo.html (JRI-Poland post dated 2002-08-31) — [JRI-Poland](https://jri-poland.org/blog/slownik-nazwisk-online/)
  - Snippet-only figures: 10 volumes (1992–1994, IJP PAN); 401,698 surnames selected from 811,720 units (end-1990 PESEL state); frequencies for 405,670 surnames with users in 49 voivodeships — [Onomastica](https://onomastica.ijp.pan.pl/index.php/ONOM/article/view/51); [UWM](https://czasopisma.uwm.edu.pl/index.php/apr/article/download/3770/2968/5691) [snippet]
  - On 2026-09-29 http://www.herby.com.pl/indexslo.html returned a 1,174-byte page whose only text is "Serwis heraldyczny Ośrodka Dokumentacji Wychodźstwa Polskiego w Pułtusku". The searchable dictionary was not observed there — [herby.com.pl](http://www.herby.com.pl/indexslo.html) [observed]
- **moikrewni.pl, 2002 data.** On 2026-09-29 https://www.moikrewni.pl/ returned HTTP 302 to https://www.myheritage.pl/ — [moikrewni.pl](https://www.moikrewni.pl/) [observed]
- **ISNP, 2014 data** (IJP PAN, nazwiska.ijp.pan.pl). Frequencies are from PESEL 2014, covering about 30k of the most frequent surnames, with the top 16 powiats and 16 gminas per surname. Recorded in this project's earlier notes (moat_strategy_demand.md), citing [Górny 2024, Onomastica LXVIII](https://onomastica.ijppan.pl/index.php/ONOM/article/view/533/730)
- **Database sui generis term** (Art. 10 ust. 1–3 of the Database Protection Act):
  - protection lasts "przez okres piętnastu lat następujących po roku, w którym baza danych została sporządzona";
  - if the database was made public within that period, protection ends 15 years after the year of first public availability;
  - a substantial change counts as a new term.
  - Source: [Ustawa o ochronie baz danych, t.j. Dz.U. 2024 poz. 1769](https://api.sejm.gov.pl/eli/acts/DU/2024/1769/text.pdf)

**Other PESEL-derived name datasets on dane.gov.pl** (all Ministerstwo Cyfryzacji, CC0 1.0) [observed]
- **1667** "Lista imion występujących w rejestrze PESEL": living persons; first and second names; 34 resources, 2019-07-18 to 2026-01-20 — [API datasets/1667](https://api.dane.gov.pl/1.4/datasets/1667)
- **1501** "Lista imion … z uwzględnieniem imion osób zmarłych": 34 resources, 2018-12-31 to 2026-01-20 — [API datasets/1501](https://api.dane.gov.pl/1.4/datasets/1501)
- **219** "Imiona nadawane dzieciom w Polsce": 84 resources. Contents:
  - yearly national and "wg województw" files by sex, for first and second names;
  - half-year releases (latest: first half of 2026, dated 2026-07-27);
  - "Imiona nadane dzieciom w Polsce w latach 2000-2019";
  - **first names "wg USC"** (by civil-registry office) for 2024 (resource 63936) and 2025 (resource 1187350).
  - Note (verbatim): "Do roku 2012 imiona z liczbą wystąpień poniżej 5 nie były umieszczane na liście, od 2013 r. granicą tą jest liczba 2."
  - Sources: [API datasets/219](https://api.dane.gov.pl/1.4/datasets/219); [resources](https://api.dane.gov.pl/1.4/datasets/219/resources?page=1&per_page=100)
- **1082** "Liczba osób zameldowanych na pobyt stały": per gmina, living persons; 12 resources, 2017-12-31 to 2026-01-07 — [API datasets/1082](https://api.dane.gov.pl/1.4/datasets/1082)
- **1953** (related, from the Civil Status Register rather than PESEL): deaths since 2015-09-01 by voivodeship, sex and age bands, weekly/monthly; latest resource 2026-09-09 — [API datasets/1953](https://api.dane.gov.pl/1.4/datasets/1953)
- **Competitor reuse.** The third-party site polskienazwiska.pl says its statistics come from PESEL data on dane.gov.pl and that its latest data are from early 2026 — [polskienazwiska.pl](https://polskienazwiska.pl/) [snippet]

### Inferences
- **Series available now.** A national YoY series of **living, current** surnames can be built from 8 annual snapshots per sex (2019–2026). A voivodeship series has only 2 comparable living points (2025-02-24, 2026-01-20), plus one 2017 incl.-deceased point with a different scope. All of this is CC0, so competitors can have it too (polskienazwiska.pl already republishes it). The edge is in normalisation, provenance and honest interpretation, not exclusivity.
- **Scope inconsistency (treat as not comparable).** The 2017-12-31 incl.-deceased file cannot be a superset of the living population. Its NOWAK count (92,867) and its summed count (17.8M) are both below the 2019 living figures (101,473 and 19.9M). The 2019-04-15 incl.-deceased file lists fewer distinct surnames (270,006) than the living file 2.5 months later (277,108). Scope therefore differs between releases. Treat the 2017 and 2019-04-15 incl.-deceased files as not comparable until the Ministry explains them; this is worth a formal question.
- **What drives YoY change.** Growth in distinct surnames (+131k from 2019 to 2026) and in forms such as MELNYK or "-ENKO" tracks foreigners entering PESEL (Art. 7 ust. 1 pkt 3). The files have no citizenship field. Any "growing/declining surname" claim must say that causes are unknown ("INSUFFICIENT_DATA"), or it will mislead.
- **Birth surnames are not covered.** "Nazwisko aktualne" means married women mostly appear under their current (often husband's) surname.
- **Deceased-only counts.** These could be approximated by subtracting the living file from the same-date incl.-deceased file. For 2020-01-22 males: 26.61M − 19.88M ≈ 6.73M listed deceased occurrences. Singleton suppression makes per-surname subtraction unreliable for rare names.
- **Older extracts.**
  - The 1990, 2002 and 2014 extracts appear to have gone to specific research users (IJP PAN) and were never published as open data.
  - Counts printed in the 1990 dictionary are facts. Any sui generis right in a database first published 1992–94 would, on the Art. 10 wording, have lapsed about 2009. This needs counsel, including on selection/arrangement copyright in the dictionary itself.
  - ISNP (published online 2014–2021) may still be inside a 15-year database term. The clean route to either is a licence from IJP PAN.

### Gaps
- No Ministry explanation was found for the scope differences in the 2017-12-31 and 2019-04-15 incl.-deceased files, or for the missing 2026 male incl.-deceased file.
- moikrewni.pl's 2002 data provenance, and whether any maps survive at deeper URLs, were not verified; the root now redirects to MyHeritage.
- dane.gov.pl's own terms (regulamin) on whether dataset licences bind every resource were not fetched.
- It is unknown whether PESEL keeps enough history for the Ministry to regenerate past states (e.g., "stan na 2014").
- Female-file statistics were not computed.

## 2. Legal routes to finer, new aggregates (powiat/gmina, age band, birth surname, deceased persons)

### Takeaway
A specific statutory bridge exists.
- The Population Records Act, Art. 46 ust. 2 pkt 2 and ust. 3, lets PESEL data be provided to "jednostkom organizacyjnym" for research, statistical and public-opinion purposes, with re-use "na wniosek" under the 2021 Open Data Act.
- The Open Data Act answers within 14 days (at most 2 months) and is free by default. It allows cost-based fees, including anonymisation costs. It does not oblige the Ministry to create new information when that needs disproportionate work.
- The Access to Public Information Act is weaker for bespoke tables: "informacja przetworzona" is available only where "szczególnie istotne dla interesu publicznego".

Precedents exist for finer name statistics: the Ministry publishes voivodeship surname files, incl.-deceased surname files and first names by USC, and gmina offices have given journalists top-surname counts. No published Ministry answer on powiat/gmina, age-band or birth-surname tables was found.

### Cited Findings
- **Population Records Act, Art. 46 ust. 2 pkt 2** (verbatim): data "mogą być udostępnione: … 2) jednostkom organizacyjnym, w celach badawczych, statystycznych, badania opinii publicznej, jeżeli po wykorzystaniu dane te zostaną poddane takiej modyfikacji, która nie pozwoli ustalić tożsamości osób, których dane dotyczą" — [t.j. Dz.U. 2026 poz. 384](https://api.sejm.gov.pl/eli/acts/DU/2026/384/text.pdf)
- **Art. 46 ust. 3** (verbatim): "Udostępnienie danych, o których mowa w ust. 1, w celu ich ponownego wykorzystywania przez podmioty, o których mowa w ust. 2 pkt 2, następuje na wniosek, na zasadach określonych w ustawie z dnia 11 sierpnia 2021 r. o otwartych danych i ponownym wykorzystywaniu informacji sektora publicznego (Dz. U. z 2023 r. poz. 1524), jeżeli przepisy ustawy nie stanowią inaczej." — [same](https://api.sejm.gov.pl/eli/acts/DU/2026/384/text.pdf)
- **Art. 47** — [same](https://api.sejm.gov.pl/eli/acts/DU/2026/384/text.pdf):
  - ust. 4 defines "dane jednostkowe" as information "dotyczące jednej osoby lub imion i nazwisk wszystkich osób zameldowanych pod jednym adresem". Aggregates are therefore a different category.
  - ust. 1a: a request in the same matter "może zostać złożony wyłącznie do jednego organu dowolnej gminy".
- **Art. 8:** PESEL and the residents registers hold "1) nazwisko i imię (imiona); 2) nazwisko rodowe; 3) imiona i nazwiska rodowe rodziców; …". Birth surnames and parents' birth surnames therefore exist in the register — [same](https://api.sejm.gov.pl/eli/acts/DU/2026/384/text.pdf)
- **Fees.** The Act delegates a regulation setting the "sposób obliczania wysokości oraz sposób i terminy uiszczania opłaty za udostępnianie danych podmiotom, o których mowa w art. 46 ust. 2 pkt 2", with fees "zróżnicowana w zależności od sposobu i zakresu udostępniania danych" — [same](https://api.sejm.gov.pl/eli/acts/DU/2026/384/text.pdf). The regulation's amounts were not retrieved.
- **Snippet on who decides:**
  - For research/statistical/public-opinion (and "market research") purposes, the minister competent for informatisation provides PESEL data.
  - Since 2019-07-01, gmina authorities handle requests for individual data; the fee for individual data is 31 zł.
  - Sources: [MSWiA archive](https://archiwum.mswia.gov.pl/pl/sprawy-obywatelskie/udostepnianie/12993,Udostepnianie-danych-z-rejestru-PESEL.html); [BIP Gliwice](https://bip.gliwice.eu/udostepnienie-danych-z-rejestru-mieszkancow-oraz-rejestru-pesel) [snippet]. The current statutory text quoted above does **not** contain "badania rynku".
- **Open Data Act** (t.j. Dz.U. 2023 poz. 1524) — [text](https://api.sejm.gov.pl/eli/acts/DU/2023/1524/text.html):
  - Art. 5: everyone may re-use PSI, including information "przekazanych na wniosek o ponowne wykorzystywanie".
  - Art. 6 ust. 2: the right is limited by "tajemnicę przedsiębiorstwa lub prywatność osoby fizycznej, w tym ochronę danych osobowych".
  - Art. 10 ust. 4 (verbatim): "Podmiot zobowiązany nie ma obowiązku tworzenia informacji sektora publicznego, ich przetwarzania w sposób lub w formie wskazanych we wniosku o ponowne wykorzystywanie oraz sporządzania z nich wyciągów, jeżeli spowoduje to konieczność podjęcia nieproporcjonalnych działań przekraczających proste czynności."
  - Art. 15 ust. 1: conditions may cover source attribution, notice of processing, liability, and PSI "stanowiących lub zawierających dane osobowe".
  - Art. 17: re-use is free except where the Act says otherwise.
  - Art. 18: a fee is allowed where the requested form needs extra costs. "Koszty … mogą obejmować koszty czynności związanych z anonimizacją", and the fee may not exceed the direct costs.
  - Art. 40: a request is handled "niezwłocznie, nie później jednak niż w terminie 14 dni", extendable to "nie dłuższym jednak niż 2 miesiące".
- **Access to Public Information Act** (t.j. Dz.U. 2022 poz. 902) — [text](https://api.sejm.gov.pl/eli/acts/DU/2022/902/text.html):
  - Art. 2 ust. 2: the requester need not show a legal or factual interest.
  - Art. 3 ust. 1 pkt 1: the right covers "uzyskania informacji przetworzonej w takim zakresie, w jakim jest to szczególnie istotne dla interesu publicznego".
  - Art. 5 ust. 2: the right is limited by "prywatność osoby fizycznej lub tajemnicę przedsiębiorcy".
  - Art. 13: 14 days, at most 2 months.
  - Art. 15 ust. 1: a fee equal to the additional costs of the requested form or conversion.
- **Precedent, gmina level (journalists):** Beskidzka24 (2025-05-29) "Poprosiliśmy o dane z urzędów miast i gmin" in powiat cieszyński and got counts for the most frequent surnames. Skoczów could not provide them because its IT system could not generate such data — [Beskidzka24](https://beskidzka24.pl/jakie-sa-najpopularniejsze-nazwiska-w-powiecie-cieszynskim/)
- **Precedents, Ministry publications:**
  - voivodeship surname tables: 2017 incl. deceased with TERYT; 2025 and 2026 living;
  - the incl.-deceased national surname series;
  - first names by USC (2024, 2025).
  - Sources: [API 568](https://api.dane.gov.pl/1.4/datasets/568/resources?page=1&per_page=100); [API 1681](https://api.dane.gov.pl/1.4/datasets/1681/resources?page=1&per_page=100); [API 219](https://api.dane.gov.pl/1.4/datasets/219/resources?page=1&per_page=100) [observed]
- **Age-band precedent (not surnames):** monthly deaths by sex and age band, by voivodeship — [API 1953](https://api.dane.gov.pl/1.4/datasets/1953) [observed]
- **Deceased persons and GDPR:** GDPR "does not apply to the personal data of deceased persons" (Recital 27) — [GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj) [standard text; not re-fetched this session]

### Inferences
- **Most promising route.** File an Open Data Act re-use request with the Minister of Digital Affairs (Art. 5 pkt 2, Art. 40) for anonymised aggregate tables with a stated minimum cell size, and cite Art. 46 ust. 2 pkt 2 and ust. 3. Candidate tables:
  - powiat/gmina × current surname;
  - national/voivodeship × birth surname (Art. 8 pkt 2);
  - voivodeship × surname including deceased;
  - birth-decade bands.
  - Whether a commercial company qualifies as a "jednostka organizacyjna" acting "w celach badawczych, statystycznych" **needs counsel**.
- **Refusal risks.** The Ministry may refuse bespoke cross-tabulations under Art. 10 ust. 4 (disproportionate effort) or Art. 6 ust. 2 (privacy): small cells such as rare surname × gmina × age band re-identify people. Offering the Ministry's own suppression rule (≥2, or higher) and paying Art. 18 anonymisation costs should improve the odds. The statutory timeline is 14 days, at most 2 months.
- **Best "new aggregate" candidate.** A powiat-level surname table is incremental to existing releases (voivodeship surnames; first names by USC). But the Ministry routinely publishes name statistics on dane.gov.pl, and Art. 10 ust. 1 says obligated bodies provide PSI "jako otwarte dane" where possible. Any table released on request may therefore become public, so exclusivity would be short-lived. The durable moat is speed, processing and provenance.
- **Gmina route.** Gminas keep residents registers holding the same Art. 8 data for people registered there, and some have already given journalists counts. Systematic nationwide requests would be slow and uneven (see Skoczów), and every output would need privacy review.
- **Deceased persons.** GDPR does not cover them, but Polish personal-rights protection for relatives and the Ministry's own disclosure policy remain relevant (**needs counsel**).

### Gaps
- No published request or answer was found on watchdog/FOI sites (siecobywatelska.pl, BIPs) about gmina/powiat, age-band, birth-surname or deceased-only surname tables. The search budget ran out before these sites could be searched thoroughly.
- The Population Records Act fee regulation (amounts for Art. 46 ust. 2 pkt 2 recipients) was not retrieved.
- No Ministry of Digital Affairs statement on bespoke surname aggregates was found.

## 3. Szukaj w Archiwach / Polish State Archives: scale, re-use terms, access methods, crowdsourcing, HTR; lawful parish-by-decade surname counts

### Takeaway
- **Scale.** SWA presents 81M+ digital copies and 16M+ descriptions from 118 units. A 2025–2029 EU-funded project will add 7.1M copies and build an API.
- **Terms.** SWA has a dedicated "Ponowne wykorzystanie" page. Its snippet-level wording allows copies to be used in any manner unless the item says otherwise. ANK states that materials may be used "nieodpłatnie, bez ograniczeń celu i sposobu", with a source line.
- **Law.** The Open Data Act covers state-archive holdings. It excludes only items whose third-party copyright is still running (Art. 6 ust. 4 pkt 5). It lets archives restrict commercial use only for narrow categories (Art. 15 ust. 2).
- **HTR.** Handwritten text recognition for 17th–19th-century Polish metrical records now exists: Transkribus "Polski Wieszcz", built with Polish State Archives support, CER 7.37%.
- **Verdict.** Surname counts per parish per decade from 19th-century scans look lawful on copyright and data-protection grounds. Bulk harvesting is technically blocked (Imperva) and needs an NDAP agreement or the future API.

### Cited Findings
- **Scale:** "118 jednostek organizacyjnych", "ponad 81 milionów kopii cyfrowych", "ponad 16 milionów opisów materiałów archiwalnych" — [AAN, 2026-04-08](https://aan.gov.pl/wp/2026/04/08/aan-beneficjentem-funduszy-europejskich-na-rozwoj-cyfrowy/)
- **Project:** "Rozwój centrum kompetencji w zakresie cyfrowego udostępniania i zabezpieczania zbiorów Archiwów Państwowych w Narodowym Archiwum Cyfrowym – etap I: archiwa centralne i warszawskie" (2025–2029) — [same](https://aan.gov.pl/wp/2026/04/08/aan-beneficjentem-funduszy-europejskich-na-rozwoj-cyfrowy/):
  - budget 87,932,000 zł;
  - "7 100 000 kopii cyfrowych", of which "86% zostanie udostępnionych w Internecie";
  - includes "utworzenia API do komunikacji z innymi serwisami".
- **SWA re-use page** (/ponowne-wykorzystanie). Snippet: copies of archival materials presented in the service "may be used in any manner, including downloading, copying and other distributing using any technology unless otherwise stated in the descriptions of the materials or on the digital copies" — [SWA Ponowne wykorzystanie](https://www.szukajwarchiwach.gov.pl/ponowne-wykorzystanie) [snippet; page behind Imperva; verbatim Polish text not obtained]
- **SWA data origin.** Descriptions come from ZoSIA and the PRADZIAD programme (parish and civil-registration records) — [NAC page on SWA](https://www.nac.gov.pl/en/digital-archive/szukajwarchiwach-pl-search-the-archives/) [snippet]. SWA has a metrical-records search page — [SWA metrical search](https://www.szukajwarchiwach.gov.pl/en/wyszukiwanie-akt-metrykalnych)
- **Bot protection.** Automated requests to szukajwarchiwach.gov.pl received a 212-byte Imperva/Incapsula challenge (`/_Incapsula_Resource`, meta robots "noindex,nofollow") — [SWA](https://www.szukajwarchiwach.gov.pl/) [observed]
- **ANK terms** — [ANK](https://ank.gov.pl/zalatw-sprawe/warunki-publikacji-i-prezentacji/):
  - "Wykorzystywanie materiałów archiwalnych możliwe jest nieodpłatnie, bez ograniczeń celu i sposobu" (subject to statutory limits);
  - required credit line: "Archiwum Narodowe w Krakowie, nazwa zespołu archiwalnego, sygn. …";
  - regulated by Zarządzenie nr 26 of 2023-09-06 (regulamin and price list); cites the 2021 Open Data Act.
- **AAN terms** — [AAN](https://aan.gov.pl/wp/dla-uzytkownikow/ponowne-wykorzystanie/):
  - holdings are available for re-use "bezwarunkowo" (the page still cites the repealed 2016 Act);
  - exceptions: access restrictions, personal data, third-party IP, and Art. 16b of the Archives Act;
  - fees are cost-only, "nie obejmując zysku".
- **Open Data Act Art. 6 ust. 4** limits re-use of PSI — [Open Data Act t.j.](https://api.sejm.gov.pl/eli/acts/DU/2023/1524/text.html):
  - pkt 4: "do których prawa autorskie i prawa pokrewne …, prawa do baz danych … przysługują podmiotom innym niż podmioty zobowiązane";
  - pkt 5: "będących w posiadaniu … archiwów – w odniesieniu do działalności archiwalnej w zakresie państwowego zasobu archiwalnego, w przypadku gdy pierwotnym właścicielem autorskich praw majątkowych lub praw pokrewnych były podmioty inne niż podmioty zobowiązane, a czas trwania tych praw nie wygasł".
- **Art. 15 ust. 2:** museums, libraries "i archiwa" may set conditions restricting use — [same](https://api.sejm.gov.pl/eli/acts/DU/2023/1524/text.html):
  - pkt 1: "w działalności komercyjnej lub na określonych polach eksploatacji, jeżeli dotyczą zbiorów o charakterze martyrologicznym oraz zawierają godło, barwy i hymn Rzeczypospolitej Polskiej, a także herby, reprodukcje orderów, odznaczeń…";
  - pkt 2: in non-commercial activity, where items are "powiązane z obiektami objętymi roszczeniami lub prawami osób trzecich";
  - Art. 16: such conditions must be "obiektywne, proporcjonalne, niedyskryminacyjne".
- **Art. 19:** the above-cost fee provision names only state and local-government museums ("Muzea państwowe i muzea samorządowe … mogą nałożyć opłatę wyższą niż ustalona na podstawie art. 18"). No equivalent for archives was seen in Arts. 17–20 — [same](https://api.sejm.gov.pl/eli/acts/DU/2023/1524/text.html)
- **Retention of civil-status records.** USCs keep birth records for 100 years and marriage/death records for 80 years (Art. 28 ust. 1), counted from the end of the registration year (ust. 2). Older books pass to the state archives — [Prawo o aktach stanu cywilnego, t.j. Dz.U. 2026 poz. 393](https://api.sejm.gov.pl/eli/acts/DU/2026/393/text.pdf)
- **HTR: Transkribus "Polski Wieszcz"** (published 2026-01-07; usable with a free account) — [Transkribus](https://www.transkribus.org/models/polski-wieszcz):
  - "trained on documents from the 17th through 19th centuries", including "metrical records, notarial documents, and personal correspondence";
  - 1,280 pages / 46,504 lines / 298,276 words; CER 7.37%;
  - built by the L'Dor V'Dor Foundation AI Lab (Jan Gronski) with "JRI-Poland, the Polish State Archives, and individual volunteers" contributing documents and transcriptions.
- **HTR: Transkribus "Polski Bizon" super model** (published 2025-02-07) — [Transkribus](https://www.transkribus.org/models/polski-bizon-super-model):
  - handwritten and printed Polish "from medieval manuscripts to modern printed works";
  - 1,248,439 words; CER 4.3%;
  - "Available on Scholar plan and above".
  - A public "Polish General Model" is described in the [Transkribus blog, 2024-05-13](https://blog.transkribus.org/en/ai-models-for-reading-polish-cursive-and-printed-texts).
- **L'Dor V'Dor Foundation.** Its AI reads about 200-year-old handwritten Polish records; Cyrillic, Yiddish and other scripts are under development — [LDVDF](https://ldvdf.org/) [snippet]
- **JRI-Poland** has an indexing agreement with the Polish State Archives (reported 2013) — [JRI-Poland](https://jri-poland.org/blog/results-historic-jewish-record-indexing-agreement-signed-with-polish-state-archives/) [snippet]
- **Copyright Act:**
  - Art. 4 pkt 2 excludes "urzędowe dokumenty, materiały, znaki i symbole" from copyright;
  - Art. 36 sets 70-year terms.
  - Source: [Copyright Act t.j. Dz.U. 2025 poz. 24](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf)
- **Database right.** The 15-year term restarts on substantial change (Art. 10 ust. 3) — [Database Act t.j. Dz.U. 2024 poz. 1769](https://api.sejm.gov.pl/eli/acts/DU/2024/1769/text.pdf)

### Inferences
- **Legal view.** Per-parish, per-decade surname counts from 19th-century metrical/civil registers look defensible:
  - the records are official documents (Art. 4 pkt 2) and are far past any 70-year term;
  - archive terms allow re-use (SWA per snippet; ANK verbatim);
  - the persons recorded are almost all deceased (GDPR Recital 27);
  - the output is aggregate.
- **Counsel should confirm (needs counsel):**
  - the verbatim SWA terms;
  - whether mass extraction from SWA's continuously updated description database triggers the database right; the term may keep restarting under Art. 10 ust. 3, and Art. 6 ust. 4 pkt 4 applies only where third parties hold such rights;
  - any NDAP rule on automated harvesting.
- **Technical access.** Bulk image download against the Imperva protection would conflict with the site's technical controls. The lawful path is the planned API (2025–2029) or a formal data-sharing agreement, as in the JRI-Poland model.
- **Accuracy.**
  - CER of 4–7% is character-level, so surname-token error will be higher (one wrong letter changes the surname).
  - Records mix Latin, Polish, Russian (Congress Poland after the 1860s) and German.
  - Counts need sample validation and a ConfidenceAssessment. "We don't know" should be shown wherever a parish or decade has no transcribed coverage.
- **Overlap.** PTG Geneteka already indexes many of the same books. Name Atlas's distinct value is aggregate surname geography with provenance, not person-level indexes, which are outside MVP scope anyway.

### Gaps
- The verbatim SWA "Ponowne wykorzystanie" and "Regulamin" texts could not be obtained (Imperva; Wayback unreachable).
- No official NDAP HTR/AI transcription programme, crowdsourced indexing module in SWA, or PolEval HTR task on parish records was found (search budget exhausted).
- No SWA OAI-PMH or IIIF endpoint was verified; only the planned API is documented.
- The number of metrical-book scans online (as distinct from all 81M scans) was not found.

## 4. Surname-rich historical printed lists and their copyright status

### Takeaway
Polish statute is favourable.
- Official documents and materials are outside copyright (Art. 4 pkt 2).
- Where economic rights vest by statute in someone other than the creator (e.g., the publisher of a collective work, Art. 11), the 70-year term runs from dissemination (Art. 36 pkt 3). Anonymous works also run from first dissemination (pkt 2).
- Every list asked about (in its pre-1940 volumes) is more than 70 years past dissemination.

Lista strat Wojska Polskiego 1918–1920 is digitised in the Jagiellonian Digital Library (JBC). The Greater Poland Digital Library (WBC Poznań) has a dedicated "Księgi adresowe i listy nazwisk" collection. Where the other named sources are digitised could not be verified this session.

### Cited Findings
- **Art. 4** (verbatim): "Nie stanowią przedmiotu prawa autorskiego: 1) akty normatywne lub ich urzędowe projekty; 2) urzędowe dokumenty, materiały, znaki i symbole; 3) opublikowane opisy patentowe lub ochronne; 4) proste informacje prasowe." — [Copyright Act t.j. Dz.U. 2025 poz. 24](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf)
- **Art. 36** (verbatim): rights expire after seventy years — [same](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf):
  - "1) od śmierci twórcy, a do utworów współautorskich – od śmierci współtwórcy, który przeżył pozostałych;"
  - "2) w odniesieniu do utworu, którego twórca nie jest znany – od daty pierwszego rozpowszechnienia, chyba że pseudonim nie pozostawia wątpliwości co do tożsamości autora lub jeżeli autor ujawnił swoją tożsamość;"
  - "3) w odniesieniu do utworu, do którego autorskie prawa majątkowe przysługują z mocy ustawy innej osobie niż twórca – od daty rozpowszechnienia utworu, a gdy utwór nie został rozpowszechniony – od daty jego ustalenia"
- **Art. 11:** economic rights in a collective work, "w szczególności do encyklopedii lub publikacji periodycznej, przysługują producentowi lub wydawcy, a do poszczególnych części mających samodzielne znaczenie – ich twórcom" — [same](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf)
- **Art. 124 ust. 1 pkt 3** (transitional rule): the 1994 Act also covers works whose rights had expired under the old law but are still protected under the new one, excluding the gap period — [same](https://api.sejm.gov.pl/eli/acts/DU/2025/24/text.pdf)
- **Lista strat.** "Lista strat Wojska Polskiego: polegli i zmarli w wojnach 1918-1920" is a PDF in JBC; no rights statement was visible in the fetched excerpt — [JBC](https://jbc.bj.uj.edu.pl/dlibra/publication/263227/edition/251272?language=pl). A snippet says it lists 47,055 soldiers with surname, first name, rank, unit, cause, date and place of death [snippet; UNVERIFIED]
- **Modern Lista strat indexes.** Name indexes by Łukasz Jastrząb and Wiesław Olszewski are sold commercially — [Wydawnictwo Adam Marszałek](https://sklep.marszalek.com.pl/pl/historia/2461-indeksy-do-listy-strat-wojska-polskiego-polegli-i-zmarli-w-wojnach-1918-1920.html)
- **WBC Poznań** has a collection "Księgi adresowe i listy nazwisk" — [WBC](https://wbc.poznan.pl/dlibra/collectiondescription/185?language=pl) — and a military ("Armée polonaise") section — [WBC](https://www.wbc.poznan.pl/dlibra/text?id=wojsko)
- **Księga adresowa.** "Księga Adresowa Polski (wraz z W.M. Gdańskiem) dla handlu, przemysłu, rzemiosł i rolnictwa" (1929) was published by Towarzystwo Reklamy Międzynarodowej, Warsaw — [ornatowski.com list](https://ornatowski.com/genealogia/literatura-genealogiczna-heraldyczna-wykaz/) [snippet]
- **Database right term:** 15 years (Art. 10) — [Database Act](https://api.sejm.gov.pl/eli/acts/DU/2024/1769/text.pdf)

### Inferences
Each status below **needs counsel**.
- **Official publications** (Monitor Polski, voivodeship official journals, Dziennik Personalny Ministerstwa Spraw Wojskowych, and Lista strat as a Ministry of Military Affairs publication): most likely "urzędowe dokumenty, materiały" under Art. 4 pkt 2, so no copyright at all. In any case they were disseminated more than 70 years ago.
- **Commercial directories** (Księga adresowa Polski 1926–1930 by a company; 1920s–30s telephone directories):
  - names and addresses are facts;
  - any copyright in selection or arrangement has lapsed if the publisher held it under Art. 11 / Art. 36 pkt 3, or if the work is anonymous (pkt 2): by 1996–2000 counting from 1926–1930;
  - residual risk exists only where identifiable individual compilers died after 1955 (Art. 36 pkt 1);
  - no database right can survive: the 15-year sui generis term expired long ago.
- **School reports** (sprawozdania szkolne) are mixed. Name lists are facts. Signed essays by teachers who died after 1955 may still be protected.
- **Tabele likwidacyjne** (1860s Congress Poland) and the **Galician (Franciscan) cadastre** (1810s–1820s) are official records more than 150 years old, so there is no copyright.
- **Modern layers.** Faithful scans of 2D public-domain pages are unlikely to create new rights; the digital libraries' own terms still apply (Polona and FBC are already known to the project). Modern indexes (e.g., Jastrząb/Olszewski) are protected works or databases, so counts must be built from the originals.
- **Product use and bias.** These lists can give dated "historical occurrence" evidence at surname level, e.g., occurrences per town or region in the 1929 directory, or war deaths 1918–20 by region. Each list is socially biased (business owners, telephone subscribers, soldiers); that bias belongs in the ConfidenceAssessment, not in a population estimate.

### Gaps
- Not verified (search budget exhausted): where and under what rights statement these are digitised —
  - 1920s–30s telephone directories;
  - sprawozdania szkolne;
  - Dziennik Personalny MSWojsk;
  - Monitor Polski and voivodeship official journals;
  - tabele likwidacyjne (AGAD/regional archives);
  - the Galician Franciscan cadastre (Archiwum Narodowe w Krakowie; Lviv);
  - Polona/FBC records for the 1926–1930 Księga adresowa volumes.
- Poland's implementation of DSM Directive Art. 14 (no rights in reproductions of public-domain visual works) is UNVERIFIED. The consolidated Copyright Act text was searched for the obvious wording and nothing was found.
- The 47,055 entry count for Lista strat is unverified.

## 5. Gazetteers and historical geography for toponymic surnames

### Takeaway
PRNG (GUGiK) is the strongest lawful gazetteer. Its 2026-09-28 localities export has 124,247 records, and 44,665 of them carry the **adjective form** of the place name (e.g., Abramów → "abramowski"). That is exactly the morphology of -ski/-cki surnames. It also has 2,945 historical names, 8,321 variant names and 1,305 minority-language names.

Licensing differs by page: dane.gov.pl lists PRNG (RP part) as **CC BY 4.0**, while the geoportal page says the data are free "for any use". The official place-name list (WUNMiCz) is CC0 on dane.gov.pl. Licences for Atlas Fontium and the medieval SHG could not be checked from this environment.

### Cited Findings
- **PRNG on dane.gov.pl** — [API datasets/780](https://api.dane.gov.pl/1.4/datasets/780); [resources](https://api.dane.gov.pl/1.4/datasets/780/resources?per_page=50) [observed]:
  - described as "urzędową, referencyjną bazą danych", in two parts: RP names and Polish names of world objects;
  - legal basis: the Regulation of the Minister of Development, Labour and Technology of 29 January 2021;
  - dataset 780 licence "CC BY 4.0", annual;
  - resources: GML, SHP and XLSX zip files on opendata.geoportal.gov.pl, plus WMS, WFS and ATOM services.
- **Geoportal statement.** Data are "available free of charge and for any use"; formats GML, SHP, XLSX; WFS at https://mapy.geoportal.gov.pl/wss/service/PZGiK/PRNG/WFS/GeographicalNames; legal basis Dz.U. 2021 poz. 273 — [Geoportal PRNG](https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-nazw-geograficznych-prng/) [WebFetch summary, not verbatim]
- **Size.** As of 2025-09-30: 255,729 objects (124,269 place names and 131,460 physiographic objects); exports run daily when the register changes — [Geoportal Q3 2025 summary](https://www.geoportal.gov.pl/aktualnosci/panstwowy-rejestr-nazw-geograficznych-podsumowanie-iii-kwartal-2025-r/) [snippet]
- **PRNG_MIEJSCOWOSCI_XLSX** (export "z dnia 2026-09-28") — [PRNG localities XLSX](https://opendata.geoportal.gov.pl/prng/PRNG_MIEJSCOWOSCI_XLSX.zip) [observed/computed]:
  - 39 columns, including nazwa główna, dopełniacz, **przymiotnik**, status nazwy, rodzaj obiektu, parent locality, coordinates, **nazwa historyczna**, **nazwa oboczna**, nazwa dodatkowa (with language and latinisation), endonim, egzonim, województwo/powiat/gmina and the gmina TERYT id;
  - 124,247 rows;
  - filled counts: przymiotnik 44,665; nazwa oboczna 8,321; nazwa historyczna 2,945; nazwa dodatkowa 1,305 (kaszubski 852, niemiecki 387, litewski 30, białoruski 27, łemkowski 9);
  - status: urzędowa 101,334, niestandaryzowana 22,913;
  - examples: Abramów → "abramowski"; Achrymowce → "achrymowiecki"; Aksmanice with historical name "Witoldów".
- **WUNMiCz.** Dataset 188 "Wykaz urzędowych nazw miejscowości i ich części" (MSWiA, **CC0 1.0**) — [API datasets/188](https://api.dane.gov.pl/1.4/datasets/188) [observed]:
  - announced by MSWiA obwieszczenie of 2019-10-17 (Dz.U. poz. 2360), legal state as of 2019-01-01;
  - the 2019–2023 name-change regulations are attached as PDFs.
- **KSNG world names.** Dataset 532 "Urzędowy wykaz polskich nazw geograficznych świata" (**CC BY 4.0**) — [API datasets/532](https://api.dane.gov.pl/1.4/datasets/532):
  - edition 2 (2019) covers 13,599 objects; a 2024 supplement covers buildings and other urban objects;
  - it excludes objects lying entirely in Poland.
  - The PRNG world-names dataset 4834 is CC0 1.0 — [API search](https://api.dane.gov.pl/1.4/datasets?q=PRNG&per_page=12) [observed]
- **Atlas Fontium** — [Atlas Fontium](https://atlasfontium.pl/en/):
  - its repository is data.atlasfontium.pl, where "most files (spatial data, tables, pdf documents) are available for download";
  - 16th-century Crown layers include "Wsie [Atlas historyczny Polski XVI w.]" — [GeoNode layer](https://data.atlasfontium.pl/layers/geonode:wies) — and "Tabela zbiorcza miejscowości" — [document 202](https://data.atlasfontium.pl/documents/202);
  - the per-settlement record holds the 16th-century name with variants, location, parish and district, settlement character, size, property type and central functions — [Atlas Fontium "korona"](http://atlasfontium.pl/index.php?article=korona) [snippet];
  - no licence is stated on the home page, and the GeoNode repository was unreachable (HTTP 503 via WebFetch; certificate-chain error via curl) — **licence UNVERIFIED**.
- **SHG** ("Słownik historyczno-geograficzny ziem polskich w średniowieczu"): an electronic edition is at slownik.ihpan.edu.pl (ed. T. Jurek) — [SHG](http://www.slownik.ihpan.edu.pl/) [snippet]. The site did not resolve (DNS) — **terms UNVERIFIED**.
- **SgKP** ("Słownik geograficzny Królestwa Polskiego", 1880–1902, 15 volumes): PGSA issued it on a DjVu CD-ROM in 2003 — [GenWiki](https://wiki.genealogy.net/S%C5%82ownik_Geograficzny_Kr%C3%B3lestwa_Polskiego) [snippet]. No structured-text edition was verified.

### Inferences
- **PRNG as a bridge.** PRNG's official adjective column gives a lawful, machine-readable bridge from a surname to candidate source places (surname ABRAMOWSKI ↔ adjective "abramowski" ↔ Abramów). This supports a "candidate place" claim, not proof of origin:
  - many -ski surnames match several homonymous places, or come from non-place stems;
  - confidence should fall as the number of matching places rises;
  - PRNG's historical-name coverage is thin (2,945 of 124,247), so it is not a historical gazetteer.
- **PRNG licensing.** Until counsel reconciles the two statements, apply the stricter one: CC BY 4.0 with GUGiK attribution.
- **Historical settlement names.** For 16th-century and medieval names, Atlas Fontium and SHG are the richest sources. Their licences must be confirmed before any paid use.

### Gaps
- Not verified:
  - Atlas Fontium and SHG licences;
  - the online status and terms of IJP PAN "Nazwy miejscowe Polski";
  - a structured SgKP text (DIR ICM, Wikisource);
  - KSNG lists of historical names in former eastern territories.
- The statutory basis for PRNG being free "for any use" (Prawo geodezyjne i kartograficzne) was not fetched.

## 6. Other official statistics relevant to surnames

### Takeaway
No national statistics on administrative surname changes were found; the only figure is local (Dzierżoniów USC: 29 first-name or surname change decisions in 2025). The most useful related official series are the PESEL first-name datasets (including by USC), the per-gmina registered-population counts (usable as denominators) and civil-register deaths by age band.

### Cited Findings
- **Local surname changes.** Dzierżoniów USC issued 30 administrative decisions in 2025, 29 of them on changes of first name or surname — [TV Sudecka](https://www.tvsudecka.pl/artykul/30773,dzierzoniow-w-statystykach-demograficznych-za-2025-r) [snippet]
- **Name-change procedure.** Administrative change of first name or surname costs a 37 zł decision fee. The decision normally takes up to 1 month (2 months in complex cases) and can be appealed to the voivode — [MSWiA archive page](https://archiwum.mswia.gov.pl/pl/sprawy-obywatelskie/rejestracja-stanu-cywi/12973,Administracyjna-zmiana-imienia-lub-nazwiska.html) [snippet]
- **No dataset.** A dane.gov.pl API search for "zmiana nazwiska" returned no surname-change dataset among its top results — [API search](https://api.dane.gov.pl/1.4/datasets?q=zmiana%20nazwiska&per_page=12) [observed]
- **Gdańsk.** Dataset 1811 "Częstość imion nadawanych w Gdańsku" (city of Gdańsk, CC BY 4.0) — [API search](https://api.dane.gov.pl/1.4/datasets?q=imiona&per_page=30) [observed]
- **Related series.** Datasets 219, 1667, 1501, 1082 and 1953 are described in Q1 — [API datasets/219](https://api.dane.gov.pl/1.4/datasets/219); [API datasets/1082](https://api.dane.gov.pl/1.4/datasets/1082); [API datasets/1953](https://api.dane.gov.pl/1.4/datasets/1953)

### Inferences
- National counts of surname changes, including the share of spouses keeping their surname, would have to be requested from the Ministry of Digital Affairs (Civil Status Register) under the Open Data Act; no precedent was found.
- Dataset 1082 (permanent registrations per gmina) is the natural denominator for per-capita surname density:
  - it can be summed to voivodeships now;
  - it would serve gmina or powiat level if those surname counts are ever obtained;
  - caveat: permanent registration (zameldowanie) is not the same as actual residence.

### Gaps
- The national annual number of administrative surname changes, and any GUS publication on surnames or names, were not found.
