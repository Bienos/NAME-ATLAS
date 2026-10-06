# 2026-10-06 — the baby-names page in the header, and its paid figures at 8,99 zł (TASK-143, D-045)

Requested by the owner after the page and Google sign-in worked in production: "działa ale to powinno byc dostepne tez z gornego panelu jakos i potem cala lista dostepna za 8.99 PLN".

## Changed

- **D-045** (`docs/DECISIONS_NEEDED.md`): the page is in the header, and the paid view D-044 §2 describes costs 8,99 zł instead of 5,99 zł. D-044 carries a pointer to it. "Cała lista" is read as that paid view; whether it means a browsable list of all names is left under "Not decided".
- **The header** (`apps/web/src/lib/site-nav.tsx`, `messages.ts`): "Imiona dla dziecka" / "Baby names" between the offer and the trees, to `/pl/imiona-dla-dziecka` or `/en/baby-names`, drawn only when `BABY_NAMES_ENABLED` is `1` and accounts are on, for every visitor. `NavPlace` gains `babyNames`; the page passes it as `current`.
- **`apps/web/src/app/globals.css`:** link labels do not wrap; from 761 to 1199 px the places fold into the menu, as on phones.
- **The price:** 8,99 zł in the locked card (`baby-names-text.ts`), in comments (`baby-names-page.tsx`, `purchases.ts`) and in `PRODUCT.md` §6, ADR-0037 §2.1, ADR-0032, ADR-0042 and ADR-0043's pointers.
- **Tests:** new `baby-names-nav.test.ts` (flag off, accounts off, both on in each language and in the menu, `aria-current`); one case in `baby-names-page.test.ts` (the page marks its own link); the locked-card test reads 8,99 zł.
- **Records:** `tasks/143-baby-names-header-link-and-price.md`, `docs/CODEMAP.md`, `STATUS.md`. `STATUS.md`'s production lines also now say what the owner and this session did on 2026-10-06 (accounts on, the data loaded on the VM, the page live), which they had not been updated for.
- Left as they were, as records of what was decided or built before D-045: D-044's text, `tasks/141-baby-names-page.md`, and the earlier `docs/progress/` files.

## Observed in production before this change (2026-10-06, by this session)

- Register VM `given-name-births`, run 37477431187 on `main` @ `d0ac2fb`, success, 14:15–14:21 UTC: 52 lists, 35,598 counts and 35,598 ranks, 1,904 trends, all `given_name_birth_trend@2`, every gate passed.
- At 14:26 UTC, signed out: `/pl/imiona-dla-dziecka` and `/en/baby-names` `200`, `noindex, nofollow`, no figure; `/pl/konto` `307` to `/pl/konto/zaloguj`; `/api/account/google` redirected to Google's sign-in with no `redirect_uri_mismatch`.
- The first Google sign-in failed on a password mismatch between `ACCOUNTS_DATABASE_URL` and the VM (PgBouncer's log: "password authentication failed"). After the owner set a new `VM_DB_APP_PASSWORD`, the `accounts` step (run 37481100760, success) set the role's password and reloaded PgBouncer; the owner updated Vercel, redeployed and wrote "działa".

## Verification (local, on this change's tree)

```
pnpm format:check   All matched files use Prettier code style!   (the first run flagged site-nav.tsx; fixed with prettier --write, then passed)
pnpm check:ids      check-unique-ids: every task, ADR, migration and decision number is used once
pnpm typecheck      every package "Done", no error
pnpm lint           exit 0
pnpm test           every suite passed; apps/web 93 files, 976 tests; packages/accounts 6 files, 50 tests
```

In Chromium (build 1194 under `/opt/pw-browsers`, driven by Playwright 1.56.1) against `next dev --webpack` with `BABY_NAMES_ENABLED=1`, `FAMILY_TREE_ENABLED=1` and accounts' variables set to stand-in values: `/`, `/pl/oferta`, `/pl/imiona-dla-dziecka` and `/en/baby-names` at 390, 780, 1099, 1199, 1200, 1280 and 1440 px, 28 combinations. In each: no horizontal overflow, the inline places shown from 1200 px and the menu below, and no inline label on more than one line (checked per label with `Range.getClientRects`). Seven places in each header.

## Not verified

- `pnpm build`, `pnpm test:integration`, `pnpm test:golden` and the Playwright suite: not run here; CI runs them.
- A surname page's header, which has the compact search beside the places. Not measured: it needs the database. The places fold into the menu below 1200 px there too.
- The link on a deployed page. A static page draws the header at build time, so it appears with the first deployment made after this merge; staging and production were not checked.
- Signed-in figures on the production data: not read by this session.
- A physical phone or tablet.
