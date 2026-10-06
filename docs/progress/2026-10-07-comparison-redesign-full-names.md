# 2026-10-07 — The comparison, redesigned, and the 15,99 zł full-name comparison (TASK-155, D-049)

Requested by the project owner in a Claude Code session on 2026-10-06: "redesign me the whole porównanie nazwisk a za 15.99 PLN możesz porównać imię i nazwisko i innym też". D-049 records this session's reading: the surname comparison stays free and is redesigned; comparing first names and surnames of two to four people is a 15,99 zł product (`fullnames`), held also by every tier from 28,99 zł up.

## What changed

- **The free comparison** (`compare-view.tsx`, new `compare-figures.tsx`, `compare-text.ts`, `design-system/compare.css`, loaded after `brand-system.css`, every rule scoped to `main.cmp.atlas-v1`: the pages opt into Brand System v1 one by one, as TASK-151's baby-names page does, since the global migration TASK-149 is reverted): the two surnames as plates with the "a / vs" mark as the page's `h1`; the disclaimer before any figure; numbered chapters; a comparable count as bars on one shared scale (the figure written out, the bar `aria-hidden`); rarity as two "1 na X" figures and the verdict; maps on one scale (`DistributionMaps`, now any number of sides; map titles are `h3`); the surname pages, a second comparison (its own field ids) and, while it exists, the full-name card. The picker: two fields with the mark between, three example pairs, what is compared, the full-name card. The maps take the brand's density scale and links Atlas Blue inside the scope. The couple picker keeps its words and gets none of the extras. Same pairwise gates (`comparePopulation`, `compareRarity`, `compareDistribution`, `rarerOf`); the old desktop grid rules for `#today-count` and `#rarity` in `globals.css` were removed.
- **N-way gates** (`compare.ts`): `gateMany`, `comparePopulationMany`, `compareRarityMany`, `compareDistributionMany` (an unresolved person is `null`), `rarestOf`. A person without a figure is `null`, never 0, and does not stop the others; two people reduce to the pair's rule.
- **The full-name comparison** (`full-name-compare-config.ts`, `-request.ts`, `-text.ts`, `-page.tsx`; routes `app/pl/porownaj/imie-i-nazwisko/`, `app/en/compare/full-name/`): flag `FULL_NAME_COMPARE_ENABLED` exactly `1` and accounts on, else 404; `noindex`; `private, no-store` from `middleware.ts`; already under `robots.txt`'s comparison disallows; both bare paths are sign-in return addresses (`account-paths.ts`). Query `f1..f4`, `s1..s4`. With the product: per person the register count and rank per list, births in the latest year, meaning (claims, PAID surface), the surname's result (`loadSide`); people are read one at a time. The origin words are `report-view.tsx`'s `ORIGINS`.
- **The product**: `fullnames` in `PurchaseTier`, `CheckoutTier`, `CHECKOUT_TIERS` (1599 grosze, "Porównanie imion i nazwisk" / "Full-name comparison"); `FULL_NAME_COMPARE_TIERS`; migration `0046_purchases_fullnames_tier` (CHECK only; down refuses while a `fullnames` purchase is stored).
- **Records**: `tasks/155-comparison-redesign-and-full-names.md` (numbered 151, 153 and 154, with D-048 and migration 0045, on its branch; renumbered as #182–#184 and #186 merged and #187 opened with those numbers), D-049 in `docs/DECISIONS_NEEDED.md`, a note in ADR-0037 §2.1, `docs/CODEMAP.md`, `STATUS.md`.

## Verification (run in this session, after rebasing onto `main` @ `2fd44be`)

| Command | Result |
|---|---|
| `pnpm format:check` | All matched files use Prettier code style |
| `pnpm check:ids` | every task, ADR, migration and decision number is used once |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | no problems |
| `pnpm test` | all packages pass; `apps/web` 1133 tests |
| `pnpm test:integration` | 49 files, 543 tests passed (Testcontainers Postgres) |
| `vitest run` accounts, family, extensions, canonical-key-v2 (verbose, before the rebase) | 74 passed, including "0046 allows the fullnames tier…" and "answers by tier: the full-name comparison…" |
| `pnpm --filter web build` | Compiled successfully; routes `/pl/porownaj/imie-i-nazwisko` and `/en/compare/full-name` listed; the two warnings (middleware naming, `metadataBase`) are not this change's |

Visual check: the free result, the picker, the full-name result (three people) and the locked state, rendered from the test fixtures with `globals.css`, `brand-system.css` and `compare.css` on `body.dusk` into static HTML and opened in Chromium at 1280 and 390 px: no horizontal overflow; the plates stack with the mark on the seam on a phone.

## Not verified

- No page was rendered against a database with real surnames or first names; `golden` and `e2e` suites were not run.
- Migration 0046 is not on the VM, staging or production. `FULL_NAME_COMPARE_ENABLED=1` was set on Vercel production on 2026-10-07 at the owner's request ("go live", then "merge it and go live"), before the merge; what the deployment serves is checked on the merged pull request. Production has `CHECKOUT_ENABLED=1` but no `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET`, so checkout is off and nothing can be bought; 0046 must be on the VM before checkout's keys are set, or a `fullnames` purchase would be refused by the old check.
- The product is test-mode checkout only and is not on the offer page.
