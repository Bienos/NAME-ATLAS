# PRODUCT.md — Name Atlas product truth

Durable product definition. No implementation status, no session history — those live in `STATUS.md` and `docs/progress/`.

Authority: `docs/canonical/10` (MVP contract), `docs/canonical/23` (paid MVP scope), `docs/canonical/19` (privacy boundary).

## 1. Problem

People who search their surname want to know where it comes from and what it says about their family's past. What they get today is either:

- thin, unsourced surname pages that assert an etymology with no evidence, or
- serious genealogical research that requires skill, time and archive access they do not have.

There is no product that gives a Polish surname an honest, sourced, current-and-historical answer — including an honest "we do not know" — without pretending to have identified the user's actual ancestors.

## 2. Target user

Primary: a Polish or Polish-diaspora adult with non-expert curiosity about their surname, arriving from search or social, on mobile, with no intention of learning genealogy.

Secondary: hobbyist genealogists who need a sourced surname-level starting point and will judge the product on whether its citations hold up.

Not the target at MVP: professional genealogists, institutional researchers, person-level record hunters.

## 3. MVP promise — surname level

Name Atlas MVP is a **surname-level** product. It answers questions about the surname as an entity, never about the user's specific family line.

For a resolved Polish surname the product promises:

- what the surname is, canonically, with the user's original input preserved;
- how many living people currently carry it in Poland, with the dataset, its scope and its date;
- how rare that makes it, where the arithmetic is methodologically valid;
- what the surname appears to mean and where it appears to come from, where evidence supports it;
- at least one genuine historical dimension where evidence supports it;
- the confidence in every interpretive statement, and the sources behind it;
- an explicit, honest statement where any of the above is unavailable.

The product never converts absence of evidence into a plausible story.

## 4. Primary user journey

```text
enter a surname
↓
safe resolution (exact, accepted form, clarification, or unresolved)
↓
current national count + dataset scope and date
↓
rarity context where valid
↓
meaning / origin where evidence supports it
↓
historical dimension where evidence supports it
↓
confidence + sources on every claim
↓
honest limitations where data does not exist
↓
truthful inventory of what deeper research would actually contain
↓
premium offer only if that inventory is genuinely non-trivial
```

## 5. Free scope

The free experience must meaningfully answer the first question. It is not a teaser followed by a lock.

For a sufficiently covered surname, free includes:

- current existence and national count, with source and snapshot date;
- rarity context;
- current geography **only if** a lawful, genuinely current regional dataset exists;
- basic origin/meaning where evidence supports it;
- confidence and sources;
- one genuine historical dimension where evidence supports it;
- an explicit low-data state where an element is unsupported.

If an expected element is unsupported, the free result compresses and says so. It does not manufacture a replacement.

Approved 2026-09-30 as a free, post-M2 feature (TASK-040 §13 U-1): a `noindex` family surnames view that shows this free result for up to four surnames on one page. It adds no data and no value across surnames, and it never sends or stores which surnames were entered together.

## 6. Premium scope

Premium sells **depth and synthesis**, never the answer already promised free.

When supported by evidence, a premium report may contain: expanded historical variants and their chronology; historical occurrences and places; source-attested historical layers; an archive reference index; deeper comparison of competing origin hypotheses; diaspora evidence; surname-level geographic change over time; migration clues only where evidence supports that framing; a full source and methodology appendix.

Rules:

- Premium is offered **only** when coverage and the DiscoveryIndex show real inventory exists for that surname.
- The report is an immutable, versioned artifact with claim references and citations.
- A premium report never implies anything about the buyer's specific family.
- One-time guest purchase. No subscription, no credits, no tiers at MVP.

## 7. Trust and evidence rules

These are product promises, not implementation details.

1. Every published fact traces to a source: `Source → SourceRecord → EvidenceItem → Claim → ConfidenceAssessment → Citation`.
2. Every interpretive statement carries a confidence status: `VERIFIED`, `LIKELY`, `POSSIBLE`, `UNCONFIRMED`, `CONFLICTING`, `INSUFFICIENT_DATA`.
3. **Confidence is epistemic only.** Rights and licensing decide *where* something may be shown, never *how true* it is.
4. Absence is not zero. A surname missing from a dataset that omits single occurrences is not a surname with zero bearers.
5. Dataset scope and date are always shown with a count. A national count is never presented as regional distribution.
6. Competing origin hypotheses are presented as competing, not resolved.
7. `INSUFFICIENT_DATA` is a valid, shippable product state and is preferred over a generated guess.
8. No ethnicity, religion or other sensitive identity is inferred from a surname.
9. Public surname knowledge and private family data are separate domains. The public surname cache never contains a user↔family association.

## 8. Explicit non-goals

Not in the surname MVP, and not on its critical path:

1. Automatic ancestor identification or confirmed family relationships.
2. Family tree construction, FamilyBranch, person-level record matching.
3. DNA ingestion or interpretation.
4. Guaranteed family migration routes.
5. Coat-of-arms or noble-descent claims from a surname.
6. Broad living-person discovery.
7. Autonomous deep family research.
8. Ingestion from sources whose terms prohibit or do not clearly permit it.
9. Global country coverage; multi-country production ingestion.
10. Animated historical maps where data cannot support comparable time layers.
11. Subscriptions, credits, gifts, physical products, marketplace.
12. Session replay, ML propensity models, custom fraud engines.
13. Native mobile apps.
14. Global programmatic SEO / thin page generation at scale.

Family Origin and person-level research remain architectural extension points, not deliverables.

## 9. Definition of production-ready

The paid MVP is production-ready when all of the following hold:

- a user can enter a surname, receive a safe resolution, lawful current data, evidence-backed insights, honest limitations, a truthful DiscoveryIndex, and — if eligible — a premium offer, a one-time payment, durable report access and an email recovery path;
- every published claim has evidence, confidence and a citation;
- every production source has an approved `RightsProfile`; `commercial_use = UNKNOWN` blocks paid use;
- privacy, security, source-rights and consumer-law gates have passed as release gates, not advisory notes;
- premium inventory has been demonstrated on a representative surname corpus *before* the commerce system was built;
- the golden corpus and critical E2E paths pass in CI;
- failure, retry and recovery paths for payment and delivery are tested.

## 10. Unresolved external product/data dependencies

Tracked in detail in `docs/DECISIONS_NEEDED.md`. Summary of what is outside engineering control:

- **Current regional surname geography** — no lawful, genuinely current regional dataset is established. The current map stays conditional; it must never be faked by distributing a national total across regions using old proportions.
- **Polish onomastics / etymology rights** — IJP PAN is the strongest specialist source but commercial bulk reuse is unconfirmed, and its frequency/geography base is 2014. Fallback is claim-by-claim evidence from lawful scholarly/public-domain sources, or `INSUFFICIENT_DATA`.
- **Historical source rights** — Polona is the highest-value open historical source, but metadata, OCR/transcription and image rights differ per object and must be modelled separately.
- **Genealogy databases** (Geneteka/PTG, GenBaza, FamilySearch, JRI-Poland, commercial sites) — partnership or written permission only; several are explicitly blocked for automated ingestion.
- **Commerce/legal** — payment provider account, tax treatment, consumer digital-content terms and privacy review must be resolved before the commerce milestone, not during it.

None of these block the first current-count vertical slice.
