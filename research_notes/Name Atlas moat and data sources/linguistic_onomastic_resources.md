# Linguistic and onomastic resources for evidence-backed Polish surname features (state as of 2026-09-29)

Method note for the report writer: licence texts were fetched directly from rights-holder pages, repository metadata (CLARIN-PL DSpace REST API) and data-file headers on 2026-09-29. Counts marked "computed" were measured by this researcher on 2026-09-29 from the named file or live query (method given inline so they can be reproduced). "UNVERIFIED" means not confirmed from a primary source in this session. Statements about law are marked "[legal background, not verified in-session; for counsel]". Nothing here is legal advice. The shared web-search budget ran out partway through, so several items remain UNVERIFIED (listed under each Gaps heading).

## 1. Grammatical and lexical resources: SGJP, Morfeusz 2, Polimorf, sjp.pl, plWordNet, NKJP, CLARIN-PL items (licences and surname coverage)

### Takeaway
The SGJP inflection data (distributed with Morfeusz 2) is BSD-2-Clause. The current dump (2026-08-24) contains **95,401 surname lexemes (60,962 distinct base forms)** with fully tagged paradigms. These include masculine-personal plurals ("Nowakowie", "Kowalscy"), indeclinable feminine forms and a small set of traditional -owa/-ówna forms. That makes it the strongest commercially usable basis for declension. Polimorf (BSD-2), sjp.pl word lists (CC BY 4.0 / Apache 2.0 option), plWordNet (Princeton-style licence permitting commercial use) and NKJP's 1M subcorpus (CC BY 4.0) are also commercial-friendly. The whole of SGJP is **not** BSD-licensed, only the inflection data. Some CLARIN-PL items are NC or copyleft.

### Cited Findings

**Morfeusz 2 + SGJP inflection data (IPI PAN / SGJP authors)**
- Licence page, verbatim (PL): "Właścicielem praw autorskich programu Morfeusz 2 jest Instytut Podstaw Informatyki PAN. Autorami i właścicielami praw autorskich danych fleksyjnych SGJP są Zygmunt Saloni, Włodzimierz Gruszczyński, Marcin Woliński, Robert Wołosz i Danuta Skowrońska. Właścicielem praw autorskich danych fleksyjnych Polimorf jest Instytut Podstaw Informatyki PAN. Program i zawarte w nim dane fleksyjne zostają niniejszym nieodpłatnie udostępnione na tzw. dwuklauzulowej licencji BSD". — [Morfeusz 2 licence](https://morfeusz.sgjp.pl/doc/license/)
- Same page, FAQ: the full SGJP is **not** under BSD ("Nie. Na licencji BSD dostępne są tylko (czy też aż) dane potrzebne do analizy morfologicznej (lista form fleksyjnych). Cały SGJP być może kiedyś udostępnimy, ale nie określamy, kiedy i na jakich zasadach."). No separate commercial licence exists or is needed ("Licencja BSD jest na tyle liberalna, że osobna licencja komercyjna na Morfeusza SGJP nie wydaje się konieczna"). — [Morfeusz 2 licence](https://morfeusz.sgjp.pl/doc/license/)
- The licence page states that the authors' lawyer confirmed that analyser output contains fragments of the dictionary and is a derivative work ("opracowanie"). That is why they chose BSD over copyleft. — [Morfeusz 2 licence](https://morfeusz.sgjp.pl/doc/license/)
- Releases are frequent. Builds were listed through 2026-08-23. The folder for that release contains `sgjp-20260823.tab.gz` (41 MB), `polimorf-20260823.tab.gz` (45 MB), dictionary packages and binaries for Linux, Darwin and Windows. — [Morfeusz download](https://morfeusz.sgjp.pl/download/); [download.sgjp.pl listing](http://download.sgjp.pl/morfeusz/20260823/)
- The dump header reads `#!DICT-ID pl.sgjp.sgjp-2026.08.24`, then "Copyright © 2007–2026 Marcin Woliński, Zbigniew Bronk, Włodzimierz Gruszczyński, Witold Kieraś, Zygmunt Saloni, Danuta Skowrońska, Robert Wołosz", then the full BSD-2 text. The file has 7,458,548 lines. — [SGJP dump](http://download.sgjp.pl/morfeusz/20260823/sgjp-20260823.tab.gz)
- Requested citation: W. Kieraś, M. Woliński, "Morfeusz 2 – analizator i generator fleksyjny dla języka polskiego", Język Polski XCVII(1):75–83, 2017. — [Morfeusz 2 home](https://morfeusz.sgjp.pl/)
- SGJP 4th edition (online, 2020) "istotnie powiększony o bogaty wybór nazwisk (męskich i żeńskich), a także nazw polskich miejscowości". The statistics table shows proper-name lexemes growing from 10,710 (ed. III) to 124,389 (ed. IV). There are 455,830 lexemes in total and 1,148 inflection patterns. — [SGJP „O słowniku”](https://sgjp.pl/o-slowniku/)
- Also from SGJP ed. III: "kategoria deprecjatywności dla ponad 16 tys. rzeczowników męskoosobowych" (marked or deprecative plural forms are flagged). — [SGJP „O słowniku”](https://sgjp.pl/o-slowniku/)
- **Computed from the dump** (column 4 = name type):
  - 836,348 form-lines are tagged `nazwisko`.
  - 297 are tagged `nazwisko_(odmężowskie)` and 286 `nazwisko_(odojcowskie)`.
  - There are 95,401 distinct surname lemma IDs and 60,962 distinct surname base forms.
  - Qualifier values on surname rows: `hom.` 654, `char.` 652, `lit.` 64, `niezal.` 22, `bibl.` 12, `rzad.` 11, `niepopr.` 4, `pot.` 2, `arch.,char.` 2.
  - Source: [SGJP dump](http://download.sgjp.pl/morfeusz/20260823/sgjp-20260823.tab.gz)
- **Computed paradigm checks** (same dump; the notation is SGJP's own tags):
  - `Nowak:Sm1`: sg gen/acc Nowaka, dat Nowakowi, inst Nowakiem, loc/voc Nowaku; pl nom/voc **Nowakowie**, gen/acc Nowaków, dat Nowakom, inst Nowakami, loc Nowakach.
  - `Nowak:Sf` is a single indeclinable form for all cases and numbers.
  - The marked (deprecative) plural "Nowaki" is tagged `depr`.
  - `Nowakowa` is tagged `nazwisko_(odmężowskie)` with a full adjectival paradigm (Nowakowej, Nowakową…).
  - `Kowalski:Sm1` pl nom **Kowalscy**; `Kowalska` is a separate lemma; the depr form is "Kowalskie".
  - Lemmas Nowakowski, Nowicki, Nowaczyk, Nowaczek, Kowal, Kowalczyk, Kowalik, Wojtyła, Mickiewicz, Fredro, Linde and Kościuszko are present. "Brzęczyszczykiewicz" is absent.
  - Source: [SGJP dump](http://download.sgjp.pl/morfeusz/20260823/sgjp-20260823.tab.gz)

**Polimorf (IPI PAN)**
- "License: Both the source data and resulting resource are available on 2-clause BSD license." Polimorf merges Morfeusz SGJP and Morfologik. The page's historical figures: SGJP 2nd ed. 244,341 lexemes / 4,223,981 forms; Morfologik 216,992 lexemes. Morfologik's masculine subgender "reliability is low". — [PoliMorf page (ZIL IPI PAN)](https://zil.ipipan.waw.pl/PoliMorf)
- Repository metadata: Polimorf (2018) "BSD 2 Clause"; Morfeusz 2 (2016) "BSD 2 Clause". — [CLARIN-PL 11321/577](http://hdl.handle.net/11321/577); [CLARIN-PL 11321/257](http://hdl.handle.net/11321/257)

**sjp.pl word lists (community dictionary)**
- "Lista słów z odmianami" (file `sjp-odm-20260901.zip`) is "Udostępniane na licencjach (do wyboru): GPL 2, LGPL 2.1, CC BY 4.0, Apache 2.0". The README repeats this. — [sjp.pl odmiany](https://sjp.pl/sl/odmiany/)
- The game word list is GPL 2 / CC BY 4.0 and explicitly excludes proper names ("bez nazw własnych itp."). — [sjp.pl słownik do gier](https://sjp.pl/sl/growy/)
- **Computed:** the odmiany file (237,322 lines) contains surnames. Each line is a lemma followed by all forms, without grammatical tags. Examples:
  - "Nowak, Nowaka, … Nowakowie, Nowaków, Nowaku"
  - "Kowalski, Kowalscy, Kowalska, …"
  - "Gołąb" with both Gołąba… and Gołębia… forms
  - "Fredro, … Fredry, Fredrze"; "Kościuszko, … Kościuszce …"; "Linde, … Lindego …"
  - Source: [sjp.pl odmiany](https://sjp.pl/sl/odmiany/)

**plWordNet / Słowosieć (Wrocław University of Science and Technology)**
- Licence text: "plWordNet® is unencumbered, and may be used in commercial applications in accordance with the following license agreement… permission to use, copy, modify, distribute, and public expose this software and database (including data getting) and its documentation for any purpose and without fee or royalty is hereby granted, provided that you agree to comply with the following copyright notice and statements, including the disclaimer". It also says: "The name of Wrocław University of Technology may not be used in advertising or publicity". The package also contains Princeton WordNet 3.0 data under the WordNet 3.0 licence. — [plWordNet licence (CLARIN-PL)](https://clarin-pl.eu/license/plwordnet)
- Repository releases under this licence: plWordNet 4.5 (2021-07-23), plWordNet 4.2 (CLARIN-BIZ-START, 2022-04-11) and plWordNet 4.0 (2018). Papers about plWordNet (including "plWordNet 5.0 – challenges…", 2025) are CC BY 4.0. — [CLARIN-PL 11321/834](http://hdl.handle.net/11321/834); [11321/891](http://hdl.handle.net/11321/891); [11321/554](http://hdl.handle.net/11321/554); [11321/960](http://hdl.handle.net/11321/960)

**NKJP (National Corpus of Polish)**
- "Ręcznie anotowany milionowy podkorpus NJKP, dostępny na licencji CC-BY 4.0". The NERF named-entity tool is "dostępne na licencji GNU GPL v.3". The page lists only query engines (Poliqarp, MTAS, PELCRA) for the full corpus. — [NKJP narzędzia i zasoby](https://nkjp.pl/index.php?page=14&lang=0)

**CLARIN-PL repository items (licence from repository `dc.rights` metadata, queried via REST API)**
- NELexicon2 (2014-05-30): "Creative Commons - Attribution 3.0 Unported (CC BY 3.0)". — [CLARIN-PL 11321/247](http://hdl.handle.net/11321/247). **Conflict:** a search-engine summary claimed CC BY-SA 4.0 ([b2find record](https://b2find.eudat.eu/dataset/cc9f5dce-5500-5445-b3fe-1907e30aeeba)). That licence actually belongs to a different item, "Wikipedia Infobox Mapping PL" ([11321/293](http://hdl.handle.net/11321/293)). The repository metadata (CC BY 3.0) is the primary source.
- "Extended dictionary of named entities NELexicon connected with Linked Open Data" (2018): "GNU LGPL 3.0". — [CLARIN-PL 11321/529](http://hdl.handle.net/11321/529)
- The original NELexicon (2012) has no rights value in its metadata. — [CLARIN-PL 11321/22](http://hdl.handle.net/11321/22)
- KorBa (Elektroniczny korpus tekstów polskich z XVII i XVIII w., IJP PAN): "Pliki źródłowe podkorpusu anotowanego ręcznie (wersja 2.0) można pobrać tutaj (licencja: Creative Commons Attribution Share Alike)". The link points to CC BY-SA 4.0. The full corpus is web-query only, footer "Copyright © Instytut Języka Polskiego PAN". — [KorBa do pobrania](https://korba.edu.pl/download); [KorBa](https://korba.edu.pl/)
- One KorBa-derived text in CLARIN-PL ("Nowe Ateny […], t. 4", 1756) is CC BY 4.0. — [CLARIN-PL 11321/948](http://hdl.handle.net/11321/948)
- KorBa links its results to the "Elektroniczny słownik języka polskiego XVII i XVIII w." (sxvii.pl). — [KorBa](https://korba.edu.pl/)
- "Transkrypcja fonetyczna Kronik RP": "Attribution-NonCommercial 3.0 Unported (CC BY-NC 3.0)". This is non-commercial. — [CLARIN-PL 11321/426](http://hdl.handle.net/11321/426)
- 19th-century corpus ("Korpus polszczyzny XIX wieku", the article gives 1830–1918, at f19.uw.edu.pl): the corpus site did not respond on 2026-09-29, and CLARIN-PL returned no matching item. Per a search-result summary, an article describing it is itself CC BY-NC-ND 4.0, but that says nothing about the corpus licence. — [Article referencing F19](https://journals.akademicka.pl/lv/article/download/5083/4690) (search-summary level)

### Inferences
- **Declension MVP backbone:** use the SGJP dump (BSD-2). The product must keep the BSD notice (a "Licences/Credits" page). Pin the `DICT-ID` (e.g., `pl.sgjp.sgjp-2026.08.24`) as the SourceRecord version, so every generated form carries a Citation to the exact release.
- **User-facing filter:** SGJP includes `depr` forms (Nowaki, Kowalskie, Gołąby). These must be filtered out of anything user-facing, such as invitations.
- **Do not scrape sgjp.pl:** its web content beyond the dump (e.g., frequency information) is outside the BSD grant, per the FAQ. Treat it as all rights reserved.
- **sjp.pl as a cross-check only:** it is commercially usable under the CC BY 4.0 or Apache 2.0 option. It is untagged, and entry provenance is not documented in the download (it appears to be a volunteer-maintained dictionary; UNVERIFIED in-session), so it is weaker evidence. It is good for a second-source "attested in sjp.pl" check (e.g., raising confidence when SGJP and sjp.pl agree), not for case assignment.
- **What these resources do not give you:**
  - None of them states surname etymology.
  - SGJP lists Nowak, Nowakowski, Nowicki and Nowaczyk as separate lemmas but encodes no derivational link between them.
  - plWordNet gives present-day senses of homonymous common words (a possible "root word meaning" evidence source, licence permitting commercial use). A sense of "kowal" is **not** evidence that the surname Kowal derives from it. That link needs onomastic evidence (see sections 3–4).
- **Derivational families:** only a "formal (orthographic) stem similarity" claim can be produced deterministically from SGJP lemma lists plus suffix segmentation (-owski, -icki, -czyk, -ak). A "same root / derivational family" claim should stay INSUFFICIENT_DATA unless an onomastic source states it.
- **Historical and dialect attestation:** KorBa's annotated subcorpus (CC BY-SA 4.0) is usable commercially, but adaptations carry ShareAlike obligations. It is realistic as evidence of historical attestation of appellatives. Full KorBa and full NKJP are query-only; their terms of use for quoting search hits were not checked.

### Gaps
- NELexicon2 content was not opened. Whether it has a surname category, and its size, is UNVERIFIED.
- The F19 corpus licence and access are UNVERIFIED (site unreachable on 2026-09-29).
- The licence of sxvii.pl (17th–18th c. dictionary) is UNVERIFIED.
- The terms of use for the NKJP/KorBa query interfaces (quoting concordance lines) are UNVERIFIED.
- Polish Wiktionary (surname entries often have declension tables and IPA) could not be checked: Wikimedia APIs rate-limited this environment. Its licence (believed CC BY-SA, with ShareAlike implications) and its count of Polish surname entries are UNVERIFIED.
- SGJP surname-selection criteria (why these 61k) were not found. Coverage relative to the ~400k surname inventory is estimated in section 5 only.

## 2. Public-domain etymological and lexical dictionaries (Brückner, Linde, Słownik warszawski, Karłowicz's Słownik gwar polskich): death dates, PD status, digital versions

### Takeaway
All four works' named authors died more than 70 years ago, so they are public domain in Poland under life+70:
- Linde d. 1847
- Karłowicz d. 1903
- Kryński d. 1932
- Niedźwiedzki d. 1930
- Łoś (who completed Karłowicz's dialect dictionary) d. 1928
- Brückner d. 1939, PD in Poland from 1 Jan 2010

Brückner's 1927 dictionary is on Polish Wikisource (index plus Commons scans, PD notice), but transcription completeness is unverified. Linde has CLARIN-PL entry indexes (GPL-3) for a scanned edition. No ready structured dataset of Słownik warszawski was found; there is a 2022 doctoral thesis on its retrodigitisation.

### Cited Findings
- **Death dates** from a live Wikidata query (P570):
  - Aleksander Brückner 1856-01-29 – 1939-05-24 ([Q112029](https://www.wikidata.org/wiki/Q112029))
  - Samuel Linde d. 1847-08-08 ([Q1349910](https://www.wikidata.org/wiki/Q1349910))
  - Jan Aleksander Karłowicz d. 1903-06-14 ([Q3920131](https://www.wikidata.org/wiki/Q3920131))
  - Adam Kryński d. 1932-12-10 ([Q9139868](https://www.wikidata.org/wiki/Q9139868))
  - Władysław Niedźwiedzki d. 1930-02-06 ([Q9382134](https://www.wikidata.org/wiki/Q9382134))
  - Jan Łoś (linguist) 1860-05-14 – 1928-11-10 ([Q5963768](https://www.wikidata.org/wiki/Q5963768))
  - Source for all: [Wikidata Query Service](https://query.wikidata.org/)
- **Brückner:** the Wikisource page reproduces the 1927 Kraków edition (Krakowska Spółka Wydawnicza) as vol. 1 (A–O) and vol. 2 (P–Ż) plus a "Dodatek" and index. It shows "Tekst jest własnością publiczną (public domain)", with source scans on Wikimedia Commons. It is organised as page indexes; the proofreading status of individual pages was not stated. — [pl.wikisource: Słownik etymologiczny języka polskiego](https://pl.wikisource.org/wiki/S%C5%82ownik_etymologiczny_j%C4%99zyka_polskiego); [Commons category](https://commons.wikimedia.org/wiki/Category:S%C5%82ownik_etymologiczny_j%C4%99zyka_polskiego_(Br%C3%BCckner))
- The Wikisource search API showed a main-namespace page (pageid 74268) whose content references scan files "PL Aleksander Brückner-Słownik etymologiczny języka polskiego 005.jpeg" and letter indexes. — [pl.wikisource API search](https://pl.wikisource.org/w/api.php?action=query&list=search&srsearch=S%C5%82ownik%20etymologiczny%20j%C4%99zyka%20polskiego&format=json)
- Brückner's dictionary was first published in 1927 and "served through the 20th century as a principal Polish etymological dictionary… now to some extent superseded". — [Wikipedia: Słownik etymologiczny języka polskiego](https://en.wikipedia.org/wiki/S%C5%82ownik_etymologiczny_j%C4%99zyka_polskiego)
- **Linde:** CLARIN-PL holds "Entry index and some auxiliary indexes to Linde's dictionary" (2018, GNU GPL3) and "Indexes for djview4poliqarp" (GPL3). These are indexes to a scanned (DjVu) edition. — [CLARIN-PL 11321/702](http://hdl.handle.net/11321/702); [CLARIN-PL 11321/701](http://hdl.handle.net/11321/701)
- **Słownik warszawski** (Karłowicz–Kryński–Niedźwiedzki; published in Warsaw 1900–1927 per search summary, LIKELY):
  - Mirosław Koziarski, "Retrodigitalizacja Słownika warszawskiego. Cele, metody, narzędzia", doctoral thesis, AMU Poznań, 2022, open access.
  - The abstract says the dictionary "has received relatively little attention… a key resource for diachronic research". The thesis attempts "to extract the data contained in the Dictionary".
  - Source: [AMU repository record](https://repozytorium.amu.edu.pl/handle/10593/27024)

### Inferences
- **PD computation** (Polish life+70 counted from the end of the death year, per the brief): Brückner protected through 31 Dec 2009, so PD from 1 Jan 2010. Linde, Karłowicz, Łoś and Niedźwiedzki are long PD. Kryński (d. 1932) is PD from 1 Jan 2003.
- **Słownik warszawski co-author caveat:** the dictionary had many contributors beyond the three editors. Polish law runs co-authored works from the death of the last surviving co-author [legal background, not verified in-session; for counsel]. Check the contributor list before treating every entry as PD (UNVERIFIED).
- **Use the original editions:** later reprints (e.g., post-war reprints of Brückner) may add copyrighted editorial matter. Take text from the 1927 scans, not from reprints (UNVERIFIED which reprints add material).
- **Epistemic role:** these dictionaries explain **common words** (appellatives), not surnames. Brückner's etymology of an appellative can support a Claim like "the Polish word X meant Y (Brückner 1927, s.v. X)". It cannot support "the surname X comes from word X" unless the dictionary entry itself mentions the surname. Brückner is also dated ("to some extent superseded"), so appellative etymologies from it should carry LIKELY or POSSIBLE, not VERIFIED, unless corroborated.
- **Wikisource licensing:** Wikisource page text is PD for the underlying work. Wikisource-contributed transcription or markup sits under the site licence (the fetch summary reported CC BY-SA 4.0 for the site). The safest path for a paid surface is our own OCR of PD scans, with SourceRecords pointing to page images.

### Gaps
- Karłowicz's "Słownik gwar polskich" (commonly dated 1900–1911): publication dates and digitised copies (Polona or other digital libraries) are UNVERIFIED. The web-search budget was exhausted before this could be checked.
- Polona terms of use for PD scans are UNVERIFIED (not fetched).
- Whether IJP PAN or others host structured, searchable editions of Linde or Słownik warszawski, and under what terms, is UNVERIFIED. The Koziarski thesis suggests an extraction pipeline exists; dataset availability is unknown.
- The proportion of Brückner transcribed and proofread on Wikisource is UNVERIFIED.

## 3. Copyrighted specialist onomastic works (Rymut, Taszycki SSNO, SEMSNO, Hoffman, Bubak): rights holders, digital versions, database-right flags

### Takeaway
The core Polish anthroponymic reference works are in copyright and published by IJP PAN or Ossolineum:
- Rymut's 10-volume surname register (1992–94): 405,670 surnames, 1990 PESEL data, 49 voivodeships. Rymut d. 2006, so protected through 2076.
- Rymut's "Nazwiska Polaków" (1999–2001)
- Taszycki's SSNO (1965–1987): pre-1500 attestations. Taszycki d. 1979, so protected through 2049.
- SEMSNO (1995–2002): etymology and motivation of Old Polish names. Co-editor Cieślikowa d. 2018.

No open digital edition of these was found. IJP PAN is the natural single licensing counterparty for ISNP + SSNO + SEMSNO + Rymut. Hoffman's "Polish Surnames: Origins and Meanings" (PGSA, 3rd ed. 2012) indexes ~50,000 surnames by root, which is exactly the derivational-family structure, but it is commercial and copyrighted.

### Cited Findings
- **Rymut's register:** "Największym, bo obejmującym wszystkie nazwiska osób mieszkających w Polsce, jest „Słownik nazwisk współcześnie w Polsce używanych”, wydany przez K. Rymuta (wersja książkowa: t. I–X, 1992–1994). Antroponomastykon ten jednak podaje dane liczbowe z 1990 r. na podstawie bazy PESEL, odnoszące się do frekwencji całkowitej każdego z ówcześnie funkcjonujących 405 670 nazwisk w Polsce oraz liczby jego użytkowników w 49 województwach (według dawnego podziału terytorialnego Polski, obowiązującego w latach 1975–1998)." — [Skowronek et al., Onomastica LXII (2018), DOI 10.17651/ONOMAST.62.16](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)
- Bibliographic data from the same article:
  - "Słownik nazwisk współcześnie w Polsce używanych (1992–1994). Wyd. K. Rymut. T. I–X. Kraków: IJP PAN"
  - "Rymut, K. (1999–2001). Nazwiska Polaków. Słownik historyczno-etymologiczny. T. I–II. Kraków: Wyd. IJP–DWN". The article calls such dictionaries "z konieczności cząstkowy" with a smaller material base.
  - Source: [Skowronek et al. 2018](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)
- **SSNO:** "„Słownik staropolskich nazw osobowych” pod redakcją W. Taszyckiego (t. I–VII, Wrocław 1965–1987), zawierający imiona, nazwiska, przezwiska, nazwy heraldyczne utrwalone w źródłach historycznych przed 1500 r." Bibliography: T. I–VI Ossolineum 1965–1983; T. VII Suplement "Oprac. pod kier. M. Malec", 1984–1987. — [Skowronek et al. 2018](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)
- **SEMSNO:** "„Słownik etymologiczno-motywacyjny staropolskich nazw osobowych” … pod red. A. Cieślikowej, M. Malec i K. Rymuta, który objaśnia pochodzenie, etymologię i motywację różnych nazw osobowych". The bibliography gives "Cz. 1–7, Kraków 1995–2002"; the body text says 1995–2000/2001 (minor internal inconsistency). — [Skowronek et al. 2018](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)
- **ISNP methodology** (the project's known partnership target; recorded here because it defines the scholarly standard):
  - Work began mid-2014, targeting "30 000 najczęściej używanych nazwisk spośród ponad 400 000 wszystkich używanych obecnie w Polsce", with PESEL 2014 frequency data.
  - Entries carry "Zapisy" (historical attestations with dictionary code, year, volume, page, quotation). The oldest (12th–15th c.) come from SSNO.
  - Entries also give "możliwe i prawdopodobne etymologie oraz motywacje".
  - Formally appellative-identical surnames (Bębenek, Boczek, Dąbek) "uznaje się zasadniczo za nazwy niederywowane". Derived forms get a comment on the suffix function (patronymic, diminutive, hypocoristic…).
  - Example of multiple candidate etymologies: "Bieńk-owska … < n. m. Bieńki lub n. os. Bieniek bądź … < nazwiska męskiego Bieńkowski".
  - Source: [Skowronek et al. 2018](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)
- The ISNP "Zawiera on ok. 30 tys. najczęstszych form nazwisk" and is "bezpłatny i ogólnodostępny". Those 30k surnames are used by "ok. 75–80% ludności kraju". It uses 2014 frequency data. — [Górny, Onomastica 68 (2024), DOI 10.17651/ONOMAST.68.20](https://onomastica.ijppan.pl/index.php/ONOM/article/view/533)
- **Death dates** (live query, P570): Kazimierz Rymut 1935-12-18 – **2006-11-14** ([Q980744](https://www.wikidata.org/wiki/Q980744)); Witold Taszycki 1898-06-20 – 1979-08-08 or -09 (two values; [Q8028454](https://www.wikidata.org/wiki/Q8028454)); Aleksandra Cieślikowa 1936-01-07 – 2018-12-11 ([Q9146492](https://www.wikidata.org/wiki/Q9146492)); Ewa Wolnicz-Pawłowska b. 1947, no death date ([Q18424599](https://www.wikidata.org/wiki/Q18424599)). Source: [Wikidata Query Service](https://query.wikidata.org/)
- **Hoffman, "Polish Surnames: Origins & Meanings"**, 3rd ed. revised (PGSA):
  - Vol. I (2012, 260 pp.) covers surname history and suffixes (-ski, -czak, -owitz…).
  - Vol. II (936 pp.) is "an index of some 50,000 common surnames organized by the roots the names are derived from, with an indication of the number of Polish citizens that bore each name as of 2002".
  - Sold as a 2-volume set, book+CD and electronic download. ISBNs 978-0-924207-13-6 and 978-0-924207-14-3.
  - Source: [PGSA product page](https://pgsa.org/product/polish-surnames-origins-and-meanings-3rd-ed-2-volume-book-set/); [PGSA electronic download](https://pgsa.org/?p=140366)
- The search found no electronic or online version of Taszycki's SSNO. The IJP PAN digital onomastic products it surfaced were the hydronym e-dictionary (2015) and ISNP. — search summary over [Onomastica-hosted articles](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/165/106) (secondary; UNVERIFIED as a negative)

### Inferences
- **Copyright terms** (life+70 from end of the death year):
  - Rymut: through 31 Dec 2076 (Wikidata death date 2006-11-14)
  - Taszycki: through 31 Dec 2049
  - Cieślikowa: through 31 Dec 2088
  - SSNO and SEMSNO are team works (Pracownia Antroponimiczna IJP PAN; Malec et al.). Collective-work rules may vest rights in the publisher or producer [legal background, not verified in-session; for counsel].
  - Practical counterparties: IJP PAN (SNWPU, SEMSNO, ISNP), Ossolineum (SSNO publisher), DWN/IJP (Nazwiska Polaków), PGSA and/or the author (Hoffman).
- **One licensing conversation:** IJP PAN already produces ISNP, and ISNP entries cite SSNO/SEMSNO attestations. The ISNP partnership could therefore also cover SSNO/SEMSNO-derived attestations. This is a negotiation idea, not a finding.
- **EU sui generis database right: flag for counsel, no conclusion** [legal background, not verified in-session]:
  - (a) Rymut's 1990 frequency-by-49-voivodeship tables are a register-derived compilation. Whether a database right arose, and whether it has expired (the Directive term is 15 years from completion or publication, renewable on substantial new investment) or been renewed via later editions, needs counsel.
  - (b) The underlying PESEL data is state-held. Re-use of register extracts falls under separate public-sector re-use rules.
  - (c) The PESEL 2014-based ISNP counts and Hoffman's 2002 counts are more recent compilations, where a database right is more plausible.
- **Epistemic lesson from ISNP's method:** even the leading scholarly source gives "possible and probable" etymologies, often several alternatives (Bieńkowska example). Name Atlas's ConfidenceAssessment should map multiple scholarly alternatives to CONFLICTING or POSSIBLE, not collapse them. Appellative-identical surnames are "non-derived" by convention, which gives a documented rule for when a "root word = the surname itself" claim is legitimate (only when the source says so).

### Gaps
- Józef Bubak: Wikidata has a "Józef Bubak" (1934–1999, [Q112554289](https://www.wikidata.org/wiki/Q112554289)), but a label match does not confirm this is the onomastician. His surname works (e.g., Podhale surname dictionary), their rights holders and digital status are UNVERIFIED.
- Whether any CD-ROM or electronic edition of Rymut's register exists (e.g., a later PESEL-based electronic dictionary), and under what terms: UNVERIFIED. The ISNP article found no such mention.
- Hoffman's rights holder (author vs PGSA) and whether PGSA licenses data: UNVERIFIED.
- Online or digital versions of SEMSNO and "Nazwiska Polaków": UNVERIFIED.

## 4. Open-access scholarly literature as citeable evidence (Onomastica, Język Polski, Poradnik Językowy, Rozprawy Komisji Językowej ŁTN)

### Takeaway
Recent Onomastica articles (IJP PAN) are CC BY-ND 4.0, explicitly permitting "commercial and non-commercial" redistribution with citation but no derivatives. Rozprawy Komisji Językowej ŁTN is CC BY 4.0 since 2024 (CC BY-NC-ND 4.0 before). Język Polski and the Poradnik Językowy digital archive show no CC licence on the pages checked. All are citeable: facts can be paraphrased and linked. Verbatim or translated reuse depends on the licence.

### Cited Findings
- **Onomastica** article PDFs state: "This is an Open Access article distributed under the terms of the Creative Commons Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0) License (https://creativecommons.org/licenses/by-nd/4.0/), which permits copying and redistribution, commercial and non-commercial, provided that the article is properly cited. © Copyright by Instytut Języka Polskiego PAN, Kraków 2024." — [Górny 2024 PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682); same statement in [another Onomastica PDF (OJS id 284)](https://onomastica.ijppan.pl/index.php/ONOM/article/download/284/288)
- **Conflict:** the Onomastica site footer shows a **CC BY-ND 3.0** badge image, with no link or text. The per-article PDFs say CC BY-ND 4.0. — [Onomastica OJS](https://onomastica.ijppan.pl/index.php/ONOM); [article page HTML](https://onomastica.ijppan.pl/index.php/ONOM/article/view/537)
- The 2018 Onomastica LXII PDF (Skowronek et al.) contains no "Creative Commons" statement (computed text search), so older volumes may not carry a CC licence. — [Skowronek et al. 2018 PDF](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)
- Journal identifiers: ISSN 0078-4648 (print), e-ISSN 2658-2783, IJP PAN Kraków. — [Onomastica](https://onomastica.ijppan.pl/index.php/ONOM)
- **Rozprawy Komisji Językowej ŁTN:** "Od 2024 roku wszystkie artykuły publikowane są na licencji Creative Commons Attribution 4.0 International (CC BY 4.0). W poprzednich latach artykuły ukazywały się na licencji CC BY-NC-ND 4.0." Authors retain copyright. — [Rozprawy Komisji Językowej ŁTN](https://czasopisma.ltn.lodz.pl/Rozprawy-Komisji-Jezykowej/pl)
- **Język Polski** (TMJP): the home page shows "© Copyright by Towarzystwo Miłośników Języka Polskiego, Kraków 2026" (ISSN 0021-6941, e-ISSN 2720-1406). No CC licence link or text was found on the home, about or article pages checked. — [Język Polski](https://jezyk-polski.pl/index.php/jp); [sample article page](https://jezyk-polski.pl/index.php/jp/article/view/1034)
- **Poradnik Językowy – archiwum cyfrowe** (UW) has indexes by issues, authors, sections, "Wyrażenia" and "Afiksy". Its navigation references journal history 1901–1939 and 1948–2015. No licence was shown on the home page. — [Poradnik Językowy archiwum](https://poradnik-jezykowy.uw.edu.pl/)
- **Polonica** (IJP PAN) carries A. Firlej, "Odmiana nazwisk polskich. Część I" (Polonica XXXVIII), a study of Polish surname declension with survey data. — [Firlej, Polonica XXXVIII (PDF)](https://polonica.ijp.pan.pl/index.php/polonica/article/download/124/71/351)
- There is an Onomastica article about DFD: "…Möglichkeiten und Perspektiven der digitalen Familiennamenlexikographie", Onomastica LXII, pp. 281–298 (cited in Skowronek et al. 2018; DOI 10.17651/ONOMAST.62.15 per search listing). — [Skowronek et al. 2018 bibliography](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33); [yadda record](https://yadda.icm.edu.pl/cejsh/element/bwmeta1.element.ojs-doi-10_17651_ONOMAST_62_15)

### Inferences
- **Using CC BY-ND articles:**
  - Name Atlas may link and cite, may paraphrase facts (facts are not protected; paraphrase is not redistribution of the article), and may reproduce short verbatim passages with citation.
  - An **English translation** of a verbatim passage is arguably an adaptation, which ND does not permit [legal background, not verified in-session; for counsel].
  - This matters for diaspora UI: store the Polish quote as the EvidenceItem, and render an English **paraphrase** as the Claim, rather than translating the quote.
- **Using CC BY 4.0 articles (Rozprawy KJ ŁTN, 2024+):** translation and adaptation are allowed with attribution.
- **Pre-2024 Rozprawy (CC BY-NC-ND):** citation and paraphrase only on paid surfaces.
- **Pipeline mapping:** Source = journal article (DOI) → SourceRecord = page or paragraph → EvidenceItem = quoted statement ("X < apelatyw Y") → Claim (paraphrased) → ConfidenceAssessment by rule (peer-reviewed onomastic statement = LIKELY/VERIFIED depending on hedging words like "prawdopodobnie") → Citation with DOI.

### Gaps
- Whether Onomastica or IJP PAN offer OA monographs on Polish surname formation (e.g., the IJP PAN publishing house) was not researched: search budget exhausted. UNVERIFIED.
- Licences for Język Polski, current Poradnik Językowy issues (the current publisher site was not identified) and Polonica: UNVERIFIED.
- Which Onomastica volume the CC BY-ND 4.0 regime starts from: UNVERIFIED (the 2018 PDF had no statement; 2024 does).

## 5. Declension norms ("odmiana nazwisk"): authoritative rules, deterministic implementability, existing tools and accuracy

### Takeaway
The normative position is clear that surnames should be declined. It is documented in:
- a 1999 Rada Języka Polskiego communiqué "Wstyd nie odmieniać nazwisk" (I. Bajerowa)
- PWN Poradnia guidance: "Nowakowie" covers the whole family; for "Gołąb" both Gołębia and Gołąba are acceptable, and the expert prefers Gołąba

Deterministic implementation is feasible for most names by **lookup in the SGJP dump**. SGJP already encodes variant pairs (Gołąba/Gołębia, Kozioła/Kozła), mobile-e (Wróbla), adjectival foreign names (Lindego) and indeclinable feminine forms.

Measured coverage: 91.1% of Wikidata's Polish-labelled surname forms, excluding traditional -owa/-ówna forms. But SGJP has ~61k base forms against more than 400k surname forms in use in Poland. The long tail needs rule-based generation labelled as lower confidence. No published accuracy figures for existing tools were found.

### Cited Findings
- **RJP 1999:** "W komunikacie Rady Języka Polskiego z 1999 r. pt. „Wstyd nie odmieniać nazwisk” Irena Bajerowa odfleksyjnianie nazwisk uznaje za „nieprzyjemne błędy w szczególny sposób obrażające podstawowe zasady języka polskiego, a częste niestety w języku oficjalnym, który powinien stanowić wzór poprawności”." — [Firlej, Polonica XXXVIII](https://polonica.ijp.pan.pl/index.php/polonica/article/download/124/71/351) (secondary citation of the RJP text; original RJP URL not located)
- **PWN Poradnia (K. Kłosińska, 21.12.2020):** "forma Nowakowie obejmuje wszystkich członków rodziny noszących to nazwisko, nie tylko męża i żonę, a zatem można (a nawet należy) jej użyć także wówczas, gdy piszemy do rodziców i dzieci … poprawna wersja to: K., R. i J. Nowakowie". — [PWN: Do kogo odnosi się forma Nowakowie?](https://sjp.pwn.pl/poradnia/haslo/Do-kogo-odnosi-sie-forma-Nowakowie;20691.html)
- **PWN Poradnia (J. Grzenia, 24.03.2003):**
  - Surnames identical to common nouns (Gołąb, Kocioł, Kozioł) "mogą mieć dwojaką odmianę": (a) like the noun (pana Gołębia, Kotła, Kozła) or (b) without internal alternation (pana Gołąba, Kocioła, Kozioła).
  - Bearers generally prefer (b), and he favours (b) as basic.
  - "w nazwiskach mających więcej niż jedną sylabę zachowujemy tzw. ruchome e, np. Wróbel, pana Wróbla".
  - Monosyllabic: "pana Dąba, Mecha".
  - Source: [PWN: odmiana nazwisk](https://sjp.pwn.pl/poradnia/haslo/odmiana-nazwisk;3099.html)
- **SGJP encodes these variants** (computed from dump; variant rows carry no preference qualifier):
  - `Gołąb:Sm1` has both **Gołąba** and **Gołębia** (gen/acc) and both **Gołąbowie** and **Gołębiowie** (pl nom).
  - `Kozioł:Sm1` has Kozioła and Kozła.
  - `Wróbel:Sm1` gen **Wróbla**.
  - `Linde:Sm1` gen **Lindego** (adjectival); `Fredro:Sm1` gen **Fredry**, pl **Fredrowie**.
  - Feminine `Fredro:Sf`, `Gołąb:Sf`, `Wróbel:Sf` and `Linde:Sf` are indeclinable; feminine `Wojtyła:Sf` declines (Wojtyły).
  - Source: [SGJP dump](http://download.sgjp.pl/morfeusz/20260823/sgjp-20260823.tab.gz)
- **Coverage measurement** (computed 2026-09-29):
  - 48,970 distinct Polish native labels (P1705@pl) of Wikidata family-name items were compared with the 60,962 SGJP surname base forms. 29,677 match (60.6%).
  - By ending class: adjectival -ski/-cki/-dzki 9,583/10,737 = 89.3%; -ak/-ek/-ik/-yk/-uk/-ec 5,911/6,232 = 94.8%; -o 881/1,006 = 87.6%; other 8,795/9,848 = 89.3%; -a-final 4,507/21,147 = 21.3%.
  - The -a group is dominated by traditional married or maiden forms (sample: Górkówna, Czmochowa, Łajcyna, Sobarnianka).
  - Excluding 16,568 labels ending in -owa/-ówna/-ina/-yna/-anka/-ewa, the match rate is **29,516/32,402 = 91.1%**.
  - Sources: [Wikidata Query Service](https://query.wikidata.org/); [SGJP dump](http://download.sgjp.pl/morfeusz/20260823/sgjp-20260823.tab.gz)
- There are "ponad 400 000" surname forms in use in Poland ([Skowronek et al. 2018](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)), and 405,670 in the 1990 register ([same](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)).
- Firlej's Polonica study notes a "nasilający się proces ujednolicania form, prowadzący do „odfleksyjniania” nazw własnych". It used a survey testing forms in four cases (D, C, N, Ms). — [Firlej, Polonica XXXVIII](https://polonica.ijp.pan.pl/index.php/polonica/article/download/124/71/351)
- **Context:** RJP's new "Zasady pisowni i interpunkcji polskiej" took effect 1 Jan 2026 (orthography). That concerns spelling rules, not declension (secondary source). — [Spider's Web, Dec 2025](https://spidersweb.pl/2025/12/zbliza-sie-wielka-reforma-ortografii.html)

### Inferences
- **Deterministic design:**
  - (1) Look up the lemma in SGJP → emit all non-`depr` forms with SGJP tags. Where two forms share a tag (Gołąba/Gołębia), emit both as acceptable variants.
  - Default ordering can follow the PWN expert preference (non-alternating first). That preference should be a cited Claim (Grzenia/PWN), not an unsourced default.
  - (2) If not found, apply ending-class rules modelled on SGJP patterns, e.g. adjectival -ski → -scy.
  - Label rule-generated forms as generated, with ConfidenceAssessment below attested forms (e.g., LIKELY). Show "attested in SGJP" vs "generated by rule" in the Citation.
  - (3) Always offer the feminine indeclinable form for consonant-final surnames. The Państwo X-owie plural covers mixed families (PWN).
- **Where naive rules fail:** foreign-origin surnames whose declension depends on pronunciation (Linde → Lindego), mobile-e, and bearer preference. The UI should say "both forms are correct" rather than assert one.
- **Rough coverage:** SGJP's 60,962 base forms are about 15% of the more than 400,000 distinct surname forms (computed ratio). The measured 91% match on Wikidata labels is biased toward notable people's surnames. True coverage **by bearers** is unknown but likely much higher than 15%, because frequent surnames are more likely included (UNVERIFIED).
- **Wedding-invitation phrasing** can be generated from SGJP tags for Nowak: Państwo Nowakowie (nom), Państwa Nowaków (gen/acc), Państwu Nowakom (dat), z Państwem Nowakami (inst), o Państwu Nowakach (loc). Every form comes from the tagged dump. Only the "Państwo" frame is product text.

### Gaps
- No published accuracy evaluation of existing online surname-declension tools or libraries was found. The search budget ran out before targeted searches; UNVERIFIED.
- The original RJP 1999 communiqué URL on rjp.pan.pl was not located (RJP site search returned nothing parseable). The secondary citation (Polonica) is used.
- Normative treatment of traditional -owa/-ówna forms (SGJP has only 297/286 such form-lines) and of double-barrelled surnames was not checked.
- The meaning of SGJP qualifiers `char.`, `hom.` and `niezal.` on surname rows was not confirmed from SGJP documentation.

## 6. Pronunciation: open Polish G2P tools, lexicons and TTS voices with commercial-friendly licences

### Takeaway
For IPA and phonetic transcription, the CLARIN-PL "Polish Grapheme-to-phoneme tool and service" (PJAIT; Koržinek, Brocki, Marasek) is **BSD-2-Clause**, which is commercial-friendly. espeak-ng is **GPL-3.0-or-later**. For audio, Piper's Polish voice datasets are CC0 or CC BY 4.0. But **every Polish Piper voice checked is fine-tuned from the US-English "lessac" voice**, which was trained on Blizzard 2013 Lessac data under a research-only licence that explicitly excludes commercial voice-synthesis use. Commercial use of Piper Polish voices is therefore a HIGH-RISK item for counsel.

### Cited Findings
- **Polish G2P:** "Polish Grapheme-to-phoneme tool and service". Authors Koržinek, Danijel; Brocki, Łukasz; Marasek, Krzysztof. Publisher Polish-Japanese Academy of Information Technology. Rights "BSD 2 Clause". "This archive contains the source code of the Polish grapheme-to-phoneme conversion tool and the webservice located at http://mowa.clarin-pl.eu/transcriber/". — [CLARIN-PL 11321/295](http://hdl.handle.net/11321/295)
- **espeak-ng:** "eSpeak NG Text-to-Speech is released under the GPL version 3 or later license." — [espeak-ng README](https://github.com/espeak-ng/espeak-ng)
- **Piper code:** legacy repo `rhasspy/piper` LICENSE.md "MIT License, Copyright (c) 2022 Michael Hansen"; successor `OHF-Voice/piper1-gpl` COPYING is "GNU GENERAL PUBLIC LICENSE Version 3". — [rhasspy/piper](https://github.com/rhasspy/piper); [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)
- **Piper Polish voices** in `rhasspy/piper-voices` (pl_PL): bass, darkman, gosia, mc_speech, mls_6892. Model cards:
  - darkman (medium): dataset `OHF-Voice/voice-datasets`, "License: CC0", "Finetuned from U.S. English lessac voice (medium quality)"
  - gosia (medium): same dataset licence (CC0) and same lessac fine-tune
  - mc_speech (medium): dataset "the-mc-speech-dataset" (Kaggle), "License: CC0", lessac fine-tune
  - mls_6892 (low): dataset OpenSLR 94, "License: CC BY 4.0", "Finetuned from U.S. English Ryan voice"
  - bass (high): card not read
  - Source: [piper-voices pl_PL tree](https://huggingface.co/rhasspy/piper-voices/tree/main/pl/pl_PL); [darkman card](https://huggingface.co/rhasspy/piper-voices/blob/main/pl/pl_PL/darkman/medium/MODEL_CARD); [gosia card](https://huggingface.co/rhasspy/piper-voices/blob/main/pl/pl_PL/gosia/medium/MODEL_CARD); [mc_speech card](https://huggingface.co/rhasspy/piper-voices/blob/main/pl/pl_PL/mc_speech/medium/MODEL_CARD); [mls_6892 card](https://huggingface.co/rhasspy/piper-voices/blob/main/pl/pl_PL/mls_6892/low/MODEL_CARD)
- **lessac voice card:** dataset "https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/", licence link to the Blizzard 2013 licence, "Trained from scratch". — [en_US lessac card](https://huggingface.co/rhasspy/piper-voices/blob/main/en/en_US/lessac/medium/MODEL_CARD)
- **Blizzard 2013 Lessac licence:**
  - It is a "RESEARCH LICENCE AGREEMENT". "Research Purposes" "excludes … using the Materials for any commercial purpose, including the development, marketing, commercialisation, sale or licencing of voice synthesis or speech recognition products or services".
  - The grant is "a non-exclusive and non-transferable licence, without the right to sub-licence, to use the Materials exclusively for Research Purposes only".
  - Source: [Blizzard 2013 Lessac licence](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)
- **Conflict:** an aggregator states "Piper Polish voice models are licensed under the MIT license… free to use in commercial" ([tts.ai](https://tts.ai/voices/piper/?lang=pl)). This conflates the MIT code licence with the voice models, and ignores the upstream lessac fine-tuning disclosed in the primary model cards above.
- **Non-commercial phonetic resource to avoid:** "Transkrypcja fonetyczna Kronik RP" is CC BY-NC 3.0. — [CLARIN-PL 11321/426](http://hdl.handle.net/11321/426)

### Inferences
- **MVP pronunciation (text):**
  - Run the BSD-2 CLARIN-PL G2P offline to produce IPA or phonetic strings.
  - Store the tool version as the SourceRecord. Label output as "generated transcription (tool X)", i.e. a derived Claim, not an attested one.
  - Generated IPA for surnames of foreign origin (e.g., Linde) can be wrong, because Polish G2P rules assume Polish orthography. Give lower confidence for non-native spellings.
- **espeak-ng (GPL-3):** usable as a separate server-side process. Whether its generated output carries GPL obligations is generally understood as "no" [legal background, not verified in-session; for counsel]. Distributing a modified espeak-ng would trigger GPL obligations.
- **Audio:** avoid Piper Polish voices on paid surfaces until counsel reviews lessac inheritance. Safer options, all unverified alternatives to research:
  - train or fine-tune a voice only on CC0 data (e.g., the MC Speech dataset) from a clean base
  - use a commercial TTS vendor with explicit commercial terms
  - use human-recorded audio for the top N surnames

### Gaps
- The "bass" Polish Piper voice card and the en_US "ryan" dataset licence (base of mls_6892) were not read. UNVERIFIED.
- Common Voice Polish (CC0) and Lingua Libre or Wiktionary audio (per-file CC licences) were not checked. The search budget was exhausted. UNVERIFIED.
- Current availability and uptime of the mowa.clarin-pl.eu transcriber service, and G2P accuracy figures: UNVERIFIED.
- Other open Polish G2P lexicons (e.g., Wiktionary-derived IPA, Epitran): not checked. UNVERIFIED.

## 7. Historical and diaspora spelling variants (Russian partition 1868–1918, German, Latin, Yiddish/Hebrew; "In Their Words"; Wikidata)

### Takeaway
Primary genealogical guidance confirms that civil registers in Russian Poland had to be kept in Russian from April 1868 until 1918, so Cyrillic renderings of Polish surnames are a real record-matching need. No lawful, open, structured dataset of historical Latin, German or Cyrillic surname spellings was found:
- Wikidata's 32,590 Polish-labelled family-name items have only **30** transliteration (P2440) statements. They do have 9,181 gender-pair (P5278) links and 1,739 "said to be the same as" (P460) links.
- The standard practical guides are Shea & Hoffman's four-volume "In Their Words" (Polish, Russian, Latin, German), sold by PGSA. They are copyrighted: fine as a reference for rule design, but not as a data source.

### Cited Findings
- "From the beginning in 1808, the civil registers were kept in the Polish language. As of April 1868, they were required to be kept in Russian. In 1918, they were again kept in Polish." The page also lists "Polish Cyrillic: Transliterate the Polish language to a Cyrillic" among its tools. — [FamilySearch Research Wiki: Russian Poland Civil Registration](https://www.familysearch.org/en/wiki/Russian_Poland_Civil_Registration)
- **Conflict:** a search-result summary over FamilySearch community and JewishGen threads says "All records of Poland from 1868 to 1915 are in Russian" ([FamilySearch community](https://community.familysearch.org/de/discussion/comment/558779); exact attribution LIKELY, not confirmed). The Wiki says Polish resumed in 1918; the brief says 1868–1917. The end date likely varies by locality and by the 1915 German occupation. Treat as UNVERIFIED per locality.
- **Polish Cyrillic orthography** (the Russian-Empire Cyrillization of Polish) maps sz → ш, cz → ч, szcz → щ, and rz → a special character (р̌). Polish was "fully replaced with Russian by the mid-1860s" in official use. — [Wikipedia: Cyrillization of Polish under the Russian Empire](https://en.wikipedia.org/wiki/Cyrillization_of_Polish_under_the_Russian_Empire) (search-summary level; LIKELY). This describes a Polish-in-Cyrillic orthography project, not necessarily clerks' spelling practice in 1868–1918 civil records.
- **"In Their Words"** (Shea & Hoffman) has separate volumes for Polish, Russian, Latin and German, sold by PGSA as print and PDF. The Russian volume (revised 2014) "includes 88 Russian-language documents and extracts… analyzed and translated". The German volume is 665 pages. Each book covers the language's "alphabet, spelling, pronunciation, and standard handwriting" and lists "thousands of the terms most often encountered". — [PGSA: ITW Russian](https://pgsa.org/?p=1301); [PGSA: ITW Polish](https://pgsa.org/product/in-their-words-polish/); [PGSA: ITW Latin](https://pgsa.org/product/in-their-words-latin/); [PGSA: ITW German](https://pgsa.org/product/in-their-words-volume-iv-german/); [Avotaynu: ITW German](https://www.avotaynu.com/books/ITW-German.html)
- **Wikidata** (live queries, 2026-09-29):
  - 35,574 distinct family-name items are used (P734) by humans with Polish citizenship (P27 = Q36).
  - 32,590 family-name items carry a Polish native label (P1705@pl), with 48,970 distinct Polish labels and 58,335 item-label pairs.
  - Of these 32,590 items: 9,181 have P5278 "surname for other gender", 30 have P2440 "transliteration", 1,739 have P460 "said to be the same as".
  - Relevant external-ID properties exist: Geneanet family name ID (P9644), MyHeritage Surname ID (P5452), Dictionary of American Family Names ID (P13742), and "family name identical to this given name" (P1533).
  - Source: [Wikidata Query Service](https://query.wikidata.org/); [P5278](https://www.wikidata.org/wiki/Property:P5278); [P2440](https://www.wikidata.org/wiki/Property:P2440); [P460](https://www.wikidata.org/wiki/Property:P460)
- **Genealogy forum evidence:** a search-result summary over JewishGen ViewMate threads reports surnames appearing in both Russian transliteration and Polish forms, with spelling variation such as "Michalczak or Michalska" noted in records. — [JewishGen ViewMate example](https://www.jewishgen.org/viewmate/responselist.asp?key=97084) (forum; search-summary level; low evidential weight)

### Inferences
- **Wikidata's role:** useful for masculine/feminine pairing (9,181 P5278 links) and a few variant links. It is effectively **empty** for historical transliterations (30 P2440 statements), so it cannot power the Cyrillic, Latin or German variant feature.
- **Consequence for Name Atlas:**
  - Historical-spelling output would be **generated** from a rule table (Polish → Russian Cyrillic as clerks wrote it; Latinised given-name conventions do not apply to surnames).
  - Such output must be labelled POSSIBLE ("how it may have been written"), never VERIFIED, unless matched to an attested record index. Record indexes are a separate rights question.
  - The rule table itself must be built from lawful sources. ITW is copyrighted, so facts can be learned from it but its tables cannot be copied. The FamilySearch Wiki's own licence was not checked.
- **Yiddish/Hebrew spellings:** these conflict with the standing invariant "No ethnicity/religion inference from a surname". Showing a Yiddish or Hebrew rendering for a Polish surname risks implying Jewish ancestry. Recommend treating any such feature as a product decision for `docs/DECISIONS_NEEDED.md`, e.g. only for a user-initiated script search, with no inference text. No resource for this was researched in depth.

### Gaps
- An authoritative, citable table of how Russian-partition clerks rendered Polish letters (ł, ą, ę, rz, ó, ś…) in 1868–1918 registers was not retrieved: search budget exhausted. UNVERIFIED.
- Latin-form (parish registers) and German-form (Prussian/Austrian partition) surname conventions: no open dataset found and not researched in depth. UNVERIFIED.
- Yiddish/Hebrew surname-form resources (e.g., specialist Jewish-surname dictionaries) and their licences: not researched. UNVERIFIED.
- FamilySearch Research Wiki licence and terms of reuse: UNVERIFIED.
- Wikidata licence (CC0) was not re-fetched this session; it relies on the project's existing source list.

## 8. DFD – Digitales Familiennamenwörterbuch Deutschlands (Polish-origin surnames in Germany): licence and reuse

### Takeaway
DFD (Akademie der Wissenschaften und der Literatur Mainz with TU Darmstadt) is online at namenforschung.net, free to use, and aims at ~200,000 name articles (all surnames with 10 or more bearers in Germany), completing in 2035. Its **licence and reuse terms are UNVERIFIED**: the site served a bot challenge (HTTP 403) to both automated fetchers, and no secondary source stated a licence. Treat it as all rights reserved: citeable with links, not ingestible, until the Academy confirms terms.

### Cited Findings
- DFD "can be accessed at www.namenforschung.net". It "contains around 200,000 name articles (all family names ≥ 10 tokens)", has been "online since 2013", and is "publicly accessible and free to use". It covers German surnames "including foreign-language names". — search summary of [ADW Mainz project page](https://www.adwmainz.de/en/research/projects/details/das-digitale-familiennamenwoerterbuch-deutschlands-dfd.html) (secondary; the page itself returned JS-only or challenge content to curl)
- Press release: the project "soll 2035 zum Abschluss kommen". No licence is mentioned. Poland is mentioned only as a country with "ähnlichen Vorhaben". — [idw news 809731](https://idw-online.de/de/news809731)
- Direct fetches of https://www.namenforschung.net/dfd/ returned HTTP 403 (curl and WebFetch). The ADW report PDF URL returned an HTML "Einen Moment bitte..." challenge page instead of the PDF. — [namenforschung.net/dfd](https://www.namenforschung.net/dfd/); [ADW 2024 report URL](https://www.adwmainz.de/fileadmin/adwmainz/berichte/2024/Projektkommission_Digitales_Familiennamenwoerterbuch_Deutschlands_Bericht_2024.pdf)
- DFD's approach is described in Onomastica LXII (2018), pp. 281–298. — [Skowronek et al. 2018 bibliography](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)

### Inferences
- **Diaspora value:** DFD is likely the best scholarly source for how Polish-origin surnames are explained in Germany. Useful for the German-diaspora angle, e.g., Germanised spellings, as citation-only evidence.
- **Bot protection:** the challenge implies automated harvesting is unwelcome. Do not scrape. Request terms from the Academy (contact channel UNVERIFIED).
- **Database right:** DFD is also a German database. Any bulk reuse would need a licence regardless of copyright in individual articles [legal background, not verified in-session; for counsel].

### Gaps
- DFD licence, terms of use and citation rules: UNVERIFIED.
- Extent of DFD coverage of Polish-origin surnames (e.g., whether Nowak or Kowalski have articles, and their content): UNVERIFIED (site inaccessible to tools).

## 9. Consolidated catalogue: licence, commercial-use status, coverage, format and access for every resource checked (as of 2026-09-29)

### Takeaway
The commercially usable, evidence-grade core for launch is:
- SGJP inflection data, Morfeusz 2 and Polimorf (BSD-2)
- sjp.pl (CC BY 4.0 / Apache 2.0 option)
- plWordNet (Princeton-style licence)
- NKJP 1M subcorpus (CC BY 4.0)
- CLARIN-PL Polish G2P (BSD-2)
- PD dictionaries (Brückner 1927, Linde, Słownik warszawski, subject to a co-author check)
- CC BY / CC BY-ND journal articles for citation
- Wikidata (CC0) for gender pairs

Surname etymology specifically still depends on copyrighted IJP PAN works (ISNP, SEMSNO, SSNO, Rymut) or article-level citations. Otherwise the answer is INSUFFICIENT_DATA.

### Cited Findings

| Resource | Rights holder (as stated) | Licence (as stated) | Commercial use for a paid surface (reading, not legal advice) | Surname-relevant content | Format / access | Status |
|---|---|---|---|---|---|---|
| SGJP inflection data (sgjp-20260823.tab.gz; DICT-ID pl.sgjp.sgjp-2026.08.24) | Woliński, Bronk, Gruszczyński, Kieraś, Saloni, Skowrońska, Wołosz | BSD-2-Clause ([licence](https://morfeusz.sgjp.pl/doc/license/); [dump](http://download.sgjp.pl/morfeusz/20260823/sgjp-20260823.tab.gz)) | Yes, keep the notice | 95,401 surname lexemes / 60,962 base forms; tagged paradigms; variants; `depr` forms; 297/286 -owa/-ówna form-lines (computed) | TSV (41 MB), frequent releases | VERIFIED |
| SGJP full dictionary (sgjp.pl website) | SGJP authors | Not BSD: "Cały SGJP być może kiedyś udostępnimy" ([FAQ](https://morfeusz.sgjp.pl/doc/license/)) | No (all rights reserved by default) | Frequencies and extra attributes | Web UI | VERIFIED |
| Morfeusz 2 (analyser/generator) | IPI PAN | BSD-2 ([licence](https://morfeusz.sgjp.pl/doc/license/); [11321/257](http://hdl.handle.net/11321/257)) | Yes | Generation of surname forms | Binaries, Python API | VERIFIED |
| Polimorf | IPI PAN | BSD-2 ([ZIL](https://zil.ipipan.waw.pl/PoliMorf); [11321/577](http://hdl.handle.net/11321/577)) | Yes | SGJP + Morfologik merge | TSV (45 MB) | VERIFIED |
| sjp.pl "odmiany" list | sjp.pl | GPL-2 / LGPL-2.1 / CC BY 4.0 / Apache-2.0, user's choice ([page](https://sjp.pl/sl/odmiany/)) | Yes, via CC BY 4.0 or Apache-2.0 | Surnames with all forms, untagged (computed) | ZIP (12.7 MB), dated releases (e.g., 20260901) | VERIFIED |
| plWordNet 4.5 / 4.2 | Wrocław Univ. of (Science and) Technology | plWordNet licence, Princeton-style ([text](https://clarin-pl.eu/license/plwordnet); [11321/834](http://hdl.handle.net/11321/834)) | Yes (notice; no use of the university's name in publicity) | Senses of root appellatives | Download | VERIFIED |
| NKJP 1M subcorpus | NKJP consortium | CC BY 4.0 ([NKJP](https://nkjp.pl/index.php?page=14&lang=0)) | Yes, with attribution | Usage evidence, not a lexicon | Download; full NKJP query-only | VERIFIED |
| NELexicon2 | Wrocław Univ. of Technology | CC BY 3.0 ([11321/247](http://hdl.handle.net/11321/247)) | Yes, with attribution | Named-entity lexicon; surname content UNVERIFIED | Download | Licence VERIFIED; content UNVERIFIED |
| NELexicon + LOD (2018) | (same group) | LGPL-3.0 ([11321/529](http://hdl.handle.net/11321/529)) | Yes, with LGPL conditions | NE lexicon linked to LOD | Download | VERIFIED |
| KorBa annotated subcorpus v2.0 | IJP PAN | CC BY-SA 4.0 ([KorBa download](https://korba.edu.pl/download)) | Yes, ShareAlike on adaptations | 17th–18th c. attestations | Download; full corpus query-only | VERIFIED |
| F19 corpus (1830–1918) | UNVERIFIED | UNVERIFIED (site down) | Unknown | 19th-c. attestations | f19.uw.edu.pl | UNVERIFIED |
| CLARIN-PL Polish G2P | PJAIT (Koržinek, Brocki, Marasek) | BSD-2 ([11321/295](http://hdl.handle.net/11321/295)) | Yes | IPA/phonetic generation | Source + web service | VERIFIED |
| Transkrypcja fonetyczna Kronik RP | CLARIN-PL depositor | CC BY-NC 3.0 ([11321/426](http://hdl.handle.net/11321/426)) | **No** (NC) | Phonetic transcriptions | Download | VERIFIED |
| espeak-ng | eSpeak NG project | GPL-3.0-or-later ([README](https://github.com/espeak-ng/espeak-ng)) | Yes as a separate process (counsel on GPL scope) | IPA and TTS | Source | VERIFIED |
| Piper code | M. Hansen / OHF-Voice | MIT (legacy) / GPL-3.0 (successor) ([rhasspy/piper](https://github.com/rhasspy/piper); [piper1-gpl](https://github.com/OHF-Voice/piper1-gpl)) | Yes (code) | TTS engine | Source | VERIFIED |
| Piper Polish voices (darkman, gosia, mc_speech; mls_6892) | Various | Datasets CC0 / CC BY 4.0, but fine-tuned from lessac (research-only) / ryan ([cards](https://huggingface.co/rhasspy/piper-voices/tree/main/pl/pl_PL); [lessac licence](https://www.cstr.ed.ac.uk/projects/blizzard/2013/lessac_blizzard2013/license.html)) | **High risk: counsel** | Polish TTS audio | ONNX models | VERIFIED (risk) |
| Brückner, Słownik etymologiczny (1927) | PD (author d. 1939) | PD ([Wikisource](https://pl.wikisource.org/wiki/S%C5%82ownik_etymologiczny_j%C4%99zyka_polskiego); [Q112029](https://www.wikidata.org/wiki/Q112029)) | Yes (use the 1927 text; own OCR) | Appellative etymologies | Scans + partial transcription | PD VERIFIED; transcription completeness UNVERIFIED |
| Linde, Słownik języka polskiego | PD (d. 1847) | PD; CLARIN indexes GPL-3 ([11321/702](http://hdl.handle.net/11321/702)) | Yes (text); indexes GPL-3 | Historical senses | Scans (DjVu) + indexes | PD VERIFIED; scan host UNVERIFIED |
| Słownik warszawski | PD for the three editors (d. 1903/1932/1930) | PD subject to contributor check | Likely yes, pending counsel | Historical senses incl. dialect/archaic | Scans; retrodigitisation thesis ([AMU](https://repozytorium.amu.edu.pl/handle/10593/27024)) | PARTLY VERIFIED |
| Karłowicz, Słownik gwar polskich | PD (Karłowicz d. 1903; Łoś d. 1928) | PD | Yes | Dialect appellatives | Digital copies UNVERIFIED | PD VERIFIED; access UNVERIFIED |
| Rymut, Słownik nazwisk współcześnie w Polsce używanych (1992–94) | IJP PAN (publisher); Rymut d. 2006 | © to end-2076; database-right flag | Only by licence | 405,670 surnames; 1990 PESEL; 49 voivodeships ([Onomastica 2018](https://onomastica.ijp.pan.pl/index.php/ONOM/article/download/51/33)) | Print, 10 vols | VERIFIED facts; rights path UNVERIFIED |
| Rymut, Nazwiska Polaków (1999–2001) | Wyd. IJP–DWN | © | Only by licence | Historical-etymological | Print, 2 vols | VERIFIED bibliographic |
| SSNO (Taszycki ed., 1965–1987) | Ossolineum / IJP PAN team; Taszycki d. 1979 | © | Only by licence | Personal names attested before 1500 | Print, 7 vols; e-version not found | VERIFIED bibliographic |
| SEMSNO (Cieślikowa, Malec, Rymut eds., 1995–2002) | IJP PAN | © | Only by licence | Etymology/motivation of Old Polish names | Print, 7 parts | VERIFIED bibliographic |
| ISNP (nazwiska.ijp.pan.pl) | IJP PAN | Unconfirmed (project's known partnership target) | Unconfirmed | ~30k surnames (75–80% of population); attestations; possible/probable etymologies; PESEL 2014 ([Górny 2024](https://onomastica.ijppan.pl/index.php/ONOM/article/view/533)) | Web | Facts VERIFIED; rights UNVERIFIED |
| Hoffman, Polish Surnames 3rd ed. (2012) | PGSA / author (UNVERIFIED which) | © | Only by licence | ~50,000 surnames grouped by root; 2002 counts ([PGSA](https://pgsa.org/product/polish-surnames-origins-and-meanings-3rd-ed-2-volume-book-set/)) | Print / CD / PDF | VERIFIED product facts |
| Shea & Hoffman, In Their Words (4 vols) | Authors / publisher | © | Reference only | Record-language guides (PL/RU/LA/DE) ([PGSA](https://pgsa.org/?p=1301)) | Print / PDF | VERIFIED product facts |
| Onomastica (IJP PAN) | IJP PAN | CC BY-ND 4.0 (recent PDFs); footer badge BY-ND 3.0; 2018 PDF no CC statement ([PDF](https://onomastica.ijppan.pl/index.php/ONOM/article/download/533/682)) | Verbatim redistribution OK with citation; no derivatives/translations | Peer-reviewed onomastics | OJS, PDF | VERIFIED (with conflict) |
| Rozprawy Komisji Językowej ŁTN | ŁTN / authors | CC BY 4.0 from 2024; CC BY-NC-ND 4.0 earlier ([journal](https://czasopisma.ltn.lodz.pl/Rozprawy-Komisji-Jezykowej/pl)) | 2024+: yes; earlier: cite/paraphrase only | Linguistics incl. onomastics | OJS | VERIFIED |
| Język Polski (TMJP) | TMJP | "© Copyright by TMJP"; no CC found ([journal](https://jezyk-polski.pl/index.php/jp)) | Cite/paraphrase only | Linguistics | OJS | UNVERIFIED licence |
| Poradnik Językowy digital archive | UW (UNVERIFIED) | Not shown ([archive](https://poradnik-jezykowy.uw.edu.pl/)) | Cite/paraphrase only | Affix and expression indexes | Web | UNVERIFIED licence |
| PWN Poradnia Językowa | PWN | © (all rights reserved by default) | Cite/paraphrase only | Declension norms ([Nowakowie](https://sjp.pwn.pl/poradnia/haslo/Do-kogo-odnosi-sie-forma-Nowakowie;20691.html); [Gołąb](https://sjp.pwn.pl/poradnia/haslo/odmiana-nazwisk;3099.html)) | Web | VERIFIED content |
| Wikidata family-name items | Wikimedia community | CC0 (per project source list) | Yes | 32,590 Polish-labelled items; 9,181 gender pairs; 30 transliterations; 1,739 P460 ([WDQS](https://query.wikidata.org/)) | SPARQL / dumps | Counts VERIFIED (computed) |
| DFD (namenforschung.net) | ADW Mainz + TU Darmstadt | UNVERIFIED (site blocks bots) | Treat as no | ~200k articles planned; online since 2013; ends 2035 ([idw](https://idw-online.de/de/news809731)) | Web | UNVERIFIED |
| FamilySearch Research Wiki | FamilySearch | Not checked | Cite only | 1868 Russian-language requirement ([wiki](https://www.familysearch.org/en/wiki/Russian_Poland_Civil_Registration)) | Web | Content VERIFIED; licence UNVERIFIED |

### Inferences
Mapping each product question to lawful evidence (fallback when ISNP rights are unavailable):
- **(a) Root-word meaning:** plWordNet (current sense) plus Brückner, Linde and Słownik warszawski (historical sense and appellative etymology). This is valid only for the **appellative**. The surname→appellative link needs a scholarly citation (Onomastica / ISNP / SEMSNO / Rymut). Otherwise INSUFFICIENT_DATA. Optionally show a clearly labelled "formally identical to the word X" statement, which needs a product decision.
- **(b) Derivational family:** no open structured resource exists. Formal-stem grouping from SGJP lemmas is possible but must not be presented as etymological kinship. Hoffman Vol. II and ISNP are the licensable sources.
- **(c) Feminine/plural forms and declension:** SGJP (VERIFIED where attested) plus rules (generated, lower confidence), plus PWN/RJP norms as cited Claims. Wikidata P5278 gives 9,181 masculine/feminine pairs as corroboration.
- **(d) Pronunciation:** CLARIN-PL G2P (BSD-2) for IPA. Audio is blocked pending counsel on the Piper/lessac lineage.
- **(e) Historical spellings:** FamilySearch establishes the Russian-language period. Renderings would be rule-generated (POSSIBLE). Wikidata is not a usable source (30 transliterations).

Priority licensing and outreach list for the founder:
1. IJP PAN: ISNP + SEMSNO + SSNO + Rymut data, one counterparty
2. PGSA: Hoffman Vol. II root index
3. ADW Mainz: DFD terms
4. Counsel: the lessac lineage of Piper voices, and the database right in register-derived frequency tables

### Gaps
- All items marked UNVERIFIED above. The most decision-relevant are DFD terms, ISNP/IJP PAN licensing, Piper voice commercial status, and the Słownik warszawski contributor list for PD certainty.
- Tool-accuracy evidence for automatic surname declension, and OA monographs on Polish surname formation, were not researched because the session's web-search budget was exhausted.
