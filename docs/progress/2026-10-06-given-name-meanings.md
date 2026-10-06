# 2026-10-06 — First-name origins and meanings in the full-name report (TASK-147)

The owner asked "yes build the first-name meanings" after deciding D-046 (`tasks/147-given-name-meanings.md`; ADR-0045, proposed). Built on `main` @ `0596cc6`. Nothing is deployed, applied on the VM, imported or derived on production, or sold.

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

VERIFICATION_TABLE

## Not verified

- 0044 is not applied on the VM, and `given-names.sh` has not run there or on a stand-in. Its new lines were checked with `bash -n` and `pnpm check:vm` only. `shellcheck` is not installed here.
- The Buryan entries were transcribed from the page images in the D-046 session. They were not checked again here.
- No lawyer has reviewed either work's public-domain status. Both are `LEGAL_REVIEW_REQUIRED`, as Buryan's surname file is.
