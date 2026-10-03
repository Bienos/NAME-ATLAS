# TASK-083 — Surname meanings: the surnames Buryan 1933 names in chapters C–F

- **Status:** IMPLEMENTED 2026-10-03 on `claude/wonderful-gates-ffvsn2`; record: `docs/progress/2026-10-03-buryan-chapters-c-f.md`. **Not loaded in production** (the Register VM step `meanings`, TASK-081, loads it).
- **Requested by:** the project owner, 2026-10-03: "do the remaining Buryan chapters".
- **Decisions:** ADR-0008. The source and its basis as `sources/onomastics/buryan-1933.json` states them.
- **Depends on:** TASK-081, on `main` @ `6e61716`.

## 1. Goal

Every surname that chapters C–F of ks. Józef Buryan's *Skąd pochodzi twoje imię i nazwisko…* (1933) name as a surname, and that the 2026 register holds, carries that passage as its meaning, as the chapter B surnames do.

## 2. Facts (checked 2026-10-03)

1. Chapters C–F (printed pp. 20–46, PDF 22–48) are about place, people, mountain and river names. Surnames come up in passing: a search of the text for "nazwisk" and "nazwy osobowe" finds about a dozen passages.
2. The scan is the one TASK-081 used (SHA-256 `91d69b0e…`).

## 3. In scope

- New entries in `sources/onomastics/buryan-1933.json`, checked against the page images.
- `sources/onomastics/README.md`, `STATUS.md`, the progress record.

## 4. Out of scope

- Place, people, mountain or river names that are not stated to be surnames.
- Any code or VM change: the `meanings` step loads the file as it stands.

## 5. Acceptance criteria

- **AC-1.** Each new entry's surname is in the 2026-01-20 register, its gloss is the passage's own words, and the file parses with `parseOnomasticSource`.
- **AC-2.** `pnpm format:check`, `check:ids`, `test` and `test:integration` exit 0.

## 6. Verification

```
pnpm format:check && pnpm check:ids && pnpm test
TEST_DATABASE_URL=postgres://… pnpm test:integration
```
