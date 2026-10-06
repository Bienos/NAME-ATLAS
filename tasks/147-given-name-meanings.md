# TASK-147 — First-name origins and meanings in the full-name report (Buryan 1933, Yonge 1884)

- **Status:** IMPLEMENTED 2026-10-06 (`docs/progress/2026-10-06-given-name-meanings.md`). Migration 0044 is not applied on the VM, and nothing is imported or derived on production.
- **Number:** 147, migration 0044, ADR-0045. `main` holds TASK-145, migration 0042 and ADR-0044. The open pull request #175 holds TASK-146, migration 0043 and D-047; it was opened while this was built as 146 and 0043, so this was renumbered. The migrator refuses a migration older than one already applied, so this must merge after #175.
- **Requested by:** the project owner, 2026-10-06: "yes build the first-name meanings", after D-046.
- **Decision:** D-046 (resolved), recorded as ADR-0045 (proposed).
- **Model guidance:** implementation session.

## 1. Goal

The full-name report's first-name chapter shows a name's origin and meaning where a public-domain work states one, quoted with its page, as D-046 allows. Brückner 1927 is a later task, and Grzenia's book waits on permission.

## 2. Facts (2026-10-06, `docs/sources/given-name-meanings.md`)

1. **Buryan 1933, chapter A "Imiona"** (printed pp. 4–6, PDF pp. 6–8):
   - It names each name's language of origin by group: Hebrew, Greek, Latin, Germanic, Lithuanian and Slavic.
   - It gives a meaning for a few names, for example Józef "tyle co Crescens".
   - The work is public domain, already cleared for surnames (`sources/onomastics/buryan-1933.json`).
2. **Yonge 1884's index:** one line per Polish form, giving the root language and the meaning in English. The work is public domain, and the text is Project Gutenberg #70419.
3. **D-046:**
   - Buryan's origin may be shown, quoted with the page.
   - Yonge is shown verbatim in English and translated literally into Polish, marked as Name Atlas's translation.
   - Nothing else is written by the project.
4. **The existing chain:**
   - Surname meanings follow `importOnomasticSource` → `deriveSurnameMeaning` (ADR-0008): one INTERPRETATION claim per name; POSSIBLE with one work, LIKELY when works agree, CONFLICTING when they differ.
   - Given-name claims are at `SHARED` scope (0038).

## 3. In scope

- **Migration 0044:** `claim_type` gains `GIVEN_NAME_MEANING`. A check of its own, `claims_given_name_meaning_scope`, holds it at `SHARED`, as 0038 and 0041 hold theirs.
- **`packages/sources/src/given-names/meanings.ts`:** a source file of first-name entries.
  - **Format:** each entry has the register spelling, the printed form, the origin (a code and the work's own words), the work's gloss, an optional translation marked as Name Atlas's, the locator and a verbatim quotation.
  - **The parser** refuses an entry with neither origin nor gloss, a translation without a gloss, or a translation by anyone but Name Atlas.
  - **The importer** follows ADR-0008 §4 and keeps the work's surname file apart: its own record, `{source_key}:{year}:given-names`.
  - `pnpm import:given-name-meanings`.
- **`sources/given-name-meanings/`:**
  - `buryan-1933.json`: 112 names, transcribed from the page images.
  - `yonge-1884.json`: 86 names from the Polish index lines.
  - `README.md`.
- **`packages/truth/src/given-name-meaning.ts`:**
  - `deriveGivenNameMeaning` and `deriveAllGivenNameMeanings`: one `GIVEN_NAME_MEANING` claim per name, with one piece of evidence per entry, a confidence assessment and one citation per work.
  - **Confidence** compares the stated origin codes. One work is POSSIBLE. Two or more stating the same origin, and none another, is LIKELY. Two different origins are CONFLICTING. It is never VERIFIED.
  - `pnpm truth:derive-given-name-meanings`.
- **The report:**
  - `readGivenNameMeaning` reads the name's meaning claim, gated by rights, beside `readGivenNameFacts`, which the baby-names page also uses and which is unchanged.
  - `full_name_report@1` freezes it. Versions frozen under `@0`, which have no meaning, still render.
  - The first-name chapter's "Pochodzenie i znaczenie / Origin and meaning" lists each work: the origin, the work's words, Yonge's translation on the Polish page, and the citation.
  - The chapter's claims include the meaning claim.
  - "What we don't know" names the meaning only when there is none.
- **`ops/vm/given-names.sh`** also imports the two files and derives the meanings, and its gate counts the meaning claims.

## 4. Out of scope

- Brückner 1927; Grzenia's book; any meaning not stated by a work.
- A first-name page outside the report; the baby-names page.
- Applying 0044 on the VM, and running the step.

## 5. Acceptance criteria

- AC-1: both files import; a second import is `ALREADY_IMPORTED`; the surname meaning of the same Buryan work is untouched.
- AC-2: JAN gets one Buryan interpretation, POSSIBLE. MAŁGORZATA gets Buryan and Yonge, both Greek, LIKELY. TOMASZ gets Hebrew (Buryan) and Aramaic (Yonge), CONFLICTING. KRZYSZTOF gets no claim. Deriving again writes nothing.
- AC-3: the parser refuses an entry with neither origin nor gloss, and a translation not by Name Atlas.
- AC-4: a full-name report for MAŁGORZATA freezes both interpretations. The Polish page shows "perła" marked as Name Atlas's translation; the English page shows "pearl"; the citations lead the bibliography. A name without a meaning keeps the "no source yet" line.
- AC-5: a report frozen under `full_name_report@0` still renders.

## 6. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `db:migrate`, `db:generate-types` (no diff), `test:integration`, `test:golden`, `build`, `e2e:seed`, `test:e2e`. Then, on the full first-name lists, the two files are imported, every meaning is derived, and a full-name report is built and previewed.
