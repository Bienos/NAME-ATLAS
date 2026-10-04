# TASK-100 — The couple report: two surnames' facts side by side, dark behind a flag

- **Status:** SPECIFIED 2026-10-04. Not implemented.
- **Requested by:** the project owner, 2026-10-04: asked about "a name and couple compatibility", offered three framings, they chose **"A"** (facts side by side, no score) and approved "an ADR plus a task".
- **Decision:** ADR-0035 (proposed here). It answers D-025 §1.
- **Depends on:** TASK-025 (the comparison), the surname result contract (`docs/contracts/surname-result.md`, through 1.12), all on `main` @ `d655a45`.
- **Model guidance:** implementation session.

## 1. Goal

A page that sets two surnames' existing facts side by side for a couple: the names they could carry and how many people carry each, where each name lives, how common each is and how it has changed, what each means, famous bearers and same-name localities. **No score and no figure computed from the two together.** The page is off unless `COUPLE_REPORT_ENABLED` is exactly `1`, so production does not change.

## 2. Facts (checked on `main` @ `d655a45`, 2026-10-04)

1. `/pl/porownaj` and `/en/compare` take `?a={slug}&b={slug}` (`apps/web/src/app/pl/porownaj/page.tsx`). `comparisonRequest` (`compare-request.ts`) turns typed surnames into slugs with a redirect, or returns `PICK` for the picker. `loadComparison` (`compare-page.tsx`) loads each side's surname result with the shared database.
2. The surname result carries `meaning` (1.4), `change` (1.7, 1.9), `other_form` (null unless the -ski/-cki/-dzki rule pairs it and the form is ranked), `localities` (1.11) and `bearers` (1.12), with the distribution and population.
3. `otherGrammaticalForm` and `readOtherForm` are in `packages/truth/src/neighbours.ts`.
4. Hyphenated surnames are surnames of their own on the PESEL lists (`docs/sources/pesel.md`, "Nazwisko aktualne"; ADR-0018's `HYPHENATED_TOP`). The committed national fixtures hold none; the regional fixtures hold four rows with a hyphen.
5. Feature flags follow `family-config.ts`: a pure function over `process.env`, importing nothing that reaches the database, used by the pages and the header.
6. Messages live in `apps/web/src/lib/messages.ts`, Polish and English, with a parity test.

## 3. In scope

### 3.1 The flag

- `couple-config.ts`: `COUPLE_REPORT_ENV = "COUPLE_REPORT_ENABLED"`, and `coupleReportEnabled(env)` true only when it is exactly `1`. Off: both pages answer 404, and nothing links to them.

### 3.2 The pages

- `/pl/para?a={slug}&b={slug}` and `/en/couple?a={slug}&b={slug}`. Typed surnames and the picker reuse `comparisonRequest` and `ComparePicker`, with the couple's own title and action.
- Dynamic, `robots: noindex`, in no sitemap, `Cache-Control: private, no-store`.
- Title: **"Wasze nazwiska razem"** / "Your names together", with the two surnames.

### 3.3 Contents, in this order (ADR-0035 §2.2)

1. **The names you could carry.** For surnames A and B: A, B, each one's `other_form` where present, and the joined names A-B and B-A, each also with a part's other form where that part has one. Each name gets one register lookup through the existing resolver: on the list, its count and list (men's or women's); not on the list, **"Nie ma go na liście PESEL"** / "Not on the PESEL list", never 0. Duplicates are shown once. At most 8 names.
2. **Where each name lives.** Each surname's voivodeship distribution, as the surname page draws it, A and B side by side. A missing or suppressed region reads as the surname page reads it. No shared region, overlap or difference is computed.
3. **How common each is, and its change,** from `population` and `change`, each with its own list and dates.
4. **What each name means,** from `meaning`, or its stated absence.
5. **Famous bearers** and **localities of the same name**, each surname's own section as the surname page renders it, with "nosi to nazwisko — to nie Twój krewny" kept.
6. Below: a link to each surname's page, and to the free comparison of the two.

### 3.4 Wording rules

- No word that judges the couple: no "pasujecie", "dopasowanie", "zgodność", "match", "compatible", "made for each other", no percentage about the couple and no hearts score. A test asserts that none of these strings appears in the page's messages.
- No figure for the exact first name and surname (D-033); no given names.

### 3.5 Tests and docs

- Tests: the flag (off → 404 for both pages; on → 200); the names list (other forms, both joined orders, duplicates once, at most 8, "not on the list" never 0); a surname with no `other_form`; a surname with no meaning; the banned-words test; `noindex` and the cache header; message parity.
- Docs: `docs/CODEMAP.md`, `STATUS.md`, a progress record. ADR-0035 is marked accepted only by the owner's merge.

## 4. Out of scope

- Any score, overlap figure or figure computed from the two surnames together (ADR-0035 §2.3; framing B needs a new ADR).
- Given names and the exact first-name-and-surname count (D-033).
- Payment, checkout, entitlement or a session check; the offer page's tiers and prices (D-024, D-025 §2–§4).
- A share card, image or video of the report.
- Changing the free comparison.
- Setting `COUPLE_REPORT_ENABLED` in production.
- Any analytics or funnel events.

## 5. Acceptance criteria

- **AC-1** With the flag unset or not `1`, `/pl/para` and `/en/couple` answer 404, and no page links to them.
- **AC-2** With the flag `1`, a pair of resolved surnames renders §3.3's six parts in order, in both languages.
- **AC-3** The names list follows §3.3.1, and a name not on the list is never shown with a count.
- **AC-4** The page computes no figure from the two surnames together, and its messages contain none of §3.4's words.
- **AC-5** The pages are `noindex`, `private, no-store`, and in no sitemap.
- **AC-6** Verification: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm check:ids` pass.
