# TASK-045 — Every published edition of the PESEL surname lists on the VM, with the pages unchanged

- **Status:** IMPLEMENTED 2026-09-30, rehearsed locally with the excerpts (AC-2) and with all fifteen full files through `scripts/import-editions.sh` (5 min 47 s, every import `surnames created 0`, the current side unchanged); the VM run (AC-3, AC-4) waits for GitHub Actions or an SSH session, as recorded in `docs/progress/2026-09-30-pesel-editions-on-the-vm.md`. Written as TASK-044 at the end of the TASK-042 cutover session, when the project owner asked for every source the project holds to be loaded ("import data you have I need all there"); renumbered when #38 took 044.
- **Requested by:** the project owner, 2026-09-30. Rulings the same evening: "no use it is is living persona" (2019 is living persons: load it) and "find correct one and start 44" (look for a genuine 2022 women's file, then build).
- **Milestone:** none in `PLAN.md`. It loads the data that "how a surname changed over the years" will read; that feature is a later task with its own claim type and page section. This task changes no page.
- **Depends on:** TASK-042 (the register on the VM), its `finalize` (the marker is required), and TASK-044 (#38), which registered the 2020–2025 national editions for the landing's Plate VII and pinned their bytes.
- **Decision:** none needed. §2 records the owner's two rulings and what the search for a 2022 women's file found.

## 1. Goal

The VM's database holds every edition of dataset 1681 the publisher lists apart from one it cannot: the 2019 national pair, the 2020–2025 national editions of both series (2022 men only), and the 2025 regional pair, fifteen resources, each its own dated snapshot under its own source record with the publisher's metadata and checksum. The four 2026 resources stay the only ones any derivation reads, so every page and API answer is exactly as before.

## 2. Facts that shape the work (checked 2026-09-30)

1. **The importer refused any resource not in the registry**, and the registry pinned only the four 2026 resources for import. #38 added descriptors for the 2020–2025 national editions but kept them out of `findPeselResource` on purpose (its §5): "no surname claim is built from an earlier edition".
2. **A derivation wrote one `CURRENT_POPULATION` claim per resource, and the page showed every one.** `authoritativeSnapshots` kept every resource's complete snapshot; `readCurrentPopulation` returned every `ACTIVE` claim. Imported as-is, a 2025 list would have put a 2025 count beside the 2026 count on every page. Rank and rarity were per source record and safe, but would have been derived for old editions for no reader.
3. **An edition lists surnames the current register no longer has.** The importer created a surname entity for every unknown string, so those would have become pages with no figure, and the register's 598,476 would have grown.
4. **Ruling R-1, 2019 is in.** The 2019 files head `nazwisko,liczba` and their descriptions say only "lista nazwisk … w rejestrze PESEL stan na 30.06.2019". The owner ruled they describe living persons with their current surname. The descriptors record that it is the owner's ruling; ADR-0019 §2.2 still keeps 2019 out of the landing's series, which amending that ADR would change.
5. **Ruling R-2, the search for a 2022 women's file.** Resource 38772 was fetched in every form the portal offers. Its CSV endpoint and CSV media file are the 2021 bytes (SHA-256 `9af26480…`); its native XLSX is a different file (`4c8eed88…`, 5,785,728 bytes against 35279's `25e5c5cc…`, 5,186,584) that parses to the same 311,240 rows, the same sum 20,263,212 and the same counts (NOWAK 102,503). There is no 2022 women's edition to load. It stays refused, as #38 recorded.
6. **The new bytes**, fetched 2026-09-30 through `api.dane.gov.pl` and pinned in the registry: 18990 (`e975ecc4…`, 3,610,164 bytes, 277,108 rows), 18989 (`c35e4477…`, 3,993,861, 297,456; a native CSV, so its official URL is the media file), 65049 (`4e258a32…`, 16,619,443, 646,100), 65090 (`9322fc8c…`, 17,891,156, 694,199).

## 3. What was built

- `packages/sources/src/registry.ts`: `PESEL_NATIONAL_MALE_2019`, `PESEL_NATIONAL_FEMALE_2019` (with `header: "nazwisko,liczba"`, `series: null`, the ruling in `coverage_notes`), `PESEL_REGIONAL_MALE_2025`, `PESEL_REGIONAL_FEMALE_2025`; `PESEL_EDITIONS`, every registered resource that is not current, in a stable order; `findPeselEdition` (current or edition; what the importers accept); `isPeselEdition` (registered, not current; what the derivations exclude). `nationalCounterpartOf` answers only for the 2026 regional pair. `PeselResourceDescriptor.header` is optional.
- `packages/sources/src/parser.ts`: the expected header is a parameter, `PESEL_HEADER` by default; the importer passes the descriptor's.
- `packages/sources/src/importer.ts`, `regional-importer.ts`: for an edition, rows whose surname is not in the current register are counted as `rowsNotInCurrentRegister`, reported (`rows not written`) and never written, and no surname entity is created. The reconciliation guards count them.
- `packages/truth/src/derive.ts`, `universe.ts`: the three snapshot loaders drop editions, so population, rank, rarity and distribution come from the current resources only.
- `packages/sources/bin/list-editions.ts` (the registry's list for shell scripts), `fetch-pesel.ts --editions`, `scripts/import-editions.sh` (fetch, verify, metadata, import; idempotent), `ops/vm/editions.sh` (unpack the pushed commit without touching the build unit, run the script as the build user, the gate, grants, `VACUUM ANALYZE`, a dump), the workflow's `editions` step, `ops/vm/finalize.sh`'s value counts restricted to the 2026 records.
- Docs: `docs/sources/pesel.md` (the editions and the rulings), `docs/LOCAL_DATABASE.md`, `ops/vm/README.md`.

## 4. Out of scope

- Any page or API change: no trend, no claim type for it, no landing change. Amending ADR-0019 for 2019 is a separate decision.
- Reporting the 38772 defect to the publisher.
- `ops/vm/extras.sh` on `claude/awesome-darwin-af7l50`: its PESEL check compares before and after within its own run, so it is unaffected; it is not on this branch.

## 5. Acceptance criteria

- **AC-1.** `pnpm typecheck`, `pnpm test`, `pnpm format:check`, `pnpm check:ids`, `shellcheck ops/vm/*.sh scripts/import-editions.sh` and `actionlint` pass.
- **AC-2.** Locally, with the 2026 excerpts imported and derived, an excerpt of the 2019 men's list and of the 2025 regional men's list, each holding one surname absent from the current register, import with `surnames created 0` and `rows not written 1`; a second `derive-batch --all --rank` and `derive-batch` leave the `ACTIVE` claim counts and the surname count unchanged; no claim cites an edition's snapshot; NOWAK keeps exactly two population claims.
- **AC-3.** On the VM, the `editions` run fetches, verifies and imports all fifteen resources, and its gate passes: one `ACTIVE` source record per edition with values, the surname count and every `ACTIVE` claim count exactly as before the run, no surname with more than two `ACTIVE` claims of one type. The dump exists.
- **AC-4.** `curl` on production for ADAMCZYK, NOWAK and BARAN before and after: the same counts, ranks, rarities and regional shares.

## 6. Verification

```
pnpm typecheck && pnpm test && pnpm format:check && pnpm check:ids
shellcheck ops/vm/*.sh scripts/import-editions.sh && actionlint .github/workflows/register-vm.yml
```

Then AC-2 on a local database, and on the VM the `Register VM` workflow's `editions` run by `workflow_dispatch` on this branch, or the same archive and script over SSH as on 2026-09-30, with its output recorded.
