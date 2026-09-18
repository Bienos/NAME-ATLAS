# NAME ATLAS — PRIVACY / SECURITY / LEGAL OPS

**Document:** 19. Privacy / Security / Legal Ops  
**Version:** 1.0.0 — Paid-MVP Governance Baseline  
**Research snapshot:** 17 September 2026  
**Initial jurisdiction:** Poland / European Union  
**Architecture:** global-ready  
**Status:** Candidate implementation specification; legal review required before launch  
**Depends on:** Documents 10–18  
**Next:** `20_NAME_ATLAS_PAYMENTS_REPORT_DELIVERY_ENTITLEMENTS.md`

---

# 0. SCOPE, AUTHORITY AND LEGAL DISCLAIMER

This document defines the privacy, security, rights-management and legal-operations architecture for Name Atlas.

It is **not legal advice** and does not replace review by Polish/EU counsel, a privacy professional, tax/accounting advisers, payment-provider compliance teams, or source-specific rights holders.

It distinguishes three kinds of statements:

```text
ARCHITECTURAL DECISION
```

A technical/product recommendation Name Atlas can adopt.

```text
LEGAL BASIS CANDIDATE
```

A plausible GDPR/consumer-law basis that must be confirmed for the actual processing design.

```text
LEGAL COUNSEL REVIEW REQUIRED
```

A question whose final answer materially depends on:

- contract language;
- implementation details;
- jurisdiction;
- actual data;
- scale;
- data-subject relationship;
- source-specific rights.

The purpose of this document is to make legal/privacy/security constraints **enforceable by architecture**, rather than leaving them as launch-time policy documents.

---

# 1. EXECUTIVE DECISIONS

The most important decisions are:

1. **Public surname research and private family research are separate security/privacy domains.**
2. **Name Atlas launches without collecting family-person data in the surname MVP.**
3. **Anonymous free surname search does not require email.**
4. **Premium checkout collects only what is operationally required, initially email + commerce data.**
5. **Raw surname text is not sent to generic product analytics by default.**
6. **PostHog Session Replay remains disabled at launch.**
7. **Non-essential browser analytics/experiment storage is consent-gated in the Poland/EEA launch unless legal counsel approves a narrower implementation under another lawful design.**
8. **Consent withdrawal must stop future non-essential capture and clear relevant local identifiers where technically applicable.**
9. **A user supplying a living relative's data does not automatically make Name Atlas's processing lawful.**
10. **Future Family Origin / Deep Research requires a dedicated privacy review and likely DPIA assessment before launch.**
11. **Unknown living/deceased status is treated conservatively as living for privacy controls.**
12. **No ethnicity, religion or similar sensitive identity is inferred from a surname.**
13. **Name Atlas uses EU-hosted core infrastructure where practical for Poland launch.**
14. **Paid reports are private, server-authorized resources; report IDs are not access control.**
15. **Magic-link secrets are treated as credentials and stored hashed where practicable.**
16. **OWASP ASVS 5.0 Level 2 is the security-verification target for the paid MVP.**
17. **Payment-card handling is outsourced to a PCI-compliant payment provider; Name Atlas does not process raw card data.**
18. **Every production source has an approved RightsProfile; `commercial_use = UNKNOWN` blocks paid use.**
19. **Public availability does not authorize scraping, database extraction, caching or redistribution.**
20. **Security, privacy, source-rights and consumer-law gates are release gates, not advisory notes.**

---

# 2. AUTHORITATIVE LEGAL / SECURITY BASELINE

This specification was checked against the following current authoritative materials.

## 2.1 GDPR

Regulation (EU) 2016/679.

Relevant principles include:

- Article 5 — purpose limitation, data minimisation, storage limitation, integrity/confidentiality;
- Article 6 — lawful bases;
- Article 9 — special categories;
- Article 14 — information obligations where personal data were not obtained from the data subject;
- Article 25 — data protection by design and by default;
- Article 32 — security of processing;
- Article 33 — breach notification;
- Article 35 — DPIA.

Official source:

https://eur-lex.europa.eu/eli/reg/2016/679/oj

## 2.2 EDPB

Final guidance:

- Guidelines 4/2019 — Data Protection by Design and by Default;
- Guidelines 05/2020 — consent.

Official sources:

https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en

https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en

## 2.3 Poland — UODO

UODO's current guidance emphasizes that a controller must assess before processing whether planned operations are likely to cause high risk and require a DPIA.

Reference:

https://uodo.gov.pl/pl/598/3617

## 2.4 Poland — terminal storage / cookies

Polish Electronic Communications Law (`Prawo komunikacji elektronicznej`) Article 399 governs storage/access to information on a user's terminal equipment, and Article 400 links consent to personal-data consent rules.

Official act:

https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20240001221/O/D20241221.pdf

Actual interpretation for specific analytics/experimentation implementation:

> **LEGAL COUNSEL REVIEW REQUIRED**

## 2.5 Consumer digital content

UOKiK confirms that ordinary internet distance contracts generally have a 14-day withdrawal period and describes conditions under which a consumer can lose the right to withdraw for paid digital content delivered without a tangible medium.

References:

https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/

https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/

Directive (EU) 2019/770 also establishes conformity/remedy rules for digital content/services.

https://eur-lex.europa.eu/eli/dir/2019/770/oj

## 2.6 Security

Current reference set:

```text
OWASP ASVS 5.0.0
OWASP Top 10:2025
OWASP API Security Top 10:2023
```

References:

https://owasp.org/projects/asvs

https://top10.owasp.org/2025/

https://api-security.owasp.org/editions/2023/en/0x11-t10/

---

# 3. FUNDAMENTAL PRIVACY ARCHITECTURE

```text
                     DATA ENTERS NAME ATLAS
                               │
                               ▼
                       DATA CLASSIFICATION
                               │
                ┌──────────────┼───────────────┐
                ▼              ▼               ▼
             PURPOSE        RIGHTS          PRIVACY
              CHECK          CHECK           CHECK
                │              │               │
                └──────────────┼───────────────┘
                               ▼
                         STORAGE POLICY
                               │
                               ▼
                       ACCESS / PROCESSING
                               │
                               ▼
                       SURFACE ELIGIBILITY
                               │
                               ▼
                      RETENTION / DELETION
                               │
                               ▼
                              AUDIT
```

Parallel security process:

```text
Threat Model
↓
Security Requirements
↓
Implementation
↓
Verification
↓
Monitoring
↓
Incident Response
```

---

# 4. PUBLIC SURNAME RESEARCH VS PRIVATE FAMILY RESEARCH

This is the main privacy boundary.

## PUBLIC SURNAME RESEARCH

Contains:

- surname entity;
- public/current aggregate population;
- sourced etymology;
- historical surname occurrences;
- places;
- public archive references;
- public/surname-level Claims;
- public citations.

Characteristics:

```text
shareable where rights allow
cacheable
potentially SEO-eligible
not tied to a particular user's family
```

## PRIVATE FAMILY RESEARCH

Contains or may contain:

- family member names;
- approximate DOB;
- exact DOB;
- family places;
- relationship to user;
- candidate person records;
- private hypotheses;
- living-relative data;
- family documents;
- user notes.

Characteristics:

```text
private by default
no SEO
no public cache
no share by default
workspace-scoped
higher retention/privacy controls
```

Hard rule:

```text
PUBLIC SURNAME CACHE
must never contain
USER ↔ FAMILY association
```

---

# 5. DATA DOMAINS

| Domain | Example | Privacy risk | Default visibility |
|---|---|---:|---|
| Public surname knowledge | PESEL count | Low | Public |
| Public historical evidence | 1880 surname occurrence | Low–medium | Rights-dependent |
| Search behavior | visitor searched surname X | Medium | Internal analytics only |
| Account | email | Medium | Private |
| Commerce | order/payment status | Medium/high | Private |
| Premium surname report | paid report | Medium | Entitled private |
| Family context | grandfather + town | High | Private family |
| Person candidate | archive record match | High | Private family |
| Living-relative data | name/DOB/relation | High | Restricted |
| Sensitive historical data | repression/religion/health | High | Restricted |
| Staff/admin | roles/access logs | Medium/high | Internal |
| Rights/contracts | licence status | Medium | Internal |
| Secrets | API/payment keys | Critical | Secret |
| Security telemetry | IP/auth events | Medium/high | Restricted |

---

# 6. TWO-AXIS CLASSIFICATION MODEL

A single privacy enum should not be forced to represent both personal-data sensitivity and system-security sensitivity.

Use two axes.

## 6.1 `PrivacyClass`

Recommended:

```text
PUBLIC
INTERNAL_NON_PERSONAL
USER_PRIVATE
FAMILY_PRIVATE
SENSITIVE_PERSONAL
```

## 6.2 `SecurityClass`

Recommended:

```text
PUBLIC
INTERNAL
CONFIDENTIAL
RESTRICTED
SECRET
```

Examples:

```text
PESEL aggregate
PrivacyClass = PUBLIC
SecurityClass = PUBLIC
```

```text
customer email
PrivacyClass = USER_PRIVATE
SecurityClass = CONFIDENTIAL
```

```text
living family person + health/religion
PrivacyClass = SENSITIVE_PERSONAL
SecurityClass = RESTRICTED
```

```text
OpenAI API key
PrivacyClass = INTERNAL_NON_PERSONAL
SecurityClass = SECRET
```

---

# 7. MODEL CHANGE PROPOSAL 19-A — PRIVACY CLASS

Prompt 11 currently uses a smaller classification.

Recommended model adjustment:

```text
PrivacyClass:
PUBLIC
INTERNAL_NON_PERSONAL
USER_PRIVATE
FAMILY_PRIVATE
SENSITIVE_PERSONAL
```

Do **not** add `SECRET` here.

Secrets belong to the separate security-classification registry.

**Recommendation:** accept before Family Origin schema is implemented.

---

# 8. DATA-SUBJECT TYPES

Name Atlas must distinguish:

```text
ANONYMOUS_VISITOR
ACCOUNT_HOLDER
PURCHASER
USER_PROVIDED_RELATIVE
LIVING_THIRD_PARTY
DECEASED_HISTORICAL_PERSON
UNKNOWN_LIVING_STATUS_PERSON
STAFF_USER
HUMAN_RESEARCHER
```

A single archival record can include several categories.

---

# 9. DECEASED PERSONS

GDPR Recital 27 states that the Regulation does not apply to personal data of deceased persons, while Member States may provide rules for deceased-person data.

This does **not** imply:

```text
deceased record = unrestricted commercial asset
```

Other constraints remain:

- copyright;
- database rights;
- archive terms;
- confidentiality rules;
- reputation/personality rights under applicable law;
- personal data of living people inside the same record.

Architecture rule:

```text
DECEASED
removes neither
RIGHTS CHECK nor LIVING-RELATIVE CHECK
```

---

# 10. LIVING STATUS

Recommended future enum:

```text
UNKNOWN
LIVING
DECEASED
```

Policy:

```text
UNKNOWN
→ privacy controls equivalent to LIVING
```

until sufficient basis exists to classify otherwise.

Do not infer death merely because:

- an archive record is old;
- a date estimate makes death likely.

Source-specific access periods are not a canonical proof of individual death.

---

# 11. LIVING PERSON DATA

The surname MVP should not be a people-finder.

P0 policy:

```text
do not expose person-level living records
```

Future person research requires:

- private workspace;
- lawful-basis assessment;
- Article 14 assessment for indirectly obtained data;
- minimization;
- retention;
- DPIA screening;
- access controls;
- dispute/correction flow.

---

# 12. SPECIAL-CATEGORY DATA

GDPR Article 9 covers categories including:

- racial/ethnic origin;
- political opinions;
- religious/philosophical beliefs;
- trade-union membership;
- genetic data;
- certain biometric data;
- health;
- sex life/sexual orientation.

P0 hard policy:

```text
Name Atlas does not infer a user's ethnicity, religion,
politics, health, genetics or sexuality from a surname.
```

Future archival materials may contain such facts.

Default action for a living/unknown person:

```text
do not extract/store into product domain
unless an explicitly approved high-risk workflow exists
```

---

# 13. SENSITIVE HISTORICAL CONTEXT

Potential sensitive record categories:

```text
persecution
Holocaust
religious community records
political repression
criminal accusations
adoption
parentage disputes
health
institutionalisation
military discipline
wartime displacement
sexuality
```

Surname-level occurrence may be usable without surfacing the sensitive context.

Example:

Allowed if sufficient:

```text
Surname X appears in archive collection Y in 1946.
```

Not automatically:

```text
The user's relatives were political prisoners.
```

---

# 14. PURPOSE REGISTRY

Canonical processing purposes:

```text
SURNAME_DISCOVERY
PREMIUM_SURNAME_REPORT
REPORT_DELIVERY
ACCOUNT_ACCESS
PAYMENT_PROCESSING
CUSTOMER_SUPPORT

PRODUCT_ANALYTICS
EXPERIMENTATION
MARKETING_ATTRIBUTION

FRAUD_SECURITY
LEGAL_COMPLIANCE

SOURCE_INGESTION
SOURCE_RIGHTS_MANAGEMENT

FAMILY_ORIGIN       # later
DEEP_FAMILY_RESEARCH # later
HUMAN_RESEARCH       # later
```

Every personal-data field has allowed purposes.

---

# 15. PURPOSE LIMITATION

Do not silently repurpose:

```text
family region entered to improve genealogy
```

into:

```text
ad targeting
price personalization
marketing segmentation
```

Likewise:

```text
email for report delivery
```

does not automatically mean:

```text
marketing newsletter consent
```

---

# 16. DATA MINIMIZATION BY PRODUCT TIER

## Free surname lookup

Required:

```text
raw surname in request
country/market
locale
technical request context
```

No email required.

## Premium surname report

Required/likely:

```text
surname
offer/order
email for delivery/recovery
payment provider state
```

No family details required.

The existing paywall architecture explicitly treats family data as unnecessary for the normal Name Report.

## Family Origin later

Collect only fields that actually narrow research.

Likely:

```text
family-associated region/town
optional known ancestor name
approximate time range
```

## Deep Research later

More detailed person data may be necessary, but each field needs purpose documentation.

---

# 17. FORM-FIELD PURPOSE DISCLOSURE

At collection point:

```text
Email
"Used to deliver and recover access to your report."
```

```text
Family region
"Used to narrow surname evidence toward the part of your family you want to investigate."
```

Avoid vague:

```text
Tell us more so we can personalize.
```

---

# 18. LAWFUL-BASIS CANDIDATE MATRIX

**The following is an architecture starting point, not final legal advice.**

| Processing | Candidate basis | Status |
|---|---|---|
| Deliver requested surname lookup | Contract/requested service or legitimate interests depending legal characterization | LEGAL REVIEW |
| Paid report / entitlement | Contract | Strong candidate |
| Payment/accounting | Contract + legal obligation where applicable | Strong candidate |
| Transactional email | Contract / legitimate interests as necessary delivery | Strong candidate |
| Support | Contract / legitimate interests | Review |
| Fraud/security | Legitimate interests / legal obligation | Review |
| Client analytics | Consent for P0 EEA design | Recommended conservative launch |
| Experimentation identifiers | Consent for P0 EEA design | Recommended conservative launch |
| Marketing attribution tracking | Consent where required | Recommended |
| Marketing email | Consent / local marketing rules | LEGAL REVIEW |
| User's own Family Research | Contract + other bases as needed | LEGAL REVIEW |
| Living third-party relative | Legitimate interests may be candidate; contract with user is not automatically enough | **LEGAL REVIEW REQUIRED** |
| Special-category family data | Requires Art. 9 condition in addition to Art. 6 basis | **AVOID / LEGAL REVIEW** |

---

# 19. WHY `CONTRACT` MUST NOT BE OVERUSED

EDPB guidance treats Article 6(1)(b) as requiring objective necessity for the contract/service.

Do not claim:

```text
everything useful to the product
=
necessary for contract
```

Examples unlikely to be necessary solely because the service exists:

- behavioral experimentation;
- unrelated analytics;
- marketing profiling.

---

# 20. THIRD-PARTY FAMILY DATA — ARTICLE 14

When Name Atlas receives personal data about a living person from:

```text
the user
an archive
a partner
a public source
```

the data were not necessarily obtained from that person.

GDPR Article 14 can impose transparency obligations.

Article 14 contains exceptions, but none should be assumed automatically.

Future Family Origin/Deep Research architecture must store:

```text
data_source
collection_context
living_status
transparency_status
transparency_exception_reason if legally approved
```

before large-scale person research is launched.

> **LEGAL COUNSEL REVIEW REQUIRED**

---

# 21. CONSENT ARCHITECTURE

Consent is not used as a catch-all basis.

Where used it must support:

- clear purpose;
- affirmative choice;
- no preselection;
- withdrawal;
- version/audit;
- equivalent refusal;
- no conditioning unrelated service on unnecessary consent.

EDPB consent guidance is the reference.

---

# 22. EEA / POLAND LAUNCH CONSENT STATES

Technical classes from Prompt 18:

```text
ESSENTIAL_OPERATIONAL
PRODUCT_ANALYTICS
EXPERIMENTATION
MARKETING_ATTRIBUTION
SESSION_REPLAY
```

Recommended P0 defaults before non-essential consent:

```text
ESSENTIAL_OPERATIONAL = ON
PRODUCT_ANALYTICS = OFF
EXPERIMENTATION = OFF
MARKETING_ATTRIBUTION = OFF
SESSION_REPLAY = OFF
```

After valid choice:

only approved categories activate.

This is intentionally conservative.

---

# 23. POLISH PKE / TERMINAL ACCESS

Polish PKE Article 399 governs storing/accessing information already on end-user terminal equipment.

Therefore browser technologies such as:

- analytics cookies;
- localStorage identifiers;
- experiment assignment IDs;
- some SDK identifiers;

must be reviewed separately from GDPR lawful basis.

P0 architecture rule:

> non-essential browser analytics/experimentation state does not initialize before relevant consent.

A genuinely server-side aggregate system that does not access terminal information presents a different legal analysis, but GDPR lawful-basis duties still apply.

**LEGAL COUNSEL REVIEW REQUIRED** before changing the conservative launch behavior.

---

# 24. ESSENTIAL STORAGE

Potentially essential:

```text
secure session
CSRF state
consent-preference memory
checkout continuity
magic-link/session state
```

Whether any specific technology falls within a legal exemption depends on implementation/purpose.

Document the reason for each cookie/storage key.

---

# 25. COOKIE / STORAGE REGISTRY

Maintain:

```text
key
technology
owner
purpose
category

first_party / third_party
duration
data stored

consent_required
exemption_basis if relied upon
vendor

created_at
last_reviewed
```

No unregistered browser storage in production.

---

# 26. MODEL CHANGE PROPOSAL 19-B — CONSENT RECORD

Add:

```text
ConsentRecord
```

Fields:

```text
consent_record_id
subject_type       # anonymous visitor / user
subject_id_hash

policy_version
jurisdiction

analytics
experimentation
marketing_attribution
session_replay

captured_at
source_surface
withdrawn_at
supersedes_consent_record_id
```

For anonymous user, use a privacy-safe pseudonymous identifier.

The consent-preference mechanism itself must not become a broad tracking identifier.

**Recommendation:** P0.

---

# 27. CONSENT WITHDRAWAL

On withdrawal:

1. stop future capture in affected category;
2. reset/clear relevant analytics identifiers/storage where applicable;
3. call vendor opt-out/reset;
4. preserve consent audit record as legally necessary;
5. trigger deletion workflow where required and technically supported.

Withdrawal must be as accessible as acceptance.

---

# 28. ANALYTICS PRIVACY — P0

Carry forward Prompt 18:

```text
no raw surname by default
no exact DOB
no family names
no archive person ID
no precise family address
no Claim prose
```

Use:

```text
surname_analytics_key
coverage tier
availability buckets
search_id
pseudonymous visitor ID
```

A pseudonymous ID is still personal data if linkable.

HMAC is **pseudonymization**, not anonymization.

---

# 29. ANALYTICS HMAC

Prompt 18:

```text
surname_analytics_key =
HMAC(internal_surname_id, analytics_secret_version)
```

Requirements:

- separate secret in KMS/secret manager;
- version prefix;
- no reversible encryption;
- no secret in frontend;
- access limited to analytics context builder;
- rotation plan.

---

# 30. POSTHOG P0 PRIVACY REVIEW

Current official PostHog docs state:

- Cloud EU is hosted on servers in Frankfurt;
- all Cloud customers can generate a signed DPA;
- PostHog has controls for hashing, IP discard, deletion and access;
- customer/user data storage location can be EU;
- PostHog's corporate/customer-account processing can still involve broader international processing;
- its privacy policy currently allows Customer Content to be used, after aggregation/de-identification, for PostHog Product and Model Development unless otherwise agreed or the customer opts out prospectively.

Therefore P0 onboarding checklist:

```text
[ ] EU Cloud project
[ ] signed DPA
[ ] subprocessor review
[ ] opt out of Product and Model Development
[ ] autocapture disabled
[ ] raw IP storage disabled where feasible/appropriate
[ ] event allowlist
[ ] raw surname blocked
[ ] Session Replay disabled
[ ] production and non-production separated
```

References:

https://posthog.com/docs/privacy

https://posthog.com/privacy

https://posthog.com/docs/privacy/data-storage

---

# 31. POSTHOG AUTOCAPTURE

Default recommendation:

```text
autocapture = false
```

Use explicit event taxonomy from Prompt 18.

Benefits:

- less accidental form capture;
- stable metric semantics;
- smaller privacy surface.

---

# 32. SESSION REPLAY

P0:

```text
OFF
```

Not “sampled”.

Not “enabled but ignore it”.

If enabled later:

```text
LEGAL / PRIVACY REVIEW
+
consent gate
+
maskAllInputs
+
mask all text by default
+
ph-no-capture sensitive areas
+
URL/query redaction
+
network-capture review
+
route exclusions
```

PostHog notes that input elements are masked by default but ordinary text is not masked by default. Therefore simply relying on input masking is insufficient for Name Atlas.

Exclude entirely:

```text
checkout
report private routes
Family Origin
Deep Research
admin
support
```

unless a later formal review explicitly permits them.

---

# 33. EXPERIMENTATION PRIVACY

If `EXPERIMENTATION = false`:

- user receives default product variant;
- no non-essential persistent experiment assignment;
- no experiment exposure analytics.

Price experiments in Poland/EEA P0 should only include users eligible under approved consent/technical policy.

Do not use surname/family attributes for individualized pricing.

---

# 34. PERSONALIZED PRICING POLICY

Hard Name Atlas policy:

Do not personalize price using:

```text
surname
inferred ethnicity
religion
family history
region associated with family
estimated wealth
sensitive behavior
```

Permitted controlled experiment:

```text
randomized A/B price
```

with stable treatment and transparent checkout price.

---

# 35. PROFILING

P0 random experimentation and basic pseudonymous product analytics are distinct from high-risk personal profiling.

Do not build:

```text
ancestry propensity score
wealth score
ethnicity segment
vulnerability score
```

Future behavioral personalization requires a new privacy review.

---

# 36. PUBLIC SURNAME CACHE

May contain:

- canonical surname;
- approved public Claims;
- public citations;
- Coverage;
- DiscoveryIndex public projection.

Must not contain:

```text
visitor ID
email
which user searched surname
family input
order
```

---

# 37. PRIVATE FAMILY CACHE — FUTURE

Rules:

```text
workspace/user-scoped
encrypted
no shared CDN
no public cache
no cross-user dedup that exposes existence
shorter explicit retention
```

Shared public source artifacts can be referenced by ID, but user-family linkage remains private.

---

# 38. SEO PRIVACY

Indexable:

```text
public surname profile only
```

Never index:

```text
search session
email
premium report access token
FamilyPerson
family branch
candidate person match
private report
user notes
```

Hard product rule:

```text
FamilyPerson.indexable = false
```

---

# 39. SHARE PRIVACY

Share generator consumes only:

```text
PUBLIC_FREE
+
SHARE allowed
```

Claims.

Premium entitlement does not automatically mean content is shareable.

Family data is not shareable by default.

---

# 40. PREMIUM REPORT PRIVACY

Surname-only premium report:

```text
USER_PRIVATE
```

because access/purchase association is personal even if much of its underlying surname content is public.

Future family report:

```text
FAMILY_PRIVATE
or SENSITIVE_PERSONAL
```

depending content.

---

# 41. AUTHENTICATION STRATEGY

P0:

```text
Free surname search:
anonymous

Premium:
email-backed entitlement
+
secure magic-link/session access

Account:
optional after purchase
```

Avoid forced account creation at checkout.

---

# 42. PASSWORDS

Do not introduce password storage if not needed.

P0 passwordless architecture reduces:

- credential stuffing;
- password-reset data;
- hashing/credential operations.

If passwords are later added, use a modern password hashing algorithm and ASVS requirements.

---

# 43. MAGIC-LINK SECURITY

Token requirements:

```text
CSPRNG / high entropy
purpose-scoped
expiry
revocable
bounded/single-use for login exchange
```

Recommended storage:

```text
hash(token)
```

not raw token.

Flow:

```text
email URL raw token
↓
server hashes
↓
compare
↓
consume/exchange for session
↓
redirect to clean URL
```

Do not leak token to:

- analytics;
- referrers;
- logs;
- third-party pixels.

---

# 44. MAGIC-LINK URL POLICY

Use:

```text
no third-party analytics on redemption page
Referrer-Policy: no-referrer or strict policy
```

After successful exchange:

```text
303/302 redirect
```

to URL with no secret.

---

# 45. AUTHORIZATION

Every private object access checks:

```text
identity/session
+
entitlement/workspace membership
+
resource
+
action
```

Never:

```text
report ID is sufficiently random
```

as authorization.

---

# 46. ACCESS-CONTROL MODEL

Use hybrid:

## RBAC

Roles:

```text
ANONYMOUS
USER
SUPPORT
RESEARCHER
ADMIN
LEGAL_REVIEWER
SYSTEM
```

## ABAC

Attributes:

```text
resource owner/workspace
PrivacyClass
SecurityClass
entitlement
assignment
source rights
```

Example:

```text
SUPPORT
can view order/report delivery metadata
cannot read FAMILY_PRIVATE research by default
```

---

# 47. LEAST PRIVILEGE

Marketing:

```text
aggregate analytics
not FamilyPerson
```

Support:

```text
order/email/delivery
not arbitrary family data
```

Researcher:

```text
assigned family cases
not all workspaces
```

Engineer:

```text
production access only when required
audited
```

---

# 48. STAFF IDENTITY

Required:

```text
SSO
MFA
individual accounts
no shared admin account
```

Privileged accounts separate where practical.

---

# 49. BREAK-GLASS

Emergency access records:

```text
actor
reason
approved_by
scope
started_at
expires_at
resources accessed
```

After event:

```text
mandatory review
```

---

# 50. AUDIT LOG

Audit events include:

```text
role granted/revoked
private family resource access
manual Claim override
source RightsProfile change
source connector enabled/disabled

entitlement override
report manual export
data export

DSAR action
deletion

break-glass

security configuration change
```

Audit log is separate from PostHog product analytics.

---

# 51. MODEL CHANGE PROPOSAL 19-C — AUDIT EVENT

Add operational security object:

```text
AuditEvent
```

Fields:

```text
audit_event_id
actor_type
actor_id

action
resource_type
resource_id

reason_code
metadata_safe

occurred_at
request_id
trace_id
```

Storage should be tamper-resistant / append-oriented.

**Recommendation:** P0 for privileged actions.

---

# 52. AUDIT RETENTION

Do not tie audit retention to normal user analytics.

Security/legal records may need longer retention.

Exact period:

```text
SECURITY POLICY CANDIDATE
+
LEGAL REVIEW REQUIRED
```

Access is tightly restricted.

---

# 53. SECURITY VERIFICATION STANDARD

P0 target:

> **OWASP ASVS 5.0 Level 2**

Reason:

OWASP describes L2 as appropriate for most applications containing data requiring protection.

P1 Family/Deep Research can selectively adopt L3 controls for high-risk components.

Use OWASP Top 10 as awareness, not verification completeness.

OWASP itself recommends ASVS for verifiable application-security requirements.

---

# 54. API SECURITY

Explicitly test against OWASP API Security risks, especially:

```text
BOLA / IDOR
Broken Authentication
Broken Object Property Authorization
Unrestricted Resource Consumption
Broken Function Level Authorization
SSRF
Security Misconfiguration
Unsafe Consumption of APIs
```

Critical Name Atlas targets:

```text
/reports/{id}
/research-runs/{id}
/admin/*
future /family/*
```

---

# 55. ENCRYPTION IN TRANSIT

P0:

```text
TLS 1.2+
prefer TLS 1.3
```

ASVS current guidance treats TLS 1.2/1.3 as recommended current protocols.

No unencrypted:

- API;
- DB over untrusted network;
- vendor connection;
- admin.

---

# 56. ENCRYPTION AT REST

Require provider/platform encryption for:

```text
PostgreSQL
object storage
backups
Redis persistence where enabled
```

This is baseline, not sufficient access control.

---

# 57. APPLICATION/FIELD ENCRYPTION

P0 candidates:

```text
email: database-level encryption plus strict access usually adequate;
application-level encryption optional depending provider/threat model
```

Future family fields:

```text
names
DOB
family locations
uploaded private notes
```

should be evaluated for application-level envelope encryption.

Trade-off:

- stronger blast-radius control;
- harder indexing/search;
- key operations.

Recommended:

> design encryption abstraction now; mandate application-level encryption when Family Origin introduces private third-party records unless threat/legal review approves database-only protection.

---

# 58. KEY MANAGEMENT

Use managed KMS.

Keys:

- separate by purpose;
- environment-specific;
- rotation;
- IAM-controlled;
- no application repo.

Application-level encryption:

```text
DEK
encrypted by KEK
```

where appropriate.

---

# 59. SECRETS MANAGEMENT

Secrets include:

```text
DB password
Redis password
LLM API key
PostHog personal/server key
payment provider secret
webhook signing secret
email provider secret
source partner credentials
HMAC analytics secret
```

Requirements:

- cloud secret manager;
- per-environment;
- scoped;
- rotation;
- no logging;
- no frontend unless explicitly public token.

---

# 60. POSTHOG TOKENS

PostHog docs distinguish the public project token from private personal API keys.

Policy:

```text
public project token:
frontend allowed if architecture requires it

personal API key:
server-only SECRET
```

No administrative PostHog key in browser.

---

# 61. STORAGE TOPOLOGY

| Store | Data | P0 region target | Public? |
|---|---|---|---:|
| PostgreSQL | canonical app/user/order/profile | EU | No |
| Redis | queue/cache IDs/state | EU | No |
| Object Storage | raw approved source artifacts/reports | EU | No |
| CDN | public surname projection/static assets | EU/global edge | Public only |
| PostHog | consented product events | EU Cloud | No |
| Payment provider | payment/customer data | provider | No |
| Email provider | email + transactional message | provider | No |
| LLM provider | task input/output | approved API | No |
| Logs | operational/security | EU preferred | No |
| Backups | DB/storage | EU preferred | No |

---

# 62. DATA RESIDENCY

Poland-first recommendation:

```text
core app DB = EU
Redis = EU
object storage = EU
analytics = EU region
```

This reduces transfer complexity but does not eliminate it because:

- vendor support;
- subprocessors;
- corporate access;
- LLM/payment/email providers;

may involve non-EEA processing.

---

# 63. INTERNATIONAL TRANSFERS

Vendor register stores:

```text
processing locations
transfer mechanism
SCC status
adequacy basis
DPA
subprocessors
```

If non-EEA:

legal/privacy review must determine appropriate mechanism and supplementary measures.

---

# 64. PROCESSOR REGISTER

Fields:

```text
vendor_id
vendor_name
purpose

controller_processor_role

data_categories
data_subjects

regions
subprocessors_url

DPA_status
transfer_mechanism

security_review_status
privacy_review_status

retention
deletion_support

owner
review_due_at
```

---

# 65. POSTHOG VENDOR DECISION

Conditionally approved only if P0 checklist passes:

- EU Cloud;
- DPA;
- Product/Model Development opt-out;
- Session Replay off;
- autocapture off;
- IP storage policy configured;
- subprocessor review;
- consent gating.

Otherwise:

```text
NOT PRODUCTION APPROVED
```

---

# 66. OPENAI API VENDOR BASELINE

If OpenAI API is used:

Current OpenAI business/API materials state:

- business/API inputs/outputs are not used to train models by default;
- data are encrypted at rest and in transit;
- qualifying organizations can request/configure retention controls including Zero Data Retention for eligible API use;
- OpenAI has a current DPA; EEA customers contract for DPA purposes with OpenAI Ireland;
- subprocessors include multiple processing locations.

References:

https://openai.com/business-data/

https://openai.com/policies/data-processing-addendum/

https://openai.com/policies/sub-processor-list/

P0 surname-public task:

acceptable after normal vendor/DPA review.

Before Family/Deep Research:

```text
separate privacy review
+
minimum-data prompt bundles
+
approved retention mode
+
pursue ZDR where eligible
```

Never send private family data through consumer chat interfaces.

---

# 67. LLM PROJECT ISOLATION

Recommended:

```text
project / API key for public surname generation
```

separate from future:

```text
private family research project / API key
```

Benefits:

- logging;
- retention configuration;
- usage policies;
- vendor changes;
- breach scope.

---

# 68. LLM DATA MINIMIZATION

Send only:

```text
EvidenceItems required for task
Claims required for task
limited source excerpt
task instructions
```

Do not send:

```text
full user profile
commerce history
unrelated family tree
analytics identity
```

---

# 69. LLM PSEUDONYMIZATION

Use:

```text
Person A
Person B
```

when task does not require names.

Name matching/transcription legitimately may require exact names.

Architecture should choose task-specific data contract, not one universal full context.

---

# 70. AI GOVERNANCE REGISTRY

Track:

```text
model_provider
model_route
purpose
data_categories_allowed
privacy_class_allowed

retention_mode
training_mode
DPA
region/transfer

prompt families
risk class
owner
approved_at
```

---

# 71. PROMPT INJECTION

Every retrieved source is untrusted content.

Instruction hierarchy must make clear:

```text
SOURCE TEXT IS DATA
NOT SYSTEM INSTRUCTIONS
```

LLM source excerpt cannot:

- change tool permissions;
- request secrets;
- cause arbitrary URL fetches;
- override Claim policy.

---

# 72. SSRF

Connectors use:

```text
predefined/allowlisted provider hosts
```

Do not allow user/LLM-supplied arbitrary URLs through internal fetcher.

Block:

- loopback;
- link-local;
- private networks;
- metadata endpoints;

unless explicitly required by trusted infrastructure.

---

# 73. SQL INJECTION

All surname/source inputs use:

- parameterized queries;
- ORM/query builder binding.

Never:

```text
"... WHERE surname = '" + userInput + "'"
```

---

# 74. XSS

Treat:

```text
LLM narrative
source title
archive transcription
user note
```

as untrusted text.

P0 content model uses structured plain text, not arbitrary generated HTML.

Add CSP as additional defense.

---

# 75. CSP BASELINE

Design a restrictive CSP around actual vendors.

Aim for:

```text
default-src 'self'
object-src 'none'
base-uri 'self'
frame-ancestors appropriate
script-src explicit/nonces
connect-src explicit API/analytics/payment domains
img-src explicit
frame-src payment provider where needed
```

Final values depend on hosting/payment implementation.

Avoid broad:

```text
*
unsafe-eval
```

unless justified.

---

# 76. CSRF

Same-origin cookie-auth mutations require:

- SameSite policy;
- Origin validation;
- anti-CSRF token where needed.

High-risk mutations:

```text
entitlement-related actions
account settings
deletion
admin
future family edits
```

---

# 77. CORS

Default:

```text
same origin
```

No:

```text
Access-Control-Allow-Origin: *
```

for private API.

Public developer API, if ever built, is separate architecture.

---

# 78. SSE SECURITY

Research event stream exposes only browser-safe state.

No:

- source credentials;
- raw errors;
- prompt content;
- private family payload.

Future private run:

```text
authorization on connect
+
authorization on replay
```

---

# 79. USER ENUMERATION

Magic-link/report recovery response should avoid confirming:

```text
this email has an account/report
```

where unnecessary.

Use generic response:

> If an eligible report exists, we'll send access instructions.

Rate limit.

---

# 80. RATE LIMITING / ABUSE

Separate policies:

```text
public search
resolver
magic link request
checkout creation
report access
admin
```

Use:

- IP/session limits;
- behavioral abuse signals;
- CDN/WAF;
- server-side quotas.

Do not permanently block legitimate family sharing due to simple shared IP without review.

---

# 81. PUBLIC SCRAPING OF NAME ATLAS

Public surname pages may be indexed.

But Name Atlas may hold:

- licensed derivative data;
- proprietary evidence organization;
- database rights.

P0:

- no bulk public export;
- rate limit API;
- robots policy;
- ToS restrictions;
- monitor automated extraction.

This is not a substitute for source-right compliance.

---

# 82. REDIS / BULLMQ PRIVACY

Jobs should contain:

```text
IDs
module instructions
```

not full user/family objects.

Bad:

```json
{"grandmother_name":"...", "dob":"...", "address":"..."}
```

Better:

```json
{"family_case_id":"...","module":"archive_search"}
```

Worker loads authorized data from DB.

---

# 83. LOGGING PRIVACY

Default logs use:

```text
request_id
trace_id
user_id_hash
resource_id
status
error_code
```

Do not log:

```text
raw magic token
Authorization header
email
full surname query unless debugging approved
family names
DOB
card/payment secret
LLM full private prompt
partner credential
```

---

# 84. DEBUG LOGGING

If a high-risk issue requires temporary payload logging:

- security/privacy approval;
- shortest duration;
- restricted destination;
- automatic expiry;
- redaction;
- incident/change ticket.

No permanent `DEBUG=true` production payload logs.

---

# 85. ERROR TRACKING

Any error-tracking provider becomes processor.

Configure:

```text
request-body capture off/default redaction
cookies/auth redacted
email redacted
family routes redacted
source secrets redacted
```

Vendor review required.

---

# 86. FILE SECURITY — FUTURE

If users can upload:

- scans;
- photos;
- PDFs;

pipeline:

```text
upload
↓
size/type check
↓
store quarantine
↓
malware scan
↓
content inspection
↓
private object
↓
signed authorized access
```

Do not trust extension/MIME header alone.

---

# 87. REPORT FILE SECURITY

Generated PDF/download:

```text
private bucket
```

Access through:

- authorized endpoint; or
- short-lived signed URL.

Never permanent public S3 URL.

File name sanitized.

---

# 88. PAYMENT SECURITY BOUNDARY

Prompt 20 should select a PCI-compliant processor.

P0 architecture target:

> **Name Atlas never receives raw PAN/CVC.**

Prefer:

1. provider-hosted redirect checkout; or
2. provider-hosted/tokenized components.

PCI SSC guidance confirms SAQ A scope depends on how payment page components are provided; redirects/full outsourcing simplify the merchant payment-page exposure relative to merchant-hosted card fields.

Exact PCI validation:

```text
PAYMENT PROVIDER / ACQUIRER REVIEW REQUIRED
```

---

# 89. PAYMENT WEBHOOK SECURITY

Required:

```text
signature verification
raw body verification per provider
timestamp/freshness where available
idempotency
event replay handling
event type allowlist
```

Browser success redirect never grants entitlement.

Canonical:

```text
verified server-side payment event
→ order state
→ entitlement
```

---

# 90. EMAIL SECURITY

Transactional report email:

- no sensitive family details in subject;
- link token no analytics query forwarding;
- SPF/DKIM/DMARC for sending domain;
- email provider DPA;
- anti-enumeration.

---

# 91. DATABASE ROLES

Separate:

```text
app_runtime
migration
background_worker
read_only_ops
backup
admin_breakglass
```

No shared superuser for normal application.

Analytics should not query production DB with superuser credentials.

---

# 92. PRODUCTION STAFF ACCESS

Rules:

- no standing broad access unless necessary;
- MFA/SSO;
- role;
- audit;
- production vs staging separation;
- private family tables access-restricted.

---

# 93. SUPPORT ACCESS

P0 support panel can expose:

```text
email
order
payment status
report status
delivery timestamp
```

Not:

```text
full Claim/Evidence internals
future family workspace
```

unless escalation grants temporary appropriate role.

---

# 94. HUMAN RESEARCHER ACCESS — FUTURE

Researcher assigned to a case receives:

```text
case-scoped access
```

No organization-wide family search.

Contract/NDA/training required.

Exports limited to assigned research.

---

# 95. BACKUPS

Required:

- encrypted;
- access-restricted;
- region-controlled;
- restore-tested.

Backups should cover:

```text
DB
rights registry
orders/entitlements
family workspace later
```

Redis queue/cache is not canonical recovery source.

---

# 96. DISASTER RECOVERY

Define classes, not fake launch SLA.

Critical restore order:

1. identity/auth/commerce;
2. canonical PostgreSQL;
3. private reports/object storage;
4. queues;
5. public caches;
6. analytics.

Measure RPO/RTO after infrastructure selected.

---

# 97. SOFTWARE SUPPLY CHAIN

P0 controls:

```text
lockfiles
automated dependency scanning
secret scanning
SAST
reviewed upgrades
minimal package permissions
protected CI
```

OWASP Top 10:2025 includes software supply-chain failures as a major category.

---

# 98. CI/CD SECURITY

Production:

- protected main branch;
- reviewed changes;
- CI secrets scoped;
- production environment approvals for high-risk changes;
- no secrets in PR logs;
- artifact provenance where practical.

Security-sensitive config changes reviewed like code.

---

# 99. ENVIRONMENT ISOLATION

```text
DEV
STAGING
PRODUCTION
```

Separate:

- DB;
- Redis;
- analytics project;
- payment keys;
- LLM/source keys.

Never copy production family data into dev.

Use Prompt 17 fixtures.

---

# 100. RETENTION FRAMEWORK

Retention is defined per data category and purpose.

Do not use:

```text
keep forever
```

as default.

Retention states:

```text
ACTIVE
EXPIRY_SCHEDULED
LEGAL_HOLD
DELETION_PENDING
DELETED
ANONYMIZED
```

---

# 101. P0 RETENTION CANDIDATES

These are **product policy candidates**, not statutory legal advice.

| Category | Candidate | Notes |
|---|---|---|
| Public surname knowledge | Long-lived/versioned | Subject to source rights/freshness |
| Anonymous raw search association | Short; e.g. days/weeks | Prefer aggregate analytics |
| Consented product analytics | 12–13 months raw candidate | Prompt 19 legal/CMP review |
| Experiment assignment | Experiment + audit window | Minimize IDs |
| Account/email | While report/account service active + justified period | User deletion |
| Report artifact | While entitlement/service retained | User-access policy |
| Order/accounting | Statutory/business legal period | Counsel/accountant |
| Magic token | Minutes/hours, then consumed/expired | Credential |
| Security logs | Months candidate | Risk-based |
| Audit logs | Longer candidate | Privileged/legal actions |
| Private family workspace | User-controlled + inactivity policy | Future |
| Raw source cache | RightsProfile-defined | Not privacy-only |

Final values require legal/operational review.

---

# 102. SEARCH HISTORY RETENTION

Do not maintain indefinite:

```text
Visitor A searched surname B at every timestamp
```

unless a clear product purpose exists.

Public surname profile remains.

User-behavior association should be:

- analytics-consent scoped;
- pseudonymous;
- retention-limited.

---

# 103. PUBLIC PROFILE RETENTION

Public surname knowledge is not automatically personal data of the visitor.

It can remain after user deletion.

Delete:

```text
user association
```

not:

```text
canonical surname profile
```

unless the Claim/source itself requires correction/removal.

---

# 104. ACCOUNT RETENTION

Deletion should remove/anonymize account data not legally required.

Report access product decision:

- deletion may delete private report;
- or user may choose report-only access before account deletion.

Prompt 20 should define.

---

# 105. ORDER RETENTION

Tax/accounting obligations may require certain invoice/order records after user deletion.

Keep only statutory/necessary record, restricted from product use.

> **POLISH TAX / ACCOUNTING COUNSEL REVIEW REQUIRED**

---

# 106. PRIVATE FAMILY RETENTION — FUTURE

Recommended policy characteristics:

- explicit delete workspace;
- inactivity expiry/reminder;
- export before delete;
- no indefinite default;
- third-party data deleted with workspace unless legal hold/other basis.

---

# 107. SOURCE CACHE RETENTION

RightsProfile controls:

```text
may_cache
max_cache_duration if contract says
raw_asset_storage
derivative_storage
```

Do not use privacy retention to override provider contract.

---

# 108. ANALYTICS RETENTION

PostHog storage plan/settings must match Name Atlas policy.

Prefer shorter raw-event retention than indefinite accumulation.

Aggregated non-identifiable metrics can be retained longer.

Exact period:

```text
LEGAL / PRODUCT REVIEW REQUIRED
```

---

# 109. SECURITY LOG RETENTION

Long enough for:

- incident detection;
- investigation;
- abuse patterns.

Separate from marketing analytics.

Access restricted to security/engineering.

---

# 110. DATA DELETION WORKFLOW

```text
Request
↓
Authenticate / verify requester
↓
Create DSAR/DeleteCase
↓
Discover resources
↓
Apply legal holds/exceptions
↓
Delete active-system data
↓
Revoke sessions/tokens
↓
Notify processors
↓
Schedule backup aging
↓
Verify
↓
Audit completion
```

---

# 111. DSAR / RIGHTS WORKFLOW

Support:

```text
ACCESS
ERASURE
RECTIFICATION
RESTRICTION
OBJECTION
PORTABILITY where applicable
```

Case object:

```text
request_id
subject
request_type
received_at
verification
deadline
systems
exceptions
decision
completed_at
```

Exact legal response deadlines follow applicable law and counsel-reviewed SOP.

---

# 112. DSAR IDENTITY VERIFICATION

Use proportionate verification.

Do not request excessive ID documents merely because user submits a privacy request.

Magic-link/account verification may suffice for many users.

Higher-risk family export may need stronger verification.

---

# 113. DSAR SYSTEM DISCOVERY

Inventory:

```text
application DB
account/order
reports
family workspace later
PostHog
email provider
payment provider
support
error/log systems where relevant
```

Processor deletion APIs/process documented.

---

# 114. BACKUPS AND DELETION

Common policy:

- delete active data promptly after approved request;
- backups age out under fixed schedule;
- deleted data is not intentionally restored into active service;
- if backup restore occurs, deletion tombstones are reapplied.

Final legal wording reviewed by counsel.

---

# 115. LEGAL HOLD

P1 operational object:

```text
LegalHold
```

can suspend deletion of specifically scoped records.

Only legal/admin can create/release.

Full reason/audit required.

---

# 116. USER-REPORTED FACT CORRECTION

Different workflow from privacy correction.

```text
"This surname history is wrong"
↓
research issue
↓
source review
↓
Claim reassessment
```

User cannot directly mutate canonical historical Claim.

---

# 117. SOURCE RIGHTS ARCHITECTURE

Canonical chain:

```text
Source
↓
RightsProfile version
↓
SourceRecord
↓
Evidence
↓
Claim
↓
SurfaceEligibility
```

No source enters production without RightsProfile.

---

# 118. SOURCE LICENSING REGISTER

Fields:

```text
source_id
owner

official_terms_url
contract_reference
license

terms_version/date
checked_at
checked_by

automated_access
commercial_use
metadata_reuse
database_extraction
redistribution
cache
image_reproduction
transcription_reuse
AI_processing

attribution_text
attribution_link

processing_personal_data_note

review_due_at
legal_status
```

---

# 119. RIGHTS STATES

Use explicit:

```text
ALLOWED
ALLOWED_WITH_CONDITIONS
PARTNERSHIP_REQUIRED
PROHIBITED
UNKNOWN
```

Unknown never defaults to allowed.

---

# 120. SOURCE ONBOARDING GATE

Before connector enabled:

```text
official terms captured
↓
technical access path approved
↓
rights dimensions assessed
↓
privacy assessment if person data
↓
rate limits stored
↓
attribution stored
↓
review owner/date
↓
connector activated
```

---

# 121. SCRAPING POLICY

Default:

> **No production scraping unless an explicit rights/terms/legal assessment approves that exact automated access and intended use.**

Preferred order:

```text
official API
bulk dataset
institutional feed
written partnership
manual researcher access
```

Crawler is not a substitute for permission.

---

# 122. ROBOTS.TXT

Treat as technical crawling signal.

It does not establish:

- copyright licence;
- database reuse right;
- commercial permission.

Likewise:

```text
robots allows
```

does not override ToS/licence.

---

# 123. NO QUOTA EVASION

Prohibited:

- IP rotation to bypass limits;
- multiple fake accounts;
- CAPTCHA bypass;
- hidden endpoints;
- unauthorized API reverse engineering.

---

# 124. IJP PAN / ISNP STATUS — 2026-09-17

Current public ISNP 2.0 is active and displays © 2026 IJP PAN.

Current verification did **not** identify:

- public production API;
- blanket commercial dataset licence;
- explicit permission for bulk automated extraction.

Therefore:

```text
commercial_use = UNKNOWN
automated_access = UNKNOWN
paid_report = BLOCKED
production_scraping = BLOCKED
```

until written licence/partnership.

Public browsing is not sufficient.

Contact/licensing remains high priority.

---

# 125. PTG / GENETEKA STATUS

Existing project research identifies database-producer-right risk and no approved Name Atlas commercial bulk integration.

During this Prompt 19 web verification, the relevant Geneteka page did not permit automated fetch from the research environment, so no new rights conclusion should be invented from that failure.

Canonical status remains:

```text
PARTNERSHIP_REQUIRED
no production bulk crawler
```

until PTG grants written rights/access.

---

# 126. SZUKAJ W ARCHIWACH — CURRENT TERMS

Current official terms distinguish:

- service/database rights;
- public-domain materials;
- materials whose rights belong to the State Archive;
- third-party restricted materials.

The terms state, among other things:

- service/database elements are protected;
- materials are rights-status dependent;
- public-domain material can be used freely unless otherwise marked;
- materials marked as archive-owned can be reused under applicable public-sector reuse rules without separate licence;
- `Ograniczone Prawa` / `Brak praw` materials require permission;
- descriptions are freely reusable unless otherwise marked.

Therefore Name Atlas must store item-level rights.

Do not infer:

```text
the object is reusable
→ unrestricted crawling of the service database is allowed
```

Reference:

https://www.szukajwarchiwach.gov.pl/warunki-i-regulamin-serwisu

---

# 127. DANE.GOV.PL / PESEL

Use official API/download, not scraping.

For every release store:

```text
dataset terms / reuse conditions
snapshot date
attribution requirements
```

Open/public-sector status does not eliminate:

- source attribution;
- scope caveats;
- privacy obligations for any personal data.

---

# 128. COPYRIGHT / DATABASE RIGHTS DIMENSIONS

Evaluate separately:

```text
FACT
METADATA
DATABASE SELECTION/ARRANGEMENT
TEXT
IMAGE/SCAN
OCR
TRANSCRIPTION
ANNOTATION
DERIVED STATISTIC
```

Example:

```text
public-domain scan
```

does not necessarily mean:

```text
platform database can be bulk-copied
```

and:

```text
open metadata
```

does not mean:

```text
image is open.
```

---

# 129. RIGHTS CHANGE MONITORING

Automate only detection:

```text
terms URL hash changed
terms date changed
rights statement changed
contract approaching expiry
```

Then:

```text
human/legal review
```

No LLM automatically declares commercial permission.

---

# 130. RIGHTS INCIDENT RESPONSE

```text
rights concern
↓
mark source REVIEW_REQUIRED
↓
block new affected surfaces
↓
identify Evidence/Claims/Reports
↓
legal review
↓
remove/replace/relicense
↓
record outcome
```

Do not delete audit/provenance blindly.

---

# 131. HISTORICAL RIGHTS VERSIONING

Every ReportVersion should record:

```text
RightsProfile versions
```

that applied when generated.

A later restriction may require:

- future-generation block;
- access remediation;
- asset removal;
- customer communication;

depending on licence/contract.

> **LEGAL COUNSEL REVIEW REQUIRED**

---

# 132. SOURCE ATTRIBUTION

Attribution is data.

RightsProfile generates:

```text
attribution_text
attribution_url
placement_requirement
logo_requirement
```

UI/report/SEO render automatically.

No hardcoded attribution in scattered components.

---

# 133. NOTICE AND TAKEDOWN

Inbound channels:

```text
copyright/rights owner complaint
living-person privacy complaint
archive/provider complaint
factual dispute
```

Triage determines:

```text
LEGAL
PRIVACY
SOURCE_RIGHTS
FACTUAL_RESEARCH
```

Emergency suppression is reversible and audit-tracked.

---

# 134. THREAT MODEL

Threat actors:

```text
anonymous scraper
credential attacker
payment fraudster
report enumerator
malicious/curious insider
compromised staff account
compromised source/vendor
supply-chain attacker
bot/resource attacker
```

Critical assets:

```text
account/email
orders/entitlements
reports
future family data
source credentials
LLM credentials
rights registry
admin controls
canonical Claims
audit logs
```

---

# 135. ATTACK SURFACES

```text
public search
resolver
SSR pages
REST API
SSE
magic-link redemption
checkout
payment webhook
report download
admin
source connectors
LLM provider
analytics SDK
object storage
CI/CD
```

Threat model reviewed on any major new surface.

---

# 136. SEARCH ABUSE

Controls:

- maximum input bytes/code points;
- Unicode normalization/security checks;
- rate limits;
- run coalescing;
- bot mitigation;
- CDN;
- request timeout;
- source budgets.

Protect upstream providers from abusive fan-out.

---

# 137. REPORT IDOR

P0 security test:

```text
User/session A
requests Report B
```

Expected:

```text
403 / configured concealment response
```

No metadata leak.

This is aligned with OWASP API BOLA risk.

---

# 138. WEBHOOK FORGERY

P0 security test:

- invalid signature;
- old/replayed webhook;
- duplicate payment event;
- modified amount/order reference.

No entitlement without validated event.

---

# 139. FILE / OBJECT STORAGE MISCONFIGURATION

Automated security check:

```text
report bucket not public
raw source private by default
pre-signed expiry bounded
```

Public assets reside in separate bucket/prefix/policy.

---

# 140. SECURITY EVENT TAXONOMY

Not PostHog events.

Examples:

```text
auth_failed
magic_link_requested
magic_link_redeemed
magic_link_invalid

authorization_denied
report_access_denied

rate_limit_triggered

payment_webhook_invalid_signature
payment_webhook_replay

admin_login
admin_role_changed

private_resource_accessed
break_glass_used

secret_rotated
rights_profile_changed
```

---

# 141. SECURITY MONITORING

P0 rule alerts:

```text
many report authorization failures
many magic-link requests for many emails
admin login anomaly
webhook verification failures
source credential failures
large data export
WAF abuse spike
```

No ML anomaly platform required.

---

# 142. VULNERABILITY MANAGEMENT

Process:

```text
discover
↓
triage severity
↓
assign owner
↓
patch/mitigate
↓
verify
↓
release
↓
regression test
```

Critical privacy/auth vulnerabilities can trigger incident process.

---

# 143. SECURITY TESTING

P0 required:

- SAST;
- dependency scan;
- secret scan;
- ASVS L2 checklist mapping;
- auth/authorization tests;
- CSRF;
- XSS;
- SQL injection;
- SSRF;
- rate limiting;
- webhook signatures;
- report storage/access.

Prompt 17 test suite is extended below.

---

# 144. EXTERNAL PENETRATION TEST

Recommendation:

```text
paid surname MVP:
strongly recommended before material scale
```

Mandatory internal security verification before launch.

External pentest becomes effectively required product policy before:

```text
Family Origin with living-person data
```

or large-scale paid operations.

---

# 145. RESPONSIBLE DISCLOSURE

P0/P1:

```text
/.well-known/security.txt
security contact
```

Publish responsible disclosure rules.

Bug bounty can wait.

---

# 146. INCIDENT SEVERITY

## SEV-1 CRITICAL

Examples:

- unauthorized access to multiple private reports/family records;
- payment credentials/security compromise;
- admin takeover;
- signing/encryption key compromise;
- source/vendor incident exposing substantial private data.

## SEV-2 HIGH

- limited private-user exposure;
- magic-link systemic weakness;
- analytics vendor captures prohibited family fields;
- significant rights/compliance incident.

## SEV-3 MEDIUM

- low-scale security flaw without confirmed exposure;
- non-sensitive internal data leak;
- limited abuse.

## SEV-4 LOW

- minor hardening/telemetry issue.

Severity can increase during investigation.

---

# 147. INCIDENT RESPONSE PLAYBOOK

```text
1. Detect
2. Open incident ID
3. Appoint incident commander
4. Contain
5. Preserve evidence
6. Rotate/revoke credentials where needed
7. Determine affected systems/data/subjects
8. Determine ongoing exposure
9. Eradicate root cause
10. Recover
11. Validate security
12. Legal/DPO breach assessment
13. Regulator/data-subject notification if required
14. Customer/source/vendor communication as applicable
15. Postmortem
16. Add regression controls/tests
```

---

# 148. GDPR BREACH NOTIFICATION

GDPR Article 33 requires notification to the competent supervisory authority without undue delay and, where feasible, within 72 hours after awareness unless the breach is unlikely to result in a risk to rights/freedoms.

This does **not** mean every technical incident is a reportable personal-data breach.

Incident workflow must contain:

```text
personal_data_breach?
risk_to_rights?
high_risk?
supervisory_notification?
data_subject_notification?
```

Decision by:

```text
legal/privacy lead / DPO if appointed
```

Document decision even when no notification is made.

---

# 149. INCIDENT CONTACT ROLES

Maintain on-call/current list:

```text
Incident Commander
Engineering Lead
Security Lead
Privacy/DPO contact
Legal Counsel
Product
Customer Communications
Vendor owner
```

No incident plan that depends on finding a lawyer after the event begins.

---

# 150. TABLETOP BEFORE PAID LAUNCH

Minimum scenario:

> Report authorization bug allows one purchaser to open another purchaser's report.

Exercise:

- detection;
- containment;
- logs;
- affected count;
- token invalidation;
- 72-hour decision workflow;
- user communication.

Second scenario:

> PostHog event accidentally contains raw surname/email.

---

# 151. THIRD-PARTY RELATIVES — FUTURE CONTROL GATE

Before Family Origin launches:

```text
Privacy Review
↓
Living-person policy
↓
Article 14 assessment
↓
Lawful-basis/LIA
↓
DPIA screening
↓
retention
↓
DSAR
↓
private workspace
```

No “just add grandparent fields” release.

---

# 152. DPIA

P0 surname-level:

Perform at least a documented DPIA **screening**.

Family/person matching:

likely higher risk and warrants a formal DPIA assessment before launch.

UODO current guidance explicitly emphasizes early assessment where planned processing may create high risk, especially with new technologies.

Potential triggers:

```text
automated person matching
large-scale third-party family data
special-category data
children
systematic profiling
sensitive historical records
new AI inference over people
```

---

# 153. ROPA / PROCESSING INVENTORY

Maintain a Record of Processing Activities-style registry even if a formal exemption might arguably apply.

Reason:

Name Atlas processing is not a one-off incidental activity and later family research is complex.

Fields:

```text
processing_id
purpose
controller

data_subjects
data_categories

lawful_basis_candidate

processors
transfers

retention

security controls
owner

DPIA status
review date
```

---

# 154. PRIVACY REVIEW GATE

Required if feature:

```text
collects new personal field
creates new user-person association
adds vendor
adds new analytics property
changes retention
shares data
uses family info
adds person matching
adds replay/recording
```

---

# 155. SECURITY REVIEW GATE

Required for:

```text
authentication
authorization
payments
uploads
private report
admin
public API
family workspace
new webhook
new source credential
```

---

# 156. LEGAL REVIEW GATE

Required for:

```text
unclear source rights
new genealogy provider
person-level living data
special-category data
new country
new payment/refund model
marketing tracking
session replay
automated scraping
human genealogist partnership
```

---

# 157. CONSUMER PROTECTION PRINCIPLES

Premium Name Atlas offer states accurately:

- one-time price;
- what is included;
- what data were actually found;
- variability by surname;
- delivery/generation status;
- known limits;
- refund/withdrawal terms.

No:

```text
"complete family history"
```

for surname report.

---

# 158. DIGITAL CONTENT / SERVICE CLASSIFICATION

Name Atlas report may have elements of:

- digital content;
- digital service;
- personalized/generated output.

Do **not** assume the legal withdrawal exception simply because the report is customized.

UOKiK indicates that for paid digital content supplied without tangible medium, loss of withdrawal rights depends on conditions including:

- prior express consent to start delivery before the period ends;
- information/acknowledgment of loss of right;
- confirmation on a durable medium.

Services have related but distinct rules.

Prompt 20 must implement checkout only after:

> **POLISH CONSUMER-LAW COUNSEL CONFIRMS CLASSIFICATION AND COPY.**

---

# 159. CONFORMITY / REPORT QUALITY

Directive 2019/770 includes conformity/remedy concepts for digital content/services.

This reinforces Name Atlas's existing architecture:

```text
offer description
DiscoveryIndex
report output
```

must align.

A misleading preview can create both product-trust and consumer-law risk.

---

# 160. WITHDRAWAL / REFUND

Prompt 20 must distinguish:

```text
statutory withdrawal
lack-of-conformity remedies
voluntary refund policy
technical delivery failure
```

These are not one “refund policy”.

---

# 161. CHECKOUT DATA

P0 collect only:

```text
email
payment-provider-required data
invoice data only if requested/required
```

Do not collect:

- family DOB;
- home address unless provider/tax/invoice truly requires it;
- account password.

---

# 162. PRICE TRANSPARENCY

Before payment:

```text
total payable price
currency
one-time nature
tax/VAT treatment as legally required
product scope
```

No surprise recurring billing.

---

# 163. TERMS OF SERVICE — REQUIRED TOPICS

Final legal drafting later, but scope:

- service description;
- free vs premium;
- evidence/uncertainty;
- surname ≠ family;
- no guarantee of ancestry;
- availability;
- account/magic links;
- payments;
- consumer rights;
- acceptable use;
- source/IP rights;
- user content later;
- liability;
- complaint/dispute;
- governing law.

---

# 164. PRIVACY NOTICE

Must match actual flows.

Include:

- controller;
- contact/DPO if applicable;
- data categories;
- sources;
- purposes;
- lawful bases;
- legitimate interests where used;
- processors;
- transfers;
- retention;
- rights;
- complaints to supervisory authority;
- indirect data / Article 14 later;
- profiling/automated decisions;
- cookies/analytics link.

---

# 165. COOKIE / TRACKING NOTICE

Generate from actual registry.

Do not list:

- Facebook Pixel;
- session replay;

if they are not used.

Consent UI reflects:

```text
Analytics
Experiments
Marketing
Replay if ever
```

according to final counsel/CMP design.

---

# 166. NO DARK PATTERNS IN CONSENT

Consent UI:

- reject available;
- accept and reject similarly clear;
- no pre-checked analytics;
- no misleading color hierarchy intended to coerce;
- category descriptions clear.

Consent record stores real choice.

---

# 167. SOURCE TERMS / ATTRIBUTION IN PRODUCT

If source requires:

- attribution;
- link;
- logo;
- wording;

RightsProfile automatically supplies it.

A/B experiments cannot remove legally required attribution.

---

# 168. ABUSE / MISUSE POLICY

Prohibit:

- doxxing;
- stalking;
- living-person lookup abuse;
- using surname to assert ethnicity/religion;
- discrimination;
- mass harvesting;
- unauthorized source copying;
- misuse of private family data.

Enforce via ToS + technical controls.

---

# 169. LIVING-PERSON SEARCH POLICY

Before dedicated legal design:

```text
Name Atlas is not a general living-person locator.
```

Deep genealogy focuses on historical/deceased research, with conservative treatment of unknown living status.

---

# 170. MINORS

P0 free surname content can be broadly accessible.

Paid contracting/account age policy needs legal review.

Future family data about minors:

```text
SENSITIVE_PERSONAL
```

by product policy, regardless of exact GDPR classification.

Default:

- private;
- no analytics;
- no sharing;
- avoid unless necessary.

---

# 171. AGE POLICY

Candidate P0 simplification:

```text
free public browsing: general audience
paid purchase/account: adult purchaser policy
```

but final age/contract rule:

> **LEGAL COUNSEL REVIEW REQUIRED**

Do not hardcode an 18+ requirement solely from technical preference.

---

# 172. FAMILY WORKSPACE — FUTURE

Model:

```text
FamilyWorkspace
├── owner
├── members
├── FamilyPersons
├── research cases
└── private reports
```

Default:

```text
owner only
```

Sharing P1 with invitation/roles.

No public “family tree URL”.

---

# 173. FAMILY SHARING

If later:

- explicit invite;
- named recipient;
- role;
- revocation;
- audit;
- data minimization.

Public link sharing is not default.

---

# 174. HUMAN GENEALOGIST HANDOFF

Research packet contains only necessary case data.

Track:

```text
researcher
assignment
purpose
expires
download/export
```

No full user account.

Contractual confidentiality and privacy role reviewed.

---

# 175. PROCESSOR VS CONTROLLER FOR RESEARCHERS

A professional genealogist may be:

- processor;
- separate controller;
- joint controller;

depending on actual autonomy/contract.

Do not label automatically.

> **LEGAL COUNSEL REVIEW REQUIRED**

---

# 176. ARCHIVE CORRESPONDENCE

If Name Atlas/researcher sends personal data to an archive:

- purpose documented;
- minimum fields;
- user expectations disclosed;
- transfer/vendor/recipient recorded where needed.

---

# 177. AUTOMATED DECISION-MAKING

P0 does not make decisions that produce legal or similarly significant effects about a user.

Confidence/origin classification is informational surname research.

Do not build high-impact profiling from surname.

---

# 178. DISCRIMINATION POLICY

Prohibited product use of surname/family inference for:

```text
price personalization
credit/eligibility
employment
insurance
housing
political targeting
ethnic targeting
```

Name Atlas exists for consumer research, not decisioning about people.

---

# 179. PRIVACY TESTS — P0

Add to Prompt 17:

```text
PRV-001 generic analytics rejects raw surname
PRV-002 generic analytics rejects email
PRV-003 generic analytics rejects FamilyPerson fields
PRV-004 Session Replay disabled
PRV-005 PostHog autocapture disabled
PRV-006 nonessential analytics disabled before consent
PRV-007 withdrawal stops analytics capture
PRV-008 consent version recorded
PRV-009 private report has no public cache
PRV-010 public surname profile contains no visitor ID
PRV-011 DSAR deletes active account data
PRV-012 deletion does not delete public surname knowledge
PRV-013 private family future routes NOINDEX
PRV-014 magic token absent from analytics
PRV-015 source/LLM payload minimizes private fields
```

---

# 180. SECURITY TESTS — P0

```text
SEC-001 report IDOR
SEC-002 entitlement bypass
SEC-003 magic token tamper
SEC-004 magic token replay
SEC-005 CSRF
SEC-006 XSS LLM narrative
SEC-007 XSS source metadata
SEC-008 SQL injection surname
SEC-009 SSRF connector
SEC-010 rate limiting
SEC-011 source secret leak
SEC-012 admin authorization
SEC-013 webhook invalid signature
SEC-014 webhook replay
SEC-015 public cache private content
SEC-016 object storage public report
SEC-017 Redis private payload
SEC-018 auth cookie configuration
SEC-019 CSP smoke
SEC-020 audit private staff access
```

---

# 181. LEGAL / RIGHTS TESTS — P0

```text
LEG-001 commercial UNKNOWN blocks paid surface
LEG-002 image blocked while metadata allowed
LEG-003 attribution rendered
LEG-004 rights version captured in report
LEG-005 rights expiry invalidates future surface
LEG-006 blocked source connector disabled
LEG-007 terms change creates review task
LEG-008 public-domain asset remains source-attributed as required
LEG-009 restricted archive image not reproduced
LEG-010 DiscoveryIndex excludes rights-blocked paid inventory
```

---

# 182. RELEASE PRIVACY CHECKLIST

Before launch:

```text
[ ] data map current
[ ] processing registry current
[ ] privacy classes implemented
[ ] public/private cache tests pass

[ ] cookie/storage registry complete
[ ] CMP/consent behavior counsel-reviewed
[ ] analytics consent tested
[ ] Session Replay OFF
[ ] PostHog DPA signed
[ ] PostHog Product/Model Development opt-out applied

[ ] privacy notice matches system
[ ] DSAR workflow exists
[ ] deletion runbook tested
[ ] processor register exists
[ ] transfer review exists

[ ] DPIA screening documented
```

---

# 183. RELEASE SECURITY CHECKLIST

```text
[ ] ASVS 5.0 L2 requirement set selected/mapped
[ ] threat model reviewed
[ ] TLS/security headers
[ ] CSP

[ ] authorization tests
[ ] report IDOR tests
[ ] magic-link tests
[ ] CSRF
[ ] rate limits

[ ] webhook verification
[ ] private buckets
[ ] secrets manager
[ ] key rotation plan

[ ] dependency/SAST/secret scans
[ ] backup restore tested
[ ] incident contacts
[ ] tabletop completed

[ ] admin MFA/roles/audit
```

---

# 184. SOURCE LICENSING CHECKLIST

```text
[ ] Official source owner identified
[ ] Official access method identified
[ ] Terms captured
[ ] Terms/version date captured

[ ] commercial use
[ ] automated access
[ ] database extraction
[ ] metadata reuse
[ ] raw caching
[ ] derived caching
[ ] redistribution
[ ] image reproduction
[ ] transcription
[ ] AI processing

[ ] attribution
[ ] rate limits
[ ] personal-data implications

[ ] review owner
[ ] next review
[ ] contract expiry

[ ] paid surface eligibility
[ ] SEO eligibility
[ ] share eligibility
```

Any unknown material dimension:

```text
fail closed for that surface
```

---

# 185. VENDOR REVIEW CHECKLIST

```text
[ ] Controller/processor role
[ ] DPA
[ ] data categories
[ ] data subjects
[ ] region
[ ] subprocessors
[ ] transfers/SCC/adequacy
[ ] security certifications/controls

[ ] retention
[ ] deletion/DSAR
[ ] breach obligations
[ ] product/model training/use
[ ] opt-outs

[ ] API credentials
[ ] incident contact
[ ] offboarding
```

---

# 186. INCIDENT RESPONSE CHECKLIST

When incident opens:

```text
[ ] Incident ID / severity
[ ] Commander
[ ] Timeline start
[ ] Containment
[ ] Credentials rotated if needed

[ ] Personal data involved?
[ ] Family/sensitive data?
[ ] Approx subjects/records
[ ] Jurisdictions

[ ] Breach notification timer started?
[ ] Legal/DPO involved
[ ] Vendor notified/engaged

[ ] Evidence preserved
[ ] Root cause
[ ] Fix validated
[ ] Users/regulator/source notified if required

[ ] Postmortem
[ ] Prompt 17 regression test added
```

---

# 187. P0 PRIVACY CONTROLS — FINAL

Launch baseline:

1. anonymous free surname search;
2. no email before purchase;
3. no family-person data collected;
4. raw surname absent from generic analytics;
5. client analytics/experiments consent-gated under conservative PL/EEA launch design;
6. Session Replay off;
7. PostHog autocapture off;
8. analytics EU region;
9. public surname cache has no user association;
10. premium report private;
11. email/account data private;
12. consent version stored;
13. DSAR/deletion workflow;
14. processor/data map;
15. DPIA screening;
16. no sensitive identity inference from surname.

---

# 188. P0 SECURITY CONTROLS — FINAL

1. ASVS 5.0 Level 2 target.
2. TLS.
3. secure HttpOnly session cookies.
4. SameSite/CSRF controls.
5. server-side authorization.
6. magic-link high entropy + expiry + hashed storage.
7. report IDOR protection.
8. WAF/rate limiting.
9. parameterized DB access.
10. connector SSRF protection.
11. strict content rendering/CSP.
12. secrets manager.
13. private object storage.
14. encrypted DB/storage/backups.
15. payment hosted/tokenized; no raw card data.
16. webhook signature/idempotency.
17. staff MFA/SSO.
18. privileged audit log.
19. dependency/SAST/secret scanning.
20. incident response + tested restore.

---

# 189. P0 LEGAL / LICENSING OPS — FINAL

1. RightsProfile required before source activation.
2. `UNKNOWN` fails closed for commercial surface.
3. no unauthorized scraping.
4. source terms/version archived.
5. attribution automated.
6. rights change triggers surface invalidation.
7. IJP partnership/licence before production ingestion.
8. PTG/Geneteka partnership before bulk integration.
9. Szukaj w Archiwach item-level rights respected.
10. public/open data still source/version scoped.
11. privacy notice.
12. cookie/consent notice.
13. Terms of Service.
14. consumer checkout disclosures.
15. digital-content/service classification reviewed by counsel.
16. processor/vendor register.
17. notice/takedown process.
18. legal/privacy review for country expansion.

---

# 190. P1 FAMILY-RESEARCH CONTROLS

Before Family Origin:

```text
[ ] formal privacy review
[ ] DPIA assessment
[ ] living-status model
[ ] Article 14 process
[ ] lawful basis / LIA
[ ] FamilyWorkspace
[ ] encrypted private storage
[ ] dedicated retention/delete/export
[ ] private analytics exclusion
[ ] LLM private-data configuration
[ ] staff/researcher case access
[ ] minor/sensitive-data policy
[ ] third-party data notice architecture
```

Before Deep Research:

add:

```text
person matching risk assessment
candidate-record privacy
archive personal-data terms
genealogist access/audit
sensitive-record controls
```

---

# 191. DO NOT BUILD YET

Do not launch:

- public family trees;
- DNA;
- ethnicity/religion personalization;
- living-person finder;
- session replay;
- behavioral personalized pricing;
- sensitive family analytics;
- broad family sharing links;
- automated legal terms interpretation;
- arbitrary source crawling;
- marketing retargeting based on genealogy;
- full SIEM if basic security monitoring is sufficient;
- complex enterprise IAM before operational need.

---

# 192. TOP 20 PRIVACY RISKS

1. Public cache includes user-family association.
2. Raw surname linked to analytics identity unnecessarily.
3. Session Replay captures surname/family input.
4. Email captured in PostHog/error logs.
5. Family-person data sent to LLM without minimization.
6. Living relative stored indefinitely.
7. Article 14 obligations ignored.
8. Family pages accidentally indexable.
9. Private report cached by CDN.
10. Magic token leaked through referrer/analytics.
11. Analytics IDs merged incorrectly after consent withdrawal.
12. PostHog Product/Model Development left enabled unintentionally.
13. Private family fields copied into support tooling.
14. Staff can browse arbitrary family workspaces.
15. Backup deletion process undefined.
16. Third-party processors retain data after user deletion.
17. Sensitive historical facts surfaced publicly.
18. Children's data collected without dedicated policy.
19. Family research reused for marketing.
20. Country expansion assumes Polish/EU privacy rules apply everywhere.

---

# 193. TOP 20 SECURITY RISKS

1. Report IDOR.
2. Entitlement bypass.
3. Magic-link theft/replay.
4. Admin account compromise.
5. Payment webhook forgery.
6. Source API credential leak.
7. LLM/provider key leak.
8. XSS from source content.
9. XSS from generated content.
10. Connector SSRF.
11. SQL injection/search-input bug.
12. Public object-storage report.
13. Redis/queue containing private payload.
14. Supply-chain dependency compromise.
15. CI secret exposure.
16. CSRF on account/delete/entitlement.
17. Weak rate limiting/resource exhaustion.
18. Staff overprivilege.
19. Missing/insufficient audit trail.
20. Backup/restore failure or insecure backups.

---

# 194. TOP 20 LEGAL / LICENSING RISKS

1. Treating public web access as commercial permission.
2. Treating robots.txt as licence.
3. EU database rights ignored.
4. ISNP scraped without licence.
5. Geneteka bulk extraction without PTG agreement.
6. Restricted archive image reproduced.
7. Open metadata confused with open object.
8. Required attribution omitted.
9. Expired/source-changed contract still used.
10. Rights state not versioned in report.
11. Living-person data copied from archive without lawful-basis review.
12. Third-party relative Article 14 obligations ignored.
13. Special-category data inferred/processed.
14. Analytics/cookie consent incorrectly implemented.
15. Session Replay enabled without privacy/legal gate.
16. Non-EEA vendor transfer not reviewed.
17. Personalized report incorrectly assumed to have no withdrawal rights.
18. Digital-content conformity obligations ignored.
19. Marketing email sent from transactional email collection without basis.
20. Country expansion without local privacy/consumer/source-rights review.

---

# 195. MODEL CHANGE PROPOSALS — FINAL

## 19-A — Expand `PrivacyClass`

```text
PUBLIC
INTERNAL_NON_PERSONAL
USER_PRIVATE
FAMILY_PRIVATE
SENSITIVE_PERSONAL
```

**Accept before Family Origin.**

## 19-B — `ConsentRecord`

P0.

## 19-C — `AuditEvent`

P0 for privileged operations.

## 19-D — `LivingStatus`

```text
UNKNOWN
LIVING
DECEASED
```

P1 before Family Origin.

## 19-E — `LegalHold`

P1 operational/legal support.

No other core truth-layer changes required.

---

# 196. DECISION REGISTER

## Public/private split

**Decision:** surname public domain and family private workspace are separate.  
**Risk:** future features accidentally join them.  
**Control:** explicit PrivacyClass + separate caches/routes.

## Analytics consent

**Decision:** conservative consent-gated client analytics/experimentation for PL/EEA launch.  
**Alternative:** legitimate-interest/cookieless designs.  
**Why:** PKE terminal-access complexity + behavioral data.  
**Follow-up:** counsel/CMP review.  
**Legal review:** YES.

## Session Replay

**Decision:** OFF P0.

## PostHog

**Decision:** EU Cloud only after DPA and model-development opt-out.

## Raw surname analytics

**Decision:** not sent by default.

## Family data

**Decision:** no collection in P0 Name Report.

## Unknown living status

**Decision:** protect as living.

## Authentication

**Decision:** anonymous free, email/magic link premium, optional account.

## Passwords

**Decision:** do not introduce P0.

## Security standard

**Decision:** ASVS 5.0 Level 2.

## Payments

**Decision:** outsource raw card handling.

## Source scraping

**Decision:** deny by default; explicit approval only.

## IJP

**Decision:** partnership/licence required.

## PTG

**Decision:** partnership/licence required.

## LLM private data

**Decision:** separate high-risk review/configuration before Family.

## Consumer withdrawal

**Decision:** Prompt 20 must implement only counsel-approved digital-content/service flow.

---

# 197. INPUTS REQUIRED BY PROMPT 20

Prompt 20 — Payments / Report Delivery / Entitlements — must consume these rules.

## Checkout privacy

```text
email only for delivery/recovery
no forced account
minimal invoice fields
```

## Payment

```text
provider-hosted/tokenized
no raw card storage
PCI scope confirmed with provider/acquirer
```

## Consumer law

```text
product classification reviewed
withdrawal consent/acknowledgment flow if legally appropriate
durable-medium confirmation
conformity/refund distinction
total price transparency
one-time payment disclosure
```

## Entitlement

```text
server canonical
payment webhook verified
report ID never authorization
```

## Report access

```text
magic link exchange
secure session
private object
signed download URL
```

## Security

```text
idempotency
webhook replay
authorization
audit
```

## Retention

```text
orders follow legal retention
email/account follows product/privacy policy
reports private
```

---

# 198. DEFINITION OF PRIVACY / SECURITY READY

Name Atlas is ready for the paid surname MVP when:

### Privacy

- public surname and private user data are separated;
- no family data is required;
- privacy/data inventory exists;
- P0 lawful-basis matrix has counsel review;
- consent/CMP behavior is approved;
- raw surname is absent from generic analytics;
- Session Replay is off;
- PostHog EU/DPA/settings pass;
- deletion and DSAR workflow exist;
- privacy notice matches actual architecture;
- DPIA screening is documented.

### Security

- ASVS Level 2 subset/requirements are mapped and verified;
- server authorization protects reports;
- magic links are secure;
- CSRF/CORS/CSP are configured;
- webhook validation exists;
- payment raw card data is outsourced;
- secrets manager exists;
- source keys are server-only;
- object storage is private;
- backups are encrypted/tested;
- staff uses MFA/SSO;
- privileged access is audited;
- incident playbook/tabletop completed;
- Prompt 17 P0 security tests pass.

### Legal/source ops

- every P0 source has approved RightsProfile;
- IJP/Geneteka are not scraped without agreement;
- item-level archival rights are preserved;
- attribution works;
- rights updates can block surfaces;
- terms/vendor/processor registers exist;
- Terms/Privacy/Cookie docs are ready;
- consumer checkout/report classification has counsel signoff;
- Prompt 20 can implement commerce without changing privacy fundamentals.

---

# 199. CURRENT AUTHORITATIVE REFERENCE INDEX

## GDPR / EDPB / UODO

- GDPR — https://eur-lex.europa.eu/eli/reg/2016/679/oj
- EDPB Privacy by Design — https://www.edpb.europa.eu/documents/guideline/guidelines-42019-on-article-25-data-protection-by-design-and-by-default_en
- EDPB Consent — https://www.edpb.europa.eu/documents/guideline/guidelines-052020-on-consent-under-regulation-2016679_en
- UODO DPIA guidance — https://uodo.gov.pl/pl/598/3617

## Polish cookies / electronic communications

- Prawo komunikacji elektronicznej — https://isap.sejm.gov.pl/isap.nsf/download.xsp/WDU20240001221/O/D20241221.pdf

## Consumer protection

- UOKiK withdrawal — https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/
- UOKiK special/digital contracts — https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/
- Directive 2019/770 — https://eur-lex.europa.eu/eli/dir/2019/770/oj

## Security

- OWASP ASVS — https://owasp.org/projects/asvs
- OWASP Top 10:2025 — https://top10.owasp.org/2025/
- OWASP API Security 2023 — https://api-security.owasp.org/editions/2023/en/0x11-t10/
- PCI SSC — https://www.pcisecuritystandards.org/

## Vendors

- PostHog Privacy docs — https://posthog.com/docs/privacy
- PostHog Privacy Policy — https://posthog.com/privacy
- PostHog storage/deletion — https://posthog.com/docs/privacy/data-storage
- PostHog replay privacy — https://posthog.com/docs/session-replay/privacy
- OpenAI business data — https://openai.com/business-data/
- OpenAI DPA — https://openai.com/policies/data-processing-addendum/
- OpenAI subprocessors — https://openai.com/policies/sub-processor-list/

## Archive/source rights

- Szukaj w Archiwach terms — https://www.szukajwarchiwach.gov.pl/warunki-i-regulamin-serwisu
- ISNP — https://nazwiska.ijppan.pl/

---

# 200. FINAL RECOMMENDATION

The Name Atlas privacy/security architecture should remain deliberately asymmetric:

```text
PUBLIC SURNAME KNOWLEDGE
= reusable, shared, cacheable
```

while:

```text
USER ASSOCIATION
FAMILY CONTEXT
PERSON RESEARCH
= minimal, private, scoped, expiring and audited
```

The product should not wait until Family Origin to build privacy foundations.

The paid surname MVP already introduces:

- email;
- entitlement;
- private reports;
- analytics identity;
- payment processors;
- vendor relationships;
- access-control risks.

Therefore Prompt 19 is a launch dependency, not future compliance work.

The core operational rule is:

> **Name Atlas should retain public knowledge because it improves the product, but retain private people-data only because a defined service requires it, for only as long as that purpose and law justify.**

And the core source-rights rule remains:

> **A source being useful, publicly accessible or technically scrapeable is never enough to make it production-approved.**

Privacy, security and legal operations become part of the same evidence-first philosophy that governs Claims:

```text
KNOW WHAT THE DATA IS
KNOW WHY WE HAVE IT
KNOW WHERE IT CAME FROM
KNOW WHAT RIGHTS APPLY
KNOW WHO MAY ACCESS IT
KNOW WHEN IT MUST GO
```
