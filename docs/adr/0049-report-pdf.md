# ADR-0049 — The report as a PDF: @react-pdf/renderer, from the preview's view, and an invented sample

- **Status:** Proposed 2026-10-07. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-07
- **Deciders:** the project owner. They asked for the PDF in the mockups' design, and for a sample "ze zmyślonym imieniem i wypełnieniem wszystkiego zmyślonymi rzeczami". Asked, they chose:
  - the sample on the site, marked as invented;
  - an invented name not on the PESEL lists.
- **Relates to:** ADR-0041 (the full-name report), ADR-0037 §2 (the report announced, TASK-166), TASK-107/TASK-118 (the one-page surname PDF, `pdf-lib`).
- **Implemented by:** TASK-172; §4 by TASK-176.
- **Amended:** 2026-10-07, §4 added (TASK-176, D-052).

## Context

The full-name report exists as a stored, immutable version (ADR-0041) and as an HTML preview behind a flag (`report-view.tsx`). The owner's mockups show it as A4 pages. The site already makes one PDF: the surname's one-page sheet, a `next/og` image placed on a page by `pdf-lib`. A report runs to several pages. Its length depends on the name: a name's years as a first name given to children alone can fill a page. It needs:
- text that flows from page to page;
- tables that do not split a row;
- a running head and the page numbers;
- notes;
- selectable, searchable text in the brand fonts.

## Decision

1. **Rendering:** `@react-pdf/renderer` 4.9.0, a new dependency of `apps/web`. It lays React components out as PDF pages with flexbox, flows text across pages, keeps a row together (`wrap={false}`), repeats `fixed` elements on every page, and embeds the TTF files the share cards already use (`assets/fonts/`, OFL). A render of the sample takes about 0.3–0.7 s on `next start`.
   - **Not `next/og` with `pdf-lib`:** it draws one fixed-size image. Pages would have to be cut by hand, and the text could not be selected.
   - **Not `pdf-lib` alone:** it has no layout; every line break and page break would be ours.
   - **Not a headless browser printing the HTML preview:** it needs Chromium in the serverless function, with its size, cold start and memory.
2. **From the preview's view:** the PDF renders a `ReportPreview` (`toReportPreview`), the view the preview page renders after the contract has validated the frozen response. It uses the same words (`COPY` and the word maps, now exported from `report-view.tsx`) and the same note numbers (`reportNumbers`). It derives nothing.
   - **"W skrócie"** restates figures the chapters hold, each with its chapter number, and the stated absence of a count of the two names together. It has no summary sentences of its own; the mockups' editorial lines are not reproduced.
3. **The invented sample** (`report-sample.ts`) is a stored version's shape and goes through the same parsing and the same PDF. Its rules:
   - **The names are not real:** neither is on the PESEL lists, checked against production and the local lists on 2026-10-07.
   - **Every source says it is invented** in its title, so no real publisher, dataset or library is credited with an invented figure. Its locators are invented resource numbers.
   - **No person, list neighbour or place-list entry is named.** Famous bearers, neighbours and localities are given the states that show none.
   - **Every page is marked:** a band, "PRZYKŁAD · imię, nazwisko i wszystkie dane są zmyślone", a diagonal "PRZYKŁAD", a note on the cover, and the document's title ends in "PRZYKŁAD".
   - **It is public, cached and `noindex`.** It is linked from the report's announcement with the line that its data are invented.
4. **A reader's own report (TASK-176, D-052).** While the report is free, a signed-in reader gets it from the page of what the report holds, for the typed first name and that page's surname.
   - **Composed when asked, never stored:** `composeReaderReport` reads both names as an operator's build does, on the FREE surface (ADR-0001, as D-051 reads the baby-names view), and returns a stored version's shape, with no id and version 0. Its coverage, index and eligibility are the assessments an operator's build freezes. Its cover and its foot then say only the date of the data. No row is written, so a reader's report is not an entitlement and cannot be fetched again by an id.
   - **The same PDF:** it goes through `toReportPreview` and §1–§2's PDF, without the sample's marks.
   - **Who gets it:** a reader with a session. Anything the page explains sends the reader back to it with the name: no session, accounts off, a name not on the lists or held for review, the free report ended.
   - **How it is sent:** an attachment named after the two names, `private, no-store`, `noindex, nofollow`.
   - **The off switch:** `FULL_REPORT_FREE=0` ends it.

## Consequences

- `apps/web` depends on `@react-pdf/renderer`. The PDF routes need the fonts in their trace (`next.config.ts`).
- The real report as a PDF for a reader (TASK-176) renders through the same component, from a report composed for that reader (§4). Each download composes the report again: two reads of the query service, the coverage, the index and the eligibility, then the render. Nothing is cached, because the file is one reader's.
- A change to the preview's words changes the PDF's too. A new chapter type needs a body in both.
