# 2026-09-29 — TASK-032: *Onomastica* source spike

**Scope:** `tasks/032-onomastica-source-spike.md`, approved by the project owner on 2026-09-29 once it was reconciled with `main`. Branch `claude/procent-continuation-7c2e00`:

- restarted from `main` @ `5f21045`, after #13 merged;
- commit `a84a624` reconciles the spec;
- the spike follows in the next commit.

## Changed

- **`tasks/032-onomastica-source-spike.md`** (commit `a84a624`). The rebase note is folded into the spec:
  - D-002 is resolved by ADR-0008, so AC 14 becomes an assessment against ADR-0008 §4;
  - `RightsProfile` proposals must fit ADR-0007;
  - `Source` proposals are mapped onto `importOnomasticSource`;
  - progress goes to `docs/progress/` and `STATUS.md`.

  The status line now reads IMPLEMENTED.
- **`docs/sources/onomastica.md`** (new): the record. Every §7 item is answered or marked `UNRESOLVED` with its reason.
- **`docs/sources/acquisition/2026-09-29-onomastica/`** (new):
  - a provenance `README.md`;
  - `inventory.csv`, with 633 rows: 373 from the journal's site and 260 from journals.pan.pl;
  - `SHA256SUMS.txt`, with 971 lines for every byte retrieved;
  - `metadata/`, with 51 verbatim responses. That directory is already excluded from formatting by `.prettierignore`'s `docs/sources/acquisition/**/metadata/`.

  No PDF, page image or article text is included.
- **`docs/DECISIONS_NEEDED.md`:** new **D-022**. Can the CC BY-ND 4.0 licence the journal declares for vol. 64 (2020) onward be relied on, given the statements that contradict it? D-002 and ADR-0008 are unchanged.
- **`docs/sources/INVENTORY.md` §6:** a row for the captures, and the section's first sentence.
- **`docs/CODEMAP.md`:**
  - rows for the record and the acquisition directory;
  - the `tasks/` row now gives 032 as implemented and adds 036, which #13 merged without listing.
- **`STATUS.md`:**
  - the last-rewritten line, Built and the CI line;
  - the database row: `main` now has 22 migrations, and `0022` from #13 reaches production with TASK-035;
  - Next: an *Onomastica* ingestion task, blocked on D-022;
  - open pull requests: #13 merged;
  - the delete list gains `claude/cache-rarity-denominator`;
  - the decisions line.

No code changed. The spike's tools ran from the session's scratch space and are not repository dependencies:

- `pypdf` 6.19.0 and `pdfminer.six` 20260107 for the PDFs;
- a throwaway `tsx` script importing `packages/truth/src/rights.ts` for the ADR-0007 evaluation.

## Found

- **Three channels, all named by the publisher's "Essential facts" page:** the journal's OJS site, journals.pan.pl and RCIN. The DOIs resolve to the OJS site.
- **OJS:** vols 59–69 (2015–2025), 373 live items; all 383 PDFs were retrieved (371 article, 12 whole-issue). Per volume, the article PDFs print:
  - nothing, for 2015–2018;
  - open access and ©, for 2019;
  - CC BY-ND 4.0 International, for 2020–2025.
- **The journal's own terms conflict:**
  - "Essential facts" and DOAJ give CC BY-ND 4.0 from vol. 64;
  - the Guidelines page gives a Creative Commons licence only "in the future";
  - the agreement template names BY-ND 3.0 but links BY-SA 3.0;
  - an unlinked BY-ND 3.0 badge is on every page;
  - the article metadata has an empty licence URL, and no Crossref record has a licence.
- **The 2026-09-24 "No 64" inconsistency is refuted for the OJS copies,** where name, URL and link agree. It is **confirmed** for the journals.pan.pl copies. Their 23 vol. 64 articles print "4.0 Poland" with a BY-NC-ND URL and link the BY-ND legal code. The two channels serve different files: no linked pair is byte-identical.
- **journals.pan.pl and RCIN** answered almost every OAI and HTML request with a "High Load - Verifying Browser" proof-of-work page, which was never bypassed. journals.pan.pl's `/Content/` file requests never received it, and all 260 known items were requested. That gave 128 PDFs (No 60–64), plus 132 plain-HTTP whole-volume targets (No 56–59) that were recorded and not requested. 38 of journals.pan.pl's 298 records and all of RCIN stay UNRESOLVED.
- **ADR-0008 §4:** no *Onomastica* article is admissible today. All five proposed `RightsProfile`s keep every permission `UNKNOWN`, and `rights.ts` returns BLOCKED for transcription on every public surface and for PAID and SEO on every asset.

## Verified

Every command was run from the repository root on the branch's working tree.

| Command | Result |
|---|---|
| `pnpm install --frozen-lockfile` | exit 0 |
| `pnpm check:ids` | "check-unique-ids: every task, ADR, migration and decision number is used once". D-022 is free on `main` and in #15. |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` | exit 0 |
| `pnpm format:check` | "All matched files use Prettier code style!" |
| `pnpm test` | exit 0: 1,060 passed in 13 packages, 0 failed, the same as `main` @ `5f21045` |
| `pnpm build` | exit 0; no line containing "warn". This was a warm build. A cold build of `main` prints one Next.js Edge-runtime warning (`process.cwd`), seen while re-verifying #13; no code here changed. |
| `sha256sum -c`, the 51 `metadata/` lines | exit 0, no mismatch |
| `sha256sum -c`, the 920 `retrieved/` lines (scratch layout) | exit 0, no mismatch |

## Not verified

- **38 journals.pan.pl records**: their OAI records were not retrieved, because of the browser-verification page. They have no inventory row.
- **journals.pan.pl's four other metadata formats and its HTML journal pages:** UNRESOLVED, for the same reason.
- **RCIN:** its holdings, identifiers and terms are all UNRESOLVED. Every OAI-PMH request from 13:59 on received the browser-verification page.
- **The whole-volume files for No 56–59:** on plain-HTTP hosts, not requested. Their printed terms are unknown.
- **The Polish-language versions of the OJS policy pages:** they need a session cookie, and the English pages were served.
- **The `.docx` agreement file linked from "Essential facts":** it answered 404.
- **Legal meaning:** nothing here interprets a licence beyond its text. Whether a structured meaning claim is "Adapted Material" under BY-ND is question N7 for the rights holder.
- **`pnpm test:integration` and `pnpm test:golden`** were not run locally. No code changed; CI runs both.
