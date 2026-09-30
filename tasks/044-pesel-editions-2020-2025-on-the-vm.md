# TASK-044 — Every published edition of the PESEL surname lists on the VM, with the pages unchanged

- **Status:** WRITTEN 2026-09-30, not started. Written at the end of the TASK-042 cutover session, when the project owner asked for every source the project holds to be loaded ("import data you have I need all there") and the code showed that the older editions cannot simply be imported (§2).
- **Requested by:** the project owner, 2026-09-30.
- **Milestone:** none in `PLAN.md`. It prepares "how a surname changed over the years", which is a later task with its own claim type and page section; this task loads the data and keeps every page exactly as it is.
- **Depends on:** TASK-042 (the register on the VM, live since 17:45 UTC on 2026-09-30) and the `finalize` and `extras` steps that ran after it.
- **Decision:** none needed for the load itself. §2 records two rulings this task takes as defaults; the owner can overturn either before it starts.

## 1. Goal

The VM's database holds every edition of dataset 1681 that the publisher has released with the layout the importer understands: the national men's and women's lists for 2020, 2021, 2022 (men only, see §2), 2023, 2024 and 2025, and the regional pair for 2025, each as its own dated snapshot with its own source record, checksum and reference date. The 2026 edition stays the only one the pages show. Nothing a visitor sees changes.

## 2. Facts that shape the work (checked 2026-09-30)

1. **The importer refuses any resource not in the registry.** `packages/sources/bin/import-pesel.ts` looks the resource up with `findPeselResource`, and `packages/sources/src/registry.ts` pins only the four 2026 resources (`1148808`, `1148811`, `1148786`, `1148790`). Every older edition needs a `PeselResourceDescriptor` with its reference date, official URL, SHA-256, byte size and row count.
2. **The derivation writes one `CURRENT_POPULATION` claim per resource, and the page shows all of them.** `authoritativeSnapshots` in `packages/truth/src/derive.ts` groups snapshots by resource id and keeps every group; `deriveCurrentPopulation` derives a claim for each kept snapshot; `readCurrentPopulation` in `read.ts` returns every `ACTIVE` claim. Imported as-is, the 2025 lists would put a 2025 count beside the 2026 count on every surname page, and `finalize.sh`'s check "surnames with more than two ACTIVE claims of one type" would fail. Rank and rarity are computed per source record, so they would not be contaminated, but they would be derived for the old editions too, for no reader.
3. **The editions, verified from the bytes on 2026-09-24** (`docs/sources/candidate-sources.md` §2; the same table gives every SHA-256):

   | Reference date | Men: resource, rows | Women: resource, rows |
   |---|---|---|
   | 2020-01-22 | 22817, 283,221 | 22815, 299,612 |
   | 2021-02-01 / 02-02 | 28052, 298,692 | 35279, 311,240 |
   | 2022-01-27 | 36401, 322,232 | 38772: **byte-identical to 35279** |
   | 2023-01-30 / 01-31 | 44647, 363,360 | 44646, 389,365 |
   | 2024-01-19 | 54097, 379,712 | 54098, 400,764 |
   | 2025-01-22 | 63892, 395,127 | 63888, 411,012 |
   | 2025-02-24, regional | 65049, 646,100 | 65090, 694,199 |

   The 2019 pair (18990, 18989) has a different header (`nazwisko,liczba`) and its description does not say "osób żyjących".
4. **Two rulings this task takes as defaults**, each reversible by the owner before it starts:
   - **R-1: 2019 is left out** until the publisher confirms it describes the same universe (living persons, current surname). The candidate list says "treat 2019 as a separate case until clarified"; nothing here decides that.
   - **R-2: resource 38772 is left out** and its defect recorded in the registry's comments: there is no genuine 2022 women's edition. 2022 therefore has the men's list only. The defect is worth reporting to the publisher (candidate list §2, finding 2).
5. **The data files are not in the repository and not on the owner's machine in any place a session can reach.** They are fetched from `api.dane.gov.pl` by resource id, as `fetch-pesel.ts` does today, and verified against the recorded SHA-256 before import. The VM has internet egress; the candidate list confirmed the 2026 URLs still serve the pinned bytes.
6. **Storage.** Fourteen editions add about 4.5 million national rows and 1.34 million regional rows, roughly the size of the 2026 data again plus half; the VM has 118 GB free.

## 3. In scope

- `packages/sources/src/registry.ts`: descriptors for the fourteen resources in §2.3 (twelve national, two regional), with roles that carry the edition (`data_date`) and comparability groups per edition and partition, so nothing across editions is summable. `findPeselResource` finds them. A registry test pins the count and every checksum.
- `packages/truth/src/derive.ts` (and `universe.ts` where it loads candidates): only the **latest edition per role** yields `CURRENT_POPULATION`, `CURRENT_RANK`, `RARITY_CONTEXT` and `CURRENT_DISTRIBUTION`. Older editions' snapshots and values exist and are readable, and produce no claim in this task. The rule is "latest `data_date` among complete source records of the same role", written once and tested with two editions of one role in the fixtures.
- `ops/vm/editions.sh`: the VM step. As the build user over the socket: fetch and verify each resource by checksum, import it (the importer is idempotent by source record), re-run nothing for the 2026 claims, run a gate (row counts per resource from §2.3, the 2026 claims unchanged in number, no surname with more than two `ACTIVE` claims of one type), then `GRANT`, `VACUUM ANALYZE` and a dump beside the others. Runs after `extras.sh` and never touches the 2026 source records.
- `.github/workflows/register-vm.yml`: an `editions` step.
- `ops/vm/finalize.sh`'s and `extras.sh`'s "national values" and "regional values" checks: restricted to the 2026 source records, so they stay true after this task.
- `docs/sources/pesel.md`: the editions section, with R-1 and R-2.

## 4. Out of scope

- Any page or API change. No trend, no "how it changed", no claim type for it. That is the next task, which needs a contract change and an ADR.
- 2019 (R-1) and the duplicate 38772 (R-2).
- Dataset 1082 (residents per gmina), the US Census file, Brückner, the rest of Buryan: each is its own task.
- Reporting the 38772 defect to the publisher: the owner's, if they wish.

## 5. Acceptance criteria

- **AC-1.** `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm check:ids`, `shellcheck ops/vm/*.sh` and `actionlint` pass.
- **AC-2.** With two editions of one role imported into a local database from the committed fixtures, `derive-batch --all --rank` produces claims for the latest edition only, and `readCurrentPopulation` returns exactly one claim per role for a surname in both editions.
- **AC-3.** On the VM, the `editions` run fetches and verifies all fourteen resources, imports them, and its gate passes: the row counts of §2.3 per resource, the 2026 claims unchanged in number (`CURRENT_POPULATION` 828,262, `CURRENT_RANK` 828,262, `RARITY_CONTEXT` 828,262, `CURRENT_DISTRIBUTION` 395,216), and no surname with more than two `ACTIVE` claims of one type.
- **AC-4.** `curl` on production for ADAMCZYK, NOWAK and BARAN before and after the run: the same counts, ranks, rarities and regional shares. The database's `distribution_snapshots` count has grown by the fourteen resources' surnames.

## 6. Verification

```
pnpm typecheck && pnpm test && pnpm format:check && pnpm check:ids
shellcheck ops/vm/*.sh && actionlint .github/workflows/register-vm.yml
```

Then the local rehearsal (AC-2) and, on the VM, the `Register VM` workflow's `editions` run by `workflow_dispatch`, or the same script over SSH as on 2026-09-30, with its output recorded.
