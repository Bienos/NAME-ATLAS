# NAME ATLAS — Mobile Wireflow Specification

## 1. EXECUTIVE SUMMARY

Dla **Name Atlas** rekomenduję jeden konkretny model doświadczenia mobilnego:

> **vertical discovery narrative z momentami pełnoekranowymi**, a nie carousel ekranów i nie dashboard.

Użytkownik powinien móc po prostu przewijać w dół, ale najważniejsze momenty — populacja, mapa, pochodzenie, przejście do historii, Discovery Index i preview raportu — dostają niemal pełny viewport.

### Docelowa kolejność

**Search**  
↓  
**Real analysis**  
↓  
**Population — pierwszy dowód, że system zna nazwisko**  
↓  
**Current map — pierwszy wizualny WOW**  
↓  
**Rarity / 1 in X — identity moment**  
↓  
**Origin — interpretacja + confidence**  
↓  
**Meaning — krótka odpowiedź na pierwotne pytanie**  
↓  
**Present → Past transition**  
↓  
**1–2 historical variants — real historical value**  
↓  
**Share moment**  
↓  
**Discovery Index — pierwszy świadomy information gap**  
↓  
**Optional personalisation — max 1 pytanie w MVP**  
↓  
**Personalised report cover**  
↓  
**Report contents / evidence preview**  
↓  
**Full-screen paywall jako kolejny rozdział, nie „upgrade”**  
↓  
**Guest checkout**  
↓  
**„Twój Atlas jest otwarty”**  
↓  
**Premium report**  
↓  
dopiero później  
**Surname history → Your family history**

### Najważniejsze decyzje

- **Pierwszy WOW:** mapa, ale dopiero po szybkim „[COUNT] osób nosi to nazwisko”. Count buduje credibility, mapa daje emocję.
- **Rarity:** po mapie. Nie jako pierwsza rzecz.
- **Origin:** dopiero gdy system już pokazał twarde dane.
- **Meaning:** bezpłatnie. Nie chować rzeczy obiecanej na landing page.
- **Pierwszy premium hint:** dopiero po historycznym wariancie.
- **Share:** bezpośrednio przed Discovery Index / paywallem.
- **Personalisation:** po Discovery Index, maksymalnie 1 pytanie w MVP.
- **Paywall:** fullscreen, ale można go swobodnie zamknąć/cofnąć.
- **Cena:** nie musi być widoczna wcześniej niż report preview. Nie należy jednak ukrywać jej za kolejnym CTA.
- **Sources:** contextual — pod insightem jako expandable drawer, nie w jednym wielkim „Sources” na końcu.
- **Low-data surname:** mniej ekranów. Flow skraca się zamiast pokazywać puste sekcje.
- **Zero premium depth:** brak paywalla.
- **Navigation:** vertical narrative + mały chapter index po kilku ekranach.
- **Sticky:** tylko krytyczne akcje. Nie sticky CTA przez całe darmowe doświadczenie.
- **Back:** zawsze wraca do poprzedniego chapteru bez utraty wyniku.

---

# 2. MOBILE DESIGN PRINCIPLES

## 1. One insight = one composition

Nie:

```text
Population | Rarity
Map        | Origin
Meaning    | History
```

Tylko:

```text
SCREEN
[COUNT]
people carry this surname
```

następnie mapa.

## 2. Hard fact before interpretation

Najpierw:

**[COUNT] people**

potem:

**We believe the surname most likely originated from…**

To ogranicza wrażenie „AI fortune telling”.

## 3. Free answer must close the original question

Jeśli landing mówi:

> Discover your surname's origin and meaning

to użytkownik dostaje podstawowy origin + meaning **przed płatnością**.

Premium odpowiada na nowe pytania.

## 4. Present before past

Najpierw użytkownik widzi nazwisko **dzisiaj**.

Dopiero potem:

> „Teraz cofnijmy mapę.”

To tworzy czytelny mental model.

## 5. Mobile is a story, not a spreadsheet

Większość chapterów: 70–100% viewportu.

Główna struktura:

```text
headline
↓
one visual
↓
short explanation
↓
source / confidence
```

## 6. Scroll is primary. Swipe is local.

**Vertical scroll** = główna narracja.

Swipe tylko dla:

- share cards;
- report pages preview;
- variants;
- map layers.

Nie budować całej aplikacji jako Tinder-like swipe.

## 7. Premium is depth, not privilege

Nie:

> PRO FEATURE

Tylko:

> Historical distribution  
> 4 layers available

## 8. Counts outperform vague mystery

Lepsze:

> 8 historical variants found

niż:

> We found more.

## 9. Confidence is part of content

Każdy interpretacyjny wynik może mieć:

**VERIFIED / LIKELY / POSSIBLE / UNCONFIRMED**

Nie ukrywać uncertainty w tooltipie.

## 10. Empty space is productive

Duże liczby, mapa, jedna teza.

Nie wypełniać viewportu tylko dlatego, że jest miejsce.

## 11. Actions live in the thumb zone

Najważniejsze CTA:

- Search;
- Continue;
- Open report;
- Pay;
- Share;

w dolnych ~35% ekranu.

## 12. No dead ends

Każdy chapter odpowiada:

1. czego się dowiedziałem?
2. co mogę zrobić dalej?

## 13. Content density adapts to surname depth

Nazwisko bogate w dane:

~11 darmowych moments.

Low-data:

~6 moments.

Nie utrzymywać sztucznie tej samej długości.

## 14. Premium preview is evidence of work

Nie tylko makieta książki.

Powinien pokazywać:

- ile źródeł;
- ile wariantów;
- ile lokalizacji;
- jakie okresy;
- poziom pewności.

## 15. Family research is a separate mental mode

**Surname history** ≠ **your family history**.

UI powinien wyraźnie zmienić framing:

> History of the surname

↓

> Now tell us what you know about your family.

---

# 3. RECOMMENDED MASTER WIREFLOW

```text
01 Landing / Search
↓
02 Real Analysis State
↓
03 Population Reveal
↓
04 Current Map
↓
05 Rarity / Context
↓
06 Origin
↓
07 Meaning + Sources
↓
08 Present → Past Transition
↓
09 Historical Variants
↓
10 Free Summary + Share
↓
11 Discovery Index
↓
12 Optional Family Region
↓
13 Personalisation Result
↓
14 Personalised Report Cover
↓
15 Report Contents / Research Preview
↓
16 Paywall
↓
17 Checkout
↓
18 Purchase Success
↓
19 Premium Report Opening
↓
20 Premium Chapter Index
↓
21 Premium Exploration
↓
22 Family Origin Transition
↓
23 Family Origin Start
```

MVP może później połączyć niektóre z tych ekranów.

---

# 4. SCREEN SPECIFICATIONS

# SCREEN 01 — Surname Search

**Purpose**  
Natychmiast wyjaśnić produkt i uruchomić główną akcję.

**User question**  
„Co tu mogę zrobić?”

**User emotion before**  
Ciekawość / sceptycyzm.

**Desired emotion after**  
„To proste. Sprawdzę.”

**Information**

P1: value proposition  
P1: surname input  
P2: jedna reassurance line  
P3: minimalny trust cue.

**Headline**

PL: **Każde nazwisko gdzieś się zaczęło.**  
EN: **Every surname begins somewhere.**

**Body**

PL: Odkryj pochodzenie, znaczenie, mapę i historię swojego nazwiska.  
EN: Discover your surname's origin, meaning, map and history.

**Primary CTA**

PL: **Odkryj nazwisko**  
EN: **Explore surname**

Najlepiej CTA jako arrow/action w input, nie osobny ogromny button.

**Secondary CTA**  
Brak.

**Interaction**  
Tap input → keyboard. Submit keyboard return lub CTA.

**Data required**  
None.

**Trust/confidence**  
Mała linia:

PL: `Oparte na danych i źródłach historycznych.`  
EN: `Built from data and historical sources.`

**Animation**  
Tło może subtelnie pokazywać 3–5 punktów mapowych. Bez ciągłego ruchu.

**Duration**  
3–10 s.

**Next**  
Analysis.

**Failure**  
Validation inline:

> Sprawdź pisownię nazwiska.

Nie modal.

**Analytics**

`surname_search_start`  
`surname_search_submit`

**Conversion role**  
Minimal friction.

---

# SCREEN 02 — Analysis

**Purpose**  
Połączyć input z pierwszym wynikiem bez teatralnego loadingu.

**Question**  
„Czy coś się dzieje?”

**Emotion before**  
Anticipation.

**After**  
„System rzeczywiście sprawdził dane.”

**Information**

Jeśli <0.8 s: żadnego standalone screena.

Jeśli 0.8–2.5 s:

```text
Preparing your Name Atlas…
```

Jeśli >2.5 s i operacje naprawdę streamują:

```text
Population data        ✓
Geographic distribution ✓
Linguistic sources     …
Historical variants    …
```

**Headline**

PL: **Budujemy Twój Atlas…**  
EN: **Building your Name Atlas…**

**Body**  
Tylko realne operacje.

**CTA**  
Brak.

**Interaction**  
None.

**Data**  
Backend state.

**Trust**  
Nie pokazywać fałszywych tasków.

**Animation**  
Linia/punkt przesuwający się między etapami. 200–300 ms transitions.

**Duration**  
0–3 s typowo.

**Next**  
Population.

**Failure**  
Inline recovery:

> Nie udało się pobrać jednego ze źródeł. Możemy pokazać częściowy wynik.

CTA:

`Pokaż dostępne dane`

**Analytics**  
`analysis_start`  
`analysis_partial`  
`analysis_complete`  
`analysis_failure`

**Conversion role**  
Anticipation + credibility.

---

# SCREEN 03 — Population Reveal

**Purpose**  
Pierwszy twardy fakt.

**Question**  
„Ile osób ma moje nazwisko?”

**Before**  
Ciekawość.

**After**  
Recognition: „System wie, o czym mówi.”

**Information**

P1: `[COUNT]`  
P2: „people in Poland / in dataset”  
P3: source date.

**Headline**

PL: **[COUNT] osób nosi dziś to nazwisko w Polsce.**  
EN: **[COUNT] people carry this surname in Poland today.**

Dla global/foreign surname:

> `[COUNT] recorded in our current Polish dataset.`

**Body**

PL: Dane z [YEAR].  
EN: Data from [YEAR].

**CTA**  
Nie potrzebny. Swipe/scroll.

**Interaction**  
Scroll.

**Data**  
Population count, dataset year.

**Trust**  
Source link.

**Animation**  
Number count-up max 500–700 ms. Reduce-motion: static.

**Duration**  
4–8 s.

**Next**  
Map.

**Failure**  
Jeżeli count unavailable:

> Nie mamy wiarygodnej współczesnej liczby. Sprawdźmy geografię i pochodzenie.

Skip count.

**Analytics**  
`population_view`  
`population_source_open`

**Conversion role**  
Trust.

---

# SCREEN 04 — Current Map

**Purpose**  
Pierwszy emocjonalny WOW.

**Question**  
„Gdzie ludzie o tym nazwisku mieszkają?”

**Before**  
Recognition.

**After**  
Spatial connection.

**Information**

P1: map  
P2: strongest concentration  
P3: source/date.

**Headline**

PL: **Gdzie nazwisko występuje dziś**  
EN: **Where the surname lives today**

**Body**

> Największe współczesne skupienie: [REGION].

**CTA**  
`Poznaj regiony / Explore regions`

opcjonalny.

**Interaction**

- tap region;
- drag map;
- pinch optional;
- bottom sheet with top 3 regions.

**Data**  
Regional counts/density.

**Trust**  
`Source · [YEAR]`

**Animation**  
Dots/density appear 300–500 ms.

**Duration**  
8–20 s.

**Next**  
Rarity.

**Alternative**  
Tap → full map explorer.

**Failure**  
Only national data:

> Regional distribution isn't available yet.

Keep silhouette + total count.

**Analytics**

`map_view`  
`map_interaction`  
`region_open`

**Conversion role**  
Emotional relevance + exploration.

---

# SCREEN 05 — Rarity / Context

**Purpose**  
Przełożyć count na zrozumiały kontekst.

**Question**  
„Czy to rzadkie nazwisko?”

**Before**  
Spatial curiosity.

**After**  
Identity / comparison.

**Recommended representation**

P1: **1 in X**  
P2: percentile  
P3: rank.

Nie zaczynać od arbitralnego 94/100.

**Headline**

PL: **Około 1 na [X] osób nosi to nazwisko.**  
EN: **About 1 in [X] people carries this surname.**

**Body**

> Rzadsze niż [PERCENTILE]% nazwisk w naszym zbiorze.

**CTA**  
`Jak to liczymy? / How is this calculated?`

**Data**  
Total population, surname distribution, dataset.

**Trust**  
Methodology drawer.

**Animation**  
Simple percentile line.

**Duration**  
5–10 s.

**Next**  
Origin.

**Failure**  
No reliable denominator → show rank only.

**Analytics**

`rarity_view`  
`rarity_methodology_open`

**Conversion role**  
Identity + share potential.

---

# SCREEN 06 — Origin

**Purpose**  
Odpowiedzieć na główne pytanie interpretacyjne.

**Question**  
„Skąd prawdopodobnie pochodzi?”

**Before**  
Curiosity.

**After**  
Understanding + calibrated confidence.

**Information**

P1: strongest hypothesis  
P1: confidence label  
P2: short explanation  
P3: source count.

**Headline**

PL: **Prawdopodobne pochodzenie**  
EN: **Probable origin**

**Body**

Dynamic.

Example system copy:

> Najsilniejsza hipoteza łączy nazwisko z [REGION / LANGUAGE / PLACE TYPE].

**Primary CTA**  
`Dlaczego? / Why?`

opens evidence drawer.

**Data**  
Etymology/origin evidence.

**Trust**  
Mandatory confidence.

**Animation**  
No dramatic reveal. 250 ms text fade.

**Duration**  
10–20 s.

**Next**  
Meaning.

**Alternative**  
Multiple origins screen if needed.

**Failure**  
No strong origin:

> Źródła nie wskazują jednego wiarygodnego pochodzenia.

This is a valid result.

**Analytics**

`origin_view`  
`origin_evidence_open`

**Conversion role**  
Core value + trust.

---

# SCREEN 07 — Meaning + Evidence

**Purpose**  
Dokończyć darmową odpowiedź.

**Question**  
„Co nazwisko może znaczyć?”

**Emotion after**  
Satisfaction.

**Headline**

PL: **Co może oznaczać nazwisko**  
EN: **What the surname may mean**

**Body**

2–4 short paragraphs max.

**CTA**

`Zobacz źródła / View sources`

**Data**  
Etymology.

**Trust**

Source drawer shows:

- source;
- publication;
- year;
- confidence;
- discrepancy if any.

**Animation**  
None required.

**Duration**  
15–40 s.

**Next**  
Historical transition.

**Failure**

> Nie znaleźliśmy wiarygodnej etymologii. Nie chcemy jej zgadywać.

Then continue to geography/history if available.

**Analytics**  
`meaning_view`  
`source_open`

**Conversion role**  
Fulfill promise before monetisation.

---

# SCREEN 08 — Present → Past

**Purpose**  
Zmienić mental mode z lookup na discovery.

**Question**  
„Co było wcześniej?”

**Before**  
Answer achieved.

**After**  
Renewed curiosity.

**Headline**

PL: **Dzisiejsza mapa to tylko jedna warstwa historii.**  
EN: **Today's map is only one layer of the story.**

**Body**

> Pisownia i rozmieszczenie nazwisk zmieniały się wraz z ludźmi, granicami i językiem.

**CTA**

PL: **Cofnij się w czasie**  
EN: **Go back in time**

**Interaction**  
Scroll reveals current map fading to timeline.

**Data**  
Historical availability indicator.

**Trust**  
No specific claim yet.

**Animation**  
Map desaturates → year marker appears. 450–700 ms.

**Duration**  
4–7 s.

**Next**  
Variants.

**Failure**  
No historic data → jump to Discovery Index saying limited history.

**Analytics**  
`history_transition_view`  
`history_continue`

**Conversion role**  
Second curiosity loop.

---

# SCREEN 09 — Historical Variants

**Purpose**  
Give free historical value.

**Question**  
„Czy nazwisko wyglądało inaczej?”

**Headline**

PL: **Nazwisko zmieniało pisownię.**  
EN: **The surname changed spelling over time.**

**Information**

Show 1–2 verified/reasonable variants.

Then:

> + [N] dalszych wariantów znalezionych w źródłach

only if true.

**Interaction**  
Swipe horizontally between 2 visible examples.

**Trust**  
Each variant may include:

`Source / period / confidence`

**Animation**  
Morph between glyphs 250–400 ms.

**Duration**  
8–20 s.

**Next**  
Free summary/share.

**Failure**

No variants:

> Pisownia wydaje się wyjątkowo stabilna w dostępnych źródłach.

That's itself interesting.

**Analytics**

`variant_view`  
`variant_swipe`  
`variant_source_open`

**Conversion role**  
Proves historic depth before premium.

---

# SCREEN 10 — Free Summary + Share

**Purpose**  
Reward user before monetisation.

**Question**  
„Co już odkryłem?”

**Headline**

PL: **Twój pierwszy Atlas**  
EN: **Your first Atlas**

**Information**

Only 3 shareable facts:

- 1 in X;
- strongest region;
- origin/confidence.

**CTA**

PL: **Udostępnij**  
EN: **Share**

Secondary:

`Kontynuuj / Continue`

**Interaction**  
Tap share → preview, never automatic system sheet.

**Data**  
Free findings.

**Trust**  
Footer:

`Based on current dataset · [YEAR]`

**Duration**  
5–15 s.

**Next**  
Discovery Index.

**Analytics**

`free_summary_view`  
`share_preview`  
`share_start`  
`share_complete`

**Conversion role**  
Value reciprocity + acquisition.

---

# SCREEN 11 — Discovery Index

**Purpose**  
Pierwszy jawny information gap.

**Question**  
„Co jeszcze istnieje?”

**Headline**

PL: **Znaleźliśmy również dalsze ślady.**  
EN: **We found further traces too.**

**Information**

Only categories with real positive data.

Example:

```text
Historical variants      8
Historical locations     4
Archive references      11
Migration clues          3
```

**CTA**

PL: **Zobacz zakres researchu**  
EN: **See the research scope**

**Secondary**  
`Nie teraz / Not now`

**Interaction**  
Tap category can preview what that category means — not the premium value itself.

**Trust**

Each count gets semantic type:

`11 potential references` not `11 ancestors found`.

**Duration**  
8–15 s.

**Next**  
Optional personalization.

**Failure**

Only 1 category:

Use one editorial statement, don't fake an index.

No meaningful depth:

skip premium completely.

**Analytics**

`discovery_index_view`  
`discovery_item_click`  
`discovery_continue`

**Conversion role**  
Main curiosity trigger.

---

# SCREEN 12 — Optional Personalisation

**Purpose**  
Increase relevance only when useful.

**Question**  
„Czy mogę sprawdzić, czy te ślady są bliżej mojej rodziny?”

**Headline**

PL: **Chcesz zawęzić wynik do swojej rodziny?**  
EN: **Want to narrow the result to your family?**

**Question**

PL: **Z jakim regionem najbardziej kojarzy się Twoja rodzina?**  
EN: **Which region is your family most closely associated with?**

Options:

- searchable region picker;
- `Nie wiem / I don't know`.

**Why**

> Użyjemy tego wyłącznie do zawężenia źródeł i mapy.

**CTA**

`Zawęź wynik / Refine result`

Secondary:

`Pomiń / Skip`

**Data**  
Region.

**Trust**  
No save without consent beyond session.

**Duration**  
5–15 s.

**Next**  
Personalization result or directly report preview if skipped.

**Analytics**

`personalisation_start`  
`personalisation_complete`  
`personalisation_skip`

**Conversion role**  
Personal relevance.

---

# SCREEN 13 — Personalisation Result

**Purpose**  
Show immediately why the question mattered.

**Question**  
„Czy to coś zmieniło?”

**Headline**

If useful:

PL: **Ten region pokrywa się z częścią znalezionych śladów.**  
EN: **This region overlaps with part of the evidence we found.**

If no overlap:

> Nie znaleźliśmy wyraźnego pokrycia — pozostawiamy szerszy zakres researchu.

**Information**

- result changed / unchanged;
- number of relevant categories;
- not full premium content.

**CTA**  
`Zobacz raport / Preview report`

**Trust**  
Confidence.

**Animation**  
Map narrows 300 ms.

**Duration**  
5–10 s.

**Next**  
Cover preview.

**Analytics**  
`personalisation_result_view`

**Conversion role**  
Demonstrates value of own contribution.

---

# SCREEN 14 — Personalised Report Cover

**Purpose**  
Turn intangible research into an object.

**Question**  
„Co właściwie kupuję?”

**Headline**

Not needed beyond cover.

Cover:

```text
NAME ATLAS

[SURNAME]

ORIGIN
HISTORY
PLACES
ARCHIVES

RESEARCH EDITION
```

**Body**

PL: **Tak będzie wyglądać Twoja edycja raportu.**  
EN: **This is the preview of your report edition.**

**CTA**

`Zajrzyj do środka / Preview inside`

**Data**  
Surname + categories.

**Trust**  
Label clearly:

`Preview`

**Animation**  
Subtle parallax max 2–3 px, or none.

**Duration**  
5–10 s.

**Next**  
Report contents.

**Analytics**

`report_cover_view`  
`report_preview_start`

**Conversion role**  
Perceived ownership.

---

# SCREEN 15 — Report Contents / Research Preview

**Purpose**  
Prove exactly what is included.

**Question**  
„Za co zapłacę?”

**Headline**

PL: **Co zawiera pełny Atlas**  
EN: **What's inside the full Atlas**

**Information**

Editorial index:

```text
01 Origin                available
02 Modern geography      available
03 Historical variants   8 found
04 Historical places     4 found
05 Archives              11 potential refs
06 Migration             3 clues
07 Sources               included
```

No checkmark SaaS grid.

**CTA**

`Otwórz pełny Atlas / Open full Atlas`

**Secondary**

`Zobacz przykładową stronę / View sample page`

**Trust**

- source count;
- confidence coverage;
- one-time product.

**Duration**  
10–25 s.

**Next**  
Paywall.

**Failure**

If depth below quality threshold:

Do not show price.

> Nie mamy jeszcze wystarczającego materiału na pełny raport.

**Analytics**

`report_preview_view`  
`sample_page_open`  
`report_unlock_intent`

**Conversion role**  
Perceived value + transparency.

---

# SCREEN 16 — Paywall

**Purpose**  
Make purchase decision simple.

**Question**  
„Czy warto kontynuować?”

**Headline**

PL: **Otwórz kolejne rozdziały.**  
EN: **Open the next chapters.**

**Body**

> Pełny Name Atlas łączy znalezione warianty, miejsca, źródła i historyczne warstwy w jeden raport.

**Price**

`29 zł`

Under:

**Jednorazowa płatność · bez subskrypcji**  
**One-time payment · no subscription**

**CTA**

`Otwórz pełny Atlas — 29 zł`

**Secondary**

`Wróć do darmowego wyniku`

Links:

- Sample report;
- Methodology;
- Refund/data coverage;
- Privacy.

**Interaction**  
Bottom CTA in thumb zone.

**Data**  
Price + coverage.

**Trust**  
Mandatory.

**Animation**  
None.

**Duration**  
Decision-driven.

**Next**  
Checkout.

**Analytics**

`paywall_view`  
`paywall_cta`  
`paywall_close`

**Conversion role**  
Purchase.

---

# SCREEN 17 — Checkout

**Purpose**  
Remove all remaining uncertainty.

**Headline**

PL: **Twój Name Atlas**  
EN: **Your Name Atlas**

**Information**

```text
Full Name Atlas Report
29.00 PLN
VAT included / if applicable

ONE-TIME PAYMENT
```

Payment:

Apple Pay  
Google Pay  
Card.

**CTA**

Native payment or:

`Zapłać 29 zł / Pay 29 PLN`

**Secondary**  
Back.

**Trust**

- secure payment;
- refund/coverage policy;
- delivery method.

No testimonials here.

**Data**  
Checkout session.

**Duration**  
15–60 s.

**Next**  
Success.

**Failure**

Inline:

> Płatność nie została zakończona. Nie pobraliśmy środków.

**Analytics**

`checkout_start`  
`payment_method_selected`  
`purchase_complete`  
`purchase_failed`

**Conversion role**  
Final transaction.

---

# SCREEN 18 — Purchase Success

**Purpose**  
Turn transaction into emotional payoff.

**Headline**

PL: **Twój Atlas jest otwarty.**  
EN: **Your Atlas is open.**

**Body**

> Zacznijmy od najstarszego śladu, który udało się znaleźć.

**CTA**

`Otwórz raport / Open report`

Secondary:

`Wyślij kopię na email / Email me a copy`

**Optional account**

Only below:

> Chcesz zachować wszystkie przyszłe raporty? Utwórz konto.

**Animation**  
Cover opens / chapter line extends, 350–600 ms.

**Duration**  
3–8 s.

**Next**  
Premium report.

**Analytics**

`purchase_success_view`  
`report_open`

**Conversion role**  
Peak/end quality.

---

# SCREEN 19 — Premium Report Opening

**Purpose**  
Deliver value immediately.

**Headline**

PL: **Najstarsza warstwa Twojego Atlasu**  
EN: **The earliest layer of your Atlas**

Show strongest premium fact available.

Not generic introduction.

**CTA**  
Scroll.

**Trust**  
Source visible.

**Analytics**

`premium_section_view`

---

# SCREEN 20 — Premium Chapter Index

**Purpose**  
Allow random access after linear intro.

Mobile sheet:

```text
YOUR ATLAS

01 Origin
02 Places
03 Variants
04 Historical map
05 Archives
06 Migration
07 Sources
```

**Interaction**

tap → anchor.

**Navigation**

Sticky chapter indicator appears after first premium section.

---

# SCREEN 21 — Premium Exploration

Report chapters.

No more monetisation until user consumes content.

Track:

`premium_section_view`  
`premium_source_open`  
`historical_map_interaction`

---

# SCREEN 22 — Family Origin Transition

**Purpose**  
Change object of research.

**Headline**

PL: **To historia nazwiska. Następny krok to historia Twojej rodziny.**  
EN: **This is the history of the surname. The next step is your family's history.**

**Body**

> Jeśli podasz kilka informacji o rodzinie, możemy spróbować zawęzić research do konkretnej gałęzi.

**CTA**

`Sprawdź Family Origin / Explore Family Origin`

Secondary:

`Nie teraz`

**Analytics**

`family_origin_view`

---

# SCREEN 23 — Family Origin Start

**Purpose**  
Explain what changes.

**Information**

Need:

- region;
- approximate place;
- known migration;
- later grandparents info.

Price can be shown here:

`79 PLN`

But only after explaining deliverable.

---

# 5. BRANCHING FLOWS

## A. Very Rare Name

If `[COUNT] < threshold`:

Do not show celebratory „94/100”.

Use:

> **To nazwisko jest bardzo rzadkie w obecnym zbiorze.**

Possible flow:

Population  
→ geography if sufficient  
→ origin  
→ historical evidence.

Risk: revealing exact tiny geography can create privacy concerns. Aggregate low counts.

## B. Foreign Surname

If Polish dataset has little presence:

> **W Polsce znaleźliśmy niewiele współczesnych wystąpień. Poszerzamy analizę poza polski zbiór.**

Skip useless rarity if denominator inappropriate.

Origin may precede Polish map.

## C. Multiple Origins

Never collapse prematurely.

Use:

```text
Two plausible origin paths

A — linguistic
LIKELY

B — geographic
POSSIBLE
```

CTA:

`Compare evidence`

## D. No Etymology

Say:

> **Nie znaleźliśmy wiarygodnej etymologii.**

Then still show:

- count;
- map;
- variants;
- historical mentions if available.

Never LLM-fill.

## E. No Historical Records

Free flow ends after meaning/map.

Discovery Index:

> Modern data: strong  
> Historical depth: limited

No archive paywall.

Potentially offer:

> Notify me when new sources are added.

## F. Only Modern Data

Premium not offered.

Can show gift/share, recent searches.

## G. Conflicting Sources

This can be a strong credibility moment:

> **Źródła nie są zgodne.**

Show two interpretations with evidence.

## H. API Failure

Do not fail whole result.

Show:

> Regional distribution is temporarily unavailable.

Other sections continue.

Retry component only for failed source.

## I. Zero Premium Depth

No paywall.

This is non-negotiable.

## J. Unsupported script / transliteration

Preserve original input.

Optional:

> We also searched common transliterations.

Never silently normalize and overwrite user's name.

---

# 6. FIRST REVEAL ANALYSIS

| Candidate | Cognitive impact | Emotion | Trust | Share | Risk |
|---|---|---|---|---|---|
| Population | immediate, concrete | medium | **very high** | medium | common surname feels ordinary |
| Rarity | easy comparison | high | medium | **high** | can feel gamified |
| Origin | answers main question | high | medium | medium | probabilistic too early |
| Map | instantly comprehensible | **very high** | high | high | needs strong visual/data |
| Historical fact | surprise | high | medium | high | variable availability |

## Recommendation

### First factual reveal:
**Population**

### First WOW:
**Map immediately after population**

Why not map first?

Because one hard number creates a credibility anchor.

Sequence:

> `[COUNT] people carry this surname.`

**0.5–1 screen later**

> map.

This is stronger than forcing a single screen to do both jobs.

---

# 7. MAP UX

# Current Map

### Default state

Full-width, ~72–80vh.

Not an embedded 300 px Google-style map.

### Map language

- simplified country/region outlines;
- no roads;
- no POIs;
- no satellite;
- no standard pins;
- density dots / cells / contours;
- muted labels;
- one accent for concentration.

### Mobile controls

Bottom sheet:

```text
Top regions
1 [REGION]  [COUNT]
2 [REGION]  [COUNT]
3 [REGION]  [COUNT]
```

Swipe sheet up for full list.

### Gestures

Tap = inspect.  
Pinch = optional.  
Pan = yes, only if scale requires it.

Avoid requiring fine motor accuracy.

---

# Concentration

Use **rate + count** carefully.

Raw count can overemphasize populous regions.

Possible toggle:

`People` / `Concentration`

but only later.

MVP: raw count plus explanatory text.

---

# Historical Map

Premium.

Time navigation:

```text
1850 —— 1900 —— 1950 —— 2026
             ●
```

Large 44–48px touch rail.

Don't animate every intermediate year unless real data exists.

Discrete datasets only.

---

# Migration Map

Do not infer individual migration from distribution alone.

Label:

> **Population shift / distribution change**

Only call it `migration` when supported.

Visual:

line / arrow only when evidence.

---

# Map tooltip

Bottom, not floating tiny bubble.

```text
[REGION]
[COUNT] occurrences
[SHARE]% of current records

Source · [YEAR]
```

---

# Map accessibility

Under map always provide:

`View as list`

Screen reader receives ranked text, not thousands of points.

---

# Map → Timeline transition

Best version:

current dots freeze  
↓  
map simplifies  
↓  
year `[YEAR]` appears  
↓  
older distribution layer replaces current.

400–700 ms.

No cinematic 3-second transition.

---

# 8. RARITY

## How to calculate

### Recommended primary

**1 in X**

```text
total relevant population /
number of people with surname
```

Simple, comprehensible.

### Secondary

Percentile among surnames with ≥ minimum data quality.

> Rarer than 94% of surnames in this dataset.

### Optional tertiary

Rank.

### Avoid as primary

`94/100`

unless formula is explicitly defined.

If later used:

```text
Rarity Score =
100 - percentile of surname frequency
```

and clamp only after excluding unreliable micro-counts.

---

# Five visualisations

### 1. 1 in X — recommended

Huge:

**1 : 18,420**

### 2. Percentile line

```text
COMMON ─────────────●── RARE
                   94%
```

### 3. Distribution field

100 abstract dots, one emphasized.

More visually social, less analytically precise.

### 4. Rank

> #18,421 among surnames represented in the dataset

Good supplementary.

### 5. Score

`94 / 100`

Best for social sharing, weakest analytically.

Use only with methodology link.

---

# 9. ORIGIN / MEANING STATES

## VERIFIED

Use rarely.

```text
● VERIFIED

Documented origin
[TEXT]
```

Only direct strong source.

## LIKELY

Default for many etymologies.

```text
◐ LIKELY

Most evidence points to…
```

## POSSIBLE

```text
○ POSSIBLE

One plausible interpretation connects the name to…
```

## UNCONFIRMED

```text
·· UNCONFIRMED

A historical association exists, but current evidence is not strong enough to confirm it.
```

## One strong origin

One large proposition + evidence.

## Multiple possible origins

Do not stack cards.

Use branching visual:

```text
            [SURNAME]
             /     \
 linguistic       place-based
 LIKELY           POSSIBLE
```

## Conflicting sources

Headline:

> **Two sources tell different stories.**

Then explain difference.

This is a trust feature, not failure.

## Low confidence

No dramatic map/location.

Text-led.

## No reliable etymology

> **We don't have enough evidence to give this surname a reliable meaning.**

Then provide what is known.

---

# 10. HISTORY / TIMELINE UX

The most important transition in the whole free flow after the map.

### Phase 1
Current map.

### Phase 2
Sentence:

> **Today's distribution is only the latest layer.**

### Phase 3
Year appears.

### Phase 4
First variant.

### Phase 5
Timeline begins.

## Timeline mobile

Vertical is better.

```text
1850
│
│ [historical variant]
│
1902
│
│ [place/reference]
│
1945
│
2026
```

One side only.

Do not zig-zag left/right.

## Data certainty

Node styles:

solid = verified  
half = likely  
outline = possible.

Don't encode certainty only with color.

---

# 11. DISCOVERY INDEX — 5 VARIANTS

## A. Editorial Index — RECOMMENDED

Looks like book contents.

```text
FURTHER RESEARCH

01 Historical variants       08
02 Historical locations      04
03 Archive references        11
04 Migration clues           03
```

### CTA
`See the research scope`

### Trust
Small labels:

`potential` where necessary.

### Mobile
One list.

### Best for
General MVP.

## B. Atlas Chapters

```text
CHAPTER IV
Historical places
4 locations

CHAPTER V
Archive traces
11 potential references
```

### Strength
Emotion.

### Risk
Too literary if data weak.

## C. Evidence Stack

Each category appears as layered paper edge.

Tap stack → explanation of what category contains.

### Strength
Tangibility.

### Risk
Can become decorative.

## D. Historical Layers

Mini map layers stacked:

Current ✓  
1950 ✓  
Earlier distribution available  
Archives available.

### Best for
Map-heavy surname.

## E. Research Depth

Single vertical depth axis:

```text
NOW
│ population
│ geography
│ etymology
│ variants
│ locations
│ archives
▼
DEEPER
```

### Strength
Shows progression.

### Risk
Can resemble fake progress unless based on actual depth.

---

# 12. OPTIONAL PERSONALISATION

## Recommended moment

**After Discovery Index.**

Not earlier.

User already has:

- trust;
- free value;
- context.

## Q1 — Region

PL:

**Z jakim regionem najbardziej kojarzy się Twoja rodzina?**

EN:

**Which region is your family most closely associated with?**

Helper:

PL: Użyjemy tego do zawężenia mapy i źródeł.  
EN: We'll use this to narrow the map and historical sources.

Options:

region picker  
`Nie wiem`.

## Optional Q2 — Migration

Only if historical migration data matters:

PL: **Czy wiesz, czy ktoś z rodziny wyemigrował za granicę?**  
EN: **Do you know if someone in your family emigrated abroad?**

Options:

Yes  
No  
Not sure.

MVP: probably skip Q2.

## Privacy

Tiny expandable:

> Nie potrzebujemy jeszcze imion ani dat urodzenia.

This is reassuring.

---

# 13. PRE-PAYWALL — 5 OPTIONS

## A. Editorial Report Contents — BEST MVP

Already described.

**Best for:** everybody.

Why best:

- factual;
- transparent;
- easy to generate;
- scales with variable data.

## B. Personalised Cover

Book/object preview.

**Best for:** emotional/gift traffic.

Do not use alone. Pair with contents.

## C. Research Summary

Headline:

> **We checked [SOURCE_COUNT] source collections.**

Shows:

- useful collections;
- categories;
- uncertainty.

**Best for:** trust-heavy 35+ audience.

## D. Timeline Preview

Visible current → early timeline.

Premium chapters marked by available period, not blurry records.

**Best for:** surname with strong historical depth.

## E. Archive Desk

Research material arranged editorially.

Labels:

`Civil indexes`  
`Surname dictionary`  
`Migration dataset`

No fake documents.

**Best for:** premium perception.

## Recommendation

For MVP:

**Cover → Editorial Contents**

Two screens.

Not five.

---

# 14. PAYWALL — 5 MOBILE CONCEPTS

## 1. Report Unlock — RECOMMENDED

```text
OPEN THE FULL ATLAS

8 variants
4 historical places
11 archive references
3 migration clues

29 PLN
ONE-TIME
```

## 2. Research Unlock

Headline:

> **See what the research uncovered.**

Emphasizes work performed.

Best at 49+.

## 3. History Unlock

Visual timeline.

> **Continue beyond the modern map.**

Best for deep historical surnames.

## 4. Family Edition

Personal cover + dedication tone.

Best for gift.

Not primary surname paywall.

## 5. Discovery Summary

Huge number:

`26 further findings`

Then category split.

Strong conversion hypothesis, but only if counts are meaningful.

## Fullscreen?

**Yes.**

Why:

At this point user is making a separate decision.

But:

- visible Back/Close;
- state preserved;
- no modal trap.

# Price visibility

Not before report preview in default flow.

At report preview CTA:

> `Open full Atlas`

Then paywall immediately shows price.

Do not hide price behind checkout.

---

# 15. CHECKOUT

Structure:

```text
←

Your Name Atlas

Full research report

29.00 PLN
One-time payment

──────────────

[ Apple Pay ]

[ Google Pay ]

or

Card
[ number             ]
[ expiry ] [ CVC ]

──────────────

Secure payment
Coverage policy
Privacy

[ PAY 29 PLN ]
```

No:

- newsletter checkbox preselected;
- account password;
- order bump;
- 79 PLN upsell.

---

# 16. POST-PURCHASE

Best emotional transition:

> **Twój Atlas jest otwarty.**

Not:

> Order #29481 confirmed.

Then instantly reveal first premium-specific insight.

Example structure:

```text
EARLIEST AVAILABLE LAYER

[YEAR / PERIOD]

[Insight]

Source →
```

Email receipt happens in background.

Account creation after 1–2 report screens, optional.

---

# 17. FAMILY ORIGIN UPSELL

Do not show until user has viewed at least:

- one historic chapter;
- one archive/source chapter.

### Transition

PL:

**To historia nazwiska. Teraz możemy spróbować oddzielić historię Twojej rodziny.**

EN:

**This is the history of the surname. Now we can begin separating your family's own story.**

### Family Origin inputs

Phase 1:

- region;
- country;
- known migration.

Phase 2 after purchase:

- grandparent names;
- approximate years;
- places;
- maiden names.

### Price

79 PLN can be tested as initial personalized tier.

### Expected result

Must explicitly state:

> Family Origin narrows research. It does not guarantee identification of a specific ancestor.

---

# 18. SHARE FLOW

Share before paywall.

Never auto-open OS share sheet.

## Share 1 — Rarity

Tap `Share`.

Preview:

```text
MY SURNAME

1 in [X]

rarer than [Y]% of surnames
```

## Share 2 — Map

9:16 country map.

> Where my surname lives today

## Share 3 — Origin

> My surname most likely points to [REGION].

with `LIKELY`.

## Share 4 — Historical variant

> One historical spelling of my surname:

[VARIANT]

## Share 5 — Compare

Later feature:

two surname rarity side by side.

---

# 19. GIFT FLOW

```text
Gift Name Atlas
↓
Who is it for?
↓
Surname
↓
Data coverage check
↓
Gift report preview
↓
Dedication
↓
Digital / later physical
↓
Checkout
↓
Choose delivery
```

Important:

Check data depth **before** payment.

If weak surname:

> This name currently doesn't have enough depth for our full Gift Edition.

Trust over revenue.

---

# 20. EMPTY / ERROR / LOW-DATA STATES

## A. Surname not found

> **Nie znaleźliśmy tego nazwiska w obecnych zbiorach.**

Actions:

- check spelling;
- try alternate spelling;
- transliteration.

## B. Very rare

> **Znaleźliśmy bardzo niewiele współczesnych wystąpień.**

Avoid exact micro-location if privacy-sensitive.

## C. Foreign

> **To nazwisko jest słabo reprezentowane w polskich danych.**

Then global origin research.

## D. Multiple origins

Present alternatives.

## E. No etymology

> **Nie znaleźliśmy wiarygodnej etymologii.**

No guess.

## F. No history

> **W obecnych źródłach nie ma wystarczającej historycznej głębi.**

## G. Modern only

Skip paid historical report.

## H. Conflicting sources

Show conflict.

## I. API failure

Partial result with retry.

## J. Zero premium depth

No price.

CTA:

`Zapisz wynik`

Optional:

`Powiadom mnie, gdy dodamy nowe źródła.`

---

# 21. RETURNING USERS

No dashboard first.

Homepage changes subtly:

```text
Welcome back

Recent discoveries

[SURNAME A]
[SURNAME B]

[ Explore another surname ]
```

Later:

### Recent searches
max 3–5.

### Saved Names
only after explicit save/account.

### Compare
2 surnames.

### Family collection
not „workspace”.

Possible label:

**My Atlas**

not:

**Dashboard**

---

# 22. NAVIGATION

## A. Pure vertical

Excellent first visit.

Bad returning navigation.

## B. Sticky chapter indicator — RECOMMENDED

After screen ~5:

```text
03 / 08
ORIGIN
```

Tap opens mini index.

Top chrome remains extremely small.

## C. Bottom nav

Reject for main result.

Feels app-dashboard-like.

## D. Mini Atlas Index

Recommended secondary navigation.

Bottom sheet:

```text
Today
Map
Origin
History
Sources
```

## E. Swipe chapters

Reject as primary.

Harder accessibility/back mental model.

# Recommended

**Vertical narrative + sticky chapter label + tap-to-open mini index.**

# Back behavior

### Browser/app back

- if inside drawer → close drawer;
- if full map → return to map chapter;
- if paywall → return to prepaywall preserving scroll;
- if result root → return to search with previous surname still in input;
- never discard research silently.

---

# 23. MOTION SYSTEM

| Motion | Purpose | Duration | Trigger | Reduced motion |
|---|---|---:|---|---|
| Number count | reinforce scale | 500ms | reveal | static number |
| Map density reveal | geography understanding | 400ms | viewport | instant |
| Region focus | selected area | 250ms | tap | outline change |
| Present→past map | temporal transition | 600ms | scroll/CTA | crossfade |
| Variant morph | spelling continuity | 300ms | swipe | instant replace |
| Timeline extension | reveal chronology | 350ms | viewport | static line |
| Evidence drawer | source hierarchy | 250ms | tap | instant sheet |
| Cover open | purchase payoff | 450ms | success CTA | fade |
| Chapter transition | orientation | 200ms | anchor jump | instant |
| Share preview | preview formation | 250ms | tap | static |

No animation longer than ~700 ms in core discovery unless directly user-controlled.

---

# 24. ACCESSIBILITY

Concrete MVP checklist:

- minimum interactive target: **44×44 pt equivalent**;
- body text baseline ~16 px minimum;
- dynamic type support;
- text contrast ≥ WCAG AA target;
- confidence never communicated by color only;
- maps always have list/table equivalent;
- SVG map regions have accessible labels;
- `Reduce motion` removes count-up/morph/drawing;
- source drawer keyboard/screen-reader focus trapped correctly;
- full-screen map exit always visible;
- surname input handles diacritics;
- case-insensitive search but preserves original case;
- long labels wrap;
- no forced pinch gestures;
- bottom CTA never obscured by browser chrome/safe area;
- error copy descriptive, not color-only;
- loading status announced using live region;
- no autoscroll after result without explicit user action.

---

# 25. RESPONSIVE SURNAME TYPOGRAPHY

System needs to support:

`4 chars → 30+ chars`

### Rule

**≤10 chars**  
Display 48–64 px mobile.

**11–16**  
40–52 px.

**17–24**  
32–44 px.

**25+**  
26–36 px, max 2 lines.

### Never

- horizontal clipping;
- ellipsis on the surname hero;
- forced uppercase if script/culture makes it inappropriate.

### Line break

Prefer natural syllable/word-breaking only if surname contains space/hyphen.

For one long token:

use responsive scaling before arbitrary break.

### Future scripts

Design token:

`font-family-display-latin`  
`font-family-display-cyrillic`  
`font-family-display-greek`  
`font-family-display-cjk`

Brand cannot depend on one Latin-only display face.

---

# 26. COMPONENT INVENTORY

| Component | Purpose | States | Mobile sizing / behavior |
|---|---|---|---|
| `SurnameSearch` | primary input | idle/focus/error/loading | 52–56h |
| `SurnameHeader` | surname display | short/long/multiline | responsive type |
| `AnalysisStatus` | real backend steps | pending/complete/error | full width |
| `StatReveal` | one factual metric | number/text/unknown | min 70vh composition |
| `PopulationMetric` | count | exact/range/unavailable | large type |
| `RarityMetric` | 1:X / percentile | exact/limited | large type |
| `MapView` | distribution | current/historical/error | 70–100vh |
| `MapBottomSheet` | region details | collapsed/half/full | gesture sheet |
| `RegionLabel` | map annotation | selected/unselected | 44 tap |
| `EvidenceBadge` | certainty | verified/likely/possible/unconfirmed | icon + text |
| `EvidenceDrawer` | show reasoning | closed/open | bottom sheet |
| `SourceRow` | citation | primary/secondary/conflicting | expandable |
| `HistoricalVariant` | spelling variant | visible/locked/not found | swipe item |
| `Timeline` | chronology | current/historic | vertical mobile |
| `TimelineNode` | historical event | certainty levels | min 44 tap |
| `DiscoveryIndex` | deeper findings | rich/limited/none | list |
| `DiscoveryRow` | category + count | exact/potential | no SaaS card |
| `FamilyQuestion` | personalization | blank/selected/skipped | full-width |
| `ReportCover` | perceived object | generic/personalised/gift | ~70vh |
| `ReportContents` | premium scope | full/limited | editorial list |
| `Paywall` | purchase decision | 29/49/etc. | fullscreen |
| `PaymentCTA` | final payment | enabled/loading/error | sticky bottom 56h |
| `CheckoutSummary` | order details | tax variants | simple |
| `ShareCardPreview` | social creative | 5 themes | 9:16 preview |
| `TrustNote` | methodology/privacy | compact/expanded | inline |
| `EmptyState` | missing data | 10 semantic variants | contextual |
| `ChapterIndicator` | orientation | collapsed/open | sticky top |
| `AtlasIndexSheet` | navigation | free/premium chapters | bottom sheet |
| `GiftDedication` | gift note | blank/filled | textarea |
| `SaveAtlasPrompt` | email save | optional/saved | inline |

---

# 27. ANALYTICS EVENTS

## Acquisition

`landing_view`  
`surname_search_start`  
`surname_search_submit`

Properties:

- locale;
- acquisition source;
- no raw surname in analytics unless strictly necessary and privacy-approved.

## Result

`surname_result_success`  
`surname_result_partial`  
`surname_result_failure`

## Discovery

`population_view`  
`rarity_view`  
`rarity_methodology_open`  
`map_view`  
`map_interaction`  
`region_open`  
`origin_view`  
`origin_evidence_open`  
`meaning_view`  
`source_open`  
`history_transition_view`  
`variant_view`  
`variant_swipe`

## Sharing

`share_preview`  
`share_asset_selected`  
`share_start`  
`share_complete`

## Curiosity

`discovery_index_view`  
`discovery_item_click`  
`discovery_continue`

## Personalisation

`personalisation_start`  
`personalisation_answer`  
`personalisation_skip`  
`personalisation_complete`

Do not send raw family place unnecessarily; use coarse encoded region only if needed.

## Monetisation

`report_cover_view`  
`report_preview_view`  
`sample_report_open`  
`paywall_view`  
`paywall_cta`  
`paywall_close`  
`checkout_start`  
`payment_method_selected`  
`purchase_complete`  
`purchase_failed`

## Premium

`report_open`  
`premium_section_view`  
`premium_source_open`

## Higher tier

`family_origin_view`  
`family_origin_start`  
`family_origin_purchase_start`  
`family_origin_purchase_complete`

---

# 28. FRICTION AUDIT

| Screen | Friction | Risk | Keep? |
|---|---|---|---|
| Search | Low | unclear proposition | MUST |
| Analysis | Low | fake delay | conditional |
| Population | Very low | weak WOW | MUST |
| Map | Low | performance | MUST |
| Rarity | Low | gimmicky score | MUST, simplified |
| Origin | Medium cognitive | uncertainty | MUST |
| Meaning | Medium reading | too much text | MUST |
| History transition | Low | ornamental | SHOULD |
| Variants | Low | low-data cases | MUST if data |
| Share | Low | can distract | SHOULD |
| Discovery Index | Low | too salesy | MUST |
| Personalisation | Medium | privacy/dropoff | SHOULD/MVP test |
| Personalisation result | Low | redundant if weak | merge possible |
| Cover | Low | cosmetic | SHOULD |
| Report contents | Medium reading | long | MUST |
| Paywall | High decision | abandonment | MUST |
| Checkout | High | payment | MUST |
| Success | Low | none | MUST |
| Premium intro | Low | slow delivery | MUST |
| Premium index | Low | complexity | SHOULD |
| Family upsell | Medium | too early | LATER |

### Screens most likely redundant

Personalisation result can merge with cover.

History transition can be a scroll scene, not dedicated route.

Free summary + share can merge with rarity/map share affordance.

Premium index can be embedded in report header.

---

# 29. EMOTIONAL CURVE

```text
01 Search
CURIOUS
│
02 Analysis
ANTICIPATION
│
03 Population
RECOGNITION
│
04 Map
WOW / CONNECTION
│
05 Rarity
IDENTITY
│
06 Origin
UNDERSTANDING
│
07 Meaning
SATISFACTION
│
08 History transition
RENEWED CURIOSITY
│
09 Variants
SURPRISE
│
10 Share
OWNERSHIP / PRIDE
│
11 Discovery Index
INFORMATION GAP
│
12 Personalisation
INVESTMENT
│
14 Cover
OWNERSHIP
│
15 Contents
PERCEIVED VALUE
│
16 Paywall
DECISION
│
17 Checkout
TRUST
│
18 Success
RELIEF / ANTICIPATION
│
19 Premium
PAYOFF
```

Only two strong WOW moments are needed:

1. map;
2. first meaningful historical/premium finding.

Not every screen should be spectacular.

---

# 30. USER JOURNEY TIME

## Fast User

Goal: „ile osób / skąd”.

Path:

Search  
→ Count  
→ Map  
→ Rarity  
→ Origin  
→ Meaning  
→ exit.

**Screens:** 6–7  
**Taps:** 1–2  
**Session:** ~45–90 s  
**Friction:** almost none.

Must not force paywall.

## Curious User

Entire free narrative.

**Screens:** ~10–12  
**Taps:** 3–6  
**Session:** ~2–4 min  
**Friction:** optional source opens / share.

Likely sees Discovery Index.

## Premium-intent

Search → full flow → checkout.

**Screens:** ~16–18  
**Taps:** ~7–12  
**Session:** ~3–7 min before purchase.

Main drop points:

- weak meaning;
- Discovery Index feels fake;
- personalisation question;
- price;
- payment.

---

# 31. ASCII WIREFRAMES

## 1. LANDING

```text
┌──────────────────────────────────┐
│ NAME ATLAS                       │
│                                  │
│                                  │
│ Każde nazwisko                   │
│ gdzieś się zaczęło.              │
│                                  │
│ Odkryj jego pochodzenie,         │
│ miejsca i historię.              │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Wpisz nazwisko             →│ │
│ └──────────────────────────────┘ │
│                                  │
│ Oparte na danych i źródłach      │
│ historycznych                    │
└──────────────────────────────────┘
```

## 2. ANALYSIS

```text
┌──────────────────────────────────┐
│ NAME ATLAS                       │
│                                  │
│ Budujemy Twój Atlas…             │
│                                  │
│ ● Population data             ✓  │
│ │                                │
│ ● Geographic distribution     ✓  │
│ │                                │
│ ○ Linguistic sources           …  │
│ │                                │
│ ○ Historical variants         …  │
│                                  │
└──────────────────────────────────┘
```

## 3. POPULATION

```text
┌──────────────────────────────────┐
│ 01 / TODAY                       │
│                                  │
│                                  │
│          [COUNT]                 │
│                                  │
│      osób nosi dziś              │
│      to nazwisko                 │
│      w Polsce                    │
│                                  │
│                                  │
│ Source · [YEAR]              →   │
│                                  │
│                     scroll ↓     │
└──────────────────────────────────┘
```

## 4. RARITY

```text
┌──────────────────────────────────┐
│ 02 / RARITY                      │
│                                  │
│                                  │
│          1 : [X]                 │
│                                  │
│   około 1 na [X] osób            │
│   nosi to nazwisko               │
│                                  │
│ COMMON ───────────────●── RARE   │
│                       [P]%       │
│                                  │
│ Jak to liczymy?              →   │
└──────────────────────────────────┘
```

## 5. MAP

```text
┌──────────────────────────────────┐
│ 03 / MAP                         │
│                                  │
│     Where the surname            │
│     lives today                  │
│                                  │
│          ·    ●                  │
│       · ●●  ·                    │
│      [ MAP AREA ]                │
│          ●●●                     │
│                                  │
│ ───────────────────────────────  │
│ [REGION]                         │
│ strongest concentration         │
│                                  │
│ View regions                 ↑   │
└──────────────────────────────────┘
```

## 6. ORIGIN

```text
┌──────────────────────────────────┐
│ 04 / ORIGIN                      │
│                                  │
│ Prawdopodobne pochodzenie        │
│                                  │
│ [REGION / LANGUAGE / TYPE]       │
│                                  │
│ ◐ PRAWDOPODOBNE                  │
│                                  │
│ Krótka interpretacja oparta      │
│ na kilku źródłach.               │
│                                  │
│ Dlaczego tak sądzimy?        →   │
│ Źródła                       →   │
└──────────────────────────────────┘
```

## 7. HISTORICAL VARIANTS

```text
┌──────────────────────────────────┐
│ 06 / THROUGH TIME                │
│                                  │
│ Nazwisko zmieniało pisownię.     │
│                                  │
│         [VARIANT 01]             │
│                ↓                 │
│         [VARIANT 02]             │
│                                  │
│       + [N] further variants     │
│          found                   │
│                                  │
│ Source · period              →   │
└──────────────────────────────────┘
```

## 8. DISCOVERY INDEX

```text
┌──────────────────────────────────┐
│ FURTHER RESEARCH                 │
│                                  │
│ Znaleźliśmy również dalsze       │
│ ślady tego nazwiska.             │
│                                  │
│ 01 Historical variants       08  │
│ ───────────────────────────────  │
│ 02 Historical locations      04  │
│ ───────────────────────────────  │
│ 03 Archive references        11  │
│ ───────────────────────────────  │
│ 04 Migration clues           03  │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ZOBACZ ZAKRES RESEARCHU   → │ │
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

## 9. PERSONALISATION

```text
┌──────────────────────────────────┐
│ Refine your Atlas                │
│                                  │
│ Z jakim regionem najbardziej     │
│ kojarzy się Twoja rodzina?       │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ Wybierz region             ↓│ │
│ └──────────────────────────────┘ │
│                                  │
│ Nie wiem                         │
│                                  │
│ Użyjemy tego wyłącznie do        │
│ zawężenia mapy i źródeł.         │
│                                  │
│ [ ZAWĘŹ WYNIK ]                  │
│                                  │
│ Pomiń                            │
└──────────────────────────────────┘
```

## 10. REPORT PREVIEW

```text
┌──────────────────────────────────┐
│                                  │
│           NAME ATLAS             │
│                                  │
│          [SURNAME]               │
│                                  │
│         ORIGIN                   │
│         HISTORY                  │
│         PLACES                   │
│         ARCHIVES                 │
│                                  │
│      RESEARCH EDITION            │
│                                  │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ ZAJRZYJ DO ŚRODKA         → │ │
│ └──────────────────────────────┘ │
│                                  │
│ Preview                          │
└──────────────────────────────────┘
```

## 11. PRE-PAYWALL

```text
┌──────────────────────────────────┐
│ WHAT'S INSIDE                    │
│                                  │
│ 01 Origin                 OPEN   │
│ 02 Current geography      OPEN   │
│ 03 Meaning                OPEN   │
│                                  │
│ 04 Historical variants   8 FOUND│
│ 05 Historical places     4 FOUND│
│ 06 Archive refs         11 FOUND│
│ 07 Migration clues       3 FOUND│
│ 08 Sources               INCLUDED│
│                                  │
│ View sample page             →   │
│                                  │
│ [ OPEN FULL ATLAS ]              │
└──────────────────────────────────┘
```

## 12. PAYWALL

```text
┌──────────────────────────────────┐
│ ←                                │
│                                  │
│ Otwórz kolejne rozdziały.        │
│                                  │
│ Historical variants        8     │
│ Historical locations       4     │
│ Archive references        11     │
│ Migration clues            3     │
│ Complete sources           ✓     │
│                                  │
│              29 zł               │
│       JEDNORAZOWA PŁATNOŚĆ       │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ OTWÓRZ PEŁNY ATLAS — 29 zł │ │
│ └──────────────────────────────┘ │
│                                  │
│ Sample · Methodology · Privacy   │
│ Bez subskrypcji                  │
└──────────────────────────────────┘
```

## 13. CHECKOUT

```text
┌──────────────────────────────────┐
│ ← Checkout                       │
│                                  │
│ Your Name Atlas                  │
│ Full research report             │
│                                  │
│ 29.00 PLN                        │
│ One-time payment                 │
│                                  │
│ ┌──────────────────────────────┐ │
│ │         APPLE PAY           │ │
│ └──────────────────────────────┘ │
│                                  │
│ ┌──────────────────────────────┐ │
│ │         GOOGLE PAY          │ │
│ └──────────────────────────────┘ │
│                                  │
│ ─────────── OR ────────────────  │
│                                  │
│ Card number                      │
│ [                            ]   │
│                                  │
│ Coverage policy · Privacy        │
└──────────────────────────────────┘
```

## 14. PURCHASE SUCCESS

```text
┌──────────────────────────────────┐
│                                  │
│                                  │
│      TWÓJ ATLAS JEST             │
│          OTWARTY.                │
│                                  │
│                                  │
│ Zacznijmy od najstarszego        │
│ dostępnego śladu.                │
│                                  │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ OTWÓRZ RAPORT             → │ │
│ └──────────────────────────────┘ │
│                                  │
│ Wyślij kopię na email            │
└──────────────────────────────────┘
```

## 15. PREMIUM REPORT

```text
┌──────────────────────────────────┐
│ 05 / HISTORICAL LAYERS       ☰   │
│                                  │
│ EARLIEST AVAILABLE TRACE         │
│                                  │
│             [YEAR]               │
│                                  │
│ [historical insight]             │
│                                  │
│ ───────────────────────────────  │
│                                  │
│ Evidence                         │
│ ◐ LIKELY                         │
│                                  │
│ Source 01                    →   │
│ Source 02                    →   │
│                                  │
│                         scroll ↓ │
└──────────────────────────────────┘
```

## 16. FAMILY ORIGIN UPSELL

```text
┌──────────────────────────────────┐
│ YOUR FAMILY                      │
│                                  │
│ To historia nazwiska.            │
│                                  │
│ Następny krok to sprawdzić,      │
│ które z tych śladów mogą         │
│ dotyczyć Twojej rodziny.         │
│                                  │
│ FAMILY ORIGIN                    │
│                                  │
│ • family region                  │
│ • known places                   │
│ • migration clues                │
│ • targeted archives              │
│                                  │
│ ┌──────────────────────────────┐ │
│ │ SPRAWDŹ FAMILY ORIGIN      →│ │
│ └──────────────────────────────┘ │
│                                  │
│ Nie teraz                        │
└──────────────────────────────────┘
```

---

# 32. MVP CUT — 2–4 WEEKS

## MUST HAVE

### Product

1. Landing/search.
2. Real analysis state.
3. Population.
4. Current map.
5. Rarity / 1:X.
6. Origin.
7. Meaning.
8. Confidence system.
9. Sources drawer.
10. 1–2 historical variants.
11. Discovery Index.
12. Report contents preview.
13. Paywall.
14. Checkout.
15. Purchase success.
16. Premium report basic renderer.
17. Low-data states.
18. Zero-premium-depth logic.
19. Core analytics.

### Why

To test fundamental loop:

**search → value → curiosity → payment.**

## SHOULD HAVE

1. Share cards.
2. Personalised cover.
3. One personalization question.
4. Chapter index.
5. Recent searches.
6. Historical timeline.
7. Email save.
8. Apple/Google Pay if implementation permits.
9. Gift entry point.

## LATER

1. Migration animation.
2. Historical map slider.
3. Compare surnames.
4. Family workspace.
5. Family Origin 79 PLN.
6. Deep Research 199 PLN.
7. Human research handoff.
8. Physical books.
9. Multiple country datasets.
10. Complex animated transitions.

---

# 33. DIRECT ANSWERS TO THE 25 KEY QUESTIONS

### 1. First WOW?
**Current geographic map.**

But population count appears immediately before it.

### 2. When map?
Second substantive discovery.

### 3. When rarity?
After map.

### 4. When origin?
After two hard-data screens: population + map/rarity.

### 5. How much free?
Enough to fully answer:

- how common;
- where today;
- basic origin;
- meaning;
- confidence;
- 1–2 historical variants.

### 6. First hint of more data?
Historical variants screen.

First explicit sales-oriented awareness:
Discovery Index.

### 7. Share?
Immediately before Discovery Index.

### 8. Family information?
After Discovery Index, optionally.

### 9. Scroll or screens?
**Vertical scroll with near-fullscreen narrative sections.**

Not mandatory swipe.

### 10. Separate report preview?
Yes.

### 11. Personalised cover?
Useful as perceived-object layer, but **hypothesis**, not necessity. A/B test.

### 12. Fullscreen paywall?
Yes.

### 13. Price earlier?
Not on free history. Show immediately on dedicated paywall after report contents.

### 14. Sources?
Contextually under each interpretive insight + full Sources chapter.

### 15. Premium without SaaS?
Talk in terms of:

- chapters;
- historical layers;
- research;
- sources;
- edition.

Never `PRO`.

### 16. Low-data surnames?
Compress flow and explicitly state limits.

### 17. When no paywall?
Whenever minimum meaningful premium threshold is not met.

### 18. surname → family?
Only after user understands surname-level history.

### 19. Back?
Restores previous chapter/state. Never loses research.

### 20. Quick chapter return?
Sticky chapter indicator → mini Atlas Index.

### 21. One-hand?
Bottom actions, large controls, no essential top-corner actions except back/menu.

### 22. Sticky?
Sticky:

- checkout CTA;
- chapter indicator;
- maybe map sheet handle.

Not sticky:
premium CTA across free flow.

### 23. Biggest drop points?
- slow lookup;
- weak/uncertain origin;
- unnecessary email;
- personalisation question;
- unclear premium scope;
- checkout.

### 24. Probably redundant screens?
- dedicated personalisation result;
- standalone history intro;
- separate free summary if share can live in rarity/map;
- premium index as route.

### 25. Simplest flow without losing emotion?

```text
Search
↓
Count
↓
Map
↓
Rarity
↓
Origin + Meaning
↓
Historical variants
↓
Share
↓
Discovery Index
↓
Report Preview
↓
Paywall
↓
Checkout
↓
Premium
```

That is the **leanest strong version**.

---

# 34. FINAL RECOMMENDATION — ONE FLOW

If I were handing one definitive wireflow to Figma tomorrow, it would be:

## SCREEN 01
**Search**

> Każde nazwisko gdzieś się zaczęło.

↓

## SCREEN 02
**Conditional real analysis**

Only as long as backend actually needs.

↓

## SCREEN 03
**Population**

First credibility hit.

↓

## SCREEN 04
**Current map**

First emotional WOW.

↓

## SCREEN 05
**Rarity / 1 in X**

Identity/shareable context.

↓

## SCREEN 06
**Origin + confidence**

Interpretation only after hard facts.

↓

## SCREEN 07
**Meaning + sources**

Fulfil landing promise.

↓

## SCREEN 08
**Present → past transition**

Short, integrated scroll scene.

↓

## SCREEN 09
**1–2 historical variants**

First proof of deeper history.

↓

## SCREEN 10
**Share**

Optional, unobtrusive.

↓

## SCREEN 11
**Discovery Index**

> 8 variants  
> 4 places  
> 11 archive references  
> 3 migration clues

This is the key conversion bridge.

↓

## SCREEN 12
**Optional region question**

Only if backend can use it meaningfully.

Otherwise skip entirely.

↓

## SCREEN 13
**Personalised cover**

Make report tangible.

↓

## SCREEN 14
**Report contents / research scope**

Exactly show what exists.

↓

## SCREEN 15
**Paywall**

**29 PLN test control**  
One-time.  
No subscription.

↓

## SCREEN 16
**Guest checkout**

Apple Pay / Google Pay / card.

↓

## SCREEN 17
**Twój Atlas jest otwarty**

Emotional completion.

↓

## SCREEN 18
**First premium discovery**

Immediate payoff.

↓

## SCREEN 19+
**Full report**

Only after meaningful consumption:

↓

## FAMILY ORIGIN

> To była historia nazwiska.  
> Teraz możemy zacząć badać historię Twojej rodziny.

---

Najważniejsza decyzja całego projektu:

**Nie projektowałbym Name Atlas jako 20 ekranów, przez które użytkownik musi klikać.**

Projektowałbym go jako **jedną płynną, pionową publikację mobilną**, wewnątrz której istnieją pełnoekranowe „moments”. Technicznie może to być kilkanaście komponentów/sekcji, ale użytkownik powinien czuć, że **przewija historię**, a nie przechodzi onboarding.

To jest różnica między:

> „aplikacją z danymi o nazwisku”

a

> **„interaktywnym atlasem własnego nazwiska”.**
