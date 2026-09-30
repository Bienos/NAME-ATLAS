# TASK-040 — Family surnames view (stateless)

- **Status:** IMPLEMENTED AND VERIFIED (2026-09-30), **not released**: release waits on the §13 U-6 privacy sign-off. Verification actually run: `docs/progress/2026-09-30-family-surnames-view.md`.
- **History:** written 2026-09-30 as the unnumbered draft `tasks/drafts/family-surnames-stateless.md` at the project owner's request; the owner accepted all six §13 decisions the same day. Scheduled the same day ("can we carry on and have final version") and numbered TASK-040, the next number free on `origin/main` with no pull request open (`AGENTS.md` §11). The text below is the draft as approved, unchanged except for this header.
- **Milestone:** none. A free feature after M2 (U-1). Not on the paid-MVP critical path.
- **Canonical epics:** none. New scope, approved under U-1.
- **Depends on:** TASK-006 (the contract and `GET /api/v1/surname-results`), TASK-016 (every fact reachable through that contract), TASK-017 (the free result page and its view components), TASK-029 (the rate limit). All are implemented on `main`.
- **Related:** TASK-025 (`/pl/porownaj`, the two-surname comparison). §5 explains why this is a separate page and not an extension of it.
- **Blocks:** nothing.
- **Model guidance:** fresh implementation session.

---

## 1. Goal

Let a visitor enter a few surnames from their family — their own, their mother's family name, a grandparent's — and see the existing free result for each one on one page, **without Name Atlas ever receiving, storing or logging which surnames were entered together or how they relate to the visitor.**

The page is a composition of ordinary single-surname lookups. It adds no data, no claim, no derived value and no server-side state.

## 2. User outcome

- The visitor enters up to 4 surnames (U-3) and may tag each with one of four fixed labels (U-4).
- One card appears per distinct surname. It shows the same free result as `/pl/nazwisko/{slug}`, in compact form: resolution state, and each fact with its source, date and confidence exactly as that page shows it. Nothing else.
- Each card stands alone. One unresolved or failed surname never hides or delays the others.
- A notice stays on screen saying each result describes the surname across everyone who carries it, not the visitor's relatives.
- Refreshing or leaving the page forgets everything.
- The page exists in Polish and English, like TASK-017 and TASK-025.

## 3. Authority

| Topic | Authority |
|---|---|
| Public surname research vs private family research; "relationship to user" is private family data | `docs/canonical/19` §4; `ARCHITECTURE.md` §7 |
| "Family data: no collection in P0 Name Report" | `docs/canonical/19` §196 |
| Analytics: no raw surname, no family names | `docs/canonical/19` §28; `ARCHITECTURE.md` §7 |
| Logging: no full surname query, no family names | `docs/canonical/19` §83 |
| Search-history retention | `docs/canonical/19` §102 |
| Session replay off; family routes excluded if ever enabled | `docs/canonical/19` §32, §191 |
| Top privacy risks #1 (public cache holds a user↔family association) and #3 (replay captures family input) | `docs/canonical/19` §192 |
| Controls required before Family Origin (this draft is deliberately not Family Origin) | `docs/canonical/19` §190 |
| Frontend consumes presentation objects only; the BFF may not resolve surnames | `ARCHITECTURE.md` §6 |
| A count is always shown with scope and date; projections never create facts | `ARCHITECTURE.md` §10 invariants 5, 11 |
| Compound surnames are never auto-split | `docs/canonical/13` §8.2 |
| SEO "do not build yet": family pages, comparison permutations | `docs/canonical/21` §244 |
| Paid-MVP non-goals: family tree, FamilyBranch, full migration reconstruction, surname comparison permutations | `docs/canonical/23` §2 |
| Product promises and non-goals | `PRODUCT.md` §3, §7, §8 |
| The contract and the endpoint | TASK-006; `packages/contracts`; `apps/web/src/app/api/v1/surname-results/route.ts` |
| The free result page and its view components | TASK-017, TASK-034; `apps/web/src/app/pl/nazwisko/[slug]/page.tsx`, `apps/web/src/app/en/surname/[slug]/page.tsx` |
| The comparison page: `noindex`, fixed family disclaimer, slugs in the URL | TASK-025; `apps/web/src/lib/compare-view.tsx`, `apps/web/src/lib/messages.ts` (`compareDisclaimer`) |
| The product-event sink: an event name and nothing else | TASK-024; `apps/web/src/app/api/v1/events/route.ts`, `apps/web/src/lib/events.ts` |
| The rate limit | TASK-029; `apps/web/src/middleware.ts` (`API_POLICY`: 30 requests per 60 s) |
| Numbering and branches | `AGENTS.md` §11 |
| Future private family model (not built here) | `docs/canonical/11` §28; `docs/canonical/19` §172 |

## 4. Preconditions

Checked against `origin/main` on 2026-09-30 by reading the files named in §3, not by running anything. The implementing session confirms each one in preflight. If one fails, stop and report (`AGENTS.md` §3); do not build the missing piece inside this task.

1. **The facts exist.** TASK-005 and the later truth chains are implemented (`STATUS.md`). Holds.
2. **One contract carries every fact, with explicit states.** `GET /api/v1/surname-results?surname=<raw>[&surface=FREE]` serves the contract in `packages/contracts`. Unresolved and ambiguous outcomes are 200 responses with an explicit status. Holds. **To confirm:** the response carries a stable public identity (the canonical slug of ADR-0009, or an ID) for AC-07 and AC-15. TASK-006's header records that the contract omitted the slug at the time. If it still does, stop: adding it is a contract change and belongs to its own task.
3. **The endpoint is callable from the browser.** It is a same-origin GET route handler. Holds.
4. **The view components render from the contract.** TASK-017's view tests render real components to markup in the `node` environment. **To confirm:** the section components can render a compact card from the endpoint's JSON in a client component. If they can render only inside a server component, stop and report.
5. **The rate limit admits 4 lookups.** `API_POLICY` allows 30 API requests per 60 s per client. Holds.
6. **§13 is answered.** Met 2026-09-30.

## 5. Design — why stateless, and why not TASK-025

The combination "these surnames + these relationships + this visitor" is private family data (`docs/canonical/19` §4), and P0 collects none (§196). This page avoids collecting it by never sending it:

- **Labels stay in browser memory.** They are never sent in any request, header, cookie or event.
- **Each surname is fetched with an ordinary `GET /api/v1/surname-results?surname=…` request.** It carries no parameter, header or cookie beyond what any client of that endpoint sends. There is no batch endpoint, no shared request marker and no "family view" flag.
- **Nothing is persisted client-side.** No cookie, `localStorage`, `sessionStorage` or IndexedDB write, and no URL, query or hash change.
- **Server-side, nothing is new.** No route handler, no migration, no table. Each response is still ordinary public surname data, because none of them carries a user↔family association.

**Why a separate page from TASK-025.** `/pl/porownaj?a={slug}&b={slug}` is server-rendered from slugs in the URL and compares figures side by side. Both are right for a comparison, and both are wrong here. A URL holding a visitor's family surnames is shared, logged and kept in browser history, and this page compares nothing (AC-10). TASK-025 remains the precedent for `noindex` and for a fixed disclaimer about family relation.

**Residual risk, stated rather than solved.** Requests from one visitor arriving within a second could be correlated by IP and timing in CDN or server access logs. That is the same exposure as a visitor running up to four ordinary searches in a row. It is governed by the existing logging and retention rules (§83, §102), and this task adds no mitigation beyond them. The project owner accepted it under U-6, on condition of a privacy sign-off before release.

## 6. In scope

1. **Two routes**, Polish and English, following TASK-017's and TASK-025's naming convention. `noindex`. Kept out of `sitemap.xml`. No route or query parameter carries a surname.
2. **A pure state module** holding the input list, the labels, the per-card state and merging by returned identity. No React, no `fetch`, no browser API, so it runs in `apps/web`'s `node` Vitest environment.
3. **A client component.** It renders the inputs and sends one `GET /api/v1/surname-results` per non-empty input. It renders each result with TASK-017's section components in compact form.
4. **The notice** (AC-11) and the input and label strings (U-2, U-4), as new entries in `apps/web/src/lib/messages.ts` for both languages.
5. **Tests** per §11.
6. **Documentation:** one line in `PRODUCT.md` §5 recording the approved scope (U-1), `docs/CODEMAP.md`, a new `docs/progress/` record, and the `STATUS.md` lines the change makes untrue.

## 7. Acceptance criteria

Each must be demonstrated by a test that runs, not by inspection.

- **AC-01** At most 4 inputs (U-3). Empty or whitespace-only inputs send no request and produce no card. A fifth input cannot be added.
- **AC-02** Each non-empty input causes exactly one `GET /api/v1/surname-results` request. Its only query parameter is `surname`, holding the input as typed, plus `surface=FREE` if the endpoint's other callers send it.
- **AC-03** No label string appears in any request. Spy on `fetch` and assert every label value is absent from every URL, header and body.
- **AC-04** No header, query parameter, body field or cookie distinguishes a lookup made by this page from any other request to that endpoint.
- **AC-05** The page, its component and its state module contain none of the following. It is enforced by a source-scan test in the style of `packages/resolver`'s `import-boundary.test.ts`:
  - references to `localStorage`, `sessionStorage`, `indexedDB` or `document.cookie`;
  - `history.pushState` or `history.replaceState`;
  - router navigation carrying surname parameters;
  - search-parameter writes.
- **AC-06** Every surname input has `autocomplete="off"` and a neutral `name` (`surname-1` … `surname-4`).
  - The prompt is „Nazwisko z Twojej rodziny", and in English "A surname from your family".
  - No input is named, labelled or placeholdered as the mother's maiden name („nazwisko rodowe matki") (U-2).
- **AC-07** Cards merge **only** when the endpoint returns the same public surname identity. The merged card lists every input that resolved to it.
  - The client never case-folds, normalises or strips diacritics to decide a merge (`ARCHITECTURE.md` §10 invariant 8).
  - Tests: `NOWAK` and `Nowak` produce two requests, and one card if the stubbed response gives one identity for both. `Łuczak` and `Luczak` with two identities produce two cards.
- **AC-08** Card states map one-to-one onto the contract's explicit states (§10). Changing one card's outcome never changes another card's state. Test with a mix of outcomes in one submission.
- **AC-09** Every count on a card carries the dataset scope and date the contract supplies, exactly as the single-surname page shows them (`ARCHITECTURE.md` §10 invariant 5).
- **AC-10** No value is computed across cards:
  - no sum and no combined rarity;
  - no "which is rarer" and no similarity score;
  - no overlap, including no shared-region statement.
  - Cards appear in input order, never sorted by count or rarity.
- **AC-11** Whenever at least one card is shown, a notice is visible in the page's language. Its meaning: *each result describes the surname as a whole — everyone in Poland who carries it — and says nothing about the visitor's relatives.* The meaning is binding; the exact words are not one of the §13 decisions. Proposed wording:
  - Polish: „Każdy wynik opisuje nazwisko jako całość — wszystkie osoby, które je noszą — a nie Twoich krewnych."
  - English: "Each result describes the surname as a whole — everyone who carries it — not your relatives."
- **AC-12** A compound input (e.g. `Kowalska-Nowak`) is sent as typed and never split by the page (`docs/canonical/13` §8.2 item 4). Component suggestions appear only if and as the contract returns them.
- **AC-13** Both routes render `noindex`, neither appears in `sitemap.xml`, and no URL encodes a surname or a combination of surnames.
- **AC-14** Each input offers exactly the four labels in U-4, in the page's language. Choosing one is optional, and there is no free-text label field.
- **AC-15** A resolved card links to the full single-surname page (`/pl/nazwisko/{slug}` or `/en/surname/{slug}`). No premium offer, price, checkout entry point, share action or share card appears on this page (U-5).

## 8. Out of scope

Their absence is a success condition. Anything here appearing in the diff is a defect.

- Any storage of the combination: accounts, "save my family", shareable links, "send to a relative", export, PDF, a share card or OG image.
- A server-side batch endpoint, or any new or changed contract. A missing identity field is a §4 precondition failure, not something to add here.
- Any change to TASK-025's comparison page, or turning this page into a comparison.
- Any cross-surname derived value: sum, combined rarity, "probability of this combination", overlap, comparison ranking.
- Any regional view across surnames: no combined map, no overlay, no "both surnames are common in region X". A card shows a surname's own regional distribution only if and as the single-surname page does.
- Migration or movement of any kind, surname-level or family-level.
- Any claim that depends on the relationship ("your mother's family came from…").
- Premium offers on this page, bundle pricing, a family report.
- `FamilyWorkspace`, `FamilyPerson`, `FamilyBranch`, or any private-family table.
- Free-text labels, first names, dates, places.
- New event names, or any new field in TASK-024's event sink. Session replay.
- Indexable pages for surname combinations.
- LLM use of any kind.
- Fuzzy, phonetic, diacritic-fold or gender-form logic in the client.
- Any change to the rate-limit policy.

## 9. Privacy invariants

1. No request made by this page contains a label.
2. A lookup made by this page is indistinguishable from any other request to `GET /api/v1/surname-results`.
3. The page writes nothing to browser storage and nothing to the URL.
4. The server gains no state: no migration, no table, no new route handler.
5. **If a later task gives this page an event:** it is a name on `lib/events.ts`'s allow-list and nothing else, which TASK-024's sink already enforces. It must never be a per-card event, since a burst of them reconstructs the combination.
6. **If a later task enables session replay:** this route goes on the exclusion list alongside Family Origin (`docs/canonical/19` §32).

## 10. Failure behaviour (per card)

| Contract state | Card shows |
|---|---|
| Resolved | The compact result, with a link to the full single-surname page |
| Ambiguous / needs clarification | The single-surname page's clarification state, for that surname only |
| Unresolved / unknown | The honest unresolved state — never "0 people" |
| Below the publication threshold / absent from the dataset | The suppressed state — never a zero (`ARCHITECTURE.md` §10 invariant 4) |
| Invalid input (400 error envelope) | The validation message, for that input only |
| Server error (error envelope, `retryable`) | An error with retry for that card only; never shown as "unknown surname" |
| Rate limited (429) | A retry state for that card only |

No failure on one card changes another card, clears the inputs, or fails the page.

## 11. Test requirements

- **Unit — pure, `node` environment, no new dependency:**
  - the state module: AC-01, AC-07, AC-08, AC-10, AC-12, and AC-14's label set;
  - the `fetch`-spy tests: AC-02, AC-03, AC-04;
  - the source-scan test: AC-05.
- **Rendering:** AC-06, AC-09, AC-11, AC-13, AC-15, and AC-14's absence of a free-text field. Render to markup the way TASK-017's view tests do, in the existing `node` environment. No new test dependency is expected. If one proves necessary, it needs the one-line justification `AGENTS.md` §6 requires.
- **Golden and end-to-end:** add nothing to `tests/golden`. Add one end-to-end path only if `tests/e2e` exists by then: enter three surnames with one failing, and see two results and one error. If it does not exist, say so; do not create the suite here.

## 12. Constraints

- Reuse TASK-006's contract and endpoint and TASK-017's view components unchanged. No second surname model, no second normalisation function, no parallel contract.
- Smallest complete version. No abstraction for a future saved-family feature.
- No new package. No change to `packages/db`, `packages/resolver`, `packages/sources`, `packages/truth`, `packages/contracts` or any migration.
- `docs/canonical/` and the other read-only directories are untouched (`AGENTS.md` §2).

## 13. Decisions — answered 2026-09-30

The project owner accepted every proposal below as written ("accept all your proposals for U-1 to U-6", 2026-09-30). Each entry keeps the question and records the decision. The English strings in AC-06, AC-11 and AC-14 are translations of the decided Polish, added when the draft was moved onto `main`, where every page is bilingual. They are not separate decisions.

**U-1 — Scope and milestone.** This feature was in neither `PRODUCT.md` §5 nor `PLAN.md`. `docs/canonical/23` §2 lists "surname comparison permutations" as not a paid-MVP dependency, and `docs/canonical/21` §244 says not to build "family pages" or "comparison permutations" yet. Both read as concerns about indexable pages, which a `noindex` tool page with no per-combination URL does not create. TASK-025's `noindex` comparison page on `main` applies the same reading. **Decided:** the owner confirms that reading and approves this as a free, post-M2 feature. One line is added to `PRODUCT.md` §5 in the implementing change, not before.

**U-2 — Input wording.** Many banks and official forms use the mother's maiden name ("nazwisko rodowe matki") to verify identity. A page that literally asks for it trains visitors to type a security answer into a website. **Decided:** the generic prompt „Nazwisko z Twojej rodziny", with an optional side label, never the literal phrase (AC-06).

**U-3 — Maximum number of surnames.** **Decided: 4**, enough for the four grandparents' birth surnames. More inputs would mean more concurrent lookups per visitor against the rate limit (AC-01, §4 item 5).

**U-4 — Labels.** **Decided:** exactly four fixed labels — „Twoje nazwisko", „Strona ojca", „Strona matki", „Inne" — optional, and no free text (AC-14). Free text invites first names, dates and places, which is private family data (`docs/canonical/19` §4). English: "Your surname", "Father's side", "Mother's side", "Other".

**U-5 — What a card links to.** **Decided:** a compact card linking to the full single-surname page. Any premium offer appears only there, under M4's eligibility rules, never on this page (AC-15).

**U-6 — Residual correlation risk and review.** Should the IP/timing correlation risk in §5 be accepted as equivalent to four ordinary searches? And does shipping need a privacy review first? `docs/canonical/19` §190's pre-Family-Origin checklist does not strictly apply, since no family data is collected, but §192 risks #1 and #3 do. **Decided:** the residual risk is accepted. **Release of this page is gated on a short privacy sign-off confirming §9.** That sign-off is a release gate, not part of this task's definition of done.

## 14. Preflight

1. `git fetch origin main` and `git merge-base --is-ancestor origin/main HEAD` (`AGENTS.md` §11).
2. This file, `STATUS.md`, and the §13 decisions.
3. Confirm each §4 precondition in the repository, especially items 2 and 4. Stop if one fails.
4. The endpoint route, the contract's response schema in `packages/contracts`, TASK-017's view components and their tests, `apps/web/src/lib/compare-view.tsx`, `apps/web/src/lib/messages.ts`, `apps/web/src/middleware.ts`.
5. `docs/canonical/19` §4, §28, §32 and §83, by line range. Do not read the corpus in bulk.
6. `packages/resolver/src/import-boundary.test.ts`, for the source-scan test shape.
7. `git status` and the current diff.

Then state a short plan naming the exact files, and implement.

## 15. Verification

Run from a clean checkout and report actual output.

```bash
pnpm install --frozen-lockfile
pnpm check:ids
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
pnpm test:integration   # no schema change is expected; this proves nothing regressed
```

## 16. Diff review

1. Nothing from §8 is present.
2. No file changed under `packages/` (migrations included).
3. No new route handler under `apps/web/src/app/api/`, and no change to `middleware.ts`, `lib/events.ts` or TASK-025's files.
4. No normalisation, case-folding or diacritic logic in the new client code.
5. `pnpm-lock.yaml` is unchanged, unless §11 required a justified dependency.
6. No debug code, no stray files, no formatting churn.

## 17. Documentation / handoff

- `PRODUCT.md` §5: one line recording the approved scope, worded per U-1.
- `docs/CODEMAP.md`: the new routes and modules.
- A new `docs/progress/YYYY-MM-DD-<slug>.md` stating:
  - what was built;
  - the verification actually run;
  - which rendering-test path §11 took;
  - that release still waits on the U-6 privacy sign-off.
- `STATUS.md`: rewrite the lines the change makes untrue, and list the U-6 sign-off under "Blocked on the project owner".

## 18. Definition of done

- Every acceptance criterion in §7 is demonstrated by a test that was run, with its actual output reported.
- Every privacy invariant in §9 that applies now (1–4) is asserted by a test.
- The diff has been reviewed per §16.
- Work is committed on its own branch, for one pull request into `main`.
- `STATUS.md` states that the page must not be released until the U-6 privacy sign-off confirming §9 exists.
- **STOP.** Do not start a saved-family feature, a regional overlay or Family Origin.
