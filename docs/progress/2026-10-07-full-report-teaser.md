# 2026-10-07 — The full report announced on the deck's last card, in the share studio and on a page of what it holds (TASK-163)

**Request.** The owner asked for mockups of a glowing announcement of the paid report. It was to appear on the deck's last card and again where the share cards and the video are. Then, on the mockups' teaser page: "can you make it go live". Asked, the owner chose:
- all three mockups;
- a new branch and pull request;
- a merge after local checks.

The authority is ADR-0037 §2, amended here; the task file is `tasks/163-full-report-teaser.md`.

**Where it stands.**
- **Base:** built on `main` @ `f753f4e`.
- **No migration.** Nothing is sold: every place says "Wkrótce" and has no buy button.
- **The PDF does not exist yet.** It is the next task.

## What changed

- **`apps/web/src/lib/report-teaser-text.ts`** holds the words and the addresses:
  - the page's paths (`pelny-raport` / `full-report`) and its query key (`imie` / `name`);
  - the price, read from the 28,99 zł tier in `offer-text.ts`;
  - "Powiadom mnie", which is that tier's `waitlistMailto` with the surname in the body.
- **`report-teaser.tsx`** has two blocks:
  - `DeckReportTeaser`, on the deck's last card (`deck.tsx`), between the figures and the way on;
  - `StudioReportTeaser`, in the share studio (`share-studio.tsx`), under the card's buttons, whatever the gate. It has a first-name field that opens the page, and a six-row table comparing the one-page PDF with the report.

  Both glow; under `prefers-reduced-motion: reduce` they keep a still glow.
- **The video:**
  - `share-video.ts` takes `outro`. The closing plate replaces the full clip's closing summary, and the short clip takes one card fewer, so neither runs longer than before.
  - `share-card.tsx` draws the plate as the layer `outro`.
  - `share-route.ts` passes the plate's words, with the surname, for that layer only, behind the same gate as every layer.
  - `studio-client.tsx` adds the checkbox "Na końcu: zapowiedź pełnego raportu", on by default.
- **The page of what the report holds** (`report-inside-page.tsx`; `app/pl/nazwisko/[slug]/pelny-raport/`, `app/en/surname/[slug]/full-report/`):
  - **The sample:** for a typed first name, the report's first chapter. It shows the count and rank on each list of first names, the latest year's figures as a name given to children, and each work's origin and meaning, with numbered notes. All of it comes from `readGivenNameFacts`, `readBirthNameFacts` and `readGivenNameMeaning` on the FREE surface.
  - **What it never does:** sum the two lists, or write 0 for an absence. A year below a list's cut-off says so.
  - **The rest of the page:** the ten chapters' titles, from the report preview's `SECTION_TITLES` (now exported) in `FULL_NAME_SECTION_TYPES` order, then the "what we don't know" example, the price, "Wkrótce" and the email.
  - **Sign-in:** with accounts on, the sample is for signed-in readers. Without a session, the reader gets a sign-in whose `next` is the page; `safeNext` now accepts it without its query.
  - **Indexing:** `noindex`, dynamic.
- **Tests:**
  - `report-inside-page.test.ts`: 13 new tests;
  - `deck.test.ts`: 3 new;
  - `share-studio.test.ts`: 1 new;
  - `share-video.test.ts`: 4 new;
  - `share-route.test.ts`: 1 new;
  - `account-paths.test.ts`: 2 new.

  `deck.test.ts`'s "every figure on a card is one the page prints" leaves out the announcement. Its own test holds that block's only figure to be the tier's price.
- **Docs:**
  - the task file;
  - ADR-0037 §2's amendment;
  - this record;
  - `docs/CODEMAP.md`;
  - `STATUS.md`.

## Verification (commands run, results as returned)

`.github/workflows/ci.yml`'s steps were run locally, in order, on the tree of `b4adeb7`. That tree differs from the commit only in this record. The database was PostgreSQL 16.14, and `DATABASE_URL` was a new empty `name_atlas`, so the unit tests met an empty database, as on GitHub. GitHub Actions has started no job in this repository since about 07:49 UTC.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0 |
| `pnpm test` | exit 0, 2,696 tests (web 1,228 in 109 files, truth 433, sources 615) |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0, no diff |
| `pnpm test:integration` | exit 0: 50 files, 546 tests |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0, 10 Playwright tests passed |

The first build of this change, before that run, failed Next's type check: `studio-client.tsx`'s checkbox read `event.target.checked`, which the repository's `lib: ["ES2022"]` does not type. It now toggles the state instead. `pnpm typecheck` had passed; only the build caught it.

**On real data.** The database `gn163` is a copy of the local `gn_full`, which holds the 2026-01-20 first-name lists, NOWAK and the meaning files.
- **Migrations:** migrated to `0047`, after its 0044 row was deleted and its check dropped. The original had 0044 without 0043.
- **Birth lists:** `pnpm import:given-name-births` loaded the four committed full files (2020 and 2025, boys and girls). `pnpm truth:derive-given-name-births` then gave 3,502 counts, 3,502 ranks and 1,904 trends.

Under `next start` on the built app, with accounts off, checked with Playwright (Chromium):
- **Status codes:** every route returned `200`:
  - `/pl/nazwisko/nowak`;
  - `/pl/nazwisko/nowak/pelny-raport?imie=Piotr`;
  - `/en/surname/nowak/full-report?name=Anna`;
  - `/pl/nazwisko/nowak/udostepnij`;
  - `/pl/nazwisko/nowak/karta/summary?layer=outro` (`image/png`).
- **Headers:** the page was sent `private, no-cache, no-store` and `noindex, nofollow`.
- **The page for PIOTR:**
  - men: 682 516, place 1 of 46 197;
  - women: 3, place 14 831 of 28 781;
  - boys born in 2025: 1 146, place 29 of 965;
  - three works (Yonge, Brückner, Buryan), with "Źródła się różnią";
  - six notes, the two register lists told apart by their resource.
- **An unknown name:** "Qwertyx" read "Imienia „Qwertyx” nie ma na listach imion z rejestru PESEL."
- **The studio's form** took "Piotr" to `/pl/nazwisko/nowak/pelny-raport?imie=Piotr`.
- **The last card:** the block shows between the figures and "Twoja karta jest gotowa". The card's body scrolls: 659 px of content in 567 px at 390 × 844.
- **Width:** scroll width equals client width at 390 × 844 on the deck, the studio and the page (pl and en), and at 1440 × 900 on the studio and the page. Two overflows were found and fixed before this:
  - the studio's table and field widened its column to 461 px;
  - a work's long locator widened the sample.
- **The closing plate** (1080 × 1920) reads:
  - "Pełny raport · PDF";
  - "Imię i nazwisko w 10 rozdziałach";
  - "NOWAK i Twoje imię, z przypisem przy każdym fakcie.";
  - "Pełny raport PDF · wkrótce".

## Not verified

- **The video itself:** headless Chromium here cannot encode H.264, so the studio showed no video button and no clip was made. The schedule is unit-tested and the plate's image was fetched; a clip with the plate was not watched.
- **With accounts on:** the sign-in prompt and the return to the page were checked by unit tests only.
- **Production:** nothing here was checked there. `name-atlas.pl`'s A record pointed to home.pl (46.242.245.35), not Vercel, when checked on 2026-10-07.
- **"Ile dzieci dostało je, rok po roku":** the report holds this from TASK-159 (#190), which is not on `main` yet.
