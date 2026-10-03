# TASK-081 — Surname meanings: the rest of Buryan 1933's surname chapter, and a `meanings` Register VM step

- **Status:** IMPLEMENTED 2026-10-03 on `claude/wonderful-gates-ffvsn2`; record: `docs/progress/2026-10-03-buryan-meanings.md`. **Not run on the production VM.**
- **Requested by:** the project owner, 2026-10-03: "yes, start on meanings", then, on the finding that every other candidate source is blocked and Buryan's chapter is mostly unused, "yes, go ahead with Buryan".
- **Decisions:** ADR-0008 (admissible sources, no generated meaning, the gap as a result). The source and its public-domain basis are as `sources/onomastics/buryan-1933.json` already states them.
- **Depends on:** TASK-022 (the meaning chain), TASK-041 (`extras.sh`, the first import of the file), on `main` @ `b0dd8fa`.

## 1. Goal

Every surname that ks. Józef Buryan's *Skąd pochodzi twoje imię i nazwisko…* (Warszawa 1933) assigns, in its surname chapter, to a given name, a formation or a section, and that the 2026 register holds, carries that attribution as a `SURNAME_MEANING` claim, as the first 25 already do. Then a way to load it in production.

## 2. Facts (checked 2026-10-03)

1. `main` has 25 entries; the meaning card is empty for nearly every surname.
2. The other candidate sources are blocked or unsuitable (`docs/sources/rymut-1990.md`, `candidate-sources.md` items 4, 6, 7, 11, `onomastics-open-access.md`): copyrighted without a licence, dropped (D-022), or a dictionary of words rather than surnames.
3. The ZBC scan (edition 82526) downloaded today hashes to the SHA-256 `docs/sources/bruckner-buryan-package.md` records (`91d69b0e…`). Its chapter B is printed pages 6–19 (PDF 8–21).
4. `importOnomasticSource` stores each new version of a file as a second `ACTIVE` record, and `loadInterpretations` reads every `ACTIVE` record, so a second version would give the first 25 surnames each interpretation twice.
5. The Register VM `extras` step imports the file already on the VM; it does not push the commit.

## 3. In scope

- `sources/onomastics/buryan-1933.json`: the further entries, transcribed from the page images; the original 25 kept, one quotation corrected to the print.
- The importer: a changed version of a work replaces the earlier one (`UPDATED`, `supersedes_source_record_id`), with an integration test.
- `surname-meaning.ts` takes several surnames in one process.
- `ops/vm/meanings.sh` and the `meanings` step; docs.

## 4. Out of scope

- Running the step (the owner triggers it).
- Chapters C–F (place, people, mountain and river names), Brückner 1927, any other source.
- Changing the claim, its confidence or the page.

## 5. Acceptance criteria

- **AC-1.** Every new entry's surname is in the 2026-01-20 register (male or female list) and parses with `parseOnomasticSource`.
- **AC-2.** Importing a changed version leaves one `ACTIVE` record of the work and derives from it alone (integration test).
- **AC-3.** Against a database with the full male register: import old then new file, derive every surname twice; the second pass adds no claim, no claim key is shared, one version is `ACTIVE`.
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test` and `test:integration` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm check:vm && pnpm test
TEST_DATABASE_URL=postgres://… pnpm test:integration
```
