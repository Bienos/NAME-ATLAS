# 2026-10-03 — TASK-073: well-known bearers of a surname, from Wikidata

Scope authority: `tasks/073-famous-bearers.md`. Decision: ADR-0030 (the source, living people included at the owner's word, the claim, three on the free page). Raised and not built: D-033, a count of people by exact first name and surname, which no source found states.

## What changed

- `packages/sources/src/wikidata/` (new). `bearers.ts`, pure: the people query (humans with a Wikipedia article filed under family-name items labelled with the surname, plus the masculine item for a -ska/-cka/-dzka form), the details query for those kept, and `summariseWikidataBearers`, which counts only people whose own name ends with exactly the surname, keeps the 20 with the most sitelinks, drops `WIKIDATA_EXCLUDED_PEOPLE` (empty), cuts descriptions at 200 characters and refuses an answer that does not parse. `fetch.ts`: at least 1 s between queries, a 60 s timeout, three tries, `Retry-After` honoured, user agent `NameAtlas/1.0 (surname research; +https://name-atlas.pl/pl/kontakt)`. `source.ts`: inserts the catalogue's `global_wikidata` on first use and stores a surname's summary as one `API_OBJECT` source record, refreshed when unchanged and superseded when changed.
- `fixtures/wikidata-bearers/`: ZAREMBA's and KOWALSKA's answers as the query service served them on 2026-10-03, pinned by SHA-256; excluded from Prettier.
- `packages/db/migrations/0029_notable_bearers.ts`: the `NOTABLE_BEARERS` claim type, `SURNAME_LEVEL` only. Generated types updated.
- `packages/truth/src/bearers.ts` (new): derive, read by key and as text, project (three people on `FREE` and `SEO`, all kept on `PAID` and `INTERNAL`), select candidates (30-day refresh). `bin/bearers-load.ts` (new): `pnpm truth:bearers-load`.
- `packages/contracts/src/surname-result.ts`: schema 1.12 and the `bearers` section; `docs/contracts/surname-result.md` records it (invariants 29 and 30).
- `apps/web`: the chapter "Kto znany nosi to nazwisko?" / "Who well known has this surname?" after the archive (`result-view.tsx`, `sections.ts`, `messages.ts`, `globals.css`), with the caveat that a surname is not a family, each person's years, description and links, the remainder as coming in the report, and a link to ask for removal; the scope line reads "Świat" / "Worldwide" (`claim.tsx`). A deck card after Polona's catalogue (`deck.tsx`), sharing the summary image.
- Privacy notice (`legal-text.ts`), both languages, dated 2026-10-03: the people named, the basis (art. 6(1)(f) GDPR) and the right to object. `legalUpdated` shows the later of the notice's own date and the accounts variant's; the accepted terms version (`ACCOUNTS_LEGAL_UPDATED`) is unchanged.
- `docs/adr/0030-famous-bearers-from-wikidata.md`, `docs/DECISIONS_NEEDED.md` (D-033), `docs/CODEMAP.md`, `tasks/073-famous-bearers.md`.
- Tests: `bearers.test.ts` (new, 20), contract tests (4 new), chapter and deck tests in `result-view.test.ts` (7) and `deck.test.ts` (3), the other web fixtures carry `bearers` and schema 1.12, `tests/integration/src/notable-bearers.test.ts` (new, 7), and the integration tests that pin the schema version, the migration list or the `claim_type` values. `accounts.test.ts` now steps down to 0027 before testing its refusal.

## Observed while building it

- One query joining every person's labels, descriptions and articles timed out at 60 s; the people query alone answered in 2–5 s, and the details query for 20 ids in under a second.
- `wbgetentities` answered "You are making too many requests to the API" from this network, so the details come from the query service too.
- ZAREMBA: 59 exact bearers with a Wikipedia article, 37 with a date of death. KOWALSKA: 55 and 25; the items "Kowalska" and "Kowalski" together returned rows for every Kowalski, of which 325 are named exactly KOWALSKI.
- NOWAK, live: 451 people, 168 with a date of death. Ordered by sitelinks, the first three are Lisa Nowak (an American astronaut), Kazimierz Nowak and Cécile Nowak (a French judoka): the order favours people written about in many languages, not Polish fame.

## Verification (run 2026-10-03, on this branch; the checks, unit tests, build and integration tests re-run after the rebase onto `main` @ `619d365`)

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: each exit 0.
- `pnpm test`: exit 0. Among them `packages/sources` 583, `packages/truth` 375, `packages/contracts` 135, `apps/web` 591 (final run, after rebasing onto `main` @ `619d365`).
- `pnpm build`: exit 0.
- Against a local PostgreSQL 16 with PostGIS 3 (installed in this session from Ubuntu packages): `TEST_DATABASE_URL=… pnpm test:integration` exit 0, 31 files, 373 tests. The first full run failed four tests that pin the migration list, the `claim_type` values, or migrate down from the top (`extensions`, `current-rank`, `canonical-key-v2`, `accounts`); they were updated. `pnpm test:golden`: exit 0, 364 tests.
- Live, against a scratch database seeded with the committed PESEL male fixture: `pnpm db:migrate` applied 0029; `pnpm truth:bearers-load --surname NOWAK` printed "stored, claim derived, 451 people, 168 with a date of death, 20 kept, 4355 ms"; a second run printed "unchanged, claim unchanged".
- Headless Chromium at 1440 × 900 and 390 × 844 against `next dev` and that database: `/pl/nazwisko/nowak`'s chapter, sentence, caveat, three people and both links, with no horizontal overflow at either width; with `?view=cards` at 1440 the deck holds the card "Znane osoby" before the summary. The scratch database was dropped.

## Not verified

- The load over many surnames: the query service's limits over thousands of queries. The loader reports each failure and stops after ten in a row.
- The deck card at phone width: the script read no card titles at 390 × 844 (the phone deck deals cards as they are swiped in); the card's markup is covered by `deck.test.ts`.
- Nothing ran in production. Migration 0029 must reach the VM after 0028 (#67, #76, #77, #79) or be renumbered; there is no VM step for the load.
- The privacy text is not a lawyer's review.
