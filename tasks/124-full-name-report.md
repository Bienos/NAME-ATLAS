# TASK-124 — The full-name report: a first name and a surname, frozen and previewed

- **Status:** IMPLEMENTED 2026-10-05 (`docs/progress/2026-10-05-full-name-report.md`). Migration 0039 is not applied on the VM, no report is built on production, and the preview stays dark.
- **Number:** 124, migration 0039, ADR-0041. `main` holds TASK-123 and migration 0038, and there was no open pull request on 2026-10-05.
- **Requested by:** the project owner, 2026-10-05: "build the full-name report", after TASK-122 (#147) merged. They chose "Name + surname" over a first-name-only report, and "Stored + preview" over storage alone (§6).
- **Decision:** ADR-0041 (proposed).
- **Model guidance:** implementation session.

## 1. Goal

Make the full-name report D-043 put in the 28,99 zł tier real, as an internal test artifact. For a first name and a surname, an operator's command freezes one immutable report. Its first chapter is the first name's counts and ranks; the surname's nine chapters follow. The flag-gated preview shows it. Nothing is sold.

## 2. Facts (2026-10-05)

1. TASK-119 freezes a surname's report, `report@0`, with nine sections and their claim references; versions are immutable. TASK-120 previews a version at `/pl/raport/{id}` and `/en/report/{id}` when `REPORT_PREVIEW_ENABLED=1`.
2. TASK-122 stores `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` per name and per list. A rank stands only over a complete official list, so on the committed excerpts no rank claim exists.
3. D-043: paid, in the 28,99 zł tier, for every listed name. Meanings only from a free permission or the public domain; none exists.
4. D-033 and ADR-0032 §7: no count of people with a first name and a surname together, and no such figure built from two counts.
5. ADR-0032 §4: a doubtful form (one character, or a full stop) is not shown until reviewed.

## 3. In scope

- **Migration 0039:**
  - `reports.given_name_id`;
  - the type `FULL_NAME`, with a check that the first name is present for `FULL_NAME` and only there;
  - one report per subject and entitlement;
  - the section type `GIVEN_NAME`.
- **`packages/truth/src/given-name-facts.ts`:**
  - `readGivenNameFacts` reads a first name's active claims, per list, with confidence and citation, gated by the source's rights on the surface.
  - `parseGivenNameFacts` checks a frozen copy of those facts.
- **`buildFullNameReport(db, { givenName, surname })`** in `report.ts`:
  - The surname's part is read as `buildReport` reads it. Both names' claims are read before and again in the writing transaction; `CLAIMS_CHANGED` writes nothing.
  - `GIVEN_NAME_NOT_FOUND` for a name not on the lists (placeholders included), and `GIVEN_NAME_UNREVIEWED` for a flagged form.
  - Ten sections: `GIVEN_NAME`, then the nine. The first name's citations lead SOURCES. LIMITATIONS adds the missing meaning, the missing joint count, and each list without a rank.
  - The first name's claims are referenced in `GIVEN_NAME`: the count as HERO, the rank as SUPPORT, and LIMITATION when the frozen facts do not show them.
- **`buildReport`** writes through the same code, unchanged in what it stores.
- **`readReportVersion`** returns the report type.
- **`pnpm report:build -- --surname NAME --given-name NAME`.** It never prints a full name.
- **The preview:**
  - the full name on the cover;
  - the "Imię / First name" chapter, with each list's count and "rank of N", footnoted, and a missing rank shown as missing;
  - the two gaps under "what we don't know";
  - the surname's eligibility shown only as the surname part's.

## 4. Out of scope

- A meaning for first names, a count for the two names together, second names.
- Selling, an entitlement other than INTERNAL_TEST, the offer page, a link to the preview.
- A change to `eligibility@0`.
- Applying 0039 on the VM, and building on production.

## 5. Acceptance criteria

- AC-1: a full-name report stores ten sections in order. The first name's chapter has one count per list, never summed, and its claims are referenced. Its citations lead the bibliography.
- AC-2: the frozen payload holds the publisher's counts per list, and no figure for the two names together.
- AC-3: a rebuild is version 2. The surname's own report is separate. The database refuses:
  - a second report for the same subject;
  - a `FULL_NAME` report without a first name;
  - a `NAME_ATLAS` report with one.
- AC-4: a placeholder, a flagged form or an unknown surname writes nothing.
- AC-5: a name with no claims says so and is never shown as zero.
- AC-6: a first name whose rights block the surface shows no figure, and its claims are references of kind LIMITATION.
- AC-7: the preview renders a full-name version in both languages.

## 6. Decisions of the owner (2026-10-05)

- **U-1. Decided: name and surname.** Offered one report for the full name or a first-name report alone, the owner chose the full name.
- **U-2. Decided: stored and previewed.** Offered storage with the preview, or storage alone, the owner chose both.

## 7. Verification

`pnpm typecheck`, `lint`, `format:check`, `check:ids`, `check:vm`, `test`, `db:migrate`, `db:generate-types` (no diff), `test:integration`, `test:golden`, `build`, `e2e:seed`, `test:e2e`. Then `pnpm report:build` with `--given-name` on a database with first names, and the preview against `next start` with the flag, at 1440 and 390 px.
