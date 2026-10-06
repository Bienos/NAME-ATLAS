# 2026-10-06 — the owner's answers on first names given to children (D-044)

Asked by the owner in a Claude Code session: can parents see how many children were given a first name in each year, in a section of its own? There is no task file. No code, page, claim or migration changes.

## Changed

- `docs/DECISIONS_NEEDED.md`: D-044, resolved. The source as read today, and the owner's five answers:
  - signed-in only;
  - free with an account: the latest full year's count and rank, and whether the name is rising or falling;
  - a 5,99 zł one-time payment unlocks the full figures for every name;
  - every tier from 28,99 zł up includes it;
  - the 5,99 zł tier does not unlock the tree.
- `docs/adr/0037-five-tiers.md`: a sixth row, "baby names", 5,99 zł; the free row names the basic view; the tree unlock is held by the tiers from 28,99 zł up; the working names "Baby names" and "Imiona dla dziecka".
- `docs/adr/0032-given-names.md`: a Consequences line on dataset 219's use.
- `PRODUCT.md` §6: six tiers; the free row and the 5,99 zł tier.
- `STATUS.md`: a Next line for the section; the Decisions line's "any paid tier unlocks more"; "Last rewritten".

## Source, read on 2026-10-06

- `GET https://api.dane.gov.pl/1.4/datasets/219`: title "Imiona nadawane dzieciom w Polsce", licence CC0 1.0, update frequency "Rocznie", institution 333 (`ministerstwo-cyfryzacji`). Its note gives the cut-off: below 5 up to 2012, below 2 from 2013.
- `GET …/datasets/219/resources?per_page=100`: 84 resources. They hold one 2000–2019 first-name file (21457 CSV, 21458 XLSX), then for 2019–2025 first and second names by sex, nationally and by voivodeship. For 2024 (63936) and 2025 (1187350) there are first names by civil registry office. Half-year files run from 2019 to the first half of 2026 (2474883 first names, 2474886 second names, created 2026-08-19).
- Resource 21457's CSV (`Imiona_nadane_wPolsce_w_latach_2000-2019.csv`, SHA-256 `471d8ff99756f3030b492fb32517a70f5c8bc42675dc9fd1e19cf5f2208ca6a7`, downloaded to the session's scratchpad, not to the repository):
  - header `Rok,Imię,Liczba,Płeć`; 24,461 rows; years 2000–2019; `Płeć` `K` 12,352 rows, `M` 12,109;
  - the smallest count is 5 in each year 2000–2012 and 2 in each year 2013–2019;
  - examples: ZOFIA 916 (2000), 5,258 (2010), 7,737 (2019); ANTONI 327, 4,137, 8,550; JULIA 10,074, 15,445, 8,189; JAKUB 14,497, 13,764, 7,966. NIKOLA has two rows in 2019: 1,814 girls (`K`) and 2 boys (`M`).
- The 2020–2025 and half-year files were listed, not downloaded or read.

## Verification

- `pnpm format:check` (Prettier 3.9.8 after `pnpm install --frozen-lockfile`): exit 0, "All matched files use Prettier code style!".
- `pnpm check:ids`: exit 0, "check-unique-ids: every task, ADR, migration and decision number is used once".
- D-044 was checked against `origin/main` @ `b7168fb` and the open pull requests #150, #151 and #155, then again after rebasing onto `origin/main` @ `0940c08` (#156, TASK-129) and against #157, and once more onto `2f296ff` (#157, TASK-130). None of them uses D-044. Each rebase conflicted only on `STATUS.md`'s "Last rewritten", which now names this change. Both checks above were run again on the rebased tree, with the same results.
- Not run: the unit, integration and golden suites and the build. This change touches no code.

## Not decided

- The rule for "rising or falling".
- One page with a search box, or a page per name (`PRODUCT.md` §8, non-goal 14).
- Second names and civil registry offices.
- The section's name and address.
