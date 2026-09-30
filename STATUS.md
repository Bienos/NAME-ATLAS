# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-30, by TASK-044: the atlas's last panel becomes Plate VII, how each list changed across its editions from 2020 to 2026, and named surnames link to the search; ADR-0019 (Proposed) allows comparing editions of one list (`docs/progress/2026-09-30-landing-atlas-changes-over-time.md`). Before it, the TASK-043 go-live: #37 is merged and `main` @ `b156bd8` is deployed to production (`docs/progress/2026-09-30-landing-atlas-six-plates-go-live.md`). ADR-0018 is accepted. Before it, TASK-043 itself (`docs/progress/2026-09-30-landing-atlas-six-plates.md`). Before it, TASK-042 (in progress), merged in #35 and renumbered: on `claude/eager-brown-s2u6qh` it was TASK-040 with ADR-0015, numbers #32 had since taken. ADR-0017 moves production's database to a free Oracle Cloud VM. The register build there reached step 7 of 7; `finalize` and the cutover have not run (`docs/progress/2026-09-30-production-database-on-a-free-vm.md`). Before it, the project owner set Vercel's production branch to `main` and redeployed production from `main` @ `03d1efb` (`docs/progress/2026-09-30-vercel-production-branch-main.md`), and the TASK-040 go-live: #32 is merged and `main` @ `12fb474` is deployed to production, so the landing page shows the atlas's plates I–III (`docs/progress/2026-09-30-landing-atlas-go-live.md`). ADR-0015 is accepted.

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `b156bd8` (Merge #37, TASK-043), deployment `dpl_3Zf5iXwoTTmDfMRj6MR3RuYiPTc5`, `READY`, created 19:03 UTC on 2026-09-30 (Vercel `list_deployments`). Earlier the same day production was deployed from `b156bd8` at 17:31 (`dpl_FqLffcZJxPXho3wXQjPRoUM9EWjF`) and 17:42 (`dpl_9BZDwyLJqe7RUbF4iukc6uL4jbdE`), then **from the older `1e9fa81`** at 17:44 (`dpl_7TRC2cdHNf2NUognTgRV7N6sFQNg`), which put TASK-040's three plates back until 19:03. The account that created each is `bienos`; why `1e9fa81` was redeployed is not recorded. After a deploy, check which deployment the alias serves, not only the page |
| Database | Production's search answers for surnames outside the old seven-surname slice: on 2026-09-30, `curl` of `/?surname=` for PIĄTEK, ŻMUDA-TRZEBIATOWSKI, ŻMUDA-TRZEBIATOWSKA, POZNAŃSKI and WIŚNIEWSKA each redirected to a 200 surname page with counts (PIĄTEK 11 003 men, rank 122). So production reads a database with the full register; which one, and its connection, is TASK-042's to record. Before that: Supabase project `xujctkjpvnmcdpximtda` (EU) with a seven-surname slice (`docs/LOCAL_DATABASE.md`) |
| Deploys | From `main`, automatically. The project owner set Vercel's production branch (Settings → Environments → Production → Branch Tracking) from the stale `claude/exciting-noether-05np1s` to `main` on 2026-09-30. The merges of #36, #35 and #37 each built a production deployment on their own |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030–034, 036–040, 043 and 044, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
- Work ahead of `PLAN.md`'s milestone order:
  - the async runtime (TASK-020);
  - rights per asset and surface (TASK-021);
  - the meaning chain (TASK-022);
  - slugs and the sitemap (TASK-027);
  - `pnpm coverage:report`;
  - the visual system and the live deployment;
  - evidence at the foot of the page, linked to the source's website (ADR-0012, #7);
  - the landing page and the surname page redesigned for readers new to statistics (#11);
  - the landing atlas (TASK-040, redesigned by TASK-043, extended by TASK-044): seven plates about the two published lists. They show every surname as a dot, how few surnames half the people carry, rarity bands, endings, first letters, the surnames on both lists, and how each list changed across its editions from 2020 to 2026, per list and never summed. It names only surnames that a fixed rule selects, at 20 people or more, each linked to its search answer (ADR-0018, ADR-0019).
- On `main`, CI was green on `9ed24d7` (run #235, Merge #19).

## Next

- **The landing atlas, further plates**: ADR-0018 settles TASK-040 §6 U-1 (a floor of 20) and U-2 (no origin framing) for named selections. U-3 (a method and wording for per-voivodeship leaders) and U-4 (a lookup through the resolver) still need a decision. The named surnames on the plates can become links to the search once production's database holds the full register (TASK-042).
- **The family surnames view** (`tasks/drafts/family-surnames-stateless.md`): approved in scope by the project owner on 2026-09-30, all six of its decisions accepted. It is unnumbered and unscheduled, and takes the next free task number when scheduled. Its preconditions appear to hold on `main`; its §4 leaves two to confirm in preflight (a stable identity in the endpoint's response, and client-side rendering of the view components). Release is gated on a privacy sign-off (its §13 U-6).
- **The Polona connector task**: not written, and blocked on D-021 items 1 and 4: automated access and caching, and the source default. ADR-0014 settled items 2 and 3. TASK-031's record (`docs/sources/polona.md`) holds what the task needs. The spike reached `polona.pl` on 2026-09-29, and its terms do not address automated access.
- **TASK-042**, the complete register in production on a free Oracle Cloud VM (ADR-0017): **in progress**. The VM (2 OCPUs, 11.9 GB, Frankfurt) runs PostgreSQL 17.11, PostGIS 3.6.4 and PgBouncer 1.26.0. Port 6432 answers from the internet: as the read-only role, over TLS 1.3 through PgBouncer, a connection sees 598,476 surnames and a write is refused (`Register VM` run 36662326820). The register build started on the VM at about 02:45 UTC. At the last `status`, 04:55 UTC (run 36671020045), it was in step 7 of 7 at 118,000 of 328,455 surnames, 0 failures, the database 12 GB. No `status` has run since, so whether it finished is not known. Left: `status` until `built: yes`, then `finalize`, then Vercel's production `DATABASE_URL` and a redeploy of the current production deployment. Vercel's `DATABASE_URL` is not changed yet. It supersedes TASK-035, parked because Supabase's free plan stops at 500 MB.

## Open pull requests and branches

Checked 2026-09-30, 19:30 UTC:

- TASK-044's pull request from `claude/keen-cannon-1jc301`. It also carries the TASK-043 go-live record.
- #31 from `claude/funny-bardeen-f4jbay`, the CI trigger change, and #30 from `claude/funny-allen-vrp074`, a code-review clean-up.

#35 (TASK-042) and #37 (TASK-043) are merged.

#34, a second design for the same database under ADR-0016 and TASK-041, was closed without merging at 15:50 UTC. On `claude/keen-cannon-1jc301`, TASK-041 and ADR-0016 (the search answering for every surname from figures built at deploy time) were stopped by the project owner ("stop search i working on adding orcale data base") and reverted there, unmerged. `claude/awesome-darwin-af7l50` (TERYT and Buryan 1933 on the VM, built on TASK-042's branch) still uses TASK-041, with no pull request.

GitHub Actions has started no job since 05:53 UTC on 2026-09-30, so none has a CI result; #31 records the outage. `Register VM` run 36675514844, the `status` request created at 05:53, failed at 08:52 after 2 s with no runner assigned. TASK-040 was merged in #32 without a CI result, at the project owner's instruction, and its go-live record in #33; #28 (a STATUS rewrite) is merged; the family surnames draft was merged in #27, TASK-039 in #26 and TASK-038 in #25; #36, the record that Vercel's production branch is `main`, is merged.

## Blocked on the project owner

- **Branches to delete.** These are merged into `main`:
  - `claude/task-031-polona-spike` (#16). The session that merged it could not delete it: its git proxy answered HTTP 403.
  - `claude/procent-continuation-7c2e00` (#14, #17, #18, #19 and #20)
  - `claude/verify-task-023-025` (#21)
  - `claude/task-023-rules-amended` (#22)
  - `claude/share-card-not-derived-wording` (#24)
  - `claude/jolly-faraday-uas99n` (#25)
  - `claude/teryt-localities-import` (#26)
  - `claude/funny-bardeen-f4jbay` (#27). It also carries #28, so delete it once #28 is merged. The session that merged #27 could not delete it: the git proxy dropped the connection on both attempts.
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

  `claude/exciting-noether-05np1s` can now be deleted too: GitHub's default branch is `main` (checked through the GitHub API on 2026-09-30) and Vercel's production branch no longer names it.
- **The database VM** (TASK-042 §3). Done: the Oracle Cloud account with Frankfurt as its home region, the A1 VM at 2 OCPUs and 12 GB, TCP 6432 open on its subnet, and the GitHub secrets `VM_HOST`, `VM_SSH_KEY` and `VM_DB_WEB_PASSWORD`. Left: GitHub Actions starting jobs again (why it stopped is not established), and after `finalize`, Vercel's production `DATABASE_URL` (`ops/vm/README.md` step 5).
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
- **Decisions.** Two are open.
  - **D-023**, raised by TASK-039 and non-blocking: should TERC ids stay under `provider_key = 'TERYT'`, as they have since TASK-011, or move to `docs/canonical/12` §11.3's `TERYT_TERC`?
  - **D-021**, raised by TASK-031. Its items 1 and 4 are open: may a connector query Polona automatically and keep what it retrieves, and what is Polona's source-level rights default? Items 2 and 3 were decided by ADR-0014 on 2026-09-29. It blocks only the Polona connector task.

  Every other entry is resolved, D-022 most recently: on 2026-09-29 the project owner dropped *Onomastica* as a meaning source.
