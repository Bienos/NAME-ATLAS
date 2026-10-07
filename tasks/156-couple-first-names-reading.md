# TASK-156 — "Co mówią Wasze imiona razem": the couple first-names page, the free meanings, and the model-written reading

- **Status:** IMPLEMENTED 2026-10-06, rebased and renumbered 2026-10-07, dark (`docs/progress/2026-10-06-couple-first-names-reading.md`). §3.5's meaning block on the baby-names page was built first by TASK-151 on `main` (its own block, in Brand System v1), so this task keeps only the link from that page and the shared module the report and the couple page render; `ORIGINS` moved there and the baby-names page reads it from there. Migration 0047 is not applied on the VM; the flag and the key are set nowhere; no real model call was made.
- **Number:** 156, migration 0047, ADR-0047, D-050. Written and built as TASK-150, migration 0045 and D-048 on 2026-10-06, on `main` @ `3d12f1a`. The same day `main` took TASK-150 (Brückner 1927, #179), TASK-151 (the baby-names page redesigned, #182), TASK-152 (share cards, #183) and TASK-153 (the account pages, #184), so on 2026-10-07 this became TASK-154 and was rebased. Then `main` took TASK-154 (test-mode checkout for listed testers, #186) and the earlier open pull request #185 held migration 0045 and D-048, so it became TASK-155, migration 0046 and D-049. Then #185, the earlier pull request, was renumbering to those same three numbers and another branch holds TASK-157, so this took the next free ones: TASK-156, migration 0047 and D-050 (AGENTS.md §11: free on `main` and in open pull requests). ADR-0047 stayed free throughout. Nothing else changed with the numbers.
- **Requested by:** the project owner, 2026-10-06 (D-050): "B czyli a i b", "tak i gdzieś jeszcze", "narazie darmowe ale bedzie kosztowac 15.99 PLN i w kazdym pakiecie drozszym".
- **Decision:** ADR-0047 (proposed in the same change as D-050's resolution).
- **Depends on:** TASK-147 (the `GIVEN_NAME_MEANING` claims, migration 0044), TASK-141 (the baby-names page and its sign-in pattern), TASK-100 (the banned-words rule), ADR-0013 (OpenAI, `OPENAI_API_KEY`), all on `main` @ `3d12f1a`.
- **Model guidance:** implementation session. The prompt wording and the model's name are the session's to choose within ADR-0047 §2.3 and §2.7; everything else is specified here.

## 1. Goal

A signed-in page that shows two first names' sourced origins and meanings side by side and, on request, a reading of the two meanings written by a model from those claims and nothing else, with no verdict on the couple. Each name's meaning also appears on the free baby-names page. Everything is free with an account for now. Shared motifs and the 15,99 zł price are later tasks.

## 2. Facts (checked on `main` @ `3d12f1a`, 2026-10-06)

1. `readGivenNameMeaning(db, givenNameId, surface)` in `packages/truth/src/given-name-facts.ts` returns `GivenNameMeaningFacts`: `READY` with `claim_id`, `confidence` and `works[]` (each with `work`, `printed_form`, `origin`, `literal_gloss`, `translation`, `locator`, `quotation`, `citation`), or `NO_SOURCE`, or `RIGHTS_BLOCKED` when the surface may not show it. The report reads it with `"PAID"` (`packages/truth/src/report.ts`). The free surname page already shows Buryan's surname meanings, so `"FREE"` is expected to pass for both works; if it does not, stop and record it in `docs/DECISIONS_NEEDED.md` instead of reading with `"PAID"`.
2. The report renders a meaning with `GivenNameMeaning` in `apps/web/src/lib/report-view.tsx` (a table: work, origin, meaning, quotation; `ORIGINS` words the language codes; `GIVEN_GAPS.MEANING` is the absence text; on the Polish page Yonge's gloss is followed by "przekład Name Atlas"). It is not exported.
3. The baby-names page (`apps/web/src/lib/baby-names-page.tsx`): `loadBabyNames` takes `lang`, `query`, `session` and `BabyNamesDeps` (`findName` → `findBirthGivenName`, `readFacts`, `readStock` → `readGivenNameFacts(db, name, "FREE")`, `readLists`, `hasFullView`); the signed-out branch links to sign-in with `accountPath(lang, "sign-in", { next })`; results are `NONE`, `INVALID`, `NOT_FOUND`, `HELD`, `FACTS` or `STOCK_ONLY`; `runningBabyNamesDeps(pool)` wires it; `BabyNamesRoute` reads the session cookie (`session-cookie.ts`). Its flag and paths are in `baby-names-config.ts`; the middleware sets `private, no-store` by `isBabyNamesPath`.
4. The surname couple report's pattern for a dark page: `couple-config.ts` (`COUPLE_REPORT_ENV`, `COUPLE_PATHS`, `coupleReportEnabled`, `isCouplePath`), `couple-page.tsx`, `couple-view.tsx`, routes under `apps/web/src/app/pl/para` and `en/couple`, and the banned-words test in `couple-view.test.ts` (`BANNED`, and no `%`).
5. Messages live in `apps/web/src/lib/messages.ts` with a parity test; page-specific words sit in the page's own `*-text.ts` (`baby-names-text.ts`).
6. Migrations are Kysely files in `packages/db/migrations/`, numbered; 0044 is the latest; `pnpm db:migrate` applies them and `pnpm db:generate-types` regenerates `packages/db/src/generated/db.ts`. Migration 0037's report tables are refused any `UPDATE` or `DELETE` by a trigger.
7. `OPENAI_API_KEY` is documented only in ADR-0013; `.env.example` does not name it. No model code and no `openai` dependency exist.
8. On the committed files, 168 names have a claim, 107 with a `literal_gloss`, 61 with an origin only (D-050). Migration 0044 and the files are not on the VM: production has no meaning claims until the `given-names` step runs.

## 3. In scope

### 3.1 The flag and the paths

- `apps/web/src/lib/couple-names-config.ts`, on the pattern of `couple-config.ts`: `COUPLE_NAMES_ENV = "COUPLE_NAMES_ENABLED"`, `COUPLE_NAMES_PATHS = { pl: "/pl/imiona-pary", en: "/en/couple-names" }`, `COUPLE_NAMES_CACHE_CONTROL = "private, no-store"`, `coupleNamesEnabled(env)` true only when the variable is exactly `1`, `isCoupleNamesPath`. Off: both pages and the `POST` route answer 404, and nothing links to them. The middleware sets the cache header by `isCoupleNamesPath`.
- `COUPLE_NAMES_DAILY_CAP = 200`: new readings per UTC day, all readers together, counted from `given_name_readings.created_at`. A cost cap, nothing else.

### 3.2 The model client

- A workspace package `packages/llm` (`@name-atlas/llm`), server-side only, with plain `fetch` and **no new dependency** (ADR-0013 left the choice open; a dependency would need a reason, AGENTS.md §6). It exports one function that sends instructions and an input to OpenAI's API with a JSON-schema response format and returns the parsed object, with a 30 s timeout and the key from `OPENAI_API_KEY` read at call time. The key is never logged, never stored and never in an error message. Check the current API shape in OpenAI's documentation; do not write it from memory.
- The model's name is one constant, `COUPLE_NAMES_MODEL`, a current small model; the progress record names it and the measured cost of one reading (tokens in and out, and the price).
- Tests stub `fetch`; CI has no key (ADR-0013). Without the key the page shows the meanings and says the reading is unavailable; nothing throws.
- `.env.example` documents `OPENAI_API_KEY` by name only.

### 3.3 Migration 0047: `given_name_readings`

- Columns: `reading_id uuid` primary key; `given_name_a_id`, `given_name_b_id` (the pair's two ids, `a <= b` as text, enforced by a CHECK; the same id twice allowed); `claim_a_id`, `claim_b_id` (the `GIVEN_NAME_MEANING` claims read); `prompt_version text` (`couple_names_reading@1`); `model text`; `text_pl text`, `text_en text`; `created_at timestamptz`. Unique on (`given_name_a_id`, `given_name_b_id`, `claim_a_id`, `claim_b_id`, `prompt_version`). A trigger refuses `UPDATE` and `DELETE`, as 0037 does. `down` drops the table.
- Regenerate `packages/db/src/generated/db.ts`.

### 3.4 The pages

- Routes `apps/web/src/app/pl/imiona-pary/page.tsx` and `en/couple-names/page.tsx`, `force-dynamic`, `robots: noindex, nofollow`, in no sitemap; metadata empty when the flag is off (as `babyNamesMetadata`).
- `couple-names-page.tsx` (`loadCoupleNames`, deps, route) and `couple-names-view.tsx`, on the baby-names page's pattern:
  - signed out: the explanation and a sign-in link with `next` set to the page;
  - signed in, no `a` or `b`: two text fields and one button, "Pokaż" / "Show";
  - each typed name goes through `findBirthGivenName`; `INVALID`, `NOT_FOUND` and `HELD` read as the baby-names page reads them, per field;
  - both found: the title with the two names; then, for each name, **"Pochodzenie i znaczenie"** / "Origin and meaning" rendered by the shared meaning block (§3.5), or the absence text; then the reading block (§3.6); then links to each name's baby-names page.
- The two names are shown in the order typed; the stored reading is looked up by the sorted pair, so `a,b` and `b,a` share one reading.

### 3.5 The meaning block, shared, and the free baby-names page

- Move `GivenNameMeaning` with `ORIGINS` and the absence text out of `report-view.tsx` into `apps/web/src/lib/given-name-meaning-view.tsx`, exported, and use it from the report (unchanged output; the report's tests still pass), the couple page and the baby-names page. Where the report passes footnote numbers, the other two pages show each work's citation as the baby-names page's `Source` block shows one.
- Baby-names page: `BabyNamesDeps` gains `readMeaning: (givenNameId) => readGivenNameMeaning(db(), id, "FREE")`; `FACTS` and `STOCK_ONLY` results carry `meaning: GivenNameMeaningFacts`; the view shows the block after the register section, with the absence text when `NO_SOURCE`. Free for every signed-in reader; nothing about it is gated by `full`.
- A link on the baby-names page to the couple page, "Dwa imiona razem" / "Two names together", only while `coupleNamesEnabled()`.

### 3.6 The reading

- Shown only when both meanings are `READY` and each has at least one work with a `literal_gloss`. Otherwise the block says which name has no quoted meaning (origin only, or no source) and that a reading needs one; no button.
- A stored reading for (sorted pair, the two `claim_id`s, `prompt_version`) is shown as is. Otherwise a form with one button, "Napisz odczytanie" / "Write the reading", `POST /api/couple-names` with `a`, `b` and `lang`; signed-in only; 404 when the flag is off; 303 back to the page.
- The route: resolves both names again, reads both meanings, checks the stored row again (a second click finds the first click's row), checks the daily cap (when reached, back to the page with `?limit=1`, which shows "Dziś nie powstanie już więcej odczytań; wróćcie jutro" / "No more readings today; come back tomorrow"), then calls the model once, checks the text, retries once on a failed check, stores on success (`INSERT … ON CONFLICT DO NOTHING`), and on a second failure goes back with `?reading=failed` ("Odczytanie nie powstało" / "The reading was not written"; the meanings stay).
- The prompt's input is built from the two `GivenNameMeaningFacts` only: for each name, each work's author, year, locator, origin as printed, gloss verbatim, translation text where present. No surname, no account, no typed text. Instructions (the session's words, within ADR-0047 §2.3): write for the two readers, in Polish and in English, 120–220 words each; use only the entries given and name the works as given; add no meaning, etymology, saint, history, person or trait; no verdict on whether the names suit each other, no number, no percentage, no score; output `{ "pl": string, "en": string }`.
- The check, in one function `checkReading(text)` used by the route and the tests: the text contains none of `COUPLE_NAMES_BANNED` (the `BANNED` list of `couple-view.test.ts`, plus "pasuje", "procent", "percent", "score", "%"), no digit, and 80–260 words. The constant lives in `couple-names-config.ts` so the messages test and the route share it.
- The block's wording: heading "Odczytanie Name Atlas" / "A Name Atlas reading"; under it one line: "Interpretacja znaczeń podanych wyżej, napisana przez model {model}. To nie jest fakt ani ocena Waszej pary." / "An interpretation of the meanings above, written by the model {model}. It is neither a fact nor a judgement of your couple."; the date of the reading.

### 3.7 Wording rules

- TASK-100 §3.4 applies to this page's messages, its rendered page and every stored reading: none of `COUPLE_NAMES_BANNED`, no percentage, no hearts, no count or figure computed from the two names. No surname (D-033).

### 3.8 Tests and docs

- Tests: the flag (off → 404 for both pages and the route; on → 200); signed-out → sign-in link; one or both names not found; one name `NO_SOURCE`, one origin-only (no button, the right message); both with glosses and a stored row (shown, no call); no stored row → the route calls the stubbed model once, stores, redirects; a failed check → one retry, then `?reading=failed`, nothing stored; the daily cap; `a,b` and `b,a` share a row; the banned-words test over the messages, the rendered page and a sample reading; `checkReading` on texts with a digit, a percentage and a banned word; the meaning block on the baby-names page for `READY` and `NO_SOURCE`; the report's output unchanged after the move; message parity; `noindex` and the cache header.
- Docs: `docs/CODEMAP.md` (the package and the pages), `STATUS.md`, a progress record with the model's name and the measured cost of one reading, `.env.example`.

## 4. Out of scope

- Shared motifs (ADR-0047 §2.5): the next task.
- The 15,99 zł product, `COUPLE_NAMES_TIERS`, the checkout entry and any gate on the reading (ADR-0047 §2.6): the task after.
- A header link, a share card, an English page's SEO, any analytics.
- Linking from the surname couple report (`/pl/para`).
- Running migration 0047 or the `given-names` step on the VM; setting `COUPLE_NAMES_ENABLED` or `OPENAI_API_KEY` in production.
- Any change to the claims, the works, the report's wording or ADR-0035.

## 5. Acceptance criteria

- **AC-1** With the flag unset or not `1`, both pages and `POST /api/couple-names` answer 404 and no page links to them.
- **AC-2** Signed in, two names with quoted meanings show both meaning blocks from the claims (work, origin, gloss, translation marked, citation) and, after one `POST`, one stored reading that passes `checkReading`; a second `POST` for the same pair in either order makes no model call.
- **AC-3** A name with an origin only or no claim gets no button and the stated reason; the model is never called for it.
- **AC-4** A reading that fails the check twice is not stored and the page says so; the meanings remain.
- **AC-5** The prompt input contains the two claims' entries only: a test asserts the stubbed request body holds no surname, account id or typed string.
- **AC-6** The free baby-names page shows a found name's meaning block or the absence text to every signed-in reader.
- **AC-7** The pages are `noindex`, `private, no-store`, in no sitemap; the messages, the rendered page and a stored reading contain none of `COUPLE_NAMES_BANNED` and no `%`.
- **AC-8** Without `OPENAI_API_KEY` nothing throws: the page shows the meanings and that the reading is unavailable.
- **AC-9** The progress record names the model and the measured cost of one reading, from a real call made locally, or says it was not run.
- **AC-10** `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:ids` pass.

## 6. Verification

```
pnpm lint
pnpm typecheck
pnpm test
pnpm check:ids
pnpm db:migrate            # on a local database at 0044
pnpm db:generate-types     # no diff beyond 0047's table
```

Then, locally with the full meaning files imported and derived (`pnpm import:given-name-meanings`, `pnpm truth:derive-given-name-meanings`), `COUPLE_NAMES_ENABLED=1`, `BABY_NAMES_ENABLED=1`, accounts on and a real `OPENAI_API_KEY`: open `/pl/imiona-pary?a=MAŁGORZATA&b=BARTŁOMIEJ` signed in, ask for the reading, record the model, tokens and cost in the progress record, and check `/pl/imiona-pary?a=ANNA&b=TOMASZ` shows Anna's origin only and no button.
