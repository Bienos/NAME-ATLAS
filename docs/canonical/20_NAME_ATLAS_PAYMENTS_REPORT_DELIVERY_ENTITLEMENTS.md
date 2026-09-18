# NAME ATLAS — PAYMENTS / REPORT DELIVERY / ENTITLEMENTS

**Document:** 20. Payments / Report Delivery / Entitlements  
**Version:** 1.0.0 — Paid-MVP Commerce Baseline  
**Research snapshot:** 17 September 2026  
**Initial market:** Poland  
**Initial currency:** PLN  
**Initial product:** `FULL_SURNAME_REPORT`  
**Status:** Candidate implementation specification; payment-provider, legal and tax sign-off required before production  
**Depends on:** Documents 10–19  
**Next:** `21_NAME_ATLAS_SEO_PROGRAMMATIC_ACQUISITION.md`

---

# 0. PURPOSE, AUTHORITY AND COMMERCE PHILOSOPHY

This document converts Name Atlas's evidence, runtime, API, analytics and legal architecture into a safe one-time digital-commerce system.

It answers:

> **How does an eligible surname result become a truthful Offer, how is payment securely verified, when is an Entitlement granted, how is a report fulfilled and delivered, and what happens when any part of the chain fails?**

The commerce layer is deliberately downstream from the truth layer.

It may sell:

```text
a report that already has a validated scope
```

It may never manufacture:

```text
premium eligibility
historical evidence
report inventory
confidence
```

Commerce consumes:

```text
PremiumEligibility
DiscoveryIndex
CoverageAssessment
SurfaceEligibility
```

and produces:

```text
Offer
Order
PaymentAttempt
Entitlement
Report access
Refund
Commerce reconciliation
```

The hard invariant is:

```text
TRUTH LAYER
determines
WHAT CAN BE SOLD

COMMERCE LAYER
determines
HOW IT IS SOLD AND DELIVERED
```

---

# 1. EXECUTIVE DECISIONS

The P0 implementation should use:

> **Stripe as Payment Service Provider, Stripe-hosted Checkout, one-time PLN payment, guest checkout, BLIK/cards/Apple Pay/Google Pay/Przelewy24 as available through Stripe, server-verified webhooks, email-backed CustomerIdentity, durable Entitlement, and secure magic-link-to-session report access.**

Additional decisions:

1. **Name Atlas remains the merchant in P0.**
2. **Do not use a Merchant of Record in the Poland-first MVP.**
3. **Stripe-hosted Checkout is preferred over merchant-hosted card fields.**
4. **Raw PAN/CVC never enters Name Atlas.**
5. **Browser redirect is not payment proof.**
6. **A verified server-side payment event is required before Entitlement creation.**
7. **Order, PaymentAttempt, Entitlement and Report are separate domain concepts.**
8. **Payment success survives report-generation failure.**
9. **A report worker failure never asks a paid user to buy again.**
10. **Checkout begins only after `PremiumEligibility = ELIGIBLE`.**
11. **The checkout freezes the exact Offer and report promise.**
12. **`PurchasePromiseSnapshot` is P0.**
13. **Price is server configuration/experiment state, never a hardcoded frontend constant.**
14. **No subscription or automatic renewal in P0.**
15. **No forced account creation.**
16. **Email is collected for report delivery/recovery, not automatically for marketing.**
17. **Magic links are short-lived single-use authentication exchanges, not permanent bearer links to reports.**
18. **Entitlement normally has no arbitrary expiry; sessions/tokens expire.**
19. **ReportVersion is immutable.**
20. **Receipt email and report-ready email are separate events.**
21. **Resend is the recommended P0 transactional-email provider; SES is the migration alternative if regional/data-residency or scale economics dominate.**
22. **KSeF integration is not required merely for ordinary P0 B2C consumer invoices; B2B/invoice expansion requires accountant review.**
23. **VAT/OSS classification is not hardcoded until Polish/EU tax adviser sign-off.**
24. **Consumer withdrawal/early-performance flow is implemented only after counsel confirms Name Atlas's digital-content/service classification.**
25. **Daily provider reconciliation is part of P0, not a later finance feature.**

---

# 2. CURRENT PAYMENT-PROVIDER RESEARCH — 2026-09-17

Vendor pricing and product availability change. This section is a research snapshot, not a permanent price contract.

## 2.1 Stripe — recommended P0

Current official Poland pricing includes:

```text
standard EEA cards        1.5% + 1.00 PLN
premium EEA cards         1.9% + 1.00 PLN
BLIK                      1.6% + 1.00 PLN
Przelewy24                1.9% + 1.00 PLN
```

Stripe supports:

- BLIK;
- Przelewy24;
- cards;
- Apple Pay;
- Google Pay;
- hosted Checkout;
- refunds;
- disputes;
- webhooks;
- global expansion.

Official references:

https://stripe.com/en-pl/pricing

https://stripe.com/en-pl/pricing/local-payment-methods

https://docs.stripe.com/payments/checkout

### P0 assessment

**Strongest overall fit.**

Not necessarily the cheapest Polish-local processor, but it offers the best balance of:

```text
Polish methods
global readiness
API quality
Checkout
webhooks
refunds
fraud tooling
future multi-market support
```

---

# 3. MOLLIE — STRONG SECOND CHOICE

Current Polish pricing snapshot:

```text
domestic consumer Visa/Mastercard  1.20% + 1 PLN
EEA consumer cards                  1.80% + 1 PLN
BLIK                                1.30% + 0.50 PLN
Przelewy24                          1.90% + 1 PLN
Apple Pay / Google Pay              underlying-card rate
```

Mollie supports:

- BLIK;
- P24;
- cards;
- Apple Pay;
- Google Pay;
- hosted checkout;
- full/partial BLIK refunds.

Official:

https://www.mollie.com/pl/pricing

https://www.mollie.com/pl/payments/payment-methods

### Assessment

For a low-ticket Poland-only product, Mollie's current BLIK economics are attractive.

Use as the first migration/fallback candidate if:

- Stripe conversion materially underperforms;
- BLIK economics dominate;
- operational support favors Mollie.

Do not integrate both at launch.

---

# 4. PAYU

PayU offers strong Polish local-payment support, including:

- BLIK;
- cards;
- Apple Pay;
- Google Pay;
- Polish online-bank flows.

However, public standardized pricing was not sufficiently clear in the current official research to make a clean like-for-like cost decision.

### Assessment

Strong local-market option if Name Atlas obtains commercial terms materially better than Stripe/Mollie.

Not selected for P0 because:

- global expansion architecture matters;
- Stripe's public integration surface is simpler to standardize against;
- Name Atlas should avoid provider negotiation dependency before first vertical launch.

---

# 5. ADYEN

Adyen supports:

- BLIK;
- Apple Pay;
- Google Pay;
- cards;
- Polish bank methods;
- enterprise-grade risk/settlement.

### Assessment

Operationally strong but overpowered for a Poland-first low-ticket consumer MVP.

Re-evaluate when:

- payment volume is large;
- multi-market enterprise acquiring optimization matters;
- sophisticated local acquiring/routing creates measurable upside.

---

# 6. PADDLE / MERCHANT OF RECORD

Current Paddle standard MoR pricing is approximately:

```text
5% + $0.50 per checkout
```

with global tax/compliance/fraud/chargeback responsibilities included.

It supports one-time digital products and local methods including BLIK in relevant markets.

### Assessment

MoR simplicity is attractive globally, but for a low-ticket PLN report the fixed/percentage economics are comparatively expensive.

Paddle also notes businesses selling products below roughly $10 should contact sales, making standard public economics less straightforward for a 29 PLN-class product.

**Not P0.**

---

# 7. STRIPE MANAGED PAYMENTS / MoR

Stripe's current Managed Payments offering can take on merchant-of-record responsibilities, but adds an additional fee on top of standard processing.

### Assessment

Potential future global expansion option.

Not P0 because:

- Name Atlas launches in one primary market;
- economics matter on low-priced reports;
- tax/compliance complexity is still manageable with professional advice;
- retaining merchant control is useful initially.

---

# 8. PSP VS MERCHANT OF RECORD — DECISION

## PSP P0

Name Atlas remains seller/merchant.

Responsibilities include:

```text
product
consumer contract
VAT/tax
refund policy
invoicing/accounting
customer support
```

Stripe processes payment.

## MoR later

Provider takes broader merchant/tax responsibility.

### Decision

```text
P0 = PSP
```

Revisit MoR when:

- selling materially across many jurisdictions;
- OSS/global tax operations become expensive;
- transaction volume absorbs higher MoR fees;
- finance/legal ops outweigh control/economics.

---

# 9. PAYMENT METHODS — POLAND P0

Recommended provider-enabled set:

```text
BLIK
Apple Pay
Google Pay
Visa/Mastercard
Przelewy24
```

Do not force every method to appear for every device.

Stripe Checkout can dynamically show relevant methods.

## Priority

For Polish mobile:

```text
BLIK
wallets where device supports
card
P24
```

But let provider eligibility/device logic render methods rather than building a manually fixed ordering that breaks device support.

---

# 10. HOSTED CHECKOUT — DECISION

Use:

```text
Name Atlas pre-checkout
↓
Stripe-hosted Checkout
↓
Name Atlas return page
```

Do not render raw card fields inside Name Atlas P0.

Advantages:

- lower payment-page security complexity;
- faster integration;
- provider handles payment-method UI;
- local method support;
- easier wallets;
- fewer PCI-sensitive frontend components.

Trade-off:

- checkout is less visually bespoke;
- legal disclosures must be coordinated between Name Atlas pre-checkout and Stripe-hosted page.

Accept this trade-off for P0.

---

# 11. PCI BOUNDARY

Name Atlas should never receive/store:

```text
PAN
CVC
full card credentials
```

Hosted redirect materially reduces PCI scope.

However:

> **Hosted Checkout does not make the merchant “PCI-free.”**

PCI SSC's current SAQ A guidance still contains merchant eligibility/security requirements, including current e-commerce requirements and external vulnerability scanning considerations.

Exact validation scope must be confirmed with:

```text
Stripe / acquirer / PCI adviser where needed
```

Official:

https://www.pcisecuritystandards.org/

---

# 12. COMMERCE DOMAIN BOUNDARIES

```text
Offer Service
Checkout Service
Payment Provider Adapter
Order Service
Entitlement Service
Report Fulfillment
Delivery Service
Access / Magic Link
Refund Service
Reconciliation
Support Commerce Tools
```

No one component owns everything.

---

# 13. OFFER SERVICE

## Inputs

```text
surname_id
PremiumEligibility
DiscoveryIndex
CoverageAssessment
SurfaceEligibility
market
experiment assignment
```

## Output

```text
Offer
```

## Responsibilities

- ensure eligible;
- choose active product/price;
- bind currency;
- bind offer version;
- bind experiment variant;
- expose product scope.

## Must not

- change DiscoveryIndex;
- infer premium eligibility;
- fabricate locked content.

---

# 14. CHECKOUT SERVICE

Responsibilities:

```text
validate Offer
validate surname/resource
create OfferSnapshot
create Order
create provider CheckoutSession
preserve Idempotency-Key
```

It does not grant Entitlement.

---

# 15. PAYMENT PROVIDER ADAPTER

Interface:

```ts
interface PaymentProvider {
  createCheckout(input: CreateCheckoutInput): Promise<ProviderCheckout>;
  parseWebhook(raw: RawWebhookRequest): Promise<VerifiedProviderEvent>;
  getPaymentStatus(providerPaymentId: string): Promise<ProviderPaymentStatus>;
  createRefund(input: RefundInput): Promise<ProviderRefund>;
}
```

Provider-specific Stripe enums do not leak into domain state.

---

# 16. ORDER SERVICE

Canonical record of commerce transaction intent/state.

Responsibilities:

- freeze what user agreed to purchase;
- track payment state;
- connect refunds;
- connect entitlement grants;
- support reconciliation;
- preserve legal/offer versions.

---

# 17. ENTITLEMENT SERVICE

Answers:

> **What paid resource is this verified customer identity allowed to access?**

It owns:

- grant;
- revoke;
- refund/chargeback effects;
- account linking;
- authorization queries.

It does not own Report content.

---

# 18. REPORT FULFILLMENT

Consumes:

```text
Entitlement
PurchasePromiseSnapshot
validated report inputs
```

Invokes runtime from Prompt 15.

It does not process payments.

---

# 19. DELIVERY SERVICE

Owns:

- purchase receipt;
- report-ready notification;
- access email;
- refund confirmation;
- delivery status.

It does not define entitlement.

---

# 20. ACCESS / MAGIC LINK SERVICE

Owns:

- token creation;
- token exchange;
- session creation;
- access recovery;
- email change verification.

---

# 21. REFUND SERVICE

Owns:

- refund request state;
- provider refund;
- entitlement effect;
- finance event;
- customer notification.

---

# 22. RECONCILIATION

Owns:

```text
Order DB
↔ Provider
↔ Refunds
↔ settlement/accounting export
```

No product analytics system substitutes for reconciliation.

---

# 23. P0 PRODUCT MODEL

```text
ProductType = FULL_SURNAME_REPORT
```

Characteristics:

```text
ONE_TIME
DIGITAL
SURNAME_LEVEL
NO_RENEWAL
```

Future enum capacity:

```text
FAMILY_ORIGIN
DEEP_RESEARCH
GIFT_REPORT
HUMAN_RESEARCH
```

Do not implement their full commerce behavior now.

---

# 24. OFFER MODEL

Recommended:

```text
Offer
├── offer_id
├── offer_version
├── product_type
├── market
├── currency
├── amount_minor
├── tax_display_mode
├── active
├── starts_at
├── ends_at
├── eligibility_policy_version
├── experiment_id nullable
├── experiment_variant nullable
├── terms_version
├── refund_policy_version
├── consumer_disclosure_version
└── created_at
```

`amount_minor` is integer.

---

# 25. OFFER IS NOT A FRONTEND PRICE

Backend:

```json
{
  "offer_id": "off_...",
  "product_type": "FULL_SURNAME_REPORT",
  "amount_minor": 2900,
  "currency": "PLN"
}
```

Frontend formats:

```text
29 zł
```

Never:

```ts
const PRICE = 29
```

as commerce authority.

---

# 26. OFFER ELIGIBILITY GATE

```text
PremiumEligibility = ELIGIBLE
AND
DiscoveryIndex ready
AND
PaywallTruthfulnessQA passed
AND
paid SurfaceEligibility allowed
AND
Offer active
```

Otherwise:

```text
OFFER_NOT_ELIGIBLE
```

and checkout creation fails safely.

---

# 27. OFFER SNAPSHOT

Checkout freezes:

```text
offer_id/version
product_type
amount_minor
currency

surname_id

DiscoveryIndex ID/version
Coverage ID/version

promised report sections/counts
rights/surface eligibility version

terms version
refund/withdrawal copy version

experiment assignment
```

This is immutable after checkout creation.

---

# 28. PURCHASE PROMISE SNAPSHOT

## MODEL CHANGE PROPOSAL 20-D — ACCEPT P0

Add:

```text
PurchasePromiseSnapshot
```

Recommended fields:

```text
purchase_promise_snapshot_id
order_id

surname_id
product_type

discovery_index_id
discovery_index_version

promised_sections[]
inventory_counts_json

offer_id
offer_version
offer_copy_version

rights_state_hash

created_at
```

Why:

- proves what was sold;
- validates report fulfillment;
- resolves support/refund disputes;
- protects against future DiscoveryIndex changes.

This is one of the highest-value commerce objects in the design.

---

# 29. CUSTOMER IDENTITY

P0 needs a holder that exists before a formal account.

## MODEL CHANGE PROPOSAL 20-A — ACCEPT P0

```text
CustomerIdentity
├── customer_identity_id
├── email_ciphertext
├── email_lookup_hash
├── email_verified_at nullable
├── linked_user_id nullable
├── created_at
├── updated_at
└── deleted_at nullable
```

### Email normalization

Use a conservative normalization:

```text
trim surrounding whitespace
Unicode-safe validation
case normalization for lookup where appropriate
```

Do **not** remove dots or plus tags based on provider-specific Gmail assumptions.

Store:

- encrypted original/canonical email;
- keyed HMAC/hash for exact lookup.

---

# 30. WHY `CustomerIdentity`

Supports:

```text
guest purchase
↓
magic-link access
↓
later optional account
```

without moving Orders/Entitlements between identity models.

---

# 31. ORDER MODEL

Recommended:

```text
Order
├── order_id
├── public_order_reference
├── customer_identity_id
├── surname_id
├── product_type
├── offer_id
├── offer_version
├── purchase_promise_snapshot_id
│
├── market
├── currency
├── subtotal_minor
├── tax_minor nullable
├── total_minor
│
├── order_status
├── payment_status
│
├── provider
├── provider_checkout_session_id nullable
├── provider_payment_id nullable
│
├── checkout_idempotency_key
│
├── terms_version
├── privacy_notice_version
├── refund_policy_version
├── consumer_disclosure_version
├── withdrawal_consent_id nullable
│
├── experiment_assignment_id nullable
│
├── created_at
├── checkout_created_at
├── paid_at
├── fulfilled_at
├── cancelled_at
├── refunded_at
└── updated_at
```

---

# 32. PUBLIC ORDER REFERENCE

Do not expose a sequential internal DB key.

Use:

```text
NA-2026-<opaque segment>
```

or opaque UUID-derived support code.

It is:

```text
support identifier
```

not authentication secret.

---

# 33. ORDER STATUS

Recommended canonical state:

```text
CREATED
PENDING_PAYMENT
PAID
FULFILLING
FULFILLED
EXPIRED
CANCELLED
REFUND_PENDING
REFUNDED
REVIEW_REQUIRED
```

Avoid generic `FAILED`.

A payment/report component can fail without destroying the Order history.

---

# 34. PAYMENT STATUS

Separate enum:

```text
NOT_STARTED
PENDING
REQUIRES_ACTION
SUCCEEDED
FAILED
CANCELLED
PARTIALLY_REFUNDED
REFUNDED
DISPUTED
```

Provider states map to these.

Store raw/provider state separately for debugging/reconciliation.

---

# 35. ORDER / PAYMENT STATE MACHINE

```text
CREATED / NOT_STARTED
        │
        ▼
PENDING_PAYMENT / PENDING
        │
    ┌───┼────────┐
    ▼   ▼        ▼
SUCCEEDED FAILED EXPIRED
    │
    ▼
PAID
    │
    ▼
FULFILLING
    │
    ▼
FULFILLED
```

Side paths:

```text
PAID/FULFILLED
↓
REFUND_PENDING
↓
REFUNDED
```

and:

```text
SUCCEEDED
+
validation mismatch
→ REVIEW_REQUIRED
```

---

# 36. PAYMENT ATTEMPT

## MODEL CHANGE PROPOSAL 20-B — ACCEPT P0

One logical Order may need multiple attempts:

- expired Checkout;
- declined card;
- BLIK attempt expired;
- user retries.

```text
PaymentAttempt
├── payment_attempt_id
├── order_id
├── provider
├── provider_checkout_session_id
├── provider_payment_id nullable
├── payment_method_type nullable
├── amount_minor
├── currency
├── status
├── failure_category nullable
├── created_at
├── completed_at nullable
└── provider_state_safe nullable
```

Order remains one logical purchase.

---

# 37. CHECKOUT SESSION

Application DTO:

```text
CheckoutSession
├── checkout_session_id
├── order_id
├── payment_attempt_id
├── provider
├── provider_session_id
├── status
├── redirect_url
├── expires_at
├── created_at
└── completed_at nullable
```

Do not persist card/payment credentials.

---

# 38. CHECKOUT API

```http
POST /api/v1/checkout-sessions
Idempotency-Key: <UUID>
```

Request:

```json
{
  "offer_id": "off_123",
  "surname_id": "019..."
}
```

Server derives:

- actual eligible Offer;
- current PremiumEligibility;
- CustomerIdentity from submitted email/pre-checkout flow;
- experiment assignment.

Do not trust amount/currency from client.

---

# 39. EMAIL AND CHECKOUT API

Because email is required for delivery, recommended Name Atlas pre-checkout step:

```json
{
  "offer_id": "...",
  "surname_id": "...",
  "email": "buyer@example.com",
  "consumer_acknowledgements": {...}
}
```

Then server creates:

- CustomerIdentity;
- Order;
- PurchasePromiseSnapshot;
- provider Checkout.

Alternative:

Collect email within Stripe Checkout and pull it from verified Checkout Session.

### Recommendation

Collect email in the Name Atlas pre-checkout summary **before redirect**, because Name Atlas needs:

- delivery-purpose copy;
- consumer-law acknowledgements;
- durable-medium delivery target;
- stable CustomerIdentity.

Pass email to Stripe Checkout where supported.

This remains guest checkout.

---

# 40. CHECKOUT IDEMPOTENCY

Unique scope:

```text
checkout_idempotency_key
```

When same request/key is replayed:

```text
if existing usable CheckoutSession:
    return it

if existing Order but provider session expired:
    create new PaymentAttempt under same Order
    only under explicit retry path
```

Do not create two Orders.

Database:

```text
UNIQUE(checkout_idempotency_key)
```

within appropriate tenant/global namespace.

---

# 41. STRIPE IDEMPOTENCY

Also send provider idempotency key based on internal operation:

```text
checkout:create:<order_id>:<attempt_no>
```

Application DB constraints remain primary correctness.

Provider idempotency is secondary protection.

---

# 42. CHECKOUT CREATION TRANSACTION

Do **not** call Stripe inside a long DB transaction.

Recommended:

```text
DB transaction:
  validate eligibility
  create/find CustomerIdentity
  create Order
  create PurchasePromiseSnapshot
  create PaymentAttempt = NOT_STARTED
  commit

↓
Stripe create Checkout Session
  metadata.order_id
  metadata.payment_attempt_id
  Idempotency-Key

↓
short DB transaction:
  save provider_session_id
  mark attempt PENDING
  mark order PENDING_PAYMENT
```

---

# 43. PROVIDER CREATION FAILURE

If Stripe request fails:

```text
Order remains CREATED or PENDING_PAYMENT
PaymentAttempt = FAILED/transient
```

Retry can create new attempt/session.

No Entitlement.

---

# 44. PROVIDER CREATED / DB UPDATE FAILED

Recovery uses:

- provider idempotency;
- metadata `order_id`;
- reconciliation;
- retry fetch if needed.

A periodic recovery job looks for:

```text
Order CREATED
+
provider session potentially exists
```

when ambiguous.

---

# 45. PROVIDER METADATA

Send only:

```text
order_id
payment_attempt_id
offer_id
product_type
```

Optional:

```text
market
```

Do not send:

- family data;
- historical evidence;
- full report;
- raw internal Claim IDs;
- raw surname unless provider display needs it.

Display surname through line-item/product description if useful to user; metadata can stay IDs.

---

# 46. CHECKOUT LINE ITEM

Clear product:

```text
Name Atlas — Full Surname Report
```

Description can include:

```text
Surname: Cichowski
One-time digital report
```

Avoid:

```text
Premium
```

as only line-item description.

---

# 47. CHECKOUT UX P0

Flow:

```text
Paywall
↓
Name Atlas pre-checkout summary
↓
Stripe Checkout
↓
Name Atlas status/confirmation
```

Pre-checkout summary shows:

```text
product
surname
actual report scope
total price
one-time payment
email purpose
required legal acknowledgements
Terms / Privacy / refund information
```

No account.

---

# 48. GUEST CHECKOUT

P0:

```text
guest-first
```

No sign-in gate.

Optional account/magic access occurs after purchase.

This matches existing Paywall System research and current checkout best practices.

---

# 49. CHECKOUT FIELDS

Required Name Atlas fields:

```text
email
legal acknowledgements if required
```

Provider collects:

```text
payment method information
```

Optional collapsed:

```text
invoice request
```

No:

- family region;
- DOB;
- password;
- marketing checkbox bundled with purchase.

---

# 50. EXPRESS METHODS

Stripe-hosted Checkout may show:

- Apple Pay;
- Google Pay;
- BLIK;
- card;
- P24;

based on eligibility/device.

Name Atlas legal acknowledgements occur **before** redirect if they are required.

This avoids a wallet button bypassing a consumer-law checkbox.

---

# 51. PAYMENT BUTTON

Provider button should clearly communicate payment.

Name Atlas pre-checkout CTA:

```text
Continue to secure payment
```

Stripe final button:

```text
Pay [amount]
```

No ambiguous final charge button.

---

# 52. CONSUMER CONTRACT / WITHDRAWAL GATE

Prompt 19 correctly concluded:

> personalized report does **not** automatically eliminate withdrawal rights.

Current UOKiK guidance for paid digital content supplied without a tangible medium states loss of withdrawal rights requires, cumulatively:

1. prior express consent to start before withdrawal period ends;
2. information/acknowledgement of loss of withdrawal right;
3. contract/confirmation plus consent delivered on a durable medium.

Official:

https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/

However, Name Atlas may legally be characterized partly as:

```text
digital content
+
digital service/research service
```

Therefore:

> **POLISH CONSUMER-LAW COUNSEL MUST APPROVE THE EXACT CLASSIFICATION AND CHECKOUT LANGUAGE.**

---

# 53. WITHDRAWAL CONSENT RECORD

## MODEL CHANGE PROPOSAL 20-E — CONDITIONAL P0

If counsel determines early-performance consent/acknowledgement is required:

```text
WithdrawalConsentRecord
├── withdrawal_consent_id
├── customer_identity_id
├── order_id
├── consent_copy_version
├── terms_version
├── affirmative_start_request
├── loss_of_withdrawal_acknowledged
├── captured_at
├── source_surface
└── evidence_hash
```

No pre-checked box.

Store exact text version.

---

# 54. PRE-CHECKOUT LEGAL ACKNOWLEDGEMENT

Potential UI after counsel sign-off:

```text
[ ] I expressly request that Name Atlas begins preparing/delivering
    the digital report immediately, before the 14-day withdrawal
    period has expired, and I acknowledge the consequences for my
    withdrawal right described above.
```

Do **not** copy this as final legal text without counsel.

This is an architecture placeholder.

---

# 55. DURABLE-MEDIUM CONFIRMATION

After purchase send transactional receipt email containing or attaching/immutably linking:

- seller;
- order reference;
- product;
- price;
- terms version;
- consumer disclosures;
- withdrawal acknowledgement where applicable;
- report access/recovery instructions.

An ordinary link to mutable “latest terms” is not sufficient evidence of what was agreed.

Keep archived legal document versions.

---

# 56. LEGAL DOCUMENT ARCHIVE

Store immutable versions:

```text
TermsOfSale
PrivacyNotice
RefundPolicy
ConsumerDisclosure
WithdrawalConsentCopy
```

Order references exact versions.

Archived documents are renderable later.

---

# 57. BROWSER RETURN IS NOT PAYMENT PROOF

Stripe:

```text
success_url
```

may contain an opaque Checkout reference.

Return page:

```text
"We're confirming your payment…"
```

Then:

```text
GET canonical commerce status
```

Never:

```text
?success=true
→ create Entitlement
```

---

# 58. WEBHOOK SOURCE OF TRUTH

Canonical payment success is based on:

```text
verified server-side provider event
```

plus validation against internal Order.

Provider webhook drives:

```text
PaymentAttempt
Order
Entitlement
fulfillment outbox
```

---

# 59. STRIPE WEBHOOK REQUIREMENTS

Stripe official docs emphasize:

- use the raw request body for signature verification;
- duplicate events can occur;
- event ordering is not guaranteed;
- respond quickly;
- process asynchronously;
- verify signatures/timestamps.

Reference:

https://docs.stripe.com/webhooks

---

# 60. WEBHOOK HTTP FLOW

```text
POST /webhooks/stripe
↓
read RAW body
↓
verify Stripe-Signature
↓
parse event
↓
persist PaymentWebhookEvent
↓
return 2xx promptly
↓
async commerce processor
```

Do not execute report research before returning webhook response.

---

# 61. PAYMENT WEBHOOK EVENT

## MODEL CHANGE PROPOSAL 20-C — ACCEPT P0

```text
PaymentWebhookEvent
├── payment_webhook_event_id
├── provider
├── provider_event_id
├── event_type
├── received_at
├── signature_verified
├── payload_hash
├── raw_payload_storage_ref nullable
├── processing_status
├── processed_at nullable
├── order_id nullable
├── payment_attempt_id nullable
├── error_code nullable
└── event_created_at_provider
```

Unique:

```text
(provider, provider_event_id)
```

---

# 62. RAW WEBHOOK PAYLOAD RETENTION

Retain only as long as necessary for:

- verification/debugging;
- payment dispute;
- reconciliation;

under Prompt 19 retention policy.

Prefer:

- encrypted/restricted;
- shorter retention;
- data minimization.

Store hash + safe normalized event long-term if raw body no longer needed.

---

# 63. WEBHOOK DEDUPLICATION

Duplicate provider event:

```text
INSERT ... ON CONFLICT
```

returns safe success.

Do not repeat:

- Order transition;
- Entitlement grant;
- receipt email;
- purchase analytics.

---

# 64. WEBHOOK EVENT ORDERING

Do not assume:

```text
checkout.completed
always before/after
payment succeeded
```

based solely on delivery order.

Use provider event/object timestamps and current canonical state.

State transitions validate monotonic/business rules.

---

# 65. PAYMENT VALIDATION BEFORE ENTITLEMENT

Before grant verify:

```text
provider account = expected
order exists
provider Checkout/payment maps to order
amount == Order.total_minor
currency == Order.currency
payment final state == success
product/order not already invalidated
```

Failure:

```text
Order = REVIEW_REQUIRED
PaymentStatus = SUCCEEDED or provider-specific
Entitlement = NOT GRANTED
```

Alert.

---

# 66. AMOUNT / CURRENCY MISMATCH

Never “close enough”.

Example:

```text
Order 2900 PLN
Webhook 2900 EUR
```

→ no Entitlement.

Create:

```text
COMMERCE_REVIEW_REQUIRED
```

---

# 67. PAYMENT SUCCESS TRANSACTION

One short DB transaction:

```text
lock Order

assert validated payment

update PaymentAttempt = SUCCEEDED
update Order.payment_status = SUCCEEDED
update Order.order_status = PAID
set paid_at

create/find CustomerIdentity
create Entitlement IF NOT EXISTS

insert commerce outbox:
  PURCHASE_COMPLETED
  REPORT_FULFILLMENT_REQUESTED
  PURCHASE_RECEIPT_REQUESTED
  ANALYTICS_PURCHASE_COMPLETED

commit
```

This is the core money-to-access atomic boundary.

---

# 68. ENTITLEMENT MODEL

```text
Entitlement
├── entitlement_id
├── holder_type
├── holder_id              # CustomerIdentity P0
├── product_type
├── surname_id
├── report_id
├── order_id
├── product_version
├── status
├── granted_at
├── revoked_at nullable
├── revocation_reason nullable
├── access_policy_version
└── created_at
```

Unique:

```text
one active entitlement for
(holder, product_type, surname/report resource, source order)
```

---

# 69. ENTITLEMENT STATUS

P0:

```text
ACTIVE
REVOKED
REFUNDED
DISPUTED
```

No arbitrary `EXPIRED` for the purchased right.

Magic links/sessions expire separately.

If product later chooses time-limited products, add entitlement expiry explicitly.

---

# 70. ORDER ≠ ENTITLEMENT

One Order can grant:

```text
1..N Entitlements
```

This supports future:

- bundle;
- gift;
- family product.

P0 ordinarily grants one.

---

# 71. ENTITLEMENT HOLDER

P0:

```text
CustomerIdentity
```

Future gift:

```text
recipient CustomerIdentity
```

Therefore Order purchaser and Entitlement holder are not hardwired as same domain field forever.

---

# 72. REPORT MODEL

```text
Report
```

is logical research resource.

```text
ReportVersion
```

is immutable snapshot.

Entitlement points to:

```text
Report
```

and access policy determines which versions the holder may open.

---

# 73. REPORT VERSION POLICY — P0

At purchase:

- report V1 is generated/frozen from purchased promise inputs;
- V1 remains accessible historically;
- future V2 must never overwrite V1.

P0 user policy:

```text
if a new version is generated as a correction/update,
holder may receive access to V2 without losing V1
```

provided rights allow.

Do not promise perpetual free research updates.

---

# 74. PRECOMPUTED REPORT

If a report-ready canonical premium snapshot already exists:

```text
Order PAID
→ Entitlement ACTIVE
→ Report may be available immediately
```

Still:

- create purchaser Report/ReportVersion relationship;
- preserve PurchasePromiseSnapshot.

No needless LLM regeneration.

---

# 75. REPORT FULFILLMENT

If not ready:

```text
Entitlement ACTIVE
↓
Premium Research Run
↓
Report Generation
↓
Report QA
↓
ReportVersion READY
```

Commerce does not directly invoke sources.

It sends a runtime request.

---

# 76. REPORT GENERATION STATE

Canonical from Prompt 16:

```text
NOT_STARTED
RESEARCHING
GENERATING
READY
REVIEW_REQUIRED
FAILED
```

---

# 77. ORDER FULFILLMENT STATE

Use Order status rather than a second P0 table unless operations need more granularity:

```text
PAID
→ FULFILLING
→ FULFILLED
```

ReportStatus carries actual report pipeline detail.

### MODEL CHANGE PROPOSAL 20-G

Dedicated `ReportFulfillment` table:

```text
DEFER P1
```

P0 can derive from:

```text
Order + Entitlement + ReportStatus + delivery events
```

---

# 78. PAYMENT SUCCESS WITH REPORT FAILURE

Canonical:

```text
Order = PAID or FULFILLING
PaymentStatus = SUCCEEDED
Entitlement = ACTIVE
ReportStatus = FAILED / RETRYING
```

User message:

> Payment confirmed. We're still preparing your report.

Never:

> Payment failed.

Never:

> Buy again.

---

# 79. REPORT RETRY

Report-generation job is idempotent.

Same:

```text
report_id
input fingerprint
renderer/version
```

must not create uncontrolled duplicate canonical versions.

Admin/support can requeue safely.

---

# 80. REPORT FULFILLMENT QA

Before `READY`:

```text
PurchasePromiseSnapshot
↓
Report content
```

Validate:

- every promised chapter either delivered or legally/technically remediated;
- citations valid;
- Claims/confidence valid;
- paid rights still pass;
- report generation QA passes.

If material promise cannot be fulfilled:

```text
REVIEW_REQUIRED
```

not silent downgrade.

---

# 81. PROMISE MISMATCH

Possible remediation:

1. regenerate;
2. replace equivalent content if promise semantics preserved;
3. customer support explanation;
4. partial/full refund depending policy/legal duties.

Do not auto-deliver materially weaker report as if complete.

---

# 82. PREMIUM RESEARCH AFTER PURCHASE

Offer should be based on already known valid inventory.

Post-purchase research may:

- complete rendering/synthesis;
- enrich within promised scope;

but must not be:

```text
"we charged you; now we'll see whether anything exists."
```

This is why DiscoveryIndex precomputation is central.

---

# 83. PURCHASE SUCCESS SCREEN

State 1 — payment not yet server-confirmed:

```text
Confirming your payment…
```

State 2 — verified, report preparing:

```text
Payment confirmed.
Your full surname report is being prepared.
We'll email you when it is ready.
```

State 3 — report ready:

```text
Your report is ready.
Open your Atlas.
```

---

# 84. DO NOT PROMISE FAKE INSTANT DELIVERY

Existing Paywall copy such as:

```text
"Your report will be available immediately after payment."
```

must be used only if production metrics demonstrate that guarantee reliably.

Default safer P0:

```text
"Your report will start preparing as soon as payment is confirmed."
```

If precomputed and immediate, UI can reflect that dynamically.

---

# 85. REPORT ACCESS

```http
GET /api/v1/reports/{report_id}
```

Authorization:

```text
valid session
↓
CustomerIdentity
↓
ACTIVE Entitlement
↓
Report
```

Report ID alone grants nothing.

---

# 86. MAGIC LINK

## MODEL

```text
MagicLinkToken
├── magic_link_id
├── customer_identity_id
├── purpose
├── resource_scope nullable
├── token_hash
├── created_at
├── expires_at
├── used_at nullable
├── revoked_at nullable
├── request_ip_hash optional
└── created_by_reason
```

---

# 87. MAGIC-LINK PURPOSES

P0:

```text
REPORT_ACCESS_LOGIN
EMAIL_CHANGE_CONFIRM
```

Possible later:

```text
ACCOUNT_LOGIN
```

Purpose checked during redemption.

---

# 88. TOKEN STORAGE

Generate high-entropy random token.

Email receives:

```text
raw token
```

Database stores:

```text
hash/HMAC(token)
```

Not raw token.

---

# 89. MAGIC-LINK EXPIRY

Token expiry is short, e.g. tens of minutes, configured by security policy.

The exact duration is not the Entitlement duration.

Expired:

```text
request new link
```

---

# 90. MAGIC LINK = AUTH EXCHANGE

Recommended:

```text
click one-time magic link
↓
verify + consume
↓
create secure session cookie
↓
redirect to clean report/library URL
```

Do not use a permanent reusable bearer URL as the report authorization model.

---

# 91. ACCESS SESSION

Secure cookie:

```text
HttpOnly
Secure
SameSite per flow
bounded lifetime
rotatable/revocable
```

Contains opaque session ID, not:

- report data;
- card data;
- raw entitlement list.

---

# 92. REPORT ACCESS RECOVERY

```http
POST /api/v1/report-access-links
```

Request:

```json
{"email":"..."}
```

Response always generic:

> If eligible reports are linked to this email, we'll send an access link.

No enumeration.

---

# 93. RECOVERY RATE LIMIT

Limit by:

- IP;
- normalized email HMAC;
- visitor/session.

Protect from email bombing.

---

# 94. MULTIPLE REPORTS

One email/CustomerIdentity can own multiple Atlases.

Magic link can land on:

```text
My Atlases
```

P0 can initially redirect to most relevant report when link is report-scoped.

Schema remains multi-report capable.

---

# 95. OPTIONAL ACCOUNT LINKING

Later:

```text
CustomerIdentity.linked_user_id = UserAccount
```

Entitlements remain on CustomerIdentity or are accessible through stable identity relation.

Do not duplicate/move order rows.

---

# 96. EMAIL VERIFICATION

No pre-purchase verification is required for payment.

Why:

- extra friction;
- provider/email receipt confirms operational path after payment;
- magic-link redemption proves control later.

Risk:

```text
email typo
```

handled through current-session access + support correction.

---

# 97. EMAIL TYPO RECOVERY

If purchaser still has post-checkout session:

- show entered email;
- allow correction flow with verification;
- audit change.

If session lost:

- support verifies purchase with limited proof;
- never reveal report to arbitrary claimed email owner.

---

# 98. EMAIL CHANGE

High-risk action.

Require:

```text
valid authorized session
+
verification of new email
```

Audit:

```text
old identity
new email hash
actor
time
reason
```

Consider alert to old email where practical.

---

# 99. TRANSACTIONAL EMAIL PROVIDER — RECOMMENDATION

## P0: Resend

Current public pricing:

```text
Free: 3,000 emails/month, 100/day
Pro:  $20/month, 50,000 emails/month
```

Resend publishes:

- DPA;
- signed webhooks;
- delivery/bounce/complaint events;
- TypeScript/Next.js-focused API.

References:

https://resend.com/pricing

https://resend.com/legal/dpa

https://resend.com/docs/webhooks/verify-webhooks-requests

### Why P0

- fastest implementation with current TypeScript stack;
- adequate launch economics;
- clean webhook/testing experience.

---

# 100. SES ALTERNATIVE

Amazon SES is materially cheaper at scale and provides European regional endpoints, including Frankfurt.

Current pricing includes pay-as-you-go/plan options with very low per-thousand email cost.

Use if:

- strict regional infrastructure preference grows;
- volume makes Resend cost material;
- engineering can absorb more AWS email/deliverability operations.

References:

https://aws.amazon.com/ses/pricing/

https://docs.aws.amazon.com/general/latest/gr/ses.html

---

# 101. EMAIL PROVIDER ADAPTER

```ts
interface TransactionalEmailProvider {
  send(input: TransactionalEmail): Promise<EmailSendResult>;
  verifyWebhook(input: RawWebhookRequest): Promise<EmailProviderEvent>;
}
```

Domain templates do not depend on Resend-specific IDs.

---

# 102. EMAIL TYPES

P0:

```text
PURCHASE_RECEIPT
REPORT_READY
REPORT_ACCESS_LINK
REFUND_CONFIRMATION
EMAIL_CHANGE_CONFIRM
```

Optional:

```text
PAYMENT_ACTION_REQUIRED
```

only if provider/payment method has a useful server-driven recovery state.

---

# 103. PURCHASE RECEIPT

Trigger:

```text
Order transitions to PAID
```

Not:

```text
Report READY
```

Contents:

```text
seller
order reference
product
surname label
date
total
currency
one-time purchase

legal/terms confirmation as required
withdrawal acknowledgement where required

support contact
```

---

# 104. REPORT READY EMAIL

Trigger:

```text
ReportStatus transitions to READY
```

Contents:

- report name;
- access CTA;
- access/recovery context;
- support.

No sensitive family content P0.

---

# 105. EMAIL LINK TRACKING

For security-sensitive access links:

```text
disable click tracking
```

where provider configuration allows.

Do not rewrite magic links through third-party click domains.

Open tracking is unnecessary for access emails.

Analytics uses:

```text
report_opened
```

from authorized application use.

---

# 106. EMAIL WEBHOOKS

Useful provider events:

```text
delivered
bounced
complained
```

Verify signatures.

Store minimal delivery state.

Do not treat:

```text
email opened
```

as report consumption.

---

# 107. EMAIL BOUNCE

If report-ready email bounces:

```text
Entitlement remains ACTIVE
Report remains READY
```

Support/recovery path corrects email.

Current authorized browser session can still open report.

---

# 108. DELIVERY STATE

P0 can record:

```text
receipt_sent_at
report_ready_email_sent_at
report_ready_email_delivery_status
last_access_link_sent_at
```

No separate heavyweight delivery aggregate required initially.

---

# 109. REPORT DOWNLOAD

Optional P0/P1:

```http
GET /api/v1/reports/{report_id}/download
```

Server:

```text
authorize entitlement
↓
generate short-lived signed object URL
```

or stream.

No public object URL.

---

# 110. REPORT PDF

Structured web report remains canonical presentation.

PDF is:

```text
derived artifact
```

Store:

```text
report_version_id
renderer_version
file_hash SHA-256
object_key
created_at
```

Useful for delivery integrity/audit.

---

# 111. REPORT RETENTION

Do not promise:

```text
forever
```

unless operations/legal guarantee it.

P0 marketing can say:

```text
you can return to your purchased report
```

subject to Terms/retention policy.

Entitlement is durable; report artifacts can be regenerated from immutable ReportVersion if source rights permit.

---

# 112. RIGHTS CHANGE AFTER PURCHASE

Commerce supports three independent states:

```text
Order remains
Entitlement remains/history remains
Content asset may become restricted
```

If rights require takedown:

- block affected asset;
- preserve Order;
- preserve audit;
- regenerate where possible;
- support/remedy customer if material promise affected.

Legal decision per source contract.

---

# 113. REFUND MODEL

```text
Refund
├── refund_id
├── order_id
├── payment_attempt_id nullable
├── provider
├── provider_refund_id
├── amount_minor
├── currency
├── reason_category
├── status
├── requested_at
├── approved_at nullable
├── processed_at nullable
├── initiated_by_type
├── initiated_by_id
├── notes_ref nullable
└── idempotency_key
```

---

# 114. REFUND STATUS

```text
REQUESTED
APPROVED
PROCESSING
SUCCEEDED
FAILED
REJECTED
```

If policy allows direct automatic refunds, some states can be short-lived but remain useful for audit.

---

# 115. REFUND REASONS

```text
EXPECTED_MORE_DATA
DATA_QUALITY_CONCERN
TECHNICAL_FAILURE
REPORT_NOT_DELIVERED
DUPLICATE_PURCHASE
PAYMENT_ISSUE
STATUTORY_WITHDRAWAL
LACK_OF_CONFORMITY
GOODWILL
OTHER
```

Analytics can map to coarser categories.

Free text stays support-only.

---

# 116. REFUND IDEMPOTENCY

Unique:

```text
refund idempotency key
```

Provider refund ID unique.

Retry cannot create two refunds.

---

# 117. FULL REFUND → ENTITLEMENT

Default policy:

```text
full refund for ordinary cancellation/withdrawal
→ revoke only Entitlements granted by that Order
```

Not all reports belonging to email.

Exceptions:

```text
goodwill refund while retaining access
duplicate order refund where valid original order remains
```

are explicit policy decisions/audited.

---

# 118. PARTIAL REFUND

Do not introduce arbitrary partial refund logic P0 unless:

- consumer remedy;
- customer support;
- provider supports and legal policy approves.

Schema supports partial amount.

Entitlement effect is explicit, not inferred solely from amount.

---

# 119. DUPLICATE PURCHASE

Prevention when CustomerIdentity known:

```text
if ACTIVE entitlement exists for same report/product:
    show Open Report
    do not create checkout
```

If duplicate Order still occurs:

```text
refund duplicate
preserve original Entitlement
```

---

# 120. CHARGEBACK / DISPUTE

Canonical payment state:

```text
DISPUTED
```

Possible Entitlement policy:

```text
dispute opened:
  Entitlement = DISPUTED
  optionally retain temporary access

dispute lost / charge reversed:
  revoke entitlement

dispute won:
  restore ACTIVE
```

Exact policy reviewed with finance/legal.

---

# 121. PAYMENT FAILURE

Categories:

```text
DECLINED
AUTHENTICATION_FAILED
METHOD_EXPIRED
PROVIDER_TEMPORARY
CHECKOUT_EXPIRED
UNKNOWN
```

Do not store sensitive decline detail beyond provider-safe code.

---

# 122. RETRY PAYMENT

Same logical Order can create new PaymentAttempt if:

```text
previous attempt FAILED/EXPIRED
offer snapshot still valid
```

Price remains frozen for checkout validity window.

If Offer no longer valid and no payment occurred:

product policy decides whether:

- honor frozen offer;
- require new Order.

P0:

```text
honor frozen offer until Checkout/Order expiry
```

after which create new Order/OfferSnapshot.

---

# 123. ORDER EXPIRY

Add:

```text
expires_at
```

for unpaid Order/checkout.

After:

```text
Order = EXPIRED
```

No Entitlement.

New purchase uses current Offer.

Abandoned Orders can be purged/anonymized under retention policy after operational/analytics need.

---

# 124. CHECKOUT CANCELLATION

Cancel return does not imply provider payment cancellation for every asynchronous method.

UI returns to:

```text
Payment not completed / confirming status
```

depending canonical provider state.

Order state derives from server/provider state.

---

# 125. FRAUD

P0:

Use Stripe's provider fraud/risk controls and rate limiting.

Do not build custom ML.

Monitor:

- checkout spikes;
- failed payment attempts;
- dispute rate;
- refund abuse;
- email/payment mismatch patterns where lawful.

---

# 126. COUPONS

P0:

```text
NO
```

unless marketing requires.

Do not include promo field just because Stripe supports it.

It increases complexity and coupon-hunting behavior.

---

# 127. PRICE EXPERIMENTS

Prompt 18 assignment persists:

```text
experiment_id
experiment_version
variant_id
```

Order stores:

```text
exact Offer/amount
```

Checkout must not re-evaluate price after creation.

---

# 128. CURRENCY

P0:

```text
PLN
```

Schema:

```text
currency = ISO 4217
amount_minor = integer
```

No float.

---

# 129. MULTI-CURRENCY

P1.

Each Offer has explicit currency.

Do not client-side FX the canonical charge price.

---

# 130. TAX MODEL

Order supports:

```text
subtotal_minor
tax_minor
total_minor
tax_mode
tax_jurisdiction_code nullable
```

P0 UI can be tax-inclusive where required.

Do not hardcode VAT rate until adviser sign-off.

---

# 131. EU VAT / OSS — CURRENT BOUNDARY

EU Commission OSS guidance states:

- B2C TBE/electronic services generally use customer's Member State as place of supply;
- a EUR 10,000 EU-wide threshold can apply in specified circumstances for TBE/electronic services and intra-EU distance sales when supplier is established in one Member State.

Official:

https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en

Whether Name Atlas's combined:

```text
automated research
+
personalized report
```

is legally classified as an electronically supplied service, another service, digital content, or mixed supply is:

> **TAX ADVISER REVIEW REQUIRED**

Do not encode OSS behavior until classification is confirmed.

---

# 132. POLAND VAT OPEN QUESTION

Before paid launch obtain written accountant/tax-adviser position on:

```text
service/content classification
Polish VAT rate
tax-inclusive price
invoice requirements
cash-register/fiscalization exemption/obligation
EU cross-border OSS
evidence of customer location if relevant
```

Architecture remains configurable.

---

# 133. KSeF 2026

Official Polish KSeF materials state:

> B2C consumer invoices remain voluntary in KSeF after 1 February 2026.

References:

https://ksef.podatki.gov.pl/pytania-i-odpowiedzi-ksef-20/

https://ksef.podatki.gov.pl/wyjasnienia/co-warto-wiedziec-przed-startem-ii-etapu-wdrozenia-krajowego-systemu-e-faktur/

Therefore:

```text
P0 B2C Name Atlas
→ no direct KSeF integration required solely for ordinary consumer invoices
```

If business invoice/NIP flow is enabled:

```text
ACCOUNTANT REVIEW
```

because B2B rules differ.

---

# 134. INVOICE REQUEST

Keep collapsed:

```text
Potrzebuję faktury
```

P0 options after accountant review:

1. support/manual invoice flow;
2. invoicing provider integration;
3. direct accounting integration later.

Do not make billing address/NIP mandatory for all consumers.

---

# 135. RECEIPT ≠ VAT INVOICE

Purchase receipt email is commercial confirmation.

It is not automatically a Polish statutory invoice.

Accounting system owns statutory documents/numbering.

---

# 136. FISCAL CASH REGISTER

Polish cash-register obligations/exemptions depend on:

- service type;
- payment method;
- documentation;
- current regulation.

Do not make a blanket software conclusion.

> **POLISH ACCOUNTANT / TAX ADVISER REVIEW REQUIRED**

---

# 137. FINANCE RECONCILIATION

P0 scheduled reconciliation:

```text
Name Atlas Orders
↔ Stripe Checkout / Payment objects
↔ Stripe refunds/disputes
↔ Stripe balance/settlement data
↔ accounting export
```

---

# 138. RECONCILIATION RESULT

```text
MATCHED
ORDER_MISSING
PROVIDER_MISSING
AMOUNT_MISMATCH
CURRENCY_MISMATCH
STATUS_MISMATCH
REFUND_MISMATCH
DUPLICATE_PROVIDER_PAYMENT
MANUAL_REVIEW
```

---

# 139. RECONCILIATION RUN

Optional object or operational table:

```text
CommerceReconciliationRun
├── run_id
├── period_start
├── period_end
├── provider
├── status
├── checked_count
├── mismatch_count
├── started_at
├── completed_at
└── result_ref
```

**Recommendation:** P0 operational table/job.

---

# 140. RECONCILIATION FREQUENCY

P0:

```text
daily
```

plus on-demand reconciliation for:

- support;
- incident;
- payment-provider issue.

At low volume, daily is sufficient.

---

# 141. SOURCE OF TRUTH FOR MONEY

```text
Payment provider / accounting
= external money movement truth

Order DB
= Name Atlas commerce/product truth

Analytics
= measurement derivative
```

All three should reconcile.

---

# 142. PROVIDER SETTLEMENT

Capture/import where available:

```text
gross transaction
provider fee
refund
dispute
net balance
payout
```

Do not attempt to derive exact fees from public pricing formula if provider settlement data exists.

---

# 143. FINANCE EXPORT

Minimum:

```text
order_reference
date
product
gross
tax
currency
refund
provider
provider_payment_reference
invoice reference
```

Potential:

```text
provider fee
net
payout
```

Use accountant-approved format.

---

# 144. CHECKOUT SUCCESS STATUS API

Prompt 16 needs one minor extension.

Recommended endpoint:

```http
GET /api/v1/commerce/orders/{public_order_reference}/status
```

Authorization/correlation:

- current checkout session cookie/token;
- later CustomerIdentity session.

Return browser-safe:

```json
{
  "order_reference": "...",
  "order_status": "FULFILLING",
  "payment_status": "SUCCEEDED",
  "report_id": "...",
  "report_status": "GENERATING"
}
```

Do not expose provider payment IDs.

---

# 145. MODEL CHANGE PROPOSAL 20-H — API ADDITION

Add P0:

```http
GET /api/v1/commerce/orders/{public_order_reference}/status
POST /api/v1/report-access-links
```

Prompt 16 did not yet specify these.

Why:

- secure browser return;
- report recovery.

Use same-origin BFF.

---

# 146. BROWSER STATUS POLLING

After provider return:

```text
poll 1s → 2s → 3s/backoff
```

or use existing SSE/report channel after order is verified.

Simplest P0:

```text
short polling OrderStatus
↓
when entitlement/report known:
navigate report
```

Do not create another realtime subsystem for payment.

---

# 147. SLOW / ASYNC PAYMENT METHODS

If method has delayed finality:

```text
PaymentStatus = PENDING
```

UI:

> Payment is still being confirmed.

Receipt/Entitlement only after canonical success.

BLIK/card often resolve quickly, but domain supports delayed methods.

---

# 148. PROVIDER OUTAGE

If Stripe Checkout creation unavailable:

```text
free product unaffected
premium offer visible
checkout temporarily unavailable
```

No fake Order `FAILED` if provider was never reached successfully.

Retry later.

---

# 149. EMAIL PROVIDER OUTAGE

Outbox holds:

```text
receipt
report-ready email
```

and retries.

Order/Entitlement unchanged.

---

# 150. REPORT OUTAGE

Commerce state remains paid.

Alert:

```text
paid Order + Report FAILED
```

Support/requeue.

Automatic refund only if approved policy/consumer law dictates, not because a worker had one transient failure.

---

# 151. STORAGE OUTAGE

If PDF storage fails but structured report is READY:

- web report remains accessible if possible;
- PDF marked unavailable;
- retry artifact generation.

Do not mark whole purchase unpaid.

---

# 152. TRANSACTIONAL OUTBOX EVENTS

Commerce inserts:

```text
PURCHASE_COMPLETED
ENTITLEMENT_GRANTED
REPORT_FULFILLMENT_REQUESTED
PURCHASE_RECEIPT_REQUESTED
REPORT_READY_EMAIL_REQUESTED
REFUND_COMPLETED
ANALYTICS_EVENT_REQUESTED
```

Idempotent consumers.

---

# 153. COMMERCE EVENT LOG

Do not build full event sourcing.

Use:

- canonical state tables;
- AuditEvent for staff actions;
- PaymentWebhookEvent;
- outbox;
- optional compact `CommerceStateTransition` audit.

P0 can use a `commerce_state_history` table for support/debugging.

---

# 154. ORDER IMMUTABILITY

After Order is PAID, immutable fields:

```text
product_type
surname_id
offer_id/version
currency
subtotal/tax/total
PurchasePromiseSnapshot
terms/disclosure versions
experiment price assignment
```

Corrections use:

- refund;
- adjustment;
- new order;
- support audit.

No SQL “fix price in place”.

---

# 155. CONSUMER COMPLAINT TYPES

```text
TECHNICAL_FAILURE
REPORT_NOT_DELIVERED
DATA_QUALITY_CONCERN
MISSING_PROMISED_CONTENT
WITHDRAWAL
LACK_OF_CONFORMITY
DUPLICATE_CHARGE
PAYMENT_PROBLEM
OTHER
```

Commerce support routes:

```text
payment
report fulfillment
research QA
legal/refund
```

---

# 156. DATA QUALITY COMPLAINT

Do not directly mutate Claims.

Flow:

```text
support case
↓
research issue
↓
Prompt 14/17 review
↓
correct ReportVersion if required
```

Commerce can independently process legal/voluntary remedy.

---

# 157. DELIVERY PROOF

Store:

```text
order paid_at
receipt sent_at

report ready_at
report-ready email sent_at

magic-link redeemed_at
report first opened_at
```

Useful for:

- support;
- disputes;
- consumer-law evidence.

Do not turn delivery proof into invasive tracking.

---

# 158. EMAIL MARKETING BOUNDARY

Email supplied for:

```text
report delivery/recovery
```

remains transactional.

No newsletter without separate approved basis/consent.

---

# 159. SUPPORT TOOL

P0 support view:

```text
CustomerIdentity safe email
Order
PaymentStatus
Entitlement
ReportStatus
EmailDelivery
Refunds
Audit history
```

No raw card data.

No future family content by default.

---

# 160. SUPPORT ACTIONS

Role-controlled:

```text
RESEND_RECEIPT
RESEND_ACCESS_LINK
REQUEUE_REPORT
CORRECT_EMAIL
REQUEST/ISSUE_REFUND
GRANT_ENTITLEMENT
REVOKE_ENTITLEMENT
```

Each requires:

```text
staff ID
reason
timestamp
```

High-risk actions may require supervisor role.

---

# 161. MANUAL ENTITLEMENT

Allow for:

- bug remediation;
- goodwill;
- internal/test;
- promotion.

Record:

```text
grant_source
granted_by
reason
related_order nullable
```

Do not manually edit entitlement DB without audited service action.

---

# 162. CUSTOMER IDENTITY MERGE

Never merge because:

```text
two unverified strings look like same email
```

Link when:

- same verified email;
- authenticated account proves relation.

Orders remain immutable historical records.

---

# 163. DELETE ACCOUNT / COMMERCE

Prompt 19 governs deletion.

Commerce must support:

```text
remove/restrict CustomerIdentity PII
revoke sessions/magic tokens
delete private report if policy requires
retain statutory order/accounting records in restricted form
```

Order reference may remain without active product-profile linkage if legally needed.

---

# 164. REFUND AFTER ACCOUNT DELETION

Use restricted order/legal record and support verification.

Do not require resurrecting deleted account data unnecessarily.

---

# 165. REPORT RIGHTS TAKEDOWN

If a purchased report asset must be removed:

```text
Order unchanged
Entitlement history unchanged
ReportVersion marked PARTIALLY_RESTRICTED or superseded
asset blocked
replacement/regeneration attempted
support/remedy if material
```

Do not destroy payment audit.

---

# 166. ANALYTICS EVENTS

Server canonical:

```text
checkout_session_created
purchase_completed
report_ready
refund_completed
```

One canonical event ID per state transition.

Browser:

```text
checkout_started
report_opened
```

Prompt 18 definitions apply.

---

# 167. PURCHASE ANALYTICS DEDUPE

Webhook retry must not emit two:

```text
purchase_completed
```

Use:

```text
event_id = deterministic UUID/ID linked to Order PAID transition
```

---

# 168. CHECKOUT ABANDONMENT

No aggressive cart-recovery email in P0.

Why:

- email is transactional purpose;
- privacy expectation;
- product is low-ticket;
- avoid consent/marketing ambiguity.

Could later add explicit:

```text
save checkout/report
```

workflow.

---

# 169. CUSTOMER LIBRARY

P0 minimum after magic-login:

```text
My Atlases
```

list:

```text
report title/surname
purchase date
report status
open action
```

No full account required.

Implementation can be simple secured page.

---

# 170. GIFTS — FUTURE

Do not assume:

```text
purchaser == entitlement holder
```

forever.

Gift model later:

```text
Order.purchaser
Gift
RecipientIdentity
RecipientEntitlement
```

---

# 171. FAMILY ORIGIN — FUTURE COMMERCE

Not just another instant report.

Likely:

```text
purchase
↓
private FamilyWorkspace
↓
user input
↓
research
↓
report
```

Needs:

- new privacy basis;
- different fulfillment;
- delivery-time disclosure.

---

# 172. DEEP RESEARCH — FUTURE

Treat as scoped service, not guaranteed result.

Offer promises:

```text
research scope
```

not:

```text
ancestor found
```

Commerce state likely includes:

```text
SCOPE_PENDING
RESEARCHING
REVIEW
DELIVERED
```

separate product workflow.

---

# 173. HUMAN RESEARCH — FUTURE

Use quote/request model.

Do not expose fake instant `199 PLN` purchase if actual human work scope varies.

---

# 174. COMMERCE COUNTRY PACK

## MODEL CHANGE PROPOSAL 20-F — P1

```text
CommerceCountryPack
├── market
├── default_currency
├── payment_provider
├── allowed_payment_methods
├── tax_mode
├── invoice_policy
├── consumer_disclosure_policy
├── withdrawal_policy_version
└── locale
```

P0 can store these as configuration for PL without formal DB entity.

---

# 175. PAYMENT PROVIDER MIGRATION

Domain state is provider-neutral.

Migration triggers:

1. Stripe materially raises low-ticket fees.
2. Mollie/PayU demonstrates significantly better BLIK conversion/economics.
3. Stripe local payment reliability degrades.
4. chargeback/support issues;
5. global expansion favors MoR;
6. volume qualifies for custom acquiring;
7. tax compliance cost makes MoR better economics;
8. provider legal/privacy requirements conflict with Name Atlas.

No multi-PSP smart routing before measured need.

---

# 176. EMAIL PROVIDER MIGRATION

Triggers:

- deliverability;
- outage rate;
- privacy/DPA;
- region;
- cost;
- webhook reliability.

Adapter keeps domain stable.

---

# 177. P0 PAYMENT TESTS

Add to Prompt 17:

```text
PAY-001 checkout idempotency
PAY-002 repeated Idempotency-Key returns same Order
PAY-003 provider session creation retry
PAY-004 invalid webhook signature
PAY-005 duplicate webhook
PAY-006 out-of-order webhook
PAY-007 webhook replay
PAY-008 wrong amount
PAY-009 wrong currency
PAY-010 browser success without webhook
PAY-011 verified payment creates exactly one entitlement
PAY-012 worker crash after PAID transaction
PAY-013 Checkout expiry
PAY-014 payment declined
PAY-015 payment pending
PAY-016 duplicate purchase prevention
PAY-017 refund idempotency
PAY-018 full refund entitlement policy
PAY-019 dispute transition
PAY-020 reconciliation provider-paid/order-missing
```

---

# 178. ENTITLEMENT TESTS

```text
ENT-001 no Entitlement before verified payment
ENT-002 active Entitlement authorizes report
ENT-003 report ID alone rejected
ENT-004 duplicate webhook no duplicate Entitlement
ENT-005 entitlement survives report worker failure
ENT-006 refund revokes only relevant entitlement
ENT-007 duplicate-order refund preserves original
ENT-008 disputed state policy
ENT-009 account link preserves entitlement
ENT-010 manual grant audited
```

---

# 179. MAGIC-LINK TESTS

```text
MAG-001 valid
MAG-002 invalid
MAG-003 expired
MAG-004 already used
MAG-005 revoked
MAG-006 wrong purpose
MAG-007 raw token absent from logs
MAG-008 raw token absent from analytics
MAG-009 redemption creates session
MAG-010 clean redirect removes secret
```

---

# 180. DELIVERY TESTS

```text
DLV-001 receipt only after PAID
DLV-002 report-ready email only after READY
DLV-003 email provider outage retry
DLV-004 bounce does not revoke entitlement
DLV-005 report generation failure keeps purchase
DLV-006 report requeue idempotent
DLV-007 download signed URL expires
DLV-008 bucket object inaccessible publicly
DLV-009 click tracking off on magic link
DLV-010 old ReportVersion remains immutable
```

---

# 181. CONSUMER-LAW TESTS

After counsel approves exact flow:

```text
COM-LAW-001 total price visible
COM-LAW-002 one-time nature visible
COM-LAW-003 no prechecked statutory consent
COM-LAW-004 required immediate-performance consent captured
COM-LAW-005 acknowledgement version stored
COM-LAW-006 Terms/disclosure versions frozen
COM-LAW-007 durable confirmation sent
COM-LAW-008 report PromiseSnapshot preserved
COM-LAW-009 refund/withdrawal support path correct
COM-LAW-010 no subscription implication
```

---

# 182. TAX / INVOICE TESTS

After adviser policy:

```text
TAX-001 integer amount
TAX-002 PLN offer
TAX-003 tax breakdown matches configured rule
TAX-004 B2C invoice request optional
TAX-005 business invoice path policy
TAX-006 no mandatory KSeF call for B2C
TAX-007 accounting export consistent
```

---

# 183. END-TO-END FLOW — STANDARD PURCHASE

```text
PremiumEligibility ELIGIBLE
↓
Offer
↓
Pre-checkout email/disclosure
↓
Order + PromiseSnapshot
↓
Stripe Checkout
↓
BLIK/card/wallet
↓
browser return = confirming
↓
Stripe verified webhook
↓
Order PAID
↓
Entitlement ACTIVE
↓
receipt
↓
Report fulfilling
↓
Report READY
↓
report-ready email
↓
magic-link/session
↓
report opened
```

---

# 184. E2E — USER CLOSES BROWSER

```text
Stripe payment succeeds
user closes browser
↓
webhook still processed
↓
Entitlement granted
↓
receipt/report email sent
↓
user recovers via email
```

Critical test.

---

# 185. E2E — PAYMENT SUCCESS / REPORT FAILURE

```text
payment verified
↓
Entitlement ACTIVE
↓
Report FAILED
↓
receipt already delivered
↓
support/retry
↓
no second charge
```

---

# 186. E2E — DUPLICATE WEBHOOK

Same provider event twice.

Expected:

```text
one Order PAID transition
one Entitlement
one receipt
one purchase analytics event
```

---

# 187. E2E — EMAIL BOUNCE

```text
purchase
↓
email bounce
↓
entitlement intact
↓
current browser can access
↓
email correction/support
```

---

# 188. E2E — DUPLICATE PURCHASE

Known CustomerIdentity attempts same report.

Expected:

```text
existing entitlement
→ Open report
```

If duplicate provider payment somehow occurred:

```text
refund duplicate only
```

---

# 189. E2E — WITHDRAWAL

Execute against counsel-approved test policy.

Must cover:

- consent absent;
- consent present;
- report delivered;
- request within statutory window;
- voluntary refund path.

Do not implement from assumptions.

---

# 190. OBSERVABILITY

Operational metrics:

```text
checkout_session_create_success
checkout_session_create_latency

payment_pending_count
payment_success_count
payment_failure_count

webhook_signature_failures
webhook_duplicate_rate
webhook_processing_lag

paid_order_without_entitlement
entitlement_without_paid_order

purchase_to_report_ready_duration
report_generation_failure

receipt_delivery_failure
report_ready_email_failure

refund_failure
reconciliation_mismatch
```

---

# 191. COMMERCE ALERTS

Critical:

```text
PAID Orders without ACTIVE entitlement > 0
ACTIVE entitlement without paid/manual grant source
amount/currency mismatch
webhook signature failures spike
report failures for paid orders spike
public report storage exposure
refund/provider mismatch
```

---

# 192. SLO MEASUREMENT

Measure before setting final SLO:

```text
CheckoutSession creation p50/p95
verified webhook → Entitlement p50/p95
purchase → Report READY
Report READY → email queued/sent
recovery link request → email queued
```

No invented SLA.

---

# 193. COMMERCE INCIDENT PLAYBOOK

## Scenario: provider says paid, Name Atlas Order not paid

1. alert/reconciliation detects;
2. identify provider payment;
3. verify amount/currency/signature/object;
4. lock Order;
5. apply idempotent paid transition;
6. grant Entitlement;
7. trigger fulfillment/receipt;
8. audit;
9. determine affected customers;
10. add regression test.

## Scenario: Entitlement granted without valid payment

1. disable access if unauthorized;
2. preserve audit;
3. investigate source: webhook/admin/bug;
4. correct Order/Entitlement;
5. security review if authorization defect;
6. notify if personal-data exposure occurred.

## Scenario: paid report generation outage

1. keep Entitlements;
2. pause new offer if fulfillment system materially impaired;
3. retry jobs;
4. notify users if delay meaningful;
5. support/refund per policy.

---

# 194. TOP 20 PAYMENT RISKS

1. Browser return grants Entitlement.
2. Duplicate webhook duplicates entitlement.
3. Provider paid but DB not updated.
4. Wrong amount accepted.
5. Wrong currency accepted.
6. Forged webhook.
7. Replayed webhook.
8. Out-of-order event regresses payment state.
9. Price changes mid-checkout.
10. Duplicate purchase.
11. Raw card/payment secrets in Name Atlas logs.
12. Incorrect VAT/tax.
13. Invalid consumer-withdrawal implementation.
14. Report fails after payment.
15. Email typo blocks recovery.
16. Magic-link bearer token leaked.
17. Refund revokes wrong report.
18. Chargeback ignored.
19. Stripe/accounting/order reconciliation divergence.
20. Rights change makes promised paid content unavailable.

---

# 195. TOP 20 DELIVERY / ENTITLEMENT RISKS

1. Report IDOR.
2. Entitlement bypass.
3. Magic-link replay.
4. Permanent bearer report link.
5. Public report bucket.
6. Email bounce treated as lost purchase.
7. Session expiry treated as Entitlement loss.
8. Report retry creates duplicate inconsistent versions.
9. Purchased V1 overwritten.
10. Entitlement tied to wrong email.
11. Account merge loses Entitlements.
12. Refund revokes all reports.
13. Report-ready email sent too early.
14. Permanent download URL.
15. Support grant has no audit.
16. Rights-blocked asset remains downloadable.
17. Updated report silently replaces purchased version.
18. User deletion destroys statutory Order record.
19. Deleted identity leaves active tokens.
20. Premium report content captured by analytics/session replay.

---

# 196. TOP 15 CONSUMER-LAW / TAX OPEN QUESTIONS

1. Exact legal classification: digital content, service, or mixed supply.
2. Exact Polish withdrawal-right implementation.
3. Exact wording for immediate performance.
4. Durable-medium confirmation content.
5. Lack-of-conformity remedies for report defects.
6. Voluntary refund policy vs statutory rights.
7. Polish VAT classification/rate.
8. Whether Name Atlas qualifies as electronically supplied service for VAT.
9. EU B2C OSS obligations at planned volume/market.
10. Evidence needed for customer VAT location if cross-border.
11. Polish cash-register/fiscalization obligations/exemptions.
12. When B2C invoice must be supplied on request.
13. B2B invoice/KSeF behavior if NIP invoice option added.
14. Accounting retention requirements.
15. Merchant-of-record economics/legal effect for global expansion.

All require professional review before relevant functionality ships.

---

# 197. PAYMENT PROVIDER MIGRATION TRIGGERS

Reassess Stripe if:

```text
payment processing cost exceeds defined share of report margin
BLIK failure/abandonment materially worse than alternative
Poland-local conversion underperforms
global tax compliance becomes main bottleneck
refund/dispute operations poor
provider outage/support becomes material
Mollie/PayU offers materially superior economics
volume supports Adyen/custom pricing
```

Migration plan:

```text
new provider adapter
shadow/test
new Checkout only
old Orders retain old provider IDs
webhooks coexist during migration
reconciliation per provider
```

Never rewrite historical provider references.

---

# 198. P0 PAYMENT ARCHITECTURE — FINAL

```text
PremiumEligibility
↓
Offer
↓
Name Atlas Pre-checkout
  email
  product
  scope
  price
  legal acknowledgements
↓
Order
↓
PurchasePromiseSnapshot
↓
PaymentAttempt
↓
Stripe-hosted Checkout
↓
Verified Stripe Webhook
↓
Order PAID
↓
CustomerIdentity
↓
Entitlement ACTIVE
↓
Runtime Report Fulfillment
↓
ReportVersion READY
↓
Resend receipt/report email
↓
Magic link → secure session
↓
Authorized report
```

---

# 199. P0 CHECKOUT UX — FINAL

Mobile-first:

```text
Name Atlas — Full Surname Report
[SURNAME]

Actual report sections / Discovery summary

29 zł · one-time
No subscription

Email for report delivery
[________________]

Required consumer-law acknowledgement
[ ] only if counsel-approved/required

Continue to secure payment

Terms · Privacy · Refund/withdrawal information
```

Provider page:

```text
BLIK
Apple Pay / Google Pay where available
card
Przelewy24
```

No coupon field P0.

No account.

No family questions.

---

# 200. P0 ORDER / ENTITLEMENT MODEL — FINAL

Must implement:

```text
CustomerIdentity
Offer
Order
PurchasePromiseSnapshot
PaymentAttempt
CheckoutSession
PaymentWebhookEvent
Entitlement
Refund
Report
ReportVersion
MagicLinkToken
```

Reuse:

```text
AuditEvent
Outbox
ExperimentAssignment
```

from prior docs.

---

# 201. P0 REPORT DELIVERY — FINAL

1. Verified payment.
2. Order `PAID`.
3. Entitlement `ACTIVE`.
4. Send receipt.
5. Fulfill report.
6. QA against PurchasePromiseSnapshot.
7. ReportVersion `READY`.
8. Send report-ready email.
9. Magic-link authentication exchange.
10. Secure report.
11. Optional signed PDF.

Email failure does not change payment/entitlement.

---

# 202. P0 REFUND / RECOVERY — FINAL

Refund:

```text
support/customer request
↓
policy/legal evaluation
↓
provider refund
↓
Refund state
↓
Entitlement effect
↓
confirmation
↓
reconciliation
```

Recovery:

```text
lost session
↓
email input
↓
generic response
↓
magic link if entitlement exists
↓
secure session
↓
report
```

---

# 203. P0 RECONCILIATION — FINAL

Daily:

```text
Orders
↔ Stripe payments
↔ refunds/disputes
↔ provider settlement/balance
```

Alert on any mismatch.

Finance/accounting export is provider/order derived, not PostHog.

---

# 204. P1 COMMERCE

Later:

- EUR/multiple currencies;
- Family Origin;
- Deep Research scoped-service commerce;
- gift reports;
- recipient entitlements;
- customer portal;
- self-service refund request;
- promo codes;
- invoice automation/KSeF where needed;
- OSS/global tax automation;
- updated reports;
- second PSP or MoR if justified.

---

# 205. DO NOT BUILD YET

1. Subscription.
2. Credits.
3. Stored wallet/balance.
4. Custom card vault.
5. Multi-PSP smart routing.
6. Custom fraud ML.
7. Complex promotions.
8. Loyalty.
9. Marketplace payouts.
10. Genealogist marketplace payments.
11. Family plan billing.
12. In-app currency.
13. Full custom tax engine.
14. Mandatory account.
15. Permanent magic-link bearer URLs.

---

# 206. MODEL CHANGE PROPOSALS — FINAL

## 20-A — `CustomerIdentity`

**P0 ACCEPT.**

Allows guest purchase → magic access → optional account.

## 20-B — `PaymentAttempt`

**P0 ACCEPT.**

Allows retries without duplicate logical Orders.

## 20-C — `PaymentWebhookEvent`

**P0 ACCEPT.**

Required for secure idempotent provider event handling.

## 20-D — `PurchasePromiseSnapshot`

**P0 STRONGLY ACCEPT.**

Critical consumer-truth bridge.

## 20-E — `WithdrawalConsentRecord`

**P0 CONDITIONAL.**

Implement after counsel confirms legal flow/classification.

## 20-F — `CommerceCountryPack`

**P1.**

Use versioned PL config P0.

## 20-G — dedicated `ReportFulfillment`

**DEFER P1.**

Derive from Order + Report state P0.

## 20-H — commerce status/access recovery API

**P0 ACCEPT.**

Add:

```http
GET  /api/v1/commerce/orders/{public_order_reference}/status
POST /api/v1/report-access-links
```

---

# 207. DECISION REGISTER

## Payment provider

**Decision:** Stripe.  
**Alternative:** Mollie / PayU / Adyen.  
**Why:** Polish methods + global architecture + Checkout/webhooks.  
**Risk:** not cheapest local BLIK rate.  
**Follow-up:** measure conversion/economics.

## PSP vs MoR

**Decision:** PSP P0.  
**Alternative:** Paddle / Stripe Managed Payments.  
**Why:** lower low-ticket fee burden and market simplicity.  
**Tax/legal review:** YES.

## Checkout

**Decision:** Stripe-hosted redirect.

## Payment methods

**Decision:** enable BLIK, wallets, cards, P24 when eligible.

## PCI

**Decision:** no raw card data; hosted checkout.  
**Review:** confirm exact SAQ requirements with provider/acquirer.

## Guest checkout

**Decision:** yes.

## Email

**Decision:** required for delivery/recovery, no forced account.

## Customer identity

**Decision:** email-backed CustomerIdentity.

## Browser return

**Decision:** informational only.

## Webhook

**Decision:** canonical payment signal.

## Entitlement

**Decision:** server-granted after verified success.

## Report

**Decision:** independent fulfillment pipeline.

## Email provider

**Decision:** Resend P0; SES migration option.

## Magic link

**Decision:** single-use login exchange → session.

## Report version

**Decision:** immutable.

## Purchase promise

**Decision:** frozen snapshot.

## Refund

**Decision:** explicit object, idempotent, order-scoped entitlement effects.

## KSeF

**Decision:** no P0 B2C KSeF API solely for consumer invoice flow.  
**Review:** accountant for B2B/invoice expansion.

## VAT/OSS

**Decision:** configurable, adviser-gated, not guessed.

## Withdrawal

**Decision:** counsel-approved pre-checkout affirmative flow if legally required.

## Price experiments

**Decision:** frozen in Offer/Order; visitor assignment stable.

---

# 208. DEFINITION OF COMMERCE READY

Paid MVP may launch only when all are true.

## Offer

- PremiumEligibility is mandatory.
- DiscoveryIndex is ready.
- paid rights pass.
- Offer price/product/version comes from backend.
- PurchasePromiseSnapshot freezes what was sold.

## Checkout

- guest checkout works;
- email purpose is explicit;
- no forced account;
- price/currency/one-time nature are clear;
- legal consumer disclosures are counsel-approved;
- idempotency works;
- Stripe-hosted Checkout is production configured;
- BLIK/cards/wallets/P24 have been tested in provider environment/production readiness.

## Payment

- browser return cannot grant Entitlement;
- webhook signature verification works on raw body;
- duplicate events are safe;
- event ordering is not assumed;
- amount/currency/order are verified;
- Order and PaymentStatus are distinct;
- provider secrets are server-only;
- PCI scope is confirmed.

## Entitlement

- created exactly once;
- valid paid state required;
- report ID never authorizes;
- refund/dispute behavior defined;
- manual grant audited.

## Report

- payment/report pipelines are separate;
- report failure preserves purchase;
- PromiseSnapshot QA exists;
- ReportVersion immutable;
- private storage/access;
- rights-change remediation possible.

## Delivery

- receipt sends after PAID;
- report-ready sends after READY;
- magic link is secure and short-lived;
- bounce preserves entitlement;
- access recovery is non-enumerating;
- magic link absent from analytics/logs.

## Finance

- Refund object exists;
- reconciliation runs;
- provider/order mismatches alert;
- accounting export exists;
- VAT/tax/KSeF/fiscalization decisions have professional sign-off.

## QA

- Prompt 17/19/20 payment, security, consumer-law and entitlement tests pass.

---

# 209. INPUTS REQUIRED BY PROMPT 21

Prompt 21 — SEO / Programmatic Acquisition — receives stable public commerce boundaries:

```text
PremiumEligibility
Offer availability
public price presentation policy
```

SEO must not:

```text
index Checkout
index Order
index Entitlement
index premium Report
index CustomerIdentity
index report-access URLs
```

SEO surname pages may display:

- truthful public profile;
- public Discovery preview;
- current public Offer only where product policy permits.

Price experiments must not create inconsistent indexable pages or leak personalized/visitor price assignments into canonical SEO.

---

# 210. CURRENT AUTHORITATIVE REFERENCE INDEX

## Stripe

- Pricing Poland: https://stripe.com/en-pl/pricing
- Local payment methods: https://stripe.com/en-pl/pricing/local-payment-methods
- Checkout: https://docs.stripe.com/payments/checkout
- Webhooks: https://docs.stripe.com/webhooks

## Mollie

- Poland pricing: https://www.mollie.com/pl/pricing
- Payment methods: https://www.mollie.com/pl/payments/payment-methods
- BLIK: https://www.mollie.com/pl/payments/blik
- Apple Pay: https://www.mollie.com/pl/payments/apple-pay

## PCI

- PCI SSC: https://www.pcisecuritystandards.org/

## Polish consumer law

- UOKiK special digital contracts: https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/umowy-szczegolne/
- UOKiK exclusions: https://prawakonsumenta.uokik.gov.pl/prawo-odstapienia-od-umowy/wylaczenia-prawa-do-odstapienia/
- UOKiK information duties: https://prawakonsumenta.uokik.gov.pl/pytania-i-odpowiedzi/prawo-do-informacji/
- Directive 2019/770: https://eur-lex.europa.eu/eli/dir/2019/770/oj

## VAT / OSS

- European Commission One Stop Shop: https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en

## KSeF

- KSeF questions: https://ksef.podatki.gov.pl/pytania-i-odpowiedzi-ksef-20/
- 2026 B2C clarification: https://ksef.podatki.gov.pl/wyjasnienia/co-warto-wiedziec-przed-startem-ii-etapu-wdrozenia-krajowego-systemu-e-faktur/

## Resend

- Pricing: https://resend.com/pricing
- DPA: https://resend.com/legal/dpa
- Webhook verification: https://resend.com/docs/webhooks/verify-webhooks-requests

## Amazon SES

- Pricing: https://aws.amazon.com/ses/pricing/
- Regional endpoints: https://docs.aws.amazon.com/general/latest/gr/ses.html

---

# 211. FINAL ARCHITECTURE

```text
                       SURNAME PROFILE
                             │
                             ▼
                    PREMIUM ELIGIBILITY
                             │
                             ▼
                            OFFER
                             │
                             ▼
                  NAME ATLAS PRE-CHECKOUT
               email + scope + legal disclosure
                             │
                             ▼
                            ORDER
                             │
                 ┌───────────┴────────────┐
                 ▼                        ▼
        PurchasePromiseSnapshot      PaymentAttempt
                                          │
                                          ▼
                                  STRIPE CHECKOUT
                                          │
                        ┌─────────────────┴─────────────────┐
                        ▼                                   ▼
                  BROWSER RETURN                        WEBHOOK
                 "confirming..."                           │
                                                          ▼
                                                VERIFY / DEDUPE
                                                          │
                                                          ▼
                                                       ORDER PAID
                                                          │
                                                          ▼
                                                     ENTITLEMENT
                                                          │
                                    ┌─────────────────────┼────────────────────┐
                                    ▼                     ▼                    ▼
                                RECEIPT             REPORT RUNTIME         ANALYTICS
                                                          │
                                                          ▼
                                                     REPORT VERSION
                                                          │
                                                          ▼
                                                       READY
                                                          │
                                    ┌─────────────────────┴────────────────┐
                                    ▼                                      ▼
                            REPORT-READY EMAIL                       MAGIC ACCESS
                                                                           │
                                                                           ▼
                                                                    SECURE SESSION
                                                                           │
                                                                           ▼
                                                                   AUTHORIZED REPORT
```

Side paths:

```text
FAILED PAYMENT
REFUND
DISPUTE
CHARGEBACK
RECONCILIATION
EMAIL BOUNCE
REPORT FAILURE
RIGHTS CHANGE
SUPPORT
```

---

# 212. FINAL RECOMMENDATION

Name Atlas commerce should be intentionally boring at the money boundary.

The product can be emotionally rich.

The payment system should not be.

Its job is to guarantee:

```text
the price the user saw
=
the price charged

the report scope the user saw
=
the report scope recorded

the payment provider says succeeded
=
the Order becomes paid

the paid Order
=
one durable Entitlement

the Entitlement
=
authorized access

a technical failure
≠
lost purchase
```

The best P0 system is therefore:

> **Stripe-hosted guest checkout + verified webhook + immutable Order/Promise snapshot + durable Entitlement + asynchronous report fulfillment + Resend transactional delivery + single-use magic-link session access + daily finance reconciliation.**

The most important new object introduced by commerce is not a payment object.

It is:

```text
PurchasePromiseSnapshot
```

because it connects the Name Atlas evidence-first product architecture to consumer commerce.

It answers:

> **What exactly did we tell this person they were buying?**

That lets the system determine later whether:

- the report fulfilled the sale;
- a technical failure needs remediation;
- a refund complaint is justified;
- a rights change affected purchased content;
- an updated report is different from the original.

That is the correct commerce counterpart to Name Atlas's broader rule:

> **Evidence before narrative.**

For payments:

> **Verified state before entitlement.**

For delivery:

> **Entitlement before access.**

For consumer trust:

> **Promise before payment — and proof that the promise was fulfilled.**
