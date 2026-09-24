# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-24, after the stale default branch and its side branches were found (`docs/progress/2026-09-24-one-trunk.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `3ef901b` (Merge #5), deployment `dpl_69cHVVACK2x3ZBFt6M7GznQ5fnaM`, created by hand with target production |
| Not yet deployed | `main` @ `4d605e5` (Merge #6). It fixes surname pages whose slug has a Polish letter. Until it is deployed, WIŚNIEWSKA, WIŚNIEWSKI and WÓJCIK say "no surname at this address" in production |
| Database | Supabase project `xujctkjpvnmcdpximtda` (EU), all 21 migrations applied, a seven-surname slice loaded (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). How to connect and load: `docs/LOCAL_DATABASE.md` |
| Deploys | Manual. Vercel's production branch is still the stale `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028 and 030, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
- Work ahead of `PLAN.md`'s milestone order:
  - the async runtime (TASK-020);
  - rights per asset and surface (TASK-021);
  - the meaning chain (TASK-022);
  - slugs and the sitemap (TASK-027);
  - `pnpm coverage:report`;
  - the visual system and the live deployment.
- On `main`, CI is green: run #154, on `4d605e5`.

## Next

- **TASK-034**, one section registry and one set of design tokens for the web app: chosen by the project owner on 2026-09-24 as the next cleanup. It starts once #7, #10 and `claude/kind-edison-eod395-main` are merged or dropped, since all three change the result page it refactors, and once GitHub's default branch is `main`. Its task file is written when it starts.
- **TASK-031**, the Polona source spike (`tasks/031-polona-source-spike.md`): specified 2026-09-23, not started, and needs `polona.pl` to be reachable.
- **TASK-032**, the Onomastica source spike: carried over from an unmerged branch, not approved. Read its rebase note first.

## Open pull requests and branches

As of 2026-09-24 19:30 UTC. The three merge into `main` in any order without a conflict. Merged together, they pass typecheck, lint, format, unit, integration, golden and build (a local trial merge).

| | State | Next step |
|---|---|---|
| #10 TASK-033: surname links from stored slugs; each section gated on its own rights | on `main`, CI green | project owner reviews and merges it |
| #7 Evidence at the foot of the page (ADR-0012) | on `main`, CI green; also merged into the branch below | project owner reviews and merges or closes it; merging the branch below also merges it |
| `claude/kind-edison-eod395-main`: the landing page, D-020 as light only, the surname page redesigned for readers new to statistics, "figures not prepared yet" for a listed surname, the Atlas Thread search field, a test-pool teardown fix, and #7 | on `main`, 7 commits ahead, CI green on `e4bd323`, no PR yet | open a PR, or drop it |

## Blocked on the project owner

- **Default branch.** Set GitHub's default branch to `main`, and Vercel's production branch to `main`. Until then new sessions start 102 commits behind (`AGENTS.md` §11).
- **Hosting ADR.** ADR-0011 chooses Neon, but production runs on Supabase. That needs a superseding ADR.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
- **D-020** (dark mode): open on `main`, non-blocking. `claude/kind-edison-eod395-main` resolves it as light only, so this line goes when that branch merges. The other decisions in `docs/DECISIONS_NEEDED.md` are resolved.
