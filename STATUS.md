# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-30, by TASK-040 (in progress): ADR-0015 moves production's database to a free Oracle Cloud VM. The scripts and the workflow that build it are written and rehearsed, and the workflow's `check` step has reached the VM (`docs/progress/2026-09-30-production-database-on-a-free-vm.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `0eb4814` (Merge #11), deployment `dpl_H55YeqWUjCg34F4F3wcufMym6sM6`, created by hand with target production. The previous one, `dpl_33fKu5ryMHRuNfvnMNMgiF262uLG` (`4d605e5`), is the rollback candidate |
| Database | Supabase project `xujctkjpvnmcdpximtda` (EU), 21 of the 23 migrations applied (not `0022`, TASK-036's index, which only the derivation uses, nor `0023`, TASK-039's membership table), a seven-surname slice loaded (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). How to connect and load: `docs/LOCAL_DATABASE.md` |
| Deploys | Manual. Vercel's production branch is still the stale `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030–034 and 036–039, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
- Work ahead of `PLAN.md`'s milestone order:
  - the async runtime (TASK-020);
  - rights per asset and surface (TASK-021);
  - the meaning chain (TASK-022);
  - slugs and the sitemap (TASK-027);
  - `pnpm coverage:report`;
  - the visual system and the live deployment;
  - evidence at the foot of the page, linked to the source's website (ADR-0012, #7);
  - the landing page and the surname page redesigned for readers new to statistics (#11).
- On `main`, CI was green on `9ed24d7` (run #235, Merge #19).

## Next

- **The Polona connector task**: not written, and blocked on D-021 items 1 and 4: automated access and caching, and the source default. ADR-0014 settled items 2 and 3. TASK-031's record (`docs/sources/polona.md`) holds what the task needs. The spike reached `polona.pl` on 2026-09-29, and its terms do not address automated access.
- **TASK-040**, the complete register in production on a free Oracle Cloud VM (ADR-0015): **in progress**. The scripts (`ops/vm/`) and the `Register VM` workflow are written and rehearsed on Ubuntu 24.04 x86_64: provisioning, the full imports and the web app through PgBouncer. On the VM, only the workflow's `check` step has run (`Register VM` run 36658375900): SSH works, and the host key is pinned. The VM was 1 OCPU and 5.9 GB, and after the owner's resize it reports 5 OCPUs and 50 GB (run 36659258532): more than Always Free's 2 and 12 GB, so it must be set to exactly 2 and 12. `provision` refuses any other size. Then the port and the third secret. It supersedes TASK-035, parked because Supabase's free plan stops at 500 MB.

## Open pull requests and branches

`claude/eager-brown-s2u6qh` carries TASK-040 and this rewrite. Its pull request is not opened yet. TASK-039 was merged in #26 (checked 2026-09-30).

## Blocked on the project owner

- **Default branch.** Set GitHub's default branch to `main`, and Vercel's production branch to `main`. Until then new sessions start far behind: 119 commits on 2026-09-29 (`AGENTS.md` §11).
- **Branches to delete.** These are merged into `main`:
  - `claude/task-031-polona-spike` (#16). The session that merged it could not delete it: its git proxy answered HTTP 403.
  - `claude/procent-continuation-7c2e00` (#14, #17, #18, #19 and #20)
  - `claude/verify-task-023-025` (#21)
  - `claude/task-023-rules-amended` (#22)
  - `claude/share-card-not-derived-wording` (#24)
  - `claude/jolly-faraday-uas99n` (#25)
  - `claude/awesome-archimedes-t6hb55`
  - `claude/ecstatic-volta-khgeln`
  - `claude/elegant-archimedes-w5ony1`
  - `claude/fix-surname-links-and-section-rights`
  - `claude/hopeful-cannon-uc9h18`
  - `claude/inspiring-johnson-x88mbo`
  - `claude/cache-rarity-denominator` (#13, TASK-036)
  - `claude/jolly-ramanujan-din7m6` (#15, TASK-035 parked)
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
- **The database VM** (TASK-040 §3): an Oracle Cloud account with Frankfurt as its home region, the A1 VM, TCP 6432 open on its subnet, and the GitHub secrets `VM_HOST`, `VM_SSH_KEY` and `VM_DB_WEB_PASSWORD`. After the build, Vercel's production `DATABASE_URL`. `ops/vm/README.md` gives each step.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
- **Decisions.** Two are open.
  - **D-023**, raised by TASK-039 and non-blocking: should TERC ids stay under `provider_key = 'TERYT'`, as they have since TASK-011, or move to `docs/canonical/12` §11.3's `TERYT_TERC`?
  - **D-021**, raised by TASK-031. Its items 1 and 4 are open: may a connector query Polona automatically and keep what it retrieves, and what is Polona's source-level rights default? Items 2 and 3 were decided by ADR-0014 on 2026-09-29. It blocks only the Polona connector task.

  Every other entry is resolved, D-022 most recently: on 2026-09-29 the project owner dropped *Onomastica* as a meaning source.
