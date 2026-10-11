# TASK-180 — The comparison links to the couple pages

- **Status:** IMPLEMENTED 2026-10-11 (`docs/progress/2026-10-11-compare-couples-card.md`).
- **Requested by:** the project owner, 2026-10-11: "upload couple matching to porownaj compare section". Asked which feature and how, they chose both couple pages, each shown only while it is on.
- **Decision:** none new. ADR-0035 (the couple surnames page), ADR-0047 (the couple first names page), D-049 (the comparison's full-name card, the pattern followed).
- **Numbers:** TASK 180. 179 was the last on `main` (`870dc80`); no pull request was open.
- **Model guidance:** implementation session.

## 1. Goal

A reader on `/pl/porownaj` or `/en/compare` finds the couple pages from there, and never a link to a page that answers 404.

## 2. Facts (`main` @ `870dc80`)

1. `/pl/para` (`COUPLE_REPORT_ENABLED`) and `/pl/imiona-pary` (`COUPLE_NAMES_ENABLED` with accounts) answer 404 until their flag is on; neither flag is set in production.
2. The comparison already shows the full-name card only while that page exists (`fullNamesHref`, D-049).

## 3. In scope

- A card "Dla par" / "For couples" on the comparison's result and on its picker, with a block per couple page that is on: the couple surnames page (on a result, opened on the two compared slugs) and the couple first names page.
- `coupleLinks()` in `compare-page.tsx`, read by both language routes.

## 4. Out of scope

- Switching either page on, any Vercel variable, any change to the couple pages themselves, any price.
- The couple page's own picker (it reuses `ComparePicker` with its own words) shows no card.

## 5. Acceptance criteria

1. With both flags off, no card and no link to either page.
2. Each block appears only while its page is on; the first-names block also needs accounts.
3. On a result with both sides resolved, the couple surnames link carries both slugs; otherwise it opens that page's picker.
4. The card states no verdict, score or percentage about a couple (ADR-0035 §2.3, ADR-0047).

## 6. Verification

```
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web test
pnpm build
```
