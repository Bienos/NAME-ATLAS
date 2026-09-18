# NAME ATLAS — PAYWALL SYSTEM  
### Research + monetisation architecture + UX specification  
**Poland-first / global-ready / mobile-first**

## 1. EXECUTIVE SUMMARY

### FACT
Najlepsze benchmarki w genealogy i „personal report products” nie zarabiają głównie na **ukrywaniu odpowiedzi**, tylko na zwiększaniu głębokości odpowiedzi.

Ancestry pozwala zacząć drzewo, a płatność otwiera rekordy i Hints; Geneanet ma darmowe drzewo, ale płatne zaawansowane wyszukiwanie i automatyczne dopasowania; Findmypast pozwala wyszukiwać część kolekcji, a Premium otwiera dokumenty; autoDNA pokazuje przed zakupem **dokładnie, jakie sekcje danych są dostępne dla konkretnego VIN-u**. To ostatnie jest szczególnie dobrym wzorcem dla Name Atlas. ([ancestry.com](https://www.ancestry.com/c/ancestry-family?utm_source=chatgpt.com))

### FACT
Polski `surname.pl` już testuje bardzo zbliżony model: darmowa baza nazwisk + planowany raport za **29 zł**, a raport nie jest oferowany, gdy brak wystarczających danych archiwalnych. Serwis pokazuje przed zakupem dokładny zakres raportu, sample PDF, ograniczenia źródeł i informację, których sekcji nie może dostarczyć. ([surname.pl](https://surname.pl/raport?utm_source=chatgpt.com))

### RECOMMENDATION
Name Atlas powinien zrobić to samo, ale znacznie lepiej na poziomie:

- personalizacji;
- storytellingu;
- UX;
- map;
- evidence/confidence;
- przejścia `surname → family`;
- wartości premium.

Kluczowy model:

**FREE**
→ odpowiedź na podstawowe pytanie

**PREMIUM**
→ dodatkowy research o nazwisku

**FAMILY**
→ personalizacja na podstawie regionu/rodziny

**DEEP**
→ potencjalne rekordy konkretnej gałęzi

**HUMAN**
→ weryfikacja i research ręczny.

---

## Najważniejsza decyzja

### RECOMMENDATION

Pierwszy paywall nie powinien mieć trzech planów.

Powinien sprzedawać **jeden produkt**:

# Full Name Atlas

Cena testowa:

**29 PLN vs 49 PLN**

Dopiero po zakupie i skonsumowaniu raportu:

**Family Origin — 79 PLN**

następnie:

**Deep Family Research — 199 PLN**

następnie:

**Human Research — quote / 600+ PLN**

Powód jest prosty: użytkownik, który dopiero sprawdził nazwisko, nie zna jeszcze różnicy między 4 produktami. Pokazywanie mu od razu pricing table zwiększa cognitive load.

---

# PAYWALL PRINCIPLE

Paywall nie powinien komunikować:

> **„Tego nie możesz zobaczyć.”**

Powinien komunikować:

> **„To udało nam się znaleźć dalej.”**

Różnica jest fundamentalna.

---

# 2. MARKET BENCHMARK — 29 PAYWALL / MONETISATION SYSTEMS

`n/d` = nie znalazłem wiarygodnej publicznej informacji; nie zgaduję.

| Produkt | Free / pre-paywall value | Premium moment | Cena / model | Trial | Preview / trust | Najważniejsza lekcja dla Name Atlas |
|---|---|---|---|---|---|---|
| **Ancestry Family History** | tree, onboarding, discoveries | records / Hints | od **$24.99/mies.** | 14 dni | billions of records, Hint preview | użytkownik najpierw tworzy kontekst, później odblokowuje dowody ([ancestry.com](https://www.ancestry.com/c/ancestry-family?utm_source=chatgpt.com)) |
| **Ancestry + DNA** | opis benefits | records + DNA insights | od **$100 bundle** | membership trial zależny od offer | origins, matches, journeys | silny bundle komplementarnych produktów ([ancestry.com](https://www.ancestry.com/c/dna/bundle?geo-lang=pl&utm_source=chatgpt.com)) |
| **Ancestry gift** | gift explanation | access to research | $119–499 zależnie planu/czasu | nie | jasny gift framing | osobny gift funnel ma sens ([ancestry.com](https://www.ancestry.com/c/gift-selection?utm_source=chatgpt.com)) |
| **MyHeritage Basic** | tree do 250 osób | deeper tree/records | free → annual plans | zależnie offer | free meaningful product | nie niszczyć free tieru ([myheritage.com](https://www.myheritage.com/help/en/articles/12852341-is-myheritage-free?utm_source=chatgpt.com)) |
| **MyHeritage Complete** | tree + some tools | 33.8B records, matches, AI | annual, lokalna cena | n/d | feature depth | płatność za breadth + automation ([myheritage.com](https://www.myheritage.com/help/en/articles/12852542-what-is-the-myheritage-complete-plan?utm_source=chatgpt.com)) |
| **MyHeritage Reimagine** | limited scans/enhancement | unlimited | $49.99/year / $7.99 month | 7 dni annual | user experiences feature first | bardzo dobry try-before-buy pattern ([myheritage.com](https://www.myheritage.com/help/en/articles/12852244-how-much-does-reimagine-cost?utm_source=chatgpt.com)) |
| **MyHeritage Gift** | product preview | non-recurring Complete | promo ~$99 | nie | jasno: one-time gift | prezent ≠ automatyczna subskrypcja ([myheritage.com](https://www.myheritage.com/help/en/articles/12852545-what-is-the-myheritage-gift-membership?utm_source=chatgpt.com)) |
| **Geneanet Premium** | unlimited tree | advanced search, Hints, alerts | ~€55/year | n/d | side-by-side FREE/Premium | premium = narzędzia badawcze, nie samo drzewo ([en.geneanet.org](https://en.geneanet.org/premium/?type=header&utm_source=chatgpt.com)) |
| **Findmypast** | free search / some results | record access | np. Essential $159.99/y, Premium $299.99/y US benchmark | free trials | full price before confirmation | płatność za evidence access ([findmypast.com](https://www.findmypast.com/help/articles/360009238938?utm_source=chatgpt.com)) |
| **Findmypast PayAsYouGo** | search | pojedynczy record | np. $3.50 transcription / $4.90 image | nie | pay-per-record | credits/micropayment mają sens dla deep research, nie MVP ([findmypast.com](https://www.findmypast.com/help/articles/360009238938?utm_source=chatgpt.com)) |
| **Newspapers.com** | search pages | full article/archive | current price n/d | „Try it free” | publication/page coverage | teaser powinien pokazywać istnienie wyniku ([app.newspapers.com](https://app.newspapers.com/plans/?locale=en-US&utm_source=chatgpt.com)) |
| **FamilyTreeDNA Family Finder** | education | DNA result | $79 | nie | clear use case | każda oferta mówi „best for…” ([familytreedna.com](https://www.familytreedna.com/products/family-finder?utm_source=chatgpt.com)) |
| **FamilyTreeDNA Y/mtDNA** | education | deeper specific lineage | $119–449+ | nie | clear research depth | higher price = clearly deeper research ([blog.familytreedna.com](https://blog.familytreedna.com/wp-content/uploads/2026/03/RootsTech-2026-Promo-Codes-Virtual.pdf?utm_source=chatgpt.com)) |
| **23andMe Premium Ancestry** | basic ancestry already owned | historical matches, reconstructed ancestors | **€99/year** EU | nie | exact features | recurring only because value keeps evolving ([eu.customercare.23andme.com](https://eu.customercare.23andme.com/hc/en-us/articles/41497575790743-About-Premium-Ancestry?utm_source=chatgpt.com)) |
| **23andMe Health Upgrade** | ancestry results | health reports | ~€90 add-on | nie | explicit upgrade | natural cross-sell after value consumed ([eu.customercare.23andme.com](https://eu.customercare.23andme.com/hc/en-us/articles/115013698987-Adding-Health-Reports-to-the-Ancestry-Service?utm_source=chatgpt.com)) |
| **Geni Basic → Pro** | unlimited profiles/basic tree | Tree Matches, search, support | $149/year | n/d | feature comparison | access/automation premium ([help.geni.com](https://help.geni.com/hc/en-us/articles/229706167-Is-Geni-free?utm_source=chatgpt.com)) |
| **House of Names** | surname history search | digital artifact/crest/report | ~$10–12+ digital | nie | product previews + reviews | surname curiosity monetised as artifact ([houseofnames.com](https://www.houseofnames.com/cards/english/ps/jpg-products?utm_source=chatgpt.com)) |
| **Forebears OnoGraph** | 100 queries/day | volume data access | $1–3 / 1k queries | free tier | no recurring billing | transparent usage pricing ([forebears.io](https://forebears.io/onograph/?utm_source=chatgpt.com)) |
| **surname.pl** | PESEL, geography, etymology, free | archival report | **29 zł planned** | nie | sample PDF + exact coverage | **najbliższy bezpośredni benchmark** ([surname.pl](https://surname.pl/raport?utm_source=chatgpt.com)) |
| **16Personalities Career Suite** | full personality result first | 40+ page career report + AI mentors | **$29 one-off** | nie | 30-day guarantee, testimonials | bardzo mocny analog Name Atlas ([16personalities.com](https://www.16personalities.com/pl/pakiet-kariery-premium?utm_source=chatgpt.com)) |
| **16Personalities Pro Suite** | free identity product | deeper all-type tools | €99 | nie | testimonials + guarantee | premium framed as expansion, not withheld result ([16personalities.com](https://www.16personalities.com/premium/pro-suite?utm_source=chatgpt.com)) |
| **CliftonStrengths Top 5** | assessment | personalised result | **95 PLN** | nie | report screenshots | report itself is tangible product ([store.gallup.com](https://store.gallup.com/en-PL/product/cliftonstrengths-top-5/01tPa00000QhS6yIAF?utm_source=chatgpt.com)) |
| **CliftonStrengths 34** | Top 5 available | complete ranking | **230 PLN**, upgrade 190 | nie | sample report | excellent `partial → full depth` ladder ([store.gallup.com](https://store.gallup.com/en-PL/?utm_source=chatgpt.com)) |
| **Function Health** | detailed product explanation | 160+ tests + interpretation | **$365/year** | nie | clinicians, transparent comparison | anchor price against alternative cost; clarity of scope ([functionhealth.com](https://www.functionhealth.com/article/function365?utm_source=chatgpt.com)) |
| **InsideTracker Membership** | education/demo | analysis platform | **$149/year** | n/d | personalized analysis explanation | charge for interpretation, not raw data ([store.insidetracker.com](https://store.insidetracker.com/products/insidetracker-membership?utm_source=chatgpt.com)) |
| **InsideTracker Ultimate** | membership | actual test + interpretation | **$489** | nie | clearly itemized depth | ladder by cost-to-produce ([store.insidetracker.com](https://store.insidetracker.com/?utm_source=chatgpt.com)) |
| **carVertical** | input VIN + categories report may contain | full history | dynamic / market-dependent; bundles | nie | 1,000+ sources, 6M users | report is framed as data procurement cost, not lock removal ([carvertical.com](https://www.carvertical.com/pl/pricing?utm_source=chatgpt.com)) |
| **autoDNA** | exact availability by VIN | full report | **€24.99**, 2×€39.99, 3×€49.99 | nie | sample report + exact data available | **najlepszy benchmark data-adaptive paywall** ([support.autodna.com](https://support.autodna.com/?utm_source=chatgpt.com)) |
| **BeenVerified** | search/query | full report | app offers $9.99–$67.99 | varies | limited | useful anti-pattern: subscription ambiguity risk ([apps.apple.com](https://apps.apple.com/us/app/beenverified-people-search/id342585873?platform=tv&utm_source=chatgpt.com)) |
| **TruthFinder** | search | report/membership | ~$19.99–$67.99 app offers | varies | full billing terms required | high dark-pattern risk; do not copy prolonged search/negative-option feel ([apps.apple.com](https://apps.apple.com/us/app/truthfinder-search/id1176720873?utm_source=chatgpt.com)) |
| **PeopleFinders** | search | report or membership | $1.99 report, $9.99 background, memberships | varies | multiple levels | one-off purchase alongside membership reduces forced-subscription problem ([apps.apple.com](https://apps.apple.com/us/app/peoplefinders-people-search/id1444840083?platform=watch&utm_source=chatgpt.com)) |
| **Storyworth** | product explanation | year of stories + book | **$69 / 99 / 199** | nie | physical outcome | excellent premium ladder + gift narrative ([help.storyworth.com](https://help.storyworth.com/en_US/book-pricing?utm_source=chatgpt.com)) |
| **Letterboxd** | unlimited core product | personalised stats / customization | ~$19 Pro / $49 Patron benchmark | nie | transparent Free vs Pro | core remains useful, premium enhances identity ([letterboxd.com](https://letterboxd.com/pro/redeem/patron2023/?utm_source=chatgpt.com)) |
| **Strava** | tracking free | deeper analytics / planning | local pricing | subscription preview available | country-specific pricing | localisation and premium around analysis, not raw activity ([support.strava.com](https://support.strava.com/pl/articles/15401674-cennik-subskrypcji-najczesciej-zadawane-pytania?utm_source=chatgpt.com)) |

---

# 3. PAYWALL PRINCIPLES — 16 RULES

### 1. FREE answers the first question.
**RECOMMENDATION**

If landing page says:

> „Sprawdź pochodzenie nazwiska”

basic origin cannot suddenly be premium.

---

### 2. Premium answers the questions created by the first answer.

Free:

> prawdopodobny region.

Premium:

> dlaczego, jakie historyczne miejsca, jakie źródła, jakie warianty.

---

### 3. Sell research depth, not disappearance of locks.

Never:

> Unlock 14 locked items.

Prefer:

> We found material across 6 historical source groups.

---

### 4. Show the scope before the price.

autoDNA explicitly says the amount/type of information is shown before purchase; Name Atlas should do the same. ([support.autodna.com](https://support.autodna.com/?utm_source=chatgpt.com))

---

### 5. Never sell a weak report as if it were strong.

If surname coverage is poor:

> „Nie znaleźliśmy jeszcze wystarczających danych, żeby uczciwie sprzedać pełny raport.”

This can become a powerful trust signal.

---

### 6. Premium availability should be data-dependent.

No universal fake paywall.

---

### 7. One first paid offer.

MVP:

**Full Name Atlas Report**

Not 3-column pricing.

---

### 8. Upgrade happens after value consumption.

Not immediately after successful payment.

---

### 9. Price must be all-inclusive.

Research on partitioned pricing shows consumers can under-process mandatory surcharges; Name Atlas should show a clear total price, including applicable VAT rather than introducing fees late. ([sciencedirect.com](https://www.sciencedirect.com/science/article/pii/S105774081500042X?utm_source=chatgpt.com))

---

### 10. One-time purchase must say so.

Above fold:

**29 zł · jednorazowo**  
**Bez subskrypcji**

---

### 11. Subscription only when there is recurring value.

Good subscription candidate later:

- archive monitoring;
- new-record alerts;
- family tree;
- multiple branches;
- continuous AI research.

Not simple static report.

---

### 12. Evidence is part of premium value.

Sources should not be hidden merely because they are trust infrastructure.

Basic source transparency is free.

Detailed source notes can be report content.

---

### 13. Confidence is visible before purchase.

No „mystery” built from uncertainty.

---

### 14. Preview the real product.

16Personalities and Gallup show report scope/screenshots rather than promising vaguely. ([store.gallup.com](https://store.gallup.com/en-PL/product/cliftonstrengths-34/01tPa00000QhS6zIAF?utm_source=chatgpt.com))

---

### 15. Checkout has no monetisation.

No cross-sells while payment is being made.

Baymard explicitly recommends eliminating interruptions and delaying account creation. ([baymard.com](https://baymard.com/blog/checkout-flow-ux-optimization?utm_source=chatgpt.com))

---

### 16. If purchase disappoints, revenue optimization failed.

Track:

**refund rate + report completion + trust feedback**, not conversion alone.

---

# 4. FREE VS PAID MATRIX

| Data type | FREE | Name Report | Family Origin | Deep Research | Human |
|---|---|---|---|---|---|
| Current population | **Full** | — | — | — | — |
| Rarity | **Full** | — | — | — | — |
| Modern map | **Full** | enhanced | — | — | — |
| Regional concentration | **Full** | enhanced context | — | — | — |
| Basic etymology | **Full** | deeper interpretation | — | — | review possible |
| Linguistic origin | **Full summary** | detailed | — | — | — |
| Geographic origin | **probable summary** | evidence comparison | personalized narrowing | — | verification |
| Surname type | **Full** | — | — | — | — |
| Root/suffix | **Full basic** | detailed | — | — | — |
| Modern distribution | **Full** | export/history comparison | — | — | — |
| Historic distribution | preview / one point | **Full available layers** | region-specific | — | — |
| Historical variants | 1–2 examples + count | **Full** | filtered | search variants | expert review |
| Earliest evidence | period if reliable | details + source | relevance assessment | candidate family records | verification |
| Historical places | number / teaser | **Full surname-level** | family-region relevance | record-level places | verify |
| Diaspora | summary | **Full** | family relevance | records | verify |
| Migration | broad clues | surname-level | family hypotheses | candidate family paths | verify |
| Archive references | count + source types | surname-level references | targeted references | candidate person records | verify |
| Digitised documents | sample existence | links/index | relevant docs | candidate docs | transcription/verification |
| Heraldic references | careful summary only | references + disclaimer | branch relevance | potential lineage | historian |
| Noble family references | summary | sourced historical families | branch comparison | — | expert verification |
| Famous carriers | free | — | — | — | — |
| Related surnames | basic | expanded variants | relevant variants | — | — |
| Possible ancestor records | no | no | limited indications | **Core product** | verification |
| Family-specific matching | no | no | limited | **Core** | verify |
| Family timeline | no | no | preliminary | **Core** | verify |
| Family migration | no | no | preliminary | **Core** | verify |
| Family tree | later product | — | starter | deeper | expert |
| Human verification | no | no | optional | optional | **Core** |

### RECOMMENDATION

Anything that is **cheap, expected and highly reliable** should skew FREE.

Anything that requires:

- multiple-source synthesis;
- historical retrieval;
- family information;
- matching;
- manual work;

can move deeper into premium.

---

# 5. SHOULD PRICE DEPEND ON DATA COVERAGE?

### RECOMMENDATION
Not directly in an opaque way.

Bad:

> Common surname: 49 zł  
> Rare surname: 19 zł

User will not understand why.

Better:

## Strong coverage
Full report available.

## Medium coverage
Lighter product available.

## Low coverage
Do not sell the full report.

Example:

### Coverage A
6+ meaningful sections  
→ Full Name Atlas eligible.

### Coverage B
4–5 sections  
→ Short Research Edition / lower-price experiment.

### Coverage C
≤3 meaningful sections  
→ free result only + research request.

---

# 6. MINIMUM REPORT QUALITY THRESHOLD

### HYPOTHESIS — starting threshold to validate

A paid surname report should require:

**Mandatory**

1. modern population;
2. modern geography;
3. sourced basic etymology/origin;
4. at least **two meaningful historical dimensions** from:
   - variants;
   - historical locations;
   - archival references;
   - diaspora;
   - historical map;
   - migration evidence.

And:

- no severe source conflict unresolved;
- no generic AI-only report sold as research.

This threshold itself should be audited after 100–500 reports.

`surname.pl` similarly states it does not offer the archival report where it has no archival basis. ([surname.pl](https://surname.pl/raport?utm_source=chatgpt.com))

---

# 7. USER-INTENT ADAPTATION

| Intent | What to emphasize | First premium transition |
|---|---|---|
| Casual curiosity | rarity + map + meaning | Full Atlas |
| Genealogy intent | historical variants + archives | Research Edition |
| Gift | artifact + cover + legacy | Gift Edition |
| Family mystery | place discrepancy / missing link | Family Origin |
| Rare surname | uniqueness + sparse evidence honesty | tailored report or human inquiry |
| Common surname | regional fragmentation | Family Origin narrowing |
| High-data surname | counts + time depth | Full Atlas |
| Low-data surname | transparency | no-sale / research request |

### RECOMMENDATION
Adaptive UX should change **what is emphasized**, not manipulate pricing invisibly.

---

# 8. PRE-PAYWALL LIBRARY — 8 CONCEPTS

## A. DISCOVERY INDEX

### Moment
After free history reveal.

### Goal
Make additional value concrete.

### Hierarchy

**We found more in the record**

`8 Historical variants`  
`4 Possible historical places`  
`11 Archive references`  
`3 Migration clues`

### Intentionally not shown
Names/details of premium discoveries.

### CTA
**Zobacz pełny zakres / See the full scope**

### Secondary
`How we found this`

### Trust
Counts are live result-specific.

### Risk
Small count may feel weak.

### Mobile
One finding per large row.

**Recommendation: ★★★★★**

---

## B. REPORT CONTENTS

Editorial table of contents.

```text
01 Origin                available
02 Distribution          available
03 Historical variants   8 findings
04 Historical places     4 findings
05 Archives              11 references
06 Migration             3 clues
07 Sources               9 collections
```

CTA:

**Preview your edition**

Works well for rational users.

**★★★★★**

---

## C. HISTORICAL LAYERS

Map stack:

**2026** — free  
**1950** — available  
**1900** — available  
**1850** — limited evidence

Headline:

> **Dzisiejsza mapa to tylko jedna warstwa.**  
> **Today's map is only one layer.**

**★★★★☆**

---

## D. RESEARCH DESK

Visual feels like editorial desk:

- map;
- index;
- historical spelling;
- source list;
- chronology.

Headline:

> **Research already completed for this surname**

No blur; metadata visible.

Best for premium brand.

**★★★★☆**

---

## E. SOURCE COVERAGE

Headline:

> **6 source groups returned usable evidence.**

Visual:

```text
Population records      ●
Linguistic sources      ●
Historic indexes        ●
Migration sources       ●
Open archives           ●
International records   ●
```

CTA:

**See what each source revealed**

High trust.

**★★★★☆**

---

## F. TIMELINE PREVIEW

Free timeline ends at current historical fact.

Timeline continues visually:

`2026 — 1950 — 1918 — 18??`

Copy:

> **We can follow the surname further back in the available sources.**

Only use if true.

**★★★★☆**

---

## G. PERSONAL EDITION

Show the actual digital cover:

**NAME ATLAS**  
`[YOUR SURNAME]`  
**RESEARCH EDITION**

Then:

`14 pages estimated from current coverage`

Only show estimated page count if technically reliable.

CTA:

**Preview the report**

**★★★★★ for ownership hypothesis**

---

## H. FAMILY BRANCH OPPORTUNITY

After region interaction:

> **The surname story is broad. Your family story can be narrower.**

Visual:

Poland heatmap → one selected region.

CTA:

**Refine using my family region**

Secondary:

`Continue with surname report`

Best for family-intent users.

**★★★★☆**

---

# 9. PAYWALL LIBRARY — 10 DIFFERENT CONCEPTS

## 1. THE REPORT

**Best use:** MVP.

First visual: personalized report cover.

Headline:

> **Twój pełny Name Atlas jest gotowy.**  
> **Your full Name Atlas is ready.**

Subhead:

> Historical places, variants, source notes and the evidence behind your result.

Proof:

actual section counts.

Price:

**29 zł · jednorazowo**

CTA:

**Otwórz pełny raport**

Trust:

`No subscription · Sources included`

**Score: 10/10**

---

# 2. THE ATLAS

Value shown as layers of maps.

Headline:

> **Cofnij mapę w czasie.**  
> **Move the map back through time.**

Product includes:

- contemporary map;
- historical layer(s);
- places;
- migration clues;
- timeline.

Best if cartography is genuinely strong.

**9/10**

---

# 3. THE RESEARCH

First thing:

> **9 source collections checked**  
> **6 returned useful evidence**

Headline:

> **Zobacz research stojący za wynikiem.**

Price framed as paying for work performed.

Best for trust-led cohort.

**9/10**

---

# 4. THE ARCHIVE

First thing:

visual archive index.

```text
1800–1849     2 references
1850–1899     6
1900–1945     3
```

Only if these counts are accurate.

CTA:

**Open the historical index**

Best genealogy-intent.

**8/10**

---

# 5. THE TIMELINE

First thing:

large horizontal/vertical chronology.

Free part bright, premium continuation neutral—not lock icons.

Headline:

> **Historia prowadzi dalej.**

Best emotionally.

Risk: can feel like artificially cutting content.

**7.5/10**

---

# 6. THE HISTORICAL MAP

Full-screen comparison:

`TODAY ↔ HISTORICAL`

Premium = additional historical layers.

Ideal for surnames with meaningful geographic data.

**8.5/10**

---

# 7. THE PERSONAL EDITION

Book/editorial artifact.

Headline:

> **A research edition prepared from the data available for this surname.**

Includes sample pages.

Great perceived ownership.

**9/10**

---

# 8. THE DISCOVERY INDEX

First thing:

**26 additional findings**

Breakdown by category.

Rational and direct.

No fake mystery.

**9.5/10**

---

# 9. THE FAMILY ORIGIN

Only shown to high-family-intent cohort.

Headline:

> **Go from surname history to your family's possible origin.**

Requires optional family region.

Price:

79 PLN hypothesis.

Not first universal paywall.

**8/10**

---

# 10. THE DEPTH SELECTOR

```text
Name Atlas          29
Family Origin       79
Deep Research      199
```

Good once product has established mental models.

Bad for first-launch MVP.

**6.5/10 at MVP**  
**9/10 later**

---

# 10. RECOMMENDED MVP PAYWALL

Hybrid:

### 40% Discovery Index
shows concrete quantity.

### 30% Personalized Report
shows tangible artifact.

### 20% Source Coverage
proves research.

### 10% Trust
one-off / confidence / sources.

---

# 11. PRICE ARCHITECTURE — MODELS A–J

| Model | Target | Purchase frequency | Friction | Margin | Scalability | PL fit | Main risk |
|---|---|---:|---:|---:|---:|---:|---|
| **A 29 Name Report** | curiosity | low/repeat surnames | low | high | excellent | excellent | perceived low value |
| **B 49 Deep Name Atlas** | stronger intent | low | moderate | high | excellent | strong | needs real depth |
| **C 79 Family Origin** | family/history | occasional | medium | strong | good | strong | data collection |
| **D 199 Deep Research** | genealogical intent | rare | higher | depends on compute/review | medium | plausible | user expectation high |
| **E 29/79/199** | mixed | mixed | medium/high | strong | strong | strong | choice overload |
| **F credits** | repeat researchers | repeat | conceptual friction | strong | strong | weak initial | abstract |
| **G subscription** | active genealogists | recurring | high | excellent | strong | weak initial | churn/trust |
| **H one-off + subscription** | broad + power users | mixed | medium | excellent | strong | later | complexity |
| **I adaptive bundle** | repeat surname searches | episodic | moderate | high | strong | strong | transparency |
| **J report + physical gift** | gift | seasonal | medium | lower operational margin | global but logistics | excellent | fulfillment |

### RECOMMENDATION MVP

**A** first.

Then **C**.

Then **D**.

Subscription is a later product, not a launch product.

---

# 12. PRICE PRESENTATION — 12 TESTABLE FORMATS

Pricing psychology does not justify blindly using `29.99`. Research shows the left-digit effect mainly when the left digit changes, e.g. `29.99 → 30.00`, and context matters. ([academic.oup.com](https://academic.oup.com/jcr/article-abstract/32/1/54/1796360?utm_source=chatgpt.com))

Test:

| Variant | Presentation | Likely perception to test |
|---|---|---|
| 1 | **29 zł** | simple, local |
| 2 | **29,00 zł** | transactional/formal |
| 3 | **29 PLN** | international/technical |
| 4 | **29 zł jednorazowo** | removes subscription concern |
| 5 | **29 zł · bez subskrypcji** | maximal transparency |
| 6 | **Pełny raport — 29 zł** | price attached to product |
| 7 | CTA: **Otwórz raport — 29 zł** | removes next-step uncertainty |
| 8 | CTA without price; price above | cleaner editorial hierarchy |
| 9 | price before contents | tests price sensitivity |
| 10 | price after contents | tests value-first framing |
| 11 | sticky footer `29 zł · Otwórz` | mobile convenience |
| 12 | **29 zł incl. VAT / z VAT** | legal clarity if applicable |

### RECOMMENDATION
Default:

**29 zł · jednorazowo**  
`Bez subskrypcji`

CTA:

**Otwórz pełny Atlas**

Price outside button initially.

Test price-in-button later.

---

# 13. FIVE OFFER NAMING SYSTEMS

## System A — Atlas
**Name Snapshot**  
→ **Name Atlas**  
→ **Family Atlas**  
→ **Archive Research**  
→ **Verified Research**

Most brand-consistent.

---

## System B — Chapters
**First Chapter**  
→ **Full Story**  
→ **Family Chapter**  
→ **Deep Research**  
→ **Genealogist Review**

More emotional, slightly less precise.

---

## System C — Research Editions
**Snapshot**  
→ **Research Edition**  
→ **Family Origin Edition**  
→ **Archive Edition**  
→ **Expert Edition**

Most premium/editorial.

---

## System D — Depth
**Name Overview**  
→ **Name History**  
→ **Family Origin**  
→ **Family Research**  
→ **Expert Research**

Most understandable.

---

## System E — Journey
**Present**  
→ **History**  
→ **Origins**  
→ **Family Line**  
→ **Verified Lineage**

Most storytelling-heavy.

### RECOMMENDATION
Use a hybrid A/D:

**Name Snapshot**  
**Name Atlas**  
**Family Origin**  
**Deep Family Research**  
**Human-Verified Research**

---

# 14. ONE OFFER VS MULTIPLE

| Structure | Conversion risk | AOV | Choice overload | Implementation | Mobile |
|---|---:|---:|---:|---:|---:|
| One offer | **low** | medium | **lowest** | easiest | excellent |
| 2 offers | medium | higher | low | easy | good |
| 3 tiers | higher | highest potential | medium/high | medium | harder |
| Guided choice | low/medium | high | low | higher | good |
| Data-adaptive | low if transparent | high | low | high | excellent |
| Intent-adaptive | medium | high | low | high | excellent |

### RECOMMENDATION MVP
**One offer.**

After enough behavioral data:

**guided/data-adaptive offer.**

---

# 15. PERSONALIZED PAYWALL

## FACT
Self-reference effects are well established in memory/processing research; information tied to oneself tends to receive stronger encoding. This supports testing surname-specific presentation. It does **not** prove a conversion uplift for Name Atlas. That uplift remains a hypothesis.

## HYPOTHESIS
Showing:

- user's surname;
- exact findings;
- relevant map;
- source count;

will raise perceived ownership/value.

## Structure

```text
NAME ATLAS

[YOUR SURNAME]

Research Edition

08
historical variants

04
possible historical places

11
archive references

03
migration clues

Sources checked: 9
Useful evidence returned: 6

[ PREVIEW REPORT ]

29 zł · one-time

[ OPEN FULL ATLAS ]
```

Do not use:

> “We made this especially for you”

unless it is actually personalized beyond surname input.

---

# 16. PERSONALIZED COVER — 5 DIRECTIONS

## 1. Atlas Cover
Flat editorial cover.

`NAME ATLAS`  
`[YOUR SURNAME]`  
`ORIGIN · HISTORY · PLACES · SOURCES`

Best overall.

---

## 2. Map Edition
Abstract map crop generated from actual geography.

No fake heritage ornament.

---

## 3. Timeline Edition
Subtle line:

`18XX — 19XX — 2026`

Only actual supported dates.

---

## 4. Evidence Edition
Tiny archive identifiers/source names as typographic texture.

Strong research credibility.

---

## 5. Family Edition
After family-region information:

`FAMILY ORIGIN EDITION`

Not used for basic surname report.

### Static vs animated

**Static first.**

Small parallax/page motion optional.

No 3D hard-cover if only digital unless copy says:

> `Digital report preview`.

Do not imply physical shipment.

---

# 17. TRUST LAYER

## Above fold

Only four items:

**Sources included**  
**Confidence clearly labelled**  
**One-time payment**  
**No hidden subscription**

---

## Immediately under CTA

`Sample report`  
`Methodology`  
`What if little data is available?`  
`Refund policy`

---

## Lower page

- source coverage;
- data dates;
- privacy;
- limitations;
- support;
- human verification explanation.

---

## Trust icons

Avoid generic:

shield / lock / trophy / stars everywhere.

Use informational marks:

`SRC` Source  
`✓` Verified  
`◐` Likely  
`○` Possible  
`H` Human-reviewed

---

# 18. QUALITY GUARANTEE

Not:

> 100% znajdziemy przodków.

Use:

### Data Coverage Guarantee

> **Raport płatny pokazujemy tylko wtedy, gdy dostępne dane spełniają minimalny zakres jakości.**

### Before purchase

> **Widzisz zakres raportu przed zakupem.**

### After purchase

> **Jeśli z przyczyn technicznych raport nie zawiera sekcji pokazanych przed płatnością, możesz poprosić o zwrot.**

### Deep Research

Different guarantee:

> **Płacisz za wykonanie określonej kwerendy, nie za gwarancję znalezienia przodka.**

---

# 19. NO-DATA POLICY

## No data
No paywall.

> **Nie mamy dziś wystarczających danych, żeby przygotować płatny raport.**

Options:

- save search;
- notify if dataset expands;
- manual research request.

---

## Partial data

Offer free result.

Potentially:

**Mini Research Edition** testable at 19 PLN only if clearly distinct.

Not automatically.

---

## Conflicting evidence

Sell only if conflict itself can be responsibly explained:

> **Two plausible origin hypotheses remain. The report compares the evidence for both.**

That can actually increase value.

---

# 20. CHECKOUT — MOBILE

Baymard's current research recommends guest checkout, minimizing fields, prominent third-party payments, hiding coupon fields and delaying account creation. Forced accounts are a material abandonment source. ([baymard.com](https://baymard.com/research-articles/make-guest-checkout-prominent?utm_source=chatgpt.com))

## Recommendation

### Email?
Yes, at checkout, because report delivery/recovery needs it.

But label purpose:

> **Email do wysłania raportu / Email for report delivery**

### Account?
No.

Create optional account after purchase.

### Invoice?
Collapsed:

`Potrzebuję faktury`

### VAT?
Total price visible before payment.

### Coupon?
Collapsed link.

### Progress?
No multi-step indicator if one-screen.

---

## Checkout wireframe

```text
┌────────────────────────────────┐
│ ←  NAME ATLAS                  │
│                                │
│ Full Name Atlas                │
│ [YOUR SURNAME]                 │
│                                │
│ 29 zł                          │
│ VAT included where applicable │
│ One-time payment               │
│                                │
│ ────────────────────────────── │
│                                │
│ [ Apple Pay ]                  │
│ [ Google Pay ]                 │
│                                │
│ or                             │
│                                │
│ Email for report delivery      │
│ [___________________________]  │
│                                │
│ Card                           │
│ [___________________________]  │
│ [MM/YY] [CVC]                  │
│                                │
│ ▸ Need an invoice?             │
│ ▸ Have a code?                 │
│                                │
│ [ PAY 29 zł ]                  │
│                                │
│ Sources included               │
│ No subscription               │
│ Refund policy · Privacy        │
└────────────────────────────────┘
```

Payment wallets should be obvious but not force-redirections; Baymard recommends clearly labeled Apple Pay/Google Pay/PayPal alongside cards. ([baymard.com](https://baymard.com/learn/payment-ux?utm_source=chatgpt.com))

---

# 21. POST-PURCHASE

Immediate cross-sell is wrong.

## Sequence

### Purchase confirmation

> **Twój pełny Atlas jest otwarty.**

CTA:

**Start with the earliest historical clue**

---

### Report consumption

Let user consume at least:

- 2 premium sections; or
- 90 seconds; or
- 30–40% report.

---

### First premium discovery

Make this the emotional payoff.

Not a sales slot.

---

### Save
Magic-link access.

---

### Share
Optional.

---

### Family upsell

Only after demonstrated interest.

Trigger example:

- reached historical places;
- opened archive references;
- returned to report;
- clicked „Could this relate to my family?”

---

# 22. UPSELL LADDER

## Name Atlas → Family Origin

### Trigger
User consumed history + map.

### Required input
1–3 optional family details.

### Copy

> **Historia nazwiska jest szeroka. Możemy teraz zawęzić ją do regionu Twojej rodziny.**

CTA:

**Zbadaj pochodzenie rodziny**

Price hypothesis:

**79 PLN**

What changes:

- user-specific region weighting;
- family-associated places;
- targeted sources;
- refined hypotheses.

---

## Family Origin → Deep Research

Trigger:

Family Origin finds plausible research paths.

Copy:

> **Mamy już punkt wyjścia. Następny krok to szukanie konkretnych rekordów osób.**

199 PLN hypothesis.

What changes:

surname-level → person-level candidate matching.

---

## Deep → Human Research

Trigger:

- candidate matches;
- ambiguous records;
- inaccessible archival sources;
- manual verification required.

Copy:

> **Ten etap wymaga ręcznej weryfikacji dokumentów.**

CTA:

**Poproś o zakres researchu**

No instant fake fixed-price promise.

---

# 23. EMAIL CAPTURE

| Pattern | Conversion friction | Recovery | Recommendation |
|---|---:|---:|---|
| Before result | high | high | no |
| After free result optional | low | good | **yes** |
| Paywall required | medium | high | no |
| Checkout | necessary | high | **yes** |
| After purchase account | very low | great | **yes** |
| Magic link | low | great | **yes** |
| Mandatory account | high | good | no |

### MVP

Free report:

> `Save this Atlas by email` — optional.

Checkout:

email required for delivery.

After purchase:

magic link, optional account creation.

---

# 24. PAYWALL ABANDONMENT

## User saw pre-paywall only
No email unless they explicitly saved their report.

No recovery advertising from private family details.

---

## Saw paywall
If email voluntarily captured:

**+24h**

> Twój darmowy Atlas nadal jest zapisany.

No discount.

---

## Started checkout
If email available and user consent/transactional basis permits:

**+4–6h**

> Nie dokończyłeś zakupu. Twój raport nadal jest dostępny.

---

## +48h

One evidence-based reminder:

> Raport zawiera 8 historical variants, 4 places…

No urgency.

---

## +5–7 days

Final.

Then stop.

---

# 25. MOBILE-FIRST PAYWALL FLOW — 10 SCREENS

### SCREEN 1 — Last Free Insight
A real historical finding.

↓

### SCREEN 2 — Transition

> **Współczesna historia kończy się tutaj. Znaleźliśmy jednak dalsze źródła.**

↓

### SCREEN 3 — Discovery Index
Counts.

↓

### SCREEN 4 — Source Coverage
What databases/source classes returned evidence.

↓

### SCREEN 5 — Map / timeline premium preview
Actual preview structure.

↓

### SCREEN 6 — Personalized cover

↓

### SCREEN 7 — Report Contents

↓

### SCREEN 8 — Price + trust

↓

### SCREEN 9 — One-screen checkout

↓

### SCREEN 10 — Purchase confirmation

No 3-column table.

---

# 26. VISUAL DIRECTION

The monetisation layer should look like an extension of the atlas itself.

Use:

- chapter numbers;
- map fragments;
- coordinate systems;
- source index notation;
- timeline marks;
- editorial typography;
- historical data layers;
- document metadata;
- quiet evidence badges.

Avoid visual language that screams:

**subscription software.**

No:

- PRO pill;
- crown;
- golden lock;
- glowing border;
- „premium gradient”.

---

# 27. DATA-ADAPTIVE PAYWALL

This should be a fundamental system property.

## Quality Score is internal, not displayed as arbitrary 87/100.

Possible internal dimensions:

### A. Core coverage
population  
map  
origin

### B. Historical coverage
variants  
historical locations  
archive sources

### C. International coverage
diaspora  
migration

### D. Evidence quality
primary/secondary source mix

---

## Strong report

Example:

```text
Core       3/3
Historical 3/3
Intl       2/2
Sources     strong
```

→ Full Name Atlas offered.

---

## Medium

```text
Core       3/3
Historical 1–2/3
Intl       0–1/2
```

→ Free result + possibly 19/29 lighter Research Edition test.

---

## Weak

```text
Core       2–3/3
Historical 0/3
Intl       0/2
```

→ no paid report.

---

## Family research exception

Weak surname-level data doesn't always mean family research impossible.

Offer:

> **We don't have enough surname-wide material for a premium Name Atlas. If you know a place or ancestor, deeper genealogy may still be possible.**

---

# 28. PAYWALL TRIGGERS

| Trigger | Offer | Copy direction | Risk |
|---|---|---|---|
| 70% free flow | subtle next chapter CTA | „Continue into history” | too early |
| map interaction ×2 | Historical Map | „See how distribution changed” | missing historic data |
| origin source opened | Research edition | „Compare source evidence” | niche |
| variants clicked | variants report | „8 variants found” | overpaywall |
| archive interaction | Research | „See archive index” | accuracy |
| family region selected | Family Origin | „Narrow to your region” | privacy |
| second surname search | family bundle later | „Save multiple atlases” | premature |
| share completed | none immediately | preserve moment | interrupting delight |
| return session | resume/report | „Continue where you left off” | repetitive |
| gift intent | Gift Edition | gift-specific copy | wrong audience |

### RECOMMENDATION
Do not change prices by behavior.

Change **framing and offer relevance**.

---

# 29. PAYWALL COMPONENT SYSTEM

| Component | Purpose | Priority | Mobile treatment | Don't show when |
|---|---|---:|---|---|
| Report cover | ownership | high | 70–80% width | no report eligible |
| Price block | clarity | critical | persistent near CTA | never hide |
| Discovery counter | concrete value | high | large numerals | counts unreliable |
| Source coverage | trust | high | compact list | zero data |
| Evidence badge | uncertainty | high | inline | never color-only |
| Sample page | tangibility | high | swipe | sample not representative |
| TOC | scope | high | vertical | tiny report |
| Timeline preview | emotion | medium | vertical | dates weak |
| Map preview | brand/value | high | full width | geography weak |
| Archive preview | research proof | high | index rows | no archives |
| Confidence badge | trust | critical | text+icon | never omit |
| Guarantee | risk reduction | medium | below CTA | — |
| Payment methods | checkout trust | critical | wallet buttons | prepaywall |
| Trust row | reassurance | critical | 3–4 items max | — |
| CTA | action | critical | min 48–56px visual height | — |
| Family upgrade | future LTV | post-purchase | after consumption | initial paywall |

---

# 30. ACCESSIBILITY

Target **WCAG 2.2 AA**.

W3C requires 4.5:1 minimum contrast for standard text and at least 24×24 CSS px pointer targets under 2.5.8; 44×44 is the stronger enhanced target. Text must remain usable at 200% resize and keyboard focus must be visible. ([w3.org](https://www.w3.org/TR/WCAG22/?utm_source=chatgpt.com))

### Name Atlas standards

- CTA target: **48–56 px height**.
- Never encode VERIFIED / LIKELY solely by colour.
- icon + text label.
- map must have textual summary.
- chart data accessible as list/table.
- reduced-motion mode.
- no scroll-jacking.
- screen-reader heading structure.
- language set correctly per locale.
- historical document images require meaningful alt or transcript when important.
- sticky CTA must not obscure keyboard focus; WCAG 2.2 specifically addresses obscured focus. ([w3.org](https://www.w3.org/WAI/standards-guidelines/wcag/new-in-22/?utm_source=chatgpt.com))

---

# 31. LOCALISATION & PRICING

Do **not** convert:

`29 PLN → exact FX USD/EUR/GBP`.

Pricing expectations differ by market.

Test locally coherent endings:

### Poland
29 / 39 / 49 PLN

### Eurozone
€7 / €9 / €12 etc. — validate.

### UK
£6 / £9 / £12 etc. — validate.

### US
$7 / $9 / $12 etc. — validate.

Those are experiment bands, **not recommendations yet**.

### VAT

For EU digital B2C services, tax treatment can depend on customer location; the EU OSS exists to manage cross-border VAT and destination-based rules for relevant electronic services. Confirm exact classification with tax counsel/accounting before launch. ([europa.eu](https://europa.eu/youreurope/business/finance-and-tax/vat/one-stop-shop/index_en.htm?utm_source=chatgpt.com))

### Payments

Poland:
- BLIK potentially important;
- cards;
- Apple Pay;
- Google Pay.

Global:
- local wallets and currencies.

Do not hard-code one universal checkout.

---

# 32. PRICE / OFFER A/B TEST PLAN — 30 TESTS

| # | Hypothesis | Control | Variant | Primary | Secondary | Guardrail |
|---:|---|---|---|---|---|---|
| 1 | 49 may increase revenue despite lower CR | 29 | 49 | revenue/paywall view | purchase CR | refunds |
| 2 | value-first improves purchase | price first | contents first | purchase | dwell | trust |
| 3 | counts increase curiosity | generic „more found” | exact counts | premium CTR | purchase | complaint rate |
| 4 | report cover raises ownership | no cover | cover | checkout start | purchase | perceived manipulation |
| 5 | personalized surname cover helps | generic cover | personalized | purchase | preview engagement | privacy |
| 6 | discovery index beats book preview | book | index | purchase | CTR | report satisfaction |
| 7 | map preview sells atlas | TOC | historical map | purchase | map interaction | load time |
| 8 | timeline preview creates depth | none | timeline | purchase | history clicks | misinformation |
| 9 | sources improve trust | hidden below | source coverage above | purchase | source opens | clutter |
| 10 | confidence increases trust | absent | visible | purchase | trust score | conversion tradeoff |
| 11 | one-off copy removes fear | 29 zł | 29 zł · jednorazowo | purchase | checkout exit | — |
| 12 | no-subscription line helps | absent | visible | purchase | support questions | layout |
| 13 | price inside CTA reduces ambiguity | outside | inside CTA | checkout start | purchase | perceived salesy |
| 14 | sticky CTA improves mobile completion | no sticky | sticky | checkout start | scroll | accessibility |
| 15 | one product beats tiers | 3 tiers | single | purchase | AOV | revenue/user |
| 16 | 2 products can raise AOV | one | Name + Family | revenue/user | conversion | choice overload |
| 17 | optional family question improves value | none | one region Q | purchase | completion | abandonment |
| 18 | second question adds too much friction? | 1 Q | 2 Q | revenue/user | abandon | privacy |
| 19 | sample report reduces uncertainty | none | sample | purchase | opens | cannibalisation |
| 20 | representative sample > generic | generic sample | similar coverage sample | purchase | trust | complexity |
| 21 | guarantee wording reduces risk | standard | coverage guarantee | purchase | refund | abuse |
| 22 | trust above fold matters | below | above | purchase | trust links | visual density |
| 23 | express wallet improves checkout | card first | wallet first | checkout completion | method mix | failure |
| 24 | guest checkout beats account | account | guest | purchase | account creation post | retention |
| 25 | hide promo code avoids coupon hunting | visible | collapsed | purchase | promo use | support |
| 26 | email after result beats before | before | after | free completion | email capture | lead volume |
| 27 | share before paywall grows acquisition | after | before | referral sessions | purchase | distraction |
| 28 | gift card after result finds gift users | none | subtle gift CTA | gift purchase | report purchase | distraction |
| 29 | family upsell timing affects trust | instant | after 30% consumption | attach | report completion | revenue delay |
| 30 | adaptive weak-data no-sale increases trust | sell same | no-sale | NPS/trust | revenue | under-monetisation |

No expected uplift should be assumed.

---

# 33. METRICS — EXACT DEFINITIONS

| Metric | Formula | Core event | Segment by | Decision |
|---|---|---|---|---|
| Free result completion | free_result_completed / valid_search | result_complete | coverage, channel | free UX quality |
| Premium curiosity CTR | premium_curiosity_clicked / discovery_index_viewed | premium_curiosity_clicked | coverage | teaser effectiveness |
| Prepaywall view rate | prepaywall_viewed / free_result_completed | prepaywall_viewed | intent | funnel reach |
| Prepaywall → paywall | paywall_viewed / prepaywall_viewed | paywall_viewed | variant | transition |
| Paywall → checkout | checkout_started / paywall_viewed | checkout_started | price | offer |
| Checkout → purchase | purchase_completed / checkout_started | purchase_completed | method/device | checkout UX |
| Paywall purchase rate | purchase / paywall_view | purchase_completed | paywall | conversion |
| Revenue/paywall view | revenue / paywall_views | purchase | price | pricing winner |
| Revenue/search | revenue / valid surname searches | purchase | coverage | unit economics |
| ARPPU | revenue / purchasers | purchase | cohort | monetisation |
| AOV | revenue / orders | purchase | bundles | basket |
| Refund rate | refunds / orders | refund | product | quality |
| Report completion | users reaching defined end / report_opened | section_view | report type | value delivery |
| Upsell view | upsell_view / report purchasers | upsell_view | engagement | timing |
| Upsell purchase | upsell purchase / upsell view | upsell_purchased | product | offer |
| Family attach | Family purchases / surname-report buyers | family_purchase | cohort | ladder |
| Deep attach | Deep purchases / Family buyers | deep_purchase | cohort | ladder |
| Email capture | emails captured / eligible free users | report_saved | source | retention |
| Share rate | share_completed / free_result users | share_completed | card | growth |
| Return search | returning search users / initial users | search | cohort | retention |
| Repeat surnames | searches beyond first / search users | search | user | discovery loop |
| Gift rate | gift orders / paid orders | gift_purchase | season | gifting |

---

# 34. ANALYTICS EVENT TAXONOMY

Do not send the literal surname as a general analytics property unless genuinely required and assessed for privacy.

Prefer hashed/internal search ID.

### `surname_search_started`
Properties:
- locale
- acquisition_channel
- session_id
- device
- market

### `surname_search_completed`
- result_id
- coverage_tier
- core_data_available
- historical_data_available
- archive_count_bucket
- variant_count_bucket
- source_count_bucket

### `free_reveal_population_viewed`
- result_id
- population_bucket
- rarity_bucket

### `free_reveal_map_viewed`
- result_id
- geographic_coverage_level

### `free_reveal_origin_viewed`
- confidence_level
- source_count_bucket

### `historical_variant_viewed`
- variant_count_bucket

### `discovery_index_viewed`
- variant_bucket
- location_bucket
- archive_bucket
- migration_bucket

### `premium_curiosity_clicked`
- trigger_source
- CTA_variant

### `personalisation_started`
- entry_point

### `personalisation_skipped`
- question_id

### `prepaywall_viewed`
- prepaywall_variant
- coverage_tier

### `paywall_viewed`
- paywall_variant
- price_variant
- offer_count
- coverage_tier

### `sample_report_opened`
- sample_type

### `checkout_started`
- price
- currency
- product
- paywall_variant

### `payment_method_selected`
- method

### `purchase_completed`
- product
- revenue
- currency
- tax
- payment_method

### `report_opened`

### `premium_section_viewed`
- section_type
- sequence_number

### `report_completed`

### `family_upsell_viewed`
- trigger

### `family_upsell_purchased`

### `deep_research_requested`

### `refund_requested`
- reason category.

### Never send unnecessarily

- grandfather full name;
- grandmother maiden name;
- exact DOB;
- archive-person record;
- precise family addresses;

into generic analytics.

Keep those in product data systems with appropriate privacy controls.

---

# 35. EDGE CASES

## Surname not found
No paywall.

Offer:

- spelling check;
- transliteration;
- country selector;
- request research.

---

## Typo suspected

> **Did you mean…?**

Don't silently substitute.

---

## Multiple origins

Present hypotheses side by side:

**Hypothesis A — Likely**  
**Hypothesis B — Possible**

Premium can compare evidence.

---

## No etymology

Say:

> No reliable etymology found.

Do not let LLM fill it.

---

## Only modern data

Free result only.

No historical report.

---

## No archives

Do not show `0 locked archive records`.

Tell user:

> no machine-searchable archival references found.

---

## Extremely rare surname

Privacy matters.

Do not expose granular regional data that risks identifying individuals.

---

## Extremely common surname

Emphasize regional concentration and need for family context.

---

## Non-Polish surname

Route to global origin/data providers.

Don't force Polish framework.

---

## Transliteration

Show original/script possibilities explicitly.

---

## Migration-changed surname

Variants become primary navigation.

---

## Offensive/invalid input

Neutral validation.

---

## Research inconclusive

Outcome can literally be:

> **Inconclusive**

with source explanation.

---

## Sources disagree

Do not average them into fake certainty.

Show disagreement.

---

## Family details insufficient

Ask for the next highest-information field.

Do not sell deep research prematurely.

---

# 36. COPY BANK

Below is intentionally modular rather than overly promotional.

## 20 PRE-PAYWALL HEADLINES

| PL | EN |
|---|---|
| Znaleźliśmy dalsze ślady. | We found further traces. |
| Dzisiejsza mapa to tylko początek. | Today's map is only the beginning. |
| Historia prowadzi dalej. | The story goes further. |
| To nazwisko pojawia się także w starszych źródłach. | This surname also appears in older sources. |
| Mamy więcej materiału historycznego. | We found more historical material. |
| Zobacz, co znajduje się poza podstawowym wynikiem. | See what lies beyond the basic result. |
| Kolejna warstwa zaczyna się w źródłach historycznych. | The next layer begins in historical sources. |
| Możemy cofnąć ten Atlas dalej. | We can take this Atlas further back. |
| Znaleźliśmy kilka niezależnych tropów. | We found several independent clues. |
| Historia nie kończy się na etymologii. | The story doesn't end with etymology. |
| Zobacz zakres dostępnego researchu. | See the available research scope. |
| Kilka źródeł prowadzi do dalszych odkryć. | Several sources lead to further findings. |
| Warianty pisowni otwierają kolejne ścieżki. | Historical spellings open new paths. |
| Nazwisko zostawiło więcej niż jeden ślad. | The surname left more than one trace. |
| Mapa zmienia się, gdy cofamy czas. | The map changes as we move back in time. |
| Zebraliśmy dalsze materiały do tego nazwiska. | We gathered additional material for this surname. |
| To pierwszy poziom historii. | This is the first layer of the story. |
| Część źródeł prowadzi znacznie dalej. | Some sources take us much further. |
| Mamy już podstawę. Teraz zaczyna się research. | We have the foundation. Now the research begins. |
| Zobacz, co naprawdę udało się znaleźć. | See what the research actually found. |

---

## 20 PAYWALL HEADLINES

| PL | EN |
|---|---|
| Otwórz pełny Name Atlas. | Open the full Name Atlas. |
| Otwórz kolejne rozdziały. | Open the next chapters. |
| Zobacz cały research. | See the full research. |
| Cofnij Atlas dalej w czasie. | Take the Atlas further back in time. |
| Otwórz pełną historię nazwiska. | Open the full surname history. |
| Zobacz wszystkie znalezione ślady. | See every trace we found. |
| Otwórz Research Edition. | Open the Research Edition. |
| Przejdź od wyniku do źródeł. | Go from the result to the sources. |
| Zobacz miejsca ukryte za współczesną mapą. | See the places beyond the modern map. |
| Otwórz historyczne warstwy. | Open the historical layers. |
| Poznaj pełny zakres dostępnych danych. | Explore the full available record. |
| Zobacz dowody stojące za historią. | See the evidence behind the story. |
| Kontynuuj historię nazwiska. | Continue the surname's story. |
| Otwórz wszystkie historyczne warianty. | Open all historical variants. |
| Zobacz, dokąd prowadzą źródła. | See where the sources lead. |
| Otwórz pełny indeks odkryć. | Open the complete discovery index. |
| Zobacz historię poza teraźniejszością. | Go beyond the present-day picture. |
| Otwórz swój Research Atlas. | Open your Research Atlas. |
| Zobacz pełne opracowanie. | View the complete research edition. |
| Przejdź do kolejnego poziomu researchu. | Continue to the next level of research. |

---

## 20 PAYWALL SUBHEADLINES

1. PL: Pełny raport łączy miejsca, warianty, archiwa i źródła.  
   EN: The full report connects places, variants, archives and sources.

2. Zobacz konkretne dane znalezione dla tego nazwiska. / See the specific evidence found for this surname.

3. Otwórz historyczne sekcje, których zakres widzisz poniżej. / Open the historical sections shown below.

4. Każdy ważny wniosek zawiera źródło i poziom pewności. / Every major conclusion includes a source and confidence level.

5. To jednorazowy zakup, bez subskrypcji. / This is a one-time purchase with no subscription.

6. Pełny Atlas został zbudowany z dostępnych źródeł dla tego wyniku. / The full Atlas is built from the sources available for this result.

7. Zobacz historyczne miejsca i warianty pisowni. / Explore historical places and spelling variants.

8. Otwórz mapę, timeline i indeks źródeł. / Open the map, timeline and source index.

9. Zobacz dokładnie, skąd pochodzą nasze wnioski. / See exactly where our conclusions come from.

10. Otwórz całość researchu dostępnego na tym poziomie. / Open the full research available at this level.

11. Poznaj szerszy kontekst językowy i historyczny. / Explore the broader linguistic and historical context.

12. Raport pokazuje zarówno mocne dowody, jak i niepewne hipotezy. / The report shows both strong evidence and uncertain hypotheses.

13. Zobacz historię nazwiska w czasie i przestrzeni. / Follow the surname through time and place.

14. Przejdź z podstawowego wyniku do pełnej analizy. / Move from the basic result to the full analysis.

15. Zobacz kolejne źródła bez tworzenia konta. / Continue into the sources without creating an account.

16. Pełny raport można zachować i pobrać. / Keep and download the complete report.

17. Zakres poniżej jest oparty na danych rzeczywiście znalezionych. / The scope below reflects data actually found.

18. Nie pokazujemy sekcji, dla których nie mamy danych. / We don't include sections where evidence is missing.

19. Twoje dane rodzinne nie są wymagane do tego raportu. / Family details are not required for this report.

20. Jeśli chcesz później, możesz przejść do researchu konkretnej gałęzi rodziny. / You can later continue into research on a specific family branch.

---

# 37. 30 CTA

1. Otwórz pełny Atlas / Open the full Atlas  
2. Zobacz cały research / See the full research  
3. Otwórz Research Edition / Open the Research Edition  
4. Zobacz dalsze ślady / See further traces  
5. Kontynuuj historię / Continue the story  
6. Cofnij się dalej / Go further back  
7. Otwórz źródła / Open the sources  
8. Zobacz pełną mapę / View the full map  
9. Zobacz timeline / View the timeline  
10. Zobacz wszystkie warianty / View all variants  
11. Otwórz indeks archiwalny / Open the archive index  
12. Zobacz historyczne miejsca / Explore historical places  
13. Zobacz zakres raportu / See the report scope  
14. Podejrzyj raport / Preview the report  
15. Zobacz przykładowy raport / View a sample report  
16. Otwórz za 29 zł / Open for 29 zł  
17. Kup raport / Buy the report  
18. Kontynuuj research / Continue the research  
19. Zbadaj pochodzenie rodziny / Research family origin  
20. Zawęź do mojej rodziny / Refine to my family  
21. Rozpocznij Family Origin / Start Family Origin  
22. Przejdź do Deep Research / Continue to Deep Research  
23. Poproś o weryfikację / Request verification  
24. Zapisz mój Atlas / Save my Atlas  
25. Wyślij mi raport / Send me my report  
26. Zapłać 29 zł / Pay 29 zł  
27. Zapłać Apple Pay / Pay with Apple Pay  
28. Kontynuuj jako gość / Continue as guest  
29. Wróć do darmowego wyniku / Return to free result  
30. Nie teraz / Not now

---

# 38. 20 PRICING LINES

1. 29 zł · jednorazowo / 29 zł · one-time  
2. 29 zł · bez subskrypcji / 29 zł · no subscription  
3. Pełny raport — 29 zł / Full report — 29 zł  
4. Research Edition — 29 zł / Research Edition — 29 zł  
5. Jednorazowa płatność 29 zł / One-time payment of 29 zł  
6. Zapłać raz. Zachowaj raport. / Pay once. Keep the report.  
7. Bez miesięcznych opłat. / No monthly fees.  
8. Brak automatycznego odnowienia. / No automatic renewal.  
9. Cena obejmuje dostęp do całego raportu. / Price includes the complete report.  
10. Pełna cena przed płatnością. / Full price shown before payment.  
11. Podatki uwzględnione tam, gdzie wymagane. / Taxes included where applicable.  
12. Family Origin — 79 zł jednorazowo. / Family Origin — 79 zł one-time.  
13. Deep Research — 199 zł za zakres opisany przed zakupem. / Deep Research — 199 zł for the stated research scope.  
14. Human Research — wycena po ocenie materiału. / Human Research — quoted after assessment.  
15. Nie pobieramy opłaty za sekcje, których nie możemy dostarczyć. / We don't charge for sections we cannot provide.  
16. Zakres raportu widzisz przed zakupem. / See the report scope before you buy.  
17. Nie musisz zakładać konta. / No account required.  
18. Raport zostanie zapisany pod Twoim adresem e-mail. / Your report will be saved to your email.  
19. Jedna cena. Bez ukrytych kosztów. / One price. No hidden fees.  
20. Cena zależy od produktu, nie od Twojego zachowania. / Pricing depends on the product, not your behavior.

---

# 39. 20 TRUST LINES

1. Każdy ważny wniosek ma źródło. / Every major conclusion has a source.  
2. Możliwe nie znaczy potwierdzone. / Possible does not mean verified.  
3. Nie tworzymy brakujących rekordów. / We never invent missing records.  
4. Pokazujemy poziom pewności każdego tropu. / We show the confidence behind every clue.  
5. Brak danych również jest wynikiem. / No evidence is also a valid result.  
6. Nazwisko nie jest dowodem pokrewieństwa. / A shared surname is not proof of kinship.  
7. Heraldic reference is not proof of your family's coat of arms.  
8. Źródła możesz sprawdzić samodzielnie. / You can inspect the sources yourself.  
9. Pokazujemy datę danych. / We show when the data was last updated.  
10. Raport mówi wprost o ograniczeniach źródeł. / The report states source limitations clearly.  
11. Płacisz raz. / One-time payment.  
12. Bez ukrytej subskrypcji. / No hidden subscription.  
13. Bez automatycznego odnowienia. / No automatic renewal.  
14. Zakres researchu widzisz przed zakupem. / See the research scope before paying.  
15. Dane rodzinne są opcjonalne na tym etapie. / Family details are optional at this stage.  
16. Weryfikacja przez człowieka jest zawsze oznaczona. / Human verification is always labelled.  
17. Hipotezy są oddzielone od faktów. / Hypotheses are separated from facts.  
18. Chronimy prywatność danych rodzinnych. / We protect family research data.  
19. Metodologia jest publiczna. / Our methodology is public.  
20. Możesz zobaczyć przykładowy raport przed zakupem. / You can view a sample report before purchasing.

---

# 40. 15 GUARANTEE / REFUND MESSAGES

1. Jeśli raport nie zawiera sekcji pokazanych przed płatnością, skontaktuj się z nami w sprawie zwrotu. / If the report doesn't contain the sections shown before payment, contact us for a refund.
2. Raport oferujemy tylko wtedy, gdy spełnia minimalny próg danych. / We only offer a report when minimum data coverage is met.
3. Nie gwarantujemy znalezienia konkretnego przodka. / We do not guarantee finding a specific ancestor.
4. Deep Research obejmuje wykonanie określonej kwerendy, nie gwarantowany wynik. / Deep Research covers a defined research effort, not a guaranteed finding.
5. Przed zakupem zobaczysz zakres dostępnych danych. / You'll see the available scope before purchasing.
6. Jeśli nie mamy wystarczających danych, nie sprzedamy pełnego raportu. / If the data is insufficient, we won't sell a full report.
7. Możesz zgłosić problem z raportem bezpośrednio z jego strony. / Report issues can be submitted directly from the report.
8. Błędne źródło? Daj nam znać. / Found an incorrect source? Tell us.
9. Weryfikujemy zgłoszone błędy. / We review reported errors.
10. Zwrot nie zależy od zgody z historyczną hipotezą, ale od dostarczenia obiecanego zakresu. / Refund eligibility concerns delivery of the promised scope, not agreement with a hypothesis.
11. Nie ukrywamy pustych sekcji po zakupie. / We do not hide empty sections after purchase.
12. Zobacz przykładowy raport przed zakupem. / Review a sample before buying.
13. Human Research receives a separate scope and quote. / Human Research receives a separate scope and quote.
14. Nie pobieramy opłaty za nieuruchomiony manual research. / We don't charge for manual research that has not started.
15. Your statutory consumer rights remain unaffected. / Twoje prawa konsumenckie pozostają bez zmian.

---

# 41. 20 PREMIUM VALUE STATEMENTS

1. Pełna historia dostępnych wariantów pisowni. / Full history of available spelling variants.
2. Historyczne miejsca związane z nazwiskiem. / Historical places linked to the surname.
3. Evidence behind each origin hypothesis.
4. Historical distribution where available.
5. Source-by-source notes.
6. Migration clues.
7. Diaspora records.
8. Archive reference index.
9. Historical timeline.
10. Comparison of modern and historical geography.
11. Full linguistic analysis.
12. Related surname paths.
13. Confidence for major conclusions.
14. Research limitations.
15. International occurrence.
16. Downloadable digital edition.
17. Source links.
18. Search strategies for deeper genealogy.
19. Data provenance and update dates.
20. Path toward family-specific research.

---

# 42. 20 UPSELL MESSAGES

1. Historia nazwiska jest szeroka. Możemy teraz zawęzić ją do Twojej rodziny. / The surname story is broad. We can now narrow it to your family.
2. Znasz region rodziny? To może zmienić research. / Know your family's region? It can refine the research.
3. Możemy sprawdzić, które miejsca są najbardziej relevant dla Twojej gałęzi. / We can test which places are most relevant to your branch.
4. Następny krok to przejście z nazwiska do konkretnych osób. / The next step moves from surname-level history to specific people.
5. Family Origin uses the details you choose to provide.
6. Nie musisz znać całego drzewa. / You don't need a full family tree.
7. Wystarczy jeden znany region, żeby zacząć. / One known region can be enough to begin.
8. Deep Research begins with names, dates and places.
9. Candidate record is not a verified ancestor.
10. We can compare possible records before human verification.
11. Human review is available when evidence becomes ambiguous.
12. Zobacz, czy ten regionalny trop pasuje do Twojej rodziny. / See whether this regional clue fits your family.
13. Add what you know about one grandparent.
14. Continue from broad origin to family history.
15. Explore the maternal surname next.
16. Compare two family branches.
17. Build a starting family timeline.
18. Search historical record collections relevant to your region.
19. Request expert verification of a candidate record.
20. Turn your research into a Family Edition.

---

# 43. 15 CHECKOUT MESSAGES

1. Płacisz raz. / Pay once.
2. Bez subskrypcji. / No subscription.
3. Email służy do dostarczenia raportu. / Your email is used to deliver your report.
4. Konto nie jest wymagane. / No account required.
5. Pełna cena: 29 zł. / Total: 29 zł.
6. VAT included where applicable.
7. Bez dodatkowych opłat. / No additional fees.
8. Secure payment.
9. Apple Pay.
10. Google Pay.
11. Card.
12. Potrzebuję faktury. / I need an invoice.
13. Mam kod. / I have a code.
14. Płacąc, akceptujesz regulamin zakupu raportu. / By paying, you accept the report purchase terms.
15. Twój raport będzie dostępny od razu po płatności. / Your report will be available immediately after payment.

---

# 44. 15 PURCHASE CONFIRMATION MESSAGES

1. Twój pełny Atlas jest otwarty. / Your full Atlas is open.
2. Research Edition is ready.
3. Start with the earliest available trace.
4. Your source index is ready.
5. Historical layers are now available.
6. Your report has been saved.
7. A copy has been sent to your email.
8. No account is required to return.
9. Save this link.
10. Open the historical map.
11. Explore the timeline.
12. Review the source notes.
13. Download your digital report.
14. Share a free discovery card.
15. Continue when you're ready — no next purchase is required.

---

# 45. RISKS

## Conversion risk
Giving away too much may reduce low-value purchases.

Counter:
paid product must create genuine new value, not depend on hiding basic facts.

---

## Trust risk
Overstating archives or family matches.

Highest strategic risk.

---

## Data risk
Licensing and uneven surname coverage.

`surname.pl` explicitly avoids machine processing sources it lacks permission to use; Name Atlas should maintain the same discipline. ([surname.pl](https://surname.pl/raport?utm_source=chatgpt.com))

---

## Legal risk
Copyright/database rights, privacy, consumer rights, VAT, refund wording.

Needs legal review before launch.

---

## Pricing risk
29 may under-anchor value; 49 may suppress impulse purchase.

Only experiment resolves it.

---

## UX risk
Too much curiosity design can feel manipulative.

Every teaser needs a corresponding real data object.

---

## Operational risk
199 PLN Deep Research may be impossible to automate reliably at first.

Start with narrow research scope.

---

## Brand risk
Cheap tricks could permanently place Name Atlas in the same category as low-trust background-check funnels.

Avoid.

---

# 46. FINAL RECOMMENDED MVP SYSTEM

```text
FREE NAME SNAPSHOT
│
│ Real value:
│ population
│ rarity
│ current map
│ basic meaning
│ likely origin
│ 1–2 historical variants
│ sources
│
▼
DISCOVERY MOMENT
│
│ "We found additional historical material."
│
▼
DISCOVERY INDEX
│
│ 8 variants
│ 4 possible places
│ 11 archive references
│ 3 migration clues
│
▼
SOURCE COVERAGE
│
│ 9 source groups checked
│ 6 useful
│
▼
PERSONALISED COVER
│
│ NAME ATLAS
│ [YOUR SURNAME]
│ RESEARCH EDITION
│
▼
TABLE OF CONTENTS
│
│ Real report scope
│ Confidence
│ Sources
│
▼
PAYWALL
│
│ Full Name Atlas
│ 29 PLN — TEST CONTROL
│ vs
│ 49 PLN — TEST VARIANT
│
│ ONE-TIME
│ NO SUBSCRIPTION
│
▼
GUEST CHECKOUT
│
│ Apple Pay / Google Pay / Card
│ email for delivery
│
▼
PURCHASE
│
▼
PREMIUM REPORT
│
│ user consumes value
│
▼
FAMILY ORIGIN OPPORTUNITY
│
│ only after meaningful engagement
│
▼
79 PLN TEST
│
▼
DEEP FAMILY RESEARCH
│
▼
199 PLN TEST
│
▼
HUMAN-VERIFIED RESEARCH
```

---

# FINAL ANSWER TO THE TWO QUESTIONS

## 1. How should Name Atlas monetise without feeling like paying to remove a lock?

The paid transition should occur at the exact moment the **nature of the work changes**.

Free answers:

> **What does this surname mean and where is it found?**

Paid answers:

> **What historical evidence exists beyond that basic answer?**

Family Origin answers:

> **Which parts may be relevant to my family?**

Deep Research answers:

> **Which specific records could relate to people in my family?**

Human Research answers:

> **Can these candidate records actually be verified?**

Each tier therefore purchases **more expensive research**, not merely more UI.

---

## 2. How do we maximise revenue per user without damaging trust?

Not by maximizing the number of paywalls.

By maximizing the number of **credible value transitions**:

**free utility → paid historical depth → personalized family relevance → record-level research → human expertise.**

The highest-LTV user should not be the person who was pushed hardest.

It should be the person who repeatedly sees:

> **“Every time I pay Name Atlas, it does a materially deeper piece of work.”**

That is the monetisation principle I would make non-negotiable for the product.
