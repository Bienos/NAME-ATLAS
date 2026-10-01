# TASK-054 — Polona archive availability on the surname page

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu` (`docs/progress/2026-10-01-polona-archive-availability.md`).
- **Requested by:** the project owner, 2026-10-01: "Price is 24.99 and 149.99 for some extra pro research, load data for this, it's good it's signed off". Asked what was signed off, they chose "Polona access"; asked how far the connector may go, "Everything allowed"; asked whether payments are ready, "Not yet, build in test".
- **Decisions:** ADR-0024 (Polona access, its source default, `ARCHIVE_AVAILABILITY`), resolving D-021 items 1 and 4. ADR-0023 records the two products and their prices; this task builds none of the purchase.
- **Milestone:** `docs/canonical/23` M3 (Polona connector), the data under M4 (premium inventory).
- **Depends on:** TASK-031 (Polona parser and rights mapping), TASK-053 (the journey's screens), both on `main`.
- **Model guidance:** implementation session.

## 1. Goal

Each top-ranked surname's page answers "where does it appear in old print?" from Polona: how many pages of works not under copyright and how many catalogue records match the word, when and where those pages were printed, and up to three quoted public-domain pages linked to their scans. The answer is a claim like every other figure on the page, loaded ahead of time, never fetched when a page is viewed.

## 2. Facts (checked on `main` @ `9c3c08d`, 2026-10-01)

1. `packages/sources/src/polona/` has TASK-031's search parser and `classifyPolonaRights`, and no connector.
2. `docs/canonical/11` §11 defines `ARCHIVE_AVAILABILITY` as a `FACT`, `VERIFIED` within the searched scope. The `claim_type` enum has no such value.
3. Polona's metadata search answers `POST /api/search-service/search/simple` with a total and facets (category, licence, …). Its full-text search answers `POST /api/search-service/fulltext/polona/fulltext/0/{size}` and filters to works that are not copyright-protected (`keywordFilters.copyright: ["false"]`) and to dates (`temporalFilters.dates.startRange`/`endRange`). All observed 2026-10-01.
4. Unquoted, Polona reads a hyphen as an operator: `KOWALSKA-NOWAK` matched 507,536 pages, `"KOWALSKA-NOWAK"` 3.
5. Polona's viewer counts scans from zero and its search from one: `item-view/{id}?page=121` showed the scan the search calls page 122.
6. Polona serves a rights statement TASK-031 never saw ("Uznanie Autorstwa 3.0 Polska" under "Zawartość chroniona - licencja ograniczona"); the strict hit parser refuses it.
7. Production reads the VM's database (ADR-0017), which has migrations up to 0023. Open pull request #43 (TASK-051) holds migration 0024 and schema 1.7, and #43 also holds ADR-0020.
8. Task number 054, ADR-0023 and ADR-0024, and migration 0025 are free on `main` and in the open pull requests #30, #43 and #44.

## 3. In scope

- **The connector.** `inventory.ts` (pure): the eight requests a surname takes (the catalogue search, the page search with ten hits, and one page count per period: before 1800, 1800–1849, 1850–1899, 1900–1918, 1919–1939, 1940 on) and the summary built from the answers. `fetch.ts`: one request at a time, at least one second apart, a 30-second timeout, three tries with back-off, a user agent naming Name Atlas. `source.ts`: the `pl_polona` source and its rights profile (ADR-0024 §2.3), and the inventory stored as a `source_records` row, refreshed when unchanged and superseded when changed.
- **Examples fail closed.** A hit whose rights do not classify as public domain, or that does not parse, is counted and not quoted.
- **The claim.** Migration 0025 adds `ARCHIVE_AVAILABILITY`, `SURNAME_LEVEL` only. `deriveArchiveAvailability` writes the run, evidence, claim, assessment (`VERIFIED`) and citation, superseding on change and adding nothing when unchanged.
- **The read path.** `archiveSectionFor` reads the claim by its key and as text, so a database without migration 0025 answers `NOT_SEARCHED` instead of failing; rights are evaluated per surface. Contract schema 1.8 adds `archive`, present exactly when the result is `RESOLVED`.
- **The loader.** `pnpm truth:archive-load --top-rank N [--limit N] [--refresh-days 90]` or `--surname NAME`: best rank first, skips a surname searched within the refresh window, stops after ten failures in a row.
- **The page.** A chapter "Gdzie pojawia się w dawnych drukach?" / "Where does it appear in old print?" after the meaning: the sentence, the caveat that a match is a word, pages by period as bars, the places of publication, and the quoted pages. Its caveat also goes to the page's notes.
- **The VM.** `ops/vm/archive.sh` and a Register VM step `archive`: migrate, then start the load as a systemd unit and return; `status.sh` reports it.

## 4. Out of scope

- **Anything a buyer pays for** (ADR-0023): the report, the expert research order, the entitlement and Stripe. Payments need a business, a Stripe account, VAT/KSeF and consumer terms first.
- **Verified occurrences of the surname** (`HISTORICAL_OCCURRENCE`): per-hit review or OCR alignment. The counts stay word matches.
- **OCR downloads and IIIF images.** Allowed by ADR-0024, not needed for counts and excerpts.
- **Calling Polona when a page is viewed.**
- **Surnames ranked below the limit** and a schedule for the 90-day refresh; a later run of the `archive` step refreshes.
- **New rights statements in the vocabulary.** They stay withheld until added deliberately.

## 5. Acceptance criteria

- **AC-1.** The summary of ZAREMBA's captured responses carries Polona's totals and per-period counts, quotes only public-domain pages with excerpts of at most 300 characters and links to the right scan, and refuses an envelope that does not parse (unit tests over pinned fixtures).
- **AC-2.** The fetcher sends one request at a time at least a second apart, names Name Atlas, retries after a pause and gives up after three tries (unit tests with a fake clock and network).
- **AC-3.** Against PostgreSQL: a surname not searched reads `NOT_SEARCHED`; Polona is registered once; a stored inventory derives one claim and reads back `READY`; the same answer adds nothing; a changed answer supersedes record and claim; blocked rights refuse the section and its links; the candidates come best rank first and skip a surname searched within the window (integration tests).
- **AC-4.** The chapter renders the sentence in both languages, the caveat before the figures, the periods, places and quoted pages, the not-searched and blocked states, and a zero answer as an answer (unit tests on rendered markup).
- **AC-5.** The contract accepts a `READY` section only with its query, date, counts, confidence and citation, and refuses figures on any other state (unit tests).
- **AC-6.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=postgres://… pnpm --filter @name-atlas/integration-tests test:integration
```
