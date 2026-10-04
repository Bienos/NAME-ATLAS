# 2026-10-04 — TASK-100: the couple report, two surnames' facts side by side, dark

**Task:** `tasks/100-couple-report.md`. **Decision:** ADR-0035 (proposed, merged with TASK-100's specification in #104). Built on `main` @ `8ed3533`.

## What changed

- `apps/web/src/lib/couple-config.ts` (new): `COUPLE_REPORT_ENV`, `coupleReportEnabled(env)` (true only for exactly `1`), the two paths, `COUPLE_CACHE_CONTROL` (`private, no-store`) and `isCouplePath`.
- `apps/web/src/lib/couple.ts` (new, pure): `coupleNames` (A, B, each one's `other_form`, A-B, B-A, then the joined orders with each part in its other form where it has one; each name once, letter case aside; at most 8), `partOf`, and `nameRow`, which reads one validated result as `LISTED` (each list's count and date, never summed), `NOT_LISTED` (unresolved, or resolved with `NO_APPLICABLE_EVIDENCE`; never a zero) or `NO_FIGURE` (failed lookup, blocked, not derived, ambiguous).
- `apps/web/src/lib/couple-page.tsx` (new): `loadCouple` loads the two sides with the comparison's `loadSide`, then looks each other name up once through `querySurnameResult`, validated by the contract; A and B reuse their own results. `COUPLE_METADATA` is `noindex, nofollow`.
- `apps/web/src/lib/couple-view.tsx` (new): `CoupleView` renders the title "Wasze nazwiska razem" / "Your names together" with both surnames, then the six parts in ADR-0035 §2.2's order: the names table; each surname's map; count and change; meaning; famous bearers and localities, each side the surname page's own chapter; then links to each surname's page and to the free comparison. `CouplePicker` is `ComparePicker` with the couple's address and words. `couplePath` builds the address.
- `apps/web/src/app/pl/para/page.tsx`, `apps/web/src/app/en/couple/page.tsx` (new): dynamic; `notFound()` unless the flag is on; typed surnames redirect to the couple's address through `comparisonRequest`.
- `result-view.tsx`: exports `Population`, `Distribution`, `Change`, `Meaning`, `Bearers`, `Localities`, each with an optional `anchor` (so two sides do not share an id). The surname page passes none and is unchanged.
- `compare-request.ts`: `comparisonRequest` takes an optional address builder (default `comparisonPath`). `compare-view.tsx`: `ComparePicker` takes optional `copy` (address and words). `compare-page.tsx`: `loadSide` exported. The comparison's own behaviour is unchanged.
- `middleware.ts`: `cache-control: private, no-store` on `/pl/para` and `/en/couple`.
- `messages.ts`: the `couple*` messages, Polish and English. `globals.css`: the two-column sides.
- Tests (new): `couple-config.test.ts`, `couple.test.ts`, `couple-view.test.ts`, `couple-routes.test.ts`, with fixtures in `couple-fixture.ts`, each parsed by the contract.
- `docs/CODEMAP.md`, `STATUS.md`, the task's status line.

No new dependency, no migration, no contract change. Nothing links to the pages and no sitemap lists them. Production does not set `COUPLE_REPORT_ENABLED`, so nothing there changes.

## Verification

Run on 2026-10-04 in this container, after the last edit:

- `pnpm lint` — exit 0.
- `pnpm typecheck` — exit 0.
- `pnpm test` — exit 0; every package passes; the web suite 76 files, 816 tests.
- `pnpm check:ids` — "every task, ADR, migration and decision number is used once", exit 0.
- `prettier --check` on the changed files — clean.
- `next build --webpack` in `apps/web` — exit 0; `/pl/para` and `/en/couple` listed as dynamic.
- `next start` with `COUPLE_REPORT_ENABLED=1`, no database: `/pl/para` and `/en/couple` 200 (the picker) with `cache-control: private, no-store` and `<meta name="robots" content="noindex, nofollow"/>`; `/pl/para?qa=Nowak&qb=Kowalski` 307 to `/pl/para?a=nowak&b=kowalski`; `/pl/porownaj` keeps Next's own header.
- `next start` with the variable unset: `/pl/para`, `/en/couple` and `/pl/para?a=nowak&b=kowalski` 404.

GitHub Actions does not start jobs on this account at present (every run fails in about 2 s with no runner), so there is no CI result; the above is local only.

## Not verified

- The report rendered against a database with real surnames: no database was loaded in this container. The six parts were checked in rendered markup over contract-valid synthetic results only, and the joined-name lookups (`querySurnameResult` on, e.g., `KOWALSKI-NOWAK`) were not run against the register.
- A browser view of the two-column layout at phone width.
- Production: the flag is unset there.
