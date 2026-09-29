# 2026-09-29 — the publisher's statement on the unit of PESEL `Liczba`, captured

**Scope:** documentation and evidence only. There is no task file. This closes the gap recorded in `docs/sources/pesel.md`, "Unit of `Liczba`": "its verbatim sentences and publication date are **not** in this repository". Branch `claude/elegant-hawking-lw5adp`, rebuilt from `main` @ `98952f1`.

## Changed

- **`docs/sources/acquisition/2026-09-29-pesel-unit/` (new): the evidence.**
  - `README.md` quotes the Ministry's communiqué "Nic nowego - Nowak znowu pierwszy" (gov.pl, `10.02.2021`) verbatim, with its URL and the page's checksum.
  - The README matches all five of the communiqué's figures to exact `Liczba` values in the 2021 national resources `28052`/`35279`.
  - `SHA256SUMS.txt` lists every byte retrieved.
  - `metadata/` holds the verbatim `api.dane.gov.pl` responses for dataset 1681 and the two resources, already excluded from formatting by `.prettierignore`.
- **`docs/sources/pesel.md`:** the paragraph that said the statement was not captured now says it is, quotes the deciding sentence, and points at the record. The enquiry that follows it is unchanged.
- **`docs/adr/0004-population-value-unit.md`:** the amendment says "A publisher confirmation, if one is ever obtained, is recorded here". It is recorded there in one paragraph. The decision is unchanged, because the statement agrees with it.
- **`docs/CODEMAP.md`:** one row for the new acquisition directory.

No decision changes. TASK-004 §14 U-4 stays as the project owner decided it on 2026-09-20 (`PEOPLE`), now with the publisher's own published reading beneath it. **U-1 is not acted on:** the communiqué calls the partitions `kobiet`/`mężczyzn` and sums them, and that is recorded for the project owner only.

`STATUS.md` is not changed. None of its lines is made untrue by this record. Its "Open pull requests" line is rewritten by the open #21 and #22, and editing it here would only conflict with them.

## Verified

| Command | Result |
|---|---|
| `curl -sS -o /dev/null -w "%{http_code}" https://dane.gov.pl/pl/dataset/1681` and `https://api.dane.gov.pl/1.4/datasets/1681` | `200` and `200` |
| `curl -sSL https://www.gov.pl/web/cyfryzacja/nowak-znowu-pierwszy` | 37,430 bytes, SHA-256 `e6ac9087…2dee16`. The five quoted sentences were extracted from it with tags stripped |
| `curl -sSL` of both 2021 `csv` endpoints, then `sha256sum` | `ea466f2b…c215c` (`28052`) and `9af26480…b62e0` (`35279`), identical to `docs/sources/acquisition/2026-09-18/SHA256SUMS.txt` lines 5–6 |
| `grep` of `NOWAK`, `WOŹNIAK`, `DĄBROWSKA` in those CSVs | `NOWAK,100617` / `NOWAK,102503` / `WOŹNIAK,43487` / `DĄBROWSKA,44204`: exact matches for the communiqué's figures |
| `cmp` of each committed `metadata/*.json` against the file `curl` wrote | identical, so the committed files are byte for byte what was served |
| `pnpm install --frozen-lockfile` | passed |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm check:ids` | "every task, ADR, migration and decision number is used once" |
| `pnpm lint` | passed, no output |
| `git diff --check` | clean |
| `grep` for tests that read `docs/` files | only `packages/sources/src/polona/rights.test.ts` reads `docs/sources/polona.md`, which is untouched. `pnpm test`, `test:integration`, `test:golden` and `build` were not run: no code, fixture or migration changed |

## Not verified

- **Whether the communiqué's reading holds for the 2026 edition.** It was stated about 2021. It carries over through the same dataset, header and description template, not through a statement about 2026.
- **Why resource `35279`'s `created` (`2021-12-21`) postdates the communiqué (`2021-02-10`)** while its bytes still match the communiqué's figures.
- **No reply from the publisher to the enquiry** in `pesel.md`. It has not been sent.
