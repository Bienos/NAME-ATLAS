# NAME ATLAS — SOURCE CONNECTOR ARCHITECTURE

**Document:** 12. Source Connector Architecture  
**Version:** 1.0.0 — Connector Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`  
**Next:** `13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md`

---

# 0. PURPOSE AND AUTHORITY

This document defines the production architecture for acquiring external data into Name Atlas.

It is downstream from:

1. `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`;
2. `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`.

Those documents define **what the product is** and **what canonical objects exist**. This document defines **how external sources may lawfully and reliably feed those objects**.

The connector layer ends before final surname entity resolution and before Claim generation.

Its contract is:

```text
EXTERNAL SOURCE
      ↓
SOURCE REGISTRY
      ↓
RIGHTS REGISTRY
      ↓
CONNECTOR
      ↓
RAW INGEST
      ↓
VALIDATION
      ↓
SOURCE RECORD
      ↓
NORMALISED CANDIDATE FIELDS
      ↓
PROVENANCE + RIGHTS
      ↓
OUTPUT TO RESOLUTION / EVIDENCE LAYERS
```

The connector layer may retrieve, validate, normalise transport-level structure and produce source-backed candidate data.

It must **not**:

- invent etymology;
- decide that two surnames are the same entity;
- convert fuzzy similarity into a historical variant;
- infer a family relationship;
- turn OCR similarity into fact;
- silently reuse a source on a commercial surface when rights are unknown.

---

# 1. EXECUTIVE CONNECTOR ARCHITECTURE

## 1.1 Architecture thesis

Name Atlas should use a **registry-driven connector architecture** inside the modular monolith defined in Prompt 10.

Do not create one service per source.

For MVP:

```text
APPLICATION / WORKERS
        │
        ▼
CONNECTOR MANAGER
        │
        ├── SourceRegistry
        ├── RightsRegistry
        ├── CredentialStore
        ├── RateLimitManager
        ├── RawIngestStore
        └── Connector implementations
```

A connector is an adapter around an external provider.

Every connector must implement the same lifecycle:

```text
DISCOVER/FETCH
↓
PRESERVE RAW
↓
VALIDATE TRANSPORT
↓
VALIDATE SOURCE SCHEMA
↓
MAP TO SourceRecord
↓
ATTACH RIGHTS
↓
EMIT CANDIDATE FIELDS
↓
HAND OFF
```

## 1.2 Synchronous vs asynchronous

### Synchronous

Use synchronous calls only when:

- the source is fast;
- lookup latency is predictable;
- quota is safe;
- the result is useful to the immediate user request;
- the source explicitly permits the access method.

Likely examples:

- canonical place lookup against a locally ingested TERYT table;
- cached GeoNames lookup;
- cached Wikidata entity lookup.

### Asynchronous

Use workers/jobs for:

- bulk dataset imports;
- periodic refresh;
- historical corpus searches;
- OCR retrieval;
- Europeana/Polona/FBC enrichment;
- schema-drift checks;
- full report precomputation;
- connector backfills.

### Pre-ingested

Prefer local pre-ingestion for high-use, stable, lawful datasets:

- PESEL surname snapshots;
- TERYT;
- GeoNames bulk data where practical;
- Getty TGN bulk/LOD subset where practical.

### On demand

Use on-demand querying for:

- narrow historical search;
- source-specific record enrichment;
- provider APIs whose full ingestion is unnecessary;
- candidate searches with high combinatorial space.

## 1.3 Critical principle

The system must distinguish:

```text
NO_MATCH
```

from:

```text
SOURCE_UNAVAILABLE
RIGHTS_BLOCKED
NOT_QUERIED
QUERY_PARTIAL
SCHEMA_CHANGED
```

A failed source request never proves absence of historical evidence.

---

# 2. CURRENT VERIFICATION SNAPSHOT — 2026-09-17

This document rechecked time-sensitive source/API/licensing facts against current public documentation.

This is product/data architecture analysis, **not formal legal advice**. Final bulk ingestion agreements and commercial reuse assumptions should be reviewed by counsel where material.

## 2.1 Verified facts

### PESEL surname dataset — VERIFIED

The official `dane.gov.pl` dataset **“Nazwiska występujące w rejestrze PESEL”**:

- is provided by the Ministry of Digital Affairs;
- covers surnames of living people in PESEL using the current-surname field;
- omits surnames occurring only once;
- excludes deceased people;
- is updated annually;
- was updated on **2026-01-28**;
- is downloadable and exposed through the Open Data API.

Official page:

`https://dane.gov.pl/pl/dataset/1681,nazwis`

**Architecture consequence:** treat it as a dated national population snapshot, not as proof of a complete census of every spelling form and not as a current regional geography source unless a specific resource explicitly supplies such fields.

### TERYT — VERIFIED

GUS states that TERYT ws1 is available to public and commercial entities and that the service/data are free of charge. It exposes TERC, SIMC, ULIC and related registries.

Official page:

`https://api.stat.gov.pl/Home/TerytApi?lang=en`

**Architecture consequence:** TERYT can be a canonical Polish place-ID backbone.

### GUS geocoder — VERIFIED

The GUS REST/JSON geocoder documentation states that commercial and non-commercial use is permitted free of charge with source attribution.

Official documentation:

`https://geo.stat.gov.pl/api/fts/`

**Architecture consequence:** approved for production place-resolution support, with attribution and rate/availability safeguards.

### Wikidata — VERIFIED

Wikidata structured data in the main/property/lexeme namespaces is available under CC0.

Official page:

`https://www.wikidata.org/wiki/Wikidata:Licensing`

**Architecture consequence:** safe as an enrichment/cross-ID source, but authority must remain claim-specific.

### GeoNames — VERIFIED

GeoNames states:

- data are available under CC BY;
- commercial use is permitted;
- attribution is required;
- free web services are quota-limited, including a daily credit limit.

Official page:

`https://www.geonames.org/export/`

**Architecture consequence:** use bulk/local data where possible; web API should be quota-managed and not form a hard availability dependency.

### Getty TGN — VERIFIED

Getty currently publishes the Vocabularies under ODC-By 1.0. Individual records are available in linked-data formats and full data releases are available; Getty notes that some older XML/web-service formats have been retired.

Official pages:

`https://www.getty.edu/research/tools/vocabularies/obtain/download.html`

`https://www.getty.edu/research/tools/vocabularies/lod/`

**Architecture consequence:** implement against LOD/SPARQL/download formats, not retired XML integrations.

### Europeana — VERIFIED

Europeana:

- provides Search, Record and IIIF APIs;
- requires a free API key;
- publishes metadata under CC0;
- requires digital objects/previews to carry their own rights statement.

Official pages:

`https://api.europeana.eu/en`

`https://www.europeana.eu/en/rights/terms-of-use`

**Architecture consequence:** metadata and digital-object rights must be modelled independently.

### OpenHistoricalMap — VERIFIED WITH DATA-QUALITY CAVEAT

OpenHistoricalMap exposes an Overpass API and other OSM-like access mechanisms. Project documentation states that OHM aims to make as much data as possible available under CC0, while some imported features can have source-specific licences such as ODbL.

Relevant documentation:

`https://wiki.openstreetmap.org/wiki/Open_Historical_Map/FAQ`

`https://wiki.openstreetmap.org/wiki/OpenHistoricalMap/Overpass`

**Architecture consequence:** use OHM as contextual historical geography, not authoritative complete coverage. Preserve element/source licensing where exposed.

### IJP PAN ISNP — VERIFIED CONTENT, RIGHTS UNCONFIRMED

IJP PAN's Internet Dictionary of Polish Surnames provides:

- frequency;
- geography;
- historical forms;
- etymological/onomastic analysis;
- morphology;
- variants.

Its own documentation states that its PESEL frequency/geography base is from **2014**.

Official page:

`https://nazwiska.ijppan.pl/info/oslowniku`

The site being free to read does **not** establish permission for bulk commercial ingestion, caching or redistribution.

**Architecture consequence:** `PARTNERSHIP_REQUIRED / LEGAL_REVIEW` for production ingestion.

### PTG / Geneteka — VERIFIED AS PROTECTED DATABASE, PARTNERSHIP FOR PRODUCT INGESTION

PTG's own usage page states that its database services are protected databases and reserves rights against unauthorised extraction/reuse of all or a substantial part of the database. It permits certain scientific, educational, popularisation and hobby uses.

Official page:

`https://geneteka.genealodzy.pl/ogenetece.php`

**Architecture consequence:** do not build a commercial bulk scraper. Seek a written commercial/product agreement and technical delivery route.

### GenBaza — VERIFIED BLOCKED FOR AUTOMATED PRODUCT INGESTION WITHOUT WRITTEN PERMISSION

GenBaza's terms effective in 2026 explicitly prohibit mass/serial automated access and downloading without prior written permission and restrict commercial/database reuse.

Official page:

`https://genbaza.pl/regulamin`

**Architecture consequence:** connector status `BLOCKED` unless written agreement exists.

### FamilySearch — VERIFIED PARTNER/COMPATIBILITY PATH

FamilySearch requires compatibility review for Beta/Production API keys; solutions intended for commercial distribution should proceed through the compatible developer route.

Official documentation:

`https://developers.familysearch.org/main/docs/compatibility-review-process`

**Architecture consequence:** later official partner integration, not scraping.

### JRI-Poland — VERIFIED PARTNERSHIP REQUIRED FOR COMMERCIAL USE

JRI-Poland's Terms of Use limit default database use and ask users to obtain written permission for commercial use.

Official page:

`https://jri-poland.org/terms-of-use/`

**Architecture consequence:** partnership/permission only.

### Ancestry — VERIFIED BLOCKED FOR SCRAPING

Current Ancestry terms prohibit automated/programmatic acquisition or monitoring beyond intended standard human use.

Official page:

`https://www.ancestry.com/c/legal/termsandconditions`

### MyHeritage — VERIFIED BLOCKED FOR AUTOMATED HARVESTING

Current MyHeritage terms prohibit automated agents/bots harvesting or scraping service data.

Official page:

`https://www.myheritage.com/FP/Company/popup-terms-conditions.php?dispLang=EN`

### Findmypast — VERIFIED BLOCKED FOR SYSTEMATIC EXTRACTION

Findmypast terms prohibit systematic downloading, screen scraping, caching, data extraction and programmatic access for creating an electronic database.

Official page:

`https://www.findmypast.com/help/articles/4411066891409`

### Geneanet — VERIFIED BLOCKED FOR AUTOMATED COMMERCIAL HARVESTING

Geneanet terms prohibit robots/automatic access tools and prohibit commercial use of the data under normal site terms.

Official page:

`https://en.geneanet.org/legal/cgu/`

---

# 3. CONNECTOR CLASSIFICATION

Each connector must declare one `ConnectorType`.

## 3.1 `BULK_DATASET`

Examples:

- PESEL CSV/XLS/other resource;
- TERYT bulk files;
- GeoNames bulk dump;
- Getty TGN full download.

Use when:

- data are stable;
- refresh is periodic;
- local querying is faster and cheaper;
- rights permit local storage.

Pattern:

```text
DOWNLOAD VERSION
→ checksum
→ raw object storage
→ staging validation
→ canonical import
→ atomic snapshot activation
```

## 3.2 `REST_API`

Examples:

- GUS geocoder;
- Europeana;
- provider-specific JSON APIs.

Connector responsibilities:

- auth;
- request construction;
- pagination;
- rate limits;
- retry;
- response schema validation.

## 3.3 `SPARQL_LINKED_DATA`

Examples:

- Wikidata;
- Getty Vocabulary LOD.

Best for:

- identifiers;
- labels;
- cross-links;
- typed relationships.

Do not make remote SPARQL a hard dependency for every user request. Cache or ingest frequently required subsets.

## 3.4 `OAI_PMH`

Likely use:

- FBC/local digital-library harvesting where supported.

Use for incremental metadata harvesting using datestamps/set structure.

OAI-PMH is a metadata transport protocol, not a blanket licence.

## 3.5 `IIIF`

Examples:

- Polona;
- Europeana/provider objects.

Use for:

- manifests;
- canvases;
- page/image references;
- display metadata.

IIIF availability does not mean image reuse rights.

## 3.6 `SEARCH_API`

Examples:

- Polona search;
- Europeana Search API;
- historical full-text indexes.

Use on demand or via scheduled candidate discovery.

## 3.7 `FILE_IMPORT`

For manually obtained:

- partner exports;
- licensed datasets;
- research spreadsheets;
- archive delivery packages.

Must still create SourceRecords and provenance.

## 3.8 `PARTNER_API`

For negotiated providers such as:

- IJP PAN;
- PTG;
- FamilySearch;
- JRI-Poland.

Partner connector contract may differ operationally but must emit the same Name Atlas source-layer objects.

## 3.9 `MANUAL_ASSISTED`

For sources where:

- automatic access is absent;
- licensing permits human research;
- high-value evidence requires manual extraction.

Manual research must still create a structured SourceRecord/Evidence lineage.

## 3.10 `BLOCKED_NO_AUTOMATION`

A registry entry can exist without an executable connector.

Examples at current status:

- GenBaza;
- Ancestry;
- MyHeritage;
- Findmypast;
- Geneanet.

This status is intentional architecture, not technical debt.

---

# 4. STANDARD CONNECTOR CONTRACT

## 4.1 Logical interface

Illustrative Python-style contract:

```python
class SourceConnector(Protocol):
    connector_id: str
    connector_version: str
    source_id: UUID
    connector_type: ConnectorType

    def capabilities(self) -> ConnectorCapabilities: ...
    def health_check(self) -> ConnectorHealth: ...
    def get_rights_profile(self) -> RightsProfileRef: ...

    async def search(
        self,
        query: ConnectorSearchQuery,
        context: ConnectorContext
    ) -> ConnectorSearchResult: ...

    async def get_record(
        self,
        external_record_id: str,
        context: ConnectorContext
    ) -> ConnectorRecordResult: ...

    async def sync(
        self,
        cursor: SyncCursor | None,
        context: ConnectorContext
    ) -> SyncResult: ...

    async def fetch_bulk_version(
        self,
        version_ref: str,
        context: ConnectorContext
    ) -> BulkFetchResult: ...
```

Not every connector supports every method.

Capabilities declare what is valid.

```json
{
  "search": true,
  "get_record": true,
  "incremental_sync": false,
  "bulk_sync": true,
  "iiif": false,
  "full_text": false,
  "geospatial": false
}
```

## 4.2 Required connector metadata

```text
connector_id
source_id
connector_type
connector_version
mapping_version
schema_contract_version
production_status
auth_mode
rate_limit_policy
cache_policy
freshness_policy
rights_profile_id
owner_team
```

## 4.3 Connector boundary

The connector may output:

- `SourceRecord`;
- `DigitalAsset`;
- source-native names;
- source-native place text;
- source-native dates;
- structured candidate fields;
- provider OCR;
- provider confidence where present;
- source authority metadata;
- provenance;
- rights.

It may not output a final Name Atlas `Claim`.

---

# 5. SOURCE REGISTRY

`SourceRegistry` is configuration/data, not scattered code constants.

## 5.1 Canonical fields

| Field | Purpose |
|---|---|
| `source_id` | Stable Name Atlas UUID |
| `source_key` | Stable machine name, e.g. `pl_pesel_surnames` |
| `provider_name` | Institution/provider |
| `source_name` | Dataset/service title |
| `source_type` | OFFICIAL_DATASET, ARCHIVE, GAZETTEER, SCHOLARLY, COMMUNITY, PARTNER, etc. |
| `country_scope` | Country codes |
| `temporal_scope` | Current/historical/range |
| `data_types` | surname counts, places, OCR, etymology, etc. |
| `granularity` | surname/person/place/mixed |
| `access_method` | connector type |
| `connector_id` | implementation binding |
| `production_status` | state |
| `default_rights_profile_id` | baseline rights |
| `authority_class` | evidence-quality context |
| `freshness_policy_id` | update rules |
| `attribution_policy` | display requirement |
| `homepage_url` | reference |
| `terms_url` | rights reference |
| `last_reviewed_at` | operational/legal review |
| `owner` | internal owner |
| `notes` | limitations |

## 5.2 Source statuses

```text
ACTIVE
DEGRADED
DISABLED
PARTNERSHIP_REQUIRED
LEGAL_REVIEW
BLOCKED
DEPRECATED
```

`BLOCKED` means connector execution is forbidden.

`PARTNERSHIP_REQUIRED` means Name Atlas wants the source but current rights/access are insufficient.

---

# 6. RIGHTS REGISTRY INTEGRATION

The canonical `RightsProfile` comes from Prompt 11.

The connector layer must evaluate rights at **source**, **record** and **asset** level.

## 6.1 Precedence

```text
DigitalAsset rights
    overrides
SourceRecord rights
    overrides
Source default rights
```

A child may be more restrictive than the parent.

## 6.2 Rights dimensions

At minimum:

```text
metadata_rights
image_rights
transcription_rights
database_rights
automated_access
commercial_use
redistribution
local_cache
attribution_required
```

## 6.3 Decision matrix

| Rights state | Ingest metadata | Local cache | Free UI | Paid report | SEO |
|---|---:|---:|---:|---:|---:|
| Fully open | Yes | Yes | Yes | Yes | Yes |
| Attribution required | Yes | Yes | Yes + attribution | Yes + attribution | Yes + attribution |
| Metadata open / image restricted | Metadata yes | Metadata yes | Metadata yes; image no | Metadata/citation yes; image no | Metadata yes |
| Non-commercial only | Conditional internal research | Conditional | Legal review | **No** by default | **No** by default |
| Commercial permission unknown | Technical discovery only if access lawful | Minimal/conditional | Conditional | **No** | No |
| Partnership required | No production bulk ingest | No | No derived display unless separately lawful | No | No |
| Automated access prohibited | **No automated ingest** | No | Human/manual only if allowed | Depends on separate permission | No automated generation |
| Rights expired | Pause affected surfaces | Preserve audit snapshot only | Existing output review | Block new paid output | Review |

## 6.4 Hard gate

```text
if automated_access == PROHIBITED:
    connector.execute = false

if commercial_use in {UNKNOWN, PROHIBITED}:
    evidence.paid_surface_eligible = false

if image_rights != ALLOWED:
    digital_asset.reproduction_eligible = false
```

---

# 7. MVP SOURCE STATUS MATRIX

Legend:

- **NOW** — approved/open candidate for MVP engineering.
- **RIGHTS-FILTERED** — usable only with item-level rights logic.
- **PARTNER** — negotiate before production ingestion.
- **LATER** — valuable but not needed for vertical slice.
- **BLOCKED** — no automated connector under current terms.

| Source | Product role | Access | Automation | Commercial/product status | Local cache | MVP status |
|---|---|---|---|---|---|---|
| PESEL / dane.gov.pl | current national surname counts | bulk/API | High | Open-data reuse; preserve dataset conditions | Yes | **NOW** |
| TERYT | Polish canonical places/admin | ws1/bulk | High | Explicit commercial access, free | Yes | **NOW** |
| GUS geocoder | PL geocoding/reference geometry | REST | High | Commercial/non-commercial allowed with attribution | Response/local cache per policy | **NOW** |
| Wikidata | labels, IDs, cross-links | SPARQL/entity/bulk | High | CC0 structured data | Yes | **NOW** |
| GeoNames | global places/aliases | bulk/API | High | CC BY; commercial allowed | Yes | **NOW** |
| Getty TGN | historical/current place names | LOD/SPARQL/download | High | ODC-By | Yes | **NOW/P1** |
| Polona | Polish historical corpus | Search/IIIF/API | Medium-high | **Item rights vary** | Metadata/raw refs yes; assets by rights | **RIGHTS-FILTERED** |
| FBC | Polish digital-library metadata aggregator | metadata interfaces/search | Medium | Rights inherited/provider-specific for objects | Metadata carefully | **P1 RIGHTS-FILTERED** |
| Europeana | EU cultural-heritage metadata | API/IIIF | High | Metadata CC0; object rights item-specific | Metadata yes | **NOW/P1** |
| OpenHistoricalMap | historical geography/context | Overpass/tiles/bulk | Medium-high | Predominantly open; preserve source licences | Yes with licence tracking | **P1** |
| Szukaj w Archiwach | archival discovery | current access requires separate connector review | Medium | Object/metadata conditions require exact verification | Conditional | **P1 / LEGAL REVIEW** |
| IJP PAN ISNP | Polish etymology/morphology/variants/geography | public web today | Technically possible but not approved | Commercial bulk rights unconfirmed | No production cache without agreement | **PARTNER P0** |
| PTG Geneteka | indexed historical records | public search | Do not bulk automate without agreement | protected database; product/commercial route needs agreement | No without agreement | **PARTNER P1** |
| PTG Skanoteka/Metryki | scans/index-linked material | web | No product bulk access without agreement | rights mixed/partner | No without agreement | **PARTNER** |
| FamilySearch | global person genealogy | official developer route | High after approval | compatibility/partner route | Contract-dependent | **LATER PARTNER** |
| JRI-Poland | Jewish Polish genealogy | public DB + permission route | No commercial ingestion by default | written commercial permission required | Contract-dependent | **LATER PARTNER** |
| Ancestry | person records | consumer web | **Blocked** | automated/programmatic harvesting prohibited | No | **BLOCKED** |
| MyHeritage | person records | consumer web | **Blocked** | automated harvesting/scraping prohibited | No | **BLOCKED** |
| Findmypast | person records | consumer web | **Blocked** | systematic/programmatic extraction prohibited | No | **BLOCKED** |
| Geneanet | genealogy | consumer web | **Blocked** | robots prohibited; commercial data use restricted | No | **BLOCKED** |
| GenBaza | scans/indexes | web | **Blocked** absent written permission | mass automation/commercial reuse prohibited | No | **BLOCKED** |
| Grobonet | cemetery data | web | Not approved | terms/rights require provider-specific agreement | No default | **LEGAL REVIEW / PARTNER** |

---

# 8. RECOMMENDED MVP SOURCE STACK

## 8.1 CORE — launch infrastructure

### 1. PESEL surname data

Powers:

- current national count;
- rank;
- defensible rarity context;
- existence in current Polish dataset.

### 2. TERYT

Powers:

- canonical Polish locality IDs;
- admin hierarchy;
- place linkage.

### 3. GUS geocoder

Powers:

- current Polish place search;
- coordinates/reference geometry;
- resolution support.

### 4. GeoNames

Powers:

- global aliases;
- non-Polish locations;
- coordinates;
- cross-border migration-era place candidates.

## 8.2 CORE HISTORICAL PROOF

### 5. Polona — rights-filtered

Powers:

- historical surname occurrences;
- dated documents;
- newspapers/directories/books;
- tangible evidence.

The MVP should support Polona **metadata + citations first**, then public-domain imagery as an optional layer.

## 8.3 STRONG P1

### Europeana

Useful for:

- broader European corpus discovery;
- cross-provider identifiers;
- standard rights statements.

### Getty TGN

Useful for:

- historical place variants;
- multilingual historical naming;
- place context.

### Wikidata

Useful for:

- cross-identifiers;
- languages;
- basic entity enrichment.

### FBC

Useful for:

- Polish digital-library discovery beyond Polona;
- local-provider metadata.

### OpenHistoricalMap

Useful for:

- contextual historical boundaries;
- visual historical geography.

## 8.4 PARTNERSHIP TARGETS

Priority:

1. **IJP PAN** — onomastics;
2. **PTG** — historical genealogy/index depth;
3. FamilySearch — later person-level;
4. JRI-Poland — later targeted person-level/diaspora.

---

# 9. PESEL CONNECTOR

## 9.1 Purpose

Provide dated current surname-count evidence for Poland.

## 9.2 Ingestion strategy

Use a **versioned full-snapshot import**.

```text
CHECK dataset metadata
↓
discover latest resource(s)
↓
download immutable raw resource
↓
hash resource
↓
store raw file + metadata
↓
validate columns/types
↓
load staging table
↓
normalise deterministic search fields
↓
run QA
↓
activate snapshot atomically
```

## 9.3 Snapshot semantics

Do not update old rows in place.

Model:

```text
DatasetVersion
2026
  └─ DistributionSnapshot
       └─ surname rows
```

New annual dataset:

```text
2027 snapshot
```

does not overwrite 2026.

## 9.4 Raw fields to preserve

Preserve source-provided:

- surname spelling;
- count;
- sex/category if resource separates it;
- resource ID;
- resource URL;
- dataset updated date;
- resource date;
- any provider notes.

## 9.5 Suppression semantics

The official dataset excludes single occurrences.

Therefore:

```text
surname absent from PESEL surname dataset
```

does **not** always mean:

```text
zero living people
```

Possible state:

```text
BELOW_PUBLICATION_THRESHOLD_OR_ABSENT
```

Prompt 13 should decide how surname resolution handles this.

## 9.6 Rank

Rank may be computed deterministically within a specific snapshot.

Store:

- rank universe definition;
- ties policy;
- snapshot ID;
- algorithm version.

## 9.7 `1-in-X`

Only derive if denominator semantics are compatible.

Do not claim:

> 1 in X Polish citizens

unless denominator corresponds to the same population universe.

Safer internal model:

```text
count / compatible population denominator
```

with methodology recorded.

## 9.8 Regional geography

PESEL connector must expose:

```text
capabilities.regional_distribution = false
```

unless the actual ingested resource contains verified regional fields.

Never extrapolate national counts into regions.

## 9.9 Refresh

```text
SYNC = FULL_REFRESH
cadence = metadata check weekly/monthly
actual new import = when source version changes
```

Because source update frequency is annual, daily downloads are wasteful.

---

# 10. CURRENT GEOGRAPHY STRATEGY

## Scenario A — current licensed regional source available

Connector returns:

```text
DistributionSnapshot
as_of = exact date
geography_level = VOIVODESHIP / POWIAT / GMINA
source = licensed provider
```

Coverage:

```text
modern_geography = STRONG
```

UI:

> Current distribution — data from [year/date].

## Scenario B — only older regional snapshot available

Example: IJP PAN geography based on PESEL 2014, if rights are secured.

Store as:

```text
snapshot_date = 2014
is_current = false
```

Coverage:

```text
modern_geography = HISTORICAL_OR_STALE
```

UI must say:

> Regional distribution in the 2014 dataset.

Do not headline:

> Where the surname lives today.

## Scenario C — no lawful regional data

Coverage:

```text
modern_geography = UNAVAILABLE
reason = NO_APPROVED_SOURCE
```

UI:

- skip current map;
- preserve national count;
- optionally show historical place evidence later;
- do not invent map density.

This scenario must be treated as a fully supported MVP state.

---

# 11. TERYT CONNECTOR

## 11.1 Role

TERYT is the primary canonical-ID source for **current Polish administrative/locality identity**.

Use:

- TERC;
- SIMC;
- ULIC where useful;
- type dictionaries.

## 11.2 Local ingestion recommended

Because place resolution is frequent:

```text
TERYT remote service
↓ periodic sync
local reference tables
↓
Place / PlaceName / AdministrativeMembership
```

Avoid remote ws1 requests on every user lookup.

## 11.3 External IDs

Store:

```text
namespace = TERYT_SIMC / TERYT_TERC / TERYT_ULIC
external_id
valid_from
valid_to where available
```

## 11.4 What TERYT does not solve

TERYT is not:

- a historical border database for the partitions era;
- a universal multilingual gazetteer;
- a surname distribution dataset;
- an etymology source.

Historical resolution requires Getty/GeoNames/Wikidata/OHM/archive evidence.

---

# 12. GUS GEOCODER CONNECTOR

## 12.1 Role

Support current Polish place/address resolution and geometry lookup.

## 12.2 Architecture

Use as:

```text
candidate enrichment
```

not canonical truth by itself.

Request inputs can include:

- TERYT code;
- locality;
- street;
- free-text location.

Output must preserve:

- raw response;
- returned reference ID;
- geometry;
- result type;
- provider score/ranking if supplied.

## 12.3 Cache

Because place identities are relatively stable:

- cache successful normalized place lookups;
- cache key should include normalized input + endpoint/method version;
- invalidate on TERYT/GUS reference-data refresh.

## 12.4 Attribution

Store the required GUS attribution in SourceRegistry so UI/export layers can reproduce it consistently.

## 12.5 Fallback

If GUS is unavailable:

```text
local TERYT
→ GeoNames
→ Wikidata
```

depending on query type.

---

# 13. WIKIDATA CONNECTOR

## 13.1 Role

Use Wikidata primarily for **enrichment and cross-identification**.

Good uses:

- alternate labels;
- language labels;
- external IDs;
- current/historical administrative relationships;
- links to GeoNames/TGN/Wikimedia;
- basic place metadata.

## 13.2 Access strategy

For MVP:

- entity lookup for selected QIDs;
- SPARQL for targeted enrichment;
- local cache of resolved entities.

Do not issue expensive broad SPARQL queries in synchronous user lookup.

## 13.3 Authority

`authority_class = COMMUNITY_STRUCTURED`

Wikidata can support:

- an identifier relationship;
- a label;
- a lead for deeper research.

It should not automatically establish:

- historical surname origin;
- family relationship;
- authoritative administrative history where stronger sources disagree.

---

# 14. GEONAMES CONNECTOR

## 14.1 Role

Global gazetteer fallback and alias source.

Use for:

- place candidates outside Poland;
- alternative names;
- coordinates;
- feature classification;
- current admin context;
- country mapping.

## 14.2 Access recommendation

Prefer:

```text
bulk dump / local index
```

for common resolution paths.

Free web API has quotas, so it should not be the only production dependency.

## 14.3 Attribution

GeoNames attribution is mandatory under CC BY.

Centralise attribution via SourceRegistry.

## 14.4 TERYT conflict

For a Polish locality:

```text
TERYT/GUS canonical identity
```

should normally outrank GeoNames for current official Polish administrative identifiers.

GeoNames remains useful for aliases and cross-border context.

---

# 15. GETTY TGN CONNECTOR

## 15.1 Role

Getty TGN is especially useful for:

- historical place names;
- multilingual names;
- place types;
- hierarchical context;
- source/contributor provenance.

## 15.2 Access

Preferred:

- LOD individual records;
- SPARQL;
- periodic bulk N-Triples subset/import.

Do not build against retired XML web services.

## 15.3 Canonical mapping

Map primarily to:

```text
Place
PlaceName
AdministrativeMembership candidate
ExternalIdentifier
```

Coordinates from TGN are for finding/cataloguing purposes and should not always be treated as survey-grade GIS precision.

## 15.4 Attribution

Persist:

- Getty vocabulary name;
- Getty identifier;
- contributor/source where supplied.

ODC-By attribution must survive into displayed derived place data where required.

---

# 16. POLONA CONNECTOR

Polona is the highest-value open historical connector for the first Polish surname vertical slice.

## 16.1 Role

Search candidate sources such as:

- newspapers;
- address books;
- directories;
- books;
- regional monographs;
- historical publications;
- public-domain digitised documents.

## 16.2 Object model

Separate:

```text
SOURCE
Polona / Biblioteka Narodowa

SOURCE RECORD
digital object / page / search hit

DIGITAL ASSET
scan / IIIF canvas / PDF / OCR

EVIDENCE
actual surname occurrence
```

## 16.3 Retrieval stages

```text
search surname/form
↓
retrieve item metadata
↓
retrieve object/page structure
↓
retrieve OCR/search context if available
↓
rights inspection
↓
create SourceRecord
↓
create DigitalAsset references
↓
emit occurrence candidate
```

## 16.4 Rights

Polona objects expose object-level rights information.

Therefore connector logic must treat:

```text
metadata_rights
ocr/transcription_rights
image_rights
```

independently.

### Public-domain object

Potentially eligible for:

- metadata;
- citation;
- scan crop/reproduction;
- commercial report;

subject to exact item metadata and moral-rights/attribution handling.

### Copyright-protected object

Default MVP:

- metadata/citation/link only where permitted;
- do not copy scan into premium report unless rights specifically allow it.

## 16.5 OCR

Preserve:

```text
raw_ocr_text
matched_substring
page/canvas locator
provider confidence if available
query form
normalised candidate
```

OCR hit is:

```text
MACHINE_EXTRACTED EVIDENCE
```

until appropriate validation.

## 16.6 False positives

Common failure patterns:

- OCR confusion;
- hyphenation;
- column merging;
- proper noun vs ordinary word;
- similar surname;
- page metadata mismatch.

The connector must not mark an OCR match as a HistoricalVariant.

It emits an occurrence candidate to the later resolution/evidence layer.

## 16.7 Duplicate strategy

A Polona object may also appear in Europeana or FBC.

Deduplicate using:

- Polona UUID;
- provider/institution identifier;
- bibliographic IDs;
- canonical object URL;
- content metadata;
- hash where lawful.

---

# 17. FBC CONNECTOR

## 17.1 Role

FBC is a Polish metadata aggregator for digital-library resources.

It is useful as:

- discovery layer;
- source/provider locator;
- supplement to Polona;
- route into local dLibra libraries.

## 17.2 Access

Historical/current FBC documentation describes external metadata interfaces including OAI-PMH/OpenSearch. Before production implementation, engineering must verify the exact live endpoint and current terms.

Therefore:

```text
production_status = LEGAL_REVIEW / TECHNICAL_VERIFICATION
```

until live connector proof is complete.

## 17.3 Rights propagation

FBC aggregation does not make every underlying object commercially reusable.

Store:

```text
aggregator = FBC
provider = original library
object_rights = provider/item rights
```

## 17.4 Deduplication

FBC should not create duplicate discoveries simply because the same object is also in:

- Europeana;
- Polona;
- source library.

Prefer a single canonical SourceRecord cluster with multiple provenance links where identity is established.

---

# 18. EUROPEANA CONNECTOR

## 18.1 Role

Europe-wide cultural-heritage discovery.

Useful for:

- Polish diaspora material;
- European archives/libraries;
- cross-provider metadata;
- rights-standardised discovery.

## 18.2 APIs

Use:

- Search API;
- Record API;
- IIIF where helpful.

Store API key in secret manager.

## 18.3 Rights split

### Metadata

Europeana metadata are CC0.

### Digital object / preview

Reuse is governed by `edm:rights` / item rights statement.

Connector must map Europeana rights URIs into Name Atlas `RightsProfile`.

## 18.4 Provider provenance

Always retain:

```text
Europeana
aggregator
data provider
original object URL
original institution
```

A citation should normally surface the original provider, not erase it behind Europeana.

## 18.5 Metadata attribution

Even where metadata are CC0, Europeana requests good-practice acknowledgement of data providers/aggregators. Treat this as a provenance/display policy.

---

# 19. OPENHISTORICALMAP CONNECTOR

## 19.1 Role

OHM provides context, not surname evidence.

Use for:

- historical boundaries;
- place existence periods;
- transport/geographic context;
- time-aware map layers.

## 19.2 Access

Preferred:

- Overpass API for targeted queries;
- local snapshot/tiles only if needed later.

## 19.3 Data-quality status

```text
authority_class = COMMUNITY_HISTORICAL_GEOGRAPHY
```

Coverage is uneven.

Do not infer:

> a place did not exist

because OHM lacks it.

## 19.4 Licence

Preserve per-element/source licence signals when available. OHM aims for CC0 broadly, but imported elements can have other licences.

---

# 20. IJP PAN PARTNERSHIP CONNECTOR

## 20.1 Before agreement

```text
source_status = PARTNERSHIP_REQUIRED
connector_execution = DISABLED
commercial_use = UNKNOWN
local_cache = UNKNOWN
```

The public website can be researched manually for source discovery, but Name Atlas should not treat public HTML access as product ingestion permission.

## 20.2 Desired agreement

Request explicit rights for:

- commercial product use;
- automated queries or bulk delivery;
- local caching;
- derived analysis;
- source citations;
- use in free results;
- use in paid reports;
- programmatic SEO where applicable;
- storage of historical forms;
- storage of morphology/etymology structures.

## 20.3 Desired technical delivery

Priority order:

1. bulk structured export;
2. stable API;
3. scheduled delta export;
4. licensed cached derived fields;
5. HTML automation only if explicitly authorised.

## 20.4 Desired fields

```text
surname headword
frequency
rank
sex forms
regional distribution + data year
historical attestations
etymological hypotheses
formation/morphology
documented variants
bibliography/source pointers
```

## 20.5 Questions to IJP PAN

1. Who owns database rights in ISNP as a compiled database?
2. Can Name Atlas use ISNP data in a commercial consumer product?
3. Can data be cached locally?
4. Can entries be transformed into structured derived claims?
5. Can text explanations be quoted/paraphrased, and under what limits?
6. Can historical attestations be stored?
7. Can regional values be stored and visualised?
8. Are there restrictions inherited from underlying dictionaries/works?
9. Is an API or bulk export available?
10. Is a paid licence/partnership possible?
11. What attribution is required?
12. What update feed can be provided?
13. Are current 2025–2030 additions distinguishable from older entry content?
14. Can commercial SEO pages use derived facts?
15. Are there different rights for metadata, linguistic prose and source excerpts?

---

# 21. PTG / GENETEKA / SKANOTEKA PARTNERSHIP

## 21.1 Current state

Do not build a bulk commercial scraper.

Registry:

```text
source_status = PARTNERSHIP_REQUIRED
```

## 21.2 Desired surname-level use

Before person-level genealogy, PTG could help Name Atlas with:

- occurrence counts by parish/period;
- attested spelling forms;
- historical locality clusters;
- source/collection discovery.

## 21.3 Desired technical ask

Prefer:

- read-only partner API;
- scheduled index export;
- query endpoint with rate agreement;
- stable IDs;
- parish/place IDs;
- record-type/date range;
- scan-link metadata;
- author/contributor attribution where required.

## 21.4 Separate rights

Negotiate separately:

```text
index metadata
scan/image
links to archives
derived statistics
commercial report use
SEO use
local cache
```

Scans are not automatically covered by permission to use index metadata.

---

# 22. FAMILYSEARCH AND COMMERCIAL GENEALOGY SOURCES

## 22.1 FamilySearch

Architecture:

```text
LATER PARTNER CONNECTOR
```

Use official developer/compatibility route.

Intended use begins in Family Origin / Deep Research, not core surname MVP.

## 22.2 Ancestry

```text
BLOCKED_NO_AUTOMATION
```

No scraping/programmatic harvesting.

Potential future path:

- formal business/data partnership only.

## 22.3 MyHeritage

```text
BLOCKED_NO_AUTOMATION
```

No AI/bot harvesting.

Potential future path:

- formal partnership/API if available under contract.

## 22.4 Findmypast

```text
BLOCKED_NO_AUTOMATION
```

No systematic/programmatic database creation.

## 22.5 Geneanet

```text
BLOCKED_NO_AUTOMATION
```

Robots/automatic access prohibited by ordinary terms.

---

# 23. RAW INGEST MODEL

Prompt 11 defines `SourceRecord`. This specification adds an ingestion/audit layer.

Recommended P0 table:

## `raw_ingests`

| Field | Purpose |
|---|---|
| `raw_ingest_id` | UUIDv7 |
| `source_id` | Source |
| `connector_id` | Connector |
| `connector_version` | Runtime version |
| `mapping_version` | Mapper version |
| `source_schema_version` | Detected/provider version |
| `external_record_id` | Native record if applicable |
| `request_fingerprint` | Reproducible request identity |
| `retrieved_at` | Retrieval time |
| `source_modified_at` | Provider modified time |
| `http_status` | if HTTP |
| `response_headers_subset` | selected useful headers |
| `content_type` | MIME |
| `content_hash` | raw content checksum |
| `raw_storage_key` | object-store location |
| `rights_profile_id` | rights in force |
| `ingest_status` | RECEIVED/VALIDATED/REJECTED/etc. |
| `error_code` | structured failure |
| `correlation_id` | tracing |

Do not put large raw payloads directly into PostgreSQL if they are large/binary.

---

# 24. RAW STORE VS CANONICAL STORE

## 24.1 Raw store

Recommended:

- object storage;
- immutable/append-oriented;
- content-addressed or version-addressed;
- encrypted at rest;
- access controlled.

Contains:

- downloaded files;
- JSON payloads;
- XML;
- OCR files;
- partner exports;
- selected headers;
- schema fixtures.

## 24.2 Canonical PostgreSQL

Contains:

- Source;
- SourceRecord;
- DigitalAsset refs;
- Place candidates;
- surname dataset rows;
- canonical objects after later resolution;
- rights/provenance.

## 24.3 Why separation matters

It allows:

```text
new mapper version
↓
reprocess old raw input
```

without re-downloading an external provider.

It also allows:

- dispute audit;
- schema-change investigation;
- historical reproducibility;
- rollback.

## 24.4 Retention

Retention must follow rights.

If:

```text
local_cache = PROHIBITED
```

raw capture may need to be metadata-only, ephemeral or omitted depending on contract.

RightsProfile governs storage, not developer convenience.

---

# 25. SOURCE RECORD MAPPING

Mapping is versioned code.

```text
RawIngest
↓ mapping_version=pesel@1.2.0
SourceRecord
↓
candidate structured fields
```

## 25.1 Requirements

Every mapper must:

1. preserve source-native values;
2. make deterministic transformations explicit;
3. never fill absent source fields with inference;
4. emit `null`/state rather than guessed value;
5. record mapping version;
6. record parsing warnings.

## 25.2 Reprocessing

```text
raw ingest exists
+
mapper upgraded
→ produce new SourceRecord revision
```

Use `supersedes_source_record_id` from Prompt 11 where appropriate.

---

# 26. VALIDATION PIPELINE

```text
TRANSPORT
↓
SCHEMA
↓
SEMANTIC
↓
RIGHTS
↓
MAPPING
↓
OUTPUT QA
```

## 26.1 Transport validation

Check:

- HTTP status;
- MIME;
- decompression;
- encoding;
- checksum/download completeness.

## 26.2 Schema validation

Check:

- required fields;
- field types;
- enum values;
- expected nesting;
- version.

## 26.3 Semantic validation

Examples:

- count >= 0;
- date parsable;
- coordinate range valid;
- TERYT code shape;
- source ID present;
- rights statement parsable.

## 26.4 Rights validation

Before durable ingest or downstream release.

## 26.5 Error taxonomy

```text
TRANSPORT_ERROR
AUTH_ERROR
RATE_LIMITED
SCHEMA_CHANGED
REQUIRED_FIELD_MISSING
INVALID_ENCODING
INVALID_DATE
INVALID_COORDINATE
RIGHTS_BLOCKED
RIGHTS_UNKNOWN
UNSUPPORTED_RECORD_TYPE
DUPLICATE_RECORD
CONTENT_WITHDRAWN
PROVIDER_ERROR
```

---

# 27. SCHEMA DRIFT

External data will change.

Connector must fail **closed**, not silently map wrong fields.

## 27.1 Drift signals

Track:

- JSON/XML schema fingerprint;
- CSV header fingerprint;
- required field presence;
- enum sets;
- type distribution;
- null-rate;
- row-count anomaly;
- date-format change;
- sample payload diff.

## 27.2 Example

```text
PESEL expected column:
NAZWISKO

provider changes to:
surname
```

Do not auto-assume.

State:

```text
connector = DEGRADED
error = SCHEMA_CHANGED
```

## 27.3 Deployment gate

A connector mapping update needs:

- fixture update;
- mapping test;
- regression test;
- sample data comparison;
- approval if material.

---

# 28. FRESHNESS MODEL

Store independently:

```text
source_updated_at
source_snapshot_date
retrieved_at
valid_from
valid_to
next_refresh_at
last_refresh_attempt_at
```

## 28.1 Status

```text
CURRENT
STALE
HISTORICAL_STATIC
UNKNOWN
REFRESH_FAILED
```

## 28.2 Examples

### PESEL 2026

`CURRENT` for current-count product until superseded according to policy.

### IJP PAN PESEL 2014 regional data

`HISTORICAL_STATIC`, not CURRENT.

### 1887 directory

`HISTORICAL_STATIC`.

### API whose last scheduled sync failed

`REFRESH_FAILED`, while previous data may remain usable depending on tolerance.

---

# 29. SYNC STRATEGY

Allowed modes:

```text
FULL_REFRESH
INCREMENTAL
APPEND_ONLY
ON_DEMAND
MANUAL
PARTNER_PUSH
```

Recommended:

| Source | Sync |
|---|---|
| PESEL | FULL_REFRESH snapshot |
| TERYT | periodic full/incremental according to provider |
| GeoNames bulk | periodic full refresh |
| Getty TGN | periodic bulk/LOD refresh |
| Wikidata targeted | ON_DEMAND + cache; optional batch |
| GUS geocoder | ON_DEMAND |
| Polona | ON_DEMAND search + selective enrichment |
| Europeana | ON_DEMAND + optional incremental candidate harvesting |
| FBC | INCREMENTAL metadata harvest if live protocol verified |
| IJP PAN | PARTNER_PUSH/BULK/API after agreement |
| PTG | PARTNER API/export after agreement |

---

# 30. CACHE STRATEGY

Four cache layers:

## 30.1 Connector response cache

Short/medium TTL.

Used for repeated identical API requests.

## 30.2 Raw source cache

Audit/backfill storage subject to rights.

## 30.3 Normalised object cache

Place/search candidates, source records.

## 30.4 Product result cache

Outside connector layer, based on canonical data.

## 30.5 Rules

TTL comes from data volatility.

Examples:

- TERYT locality lookup: long;
- GeoNames place: long;
- Europeana search: medium;
- connector error: short negative cache;
- rights unknown: never cache as “allowed”.

---

# 31. RATE LIMIT AND QUOTA MANAGEMENT

Central `RateLimitManager`, keyed by source/credential.

Track:

```text
requests_per_second
requests_per_minute
daily_quota
concurrency
provider_retry_after
remaining_quota if supplied
```

## 31.1 Priority

Requests should have priority class:

```text
USER_INTERACTIVE
PAID_REPORT
BACKGROUND_ENRICHMENT
BACKFILL
EXPERIMENTAL
```

Backfills must yield to user/product requests.

## 31.2 GeoNames example

The free service has explicit quotas. Use local/bulk data for production-critical place lookup where possible.

## 31.3 No evasion

Never:

- rotate IPs to bypass provider limits;
- parallelise around restrictions;
- use multiple accounts to evade quotas.

---

# 32. RETRY POLICY

## Retryable

- timeout;
- connection reset;
- provider 5xx;
- 429 after `Retry-After`;
- temporary gateway error.

## Non-retryable without code/config change

- 400 malformed request;
- 401/403 auth/permission;
- schema invalid;
- rights blocked;
- unsupported record;
- contract status disabled.

## Retry algorithm

Use:

- exponential backoff;
- jitter;
- max attempts;
- circuit breaker.

Do not retry historical API searches indefinitely.

---

# 33. SOURCE HEALTH

Status:

```text
HEALTHY
DEGRADED
DOWN
BLOCKED
AUTH_REQUIRED
SCHEMA_CHANGED
RATE_LIMITED
STALE
```

## 33.1 Health checks

A connector health check should test the minimum cheap provider interaction possible.

Do not use a high-cost search query as heartbeat.

## 33.2 Circuit breaker

If repeated provider failures occur:

```text
CLOSED
→ OPEN
→ HALF_OPEN
```

Background jobs pause. User experience receives `SOURCE_UNAVAILABLE`.

---

# 34. OBSERVABILITY

Metrics per connector:

```text
request_count
success_rate
error_rate
p50_latency
p95_latency
p99_latency
rate_limit_count
records_received
records_validated
records_rejected
mapping_failures
schema_drift_events
rights_blocks
duplicate_rate
cache_hit_rate
freshness_age
bytes_downloaded
```

## 34.1 Dashboards

### Connector health dashboard

- status by source;
- request rate;
- errors;
- latency;
- quota.

### Ingestion dashboard

- last successful snapshot;
- rows/items;
- reject rate;
- schema version.

### Rights dashboard

- profiles nearing review/expiry;
- commercial-use unknown;
- blocked paid-surface evidence.

### Cost dashboard

- requests;
- paid API usage;
- storage growth;
- OCR cost later.

---

# 35. PROVENANCE

Every downstream object must support reverse lineage:

```text
Claim / canonical object
↓
EvidenceItem
↓
SourceRecord
↓
RawIngest
↓
Source
↓
RightsProfile in force
```

Connector-specific canonical records must never lose:

- external ID;
- source/provider;
- retrieval time;
- original URL/reference;
- source version;
- mapping version.

---

# 36. DEDUPLICATION

Deduplication should be conservative.

## 36.1 Exact keys first

Use:

- provider stable ID;
- ISBN/ISSN where meaningful;
- archive reference;
- Europeana/provider IDs;
- Polona UUID;
- TERYT/SIMC;
- GeoNames ID;
- Getty TGN ID.

## 36.2 URL canonicalisation

Remove obvious tracking parameters; retain semantic IDs.

## 36.3 Content hash

Useful for identical downloaded metadata/files where rights permit hashing/storage.

## 36.4 Similarity

Metadata similarity may produce:

```text
POSSIBLE_DUPLICATE
```

not auto-merge when ambiguity matters.

## 36.5 Cross-aggregator example

```text
local library
     ↘
      FBC
       ↘
        Europeana
```

should ideally represent one underlying cultural object with multiple distribution/provenance nodes rather than three historical discoveries.

---

# 37. SOURCE AUTHORITY METADATA

Connector layer does not decide final claim confidence, but it exposes context.

Recommended `AuthorityClass`:

```text
OFFICIAL_PRIMARY
PRIMARY_ARCHIVAL
AUTHORITATIVE_INDEX
SCHOLARLY_SPECIALIST
INSTITUTIONAL_AGGREGATOR
OPEN_GAZETTEER
COMMUNITY_STRUCTURED
COMMUNITY_UNVERIFIED
COMMERCIAL_DATABASE
UNKNOWN
```

Possible source metadata:

```text
official_status
methodology_documented
coverage_known
primary_vs_secondary
human_curated
community_editable
```

Do not collapse to one “trust score”.

---

# 38. CONNECTOR SECURITY

## 38.1 Secrets

Use managed secret storage for:

- Europeana API keys;
- partner tokens;
- FamilySearch OAuth later;
- TERYT credentials;
- provider client secrets.

Never store secrets:

- in repository;
- SourceRegistry plaintext;
- logs;
- raw payload fixtures.

## 38.2 Logging

Redact:

- Authorization;
- cookies;
- access tokens;
- private partner URLs;
- user-specific query data where not needed.

## 38.3 Partner isolation

Licensed/private datasets should support:

- separate storage prefix;
- narrower IAM;
- audit logs;
- per-source export restrictions.

---

# 39. PRIVACY

Surname MVP should minimise person data.

## 39.1 P0 rule

Historical corpus connectors search **surname occurrence**, not living people.

Do not ingest broad person records simply because a source can return them.

## 39.2 Future person connectors

Family Origin / Deep Research will require:

- user/private research context;
- stricter retention;
- living/deceased distinction;
- private indexing;
- access logging;
- deletion workflows.

Keep these outside public surname SEO.

---

# 40. STANDARD CONNECTOR IMPLEMENTATION TEMPLATE

Every connector spec/repository README should contain:

```markdown
# CONNECTOR — [NAME]

## Purpose
## Provider / owner
## Internal source_id
## Connector type
## Production status
## Access method
## Authentication
## Supported operations
## Geographic scope
## Temporal scope
## Source schema
## Known versions
## Rights profile
## Commercial-use status
## Attribution
## Local-cache policy
## Refresh / sync
## Rate limits
## Request mapping
## Response mapping
## Raw-ingest policy
## SourceRecord mapping
## Candidate fields emitted
## Error taxonomy
## Retry policy
## Health check
## Observability
## Fixtures
## Contract tests
## Security
## Known limitations
## Escalation/contact
```

No connector reaches `ACTIVE` without this information.

---

# 41. CONNECTOR TESTING

## 41.1 Contract tests

Ensure implementation conforms to standard connector interface.

## 41.2 Fixture tests

Provider responses → expected SourceRecords.

## 41.3 Mapping tests

Raw values remain preserved.

## 41.4 Rights tests

Examples:

```text
metadata allowed / image prohibited
commercial unknown
cache prohibited
expired profile
```

## 41.5 Failure tests

- 429;
- 500;
- timeout;
- auth failure;
- malformed JSON/XML;
- empty valid result;
- provider unavailable.

## 41.6 Schema drift tests

Stored old/current fixture comparison.

## 41.7 Golden record

Each connector has a tiny fixed set of provider records expected to map deterministically.

Do not use famous surnames as the only regression fixtures.

---

# 42. SOURCE FIXTURE SET

Minimum standard fixtures:

```text
valid_record
valid_unicode_record
missing_optional
missing_required
unknown_enum
changed_schema
invalid_date
invalid_coordinate
rights_open
rights_restricted
rights_unknown
duplicate_exact
possible_duplicate
no_results
rate_limited
auth_failed
provider_500
partial_page
withdrawn_record
```

Archive/OCR sources additionally:

```text
ocr_exact_match
ocr_low_confidence
ocr_false_positive
hyphenated_match
multi_column_match
historical_spelling
```

---

# 43. FIRST IMPLEMENTATION ORDER

Recommended sequence:

## Stage 0 — framework

1. `sources` registry data;
2. `rights_profiles`;
3. connector interface;
4. connector runtime/context;
5. raw object store;
6. `raw_ingests`;
7. schema/semantic validator framework;
8. rate-limit manager;
9. connector health metrics;
10. fixtures/test harness.

## Stage 1 — deterministic current data

11. PESEL;
12. TERYT;
13. GUS geocoder.

## Stage 2 — global/historical place stack

14. GeoNames;
15. Wikidata;
16. Getty TGN.

## Stage 3 — historical evidence

17. Polona.

At this point run the first complete surname vertical slice.

## Stage 4 — breadth

18. Europeana;
19. FBC after live technical/rights verification;
20. OpenHistoricalMap.

## Parallel business track

- IJP PAN agreement;
- PTG agreement.

---

# 44. FIRST VERTICAL SLICE CONNECTORS

Use only 4 connectors initially.

## 1. PESEL

Proves current surname data.

## 2. TERYT

Provides canonical Polish geography.

## 3. GUS geocoder

Provides place-resolution support.

## 4. Polona

Provides a real historical corpus.

Optional fifth:

## 5. GeoNames

Useful if the first surname test set includes foreign/historical place ambiguity.

### Why not 10 sources immediately?

The first proof should test:

```text
CURRENT DATA
+
PLACE INFRASTRUCTURE
+
HISTORICAL SOURCE
+
RIGHTS
+
PROVENANCE
```

before adding breadth.

---

# 45. PARTNERSHIP ROADMAP

## P0 — IJP PAN

### Value

Highest Poland-specific onomastic value.

### Ask

- structured access;
- commercial use;
- cache;
- derivative claims;
- citation;
- update feed.

### Fallback

Lawful scholarly sources + `INSUFFICIENT_DATA` when evidence is absent.

Never LLM guessing.

## P1 — PTG

### Value

Historical index depth.

### Ask

- surname-level aggregate/search;
- stable record IDs;
- parish/place/date metadata;
- later person-level API;
- commercial derived report rights.

### Fallback

Open cultural heritage / archive catalogues.

## P2 — FamilySearch

### Value

Global person-level family research.

### Timing

After surname MVP is stable.

## P2 — JRI-Poland

### Value

Targeted Jewish genealogy / Polish diaspora use cases.

### Requirement

Written commercial permission/partnership.

---

# 46. DO-NOT-SCRAPE REGISTER

| Source | Current reason | Automated product status | Allowed alternative |
|---|---|---|---|
| GenBaza | Terms explicitly restrict mass automation/download and commercial reuse absent permission | **BLOCKED** | Written agreement; human browsing within terms |
| Ancestry | Terms prohibit automated/programmatic acquisition beyond intended use | **BLOCKED** | Formal partnership |
| MyHeritage | Terms prohibit AI/bot harvesting/scraping | **BLOCKED** | Formal partnership |
| Findmypast | Terms prohibit systematic scraping/programmatic database extraction | **BLOCKED** | Partnership/licensed route |
| Geneanet | Robots/automatic access prohibited; commercial-use restrictions | **BLOCKED** | Partnership |
| JRI-Poland | Commercial use requires prior permission | **PARTNER ONLY** | Written commercial agreement |
| PTG/Geneteka | Protected DB; substantial extraction/reuse reserved | **PARTNER ONLY** | Written agreement/API/export |
| IJP PAN | Public read access but commercial bulk rights not established | **PARTNER ONLY** | Licence/bulk/API agreement |
| Grobonet | No approved product-ingestion basis established | **LEGAL REVIEW** | Provider agreement |

This register is stored in SourceRegistry and enforced by the connector manager.

---

# 47. BUILD VS OPEN DATA VS PARTNER VS MANUAL

| Capability | Strategy |
|---|---|
| Current national surname counts | **OPEN DATA — PESEL** |
| Current regional surname distribution | **PARTNER / LICENSE** unless another approved source is found |
| Polish place identity | **OPEN DATA — TERYT/GUS** |
| Global place identity | **OPEN DATA — GeoNames/Wikidata** |
| Historical place context | **OPEN DATA — Getty/OHM + sources** |
| Polish etymology | **PARTNER IJP PAN** + lawful scholarly fallback |
| Historical surname occurrence | **BUILD on rights-cleared open cultural sources** |
| Historical variants | **BUILD evidence layer**, sources open/partner |
| OCR | **Provider OCR first**, own OCR only where source rights allow |
| Archive discovery | **OPEN/INSTITUTIONAL + later partners** |
| Person genealogy | **PARTNER / LATER** |
| Heraldry | **MANUAL/SPECIALIST/LATER** |
| Ancestor verification | **HUMAN + evidence engine later** |

---

# 48. COST MODEL

## Fixed

- database;
- object storage;
- monitoring;
- scheduled workers;
- legal/rights review;
- connector maintenance.

## Per request

- external API quota;
- premium provider calls;
- geocoding where paid plan later applies.

## Per ingest

- bandwidth;
- parser workers;
- validation;
- indexing.

## Per record/page

- OCR if Name Atlas runs its own OCR;
- embeddings if ever justified;
- image processing.

## Partnership

- IJP PAN licence;
- PTG data access;
- FamilySearch/other contractual integration;
- commercial genealogy providers.

## Cost-control principle

Precompute/cache:

- current surname counts;
- current place registries;
- common historical place mappings.

Do on demand:

- long-tail historical searches;
- deep report enrichment.

---

# 49. FAILURE CONTRACT TO PRODUCT

The connector layer returns structured source-state, not prose.

Canonical states:

```text
AVAILABLE
NO_RESULT
SOURCE_UNAVAILABLE
RIGHTS_BLOCKED
STALE
PARTIAL
NOT_SUPPORTED
NOT_QUERIED
SCHEMA_CHANGED
AUTH_REQUIRED
RATE_LIMITED
```

## Definitions

### AVAILABLE

Query completed and usable records exist.

### NO_RESULT

Source was successfully queried within stated scope and returned none.

### SOURCE_UNAVAILABLE

Technical failure prevented valid conclusion.

### RIGHTS_BLOCKED

Data exists/may exist but cannot be used on requested surface.

### STALE

Data exists but freshness threshold for the requested claim is exceeded.

### PARTIAL

Only part of intended query/sync succeeded.

### NOT_SUPPORTED

Connector/source cannot answer that question.

### NOT_QUERIED

Workflow did not query the source.

### SCHEMA_CHANGED

Connector cannot safely parse current provider response.

### AUTH_REQUIRED

Credentials/partner access unavailable.

### RATE_LIMITED

Request postponed/failed due to provider quota.

Coverage Engine later converts these states into user/product availability.

---

# 50. OUTPUT CONTRACT TO PROMPT 13 AND PROMPT 14

## 50.1 To Prompt 13 — Surname Resolution Engine

Connector layer provides:

```json
{
  "source_record_id": "...",
  "source_id": "...",
  "raw_name_forms": [],
  "source_native_normalised_fields": {},
  "script": null,
  "language_hint": null,
  "place_texts": [],
  "place_external_ids": [],
  "dates": [],
  "external_record_id": "...",
  "record_type": "...",
  "provenance": {},
  "rights_profile_id": "...",
  "authority_class": "..."
}
```

Prompt 13 determines:

- canonical surname entity;
- search candidates;
- exact/variant/fuzzy relationships;
- transliteration;
- resolution status.

## 50.2 To Prompt 14 — Evidence & Claim Engine

Connector layer provides:

```text
Source
SourceRecord
DigitalAsset references
raw/supporting fields
source authority metadata
rights
provenance
retrieval state
candidate dates/places/forms
```

Prompt 14 determines:

- EvidenceItems;
- ClaimEvidence edges;
- Claims;
- confidence;
- conflicts.

Connector layer must not pre-decide those conclusions.

---

# 51. FINAL CONNECTOR ARCHITECTURE

```text
                           NAME ATLAS
                               │
                     ┌─────────▼─────────┐
                     │  SOURCE REGISTRY  │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │  RIGHTS REGISTRY  │
                     └─────────┬─────────┘
                               │
                     ┌─────────▼─────────┐
                     │ CONNECTOR MANAGER │
                     └─────────┬─────────┘
                               │
          ┌────────────────────┼─────────────────────┐
          │                    │                     │
          ▼                    ▼                     ▼
    BULK / OPEN API       ARCHIVAL APIs        PARTNER SOURCES
 PESEL/TERYT/GeoNames    Polona/Europeana       IJP/PTG/later
          │                    │                     │
          └────────────────────┼─────────────────────┘
                               ▼
                         RAW INGEST STORE
                               │
                               ▼
                     TRANSPORT VALIDATION
                               │
                               ▼
                       SCHEMA VALIDATION
                               │
                               ▼
                         RIGHTS CHECK
                               │
                               ▼
                      VERSIONED MAPPING
                               │
                               ▼
                         SOURCE RECORDS
                               │
                 ┌─────────────┴─────────────┐
                 ▼                           ▼
          DIGITAL ASSETS              CANDIDATE FIELDS
                 │                           │
                 └─────────────┬─────────────┘
                               ▼
                           PROVENANCE
                               │
                               ▼
                SURNAME RESOLUTION ENGINE
                               │
                               ▼
                   EVIDENCE / CLAIM ENGINE
```

---

# 52. CONNECTORS TO BUILD FIRST

1. SourceRegistry.
2. RightsRegistry.
3. Connector interface/runtime.
4. RawIngest store.
5. Generic schema-validation framework.
6. PESEL connector.
7. TERYT connector.
8. GUS geocoder connector.
9. Polona connector.
10. GeoNames connector.

Then:

11. Wikidata.
12. Getty TGN.
13. Europeana.
14. FBC after verification.
15. OpenHistoricalMap.

---

# 53. PARTNERSHIPS TO START NOW

## 1. IJP PAN

Do not wait until frontend launch.

This relationship determines whether Polish etymology/origin can reach the intended quality.

## 2. PTG

Start in parallel, even if person-level genealogy is post-MVP.

A structured agreement can materially improve historical coverage and later Family Origin.

---

# 54. SOURCES TO BLOCK NOW

Set `production_status = BLOCKED` for automated ordinary-web access to:

- GenBaza;
- Ancestry;
- MyHeritage;
- Findmypast;
- Geneanet.

Set `PARTNERSHIP_REQUIRED` for:

- IJP PAN;
- PTG;
- JRI-Poland.

FamilySearch:

```text
PARTNERSHIP_REQUIRED / LATER
```

until compatibility/production approval exists.

---

# 55. BIGGEST DATA RISKS

## Risk 1 — confusing technical access with legal permission

**Mitigation:** RightsProfile gate enforced before connector activation.

## Risk 2 — current map promise without current regional data

**Mitigation:** map is conditional; source/date explicit.

## Risk 3 — archive OCR false positives

**Mitigation:** preserve OCR status; later Evidence Engine must validate.

## Risk 4 — duplicate cultural objects across aggregators

**Mitigation:** canonical source-record clustering and cross-provider IDs.

## Risk 5 — provider schema drift

**Mitigation:** fail closed, fixtures, fingerprints, alerts.

## Risk 6 — partner dependency blocks etymology

**Mitigation:** launch with conditional onomastics; never hallucinate.

## Risk 7 — stale rights

**Mitigation:** rights review dates, expiry alerts, paid-surface blocking.

## Risk 8 — quota becomes production dependency

**Mitigation:** bulk/local ingest for high-frequency reference data.

## Risk 9 — raw storage violates terms

**Mitigation:** `local_cache` is an enforceable permission, not assumption.

## Risk 10 — source withdrawal

**Mitigation:** source/record lifecycle states and report reproducibility.

---

# 56. DEFINITION OF CONNECTOR LAYER READY

The Source Connector Layer is MVP-ready when all of the following are true:

### Registry

- every production source has a SourceRegistry entry;
- every production source has a reviewed RightsProfile;
- blocked sources cannot execute.

### Runtime

- connectors implement common contract;
- raw ingest is versioned;
- mapping versions are recorded;
- source failures are typed.

### Data

- PESEL snapshot imports successfully;
- TERYT is locally queryable;
- GUS place lookup works;
- at least one real historical source returns source-backed occurrence candidates.

### Rights

- paid-surface use cannot consume `commercial_use = UNKNOWN`;
- restricted images cannot leak into reports;
- attribution metadata is available.

### Quality

- schema drift fails closed;
- duplicate source objects can be detected;
- provenance is reversible;
- connector fixtures pass.

### Operations

- health dashboard exists;
- rate limits are respected;
- source freshness is monitored;
- failures produce `PARTIAL/SOURCE_UNAVAILABLE`, not false absence.

### Product proof

The system can execute:

```text
SURNAME INPUT
↓
PESEL
+
PLACE STACK
+
POLONA
↓
SourceRecords
↓
provenance + rights
↓
handoff to Resolution Engine
```

for the first golden surname set.

---

# 57. QUESTIONS FOR PROMPT 13 — SURNAME RESOLUTION ENGINE

Prompt 13 must now resolve the following without pushing the responsibility back into connectors:

1. What is the exact canonical-key strategy?
2. How are Unicode NFC/NFKC choices handled?
3. How are Polish diacritics handled for lookup without altering display form?
4. How are masculine/feminine Polish surname forms linked?
5. How are hyphenated/double surnames handled?
6. When does a source form become a `NameForm` attached to a canonical `Surname`?
7. When does it remain only a search candidate?
8. How are Cyrillic transliterations represented?
9. How are Germanised/anglicised migration adaptations represented?
10. What fuzzy algorithms generate candidates?
11. How is fuzzy similarity prevented from becoming historical evidence?
12. How are multiple plausible canonical surname entities returned?
13. How does resolution use source authority?
14. How does place/time context affect variant resolution?
15. How are PESEL forms reconciled with historical source forms?
16. How are OCR variants handled?
17. How are resolution decisions versioned and audited?
18. When is human review required?
19. What exact `SurnameResolution` object is returned?
20. What test corpus proves resolution quality?

The connector layer provides inputs.

Prompt 13 determines identity.

---

# 58. IMPLEMENTATION RECOMMENDATION

Do not begin by coding ten external integrations.

Build this path first:

```text
SOURCE REGISTRY
↓
RIGHTS REGISTRY
↓
CONNECTOR SDK
↓
RAW INGEST
↓
PESEL
↓
TERYT
↓
GUS
↓
POLONA
↓
PROVENANCE
↓
SOURCE-LAYER JSON
```

Then run real surname cases.

Only after that works should Name Atlas add Europeana/FBC/Getty/OHM breadth.

The most valuable engineering outcome of Prompt 12 is not “many sources connected”.

It is:

> **A source can enter Name Atlas only through a versioned, rights-aware, provenance-preserving contract, and downstream systems can always tell the difference between no evidence, a failed source, stale evidence and evidence that legally cannot be used.**

That property is what makes the later Evidence Engine, premium report and Family Research layers trustworthy.
