# TASK-002 — PESEL source spike

- **Status:** IMPLEMENTED AND VERIFIED. Stale `NOT STARTED` corrected 2026-09-21: the deliverables exist and are committed — `fixtures/pesel/national-{male,female}-2026-01-20.csv`, `fixtures/pesel/source-manifest.json`, and `@name-atlas/sources`' schema description and fail-closed parser (`packages/sources/src/schema.ts`, `parser.ts`), covered by the package's own tests. D-001 records the resolution.
- **Milestone:** M0
- **Depends on:** TASK-001 (project foundation)
- **Blocks:** TASK-004 (PESEL ingestion + Source/Rights) — resolves D-001 in `docs/DECISIONS_NEEDED.md`
- **Parallel to:** TASK-003 (exact surname resolver) — independent track within M0, no dependency either way
- **Model guidance:** fresh session; use a research-capable session with real outbound access to `dane.gov.pl` — see "Environment dependency" under Failure conditions
- **Canonical epic:** SPIKE-01 (`docs/canonical/23` §13)

## 1. Goal

Eliminate uncertainty about the real official PESEL surname source before any production importer, `Source`/`SourceRecord`/`RightsProfile` table, or `DistributionSnapshot` is built.

This task produces **understanding and safety rails**, not a pipeline: a pinned, reproducible description of exactly what the dataset is, what one row means, what is and is not licensed, and a small real fixture with a validator that fails closed the moment the source's shape changes. A future implementation session must be able to build the PESEL ingestion in TASK-004 from this record without re-deriving any of it, and without guessing.

## 2. Why this task exists

`docs/canonical/12` §2.1 already establishes, as verified fact:

- the source is the `dane.gov.pl` dataset *"Nazwiska występujące w rejestrze PESEL"*, dataset 1681, published by the Ministry of Digital Affairs;
- it covers surnames of living people in PESEL using the current-surname field;
- it omits surnames occurring only once;
- it excludes deceased people;
- it is updated annually and was updated 2026-01-28;
- it is downloadable and exposed through the Open Data API;
- official page: `https://dane.gov.pl/pl/dataset/1681,nazwis`.

`docs/canonical/12` §2.1 also states the architecture consequence directly: treat it as a dated national population snapshot, **not** proof of a complete census of every spelling form, and **not** a current regional geography source unless a specific resource explicitly supplies such fields (`docs/canonical/10` §5.2 — current regional distribution is a separate, unresolved blocker, D-004, and out of scope here).

What the canonical corpus does **not** establish — and what `docs/DECISIONS_NEEDED.md` D-001 lists as blocking TASK-004 — is everything below the dataset level: which exact resource file(s), their structure, their two distinct dates, their checksum, and their reuse terms. TASK-004 cannot be built safely on top of an assumption here. This task resolves that gap by direct inspection of the live source, or explicitly declares each unresolved item as unresolved.

## 3. Sources to inspect

In order, and no further than needed to answer §5:

1. `https://dane.gov.pl/pl/dataset/1681,nazwis` — the dataset landing page: exact resource list, resource names, file formats, licence/reuse statement as displayed, dataset "updated" timestamp.
2. Each resource file linked from that page for the current annual snapshot — actual headers, actual encoding, actual delimiter, actual row shape, actual date fields inside the file (if the resource carries its own reference date distinct from the portal's "updated" timestamp).
3. The `dane.gov.pl` Open Data API documentation (the platform-wide CKAN-style API referenced generically in `docs/canonical/12` §2.1 — no specific endpoint is pinned there; find and record the real one, e.g. via `api.dane.gov.pl`).
4. The dataset's licence/terms as stated on the portal (open-data reuse terms for `dane.gov.pl` in general, and any dataset-specific condition).
5. `docs/canonical/12` §2.1 (verified facts) and §9 (PESEL connector: ingestion strategy, snapshot semantics, raw fields to preserve, suppression semantics, rank, `1-in-X`) — the canonical connector-level expectations this spike must confirm or correct.
6. `docs/canonical/11` §6 (`DistributionSnapshot` / `DistributionValue`) — confirm which raw fields this spike must preserve to make a future snapshot/value row possible; this task does not create those tables, but must not discover, after the fact, that a needed raw field was never captured.
7. `docs/canonical/10` §5.1–§5.2 — the capability matrix and the current-regional-map blocker, so this spike does not accidentally treat a regional field as a current map (D-004 stays out of scope and unresolved by this task).

Do not read `docs/canonical/13`, `14`, `16` or any resolver/evidence/API document — nothing here touches them.

## 4. In scope

1. Identify and record the exact `dane.gov.pl` resource ID(s) for the current annual PESEL surname snapshot, and whether male and female surnames are separate resources or fields within one resource.
2. Identify the exact download mechanism: direct file URL(s) and/or the Open Data API call(s) that return the same resource, with the real endpoint recorded (not the generic "Open Data API" description already in `docs/canonical/12`).
3. Download the resource(s) for the current annual snapshot through a reproducible, recorded step (exact URL, exact date fetched).
4. Compute and record a cryptographic checksum (SHA-256) of the exact file(s) downloaded.
5. Document the file's real structure: encoding, delimiter/format, exact column headers as they appear, and the real type of each column (not an assumed type).
6. Distinguish and record, as two separate values: the **resource reference date** (the date the data itself describes/was extracted, if the resource states one) and the **portal/dataset "updated" date** (the metadata timestamp on the `dane.gov.pl` page). If the resource does not state its own reference date separately from the portal date, record that fact explicitly rather than assuming they are the same.
7. Confirm from the live resource, not from memory of `docs/canonical/12`, whether: the file is scoped to living people; whether it uses the current-surname field; whether surnames with a single occurrence are omitted; whether the file states or implies a suppression threshold value.
8. Record what a missing surname row means given the confirmed suppression rule (i.e., is "absent from the file" equivalent to a documented `BELOW_PUBLICATION_THRESHOLD_OR_ABSENT` state, per `docs/canonical/12` §9.5 and ARCHITECTURE.md §10 invariant 4 — absence is not zero).
9. Record the dataset's reuse/licence/attribution terms exactly as stated by the portal, sufficient to describe what a future `RightsProfile` (`docs/canonical/11` §9.4) would need — but do not create a `RightsProfile` row; there is no database in this task.
10. Produce one reproducible metadata record capturing all of the above so a future session does not need to repeat this research.
11. Select and commit a small, lawful, real fixture of approximately 20–50 rows drawn directly from the downloaded resource (see §6).
12. Write a minimal, standalone schema description of the confirmed structure (headers + types + encoding) and a fail-closed validator that checks a file against it — accepting only what item 5 confirmed, rejecting (not warning about) anything else: missing column, extra column, wrong type, wrong encoding, wrong delimiter.
13. Test the validator against the committed fixture (must pass) and against at least one deliberately mutated copy of the fixture per drift category (missing column, extra column, changed header name, wrong encoding) — each must be rejected.

## 5. Out of scope

Do not create, stub, scaffold or "prepare for" any of the following. Their absence is a success condition.

- The PESEL production importer (download → transform → load into a domain table). That is TASK-004.
- `Source`, `SourceRecord`, `RightsProfile`, `DistributionSnapshot`, `DistributionValue` — no database table, no migration, no domain type for any of these. TASK-004/TASK-005 own them.
- `EvidenceItem`, `Claim`, `ClaimEvidence`, `ConfidenceAssessment`, `Citation`.
- The surname resolver (TASK-003) — this task must not implement normalisation, matching, or candidate generation, even though the fixture contains surnames.
- Any public API endpoint or consumer-facing UI.
- Polona or any other historical source.
- Redis, Valkey, BullMQ, or any queue/job.
- Stripe, offers, orders, entitlements, premium reports.
- SEO.
- D-002, D-003, D-004 (onomastics rights, Polona rights, current regional map) — unrelated decisions; do not touch them.
- Resolving D-004 (current regional map) by treating any regional/voivodeship field discovered in the PESEL resource as a current map. If such a field exists, record its existence and scope factually in the output document and stop — do not build on it, and do not update D-004's status without the project owner's decision (D-004 explicitly requires a licensing decision this task cannot make).
- Committing the full downloaded resource. Only the small fixture (§6) is committed; the full file is not repository content.

## 6. The fixture

- Source: rows drawn directly from the real downloaded resource for the current annual snapshot — never synthesised, never hand-typed values presented as if sourced.
- Size: approximately 20–50 rows. Fewer is acceptable with a stated reason (e.g., the true resource has fewer distinct forms in the needed categories); more is not — this is a fixture, not a mirror.
- Required coverage, each represented by at least one real row where the source data allows it:
  - Polish diacritics (e.g., a surname containing `Ł`, `Ż`/`Ź`, `Ś`, `Ć`, `Ń`, `Ó`).
  - At least a few common, high-count surnames.
  - Different surname forms actually present in the source (e.g., distinct male/female forms if the resource carries them, or any other form variation the resource genuinely exposes — do not invent a form the source does not have).
  - A boundary case near the suppression threshold if the resource's structure makes this observable (e.g., a low-count row near the omission cutoff). If the resource gives no way to observe this boundary (because suppressed rows are simply absent, not marked), record that fact instead of fabricating a boundary row.
- Provenance recorded alongside the fixture: exact source resource ID/URL, exact download date, exact row selection method (e.g., "first N rows after sorting by X" or "stratified sample covering the categories above" — whichever was actually used), and confirmation that inclusion is consistent with the licence recorded in §4 item 9.

## 7. Expected repository outputs

Exact paths are the implementing session's call within these constraints (naming should follow existing conventions — see `docs/CODEMAP.md`):

- **One reproducible source-verification document** recording every item in §8's acceptance criteria, each item's answer or explicit "UNRESOLVED — <reason>". Suggested location: `docs/sources/pesel.md`, given no existing `docs/sources/` directory exists yet — if created, add it to `docs/CODEMAP.md`.
- **The fixture** at `fixtures/pesel/` (already anticipated in `docs/CODEMAP.md`'s planned table), plus the mutated-copy fixtures used to test drift rejection (or those may be generated in-test rather than committed, implementer's choice, provided the drift-rejection test itself is real and committed).
- **A minimal schema description + fail-closed validator**, in a new `packages/sources` workspace package (already anticipated in `docs/CODEMAP.md`'s planned table for TASK-002/TASK-004) — schema/type description of the confirmed PESEL resource structure, a validator function, and its tests. No dependency on `packages/db`; this package does not touch a database in this task.
- `docs/DECISIONS_NEEDED.md` D-001 updated: either resolved (moved to a "resolved" note as D-005 was for TASK-001) with every sub-item answered, or left open with precisely which sub-items remain unresolved and why — never silently dropped.
- `docs/CODEMAP.md` updated if `docs/sources/` or `packages/sources` did not already appear as planned, or to mark them as now existing.
- `PROGRESS.md` updated with observed facts: what was verified, against what live source, on what date, and what (if anything) could not be verified and why.

## 8. Acceptance criteria

Each of the following must have a recorded answer in the output document — a verified fact with its source, **or** an explicit `UNRESOLVED — <reason>`. A plausible-sounding guess is a failure of this task, not a partial success.

1. Exact official `dane.gov.pl` dataset confirmed (title, dataset ID, publisher) against the live page, not assumed from `docs/canonical/12`.
2. Exact resource ID(s) for the resource(s) actually downloaded.
3. Exact download/API identifier used (direct URL and/or Open Data API call).
4. Whether male and female surnames are separate resources/files or fields within one resource.
5. Exact file structure recorded from the real file (not assumed).
6. Resource reference date recorded.
7. Portal/dataset "updated" date recorded as a distinct value from item 6, with their relationship (same date, different date, or the resource does not expose item 6 separately) stated explicitly.
8. SHA-256 checksum of the exact resource file(s) downloaded, recorded alongside the exact download date and URL.
9. Encoding confirmed from the real file's bytes, not assumed from a stated content-type.
10. Exact column headers recorded as they literally appear in the file.
11. Exact field type of each column recorded, derived from real observed values, not guessed from the header name.
12. Living/deceased population semantics confirmed from the live source's own documentation or resource notes (not merely restated from `docs/canonical/12`).
13. Current-surname-field semantics confirmed the same way.
14. Suppression rule confirmed: the exact stated or inferable threshold (e.g., "surnames with count = 1 omitted"), sourced from the portal/resource documentation where it exists.
15. Meaning of a missing surname row stated explicitly and consistently with item 14.
16. Confirmation (or refutation) that single-occurrence surnames are omitted, checked against the live resource's own documentation, not merely restated.
17. Reuse/licensing/attribution metadata recorded exactly as stated by the portal.
18. All of the above assembled into one reproducible metadata record — another engineer or session could re-derive the same facts from what is written down, without re-visiting the live source.
19. A small real fixture exists per §6, with its provenance recorded.
20. A fail-closed schema validator exists, passes on the fixture, and rejects each drift category tested in §4 item 13 — verified by running the tests, not by inspection.

## 9. Verification

Run these from a clean checkout and report actual output:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

`pnpm test` must include the new `packages/sources` tests: the validator passes against the committed fixture, and fails against each mutated drift case.

Additionally, by inspection of the committed output document (not a script — there is no automated way to verify a human/AI research record against reality other than the checks already embedded in it):

- every item in §8 has an answer or an explicit `UNRESOLVED — <reason>`, with no item silently omitted;
- the recorded checksum matches `sha256sum` of the committed fixture's stated source bytes where the full original file is not committed (the fixture rows must be traceable to it — see §6 provenance);
- no forbidden item from §5 exists anywhere in the diff.

## 10. Definition of done

- Every item in §8 is answered or explicitly marked unresolved with a stated reason — never guessed.
- The fixture and validator exist, are real (not synthetic data presented as sourced, not a validator that cannot fail), and their tests pass.
- `docs/DECISIONS_NEEDED.md` D-001 reflects the actual outcome (resolved in full, resolved in part with the remainder named, or unchanged with a stated reason verification could not proceed — see Failure conditions).
- `docs/CODEMAP.md` and `PROGRESS.md` are updated with facts only.
- `docs/canonical/` is untouched.
- The complete `git diff` has been reviewed file by file; nothing from §5's out-of-scope list is present.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin TASK-003 or TASK-004. Do not write `tasks/003-*.md` or `tasks/004-*.md`.

## 11. Failure conditions / fail-closed behaviour

- **Never fabricate or infer** a dataset ID, resource ID, URL, date, schema, count, or licence term. If the live source cannot establish an item in §8, the output document must say `UNRESOLVED — <reason>` for that item, and D-001 in `docs/DECISIONS_NEEDED.md` must retain that item as open. A confident-sounding but unverified answer is worse than an explicit gap, per `AGENTS.md` §9 and ARCHITECTURE.md's evidence discipline.
- **Environment dependency — check this first.** This task requires real outbound access to `dane.gov.pl` (and its Open Data API host). Confirm this before starting substantive work: attempt to reach the dataset landing page. If the implementing session's network policy blocks it (as this planning session's did — `dane.gov.pl` returned `EGRESS_BLOCKED` when checked while writing this task), **stop immediately and report the blocker** rather than reconstructing dataset facts from the canonical corpus alone and presenting them as freshly verified. Restarting in a session/environment with the needed access is the correct next step, not a workaround.
- If the resource's structure or licence terms turn out to be incompatible with committing even a small fixture (e.g., explicit no-redistribution terms), do not commit the fixture. Record why in the output document, mark item 19 unresolved, and stop — do not substitute a synthetic fixture in its place.
- If a regional/voivodeship-level field is discovered in the resource, do not treat this as resolving D-004. Record its existence and exact scope, leave D-004 exactly as the project owner decides, and do not build any regional-distribution logic here.
- If the schema validator cannot be made to fail closed for a given drift category with the tools available, that category must be listed as an open risk in the output document, not silently skipped from the test suite.
