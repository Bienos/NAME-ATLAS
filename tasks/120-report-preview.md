# TASK-120 — The report preview: a stored internal test report as a dusk dossier

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-report-preview.md`); dark everywhere, and production does not set the flag.
- **Number:** 120. `main` holds TASK-119 (#143); the open pull requests (#137, #138, #141, Vercel Speed Insights) take no number on 2026-10-05.
- **Requested by:** the project owner, 2026-10-05: "build next step premium report", after TASK-119 merged. They chose the flag alone over the flag plus an admin allowlist, a new report design over the surname page's chapters, and the dusk dossier over a light paper document (§6).
- **Milestone:** M5, second step (`PLAN.md` M5: "delivery preview").
- **Decision:** no new ADR. The dossier keeps ADR-0021's dusk direction, its tokens and its three faces; the owner's three answers are §6.
- **Model guidance:** implementation session.

## 1. Goal

Let the owner read a stored report (TASK-119) as a reader would see it, so M5's viability decision is made "on a real artifact rather than a mockup" (`PLAN.md`). The page shows one frozen version, never a live read, and is dark unless a flag is on.

## 2. Facts (2026-10-05)

1. TASK-119 stores immutable report versions:
   - `rendered_payload` holds the PAID response, coverage, DiscoveryIndex and eligibility.
   - Nine sections hold the claims behind each; SOURCES holds the citation ids, in order.
   - No route reads them yet.
2. The couple report (TASK-100) is the repo's pattern for a dark page: a flag that is exactly `1`, otherwise a 404, `noindex`, `private, no-store` from the middleware, and linked from nowhere.
3. VM steps grant the web role SELECT on every table in `public` after they migrate, so once 0037 is applied the web role can read the report tables.
4. ADR-0021: the dusk direction is the look of every page, with Fraunces for display, Instrument Sans for the interface and IBM Plex Mono for data.

## 3. In scope

- **`readReportVersion(db, id)`** and **`isReportVersionId(id)`** in `packages/truth/src/report.ts`. Read-only: one version, its sections in order, the claims behind each, and its payload unparsed. Null for an id that is not a UUID or not stored.
- **`apps/web/src/lib/report-config.ts`.** `REPORT_PREVIEW_ENABLED` must be exactly `1`. The paths are `/pl/raport/{id}` and `/en/report/{id}`. The middleware sends `private, no-store` on both, on or off.
- **The pages.** `apps/web/src/app/pl/raport/[id]/page.tsx` and `apps/web/src/app/en/report/[id]/page.tsx`, both through `report-page.tsx`. Each answers 404 when the flag is off, when the id is not a UUID (before any database read), when the version is not stored, or when its payload is not a report's. Both are `noindex`.
- **`apps/web/src/lib/report-view.tsx`**, the dusk dossier:
  - **`toReportPreview`.** Validates the frozen response with the contract. A response frozen under an earlier contract shows no figures and says so.
  - **Cover.** Eyebrow "Raport · wersja N · date", the surname in Fraunces with an amber rule, an "internal test, not for sale" stamp, the eligibility verdict in words with its reasons, and the freeze date.
  - **Contents.** Nine numbered entries, each with its count of claims ("no source" for the three sourceless ones, a count of sources for SOURCES).
  - **Nine numbered chapters.** Each has its facts as tables, or the state that says why there are none, and a folded list of its claim ids and their roles.
    - Origin: root, language, gloss, type and work, with the assessment.
    - Distribution: people per list and date, 1 in X and rank, and the five regions with most people.
    - Change: the first and last count and the change.
    - Archives: the Polona search figures and the caveat that they are word matches, not records.
    - Historical forms, places and migration: "not searched yet".
    - Sources: a numbered bibliography that the facts' footnote markers link to.
    - What we don't know: every coverage dimension that is not STRONG, and why the report is not offered.
  - **Copy.** Polish and English throughout. Every figure is a field of the validated response; no code is shown raw.
- **Styles** in `globals.css`, on dusk tokens only. Every column of the report tables reads from the left; they scroll sideways on a phone rather than the page.

## 4. Out of scope

- An admin allowlist or session check (the owner chose the flag alone); a link to the preview from any page.
- A PDF, a download, delivery by email, a paid entitlement, checkout.
- A map or chart; the surname page's chapter components.
- Building a report from the page: building stays `pnpm report:build`.
- Setting the flag on staging or production.

## 5. Acceptance criteria

- AC-1: with the flag unset or not exactly `1`, both pages answer 404. With it on, an address that is not a UUID answers 404 without a database read, and an unknown version 404. Both are `noindex` and `private, no-store`.
- AC-2: a stored version opens on its cover and a contents list of the nine chapters, numbered, with what each holds.
- AC-3: the frozen facts render with footnote markers that link to their entries in the bibliography.
- AC-4: a chapter with nothing to show says why; no missing value reads as zero.
- AC-5: a response frozen under an earlier contract shows no figures and says so.
- AC-6: against `next start` and a seeded database, a version built with `pnpm report:build` renders in both languages with no horizontal scroll at 1440 and 390 px.

## 6. Decisions of the owner (2026-10-05)

- **U-1. Decided: the flag alone.** Offered the flag alone, or the flag plus a signed-in account on an allowlist, the owner chose the flag alone.
- **U-2. Decided: a new report design.** Offered the surname page's own chapters, or a purpose-designed report layout, the owner chose the new design.
- **U-3. Decided: the dusk dossier.** Offered the site's dusk theme in a document layout, or a light paper document with an ADR amendment, the owner chose the dusk dossier.

## 7. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `db:migrate`, `db:generate-types` (no diff), `test:integration`, `test:golden`, `build`, `e2e:seed`, `test:e2e`; then `pnpm report:build` on the seeded database, `next start` with the flag, the addresses fetched, and the page captured at 1440 and 390 px.
