# 2026-10-07 — The report as a PDF, and an invented sample of it (TASK-171)

**Request.** The owner chose "PDF raportu" as the next step after TASK-166. Then they asked for "przykład tego raportu … jakieś zmyślone imię i wypełnienie wszystkiego zmyślonymi wygenerowanymi rzeczami". Asked, they chose:
- the sample on the site, marked as invented;
- an invented name that is not on the PESEL lists;
- the real PDF free for signed-in readers for now. That is TASK-172, not built here.

The task file is `tasks/171-report-pdf-and-sample.md`; the decision is ADR-0049.

**Where it stands.**
- **Base:** built on `main` @ `7db2909`.
- **No migration.** No report is built, stored or sold.
- **One new dependency:** `@react-pdf/renderer` 4.9.0. A multi-page A4 report needs page flow, repeated heads and selectable text in the brand fonts. `next/og` draws one fixed-size image, and `pdf-lib` has no layout (ADR-0049 §1).

## What changed

- **`apps/web/src/lib/report-pdf.tsx`**, `ReportPdfDocument` and `renderReportPdf`: a `ReportPreview` as A4 pages.
  - **The pages:** a dusk cover; then "W skrócie" (figures the chapters hold, each with its chapter number) and the contents; then the chapters. The chapters hold tables whose rows never split, the children's years with a bar to scale, each work's words, the regions' bars, a numbered note at each fact, the bibliography and "Czego nie wiemy". Every page has a running head and the page numbers.
  - **Words:** the preview's own (`report-view.tsx` now exports `COPY`, its word maps, `listName`, `locatorWords`, `contentsCount`, and `reportNumbers`, the note numbering it shares).
  - **Fonts:** the share cards' TTFs, embedded. English hyphenation is switched off.
  - **Text runs:** they are joined into one string where two runs meet without a space. A line broken between two runs got a stray hyphen ("zasób 900011-").
- **`report-sample.ts`:** WIELIMIRA WRZOSOWIECKA, an invented full-name report shaped as a stored version.
  - **The names:** neither is on the PESEL lists. The surname does not resolve on production (`/api/v1/surname-results`), and the first name is not on the 2026-01-20 lists of first names in the local database.
  - **The sources:** every one says "(dane zmyślone)" in its title, with an invented resource number.
  - **What is left out:** bearers, neighbours and localities have the states that name no one.
  - **What it holds:**
    - the first name: one list (1 486, place 512 of 28 781);
    - the girls' years 2000–2025 (below the cut-off until 2008, then 6 to 214), and the boys' line that the name is on none of their lists;
    - two works on the first name;
    - two works on the surname;
    - the surname: two lists, five regions, change since 2019 and an archive count.
- **`report-sample-route.ts`; `app/pl/przykladowy-raport.pdf/`, `app/en/sample-report.pdf/`:** the sample with `sample: true`. Every page carries a band ("PRZYKŁAD · imię, nazwisko i wszystkie dane są zmyślone") and a diagonal "PRZYKŁAD", and the cover says the data are invented. Rendered once per process and language. `application/pdf`, inline, `public, max-age=3600, s-maxage=86400`, `X-Robots-Tag: noindex, nofollow`. `next.config.ts` traces the fonts for both routes.
- **`report-teaser.tsx`:** `SampleReportLink` ("Przejrzyj przykładowy raport (PDF) →", with the line "Imię, nazwisko i dane w przykładzie są zmyślone."). It is in the deck's block, the studio's block and on the page of what the report holds. `SAMPLE_REPORT_PATHS` lives in `report-teaser-text.ts`, so the card renderer does not load the PDF library.
- **Tests:**
  - `report-pdf.test.ts`: 8 new;
  - new assertions in `deck.test.ts`, `share-studio.test.ts` and `report-inside-page.test.ts`.
- **Docs:**
  - ADR-0049;
  - the task file;
  - this record;
  - `docs/CODEMAP.md`;
  - `STATUS.md`.

## Verification (commands run, results as returned)

The local run of `.github/workflows/ci.yml`'s steps was still in progress at this commit; its results are added in the next.

**The PDF, looked at.**
- **Rendered by the test** with `REPORT_PDF_OUT`, then rasterised with poppler (`pdftoppm`) and read page by page:
  - 6 A4 pages;
  - the fonts embedded: Fraunces Medium, Instrument Sans Regular and SemiBold, IBM Plex Mono Medium;
  - the text selectable: `pdftotext` reads it;
  - every chapter's number and title on the same page;
  - no stray hyphen in the bibliography.
- **Under `next start`** on the built app: `/pl/przykladowy-raport.pdf` and `/en/sample-report.pdf` returned `200` with the headers above, in 0.73 s and 0.32 s on a first request. The PDF's title is "WIELIMIRA WRZOSOWIECKA · Name Atlas · PRZYKŁAD".

## Not verified

- **On production:** nothing here was checked there before the merge.
- **On another reader:** the PDF was looked at in poppler only, not in a phone's PDF viewer.
- **A real report as a PDF:** not rendered from the production database. TASK-172 builds that.
