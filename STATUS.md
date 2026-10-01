# STATUS.md — where Name Atlas stands

The current state on one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** "Last rewritten" names the latest change only. The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-10-01, by TASK-053: the surname journey as a sequence of screens (ADR-0022; `docs/progress/2026-10-01-surname-journey-flow.md`).

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed | `dpl_31hR9qGiPmq3zQVSbTWEK6zX1XnQ`, `main` @ `65c6254` (#51, TASK-052), READY with the alias `name-atlas-two.vercel.app`, per Vercel at about 02:55 UTC on 2026-10-01. Its pages answered on production then; the check is recorded on #51. The project is on Vercel Hobby: on 2026-09-30 its 100 deployments a day were used up, mostly by branch previews |
| Database | PostgreSQL 17 with PostGIS behind PgBouncer on the Oracle Cloud Always Free VM (Frankfurt; ADR-0017). Vercel's `DATABASE_URL` has pointed at it since 17:42 UTC on 2026-09-30. It holds the complete 2026-01-20 register (598,476 surnames; claims `CURRENT_POPULATION`, `CURRENT_RANK` and `RARITY_CONTEXT` 828,262 each, `CURRENT_DISTRIBUTION` 395,216), TERYT's places and 25 Buryan 1933 meanings (the owner's report; the meanings are live on the pages), and the fifteen earlier PESEL editions as dated snapshots that no page reads (5,713,465 values). 17 GB. Two surnames flagged mixed-script at import have no figures by design. Supabase still holds the old seven-surname slice as the rollback |
| Deploys | From `main`, automatically. The project owner set Vercel's production branch to `main` on 2026-09-30 |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030–034, 036–040, 042–045, 052 and 053, plus TASK-029, which has no task file. TASK-035 is parked and TASK-041 was stopped. Each task file's header holds its own status.
- The site's look: every page and the share card render the dusk direction in Fraunces, Instrument Sans and IBM Plex Mono, with one header, footer and world (ADR-0021, TASK-052). The site has a how-it-works page and a comparison picker.
- The journey (ADR-0022, TASK-053): a search shows an analysis screen, the surname page reads one question per screen and ends on a summary with the share card, and the landing ends on how it works and a comparison. The proposal's rarity score, "we found more" and paid report screens are not built: no claim or decision backs them.
- Ahead of `PLAN.md`'s milestone order: the async runtime (TASK-020), rights per asset and surface (TASK-021), the meaning chain (TASK-022), slugs and the sitemap (TASK-027), `pnpm coverage:report`, the visual system, evidence linked to the source's website (ADR-0012), and the landing atlas's seven plates (TASK-040, 043, 044; ADR-0018, ADR-0019).
- Local suite on `main` @ `61ffc49`, run 2026-09-30: `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` all exit 0. `test:integration` and `test:golden` were not run.
- GitHub Actions runs again: CI's `verify` job ran and passed on #51's head (run 36806913318, 02:40–02:48 UTC). From 05:53 UTC on 2026-09-30 every run had failed within seconds with no runner; the cause was not established. #28, #32, #33, #35, #36, #37, #38 and #39 were merged without a CI result.

## Next

- **Now that GitHub Actions runs again:** one `Register VM` run of `status` on `main`, to read the finalize and extras markers, the counts and the stored password's connection step from the VM.
- **Launch hygiene, TASK-046–050** (specified 2026-09-30; 046, 047, 048 and 050 implemented, 049 not started): privacy notice and terms pages (046, done: `/pl/prywatnosc`, `/en/privacy`, `/pl/regulamin`, `/en/terms`; controller Patryk Cicbowski, Iława), a published contact address and `security.txt` (047, done). The address `cihypatryk@gmail.com` is on `/pl/kontakt`, `/en/contact`, every footer and in `security.txt`, which expires on 2027-09-30 and must be renewed before then; security headers and a report-only CSP (048, done; enforcing the CSP needs a way to allow the App Router's inline scripts, nonces or hashes), an encrypted off-host database backup with one restore drill (049), and a report-a-problem link (050, done: a prefilled `mailto:`; nothing is stored on the server). Still needed from the owner: a Cloudflare R2 credential and an encryption public key (049). 049's destination (R2) and 050's channel (a prefilled email) were decided on 2026-09-30. The VM's dumps have never been restored and none is off the VM.
- **The trend feature** ("how a surname changed"): not written. The editions are loaded; the feature needs a claim type, a contract change, an ADR and a page section, and ADR-0019 §2.2 to be amended for 2019. `PRAWDA` has no 2020–2022 data point: those files print it as `True`, which no importer may map to it without the publisher's confirmation (`docs/sources/pesel-earlier-editions.md`; the load's record). There is no 2022 women's edition: resource 38772 is the 2021 data.
- **The landing atlas, further plates.** TASK-040 §6 U-3 (a method and wording for per-voivodeship leaders) and U-4 (a lookup through the resolver) need a decision.
- **The family surnames view** (`tasks/drafts/family-surnames-stateless.md`). Approved in scope by the project owner on 2026-09-30, unnumbered and unscheduled. Its §4 leaves two preconditions to confirm in preflight. Release is gated on a privacy sign-off (its §13 U-6).
- **The Polona connector task.** Not written. Blocked on D-021 items 1 and 4. TASK-031's record (`docs/sources/polona.md`) holds what the task needs.

## Open pull requests

Checked 2026-09-30, about 21:50 UTC:

- The pull request that lands TASK-041's `extras.sh` (from `claude/lucid-bardeen-ym3mzo`).
- #30 from `claude/funny-allen-vrp074`, a code-review clean-up. Reviewed on 2026-09-30 and parked (see "Blocked on the project owner", Branches).

## Blocked on the project owner

- **Branches.** A session could push but not delete on 2026-09-30 (HTTP 403 from the session's git proxy); the owner deleted 18 merged branches and more since. The remote held these on 2026-09-30 (`git ls-remote --heads`), besides `main`:
  - **Delete, nothing on them is missing from `main`** (checked on 2026-09-30 commit by commit and file by file, and their distinctive facts searched for on `main`): `claude/magical-euler-27ok85`, `claude/trusting-wozniak-ktn6a9`, `claude/relaxed-meitner-s6445i`, `claude/quirky-babbage-7ps0xa`, `claude/optimistic-pasteur-mqtblr` (all superseded by #9), `claude/kind-edison-eod395` (#8, closed), `vercel/install-and-configure-vercel-w-m59vuh` (#3, closed), `claude/laughing-mccarthy-12i9h9` (retired) and `claude/relaxed-cannon-p3grzz` (its fix is on `main`).
  - **Delete, decided with the owner's delegation:** `claude/charming-ptolemy-bld7af`, one commit adding a third-party design skill (MIT, vendored from `Leonxlnx/taste-skill` at `ce26fc2`) to `.claude/skills/`. It does not affect the site, and the project has its own visual system. Re-adding it is one commit.
  - **Keep, unique content.** Neither is on `main` or recovered: `claude/amazing-allen-zjl819` (a Fact Lab data demo and market research, 122 files, no app code) and `claude/friendly-tesla-kv125o` (twelve design directions with research notes).
  - **Keep, parked:** the branch of #30, `claude/funny-allen-vrp074`. `claude/awesome-darwin-af7l50` can be deleted once its pull request is merged. #30 is parked: its review found a four-way read fan-out against a two-connection pool, a regional import that reports every failure as a database error, and no test for either. It also rewrites the importer files that TASK-045 changed, so it needs a rebase, and it is not built on the latest `main`. `claude/inspiring-bohr-vten7x` can be deleted once its pull request is merged. `register-vm.yml`'s push trigger names `claude/eager-brown-s2u6qh`, now deleted, so only `workflow_dispatch` starts it.
- **Decisions.** Two are open.
  - **D-023**, non-blocking: should TERC ids stay under `provider_key = 'TERYT'` or move to `docs/canonical/12` §11.3's `TERYT_TERC`?
  - **D-021**, items 1 and 4: may a connector query Polona automatically and keep what it retrieves, and what is Polona's source-level rights default? It blocks only the Polona connector task.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
