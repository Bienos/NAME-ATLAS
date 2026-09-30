# STATUS.md — where Name Atlas stands

The current state in one page: what is live, what is next, what is blocked. **Rewrite the lines your change makes untrue; never append a log here.** The record of each change goes to `docs/progress/` (`AGENTS.md` §8). `PROGRESS.md` is the frozen log up to 2026-09-24.

**Last rewritten:** 2026-09-30, by the TASK-040 go-live: #32 is merged and `main` @ `12fb474` is deployed to production, so the landing page shows the atlas's plates I–III (`docs/progress/2026-09-30-landing-atlas-go-live.md`). ADR-0015 is accepted. Before it, TASK-040 itself (`docs/progress/2026-09-30-landing-atlas-list-facts.md`), the family surnames draft, and TASK-039, the TERYT localities import.

## Production

| | |
|---|---|
| App | Vercel project `name-atlas`, region `fra1`, alias `name-atlas-two.vercel.app` |
| Deployed commit | `main` @ `12fb474` (Merge #32, TASK-040), deployment `dpl_EqKfZrJcfQ139NcKcL1h1Ln3Xmxm`, created through the Vercel API with target production on 2026-09-30. The one it replaced, `dpl_B2D15z8i9FYbL6gqoUU2nEy9e2MC` (`main` @ `ea03941`, Merge #24), is the rollback candidate |
| Database | Supabase project `xujctkjpvnmcdpximtda` (EU), 21 of the 23 migrations applied (not `0022`, TASK-036's index, which only the derivation uses, nor `0023`, TASK-039's membership table), a seven-surname slice loaded (`PROGRESS.md`, "A seven-surname slice is loaded on the hosted database"). How to connect and load: `docs/LOCAL_DATABASE.md` |
| Deploys | Manual. Vercel's production branch is still the stale `claude/exciting-noether-05np1s`, so a merge to `main` does not deploy |

## Built

- Milestones M0–M2 are complete.
- Implemented: TASK-001–006, 008–028, 030–034 and 036–040, plus TASK-029, which had no task file. Each task file's header holds that task's own status.
- Work ahead of `PLAN.md`'s milestone order:
  - the async runtime (TASK-020);
  - rights per asset and surface (TASK-021);
  - the meaning chain (TASK-022);
  - slugs and the sitemap (TASK-027);
  - `pnpm coverage:report`;
  - the visual system and the live deployment;
  - evidence at the foot of the page, linked to the source's website (ADR-0012, #7);
  - the landing page and the surname page redesigned for readers new to statistics (#11);
  - the landing atlas, plates I–III (TASK-040): the typical surname and the typical person's surname, how many people before two share a surname, and how many surnames a crowd of 1 000 carries, per list and never summed.
- On `main`, CI was green on `9ed24d7` (run #235, Merge #19).

## Next

- **The landing atlas, plates IV–XI**: each needs a decision first, listed as U-1 to U-4 in TASK-040 §6. They are a display floor for small counts, a rule for surnames that are also nationality or sensitive words, a method and wording for per-voivodeship leaders, and a lookup that goes through the resolver.
- **The family surnames view** (`tasks/drafts/family-surnames-stateless.md`): approved in scope by the project owner on 2026-09-30, all six of its decisions accepted. It is unnumbered and unscheduled, and takes the next free task number when scheduled. Its preconditions appear to hold on `main`; its §4 leaves two to confirm in preflight (a stable identity in the endpoint's response, and client-side rendering of the view components). Release is gated on a privacy sign-off (its §13 U-6).
- **The Polona connector task**: not written, and blocked on D-021 items 1 and 4: automated access and caching, and the source default. ADR-0014 settled items 2 and 3. TASK-031's record (`docs/sources/polona.md`) holds what the task needs. The spike reached `polona.pl` on 2026-09-29, and its terms do not address automated access.
- **TASK-035**, the real register in production: **parked**. The derived register is about 16 GB, the free Supabase plan stops at 500 MB, and the project owner will not move to a paid plan. On the free plan only population fits, for a national top-N slice. Rank, rarity and the map each need their complete universe. The task's §0 lists what would unpark it; its record has the measurements.

## Open pull requests and branches

Two (checked 2026-09-30): #31 from `claude/funny-bardeen-f4jbay`, the CI trigger change, and #30 from `claude/funny-allen-vrp074`, a code-review clean-up. GitHub Actions has started no job since 05:53 UTC on 2026-09-30, so neither has a CI result; #31 records the outage. TASK-040 was merged in #32 without a CI result, at the project owner's instruction; #28 (a STATUS rewrite) is merged; the family surnames draft was merged in #27, TASK-039 in #26 and TASK-038 in #25.

## Blocked on the project owner

- **Default branch.** Set GitHub's default branch to `main`, and Vercel's production branch to `main`. Until then new sessions start far behind: 119 commits on 2026-09-29 (`AGENTS.md` §11).
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

  Delete `claude/exciting-noether-05np1s` once it is no longer the default branch.
- **Hosting ADR.** ADR-0011 chooses Neon, but production runs on Supabase. That needs a superseding ADR.
- **`PLAN.md`** no longer describes the order work is done in. It needs an update or a status column.
- **Decisions.** Two are open.
  - **D-023**, raised by TASK-039 and non-blocking: should TERC ids stay under `provider_key = 'TERYT'`, as they have since TASK-011, or move to `docs/canonical/12` §11.3's `TERYT_TERC`?
  - **D-021**, raised by TASK-031. Its items 1 and 4 are open: may a connector query Polona automatically and keep what it retrieves, and what is Polona's source-level rights default? Items 2 and 3 were decided by ADR-0014 on 2026-09-29. It blocks only the Polona connector task.

  Every other entry is resolved, D-022 most recently: on 2026-09-29 the project owner dropped *Onomastica* as a meaning source.
