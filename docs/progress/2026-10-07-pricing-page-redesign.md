# 2026-10-07 — TASK-167: the offer page redesigned, with test-mode purchases for testers

## What changed

- `apps/web/src/lib/offer-text.ts`: the free plan as it is now (accounts and the 5-person tree are live; the latest year's top 10 baby names), the two one-off products (`products`: 8,99 zł D-045, 15,99 zł D-049), each pack from 28,99 zł listing the tree unlock, both products (D-044 §4, D-049 §3) and "Co mówią Wasze imiona razem" as coming (D-050 §3), and the words for the hero facts, the free window, the test purchase, the table, "how paying will work" and three questions. The waiting list also takes the two products. `tiers` keeps its five entries, so the landing's offer strip is unchanged but for the lede.
- `apps/web/src/lib/offer-page.tsx`: the page as the mockup (https://claude.ai/artifact/LfJ7prnaaYzQVELeuK2QPx): hero, free band, "Pojedyncze raporty", "Pakiety z większym drzewem", the 800 zł research with its enquiry, "Co jest w czym" (cells from `BABY_NAMES_FULL_TIERS`, `FULL_NAME_COMPARE_TIERS`, `TREE_UNLOCK_TIERS`), "Jak będzie wyglądać płatność", "Pytania". `readOfferReader` reads the session cookie: sign-up or the account on the free band; in the free window (`BABY_NAMES_FREE_UNTIL`, D-051) the baby-names card shows the struck price, 0 zł and the window's true last day in Warsaw ("Ostatni tydzień" only within 7 days of its end, `freeWindowFrom`; D-051 amended, the owner's option B), with a link to the page or to sign-in returning there; a signed-in account on `CHECKOUT_TESTERS` with test-mode checkout on gets a "Kup testowo" form per `CHECKOUT_TIERS` product posting `tier` and `lang` to the unchanged `/api/checkout`. Nobody else gets a form that buys.
- `app/pl/oferta/page.tsx`, `app/en/offer/page.tsx`: `force-dynamic`, rendering `OfferRoute`.
- `app/globals.css`: the redesign's rules, dusk tokens only.
- `offer-page.test.ts`: rewritten for AC-1 to AC-5; the mail, nav, partner and privacy tests kept.
- ADR-0037 §2.1: the full-name comparison's "not yet on the offer page" amended.

The mockup's four questions were not answered; the task takes its stated defaults; the owner's later answers ("B, tak, zostaw") are in `tasks/167-pricing-page-redesign.md`. Numbered 167: `main` took 163, 164 and 166, and open pull requests #196 and #199 both name 165.

## Verification (run in this session)

GitHub Actions starts no job in this repository ("recent account payments have failed or your spending limit needs to be increased"; `verify` failed after 2 s on `a55c14b` and `cd57f68`, as on `main` @ `ecfd4a8`). Every step of `.github/workflows/ci.yml` was therefore run locally, in order, on this branch's tree (`main` @ `ecfd4a8` plus this change), with `DATABASE_URL` a new empty `name_atlas` on the image CI uses, `postgis/postgis:16-3.4`:

| Command | Result |
|---|---|
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0, 6 tests |
| `pnpm test` | exit 0 (`apps/web` 108 files, 1237 tests) |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0, no diff |
| `pnpm test:integration` | exit 0, 50 files, 546 tests |
| `pnpm test:golden` | exit 0, 4 files, 364 tests |
| `pnpm build` | exit 0; `/pl/oferta` and `/en/offer` are dynamic (`ƒ`) |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0, 10 Playwright tests passed |

The built site was served with `next start` and `/pl/oferta` screenshotted in Chromium at 1280 and 390 px wide (signed out, no free window). At 390 px the page first scrolled sideways, to 714 px: the table cells' visually-hidden labels are absolutely positioned and escaped the table's scroll box. `.offer-table-box` now has `position: relative`; after a rebuild, neither width scrolls sideways. `pnpm format:check` and `pnpm lint` were run again after that CSS change: exit 0.

## Not verified

- The page was looked at signed out only; the signed-in, tester and free-window states were checked through the rendered markup in tests.
- No test-mode purchase was made from the page against Stripe; the form posts the same fields as the account page's, which TASK-111 and TASK-154 verified.
- Not deployed. Making the page dynamic means it is no longer served from the static cache; its response time in production was not measured.
