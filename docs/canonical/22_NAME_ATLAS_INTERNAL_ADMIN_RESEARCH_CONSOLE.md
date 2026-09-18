# NAME ATLAS — INTERNAL ADMIN / RESEARCH CONSOLE

**Document:** 22. Internal Admin / Research Console  
**Version:** 1.0.0 — Internal Operations Baseline  
**Date:** 2026-09-17  
**Initial market:** Poland  
**Status:** Candidate implementation specification  
**Depends on:** Documents 10–21  
**Next:** `23_NAME_ATLAS_IMPLEMENTATION_ROADMAP.md`

---

# 0. PURPOSE, AUTHORITY AND OPERATING PRINCIPLE

This document defines the internal operating system for Name Atlas.

It is not a generic CRUD panel.

Its purpose is to let authorized staff inspect, review and operate the canonical system without bypassing the truth, rights, privacy, security, commerce or QA layers already defined in Documents 10–21.

The central rule is:

> **Admin access grants operational capability, not permission to redefine truth.**

A human reviewer may:

```text
approve
reject
supersede
annotate
escalate
request more research
resolve a documented ambiguity
```

A human reviewer may not:

```text
type an unsupported claim
→ mark it verified
→ publish it
```

The internal console therefore sits above domain commands and validators.

```text
STAFF UI
↓
INTERNAL API
↓
DOMAIN COMMAND
↓
POLICY / AUTHORIZATION / VALIDATION
↓
CANONICAL WRITE
↓
AUDIT
↓
INVALIDATION / REBUILD
```

There is deliberately no path:

```text
ADMIN UI
↓
DIRECT DATABASE EDIT
↓
PUBLISHED FACT
```

---

# 1. EXECUTIVE DECISIONS

The P0 internal-tool architecture should use:

1. **A separate Next.js admin application in the same monorepo.**
2. Recommended host:

```text
admin.nameatlas.com
```

3. Staff authentication through **SSO + MFA / corporate IdP policy**.
4. A dedicated internal API namespace:

```text
/internal/v1/
```

5. No admin SQL editor.
6. No generic repository CRUD exposed directly to browser.
7. Mutations expressed as **typed domain commands**.
8. Every high-impact command records:
   - actor;
   - role;
   - reason;
   - expected version;
   - before/after version;
   - request ID;
   - audit event.
9. `Researcher` and `Support` are different roles.
10. Source raw values and normalized values are always visually distinct.
11. SearchCandidate is visually and semantically distinct from NameForm/Evidence.
12. Human review is a first-class workflow, not an error screen.
13. Claims cannot be approved without evidence-policy validation.
14. Confidence is normally recalculated from reviewed evidence, not directly overwritten.
15. Surname merge/split is a dual-control operation with impact preview.
16. RightsProfile changes are high-impact, versioned, dual-reviewed operations.
17. Rights `UNKNOWN` is represented as blocked/review-required, never “almost allowed.”
18. Runtime modules can be retried independently and idempotently.
19. SEO operators may suppress or rebuild pages but cannot bypass truth/rights/privacy gates.
20. Support operators cannot view raw payment credentials or unrestricted research data.
21. Raw magic-link tokens are never displayed in admin.
22. Privacy deletion is multi-step, previewed and audited.
23. Audit records are immutable from the admin UI.
24. Bulk operations require dry-run, impact count and explicit approval.
25. Stale concurrent writes fail with `409 CONCURRENT_MODIFICATION`.
26. Paid-review cases can receive operational priority but not lower evidence thresholds.
27. P0 console is desktop-first.
28. Mobile admin is optional/read-only.
29. Advanced family/person research UI is P1.
30. Internal tool complexity follows real operational needs rather than anticipating every future genealogy workflow.

---

# 2. RECOMMENDED INTERNAL TOOLING — 2026-09-17

## 2.1 Application framework

Use the same primary frontend stack as the public product:

```text
Next.js
React
TypeScript
```

but as a separate admin application.

Current Next.js continues to provide the full-stack App Router model suitable for internal application pages and route handling.

Reference:

https://nextjs.org/docs

---

# 3. SERVER-STATE MANAGEMENT

Use:

```text
TanStack Query
```

for:

- queue reads;
- resource detail reads;
- mutations;
- cache invalidation;
- polling operational state;
- optimistic display only where semantically safe.

Its query/mutation/invalidation model maps cleanly to the existing API architecture.

Reference:

https://tanstack.com/query/latest/docs/framework/react/quick-start

---

# 4. TABLES

Use:

```text
TanStack Table v9
```

for dense operational tables.

Current v9 is a headless table engine that supports table logic while leaving markup/styling under Name Atlas control.

Use it for:

- queues;
- Claims;
- Evidence;
- orders;
- audit;
- Sources;
- ResearchRuns.

Reference:

https://tanstack.com/table/latest/docs/framework/react

Do not use a generic admin-builder grid as the domain model.

---

# 5. ACCESSIBLE PRIMITIVES

Use accessible primitives such as:

```text
React Aria Components
```

for high-interaction admin UI:

- Dialog;
- ComboBox;
- Menu;
- ListBox;
- overlays;
- forms.

React Aria's component system is built around ARIA semantics and keyboard/screen-reader behavior.

Reference:

https://react-spectrum.adobe.com/

Semantic UI testing should use role/label-based queries rather than CSS implementation details.

---

# 6. STAFF AUTHENTICATION

Requirement:

```text
SSO + MFA
```

using the organization's existing IdP wherever practical.

Do not create username/password staff auth inside Name Atlas.

If a managed application-auth layer is needed, WorkOS AuthKit is a current viable option with:

- SSO;
- SAML/OIDC;
- MFA;
- organization authentication policies;
- hosted or API-driven flows.

References:

https://workos.com/docs/authkit/sso

https://workos.com/docs/authkit/mfa

This is not a mandatory vendor decision.

Canonical requirement remains:

```text
corporate identity
+
MFA/IdP policy
+
individual accounts
+
role mapping
```

---

# 7. SECURITY VERIFICATION

Admin controls should meet the security requirements from Document 19 and the chosen ASVS 5.0 Level 2 target.

OWASP ASVS 5.0 is the current stable verification standard and explicitly includes authorization/access-control requirements as part of secure application verification.

Reference:

https://owasp.org/projects/asvs

---

# 8. DEPLOYMENT ARCHITECTURE

Recommended monorepo:

```text
/apps
  /web
  /admin
  /worker

/packages
  /domain
  /contracts
  /internal-contracts
  /db
  /ui
  /ui-admin
  /auth
  /audit
```

Deployment:

```text
www / public app
admin.nameatlas.com / internal app
workers
```

The admin application can share:

- domain package;
- internal API client;
- authentication primitives;
- UI primitives;

without sharing public bundles.

---

# 9. WHY SEPARATE ADMIN APP

Benefits:

- staff-only auth boundary;
- separate CSP;
- no admin code in consumer bundle;
- independent deploy/rollback;
- simpler noindex/private policy;
- stronger mental separation between public presentation and canonical operations.

Do not create a new microservice solely for the admin frontend.

Backend remains the modular monolith.

---

# 10. ADMIN BOUNDED CONTEXTS

P0 console is divided into:

```text
QUEUES
SURNAMES
RESEARCH
EVIDENCE / CLAIMS
SOURCES
RIGHTS
SEO
COMMERCE
PRIVACY
QA
AUDIT
```

Each module receives only the capabilities it needs.

---

# 11. ROLE MODEL — P0

Avoid role explosion.

Recommended P0 roles:

```text
RESEARCHER
SENIOR_RESEARCHER
SOURCE_RIGHTS_OPERATOR
SEO_OPERATOR
SUPPORT_OPERATOR
COMMERCE_OPERATOR
PRIVACY_OPERATOR
ENGINEER
SECURITY_ADMIN
ADMIN
```

Specialist capability labels can supplement roles:

```text
ONOMASTICS_REVIEWER
GENEALOGY_REVIEWER
```

rather than creating dozens of permanent RBAC roles.

---

# 12. RBAC + ABAC

Use hybrid authorization.

## RBAC determines broad capability

Example:

```text
SEO_OPERATOR
may operate SEO publication resources
```

## ABAC determines resource-level eligibility

Example:

```text
GENEALOGY_REVIEWER
may view FAMILY_PRIVATE
only when assigned to that case
```

Attributes:

```text
PrivacyClass
SecurityClass
workspace_id
assigned_reviewer
market
source
action
resource owner
case membership
```

---

# 13. P0 ROLE MATRIX

Legend:

```text
V = view
A = act
D = dual approval required
— = no access
```

| Capability | Researcher | Senior Researcher | Rights | SEO | Support | Commerce | Privacy | Engineer | Admin |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| View public surname entity | V | V | V | V | V | V | V | V | V |
| View SourceRecord/Evidence | V | V | V | V-limited | — | — | case-only | V | V |
| Review Evidence | A | A | — | — | — | — | — | V | V |
| Review Claim | A | A | — | — | — | — | — | V | V |
| Approve standard Claim | A | A | — | — | — | — | — | — | V |
| Merge surname | — | D | — | — | — | — | — | — | D |
| Split surname | — | D | — | — | — | — | — | — | D |
| Edit RightsProfile proposal | — | V | A | — | — | — | V | — | V |
| Approve commercial rights | — | — | D | — | — | — | D | — | D |
| Disable connector | — | V | A | — | — | — | — | A | A |
| Retry ResearchModule | A | A | — | — | — | — | — | A | A |
| View SEO projection | V | V | V | V | — | — | — | V | V |
| Suppress SEO page | — | A | V | A | — | — | — | A | A |
| Force INDEX around truth block | — | — | — | — | — | — | — | — | — |
| View Order | — | — | — | — | V | V | case-only | V-limited | V |
| Issue refund | — | — | — | — | request | A | — | — | A |
| Grant Entitlement | — | — | — | — | — | A/D | — | — | A/D |
| View private family future case | assigned only | assigned | — | — | — | — | case-only | emergency | controlled |
| Execute DSAR | — | — | — | — | — | — | A | — | A |
| Role administration | — | — | — | — | — | — | — | — | A |
| Break-glass | — | — | — | — | — | — | — | controlled | controlled |

Actual policy lives server-side.

---

# 14. ADMIN HOME

The home screen is an operational queue, not a KPI dashboard.

Primary modules:

```text
PAID REPORT BLOCKS
HUMAN REVIEW
SOURCE FAILURES
RIGHTS REVIEWS
QA BLOCKS
SEO OPERATIONS
COMMERCE EXCEPTIONS
PRIVACY REQUESTS
SECURITY INCIDENTS
```

Each shows:

```text
count
oldest age
highest priority
new since last visit
```

No vanity:

```text
Claims approved today
Researcher leaderboard
```

---

# 15. SEVERITY VS PRIORITY

Keep separate.

## Severity

Potential damage:

```text
CRITICAL
HIGH
MEDIUM
LOW
```

## Operational priority

Work-order priority:

```text
P0
P1
P2
P3
```

Example:

```text
one inaccurate obscure internal note
severity LOW
priority P3
```

```text
premium entitlement exposure
severity CRITICAL
priority P0
```

---

# 16. GLOBAL SEARCH

Search targets:

```text
surname/name form
surname_id
claim_id
evidence_id
source_record_id
research_run_id
report_id
public order reference
```

PII search targets such as email are:

```text
support/commerce/privacy only
```

Family-person search future:

```text
assignment-scoped
```

No unrestricted staff people-finder.

---

# 17. SURNAME INSPECTOR

Top-level page:

```text
/admin/surnames/{surname_id}
```

Header:

```text
Canonical surname
Surname ID
Entity status
Profile status
Coverage
Premium eligibility
SEO status
Last research
```

Tabs:

```text
Identity
Claims
Evidence
Research
History
SEO
Reports
Audit
```

---

# 18. IDENTITY TAB

Show:

```text
canonical NameForm
accepted modern forms
gender forms
transliterations if approved
historical-attested forms
migration adaptations
```

Separate panel:

```text
SEARCH CANDIDATES
```

with strong visual distinction.

Search candidate card:

```text
method
tier
score/ranking diagnostic
generated_at
resolver version
ephemeral
```

Label:

> **Search candidate — not evidence and not an accepted surname form.**

---

# 19. RESOLUTION INSPECTOR

Debug input example:

```text
Cichwoski
```

Display:

```text
raw input

Unicode/NFC representation
identity/search keys

script
security/confusable flags

candidate generation:
  exact
  accepted form
  diacritic
  fuzzy
  edit rerank

candidate order
resolution outcome
decision mode
resolver version
```

---

# 20. RESOLUTION SIMULATOR

Internal read-only operation:

```text
simulate input
```

against:

- current resolver;
- optional candidate resolver version in staging/testing.

It produces:

```text
ResolverTrace
```

but no canonical mutation.

Use for:

- debugging;
- golden-case reproduction;
- support investigation.

---

# 21. SURNAME MERGE — HIGH-RISK COMMAND

Never expose:

```text
Merge
```

as simple row action.

Workflow:

```text
PROPOSE MERGE
↓
SELECT SOURCE ENTITY
SELECT TARGET ENTITY
↓
STATE EVIDENCE / REASON
↓
SYSTEM DIFF
↓
IMPACT PREVIEW
↓
SECOND REVIEW
↓
COMMAND EXECUTION
↓
INVALIDATION
↓
AUDIT
```

---

# 22. MERGE IMPACT PREVIEW

Show affected:

```text
NameForms
external IDs

Claims
Evidence relationships
Confidence

historical forms
occurrences
places

active ResearchRuns
Coverage
DiscoveryIndex

public profile
SEOProjection
SlugAliases

Reports
ReportVersions
```

Commerce Orders remain immutable.

---

# 23. MERGE VALIDATION

Cannot merge if command fails:

```text
evidence policy
identity policy
active conflict
rights
```

unless explicitly escalated to senior identity review.

Fuzzy similarity alone can never satisfy merge.

---

# 24. MERGE DUAL CONTROL

Required:

```text
proposer != approver
```

Actors:

```text
SENIOR_RESEARCHER
ADMIN
```

depending staffing.

In a very small company where two qualified staff do not exist:

- merge remains pending;
- founder/specialist second review is required;
- do not weaken the rule through a “super admin” bypass.

---

# 25. UNMERGE / REVERSIBILITY

A merge creates:

```text
MergeDecision
```

and versioned lineage.

Physical source/evidence history is preserved.

Unmerge:

- only if descendants/side effects can be deterministically reassigned;
- otherwise becomes split/migration workflow.

No irreversible row deletion.

---

# 26. SPLIT WORKFLOW

Split requires mapping:

```text
which NameForms
which Claims
which historical relations
which Evidence relationships
which SlugAliases
which external IDs
```

Impact preview includes:

```text
SEO
reports
Coverage
DiscoveryIndex
```

Old entity remains traceable.

Default public URL during unresolved split:

```text
safe disambiguation / suppressed state
```

as defined in SEO architecture.

---

# 27. SOURCE REGISTRY

Route:

```text
/admin/sources
```

Table columns:

```text
Source
Type
Market
Access type
Connector
Operational status
Rights status
Freshness
Last success
Next rights review
Owner
```

---

# 28. SOURCE STATUS

Operational enum:

```text
ACTIVE
DEGRADED
DISABLED
SCHEMA_CHANGED
AUTH_FAILED
REVIEW_REQUIRED
RIGHTS_BLOCKED
CONTRACT_EXPIRED
```

Rights state is still displayed independently.

Do not overload one enum to mean both.

---

# 29. SOURCE DETAIL

Tabs:

```text
Overview
Connector
Schema
Health
Rights
Records
Attribution
Change History
```

---

# 30. CONNECTOR OPERATIONS

Allowed commands:

```text
TestConnector
DisableConnector
EnableConnector
RunFixture
AcknowledgeSchemaChange
```

Do not offer:

```text
Run 1 million source queries
```

as generic UI action.

Production live-test is:

- bounded;
- rate-limit aware;
- audited.

---

# 31. CONNECTOR HEALTH

Display:

```text
last success
last failure
availability trend
p50/p95 latency
429 count/rate
schema errors
auth errors
record anomaly
circuit status
```

This is observability data.

No product-conversion metrics here.

---

# 32. SCHEMA DRIFT

Detail page:

```text
EXPECTED
vs
OBSERVED
```

Diff:

- missing fields;
- added fields;
- type changes;
- enum changes.

Show:

```text
first observed
affected connector version
affected ResearchModules
```

Actions:

```text
Disable
Create engineering issue
Acknowledge after code/schema update
```

Never:

```text
Ignore indefinitely
```

---

# 33. RIGHTS CONSOLE

Route:

```text
/admin/rights
```

Priority views:

```text
UNKNOWN
REVIEW_REQUIRED
EXPIRING
TERMS_CHANGED
PAID_BLOCKED
IMAGE_RESTRICTED
```

---

# 34. RIGHTS PROFILE DETAIL

Display each right separately:

```text
automated_access
commercial_use
metadata_reuse
database_extraction
raw_cache
derivative_cache
redistribution
image_reproduction
transcription
AI_processing
SEO
share
paid_report
```

Source contract/terms:

```text
URL
version/date
captured copy/ref
checked_at
reviewer
expiry
```

---

# 35. RIGHTS STATUS

Use:

```text
ALLOWED
ALLOWED_WITH_CONDITIONS
PARTNERSHIP_REQUIRED
PROHIBITED
UNKNOWN
```

UX:

```text
UNKNOWN
=
blocking / neutral-warning
```

Never color `UNKNOWN` as weak green.

---

# 36. RIGHTS CHANGE WORKFLOW

```text
PROPOSE CHANGE
↓
REASON
↓
ATTACH TERMS / CONTRACT EVIDENCE
↓
SYSTEM IMPACT PREVIEW
↓
LEGAL/RIGHTS REVIEW
↓
SECOND APPROVAL for commercial-enable changes
↓
COMMIT NEW VERSION
↓
INVALIDATE SURFACES
```

---

# 37. RIGHTS IMPACT PREVIEW

Display affected counts:

```text
SourceRecords
EvidenceItems
Claims

SEO pages
share outputs

DiscoveryIndex entries
PremiumEligibility profiles

Report templates / future report builds
existing ReportVersions/assets
```

Existing immutable purchased artifacts are not silently rewritten.

They may require legal/remediation workflow.

---

# 38. RIGHTS EXPIRY QUEUE

Show:

```text
30 days
14 days
expired
overdue review
terms hash changed
```

Do not automatically infer new commercial permission from a changed website.

---

# 39. EMERGENCY RIGHTS BLOCK

Rights/legal operator can execute:

```text
EmergencyBlockSourceSurface
```

which:

- blocks new paid use;
- blocks SEO/share if applicable;
- triggers invalidation;
- keeps source/provenance/audit.

Reason required.

Second approval may happen after immediate safety block.

---

# 40. EVIDENCE EXPLORER

Route:

```text
/admin/evidence/{evidence_id}
```

Header:

```text
EvidenceType
Directness
Status
Source
Rights
Claim usage
```

---

# 41. RAW / NORMALIZED VIEW

Always separate.

```text
SOURCE RAW
──────────
"Cichowsky"

NORMALIZED / INTERPRETED
──────────
Cichowsky
```

If normalization differs:

show diff.

Never replace source text.

---

# 42. SOURCE RECORD PANEL

Show:

```text
SourceRecord ID
external record ID

source
ingest batch
schema version
retrieved_at

raw metadata
locator
payload hash
```

Raw payload loads lazily.

---

# 43. RAW ASSET RIGHTS

Possible states:

```text
metadata only
asset preview allowed
asset restricted
legal reviewer only
```

Internal access is still governed by source contract.

“Internal” does not automatically mean unrestricted.

---

# 44. OCR EVIDENCE

Display:

```text
original OCR
normalized search text
correction candidates
source OCR quality/confidence if provided
human verification
```

A corrected value must not visually replace the original OCR.

---

# 45. EVIDENCE STATUS

Recommended:

```text
ACTIVE
REVIEW_REQUIRED
REJECTED
SUPERSEDED
RESTRICTED
```

No normal hard delete.

---

# 46. REJECT EVIDENCE

Command:

```text
RejectEvidence
```

Required reason:

```text
FALSE_POSITIVE
WRONG_ENTITY
OCR_ERROR
DUPLICATE
INVALID_SOURCE_MAPPING
RIGHTS_INVALID
OUT_OF_SCOPE
OTHER_REVIEWED
```

Result:

```text
Evidence status
↓
affected Claims DIRTY / re-evaluate
↓
Confidence
↓
Surface
↓
Coverage
↓
Profile/SEO/report inputs
```

---

# 47. EVIDENCE ANNOTATION

Human can add:

```text
EvidenceAnnotation
```

such as:

> Scan is too degraded to confirm final letter.

Annotation is internal review context.

It does not itself become `SUPPORTS` evidence.

---

# 48. CLAIM REVIEW SCREEN

Route:

```text
/admin/claims/{claim_id}
```

Header:

```text
ClaimType
Subject
Scope
Epistemic type
Lifecycle
Approval
Confidence
Surface eligibility
```

---

# 49. CLAIM DETAIL

Panels:

```text
Structured Claim

Supporting Evidence
Contradicting Evidence
Qualifying Evidence
Context

Confidence reasons
ClaimGroup/conflict

Coverage context
Citations

Consumer rendering preview
SEO rendering preview if applicable

History
```

---

# 50. CLAIM REVIEW ACTIONS

```text
ApproveClaim
RejectClaim
RequestMoreEvidence
MarkConflict
SupersedeClaim
EscalateClaim
```

Approval runs validators again.

Human approval cannot bypass:

- missing evidence;
- wrong scope;
- rights prohibition;
- invalid Claim payload;
- surname→family overreach.

---

# 51. NO FREEFORM FACT PUBLISH

Researcher can write:

```text
review note
```

but not:

```text
published Claim prose field
```

without structured Claim.

Narrative remains generated from approved Claim state.

---

# 52. CONFIDENCE PANEL

Show:

```text
current state
EvidenceDirectness
independent support groups
contradictions
source coverage
limitations
policy version
structured reason codes
```

States:

```text
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA
```

---

# 53. CONFIDENCE EDITING

P0 default:

```text
NO arbitrary dropdown
```

Reviewer changes the inputs:

- evidence status;
- ClaimEvidence relation;
- conflict state;
- review finding.

Confidence engine recalculates.

---

# 54. CONFIDENCE EXCEPTION OVERRIDE

If a rare policy exception is needed:

```text
ManualConfidenceOverride
```

requires:

- senior role;
- exact reason;
- supporting ReviewDecision;
- expiration/review date if appropriate;
- second approval;
- audit.

The UI should make this an exceptional workflow, not a common button.

---

# 55. CONFLICT REVIEW

Dedicated side-by-side screen:

```text
Claim A
vs
Claim B
```

Compare:

```text
Claim type
scope
period
place
source class
Evidence directness
independence
Confidence
rights
```

---

# 56. CONFLICT DECISIONS

Allowed structured outcomes:

```text
PRESERVE_BOTH
NOT_ACTUALLY_CONFLICT_TEMPORAL
NOT_ACTUALLY_CONFLICT_SCOPE
REJECT_A
REJECT_B
REQUIRE_MORE_EVIDENCE
ESCALATE_SPECIALIST
```

No:

```text
pick the better story
```

button.

---

# 57. SOURCE INDEPENDENCE

Evidence display groups mirrors under:

```text
IndependenceGroup
```

Example:

```text
Original archival object
├── Polona
├── Europeana
└── FBC
```

Review screen labels:

```text
1 independent source group
3 access URLs
```

not 3 confirmations.

---

# 58. NEGATIVE EVIDENCE / COVERAGE

Display ResearchCoverageManifest:

```text
source searched successfully
source returned no match
source unavailable
source not searched
source rights blocked
query partial
```

Reviewers must see this when evaluating:

```text
no evidence found
```

---

# 59. EARLIEST FOUND

Dedicated view:

```text
earliest found occurrence
searched corpora
query variants
source failures
coverage limitations
```

Mandatory label:

> Earliest found in searched sources.

Never UI label:

> First occurrence.

---

# 60. HISTORICAL MAP REVIEW

Every map/layer displays semantic label:

```text
CURRENT DISTRIBUTION
HISTORICAL OCCURRENCES
HISTORICAL DISTRIBUTION
MIGRATION HYPOTHESIS
```

and:

```text
time scope
source scope
```

Reviewer tools may not use generic “Map”.

---

# 61. PLACE RESOLUTION REVIEW

Display:

```text
raw place text
source date
candidate Places

candidate canonical name
admin hierarchy
coordinates
historical membership
resolver method/version
```

Action:

```text
ConfirmPlaceResolution
RejectPlaceResolution
```

Raw source string stays unchanged.

---

# 62. ONOMASTICS REVIEW

If/when licensed/specialist source exists, review packet includes:

```text
canonical surname
forms
specialist source statement
lexical root
formation mechanism
linguistic origin
toponymic association
competing interpretations
```

No model-generated etymology may enter this packet as “source.”

---

# 63. ETYMOLOGY EMPTY STATE

If no lawful specialist evidence:

```text
INSUFFICIENT_DATA
```

UI must not provide:

```text
Generate plausible meaning
```

as a research action.

---

# 64. HERALDRY

Heraldic items carry:

```text
HIGH_RISK
```

Review packet distinguishes:

```text
historical family with surname X
```

from:

```text
user's family
```

Any future relationship Claim requires genealogy-level evidence and specialist review.

No generic:

```text
Assign coat of arms
```

action.

---

# 65. HUMAN REVIEW QUEUE

Route:

```text
/admin/reviews
```

Types:

```text
SURNAME_RESOLUTION
ENTITY_MERGE
ENTITY_SPLIT

HISTORICAL_OCCURRENCE
HISTORICAL_VARIANT
PLACE_RESOLUTION

ETYMOLOGY
CONFLICT
OCR

RIGHTS
HERALDRY

REPORT_PROMISE
SEO_QUALITY

PERSON_MATCH       # later
MIGRATION          # later
```

---

# 66. HUMAN REVIEW TASK

Recommended canonical object:

```text
HumanReviewTask
├── task_id
├── research_run_id nullable
├── research_module_run_id nullable
├── task_type
├── reason_code
├── priority
├── risk_class
├── surname_id nullable
├── affected_claim_ids[]
├── affected_evidence_ids[]
├── affected_source_id nullable
├── assigned_to nullable
├── status
├── created_at
├── due_at nullable
├── started_at nullable
├── completed_at nullable
└── current_decision_id nullable
```

---

# 67. REVIEW TASK STATUS

```text
OPEN
ASSIGNED
IN_REVIEW
WAITING_FOR_SOURCE
WAITING_FOR_LEGAL
WAITING_FOR_ENGINEERING
NEEDS_SECOND_REVIEW
RESOLVED
CANCELLED
```

---

# 68. REVIEW DECISION

## MODEL CHANGE PROPOSAL 22-A — ACCEPT P0

Add immutable:

```text
ReviewDecision
├── review_decision_id
├── task_id
├── reviewer_id
├── decision
├── reason_code
├── note nullable
├── evidence_refs[]
├── claim_refs[]
├── based_on_version
├── created_at
└── supersedes_decision_id nullable
```

Why:

- HumanReviewTask represents workflow;
- ReviewDecision represents an immutable expert judgment;
- allows later calibration;
- prevents overwriting review history.

---

# 69. REVIEW QUEUE FILTERS

```text
My tasks
Unassigned

Type
Priority
Risk
Surname
Source
Market

Paid report block
SEO block

Age
Assignee
Waiting state
```

Saved views supported.

---

# 70. REVIEW PRIORITY

Recommended operational ordering:

```text
SECURITY / PRIVACY / RIGHTS INCIDENT
↓
PAID CUSTOMER BLOCK
↓
HIGH-TRAFFIC PUBLIC FACT / SEO
↓
ACTIVE INTERACTIVE RESEARCH
↓
BACKGROUND / BACKFILL
```

Payment does not change evidence threshold.

---

# 71. REVIEW METRICS

Measure:

```text
queue count
age
time to first review
time to resolve
reopen rate
escalation rate
decision reversal
```

Do not optimize:

```text
Claims approved/hour
```

---

# 72. DUAL REVIEW CATEGORIES

Mandatory:

```text
Surname merge
Surname split

commercial RightsProfile enable
rights override

manual VERIFIED exception

heraldic family attribution
future verified ancestor relationship

high-value manual Entitlement grant/refund threshold

large bulk SEO operation
```

---

# 73. RESEARCH RUN INSPECTOR

Route:

```text
/admin/research-runs/{research_run_id}
```

Header:

```text
Run type
Status
Readiness
Surname
Plan version
Workflow version
Started
Last update
```

---

# 74. MODULE DAG

Visual bounded DAG:

```text
ResolveSurname
↓
ProfileState
↓
ResearchPlan
↓
CurrentData
↓
Evidence / Claims
↓
Free QA
↓
FREE_READY

then

History / Onomastics
↓
Evidence / Claims
↓
Coverage
↓
DiscoveryIndex
↓
PremiumEligibility
```

Do not build a generic graph visualization framework.

---

# 75. MODULE DETAIL

Display:

```text
module key
status
blocking class
attempt
idempotency key

dependencies
input fingerprint
output references

queued_at
started_at
completed_at

error code
retryability
cost class
```

No secrets/raw credentials.

---

# 76. MODULE ACTIONS

```text
RetryModule
SupersedeModule
RequestReview
```

When appropriate.

No:

```text
mark succeeded
```

manual action.

---

# 77. RERUN COMMANDS

Admin can intentionally trigger:

```text
RerunSourceModule
RebuildEvidence
ReevaluateClaims
RecalculateConfidence
ReevaluateRights
RebuildCoverage
RebuildDiscoveryIndex
RebuildProfile
RegenerateReportVersion
```

Each command:

- version-aware;
- impact-aware;
- idempotent.

---

# 78. VERSION DIFF

Before rerun display:

```text
old connector version
new connector version

old resolver version
new resolver version

old confidence policy
new confidence policy

old prompt/model if narrative
```

---

# 79. RESEARCH RUN CANCELLATION

Public shared ResearchRun cannot casually be cancelled.

Before cancel display:

```text
active consumers
paid dependencies
shared/public status
expensive modules
```

P0:

- only ENGINEER/ADMIN;
- cancellation used rarely.

---

# 80. COST INSPECTOR

Show operational estimates:

```text
connector calls
LLM calls
input/output tokens
OCR pages later
worker runtime
```

If estimate:

label:

```text
estimated
```

Do not present as accounting fact.

---

# 81. CACHE INSPECTOR

Display:

```text
ProfileState
FRESH / STALE_SERVABLE / STALE_BLOCKING / DIRTY / MISSING

profile fingerprint
source snapshot versions
built_at
stale reason
```

Actions:

```text
InvalidateProjection
RebuildProjection
```

No content editing.

---

# 82. INVALIDATION EXPLORER

For a selected object:

```text
Source
↓
SourceRecord
↓
Evidence
↓
Claim
↓
Confidence
↓
Surface
↓
Coverage
↓
DiscoveryIndex
↓
Profile
↓
SEO / Report
```

P0 implementation can be a dependency list rather than graph UI.

---

# 83. INVALIDATION PREVIEW

Before broad action:

```text
affected surname count
affected Claim count
affected SEO pages
affected premium eligibility
affected reports
estimated rebuild jobs
```

---

# 84. SEO OPERATIONS

Route:

```text
/admin/seo
```

Table:

```text
Surname
Slug
Eligibility
Indexability
Publication
Profile version
SEO projection version
QA
last modified
sitemap
```

---

# 85. SEO DETAIL

Show:

```text
SEOEligibilityAssessment
reason codes

canonical URL
SlugAliases

title
description
H1
summary

chapter set
citations

structured data

publication status
sitemap state
```

---

# 86. SEO PREVIEW

Show:

- desktop page preview;
- mobile page preview;
- title/description SERP-style preview.

Label:

> Search engines may rewrite titles/snippets.

---

# 87. SEO ACTIONS

Allowed:

```text
ReevaluateSEOEligibility
RebuildSEOProjection
SuppressSEOPage
ForceNoindex
AddSlugAlias
RetireSlugAlias
RepairRedirect
RegenerateSitemapShard
```

---

# 88. FORCE INDEX — FORBIDDEN AROUND SAFETY

SEO operator cannot bypass:

```text
privacy fail
rights fail
Claim QA fail
entity integrity fail
```

Possible senior override only for non-safety eligibility rule such as:

```text
two-value-family SEO threshold
```

and only if content already passes all truth/rights gates.

---

# 89. BULK SEO PUBLICATION

Requires:

```text
CreateBulkOperation
↓
selection snapshot
↓
dry run
↓
affected count
↓
sample
↓
approval
↓
bounded batches
```

No browser request that immediately publishes 100k pages.

---

# 90. MODEL CHANGE PROPOSAL 22-B — `BulkOperation`

**Accept limited P0.**

Required for:

- SEO batch publication;
- broad rights invalidation;
- mass projection rebuild.

```text
BulkOperation
├── operation_id
├── operation_type
├── requested_by
├── selection_snapshot_json
├── dry_run_result_json
├── affected_count
├── approval_status
├── approved_by nullable
├── status
├── created_at
├── started_at nullable
└── completed_at nullable
```

It is not a generic bulk mutation engine.

---

# 91. SITEMAP OPERATIONS

Display:

```text
sitemap shard
URL count
generated_at
publication errors
invalid URLs
```

Action:

```text
RegenerateSitemapShard
```

No manual URL insertion.

---

# 92. COMMERCE SUPPORT

Route:

```text
/admin/commerce
```

Search:

```text
public order reference
email
report ID
```

Role:

```text
SUPPORT_OPERATOR / COMMERCE_OPERATOR
```

---

# 93. ORDER DETAIL

Display:

```text
public order reference

CustomerIdentity
email masked by default

product
surname
Offer
amount/currency

OrderStatus
PaymentStatus

PaymentAttempts
Refunds

Entitlement
ReportStatus

receipt status
report-ready email status

audit
```

No:

```text
PAN
CVC
raw payment credentials
```

---

# 94. PII REVEAL

Email default:

```text
p***@example.com
```

Support action:

```text
RevealEmail
```

can be available if operationally needed.

It records:

```text
AuditEvent
```

where policy requires.

Full email can be visible for support role if masking makes work impractical, but private-family fields remain stricter.

---

# 95. COMMERCE ACTIONS

```text
ResendReceipt
SendNewAccessLink
RequeueReport
CorrectEmail
RequestRefund
IssueRefund
GrantEntitlementManual
RevokeEntitlement
```

Role/policy differ.

---

# 96. REFUND

UI shows before confirmation:

```text
Order
paid amount
already refunded
requested refund
reason
Entitlement effect
```

No refund button without explicit amount and downstream access consequence.

---

# 97. DUPLICATE REFUND

Domain command checks:

```text
existing successful Refund
provider state
remaining refundable amount
```

Admin UI cannot override provider/domain idempotency.

---

# 98. MANUAL ENTITLEMENT

High-risk.

Required:

```text
reason
grant_source

resource
product
holder

expiration if promotional
```

Potential second approval for high-value products.

Order may be nullable for:

```text
GOODWILL
PROMOTIONAL
BUG_REMEDIATION
```

Audit mandatory.

---

# 99. COMMERCE RECONCILIATION

Queue:

```text
PROVIDER_PAID_ORDER_MISSING
ORDER_PAID_PROVIDER_MISSING
AMOUNT_MISMATCH
CURRENCY_MISMATCH
REFUND_MISMATCH
DUPLICATE_PAYMENT
```

Action:

```text
Inspect
RunReconciliation
Escalate
```

Never manually type:

```text
Order = PAID
```

without validated repair command.

---

# 100. EMAIL DELIVERY VIEW

Display:

```text
PURCHASE_RECEIPT
REPORT_READY
ACCESS_LINK
REFUND_CONFIRMATION

queued
sent
delivered
bounced
complained
failed
```

Magic access link raw token never displayed.

---

# 101. MAGIC-LINK OPERATIONS

Allowed:

```text
RevokeOutstandingAccessTokens
SendNewAccessLink
```

Forbidden:

```text
View raw token
Copy raw token
```

---

# 102. REPORT SUPPORT

Display:

```text
PurchasePromiseSnapshot
vs
ReportVersion delivered
```

Highlight:

```text
PROMISED
DELIVERED
MISSING
EXTRA
```

This is critical for consumer complaints.

---

# 103. REPORT REQUEUE

Command:

```text
RequeueReportGeneration
```

Idempotent.

Creates new attempt/version when appropriate.

Never overwrites immutable ReportVersion.

---

# 104. FACTUAL COMPLAINT

Support action:

```text
CreateResearchReviewTask
```

linked to:

- report;
- Claim;
- customer complaint category.

Support cannot edit Claim.

---

# 105. PRIVACY OPERATIONS

Route:

```text
/admin/privacy
```

Restricted.

Views:

```text
DSAR
Deletion
Access
Correction
Restriction
Processor Deletion
Consent
```

---

# 106. DSAR CASE

Recommended:

```text
PrivacyRequestCase
├── request_id
├── request_type
├── subject_reference
├── verification_state
├── received_at
├── deadline
├── status
├── systems_checked[]
├── legal_exceptions[]
├── completed_at
└── owner
```

If already modeled operationally elsewhere, do not duplicate.

---

# 107. DATA-INVENTORY VIEW

For verified subject:

```text
CustomerIdentity
UserAccount if any
Orders
Entitlements
Reports
ConsentRecords
analytics identifier state
family workspaces later
```

Public surname profiles are displayed separately as:

```text
not user-owned personal profile
```

---

# 108. DELETE WORKFLOW

No one-click.

```text
START DELETE REQUEST
↓
VERIFY SUBJECT
↓
PREVIEW DATA
↓
APPLY LEGAL HOLD / RETENTION EXCEPTIONS
↓
CONFIRM
↓
EXECUTE JOBS
↓
PROCESSOR DELETIONS
↓
REVOKE SESSIONS/TOKENS
↓
VERIFY
↓
AUDIT COMPLETE
```

---

# 109. PRIVACY EXPORT

Generate controlled export package.

No:

```text
Download all matching DB rows
```

generic admin action.

Export is purpose-specific and audited.

---

# 110. CONSENT VIEW

Read-only history:

```text
policy version
jurisdiction
analytics
experimentation
marketing
replay
captured_at
withdrawn_at
```

Admin does not edit a past ConsentRecord.

Correction creates new legally valid state/process if necessary.

---

# 111. SECURITY / AUDIT CONSOLE

Route:

```text
/admin/audit
```

Mostly read-only.

Filters:

```text
actor
role
action
resource
date
request_id
severity
```

---

# 112. AUDIT EVENTS

Examples:

```text
ROLE_GRANTED
ROLE_REVOKED
BREAK_GLASS

SOURCE_DISABLED
RIGHTS_CHANGED

EVIDENCE_REJECTED
CLAIM_APPROVED
SURNAME_MERGED

SEO_SUPPRESSED

REFUND_ISSUED
ENTITLEMENT_GRANTED

PII_REVEALED
DSAR_DELETED
EXPORT_CREATED
```

---

# 113. AUDIT IMMUTABILITY

Admin UI provides no:

```text
Edit
Delete
```

for AuditEvent.

Retention happens only through governed backend lifecycle.

---

# 114. ROLE MANAGEMENT

Route restricted to:

```text
SECURITY_ADMIN
ADMIN
```

Workflow:

```text
Request / select user
↓
Role
↓
Scope if needed
↓
Reason
↓
Expiration if temporary
↓
Grant
↓
Audit
```

---

# 115. TEMPORARY ACCESS

Recommended for:

- contractor;
- assigned private family case;
- incident investigation.

Fields:

```text
scope
expires_at
reason
```

Automatic revocation.

---

# 116. BREAK-GLASS

Separate workflow.

Requires:

```text
incident/ticket
reason
resource scope
duration
```

Prominent UI warning.

After expiration:

- revoke;
- mandatory review.

---

# 117. GOLDEN QA CONSOLE

Do not build a full test management platform.

P0 screen aggregates CI/evaluation state.

Show:

```text
suite
last run
commit
status
failed cases
```

Deep link to CI where appropriate.

---

# 118. GOLDEN CASE INSPECTOR

For a failed case:

```text
case ID
input
expected
forbidden
actual
version
diff
```

Useful for resolver, Claim, LLM, API and SEO regressions.

---

# 119. RESOLVER DIFF

Compare:

```text
production resolver
candidate resolver
```

Highlight:

```text
new auto-resolve
lost exact match
changed candidate ranking
new ambiguity
entity changes
```

Any:

```text
FUZZY → AUTO
```

is critical.

---

# 120. CLAIM DIFF

On policy/source/prompt changes display:

```text
Claim added
Claim removed
Claim superseded

Confidence changed
citation changed
surface eligibility changed
```

Upward Confidence changes highlighted.

---

# 121. LLM EVAL

Display dimensions separately:

```text
schema
groundedness
unsupported claim
citation fidelity
scope
uncertainty
```

No single:

```text
AI score 92
```

---

# 122. SOURCE FIXTURES

Source operator/engineer can inspect:

```text
fixture name
schema version
rights metadata
raw test payload
expected parsed output
```

No production credentials.

---

# 123. RELEASE GATE

Dashboard summarizing:

```text
P0 Golden
Connector
Resolver
Truth
Runtime
API
Security
Privacy
Commerce
SEO
```

This reads CI/review state.

It does not replace release process.

---

# 124. INCIDENT VIEW

P0 minimal internal incident view may show:

```text
OPEN
severity
owner
type
timeline
linked resources
containment status
```

Types:

```text
SECURITY
PRIVACY
RIGHTS
SOURCE
COMMERCE
SEO
```

Do not build PagerDuty/Jira replacement.

---

# 125. SYSTEM KILL SWITCHES

Internal console can surface existing operational switches.

Examples:

```text
disable source
disable historical enrichment
disable LLM narrative
pause premium checkout
pause SEO publication
disable report download
```

Action controls server configuration/feature flags.

Each requires:

```text
actor
reason
time
```

---

# 126. FEATURE FLAGS

PostHog/flag platform remains canonical feature-flag system.

Admin may display critical Name Atlas flags.

Do not recreate experiment configuration.

---

# 127. RESEARCH NOTES

Add internal notes separate from Evidence.

```text
ResearchNote
```

may contain:

- reviewer thought;
- follow-up question;
- unresolved hypothesis.

Hard:

```text
ResearchNote
≠
EvidenceItem
```

A note cannot satisfy Claim support.

---

# 128. INTERNAL COMMENTS

Collaboration:

```text
comment
mention
task link
```

P1 unless reviewer collaboration proves necessary P0.

Notes remain private/internal.

---

# 129. ATTACHMENTS

Possible internal attachments:

```text
licence PDF
legal memo
research screenshot
source correspondence
```

They do not become Evidence automatically.

Access controlled.

---

# 130. CONCURRENCY

Every mutable canonical resource uses:

```text
version / expected_version
```

Admin mutation:

```text
If-Match / expected_version
```

or equivalent DTO.

Stale:

```text
409 CONCURRENT_MODIFICATION
```

UI displays:

```text
Your version
Current server version
```

---

# 131. NO SILENT LAST-WRITE-WINS

Especially:

```text
Claim review
Rights
Surname identity
SEO editorial override
Commerce support
```

---

# 132. COMMAND ARCHITECTURE

Admin browser issues explicit commands.

Examples:

```text
ReviewClaim
RejectEvidence
ConfirmPlaceResolution
ProposeSurnameMerge
ApproveSurnameMerge

RetryResearchModule

ProposeRightsChange
ApproveRightsChange
EmergencyBlockSource

RebuildSEOProjection
SuppressSEOPage

IssueRefund
GrantEntitlement

ExecutePrivacyDeletion
```

No generic:

```text
PATCH /table/:id
```

---

# 133. COMMAND CONTRACT

Each command input includes where relevant:

```text
command_id
idempotency_key
expected_version

resource ID
reason_code
note

actor context from session
```

Server returns:

```text
status
new version
affected resources
audit_event_id
follow-up jobs
```

---

# 134. IDEMPOTENCY

Required for side-effect commands:

```text
IssueRefund
GrantEntitlement
RequeueReport
BulkOperation
SendAccessLink
```

Not necessary for every pure review mutation if optimistic concurrency is sufficient.

---

# 135. REASON CODES

Use structured reasons.

Example Claim rejection:

```text
INSUFFICIENT_SUPPORT
WRONG_SCOPE
SOURCE_CONFLICT
RIGHTS
DUPLICATE
```

Free text supplement allowed.

Do not let every operator select:

```text
OTHER
```

by default.

---

# 136. HIGH-IMPACT CONFIRMATION

Require explicit confirm screen for:

```text
merge
split
rights commercial enable
rights emergency block

refund
manual entitlement
user deletion

mass publish
bulk invalidation

role grant
break-glass
```

Confirm screen shows impact.

Avoid “type DELETE” rituals without actual informational value.

---

# 137. DUAL CONTROL

P0 dual control for:

```text
merge/split
commercial rights enable

manual VERIFIED override
mass publication/invalidation above configured threshold

large/manual entitlement grant where policy says
```

The system validates:

```text
approver != proposer
```

---

# 138. BULK OPERATIONS

Allowed P0:

```text
SEO publication/rebuild
projection invalidation
source-rights invalidation
QA rerun
```

Forbidden P0:

```text
bulk manual Claim approve
bulk surname merge
bulk VERIFIED override
```

---

# 139. BULK OPERATION UI

```text
Choose operation
↓
Choose filter/query
↓
DRY RUN
↓
Affected count
Warnings
Sample
↓
Confirm/dual approval if threshold
↓
Execute bounded batch
↓
Progress
↓
Completion report
```

---

# 140. EXPORTS

Export capability is permissioned.

Examples:

- approved operations CSV;
- DSAR package;
- finance reconciliation export.

No:

```text
Export entire family database
```

for ordinary staff.

Export event audited.

---

# 141. PRIVATE DATA BANNER

Future Family screen:

```text
PRIVATE FAMILY DATA
```

prominent.

Shows:

```text
workspace
assigned case
PrivacyClass
```

Avoid accidental copy/share.

---

# 142. SUPPORT NOTES

Support notes may contain PII.

Class:

```text
USER_PRIVATE
```

No PostHog.

Retention controlled.

Staff warned not to paste:

- card data;
- unnecessary family data;
- raw tokens.

---

# 143. ADMIN URL DESIGN

Use IDs:

```text
/admin/surnames/{surname_id}
/admin/claims/{claim_id}
/admin/research-runs/{run_id}
/admin/orders/{order_id}
```

Do not put:

```text
email
family person
private note
```

in URL.

---

# 144. NOINDEX / DISCOVERY

Admin host:

- authentication required;
- `noindex`;
- not linked from public app;
- no public sitemap.

Security is authentication, not robots.

---

# 145. ADMIN SESSION SECURITY

Stricter than consumer sessions.

Use:

- Secure;
- HttpOnly;
- bounded session;
- MFA/SSO;
- revoke on role change/offboarding.

High-risk operations may require recent authentication/reauth.

---

# 146. REAUTHENTICATION

Recommended for:

```text
role change
break-glass
privacy deletion
commercial rights enable
large refund/manual entitlement
large bulk operation
```

Implementation depends on chosen IdP/auth platform.

---

# 147. ADMIN API

Namespace:

```text
/api/internal/v1/
```

or:

```text
/internal/v1/
```

Do not expose through public API documentation/client package.

Separate internal contract package.

---

# 148. INTERNAL API AUTH

Server checks:

```text
staff identity
role
attributes
resource
command
```

No browser role check as authority.

No permissive CORS.

---

# 149. ADMIN DTO

Admin DTO can expose:

- evidence details;
- internal statuses;
- source metadata;
- version fingerprints.

Still never expose:

- raw secrets;
- password hashes;
- raw magic token;
- PAN/CVC;
- unnecessary restricted payload.

---

# 150. ERROR MODEL

Examples:

```text
COMMAND_NOT_ALLOWED
INSUFFICIENT_ROLE
RESOURCE_SCOPE_DENIED

CLAIM_POLICY_FAILED
RIGHTS_BLOCKED
PRIVACY_BLOCKED

CONCURRENT_MODIFICATION
SECOND_APPROVAL_REQUIRED
IMPACT_PREVIEW_REQUIRED

IDEMPOTENCY_CONFLICT
REVIEW_REQUIRED
```

Return request ID.

No stack trace.

---

# 151. ADMIN UI PATTERNS

Recommended:

- left navigation;
- dense list/detail pages;
- master-detail queue;
- filter bars;
- diff panes;
- provenance panels;
- warning callouts;
- timeline.

Do not mirror consumer editorial UI.

---

# 152. INFORMATION DENSITY

Admin is allowed to be dense.

However:

```text
summary
↓
drill down
```

is preferred over one mega-screen.

---

# 153. TABLE GUIDELINES

Use server pagination for large datasets.

TanStack Table manages:

- sorting;
- filtering controls;
- column state;
- selection.

Canonical filtering/pagination happens server-side for large tables.

Do not load 100k Claims to browser.

---

# 154. CURSOR PAGINATION

Use for:

```text
Evidence
Claims
ResearchRuns
Orders
AuditEvents
SourceRecords
```

Stable sort:

```text
created_at + ID
```

or domain-specific key.

---

# 155. SAVED VIEWS

P1/P0 optional.

High-value examples:

```text
My paid etymology reviews
Rights expiring
Failed paid reports
SEO rights blocks
```

Do not build a generic BI query builder.

---

# 156. KEYBOARD WORKFLOW

Useful for review:

```text
J/K next/previous task
A approve where safe
R reject
E open evidence
```

but never keyboard-direct execute:

- merge;
- refund;
- deletion;
- rights enable.

High-risk actions confirm.

---

# 157. ADMIN MOBILE

P0:

```text
desktop-first
```

Mobile may support:

- view alerts;
- incident status;
- read-only order/research status.

Do not optimize complex evidence review for phone.

---

# 158. ACCESSIBILITY

Internal tool still must support:

- keyboard;
- focus;
- text labels;
- screen-reader semantics;
- status not color-only.

Automated semantic component tests.

---

# 159. STATUS DESIGN

Use label + icon + color.

Example:

```text
[!] RIGHTS UNKNOWN
```

not yellow dot alone.

---

# 160. DEBUG JSON

ENGINEER can open:

```text
Sanitized JSON
```

for DTO/object.

Researcher default sees semantic rendering.

No database-console style raw object editing.

---

# 161. RAW PAYLOAD DOWNLOAD

Restricted:

```text
ENGINEER
SOURCE_RIGHTS_OPERATOR
```

only when rights/privacy allow.

Audit download.

---

# 162. SOURCE EXTERNAL LINKS

Use new tab with:

```text
noopener
```

Internal admin pages should set a restrictive Referrer-Policy so sensitive internal URL paths are not disclosed to source sites.

Recommended:

```text
Referrer-Policy: no-referrer
```

for admin host unless operations need otherwise.

---

# 163. REVIEW PACKETS

The system should show reviewers the minimum information needed for the decision.

Not the entire database.

---

# 164. ONOMASTICS PACKET

```text
canonical surname
approved forms
historical forms

specialist source excerpts
root interpretations
formation mechanism
linguistic-origin Claims

conflicts
previous decisions
```

---

# 165. GENEALOGY PACKET — FUTURE

```text
target person
user-provided facts
verified facts

candidate records
date/place/parents/spouse comparison

conflicts
rejected candidates
```

Only assigned case.

---

# 166. RIGHTS PACKET

```text
source
owner

official terms
contract

intended operation:
  automation
  commercial
  cache
  paid
  SEO
  image

current RightsProfile
impact
```

---

# 167. SEO PACKET

```text
surname profile
SEO eligibility
reason codes
render preview

title
description
Claim origins
citations
```

---

# 168. PAID REPORT REVIEW PACKET

```text
Order
PurchasePromiseSnapshot

ReportVersion

promised sections
delivered sections

Claim QA
rights

technical report status
```

No payment method detail unless support role needs it.

---

# 169. DATA MINIMIZATION BY ROLE

Researcher:

```text
need surname/evidence
not email/payment
```

Commerce operator:

```text
need order/payment/report delivery
not raw research corpus
```

SEO operator:

```text
need public profile projection
not customer identity
```

Privacy operator:

```text
need subject data mapping
not unrestricted research edits
```

---

# 170. USER-PROVIDED FACTS

Future family console labels:

```text
PROVIDED BY USER
```

separately from:

```text
VERIFIED BY SOURCE
```

Never visually merge.

---

# 171. RESEARCH DECISION AS TRAINING SIGNAL

Human decisions may be used for:

- golden cases;
- resolver rule evaluation;
- QA calibration.

They are not automatically:

```text
model-training data
```

Vendor/model training requires separate governance/rights/privacy decision.

---

# 172. ACTIVE LEARNING

P2.

Do not build uncertainty-based task prioritization until enough reviewed cases exist.

P0 task priority uses deterministic rules.

---

# 173. SOURCE ONBOARDING WORKFLOW

Future/P1 guided flow:

```text
Create Source
↓
Capture rights
↓
Connector config
↓
Fixture/schema
↓
Golden dry run
↓
Review
↓
Activate
```

P0 can implement this as forms across Source and Rights screens rather than a wizard.

---

# 174. SOURCE ACTIVATION GATE

Cannot set:

```text
ACTIVE
```

until:

```text
RightsProfile approved
connector contract tests pass
schema mapping valid
rate limits configured
attribution configured
```

Server enforces.

---

# 175. SOURCE DRY RUN

Before activating major source:

```text
golden surnames
↓
new SourceRecords
↓
Evidence candidates
↓
conflicts
↓
duplicate groups
↓
estimated volume/cost
```

No publishing.

---

# 176. SOURCE RETIREMENT

Command:

```text
RetireSource
```

Effects:

- no new retrieval;
- provenance retained;
- downstream freshness/right review;
- no destructive deletion.

---

# 177. CONTRACT EXPIRY

Rights status can become:

```text
CONTRACT_EXPIRED
```

Automatically blocks defined new uses.

Console opens review task before expiry.

---

# 178. CLAIM BULK INVALIDATION

Rights/source incident may require it.

Only through BulkOperation.

Dry-run must show:

```text
Claims
Profiles
SEO pages
PremiumEligibility
Report future builds
```

---

# 179. EMERGENCY SEO SUPPRESS

Fast:

```text
SuppressSEOPage
```

does not mutate Claim.

Used for:

- rights;
- privacy;
- severe quality incident.

---

# 180. COMMERCE PAUSE

If paid fulfillment broken:

```text
PauseNewCheckout
```

does not revoke existing Entitlements.

Existing customers still access reports.

---

# 181. LLM EMERGENCY DISABLE

If LLM quality regression:

```text
llm_narrative_enabled = false
```

Consumer product falls back to deterministic Claims/structured facts.

Admin displays current kill-switch state.

---

# 182. MANUAL RESEARCH RUN

Permitted:

```text
RefreshSurnameResearch
RunStandardResearch
PrecomputePremium
```

with:

- cost class;
- plan preview;
- rights/source checks.

No arbitrary connector console.

---

# 183. COST WARNING

If operation has:

```text
HIGH / HUMAN
```

cost class, UI shows warning.

No fake currency precision where compute cost is approximate.

---

# 184. SOURCE QUOTAS

Where source exposes quota/rate information, Source Operations shows:

```text
configured limit
recent usage
recent 429
```

Do not use as product KPI.

---

# 185. DATA CORRECTION

When a source updates/corrects a record:

```text
new ingest/version
↓
new SourceRecord or versioned canonical mapping
↓
Evidence supersede
↓
Claim re-evaluate
```

No editing raw SourceRecord to match new value.

---

# 186. EVENTUAL CONSISTENCY IN ADMIN

After canonical command:

```text
command committed
```

UI may show:

```text
Profile rebuild queued
SEO projection stale
Report not regenerated
```

Do not claim every downstream surface changed instantly.

---

# 187. POST-ACTION RECEIPT

After command:

```text
Decision saved
Audit: AUD-...
Affected:
  3 Claims dirty
  profile rebuild queued
  SEO projection queued
```

This makes asynchronous consequences visible.

---

# 188. TIMELINE

Surname timeline may include:

```text
entity created
source ingest
Evidence created
Claim created
human review
Claim superseded
profile built
SEO published
```

Commerce/private actions remain permission-filtered.

---

# 189. PROMPT OPERATIONS

Admin can view:

```text
prompt ID
version
task class
current production status
eval status
```

P0 prompt edits remain repository/code-review process.

No “edit production prompt and save” UI.

---

# 190. MODEL ROUTING

ENGINEER may view:

```text
provider
model
task
prompt version
latency
token usage
status
```

Researchers cannot change production model.

---

# 191. SUPPORT TAGS

Canonical support categories:

```text
PAYMENT
REPORT_ACCESS
REPORT_DELIVERY
DATA_CONCERN
SOURCE_QUESTION
REFUND
PRIVACY
TECHNICAL
```

Useful for routing.

---

# 192. SECURITY OF SUPPORT NOTES

Display warning:

> Do not paste card details, access tokens or unnecessary family data.

Server-side redaction patterns can supplement.

---

# 193. STAFF OFFBOARDING

Operational checklist:

```text
disable IdP
revoke sessions
remove roles
revoke source/VPN/API access
review temporary exports
```

No shared staff accounts.

---

# 194. CONTRACTOR ACCESS

Contract researcher:

- individual identity;
- minimal role;
- assigned case;
- expiration;
- audit;
- confidentiality/privacy obligations.

No broad production explorer.

---

# 195. ACCESS REVIEWS

Periodic security review:

```text
staff
roles
last use
temporary grants
```

Revoke stale.

---

# 196. P0 ADMIN MODULES — FINAL

Paid MVP needs:

1. Home / operational queues.
2. Surname / resolver inspector.
3. ResearchRun inspector.
4. Source registry / health.
5. Rights console.
6. Evidence explorer.
7. Claim / confidence review.
8. Human review queue.
9. SEO operations.
10. Commerce support.
11. basic Privacy/DSAR.
12. QA/release results.
13. Audit.

---

# 197. P1 CONSOLE

Later:

- FamilyWorkspace;
- person candidate matching;
- private genealogy review;
- OCR/HWR review station;
- rich provenance graph;
- source onboarding wizard;
- advanced bulk operations;
- country-pack management;
- editorial presentation overrides;
- deeper incident console;
- export builder.

---

# 198. DO NOT BUILD YET

1. Generic DB editor.
2. SQL console for researchers.
3. Full CRM.
4. Zendesk replacement.
5. PagerDuty replacement.
6. legal-case management suite.
7. BI platform.
8. custom feature-flag platform.
9. generic graph-browser framework.
10. family tree editor.
11. researcher gamification.
12. productivity leaderboard.
13. active-learning ML dashboard.
14. broad arbitrary CSV export.
15. bulk Claim approval.
16. one-click global merge.
17. editable audit log.
18. unrestricted “super admin” path.

---

# 199. MODEL CHANGE PROPOSALS — FINAL

## 22-A — `ReviewDecision`

**P0 ACCEPT.**

Immutable reviewer decision history.

## 22-B — `BulkOperation`

**Limited P0 ACCEPT.**

Only controlled operations:

- SEO publication/rebuild;
- rights/source invalidation;
- selected QA/rebuild tasks.

## 22-C — `PresentationOverride`

**P1.**

For human-edited:

- SEO title;
- localized public narrative;
- editorial clarification.

Must bind to:

```text
Claim bundle fingerprint
```

and become REVIEW_REQUIRED when underlying Claims materially change.

## 22-D — generic `OperationalCase`

**REJECT P0.**

Do not force:

- DSAR;
- incident;
- support;
- review;
- legal;

into one generic mega-entity.

---

# 200. FIRST 20 ADMIN SCREENS TO BUILD

Ordered by implementation value.

## 01 — Staff Login / Access Denied

SSO/MFA only.

## 02 — Admin Home / Queues

Operational attention.

## 03 — Surname Search / Global Search

Safe ID/name lookup.

## 04 — Surname Inspector

Canonical identity summary.

## 05 — Resolver Trace

Exact/candidate/debug.

## 06 — ResearchRun Inspector

Run + module state.

## 07 — Source Registry

Sources and status.

## 08 — Source Detail

Connector/schema/health.

## 09 — RightsProfile Detail

Rights dimensions.

## 10 — Evidence Detail

Raw/normalized/provenance.

## 11 — Claim Detail

Evidence/confidence/surface.

## 12 — Human Review Queue

Task list.

## 13 — Review Task

Decision UI.

## 14 — Merge Proposal / Impact Preview

High-risk identity ops.

## 15 — SEO Operations List

Eligibility/publication.

## 16 — SEO Detail / Preview

Projection/metadata/actions.

## 17 — Commerce Search

Order/email/report lookup.

## 18 — Order / Entitlement Detail

Support ops.

## 19 — Privacy Request Case

DSAR/deletion.

## 20 — Audit Explorer

Immutable operations history.

---

# 201. FIRST 30 ADMIN COMMANDS / ACTIONS

1. `SimulateSurnameResolution`
2. `AssignReviewTask`
3. `UnassignReviewTask`
4. `StartReviewTask`
5. `ApproveClaimReview`
6. `RejectClaim`
7. `RequestMoreEvidence`
8. `RejectEvidence`
9. `SupersedeEvidence`
10. `ConfirmPlaceResolution`
11. `MarkClaimConflict`
12. `EscalateReview`
13. `RetryResearchModule`
14. `RecalculateConfidence`
15. `RebuildCoverage`
16. `RebuildDiscoveryIndex`
17. `RebuildSurnameProfile`
18. `ProposeSurnameMerge`
19. `ApproveSurnameMerge`
20. `DisableConnector`
21. `EnableConnector`
22. `ProposeRightsChange`
23. `EmergencyBlockSourceSurface`
24. `RebuildSEOProjection`
25. `SuppressSEOPage`
26. `AddSlugAlias`
27. `ResendReportAccess`
28. `RequeueReportGeneration`
29. `IssueRefund`
30. `ExecutePrivacyDeletion`

Later commands may add:

```text
GrantManualEntitlement
RoleGrant
BreakGlass
BulkPublishSEO
```

according to permissions.

---

# 202. P0 ADMIN ARCHITECTURE — FINAL

```text
STAFF
↓
SSO / MFA
↓
ADMIN NEXT.JS APP
↓
INTERNAL TYPED API
↓
DOMAIN COMMAND / QUERY
↓
AUTHORIZATION
↓
VALIDATION
↓
CANONICAL STATE
↓
AUDIT
↓
INVALIDATION / JOBS
```

UI libraries:

```text
TanStack Query
TanStack Table
React Aria / accessible primitives
```

Backend remains modular monolith.

---

# 203. P0 ROLE MATRIX — FINAL

Operational principle:

```text
research
≠
rights
≠
SEO
≠
commerce
≠
privacy
≠
security
```

`ADMIN` manages system operation but does not have a magical truth bypass.

All commands still run domain validation.

---

# 204. P0 RESEARCH CONSOLE — FINAL

Must support:

```text
Surname
↓
ResearchRun
↓
Source
↓
SourceRecord
↓
Evidence
↓
Claim
↓
Confidence
↓
Coverage
↓
Profile
```

A researcher can answer:

> Why does the consumer page say this?

without SQL.

---

# 205. P0 HUMAN REVIEW — FINAL

```text
REVIEW_REQUIRED
↓
HumanReviewTask
↓
Review packet
↓
ReviewDecision
↓
Domain validators
↓
commit / reject
↓
audit
↓
downstream rebuild
```

Human review is controlled domain input, not manual publication.

---

# 206. P0 SOURCE / RIGHTS OPS — FINAL

Source operator can:

- inspect health;
- test bounded connector;
- disable source;
- inspect schema drift.

Rights operator can:

- review terms;
- propose RightsProfile;
- inspect impact;
- block surface.

Commercial enablement is dual-controlled.

---

# 207. P0 SEO OPS — FINAL

SEO can:

- inspect eligibility;
- inspect projection;
- preview;
- rebuild;
- suppress;
- manage approved slug alias.

SEO cannot:

- change Claim;
- enable forbidden rights;
- force INDEX around safety.

---

# 208. P0 COMMERCE SUPPORT — FINAL

Support/commerce can:

- inspect Order;
- Entitlement;
- Report;
- email delivery;
- refund.

No raw cards.

No raw magic token.

No unrestricted research/family data.

---

# 209. P0 PRIVACY / AUDIT — FINAL

Privacy operator can:

- manage DSAR workflow;
- preview scoped user data;
- execute deletion;
- track processors.

Audit is read-only and immutable.

---

# 210. ADMIN QA — P0

Extend Prompt 17.

```text
ADM-001 researcher cannot change RightsProfile
ADM-002 support cannot inspect unrestricted Evidence
ADM-003 SEO cannot force rights-blocked INDEX
ADM-004 rejected Evidence dirties supported Claim
ADM-005 merge requires dual approval
ADM-006 stale Claim review receives 409
ADM-007 refund produces AuditEvent
ADM-008 raw magic token never returned to admin
ADM-009 AuditEvent cannot be mutated
ADM-010 bulk operation requires dry run
ADM-011 private-family future resource assignment scoped
ADM-012 SearchCandidate never rendered as attested form
ADM-013 raw and normalized Evidence remain distinct
ADM-014 rights UNKNOWN remains blocked
ADM-015 module retry idempotent
ADM-016 source disable affects planner
ADM-017 SEO suppress does not mutate Claims
ADM-018 support factual issue creates ReviewTask
ADM-019 delete request preserves public surname profile
ADM-020 role removal revokes admin session/access
```

---

# 211. ADMIN SECURITY TESTS

```text
ADM-SEC-001 unauthenticated host blocked
ADM-SEC-002 SSO identity required
ADM-SEC-003 MFA/IdP policy required
ADM-SEC-004 resource IDOR blocked
ADM-SEC-005 role escalation blocked
ADM-SEC-006 CSRF on commands
ADM-SEC-007 XSS from source/OCR/narrative
ADM-SEC-008 export permission
ADM-SEC-009 break-glass audit
ADM-SEC-010 session expiry
ADM-SEC-011 admin API unavailable cross-origin
ADM-SEC-012 raw secret redaction
```

---

# 212. INTERNAL INCIDENT PLAYBOOK — WRONG SURNAME MERGE

```text
incident opened
↓
suppress affected public/SEO surfaces if needed
↓
pause dependent identity actions
↓
inspect MergeDecision / Audit
↓
perform safe split/unmerge
↓
reassign forms/Claims
↓
recalculate Evidence relations
↓
invalidate Profiles / DiscoveryIndex / SEO
↓
inspect affected reports
↓
support remediation if paid content affected
↓
add Golden regression
```

---

# 213. INTERNAL INCIDENT PLAYBOOK — RIGHTS

```text
Rights concern
↓
Emergency block
↓
Impact preview
↓
Source/Claim/SEO/Premium rebuild
↓
existing report review
↓
legal decision
↓
remediation
↓
Audit
```

---

# 214. INTERNAL INCIDENT PLAYBOOK — COMMERCE

```text
paid provider event
+
Order/Entitlement mismatch
↓
Commerce Exception Queue
↓
verify provider event
↓
Run idempotent repair command
↓
Entitlement/report recovery
↓
Audit
↓
Regression test
```

---

# 215. INTERNAL INCIDENT PLAYBOOK — PRIVACY

Example:

```text
staff accesses unauthorized future family case
↓
security/privacy incident
↓
preserve AuditEvent
↓
revoke access
↓
determine data scope
↓
Prompt 19 breach assessment
↓
remediation
```

---

# 216. FIRST ADMIN BUILD ORDER

## Stage 1 — auth / audit

- staff identity;
- roles;
- internal API shell;
- AuditEvent.

## Stage 2 — read-only truth inspector

- surname;
- source;
- Evidence;
- Claim;
- ResearchRun.

## Stage 3 — human review

- task queue;
- ReviewDecision;
- Evidence/Claim commands;
- concurrency.

## Stage 4 — rights

- RightsProfile;
- impact preview;
- emergency block.

## Stage 5 — runtime ops

- retry module;
- invalidation;
- run/circuit state.

## Stage 6 — resolver identity

- merge proposal;
- dual approval;
- split preparation.

## Stage 7 — SEO

- eligibility;
- projection;
- suppress;
- slug alias;
- bulk dry run.

## Stage 8 — commerce

- order/report;
- resend;
- refund;
- reconciliation.

## Stage 9 — privacy

- DSAR;
- deletion.

## Stage 10 — QA

- golden-case visualization;
- release gate.

---

# 217. P1 CONSOLE

After paid MVP:

1. FamilyWorkspace inspector.
2. FamilyPerson/private Claim review.
3. PersonCandidate comparison.
4. candidate rejection workflow.
5. family-relationship graph.
6. OCR/HWR review workspace.
7. source onboarding wizard.
8. advanced evidence graph.
9. editorial PresentationOverride.
10. country-pack operations.
11. detailed incident management.
12. richer contractor/case assignments.

---

# 218. DO NOT BUILD YET — FINAL

```text
generic CRUD admin
direct DB editor
SQL console
CRM
support-ticket replacement
BI replacement
feature flag replacement
legal-case suite
incident platform
genealogy tree editor
generic graph explorer
staff gamification
AI auto-approval
bulk human Claim approval
unrestricted exports
super-admin bypass
```

---

# 219. TOP 20 ADMIN RISKS

1. Admin action bypasses Claim validation.
2. Rights operator enables commercial use without evidence.
3. SearchCandidate looks like accepted form.
4. Raw source text is hidden behind normalized value.
5. Confidence changed by dropdown rather than evidence.
6. Wrong surname merge propagates to SEO/reports.
7. Entity split loses provenance.
8. Support sees private research unnecessarily.
9. Refund executes twice.
10. Manual Entitlement has no audit.
11. Raw magic token shown to support.
12. SEO force-index bypasses rights.
13. Bulk operation affects huge corpus unexpectedly.
14. Rights change fails to invalidate premium.
15. Reviewer edits raw Evidence.
16. Concurrent reviewers overwrite decisions.
17. Staff role survives offboarding.
18. Audit log mutable.
19. Sensitive export becomes casual workflow.
20. Research note becomes public fact.

---

# 220. TOP 20 RESEARCH-CONSOLE FAILURE MODES

1. Raw vs normalized Evidence unclear.
2. Mirrors shown as independent support.
3. Source failure shown as no evidence.
4. Earliest-found scope hidden.
5. Historical map type ambiguous.
6. Fuzzy form shown as attested.
7. User-provided fact shown as verified.
8. Current concentration shown as origin evidence.
9. Conflict hidden.
10. Rights hidden from reviewer.
11. Source date absent.
12. Source locator inaccessible.
13. Confidence reason unavailable.
14. Claim scope hidden.
15. ReviewDecision overwritten.
16. Rejected Evidence physically deleted.
17. Report uses superseded Claim.
18. Module retry duplicates canonical output.
19. Place correction overwrites raw source text.
20. Surname-level evidence appears family/person-level.

---

# 221. DEFINITION OF ADMIN READY

The P0 Admin / Research Console is ready when:

### Access

- staff auth uses corporate SSO/IdP;
- MFA/IdP policy is enforced;
- roles exist;
- resource ABAC exists;
- no public access;
- offboarding revokes access.

### Research

- staff can locate canonical Surname;
- resolution trace exists;
- SourceRecord is inspectable;
- raw vs normalized Evidence is explicit;
- SearchCandidate is clearly distinct;
- Claim → Evidence → Source trace is one workflow;
- Confidence reasoning is visible;
- conflicts are visible;
- CoverageManifest is visible.

### Review

- HumanReviewTask exists;
- ReviewDecision is immutable;
- reviewer can approve/reject through commands;
- validators still run;
- dual review works;
- concurrency works.

### Identity

- merge is proposal-based;
- impact preview;
- second approval;
- reversible/auditable lineage.

### Sources / rights

- connector health;
- schema drift;
- source disable;
- RightsProfile view;
- terms evidence;
- rights change impact;
- emergency block.

### Runtime

- module states;
- retries;
- idempotent commands;
- queue/run detail;
- invalidation visibility.

### SEO

- eligibility;
- projection;
- preview;
- suppress;
- aliases;
- no bypass of rights/privacy/truth.

### Commerce

- Order;
- Payment;
- Entitlement;
- Report;
- Refund;
- email status;
- no card data;
- no raw token;
- audited actions.

### Privacy / security

- DSAR workflow;
- deletion preview;
- audit immutable;
- staff exports controlled;
- private-resource access scoped.

### Engineering

- admin never writes DB directly;
- typed internal API;
- domain commands;
- audit;
- optimistic concurrency;
- Prompt 17 admin/security regression suite passes.

---

# 222. INPUTS REQUIRED BY PROMPT 23

Implementation Roadmap should treat these as admin dependencies.

## Early implementation

Must exist early:

```text
read-only surname inspector
SourceRecord/Evidence/Claim inspection
ResearchRun inspection
```

Reason:

engineering cannot debug the truth layer through SQL indefinitely.

## Before historical research scale

Add:

```text
HumanReviewTask
ReviewDecision
module retry
rights view
```

## Before paid launch

Add:

```text
commerce support
refund
access recovery
audit
privacy request basics
```

## Before SEO scale

Add:

```text
SEO eligibility
projection preview
suppress
bulk dry-run
```

Advanced Family console is P1 and must not block paid surname MVP.

---

# 223. FINAL ARCHITECTURE

```text
                         STAFF USER
                             │
                             ▼
                       SSO / MFA
                             │
                             ▼
                    ADMIN NEXT.JS APP
                             │
         ┌───────────────────┼────────────────────┐
         ▼                   ▼                    ▼
       QUEUES             INSPECTORS           OPERATIONS
         │                   │                    │
         │          ┌────────┼────────┐     ┌─────┼──────┐
         │          ▼        ▼        ▼     ▼     ▼      ▼
         │       SOURCE   EVIDENCE   CLAIM  SEO RIGHTS COMMERCE
         │                   │
         ▼                   ▼
    HUMAN REVIEW         PROVENANCE
         │                   │
         └──────────┬────────┘
                    ▼
              DOMAIN COMMAND
                    │
                    ▼
              AUTHORIZATION
                    │
                    ▼
            POLICY VALIDATION
                    │
             ┌──────┴──────┐
             ▼             ▼
           REJECT         COMMIT
                            │
                            ▼
                       AUDIT EVENT
                            │
                            ▼
                    INVALIDATION /
                        REBUILD
```

The architecture deliberately forbids:

```text
Admin
↓
Direct Repository / SQL Mutation
↓
Published State
```

---

# 224. FINAL RECOMMENDATION

The Name Atlas admin console should not be judged by how quickly a staff member can edit data.

It should be judged by whether a staff member can answer:

```text
Why does the product believe this?
Where did this information come from?
What is uncertain?
What changed?
Who approved it?
What would be affected if we change it?
```

before performing an action.

The internal console is therefore best understood as:

> **a controlled interface to the Evidence Graph and operational state machine.**

Not:

> **a back office where trusted people can fix rows.**

Its most important UX pattern is:

```text
INSPECT
↓
UNDERSTAND PROVENANCE
↓
PREVIEW IMPACT
↓
ISSUE DOMAIN COMMAND
↓
VALIDATE
↓
AUDIT
```

That keeps the core Name Atlas rule intact even when humans enter the loop:

> **Evidence before narrative.**

For internal operations:

> **Provenance before intervention.**

And for high-risk administration:

> **Policy validation before authority.**
