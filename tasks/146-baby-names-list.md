# TASK-146 — The baby-names list: the names of a year, ranked, and its gate

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-list.md`).
- **Requested by:** the project owner, 2026-10-06: the section reachable from the top panel "i potem cala lista dostepna za 8.99 PLN" (TASK-143 built the first half).
- **Decision:** D-047 (new, this task), on D-044, D-045, ADR-0037 §2.1, ADR-0042, ADR-0043, ADR-0023 §2.5. One migration, 0043 (an index, §4); no ADR.
- **Numbers:** TASK 146, D-047, migration 0043. 145 / D-046 / 0042 were the last on `main` (`0596cc6`); no pull request was open.
- **Model guidance:** implementation session.

## 1. Goal

A signed-in reader can browse a year's list of first names given to children: boys or girls, any year 2000–2025, ranked, with the rising/falling filter for the latest year. The top 10 of each sex's latest list is free with an account; the whole list, every year and the filter are the 8,99 zł view. The gate is built and tested; **no payment is** (ADR-0023 §2.5).

## 2. Facts (2026-10-06)

1. A reader could only type one name (TASK-141). Claims `GIVEN_NAME_BIRTH_COUNT`, `_RANK` (competition ranks, ties share one) and `_TREND` exist per name and list (ADR-0043); their keys end with the list id. Only the latest list of a sex has a direction (ADR-0043 §7, `given_name_birth_trend@2`).
2. A rank claim stands only on a complete list (ADR-0043 §3); on TASK-136's excerpt of 2000–2019 no rank claim stands, so a name there has a count and no rank.
3. Without an index on the claim key's type and list parts, the planner reads every ACTIVE claim of every kind to find one list's claims (`EXPLAIN` on a local database: a bitmap scan of `claims_active_claim_key_uq`'s ACTIVE rows with the key as a filter; with the index, an index scan on the type and list). Hence migration 0043.
4. The 8,99 zł product `babynames` exists in test-mode checkout (TASK-144); `BABY_NAMES_FULL_TIERS` (`babynames`, `smaller`, `couple`, `family`) is the entitlement the single-name page already uses.

## 3. In scope

1. **Pages:** `/pl/imiona-dla-dziecka/lista` and `/en/baby-names/list`; addresses in `baby-names-config.ts` (`BABY_NAMES_LIST_PATHS`), covered by `isBabyNamesPath` (middleware `private, no-store`), `safeNext`, the flag and accounts gate (404, empty metadata), `noindex`, no sitemap. Linked from the single-name page and from its locked card's text. Signed out: explanation, source, sign-in back; no figure.
2. **Reader** (`packages/truth/src/given-name-birth-list.ts`): `readBirthListPage` reads one list's active count and rank claims, ordered by the rank claim (ties by name, names with no rank last), paged, with the display form and, on the latest list, the trend direction and a direction filter. One query per page. A flagged form is never listed; rights as the existing readers do.
3. **Gate:** free is the first `BABY_NAMES_LIST_FREE_ROWS` (10) of the sex's latest list; another year, a page beyond them or a filter is the locked card, "8,99 zł · Wkrótce", **and no read of the database**. `hasPurchaseOf(userId, BABY_NAMES_FULL_TIERS)` through the page's existing dependency.
4. **Migration 0043:** `claims_given_name_birth_list_idx`, partial on the birth claims, on the key's type and list parts.
5. Copy in both languages; tests; records (this file, D-047, `docs/CODEMAP.md`, a progress record, `STATUS.md`, ADR-0037 §2.1).

## 4. Out of scope

Real payments, a buy button or checkout link anywhere; the price or `CHECKOUT_TIERS`; TASK-111/114/144 code; production configuration; second names, voivodeships, half-years, comparing names, a letter or free-text filter, a download or CSV, sharing cards; the sitemap or any indexing; a page per name; the register (stock) list of TASK-145 as a browsable list.

## 5. Not decided

The size of the free cut (10 names): `BABY_NAMES_LIST_FREE_ROWS`. See D-047.

## 6. Acceptance criteria

- **AC-1:** flag off or accounts off: both addresses 404 with empty metadata; on: `noindex`, `private, no-store`; no sitemap entry; a sign-in returns to the page.
- **AC-2:** signed out, no figure. Signed in without the entitlement: only the top 10 of each sex's latest list; another year or page shows the locked card and no name beyond the free rows is anywhere in the response (checked in the HTML).
- **AC-3:** with a `babynames` purchase, and with each tier from 28,99 zł: every name of any year's list, paging and the direction filter work; boys and girls are never merged or summed.
- **AC-4:** every figure comes from claims, with a citation shown once per list; `given_name_birth_counts` and `given_name_counts` are not read; a flagged form is absent.
- **AC-5:** the locked card reads "8,99 zł" and "Wkrótce"; no `<button>` other than the filters' own; no link to checkout or Stripe.
- **AC-6:** no horizontal overflow at 390 px (Chromium, or the record says it was not checked).

## 7. Verification

`pnpm format:check`, `check:ids`, `typecheck`, `lint`, `test`, `test:integration`, `test:golden`, `build`; Chromium at 390 and 1280 px.
