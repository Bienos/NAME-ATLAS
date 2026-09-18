# NAME ATLAS — Discovery Flow Research & UX Playbook

**Research date:** 17.09.2026  
**Market 1:** Poland · **Product architecture:** global

---

# 1. EXECUTIVE SUMMARY

Najważniejszy wniosek z researchu jest bardzo konkretny:

> **Name Atlas nie powinien zaczynać od pochodzenia ani historii. Powinien najpierw udowodnić, że „zna” nazwisko, następnie sprawić, żeby użytkownik zobaczył je jako część własnej tożsamości, później umieścić je w przestrzeni, następnie wyjaśnić jego znaczenie, a dopiero potem otworzyć wymiar czasu.**

## Rekomendowana sekwencja

```text
SURNAME INPUT
↓
REAL ANALYSIS
↓
1. POPULATION
„To nazwisko naprawdę istnieje w naszych danych.”
↓
2. RARITY
„Jak wyjątkowe jest?”
↓
3. MAP
„Gdzie żyją ludzie o tym nazwisku?”
↓
4. STRONGEST REGION
„Dlaczego właśnie tutaj?”
↓
5. PROBABLE ORIGIN
„Skąd może pochodzić?”
↓
6. MEANING / ETYMOLOGY
„Co właściwie oznacza?”
↓
7. TRUST INTERRUPT
„Skąd to wiemy i na ile jesteśmy pewni?”
↓
8. HISTORICAL VARIANTS
„To nazwisko nie zawsze wyglądało tak samo.”
↓
9. HISTORICAL PLACE / PERIOD
„W przeszłości pojawia się gdzie indziej / wcześniej.”
↓
10. ONE REAL HISTORICAL CLUE
„Historia zaczyna się komplikować.”
↓
11. FREE SUMMARY + SHARE MOMENT
„Dostałem już coś wartościowego.”
↓
12. DISCOVERY INDEX
„Znaleźliśmy jeszcze: X wariantów, Y miejsc, Z references...”
↓
13. OPTIONAL PERSONALISATION
„Czy któryś z tych śladów może dotyczyć mojej rodziny?”
↓
14. PERSONAL RESEARCH PREVIEW
↓
15. PREMIUM TRANSITION
„Otwórz dalsze rozdziały.”
```

### Dlaczego właśnie tak?

**FACT — ciekawość pojawia się szczególnie wtedy, gdy człowiek rozpoznaje konkretną lukę w swojej wiedzy.** Loewenstein opisuje curiosity jako stan powstający z dostrzeżenia „gap in knowledge”. Zatem użytkownik musi najpierw coś **wiedzieć**, zanim skutecznie pokażemy mu to, czego jeszcze nie wie.

**FACT — informacje odnoszące się bezpośrednio do siebie są przetwarzane i zapamiętywane mocniej niż informacje neutralne.** Potwierdza to meta-analiza self-reference effect. Nazwisko użytkownika, jego rarity i mapa są więc dobrym materiałem na pierwsze momenty doświadczenia.

**BENCHMARK — MyHeritage nie musi ujawniać pełnego rekordu, żeby wzbudzić chęć dalszego researchu.** Sam fakt istnienia Record Match jest widoczny bezpłatnie; pełne rekordy i skany wymagają Data Subscription.

**BENCHMARK — autoDNA daje użytkownikowi informację o rodzaju i ilości dostępnych danych dla konkretnego VIN-u przed zakupem pełnego raportu.** Jest to najbliższy strukturalnie analog do Name Atlas: identyfikator → coverage check → konkretna preview → zakup pełnych danych.

**RECOMMENDATION — darmowa warstwa musi być naprawdę dobra.** Za darmo dałbym: podstawowe znaczenie, prawdopodobne pochodzenie, liczebność, rarity, współczesną mapę i przynajmniej jeden historyczny element. Premium zaczyna się dopiero tam, gdzie rośnie koszt/unikalność researchu: historyczne lokalizacje, archiwa, pełna ewolucja pisowni, migracje, potencjalne rekordy i personalizacja rodzinnej gałęzi.

**RECOMMENDATION — paywall powinien nastąpić dopiero po pełnym darmowym mini-story.** Użytkownik ma już wiedzieć:

- ile osób nosi nazwisko;
- czy jest rzadkie;
- gdzie występuje;
- jakie ma prawdopodobne pochodzenie;
- co oznacza;
- przynajmniej jeden element jego historycznej ewolucji.

Premium nie kończy więc odpowiedzi na pytanie:

> „Skąd pochodzi moje nazwisko?”

Premium odpowiada na **nowe pytania**, które powstały dzięki darmowemu wynikowi:

> „Jak wyglądało wcześniej?”  
> „Gdzie występowało?”  
> „Co jest w archiwach?”  
> „Czy ten ślad może dotyczyć mojej rodziny?”

To jest zasadnicza różnica między **ethical curiosity loop** a zwykłym paywallem.

---

# 2. COMPETITOR DISCOVERY PATTERN LIBRARY

## Genealogy / ancestry

| Produkt | First value / discovery | Progressive pattern | Premium moment | Trust model | Najważniejsza lekcja |
|---|---|---|---|---|---|
| **Ancestry** | użytkownik zaczyna od tego, co już wie | dodaje osoby → pojawiają się Hint leaves → nowe rekordy | komunikat, że istnieją rekordy rodziny i można je odblokować membershipem | record-driven | dane użytkownika poprawiają dalsze odkrycia |
| **MyHeritage** | family tree + automatyczne matches | system sam znajduje matches | matches można zobaczyć bezpłatnie, pełny rekord/scans płatne | match można confirm/reject | **doskonały model „widzisz, że coś istnieje”** |
| **FamilySearch** | free family tree | automatyczne record hints | brak głównego paywalla | użytkownik musi zweryfikować match | candidate ≠ verified ancestor |
| **Geneanet** | darmowe family tree | Premium Hints automatycznie porównują drzewo z bazą | premium matching / alerts | źródła + user confirmation | ongoing alerts uzasadniają subscription |
| **Findmypast** | tree hints | brief preview → full compare | records/subscription | side-by-side old data vs candidate record | świetny pattern evidence comparison |
| **Forebears** | natychmiast population/rank/map | map → meaning → historical distribution | głównie free utility | sources + caveats | pierwsza wartość powinna być natychmiastowa |
| **House of Names** | surname origin/history | darmowy fragment → dalsza historia | PDF / physical products | history excerpts | działa jako free story → artifact |
| **Geni** | free world family tree | Tree Matches / search | Geni Pro | possible relatives language | premium sprzedaje research capability |
| **FamilyTreeDNA** | DNA origins + map | percentages → chromosome detail → matches | full testing/tools | metodologiczne explanation | warstwowość informacji |
| **23andMe** | ancestry composition | geography → DNA relatives → historical matches | Premium/deeper tools | bardzo mocne explanation uncertainty | nie utożsamia matcha z direct ancestry |
| **Newspapers.com** | search historical newspapers | **NOT VERIFIED** dokładny current interactive reveal | subscription | — | przed implementacją wymaga screen audit |
| **WikiTree** | collaborative family tree | **NOT VERIFIED** dokładna obecna sekwencja progressive discovery | free | community sourcing | nie używam jako benchmark flow bez audytu |

Ancestry w swoim aktualnym getting-started flow dosłownie prowadzi: „start with what you know” → „look for a hint leaf” → „explore your hint” → „the more you add, the more we can uncover”.

MyHeritage w lipcu 2026 opisuje Record Matching jako automatyczne porównywanie drzewa z dziesiątkami miliardów historycznych rekordów. Lista dopasowań jest dostępna bezpłatnie; pełne dokumenty i skany wymagają Data Subscription.

FamilySearch jest szczególnie dobrym benchmarkiem epistemic trust: record hint jest **potencjalnym** dopasowaniem, a użytkownik ma porównać nazwiska, daty, relacje i miejsca, a następnie zaakceptować lub oznaczyć „Not a Match”.

Findmypast również pokazuje krótki opis źródła i preview informacji, a następnie pozwala porównać rekord ze znanymi danymi side-by-side, oznaczając to, co identyczne, nowe i odmienne.

23andMe daje bardzo dobry wzorzec języka uncertainty: firma wprost wyjaśnia, że Historical Match zazwyczaj **nie oznacza bezpośredniego przodka**, tylko wspólnego przodka w dalszej przeszłości.

---

## Self-discovery

| Produkt | Input | Identity moment | Deeper layer | Lekcja |
|---|---|---|---|---|
| **16Personalities** | personality test | typ osobowości | career interpretation / AI mentors | darmowy result jest użyteczny sam w sobie |
| **CliftonStrengths** | assessment | Top 5 strengths | pełne 34 + deeper interpretation | bardzo czysty depth ladder |
| **Attachment Project** | quiz | attachment style | kontekst: single / partner / parent | post-result context question jest naturalne |
| **The Pattern** | personal profile | personalized insight | deeper interpretations | **current detailed flow NOT VERIFIED** |
| **Co-Star** | birth data | personalized astrology | paid reports/features | **current exact paywall sequence NOT VERIFIED** |
| **Nebula** | personal/birth data | personalized content | premium readings | **current exact onboarding NOT VERIFIED** |

CliftonStrengths jest bardzo dobrym benchmarkiem architektury: Top 5 ma być „basic understanding”, podczas gdy pełne 34 daje pełny ranking, blind spots i bardziej zaawansowaną interpretację. Co ważne, użytkownik może później odblokować pełne 34 **bez ponownego wykonywania assessmentu**.

16Personalities również nie sprzedaje samej odpowiedzi „jaki jestem?”, lecz kolejną warstwę zastosowania profilu, np. do kariery.

---

## Identifier → report products

| Produkt | Identifier | Co jest pokazane | Co jest płatne | Lekcja |
|---|---|---|---|---|
| **autoDNA** | VIN | zakres i ilość dostępnych danych | pełny PDF | **najlepszy analog dla Name Atlas** |
| **carVertical** | VIN | źródła, rodzaje danych, sample report | full vehicle report | evidence + sample |
| **Experian** | identity/credit data | free report / score | multi-bureau premium | basic insight → broader context |
| **Spokeo** | person name | podstawowe information | deeper public record access | useful pattern, ale privacy-sensitive |
| **BeenVerified** | person identifier | **detailed current reveal NOT VERIFIED** | paid reports | audytować osobno |
| **TruthFinder** | person identifier | **detailed current reveal NOT VERIFIED** | paid reports | category has trust risks |
| **Function Health** | biological testing | 160+ tests + explanation | membership | interpretacja jest częścią produktu |
| **InsideTracker** | health data | analysis scope | personalized recommendations | raw data → interpreted action |

autoDNA wprost podaje, że ilość informacji zależy od konkretnego VIN-u i że **typ oraz ilość danych są przedstawiane przed zakupem**.

carVertical skanuje ponad 1000 źródeł w 45+ krajach i informuje, że sekcje raportu różnią się zależnie od tego, jakie dane istnieją dla konkretnego pojazdu.

To jest fundamentalnie zgodne z Name Atlas:

> nie każde nazwisko ma tyle samo danych → produkt powinien najpierw ustalić coverage → dopiero potem obiecywać konkretny report.

---

## Consumer discovery / storytelling

| Produkt | Reveal logic | Identity | Sharing | Lekcja |
|---|---|---|---|---|
| **Spotify Wrapped** | kolejna data story po kolejnej | top artists, genres, clubs | share card praktycznie dla każdej story | każda scena powinna mieć jeden hero insight |
| **Duolingo Year in Review** | stats → ranking → learner style | identity archetype | kilka share moments | nie tylko „najlepsi” powinni dostać ciekawe wyniki |
| **Strava Year in Sport** | dynamiczne scenes zależne od danych | fitness milestones | native sharing | content może adaptować się do dostępnych danych |
| **Letterboxd Year in Review** | editorial summary + stats | film identity | social sharing | editorial longform może być atrakcyjny |
| **Airbuds** | **current exact flow NOT VERIFIED** | — | — | nie używam do decyzji bez audytu |

Spotify 2025 Wrapped był historią mobilną składającą się z wielu data stories; użytkownik może wracać do konkretnych momentów i udostępniać osobne karty.

Duolingo opublikowało szczególnie wartościowy insight: top 10% użytkowników generowało ponad połowę share'ów, więc firma stworzyła dodatkowe „learner styles”, aby także przeciętni użytkownicy dostawali ciekawy identity moment; druga okazja do share znacząco zwiększyła share rate.

**RECOMMENDATION:** rarity nie może być jedyną shareable rzeczą Name Atlas. Popularne nazwisko nadal musi generować ciekawą historię.

---

# 3. BEHAVIORAL SCIENCE

## Co naprawdę możemy wykorzystać

| Mechanizm | Co rzeczywiście pokazują badania | Fit | Etyczne zastosowanie w Name Atlas | Ryzyko |
|---|---|---:|---|---|
| **Information Gap** | ciekawość wynika z dostrzeżenia konkretnego braku wiedzy | 5/5 | „znamy 2 warianty, znaleźliśmy 7 dalszych” | fake mystery |
| **Self-reference effect** | informacje odnoszące się do „self” są lepiej zapamiętywane | 5/5 | „1 na X osób ma Twoje nazwisko” | przesadne sugerowanie ancestry |
| **Psychological ownership** | ludzie mogą czuć „to jest moje” wobec rzeczy niematerialnych | 5/5 | „Your Name Atlas”, personalized report | sztuczne „raport już należy do Ciebie” |
| **Endowed progress** | postrzegany już rozpoczęty progres może zwiększać persistence | 4/5 | „4 sekcje mają już potwierdzone dane” | fake 80% progress |
| **Goal-gradient** | effort może rosnąć im bliżej widocznego celu | 3/5 | krótki 6-chapter discovery path | wymuszanie długiego onboarding |
| **Anticipation** | oczekiwanie może mieć własną wartość hedoniczną | 4/5 | krótkie controlled reveals | fake loading |
| **Teasing / uncertainty resolution** | stworzenie i późniejsze rozwiązanie uncertainty może poprawić experience | 4/5 | „mapa nie zgadza się z najstarszym śladem → dlaczego?” | użytkownicy często preferują informację od razu |
| **Peak-end rule** | peak i ending mają silny wpływ na retrospective evaluation | 4/5 | peak = historical surprise; end = free summary | manipulacyjne cliffhangery |
| **Commitment / foot-in-door** | mała wcześniejsza zgoda może zwiększyć kolejną | 2/5 | tylko jeśli pytanie realnie poprawia research | używanie pytań wyłącznie dla compliance |
| **Effort / IKEA effect** | własna praca może zwiększać valuation, jeśli kończy się sukcesem | 3/5 | dobrowolne dodanie regionu = lepsza personalizacja | robienie użytkownikowi sztucznej pracy |
| **Ambiguity aversion** | nieokreślona uncertainty może pogarszać decyzje | 5/5 | confidence + sources | tajemnicze „maybe” bez wyjaśnień |
| **Choice architecture** | organizacja opcji wpływa na wybory; efekty defaultów są realne, ale zmienne | 4/5 | aktywne, transparentne wybory | preselected subscription |
| **Novelty** | novelty może poprawiać memory w niektórych warunkach; efekt zależy od kontekstu | 2/5 | jedna nietypowa historyczna informacja | „surprise” dla samego surprise |
| **Narrative transportation** | storytelling może zwiększać involvement | 4/5 | nazwisko jako droga przez miejsce i czas | opowiadanie fikcji zamiast danych |
| **Progressive disclosure** | pokazanie najpierw najważniejszych rzeczy redukuje complexity | 5/5 | one insight per screen | ukrywanie core information pod pretekstem simplicity |

### Najważniejszy behavioral design rule

**RECOMMENDATION**

Nie robimy:

```text
UNKNOWN
↓
UNKNOWN
↓
UNKNOWN
↓
PAY
```

Robimy:

```text
ANSWER
↓
CONTEXT
↓
NEW FACT
↓
CONTRADICTION / EXPANSION
↓
NEW QUESTION
↓
OPTION TO CONTINUE
```

---

# 4. SIX DISCOVERY SEQUENCE MODELS

Oceny poniżej to **HYPOTHESIS / design assessment**, nie dane z A/B testów.

Skala 1–5.

## MODEL A — Utility First

```text
Population
→ Rarity
→ Map
→ Strongest Region
→ Origin
→ Meaning
→ Variants
→ History
```

| Kryterium | Ocena |
|---|---:|
| Speed to value | 5 |
| Curiosity | 4 |
| Trust | 5 |
| Emotional impact | 4 |
| Comprehension | 5 |
| Premium transition | 5 |
| Mobile | 5 |
| Shareability | 5 |
| Overwhelm risk | 1 |

**Plus:** system natychmiast udowadnia, że posiada konkretne dane.

**Minus:** pierwsze 15 sekund jest bardziej statystyczne niż emocjonalne.

---

## MODEL B — Origin First

```text
Probable Origin
→ Meaning
→ Map
→ Population
→ Rarity
→ History
→ Variants
```

| Kryterium | Ocena |
|---|---:|
| Speed to value | 4 |
| Curiosity | 4 |
| Trust | 3 |
| Emotional impact | 5 |
| Comprehension | 4 |
| Premium | 4 |
| Mobile | 5 |
| Shareability | 4 |
| Overwhelm | 2 |

**Problem:** zaczynamy od informacji probabilistycznej. Jeśli origin jest niepewny, pierwsze wrażenie produktu staje się mniej solidne.

---

## MODEL C — Map First

```text
Map
→ Strongest Region
→ Population
→ Rarity
→ Origin
→ Meaning
→ Historical Map
→ Variants
```

| Kryterium | Ocena |
|---|---:|
| Speed | 4 |
| Curiosity | 5 |
| Trust | 4 |
| Emotion | 5 |
| Comprehension | 4 |
| Premium | 5 |
| Mobile | 5 |
| Share | 5 |
| Overwhelm | 2 |

Bardzo dobry dla marki **Atlas**.

Problem: mapa może ładować się wolniej i dla nazwisk rozproszonych być mało spektakularna.

---

## MODEL D — Story First

```text
Meaning
→ Origin
→ Historical Variant
→ Historical Place
→ Map Today
→ Population
→ Rarity
```

| Kryterium | Ocena |
|---|---:|
| Speed | 3 |
| Curiosity | 5 |
| Trust | 3 |
| Emotion | 5 |
| Comprehension | 3 |
| Premium | 5 |
| Mobile | 4 |
| Share | 4 |
| Overwhelm | 3 |

Piękne editorial experience, ale za mało immediate verification.

---

## MODEL E — Identity First

```text
Rarity
→ Population
→ Origin
→ Map
→ Meaning
→ History
→ Variants
```

| Kryterium | Ocena |
|---|---:|
| Speed | 5 |
| Curiosity | 5 |
| Trust | 4 |
| Emotion | 5 |
| Comprehension | 4 |
| Premium | 4 |
| Mobile | 5 |
| Share | 5 |
| Overwhelm | 1 |

Problem: rarity może być bardzo nieciekawe dla niezwykle popularnego nazwiska.

---

## MODEL F — Time Travel

```text
Today: population
→ Map Today
→ Historical Map
→ Old Variant
→ Oldest Available Period
→ Meaning
→ Origin
→ Archive References
```

| Kryterium | Ocena |
|---|---:|
| Speed | 4 |
| Curiosity | 5 |
| Trust | 4 |
| Emotion | 5 |
| Comprehension | 4 |
| Premium | 5 |
| Mobile | 5 |
| Share | 4 |
| Overwhelm | 3 |

Najlepszy storytellingowo.

Problem: wymaga bardzo dobrego historical coverage.

---

# 5. RECOMMENDED SEQUENCE

## Wybrałbym MODEL A + część MODEL F

### Final:

```text
1. Population
2. Rarity
3. Map
4. Strongest region
5. Probable origin
6. Meaning
7. Confidence + source
8. Historical variants
9. Historical geographic clue
10. One historical occurrence / period
11. Free summary
12. Share
13. Discovery Index
14. Optional family region
15. Personalized research preview
16. Premium continuation
```

### Fundamentalna logika

#### 1 → Confirmation
„System faktycznie zna nazwisko.”

#### 2 → Identity
„To nazwisko jest w jakiś sposób moje / charakterystyczne.”

#### 3 → Geography
„Mogę zobaczyć je w świecie.”

#### 4–6 → Interpretation
„Rozumiem, skąd może wynikać ten pattern.”

#### 7 → Trust
„Wiem, czy to fakt czy hipoteza.”

#### 8–10 → Time
„Nazwisko przestaje być statyczne.”

#### 11–12 → Reward
„Dostałem realną wartość.”

#### 13 → Information Gap
„Teraz dokładnie widzę, czego jeszcze nie wiem.”

#### 14 → Personal relevance
„Być może da się przejść od surname history do family history.”

#### 15–16 → Premium
„Płacę za kolejny poziom researchu, nie za odpowiedź, którą mi zabrano.”

---

# 6. FIRST 90 SECONDS

## 0–5 sekund

### User sees
Minimal landing.

> **Każde nazwisko gdzieś się zaczęło.**  
> *Every surname begins somewhere.*

Input.

### User knows
Nic.

### Question
„Co jest o moim nazwisku?”

### Interaction
Surname input → Discover.

### CTA
**Odkryj / Discover**

---

## 5–10 sekund

### User sees
Real analysis state.

Nie loader kołowy „AI magic”.

```text
Checking current distribution        ✓
Comparing linguistic sources         ✓
Looking for historical variants      …
```

Wyłącznie etapy rzeczywiście wykonywane.

### Question
„Czy coś znaleźli?”

### Next
Population.

---

## 10–20 sekund

### Hero

> **[X,XXX] osób nosi dziś to nazwisko w Polsce.**

Small:

`1 na [X,XXX] mieszkańców`

### User now knows
System rzeczywiście ma dane.

### Question
„Czy to dużo?”

### Next
Rarity.

### Interaction
Scroll.

---

## 20–30 sekund

### Full-screen rarity

> **RARITY / RZADKOŚĆ**  
> **87 / 100**

Explanation:

> Rzadsze niż 87% nazwisk w naszej aktualnej polskiej bazie.

**Ważne:** rarity musi mieć jasno zdefiniowaną metodologię.

### Question
„Gdzie ludzie o tym nazwisku mieszkają?”

### Next
Map.

---

## 30–45 sekund

### Full-screen map

Wizualna pauza po dwóch ekranach liczbowych.

Mapę stopniowo wypełnia realna density distribution.

Hero line:

> **Największe skupienie znajduje się w [REGION].**

### Interaction
Tap region.

### Question
„Dlaczego akurat tam?”

### Next
Origin.

---

## 45–60 sekund

### Probable origin

> **Prawdopodobne pochodzenie**  
> [language / region interpretation]

Badge:

`◐ LIKELY / PRAWDOPODOBNE`

Tap:

`Dlaczego tak uważamy?`

### Meaning

Następny short block:

> **Nazwisko mogło wywodzić się od…**

Max 40–60 słów.

### Question
„Czy zawsze tak wyglądało?”

To jest idealny bridge do historii.

---

## 60–75 sekund

### Historical transition

Dzisiejsza pisownia wizualnie przechodzi w jedną historyczną formę.

> **Nie zawsze zapisywano je tak samo.**

Pokazujemy realnie:

`Current form → variant 1 → variant 2`

Small:

`+ X more variants found`

### Question
„Jak daleko to sięga?”

---

## 75–90 sekund

### One historical clue

Np.:

> **W naszych źródłach historycznych wariant nazwiska pojawia się w [okres / region].**

Nie:

> „Twoi przodkowie mieszkali tutaj.”

### Trust line

`Possible surname-level connection — not a verified family link.`

### Then

Mini-summary + optional Share.

I dopiero poniżej:

> **Znaleźliśmy dalsze ślady.**

Discovery Index.

---

# 7. DISCOVERY RHYTHM

Nie projektowałbym tego jako TikTok feed 1:1.

## Rekomendacja: **hybrid vertical narrative**

```text
FACT
↓
FULL-SCREEN VISUAL
↓
INTERPRETATION
↓
TRUST NOTE
↓
SURPRISE
↓
BREATHING SPACE
↓
NEXT CHAPTER
```

### Screen types

| Informacja | Interaction |
|---|---|
| Population | full-screen scroll reveal |
| Rarity | full-screen |
| Map | full-screen interactive |
| Strongest region | overlay on map |
| Origin | normal scroll chapter |
| Meaning | short editorial block |
| Source/confidence | tap-to-expand |
| Variants | controlled horizontal mini-swipe or tap |
| Timeline | vertical scroll |
| Archive source | tap-to-open |
| Discovery Index | stationary overview |
| Personalisation | separate screen |
| Premium preview | swipeable report pages |

### Primary navigation

**Vertical scroll.**

Dlaczego:

- naturalne;
- accessible;
- łatwe do cofnięcia;
- działa z deep-links;
- kompatybilne z web/SEO;
- nie wymaga nauczenia gestu.

### Horizontal swipe

Tylko lokalnie:

- map time layers;
- report preview;
- historical variants.

Nigdy do przechodzenia całej historii.

---

# 8. DISCOVERY WEIGHT SYSTEM

## LEVEL 1 — CONFIRMATION

> „System zna to nazwisko.”

Dane:

- population count;
- existence in official dataset;
- gender split, jeśli istotne;
- current rank.

---

## LEVEL 2 — IDENTITY

> „To coś mówi o tym nazwisku.”

Dane:

- rarity;
- 1 in X;
- relative popularity;
- strongest present region.

---

## LEVEL 3 — CONTEXT

> „Widzę szerszy wzorzec.”

Dane:

- distribution map;
- linguistic origin;
- basic etymology;
- surname formation type;
- common suffix/root.

---

## LEVEL 4 — SURPRISE

> „Nie wiedziałem tego.”

Dane:

- historical spelling;
- unexpected region;
- older geographic concentration;
- different historical alphabet/transliteration;
- diaspora occurrence.

---

## LEVEL 5 — OPEN QUESTION

> „Dlaczego?”

Dane:

- mismatch between historical/current region;
- conflicting etymologies;
- archive reference counts;
- migration clues;
- multiple possible origin places.

---

## LEVEL 6 — PERSONAL

> „Czy to dotyczy mojej rodziny?”

Dane użytkownika:

- family region;
- grandfather's place;
- migration knowledge;
- maiden surname.

---

## LEVEL 7 — RESEARCH

> „Chcę to sprawdzić.”

Dane:

- individual archive candidates;
- birth/marriage/death records;
- specific matching persons;
- relationship hypotheses;
- human verification.

---

# 9. 20 MOMENTS OF DELIGHT

| # | Trigger | Visual | Information | Emotional purpose | Interaction | Risk |
|---|---|---|---|---|---|---|
| 1 | result loads | hero number settles | population | confirmation | scroll | over-animation |
| 2 | rarity available | massive `91/100` | relative rarity | identity | tap explanation | methodology unclear |
| 3 | map loads | dots form Poland | distribution | discovery | tap region | misleading density |
| 4 | region selected | map gently zooms | strongest cluster | place connection | tap | fake precision |
| 5 | origin has strong evidence | 3 source lines converge | region | confidence | open sources | false certainty |
| 6 | meaning found | root highlighted inside surname | linguistic structure | understanding | tap root | linguistic oversimplification |
| 7 | historical variant | letters subtly morph | old spelling | time travel | swipe | gimmick |
| 8 | multiple variants | branches emerge | variants | complexity | expand | clutter |
| 9 | old region differs | map crossfade | historic vs today | surprise | compare | causality assumption |
| 10 | old record period found | timeline extends backwards | date range | depth | scroll | implying surname birth date |
| 11 | source agreement | 3 source markers align | evidence consensus | trust | inspect | sources not independent |
| 12 | source conflict | two paths split | uncertainty | intellectual curiosity | compare | confusion |
| 13 | migration clue | thin line between regions | possible route | story | tap evidence | false family migration |
| 14 | diaspora found | world map expands | foreign presence | scale | explore | sparse data |
| 15 | rare variant | spelling floats beside original | forgotten variant | discovery | save | unverified link |
| 16 | free summary | share card assembles | key facts | ownership | share | too early sales interruption |
| 17 | Discovery Index | counts appear together | depth | „there is more” | open | count inflation |
| 18 | family region entered | generic map narrows | relevance | personal connection | select | privacy |
| 19 | report preview | cover created | personal edition | perceived ownership | swipe | imply report already researched fully |
| 20 | return visit | saved map reopens at previous point | continuity | ownership | continue | privacy/session persistence |

---

# 10. 20 ETHICAL MYSTERY MOMENTS

Mystery powstaje **tylko z realnej niespójności, niekompletności lub rozszerzenia danych**.

| # | Factual condition | Copy | Visual | Next action | Evidence needed |
|---|---|---|---|---|---|
| 1 | historical cluster ≠ modern cluster | „Dzisiejsze skupisko nie jest tym samym, które widzimy w starszych danych.” | two maps | Compare | historical distributions |
| 2 | multiple origin theories | „Źródła prowadzą do dwóch możliwych interpretacji.” | fork | Compare theories | 2 credible sources |
| 3 | many spelling variants | „Nazwisko miało więcej form, niż sugeruje dzisiejsza pisownia.” | variant tree | View variants | validated variants |
| 4 | variant in new region | „Jeden wariant pojawia się poza dzisiejszym głównym regionem.” | map marker | Open | variant + geography |
| 5 | migration signal | „Rozmieszczenie zmienia się w tym okresie.” | before/after | Compare layers | historical density |
| 6 | old record found | „W dostępnych źródłach znajdujemy starszy zapis.” | timeline extension | See source | dated source |
| 7 | etymology/geography align | „Język i geografia wskazują podobny kierunek.” | converging lines | Why? | independent evidence |
| 8 | they conflict | „Język i geografia nie mówią tu dokładnie tego samego.” | split | Understand | distinct evidence |
| 9 | possible locality | „Nazwa miejscowości ma formę zgodną z nazwiskiem.” | map pin | Review relation | toponymic evidence |
| 10 | diaspora | „Poza Polską pojawia się wyraźny drugi cluster.” | world map | Explore | reliable foreign dataset |
| 11 | script shift | „Za granicą nazwisko zmieniało zapis.” | alphabet morph | See transliterations | transliteration rules |
| 12 | archive type clusters | „Większość historycznych odniesień pochodzi z jednego typu źródła.” | source stack | Open collection | record metadata |
| 13 | time gap | „Między dwoma okresami mamy lukę w danych.” | broken timeline | Why gap? | source coverage |
| 14 | rarity anomaly | „Nazwisko jest rzadkie globalnie, ale lokalnie skoncentrowane.” | local density | See region | counts |
| 15 | common surname, narrow origin | „Nazwisko jest dziś częste, lecz jeden region nadal wyróżnia się wyraźnie.” | density | Explore | concentration metric |
| 16 | source mismatch | „Jedno źródło podaje inną interpretację.” | footnote branch | Compare | source |
| 17 | two possible suffix origins | „Końcówka może mieć dwie historyczne funkcje.” | linguistic split | Learn | linguistic sources |
| 18 | records predate expected region data | „Starsze wystąpienia pojawiają się poza dzisiejszym centrum.” | timeline+map | Investigate | dated occurrence |
| 19 | family region overlaps | „Region Twojej rodziny pokrywa się z jednym z historycznych skupisk.” | overlay | Explore family | user input + data |
| 20 | family region doesn't overlap | „Region Twojej rodziny nie pokrywa się z głównym historycznym skupiskiem.” | two points | Explore why | user input + data |

---

# 11. “WE FOUND MORE” SYSTEM — 15 UI FORMATS

| Format | COPY PL | COPY EN | Visual | When | CTA | Trust note |
|---|---|---|---|---|---|---|
| Count | „Znaleźliśmy 8 wariantów historycznych.” | “We found 8 historical variants.” | `08` hero | after variants | Zobacz wszystkie | only verified variant set |
| Timeline extension | „Źródła prowadzą dalej w czasie.” | “The sources go further back.” | line extends | history | Cofnij się dalej | not surname birth |
| Map marker | „Znaleźliśmy 3 możliwe historyczne miejsca.” | “We found 3 possible historical locations.” | 3 unlabeled dots | geography | Poznaj miejsca | possible |
| Archive stack | „11 odniesień w kolekcjach archiwalnych.” | “11 references across archive collections.” | paper edges | pre-premium | Otwórz indeks | surname-level |
| Source stack | „6 źródeł zawiera użyteczne dane.” | “6 sources contain useful evidence.” | source spines | trust | Zobacz źródła | define sources |
| Variant fork | „Jedna forma prowadzi do innego regionu.” | “One variant points toward a different region.” | branch | history | Zobacz ślad | hypothesis |
| Historical layer | „Mapa ma starsze warstwy.” | “There are older layers to this map.” | stacked maps | map exit | Cofnij mapę | data dates |
| Migration route | „W danych widać możliwą zmianę geograficzną.” | “The data suggests a possible geographic shift.” | dotted route | history | Zobacz okres | not family migration |
| Evidence cluster | „Trzy źródła wskazują podobny region.” | “Three sources point toward a similar region.” | convergence | origin | Dlaczego? | source independence |
| Research Index | „Twój wynik otworzył 5 dalszych kierunków researchu.” | “Your result opened 5 further research paths.” | numbered index | summary | Zobacz zakres | real paths |
| Chapter preview | „Kolejny rozdział: miejsca historyczne.” | “Next chapter: historical places.” | chapter title | transition | Kontynuuj | no fake lock |
| Partial chronology | „Znamy teraźniejszość. Historyczna oś jest dłuższa.” | “We know the present. The historical timeline goes further.” | chronology | history | Otwórz timeline | evidence-backed |
| Coverage | „Mamy dane dla 6 z 8 sekcji Atlasu.” | “We have usable data for 6 of 8 Atlas sections.” | chapter ticks | prepaywall | Zobacz zakres | coverage not progress |
| Place cluster | „Dwa z możliwych miejsc leżą blisko siebie.” | “Two possible origin places sit close together.” | map cluster | origin | Explore | no causal claim |
| Family prompt | „Możemy teraz sprawdzić, czy któryś ślad pasuje do regionu Twojej rodziny.” | “We can now check whether any of these clues align with your family’s region.” | map + prompt | before paid | Zawęź wynik | user chooses |

---

# 12. NO-DATA / ZERO-RESULT FLOW

Coverage musi być **dynamiczne**, jak Strava czy Wrapped: nie każdy użytkownik powinien dostawać identyczną liczbę scen.

## A. Bardzo bogate nazwisko

Pokazujemy:

- population;
- map;
- origin;
- variants;
- history;
- archive index;
- migration;
- multiple hypotheses.

**Premium value:** organization + full evidence + deeper chronology.

---

## B. Średnie coverage

Np.:

- population ✓
- map ✓
- meaning ✓
- origin ✓
- 2 variants ✓
- archive sparse.

Nie mówimy:

> „11 records found.”

Mówimy:

> **„Mamy mocny współczesny profil i częściową historię. W archiwach dostępnych jest mniej materiału.”**

Premium może być tańsze / inny product.

---

## C. Mało danych

Free result oparty na:

- current distribution;
- rarity;
- linguistic analysis;
- international occurrence.

CTA:

> **Pomóż nam zawęzić search: znasz region rodziny?**

Nie generujemy „mystery”.

---

## D. Bardzo rzadkie nazwisko

Rarity = hero.

Ale statystyki mogą być wrażliwe / suppressed przy bardzo małych counts.

Flow:

```text
Rare
→ possible variants
→ spelling / transliteration
→ regional family input
→ deeper research request
```

---

## E. Bardzo popularne nazwisko

Nie możemy bazować na rarity.

Hero:

> **Jedno z szerzej rozpowszechnionych nazwisk — ale jego geografia nadal nie jest równomierna.**

Focus:

- density;
- regional concentration;
- etymology;
- multiple independent family origins.

---

## F. Nazwisko imigracyjne

Nie wciskamy go w polską etymologię.

Prompt:

> **To nazwisko prawdopodobnie ma silniejsze źródła poza Polską. Który kraj chcesz zbadać jako pierwszy?**

---

## G. Niejednoznaczna etymologia

To nie problem — to potencjalnie najlepszy curiosity moment.

```text
Interpretation A — LIKELY
Interpretation B — POSSIBLE
```

> „Źródła nie dają jednej bezsporne odpowiedzi.”

---

## H. System prawie nie zna nazwiska

Nie generujemy AI filler.

> **Nie mamy jeszcze wystarczających danych, żeby wiarygodnie opisać pochodzenie tego nazwiska.**

Następnie:

1. spelling;
2. diacritics;
3. transliteration;
4. country;
5. family region;
6. research request.

---

## ZERO RESULT

### Screen 1

> **Nie znaleźliśmy wystarczająco pewnego wyniku.**  
> *We don’t have enough reliable evidence yet.*

Nie:

> „Surname not found.”

### Screen 2 — spelling assistant

System pokazuje wyłącznie realne fuzzy matches:

> Czy chodziło o:

`Variant A`  
`Variant B`

### Screen 3 — transliteration

Jeżeli wykryto możliwy alfabet:

> **Czy nazwisko mogło być wcześniej zapisywane cyrylicą / innym alfabetem?**

### Screen 4 — country

> **Z jakim krajem najbardziej kojarzy się Twoja rodzina?**

Optional.

### Screen 5 — region

> **Znasz choć przybliżony region?**

### Screen 6

Jeśli dalej brak:

> **Możesz zapisać nazwisko do głębszego researchu.**

To jest właściwy moment na human/deep research lead.

---

# 13. TRUST INTERRUPTS

Nie robimy disclaimer-wall.

## Trust Interrupt #1 — po origin

Small line:

`◐ LIKELY`

`Why this interpretation? →`

## #2 — przy pierwszym historical clue

> **Surname-level evidence**  
> Ten zapis dotyczy nazwiska, nie potwierdzonego przodka.

## #3 — przy conflicting evidence

> **Two plausible interpretations**

Nie ukrywamy konfliktu.

## #4 — przed archive references

> Potencjalny rekord o tym samym nazwisku nie oznacza automatycznie pokrewieństwa.

## #5 — pre-premium

> **Coverage for this surname:**  
> strong / partial / limited

Użytkownik wie, co kupuje.

---

# 14. SHARE MOMENT — KIEDY?

| Moment | Plus | Minus | Growth | Conversion risk |
|---|---|---|---:|---:|
| A. po rarity | bardzo szybko | za mało value | wysoki | średni |
| B. po mapie | visually strong | brakuje meaning | wysoki | średni |
| C. po origin | bardziej complete | później | dobry | niski |
| D. po mini-summary | pełna identity card | wymaga 60 s | **bardzo dobry** | **niski** |
| E. przed info gap | naturalna pauza | może odciągnąć | **najlepszy** | niski |
| F. po info gap | curiosity może zostać przerwana | bardziej sprzedażowe | dobry | wyższy |

## RECOMMENDATION

### D/E — po darmowym mini-summary, bezpośrednio przed Discovery Index.

Kolejność:

```text
FREE VALUE COMPLETE
↓
YOUR NAME CARD
↓
SHARE / SAVE
↓
“WE ALSO FOUND…”
```

To daje użytkownikowi możliwość wyjścia **z czymś wartościowym**, zanim pokażemy premium depth.

---

# 15. PERSONALISATION MOMENT

| Moment | Value | Friction | Privacy | Relevance | Ocena |
|---|---:|---:|---:|---:|---:|
| przed wynikami | 2 | 5 | 5 | 3 | słabo |
| po mapie | 3 | 3 | 3 | 4 | średnio |
| po origin | 4 | 3 | 3 | 4 | dobrze |
| **po Discovery Index / przed premium** | **5** | **2** | **2** | **5** | **najlepiej** |
| dopiero po purchase | 5 | 0 dla conversion | 1 | 5 | dobre dla paid research |

## RECOMMENDATION

Pierwsze pytanie dopiero po free journey:

> **Z jakim regionem najbardziej kojarzy się Twoja rodzina?**

Options:

- wybierz region;
- inny kraj;
- **nie wiem**.

### Dlaczego wtedy?

Użytkownik właśnie zobaczył mapę i historical places.

Rozumie **po co pytamy**.

Nie wygląda to jak harvesting danych.

---

# 16. EMAIL MOMENT

| Moment | Ocena |
|---|---|
| po first reveal | za wcześnie |
| po free result | dobre |
| po share | dobre |
| przed Discovery Index | rozbija narrację |
| po Discovery Index | **bardzo dobre** |
| przed premium | dobre, ale może wyglądać jak gate |
| po paywall | za późno dla recovery |
| tylko purchase | za mało lead capture |

## Rekomendacja

Secondary action po Discovery Index:

> **Zapisz swój Atlas**  
> *Save your Atlas*

Email **nie jest wymagany**.

Copy:

> Wyślemy Ci link do tego wyniku. Bez zakładania konta.

---

# 17. 10 PREMIUM TRANSITION PATTERNS

## 1. Timeline Continues

Free timeline kończy się na np. dwóch historycznych points.

Dalsza linia jest widoczna jako **zakres**, nie blur.

> **Źródła prowadzą dalej.**

CTA:

**Otwórz pełną chronologię**

---

## 2. Historical Map Layers

```text
Today        OPEN
1950         AVAILABLE
1900         AVAILABLE
Earlier      PARTIAL
```

CTA:

**Cofnij mapę**

---

## 3. Research Index

```text
Historical variants     8
Possible places         4
Archive references     11
Migration clues         3
```

CTA:

**Otwórz cały indeks**

Najlepszy MVP.

---

## 4. Source Shelf

Editorial „spines”:

```text
Population data
Onomastic dictionary
Historical index
Migration collection
Archive catalog
```

Nie pokazujemy fake document thumbnails.

CTA:

**Zobacz, co mówią źródła**

---

## 5. Variant Expansion

```text
Modern form
├─ variant A
├─ variant B
├─ +6 historical forms
```

CTA:

**Prześledź ewolucję**

---

## 6. Historical Chapter

Large editorial break:

> **CHAPTER IV  
> BEFORE THE MODERN MAP**

CTA:

**Kontynuuj historię**

Nie price-led.

---

## 7. Family Question

> **Historia nazwiska to jedno. Historia Twojej rodziny może być inna.**

CTA:

**Sprawdź region mojej rodziny**

To prowadzi do Paid 2, nie koniecznie Paid 1.

---

## 8. Research Coverage

```text
Surname-level coverage

Current data       STRONG
Origin             STRONG
History            MODERATE
Archive references AVAILABLE
Family link        REQUIRES FAMILY DATA
```

CTA:

**Otwórz Research Edition**

Najlepszy trust-led.

---

## 9. Personalized Edition

Pokazujemy okładkę:

```text
NAME ATLAS

[YOUR SURNAME]

ORIGIN
PLACES
HISTORY
ARCHIVES

RESEARCH EDITION
```

CTA:

**Otwórz moją edycję**

---

## 10. Evidence Comparison

Free conclusion:

> Probable origin: [region]

Premium teaser:

> **3 sources support this interpretation. 1 points elsewhere.**

CTA:

**Porównaj dowody**

Bardzo mocne dla credibility.

---

# 18. SCROLL VS SWIPE VS TAP

| Model | Learnability | Accessibility | Engagement | Historical comprehension | Share | Premium |
|---|---:|---:|---:|---:|---:|---:|
| A. vertical story | 5 | 5 | 4 | 5 | 4 | 5 |
| B. TikTok screens | 5 | 3 | 5 | 3 | 5 | 4 |
| C. horizontal chapters | 3 | 3 | 4 | 4 | 4 | 4 |
| D. **hybrid** | **5** | **5** | **5** | **5** | **5** | **5** |
| E. map-led | 3 | 3 | 5 | 4 | 5 | 4 |
| F. card-stack | 4 | 4 | 4 | 3 | 5 | 4 |

## RECOMMENDATION

**D. Hybrid**

- overall vertical scroll;
- full-screen hero moments;
- tap for evidence;
- map interaction;
- horizontal swipe only inside bounded modules;
- no forced scroll snapping.

---

# 19. RESULT PAGE ARCHITECTURES

## ARCHITECTURE A — Narrative Journey

```text
Today
↓
Place
↓
Meaning
↓
Past
↓
Evidence
↓
Family
```

### Mobile
Continuous vertical.

### Desktop
Centered editorial column, maps can break grid.

### Navigation
Progress dots → later chapter rail.

### Return
Returns to last viewed chapter.

### Deep-link
`/surname/[slug]/history`

### SEO
Strong if SSR headings exist.

### Premium
Natural narrative cliff between chapters.

**Best for first-time experience.**

---

## ARCHITECTURE B — Atlas Chapters

```text
Overview
01 Today
02 Geography
03 Origin
04 Meaning
05 Through Time
06 Archives
07 Family
```

### Mobile
Scrollable chapter index + page content.

### Desktop
Persistent left rail.

### Navigation
Very strong.

### Return
Excellent.

### Deep linking
Excellent.

### SEO
**Best.**

### Premium
Locked/unavailable chapters can show coverage.

**Best for long-term product architecture.**

---

## ARCHITECTURE C — Map + Story

Map fixed at top/half.

Narrative underneath changes map state.

### Mobile
Map 45% screen, story bottom sheet.

### Desktop
Map left / narrative right.

### Strength
Outstanding geography.

### Weakness
Meaning, linguistics and archives become subordinate.

### Premium
Historical map layers are natural upsell.

---

## RECOMMENDATION

Use:

### First session
**Architecture A**

but underlying information architecture:

### Persistent product
**Architecture B**

In other words:

> first visit = guided story  
> return visit = atlas you can navigate.

---

# 20. DATA DENSITY

## Mobile recommendations

### One screen

**1 primary insight.**

Maximum:

- 1 hero number; or
- 1 map; or
- 1 chart;
- + 1 short interpretation;
- + 1 optional source control.

### Numbers

Hero number can take ~25–35% vertical area.

Example:

```text
2,418
people
```

### Text

Primary explanation:

**25–60 words.**

Deep interpretation behind:

`Read more`

### Charts

Never more than **one main chart** per mobile viewport.

### Map

Map should take:

**60–80% viewport height**

when it is the chapter hero.

### Labels

No dense choropleth legends.

Direct label major regions.

### Sources

Inline:

`Source · 2026 population data →`

Not long bibliography.

---

# 21. ANIMATION LOGIC

Animation zawsze musi tłumaczyć zmianę danych.

| Element | Motion | Duration | Purpose | Reduced motion |
|---|---|---:|---|---|
| population | count settles once | 400–600 ms | scale | static number |
| rarity | ring/line fills | 500 ms | relative position | instant state |
| map | points fade/group | 600–900 ms | spatial distribution | static final map |
| region | subtle focus/zoom | 400 ms | location | outline highlight |
| origin | source lines converge | 400–600 ms | evidence relation | static |
| variant | glyph crossfade/morph | 450–650 ms | spelling evolution | side-by-side text |
| timeline | line extends on scroll | 600 ms | temporal direction | full line visible |
| archive | card slides 8–12 px | 250–350 ms | reveal hierarchy | fade |
| migration | route draws | 700–900 ms | movement hypothesis | dotted static path |
| chapter transition | gentle opacity/translate | 250–400 ms | orientation | instant change |

### Nigdy

- slot-machine numbers;
- random particles;
- fake database scan;
- fake typing;
- 3D camera rotations;
- parallax required to understand data.

---

# 22. COPY SYSTEM

## 20 FIRST REVEAL LINES

| PL | EN |
|---|---|
| Znaleźliśmy to nazwisko w naszych danych. | We found this surname in our data. |
| Zacznijmy od tego, jak wygląda dziś. | Let’s start with where the surname stands today. |
| Oto pierwszy obraz Twojego nazwiska. | Here’s the first view of your surname. |
| To nazwisko ma wyraźny ślad w Polsce. | This surname has a clear footprint in Poland. |
| Sprawdziliśmy jego współczesne występowanie. | We checked its current distribution. |
| Pierwsza rzecz, którą warto zobaczyć: skala. | First, let’s look at its scale. |
| Oto jak często występuje dziś. | Here’s how often the surname appears today. |
| Zaczynamy od danych współczesnych. | We’ll begin with the present-day data. |
| To nazwisko jest rzadsze, niż mogłoby się wydawać. | This surname is rarer than it may seem. |
| To nazwisko jest dziś szeroko rozpowszechnione. | This surname is widespread today. |
| W Polsce nosi je obecnie [X] osób. | Today, [X] people in Poland carry this surname. |
| Dzisiejsza mapa daje nam pierwszy trop. | Today’s map gives us the first clue. |
| Współczesne dane pokazują wyraźny wzorzec. | The modern data shows a clear pattern. |
| Pierwszy ślad jest geograficzny. | The first clue is geographic. |
| To tutaj nazwisko pojawia się najczęściej. | This is where the surname appears most often. |
| Twoje nazwisko ma własną geografię. | Your surname has a geography of its own. |
| Najpierw teraźniejszość. Za chwilę cofniemy się w czasie. | First the present. Then we’ll go back in time. |
| Mamy wystarczające dane, by zbudować pierwszy obraz. | We have enough data to build the first picture. |
| Oto punkt początkowy Atlasu. | This is where the Atlas begins. |
| Pierwsza warstwa jest gotowa. | The first layer is ready. |

---

## 20 NEXT DISCOVERY LINES

| PL | EN |
|---|---|
| Teraz zobaczmy, gdzie nazwisko występuje najczęściej. | Now let’s see where the surname appears most often. |
| Sama liczba nie mówi wszystkiego. | The number is only part of the picture. |
| Geografia pokazuje więcej. | Geography tells us more. |
| Ten regionalny wzorzec prowadzi do kolejnego pytania. | This regional pattern raises another question. |
| Sprawdźmy, czy język i mapa wskazują ten sam kierunek. | Let’s see whether language and geography point the same way. |
| Mapa daje jeden trop. Etymologia daje drugi. | The map gives one clue. Etymology gives another. |
| Kolejna warstwa dotyczy znaczenia nazwiska. | The next layer is about meaning. |
| Teraz przechodzimy od „gdzie” do „dlaczego”. | Now we move from where to why. |
| Współczesny obraz jest jasny. Historia jest bardziej złożona. | The modern picture is clear. The history is more complex. |
| Cofnijmy się o krok. | Let’s go one step back. |
| Dzisiejsza pisownia nie jest jedyną. | The modern spelling isn’t the only one. |
| Starsze źródła pokazują inny obraz. | Older sources show a different picture. |
| To właśnie tutaj historia staje się ciekawsza. | This is where the story becomes more interesting. |
| Kolejny trop pochodzi z wcześniejszego okresu. | The next clue comes from an earlier period. |
| Pojawia się pierwsza różnica między dziś a kiedyś. | Here’s the first difference between today and the past. |
| W danych historycznych widać nowy kierunek. | The historical data points in a new direction. |
| Mamy jeszcze jedną warstwę do porównania. | There’s another layer to compare. |
| Zobaczmy, czy wzorzec utrzymuje się w czasie. | Let’s see whether the pattern holds over time. |
| Kolejna informacja pochodzi z innego rodzaju źródła. | The next insight comes from a different kind of source. |
| Teraz łączymy mapę, język i historię. | Now we connect geography, language and history. |

---

## 20 HISTORICAL TRANSITION LINES

| PL | EN |
|---|---|
| Nazwiska zmieniają się razem z językiem. | Surnames change with language. |
| Dzisiejsza pisownia jest tylko najnowszą warstwą. | Today’s spelling is only the latest layer. |
| Starsze dokumenty zapisywały to nazwisko inaczej. | Older records spelled this surname differently. |
| Cofnijmy mapę. | Let’s move the map back in time. |
| W przeszłości rozkład wyglądał inaczej. | The distribution looked different in the past. |
| Historia nazwiska nie jest linią prostą. | A surname’s history is rarely a straight line. |
| Jeden wariant prowadzi do wcześniejszego okresu. | One variant leads to an earlier period. |
| Tutaj pojawia się starsza forma. | An older form appears here. |
| Teraz opuszczamy dane współczesne. | We’re leaving the modern data behind. |
| Kolejne informacje pochodzą ze źródeł historycznych. | The next findings come from historical sources. |
| W tym miejscu teraźniejszość spotyka się z archiwum. | This is where the present meets the archive. |
| Starsze źródła rozszerzają geografię nazwiska. | Older sources widen the surname’s geography. |
| W tym okresie zaczyna zmieniać się pisownia. | The spelling begins to shift in this period. |
| Pojawia się pierwszy historyczny punkt odniesienia. | Here is the first historical reference point. |
| Możemy teraz porównać dwa okresy. | We can now compare two periods. |
| Ten ślad jest starszy od współczesnych danych o rozmieszczeniu. | This trace predates the modern distribution data. |
| Historia prowadzi poza dzisiejszy główny region. | The historical trail moves beyond today’s main region. |
| W archiwach nazwisko zaczyna przyjmować inne formy. | In the archives, the surname starts taking different forms. |
| To jeszcze nie historia konkretnej rodziny — ale to już historia nazwiska. | This is not yet one family’s history—but it is the surname’s history. |
| Dalej zaczynają się źródła archiwalne. | Beyond this point, the archival sources begin. |

---

## 20 CURIOSITY LINES

| PL | EN |
|---|---|
| Współczesna mapa nie wyjaśnia wszystkiego. | The modern map doesn’t explain everything. |
| Starsze źródła wskazują nieco inny kierunek. | Older sources point in a slightly different direction. |
| Znaleźliśmy więcej niż jedną możliwą interpretację. | We found more than one plausible interpretation. |
| Jeden wariant pojawia się w innym regionie. | One variant appears in a different region. |
| Język i geografia nie są tu całkowicie zgodne. | Language and geography don’t fully agree here. |
| Trzy źródła wskazują podobne miejsce. | Three sources point toward a similar place. |
| W historii nazwiska pozostaje luka. | There is a gap in the surname’s history. |
| Jeden okres wyróżnia się szczególnie. | One period stands out. |
| Znaleźliśmy dodatkowe historyczne formy. | We found additional historical forms. |
| Nazwisko pojawia się także poza dzisiejszym głównym obszarem. | The surname also appears beyond its modern core area. |
| Jedna miejscowość wraca w więcej niż jednym źródle. | One location appears in more than one source. |
| Starsze dane zmieniają obraz, który widzieliśmy na początku. | Older data changes the picture we saw at first. |
| Mamy kilka śladów, ale nie wszystkie są równie mocne. | We have several clues, but they’re not equally strong. |
| Jedna interpretacja ma wyraźnie więcej wsparcia. | One interpretation has notably stronger support. |
| Zidentyfikowaliśmy kilka kierunków dalszego researchu. | We identified several paths for deeper research. |
| To nazwisko ma więcej niż jedną historyczną warstwę. | This surname has more than one historical layer. |
| Dalej zaczynają się dane, których nie widać w dzisiejszych statystykach. | Beyond this point are details modern statistics can’t show. |
| Mamy źródła, których jeszcze nie połączyliśmy z konkretną rodziną. | We have sources that are not yet linked to a specific family. |
| To właśnie tutaj surname research może przejść w family research. | This is where surname research can become family research. |
| Jest jeszcze jedno pytanie: czy któryś z tych śladów dotyczy Twojej gałęzi? | One question remains: could any of these clues belong to your family branch? |

---

## 15 PERSONALISATION LINES

| PL | EN |
|---|---|
| Chcesz zawęzić te wyniki do swojej rodziny? | Want to narrow these results to your family? |
| Z jakim regionem najbardziej kojarzy się Twoja rodzina? | Which region is your family most connected to? |
| Nie musisz znać dokładnej miejscowości. | You don’t need to know the exact town. |
| Przybliżony region wystarczy na początek. | An approximate region is enough to begin. |
| Nie wiesz? To również jest poprawna odpowiedź. | Not sure? That’s completely fine. |
| Ta informacja pomoże nam uporządkować historyczne tropy. | This will help us prioritize the historical clues. |
| Czy ktoś w rodzinie wyemigrował? | Did anyone in your family emigrate? |
| Czy rodzina mieszkała poza Polską? | Did your family live outside Poland? |
| Znasz rodzinny region sprzed dwóch pokoleń? | Do you know your family’s region two generations back? |
| Możemy porównać go z historycznym rozmieszczeniem. | We can compare it with the historical distribution. |
| To pytanie jest opcjonalne. | This question is optional. |
| Nie używamy tej informacji do zmiany faktów — tylko do zawężenia searchu. | We won’t use this to change the facts—only to narrow the search. |
| Twoja odpowiedź może pomóc oddzielić różne gałęzie nazwiska. | Your answer may help separate different surname branches. |
| Nazwisko może mieć kilka niezależnych historii. | The same surname can have several independent histories. |
| Zobaczmy, która z nich najlepiej pasuje do znanej historii Twojej rodziny. | Let’s see which one best aligns with what you know about your family. |

---

## 20 PREMIUM TRANSITION LINES

| PL | EN |
|---|---|
| Pierwszy rozdział kończy się tutaj. Dalsze są już w źródłach historycznych. | The first chapter ends here. The next ones begin in the historical sources. |
| Zobaczyłeś dzisiejszą mapę. Możemy teraz cofnąć ją dalej. | You’ve seen today’s map. We can now take it further back. |
| Pełny Atlas łączy wszystkie odnalezione warstwy. | The full Atlas connects every layer we found. |
| Dalej przechodzimy od wyniku do researchu. | Beyond this point, we move from results to research. |
| Możemy teraz otworzyć historyczne miejsca i źródła. | We can now open the historical places and sources. |
| Znaleźliśmy materiał do kolejnych rozdziałów. | We found material for the next chapters. |
| Kolejne odkrycia wymagają połączenia kilku źródeł. | The next findings require several sources to be connected. |
| Otwórz pełną chronologię nazwiska. | Open the full surname chronology. |
| Zobacz wszystkie historyczne warianty. | View every historical variant we found. |
| Otwórz starsze warstwy mapy. | Open the older map layers. |
| Zobacz pełny indeks źródeł. | Open the full source index. |
| Przejdź od mapy do archiwów. | Go from the map to the archives. |
| Zobacz research stojący za tym wynikiem. | See the research behind this result. |
| Otwórz pełną Research Edition. | Open the full Research Edition. |
| Sprawdź, gdzie kończą się fakty, a zaczynają hipotezy. | See where evidence ends and hypotheses begin. |
| Zobacz wszystkie miejsca, które znaleźliśmy. | Explore every place we identified. |
| Historia nazwiska jest gotowa do rozwinięcia. | The surname’s history is ready to unfold further. |
| Kolejny etap to archiwa i dawne rozmieszczenie. | The next stage covers archives and historical distribution. |
| Możesz zatrzymać się tutaj albo kontynuować research. | You can stop here or continue the research. |
| Jeśli chcesz pójść dalej, pełny Atlas jest gotowy. | If you want to go further, the full Atlas is ready. |

---

## 15 NO-DATA LINES

| PL | EN |
|---|---|
| Nie mamy jeszcze wystarczających danych, żeby wyciągnąć wiarygodny wniosek. | We don’t have enough evidence yet to draw a reliable conclusion. |
| To nazwisko jest słabo reprezentowane w dostępnych źródłach. | This surname is sparsely represented in the sources available to us. |
| Brak mocnego wyniku jest również ważną informacją. | A lack of strong evidence is also meaningful. |
| Nie chcemy zgadywać tam, gdzie źródła milczą. | We won’t guess where the sources are silent. |
| Możemy spróbować innej pisowni. | We can try another spelling. |
| Sprawdźmy historyczne warianty zapisu. | Let’s check historical spelling variants. |
| Nazwisko mogło zostać przetransliterowane. | The surname may have been transliterated. |
| Możemy rozszerzyć search poza Polskę. | We can broaden the search beyond Poland. |
| Znasz kraj, z którym wiąże się rodzina? | Do you know which country your family is connected to? |
| Znasz choć przybliżony region? | Do you know an approximate region? |
| Nie znaleźliśmy wiarygodnej etymologii. | We didn’t find a reliable etymology. |
| Źródła podają sprzeczne interpretacje. | The sources give conflicting interpretations. |
| Nie znaleźliśmy historycznych wystąpień w obecnym zakresie danych. | We found no historical occurrences in the sources currently covered. |
| To dobry przypadek do głębszego researchu, nie do automatycznego zgadywania. | This is a case for deeper research, not automatic guesswork. |
| Możesz zapisać nazwisko i wrócić, gdy rozszerzymy źródła. | You can save the surname and return as our source coverage grows. |

---

# 23. 20+ SCREEN MOBILE WIREFLOW

## SCREEN 01 — Landing
**Goal:** surname input  
**Data:** none  
**Copy:** „Każde nazwisko gdzieś się zaczęło.”  
**CTA:** Odkryj  
**Secondary:** none  
**Interaction:** type  
**Animation:** subtle static map signal  
**Trust:** methodology link footer  
**Next:** 02  
**Premium:** none

## SCREEN 02 — Query Check
**Goal:** verify normalized surname  
**Data:** user query  
**Copy:** exact typed form  
**CTA:** Continue only if spelling ambiguity exists  
**Interaction:** choose variant if required  
**Next:** 03

Skip entirely for clean matches.

## SCREEN 03 — Analysis
**Goal:** communicate actual work  
**Data:** real backend stages  
**Copy:** current distribution / linguistic sources / variants  
**CTA:** none  
**Animation:** status changes only  
**Trust:** no fake steps  
**Next:** 04

## SCREEN 04 — Population
**Goal:** first value  
**Data:** count + date  
**Copy:** `[X] people carry this surname`  
**Primary:** scroll  
**Source:** dataset/date  
**Premium:** none

## SCREEN 05 — Frequency
**Goal:** make count understandable  
**Data:** 1 in X  
**Copy:** `1 in [X]`  
**Next:** rarity

## SCREEN 06 — Rarity
**Goal:** identity  
**Data:** rarity score/percentile  
**Copy:** explanation of methodology  
**Secondary:** How calculated?  
**Premium:** none

## SCREEN 07 — Map
**Goal:** spatial discovery  
**Data:** distribution  
**Interaction:** tap regions  
**Animation:** points/density reveal  
**Alternative:** textual ranked regions  
**Next:** 08

## SCREEN 08 — Strongest Region
**Goal:** turn map into insight  
**Data:** region + relative concentration  
**Copy:** „Najsilniejsze skupisko…”  
**CTA:** Why here?  
**Next:** 09

## SCREEN 09 — Origin
**Goal:** interpret geography/language  
**Data:** probable origin  
**Confidence:** mandatory  
**CTA:** Why we think this  
**Next:** 10

## SCREEN 10 — Meaning
**Goal:** answer semantic question  
**Data:** etymology  
**Copy:** 25–60 words  
**Secondary:** Read more  
**Source:** directly visible  
**Next:** 11

## SCREEN 11 — Evidence
**Goal:** trust interrupt  
**Data:** source list + confidence  
**Interaction:** expandable  
**Copy:** „3 sources support…”  
**Next:** 12

## SCREEN 12 — History Bridge
**Goal:** open temporal dimension  
**Copy:** „Dzisiejsza pisownia jest tylko najnowszą warstwą.”  
**Visual:** current spelling  
**Next:** 13

## SCREEN 13 — Historical Variants
**Goal:** first historical surprise  
**Data:** 1–2 free variants + total count  
**Interaction:** tap/morph  
**Premium:** additional variants can be in full report  
**Next:** 14

## SCREEN 14 — Historical Geography
**Goal:** show change over time  
**Data:** one historic region/place if evidence exists  
**Visual:** current map crossfades with historical  
**Trust:** surname-level caveat  
**Next:** 15

## SCREEN 15 — Historical Occurrence
**Goal:** deeper clue  
**Data:** period/source type  
**Copy:** carefully qualified  
**Premium:** full record/index withheld only if product scope says so  
**Next:** 16

## SCREEN 16 — Free Summary
**Goal:** close first chapter satisfactorily  
**Data:** 4 key facts  
**Visual:** shareable portrait card  
**Primary:** Continue  
**Secondary:** Share / Save  
**Next:** 17

## SCREEN 17 — Share
**Goal:** acquisition  
**Optional.** Never forced.  
**Data:** only already-free facts  
**CTA:** Instagram / TikTok export / copy link  
**Next:** 18

## SCREEN 18 — Discovery Index
**Goal:** create legitimate information gap  
**Data:** actual coverage counts  
**Copy:** `We also found…`  
**Primary:** See further discoveries  
**Secondary:** Save Atlas  
**Premium:** first clear premium curiosity

## SCREEN 19 — Personalisation Offer
**Goal:** explain why one extra input can help  
**Copy:** „Możemy zawęzić część tych śladów do znanego regionu Twojej rodziny.”  
**Primary:** Narrow results  
**Secondary:** Skip  
**Next:** 20/22

## SCREEN 20 — Region Question
**Goal:** collect one low-friction family clue  
**Data:** user-entered region/country  
**Interaction:** search/select  
**Privacy:** clear why  
**Next:** 21

## SCREEN 21 — Personalised Alignment
**Goal:** show consequence of input  
**Data:** overlap/non-overlap with historical patterns  
**Copy:** exact, not deterministic  
**Next:** 22

## SCREEN 22 — Report Cover
**Goal:** psychological ownership / tangible preview  
**Visual:** personalized editorial cover  
**Copy:** `NAME ATLAS — [YOUR SURNAME] — Research Edition`  
**Primary:** Preview  
**Next:** 23

## SCREEN 23 — Report Scope
**Goal:** show exact value  
**Data:** chapters + counts + coverage  
**No blur.**  
**CTA:** Open research  
**Trust:** strong/partial/limited coverage  
**Next:** 24

## SCREEN 24 — Evidence Preview
**Goal:** prove report is substantive  
**Data:** source categories + sample page structure  
**Secondary:** sample full report  
**Next:** 25

## SCREEN 25 — Premium Transition
**Goal:** decision  
**Headline:** „Otwórz dalsze rozdziały Atlasu.”  
**Data:** exactly what will be unlocked  
**CTA:** Continue to report offer  
**Trust:** one-time payment / coverage / methodology  
**Next:** paywall entry

---

# 24. ASCII WIREFRAMES

## Hero

```text
┌───────────────────────────────┐
│ NAME ATLAS             PL ▾   │
│                               │
│                               │
│ Każde nazwisko                │
│ gdzieś się zaczęło.           │
│                               │
│ ┌───────────────────────────┐ │
│ │ Wpisz nazwisko          → │ │
│ └───────────────────────────┘ │
│                               │
│ Origin · Place · History      │
│                               │
└───────────────────────────────┘
```

## First reveal

```text
┌───────────────────────────────┐
│ 01 / TODAY                    │
│                               │
│ [YOUR SURNAME]                │
│                               │
│                               │
│          X,XXX                │
│                               │
│       people in Poland        │
│                               │
│       1 in X,XXX              │
│                               │
│ Source · 2026              ↓  │
└───────────────────────────────┘
```

## Rarity

```text
┌───────────────────────────────┐
│ RARITY                        │
│                               │
│             87                │
│             ──                │
│            100                │
│                               │
│ Rarer than 87% of surnames    │
│ in the current dataset.       │
│                               │
│ How we calculate this →       │
└───────────────────────────────┘
```

## Map

```text
┌───────────────────────────────┐
│ WHERE IT LIVES TODAY          │
│                               │
│          · ••                 │
│       •••   ·                 │
│      •  POLAND •              │
│         •••••                 │
│                               │
│ Strongest concentration       │
│ [REGION]                      │
│                               │
│ Explore regions →             │
└───────────────────────────────┘
```

## Origin

```text
┌───────────────────────────────┐
│ PROBABLE ORIGIN               │
│                               │
│ [REGION / LANGUAGE]           │
│                               │
│ ◐ LIKELY                      │
│                               │
│ Short explanation...          │
│                               │
│ Why we think this →           │
│ Sources →                     │
└───────────────────────────────┘
```

## History

```text
┌───────────────────────────────┐
│ THROUGH TIME                  │
│                               │
│ Modern form                   │
│      ↓                        │
│ Historical variant           │
│      ↓                        │
│ Earlier variant              │
│                               │
│ + X additional forms found   │
│                               │
│ Continue ↓                    │
└───────────────────────────────┘
```

## Discovery Index

```text
┌───────────────────────────────┐
│ WE ALSO FOUND                 │
│                               │
│  08  Historical variants     │
│  04  Possible places         │
│  11  Archive references      │
│  03  Migration clues         │
│                               │
│ Every count reflects data     │
│ actually returned by sources. │
│                               │
│ [ SEE FURTHER DISCOVERIES ]  │
│                               │
│ Save this Atlas              │
└───────────────────────────────┘
```

## Personalisation

```text
┌───────────────────────────────┐
│ NARROW THE RESEARCH           │
│                               │
│ Which region is your family   │
│ most connected to?            │
│                               │
│ [ Search region             ] │
│                               │
│ [ I DON'T KNOW ]              │
│                               │
│ Optional. Used only to        │
│ compare family context with   │
│ historical surname patterns.  │
└───────────────────────────────┘
```

## Report preview

```text
┌───────────────────────────────┐
│ NAME ATLAS                    │
│                               │
│ [YOUR SURNAME]                │
│                               │
│ RESEARCH EDITION              │
│                               │
│ ORIGIN                        │
│ PLACES                        │
│ HISTORY                       │
│ ARCHIVES                      │
│                               │
│               2026            │
└───────────────────────────────┘
```

## Premium transition

```text
┌───────────────────────────────┐
│ OPEN THE NEXT CHAPTERS        │
│                               │
│ Historical variants      8    │
│ Historical places        4    │
│ Archive references      11    │
│ Migration clues          3    │
│ Source notes             ✓    │
│                               │
│ Coverage: STRONG               │
│                               │
│ [ OPEN FULL NAME ATLAS → ]    │
│                               │
│ Sample report                 │
│ Methodology · Sources         │
└───────────────────────────────┘
```

---

# 25. EDGE CASES

| Edge case | Behaviour |
|---|---|
| typo | fuzzy suggestions, never silently change |
| nonexistent surname | zero-result recovery |
| extremely common | focus on distribution/variation, not rarity |
| extremely rare | privacy + variants + broader geography |
| transliteration | detect possible alternative scripts |
| Polish diacritics | normalize for search but preserve original display |
| compound surname | search full form first, then optionally components |
| hyphenated | never automatically assume both parts share origin |
| multiple origins | show hypotheses side by side |
| foreign surname PL | move beyond Poland when evidence supports |
| sensitive history | neutral language + primary sources + no sensationalism |
| ambiguous region | confidence + multiple possibilities |
| conflicting sources | surface conflict explicitly |
| no archive evidence | say none found in current coverage |
| duplicate variants | canonicalize, explain normalization |
| surname = common word | distinguish lexical word from surname etymology |
| noble/heraldic association | surname match ≠ same noble family |
| extremely low population count | follow privacy/suppression rules of source |
| recent immigrant surname | don't infer ethnicity from surname alone |
| spelling altered by record-keeper | distinguish documented variant vs algorithmic suggestion |

---

# 26. ACCESSIBILITY

## Non-negotiable

### Motion
Respect:

`prefers-reduced-motion`

and provide static equivalents for:

- map transitions;
- timeline drawing;
- variant morphs.

### Target size
For a consumer mobile product I would design important targets closer to **44–48 px**.

### Confidence
Never only color.

Use:

```text
● VERIFIED
◐ LIKELY
○ POSSIBLE
·· UNCONFIRMED
```

Icon + word + color.

### Map
Every map must have:

> **Text summary**

Example:

> Highest concentration: Region A.  
> Second: Region B.  
> Third: Region C.

### Screen reader
Map markers need descriptive labels.

### Contrast
Follow WCAG 2.2 contrast criteria.

### One-handed use
Primary CTA in lower accessible zone.

### Source notes
Minimum normal readable body size, not 9px „legal grey”.

---

# 27. ANALYTICS EVENT TAXONOMY

| Event | Definition | Key properties | Why |
|---|---|---|---|
| `surname_input_started` | first focus/type | locale, entry_source | landing intent |
| `surname_search_submitted` | valid submit | query_length, locale | search rate |
| `surname_query_corrected` | user selects suggestion | original, correction_type | search quality |
| `result_loaded` | usable result returned | coverage_level, latency | backend success |
| `population_viewed` | population screen ≥50% viewport | population_bucket | first value reach |
| `rarity_viewed` | rarity shown | rarity_bucket | identity engagement |
| `rarity_method_opened` | methodology opened | — | trust interest |
| `map_viewed` | map chapter visible | coverage | geography reach |
| `map_interacted` | marker/region/time layer | region, interaction | engagement |
| `origin_viewed` | origin visible | confidence | core value |
| `source_opened` | source detail opened | source_type, chapter | trust |
| `meaning_viewed` | meaning visible | evidence_level | comprehension |
| `history_viewed` | history chapter visible | history_coverage | depth |
| `variant_viewed` | variant expanded | variant_count | historical curiosity |
| `historical_map_viewed` | old layer shown | year/period | time engagement |
| `share_prompt_viewed` | share card shown | card_type | opportunity |
| `share_started` | OS share/export initiated | destination, card_type | growth |
| `share_completed` | completion where trackable | destination | actual shares |
| `free_summary_viewed` | completed free story | time_to_summary | funnel milestone |
| `discovery_index_viewed` | index visible | counts_by_type | premium opportunity |
| `discovery_item_opened` | user opens index category | item_type | content demand |
| `premium_curiosity_clicked` | user asks to see more | entry_pattern | strongest leading metric |
| `personalisation_offer_viewed` | prompt displayed | — | exposure |
| `personalisation_started` | user engages | question_type | intent |
| `personalisation_completed` | submits family context | answer_scope | completion |
| `personalisation_skipped` | explicit skip | — | friction |
| `report_cover_viewed` | personalized cover visible | coverage | ownership test |
| `report_preview_viewed` | preview opened | preview_type | value evaluation |
| `premium_transition_viewed` | final transition viewed | pattern | denominator |
| `premium_entry_clicked` | moves to paid offer | price_variant | monetisation |
| `zero_result` | no adequate result | reason_code | coverage quality |
| `alternate_spelling_selected` | recovery path | type | retrieval quality |

### Najważniejsze metrics

1. `result_loaded / surname_search_submitted`
2. `free_summary_viewed / result_loaded`
3. `discovery_index_viewed / result_loaded`
4. `premium_curiosity_clicked / discovery_index_viewed`
5. `premium_entry_clicked / premium_transition_viewed`
6. `share_started / share_prompt_viewed`
7. source-open rate
8. map interaction rate
9. personalisation completion vs skip
10. drop by screen.

---

# 28. 27 A/B TESTS — DISCOVERY FLOW ONLY

Bez przewidywania uplift.

| Test | Hypothesis | Control | Variant | Primary metric | Secondary | Segment | Risk | Learning |
|---|---|---|---|---|---|---|---|---|
| 1 | population first establishes trust faster | origin first | population first | free completion | time | all | less emotional | best first reveal |
| 2 | rarity early boosts identity | rarity after map | rarity before map | next-screen rate | share | all | common names | rarity timing |
| 3 | map early increases engagement | map #5 | map #3 | map interaction | completion | all | load | geography value |
| 4 | origin after map feels more grounded | origin before map | origin after map | source opens | trust survey | all | — | context order |
| 5 | meaning after origin improves comprehension | meaning first | origin first | history reach | time | all | — | interpretation order |
| 6 | 2 free variants increase curiosity | no variants | 2 variants | index CTR | purchase later | history-rich | giveaway | free value effect |
| 7 | 1 free variant is enough | 2 | 1 | index CTR | trust | history-rich | weak value | optimal depth |
| 8 | counts outperform generic teaser | “more found” | actual counts | curiosity CTR | trust | all | low count unattractive | specificity |
| 9 | evidence before history increases trust | source after history | source before | history reach | source opens | 35+ | interrupts flow | trust timing |
| 10 | source footnote is sufficient | full source card | footnote | completion | source open | mobile | lower trust | density |
| 11 | full-screen rarity improves identity | inline | full-screen | share | completion | mobile | too much emphasis | layout |
| 12 | interactive map beats static | static | tap regions | engagement | latency | all | complexity | interaction |
| 13 | textual map summary improves comprehension | map only | map + summary | comprehension proxy | accessibility | all | more text | clarity |
| 14 | historical map delta creates strongest surprise | variant first | map change first | history completion | index CTR | rich data | no data cases | best surprise |
| 15 | variant morph aids understanding | static side-by-side | morph | time/history | reduced-motion use | all | gimmick | animation utility |
| 16 | free summary before share helps | share after rarity | summary then share | share completion | premium CTR | all | late sharing | share timing |
| 17 | share before index improves acquisition without hurting monetisation | index first | share first | shares | premium CTR | all | distraction | tradeoff |
| 18 | explicit chapter progress helps | no progress | chapter `3/6` | completion | speed | new users | gamification feel | orientation |
| 19 | vertical continuous scroll is better | snap screens | regular scroll | completion | bounce | all | less cinematic | nav model |
| 20 | local snap on map/story is beneficial | no snap | local snap | engagement | accessibility | mobile | control loss | micro navigation |
| 21 | one personalisation question helps relevance | none | region Q | premium CTR | abandonment | users reaching index | friction | personalization value |
| 22 | ask after index vs before | before index | after index | completion | paid intent | all | sequence | timing |
| 23 | skip button reduces resistance | subtle skip | clear skip | completion | personalisation rate | all | fewer answers | autonomy |
| 24 | cover preview increases perceived value | TOC first | cover first | premium entry | preview use | all | aesthetic only | ownership |
| 25 | evidence index beats report cover | cover | evidence index | premium curiosity | time | analytical cohort | less emotional | segment fit |
| 26 | dynamic flow by coverage beats fixed flow | fixed 12 screens | adaptive | completion | NPS | sparse data | analytics complexity | adaptive value |
| 27 | one surprise is better than several | 3 sequential surprises | strongest 1 + summary | completion | recall survey | rich data | lower content exposure | pacing |

---

# 29. DATA COVERAGE SHOULD CONTROL THE STORY

**RECOMMENDATION:** backend powinien jeszcze przed renderowaniem flow generować **Discovery Manifest**.

Przykład:

```json
{
  "population": "strong",
  "rarity": "available",
  "modern_map": "strong",
  "origin": "probable",
  "etymology": "strong",
  "historical_variants": 7,
  "historical_places": 3,
  "historical_occurrences": 9,
  "archive_references": 11,
  "migration_clues": 0
}
```

Frontend nie powinien mieć:

> „Screen 13 zawsze = migration”.

Powinien mieć:

> **wybierz najmocniejszy dostępny historical insight.**

To jest bardzo ważne.

---

# 30. JAK POWINIEN DZIAŁAĆ DISCOVERY ENGINE

Każdemu możliwemu insightowi przypisałbym:

```text
INFORMATION VALUE
SELF RELEVANCE
CONFIDENCE
NOVELTY
VISUAL POTENTIAL
SOURCE QUALITY
PREMIUM DEPTH
SENSITIVITY
```

Np.:

```text
Population:
confidence       1.00
self relevance   0.70
novelty          0.55
visual           0.50

Historical location:
confidence       0.75
self relevance   0.80
novelty          0.90
visual           0.90
```

**HYPOTHESIS:** później można dynamicznie wybierać najlepszy „surprise” dla każdego nazwiska zamiast budować jeden rigid sequence.

Ale **pierwsze 5 kroków pozostawiłbym stałe**, aby produkt był łatwy do zrozumienia:

```text
Population
Rarity
Map
Origin
Meaning
```

Dopiero później adaptive discovery.

---

# 31. FINAL MVP RECOMMENDATION

Jeżeli jutro zaczynamy projektować Figma + implementation, zrobiłbym dokładnie:

```text
SCREEN 01
LANDING
Surname input

↓

SCREEN 02
REAL ANALYSIS
Only actual source checks

↓

SCREEN 03
POPULATION
How many

↓

SCREEN 04
FREQUENCY
1 in X

↓

SCREEN 05
RARITY
Identity moment

↓

SCREEN 06
CURRENT MAP
Where

↓

SCREEN 07
STRONGEST REGION
Spatial interpretation

↓

SCREEN 08
PROBABLE ORIGIN
Why this place / language

↓

SCREEN 09
MEANING
Etymology

↓

SCREEN 10
EVIDENCE
Confidence + sources

↓

SCREEN 11
HISTORY BRIDGE
“Today’s spelling is only the latest layer.”

↓

SCREEN 12
HISTORICAL VARIANT
First free time-travel moment

↓

SCREEN 13
SECOND VARIANT / ALTERNATE SCRIPT
if available

↓

SCREEN 14
HISTORICAL GEOGRAPHY
Strongest available historical spatial clue

↓

SCREEN 15
ONE HISTORICAL OCCURRENCE
Clearly surname-level, not ancestor-level

↓

SCREEN 16
FREE SUMMARY
Your Name Snapshot

↓

SCREEN 17
SHARE / SAVE
No premium yet

↓

SCREEN 18
DISCOVERY INDEX
Exact counts of what else exists

↓

SCREEN 19
“SEE FURTHER DISCOVERIES”

↓

SCREEN 20
OPTIONAL PERSONALISATION EXPLANATION

↓

SCREEN 21
FAMILY REGION
or Skip

↓

SCREEN 22
PERSONALISED ALIGNMENT
if user supplied region

↓

SCREEN 23
YOUR NAME ATLAS COVER

↓

SCREEN 24
REPORT CONTENTS
Exact sections + exact counts + coverage

↓

SCREEN 25
SOURCE / EVIDENCE PREVIEW

↓

SCREEN 26
PREMIUM TRANSITION
“Open the next chapters.”

↓

PAYWALL ENTRY
```

---

# 32. ODPOWIEDŹ NA FINALNE PYTANIE

## „Jaka dokładnie kolejność odkrywania informacji daje najwięcej realnej wartości, buduje największą wiarygodną ciekawość i najnaturalniej prowadzi do kontynuowania researchu?”

### Moja jednoznaczna odpowiedź:

# 1. POPULATION

Najpierw twardy, współczesny fakt.

Użytkownik widzi:

> **[X] osób nosi dziś to nazwisko.**

Powód:

**potwierdzenie wiarygodności systemu.**

---

# 2. FREQUENCY + RARITY

> **1 na X osób**  
> **Rarity X/100**

Powód:

zamiana abstrakcyjnej liczby w **identity signal**.

---

# 3. MAP

> **Gdzie nazwisko żyje dziś?**

Powód:

pierwszy duży visual reward.

---

# 4. STRONGEST REGION

> **Największe skupienie znajduje się tutaj.**

Powód:

mapa staje się pytaniem:

> „Dlaczego tutaj?”

---

# 5. PROBABLE ORIGIN

> **Prawdopodobne pochodzenie: …**

Powód:

naturalna odpowiedź na pytanie stworzone przez mapę.

---

# 6. MEANING / ETYMOLOGY

> „Nazwa może pochodzić od…”

Powód:

po geografii użytkownik chce rozumieć **semantykę**.

---

# 7. CONFIDENCE + SOURCE

Krótka pauza.

> `LIKELY`  
> `3 supporting sources`

Powód:

przed wejściem w mniej pewną historię musimy **zakotwiczyć trust**.

---

# 8. HISTORICAL VARIANT

> **Nie zawsze zapisywano nazwisko w ten sposób.**

To jest pierwszy **surprise**.

Powód:

nagle obiekt, który wydawał się stały, zaczyna się zmieniać.

---

# 9. HISTORICAL GEOGRAPHY

> **Starszy wariant pojawia się również tutaj.**

Powód:

użytkownik dostaje nowe pytanie:

> „Jak nazwisko dostało się stąd tam?”

---

# 10. ONE HISTORICAL OCCURRENCE

Pokazujemy jeden realny clue.

Nie najlepszy wszystko.

Nie fake teaser.

Po prostu:

> **W naszym zakresie źródeł znajdujemy historyczne wystąpienie z okresu…**

Powód:

dowód, że historyczna warstwa jest rzeczywista.

---

# 11. FREE ENDING

Użytkownik ma dostać poczucie:

> **„Dostałem odpowiedź.”**

Nie:

> „Teraz muszę zapłacić, żeby dostać odpowiedź.”

---

# 12. SHARE MOMENT

Dajemy mu jego:

**Name Snapshot**

do zapisania / udostępnienia.

To jest peak-end dla darmowego produktu.

---

# 13. DISCOVERY INDEX

I dopiero teraz:

> **Znaleźliśmy również:**

```text
8 historical variants
4 possible historical locations
11 archive references
3 migration clues
```

Tutaj powstaje **Information Gap**.

Nie dlatego, że coś zasłoniliśmy.

Tylko dlatego, że darmowa odpowiedź naturalnie ujawniła istnienie kolejnych warstw.

---

# 14. PERSONAL QUESTION

> **Czy któryś z tych śladów może dotyczyć Twojej rodziny?**

Opcjonalnie:

> Region rodziny?

To przesuwa użytkownika z:

**surname curiosity**

do:

**personal family curiosity.**

---

# 15. PREMIUM PREVIEW

Pokazujemy:

- spersonalizowaną okładkę;
- realne chapter counts;
- source coverage;
- confidence;
- zakres.

Nie blur.

Nie „Premium PRO”.

Nie fake document.

---

# 16. CONTINUE RESEARCH

CTA:

> **Otwórz dalsze rozdziały**  
> *Open the next chapters*

To jest właśnie właściwy moment premium.

---

## Cała psychologiczna struktura sprowadza się więc do:

```text
PROVE
↓
PERSONALISE
↓
LOCATE
↓
EXPLAIN
↓
VERIFY
↓
MOVE THROUGH TIME
↓
SURPRISE
↓
REWARD
↓
SHOW WHAT REMAINS
↓
MAKE IT PERSONAL
↓
CONTINUE
```

A nie:

```text
TEASE
↓
TEASE
↓
BLUR
↓
PAY
```

To jest flow, które projektowałbym jako **V1 Name Atlas**.

---

# 33. SOURCE REGISTER — najważniejsze źródła wykorzystane w rekomendacji

| Źródło | Data | Co potwierdza |
|---|---|---|
| Loewenstein, *The Psychology of Curiosity* | 1994 | information-gap account of curiosity |
| Symons & Johnson, self-reference meta-analysis | 1997 | self-related encoding improves memory |
| Nunes & Drèze, Endowed Progress | 2006 | perceived progress can increase persistence |
| Kivetz, Urminsky & Zheng | 2006 | goal-gradient effect |
| Norton, Mochon & Ariely | 2012 | effort can increase valuation after successful completion |
| Ruan, Hsee & Lu | 2018 | creation + resolution of uncertainty / teasing effect |
| Peak-end meta-analysis | 2022 | strong retrospective peak/end weighting |
| Peck & Luangrath | 2023 | psychological ownership in consumer contexts |
| NN/g Progressive Disclosure | 2006 | complexity should be disclosed progressively |
| Narrative transportation meta-analysis | 2019 | evidence for story-based engagement effects |
| Ancestry onboarding | current, accessed 2026 | progressive hints / actual record availability |
| MyHeritage Record Matches | updated Jul 2026 | match existence free, full record paid |
| FamilySearch Record Hints | 2025–26 | candidate match + user verification model |
| Findmypast Hints | current | source preview + side-by-side comparison |
| Geneanet Premium | current | automated Hints / continued research model |
| Forebears | current | surname rank/population/map/meaning model |
| House of Names | current | free excerpt → extended surname report |
| Geni | current | free tree → premium match/search tools |
| 23andMe Historical Matches | current | strong uncertainty / no false direct ancestry claims |
| FamilyTreeDNA | 2026 | visual layered ancestry exploration |
| autoDNA | current / terms Sep 2026 | exact report coverage shown before purchase |
| carVertical | current 2026 | source transparency and variable report coverage |
| CliftonStrengths | current Sep 2026 | basic profile → full depth model |
| 16Personalities | current 2026 | useful identity product → paid applied interpretation |
| Spotify Wrapped | Dec 2025 / 2026 reporting | personalized staged data stories + sharing |
| Duolingo Year in Review | product case study | multiple identity/sharing opportunities |
| Strava Year in Sport | current 2026 | adaptive mobile personalized summary/share |
| WCAG 2.2 | current | motion and target-size requirements |

