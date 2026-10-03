# 2026-10-03 — TASK-081: the rest of Buryan 1933's surname chapter, and a `meanings` step

Scope authority: `tasks/081-buryan-meanings.md`. Decision: ADR-0008.

## What changed

- `sources/onomastics/buryan-1933.json`: 25 → 1,304 entries. The scan was downloaded from `https://www.zbc.uz.zgora.pl/Content/82526/download/` (17,117,073 bytes, SHA-256 `91d69b0eae2095f338133da6eb395a699bb35c2476bb232a60f25dcccc0ae43c`, as recorded in `docs/sources/bruckner-buryan-package.md`). PDF pages 8–21 (printed 6–19, chapter B and "Wzory nazwisk", "Nazwiska obce") were rendered at 260 dpi and every list transcribed from the images, the OCR used only as a draft (it reads, for example, "Jurewkz", "Srtachoń", "Jonsztab", "Janowie" for Jurewicz, Stachoń, Jonszta, Janowic). 127 groups, 1,515 names; 198 not in the 2026-01-20 register (male and female lists from dane.gov.pl, downloaded the same day) and 38 already present were left out, so 1,279 entries were added. Left out by rule: names Buryan marks "?", place names ("(m)", the "miejscowości:" lists), variants written only as a bracketed ending ("Owczar (ek)"), the rulers' bynames, the anecdotes (Kruk, Musiał, Wydra, Sroka) and the artificial names (Męcnerowski, Ścieżyński, Lubodziecki, Orski, Sowilski, Gwiazdowski), which he gives as particular families' changes. A surname under several headings keeps the one that names a root. Formation types follow the mapping the file already states.
- The first 25 entries are unchanged except KRÓL's quotation, which read "Od przydomków przezwiska"; the print (p. 14) reads "Od przysłów przezwiska".
- `packages/sources/src/onomastics.ts`: importing a changed version of a work marks the earlier `ACTIVE` record `UPDATED` and names it in `supersedes_source_record_id`; the outcome reports it, and `bin/import-onomastics.ts` prints it. Test: `tests/integration/src/surname-meaning.test.ts`, "replaces an earlier version of the same work".
- `packages/truth/bin/surname-meaning.ts`: several surnames in one process.
- `ops/vm/meanings.sh` (new) and the `meanings` step in `.github/workflows/register-vm.yml`: unpack, install, migrate, import, derive every surname of the file in one process, gate (no listed surname in the register without a meaning, one `ACTIVE` claim per key, one `ACTIVE` version of the work), grants; the web-role connection after it prints the `SURNAME_MEANING` count.
- `ops/vm/README.md`, `sources/onomastics/README.md`, `docs/CODEMAP.md`, `STATUS.md`, the task file.

## Coverage

Against the 2026-01-20 register, men and women counted together and ranked by count: 27 of the top 100, 191 of the top 1,000, 630 of the top 10,000 now have an entry.

## Verification (run 2026-10-03 on this branch, `main` @ `b0dd8fa` underneath)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0. `pnpm check:vm`: "11 scripts parse, and all 4 pg_dump invocations exclude the rows of schema accounts". The workflow file loads as YAML.
- `pnpm test`: exit 0 (`packages/sources` 585, `packages/truth` 375, `apps/web` 662).
- `TEST_DATABASE_URL=… pnpm test:integration` against a fresh local PostgreSQL 16 with PostGIS 3: exit 0, 33 files, 388 tests.
- `parseOnomasticSource` on the new file: PARSED, 1,304 entries.
- Rehearsal of the step's sequence against a local database with the full male resource 1148808 imported (408,182 surnames, 1 min 13 s): the `main` file imported (25 entries), then the new file ("1304 entries stored; it replaces record …, now UPDATED"), then again ("ALREADY_IMPORTED"); `surname-meaning.ts` over all 1,304 surnames in one process took 19 s: 1,299 `POSSIBLE`, 5 unresolved (PASZANDA, STENZ, NIEMCZYC, CYGONEK, WELSZAR, which are on the female list only, not loaded there). A second pass: 1,299 active claims before and after, 0 shared claim keys, the work 1 `ACTIVE` and 1 `UPDATED`.

## Not verified

- `meanings.sh` and the workflow step have not run on the VM. `shellcheck` is not installed here.
- The transcription was checked by one reader against the images; it has not been proofread by a second.
- The 25 claims already in production keep their evidence from the old record (now `UPDATED`); the read path does not filter on record status, so they stay as they are.
