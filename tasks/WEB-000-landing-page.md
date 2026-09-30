# WEB-000 — Landing page and national overview

**Status:** implemented (see `PROGRESS.md`).
**Requested by:** the project owner, directly ("design the main website and the landing page … apply these changes").
**Milestone:** ahead of M2. `docs/canonical/23` §39 puts the first consumer UI at M2 as WEB-001 (Free Profile v1). This task is the entry surface in front of WEB-001, so it takes the ID before it. It does **not** build WEB-001.

## 1. Goal

Replace the TASK-001 placeholder home page with the real landing page:

1. one job above the fold: type a surname and open its rundown;
2. below it, an honest, appealing picture of Polish surnames today, using only figures this repository has already verified;
3. every figure carries its source, scope and date, and every gap is stated rather than filled.

## 2. Design rationale

- **Search first.** The primary user arrives on mobile, curious, with no interest in learning genealogy (`PRODUCT.md` §2). The hero is one input and one button, with example surnames one tap away. It works without JavaScript (a plain `GET` form).
- **Show what a sourced number looks like before asking for anything.** The hero carries a "specimen" card: one real surname from the register with its published counts, list names and date. It sells the product's difference (sources and dates on every line) by showing it.
- **National picture as a data desk, not a dashboard.** Four stat tiles for the register itself (surnames on each list, smallest published count, reference date), then the fifteen highest counts on each list as two bar charts on one shared scale.
- **Honesty is the interesting part.** Three things the data cannot do are shown as features, not hidden: there is no grand total (the lists overlap), a missing surname is not a zero (single occurrences are withheld), and there are no trends yet (one edition). Each is explained in one plain sentence.
- **Typography carries the atlas feel.** Serif display headings, sans for every number and every surname, warm paper surface, one blue accent. Light and dark are both designed. No web fonts, no new dependencies.

## 3. In scope

- `apps/web/src/app/page.tsx` — the landing page: header, hero search, specimen card, national picture, most-frequent lists, trends state, spelling section, "what opens when you search", source card, footer.
- `apps/web/src/app/search/page.tsx` — the destination of the search form. Echoes the input exactly as typed and states plainly that surname pages are not open yet, listing what they will contain. `noindex`.
- `apps/web/src/lib/national-overview.ts` — builds the `NationalOverview` presentation object. Pure pass-through of verified values; no arithmetic on source values.
- `apps/web/scripts/generate-overview.ts` — writes that object to `apps/web/src/generated/national-overview.ts`, which the page imports. The page never parses source files, and a test fails if the committed module drifts from the verified records. (Reading the fixtures during `next build` is not possible: Turbopack does not map the sources package's `.js` specifiers to `.ts`.)
- `apps/web/src/lib/format.ts` — number and date formatting only.
- Styles (`globals.css`, CSS Modules) with light and dark tokens.
- Unit tests for the overview builder and the formatters.

## 4. Out of scope

- Surname resolution, the `POST /api/v1/surname-searches` endpoint, the surname profile page and `/pl/nazwisko/{slug}` routing — WEB-001 / M2.
- Any `Claim`, `EvidenceItem`, confidence or citation object — TASK-005.
- Any total across the two lists, any population, share, rank, rarity or `1-in-X` figure, any trend.
- Any map or regional figure (D-004).
- Polish-language copy and i18n routing. The page is in English, like the skeleton it replaces; source titles are shown verbatim in Polish.
- Analytics, SEO metadata beyond title/description, web fonts, a design-system package.

## 5. Data rules

The overview is assembled from two records the repository already owns and has verified. Nothing else.

| Figure | Read from | Verified in |
|---|---|---|
| Surnames on each list | `fixtures/pesel/source-manifest.json` → `row_count_excluding_header` | `docs/sources/pesel.md`, file-level facts |
| Reference date, portal date | manifest → `data_date`, `created` | `docs/sources/pesel.md`, item 7 |
| Dataset title, publisher, licence, frequency, URL | manifest → `dataset` | `docs/sources/pesel.md`, dataset-level facts |
| Smallest published count | `PESEL_MIN_VALID_COUNT` in `@name-atlas/sources` | confirmed from the bytes, `docs/sources/pesel.md` |
| Fifteen highest counts per list | the first 15 rows of each fixture, through `parsePeselFile` | fixture selection method 1, `docs/sources/pesel.md` |
| Spelling specimens (`NGUYỄN`, `MÜLLER`) | the fixtures, through `parsePeselFile` | fixture selection method 3 |

Binding rules, each asserted by a test:

1. Values pass through verbatim. The builder performs no arithmetic on a source value.
2. The two lists are never summed. No total exists in the object.
3. Counts are called "published counts", never people (D-006).
4. The two lists are named by the publisher's own titles; the partition basis is not asserted (TASK-004 §14 U-1).
5. The trend is an explicit `INSUFFICIENT_DATA` state while fewer than two editions are held.
6. The builder fails closed: a missing manifest field, differing reference dates across the two lists, or a fixture head that is not in descending order throws during generation and in the tests, rather than rendering a wrong number.

## 6. Known tension, recorded rather than resolved here

`ARCHITECTURE.md` §10 invariant 11 says presentation renders validated claims, and invariant 13 says a production source needs an approved `RightsProfile` before it reaches a production surface. No claim exists yet (TASK-005, blocked on D-006), and the PESEL `RightsProfile` is `LEGAL_REVIEW_REQUIRED`. This page renders source-published figures with lineage but without claims, and nothing is deployed. Recorded as **D-007** in `docs/DECISIONS_NEEDED.md`: it blocks public deployment of the national overview, not this build.

## 7. Acceptance criteria

1. `/` renders the hero search form, the specimen card, the four stat tiles, both most-frequent lists, the trends state, the spelling section, the rundown outline and the source card.
2. Every count on `/` shows its list and the reference date, or sits in a section whose caption states them.
3. Submitting the form navigates to `/search?surname=…`, which shows the input exactly as typed and no data about it.
4. `/search` with no or blank input shows the form again and no error.
5. The page is readable at 360 px wide with no horizontal scroll, and in dark mode.
6. `NationalOverview` unit tests pass, including: values equal the manifest; no sum of the two list sizes appears anywhere in the object; the trend state is `INSUFFICIENT_DATA`; each fail-closed case throws; the committed generated module equals a fresh generation.

## 8. Verification commands

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Then render `/` and `/search?surname=Kowalczyk` in a browser at 1280 px and 390 px, light and dark, and look at them.
