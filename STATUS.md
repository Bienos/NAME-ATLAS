# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-29, after the go-live of #9, #10, #7 and #11 (`docs/progress/2026-09-29-go-live.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `0eb4814` (Merge #11), deployment `dpl_H55YeqWUjCg34F4F3wcufMym6sM6`, created by hand with target production. The previous one, `dpl_33fKu5ryMHRuNfvnMNMgiF262uLG` (`4d605e5`), is the rollback candidate |
| Database | Supabase project `xujctkjpvnmcdpximtda` (EU), all 21 migrations applied, a seven-surname slice loaded (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). How to connect and load: `docs/LOCAL_DATABASE.md` |
| Deploys | Manual. Vercel's production branch is still the stale `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030 and 033, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
- Work ahead of `PLAN.md`'s milestone order:
  - the async runtime (TASK-020);
  - rights per asset and surface (TASK-021);
  - the meaning chain (TASK-022);
  - slugs and the sitemap (TASK-027);
  - `pnpm coverage:report`;
  - the visual system and the live deployment;
  - evidence at the foot of the page, linked to the source's website (ADR-0012, #7);
  - the landing page and the surname page redesigned for readers new to statistics (#11).
- On `main`, CI is green: run #179, on `0eb4814`.

## Next

- **TASK-034**, one section registry and one set of design tokens for the web app: chosen by the project owner on 2026-09-24 as the next cleanup. The branches it waited for were merged on 2026-09-29. It still waits for GitHub's default branch to be `main`. Its task file is written when it starts.
- **TASK-031**, the Polona source spike (`tasks/031-polona-source-spike.md`): specified 2026-09-23, not started, and needs `polona.pl` to be reachable.
- **TASK-032**, the Onomastica source spike: carried over from an unmerged branch, not approved. Read its rebase note first.

## Open pull requests and branches

No pull request is open. One unmerged branch has work in progress:

- **`claude/procent-continuation-7c2e00`** was started from the stale default branch and is 117 commits behind `main`. Its commits of 2026-09-28 and 2026-09-29 redo what `main` already has:
  - they specify and start TASK-005, which is implemented and verified on `main`;
  - they resolve D-006, which `main` resolved on 2026-09-19;
  - they add an ADR-0003 and an ADR-0004, numbers `main` gives to other decisions.

  Do not merge it.

## Blocked on the project owner

- **Default branch.** Set GitHub's default branch to `main`, and Vercel's production branch to `main`. Until then new sessions start 117 commits behind (`AGENTS.md` §11). `claude/procent-continuation-7c2e00` is one that did.
- **Branches to delete.** These are merged into `main`:
  - `claude/awesome-archimedes-t6hb55`
  - `claude/ecstatic-volta-khgeln`
  - `claude/elegant-archimedes-w5ony1`
  - `claude/fix-surname-links-and-section-rights`
  - `claude/hopeful-cannon-uc9h18`
  - `claude/inspiring-johnson-x88mbo`
  - `claude/jolly-ramanujan-din7m6`
  - `claude/kind-edison-eod395-main`
  - `claude/lucid-goodall-t2ai7d`
  - `claude/sharp-bohr-ld17v3`

  These are superseded, because their content is now on `main` (#9):
  - `claude/magical-euler-27ok85`
  - `claude/trusting-wozniak-ktn6a9`
  - `claude/relaxed-meitner-s6445i`
  - `claude/quirky-babbage-7ps0xa`
  - `claude/optimistic-pasteur-mqtblr`

  Delete `claude/exciting-noether-05np1s` once it is no longer the default branch.
- **Hosting ADR.** ADR-0011 chooses Neon, but production runs on Supabase. That needs a superseding ADR.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
- **Decisions.** None is open: every entry in `docs/DECISIONS_NEEDED.md` is resolved. D-020 was resolved as light only and shipped in #11.
