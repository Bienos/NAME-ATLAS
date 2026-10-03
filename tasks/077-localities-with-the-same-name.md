# TASK-077 — Localities with the same name as the surname, from TERYT, under a line that says it is not where the surname began

- **Status:** IMPLEMENTED 2026-10-01 on `claude/hopeful-bohr-05xd4b`; record: `docs/progress/2026-10-01-localities-with-the-same-name.md`.
- **Requested by:** the project owner, 2026-10-01: on the cards proposal, "show localities with the same name under a warning line" (ADR-0025, deciders), then "go ahead" on the list of data not yet linked to a card.
- **Decision:** ADR-0025 §2.7: localities with the same name are a later card, "its own task: … the TERYT lookup and its warning line".
- **Depends on:** TASK-039 (the TERYT import, on `main`; the register is loaded on the VM), TASK-055 (the deck), TASK-054 (a section on its own source's rights).
- **Model guidance:** implementation session.

## 1. Goal

A resolved surname's page and deck show the localities in the official TERYT register whose name is the surname, each with its gmina, powiat and voivodeship, under a line saying that a shared name is a coincidence in the register and not where the surname began. A surname that matches no locality shows nothing: no chapter, no card.

## 2. Facts (checked on `main` @ `65ed574`, 2026-10-01)

1. TASK-039 loads SIMC's 101,865 localities as `places` with `spatial_precision = 'LOCALITY'`, one `OFFICIAL` row each in `place_names` with `normalized_name = canonicalKey(name)` (the resolver's own key, so a surname and a locality compare by the same rule), a `TERYT_SIMC` external id whose `valid_from` is the file's `STAN_NA`, and one `administrative_memberships` row to the gmina (a whole locality, `SYMPOD = SYM`) or to the locality it is part of. Gminas, powiats and voivodeships are places of type `MUNICIPALITY`, `COUNTY_DISTRICT` and `REGION`. Migration 0010 indexes `place_names (normalized_name)`.
2. `pl_teryt` is registered by the TASK-038 catalogue with `commercial_use = ALLOWED`, `automated_access = ALLOWED`, every other permission `UNKNOWN`, `review_status = LEGAL_REVIEW_REQUIRED`, `attribution_text = null` and `homepage_or_reference_url` set. `evaluateSurface` (`packages/truth/src/rights.ts`) answers `ALLOWED` for `FREE` on that profile and `BLOCKED` for `SEO` (`REDISTRIBUTION_UNRESOLVED`). `production_status` is read by the importer's gate only.
3. The archive section (TASK-054) is the pattern for a section on its own source: its state and surface come from that source's stored rights profile, it carries its own citation, and the page lists that citation once at the foot (ADR-0012), linked to `sources.homepage_or_reference_url`.
4. The deck has one card per ready section and none for the rest (ADR-0025 §2.3); a card without an image of its own shares the summary (TASK-056). The page hides the change chapter when it has no claim rather than stating the absence.
5. `apps/web/src/lib/result-view.test.ts` forbids the words "comes from", "originat", "pochodzi", "mieszka" and "lives in" anywhere on a resolved page, so the warning line must say what it says without them.
6. TASK-065 is taken by two open pull requests (#67, #69); ADR-0028 and ADR-0029 by #65 and #67; D-025 by #65 and D-027 to D-029 by #67, so D-032 is the next free decision. TASK-077 is free on `main` and in the open pull requests. No migration is needed: the lookup uses the indexes 0010 and 0023 made.

## 3. In scope

- **Contract 1.11.** A `localities` section, required and nullable, present exactly when `status` is `RESOLVED`: `READY` with the register's reference date, up to 20 whole localities in a fixed order (cities, villages, then the rest; by voivodeship, powiat, gmina, name), the total, a confidence, the citation and the surface; `NOT_LOADED` when the database holds no TERYT SIMC file; `RIGHTS_BLOCKED` on the source's rights. Zero matches is `READY` with no places, an answer, not an absence.
- **The read path.** `packages/truth/src/localities.ts`: the source, its rights profile and its active SIMC file record; the surface from the stored profile; the localities whose official name has the surname's canonical key, joined up through gmina and powiat to the voivodeship. Parts of a locality (SIMC rows whose parent is another locality) are not listed. No new derivation, no claim, no write.
- **The page.** A chapter "Które miejscowości tak się nazywają?" / "Which localities have this name?", after the archive chapter, shown only when at least one locality matches: the statement with its date, the warning line, the list, and TERYT once in the sources at the foot.
- **The deck.** A card after Polona's catalogue, with the same figures and the same line, sharing the summary image.
- **Tests.** Contract rules; the deck and page against rendered markup; an integration test against PostgreSQL with the real TERC and SIMC excerpts and one synthetic SIMC line.
- **Docs.** The contract document, `docs/CODEMAP.md`, `STATUS.md`, a progress record.

## 4. Out of scope

- Famous bearers (Wikidata), which needs a source registration and a decision about living people (ADR-0025 §2.7).
- A share image of its own for the card; a map of the localities (no geometry is loaded).
- Parts of localities, historical names, and name variants (a locality "Kowalskie" is not "KOWALSKI").
- Any change to `pl_teryt`'s rights profile or production status: the stored profile decides, as for every source. Its `redistribution = UNKNOWN` blocks the section on the SEO surface while the page's indexability folds claims only; that is D-032, the owner's.
- Any change to the full page's other chapters, or to the compare page.

## 5. Acceptance criteria

- **AC-1.** Against PostgreSQL with the TERYT excerpts: `JEMNA` lists Jemna (a village) in gmina Stoszowice, powiat ząbkowicki, DOLNOŚLĄSKIE, dated 2026-01-01; `WARSZAWA` lists the city and not its parts; `JELONKI` (a part) and `NOWAK` are `READY` with no place; a database without the SIMC file is `NOT_LOADED`; a profile that prohibits metadata is `RIGHTS_BLOCKED`, and the `SEO` surface is blocked by the stored profile as it stands; through `querySurnameResult` the section is on the response and the contract accepts it.
- **AC-2.** The contract refuses a `READY` section without its date, total, confidence or citation, a list longer than its total, a place listed twice, places on a section that is not `READY`, and the section on a surname that did not resolve.
- **AC-3.** The page shows the chapter exactly when a locality matches, with the warning line before the list, TERYT once in the sources, and none of the forbidden origin words; the deck has the card exactly then, with every figure the page prints.
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```
