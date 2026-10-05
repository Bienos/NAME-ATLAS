# TASK-119 — The frozen surname report: immutable versions, internal test only

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-frozen-report.md`); migration 0037 is not applied on the VM, and no report is built on production.
- **Number:** 119, migration 0037. Drafted as 118; #142 (the one-page PDF) took 118 on `main` while this was being built, so this is 119. `main` holds migration 0036, and the open pull requests (#137, #138, #140, #141, Vercel Speed Insights) take no task or migration number on 2026-10-05.
- **Requested by:** the project owner, 2026-10-05: "build next step premium report", after TASK-117 (#139) merged. They chose "frozen report only" over a preview page or an unstored one, and "any surname, internal" over eligible surnames only (§6).
- **Milestone:** M5, first step (`PLAN.md` M5; `docs/canonical/23` §22 "Report", RPT-001).
- **Decision:** no new ADR. The tables follow `docs/canonical/11` §26; the owner's two answers are §6.
- **Model guidance:** implementation session.

## 1. Goal

A report a reader could one day buy has to be a real, fixed artifact before anything is sold (`PLAN.md` M5: "premium viability decision on a real artifact rather than a mockup"). This task stores one: for any resolved surname, an operator's command freezes what the PAID surface says about it, split into the canonical sections, each linked to the claims behind it. Every rebuild is a new version, and no version can change.

Nothing is offered, shown or sold. The only entitlement is an internal test.

## 2. Facts (from `docs/canonical/11` §26, `docs/canonical/23` §22, TASK-116, TASK-117; 2026-10-05)

1. `docs/canonical/11` §26 defines four objects:
   - `Report`: surname, type, owner, status DRAFT, READY, SUPERSEDED or WITHDRAWN.
   - `ReportVersion`: immutable and numbered, with `report_schema_version`, a `rendered_payload` snapshot and the coverage and DiscoveryIndex it was built on.
   - `ReportSection`: types ORIGIN, DISTRIBUTION, VARIANTS, PLACES, TIMELINE, MIGRATION, ARCHIVES, SOURCES and LIMITATIONS.
   - `ReportClaimReference`: claim, section and role (HERO, SUPPORT, FOOTNOTE or LIMITATION), "the critical link ensuring a report can always identify which Claims support each section".
2. `docs/canonical/23` §22: "Build report with an **internal test entitlement** before Stripe … Report consumes approved Claim bundle, not source calls. ReportVersion immutable."
3. Under `eligibility@0` (TASK-117) no surname is eligible today.
4. Claims are superseded, never deleted. No code deletes from `claims`.
5. The resolver opens its own read-only transaction (`resolveSurname`). Kysely cannot nest transactions, so the query service cannot run inside the transaction that writes.

## 3. In scope

- **Migration 0037**, four tables in `public`:
  - `reports`: one per surname, type and entitlement. The type is `NAME_ATLAS`, and a check allows only the entitlement `INTERNAL_TEST`.
  - `report_versions`: `version_number` from 1, unique per report, plus the versions of the report schema, coverage, DiscoveryIndex and eligibility policy, the frozen eligibility state, and `rendered_payload`.
  - `report_sections`: the nine section types, each once per version, in order.
  - `report_claim_references`: each claim once per section, in a role.

  A trigger refuses every UPDATE and DELETE of versions, sections and references. Every reference is ON DELETE RESTRICT. Down refuses while a report is stored.
- **`buildReport(db, surname)`** in `packages/truth/src/report.ts`:
  - **Bracketed reads.** It reads the surname's active claims; then the validated PAID response, its DiscoveryIndex with coverage, and its premium eligibility; then, in the transaction that writes, the active claims again. If they differ it returns CLAIMS_CHANGED and writes nothing.
  - **The frozen version** (`report@0`) holds the response, coverage, index and eligibility as `rendered_payload`.
  - **Sections** come from `reportSectionsOf`, a pure function:
    - ORIGIN (meaning), DISTRIBUTION (population, rarity and rank, distribution), TIMELINE (change) and ARCHIVES (Polona) name the response fields they present and each field's state. They carry a summary of the confidences shown.
    - VARIANTS, PLACES and MIGRATION carry their coverage dimension's availability: NOT_RETRIEVED, `NO_SOURCE_YET`.
    - SOURCES lists every distinct citation id in the response.
    - LIMITATIONS lists every coverage dimension that is not STRONG, every DiscoveryIndex category with no eligible item, and the eligibility state with its reasons.
  - **Claim roles.** Each active claim of the surname is referenced by the section that presents it: HERO for the meaning, the population, the change and the archive search; SUPPORT for rank, rarity and distribution. A claim whose field the PAID surface does not show is referenced as LIMITATION. NOTABLE_BEARERS has no section type in §26.3; the bearers stay in the frozen response.
- **`pnpm report:build -- --surname NAME`**: builds the next version and prints what it froze. It writes, so it needs a role that may insert, not the read-only web role.

## 4. Out of scope

- Any page, preview, PDF, download or delivery (`docs/canonical/20`), and any route that reads a report.
- A paid entitlement, an owner, an offer, a price, checkout (M6).
- Generated prose. Each section's title is a message key; its body points into the frozen response.
- New section types (famous bearers, localities), report statuses beyond READY, and withdrawing a report.
- Applying 0037 on the VM, and building a report on production.

## 5. Acceptance criteria

- AC-1: `buildReport` stores a version with all nine sections, in order, for any resolved surname, eligible or not, and its frozen eligibility.
- AC-2: each section references the claims behind it, in their role; the stored references equal the built ones.
- AC-3: a rebuild is version 2 and leaves version 1 byte for byte. The database refuses to update or delete a version, a section or a reference, and refuses an entitlement other than INTERNAL_TEST.
- AC-4: a claim the PAID surface cannot show is referenced as LIMITATION.
- AC-5: a surname with nothing deeper says what is missing, never zero; an input that does not resolve writes nothing.

## 6. Decisions of the owner (2026-10-05)

- **U-1. Decided: frozen report only.** Offered stored, immutable versions with no page; the same plus a dark preview page; or a preview page assembled on the fly with no storage, the owner chose stored versions with no page.
- **U-2. Decided: any surname, internal.** Offered any resolved surname under an internal test entitlement, with its eligibility frozen in, or only ELIGIBLE surnames (none today), the owner chose any surname.

## 7. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `db:migrate`, `db:generate-types` (no diff), `test:integration`, `test:golden`, `build`, `e2e:seed`, `test:e2e`; then `pnpm report:build` on a migrated database.
