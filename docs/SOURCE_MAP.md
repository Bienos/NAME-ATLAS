# SOURCE_MAP.md — corpus classification

What each document in this repository is, what it owns, and how much authority it carries.

## Authority order

```text
current task file  (tasks/NNN-*.md)
→ accepted ADRs (docs/adr/) and contracts (docs/contracts/)
→ PRODUCT.md / ARCHITECTURE.md / PLAN.md / STATUS.md
→ docs/canonical/10–23
→ docs/library/
→ docs/archive/
```

A lower entry never overrides a higher one. Where a canonical document conflicts with an accepted ADR, the ADR wins and the ADR says what it supersedes.

## Classification

| Class | Meaning | Read policy |
|---|---|---|
| **Canonical engineering spec** | Binding specification for engineering | Read the named sections a task references. Read-only. |
| **Canonical design input** | Binding for product/UX intent, not for engineering structure | Read only when a task needs it |
| **Supporting research** | Background, research and rationale | Read only when a task names the file |
| **Archive / combined copy** | Large duplicative material | Do not read routinely |
| **Control plane** | Written and maintained by this repository | Read per `AGENTS.md` |
| **Process** | Session prompts and packaging notes | Reference only |

## Canonical engineering spec — `docs/canonical/` (read-only)

| Document | Owns |
|---|---|
| `10_NAME_ATLAS_MVP_BUILD_ARCHITECTURE.md` | The MVP contract: what is in and out of the MVP, the free promise, the premium contract, MVP non-goals, the canonical user flow, the architecture decision log (AD-001…AD-007), and the data feasibility reality check including the two critical blockers (current regional map; Polish etymology/onomastics). **Its §6.2 stack recommendation is superseded by ADR-0001.** |
| `11_NAME_ATLAS_CANONICAL_DATA_MODEL.md` | The canonical persistence model: entity inventory, field-level specifications, domain boundaries, geography model, the distribution model (`DistributionSnapshot` / `DistributionValue`), the source/rights/evidence model, and the claim/confidence/citation model. The authority for what a table means. |
| `12_NAME_ATLAS_SOURCE_CONNECTOR_ARCHITECTURE.md` | External sources: the verified per-source facts and rights snapshot (2026-09-17), connector classification and contract, the source registry, rights-registry integration and hard gates, the MVP source status matrix, and the PESEL and Polona connector specifications. |
| `13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md` | Surname identity and resolution: input model and validation, Unicode normalisation (NFC canonical identity), Polish diacritic policy, gendered form handling, double/hyphenated surnames, the candidate tier model (T0–T5) and resolution policy. The authority for when two strings are the same surname. |
| `14_NAME_ATLAS_EVIDENCE_AND_CLAIM_ENGINE.md` | The trust chain: evidence taxonomy and schema, evidence directness and independence, source authority, primary/secondary/tertiary evidence, the claim model and taxonomy, confidence assessment, and surface eligibility. **The authority for the separation of confidence from rights** (§80, §99.10). |
| `15_NAME_ATLAS_RUNTIME_ORCHESTRATION.md` | Execution: the P0 runtime stack, canonical-state vs transport-state rule, bounded runtime components, research run model, run types and status, readiness vs run status, and the main lookup flow. Basis for ADR-0001. |
| `16_NAME_ATLAS_API_AND_FRONTEND_DATA_CONTRACT.md` | The API and presentation boundary: REST + SSE choice, the thin same-origin BFF and what it may not do, versioning, endpoint inventory, search and profile resources, chapter/section contracts and state models. The authority for contract semantics. |
| `17_NAME_ATLAS_GOLDEN_TEST_CORPUS_AND_QA.md` | QA: the twelve QA layers, the P0 test technology stack (Vitest, Testcontainers, Playwright, Storybook, fast-check, k6; Pact explicitly not P0), the golden corpus principle and case schema, the seed entity set, resolution corpus and metrics, and the P0 hard-fail list. |
| `18_NAME_ATLAS_ANALYTICS_AND_EXPERIMENTATION.md` | Measurement: analytics tooling decision, measurement principles, the analytics/observability/QA separation, metric hierarchy, North Star, activation and funnel definitions. Analytics never changes domain truth. |
| `19_NAME_ATLAS_PRIVACY_SECURITY_LEGAL_OPS.md` | Privacy, security and legal operations: the legal baseline, the public-surname vs private-family boundary, data domains, the privacy/security classification axes, data-subject and living-status rules, purpose and lawful-basis registries, consent architecture, and the security verification target. |
| `20_NAME_ATLAS_PAYMENTS_REPORT_DELIVERY_ENTITLEMENTS.md` | Commerce: payment provider research and decision, PSP vs merchant-of-record, Polish payment methods, hosted checkout and the PCI boundary, and the Offer/Order/Entitlement/Delivery/Refund/Reconciliation domain. |
| `21_NAME_ATLAS_SEO_PROGRAMMATIC_ACQUISITION.md` | Organic acquisition: SEO eligibility and projection, indexability and publication status, canonical URL and locale policy, slug policy, normalisation, collisions, aliases and history, gender-form and variant URL handling, page types and sitemap cohorts. |
| `22_NAME_ATLAS_INTERNAL_ADMIN_RESEARCH_CONSOLE.md` | Internal tooling: admin application and deployment separation, staff authentication, the role/RBAC+ABAC model, surname and resolution inspectors, high-risk merge/split workflows with dual control, the source registry and connector operations, schema-drift handling, and the rights console. |
| `23_NAME_ATLAS_IMPLEMENTATION_ROADMAP.md` | Sequencing: the paid-MVP scope and non-goals, the vertical-slice principle, effort classes, infrastructure recommendation, repository strategy, module boundaries, the staged migration groups A–G, first indexes, UUIDv7 and PostGIS timing, foundation spikes, the milestone map M0–M9, per-milestone exit gates, the master epic table and the first thirty epics. Basis for `PLAN.md`. |

## Canonical design input — `docs/library/` (read on demand)

Binding for product and UX intent, not for engineering structure. Read only the file a task names.

| Document | Owns |
|---|---|
| `NAME_ATLAS_VISUAL_SYSTEM_v1(1).md` | Visual system: typography, colour, components, visual language |
| `NAME_ATLAS_Information_Architecture_Blueprint(1).md` | Information architecture and page/section structure |
| `NAME_ATLAS_MOBILE_WIREFLOW(1).md` | Mobile wireflow and screen-level interaction |
| `name_atlas_discovery_flow_research_ux_playbook(1).md` | Discovery flow and research-result UX patterns |
| `NAME_ATLAS_PAYWALL_SYSTEM(1).md` | Paywall presentation and premium framing |
| `NAME_ATLAS_DATA_TRUTH_LAYER(1).md` | Earlier data-truth layer thinking; superseded as engineering spec by canonical `11`/`14`, retained for rationale |
| `NAME_ATLAS_GENEALOGY_SOURCE_ARCHITECTURE(1).md` | Earlier genealogy source landscape; superseded as engineering spec by canonical `12` |

## Supporting research — `docs/library/`

| Document | Owns |
|---|---|
| `NAME_ATLAS_USER_INTENT_RESEARCH(2).md` | User intent research |
| `name_atlas_user_intent_research(1)(1).md` | Near-duplicate earlier revision of the above — prefer `(2)` |
| `NAME_ATLAS_09_PROMPT_LIBRARY(1).md` | Prompt library used to produce the corpus; not a runtime artifact |
| `NAME_ATLAS_MD_MANIFEST_2026-09-17.md` | Manifest of the original 2026-09-17 document set |

## Reference — `docs/reference/`

| Document | Owns |
|---|---|
| `A_Token-Efficient_Workflow_for_Building_Production_Apps.pdf` | Background on the control-plane/token-efficient workflow this repository implements. Method, not specification. |

## Archive / combined copy — do not read routinely

| Document | Note |
|---|---|
| `docs/archive/NAME_ATLAS_MASTER_COMBINED_2026-09-17.md` | ~1.7 MB concatenation duplicating much of `docs/library/`. Kept for provenance. Never read in bulk; if a passage is needed, `grep -n` for it and read the line range. |
| `docs/review/NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` | The reviewed plan as delivered. The byte-identical root copy was deleted on 2026-09-24. |

## Process documents — historical, reference only

None of these describe the current state or the next step. For those, read `STATUS.md`.

| Document | Note |
|---|---|
| `docs/review/NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md` | The review that mandated this control plane (FIX-01…FIX-08). Its TASK-001…TASK-018 sequence is **not** the numbering of `tasks/`: from TASK-006 on, the same numbers name different tasks |
| `docs/history/` | Superseded orientation and status files, moved out of the root and `docs/implementation/` on 2026-09-24: `00_READ_THIS_FIRST.md`, `PACKAGE_MANIFEST.md` (still the SHA-256 reference for `docs/canonical/`, `docs/library/` and `docs/archive/`), and a 2026-09-21 handoff note and task index. See `docs/history/README.md` |
| `prompts/00_FIRST_CLAUDE_PROMPT_CONTROL_PLANE.md` | The control-plane session prompt (its root copy `FIRST_PROMPT_TO_COPY.md` was deleted as a duplicate) |
| `prompts/01_IMPLEMENT_TASK_001_FOUNDATION.md` | The prompt for the TASK-001 implementation session |

## Stack evolution — explicit note

The corpus contains a genuine, dated evolution of the runtime decision. It is not a contradiction to be resolved per session:

```text
docs/canonical/10  §6.2   — FastAPI / Python application runtime recommendation
        ↓
docs/canonical/15  §1.1   — TypeScript modular monolith + Next.js + PostgreSQL/PostGIS
docs/canonical/23  §6–§8  — same, with repository and infrastructure strategy
        ↓
docs/adr/0001-stack.md    — P0 decision: TypeScript/Node.js + Next.js + PostgreSQL/PostGIS/pg_trgm,
                            Redis/Valkey and BullMQ deferred to M3, object storage when required,
                            OpenTelemetry progressively, Python only later for specialist OCR/data-science
```

`docs/canonical/10` §6.2 remains historically accurate and is **not** edited. It is superseded for implementation by ADR-0001. Two further corpus-level clarifications are recorded in the same ADR: confidence is decoupled from rights, and `DistributionSnapshot` remains surname-scoped.

## Control plane — owned and maintained here

`AGENTS.md` · `CLAUDE.md` · `PRODUCT.md` · `ARCHITECTURE.md` · `PLAN.md` · `STATUS.md` · `docs/progress/` · `PROGRESS.md` (frozen log to 2026-09-24) · `docs/SOURCE_MAP.md` · `docs/CODEMAP.md` · `docs/DECISIONS_NEEDED.md` · `docs/adr/` · `docs/contracts/` · `tasks/`

Ownership per file is listed in `AGENTS.md` §1.
