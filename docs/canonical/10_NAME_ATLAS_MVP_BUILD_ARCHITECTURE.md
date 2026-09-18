# NAME ATLAS — MVP BUILD ARCHITECTURE

**Document:** 10. MVP Build Architecture  
**Version:** 1.0.0 — Architecture Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Purpose:** Master blueprint converting Name Atlas research into a buildable surname-level MVP  
**Status:** Candidate for approval before detailed specs 11–17

---

# 0. HOW TO READ THIS DOCUMENT

This document consolidates the existing Name Atlas product, UX, IA, visual, source, monetisation and prompt research into one implementation direction.

It deliberately does **not** attempt to replace the detailed follow-up specifications for the canonical data model, source connectors, surname resolution, Evidence Engine, runtime orchestration, API contracts or regression corpus.

Four labels are used where the distinction matters:

- **SOURCE-DERIVED** — decision or constraint already established in the supplied Name Atlas project documents.
- **CURRENTLY VERIFIED** — a time-sensitive public fact rechecked on 2026-09-17.
- **ARCHITECTURAL RECOMMENDATION** — the implementation direction selected in this document.
- **OPEN QUESTION / BLOCKER** — cannot yet be treated as production-ready.

## Current verification snapshot

The following material facts were rechecked because they materially affect MVP architecture:

1. **CURRENTLY VERIFIED — PESEL surname data:** Poland's open-data portal contains surname resources updated in January 2026, including a resource dated 2026-01-20. The public surname dataset is updated annually. The verified modern open resource supports surname occurrence data, but this review does not establish current voivodeship/powiat/gmina surname distribution as part of the 2026 open resource.
2. **CURRENTLY VERIFIED — IJP PAN geography:** IJP PAN's ISNP documentation states that its frequency data use PESEL data from **2014** and that its surname geography contains voivodeship, powiat and gmina information. Therefore this geography must not be presented as a 2026 regional distribution.
3. **CURRENTLY VERIFIED — TERYT:** GUS states that TERYT ws1 is available to commercial entities and that the service/data are free of charge.
4. **CURRENTLY VERIFIED — GUS geocoder:** GUS permits commercial and non-commercial use free of charge with source attribution.
5. **CURRENTLY VERIFIED — FamilySearch:** Production/Beta API access requires compatibility review; software intended for commercial distribution should be compatible through the approved developer route.

Relevant public references:

- https://dane.gov.pl/pl/dataset/1681%2Cnazwis
- https://dane.gov.pl/pl/dataset/568/resource/1148813%2Cnazwiska-meskie-stan-na-2025-01-20/chart
- https://nazwiska.ijppan.pl/info/oslowniku
- https://api.stat.gov.pl/Home/TerytApi?lang=en
- https://geo.stat.gov.pl/api/fts/
- https://developers.familysearch.org/main/docs/compatibility-review-process

The commercial right to bulk-ingest, cache and redistribute IJP PAN's onomastic content remains **UNCONFIRMED** in this architecture and requires direct agreement/legal review.

---

# 1. EXECUTIVE BUILD SUMMARY

## 1.1 What Name Atlas MVP technically is

Name Atlas MVP is a **rights-aware surname intelligence and historical evidence product**.

A user supplies a surname. The system resolves that surname into a canonical entity, retrieves approved evidence from multiple data sources, normalises the evidence, derives or synthesises narrowly scoped claims, attaches provenance and confidence, evaluates data coverage, and then renders only the parts of the experience that the evidence can support.

The core architecture is therefore not:

```text
SURNAME
   ↓
LLM
   ↓
STORY
```

It is:

```text
SURNAME INPUT
      ↓
SURNAME RESOLUTION
      ↓
APPROVED SOURCE RETRIEVAL
      ↓
NORMALISATION
      ↓
EVIDENCE OBJECTS
      ↓
CLAIMS
      ↓
CONFIDENCE + RIGHTS + QA
      ↓
COVERAGE ASSESSMENT
      ↓
DISCOVERY INDEX
      ↓
FREE EXPERIENCE
      ↓
PREMIUM ELIGIBILITY
      ↓
PREMIUM SURNAME REPORT
```

## 1.2 Architecture thesis

The central product asset is the **Name Atlas Evidence Graph / evidence layer**, not generated prose.

The architecture must preserve a hard separation between:

```text
RESEARCH TRUTH
    ↓
PRODUCT PRESENTATION
```

Research truth is represented by structured objects such as:

```text
Source
EvidenceItem
Claim
ConfidenceAssessment
RightsProfile
CoverageAssessment
DiscoveryIndex
```

The UI, reports, SEO content and paywall consume those objects. They do not invent new discoveries.

## 1.3 What the MVP is not

The MVP is **not**:

- an autonomous genealogy engine;
- a family-tree builder;
- a person-search/background-check product;
- an ancestor-identification engine;
- a DNA product;
- a heraldry entitlement service;
- an LLM-generated surname encyclopedia;
- a scraper of public genealogy sites;
- a universal eight-chapter report regardless of data quality.

## 1.4 Minimum credible product

A credible first release must be able to take a surname and produce a traceable result containing as much of the following as the available evidence supports:

- canonical surname identity;
- current national occurrence count;
- rank / rarity context when methodologically valid;
- present-day regional geography **only where a lawful, appropriately dated source exists**;
- sourced meaning / etymology when evidence is available;
- probable linguistic and/or geographic origin with qualitative confidence;
- at least one genuine historical dimension where available, such as an attested spelling, dated occurrence or historical place;
- visible source provenance;
- explicit limitations;
- dynamic coverage state;
- a truthful Discovery Index;
- premium availability only where enough additional historical depth exists.

## 1.5 Largest dependencies

The MVP has three critical external/data dependencies.

### Dependency A — current regional surname geography

The UX treats geography as a major emotional moment, but the currently verified open PESEL surname data does not establish current regional surname counts. IJP PAN has region-level geography, but its own documentation identifies the underlying frequency dataset as PESEL 2014.

**Consequence:** current regional map is **conditional**, not a launch assumption.

### Dependency B — production-grade Polish onomastics

IJP PAN is the strongest identified candidate for Polish surname etymology, morphology, historical forms and surname geography, but commercial ingestion/reuse rights have not been established.

**Consequence:** either secure an agreement, assemble an alternative lawful scholarly source stack, or allow `INSUFFICIENT_DATA` for etymology. The LLM cannot fill the gap.

### Dependency C — enough historical depth for a paid report

Premium only works when validated historical material exists. The system must be able to suppress the paywall when premium coverage is inadequate.

## 1.6 What must work before public launch

At minimum:

1. canonical surname resolution;
2. approved Source Registry;
3. Rights Registry / rights gate;
4. current national surname count pipeline;
5. at least one historical evidence pipeline;
6. structured Claim + Evidence model;
7. qualitative confidence model;
8. CoverageAssessment;
9. DiscoveryIndex;
10. deterministic + LLM QA gates;
11. low-data / no-data paths;
12. a regression corpus covering common, rare, conflicting, foreign and zero-data cases;
13. premium suppression when evidence is insufficient;
14. source-visible free result;
15. transaction flow only after report eligibility is proven.

---

# 2. MVP CONTRACT

The MVP contract below is the canonical product boundary for engineering. A feature can exist in previous UX documents and still remain conditional or outside MVP if the evidence layer cannot support it.

## 2.1 IN MVP

| Area | User receives | Minimum data requirement | MVP status |
|---|---|---|---|
| Search | Surname input and resolution | Valid Unicode input + surname resolver | **Mandatory** |
| Name identity | Canonical/display surname, preserved original input | Resolved surname entity | **Mandatory** |
| Current count | Current national occurrence count with dataset date/scope | Approved current surname dataset | **Mandatory where surname exists** |
| Rarity / context | 1-in-X and/or percentile/rank when defensible | Valid numerator + compatible denominator/universe | **Conditional but expected** |
| Current geography | Regional distribution/map with source date | Lawful regional surname dataset | **Conditional** |
| Meaning / etymology | Sourced concise interpretation | Suitable onomastic evidence | **Conditional core capability** |
| Linguistic origin | Probable language/formation interpretation | Evidence-backed analysis | **Conditional core capability** |
| Geographic origin | One or more surname-level origin hypotheses | Place + linguistic/historical evidence | **Conditional** |
| Confidence | VERIFIED / LIKELY / POSSIBLE / UNCONFIRMED / CONFLICTING / INSUFFICIENT_DATA | Claim + evidence | **Mandatory for interpretive claims** |
| Sources | Source and evidence access for free claims | Citation/provenance object | **Mandatory** |
| Historical clue | 1–2 attested variants, dated occurrence or historical place | Historical evidence | **Conditional, strongly preferred** |
| Low-data flow | Honest partial result | Gap/Coverage assessment | **Mandatory** |
| Discovery Index | Real counts of validated deeper findings | Deduplicated validated objects | **Mandatory before premium** |
| Premium eligibility | Yes/no decision based on coverage | Coverage + DiscoveryIndex + rights | **Mandatory** |
| Premium report | Deeper surname-level synthesis | Minimum report quality threshold met | **Conditional sale** |
| Report preview | Actual available chapters/findings | Premium-eligible DiscoveryIndex | **Mandatory when premium offered** |
| Checkout | One-time guest purchase | Valid Offer + eligible report | **Mandatory for paid MVP** |
| Purchase access | Immediate report access / recovery path | Successful entitlement | **Mandatory** |
| Share | At least one source-safe share artifact | Free validated facts | **Should have; not launch-blocking if needed** |
| SEO | Canonical surname profile for qualified entities | Resolved entity + enough sourced unique content | **MVP acquisition layer** |
| Analytics | Search, result, discovery, premium and transaction events | Privacy-safe event model | **Mandatory** |
| Internal review | Inspect failed/high-risk cases, claims and sources | Internal tooling or minimally viable admin view | **Mandatory operational capability, may start simple** |

## 2.2 Free product promise

The free product must answer the first user question meaningfully. It cannot be a fake scan followed by a lock.

For a sufficiently covered surname, the target free experience is:

```text
CURRENT EXISTENCE / COUNT
+ RARITY CONTEXT
+ CURRENT GEOGRAPHY if supported
+ BASIC ORIGIN / MEANING if supported
+ CONFIDENCE / SOURCES
+ ONE GENUINE HISTORICAL DIMENSION if supported
```

If an expected element is unsupported, the product explicitly says so and compresses the experience rather than manufacturing a replacement.

## 2.3 Premium contract

Premium sells **depth and synthesis**, not the answer that the landing page promised for free.

A premium Name Atlas report may include, when supported:

- expanded historical variants;
- variant chronology;
- historical occurrences;
- historical places;
- source-attested historical layers;
- archive reference index;
- deeper comparison of origin hypotheses;
- diaspora evidence;
- surname-level geographic change;
- migration clues only when evidence supports that framing;
- full source/methodology appendix.

A premium report does **not** automatically imply anything about the user's specific family.

## 2.4 MVP NON-GOALS

The following are explicitly outside the surname-level MVP:

1. automatic ancestor identification;
2. confirmed family relationships;
3. autonomous family tree construction;
4. DNA ingestion or interpretation;
5. guaranteed family migration routes;
6. “your coat of arms” claims from surname alone;
7. verified noble descent;
8. broad living-person discovery;
9. full person-resolution across genealogy databases;
10. autonomous Deep Family Research;
11. automatic FamilySearch/PTG/Ancestry/MyHeritage record ingestion without approved integration/licence;
12. scraping sources whose terms prohibit or do not clearly allow the intended automation/commercial use;
13. full global country coverage at launch;
14. animated historical maps where data do not support comparable time layers;
15. a subscription model for a static surname report;
16. a complex multi-tier pricing table on the first purchase.

Family Origin, person-level matching and human-verified genealogy remain architectural extension points, not MVP deliverables.

---

# 3. CANONICAL MVP USER FLOW

## 3.1 Default homepage flow

The canonical default first-session flow is:

```text
01 SEARCH
   ↓
02 SURNAME RESOLUTION
   ↓
03 CONDITIONAL REAL ANALYSIS STATE
   ↓
04 POPULATION / CURRENT EXISTENCE
   ↓
05 CURRENT MAP — IF CURRENT/LAWFUL REGIONAL DATA EXISTS
   ↓
06 RARITY / 1-IN-X / RANK CONTEXT
   ↓
07 ORIGIN + CONFIDENCE
   ↓
08 MEANING + SOURCES
   ↓
09 FIRST HISTORICAL CLUE
   ↓
10 OPTIONAL SHARE
   ↓
11 DISCOVERY INDEX
   ↓
12 REPORT SCOPE / PREVIEW — ONLY IF PREMIUM ELIGIBLE
   ↓
13 OFFER / PAYWALL
   ↓
14 GUEST CHECKOUT
   ↓
15 PREMIUM SURNAME REPORT
```

If no current regional geography exists:

```text
POPULATION
↓
RARITY
↓
ORIGIN / MEANING
↓
HISTORY
```

The flow does **not** insert a fake or outdated current map merely to preserve the originally designed screen sequence.

## 3.2 Flow contract by stage

| Stage | Required data | Optional data | Skip/fallback | Main dependency |
|---|---|---|---|---|
| Search | Raw surname | Locale/script hint | Validation | Surname resolver |
| Resolution | Resolved entity or candidates | Known variants | Ask user / exact-as-entered search | NameForm graph |
| Analysis state | Actual backend work state | Stage progress | No loader under fast response | Runtime state |
| Population | Current count + data date/scope | Gender split | Skip if unavailable | PESEL/current source |
| Map | Current regional counts + boundary mapping | Concentration metric | Omit; show national context only | Regional surname source + Place graph |
| Rarity | Valid population universe | Rank, percentile | Rank-only or omit | Derived statistic |
| Origin | Evidence-backed hypothesis | Multiple hypotheses | `INSUFFICIENT_DATA` / conflicting view | Onomastic + place evidence |
| Meaning | Sourced interpretation | Root/morphology | No reliable etymology message | Onomastic evidence |
| History | At least one attested historical object | Variants, places, occurrences | Compress/omit history | Historical corpora |
| Share | Validated free facts | Map/origin variant | Omit | Presentation layer |
| Discovery Index | Validated deeper inventory | Confidence mix | If empty, no premium path | DiscoveryIndex |
| Report preview | Premium eligibility | Cover | No offer | Coverage engine |
| Offer | Offer config + entitlement rules | Price experiment | Return to free result | Offer service |
| Checkout | Eligible product | Wallet methods | Standard failure handling | Payment provider |
| Premium report | Paid entitlement + validated research | Dynamic chapters | Graceful missing section if predeclared rules allow | Report engine |

## 3.3 Intent-aware entry rule

The project research correctly identifies that users can arrive with explicit intent such as “meaning of X”, “map of X” or “how rare is X”. This does **not** require separate data models or duplicated surname pages.

Canonical architecture:

```text
ONE SURNAME ENTITY
ONE EVIDENCE PROFILE
ONE CANONICAL PUBLIC PROFILE
MULTIPLE ENTRY STATES / DEEP LINKS
```

Examples:

- `meaning` query → land near Meaning after entity header/quick proof;
- `map` query → land near Geography if that module is eligible;
- `rarity` query → land near count/rarity;
- generic homepage search → use the canonical discovery order above.

The backend research object remains the same.

---

# 4. ARCHITECTURE DECISION LOG

## AD-001 — Default discovery order

### Decision

Use:

```text
Population → Map (if valid) → Rarity → Origin → Meaning → History
```

### Why

- Population is the fastest hard credibility anchor.
- The current map, when genuinely available, is the strongest spatial/emotional transition.
- Rarity then contextualises the number without making a proprietary “score” the product's first identity claim.
- Interpretive material follows hard data.
- The latest mobile wireflow already converges on this order.

### Exception

For intent-specific SEO entry pages, the requested chapter may be surfaced earlier, but the source/confidence contract does not change.

### Impact

Frontend composition uses an adaptive ordered chapter list rather than hard-coded screen numbers.

### Follow-up spec

`16_NAME_ATLAS_API_FRONTEND_DATA_CONTRACT.md`

---

## AD-002 — Rarity representation

### Decision

Canonical MVP priority:

1. **1 in X** — primary consumer-friendly context when denominator is compatible;
2. **percentile** — secondary when methodology is fully defined;
3. **rank** — secondary/alternative when the comparison universe is clear.

Do **not** lead with a proprietary `87/100` rarity score.

### Why

A 0–100 score looks authoritative even when it is merely transformed ranking. `1 in X`, percentile and rank are more explainable and auditable.

### Constraint

Never say “1 in X people in Poland” unless numerator and denominator refer to compatible populations and dates/scopes.

### Follow-up spec

`11_NAME_ATLAS_CANONICAL_DATA_MODEL.md` + analytics/methodology implementation.

---

## AD-003 — Confidence system

### Decision

Canonical user-facing states:

```text
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
```

No confidence percentage is shown unless a future model is empirically calibrated.

### Visual extension required

The existing visual system already defines Verified/Likely/Possible/Unconfirmed. It must be extended with:

- **CONFLICTING** — split/fork visual + label; never an alert-red “error”.
- **INSUFFICIENT_DATA** — neutral open/empty evidence symbol + explicit label.

### Follow-up spec

`14_NAME_ATLAS_EVIDENCE_CLAIM_ENGINE.md`

---

## AD-004 — SEO architecture

### Decision

MVP uses **one canonical surname profile per locale**, for example:

```text
/pl/nazwisko/{slug}
/en/surname/{slug}
```

with semantic/deep-link sections:

```text
#today
#map
#meaning
#origin
#history
#sources
```

Do not launch separate indexable `/meaning/`, `/origin/`, `/map/`, `/history/` pages for every surname.

### Why

This avoids thin-content multiplication, duplication, crawl explosion and keyword cannibalisation while preserving intent-aware entry states.

### Later rule

Dedicated subpages are created only when a module has enough unique, sourced material and independent search value to pass content qualification.

### Follow-up spec

Dedicated SEO architecture after the core data pipeline is stable.

---

## AD-005 — Price is configuration, not content

### Decision

No production UI component may hardcode `29 PLN` as the definition of Name Atlas Premium.

Commercial presentation consumes an `Offer` object containing at minimum:

```text
offer_id
product_type
currency
amount
market
experiment_variant
eligibility
one_time_or_recurring
```

### Initial experiment

29 PLN can remain the control hypothesis and 49 PLN a candidate experiment, but this is commercial configuration rather than product architecture.

### Follow-up spec

Payments / entitlements after specs 11–17.

---

## AD-006 — Current map is conditional

### Decision

The frontend must not assume a current map exists.

A geography module has a temporal/source status such as:

```text
CURRENT_VERIFIED
HISTORICAL_SNAPSHOT
PARTIAL
UNAVAILABLE
```

If only 2014 regional data are licensed, the UI may present it explicitly as a historical/dated snapshot. It may not be labelled “where the surname lives today”.

---

## AD-007 — Optional family-region question is not core surname MVP

### Decision

The optional family-region question remains feature-flagged / post-core rather than a required step in the first surname MVP.

### Why

It becomes valuable only if the backend can use the answer to re-rank evidence meaningfully. Otherwise it adds privacy/friction without research value.

---

# 5. DATA FEASIBILITY & MVP REALITY CHECK

## 5.1 Capability matrix

| Capability | Data needed | Current source status | Rights/readiness | MVP decision | Fallback |
|---|---|---|---|---|---|
| Current national count | Current surname occurrence dataset | PESEL/open-data resources updated 2026 | Strong open-data candidate; canonical resource scope must be fixed in Spec 12 | **READY IN PRINCIPLE** | State dataset scope/date |
| Rank | Full comparison list from same dataset | PESEL surname dataset | Derived | **READY** | Omit if source universe incomplete |
| 1-in-X | Surname count + compatible total population denominator | Count available; denominator selection required | Derived | **READY AFTER METHODOLOGY** | Show count + rank only |
| Percentile | Full distribution across surname entities | Computable from canonical dataset | Derived | **READY AFTER METHODOLOGY** | Omit |
| Current regional map | Current surname counts by region | **Not established from current open PESEL source** | **BLOCKER** | **CONDITIONAL** | Omit map or show clearly dated historical snapshot |
| Meaning / etymology | Specialist onomastic evidence | IJP PAN strong candidate; alternative scholarly/public-domain sources possible | Commercial bulk reuse of IJP PAN unconfirmed | **BLOCKER / CONDITIONAL** | Evidence-backed alternative stack or `INSUFFICIENT_DATA` |
| Linguistic origin | Etymology, morphology, historical forms | Depends on onomastic source stack | Conditional | **CONDITIONAL CORE** | Present multiple hypotheses / insufficient data |
| Geographic origin | Historical place/linguistic evidence | Can be synthesised from lawful evidence | Interpretation, not raw fact | **CONDITIONAL** | No single origin claim |
| Surname type | Onomastic classification evidence | Same dependency as etymology | Conditional | **CONDITIONAL** | Omit |
| Historical variants | Source-attested spellings | Polona/FBC/Europeana/open historical sources; IJP PAN if licensed | Viable with per-object rights checks | **MVP HISTORICAL CORE** | Search candidates remain internal only |
| Historical occurrences | Dated source hits | Polona/digital libraries/open corpora | Viable rights-filtered | **MVP HISTORICAL CORE** | No-history state |
| Historical places | Occurrence + place resolution | TERYT/GUS + GeoNames/Getty/Wikidata + occurrence evidence | Good open infrastructure | **MVP** | Place unresolved → review/omit |
| Historical map | Enough dated occurrences with comparable scope | Derived from historical evidence, not national census equivalent | Coverage-sensitive | **PREMIUM CONDITIONAL** | Occurrence map / timeline rather than distribution claim |
| Migration clues | Multiple temporal/geographic evidence points | Possible later | High inference risk | **NOT CORE MVP** | “distribution differs across periods” only when supported |
| Archive references | Searchable lawful collection metadata | Polona/FBC/Europeana and later SwA/partners | Source-specific rights | **PREMIUM CONDITIONAL** | Show collection/source types only |

## 5.2 Critical blocker — current Polish surname map

### Current fact

The project needs to distinguish four concepts:

```text
CURRENT NATIONAL COUNT
≠
CURRENT REGIONAL DISTRIBUTION
≠
OLDER REGIONAL DISTRIBUTION
≠
HISTORICAL OCCURRENCE MAP
```

They must never be collapsed into one “surname map”.

### Preferred solution

Secure a lawful dataset/licence with appropriately current surname counts at voivodeship/powiat or equivalent level.

### Acceptable fallback A

License/use the older regional dataset and label it with its actual snapshot date, e.g.:

> Regional distribution in the 2014 PESEL snapshot.

### Acceptable fallback B

Remove modern regional distribution from the first MVP. Preserve:

```text
Current national count
→ rarity
→ origin/meaning
→ historical evidence
```

### Forbidden fallback

Do not distribute the current national total across regions using old proportions and present the result as current fact.

## 5.3 Critical blocker — Polish etymology / onomastics

### Preferred solution

Commercial partnership/licence with IJP PAN or another specialist onomastic rights holder.

### Fallback

Construct claim-by-claim evidence from lawful scholarly/public-domain sources and only generate interpretations that are traceable to them.

### Valid product outcome

```text
INSUFFICIENT_DATA
```

is better than a plausible LLM etymology.

### Forbidden fallback

Never infer definitive origin from modern spelling resemblance alone.

---

# 6. HIGH-LEVEL SYSTEM ARCHITECTURE

## 6.1 Recommended MVP topology

**ARCHITECTURAL RECOMMENDATION:** build a **modular monolith with asynchronous workers**, not microservices.

Reasons:

- one small team can evolve domain objects rapidly;
- evidence, rights and report generation need transactional consistency;
- search volume at MVP does not justify service fragmentation;
- Python has strong tooling for data processing, NLP, OCR support and structured AI workflows;
- PostgreSQL can cover relational, JSON, full-text, trigram and geospatial needs at MVP scale.

## 6.2 Suggested stack

| Layer | Recommendation | Why |
|---|---|---|
| Web frontend | Next.js / React | SSR/SEO + interactive discovery UI |
| Application/API | FastAPI + Pydantic | Strong typed contracts and Python data/AI ecosystem |
| Primary database | PostgreSQL | Canonical entities, evidence, claims, commerce metadata |
| Geography | PostGIS | Places, regions, historical/current geometries |
| Fuzzy surname search | `pg_trgm` + deterministic normalization | Avoid dedicated search infra initially |
| Text search | PostgreSQL FTS initially | Historical metadata and internal admin search |
| Background jobs | Simple queue/worker layer | Ingestion, historical retrieval, report generation |
| Cache | Redis or equivalent where needed | Research/run/profile caches; not source of truth |
| Object storage | S3-compatible | Source artifacts allowed by rights, report exports, intermediate files |
| LLM | Provider adapter + versioned prompts | Replaceable models, structured outputs, cost/quality control |
| Analytics | Privacy-safe event pipeline | Product/quality measurement |
| Payments | Provider abstraction | One-time report purchase; provider selected in later spec |
| Email | Transactional provider | Report delivery/recovery only where needed |

A dedicated vector database, graph database, workflow platform and microservice mesh are **not required for MVP**. The evidence graph can initially be represented relationally in PostgreSQL and evolved later if graph traversal becomes a demonstrated bottleneck.

## 6.3 Component diagram

```text
┌────────────────────────────┐
│       NEXT.JS CLIENT       │
│ Search / Result / Report   │
└──────────────┬─────────────┘
               │
               ▼
┌────────────────────────────┐
│       FASTAPI APP/API      │
│ auth-lite / result / offer │
└──────────────┬─────────────┘
               │
       ┌───────┴────────┐
       ▼                ▼
┌───────────────┐  ┌──────────────────┐
│ Research      │  │ Commerce / Report│
│ Orchestrator  │  │ Access           │
└──────┬────────┘  └────────┬─────────┘
       │                    │
       ▼                    ▼
┌────────────────────────────────────┐
│         DOMAIN / TRUST LAYER       │
│ Surname · Evidence · Claim ·       │
│ Rights · Confidence · Coverage ·   │
│ DiscoveryIndex · Report            │
└────────────────┬───────────────────┘
                 │
                 ▼
┌────────────────────────────────────┐
│      POSTGRESQL + POSTGIS          │
└────────────────┬───────────────────┘
                 │
        ┌────────┴────────┐
        ▼                 ▼
┌───────────────┐   ┌───────────────┐
│ Async Workers │   │ Object Storage│
└──────┬────────┘   └───────────────┘
       │
       ▼
┌────────────────────────────────────┐
│ APPROVED SOURCE CONNECTORS         │
│ PESEL · TERYT · GUS · Polona ...  │
└────────────────────────────────────┘
```

## 6.4 Important implementation boundary

The frontend receives **validated presentation objects**, not raw evidence and not arbitrary LLM prose.

The report generator receives **validated claims**, not raw web results.

The paywall receives **DiscoveryIndex**, not an instruction to “make the product look valuable”.

---

# 7. CANONICAL OBJECT INVENTORY

This is the minimum object vocabulary. Detailed schemas belong in Document 11.

| Object | Definition / purpose | Main relationships | Scope | MVP? |
|---|---|---|---|---|
| `Surname` | Canonical surname entity | has `NameForm`, claims, profiles | surname | **Yes** |
| `NameForm` | Exact modern/historical/transliterated/search form with type | belongs to Surname; appears in evidence | surname | **Yes** |
| `SurnameResolution` | Result of resolving raw user input | input → Surname / candidates | query | **Yes** |
| `DistributionSnapshot` | Count/distribution for dataset + date + geography level | Surname + Place + Source | surname | **Yes** |
| `Place` | Current canonical geographic entity | aliases, geometries, external IDs | shared | **Yes** |
| `HistoricalPlace` | Time-aware name/admin context around a Place | Place + period + sources | shared | **Yes** |
| `OriginHypothesis` | Competing sourced linguistic/geographic origin interpretation | Claim/Evidence/Place | surname | **Yes** |
| `MeaningInterpretation` | Sourced lexical/formation interpretation | OriginHypothesis + evidence | surname | **Yes if available** |
| `HistoricalVariant` | Source-attested surname form | NameForm + occurrence + source | surname | **Yes** |
| `HistoricalOccurrence` | Surname/form recorded at time/place/source | NameForm + Place + Source | surname | **Yes** |
| `ArchiveReference` | Reference to collection/item/index relevant at surname level | Source + occurrence | surname | **Conditional** |
| `MigrationPattern` | Evidence-based surname-level geographic pattern | Places + periods + claims | surname | Later/conditional |
| `Source` | Provider/collection/dataset identity | RightsProfile + records | shared | **Yes** |
| `RightsProfile` | Terms/licence/automation/commercial-use state | Source and optionally item | shared | **Yes** |
| `SourceRecord` | Raw/normalised retrieved source object | Source → EvidenceItem | shared | **Yes** |
| `EvidenceItem` | Atomic support/contradiction for a claim | SourceRecord + Claim | any | **Yes** |
| `Claim` | Central user-meaningful proposition | subject + evidence + confidence | surname initially | **Yes** |
| `ConfidenceAssessment` | Qualitative evidential state of a claim | Claim + evidence | any | **Yes** |
| `Citation` | User/audit-facing provenance reference | Source + locator | any | **Yes** |
| `DataGapAssessment` | Known/interpretable/missing/not-claimable matrix | Profile + source coverage | query/profile | **Yes** |
| `CoverageAssessment` | Product-level strength/availability by dimension | validated objects | surname | **Yes** |
| `DiscoveryIndex` | Canonical validated inventory of deeper findings | coverage + objects | surname | **Yes** |
| `ResearchRun` | Auditable execution instance | query, connectors, prompts, outputs | internal | **Yes** |
| `SurnameProfile` | Aggregated validated surname knowledge state | claims + modules + coverage | surname | **Yes** |
| `Report` | Curated presentation of validated objects | ReportSection + citations | surname | **Yes** |
| `ReportSection` | Dynamic chapter generated only if eligible | claims + assets | surname | **Yes** |
| `Offer` | Market/config-specific purchasable product | report eligibility + price | commerce | **Yes** |
| `Entitlement` | Permission to access purchased report/product | Order/User/session/report | commerce | **Yes** |
| `FamilyPerson` | Private person supplied/researched later | Family branch/records | family | **Later** |
| `PersonCandidate` | Possible identity match to a family person | records/evidence | person | **Later** |
| `AncestorRelationship` | Relationship requiring person-level linkage evidence | persons/evidence | family/person | **Later** |

## 7.1 Scope boundary must exist in data, not only copy

Objects and claims carry a scope such as:

```text
surname_level
family_level
person_level
```

A surname-level object cannot silently become person/family evidence downstream.

---

# 8. HIGH-LEVEL SOURCE ARCHITECTURE

## 8.1 MVP OPEN / SAFE SOURCE LAYER

The following are the strongest identified early-production candidates, subject to connector-level rights validation in Document 12.

| Source | Product role | Access / current status | Commercial status | MVP role |
|---|---|---|---|---|
| PESEL / dane.gov.pl | Current national surname occurrence/count data | Download/API resources | Open public-data candidate | **Core** |
| TERYT | Canonical Polish territorial/place IDs and historical/current admin lookup | GUS web service | Verified free for commercial entities | **Core** |
| GUS geocoder | Polish geocoding/identification | REST/JSON | Verified free commercial/non-commercial with attribution | **Core** |
| Wikidata | Entity/alias linking | API/SPARQL/dumps | CC0 structured data | Supporting |
| GeoNames | Global place names/aliases | API/dumps | CC BY | Supporting/global-ready |
| Getty TGN | Historical place names/types/provenance | Linked Open Data/download | ODC-By per project research | **Historical place support** |
| Polona | Books/newspapers/directories/OCR/IIIF | Programmatic discovery | Item rights vary | **Core historical evidence candidate** |
| FBC | Polish digital-library aggregation metadata | OAI-PMH/OpenSearch per project research | Object rights vary | Historical discovery |
| Europeana | European cultural-heritage metadata | API | Metadata open; object rights per item | Historical discovery |
| OpenHistoricalMap | Time-aware geographic support | API/download | Element/source rights require validation | Later/conditional map support |

## 8.2 PARTNERSHIP / AGREEMENT LAYER

| Source | Value | Status | Architecture treatment |
|---|---|---|---|
| IJP PAN / ISNP | Top Polish etymology, morphology, variants, historical notes, regional geography | **Commercial ingestion rights unconfirmed** | High-priority partnership; do not silently ingest into paid product |
| PTG / Geneteka / Skanoteka / Metryki | Extremely valuable person-level and archival indexes | Commercial/bulk reuse requires explicit clarification/agreement | Later partnership, especially Family Origin/Deep Research |
| FamilySearch | Global person/place/record ecosystem | Approved developer route; compatibility review required | Later person-level integration |
| JRI-Poland | Polish Jewish genealogy indexes | Permission required for commercial/professional use per project research | Later targeted partnership |
| IPN / specialist record providers | High-value historical person data | Access/reuse requires case-specific review | Later |
| JewishGen | Person/place/genealogy | Commercial automation unresolved | Later partnership |

## 8.3 RESTRICTED / DO-NOT-SCRAPE LAYER

Without appropriate written permission or partner access, do not build production scrapers against:

- Ancestry;
- MyHeritage;
- Findmypast;
- Geneanet;
- GenBaza automated mass access;
- Grobonet bulk commercial data;
- non-commercial licensed scan collections where commercial report reuse is excluded;
- any source where database/automation/commercial rights remain unclear.

The connector registry has a hard state such as:

```text
APPROVED
PARTNERSHIP_REQUIRED
LEGAL_REVIEW_REQUIRED
BLOCKED
DEPRECATED
```

Only `APPROVED` sources participate automatically in production paid research.

---

# 9. EVIDENCE / RIGHTS / CONFIDENCE ARCHITECTURE

## 9.1 Core trust pipeline

```text
SOURCE
  ↓
SOURCE RECORD
  ↓
NORMALISED ENTITY / FACT
  ↓
EVIDENCE ITEM
  ↓
CLAIM
  ↓
CONFIDENCE ASSESSMENT
  ↓
RIGHTS ELIGIBILITY
  ↓
QA
  ↓
PRESENTATION
```

## 9.2 Why `Claim` is central

Every important user-visible proposition should be backed by a structured Claim.

Examples:

```text
“12,481 people carry this surname in the selected current dataset.”
“The surname is likely derived from a place-name.”
“A source from 1887 contains the spelling [VARIANT].”
“Two credible etymological interpretations exist.”
```

A Claim allows the product to answer:

- what exactly are we asserting?
- about what entity?
- at what scope?
- which evidence supports it?
- what contradicts it?
- which sources produced the evidence?
- are those sources allowed on this surface?
- how confident are we?
- when was it evaluated?
- which pipeline/prompt/model generated the interpretation?

Without Claim objects, evidence can be correct while UI wording becomes too strong.

## 9.3 Supporting and contradicting evidence

The evidence model must permit:

```text
Claim
├── supporting_evidence[]
└── contradicting_evidence[]
```

Conflicting evidence is a valid research result, not an error to hide.

If two suitable sources disagree materially:

```text
confidence = CONFLICTING
```

The presentation layer compares the interpretations and explains the basis of each.

## 9.4 Rights gate

Rights are evaluated before an evidence item/asset becomes eligible for a product surface.

Conceptually:

```text
Source rights
+ Item rights when relevant
+ Target use
= surface eligibility
```

Possible consequences:

- metadata can be used but source image cannot;
- free citation allowed but paid redistribution blocked;
- research lead can be used internally but not reproduced;
- automated access blocked, requiring manual/partner workflow;
- legal review required before activation.

## 9.5 Confidence model

### VERIFIED

Direct suitable evidence supports the claim within its exact scope.

### LIKELY

Multiple strong signals converge, but interpretation is not directly proven.

### POSSIBLE

Plausible and partly supported, with material evidence still missing.

### UNCONFIRMED

Potential clue/lead that lacks sufficient corroboration.

### CONFLICTING

Credible evidence points to materially different conclusions.

### INSUFFICIENT_DATA

Available evidence does not justify the claim.

The visual system must always use **symbol + text**, not colour alone.

## 9.6 Hard scope rule

```text
SurnameOccurrence
≠
PersonCandidate
≠
ConfirmedPerson
≠
AncestorRelationship
```

A `SurnameOccurrence` can produce:

> “This surname appears in a Warsaw directory from 1931.”

It cannot produce:

> “Your ancestor lived in Warsaw in 1931.”

---

# 10. RUNTIME / DATA FLOW

## 10.1 Basic surname lookup chain

```text
SurnameQuery
    │
    ▼
[DETERMINISTIC]
Normalize raw Unicode input
    │
    ▼
[DETERMINISTIC + DB]
Resolve surname entity / candidate forms
    │
    ▼
[EXTERNAL DATA]
Retrieve approved current + historical evidence
    │
    ▼
[DETERMINISTIC]
Normalize records and preserve originals
    │
    ├───────────────┬───────────────────┐
    ▼               ▼                   ▼
Current data     Historical data     Place resolution
analysis         extraction          / linking
    │               │                   │
    └───────────────┴───────────────────┘
                    │
                    ▼
[LLM-SUPPORTED ONLY WHERE NEEDED]
Sourced onomastic / historical synthesis
                    │
                    ▼
[DETERMINISTIC + LLM-SUPPORTED]
Build structured Claims and evidence links
                    │
                    ▼
[QA / RULES]
Conflict + confidence classification
                    │
                    ▼
[RIGHTS]
Surface-use eligibility
                    │
                    ▼
[DETERMINISTIC]
DataGap + CoverageAssessment
                    │
                    ▼
[DETERMINISTIC]
DiscoveryIndex
                    │
                    ▼
[LLM-SUPPORTED PRESENTATION]
Free result / premium section prose
                    │
                    ▼
[QA]
Publishable presentation object
```

## 10.2 Deterministic tasks

Do not use an LLM for tasks that can be made auditable and deterministic:

- Unicode normalisation;
- canonical IDs;
- exact/fuzzy query mechanics;
- national counts;
- ranking mathematics;
- rarity calculations;
- rights-rule evaluation;
- deduplication keys;
- citation IDs;
- source freshness state;
- Coverage eligibility rules;
- DiscoveryIndex counts;
- schema validation.

## 10.3 LLM-supported tasks

LLM assistance is appropriate for:

- synthesising multiple approved scholarly explanations;
- explaining conflicts;
- classifying narrative structure after evidence exists;
- summarising a historical source while preserving cited facts;
- generating user-facing prose from structured Claims;
- report section drafting;
- localisation downstream of facts.

## 10.4 LLM-forbidden factual shortcuts

Without supplied evidence, the LLM may not create production facts about:

- surname etymology;
- historical variants;
- historical occurrences;
- exact origin location;
- migration routes;
- nobility/heraldry entitlement;
- individual ancestors;
- family relationships.

---

# 11. FIRST PRODUCTION VERTICAL SLICE

## 11.1 Goal

Do **not** begin by implementing the full polished discovery site.

Build the smallest end-to-end system that proves:

```text
SURNAME INPUT
↓
REAL APPROVED SOURCES
↓
NORMALISED OBJECTS
↓
EVIDENCE
↓
CLAIMS
↓
CONFIDENCE
↓
RIGHTS
↓
COVERAGE
↓
DISCOVERY INDEX
↓
JSON RESULT
```

## 11.2 First connector set

Recommended initial set:

### 1. PESEL / dane.gov.pl

Purpose:
- current national occurrence;
- rank universe;
- current dataset proof.

### 2. TERYT

Purpose:
- canonical Polish territorial/place IDs;
- current/historical administrative resolution support.

### 3. GUS geocoder

Purpose:
- resolve Polish place strings into structured geography;
- establish production geocoding conventions.

### 4. Polona

Purpose:
- first real historical surname occurrence pipeline;
- test OCR/metadata/citation/item-rights handling.

### 5. Getty TGN or equivalent historical-place source

Purpose:
- establish historical place aliases/context beyond modern TERYT.

FBC/Europeana can be the next source adapters once the evidence contract is stable.

## 11.3 Onomastic handling in the first slice

Do not block the evidence/data architecture on unresolved commercial onomastic rights.

The vertical slice should support both:

```text
origin_status = INSUFFICIENT_DATA
```

and a small number of surnames where lawful, traceable onomastic evidence is available.

This proves the correct failure mode before any partnership is complete.

## 11.4 First JSON result should demonstrate

At minimum:

```text
input
resolution
surname entity
source inventory
current national count
rank / rarity context if valid
historical occurrence(s)
historical variant(s) if attested
resolved place(s)
claims[]
confidence states
citations[]
rights eligibility
coverage dimensions
discovery index
limitations
premium_eligible
```

The exact fields are defined in Document 11.

## 11.5 Test surnames for the vertical slice

Start with a small deliberately diverse group rather than only attractive examples:

- one common Polish surname;
- one medium-frequency surname;
- one rare surname;
- one surname with Polish diacritics;
- one surname with known historical spelling variation;
- one foreign surname present in Poland;
- one surname with ambiguous/multiple origin evidence;
- one surname expected to produce little/no historical evidence;
- `Cichowski` as one real project test case.

Do not tune the pipeline only to `Cichowski`.

## 11.6 Do not build yet during the vertical slice

- checkout;
- elaborate report cover;
- complex map animations;
- Family Origin;
- person-level archive matching;
- full international expansion;
- custom graph database;
- separate search cluster;
- subscription;
- physical report/book generation.

---

# 12. IMPLEMENTATION SEQUENCE + NEXT SPECS

## 12.1 Canonical dependency order

The project should now move from broad research into specifications and code in this order:

```text
10 MVP BUILD ARCHITECTURE          ← this document
        ↓
11 CANONICAL DATA MODEL
        ↓
12 SOURCE CONNECTOR ARCHITECTURE
        ↓
13 SURNAME RESOLUTION ENGINE
        ↓
14 EVIDENCE & CLAIM ENGINE
        ↓
15 RUNTIME ORCHESTRATION
        ↓
16 API & FRONTEND DATA CONTRACT
        ↓
17 GOLDEN TEST CORPUS & QA
        ↓
FIRST END-TO-END VERTICAL SLICE
        ↓
FREE RESULT UI
        ↓
PREMIUM REPORT PIPELINE
        ↓
PAYMENT / ENTITLEMENTS
        ↓
ANALYTICS + SEO + LAUNCH HARDENING
```

## 12.2 Document 11 — Canonical Data Model

### Purpose

Turn the object inventory into production schemas and database relationships.

### Must define

- exact fields;
- IDs;
- enums;
- nullability;
- source/provenance links;
- scope;
- versioning;
- PostgreSQL representation;
- PostGIS needs;
- JSONB boundaries;
- indexes.

### Why first

Connectors, Evidence Engine and API contracts cannot be stable until the common object vocabulary is stable.

---

## 12.3 Document 12 — Source Connector Architecture

### Purpose

Define ingestion and rights behaviour source by source.

### Must define

- Source Registry;
- Rights Registry;
- PESEL adapter;
- TERYT/GUS adapters;
- Polona/FBC/Europeana adapters;
- caching/freshness;
- retries;
- raw storage;
- item rights;
- blocked/partner sources;
- licensing review workflow.

### Dependency

Consumes Document 11 schemas.

---

## 12.4 Document 13 — Surname Resolution Engine

### Purpose

Resolve user input safely into canonical surname entities and search forms.

### Must define

- Unicode handling;
- exact form matching;
- gender/form relations where appropriate;
- diacritics;
- transliteration;
- known variants;
- fuzzy candidates;
- search candidates vs attested variants;
- multiple-match UX states.

### Dependency

Uses canonical `Surname`, `NameForm`, `SurnameResolution` objects.

---

## 12.5 Document 14 — Evidence & Claim Engine

### Purpose

Create the core trust system.

### Must define

- evidence types;
- Claim schema/semantics;
- supporting vs contradicting evidence;
- confidence conditions;
- rights gate;
- conflict resolution;
- derived statistics;
- OCR evidence rules;
- surname/family/person scope protections;
- deterministic QA.

### Dependency

Needs Documents 11–13 and source-rights contracts.

---

## 12.6 Document 15 — Runtime Orchestration

### Purpose

Turn the research system into an executable workflow.

### Must define

- workflow DAG/state machine;
- parallelism;
- connector invocation;
- timeouts/retries;
- partial results;
- background jobs;
- caching;
- LLM routing;
- prompt versions;
- ResearchRun audit state;
- observability/cost controls.

### Dependency

Runs the canonical objects and Evidence Engine.

---

## 12.7 Document 16 — API & Frontend Data Contract

### Purpose

Define the stable boundary between research/backend and consumer UI.

### Must define

- result/profile endpoints;
- analysis state;
- partial/error states;
- adaptive chapter payloads;
- sources/confidence drawers;
- DiscoveryIndex payload;
- report eligibility;
- caching and public/private boundaries.

### Dependency

The API should expose the architecture, not invent it.

---

## 12.8 Document 17 — Golden Test Corpus & QA

### Purpose

Make quality measurable and regression-resistant.

### Must define

- common/rare/foreign/conflicting/zero-data fixtures;
- expected facts;
- acceptable hypotheses;
- forbidden claims;
- source requirements;
- coverage expectations;
- prompt regressions;
- deterministic hard-fail tests;
- end-to-end launch thresholds.

### Dependency

Tests the whole chain built by Documents 11–16.

---

# 13. BUILD THIS FIRST

The first implementation priorities are:

1. **Canonical schemas v1** — especially Surname, NameForm, Source, Evidence, Claim, RightsProfile, Confidence, Coverage, DiscoveryIndex.
2. **Source Registry + Rights Registry**.
3. **PESEL ingestion** with explicit dataset scope/date.
4. **Surname resolver v1** with Unicode and exact/controlled fuzzy behaviour.
5. **Place layer** using TERYT/GUS plus historical-place support.
6. **Polona historical-occurrence proof** with rights-aware citations.
7. **Evidence → Claim → Confidence pipeline**.
8. **CoverageAssessment + DataGapAssessment**.
9. **DiscoveryIndex** with deduplication and truthful counts.
10. **Golden regression fixtures + JSON vertical slice** before full UI implementation.

---

# 14. DO NOT BUILD YET

1. full person-level genealogy;
2. Family Origin purchase flow;
3. automated ancestor matching;
4. graph database migration;
5. complex historical map slider;
6. surname migration animation;
7. compare-surnames social product;
8. subscription billing;
9. physical books;
10. multi-country data ingestion beyond what is necessary to keep the architecture global-ready.

---

# 15. BLOCKERS TO RESOLVE NOW

## Blocker 1 — current regional surname geography

**Owner:** Data/Product  
**Action:** identify and secure lawful contemporary regional surname data, or formally remove “current regional map” from mandatory MVP scope.

## Blocker 2 — Polish etymology production rights

**Owner:** Partnerships/Legal/Product  
**Action:** contact IJP PAN about API/bulk/commercial derivative use, caching, attribution and report rights; simultaneously map lawful fallback scholarly sources.

## Blocker 3 — exact PESEL canonical resource and scope

**Owner:** Data  
**Action:** choose the production resource(s) for living/current surname counts and document whether records exclude single occurrences and/or include deceased people. Do not mix incompatible PESEL resources in one metric.

## Blocker 4 — historical corpus item-rights handling

**Owner:** Data/Legal  
**Action:** define how metadata, OCR text, page crops and original scans differ in surface eligibility for Polona/FBC/Europeana-type sources.

## Blocker 5 — paid report quality threshold

**Owner:** Product/Research  
**Action:** formalise the minimum CoverageAssessment required to make `premium_eligible=true`, using the existing research hypothesis as input but testing it against real surname results.

---

# 16. DEFINITION OF MVP READY

Name Atlas surname-level MVP is ready for public launch when:

```text
A USER CAN ENTER A SURNAME
        ↓
THE SYSTEM RESOLVES IT SAFELY
        ↓
APPROVED SOURCES RETURN REAL DATA
        ↓
RAW VALUES REMAIN TRACEABLE
        ↓
EVIDENCE PRODUCES SCOPED CLAIMS
        ↓
EVERY IMPORTANT INTERPRETATION HAS
CONFIDENCE + SOURCES + LIMITATIONS
        ↓
RIGHTS RULES CONTROL SURFACE ELIGIBILITY
        ↓
LOW-DATA / CONFLICT / PARTIAL STATES WORK
        ↓
COVERAGE CONTROLS WHICH CHAPTERS EXIST
        ↓
DISCOVERY INDEX CONTROLS PREMIUM PROMISES
        ↓
NO PAYWALL APPEARS FOR WEAK REPORTS
        ↓
PAID REPORTS CONTAIN THE DEPTH PREVIEWED
        ↓
THE REGRESSION CORPUS PASSES
        ↓
NO SURNAME-LEVEL RESULT CAN CLAIM A USER'S ANCESTOR
```

In practical terms, the launch criterion is **not** “all designed screens are implemented”.

It is:

> **The evidence system can reliably tell the consumer what is known, what is likely, what is uncertain, what is unavailable, and what additional research truly exists — and the UX faithfully renders that state.**

---

# 17. FINAL RECOMMENDED ARCHITECTURE

```text
                           NAME ATLAS
                               │
                               ▼
                        SURNAME INPUT
                               │
                               ▼
                       SURNAME RESOLVER
                               │
                               ▼
                    RESEARCH ORCHESTRATOR
                               │
       ┌───────────────────────┼────────────────────────┐
       ▼                       ▼                        ▼
 CURRENT DATA             ONOMASTIC DATA          HISTORICAL DATA
 PESEL                     licensed/sourced       Polona/FBC/etc.
       │                       │                        │
       └───────────────────────┼────────────────────────┘
                               ▼
                         NORMALISATION
                               │
                ┌──────────────┴──────────────┐
                ▼                             ▼
          SURNAME/FORM GRAPH             PLACE GRAPH
                │                             │
                └──────────────┬──────────────┘
                               ▼
                         EVIDENCE LAYER
                               │
                               ▼
                          CLAIM ENGINE
                               │
               ┌───────────────┼────────────────┐
               ▼               ▼                ▼
          CONFIDENCE         RIGHTS             QA
               └───────────────┼────────────────┘
                               ▼
                       DATA GAP / COVERAGE
                               │
                               ▼
                        DISCOVERY INDEX
                               │
                ┌──────────────┴───────────────┐
                ▼                              ▼
          FREE EXPERIENCE               PREMIUM ELIGIBILITY
                                               │
                                      ┌────────┴────────┐
                                      ▼                 ▼
                                  NO OFFER        REPORT PREVIEW
                                                        │
                                                        ▼
                                                     OFFER
                                                        │
                                                        ▼
                                                   CHECKOUT
                                                        │
                                                        ▼
                                              PREMIUM SURNAME REPORT
```

---

# 18. NEXT ACTION

The immediate next specification is:

# `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`

It should convert the object inventory in this blueprint into concrete production schemas, PostgreSQL/PostGIS entities, relationships, enums, provenance fields, lifecycle/version rules and indexes.

Do **not** proceed directly from this document to building the polished Name Atlas UI before the data model and Evidence/Source contracts are defined. The visual and UX work is sufficiently mature; the highest-leverage next step is now the production data foundation.

---

# APPENDIX A — PROJECT DOCUMENTS SYNTHESISED

This architecture was derived from the supplied Name Atlas project material, including:

- `name_atlas_discovery_flow_research_ux_playbook(1).md`
- `NAME_ATLAS_09_PROMPT_LIBRARY(1).md`
- `NAME_ATLAS_Information_Architecture_Blueprint(1).md`
- `NAME_ATLAS_MOBILE_WIREFLOW(1).md`
- `NAME_ATLAS_VISUAL_SYSTEM_v1(1).md`
- `name_atlas_user_intent_research(1)(1).md`
- `NAME_ATLAS_USER_INTENT_RESEARCH(2).md`
- `NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md`
- `NAME_ATLAS_PAYWALL_SYSTEM (1).md`
- `NAME_ATLAS_PAYWALL_SYSTEM(1).md`

The two Paywall uploads are treated as duplicate versions of the same workstream. The two User Intent files are treated as overlapping versions of the same research stream rather than independent evidence sets.

# APPENDIX B — ARCHITECTURAL PRINCIPLES TO CARRY INTO SPECS 11–17

1. Prose is downstream of structured evidence.
2. Source reliability and commercial permissibility are separate properties.
3. Source reliability and claim confidence are separate properties.
4. Claim confidence and person-identity confidence are separate properties.
5. Normalisation never destroys the original form.
6. Search candidates never automatically become historical variants.
7. `not retrieved` never means `does not exist`.
8. Current geography and historical geography require explicit dates/scopes.
9. No data is different from zero.
10. Conflicts are preserved, not averaged away.
11. Low-data surnames receive shorter experiences, not filler.
12. Basic sources for free claims remain inspectable.
13. DiscoveryIndex is the single truth source for premium discovery counts.
14. Family data is architecturally private and non-indexable when that layer is introduced.
15. Human review is an explicit future product capability, not a hidden failure.

