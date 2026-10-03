# SEO_CONTENT_PLAN.md — what to publish for search, and in what order

The queue of editorial pieces and data studies, and the map from search queries to the surface that answers them. The rules are ADR-0031's; this file holds the order. Adopted 2026-10-03 from the owner's *Name Atlas — SEO + GEO Research & Content Strategy* (research date 3 October 2026), with ADR-0031 §3's amendments applied.

Demand labels below are directional. They are not search-volume figures: none was measured.

Status words: **live** (on `main`), **extend** (an existing post covers part of it; extend that post instead of adding a URL, ADR-0031 §2.5), **gated** (blocked by the named condition), **queued**.

**Indexing is off.** Every page serves `noindex` until the owner sets `SEO_INDEXING_ENABLED` (ADR-0031 §3.1, `PLAN.md` M8).

## 1. Thesis

Blog posts create curiosity. Surname pages answer personal queries. Data studies create authority. Sources create trust. The paid tiers serve deeper family intent. The aim is the most useful and citable Polish surname evidence layer, not the largest number of indexable URLs.

## 2. Query → surface

| Query or intent | Surface |
|---|---|
| `[nazwisko] znaczenie`, `pochodzenie`, `historia`, `warianty`, `mapa`, `ile osób ma nazwisko [X]` | the canonical surname page |
| `co oznacza końcówka -ski` | editorial (extend `koncowki-nazwisk`) |
| `skąd wzięły się nazwiska w Polsce` | editorial pillar |
| `czy osoby o tym samym nazwisku są rodziną` | editorial |
| `czy mapa nazwiska pokazuje pochodzenie rodziny` | editorial |
| `najrzadsze nazwiska w Polsce` | data study / hub |
| `nazwiska które zanikają` | original data study |
| `najbardziej regionalne nazwiska w Polsce` | data study, under ADR-0031 §3.2's restrictions |
| `jak sprawdzić pochodzenie nazwiska` | guide → surname search |
| `jak szukać nazwiska w starych źródłach` | archive guide |
| `jak znaleźć przodków` | genealogy guide (`jak-szukac-przodkow`, **live**) |
| `porównaj dwa nazwiska` | the comparison tool; pairs stay `noindex` |
| `[nazwisko] × województwo` | never a page (ADR-0031 §2.1) |

## 3. Surname-page intents

These patterns all land on the one surname URL (ADR-0031 §2.1). The page's sections and headings should answer each clearly; that rewording is its own task.

- **Name:** `[X]`, `nazwisko [X]`, `[X] nazwisko`
- **Meaning:** `[X] znaczenie`, `znaczenie nazwiska [X]`, `co oznacza nazwisko [X]`, `[X] etymologia`
- **Origin:** `[X] pochodzenie`, `pochodzenie nazwiska [X]`, `skąd pochodzi nazwisko [X]`
- **History:** `historia nazwiska [X]`, `[X] historia`, `[X] dawniej`, `[X] stare dokumenty`
- **Count and rarity:** `ile osób ma/nosi nazwisko [X]`, `[X] liczba osób`, `[X] popularność`, `[X] ranking`, `[X] rzadkie nazwisko`
- **Geography:** `[X] mapa`, `mapa nazwiska [X]`, `[X] występowanie`, `gdzie występuje nazwisko [X]`, `[X] województwa`
- **Forms:** `[X] warianty`, `[X] dawna pisownia`, `[X] forma żeńska`, `[X] forma męska`
- **Other:** `[X] znane osoby`, `[X] genealogia`, `[X] herb`, `[X] szlachta` (the last two answered only with ADR-0031 §3.5's correction)

## 4. Editorial queue

The first thirty pieces, in the strategy's order. Its proposed score is kept for ranking within a tier.

### Tier 1 — authority first

| # | Piece | Score | Status |
|---|---|---|---|
| 1 | Jak sprawdzić pochodzenie nazwiska? 7 źródeł, którym naprawdę można zaufać | 97 | live: `jak-sprawdzic-pochodzenie-nazwiska` (TASK-086) |
| 2 | Co naprawdę można wyczytać z nazwiska — a czego nie? | 96 | queued (brief §5.2) |
| 3 | Czy osoby z tym samym nazwiskiem są rodziną? | 96 | queued (brief §5.3) |
| 4 | Mapa nazwiska nie jest mapą Twojej rodziny. Jak ją poprawnie czytać? | 96 | queued (brief §5.4) |
| 5 | Skąd wzięły się nazwiska w Polsce? Od średniowiecza do PESEL | 95 | extend: `genealogia` has a short history section; decide at task time whether the pillar replaces it or links from it |
| 6 | Co oznacza końcówka -ski w polskim nazwisku? | 94 | extend `koncowki-nazwisk`; the original -ski statistic belongs to data study §7 |
| 7 | Nazwiska odmiejscowe: kiedy nazwisko naprawdę pochodzi od miejsca? | 94 | queued |
| 8 | Nazwiska patronimiczne: utworzone od imienia ojca | 92 | queued |
| 9 | Nazwiska od zawodów: od Kowala do Krawca | 90 | queued |
| 10 | Jak czytać dane PESEL o nazwiskach? | 94 | queued |

### Tier 2 — high-interest curiosity

| # | Piece | Score | Status |
|---|---|---|---|
| 11 | Najrzadsze nazwiska w Polsce — co właściwie znaczy „rzadkie”? | 95 | queued |
| 12 | Najpopularniejsze nazwiska w Polsce 2026 — ranking i metodologia | 89 | queued |
| 13 | Ile nazwisk istnieje w Polsce? Dlaczego nie ma jednej prostej liczby | 94 | queued |
| 14 | Dlaczego Kowalski i Kowalska nie powinny być bezmyślnie sumowane? | 91 | queued |
| 15 | Dlaczego polskie nazwiska mają formę męską i żeńską? | 91 | extend: `koncowki-nazwisk` covers -owa/-ówna |
| 16 | Nazwiska na -wicz i -ewicz — co naprawdę oznaczają? | 91 | extend `koncowki-nazwisk` |
| 17 | Nazwiska na -ak i -czyk — skąd się wzięły? | 89 | extend `koncowki-nazwisk` |
| 18 | Czy nazwisko zakończone na -ski oznacza szlacheckie pochodzenie? | 95 | queued, myth-correcting only (ADR-0031 §3.5) |
| 19 | Czy nazwisko może mieć kilka różnych początków? | 94 | queued |
| 20 | Dlaczego ta sama pisownia nazwiska nie musi oznaczać jednego rodu | 93 | queued; may merge with 3 |

### Tier 3 — history and genealogy bridge

| # | Piece | Score | Status |
|---|---|---|---|
| 21 | Jak znaleźć najstarszą wzmiankę o swoim nazwisku? | 96 | queued |
| 22 | Jak zmieniała się pisownia polskich nazwisk na przestrzeni wieków? | 94 | queued |
| 23 | Jak szukać nazwiska w starych książkach, gazetach i dokumentach? | 92 | queued |
| 24 | Polona dla genealogów: jak szukać nazwiska krok po kroku | 89 | queued |
| 25 | Geneteka: jak szukać przodków, gdy znasz tylko nazwisko | 87 | extend: `jak-szukac-przodkow` step 3 |
| 26 | Od nazwiska do drzewa genealogicznego — co robić dalej? | 93 | extend `jak-szukac-przodkow` |
| 27 | Jak sprawdzić rodzinną legendę o pochodzeniu? | 91 | queued |
| 28 | Nazwisko a migracja: czego można się dowiedzieć, a czego nie | 91 | queued |
| 29 | Jak polskie nazwiska zmieniały się po emigracji do USA | 88 | queued |
| 30 | Herb a nazwisko: dlaczego wspólne nazwisko nie daje prawa do herbu | 94 | queued, myth-correcting only (ADR-0031 §3.5) |

Every piece ends on the default call to action: "Sprawdź swoje nazwisko w Name Atlas."

## 5. Briefs for the first four new pieces

Each brief is a starting outline for its task, not a scope authority.

1. **Jak sprawdzić pochodzenie nazwiska?** Suggested slug `jak-sprawdzic-pochodzenie-nazwiska`. Sections: what are you actually looking for; a surname's etymology is not the family's origin; scholarly surname dictionaries; current frequency; geography; older forms; historical sources; only then the specific family; what not to infer. Answers "What is the most reliable way to determine a surname's origin?"
2. **Co naprawdę można wyczytać z nazwiska?** Sections: current bearers; frequency and rank; current geography; linguistic structure; possible etymologies; historical attestations; what a surname does not reveal; why genealogical sources are needed. A trust page and a recurring internal-link target.
3. **Czy osoby z tym samym nazwiskiem są rodziną?** Sections: why surnames arose independently; common vs rare; geography as a hint, not proof; what can confirm kinship (documents, a family tree, DNA). Matches the product's surname-level / family-level boundary.
4. **Mapa nazwiska nie jest mapą Twojej rodziny.** Sections: what the PESEL map shows (voivodeship of permanent registered residence); residence vs origin; present vs past; migration; suppressed cells; why a missing value is not 0; how to use the map as a hint. Every figure keeps its scope and date.

The strategy's fifth brief (the history pillar) is piece 5 above; see its status.

## 6. Data studies

Each is its own task, which first fixes method, denominator and suppression (ADR-0031 §2.3, §3.2–§3.4).

**Not gated** (national lists and the 2019–2026 editions are loaded; the national lists carry no regional caveat):

- Polish Surname Index 2026 (flagship, §8)
- The surnames growing fastest; declining fastest; most stable (2019–2026, per list)
- Biggest ranking movers 2019–2026; surnames crossing ranking thresholds; near-zero change; changes in the top 100; ranking volatility by rarity band
- Forms leaving and entering the published lists between editions
- The distribution of rarity: forms with ≤3, ≤5, ≤10, ≤100 published occurrences; percentile bands
- Morphology: share of published 2026 forms ending in -ski/-ska and other endings; -ski/-owski/-ewski; -wicz/-ewicz/-owicz; -ak/-czyk/-czak; average occurrences per ending; length distribution; compound (double-barrelled) surnames; longest and shortest forms; diacritic patterns; forms present on only one of the men's and women's lists
- Men's list vs women's list over time

**Regional, under ADR-0031 §3.2's restrictions** (published rows only; floor of 2 per cell; the unassigned share named; residence, never origin):

- Most geographically concentrated surnames; surnames with a published row in all 16 województwa. Not "surnames in only one": an absent cell is never a confirmed zero.
- Most distinctive or most concentrated surname per region; regional diversity; Mazowieckie vs Małopolskie
- Regional concentration of endings; regional changes over time

## 7. Ownable territories

1. Surname change over time.
2. Evidence-backed surname interpretation: what do the sources actually support?
3. Surname-statistics methodology: why simple numbers mislead.
4. Modern vs historical geography.
5. From surname to family: what to do next.

## 8. Flagship: the Polish Surname Index 2026

A reusable research page, repeated each year after the PESEL release.

- **Dataset:** dates, published forms, published occurrences (ADR-0031 §3.3), suppression rules, the men's and women's lists.
- **Distribution:** rarity histogram, percentile bands, the ≤3/≤5/≤10/≤100 counts, concentration among the most common.
- **Morphology:** common endings and their distribution.
- **Change:** 2019 → 2026 growth, decline, stability, rank movers.
- **Search:** "Where does your surname sit?" → the surname page.
- **Geography:** national spread vs concentration, under the regional restrictions (§6).

## 9. Conversion paths

| Path | Query | Asset | Next step |
|---|---|---|---|
| Meaning | co oznacza końcówka -ski | article | a surname page → its cards → share → deeper research |
| Rarity | najrzadsze nazwiska w Polsce | data study | enter a surname → the rarity card |
| History | jak sprawdzić historię nazwiska | guide | enter a surname → old print and archives → the paid tier later |
| Genealogy | jak znaleźć przodków po nazwisku | guide | surname-level evidence → sources → the family |

## 10. Roadmap and cadence

| Month | Focus |
|---|---|
| 1 | Trust foundation: pieces 1–4, 10. (The first indexed cohort is the owner's M8 decision, ADR-0031 §3.1.) |
| 2 | History of Polish surnames; formation types (5, 7–9) |
| 3 | Endings, extending `koncowki-nazwisk` with the morphology study |
| 4 | Rarity: the Polish Surname Index 2026 launch, pieces 11–13 |
| 5 | Geography: how to read a surname map; the regional studies under §6's restrictions |
| 6 | Historical change 2019–2026: the change studies |
| 7 | Archive research: Polona, variants, earliest attestations (21–24) |
| 8 | Genealogy bridge (26–28, extending `jak-szukac-przodkow`) |
| 9 | Regional studies, where the data is lawful and comparable |
| 10 | Heraldry and myths, myth-correcting only (18, 30) |
| 11 | Diaspora topics (29; backlog J) |
| 12 | The next annual index, after the PESEL release |

Target cadence, as the strategy proposes: two strong pieces a week and one data asset a month. Prefer 50 exceptional, sourced resources to 300 generic ones. Once Search Console has data, expand the clusters that earn impressions.

## 11. Backlog

The strategy's hundred titles, by group, after the first thirty. Each becomes a piece only through §4's overlap check.

- **A. Origin and meaning:** etymology; one or many origins; how linguists study surnames; the root; the motivation; from nicknames; from traits; from animals and plants; from old words.
- **B. Formation:** odmiejscowe; patronimiczne; odimienne; zawodowe; odapelatywne; przymiotnikowe; rzeczownikowe; how nicknames became surnames; how surnames became hereditary; why one surname arose several times.
- **C. Endings:** -ski, -owski, -ewski, -cki, -dzki, -wicz, -ewicz, -owicz, -ak, -czyk (each only with evidence of its own, ADR-0031 §2.6).
- **D. Statistics:** most common 2026; rarest; how many surnames; measuring rarity; what a rank means; why PESEL omits some forms; why sites' figures differ; how often PESEL lists are updated; reading a bearer count; may the two forms be summed.
- **E. Geography:** reading a map; map vs origin; regional surnames; Mazowsze, Wielkopolska, Silesia, Kashubia, Podlasie, the Kresy; why surnames cluster (regional pieces under §6's restrictions).
- **F. History:** when surnames arose; oldest; medieval; 16th century; peasant; burgher; noble; women's forms; old women's forms; spelling change.
- **G. Genealogy:** starting from a surname; finding ancestors; a family tree; Geneteka; Szukaj w Archiwach; a birth record; a marriage record; a maiden name; the parish; documenting sources (several extend `jak-szukac-przodkow`).
- **H. Trust and myths:** same surname, same family?; -ski and nobility; nationality; ethnic origin; map and roots; a surname and one village; the coat of arms; ancestors from a surname alone; can AI determine a surname's origin; spotting a false etymology.
- **I. Archives:** Polona; old newspapers; address books; parish registers; censuses; spelling variants; reading old records; the first mention; historical place names; recording citations.
- **J. Diaspora:** Polish surnames in the USA; why emigrants changed surnames; surnames without diacritics; -ski vs -sky; Americanization; searching a Polish surname in the USA; in Germany; in the UK; recognising an emigrant variant; linking a foreign record to a Polish form.

## 12. Competitors (context, not verified)

As the strategy records them (ADR-0031 §3.9): IJP PAN (scholarly etymology); Szukaj Nazwiska (PESEL stats, maps, suffixes); surname.pl (a broad commercial feature set); PolskieNazwiska (statistics and trends); Mapa Nazwisk (geography); FamilySearch and Ancestry (international records); genealogy blogs; heraldry sites. The gap to work: evidence quality, change over time, precise method, primary-source synthesis.

## 13. Sources the strategy cites

- PESEL surname dataset, dane.gov.pl: https://dane.gov.pl/pl/dataset/1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel
- IJP PAN, Internetowy Słownik Nazwisk w Polsce: https://nazwiska.ijppan.pl/
- Google Search spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- Google guidance for AI search experiences: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
