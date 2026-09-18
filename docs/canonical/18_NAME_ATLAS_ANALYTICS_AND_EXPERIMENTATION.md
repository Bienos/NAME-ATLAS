# NAME ATLAS — ANALYTICS & EXPERIMENTATION

**Document:** 18. Analytics & Experimentation  
**Version:** 1.0.0 — Measurement Baseline  
**Date:** 2026-09-17  
**Market:** Poland first, global-ready  
**Status:** Candidate implementation specification  
**Depends on:** `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md` through `17_NAME_ATLAS_GOLDEN_TEST_CORPUS_AND_QA.md`  
**Supplementary inputs:** Paywall System, User Intent Research, Discovery Flow Research, Mobile Wireflow, Information Architecture, Prompt Library, Data & Truth Layer  
**Next:** `19_NAME_ATLAS_PRIVACY_SECURITY_LEGAL_OPS.md`

---

# 0. PURPOSE, AUTHORITY AND ANALYTICS PHILOSOPHY

This document defines how Name Atlas measures whether users:

- successfully enter the discovery experience;
- receive a meaningful evidence-backed result;
- understand and explore the result;
- engage with deeper historical evidence;
- become eligible for a premium report;
- decide to purchase;
- consume the report after purchase;
- return, share, or progress toward deeper research.

It also defines how experiments are designed without allowing conversion optimization to weaken the Name Atlas truth architecture.

The canonical rule is:

> **Analytics may optimize presentation and product flow. It may never redefine truth.**

The analytics layer is downstream from the product and trust system.

It consumes stable states such as:

```text
SurnameResolution
CoverageAssessment
DiscoveryIndex
PremiumEligibility
ReportStatus
QA outcomes
```

It does not create them.

The experimentation layer may change:

```text
how truthful information is presented
when truthful information is presented
how users navigate it
what valid offer is shown
how a valid offer is priced
```

It may not change:

```text
whether a surname match is true
whether evidence is sufficient
which confidence state a Claim deserves
whether source rights permit use
whether premium inventory actually exists
```

---

# 1. EXECUTIVE ANALYTICS ARCHITECTURE

Recommended system:

```text
                         NAME ATLAS PRODUCT
                                │
              ┌─────────────────┼─────────────────┐
              ▼                 ▼                 ▼
        CLIENT EVENTS      SERVER EVENTS      QA SIGNALS
              │                 │                 │
              └─────────────────┼─────────────────┘
                                ▼
                       EVENT VALIDATION
                                │
                                ▼
                         EVENT INGESTION
                                │
                                ▼
                    PRODUCT ANALYTICS STORE
                                │
              ┌─────────────────┼───────────────────┐
              ▼                 ▼                   ▼
           FUNNELS          METRIC LAYER        EXPERIMENTS
              │                 │                   │
              └─────────────────┼───────────────────┘
                                ▼
                         PRODUCT DECISION
                                │
                          ┌─────┴─────┐
                          ▼           ▼
                       ROLLOUT      REJECT
                          │
                          ▼
                  QUALITY GUARDRAILS
                          │
                          ▼
                   GOLDEN QA — DOC 17
```

Parallel systems remain separate:

```text
PRODUCT ANALYTICS
≠
SYSTEM OBSERVABILITY
≠
CLAIM / EVIDENCE TRUTH
≠
COMMERCE ACCOUNTING
```

---

# 2. P0 TOOLING DECISION

## 2.1 Recommendation

Use:

> **PostHog Cloud EU as the P0 product analytics, feature flag and experimentation platform.**

Configuration principles:

```text
Region: EU / Frankfurt
Product analytics: enabled
Feature flags: enabled
Experiments: enabled after baseline instrumentation
Session Replay: disabled by default pending Prompt 19 privacy/legal review
Server-side event capture: required for canonical business events
Client-side capture: limited to interaction events
```

Do not add another analytics vendor in P0.

## 2.2 Why PostHog for Name Atlas MVP

The current platform combines:

- product analytics;
- web analytics;
- feature flags;
- experiments;
- session replay;
- warehouse/data-pipeline capabilities.

Current published pricing as of 2026-09-17 includes monthly free allowances of:

```text
Product Analytics: 1M events
Session Replay: 5K recordings
Feature Flags: 1M requests
```

Experiments use the existing flag/event infrastructure.

PostHog currently offers an EU Cloud region hosted in Frankfurt and provides privacy controls and a self-service DPA path.

This matches Name Atlas because the MVP needs:

```text
analytics
+
feature flags
+
experiments
```

but does not yet justify:

```text
separate CDP
+
separate experimentation platform
+
separate BI tool
```

## 2.3 Session Replay decision

Do **not** enable general Session Replay at launch merely because the platform includes it.

Surname searches are behavioral data and later family research will contain substantially more private information.

Prompt 19 must determine:

- consent/legal basis;
- masking rules;
- route exclusions;
- retention;
- whether surname input fields are always masked.

P0 analytics architecture works fully without replay.

---

# 3. CURRENT TOOL COMPARISON — 2026-09-17 SNAPSHOT

Vendor pricing/features change frequently. This table is a decision snapshot, not a permanent contract.

| Platform | Current relevant strengths | Published entry/free context | Name Atlas assessment |
|---|---|---|---|
| **PostHog** | Product analytics, flags, experiments, replay, warehouse; EU Cloud | 1M analytics events/mo free; 1M flag requests; 5K replays | **P0 recommendation** — broad enough, low stack complexity |
| **Statsig** | Strong experimentation, flags, product analytics, replay, warehouse-native options | Developer tier currently 2M events/mo + 50K replays | Excellent alternative if experimentation becomes dominant requirement |
| **Amplitude** | Mature analytics + experimentation + flags + replay | Free tier currently 2M events/mo; 10K replays | Strong analytics, but no decisive advantage for P0 simplicity |
| **Mixpanel** | Analytics, experiments, feature flags, replay | Free tier currently 1M events/mo; 10K replays; limited experiments/flags | Viable, especially analytics-centric |
| **GrowthBook** | Warehouse-native experiments, flags, analytics; open-source option | Free cloud currently 3 users/1 project with unlimited flags/experiments; managed warehouse option | Excellent later if Name Atlas becomes warehouse-first |
| **LaunchDarkly** | Feature management, experimentation, release controls | Current Developer tier free and includes experimentation allowance | Strong release/flag platform, but broader product analytics would still need another system |

### Decision

P0:

```text
PostHog
```

P1/P2 reevaluation trigger:

- experimentation becomes much more sophisticated than product analytics;
- warehouse becomes primary metric computation layer;
- privacy/legal requirements favor a different deployment model;
- costs at actual Name Atlas volume materially favor another platform.

---

# 4. TOOL REFERENCES

Verified 2026-09-17:

### PostHog

`https://posthog.com/pricing`

`https://posthog.com/docs/privacy`

`https://posthog.com/docs/experiments`

### Statsig

`https://statsig.com/pricing`

### Amplitude

`https://amplitude.com/pricing`

### Mixpanel

`https://mixpanel.com/pricing/`

### GrowthBook

`https://www.growthbook.io/pricing`

### LaunchDarkly

`https://launchdarkly.com/pricing/`

---

# 5. MEASUREMENT PRINCIPLES

## 5.1 Stable denominator before rate

Never report:

```text
purchase conversion = purchases / all surname searches
```

as the only monetization conversion metric.

Many profiles correctly have no premium offer.

Use denominator appropriate to the question.

---

## 5.2 Coverage context is mandatory

A surname with:

```text
RICH
```

coverage is not equivalent to:

```text
MINIMAL
```

coverage.

Every funnel report involving result engagement or premium conversion must be segmentable by coverage.

---

## 5.3 Evidence before engagement

A high click rate does not legitimize unsupported information.

The evidence system remains authoritative.

---

## 5.4 Quality guardrails before growth

A treatment does not win if it increases:

```text
false claims
paywall truthfulness failures
privacy violations
refunds materially
premium leakage
```

even when conversion improves.

---

## 5.5 No sensitive fields by default

Generic analytics should receive the minimum product state necessary for decision-making.

---

## 5.6 Events describe what actually happened

Bad:

```text
premium_user
```

Good:

```text
purchase_completed
```

---

## 5.7 One metric definition everywhere

If:

```text
offer_to_purchase_rate
```

appears in:

- dashboard;
- experiment;
- weekly report;

it has one canonical metric contract.

---

## 5.8 Analytics never redefines canonical state

PostHog is not the truth source for:

- PremiumEligibility;
- purchase accounting;
- Claims;
- Evidence;
- entitlement.

It receives copies/events derived from canonical systems.

---

# 6. PRODUCT ANALYTICS VS OBSERVABILITY

## Product analytics

Answers:

```text
Did users receive value?
Which parts did they use?
Did eligible users see the offer?
Did they purchase?
Did purchasers consume the report?
```

## Observability

Answers:

```text
Did a connector timeout?
How long did a queue wait?
Did an LLM request fail?
Was PostgreSQL slow?
```

Prompt 15 observability remains the operational source.

Do not send every:

```text
ResearchModuleRun
connector retry
queue attempt
```

into PostHog.

Selected aggregated context can be attached to product events.

---

# 7. PRODUCT ANALYTICS VS TRUTH QA

Prompt 17 remains authoritative for:

```text
false_merge
unsupported_claim
false_verified
family_overreach
rights_violation
paywall_truthfulness_failure
```

Analytics may receive counts/statuses for dashboards and experiment guardrails.

It must not infer them from user behavior.

---

# 8. PRODUCT METRIC HIERARCHY

Recommended metric tree:

```text
                         BUSINESS OUTCOME
                    Evidence-backed revenue/value
                               │
          ┌────────────────────┼─────────────────────┐
          ▼                    ▼                     ▼
    PRODUCT VALUE          MONETISATION        RETENTION / REFERRAL
          │                    │                     │
          ▼                    ▼                     ▼
Meaningful discovery   Eligible → purchase      Return / share
          │                    │
          ▼                    ▼
      ACTIVATION          Offer / checkout
          │
          ▼
       SEARCH
```

Parallel and non-negotiable:

```text
TRUST / QUALITY / RIGHTS GUARDRAILS
```

---

# 9. NORTH STAR DECISION

Do **not** operate Name Atlas from one metric alone.

Use one product-value North Star plus a business metric and immutable guardrails.

## Product North Star

### `MEANINGFUL_DISCOVERY_RATE`

Definition:

```text
meaningful_discovery_searches
/
resolved_searches_with_at_least_one_available_core_insight
```

A search becomes a `meaningful_discovery_search` when the user does either:

### Path A — breadth

Views at least **two distinct eligible substantive insight sections**.

Eligible section types:

```text
POPULATION / RARITY combined as one "today" insight
GEOGRAPHY
MEANING
ORIGIN
HISTORY
EVIDENCE
```

or:

### Path B — depth

Views one substantive insight and performs at least one depth action:

```text
citation_opened
why_we_think_this_opened
alternative_hypothesis_viewed
discovery_index_viewed
historical_occurrence_opened
```

This definition is deliberately stricter than a page load.

## Business metric

```text
REVENUE_PER_PREMIUM_ELIGIBLE_PROFILE
```

## Guardrail set

No composite score.

Monitor individually:

```text
false merge
unsupported claims
rights violations
paywall truthfulness
refunds
premium access violations
```

---

# 10. WHY NOT "SEARCHES" AS NORTH STAR

Search volume primarily measures acquisition/curiosity.

It can grow while:

- results are weak;
- users bounce;
- data coverage deteriorates.

Therefore:

```text
searches = traffic metric
```

not product-value metric.

---

# 11. ACTIVATION MODEL

Use three levels.

## 11.1 Search activation

```text
valid surname submitted
→ surname resolved
→ FREE_READY profile available
```

Metric:

```text
FREE_PROFILE_READY_RATE
```

## 11.2 Free product activation

Canonical activation:

```text
resolved search
+
free profile viewed
+
at least one eligible substantive insight viewed
```

Metric:

```text
FREE_ACTIVATION_RATE
```

## 11.3 Deep discovery activation

Equivalent to North Star numerator:

```text
MEANINGFUL_DISCOVERY
```

## 11.4 Premium activation

For purchasers:

```text
purchase completed
+
report opened
+
first substantive premium section viewed
```

This distinguishes purchasing from actually receiving premium value.

---

# 12. VALUE EVENT DEFINITIONS

Value should not equal route render.

Recommended hierarchy:

```text
VALUE_LEVEL_1
Core insight consumed

VALUE_LEVEL_2
Meaningful discovery

VALUE_LEVEL_3
Historical/evidence depth

VALUE_LEVEL_4
Premium report consumed

VALUE_LEVEL_5 later
Family-specific research progressed
```

---

# 13. PRIMARY FUNNEL

Canonical funnel:

```text
LANDING SESSION
↓
SEARCH STARTED
↓
SEARCH SUBMITTED
↓
SURNAME RESOLVED
↓
FREE PROFILE READY
↓
FREE PROFILE VIEWED
↓
CORE INSIGHT VIEWED
↓
MEANINGFUL DISCOVERY
↓
DISCOVERY INDEX VIEWED
↓
PREMIUM OFFER VIEWED
↓
CHECKOUT STARTED
↓
PURCHASE COMPLETED
↓
REPORT READY
↓
REPORT OPENED
↓
PREMIUM ACTIVATED
↓
REPORT COMPLETED
```

Not every resolved surname reaches premium stages.

---

# 14. SEARCH FUNNEL METRICS

## Search initiation rate

```text
sessions with surname_search_started
/
eligible landing sessions
```

## Search submit rate

```text
surname_search_submitted
/
surname_search_started
```

## Resolution success rate

```text
RESOLVED outcomes
/
valid submitted searches
```

Interpret alongside resolver QA.

Never optimize this metric by aggressive merging.

## Clarification rate

```text
searches requiring clarification
/
valid submitted searches
```

## Unresolved rate

```text
UNRESOLVED
/
valid submitted searches
```

---

# 15. RESOLUTION ANALYTICS PROPERTIES

Allowed:

```text
resolution_outcome
match_type
decision_mode
clarification_required
candidate_count_bucket
country_pack
```

Do not make:

```text
raw fuzzy score
```

a growth KPI.

Do not send:

```text
raw input surname
```

by default.

---

# 16. FREE RESULT FUNNEL

Events:

```text
free_profile_ready        # server
free_profile_viewed       # client

population_section_viewed
rarity_section_viewed
geography_section_viewed
meaning_section_viewed
origin_section_viewed
history_section_viewed
evidence_section_viewed
```

A section's denominator is:

```text
profiles where the section was available to that user
```

not all searches.

---

# 17. CHAPTER ENGAGEMENT FORMULA

Example:

```text
ORIGIN_VIEW_RATE
=
origin_section_viewed searches
/
profiles with origin chapter available and free-visible
```

This matters because:

```text
origin unavailable
```

is not user drop-off.

---

# 18. VIEW EVENT DEFINITION

P0 standard:

A section/view event fires when either:

1. the user deliberately navigates to that chapter; or
2. the chapter's first meaningful content block is at least approximately 50% visible for at least 1 second.

Fire once per:

```text
search_id + section_id
```

unless the event explicitly measures revisits.

Do not fire merely because component HTML mounted below the fold.

---

# 19. FIRST WOW MEASUREMENT

Do not hardcode one global “wow” event yet.

Track:

```text
first_substantive_section_viewed
```

with property:

```text
section_type
milliseconds_since_free_profile_viewed bucket
```

Then analyze which first insight correlates with:

- meaningful discovery;
- share;
- history engagement;
- premium engagement.

UX can still intentionally place map early when valid.

Analytics should validate rather than assume which reveal is most valuable.

---

# 20. EVIDENCE ENGAGEMENT

Events:

```text
why_we_think_this_opened
citation_opened
source_details_viewed
alternative_hypothesis_viewed
limitation_viewed
```

Interpret carefully.

High citation interaction could mean:

- strong curiosity;
- trust-building;
- skepticism;
- confusing claim.

Combine quantitative signal with user research.

---

# 21. MAP ANALYTICS

Events:

```text
geography_section_viewed
map_region_selected
map_period_changed
map_layer_selected
```

Required property:

```text
map_layer_type
```

Values:

```text
CURRENT_DISTRIBUTION
HISTORICAL_OCCURRENCES
HISTORICAL_DISTRIBUTION
MIGRATION_HYPOTHESIS
```

Never aggregate these into one unlabeled “map usage” metric when evaluating factual behavior.

---

# 22. DISCOVERY INDEX ANALYTICS

Server:

```text
discovery_index_ready
```

Client:

```text
discovery_index_viewed
discovery_inventory_category_opened
```

Properties:

```text
coverage_tier
inventory_depth_bucket
category
```

Use buckets in generic analytics.

---

# 23. PREMIUM FUNNEL

```text
premium_eligibility_evaluated
↓
premium_offer_viewed
↓
premium_offer_clicked
↓
checkout_started
↓
checkout_session_created
↓
purchase_completed
↓
report_ready
↓
report_opened
↓
premium_activated
↓
report_completed
```

---

# 24. PREMIUM CONVERSION DENOMINATORS

Track at least:

## Opportunity conversion

```text
purchase_completed
/
premium_eligible profiles
```

## Offer conversion

```text
purchase_completed
/
premium_offer_viewed
```

## Checkout conversion

```text
purchase_completed
/
checkout_started
```

## Offer clickthrough

```text
premium_offer_clicked
/
premium_offer_viewed
```

Each answers a different question.

---

# 25. PREMIUM ELIGIBILITY RATE

```text
premium_eligible resolved profiles
/
resolved profiles
```

This is:

> **coverage/business-opportunity metric**

not a conversion target.

A sudden increase may be:

- better sources;
- better historical coverage;
- a bug lowering eligibility threshold.

Always pair with QA/trust monitoring.

---

# 26. OFFER REACH

```text
premium_offer_viewed
/
premium-eligible searches that reached the offer position
```

Separate:

```text
user never reached offer
```

from:

```text
offer not available
```

---

# 27. MONETISATION METRIC TREE

```text
REVENUE
│
├── Premium-eligible profile volume
│
├── Offer reach
│
├── Offer → checkout
│
├── Checkout → purchase
│
├── Average order value
│
├── Refunds
│
└── Later: Family attach / gift products
```

---

# 28. REVENUE METRICS

Canonical:

```text
gross_orders
gross_revenue
refund_count
refund_amount
net_revenue
average_order_value
revenue_per_search
revenue_per_resolved_profile
revenue_per_premium_eligible_profile
```

The commerce/payment database remains authoritative.

Analytics copies are derivative.

---

# 29. REVENUE PER PREMIUM-ELIGIBLE PROFILE

Formula:

```text
net or gross revenue according to metric variant
/
unique premium-eligible search/profile opportunities
```

This better separates:

```text
monetisation effectiveness
```

from:

```text
surname data availability
```

than revenue/search alone.

Track both.

---

# 30. REPORT VALUE METRICS

```text
report_ready_rate
report_open_rate
premium_activation_rate
report_completion_rate
report_revisit_7d
report_revisit_30d

premium_section_depth
citation_engagement_after_purchase
historical_section_engagement
```

Purchase conversion alone is insufficient.

---

# 31. REPORT READY RATE

```text
reports reaching READY
/
purchased report entitlements requiring generation
```

Technical failures should be observable separately.

---

# 32. REPORT OPEN RATE

```text
unique purchased reports opened
/
reports ready
```

Useful for delivery/recovery quality.

---

# 33. PREMIUM ACTIVATION

```text
purchased reports with report_opened + substantive premium section viewed
/
purchase_completed
```

This is the premium equivalent of activation.

---

# 34. REPORT SECTION VIEW

Use one event:

```text
report_section_viewed
```

Properties:

```text
section_type
section_sequence_bucket
report_version
```

Do not create a unique event name for every report chapter.

---

# 35. REPORT COMPLETION

P0 derived definition:

A report is considered completed when:

```text
at least two major premium sections were viewed
AND
(
    final available major section was viewed
    OR
    >= 75% of eligible major premium sections were viewed
)
```

Threshold is a product configuration, not a historical truth.

Do not use:

```text
scroll == 100%
```

as the definition.

---

# 36. REPORT RETURN

```text
report_revisited
```

Derived from report open events in a later session.

Report revisits are useful for episodic products because they indicate lasting utility.

---

# 37. REPORT QUALITY PROXIES

Useful but not truth metrics:

```text
refund requested
support issue
reported error
report never opened
report revisited
report shared
family research CTA interest
```

A low refund rate does not prove factual quality.

Prompt 17 QA remains authoritative.

---

# 38. REFUND METRICS

Events/server facts:

```text
refund_requested
refund_completed
```

Reason categories:

```text
EXPECTED_MORE_DATA
DATA_QUALITY_CONCERN
TECHNICAL_FAILURE
REPORT_NOT_DELIVERED
DUPLICATE_PURCHASE
PAYMENT_ISSUE
OTHER
```

Do not send user-written explanation text into generic analytics.

---

# 39. RETENTION MODEL

Name Atlas is naturally episodic.

Do not use daily active retention as the principal health metric.

Measure:

```text
same surname revisit
new surname search
repeat search user
report revisit
share/referral return
family-product progression later
```

Cohorts:

```text
7-day
30-day
90-day
```

only after enough data confirms those windows make sense.

---

# 40. MULTI-SURNAME DISCOVERY

Metric:

```text
visitor searched 2+ distinct surname entity keys
```

Useful behavioral signal.

Do not automatically interpret as:

```text
family research
```

because user may be checking friends, partner, celebrities or curiosity.

---

# 41. SHARE / REFERRAL

Events:

```text
share_started
share_completed
referral_landing_viewed
referral_search_submitted
```

Properties:

```text
asset_type
channel category if available
source_surface
```

Do not encode private report data in referral URL.

---

# 42. SEO / ORGANIC ACQUISITION

Landing context:

```text
acquisition_channel = ORGANIC_SEARCH
landing_type = SURNAME_SEO
```

Track:

```text
SEO landing → search
SEO landing → meaningful discovery
SEO landing → premium eligibility
SEO landing → purchase
```

Do not fire client engagement from crawler SSR requests.

---

# 43. ACQUISITION ATTRIBUTION — P0

Use:

```text
first-touch acquisition
+
last-touch conversion context
```

Capture safe versions of:

```text
utm_source
utm_medium
utm_campaign
utm_content
referrer_domain
landing_path_class
```

## `utm_term`

Do **not** ingest raw `utm_term` by default.

It may contain:

- names;
- surnames;
- user-generated search terms.

Allow only sanitized/allowlisted campaigns if needed.

## Referrer

Capture domain/origin, not full query string by default.

---

# 44. IDENTITY MODEL

Distinguish:

```text
anonymous_visitor_id
session_id
authenticated_user_id optional

search_id
surname_analytics_key
report_id_hash
order_id_hash
```

These are not interchangeable.

---

# 45. ANONYMOUS VISITOR ID

Use a first-party random opaque identifier where consent/policy permits.

It becomes the PostHog `distinct_id` for anonymous interactions.

Do not derive it from:

- email;
- surname;
- IP;
- browser fingerprint.

---

# 46. SESSION ID

P0:

A first-party session identifier with a configurable inactivity timeout.

Recommended initial operational definition:

```text
new session after 30 minutes inactivity
```

because it is understandable and conventional.

Metric definitions must use the Name Atlas session ID rather than relying invisibly on vendor defaults.

---

# 47. SEARCH ID

Generated for each submitted surname search.

Grain:

```text
one search attempt that reaches backend
```

Clarification/confirmation stays attached to the same logical search where practical.

A new explicit surname submission receives a new search ID.

---

# 48. SURNAME ANALYTICS KEY

Do not send literal surname by default.

Recommended:

```text
surname_analytics_key = HMAC(internal_surname_id, analytics_secret/version)
```

Properties can still attach safe surname-context buckets:

```text
frequency_bucket
coverage_tier
country_pack
```

The analytics HMAC allows stable cohorting without exposing the canonical ID directly to every analytics processor.

Rotate/version the strategy only deliberately because it affects longitudinal analysis.

---

# 49. WHY NOT RAW SURNAME

A surname entity may be public content.

But:

```text
Visitor A searched surname X
```

is behavioral information.

Generic analytics does not need raw search text for most product decisions.

Search-quality debugging stays in controlled product/runtime systems.

---

# 50. USER ID

After account/session linkage:

```text
authenticated_user_id
```

may be represented as a pseudonymous internal analytics ID.

Never send:

```text
email
```

as event property.

Prompt 19 will set final policy.

---

# 51. RESEARCH RUN ID

Do not send `research_run_id` on every product event.

It is:

- high-cardinality;
- operational.

Use it in observability/support.

Analytics events only need it in controlled debug or server-canonical reconciliation contexts.

---

# 52. ANALYTICS PRIVACY CLASSES

```text
PUBLIC_PRODUCT
PSEUDONYMOUS_BEHAVIOR
PRIVATE_ACCOUNT
PRIVATE_FAMILY
SENSITIVE
```

## `PUBLIC_PRODUCT`

Examples:

```text
coverage_tier
section_type
premium_eligible
```

## `PSEUDONYMOUS_BEHAVIOR`

Examples:

```text
visitor ID
session ID
search ID
experiment variant
```

## `PRIVATE_ACCOUNT`

Examples:

```text
pseudonymous user ID
order relation
```

## `PRIVATE_FAMILY`

Examples:

```text
grandparent data
family place
private researched person
```

Not allowed in generic P0 product analytics.

## `SENSITIVE`

Examples:

- religion;
- ethnicity;
- DNA;
- health;
- political data.

Not allowed in normal Name Atlas analytics.

---

# 53. EVENT CONSENT CLASSES

Technical taxonomy:

```text
ESSENTIAL_OPERATIONAL
PRODUCT_ANALYTICS
EXPERIMENTATION
MARKETING_ATTRIBUTION
SESSION_REPLAY
```

Prompt 19 decides:

- lawful basis;
- consent/cookie requirements;
- geo-specific rules.

Implementation must make these classes independently switchable.

---

# 54. CLIENT VS SERVER EVENTS

## Client events

Use for human interaction:

```text
section viewed
citation opened
offer viewed/clicked
share interaction
```

## Server events

Use for canonical product state:

```text
resolution completed
free profile ready
premium eligibility
DiscoveryIndex ready
checkout created
purchase completed
report ready
refund completed
```

Critical business facts never rely solely on the browser.

---

# 55. EVENT DELIVERY RELIABILITY

## Best effort

```text
optional interaction detail
```

## Important product event

```text
chapter view
offer view
experiment exposure
```

Retry/buffer where practical.

## Canonical server event

```text
purchase_completed
premium_eligibility_evaluated
report_ready
```

Derived from canonical DB state and sent asynchronously.

---

# 56. ANALYTICS OUTBOX

Use the runtime outbox pattern from Prompt 15 for critical analytics server events.

Possible outbox targets:

```text
ANALYTICS
RUNTIME
EMAIL
```

For example:

```text
purchase transaction
↓
canonical order committed
↓
outbox analytics event
↓
PostHog server capture
```

Analytics delivery failure never rolls back purchase.

---

# 57. EVENT ENVELOPE

Canonical P0 schema:

```json
{
  "event_id": "evt_01K...",
  "event_name": "free_profile_viewed",
  "event_version": 1,
  "occurred_at": "2026-09-17T12:00:00Z",

  "environment": "production",

  "anonymous_visitor_id": "av_...",
  "session_id": "ses_...",
  "user_id": null,

  "search_id": "srch_...",
  "surname_analytics_key": "sak_v1_...",

  "experiment_context": [],

  "properties": {}
}
```

Not every event requires every identifier.

---

# 58. EVENT DEDUPLICATION

Every captured event has:

```text
event_id
```

Server canonical event IDs are stable under retry.

Analytics ingestion/destination should use them for dedupe where supported.

At minimum warehouse/reconciliation logic deduplicates by:

```text
event_id
```

---

# 59. EVENT NAMING

Convention:

```text
snake_case
```

Use verbs in completed/action semantics.

Examples:

```text
surname_search_submitted
free_profile_viewed
purchase_completed
```

Avoid UI implementation names:

```text
blue_button_clicked
card_4_seen
```

---

# 60. EVENT VERSIONING

Each event:

```text
event_version
```

Version increases when:

- semantics change;
- required property meaning changes;
- trigger definition materially changes.

Adding an optional compatible property does not necessarily require a new event version.

---

# 61. EVENT SCHEMA REGISTRY

Store in repository:

```text
/analytics/events/
```

Each event defines:

```text
event_name
version
description
owner
producer
trigger
required properties
optional properties
privacy classes
consent class
status
```

Statuses:

```text
DRAFT
ACTIVE
DEPRECATED
```

---

# 62. METRIC CONTRACT REGISTRY

Store:

```text
/analytics/metrics/
```

Fields:

```text
metric_id
name
version

purpose

numerator
denominator

event sources
grain

eligibility filters
exclusions

default segments

owner
status
```

---

# 63. EVENT ≠ METRIC

Example:

```text
event:
premium_offer_viewed

metric:
purchase_completed / premium_offer_viewed
```

Do not call raw event counts “conversion metrics”.

---

# 64. P0 EVENT TAXONOMY

Recommended P0 event count:

```text
~30 intentional events
```

not hundreds.

---

# 65. EVENT — `session_started`

**Producer:** client.  
**Trigger:** first interactive page activity in a new Name Atlas session.  
**Consent:** PRODUCT_ANALYTICS.  

Required:

```text
session_id
anonymous_visitor_id
landing_type
locale
market
device_class
```

Optional:

```text
acquisition_channel
utm_source
utm_medium
utm_campaign
referrer_domain
```

---

# 66. EVENT — `surname_search_started`

**Producer:** client.  
**Trigger:** user first meaningfully interacts with surname search control during session/search attempt.  

Properties:

```text
entry_surface
```

Do not include typed surname.

---

# 67. EVENT — `surname_search_submitted`

**Producer:** preferably BFF/server after schema-valid submission.  
**Trigger:** valid search request accepted.  

Properties:

```text
search_id
market
locale
country_pack
entry_surface
```

---

# 68. EVENT — `surname_resolution_completed`

**Producer:** server canonical.  
**Trigger:** resolver reaches terminal outcome for submitted search.

Properties:

```text
resolution_outcome
match_type
decision_mode
clarification_required
candidate_count_bucket
```

Do not include fuzzy score.

---

# 69. EVENT — `surname_clarification_shown`

**Producer:** client.  
**Trigger:** actual clarification options visible.

Properties:

```text
clarification_type
candidate_count_bucket
```

---

# 70. EVENT — `surname_clarification_selected`

**Producer:** client/BFF confirmation.  

Properties:

```text
clarification_type
selected_candidate_position_bucket
```

No raw surname.

---

# 71. EVENT — `free_profile_ready`

**Producer:** server canonical.  
**Trigger:** runtime reaches `FREE_READY`.

Properties:

```text
coverage_tier
profile_cache_state
research_mode
premium_eligible_if_already_known
```

This event can occur before client views it.

---

# 72. EVENT — `free_profile_viewed`

**Producer:** client.  
**Trigger:** `FREE_READY` profile is rendered and first meaningful free content is visible for ≥1 second.

Properties:

```text
coverage_tier
profile_cache_state
research_status
acquisition_channel
```

---

# 73. SECTION VIEW EVENTS

Use one generic event:

```text
free_section_viewed
```

instead of seven event names.

Properties:

```text
section_type
section_state
coverage_tier
position_bucket
is_first_substantive_section
```

Allowed `section_type`:

```text
TODAY
RARITY
WHERE
MEANING
ORIGIN
HISTORY
EVIDENCE
```

This reduces taxonomy growth.

---

# 74. EVENT — `why_we_think_this_opened`

Client.

Properties:

```text
claim_type_category
confidence_status
section_type
```

No Claim text.

---

# 75. EVENT — `citation_opened`

Client.

Properties:

```text
source_category
section_type
confidence_status
```

Do not send full source URL/title unless deliberately approved.

---

# 76. EVENT — `alternative_hypothesis_viewed`

Client.

Properties:

```text
hypothesis_count_bucket
section_type
```

---

# 77. EVENT — `map_interacted`

Client.

Properties:

```text
interaction_type
map_layer_type
```

`interaction_type`:

```text
REGION_SELECTED
PERIOD_CHANGED
LAYER_CHANGED
ZOOMED_MEANINGFULLY
```

Avoid logging every pan/zoom gesture.

---

# 78. EVENT — `discovery_index_ready`

Server canonical.

Trigger:

```text
canonical DiscoveryIndex became publishable
```

Properties:

```text
coverage_tier
premium_eligible
eligible_section_count_bucket
variant_count_bucket
place_count_bucket
archive_count_bucket
source_group_count_bucket
```

---

# 79. EVENT — `discovery_index_viewed`

Client.

Trigger:

Discovery preview materially visible.

Properties:

```text
premium_eligible
eligible_section_count_bucket
inventory_depth_bucket
```

---

# 80. EVENT — `discovery_category_opened`

Client.

Properties:

```text
category
count_bucket
```

---

# 81. EVENT — `premium_eligibility_evaluated`

Server canonical.

Properties:

```text
eligible
eligibility_state
coverage_tier
eligible_section_count_bucket
```

Do not treat eligibility as user behavior.

---

# 82. EVENT — `premium_offer_viewed`

Client.

Trigger:

Offer component at least ~50% visible for ≥1 second.

Only for:

```text
premium_eligible = true
```

Properties:

```text
offer_id
price_variant_id if experiment
amount_bucket optional
coverage_tier
discovery_depth_bucket
paywall_variant
```

Do not send formatted surname.

---

# 83. EVENT — `premium_offer_clicked`

Client.

Properties:

```text
offer_id
cta_variant
paywall_variant
```

---

# 84. EVENT — `checkout_started`

Client/BFF.

Trigger:

User begins checkout experience, not merely clicks paywall CTA if there is an intermediate screen.

Properties:

```text
offer_id
amount_minor
currency
paywall_variant
price_variant
```

`amount_minor` is acceptable because it is offer data, not personal data.

---

# 85. EVENT — `checkout_session_created`

Server canonical.

Properties:

```text
offer_id
currency
amount_minor
payment_provider
```

Do not include checkout URL/token.

---

# 86. PAYMENT EVENTS

Do not create both:

```text
payment_completed
purchase_completed
```

with ambiguous semantics.

P0 canonical product analytics event:

```text
purchase_completed
```

Producer:

```text
server / verified commerce state
```

Payment-provider intermediate state remains commerce/observability unless product needs it.

---

# 87. EVENT — `purchase_completed`

Server canonical.

Properties:

```text
order_id_hash
offer_id
product_type
amount_minor
currency
price_variant
paywall_variant
experiment_context
```

Never depend on redirect query parameter.

---

# 88. EVENT — `report_ready`

Server canonical.

Properties:

```text
report_id_hash
product_type
coverage_tier
premium_section_count_bucket
generation_mode
```

---

# 89. EVENT — `report_opened`

Client after authorized report content is visibly rendered.

Properties:

```text
report_id_hash
report_version_bucket
days_since_purchase_bucket
```

---

# 90. EVENT — `report_section_viewed`

Client.

Properties:

```text
report_id_hash
section_type
section_sequence_bucket
```

---

# 91. EVENT — `premium_activated`

Derived or client/server metric event.

Recommended:

Do **not** emit manually.

Derive from:

```text
purchase_completed
+
report_opened
+
report_section_viewed
```

This prevents duplicate semantic events.

---

# 92. EVENT — `report_completed`

Prefer derived metric rather than client event.

Analytics query computes completion using canonical definition in Section 35.

If server materializes completion later, maintain identical definition/version.

---

# 93. EVENT — `share_started`

Client.

Properties:

```text
surface
asset_type
```

---

# 94. EVENT — `share_completed`

Client where platform/browser allows reliable confirmation.

Properties:

```text
surface
asset_type
channel_category optional
```

Do not assume failure to confirm means share did not occur on every OS/browser.

---

# 95. EVENT — `refund_requested`

Server/support system.

Properties:

```text
order_id_hash
product_type
refund_reason_category
```

No free-text reason.

---

# 96. EVENT — `refund_completed`

Canonical server.

Properties:

```text
order_id_hash
amount_minor
currency
refund_reason_category
```

---

# 97. FIRST P0 EVENT TABLE

| Event | Producer | Canonical? | Privacy class | Primary use |
|---|---|---:|---|---|
| `session_started` | Client | No | Pseudonymous | acquisition/session |
| `surname_search_started` | Client | No | Pseudonymous | search friction |
| `surname_search_submitted` | Server/BFF | Yes | Pseudonymous | funnel |
| `surname_resolution_completed` | Server | Yes | Public + pseudonymous association | resolver funnel |
| `surname_clarification_shown` | Client | No | Pseudonymous | search UX |
| `surname_clarification_selected` | Client/BFF | Important | Pseudonymous | search UX |
| `free_profile_ready` | Server | Yes | Product state | activation supply |
| `free_profile_viewed` | Client | No | Pseudonymous | activation |
| `free_section_viewed` | Client | No | Pseudonymous | chapter engagement |
| `why_we_think_this_opened` | Client | No | Pseudonymous | trust |
| `citation_opened` | Client | No | Pseudonymous | trust |
| `alternative_hypothesis_viewed` | Client | No | Pseudonymous | trust/depth |
| `map_interacted` | Client | No | Pseudonymous | map UX |
| `discovery_index_ready` | Server | Yes | Product state | premium supply |
| `discovery_index_viewed` | Client | No | Pseudonymous | premium funnel |
| `discovery_category_opened` | Client | No | Pseudonymous | inventory |
| `premium_eligibility_evaluated` | Server | Yes | Product state | denominator |
| `premium_offer_viewed` | Client | Important | Pseudonymous | conversion |
| `premium_offer_clicked` | Client | Important | Pseudonymous | conversion |
| `checkout_started` | Client/BFF | Important | Account/behavior | checkout |
| `checkout_session_created` | Server | Yes | Account/commerce | checkout |
| `purchase_completed` | Server | **Yes** | Account/commerce | revenue |
| `report_ready` | Server | **Yes** | Account/product | delivery |
| `report_opened` | Client | Important | Account/behavior | premium activation |
| `report_section_viewed` | Client | No | Account/behavior | report value |
| `share_started` | Client | No | Behavior | referral |
| `share_completed` | Client | No | Behavior | referral |
| `refund_requested` | Server | Yes | Account/commerce | quality |
| `refund_completed` | Server | **Yes** | Account/commerce | quality/revenue |

---

# 98. PROPERTY BUDGET

Every event property requires an answer to:

> **Which product decision will this field support?**

Do not add:

```text
raw surname
raw source URL
full Claim text
LLM prompt
full error message
family person details
```

because they are “available”.

---

# 99. CARDINALITY POLICY

High-cardinality identifiers may be used for reconciliation:

```text
event_id
search_id
order_id_hash
```

Do not routinely group dashboards by them.

Dashboard-friendly properties use:

```text
enum
bucket
category
boolean
```

---

# 100. EVENT ENVIRONMENTS

Every event carries:

```text
environment
```

Values:

```text
development
staging
production
```

Production dashboards filter:

```text
environment = production
```

Automated test traffic must never pollute production metrics.

---

# 101. STAFF / INTERNAL TRAFFIC

Where practical mark:

```text
is_internal
```

or maintain internal visitor cohort.

Exclude from normal growth metrics.

Do not manually delete real production events without audit just to improve dashboards.

---

# 102. BOT / CRAWLER FILTERING

SEO requests are not user sessions.

Client product analytics should initialize only when appropriate.

SSR crawler hits can be measured separately through web/server analytics if needed.

Do not count crawlers in:

```text
search activation
chapter engagement
offer conversion
```

---

# 103. METRIC CONTRACT — `VALID_SEARCHES`

Numerator:

```text
surname_search_submitted accepted by backend schema
```

Excludes:

```text
empty/malformed rejected requests
bots/tests
```

Grain:

```text
search_id
```

---

# 104. METRIC — `RESOLUTION_SUCCESS_RATE`

```text
resolved search IDs
/
valid search IDs
```

Required segments:

```text
country_pack
match_type
coverage/frequency later
```

Guardrail:

Resolver golden QA.

---

# 105. METRIC — `FREE_PROFILE_READY_RATE`

```text
searches reaching FREE_READY
/
resolved searches
```

Diagnoses:

- runtime;
- source availability;
- coverage.

---

# 106. METRIC — `FREE_ACTIVATION_RATE`

```text
resolved searches with free_profile_viewed + >=1 eligible substantive section viewed
/
resolved searches with FREE_READY
```

---

# 107. METRIC — `MEANINGFUL_DISCOVERY_RATE`

Defined in Section 9.

This is the primary product-value metric.

---

# 108. METRIC — `HISTORY_ENGAGEMENT_RATE`

```text
searches with history section viewed
/
profiles where history is available/free-visible
```

---

# 109. METRIC — `EVIDENCE_ENGAGEMENT_RATE`

```text
searches with why-we-think/citation/evidence action
/
profiles with at least one such interaction affordance
```

---

# 110. METRIC — `PREMIUM_ELIGIBILITY_RATE`

```text
premium eligible resolved profiles
/
resolved profiles
```

Descriptive opportunity metric.

Not a conversion optimization target.

---

# 111. METRIC — `PREMIUM_OFFER_REACH_RATE`

```text
premium_offer_viewed
/
premium eligible searches that reached the offer zone
```

Requires UI reach denominator.

---

# 112. METRIC — `OFFER_TO_CHECKOUT_RATE`

```text
unique searches with checkout_started
/
unique searches with premium_offer_viewed
```

---

# 113. METRIC — `OFFER_TO_PURCHASE_RATE`

```text
orders
/
unique premium-offer-exposed eligible search opportunities
```

Define attribution window explicitly.

For one-session MVP, same search/session is normal.

For delayed purchase through recovery link, use stable offer/search/order attribution if retained.

---

# 114. METRIC — `CHECKOUT_COMPLETION_RATE`

```text
purchase_completed orders
/
checkout_started opportunities
```

Segment:

```text
device
payment method
price variant
```

---

# 115. METRIC — `REVENUE_PER_ELIGIBLE_PROFILE`

```text
recognized analytics revenue
/
premium-eligible search/profile opportunities
```

Use commerce data reconciliation.

---

# 116. METRIC — `REFUND_RATE`

Two useful versions:

```text
refund orders / completed orders
```

and:

```text
refunded amount / gross revenue
```

---

# 117. METRIC — `REPORT_OPEN_RATE`

```text
unique ready reports opened
/
ready reports
```

---

# 118. METRIC — `PREMIUM_ACTIVATION_RATE`

```text
purchases whose report was opened and at least one substantive premium section viewed
/
purchase_completed
```

---

# 119. METRIC — `REPORT_COMPLETION_RATE`

```text
reports meeting completion definition
/
reports opened
```

---

# 120. METRIC — `REPEAT_SEARCH_RATE`

```text
visitors with >=2 distinct valid searches within selected cohort window
/
visitors with >=1 valid search
```

Do not call this retention without specifying window.

---

# 121. METRIC — `SHARE_RATE`

```text
search/profile opportunities with share_completed
/
free profiles viewed
```

Also track:

```text
share_started
```

because completion confirmation may be unreliable across platforms.

---

# 122. COVERAGE-AWARE ANALYTICS

Every result/premium funnel report should be segmentable by:

```text
coverage_tier
```

and major availability flags:

```text
has_population
has_current_map
has_meaning
has_origin
has_history
has_archive_references
premium_eligible
```

This prevents misdiagnosing data scarcity as UX failure.

---

# 123. INTERNAL FREQUENCY BUCKETS

Analytics-only segmentation:

```text
VERY_COMMON
COMMON
MEDIUM
RARE
VERY_RARE_OR_SUPPRESSED
UNKNOWN
```

Definition is versioned and based on canonical current data.

Do not automatically expose these exact bucket labels to users.

---

# 124. RESOLUTION SEGMENTS

```text
EXACT
KNOWN_FORM
CLARIFICATION
AMBIGUOUS
UNRESOLVED
```

Useful for:

- search UX;
- downstream engagement.

Do not optimize resolution segment distribution independently from resolver quality.

---

# 125. LATENCY / EXPERIENCE SEGMENTS

Product analytics may carry:

```text
profile_delivery_class
```

Values:

```text
CACHE_HIT
FAST_RESEARCH
PARTIAL_ASYNC
DEEP_ASYNC
```

Detailed latency belongs to observability.

---

# 126. QUALITY GUARDRAIL SET

Canonical experiment guardrails from Prompt 17:

```text
false_merge_incidents
false_auto_resolve_incidents

unsupported_claim_incidents
false_verified_incidents
family_overreach_incidents

rights_violation_incidents
premium_access_violation_incidents
paywall_truthfulness_failures

refund_rate
report_delivery_failure_rate
```

Some should remain zero-tolerance release blockers rather than statistical guardrails.

---

# 127. `INSUFFICIENT_DATA` ANALYTICS

Track:

```text
profile/Claim rates with INSUFFICIENT_DATA
```

Use for:

- source investment;
- onomastic partnership;
- product coverage.

Never set product OKR:

> reduce INSUFFICIENT_DATA.

The rate may rise when truth standards improve.

---

# 128. CONFLICT RATE

Track:

```text
profiles with one or more CONFLICTING major Claims
```

Not a defect.

Useful for:

- UI design;
- human review;
- source strategy.

---

# 129. SOURCE FAILURE CONTEXT

Server product event may carry:

```text
research_degradation_category
```

Example:

```text
NONE
HISTORY_SOURCE_UNAVAILABLE
ONOMASTICS_SOURCE_UNAVAILABLE
MULTIPLE_OPTIONAL_FAILURES
```

Do not expose provider stack traces in analytics.

---

# 130. PREMIUM INVENTORY SEGMENTS

Use buckets:

```text
eligible_section_count_bucket
historical_variant_count_bucket
historical_place_count_bucket
archive_reference_count_bucket
independent_source_group_bucket
```

Example bucket style:

```text
0
1
2-3
4-7
8+
```

Exact bucket thresholds are analytics config and should be stable/versioned.

---

# 131. DO NOT CREATE A USER-FACING DISCOVERY SCORE

DiscoveryIndex is transparent inventory.

Do not turn it into:

```text
Discovery Score 87/100
```

for the user.

If an internal coverage composite is later useful for segmentation, it must:

- be explainable;
- never replace transparent dimensions;
- remain internal.

P0 does not need it.

---

# 132. DASHBOARD 1 — EXECUTIVE PRODUCT

Audience:

```text
founder/product/growth
```

Metrics:

```text
valid searches
resolved searches
FREE_READY searches
Meaningful Discovery Rate

premium eligible opportunities
orders
gross/net revenue
revenue per premium eligible profile

refund rate
report open rate
premium activation

trust/quality blocker count
```

Breakdowns:

```text
week
acquisition
coverage tier
device
```

---

# 133. DASHBOARD 2 — SEARCH & DISCOVERY

```text
search starts
submits
resolution outcomes
clarification rate
unresolved rate

FREE_READY
coverage distribution

free activation
meaningful discovery

section view rates
history engagement
evidence engagement
```

---

# 134. DASHBOARD 3 — PREMIUM FUNNEL

```text
premium eligible
discovery index viewed
offer viewed
offer clicked
checkout started
purchase completed

revenue per eligible profile
AOV
refund rate

report ready
report open
premium activation
report completion
```

Always segmented by:

```text
coverage tier
inventory depth
```

---

# 135. DASHBOARD 4 — COVERAGE / DATA AVAILABILITY

```text
population availability
current map availability
meaning coverage
origin coverage
history coverage
archive coverage

premium eligibility

NO_APPROVED_SOURCE
SOURCE_UNAVAILABLE
RIGHTS_BLOCKED
INSUFFICIENT_EVIDENCE
```

Use this dashboard to prioritize:

- data sources;
- partnerships;
- connector work.

---

# 136. DASHBOARD 5 — TRUST / QUALITY

Inputs primarily from Prompt 17 / runtime.

```text
false merge incidents
false VERIFIED incidents
unsupported claim incidents
family overreach incidents

rights blocks
rights violations

paywall mismatch
premium access issue

QA block rate
LLM grounding failures
```

A conversion dashboard without this view is incomplete.

---

# 137. DASHBOARD 6 — ACQUISITION

```text
sessions
valid searches
free activation
meaningful discovery
premium eligibility
purchase
revenue
```

by:

```text
organic
direct
referral
social
campaign
```

---

# 138. DASHBOARD 7 — EXPERIMENTS

For every running experiment:

```text
sample / exposure
allocation
SRM status

primary metric
effect estimate / interval
guardrails

coverage-tier balance
device balance where pre-specified

runtime
experiment status
```

---

# 139. ANALYTICS ALERTS

Priority examples:

## Trust alerts

```text
paywall truth mismatch > 0
premium access violation > 0
rights violation > 0
```

Immediate.

## Product anomaly

```text
resolution outcome distribution abrupt shift
premium eligibility unexpected jump
purchase funnel abrupt drop
refund spike
report failure spike
```

## Instrumentation

```text
purchase DB events > analytics purchase events beyond tolerance
event schema rejection spike
experiment SRM
```

---

# 140. WAREHOUSE DECISION

P0:

> **Do not add a separate Snowflake/BigQuery-style warehouse solely for product analytics.**

Use:

```text
PostHog Cloud EU
+
canonical application PostgreSQL
+
commerce/payment source
```

Periodic exports/reconciliation can be added.

Add a dedicated warehouse when:

- complex cross-domain SQL exceeds analytics platform;
- finance/product data science requires it;
- multiple analytics consumers exist;
- multi-country/large-scale data grows;
- experiment metrics require warehouse-native canonical joins.

---

# 141. FUTURE WAREHOUSE MODEL

When justified:

```text
fact_events
fact_searches
fact_orders
fact_reports
fact_experiment_assignments

dim_date
dim_acquisition
dim_surname_segment
dim_experiment
dim_product
```

Do not copy:

```text
full SourceRecords
full EvidenceItems
family research graph
```

into generic analytics warehouse without a specific purpose.

---

# 142. `fact_searches`

Grain:

```text
one accepted surname search
```

Fields:

```text
search_id
occurred_at
session_id pseudonymous

surname_analytics_key
country_pack

resolution_outcome
match_type

coverage_tier
premium_eligible

profile_cache_state
research_delivery_class

acquisition_channel
experiment variants relevant to search
```

---

# 143. `fact_orders`

Grain:

```text
one order
```

Source of truth:

```text
commerce DB
```

Analytics fact is a derived copy.

---

# 144. ANALYTICS RECONCILIATION

Daily/periodic checks:

```text
canonical purchases
vs
analytics purchase_completed events
```

```text
canonical report READY
vs
report_ready analytics
```

```text
premium eligibility DB
vs
eligibility analytics
```

Instrumentation drift must be visible.

---

# 145. SESSION REPLAY — P0 DECISION

Default:

```text
DISABLED
```

until Prompt 19 approves configuration.

If later enabled:

- EU region;
- explicit masking of surname search input;
- mask all form inputs by default;
- exclude checkout/payment;
- exclude report/private family routes as appropriate;
- shortest useful retention;
- consent gating where required.

PostHog provides controls to block sensitive DOM/input capture, but configuration still remains Name Atlas's responsibility.

---

# 146. EXPERIMENTATION ARCHITECTURE

```text
Experiment Spec
↓
Eligibility
↓
Deterministic Assignment
↓
Feature Flag / Variant
↓
Exposure
↓
Outcome Events
↓
Experiment Analysis
↓
Quality Guardrails
↓
Decision
```

---

# 147. FEATURE FLAG ≠ EXPERIMENT

Feature flags may exist for:

```text
release safety
kill switch
progressive rollout
country rollout
```

An experiment additionally requires:

```text
hypothesis
randomization
metrics
exposure
analysis plan
```

---

# 148. EXPERIMENT ASSIGNMENT UNIT

Choose per experiment.

## Visitor

Default for public acquisition/free/paywall/pricing UX.

Benefits:

- consistent experience across sessions;
- no price switching.

## Session

Use only for transient, low-stakes interaction experiments where cross-session consistency is irrelevant.

## Search

Use sparingly.

One visitor could receive different search layouts, increasing contamination/confusion.

## User/account

Use for paid/authenticated report experiences.

## Surname

Usually **not** the primary unit.

Coverage varies strongly by surname and surname-level assignment can confound treatment with data richness.

---

# 149. DEFAULT P0 ASSIGNMENT

For:

```text
free result layout
Discovery Index presentation
paywall
price
```

use:

```text
anonymous_visitor_id
```

as stable assignment key.

When user later identifies/authenticates, preserve existing assignment for active experiment rather than rebucketing.

---

# 150. DETERMINISTIC BUCKETING

Assignment:

```text
hash(experiment_id + experiment_version + stable_assignment_key)
→ bucket
→ variant
```

PostHog feature flags/experiments can provide deterministic assignment, but Name Atlas must:

- keep stable `distinct_id`;
- evaluate eligibility before exposure;
- preserve price/offer variant through checkout.

Never use:

```text
Math.random()
```

on page render.

---

# 151. EXPERIMENT ASSIGNMENT VS EXPOSURE

## Assignment

User has been allocated a variant.

## Exposure

User actually encountered treatment.

These are different.

Example:

Visitor is assigned paywall B but never reaches paywall.

They should not enter the exposed paywall analysis population.

---

# 152. EXPERIMENT EXPOSURE

Canonical event:

```text
experiment_exposed
```

Required:

```text
experiment_id
experiment_version
variant_id
assignment_unit_type
surface
```

Fire only when treatment materially affects rendered/user behavior.

---

# 153. POSTHOG EXPOSURE NOTE

PostHog experiments use feature flag exposure and existing events.

Name Atlas should avoid evaluating an experiment flag unnecessarily high in the page/app if that would count users who never encounter treatment.

Eligibility first:

```text
if premium_eligible:
    evaluate paywall experiment
```

not:

```text
evaluate paywall experiment
if premium_eligible:
    render
```

This protects denominator quality.

---

# 154. MODEL CHANGE PROPOSAL 18-A — `ExperimentAssignment`

For material monetization experiments, especially price/offer:

Persist a minimal server-side assignment snapshot.

```text
experiment_assignment_id
experiment_id
experiment_version

assignment_unit_hash
variant_id

assigned_at
first_exposed_at

status
```

Why:

- stable price through checkout;
- auditable assignment;
- vendor independence for material offer history.

For low-risk presentation experiments, vendor-owned flag assignment may be sufficient.

**Recommendation:** P0 for price/paywall experiments; optional for general UI.

---

# 155. MODEL CHANGE PROPOSAL 18-B — `AnalyticsContext`

Create a server-side projection/value object, not canonical domain entity:

```text
AnalyticsContext
```

Contains safe buckets:

```text
coverage_tier
premium_eligible
resolution_outcome
frequency_bucket
delivery_class
country_pack
```

Event producers consume this rather than reaching directly into the full domain graph.

Why:

- privacy minimization;
- consistent segmentation;
- avoids leaking raw domain fields.

**Recommendation:** P0 shared library/value object.

---

# 156. EXPERIMENT EVENT MODEL

```text
experiment_assigned
experiment_exposed
```

Assignment may be vendor-generated/server recorded.

Exposure must correspond to actual treatment.

Every outcome event can attach:

```text
active_experiment_variants
```

only for a small relevant set, avoiding huge property blobs.

---

# 157. EXPERIMENT SPEC

Repository definition:

```yaml
experiment_id: EXP_PAYWALL_001
version: 1
name: discovery_inventory_layout
owner: growth-product

hypothesis: >
  Showing actual available historical inventory as report chapters
  will increase checkout starts among premium-eligible profiles
  without increasing refund or truthfulness failures.

eligibility:
  market: PL
  premium_eligible: true
  discovery_index_ready: true

assignment:
  unit: VISITOR
  allocation:
    control: 0.5
    treatment: 0.5

variants:
  control: inventory_cards
  treatment: chapter_preview

primary_metric:
  id: OFFER_TO_CHECKOUT_RATE

secondary_metrics:
  - OFFER_TO_PURCHASE_RATE
  - DISCOVERY_ENGAGEMENT_RATE

guardrails:
  - REFUND_RATE
  - PAYWALL_TRUTHFULNESS_FAILURES
  - TECHNICAL_ERROR_RATE

analysis:
  methodology: FIXED_HORIZON_FREQUENTIST
  alpha: 0.05
  power: 0.80
  baseline: required
  mde: required
  minimum_full_week_cycles: 1

status: DRAFT
```

Example methodology fields do not guarantee statistical viability until baseline/traffic estimates exist.

---

# 158. EXPERIMENT STATUS

```text
DRAFT
QA
READY
RUNNING
PAUSED
COMPLETED
STOPPED_GUARDRAIL
INVALID
ROLLED_OUT
ARCHIVED
```

---

# 159. PRIMARY METRIC RULE

Each experiment has:

```text
one primary decision metric
```

Before start.

Secondary metrics explain mechanism.

Do not select a “winner” because one of 20 metrics happened to move.

---

# 160. GUARDRAILS

Required classes:

```text
TRUTH
RIGHTS / PRIVACY
TECHNICAL
CUSTOMER QUALITY
```

Examples:

### Truth

```text
paywall_truthfulness_failures
unsupported_claim incidents
```

### Technical

```text
API errors
checkout errors
```

### Customer quality

```text
refund rate
report open
```

---

# 161. EXPERIMENT STOP CONDITIONS

Immediate stop independent of statistical result:

```text
rights violation
premium content leak
paywall truth mismatch
material privacy issue
major checkout/report technical regression
```

Potential operational stop:

```text
refund spike above pre-specified threshold
```

Threshold must be set before experiment where possible.

---

# 162. SAMPLE RATIO MISMATCH

Every randomized experiment checks:

```text
expected assignment ratio
vs
actual exposed allocation
```

A significant SRM is a validity threat.

Possible causes:

- implementation bug;
- event loss;
- inconsistent eligibility;
- treatment causing exposure-event loss;
- randomization problem.

Experiment becomes:

```text
INVALID / PAUSED FOR INVESTIGATION
```

until understood.

Do not interpret outcome metric normally.

LaunchDarkly's current methodology documentation similarly treats SRM as an experiment health problem that can invalidate results.

---

# 163. STATISTICAL STANDARD — P0

Recommended P0 standard:

> **Fixed-horizon frequentist testing for ordinary product/monetization experiments.**

Before start define:

```text
baseline
MDE
alpha
power
sample size estimate
planned duration
```

Default governance values:

```text
alpha = 0.05
power = 0.80
```

These are conventional defaults, not laws.

Each important experiment may justify stricter settings.

---

# 164. WHY FIXED HORIZON FIRST

Advantages:

- easy to explain;
- easy to pre-register;
- reduces casual peeking;
- sufficient for early product work;
- supported by modern experimentation platforms.

PostHog currently supports both Bayesian and frequentist experiment analysis.

Do not mix methodologies opportunistically after seeing results.

---

# 165. SEQUENTIAL TESTING — P1

Valid sequential methods can allow repeated analysis without standard fixed-horizon peeking bias.

Use only after:

- platform methodology is understood;
- team governance is documented;
- decision rules are fixed.

Do not implement “check p-value daily and stop when <0.05” and call it sequential testing.

---

# 166. SAMPLE SIZE / POWER

Before experiment:

1. estimate baseline primary-metric rate/mean;
2. choose meaningful MDE;
3. choose alpha;
4. choose power;
5. estimate eligible exposure/day;
6. calculate sample/duration.

If the required sample is unrealistic:

- choose larger meaningful MDE;
- redesign experiment;
- use qualitative/usability research;
- wait for traffic.

Do not run a mathematically underpowered test merely to get a dashboard.

---

# 167. LOW TRAFFIC POLICY

Early Name Atlas may not support frequent A/B testing.

Use maturity order:

```text
instrument
↓
baseline
↓
qualitative fixes
↓
high-impact experiments only
↓
broader experimentation later
```

With low traffic:

- one experiment at a time;
- larger effects;
- fewer variants;
- fewer metrics;
- longer duration if business context stable.

---

# 168. MINIMUM DURATION

For consumer web funnel experiments:

Plan for at least one full weekly cycle where practical, even if nominal sample size arrives earlier.

Reason:

- weekday/weekend differences;
- acquisition mix;
- family-curiosity behavior may vary.

Final duration is determined by sample plan, not a universal 7-day rule.

---

# 169. OPTIONAL STOPPING

Fixed-horizon P0:

Do not stop because:

```text
p < 0.05 on day 2
```

Do not continue because:

```text
p = 0.06 until it becomes significant
```

Follow the pre-specified horizon/sample rule unless a safety guardrail stops the test.

---

# 170. MULTIPLE COMPARISONS

P0 preference:

```text
2 variants
1 primary metric
```

If:

- multiple treatment variants;
- multiple primary comparisons;

use valid multiple-comparison handling supported by platform/statistical plan.

Avoid complexity until traffic supports it.

---

# 171. EXPERIMENT HEALTH CHECKS

Before trusting results:

```text
SRM
exposure event working
primary metric events working
variant persisted
eligibility stable
no major system outage
no treatment contamination
```

---

# 172. QUALITY-NORMALIZED ANALYSIS

Paywall/pricing experiments must include:

```text
coverage_tier
inventory_depth_bucket
```

as pre-specified balance/segment checks.

Reason:

Rich surnames naturally convert differently from weak surnames.

Randomization should balance them at adequate samples, but small early tests can be distorted.

---

# 173. COVERAGE-AWARE RANDOMIZATION

P0:

Randomize at visitor level after premium eligibility.

Check balance by:

```text
coverage tier
inventory depth
device
acquisition
```

If early traffic is very low and coverage composition is highly skewed, consider stratified assignment later.

Do not manually cherry-pick balancing after experiment starts.

---

# 174. SEGMENT ANALYSIS

Pre-specified high-value segments:

```text
coverage tier
device
new vs returning
acquisition channel
surname frequency bucket
```

Treat post-hoc segment findings as:

```text
hypothesis-generating
```

unless corrected/validated.

---

# 175. MUTUAL EXCLUSION

Experiment groups:

```text
SEARCH_UX
FREE_FLOW
DISCOVERY
PAYWALL
PRICING
REPORT
```

Avoid simultaneous experiments that alter the same decision surface unless factorial interaction is intentionally designed.

P0:

one active experiment per surface.

---

# 176. FEATURE FLAGS

Flags used for:

```text
rollout
kill switch
beta
experiment variant
```

Every flag has:

```text
owner
purpose
created_at
expected cleanup condition
```

Remove stale experiment flags after conclusion/rollout.

---

# 177. EXPERIMENTATION ON TRUTH — FORBIDDEN

Never A/B test:

```text
VERIFIED vs LIKELY label
show uncertainty vs hide uncertainty
strict resolver vs aggressive resolver for conversion
rights check on vs off
paywall actual count vs inflated count
```

These are trust policies, not marketing variables.

---

# 178. RESOLVER CHANGES

Evaluation order:

```text
offline golden corpus
↓
Prompt 17 metrics
↓
shadow/canary
↓
production rollout
```

Product conversion is secondary diagnostic only.

A resolver with more purchases but more false merges is worse.

---

# 179. CONFIDENCE POLICY CHANGES

Never randomized to consumers.

One Claim has one canonical confidence state for that version/evidence state.

Change requires:

```text
policy version
golden QA
expert review where relevant
```

---

# 180. SOURCE / EVIDENCE THRESHOLD CHANGES

Same rule.

Not a conversion experiment.

---

# 181. LLM MODEL EXPERIMENTS

Offline/canary evaluation:

Primary metrics:

```text
unsupported claim rate
schema validity
citation fidelity
uncertainty preservation
latency
cost
```

Product engagement is secondary after quality parity.

---

# 182. LLM NARRATIVE STYLE

Once:

```text
Claim set
confidence
citations
limitations
```

are fixed, style can be A/B tested.

Examples:

```text
concise editorial
narrative editorial
```

Forbidden:

- adding facts;
- changing qualifiers.

---

# 183. PRICING EXPERIMENTS

Allowed when:

- baseline funnel instrumented;
- premium inventory stable;
- enough traffic exists.

Possible variants are experiment hypotheses, e.g.:

```text
29 PLN
39 PLN
49 PLN
```

This document does not recommend a winning price.

---

# 184. PRICING ASSIGNMENT

Use visitor-level deterministic assignment.

Persist:

```text
price variant
offer ID
```

through checkout/order.

A visitor must not see:

```text
29 PLN
```

then:

```text
49 PLN
```

on refresh within active experiment.

---

# 185. PRICING PRIMARY METRIC

Recommended:

```text
REVENUE_PER_PREMIUM_ELIGIBLE_PROFILE
```

not purchase conversion alone.

Secondary:

```text
purchase rate
checkout completion
AOV
```

Guardrails:

```text
refund rate
report open
support issues
```

---

# 186. PAYWALL EXPERIMENTS

Allowed:

```text
information hierarchy
evidence placement
report cover preview
chapter preview
CTA wording
one-off payment reassurance
source transparency
```

Forbidden:

```text
fake discoveries
fake countdown
false scarcity
hidden uncertainty
```

---

# 187. FREE VALUE EXPERIMENTS

Possible:

```text
Population → Rarity → Map → Origin
```

vs:

```text
Population → Map → Rarity → Origin
```

Eligibility for map treatment:

```text
valid map available
```

Do not penalize no-map surnames.

Primary metric candidate:

```text
MEANINGFUL_DISCOVERY_RATE
```

Secondary:

```text
history reach
share rate
```

---

# 188. DISCOVERY INDEX PRESENTATION

Experiment only the presentation of the actual inventory.

Examples:

```text
inventory cards
vs
report chapter preview
```

Canonical count is identical.

---

# 189. TRUST PRESENTATION EXPERIMENTS

Examples:

```text
confidence explanation inline
vs
expandable
```

```text
source summary above premium CTA
vs
below
```

All variants retain mandatory uncertainty.

---

# 190. REPORT EXPERIENCE EXPERIMENTS

Allowed:

- chapter sequence;
- TOC treatment;
- citation prominence;
- timeline/map placement.

Report's underlying evidence/Claim set must be identical for treatment and control where experiment intends presentation only.

---

# 191. SHARE EXPERIMENTS

Allowed:

- placement;
- CTA wording;
- asset layout.

Only share-eligible public facts.

---

# 192. SEO EXPERIMENTS

Measure:

- organic entry;
- search activation;
- meaningful discovery;
- premium conversion.

SEO experiments may change:

- titles;
- snippets;
- internal links;
- layout.

Never generate unsupported text variants.

---

# 193. EXPERIMENT HYPOTHESIS 1 — FREE FLOW ORDER

**Question:** Does moving a valid geographic map earlier increase discovery depth?

Eligibility:

```text
PL
current map available
new visitor/search
```

Control:

```text
Population → Rarity → Map → Origin
```

Treatment:

```text
Population → Map → Rarity → Origin
```

Primary:

```text
MEANINGFUL_DISCOVERY_RATE
```

Secondary:

```text
history_section_view_rate
share_rate
```

Guardrails:

```text
technical_error_rate
free_activation_rate
```

No factual difference.

---

# 194. EXPERIMENT HYPOTHESIS 2 — DISCOVERY INDEX PRESENTATION

Hypothesis:

> Presenting the same validated DiscoveryIndex as report chapters rather than raw inventory categories may improve premium understanding.

Eligibility:

```text
premium eligible
DiscoveryIndex ready
```

Control:

```text
inventory categories + counts
```

Treatment:

```text
report chapter preview backed by same inventory
```

Primary:

```text
offer_to_checkout_rate
```

Secondary:

```text
discovery engagement
offer_to_purchase
```

Guardrails:

```text
paywall_truthfulness_failures = 0
refund rate
```

---

# 195. EXPERIMENT HYPOTHESIS 3 — SOURCE TRANSPARENCY AT PAYWALL

Hypothesis:

> Showing source/coverage evidence adjacent to the offer may reduce uncertainty and improve high-intent conversion.

Control:

```text
source summary below offer
```

Treatment:

```text
compact source summary above/inside offer
```

Primary:

```text
offer_to_checkout_rate
```

Secondary:

```text
citation/source details engagement
purchase
```

Guardrails:

```text
free/premium comprehension issues
technical errors
refund
```

---

# 196. EXPERIMENT HYPOTHESIS 4 — REPORT PREVIEW FORM

Control:

```text
chapter list
```

Treatment:

```text
representative report-cover / structured sample preview
```

Same truthful inventory.

Primary:

```text
offer_to_purchase_rate
```

Secondary:

```text
checkout start
sample interaction
```

Guardrail:

```text
refund EXPECTED_MORE_DATA
```

---

# 197. EXPERIMENT HYPOTHESIS 5 — PRICE

Only after baseline volume supports a powered test.

Example candidates:

```text
29 PLN
49 PLN
```

or another approved pair.

Primary:

```text
REVENUE_PER_PREMIUM_ELIGIBLE_PROFILE
```

Secondary:

```text
purchase rate
checkout completion
```

Guardrails:

```text
refund rate
report open
premium activation
support issues
```

Do not run concurrently with major paywall-content experiment unless intentionally designed.

---

# 198. EXPERIMENT ASSIGNMENT EVENT

```text
experiment_assigned
```

Properties:

```text
experiment_id
experiment_version
variant_id
assignment_unit_type
```

Producer:

```text
server/flag system where practical
```

This event is not equivalent to exposure.

---

# 199. EXPERIMENT EXPOSURE EVENT

```text
experiment_exposed
```

Required when the experimental treatment becomes real.

Properties:

```text
experiment_id
experiment_version
variant_id
surface
```

Never calculate exposed denominator from assignments alone.

---

# 200. SAMPLE RATIO MONITOR

For each experiment:

```text
expected allocation
actual assignment
actual exposure
```

Monitor both assignment and exposure ratios.

A difference between assignment and exposure can itself reveal treatment-induced delivery problems.

---

# 201. ANALYTICS DATA QUALITY

Monitor:

```text
event schema rejection rate
duplicate event rate
missing required property rate
unknown event version rate

server/client order anomalies
experiment assignment without exposure
exposure without assignment

purchase DB vs analytics discrepancy
```

---

# 202. EVENT VALIDATION

Use shared TypeScript schemas.

Client:

- validate in dev/test;
- production SDK should fail safely and not block UI.

Server:

- validate before analytics outbox enqueue.

Malformed analytics event:

```text
drop/log
```

not fail purchase/search.

---

# 203. ANALYTICS MUST NOT BLOCK PRODUCT

Hard runtime rule:

```text
analytics destination unavailable
```

must not prevent:

- search;
- profile;
- checkout;
- purchase;
- report.

Server analytics outbox retries later.

---

# 204. SOURCE OF TRUTH MATRIX

| Question | Canonical source |
|---|---|
| Was surname resolved? | Product/resolution DB |
| Is a Claim true/current? | Claim/Evidence system |
| Is premium eligible? | PremiumEligibility / DiscoveryIndex |
| Did the user view a section? | Analytics event |
| Was purchase completed? | Commerce/payment DB |
| What revenue was booked? | Finance/payment system |
| Is report ready? | Report DB/runtime |
| Did Polona timeout? | Observability/runtime |
| Which experiment variant? | Experiment assignment system |
| Did user encounter treatment? | Experiment exposure event |
| Did QA detect false merge? | Prompt 17 QA system |

---

# 205. ANALYTICS WAREHOUSE RETENTION

Prompt 18 defines technical classes only:

```text
raw event
pseudonymous event
experiment assignment
aggregate metric
session replay
marketing attribution
```

Prompt 19 determines:

- legal basis;
- actual retention periods;
- deletion/anonymization;
- data-subject handling.

Do not hardcode multi-year retention solely because vendor permits it.

---

# 206. SESSION REPLAY PRIVACY BOUNDARY

If activated later, never assume masking defaults are sufficient.

High-risk fields/routes:

```text
surname search box
checkout
email
future family region
family person inputs
report/private family routes
```

Explicit inclusion/exclusion and masking rules required.

---

# 207. ANALYTICS QA IN PROMPT 17 SUITE

Add cases:

```text
ANA-001 purchase_completed emitted exactly once
ANA-002 premium_offer_viewed only when offer rendered
ANA-003 experiment_exposed only after treatment
ANA-004 raw surname rejected from generic event schema
ANA-005 private family property rejected
ANA-006 server purchase reconciliation
ANA-007 low-data profile does not emit offer viewed
ANA-008 map view absent when map unavailable
ANA-009 crawler does not emit user funnel events
ANA-010 staging events excluded from production
```

---

# 208. ANALYTICS FAILURE MODES — TOP 15

1. Raw surname text sent to analytics unnecessarily.
2. Family details leak into generic event properties.
3. Client `purchase_completed` used as revenue truth.
4. `premium_offer_viewed` fires for hidden/off-screen offer.
5. Low-data profiles included in paywall denominator.
6. Missing map treated as map drop-off.
7. Coverage tier missing from monetization analysis.
8. Duplicate events inflate funnel.
9. Bots inflate SEO engagement.
10. Staff/test traffic contaminates baseline.
11. Event semantics change without version.
12. Vendor session definition silently differs from product metric.
13. Session replay captures private inputs.
14. Observability errors dumped into product analytics with high cardinality.
15. Analytics outage blocks product operation.

---

# 209. EXPERIMENTATION FAILURE MODES — TOP 15

1. Experiment changes truth/confidence instead of presentation.
2. Assignment is re-randomized on page refresh.
3. Assigned users counted as exposed despite never seeing treatment.
4. Experiment includes ineligible profiles.
5. Rich/poor surname coverage imbalance misread as treatment effect.
6. SRM ignored.
7. Primary metric chosen after results.
8. Dozens of metrics mined for significance.
9. Fixed-horizon test stopped early after favorable p-value.
10. Underpowered result declared winner.
11. Pricing test optimizes purchase rate while revenue falls.
12. Conversion lift accompanied by refund/trust regression.
13. Simultaneous paywall + price experiments contaminate results.
14. Backend/source change occurs mid-test without annotation.
15. Winner rolled out despite Prompt 17 quality guardrail failure.

---

# 210. PRODUCT DECISION CADENCE

## Daily

Operational product health:

```text
search volume
free-ready failure
checkout/report problems
critical analytics alerts
```

## Weekly

```text
funnel
coverage
acquisition
premium
quality guardrails
```

## Experiments

Formal decision review at planned horizon/valid sequential checkpoint.

## Monthly

```text
data coverage gaps
source partnership ROI
retention/repeat behavior
pricing/business economics
```

Avoid reacting to day-to-day noise.

---

# 211. P0 ANALYTICS DASHBOARDS

Build only:

1. Executive Product.
2. Search & Discovery.
3. Premium Funnel.
4. Coverage / Data Availability.
5. Trust / QA.
6. Acquisition.

Experiment dashboard is platform-provided plus governance view.

---

# 212. P0 IMPLEMENTATION ORDER

## Stage 1 — Metric contracts

Define:

```text
valid search
resolution success
free activation
meaningful discovery
premium eligibility
offer conversion
purchase
report activation
```

before writing events.

## Stage 2 — Shared event schema

TypeScript schemas + privacy metadata.

## Stage 3 — Server canonical events

```text
search submitted
resolution
profile ready
premium eligibility
DiscoveryIndex
purchase
report ready
refund
```

## Stage 4 — Client interaction events

```text
profile view
section view
citation
offer
share
report view
```

## Stage 5 — QA

Prompt 17 analytics tests.

## Stage 6 — PostHog dashboards

Core funnel/coverage.

## Stage 7 — guardrail dashboard

Prompt 17 aggregate signals.

## Stage 8 — feature flag infrastructure

No experiment yet.

## Stage 9 — baseline collection

Collect enough traffic to estimate baseline/MDE.

## Stage 10 — first controlled experiment

Only after instrumentation passes reconciliation.

---

# 213. P0 METRICS — LAUNCH LIST

## Acquisition

```text
sessions
valid searches per session
acquisition channel mix
```

## Search

```text
search submit rate
resolution success rate
clarification rate
unresolved rate
```

## Value

```text
FREE_PROFILE_READY_RATE
FREE_ACTIVATION_RATE
MEANINGFUL_DISCOVERY_RATE

HISTORY_ENGAGEMENT_RATE
EVIDENCE_ENGAGEMENT_RATE
```

## Coverage

```text
coverage-tier distribution
map availability rate
meaning availability rate
origin availability rate
history availability rate
premium eligibility rate
```

## Premium

```text
Discovery Index view rate
offer reach rate
offer CTR
offer-to-checkout
offer-to-purchase
checkout completion
```

## Revenue

```text
orders
gross revenue
refunds
AOV
revenue/search
revenue/premium-eligible profile
```

## Post-purchase

```text
report ready rate
report open rate
premium activation rate
report completion rate
report revisit rate
```

## Growth

```text
repeat search rate
share start rate
share completion rate
referral search rate
```

## Trust

```text
QA blockers
rights violations
paywall truthfulness failures
unsupported claim incidents
false merge incidents
refund rate
```

---

# 214. P0 DASHBOARD DENOMINATORS — MASTER TABLE

| Metric | Numerator | Denominator |
|---|---|---|
| Search submit rate | submitted searches | search starts |
| Resolution success | resolved searches | valid submitted searches |
| Free ready rate | FREE_READY | resolved searches |
| Free activation | activated searches | FREE_READY searches |
| Meaningful Discovery | meaningful discoveries | resolved searches with ≥1 available substantive insight |
| History engagement | history viewed | profiles with available history |
| Evidence engagement | evidence interaction | profiles with evidence affordance |
| Premium eligibility | eligible profiles | resolved profiles |
| Discovery Index view | discovery viewed | ready DiscoveryIndex opportunities |
| Offer reach | offer viewed | eligible users reaching offer zone |
| Offer → checkout | checkout started | offer viewed |
| Offer → purchase | purchase | offer viewed |
| Checkout completion | purchase | checkout started |
| Revenue / eligible | revenue | premium eligible opportunities |
| Report open | report opened | report ready |
| Premium activation | opened + section viewed | purchases |
| Report completion | completed reports | opened reports |
| Refund rate | refunded orders | completed orders |

---

# 215. FIRST-TOUCH ATTRIBUTION

On first eligible session:

store safe acquisition snapshot:

```text
channel
utm source/medium/campaign
referrer domain
landing type
```

Do not overwrite first-touch with every visit.

---

# 216. LAST-TOUCH CONVERSION CONTEXT

At checkout/purchase:

record safe current attribution:

```text
last_channel
last_campaign
last_landing_context
```

Use for directional marketing measurement.

Do not present this as causal attribution.

---

# 217. MULTI-TOUCH — NOT P0

Complex multi-touch models introduce:

- attribution assumptions;
- implementation complexity;
- false precision.

Defer until paid acquisition mix justifies it.

---

# 218. SEO ANALYTICS

Use Search Console / SEO platform data for:

```text
impressions
clicks
query/page performance
```

rather than pretending client analytics can measure SERP impressions.

Join at:

```text
canonical surname page
```

where privacy/terms permit.

---

# 219. DATA PARTNERSHIP ANALYTICS

Before/after a new approved source:

Measure:

```text
coverage improvement
INSUFFICIENT_DATA reduction
new valid historical inventory
premium eligibility change
Meaningful Discovery change
premium revenue change
```

Quality remains equally important.

Example:

A source that increases revenue but introduces low-authority claims is not automatically good.

---

# 220. PARTNERSHIP ROI

Framework:

```text
annual license cost
+
engineering/maintenance cost
```

vs:

```text
additional eligible profiles
additional evidence depth
improved authority
incremental premium revenue
reduced manual review
```

Do not reduce source value to conversion alone.

---

# 221. LOW-DATA ANALYTICS

Track percentage of searches ending in:

```text
LIMITED
MINIMAL
```

and:

```text
premium ineligible
```

Then analyze:

- acquisition channel;
- surname-frequency bucket;
- country/foreign surname;
- unresolved history dimensions.

This informs source strategy.

---

# 222. CONFLICT ANALYTICS

Track:

```text
conflicting major-claim profile rate
alternative_hypothesis_view_rate
evidence engagement
```

This can help decide how much UI space competing interpretations deserve.

Do not pressure research to reduce conflict counts.

---

# 223. SUPPORT / ERROR ANALYTICS

Category only:

```text
DATA_CONCERN
MISSING_DATA
PAYMENT
REPORT_ACCESS
TECHNICAL
SOURCE_QUESTION
REFUND
OTHER
```

Free-form support messages stay in support system.

---

# 224. FEATURE FLAGS — GOVERNANCE

Flag registry fields:

```text
flag_key
owner
purpose

type:
  RELEASE
  EXPERIMENT
  KILL_SWITCH

created_at
expected_cleanup

truth_sensitive: boolean
```

If `truth_sensitive = true`:

requires Prompt 17/offline QA rather than ordinary experiment.

---

# 225. ANALYTICS ENVIRONMENT ISOLATION

Separate PostHog projects or environment property strategy must ensure:

```text
development
staging
production
```

never mix in primary dashboards.

Recommended:

- dedicated production project;
- non-production project for dev/staging where practical.

---

# 226. MARKETING ATTRIBUTION PRIVACY

Avoid collecting:

```text
full referrer query
full search-engine query
unfiltered UTM term
```

Use allowlists.

Prompt 19 must review marketing/consent implications.

---

# 227. SESSION REPLAY COST / PRIVACY

Even if replay is included in a vendor free tier, do not enable it simply because cost is zero.

It creates:

- privacy scope;
- retention burden;
- masking QA;
- consent complexity.

Product instrumentation should be useful without it.

---

# 228. EXPERIMENTATION PLATFORM MATURITY

P0 PostHog already supports:

- feature flags;
- experiments;
- Bayesian and frequentist analysis;
- event metrics;
- warehouse metrics.

Do not build a custom statistics engine for ordinary P0 UI experiments.

Name Atlas still owns:

- experiment eligibility;
- truth guardrails;
- quality governance;
- source-of-truth metrics.

---

# 229. ANALYTICS PLATFORM VENDOR LOCK-IN DEFENCE

Canonical event names and metric definitions live in Name Atlas repository.

Application calls:

```text
analytics.capture(event)
```

through an internal adapter.

Do not scatter PostHog-specific event construction across components.

This makes vendor migration possible.

---

# 230. ANALYTICS SDK CONTRACT

```ts
interface AnalyticsClient {
  capture(event: AnalyticsEvent): void;
  identify(input: AnalyticsIdentity): void;
  reset(): void;

  getExperimentVariant?(experimentKey: string): Promise<string | null>;
}
```

Server has separate:

```ts
interface ServerAnalytics {
  enqueue(event: AnalyticsEvent): Promise<void>;
}
```

Client capture must never throw into product UI.

---

# 231. EVENT CONTEXT BUILDER

One utility builds safe common context:

```text
environment
market
locale
device class

session ID
visitor ID

acquisition
experiment context
```

Domain-specific event producer adds only relevant safe properties.

---

# 232. DO NOT AUTOCAPTURE EVERYTHING

P0 should not rely on broad autocapture as the canonical taxonomy.

Reason:

- noisy;
- unstable DOM semantics;
- privacy risk;
- weak metric contracts.

Explicit events own key funnels.

Limited autocapture may assist exploration if privacy approved, but never defines purchase/eligibility/value metrics.

---

# 233. EVENT LOSS MONITORING

For server canonical events:

Daily reconciliation.

Example:

```text
commerce DB purchases = 31
PostHog purchase_completed unique event IDs = 30
```

→ instrumentation alert.

Do not “fix” by modifying finance numbers.

---

# 234. EXPERIMENT ASSIGNMENT RECONCILIATION

For material price/paywall experiment:

compare:

```text
server assignment table
PostHog exposures
checkout offer variant
order offer variant
```

Mismatch invalidates or flags affected experiment rows.

---

# 235. P0 EXPERIMENTATION SYSTEM

Components:

```text
PostHog feature flags / experiments

+
Name Atlas experiment-spec repository

+
safe event taxonomy

+
material experiment assignment persistence

+
quality guardrail dashboard

+
Prompt 17 experiment QA
```

No custom experiment-results service.

---

# 236. EXPERIMENT PRE-LAUNCH CHECKLIST

Every experiment:

- hypothesis written;
- eligibility defined;
- assignment unit fixed;
- variants fixed;
- exposure trigger tested;
- primary metric fixed;
- secondary metrics fixed;
- guardrails fixed;
- baseline available;
- sample plan documented;
- SRM monitor enabled;
- Prompt 17 relevant tests pass;
- product/analytics owner approves.

---

# 237. EXPERIMENT DECISION TEMPLATE

At completion record:

```text
experiment ID/version
dates

planned sample
actual exposure
SRM result

primary metric estimate
uncertainty / interval
secondary metrics
guardrails

predefined segment results

data-quality incidents
concurrent releases/incidents

decision:
  ROLL_OUT
  REJECT
  INCONCLUSIVE
  INVALID

reason
owner
```

---

# 238. INCONCLUSIVE IS VALID

If test is underpowered or interval includes both meaningful positive/negative effects:

```text
INCONCLUSIVE
```

Do not force a winner because engineering already built treatment.

---

# 239. INVALID IS VALID

Examples:

- SRM;
- exposure bug;
- source outage changes population composition;
- assignment changed mid-run;
- purchase event lost.

Mark:

```text
INVALID
```

Re-run after fixing if still important.

---

# 240. EXPERIMENT ANNOTATIONS

Maintain timeline for:

```text
major deployment
source outage
new PESEL snapshot
marketing campaign
checkout incident
```

Experiment reviewer must inspect relevant concurrent changes.

---

# 241. P0 EXPERIMENTATION ORDER

Do not start 5 experiments immediately.

Recommended:

1. instrument;
2. baseline;
3. run one free-flow or Discovery presentation experiment;
4. prove assignment/exposure/SRM process;
5. run paywall test;
6. only then consider price.

---

# 242. P1 ANALYTICS

Later:

- Family Origin funnel;
- Deep Research;
- human-research handoff;
- gift buyer/recipient flows;
- report update/version engagement;
- lifecycle email analytics;
- country expansion;
- data-source partnership ROI;
- warehouse-backed analyses;
- longer-term retention.

---

# 243. DO NOT BUILD YET

1. Complex multi-touch attribution.
2. ML churn model.
3. Propensity-to-buy scoring.
4. Sensitive family-based personalization.
5. Real-time enterprise warehouse.
6. Five analytics vendors.
7. Custom A/B statistics engine.
8. Permanent global holdout.
9. Factorial experimentation platform.
10. Session Replay before privacy review.
11. Hundreds of interaction events.
12. Generic scroll-depth dashboards.
13. Conversion experiment on resolver thresholds.
14. Confidence-label experiments.
15. Rights-gate experiments.

---

# 244. ANALYTICS GOVERNANCE

Every event:

```text
owner
version
status
privacy class
```

Every metric:

```text
owner
definition
version
```

Every experiment:

```text
owner
hypothesis
guardrails
decision record
```

No undocumented dashboard-only metric becomes canonical through repeated usage.

---

# 245. DASHBOARD GOVERNANCE

Each dashboard has:

```text
audience
purpose
canonical metrics
owner
last reviewed
```

Avoid the common analytics failure:

> three dashboards display three different “conversion rates.”

---

# 246. MODEL CHANGE PROPOSALS SUMMARY

## 18-A — ExperimentAssignment

Persist for material monetization experiments.

**Recommendation:** P0 before first pricing/paywall experiment.

## 18-B — AnalyticsContext

Safe product-state projection for analytics.

**Recommendation:** P0 shared code/value object.

No other canonical domain changes are required.

---

# 247. DECISION REGISTER

## Product-value metric

**Decision:** `MEANINGFUL_DISCOVERY_RATE` as product North Star.  
**Alternative:** search count / free completion / purchase.  
**Why:** measures deeper evidence-backed consumption without equating revenue with value.  
**Risk:** definition is more complex than page-view metrics.  
**Follow-up:** validate correlation with qualitative feedback/repeat behavior.

## Business metric

**Decision:** revenue per premium-eligible profile.

## Analytics platform

**Decision:** PostHog Cloud EU P0.

## Session Replay

**Decision:** disabled pending Prompt 19.

## Warehouse

**Decision:** no separate warehouse at MVP.

## Raw surname

**Decision:** not sent to generic analytics; HMAC internal surname key where needed.

## Canonical server events

**Decision:** runtime/commerce-derived and outbox-delivered.

## Event naming

**Decision:** snake_case, action semantics.

## Event count

**Decision:** small explicit taxonomy; no uncontrolled autocapture dependency.

## Experiment assignment

**Decision:** stable visitor-level by default.

## Price assignment

**Decision:** persist material assignment through checkout/order.

## Exposure

**Decision:** separate from assignment and fire only when treatment is encountered.

## Statistical method

**Decision:** fixed-horizon frequentist P0; valid sequential later.

## Alpha/power

**Decision:** 0.05 / 0.80 default governance starting point, configurable by experiment.

## SRM

**Decision:** mandatory health check.

## Segment analysis

**Decision:** pre-specify high-value segments; post-hoc findings exploratory.

## Coverage

**Decision:** required segmentation context for result/paywall analysis.

## Truth experimentation

**Decision:** prohibited.

## LLM experiments

**Decision:** quality-first offline/canary.

## Dashboard count

**Decision:** six core P0 dashboards.

---

# 248. P0 ANALYTICS IMPLEMENTATION CHECKLIST

Engineering:

- analytics adapter;
- PostHog EU config;
- consent-class gating hooks;
- visitor/session/search IDs;
- surname analytics HMAC;
- shared event schemas;
- server analytics outbox;
- client event capture;
- server event capture;
- environment isolation;
- feature flag adapter;
- ExperimentAssignment table before monetization experiments.

Product/analytics:

- metric registry;
- six dashboards;
- acquisition taxonomy;
- coverage segments;
- first experiment specs.

QA:

- event contract tests;
- purchase reconciliation;
- no-raw-surname tests;
- experiment exposure tests;
- SRM health test path.

---

# 249. DEFINITION OF ANALYTICS READY

Analytics architecture is MVP-ready only when:

### Metrics

- `MEANINGFUL_DISCOVERY_RATE` has one implementation;
- free activation has one definition;
- premium conversion uses premium-eligible context;
- report activation/completion definitions are stable;
- quality guardrails are visible next to growth metrics.

### Events

- event taxonomy is versioned;
- events have producer ownership;
- client/server responsibility is explicit;
- canonical purchase/report events are server-side;
- event schemas validate;
- duplicate server events can be deduplicated;
- staging/test traffic is isolated.

### Privacy minimization

- raw surname is not sent by default;
- family details cannot enter generic event schema;
- source URLs/Claim text are excluded;
- consent classes exist;
- Session Replay is disabled until Prompt 19 decision.

### Experiments

- assignment is deterministic;
- assignment and exposure are separate;
- material price/paywall assignment can be audited;
- one primary metric is predefined;
- guardrails are predefined;
- SRM is checked;
- fixed-horizon experiments have baseline/MDE/sample plan;
- no truth/right/confidence semantics are randomized;
- Prompt 17 quality failures can block rollout.

### Reliability

- analytics delivery cannot block product;
- purchase events reconcile against commerce DB;
- event loss is monitored;
- vendor adapter exists.

---

# 250. INPUTS REQUIRED BY PROMPT 19

Prompt 19 — Privacy / Security / Legal Ops — receives:

## Identifiers

```text
anonymous_visitor_id
session_id
pseudonymous_user_id
search_id
surname_analytics_key
order/report hashes
```

## Event classes

```text
ESSENTIAL_OPERATIONAL
PRODUCT_ANALYTICS
EXPERIMENTATION
MARKETING_ATTRIBUTION
SESSION_REPLAY
```

## Data categories

```text
public product state
pseudonymous behavior
account/commerce
private family
sensitive
```

## Analytics vendor

```text
PostHog Cloud EU candidate
```

with:

- EU Frankfurt option;
- DPA;
- privacy controls.

## Proposed policies

```text
no raw surname by default
no family data in generic analytics
Session Replay off pending review
server purchase events
first/last attribution context
```

Prompt 19 must decide:

- GDPR/legal basis;
- consent/cookie implementation;
- retention;
- deletion/DSAR;
- processor agreements;
- international transfers;
- security controls;
- replay legality;
- marketing cookies;
- experiment cookies/identifiers;
- privacy notice content.

---

# 251. VERIFIED EXTERNAL REFERENCES — 2026-09-17

## PostHog

Current pricing/free allowances and integrated product set:

`https://posthog.com/pricing`

Privacy controls, EU Frankfurt cloud and DPA:

`https://posthog.com/docs/privacy`

Experimentation supports feature-flag exposure, event/warehouse metrics, Bayesian and frequentist analysis:

`https://posthog.com/docs/experiments`

## Statsig

Current analytics/experiment/flag/replay product and pricing snapshot:

`https://statsig.com/pricing`

## Amplitude

Current platform/free tier:

`https://amplitude.com/pricing`

## Mixpanel

Current platform/free tier:

`https://mixpanel.com/pricing/`

## GrowthBook

Current warehouse-native experiments/flags/analytics plans:

`https://www.growthbook.io/pricing`

## LaunchDarkly

Current experiment/feature-management pricing:

`https://launchdarkly.com/pricing/`

Experiment SRM methodology:

`https://launchdarkly.com/docs/guides/statistical-methodology/sample-ratios`

Experiment sample-size guidance:

`https://launchdarkly.com/docs/home/experimentation/sample-size-calculator`

Current experiment-analysis capabilities including sequential testing and multiple comparisons:

`https://launchdarkly.com/docs/home/experimentation/analyze`

---

# 252. FINAL ANALYTICS ARCHITECTURE

```text
                         NAME ATLAS
                              │
       ┌──────────────────────┼──────────────────────┐
       ▼                      ▼                      ▼
 CLIENT INTERACTION     SERVER PRODUCT STATE       QA 17
       │                      │                      │
       │                      │                      │
       └──────────────┬───────┴──────────────┬───────┘
                      ▼                      ▼
             PRIVACY-SAFE EVENT         QUALITY SIGNALS
                   SCHEMAS
                      │
                      ▼
                  POSTHOG EU
                      │
        ┌─────────────┼─────────────────────┐
        ▼             ▼                     ▼
     FUNNELS       DASHBOARDS          EXPERIMENTS
        │             │                     │
        └─────────────┼─────────────────────┘
                      ▼
                 DECISION REVIEW
                      │
           ┌──────────┴──────────┐
           ▼                     ▼
        ROLLOUT                REJECT
           │
           ▼
       GUARDRAILS
           │
           └────────────► Prompt 17 QA
```

And independently:

```text
Claims / Evidence
Commerce
Runtime observability
```

remain authoritative within their own domains.

---

# 253. FINAL RECOMMENDATION

The analytics system should be designed to prevent a common growth-product error:

> seeing a funnel number move and assuming the product became better.

For Name Atlas, the correct interpretation model is:

```text
CONVERSION
+
COVERAGE
+
POST-PURCHASE VALUE
+
TRUST / QUALITY
```

A paywall treatment that raises purchase rate while:

- refunds rise;
- users open fewer reports;
- weak-data surnames are oversold;
- paywall inventory becomes misleading;

is not a winner.

Likewise, a resolver that increases `resolution_success_rate` by merging more similar surname forms is not improving the product if false merge risk rises.

The operating principle is therefore:

> **Measure growth aggressively, but only inside the boundaries established by the evidence system.**

The Name Atlas analytics layer exists to answer:

```text
Are more people reaching real value?
Are eligible users understanding the premium value?
Are buyers actually consuming what they purchased?
Which product changes improve those outcomes?
```

without ever changing the answer to:

```text
What does the evidence actually support?
```
