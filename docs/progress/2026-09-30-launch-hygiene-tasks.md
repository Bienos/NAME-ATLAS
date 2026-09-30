# 2026-09-30 — Launch hygiene tasks specified (TASK-046–050)

## What changed

The project owner asked for "the small launch hygiene tasks: privacy and terms pages, a contact, headers, an off-host backup and a feedback channel". Five task files were written; no code changed.

- `tasks/046-privacy-and-terms-pages.md`
- `tasks/047-contact-address.md`
- `tasks/048-security-headers.md`
- `tasks/049-off-host-database-backup.md`
- `tasks/050-feedback-channel.md`
- `STATUS.md` (Next, Last rewritten), `docs/CODEMAP.md` (the `tasks/` row).

Numbers: 045 was the highest on `origin/main` @ `107ff65`; the only open pull request (#30) adds no task.

## Facts the tasks rest on, checked on `main` @ `107ff65`

- `apps/web/next.config.ts` sets no `headers()`; there is no `vercel.json`; `apps/web/src/middleware.ts` only rate-limits.
- `grep -rn mailto apps/web/src` finds nothing: no contact on any page.
- No analytics vendor: `api/v1/events` logs an allow-listed event name only.
- `ops/vm/README.md`: three dumps on the VM, none restored, none off the VM; the latest is 1.7 GB (`docs/progress/2026-09-30-pesel-editions-loaded-on-the-vm.md`).

## Verification

- `pnpm -s check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm -s exec prettier --check` on the five task files: "All matched files use Prettier code style!".
- Not run: the rest of the suite (no code changed).

## Not verified

- Whether the structured logger writes typed surnames. TASK-046 §2.3 leaves it to that task's preflight.
- Vercel's and Oracle's log retention, and backup providers' free tiers. Those tasks read them on the day.
