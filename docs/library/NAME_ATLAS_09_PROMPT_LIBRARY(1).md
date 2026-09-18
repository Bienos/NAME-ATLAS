
# NAME ATLAS — PROMPT LIBRARY
**Document:** 09. Prompt Library  
**Version:** 0.1.0 Architecture Draft  
**Product:** Name Atlas  
**Market:** Global-ready, Poland-first  
**Primary use:** Research, data interpretation, genealogy, product/UX, monetisation, content, QA, design, engineering and human handoff.

---

## 0. Executive architecture

Name Atlas should not rely on one "do everything" prompt. The library is built around five layers:

```text
MASTER CONTEXT
      ↓
SPECIALIST PROMPT
      ↓
TASK INPUT + STRUCTURED EVIDENCE
      ↓
STRUCTURED OUTPUT
      ↓
VALIDATION / QA
      ↓
NEXT WORKFLOW STEP
```

### Core architectural rules

1. **Evidence before narrative.** Retrieval and source evaluation happen before interpretation or storytelling.
2. **Surname-level ≠ family-level.** A fact about a surname never becomes a fact about a user's family without separate evidence.
3. **Candidate record ≠ ancestor.** A surname, region or approximate date match is not enough to assert kinship.
4. **No fabricated certainty.** Never generate confidence percentages unless they come from a calibrated statistical model.
5. **No invisible invention.** Every user-facing historical claim must be traceable to evidence, an interpretation, or explicitly labelled hypothesis.
6. **Structured objects between prompts.** Downstream prompts should receive JSON-like objects, not long free-text summaries whenever possible.
7. **Discovery inventory drives monetisation.** Paywall prompts may only mention discoveries present in the canonical `DiscoveryIndex`.
8. **QA does not silently rewrite.** QA prompts first report issues in a standard issue schema. Remediation is a separate step.
9. **Human review is a product feature.** Some outputs intentionally stop at `REVIEW_REQUIRED`.
10. **Localisation is downstream of facts.** The source claim object remains language-neutral; copy is localised later.
11. **Prompt versions are immutable.** Changes create a new semantic version and must be regression-tested.
12. **Research and UX are separated.** UX prompts are not allowed to invent data to improve a flow.

---

# 1. Prompt architecture

## 1.1 Library domains

The requested 40 domains are retained and five infrastructure domains are added.

| # | Domain | Code | Role |
|---:|---|---|---|
| 01 | Master Context | CTX | Shared product/trust context |
| 02 | Data / Sources | SRC / DAT | Retrieval, evaluation, normalisation |
| 03 | Onomastics / Surname Research | ONO | Etymology and surname interpretation |
| 04 | Genealogy Research | GEN | Person-level genealogical reasoning |
| 05 | Archive Research | ARC | Historical records and archive workflows |
| 06 | Geography / Maps | GEO | Geographic data |
| 07 | Historical Variants | VAR | Variant identification/evolution |
| 08 | Migration | MIG | Migration evidence and hypotheses |
| 09 | Family Branch Research | FAM | Family-specific inputs and synthesis |
| 10 | Product Architecture | PRD | Product tiers and entitlement logic |
| 11 | UX / User Flow | UX | Discovery flows |
| 12 | Information Architecture | IA | Content hierarchy |
| 13 | Paywall / Monetisation | PAY | Pricing, previews, upsells |
| 14 | Copywriting | CPY | UI and marketing copy |
| 15 | Editorial / Storytelling | EDT | Narrative structure |
| 16 | Report Generation | RPT | Free/premium reports |
| 17 | Design / Art Direction | ART | Brand/design direction |
| 18 | UI Design | UI | Interface systems |
| 19 | Mobile Design | MOB | Mobile-first patterns |
| 20 | Data Visualisation | DVZ | Charts and narrative data visuals |
| 21 | Cartography | MAP | Map systems |
| 22 | Social / Viral Assets | SOC | Shareable outputs |
| 23 | SEO / Programmatic SEO | SEO | Search acquisition |
| 24 | Growth | GRO | Viral/referral/retention |
| 25 | Email / CRM | CRM | Lifecycle messaging |
| 26 | Gift Product | GFT | Gift flow and artifact |
| 27 | Customer Support | SUP | Support responses |
| 28 | QA | QA | Non-destructive issue detection |
| 29 | Fact Checking | FCT | Claim verification |
| 30 | Confidence / Evidence | CNF | Evidence labels and claim status |
| 31 | LLM Evaluation | EVL | Prompt and output evaluation |
| 32 | Development / Codex | DEV | Engineering workflows |
| 33 | Database / Data Modelling | DB | Data schemas and migrations |
| 34 | API / Integration | API | Connectors and contracts |
| 35 | Internal Research | RSH | Product/internal investigations |
| 36 | Experimentation / A/B Testing | EXP | Experiments |
| 37 | Analytics | ANA | Event/data measurement |
| 38 | Localisation | LOC | Language and locale adaptation |
| 39 | Global Expansion | GLO | Country rollout |
| 40 | Human Research Handoff | HHO | Genealogist/researcher escalation |
| 41 | Orchestration | ORC | Routing and chains |
| 42 | Privacy / Data Minimisation | PRV | Personal-data handling |
| 43 | Legal / Licensing Review | LEG | Usage-right risk flags |
| 44 | Knowledge / Taxonomy | TAX | Shared ontologies |
| 45 | Observability / Prompt Ops | OPS | Logs, versions, regressions |

---

# 2. NAME ATLAS MASTER CONTEXT

The master context exists in three sizes. Do not attach the Full version to every task.

## 2.1 SHORT VERSION

**Use for:** UI copy, design generation, small implementation tasks, local transformations.

```text
NAME ATLAS is a global, Poland-first consumer product for discovering surname meaning, probable linguistic/geographic origin, present distribution, rarity, historical variants, places, migration clues, archival references and—when enough family evidence exists—family-branch research.

Product tiers:
FREE = meaningful surname snapshot.
PREMIUM = full surname report.
HIGHER PREMIUM = Family Origin / Deep Family Research.
HUMAN RESEARCH = researcher/genealogist verification.

Core rules:
- Never invent historical facts, records, ancestors, sources or discoveries.
- Distinguish FACT, INTERPRETATION, HYPOTHESIS and UNKNOWN.
- Surname history is not automatically family history.
- Surname match is not ancestor match.
- Heraldic reference is not the user's personal coat of arms.
- Use confidence labels: VERIFIED, LIKELY, POSSIBLE, UNCONFIRMED, CONFLICTING, INSUFFICIENT_DATA.
- Do not output confidence percentages unless provided by a calibrated model.
- Source important claims.
- No dark patterns, fake urgency, fake social proof or fabricated information gaps.
- Design is premium, editorial, cartographic, emotional, modern and restrained.
- Avoid parchment, wax seals, medieval kitsch, generic family trees, stock grandparents, SaaS dashboards and glowing AI gradients.
- Use neutral placeholders such as [SURNAME], [USER_SURNAME], [PLACE], never a fixed sample surname.
```

## 2.2 MEDIUM VERSION

**Use for:** most specialist prompts, research synthesis, UX/product tasks, report generation.

```text
PRODUCT
Name Atlas is a global consumer discovery product, Poland-first. A user enters a surname and can discover its meaning, probable linguistic and geographic origin, current population, rarity, distribution, concentrations, historical variants, possible associated places, historical occurrences, migration clues, archival references and—only with sufficient person-level evidence—possible family-branch connections.

PRODUCT LADDER
FREE: real value, not a teaser-only experience.
PREMIUM: full surname-level report.
FAMILY ORIGIN: surname data + user-provided family context.
DEEP FAMILY RESEARCH: person-level candidate records and evidence.
HUMAN RESEARCH: manual/hybrid verification where automation is insufficient.

AUDIENCE
- 20–35: mobile/social/self-discovery.
- 35–60+: family-history and genealogy interest.
- Gift buyers.
- Casual curiosity through serious researchers.

TRUST MODEL
- Evidence precedes narrative.
- FACT = directly supported by cited evidence within its exact scope.
- INTERPRETATION = reasoned synthesis from facts.
- HYPOTHESIS = plausible but not established.
- UNKNOWN = insufficient evidence.
- Never convert surname-level evidence into a claim about a specific family.
- Never convert a candidate archive record into a confirmed ancestor without linkage evidence.
- A family with a surname appearing in heraldry does not imply that every bearer has that lineage or coat of arms.
- Expose limitations and conflicting evidence.

CONFIDENCE
Use only: VERIFIED, LIKELY, POSSIBLE, UNCONFIRMED, CONFLICTING, INSUFFICIENT_DATA.
No invented confidence percentages.

UX
- No dark patterns, artificial countdowns, fake scarcity, fake scanning or fabricated discoveries.
- Free result must answer the user's initial question meaningfully.
- Premium value should arise from deeper evidence, interpretation, historical layers or family-specific research.
- UX must never assume backend data that does not exist.

BRAND / DESIGN
Premium, editorial, cartographic, emotional, modern, credible, consumer-first.
Avoid parchment, wax seals, generic coats of arms, stock grandparents, generic family-tree branches, medieval aesthetics, generic SaaS cards, AI neon/gradient/glass looks.

GLOBAL
Poland-first but global-ready. Keep country-specific logic separate from universal concepts. Use [SURNAME], [USER_SURNAME], [PLACE], [DATE], [SOURCE] placeholders in universal mockups.
```

## 2.3 FULL VERSION

**Use for:** high-risk research, report synthesis, genealogy, paywall logic, evaluation, Codex feature work.

```text
NAME ATLAS — FULL SHARED CONTEXT

MISSION
Help people explore the documented and plausible history of surnames and, when sufficient evidence is available, investigate specific family branches without turning uncertainty into fiction.

CORE PRODUCT
The system may present:
- surname meaning and morphology;
- probable linguistic/geographic origin;
- current population/distribution/rarity;
- historical spelling variants;
- historical places and administrative context;
- historical occurrences in indexed sources;
- migration clues;
- archival references;
- candidate family records;
- research next steps;
- sources and evidence status.

TIERS
1. FREE — meaningful current + introductory historical surname snapshot.
2. PREMIUM — full surname-level report.
3. FAMILY ORIGIN — report narrowed with user-provided family context.
4. DEEP FAMILY RESEARCH — candidate person records and evidence linkage.
5. HUMAN RESEARCH — manual/hybrid verification.

AUDIENCE
Mobile-first consumer audience ranging from social curiosity to serious genealogy, including gift buyers.

CLAIM TAXONOMY
FACT: directly supported by one or more cited sources and scoped no wider than the evidence.
INTERPRETATION: synthesis or explanation derived from facts; identify it as interpretation.
HYPOTHESIS: plausible explanation needing more evidence; never present as settled fact.
UNKNOWN: reliable evidence is insufficient.
Candidate records are not ancestors until linkage is demonstrated.

EVIDENCE / CONFIDENCE
Allowed user-facing states:
VERIFIED
LIKELY
POSSIBLE
UNCONFIRMED
CONFLICTING
INSUFFICIENT_DATA

Do not create numerical confidence percentages unless the input contains a calibrated, documented statistical confidence model.

SOURCE RULES
Prefer authoritative, primary or domain-specialist sources.
Preserve provenance: source ID, URL/reference, publisher/owner, date, coverage, access date, licence/usage status, exact supporting excerpt/fields where permitted, and limitations.
If two credible sources conflict, preserve both and classify CONFLICTING.
Do not hide an evidence conflict to make the story cleaner.

GENEALOGY RULES
- Same surname + same region does not establish kinship.
- Name similarity alone does not establish identity.
- A date estimate is not a date fact.
- A place with the same name must be disambiguated historically.
- Administrative borders change; resolve place/time jointly.
- Parent/child links require chronological and documentary consistency.
- Heraldic surname references do not establish personal nobility or a personal coat of arms.
- Living-person data requires minimisation and privacy-aware handling.

PRODUCT / UX
Free output must deliver genuine promised value.
Curiosity must be based on real additional inventory, not hidden invented content.
Paywall copy can mention only quantities/sections present in the canonical DiscoveryIndex.
No fake urgency, fake discounts, fake social proof, automatic subscriptions, disguised recurring billing or fabricated research progress.

DESIGN
Premium editorial + cartographic visual system.
History is interpreted in a modern way.
Do not use faux parchment, wax seals, medieval kitsch, random historical documents, generic trees, stereotypical older-person stock photography, SaaS-dashboard density, neon AI gradients or glassmorphism as default.

LOCALISATION
Keep factual objects language-neutral.
Generate PL/EN presentation downstream.
Never translate proper names or historical place names without preserving original/standard forms.

OUTPUT
Prefer structured outputs over prose between workflow steps.
Preserve unknown/null rather than guessing.
Always state limitations when material to interpretation.
```

### Selection rule

| Context | Use |
|---|---|
| Pure formatting / small copy / image prompt | SHORT |
| Specialist prompt receiving evidence | MEDIUM |
| Genealogy, report, monetisation, legal/data, Codex feature | FULL |

---

# 3. Standard prompt format

Every production prompt is stored as a versioned Markdown file with YAML front matter.

```yaml
prompt_id: NA-ONO-001
name: Surname Etymology Analyst
version: 1.0.0
status: approved
owner: onomastics
risk_level: high
source_required: true
human_review: conditional
input_schema: EtymologyInput.v1
output_schema: EtymologyAnalysis.v1
depends_on:
  - NA-SRC-002
used_by:
  - NA-RPT-002
tags:
  - surname
  - evidence
  - etymology
```

Required body:

```text
# PURPOSE
# WHEN TO USE
# WHEN NOT TO USE
# REQUIRED CONTEXT
# INPUT
# TASK
# RULES
# DATA / SOURCE RULES
# CONFIDENCE RULES
# OUTPUT FORMAT
# QUALITY CHECK
# FAILURE MODES
# NEXT STEP
# EXAMPLE INPUT
# EXAMPLE OUTPUT
```

## Naming system

`NA-{DOMAIN}-{NNN}`

Examples:
- `NA-SRC-001`
- `NA-ONO-008`
- `NA-UX-005`
- `NA-PAY-003`

Prompt names may change. IDs do not.

## Semantic versioning

- **MAJOR** `2.0.0`: output schema, evidence rules or fundamental behavior changes.
- **MINOR** `1.1.0`: backwards-compatible fields/capabilities added.
- **PATCH** `1.0.1`: wording, examples, typo fixes that should not alter expected behavior.

Statuses:
`draft → candidate → approved → deprecated`

Every approved prompt must have:
- golden test cases;
- failure test cases;
- version owner;
- output schema;
- last evaluation result.

---

# 4. Canonical inter-prompt objects

The library should standardise a few objects before writing many prompts.

1. `SurnameProfile`
2. `SourceRecord`
3. `EvidenceClaim`
4. `EtymologyAnalysis`
5. `OriginHypothesis`
6. `HistoricalVariant`
7. `HistoricalPlace`
8. `ArchiveReference`
9. `MigrationClue`
10. `ConfidenceAssessment`
11. `FamilyPerson`
12. `CandidateRecord`
13. `EvidenceLink`
14. `DiscoveryIndex`
15. `ReportSection`
16. `Citation`

The most important design decision is that **prose is downstream**. Research prompts output these objects; report/copy/design prompts consume them.

# 5. Prompt Registry

**Registry size: 99 production prompts.** It stays below 100 by using parameterised prompt families for copy, design, SEO and QA instead of creating near-duplicate prompts.

| Prompt ID | Name | Category | Purpose | Input | Output | Depends on | Used by | Priority | MVP/Later | Human review | Source required | Risk | Version |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| NA-CTX-001 | Master Context | CTX | Shared product/trust rules | task | context block | — | all | P0 | MVP | N | N | M | 1.0.0 |
| NA-ORC-001 | Workflow Orchestrator | ORC | Route task through specialist chain and gates | task + available objects | workflow plan | CTX | runtime | P0 | MVP | C | N | H | 1.0.0 |
| NA-ORC-002 | Discovery Inventory Builder | ORC | Build canonical truthful discovery inventory | validated research objects | DiscoveryIndex | DAT/ONO/ARC | PAY/UX/RPT | P0 | MVP | N | Y | H | 1.0.0 |
| NA-ORC-003 | Evidence Ledger Builder | ORC | Bind claims to evidence and provenance | claims + sources | EvidenceClaim[] | SRC/DAT | CNF/QA/RPT | P0 | MVP | C | Y | H | 1.0.0 |
| NA-SRC-001 | Source Discovery | SRC | Find APIs/datasets/archives | research need + geography | source candidates | CTX | SRC-002 | P1 | MVP | C | Y | H | 1.0.0 |
| NA-SRC-002 | Source Evaluation | SRC | Evaluate authority, coverage and limits | source candidate | evaluated SourceRecord | SRC-001 | all research | P0 | MVP | C | Y | H | 1.0.0 |
| NA-SRC-003 | Licensing & Commercial Use Check | SRC | Flag licence/commercial-use risk | source terms + use case | licence assessment | SRC-001 | LEG/API | P0 | MVP | Y | Y | VH | 1.0.0 |
| NA-SRC-004 | Freshness Check | SRC | Assess recency/update cadence | source metadata | freshness assessment | SRC-002 | DAT/RPT | P1 | MVP | N | Y | M | 1.0.0 |
| NA-DAT-001 | Source Normaliser | DAT | Normalise retrieved data | raw source records | canonical objects | SRC-002 | ONO/GEO/ARC | P0 | MVP | N | Y | H | 1.0.0 |
| NA-DAT-002 | Source Conflict Resolver | DAT | Preserve and analyse conflicting claims | EvidenceClaim[] | conflict analysis | DAT-001 | CNF/RPT | P0 | MVP | C | Y | H | 1.0.0 |
| NA-DAT-003 | Data Gap Detector | DAT | Identify known/unknown/not claimable | research objects | gap matrix | DAT-001 | UX/PAY/RPT | P0 | MVP | N | Y | H | 1.0.0 |
| NA-DAT-004 | Citation Builder | DAT | Build consistent citations | SourceRecord + claim links | Citation[] | SRC-002 | RPT/SEO/UI | P0 | MVP | N | Y | M | 1.0.0 |
| NA-ONO-001 | Surname Etymology Analyst | ONO | Analyse sourced etymology | surname + evidence | EtymologyAnalysis | DAT-001 | RPT | P0 | MVP | C | Y | H | 1.0.0 |
| NA-ONO-002 | Language Origin Analyst | ONO | Assess probable linguistic origin | surname + evidence | OriginHypothesis[] | DAT-001 | ONO-008 | P0 | MVP | C | Y | H | 1.0.0 |
| NA-ONO-003 | Geographic Origin Analyst | ONO | Assess surname-level geographic origin | surname + evidence | OriginHypothesis[] | GEO/DAT | ONO-008 | P0 | MVP | C | Y | H | 1.0.0 |
| NA-ONO-004 | Morphology / Root / Suffix Analyst | ONO | Analyse structure, root and suffix | surname + linguistic sources | morphology analysis | DAT-001 | ONO-001/005 | P1 | MVP | C | Y | H | 1.0.0 |
| NA-ONO-005 | Surname Type Classifier | ONO | Classify toponymic/patronymic/etc. | analyses | type assessment | ONO-001/004 | RPT | P1 | MVP | N | Y | M | 1.0.0 |
| NA-VAR-001 | Historical Variant Detector | VAR | Detect evidence-supported spelling variants | surname + indexed forms | HistoricalVariant[] | DAT/ARC | VAR-002/RPT | P0 | MVP | C | Y | H | 1.0.0 |
| NA-VAR-002 | Spelling Evolution & Similarity Analyst | VAR | Explain evolution; separate similarity from relation | HistoricalVariant[] + comparands | variant analysis | VAR-001 | RPT/SEO/GEN | P1 | Later | C | Y | H | 1.0.0 |
| NA-ONO-008 | Origin Hypothesis Ranker | ONO | Rank competing origins without false certainty | OriginHypothesis[] + evidence | ranked hypotheses | ONO-001/2/3 | RPT/UX | P0 | MVP | C | Y | H | 1.0.0 |
| NA-GEO-001 | Current Distribution & Rarity Analyst | GEO | Analyse population/distribution/rarity | official distribution data | distribution object | DAT-001 | UX/RPT/MAP | P0 | MVP | N | Y | M | 1.0.0 |
| NA-MIG-001 | Migration Clue Synthesiser | MIG | Create scoped migration clues | historical places/records | MigrationClue[] | MAP/ARC | RPT | P1 | Later | C | Y | H | 1.0.0 |
| NA-FAM-001 | Family Branch Intake | FAM | Collect minimal useful family context | user answers | FamilyPerson[] + constraints | CTX/PRV | GEN | P1 | Later | N | N | M | 1.0.0 |
| NA-GEN-001 | Ancestor Candidate Search Planner | GEN | Plan person-record search | FamilyPerson + constraints | search plan | FAM | ARC/GEN | P1 | Later | Y | Y | H | 1.0.0 |
| NA-GEN-002 | Ancestor Match Evaluator | GEN | Evaluate candidate identity | FamilyPerson + CandidateRecord | match assessment | GEN-001 | GEN-003/HHO | P1 | Later | Y | Y | VH | 1.0.0 |
| NA-GEN-003 | Record Linkage Analyst | GEN | Link records across life events | CandidateRecord[] | EvidenceLink[] | GEN-002 | GEN-006 | P1 | Later | Y | Y | VH | 1.0.0 |
| NA-GEN-004 | Place & Historical Boundary Resolver | GEN | Resolve place/time jointly | place + date + evidence | HistoricalPlace | MAP/ARC | GEN-002 | P1 | Later | C | Y | H | 1.0.0 |
| NA-GEN-005 | Date Range Estimator | GEN | Create bounded date windows, not facts | known dates/relations | range + basis | FAM | GEN-001 | P2 | Later | C | Y | H | 1.0.0 |
| NA-GEN-006 | Kinship Consistency & Conflict Checker | GEN | Check chronology/relations/conflicts | family graph + records | issues | GEN-003 | HHO/QA | P1 | Later | Y | Y | VH | 1.0.0 |
| NA-GEN-007 | Family Migration Hypothesis | GEN | Create family-level migration hypotheses only from person evidence | linked records | hypotheses | GEN-003/4 | RPT | P2 | Later | Y | Y | VH | 1.0.0 |
| NA-GEN-008 | Ancestor Evidence Pack | GEN | Assemble evidence for candidate/link | claims + records | evidence pack | GEN-002/3 | HHO/RPT | P1 | Later | Y | Y | VH | 1.0.0 |
| NA-GEN-009 | Family Research Next Step | GEN | Recommend evidence-seeking next action | gaps + evidence | next steps | DAT-003/GEN | user/HHO | P1 | Later | C | Y | H | 1.0.0 |
| NA-ARC-001 | Archive Search Planner | ARC | Plan archive/source search | research question | archive plan | SRC/FAM | ARC-002 | P1 | Later | C | Y | H | 1.0.0 |
| NA-ARC-002 | Archive Query Builder | ARC | Create archive-specific queries | plan + variants | queries | ARC-001/VAR | retrieval | P1 | Later | N | Y | M | 1.0.0 |
| NA-ARC-003 | Historical Record Extractor | ARC | Extract facts without over-interpreting | record/document | CandidateRecord | ARC-002 | GEN/RPT | P1 | Later | C | Y | H | 1.0.0 |
| NA-ARC-004 | Archival Document Summariser | ARC | Summarise faithfully and preserve uncertainty | document + metadata | summary + facts | ARC-003 | RPT | P2 | Later | C | Y | H | 1.0.0 |
| NA-ARC-005 | Archive Metadata & Citation Normaliser | ARC | Normalise metadata and citation | raw metadata | ArchiveReference + Citation | DAT-001 | ARC/RPT | P1 | Later | N | Y | M | 1.0.0 |
| NA-ARC-006 | Historical Place Resolver | ARC | Resolve old place names/admin units | old place + date | place candidates | GEN-004 | GEN/RPT | P1 | Later | C | Y | H | 1.0.0 |
| NA-ARC-007 | Archive Relevance & Quality Ranker | ARC | Rank results and flag quality | records + target | ranked refs + issues | ARC/GEN | researcher | P1 | Later | Y | Y | H | 1.0.0 |
| NA-CNF-001 | Confidence Classifier | CNF | Assign qualitative evidence state | EvidenceClaim | ConfidenceAssessment | ORC-003 | UX/RPT/QA | P0 | MVP | C | Y | H | 1.0.0 |
| NA-PRD-001 | Tier Entitlement Planner | PRD | Define free/premium/research boundaries | data inventory + product rules | entitlement map | CTX | UX/PAY | P0 | MVP | Y | N | H | 1.0.0 |
| NA-IA-001 | Result Information Architect | IA | Order evidence into chapters | SurnameProfile + gaps | result IA | PRD/CNF | UX/RPT | P0 | MVP | N | N | M | 1.0.0 |
| NA-UX-001 | Free Result Designer | UX | Design free value from actual data | profile + entitlement | screen/content plan | IA/PRD | UI | P0 | MVP | N | N | M | 1.0.0 |
| NA-UX-002 | Discovery & Information Gap Designer | UX | Sequence progressive discovery truthfully | profile + DiscoveryIndex | flow | UX-001/ORC-002 | MOB/PAY | P0 | MVP | C | Y | H | 1.0.0 |
| NA-UX-003 | Result Page Architect | UX | Create chapter-based result page | IA + flow | result page spec | IA/UX-002 | UI | P1 | MVP | N | N | M | 1.0.0 |
| NA-MOB-001 | Mobile Wireflow Designer | MOB | Turn flow into mobile screens | UX flow | wireflow | UX-002/3 | UI/DEV | P0 | MVP | N | N | M | 1.0.0 |
| NA-UX-004 | Pre-Paywall Designer | UX | Create evidence-based preview | DiscoveryIndex | pre-paywall spec | UX-002/PAY | UI | P0 | MVP | C | Y | H | 1.0.0 |
| NA-UX-005 | Checkout UX Designer | UX | Design transparent purchase flow | offer + payment constraints | checkout spec | PAY | DEV | P1 | MVP | N | N | M | 1.0.0 |
| NA-UX-006 | Family Research Onboarding | UX | Collect family context minimally | research need | intake flow | FAM/PRV | GEN | P1 | Later | Y | N | H | 1.0.0 |
| NA-UX-007 | Zero / Low Data Flow | UX | Handle no/low data honestly | gap matrix | fallback flow | DAT-003 | UI/CPY | P0 | MVP | N | N | M | 1.0.0 |
| NA-UX-008 | Special Case Flow Designer | UX | Handle common/rare/foreign/transliterated/multiple/conflicting origins | profile + case type | flow variant | ONO/DAT | UI | P1 | Later | C | Y | H | 1.0.0 |
| NA-PAY-001 | Paywall Variant Generator | PAY | Generate structurally distinct truthful paywalls | offer + DiscoveryIndex | paywall specs | PRD/ORC-002 | UI/EXP | P1 | MVP | C | Y | H | 1.0.0 |
| NA-PAY-002 | Price Test Designer | PAY | Design pricing experiments | offer + baseline | experiment | EXP/ANA | product | P1 | MVP | Y | N | H | 1.0.0 |
| NA-PAY-003 | Discovery Index Presenter | PAY | Turn inventory into user-facing premium scope | DiscoveryIndex | display model | ORC-002 | UX/PAY | P0 | MVP | C | Y | H | 1.0.0 |
| NA-PAY-004 | Pre-Paywall Personalisation | PAY | Personalise scope without inventing findings | inventory + optional context | personalised preview | FAM/PRV | UX | P2 | Later | Y | Y | H | 1.0.0 |
| NA-PAY-005 | Report Preview Designer | PAY | Make premium output tangible | report outline + inventory | preview spec | RPT/PAY-003 | UI | P0 | MVP | N | N | M | 1.0.0 |
| NA-PAY-006 | Upsell Ladder Designer | PAY | Design Family Origin / Deep / Gift upsells | purchase + gaps | upsell plan | PRD/GEN/GFT | UX | P2 | Later | C | Y | H | 1.0.0 |
| NA-PAY-007 | Human Research Escalation | PAY | Escalate to quoted human research | evidence/gaps | handoff offer | HHO | support | P2 | Later | Y | Y | VH | 1.0.0 |
| NA-CPY-001 | UX Copy Generator | CPY | Generate PL/EN hero, discovery, loading, map, timeline, CTA copy by surface | surface + evidence + locale | copy variants | CTX/CNF | UI | P0 | MVP | C | Y | H | 1.0.0 |
| NA-CPY-002 | Trust & Confidence Copy | CPY | Explain sources/uncertainty/limitations | source/confidence objects | microcopy | CNF/SRC | UI/RPT | P0 | MVP | C | Y | H | 1.0.0 |
| NA-CPY-003 | Monetisation & Lifecycle Copy | CPY | Write pre-paywall/paywall/checkout/email/gift copy | offer + inventory + event | copy set | PAY/CRM | UI | P0 | MVP | C | Y | H | 1.0.0 |
| NA-CPY-004 | Failure / No-Data / Support Copy | CPY | Handle empty/error/low-confidence/handoff states | failure object | copy | DAT/HHO | UI/SUP | P0 | MVP | N | N | M | 1.0.0 |
| NA-RPT-001 | Free Snapshot Generator | RPT | Generate sourced free result | SurnameProfile + evidence | free snapshot | ONO/GEO/CNF | UX | P0 | MVP | C | Y | H | 1.0.0 |
| NA-RPT-002 | Full Surname Report Generator | RPT | Generate premium surname report | validated surname objects | report | RPT components | product | P0 | MVP | C | Y | H | 1.0.0 |
| NA-RPT-003 | Family Origin Report Generator | RPT | Generate family-context report | surname + family evidence | report | FAM/GEN | product | P2 | Later | Y | Y | VH | 1.0.0 |
| NA-RPT-004 | Deep Family Research Report | RPT | Generate person-level research report | evidence packs | report | GEN/HHO | product | P2 | Later | Y | Y | VH | 1.0.0 |
| NA-RPT-005 | Source / Methodology / Limitations Appendix | RPT | Build provenance and limitations sections | citations + gaps + workflow metadata | appendix | DAT/CNF | reports | P0 | MVP | C | Y | H | 1.0.0 |
| NA-RPT-006 | Timeline / Map / Variant / Migration Section Writer | RPT | Generate modular evidence-led report sections | section data object | ReportSection | VAR/GEO/MIG/ARC | RPT-002 | P1 | MVP | C | Y | H | 1.0.0 |
| NA-ART-001 | Art Direction | ART | Develop brand directions | brand brief | art direction boards | CTX | design | P1 | MVP | Y | N | M | 1.0.0 |
| NA-UI-001 | Landing & Mobile UI Designer | UI | Design search entry and mobile system | brand + wireflow | UI spec | UX/ART | DEV | P1 | MVP | N | N | M | 1.0.0 |
| NA-UI-002 | Result / Paywall / Checkout UI Designer | UI | Design result and purchase surfaces | wireflow + data states | UI spec | UX/PAY | DEV | P0 | MVP | N | N | M | 1.0.0 |
| NA-UI-003 | Evidence Component Designer | UI | Design archive/source/confidence components | source/confidence objects | component spec | ARC/CNF | DEV | P0 | MVP | N | Y | M | 1.0.0 |
| NA-MAP-001 | Cartography & Data Viz Designer | MAP/DVZ | Define map/timeline/data-viz system | geo/time data + brand | visual spec | GEO/ART | DEV | P1 | MVP | N | N | M | 1.0.0 |
| NA-ART-002 | Premium / Gift Report Designer | ART/GFT | Design editorial report artifact | report structure | editorial spec | RPT | design | P1 | MVP | N | N | M | 1.0.0 |
| NA-SOC-001 | Share Asset Designer | SOC | Create source-safe share system | free result + brand | share spec | RPT-001 | GRO/UI | P2 | MVP | N | Y | M | 1.0.0 |
| NA-IMG-001 | Image Generation Prompt Builder | ART | Build prompts for boards/UI/maps/covers/social/abstract/motion while avoiding fake evidence | design brief + target asset | image-generation prompt | ART/UI/MAP | image gen | P2 | MVP | Y | N | M | 1.0.0 |
| NA-SEO-001 | Surname SEO Page Generator | SEO | Generate data-grounded surname page | validated profile | SEO page | RPT/CNF | publish | P1 | MVP | C | Y | H | 1.0.0 |
| NA-SEO-002 | Programmatic SEO Template & Internal Linking | SEO | Create reusable data-dependent template/link graph | schema + intent + inventory | template/link plan | IA/SEO | DEV | P1 | MVP | Y | N | M | 1.0.0 |
| NA-SEO-003 | SEO Metadata / FAQ Generator | SEO | Generate titles/meta/FAQ without claim inflation | profile + query intent | SEO metadata/content | SEO-001 | publish | P2 | MVP | C | Y | M | 1.0.0 |
| NA-SEO-004 | Thin / Duplicate / SEO Fact QA | SEO | Block low-evidence, duplicate or unsupported pages | page + evidence | decision/issues | DAT/QA | publish | P0 | MVP | C | Y | H | 1.0.0 |
| NA-GRO-001 | Viral / Referral / Compare Designer | GRO | Design non-manipulative sharing and comparison loops | product moments + data | growth mechanics | SOC/ANA | product | P2 | Later | C | Y | H | 1.0.0 |
| NA-GRO-002 | Social / UGC / Seasonal / Retention Ideator | GRO | Generate growth concepts within trust constraints | brand + product state | concepts | SOC/GFT | marketing | P3 | Later | N | N | M | 1.0.0 |
| NA-QA-001 | Fact & Hallucination Checker | QA/FCT | Check every claim/entity/number against evidence | draft + ledger | issues | ORC-003 | approval | P0 | MVP | C | Y | VH | 1.0.0 |
| NA-QA-002 | Source Quality Checker | QA | Check provenance/authority/coverage/freshness | sources + claims | issues | SRC | approval | P0 | MVP | C | Y | VH | 1.0.0 |
| NA-QA-003 | Genealogy Logic Checker | QA | Check kinship/date/place reasoning | genealogy output | issues | GEN | HHO | P1 | Later | Y | Y | VH | 1.0.0 |
| NA-QA-004 | Heraldry & Sensitive Claim Checker | QA | Block surname=heraldry/identity errors | claims + sources | issues | SRC/CNF | approval | P0 | MVP | Y | Y | VH | 1.0.0 |
| NA-QA-005 | Confidence & Claim Wording Checker | QA | Verify confidence label and wording match evidence | claims + assessments + copy | issues | CNF/CPY | approval | P0 | MVP | C | Y | VH | 1.0.0 |
| NA-QA-006 | Report / SEO Completeness Checker | QA | Check sections, citations, limitations, thin content | report/page | issues | RPT/SEO | approval | P0 | MVP | C | Y | H | 1.0.0 |
| NA-QA-007 | Paywall Truthfulness Checker | QA | Ensure paywall mirrors DiscoveryIndex | paywall + inventory | issues | PAY/ORC-002 | approval | P0 | MVP | C | Y | VH | 1.0.0 |
| NA-EVL-001 | Prompt Output Evaluator & Regression Reviewer | EVL | Score outputs, build tests, review prompt changes | prompt/output/gold | evaluation + regression actions | QA | prompt ops | P0 | MVP | Y | Y | H | 1.0.0 |
| NA-DEV-001 | Feature Spec to Codex | DEV | Turn approved spec into implementation brief | spec + schemas | coding brief | UX/DB/API | Codex | P1 | MVP | Y | N | H | 1.0.0 |
| NA-DB-001 | Canonical Data Model Designer | DB | Design/extend domain schema | canonical objects | DB spec | TAX/CTX | DEV | P0 | MVP | Y | N | H | 1.0.0 |
| NA-API-001 | Integration & Failure Contract Designer | API | Plan source/API integration, retries/fallbacks | source eval + schema | integration contract | SRC/DB | DEV | P0 | MVP | Y | Y | H | 1.0.0 |
| NA-ANA-001 | Analytics Event Taxonomy | ANA | Define measurable product events | flow + goals | event spec | UX/PRD | DEV/EXP | P0 | MVP | Y | N | H | 1.0.0 |
| NA-EXP-001 | A/B Test Designer | EXP | Design experiments without invented uplift | hypothesis + surface | test plan | ANA | product | P1 | MVP | Y | N | H | 1.0.0 |
| NA-LOC-001 | Localisation Adapter & QA | LOC | Adapt content/data conventions by locale | language-neutral objects + locale | localized output + issues | CTX | UI/RPT/SEO | P1 | MVP | C | N | M | 1.0.0 |
| NA-GLO-001 | Country Expansion Readiness | GLO | Assess source/product/legal readiness by country | country + source inventory | readiness plan | SRC/LEG/LOC | product | P3 | Later | Y | Y | H | 1.0.0 |
| NA-HHO-001 | Human Genealogist Handoff | HHO | Prepare review packet and escalation reason | research state | handoff packet | GEN/ARC/CNF | researcher | P1 | Later | Y | Y | VH | 1.0.0 |
| NA-PRV-001 | Privacy / Data Minimisation / Licensing Review | PRV/LEG | Review personal data and source-use risk | flow/schema/source terms | risk issues | CTX/SRC | product/legal | P0 | MVP | Y | Y | VH | 1.0.0 |

# 6. MVP Prompt Set — 18 essential prompts

These are the prompts required to deliver the first credible surname lookup, free result, premium discovery index, full report and QA.

| Order | Prompt | Why it exists | Main sources/objects | Output | Trigger | User-facing? |
|---:|---|---|---|---|---|---|
| 1 | **NA-CTX-001 Master Context** | Prevents product/trust drift | Product rules | Shared context | Every chain | Internal |
| 2 | **NA-SRC-002 Source Evaluation** | Stops weak sources entering research | Source candidates | Evaluated SourceRecord | Source onboarding | Internal |
| 3 | **NA-DAT-001 Source Normaliser** | Creates stable canonical data | Raw source data | Canonical objects | Retrieval complete | Internal |
| 4 | **NA-GEO-001 Distribution & Rarity** | Powers count/map/rarity | Official population data | Distribution | Lookup | Internal → user |
| 5 | **NA-ONO-001 Etymology Analyst** | Produces sourced meaning | Onomastic evidence | EtymologyAnalysis | Lookup | Internal → user |
| 6 | **NA-ONO-002 Language Origin** | Separates language from geography | Linguistic evidence | Origin hypotheses | Lookup | Internal → user |
| 7 | **NA-ONO-003 Geographic Origin** | Produces geographic hypotheses | Place/source evidence | Origin hypotheses | Lookup | Internal → user |
| 8 | **NA-VAR-001 Historical Variant Detector** | Creates first historic layer | Historical evidence | HistoricalVariant[] | Lookup/report | Internal → user |
| 9 | **NA-ONO-008 Origin Hypothesis Ranker** | Preserves competing explanations | Origin hypotheses | Ranked hypotheses | After research | Internal |
| 10 | **NA-CNF-001 Confidence Classifier** | Standardises evidence language | EvidenceClaim | ConfidenceAssessment | Every claim set | Internal → user |
| 11 | **NA-DAT-003 Data Gap Detector** | Prevents UX from assuming missing data | Research objects | Gap matrix | Before UX/report | Internal |
| 12 | **NA-ORC-002 Discovery Inventory Builder** | Single source of truth for premium teasing | Validated research | DiscoveryIndex | Before monetisation | Internal |
| 13 | **NA-RPT-001 Free Snapshot Generator** | Creates meaningful free result | Validated profile | Snapshot | Lookup complete | User-facing |
| 14 | **NA-PAY-003 Discovery Index Presenter** | Turns real inventory into curiosity | DiscoveryIndex | Premium scope | Free flow end | User-facing |
| 15 | **NA-RPT-002 Full Surname Report** | Core paid artifact | Validated surname objects | Full report | Purchase | User-facing |
| 16 | **NA-CPY-001 UX Copy Generator** | Creates consistent PL/EN product copy | Screen + evidence | Copy variants | Design/content | User-facing |
| 17 | **NA-QA-001 Fact & Hallucination Checker** | Hard gate on unsupported claims | Draft + evidence ledger | Issues | Before publish | Internal |
| 18 | **NA-QA-007 Paywall Truthfulness Checker** | Prevents fake premium inventory | Paywall + DiscoveryIndex | Issues | Before experiment/release | Internal |

## MVP runtime rule

No user-facing surname result can be published unless:

```text
DATA NORMALISED
      ↓
EVIDENCE CLAIMS CREATED
      ↓
CONFIDENCE ASSIGNED
      ↓
FACT/HALLUCINATION QA = PASS
```

No premium teaser or paywall can be displayed unless:

```text
DISCOVERY INDEX EXISTS
      ↓
PAYWALL REFERENCES ONLY DISCOVERY INDEX FIELDS
      ↓
PAYWALL TRUTHFULNESS QA = PASS
```

---

# 7. Core MVP prompt specifications

Below are the production designs for the most important prompts. These should become separate Markdown files in the repository.

## 7.1 NA-SRC-002 — Source Evaluation

### PURPOSE
Evaluate whether a dataset, API, archive, dictionary, website, book/index or research source is suitable for Name Atlas.

### WHEN TO USE
Before any new source is allowed into production research.

### WHEN NOT TO USE
Do not use as a legal opinion. Licensing uncertainty must be escalated.

### INPUT
```json
{
  "source_name": "...",
  "source_type": "official_dataset|academic|archive|commercial_database|community_index|other",
  "publisher": "...",
  "url_or_reference": "...",
  "claimed_scope": "...",
  "sample_data": "...",
  "terms_or_license": "...",
  "target_use": "surname_lookup|premium_report|genealogy|seo|other"
}
```

### TASK
Assess:
- authority;
- provenance;
- geographic and temporal coverage;
- surname-level vs person-level scope;
- recency/update cadence;
- completeness and sampling bias;
- known methodology;
- accessibility/API;
- commercial-use status;
- citation requirements;
- privacy implications;
- limitations;
- suitability for each Name Atlas use case.

### RULES
- Do not equate popularity with authority.
- Separate factual reliability from licensing permissibility.
- If licence/commercial-use rights are unclear, output `LEGAL_REVIEW_REQUIRED`.
- Community indexes may be useful but must be labelled appropriately.
- A source can be strong for one claim and weak for another.

### OUTPUT
`SourceRecord`

### QUALITY CHECK
- Does every rating have a reason?
- Is person-level vs surname-level scope explicit?
- Is commercial use explicit, restricted or unknown?
- Are limitations preserved?

### FAILURE MODES
If terms, methodology or scope cannot be verified, do not infer them.

### NEXT STEP
`NA-DAT-001` for approved data; `NA-SRC-003/NA-PRV-001` for licensing uncertainty.

---

## 7.2 NA-DAT-001 — Source Normaliser

### PURPOSE
Transform raw source outputs into canonical Name Atlas objects without adding interpretation.

### INPUT
Raw retrieved records + SourceRecord.

### TASK
1. Preserve original values.
2. Normalise names, dates, geographic identifiers and field names.
3. Separate `raw_value`, `normalised_value` and `normalisation_method`.
4. Preserve null/unknown.
5. Attach source/provenance IDs.
6. Never create missing values from context.

### RULES
- Normalisation is not interpretation.
- Do not silently modernise historical place names without preserving original.
- Do not merge two records only because surname and place are similar.
- If parsing is ambiguous, create alternatives or `needs_review=true`.

### OUTPUT
Canonical structured objects.

### QUALITY CHECK
Every normalised field must trace back to a raw source field or explicit deterministic transform.

---

## 7.3 NA-ONO-001 — Surname Etymology Analyst

### PURPOSE
Produce a source-led etymology analysis of `[SURNAME]`.

### INPUT
```json
{
  "surname": "[SURNAME]",
  "country_context": "PL",
  "source_evidence": [],
  "historical_variants": [],
  "morphology": {}
}
```

### TASK
Identify:
- sourced etymological explanations;
- lexical root(s);
- surname formation mechanism;
- earliest relevant source interpretations where available;
- competing interpretations;
- limits of evidence.

### DATA / SOURCE RULES
- Prefer specialist onomastic dictionaries, academic sources and documented historical sources.
- Do not derive a definitive etymology only from modern word resemblance.
- AI language pattern recognition may generate a **research hypothesis**, never a FACT without evidence.
- If sources disagree, retain competing interpretations.

### CONFIDENCE RULES
- VERIFIED: direct authoritative evidence specifically discussing the surname/form.
- LIKELY: strong indirect evidence plus corroboration.
- POSSIBLE: plausible but incomplete.
- CONFLICTING: credible sources disagree.
- INSUFFICIENT_DATA: no reliable interpretation.

### OUTPUT
`EtymologyAnalysis`

### FAILURE MODES
Never write an attractive origin story simply because the evidence is sparse.

---

## 7.4 NA-GEO-001 — Current Distribution & Rarity Analyst

### PURPOSE
Calculate current surname distribution and descriptive rarity from approved population datasets.

### TASK
Return:
- total current count;
- dataset population/coverage;
- regional counts;
- regional shares;
- rank if the dataset supports it;
- rarity metric only if methodology is explicit;
- data date;
- coverage limitations.

### RULES
- Distinguish number of people in dataset from entire national population when coverage differs.
- Do not claim “1 in X citizens” unless denominator and dataset population are compatible.
- Do not create a percentile rarity score unless its calculation is defined.
- Never compare different country datasets as if collection methods were identical.

### OUTPUT
```json
{
  "total_count": 0,
  "data_date": "YYYY-MM-DD",
  "coverage": "...",
  "regions": [],
  "rank": null,
  "rarity": {
    "metric": null,
    "value": null,
    "method": null
  },
  "limitations": [],
  "source_ids": []
}
```

---

## 7.5 NA-VAR-001 — Historical Variant Detector

### PURPOSE
Identify evidence-supported spelling variants of `[SURNAME]`.

### TASK
Classify each candidate variant as:
- documented historical spelling;
- transliteration;
- orthographic modernisation;
- probable typo/OCR issue;
- similar but unproven surname;
- uncertain.

### RULES
- Similar spelling alone is not historical continuity.
- Keep evidence date/place/source for every documented variant.
- OCR-only variants require explicit warning unless independently corroborated.
- Never merge variants into one lineage without person/family evidence.

### OUTPUT
`HistoricalVariant[]`

---

## 7.6 NA-ONO-008 — Origin Hypothesis Ranker

### PURPOSE
Combine etymological, geographic, morphological and historical evidence into competing surname-origin hypotheses.

### INPUT
`OriginHypothesis[]` plus supporting EvidenceClaims.

### TASK
For each hypothesis:
- state exact proposition;
- list supporting evidence;
- list contradictory/weakening evidence;
- state scope (surname-level, not family-level);
- assign qualitative confidence;
- explain what new evidence would discriminate between hypotheses.

### RANKING RULE
Rank by evidence strength, independence and relevance—not narrative appeal.

### OUTPUT
```json
{
  "hypotheses": [
    {
      "hypothesis_id": "...",
      "claim": "...",
      "rank": 1,
      "confidence": "LIKELY",
      "supporting_evidence_ids": [],
      "counter_evidence_ids": [],
      "limitations": [],
      "next_evidence_needed": []
    }
  ]
}
```

---

## 7.7 NA-CNF-001 — Confidence Classifier

### PURPOSE
Apply the Name Atlas qualitative confidence framework consistently.

### INPUT
One claim with evidence ledger links.

### TASK
Return exactly one:
`VERIFIED | LIKELY | POSSIBLE | UNCONFIRMED | CONFLICTING | INSUFFICIENT_DATA`

### HARD RULES
- Do not output percentages.
- A large number of low-quality duplicated web sources does not create VERIFIED evidence.
- Independent corroboration matters more than repetition.
- Scope must match evidence.
- Family-level claims require family/person-level evidence.
- If two strong sources disagree materially, choose CONFLICTING rather than averaging.

### OUTPUT
`ConfidenceAssessment`

---

## 7.8 NA-DAT-003 — Data Gap Detector

### PURPOSE
Create an explicit boundary between known, inferable and unavailable information.

### OUTPUT
```json
{
  "known": [],
  "interpretable": [],
  "hypothesis_only": [],
  "missing": [],
  "not_claimable": [],
  "recommended_next_sources": [],
  "human_review_triggers": []
}
```

### CRITICAL USE
This object is consumed by UX, reports and monetisation. A downstream prompt must not pretend a `missing` item exists because it would make a better screen.

---

## 7.9 NA-ORC-002 — Discovery Inventory Builder

### PURPOSE
Create the only object from which premium-discovery numbers may be drawn.

### INPUT
Only validated research objects.

### OUTPUT
`DiscoveryIndex`, including:
- historical variants count;
- historical places count;
- archive references count;
- migration clue count;
- source count;
- source types;
- confidence distribution;
- available report sections;
- unavailable sections;
- family-specific research eligibility.

### RULES
- Counts are based on deduplicated canonical objects.
- Do not count one underlying record multiple times because several sources copied it.
- `archive_refs_count` means archive references, not ancestors.
- `historical_places_count` means identified candidate/attested places at surname level unless otherwise specified.
- No “we found” claim may exceed this inventory.

---

## 7.10 NA-RPT-001 — Free Snapshot Generator

### PURPOSE
Answer the user's initial surname question meaningfully without withholding promised free value.

### INPUT
Validated `SurnameProfile`, evidence ledger, confidence assessments and entitlement map.

### TASK
Generate a concise mobile-first free snapshot containing only available data:
1. current population/distribution;
2. rarity if valid;
3. origin/meaning;
4. confidence/source explanation;
5. map summary;
6. one genuine historical dimension where available;
7. limitations.

### RULES
- No fake cliffhanger.
- If history data is absent, say so and pivot to another valuable dimension.
- Do not mention premium counts unless supplied through `DiscoveryIndex`.
- Avoid “your ancestors” unless family-level evidence exists.

### OUTPUT
Structured presentation object plus PL/EN copy fields.

---

## 7.11 NA-PAY-003 — Discovery Index Presenter

### PURPOSE
Translate a canonical DiscoveryIndex into a premium preview without changing counts.

### TASK
For each non-zero inventory category:
- create a short user-facing label;
- explain what the count actually means;
- choose whether showing the exact count increases clarity;
- state confidence distribution where material;
- suppress categories with zero/weak inventory rather than faking visual completeness.

### EXAMPLE
Good:
> 11 potential archival references containing this surname.

Bad:
> We found 11 records about your family.

### OUTPUT
A presentation model, never new research.

---

## 7.12 NA-RPT-002 — Full Surname Report Generator

### PURPOSE
Assemble validated surname-level research into a premium editorial report.

### REQUIRED SECTIONS WHEN DATA EXISTS
- executive summary;
- current distribution;
- etymology;
- linguistic/geographic origin hypotheses;
- historical variants;
- historical places;
- timeline;
- migration clues;
- archive references;
- source appendix;
- limitations/methodology.

### CLAIM LABELS
Every material interpretive claim must preserve:
`claim_type`, `confidence`, `source_ids`.

### RULES
- Do not fill empty sections with generic educational filler merely to make the report longer.
- Report value comes from evidence density and synthesis, not page count.
- Do not shift from “surname” to “family” language unless family research has been performed.

---

## 7.13 NA-CPY-001 — UX Copy Generator

### PURPOSE
Create concise PL/EN UI copy for a specified surface.

### INPUT
```json
{
  "surface": "hero|discovery|loading|map|timeline|cta|share|empty_state|other",
  "locale": "pl-PL|en",
  "facts": [],
  "confidence": [],
  "brand_tone": "premium_editorial_restrained",
  "character_limits": {}
}
```

### RULES
- Natural Polish and English; do not translate mechanically.
- No “unlock the power of”.
- No clickbait, faux mystery or sensational verbs.
- “We found” is allowed only when backed by actual inventory.
- Do not turn `POSSIBLE` into certainty to make copy smoother.
- Avoid bureaucratic academic prose in user-facing surfaces.

### OUTPUT
3–5 variants with rationale and exact claim dependencies.

---

## 7.14 NA-QA-001 — Fact & Hallucination Checker

### PURPOSE
Non-destructively audit a draft.

### DO NOT REWRITE FIRST.

### OUTPUT
For every issue:

```json
{
  "issue_id": "...",
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "claim": "...",
  "issue_type": "unsupported|overstated|wrong_scope|invented_number|invented_source|entity_error|other",
  "why": "...",
  "evidence_ids": [],
  "suggested_fix": "...",
  "requires_human_review": false
}
```

Then return:
`PASS | REVIEW | FAIL`

### HARD FAIL
- invented source;
- invented historical record;
- ancestor claim without evidence;
- material number not in evidence;
- fabricated heraldic ownership;
- material source conflict hidden as certainty.

---

## 7.15 NA-QA-007 — Paywall Truthfulness Checker

### PURPOSE
Guarantee that conversion copy does not exceed actual findings.

### INPUT
Paywall/pre-paywall spec + canonical DiscoveryIndex.

### CHECK
- Every number exactly matches inventory.
- Count label describes the actual unit.
- “Historical record” is not used for a simple surname string hit unless that is what the system truly has.
- “Family” is not substituted for “surname”.
- Locked section exists and can be delivered after purchase.
- No fake countdown, scarcity, social proof or unearned claim of personal relevance.
- Recurring payment terms are explicit.

### OUTPUT
Issue list + `PASS/REVIEW/FAIL`.

---

# 8. Data / source prompt family

The core data family is:

```text
NA-SRC-001 Source Discovery
        ↓
NA-SRC-002 Source Evaluation
        ├── NA-SRC-003 Licensing / Commercial Use
        └── NA-SRC-004 Freshness
        ↓
NA-DAT-001 Normalisation
        ↓
NA-ORC-003 Evidence Ledger
        ├── NA-DAT-002 Conflict Resolver
        ├── NA-DAT-003 Gap Detector
        └── NA-DAT-004 Citation Builder
```

## Source scoring dimensions

Do not collapse the following into one generic score:
- authority;
- directness;
- independence;
- coverage;
- recency;
- methodology transparency;
- provenance quality;
- licensing clarity;
- person-vs-surname granularity.

A source can be authoritative but old; broad but methodologically opaque; reliable but not commercially usable.

## Licensing output states
`CLEAR_ALLOWED | CLEAR_RESTRICTED | ATTRIBUTION_REQUIRED | NON_COMMERCIAL_ONLY | UNKNOWN | LEGAL_REVIEW_REQUIRED`

The LLM may flag and summarise terms. It must not make final legal conclusions when wording is ambiguous.

---

# 9. Onomastics prompt family

The recommended composition is:

```text
Morphology/root/suffix
       ↓
Etymology
       ↓
Language origin
       ↓
Geographic origin
       ↓
Historical variants
       ↓
Origin hypothesis ranker
       ↓
Confidence
```

## Surname type taxonomy

`TOPONYMIC | PATRONYMIC | MATRONYMIC | OCCUPATIONAL | DESCRIPTIVE | ETHNONYMIC | STATUS_ROLE | RELIGIOUS | FOREIGN_DERIVED | MULTIPLE_PLAUSIBLE | UNCERTAIN`

A surname may receive more than one candidate class. Do not force one label for UX neatness.

---

# 10. Genealogy evidence model

Person-level genealogy uses stronger rules than surname research.

## Candidate-match evidence dimensions

The system may calculate an **internal non-probabilistic evidence score** solely for ranking review candidates. It is not a probability and is never shown to users as a confidence percentage.

| Dimension | 0 | 1 | 2 | 3 |
|---|---|---|---|---|
| Name/variant match | conflict | weak | plausible | strong/documented |
| Date compatibility | conflict | broad | compatible | close/direct |
| Place compatibility | conflict | weak | regional | same historical locality |
| Relationship consistency | conflict | unknown | compatible | independently supported |
| Source quality | unreliable | derivative | good index | primary/authoritative record |
| Independent corroboration | none/conflict | one signal | two signals | multiple independent |
| Contradictions | major | material | minor | none known |

**Important:** totals rank candidates for review only. A high total does not convert automatically to VERIFIED kinship.

## Human-review triggers

Always require human review when:
- a new parent/child relationship will be asserted from ambiguous records;
- two candidate identities remain plausible;
- names are very common and dates/places overlap;
- historical boundary/place resolution is uncertain and material;
- a heraldic lineage is being linked to a user family;
- documentary conflicts cannot be resolved;
- living-person sensitive data is involved beyond minimal user-provided context.

---

# 11. Archive prompt family

Archive chain:

```text
Research question
      ↓
Archive Search Planner
      ↓
Query Builder
      ↓
Record Extractor
      ↓
Metadata/Citation Normaliser
      ↓
Historical Place Resolver
      ↓
Relevance & Quality Ranker
      ↓
Genealogy Match / Report
```

### Archive extraction principle
The record extractor should first reproduce **what the record says**, then separately add interpretation.

Bad:
> This is likely the user's great-grandfather.

Good:
> The record indexes a person named [NAME], event type [TYPE], date [DATE], place [PLACE]. Relationship to the target family has not been established.

---

# 12. NAME ATLAS CONFIDENCE FRAMEWORK

## VERIFIED

### Definition
The claim is directly supported within its stated scope by authoritative or primary evidence, with no unresolved material contradiction.

### Minimum evidence
One strong direct authoritative/primary source can be sufficient for a narrow factual claim; broader interpretive claims usually require corroboration.

### User language
`POTWIERDZONE / VERIFIED`

### Human review
Conditional for high-impact genealogy/person-level claims.

---

## LIKELY

### Definition
Multiple relevant, reasonably independent pieces of evidence converge on the claim, but direct proof is incomplete.

### Examples
- two specialist sources plus geographic/historical corroboration support one surname-origin interpretation;
- a historical spelling relationship has repeated evidence but incomplete continuity.

### User language
`PRAWDOPODOBNE / LIKELY`

---

## POSSIBLE

### Definition
The hypothesis is compatible with evidence and domain knowledge but significant alternatives or gaps remain.

### User language
`MOŻLIWE / POSSIBLE`

Copy must say *may*, *could*, *one interpretation*.

---

## UNCONFIRMED

### Definition
A signal/reference exists, but the evidence is too weak or too indirect to support even a meaningful likely conclusion.

### User language
`NIEPOTWIERDZONE / UNCONFIRMED`

---

## CONFLICTING

### Definition
Credible evidence supports materially incompatible conclusions.

### User language
`ŹRÓDŁA SĄ NIEZGODNE / CONFLICTING`

Never resolve conflict merely to create a cleaner story.

---

## INSUFFICIENT_DATA

### Definition
Available evidence is not enough to responsibly form the requested conclusion.

### User language
`BRAK WYSTARCZAJĄCYCH DANYCH / INSUFFICIENT DATA`

This is a valid result, not a product failure.

---

## Data representation

```json
{
  "status": "LIKELY",
  "claim_id": "clm_...",
  "evidence_ids": ["ev_1", "ev_2"],
  "counter_evidence_ids": [],
  "reason": "...",
  "scope": "surname_level",
  "human_review_required": false
}
```

---

# 13. Product / UX prompt rules

All UX prompts receive, at minimum:

```json
{
  "available_data": {},
  "data_gaps": {},
  "discovery_index": {},
  "entitlements": {},
  "confidence_distribution": {},
  "locale": "pl-PL"
}
```

They are forbidden from inventing:
- locked sections that cannot be delivered;
- record counts;
- historical dates;
- “family matches”;
- confidence scores;
- premium inventory.

## Special flow conditions

### ZERO DATA
Do not send user into a generic fake report. Offer:
- spelling check;
- transliteration/variant search;
- country/region hint;
- manual research request where applicable.

### LOW DATA
Show what is reliable. Reduce the premium offer or do not sell the report if minimum deliverable is not met.

### COMMON SURNAME
Emphasise distribution, regional concentration, etymology and need for family context before person-level inference.

### RARE SURNAME
Emphasise source scarcity honestly. Do not equate rarity with uniqueness of lineage.

### FOREIGN / TRANSLITERATED
Preserve original scripts when available and explicitly show transliteration assumptions.

### MULTIPLE ORIGINS
Present parallel hypotheses; do not force a single “origin country”.

### CONFLICTING SOURCES
Make conflict part of the research story with clear evidence comparison.

---

# 14. Copy prompt surfaces

`NA-CPY-001` is parameterised by `surface`:

- `hero`
- `discovery`
- `loading`
- `map`
- `timeline`
- `cta`
- `source_explanation`
- `share`
- `empty_state`
- `error`
- `zero_result`

`NA-CPY-003` handles:
- pre-paywall;
- paywall;
- checkout;
- lifecycle email;
- gift;
- upsell.

### Copy blacklist

Avoid:
- "Unlock the power of…"
- "Uncover shocking secrets…"
- "Your ancestors are waiting…"
- "Only today" unless objectively true.
- "We found your ancestor" without verified linkage.
- "Your family crest" from surname-only heraldry.
- "AI discovered" as authority.
- fake database-scanning theatre.

---

# 15. Report prompt architecture

The report generator is an assembler, not a researcher.

```text
Validated research objects
    ↓
Modular section writers
    ↓
Source/methodology appendix
    ↓
Full report assembler
    ↓
QA
    ↓
Editorial design
```

## Report claim labels

Internally every meaningful paragraph stores:

```json
{
  "claim_type": "FACT|INTERPRETATION|HYPOTHESIS|UNKNOWN",
  "confidence": "VERIFIED|LIKELY|POSSIBLE|UNCONFIRMED|CONFLICTING|INSUFFICIENT_DATA",
  "source_ids": [],
  "scope": "surname_level|family_level|person_level"
}
```

The final user report may express this visually rather than repeating labels in every sentence, but provenance must remain accessible.

---

# 16. Design prompt context

Attach this reusable design block to design/image prompts:

```text
NAME ATLAS DESIGN CONTEXT

Create a premium consumer discovery experience with an editorial, cartographic and historical-data character.

Visual qualities:
- modern;
- restrained;
- intelligent;
- emotionally engaging;
- source-aware;
- mobile-first;
- globally adaptable.

Prefer:
- large editorial typography;
- generous spacing;
- maps as storytelling;
- timelines as narrative;
- contemporary treatment of archival material;
- precise metadata;
- restrained motion;
- tactile but modern report design;
- clear evidence/confidence cues.

Avoid:
- parchment;
- wax seals;
- medieval fantasy;
- generic heraldic shields;
- generic family trees with decorative branches;
- stock photographs of grandparents;
- sepia as a default history effect;
- glowing AI gradients;
- glassmorphism;
- generic SaaS dashboards;
- random fabricated archival documents;
- a fixed example surname.

Use only [SURNAME], [YOUR SURNAME], [PLACE], [YEAR] placeholders unless the task supplies real approved data.
```

---

# 17. Image generation prompt family

`NA-IMG-001` accepts `asset_type`:

`concept_board | ui_render | map_language | report_cover | mobile_screen | share_card | abstract_brand | archival_reinterpretation | cartographic_background | motion_keyframe`

## Mandatory image rules

1. State the design purpose, not only aesthetics.
2. State aspect ratio and target platform.
3. Use global-neutral placeholders.
4. Never make a fabricated document look like a genuine research finding.
5. If demonstrating historical-material treatment without a real source, clearly request **abstract / non-legible / fictional placeholder texture**, not names, dates, seals or records.
6. Separate visual map styling studies from factual maps. A styling render must not imply geographic truth.
7. Mobile render prompts should specify 390×844-style proportions or 9:19.5 composition.
8. Social prompts should specify 9:16 / 1080×1920 logic.

---

# 18. SEO prompt architecture

## Programmatic SEO hard gate

A surname page can only be generated when `NA-SEO-004` confirms minimum unique evidence.

Suggested minimum:
- at least two meaningful surname-specific data dimensions; and
- at least one source-backed interpretive or geographic dimension; and
- unique structured values sufficient to avoid template-only text.

If not met:
`NOINDEX_OR_DO_NOT_GENERATE`

### Prohibited SEO behavior
- invented etymologies;
- paraphrasing the same generic history across hundreds of thousands of names;
- pages differing only by surname token;
- unverified heraldic claims;
- fake FAQ answers;
- claiming “origin” when only current distribution exists.

---

# 19. Growth prompt rules

Growth prompts may amplify **identity and discovery**, not uncertainty or fear.

Good:
- rarity/share cards;
- map;
- compare surnames;
- origin clues;
- gift edition;
- historical-variant cards.

Bad:
- "Your surname hides a dark secret";
- fake "only 3 reports left";
- fake celebrity/social proof;
- invented ancestry connection.

---

# 20. QA architecture

QA prompts do not rewrite by default.

All QA output uses:

```json
{
  "issues": [
    {
      "issue_id": "qa_...",
      "severity": "CRITICAL|HIGH|MEDIUM|LOW",
      "category": "...",
      "location": "...",
      "claim_or_element": "...",
      "why": "...",
      "source_or_rule": "...",
      "suggested_fix": "...",
      "human_review_required": false
    }
  ],
  "decision": "PASS|REVIEW|FAIL"
}
```

### Severity

- **CRITICAL:** could materially mislead user, violate source/privacy/licensing rules, fabricate genealogy or misrepresent payment.
- **HIGH:** substantive factual/scope/confidence problem.
- **MEDIUM:** incomplete/ambiguous but unlikely to create major false belief.
- **LOW:** clarity/style/consistency issue.

---

# 21. Evaluation Framework

Use a **0–4 anchored scale** rather than 0–5. Four points reduce false precision and force clearer distinction.

| Score | Meaning |
|---:|---|
| 0 | Missing / unsafe / incorrect |
| 1 | Poor; major remediation needed |
| 2 | Usable only with meaningful revision |
| 3 | Production-quality with minor issues |
| 4 | Excellent; robust against edge cases |

## Evaluation dimensions

1. **Factual Accuracy** — hard gate for research outputs.
2. **Source Quality**
3. **Evidence–Claim Scope Match**
4. **Confidence Calibration** — hard gate.
5. **Completeness**
6. **Relevance**
7. **Clarity**
8. **User Value**
9. **Brand / UX Fit**
10. **Safety / Privacy / Legal Awareness**
11. **Hallucination Risk** — inverse, hard gate.
12. **Structured Output Compliance**

## Decision

### PASS
- weighted average ≥ 3.2;
- no hard-gate dimension below 3;
- no CRITICAL issue.

### REVIEW
- average 2.5–3.19; or
- any high-risk task lacking required human review; or
- one hard-gate dimension = 2.

### FAIL
- average < 2.5; or
- any hard-gate dimension 0–1; or
- fabricated source/record/number; or
- material schema failure.

Do not use evaluation scores as user-facing confidence.

---

# 22. Failure handling matrix

| Condition | System behavior | Confidence | User-facing action | Human review |
|---|---|---|---|---|
| NO DATA | Return empty structured result; do not invent narrative | INSUFFICIENT_DATA | spelling/variant/country options | Optional |
| LOW DATA | Show only validated dimensions | POSSIBLE / INSUFFICIENT | reduced result; suppress weak premium | Conditional |
| CONFLICTING SOURCES | Preserve both claims and conflict evidence | CONFLICTING | compare interpretations | Often |
| OUTDATED SOURCE | Mark data date and freshness issue | depends | show date/limitation | If material |
| UNCLEAR ETYMOLOGY | Return competing/unknown | POSSIBLE / INSUFFICIENT | "origin not established" | Specialist optional |
| MULTIPLE ORIGINS | Keep parallel hypotheses | LIKELY/POSSIBLE | show alternatives | Conditional |
| FOREIGN SURNAME | Activate locale/source-specific research | depends | explain coverage | Conditional |
| TRANSLITERATED | Preserve original/transliterated forms separately | depends | ask/offer script variant | Conditional |
| VERY COMMON | Avoid family inference from surname | — | focus surname-level; request family context for research | Person research yes |
| VERY RARE | Do not infer one family lineage | — | explain sparse evidence | Conditional |
| RECENTLY CREATED / CHANGED | Treat legal/name-change evidence separately | depends | explain modern origin possibility | If person-specific |
| SOURCE ACCESS FAILURE | Do not treat "not retrieved" as "does not exist" | UNKNOWN | service/source unavailable | No |
| API FAILURE | Use documented fallback or partial result | — | transparent degraded state | No |
| ARCHIVE HIT WITHOUT PERSON MATCH | Preserve surname occurrence only | UNCONFIRMED family link | "surname appears in..." | Yes before ancestor claim |
| HERALDIC REFERENCE | State surname/family reference only | POSSIBLE unless lineage proven | no personal crest claim | Yes for lineage |
| UNVERIFIED FAMILY CONNECTION | Keep as candidate | UNCONFIRMED | explain what evidence is missing | Yes |

---

# 23. Workflow chains

## CHAIN A — BASIC SURNAME LOOKUP

```text
User surname
↓
Input normalisation / locale
↓
Approved source retrieval
↓
NA-DAT-001 Source Normaliser
↓
NA-GEO-001 Distribution
↓
NA-ONO-001/002/003/004/005
↓
NA-VAR-001
↓
NA-ONO-008 Origin Hypothesis Ranker
↓
NA-ORC-003 Evidence Ledger
↓
NA-CNF-001 Confidence
↓
NA-DAT-003 Data Gaps
↓
NA-RPT-001 Free Snapshot
↓
NA-QA-001 + NA-QA-005
↓
FREE RESULT
```

## CHAIN B — FULL SURNAME REPORT

```text
Validated Basic Profile
↓
Expanded variant / historical-place / archive / migration research
↓
Source normalisation
↓
Evidence ledger + conflict resolver
↓
Confidence classification
↓
DiscoveryIndex
↓
Modular report sections
↓
Full Surname Report
↓
Source/Methodology/Limitations Appendix
↓
QA Fact + Source + Confidence + Completeness
↓
Premium report
```

## CHAIN C — FAMILY ORIGIN

```text
Surname profile
+
NA-FAM-001 minimal family context
↓
Targeted geography/variant/archive research
↓
Family-level hypotheses
↓
Data gap + confidence
↓
Family Origin Report
↓
Human review if trigger fires
```

## CHAIN D — DEEP FAMILY RESEARCH

```text
Person data
↓
Privacy/minimisation check
↓
Search planner
↓
Archive queries
↓
Candidate records
↓
Ancestor Match Evaluator
↓
Record Linkage
↓
Kinship Consistency / Conflicts
↓
Ancestor Evidence Packs
↓
Human review where required
↓
Deep Research Report
```

## CHAIN E — SEO

```text
Validated surname profile
↓
Minimum evidence gate
↓
SEO page generation
↓
Metadata / FAQ
↓
Thin / duplicate / fact QA
↓
Publish / noindex / do-not-generate
```

## CHAIN F — PRODUCT DESIGN

```text
Research + product goals
↓
Information architecture
↓
Discovery flow
↓
Mobile wireflow
↓
UX copy
↓
Art direction / UI
↓
Analytics event taxonomy
↓
QA + implementation brief
```

## CHAIN G — PAYWALL

```text
Validated research objects
↓
DiscoveryIndex
↓
Tier entitlement
↓
Pre-paywall design
↓
Report preview
↓
Paywall variant
↓
Paywall Truthfulness QA
↓
Experiment plan
```

## CHAIN H — SOURCE ONBOARDING

```text
Source Discovery
↓
Source Evaluation
↓
Freshness
↓
Licensing / Privacy risk
↓
Data mapping
↓
Integration contract
↓
Golden sample validation
↓
Approved / blocked / legal review
```

## CHAIN I — GLOBAL MARKET EXPANSION

```text
Country
↓
Source inventory
↓
Language/onomastic capability
↓
Licensing/privacy assessment
↓
Coverage/gap analysis
↓
Localisation
↓
Product feature readiness
↓
Country launch decision
```

## CHAIN J — GIFT

```text
Existing validated report
↓
Gift intent / recipient relation
↓
Privacy rules
↓
Gift edition design/copy
↓
Preview
↓
Purchase
↓
Recipient optional family-research onboarding
```

---

# 24. Prompt dependency graph

```text
                         ┌───────────────┐
                         │ NA-CTX-001    │
                         └──────┬────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Source layer SRC/DAT  │
                    └──────┬───────┬────────┘
                           │       │
                ┌──────────▼───┐   └─────────────┐
                │ Onomastics   │                 │
                │ ONO/VAR/GEO  │                 │
                └──────┬───────┘                 │
                       │                         │
                ┌──────▼────────┐       ┌────────▼───────┐
                │ Evidence/CNF  │       │ Archive / GEN  │
                └──────┬────────┘       └────────┬───────┘
                       │                         │
             ┌─────────▼─────────┐               │
             │ DiscoveryIndex    │◄──────────────┘
             └──────┬──────┬────┘
                    │      │
              ┌─────▼───┐  └──────────────┐
              │ UX/RPT  │                 │
              └────┬────┘           ┌─────▼──────┐
                   │                │ PAY/GROWTH │
                   │                └─────┬──────┘
                   └────────┬─────────────┘
                            ▼
                           QA
                            │
            ┌───────────────┼────────────────┐
            ▼               ▼                ▼
         PRODUCT           SEO              DEV
```

## Automation vs human approval

### Fully automatic when sources are approved
- deterministic normalisation;
- current counts;
- map aggregation;
- citation formatting;
- basic copy generation after QA;
- zero/low-data routing.

### Automatic with QA gate
- etymology synthesis;
- origin hypotheses;
- historical variants;
- premium report prose;
- SEO pages;
- paywall inventory.

### Human review conditional
- conflicting onomastic interpretations;
- archive matching;
- migration claims from incomplete evidence;
- legal/licensing ambiguity.

### Human approval mandatory
- asserting a specific ancestor from ambiguous records;
- constructing new kinship relationships;
- linking a user family to nobility/heraldry;
- resolving high-stakes privacy/licensing uncertainty.

---

# 25. Structured outputs

The following schemas are deliberately compact. Production should formalise them as JSON Schema / Pydantic / TypeScript models.

## 25.1 Source

```json
{
  "source_id": "src_001",
  "name": "string",
  "publisher": "string|null",
  "type": "official_dataset|academic|archive|dictionary|commercial|community|other",
  "url_or_reference": "string",
  "geographic_scope": ["PL"],
  "temporal_scope": {"from": null, "to": null},
  "granularity": "surname|person|place|mixed",
  "authority_notes": "string",
  "methodology_notes": "string|null",
  "data_date": "YYYY-MM-DD|null",
  "accessed_at": "ISO-8601",
  "license_status": "CLEAR_ALLOWED|CLEAR_RESTRICTED|ATTRIBUTION_REQUIRED|NON_COMMERCIAL_ONLY|UNKNOWN|LEGAL_REVIEW_REQUIRED",
  "limitations": [],
  "approved_for": []
}
```

## 25.2 Citation

```json
{
  "citation_id": "cit_001",
  "source_id": "src_001",
  "title": "string",
  "publisher": "string|null",
  "date": "string|null",
  "url_or_reference": "string",
  "accessed_at": "ISO-8601",
  "supporting_locator": "page/record/field|null"
}
```

## 25.3 ConfidenceAssessment

```json
{
  "claim_id": "clm_001",
  "status": "VERIFIED|LIKELY|POSSIBLE|UNCONFIRMED|CONFLICTING|INSUFFICIENT_DATA",
  "scope": "surname_level|family_level|person_level",
  "evidence_ids": [],
  "counter_evidence_ids": [],
  "reason": "string",
  "human_review_required": false
}
```

## 25.4 Etymology

```json
{
  "surname": "[SURNAME]",
  "interpretations": [
    {
      "interpretation_id": "ety_001",
      "summary": "string",
      "root": "string|null",
      "formation_type": "string|null",
      "language": "string|null",
      "claim_type": "FACT|INTERPRETATION|HYPOTHESIS",
      "confidence": "LIKELY",
      "source_ids": []
    }
  ],
  "limitations": []
}
```

## 25.5 OriginHypothesis

```json
{
  "hypothesis_id": "org_001",
  "kind": "linguistic|geographic|toponymic|mixed",
  "claim": "string",
  "candidate_places": [],
  "supporting_evidence_ids": [],
  "counter_evidence_ids": [],
  "confidence": "POSSIBLE",
  "scope": "surname_level",
  "limitations": []
}
```

## 25.6 HistoricalVariant

```json
{
  "variant_id": "var_001",
  "form": "string",
  "variant_type": "documented_historical|transliteration|orthographic|similar_unproven|ocr_suspect|uncertain",
  "first_seen": "string|null",
  "last_seen": "string|null",
  "place_ids": [],
  "source_ids": [],
  "confidence": "LIKELY"
}
```

## 25.7 HistoricalPlace

```json
{
  "place_id": "plc_001",
  "display_name": "string",
  "historical_name": "string|null",
  "modern_name": "string|null",
  "country_code": "PL|null",
  "coordinates": {"lat": null, "lon": null},
  "valid_time": {"from": null, "to": null},
  "administrative_context": [],
  "relation_to_surname": "attested_occurrence|origin_hypothesis|concentration|other",
  "source_ids": [],
  "confidence": "POSSIBLE"
}
```

## 25.8 ArchiveReference

```json
{
  "archive_ref_id": "arc_001",
  "archive_name": "string",
  "collection": "string|null",
  "record_type": "string|null",
  "date_or_range": "string|null",
  "place_id": "string|null",
  "surname_forms": [],
  "person_identified": false,
  "target_family_link_established": false,
  "source_id": "src_...",
  "citation_id": "cit_...",
  "confidence": "UNCONFIRMED",
  "notes": []
}
```

## 25.9 MigrationClue

```json
{
  "migration_clue_id": "mig_001",
  "scope": "surname_level|family_level",
  "from_place_id": "string|null",
  "to_place_id": "string|null",
  "period": "string|null",
  "basis": "distribution_change|linked_person_records|diaspora_occurrence|other",
  "evidence_ids": [],
  "confidence": "POSSIBLE",
  "causal_claim_allowed": false
}
```

## 25.10 FamilyPerson

```json
{
  "person_id": "fam_001",
  "relationship_to_user": "self|parent|grandparent|other|unknown",
  "given_names": [],
  "surnames": [],
  "maiden_surname": "string|null",
  "birth": {"date": null, "range": null, "place": null},
  "death": {"date": null, "range": null, "place": null},
  "known_residences": [],
  "user_provided": true,
  "living_status": "living|deceased|unknown",
  "consent_or_basis_notes": "string|null"
}
```

## 25.11 CandidateRecord

```json
{
  "candidate_id": "rec_001",
  "source_id": "src_...",
  "record_type": "birth|baptism|marriage|death|census|residence|military|other",
  "names": [],
  "date": "string|null",
  "place_id": "string|null",
  "relations": [],
  "raw_reference": "string",
  "match_target_person_id": "fam_001|null",
  "identity_status": "candidate|rejected|needs_review|linked",
  "contradictions": [],
  "source_quality_notes": []
}
```

## 25.12 EvidenceLink

```json
{
  "evidence_link_id": "lnk_001",
  "from_entity_id": "fam_001",
  "to_entity_id": "rec_001",
  "relationship_type": "same_person|parent_child|spouse|place_connection|variant_connection|other",
  "supporting_evidence_ids": [],
  "contradictions": [],
  "review_status": "automatic_candidate|human_reviewed|verified|rejected"
}
```

## 25.13 DiscoveryIndex

```json
{
  "surname": "[SURNAME]",
  "generated_at": "ISO-8601",
  "historical_variants_count": 0,
  "historical_places_count": 0,
  "archive_references_count": 0,
  "migration_clues_count": 0,
  "source_count": 0,
  "source_types": [],
  "confidence_distribution": {
    "VERIFIED": 0,
    "LIKELY": 0,
    "POSSIBLE": 0,
    "UNCONFIRMED": 0,
    "CONFLICTING": 0,
    "INSUFFICIENT_DATA": 0
  },
  "available_sections": [],
  "unavailable_sections": [],
  "family_research_eligible": false,
  "notes": []
}
```

## 25.14 ReportSection

```json
{
  "section_id": "sec_001",
  "type": "origin|distribution|variants|places|timeline|migration|archives|sources|limitations|other",
  "title": "string",
  "summary": "string",
  "blocks": [],
  "claim_ids": [],
  "citation_ids": [],
  "confidence_summary": [],
  "limitations": []
}
```

## 25.15 SurnameProfile

```json
{
  "surname": "[SURNAME]",
  "normalised_forms": [],
  "locale_context": [],
  "current_distribution": {},
  "etymology": {},
  "origin_hypotheses": [],
  "historical_variants": [],
  "historical_places": [],
  "archive_references": [],
  "migration_clues": [],
  "claims": [],
  "sources": [],
  "citations": [],
  "data_gaps": [],
  "limitations": [],
  "quality_status": "PASS|REVIEW|FAIL"
}
```

---

# 26. Orchestration contract

The orchestrator must never ask a generative specialist to discover facts that should come from a retrieval layer.

## Correct

```text
Retrieve
→ normalise
→ evaluate evidence
→ specialist interpretation
→ confidence
→ narrative
```

## Incorrect

```text
"Tell me everything you know about [SURNAME]"
→ publish
```

### Every chain should log

```json
{
  "run_id": "...",
  "prompt_id": "...",
  "prompt_version": "...",
  "input_schema_version": "...",
  "output_schema_version": "...",
  "source_ids": [],
  "model": "...",
  "started_at": "...",
  "completed_at": "...",
  "qa_decision": "...",
  "human_review_status": "..."
}
```

This makes prompt regressions and disputed claims traceable.

---

# 27. Human review policy

## Human review NOT normally required
- official current surname count;
- deterministic region aggregation;
- normalised citations;
- low-risk UI copy;
- visual layout proposals.

## Conditional
- etymology with conflicting specialists;
- historical-place identification;
- ambiguous archive extraction;
- migration interpretation.

## Mandatory
- identity/ancestor linking with material ambiguity;
- high-value human-research report;
- heraldic lineage claim;
- sensitive living-person inference;
- unclear commercial-use licensing before launch.

---

# 28. Recommended repository structure

```text
/name-atlas-ai
  /prompts
    /context
      NA-CTX-001/
        v1.0.0.md
    /sources
    /data
    /onomastics
    /genealogy
    /archives
    /confidence
    /product
    /ux
    /paywall
    /copy
    /reports
    /design
    /seo
    /growth
    /qa
    /evaluation
    /development
  /schemas
    surname-profile.schema.json
    source.schema.json
    evidence-claim.schema.json
    discovery-index.schema.json
    ...
  /evals
    /golden
    /edge-cases
    /regressions
  /fixtures
    /poland
    /low-data
    /conflicting
    /foreign
    /transliterated
    /rare
    /common
  /workflows
    basic-surname-lookup.yaml
    full-surname-report.yaml
    family-origin.yaml
    deep-family-research.yaml
    seo.yaml
  registry.yaml
  CHANGELOG.md
  README.md
```

## File ownership
Do not store prompt text directly inside application code. Application references a versioned prompt ID, allowing prompt changes to be tested and rolled back.

---

# 29. Prompt test corpus

The MVP should launch with a fixed regression corpus representing data shapes rather than famous surnames.

Use internal synthetic IDs such as:

- `CASE_PL_COMMON_01`
- `CASE_PL_RARE_01`
- `CASE_PL_MULTIPLE_ORIGIN_01`
- `CASE_PL_NO_ETYMOLOGY_01`
- `CASE_PL_CONFLICTING_SOURCES_01`
- `CASE_FOREIGN_LATIN_01`
- `CASE_FOREIGN_NON_LATIN_01`
- `CASE_TRANSLITERATED_01`
- `CASE_HERALDRY_REFERENCE_01`
- `CASE_ARCHIVE_SURNAME_ONLY_01`
- `CASE_FAMILY_AMBIGUOUS_MATCH_01`
- `CASE_ZERO_DATA_01`

The fixture stores evidence independently from prompt expected outputs. This prevents evaluation from rewarding plausible storytelling.

---

# 30. Prompt governance

Each production change should follow:

```text
Issue / new capability
↓
Prompt change in branch
↓
Semantic version decision
↓
Golden + edge-case evaluation
↓
QA comparison with previous version
↓
Human approval for high-risk domains
↓
Release
↓
Observe real failures
↓
Add regression case
```

## Never optimise only for "looks better"
For Name Atlas, an output that is less elegant but correctly uncertain is better than an emotionally satisfying false story.

---

# 31. Recommended build order

## Phase 1 — lock semantics
1. Canonical schemas.
2. Confidence framework.
3. Source evaluation.
4. Evidence ledger.
5. DiscoveryIndex.

## Phase 2 — surname research
6. Distribution.
7. Etymology.
8. language/geography.
9. variants.
10. hypothesis ranking.
11. gaps.

## Phase 3 — consumer output
12. free snapshot.
13. information architecture.
14. mobile discovery flow.
15. copy.
16. premium discovery index.
17. paywall truthfulness.

## Phase 4 — paid report
18. full report.
19. source appendix.
20. editorial design.
21. checkout.
22. analytics.

## Phase 5 — family research
Only after the surname-level product is stable:
- family intake;
- archives;
- record linkage;
- human review;
- Family Origin;
- Deep Research.

---

# 32. Final recommendation

The most important artifact in the whole Prompt Library is **not the Master Prompt**.

It is the combination of:

```text
SOURCE RECORD
+
EVIDENCE LEDGER
+
CONFIDENCE ASSESSMENT
+
DATA GAP MATRIX
+
DISCOVERY INDEX
```

These objects create a hard boundary between research and presentation.

Without them:
- the report model can invent a cleaner story;
- UX can assume sections that do not exist;
- paywall copy can manufacture discovery counts;
- SEO can generate thin or false pages;
- genealogy can turn surname coincidence into ancestry.

With them, the system becomes modular:

```text
raw data
   ↓
evidence
   ↓
interpretation
   ↓
confidence
   ↓
product presentation
```

For the first implementation, build the **18-prompt MVP set**, not all 99 prompts in production at once. Keep the remaining prompts in the registry as designed modules and activate them when the relevant feature exists.

The next implementation milestone after this architecture should be:

**Schema v1 → Source/Evidence framework → 18 MVP prompts as separate versioned `.md` files → regression corpus → Basic Surname Lookup chain.**
