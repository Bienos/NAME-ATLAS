# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-29, by TASK-031, the Polona source spike (`docs/progress/2026-09-29-polona-source-spike.md`). It merges after TASK-034 (#14, `docs/progress/2026-09-29-web-section-registry-and-design-tokens.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `0eb4814` (Merge #11), deployment `dpl_H55YeqWUjCg34F4F3wcufMym6sM6`, created by hand with target production. The previous one, `dpl_33fKu5ryMHRuNfvnMNMgiF262uLG` (`4d605e5`), is the rollback candidate |
| Database | Supabase project `xujctkjpvnmcdpximtda` (EU), all 21 migrations applied, a seven-surname slice loaded (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). How to connect and load: `docs/LOCAL_DATABASE.md` |
| Deploys | Manual. Vercel's production branch is still the stale `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030, 031, 033 and 034, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
- Work ahead of `PLAN.md`'s milestone order:
  - the async runtime (TASK-020);
  - rights per asset and surface (TASK-021);
  - the meaning chain (TASK-022);
  - slugs and the sitemap (TASK-027);
  - `pnpm coverage:report`;
  - the visual system and the live deployment;
  - evidence at the foot of the page, linked to the source's website (ADR-0012, #7);
  - the landing page and the surname page redesigned for readers new to statistics (#11).
- On `main`, CI was green on `83d38c2` (run #183, Merge #12). Each pull request merged since was green on its own head before it merged.

## Next

- **The Polona connector task**: not written, and blocked on D-021. TASK-031's record (`docs/sources/polona.md`) holds what it needs. The spike reached `polona.pl` on 2026-09-29, and its terms do not address automated access.
- **TASK-032**, the Onomastica source spike: carried over from an unmerged branch, not approved. Read its rebase note first.

## Open pull requests and branches

Two pull requests are open (checked 2026-09-29), each from another session and each on its own branch from `main` @ `83d38c2`:

- **#13**, TASK-036: batch derivation fast enough for the real register (`claude/cache-rarity-denominator`).
- **#15**, TASK-035: load the real PESEL register into production (`claude/jolly-ramanujan-din7m6`). It depends on #13.

## Blocked on the project owner

- **Default branch.** Set GitHub's default branch to `main`, and Vercel's production branch to `main`. Until then new sessions start far behind: 119 commits on 2026-09-29 (`AGENTS.md` §11).
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

  These were surveyed on 2026-09-29, and nothing on them is missing from `main`:
  - `claude/kind-edison-eod395`: #8, closed. Its useful parts shipped in #11, and its ẞ/SS finding was fixed by ADR-0005.
  - `vercel/install-and-configure-vercel-w-m59vuh`: #3, closed. Vercel Analytics would send surname URLs to a vendor.
  - `claude/laughing-mccarthy-12i9h9`: a parallel TASK-004/005 line, retired by the project owner. The two ideas its note names exist on `main` in its own form: TASK-009's completeness gate, and confidence taking no rights input.
  - `claude/serene-gauss-6inrf3`: the stale default branch's own commit.
  - `claude/serene-gauss-6inrf3-db-codegen-schema` and `claude/relaxed-cannon-p3grzz`: the generated-types fix, which is on `main`.

  Delete `claude/exciting-noether-05np1s` once it is no longer the default branch.
- **Hosting ADR.** ADR-0011 chooses Neon, but production runs on Supabase. That needs a superseding ADR.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
- **Decisions.** One is open: **D-021**, raised by TASK-031. It asks whether a connector may query Polona automatically and keep what it retrieves, and it raises three places where Polona's rights values do not fit ADR-0007. It blocks only the Polona connector task. Every other entry is resolved.
