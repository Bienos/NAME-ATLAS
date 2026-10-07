# 2026-10-07 — "|" instead of "—" in the search head (ADR-0048)

Branch `claude/bold-meitner-a6cw8f`, on `origin/main` at `adef136`. Requested by the owner: "in all seo stuff can you reaplce long dash with |". No task file; the decision is ADR-0048, which supersedes the separator in `docs/canonical/21` §66. ADR-0048 is free on `main`; open pull requests #181 and #190 hold no ADR number.

## Changed

- `apps/web/src/lib/surname-seo.ts`: the surname title is `Nazwisko {X} | {topic} | Name Atlas` (was `… — {topic} | …`).
- `apps/web/src/lib/site-metadata.ts`: the landing title, description and preview-image alt, in both languages.
- The ` — Name Atlas` title suffix becomes ` | Name Atlas` in `account-page.tsx`, `blog-page.tsx` (index and post), `contact-page.tsx`, `couple-names-page.tsx`, `how-page.tsx`, `legal-page.tsx`, `offer-page.tsx`, `tree-landing.tsx`, `tree-page.tsx`.
- Tests: `surname-seo.test.ts` (4 expectations) and `tree-page.test.ts` (5 expectations) now expect "|".
- `docs/adr/0048-title-separator-pipe.md`, `STATUS.md` (the "Last rewritten" line).

Not changed: page headings, the share sheet title, the PDF title, the Stripe product name, the admin app, and the " · " titles of the baby-names and full-name comparison pages (ADR-0048 §2–3).

## Verified

Each command was run from the repository root unless stated:

- `pnpm test` in `apps/web`: 1195 tests passed (1195).
- `pnpm typecheck` in `apps/web`: exit 0.
- `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: exit 0 each; `check:ids` printed "every task, ADR, migration and decision number is used once".

## Carried onto `main`

Cherry-picked onto `origin/main` at `7a34554` (#215) by a later session, with the same commands re-run on that tree: `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test` (web 1354) and `build`, exit 0 each. The preview image's alt text on `main` had meanwhile been rewritten without a dash, and that text was kept. `checkout-routes.ts` (the Stripe product name) and `share-pdf.ts` (the PDF title) still use "—", as §2–3 of the ADR intend.

## Not verified

- The rendered `<title>` on staging or production: not deployed from this session.
- How search engines show the new titles: not observable from this session.
