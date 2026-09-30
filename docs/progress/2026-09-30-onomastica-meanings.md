# 2026-09-30 — TASK-046: *Onomastica* back as a meaning source

Task: `tasks/046-onomastica-meanings.md`. Decision: D-022, answered again by the project owner with option (b).

## What changed

- `docs/DECISIONS_NEEDED.md` D-022: resolved 2026-09-30. The printed CC BY-ND 4.0 licence of the OJS copies of vols 64 onward is relied on, as the owner's judgement. Only verbatim excerpts are published. Vols 56–63 and the journals.pan.pl copies stay out. `docs/sources/onomastica.md`'s header and `docs/CODEMAP.md` say so.
- `sources/onomastics/onomastica-64-16-walkowiak.json`, new. It holds 147 entries from J. B. Walkowiak, *Onomastica* LXIV (2020), s. 211–228, DOI 10.17651/ONOMAST.64.16.
  - Each gloss is the author's parenthetical etymology, verbatim, with its printed page. Roots are null and the formation type is `UNKNOWN`.
  - Rights: permissions as the licence grants them, `review_status = LEGAL_REVIEW_REQUIRED`. `evaluateAllSurfaces` gives `ALLOWED` on INTERNAL, FREE, PAID and SEO, the same as `buryan-1933.json`.
  - Left out, each named in the file's `_note`: 1 headword with no parenthetical, 8 whose etymology the author calls unclear, 14 headword lines whose accent marks the PDF's text layer garbles, and 35 surnames absent from both 2026-01-20 national lists.
- `ops/vm/extras.sh` imports every `sources/onomastics/*.json`, derives each listed surname once (`sort -u`) and gates on all of them. The step counts and the dump's file name are unchanged. Its README row and `register-vm.yml`'s comment were updated to match.
- `packages/sources/src/onomastics.test.ts`: every committed real file parses as admissible, is not synthetic, lists each surname once, and has a distinct `source_key`.
- `sources/onomastics/README.md` and `tasks/046-onomastica-meanings.md` are new.

## How the file was made

1. The PDF was fetched from `https://onomastica.ijppan.pl/index.php/ONOM/article/download/284/288`. Its SHA-256 is `b9b6fefcbd1f31c153f4d2933d51b0ff6687ae7dd13483d5acfc906153945897`, the value in `docs/sources/acquisition/2026-09-29-onomastica/SHA256SUMS.txt`.
2. `pdftotext` (raw) gave the text. The entries run from ALKA (p. 213) to ŻYWANOWSKI (p. 223). Each headword line was split off, and the balanced outer parenthetical taken. Two entries whose closing parenthesis is missing in print, RADYKO and ŻYNDA/ŻENDA, end where the print's `):` and `’:` do.
3. Line-end hyphens were checked one by one against `pdftotext -layout`. All but one are typographic. The exception is "Szt-" + "i" in SZTURGULEWSKI, which is left out as unclear anyway.
4. Pages were read from the running heads of the layout text. The odd pages' heads carry a backspace byte and a no-break space.
5. The register was checked against the national lists 1148808 and 1148811, fetched from `api.dane.gov.pl`. Their SHA-256 values (`ce4238fe…`, `c508680d…`) match `fixtures/pesel/source-manifest.json`.

## Verification (run 2026-09-30)

| Command | Result |
|---|---|
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | exit 0 |
| `pnpm check:ids` | exit 0 |
| `pnpm test` | exit 0 (sources 541 passed, truth 341 passed, the rest passed) |
| `shellcheck ops/vm/extras.sh` | exit 0 |

Local rehearsal of AC-2:
- **Database.** PostgreSQL 16 with PostGIS 3, `pnpm db:migrate`.
- **Register.** `import-pesel.ts` for both full national lists: 408,182 and 420,082 values written, and 598,476 surnames.
- **Import.** `import-onomastics` for both files gave `IMPORTED`, 25 and 147 entries. A second run of the new file gave `ALREADY_IMPORTED`.
- **Derivation.** `surname-meaning.ts` for each of the 147 surnames printed `POSSIBLE (1 interpretation(s))` every time. DOWGUN cites the article at "s. 215".
- **Claims.** 147 `ACTIVE` `SURNAME_MEANING` claims, and 0 `ACTIVE` claims share a `claim_key`.
- **extras.sh logic.** Its surname listing, run over the two files, gives 172 distinct surnames.

## Not verified

- `extras.sh` was not run, locally or on the VM. Production does not have the file yet.
- `test:integration`, `test:golden` and `build` were not run.
- Each of the 147 glosses was checked against the text layer, not against the page images. The 14 garbled lines were excluded for that reason.
- No page was rendered. The meaning section's code is unchanged.
