# NAME ATLAS — Information Architecture Blueprint

## 1. Executive Summary

Najważniejszą decyzją IA dla Name Atlas jest odejście od modelu:

> **nazwisko → tabela danych → kolejne widgety**

na rzecz:

> **nazwisko → kolejne pytania → kolejne rozdziały historii → dowody → przejście do konkretnej rodziny**

Name Atlas powinien mieć jedną wspólną architekturę danych, ale **dynamicznie składać doświadczenie zależnie od tego, co faktycznie wiadomo o danym nazwisku**.

Rdzeń rekomendowanej architektury:

```text
NAME
↓
TODAY
↓
WHERE
↓
MEANING
↓
ORIGINS
↓
THROUGH TIME
↓
MOVEMENT
↓
EVIDENCE
↓
YOUR FAMILY
↓
SOURCES
```

Nie każdy profil musi zawierać wszystkie rozdziały. System powinien posiadać **Adaptive Chapter Engine**:

```text
available + strong evidence
→ pełny rozdział

available + limited evidence
→ krótki rozdział / clue

conflicting evidence
→ compare hypotheses

no meaningful evidence
→ rozdział pomijamy

important absence
→ komunikujemy „nie udało się ustalić”
```

Druga fundamentalna decyzja:

**surname-level research i family-level research muszą być dwoma różnymi światami informacyjnymi.**

Name Atlas może powiedzieć:

> „Nazwisko występowało w tej miejscowości.”

Nie może na tej podstawie powiedzieć:

> „Twoja rodzina pochodziła z tej miejscowości.”

Dopiero:

```text
surname
+
family place
+
person
+
date
+
record
+
evidence
```

pozwala przechodzić do historii konkretnej rodziny.

---

# 2. Główne zasady IA

Cała architektura powinna przestrzegać siedmiu reguł.

### 1. Organize around questions, not datasets

Nie:

`Demographics / Linguistics / Archival Data`

tylko:

> Gdzie występuje?  
> Co oznacza?  
> Skąd może pochodzić?  
> Jak zmieniało się w czasie?  
> Czy możemy odnaleźć moją rodzinę?

### 2. Claims first, sources underneath

Użytkownik widzi najpierw:

> „Najsilniejszy ślad prowadzi do…”

a dopiero następnie:

> `Dlaczego tak sądzimy →`

Nie zaczyna od bibliografii.

### 3. Evidence remains accessible

Każdy interpretacyjny wniosek ma:

```text
claim
confidence
evidence
sources
last updated
```

### 4. No empty dashboards

Brak danych nie może generować pięciu pustych sekcji.

### 5. No false symmetry

Nie wszystkie nazwiska będą miały:

- migration story,
- heraldry,
- notable people,
- archives,
- historical variants.

IA nie może sugerować, że powinny.

### 6. Progressive depth

Najważniejsze informacje są łatwe.

Źródła i szczegóły są dostępne, ale nie dominują pierwszych ekranów.

### 7. Public knowledge ≠ private family research

Wyraźna granica pomiędzy:

**The surname**

a:

**Your family**

---

# 3. Content / Data Inventory

Legenda:

- **P0** — MVP
- **P1** — V1
- **P2** — V2
- **P3** — późniejszy research
- **F** — Free
- **P** — Premium
- **FO** — Family Origin
- **DR** — Deep Research
- **H** — Human Research

## Identity

| Data field | Category | User value | Confidence possible | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Surname | Identity | High | Verified | F | Surname | P0 |
| Normalized surname | Identity | Medium | Verified | F | Surname | P0 |
| Display form | Identity | High | Verified | F | Surname | P0 |
| Alternative modern spelling | Identity | High | Verified/Likely | F/P | Surname | P1 |
| Historical spelling | Identity | High | Verified/Likely | F/P | Surname | P1 |
| Original script | Identity | Medium | Verified | F | Surname | P1 |
| Transliteration | Identity | Medium | Verified/Likely | F | Surname | P1 |
| Language association | Identity | High | Likely/Possible | F | Surname | P0 |
| Pronunciation | Identity | Medium | Verified/Likely | F | Surname | P2 |

## Current distribution

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Population count | Current | Very high | Verified | F | Surname | P0 |
| National rank | Current | High | Verified | F | Surname | P0 |
| Rarity index | Current | High | Derived | F | Surname | P0 |
| Share of population | Current | High | Derived | F | Surname | P0 |
| Gender distribution | Current | Medium | Verified | F | Surname | P1 |
| Country distribution | Current | High | Verified/Estimated | F/P | Surname | P1 |
| Region distribution | Current | Very high | Verified | F | Surname | P0 |
| County/district distribution | Current | High | Verified | F/P | Surname | P1 |
| Commune/city distribution | Current | High | Verified | P | Surname | P1 |
| Concentration index | Current | Medium | Derived | F/P | Surname | P1 |
| Distribution snapshot date | Current | Medium | Verified | F | Surname | P0 |

## Origin

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Linguistic origin | Origin | Very high | Likely/Possible | F | Surname | P0 |
| Geographic origin | Origin | Very high | Likely/Possible | F/P | Surname | P0 |
| Surname type | Origin | High | Likely | F | Surname | P0 |
| Root / stem | Origin | High | Likely | F | Surname | P0 |
| Prefix/suffix | Origin | Medium | Likely | F | Surname | P1 |
| Meaning | Origin | Very high | Likely/Possible | F | Surname | P0 |
| Alternative etymology | Origin | High | Possible | P | Surname | P1 |
| Origin hypothesis | Origin | Very high | Likely/Possible | F/P | Surname | P0 |
| Competing hypotheses | Origin | High | Possible | P | Surname | P1 |
| Place-name derivation | Origin | High | Likely/Possible | P | Surname | P1 |
| Occupational derivation | Origin | High | Likely | F/P | Surname | P1 |
| Patronymic derivation | Origin | High | Likely | F/P | Surname | P1 |

## History

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Earliest surname-level reference | History | Very high | Verified | P | Surname | P1 |
| Earliest period found | History | High | Verified | F/P | Surname | P1 |
| Historical variants | History | Very high | Verified/Likely | Partial F / P | Surname | P0 |
| Variant chronology | History | High | Likely | P | Surname | P1 |
| Spelling evolution | History | High | Likely | P | Surname | P1 |
| Historical distribution | History | Very high | Verified/Estimated | P | Surname | P1 |
| Historical locations | History | Very high | Verified/Possible | P | Surname | P1 |
| Relevant historical context | History | Medium | Verified | P | Surname | P2 |
| Administrative-border context | History | Medium | Verified | P | Surname | P2 |

## Migration

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| International diaspora | Migration | High | Verified/Estimated | F/P | Surname | P1 |
| Internal geographic shift | Migration | High | Likely | P | Surname | P2 |
| Historical migration pattern | Migration | High | Possible/Likely | P | Surname | P2 |
| Possible migration route | Migration | High | Possible | P | Surname | P2 |
| Migration-era spelling variant | Migration | High | Likely | P | Surname | P2 |
| Country-specific adaptation | Migration | Medium | Likely | P | Surname | P2 |

Important:

A **surname migration pattern** is not automatically a migration event of the user's family.

## Archives

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Archive collection | Archives | High | Verified | P | Surname | P1 |
| Collection provider | Archives | Medium | Verified | F/P | Surname | P1 |
| Record type | Archives | High | Verified | P | Surname | P1 |
| Date range | Archives | High | Verified | P | Surname | P1 |
| Geographic coverage | Archives | High | Verified | P | Surname | P1 |
| Surname occurrence | Archives | High | Verified | P | Surname | P1 |
| Archive reference | Archives | High | Verified | P/DR | Both | P1 |
| Digitized record available | Archives | Very high | Verified | P/DR | Both | P2 |
| Source URL | Archives | High | Verified | P | Both | P1 |
| Search query used | Archives | Low user / high audit | Verified | Internal/DR | Both | P2 |

## Heraldry

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Surname appears in armorial | Heraldry | High | Verified | P | Surname | P2 |
| Named historical family | Heraldry | High | Verified | P | Surname | P2 |
| Coat of arms associated with documented family | Heraldry | High | Verified | P | Surname | P2 |
| Connection to user's family | Heraldry | Very high | Possible/Unconfirmed | DR/H | Family | P3 |
| Nobility warning | Trust | Essential | Verified | Always | Both | P0 |

Rule:

> `Surname appears in armorial ≠ your family was noble.`

---

# 4. People

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Historical bearer | People | Medium | Verified | F/P | Surname | P2 |
| Contemporary notable bearer | People | Low/Medium | Verified | F/P | Surname | P2 |
| Person → surname relationship | People | Medium | Verified | F/P | Surname | P2 |
| Person → family branch relationship | Family | Very high | Verified/Possible | DR | Family | P2 |

Notable people should **never become a guaranteed chapter**.

---

# 5. Family research

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Known family region | Family | Very high | User supplied | FO | Family | P1 |
| Parent | Family | Very high | User supplied | FO/DR | Family | P1 |
| Grandparent | Family | Very high | User supplied | FO/DR | Family | P1 |
| Maiden surname | Family | Very high | User supplied | DR | Family | P1 |
| Birth place | Family | Very high | User supplied/Verified | FO/DR | Family | P1 |
| Birth date/year | Family | Very high | User supplied/Verified | DR | Family | P1 |
| Marriage place/date | Family | High | User supplied/Verified | DR | Family | P2 |
| Death place/date | Family | High | User supplied/Verified | DR | Family | P2 |
| Known migration | Family | High | User supplied | FO | Family | P1 |
| Candidate ancestor | Family | Very high | Possible | DR | Family | P2 |
| Potential archival match | Family | Very high | Possible/Unconfirmed | DR | Family | P2 |
| Verified relationship | Family | Very high | Verified | DR/H | Family | P3 |
| Family branch | Family | Very high | Mixed | FO/DR | Family | P1 |

---

# 6. Meta / Trust

| Data field | Category | User value | Confidence | Access | Level | Priority |
|---|---|---:|---|---|---|---|
| Source | Meta | High | Verified | F/P | Both | P0 |
| Citation | Meta | High | Verified | F/P | Both | P0 |
| Confidence | Meta | High | Derived | F/P | Both | P0 |
| Claim type | Meta | High | System | F/P | Both | P0 |
| Methodology | Meta | High | System | F | Both | P0 |
| Last updated | Meta | Medium | Verified | F | Both | P0 |
| Dataset date | Meta | High | Verified | F | Both | P0 |
| Coverage | Meta | High | System | F/P | Both | P0 |
| Missing data | Meta | High | System | F/P | Both | P0 |
| Conflict note | Meta | High | System | F/P | Both | P0 |
| Research status | Meta | Medium | System | FO/DR | Family | P1 |

---

# 7. Core Information Objects

Nie budowałbym systemu wokół stron.

Budowałbym go wokół **obiektów wiedzy i claims**.

## 7.1 SURNAME ENTITY

**Definition:** kanoniczny obiekt reprezentujący nazwisko jako jednostkę językowo-historyczną.

Key attributes:

- canonical display name;
- normalized key;
- scripts;
- locales;
- language associations;
- entity status.

Public: yes  
Surname-level: yes  
SEO: yes  
Premium: entity itself no; deeper properties yes.

---

## 7.2 NAME FORM

Obejmuje:

- modern variant;
- historical spelling;
- transliteration;
- language form;
- migration adaptation.

Relationships:

```text
Surname
has_form
Name Form
```

Attributes:

- spelling;
- script;
- period;
- geography;
- type;
- evidence.

---

## 7.3 PLACE

Generic global object.

Nie kodujemy „województwa” jako fundamentalnego obiektu.

Place can have type:

```text
country
region
province/state
county/district
municipality
city
village
historical territory
parish
```

Dzięki temu IA jest global-ready.

---

## 7.4 DISTRIBUTION SNAPSHOT

Opisuje:

> gdzie nazwisko występuje w danym czasie i dataset.

Attributes:

- surname;
- date;
- geography level;
- count;
- population denominator;
- source.

To pozwala później mieć:

```text
2026 snapshot
1980 snapshot
1900 snapshot
```

bez zmiany modelu.

---

## 7.5 ORIGIN HYPOTHESIS

Nie „origin field”.

**Origin should be an object**, ponieważ mogą istnieć 2–4 konkurencyjne interpretacje.

Attributes:

- linguistic interpretation;
- geographic interpretation;
- type;
- reasoning;
- confidence;
- evidence.

---

## 7.6 MEANING INTERPRETATION

Może być powiązana z Origin Hypothesis.

Np.:

```text
Surname
→ may derive from
Root
→ meaning
Concept
```

To oddziela:

**„słowo oznacza X”**

od:

**„nazwisko prawdopodobnie wywodzi się od tego słowa”.**

---

## 7.7 HISTORICAL OCCURRENCE

Fundamentalny obiekt.

Nie oznacza osoby z rodziny.

Represents:

> nazwisko lub wariant pojawił się w konkretnym źródle, miejscu i czasie.

Attributes:

- surname form;
- date/period;
- place;
- source;
- record reference;
- context.

---

## 7.8 ARCHIVE COLLECTION

Np.:

- civil register;
- parish registers;
- census;
- tax register;
- immigration list;
- military record;
- address book.

---

## 7.9 ARCHIVAL REFERENCE

Nie musi być zeskanowanym dokumentem.

Represents:

> wskazanie, że istnieje wpis lub indeks w źródle.

---

## 7.10 PERSON

Public historical person or research person.

Attributes:

- name;
- dates;
- places;
- records;
- public/private status.

---

## 7.11 FAMILY PERSON

Osobny privacy context.

Represents person supplied/researched as part of user's family.

Never indexable.

---

## 7.12 FAMILY BRANCH

Grupa osób mających hipotetyczną lub potwierdzoną relację rodzinną.

---

## 7.13 POTENTIAL RECORD MATCH

Critical object.

Represents:

> konkretny rekord może odpowiadać konkretnej Family Person.

Nie jest „ancestor”.

Attributes:

- candidate record;
- person;
- match factors;
- conflicts;
- confidence;
- review status.

---

## 7.14 MIGRATION PATTERN

Surname-level phenomenon.

May connect:

```text
Place A
Period
Place B
```

Must not imply family-specific migration.

---

## 7.15 MIGRATION EVENT

Family-level confirmed/potential event.

Different object.

This distinction is crucial.

---

## 7.16 CLAIM

Najważniejszy abstrakcyjny obiekt systemu.

Every important sentence in Name Atlas should effectively be a Claim.

Example:

> “The surname is likely derived from a place-name.”

Attributes:

```text
type
statement
subject
confidence
evidence[]
sources[]
scope
locale
last_updated
```

---

## 7.17 EVIDENCE ITEM

Evidence supporting or contradicting a claim.

Types:

- authoritative dataset;
- scholarly dictionary;
- primary archival record;
- secondary historical source;
- derived statistic;
- algorithmic similarity;
- user-provided fact.

---

## 7.18 SOURCE

Source itself.

Attributes:

- provider;
- title;
- URL/identifier;
- source type;
- rights/licence;
- date;
- geographic scope.

---

## 7.19 TIMELINE EVENT

Presentation object assembled from:

- occurrences;
- variants;
- migrations;
- contextual history;
- family records.

---

## 7.20 REPORT

A curated narrative of underlying objects.

Report should never be the database itself.

Types:

- Free Snapshot;
- Name Atlas Report;
- Family Origin;
- Deep Research;
- Human Research.

---

# 8. Conceptual Entity Map

```text
                         ┌─────────────┐
                         │   SOURCE    │
                         └──────┬──────┘
                                │ supports
                                ▼
┌──────────┐     has      ┌─────────────┐
│ SURNAME  │─────────────▶│    CLAIM    │
└────┬─────┘              └─────┬───────┘
     │                          │
     │ has forms                │ supported by
     ▼                          ▼
┌───────────┐             ┌─────────────┐
│ NAME FORM │             │  EVIDENCE   │
└────┬──────┘             └──────┬──────┘
     │                           │
     │ appears in                │ references
     ▼                           ▼
┌──────────────────┐      ┌──────────────────┐
│ HIST. OCCURRENCE │─────▶│ ARCHIVAL REF.    │
└────┬─────────────┘      └───────┬──────────┘
     │                             │ belongs to
     ▼                             ▼
┌───────────┐               ┌──────────────┐
│   PLACE   │               │ COLLECTION   │
└────┬──────┘               └──────────────┘
     │
     │ distribution over time
     ▼
┌──────────────────────┐
│ DISTRIBUTION SNAPSHOT│
└──────────────────────┘


SURNAME
  │
  ├── Origin Hypothesis
  ├── Meaning Interpretation
  ├── Migration Pattern
  ├── Historical Occurrence
  └── Public Person


                         FAMILY RESEARCH

USER
 │
 ▼
FAMILY BRANCH
 │
 ├── FAMILY PERSON
 │       │
 │       ├── known PLACE
 │       ├── known DATE
 │       └── POTENTIAL RECORD MATCH
 │                        │
 │                        ▼
 │                  ARCHIVAL RECORD
 │
 └── MIGRATION EVENT

POTENTIAL MATCH
      ↓ sufficient evidence
VERIFIED RELATIONSHIP
```

---

# 9. Four possible Surname Profile models

## Model A — Chronological Story

```text
Today
↓
Where
↓
Meaning
↓
Origins
↓
First traces
↓
Through time
↓
Migration
↓
Today again
↓
Your family
```

| Dimension | Score |
|---|---:|
| Learnability | 4/5 |
| Emotional narrative | 5/5 |
| SEO | 3/5 |
| Mobile | 5/5 |
| Free→Premium | 5/5 |
| Global scaling | 4/5 |
| Cognitive load | Low |

Weakness: linguistic origin does not always have a natural chronological position.

---

# Model B — Atlas Dimensions

```text
Snapshot
Geography
Language
Origins
Time
Movement
Evidence
Family
```

| Dimension | Score |
|---|---:|
| Learnability | 5/5 |
| Emotional narrative | 4/5 |
| SEO | 5/5 |
| Mobile | 4/5 |
| Free→Premium | 4/5 |
| Global scaling | 5/5 |
| Cognitive load | Low |

This is structurally strongest.

---

# Model C — Questions

```text
How common is it?
Where is it found?
What does it mean?
Where might it come from?
How has it changed?
Where does history lead?
What evidence exists?
Can we trace my family?
```

| Dimension | Score |
|---|---:|
| Learnability | 5/5 |
| Emotional narrative | 4/5 |
| SEO | 5/5 |
| Mobile | 5/5 |
| Free→Premium | 5/5 |
| Global scaling | 5/5 |
| Cognitive load | Very low |

Weakness: can feel like FAQ if treated too literally.

---

# Model D — Evidence Journey

```text
What we know
↓
What it suggests
↓
What changed
↓
What we found
↓
What remains uncertain
↓
What could be researched next
```

| Dimension | Score |
|---|---:|
| Learnability | 3/5 |
| Emotional narrative | 5/5 |
| SEO | 2/5 |
| Mobile | 5/5 |
| Free→Premium | 5/5 |
| Global scaling | 4/5 |
| Cognitive load | Medium |

Excellent for premium research, weaker for public SEO.

---

# 10. Recommended model

## Hybrid: **Atlas Chapters + Question-led headings**

Underlying IA uses Model B.

User-facing narrative uses Model C.

Example:

### 01 — Today
**How common is your surname today?**

### 02 — Where
**Where is it found?**

### 03 — Meaning
**What might it mean?**

### 04 — Origins
**Where could it have begun?**

### 05 — Through Time
**How has the name changed?**

### 06 — Movement
**Where did the name travel?**

### 07 — Evidence
**What historical traces exist?**

### 08 — Your Family
**Can any of this lead to your family?**

### 09 — Sources
**Why do we think this?**

This gives:

- user clarity;
- SEO semantics;
- narrative continuity;
- global scalability.

---

# 11. Final Surname Profile IA

## Chapter 0 — Name Identity

Very short.

```text
Surname
language/script
basic classification
data coverage indicator
```

Not a standalone huge chapter.

---

## Chapter 1 — Today

Answers:

> How common is it?

Includes:

- population;
- rarity;
- rank;
- share of population;
- gender if meaningful.

FREE.

---

## Chapter 2 — Where

Answers:

> Where does it occur today?

Includes:

- country;
- region;
- local concentrations;
- modern map.

FREE core.

Deeper geographic detail Premium if needed.

---

## Chapter 3 — Meaning

Answers:

> What does the surname probably mean?

Includes:

- linguistic root;
- type;
- meaning;
- suffix/prefix;
- alternative interpretation indicator.

Core FREE.

---

# Chapter 4 — Origins

Answers:

> Where might the name have begun?

Includes:

- linguistic origin;
- geographic origin;
- place hypotheses;
- alternative hypotheses;
- confidence.

Top-level hypothesis FREE.

Full comparison Premium.

---

# Chapter 5 — Through Time

Answers:

> How did the surname change?

Includes:

- historical spellings;
- earliest available surname-level occurrences;
- spelling evolution;
- historical geography.

First clue FREE.

Full chapter Premium.

---

# Chapter 6 — Movement

Answers:

> How did the surname spread?

Only generated when data supports it.

Includes:

- modern diaspora;
- historical distribution differences;
- possible migration patterns;
- migration-created variants.

Premium.

---

# Chapter 7 — Evidence

Answers:

> What historical traces exist?

Includes:

- archive collections;
- time ranges;
- occurrence counts;
- historical people;
- heraldic references when applicable.

Premium.

---

# Chapter 8 — Your Family

Answers:

> Can this history lead to your branch?

This is **not another surname chapter**.

It's a transition object.

```text
WHAT WE KNOW ABOUT THE SURNAME
             ↓
WHAT WE NEED TO KNOW ABOUT YOUR FAMILY
```

Family Origin begins here.

---

# Chapter 9 — Sources & Method

Always available.

Not Premium-hidden.

Premium can contain deeper bibliography, but basic evidence for free claims remains visible.

---

# 12. Information priority

## LEVEL 1 — Immediate

Within 5 seconds:

- surname;
- modern population count;
- rarity;
- primary country/region context.

User should immediately understand:

> “This result is really about my surname.”

---

# LEVEL 2 — Core

Free discovery:

- current map;
- meaning;
- linguistic origin;
- strongest geographic origin hypothesis;
- one or two historical variants;
- source/confidence.

---

# LEVEL 3 — Deep

Historical story:

- all variants;
- earliest references;
- historical geography;
- related places;
- competing etymologies.

Premium.

---

# LEVEL 4 — Research

Evidence layer:

- archive collections;
- archival occurrences;
- migration clues;
- historical people;
- possible heraldic references;
- source comparison.

Premium.

---

# LEVEL 5 — Personal

Family-specific:

- family region;
- known parents/grandparents;
- maiden names;
- dates;
- known migrations;
- overlap surname evidence ↔ family evidence.

Family Origin / Deep Research.

---

# LEVEL 6 — Expert

- archival interpretation;
- manual record matching;
- resolving conflicts;
- reconstructing relationships;
- human verification.

Human Research.

---

# 13. Free / Premium architecture

The boundary should not be:

> “interesting = paid”.

It should be:

> **basic answer = free**  
> **depth + historical research = paid**  
> **personalization = higher tier**

## Matrix

| Section | Free | Preview | Premium | Family | Deep Research |
|---|---|---|---|---|---|
| Name identity | Full | — | — | — | — |
| Current count | Full | — | — | — | — |
| Rarity | Full | — | — | — | — |
| Modern map | Core | local detail | Full | contextual | — |
| Meaning | Core | — | Full evidence | — | — |
| Origin | Primary hypothesis | alternatives | Full | compare to family | — |
| Historical variants | 1–2 examples | count | Full list + chronology | relevant variants | — |
| Earliest references | period/basic clue | count | Full context | filtered | candidate records |
| Historical places | one clue if strong | count | Full | overlap | record-specific |
| Historical distribution | basic | preview | Full | compare | — |
| Migration | none/basic diaspora | count | Full | family relevance | specific events |
| Archives | source types | counts | collection detail | targeted | record-level |
| Heraldry | warning + availability | existence | source detail | — | verification |
| Notable people | optional free | — | optional full | — | — |
| Sources | Free claims visible | — | Full bibliography | full | full |
| Family research | explanation | scope | — | Full | Full |
| Candidate ancestors | — | — | — | limited | Full |
| Verified relationships | — | — | — | — | H/DR |

---

# 14. Logical premium boundary

The cleanest boundary is:

```text
FREE
What is this surname?

PREMIUM
What is the deeper history of this surname?

FAMILY ORIGIN
Which part of that history could relate to my family?

DEEP RESEARCH
Which specific historical records could relate to known people in my family?

HUMAN RESEARCH
Can an expert verify or reconstruct the relationship?
```

That sentence should guide the entire product.

---

# 15. Navigation model

## Primary recommendation

**Scroll is primary. Chapter navigation is secondary.**

Do not make users decide what to open before they've discovered anything.

---

# Desktop navigation

While reading surname profile:

```text
NAME ATLAS

01 Today
02 Where
03 Meaning
04 Origins
05 Through Time
06 Movement
07 Evidence
08 Your Family
09 Sources
```

Compact sticky chapter rail or top-level chapter control.

Not a conventional app sidebar.

Current chapter visible.

---

# Mobile navigation

Primary:

**continuous vertical discovery**

Secondary:

small chapter indicator:

```text
03 / 08
MEANING
```

Tap opens sheet:

```text
Your Atlas

✓ Today
✓ Where
• Meaning
  Origins
  Through Time
  Movement
  Evidence
  Your Family
```

Avoid permanent bottom navigation with 8 destinations.

---

## Swiping

Use swipe for:

- map periods;
- alternative hypotheses;
- historical variants;
- archive previews.

Do **not** make swipe the only way to move through the main narrative.

Vertical scroll is much more discoverable.

---

# Report navigation

Premium report gets:

### Table of Contents

+

### Continue Reading

+

### Jump to Sources

On mobile:

`Chapters` opens bottom sheet.

---

# 16. Mobile-first information flow

## SCREEN 01 — Search

Purpose: start.

Answers:

> “Can Name Atlas check my surname?”

Information:

- product proposition;
- surname input.

Status: Free.

Interaction: search.

Next: validation/resolution.

---

## SCREEN 02 — Search resolution

Purpose: confirm entity.

Possible:

- exact surname;
- corrected surname;
- variant;
- multiple matches.

Question:

> “Did the system understand the surname?”

---

## SCREEN 03 — Name Snapshot

Information:

- surname;
- count;
- rarity;
- rank.

Answers:

> “How common is it?”

Free.

---

# SCREEN 04 — Geography

Information:

- modern distribution map;
- strongest concentrations.

Answers:

> “Where is it today?”

Free.

---

# SCREEN 05 — Meaning

Information:

- short meaning;
- surname type;
- root.

Answers:

> “What does it mean?”

Free.

---

# SCREEN 06 — Origin

Information:

- primary origin hypothesis;
- linguistic/geographic distinction;
- confidence.

Answers:

> “Where might it come from?”

Free.

---

# SCREEN 07 — Why we think this

Information:

- evidence summary;
- source count;
- alternative interpretation indicator.

Answers:

> “Can I trust this?”

Free.

---

# SCREEN 08 — Through Time preview

Information:

- 1–2 historical variants;
- earliest available period;
- count of additional material.

Question:

> “Has it always looked like this?”

Partly Free.

---

# SCREEN 09 — Historical place clue

If available.

Information:

- one notable historical location/region.

If unavailable, skip.

---

# SCREEN 10 — Discovery summary

```text
Further historical material found:

X variants
X locations
X archive collections
X migration clues
```

No fake fixed counts.

Preview.

---

# SCREEN 11 — Premium transition

Explains:

> “The free result describes the surname today and its likely origin. The full Atlas follows it through historical sources.”

Premium entry.

---

# SCREEN 12 — Premium scope

Actual available chapter list.

No generic fixed package if data doesn't exist.

---

# SCREEN 13 — Purchase

One-off surname report.

---

# SCREEN 14 — Premium Report

Begins from summary then proceeds historically.

---

# SCREEN 15 — Family transition

After meaningful report consumption:

> **This is the history of the surname.**
>
> **Now we can ask a different question: which part of it could belong to your family?**

This is the critical transition.

---

# 17. Family Research Transition

## It should be explicit, not hidden

Use language equivalent to:

> **Surname history is not the same as family history.**

Then:

> To investigate your family branch, Name Atlas needs at least one fact that belongs specifically to your family.

---

# Minimum useful Family Origin input

Required:

### 1. Family connection to surname

e.g. father/mother/grandparent/self.

### 2. Known region or place

Allow:

`I don't know`.

If truly unknown, Family Origin quality may be limited.

---

# Optional Family Origin data

- parent birthplace;
- grandparent birthplace;
- known migration;
- approximate generation;
- maiden surnames.

Avoid collecting detailed birth dates until needed.

---

# Deep Research inputs

Usually:

- full name;
- approximate birth year;
- known place;
- spouse/parent if known.

Optional:

- exact date;
- church/parish;
- occupation;
- known siblings.

---

# What becomes private?

Everything specific to a user's family:

```text
Family Person
Family Branch
Family Place
Family Date
Potential Match
Private Note
User-uploaded record
Research Case
```

Never index.

Never expose in public related discovery.

---

# 18. Family Origin IA

Family Origin should NOT duplicate Name Report.

## Chapter 1 — What the surname tells us

Short summary only.

---

## Chapter 2 — What you told us

Explicit provenance:

```text
You told us:
Family region: [...]
Known migration: [...]
Known grandparent place: [...]
```

---

## Chapter 3 — Where the evidence overlaps

The key chapter.

```text
Surname evidence
        ∩
Your family information
```

Could produce:

- strong overlap;
- weak overlap;
- conflicting evidence;
- insufficient evidence.

---

## Chapter 4 — Most relevant places

Ranked by evidence, not generic population.

---

## Chapter 5 — Most relevant time periods

Based on family information.

---

## Chapter 6 — Relevant surname variants

Only variants worth searching for that branch.

---

## Chapter 7 — Archives worth searching

Not generic list.

Targeted by:

- location;
- period;
- record availability.

---

## Chapter 8 — Open questions

Excellent credibility feature.

Examples:

> We still need an approximate birth year.

> Two regions remain plausible.

---

## Chapter 9 — Next research steps

Actionable.

---

# 19. Deep Research IA

The unit of organization changes.

Not surname chapters.

Now:

```text
PERSON
↓
PLACE
↓
DATE
↓
RECORD
↓
MATCH
↓
EVIDENCE
```

## Deep Research TOC

### 01 Research subject

Who are we looking for?

---

### 02 Known facts

User-supplied and verified separately.

---

### 03 Search scope

Collections, places, periods.

---

### 04 Candidate records

Each Candidate Match:

```text
Candidate Record #01

Name match
Place match
Date match
Parent/spouse match
Conflicts

POSSIBLE
```

---

### 05 Evidence comparison

Candidate A vs B vs C.

---

### 06 Potential relationships

Never draw a full family connection unless supported.

---

### 07 Rejected candidates

Extremely valuable trust feature.

Explain why records were excluded.

---

### 08 Current conclusion

Could be:

- likely match;
- several possibilities;
- insufficient evidence;
- no matching records.

---

### 09 Next step

Human verification / new user info / another archive.

---

# 20. Confidence / Evidence Architecture

A critical distinction:

## Claim Type ≠ Confidence

A statement can be:

**FACT**  
**INTERPRETATION**  
**HYPOTHESIS**  
**POTENTIAL MATCH**

and separately carry a confidence status.

---

# VERIFIED

Definition:

Direct evidence supports the exact statement.

Examples:

- modern count from authoritative dataset;
- surname occurrence in a dated archive;
- historical person listed in primary source.

Required:

- strong source;
- direct match;
- no material contradiction.

---

# LIKELY

Definition:

The interpretation is best supported by available evidence but is inferential.

Examples:

- probable surname origin;
- most plausible etymology.

Required:

- one high-quality scholarly interpretation or;
- multiple independent supporting indicators.

---

# POSSIBLE

Definition:

Plausible, but evidence is incomplete or multiple alternatives remain.

Example:

- possible place of surname origin;
- possible migration pattern.

---

# UNCONFIRMED

Definition:

A lead exists but does not currently support a substantive conclusion.

Example:

- candidate family record;
- heraldic family sharing surname.

---

# NO EVIDENCE

Definition:

Relevant sources were checked but did not provide evidence.

Does **not** mean:

> impossible / false.

Copy should say:

> “We did not find sufficient evidence in the sources currently indexed.”

---

# 21. Content hierarchy for confidence

Do not lead with labels.

Recommended:

```text
The surname is most likely connected
to a place-name origin.

LIKELY

Why we think this →
```

Not:

```text
LIKELY 72%
PLACE NAME ORIGIN
```

unless 72% is a genuinely calibrated model probability.

---

# Source Panel

Every claim may expand:

```text
WHY WE THINK THIS

Evidence
1. Source A
   scholarly dictionary

2. Source B
   geographic distribution

3. Source C
   historical occurrence

Alternative interpretation
[...]

Last reviewed
[...]

Methodology →
```

---

# 22. Conflicting data architecture

Conflicting evidence should create **structured comparison**, not an error.

## Different population counts

Show:

> **Latest official count: X**

Then:

> Another dataset reports Y.

Explain:

- dataset date;
- methodology;
- scope.

Do not average numbers without methodological justification.

---

# Different etymologies

Do:

```text
Two interpretations exist.

INTERPRETATION A
Likely
Evidence...

INTERPRETATION B
Possible
Evidence...
```

Then:

> Why we currently favour A.

---

# Multiple possible geographic origins

Map each hypothesis separately.

Never merge into one fake centroid.

---

# Missing historical information

State:

> We can describe the surname today, but the historical evidence currently indexed is limited.

Then show what **is** known.

---

# New surname

Possible causes might include:

- recent formation;
- administrative spelling;
- migration;
- transliteration.

But do not infer one without evidence.

---

# Multicultural surname

Don't force one country.

Architecture supports:

```text
Origin Hypothesis A — Culture X
Origin Hypothesis B — Culture Y
```

---

# Transliteration

Always separate:

- original script;
- romanized form;
- migration-era form.

---

# Compound surnames

Surname entity may contain:

```text
compound surname
component A
component B
relationship type
```

Never automatically split if naming culture says otherwise.

---

# 23. Adaptive / low-data architecture

Create four coverage modes.

## A — Rich coverage

Available:

- modern distribution;
- origin;
- variants;
- historical occurrences;
- archive references;
- migration.

Experience:

full 8 chapters.

---

# B — Standard coverage

Available:

- distribution;
- meaning;
- origin;
- a few variants;
- limited history.

Experience:

5–6 chapters.

No empty Migration chapter.

---

# C — Limited coverage

Available:

- modern count;
- geography;
- partial linguistic clue.

Experience becomes:

```text
Today
Where
What we can infer
What we could not establish
How to continue
```

This can still be useful.

---

# D — Minimal / unknown

No meaningful entity match.

Experience:

> We don't currently have enough evidence to build a reliable surname profile.

Then:

- show candidate normalized variants;
- search alternate spelling;
- search country;
- allow adding context;
- never generate generic AI etymology.

---

# 24. Adaptive chapter rules

Every chapter has:

```text
availability:
strong
partial
none

importance:
core
supporting
optional

access:
free
premium
family

confidence_summary:
...
```

Rendering rule:

```text
strong → full chapter
partial + useful → compact chapter
partial + misleading → omit
none → omit
important absence → mention in Evidence Summary
```

---

# 25. Programmatic SEO architecture

There are three potential models.

## A — One canonical surname page

```text
/surname/[surname]
```

Advantages:

- strong canonical authority;
- no thin content fragmentation;
- easy UX;
- easier maintenance.

Disadvantages:

- less exact targeting of `meaning`, `origin`, `map`.

---

# B — Multiple pages

```text
/surname/[surname]/meaning
/surname/[surname]/origin
/surname/[surname]/map
/surname/[surname]/history
```

Advantages:

- exact search intent.

Risks:

- thin pages;
- duplication;
- crawl explosion;
- poor UX;
- cannibalisation.

---

# C — Hybrid

## Recommendation

Start with:

### ONE CANONICAL SURNAME PROFILE

```text
/pl/nazwisko/[slug]
/en/surname/[slug]
```

with strong section anchors:

```text
#meaning
#origin
#map
#history
#variants
```

Search engines can index the comprehensive page.

Only later create dedicated subpages **when that module has enough unique content and demand**.

Example eligibility:

`/[surname]/history`

only if:

- enough historical occurrences;
- unique narrative;
- meaningful timeline;
- not just repeated content.

---

# 26. SEO content qualification

Before generating indexable page:

```text
Is entity resolved?
↓
Is data unique?
↓
Is there enough useful content?
↓
Are primary claims sourced?
↓
Is this substantially different
from other pages?
↓
INDEX
```

Otherwise:

- noindex;
- canonical elsewhere;
- search-accessible internally.

---

# 27. SEO sitemap

## Public core

```text
/
 /search
 /methodology
 /sources
 /about
 /gift
```

---

## Surname

```text
/{locale}/surname/{surname}
```

Localized route aliases may use:

```text
/pl/nazwisko/{surname}
/de/nachname/{surname}
```

while resolving to the same internal entity.

---

## Country discovery

```text
/country/{country}/surnames
/country/{country}/most-common
/country/{country}/rare-surnames
```

---

## Region discovery

```text
/country/{country}/region/{region}/surnames
```

Only where source coverage supports it.

---

## Rankings

```text
/surnames/most-common
/surnames/rare
/surnames/by-letter/{letter}
```

---

## Related surname

Prefer relationship module inside surname profile.

Dedicated variant pages only if they represent independent surname entities.

---

## Comparison

Potential later:

```text
/compare?surname=a&surname=b
```

Typically noindex unless producing genuinely unique stable content.

---

# 28. Internal linking

Each surname profile can link to:

### Variant relationship
> Historical variant

### Linguistic relationship
> Related surname root

### Geographic relationship
> Other surnames concentrated in the same region

### Place relationship
> Surnames associated with a location

### Family action
> Search mother's maiden surname

Avoid generic:

> You may also like.

Use:

> **Explore another branch of the evidence.**

---

# 29. Search Architecture

Search should operate on entities, not raw strings.

## Query pipeline

```text
User input
↓
Unicode normalization
↓
Preserve original form
↓
Case normalization
↓
Diacritic-insensitive candidate search
↓
Exact entity match
↓
Known modern variant
↓
Historical variant
↓
Transliteration candidates
↓
Fuzzy typo candidates
↓
Ranking
```

---

# 30. Search states

## EXACT RESULT

> We found this surname.

---

## NORMALIZED RESULT

Input without diacritic.

Example logic:

> Showing results for the standard spelling **[X]**.

Allow:

`Search exactly as typed`.

---

# DID YOU MEAN

Only when confidence is high.

Never auto-replace a rare surname silently.

---

# VARIANT FOUND

> The form you entered appears to be a known historical or regional variant of [X].

Options:

- explore canonical surname;
- explore this form.

---

# MULTIPLE POSSIBLE MATCHES

Show disambiguation:

```text
[X] — Polish surname
[X] — transliteration of [...]
[X] — historical form of [...]
```

---

# NO CURRENT RESULT

Potentially historical surname.

> We did not find this form in the current population dataset, but historical sources may contain it.

---

# NO RESULT

Use:

> We couldn't confidently match this surname in the sources currently indexed.

Not:

> This surname does not exist.

Actions:

- try original spelling;
- add country;
- add script;
- see possible variants.

---

# 31. Search ranking

Priority:

```text
1 exact modern surname
2 exact script-preserved form
3 known standardized form
4 known variant
5 transliteration
6 diacritic-normalized form
7 high-confidence typo
8 fuzzy candidate
```

Never rank pure fuzzy result above verified variant.

---

# 32. Related Discovery Graph

Related discovery should be relational.

```text
                         SURNAME
                            │
        ┌───────────────────┼──────────────────┐
        │                   │                  │
     VARIANTS             PLACES            ROOT
        │                   │                  │
 historical spellings    origin locations   related surnames
        │
        ├───────────────┐
        │               │
    MIGRATION        FAMILY
                     │
                  mother's surname
                  father's surname
                  partner surname
```

Useful prompts:

### After meaning
> Explore surnames from the same linguistic root.

### After map
> Explore the place most strongly associated with this surname.

### After variants
> Search one of its historical forms.

### After Family
> Add your mother's maiden surname.

---

# 33. Premium Report IA

## Final proposed TOC

### Cover
Name + edition + coverage period.

---

### 00 — Executive Summary

One page:

- strongest origin hypothesis;
- current rarity;
- key geographic concentration;
- historical depth;
- confidence summary.

---

### 01 — The Name Today

- population;
- rarity;
- ranking;
- modern geography.

---

### 02 — Meaning & Structure

- root;
- meaning;
- surname type;
- linguistic analysis.

---

### 03 — Origin Hypotheses

- primary interpretation;
- alternative interpretations;
- evidence comparison.

---

### 04 — Places

- modern concentrations;
- potential origin places;
- historical locations.

---

### 05 — Through Time

- earliest available occurrences;
- historical forms;
- spelling evolution.

---

### 06 — Movement

Only if data supports it.

- domestic shifts;
- international diaspora;
- possible migration patterns.

---

### 07 — Historical Evidence

- archive collections;
- historical occurrences;
- record types;
- source context.

---

### 08 — Heraldic / Historical Family References

Only when available.

With warning.

---

### 09 — Documented Bearers

Only when useful.

---

### 10 — What We Know / What Remains Open

Extremely important.

---

### 11 — Sources & Method

Full bibliography.

---

### 12 — Continue Into Your Family

Transition to Family Origin.

---

# 34. Family Origin Report IA

## 00 — Family Research Summary

What this report does and doesn't claim.

---

## 01 — Surname Context

Very condensed version of Name Report.

---

## 02 — Your Known Family Context

Everything supplied by user.

Clearly labeled:

**Provided by you.**

---

## 03 — Geography Overlap

Compare:

```text
surname concentration
historical surname places
known family places
```

---

## 04 — Time Overlap

Known generation vs available records.

---

## 05 — Relevant Name Variants

Forms worth researching for that branch.

---

## 06 — Most Relevant Locations

Ranked with evidence.

---

## 07 — Relevant Archives

Targeted.

---

## 08 — Family-Origin Hypotheses

Example:

Hypothesis A — Likely  
Hypothesis B — Possible

---

## 09 — What We Don't Yet Know

Critical.

---

## 10 — Recommended Next Evidence

Examples:

- approximate birth year;
- mother's maiden surname;
- parish;
- immigration destination.

---

## 11 — Next Research Step

Deep Research.

---

# 35. Deep Research IA

## 00 Research Case

Identifier, purpose, scope.

---

## 01 Target Person

Who are we investigating?

---

## 02 Known Facts

Split:

### User-provided
### Verified

---

## 03 Search Space

- places;
- date range;
- surname variants;
- archives.

---

## 04 Sources Checked

What was actually searched.

---

## 05 Candidate Records

Structured records.

---

## 06 Match Analysis

Per candidate:

```text
NAME        match
DATE        match / conflict
PLACE       match
PARENTS     unknown
SPOUSE      match
VARIANT     plausible
```

---

## 07 Confidence

Potential Match / Likely Match / Verified Match.

---

## 08 Rejected Candidates

Important.

---

## 09 Relationship Hypotheses

No family-tree line unless evidence supports it.

---

## 10 Current Conclusion

Could explicitly be:

> No candidate can currently be verified.

That's a valid product outcome.

---

## 11 Next Research Step

---

# 36. Account / Library architecture

Avoid:

`Dashboard`

Use:

# My Name Atlas

## My Atlases

Surname-level profiles/reports saved or purchased.

```text
Surname A
Surname B
Surname C
```

---

## My Family

Private family branches.

Contains:

- family people;
- places;
- uploaded details;
- branches.

---

## My Research

Active/completed research cases.

```text
Family Origin
Deep Research
Human Research
```

---

## Gifts

Purchased/received Gift Atlases.

---

## Saved discoveries

Optional later.

---

## Account utilities

Profile/payment/settings should exist but not dominate navigation.

Could sit under account menu:

```text
Account
Privacy
Payments
Language
Delete data
```

---

# 37. High-level Sitemap

```text
NAME ATLAS
│
├── Search
│
├── Surname Profiles
│   ├── Snapshot
│   ├── Today
│   ├── Where
│   ├── Meaning
│   ├── Origins
│   ├── Through Time
│   ├── Movement
│   ├── Evidence
│   ├── Your Family
│   └── Sources
│
├── Premium Reports
│   └── Name Atlas Report
│
├── Family Research
│   ├── Family Origin
│   ├── Deep Research
│   └── Human Research
│
├── Library
│   ├── My Atlases
│   ├── My Family
│   ├── My Research
│   └── Gifts
│
├── Discovery
│   ├── Countries
│   ├── Regions
│   ├── Rankings
│   └── Related Names
│
├── Gift
│
├── Methodology
├── Sources
├── Privacy
└── About
```

---

# 38. Internationalization model

Never build:

```text
surname
→ Polish voivodeship
```

Build:

```text
surname
→ geographic unit
```

Then the country adapter decides the hierarchy.

---

# CORE GLOBAL LAYER

Every market can theoretically support:

- surname entity;
- variants;
- scripts;
- linguistic interpretation;
- country-level geography;
- source evidence;
- timeline;
- family research;
- confidence.

---

# COUNTRY-SPECIFIC LAYER

Defines:

```text
geographic hierarchy
population sources
available archives
naming conventions
historical borders
writing system
record types
privacy restrictions
```

---

# 39. Examples by market

## Poland

```text
Country
Voivodeship
Powiat
Gmina
Place
Parish
```

Important:

- diacritics;
- border changes;
- partitions;
- parish archives;
- surname gender/forms.

---

## Germany

```text
Bundesland
Kreis
Municipality
```

Need support:

- ä/ae;
- ö/oe;
- ü/ue;
- ß/ss;
- historic Prussian geography;
- changed borders.

---

## UK

```text
Country
County
District
Parish
```

Important records:

- census;
- civil registrations;
- parish records.

---

## USA

```text
Country
State
County
Place
```

Surname research often heavily influenced by immigration history.

---

## France

```text
Region
Department
Commune
```

---

## Italy

```text
Region
Province
Comune
```

Strong local concentration can matter.

---

## Spain

Need model supporting:

- paternal surname;
- maternal surname;
- compound forms.

Do not assume final token = surname entity.

---

## Latin America

Name parsing becomes substantially different.

Need:

```text
full personal name
paternal family name
maternal family name
compound family names
```

---

## Eastern Europe

Critical:

- transliteration;
- changing borders;
- multilingual documents;
- Cyrillic ↔ Latin;
- German/Polish/Russian variants.

---

## Non-Latin scripts

Canonical entity may contain:

```text
native script
romanization A
romanization B
migration variant
```

Search should work from any form.

---

# 40. Formal Content Model

The most important model principle:

**Pages are assembled from claims and evidence.**

Simplified conceptual example:

```json
{
  "surname_profile": {
    "entity": {
      "id": "surname_id",
      "canonical_name": "...",
      "display_name": "...",
      "scripts": [],
      "languages": [],
      "variants": []
    },

    "coverage": {
      "market": "...",
      "current_distribution": "strong",
      "origin": "strong",
      "history": "partial",
      "migration": "none",
      "archives": "partial"
    },

    "chapters": [
      {
        "type": "today",
        "availability": "strong",
        "access": "free",
        "title": "...",
        "summary": "...",
        "claims": ["claim_01", "claim_02"],
        "visualization": "distribution_summary"
      },

      {
        "type": "origin",
        "availability": "strong",
        "access": "free",
        "title": "...",
        "claims": ["claim_03", "claim_04"]
      },

      {
        "type": "history",
        "availability": "partial",
        "access": "premium",
        "title": "...",
        "claims": ["claim_05"]
      }
    ]
  },

  "claims": {
    "claim_03": {
      "type": "interpretation",
      "statement": "...",
      "confidence": "likely",
      "scope": "surname",
      "evidence": ["evidence_7", "evidence_8"],
      "sources": ["source_2", "source_6"],
      "last_updated": "..."
    }
  }
}
```

---

# 41. Content Block schema

Every reusable section should conceptually contain:

```text
OBJECT TYPE
chapter / claim / occurrence / place / record

TITLE
user-facing question/headline

SUMMARY
1–3 sentence answer

BODY
optional deeper explanation

STRUCTURED DATA
counts / dates / places / values

VISUALIZATION
map / timeline / comparison / none

SOURCE
one or more

CONFIDENCE
verified / likely / possible / unconfirmed

AVAILABILITY
strong / partial / none

ACCESS
free / premium / family / deep

LOCALE
language/country

UPDATE DATE
source freshness
```

---

# 42. Adaptive content assembly

Before rendering a profile:

```text
1. Resolve surname entity
2. Assess data coverage
3. Build claims
4. Attach confidence/evidence
5. Score chapter usefulness
6. Remove weak/empty chapters
7. Determine free/premium boundary
8. Assemble narrative order
9. Generate chapter summaries
10. Render sources
```

Do **not**:

```text
Generate 9 predefined sections
then try to fill them.
```

---

# 43. Priority Matrix

## MVP

Must prove core experience.

### Data

- surname entity;
- normalization;
- current count;
- rarity;
- regional distribution;
- map;
- primary meaning;
- primary origin;
- basic confidence;
- sources;
- 1–2 variants where available.

### IA

```text
Today
Where
Meaning
Origins
Through Time preview
Your Family transition
Sources
```

### Product

- surname search;
- surname profile;
- adaptive zero states;
- Premium Name Report;
- basic library.

---

# V1

Historical depth.

- historical variants;
- historical locations;
- earliest occurrences;
- archive collections;
- alternative origin hypotheses;
- country distribution;
- full Premium Report;
- Family Origin.

---

# V2

Research.

- migration layer;
- historical maps;
- targeted archives;
- Family Persons;
- potential record matches;
- Deep Research;
- gifts;
- compare surname;
- related discovery.

---

# FUTURE

- human research marketplace/workflow;
- verified genealogical relationships;
- collaborative family research;
- DNA integration;
- automatic archive monitoring;
- physical books;
- global market adapters;
- advanced historical migration reconstruction.

---

# 44. Major Risks

## Information overload

Risk:

Surname page becomes 20,000-word encyclopedia.

Mitigation:

progressive disclosure + chapters + summary first.

---

## Data scarcity

Risk:

premium report looks empty.

Mitigation:

coverage assessment **before offer**.

Do not offer the same premium report for every surname.

---

## False precision

Risk:

`92% origin confidence`

without calibrated probability.

Mitigation:

use semantic confidence until statistical confidence has scientific basis.

---

## Premium boundary

Risk:

free result feels useless.

Mitigation:

free answers the original question.

Premium answers deeper questions created by the answer.

---

## SEO fragmentation

Risk:

500k surnames × 6 routes = millions of thin pages.

Mitigation:

canonical surname-first strategy.

---

## Global inconsistency

Risk:

product assumes every country has Polish-quality datasets.

Mitigation:

market coverage adapters.

---

## Surname = family fallacy

Largest conceptual risk.

Mitigation:

explicit surname/family boundary throughout product.

---

## Heraldry misinformation

Mitigation:

heraldic evidence refers to documented historical families, not automatically the user.

---

## AI hallucination

Mitigation:

content generated from claims/evidence model; unsupported claims cannot render.

---

# 45. Recommended architecture — final version

## PUBLIC SURNAME EXPERIENCE

```text
SEARCH
  ↓
ENTITY RESOLUTION
  ↓
NAME SNAPSHOT
  ↓
01 TODAY
How common is it?
  ↓
02 WHERE
Where is it found?
  ↓
03 MEANING
What might it mean?
  ↓
04 ORIGINS
Where could it have begun?
  ↓
05 THROUGH TIME
How did it change?
  ↓
06 MOVEMENT
Where did it travel?
[only if meaningful]
  ↓
07 EVIDENCE
What historical traces exist?
  ↓
08 YOUR FAMILY
Can we investigate your branch?
  ↓
09 SOURCES
Why do we think this?
```

Sections 01–04 contain substantial free value.

05 starts historical depth.

05–07 are the natural premium territory.

08 changes scope entirely.

---

# 46. Premium architecture

```text
FREE SNAPSHOT
     ↓
NAME ATLAS REPORT
     ↓
FAMILY ORIGIN
     ↓
DEEP RESEARCH
     ↓
HUMAN RESEARCH
```

Each step answers a qualitatively different question.

Not merely:

> more features.

---

# 47. Information journey

The entire product should feel like moving from **certainty toward specificity**:

```text
WHAT IS KNOWN
      ↓
WHAT IT PROBABLY MEANS
      ↓
WHERE IT MAY HAVE BEGUN
      ↓
WHAT HISTORY SHOWS
      ↓
WHAT REMAINS UNCERTAIN
      ↓
WHICH PART COULD RELATE TO YOUR FAMILY
      ↓
WHICH RECORDS COULD RELATE TO A PERSON
      ↓
WHAT CAN ACTUALLY BE VERIFIED
```

That progression is much stronger than a dashboard.

---

# 48. The most important conceptual distinction

Name Atlas contains three fundamentally different kinds of knowledge.

## 1. SURNAME KNOWLEDGE

Public.

> What is known about this surname?

---

## 2. FAMILY HYPOTHESIS

Private and probabilistic.

> Which parts could relate to this family?

---

## 3. GENEALOGICAL EVIDENCE

Private and person-specific.

> Which records can actually connect people?

The product should never collapse these three levels.

---

# 49. One sentence that should guide every IA decision

For every piece of content ask:

> **What question does the user have now, what do we actually know, how certain are we, and what question does that answer naturally create next?**

If a block doesn't answer one of those questions, it probably doesn't belong in the primary experience.

---

# 50. Final answer to the key question

## Jak zorganizować informację, żeby Name Atlas czuł się jak odkrywanie historii, a nie przeglądanie bazy danych?

Nie organizować produktu według rodzaju danych:

> statistics / records / maps / archives / analytics.

Organizować go według **kolejnych pytań człowieka**:

> **Jak rzadkie jest moje nazwisko?**

↓

> **Gdzie występuje?**

↓

> **Co oznacza?**

↓

> **Skąd może pochodzić?**

↓

> **Czy zawsze wyglądało tak samo?**

↓

> **Gdzie występowało wcześniej?**

↓

> **Jak przemieszczało się w czasie?**

↓

> **Jakie historyczne ślady istnieją?**

↓

> **Czy któryś z nich może dotyczyć mojej rodziny?**

↓

> **Czy możemy znaleźć konkretną osobę?**

Dane są wtedy **materiałem dowodowym pod historią**, a nie samą historią.

Mapa nie jest „widgetem mapy”. Jest odpowiedzią na:

> **Where?**

Timeline nie jest „timeline component”. Jest odpowiedzią na:

> **What changed?**

Archiwum nie jest „database results”. Jest odpowiedzią na:

> **What evidence remains?**

Family Research nie jest kolejnym upsellem. Jest zmianą pytania z:

> **„Jaka jest historia tego nazwiska?”**

na:

> **„Jaka jest historia mojej rodziny?”**

I to powinno być fundamentalną Information Architecture **Name Atlas**.
