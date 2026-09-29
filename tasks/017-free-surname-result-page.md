# TASK-017 — the free surname result page

- **Status:** IMPLEMENTED 2026-09-20. All ten acceptance criteria met; see `PROGRESS.md`. The page
  ships in **Polish and English** (§3), as the spec decided.
- **Two bugs and one review correction during implementation**, all recorded in `PROGRESS.md`: a
  doubled full stop in Polish (the date ends in `r.`), a crash rather than the unavailable state when
  `DATABASE_URL` was absent, and raw explanation codes shown to the reader including a similarity
  band. **One finding raised as D-018**: two source records for one publisher resource make every
  observation render twice, and nothing supersedes the earlier claim.
- **Created:** 2026-09-20, after TASK-016 made every fact reachable through one validated contract.
- **Milestone:** M2, and its exit. Release gate: **internal alpha**.
- **Depends on:** TASK-016 (schema 1.3 and the suggestions section), TASK-006 (the query service and
  the endpoint), TASK-005/009/014/012 (the four facts), TASK-015 (the retrieval behind suggestions).
- **Canonical basis:** `docs/canonical/16` §23 (`SectionState`), §26 (a value is never a bare zero),
  §35 (no internal probability reaches a consumer), §55 (a blocked value is omitted, never sent and
  hidden), §79 (a miss is a successful response); `docs/canonical/13` §32 (the user-facing behaviour
  contract) and §33 (never silently replace input); `PRODUCT.md` §4 (the journey), §5 (free scope),
  §7 (the trust rules).

## 1. Goal

One real user journey, end to end, in a browser: enter a surname, get a safe resolution or honest
suggestions, and for a resolved surname see its count, its rarity, its regional distribution and the
source, date and confidence behind each — with every absence stated rather than filled.

`apps/web` currently serves a page that says "Foundation build. See PROGRESS.md for current status."
Everything this page needs already exists behind the contract; nothing in it derives a fact.

## 2. The one rule that shapes every other decision

**The page renders validated claims and derives nothing.** `ARCHITECTURE.md` §6 and
`docs/canonical/16` §1.3 put the decisions in the query service; the reviewed plan's own wording is
"Frontend must not derive facts from raw evidence."

So the page calls `querySurnameResult`, parses the result with `surnameResultResponseSchema`, and
renders **from the parsed value**. If validation fails the page shows an error and renders no
figures, because a payload that violates its own contract is a bug and must not reach a reader. That
single rule settles most of what follows: the page never sums, never rounds, never divides, never
ranks, never decides what is presentable. It chooses words for states the contract already named.

## 3. Language: Polish and English

`PRODUCT.md` §2 names the primary user as "a Polish or Polish-diaspora adult … on mobile". The
diaspora half often reads English, and **both renderings already exist** — the project owner accepted
the Polish and English sentences for the count, the rarity figure and the distribution, and they are
recorded in `docs/contracts/surname-result.md`. Shipping one would leave half an accepted contract
unimplemented.

So: `?lang=pl` (default) and `?lang=en`, one message table each, `<html lang>` set to match. No
routing scheme, no negotiation, no i18n library — those are an SEO and infrastructure concern and SEO
is M8. A `lang` value that is neither falls back to Polish rather than erroring.

## 4. In scope

1. **`apps/web/src/app/page.tsx`** — a server component. A `GET` form with one text input; when
   `?surname=` is present, the result below it. One route, one column, mobile first.
2. **A presentation module** (`apps/web/src/lib/`) holding the message tables and the pure functions
   that turn a validated section into strings. Pure and unit-tested without a browser or a database:
   every honesty rule below is then a test, not a review comment.
3. **The accepted sentences, verbatim from the contract.** Not paraphrased:
   - count: `{count} people were registered with the surname {surname} ({sex}) in the PESEL register
     on {date}.` / `{count} osób było zarejestrowanych z nazwiskiem {surname} ({sex}) w rejestrze
     PESEL na dzień {date}.`
   - rarity: `About 1 in {x} people counted in the PESEL register ({sex}) bore the surname {surname}
     on {date}.` / `Około 1 na {x} osób ujętych w rejestrze PESEL ({sex}) nosiło nazwisko {surname}
     na dzień {date}.`
   - distribution: `Among the {covered} people with the surname {surname} ({sex}) who had a
     registered voivodeship on {date}, {share}% were registered in {region}.` / the recorded Polish
     equivalent.
   - Polish number formatting uses a space as the thousands separator and the genitive month form.
4. **Every state rendered, each with its own words.** `RESOLVED` with facts; `RESOLVED` with a
   section `UNAVAILABLE`; `RIGHTS_BLOCKED`; `UNRESOLVED` with suggestions; `UNRESOLVED` without
   them, carrying the reason; `AMBIGUOUS`, including the mixed-script case; invalid input; service
   unavailable. A state with no words is a bug.
5. **Suggestions as suggestions.** Rendered as a question — *Czy chodziło Ci o …?* /
   *Did you mean …?* — with each candidate a link that re-runs the search for that surname.
   Never auto-applied, never pre-selected, and the original input stays visible in the box
   (`docs/canonical/13` §32.2).
6. **Provenance on every figure**: publisher, title, the snapshot date, the licence (`CC0 1.0`) and
   the confidence status. `docs/canonical/16` §35 — the assessment's internal rationale does not
   reach the page, and no probability or percentage of confidence is displayed.
7. **`LOW_COVERAGE` and `COVERAGE_UNKNOWN` render their warning before any regional figure**, in the
   order a reader must take them.
8. **Styling**: one global stylesheet, CSS custom properties, mobile first, dark mode through
   `prefers-color-scheme`, no framework and no dependency. Legibility over decoration.
9. Tests, `PROGRESS.md`, `docs/CODEMAP.md`.

## 5. Out of scope

- Client-side JavaScript for search. A `GET` form and server rendering answer this journey; adding a
  client bundle to it would be decoration.
- Autocomplete, search-as-you-type, history, favourites, sharing, print styles.
- A path route such as `/nazwisko/{surname}`, canonical URLs, structured data, sitemaps, `noindex`
  rules. SEO is M8 and `PRODUCT.md` §8 item 14 forbids thin page generation.
- Analytics, consent banners, cookies. `docs/canonical/18` owns those and they are consent-gated.
- Maps and geometry. No place has a centroid, and `docs/canonical/16` §28 forbids fabricated
  features.
- Any premium surface, offer, price, upsell or discovery inventory. Those are M4 and M5.
- Etymology, meaning, origin or historical dimensions. `PRODUCT.md` §5 includes them "where evidence
  supports it"; no such claim type exists yet, so the page shows nothing for them rather than a
  placeholder promising them.
- The admin inspector.

## 6. Acceptance criteria

- **AC-1** The page renders nothing that did not come from a payload validated against
  `surnameResultResponseSchema`. A payload that fails validation renders an error and **no figures**;
  asserted with a deliberately invalid payload.
- **AC-2** A resolved surname with two partitions renders **two** counts and **two** rarity
  sentences, and **no total anywhere**. Asserted by searching the rendered output for the sum of the
  two counts and requiring its absence.
- **AC-3** A count is rendered with its scope and date and never as an estimate; a rarity figure is
  rendered with "about"/"około" and never without it. Both asserted on the exact strings.
- **AC-4** A `LOW_COVERAGE` distribution renders its warning **before** the first regional figure,
  and the rendered output never contains "lives in", "from", "originates", "mieszka" or "pochodzi".
- **AC-5** A `RIGHTS_BLOCKED` section renders no value at all — not a hidden one
  (`docs/canonical/16` §55).
- **AC-6** An unresolved input with candidates renders them as a question with the original input
  still in the box, and no candidate is auto-applied. An unresolved input without candidates renders
  the reason.
- **AC-7** A mixed-script input renders the ambiguous state and offers no candidate.
- **AC-8** Every state in §4 item 4 has distinct rendered text, in both languages, asserted by table.
- **AC-9** No confidence probability, percentage, similarity or score appears in the rendered output.
- **AC-10** `pnpm build` passes and the page renders server-side with no client component.
  *Amended by the project owner on 2026-09-29, together with TASK-023 AC-8. The page still renders
  server-side. Its only client components are the share button, the suggest-as-you-type search and
  the voivodeship map, and it works fully without JavaScript.*

## 7. Verification

```bash
pnpm typecheck && pnpm lint && pnpm format:check && pnpm test
TEST_DATABASE_URL=… pnpm test:integration
pnpm build
# and by eye, against the real register:
DATABASE_URL=… pnpm --filter web run dev   # /?surname=NOWAK · ?surname=MELNYK&lang=en · ?surname=CICHWOSKI · ?surname=NOWK
```

## 8. Do not

- Do not compute, sum, round, rank or re-derive any figure in the page.
- Do not sum the two sexes, or present one as the surname's total.
- Do not say "lives in", "comes from" or "originates in" about a registered residence.
- Do not render a `RIGHTS_BLOCKED` value and hide it with CSS.
- Do not auto-apply a suggestion or replace what the user typed.
- Do not show a confidence as a number, a bar or a percentage.
- Do not add a placeholder for a fact that has no claim type yet.
