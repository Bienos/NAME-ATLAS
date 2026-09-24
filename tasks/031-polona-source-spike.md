# TASK-031 — Polona source spike

- **Status:** SPECIFIED, NOT STARTED. Written 2026-09-23 at the project owner's request ("please do whats needed") as the first M3 task.
- **Milestone:** M3 — historical discovery / Polona (`PLAN.md`)
- **Canonical epic:** SPIKE-03 — historical source (`docs/canonical/23` §SPIKE-03)
- **Depends on:** TASK-021 / ADR-0007 (rights per asset kind and surface — resolves D-003, the decision that blocked M3). Both done.
- **Blocks:** the Polona connector and `HistoricalOccurrence` task, which does not exist yet and must not be written until this one is done.
- **Environment dependency — read first:** outbound HTTPS to `polona.pl` (and to any API or IIIF host it redirects to). On 2026-09-23 this project's cloud environment answered `403` to `CONNECT` for `polona.pl`, `polona2.pl`, `api.europeana.eu` and `fbc.pionier.net.pl`. The implementing session must either run with those hosts allowed, or run on a machine with ordinary internet access. See §11.
- **Model guidance:** fresh session, research-capable. The work is reading a live service carefully and writing down only what it observed.

## 1. Goal

Remove the uncertainty about Polona before any connector, table or claim is built on it, the way TASK-002 did for PESEL.

`docs/canonical/23` states the exit for SPIKE-03:

> at least one lawful historical record can travel from source to canonical SourceRecord.

This task delivers that as **understanding plus safety rails**, not as a pipeline: a verified record of how Polona is actually reached, what a surname search actually returns, what each object says about its rights, and a small committed set of real responses with a fail-closed parser. The later connector task must be buildable from this record without re-doing the research and without guessing.

## 2. Why this task exists

`docs/canonical/12` §16 specifies the Polona connector (search → item metadata → object/page structure → OCR/search context → rights inspection → `SourceRecord` → `DigitalAsset` → occurrence candidate), and §8.2 says the MVP supports Polona **metadata and citations first**, imagery later. ADR-0007 decides what Name Atlas does with whatever rights an object declares, and says explicitly: *"This ADR does not assert what Polona's terms say."*

None of the following is established anywhere in this repository, and each one decides whether the connector is possible or lawful:

- whether Polona has a public programmatic interface at all, what it is, and whether its terms permit automated access (`automated_access` in `docs/canonical/11` §9.4);
- what a surname search matches — bibliographic metadata, full text (OCR), or both — and whether a hit locates a page, a line, or only an object;
- how Polish inflection behaves: whether a search for `NOWAK` finds `Nowaka`, `Nowakowi`, `Nowakiem`, and whether it matches ordinary words (`nowak` is not ambiguous; `KOWAL` or `WILK` are);
- which rights field(s) an object carries, their exact vocabulary, and how each value maps onto ADR-0007's three dimensions (metadata, transcription, image);
- what OCR is available, in what format, with what coordinates and confidence;
- what identifiers exist for deduplication (§16.7).

## 3. Inputs to inspect

In order, and no further than needed to answer §8:

1. The live Polona site and any API it exposes — including the network requests its own search page makes, which is often the only documentation of an undocumented API. Record the real endpoint, not a guess.
2. Polona's published terms of use, `robots.txt`, and any stated rate limit or API policy. Record them verbatim with the date read.
3. Object-level rights statements on real objects: at least one public-domain object and at least one object that is **not** public domain, if the search results contain one.
4. IIIF manifests, if the objects expose them (`docs/canonical/12` §3.5).
5. `docs/canonical/12` §16 (Polona connector), §6 (rights registry integration), §3.5/§3.6 (IIIF, search API) — the expectations this spike confirms or corrects.
6. `docs/canonical/11` §8.2 (`HistoricalOccurrence`), §9.3 (`DigitalAsset`), §9.4 (`RightsProfile`) — the fields a later task must be able to fill, so this spike does not discover afterwards that a needed raw field was never captured.
7. `docs/adr/0007-rights-per-asset-and-surface.md` and `packages/truth/src/rights.ts` — the evaluation the observed rights values will be fed into.

Do not read `docs/archive/` or `docs/library/`. Do not read Europeana or FBC documentation beyond noting, if seen, that a Polona object also appears there (§16.7).

## 4. In scope

1. Identify the programmatic access path: search endpoint(s), object-metadata endpoint(s), page/OCR endpoint(s), IIIF manifest pattern. For each: URL pattern, method, parameters actually used, authentication (none/key/other), response format, and any observed paging and rate limiting.
2. Record the terms that govern automated access, verbatim, with URL and date. State plainly whether they permit, forbid or do not address automated querying and caching. If they do not address it, the answer is `UNKNOWN`, which ADR-0007 §1 treats as `PROHIBITED` on public surfaces — record that consequence.
3. Run a fixed query set and capture the raw responses (see §6).
4. For each query, record what was matched: metadata field, full text, or both; whether results give a page or canvas locator; whether they carry a text snippet around the match; total hit count as reported.
5. Record inflection and false-match behaviour from those same results: does a nominative query return inflected forms; does it return non-surname uses of the same word. Classify each captured hit by hand as *surname*, *not a surname*, or *cannot tell*, and record the counts. This is an observation on a small sample, and must be labelled as one — not a precision figure.
6. Record every rights-bearing field an object carries, with its exact observed values. Build a table mapping each observed value to ADR-0007's `metadata_rights`, `transcription_rights` and `image_rights`. Any value whose meaning is not stated by Polona itself maps to `UNKNOWN`, not to the obvious reading.
7. Record OCR availability and shape: per object or per page; format (plain text, ALTO, hOCR, other); whether coordinates or confidence are present.
8. Record deduplication identifiers present on an object (Polona UUID or equivalent, bibliographic IDs, canonical object URL).
9. Write one paper trace, end to end, for one real public-domain hit: surname query → object → page/canvas locator → matched text → the values that would fill `SourceRecord`, `DigitalAsset` and `HistoricalOccurrence` (`docs/canonical/11` §8.2, §9.3). A table in the source record, **not** a table in the database. This is SPIKE-03's exit, reached on paper.
10. A pure, database-free parser for the captured response shapes, in `packages/sources/src/polona/`, that fails closed on any shape it was not built from (missing field, changed type, unknown rights value). Tested against the committed fixtures and against a mutated copy per drift category. No network in tests.
11. Record everything in `docs/sources/polona.md`, and add a row to `docs/sources/INVENTORY.md`.

## 5. Out of scope

Their absence is a success condition.

- Any migration or table: `digital_assets`, `historical_occurrences`, or anything else. No `Source` or `RightsProfile` **row** for Polona — the registry entry belongs to the connector task.
- A connector that runs on demand, a worker job, a queue message, or any use of the M3 async runtime from TASK-020.
- Any `EvidenceItem`, `Claim`, `ConfidenceAssessment` or `Citation` from Polona data.
- Any API field, UI, page, sitemap entry or consumer-visible text.
- Downloading, storing or committing scan images or PDFs. A scan's URL may be recorded; its bytes may not be fetched beyond what viewing its metadata requires.
- Committing OCR text of any object whose transcription rights are not confirmed `ALLOWED` by Polona's own statement (see §6).
- Europeana, FBC, or any other historical source.
- Generating inflected forms. Morfeusz is in the 2026-09-18 acquisition bundle and could do it, but whether and how to expand queries is the connector task's decision, made on the evidence this task gathers. This task records what Polona's own search does with inflection, and nothing more.
- Any LLM, fuzzy matching or OCR correction.
- Changing ADR-0007. If an observed rights value does not fit it, record the misfit in `docs/DECISIONS_NEEDED.md` as a new entry.

## 6. The fixtures

- **Query set, fixed before running:** `NOWAK`, `KOWALSKI`, `WIŚNIEWSKI` (common, with a diacritic), one rare surname with a diacritic taken from `fixtures/pesel/`, and one surname that is also an ordinary Polish word (for example `WILK` or `KOWAL`). Record the exact query strings and the date and time each was run.
- **What is committed** under `fixtures/polona/`: the raw search responses, trimmed to at most 10 hits per query, and the raw object-metadata responses for the objects those hits point to, each with SHA-256, retrieval timestamp and the exact request that produced it, in a `source-manifest.json` like `fixtures/pesel/`'s.
- **OCR text** is committed only for objects whose transcription rights Polona states as public domain or openly licensed. For every other hit, commit the locator and the SHA-256 of the OCR text, not the text.
- **Never synthesised.** Every committed byte is what Polona returned. Trimming removes whole hits; it never edits a value.
- If a query returns nothing, commit the empty response. A zero-hit answer is a result.

## 7. Expected repository outputs

- `docs/sources/polona.md` — the verification record; every §8 item answered or marked `UNRESOLVED — <reason>`.
- `fixtures/polona/` — the fixtures and their manifest, per §6.
- `packages/sources/src/polona/` — the fail-closed parser and its tests, exported from `@name-atlas/sources` the same way the PESEL schema is. No dependency on `packages/db`.
- `docs/sources/INVENTORY.md` — one row for Polona.
- `docs/DECISIONS_NEEDED.md` — a new entry only if something observed needs a decision: most likely automated-access terms that are absent or restrictive, or a rights vocabulary that ADR-0007 cannot evaluate.
- `docs/CODEMAP.md` — `fixtures/polona/`, `docs/sources/polona.md`, the `polona/` directory in `packages/sources`, and this task file's status.
- `PROGRESS.md` — facts only.

## 8. Acceptance criteria

Each needs a recorded answer with its source, or `UNRESOLVED — <reason>`. A plausible guess fails the task.

1. Programmatic access path identified: endpoint URL patterns and parameters for search, object metadata, page/OCR and IIIF, each observed rather than assumed.
2. Authentication requirement recorded.
3. Rate limits or paging behaviour recorded as observed, or recorded as not observed.
4. Terms governing automated access quoted verbatim with URL and date, and their `automated_access` value stated with reasoning.
5. `robots.txt` recorded verbatim with date.
6. The fixed query set, run and captured, with timestamps.
7. For each query: the matched field(s), whether a page/canvas locator exists, whether a snippet exists, and the reported total hit count.
8. Inflection behaviour recorded from the captured results.
9. Hand classification of every captured hit (surname / not / cannot tell), with counts, labelled as a sample.
10. Every rights-bearing field on an object recorded, with its exact observed values.
11. The mapping table from observed rights values to ADR-0007's three dimensions, `UNKNOWN` wherever Polona does not state the meaning.
12. At least one public-domain object identified and its rights evaluated through `packages/truth/src/rights.ts` in a test — the observed values in, the surface decisions out.
13. OCR availability, granularity, format, coordinates and confidence recorded.
14. Deduplication identifiers recorded.
15. The end-to-end paper trace (§4 item 9) for one real public-domain hit, naming every `SourceRecord`, `DigitalAsset` and `HistoricalOccurrence` field it can fill and every one it cannot.
16. Fixtures committed per §6, with provenance, and nothing committed that §6 forbids.
17. The parser passes on every committed fixture and rejects each drift case — verified by running the tests.
18. No out-of-scope item from §5 exists anywhere in the diff.

## 9. Verification

From a clean checkout, and report the actual output:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

`pnpm test` must include the new Polona parser tests and the rights-evaluation test from §8 item 12. No test may reach the network.

Also check, and record the result:

```bash
# every fixture file matches its manifest
cd fixtures/polona && sha256sum -c <(jq -r '.files[] | "\(.sha256)  \(.path)"' source-manifest.json)
# nothing out of scope
git diff --stat main... -- packages/db/migrations apps packages/truth/src packages/queue   # expect no changes
```

The manifest's field names are the implementing session's choice; adjust the `jq` expression to match them.

## 10. Definition of done

- Every §8 item answered or explicitly unresolved with a reason.
- Fixtures real, parser real and able to fail, tests passing.
- `docs/DECISIONS_NEEDED.md`, `docs/CODEMAP.md`, `docs/sources/INVENTORY.md` and `PROGRESS.md` updated with facts only.
- `docs/canonical/` untouched.
- The complete diff reviewed file by file.
- Committed on the designated branch.
- **STOP.** Do not write the connector task file. Do not start it.

## 11. Failure conditions and fail-closed behaviour

- **Polona unreachable** (the 2026-09-23 state of this project's cloud environment): do not substitute memory, search-engine snippets or third-party descriptions of Polona for observation. Record `UNRESOLVED — polona.pl not reachable from <environment>, <date>, <exact error>` against every item that needs the live service, complete nothing else in its place, and stop. The owner can allow `polona.pl` in the cloud environment's network settings (Network access → allowed domains), or run the session on a machine with ordinary internet access.
- **Terms forbid automated access:** stop after recording them. Do not run the query set. Record a `DECISIONS_NEEDED` entry. A connector against a service that forbids it is not a smaller version of the task; it is a different, unlawful one.
- **No programmatic interface exists** beyond the human-facing site: record that, record whether the site's own requests are a de facto API and whether the terms address using it, and stop at a `DECISIONS_NEEDED` entry. Scraping HTML is a decision for the owner, not an implementation detail.
- **Rights not stated per object:** record it. Every dimension is then `UNKNOWN`, and ADR-0007 already says what that means. Do not infer public-domain status from a publication date.

## 12. Preflight for the implementing session

1. `git status` clean; branch as instructed.
2. `curl -sS -o /dev/null -w '%{http_code}\n' https://polona.pl` returns `200`. If not, §11's first case applies before anything else is done.
3. Read `PROGRESS.md`'s latest section, ADR-0007, and `docs/canonical/12` §16 — only those, then begin.
