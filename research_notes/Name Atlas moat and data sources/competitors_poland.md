# Polish-language competitive landscape for surname information products (state as of 2026-09-29)

Evidence labels used throughout:
- **OBSERVED**: page or API fetched directly by the researcher on 2026-09-29.
- **SNIPPET**: seen only as a search-result title or summary.
- **COMPUTED**: arithmetic done by the researcher on the official dane.gov.pl PESEL xlsx files, which were downloaded on 2026-09-29.
- **INFERENCE**: the researcher's reading of the evidence.
- **UNVERIFIED**: could not be confirmed.

## 1. Which sites/apps a Polish-speaking user meets for each surname query type (example-surname tests)

### Method and limits
- The web-search tool available is US-based ("US-only"). It is **not google.pl**, so real Polish result rankings and Google AI Overviews could not be observed.
- In standard mode, queries for plain surnames (Nowak, Szczepański, Wiśniewski) returned mostly person-level records from IPN, the Institute of National Remembrance (katalog.bip.ipn.gov.pl / bip.ipn.gov.pl PDFs). This is probably an artefact of the tool.
- Extended mode surfaced consumer surname sites.
- The session reached its 200-search cap part-way through. After that, verification relied on direct fetches (curl/WebFetch) and the dane.gov.pl API.
- Some sites were unreachable: web.archive.org CDX was egress-blocked; the Wikipedia API returned 429; MyHeritage returned 403; Cloudflare walls blocked others. Each case is stated where it matters.

### Takeaway
No single product dominates Polish surname queries. Each intent is served by a different cluster:
- **"pochodzenie/znaczenie" (origin/meaning):** multilingual AI-SEO template sites, plus the IJP PAN dictionary (ISNP) and sites that reuse its text.
- **"ile osób" (how many):** media articles and a 2023–2026 wave of small independent sites built on PESEL open data.
- **"mapa" (map):** voivodeship-level sites.
- **"herb" (coat of arms):** heraldry databases.
- **"odmiana" (declension):** grammar SEO sites.

The historic "mapa nazwisk" reference, moikrewni.pl, no longer serves surname maps. It redirects to MyHeritage.

### Cited Findings
Domains returned by the search tool for each query type (not google.pl ranking):

| Intent | Query run | Domains returned |
|---|---|---|
| Origin | "pochodzenie nazwiska Nowak" | IPN BIP PDFs; spxvi.edu.pl (16th-century Polish dictionary index); an en.wikipedia proxy; the gov.pl news item "Nowak znowu pierwszy" — [gov.pl](https://www.gov.pl/web/cyfryzacja/nowak-znowu-pierwszy) |
| Meaning/origin (extended mode) | "znaczenie i pochodzenie nazwiska Grzegorczyk" | genezanazwisk.pl, nazwiska.com.pl, mandriva.org.pl, en.wikipedia, mapanazwisk.com, nazwiska.top, pochodzenienazwiska.com — SNIPPET, e.g. [mapanazwisk.com](https://mapanazwisk.com/grzegorczyk), [pochodzenienazwiska.com](https://pochodzenienazwiska.com/grzegorczyk), [nazwiska.top](https://nazwiska.top/grzegorczyk), [nazwiska.com.pl](https://www.nazwiska.com.pl/grzegorczyk-historia-nazwiska-znaczenie/), [genezanazwisk.pl](http://www.genezanazwisk.pl/content/gregorczyk) |
| Meaning | "znaczenie nazwiska Wiśniewski" | only IPN BIP PDFs and a gmina Wiśniew guide; no surname site surfaced (tool artefact) |
| Count | "ile osób nosi nazwisko Szczepański" | IPN PDFs and journals.akademicka.pl; no count site surfaced |
| Most popular | "najpopularniejsze nazwiska w Polsce 2026 PESEL" | benchmark.pl, forsal.pl, onomastica.ijp.pan.pl, pap.pl, tvn24.pl, gov.pl (x2), wroclaw.pl — [benchmark.pl](https://www.benchmark.pl/ile-osob-ma-takie-samo-nazwisko-jak-ty-7265372934074945a), [forsal.pl](https://forsal.pl/gospodarka/demografia/artykuly/8650868,najpopularniejsze-nazwiska-w-polsce-melnyk-goni-kaczynskiego.html), [tvn24](https://tvn24.pl/biznes/z-kraju/article-ra1003595-ls4495593), [wroclaw.pl](https://www.wroclaw.pl/dla-mieszkanca/najrzadsze-i-najpopularniejsze-nazwiska-w-polsce-lista) |
| Ranking (extended mode) | "najpopularniejsze nazwiska w Polsce 2025 ranking…" | polskienazwiska.pl (x2), hub.pl, poland.gg (x5) — [polskienazwiska.pl](https://polskienazwiska.pl/), [poland.gg](https://poland.gg/pl/imiona-i-nazwiska/nazwiska) |
| Map | "mapa nazwisk rozmieszczenie nazwiska w Polsce" | academic PDFs, wbdata.pl, miedziowefakty.pl (an IJP PAN story), wroclaw.pl — [wbdata.pl](https://wbdata.pl/nazwiska-na-mapie-polski), [miedziowefakty.pl](https://miedziowefakty.pl/w-polsce-jest-ponad-400-000-form-nazwisk-opisano-okolo-30-000-najpopularniejszych) |
| Map / genealogy proxy (extended mode) | "Geneteka rozmieszczenie nazwiska mapa…" | Geneteka "Sprawdź występowanie nazwiska", Geneszukacz, nazwiska-polskie.pl, nlp.actaforte.pl "Rozmieszczenie nazwisk w Polsce" (2002 PESEL basis per snippet), parafie.genealodzy.pl — [Geneteka](https://geneteka.genealodzy.pl/index.php?op=se&lang=pol), [actaforte](http://nlp.actaforte.pl:8080/Nomina/Ndistr), [Geneszukacz](https://geneszukacz.genealodzy.pl/) |
| Coat of arms (extended mode) | "herbarz online sprawdź herb szlachecki swojego nazwiska" | xlm.pl (book), sieciprawdy.pl ("Nowy Herbarz Polski"), gajl.wielcy.pl (x2), a genealodzy.pl forum thread, ogrodywspomnien.pl, nienaltowski.net, ornatowski.com, szlachtarp.pl — [gajl.wielcy.pl](https://gajl.wielcy.pl/), [szlachtarp.pl](https://szlachtarp.pl/lista-nazwisk-indeks11-UruskiRodzina.html), [ornatowski.com](https://ornatowski.com/heraldyka/herby/herbarze/), [genealodzy.pl forum](https://genealodzy.pl/PNphpBB2-printview-t-9967-start-0.phtml) |
| Declension (extended mode) | "odmiana nazwiska przez przypadki Szczepańska Grzegorczyk" | nto.pl, eodmiany.pl (x3; per-surname declension pages), iwolsztyn.pl, doniacasar.com.pl (wedding blog), swojskijezykpolski.com, odmiana.net, synomix.pl — [eodmiany.pl](https://eodmiany.pl/nazwiska/odmiana-przez-przypadki-nazwiska-szczepanik), [odmiana.net](https://odmiana.net/), [nto.pl](https://nto.pl/odmiana-nazwisk-przez-przypadki-czy-nazwiska-w-jezyku-polskim-nalezy-odmieniac-jak-poprawnie-odmienic-nazwisko/ar/13290461) |
| Declension | "odmiana nazwiska Grzegorczyk" | akademia.tvp.pl, UW Poradnik Językowy (keyword "nazwiska"), a J. Kubrak PDF on surname declension, IPN PDFs — [TVP Akademia](https://akademia.tvp.pl/84080880/nazwiska-odmieniac-czy-nie-odmieniac-oto-jest-pytanie), [UW poradnik](https://poradnik-jezykowy.uw.edu.pl/keyword/1332/4) |
| Declension tools | "odmiana nazwisk online odmieniacz narzędzie" | only Narodowe Centrum Kultury "Ojczysty – dodaj do ulubionych" language tips and TVP Akademia; no dedicated tool surfaced — [NCK](https://nck.pl/projekty-kulturalne/projekty/ojczysty-dodaj-do-ulubionych/ciekawostki-jezykowe/odmieniamy-nazwiska-pan-i-pani-smith.ajax) |

- **moikrewni.pl is gone as a surname tool.** OBSERVED:
  - `https://www.moikrewni.pl/` returns HTTP 302 to `https://www.myheritage.pl/`.
  - `/mapa/` and `/mapa/kompletny.html?nazwisko=Nowak` both return 404.
  - The Wayback availability API gives 2018-05-09 (status 200) as the latest capture of `moikrewni.pl/mapa/`. For the root, the closest capture to mid-2024 and mid-2025 is 2009-03-04 (status 200), and no capture is returned for 2026. This is consistent with a long-standing redirect, but the shutdown date is UNVERIFIED — [Wayback capture 2018](http://web.archive.org/web/20180509033048/http://www.moikrewni.pl:80/mapa/), [moikrewni.pl](https://www.moikrewni.pl/).
- A "moikrewni.pl mapa nazwisk" query returned no moikrewni page at all. SNIPPET.
- IJP PAN's own "O słowniku" page still names "Genealodzy.pl. czy Moi krewni" as examples of the scale of public interest — [ISNP O słowniku](https://nazwiska.ijppan.pl/info/oslowniku).
- The new PESEL-based sites (surname.pl, szukaj-nazwiska.pl, bazaimion.pl) never surfaced in the US search tool. They were found through the dane.gov.pl showcase registry — [dane.gov.pl showcase search](https://api.dane.gov.pl/1.4/showcases?q=nazwisk).

### Inferences
- On google.pl, "pochodzenie/znaczenie nazwiska X" long-tail queries are probably contested by programmatic multilingual AI-SEO sites (pochodzenienazwiska.com, mapanazwisk.com, nazwiska.top, nazwiska.com.pl). These sites exist for every surname; ISNP covers only ~30k.
- "ile osób" queries are probably contested by the PESEL-data sites and news articles.
- This cannot be confirmed without Polish SERP data.
- IPN catalogue pages index well for many surnames and may appear in Polish SERPs for bare-surname queries (UNVERIFIED for google.pl). That creates a person-level, sensitive-context neighbour to any surname page.
- With moikrewni's shutdown, no current product offers sub-voivodeship maps of today's bearers from open data. Mapping users are split between voivodeship-level sites, ISNP's 2014 powiat/gmina top-16 lists, and 2002-vintage maps (actaforte, UNVERIFIED live).

### Gaps
- Real google.pl rankings, click shares and SERP features for these queries (the tool is US-only). Needs a Polish SERP tool (Semrush/Senuto/Ahrefs PL database) or manual checks from a Polish IP.
- The exact date the moikrewni surname map shut down. The CDX API was egress-blocked and the Wayback API then rate-limited (429).
- google.pl behaviour for a very rare surname query. The only rare-surname test was done site-by-site (Czekierda; see §3).

## 2. Competitor matrix: what each shows, sources and vintage, citations/uncertainty, map granularity, business model, freshness, traffic, weaknesses

### Takeaway
Only one scholarly competitor exists: IJP PAN's ISNP. It is free, cited, attestation-based and very high-traffic, but its counts are frozen at PESEL 2014 and it covers ~30k surnames. A grant-funded v2.0 (2025–2030) will add PESEL 2024 data, more powiat/gmina detail and ~20k more surnames.

The fast-growing field is indie sites built on the CC0 PESEL files. The most advanced, **surname.pl** (listed 2026-07-22), already combines on each surname page:
- 2026 counts and a voivodeship choropleth
- a 2019–2026 time series
- IPA and TTS pronunciation, and Cyrillic transliteration
- archive guidance with licence notes

Its etymologies are LLM-generated (Claude) or a content-free "algorithmic" line, and it states openly that none are source-verified. PESEL-derived features are therefore commoditised. Verified defects show that competitors get basics wrong: mixed data vintages, silent variant merging, wrong rarity labels and fabricated citations.

### Cited Findings

#### Condensed matrix (details and sources below)

| Product | Shows | Count source / vintage | Citations & uncertainty | Map granularity | Model / price | Freshness | Traffic signal | Key weaknesses |
|---|---|---|---|---|---|---|---|---|
| ISNP, IJP PAN (nazwiska.ijppan.pl) | ~30k entries: M/F counts, rank, 16 voiv. + top-16 powiats + top-16 gminas, dated historical attestations, etymology hypotheses, variants, literature | PESEL 2014 (MSWiA, free) | Yes: source abbreviations with volume/page; "niejasne"; "brak poświadczeń…" | Voivodeship map; powiat/gmina top-16 lists | Free; state grant (NPRH 2025–2030) | Counts 12 years old; v2.0 in progress | ~1M users 2022; 570k 2023 | Stale counts; only ~30k surnames; frequent missing-surname complaints; content licence not stated |
| surname.pl (Aleh Brytvich) | 390,648 surname pages: count, M/F, rank, voiv. choropleth, 2019–2026 series, pronunciation (syllabified on page; IPA per showcase text) + MP3, Cyrillic transliteration, famous bearers (Wikidata), US Census 2010 / openarch.nl / Otwarta lista record counts, 65-entry archive guide | PESEL 2026-01-20 (downloaded 2026-04-06/07) | Dataset-level sources and licences; etymology labelled "AI" or "algorytmiczna"; "no etymology is source-verified" | Voivodeship (registered permanent residence) | Free, no login/paywall, no ads seen | Live; archive list dated 2026-09-17 | n/a | LLM etymologies; silent diacritic-variant merge; rarity-label bug; ranks gendered forms separately |
| szukaj-nazwiska.pl (Piotr Telka) | Count, M/F split, voiv. %, rank, rarest list, daily "Pojedynek Nazwisk" game and "Nazwisko dnia", ISNP origin text embedded | Says "Dane z dnia: 20.01.2026"; female counts are actually the 2025 file (COMPUTED) | Dataset-level; ISNP credited | Voivodeship % | MyHeritage affiliate ("Link partnerski") | Live | Daily Facebook posts (followers n/a) | Mixed vintages; no etymology of its own |
| nazwiska-polskie.pl | Count, voiv. shares, locality "×-above-average" concentrations, user comments | Not stated on page (UNVERIFIED) | None visible | Voivodeship + locality/gmina concentration | AdSense | Comments active Sept 2026 | Several comments/week | Undated/unsourced; person-finding framing |
| polskienazwiska.pl | Count, top-200, longest, random | PESEL; "początek 2026" vs "Ostatnia aktualizacja: 2025-02-24" | "Autor nie odpowiada za dane" | ? | AdSense + affiliate disclosure | Inconsistent | n/a | Contradictory freshness |
| poland.gg | Ranking of 581,281 surnames "ze znaczeniem, pochodzeniem i mapą" | "stan na 2025", updated 2025-04-03 | Claims dane.gov.pl showcase #1322 | ? | Multi-tool portal (Kraków) | Stale | n/a | 2025 data |
| pochodzenienazwiska.com / mapanazwisk.com | "Origin", "people worldwide", country list, prose | Unsourced world counts | **Fabricated references** | Country-level | AdSense | "© 2026" | n/a | Anglo template text, LLM-style filler |
| Geneteka (PTG) | "Sprawdź występowanie nazwiska": historical index counts by region | 68,062,579 indices | Records, not claims | Voivodeship/parish (+UA/BY/LT) | Free; volunteer; database rights | Live | "Online: 160" at fetch | Coverage bias (e.g. dolnośląskie ≈ 0) |
| gajl.wielcy.pl / szlachtarp.pl / sejm-wielki.pl | Herbs per family; indexes to armorials; noble genealogy (141,457 people) | Armorials (historical) | Source-based indexes | n/a | Book sales / login | Live | n/a | Feeds the "herb nazwiska" myth; person-level |
| pl.wikipedia (surname pages) | Disambiguation list of people + 1990s count | "w latach 90. XX wieku" | Cites a list page | None | Free | Counts ~30 years old | n/a | No etymology, no map |
| moikrewni.pl | — (redirects to MyHeritage) | — | — | — | MyHeritage | Defunct | — | Gone |
| eodmiany.pl / odmiana.net | Declension pages/tables | — | UNVERIFIED | — | AdSense; odmiana.net "Wyłącz reklamy" + login | — | n/a | Not surname-aware per gender (UNVERIFIED) |

#### A. Scholarly: IJP PAN "Internetowy słownik nazwisk w Polsce" (ISNP)
- **Host and funding.** OBSERVED.
  - `nazwiska.ijp.pan.pl` now redirects to `nazwiska.ijppan.pl`.
  - The site title reads "Internetowy słownik nazwisk w Polsce (wersja 2.0) (2025-2030)".
  - The footer names the project "Internetowy słownik nazwisk w Polsce. Kontynuacja": National Programme for the Development of Humanities (NPRH) 2025–2030, agreement NPRH/DN/SP/0093/2024/14, funded by the Ministry of Science and Higher Education (MNiSW).
  - [nazwiska.ijppan.pl](https://nazwiska.ijppan.pl/)
- **Scope and data.** About page:
  - ~30,000 entries, "bezpłatnym i ogólnodostępnym" (free and publicly available).
  - Main work ran 2014–2021; IJP PAN has provided permanent curation since 2022.
  - The PESEL data was "otrzymane nieodpłatnie z Działu Ewidencji Ludności Ministerstwa Spraw Wewnętrznych" (received free from the Interior Ministry's population records department).
  - Frequency data is "rejestr PESEL z 2014 r."
  - [ISNP O słowniku](https://nazwiska.ijppan.pl/info/oslowniku)
- **Entry structure.** About page:
  - Counts: total, women, men, and rank (rank uses the combined male + female frequency).
  - Geography: all 16 voivodeships, the 16 powiats with the highest frequency, and the 16 gminas with the highest frequency.
  - A voivodeship-level map.
  - Feminine -ska/-cka/-dzka forms have their own entries with counts and geography, linking to the masculine entry. Etymology, attestations and references sit in the masculine entry.
  - Historical attestations give the source quote, document date, source abbreviation, volume and page. Sources: SSNO (12th–15th c.), AntrP (16th–18th c.), the Poznań 16th–18th c. dictionary, Rymut's "Nazwiska Polaków", and regional 19th–20th c. monographs.
  - When nothing is found, the entry states "brak poświadczeń w dostępnych nam źródłach historycznych" (no attestations in the historical sources available to us).
  - Several motivation hypotheses are given where applicable.
  - [ISNP O słowniku](https://nazwiska.ijppan.pl/info/oslowniku)
- **Hedged etymology example.** For the rare surname Czekierda, the ISNP text (as embedded by szukaj-nazwiska.pl) reads: "Niejasne, może Czeker-da, por. Czeker, Czekir (Czek- i niem. przyr. -er, por Rospond I 162)" — [szukaj-nazwiska.pl/Czekierda](https://szukaj-nazwiska.pl/Czekierda)
- **Coverage.** ISNP describes Rymut's 10-volume "Słownik nazwisk współcześnie w Polsce używanych" as "podający nieaktualne już dane frekwencyjne z 1990 r. na podstawie bazy PESEL" (giving 1990 PESEL frequency data that is now out of date). ISNP's ~30k surnames cover ~75–80% of the population, out of more than 400,000 surname forms in Poland — [Górny 2024, Onomastica 68 (PDF)](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682); [article page](https://onomastica.ijppan.pl/index.php/ONOM/article/view/533)
- **Traffic.** Self-reported analytics:
  - 2022: users "zbliżyła się do miliona" (approached a million); >4.5M page views; 3–4 pages per session; ~3 min per visit; ~67% of users in Poland; ~14% returning.
  - 2023: 570k users (505k in Poland); 2.7M visits.
  - Q4 2023: 132k users; 642k page views.
  - Peak day 13 Nov 2022: ~86k users and >266k page views.
  - Second-highest day 27 Dec 2022: ~60k users, after an Interia article and a PAP interview with Prof. Skowronek.
  - Averages: 49k users per month, 19k per week, ~5k per day.
  - Most-viewed entries in 2023: Nowak, Abel, Kowalski, Abramowicz, Lewandowski, Wójcik; in Q4 2023 also Abraham and Tusk.
  - [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **User demand and pain points.** Same article:
  - Server overload.
  - "Setki listów" (hundreds of letters) to nazwiska@ijp.pan.pl since Oct 2022. The most common request is to explain or add a missing surname.
  - Frequent complaints that counts are PESEL 2014 and that geography covers only the top-16 powiats/gminas (e.g. "Mają Państwo chyba bardzo nieaktualne dane…" — "Your data seems very out of date…").
  - Users contest etymologies based on family tradition.
  - One user demanded their "noble" surname be removed from the dictionary.
  - [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **v2.0 plan.** Same article:
  - +20k mid-frequency surnames (down to ~100 bearers).
  - "Bazie PESEL z 2024 roku" (PESEL 2024 data) for frequencies.
  - Frequencies for "powiatach i gminach innych niż uwzględnione do tej pory" (powiats and gminas beyond those covered so far).
  - Updated etymologies.
  - Target of ~50k surnames, so that ~95% of Poles find their surname.
  - [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **Licence.** The Onomastica *article* is CC BY-ND 4.0. The About page shows **no licence or terms for the dictionary content**. OBSERVED absence — [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682), [ISNP O słowniku](https://nazwiska.ijppan.pl/info/oslowniku)
- **Entry URLs.** An example entry URL, `https://nazwiska.ijp.pan.pl/haslo/show/id/185`, appears on szukaj-nazwiska.pl pages; the entry itself was not opened — [szukaj-nazwiska.pl/Szczepański](https://szukaj-nazwiska.pl/Szczepa%C5%84ski)

#### B. PESEL-count sites (2023–2026 wave)
- **dane.gov.pl dataset 1681, "Nazwiska występujące w rejestrze PESEL".** OBSERVED via API:
  - Created 2019-08-13; update frequency "Rocznie" (annually); licence CC0 1.0; verified 2026-01-28.
  - **3,279,006 views and 1,939,483 downloads.**
  - 21 resources, all still listed: national files for 2019-06-30, 2020-01-22, 2021-02-01/02, 2022-01-27, 2023-01-30/31, 2024-01-19, 2025-01-22 and 2026-01-20, and voivodeship files for 2025-02-24 and 2026-01-20.
  - The 2022 male file alone shows 774,708 views.
  - The 2025 and 2026 national xlsx files downloaded successfully.
  - [API dataset](https://api.dane.gov.pl/1.4/datasets/1681), [API resources](https://api.dane.gov.pl/1.4/datasets/1681/resources), [dataset page](https://dane.gov.pl/pl/dataset/1681)
- **Showcases.** The dataset's showcase list has three entries: "Szukaj Nazwiska" (2024-12-20), "BazaImion.pl" (2026-04-28) and "Finux.pl" (a business-intelligence tool, not relevant). A showcase search for "nazwisk" also returns "surname.pl – baza polskich nazwisk z rejestru PESEL" (2026-07-22) — [dataset showcases](https://api.dane.gov.pl/1.4/datasets/1681/showcases), [showcase search](https://api.dane.gov.pl/1.4/showcases?q=nazwisk)
- **surname.pl.** OBSERVED:
  - **Scale.** Title: "Znaczenie, pochodzenie i mapa 390 648 polskich nazwisk". The showcase text says "ponad 408 000". Built with Next.js. No ads detected; Google Analytics present — [surname.pl](https://surname.pl/), [showcase 1344](https://api.dane.gov.pl/1.4/showcases/1344)
  - **Szczepański page** ([surname.pl/szczepanski](https://surname.pl/szczepanski)):
    - Rank #141; syllabified pronunciation "/szcze·PA·ński/" with an MP3 download; 16,458 men and 87 women; "1 osoba na 2279".
    - Etymology text labelled "Etymologia wygenerowana · AI" (AI-generated etymology).
    - Voivodeship choropleth with the caveat: "Dane wojewódzkie obejmują wyłącznie osoby zameldowane na pobyt stały; liczebności równe 1 nie są publikowane" (voivodeship data covers only people with registered permanent residence; counts of 1 are not published).
    - Section "Zmiany w czasie" (changes over time): 2019: 16,981 → 2026: 16,545. The series lists 2019, 2020, 2021, 2023, 2024, 2025 and 2026 — **no 2022 value**.
    - Section "Nazwisko w archiwach" (the surname in archives): US Census 2010 count 2,036; Open Archives (openarch.nl) 403 records "stan na 2026-08-26" (as of 2026-08-26); "Otwarta lista" (Soviet repression victims, CC BY-SA) 53 records.
    - Links to Geneteka, Geneszukacz, FamilySearch, Geogen, GEDBAS, KdeJsme.cz and RadixInd.
  - **Archives guide** ([surname.pl/archiwa](https://surname.pl/archiwa)):
    - 65 archives and databases in 12 countries/areas, in 5 themes, with a "Jak szukać" (how to search) instruction and a licence note for each entry. Dated 2026-09-17.
    - Stance: "linkujemy, nie pobieramy danych" (we link, we don't download data) — stated for Geneteka.
    - Explanatory copy: "pusty wynik jest tu normą, nie usterką" (an empty result is normal here, not a fault) and "zapis w księdze parafialnej jest zapisem zdarzenia, a nie deklaracją czyjejkolwiek narodowości" (a parish-register entry records an event, not anyone's nationality).
  - **Methodology** ([surname.pl/metodologia](https://surname.pl/metodologia)):
    - "Żadna etymologia w serwisie nie jest weryfikacją źródłową opartą na literaturze onomastycznej" (no etymology on the site is source-verified against onomastic literature).
    - A Wiktionary import was "rozważony i odrzucony" (considered and rejected).
    - "Etymologia wygenerowana · AI" covers 10,465 surnames: "orientacyjny i może zawierać nieścisłości" (indicative and may contain inaccuracies). All other surnames get "Etymologia algorytmiczna" (algorithmic etymology).
    - Source table: PESEL frequency (CC0), downloaded 2026-04-06; PESEL voivodeship file, 2026-04-07; Wikidata P734, 2026-04-07; "**Etymologia LLM (Claude)** wygenerowane na potrzeby projektu", 2026-04-18.
  - **Positioning** ([surname.pl/o-nas](https://surname.pl/o-nas)): free, "bez logowania i paywalla" (no login, no paywall). "Nie serwisem genealogicznym… nie narzędziem do identyfikacji konkretnych osób żyjących" (not a genealogy service, not a tool for identifying living individuals). It uses aggregated statistics only.
  - **Rare surname, Czekierda** ([surname.pl/czekierda](https://surname.pl/czekierda)): rank #13,282; 217 men and 212 women; "1 osoba na 87 879". It is still labelled "**Bardzo popularne nazwisko**" (very popular surname). Etymology: "Od rdzenia „czekierda". Etymologia algorytmiczna" (from the root "czekierda").
  - **Homepage "ciekawostki" (trivia)** calls "Kbiltsetskhlashvili" the "najdłuższe polskie nazwisko" (longest Polish surname) and lists "Sankaranarayanan". Every PESEL surname is framed as "polskie" (Polish). The ranking lists gendered forms separately (e.g. "Kowalska 67 tys.", "Kowalski 67 tys.") — [surname.pl](https://surname.pl/)
- **szukaj-nazwiska.pl.** OBSERVED:
  - Nuxt app. Footer: "piotr.telka@szukaj-nazwiska.pl Warszawa, 02.11.2023".
  - "W sumie 592 501 nazwisk" (592,501 surnames in total); "Dane z dnia: 20.01.2026"; sources listed: dane.gov.pl and nazwiska.ijp.pan.pl.
  - Rarest surnames shown (count 2, e.g. Abaa, Ceacîr, Msakhuradze, Xhaferri), with the note that surnames borne by one person are not in the register.
  - Register stats: 262,635 surnames (44.3%) have fewer than 5 bearers; 5,028 occur in all 16 voivodeships; 127,170 occur in only one.
  - Engagement features: daily "Pojedynek Nazwisk" game (which surname is more popular; 10-round version), "Nazwisko dnia" (surname of the day), a daily Facebook post.
  - Each surname page embeds ISNP origin text credited "Źródło: Internetowy Słownik Nazwisk w Polsce".
  - Monetisation: "Treść dokumentów wymaga konta MyHeritage. Link partnerski." (document contents require a MyHeritage account; affiliate link).
  - Stated rule: "Formy męskie i żeńskie liczymy osobno, tak jak w rejestrze PESEL" (male and female forms are counted separately, as in the PESEL register).
  - [szukaj-nazwiska.pl](https://szukaj-nazwiska.pl/), [Szczepański page](https://szukaj-nazwiska.pl/Szczepa%C5%84ski), [showcase 1311](https://api.dane.gov.pl/1.4/showcases/1311)
- **bazaimion.pl.** OBSERVED: "Dane PESEL · od 2000 roku", "aktualizowane rocznie" (updated annually). It offers first-name trend charts (population since 2019, newborns since 2000), multi-name comparison, and male/female surname occurrence sections. No ads detected. Whether surname pages have time series: UNVERIFIED — [bazaimion.pl](https://bazaimion.pl/), [showcase 1329](https://api.dane.gov.pl/1.4/showcases/1329)
- **polskienazwiska.pl.** OBSERVED:
  - Its FAQ says "Ostatnie dane są z początku 2026 roku" (latest data is from early 2026), yet the footer shows "Ostatnia aktualizacja: 2025-02-24".
  - It includes only surnames borne by ≥2 people "od 2020 roku" (since 2020).
  - Disclaimer: "Autor nie odpowiada za dane dotyczące nazwisk" (the author is not responsible for surname data).
  - AdSense, plus a disclosure that it may earn "prowizję za polecenie usług partnerów" (commission for referring partners).
  - [polskienazwiska.pl](https://polskienazwiska.pl/)
- **poland.gg.** OBSERVED: "Pełny ranking 581 281 nazwisk z rejestru PESEL (stan na 2025)", "aktualizacja 3 kwietnia 2025". It claims ranking "ze znaczeniem, pochodzeniem i mapą" (with meaning, origin and map) and describes itself as "Wyróżnione jako wdrożenie #1322 na dane.gov.pl" (featured as showcase #1322 on dane.gov.pl). It is a broad tools portal (PESEL/NIP validators, legal texts) with a Kraków address — [poland.gg](https://poland.gg/pl/imiona-i-nazwiska/nazwiska)

#### C. Map sites
- **nazwiska-polskie.pl.** OBSERVED:
  - Title "Mapa polskich nazwisk"; tagline "wyszukuj osoby po nazwiskach" (search for people by surname).
  - Browse by voivodeship; AdSense (pub ID ca-pub-0285668067181245); GA4; Facebook SDK.
  - The latest user comments are dated 2026-09-14 to 2026-09-27 and include person-seeking posts ("szukam kogos z wschodniego mazowsza z nazwiskiem jaśkiewicz").
  - The Nowak page (via WebFetch summary) shows ~"170 000" bearers, voivodeship shares, and locality concentrations (e.g. "Dziembowo" 79 people, "25×" the national average). No source, date or methodology is shown.
  - [nazwiska-polskie.pl](https://nazwiska-polskie.pl/), [Nowak page](https://nazwiska-polskie.pl/Nowak)
- **wbdata.pl.** GIS company blog post dated 2019-01-27: voivodeship maps by gender, data from dane.gov.pl as of 2017-12-31, excluding surnames with fewer than 2 occurrences per voivodeship; it promotes GIS training — [wbdata.pl](https://wbdata.pl/nazwiska-na-mapie-polski)
- **nlp.actaforte.pl "Rozmieszczenie nazwisk w Polsce".** The snippet says it is based on Rymut's dictionary of surnames used at the beginning of the 21st century (PESEL 2002). The fetch timed out, so live status and features are UNVERIFIED — [actaforte](http://nlp.actaforte.pl:8080/Nomina/Ndistr)

#### D. AI-generated / programmatic SEO "pochodzenie–znaczenie" sites
- **pochodzenienazwiska.com.** OBSERVED:
  - Multilingual template (ES/EN/FR/DE/IT/PT/PL/NL/RU); AdSense.
  - Grzegorczyk page: "13 400 Ludzi na świecie, 26 Krajów, Polska… (92%)" (people worldwide, countries, share in Poland). The text claims "ponad dwieście różnych pisowni" (over 200 spellings) and cites a "Danelaw… z Lincolnshire… 1143" record — an English "Gregory" template.
  - It cites "Źródła: „Pochodzenie i znaczenie imienia Grzegorczyk" Johna Smitha, Wydawnictwo, 2005. „Analiza historyczna nazwisk w Europie", Anna Johnson, Academic Press, 2010." These are **evidently fabricated references**.
  - [pochodzenienazwiska.com/grzegorczyk](https://pochodzenienazwiska.com/grzegorczyk)
- **pochodzenienazwiska.com, rare-surname test (Czekierda).** "661 Ludzi na świecie, 11 Krajów… Polska (88%)". The rest is generic filler, e.g. "Czekierda, jak każde ze znanych nam nazwisk, ma narrację sięgającą czasów starożytnych i legendarnych postaci" (like every surname we know, it has a narrative reaching back to ancient times and legendary figures). There is no actual etymology. ISNP calls the same surname "Niejasne" (unclear) — [pochodzenienazwiska.com/czekierda](https://pochodzenienazwiska.com/czekierda); [szukaj-nazwiska.pl/Czekierda (ISNP text)](https://szukaj-nazwiska.pl/Czekierda)
- **mapanazwisk.com.** Same header, menu and language list as pochodzenienazwiska.com; AdSense. Generic LLM-style prose ("Badanie rozmieszczenia geograficznego nazwisk jest jak wyprawa w fascynującą podróż…" — studying surname distribution is like a fascinating journey…). No data source — [mapanazwisk.com/grzegorczyk](https://mapanazwisk.com/grzegorczyk)
- **mandriva.org.pl.** A former Linux-distribution domain now used as a name-meaning site. It relies on user-generated "Wpisy internautów" (user entries) and copied Wikipedia bearer lists with broken encoding, and repeats "w latach 90. XX wieku nosiło je 10.123 osób" (in the 1990s, 10,123 people bore it) — [mandriva.org.pl](https://mandriva.org.pl/Grzegorczyk,Franciszka)
- **Unreachable on 2026-09-29.** nazwiska.com.pl (bot-verification wall), nazwiska.top (proxy 502) and genezanazwisk.pl (HTTP 503, "Serwis w trakcie prac konserwacyjnych" — site under maintenance). Their content is UNVERIFIED — [nazwiska.com.pl](https://www.nazwiska.com.pl/grzegorczyk-historia-nazwiska-znaczenie/), [nazwiska.top](https://nazwiska.top/grzegorczyk), [genezanazwisk.pl](http://www.genezanazwisk.pl/content/gregorczyk)

#### E. Genealogy portals used as a distribution proxy
- **Geneteka "Sprawdź występowanie nazwiska".** OBSERVED:
  - A surname's indexed records by voivodeship plus Ukraine, Belarus and Lithuania, with year-range filters.
  - Current totals: 35,313,356 births, 23,162,610 deaths and 9,586,613 marriages — **68,062,579 indices**. The meta description still says 47M.
  - Coverage is very uneven: dolnośląskie has 18,716 birth indices against 6,338,638 for mazowieckie.
  - "Online: 160" at fetch time; "ver. 1.80 © 2010-2026 PTG"; a database-producer notice (sui generis database right).
  - [Geneteka](https://geneteka.genealodzy.pl/index.php?op=se&lang=pol)

#### F. Heraldry / "herb nazwiska"
- **gajl.wielcy.pl.** "Herbarz Polski" by Tadeusz Gajl and "Polish Armorial" by Lech Milewski. Graphical coat-of-arms search and lists of noble families per coat of arms, plus a book promotion ("Idealny prezent!" — the perfect gift) — [gajl.wielcy.pl](https://gajl.wielcy.pl/)
- **szlachtarp.pl.** Run by Wydawnictwo KASTOR, © 2010–2026. Tagline "skąd pochodzi moje nazwisko?" (where does my surname come from?). Offers name indexes to Uruski, Boniecki and Niesiecki, tax registers (1648, 1676, 1791) and a 1789 survey. Login/registration and e-publication sales — [szlachtarp.pl](https://szlachtarp.pl/lista-nazwisk-indeks11-UruskiRodzina.html)
- **sejm-wielki.pl.** "Potomkowie Sejmu Wielkiego", a genealogy of the descendants of the Great Sejm. The site names M.J. Minakowska. The database counts 141,457 people, is "updated daily" and has a login — [sejm-wielki.pl](https://www.sejm-wielki.pl/)
- **Other heraldry results.** Snippets suggested a resource with "over 4,500 coats of arms, 37 thousand surnames, 55 thousand families", but did not attribute it to a verifiable page. UNVERIFIED — [search result: sieciprawdy.pl](https://www.sieciprawdy.pl/znajdz-swoj-herb-rodowy-w-nowym-herbarzu-polskim-pnews-2886.html)

#### G. MyHeritage / moikrewni
- moikrewni.pl redirects to myheritage.pl (see §1). `https://www.myheritage.pl/names/nowak` returned HTTP 403 to curl and empty content to WebFetch. The existence and content of MyHeritage Polish "pochodzenie nazwiska" pages are UNVERIFIED — [myheritage.pl/names/nowak](https://www.myheritage.pl/names/nowak)

#### H. Polish Wikipedia
- The "Grzegorczyk" page is a disambiguation page listing 13 people. Its only statistic is "w latach 90. XX wieku nosiło je 10.123 osób", citing a "Najpopularniejsze nazwiska w Polsce" list. It has no etymology and no map — [pl.wikipedia Grzegorczyk](https://pl.wikipedia.org/wiki/Grzegorczyk)

#### I. Declension resources
- **odmiana.net.** A declension dictionary for words and first names. AdSense, a "Wyłącz reklamy" (turn off ads) option and login. The homepage shows no surname- or gender-specific tool — [odmiana.net](https://odmiana.net/)
- **eodmiany.pl.** Has per-surname pages such as "Szczepanik – odmiana przez przypadki nazwiska Szczepanik" (SNIPPET). The Grzegorczyk page was behind Cloudflare (403), so content is UNVERIFIED — [eodmiany.pl](https://eodmiany.pl/nazwiska/odmiana-przez-przypadki-nazwiska-szczepanik)
- **Advisory content.** NCK "Ojczysty" tips, TVP Akademia, UW Poradnik Językowy and nto.pl are articles, not tools — [NCK](https://nck.pl/projekty-kulturalne/projekty/ojczysty-dodaj-do-ulubionych/ciekawostki-jezykowe/odmieniamy-nazwiska-pan-i-pani-smith.ajax), [TVP Akademia](https://akademia.tvp.pl/84080880/nazwiska-odmieniac-czy-nie-odmieniac-oto-jest-pytanie), [UW poradnik](https://poradnik-jezykowy.uw.edu.pl/keyword/1332/4)
- **Poradnia Językowa PWN and Rada Języka Polskiego.** Not fetched this session (search budget exhausted). UNVERIFIED.

#### J. Verified data-quality defects (COMPUTED from official files)
Official files used:
- 2026-01-20: [male xlsx](https://api.dane.gov.pl/media/resources/20260128/2_-_nazwiska_m%C4%99skie-osoby_%C5%BCyj%C4%85ce.xlsx), [female xlsx](https://api.dane.gov.pl/media/resources/20260128/2_-_nazwiska_%C5%BCe%C5%84skie-osoby_%C5%BCyj%C4%85ce.xlsx)
- 2025-01-22: [male xlsx](https://api.dane.gov.pl/media/resources/20250123/nazwiska_m%C4%99skie-osoby_%C5%BCyj%C4%85ce.xlsx), [female xlsx](https://api.dane.gov.pl/media/resources/20250123/nazwiska_%C5%BCe%C5%84skie-osoby_%C5%BCyj%C4%85ce_efby1gw.xlsx)

Header in all four files: "Nazwisko aktualne, Liczba".

| Form in file | M 2025-01-22 | F 2025-01-22 | M 2026-01-20 | F 2026-01-20 |
|---|---|---|---|---|
| NOWAK | 98,859 | 100,319 | 98,387 | 99,738 |
| KOWALSKI | 66,891 | 512 | 66,589 | 535 |
| KOWALSKA | 3 | 67,723 | 3 | 67,308 |
| SZCZEPAŃSKI | 16,521 | 61 | 16,419 | 62 |
| SZCZEPANSKI (no diacritic) | 38 | 24 | 39 | 25 |
| SZCZEPAŃSKA | – | 16,857 | – | 16,778 |
| GRZEGORCZYK | 5,159 | 5,365 | 5,128 | 5,334 |
| CZEKIERDA | 219 | 218 | 217 | 212 |
| MELNYK | 6,001 | 6,943 | 6,442 | 7,257 |
| Data rows (distinct surnames) | 395,127 | 411,012 | 408,182 | 420,082 |
| Sum of counts | 21,096,170 | 21,535,515 | 21,197,537 | 21,560,302 |

The 2026 files contain no rows with a count of 1. Double-barrelled surnames are separate rows (e.g. "SZCZEPAŃSKA-NOWAK" 5).

- **szukaj-nazwiska.pl mixes vintages.** Its figures equal the **2026 male file plus the 2025 female file**, despite the label "Dane z dnia: 20.01.2026":
  - Nowak 198,706 = 98,387 + 100,319
  - Kowalska 67,726 = 3 + 67,723
  - Kowalski 67,101 = 66,589 + 512
  - Szczepański 16,480 (16,419 M + 61 F)
  - Czekierda 435 (217 M + 218 F)
  - Correct 2026 totals: Nowak 198,125; Czekierda 429 — [szukaj-nazwiska.pl](https://szukaj-nazwiska.pl/), [Czekierda page](https://szukaj-nazwiska.pl/Czekierda)
- **surname.pl silently merges diacritic-less variants.** Its Szczepański figures are 16,458 men = 16,419 SZCZEPAŃSKI + 39 SZCZEPANSKI, and 87 women = 62 + 25. The page shows "2 Wariantów" (2 variants) but no breakdown. Its Czekierda figures (217/212) match the 2026 files exactly — [surname.pl/szczepanski](https://surname.pl/szczepanski)
- **An unsourced SEO count circulated in search.** The search tool's summary (extended query, Grzegorczyk) claimed "12 311 osób" and a 14th-century origin; the underlying page was not identified (UNVERIFIED). The official 2026 total is 10,462 (5,128 + 5,334). Wikipedia shows 10,123 (1990s) and pochodzenienazwiska.com shows "13 400" worldwide.

### Inferences
- **PESEL features are commoditised.** Counts, rank, rarity, voivodeship map, M/F split, yearly series, rankings and "surname of the day" are all offered free by ≥2 independent sites. At least one of them (surname.pl) also has pronunciation, transliteration and archive guidance. None of these can form Name Atlas's moat.
- **Evidence and correctness are the real moat.** Competitors' failures are in evidence and correctness:
  - LLM or empty etymologies, and fabricated citations
  - mixed vintages and silent variant merging
  - wrong rarity labels and undated data
- A product that shows the exact file, snapshot date, form, variant handling and a per-claim citation would be clearly distinct.
- **surname.pl's ratio implies a mixed denominator.** Its "1 osoba na 2279" for 16,545 bearers, and "1 na 87 879" for 429, both imply a ~37.7M denominator (roughly the resident population). The numerators, however, come from the PESEL "osoby żyjące" (living persons) files, whose 2026 counts sum to ~42.76M. Numerator and denominator appear to be on different bases. The ~37.7M figure is inferred; GUS population was not checked this session.
- **What PESEL counts mean is under-explained.** The national files' combined counts (~42.76M in 2026) exceed Poland's resident population (the comparison figure is UNVERIFIED). This suggests the "living persons" register includes non-residents: people abroad who keep PESEL records, and foreigners with a PESEL. The register's rarest surnames are largely foreign forms (Msakhuradze, Xhaferri, Ceacîr).
- Competitors present these as "osób w Polsce" (people in Poland) or "polskie nazwiska" (Polish surnames). An honest "what this count means" explanation is open ground, but Name Atlas must confirm the register's definition with the Ministry of Digital Affairs (MC) documentation first.
- **ISNP is simultaneously the strongest content competitor and the most plausible partner.** It is authoritative, free, media-favoured and ~0.5–1M users per year, and it received PESEL data with powiat/gmina detail from MSWiA free of charge. szukaj-nazwiska.pl already embeds its text, with licence status unknown.

### Gaps
- Similarweb/Semrush traffic for surname.pl, szukaj-nazwiska.pl, nazwiska-polskie.pl, pochodzenienazwiska.com and gajl.wielcy.pl: not retrieved.
- MyHeritage PL surname pages: blocked.
- PWN/RJP advice pages: not fetched.
- Data source and vintage of nazwiska-polskie.pl's locality-level concentrations: no "o danych" (about the data) content was found.
- ISNP content licence and reuse terms.
- Pricing for sejm-wielki.pl, szlachtarp.pl and odmiana.net's ad-free tier.
- Whether bazaimion.pl shows surname time series.

## 3. Google AI Overviews / AI Mode in Poland, and evidence of AI-invented surname content

### Takeaway
Google AI Overviews ("Przeglądy od AI") launched in Poland in Polish on 26 March 2025, and AI Mode ("Tryb AI") on 8 October 2025. Whether they answer Polish surname-meaning queries could not be observed from this environment.

There is direct evidence of AI-invented surname content in the Polish market: fabricated book citations and filler "etymologies" on AdSense sites, and a leading new competitor that publishes Claude-generated etymologies with an "AI" label.

### Cited Findings
- **AI Overviews.** Launched in Poland on Wednesday 26 March 2025, for queries in Polish and English, for signed-in users aged 18+, alongside Austria, Belgium, Spain, Ireland, Germany, Portugal, Italy and Switzerland. The article notes the feature remains "podatna… na błędy, halucynacje" (prone to errors and hallucinations) — [Spider's Web](https://spidersweb.pl/2025/03/google-przeglady-overviews-ai-w-polsce.html); also covered by [benchmark.pl](https://www.benchmark.pl/aktualnosci/wyszukiwarka-google-z-ai-overviews.html) and [android.com.pl](https://android.com.pl/tech/909791-funkcja-google-ai-overviews-w-polsce-klasyczne-wyszukiwanie-to-przeszlosc/)
- **AI Mode.** Launched in Poland on 8 October 2025 as a separate tab in results and in the Android/iOS apps, based on a customised Gemini, at no cost — [chip.pl](https://www.chip.pl/2025/10/google-wprowadza-tryb-ai-w-wyszukiwarce-google-w-polsce). Search snippets describe it as part of a wider expansion but disagree on the size: "36 new languages… nearly 50 countries" versus "over 40 new countries and 38 new languages". SNIPPET, conflicting — [benchmark.pl](https://www.benchmark.pl/google-ai-mode-w-polsce-7268543279072321a), [android.com.pl](https://android.com.pl/tech/979918-google-wprowadza-tryb-ai-w-polsce/)
- **Documented pattern of Google AI answers inventing meanings.** In April 2025, AI Overviews produced confident explanations for nonsense "idioms" such as "You can't lick a badger twice" — [Laptop Mag](https://www.laptopmag.com/ai/googles-ai-overview-hallucinating-fake-idioms-april-2025), [Tom's Guide](https://www.tomsguide.com/ai/google-is-hallucinating-idioms-these-are-the-five-most-hilarious-we-found), [Slashdot 2025-04-24](https://tech.slashdot.org/story/25/04/24/1853256/google-ai-fabricates-explanations-for-nonexistent-idioms)
- **Fabricated surname content in Polish.** pochodzenienazwiska.com's Grzegorczyk page cites the invented works "Johna Smitha… 2005" and "Anna Johnson, Academic Press, 2010", and imports an English "Gregory/Danelaw 1143" narrative. Its Czekierda page gives filler instead of admitting the etymology is unclear — [Grzegorczyk](https://pochodzenienazwiska.com/grzegorczyk), [Czekierda](https://pochodzenienazwiska.com/czekierda)
- **AI labelling by a direct competitor.** surname.pl publishes "Etymologia wygenerowana · AI" for 10,465 surnames, produced by "Etymologia LLM (Claude)", and states no etymology is verified against onomastic literature — [surname.pl/metodologia](https://surname.pl/metodologia)
- **An AI etymology example.** For Szczepański, surname.pl's AI text links the name to "Szczepan" and "miejscowością Szczepanów lub inną osadą" (the village of Szczepanów or another settlement), and concludes "Nosiciel tego nazwiska był zatem potomkiem lub mieszkańcem okolic związanych z imieniem Szczepan" (the bearer was therefore a descendant or inhabitant of areas associated with the name Szczepan). ISNP's entry offers two hedged hypotheses: toponymic (Szczepanów in gm. Brzesko, Szczepanowice in gm. Pleśna) or from the personal name Szczepan — [surname.pl/szczepanski](https://surname.pl/szczepanski); [ISNP text via szukaj-nazwiska.pl](https://szukaj-nazwiska.pl/Szczepa%C5%84ski)
- **Demand for evidence rather than stories.** ISNP users write in to contest etymologies from family tradition (e.g. Saniewski, Czekierda "przybyli… z królem Batorym" — came with King Báthory), and to ask "w jakich źródłach można odnaleźć informacje" (in which sources can I find information) — [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **Observed in this session (research-tool artefact, not a Polish consumer product).** The search tool's own AI summary said a man's surname Grzegorczyk in the dative "often remains the same". That contradicts the declension rule quoted in its own cited source ("if a surname can be assigned to a specific declension pattern… it should be declined") — [TVP Akademia](https://akademia.tvp.pl/84080880/nazwiska-odmieniac-czy-nie-odmieniac-oto-jest-pytanie)

### Inferences
- Since 2025, simple "znaczenie nazwiska X" questions on google.pl are likely at least partly answered in AI Overviews or AI Mode, drawing on whatever pages rank. For most surnames those are the AI-SEO sites (UNVERIFIED; not observed).
- The risk of confident but wrong answers is structural: the sources are templated, and the scholarly source (ISNP) covers only ~30k surnames.
- "We don't know, and here is why" plus citations is a differentiator that AI answers and AI-SEO sites do not provide.
- surname.pl's AI label is transparent but does not fix accuracy. A product with a verifiable evidence chain would contrast clearly with it.

### Gaps
- No direct observation of AI Overview or AI Mode answers for Polish surname queries, because the tool is US-based.
- No Polish press or forum report was found of a specific wrong surname etymology produced by Google or ChatGPT; the search budget ran out before a targeted search.
- A manual test from a Polish IP is recommended, for example: "pochodzenie nazwiska Czekierda", "znaczenie nazwiska Grzegorczyk", "ile osób nosi nazwisko Szczepański".

## 4. Who publishes the annual "najpopularniejsze nazwiska" stories, from what data; year-over-year PESEL trends

### Takeaway
The Ministry of Digital Affairs (MC) and major media (tvn24, forsal, benchmark, regional radio, city portals) republish top-10 lists from each dane.gov.pl PESEL release. Coverage is mostly static, a top-10 plus "rarest" galleries. The one clear year-over-year trend story found is Forsal's 2023 "Melnyk goni Kaczyńskiego" (Melnyk is catching up with Kaczyński).

Per-surname time series now exist as a product feature (surname.pl, 2019–2026). Media spikes demonstrably drive surname-site traffic.

### Cited Findings
- **tvn24 Biznes, 5 Feb 2020.** "Najpopularniejsze nazwiska w Polsce. Ministerstwo opublikowało dane" (ministry publishes data); cites dane.gov.pl and "ponad 290 tys. nazwisk" (over 290k surnames) — [tvn24](https://tvn24.pl/biznes/z-kraju/article-ra1003595-ls4495593)
- **Ministry of Digital Affairs, 10 Feb 2021.** "Nowak znowu pierwszy" (Nowak first again): a top-10 by gender (Nowak 102,503 F / 100,617 M), linking the dane.gov.pl dataset, with no year-over-year comparison — [gov.pl](https://www.gov.pl/web/cyfryzacja/nowak-znowu-pierwszy)
- **Ministry of Digital Affairs, 2022.** "Poszukiwani – Anna Nowak i Piotr Kowalski" (Wanted: Anna Nowak and Piotr Kowalski): first-name and surname lists, pointing to dane.gov.pl — [gov.pl](https://www.gov.pl/web/cyfryzacja/poszukiwani---anna-nowak-i-piotr-kowalski)
- **Radio Kielce, 21 Jan 2022.** A regional ranking ("Nowak, Wójcik i Stępień" in świętokrzyskie) from ministry data — [radiokielce.pl](https://radiokielce.pl/195953/znamy-najpopularniejsze-nazwiska-w-regionie-ranking-152258)
- **Forsal, 1 Feb 2023.** A year-over-year comparison of early-2020 and early-2023 PESEL data:
  - Melnyk ~3,400 → 11,200
  - Kovalchuk ~2,000 → ~8,000
  - Shevchenko 1,800 → 7,700
  - The 50 most popular "eastern-sounding" surnames went from ~50k to more than 3.5× that.
  - Nowak 204k+ → 201,315
  - [Forsal](https://forsal.pl/gospodarka/demografia/artykuly/8650868,najpopularniejsze-nazwiska-w-polsce-melnyk-goni-kaczynskiego.html)
- **benchmark.pl, 29 Feb 2024.** Data as of 19 Jan 2024: Nowak 200,216; Kowalska/Kowalski 135,441; Wiśniewski/Wiśniewska 108,326. Readers are pointed to dane.gov.pl male and female "wyszukiwarki" (search tools) — [benchmark.pl](https://www.benchmark.pl/ile-osob-ma-takie-samo-nazwisko-jak-ty-7265372934074945a)
- **wroclaw.pl.** A "najrzadsze i najpopularniejsze nazwiska" (rarest and most popular surnames) gallery citing PESEL data on a government site; the date was not captured — [wroclaw.pl](https://www.wroclaw.pl/dla-mieszkanca/najrzadsze-i-najpopularniejsze-nazwiska-w-polsce-lista)
- **hub.pl.** A result titled "Najpopularniejsze nazwisko w Polsce. Nosi je ponad 98 tys. mężczyzn" (the most popular surname in Poland is borne by over 98k men). The URL returned 404 on fetch. SNIPPET — [hub.pl](https://hub.pl/nauka/news-kowalski-to-nie-jest-najpopularniejsze-nazwisko-w-polsce-spr,nId,7921585)
- **Media drives ISNP traffic.** The second-highest traffic day followed Interia's "Skąd się wzięło twoje nazwisko?" (where does your surname come from?, 27 Dec 2022) and a PAP interview (26 Dec 2022). Other coverage: Radio Kraków (14 Apr 2023) and Magda Mołek's YouTube interview (8 Feb 2022) — [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **Year-over-year as a product feature.** surname.pl per-surname "Zmiany w czasie" (e.g. Szczepański 2019: 16,981 → 2026: 16,545) — [surname.pl/szczepanski](https://surname.pl/szczepanski). bazaimion.pl shows first-name trend charts — [bazaimion.pl](https://bazaimion.pl/)
- **Trend computed from official files (COMPUTED).**
  - Melnyk: 12,944 (2025) → 13,699 (2026).
  - In 2026, Kaczyński + Kaczyńska forms total 11,654 (5,801 M; 41 F with masculine form; 5,812 F), so Melnyk now exceeds Kaczyński/Kaczyńska.
  - Nowak: 199,178 (2025) → 198,125 (2026).
  - Distinct surname rows: male 395,127 → 408,182; female 411,012 → 420,082.
  - [2026 male](https://api.dane.gov.pl/media/resources/20260128/2_-_nazwiska_m%C4%99skie-osoby_%C5%BCyj%C4%85ce.xlsx), [2026 female](https://api.dane.gov.pl/media/resources/20260128/2_-_nazwiska_%C5%BCe%C5%84skie-osoby_%C5%BCyj%C4%85ce.xlsx), [2025 male](https://api.dane.gov.pl/media/resources/20250123/nazwiska_m%C4%99skie-osoby_%C5%BCyj%C4%85ce.xlsx), [2025 female](https://api.dane.gov.pl/media/resources/20250123/nazwiska_%C5%BCe%C5%84skie-osoby_%C5%BCyj%C4%85ce_efby1gw.xlsx)
- **The full back series remains downloadable.** dane.gov.pl still lists every national snapshot from 2019-06-30 to 2026-01-20 — [API resources](https://api.dane.gov.pl/1.4/datasets/1681/resources)

### Inferences
- Annual media stories are predictable traffic events. The data lands around late January; articles follow in January–February. A product with a "what changed this year" angle per surname could ride them.
- A plain 2019–2026 time series is no longer distinctive, because surname.pl has one.
- The growth in distinct surnames and the rise of Ukrainian surnames are politically and socially sensitive. Name Atlas's no-ethnicity-inference rule means it should report form counts without "eastern origin" framing, unlike Forsal's framing.

### Gaps
- 2025 and 2026 national media articles about the latest release could not be retrieved (search budget exhausted; hub.pl 404). Whether any outlet ran a year-over-year story in 2025 or 2026 is UNVERIFIED.
- No Ministry post about 2026 surnames was found; the 2026 ministry news found concerns first names — SNIPPET, [gov.pl](https://www.gov.pl/web/cyfryzacja/zuzanna-i-antoni-a-moze-mercedes-i-romeo-znamy-najpopularniejsze-imiona).

## 5. Polish startups/apps (2023–2026) in genealogy/surname/heritage (incl. AI) and government tools on PESEL surname data

### Takeaway
There is no government-built consumer surname tool. The state publishes CC0 files on dane.gov.pl and occasional news posts. Separately, a state grant funds the IJP PAN dictionary's v2.0.

The 2023–2026 entrants are small independent web products built on those files: szukaj-nazwiska.pl, surname.pl, bazaimion.pl, poland.gg and polskienazwiska.pl. Beside them are AI-SEO networks, and one AI genealogy SaaS (Geneo Toolkit) that works at person level. No funded Polish surname startup was found.

### Cited Findings
- **dane.gov.pl showcases built on the surname dataset:**
  - Szukaj Nazwiska (Piotr Telka, 2024-12-20)
  - BazaImion.pl (Martin Bibyakov, 2026-04-28)
  - surname.pl (Aleh Brytvich, 2026-07-22)
  - poland.gg calls itself "wdrożenie #1322" (showcase #1322)
  - [showcase search](https://api.dane.gov.pl/1.4/showcases?q=nazwisk), [poland.gg](https://poland.gg/pl/imiona-i-nazwiska/nazwiska)
- **Government's role is data plus posts.** The Ministry's news posts point readers to the dane.gov.pl files, with no lookup app — [gov.pl 2021](https://www.gov.pl/web/cyfryzacja/nowak-znowu-pierwszy), [gov.pl 2022](https://www.gov.pl/web/cyfryzacja/poszukiwani---anna-nowak-i-piotr-kowalski). benchmark.pl describes dane.gov.pl male/female surname "wyszukiwarki" (search tools), which appear to be the portal's resource table views; the UI is UNVERIFIED because the page is a JS single-page app — [benchmark.pl](https://www.benchmark.pl/ile-osob-ma-takie-samo-nazwisko-jak-ty-7265372934074945a)
- **Scale of public interest in the raw data.** Dataset 1681: 3,279,006 views and 1,939,483 downloads — [API](https://api.dane.gov.pl/1.4/datasets/1681)
- **Geneo Toolkit (geneo-toolkit.pl).** Polish AI genealogy SaaS:
  - Import a GEDCOM file; AI extracts people and dates from record scans (Polish/Russian/Latin), detects relationships and matches them to the tree.
  - "3 dokumenty gratis" (3 documents free), no card required, a pricing page.
  - Tools: Julian calendar converter, DNA relationship calculator.
  - Blog posts June 2026, e.g. "Sztuczna inteligencja w genealogii – narzędzie, nie wyrocznia" (AI in genealogy: a tool, not an oracle); footer "Polish Family Roots © 2026".
  - [Geneo Toolkit](https://geneo-toolkit.pl/drzewo-genealogiczne-ai)
- **IJP PAN ISNP v2.0.** Grant-funded 2025–2030 (NPRH/DN/SP/0093/2024/14) — [nazwiska.ijppan.pl](https://nazwiska.ijppan.pl/)
- **V4 surname dictionary (ELTE, "© 2026").** A Visegrad-countries surname dictionary in Polish/English/Czech/Slovak/Hungarian; free. The sample entry shows etymology and type but no counts or maps — [v4surnames.elte.hu](https://v4surnames.elte.hu/asdf9876/index.php/pl/site/familyname?id=637)
- **Other results (SNIPPET only).** More Maiorum (commissioned ancestor research), the TomGene blog "AI w genealogii", PL-SOFT "Drzewo genealogiczne" desktop software — [More Maiorum](https://poszukiwacze.moremaiorum.pl/gdzie-zbudowac-drzewo-genealogiczne-lista-8-portali-i-programow/), [TomGene](https://tomgene.blogspot.com/p/ai-w-genealogii.html)

### Inferences
- Entry barriers for PESEL-count products are near zero (CC0 data, static generation). Expect more clones each year, especially after each January release.
- The only actors with privileged data are IJP PAN, which obtained MSWiA PESEL extracts with powiat/gmina detail free of charge, and PTG/Geneteka, with volunteer-built indices and database rights.
- Partnership, not scraping, is the route to anything beyond voivodeship-level current counts.

### Gaps
- No press or funding database search was possible for 2023–2026 Polish surname or genealogy startups (search budget exhausted).
- Traffic and revenue for the new indie sites are unknown.
- Whether any government body plans a surname tool: no evidence found.

## 6. What Polish competitors do NOT offer: where Name Atlas can be distinct and hard to copy

### Takeaway
PESEL-derived features are all offered free by at least one competitor: counts, maps, rarity, rankings, time series, pronunciation, transliteration and archive link lists. No competitor combines:
1. current official counts that are internally consistent and correctly vintage-labelled
2. explicit, disclosed pairing of -ski/-ska and other gendered forms, plus variant handling
3. per-claim citations with a confidence label and "we don't know"
4. dated historical attestations from sources
5. both-gender declension
6. a paid, versioned evidence report

ISNP has (2), (3)-lite and (4), but with 2014 counts and ~30k surnames. surname.pl has (1)-mostly, archive guidance and pronunciation, but explicitly lacks source-verified etymology. That combination is the gap.

### Cited Findings
Capability coverage, observed 2026-09-29 (Y = yes, P = partial, N = no, ? = unverified):

| Capability | ISNP (IJP PAN) | surname.pl | szukaj-nazwiska.pl | nazwiska-polskie.pl | AI-SEO sites | Wikipedia PL |
|---|---|---|---|---|---|---|
| Current (2026) official count | N (2014) | Y (variants merged) | P (M 2026 + F 2025 mixed) | ? (undated) | N | N (1990s) |
| Gendered-form pairing (-ski/-ska) | Y (linked entries; rank on sum) | P (link to feminine form; ranking lists forms separately) | N ("liczymy osobno" — counted separately) | ? | N | N |
| Per-claim citations | P (attestation sources; "por. Rospond I 162") | P (dataset-level + licences) | P (dataset-level; ISNP credited) | N | N (fabricated refs seen) | P (count cited) |
| Confidence / uncertainty labels | P ("niejasne", "brak poświadczeń") | P (provenance labels "AI"/"algorytmiczna", not confidence) | N | N | N | N |
| Historical attestations with sources | Y | N (archive record counts only) | N | N | N | N |
| Time trend | N | Y (2019–2026; 2022 missing in example) | N | N | N | N |
| Declension | N | N | N | N | N | N |
| Pronunciation | N | Y (syllables + TTS MP3, IPA per showcase) | N | N | N | N |
| Research guidance (where to search) | P (links element in entry structure) | Y (65 archives + licence notes) | P (MyHeritage affiliate) | N | N | N |
| Sub-voivodeship current geography | P (top-16 powiat/gmina, 2014) | N | N | P (localities; source unknown) | N | N |
| Paid versioned report | N | N | N | N | N | N |

Sources for the table:
- [ISNP O słowniku](https://nazwiska.ijppan.pl/info/oslowniku), [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- [surname.pl/szczepanski](https://surname.pl/szczepanski), [surname.pl/metodologia](https://surname.pl/metodologia), [surname.pl/archiwa](https://surname.pl/archiwa), [surname.pl showcase](https://api.dane.gov.pl/1.4/showcases/1344)
- [szukaj-nazwiska.pl](https://szukaj-nazwiska.pl/Szczepa%C5%84ski)
- [nazwiska-polskie.pl](https://nazwiska-polskie.pl/Nowak)
- [pochodzenienazwiska.com](https://pochodzenienazwiska.com/grzegorczyk)
- [pl.wikipedia](https://pl.wikipedia.org/wiki/Grzegorczyk)

Other observed points:
- **Users ask for exactly this.** ISNP mail asks for current counts, all powiats/gminas, sources ("wskazanie źródeł"), missing surnames and etymology explanations — [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **"Herb nazwiska" demand is served by armorial databases that link surnames to noble families** ([gajl.wielcy.pl](https://gajl.wielcy.pl/), [szlachtarp.pl](https://szlachtarp.pl/lista-nazwisk-indeks11-UruskiRodzina.html)). ISNP received a demand to delete a surname because of its claimed "szlachecki rodowód" (noble lineage) — [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)
- **Person-finding intent sits next to surname curiosity:** nazwiska-polskie.pl's tagline and comments; szukaj-nazwiska's "Szukasz konkretnej osoby…?" (looking for a specific person?) linking to MyHeritage — [nazwiska-polskie.pl](https://nazwiska-polskie.pl/), [szukaj-nazwiska.pl](https://szukaj-nazwiska.pl/Czekierda)

### Inferences
**Hard to copy (candidate moat):**
- (a) A curated evidence inventory: sourced etymology hypotheses plus dated attestations with page-level citations and confidence labels. This needs onomastic expertise and rights clearance; ISNP took 2014–2021 to reach ~30k entries, and surname.pl chose LLMs instead.
- (b) Visible data-provenance QA: the exact snapshot file per number, form and variant disclosure, suppression and residence caveats, and version history. Competitors demonstrably fail at this (§2J).
- (c) Correct gendered pairing and both-gender declension generated from rules and cited to normative sources.
- (d) A paid, versioned report that only appears when evidence exists. No Polish competitor sells anything at surname level; monetisation is AdSense or MyHeritage affiliate.

**Easy to copy (do not position on):** PESEL counts, rankings, voivodeship maps, rarity, 2019–2026 series, TTS pronunciation, transliteration, games, archive link lists.

**Threats:**
- surname.pl: near-identical "free, aggregated, not genealogy, licence-aware" positioning, launched 2026, fast feature velocity.
- IJP PAN v2.0 by 2030: PESEL 2024 counts, more powiats/gminas, ~50k surnames, authority and media reach.
- Google AI Overviews / AI Mode absorbing simple meaning queries (UNVERIFIED impact).
- AI-SEO networks saturating the long tail.

**Opportunity at the edges of Name Atlas's rules:**
- The "herb nazwiska" query can be met with an explanation of why a surname does not imply a coat of arms, with no noble-descent claims.
- Person-finding intent should be explicitly declined, with a pointer to archive guidance. surname.pl already does this well, so it is table stakes, not a moat.

**Possible partnership:**
- IJP PAN (evidence, and possibly its institutional PESEL powiat/gmina extracts).
- PTG (Geneteka) for historical distribution, noting its heavy coverage bias.

Both are consistent with project notes that ISNP rights are unconfirmed and Geneteka is partnership-only.

### Gaps
- Whether ISNP content could be licensed, and on what terms (the About page states no licence).
- Whether MSWiA/MC would release powiat/gmina-level current counts to third parties as IJP PAN received them.
- Whether surname.pl plans premium features: its "o nas" page says free/no paywall, and future plans are unknown.
- Real user willingness to pay for a surname-level report in Poland: no Polish comparable found.
- Whether PWN/RJP or any tool offers per-surname, gender-aware declension (not verified).
