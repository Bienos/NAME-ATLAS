# NAME ATLAS — DATA & TRUTH LAYER

**Research snapshot:** 17 September 2026  
**Initial market:** Poland  
**Target architecture:** global  
**Primary principle:** no genealogical claim without traceable evidence.

---

# 1. EXECUTIVE SUMMARY

## 1.1. Najważniejsze wnioski

1. **Polska jest bardzo dobrym rynkiem startowym dla surname-level MVP.** Ministerstwo Cyfryzacji publikuje na dane.gov.pl aktualizowany zbiór nazwisk żyjących osób w rejestrze PESEL, rozdzielony m.in. według płci. Dane.gov.pl ma oficjalne API i model otwartych danych umożliwiający również ponowne wykorzystanie komercyjne. ([dane.gov.pl](https://dane.gov.pl/pl/dataset/1681%2Cnazwis))

2. **Name Atlas może wiarygodnie podać współczesną liczbę osób o nazwisku, podział kobiety/mężczyźni, ranking i własny rarity score.** Trzeba jednak zachować dokładne caveaty źródła: zbiór dotyczy żyjących osób i nie publikuje części skrajnie rzadkich wartości, np. pojedynczych wystąpień. ([dane.gov.pl](https://dane.gov.pl/pl/dataset/1681%2Cnazwis))

3. **Nie znalazłem oficjalnego, otwartego, aktualnego zbioru PESEL 2026 umożliwiającego rozkład każdego nazwiska według gminy/powiatu/miasta.** Dlatego count 2026 i lokalna mapa nazwiska muszą mieć oddzielne `source_date`. Nie wolno łączyć bieżącego countu z historyczną geografią i przedstawiać całości jako „stan 2026”.

4. **IJP PAN / Internetowy Słownik Nazwisk w Polsce jest potencjalnie najważniejszym źródłem semantycznym dla polskiej wersji Name Atlas.** Obejmuje około 30 tys. najczęstszych form nazwisk spośród ok. 400 tys. używanych nazwisk i dostarcza m.in. etymologie, motywacje, strukturę słowotwórczą, formy historyczne oraz geografię. Trwa kontynuacja projektu ISNP 2.0 na lata 2025–2030. ([ijppan.pl](https://ijppan.pl/projekty-nib/internetowy-slownik-nazwisk-w-polsce-kontynuacja/?utm_source=chatgpt.com))

5. **Nie znalazłem publicznego oficjalnego API ISNP ani jednoznacznej licencji pozwalającej Name Atlas na masowe komercyjne kopiowanie treści słownika.** Publiczny dostęp do serwisu ≠ prawo do scrapingu i redystrybucji. Priorytetem powinien być kontakt z IJP PAN w sprawie licencji / partnerstwa / eksportu danych.

6. **Geneteka jest niezwykle wartościowa, ale nie powinna być scrapowana jako backend Name Atlas.** PTG traktuje Genetekę jako chronioną bazę danych i zastrzega prawa producenta bazy. Zautomatyzowane przejęcie istotnej części bazy bez zgody jest zbyt ryzykowne. ([geneteka.genealodzy.pl](https://geneteka.genealodzy.pl/ogenetece.php))

7. **Geneteka, Metryki, Skanoteka, BaSIA i Poznan Project powinny być traktowane jako kandydaci do partnerstw**, a nie jako „darmowe API”. Poznan Project ma obecnie ponad 2 mln indeksów małżeństw z XIX-wiecznej Wielkopolski/Kujaw; BaSIA ponad 6,6 mln indeksów głównie dla Wielkopolski. ([poznan-project.psnc.pl](https://poznan-project.psnc.pl/page.php?page=about))

8. **Szukaj w Archiwach jest prawnie znacznie ciekawsze.** Materiały oznaczone jako domena publiczna lub „prawa należą do archiwum” mogą być ponownie wykorzystywane, w tym komercyjnie; elementy z „ograniczonymi prawami” wymagają zgody. Sam serwis i jego baza są jednak chronione, dlatego automatyczne pobieranie powinno korzystać z uzgodnionego API/bulk access, a nie niekontrolowanego crawlera. ([szukajwarchiwach.gov.pl](https://www.szukajwarchiwach.gov.pl/warunki-i-regulamin-serwisu))

9. **Name Atlas nie powinien budować MVP wokół obrazów skanów.** Najlepszym MVP jest najpierw warstwa strukturalnych faktów i indeksów. OCR/HWR ręcznie pisanych polskich, rosyjskich, niemieckich i łacińskich metryk jest kosztowniejszy oraz dużo bardziej podatny na błędy.

10. **Dla map administracyjnych nie trzeba kupować podstawowego polskiego datasetu.** GUGiK udostępnia PRG bezpłatnie i „do dowolnego wykorzystania”, również poprzez WFS/WMS. ([geoportal.gov.pl](https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/))

11. **Globalnie najlepsze architektonicznie źródła do pierwszych integracji niekoniecznie są największymi serwisami genealogy.** Open Archives NL, UK National Archives, Riksarkivet Sweden, NARA, Europeana, Wikidata i Deutsche Digitale Bibliothek mają znacznie bardziej przewidywalne interfejsy/licencje niż Ancestry, Geneanet czy Findmypast. ([openarchieven.nl](https://www.openarchieven.nl/api/docs/))

12. **FamilySearch ma prawdziwe API, ale nie jest to anonimowy feed do skopiowania bazy.** Produkcyjne aplikacje przechodzą proces FamilySearch Compatible Solution / partner review i korzystają z OAuth oraz warunków FamilySearch. ([familysearch.org](https://www.familysearch.org/innovate/getting-started))

13. **Ancestry, Geneanet i Findmypast nie nadają się do nieautoryzowanego crawlingu Name Atlas.** Ancestry ogranicza zautomatyzowany/programatyczny dostęp, Geneanet zabrania automatycznego dostępu i komercyjnego użycia w typowym scenariuszu, a Findmypast wprost zabrania m.in. screen scrapingu, cachowania, ekstrakcji i tworzenia własnej bazy. ([ancestry.com](https://www.ancestry.com/c/legal/termsandconditions))

14. **Surname origin APIs są pomocnicze, nie są źródłem prawdy onomastycznej.** NamSor czy Nationalize mogą podać probabilistyczne sygnały kraju/narodowości związane z nazwą, ale nie dowodzą rzeczywistego pochodzenia konkretnej rodziny.

15. **AI może tworzyć świetną warstwę narracyjną, ale nie warstwę prawdy.** LLM powinien czytać `evidence objects`, nigdy samodzielnie wymyślać genealogii.

16. **Historyczna mapa nazwiska wymaga bardzo precyzyjnego nazewnictwa.** Mapa rekordów znalezionych w archiwach nie jest mapą populacyjnego rozmieszczenia nazwiska.

17. **Heraldyka jest obszarem wysokiego ryzyka.** W polskiej heraldyce jeden herb mógł obejmować wiele rodzin/nazwisk, a identyczne nazwiska mogły należeć do różnych rodów. Samo nazwisko nigdy nie wystarcza do przypisania herbu. ([pgsa.org](https://pgsa.org/wp-content/uploads/2025/07/PL-Nobility-Heraldry-Intro.pdf))

18. **Automatyzacja może dojść dużo dalej niż prosty surname report.** Po podaniu imienia, nazwiska, przybliżonego roku i miejscowości system może automatycznie generować i rankować `candidate records`.

19. **Granica człowiek/AI nie przebiega po określonej liczbie pokoleń.** Przebiega na **pierwszym niejednoznacznym połączeniu genealogicznym**.

20. Maksymalny wiarygodny poziom automatyzacji to:

> **source-backed surname profile + locality-aware historical search + ranked archival matches + provisional family graph zawierający zweryfikowane pojedyncze relacje.**

Pełna „historia Twojej rodziny” zaczyna wymagać człowieka tam, gdzie występuje luka, konflikt lub więcej niż jeden prawdopodobny kandydat.

---

# 2. FUNDAMENTALNA ARCHITEKTURA: DATA & TRUTH LAYER

Każde twierdzenie Name Atlas powinno istnieć jako obiekt typu:

```text
CLAIM
├── claim_id
├── subject_type
│   ├── surname
│   ├── person
│   ├── family_line
│   └── place
├── subject
├── predicate
├── value
├── time_scope
├── geography_scope
├── evidence[]
│   ├── source_id
│   ├── source_record_id
│   ├── source_url
│   ├── source_date
│   ├── retrieved_at
│   ├── evidence_type
│   ├── evidence_snippet / evidence_hash
│   └── rights_status
├── extraction_method
│   ├── API
│   ├── dataset
│   ├── manual
│   ├── OCR
│   ├── HTR
│   └── LLM extraction
├── methodology
├── conflicts[]
├── confidence
│   ├── VERIFIED
│   ├── LIKELY
│   ├── POSSIBLE
│   ├── UNCONFIRMED
│   └── NOT_ENOUGH_EVIDENCE
├── last_verified_at
└── human_review_status
```

**LLM nigdy nie powinien nadawać statusu VERIFIED.** Status powinien wynikać z deterministycznego `Evidence / Confidence Engine`.

---

# 3. CO MOŻEMY USTALIĆ PO SAMYM NAZWISKU?

## Surname-only capability matrix

| # | Data point | Możliwe? | Polska / inne kraje | Główne źródło | Jakość | Automatyzacja | Ograniczenia |
|---|---|---|---|---|---|---|---|
| 1 | Liczba osób z nazwiskiem | **Tak** | PL; część krajów | PESEL/dane.gov.pl | 5/5 | 5/5 | PL count dotyczy opublikowanej populacji żyjących; suppressions. ([dane.gov.pl](https://dane.gov.pl/pl/dataset/1681%2Cnazwis)) |
| 2 | Kobiety/mężczyźni | **Tak** | PL, część krajów | PESEL | 5 | 5 | Nie mylić płci statystycznej rekordu z tożsamością konkretnej osoby. |
| 3 | Ranking popularności | **Tak, derived** | PL | PESEL corpus | 5 | 5 | Name Atlas oblicza ranking; metodologia musi być jawna. |
| 4 | Rarity score | **Tak, derived** | globalnie tam, gdzie mamy denominator | własny model | 4–5 | 5 | To metryka Name Atlas, nie źródło historyczne. |
| 5 | Modern geographic distribution | **Częściowo** | zależne od kraju | oficjalne name stats / ISNP / licensed provider | 3–5 | 3–5 | Coverage bardzo nierówne. |
| 6 | Country distribution | **Tak częściowo** | global | national stats / licensed APIs | 3–4 | 4 | Brak jednego otwartego globalnego authoritative datasetu. |
| 7 | Województwo | **Tak, ale source-date dependent** | PL | ISNP / licensed source | 4 | 4 | Nie utożsamiać ze stanem PESEL 2026. ([nazwiska.ijppan.pl](https://nazwiska.ijppan.pl/haslo/show/name/KLAWITTER?utm_source=chatgpt.com)) |
| 8 | Powiat | **Częściowo** | PL | ISNP | 4 | 3–4 | Tylko nazwiska/wersje objęte źródłem. |
| 9 | Gmina | **Ograniczone** | PL | zależne od source | 3 | 2–3 | Brak znalezionego aktualnego oficjalnego PESEL surname-by-gmina datasetu. |
| 10 | Miasto | **Częściowo** | PL / wybrane kraje | ISNP/national stats | 3–4 | 3 | Source snapshot konieczny. |
| 11 | Etymologia | **Tak dla części nazwisk** | PL/global | IJP PAN + naukowe słowniki | 5 dla sourced interpretation | 3–4 | Etymologia nazwiska ≠ genealogiczne pochodzenie użytkownika. ([ijppan.pl](https://ijppan.pl/projekty-nib/internetowy-slownik-nazwisk-w-polsce-kontynuacja/?utm_source=chatgpt.com)) |
| 12 | Znaczenie | **Tak z qualifierem** | global | dictionaries/onomastics | 4–5 | 4 | Często istnieją konkurencyjne interpretacje. |
| 13 | Język pochodzenia | **Likely/Possible** | global | onomastics + linguistic model | 3–5 | 4 | Nazwisko mogło zmieniać język/ortografię. |
| 14 | Kraj pochodzenia | **Tylko probabilistycznie** | global | source synthesis | 2–4 | 4 | „Country associated with surname” ≠ family origin. |
| 15 | Struktura morfologiczna | **Tak** | PL | IJP / rules | 4–5 | 5 | Dobrze nadaje się do reguł językowych. |
| 16 | Rdzeń | **Tak/likely** | PL | IJP + morphological engine | 4 | 5 | Nie zawsze jednoznaczny. |
| 17 | Sufiks | **Tak** | PL | deterministic linguistic parser | 4–5 | 5 | np. -ski, -icz, -owicz itd.; sama końcówka nie dowodzi pochodzenia. |
| 18 | Historyczne warianty | **Tak** | wiele państw | ISNP + archival records | 3–5 | 4 | Rozdzielać `sourced variant` od `generated search variant`. |
| 19 | Transliteracje | **Tak** | global | deterministic rules | 4 | 5 | PL/DE/RU/Cyrillic szczególnie ważne. |
| 20 | Podobne nazwiska | **Tak, derived** | global | variant engine | 3 | 5 | Similarity ≠ pokrewieństwo. |
| 21 | Nazwiska pokrewne językowo | **Tak z qualifierem** | global | onomastics | 3–4 | 4 | Nie nazywać „related families”. |
| 22 | Potencjalne miejscowości pochodzenia | **Possible** | PL/global | gazetteers + toponymy | 2–4 | 4 | Samo podobieństwo nazwy miejscowości jest słabym dowodem. |
| 23 | Najstarszy znany zapis nazwiska | **Częściowo** | zależne od źródeł | dictionaries + archives | 3–5 | 2–4 | „Najstarszy znaleziony przez nas”, nie „pierwszy w historii”. |
| 24 | Okres pojawienia się | **Possible/Likely** | zależne | dictionaries/archives | 3 | 3 | Nie podawać dokładnego roku bez rekordu. |
| 25 | Dawne dokumenty | **Tak** | bardzo szeroko | archives/digital libraries | 4–5 | 3–4 | Coverage niepełne. |
| 26 | Nazwisko za granicą | **Tak częściowo** | global | national stats / records | 3–5 | 4 | Różne lata baz. |
| 27 | Diaspora | **Likely** | global | geographic + migration sources | 3 | 4 | Wymaga temporal context. |
| 28 | Szlaki migracyjne nazwiska | **Inference** | global | linked records | 2–4 | 3 | Nie przedstawiać jako trasę konkretnej rodziny. |
| 29 | Herbarze | **Tak: wystąpienie** | PL/EU | digitised heraldry | 4 | 3–4 | Wystąpienie nazwiska ≠ herb użytkownika. |
| 30 | Źródła szlacheckie | **Tak** | PL/EU | heraldic/nobility works | 4 | 3 | Konkretna linia wymaga genealogii. |
| 31 | Znane osoby | **Tak** | global | Wikidata/Wikipedia | 3–5 | 5 | Nie dowodzą związku rodzinnego. |
| 32 | Historyczne postacie | **Tak** | global | Wikidata/BN/archive sources | 4 | 4–5 | Deduplicate identities. |
| 33 | Książki adresowe | **Tak częściowo** | wiele państw | Polona/IA/libraries | 3–4 | 3 | OCR errors, rights per item. |
| 34 | Cmentarze | **Tak, ale licensing problem** | wiele państw | Grobonet/FindAGrave/BillionGraves | 3–4 | 2 | Automatyzacja często prawnie ograniczona. |
| 35 | Nekrologi | **Tak częściowo** | wiele krajów | newspaper/archive collections | 3–4 | 2–4 | Copyright + living-person data. |
| 36 | Passenger lists | **Tak** | US/Canada/UK/etc. | NARA/Ellis Island/FamilySearch | 4 | 3 | Niepełna migracja, różne porty. |
| 37 | Spisy ludności | **Tak, country-specific** | US, UK, NL, Nordic etc. | national archives | 4–5 | 3–5 | Okresy ochronne. |
| 38 | Urodzenia/chrzty | **Tak** | global fragmented | civil/church archives | 5 | 2–4 | Access windows + indexing. |
| 39 | Małżeństwa | **Tak** | global | archives/indexes | 5 | 3–4 | Bardzo przydatne do relacji rodzinnych. |
| 40 | Zgony | **Tak** | global | archives/indexes | 5 | 3–4 | Privacy/access periods. |
| 41 | Represje | **Tak** | PL/EU | IPN/Arolsen | 4–5 | 2–3 | Dane wrażliwe/historyczne. |
| 42 | Dokumenty wojenne | **Tak** | PL/global | IPN/Arolsen/NARA/etc. | 4–5 | 2–4 | Fragmented. |
| 43 | Wojskowe | **Tak** | PL/global | WBH/CAW/national archives | 4–5 | 1–3 | Dużo materiałów nieustrukturyzowanych. |
| 44 | Emigracyjne | **Tak** | global | passenger/immigration archives | 4 | 3 | Coverage zależne od kraju i portu. |

### Najważniejsza semantyczna zasada

`Surname geography` nie oznacza `family origin`.

`Surname etymology` nie oznacza `your family's ethnicity`.

`Historical occurrence` nie oznacza `ancestor`.

---

# 4. NAZWISKO + REGION / MIEJSCOWOŚĆ

Region zmienia jakość wyników bardzo mocno.

| Capability | FACT czy INFERENCE? | Co się poprawia |
|---|---|---|
| Nazwisko występowało w danym regionie w konkretnym źródle | **FACT** | Możemy wskazać źródło, datę, miejscowość |
| Historyczne skupisko rekordów | **FACT o dataset**, niekoniecznie o populacji | Możemy policzyć rekordy archiwalne |
| Region jako prawdopodobne miejsce pochodzenia nazwiska | **INFERENCE** | Geografia + etymologia + historia |
| Odrzucenie etymologii geograficznie niemożliwej | **INFERENCE** | Mocniejsze zawężanie |
| Lokalne warianty pisowni | **FACT**, jeśli znalezione w rekordach | Wyższy recall archiwalny |
| Potencjalna parafia | **INFERENCE** | Miejscowość + historyczna jurysdykcja |
| Parafia właściwa dla konkretnego rekordu | **FACT**, jeśli katalog/akt to potwierdza | Direct archive routing |
| Lokalne archiwum | **FACT** | Z mapy właściwości archiwalnej |
| Trasa migracji surname population | **INFERENCE** | Datowane klastry |
| Migracja konkretnego przodka | **FACT tylko przy linked records** | Muszą istnieć rekordy po obu stronach |
| Związek nazwiska z miejscowością o podobnej nazwie | **POSSIBLE** | Dopóki brak źródła onomastycznego/historycznego |

### Przykład

Jeżeli nazwisko **X**:

- pojawia się w 1820 w parafii A,
- 1831 w parafii B,
- 1850 w parafii A,
- etymologicznie może być związane z miejscowością A,

możemy powiedzieć:

> **LIKELY:** „Nazwisko było historycznie silnie związane z obszarem A.”

Nie:

> „Twoja rodzina pochodzi z A.”

---

# 5. KONKRETNA OSOBA: NAME + SURNAME + APPROX DOB + LOCATION

Tutaj zaczyna się prawdziwa genealogia.

## Możliwe automatycznie

System może wyszukiwać kandydatów do:

- aktu urodzenia / chrztu;
- ślubu;
- zgonu;
- rodziców;
- rodzeństwa;
- małżonka;
- dzieci;
- miejsca zamieszkania;
- zawodu;
- jednostki wojskowej;
- spisów ludności;
- emigracji;
- list pasażerskich;
- nekrologów;
- cmentarzy;
- represji;
- dokumentów wojennych;
- gazet historycznych.

## Największe źródła false positives

1. popularne imię + popularne nazwisko;
2. dwa dzieci o identycznych imionach w tej samej parafii;
3. przesunięcie DOB o kilka lat;
4. różne kalendarze;
5. stara i nowa nazwa tej samej miejscowości;
6. zmienne granice państwowe;
7. nazwisko panieńskie vs małżeńskie;
8. formy żeńskie;
9. transliteracja rosyjska;
10. niemiecka ortografia;
11. OCR/HWR errors;
12. indeks zawierający literówkę;
13. dwa serwisy kopiujące ten sam rekord — nie są dwoma niezależnymi dowodami;
14. drzewo użytkownika kopiujące błędne drzewo innego użytkownika;
15. adopcja / nazwisko ojczyma / zmiana nazwiska;
16. brak pełnej indeksacji parafii.

## Proposed matching statuses

### POTENTIAL MATCH

Wystarczy:

- surname lub wiarygodny wariant;
- zgodny approximate DOB;
- plausibly compatible geography.

Nie wolno automatycznie dodać osoby do family tree.

### LIKELY MATCH

Przykładowo:

- surname/variant zgodny;
- rok ± tolerancja;
- miejscowość zgodna;
- dodatkowo zgodny rodzic, małżonek, zawód albo inny mocny identyfikator;
- brak istotnych konfliktów.

### VERIFIED PERSON RECORD

Direct archival record + wystarczająco unikalne pola pozwalające przypisać dokument konkretnej osobie.

### VERIFIED FAMILY RELATIONSHIP

Dokument wprost podaje relację, np.:

> „Jan Kowalski, syn Piotra Kowalskiego i Marianny Nowak”.

Wtedy można zweryfikować **ten edge**:

```text
Piotr + Marianna
       ↓
      Jan
```

To nie oznacza jeszcze, że Piotr jest przodkiem użytkownika. Każdy kolejny edge musi być potwierdzony.

---

# 6. POLAND DATA SOURCE MAP

| Source | Najważniejsze dane | API/structured | Automation | Legal status dla Name Atlas |
|---|---|---:|---:|---|
| dane.gov.pl / PESEL surnames | aktualne counts, sex | **YES** | 5/5 | 🟢 |
| IJP PAN / ISNP | etymologia, warianty, struktura, historyczne formy, geografia | brak publicznego API znalezionego | 3 | 🟡 partnership |
| Geneteka | B/M/D indeksy | wyszukiwarka | 3 | 🔴 bulk scrape / 🟡 partnership |
| Metryki | indeksy + skany | web | 2–3 | 🟡/🔴 |
| Skanoteka | skany archiwalne | web | 2 | 🟡/🔴 |
| Szukaj w Archiwach | katalog + miliony digital objects | partial | 3–4 | 🟢 material-dependent / 🟡 integration |
| PRADZIAD | rejestr ksiąg metrykalnych | integrated into SzWA | 3 | 🟢/🟡 |
| BaSIA | Wielkopolska, indeksy | web | 3 | 🟡 |
| Poznan Project | 19th c. marriages | web | 3 | 🟡 |
| Genealogia w Archiwach | Kujawsko-Pomorskie records | web | 2–3 | 🟡 |
| BN Data | bibliographic metadata | **YES** | 5 | 🟢 |
| Polona | books/newspapers/address books | search/OCR | 3–4 | 🟢 public-domain items / 🟡 other |
| FBC | federated metadata | OAI-PMH / search | 4 | 🟢 metadata / 🟡 objects |
| NAC | photographs & archive objects | SzWA | 3 | object-dependent |
| GUGiK PRG/PRNG | places/boundaries/addresses | WFS/WMS/download | 5 | 🟢 |
| Atlas Fontium | historical geography | OGC/download | 4 | 🟡 layer-dependent |
| Grobonet | graves/cemeteries | no public API identified | 2 | 🔴 without agreement |
| IPN databases | repression/war/victims | search | 2–3 | 🟡 |
| WBH/CAW | military/personnel records | archive | 1–2 | 🟡 |
| Arolsen Archives | Nazi persecution / displacement | search | 2–3 | 🟡 |
| JRI-Poland | Jewish Polish records | search | 3 | 🔴 commercial without permission |
| JewishGen | Jewish genealogy | search | 3 | 🟡/🔴 |
| FamilySearch Poland | church/civil collections | official API/partner | 4 | 🟡 partnership |
| Wikidata | notable people/places/knowledge graph | YES | 5 | 🟢 |
| Wikimedia | historical media | YES | 4 | licence-per-object |
| OSM | places/geography | data APIs | 5 if self-hosted | 🟢 ODbL with obligations |
| RCIN / digitised onomastics | historic dictionaries/publications | repository | 3 | item-dependent |
| Internet Archive | books/address directories | YES | 4 | item-dependent |
| Google Books | book search | YES | 4 | 🔴/🟡 paid product review needed |

---

# 7. GLOBAL DATA SOURCE MAP

| Source / country | Person records | API | Commercial automation assessment |
|---|---:|---:|---|
| FamilySearch | extensive | YES | 🟡 partner/certification |
| Ancestry | extensive | No open record API found | 🔴 without agreement |
| MyHeritage | extensive | partner API | 🟡 |
| Geneanet | extensive | restricted | 🔴 automated commercial use |
| Findmypast | extensive UK/global | no open search API | 🔴 without agreement |
| Forebears | surname distribution | OnoGraph API | 🟡 contract required |
| WikiTree | collaborative trees | API | 🟡 verify reuse per data type |
| Geni | trees | API | 🟡 restrictions |
| FamilyTreeDNA | DNA/projects | limited/user-authorized | 🔴 MVP |
| Europeana | cultural heritage | YES | 🟢 metadata / item rights |
| Open Archives NL | civil/archive data | YES | 🟢 CC0 metadata |
| Netherlands archives | strong | Open Archives/OAI | 🟢/🟡 |
| UK National Archives | archive descriptions | YES | 🟢 OGL |
| FreeBMD | B/M/D England & Wales | downloads/search | 🟡 |
| FreeREG | parish | open-data ecosystem | 🟡/🟢 |
| FreeCEN | census | open-data ecosystem | 🟡/🟢 |
| US NARA | immigration, census, military etc. | YES | 🟢/🟡 |
| US Census historical | through archives/partners | partial | 🟢/🟡 |
| Library of Congress | newspapers/books | YES | 🟢 metadata / item rights |
| Ellis Island | passenger arrivals | public search | no public API found | 🟡/🔴 automation |
| Canadian LAC | census/immigration/archive | public search | public API not verified | 🟡 |
| Riksarkivet Sweden | population/church datasets | YES | 🟢 |
| Danish Rigsarkivet | church/census data | partial/export | 🟡 |
| Norway Digitalarkivet | historical records | public service | API/licence requires verification | 🟡 |
| Deutsche Digitale Bibliothek | German heritage | YES | 🟢 metadata / item rights |
| Bundesarchiv | archival descriptions | search | no public API confirmed | 🟡 |
| Archives nationales France | archives/open datasets | structured/open datasets | 🟢/🟡 |
| Antenati Italy | civil registers | public search | API not found | 🟡 |
| PARES Spain | state archives | public search | API not found | 🟡 |
| Find a Grave | graves | public search | no official public API found | 🔴 crawler |
| BillionGraves | graves | public search | no public general API verified | 🟡/🔴 |

Swedish Riksarkivet is particularly interesting: its official API/open-data environment includes REST/OAI/IIIF/linked data, with old open datasets made available under permissive terms; downloadable birth/baptism material exists in structured form. ([data.riksarkivet.se](https://data.riksarkivet.se/))

Open Archives Netherlands offers documented Search/Match/Show APIs with a published limit of 4 requests/s/IP and makes its OAI-PMH dataset available under CC0. ([openarchieven.nl](https://www.openarchieven.nl/api/docs/))

---
# 8. DATA SOURCE CARDS

## CARD 01 — dane.gov.pl / Nazwiska w PESEL

**SOURCE NAME:** Nazwiska występujące w rejestrze PESEL  
**OFFICIAL URL:** https://dane.gov.pl/pl/dataset/1681%2Cnazwis  
**ORGANISATION:** Ministerstwo Cyfryzacji  
**SOURCE TYPE:** dataset / API  
**DATA PROVIDED:** surname + liczba wystąpień; dane kobiet/mężczyzn.  
**GEOGRAPHIC COVERAGE:** Polska  
**DATE COVERAGE:** current snapshot, aktualizowany okresowo/rocznie  
**SURNAME LEVEL:** YES  
**PERSON LEVEL:** NO  
**STRUCTURED DATA:** YES  
**PUBLIC API:** YES  
**API DOCUMENTATION:** oficjalne dane.gov.pl JSON:API. ([api.dane.gov.pl](https://api.dane.gov.pl/doc))  
**AUTH REQUIRED:** nie dla typowego public dataset access  
**COST:** free  
**RATE LIMITS:** current limit powinien być odczytywany z dokumentacji; nie hard-code legacy limitów.  
**DOWNLOAD AVAILABLE:** YES  
**DATA FORMAT:** CSV/XLSX/JSON-LD/API metadata  
**COMMERCIAL USE:** YES, subject to dataset conditions  
**LICENSE:** Polish open-data/reuse framework  
**SCRAPING:** not needed  
**TERMS NOTES:** prefer API/download  
**GDPR:** aggregate surname-level data; suppression ogranicza reidentification.  
**DATA QUALITY:** 5/5  
**AUTOMATION:** 5/5  
**PRODUCT VALUE:** 5/5  
**RECOMMENDED USE:** canonical modern Polish count.  
**RISKS:** suppressed rare values; nie daje bieżącej surname geography.  
**NEXT ACTION:** implement ingestion + yearly snapshot versioning. ([dane.gov.pl](https://dane.gov.pl/pl))

---

## CARD 02 — IJP PAN / Internetowy Słownik Nazwisk w Polsce

**OFFICIAL URL:** [ISNP](https://nazwiska.ijppan.pl/haslo/show/name/KLAWITTER?utm_source=chatgpt.com)  
**ORGANISATION:** Instytut Języka Polskiego PAN  
**SOURCE TYPE:** scholarly online dictionary  
**DATA:** etymologia, probable motivations, morphology, variants, historical records, geography, foreign distribution references.  
**COVERAGE:** Poland; ~30k common surname forms in first edition. ([ijppan.pl](https://ijppan.pl/projekty-nib/internetowy-slownik-nazwisk-w-polsce-kontynuacja/?utm_source=chatgpt.com))  
**DATE:** historical + PESEL-derived contemporary snapshot; continuation 2025–2030.  
**SURNAME:** YES  
**PERSON:** NO  
**STRUCTURED:** web structure, but no sanctioned production export found.  
**PUBLIC API:** **NO PUBLIC API IDENTIFIED**  
**AUTH:** no for browsing  
**COST:** free browsing  
**RATE:** N/A / unpublished  
**DOWNLOAD:** no general dataset download identified  
**FORMAT:** HTML  
**COMMERCIAL USE:** **UNCLEAR**  
**LICENSE:** no blanket commercial dataset licence identified  
**SCRAPING:** **UNCLEAR — do not assume allowed**  
**GDPR:** low surname-level risk  
**QUALITY:** 5  
**AUTOMATION:** 2 without agreement / 5 with structured partnership feed  
**PRODUCT VALUE:** 5  
**USE:** primary onomastic truth source after licensing.  
**RISK:** content/database copyright/licensing.  
**NEXT:** approach IJP PAN for licence/API/export/academic partnership.

---

## CARD 03 — Geneteka

**OFFICIAL URL:** https://geneteka.genealodzy.pl/  
**ORGANISATION:** Polskie Towarzystwo Genealogiczne  
**TYPE:** genealogical index database/search engine  
**DATA:** births/baptisms, marriages, deaths and relationship metadata.  
**COVERAGE:** Poland + neighbouring historical territories.  
**DATE:** parish/source-dependent, mainly historical.  
**SURNAME:** YES  
**PERSON:** YES  
**STRUCTURED:** YES internally / searchable web  
**PUBLIC API:** NO PUBLIC API IDENTIFIED  
**AUTH:** mostly not required to search  
**COST:** free use  
**RATE:** not published  
**DOWNLOAD:** no general authorized bulk export  
**FORMAT:** HTML/index database  
**COMMERCIAL:** not authorized by default for Name Atlas backend  
**LICENSE:** PTG claims database-producer protections.  
**SCRAPING:** **RED for substantial automated extraction without permission**  
**GDPR:** predominantly historical but records may involve people near access thresholds.  
**QUALITY:** 4  
**AUTOMATION:** 2 without agreement / 5 with partnership  
**VALUE:** 5  
**USE:** partnership / deep research.  
**RISK:** sui-generis database rights and incomplete indexes.  
**NEXT:** negotiate API/data licence with PTG. ([geneteka.genealodzy.pl](https://geneteka.genealodzy.pl/ogenetece.php))

---

## CARD 04 — Metryki

**ORGANISATION:** PTG  
**TYPE:** archive index + image linking  
**DATA:** parish/civil registers, indexed units and scan links.  
**COVERAGE:** Poland, collection-dependent  
**SURNAME:** YES  
**PERSON:** YES  
**STRUCTURED:** PARTIAL  
**PUBLIC API:** NO IDENTIFIED  
**COST:** free browsing  
**DOWNLOAD:** item/source-dependent  
**FORMAT:** HTML/images  
**COMMERCIAL:** UNCLEAR  
**SCRAPING:** YELLOW/RED until PTG agreement  
**QUALITY:** 4  
**AUTOMATION:** 2  
**VALUE:** 5  
**USE:** document confirmation layer after partnership.  
**RISK:** rights to database vs rights to underlying archive image are separate.  
**NEXT:** include in PTG partnership discussion. ([metryki.genealodzy.pl](https://metryki.genealodzy.pl/opjk))

---

## CARD 05 — Skanoteka

**ORGANISATION:** PTG  
**TYPE:** scan repository  
**DATA:** archival scans  
**COVERAGE:** Poland, collection-dependent  
**SURNAME/PERSON:** only through document content/index  
**STRUCTURED:** PARTIAL / images  
**API:** NO public API identified  
**COST:** free browsing  
**FORMAT:** images/HTML  
**COMMERCIAL/SCRAPING:** unclear; obtain permission  
**GDPR:** document dependent  
**QUALITY:** source image 5; machine extraction much lower  
**AUTOMATION:** 1–3  
**VALUE:** 4  
**USE:** verification/OCR only where legally cleared.  
**RISK:** OCR/HWR + reproduction rights.  
**NEXT:** negotiate rights and machine-access method. ([forum.genealodzy.pl](https://forum.genealodzy.pl/viewtopic.php?sid=4d9bcfed08e4e7922bb1019d60d39650&t=109012))

---

## CARD 06 — Szukaj w Archiwach

**OFFICIAL URL:** https://www.szukajwarchiwach.gov.pl/  
**ORGANISATION:** Archiwa Państwowe / NAC infrastructure  
**TYPE:** archival search engine + digital repository  
**DATA:** records, metrical books, maps, photos, documents, archival descriptions.  
**COVERAGE:** Poland  
**DATES:** medieval–modern depending fonds  
**SURNAME:** YES via search/index/content  
**PERSON:** YES  
**STRUCTURED:** PARTIAL  
**PUBLIC API:** no fully documented current general-production API confirmed in this research  
**AUTH:** browsing no  
**COST:** free  
**RATE:** not established  
**DOWNLOAD:** YES for many objects  
**FORMAT:** metadata + images  
**COMMERCIAL:** eligible public-domain/archive-rights objects can be reused commercially.  
**LICENSE:** item-level.  
**SCRAPING:** do not infer crawler permission from content reuse.  
**GDPR:** archival access laws still apply.  
**QUALITY:** 5 for archival source; 2–4 for indexing.  
**AUTOMATION:** 3 now; potentially 5 via official machine access.  
**VALUE:** 5  
**USE:** major Phase 2 archive layer.  
**RISK:** each object's rights status matters.  
**NEXT:** formal technical conversation with NDAP/NAC about API/bulk search. ([szukajwarchiwach.gov.pl](https://www.szukajwarchiwach.gov.pl/warunki-i-regulamin-serwisu))

---

## CARD 07 — PRADZIAD

**ORGANISATION:** Archiwa Państwowe  
**TYPE:** historical database/inventory of parish and civil-register holdings  
**DATA:** existence/location/date ranges of register books  
**SURNAME:** indirectly NO  
**PERSON:** NO  
**STRUCTURED:** catalogue  
**PUBLIC API:** no separate modern API  
**COST:** free  
**COMMERCIAL:** archival metadata subject to AP terms  
**QUALITY:** 5 for locating holdings  
**AUTOMATION:** 3  
**VALUE:** 4  
**USE:** answer “which archive/parish might contain this event?”  
**RISK:** legacy database; data incorporated into SzWA.  
**NEXT:** consume via current Archiwa Państwowe infrastructure rather than building against legacy PRADZIAD. ([archiwa.gov.pl](https://www.archiwa.gov.pl/wp-content/uploads/2022/02/Arch_CI.pdf))

---

## CARD 08 — BaSIA

**OFFICIAL URL:** https://basia.famula.pl/  
**ORGANISATION:** volunteer genealogy project  
**TYPE:** searchable archival index  
**DATA:** names, families, place links, scan/record references.  
**COVERAGE:** primarily Wielkopolska  
**DATES:** mostly XVIII–XX centuries.  
**SURNAME/PERSON:** YES/YES  
**STRUCTURED:** underlying DB but public search UI  
**API:** NO public documented API identified  
**COST:** free  
**RATE:** unknown  
**DOWNLOAD:** no general bulk feed identified  
**COMMERCIAL:** UNCLEAR  
**SCRAPING:** UNCLEAR  
**QUALITY:** 4  
**AUTOMATION:** 2 without agreement  
**VALUE:** 5 for Wielkopolska  
**USE:** partnership candidate.  
**RISK:** volunteer index/database rights and completeness.  
**NEXT:** contact project operator about licensed access. ([basia.famula.pl](https://basia.famula.pl/pl/o_projekcie))

---

## CARD 09 — Poznan Project

**OFFICIAL URL:** https://poznan-project.psnc.pl/  
**TYPE:** marriage index  
**DATA:** 19th-century marriages, spouses, localities and often related data.  
**COVERAGE:** historical Wielkopolska/Kujawy  
**DATES:** 1800–1899  
**SURNAME/PERSON:** YES  
**STRUCTURED:** database/search  
**API:** no public API identified  
**COST:** free browsing  
**COMMERCIAL:** UNCLEAR  
**SCRAPING:** do not assume  
**QUALITY:** 4  
**AUTOMATION:** 2  
**VALUE:** 5 regionally  
**USE:** highly valuable ancestor-location resolver.  
**RISK:** licensing.  
**NEXT:** request structured partnership/export licence.

The database reports over 2 million records. ([poznan-project.psnc.pl](https://poznan-project.psnc.pl/page.php?page=about))

---

## CARD 10 — Genealogia w Archiwach

**ORGANISATION:** Polish State Archives/regional partners  
**TYPE:** regional genealogy portal  
**DATA:** civil/parish records, population books and related sources.  
**COVERAGE:** primarily Kujawsko-Pomorskie participating archives  
**PERSON:** YES  
**STRUCTURED:** PARTIAL  
**PUBLIC API:** not identified  
**COST:** free browsing  
**COMMERCIAL:** item/source-dependent  
**AUTOMATION:** 2  
**QUALITY:** 4–5  
**VALUE:** 4  
**NEXT:** integrate at archive level only after checking reuse route. ([archiwa.gov.pl](https://archiwa.gov.pl/szukaj/bazy-danych/?doing_wp_cron=1782231492.6905989646911621093750))

---

## CARD 11 — Biblioteka Narodowa Data

**OFFICIAL URL:** official BN data services  
**TYPE:** bibliographic API/datasets  
**DATA:** publications, authors, catalogue metadata  
**COVERAGE:** Poland  
**STRUCTURED:** YES  
**API:** YES  
**AUTH:** source-dependent  
**COST:** free  
**DOWNLOAD:** YES  
**FORMAT:** APIs/OAI/full DB datasets  
**COMMERCIAL:** reuse available for metadata under BN conditions  
**QUALITY:** 5  
**AUTOMATION:** 5  
**VALUE:** 4  
**USE:** identify address books, monographs, heraldic books, regional publications and newspapers.  
**RISK:** metadata rights ≠ digitised-book rights.  
**NEXT:** MVP metadata integration. ([bn.org.pl](https://www.bn.org.pl/aktualnosci/3345-biblioteka-narodowa-otwiera-najwieksza-polska-baze-danych-bibliograficznych.html))

---

## CARD 12 — Polona

**ORGANISATION:** Biblioteka Narodowa  
**TYPE:** digital library  
**DATA:** books, newspapers, periodicals, address books, manuscripts, OCR.  
**STRUCTURED:** partial  
**PUBLIC API:** no sufficiently documented stable public content API confirmed here  
**COST:** free browsing  
**DOWNLOAD:** many public-domain objects  
**COMMERCIAL:** public-domain/reuse-cleared objects YES; others rights-specific.  
**FORMAT:** scans/OCR/metadata  
**QUALITY:** 4  
**AUTOMATION:** 3  
**VALUE:** 5  
**USE:** surname occurrences, address books, newspapers, historical/heraldic texts.  
**RISK:** OCR and item copyright.  
**NEXT:** integrate through BN metadata first, then rights-cleared Polona objects. ([katalogi.bn.org.pl](https://www.katalogi.bn.org.pl/uslugi/centrum-kompetencji/udostepnianie-zbiorow-cyfrowych/))

---

## CARD 13 — Federacja Bibliotek Cyfrowych

**TYPE:** metadata aggregator/digital-library federation  
**DATA:** millions of cultural objects from Polish libraries  
**STRUCTURED:** YES metadata  
**API:** OAI-PMH / metadata search infrastructure  
**COST:** free  
**COMMERCIAL:** metadata/reuse depends on record/right statement; digital object belongs to source institution.  
**QUALITY:** 4  
**AUTOMATION:** 4  
**VALUE:** 4  
**USE:** discovery layer across regional libraries.  
**RISK:** rights not homogeneous.  
**NEXT:** ingest metadata + rights URI, never assume object licence. ([pro.europeana.eu](https://pro.europeana.eu/organisation/digital-libraries-federation))

---

## CARD 14 — GUGiK PRG / PRNG

**OFFICIAL URL:** https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/  
**ORGANISATION:** GUGiK  
**TYPE:** official geospatial register  
**DATA:** administrative boundaries, TERYT relationships, addresses and territorial geometry  
**COVERAGE:** Poland  
**STRUCTURED:** YES  
**API/SERVICES:** WFS/WMS/download  
**AUTH:** generally no  
**COST:** free  
**FORMAT:** GML/OGC/geospatial  
**COMMERCIAL:** YES — described as free and for any use.  
**SCRAPING:** not applicable; use services/download.  
**QUALITY:** 5  
**AUTOMATION:** 5  
**VALUE:** 5  
**USE:** canonical Polish map/jurisdiction layer.  
**RISK:** historical boundaries require separate source.  
**NEXT:** ingest to PostGIS; version geometry yearly.

---

## CARD 15 — Atlas Fontium

**ORGANISATION:** historical geography research infrastructure / IHPAN ecosystem  
**TYPE:** historical GIS  
**DATA:** historical settlements, boundaries and map layers  
**STRUCTURED:** YES GIS  
**API:** OGC/download for datasets  
**COST:** free access  
**COMMERCIAL:** verify licence at **layer level**  
**QUALITY:** 4–5  
**AUTOMATION:** 4  
**VALUE:** 5  
**USE:** translate archival places into historical jurisdictions and contextual maps.  
**RISK:** heterogeneous periods/licences.  
**NEXT:** build layer registry with licence metadata. ([atlasfontium.pl](https://atlasfontium.pl/en/dataatlasfontium-en/?lang=en))

---

## CARD 16 — NAC

**ORGANISATION:** Narodowe Archiwum Cyfrowe  
**TYPE:** national digital archive  
**DATA:** photographs, audio, documents; many records surfaced through SzWA  
**STRUCTURED:** metadata + digital objects  
**API:** broader API work has been described but a stable public production contract must be confirmed before engineering dependency.  
**COST:** free browsing  
**COMMERCIAL:** object-rights dependent; public-domain/archive-owned materials can permit reuse.  
**QUALITY:** 5  
**AUTOMATION:** 3  
**VALUE:** 4  
**USE:** visual/history enrichment and archival references.  
**RISK:** rights per object. ([nac.gov.pl](https://www.nac.gov.pl/archiwum-audiowizualne/zasob/))

---

## CARD 17 — Grobonet

**TYPE:** cemetery database platform  
**DATA:** deceased person, grave/cemetery information  
**PERSON:** YES  
**API:** no general public API identified  
**COMMERCIAL:** terms restrict reuse/copying beyond intended information use without permission.  
**SCRAPING:** **RED**  
**QUALITY:** 4  
**AUTOMATION:** technically possible but legally unsuitable without agreement  
**VALUE:** 4  
**USE:** partnership only / external link.  
**NEXT:** contact vendor/cemetery operators for B2B API/licence. ([grobonet.com](https://grobonet.com/index.php?page=regulamin))

---

## CARD 18 — IPN person databases

**ORGANISATION:** Instytut Pamięci Narodowej  
**TYPE:** historical/repression databases  
**DATA:** German occupation losses, Soviet repression, war victims and specialised datasets.  
**PERSON:** YES  
**STRUCTURED:** searchable databases  
**PUBLIC API:** no general documented API identified  
**COST:** free search  
**COMMERCIAL:** needs database-specific verification  
**GDPR/ETHICS:** potentially sensitive historical data and living-relative implications  
**QUALITY:** 4–5  
**AUTOMATION:** 2  
**VALUE:** 4  
**USE:** candidate/history enrichment after explicit legal review.  
**NEXT:** institution-level access/licensing conversation. ([ipn.gov.pl](https://ipn.gov.pl/pl/archiwa/inwentarz-archiwalny-i-bazy-da))

---

## CARD 19 — WBH / Centralne Archiwum Wojskowe

**ORGANISATION:** Wojskowe Biuro Historyczne  
**TYPE:** military archive  
**DATA:** personal and decoration files, military holdings.  
**PERSON:** YES  
**STRUCTURED:** largely archive/catalogue/document based  
**PUBLIC API:** no general API identified  
**COST:** access/request dependent  
**COMMERCIAL:** archive-use rules apply  
**AUTOMATION:** 1–2  
**QUALITY:** 5  
**VALUE:** 5 for family research  
**USE:** human/Phase 3 research.  
**RISK:** non-digitised material and access process.  
**NEXT:** determine searchable inventories and digitisation/reproduction conditions. ([wbh.wp.mil.pl](https://wbh.wp.mil.pl/centralne-archiwum-wojskowe/zasob/akta-personalne-i-odznaczeniowe/?utm_source=chatgpt.com))

---

## CARD 20 — Arolsen Archives

**TYPE:** Nazi persecution/displacement archive  
**DATA:** concentration camps, forced labour, displaced persons, persecution records.  
**PERSON:** YES  
**STRUCTURED:** search/index + scans  
**API:** no general public production API confirmed  
**COST:** free research access  
**COMMERCIAL/REPUBLICATION:** document/source-right and privacy considerations apply  
**QUALITY:** 5  
**AUTOMATION:** 2–3  
**VALUE:** 5 when relevant  
**RISKS:** extremely sensitive personal history; original-source rights can differ.  
**NEXT:** partnership or human-research integration, never indiscriminate profiling. ([collections.arolsen-archives.org](https://collections.arolsen-archives.org/en/archive/1-1))

---

## CARD 21 — JRI-Poland

**TYPE:** Jewish Polish genealogical index  
**DATA:** Polish Jewish B/M/D and related indexes  
**PERSON:** YES  
**API:** no public production API identified  
**COST:** research access varies  
**COMMERCIAL:** published terms distinguish personal/non-commercial uses and require permission for commercial contexts.  
**SCRAPING:** do not bulk extract.  
**QUALITY:** 4–5  
**AUTOMATION:** 2  
**VALUE:** 5  
**STATUS:** 🔴 without commercial permission / 🟡 partnership  
**NEXT:** negotiate explicit commercial integration. ([jri-poland.org](https://jri-poland.org/terms-of-use/))

---

## CARD 22 — JewishGen

**TYPE:** genealogy databases  
**DATA:** Jewish communities, records, memorial books, surname/place databases  
**PERSON:** YES  
**API:** no broad open product API identified  
**COST:** mixed/donation/account environment  
**COMMERCIAL:** dataset-dependent; partnership required  
**QUALITY:** 4  
**AUTOMATION:** 2  
**VALUE:** 5  
**USE:** specialist research/partner.  
**ALGORITHMIC VALUE:** Daitch–Mokotoff Soundex is especially relevant for Eastern-European surname matching. ([jewishgen.org](https://www.jewishgen.org/gedcom/faq/sndcomp.html))

---

## CARD 23 — FamilySearch

**TYPE:** genealogy platform/archive aggregation  
**DATA:** historical records, family tree, places, memories  
**PERSON:** YES  
**STRUCTURED:** YES  
**PUBLIC API:** YES  
**FORMAT:** GEDCOM X JSON/XML  
**AUTH:** OAuth  
**COST:** developer access is not simply pay-per-query; partnership terms apply  
**PRODUCTION:** compatible-solution process required.  
**COMMERCIAL:** YES only subject to FamilySearch developer/partner agreements  
**CACHE:** restrictions/best practices must be followed  
**QUALITY:** 4–5 depending collection/tree  
**AUTOMATION:** 5 after approval  
**VALUE:** 5  
**USE:** Phase 2 core partner.  
**NEXT:** apply for Compatible Solution program. ([familysearch.org](https://www.familysearch.org/innovate/getting-started))

Polish Church Books collection alone contains millions of records/person references and tens of millions of images, illustrating the potential value of FamilySearch for Poland. ([familysearch.org](https://www.familysearch.org/pl/search/collection/4135958))

---

## CARD 24 — Ancestry

**TYPE:** commercial genealogy platform  
**DATA:** massive historical record catalogue and trees  
**PUBLIC RECORD SEARCH API:** no current unrestricted API found  
**COST:** subscriptions/licensing  
**COMMERCIAL PRODUCT REUSE:** not available by default  
**SCRAPING:** **RED**  
**TERMS:** automated/programmatic access outside intended human use and substantial copying are restricted.  
**AI:** current terms additionally contain restrictions around use of Ancestry content in AI contexts.  
**QUALITY:** 4–5  
**AUTOMATION:** 1 without deal / 5 with commercial data partnership  
**VALUE:** 5  
**NEXT:** BD/licensing, not engineering scraper. ([ancestry.com](https://www.ancestry.com/c/legal/termsandconditions))

---

## CARD 25 — MyHeritage

**TYPE:** commercial genealogy platform  
**API:** partner/family graph APIs exist  
**AUTH:** user/partner authorization  
**PERSON:** YES  
**COMMERCIAL:** partnership-based  
**SCRAPING:** do not use as substitute for partner API  
**QUALITY:** 4–5  
**AUTOMATION:** 4 if contracted  
**VALUE:** 5  
**STATUS:** 🟡  
**NEXT:** commercial partnership enquiry. ([myheritage.com](https://www.myheritage.com/FP/Company/popup-privacy-definitions.php?dispLang=EN&lang=RU))

---

## CARD 26 — Geneanet

**TYPE:** genealogy platform  
**PERSON:** YES  
**PUBLIC GENERAL SEARCH API:** not identified  
**COMMERCIAL AUTOMATION:** terms reviewed prohibit normal robot/automated access and constrain commercial usage.  
**SCRAPING:** RED  
**QUALITY:** 4  
**AUTOMATION:** 1 without agreement  
**VALUE:** 4  
**NEXT:** partnership or deep links only. ([en.geneanet.org](https://en.geneanet.org/legal/cgu/))

---

## CARD 27 — Open Archives Netherlands

**OFFICIAL API:** YES — Search/Match/Show  
**TYPE:** archive aggregator/API  
**COVERAGE:** Dutch archives  
**PERSON:** YES  
**STRUCTURED:** YES  
**FORMAT:** JSON/XML/TTL/GEDCOM; exports/OAI  
**COST:** free  
**RATE:** 4 requests/sec/IP documented  
**LICENSE:** OAI-PMH data CC0  
**COMMERCIAL:** YES for CC0 metadata/data; attached images retain source rights.  
**QUALITY:** 5  
**AUTOMATION:** 5  
**VALUE:** 5  
**STATUS:** 🟢  
**USE:** ideal first non-Polish integration. ([openarchieven.nl](https://www.openarchieven.nl/api/docs/))

---

## CARD 28 — UK National Archives Discovery

**TYPE:** national archive API  
**DATA:** tens of millions of archival descriptions  
**API:** YES, JSON/XML  
**AUTH:** documented access mechanism  
**COST:** free  
**LICENSE:** Open Government Licence for eligible metadata  
**COMMERCIAL:** YES under OGL conditions  
**RATE:** service/crawl limits apply; API/bulk preferred.  
**QUALITY:** 5  
**AUTOMATION:** 5  
**VALUE:** 5  
**STATUS:** 🟢 metadata  
**NEXT:** Phase 2 UK source. ([nationalarchives.gov.uk](https://www.nationalarchives.gov.uk/terms-and-conditions/discovery-for-developers-about-the-application-programming-interface-api/))

---

## CARD 29 — US National Archives Catalog

**TYPE:** US national archive  
**API:** Catalog API v2  
**DATA:** descriptions, authorities, digital-object metadata, OCR/public contributions  
**AUTH:** API key  
**COST:** free  
**RATE:** default quotas published; higher tiers available  
**BULK:** separate bulk datasets are preferable for large extraction  
**COMMERCIAL:** US federal/public-domain context often permissive but individual objects still need rights review  
**CACHE:** API documentation includes storage/cache constraints; architect around bulk data where appropriate.  
**QUALITY:** 5  
**AUTOMATION:** 5  
**VALUE:** 5 for US family research  
**STATUS:** 🟢/🟡 item-dependent. ([archives.gov](https://www.archives.gov/research/catalog/help/api))

Historical US censuses through 1950 are available after the 72-year confidentiality period. ([archives.gov](https://www.archives.gov/research/census))

---

## CARD 30 — Library of Congress / Chronicling America

**TYPE:** national library/API/newspaper archive  
**API:** YES  
**DATA:** catalogue, newspapers, OCR, images  
**FORMAT:** JSON/YAML and specialised endpoints  
**COST:** free  
**COMMERCIAL:** metadata/open material generally usable; inspect item rights  
**QUALITY:** 4–5  
**AUTOMATION:** 5  
**VALUE:** 4  
**USE:** US newspapers, directories, historical mentions.  
**NEXT:** Phase 2 global historical-search layer. ([loc.gov](https://www.loc.gov/apis/json-and-yaml/requests/endpoints/))

---

## CARD 31 — Europeana

**TYPE:** European cultural heritage aggregator  
**API:** Search, Record, IIIF and others  
**AUTH:** API key/project key  
**COST:** generally free subject to limits/project approval  
**DATA:** metadata for European cultural collections  
**COMMERCIAL:** metadata and object reuse governed by rights statements; object rights must be checked  
**QUALITY:** 4  
**AUTOMATION:** 5  
**VALUE:** 4  
**STATUS:** 🟢 metadata pipeline / 🟡 media  
**NEXT:** integrate `rights` field into every object. ([europeana.eu](https://www.europeana.eu/pl/apis))

---

## CARD 32 — Wikidata

**TYPE:** knowledge graph  
**DATA:** people, places, occupations, identifiers, dates, relationships  
**API:** YES / SPARQL  
**LICENSE:** CC0 structured data  
**COMMERCIAL:** YES  
**COST:** free  
**QUALITY:** 3–5 depending assertion  
**AUTOMATION:** 5  
**VALUE:** 5  
**STATUS:** 🟢  
**USE:** notable people, place identities, external IDs.  
**IMPORTANT:** Wikidata statements are discovery evidence, not automatically archival proof. ([wikidata.org](https://www.wikidata.org/wiki/Wikidata%3ACopyright))

---

## CARD 33 — OpenStreetMap

**TYPE:** geodata  
**API:** Overpass/data ecosystem; public Nominatim for limited geocoding  
**LICENSE:** ODbL  
**COMMERCIAL:** YES under licence obligations  
**PUBLIC NOMINATIM:** max around 1 req/s and explicitly unsuitable for heavy systematic production use.  
**CACHE:** strongly recommended/required operationally  
**QUALITY:** 4  
**AUTOMATION:** 5 with own data/provider  
**VALUE:** 5  
**USE:** global places; not surname truth.  
**NEXT:** self-host or commercial OSM provider at scale. ([openstreetmap.org](https://www.openstreetmap.org/copyright))

---

## CARD 34 — Riksarkivet Sweden

**TYPE:** national archive + open data  
**API:** REST Search API beta, OAI-PMH, IIIF, linked data  
**AUTH:** many open endpoints without API key  
**DATA:** historical population/church material  
**LICENSE:** much old metadata CC0; many digitised public records Public Domain, with exceptions  
**RESTRICTION:** open person data generally restricted by age rules; source says open APIs focus on material older than 110 years.  
**DOWNLOAD:** structured datasets including historical birth/baptism material.  
**QUALITY:** 5  
**AUTOMATION:** 5  
**VALUE:** 5  
**STATUS:** 🟢 for specified open datasets  
**NEXT:** strong Phase 2 Scandinavian pilot. ([data.riksarkivet.se](https://data.riksarkivet.se/))

---

## CARD 35 — Deutsche Digitale Bibliothek

**TYPE:** German national cultural aggregator  
**API:** YES  
**AUTH:** API key  
**DATA:** cultural/archive metadata  
**LICENSE:** much metadata CC0; binary/object rights differ  
**COST:** free access  
**QUALITY:** 4  
**AUTOMATION:** 5  
**VALUE:** 4  
**STATUS:** 🟢 metadata / 🟡 objects  
**USE:** German/Prussian historical records and publication discovery. ([github.com](https://github.com/bundesAPI/ddb-api/blob/main/openapi.yaml))

---

## CARD 36 — Archives nationales de France

**TYPE:** national archive/open datasets  
**DATA:** archival inventories, nominal/geographic datasets and digitised corpora  
**STRUCTURED:** YES for numerous datasets/EAD  
**COMMERCIAL:** French public-information reuse can be permissive with attribution, subject to personal-data and third-party rights.  
**QUALITY:** 5  
**AUTOMATION:** 4  
**VALUE:** 4  
**STATUS:** 🟢/🟡  
**NEXT:** integrate selected open datasets rather than crawl departmental portals indiscriminately. ([archives-nationales.culture.gouv.fr](https://www.archives-nationales.culture.gouv.fr/ouverture-des-donnees-des-archives-nationales))

---

## CARD 37 — Antenati, Italy

**ORGANISATION:** Italian State Archives / Ministry ecosystem  
**TYPE:** genealogy/civil registry portal  
**DATA:** births, marriages, deaths, draft/military-related genealogical sources depending archive  
**PUBLIC API:** none confirmed  
**COST:** free browsing  
**AUTOMATION:** 2  
**COMMERCIAL:** verify terms before machine extraction  
**QUALITY:** 5 at document level  
**VALUE:** 5 for Italy  
**STATUS:** 🟡  
**NEXT:** seek official machine-access/partnership path. ([icar.cultura.gov.it](https://icar.cultura.gov.it/sistemi-e-portali/antenati))

---

## CARD 38 — PARES, Spain

**TYPE:** state archive portal  
**DATA:** Spanish archival descriptions and digitised documents  
**API:** no public general API verified  
**COST:** free public access  
**AUTOMATION:** 2  
**COMMERCIAL:** source/item terms require review  
**QUALITY:** 5  
**VALUE:** 4  
**STATUS:** 🟡  
**NEXT:** institutional data-access discussion rather than scraping. ([datos.gob.es](https://datos.gob.es/es/catalogo/e05234201-pares-portal-de-archivos-espanoles))

---

## CARD 39 — Internet Archive

**TYPE:** digital library  
**API:** YES  
**DATA:** books, directories, newspapers, OCR, metadata  
**COST:** free  
**STRUCTURED:** metadata + full-text search  
**COMMERCIAL:** **ITEM-SPECIFIC**; Internet Archive hosting does not create a blanket commercial licence.  
**QUALITY:** 3–5  
**AUTOMATION:** 5 technically  
**VALUE:** 5  
**STATUS:** 🟡  
**USE:** public-domain address books, directories and historical publications.  
**NEXT:** filter by rights/licence before content ingestion. ([archivesupport.zendesk.com](https://archivesupport.zendesk.com/hc/en-us/articles/360018538912-Internet-Archive-APIs))

---

## CARD 40 — Google Books

**TYPE:** book metadata/search API  
**API:** YES  
**FORMAT:** JSON/REST  
**COST:** API generally quota-based  
**COMMERCIAL:** Google notes it licenses much source material; reviewed terms impose material restrictions on charging users/application use without appropriate agreement.  
**STATUS:** 🔴/🟡 for a paid Name Atlas backend until legal/contractual confirmation  
**QUALITY:** 4  
**AUTOMATION:** 5  
**VALUE:** 3  
**USE:** discovery/link-out, not canonical surname database.  
**NEXT:** do not make it an MVP dependency. ([developers.google.com](https://developers.google.com/books/docs/overview?authuser=2))

---

# 9. IMPORTANT GLOBAL SOURCES NOT IN THE 40 FULL CARDS

### Findmypast

Highly valuable UK/global genealogy data, but its terms explicitly prohibit systematic database creation by screen scraping, caching, data extraction or programmatic access. **RED absent commercial agreement.** ([findmypast.co.uk](https://www.findmypast.co.uk/help/articles/4411066891409?utm_source=chatgpt.com))

### FreeBMD / FreeREG / FreeCEN

FreeBMD alone currently reports roughly 300 million distinct civil-registration index records and covers B/M/D for England and Wales beginning in 1837, though transcription coverage is not complete. Search results can be downloaded in a tabular format, but specific current terms must be checked before bulk commercial ingestion. ([freebmd.org.uk](https://www.freebmd.org.uk/?d=bmd_1071762129&r=15286126&utm_source=chatgpt.com))

### Ellis Island / Statue of Liberty Foundation

Public passenger search exists and currently supports surname, birth year, residence, arrival year/location and related filters. No public developer API was identified in this research. Treat automatic ingestion as **YELLOW/RED pending permission**. ([statueofliberty.org](https://www.statueofliberty.org/discover/heritagesearch/?utm_source=chatgpt.com))

### Canadian Library and Archives

Excellent for Canadian census and migration research, but a production person-search API was not confirmed. Treat as human/deep-link or partnership source initially.

### WikiTree

API/dev ecosystem exists. Useful as a candidate graph, but user-created genealogy must never be equivalent to an archival record.

### Geni

API exists, but its API terms restrict reuse/sale/sharing of Geni material. Treat as partner/user-authorized source, not a redistributable genealogy feed. ([geni.com](https://www.geni.com/platform/developer/help))

### FamilyTreeDNA

DNA-related data carries substantially higher privacy sensitivity. Do **not** put this into MVP surname enrichment. Any future integration should be explicit-user-authorized and separately DPIA/legal reviewed.

---

# 10. API / DATA PROVIDER MATRIX

| Provider | Function | API | Current pricing | Commercial fit | MVP recommendation |
|---|---|---|---|---|---|
| dane.gov.pl | PL surname counts | YES | Free | Excellent | **CORE** |
| GUGiK PRG | PL boundaries | WFS/WMS/download | Free | Excellent | **CORE** |
| Wikidata | people/places | YES | Free/CC0 | Excellent | **CORE** |
| BN Data | books/metadata | YES | Free | Strong | **CORE** |
| FBC | library metadata | OAI/search | Free | Good, rights-aware | MVP/Phase2 |
| Europeana | heritage | YES | Free key/project limits | Good | Phase2 |
| FamilySearch | genealogy | YES | partnership model | Strong after approval | Phase2 |
| Open Archives | genealogy NL | YES | Free; 4 req/s | Excellent | Phase2 |
| UK TNA | archive catalogue | YES | Free/OGL | Excellent | Phase2 |
| NARA | US archives | YES | Free quotas | Strong | Phase2 |
| Riksarkivet | Swedish archives | YES | Free open APIs | Excellent | Phase2 |
| DDB | German heritage | YES | Free/API key | Strong | Phase2 |
| NamSor | origin/name classification | YES | paid credits | Useful probabilistic fallback | Optional |
| NameAPI | parsing/matching/gender | YES | paid | Useful normalization | Optional |
| Nationalize | nationality probabilities | YES | paid tiers | Limited evidence value | Optional |
| Genderize | gender probabilities | YES | paid tiers | Not needed when source has sex count | Low |
| OnoGraph / Forebears | global name geography | YES | account/credits | Terms require review | Partnership |
| Mapbox | geocoding | YES | usage based | Good | Optional |
| Google Maps Geocoding | geocoding | YES | usage based | Good | Optional |
| MapTiler | maps/geocoding | YES | commercial plan | Good | Optional |
| HERE | geocoding | YES | pricing via plan/console | Good | Optional |
| OSM/Nominatim | geocoding | YES | free public endpoint heavily limited | Self-host/vendor at scale | CORE DATA, not public endpoint |
| Google Knowledge Graph | knowledge | legacy/migrating | legacy quota | Prefer Wikidata | No |
| Google Books | books | YES | API quotas | commercial constraints | No core dependency |

## Name intelligence APIs

### NamSor

Useful for probabilistic nationality/origin and name classification. Its origin endpoint consumes more credits than simple gender classification. Current published plan structure includes free and paid tiers ranging through high-volume enterprise plans. ([namsor.app](https://namsor.app/prices/))

**Product interpretation:**

```text
NamSor says:
Polish 0.62
German 0.21
Czech 0.09
...

≠

"This surname is Polish."
```

Correct Name Atlas output:

> “A statistical name-classification model associates this surname most strongly with Poland. This is not evidence of your family's geographic origin.”

### NameAPI

Better suited for:

- parsing names;
- matching;
- normalization;
- formatting;
- genderization,

than for scholarly surname etymology.

### Nationalize / Genderize

Useful as weak statistical enrichment. Do not turn probabilistic name correlations into ethnicity or identity facts.

---

# 11. GEOCODING STRATEGY

## Poland

Recommended:

```text
PRG / PRNG / TERYT
      ↓
local PostGIS gazetteer
      ↓
historical alias resolver
      ↓
OSM/Wikidata
      ↓
paid geocoder only when unresolved
```

Using Google or Mapbox for every surname query would be unnecessary.

Google's current Geocoding pricing provides 10,000 monthly free events, then $5/1k through the first paid tier, with progressively lower rates at higher volumes. ([developers.google.com](https://developers.google.com/maps/billing-and-pricing/pricing?authuser=1&utm_source=chatgpt.com))

---

# 12. HISTORICAL MAPS — WHAT IS REAL?

This distinction must be enforced at the schema level.

## A. REAL HISTORICAL DISTRIBUTION MAP

Requires:

- representative population dataset;
- known denominator;
- reasonably complete geography;
- known observation period;
- consistent administrative mapping.

Example:

> Census dataset where substantially all households in region X were enumerated.

Label:

**Surname distribution, Census 1900**

## B. ARCHIVE OCCURRENCE MAP

Records found:

```text
Kraków  37 archival hits
Poznań  21
Toruń   14
```

This **does not** mean Kraków had the largest population of the surname.

Correct label:

> **Known archival occurrences, 1820–1870**

## C. INFERRED MIGRATION MAP

Derived from time-ordered clusters or linked people.

```text
Place A
  ↓ probable movement
Place B
  ↓
Place C
```

Correct label:

> **Possible migration pattern**

## D. MODERN DISTRIBUTION

Modern authoritative/statistical source.

---

## Can Name Atlas honestly build:

| Feature | Poland MVP |
|---|---|
| Modern country-level count | **YES** |
| Modern sex distribution | **YES** |
| Current authoritative municipality surname map | **NOT currently from the open PESEL surname dataset identified** |
| Historical occurrence map | **YES** once archive rights/access solved |
| True 1850 nationwide population surname map | **Generally NO from one clean open nationwide dataset** |
| True 1900 map | fragmented/regional |
| True 1950 map | difficult / dataset-specific |
| Inferred migration map | **YES later, clearly labelled inferred** |
| Historical boundary map | **YES with appropriate GIS sources** |

So:

```text
1850 → archive occurrences
1900 → archive/census-dependent occurrences
1950 → limited reconstruction
2026 → official modern aggregate
```

should not be marketed as four equivalent population snapshots.

---
# 13. HISTORICAL VARIANT ENGINE

A single Soundex implementation is not enough.

## Recommended pipeline

```text
ORIGINAL SURNAME
      ↓
Unicode normalization
      ↓
case normalization
      ↓
diacritic-preserving canonical form
      ↓
gendered-form normalization
      ↓
language/context detection
      ↓
historical spelling rules
      ↓
transliteration engines
      ↓
phonetic encoders
      ↓
string-similarity candidates
      ↓
location + time re-ranking
      ↓
archive search candidates
```

## Variant categories

Store separately:

```text
VERIFIED_VARIANT
  directly observed in a source

SCHOLARLY_VARIANT
  asserted by onomastic source

GENERATED_VARIANT
  generated by search engine

OCR_VARIANT
  likely OCR corruption

PHONETIC_MATCH
  similar pronunciation only
```

Never merge those categories.

---

## Polish-specific rules

Examples of transformations to consider:

- ą ↔ a / om / on in foreign transcription;
- ę ↔ e / em / en;
- ł ↔ l;
- ó ↔ o;
- ż / ź ↔ z;
- ć ↔ c;
- ś ↔ s;
- ń ↔ n;
- cz ↔ tsch / ch;
- sz ↔ sch / sh;
- w ↔ v;
- j ↔ i / y;
- -ski / -ska;
- -cki / -cka;
- -dzki / -dzka;
- historical -owa / -ówna;
- Cyrillic transliteration variations;
- Germanisation;
- Latin case endings in ecclesiastical sources.

---

# 14. ALGORITHM ASSESSMENT

| Algorithm | PL usefulness | Recommended role |
|---|---:|---|
| Levenshtein | 5/5 | edit-distance feature |
| Jaro-Winkler | 4/5 | short/name similarity ranking |
| Daitch–Mokotoff Soundex | 5/5 for East-European/Jewish | major phonetic feature |
| Classic Soundex | 2/5 PL / 4 US diaspora | US record fallback |
| Double Metaphone | 3/5 | international/Anglicised layer |
| Cologne phonetics | 3/5 | German-context surnames |
| NYSIIS | 2–3/5 | North-American records |
| deterministic PL linguistic rules | **5/5** | primary |
| time/place-aware variant model | **5/5** | re-ranking |

Daitch–Mokotoff Soundex was specifically designed because traditional Soundex performs poorly for many Slavic/Yiddish surnames and remains widely used in Eastern-European genealogy. ([jewishgen.org](https://www.jewishgen.org/gedcom/faq/sndcomp.html))

### Critical rule

Similarity algorithms **find candidates**.

They never prove that two surname forms belong to the same family.

---

# 15. AI / LLM LAYER

## AI 1 — Evidence summarisation

**INPUT:** normalized verified claims  
**OUTPUT:** human-readable surname summary  
**GROUNDING:** claim IDs only  
**VALIDATION:** every sentence maps to ≥1 claim  
**RISK:** hallucinated connective narrative  
**HUMAN REVIEW:** not normally, if validator passes

---

## AI 2 — Etymology synthesis

**INPUT:** IJP + other licensed scholarly interpretations  
**OUTPUT:** comparison of interpretations  
**GROUNDING:** named sources  
**VALIDATION:** no interpretation absent source  
**RISK:** presenting hypothesis as fact  
**HUMAN:** onomastics review for conflicts/high-value reports

---

## AI 3 — Variant suggestion

**INPUT:** surname + languages + region + period  
**OUTPUT:** candidate spellings  
**GROUNDING:** deterministic transformations + model  
**VALIDATION:** variants labelled GENERATED  
**RISK:** too many false positives  
**HUMAN:** no for searching; yes before asserting historical identity

---

## AI 4 — Document transcription

**INPUT:** scan  
**OUTPUT:** text + entities  
**GROUNDING:** document image coordinates/page  
**VALIDATION:** OCR confidence + consistency  
**RISK:** dates/names incorrectly read  
**HUMAN:** required below confidence threshold

---

## AI 5 — Record linkage assistance

**INPUT:** two person records  
**OUTPUT:** match features/explanation  
**GROUNDING:** exact fields  
**VALIDATION:** deterministic matcher produces final class  
**RISK:** conflating people  
**HUMAN:** ambiguous cases

---

## AI 6 — Historical translation

**INPUT:** Latin/German/Russian/Polish archival text  
**OUTPUT:** translated text  
**GROUNDING:** original transcription/image  
**VALIDATION:** preserve names/numbers verbatim  
**RISK:** names silently translated/altered  
**HUMAN:** critical genealogical relationships where OCR uncertain

---

## AI 7 — Conflict detection

**INPUT:** claims about same entity/event  
**OUTPUT:** conflicts:

```text
DOB:
Source A: 1872
Source B: 1873
Source C: 1872
```

**RISK:** low  
**HUMAN:** when conflict blocks lineage verification.

---

# 16. WHAT AI MUST NEVER DO

AI may **not**:

- invent ancestors;
- invent missing parents;
- create fake historical records;
- infer a coat of arms from surname;
- silently convert POSSIBLE to VERIFIED;
- invent exact birth years;
- infer ethnicity/religion of living users from surname;
- fill gaps because a family story “looks likely”;
- merge two similarly named people without match evidence;
- turn an unsourced family tree into primary evidence;
- call surname migration the migration of the user's family.

---

# 17. CONFIDENCE / TRUTH MODEL

## VERIFIED

Requirements differ by claim type.

### Modern surname count

VERIFIED if:

- direct current official dataset;
- extraction reproducible;
- source date known.

### Historical occurrence

VERIFIED if:

- direct record/index references surname;
- date/location/source known.

### Person event

VERIFIED if:

- direct archival/civil/church record;
- identity sufficiently disambiguated.

### Parent-child relationship

VERIFIED if:

- record directly identifies relation,
- and person identity has been resolved.

---

# LIKELY

Use if:

- ≥2 genuinely independent sources corroborate;
- OR strong calibrated record-linkage result;
- material fields align;
- no serious conflict exists.

Never use number of copied web pages as independent evidence.

---

# POSSIBLE

Use where:

- evidence is compatible;
- one meaningful clue exists;
- competing possibilities remain.

Examples:

- possible toponymic origin;
- possible ancestor record;
- possible migration path.

---

# UNCONFIRMED

Use where:

- source quality is poor;
- OCR uncertain;
- source itself is unsourced;
- records conflict;
- user-submitted family lore has not been corroborated.

---

# NOT ENOUGH EVIDENCE

This needs to be a first-class product result, not an error.

Example:

> **NOT ENOUGH EVIDENCE**  
> We found no reliable evidence linking this surname to a single place of origin.

That is better than an attractive hallucination.

---

# 18. SOURCE WEIGHTING

Suggested internal evidence hierarchy:

```text
Tier A
Direct civil/parish/archive record
Official statistical dataset

Tier B
Scholarly onomastic publication
Curated national archive index
Official catalogue metadata

Tier C
High-quality volunteer transcription
Reputable genealogical index
Structured historical database

Tier D
User-contributed tree
Wikipedia narrative
secondary website

Tier E
unsourced page / forum / AI-generated material
```

But:

**Directness matters as much as tier.**

An official archive catalogue saying a register exists does not prove a specific person appears in the register.

---

# 19. HERALDRY SAFETY

Polish heraldry creates a major consumer-product trap.

Historically:

- many different families/names could share one coat of arms;
- the same surname could occur in unrelated families;
- different families bearing the same surname could have different heraldic affiliations. ([pgsa.org](https://pgsa.org/wp-content/uploads/2025/07/PL-Nobility-Heraldry-Intro.pdf))

## Never say

> “Twój herb to Jastrzębiec.”

## Allowed

> “A family bearing the surname X appears in heraldic source Y as associated with the Jastrzębiec coat of arms.”

Then mandatory:

> “This does not establish that every modern person with surname X descends from that heraldic family.”

## VERIFIED coat-of-arms relationship

Only after evidence chain connects:

```text
USER / known ancestor
        ↓ verified
generation N
        ↓ verified
generation N+1
        ↓
historically documented noble family
        ↓
heraldic source
```

Surname matching alone = **POSSIBLE reference, never family attribution**.

---

# 20. LEGAL / LICENSING RISK MODEL

## GREEN

Use when:

- explicit open licence;
- public-sector reuse right;
- API expressly permits intended commercial use;
- attribution requirements can be satisfied.

Examples:

- dane.gov.pl qualified public data;
- GUGiK PRG;
- Wikidata CC0;
- Open Archives CC0 data;
- UK TNA OGL metadata;
- specified Swedish open datasets.

---

## YELLOW

Use when:

- item rights vary;
- commercial permission unclear;
- API requires partnership;
- database vs underlying document rights differ;
- personal data creates additional legal basis questions.

Examples:

- ISNP;
- SzWA machine integration;
- BaSIA;
- Poznan Project;
- FamilySearch;
- MyHeritage;
- Europeana digital objects;
- Internet Archive items;
- Arolsen;
- IPN.

---

## RED

Do not build automated production ingestion without contract/permission.

Examples:

- Geneteka substantial automated extraction without PTG agreement;
- Grobonet database reuse;
- Findmypast crawler;
- Ancestry automated extraction;
- Geneanet crawler;
- JRI-Poland commercial extraction without approval;
- Forebears website mining;
- Google Books as a core paid-service content source without legal clearance.

---

# 21. GDPR / PRIVACY

This section is product/privacy architecture, **not legal advice**. Polish/EU counsel should validate the final design and likely conduct a DPIA before launching person-level matching.

GDPR requires data to be adequate, relevant and limited to what is necessary. ([eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/PL-DE-EN/TXT/?uri=CELEX%3A32016R0679))

GDPR itself does not apply to deceased persons under Recital 27, although Member States can have separate rules and records can still expose data about living relatives. ([eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/PL-DE-EN/TXT/?uri=CELEX%3A32016R0679))

## Recommended storage model

### Surname search

Can store:

```text
surname_normalized
country
aggregate profile
source snapshots
```

Low privacy risk because no identifiable individual required.

### Region search

Store only if useful:

```text
surname
region
query timestamp
```

Prefer analytics aggregation rather than long-term user-identifiable search histories.

### Ancestor research

Possible fields:

```text
name
surname
approx_year
place
relationship_to_user
source_record_ids
```

Separate workspace from public surname cache.

### Living relatives

Default:

- private;
- minimal fields;
- encrypted;
- never public by default;
- explicit deletion controls;
- retention policy;
- role/access isolation.

### Special-category data

Avoid automatic storage/inference of:

- racial/ethnic origin;
- religion;
- genetic data;
- health;
- political affiliation;
- sexuality.

Those fall into substantially higher-risk GDPR categories. ([eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/PL-DE-EN/TXT/?uri=CELEX%3A32016R0679))

### Third-party relatives entered by a user

“User gave us the information” does **not automatically settle Name Atlas's own GDPR obligations**.

Requires counsel to determine:

- lawful basis;
- information obligations;
- retention;
- deletion;
- legitimate interests assessment;
- handling of third-party living persons.

---

# 22. SOURCE CONFLICTS

Never choose automatically simply because one source has higher brand authority.

## Conflict resolver

```text
1. Identify exact claim.
2. Determine whether sources are independent.
3. Determine direct vs derived evidence.
4. Compare date.
5. Compare geography.
6. Compare original image vs transcription.
7. Identify possible calendar/spelling differences.
8. Preserve all values.
9. Lower confidence if unresolved.
10. Present major interpretations.
```

Example:

```text
Etymology A — IJP PAN
surname derived from personal name X

Etymology B — another scholarly dictionary
surname potentially toponymic from Y
```

Correct output:

> “Two major interpretations are documented.”

Not:

> “AI determined interpretation A is correct.”

---

# 23. DATA FRESHNESS

| Data | Refresh model |
|---|---|
| PESEL surname count | annual/source release |
| rarity/rank | recalc when PESEL changes |
| PRG boundaries | annual snapshot + official updates |
| addresses | continuous/periodic |
| ISNP | project/update driven |
| static historical dictionary | STATIC |
| Geneteka | continuous |
| SzWA | continuous |
| BaSIA | continuous |
| Poznan Project | continuous |
| Wikidata | continuous |
| BN/FBC/Europeana | continuous |
| archive image | effectively static |
| archival index | can change/corrections |
| LLM narrative | regenerate only when evidence bundle changes |
| API ToS/licence status | review quarterly + change monitoring |

Every Name Atlas result should expose:

```text
Source:
Source data date:
Retrieved:
Last checked:
Method:
Confidence:
```

---

# 24. MVP VS PHASE 2 VS PHASE 3

## MVP

| Feature | Value | Difficulty | Data | Legal risk |
|---|---:|---:|---:|---:|
| current PL surname count | 5 | 1 | 5 | 1 |
| sex split | 4 | 1 | 5 | 1 |
| rank | 4 | 1 | 5 | 1 |
| rarity score | 5 | 1 | 5 | 1 |
| basic surname morphology | 4 | 2 | 4 | 1 |
| sourced etymology | 5 | 2 | 5 | **requires IJP deal** |
| surname variants | 5 | 2 | 4 | 1–2 |
| modern place/geography support | 5 | 2 | 5 geometry / distribution depends | 1–3 |
| notable people | 3 | 1 | 4 | 1 |
| historical-publication references | 4 | 3 | 4 | 2 |
| evidence-linked narrative | 5 | 2 | 5 | 1 |
| transparent confidence | 5 | 2 | — | 1 |

---

## PHASE 2

- FamilySearch partnership;
- SzWA machine integration;
- archive occurrence maps;
- BN/Polona/FBC richer search;
- Open Archives Netherlands;
- Riksarkivet;
- UK National Archives;
- NARA;
- Europeana;
- DDB;
- record entity resolution;
- historical place/jurisdiction resolver;
- archive candidate matching;
- OCR on rights-cleared documents.

---

## PHASE 3

- PTG/Geneteka licensed integration;
- JRI/JewishGen deals;
- MyHeritage/Ancestry/Findmypast commercial partnerships;
- automated multi-generation graph;
- complex HTR;
- non-digitised archive requests;
- professional genealogist marketplace/workflow;
- verified heraldic lineage;
- difficult borderland, Jewish, military and migration research.

---

# 25. DATA COST MODEL

Costs below distinguish **official vendor prices** from Name Atlas engineering assumptions.

## LLM assumption

For a newly generated surname report:

- 3,000 input tokens;
- 1,000 output tokens;
- GPT-5.6 Luna.

Current Luna pricing is **$0.20/M input and $1.20/M output**. ([developers.openai.com](https://developers.openai.com/api/docs/models/gpt-5.6-luna?utm_source=chatgpt.com))

That gives approximately:

**$0.0018 per newly generated surname profile.**

### LLM — worst case: every search is unique

| Searches/mo | Estimated Luna cost |
|---:|---:|
| 1,000 | **$1.80** |
| 10,000 | **$18** |
| 50,000 | **$90** |
| 100,000 | **$180** |
| 1,000,000 | **$1,800** |

### If only 20% of searches create a new surname profile

| Searches/mo | New profiles | LLM |
|---:|---:|---:|
| 1k | 200 | ~$0.36 |
| 10k | 2k | ~$3.60 |
| 50k | 10k | ~$18 |
| 100k | 20k | ~$36 |
| 1M | 200k | ~$360 |

This is why surname caching is fundamental.

---

## Optional NamSor origin enrichment

Using current published plan/credit structure and assuming one 10-credit origin lookup for every **unique uncached** search, rough plan-fit cost is approximately:

| Unique origin queries | Approx. NamSor plan cost |
|---:|---:|
| 1k | ~$19 |
| 10k | ~$130 |
| 50k | ~$930 |
| 100k | ~$999 |
| 1M | ~$5,000 |

Actual cost can fall materially when repeated names are cached and depending on plan/duplicate-credit rules. ([namsor.app](https://namsor.app/prices/))

**Recommendation:** do not call NamSor every time. One normalized surname-country profile should be reusable.

---

## Google Geocoding worst case

Current official Geocoding tier starts with 10k free events/month and then tiered prices. ([developers.google.com](https://developers.google.com/maps/billing-and-pricing/pricing?authuser=1&utm_source=chatgpt.com))

If Name Atlas unnecessarily geocoded once on every search:

| Queries | Approx. Google Geocoding |
|---:|---:|
| 1k | $0 |
| 10k | $0 |
| 50k | ~$200 |
| 100k | ~$450 |
| 1M | ~$3,550 |

But Name Atlas should instead use:

```text
PRG/PRNG/TERYT + local cache
```

for Polish places, making core geocoding cost near-zero.

---

## Recommended monthly data-cost envelope

### OPEN-DATA CORE ONLY

| Searches | Data APIs | LLM worst-case | Approx. core variable data cost |
|---:|---:|---:|---:|
| 1k | ~$0 | $1.80 | ~$2 |
| 10k | ~$0 | $18 | ~$18 |
| 50k | ~$0 | $90 | ~$90 |
| 100k | ~$0 | $180 | ~$180 |
| 1M | ~$0 | $1,800 | ~$1,800 |

Excludes hosting/storage.

### WITH NAMSOR ON EVERY UNIQUE QUERY

| Searches | LLM | NamSor | Total |
|---:|---:|---:|---:|
| 1k | $1.8 | ~$19 | **~$21** |
| 10k | $18 | ~$130 | **~$148** |
| 50k | $90 | ~$930 | **~$1,020** |
| 100k | $180 | ~$999 | **~$1,179** |
| 1M | $1,800 | ~$5,000 | **~$6,800** |

With caching these numbers fall sharply.

### Storage

**TBD**, because no cloud provider/schema volume has been chosen.

Do not fabricate a vendor quote.

### OCR

**MVP: $0 target** because OCR should not be required for the basic surname profile.

Phase 2 cost = TBD after choosing OCR/HTR provider and document workflow.

### Archive querying

Open APIs can be near-zero data-fee.

The expensive component later becomes:

> **human review, non-indexed sources, archive requests and licensing**, not surname API calls.

---

# 26. CACHE STRATEGY

## SURNAME CACHE

Key:

```text
country
normalized_surname
source_snapshot_version
```

Contains:

- counts;
- stats;
- etymology evidence;
- variants;
- derived metrics;
- source IDs.

### TTL

PESEL:

> until next source release; normally source-version rather than arbitrary TTL.

---

# SOURCE CACHE

Store:

- normalized records;
- source ID;
- retrieved_at;
- licence;
- source checksum/version.

Only where source licence permits caching.

---

# LLM SUMMARY CACHE

Key:

```text
hash(
  evidence_bundle
  + prompt_version
  + model_version
  + language
)
```

A summary does **not** expire merely because 30 days passed.

It expires when evidence changes.

---

# MAP CACHE

Store locally:

- PRG polygons;
- place IDs;
- coordinates;
- historical jurisdiction mappings.

For commercial geocoders obey provider-specific storage rules. Mapbox, for example, distinguishes temporary and permanent geocoding. ([mapbox.com](https://www.mapbox.com/geocoding))

---

# ARCHIVE SEARCH CACHE

Cache where terms allow:

```text
normalized query
source
result IDs
result metadata
checked_at
```

Suggested freshness:

- active archive index: days/weeks;
- static record: long-term;
- negative search: 1–7 days.

Do not use caching to circumvent provider restrictions.

---
# 27. FINAL DATA MATRIX — 60 DATA POINTS

| Data Point | Primary source route | API | Cost | Coverage | Reliability | Automation | Commercial | Default confidence | MVP |
|---|---|---:|---|---|---:|---:|---|---|---|
| 1 Current surname count PL | PESEL | Y | free | PL | 5 | 5 | green | VERIFIED | Y |
| 2 Female count | PESEL | Y | free | PL | 5 | 5 | green | VERIFIED | Y |
| 3 Male count | PESEL | Y | free | PL | 5 | 5 | green | VERIFIED | Y |
| 4 Popularity rank | derived PESEL | — | free | PL | 5 | 5 | green | VERIFIED-derived | Y |
| 5 Rarity percentile | derived | — | free | PL | 5 | 5 | green | VERIFIED-derived | Y |
| 6 Frequency per million | derived | — | free | PL | 5 | 5 | green | VERIFIED-derived | Y |
| 7 Current country association | official stats/APIs | mixed | mixed | global | 3 | 4 | mixed | LIKELY | Y |
| 8 Województwo distribution | licensed ISNP/etc. | N | TBD | PL | 4 | 3 | yellow | source-dependent | conditional |
| 9 Powiat distribution | ISNP | N | TBD | PL | 4 | 3 | yellow | source-dependent | conditional |
| 10 Gmina distribution | provider-specific | mixed | TBD | PL | 2–4 | 2 | yellow | source-dependent | N |
| 11 City distribution | ISNP/national stats | mixed | TBD | partial | 3 | 3 | yellow | source-dependent | conditional |
| 12 Etymology | IJP | N | licence TBD | PL | 5 | 3 | yellow | LIKELY interpretation | conditional |
| 13 Literal meaning | IJP/dictionaries | mixed | TBD | partial | 4 | 4 | yellow/green | LIKELY | conditional |
| 14 Linguistic origin | onomastics | mixed | mixed | global | 4 | 4 | mixed | LIKELY | Y |
| 15 Country-of-origin model | NamSor/etc. | Y | paid | global | 2–3 | 5 | vendor terms | POSSIBLE/LIKELY model | optional |
| 16 Morphology | IJP/rules | partial | low | PL | 4 | 5 | green if rules | LIKELY/VERIFIED source | Y |
| 17 Root | IJP/rules | partial | low | PL | 4 | 5 | mixed | LIKELY | Y |
| 18 Suffix | rules | — | free | PL | 4 | 5 | green | VERIFIED linguistic parse | Y |
| 19 Feminine form | rules/source | — | free | PL | 5 | 5 | green | VERIFIED rule | Y |
| 20 Historical gender form | dictionaries | mixed | low | PL | 4 | 4 | mixed | source-backed | Y |
| 21 Diacritic variant | rules | — | free | global | 5 | 5 | green | GENERATED | Y |
| 22 German spelling variant | engine | — | low | relevant | 3 | 5 | green | GENERATED/POSSIBLE | Y |
| 23 Cyrillic variant | engine | — | low | relevant | 4 | 5 | green | GENERATED | Y |
| 24 Latin-record variant | engine | — | low | relevant | 3 | 4 | green | GENERATED | Y |
| 25 Verified historical spelling | archive/IJP | mixed | mixed | partial | 5 | 3 | mixed | VERIFIED | Y/P2 |
| 26 Similar surnames | similarity engine | — | free | global | 3 | 5 | green | generated | Y |
| 27 Phonetic candidates | DM etc. | — | free | global | 3 | 5 | green | generated | Y |
| 28 Possible place-name relation | gazetteer+onomastics | Y | low | global | 2–4 | 4 | green | POSSIBLE | Y |
| 29 Historical place occurrence | archive | mixed | mixed | partial | 5 | 3 | mixed | VERIFIED occurrence | P2 |
| 30 Earliest found occurrence | multi-source | mixed | mixed | partial | 4 | 3 | mixed | VERIFIED as “found” | P2 |
| 31 Estimated origin period | synthesis | — | low | partial | 2–4 | 4 | green | POSSIBLE/LIKELY | Y |
| 32 Foreign surname occurrence | official country stats | mixed | mixed | partial global | 4 | 4 | mixed | VERIFIED per source | P2 |
| 33 Diaspora pattern | multi-source | — | low | global | 3 | 4 | green | LIKELY | P2 |
| 34 Migration hypothesis | linked clusters | — | medium | partial | 2–4 | 3 | green | POSSIBLE | P2 |
| 35 Heraldic-source occurrence | books | mixed | low | PL/EU | 4 | 3 | item rights | VERIFIED occurrence | Y |
| 36 Coat-of-arms attribution to user | genealogy required | — | high | individual | — | 1 | — | NOT ENOUGH by default | N |
| 37 Notable living person | Wikidata | Y | free | global | 3–4 | 5 | green | source-backed | Y |
| 38 Historical notable person | Wikidata/BN | Y | free | global | 4 | 5 | green | source-backed | Y |
| 39 Address book occurrence | libraries | mixed | low | partial | 3–4 | 3 | rights-specific | VERIFIED occurrence | P2 |
| 40 Newspaper occurrence | Polona/LoC/etc. | mixed | mixed | global partial | 3–4 | 3 | rights-specific | VERIFIED occurrence | P2 |
| 41 Obituary candidate | newspapers/databases | mixed | mixed | partial | 3 | 3 | yellow | POSSIBLE | P2 |
| 42 Grave candidate | cemetery DB | N/mixed | mixed | partial | 3–4 | 2 | red/yellow | POSSIBLE | P3 |
| 43 Passenger record candidate | NARA/Ellis/FS | mixed | mixed | migration routes | 4 | 3 | mixed | POSSIBLE | P2 |
| 44 Census record candidate | national archive | mixed | mixed | country-specific | 4–5 | 4 | mixed | POSSIBLE | P2 |
| 45 Birth record candidate | archives | mixed | mixed | partial | 5 | 3 | mixed | POSSIBLE | P2 |
| 46 Birth event verified | source image/index | mixed | mixed | partial | 5 | 2–4 | mixed | VERIFIED | P2 |
| 47 Baptism candidate | church records | mixed | mixed | partial | 5 | 3 | mixed | POSSIBLE | P2 |
| 48 Marriage candidate | archives | mixed | mixed | partial | 5 | 4 | mixed | POSSIBLE | P2 |
| 49 Marriage verified | direct act | mixed | mixed | partial | 5 | 3 | mixed | VERIFIED | P2 |
| 50 Death candidate | archives | mixed | mixed | partial | 5 | 4 | mixed | POSSIBLE | P2 |
| 51 Parent names | B/M records | mixed | mixed | partial | 5 | 3 | mixed | VERIFIED if explicit | P2 |
| 52 Spouse | marriage/census | mixed | mixed | partial | 5 | 3 | mixed | VERIFIED if explicit | P2 |
| 53 Siblings | derived linked B records | — | medium | partial | 4 | 3 | mixed | LIKELY/VERIFIED links | P2 |
| 54 Occupation | records/directories | mixed | mixed | partial | 5 | 3 | mixed | VERIFIED | P2 |
| 55 Residence | census/directory | mixed | mixed | partial | 5 | 4 | mixed | VERIFIED | P2 |
| 56 Military service | military archive | mixed | mixed | partial | 5 | 2 | yellow | VERIFIED | P3 |
| 57 Repression record | IPN/Arolsen | N/mixed | mixed | relevant population | 5 | 2 | yellow | VERIFIED | P2/3 |
| 58 Historical jurisdiction | GIS/gazetteers | Y | low | partial/global | 4–5 | 5 | green | VERIFIED/source-backed | P2 |
| 59 Archive/parish recommendation | gazetteer+catalogue | mixed | low | partial | 4 | 5 | green | LIKELY | P2 |
| 60 Provisional ancestor link | linkage engine | — | medium | person-specific | variable | 3 | — | POTENTIAL/LIKELY | P2/3 |

---

# 28. USER INPUT → DATA CAPABILITY MATRIX

| User provides | What Name Atlas can discover | Confidence | Main sources | Premium potential |
|---|---|---|---|---:|
| **1. surname only** | count, rarity, gender split, etymology where sourced, variants, linguistic structure, known places/people/occurrences | VERIFIED → POSSIBLE | PESEL, IJP, Wikidata, libraries | medium |
| **2. surname + country** | country-specific frequency, disambiguation, better language model | higher | national stats, name APIs | medium |
| **3. surname + region** | local occurrence clusters, regional variants, archive targets, possible origin refinement | medium/high | ISNP, archives, GIS | high |
| **4. surname + town** | historical records around locality, parish/jurisdiction, nearby variants | high for occurrences | archive catalogue, historical gazetteer | high |
| **5. surname + parent's birthplace** | constrain likely family geography and migration hypotheses | medium | records + region sources | high |
| **6. grandparent name** | candidate person records | low–medium without dates | archives/indexes | high |
| **7. grandparent name + approximate DOB** | B/M/D candidates, parents/spouse/residence | medium–high | archival indexes | very high |
| **8. full known family profile** | entity resolution, linked record candidates, provisional family graph | potentially high | multi-source | highest |

---

# 29. EXACT PRODUCT CLAIMS

## CLAIMS WE CAN SAFELY MAKE

Provided the source actually supports them:

> “According to the PESEL surname dataset dated X, N living people are reported with surname Y.”

> “N records in the dataset use the surname for women and M for men.”

> “This surname ranks #X among surnames in the dataset.”

> “Name Atlas calculates this surname to be in the Xth rarity percentile.”

> “This spelling appears in an archival record from 1843 in location Y.”

> “Source X records a family bearing this surname in a heraldic context.”

> “This historical document names A as the father of B.”

---

# 30. CLAIMS REQUIRING QUALIFIERS

> “One documented etymological interpretation derives the surname from…”

> “The surname is likely associated linguistically with…”

> “One possible place-name connection is…”

> “Records suggest that the surname may have become more common in region X during…”

> “This record is a potential match for your grandfather.”

> “These records are consistent with a possible migration from A to B.”

---

# 31. CLAIMS WE SHOULD NEVER MAKE AUTOMATICALLY

> “This person is your ancestor.”

without verified lineage.

> “This is your family's coat of arms.”

from surname alone.

> “Your family originated in X.”

from surname geography.

> “This surname was created in 1432.”

because a 1432 record is merely the earliest found.

> “Your ancestors migrated along this route.”

because surname distributions moved.

> “You are ethnically X.”

from surname inference.

> “Everyone with surname X is related.”

Never.

---

# 32. WHAT DATA IS ACTUALLY PREMIUM?

## FREE

Best acquisition/value layer:

- current surname count;
- sex split;
- popularity rank;
- rarity;
- basic distribution where legally available;
- short sourced meaning;
- basic variants;
- basic notable people;
- transparent source/date/confidence.

These are highly cacheable and cheap.

---

# CHEAP TO GENERATE

- LLM narrative;
- language translation;
- morphology;
- variant suggestions;
- similarity matching;
- source conflict summary;
- basic place-name candidates.

Marginal cost can be fractions of a cent when cached.

---

# VALUABLE BUT AUTOMATABLE

This is the strongest premium category:

- regional surname analysis;
- historical occurrences;
- archive discovery;
- candidate ancestor records;
- parish/archive recommendation;
- record linkage;
- candidate parents/spouse;
- historical timelines;
- archive occurrence maps;
- migration hypotheses;
- translated archival snippets;
- evidence bundle/export.

---

# EXPENSIVE TO GENERATE

- OCR/HTR across many pages;
- querying numerous proprietary genealogy sources;
- searching large unindexed collections;
- repeated document extraction;
- multi-country entity resolution;
- licensed commercial datasets.

---

# HUMAN RESEARCH REQUIRED

Highest-value premium later:

- resolving ambiguous ancestors;
- proving a branch across missing records;
- reading difficult handwritten metrical books;
- contacting archives;
- non-digitised material;
- adoption/name-change cases;
- noble/heraldic lineage;
- borderland genealogy;
- complex Jewish genealogy;
- complex wartime displacement;
- conflicting records;
- legal/sensitive-record issues.

---

# 33. MVP DATA STACK

Recommended production stack:

```text
USER SURNAME
      ↓
Unicode + surname normalisation
      ↓
PESEL / dane.gov.pl
      ↓
IJP PAN licensed dataset
      ↓
Wikidata
      ↓
BN Data / rights-cleared cultural metadata
      ↓
GUGiK place + geometry layer
      ↓
Historical Variant Engine
      ↓
Evidence Normaliser
      ↓
Claim Ledger
      ↓
Conflict Engine
      ↓
Confidence Engine
      ↓
LLM grounded summary
      ↓
Result validator
      ↓
Surname Profile Cache
      ↓
NAME ATLAS RESULT
```

If no IJP licence at launch:

```text
DO NOT scrape ISNP.

Instead:

PESEL
+
own linguistic rules
+
licensed/open onomastic references where permitted
+
optional probabilistic API
+
NOT ENOUGH EVIDENCE when necessary
```

A weaker but honest etymology layer is preferable to an illegally acquired or hallucinated one.

---

# 34. PHASE 2 STACK

```text
MVP PROFILE
   ↓
region / town
   ↓
historical place resolver
   ├── PRG
   ├── historical gazetteers
   ├── Atlas Fontium
   ├── FamilySearch Places
   └── Wikidata
   ↓
archive discovery
   ├── SzWA
   ├── BN/FBC
   ├── Europeana
   ├── Open Archives
   ├── Riksarkivet
   ├── UK TNA
   ├── NARA
   └── DDB
   ↓
variant-expanded search
   ↓
candidate records
   ↓
entity resolution
   ↓
archive occurrence timeline/map
```

---

# 35. FAMILY RESEARCH STACK

```text
KNOWN PERSON
name + surname + approx DOB + place
       ↓
name normalisation
       ↓
historical variants
       ↓
place/jurisdiction resolver
       ↓
multi-source candidate retrieval
       ↓
candidate person entities
       ↓
record linkage scoring
       ↓
POTENTIAL MATCHES
       ↓
cross-source corroboration
       ↓
LIKELY MATCH
       ↓
direct record inspection
       ↓
VERIFIED EVENT / RELATIONSHIP
       ↓
family graph edge
       ↓
repeat for next generation
```

At any ambiguous node:

```text
2+ plausible people
OR
missing record
OR
conflict
OR
unreadable source
     ↓
HUMAN REVIEW
```

---

# 36. PRODUCT LIMITATIONS AT LAUNCH

Name Atlas will **not** initially be able to reliably:

1. determine the exact village where a surname began;
2. tell the user who the first bearer was;
3. give a true nationwide 1850/1900/1950 surname map for every country;
4. identify an ancestor from surname alone;
5. automatically prove an entire family line;
6. assign coat of arms;
7. prove noble ancestry;
8. prove ethnicity;
9. infer religion;
10. reconstruct migrations without records;
11. access closed civil registers;
12. search every archive;
13. read every handwritten scan accurately;
14. legally ingest every public genealogy website;
15. guarantee completeness of an archive search;
16. prove that absence from an index means absence from the original archive.

---

# 37. OPEN QUESTIONS

## Requires supplier contact

- IJP PAN commercial reuse/API/export.
- PTG / Geneteka / Metryki / Skanoteka partnership.
- NDAP/NAC official machine-access roadmap.
- BaSIA structured commercial access.
- Poznan Project structured access.
- Grobonet B2B/API.
- FamilySearch Compatible Solution.
- MyHeritage commercial partnership.
- Forebears/OnoGraph redistribution rights.
- Arolsen machine/republication route.

## Requires lawyer

- exact IJP database/content rights;
- PTG database rights integration agreement;
- GDPR lawful basis for third-party living relatives;
- DPIA for automatic person matching;
- retention period;
- use of sensitive historical records;
- commercial reproduction of archive scans;
- archival records about living people;
- database-right implications in EU;
- Google Books paid-product terms;
- international privacy differences.

## Requires professional genealogist

- matching-calibration gold set;
- evidence standards;
- false-positive review;
- archive-specific conventions;
- lineage verification SOP.

## Requires onomastic expert

- morphology rules;
- root/suffix models;
- interpretation hierarchy;
- generated variant sanity checks;
- language-specific origin confidence.

## Requires technical PoC

- SzWA machine retrieval;
- IJP structured extraction if licensed;
- archive person-resolution precision;
- handwriting OCR;
- historical place reconciliation;
- FamilySearch Places;
- DM Soundex + Polish-rule hybrid;
- cache hit rates by surname.

---

# 38. TOP 10 SOURCES TO INTEGRATE / SECURE FIRST

## 1. dane.gov.pl PESEL

**WHY:** authoritative Polish modern surname baseline  
**VALUE:** 5/5  
**DIFFICULTY:** 1/5  
**COST:** free  
**RISK:** 1/5  
**ACTION:** integrate immediately.

---

## 2. GUGiK PRG/PRNG

**WHY:** canonical Polish administrative/geographic layer  
**VALUE:** 5  
**DIFFICULTY:** 2  
**COST:** free  
**RISK:** 1  
**ACTION:** ingest immediately. ([geoportal.gov.pl](https://www.geoportal.gov.pl/pl/dane/panstwowy-rejestr-granic-prg/))

---

## 3. IJP PAN ISNP

**WHY:** probably highest-value Polish onomastic dataset  
**VALUE:** 5  
**DIFFICULTY:** 2 technically / 4 licensing  
**COST:** unknown  
**RISK:** 4 without agreement  
**ACTION:** **highest-priority partnership conversation.**

---

## 4. Wikidata

**WHY:** open global knowledge graph and place/person IDs  
**VALUE:** 4  
**DIFFICULTY:** 1  
**COST:** free  
**RISK:** 1  
**ACTION:** integrate immediately.

---

## 5. BN Data + rights-cleared Polona

**WHY:** Polish publications, historical directories, regional books  
**VALUE:** 4  
**DIFFICULTY:** 2  
**COST:** free  
**RISK:** 1 metadata / item-specific content  
**ACTION:** MVP/early Phase2.

---

## 6. Szukaj w Archiwach

**WHY:** backbone of Polish archival discovery  
**VALUE:** 5  
**DIFFICULTY:** 4  
**COST:** likely low data fee; technical agreement TBD  
**RISK:** 2–3  
**ACTION:** approach NDAP/NAC about supported programmatic access.

---

## 7. PTG / Geneteka ecosystem

**WHY:** enormous indexed Polish genealogy value  
**VALUE:** 5  
**DIFFICULTY:** 4  
**COST:** partnership TBD  
**RISK:** 5 if scraped; manageable under agreement  
**ACTION:** partnership, not crawler.

---

## 8. FamilySearch

**WHY:** global records + Poland + Places + genealogy APIs  
**VALUE:** 5  
**DIFFICULTY:** 4  
**COST:** partnership  
**RISK:** 2 under approved integration  
**ACTION:** apply during Phase 2.

---

## 9. Open Archives Netherlands

**WHY:** excellent proof of global modular architecture  
**VALUE:** 4  
**DIFFICULTY:** 1  
**COST:** free  
**RISK:** 1 for CC0 data  
**ACTION:** first international genealogy API adapter.

---

## 10. Riksarkivet / UK TNA / NARA adapter family

**WHY:** demonstrates that Name Atlas can add countries through provider adapters rather than custom scraping  
**VALUE:** 4–5  
**DIFFICULTY:** 2–3  
**COST:** low/free APIs  
**RISK:** low when rights metadata respected  
**ACTION:** Phase 2.

---

# 39. RECOMMENDED PROVIDER ABSTRACTION

Do not write product logic like:

```python
query_geneteka()
query_familysearch()
query_nara()
```

directly into genealogy logic.

Use:

```text
HistoricalRecordProvider

searchPerson()
searchSurname()
searchPlace()
getRecord()
getSourceImage()
getRights()
getCoverage()
getProviderConfidence()
```

Each adapter implements:

```text
FamilySearchAdapter
OpenArchivesAdapter
NARAAdapter
RiksarkivetAdapter
StateArchivesPolandAdapter
...
```

Then Name Atlas remains global and provider-independent.

---

# 40. RECOMMENDED CORE DATA ENTITIES

```text
Surname
SurnameForm
SurnameVariant
SurnameStatistic
SurnameInterpretation
SurnameOccurrence

Person
PersonName
Event
Relationship

Place
HistoricalPlaceName
AdministrativeUnit
HistoricalJurisdiction

Source
Collection
Record
DigitalObject
Evidence

Claim
Conflict
ConfidenceAssessment

RightsPolicy
SourceLicence
RetrievalPolicy

SearchQuery
CandidateMatch
MatchFeature

GeneratedNarrative
```

---

# 41. IMPORTANT MODEL: SURNAME vs PERSON vs FAMILY LINE

Every fact must carry:

```text
scope = SURNAME
scope = PERSON
scope = FAMILY_LINE
```

Examples:

### SURNAME

> “Cichowski occurs 1,234 times.”

### PERSON

> “Jan Cichowski married Anna X in 1883.”

### FAMILY_LINE

> “This Jan Cichowski is the great-grandfather of user Y.”

The third claim can **never** be inferred merely from the first two.

---

# 42. FIRST MVP RESPONSE AFTER ENTERING ONLY A SURNAME

A strong evidence-based Polish Name Atlas MVP can realistically return:

## VERIFIED

- current PESEL count;
- women/men split;
- rank;
- rarity percentile;
- source date;
- pronunciation/form rules where deterministic;
- explicitly sourced historical occurrences where available;
- notable people as separate people, not relatives.

## LIKELY

If IJP partnership is secured:

- etymological interpretation;
- linguistic roots;
- morphological origin;
- related historical forms;
- likely language associations.

## POSSIBLE

- place-name connections;
- international origin hypotheses;
- migration patterns;
- generated search variants.

## UNCONFIRMED / NOT ENOUGH EVIDENCE

Where no scholarly/archival source supports stronger claims.

---

# 43. WHAT REGION ADDS

With:

```text
SURNAME + REGION
```

Name Atlas gains:

- stronger variant selection;
- appropriate historical language context;
- likely archive;
- likely parish;
- historical jurisdiction;
- local record hits;
- geographically constrained name-origin hypotheses;
- candidate historical clusters;
- much lower archival false-positive rate.

That is a very substantial increase in value for almost no extra data-entry burden.

---

# 44. WHAT GRANDPARENT DATA ADDS

With:

```text
Grandparent:
name
surname
approx DOB
town/region
```

the product changes category.

It is no longer only a surname product.

It becomes:

> **automated genealogy discovery.**

Potential result:

```text
We found 7 candidates.

Candidate #1
Name match       exact
DOB              +1 year
Place            exact
Father           matches known name
Mother           matches known name
Source           parish birth register
Confidence       LIKELY

Candidate #2
Name             exact
DOB              exact
Place            90 km away
Parents          different
Confidence       LOW
```

That is credible premium value without pretending Candidate #1 is definitely the user's grandfather.

---

# 45. EXACT LIMIT OF AUTOMATION

This is the most important architectural conclusion of the research.

Name Atlas can automatically and credibly reach:

## LEVEL 1 — SURNAME INTELLIGENCE

Almost fully automatic.

```text
count
rarity
geography
etymology
variants
historical context
```

## LEVEL 2 — HISTORICAL DISCOVERY

Highly automatable.

```text
archive occurrences
books
directories
record indexes
places
time periods
```

## LEVEL 3 — PERSON CANDIDATE DISCOVERY

Automatable.

```text
possible birth
possible marriage
possible death
possible passenger record
possible census record
```

## LEVEL 4 — RECORD LINKAGE

Partially automatable.

```text
same person?
parent?
spouse?
sibling?
```

Some links can become VERIFIED automatically where evidence is explicit and uniquely resolving.

## LEVEL 5 — PROVISIONAL FAMILY GRAPH

Possible.

The engine can build:

```text
You
↓
known father
↓
likely grandfather
↓
candidate great-grandfather
```

while keeping every edge's confidence independent.

## LEVEL 6 — PROVEN MULTI-GENERATION FAMILY LINE

This is where human genealogy becomes necessary whenever evidence stops being unambiguous.

---

# 46. ANSWER TO THE FINAL QUESTION

# Jaki jest maksymalny poziom wartości i personalizacji, który Name Atlas może dostarczyć automatycznie i wiarygodnie, zanim potrzebny będzie człowiek-genealog?

**Znacznie wyższy niż sam „surname report”.**

Name Atlas może automatycznie dostarczyć:

> **spersonalizowany, evidence-backed surname profile + historyczną analizę regionu + wyszukiwanie i ranking konkretnych rekordów potencjalnych przodków + provisional family graph zawierający pojedyncze zweryfikowane relacje tam, gdzie źródła są jednoznaczne.**

System może nawet automatycznie stwierdzić:

> **VERIFIED:** „Akt urodzenia wskazuje, że osoba A była córką B i C.”

Może następnie połączyć kilka takich rekordów.

Ale granicą nie powinno być:

> „trzy pokolenia”

ani:

> „rok 1850”.

Granica powinna brzmieć:

# THE FIRST AMBIGUOUS EVIDENCE EDGE

Gdy wystąpi:

- dwóch podobnych kandydatów;
- brak aktu;
- sprzeczne daty;
- różni rodzice;
- nieczytelny rękopis;
- niepewna transliteracja;
- brak cyfrowego indeksu;
- niepewne źródło;
- skok pomiędzy miejscowościami bez dowodu;
- próba przypisania herbu;
- próba połączenia z rodziną szlachecką;

pipeline powinien zatrzymać automatyczne „proof” i powiedzieć:

> **HUMAN REVIEW REQUIRED**

albo:

> **NOT ENOUGH EVIDENCE**

---

# 47. FINAL RECOMMENDATION

## Co Name Atlas powinien pokazać po samym nazwisku w MVP?

1. official modern count;
2. women/men;
3. popularity rank;
4. rarity;
5. trustworthy etymology **only if licensed/sourced**;
6. meaning/linguistic structure;
7. sourced historical variants;
8. generated search variants clearly distinguished;
9. source-backed geography with explicit source date;
10. notable people;
11. earliest **found** historical references where available;
12. known international occurrences;
13. historical/publication references;
14. source, confidence, date and methodology for every meaningful claim.

---

## Co region dodaje?

- stronger origin hypothesis;
- region-specific history;
- historical place names;
- likely parish;
- likely archive;
- local record occurrences;
- better variants;
- lower false-positive rate;
- historical clusters;
- possible migration directions.

---

## Co dane dziadka/przodka dodają?

- person-level archival search;
- B/M/D candidates;
- parents;
- spouse;
- siblings;
- residence;
- occupation;
- military/repression/immigration candidates;
- record linkage;
- provisional family graph.

---

## Co powinno być FREE?

Low-marginal-cost, highly cacheable surname discovery:

```text
count
rank
rarity
basic modern distribution
short sourced meaning
basic origin
basic variants
source transparency
```

---

## Co ma największy sens jako PREMIUM?

Not „more text”.

The strongest premium asset is:

# EVIDENCE DISCOVERY

Specifically:

```text
historical occurrences
archive search
ancestor candidate discovery
record matching
regional deep dive
historical place resolution
timeline
migration hypotheses
document extraction
cross-source comparison
family graph expansion
```

---

## Co wymaga człowieka?

Human genealogist becomes essential for:

- ambiguous record matching;
- missing generations;
- non-indexed archives;
- difficult handwriting;
- conflicting evidence;
- adoption/name changes;
- heraldic lineage;
- noble-family claims;
- complex wartime cases;
- complex borderland research;
- advanced Jewish genealogy;
- archive correspondence.

---

# 48. ONE-SENTENCE PRODUCT PRINCIPLE

The entire system should operate according to:

> **Name Atlas does not tell the user the most interesting story it can generate. It tells the user the most interesting story the available evidence can support.**

And technically:

```text
SOURCE
   ↓
RAW EVIDENCE
   ↓
NORMALISATION
   ↓
CLAIM
   ↓
RIGHTS CHECK
   ↓
CONFLICT CHECK
   ↓
CONFIDENCE
   ↓
LLM NARRATIVE
   ↓
VALIDATION
   ↓
USER
```

Never:

```text
SURNAME
   ↓
LLM
   ↓
STORY
```

That architectural decision is what can differentiate Name Atlas from generic AI surname websites.
