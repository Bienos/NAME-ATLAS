# TASK-073 — Well-known bearers of a surname, from Wikidata, on the page and in the deck

- **Status:** IMPLEMENTED 2026-10-03 on `claude/blissful-johnson-450rie` (`docs/progress/2026-10-03-famous-bearers.md`).
- **Requested by:** the project owner, 2026-10-03: "do the famous bearers card from Wikidata", then "I only want to use famous people with specific surname then in premium search also how many people are holding the exact name and surname so it should include living people".
- **Decisions:** ADR-0030 (the source, living people, the claim, the tiers). The full-name count is D-033 and is not built here.
- **Milestone:** ADR-0025 §2.7's later card; the data under M4 (premium inventory).
- **Depends on:** TASK-038 (the source catalogue's `global_wikidata`), TASK-054 (the pattern of a source's query output as a claim), TASK-055 (the deck), all on `main`.
- **Merge order:** migration 0029 must reach a database after 0028 (#67, #76, #77, #79). Kysely refuses a migration that sorts before one already applied, so if this lands first, renumber 0029 or apply both in order. Contract 1.12 likewise sits above 1.11 (`localities`, #70, #77).

## 1. Goal

Each loaded surname's page answers "who well known has this surname?" from Wikidata: how many people with exactly this surname have a Wikipedia article, Polish citizens first, then the most widely written about, each with years, a one-line description and a link. Living people are included (ADR-0030 §2.4). The answer is a claim like every other figure, loaded ahead of time, never fetched when a page is viewed.

## 2. Facts (checked on `main` @ `41d00d9` and `619d365`, 2026-10-03)

1. `global_wikidata` is in the source catalogue (CC0, every stated dimension `ALLOWED`, review `LEGAL_REVIEW_REQUIRED`, which blocks no surface).
2. The query service answered a per-surname query in 2–5 s; a query joining labels, descriptions and articles for every person timed out at 60 s. `wbgetentities` answered "too many requests" from this network.
3. Family-name items are instances of Q101352, Q18972245, Q18972207, Q29042997, Q106319018 or Q60558422; disambiguation pages and fictional characters share their labels.
4. ZAREMBA: 59 exact bearers with a Wikipedia article, 37 with a date of death. KOWALSKA: 55 and 25, out of 3,392 rows for the items "Kowalska" and "Kowalski" together.
5. Task 073, ADR-0030, migration 0029, D-033 and schema 1.12 are free on `main` (@ `619d365`) and in the open pull requests. The session first took 072, which #80 took on `main` while this was being built.

## 3. In scope

- **The connector** (`packages/sources/src/wikidata/`): the two queries, the exact-surname filter, the summary (`wikidata_bearers@1`, up to 20 people), the paced fetcher, the exclusion list, and the summary stored as a `source_records` row under `global_wikidata`.
- **The claim.** Migration 0029 adds `NOTABLE_BEARERS`, surname-level only. `deriveNotableBearers` writes run, evidence, claim, assessment (`VERIFIED`) and citation, superseding on change.
- **The read path.** `bearersSectionFor` reads the claim by key and as text; contract 1.12 adds `bearers`, present exactly when `RESOLVED`; three people on `FREE` and `SEO`, all kept on `PAID` and `INTERNAL`.
- **The loader.** `pnpm truth:bearers-load --top-rank N [--limit N] [--refresh-days 30]` or `--surname NAME`.
- **The page.** A chapter "Kto znany nosi to nazwisko?" / "Who well known has this surname?" after the archive: the sentence, the caveat, the people, the remainder as coming in the report, a link to ask for removal.
- **The deck.** A card after Polona's catalogue, before the summary; it shares the summary image.
- **The privacy notice**, both languages: the processing, its basis and the right to object.

## 4. Out of scope

- **The full-name count** (D-033). No source states it.
- **A share image of its own** for the card, and the paid report.
- **A VM step** to run the load in production; the loader runs wherever the database is reachable.
- **Photographs**, dates finer than a year, and any Wikidata property beyond name, description, years and articles.

## 5. Acceptance criteria

- **AC-1.** The summary of ZAREMBA's and KOWALSKA's captured answers counts exact bearers only, keeps at most 20, Polish citizens first and then the most sitelinked, links only Polish or English Wikipedia, honours the exclusion list, and refuses an answer that does not parse (unit tests over pinned fixtures).
- **AC-2.** The fetcher sends queries at least a second apart, names Name Atlas, honours `Retry-After`, and gives up after three tries (unit tests with a fake clock and network).
- **AC-3.** Against PostgreSQL: not queried reads `NOT_SEARCHED`; Wikidata is registered once from the catalogue; a stored answer derives one claim and reads back `READY` with three people on `FREE` and 20 on `PAID`; the same answer adds nothing; a changed one supersedes; blocked rights refuse the section; candidates come best rank first and skip one queried within the window (integration tests).
- **AC-4.** The chapter renders the sentence in both languages, the caveat before the people, years for the living and the dead, the remainder and removal links, the not-searched state, and a zero as an answer; the deck card lists the people with the count and date, and is absent with nobody (unit tests on rendered markup).
- **AC-5.** The contract accepts a `READY` section only with date, counts, confidence and citation, refuses people on any other state, and refuses people and remainder that do not add up to the total (unit tests).
- **AC-6.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=postgres://… pnpm --filter @name-atlas/integration-tests test:integration
```
