# TASK-140 — Famous bearers for every surname, in batches

- **Status:** IMPLEMENTED 2026-10-05 on `claude/eager-gauss-c6d5tu` (`docs/progress/2026-10-05-famous-bearers-in-batches.md`).
- **Number:** 140, with ADR-0044. Written and built on 2026-10-05 as TASK-126 with ADR-0042 on `claude/eager-gauss-c6d5tu`; renumbered when it landed on 2026-10-06, because `main` holds TASK-126 (the sitemap fix, #152) and ADR-0042 (first names given to children by year, #162). The `top_rank` input on the `bearers` step was already on `main` as TASK-125 (#150); this change adds the batches and `restart_bearers`.
- **Requested by:** the project owner, 2026-10-05: "do famous people for everyone but do it quicker", after being told the load covers the 2,723 surnames ranked within 2,000 and that every surname at one query each would take 7–22 days.
- **Specification:** ADR-0044 (this task's decision, amending ADR-0030 §2.2); ADR-0030 (everything else about famous bearers).
- **Depends on:** TASK-073 (the connector and claim), TASK-077 (the Register VM step), TASK-087/099 (the archive step's `top_rank` and restart, the pattern followed).
- **Model guidance:** implementation session.

## 1. Goal

The Register VM step `bearers` can load Wikidata's famous bearers for every surname in the register in hours rather than weeks, each surname getting exactly the summary, record and claim its own queries would give.

## 2. In scope

- `packages/sources/src/wikidata/`: the batch people query (`wikidataBearersBatchQuery`: the same query over many surnames' labels, each row tagged with the label it was found under), each surname's people cut out of a batch answer (`batchBearers`), the summary built from either path (`summariseCandidates`, `wikidataDetailsById`), and the batch fetcher (`fetchWikidataBearersBatch`: `POST`, one query at a time and paced as before, a batch that runs out of time or is cut off split in two, details in groups of whole surnames of at most 200 people).
- `packages/truth/src/bearers-batch.ts`: `loadBearersInBatches` (batch size by rank: 50 within 10,000, 100 within 50,000, 400 beyond; the next batch fetched while this one is written; ten wholly failed batches in a row stop it) and `bin/bearers-load.ts` using it for a rank selection. `--surname` keeps one surname's own queries.
- `ops/vm/bearers.sh`: a third argument `restart`, as `archive.sh` has. `.github/workflows/register-vm.yml`: `top_rank` reaches the `bearers` step, validated as for `archive`; a `restart_bearers` input.
- ADR-0044; `ops/vm/README.md`.

## 3. Out of scope

- Running the load: the owner's step, and GitHub Actions does not start jobs on the account at present (billing).
- Any change to what a summary holds, the claim, the pages, the refresh window or the removal rule (ADR-0030 §2.1, §2.3–§2.8).
- The Wikidata dump, or queries run side by side.

## 4. Acceptance criteria

- **AC-1.** A batch answer gives each surname exactly the candidates its own answer gives (ZAREMBA, KOWALSKA, KOWALSKI from the pinned answers), a person found under two of a surname's labels once, a surname with nobody none; a row that does not parse fails only its surnames (unit tests).
- **AC-2.** The batch fetcher sends one `POST` for the people and one for the details, a second apart at least, with the user agent, and returns each surname's summary equal to `summariseWikidataBearers` of its own answers (unit test).
- **AC-3.** A batch out of time is split down to one surname, never asked again whole; an answer cut off is split; a service that keeps failing leaves every surname failed after three tries, without splitting; details go in groups of whole surnames of at most 200 people (unit tests).
- **AC-4.** The batched load stores and derives each surname as one surname is, leaves a failed surname for the next run, changes nothing on a second run with the same answers, and stops after ten wholly failed batches (integration and unit tests).
- **AC-5.** The workflow passes a validated `top_rank` and `restart` to `bearers.sh`; `pnpm check:vm` passes.
- **AC-6.** Against the live service, the loader's batch path and its one-surname path give identical summaries for a sample from every rank band (measured out of band).

## 5. Verification

```bash
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm check:vm
pnpm test
pnpm test:integration
```
