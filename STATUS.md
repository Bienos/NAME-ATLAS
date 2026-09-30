# STATUS.md — where Name Atlas stands

The current state on one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** "Last rewritten" names the latest change only. The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-30, by TASK-045's load of the earlier PESEL editions into production's database (`docs/progress/2026-09-30-pesel-editions-loaded-on-the-vm.md`). Before it, the recovery of `claude/peaceful-planck-u659j1`'s source records and the branch review.

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed | The landing page shows Plate VII, "Zmiany w czasie", which only TASK-044 adds (#38, `main` @ `61ffc49`). Checked by `curl` at about 20:30 UTC on 2026-09-30. The deployment id was not read |
| Database | PostgreSQL 17 with PostGIS behind PgBouncer on the Oracle Cloud Always Free VM (Frankfurt; ADR-0017). Vercel's `DATABASE_URL` has pointed at it since 17:42 UTC on 2026-09-30. It holds the complete 2026-01-20 register (598,476 surnames; claims `CURRENT_POPULATION`, `CURRENT_RANK` and `RARITY_CONTEXT` 828,262 each, `CURRENT_DISTRIBUTION` 395,216), TERYT's places and 25 Buryan 1933 meanings (the owner's report; the meanings are live on the pages), and the fifteen earlier PESEL editions as dated snapshots that no page reads (5,713,465 values). 17 GB. Two surnames flagged mixed-script at import have no figures by design. Supabase still holds the old seven-surname slice as the rollback. The records are on the unmerged branch `claude/inspiring-bohr-vten7x` |
| Deploys | From `main`, automatically. The project owner set Vercel's production branch to `main` on 2026-09-30 |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030–034, 036–040 and 042–045, plus TASK-029, which has no task file. TASK-035 is parked and TASK-041 was stopped. The code of TASK-042's scripts and TASK-045 is on the unmerged branch `claude/inspiring-bohr-vten7x`. Each task file's header holds its own status.
- Ahead of `PLAN.md`'s milestone order: the async runtime (TASK-020), rights per asset and surface (TASK-021), the meaning chain (TASK-022), slugs and the sitemap (TASK-027), `pnpm coverage:report`, the visual system, evidence linked to the source's website (ADR-0012), and the landing atlas's seven plates (TASK-040, 043, 044; ADR-0018, ADR-0019).
- Local suite on `main` @ `61ffc49`, run 2026-09-30: `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` all exit 0. `test:integration` and `test:golden` were not run.

## Next

- **Land `claude/inspiring-bohr-vten7x`.** No pull request. It holds TASK-042's finalize and cutover records and the VM script fixes, TASK-045 (the registry's fifteen editions, the importers' edition rule, `scripts/import-editions.sh`, `ops/vm/editions.sh` and the workflow's `editions` step) and the records of the three VM runs the owner made over SSH. `claude/awesome-darwin-af7l50` (`ops/vm/extras.sh`, which loaded TERYT and Buryan 1933) is unmerged too and reuses the number TASK-041.
- **When GitHub Actions works again (the owner expects it on 2026-10-01):** one `Register VM` run of `status` on `main`, to read the finalize and extras markers, the counts and the stored password's connection step from the VM.
- **The trend feature** ("how a surname changed"): not written. The editions are loaded; the feature needs a claim type, a contract change, an ADR and a page section, and ADR-0019 §2.2 to be amended for 2019. `PRAWDA` has no 2020–2022 data point: those files print it as `True`, which no importer may map to it without the publisher's confirmation (`docs/sources/pesel-earlier-editions.md`; the load's record). There is no 2022 women's edition: resource 38772 is the 2021 data.
- **The landing atlas, further plates.** TASK-040 §6 U-3 (a method and wording for per-voivodeship leaders) and U-4 (a lookup through the resolver) need a decision.
- **The family surnames view** (`tasks/drafts/family-surnames-stateless.md`). Approved in scope by the project owner on 2026-09-30, unnumbered and unscheduled. Its §4 leaves two preconditions to confirm in preflight. Release is gated on a privacy sign-off (its §13 U-6).
- **The Polona connector task.** Not written. Blocked on D-021 items 1 and 4. TASK-031's record (`docs/sources/polona.md`) holds what the task needs.

## Open pull requests

Checked 2026-09-30, about 21:10 UTC:

- #30 from `claude/funny-allen-vrp074`, a code-review clean-up of about 35 files in the importer and the truth package. It merges into `main` without conflicts. Its diff has not been reviewed.
- The pull request for this recovery.

## Blocked on the project owner

- **GitHub Actions runs no jobs.** Since 05:53 UTC on 2026-09-30 every run fails within seconds, with no runner and no log. The last seen was CI run #400 on `main` at 19:24 UTC. A `Register VM` dispatch at 20:37 UTC failed the same way (run 36773910954). The cause is not established. Check Settings → Billing and plans → Actions usage. GitHub Free's 2,000 minutes a month are shared by all of the account's private repositories, and #31 estimated this repository's use at about 1,780 by 2026-09-30. #28, #32, #33, #35, #36, #37, #38 and #39 were merged without a CI result.
- **Branches.** A session could push but not delete on 2026-09-30 (HTTP 403 from the session's git proxy); the owner deleted 18 merged branches and more since. The remote held these on 2026-09-30 (`git ls-remote --heads`), besides `main`:
  - **Delete, nothing on them is missing from `main`** (earlier surveys): `claude/magical-euler-27ok85`, `claude/trusting-wozniak-ktn6a9`, `claude/relaxed-meitner-s6445i`, `claude/quirky-babbage-7ps0xa`, `claude/optimistic-pasteur-mqtblr` (all superseded by #9), `claude/kind-edison-eod395` (#8, closed), `vercel/install-and-configure-vercel-w-m59vuh` (#3, closed), `claude/laughing-mccarthy-12i9h9` (retired) and `claude/relaxed-cannon-p3grzz` (its fix is on `main`).
  - **Delete unless wanted:** `claude/charming-ptolemy-bld7af`, one commit adding a third-party design skill (MIT) to `.claude/skills/`. It does not affect the site.
  - **Keep, unique content.** Neither is on `main` or recovered: `claude/amazing-allen-zjl819` (a Fact Lab data demo and market research, 122 files, no app code) and `claude/friendly-tesla-kv125o` (twelve design directions with research notes).
  - **Keep, unmerged work in use.** `claude/inspiring-bohr-vten7x` (see Next), `claude/awesome-darwin-af7l50` (`ops/vm/extras.sh`, which loaded TERYT and Buryan 1933 into production's database; it reuses the number TASK-041, free on `main`) and the branch of #30, `claude/funny-allen-vrp074`. The first two conflict with `main` in `STATUS.md`. `register-vm.yml`'s push trigger names `claude/eager-brown-s2u6qh`, now deleted, so only `workflow_dispatch` starts it.
- **Decisions.** Two are open.
  - **D-023**, non-blocking: should TERC ids stay under `provider_key = 'TERYT'` or move to `docs/canonical/12` §11.3's `TERYT_TERC`?
  - **D-021**, items 1 and 4: may a connector query Polona automatically and keep what it retrieves, and what is Polona's source-level rights default? It blocks only the Polona connector task.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
