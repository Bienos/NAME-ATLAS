# 2026-09-30 — Family surnames view: draft task, decisions accepted, nothing built

No task file was the scope authority: the project owner asked for a draft spec, then accepted its six decisions ("accept all your proposals for U-1 to U-6"). Documentation only.

This session started on `claude/funny-bardeen-f4jbay`, cut from the stale default branch `claude/exciting-noether-05np1s` at `d6f1b6c`, far behind `main` (`AGENTS.md` §11). The draft was first written and pushed there, against that base's facts. When a pull request was requested, the branch was moved onto `origin/main` at `dd54928`. The draft was then rewritten against `main`'s code, and only this version is proposed.

## Changed

- **`tasks/drafts/family-surnames-stateless.md`** is new. It specifies a page showing the existing free result for up to 4 family surnames, in Polish and English.
  - Labels such as "mother's side" never leave the browser.
  - Each lookup is an ordinary `GET /api/v1/surname-results?surname=…` request.
  - Nothing is stored in the browser or the URL.
  - No user↔family association therefore reaches the server (`docs/canonical/19` §4, §196).
  - It is kept separate from TASK-025's comparison page, which puts slugs in the URL and compares figures.
- **Its §13 records the six decisions**, all accepted as proposed:
  - U-1: in scope as a free post-M2 feature; `PRODUCT.md` §5 gets its line with the implementation, not now.
  - U-2: a neutral prompt, never "mother's maiden name".
  - U-3: at most 4 surnames.
  - U-4: four fixed optional labels.
  - U-5: cards link to the single-surname page, with no offer on this page.
  - U-6: the residual IP/timing risk is accepted, and release is gated on a privacy sign-off.
- **English strings for U-2 and U-4** were added when moving onto `main`, where every page is bilingual. They are translations, not decisions.
- **`STATUS.md`**: the "Last rewritten" line, a "Next" entry, and the open pull request line (#26 had been merged).
- **`docs/CODEMAP.md`**: the `tasks/` row now names `tasks/drafts/`.

`PRODUCT.md`, `PLAN.md`, code, contracts, migrations and dependencies are unchanged.

## Verified

- The draft's §4 preconditions were checked by reading these files on `origin/main`, not by running anything:
  - `apps/web/src/app/api/v1/surname-results/route.ts`;
  - `apps/web/src/middleware.ts` (`API_POLICY` 30 requests per 60 s);
  - `apps/web/src/app/api/v1/events/route.ts`;
  - `apps/web/vitest.config.ts`;
  - `apps/web/src/lib/compare-view.tsx`;
  - `apps/web/src/lib/messages.ts`;
  - the headers of TASK-006, TASK-017 and TASK-025.
- `pnpm check:ids`: passed — "every task, ADR, migration and decision number is used once". The unnumbered draft does not affect it.

## Not verified

- Two preconditions are left to the implementing session's preflight, because settling them needs more than a read of the route:
  - whether the endpoint's response carries a stable public identity (slug or ID);
  - whether TASK-017's section components can render from that JSON in a client component.
- No build, test or type check was run: no code changed.
