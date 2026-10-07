# TASK-176 — A signed-in reader's full report as a PDF, free for now

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-reader-report-pdf.md`).
- **Requested by:** the project owner, 2026-10-07. They chose "PDF raportu" after TASK-166, and "Zalogowani, na razie za darmo" for who gets it. TASK-172 built the PDF and an invented sample; this task gives a reader their own. Asked on 2026-10-07, they chose:
  - **Where:** the page of what the report holds, under the sample of the first chapter, once a first name is typed.
  - **Wording:** "28,99 zł" struck with "dziś 0 zł" beside it, in place of "Wkrótce", on that page, the deck's last card, the studio and the video's closing plate. They were told that a struck price never charged reads as a false reduction (the Omnibus rules) and chose it all the same, as D-051 did for the baby-names view.
  - **Until when:** no end date; the owner ends it.
- **Decision:** D-052; ADR-0049 §4 and ADR-0037 §2, amended.
- **Numbers:** TASK-176 and D-052. It was built as TASK-173, which `main` then gave to the offer page (#208); TASK-174 (#209) and TASK-175 (#206, open) were taken too. No migration.

## In scope

1. **`packages/truth/src/report.ts`:** the full-name report composed in memory.
   - **Split:** `buildFullNameReport` becomes a compose step and a write step, with no change in what it writes.
   - **`composeReaderReport`:** composes the report on the FREE surface (entitlement `FREE_SIGNED_IN`) and returns it in a stored version's shape, with no id and version 0. It writes nothing.
2. **`apps/web/src/lib/report-reader-pdf.ts` and two routes:** `/pl/nazwisko/{slug}/pelny-raport/pdf?imie=…` and `/en/surname/{slug}/full-report/pdf?name=…`.
   - **A reader with a session:** gets the report, composed for the typed name and this surname, through `toReportPreview` and TASK-172's PDF without the sample's marks. It is an attachment, `private, no-store`, `noindex, nofollow`.
   - **Back to the page:** everything the page itself explains — no session, accounts off, a name not on the lists or held for review, the free report ended.
3. **The page:** "Pobierz pełny raport (PDF)" under the sample, for a reader with a session while the report is free.
4. **The wording:** the price struck with "dziś 0 zł", and "Na razie za darmo dla zalogowanych." instead of "Wkrótce" and the waiting-list email. It applies on the page, the deck's last card, the studio and the video's closing plate.
5. **`FULL_REPORT_FREE`:** exactly `0` ends the free report. Every place then says "Wkrótce" again and the route gives no file.

## Out of scope

- Buying the report, storing a reader's report, or any entitlement in the database.
- The offer page: its 28,99 zł tier holds more than the report (the tree unlock), so it keeps "Wkrótce".
- Any change to the report's contract, claims, sections or PDF layout, beyond the cover's version line for a report that has no version.

## Acceptance

- **AC-1:** `composeReaderReport` writes no row, reads on the FREE surface, and answers as `buildFullNameReport` does for an unknown name, a held form or an unknown surname.
- **AC-2:** a reader with a session gets `200` `application/pdf`, an attachment named after the two names, `private, no-store`, `noindex, nofollow`. Without a session, with accounts off, or once the report is no longer free, the reader is sent back to the page with the typed name.
- **AC-3:** the page shows the download only to a reader with a session, after a name was found, while the report is free.
- **AC-4:** while free, the page, the deck's card, the studio and the closing plate show the price struck and "dziś 0 zł", with no "Wkrótce" and no waiting-list email. With `FULL_REPORT_FREE=0`, they show what TASK-166 built.

## Verification

`.github/workflows/ci.yml`'s steps, run locally. Then, against the local copy of the real lists under `next start` with a local session:
- a real name's report is downloaded and read page by page with poppler;
- the report tables' row counts are compared before and after a download;
- the page is looked at 390 and 1440 pixels wide.
