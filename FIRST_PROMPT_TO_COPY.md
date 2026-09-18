# NAME ATLAS — CLAUDE CODE SESSION 0
## Repository control plane only

<role>
You are the architecture custodian for Name Atlas.

Your job in this session is to convert the existing specification corpus into a small, durable repository control plane for future Claude Code sessions.

This is NOT an implementation session.
</role>

<operating_mode>
Use a targeted, read-only preflight before creating files.

Do not perform generic repository onboarding.
Do not recursively read all of `docs/library/` or `docs/archive/`.
Do not use package managers.
Do not scaffold applications.
Do not write production code.
Do not modify `docs/canonical/`.
Do not start TASK-001 implementation.

If a source conflict is genuinely unresolved, record it in `docs/DECISIONS_NEEDED.md`.
Do not silently invent a resolution.

Ask me a question only if an unresolved decision prevents completion of THIS session. Otherwise record it and continue.
</operating_mode>

<read_order>
Read exactly these first:

1. `00_READ_THIS_FIRST.md`
2. `NAME_ATLAS_IMPLEMENTATION_PLAN_REVIEWED_2026-09-18.md`
3. `docs/canonical/23_NAME_ATLAS_IMPLEMENTATION_ROADMAP.md`
4. `docs/canonical/15_NAME_ATLAS_RUNTIME_ORCHESTRATION.md`
5. `docs/canonical/11_NAME_ATLAS_CANONICAL_DATA_MODEL.md`
6. `docs/canonical/14_NAME_ATLAS_EVIDENCE_AND_CLAIM_ENGINE.md`
7. `docs/canonical/13_NAME_ATLAS_SURNAME_RESOLUTION_ENGINE.md`
8. `docs/canonical/17_NAME_ATLAS_GOLDEN_TEST_CORPUS_AND_QA.md`
9. `docs/canonical/19_NAME_ATLAS_PRIVACY_SECURITY_LEGAL_OPS.md`

Only open additional canonical files when needed to resolve a concrete dependency.

Do not load the full library/archive corpus into context.
</read_order>

<fixed_decisions>
Treat these as already decided. Formalise them; do not re-litigate them.

1. P0 runtime:
   - Next.js
   - TypeScript / Node.js
   - TypeScript modular monolith
   - PostgreSQL
   - PostGIS
   - `pg_trgm`
   - Redis/Valkey only when asynchronous historical research requires it
   - BullMQ only when asynchronous historical research requires it
   - object storage only when required
   - OpenTelemetry progressively
   - Python only later for specialist OCR/data-science workloads if justified

2. The P0 TypeScript runtime supersedes the earlier FastAPI/Python application-runtime recommendation in Document 10.

3. Epistemic confidence and rights are separate dimensions:

   `Claim -> ConfidenceAssessment`

   separately from:

   `Claim/Evidence -> RightsProfile -> SurfaceEligibility`

   Rights restrictions must not reduce factual confidence.

4. `DistributionSnapshot` remains surname-scoped.

   For national PESEL data:

   `Surname -> DistributionSnapshot -> national DistributionValue(place_id = null)`

5. The old oversized BUILD-001 approach is superseded.

   Planned sequence:

   - TASK-001 Project foundation
   - TASK-002 PESEL source spike
   - TASK-003 Exact surname resolver
   - TASK-004 PESEL ingestion + Source/Rights
   - TASK-005 CURRENT_POPULATION truth chain

Only TASK-001 should be specified in detail now.
</fixed_decisions>

<decision_to_make>
Create `docs/adr/0002-db-access.md`.

Choose ONE TypeScript PostgreSQL access/query approach.

Evaluate only realistic candidates such as:
- Drizzle
- Kysely
- Prisma
- node-postgres / SQL-first

Optimise for:
- PostgreSQL-first behaviour
- PostGIS
- `pg_trgm`
- JSONB
- partial indexes
- explicit and reviewable migrations
- Testcontainers
- TypeScript safety
- ability to drop to explicit SQL without fighting the abstraction

Make the decision once and record consequences.
Do not leave this open for future implementation sessions.
</decision_to_make>

<create_exactly>
Create these files/directories if missing:

- `AGENTS.md`
- `CLAUDE.md`
- `PRODUCT.md`
- `ARCHITECTURE.md`
- `PLAN.md`
- `PROGRESS.md`
- `docs/SOURCE_MAP.md`
- `docs/CODEMAP.md`
- `docs/DECISIONS_NEEDED.md`
- `docs/adr/0001-stack.md`
- `docs/adr/0002-db-access.md`
- `docs/contracts/`
- `tasks/001-project-foundation.md`

Do not create application source files.
</create_exactly>

<file_requirements>
### AGENTS.md
Keep it short and operational.

It must define:
- canonical source ownership
- `docs/canonical/` is read-only
- current task file is the scope authority
- read `PROGRESS.md`
- read only task-referenced ADRs/contracts
- targeted preflight before editing
- no generic repo-wide exploration
- no unrelated refactors/formatting
- no dependency upgrades unless required by task
- preserve existing contracts/behaviour
- smallest complete implementation
- focused verification
- full diff review before completion
- remove accidental changes
- update `PROGRESS.md` with facts only
- STOP after the current task

### CLAUDE.md
Do not duplicate AGENTS.md.

Start with:

`@AGENTS.md`

Then add only Claude-specific context rules.

When compacting, preserve:
- current task ID
- changed files
- commands/tests run and results
- unresolved blockers

### PRODUCT.md
Durable product truth only:
- problem
- target user
- surname-level MVP promise
- primary user journey
- free scope
- premium scope
- trust/evidence rules
- explicit non-goals
- production-ready definition
- unresolved external product/data dependencies

No implementation progress or session history.

### ARCHITECTURE.md
Compact system map:
- P0 topology
- module ownership
- major data flow
- trust/evidence boundary
- rights boundary
- frontend presentation-object boundary
- public/private data boundary
- runtime boundary
- deployment boundary
- invariants

Reference canonical docs instead of copying them.

### PLAN.md
Coarse milestones only:

- M0 Foundation + source risk removal
- M1 Current surname vertical slice
- M2 Complete current surname intelligence + free profile
- M3 Historical discovery / Polona
- M4 Coverage + DiscoveryIndex + premium eligibility
- M5 Premium report without payments
- M6 Commerce / paid limited beta
- M7 Public paid MVP hardening
- M8 SEO qualified cohort

Do not create detailed future tasks.

### PROGRESS.md
Factual baseline only.

At this stage it should reflect:
- control plane created
- no application foundation implemented yet
- next approved task = TASK-001
- known blockers only

Do not write a diary.

### SOURCE_MAP.md
For the relevant corpus, classify sources as:
- canonical engineering spec
- canonical design input
- supporting research
- archive/combined copy

For canonical documents 10–23, state what each owns.

Explicitly note the stack evolution.

### CODEMAP.md
Keep minimal because application code does not exist yet.

Record only current stable repository areas and mark future code areas as planned, not existing.

### DECISIONS_NEEDED.md
Only unresolved decisions that materially affect implementation.

Evaluate:
- exact production PESEL resource(s), scope and version metadata
- onomastics rights/source strategy
- Polona metadata/OCR/image surface rights
- current regional surname-map availability
- any unresolved issue that actually blocks TASK-001

Do not add speculative future choices.

### docs/adr/0001-stack.md
Record the fixed P0 stack and what it supersedes.

### docs/adr/0002-db-access.md
Record the selected DB/query approach, alternatives considered, consequences, and "do not revisit unless" conditions.

### tasks/001-project-foundation.md
Goal:

Create the smallest production-shaped, testable TypeScript monorepo foundation required before the first surname vertical slice.

In scope:
- pnpm workspace
- strict TypeScript
- `apps/web`
- minimal `apps/admin`
- minimal `apps/worker`
- initial shared packages
- lint/format
- root build/test/typecheck scripts
- Vitest
- fast-check
- Testcontainers
- local/test PostgreSQL
- PostGIS
- `pg_trgm`
- migration mechanism consistent with ADR-0002
- GitHub Actions
- `.env.example`
- minimal health/build smoke checks
- CODEMAP update

Explicitly out of scope:
- surname resolver
- PESEL source discovery
- PESEL ingestion
- SourceRecord implementation
- EvidenceItem
- Claims
- ConfidenceAssessment
- Citation
- Polona
- historical research
- Redis/BullMQ unless TASK-001 proves they are strictly required
- Stripe
- premium reports
- SEO
- Family/Person genealogy

The task must include:
- goal
- acceptance criteria
- in scope
- out of scope
- referenced decisions/docs
- likely code areas
- constraints
- exact verification commands
- definition of done
</file_requirements>

<quality_bar>
Before finishing:

1. Inspect the complete diff.
2. Confirm `docs/canonical/` is unchanged.
3. Confirm no application code, package manifests, migrations, or dependencies were created.
4. Confirm each kind of project truth has one owner.
5. Confirm `CLAUDE.md` imports `@AGENTS.md` rather than duplicating it.
6. Confirm rights are not coupled to epistemic confidence.
7. Confirm `DistributionSnapshot` remains surname-scoped.
8. Confirm only TASK-001 was created in detail.
9. Run `git diff --check` if Git is available.
</quality_bar>

<final_response>
Return only:

1. Files created/changed
2. Decisions formalised
3. Conflicts found
4. Unresolved blockers
5. TASK-001 summary
6. Confirmation that no application code was created
7. Confirmation that `docs/canonical/` remained unchanged

Then STOP.

Do not begin TASK-001.
</final_response>
