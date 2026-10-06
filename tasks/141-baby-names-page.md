# TASK-141 — First names given to children: the page, dark behind a flag

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-baby-names-page.md`). Dark: not on staging or production.
- **Requested by:** the project owner, 2026-10-06: the page of D-044's section, behind `BABY_NAMES_ENABLED`, at `/pl/imiona-dla-dziecka` and `/en/baby-names` (the address D-044 left open).
- **Decision:** D-044 §1–8 (§6 as amended by TASK-139); ADR-0037 §2.1 (the 5,99 zł tier, and the tiers from 28,99 zł up that hold its figures); ADR-0042, ADR-0043, ADR-0032; ADR-0023 §2.5. No new ADR: nothing here is a new binding decision. No new contract: no API is added.
- **Number:** 141. 140 was the next free on `main` (`023061e`) at the start; before the pull request, open #168 had taken TASK-140 and ADR-0044, so this takes 141. No ADR is added.
- **Model guidance:** implementation session.

## 1. Goal

A signed-in reader types a first name and sees, for boys and for girls apart, its count and rank in the latest year and whether it is rising, steady or falling, read from the claims of TASK-137 and TASK-139. A reader holding a purchase of a tier that includes the section's full figures also sees every year from 2000. Everything stays dark behind a flag.

## 2. Facts (2026-10-06)

1. The claims exist: `GIVEN_NAME_BIRTH_COUNT` and `GIVEN_NAME_BIRTH_RANK` per name and list, and `GIVEN_NAME_BIRTH_TREND` (`given_name_birth_trend@2`) on each sex's latest list against the list five years earlier. Each key names its list (`…|{given_name_id}|{list_id}`; the trend `…|{latest_list_id}|{earlier_list_id}`). Older lists' claims stay ACTIVE when a new year arrives (ADR-0043 §7), so the page picks the claims on the **current** lists by their keys.
2. A name absent from a list has no claim. Its cut-off is the list's own `publication_threshold` (5 up to 2012, 2 from 2013) in `given_name_birth_lists`.
3. `PurchaseTier` is `smaller` (28,99 zł), `couple` (89,99 zł) or `family` (199 zł). The 800 zł tier has no value (it is not sold through checkout) and the 5,99 zł product does not exist. `Purchases.hasPurchase` answers "any purchase" (TASK-114).
4. The couple report (TASK-100) is the pattern for a dark page: `couple-config.ts`, a 404 when off, `noindex`, `private, no-store` from the middleware. The tree (TASK-076) is the pattern for reading the session. A sign-in returns only to the addresses `safeNext` allows (TASK-064).

## 3. In scope

1. **Addresses:** `/pl/imiona-dla-dziecka` and `/en/baby-names`. They exist only when `BABY_NAMES_ENABLED` is exactly `1` and accounts are on; otherwise 404. `noindex`, `private, no-store` (on or off), in no sitemap, linked from nowhere. `safeNext` accepts the two bare addresses, so a sign-in comes back.
2. **Signed out:** what the section shows, its source (PESEL, dane.gov.pl dataset 219), and a sign-in link back to the page. No figures.
3. **Signed in:** a GET form (`?imie=` / `?name=`). The typed name goes through `canonicalKey` to a `given_names` row; a flagged form (`form_review`) is not shown. For boys and girls apart, never summed, from the claims only:
   - the latest year's count and rank as "N of M" (M is the rank claim's `universe_size`);
   - the trend, with one line saying what it compares (share of the children on the published list, the latest year against five years earlier, both years read from the claim);
   - absent from the latest list: "fewer than T", T from that list's `publication_threshold`, never 0; no direction;
   - in no list: said plainly;
   - every figure with its source and year.
4. **Paid view:** every year from 2000 to the latest, count and rank per year and sex, for an account holding a purchase of the 28,99, 89,99 or 199 zł tier (`smaller`, `couple`, `family`; the 800 zł tier holds it too but cannot be bought). `Purchases.hasPurchaseOf(userId, tiers)` checks the tier. A year with no claim reads "fewer than T" from that year's list. Everyone else sees a locked card naming the 5,99 zł tier as "Wkrótce", with no buy button.
5. **`packages/truth/src/given-name-birth-facts.ts`:** `findBirthGivenName`, `readBirthNameFacts`.
6. **Copy** in Polish and English: count, rank and trend only.
7. **Tests:** unit tests of the reader's selection rules and the copy; integration tests of the reader on the full 2020 and 2025 files and the 2000–2019 excerpt, and of `hasPurchaseOf`; page tests for flag off, signed out, signed in without a purchase and with a 28,99 zł test purchase.
8. **Records:** `docs/CODEMAP.md`, the progress record, `STATUS.md`.

## 4. Out of scope

Comparing names; voivodeships, half-years, second names; the 5,99 zł product and its checkout, and TASK-114's change that a 5,99 zł purchase must not unlock the tree; any public API route or contract; header or footer links; production config; the VM; staging.

## 5. Acceptance criteria

- **AC-1:** with the flag unset or not exactly `1`, both pages answer 404 and their metadata is empty; on, `noindex`; both are sent `private, no-store` on or off.
- **AC-2:** signed out: the explanation, the source and a sign-in link carrying `next` back to the page; no figure.
- **AC-3:** signed in: boys and girls apart; the latest count and "N of M"; the trend and its line; "fewer than T" from the list's cut-off for an absent name; a plain line for a name in no list; a source and year on every figure; a flagged form is not shown.
- **AC-4:** the full history only for an account holding a 28,99, 89,99 or 199 zł purchase; years before 2013 read "fewer than 5" when absent; never 0. Others see the locked 5,99 zł card, "Wkrótce", no buy button.
- **AC-5:** the page reads only claims for a name's figures; the list rows give only the year, the sex and the cut-off of a list the name is absent from.
- **AC-6:** on the full 2000–2025 import: ZOFIA girls 2025 rank 1, STEADY; JAKUB FALLING; a name absent from 2025; an unknown name; a 28,99 zł test purchase showing the full history; no horizontal overflow at 390 px.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration`, `test:golden`. On a disposable local database with dataset 219's 13 files imported and derived: `next start` with `BABY_NAMES_ENABLED=1` and accounts on, in Chromium at 390 and 1280 px, for each case of AC-6 and the flag off.
