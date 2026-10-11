# 2026-10-11 — The comparison links to the couple pages (TASK-180)

**Changed.** The owner asked to put the couple features on `/pl/porownaj`; they chose both couple pages, each shown only while it is on.

- `apps/web/src/lib/compare-figures.tsx`: `CouplesCard` and `CoupleLinks`. A card "Dla par" / "For couples" with a block per couple page that is on: "Wasze nazwiska razem" (`/pl/para`, opened on the two compared slugs when both resolved, else its picker) and "Imiona pary" (`/pl/imiona-pary`). Nothing when neither is on.
- `compare-text.ts`: the card's words in Polish and English. No verdict, score or percentage.
- `compare-view.tsx`: `ComparisonView` and `ComparePicker` take `couples` (default: none); the couple page's own picker shows no card.
- `compare-page.tsx`: `coupleLinks()` reads `COUPLE_REPORT_ENABLED`, and `COUPLE_NAMES_ENABLED` with accounts on. `apps/web/src/app/pl/porownaj/page.tsx` and `en/compare/page.tsx` pass it.
- `apps/web/src/design-system/compare.css`: the card's layout, two columns from 900 px when both blocks show.
- Tests: `compare-view.test.ts`, six new cases.

**Verified** (this session).

- `pnpm typecheck`: no errors. `pnpm lint`: exit 0. `pnpm format:check`: all files formatted.
- `pnpm --filter web test`: 117 files, 1383 tests passed (before the final type fix in the test file); `compare-view.test.ts` after it: 19 passed.
- `pnpm check:ids`: every number used once. `pnpm build`: exit 0, on the final code.

**Not verified.** The card in a browser. Production shows no change: neither `COUPLE_REPORT_ENABLED` nor `COUPLE_NAMES_ENABLED` is set, so the card stays hidden until the owner sets one. The couple first names page also needs `OPENAI_API_KEY` and the VM's `given-names` step (its INSERT grant) before its reading works.
