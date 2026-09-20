# TASK-010 — Mixed-script rows in official bulk ingestion (D-014, Option C)

- **Status:** IMPLEMENTED AND VERIFIED 2026-09-20, all eight acceptance criteria. AC-8 for real: the
  female resource imported 420,082 of 420,082 rows with the two flagged rows stored verbatim, and
  `CURRENT_RANK` produces `NOWAK` rank 1 of 420,082 (female) beside rank 1 of 408,182 (male). The
  national pair is complete. Evidence: `PROGRESS.md`.
- **Created:** 2026-09-20, at the project owner's direction, resolving D-014 as **Option C**.
- **Milestone:** M2 (`PLAN.md`: complete current-surname intelligence). Closes the female half of
  the national pair, without which no both-sex surface can exist.
- **Depends on:** TASK-003 (resolver, script detection), TASK-004 (importer, U-5), ADR-0005
  (`canonical_key_v2`, which made the male resource ingestible).
- **Amends:** TASK-004 §14 **U-5**, narrowly. U-5 option (a) — any unresolvable row aborts the whole
  import — stays the rule for every reason except one: a row whose *only* problem is
  `MIXED_SCRIPT_REVIEW` is imported with that finding persisted, not quarantined.
- **Canonical basis:** `docs/canonical/13` §10.4 — *"Latin + Cyrillic lookalike characters →
  review/security flag. Do not reject automatically; historical/OCR text can genuinely contain
  mixed scripts."* This task implements that sentence for bulk ingestion. **No ADR**: nothing here
  deviates from canon; what rejected was an implementer's choice.

## 1. Goal

Make the female national resource `1148811` ingestible without normalising, merging, guessing or
dropping anything, so that both national resources are complete universes and `CURRENT_RANK` works
for both sexes.

## 2. The rows, as observed (D-014)

| Line | Value | Cause | `Liczba` |
|---|---|---|---:|
| 338,202 | `HODŽIЌ` | U+040C CYRILLIC CAPITAL LETTER KJE among Latin letters | 2 |
| 420,083 | `ЌATOVIЌ` | two U+040C among Latin letters | 2 |

`detectScripts` → `primary_script: Latn`, `mixed_script: true`, `script_confusable_flag: true`.
Validation → `MIXED_SCRIPT_REVIEW`. Resolver → `REVIEW_REQUIRED`. Importer → quarantine → U-5(a)
abort. Each layer as designed; the design did not say what an authoritative register's own row
should do.

## 3. In scope

1. **Resolver option.** `resolveSurname(db, input, { mixedScript: "RESOLVE_FLAGGED" })` lets a
   `MIXED_SCRIPT_REVIEW` input proceed to the T0/T1 lookup on its exact canonical key. The
   resolution then carries the real match status (`EXACT`/`KNOWN_VARIANT`/`MULTIPLE_EXACT`/`UNKNOWN`)
   **and** `validation_status: "MIXED_SCRIPT_REVIEW"`, `mixed_script: true`, the confusable flag,
   and `user_confirmation_required: true`. The default (`"REVIEW"`) is unchanged: the query path
   still returns `REVIEW_REQUIRED` and never touches the database for such input. Every other
   validation failure still short-circuits regardless of the option.
2. **Persisted finding.** Migration `0007_script_flags` adds to `surnames`:
   `mixed_script boolean NOT NULL DEFAULT false` and `script_confusable_flag boolean NOT NULL
   DEFAULT false`, with `CHECK (NOT script_confusable_flag OR mixed_script)`. The default is a fact
   for every existing row, not an assumption: the importer refused mixed-script rows until now, so
   no production-written surname is mixed-script.
3. **Importer.** The read pass resolves with `RESOLVE_FLAGGED`. A row whose resolution is `UNKNOWN`
   with `validation_status = MIXED_SCRIPT_REVIEW` creates its identity with both flags persisted
   exactly as detected; `EXACT`/`KNOWN_VARIANT` reuses; `MULTIPLE_EXACT` still quarantines and
   still aborts the run (U-5(a)). The reconciliation report gains `mixedScriptRows` (line and
   verbatim surname of every flagged row imported), and the CLI prints them. `rowsRead ===
   rowsImported + rowsQuarantined` still holds — flagged rows are imported.
4. **Nothing normalised.** The stored `canonical_display`, `form`, `unicode_nfc` and keys carry the
   bytes verbatim, U+040C included. `canonicalKey("HODŽIЌ")` is `hodžiќ`, distinct from every
   Latin-only key.
5. Tests, generated types, `PROGRESS.md`, `docs/CODEMAP.md`, D-014 → RESOLVED.

## 4. Out of scope

- Any change to the **query path**. A user typing `HODŽIЌ` still gets `REVIEW_REQUIRED`; the API
  contract is untouched. Surfacing the persisted flag in a result is a later presentation decision.
- Any confusable *mapping* (U+040C → `K`, `Ć` or anything). Forbidden by `docs/canonical/13` §5.6.
- Any change to U-5 for `MULTIPLE_EXACT`, `LOOKUP_FAILED`, `EMPTY`, control characters or the
  operational limit. Those still abort the run.
- Storing `detected_scripts[]`. Not derivable for existing rows without re-detection; the two
  booleans are the review/security flag §10.4 asks for.
- Re-running the male import. Its rows are unaffected (all `false`).

## 5. Acceptance criteria

- **AC-1** Default `resolveSurname` on `HODŽIЌ` → `REVIEW_REQUIRED`, `resolved_surname_id: null`,
  no database access (existing behaviour, asserted again).
- **AC-2** With `RESOLVE_FLAGGED` and no matching row → `UNKNOWN`, `validation_status:
  MIXED_SCRIPT_REVIEW`, `mixed_script: true`, `user_confirmation_required: true`.
- **AC-3** A synthetic file holding the two real rows plus an ordinary row imports as `IMPORTED`:
  three surnames created, `mixedScriptRows` names lines 3 and 4 verbatim, `rowsQuarantined: 0`.
- **AC-4** The two flagged rows persist with `mixed_script = true`, `script_confusable_flag = true`,
  `primary_script = 'Latn'`, `canonical_display` byte-identical to the source string; the ordinary
  row persists with both flags `false`.
- **AC-5** After the import, `RESOLVE_FLAGGED` on `HODŽIЌ` → `EXACT` with the flags; the default
  option on the same string still → `REVIEW_REQUIRED`.
- **AC-6** A `MULTIPLE_EXACT` row still aborts the whole run with `UNRESOLVED_ROWS` (existing test,
  unchanged).
- **AC-7** `0001`–`0007` apply to a fresh database and report no pending work on re-run; generated
  types are byte-identical to the committed file.
- **AC-8** The real female resource `1148811` imports: 420,082 read, 420,082 imported, 0
  quarantined, 2 flagged; `CURRENT_RANK` then produces a claim for a female surname over a
  420,082-row universe.

## 6. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
TEST_DATABASE_URL=… pnpm test:integration
DATABASE_URL=… pnpm db:migrate && pnpm db:generate-types && git status --short packages/db/src/generated/db.ts
pnpm --filter @name-atlas/sources run import-pesel --resource 1148811 --file <official csv> --metadata <resource json>
pnpm demo:surname "NOWAK" && pnpm demo:surname-rank "NOWAK"
pnpm build
```

## 7. Do not

- Do not map, fold or "correct" U+040C. Do not merge either row into a Latin-script surname.
- Do not silence `MIXED_SCRIPT_REVIEW` on the query path.
- Do not widen the completeness gate. The universe becomes complete because every row is stored,
  not because the gate accepts fewer.
- Do not stop after the tests: run the real import. That is the acceptance criterion that matters.
