# TASK-039 — TERYT Localities Import (TERC + SIMC)

- **Status:** IMPLEMENTED AND VERIFIED (2026-09-30). Verification actually run: `docs/progress/2026-09-30-teryt-localities-import.md`.
- **Requested by:** the project owner, 2026-09-30: "start the TERYT localities import".
- **Base branch:** `claude/jolly-faraday-uas99n` (pull request #25, TASK-038), **not** `main`. `AGENTS.md` §11 allows another base only when the task says so, and this task says so: it depends on TASK-038 registering `pl_teryt` in `sources` with a default rights profile, and #25 was not merged when this task started. The pull request targets `main` and must merge after #25.
- **Milestone:** none in `PLAN.md`. `docs/canonical/12` §7 labels TERYT **NOW** and §8.1 gives its role: canonical Polish locality IDs, the administrative hierarchy, place linkage.
- **Depends on:** migrations `0003` (`sources`, `source_records`) and `0010` (`places`, `place_names`, `entity_external_ids`); TASK-011's voivodeship places (`packages/sources/src/voivodeships.ts`); TASK-038's `pl_teryt` catalogue entry.
- **Blocks:** nothing. A future task may link distribution values or historical names to these places.

---

## 1. Goal

Import GUS's official TERYT registers, TERC (territorial units) and SIMC (localities), into the places layer: every locality becomes a `Place` in the TERC hierarchy voivodeship → powiat → gmina → locality, with its official name, its TERYT id and its provenance. The import is deterministic, idempotent and fail-closed, like the PESEL importer.

## 2. Outcome

Against a migrated database where `pl_teryt` is registered (`pnpm seed:sources`), `pnpm import:teryt --terc <TERC csv> --simc <SIMC csv>` loads the full register state of 2026-01-01 (the files' `STAN_NA`):

- 16 voivodeships, reused where TASK-011 already created them;
- 380 powiats, 2,479 gminas and 101,865 SIMC localities;
- one `administrative_memberships` row per parent link.

Running it again with the same bytes changes nothing and says so.

## 3. Authority

- `docs/canonical/11`:
  - §5.1 `Place`, §5.2 `PlaceName`;
  - §5.4 `AdministrativeMembership` ("Place A belonged to Place/Admin Unit B during period T");
  - §20.3, external ids in one shared table.
- `docs/canonical/12`:
  - §2.1: "GUS states that TERYT ws1 is available to public and commercial entities and that the service/data are free of charge";
  - §7: TERYT is **NOW**;
  - §8.1: TERYT's role;
  - §11: the TERYT connector. Local ingestion, and TERC/SIMC ids stored as external ids;
  - §11.4: TERYT is not a surname or origin source.
- `docs/sources/INVENTORY.md` §3 (why bulk data is not committed) and §4 (TERYT is geography infrastructure, never evidence of surname origin).
- TASK-011: the voivodeship places and the `TERYT` provider key.
- TASK-038: the `pl_teryt` source row and its default rights profile.

## 4. Decisions this task records

These are this task's decisions, recorded so a reviewer can check the code against them. None is a legal conclusion.

1. **Acquisition.** The files come from GUS's official "Pliki pełne" page on `eteryt.stat.gov.pl`, "wersja urzędowa", as the 2026-09-18 run did. `fixtures/teryt/source-manifest.json` records:
   - the URLs and retrieval times;
   - the HTTP headers;
   - SHA-256 and byte size of the zips and of their CSV members;
   - both GUS terms statements.

   Only a 14 + 14 row excerpt is committed. The CSV member of each zip is what is imported and checksummed. The zip is only a wrapper: its own hash changes with every download, even when its content does not.
2. **Terms check.** The publisher's two statements, read on 2026-09-30, agree with `docs/canonical/12` §2.1:
   - `api.stat.gov.pl/Home/TerytApi`: "Service and data are available free of charge", to public administration and commercial entities.
   - eTERYT "Formy i zasady udostępniania": the register "jest jawny". TERC, SIMC and ULIC "udostępniane są bezpłatnie wszystkim użytkownikom", including "pobieranie zbiorów pełnych".
3. **Rights and production-status gate.** The importer reads `pl_teryt`'s row and its default rights profile **from the database**, never from code, and refuses before reading the files if:
   - the source is not registered (`SOURCE_NOT_REGISTERED`: run `pnpm seed:sources`);
   - `rightsRefusal` refuses the profile (`automated_access = PROHIBITED` or `review_status = BLOCKED`);
   - `sources.production_status` is anything other than `APPROVED` or `LEGAL_REVIEW_REQUIRED`. So `PARTNERSHIP_REQUIRED`, `BLOCKED`, `DEPRECATED` and any future value refuse.

   `LEGAL_REVIEW_REQUIRED` (TERYT's catalogue value) does not block an internal import, for the same reason `rightsRefusal` lets `review_status = LEGAL_REVIEW_REQUIRED` through for PESEL: it closes public and paid surfaces, and this task renders nothing. `rightsRefusal`'s behaviour is unchanged. The production-status gate belongs to this connector, and the gap it closes is recorded here and in the progress record.
4. **Which rows become places.** Every row of both files is read, checked and recorded. They become places as follows:

   | Row | Becomes | `place_type` | `spatial_precision` |
   |---|---|---|---|
   | TERC voivodeship (`POW`, `GMI`, `RODZ` empty) | place, reused if TASK-011 made it | `REGION`, TASK-011's value | `REGION` |
   | TERC powiat (`GMI`, `RODZ` empty), including cities with powiat rights | place | `COUNTY_DISTRICT` | `REGION` |
   | TERC gmina, `RODZ` 1, 2 or 3 | place | `MUNICIPALITY` | `MUNICIPALITY` |
   | TERC `RODZ` 4 or 5 (town or rural part of an urban-rural gmina), 8 (Warsaw district), 9 (city delegation) | **no place**: a statistical component of a gmina, recorded as a source record and counted | — | — |
   | SIMC `RM` 96 (miasto) | place | `CITY` | `LOCALITY` |
   | SIMC `RM` 01 (wieś) | place | `VILLAGE` | `LOCALITY` |
   | SIMC any other known `RM` (00, 02–07, 95, 98, 99) | place | `OTHER` | `LOCALITY` |

   The verbatim `RM`, `RODZ_GMI` and every other field stay queryable in the row's `source_records.raw_payload`. The `place_type` is a coarse view and does not replace them. `centroid` is null everywhere, because neither register carries geometry (§5.1).
5. **Hierarchy.** One `ADMINISTRATIVE` membership per child:
   - powiat → voivodeship;
   - gmina → powiat;
   - SIMC locality whose `SYMPOD = SYM` → its gmina. The SIMC row names a TERC unit (`WOJ POW GMI RODZ_GMI`), resolved as follows:
     - `RODZ_GMI` 1, 2 or 3: the gmina itself;
     - 4 or 5: the `RODZ 3` gmina with the same `WOJ POW GMI`;
     - 8 or 9: the one `RODZ 1` gmina of the same powiat. If there is not exactly one, the row is quarantined.
   - SIMC locality whose `SYMPOD ≠ SYM` (a part of a locality) → the locality `SYMPOD`.

   Voivodeships get no parent, because no country place exists. `verification_status` is `MACHINE_EXTRACTED`, which is what it is: parsed from an official file, not reviewed.
6. **External ids.** TERC codes keep TASK-011's `provider_key = 'TERYT'`: `02` (voivodeship), `0224` (powiat), `0224053` (gmina, 7 digits with `RODZ`). SIMC ids use `provider_key = 'TERYT_SIMC'`. They must be separate, because a 7-digit SIMC id and a 7-digit TERC gmina code can be the same digits.

   `valid_from` is the row's `STAN_NA`. `docs/canonical/12` §11.3 names the namespaces `TERYT_TERC` / `TERYT_SIMC`, but `main` has used `TERYT` for TERC since TASK-011. Renaming it would re-identify existing rows, so the difference is recorded as D-023 and not resolved in code.
7. **Names.** One `OFFICIAL` `place_names` row per new place, `language_code = 'pl'`. It holds `NAZWA` exactly as read, and it must already be NFC with no leading or trailing space, or the row is quarantined. Quotes are literal: SIMC has `Mazewo Dworskie"A"`, and no CSV quoting is applied. A reused voivodeship keeps its TASK-011 name, and its `current_display_name` must equal the TERC `NAZWA` exactly, or the import fails.
8. **Provenance.** One `source_records` row per file:
   - `record_type = 'API_OBJECT'`;
   - `external_record_id = 'TERC_Urzedowy'` or `'SIMC_Urzedowy'`;
   - `content_hash` is the CSV's SHA-256;
   - `raw_payload` is the manifest's resource entry.

   One `DATA_ROW` record per line:
   - `external_record_id = 'TERC:<code>'` or `'SIMC:<SYM>'`;
   - `external_parent_id` is the file record's `dataset_version`;
   - `content_hash` is the SHA-256 of the line's UTF-8 bytes;
   - `raw_payload` holds the header → value map and the line.

   Each new place name and membership cites its row's record. All records are under source `pl_teryt`.
9. **Idempotence and refresh.**
   - The same bytes as a completed import → `ALREADY_IMPORTED`, nothing written.
   - A **different** file state, when one is already imported → `REFRESH_NOT_SUPPORTED`, nothing written. Applying a new register state (renames, merges, removals) is a later task.
   - Any existing `TERYT`/`TERYT_SIMC` external id other than TASK-011's 16 voivodeships → `EXISTING_PLACE_CONFLICT`, nothing written.
10. **Fail-closed parsing.** In this order: the gate, then the checksum, then parsing and validation of both files, then one write transaction. Each of the following quarantines the row, with file, line, id and reason. Any quarantine aborts the import with nothing written. The report lists every quarantined row.
    - A header other than the recorded one;
    - a line with the wrong field count;
    - a malformed code;
    - an unknown `RODZ`/`NAZWA_DOD` pairing or `RM` value;
    - `MZ ≠ 1`: a customary name, which this task does not interpret;
    - a duplicate code;
    - a missing parent, or a `SYMPOD` chain deeper than one;
    - mixed `STAN_NA` within a file;
    - a non-NFC or padded name.

    Invalid UTF-8, a lone `\n` or `\r`, or an empty line anywhere but the end fails the whole file (`SCHEMA_VIOLATION`).

## 5. In scope

1. This task file.
2. Acquisition of the official TERC and SIMC files, the committed excerpt fixtures and `fixtures/teryt/source-manifest.json`.
3. Migration `0023_administrative_memberships.ts`, the §5.4 table, and the regenerated `packages/db/src/generated/db.ts`.
4. `packages/sources/src/teryt/`: the parser, validation and hierarchy resolution; the gate; the importer and its reconciliation report. Re-exported from `@name-atlas/sources`.
5. `packages/sources/bin/import-teryt.ts`, the package script `import-teryt` and the root script `import:teryt`.
6. Unit tests (parser, validation, hierarchy, gate) and integration tests against a real PostgreSQL.
7. D-023 in `docs/DECISIONS_NEEDED.md` (non-blocking); `docs/sources/INVENTORY.md`'s TERYT row; `docs/CODEMAP.md`; `STATUS.md`; a `docs/progress/` record.

## 6. Out of scope

- ULIC (streets); WMRODZ; the "adresowa" and "statystyczna" versions.
- Geometry, centroids and boundaries (PRG acquisition failed; INVENTORY §1).
- GeoNames, Wikidata and historical or exonym names.
- Refreshing to a later register state (§4 item 9).
- Any surname–place claim, distribution link, derivation, API or page change.
- Loading the hosted Supabase database (free 500 MB plan; TASK-035 is parked on it).
- Any change to `rightsRefusal`'s behaviour, the PESEL or regional importers, TASK-011's seeder, the source catalogue or `docs/canonical/`. `rightsRefusal`'s parameter type may ask for only the two fields it reads, so a profile read from the database can be passed to it.

## 7. Acceptance criteria

- AC-01 The manifest records, for each of TERC and SIMC:
  - the official URL, retrieval time and HTTP headers;
  - zip and CSV SHA-256 and byte size;
  - row count and `STAN_NA`;
  - both terms statements.

  The excerpts are real lines of the official CSVs, byte for byte, with their own SHA-256 recorded.
- AC-02 The importer refuses before reading any file when `pl_teryt` is unregistered, when its profile has `automated_access = PROHIBITED` or `review_status = BLOCKED`, or when its `production_status` is not `APPROVED` or `LEGAL_REVIEW_REQUIRED`.
- AC-03 A checksum mismatch on either file fails the import before parsing, with nothing written.
- AC-04 Every §4 item 10 defect quarantines the row, or fails the file, and nothing is written.
- AC-05 On the excerpt, a first import creates the places in §4 item 4's table, with the names, external ids, memberships and source records of §4 items 5–8. The reconciliation report balances: every TERC row is a voivodeship, powiat, gmina or component, and every SIMC row is a locality.
- AC-06 TASK-011's voivodeship places, when present, are reused and not duplicated. A voivodeship whose stored name differs from TERC fails the import.
- AC-07 A second import of the same bytes returns `ALREADY_IMPORTED` and changes no row in any table.
- AC-08 A different file state after a completed import returns `REFRESH_NOT_SUPPORTED`, with nothing written.
- AC-09 Nothing is written to `distribution_*`, `surnames`, `claims`, `evidence_items` or `citations`.
- AC-10 The full 2026-09-30 files import locally with a balanced report, and a second run returns `ALREADY_IMPORTED`. Real counts are recorded in the progress record.

## 8. Verification

```bash
pnpm install --frozen-lockfile
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids
pnpm test
pnpm db:migrate
pnpm db:generate-types && git diff --exit-code -- packages/db/src/generated
pnpm test:integration
pnpm test:golden
pnpm build
# AC-10, local database, full files outside the repository:
pnpm seed:sources
pnpm import:teryt --terc <TERC_Urzedowy_2026-09-30.csv> --simc <SIMC_Urzedowy_2026-09-30.csv>
pnpm import:teryt --terc <…> --simc <…>   # ALREADY_IMPORTED
```

## 9. Definition of done

Every AC is shown by a test or a command that was actually run. The diff contains nothing from §6, and `docs/canonical/` is untouched. **STOP** after this task.
