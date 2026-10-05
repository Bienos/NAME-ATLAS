# 2026-10-05 — The report preview (TASK-120, M5's delivery preview)

M5's second step (`tasks/120-report-preview.md`). The owner asked to "build next step premium report" after TASK-119 merged. They chose the flag alone, a new report design, and the dusk dossier (§6). Built on `main` @ `cbc3e2d`. Nothing is deployed, and no flag is set anywhere.

## What changed

- **`packages/truth/src/report.ts`:**
  - `readReportVersion(db, id)` reads one stored version: id, number, schema, eligibility state, `generated_at` as UTC ISO, the payload unparsed, and its sections in order with the claims behind each. It is read-only.
  - `isReportVersionId(id)` checks the id is a lower-case UUID.

  Both are exported from `@name-atlas/truth`.
- **`apps/web/src/lib/report-config.ts`** (new): `REPORT_PREVIEW_ENABLED` must be exactly `1`; `REPORT_PATHS`, `isReportPath`, `reportPath`, and `REPORT_CACHE_CONTROL` (`private, no-store`). **`apps/web/src/middleware.ts`** sends that header on every preview address.
- **`apps/web/src/lib/report-page.tsx`** (new) and the two routes **`app/pl/raport/[id]/page.tsx`** and **`app/en/report/[id]/page.tsx`**. They answer 404 when the flag is off, when the id is not a UUID (checked before any database read), when no version is stored, or when the payload is not a report's. Both are `noindex`.
- **`apps/web/src/lib/report-view.tsx`** (new):
  - `toReportPreview` validates the frozen response with `surnameResultResponseSchema`. A response frozen under an earlier contract becomes null and shows no figures.
  - `ReportDossier` and `ReportPage` render, in Polish and English, the cover, contents, nine numbered chapters, the bibliography (footnotes `[n]` → `#zrodlo-n`; a dataset's locator shown as "zasób N" / "resource N"), and "Czego nie wiemy" / "What we don't know". Each chapter has a folded list of its claims and their roles.
- **`apps/web/src/app/globals.css`:** the dossier's styles, on dusk tokens and the three faces. Report tables read from the left and scroll sideways on a phone. Chapters use the site's own section rule.
- **Tests:**
  - `apps/web/src/lib/report-config.test.ts` (3), `report-routes.test.ts` (3) and `report-view.test.ts` (7).
  - `tests/integration/src/coverage-assessment.test.ts`: one test reading a built version back.
- `tasks/120-report-preview.md`, `STATUS.md`, `PLAN.md` (the M5 row), `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

Local CI run in progress; results follow in the next commit.

**The page against `next start`**, on the seeded end-to-end database:
- `pnpm report:build -- --surname NOWAK` stored version 1 (`01a10bcb-…`): INSUFFICIENT_MEANINGFUL_CONTENT, reasons NO_PREMIUM_INVENTORY and COVERAGE_BELOW_STANDARD.
- With `REPORT_PREVIEW_ENABLED=1`, `curl` returned:

  | Address | Status |
  |---|---|
  | `/pl/raport/{that id}`, `/en/report/{that id}` | 200 |
  | `/pl/raport/nowak` | 404 |
  | `/pl/raport/01920000-0000-7000-8000-000000000001` | 404 |

  Each was sent with `cache-control: private, no-store`.
- Playwright screenshots at 1440 × 900 (Polish) and 390 × 844 (English) showed no horizontal overflow. The first capture showed:
  - header cells left-aligned over right-aligned figures (the site's table rule for columns 2 and 3);
  - double rules between chapters;
  - the two PESEL sources reading the same;
  - over-large subheads.

  All four were fixed, rebuilt and captured again.

## Not verified

- The preview on staging or production: no flag is set there, migration 0037 is not applied, and no report has been built there.
- Screen-reader reading of the dossier, and its print layout.
