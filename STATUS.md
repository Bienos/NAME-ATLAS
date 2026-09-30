# STATUS.md — where Name Atlas stands

The current state on one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** "Last rewritten" names the latest change only. The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-30, by the repository clean-up: this page cut back to the current state, two process rules in `AGENTS.md`, and CI on a push to `main` only (`docs/progress/2026-09-30-repository-cleanup.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed | The landing page shows Plate VII, "Zmiany w czasie", which only TASK-044 adds (#38, `main` @ `61ffc49`). Checked by `curl` at about 20:30 UTC on 2026-09-30. The deployment id was not read |
| Database | The search answers for the full register: `curl` of ADAMCZYK's result returned 22,435 men, and PIĄTEK redirected to its surname page (2026-09-30). The record that Vercel's `DATABASE_URL` has pointed at the Oracle Cloud VM since 17:42 UTC is on the unmerged branch `claude/inspiring-bohr-vten7x` |
| Deploys | From `main`, automatically. The project owner set Vercel's production branch to `main` on 2026-09-30 |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030–034, 036–040, 043 and 044, plus TASK-029, which has no task file. TASK-042 is in progress, TASK-035 is parked and TASK-041 was stopped. Each task file's header holds its own status.
- Ahead of `PLAN.md`'s milestone order: the async runtime (TASK-020), rights per asset and surface (TASK-021), the meaning chain (TASK-022), slugs and the sitemap (TASK-027), `pnpm coverage:report`, the visual system, evidence linked to the source's website (ADR-0012), and the landing atlas's seven plates (TASK-040, 043, 044; ADR-0018, ADR-0019).
- Local suite on `main` @ `61ffc49`, run 2026-09-30: `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` all exit 0. `test:integration` and `test:golden` were not run.

## Next

- **Land TASK-042 and TASK-045.** `claude/inspiring-bohr-vten7x` has no pull request. It holds TASK-042's finalize and cutover records, the VM script fixes, and TASK-045 (every published PESEL edition on the VM). According to its records, production's database also holds TERYT and Buryan 1933, loaded by `ops/vm/extras.sh` from the unmerged `claude/awesome-darwin-af7l50`.
- **The landing atlas, further plates.** TASK-040 §6 U-3 (a method and wording for per-voivodeship leaders) and U-4 (a lookup through the resolver) need a decision.
- **The family surnames view** (`tasks/drafts/family-surnames-stateless.md`). Approved in scope by the project owner on 2026-09-30, unnumbered and unscheduled. Its §4 leaves two preconditions to confirm in preflight. Release is gated on a privacy sign-off (its §13 U-6).
- **The Polona connector task.** Not written. Blocked on D-021 items 1 and 4. TASK-031's record (`docs/sources/polona.md`) holds what the task needs.

## Open pull requests

Checked 2026-09-30, 20:30 UTC:

- #31 from `claude/funny-bardeen-f4jbay`, the CI trigger change. This clean-up carries the same `ci.yml` change, so #31 can be closed once this merges.
- #30 from `claude/funny-allen-vrp074`, a code-review clean-up.

## Blocked on the project owner

- **GitHub Actions runs no jobs.** Since 05:53 UTC on 2026-09-30 every run fails within seconds, with no runner and no log. The last seen was CI run #400 on `main` at 19:24 UTC. The cause is not established. Check Settings → Billing and plans → Actions usage. GitHub Free's 2,000 minutes a month are shared by all of the account's private repositories, and #31 estimated this repository's use at about 1,780 by 2026-09-30. #28, #32, #33, #35, #36, #37 and #38 were merged without a CI result.
- **Branches to delete.** This clean-up's attempt to delete one was refused by the session's permission system on 2026-09-30.
  - Merged into `main` (checked with `git merge-base --is-ancestor` on 2026-09-30):
    `claude/awesome-archimedes-t6hb55`, `claude/cache-rarity-denominator`, `claude/eager-brown-s2u6qh`, `claude/ecstatic-volta-khgeln`, `claude/elegant-archimedes-w5ony1`, `claude/elegant-hawking-lw5adp`, `claude/exciting-noether-05np1s`, `claude/fix-surname-links-and-section-rights`, `claude/hopeful-cannon-uc9h18`, `claude/intelligent-wozniak-33ilmb`, `claude/keen-cannon-1jc301`, `claude/kind-edison-eod395-main`, `claude/lucid-goodall-t2ai7d`, `claude/serene-gauss-6inrf3`, `claude/serene-gauss-6inrf3-db-codegen-schema`, `claude/task-031-polona-spike`, `claude/verify-task-023-025`.
  - Not merged, but an earlier STATUS found nothing on them missing from `main`: `claude/magical-euler-27ok85`, `claude/trusting-wozniak-ktn6a9`, `claude/relaxed-meitner-s6445i`, `claude/quirky-babbage-7ps0xa`, `claude/optimistic-pasteur-mqtblr` (all superseded by #9); `claude/kind-edison-eod395` (#8, closed); `vercel/install-and-configure-vercel-w-m59vuh` (#3, closed); `claude/laughing-mccarthy-12i9h9` (retired); `claude/relaxed-cannon-p3grzz` (its fix is on `main`).
  - Not merged and not yet reviewed. Look before deleting:
    - `claude/oracle-postgres-hosting` (#34, closed) and `claude/trusting-ride-sfsclw` (#35's branch, one record commit after the merge).
    - `claude/amazing-allen-zjl819` (16 commits, a bilingual "Fact Lab" demo, 2026-09-29).
    - `claude/clever-ramanujan-xpbuwd` (11 commits, TASK-007 RARITY_CONTEXT and D-007).
    - `claude/friendly-tesla-kv125o` (9 commits, a design exploration).
    - `claude/sharp-bohr-ld17v3` (9 commits, an early TASK-006 API, 2026-09-19).
    - `claude/inspiring-johnson-x88mbo`, `claude/optimistic-thompson-gy5uoc` and `claude/peaceful-planck-u659j1` (3 commits each: TASK-004 decisions, TASK-005 decisions, an onomastics licence check).
    - `claude/charming-ptolemy-bld7af` (1 commit, a Claude skill).
  - Keep for now: `claude/inspiring-bohr-vten7x` and `claude/awesome-darwin-af7l50` (see Next), and the branches of #30 and #31.
- **Decisions.** Two are open.
  - **D-023**, non-blocking: should TERC ids stay under `provider_key = 'TERYT'` or move to `docs/canonical/12` §11.3's `TERYT_TERC`?
  - **D-021**, items 1 and 4: may a connector query Polona automatically and keep what it retrieves, and what is Polona's source-level rights default? It blocks only the Polona connector task.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
