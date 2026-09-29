# Diaspora and cross-border datasets for Polish surnames (outside Poland): status as of 2026-09-29

Conventions for these notes. All pages were accessed on 2026-09-29 unless a date is stated. **UNVERIFIED** means one of three things: the item was seen only in a search-engine summary or snippet; it comes from a secondary source; or the primary page could not be opened (HTTP 403, an anti-bot challenge, or a connection reset from the research environment). **Researcher check** means the researcher downloaded or queried the public file or API directly and reports what it returned. This is not legal advice. The Inferences apply the product rules from the brief: aggregate outputs only, no inference of ethnicity or religion, and commercial rights must be known before data reaches a paid surface.

---

## 1. United States: Census surname files (1990–2020), other aggregate US sources, and why the SSDI/Death Master File does not fit

### Takeaway
The Census Bureau released a **2020 Census last-name table on 14 April 2026**. It covers 156,621 surnames with at least 100 bearers, at national level only. Counts are noise-infused, and each name also has counts for six race/Hispanic-origin groups. The 2000 file (151,671 names) and the 2010 file (162,253 names, listed as CC0 on data.gov) give two earlier national snapshots, so the Census data can answer "how many bearers in the US" for three censuses. For example, the 2020 file shows NOWAK with 18,297 bearers and KOWALSKI with 16,721. The SSDI/DMF does not fit the product. It is a person-level file that includes SSNs and has no birthplace field. It is sold through NTIS, and records for the most recent three years sit behind a certification gate.

### Cited Findings
**2020 Census last names (new in 2026)**
- Released 14 April 2026. The files tabulate "all first names and last names occurring 100 or more times in the 2020 Census returns". The complete dataset has 156,621 last names, and there is a top-1,000 subset. A separate research file keeps the negative values produced by disclosure avoidance. The page states that the data "do not in any way identify any specific individuals". [Census: 2020 names page](https://www.census.gov/topics/population/genealogy/data/2020_names.html)
- Download files: `Names2020_LastNames_RaceHispanic_Top1000.xlsx`, `Names2020_LastNames_RaceHispanic.xlsx` and `Names2020_LastNames_RaceHispanic_WithNegatives.xlsx`, all under www2.census.gov/topics/genealogy/2020surnames/. [Census: 2020 names page](https://www.census.gov/topics/population/genealogy/data/2020_names.html)
- The press release describes tables of last names by race and Hispanic origin, plus a comparative summary table covering the 1790, 1990, 2000, 2010 and 2020 censuses. It says the files "contain only the frequency of first names or last names and do not include information about specific individuals or first and last name combinations". [Census press release, 2026](https://www.census.gov/newsroom/press-releases/2026/2020-census-names-data.html)
- Researcher check of the complete file gave these column headers: `LAST NAME`, `RANK`, `FREQUENCY (COUNT)`, `PROPORTION PER 100,000 POPULATION`, `CUMULATIVE PROPORTION`, then six **count** columns: `NON-HISPANIC OR LATINO WHITE ALONE`, `…BLACK OR AFRICAN AMERICAN ALONE`, `…AMERICAN INDIAN AND ALASKA NATIVE ALONE`, `…ASIAN AND NATIVE HAWAIIAN AND OTHER PACIFIC ISLANDER ALONE`, `…TWO OR MORE RACES`, `HISPANIC OR LATINO ORIGIN`. The sheet has 156,625 rows including the title and header rows. [Names2020_LastNames_RaceHispanic.xlsx](https://www2.census.gov/topics/genealogy/2020surnames/Names2020_LastNames_RaceHispanic.xlsx)
- Researcher check, count and national rank for common Polish surnames in the 2020 file: NOWAK 18,297 (rank 1,929); KOWALSKI 16,721 (2,102); KAMINSKI 13,215 (2,667); WISNIEWSKI 11,873 (2,964); LEWANDOWSKI 11,068 (3,182); ZIELINSKI 10,252 (3,408); SZYMANSKI 8,226 (4,169); WOZNIAK 8,177 (4,195); WOJCIK 7,327 (4,696); KOWALCZYK 5,356 (6,132). [Names2020_LastNames_RaceHispanic.xlsx](https://www2.census.gov/topics/genealogy/2020surnames/Names2020_LastNames_RaceHispanic.xlsx)
- Methodology:
  - "the 2020 last names data were limited to names also found in the 2010 Census Names Table that had a frequency of at least 100 in both years".
  - Noise was infused into the race and Hispanic-origin counts, and totals and proportions were calculated from those noisy counts. The noise has "at least a 95 percent probability of falling between ± 2".
  - Some names end up with totals below 100.
  - An optimization step removed negative counts, but the noisy data with negatives is available for research.
  - Disclosure Review Board approval number: CBDRB-FY26-058.

  [C2020BR-14 brief, April 2026](https://www2.census.gov/library/publications/decennial/2020/c2020br-14.pdf)
- Name editing: "removal of all punctuation marks, numbers, and spaces; deletion of suffixes such as JR, SR, III". "Any symbols other than the standard 26 English letters are omitted in the names tables" (for example, PEÑA became PENA). [C2020BR-14](https://www2.census.gov/library/publications/decennial/2020/c2020br-14.pdf)
- Coverage: about 7.8 million distinct last names remained after editing. Over 7 million of them (98%) were reported fewer than 100 times. Last names were recorded for 299 million people, 90.2% of the enumerated population. [C2020BR-14](https://www2.census.gov/library/publications/decennial/2020/c2020br-14.pdf)
- Stated limits: the tables "are not suitable for producing aggregate statistics such as the total U.S. population of a given race or Hispanic origin group", and "Names data are subject to error arising from nonresponse". [C2020BR-14](https://www2.census.gov/library/publications/decennial/2020/c2020br-14.pdf)

**2010 and 2000 Census surname files**
- 2010: 162,253 surnames occurring 100 or more times, with rank, frequency and Hispanic-origin/race percentages. Sources: [Census 2010 surnames page (as search-indexed)](https://census.gov/topics/population/genealogy/data/2010_surnames.html); archived copy at [DataLumos project 100668](https://www.datalumos.org/datalumos/project/100668/view). The figures come from the search-indexed page; the www.census.gov URL returned HTTP 404 to our fetch. The Census "Names data" landing page, as fetched, lists only the 2020 and 1990 products. [Census names data page](https://www.census.gov/topics/population/genealogy/data.html)
- The data.gov record for the 2010 file:
  - Licence: `http://creativecommons.org/publicdomain/zero/1.0/` (CC0).
  - Race and origin percentages are "suppressed where necessary for confidentiality".
  - API endpoint: `api.census.gov/data/2010/surname`.
  - Last modified 15 December 2016.

  [catalog.data.gov: 2010 surnames](https://catalog.data.gov/dataset/2010-decennial-census-of-population-and-housing-surnames)
- 2010 API variables: NAME, RANK, COUNT, PROP100K, CUM_PROP100K, PCTWHITE, PCTBLACK, PCTAPI, PCTAIAN, PCT2PRACE, PCTHISPANIC. In 2010 these were **percentages**; in 2020 they are counts. [api.census.gov variables.json](https://api.census.gov/data/2010/surname/variables.json). Researcher check: data queries without a key were redirected to `api.census.gov/data/missing_key.html`, which suggests a free API key is required. The attempt to download the 2010 `names.zip` from www2.census.gov got a WAF "Request Rejected" page.
- 2000: 151,671 surnames occurring 100 or more times, published as a top-1,000 Excel file, a complete zipped Excel/CSV and technical documentation. The page says the data "does not in any way identify specific individuals". [Census 2000 surnames page](https://www.census.gov/topics/population/genealogy/data/2000_surnames.html)
- 1990: a names tabulation containing "only the frequency of a surname". [Census names data page](https://www.census.gov/topics/population/genealogy/data.html)

**Other US public sources that can be aggregated by surname**
- NARA 1950 Census on the AWS Registry of Open Data (S3 bucket `nara-1950-census`, accessed with `--no-sign-request`): over 165 TB and about 6.5 million images. The metadata fields are state, county, enumeration district number and description, microfilm roll and image file names. No name index is listed in the dataset description. [NARA developer page](https://www.archives.gov/developer/1950-census)
- The 1950 name index was built with AWS Textract OCR, is "not 100-percent accurate", and can be corrected through public transcription. [NARA 1950 census access](https://www.archives.gov/news/articles/1950-census-access) (search summary; UNVERIFIED)
- Chronicling America (Polish-language US newspapers) is covered in section 5.

**SSDI / Death Master File**
- Fields: given name and surname, SSN, date of birth, date of death, state where the SSN was issued, and ZIP code of last residence. Birthplace is not a standard field. In November 2011 the SSA stopped including state-sourced death data, which caused "an approximately 33% drop in reported deaths". The file covers most people who died since 1936, had an SSN, and whose death was reported to the SSA. [Wikipedia: Social Security Death Index](https://en.wikipedia.org/wiki/Social_Security_Death_Index)
- Section 203 of the Bipartisan Budget Act of 2013 prohibits disclosure of DMF information within three calendar years of a death unless the recipient is certified. Certification requires a "legitimate fraud prevention interest" or a "legitimate business purpose pursuant to a law, governmental rule, regulation, or fiduciary duty". The NTIS final rule was published on 1 June 2016 and took effect on 28 November 2016. [Federal Register 2016-12479](https://www.gpo.gov/fdsys/pkg/FR-2016-06-01/html/2016-12479.htm); [NTIS LADMF](https://www.ntis.gov/ladmf/ladmf.xhtml)

### Inferences
- The three decennial files support a 2000→2010→2020 time series of **US bearer counts** for Polish surnames that have 100 or more bearers. Two caveats should be attached to any such claim:
  1. The 2020 counts are noise-infused.
  2. The 2020 file only includes names that were also in the 2010 table.

  A surname missing from a file means "fewer than 100 bearers, or excluded". It never means zero, which matches the project rule that suppressed or absent data is not zero.
- Diacritics are stripped (WIŚNIEWSKI appears as WISNIEWSKI), and anglicised respellings are separate entries. Name Atlas will need an explicit mapping from Polish forms to US forms, and each mapping is itself a claim that needs evidence.
- The race/Hispanic columns are a sensitive-category risk. The ingestion step should keep only NAME, RANK, COUNT and PROP100K and drop the race columns, so that no ethnicity signal can reach a Claim.
- Commercial status: the 2010 file is explicitly CC0 on data.gov. The 2020 page shows no licence statement. Public-domain status is likely for a federal product but should be recorded as "to confirm" before paid use.
- The files are national only. Answering "where in the US" would need other sources, such as the 1950 census index or newspapers, and each of those carries more risk or effort.
- The SSDI should be excluded:
  - It is person-level and contains SSNs.
  - It has no birthplace, so it cannot identify people born in Poland.
  - Recent records sit behind NTIS certification, and the full file is a paid NTIS product.
  - Aggregating by last-residence ZIP code adds little over the Census files and brings data-handling duties at the level of identity-theft risk.

### Gaps
- No explicit licence statement for the 2020 file was found.
- The 404 on the census.gov 2010 surnames page may or may not be permanent; the data remains on data.gov and the API.
- Whether the 1950 census name index is available in bulk, and under what licence, was not confirmed.
- IPUMS full-count data and the NARA 1940 census were not researched; the search budget ran out.
- Current NTIS DMF pricing and subscription terms were not retrieved.

---

## 2. France: INSEE deaths file and INSEE surname-at-birth data (Géopatronyme)

### Takeaway
Both main French sources are reusable under **Licence Ouverte 2.0 (Etalab)**, which allows commercial reuse with the credit "Source : Insee".
- The **INSEE deaths file** runs from 1970 to the present and is updated monthly. It records the birth country for people born abroad, so deaths in France of people born in Poland can be counted by surname, date and place.
- The **INSEE "Fichier des noms"** counts surnames of people born in France from 1891 to 2000, by decade, at national and département level, for names given at least 30 times. This is the same kind of "where and when" geography Géopatronyme showed. Coverage runs to 2000, not 1990 as the brief assumed.

### Cited Findings
**Fichier des personnes décédées (deaths file)**
- Producer INSEE; licence "Licence Ouverte / Open Licence version 2.0". Annual files cover 1970 to last year, with monthly and quarterly files for the current year. Last update 25 September 2026. The file is text (txt). [data.gouv.fr: Fichier des personnes décédées](https://www.data.gouv.fr/fr/datasets/fichier-des-personnes-decedees/)
- Record layout:

  | Field | Length | Position |
  |---|---|---|
  | Nom et Prénom | 80 | 1–80 |
  | Sexe | 1 | 81 |
  | Date de naissance | 8 | 82–89 |
  | Code du lieu de naissance | 5 | 90–94 |
  | Commune de naissance en clair | 30 | 95–124 |
  | DOM/TOM/COM/Pays de naissance en clair | 30 | 125–154 |
  | Date de décès | 8 | 155–162 |
  | Code du lieu de décès | 5 | 163–167 |
  | Numéro d'acte de décès | 9 | 168–176 |

  [data.gouv.fr dataset](https://www.data.gouv.fr/fr/datasets/fichier-des-personnes-decedees/)
- The documentation gives locality information "pour les personnes nées en France ou dans les DOM/TOM/COM" and the country label "pour les personnes nées à l'étranger". [data.gouv.fr dataset](https://www.data.gouv.fr/fr/datasets/fichier-des-personnes-decedees/)
- INSEE lists the available fields as "nom, prénoms, sexe, date de naissance, code et libellé du lieu de naissance, date du décès, code du lieu de décès et numéro de l'acte de décès". Heirs "peuvent … faire opposition à la rediffusion de ces données" under Article 85 of the French data protection law. The data "ne peuvent … en aucun cas être utilisées dans un but de certification du statut vital des personnes" (cannot be used to certify whether a person is alive). [INSEE: fichiers des personnes décédées](https://www.insee.fr/fr/information/4190491)
- "Les informations des fichiers de personnes décédées ne sont pas des données à caractère personnel" (the data is not personal data). INSEE cannot guarantee the files are free of omissions or errors, and a given monthly file does not include every death from that month. [data.gouv.fr dataset](https://www.data.gouv.fr/fr/datasets/fichier-des-personnes-decedees/)
- Researcher check via the data.gouv.fr API: licence `lov2`, 87 resources, including `deces-2025.txt` (about 131 MB) and monthly files of about 10–15 MB. [data.gouv.fr API](https://www.data.gouv.fr/api/1/datasets/5de8f397634f4164071119c5/). Downloads from static.data.gouv.fr were reset by the network from the research environment, so the contents could not be tallied.

**Fichier des noms (surnames at birth, 1891–2000)**
- Surnames by decade of birth from 1891 to 2000, for France and by département of birth.
  - Threshold: "noms attribués au moins 30 fois de 1891 à 2000".
  - 218,982 distinct surnames in the national file; 131,055 in the département file.
  - Formats: dBase and TXT. Published 22 May 2018.
  - Source: RNIPP and civil registration.
  - Names below the threshold are grouped as "AUTRES NOMS".
  - Excludes people born before 1946 who died before 1972 (metropolitan France).

  [INSEE: Fichier des noms](https://www.insee.fr/fr/statistiques/3536630)
- INSEE's general reuse terms: Licence Ouverte / Open Licence 2.0 (Etalab). Reuse is free, including commercial reuse. Users must credit "Source : Insee", give the date of the last update where known, and must not distort the data. [INSEE: legal notice and reuse](https://www.insee.fr/fr/information/2008466)
- Géopatronyme (births 1891–1990) was built from an INSEE RNIPP extract and is now part of the Filae platform. [Filae surname page](https://www.filae.com/nom-de-famille/INDIVIDU.html) (search summary; secondary; UNVERIFIED)

### Inferences
- The Fichier des noms counts **people born in France only**. People born in Poland who emigrated do not appear; their France-born children do. The file therefore dates and places when a surname became established in France. Polish-origin surnames are expected to appear in the mining départements from the 1920s–30s, but this was not checked in the data. Combined with a commercial-friendly licence, this makes it an ideal source for "surname-level geographic change over time".
- The deaths file can support diaspora claims with birth-country provenance, for example "N people born in Poland with surname X died in France, by decade and département of death". Name-only sources cannot provide that provenance. Small cells describe identifiable deceased people, so minimum-count thresholds are needed. If any person-level rows are stored, Article 85 oppositions must be handled.
- The registered country label reflects registration practice, not historical borders. For example, a birth in Posen before 1918 may be recorded under Germany or Poland (UNVERIFIED). The field should be modelled as "registered birth country label", not as a historical fact.
- Gendered forms (KOWALSKA and KOWALSKI) and the loss of diacritics will need variant rules. How diacritics are encoded in these files is UNVERIFIED.

### Gaps
- It was not verified whether "Commune de naissance en clair" contains the foreign locality (a Polish town) for people born abroad. It was also not verified whether the birth-place code uses the COG country codes 99xxx (for example 99122 for Poland). The official layout describes locality only for births in France and overseas territories, and the files could not be downloaded to check.
- Whether INSEE publishes the Article 85 opposition list for reusers is unknown.
- Géopatronyme's current data source and licence under Filae/MyHeritage were not verified.

---

## 3. Germany: official surname statistics, the Familiennamenatlas (DFA), the Familiennamenwörterbuch (DFD), and CompGen datasets

### Takeaway
No official German surname-frequency statistics were found. The scholarly reference works, the Deutscher Familiennamenatlas (DFA) and the Digitales Familiennamenwörterbuch Deutschlands (DFD), are built on a **2005 Deutsche Telekom landline extract of about 28 million connections**, which is not published as open data. The DFD reportedly covers every surname with at least 10 occurrences, including names of foreign origin, and its articles are reportedly under CC BY 3.0 DE. The primary site blocked bots, so the licence could not be confirmed. The most usable German data found is the CompGen WWI casualty-list dataset, released under CC0 in January 2026 (section 5).

### Cited Findings
- Data basis of the DFA and DFD: "rund 28 Millionen Telefonanschlüsse aus dem Jahr 2005, die von der Deutschen Telekom erworben" and archived in the "Mainzer Familiennamendatenbank". Germany has "rund 850.000 verschiedene Familiennamen, hinzu kommen noch etwa 250.000 Namen mit Bindestrich". Press release of Johannes Gutenberg-Universität Mainz, 22 February 2023. [idw (German)](https://idw-online.de/de/news809731)
- The same release announced an eighth, condensed volume of the Familiennamenatlas with nearly 1,000 maps, closing a 20-year project. It said the DFD is to give comprehensive digital access by 2035. In 2005, 92% of households had a Telekom landline, compared with fewer than 60% at the time of the release. [idw (English)](https://idw-online.de/en/news809731)
- DFD: produced by the Mainz Academy of Sciences and Literature with TU Darmstadt. It has about 200,000 name articles (every surname with at least 10 occurrences), including names of foreign origin, in a 24-year project started in 2012. [ADW Mainz project page](https://www.adwmainz.de/en/research/projects/details/das-digitale-familiennamenwoerterbuch-deutschlands-dfd.html) (bot-protected for our fetch; details from search index; UNVERIFIED)
- The DFD is meant to serve people with foreign-origin names too ("auch die türkischen oder italienischen"). [Schwäbische Zeitung, 2015](https://www.schwaebische.de/panorama/kein-name-ist-langweilig-lexikon-aller-deutschen-familiennamen-geht-online-662783)
- DFD licence "Creative Commons BY 3.0 Deutschland": seen only in a search summary. namenforschung.net returned HTTP 403 (bot protection) to both WebFetch and curl. **UNVERIFIED.**
- The DFD has been online since October 2014 and publishes 500–900 names every 14 days. Heuser and Scheller, *Onomastica* 62 (2018). [Onomastica article](https://onomastica.ijppan.pl/index.php/ONOM/article/download/50/32) (search summary; not read; UNVERIFIED)
- A claim that the Telekom-data exemption was granted "exclusively for scientific purposes" appeared in a search summary but is not in the press-release text. **UNVERIFIED.**
- A related open dataset exists: "Family name distributions collected in the 'Aktion Forscherkontakte' (FOKO)", Verein für Computergenealogie, 2016, licensed **CC BY-SA 4.0**. [Zenodo 10.5281/zenodo.61683](https://doi.org/10.5281/zenodo.61683) (metadata from the Zenodo API; contents not inspected)

### Inferences
- If the DFD licence is confirmed, DFD articles on German-resident Polish-origin names (for example, names of Ruhr Poles) could be quoted as attributed etymological commentary. Counts and maps derived from the 2005 Telekom extract should be treated as **not licensable for commercial redistribution** until the Academy confirms otherwise.
- Present-day German bearer counts are a "we don't know" area for Name Atlas. For German evidence the product should rely on the CC0 CompGen casualty-list data, which covers 1914–1919 with birthplace and Kreis.
- FOKO's share-alike licence would carry over to derived databases. Its compatibility with the product licence needs checking before any mixing.

### Gaps
- No source was found that explicitly states Destatis publishes no surname statistics; the absence is inferred.
- The DFD licence scope (whether it covers counts and maps as well as article text) and whether an API or export exists could not be checked.
- How many Polish-origin names the DFD covers was not established.

---

## 4. Neighbouring and diaspora countries: official surname-frequency open data

### Takeaway
Of the countries named in the brief, only two publish usable official surname frequencies:
- **Argentina**: RENAPER, CC BY 4.0, by province, data as of December 2021.
- **Brazil**: IBGE 2022 Census, published November 2025, by state, municipality and birth decade. The licence was not confirmed.

The rest:
- **Czech Republic**: stopped publishing after the 2016 data, citing personal-data protection.
- **UK**: the ONS publishes no surname statistics.
- **Latvia**: offers first-name lookups only.
- **Lithuania, Slovakia, Ukraine and Canada**: no confirmed surname dataset.
- **Belarus and Australia**: not researched.

Outside the named list, good open surname datasets exist in **Finland (CC BY 4.0)** and **Norway (CC BY 4.0)**. **Switzerland** has a canton-level table whose commercial use reportedly needs permission.

### Cited Findings
**Czech Republic**
- The Ministry of the Interior used to publish frequencies of first names and surnames, by location; 2016 was the last year published. It stopped in 2017 citing personal-data protection and said it "není oprávněno ke zveřejňování statistik" (is not authorised to publish statistics). The Czech Statistical Office was also not publishing, as of 26 September 2023. Old 2016 files remain on third-party sites Kdejsme.cz and Nasejmena.cz. [CNN Prima News, 26 September 2023](https://cnn.iprima.cz/urady-sedm-let-taji-udaje-o-poctu-jmen-i-prijmeni-nevime-kolik-je-krystofu-fialu-ani-gottu-412444)
- A freedom-of-information response dated 14 April 2020 addressed the end of publication. According to a search summary, it says there was no legal basis for generating such data from the population register. [Ministry of the Interior FOI response (scanned PDF)](https://archiv.mv.gov.cz/soubor/mv-58573-2-vs-2020.aspx) (image-only PDF; content from search summary; UNVERIFIED)

**Slovakia**
- No official surname-frequency dataset was found. A 2025 conference paper analysed names from open datasets published by municipalities. [Tóth, OSSConf 2025](https://frcatel.fri.uniza.sk/ossconf/zborniky-online/ossconf2025/files/31-toth.pdf) (search summary)

**Lithuania**
- Registrų centras (Centre of Registers) publishes Population Register open data and statistics, including popular first names, under CC BY 4.0. [Registrų centras open data](https://www.registrucentras.lt/atviri-duomenys-ir-statistika) (HTTP 403 to fetch; search summary; UNVERIFIED whether surnames are included)
- Media report surname statistics drawn from Registrų centras data, for example that Singh is the most common surname in three municipalities. [tv3.lt](https://www.tv3.lt/gaires/pavardes) (secondary)

**Latvia**
- The PMLP (Office of Citizenship and Migration Affairs) service checks how many people in the Population Register have a given **first name** ("cik personas ar interesējošo vārdu…"). It offers no bulk download or API, and the page states "visas tiesības aizsargātas" (all rights reserved). [PMLP personal-name database](https://pmlp.gov.lv/lv/personvardu-datu-baze)
- A data.gov.lv search for "uzvārdi" (surnames) returned 15 datasets, none a surname-frequency table. CC0 datasets in the results include Ministry of Justice statistics on changes of name, surname and nationality (CSV, updated 10 April 2026), the University of Latvia student list 1919–1944, and the list of residents deported in March 1949. [data.gov.lv search](https://data.gov.lv/dati/lv/dataset?q=uzv%C4%81rdi)

**Ukraine and Belarus**
- No official open surname-frequency data was found. The private site "Рідні" (ridni.org) shows surname counts by settlement, for example 158,272 people named Shevchenko. [Ukrainska Pravda Life, 2017](https://life.pravda.com.ua/society/2017/05/16/224202/) (search summary; the site's data source was not established)
- Belarus: not researched (search budget exhausted).

**United Kingdom**
- ONS FOI-2025-2910 (9 July 2025): surnames collected in the census are "not used to produce statistical outputs". Producing the requested statistics would mean creating new information, which FOI does not require. Census name information goes to The National Archives after 100 years. [ONS FOI response](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/frequencyanddistributionofthesurnameastorintheunitedkingdom)

**Canada**
- Retraite Québec publishes **first names only** (1980–2025) under CC BY 4.0. Names given to fewer than five children are shown as "<5", and names used only once over the whole period are removed. [Données Québec](https://donneesquebec.ca/recherche/dataset/banque-de-prenoms-filles). No Canadian surname dataset was found.

**Australia**
- Not researched (search budget exhausted).

**Brazil**
- IBGE "Nomes no Brasil" (2022 Census, technical note 01/2025, dated 4 November 2025):
  - Covers the names and surnames of all residents on 1 August 2022: 203 million people in 27 states (Unidades da Federação) and 5,570 municipalities.
  - Results are by sex and birth period, for Brazil, each state and each municipality.
  - In the surname field, "foi feita uma frequência dos sobrenomes, não importando a ordem em que foram registrados": each surname is counted regardless of its position in the full name.
  - Connectives (da, de, do, dos and similar) are removed, and diacritics are not kept.
  - Minimum frequencies: 20 for Brazil, 15 for a state, 10 for a municipality. The same filters apply to each decade.

  [IBGE technical note](https://censo2022.ibge.gov.br/nomes/nota_tecnica/notatecnica.pdf)
- This is the first IBGE release to include surnames; Silva appears for 16.76% of the population. [CNN Brasil](https://www.cnnbrasil.com.br/nacional/brasil/ibge-revela-nomes-e-sobrenomes-mais-populares-do-brasil-veja-ranking/) (search summary)
- Licence and bulk download: censo2022.ibge.gov.br/nomes returned HTTP 403. **UNVERIFIED.**

**Argentina**
- Researcher check of the datos.gob.ar CKAN API:
  - Dataset `distribucion-de-apellidos-en-argentina`, published by RENAPER, licence "Creative Commons Attribution 4.0", metadata modified 25 August 2026.
  - It has three CSV resources: the 20 most frequent surnames nationally (with count and percentage, December 2021); the 20 most frequent by province; and "Apellidos por provincia de residentes en Argentina (Diciembre 2021)".
  - The provincial file "Incluye sólo aquellos apellidos con más de 10 portadores en la provincia" (only surnames with more than 10 bearers in the province).

  [datos.gob.ar API query](https://datos.gob.ar/api/3/action/package_search?q=apellidos). Downloading the CSV from datosabiertos.renaper.gob.ar failed (connection reset from the research environment), so the field names were not inspected.

**Israel**
- The Central Bureau of Statistics released surname counts for 2016: more than 50,000 surnames, with a minimum of 9 bearers. [Blood and Frogs blog](https://bloodandfrogs.com/2018/05/101-most-common-surnames-israel.html) (secondary; the primary CBS file was not located; UNVERIFIED)

**Other diaspora countries (not in the brief's list, but relevant)**
- Norway: SSB publishes a table of surnames used by 200 or more people, with counts, in xlsx and csv. [SSB table](https://www.ssb.no/375410/etternavn-brukt-av-200-eller-flere). SSB content is licensed CC BY 4.0 and commercial use is permitted; data containing confidential personal information is excepted. [SSB licence](https://www.ssb.no/en/diverse/lisens)
- Finland: DVV (Digital and Population Data Services Agency) publishes "Finnish names", covering first names and surnames of living Finnish citizens in the Population Information System. Surnames with fewer than 20 bearers are excluded for privacy. Licence CC BY 4.0. The latest surname file is `sukunimitilasto-2026-08-04-dvv.xlsx`. [avoindata.fi API](https://avoindata.suomi.fi/data/api/3/action/package_search?q=sukunimitilasto); [dataset](https://avoindata.suomi.fi/data/dataset/57282ad6-3ab1-48fb-983a-8aba5ff8d29a)
- Switzerland: the Federal Statistical Office (BFS) dataset "Nachnamen der ständigen Wohnbevölkerung nach Kanton" (surnames of the permanent resident population by canton) has 2023 data and was updated 23 August 2024. Its terms reportedly are open use with source attribution, with commercial use requiring the data owner's permission. [opendata.swiss](https://opendata.swiss/en/dataset/nachnamen-der-standigen-wohnbevolkerung-nach-kanton) (HTTP 403 to fetch; search summary; UNVERIFIED). The BFS also publishes "Les cinq noms de famille les plus fréquents par commune" (the five most frequent surnames per municipality). [BFS asset 23264098](https://www.bfs.admin.ch/asset/en/23264098)
- Belgium: Statbel open data is reusable free of charge, including commercially, and includes first names by municipality (published only from 5 occurrences). [Statbel open data](https://statbel.fgov.be/en/open-data/first-names-total-population-municipality) (search summary). A Statbel surname dataset could not be confirmed because the page showed a CAPTCHA. **UNVERIFIED.**

### Inferences
- Argentina (Polish communities in Misiones and Buenos Aires) and Brazil (Paraná) are the only diaspora countries in the list where Name Atlas can show **official present-day counts by region**. Argentina can be used now (CC BY 4.0). Brazil can be used once the IBGE licence and bulk-access terms are confirmed.
- Brazil counts a surname wherever it appears among a person's surnames, so the figure means "people carrying X among their surnames", not family lines. The product should label it that way.
- Official data on "the same surname in neighbouring countries" is largely missing: the Czech Republic stopped, Slovakia, Ukraine and Belarus have none found, Lithuania is unconfirmed, and Latvia offers first names only. "We don't know" is the honest state. Third-party mirrors (the Czech 2016 copies, ridni.org) have unclear provenance and licensing and should be excluded.
- Cross-border "same surname" claims need explicit variant rules for gendered and transliterated forms, for example Nowak ↔ Novák/Nováková, and Lithuanian or Latvian suffixes. Without them there is a high risk of false equivalence.
- Israel: counts there for Polish-origin surnames would, in effect, imply Jewish ancestry. This is a sensitive-inference risk; exclude it, or use it only after an explicit ethics review.
- The UK and Germany hold the largest recent Polish diaspora but have no official counts. The product should state that gap rather than fill it with derivatives of electoral rolls or phone books.

### Gaps
- Czech status after September 2023 (possible resumption or new legislation) was not checked.
- Not confirmed: whether Lithuania publishes surname frequencies; Slovakia; Belarus; Australia; Canada at federal level.
- Brazil (IBGE) licence and bulk access; the Argentine file's field names; the primary Israeli CBS file; the Swiss terms on the primary page; a Statbel surname dataset.
- A figure of 348,288 distinct surnames among living Argentine ID holders appeared only in a search summary. **UNVERIFIED.**
- A search summary also claimed SSB offers a separate file of "protected" surnames (200 or fewer bearers) with about 300,000 rows. **UNVERIFIED.**

---

## 5. Historical newspapers, casualty lists and gazetteers (Chronicling America, Gallica, ANNO/Verlustliste, CompGen Verlustlisten, GOV, Trove)

### Takeaway
Two sources are safe for commercial use:
- **Chronicling America** (Library of Congress): public domain or "no known copyright restrictions", with at least 10 Polish-language US titles from the 1880s to the 1960s, available through the loc.gov API.
- **The CompGen German WWI casualty-list index**: released on Zenodo on **21 January 2026 under CC0**. It holds 8.5 million records including birthplace, and its licence text explicitly allows commercial use.

The rest need permission or have unclear terms:
- **Gallica** requires a paid licence for commercial reuse; its metadata is under the free Etalab licence.
- **ÖNB/ANNO** allows reuse with attribution. The Austro-Hungarian casualty index built on it (2.69 million entries) states no licence.
- **GOV** has no confirmed licence.
- **Trove**'s API is reported as non-commercial by default.

### Cited Findings
**Chronicling America (Library of Congress)**
- Rights statement: "The Library of Congress believes that the newspapers in Chronicling America are in the public domain or have no known copyright restrictions." US newspapers more than 95 years old are public domain in full. Newer papers "may contain some copyrighted third party materials", and the legal assessment is the user's responsibility. [loc.gov item JSON (rights field)](https://www.loc.gov/item/sn83045747/?fo=json)
- The legacy API ran from 2007 to 2025. "Beginning in 2025, the Chronicling America collection is accessible exclusively via the loc.gov API." [LoC Chronicling America API page](https://www.loc.gov/apis/additional-apis/chronicling-america-api/)
- Rate limits: the loc.gov JSON/YAML API allows 20 requests per minute, with a 1-hour block if exceeded. Text and image services allow 150 requests per minute. Users may get HTTP 429 or CAPTCHA pages under heavy load. [LoC: working within limits](https://www.loc.gov/apis/json-and-yaml/working-within-limits/)
- Researcher check: a loc.gov API facet query for `language:polish` returned 18,255 results.
  - By title:

    | Title | Place and years | Results |
    |---|---|---|
    | Dziennik Chicagoski | Chicago, 1890–1971 | 9,322 |
    | Wiarus | Winona, Minnesota, 1895–1919 | 1,376 |
    | Gwiazda Zachodu | Omaha | 1,346 |
    | Przewodnik Katolicki | New Britain, Connecticut, 1907–1966 | 923 |
    | Zgoda: Wydania dla Niewiast | Chicago, 1900–1913 | 624 |
    | Głos Polek | Chicago / Pittsburgh / Park Ridge, 1902– | 612 |
    | Ameryka | Toledo, 1893–1902 | 466 |
    | Zgoda: Wydanie dla Mężczyzn | Chicago, 1902–1913 | 446 |
    | Zgoda = Unity | Milwaukee, 1881–1901 | 418 |
    | Jedność-Polonia | Baltimore | 405 |

  - By state: Illinois 12,586, Minnesota 1,870, Nebraska 1,346, Ohio 1,271, Connecticut 923, Pennsylvania 612, Maryland 430, Wisconsin 418.
  - By decade: 1880s to 1960s, with most results in the 1900s (5,181) and 1910s (5,210).

  [loc.gov API query](https://www.loc.gov/collections/chronicling-america/?fa=language:polish&fo=json&c=1&at=facets)
- A new Chronicling America website launched on 4 August 2025. [NDL Current Awareness](https://current.ndl.go.jp/car/256466) (search summary)

**Gallica (BnF)**
- "La réutilisation non commerciale de ces contenus est libre et gratuite" (non-commercial reuse is free), with the credit "Source gallica.bnf.fr / BnF". "La réutilisation commerciale de ces contenus est payante et fait l'objet d'une licence" (commercial reuse is paid and licensed). Commercial reuse is defined as resale of products, provision of a service, or any reuse "générant directement des revenus" (directly generating revenue).
- Researchers are exempt for scholarly publications. "Les métadonnées sont soumises à la licence EtaLab" (metadata is under the free Etalab licence).
- Using the OCR text in an AI or text-mining project is free "à des fins de recherche scientifique académique, à but non lucratif" (for non-profit academic research) and "Payante pour les autres utilisations" (paid for other uses).
- A free IIIF API serves high-resolution images. The general terms were last updated 13 December 2021.

  [Gallica conditions of use](https://gallica.bnf.fr/edit/und/conditions-dutilisation-des-contenus-de-gallica)
- Polish émigré labour press from France digitised in Gallica, as listed by the BnF France–Pologne portal: *Posiew* (1939–1941), *[Journal polonais en France]* (1939–1945), *Nasz Głos* (1940–1941), *Na Straży* (1942–1944) and *Nasza walka* (1942–1944). [BnF France–Pologne: pisma partyjne](https://heritage.bnf.fr/france-pologne/pl/pisma-partyjne-0)
- *Narodowiec* was founded in 1909 in Germany for Polish miners in Westphalia and the Rhineland, and moved to the Pas-de-Calais and Nord coalfields after WWI. It became the most widely read Polish emigrant paper in France. [Porta Polonica](https://www.porta-polonica.de/en/node/998?page=2) (search summary). Whether it is digitised in Gallica is UNVERIFIED.

**ANNO (Austrian National Library) and the Austro-Hungarian casualty lists (Verlustliste Österreich-Ungarns)**
- The Austrian National Library (ÖNB) claims no exploitation right of its own over its digitised holdings. It agrees to their reuse "in the retrievable web resolution", with an image credit and a source citation. Scans digitised by Google (Austrian Books Online) may be used only non-commercially for a limited period. [ÖNB: Nutzung](https://www.onb.ac.at/nutzung)
- CompGen (Verein für Computergenealogie) and Familia Austria indexed the Austro-Hungarian casualty lists:
  - 2.69 million entries from about 37,000 pages (709 lists plus 11 supplementary lists), completed in January 2022 by 187 contributors.
  - Fields include surname, first name, birth year, rank, unit and **Heimatzuständigkeit** (legal home jurisdiction), recorded as Land/Bezirk/Gemeinde (crown land/district/municipality).
  - Source images come from ÖNB ANNO.
  - A follow-up project indexing 546 lists of wounded soldiers (Verwundetenlisten, 1914–1917) started in autumn 2025.

  [CompGen: Österreich-Ungarn tag](https://compgen.de/tag/oesterreich-ungarn)
- The index is searchable "kostenfrei und ohne Registrierungspflicht" (free, no registration) at des.genealogy.net/ou1wk/search. No licence statement was found. [CompGen, 14 April 2020](https://www.compgen.de/?p=22321)
- The ANNO title page showed a security check to our fetch, so its details are UNVERIFIED.

**German WWI casualty lists (Verlustlisten, published by the Prussian government), CompGen index**
- Zenodo dataset "Deutsche Verlustlisten des Ersten Weltkriegs – Datensammlung", Verein für Computergenealogie e.V., version 1.0, published 21 January 2026, DOI 10.5281/zenodo.18330751, licence **CC0**. More than 8.5 million records were crowd-indexed between November 2011 and August 2014; the published data reflects the state of 14 October 2025, and error correction is ongoing. Files: Parquet (289 MB), ZIP (312 MB) and PDF documentation. [Zenodo record](https://doi.org/10.5281/zenodo.18330751)
- The documentation:
  - The lists cover 1914–1919 for all German contingents: Prussia, Bavaria, Saxony and Württemberg, plus the Navy and colonial troops (Schutztruppe).
  - Standard fields: unit (Truppenteil), surname, first name, rank, **birthplace (Geburtsort)** with district abbreviations (Kr., B.-A., O.-A.), and type of loss.
  - From 7 December 1916 birth dates were added and units dropped. From 25 August 1917 birth dates were given without the year. Units returned in late 1918.
  - Licence text: the data "dürfen von jedermann kopiert, verbreitet, modifiziert, kombiniert und auch kommerziell verwendet werden, ohne dass eine Erlaubnis eingeholt werden muss oder Bedingungen wie Namensnennung gelten" (may be copied, distributed, modified, combined and also used commercially by anyone, without permission or attribution).

  [Zenodo documentation PDF](https://zenodo.org/api/records/18330751/files/Verlustlisten%20Erster%20Weltkrieg.pdf/content)

**GOV (Genealogisches Ortsverzeichnis, CompGen's historical gazetteer)**
- GOV is offered as "qualitativ hochwertige Informationen als frei verfügbare Linked Open Data" (high-quality, freely available linked open data). Each entry has machine-readable RDF, and official municipality keys (AGS) have been integrated since November 2014. [CompGen: GOV](https://compgen.de/?p=2736)
- The size figures conflict between search summaries: "over 250,000 places" and "over 1.2 million places and administrative units". **UNVERIFIED.**
- wiki.genealogy.net served an anti-bot challenge (Anubis) to our fetch on 2026-09-29, so automated access to genealogy.net services may be blocked.

**Trove (National Library of Australia)**
- Using the Trove API requires a Trove account and an API-key application that states the intended use, the rate of calls and whether an exemption from the Trove API Terms is needed. Commercial use needs explicit permission. [Trove: Using the API](https://trove.nla.gov.au/about/create-something/using-api); [Trove API Terms of Use](https://trove.nla.gov.au/about/create-something/using-api/trove-api-terms-use) (both blocked by an anti-bot challenge for our fetch; wording from the search index; UNVERIFIED)

### Inferences
- The **CompGen CC0 dataset is the most valuable new cross-border source found.** It allows per-surname counts of casualty-list entries by birthplace Kreis across the German Empire. That includes the provinces of Posen, West Prussia and Silesia, and Ruhr-born sons of Polish migrants, giving a 1914–1919 distribution layer with no commercial constraint. Two cautions apply:
  - The rows are person-level records of named people with birthplaces and birthdates, so the product should use aggregates only.
  - The same person can appear several times (wounded, then killed, plus corrections), so counts are "list entries", not unique people. A ConfidenceAssessment should say so.
- The Austro-Hungarian index would give a 1914–1918 distribution for Galicia by district and municipality. Heimatzuständigkeit is legal home jurisdiction, not necessarily birthplace (inference). The index has no licence, so permission from CompGen and Familia Austria is needed before use.
- Chronicling America is public domain, but using it means extracting surnames from OCR text, where Polish diacritics add noise. The evidence it gives is "surname attested in newspaper X on date Y" (a mention), not a count of bearers. It suits "where and when the surname appears abroad" examples with page-level citations.
- Using Gallica's OCR in a commercial product needs a paid licence; titles and dates (metadata) are free under Etalab.
- GOV could serve as a gazetteer for German-era place names, for example mapping to Kreis, once its licence is confirmed. Otherwise the project's already-known gazetteers (GeoNames, Wikidata, OpenHistoricalMap) apply.

### Gaps
- The GOV licence text, API terms, and whether bot protection blocks automated use.
- The primary text of the Trove terms, and whether Trove holds Polish-language titles.
- Details of the Verlustliste in ANNO, and whether reusing ÖNB OCR text commercially is allowed.
- Which Polish émigré titles (for example *Narodowiec*, or *Wiarus Polski* after its move to France) are in Gallica.

---

## 6. Emigration and passenger records (Hamburg, Bremen, Ellis Island, Castle Garden)

### Takeaway
None of the four can be reused automatically or commercially without an agreement:
- **Ellis Island**: the Statue of Liberty–Ellis Island Foundation explicitly prohibits robots, scraping and data mining, and restricts passenger records to personal non-commercial use. **Blocked.**
- **Hamburg**: the lists are available through Ancestry (paid; automated access prohibited). **Effectively blocked.**
- **Bremen**: passagierlisten.de (about 740,000 names) is free to search but publishes no reuse terms, so permission is required.
- **Castle Garden**: CastleGarden.org returned HTTP 503 when checked.

### Cited Findings
- Statue of Liberty–Ellis Island Foundation terms forbid using "any robot, spider, site search/retrieval application … to access, monitor, copy, use, download, retrieve, index, extract, scrape, data mine" the site. Passenger records, manifest pages and ship pictures are for personal non-commercial purposes only. The Foundation asserts rights over the "data compilation, meta data". No effective date appears on the page. [Foundation terms (2026 HTML)](https://www.statueofliberty.org/wp-content/uploads/2026/06/terms-of-use_combined_final_2.html); other 2026 versions exist, for example [TermsOfUse.pdf (2026/03)](https://www.statueofliberty.org/wp-content/uploads/2026/03/TermsOfUse.pdf)
- Hamburg: Ancestry hosts "Hamburg Passenger Lists, 1850–1934", with images digitised in partnership with the Hamburg State Archive, behind a paid subscription, plus handwritten indexes for 1855–1934. [Cyndi's List: Hamburg](https://cyndislist.com/ports-departure/hamburg-germany/) (secondary; search summary). The index has grown to more than 4.5 million names. [Sassy Jane Genealogy](https://www.sassyjanegenealogy.com/updated-index-to-hamburg-passenger-lists/) (secondary)
- Bremen, per the database's own description:
  - "about 3,000 lists with 740,000 names, remaining of about 7.5 million emigrants via Bremen/Bremerhaven".
  - Coverage: the Chamber of Commerce lists for 1920–1939, plus 1907/08 and 1913/14 index cards indexed with FamilySearch and BYU.
  - Online since 1 April 2001; "It is and remains free of charge and advertising".
  - Places of residence and origin are recorded and partly corrected to modern spelling.
  - Example given: a Polish couple, Szymczak, travelling to New York in 1925.

  [Die Maus: All about the database Bremen Passenger Lists](https://www.die-maus-bremen.info/fileadmin/pdf_docs/Forschung/PL_engl.pdf)
- Researcher check of the same document found no reuse or licence statement. No terms page was located on passagierlisten.de.
- CastleGarden.org was a free database of about 11 million immigrants from 1820 to 1892, run as an educational project of The Battery Conservancy. [LCGS](https://lcgsco.org/castle-garden-database-is-online/) (secondary). castlegarden.org returned HTTP 503 to our fetch on 2026-09-29.

### Inferences
- All four should be treated as "blocked pending permission". Bremen (the Die Maus society) is the most plausible partner: it is a volunteer society running a free database that records place of origin, which could yield counts of Poland-origin emigrants per surname for 1920–1939.
- These are person-level records. Even with permission, only aggregates (surname × origin region × decade) should reach the product.

### Gaps
- Reuse terms of Die Maus and the Bremen Chamber of Commerce; direct licensing from the Hamburg State Archive; the current status of Castle Garden; the Ellis Island Foundation's process for bulk or commercial licensing.

---

## 7. WWII, repression and persecution databases (Arolsen, straty.pl, Indeks Represjonowanych, Warsaw Rising Museum, Katyń, Yad Vashem, USHMM)

### Takeaway
None of these offers an open, commercially licensed bulk dataset.
- **Arolsen** allows publication under its rules and GDPR, but users may not pass on digital copies or integrate them into another archive.
- **straty.pl, Indeks Represjonowanych and the Warsaw Rising Museum** biographies state no reuse terms that could be found.
- **Yad Vashem and USHMM**: terms not retrieved, or reported as permission-based.

Ethically this is the highest-risk class of source. Surname-level displays drawn from these databases imply that a family were victims and, for Holocaust sources, imply Jewish identity. That is exactly the ethnicity/religion inference the product forbids.

### Cited Findings
- Arolsen Archives terms:
  - Documents whose originals are held by Arolsen "can be published without obtaining separate publication approval", provided the Rules for Data Processing and the citation format are followed.
  - Anyone publishing personal data "must comply with the General Data Protection Regulation (GDPR)".
  - Users undertake "not to pass digital copies on to third parties", and digital versions "may not be integrated into another archive without the consent of the Arolsen Archives". "Dissemination in a private, non-commercial environment is permitted."
  - Tracing/Documentation (T/D) files less than 25 years old cannot be accessed.

  [Arolsen Terms of Service, 24 November 2022](https://arolsen-archives.org/aroa/documents/terms-of-service_en_2022-11-24.pdf)
- The Arolsen online archive holds 26 million documents with information on about 21 million names (2020). [Algemeiner, 19 April 2020](https://www.algemeiner.com/2020/04/19/online-database-with-26-million-documents-on-nazi-victims-survivors-now-online/) (search summary)
- straty.pl records victims who in September 1939 were citizens of the Second Polish Republic "(wszystkich narodowości)" (of all nationalities). Data comes from archives, from families and from publications, and the site has a GDPR (RODO) section. [straty.pl](https://straty.pl/). The database reportedly covers about 5 million people. [Radio Kielce](https://radiokielce.pl/1243334/baza-straty-pl-pomoze-zachowac-pamiec-o-ofiarach-zbrodni-niemieckich) (search summary; UNVERIFIED)
- Indeks Represjonowanych (index of people repressed under Soviet occupation):
  - Run 1988–2013 first by Archiwum Wschodnie and then by the KARTA Centre Foundation.
  - The Institute of National Remembrance (IPN) became patron in 2002 and took over the programme by an agreement of 30 April 2013.
  - The internal database has about 1.2 million records; the online database has more than 316,000.

  [indeksrepresjonowanych.pl](https://indeksrepresjonowanych.pl/)
- Warsaw Rising Museum, "Powstańcze Biogramy" (insurgent biographies): a public list showing surname, first and second name, function, pseudonym, birth date and death date, with a "Dodaj osobę" (add a person) option. [1944.pl](https://www.1944.pl/powstancze-biogramy.html). The terms page requires JavaScript and could not be read. **UNVERIFIED.**
- USHMM Holocaust Survivors and Victims Database: some collections need Yad Vashem's permission before online publication, some are viewable only in a reading room, and commercial use requires written consent and possibly a licence fee. [USHMM catalog record](https://collections.ushmm.org/search/catalog/irn524432) (search summary; UNVERIFIED)
- Yad Vashem names database: the collections page returned only a header, so the terms were not retrieved. **UNVERIFIED.**
- Katyń victim lists: not researched (search budget exhausted).

### Inferences
- **Exclude these from the MVP and from paid surfaces.** If they are ever used, it should only be in an editorially reviewed "historical context" module, with aggregate counts, explicit wording that a surname indicates neither ancestry nor religion nor fate, and partner agreements in place.
- A surname-level badge such as "appears in victim database X" would act as a proxy for ethnicity or religion. straty.pl's "all nationalities" scope and the Holocaust databases make this acute, and it conflicts with the project's standing invariants.
- The CC0 Latvian 1949 deportation list (section 4) is in the same risk class despite its open licence: an open licence is not ethical clearance.

### Gaps
- Written reuse terms for straty.pl, Indeks Represjonowanych, 1944.pl, the Katyń lists and the Yad Vashem names database, and whether any of them offer data-sharing agreements.

---

## 8. Volunteer genealogy indexes relevant to Poland (Poznań Project, BaSIA, Lubgens, PomGen, Genealogy Indexer, Gesher Galicia)

### Takeaway
These are large person-level indexes built by volunteers and free to search:

| Index | Size |
|---|---|
| Poznań Project | over 1 million marriages, 1800–1899 |
| BaSIA | 6.72 million entries |
| Lubgens | 9.61 million records |
| PomGen (PomGenBaza) | 6.74 million indexes |

No open licence or reuse terms were found for any of them, and no commercial partnership could be verified. Treat them as partners whose permission is needed, not as data sources.

### Cited Findings
- Poznań Project has indexed 19th-century marriages in historic Wielkopolska since 2000. It holds more than 1 million records from 1800–1899, about three-quarters of all marriages in that period, and is coordinated by Łukasz Bielecki with volunteers. [Poznań Project (PL)](https://poznan-project.psnc.pl/). The English home page carries a link, "Ancestry research and assistance at roots tours to Poland". [Poznań Project (EN)](https://poznan-project.psnc.pl/index.php?lang=en)
- BaSIA (WTG "Gniazdo"): "Baza zawiera 6 720 760 wpisów z całej Wielkopolski" (6,720,760 entries from all of Wielkopolska). An account is needed to index, the project is funded by donations, and the footer reads "Copyright © 2011-2025 famula.pl". [BaSIA](https://www.basia.famula.pl/en/)
- Lubgens: 9,612,096 records from 876 parishes and civil registry offices (USC) in the Lublin region, as shown on 29 September 2026. [Lubgens](https://regestry.lubgens.eu/news.php)
- PomGen (Pomorskie Towarzystwo Genealogiczne, PTG): 6,739,665 indexes in PomGenBaza, of which baptisms/births 3,511,168, marriages 894,599 and deaths 2,333,898. The footer reads "Copyright © 2026 Pomorskie Towarzystwo Genealogiczne". The published "Regulamin" is a 2011 membership regulation, not a data licence. [PTG](https://www.ptg.gda.pl/language/pl/regulamin/)
- Geneteka lists PTG, Poznań Project, BaSIA and Lubgens as "Inne bazy" (other databases). [Geneteka](https://geneteka.genealodzy.pl/)
- Genealogy Indexer was created in August 2008 by Logan Kleinwaks and is "completely free to use with no advertising". Its collections are historical directories, yizkor books, military lists and school lists, and it received an IAJGS award in 2012. [Genealogy Indexer: About](https://genealogyindexer.org/about)
- Gesher Galicia runs the All Galicia Database, with exclusive content for members. The footer reads "© Copyright 2025 Gesher Galicia – All rights reserved". The likely terms-of-use URL returned HTTP 404. [Gesher Galicia](https://www.geshergalicia.org/all-galicia-database/)

### Inferences
- These indexes are person-level and mostly cover places inside present-day Poland; Genealogy Indexer and Gesher Galicia also cover Ukraine and Galicia. The lawful route to "surname-level geographic change over time" from them is a negotiated aggregate feed (counts per surname × parish × decade), with explicit commercial terms.
- Genealogy Indexer's historical directories could show a surname's presence in cities across Eastern Europe. The underlying sources have mixed copyright status; for example, many yizkor books are still in copyright.
- Gesher Galicia, yizkor books and similar Jewish-focused sources carry the same sensitive-inference risk as section 7.

### Gaps
- Written reuse terms for all six projects, and any commercial partnerships (for example with FamilySearch, MyHeritage or Ancestry). These searches were not possible after the session's search budget ran out.

---

## 9. Synthesis: usability for a paid, aggregate-only product (as of 2026-09-29)

### Takeaway
The candidates fall into three groups:
- **Usable now:**
  - US Census surname files (2000, 2010, 2020)
  - INSEE deaths file and Fichier des noms
  - Argentina (RENAPER)
  - Finland (DVV)
  - Norway (SSB)
  - Chronicling America
  - CompGen WWI casualty lists (CC0)
- **Need a licence confirmation, permission or payment:**
  - Brazil (IBGE)
  - Switzerland (BFS)
  - Gallica
  - ANNO and the Austro-Hungarian casualty index
  - GOV
  - DFD
  - Trove
  - passagierlisten.de
  - the volunteer indexes
  - Arolsen
- **Blocked, or excluded on ethical grounds:**
  - Ellis Island
  - Ancestry-hosted Hamburg lists
  - SSDI via third parties
  - third-party mirrors of Czech and Ukrainian data
  - Holocaust and repression databases

### Cited Findings

| Candidate | Licence / commercial use | Access | Surname-level use | Main risk flags | Source |
|---|---|---|---|---|---|
| US Census 2020 last names | No licence statement on the page (likely public domain; to confirm) | XLSX download | US bearer count and rank, national; ≥100 bearers; noise ±2 | Race/Hispanic count columns: drop at ingestion; only names also ≥100 in 2010 | [2020 names](https://www.census.gov/topics/population/genealogy/data/2020_names.html), [brief](https://www2.census.gov/library/publications/decennial/2020/c2020br-14.pdf) |
| US Census 2010 surnames | CC0 (data.gov) | API (key) and files | 162,253 names; count, rank, race percentages | Race percentages; suppression | [data.gov](https://catalog.data.gov/dataset/2010-decennial-census-of-population-and-housing-surnames) |
| US Census 2000 surnames | Not stated on page | Zip CSV/XLS | 151,671 names | Race columns | [2000 page](https://www.census.gov/topics/population/genealogy/data/2000_surnames.html) |
| SSDI / DMF | NTIS sale; certification for the 3 most recent years | Subscription | Weak: no birthplace | Includes SSNs; person-level | [FR 2016](https://www.gpo.gov/fdsys/pkg/FR-2016-06-01/html/2016-12479.htm), [Wikipedia](https://en.wikipedia.org/wiki/Social_Security_Death_Index) |
| INSEE deaths file | Licence Ouverte 2.0 (commercial OK) | Bulk txt, monthly | Poland-born decedents in France by surname, year and place | Person-level; heirs' opposition (Art. 85); small cells | [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/fichier-des-personnes-decedees/) |
| INSEE Fichier des noms | Licence Ouverte 2.0 | dBase/TXT | France-born bearers by décennie × département, 1891–2000, ≥30 | Threshold; France-born only | [INSEE 3536630](https://www.insee.fr/fr/statistiques/3536630), [INSEE reuse](https://www.insee.fr/fr/information/2008466) |
| DFD (Germany) | CC BY 3.0 DE (UNVERIFIED) | Web; bot-protected | Etymology of names with ≥10 occurrences in Germany | Counts come from 2005 Telekom data | [ADW](https://www.adwmainz.de/en/research/projects/details/das-digitale-familiennamenwoerterbuch-deutschlands-dfd.html) |
| CompGen WWI Verlustlisten | **CC0; commercial explicitly allowed** | Parquet/ZIP on Zenodo | 8.5 million entries with birthplace/Kreis, 1914–1919 | Person-level deceased/wounded; duplicates | [Zenodo](https://doi.org/10.5281/zenodo.18330751) |
| CompGen Austro-Hungarian casualty index | No licence found | Web search only | 2.69 million entries with Land/Bezirk/Gemeinde (Galicia) | Permission needed | [CompGen](https://compgen.de/tag/oesterreich-ungarn) |
| GOV gazetteer | "Frei verfügbare Linked Open Data"; licence UNVERIFIED | RDF per entry | Historical place resolution | Bot protection | [CompGen GOV](https://compgen.de/?p=2736) |
| Chronicling America | Public domain / no known restrictions (check papers under 95 years old) | loc.gov API, 20 requests/min | Attestations of surnames in ≥10 Polish-language US titles | OCR noise; content, not counts | [loc.gov rights](https://www.loc.gov/item/sn83045747/?fo=json), [limits](https://www.loc.gov/apis/json-and-yaml/working-within-limits/) |
| Gallica | Commercial use paid and licensed; metadata Etalab | IIIF/API | Émigré press in France | Licence cost | [Gallica terms](https://gallica.bnf.fr/edit/und/conditions-dutilisation-des-contenus-de-gallica) |
| ÖNB ANNO | Reuse in web resolution with credit | Web | Casualty-list images | Status of commercial derivatives unclear | [ÖNB](https://www.onb.ac.at/nutzung) |
| Trove | Non-commercial by default (UNVERIFIED) | API key | Unknown Polish content | Permission needed | [Trove API](https://trove.nla.gov.au/about/create-something/using-api) |
| Argentina (RENAPER) | CC BY 4.0 | CSV | Bearers per province (>10), December 2021 | None beyond attribution | [datos.gob.ar API](https://datos.gob.ar/api/3/action/package_search?q=apellidos) |
| Brazil (IBGE Census 2022) | UNVERIFIED | Web tool; bulk unknown | Surname by state/municipality/decade (≥20/15/10) | Counts every surname component | [IBGE note](https://censo2022.ibge.gov.br/nomes/nota_tecnica/notatecnica.pdf) |
| Finland (DVV) | CC BY 4.0 | XLSX | Surnames ≥20 bearers, living Finnish citizens | None beyond attribution | [avoindata](https://avoindata.suomi.fi/data/dataset/57282ad6-3ab1-48fb-983a-8aba5ff8d29a) |
| Norway (SSB) | CC BY 4.0 | XLSX/CSV | Surnames ≥200 bearers | None beyond attribution | [SSB](https://www.ssb.no/375410/etternavn-brukt-av-200-eller-flere), [licence](https://www.ssb.no/en/diverse/lisens) |
| Switzerland (BFS) | Commercial use needs permission (UNVERIFIED) | CSV | Surnames by canton | Permission needed | [opendata.swiss](https://opendata.swiss/en/dataset/nachnamen-der-standigen-wohnbevolkerung-nach-kanton) |
| Czech Republic (Ministry of the Interior) | Not published since the 2016 data | — | — | Third-party copies of unclear legality | [CNN Prima](https://cnn.iprima.cz/urady-sedm-let-taji-udaje-o-poctu-jmen-i-prijmeni-nevime-kolik-je-krystofu-fialu-ani-gottu-412444) |
| UK (ONS) | None published | — | — | — | [ONS FOI](https://www.ons.gov.uk/aboutus/transparencyandgovernance/freedomofinformationfoi/frequencyanddistributionofthesurnameastorintheunitedkingdom) |
| Israel (CBS) | UNVERIFIED | UNVERIFIED | >50,000 surnames (2016) | **Implies Jewish ancestry** | [secondary blog](https://bloodandfrogs.com/2018/05/101-most-common-surnames-israel.html) |
| Ellis Island (Foundation) | Scraping and commercial use prohibited | — | — | Blocked | [Foundation terms](https://www.statueofliberty.org/wp-content/uploads/2026/06/terms-of-use_combined_final_2.html) |
| passagierlisten.de (Bremen) | No terms found | Web | 740,000 names with origin places, 1920–1939 | Permission needed; person-level | [Die Maus](https://www.die-maus-bremen.info/fileadmin/pdf_docs/Forschung/PL_engl.pdf) |
| Arolsen / straty.pl / Indeks Represjonowanych / 1944.pl / Yad Vashem / USHMM | Restricted, or no terms found | Web | — | **Victimhood and religion/ethnicity inference** | [Arolsen ToS](https://arolsen-archives.org/aroa/documents/terms-of-service_en_2022-11-24.pdf), [straty.pl](https://straty.pl/), [Indeks Represjonowanych](https://indeksrepresjonowanych.pl/) |
| Volunteer indexes (Poznań, BaSIA, Lubgens, PomGen, Genealogy Indexer, Gesher Galicia) | No terms found; "all rights reserved" footers | Web search | Large person-level indexes | Permission needed; Gesher Galicia is Jewish-focused | See section 8 sources |

### Inferences
- Suggested ingestion order for diaspora evidence:
  1. **US Census 2000, 2010 and 2020**, which answer "how many in the US".
  2. **INSEE Fichier des noms plus the INSEE deaths file**, which answer "where and when in France", with Poland-born provenance.
  3. **CompGen WWI casualty lists (CC0)**, which show the 1914–1919 distribution across the German Empire and Ruhr areas.
  4. **Argentina RENAPER**, with **Brazil IBGE** once its licence is confirmed.
  5. **Finland and Norway**, for small but clean current counts.
  6. **Chronicling America**, for dated, citable attestations.
- How these map onto the project's evidence chain (Source → SourceRecord → EvidenceItem → Claim → ConfidenceAssessment → Citation):
  - For the statistical tables, each **SourceRecord** is one published row (surname × geography × period).
  - The **ConfidenceAssessment** should record: thresholds (absence is not zero), noise (US 2020), how name components were counted (Brazil), the fact that casualty-list counts are entries rather than unique people, and the diacritic stripping and variant-matching assumptions.
  - The **Claim** should state the variant rule it depends on (for example, WIŚNIEWSKI mapped to WISNIEWSKI).
- Sensitive-category controls are needed in three places:
  - Drop race columns (US) at ingestion.
  - Exclude the Israeli counts.
  - Exclude persecution databases and the Latvian deportation list from any surname-level display.

### Gaps
- Licences still to confirm before paid use: US 2020 (explicit statement), Brazil (IBGE), DFD, GOV, Switzerland (BFS), Statbel surnames.
- Still unresearched because the session's search budget ran out: Belarus, Australia, Katyń lists, Yad Vashem terms, commercial partnerships of the volunteer indexes, and Czech status after 2023.
