# TASK-159 — The first name as given to children, in the full-name report

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-births-in-full-name-report.md`). Nothing is built on production or sold.
- **Number:** 159. `main` holds TASK-154 (#186) and TASK-157 (#188); the open pull requests hold TASK-155 (#185), TASK-156 (#187) and TASK-158 (#189). This was built as TASK-155 until #185 took that number. This change adds no migration.
- **Requested by:** the project owner, 2026-10-07. Shown mockups of the paid report and asked for this step first ("tak, zrób to zadanie"): add "imię u dzieci" to the report; the PDF export comes after it.
- **Decision:** D-044 as ADR-0037 records it (amended 2026-10-06): every tier from 28,99 zł up holds the baby-names figures. The full-name report is in the 28,99 zł tier (D-043). Format: ADR-0041, amended here.
- **Model guidance:** implementation session.

## 1. Goal

The full-name report's first-name chapter also shows how many children were given the name as their first name, every year from 2000, boys and girls apart, with its rank among that year's names and the latest trend. The figures are the name's `GIVEN_NAME_BIRTH_*` claims (TASK-137, TASK-139), read on the PAID surface by `readBirthNameFacts` (TASK-141, TASK-151) and frozen into the version.

## 2. In scope

- **`full_name_report@2`:** the first name's facts gain `births`, the reader's result with every year's history. A version frozen under `@0` or `@1` reads as having none, and its page shows no such part.
- **Sections:** the birth claims the chapter shows are SUPPORT claims of `GIVEN_NAME`; one not shown is a LIMITATION. The chapter's body says, per sex, the latest year, how many years the name is on a list, and the trend's direction. LIMITATIONS names the births when the name is on no list or the rights forbid it.
- **Bibliography:** each list file once. Each birth claim has its own citation row, so the count's and the rank's citations of one list would otherwise be two entries per year. Another citation of the same publication takes the listed one's number.
- **The parser** checks the frozen figures field by field. It refuses:
  - a figure with no list, or on a list of another year or sex;
  - an unknown direction;
  - a trend with no citation;
  - figures of another name.
- **The preview** (`report-view.tsx`): after the lists' table, "Imię nadawane dzieciom" / "Given to children".
  - Each sex gets a table of year, children and rank, oldest first.
  - A year off a list reads as below that list's cut-off, never 0. A year with no stored list says so.
  - A sex whose stored lists never had the name gets one line.
  - The trend gives the two shares the claim states and the rule's threshold in words. The claim's `change_percent` is that threshold, not a change.
- **Docs:** this file, ADR-0041's amendment, the progress record, `STATUS.md`.

## 3. Out of scope

- The PDF export and the report's new design: the next task.
- Voivodeships, half-years, second names and comparing names (D-044's paid view holds them; the report does not yet).
- Building a report on production; selling it; the offer page.

## 4. Acceptance criteria

- **AC-1:** a full-name report built after the birth claims are derived freezes them. Built on the committed full 2020 and 2025 lists, JAN has boys' counts 7,658 (2020) and 5,054 (2025), each with its rank and a trend 2025 against 2020. Every active birth claim of the name is a SUPPORT claim of the chapter.
- **AC-2:** the bibliography lists the 2020 and 2025 boys' files once each.
- **AC-3:** a name on no birth list gets the gap `BIRTHS NOT_ON_ANY_LIST`. A version frozen under `@1` renders with no births part.
- **AC-4:** the preview shows each year, a year without a list, a year below the cut-off, the girls' never-listed line and the trend's shares. A payload whose births do not check is refused.

## 5. Verification

`pnpm format:check`, `lint`, `typecheck`, `check:ids`, `test` (against an empty database, as on GitHub), `test:integration`, `test:golden`, `build`. Then on a local database with the full 2026-01-20 first-name lists and the full 2020 and 2025 birth lists:

1. build PIOTR NOWAK;
2. read the preview under `next start` in both languages, at 1440 and 390 px.
