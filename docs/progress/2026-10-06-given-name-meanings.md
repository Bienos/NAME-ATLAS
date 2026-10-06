# 2026-10-06 — First-name origins and meanings in the full-name report (TASK-147)

The owner asked "yes build the first-name meanings" after deciding D-046 (`tasks/147-given-name-meanings.md`; ADR-0045, proposed). Built on `main` @ `0596cc6`. It was built as TASK-146 and migration 0043. Then the open pull request #175 took TASK-146, migration 0043 and D-047, so this was renumbered TASK-147 and migration 0044. #175 merged first (`13b0b40`), as it had to, because the migrator refuses a migration older than one already applied. `main` was then merged into this branch. Nothing is deployed, applied on the VM, imported or derived on production, or sold.

## What changed

- **Migration 0044** (`packages/db/migrations/0044_given_name_meaning.ts`): `claim_type` gains `GIVEN_NAME_MEANING`, held at `SHARED` by the check `claims_given_name_meaning_scope`. `packages/db/src/generated/db.ts` is regenerated.
- **`packages/sources/src/given-names/meanings.ts`** (new):
  - The parser for a first-name meaning file (`"kind": "GIVEN_NAME_MEANINGS"`). It refuses:
    - an entry with neither origin nor meaning;
    - a translation with no meaning, or not by Name Atlas;
    - an unknown origin code, or one without the work's words;
    - an entry without page or quotation;
    - a name given twice.
  - `importGivenNameMeanings`: one source record per file, `{source_key}:{year}:given-names`.
  - `bin/import-given-name-meanings.ts`, which is `pnpm import:given-name-meanings`.
- **`packages/sources/src/onomastics.ts`:** the work parser, the work's source row and the record writer are exported for that importer (`parseOnomasticWork`, `ensureOnomasticWork`, `storeOnomasticRecord`). `importOnomasticSource` stores exactly what it did. A source imported for both surnames and first names becomes `MIXED`.
- **`sources/given-name-meanings/`** (new):
  - `buryan-1933.json`: 112 names, chapter A, transcribed from the page images in the D-046 session;
  - `yonge-1884.json`: 86 names from the Glossary's *Pol.* lines, each English meaning with a literal Polish translation marked as Name Atlas's;
  - `README.md`.
- **`packages/truth/src/given-name-meaning.ts`** (new), with `bin/derive-given-name-meanings.ts` (`pnpm truth:derive-given-name-meanings`):
  - one `GIVEN_NAME_MEANING` claim per name, an `INTERPRETATION`, with one piece of evidence per work's entry and one citation per work;
  - an unchanged claim is kept, a claim whose works changed is superseded, and one no file supports is retracted.
- **`packages/truth/src/confidence.ts`:** `assessGivenNameMeaning`. One work is POSSIBLE; works stating one origin are LIKELY; two origins are CONFLICTING; it is never VERIFIED.
- **`packages/truth/src/given-name-facts.ts`:**
  - `readGivenNameMeaning`, gated by the works' rights;
  - `GivenNameReportFacts`;
  - `parseGivenNameFacts` reads a version without a meaning (`@0`) as `NO_SOURCE`.

  `readGivenNameFacts` is unchanged, and so is the baby-names page that uses it.
- **`packages/truth/src/report.ts`:**
  - `full_name_report@1` freezes the meaning;
  - the meaning claim is a SUPPORT claim of the first-name chapter;
  - LIMITATIONS names the meaning only when none is shown.
- **`apps/web/src/lib/report-view.tsx`:** "Pochodzenie i znaczenie / Origin and meaning" in the first-name chapter, one row per work:
  - the work and page, footnoted;
  - the origin, with the work's words;
  - the meaning, verbatim; on the Polish page Yonge's is followed by "przekład Name Atlas: …" and a note that the translation is ours;
  - the work's words;
  - then the assessment.

  The "no source" line is reworded to "no work we may quote explains this name".
- **`ops/vm/given-names.sh`:** also imports both files, derives the meanings, checks 0044's claim type, and gates on one `ACTIVE` record per meaning file and as many `ACTIVE` meaning claims as were tallied.
- **Tests:**
  - `tests/integration/src/given-name-meaning.test.ts` (4, new);
  - `tests/integration/src/full-name-report.test.ts` (1 new, 3 updated for `@1`);
  - `packages/sources/src/given-names/meanings.test.ts` (6, new);
  - `packages/truth/src/confidence.test.ts` (2 new);
  - `apps/web/src/lib/report-view.test.ts` (5 new, 1 updated);
  - the migration and claim-type lists in `migrator.test.ts`, `extensions.test.ts`, `canonical-key-v2.test.ts` and `current-rank.test.ts`.
- **Docs:**
  - ADR-0045 (new);
  - ADR-0032, one consequence line;
  - `tasks/147-given-name-meanings.md`;
  - `docs/sources/given-name-meanings.md`, one sentence;
  - `ops/vm/README.md`, `STATUS.md`, `docs/CODEMAP.md`.

## Verification (commands run, results as returned)

The steps of `.github/workflows/ci.yml` were run locally, in order, on commit `ad8a3fd`. The database was PostgreSQL 16.14 with PostGIS 3.4.2. `DATABASE_URL` was a migrated `name_atlas`, and `TEST_DATABASE_URL` was the same server.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm` | exit 0 |
| `python3 scripts/test-backup.py` | exit 0 |
| `pnpm test`, with `DATABASE_URL` set to the migrated, seeded `name_atlas` | exit 1. One failure, `apps/web/src/app/api/v1/surname-prefix/route.test.ts` "answers a failure with the error envelope…": expected 500, got 200. The test needs the lookup to fail, and on GitHub it does, because the unit tests run before the migrations, on an empty database. |
| `pnpm test`, with `DATABASE_URL` set to a new empty database, as on GitHub | exit 0, 2,443 tests (web 994) |
| `pnpm db:migrate`; `db:generate-types` and `git diff --exit-code -- packages/db/src/generated` | exit 0, no diff |
| `pnpm test:integration` | exit 0: 48 files, 529 tests |
| `pnpm test:golden` | exit 0: 4 files, 364 tests |
| `pnpm build` | exit 0 |
| `pnpm e2e:seed`; `pnpm test:e2e` | exit 0, 10 Playwright tests passed |

**On real first-name data.** These runs used `gn_full`, the local database holding the full official 2026-01-20 first-name lists and their TASK-122 claims.

- **Import and derivation:**
  - Migration 0044 applied.
  - `pnpm import:given-name-meanings` with both files: `IMPORTED`, 112 and 86 entries. The Buryan file again: `ALREADY_IMPORTED`.
  - `pnpm truth:derive-given-name-meanings`: 168 names derived, `not_on_lists` empty. Confidence: 139 POSSIBLE, 27 LIKELY, 2 CONFLICTING (MACIEJ and TOMASZ, `arc` and `he`).
  - Examples: JÓZEF and MAŁGORZATA are LIKELY. JAN, ADOLF and URSYN are POSSIBLE. URSYN has no origin from Yonge, and `la` from Buryan.
  - Run again: 0 derived, 168 kept.
- **`pnpm report:build -- --surname NOWAK`:**
  - `--given-name MAŁGORZATA`: exit 0. Meaning `READY` with 2 works. Section summary `VERIFIED` 2 and `LIKELY` 1.
  - `--given-name TOMASZ`: exit 0. 2 works, `CONFLICTING` 1.
  - `--given-name KRZYSZTOF`: exit 0. Meaning `NO_SOURCE`, and the gap "MEANING NO_ADMISSIBLE_SOURCE".
  - `--given-name "BRAK DANYCH"`: `GIVEN_NAME_NOT_FOUND`.
- **The preview against `next start`**, from this build, with `DATABASE_URL` set to `gn_full` and `REPORT_PREVIEW_ENABLED=1`:
  - **Status 200 for:**
    - MAŁGORZATA NOWAK, Polish and English;
    - TOMASZ NOWAK and KRZYSZTOF NOWAK, Polish;
    - PIOTR NOWAK, a version frozen under `full_name_report@0` by TASK-124.
  - The page was sent with `cache-control: private, no-store` and `noindex, nofollow`.
  - **MAŁGORZATA, Polish:** "Pochodzenie i znaczenie"; "greckie („Gr.”)" and "greckie („z greckich”)"; "przekład Name Atlas: „perła”"; "Ocena: Prawdopodobne"; the note on the translation. The two works are footnoted [3] and [4], after the list's count and rank [1] and [2].
  - **MAŁGORZATA, English:** "“pearl”", "Greek (“Gr.”)" and "Assessment: Likely". "perła" is not on the page.
  - **TOMASZ:** "aramejskie („Aram.”)", "hebrajskie („hebrajskiego pochodzenia”)", "przekład Name Atlas: „bliźniak”" and "Ocena: Źródła się różnią".
  - **KRZYSZTOF and PIOTR (`@0`):** "Znaczenie imienia: żadne dzieło, które wolno nam cytować…".
  - The text was compared after removing React's `<!-- -->` markers.
- **Page width (Playwright):** scroll width equals client width at 1440 × 900 (MAŁGORZATA, Polish) and at 390 × 844 (MAŁGORZATA, Polish and English; TOMASZ, Polish). On a phone the four-column table scrolls inside itself, as every report table does below 40rem.

## Not verified

- 0044 is not applied on the VM, and `given-names.sh` has not run there or on a stand-in. Its new lines were checked with `bash -n` and `pnpm check:vm` only. `shellcheck` is not installed here.
- The Buryan entries were transcribed from the page images in the D-046 session. They were not checked again here.
- No lawyer has reviewed either work's public-domain status. Both are `LEGAL_REVIEW_REQUIRED`, as Buryan's surname file is.
