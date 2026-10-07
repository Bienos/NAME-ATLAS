# 2026-10-07 — A signed-in reader's full report as a PDF, free for now (TASK-176)

**Request.** The owner chose "PDF raportu" after TASK-166, and "Zalogowani, na razie za darmo" for who gets it. TASK-172 built the PDF and an invented sample. Asked on 2026-10-07, the owner chose:
- **where:** the page of what the report holds, under the sample;
- **the wording:** "28,99 zł" struck with "dziś 0 zł" instead of "Wkrótce";
- **until when:** no end date.

They were told that a struck price never charged reads as a false reduction (the Omnibus rules), and chose it as D-051 did. D-052 records the answers and keeps that risk open. The task file is `tasks/176-reader-report-pdf.md`.

**Numbering.** Built as TASK-173. `main` then gave TASK-173 to the offer page (#208), and TASK-174 and TASK-175 were taken by #209 and #206, so this change is TASK-176.

**Where it stands.**
- **Base:** built on `main` @ `6e2fb72` (TASK-172 merged); `main` @ `0356a33` (#208, #209, #207 and the sample PDF's trace fix, #210) merged in.
- **No migration, no new dependency.** No reader's report is stored: `reports` still allows only `INTERNAL_TEST`.

## What changed

- **`packages/truth/src/report.ts`:**
  - **The split:** `buildFullNameReport` is now a compose step and a write step. What it writes is unchanged; its integration tests pass as before.
  - **The entitlements:** `REPORT_ENTITLEMENT_SURFACES` maps `INTERNAL_TEST` to the PAID surface and `FREE_SIGNED_IN` to the FREE one. `ReportPayload.surface` and `entitlement_kind` take both.
  - **`composeReaderReport`:** composes the report on the FREE surface and reads both names' claims again after the reads. It returns a stored version's shape (through JSON, no id, version 0) or the same outcomes as the build. It writes nothing.
- **`apps/web/src/lib/report-reader-pdf.ts`, `app/pl/nazwisko/[slug]/pelny-raport/pdf/route.ts`, `app/en/surname/[slug]/full-report/pdf/route.ts`:**
  - **A reader with a session:** the report for the typed name and the address's surname, through `toReportPreview` and `renderReportPdf`. It is an attachment (`anna-nowak-raport.pdf`), `private, no-store`, `noindex, nofollow`.
  - **303 back to the page with the name:** no session, accounts off, an unknown or held name, a name over 60 characters, or the free report ended.
  - **Other answers:**
    - 308 for a moved address;
    - 404 for an unknown surname;
    - 503 when the database cannot answer, the claims moved, or the composed report names another surname.
  - **Fonts:** `next.config.ts` traces them for both routes, with pdfkit's built-in fonts' `.cjs` files, as #210 does for the sample. Without those, the sample's route answered 500 on Vercel.
- **`report-inside-page.tsx`:**
  - **The button:** "Pobierz pełny raport (PDF)" under the sample, with "Raport dla imienia i nazwiska ANNA NOWAK, 10 rozdziałów, z przypisami.", for a reader with a session while the report is free.
  - **The price block:** "28,99 zł" struck, "dziś 0 zł", and "Na razie za darmo dla zalogowanych.", with no waiting-list email.
- **`report-teaser-text.ts`, `report-teaser.tsx`, `share-route.ts`, `share-card.tsx`:**
  - **`reportFree`:** `FULL_REPORT_FREE=0` ends the free report.
  - **`ReportPrice`:** the struck price with "dziś 0 zł".
  - **Where it shows:** the deck's last card and the studio say "Na razie za darmo dla zalogowanych." instead of "Wkrótce" and the email. The video's closing plate says "Pełny raport PDF · dziś 0 zł" after the struck price.
- **`report-pdf.tsx`:**
  - **The version line:** a report with version 0 says only "Stan danych {date}".
  - **A fix to TASK-172:** "W skrócie" no longer ends the children's line with "r.." (seen in the real report).
- **`globals.css`:**
  - **The struck price:** in each place.
  - **The button:** an amber pill.
  - **The deck's row and the studio's head line:** they wrap rather than squeeze the sample's button (seen at 390 px).
- **Tests:**
  - 2 integration tests in `full-name-report.test.ts`;
  - `report-reader-pdf.test.ts`, 6 new;
  - new cases in `report-inside-page.test.ts`, `deck.test.ts`, `share-studio.test.ts` and `share-route.test.ts`. The TASK-166 cases now run with `FULL_REPORT_FREE=0`.
- **Docs:**
  - D-052;
  - ADR-0049 §4;
  - ADR-0037 §2's amendment;
  - the task file;
  - this record;
  - `docs/CODEMAP.md`;
  - `STATUS.md`.

## Verification (commands run, results as returned)

__CI__

**On the real lists, locally.** The database is `gn163`, a local copy of the full 2026-01-20 lists with the four birth lists. A local account and session were inserted into it for the check and removed after. `next start` ran with accounts on.
- **`/pl/nazwisko/nowak/pelny-raport/pdf?imie=Anna`:**
  - **Without the cookie:** `303` to `/pl/nazwisko/nowak/pelny-raport?imie=Anna`.
  - **With it:** `200`, 46,573 bytes in 1.16 s, `attachment; filename="anna-nowak-raport.pdf"`, `private, no-store`, `noindex, nofollow`.
- **`/en/surname/kowalski/full-report/pdf?name=piotr`:** `200` in 0.47 s, `piotr-kowalski-report.pdf`.
- **An unknown name:** `303` back to the page with it.
- **Nothing stored:** the counts of `reports`, `report_versions` and `report_sections` (5, 9, 90) were the same before and after a download.
- **The PDF, read with poppler:**
  - 7 A4 pages, titled "ANNA NOWAK · Name Atlas";
  - no sample's mark;
  - the four fonts embedded;
  - the cover's line "Stan danych 7 października 2026 r.".
  - The chapters this local database has not derived (distribution, change, archive) say so, as the HTML preview does.
- **The page, in Chromium with the session, at 390 and 1440 px:**
  - no horizontal overflow;
  - the button under the sample;
  - a click downloads `anna-nowak-raport.pdf`.
  - The studio at 390 px has no overflow either. The deck's last card's row was checked with the final CSS put into the page.

## Not verified

- **On production:** nothing here was checked there before the merge. Production must have accounts on for anyone to get the file.
- **A real sign-in:** the session was inserted into the local database, not made by signing in.
- **Other PDF viewers:** the file was read in poppler only, not in a phone's PDF viewer.
- **The price wording:** no lawyer has seen the struck price (D-052).
- **The bibliography:** it lists a source record once per claim's citation, so one PESEL file can appear twice (its count and its rank). This is unchanged from TASK-172 and the HTML preview.
