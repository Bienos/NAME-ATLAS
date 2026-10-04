# 2026-10-04 — ADR-0035 and TASK-100: the couple report specified

Branch `claude/couple-report-decision`, rebased onto `origin/main` @ `1adde16`.

## Changed

- `docs/adr/0035-couple-report.md` (new, proposed): the couple report shows two surnames' existing validated facts side by side, with no score, percentage or figure computed from the two together. The project owner chose framing "A" in this session.
- `tasks/100-couple-report.md` (new, specified): the pages `/pl/para` and `/en/couple`, dark behind `COUPLE_REPORT_ENABLED`, `noindex`.
- `docs/DECISIONS_NEEDED.md`: D-025 §1 recorded as answered ("ok" to "confirm 'couple' replaces the current tiers", then "a, whole set" when asked whether that meant the whole set); §2–§4 left open.
- `STATUS.md`: the "Last rewritten" line, a "Next" entry for the couple report, and the D-025 line under the owner's decisions.

Numbers: the task was first numbered TASK-095, free on `origin/main` @ `d655a45`. #102 then merged as TASK-095, and open pull requests hold TASK-096 (#106), TASK-098 (#107), TASK-099 and ADR-0036 (#108), so on rebasing it became TASK-100. ADR-0035 was free on `main` @ `1adde16` and in every open pull request read from GitHub at 19:25 UTC.

## Verified

- `pnpm check:ids`: passed ("every task, ADR, migration and decision number is used once", exit 0).

## Not verified

- Whether common joined surnames (A-B) appear on the 2026 national lists in useful numbers: only the committed fixtures were read (none in the national excerpts, four hyphenated rows in the regional ones).
- No code was written, so lint, typecheck and tests were not run for this change.
