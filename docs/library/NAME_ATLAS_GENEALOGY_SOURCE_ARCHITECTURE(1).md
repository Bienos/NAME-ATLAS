# NAME ATLAS — Genealogy Source Architecture

## 1. EXECUTIVE SUMMARY

Poniższy research prowadzi do ważnej korekty koncepcji Name Atlas: **technicznie da się uruchomić wiarygodny produkt surname-level bez płatnych komercyjnych baz genealogicznych, ale person-level genealogy wymaga partnerstw, licencji i znacznie mocniejszego systemu evidence.**

Największym błędem byłoby zbudowanie produktu, który automatycznie przeszukuje publiczne strony genealogiczne tylko dlatego, że są dostępne w przeglądarce. W kilku kluczowych bazach jest to wprost zabronione albo prawa komercyjne nie są potwierdzone.

---

## Co realnie można zbudować

### PHASE 1 — Surname Intelligence

Po samym nazwisku Name Atlas może legalnie i automatycznie zbudować warstwę opartą na:

- aktualnej krajowej liczbie osób noszących nazwisko w Polsce;
- rankingu / rarity;
- normalizacji nazwiska;
- współczesnych i historycznych nazwach miejscowości;
- geokodowaniu;
- wystąpieniach nazwiska w prawidłowo licencjonowanych książkach, gazetach, katalogach i publikacjach;
- source-attested wariantach;
- public-domain historycznych źródłach;
- globalnych otwartych metadanych;
- citation/provenance layer.

Oficjalny otwarty zbiór PESEL daje aktualną liczbę wystąpień nazwiska i jest dostępny przez dane.gov.pl/API, ale **nie potwierdziłem w aktualnym otwartym zbiorze pola województwo/powiat/gmina**. Nie należy więc budować „aktualnej mapy Polski 2026” na założeniu, że PESEL open data taką geografię udostępnia.

Źródło:  
https://dane.gov.pl/pl/dataset/1681%2Cnazwis

### Pierwszy duży brak danych

IJP PAN jest prawdopodobnie najlepszym kandydatem do:

- etymologii;
- prawdopodobnego pochodzenia;
- historycznych zapisów;
- morfologii;
- wariantów;
- geograficznego rozmieszczenia.

Ale obecna geografia w słowniku wykorzystuje wcześniejsze dane PESEL, a **nie znalazłem publicznego API ani jednoznacznej licencji pozwalającej Name Atlas kopiować bazę do komercyjnego produktu**. To powinien być jeden z pierwszych kontaktów partnerskich.

**Status:** `UNCONFIRMED — CONTACT IJP PAN`.

---

## Najważniejsza granica produktu

### SURNAME OCCURRENCE

> „Nazwisko X występuje w księdze/parafii/gazecie z 1884 roku.”

może być prawidłową informacją surname-level.

### ANCESTOR MATCH

> „Ta osoba była Twoim przodkiem.”

wymaga osobnej identyfikacji osoby i evidence.

**Nigdy nie wolno automatycznie przechodzić z pierwszego do drugiego.**

---

## Co zmienia dodanie regionu?

Bardzo dużo dla researchu, ale nie zmienia go magicznie w genealogię.

`SURNAME + REGION`

pozwala:

- ograniczyć właściwe parafie;
- ograniczyć archiwa;
- znajdować lokalne warianty;
- policzyć wystąpienia nazwiska w konkretnym korpusie;
- budować historical hotspot map;
- znaleźć najstarszy **odnaleziony w naszym korpusie** zapis dla regionu;
- ustalić historyczne nazwy miejscowości i administrację.

Nie pozwala nadal powiedzieć:

> „To jest Twój przodek.”

---

## Co zmienia osoba?

Dopiero:

`FIRST NAME + SURNAME + APPROX. YEAR + LOCATION`

otwiera prawdziwy person-resolution pipeline:

```text
Jan [surname]
~1900
Mazowsze

          ↓

birth / baptism
marriage
death
addresses
parents
spouse
children
military
migration
newspapers
cemetery
```

Wtedy można budować:

**candidate persons**, nie automatycznie confirmed ancestors.

---

# 2. MASTER SOURCE DATABASE

Poniżej 64+ istotne źródła. Statusy `OPEN`, `PARTNER`, `UNCONFIRMED`, `NO AUTOMATION` odnoszą się do potencjalnego wykorzystania przez Name Atlas, nie do jakości merytorycznej źródła.

## A. Polska

| # | Source | Owner | Poziom | Główne dane | Technical access | Commercial status | NA Tier |
|---:|---|---|---|---|---|---|---:|
| 1 | **PESEL surnames / dane.gov.pl** | Ministerstwo Cyfryzacji | surname | aktualna liczba osób | API + CSV/XLSX/JSONLD | open public-sector reuse | **1** |
| 2 | **IJP PAN – ISNP** | IJP PAN | surname | etymologia, historia, geografia, warianty | web | **UNCONFIRMED** | Partner |
| 3 | **Geneteka** | PTG | person | B/M/D indexes, parents, spouses | web search | commercial **UNCONFIRMED** | 3 |
| 4 | **Skanoteka** | PTG | document/person | scans | web | commercial **UNCONFIRMED** | 3 |
| 5 | **Metryki** | PTG | document/person | metryki/scans | web | commercial **UNCONFIRMED** | 3 |
| 6 | **GenBaza** | Fundacja Centrum Rodziny | document | scans + indexes | web | automated scraping prohibited | 4/5 |
| 7 | **BaSIA** | WTG Gniazdo | person | Wielkopolska indexes | web | **UNCONFIRMED** | 3 |
| 8 | **Poznan Project** | community project | person | XIX-c. marriages | web | **UNCONFIRMED** | 3 |
| 9 | **PomGenBase** | PTG Gdańsk | person | Pomorze indexes | web | **UNCONFIRMED** | 3 |
| 10 | **Lubgens** | Lubelskie TG | person | regional B/M/D | web | **UNCONFIRMED** | 3 |
| 11 | **Świętogen** | regional genealogy | person | persons/parents/spouse/place | web | **UNCONFIRMED** | 3 |
| 12 | **Genealogia w Archiwach** | AP Bydgoszcz/Toruń | person/document | civil/parish/population | web | API/use **UNCONFIRMED** | 3 |
| 13 | **Szukaj w Archiwach** | NAC / State Archives | archive/document | archival descriptions + scans | web | item-specific/open reuse | 2–4 |
| 14 | **Archiwa Państwowe** | NDAP | archive | nationwide holdings | catalogue | public-sector/item-specific | 2–4 |
| 15 | **PRADZIAD** | NDAP legacy | collection | register holdings | migrated/legacy | use SwA instead | legacy |
| 16 | **SEZAM** | NDAP legacy | archival catalogue | fonds/descriptions | legacy | use SwA/ZoSIA | legacy |
| 17 | **ZoSIA** | NAC | archive system | descriptions → SwA | institutional | via SwA | infrastructure |
| 18 | **AGAD** | Archiwum Główne Akt Dawnych | archive/document | church/civil/state records | catalogue/scans | item-specific | 4 |
| 19 | **Polona** | Biblioteka Narodowa | document/OCR | books, newspapers, directories | **API + IIIF** | rights per item | **1/2** |
| 20 | **Biblioteka Narodowa** | BN | metadata/document | catalogues/digital collections | APIs/Polona | item-specific | 1/2 |
| 21 | **FBC** | Poznańskie Centrum Superkomputerowo‑Sieciowe | aggregator | digital library metadata | OAI-PMH/OpenSearch | object rights vary | **1/2** |
| 22 | **Regional digital libraries** | many institutions | document | newspapers/books/directories | varies | item-specific | 2 |
| 23 | **TERYT** | GUS | place | current + historical admin/place IDs | **API + bulk** | commercial/free | **1** |
| 24 | **GUS geocoder** | GUS | place | geocoding/identification | **REST/JSON** | commercial/free + attribution | **1** |
| 25 | **IPN Straty.pl** | IPN | person | victims/repression/WWII | web search | commercial/API **UNCONFIRMED** | 3/4 |
| 26 | **Indeks Represjonowanych** | KARTA/IPN ecosystem | person | Soviet repression | search/data | **UNCONFIRMED** | 4 |
| 27 | **WBH / CAW** | Wojskowe Biuro Historyczne | person | military dossiers/lists | web/manual | API/commercial **UNCONFIRMED** | 4 |
| 28 | **Grobonet** | local cemeteries / vendor | person/cemetery | graves/burials | web | reuse highly restricted | **5** |
| 29 | **Nekrolog.pl** | commercial | obituary | death notices | web | commercial extraction unconfirmed/restricted | 5 |
| 30 | **JRI-Poland** | JRI-Poland | person | Polish Jewish vital records indexes | database | commercial requires written consent | 3 |
| 31 | **JewishGen** | JewishGen | person/place | Jewish genealogy, cemeteries, Holocaust | web | automation/commercial **UNCONFIRMED** | 3 |
| 32 | **JewishGen Gazetteer** | JewishGen | place | historic place aliases | web | machine use **UNCONFIRMED** | 3 |
| 33 | **Arolsen Archives** | Arolsen Archives | person/document | Nazi persecution/displacement | search/scans | publication rights vary | 4 |
| 34 | **Gajl – Herbarz Polski** | T. Gajl / publisher | surname/heraldry | surname↔arms references | web/book | commercial DB use **UNCONFIRMED** | 4 |
| 35 | **Wielka Genealogia Minakowskiego** | M. J. Minakowski | person | elite/nobility genealogy | web/subscription | automation restricted | 4 |
| 36 | **Niesiecki via public-domain scans** | historical | heraldry | families/herbs | Polona etc. | rights-filtered public domain | 2 |
| 37 | **Boniecki via PD scans** | historical | heraldry | Polish nobility | Polona etc. | rights-filtered PD | 2 |
| 38 | **Uruski via PD scans** | historical | heraldry | nobility/families | Polona etc. | rights-filtered PD | 2 |
| 39 | **Paprocki via PD scans** | historical | heraldry | heraldry/genealogy | digital libraries | rights-filtered PD | 2 |

PESEL is especially attractive because the source is official and machine-readable. The current 2026 resource exposes surname and number of occurrences, while Polish public-sector reuse rules expressly contemplate commercial reuse subject to applicable conditions.

Źródło:  
https://dane.gov.pl/pl/dataset/1681%2Cnazwis

Geneteka is extremely valuable, but PTG expressly describes its resources as protected databases and reserves rights against unauthorized extraction/reuse of substantial parts. The public permission it states covers scientific, educational, popularization and hobby uses; that is **not enough to infer permission for a commercial Name Atlas ingestion pipeline**.

Źródło:  
https://geneteka.genealodzy.pl/ogenetece.php

GenBaza is clearer still: its current terms explicitly prohibit mass/serial use by bots, scripts, crawlers or scrapers without prior written consent, as well as automated mass downloads.

Źródło:  
https://genbaza.pl/regulamin

---

## B. Global

| # | Source | Coverage | Level | Main value | API/bulk | Commercial position | Tier |
|---:|---|---|---|---|---|---|---:|
| 40 | **FamilySearch** | global, strong EU/USA | person/tree/records/place | records + tree + places | **official API** | commercial integration requires compatibility review | 3 |
| 41 | **Ancestry** | global/USA/UK | person | records/tree/DNA | no public broad records API identified | scraping/commercial reuse restricted | 5/partner |
| 42 | **MyHeritage** | global/EU | person/tree | records/matches/tree | partner APIs | automated extraction restricted | partner |
| 43 | **Findmypast** | UK/IE/US/global | person | census/newspapers/records | partner/corporate | systematic extraction restricted | partner |
| 44 | **Geneanet** | Europe/global | person/tree | trees/records/indexes | no suitable public production API identified | automation restricted | partner |
| 45 | **Geni** | global | person/tree | collaborative world tree | API exists | commercial use needs review | partner |
| 46 | **WikiTree** | global | person/tree | collaborative genealogy | API/read tools | commercial terms **UNCONFIRMED** | 3/partner |
| 47 | **FamilyTreeDNA** | global | DNA/person | genetic genealogy | user/partner access | sensitive/contractual | 4 |
| 48 | **BillionGraves** | global | cemetery/person | cemetery records/images | partner/API ecosystem | commercial reuse **UNCONFIRMED** | partner |
| 49 | **Find a Grave** | global | cemetery/person | memorials/graves | web | machine/commercial **UNCONFIRMED** | partner/manual |
| 50 | **Open Archives** | NL + Europe | person/records | structured archival genealogy | **OpenAPI + OAI-PMH** | provider-level rights | **1/2** |
| 51 | **Europeana** | Europe | metadata/document | cultural heritage aggregator | **API** | metadata CC0; object rights per item | **1/2** |
| 52 | **Internet Archive** | global | document/OCR | books/directories/newspapers | APIs/downloads | item-specific | 1/2 |
| 53 | **Google Books** | global | book/OCR | published books | API | paid-app commercial terms problematic | 5 unless agreement |
| 54 | **HathiTrust** | global | books/OCR | digitized literature | research infrastructure | production access limited | 4 |
| 55 | **NARA Catalog** | USA | person/document | immigration/military/naturalization | **API + bulk** | US-federal/open + item-specific | 2 |
| 56 | **Library of Congress / Chronicling America** | USA | document/OCR | newspapers | **API + IIIF/text** | rights per material | 2 |
| 57 | **UK National Archives Discovery** | UK | archive/document | government/war/probate etc. | **API** | API restrictions incl. caching | 2 |
| 58 | **Deutsche Digitale Bibliothek** | Germany | metadata/document | German digital heritage | API/LOD | metadata largely open; object rights vary | 2 |
| 59 | **Matricula Online** | Europe | parish registers | scans | web | images non-commercial licence | 4/5 |
| 60 | **Ellis Island / SOLEIF** | USA immigration | person | passenger records | web | automation/commercial **UNCONFIRMED** | partner/manual |
| 61 | **GeoNames** | global | place | names/aliases/coordinates | API + full dumps | CC BY; commercial allowed | **1** |
| 62 | **Wikidata** | global | entity/place/person | aliases/entities/external IDs | SPARQL/dumps/API | CC0 structured data | **1** |
| 63 | **OpenStreetMap** | global | place/map | modern geographic graph | API/dumps | ODbL/commercial allowed | **1** |
| 64 | **Getty TGN** | global/historical | place | historical place names/types | LOD/SPARQL/full data | ODC-By | **1** |
| 65 | **World Historical Gazetteer** | global/historical | place | historical place aggregation | API/research | aggregate CC BY-NC | **5 commercial / research only** |
| 66 | **OpenHistoricalMap** | global/historical | place/map | time-aware geography | APIs/download | mostly open; per-element rights | 1/2 |
| 67 | **Meyers Gazetteer** | German Empire | place | 1871–1918 towns/admin | web | reuse/API **UNCONFIRMED** | 3/4 |
| 68 | **Kartenmeister** | former German East | place | German/Polish locality crosswalk | web | reuse/API **UNCONFIRMED** | 3/4 |

FamilySearch is important because it is one of the few major genealogy platforms with a documented developer program. Production/Beta API keys require compatibility review, and solutions intended for commercial distribution are expected to go through that process. Its general site terms separately prohibit bulk scraping/harvesting and commercial reuse absent permission, so **web scraping is not an alternative to the approved developer route**.

Źródła:  
https://www.familysearch.org/developers/docs/guides/implementation-cert  
https://developers.familysearch.org/main/docs/compatibility-review-process

---

# 3. API MATRIX

## Sources I would actually consider integrating programmatically

| Source | API | Auth | Rate/bulk | Local storage | Recommended role |
|---|---|---|---|---|---|
| PESEL / dane.gov.pl | **YES** | public portal | downloadable resources | yes under applicable open-data conditions | current counts |
| TERYT | **YES** | account registration | full current + historical catalogues | yes | canonical Polish places/admin |
| GUS Geocoder | **YES REST/JSON** | docs | production service | yes, subject attribution | PL geocoding |
| Polona | **YES + IIIF** | documented | programmatic | rights dependent | OCR/historical evidence |
| FBC | **OAI-PMH / OpenSearch** | public | harvesting | metadata yes; items rights dependent | library discovery |
| Europeana | **YES** | free account/API key | project keys for higher use | metadata CC0 | EU discovery |
| GeoNames | **YES + dump** | username | free: 10k credits/day, 1k/h | yes under CC BY | global geocoding |
| Wikidata | **YES/SPARQL/dumps** | generally public | endpoint policy | CC0 | entity linking |
| Getty TGN | **LOD/SPARQL/dump** | public | monthly full datasets | yes ODC-By | historical place resolver |
| OSM data | APIs/dumps | varies | public Nominatim heavily limited | yes under ODbL | basemap/place data |
| OpenHistoricalMap | API/download | open | varies | rights per element | time-aware map |
| Open Archives | **YES** | API | documented 4 req/s | provider rights matter | structured records |
| NARA | **YES** | API key available | API + bulk AWS | item rights | US records |
| LOC/Chronicling America | **YES** | public | JSON/IIIF/text | rights dependent | US newspapers |
| UK TNA | **YES** | public/developer | ~3k/day, ~1/sec guidance | **API content caching restricted** | UK archives |
| FamilySearch | **YES** | OAuth/API key | certified app | governed by compatibility terms | future person research |

TERYT is particularly clean: GUS states explicitly that the ws1 service is intended for both public administration **and commercial entities**, and that both the service and data are free. It supports current and historical TERC/SIMC/ULIC data.

Źródło:  
https://api.stat.gov.pl/Home/TerytApi?lang=en

GUS's geocoding API explicitly states that commercial and non-commercial use is allowed free of charge provided the source is credited.

Źródło:  
https://geo.stat.gov.pl/api/fts/

GeoNames explicitly allows commercial use under CC BY; the free service currently permits 10,000 credits/day and 1,000/hour per application. Premium service/data exists if Name Atlas needs stronger SLA or higher limits.

Źródło:  
https://www.geonames.org/export/

---

# 4. LICENSING / COMMERCIAL USE MATRIX

This is where many genealogy products get into trouble.

| Classification | Meaning for Name Atlas |
|---|---|
| **OPEN-COMMERCIAL** | ingestion/use commercially viable under stated licence/conditions |
| **OPEN-METADATA / ITEM-SPECIFIC** | metadata can be used; scan/image must be checked separately |
| **PARTNERSHIP REQUIRED** | source potentially excellent but need explicit commercial agreement |
| **UNCONFIRMED** | no reliable public basis found for intended use |
| **NO-AUTOMATION / DO NOT INGEST** | terms currently conflict with proposed automated pipeline |

### Strongest commercial/open sources

| Source | Metadata | Scan/image | Commercial report | Cache | Attribution |
|---|---|---|---|---|---|
| PESEL open data | open | n/a | YES | YES | follow portal terms |
| TERYT | open/free | n/a | YES | YES | source good practice |
| GUS geocoder | API | n/a | YES | YES | **required source attribution** |
| Wikidata | **CC0** | linked objects differ | YES | YES | not legally required for structured CC0, good provenance anyway |
| GeoNames | **CC BY** | n/a | YES | YES | **required** |
| Getty TGN | **ODC-By** | n/a | YES | YES | required incl. source/contributor guidance |
| OSM | **ODbL** | map/render implications | YES | YES | **required**, share-alike/database obligations |
| Europeana metadata | **CC0** | item-specific | YES metadata | YES | provenance recommended |
| Polona | item-specific metadata | item-specific | YES only where rights permit | rights-dependent | preserve attribution/source |
| SwA | descriptions generally reusable unless marked otherwise | public domain/state/third-party depending item | YES where rights permit | rights-dependent | source/archive recommended |

Europeana makes a very useful distinction for architecture: **all Europeana metadata are CC0**, but the actual digital object must be handled according to the rights statement displayed with that object.

Źródło:  
https://pro.europeana.eu/post/europeana-and-the-fair-principles-for-research-data

Szukaj w Archiwach does something similar: unless otherwise marked, materials may be public domain; state-owned material can fall under public-sector reuse rules; third-party materials marked with restricted rights require permission.

Źródło:  
https://www.szukajwarchiwach.gov.pl/warunki-i-regulamin-serwisu

---

# Sources requiring negotiation

### IJP PAN
`UNCONFIRMED — CONTACT PROVIDER`

Need explicit answer on:

- API/bulk export;
- commercial derivative reports;
- caching;
- extracted etymologies;
- historical variants;
- geographic data;
- citation requirements.

### PTG / Geneteka / Skanoteka / Metryki
`UNCONFIRMED FOR COMMERCIAL PRODUCT — CONTACT PTG`

The source expressly grants some non-commercial/scientific/educational use and protects the database from substantial extraction/reuse.

Źródło:  
https://geneteka.genealodzy.pl/ogenetece.php

### JRI-Poland
**Explicitly ask permission.**

JRI says its database is for personal non-commercial family history and certain attributed publication uses; professional/commercial genealogy requires written request/consent, and spreadsheets/indices/extracts cannot be republished without permission.

Źródło:  
https://jri-poland.org/terms-of-use/

### FamilySearch
Use only via approved developer relationship for the relevant commercial functionality.

Źródło:  
https://developers.familysearch.org/main/docs/compatibility-review-process

---

# Sources I would NOT scrape

## GenBaza

Current rules explicitly prohibit automated mass access without written consent.

Źródło:  
https://genbaza.pl/regulamin

## FamilySearch website

General ToS prohibit bulk download, scraping and commercial reuse without prior written permission. Use the developer programme instead.

Źródło:  
https://www.familysearch.org/hy/legal/terms

## Grobonet

The cemetery data-use terms identified in research do not support republishing the database in a commercial surname product.

## Commercial genealogy platforms

Do not build production search bots against:

- Ancestry;
- MyHeritage;
- Findmypast;
- Geneanet.

Treat these as partnership opportunities, not scrape targets.

---

# 5. EU DATABASE RIGHTS — important

Even when individual facts such as:

> Jan Kowalski — 1902 — Warszawa

may not themselves be copyrightable, an EU database can have separate **sui generis database protection** against extraction/re-utilisation of substantial parts and against certain repeated systematic extraction.

Therefore:

> **“It is public on the web” is not a licence.**

Name Atlas needs a `RightsProfile` on every connector and ideally every object.

---

# 6. DATA RIGHTS MODEL

I would put this directly in the backend.

```text
RightsProfile

source_id
terms_version
checked_at

metadata_rights
image_rights
transcription_rights
database_rights

automated_access:
    allowed
    prohibited
    permission_required
    unknown

commercial_use:
    allowed
    conditional
    prohibited
    unknown

redistribution:
    allowed
    conditional
    prohibited
    unknown

local_cache:
    allowed
    limited
    prohibited
    unknown

attribution_required
attribution_text

source_owner
rights_url
contact_required
notes
```

**Rule:** if `commercial_use = unknown`, content cannot silently enter paid report generation.

---

# 7. AUTOMATION MATRIX

Scale:

**5** — structured/open production source  
**4** — stable downloadable/searchable data  
**3** — technically searchable but legal/operational agreement needed  
**2** — difficult/manual-heavy  
**1** — predominantly human research  
**0** — unsuitable under present terms

| Source | Automation | Legal confidence | Data value |
|---|---:|---|---|
| PESEL open | **5** | HIGH | HIGH |
| TERYT | **5** | HIGH | HIGH |
| GUS geocoder | **5** | HIGH | HIGH |
| Wikidata | **5** | HIGH | HIGH |
| GeoNames | **5** | HIGH | HIGH |
| Getty TGN | **5** | HIGH | HIGH |
| Europeana metadata | **5** | HIGH | MED/HIGH |
| FBC metadata | **4–5** | MED/HIGH | HIGH PL |
| Polona open-rights subset | **4–5** | HIGH if rights-filtered | HIGH |
| OpenHistoricalMap | **4** | MED/HIGH | MED |
| Open Archives | **5** | MED/HIGH | HIGH |
| NARA | **5** | HIGH metadata | HIGH US |
| LOC newspapers | **5** | HIGH metadata | HIGH US |
| TNA | **4** | HIGH | HIGH UK |
| IJP PAN | **2 until agreement** | LOW | **VERY HIGH** |
| Geneteka | **3 after agreement** | LOW now | **VERY HIGH** |
| SwA | **3–4 data dependent** | MED | VERY HIGH |
| FamilySearch | **4 after approval** | HIGH once contracted | VERY HIGH |
| JRI-Poland | **3 after permission** | HIGH once agreed | HIGH |
| IPN | **2–3** | LOW now | HIGH |
| Arolsen | **2** | MED | HIGH |
| WBH | **1–2** | LOW | HIGH |
| GenBaza | **0 without permission** | HIGH prohibition | HIGH |
| Grobonet | **0 default** | MED/HIGH | MED |
| Ancestry web | **0** | HIGH restriction | VERY HIGH |
| MyHeritage web | **0** | HIGH restriction | VERY HIGH |

---

# 8. DATA RELIABILITY MATRIX

The most important distinction is not simply „good source / bad source”.

## Level A — primary/official record

Examples:

- civil birth record;
- parish baptism;
- census;
- passenger manifest;
- military file.

High evidential weight about the **recorded event**, although originals can still contain mistakes.

## Level B — authoritative index/transcription

Examples:

- Geneteka index;
- archival catalogue;
- official transcription.

Good discovery evidence, but ideally point to the original.

## Level C — scholarly secondary source

Examples:

- onomastic dictionary;
- scholarly heraldic study.

Good for interpretation.

## Level D — tertiary / community/user tree

Examples:

- unsourced tree;
- crowdsourced claim.

Useful lead, not proof.

### Critical rule

**Source reliability and identity-match confidence are separate variables.**

A perfect birth certificate about **the wrong Jan Kowalski** is not useful evidence about the user's ancestor.

---

# 9. SURNAME-ONLY RESEARCH CAPABILITY

| Data | Automatable? | Surname-specific? | User/ancestor-specific? | Safe wording |
|---|---|---|---|---|
| Current national count | **YES** | YES | NO | “X people currently carry this surname” |
| National rarity/rank | YES | YES | NO | rank/rarity |
| Current regional distribution | PARTIAL | YES | NO | only with licensed/current geography |
| Etymology | PARTIAL | YES | NO | “probable/attested etymology” |
| Linguistic structure | PARTIAL | YES | NO | sourced interpretation |
| Historical variants | YES/PARTIAL | YES | NO | “attested variants” |
| Candidate spelling variants | YES | candidate | NO | “search variants” |
| Historical appearances | YES | YES | NO | “surname appears in…” |
| Historical places | YES/PARTIAL | YES | NO | “recorded in sources around…” |
| Oldest occurrence | PARTIAL | source-relative | NO | “earliest occurrence found in our sources” |
| Diaspora | PARTIAL | YES | NO | modern/historical surname distribution |
| Migration | PARTIAL | surname-level inference | NO | “distribution suggests…” |
| Archive references | YES/PARTIAL | YES | NO | “records containing surname” |
| Newspaper occurrences | YES in open OCR | YES | NO | occurrence only |
| Cemetery occurrences | technically yes where licensed | YES | NO | no ancestor claim |
| Military records | PARTIAL | YES | NO | surname hits |
| Repression/war | PARTIAL | YES | NO | surname hits |
| Heraldic references | PARTIAL | YES | **NO** | “families bearing this surname appear…” |

### The biggest wording difference

BAD:

> **Najstarszy Cichowski żył w 1748 roku.**

GOOD:

> **Najstarszy zapis tego nazwiska odnaleziony dotąd w przeszukanych przez Name Atlas źródłach pochodzi z 1748 roku.**

Those are very different claims.

---

# 10. SURNAME + LOCATION CAPABILITY

Region is the first genuinely useful user-provided enrichment.

```text
SURNAME
   ↓
normalise variants
   ↓
REGION / PLACE
   ↓
resolve present + historical jurisdiction
   ↓
identify archives / parishes / collections
   ↓
search surname occurrences
   ↓
normalise historical place names
   ↓
cluster occurrences by period/place
   ↓
rank likely surname hotspots
   ↓
SOURCE-BACKED REPORT
```

## What improves

### 1. Archive selection

Instead of searching all Poland, we know:

- relevant State Archive;
- potential parish;
- civil registration district;
- historic administrative entity.

### 2. Historical spelling

Variant can be evaluated in geographic context.

For example a Germanised spelling becomes more relevant in a specific former Prussian jurisdiction than randomly across Poland.

### 3. Historical hotspot

You can generate:

> **Within the indexed sources we searched, the surname appears most often around X between 1840–1890.**

Not:

> **This is where your family came from.**

### 4. Earliest regional occurrence

Possible wording:

> **Earliest occurrence found in available sources for this region: 1814.**

---

# 11. PERSON-LEVEL CAPABILITY

Now assume:

```text
FIRST NAME
SURNAME
YEAR ±5
PLACE
```

The pipeline can look for:

| Evidence | Automation |
|---|---|
| birth/baptism | high with structured index |
| marriage | high |
| death | high |
| parents | high if indexed |
| spouse | high if indexed |
| children | reconstructable |
| siblings | reconstructable |
| parish | high |
| residence/address | source-dependent |
| occupation | source-dependent |
| immigration | medium/high |
| naturalization | medium/high |
| passenger list | medium/high |
| military | source-dependent |
| burial | source-dependent/licensing |
| newspapers | OCR/fuzzy search |
| probate | geography-dependent |
| land/tax | often difficult/manual |

But every result begins as:

# CANDIDATE RECORD

not:

# YOUR ANCESTOR

---

# 12. RECORD MATCHING ARCHITECTURE

I would not use one opaque AI score.

## Step 1 — preserve original

```text
raw_given_name
raw_surname
raw_place
raw_date
raw_document_text
```

Never destroy historical spelling.

---

## Step 2 — normalized representations

Generate separately:

```text
unicode_normalized
diacritic_folded
transliterated
phonetic_keys
attested_variants
candidate_variants
```

Never overwrite original.

---

## Step 3 — candidate generation

Broad retrieval based on:

- exact surname;
- normalized surname;
- attested variants;
- phonetic representations;
- given-name variants;
- year window;
- region/parish vicinity.

---

## Suggested matching features

| Feature | Strength |
|---|---|
| exact surname | medium |
| uncommon surname variant match | high |
| exact first name | medium |
| first-name variant | medium |
| DOB exact | very high |
| approximate year | medium |
| exact parish | high |
| nearby town | medium |
| same parents | **very high** |
| same spouse | **very high** |
| same children/siblings | high |
| same address | high |
| same occupation | low–medium |
| chronological consistency | mandatory |
| multiple independent records | very high |

---

## Internal ranking score example

This is a **RECOMMENDATION**, not a probability.

```text
surname                 0–15
given name              0–10
date compatibility      0–10
place/parish            0–15
parents                  0–20
spouse                   0–10
siblings/children        0–5
address/occupation       0–5
chronology               0–5
independent evidence     0–5
```

### User-facing labels

**STRONG CANDIDATE**

Multiple discriminating fields agree and no material contradiction.

**MODERATE CANDIDATE**

Plausible but insufficient corroboration.

**WEAK CANDIDATE**

Name/date/place similarity with substantial ambiguity.

**REJECTED**

Hard contradiction.

Do **not** show:

> 87% chance this is your grandfather

until the model has actually been calibrated against a large, labelled set of true and false matches.

---

# 13. HARD CONTRADICTIONS

These should often beat a high similarity score.

Examples:

- person dies before alleged later event;
- incompatible parents;
- simultaneous family events thousands of kilometres apart;
- child born before plausible parent age;
- two established spouses at incompatible timelines;
- confirmed different occupation/address combined with other contradictory fields;
- different birth date where source reliability is very high.

---

# 14. HISTORICAL NAME NORMALISATION

This is one of the future moats.

## Store at least four concepts separately

### ORIGINAL FORM
As printed/written.

### SOURCE-ATTESTED VARIANT
Actually found in a source.

### LINGUISTIC NORMALISATION
A defensible representation.

### SEARCH CANDIDATE
Machine-generated form used to improve recall.

The last category **must never automatically become a claimed historical variant**.

---

## Problems the system must handle

- Polish diacritics;
- German orthography;
- Russian Cyrillic;
- Latin ecclesiastical forms;
- Yiddish/Hebrew records;
- transliteration;
- OCR;
- clerk-specific spelling;
- gender forms;
- double surnames;
- noble predicates/forms;
- patronymics.

Examples such as:

`ł ↔ l`  
`w ↔ v`  
`cz ↔ tsch`  
`-ski ↔ -sky/-skiy`

are useful **candidate-generation patterns**, not universal transformations.

---

## Tools worth using

### Unicode ICU

Useful for deterministic Unicode normalization/transliteration.

### Daitch–Mokotoff Soundex

Designed specifically to improve phonetic matching of Central/Eastern European and Jewish names relative to ordinary Soundex.

### Beider–Morse Phonetic Matching

Useful as another candidate-generation feature for multilingual family names.

**Do not use phonetic equality as identity evidence.**

Its role is:

> „Which candidates should we search?”

not:

> „These two people are the same.”

---

# 15. HISTORICAL PLACE RESOLUTION

This may be as important as surname normalization.

A place in Polish genealogy might simultaneously be recorded as:

- Polish name;
- German name;
- Russian spelling;
- Latin parish form;
- Yiddish name;
- different district;
- different country.

---

## Recommended entity

```text
HistoricalPlace

place_id

current_name
current_country
current_admin_unit
coordinates

historical_names[]
    name
    language
    script
    valid_from
    valid_to
    source

historical_admin_memberships[]
    admin_name
    polity
    valid_from
    valid_to
    source

external_ids
    TERYT
    Wikidata
    GeoNames
    GettyTGN
    OSM
    OpenHistoricalMap

confidence
provenance
```

---

## Source stack for place resolution

### Poland
1. TERYT
2. GUS geocoder
3. Wikidata

### Global/current
4. GeoNames
5. OSM

### Historical
6. Getty TGN
7. OpenHistoricalMap

### Research-only / agreements
8. Meyers
9. Kartenmeister
10. JewishGen Gazetteer

Getty is particularly attractive because TGN's Linked Open Data/full downloads are published under ODC-By and include source/contributor provenance.

Źródło:  
https://www.getty.edu/research/tools/vocabularies/obtain/download.html

GeoNames has more than 25 million geographic names, 12 million+ unique features and 16 million alternate names and is commercially usable under CC BY.

Źródło:  
https://www.geonames.org/about.html

---

# 16. MIGRATION DETECTION

Name Atlas needs two completely different concepts:

## Surname distribution movement

Example:

> surname occurrence concentration shifts between corpora/time periods.

This is population/surname-level.

## Person migration

Example:

> same person appears in Kraków in 1894 and Chicago in 1902.

This is person-level.

Do not mix them.

---

## Migration evidence model

### VERIFIED MOVE

An explicit migration/passenger/residence/naturalization record **or** strongly identified same person with direct residence evidence.

### STRONG INDICATION

Strong entity match across sequential records in different places plus corroborating evidence.

### POSSIBLE

A plausible record chain but identity is not sufficiently established.

### UNCONFIRMED

Only surname distribution or weak name similarity exists.

---

## Useful migration record types

- passenger lists;
- border crossings;
- naturalization;
- censuses;
- city directories;
- address books;
- birth/marriage/death;
- military;
- registrations;
- ship manifests.

NARA therefore becomes particularly valuable for American expansion, while Poland-first digital books/directories can be extracted from rights-cleared Polona material.

---

# 17. HERALDRY SAFETY FRAMEWORK

This is an area where Name Atlas can outperform many existing surname sites simply by being honest.

## Never say

> **Your family coat of arms is X.**

based solely on surname.

## Instead say

> **Families bearing this surname appear in heraldic sources associated with the following coats of arms. This does not establish that your family descends from those families or has a historical right to the arms.**

---

## Three levels

### HERALDIC REFERENCE

Surname occurs in a heraldic source.

### POSSIBLE LINE CONNECTION

Surname + locality + dates + relational genealogy creates plausible connection.

### DOCUMENTED LINE CONNECTION

Person-level ancestry connects the user family line to the documented historical family.

Only the third permits a materially stronger statement.

---

## Recommended sources

For MVP use rights-cleared/public-domain historical editions:

- Niesiecki;
- Boniecki;
- Uruski;
- Paprocki.

Modern Gajl and Minakowski are excellent research tools, but commercial machine reuse is **not something I would assume without permission**.

---

# 18. EVIDENCE & CONFIDENCE SYSTEM

Do not compress everything into one number.

Use **three independent dimensions**.

## A. Claim status

**VERIFIED**  
Direct evidence or strong authoritative source establishes the claim.

**LIKELY**  
Multiple pieces of evidence consistently support one interpretation.

**POSSIBLE**  
Plausible hypothesis with partial evidence.

**UNCONFIRMED**  
Lead exists but evidence is insufficient.

---

## B. Person match

**CONFIRMED PERSON**

**STRONG CANDIDATE**

**MODERATE CANDIDATE**

**WEAK CANDIDATE**

**REJECTED**

---

## C. Source type

**PRIMARY ORIGINAL**

**AUTHORITATIVE INDEX**

**SCHOLARLY SECONDARY**

**TERTIARY / USER-CONTRIBUTED**

This produces a more truthful system than:

> `Confidence: 87%`

---

# 19. KNOWLEDGE GRAPH PROPOSAL

Do not make the graph only entity-centric.

Make it **claim-centric**.

## Core entities

```text
SURNAME
NAME_VARIANT

PERSON

PLACE
ADMIN_UNIT

DATE
DATE_RANGE

EVENT

DOCUMENT
COLLECTION
ARCHIVE
SOURCE

RELATIONSHIP

CLAIM
EVIDENCE

MIGRATION_HYPOTHESIS

RIGHTS_PROFILE
```

---

## Relations

```text
PERSON
  born_in → PLACE

PERSON
  married_to → PERSON

PERSON
  child_of → PERSON

PERSON
  appears_in → DOCUMENT

DOCUMENT
  records → EVENT

DOCUMENT
  stored_in → ARCHIVE

DOCUMENT
  supports → CLAIM

CLAIM
  about → PERSON

CLAIM
  about → SURNAME

SURNAME
  attested_as → NAME_VARIANT

NAME_VARIANT
  found_in → DOCUMENT

PLACE
  part_of → ADMIN_UNIT

PLACE
  known_as → PLACE_ALIAS

EVENT
  occurred_at → PLACE

MIGRATION_HYPOTHESIS
  supported_by → EVENT

PERSON
  possibly_same_as → PERSON
```

---

## Every user-visible statement should map to a Claim

Example:

```text
CLAIM #A351

type:
surname_origin

statement:
"Possible connection with locality X"

status:
LIKELY

evidence:
E115
E119
E320

sources:
S03
S44

generated_by:
origin-model-v2

reviewed:
false

retrieved_at:
2026-09-17
```

This is how you stop an LLM from creating unsupported history.

---

# 20. EVIDENCE GRAPH > LLM

The LLM should not be the database.

Architecture:

```text
SOURCES
   ↓
NORMALISATION
   ↓
ENTITIES
   ↓
CLAIMS
   ↓
EVIDENCE
   ↓
CONFIDENCE
   ↓
LLM NARRATION
```

Not:

```text
Surname
   ↓
GPT
   ↓
story
```

The model may transform:

> 14 structured evidence objects

into readable prose.

It should not originate important factual claims without evidence nodes.

---

# 21. POLONA / DIGITAL LIBRARY STRATEGY

This could be surprisingly valuable.

Potential searchable record classes:

- newspapers;
- obituaries;
- address books;
- school yearbooks;
- telephone directories;
- trade registers;
- municipal directories;
- voter material;
- historical books;
- regional monographs;
- heraldic/genealogical publications.

Polona exposes programmatic API/IIIF access; individual object rights must still be respected. Public-domain objects can be reused commercially, while protected items need appropriate rights.

Źródło:  
https://labs.polona.pl/en/2018/07/library-of-libraries/

### Product opportunity

Instead of:

> „We found a historical archive match.”

show:

> **Surname occurrence**  
> Warsaw Directory, 1931  
> Page 482  
> Source: National Library  
> `View original`

That is tangible premium value.

---

# 22. CURRENT POLISH MAP — CRITICAL BLOCKER

This deserves explicit emphasis.

## FACT

The currently verified open PESEL surname dataset provides surname + national occurrence count.

Źródło:  
https://dane.gov.pl/pl/dataset/568/resource/1148813%2Cnazwiska-meskie-stan-na-2025-01-20/chart

## FACT

IJP PAN has regional surname geography, including voivodeships and lower territorial levels, but its geographic layer is based on an older PESEL dataset rather than current 2026 distribution.

Źródło:  
https://nazwiska.ijppan.pl/info/oslowniku

## UNCONFIRMED

Commercial right to ingest/cache/redistribute IJP PAN geography.

## RECOMMENDATION

For launch choose one:

**A.** licence the PAN/underlying dataset;  
**B.** find another current licensed source;  
**C.** label the map explicitly as a historical snapshot corresponding to its data year;  
**D.** remove regional distribution from MVP.

Do **not** fake current geography by extrapolating national PESEL totals.

---

# 23. LEGAL DATA MATRIX

I would classify every connector into one of these.

| Code | Licence/data status | Product action |
|---|---|---|
| PD | public domain | can reuse, still cite provenance |
| CC0 | unrestricted waiver | ingest/cache/commercial |
| CC BY | commercial permitted + attribution | ingest |
| CC BY-SA | commercial + attribution/share-alike | legal review of derived DB/work |
| ODC-By | database attribution | ingest with attribution |
| ODbL | open database share-alike | architect isolation carefully |
| OPEN GOV | public sector reuse | follow statutory/source conditions |
| ITEM-SPECIFIC | rights differ per object | automated rights gate |
| DB-PROTECTED | database rights | no bulk extraction without permission |
| NONCOMMERCIAL | cannot use paid product as proposed |
| PARTNER | commercial contract required |
| UNKNOWN | **block commercial use** |

---

# 24. RIGHTS GATE

Every item entering a paid report should run:

```text
Can automated access be used?
        ↓
Can metadata be cached?
        ↓
Can metadata be commercially displayed?
        ↓
Can transcription be displayed?
        ↓
Can image be displayed?
        ↓
Can derivative analysis be sold?
        ↓
What attribution is required?
```

If any answer is UNKNOWN:

```text
metadata may remain research-only
image blocked
user report blocked
```

This can be automatic.

---

# 25. IMPACT × EFFORT — MVP SOURCES

For launch in 4–8 weeks:

| Rank | Source | User impact | Integration | Legal certainty | Cost | PL coverage | Premium potential |
|---:|---|---:|---:|---:|---:|---:|---:|
| **1** | PESEL/dane.gov.pl | ★★★★★ | Low | High | Free | ★★★★★ | ★★★ |
| **2** | TERYT | ★★★★★ | Low | High | Free | ★★★★★ | ★★★★ |
| **3** | GUS Geocoder | ★★★★ | Low | High | Free | ★★★★★ | ★★★ |
| **4** | Wikidata | ★★★★ | Low/Med | High | Free | ★★★★ | ★★★ |
| **5** | GeoNames | ★★★★ | Low | High | Free initially | ★★★★ | ★★★ |
| **6** | Getty TGN | ★★★★★ | Med | High | Free | ★★★★ | ★★★★ |
| **7** | Polona | ★★★★★ | Med | High if rights-gated | Free | ★★★★★ | ★★★★★ |
| **8** | FBC | ★★★★ | Med | Medium/high metadata | Free | ★★★★★ | ★★★★ |
| **9** | Europeana | ★★★★ | Low/Med | High metadata | Free | ★★★★ | ★★★★ |
| **10** | OpenHistoricalMap | ★★★ | Med | Med/high | Free | ★★★ | ★★★★ |

### Parallel business-development track

Immediately contact:

1. **IJP PAN**
2. **PTG / Genealodzy**
3. **NAC / Archiwa Państwowe**
4. later **FamilySearch**

These four relationships could materially transform the product.

---

# 26. WHY THESE 10 FIRST?

Because they let you establish the hardest architectural components **without violating commercial database terms**:

```text
surname
↓
normalisation
↓
frequency
↓
place knowledge
↓
historical place resolution
↓
open historical documents
↓
OCR surname occurrences
↓
evidence
↓
citations
↓
rights
```

That is much more valuable architecturally than spending six weeks reverse-engineering a protected genealogy website.

---

# 27. PHASE 1 — SURNAME INTELLIGENCE

### Sources

- PESEL;
- TERYT;
- GUS geocoder;
- Wikidata;
- GeoNames;
- Getty TGN;
- Polona;
- FBC;
- Europeana;
- OHM.

### Features

- national occurrence count;
- rank;
- rarity;
- surname normalization;
- places/entities;
- rights-cleared historical publication hits;
- historical variants when actually attested;
- citations;
- possible linguistic/origin information only for licensed/curated entries.

### Biggest limitations

**Etymology:** partnership/curated data needed.

**Modern regional surname map:** current reliable rights-cleared source still needed.

### Estimated external data cost

Potentially close to **€0 at MVP traffic**, excluding hosting/development and any future licensing. GeoNames free service permits commercial use and limited free traffic; enterprise SLA/data starts as paid services if required.

Źródło:  
https://www.geonames.org/export/

---

# 28. PHASE 2 — HISTORICAL SURNAME INTELLIGENCE

### Add

- Internet Archive;
- DDB;
- NARA;
- Chronicling America;
- Open Archives;
- UK TNA;
- licensed IJP PAN ideally.

### Features

```text
Historical variants
Historical source occurrences
Historical locality index
Period-based surname maps
Old directories
Newspaper mentions
Diaspora traces
Historical publication citations
Migration clues at surname level
```

### New technical dependencies

- OCR indexing;
- fuzzy search;
- temporal place graph;
- historical map layer;
- source de-duplication;
- rights classifier.

### Biggest problem

**Corpus bias.**

If Name Atlas contains 20 excellent Wielkopolska sources and few Podlasie sources, counts cannot be presented as actual historical population distribution.

Always distinguish:

> **occurrences in the Name Atlas corpus**

from:

> **population frequency.**

---

# 29. PHASE 3 — FAMILY RESEARCH

### Partnerships/data

- FamilySearch;
- PTG;
- JRI-Poland;
- potentially IPN;
- archive workflows;
- human research.

### User inputs

```text
given name
surname
approx year
location
parents if known
spouse if known
religion if relevant/consented
migration information
```

### Product

- candidate records;
- person entities;
- family edges;
- event chronology;
- evidence graph;
- candidate migrations;
- record comparison;
- human review.

### New risk

A false surname story is undesirable.

A false claim that:

> „this is your grandfather”

is much more serious.

The confidence bar therefore has to be substantially higher.

---

# 30. 12-MONTH SOURCE ROADMAP

## Month 0–2

Build:

- Rights Registry;
- Source Registry;
- PESEL;
- TERYT;
- GUS;
- Wikidata;
- GeoNames;
- Getty;
- Polona;
- FBC;
- Europeana;
- provenance graph.

Start partnership discussions with IJP PAN/PTG.

---

## Month 2–4

Add:

- OCR index;
- Internet Archive;
- historical name normalization;
- historical place resolver;
- OpenHistoricalMap;
- first source-attested timeline.

Launch PREMIUM surname report.

---

## Month 4–6

Add:

- NARA;
- LOC newspapers;
- Open Archives;
- DDB;
- deeper diaspora;
- migration clue engine.

Release Family Origin beta.

---

## Month 6–9

Apply/complete:

- FamilySearch compatibility process;
- PTG licence;
- JRI talks;
- IPN discussion.

Build:

- Person entity;
- candidate record engine;
- evidence graph UI.

---

## Month 9–12

Build:

- human researcher console;
- reviewed matches;
- labelled matching dataset;
- family-relationship graph;
- Deep Research;
- calibrated ranking;
- Germany/UK/US source adapters.

---

# 31. BIGGEST RISKS / BLOCKERS

## 1. Etymology licence

Probably the most immediate content issue.

Do not solve it by having an LLM invent etymologies.

---

## 2. Current regional surname distribution

Needs a lawful/current data source.

---

## 3. Commercial use ≠ public availability

Geneteka demonstrates the issue perfectly: enormous user value, but commercial extraction cannot simply be inferred from free access.

Źródło:  
https://geneteka.genealodzy.pl/ogenetece.php

---

## 4. Scans vs metadata

A catalogue record may be reusable while the attached scan is not.

Europeana explicitly treats these separately.

Źródło:  
https://www.europeana.eu/pl/rights/terms-of-use

---

## 5. OCR

Historical OCR can produce false surnames.

A surname occurrence should therefore retain:

```text
OCR text
page image reference
OCR confidence if available
matched substring
variant used
document citation
```

---

## 6. Historical boundaries

Warsaw 1900 is not the same political/admin entity as Warsaw 2026.

Time-aware geography is mandatory.

---

## 7. Common surnames

`Jan Kowalski + Warsaw + 1900`

could produce hundreds of plausible people.

No amount of LLM prose solves insufficient identifying information.

---

## 8. Living people/privacy

Historical genealogy concerns deceased persons extensively, but records may include living relatives. Privacy and minimisation become especially important in Phase 3.

---

# 32. DATA MOAT

The moat is **not**:

- PESEL;
- an OpenAI prompt;
- a pretty map;
- an AI-generated paragraph explaining a surname.

Those are reproducible.

The defensible asset is:

# NAME ATLAS EVIDENCE GRAPH

Over time:

```text
surname
 ↕
attested variants
 ↕
places
 ↕
historical aliases
 ↕
time periods
 ↕
documents
 ↕
people
 ↕
events
 ↕
relationships
 ↕
migrations

+
provenance
+
rights
+
confidence
+
human-reviewed matches
```

Most importantly, every human-reviewed case teaches you:

- which variant mappings worked;
- which historical places correspond;
- which records were false positives;
- what evidence differentiated two similar people.

After thousands of reviewed cases, this becomes a genuinely valuable data asset.

---

# 33. FINAL ANSWERS TO THE 15 KEY QUESTIONS

## 1. What can Name Atlas reliably find from surname only?

**Reliably:**

- current national occurrence count;
- rarity/rank;
- basic normalized form;
- historically attested occurrences in searchable lawful corpora;
- historical spellings when actually found;
- surname references in newspapers/books/directories;
- possible associated places;
- heraldic references to families bearing the surname;
- international surname occurrences from appropriate datasets.

**Not reliably from surname alone:**

- the user's ancestral village;
- the user's family migration route;
- the user's ancestor;
- the user's coat of arms;
- the user's exact lineage.

---

## 2. What does region add?

It allows:

- archive/parish prioritisation;
- regional corpus filtering;
- historical hotspot detection;
- more meaningful variant ranking;
- local historical place resolution;
- earliest **found regional evidence**;
- better origin hypotheses.

Still no proof of the user's lineage.

---

## 3. What does first name + year + location add?

It opens:

- candidate birth/baptism;
- marriages;
- deaths;
- parents;
- spouse;
- children;
- residence;
- occupation;
- military;
- passenger lists;
- naturalization;
- cemetery;
- newspapers.

This is where genuine genealogy begins.

---

## 4. What can be automated?

Very strongly:

- open datasets;
- geography;
- normalization;
- OCR search;
- source discovery;
- candidate generation;
- deduplication;
- chronology validation;
- evidence collection;
- candidate ranking.

Partially:

- entity resolution;
- migrations;
- family reconstruction;
- historical interpretation.

---

## 5. What needs manual research?

Most often:

- unindexed archive books;
- difficult handwritten scans;
- ambiguous common-name matches;
- parish-specific research;
- military archives;
- complex heraldic lineage;
- uncertain migrations;
- conflicting records;
- high-value ancestor confirmation.

---

## 6. Which sources can be used commercially?

Among the clearest:

- PESEL open/public-sector data under applicable conditions;
- TERYT;
- GUS geocoder;
- GeoNames CC BY;
- Wikidata CC0;
- Getty TGN ODC-By;
- OSM under ODbL;
- Europeana CC0 metadata;
- rights-cleared/public-domain Polona content;
- rights-cleared SwA material;
- rights-cleared open digital-library objects.

For Europeana, metadata and objects must remain separate in the rights model.

Źródło:  
https://pro.europeana.eu/post/europeana-and-the-fair-principles-for-research-data

---

## 7. Which require partnership/licensing?

High-priority:

- **IJP PAN**
- **PTG / Geneteka / Skanoteka**
- **FamilySearch commercial integration**
- **JRI-Poland**
- potentially **IPN**
- JewishGen
- commercial genealogy platforms.

---

## 8. Which should not be used?

Without written permission:

- GenBaza automated scraping;
- Ancestry scraping;
- MyHeritage scraping;
- Findmypast scraping;
- Geneanet scraping;
- Grobonet bulk commercial reuse;
- Matricula scans in commercial reports where NC applies;
- JRI bulk/commercial ingestion without approval.

---

## 9. What 10 sources for MVP?

My choice:

1. PESEL
2. TERYT
3. GUS Geocoder
4. Wikidata
5. GeoNames
6. Getty TGN
7. Polona
8. FBC
9. Europeana
10. OpenHistoricalMap

Parallel partnership target:

**IJP PAN first.**

---

## 10. What is the largest data moat?

**A rights-aware, provenance-aware historical surname/person/place Evidence Graph, increasingly enriched by human-reviewed entity resolution.**

Not an LLM.

---

## 11. How far can we get without paid APIs?

Surprisingly far.

A credible surname-level MVP can be built primarily with free/open infrastructure.

What you **cannot cheaply reproduce from open generic APIs** is:

- top-quality Polish onomastics;
- strong current regional surname distribution;
- deep structured person genealogy;
- licensed archival indexes.

So open data can launch Name Atlas; partnerships can make it excellent.

---

## 12. Where does true Premium advantage begin?

Not at:

> „Your surname means X.”

It starts around:

> **historical evidence connected, normalised and interpreted for this surname.**

And gets much stronger at:

> **this candidate historical evidence may concern your specific family.**

So:

**FREE = information**

**PREMIUM = synthesis + historical evidence**

**FAMILY ORIGIN = personal filtering**

**DEEP RESEARCH = person resolution**

**HUMAN = verification**

---

## 13. How do we avoid confusing occurrence with ancestor match?

Make them different entity types in the architecture.

```text
SurnameOccurrence
≠
PersonCandidate
≠
ConfirmedPerson
≠
AncestorRelationship
```

And force UI language accordingly.

A `SurnameOccurrence` should technically be incapable of generating the text:

> “your ancestor”

without passing through person resolution and relationship evidence.

---

## 14. How should the Evidence Graph support AI Researcher?

The AI should retrieve:

```text
CLAIMS
+
EVIDENCE
+
SOURCE
+
RIGHTS
+
CONFIDENCE
```

and be instructed:

> Generate only propositions supported by the supplied claims.

For gaps:

> No evidence currently supports this conclusion.

This produces an AI historian that **explains evidence**, rather than an AI storyteller that fills gaps.

---

## 15. What is safe to show free vs hypothesis?

### Safe factual FREE layer

- official current national count;
- rank/rarity calculated from that source;
- exact source occurrence;
- public-domain citation;
- geographic coordinates;
- documented historical spelling;
- source date.

### Interpretation, clearly labelled

- probable linguistic origin;
- possible place connection;
- variant relationship;
- likely regional association;
- surname migration pattern.

### Must remain candidate/hypothesis until deeper evidence

- a historical person is related to the user;
- exact ancestral village;
- family migration;
- noble descent;
- coat-of-arms entitlement;
- person identity across two records.

---

# 34. Immediate action plan

Before designing deeper FAMILY RESEARCH UX, create four internal data assets:

### `SOURCE_REGISTRY`

All connectors and their capabilities.

### `RIGHTS_REGISTRY`

Terms/version/licences/commercial/caching/image rights.

### `PLACE_GRAPH`

TERYT + Wikidata + GeoNames + Getty + historical aliases.

### `EVIDENCE_GRAPH`

Starting surname-level, designed from day one to later accept persons/events/relationships.

And contact **IJP PAN and PTG immediately**. Those two relationships potentially unlock two of the strongest Poland-specific moats:

**PAN → interpretation/onomastics**

**PTG → historical person-level records**

while the open stack handles the rest.

---

# Final architecture

```text
                     NAME ATLAS
                         │
                 SURNAME INPUT
                         │
                  NORMALISATION
                         │
        ┌────────────────┼────────────────┐
        │                │                │
      PESEL           ORIGIN          PLACE GRAPH
        │                │                │
  modern count      onomastics      aliases/admin
        │                │                │
        └─────────────┬──┴────────────────┘
                      │
              VARIANT ENGINE
                      │
             HISTORICAL SEARCH
                      │
       ┌──────────────┼───────────────┐
       │              │               │
    Polona            FBC          Europeana
       │              │               │
       └──────────────┼───────────────┘
                      │
              OCCURRENCE GRAPH
                      │
             PLACE RESOLUTION
                      │
                CLAIM ENGINE
                      │
               EVIDENCE SCORE
                      │
                RIGHTS GATE
                      │
                 CITATIONS
                      │
                USER RESULT
```

Family layer:

```text
FAMILY DATA
    │
PERSON ENTITY
    │
QUERY GENERATOR
    │
CANDIDATE RECORDS
    │
NORMALISATION
    │
ENTITY RESOLUTION
    │
EVIDENCE GRAPH
    │
STRONG / MODERATE / WEAK
    │
HUMAN REVIEW when required
    │
FAMILY NARRATIVE
```

---

# Final recommendation

**RECOMMENDATION:** this should be the data foundation before finalising the paid-flow UX. It tells us precisely which discovery screens can exist, which numbers we can truthfully show in the curiosity loop, and which premium promises we are actually capable of delivering.

One final legal point: this is a product/data licensing analysis based on the currently published terms, not formal Polish/EU legal advice. Before bulk ingestion or signing launch partnerships, counsel should review the final rights matrix and the exact intended transformations/caching/report outputs.
