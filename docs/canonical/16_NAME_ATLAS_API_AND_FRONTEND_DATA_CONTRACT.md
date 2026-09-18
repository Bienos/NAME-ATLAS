# NAME ATLAS — API & FRONTEND DATA CONTRACT

**Document:** 16. API & Frontend Data Contract  
**Version:** 1.0.0 — Contract Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md`, `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`, `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md`, `13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md`, `14_NAME_ATLAS_EVIDENCE_AND_CLAIM_ENGINE.md`, `15_NAME_ATLAS_RUNTIME_ORCHESTRATION.md`  
**Next:** `17_NAME_ATLAS_GOLDEN_TEST_CORPUS_AND_QA.md`

---

# 0. PURPOSE, AUTHORITY AND CONTRACT PHILOSOPHY

This document defines the production boundary between the Name Atlas frontend and the canonical application/runtime designed in Documents 10–15.

It answers:

> **What may the browser ask for, what may the backend return, how are progressive/partial results represented, how is asynchronous research observed, what data is safe to cache or expose publicly, and how do free, premium and private resources remain technically separated?**

The frontend must never need to know:

- which connector produced a fact;
- which BullMQ queue executed a module;
- raw SourceRecord payloads;
- internal EvidenceItem structure;
- raw Claim graphs;
- prompt text;
- LLM provider details;
- source credentials;
- rights-registry internals;
- database table layout.

The browser consumes **stable presentation projections**, not backend persistence objects.

The architectural chain is:

```text
CANONICAL DOMAIN
↓
PROJECTION BUILDERS
↓
APPLICATION API
↓
BFF / PUBLIC CONTRACT
↓
FRONTEND STATE
↓
UI
```

The most important boundary is:

```text
backend owns truth
frontend owns presentation
```

---

# 1. EXECUTIVE API ARCHITECTURE

## 1.1 Recommended P0 architecture

```text
Browser
  │
  ▼
Next.js App Router
  │
  ├── Server Components / SSR public surname pages
  │
  └── thin same-origin BFF Route Handlers
           │
           ▼
     Application API / services
           │
           ▼
      Runtime from Prompt 15
           │
           ▼
     Canonical PostgreSQL
```

Asynchronous progression:

```text
Initial REST response
+
SSE stream while research is active
+
conditional-GET polling fallback
```

## 1.2 Public transport choice

Use:

> **REST + JSON + OpenAPI-compatible schemas + SSE for server→browser research updates.**

Do not use GraphQL or WebSockets in P0.

## 1.3 Contract source

Recommended codebase arrangement:

```text
packages/contracts
    ↓
Zod 4 runtime schemas
    ↓
JSON Schema artifacts
    ↓
OpenAPI document
    ↓
generated/derived TypeScript client types
```

Zod 4 supports native JSON Schema conversion. The current OpenAPI specification is 3.2.1, published 10 September 2026. For P0, Name Atlas should target the newest OpenAPI version fully supported by the selected generator/toolchain rather than forcing a brand-new spec revision before tooling is proven.

The **contract semantics** in this document are canonical; exact generator choice is implementation detail.

---

# 2. API STYLE DECISION

## 2.1 REST — CHOSEN

Advantages:

- simple stable resource model;
- native HTTP semantics;
- easy CDN/browser caching;
- ETag/304 support;
- natural anonymous/public routes;
- straightforward mobile/native client later;
- easy OpenAPI contract generation;
- simple entitlement checks;
- well suited to SEO/public profile reads.

## 2.2 GraphQL — NOT P0

Potential advantages:

- client-selected fields;
- strong graph querying.

Not needed because:

- frontend should **not** freely query the internal evidence graph;
- projection shapes are product-controlled;
- most user-facing resources are coherent documents, not arbitrary graph traversals;
- caching becomes more complex.

## 2.3 tRPC / internal RPC

Excellent for tightly coupled TypeScript monorepos, but using it as the only network contract would couple future native/external consumers too closely to the current TypeScript implementation.

It can be used internally if engineering prefers, but the public/BFF contract remains normal HTTP resources.

## 2.4 WebSockets

Not needed.

Name Atlas async updates are overwhelmingly:

```text
server → client
```

SSE is simpler.

## 2.5 Final

```text
REST/JSON
+
typed schemas
+
SSE
+
conditional polling fallback
```

---

# 3. BFF DECISION

Use a **thin same-origin Next.js BFF**.

```text
Browser
↓
nameatlas.com/api/*
↓
internal application layer
```

## 3.1 BFF responsibilities

Allowed:

- cookie/session handling;
- CSRF protection;
- entitlement context;
- request correlation;
- browser-safe error mapping;
- response headers;
- SSE proxy/stream;
- API rate-limit boundary.

Forbidden:

- surname resolution logic;
- Claim interpretation;
- premium eligibility calculation;
- confidence calculation;
- source selection;
- duplicating canonical business logic.

## 3.2 Why same-origin

Benefits:

- simpler secure cookies;
- no ordinary CORS complexity;
- EventSource works naturally with same-origin session context;
- hides internal service topology;
- easier future magic-link/report access.

---

# 4. NEXT.JS ROLE

Current Next.js App Router Route Handlers support standard HTTP methods and native Web Request/Response APIs.

Important current behavior:

> Route Handlers are not automatically cached by default in the current Next.js model; explicit caching should be applied where appropriate.

Name Atlas therefore treats HTTP caching policy as intentional contract behavior rather than framework magic.

Next.js streaming/Suspense may improve page rendering, but it does not replace the Name Atlas research-status SSE contract.

---

# 5. API VERSIONING

Browser contract:

```text
/api/v1/
```

Public major versions represent breaking transport changes.

Do not expose internal workflow/module semantic versions in URL.

Distinguish:

```text
API version
projection_schema_version
profile_version
report_version
workflow_version
```

Example response metadata:

```json
{
  "schema_version": "1.0",
  "profile_version": "01K..."
}
```

`workflow_version` remains internal unless required for support/debug.

---

# 6. RESOURCE MODEL

P0 browser-facing resources:

```text
SurnameSearch
SurnameResolution
SurnameProfile
ResearchRunView
Report
CheckoutSession boundary
```

`Coverage`, `DiscoveryIndex`, `PremiumEligibility`, citations and research status are usually nested projections rather than separate primary HTTP resources.

This intentionally reduces endpoint count.

---

# 7. P0 ENDPOINT INVENTORY

Recommended minimum:

```http
POST /api/v1/surname-searches

PUT  /api/v1/surname-searches/{search_id}/resolution

GET  /api/v1/surnames/{surname_id}/profile

GET  /api/v1/research-runs/{research_run_id}

GET  /api/v1/research-runs/{research_run_id}/events

POST /api/v1/checkout-sessions

GET  /api/v1/reports/{report_id}
```

Optional P0 only if report retrieval would otherwise be awkward:

```http
GET /api/v1/reports/{report_id}/access
```

Do **not** add a separate DiscoveryIndex endpoint in P0. The public-safe Discovery summary belongs in the profile projection.

---

# 8. SEARCH ENTRY

## Endpoint

```http
POST /api/v1/surname-searches
```

## Request

```json
{
  "surname": "Cichowski",
  "locale": "pl-PL",
  "country": "PL"
}
```

Optional P1:

```json
{
  "place_context": null,
  "intent": null
}
```

No family data in the basic search contract.

---

# 9. SEARCH REQUEST SCHEMA

```ts
interface SurnameSearchRequest {
  surname: string;
  locale: SupportedLocale;
  country: CountryCode;
}
```

Backend is authoritative for:

- Unicode normalization;
- script detection;
- surname resolution;
- gender relations;
- fuzzy suggestions.

Frontend may only do basic UX checks:

```text
empty
obvious max form length
```

and must still send the raw user string.

---

# 10. SEARCH RESPONSE MODEL

A surname search has four normal business outcomes:

```text
RESOLVED_READY
RESOLVED_RESEARCHING
RESOLUTION_REQUIRED
UNRESOLVED
```

These are not HTTP errors.

---

# 11. SEARCH — CACHE HIT

If surname resolves and a usable profile already exists:

```http
200 OK
```

Example:

```json
{
  "search_id": "srch_...",
  "resolution": {
    "outcome": "RESOLVED",
    "surname": {
      "id": "019...",
      "display_name": "Cichowski",
      "slug": "cichowski"
    },
    "match_type": "EXACT_CANONICAL"
  },
  "result": {
    "state": "READY",
    "profile_url": "/api/v1/surnames/019.../profile",
    "canonical_path": "/pl/nazwisko/cichowski"
  },
  "research": null
}
```

---

# 12. SEARCH — RESEARCH STARTED

If resolution succeeds but no usable profile exists:

```http
202 Accepted
```

```json
{
  "search_id": "srch_...",
  "resolution": {
    "outcome": "RESOLVED",
    "surname": {
      "id": "019...",
      "display_name": "Cichowski",
      "slug": "cichowski"
    },
    "match_type": "EXACT_CANONICAL"
  },
  "result": {
    "state": "RESEARCHING",
    "profile_url": "/api/v1/surnames/019.../profile"
  },
  "research": {
    "research_run_id": "019...",
    "status_url": "/api/v1/research-runs/019...",
    "events_url": "/api/v1/research-runs/019.../events"
  }
}
```

---

# 13. SEARCH — SUGGESTION REQUIRED

Expected business state:

```http
200 OK
```

not `409`.

```json
{
  "search_id": "srch_...",
  "resolution": {
    "outcome": "SUGGESTION_REQUIRED",
    "raw_input": "Cichwoski",
    "candidates": [
      {
        "surname_id": "019...",
        "display_name": "Cichowski",
        "reason": "TYPO_CANDIDATE",
        "context_hint": null
      }
    ]
  },
  "result": null,
  "research": null
}
```

Do not expose:

```text
trigram_similarity = 0.927
```

to consumer UI.

---

# 14. MULTIPLE CANDIDATES

```json
{
  "resolution": {
    "outcome": "MULTIPLE_CANDIDATES",
    "raw_input": "...",
    "candidates": [
      {
        "surname_id": "...",
        "display_name": "...",
        "reason": "DIACRITIC_ALTERNATIVE",
        "context_hint": "Poland"
      }
    ]
  }
}
```

Candidate presentation may expose:

```text
country/language context
exact alternative spelling
```

only if canonically supported.

---

# 15. UNRESOLVED SEARCH

```http
200 OK
```

```json
{
  "search_id": "...",
  "resolution": {
    "outcome": "UNRESOLVED",
    "raw_input": "...",
    "normalized_display": "...",
    "candidates": []
  },
  "next_actions": [
    "CHECK_SPELLING",
    "ADD_COUNTRY_CONTEXT"
  ]
}
```

No fake SurnameProfile is created.

No paywall.

---

# 16. RESOLUTION CONFIRMATION

Use idempotent HTTP semantics:

```http
PUT /api/v1/surname-searches/{search_id}/resolution
```

Request:

```json
{
  "surname_id": "019..."
}
```

PUT is naturally retryable for setting one selected resolution.

Response follows the same resolved-ready/researching structure as the original search.

---

# 17. SEARCH IDENTIFIER

`search_id` represents the interaction/session search.

It is not content identity.

After canonical resolution:

```text
Surname ID
```

is the content identity.

The canonical browser route should transition to the surname page.

---

# 18. ID VS SLUG

## Browser / SEO

```text
/pl/nazwisko/cichowski
/en/surname/cichowski
```

## API identity

```http
GET /api/v1/surnames/{surname_id}/profile
```

Why:

- spelling/display can evolve;
- slug collisions exist globally;
- transliteration can change;
- UUID remains stable;
- redirects are manageable.

The profile DTO provides canonical slug/path.

---

# 19. SURNAME PROFILE RESOURCE

```http
GET /api/v1/surnames/{surname_id}/profile
```

The resource is a **presentation projection**, not canonical domain persistence.

It is safe for frontend rendering.

---

# 20. TOP-LEVEL PROFILE DTO

Recommended:

```ts
interface SurnameProfileResponse {
  schema_version: string;
  profile_version: string;
  request_id: string;

  surname: PublicSurnameIdentity;
  research: PublicResearchState;

  coverage: CoverageDTO;
  chapters: ProfileChapterDTO[];

  discovery: DiscoveryPreviewDTO;
  premium: PremiumEligibilityDTO;

  citations: CitationDTO[];
  limitations: LimitationDTO[];

  seo: PublicSeoMetadata;

  generated_at: string;
  updated_at: string;
}
```

Do not put internal EvidenceItems in this response.

---

# 21. PUBLIC SURNAME IDENTITY

```ts
interface PublicSurnameIdentity {
  id: string;
  display_name: string;
  canonical_slug: string;
  canonical_path: string;
  script: string;
}
```

Potential P1:

```text
accepted modern display forms
```

Do not expose all internal resolver forms.

---

# 22. PROFILE CHAPTER ARCHITECTURE

Use typed chapters.

Core IDs:

```text
TODAY
WHERE
MEANING
ORIGIN
HISTORY
EVIDENCE
```

Optional:

```text
ARCHIVES
MOVEMENT
```

Chapters are adaptive.

No empty fake cards.

---

# 23. SECTION / CHAPTER STATE

Frontend enum:

```ts
type SectionState =
  | "READY"
  | "PROCESSING"
  | "PARTIAL"
  | "UNAVAILABLE"
  | "SOURCE_UNAVAILABLE"
  | "RIGHTS_BLOCKED"
  | "NOT_APPLICABLE";
```

`NOT_RESEARCHED` remains primarily internal.

If user-facing research has intentionally not begun:

```text
PROCESSING
```

only when a real job exists.

Otherwise omit the chapter or return `UNAVAILABLE` with a safe reason.

---

# 24. CHAPTER CONTRACT

```ts
interface ProfileChapterBase {
  id: ChapterId;
  state: SectionState;
  access: "FREE" | "PREMIUM_PREVIEW";
  confidence_summary?: ConfidenceSummaryDTO;
  updated_at?: string;
}
```

Concrete chapters use typed payloads rather than one unbounded `data: any`.

---

# 25. POPULATION CHAPTER

```ts
interface PopulationChapterDTO extends ProfileChapterBase {
  id: "TODAY";
  population: PopulationValueDTO;
  rank?: RankedValueDTO;
  source_date?: string;
  citation_ids: string[];
}
```

---

# 26. POPULATION VALUE

Do not overload `null`.

```ts
type NumericValueStatus =
  | "KNOWN"
  | "SUPPRESSED"
  | "NOT_AVAILABLE"
  | "NOT_APPLICABLE";

interface PopulationValueDTO {
  status: NumericValueStatus;
  value: number | null;
  unit: "PEOPLE";
  scope_label_code: string;
}
```

Example suppressed:

```json
{
  "status": "SUPPRESSED",
  "value": null,
  "unit": "PEOPLE",
  "scope_label_code": "PESEL_PUBLICATION_THRESHOLD"
}
```

Never:

```json
{"value": 0}
```

for suppressed values.

---

# 27. RARITY CONTRACT

Use structured methods.

```ts
interface RarityDTO {
  primary: {
    metric: "ONE_IN_X" | "RANK" | "PERCENTILE";
    value: number;
  };
  supporting: Array<{
    metric: "ONE_IN_X" | "RANK" | "PERCENTILE";
    value: number;
  }>;
  methodology_code: string;
}
```

Do not expose arbitrary `87/100`.

---

# 28. MODERN GEOGRAPHY CHAPTER

```ts
interface GeographyChapterDTO extends ProfileChapterBase {
  id: "WHERE";
  map?: MapLayerDTO;
  strongest_regions?: PlaceStatDTO[];
  source_date?: HistoricalDateDTO;
  citation_ids: string[];
}
```

If there is no approved current regional source:

```text
state = UNAVAILABLE
```

Do not return fabricated empty map features.

---

# 29. MEANING CHAPTER

```ts
interface MeaningChapterDTO extends ProfileChapterBase {
  id: "MEANING";
  summary?: LocalizedNarrative;
  surname_classification?: string;
  roots?: RootDTO[];
  evidence_summary?: EvidenceSummaryDTO;
}
```

Generated prose is localized/backend-generated.

Core taxonomy codes remain language-neutral.

---

# 30. ORIGIN CHAPTER

```ts
interface OriginChapterDTO extends ProfileChapterBase {
  id: "ORIGIN";
  hypotheses: OriginHypothesisDTO[];
  evidence_summary: EvidenceSummaryDTO;
}
```

Multiple hypotheses are first-class.

Do not flatten to one “country of origin” if backend has conflict/alternatives.

---

# 31. ORIGIN HYPOTHESIS DTO

```ts
interface OriginHypothesisDTO {
  hypothesis_id: string;
  kind: "LINGUISTIC" | "GEOGRAPHIC" | "TOPONYMIC" | "MIXED";
  confidence: ConfidenceDTO;
  summary: LocalizedNarrative;
  place_refs?: PublicPlaceRef[];
  citation_ids: string[];
}
```

No internal weighting score.

---

# 32. HISTORY CHAPTER

Free chapter may expose only eligible preview data:

```ts
interface HistoryChapterDTO extends ProfileChapterBase {
  id: "HISTORY";
  earliest_found?: EarliestFoundDTO;
  free_variants: HistoricalVariantPreviewDTO[];
  occurrence_preview: HistoricalOccurrencePreviewDTO[];
  additional_inventory?: DiscoveryInventoryCountsDTO;
}
```

Do not include locked full premium arrays.

---

# 33. EVIDENCE CHAPTER

```ts
interface EvidenceChapterDTO extends ProfileChapterBase {
  id: "EVIDENCE";
  source_summary: SourceSummaryDTO;
  claim_summaries: PublicClaimSummaryDTO[];
  conflicts: ConflictSummaryDTO[];
  limitations: LimitationDTO[];
}
```

No raw SourceRecord payloads.

---

# 34. DOMAIN → PROJECTION RULE

Example:

```text
OriginHypothesis canonical objects
+
Claims
+
ClaimEvidence
+
ConfidenceAssessment
+
Citations
+
SurfaceEligibility
↓
OriginChapterDTO
```

Projection builder decides what is browser-safe.

Frontend never reconstructs a Claim graph.

---

# 35. CONFIDENCE DTO

Canonical enum:

```ts
type ConfidenceStatus =
  | "VERIFIED"
  | "LIKELY"
  | "POSSIBLE"
  | "UNCONFIRMED"
  | "CONFLICTING"
  | "INSUFFICIENT_DATA";
```

Frontend owns standard localized label:

```text
Likely / Prawdopodobne
```

Backend may optionally supply evidence-specific explanation text.

```ts
interface ConfidenceDTO {
  status: ConfidenceStatus;
  explanation?: LocalizedNarrative;
  methodology_code?: string;
}
```

Do not transmit internal probability.

---

# 36. LOCALIZATION DECISION

Use a hybrid model.

## Frontend localizes

- standard chapter titles;
- enums;
- buttons;
- labels;
- number/date formatting;
- status copy.

## Backend returns localized content for

- LLM/generated narrative;
- evidence-specific explanation;
- source-derived translated summary where generated.

Knowledge remains locale-neutral.

---

# 37. LOCALIZED NARRATIVE

```ts
interface LocalizedNarrative {
  locale: SupportedLocale;
  text: string;
  content_version: string;
}
```

Do not return arbitrary HTML.

---

# 38. EVIDENCE SUMMARY DTO

```ts
interface EvidenceSummaryDTO {
  supporting_evidence_count: number;
  independent_source_groups: number;
  conflicting_evidence_count: number;
  citation_ids: string[];
  limitations: LimitationDTO[];
}
```

Do not expose:

```text
source_score = 82
```

---

# 39. WHY-WE-THINK-THIS

For expandable user trust UI:

```ts
interface PublicClaimSummaryDTO {
  claim_id: string;
  type: string;
  confidence: ConfidenceDTO;
  explanation?: LocalizedNarrative;
  evidence: EvidenceSummaryDTO;
  last_reviewed_at?: string;
}
```

This is a projection, not raw Claim.

---

# 40. CITATION DTO

```ts
interface CitationDTO {
  id: string;
  title: string;
  publisher?: string;
  publication_date?: HistoricalDateDTO;
  source_type: string;
  locator?: string;

  url?: string;

  attribution?: string;
  access_note?: string;
}
```

If rights or source conditions do not permit direct asset linking:

```text
url may be absent
```

---

# 41. SOURCE SUMMARY

```ts
interface SourceSummaryDTO {
  total_citations: number;
  independent_source_groups: number;
  categories: SourceCategory[];
}
```

Useful categories:

```text
OFFICIAL_DATA
SCHOLARLY
ARCHIVAL
DIGITAL_LIBRARY
OTHER
```

---

# 42. COVERAGE DTO

```ts
type CoverageStatus =
  | "STRONG"
  | "PARTIAL"
  | "NONE"
  | "BLOCKED_RIGHTS"
  | "SOURCE_UNAVAILABLE"
  | "NOT_RESEARCHED";

interface CoverageDimensionDTO {
  status: CoverageStatus;
  reason_code?: string;
}
```

Profile:

```ts
interface CoverageDTO {
  population: CoverageDimensionDTO;
  modern_geography: CoverageDimensionDTO;
  etymology: CoverageDimensionDTO;
  origin: CoverageDimensionDTO;
  historical_variants: CoverageDimensionDTO;
  historical_occurrences: CoverageDimensionDTO;
  archives: CoverageDimensionDTO;
  migration: CoverageDimensionDTO;
}
```

---

# 43. RUNTIME RESEARCH DTO

Do not expose BullMQ internals.

```ts
type PublicResearchStatus =
  | "READY"
  | "RUNNING"
  | "PARTIAL_READY"
  | "REVIEW_REQUIRED"
  | "FAILED";

type ReadinessState =
  | "NONE"
  | "FREE_READY"
  | "PREMIUM_PREVIEW_READY"
  | "PREMIUM_REPORT_READY";

interface PublicResearchState {
  research_run_id?: string;
  status: PublicResearchStatus;
  readiness: ReadinessState;
  dimensions: Record<PublicResearchDimension, SectionState>;
  updated_at: string;
  events_url?: string;
}
```

---

# 44. PROGRESS STAGES

Do not expose every backend module.

Consumer stages:

```text
RESOLVING_NAME
CHECKING_CURRENT_DATA
SEARCHING_HISTORY
BUILDING_EVIDENCE
FINALISING
```

Only emit stage if real work corresponding to it exists.

No fake percentages.

No “67% complete”.

---

# 45. POLLING VS SSE

## Decision

Use:

```text
SSE primary for active browser session
+
conditional polling fallback
```

## Why SSE

- research events are server→client;
- browser EventSource handles reconnect;
- event IDs support resumability;
- simpler than WebSocket infrastructure;
- works naturally behind same-origin BFF.

## Polling fallback

Useful for:

- infrastructure where streaming is buffered;
- mobile background/reconnect;
- reduced implementation fallback;
- report status.

---

# 46. SSE ENDPOINT

```http
GET /api/v1/research-runs/{research_run_id}/events
Accept: text/event-stream
```

Authentication/authorization:

- public surname ResearchRun may use scoped opaque run access;
- private future research requires session authorization.

---

# 47. SSE EVENT FORMAT

Wire format:

```text
id: evt_01K...
event: profile.updated
data: {"research_run_id":"...","profile_version":"..."}
```

Recommended event types:

```text
research.status
research.stage
dimension.updated
profile.updated
discovery.updated
report.status
report.ready
research.failed
```

---

# 48. SSE EVENT PAYLOAD

Events are signals, not full authoritative state dumps.

Example:

```json
{
  "event_id": "evt_...",
  "research_run_id": "...",
  "occurred_at": "...",
  "profile_version": "..."
}
```

After meaningful event:

```text
frontend invalidates/refetches profile resource
```

This avoids maintaining a second full incremental state protocol.

---

# 49. SSE RECONNECT

EventSource supports event `id`, which becomes the client's last event ID and is used in reconnection semantics.

Name Atlas should retain a short event replay buffer keyed by ResearchRun.

Contract:

```text
Last-Event-ID
```

or browser-native EventSource behavior.

If replay window expired:

send:

```text
event: state.refresh_required
```

and frontend refetches the run/profile.

---

# 50. SSE INFRASTRUCTURE NOTE

Streaming support must be verified end-to-end through:

- CDN;
- reverse proxy;
- load balancer;
- Next.js hosting.

Next.js self-hosting guidance explicitly warns that intermediaries may buffer streaming responses and may require buffering to be disabled.

This must be part of deployment acceptance testing.

---

# 51. POLLING ENDPOINT

```http
GET /api/v1/research-runs/{research_run_id}
```

Return:

```json
{
  "research_run_id": "...",
  "status": "PARTIAL_READY",
  "readiness": "FREE_READY",
  "dimensions": {
    "population": "READY",
    "history": "PROCESSING"
  },
  "profile_version": "..."
}
```

---

# 52. CONDITIONAL POLLING

Return:

```http
ETag: "research-state-abc123"
```

Client:

```http
If-None-Match: "research-state-abc123"
```

Unchanged:

```http
304 Not Modified
```

HTTP semantics explicitly support `ETag` / `If-None-Match` for this cache validation pattern.

---

# 53. PROFILE ETag

Every public profile response has:

```http
ETag: "profile-{fingerprint}"
```

Fingerprint derives from the final public projection.

Unchanged profile:

```http
304 Not Modified
```

---

# 54. PARTIAL RESULTS

Frontend may render any chapter in `READY` while another remains `PROCESSING`.

Example:

```json
{
  "research": {
    "readiness": "FREE_READY",
    "dimensions": {
      "population": "READY",
      "rarity": "READY",
      "origin": "READY",
      "history": "PROCESSING",
      "archives": "SOURCE_UNAVAILABLE"
    }
  }
}
```

No whole-page blocking spinner.

---

# 55. FREE VS PREMIUM DATA SECURITY

Hard rule:

> **Never send full premium content to an unauthorized browser and rely on CSS blur, hidden DOM or JavaScript gating.**

Free profile contains:

- free facts;
- eligible preview;
- Discovery counts;
- premium chapter names;
- sample evidence explicitly approved for preview.

Full premium report content comes only from an entitlement-protected endpoint.

---

# 56. DISCOVERY PREVIEW

Keep within profile response.

```ts
interface DiscoveryPreviewDTO {
  state: "READY" | "PROCESSING" | "UNAVAILABLE";

  inventory?: DiscoveryInventoryCountsDTO;

  available_sections?: PremiumSectionPreviewDTO[];
}
```

---

# 57. DISCOVERY INVENTORY COUNTS

```ts
interface DiscoveryInventoryCountsDTO {
  historical_variants: number;
  historical_places: number;
  archive_references: number;
  migration_clues: number;
  independent_source_groups: number;
}
```

Counts originate from canonical DiscoveryIndex.

Not:

- search candidates;
- fuzzy forms;
- duplicates.

---

# 58. PREMIUM ELIGIBILITY

```ts
interface PremiumEligibilityDTO {
  eligible: boolean;
  state:
    | "ELIGIBLE"
    | "RESEARCHING"
    | "INSUFFICIENT_MEANINGFUL_CONTENT"
    | "RIGHTS_BLOCKED"
    | "NOT_AVAILABLE";

  offer?: OfferSummaryDTO;
}
```

The browser does not decide eligibility.

---

# 59. OFFER CONTRACT

```ts
interface OfferSummaryDTO {
  offer_id: string;
  product_type: "FULL_SURNAME_REPORT";
  amount_minor: number;
  currency: CurrencyCode;
  experiment_variant?: string;
}
```

Frontend formats price.

No float money.

No hardcoded `29 PLN`.

---

# 60. CHECKOUT BOUNDARY

```http
POST /api/v1/checkout-sessions
```

Request:

```json
{
  "offer_id": "...",
  "surname_id": "..."
}
```

Response:

```json
{
  "checkout_session_id": "...",
  "provider_redirect_url": "...",
  "expires_at": "..."
}
```

Payment/provider internals belong in Prompt 20.

---

# 61. CHECKOUT IDEMPOTENCY

Require:

```http
Idempotency-Key: <uuid>
```

for checkout-session creation.

Prevents double checkout creation under browser retries.

---

# 62. ENTITLEMENT MODEL

Browser never treats payment success query parameter as entitlement proof.

Canonical entitlement lives server-side.

Profile/report service checks:

```text
identity/session
+
resource
+
entitlement
```

---

# 63. REPORT RESOURCE

```http
GET /api/v1/reports/{report_id}
```

One endpoint returns both status and content based on state.

Generating:

```json
{
  "report_id": "...",
  "status": "GENERATING",
  "report_version": null,
  "sections": null
}
```

Ready:

```json
{
  "report_id": "...",
  "status": "READY",
  "report_version": "v_...",
  "generated_at": "...",
  "sections": [],
  "citations": []
}
```

No separate `/status` endpoint required in P0.

---

# 64. REPORT STATUS

```ts
type ReportStatus =
  | "NOT_STARTED"
  | "RESEARCHING"
  | "GENERATING"
  | "READY"
  | "REVIEW_REQUIRED"
  | "FAILED";
```

Internal job/queue details remain hidden.

---

# 65. REPORT AUTHORIZATION

`report_id` is never authorization.

Report request requires either:

- authenticated user/session with entitlement;
- valid signed magic-link/session grant.

Unauthorized:

```http
403 Forbidden
```

Do not rely on unguessable IDs alone.

---

# 66. REPORT VERSIONING

```ts
interface ReportIdentityDTO {
  report_id: string;
  report_version: string | null;
  updated_version_available: boolean;
}
```

Old purchased version remains immutable.

---

# 67. REPORT DELIVERY STRATEGY

P0 recommendation:

```text
structured JSON report
```

as canonical app consumption.

Optional downloadable/rendered PDF can be added later or alongside report generation.

Why:

- mobile-friendly;
- adaptive chapters;
- citations interactive;
- design system reuse;
- no need to regenerate PDF for every UI change.

Report PDF is an artifact, not canonical report truth.

---

# 68. REPORT CONTENT BLOCKS

Use bounded typed blocks.

P0:

```text
PARAGRAPH
STAT
MAP
TIMELINE
VARIANT_LIST
PLACE_LIST
SOURCE_LIST
EVIDENCE_CALLOUT
LIMITATION
```

Do not return arbitrary HTML from LLM.

---

# 69. REPORT BLOCK BASE

```ts
interface ReportBlockBase {
  block_id: string;
  type: ReportBlockType;
}
```

Example:

```ts
interface ParagraphBlock extends ReportBlockBase {
  type: "PARAGRAPH";
  content: LocalizedNarrative;
}
```

---

# 70. MAP SEMANTICS

Every map includes explicit `layer_type`.

```ts
type MapLayerType =
  | "CURRENT_DISTRIBUTION"
  | "HISTORICAL_OCCURRENCES"
  | "HISTORICAL_DISTRIBUTION"
  | "MIGRATION_HYPOTHESIS";
```

Frontend must not infer map meaning from visual geometry.

---

# 71. MAP LAYER DTO

```ts
interface MapLayerDTO {
  layer_id: string;
  layer_type: MapLayerType;
  time_scope?: HistoricalDateRangeDTO;
  source_date?: HistoricalDateDTO;
  confidence?: ConfidenceDTO;
  features: MapFeatureDTO[];
  citation_ids: string[];
}
```

---

# 72. GEOMETRY

P0:

Use GeoJSON-compatible geometry for modest surname-result datasets.

Do not embed national high-resolution polygons repeatedly.

For administrative distribution, prefer:

```text
place ID
+
value
```

with frontend/base-map geometry loaded separately where practical.

Large/global/historical layers can move to vector tiles later.

---

# 73. APPROXIMATE LOCATION

Historical evidence may only support a region.

DTO must distinguish:

```text
POINT
REGION
APPROXIMATE_POINT
```

Never manufacture pin coordinates from a region-only claim.

---

# 74. HISTORICAL DATE CONTRACT

Do not force historical uncertainty into ISO date.

```ts
type HistoricalDateDTO =
  | { precision: "EXACT_DATE"; date: string }
  | { precision: "YEAR"; year: number }
  | { precision: "CIRCA_YEAR"; year: number }
  | { precision: "RANGE"; from?: number; to?: number }
  | { precision: "BEFORE"; year: number }
  | { precision: "AFTER"; year: number }
  | { precision: "UNKNOWN" };
```

Modern system timestamps use ISO 8601 UTC.

---

# 75. PAGINATION

P1/history endpoints use cursor pagination.

Example:

```http
GET /api/v1/surnames/{id}/occurrences?cursor=...
```

Response:

```json
{
  "items": [],
  "page": {
    "next_cursor": "opaque...",
    "has_more": true
  }
}
```

Cursor is opaque.

---

# 76. WHY CURSOR PAGINATION

Historical evidence can change/reorder after enrichment.

Offset pagination is more prone to duplication/omission under changing datasets.

Cursor-based pagination maps better to stable ordering.

---

# 77. P0 LARGE-LIST STRATEGY

Do not introduce occurrence endpoint unless free/P0 UI needs many items.

P0 profile can carry a bounded preview.

Full premium lists can be chapter resources/report content.

---

# 78. ERROR ENVELOPE

Use consistent structure:

```ts
interface ApiErrorResponse {
  error: {
    code: PublicErrorCode;
    message: string;
    retryable: boolean;
    request_id: string;
    details?: Record<string, unknown>;
  };
}
```

`message` is localized or frontend-localized according to code.

Do not return stack traces.

---

# 79. PUBLIC ERROR CODES

```text
INVALID_REQUEST
INVALID_SURNAME_INPUT

SURNAME_UNRESOLVED
SURNAME_AMBIGUOUS

NOT_FOUND

SOURCE_TEMPORARILY_UNAVAILABLE
PROFILE_NOT_READY

PREMIUM_NOT_ELIGIBLE
ENTITLEMENT_REQUIRED

REPORT_NOT_READY

RATE_LIMITED

UNAUTHENTICATED
FORBIDDEN

INTERNAL_ERROR
SERVICE_UNAVAILABLE
```

Expected surname ambiguity/unresolved states normally remain successful search response states, not errors.

---

# 80. HTTP STATUS POLICY

## `200 OK`

- cache-hit search;
- resolution suggestions;
- unresolved expected outcome;
- profile GET;
- report GET ready/generating if resource exists.

## `202 Accepted`

- search resolved but new ResearchRun has started and no useful profile is yet available;
- explicit asynchronous creation operation.

## `400 Bad Request`

Malformed request syntax.

## `422 Unprocessable Content`

Well-formed request violates semantic input schema.

## `401 Unauthorized`

Authentication required/invalid.

## `403 Forbidden`

Authenticated/session identity lacks entitlement/permission.

## `404 Not Found`

Stable resource does not exist or is intentionally concealed according to security policy.

## `409 Conflict`

Use sparingly for genuine resource-state conflict, not ordinary surname ambiguity.

## `429 Too Many Requests`

Rate-limited.

Include `Retry-After` where meaningful.

## `503 Service Unavailable`

Critical temporary system dependency prevents safe fulfillment.

Optional connector outages should normally produce partial profile state, not top-level 503.

---

# 81. REQUEST CORRELATION

Every API response includes:

```http
X-Request-ID: req_...
```

JSON may also include `request_id` in error/meta.

Research resources expose:

```text
research_run_id
```

This supports user support/debugging without exposing internals.

---

# 82. IDEMPOTENCY POLICY

## `POST /surname-searches`

`Idempotency-Key` is recommended, not required.

Backend already coalesces canonical surname research.

It primarily prevents accidental duplicate interaction records/runs.

## `PUT /surname-searches/{id}/resolution`

Naturally idempotent.

## `POST /checkout-sessions`

`Idempotency-Key` required.

## future report-generation mutation

Required if exposed.

---

# 83. RATE LIMITING

Policy classes:

```text
ANONYMOUS_SEARCH
AUTHENTICATED_SEARCH
CHECKOUT
REPORT_READ
SSE_CONNECTION
```

Do not publish operational numeric thresholds in the contract unless product requires it.

Rate-limited response:

```http
429 Too Many Requests
Retry-After: 30
```

---

# 84. PUBLIC PROFILE CACHE

Recommended header pattern:

```http
ETag: "..."
Cache-Control: public, max-age=0, s-maxage=<policy>, stale-while-revalidate=<policy>
```

Exact durations are deployment policy.

Name Atlas should cache by **version/state**, not assume truth expires at arbitrary fixed intervals.

---

# 85. PRIVATE REPORT CACHE

Use secure policy, typically:

```http
Cache-Control: private, no-store
```

especially for future reports containing family-specific data.

A surname-only premium report may technically be less sensitive, but using private/no-store simplifies access guarantees.

---

# 86. CDN MATRIX

| Resource | CDN |
|---|---:|
| Public surname profile | Yes |
| Public SEO surname page | Yes |
| Public citations/source summaries | Yes where route exists |
| ResearchRun state | No shared CDN |
| SSE | No content CDN caching |
| Checkout | No |
| Entitlement | No |
| Premium report | No shared public cache |
| Family data later | Never public CDN |

---

# 87. ETag

ETag derives from projection fingerprint.

For profile:

```text
hash(public projection)
```

For ResearchRun view:

```text
hash(public runtime state)
```

`If-None-Match` returns:

```http
304 Not Modified
```

with no body when unchanged.

---

# 88. LAST-MODIFIED

May be returned alongside ETag:

```http
Last-Modified: ...
```

ETag remains preferred because projection identity is more precise than timestamps alone.

---

# 89. API RESPONSE ENVELOPE

Do not wrap every resource in generic `data`.

Return resource directly.

Example:

```json
{
  "schema_version": "1.0",
  "profile_version": "...",
  ...
}
```

For collection endpoints:

```json
{
  "items": [],
  "page": {}
}
```

This avoids unnecessary nesting.

---

# 90. COMMON META

Use common headers for:

```text
request ID
ETag
cache
```

Use body only when the metadata is semantically part of the resource:

```text
profile_version
research_run_id
generated_at
```

---

# 91. OPENAPI / SCHEMA STRATEGY

Recommended:

```text
Zod 4 schemas
= application/runtime validation source

z.toJSONSchema()
= JSON Schema artifacts

OpenAPI build step
= network documentation / client generation
```

CI checks:

1. schema generation succeeds;
2. OpenAPI artifact updated;
3. compatibility check passes;
4. API contract fixtures validate.

Do not manually maintain separate TypeScript interface + JSON Schema + OpenAPI shape.

---

# 92. OPENAPI VERSION POLICY

Current OAS latest is 3.2.1.

Name Atlas should **not** make use of a 3.2-only feature until the selected generators, validators and client tooling demonstrate support.

Recommended P0 approach:

```text
author schemas in JSON Schema 2020-12-compatible form
generate a toolchain-supported OAS 3.1.x/3.2 document
pin version in repository
```

Upgrade intentionally.

---

# 93. TYPE GENERATION

One contract package exports:

```text
runtime schemas
inferred TS types
public enum types
```

Frontend imports generated/stable contract types.

No duplicate hand-written enums such as:

```text
ConfidenceStatus
CoverageStatus
SectionState
```

---

# 94. ENUM EVOLUTION

New enum values are potentially breaking for exhaustive clients.

Policy:

- public unions require deliberate compatibility review;
- frontend default switch has safe fallback;
- truly semantic breaking change increments API/projection major version.

Never silently map a new backend status to an old false status.

---

# 95. LOCALIZATION AND ENUMS

Transport sends:

```text
"LIKELY"
```

not:

```text
"Prawdopodobne"
```

Frontend localizes standard labels.

Backend narrative content carries explicit locale.

---

# 96. NUMBER FORMATTING

API:

```json
{"value": 1234}
```

Frontend:

```text
1 234
1,234
1.234
```

according to locale.

Do not send preformatted statistical numbers as canonical values.

---

# 97. MONEY

```json
{
  "amount_minor": 2900,
  "currency": "PLN"
}
```

Never:

```json
{"price": 29.0}
```

as financial source of truth.

---

# 98. TIME

System timestamps:

```text
UTC ISO 8601
```

Example:

```text
2026-09-17T01:30:00Z
```

Historical date uncertainty uses `HistoricalDateDTO`.

---

# 99. PUBLIC SEO PROJECTION

Public surname page consumes the same public profile projection or a stable SEO-specific derivative.

Required:

```ts
interface PublicSeoMetadata {
  canonical_path: string;
  indexability: "INDEX" | "NOINDEX";
  locale: SupportedLocale;
}
```

Potential P1:

```text
meta title
description
structured-data payload
```

only from approved Claims.

---

# 100. SEO RUNTIME RULE

Crawler page request never triggers deep archive search.

If precomputed profile does not meet SEO quality:

```text
NOINDEX
```

or page unavailable.

Do not render an AI-generated thin page on demand.

---

# 101. NEXT.JS SERVER RENDERING

For public surname pages:

```text
Server Component / server data load
↓
public profile projection
↓
render meaningful HTML
```

Client hydrates interactive layers afterward.

No spinner-only page as indexable primary output.

---

# 102. TANSTACK QUERY ROLE

Recommended for client/server-state management where interactive revalidation is needed.

Current TanStack Query supports:

- caching;
- targeted query invalidation;
- server rendering/hydration;
- prefetching.

Use it for:

```text
profile resource
research status
report resource
```

Do not turn its client cache into canonical application state.

---

# 103. QUERY KEYS

Example:

```ts
["surname-profile", surnameId, locale]

["research-run", researchRunId]

["report", reportId]
```

Do not put raw private family details into generic query keys later.

---

# 104. SSE + TANSTACK QUERY

Recommended pattern:

```text
SSE event profile.updated
↓
queryClient.invalidateQueries(profileKey)
↓
GET profile with ETag
↓
updated UI
```

Do not manually patch dozens of nested chapter fields from arbitrary events.

This keeps REST resource canonical.

---

# 105. SSR HYDRATION

Server profile request can be dehydrated/hydrated into the browser query cache to avoid duplicate initial client fetch.

TanStack Query's current SSR guidance explicitly supports server prefetch/dehydrate and browser hydrate patterns.

No shared server QueryClient between users.

---

# 106. FRONTEND STATE MACHINE

Consumer page state:

```text
IDLE
SUBMITTING
RESOLUTION_REQUIRED
LOADING_CORE
FREE_READY
ENRICHING
PREMIUM_READY
ERROR_RECOVERABLE
ERROR_TERMINAL
```

This intentionally does not mirror every runtime state.

---

# 107. STATE TRANSITIONS

```text
IDLE
 │
 ▼
SUBMITTING
 │
 ├───────────────┐
 ▼               ▼
RESOLUTION    LOADING_CORE
REQUIRED          │
 │                ▼
 └──────────► FREE_READY
                  │
             ┌────┴────┐
             ▼         ▼
         ENRICHING   terminal free
             │
             ▼
        PREMIUM_READY
```

Recoverable failure can occur while remaining in FREE_READY.

---

# 108. FRONTEND SERVER STATE VS UI STATE

Server state:

- profile;
- research;
- report;
- entitlement.

Managed with server-state/query tooling.

UI state:

- selected chapter;
- modal open;
- expanded citation;
- animation;
- local form.

Do not copy complete profile into a separate global Zustand/Redux store without need.

---

# 109. URL STATE

Public URL:

```text
/{locale}/surname-route/{canonical_slug}
```

Can include:

```text
#history
#origin
```

or safe query for selected presentation.

Do not put:

- user family member;
- ancestor DOB;
- private town context later;

in public URL.

---

# 110. CANONICAL NAVIGATION

After resolution:

```text
/search?q=...
```

should navigate/replace to canonical route.

Search ID remains runtime context.

Browser back returns to prior user journey without creating a new research mutation automatically.

---

# 111. PAGE REFRESH

Canonical surname page GET is sufficient to reconstruct state.

If background run exists:

profile response includes:

```text
research_run_id
events_url
```

client reconnects.

No in-memory-only progress state.

---

# 112. MULTI-TAB

Tabs querying same public surname converge on:

```text
same surname profile
same shared research run where active
```

because runtime coalescing is server-side.

Client does not need cross-tab coordination for correctness.

---

# 113. PROGRESS COPY

Backend sends code:

```text
SEARCHING_HISTORY
```

Frontend translates to localized copy.

No generated progress prose.

No source-specific internal detail such as:

```text
Worker 3 querying Polona endpoint…
```

---

# 114. CLARIFICATION REQUEST

Generic DTO:

```ts
type ClarificationRequestDTO =
  | {
      type: "SURNAME_SELECTION";
      options: SurnameCandidateDTO[];
    }
  | {
      type: "COUNTRY_CONTEXT";
      options?: CountryOptionDTO[];
    };
```

P0 likely requires only surname selection.

---

# 115. LOW-DATA SURNAME

Example response:

```text
population READY
history UNAVAILABLE
premium eligible false
```

Profile still renders useful free data.

No empty “History” premium card.

---

# 116. NO CURRENT MAP

Profile:

```json
{
  "id": "WHERE",
  "state": "UNAVAILABLE",
  "reason_code": "NO_APPROVED_CURRENT_REGIONAL_SOURCE"
}
```

UI may omit chapter or explain limitation according to IA rules.

Do not show zeroed Poland map.

---

# 117. SOURCE OUTAGE

History:

```json
{
  "state": "SOURCE_UNAVAILABLE",
  "reason_code": "HISTORICAL_SOURCE_TEMPORARY_FAILURE"
}
```

Frontend copy:

> Historical sources are temporarily unavailable.

Not:

> No historical records found.

---

# 118. RIGHTS BLOCKED

Public state may expose:

```text
UNAVAILABLE
```

with safe reason code depending on product.

Do not reveal internal licensing negotiation details unnecessarily.

Premium policy gets full internal reason.

---

# 119. INDEXABILITY

Backend/SEO qualification is authoritative.

`NOINDEX` can result from:

- insufficient evidence;
- duplicate/canonical issue;
- private/family context;
- unsupported entity.

Frontend never decides to index a page because it has enough text.

---

# 120. SHARE CONTRACT

P0 profile may expose:

```ts
interface SharePreviewDTO {
  canonical_path: string;
  allowed: boolean;
  suggested_fact_id?: string;
}
```

Actual share-image construction is frontend/design layer.

Only public/free eligible Claims may participate.

---

# 121. ANALYTICS CONTRACT

Events use canonical IDs, not unnecessary literal surname strings.

Examples:

```text
surname_search_started
surname_search_resolved
resolution_confirmation_shown
free_profile_viewed
history_section_viewed
discovery_index_viewed
premium_offer_viewed
checkout_started
purchase_completed
report_opened
```

Properties:

```text
search_id
surname_id
coverage tier
result state
experiment variant
```

Avoid sensitive/private fields.

---

# 122. AUTH MODEL

## Free surname

Anonymous.

## Premium report

Email-backed entitlement and either:

- authenticated session;
- secure magic-link session.

## Later family research

Authenticated private workspace required.

---

# 123. COOKIE / SESSION STRATEGY

P0 recommended:

- same-origin BFF;
- secure;
- HttpOnly;
- SameSite appropriate to payment/auth flow;
- short/rotatable session IDs.

Frontend JavaScript should not need raw long-lived auth secrets.

---

# 124. CSRF

State-changing cookie-authenticated BFF routes need CSRF protection.

Possible pattern:

- SameSite cookies;
- Origin checking;
- CSRF token where required.

Exact auth implementation is left to payments/security work, but API contract assumes protection exists.

---

# 125. CORS

Browser-facing API is same origin.

Therefore:

```text
no permissive public CORS
```

by default.

If external developer API becomes a product later, design separately.

---

# 126. MAGIC LINKS

Do not put reusable entitlement secret in normal route/query analytics.

Use:

```text
high-entropy single-use/limited-use token
↓
server validates
↓
establish secure session
↓
redirect to clean report URL
```

Full token lifecycle belongs to payment/auth spec.

---

# 127. CONTENT SECURITY

Generated text is plain structured content.

Do not store/return raw executable HTML from LLM.

If markdown is eventually supported:

- use strict subset;
- render with sanitization.

P0 preferred:

```text
structured block types
+
plain text
```

---

# 128. CONTENT BLOCK TYPES

P0 report/content vocabulary:

```text
PARAGRAPH
STAT
TIMELINE
MAP
VARIANT_LIST
PLACE_LIST
SOURCE_LIST
EVIDENCE_CALLOUT
LIMITATION
```

Avoid a generic:

```text
HTML
```

block.

---

# 129. PAYLOAD SIZE

Initial search response stays small.

Profile response should include enough for the current free narrative, but:

- full evidence sets are omitted;
- premium locked content omitted;
- large historical lists paginated/lazy;
- map geometry bounded.

Compression:

```text
standard gzip/Brotli
```

No custom binary protocol.

---

# 130. METHODOLOGY LINKS

Standard methodology topics are static/public resources:

```text
/confidence
/rarity
/sources
/historical-maps
```

API can return methodology codes/paths.

No need for dynamic `/api/methodology` P0 endpoint.

---

# 131. ACCESSIBILITY CONTRACT

API never depends on color semantics.

Frontend receives:

```text
ConfidenceStatus
SectionState
CoverageStatus
MapLayerType
```

which render as:

- text label;
- icon;
- color.

Screen readers receive the semantic text.

---

# 132. LOADING SKELETON POLICY

Skeleton appears only for:

```text
SectionState = PROCESSING
```

Do not skeleton-render an unqualified chapter merely because design has a slot.

`UNAVAILABLE` should be omitted/limitation-rendered according to product rules.

---

# 133. FRONTEND RETRY

Automatic retry:

- idempotent GET;
- SSE reconnect;
- selected network transient states.

Do not automatically resubmit:

- checkout;
- other POST mutations;

without Idempotency-Key.

---

# 134. RESEARCH CANCEL

No public cancel endpoint for shared surname research in P0.

Why:

one user's browser session does not own the canonical shared background run.

Later private Family Research may have a cancel/pause API.

---

# 135. API ABUSE

Public API boundary applies:

- IP/session rate limits;
- bot/abuse detection;
- request size limit;
- circuit protection.

SEO page rendering should consume internal/precomputed projection path and not be penalized as anonymous browser API traffic.

---

# 136. PUBLIC BULK DATA

P0 API is not a public data export product.

Do not add:

```text
GET /all-surnames
bulk download
```

without separate rights/product review.

This prevents accidental redistribution of licensed derived datasets.

---

# 137. CONTRACT TESTING

Required:

## Schema validation

Every fixture validates against runtime schema.

## OpenAPI compatibility

Generated artifact passes lint/validation.

## Producer tests

Backend responses conform.

## Consumer tests

Frontend accepts all published fixture states.

## Async progression

Profile evolves correctly through SSE events.

## Rights tests

Locked content absent from unauthorized response.

## Entitlement tests

Premium report returns 403 without access.

## ETag tests

Unchanged profile returns 304.

---

# 138. CONTRACT FIXTURES

Minimum:

```text
SEARCH_EXACT_CACHE_HIT
SEARCH_EXACT_RESEARCH_STARTED
SEARCH_TYPO_SUGGESTION
SEARCH_MULTIPLE_CANDIDATES
SEARCH_UNRESOLVED

PROFILE_FREE_READY
PROFILE_FREE_ENRICHING
PROFILE_LOW_DATA
PROFILE_NO_MAP
PROFILE_HISTORY_SOURCE_DOWN
PROFILE_CONFLICTING_ORIGIN
PROFILE_PREMIUM_ELIGIBLE
PROFILE_PREMIUM_NOT_ELIGIBLE
PROFILE_RIGHTS_BLOCKED

REPORT_RESEARCHING
REPORT_GENERATING
REPORT_READY
REPORT_REVIEW_REQUIRED
REPORT_FAILED

ENTITLEMENT_MISSING
```

---

# 139. FRONTEND GOLDEN STATES

Every contract fixture should render in Storybook/component test environment.

Design/engineering can inspect:

- mobile;
- desktop;
- dark/light if supported;
- loading;
- error;
- confidence;
- low-data.

No live source required.

---

# 140. OPENAPI COMPATIBILITY POLICY

Changes:

## Patch-compatible

- new optional property;
- new endpoint;
- new optional request field.

## Potentially breaking

- property made required;
- type changed;
- meaning changed;
- enum expanded for exhaustive clients;
- endpoint removed.

CI needs schema diff review.

---

# 141. DEPRECATION

Deprecated field:

1. documented;
2. frontend migrated;
3. telemetry confirms no known use where possible;
4. removed only in next breaking version unless special agreement.

---

# 142. PUBLIC PROFILE RESPONSE — RECOMMENDED SHAPE

```json
{
  "schema_version": "1.0",
  "profile_version": "prf_01K...",
  "request_id": "req_...",

  "surname": {
    "id": "019...",
    "display_name": "Cichowski",
    "canonical_slug": "cichowski",
    "canonical_path": "/pl/nazwisko/cichowski",
    "script": "Latn"
  },

  "research": {
    "research_run_id": "019...",
    "status": "PARTIAL_READY",
    "readiness": "FREE_READY",
    "dimensions": {
      "population": "READY",
      "rarity": "READY",
      "modern_geography": "UNAVAILABLE",
      "origin": "READY",
      "history": "PROCESSING"
    },
    "updated_at": "2026-09-17T01:30:00Z",
    "events_url": "/api/v1/research-runs/019.../events"
  },

  "coverage": {
    "population": {"status": "STRONG"},
    "modern_geography": {
      "status": "NONE",
      "reason_code": "NO_APPROVED_CURRENT_REGIONAL_SOURCE"
    }
  },

  "chapters": [],

  "discovery": {
    "state": "PROCESSING"
  },

  "premium": {
    "eligible": false,
    "state": "RESEARCHING"
  },

  "citations": [],
  "limitations": [],

  "seo": {
    "canonical_path": "/pl/nazwisko/cichowski",
    "indexability": "INDEX",
    "locale": "pl-PL"
  },

  "generated_at": "2026-09-17T01:30:00Z",
  "updated_at": "2026-09-17T01:30:00Z"
}
```

Example values are schematic, not surname facts.

---

# 143. SEQUENCE — CACHE HIT

```text
User
 │ POST surname-searches
 ▼
BFF
 │
 ▼
Resolver
 │ exact
 ▼
ProfileState
 │ FRESH
 ▼
Search response 200
 │ canonical route
 ▼
Frontend
 │ GET profile / SSR already loaded
 ▼
Profile
```

No ResearchRun.

---

# 144. SEQUENCE — UNCACHED SURNAME

```text
User
 │ POST surname-searches
 ▼
BFF
 │
 ▼
Resolver
 │ RESOLVED
 ▼
Runtime
 │ create/coalesce ResearchRun
 ▼
202 Accepted
 │ run ID + events URL
 ▼
Frontend
 │ connect SSE
 ▼
Runtime current data
 │
 ▼
profile.updated
 │
 ▼
Frontend GET profile
 │
 ▼
FREE_READY renders
 │
 └──────────────► historical work continues
```

---

# 145. SEQUENCE — TYPO

```text
User enters Cichwoski
        │
        ▼
POST surname-searches
        │
        ▼
SUGGESTION_REQUIRED
        │
        ▼
Frontend shows candidates
        │
        ▼
PUT /resolution
        │
        ▼
canonical surname selected
        │
        ▼
cache/research path
```

No silent substitution.

---

# 146. SEQUENCE — PARTIAL RESEARCH

```text
Profile FREE_READY
      │
      ▼
History state = PROCESSING
      │
      ▼
SSE dimension.updated
      │
      ▼
frontend invalidates profile
      │
      ▼
GET profile If-None-Match
      │
      ▼
200 updated profile
      │
      ▼
History appears
```

---

# 147. SEQUENCE — PREMIUM

```text
DiscoveryIndex built
        │
        ▼
profile.updated
        │
        ▼
PremiumEligibility = ELIGIBLE
        │
        ▼
Frontend shows Offer
        │
        ▼
POST checkout-sessions
        │
        ▼
payment provider
        │
        ▼
server creates entitlement
        │
        ▼
report generation
        │
        ▼
GET report
        │
        ▼
READY
```

Browser never self-grants entitlement.

---

# 148. REPORT FAILURE

If generation fails after purchase:

```text
entitlement remains valid
report = FAILED or retrying
```

Server may retry safely.

User must never be asked to purchase again for the same entitlement.

---

# 149. SECURITY MATRIX

| Endpoint | Anonymous | Auth/session | Entitlement |
|---|---:|---:|---:|
| POST surname-searches | Yes | Optional | No |
| PUT search resolution | Yes with search context | Optional | No |
| GET public surname profile | Yes | No | No |
| GET public ResearchRun state | Scoped/public run only | Optional | No |
| GET public ResearchRun SSE | Scoped/public run only | Optional | No |
| POST checkout-sessions | Yes/session | Email/session as flow requires | No |
| GET premium report | No unrestricted | Yes/magic session | **Yes** |
| Future family data | No | **Yes** | product-specific |
| Admin | No | Staff auth | Staff role |

---

# 150. CACHE MATRIX

| Resource | Browser | CDN/shared | ETag | Typical policy |
|---|---:|---:|---:|---|
| Public profile | Yes | Yes | Yes | revalidate/versioned |
| Search POST | No | No | No | no-store |
| ResearchRun state | short/private | No | Yes | conditional polling |
| SSE | No | No | event ID | stream |
| Checkout | No | No | No | no-store |
| Premium report | private | No public | optional | private/no-store |
| Family profile later | private | No | optional | private/no-store |

---

# 151. ASYNC MATRIX

| Operation | Initial status | SSE | Poll fallback |
|---|---|---:|---:|
| Cache-hit search | 200 | No | No |
| New surname research | 202 | Yes | Yes |
| Background enrichment after free | 200/free available | Yes | Yes |
| Report generation | existing report resource | Optional | Yes |
| Checkout | provider workflow | No | provider-specific |

---

# 152. FRONTEND RECOVERY MATRIX

## SSE disconnect

Native reconnect.

On failure/replay loss:

```text
GET ResearchRun
GET Profile
```

## History source failure

Keep free page.

Show history temporary/unavailable state.

## Search request timeout

Retry search with same Idempotency-Key where supplied.

## Auth/session expired on report

Reauthenticate/magic-link recovery.

Do not lose entitlement.

## Report generation failed

Show recoverable report state; backend retry/support path.

---

# 153. MODEL CHANGE PROPOSALS

## MODEL CHANGE PROPOSAL 16-A — `profile_version`

Ensure every public `SurnameProfileProjection` has immutable/version-comparable:

```text
profile_version
public_projection_fingerprint
```

Prompt 15 already implies this. Formalize P0.

## MODEL CHANGE PROPOSAL 16-B — public event sequence

Research runtime should persist/buffer:

```text
public_event_id
research_run_id
event_type
occurred_at
public_payload
```

for short SSE replay.

This is **not** full event sourcing.

Recommendation: P0 operational store/Redis stream or bounded DB/event table depending deployment.

## MODEL CHANGE PROPOSAL 16-C — `canonical_slug`

Surname entity/public projection should maintain current canonical locale-aware slug plus redirects from obsolete slugs.

Recommendation: P0 SEO routing infrastructure.

---

# 154. DECISION REGISTER

## API style

**Decision:** REST/JSON.  
**Alternative:** GraphQL/tRPC.  
**Why:** resource-oriented, cacheable, mobile-ready, projection-controlled.

## BFF

**Decision:** thin same-origin Next.js BFF.  
**Why:** sessions, cookies, CORS simplicity, SSE same-origin.  
**Risk:** logic duplication.  
**Guard:** no domain logic in BFF.

## Async transport

**Decision:** SSE primary + polling fallback.  
**Alternative:** WebSockets.  
**Why:** server→client flow only.

## Profile identity

**Decision:** UUID API identity + locale slug browser route.

## Projection

**Decision:** dedicated frontend DTOs, not raw canonical objects.

## Localization

**Decision:** frontend labels/enums; backend localized generated narrative.

## Errors

**Decision:** stable error envelope + canonical codes.

## 202 behavior

**Decision:** only when no useful profile is available and async research starts. Existing free profile returns 200 even if enrichment continues.

## Idempotency

**Decision:** required for checkout; recommended search; resolution uses PUT.

## Auth

**Decision:** anonymous surname search, server-side entitlement report access.

## Cache

**Decision:** ETag/version-based conditional fetch; public CDN only for public projections.

## Report delivery

**Decision:** structured JSON primary; PDF optional artifact.

## Contract source

**Decision:** shared Zod 4 schemas → JSON Schema/OpenAPI artifacts.

## Frontend server state

**Decision:** TanStack Query or equivalent; no duplicated canonical state store.

## Premium security

**Decision:** premium body never delivered without entitlement.

---

# 155. P0 API

Implement exactly:

```text
POST /api/v1/surname-searches

PUT /api/v1/surname-searches/{search_id}/resolution

GET /api/v1/surnames/{surname_id}/profile

GET /api/v1/research-runs/{research_run_id}

GET /api/v1/research-runs/{research_run_id}/events

POST /api/v1/checkout-sessions

GET /api/v1/reports/{report_id}
```

Supporting:

- OpenAPI;
- shared schema package;
- ETags;
- SSE;
- public error envelope;
- request IDs;
- entitlement middleware.

---

# 156. P0 FRONTEND CONTRACT

Must support:

1. exact cached result;
2. exact uncached/researching result;
3. typo suggestion;
4. multiple candidates;
5. unresolved surname;
6. `FREE_READY`;
7. ongoing enrichment;
8. no-current-map;
9. source temporary failure;
10. low-data surname;
11. conflicting origin;
12. Discovery Index processing;
13. premium eligible;
14. premium not eligible;
15. report generating;
16. report ready;
17. report failure/recovery;
18. entitlement required.

---

# 157. P1 API

Later:

```text
historical occurrence pagination
archive references
full public evidence detail
report version history
updated-report generation
private Family Origin input
family ResearchRun
person candidates
admin/research review endpoints
country-specific expansion resources
```

---

# 158. DO NOT BUILD YET

1. GraphQL.
2. WebSockets.
3. Public developer API.
4. Bulk surname export API.
5. Client-side premium hiding.
6. Browser access to raw Claims/Evidence.
7. Browser access to connector/source internals.
8. Full evidence-graph query language.
9. Arbitrary HTML content blocks.
10. Native mobile-specific API fork.
11. separate microservice gateway.
12. dozens of resource endpoints before UX requires them.

---

# 159. BIGGEST API RISKS

1. Coupling frontend to backend database structure.
2. Returning premium content to free client.
3. Ambiguous null semantics.
4. Fake progress derived from UI timers.
5. Endpoint explosion.
6. Search ambiguity represented as server error.
7. Breaking enum additions.
8. Profile resources without stable versions.
9. uncached crawler requests triggering research.
10. family/private data later sharing public cache path.

---

# 160. BIGGEST FRONTEND STATE RISKS

1. Treating `SOURCE_UNAVAILABLE` as `NO_DATA`.
2. Hiding unresolved ambiguity.
3. Showing map when backend has no valid geography.
4. Loading skeleton for chapters that will never exist.
5. Reimplementing confidence logic client-side.
6. stale client profile after SSE update.
7. duplicate research on refresh.
8. overwriting SSR state with older client cache.
9. displaying premium counts not backed by DiscoveryIndex.
10. treating report generation failure as lost purchase.

---

# 161. BIGGEST SECURITY RISKS

1. CSS-blurred premium content already in payload.
2. report ID used as access control.
3. public cache storing private report.
4. permissive CORS.
5. magic-link token leakage.
6. CSRF on cookie mutations.
7. auth data in analytics.
8. family data in public URL.
9. source credentials exposed through API errors.
10. raw generated HTML XSS.

---

# 162. DEFINITION OF API READY

The P0 contract is ready when all of the following pass.

## Search

- raw surname request validates;
- exact resolution response works;
- suggestion flow works;
- ambiguity is representable;
- unresolved surname does not generate fake profile;
- cache hit vs new ResearchRun is clear.

## Profile

- public profile has stable ID/version/ETag;
- adaptive chapters work;
- `PROCESSING` differs from `UNAVAILABLE`;
- suppression differs from zero;
- current map can be absent;
- citations are stable;
- confidence enum is canonical.

## Async

- SSE works end-to-end through deployment infrastructure;
- reconnect works;
- event loss triggers safe refetch;
- polling fallback works;
- ETag polling returns 304 when unchanged.

## Premium

- Discovery preview derives from DiscoveryIndex;
- no locked full premium data reaches unauthorized browser;
- offer is server-driven;
- checkout is idempotent;
- entitlement is server-authoritative;
- report endpoint enforces entitlement.

## SEO

- public surname page server-renders meaningful approved data;
- no crawler-triggered research;
- indexability is backend-qualified;
- canonical slug/path supplied.

## Types

- one shared contract source exists;
- backend validates responses;
- frontend generated/inferred types compile;
- fixtures validate;
- compatibility check is automated.

## Security

- same-origin BFF;
- secure session policy;
- CSRF protection for cookie mutations;
- public/private cache separation;
- no raw internal errors.

---

# 163. INPUTS REQUIRED BY PROMPT 17

Prompt 17 — Golden Test Corpus & QA — should receive the exact P0 contract states from this specification.

It must test:

```text
SearchRequest
SearchResponse

SurnameResolutionDTO
SurnameCandidateDTO

SurnameProfileResponse
Chapter DTOs
ConfidenceDTO
CoverageDTO
CitationDTO
DiscoveryPreviewDTO
PremiumEligibilityDTO

ResearchRunView
SSE events

OfferSummaryDTO
Report resource

ApiErrorResponse
```

Required workflow scenarios:

```text
exact cache hit
exact new research
typo suggestion
multiple candidates
unresolved surname
free partial
no map
source outage
low data
conflicting origin
premium eligible
premium ineligible
rights blocked
SSE reconnect
304 profile
report generation
report authorization
```

Prompt 17 must then turn these into:

- golden surname corpus;
- deterministic fixtures;
- resolver tests;
- connector fixtures;
- evidence/claim tests;
- API contract tests;
- frontend golden states;
- E2E regression suite;
- safety assertions.

---

# 164. VERIFIED TECHNOLOGY NOTES — 2026-09-17

## OpenAPI

The latest published OpenAPI Specification is **3.2.1**, dated 10 September 2026.

OpenAPI provides a language-agnostic HTTP API description usable by documentation, client-generation and testing tooling.

Reference:

https://spec.openapis.org/oas/

## Zod

Zod 4 provides native conversion from Zod schemas to JSON Schema through `z.toJSONSchema()`.

This makes it suitable for a TypeScript-first shared runtime contract with generated documentation artifacts.

Reference:

https://zod.dev/json-schema

## Server-Sent Events

Browser `EventSource` supports named events, `data`, event IDs and reconnect delay semantics.

Event IDs allow the browser to track the most recent event and support reconnect-oriented designs.

Reference:

https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events/Using_server-sent_events

## HTTP ETag

HTTP `ETag` together with `If-None-Match` allows clients to conditionally request a resource and receive `304 Not Modified` when the representation has not changed.

References:

https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag

https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/If-None-Match

## Next.js

Current App Router Route Handlers use native Web Request/Response APIs and support GET/POST/PUT/PATCH/DELETE/HEAD/OPTIONS.

Current documentation also notes that Route Handlers are not cached by default, so Name Atlas caching should be intentional.

Reference:

https://nextjs.org/docs/app/getting-started/route-handlers

Next.js supports streaming/Suspense, but deployment proxies/load balancers must not buffer intended streaming responses.

Reference:

https://nextjs.org/docs/app/guides/self-hosting

## TanStack Query

Current TanStack Query provides query caching, invalidation, SSR dehydration/hydration and Next.js/React server-rendering patterns.

It is appropriate for browser **server state**, not canonical domain state.

References:

https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation

https://tanstack.com/query/latest/docs/framework/react/guides/ssr

---

# 165. FINAL RECOMMENDATION

The Name Atlas frontend should be deliberately “ignorant” of research internals.

Its contract should answer only:

```text
Which surname did we resolve?
What public data is currently ready?
Which sections are still processing?
Which sections genuinely do not exist?
What evidence/confidence may we show?
Is deeper content actually available?
Does this user have access to it?
```

The correct MVP transport is therefore:

```text
REST
+
typed projection schemas
+
SSR public profiles
+
ETag cache validation
+
SSE research updates
+
server-side entitlement enforcement
```

The most important invariant is:

> **The browser is never asked to decide whether data are true, premium, current, safe, or legally displayable. Those decisions are made by the canonical backend, and the API returns only the projection the current user and surface are actually allowed to see.**

That contract allows frontend and backend teams to implement independently while preserving the central Name Atlas trust architecture.
