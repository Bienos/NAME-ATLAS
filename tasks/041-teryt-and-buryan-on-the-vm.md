# TASK-041 — The production VM also holds TERYT and Buryan 1933

- **Status:** LOADED 2026-09-30, as the owner reported it, not as observed: the owner ran `ops/vm/extras.sh` by hand over SSH (GitHub Actions starts no job), and a later session saw Buryan's 1933 meanings served for ADAMCZYK, JANKOWSKI, KUBIAK and NOWAK. The run's own output, the TERYT counts and the second dump were not seen, so AC-3 and AC-4 stand as reported (`docs/progress/2026-09-30-teryt-and-buryan-loaded-on-the-vm.md`). The script on `main` is byte-identical to the one that ran (SHA-256 `4961e349…`). Before that, written and rehearsed (`docs/progress/2026-09-30-teryt-and-buryan-on-the-vm.md`).
- **Requested by:** the project owner, 2026-09-30: "przygotuj zadanie na TERYT i Buryana … niech tam to się ładuje wszystko, każde dane ile my tego mamy".
- **Base branch:** written on `claude/eager-brown-s2u6qh`, which carried the VM task, because `ops/vm/` and the `Register VM` workflow were not on `main` yet. They are since #35 and #41, and this lands on `main` with them.
- **Numbering:** this file and its rehearsal record call the VM task "TASK-040" and its decision "ADR-0015". On `main` they are TASK-042 and ADR-0017 (TASK-040 there is the landing atlas). They are left as written.
- **Depends on:** TASK-040 (the VM, its build and its `finalize`), TASK-038 (the source catalogue, which registers `pl_teryt`), TASK-039 (the TERYT importer and `fixtures/teryt/source-manifest.json`), TASK-022 and ADR-0008 (the onomastic import and the `SURNAME_MEANING` chain).
- **Decision:** none new. ADR-0015 (the host) and ADR-0008 (attributed meanings) already cover it.

## 1. Goal

After TASK-040's `finalize`, the VM's database also holds everything else this repository has an importer and a rights basis for: the source catalogue, the TERYT hierarchy (TERC + SIMC), and Buryan 1933's attributed meanings, with their `SURNAME_MEANING` claims derived. The PESEL register is not changed.

## 2. "Everything we have": what is loaded, and what is not

| Data | Where it goes |
|---|---|
| PESEL 2026, national and regional (4 files) | Loaded by TASK-040. Not touched here. |
| The source catalogue (TASK-038) | Here: `pnpm seed:sources`. |
| TERYT TERC + SIMC, official version | Here: `pnpm import:teryt`. 380 powiats, 2,479 gminas and 101,865 localities under the 16 voivodeships. |
| Buryan 1933, 25 surnames (`sources/onomastics/buryan-1933.json`) | Here: `pnpm import-onomastics`, then the `SURNAME_MEANING` derivation for each of its surnames. |
| PESEL national 2019–2025 | **Not loaded.** A time series needs its own claim type and comparability rules (`docs/sources/INVENTORY.md` §2), and the 2021 and 2022 female files are byte-identical. A task, not an import. |
| PESEL regional 2025 | **Not loaded.** A different snapshot (2025-02-24). No task covers a second one. |
| GeoNames, US Census, INSEE, Statbel, Morfeusz | **Not loaded.** No importer and no rights profile (`docs/sources/INVENTORY.md` §3). Morfeusz is morphology and may never be a meaning source (§4). |
| Polona, *Onomastica* | **Not loaded.** Polona is blocked on D-021. The project owner dropped *Onomastica* (D-022). |
| Brückner 1927 | **Not loaded.** No committed source file (`docs/sources/bruckner-buryan-package.md`). |

## 3. Facts that shape the work (checked 2026-09-30)

- **Order.** `finalize.sh`'s gate requires exactly four `source_records`, the four PESEL hashes. TERYT adds 106,227 and Buryan one more, so this task runs **after** `finalize`. A later re-run of `finalize.sh` then fails that one check. That is expected, and the progress record says so.
- **TERYT download.** GUS serves the files only through the "Pliki pełne" page's ASP.NET postback (`fixtures/teryt/source-manifest.json`, `acquisition`). From this task's session on 2026-09-30, a GET and a POST per file returned both zips, and their CSV members hash exactly to the manifest (`557edb28…` TERC, `316c6446…` SIMC). The VM has open egress; the session does not reach the VM.
- **TERYT import.** `pl_teryt` must be registered first. On a local database, TASK-039 measured 21 s, 104,724 places and 106,227 source records, and a re-run returned `ALREADY_IMPORTED`.
- **Meaning.** `import-onomastics` stores the work and its entries; it does not derive. `truth:derive-batch` derives population, distribution, rank and rarity, but not meaning, so `sources/onomastics/README.md`'s "derive with `pnpm truth:derive-batch --all`" does not produce a meaning. `packages/truth/bin/surname-meaning.ts` calls `deriveSurnameMeaning`, which writes the claim, and it runs once per surname.
- **Production.** The deployed app `0eb4814` reads places only through distribution values, so TERYT places change no page. It has a meaning section (TASK-022), so after TASK-040's cutover Buryan's surnames show their attributed meaning.

## 4. In scope

- `ops/vm/extras.sh`. It runs as root, refuses unless `finalize` has run and the build is not running, and is idempotent. As the build user over the Unix socket, it:
  1. downloads TERC and SIMC through the postback and verifies each CSV member's SHA-256 against the manifest;
  2. runs `seed:sources`, `import:teryt` and `import-onomastics`;
  3. derives `SURNAME_MEANING` for each Buryan surname.

  Then it runs its gate, grants the web role read access, runs `VACUUM ANALYZE` and takes a new `pg_dump` beside `finalize`'s.
- `.github/workflows/register-vm.yml`:
  - an `extras` step;
  - this task's branch in the push trigger;
  - the web-role connection check, which also runs after `extras` and counts places and meanings.
- `ops/vm/request`, `ops/vm/README.md` (the step), `docs/progress/`, and the lines of `STATUS.md` and `docs/CODEMAP.md` this makes untrue.

## 5. Out of scope

- Any change to the app, the packages, the migrations, CI or `finalize.sh`.
- TASK-040's cutover (Vercel's `DATABASE_URL`).
- Linking places to surnames, distribution values or pages.
- Every source §2 marks "not loaded".
- Correcting `sources/onomastics/README.md`. It is recorded here, and a fix belongs to a task that changes that directory.

## 6. Acceptance criteria

- **AC-1.** `shellcheck ops/vm/*.sh`, `actionlint` on the workflow, `pnpm format:check` and `pnpm check:ids` pass.
- **AC-2.** Rehearsal on Ubuntu 24.04 with PostgreSQL and PostGIS, on a database built from the committed PESEL excerpts:
  - without the finalize marker, `extras.sh` refuses and writes nothing;
  - with the marker, it completes, and its gate passes;
  - a second run completes and writes nothing new.
- **AC-3.** On the VM, the `extras` run succeeds, and its gate passes every check:
  - 2,875 TERC ids (16 voivodeships, 380 powiats, 2,479 gminas);
  - 101,865 SIMC ids;
  - 106,227 TERYT source records;
  - 16 `REGION` places;
  - every Buryan surname in the register has exactly one `ACTIVE` `SURNAME_MEANING` claim. The run reports how many of the 25 resolved, and all 25 are expected: the rehearsal's excerpts hold only 7;
  - the PESEL counts and hashes are unchanged (598,476 surnames, 828,264 national and 1,340,605 regional values);
  - no two `ACTIVE` claims share a `claim_key`;
  - the web role can read every table;
  - the dump exists.
- **AC-4.** The same run connects the way the web app does, and it sees the places and the meanings.

## 7. Verification

```
shellcheck ops/vm/*.sh && actionlint .github/workflows/register-vm.yml
pnpm format:check && pnpm check:ids
```

Then the rehearsal (AC-2), and on the VM, after TASK-040's `finalize` has passed, the `Register VM` workflow's `extras` run. Record its ID and result.
