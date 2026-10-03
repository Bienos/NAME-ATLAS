# 2026-10-03 — TASK-083: the surnames Buryan 1933 names in chapters C–F

Scope authority: `tasks/083-buryan-chapters-c-f.md`. Decision: ADR-0008.

## What changed

- `sources/onomastics/buryan-1933.json`: 1,304 → 1,324 entries. PDF pages 22–48 (printed 20–46) were searched for "nazwisk" and "nazwy osobowe"; each passage found was read on the page image (PDF 25, 26, 29, 30, 34, 38, 39, 41, 44, rendered at 260 dpi). Added, each with the passage as its gloss:
  - p. 23, "Kał: nazwiska: …" (root kał, mud): KALA, KALUS (printed "Kal-us"), KAŁUS, KALUTA, KALETA, KALITA, KALATA, KALEMBA, KALISZ, KALISZEK, KALISIEWICZ, as `TOPONYMIC`. Kałusz and Kalaś are not in the register.
  - p. 24, "Lęda, Ląd, … = ugór, odłóg, przyłóg; por. nazwisko Lendzion, Londzin.": LENDZION, LONDZIN (root lęda).
  - p. 28, "Nazwisko Krak i dzisiaj się napotyka.": KRAK.
  - p. 32, "cierlica, tarlica dla tarcia lnu, — nazwy osobowe: Terlica, Tyrlik, Terlicki": TYRLIK, TERLICKI (root cierlica). Terlica is not in the register.
  - p. 36, Lublin "(por. nazwisko Lubelczyk)": LUBELCZYK (root Lublin).
  - p. 37, "Jest i Bieszk nazwisko": BIESZK.
  - p. 39, "nazwisko Baćmaga, oznaczające również „obuwie”": BAĆMAGA.
  - p. 42, "nazwy miejscowości i Roj, Roik, Rojek nazwiska": ROJ (Roik and Rojek were already in from chapter B).
- Left out because the passage does not say they are surnames: the Pop- forms (p. 28, inside a run of place names), Trawnik and Trawniczek (p. 27, compared with a village name), the "nazwy osobowe z końcówką -awa" (p. 28, which states no origin), Rojczyk and Rojewicz (p. 42).
- `sources/onomastics/README.md`, `STATUS.md`, the task file.

## Coverage

Against the 2026-01-20 register, men and women counted together: 27 of the top 100, 193 of the top 1,000, 638 of the top 10,000 (from 27, 191 and 630).

## Verification (run 2026-10-03 on this branch, `main` @ `6e61716` underneath)

- `parseOnomasticSource` on the file: PARSED, 1,324 entries.
- `pnpm format:check`, `pnpm check:ids`, `pnpm test`: each exit 0.
- `TEST_DATABASE_URL=… pnpm test:integration` against a fresh local PostgreSQL 16 with PostGIS 3: exit 0, 33 files, 388 tests.
- Against the TASK-081 rehearsal database (full male resource 1148808, the 1,304-entry file already imported): `import-onomastics` printed "1324 entries stored; it replaces record …, now UPDATED"; `surname-meaning.ts` over the 20 new surnames: 20 `POSSIBLE`; the work then has 1 `ACTIVE` and 2 `UPDATED` records.

## Not verified

- Nothing is loaded in production: the Register VM step `meanings` (TASK-081) has not been run.
- The transcription was checked by one reader against the images.
