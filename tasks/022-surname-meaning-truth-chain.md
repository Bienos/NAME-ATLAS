# TASK-022 — the `SURNAME_MEANING` truth chain (D-002)

- **Status:** IMPLEMENTED 2026-09-21.
- **Milestone:** the meaning/etymology capability D-002 blocked.
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-002, by ADR-0008.
- **Depends on:** ADR-0007 (TASK-021) — the rights gate is what makes this safe to build before any
  licence exists.
- **Canonical basis:** `docs/canonical/11` §8's claim taxonomy (`SURNAME_MEANING`: Surname →
  meaning/root, `INTERPRETATION`, scholarly onomastic evidence, LIKELY/POSSIBLE/CONFLICTING) and §7.2
  (`MeaningInterpretation`); `docs/canonical/12` line 764 (IJP PAN = PARTNER P0).

## 1. Goal

A surname result can carry a **sourced** meaning, and says so honestly when it carries none. Every
interpretation traces to a citable source whose rights permit the surface it appears on. Nothing is
generated.

## 2. In scope

1. **Migration `0014_surname_meaning.ts`** — `claim_type` gains `SURNAME_MEANING`, with the scope
   constraint that it is `SURNAME_LEVEL`, mirroring `CURRENT_POPULATION`'s.
1b. **Migrations `0015_surname_meaning_scope.ts` and `0016_citations_per_source_record.ts`** — the
   `SURNAME_LEVEL` scope constraint (separate from `0014` because a `::text` comparison is needed to
   avoid PostgreSQL's "unsafe use of new value"), and widening `citations_claim_uq` to
   `(claim_id, source_record_id)` so a claim resting on two works cites both. See ADR-0008's
   consequences: the property `0004` wanted is preserved.
2. **`packages/sources/src/onomastics.ts`** — the source-file format and a fail-closed parser.
   ADR-0008 §4's four admissibility conditions are checked at parse time; an entry missing a citation,
   a locator or a licence basis is refused. `synthetic: true` files are refused unless the caller
   passes `allowSynthetic`.
3. **`importOnomasticSource`** — writes `Source`, `rights_profile` and one `SourceRecord` per file
   version, checksum-pinned, idempotent on identical bytes, exactly as the PESEL importer does.
4. **`packages/truth/src/meaning.ts`** — `deriveSurnameMeaning`: one `EvidenceItem` per attributed
   interpretation (`SCHOLARLY_SOURCE`, `MACHINE_EXTRACTED`), one `SURNAME_MEANING` claim per surname,
   `ConfidenceAssessment` by ADR-0008 §5's table, `Citation` per evidence item. Idempotent by
   `claim_key`.
5. **The read path** — `readSurnameMeaning`, and a `meaning` section on the surname result at schema
   **1.4**, present exactly when the status is `RESOLVED`, carrying `AVAILABLE`,
   `NO_SOURCED_MEANING` or `UNAVAILABLE`.
6. **The page** — the meaning section in Polish and English, including the gap sentence.
7. **A synthetic fixture** proving the chain end to end without inventing Polish etymology that could
   be mistaken for data.

## 3. Out of scope

- **Any real onomastic corpus.** None is licensed, and ADR-0008 §3 makes zero coverage the correct
  launch state. This task builds the chain; a source is a later import.
- **`MeaningInterpretation` as a table** (`docs/canonical/11` §7.2). The claim's `structured_value`
  carries root form, language, gloss and formation type; nothing queries by root yet (ADR-0008
  consequences, `ARCHITECTURE.md` §10 invariant 10).
- `LINGUISTIC_ORIGIN`, `GEOGRAPHIC_ORIGIN`, `SURNAME_FORMATION_TYPE`, `ROOT_INTERPRETATION` — separate
  canonical claim types, each needing its own evidence. §7.2's own note applies: "the root means X"
  and "the surname derives from this root" are different claims.
- Any inference from surname form. Explicitly prohibited by ADR-0008 §2.

## 4. Acceptance criteria

- **AC-1** A surname with no admissible onomastic evidence yields **no claim**, and the read path
  reports `NO_SOURCED_MEANING` with a reason code — not an empty list and not an omitted field.
- **AC-2** One admissible source yields one claim assessed `POSSIBLE`; two agreeing yield `LIKELY`;
  two differing yield `CONFLICTING` with **both** interpretations retained.
- **AC-3** An entry missing author/title/year, a locator, or a licence basis is refused at import, and
  the refusal names what was missing.
- **AC-4** A `synthetic: true` file is refused unless `allowSynthetic` is passed.
- **AC-5** A source whose rights block the surface yields `UNAVAILABLE` with the rights reason code,
  and **no interpretation text in the payload** — omitted, not sent-and-hidden.
- **AC-6** A source below `C_SCHOLARLY_SECONDARY` is refused.
- **AC-7** Re-derivation over unchanged evidence creates no second live claim.
- **AC-8** Every evidence item carries a `Citation` naming the work and the locator.
- **AC-9** The contract validates: `meaning` present exactly when `RESOLVED`; interpretations
  non-empty exactly when `AVAILABLE`.
- **AC-10** The page renders the gap sentence in both languages, and never renders a root or gloss the
  claim did not carry.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm test:integration && pnpm build
```

plus the page rendered against `name_atlas_dev` for a real surname, showing the gap state.
