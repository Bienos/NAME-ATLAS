# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-29, by TASK-031, the Polona source spike (`docs/progress/2026-09-29-polona-source-spike.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `0eb4814` (Merge #11), deployment `dpl_H55YeqWUjCg34F4F3wcufMym6sM6`, created by hand with target production. The previous one, `dpl_33fKu5ryMHRuNfvnMNMgiF262uLG` (`4d605e5`), is the rollback candidate |
| Database | Supabase project `xujctkjpvnmcdpximtda` (EU), all 21 migrations applied, a seven-surname slice loaded (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). How to connect and load: `docs/LOCAL_DATABASE.md` |
| Deploys | Manual. Vercel's production branch is still the stale `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030, 031 and 033, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
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

- **TASK-034**, one section registry and one set of design tokens for the web app: implemented, in pull request #14.
- **The Polona connector task**: not written, and blocked on D-021. TASK-031's record (`docs/sources/polona.md`) holds what it needs. The spike reached `polona.pl` on 2026-09-29, and its terms do not address automated access.
- **TASK-032**, the Onomastica source spike: carried over from an unmerged branch, not approved. Read its rebase note first.

## Open pull requests and branches

Four pull requests are open (checked 2026-09-29), each on its own branch from `main` @ `83d38c2`:

- **#13**, TASK-036: batch derivation fast enough for the real register (`claude/cache-rarity-denominator`).
- **#14**, TASK-034: the section registry and design tokens (`claude/procent-continuation-7c2e00`). That branch was reset onto `main` on 2026-09-29, so its earlier commits, which redid TASK-005, are gone from it.
- **#15**, TASK-035: load the real PESEL register into production (`claude/jolly-ramanujan-din7m6`).
- **TASK-031's**, the Polona source spike (`claude/task-031-polona-spike`).

#14 and TASK-031's both rewrite lines of this file. Whichever merges second resolves the conflict.

## Blocked on the project owner

- **Default branch.** Set GitHub's default branch to `main`, and Vercel's production branch to `main`. Until then new sessions start 117 commits behind (`AGENTS.md` §11). `claude/procent-continuation-7c2e00` is one that did.
- **Branches to delete.** These are merged into `main`:
  - `claude/awesome-archimedes-t6hb55`
  - `claude/ecstatic-volta-khgeln`
  - `claude/elegant-archimedes-w5ony1`
  - `claude/fix-surname-links-and-section-rights`
  - `claude/hopeful-cannon-uc9h18`
  - `claude/inspiring-johnson-x88mbo`
  - `claude/jolly-ramanujan-din7m6`: not now, because it carries the open #15 (TASK-035)
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
- **Decisions.** One is open: **D-021**, raised by TASK-031. It asks whether a connector may query Polona automatically and keep what it retrieves, and it raises three places where Polona's rights values do not fit ADR-0007. It blocks only the Polona connector task. Every other entry is resolved.
