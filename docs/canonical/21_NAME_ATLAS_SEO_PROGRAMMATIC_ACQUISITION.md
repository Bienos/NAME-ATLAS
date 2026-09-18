# NAME ATLAS — SEO / PROGRAMMATIC ACQUISITION

**Document:** 21. SEO / Programmatic Acquisition  
**Version:** 1.0.0 — Organic Acquisition Baseline  
**Research snapshot:** 17 September 2026  
**Initial market:** Poland  
**Initial indexed locale:** `pl-PL`  
**Status:** Candidate implementation specification  
**Depends on:** Documents 10–20  
**Next:** `22_NAME_ATLAS_INTERNAL_ADMIN_RESEARCH_CONSOLE.md`

---

# 0. PURPOSE, AUTHORITY AND SEO PHILOSOPHY

This document defines how Name Atlas turns its evidence-backed surname knowledge into public, crawlable and indexable surname pages without creating a programmatic-content liability.

It answers:

> **Which surname entities deserve an indexable page, what exactly that page may contain, how it is rendered and discovered by search engines, how URLs and duplicates are controlled, and how programmatic SEO can scale only as fast as evidence quality permits.**

SEO does not create knowledge.

The canonical flow is:

```text
Canonical Surname
↓
Approved Claims
↓
CoverageAssessment
↓
Public / SEO SurfaceEligibility
↓
SEOEligibilityAssessment
↓
SEOProfileProjection
↓
SEO QA
↓
Publication State
↓
SSR / Cache
↓
Sitemap / Internal Links
↓
Search Engine
```

Never:

```text
keyword
↓
LLM article
↓
publish
```

and never:

```text
Googlebot
↓
ResearchRun
↓
external connectors
↓
page
```

The organic-growth strategy is therefore:

> **Scale the number of evidence-backed public resources, not the number of generated URLs.**

---

# 1. EXECUTIVE DECISIONS

The P0 SEO architecture should use:

1. **One canonical surname page per canonical surname entity.**
2. **Polish-only mass indexation at launch.**
3. Canonical Polish path:

```text
/pl/nazwisko/{canonical_slug}
```

4. English may exist in the product but surname pages remain `NOINDEX` until localization quality is production-ready.
5. **Unicode-preserving Polish slugs** rather than diacritic-stripped canonical URLs.
6. Accepted aliases/gender forms can redirect to one entity page; they do not become duplicate indexable pages.
7. Search candidates, fuzzy forms and unresolved user inputs can never create SEO pages.
8. Historical variants do not receive independent URLs merely because they exist.
9. P0 uses only one surname-page URL with adaptive sections and anchors.
10. **No surname × region, surname × city, surname × meaning, surname × history combinatorial pages.**
11. `SEOEligibilityAssessment` is a separate versioned publication-quality gate.
12. `SEOProfileProjection` is persisted/precomputed.
13. Crawler traffic reads precomputed public projections only.
14. Next.js 16 uses a **hybrid static/on-demand cached rendering model** over precomputed projections.
15. Public surname content is SSR/pre-rendered meaningful HTML.
16. Cache invalidation is event/version based, not arbitrary daily regeneration.
17. Google Search Console and Bing Webmaster Tools are mandatory P0.
18. Screaming Frog becomes the primary technical crawler after the first small cohort.
19. Semrush/Ahrefs are optional competitive/keyword tools, not launch dependencies.
20. Sitemap contains only `INDEX` canonical URLs.
21. `lastmod` changes only after a meaningful public SEO projection update.
22. Google Indexing API is **not** used for surname pages.
23. IndexNow is P1/optional once Bing publication operations are stable.
24. P0 structured data is deliberately minimal:
    - `BreadcrumbList` on surname pages;
    - `Organization` / `WebSite` on appropriate site-level pages;
    - optional semantic `WebPage`;
    - no `Person` for surnames;
    - no FAQ rich-result strategy;
    - no `Dataset` markup on ordinary surname pages.
25. Google FAQ rich results are not part of the architecture because Google removed the feature from Search in 2026.
26. No dedicated “AI SEO/GEO” content layer is required.
27. Google AI visibility strategy is the same evidence-first SEO strategy: crawlable, useful, original, source-rich content.
28. P0 first public SEO cohort is **250 surname pages**, not hundreds of thousands.
29. Expansion sequence is approximately:

```text
250
↓
1,000
↓
5,000
↓
10,000+
↓
qualified demand-driven long tail
```

30. Every expansion batch has automated QA and stratified manual review.
31. Organic success is measured by **Meaningful Discovery**, not indexed-page count alone.
32. SEO growth is not allowed to change Claim, Confidence, rights or resolver thresholds.

---

# 2. CURRENT GOOGLE POLICY IMPLICATIONS — 2026-09-17

## 2.1 Scaled content abuse

Google's current spam policy defines scaled content abuse as producing many pages primarily to manipulate rankings rather than help users, regardless of whether the content is made with generative AI, scraping or another mechanism.

Name Atlas therefore must not create:

```text
500,000 surname pages
+
generic LLM prose
```

unless each published page independently satisfies product value and evidence requirements.

Official:

https://developers.google.com/search/docs/essentials/spam-policies

---

# 3. GOOGLE GENERATIVE AI SEARCH — CURRENT POSITION

Google's July 2026 guide for AI Overviews/AI Mode is unusually aligned with Name Atlas.

Google currently states that:

- normal SEO fundamentals remain relevant for generative AI search;
- pages must be indexed and snippet-eligible;
- useful, original, non-commodity content matters;
- separate pages for every fan-out/search variation can become scaled-content abuse;
- there is no special Schema.org markup required for AI Overviews/AI Mode;
- `llms.txt` is not needed for Google Search;
- artificial “chunking” is not required;
- Search Console is the measurement layer.

Official:

https://developers.google.com/search/docs/fundamentals/ai-optimization-guide

https://developers.google.com/search/docs/appearance/ai-features

### Name Atlas decision

Do not create a parallel:

```text
GEO / AEO content system
```

P0.

The best AI-search strategy is:

```text
original surname data
+
source dates
+
clear Claims
+
citations
+
concise answers
+
technical accessibility
```

---

# 4. SEO BOUNDED CONTEXT

## 4.1 SEO Eligibility Engine

**Input**

```text
Surname
SurnameProfile
CoverageAssessment
Claim set
SurfaceEligibility
rights
locale
duplicate state
```

**Output**

```text
SEOEligibilityAssessment
```

Owns:

- index/noindex decision;
- reasons;
- policy version.

Does not create Claims.

---

# 5. SEO Projection Builder

Consumes only:

```text
approved public Claims
SEO-allowed citations
Coverage
current canonical slug
SEO eligibility
```

Outputs:

```text
SEOProfileProjection
```

Does not retrieve external data.

---

# 6. Metadata Generator

Generates:

```text
title
description
canonical
robots
Open Graph
```

from `SEOProfileProjection`.

It must not promise dimensions absent from the page.

---

# 7. Structured Data Builder

Generates bounded JSON-LD.

No arbitrary LLM-generated JSON-LD.

---

# 8. Sitemap Generator

Reads only:

```text
publication_status = PUBLISHED
AND
indexability = INDEX
```

Outputs:

```text
canonical URL
lastmod
hreflang alternates if active
```

---

# 9. Internal Linking Engine

Builds links only from approved navigation/evidence relationships.

It does not generate “related surnames” from edit distance.

---

# 10. Redirect / Canonical Service

Owns:

- slug aliases;
- old slugs;
- accepted form aliases;
- resolver-authorized entity merges;
- locale redirects.

---

# 11. SEO QA Gate

Runs before `INDEX`.

Inputs from Prompt 17 plus SEO-specific tests.

---

# 12. Search Performance Import

Imports aggregated Search Console/Bing data.

It never feeds facts back into the Claim layer.

It can affect:

```text
SEO priority
background enrichment priority
```

only.

---

# 13. SEO CONTENT OPERATIONS

Human SEO/editorial staff can:

- improve titles;
- improve narrative clarity;
- improve template;
- build editorial guides;
- change internal linking.

They cannot:

- create new historical facts outside Claim pipeline;
- upgrade confidence;
- override rights.

---

# 14. MAIN SEO RESOURCE

Do **not** add an independent canonical knowledge entity called `SurnamePage`.

Use:

```text
Surname
+
SEOEligibilityAssessment
+
SEOProfileProjection
```

The page is a projection of canonical surname knowledge.

---

# 15. MODEL CHANGE PROPOSAL 21-A — `SEOProfileProjection`

**P0 — ACCEPT.**

Recommended:

```text
SEOProfileProjection
├── seo_projection_id
├── surname_id
├── locale
├── canonical_slug
├── canonical_url
│
├── profile_version
├── seo_projection_version
├── seo_template_version
├── seo_prompt_version nullable
│
├── indexability
├── publication_status
│
├── title
├── meta_description
├── h1
├── summary
│
├── chapter_ids[]
├── structured_data_json
│
├── canonical_url
├── hreflang_json
│
├── content_fingerprint
├── last_meaningful_modified_at
│
├── quality_gate_result
├── quality_reason_codes[]
│
├── built_at
└── published_at nullable
```

Why:

- crawler request must not invoke narrative generation;
- reproducibility;
- QA;
- rollback;
- sitemap;
- cache.

---

# 16. MODEL CHANGE PROPOSAL 21-B — `SEOEligibilityAssessment`

**P0 — ACCEPT.**

```text
SEOEligibilityAssessment
├── seo_eligibility_id
├── surname_id
├── locale
├── status
├── reason_codes[]
│
├── coverage_family_count
├── eligible_claim_count
├── citation_count
│
├── public_surface_pass
├── seo_surface_pass
├── rights_pass
├── entity_pass
├── duplicate_pass
├── value_pass
│
├── policy_version
├── assessed_at
└── based_on_profile_version
```

This differs from `SurfaceEligibilityAssessment`.

`SurfaceEligibility` asks:

> May this specific data appear on SEO?

`SEOEligibilityAssessment` asks:

> Is the whole page worth indexing?

---

# 17. INDEXABILITY ENUM

Recommended:

```text
INDEX
NOINDEX
BLOCKED
NOT_PUBLISHED
```

Interpretation:

## INDEX

Search engines may index.

## NOINDEX

Public route can exist for user navigation but should not enter index.

## BLOCKED

Privacy/rights/safety prevents public SEO publication.

## NOT_PUBLISHED

No public page projection yet.

---

# 18. PUBLICATION STATUS

## MODEL CHANGE PROPOSAL 21-C — ACCEPT P0

On `SEOProfileProjection`:

```text
DRAFT
READY
PUBLISHED
SUPPRESSED
```

Indexability and publication are separate.

Example:

```text
publication_status = PUBLISHED
indexability = NOINDEX
```

means useful public low-data page exists but is intentionally excluded from search.

---

# 19. CANONICAL URL

P0:

```text
https://nameatlas.[tld]/pl/nazwisko/{canonical_slug}
```

English later:

```text
/en/surname/{canonical_slug}
```

Advantages:

- locale explicit;
- scalable path architecture;
- understandable to users;
- separate language IA.

API continues to use UUID.

---

# 20. LOCALE PREFIX

Use locale/language prefix from launch:

```text
/pl/
```

even before English indexation.

Benefits:

- future expansion doesn't require Polish URL migration;
- clear hreflang structure later;
- clean analytics.

---

# 21. SLUG POLICY — DECISION

Canonical slug should:

```text
preserve meaningful Unicode letters and diacritics
```

rather than collapse them to ASCII.

Examples:

```text
Łuczak
→ /pl/nazwisko/łuczak

Żuk
→ /pl/nazwisko/żuk
```

Why:

- surname identity is exact;
- `Luczak` and `Łuczak` may be different entities;
- Prompt 13 explicitly forbids diacritic-fold identity assumptions;
- modern URLs/search engines support Unicode.

URL transport will percent-encode Unicode when needed, while browsers commonly display the human-readable form.

---

# 22. SLUG NORMALIZATION

Slug generation:

```text
canonical display form
↓
Unicode NFC
↓
Unicode lowercase
↓
trim
↓
whitespace → hyphen
↓
supported punctuation normalization
↓
collapse repeated hyphens
↓
preserve letters / diacritics
```

Do not:

```text
ASCII-fold
```

the canonical slug.

---

# 23. PUNCTUATION

Examples:

```text
O'Neil
D'Angelo
Kowalska-Nowak
van der X
```

Policy:

- preserve meaningful components in display;
- normalize spaces to `-`;
- punctuation with unsafe/ambiguous URL semantics may become `-`;
- resolver entity remains source of identity.

Potential collisions handled separately.

---

# 24. SLUG COLLISIONS

Unique DB constraint:

```text
(locale, canonical_slug)
```

If collision occurs after safe slug normalization:

```text
base-slug-{stable_short_slug_id}
```

Example schematic:

```text
/pl/nazwisko/o-neil-7k3m
```

`stable_short_slug_id` derives from internal entity ID but is not a raw sequential ID.

Collision suffix is exceptional, not standard.

---

# 25. ASCII ALIAS

May create:

```text
/luczak
→ /łuczak
```

**only if unambiguous** and `luczak` is not another canonical entity/slug.

Never redirect an ASCII form if it conflicts with an actual surname entity.

---

# 26. SLUG HISTORY

## MODEL CHANGE PROPOSAL 21-D — ACCEPT P0

Use:

```text
SlugAlias
├── slug_alias_id
├── locale
├── alias_slug
├── surname_id
├── alias_type
├── active
├── created_at
└── retired_at nullable
```

Types:

```text
OLD_CANONICAL
ACCEPTED_FORM
UNAMBIGUOUS_ASCII_ALIAS
MANUAL_ALIAS
```

Resolver SearchCandidates never automatically enter SlugAlias.

---

# 27. OLD SLUG

```text
old URL
→ HTTP 301
→ canonical URL
```

No redirect chains.

When canonical changes:

- update SlugAlias;
- update internal links;
- update sitemap;
- update hreflang.

---

# 28. GENDER FORMS

Prompt 13 treats accepted Polish gender pairs as forms of one Surname entity where supported.

Therefore P0 SEO policy:

```text
one entity
=
one INDEX page
```

Example:

```text
Kowalski / Kowalska
```

may share one canonical entity/profile.

Canonical route uses the entity's chosen canonical NameForm.

Accepted secondary gender form can have a `301` alias route if safe.

Page should visibly include accepted modern gender form near the surname heading.

Do not create two near-duplicate indexable pages.

---

# 29. GENDER FORM SEARCH RELEVANCE

For an entity with accepted forms:

Page textual identity includes both:

```text
Kowalski
Kowalska
```

where current source/resolver supports that relation.

Potential metadata can include both naturally, e.g.:

```text
Nazwisko Kowalski / Kowalska — ...
```

only if UX/SEO testing supports readability.

P0 H1 remains canonical entity name.

---

# 30. HISTORICAL VARIANT URLS

P0:

```text
NO independent URL
```

merely because form is historically attested.

Display:

```text
historical form
→ #history
```

If historical form is also its own modern canonical Surname entity, it can have its own page for that identity.

Do not canonical-merge the entities solely for SEO.

---

# 31. FUZZY / TYPO URLS

Hard:

```text
SearchCandidate
→ NEVER creates SEO page
```

Random path:

```text
/pl/nazwisko/cichwoski
```

returns:

- canonical alias only if resolver/domain has approved persistent alias;
- otherwise `404`/search assistance.

Never generate a 200 page for arbitrary strings.

---

# 32. MAIN P0 PAGE TYPES

Indexable candidates:

```text
Home
Surname Profile
Surname Directory Hubs
Popular Surname Data Pages
Methodology / Sources
Evidence-backed Editorial Guides
About / Corrections / Trust pages as appropriate
```

Not P0:

```text
Surname × Region
Surname × City
Surname × Variant
Surname × Archive
Surname × Meaning
Surname × Origin
Surname × History
```

---

# 33. ONE SURNAME PAGE

P0 sections:

```text
H1 — Nazwisko [X]

Snapshot

TODAY
  Population
  Rarity

WHERE
  Current map only if lawful/current

MEANING
  only if sourced

ORIGIN
  hypotheses + confidence

THROUGH TIME
  historical preview

EVIDENCE / SOURCES

DISCOVERY PREVIEW
  if premium eligible

Explore another surname
```

Sections are adaptive.

---

# 34. ANCHORS

Stable IDs:

```text
#dzisiaj
#gdzie
#znaczenie
#pochodzenie
#historia
#zrodla
```

or technical English IDs:

```text
#today
#where
#meaning
#origin
#history
#sources
```

Recommendation:

Use stable locale-neutral DOM IDs internally:

```text
#today
#where
#meaning
#origin
#history
#sources
```

and localized visible labels.

No separate SEO URL resources.

---

# 35. QUERY PARAMETERS

Examples:

```text
?section=history
?period=1800
?layer=archive
?utm_source=...
```

Canonical:

```text
base surname URL
```

unless a future parameter represents a genuinely independent page.

Do not allow filter/query combinations into sitemap.

---

# 36. INTERNAL SEARCH

```text
/search?q=...
```

or Polish equivalent:

```text
/pl/szukaj?q=...
```

should be:

```text
NOINDEX
```

Search engines index canonical surname resources instead.

---

# 37. UNKNOWN SLUG

If no Surname or SlugAlias:

```text
HTTP 404
```

with useful search UI.

Do not respond `200` with:

```text
"We couldn't find this surname."
```

for arbitrary slug, which creates soft-404 risk.

---

# 38. MERGED SURNAME

Only an authoritative resolver/entity merge triggers:

```text
old entity URL
301
→ surviving canonical entity
```

Not:

- fuzzy similarity;
- same pronunciation;
- diacritic fold.

---

# 39. SPLIT ENTITY

If one old entity later splits:

Do not choose a child arbitrarily.

Potential transition:

```text
old URL
→ 200 disambiguation page + NOINDEX
```

with:

```text
This surname record was divided after source review.
Choose:
A
B
```

and links to both new canonical pages.

Eventually 410/redirect policy can be reviewed after search demand stabilizes.

---

# 40. SEO ELIGIBILITY — HARD GATES

Before value scoring, page must satisfy all:

```text
SurnameStatus = active canonical
Resolution/entity integrity = pass

Public SurfaceEligibility = allowed
SEO SurfaceEligibility = allowed

privacy = pass
rights = pass

profile state = current or safely dated
critical QA = pass

no unresolved canonical duplicate
```

Any failure:

```text
BLOCKED or NOT_PUBLISHED
```

---

# 41. SEO VALUE FAMILIES

For page eligibility, group facts into substantive families.

```text
CURRENT_STATS
GEOGRAPHY
ONOMASTICS
HISTORY
```

## CURRENT_STATS

```text
population
rank
rarity
```

all counted as **one value family**, because they generally derive from the same current dataset.

## GEOGRAPHY

valid current/regional data.

## ONOMASTICS

meaning / formation / linguistic-origin evidence.

## HISTORY

attested forms / historical occurrences / historical places / archive references.

---

# 42. P0 INDEXABILITY POLICY

Recommended policy `seo-pl-surname@1.0`.

### INDEX automatically when:

```text
hard gates pass
AND
at least 2 substantive value families are publishable
AND
at least 1 family is supported by DIRECT or specialist evidence
AND
page has at least 2 usable citations/source references
AND
duplicate/thin QA passes
```

Examples:

```text
CURRENT_STATS + ONOMASTICS
→ INDEX
```

```text
CURRENT_STATS + GEOGRAPHY
→ INDEX
```

```text
ONOMASTICS + HISTORY
→ INDEX
```

```text
CURRENT_STATS + HISTORY
→ INDEX
```

---

# 43. LIMITED CASE

If only:

```text
CURRENT_STATS
```

exists:

Default P0:

```text
PUBLISHED_NOINDEX
```

even if user-facing page is useful.

Why:

- avoids hundreds of thousands of near-identical statistic-only pages;
- Name Atlas can still answer direct user search;
- later Search Console/demand can justify policy evolution.

---

# 44. HIGH-DEMAND EXCEPTION

Do not automatically override value quality because keyword demand is high.

If a high-demand surname has only one value family:

```text
manual/editorial enhancement
or
source enrichment
```

before index.

No “traffic demand = content quality” shortcut.

---

# 45. COVERAGE MAPPING

Suggested:

```text
RICH
→ likely INDEX if hard gates pass

STANDARD
→ likely INDEX

LIMITED
→ normally NOINDEX unless 2 real value families still exist

MINIMAL
→ NOINDEX
```

Coverage enum alone does not determine the result.

SEO engine inspects dimensions.

---

# 46. `CONFLICTING`

A conflicting hypothesis can be high-value SEO content.

Example:

```text
Two documented etymological interpretations exist.
```

If:

- both are sourced;
- uncertainty is explicit;

then:

```text
INDEX allowed
```

`CONFLICTING` is not thin content.

---

# 47. `INSUFFICIENT_DATA`

If one dimension is insufficient but other dimensions are rich:

```text
INDEX
```

and omit/explain that dimension.

If overall profile has insufficient value:

```text
NOINDEX
```

Never fill missing section.

---

# 48. NO WORD-COUNT THRESHOLD

Do not use:

```text
500 words
1,000 words
```

as indexability rule.

A page with:

- exact statistic;
- dated source;
- scholarly interpretation;
- historical occurrence;
- clear uncertainty;

may be more valuable than a 2,000-word generic essay.

---

# 49. UNIQUENESS DIAGNOSTICS

SEO QA may compute:

```text
unique Claim types
unique data values
unique place entities
unique historical forms
unique citation groups
unique narrative tokens
template-to-unique ratio
```

These are diagnostics.

Do not create one opaque:

```text
SEO quality score
```

that overrides evidence rules.

---

# 50. SEO QUALITY GATE

Sequence:

```text
Projection schema
↓
Claim scope/grounding
↓
Confidence wording
↓
Rights
↓
Privacy
↓
Duplicate/uniqueness
↓
Metadata promise
↓
Structured data
↓
Technical canonical/indexability
↓
Publish
```

---

# 51. SEO FACT QA

Every dynamic factual statement must be traceable to:

```text
SEOProjection block
→ approved Claim
→ Evidence
```

Exceptions:

- generic methodology copy;
- static product explanation.

No model-memory surname history.

---

# 52. SEO PROJECTION

Public SEO content can include:

```text
canonical surname forms
population
rank / rarity
current source date

current geography if approved
meaning
linguistic origin
geographic-origin hypotheses

historical preview
historical variants
historical occurrences

citations
confidence
limitations

public Discovery preview
premium offer availability
```

It never contains full premium locked payload.

---

# 53. FREE VALUE

Organic landing must answer the original query.

Examples:

Query:

```text
znaczenie nazwiska Cichowski
```

If Name Atlas has sourced meaning, page shows it publicly.

Query:

```text
ile osób ma nazwisko X
```

page shows public current count if allowed.

Premium is:

```text
deeper historical synthesis/evidence
```

not basic answer removal.

---

# 54. SEARCH INTENT TAXONOMY

P0 taxonomy:

```text
EXACT_SURNAME
MEANING
LINGUISTIC_ORIGIN
GEOGRAPHIC_ORIGIN
CURRENT_POPULATION
RARITY
CURRENT_DISTRIBUTION
HISTORY
VARIANTS
GENEALOGY
HERALDRY
FAMILY_ORIGIN
```

Specific-person search is not a surname-page content target.

---

# 55. CURRENT POLISH SERP PATTERNS — RESEARCH SNAPSHOT

Representative current searches reviewed:

```text
Kowalski pochodzenie nazwiska
Cichowski znaczenie nazwiska
ile osób ma nazwisko Kowalski
nazwisko Kowalski mapa występowanie
historia nazwiska Kowalski genealogia
nazwisko Kowalski herb
```

Observed result classes:

1. **IJP PAN / ISNP**
   - specialist etymology;
   - historical attestations;
   - formation analysis.

2. **Polish surname-statistics sites**
   - current PESEL count;
   - rank;
   - regional tables/maps.

3. **Surname.pl**
   - direct surname profile;
   - statistics;
   - etymology;
   - map;
   - paid archival-report proposition.

4. **FamilySearch / Ancestry / Geneanet**
   - surname dictionary interpretation;
   - historical records/tree funnel.

5. **Forebears**
   - international rank/distribution;
   - some distribution examples are historical snapshots rather than current Polish data.

6. **Heraldry / archival-commercial sites**
   - strong user demand but high conceptual risk.

---

# 56. COMPETITIVE POSITIONING OPPORTUNITY

Name Atlas should not compete through:

```text
more generic surname prose
```

Its SEO differentiation should be:

```text
CURRENT OFFICIAL STATISTICS
+
EXACT SOURCE DATE
+
SPECIALIST/SOURCED ONOMASTICS
+
HISTORICAL EVIDENCE
+
CONFLICT PRESERVATION
+
CONFIDENCE
+
CITATIONS
```

This combines categories that current SERPs often split across multiple destinations.

---

# 57. IJP PAN

Current IJP surname pages provide strong:

- historical forms;
- etymological alternatives;
- word-formation context.

Name Atlas should not copy this content.

Until licensed/approved:

```text
no commercial ingestion
```

per Prompt 19.

SEO can still compete by using independently permitted sources and eventually licensed IJP data.

---

# 58. GLOBAL GENEALOGY PAGES

FamilySearch / Ancestry / Geneanet commonly combine:

```text
surname meaning
+
record/tree search
```

Name Atlas's distinction:

```text
surname-level evidence
≠
family/person record count
```

and should be clearer in scope.

---

# 59. FOREBEARS

Useful international benchmark but its Poland distribution pages can be dated.

Name Atlas must always label:

```text
source year / snapshot date
```

and should not market itself as “more current” unless source reality supports it.

---

# 60. SEARCH INTENT → PAGE SECTION

| Query intent | Primary section |
|---|---|
| `[nazwisko]` | Snapshot |
| `znaczenie nazwiska X` | Meaning |
| `pochodzenie nazwiska X` | Origin |
| `skąd pochodzi nazwisko X` | Origin + limitation |
| `ile osób ma nazwisko X` | Today |
| `nazwisko X mapa` | Where |
| `występowanie nazwiska X` | Where |
| `historia nazwiska X` | Through Time |
| `warianty nazwiska X` | History |
| `nazwisko X genealogia` | Surname history + family transition |
| `nazwisko X herb` | Safe heraldry explanation |

---

# 61. INTENT-AWARE LANDING WITHOUT DUPLICATE URLs

Search engines do not reliably provide the exact organic query to the landing request.

Therefore P0 does **not** dynamically reorder the surname page based on organic keyword.

Instead:

- canonical URL remains one page;
- top Snapshot answers major common intents;
- table of contents/anchor links visible;
- metadata emphasizes dimensions actually available;
- Google can deep-link/read relevant passages itself.

Internal/site-search flows can remain intent-aware because Name Atlas knows the user action there.

---

# 62. PAGE TEMPLATE — P0

```text
Breadcrumbs

H1: Nazwisko [SURNAME]

Snapshot
  concise 1–3 sentence evidence-backed summary

Key facts
  population
  rarity
  source date
  map status

TODAY
WHERE           [if available]
MEANING         [if available]
ORIGIN          [if available]
THROUGH TIME    [if available]
EVIDENCE / SOURCES

Discovery Preview [only if ready/eligible]

Explore another surname

Methodology / corrections links
```

---

# 63. H1 DECISION

P0:

```text
Nazwisko Cichowski
```

Advantages:

- consistent;
- avoids metadata-like keyword stuffing;
- clear entity title.

Meaning/origin appears in title/subheading where valid.

---

# 64. SUMMARY BLOCK

Top page summary should contain:

- one hard fact where available;
- strongest approved interpretation where available;
- explicit source scope.

Example shape:

```text
Nazwisko [X] nosi w Polsce [N] osób według [snapshot].
Najsilniejsza udokumentowana interpretacja wiąże je z [...]
```

Only if supported.

No generic intro:

```text
Nazwiska od wieków fascynują ludzi...
```

---

# 65. ADAPTIVE HEADINGS

If no map:

```text
WHERE section absent
```

not:

```text
H2 Where
No data available.
```

If meaning insufficient:

- omit chapter or show compact limitation if important;
- metadata must not promise meaning.

---

# 66. TITLE GENERATOR

Generate from available dimensions.

## Pattern A — meaning/origin + current

```text
Nazwisko {X} — znaczenie, pochodzenie i występowanie | Name Atlas
```

only when meaning/origin are present.

## Pattern B — statistics/geography

```text
Nazwisko {X} — ile osób je nosi i gdzie występuje | Name Atlas
```

## Pattern C — history-rich

```text
Nazwisko {X} — pochodzenie i historia | Name Atlas
```

## Pattern D — conservative

```text
Nazwisko {X} — dane, pochodzenie i źródła | Name Atlas
```

only if those dimensions actually exist.

---

# 67. TITLE TRUTH RULE

Generator receives:

```text
available_dimensions[]
```

and is not allowed to mention unavailable dimension keywords merely for CTR.

Test:

```text
no map
+
title contains "mapa"
→ FAIL
```

---

# 68. META DESCRIPTION

Use:

- current data;
- exact snapshot period;
- one supported clue;
- evidence transparency.

Example shape:

```text
Sprawdź, ile osób nosi nazwisko [X], gdzie występuje i co mówią
udokumentowane źródła o jego pochodzeniu. Dane: [scope/date].
```

Only include clauses supported by page.

---

# 69. EXACT COUNTS IN META

Allowed if:

- current public Claim is valid;
- page/projection updates when snapshot changes.

Example:

```text
Według danych PESEL z 2026 r. ...
```

This differentiates Name Atlas.

But metadata should not become a large brittle template containing five dynamic numbers.

---

# 70. TITLE / META LENGTH

No hard “60 characters / 160 characters” rule.

Google may rewrite titles/snippets.

Use:

```text
concise
descriptive
non-repetitive
factually matched
```

---

# 71. OPEN GRAPH

OG:

```text
title
summary
canonical URL
Name Atlas brand image/share image
```

Share image can include one public fact.

No:

- premium inventory hidden detail;
- private report;
- unsourced heraldry.

---

# 72. STRUCTURED DATA P0 — DECISION

On surname page:

```text
BreadcrumbList
```

plus optional general:

```text
WebPage
```

if maintained correctly.

Site-level:

```text
Organization
WebSite
```

on home/about where appropriate.

Do not add a structured-data type purely for hoped-for ranking.

---

# 73. BREADCRUMBLIST

Visible breadcrumb:

```text
Name Atlas
→ Nazwiska
→ Cichowski
```

JSON-LD matches visible route/navigation.

Current Google documentation continues to support `BreadcrumbList` structured data.

---

# 74. WEBPAGE

Optional semantic object:

```json
{
  "@type": "WebPage",
  "name": "Nazwisko Cichowski",
  "url": "...",
  "inLanguage": "pl-PL",
  "dateModified": "..."
}
```

No promise of a special Google rich result.

---

# 75. `DefinedTerm`

Schema.org `DefinedTerm` can semantically describe a term/name.

Could later represent the surname as the page `mainEntity`.

P0:

```text
OPTIONAL / not required
```

Do not add before testing JSON-LD simplicity/validation.

---

# 76. `Person`

Never use:

```text
Person
```

for a surname page.

Surname entity ≠ person.

---

# 77. `Dataset`

Do not put Dataset structured data on each surname page.

Google clarified in late 2025 that Dataset structured data is used for Dataset Search rather than ordinary Google Search rich-result presentation.

Use Dataset markup only on genuine dataset/methodology resources if appropriate.

---

# 78. FAQ STRUCTURED DATA

Google removed FAQ rich-result support from Search in May/June 2026.

Therefore:

```text
no SEO roadmap built around FAQPage rich results
```

User-facing FAQs can still exist.

Do not mass-generate FAQs for markup.

---

# 79. QAPAGE

Do not misuse QAPage for a normal surname article.

Google's QAPage rules are for one-question pages with answers.

Surname profile is not that.

---

# 80. ORGANIZATION

Use `Organization` on home/about to provide genuine Name Atlas/company identity.

Current Google docs recommend site-level organization information on home/about rather than every page.

---

# 81. PRODUCT MARKUP

Do not put `Product` markup on every surname profile because a premium report happens to be offered.

Surname page is primarily informational.

A dedicated product/commerce page may be reviewed separately if it genuinely qualifies.

---

# 82. PAYWALLED CONTENT MARKUP

Full premium content is not embedded in the indexable surname HTML.

Therefore P0 does not need to expose premium body and mark it as paywalled.

Public page contains only public preview.

---

# 83. SSR / RENDERING DECISION

Use:

> **Precomputed SEOProjection + cached server rendering / static generation.**

Not request-time research.

P0 rendering classes:

```text
LAUNCH COHORT
→ build/pre-render

QUALIFIED LONG TAIL
→ on-demand static render from precomputed projection
→ CDN cache

UPDATED PROJECTION
→ tag/path revalidation
```

---

# 84. NEXT.JS 16 IMPLEMENTATION

Use App Router.

Current Next.js 16 supports:

- `generateStaticParams`;
- dynamic metadata;
- `sitemap.ts`;
- `robots.ts`;
- generated multiple sitemaps;
- cache tags;
- `revalidateTag(..., 'max')`;
- `revalidatePath`.

Recommended surname route:

```text
app/[locale]/nazwisko/[slug]/page.tsx
```

Actual route localization architecture may use route groups/locale routing.

---

# 85. `generateStaticParams`

Pre-render:

```text
first SEO launch cohort
```

not every future surname.

Example strategy:

```text
generateStaticParams()
→ top 250–1000 already-published indexable surnames
```

Other published URLs can render from precomputed projection on first visit and cache.

---

# 86. CRAWLER-FIRST LONG TAIL

It is acceptable if Googlebot is the first requester that causes:

```text
SEOProjection → HTML rendering/cache
```

provided:

```text
NO research
NO LLM
NO external source query
```

occurs.

Rendering an already approved DB projection is cheap and deterministic.

---

# 87. CACHE TAGS

Example:

```text
seo:surname:{surname_id}:{locale}
```

When SEO projection updates:

```text
revalidateTag(tag, "max")
```

stale-while-revalidate can serve existing safe content while refreshed projection is loaded.

Rights/privacy blocking is different:

```text
immediate purge / blocking invalidation
```

where stale display is not permissible.

---

# 88. `revalidatePath`

Use after:

- slug/canonical route change;
- publication transition;
- route-specific emergency fix.

Prefer tag invalidation for content dependency updates.

---

# 89. NO TIME-BASED FAKE FRESHNESS

Do not rebuild page every midnight.

Freshness derives from:

```text
Claim/source update
profile update
rights update
template update
```

not calendar theater.

---

# 90. CRAWLER COST INVARIANT

Crawler request must not call:

```text
PESEL ingest
Polona
Europeana
IJP
OCR
LLM
research queue
premium runtime
```

Hard integration test.

---

# 91. UNPUBLISHED QUALIFIED ENTITY

If canonical surname exists but no SEO projection:

User may still find it through Name Atlas search.

Direct public SEO route:

```text
404
```

or controlled `NOINDEX` page if product intentionally exposes.

P0 preference:

```text
NO SEO route until public projection exists
```

to prevent soft thin pages.

---

# 92. USER SEARCH → SEO PIPELINE

```text
real user surname search
↓
canonical entity
↓
research/profile becomes strong
↓
SEO eligibility evaluation
↓
if INDEX:
  build SEO projection
  queue publication
```

Search itself does not guarantee publication.

---

# 93. SEO BACKFILL PLANNER

Separate from Prompt 15 research planner.

Inputs:

```text
canonical surname
existing coverage
official frequency
organic demand
internal search demand
research cost
current SEO state
```

Outputs:

```text
background enrichment priority
```

It can request a standard background research run.

It cannot bypass:

- source budgets;
- rights;
- QA.

---

# 94. MODEL CHANGE PROPOSAL 21-E — `SEOBackfillPriority`

P0:

```text
DEFER AS DOMAIN ENTITY
```

Implement as batch/query score/config initially.

Possible fields:

```text
surname_id
priority_class
reason_codes
estimated_value
updated_at
```

Promote to table only if operational scheduling needs it.

---

# 95. RUNTIME PRIORITY

Prompt 15 order remains:

```text
PAID_ACTIVE
INTERACTIVE_FREE
REPORT
REFRESH
BACKGROUND
SEO_PRECOMPUTE
BULK
```

SEO never starves user work.

---

# 96. SITEMAP ARCHITECTURE

Root:

```text
/sitemap.xml
```

as sitemap index.

Child:

```text
/sitemaps/core.xml
/sitemaps/pl-surnames-launch.xml
/sitemaps/pl-surnames-0001.xml
...
```

or equivalent Next.js-generated routes.

P0 initial cohort can remain in its own sitemap for Search Console monitoring.

---

# 97. SITEMAP URL LIMIT

Google currently limits one sitemap to:

```text
50,000 URLs
or
50 MB uncompressed
```

Use internal shard target:

```text
≤45,000 surname URLs
```

to leave operational headroom.

Official:

https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

---

# 98. SITEMAP CONTENT

Only:

```text
publication_status = PUBLISHED
indexability = INDEX
canonical current URL
HTTP expected 200
```

Never:

- redirect alias;
- NOINDEX;
- checkout;
- report;
- search result;
- family/private;
- unpublished.

---

# 99. `lastmod`

Use:

```text
SEOProfileProjection.last_meaningful_modified_at
```

Google says `lastmod` should reflect meaningful page changes rather than trivial copyright/date changes.

Meaningful:

- current count;
- Claim;
- narrative;
- structured data;
- major internal links.

Not:

- page request;
- cache rebuild;
- analytics event.

---

# 100. `changefreq` / `priority`

Do not depend on them for SEO prioritization.

They can be omitted.

Name Atlas's meaningful control is:

```text
correct URLs + correct lastmod
```

---

# 101. GOOGLE INDEXING API

Do **not** use for surname pages.

Google's Indexing API is officially limited to:

```text
JobPosting
BroadcastEvent in VideoObject
```

Use:

- sitemaps;
- internal links;
- Search Console.

Official:

https://developers.google.com/search/apis/indexing-api/v3/using-api

---

# 102. INDEXNOW

Bing supports IndexNow for new/updated/deleted URLs.

P0:

```text
optional / not launch-critical
```

P1:

Add after publication service is stable.

Use only:

```text
PUBLISHED URLs
real update/delete events
```

Do not submit every cache render.

Official:

https://www.bing.com/webmasters/help/indexnow-0z209wby

---

# 103. ROBOTS.TXT

Use Next.js `app/robots.ts`.

Allow public.

Disallow crawling convenience for:

```text
/api/
checkout/account/admin/search internals
```

but security must not rely on robots.

Include sitemap URL.

---

# 104. PRIVATE ROUTES

Private/report routes use:

```text
auth
+
noindex headers/metadata
```

even if robots also discourages crawling.

If page is blocked from crawling, crawler cannot necessarily read `noindex`, so auth/HTTP status remains primary.

---

# 105. META ROBOTS

Index page:

default.

Noindex page:

```text
noindex, follow
```

unless links should also be blocked for a specific reason.

Private auth pages can use:

```text
noindex, nofollow
```

as secondary defense.

---

# 106. CANONICAL TAGS

Every INDEX surname page:

```text
self canonical
```

Aliases:

```text
301
```

rather than 200 duplicate + canonical where practical.

Tracking query page response canonicalizes to clean base URL.

---

# 107. CANONICAL IS A SIGNAL

Google explicitly describes canonical annotations as signals/hints and can select another URL.

Therefore Name Atlas must align:

```text
301
canonical
internal links
sitemap
hreflang
```

to the same URL.

No conflicting signals.

---

# 108. TRAILING SLASH

Choose:

```text
no trailing slash
```

for canonical public pages.

Redirect:

```text
/.../
→ 301
→ /...
```

or inverse if infrastructure prefers.

One global rule.

---

# 109. URL CASE

Canonical lowercase.

Upper/mixed case:

```text
301 lowercase
```

when path system allows.

---

# 110. SITEMAP QA

For every URL:

```text
HTTP 200
indexability INDEX
canonical self
not redirected
not blocked
locale correct
lastmod valid
```

---

# 111. INTERNAL LINKING — P0

Every indexable surname page gets links from:

1. alphabetical directory;
2. optional popular-surname hub where applicable;
3. evidence-backed related surname entity links where genuinely useful;
4. methodology/source pages;
5. search/explore CTA.

No page should depend only on sitemap discovery long term.

---

# 112. ALPHABETICAL DIRECTORY

P0 recommended:

```text
/pl/nazwiska
/pl/nazwiska/a
/pl/nazwiska/b
...
```

Only list:

```text
INDEX-eligible surname pages
```

Purpose:

- user browse;
- crawl discovery;
- reduce orphan pages.

---

# 113. DIRECTORY PAGINATION

If letter has too many surnames:

```text
/pl/nazwiska/k/2
```

or stable cursor-derived page number.

Requirements:

- server-rendered normal links;
- no infinite-scroll-only discovery;
- self canonical;
- meaningful list content.

Directory pages themselves can be indexable if user-useful.

---

# 114. DIRECTORY CONTENT

Minimal:

```text
Nazwiska na literę K
```

with canonical names and perhaps public count/rank summary.

Do not put 5,000 links in one page.

---

# 115. POPULAR SURNAME HUB

Recommended P0/P1:

```text
/pl/nazwiska/najpopularniejsze
```

Based on official dataset.

Provides:

- ranking;
- source date;
- links to qualified pages.

Strong high-level organic resource.

---

# 116. RARE SURNAME HUB

Not P0.

Risks:

- privacy;
- suppression;
- thin content.

Do not market:

```text
rarest people in village X
```

---

# 117. GEO HUB

Not P0 until valid current regional surname data source is established/licensed.

No fake:

```text
Nazwiska w Mazowieckiem
```

from old geography labeled current.

---

# 118. RELATED SURNAMES

P0 display only if relationship is:

```text
approved modern relation
or
evidence-backed historical/linguistic relation
```

Not:

```text
edit distance <= 2
```

as “related”.

Search suggestions are different from semantic relatedness.

---

# 119. RELATED LINK LIMIT

Keep contextual:

```text
3–8
```

where available.

No keyword link clouds.

---

# 120. HISTORICAL FORMS

If historical variant is not separate modern entity:

render as text, not link.

If there is a separate canonical surname entity with approved relation:

can link with label:

```text
Related modern surname
```

not falsely imply same family.

---

# 121. METHODOLOGY LINKS

Every surname page can link to:

```text
Jak liczymy popularność nazwiska
Jak oceniamy pochodzenie
Poziomy pewności
Źródła Name Atlas
Jak czytać mapy
```

These are valuable trust hubs.

---

# 122. EDITORIAL CONTENT

P0/P1 acquisition topics:

```text
Jak sprawdzić pochodzenie nazwiska
Jak powstawały polskie nazwiska
Najpopularniejsze nazwiska w Polsce
Co oznacza końcówka -ski?
Nazwisko a herb — dlaczego to nie to samo
Jak zacząć genealogię rodziny
Jak czytać historyczne warianty nazwisk
```

All source/research backed.

---

# 123. CONTENT PILLARS

```text
Surname Meaning & Formation
Current Distribution & Rarity
History of Polish Surnames
Genealogy Basics
Archives & Sources
Historical Geography
Heraldry Myths / Safety
Migration
```

Editorial pages help users understand surname profiles and build internal link structure.

---

# 124. PROGRAMMATIC VS EDITORIAL

Programmatic:

```text
entity-specific evidence
```

Editorial:

```text
cross-entity explanation / methodology
```

Do not use programmatic template for every long-tail question.

---

# 125. PROGRAMMATIC FAQ

No automatic 10-question block.

If real answer exists and query is useful:

FAQ copy may appear to users.

But Google removed FAQ rich results, so there is no reason to produce repetitive FAQ blocks for SERP markup.

---

# 126. SERP HERALDRY STRATEGY

Queries:

```text
herb nazwiska X
```

are high-risk.

Surname page should never dynamically claim a coat of arms unless evidence is about a specific historical family and wording is scope-safe.

Editorial hub:

```text
Nazwisko a herb — jak naprawdę działa polska heraldyka
```

can target broad intent safely.

Surname page can link there when user needs context.

---

# 127. SEARCH DEMAND RESEARCH

P0 sources:

```text
Google Search Console after launch
Bing Webmaster
Semrush or Ahrefs periodic research
manual SERP review
internal search demand
```

Do not require third-party keyword volume to decide whether a canonical high-quality page deserves to exist.

---

# 128. TOOLING — P0

Required/free:

```text
Google Search Console
Bing Webmaster Tools
PageSpeed Insights / CrUX
Rich Results Test
```

Technical crawler:

```text
Screaming Frog
```

Current free version supports 500 URLs; paid licence removes that crawl limit and adds advanced crawl configuration/JS/audit capabilities.

Current published price snapshot:

```text
£199 / €245 / $279 per user/year
```

Official:

https://www.screamingfrog.co.uk/seo-spider/pricing/

---

# 129. SEMRUSH / AHREFS

Do not buy both for P0.

Current snapshot:

```text
Semrush SEO plan around $139/mo monthly
Ahrefs Lite around $129/mo
```

Either can support:

- competitor research;
- keyword exploration;
- backlink discovery;
- rank cohort tracking.

Recommendation:

```text
launch without annual commitment
use one when ongoing query research justifies it
```

If team already works with Semrush, use it; otherwise evaluate both on Polish data quality before contract.

---

# 130. SEARCH CONSOLE

Create:

```text
Domain property
```

so all protocols/subdomains/paths are covered.

Configure:

- sitemap;
- Page Indexing;
- Performance;
- Core Web Vitals;
- URL Inspection;
- security/manual-action alerts.

Search Console is canonical Google search-performance source.

---

# 131. GENERATIVE AI PERFORMANCE

Google's current 2026 documentation introduces generative-AI performance reporting in Search Console and explicitly treats normal SEO as the basis for AI visibility.

When available to Name Atlas property, monitor:

- AI feature impressions/clicks/visibility;
- pages receiving AI referrals.

Do not create separate “AI rank” KPI from opaque third-party estimations as primary truth.

---

# 132. BING WEBMASTER

Set up:

- site;
- sitemap;
- Site Scan;
- URL Inspection;
- search keyword reports.

P1:

```text
IndexNow
```

---

# 133. SEARCH QUERY PRIVACY

Search Console data is aggregated search-performance data.

Do not join:

```text
Google query
↔ individual Name Atlas visitor
```

Generic SEO analysis operates at:

```text
page/query/day/device/country aggregate
```

---

# 134. SITEMAP SEARCH CONSOLE STRATEGY

Initial separate sitemap:

```text
/pl-surnames-launch.xml
```

for first cohort.

Later:

```text
/pl-surnames-0001.xml
/pl-surnames-0002.xml
```

This allows visibility into launch/indexing cohorts.

---

# 135. HREFLANG — P0

If only Polish surname profiles are indexable:

```text
no hreflang needed for surname page
```

until a real alternate language version exists.

Do not point hreflang to an English `NOINDEX` page.

---

# 136. ENGLISH LAUNCH POLICY

Recommendation:

```text
Product UI may support English
but EN surname SEO = NOINDEX P0
```

until:

- narrative localization QA;
- source scope wording;
- title/meta quality;
- indexed English test cohort;
- reciprocal hreflang.

This avoids mass-translated weak duplicates.

---

# 137. P1 HREFLANG

When PL + EN page both qualified:

Each page:

```text
rel=alternate hreflang=pl
rel=alternate hreflang=en
```

plus optional:

```text
x-default
```

on appropriate selector/default.

Each localized page:

```text
self-canonical
```

not canonical to Polish.

---

# 138. LOCALE VS DATA SCOPE

Hard rule:

```text
language != geography
```

English page for Polish surname data must say:

```text
Poland / PESEL / source date
```

It does not become “global data” because copy is English.

---

# 139. CORE WEB VITALS

Current good thresholds:

```text
LCP ≤ 2.5 s
INP ≤ 200 ms
CLS ≤ 0.1
```

evaluated at the 75th percentile of real visits.

Official:

https://web.dev/articles/vitals

Use:

- Search Console field data;
- CrUX/PageSpeed;
- optional privacy-approved RUM.

---

# 140. MAP PERFORMANCE

Initial HTML shows:

- heading;
- summary;
- strongest regions;
- optional lightweight static map preview.

Interactive map:

```text
lazy import after viewport/interaction
```

Do not make map JavaScript the LCP dependency.

---

# 141. INITIAL JS BUDGET

Surname page does not initially bundle:

- checkout logic;
- report renderer;
- admin;
- full historical map engine;
- every analytics experiment library before consent.

Use code splitting.

---

# 142. CLS

Reserve layout for:

- map;
- consent banner;
- Discovery preview;
- charts.

Do not insert paywall banner above already-visible content after hydration in a way that causes layout shift.

---

# 143. MOBILE

Search landing page should show:

```text
surname
core result
```

before large decorative content.

No full-screen lead/email popup.

---

# 144. CRAWLER SSR

Crawler receives:

```text
H1
core facts
chapter content
citations
metadata
canonical
structured data
```

without requiring user interaction.

Interactive map/client transitions can remain JS.

---

# 145. AI SEARCH CONTENT DESIGN

Google's 2026 AI optimization guide advises useful non-commodity content and warns against making separate pages for every possible query/fan-out variation.

Name Atlas should therefore provide:

```text
one rich surname entity page
```

that answers related questions.

This directly supports the one-canonical-page strategy.

---

# 146. `llms.txt`

Google currently says `llms.txt` is neither required nor used for Google Search visibility.

Therefore:

```text
NO P0 SEO dependency
```

If Name Atlas later wants the file for another AI consumer, it can exist without being treated as a Google ranking mechanism.

---

# 147. NO “AI CHUNKING” HACK

Do not split:

```text
meaning
origin
history
variants
```

into independent URLs merely to make AI systems “understand chunks”.

Google explicitly says this is unnecessary.

---

# 148. SEARCH ENGINE AI CITATION STRATEGY

Make important facts easy to understand:

```text
66,589 men ...
Source: ...
Data date: ...
```

Use concise factual paragraphs.

Citations/source section.

This helps both humans and retrieval systems without special markup hacks.

---

# 149. AUTHORSHIP / REVIEW

Do not invent a person author.

Default:

```text
Name Atlas Research
```

or no byline on database pages.

Display:

```text
Reviewed by [REAL EXPERT]
```

only when a real review occurred and audit record exists.

---

# 150. TRUST PAGES

P0 public:

```text
About
Methodology
Sources
Confidence
Corrections
Privacy
Terms
Contact
```

These support users and search quality.

---

# 151. CORRECTIONS

Every surname page:

```text
Report an issue
```

links to factual-feedback workflow.

No direct user editing.

---

# 152. EXTERNAL CITATIONS

Where permitted, link to authoritative source pages.

Do not globally `nofollow` genuine citations.

Use:

```text
noopener
```

for new-tab security.

`noreferrer` only where referrer suppression is desired; it is not automatically required for every citation.

---

# 153. SOURCE RIGHTS

Do not embed restricted scan just because text citation is SEO-eligible.

SEO can show:

```text
source title
institution
locator
```

while image remains blocked.

---

# 154. PUBLIC DISCOVERY PREVIEW

Allowed:

```text
3 historical variants found
2 places
archive references available
```

only if DiscoveryIndex public preview allows it.

Do not include hidden full arrays in HTML or JSON-LD.

---

# 155. PRICE ON SEO PAGE

Decision:

- page may show public default Offer in ordinary UI;
- **price is excluded from SEO title/meta/structured data P0**;
- visitor-level price experiments are not crawler-facing SEO variants.

Crawler receives default/control public offer presentation if offer component is server-rendered.

No crawler experiment assignment.

---

# 156. NO CLOAKING

Core factual page content is the same for:

```text
Googlebot
human visitor
```

with normal differences for:

- authentication;
- consent;
- visitor experiments on commerce presentation.

Do not show Google substantially richer free factual content than users.

---

# 157. PRIVATE / PREMIUM HTML

Page source must not contain:

```text
full premium chapter JSON
hidden report
entitlement
private citations
```

and rely on CSS blur.

Prompt 16 hard rule applies.

---

# 158. SEO ANALYTICS

Organic session properties from Prompt 18:

```text
acquisition_channel = ORGANIC_SEARCH
landing_type = SURNAME_PROFILE
landing_seo_projection_version
coverage_tier
```

No need to send exact Search Console query to visitor event.

---

# 159. PRIMARY ORGANIC VALUE METRICS

```text
organic valid searches
organic FREE_ACTIVATION_RATE
organic MEANINGFUL_DISCOVERY_RATE

organic premium eligibility
organic offer conversion
organic revenue per eligible profile
```

Traffic alone is not primary.

---

# 160. SEO HEALTH METRICS

```text
published INDEX pages
submitted sitemap URLs
indexed URLs

crawled not indexed
discovered not indexed
duplicate canonical
soft 404

organic impressions
organic clicks

pages with impressions
pages with clicks

Meaningful Discovery by SEO cohort
```

---

# 161. INDEXED PAGE COUNT

Do not set OKR:

```text
index 100,000 pages
```

without a user-value requirement.

Better:

```text
qualified indexed pages
with impressions/clicks/value
```

---

# 162. COVERAGE COHORT

Analyze Search Console by:

```text
RICH
STANDARD
LIMITED conditional
```

If Google systematically rejects limited pages, tighten policy.

If standard pages create real engagement, continue.

---

# 163. SEARCH CONSOLE IMPORT

P1 scheduled import:

```text
date
page
query
country
device
impressions
clicks
position
```

Aggregation.

Could use Search Console API.

Store separately from user behavioral analytics.

---

# 164. SEO DASHBOARD — P0

Panels:

```text
Publication
Indexation
Organic Acquisition
Product Value
Premium Opportunity
Technical Health
Quality / Eligibility
```

---

# 165. PUBLICATION PANEL

```text
INDEX pages
NOINDEX pages
BLOCKED pages
new published
suppressed
```

Reason buckets:

```text
LOW_COVERAGE
RIGHTS
DUPLICATE
ENTITY
QA
```

---

# 166. INDEXATION PANEL

```text
submitted
indexed
not indexed
crawled not indexed
discovered not indexed
Google canonical mismatch
soft 404
```

---

# 167. ORGANIC PRODUCT PANEL

```text
organic surname sessions
FREE activation
Meaningful Discovery
history engagement
premium eligible
orders
revenue
```

---

# 168. SEO QUALITY PANEL

```text
INDEX by value families
SEO QA failures
title overpromise
rights suppressions
duplicate/alias issues
stale current data
```

---

# 169. ORGANIC QUERY GAP

Search Console queries can reveal:

```text
intent users seek
```

Example:

many:

```text
nazwisko X herb
```

does not justify false heraldry.

It may justify:

- better heraldry-explainer internal link;
- safe surname-level wording.

---

# 170. DATA PARTNERSHIP SIGNAL

If:

```text
"mapa nazwiska"
```

has high demand but Name Atlas lacks lawful current regional map:

SEO dashboard supports business case for licensing/current-data partnership.

It does not license the data itself.

---

# 171. SEO EXPERIMENTS

Allow:

- title pattern;
- meta;
- section ordering;
- internal link placement;
- summary style.

Do not randomize crawler-facing URL/canonical per visitor.

---

# 172. SEO SPLIT TESTING

Search ranking tests should use:

```text
page cohorts
```

rather than normal visitor-level A/B.

Example:

```text
100 comparable surname pages control template
100 comparable surname pages treatment title
```

Pre-balance by:

- frequency;
- prior impressions;
- coverage;
- age.

Measure:

- impressions;
- CTR;
- clicks;
- position cautiously;
- downstream value.

---

# 173. LIMITATIONS OF SEO TESTS

Search algorithms, seasonality and query mix create interference.

SEO cohort tests are not identical to randomized user A/B tests.

Treat small effects cautiously.

Pre-register:

```text
pages
change
period
primary metric
```

---

# 174. TITLE TEST

Could test:

```text
"Namesurname — pochodzenie, znaczenie..."
```

vs:

```text
"Namesurname: ile osób, pochodzenie..."
```

only across pages where all promised dimensions exist.

No title treatment may overpromise.

---

# 175. TEMPLATE VERSION

Every SEO projection stores:

```text
seo_template_version
```

So Search Console cohort comparison can attribute structural change.

---

# 176. STRUCTURED DATA VERSION

Builder version stored in projection.

Failures trigger QA before publication.

---

# 177. SEARCH ENGINE POLICY MONITOR

Quarterly/current-change review:

```text
Google Search docs updates
Spam policy
Structured data
AI Search docs
Search Console
Bing/IndexNow
```

Prompt 21 is versioned because search rules change.

---

# 178. PAGE INDEXATION STATE MACHINE

```text
canonical Surname exists
        │
        ▼
  NOT_PUBLISHED
        │
 public profile ready
        ▼
 SEO assessment
    ┌───┴───────┐
    ▼           ▼
 NOINDEX      BLOCKED
    │
 value grows
    ▼
  READY INDEX
    │
    ▼
 PUBLISHED INDEX
```

Can regress:

```text
INDEX
↓ rights/quality loss
NOINDEX / SUPPRESSED
```

---

# 179. MASS PUBLICATION SAFETY

Publication job takes:

```text
max_batch_size
```

P0 hard caps.

No policy change can instantly publish 500k URLs without:

- dry run;
- impact count;
- explicit approval.

---

# 180. MASS DEINDEX SAFETY

Same.

Before batch change:

```text
affected page count
reason distribution
sample
```

For rights/privacy emergency:

safety block can override normal approval.

---

# 181. ROLLBACK

Keep previous valid SEO projection/template.

Bad release:

```text
stop publisher
↓
restore previous template/projection renderer
↓
revalidate affected paths
```

No research rerun needed.

---

# 182. RIGHTS INCIDENT PLAYBOOK

```text
RightsProfile changes
↓
identify affected Claims/pages
↓
remove blocked section
↓
rebuild eligibility
↓
if threshold fails:
  NOINDEX / SUPPRESS
↓
sitemap remove
↓
cache purge
↓
Search Console/Bing removal tool if urgent
```

---

# 183. BAD TEMPLATE INCIDENT

Examples:

- titles promise map where none exists;
- canonical wrong;
- H1 blank;
- 50k pages duplicated.

Flow:

```text
publication kill switch
↓
rollback
↓
sitemap halt
↓
cache purge
↓
sample validation
↓
resume
```

---

# 184. ENTITY MERGE PLAYBOOK

```text
Surname A merged into B
↓
B survives
↓
A canonical URL → 301 B
↓
SlugAlias stored
↓
internal links update
↓
A sitemap removed
↓
B lastmod updated if content changed
```

---

# 185. ENTITY SPLIT PLAYBOOK

```text
Old entity C
↓
C1 + C2
```

Recommended transition:

```text
old C path
→ disambiguation NOINDEX
```

until link/canonical migration is understood.

No arbitrary 301.

---

# 186. SEO QA CORPUS

Extend Prompt 17:

```text
SEO-001 RICH INDEX
SEO-002 STANDARD INDEX
SEO-003 statistics-only NOINDEX
SEO-004 conflicting-origin INDEX
SEO-005 no-map indexable via other value
SEO-006 rights BLOCKED
SEO-007 unresolved typo 404
SEO-008 fuzzy no page
SEO-009 old slug 301
SEO-010 slug collision
SEO-011 Unicode diacritics
SEO-012 gender-form alias
SEO-013 query parameter canonical
SEO-014 search results NOINDEX
SEO-015 report/private NOINDEX
SEO-016 sitemap INDEX only
SEO-017 Breadcrumb JSON-LD valid
SEO-018 metadata truth
SEO-019 crawler no ResearchRun
SEO-020 source snapshot lastmod
SEO-021 rights change deindex
SEO-022 entity merge redirect
SEO-023 entity split safe
SEO-024 premium hidden data absent
SEO-025 family private absent
SEO-026 staging noindex
SEO-027 EN noindex P0
SEO-028 sitemap lastmod stable
SEO-029 crawler cached
SEO-030 structured data visible-content match
```

---

# 187. TECHNICAL CONTRACT TESTS

For INDEX surname:

```text
GET = 200
title exists
H1 exists
canonical self
robots allows index
sitemap contains URL
structured data valid
```

For NOINDEX:

```text
GET = 200
meta robots noindex
not in sitemap
```

Unknown:

```text
404
```

Alias:

```text
301
```

---

# 188. CRAWLER COST TEST

Request indexable surname as:

```text
Googlebot
Bingbot
normal browser
```

Assertions:

```text
external connector calls = 0
ResearchRun created = 0
LLM calls = 0
OCR jobs = 0
```

---

# 189. SEO SECURITY TEST

Rendered HTML must not contain:

```text
CustomerIdentity
order
entitlement
private report body
magic token
private Evidence
internal SourceRecord raw payload
```

---

# 190. STAGING

Staging:

```text
authentication where practical
+
global noindex
```

Never include staging URLs in production sitemap/hreflang/canonical.

---

# 191. FIRST SEO LAUNCH COHORT — EXACT RECOMMENDATION

## Cohort 0 — internal/staging

```text
36 Prompt 17 golden surname entities
```

Validate complete template matrix.

No production index.

## Cohort 1 — production

```text
250 Polish surname pages
```

Selection:

```text
~60% high-frequency / strong data
~20% medium-frequency
~10% rare but genuinely rich
~10% edge-case set:
  foreign
  compound
  gender form
  conflict
  no map
```

Exact percentages are sampling guidance, not business truth.

---

# 192. COHORT 1 MANUAL REVIEW

All pages automated QA.

Human:

```text
50-page stratified sample
+
100% of HIGH_RISK cases:
  conflicting onomastics
  heraldry context
  rare/suppressed
  unusual resolution
```

Do not manually review only popular easy names.

---

# 193. COHORT 2

After approximately:

- no systemic template errors;
- reasonable indexing;
- no spam/quality issue;
- Search Console data accumulating;
- product engagement healthy;

expand total to:

```text
1,000 INDEX pages
```

---

# 194. COHORT 3

Then:

```text
5,000 INDEX pages
```

with:

- automated full QA;
- smaller stratified human sample;
- Search Console indexing comparison by batch.

---

# 195. COHORT 4

```text
10,000+
```

only after Name Atlas demonstrates:

- sufficient profile supply;
- crawler/render performance;
- strong indexability rate;
- organic Meaningful Discovery.

No pre-commitment to 100k.

---

# 196. LONG-TAIL EXPANSION

After initial frequency-based corpus:

Priority uses:

```text
internal demand
Search Console query/page demand
current frequency
Coverage
research cost
```

A searched niche surname with high-quality evidence can become indexable regardless of frequency.

---

# 197. PROGRAMMATIC FAILURE MODE 1

### URL exists because string exists

Bad:

```text
/nazwisko/asdfgh
200
```

Fix:

canonical entity required.

---

# 198. FAILURE MODE 2

### PESEL row automatically equals INDEX page

Bad:

```text
500k statistic-only pages
```

Fix:

SEO value-family gate.

---

# 199. FAILURE MODE 3

### Empty chapters

Bad:

```text
Meaning — no data
Origin — no data
History — no data
```

Fix:

adaptive projection.

---

# 200. FAILURE MODE 4

### Generic LLM biography of surname

Fix:

Claim-fed narrative only.

---

# 201. FAILURE MODE 5

### Same intro across 50k pages

Fix:

remove generic filler; lead with data.

---

# 202. FAILURE MODE 6

### Word-count generation

Fix:

value families, not length.

---

# 203. FAILURE MODE 7

### Meaning/origin/map child pages

Fix:

anchors on canonical entity.

---

# 204. FAILURE MODE 8

### Surname × region pages

Fix:

no combinatorial routes P0.

---

# 205. FAILURE MODE 9

### Every historical variant has URL

Fix:

variant stays content unless canonical modern entity.

---

# 206. FAILURE MODE 10

### Fuzzy candidate becomes page

Fix:

canonical Surname required.

---

# 207. FAILURE MODE 11

### Gender duplicates

Fix:

resolver entity identity + alias redirect.

---

# 208. FAILURE MODE 12

### Diacritic merge

Fix:

Unicode canonical slug.

---

# 209. FAILURE MODE 13

### Daily fake lastmod

Fix:

meaningful projection update only.

---

# 210. FAILURE MODE 14

### Every filter crawled

Fix:

canonical + noindex/facet controls.

---

# 211. FAILURE MODE 15

### Search results indexed

Fix:

NOINDEX internal search.

---

# 212. FAILURE MODE 16

### Crawler starts history research

Fix:

SEOProjection-only read path.

---

# 213. FAILURE MODE 17

### Premium body in HTML blur

Fix:

public projection only.

---

# 214. FAILURE MODE 18

### English machine translation mass-indexed

Fix:

EN NOINDEX until QA.

---

# 215. FAILURE MODE 19

### Metadata overpromises

Fix:

availability-aware title builder.

---

# 216. FAILURE MODE 20

### Sitemap includes redirects/noindex

Fix:

generate from eligibility state.

---

# 217. TOP 20 SEO RISKS

1. Thin surname-page explosion.
2. Scaled LLM filler.
3. Unsourced etymology.
4. Old geography presented as current.
5. Title promises unavailable map.
6. Surname×region URL explosion.
7. Gender-form duplicates.
8. Diacritic canonical collision.
9. Search candidates becoming pages.
10. Historical variants treated as independent canonical surnames.
11. English translated duplicates.
12. Wrong canonical/hreflang signals.
13. Premium/private payload indexed.
14. Crawler triggers research costs.
15. Soft-404 long tail.
16. Rights-blocked data in index.
17. Fake lastmod/freshness.
18. Google scaled-content policy issue.
19. SEO traffic incentivizes weaker truth standards.
20. Mass publication/deindex bug.

---

# 218. SEO INCIDENT PLAYBOOK — PRIVACY

If private/premium data is indexed:

```text
SEV privacy incident
↓
block resource/auth
↓
remove exposed HTML
↓
CDN purge
↓
noindex/404/410 as applicable
↓
Google Removals / Bing removal
↓
incident assessment under Prompt 19
↓
regression test
```

---

# 219. SEO INCIDENT PLAYBOOK — INDEX BLOAT

Signs:

```text
huge discovered-not-indexed spike
soft 404
duplicate pages
```

Response:

- stop publication;
- inspect cohort;
- tighten eligibility;
- remove weak URLs from sitemap;
- noindex/404 as semantically correct;
- do not immediately delete useful pages solely because not indexed.

---

# 220. SEO INCIDENT PLAYBOOK — SCALED CONTENT QUALITY

If Google policy/manual issue:

- halt generation;
- identify low-value template/page sets;
- remove/noindex violating pages;
- rebuild from stronger evidence;
- do not merely rewrite AI wording.

---

# 221. SEO TOOLING STACK — P0 FINAL

Required:

```text
Google Search Console
Bing Webmaster Tools
PageSpeed Insights / CrUX
Google Rich Results Test
```

Recommended crawler:

```text
Screaming Frog
```

Optional demand/competitor:

```text
Semrush OR Ahrefs
```

No:

```text
five SEO tools
```

P0.

---

# 222. AI SEARCH / GENERATIVE SEARCH P0

Use existing pages.

No:

```text
llms.txt ranking initiative
special AI schema
AI-only page variants
AI fan-out pages
```

Track Google's Search Console generative-AI reporting where available.

Focus on first-party evidence.

---

# 223. CORRECTIONS AND TRUST

Public methodology should explain:

- source dates;
- Claim confidence;
- surname vs family;
- corrections.

This is not “E-E-A-T SEO copy.”

It is genuine product transparency.

---

# 224. SEARCH CRAWLABILITY

Important page text remains in HTML.

Map canvas alone cannot carry the geography answer.

Provide text:

```text
Największe publicznie dostępne wartości...
```

with sourced table/summary.

---

# 225. ACCESSIBILITY

Semantic HTML:

```text
H1
H2
lists
tables
links
```

serves accessibility and search clarity.

No hidden keyword blocks.

---

# 226. IMAGE SEO

Only genuine visuals:

- distribution map;
- historical source image if rights allow;
- editorial diagrams.

No generated coat-of-arms image presented as evidence.

---

# 227. MAP ALT / DESCRIPTION

When a map image exists:

```text
Mapa rozmieszczenia nazwiska [X] w Polsce według [source/date]
```

not:

```text
Mapa pochodzenia rodziny [X]
```

---

# 228. EDITORIAL DIGITAL PR

Best link-worthy resources are original lawful data analyses.

Examples:

```text
Najpopularniejsze polskie nazwiska 2026
Jak zmieniała się liczebność nazwisk across snapshots
Najczęstsze typy polskich nazwisk
```

Only if methodology supports.

---

# 229. LINK BUILDING POLICY

Allowed:

- journalists;
- genealogy communities;
- universities/digital humanities;
- data citations;
- relevant resource outreach.

No:

- paid link farms;
- reciprocal link schemes;
- mass guest-post anchors.

---

# 230. SITE REPUTATION

Do not later host third-party low-quality genealogy content simply because Name Atlas gains authority.

Google's current site-reputation policies remain relevant.

---

# 231. SEARCH ENGINE UPDATE MONITORING

Subscribe/review:

```text
Google Search Central updates RSS
Bing Webmaster updates
Schema.org releases
Next.js SEO/runtime changes
```

SEO policy gets version bump after material changes.

---

# 232. NEXT.JS SECURITY / VERSION

Keep Next.js current due security updates.

SEO rendering architecture should not pin to old Pages Router patterns.

Use App Router current supported release.

---

# 233. P0 SEO ARCHITECTURE — FINAL

```text
Canonical Surname
↓
Public SurnameProfile
↓
Coverage / SurfaceEligibility
↓
SEOEligibilityAssessment
↓
SEOProfileProjection
↓
SEO QA
↓
Publication state
↓
Next.js cached SSR/static render
↓
CDN
↓
Sitemap + Directory links
↓
Google/Bing
```

---

# 234. P0 PROGRAMMATIC PAGE TEMPLATE — FINAL

```text
Breadcrumb

Nazwisko [X]

Evidence-backed snapshot

[Today / population / rarity]

[Where — only if valid]

[Meaning — only if valid]

[Origin — only if valid]

[History — only if valid]

Sources / confidence / limitations

Discovery preview if eligible

Search another surname

Methodology / corrections
```

No empty chapters.

---

# 235. P0 INDEXABILITY POLICY — FINAL

`INDEX` requires:

```text
canonical entity
+
public/SEO rights
+
critical QA
+
at least two substantive value families
+
usable source transparency
+
unique page value
```

Stats-only:

```text
NOINDEX P0
```

unless policy later changes after measured evidence.

---

# 236. P0 TECHNICAL SEO — FINAL

- Unicode canonical slug.
- one surname URL.
- lowercase.
- no trailing slash.
- self canonical.
- aliases 301.
- internal search noindex.
- correct 404.
- Next.js cached server rendering.
- ETag/CDN.
- Core Web Vitals.
- private/premium noindex + auth.
- no crawler-triggered research.

---

# 237. P0 INTERNAL LINKING — FINAL

```text
Home
↓
Surname Directory
↓
Alphabet hubs
↓
Surname pages
```

Plus:

```text
Surname page
→ methodology
→ sources
→ approved related surname entities
```

No fuzzy related-link farm.

---

# 238. P0 SITEMAPS — FINAL

```text
/sitemap.xml
```

index:

```text
core
pl-surnames-launch
later sharded pl-surnames
```

Only INDEX canonical URLs.

Real `lastmod`.

---

# 239. P0 STRUCTURED DATA — FINAL

Surname:

```text
BreadcrumbList
optional WebPage
```

Site:

```text
Organization
WebSite
```

No:

```text
Person
FAQ rich-result program
Dataset on surname pages
Product on surname page by default
```

---

# 240. P0 SEARCH CONSOLE / ANALYTICS — FINAL

Google:

- Domain property;
- sitemap;
- Page Indexing;
- URL Inspection;
- Performance;
- Core Web Vitals;
- AI/generative performance where available.

Bing:

- site;
- sitemap;
- Site Scan;
- query performance;
- IndexNow later.

Product:

- organic Meaningful Discovery;
- premium eligibility;
- revenue/eligible organic profile.

---

# 241. P0 SEO QA — FINAL

Before every INDEX:

```text
Entity
Claim
Confidence
Rights
Privacy
Uniqueness
Metadata
Structured data
Canonical
Rendering
Sitemap
```

Prompt 17 SEO corpus becomes release blocker.

---

# 242. FIRST SEO LAUNCH COHORT — FINAL

1. 36 golden entities on staging.
2. 250 indexable Polish production surname pages.
3. Stratified manual QA of 50 + all high-risk.
4. Monitor Search Console.
5. Expand to 1,000.
6. Expand to 5,000.
7. Expand to 10,000+ only when quality/indexation/product value justify.

No “launch all known surnames.”

---

# 243. P1 SEO

After successful Poland P0:

- high-quality English cohort;
- reciprocal hreflang;
- IndexNow;
- richer editorial hubs;
- selected historical deep pages;
- country packs;
- global surname datasets;
- data stories;
- Search Console data warehouse;
- more systematic cohort SEO testing.

---

# 244. DO NOT BUILD YET

1. Surname × city pages.
2. Surname × voivodeship pages.
3. Separate meaning URLs.
4. Separate origin URLs.
5. Separate map URLs.
6. Separate variant URLs.
7. Archive-record SEO pages.
8. Person biography pages.
9. Family pages.
10. Comparison permutations.
11. Auto-generated FAQ farm.
12. AI blog farm.
13. Every known surname page.
14. Global auto-translation.
15. “GEO hacks”/llms.txt ranking program.
16. Generic heraldry pages per surname.
17. Faceted index pages.
18. Query-specific doorway pages.

---

# 245. MODEL CHANGE PROPOSALS — FINAL

## 21-A — `SEOProfileProjection`

**P0 ACCEPT.**

Persistent, versioned public SEO render input.

## 21-B — `SEOEligibilityAssessment`

**P0 ACCEPT.**

Separate page-quality/indexability decision.

## 21-C — `publication_status`

**P0 ACCEPT** as field on SEO projection.

```text
DRAFT
READY
PUBLISHED
SUPPRESSED
```

## 21-D — `SlugAlias`

**P0 ACCEPT.**

Required for safe slugs/redirects/gender aliases.

## 21-E — `SEOBackfillPriority`

**DEFER as formal entity.**

Implement as planner/batch logic until operational scale requires persistence.

---

# 246. DECISION REGISTER

## Page identity

**Decision:** one page per canonical Surname entity.

## URL

**Decision:** `/pl/nazwisko/{slug}`.

## Slug

**Decision:** Unicode NFC, preserve Polish diacritics.

## ASCII alias

**Decision:** only when unambiguous.

## Gender forms

**Decision:** one canonical page; accepted alias redirects.

## Historical variants

**Decision:** no standalone URL by default.

## Indexability

**Decision:** hard truth/rights gates + ≥2 substantive value families.

## Statistics-only

**Decision:** NOINDEX P0.

## English

**Decision:** no mass EN indexing P0.

## Rendering

**Decision:** precomputed projection + hybrid static/cached render.

## Crawler work

**Decision:** zero research/LLM/connectors on request.

## Sitemap

**Decision:** INDEX-only sitemap index; real lastmod.

## Google Indexing API

**Decision:** not used.

## IndexNow

**Decision:** optional P1.

## Structured data

**Decision:** minimal, semantically correct.

## FAQ

**Decision:** no FAQ rich-result strategy.

## AI Search

**Decision:** normal evidence-backed SEO; no GEO hacks.

## Internal links

**Decision:** hubs + real evidence relationships.

## First cohort

**Decision:** 250 production indexable pages.

## Growth

**Decision:** staged 250 → 1k → 5k → 10k+.

## Tooling

**Decision:** GSC + Bing + Screaming Frog; one paid keyword tool only if needed.

---

# 247. DEFINITION OF SEO READY

SEO P0 is ready only when:

### Entity / URLs

- one canonical surname page exists;
- fuzzy candidate cannot create page;
- Unicode/diacritic policy is tested;
- gender aliases do not create duplicates;
- old slug redirect exists;
- collisions handled;
- unknown slug returns 404.

### Quality

- SEOEligibilityAssessment is versioned;
- stats-only pages default NOINDEX;
- every INDEX page has meaningful sourced value;
- no word-count/filler gate;
- conflicting evidence is represented safely;
- `INSUFFICIENT_DATA` is never filled by LLM.

### Content

- SEOProjection contains only approved public Claims;
- metadata cannot promise missing chapter;
- source dates visible;
- premium body absent;
- private/family data absent;
- LLM narrative is Claim-bound.

### Technical

- meaningful SSR/pre-render HTML;
- CDN/cache;
- no crawler ResearchRun;
- canonical/robots/404/301 correct;
- sitemap contains INDEX only;
- real `lastmod`;
- CWV monitored;
- map lazy loaded.

### Search ecosystem

- Search Console Domain property;
- Bing Webmaster;
- sitemap submitted;
- indexing dashboard;
- crawler audit;
- Google AI guidance accounted for;
- no use of Indexing API for ordinary surname pages.

### Rollout

- staging golden corpus passes;
- first 250 cohort prepared;
- publication kill switch;
- batch impact preview;
- rights deindex path;
- Prompt 17 SEO regression suite passes.

---

# 248. INPUTS REQUIRED BY PROMPT 22

Prompt 22 — Internal Admin / Research Console — should expose SEO operations:

```text
surname identity
canonical slug
SlugAliases

SEOEligibilityAssessment
reason codes

SEOProfileProjection preview
profile/template/prompt versions

publication_status
indexability

title
description
canonical
hreflang
structured data

sitemap membership
last meaningful update

QA results

actions:
  rebuild
  suppress
  re-evaluate eligibility
  add approved alias
  inspect redirect
```

Admin may:

```text
force NOINDEX
suppress page
rebuild
```

Admin must **not** be able to force INDEX through:

- privacy block;
- rights block;
- unsupported Claims;
- unresolved entity identity.

---

# 249. CURRENT AUTHORITATIVE REFERENCE INDEX

## Google quality / AI search

- Spam policies: https://developers.google.com/search/docs/essentials/spam-policies
- AI optimization guide: https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- AI features: https://developers.google.com/search/docs/appearance/ai-features
- Search documentation updates: https://developers.google.com/search/updates

## Crawling / indexing

- Canonicalization: https://developers.google.com/search/docs/crawling-indexing/canonicalization
- Sitemaps: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- Large sitemap indexes: https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps
- Google Indexing API limits: https://developers.google.com/search/apis/indexing-api/v3/using-api
- Localized versions / hreflang: https://developers.google.com/search/docs/specialty/international/localized-versions

## Structured data

- Structured data appearance overview: https://developers.google.com/search/docs/appearance
- Breadcrumbs: https://developers.google.com/search/docs/appearance/structured-data/breadcrumb
- Organization: https://developers.google.com/search/docs/appearance/structured-data/organization
- Schema.org DefinedTerm: https://schema.org/DefinedTerm

## Search Console

- Page Indexing: https://support.google.com/webmasters/answer/7440203
- URL Inspection: https://support.google.com/webmasters/answer/9012289
- Search Console overview: https://support.google.com/webmasters/answer/9128668

## Bing

- Sitemaps: https://www.bing.com/webmasters/help/sitemaps-3b5cf6ed
- IndexNow: https://www.bing.com/webmasters/help/indexnow-0z209wby
- Site Scan: https://www.bing.com/webmasters/help/site-scan-623520c9

## Performance

- Core Web Vitals: https://web.dev/articles/vitals
- Threshold methodology: https://web.dev/articles/defining-core-web-vitals-thresholds

## Next.js 16

- Docs: https://nextjs.org/docs
- `robots`: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots
- `sitemap`: https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap
- `generateStaticParams`: https://nextjs.org/docs/app/api-reference/functions/generate-static-params
- `revalidateTag`: https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- `revalidatePath`: https://nextjs.org/docs/app/api-reference/functions/revalidatePath

## SEO tooling

- Screaming Frog: https://www.screamingfrog.co.uk/seo-spider/pricing/
- Semrush: https://www.semrush.com/pricing/seo-ai-search/
- Ahrefs: https://ahrefs.com/pricing

---

# 250. FINAL RECOMMENDATION

Name Atlas should treat programmatic SEO as:

```text
publication of a knowledge graph
```

not:

```text
automated copywriting at scale.
```

The organic moat will not come from generating more paragraphs than existing surname sites.

It comes from publishing a page that can credibly answer:

```text
How common is this surname?
What does the best evidence say it may mean?
Where is it actually recorded?
What source and date support that?
What remains uncertain?
What historical traces exist?
```

with one coherent identity and clear provenance.

The scalable architecture is therefore:

```text
CANONICAL SURNAME
↓
EVIDENCE
↓
CLAIMS
↓
PUBLIC PROFILE
↓
SEO ELIGIBILITY
↓
SEO PROJECTION
↓
INDEX
```

not:

```text
KEYWORD
↓
PAGE TEMPLATE
↓
AI TEXT
↓
INDEX
```

The strongest SEO advantage is the same advantage that protects the rest of Name Atlas:

> **Evidence before narrative.**

For SEO specifically:

> **Qualification before indexation.**

And for programmatic growth:

> **Scale pages only after the system has something genuinely different and useful to say.**
