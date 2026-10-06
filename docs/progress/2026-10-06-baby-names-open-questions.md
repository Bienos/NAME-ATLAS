# 2026-10-06 — D-044 §6–8: the baby-name section's trend rule, one page and its name

Asked by the owner in a Claude Code session. Offered three proposals for the questions D-044 left open, the owner answered "go with your suggestions". There is no task file. No code, page, claim or migration changes.

## Changed

- `docs/DECISIONS_NEEDED.md`: D-044 gains §6–8.
  - Rising or falling: the latest full year against five years earlier, on the same list. More than 10% higher is rising, more than 10% lower is falling, otherwise steady.
  - The two edge cases that follow from the cut-off of 2 (from 2013): a name absent five years earlier but on the latest list is rising; a name absent from the latest list has no free figures.
  - One page with a search box, not a page per name.
  - The name "Imiona dla dziecka" / "Baby names".
  - Still open: second names, civil registry offices, the page's address.
- `PRODUCT.md` §6: the free row states the rule and the one page.
- `STATUS.md`: the baby-name line's open questions; "Last rewritten".

## Verification

- `pnpm format:check`: exit 0, "All matched files use Prettier code style!". `pnpm check:ids`: exit 0, "check-unique-ids: every task, ADR, migration and decision number is used once". Both on `origin/main` @ `5103371` (#160) with this change, and again after merging `origin/main` @ `557451d` (#162, TASK-136) in.

## Not decided

- Second names and civil registry offices.
- The page's address.
