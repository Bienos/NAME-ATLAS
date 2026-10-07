# TASK-172 — The report as a PDF, and an invented sample of it

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-report-pdf-and-sample.md`).
- **Requested by:** the project owner, 2026-10-07. They chose "PDF raportu" as the next step after TASK-166, then asked for "przykład tego raportu … jakieś zmyślone imię i wypełnienie wszystkiego zmyślonymi wygenerowanymi rzeczami". Asked, they chose:
  - a sample on the site, every page marked as invented;
  - an invented name that is not on the PESEL lists;
  - the real PDF free for signed-in readers for now.

  That last choice is TASK-173; this task does not build it.
- **Decision:** ADR-0049 (the PDF's rendering, and the sample's rules).
- **Numbers:** TASK-172 and ADR-0049. It was built as TASK-171, which `main` then gave to the baby-names search (#205). TASK-169 (#198), TASK-170 (#203) and TASK-171 are on `main`; ADR-0048 is held by an open branch.

## In scope

1. **`apps/web/src/lib/report-pdf.tsx`:** the report as A4 pages in the design of the owner's mockups, rendered with `@react-pdf/renderer` from a `ReportPreview`, the same validated view the preview page renders, in the same words.
   - **Page order:** a dusk cover, then "W skrócie" with the contents, then the ten chapters.
   - **Chapters:** tables, the children's years with a bar to scale, each work's words, the regions' bars, a numbered note at each fact, the bibliography, "Czego nie wiemy".
   - **Each page:** a running head and the page numbers.
   - **"W skrócie":** only restates figures the chapters hold, each with its chapter.
2. **`report-sample.ts`:** WIELIMIRA WRZOSOWIECKA, an invented full-name report with every chapter filled.
   - **The names:** neither is on the PESEL lists.
   - **The sources:** every one is invented and says so in its title, so no real publisher is credited with an invented figure.
   - **What is left out:** no person, list neighbour or place-list entry is named.
   - **Its shape:** it is a stored version's shape, so it goes through `toReportPreview` like a real one.
3. **`/pl/przykladowy-raport.pdf` and `/en/sample-report.pdf`:** the sample as a PDF, every page marked "PRZYKŁAD · imię, nazwisko i wszystkie dane są zmyślone" (a band and a diagonal mark). It is public and cached, with `noindex`.
4. **Links:** "Przejrzyj przykładowy raport (PDF)", with the line that its data are invented, in the announcement's blocks (deck, studio) and on the page of what the report holds.

## Out of scope

- The real report as a PDF for a reader, and the change of "Wkrótce" to a free download (TASK-173).
- Any change to the report's contract, claims or tiers.

## Acceptance

- **AC-1:** the sample passes the surname contract and `toReportPreview`, with every chapter's state READY or AVAILABLE. Its sources all say they are invented, and it names no real publisher or person.
- **AC-2:** the PDF is A4, in both languages, with the brand fonts embedded and selectable text. The sample's title and every page say it is a sample.
- **AC-3:** both addresses answer `200` `application/pdf`, inline, `public`, `noindex, nofollow`.
- **AC-4:** the links are in the deck's block, the studio's block and on the page.

## Verification

`.github/workflows/ci.yml`'s steps, locally. The PDF is looked at page by page (poppler) and fetched from `next start`.
