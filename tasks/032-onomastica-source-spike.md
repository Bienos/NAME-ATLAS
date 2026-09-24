# TASK-032 — Onomastica source spike

> **Rebase note — read before approving or starting this task.** This spec was written on 2026-09-24 as "TASK-006" on branch `claude/relaxed-meitner-s6445i`. That branch was based on an old commit and never merged, and on `main` TASK-006 is the surname result read API. It was carried onto `main` under the next free number so the branch can be deleted. The body below is unchanged, but it describes the repository as that branch saw it. On `main`:
>
> - **D-002 is resolved** (2026-09-21, ADR-0008: meaning comes from attributed Path B sources, or it is a stated gap). The references below to D-002 as open, to updating D-002's status, and to AC 14 therefore become: record the facts in `docs/sources/onomastica.md`, and assess *Onomastica* against ADR-0008 §4's four admissibility conditions.
> - **TASK-005 is implemented**, so "does not displace TASK-005" and "parallel to TASK-005" no longer apply. The specified-but-unstarted task on `main` is TASK-031 (the Polona source spike).
> - **The rights model has grown.** A proposed `RightsProfile` must fit ADR-0007 (rights evaluated per asset kind and per surface, failing closed) as well as migration `0003`'s enums. Check the migrations as they stand on `main`, not only `0003`.
> - Related records now on `main`: `docs/sources/candidate-sources.md` (item 6 is *Onomastica*) and `docs/sources/bruckner-buryan-package.md`.

- **Status:** NOT STARTED — specified 2026-09-24 at the project owner's request; **not yet approved for implementation**, and needs the rebase note above reconciled first
- **Milestone:** none assigned. Serves D-002 (`docs/DECISIONS_NEEDED.md` — blocks the meaning/etymology capability, M2 onward) and `PLAN.md`'s parallel track "onomastics licence/partnership outreach". Does not displace TASK-005, which remains the next M1 task.
- **Depends on:** TASK-004 (the implemented `Source`/`RightsProfile` model this spike's proposals must fit — `packages/db/migrations/0003_source_rights_distribution.ts`)
- **Blocks:** nothing yet. Its record informs the project owner's D-002 decision and any later *Onomastica* ingestion task.
- **Parallel to:** TASK-005 — no dependency either way
- **Model guidance:** fresh research-capable session with outbound HTTPS to `journals.pan.pl` and `onomastica.ijp.pan.pl` — see "Environment dependency" under Failure conditions
- **Canonical epic:** none. `docs/canonical/23` defines SPIKE-01 to SPIKE-05 only; this spike serves `docs/canonical/10` §5.3 (critical blocker — Polish etymology / onomastics) and §11.3

## 1. Goal

Eliminate uncertainty about *Onomastica* — the proper-names journal of the Institute of Polish Language, Polish Academy of Sciences (IJP PAN) — as a lawful scholarly source for D-002 Path B, before any *Onomastica* `Source`, `SourceRecord` or `RightsProfile` row, ingestion, text extraction or claim is built.

This task produces **a record, not a pipeline**: which channels publish the journal, what each covers, how items are identified, what licence terms each item actually carries, and which `Source` and `RightsProfile` values those facts support. The project owner's D-002 decision and any later ingestion task must be able to rely on it without re-deriving any of it, and without guessing.

## 2. Why this task exists

D-002 blocks meaning/etymology from M2 onward and offers two paths: a licence or partnership with IJP PAN or another specialist rights holder (Path A), or claim-by-claim evidence from lawful scholarly and public-domain sources (Path B). `docs/canonical/10` §5.3 names the same fallback, and §11.3 requires the first slice to support both `origin_status = INSUFFICIENT_DATA` and a small number of surnames with lawful, traceable onomastic evidence.

*Onomastica* is a peer-reviewed onomastics journal published by IJP PAN — the same rights holder whose dictionary (ISNP) has verified content but unconfirmed commercial rights (`docs/canonical/12` §2.1, as cited in D-002). D-002 already states that being free to read establishes no permission for bulk commercial ingestion, caching or redistribution. Whether *Onomastica* can serve Path B therefore depends on per-item facts nobody has recorded yet.

### Exploratory observations, 2026-09-24 — not a verification record

An exploratory session (not an implementation of this task) observed the following. They are recorded so the implementing session knows where to look. **Every one must be re-verified from the live source** before it enters the output document; none may be copied across as verified.

1. **OAI-PMH:** `https://journals.pan.pl/dlibra/oai-pmh-repository.xml`, set `pan:journals:onomastica`, returned 298 records (`completeListSize="298"`). Metadata formats offered: `oai_dc`, `dlibra_avs`, `mets`, `oai_qdc`, `oai_etdms`. The records span No 56 (2012) to No 64 (2020), with 26, 46, 44, 25, 36, 29, 31, 30 and 31 items per volume.
2. **`dc:rights`** is empty in all 298 `oai_dc` records.
3. **Hosted files:** 157 items (No 60–64, 2016–2020) name a file under `https://journals.pan.pl/Content/<edition>/`. All 157 were retrieved as PDFs with a text layer (1,862 pages, about 78 MB). The bytes were not committed.
4. **Link-only items:** 141 items (No 56–59, 2012–2015) name no hosted file. For one item per volume, `/Content/<edition>` redirected to `/Content/<edition>/url-publication.xml`, which redirected to a whole-volume PDF, with a page anchor, on a plain-HTTP host. The other 137 items were not requested.
   - No 56: `http://195.187.97.25:8080/images/data/ono/wydania/No_56_20112/No_56_2012.pdf`
   - No 57: `http://195.187.97.25:8080/images/data/ono/wydania/No_57_2013/Onomastyka_57.pdf`
   - No 58: `http://195.187.97.25:8080/images/data/ono/wydania/No_58_2014/Onomastica_2014-do_druku-30-11.pdf`
   - No 59: `http://195.187.97.25:8080/images/data/ono/wydania/No_59_2015/Onomastyka_2015_DRUK.pdf`
5. **Licence statements printed in the 157 PDFs** (text layer and link annotations; no PDF carries rights in its document info or XMP):
   - No 60–62 (2016–2018): no rights statement of any kind in any of the 96 PDFs.
   - No 63 (2019): `© Copyright by Instytut Języka Polskiego PAN, Kraków 2019` in 27 of 30 PDFs; none in the other 3. No open licence.
   - No 64 (2020): 27 of 31 PDFs print — *"This is an Open Access article distributed under the terms of the Creative Commons Attribution-NoDerivatives 4.0 Poland (CC BY-ND 4.0) License (https://creativecommons.org/licenses/by-nc-nd/4.0/deed.pl), which permits copying and redistribution, commercial and non-commercial, provided that the article is properly cited"* — plus the © line. **The statement is internally inconsistent:** its name and wording describe CC BY-ND 4.0, the URL printed beside them is the non-commercial `by-nc-nd/4.0`, and the clickable link annotation points to `https://creativecommons.org/licenses/by-nd/4.0`. One more PDF carries the © line only; three carry nothing.
6. **Identifiers:** journals.pan.pl uses dLibra *publication* IDs in page URLs (`/onomastica/<publication>`, `/dlibra/publication/<publication>/edition/<edition>`) and *edition* IDs in `/Content/<edition>` and in OAI identifiers (`oai:journals.pan.pl:<edition>`). `oai_dc` records carry no publication ID. The two number sequences overlap: `/Content/136222` is an *Archives of Electrical Engineering* paper (publication 154996), not an *Onomastica* item.
7. **Access conditions:** journals.pan.pl HTML pages answered non-browser clients with a "High Load – Verifying Browser" JavaScript page. OAI-PMH requests received it intermittently and succeeded after back-off. `/Content/` downloads never received it, though 17 were reset by the server and succeeded on retry. The plain-HTTP host in item 4 was unreachable from the cloud session, whose proxy tunnels HTTPS only. journals.pan.pl itself was first blocked by the session's network policy (`EGRESS_BLOCKED`) and became reachable after the environment's network settings were changed.
8. **Not checked:** the journal's own OJS site, `https://onomastica.ijp.pan.pl`. Search results show an issue page there titled "Vol. 64 (2020): Onomastica LXIV", and CEJSH records for No 64 items carry DOIs of the form `10.17651/ONOMAST.64.<n>`. The site's coverage after No 64, its copyright/licence policy pages, and whether it serves No 56–59 over HTTPS are all unknown.

## 3. Sources to inspect

In order, and no further than needed to answer §7:

1. `https://onomastica.ijp.pan.pl` — About, copyright, licence and open-access policy pages; the issue archive (which volumes exist, from which year); article landing pages (DOI and licence as displayed); the site's OAI-PMH endpoint, if it exposes one.
2. `https://journals.pan.pl/dlibra/oai-pmh-repository.xml` — `Identify`, `ListMetadataFormats`, a full `ListRecords` for set `pan:journals:onomastica`, and one record in each non-`oai_dc` format, to see whether any format carries rights or publication IDs.
3. `https://journals.pan.pl/Content/<edition>` for each item — the hosted file, or the `url-publication.xml` redirect target. Record redirect targets without following them to hosts the environment cannot reach.
4. The legal code of each Creative Commons licence named in a statement (`creativecommons.org`), only to record what each version permits — no legal interpretation beyond the licence text.
5. `docs/canonical/11` §9.1 (`Source`), §9.2 (`SourceRecord`), §9.4 (`RightsProfile`, including its hard rights rules); `docs/canonical/12` §20 (IJP PAN partnership connector) and §20.5 (questions to IJP PAN); `docs/canonical/10` §5.3 and §11.3.
6. `packages/db/migrations/0003_source_rights_distribution.ts` — the implemented enums every proposal must use.

Do not read other canonical documents; nothing here touches resolution, evidence, claims or the API.

## 4. In scope

1. Identify every channel that publishes *Onomastica* content — at least journals.pan.pl (dLibra) and onomastica.ijp.pan.pl (OJS) — and record for each: base URL, access method (OAI-PMH endpoint and set, file URL pattern), volumes and years covered, identifier schemes (dLibra edition/publication IDs, DOIs), and which channel the publisher names as canonical, if it names one.
2. Build a reproducible item inventory: one row per item (article, review, obituary, report, front matter) per channel, with volume, year, pages, title, authors, item type, the channel's identifiers, DOI where one exists, file URL, retrieval date, HTTP outcome, SHA-256 of any bytes retrieved (bytes not committed), and the licence fields from item 3. Link rows for the same item across channels only on an identical DOI, or on identical volume + pages + title — never on a guess.
3. For every item whose file was retrieved, record every rights or licence statement exactly as printed — text, page, and link-annotation target — plus the rights fields of every metadata format that has any. Record inconsistencies as found, such as §2 observation 5, without choosing between them.
4. Record each channel's journal-level terms exactly as published, quoted with URL and retrieval date.
5. For items whose files cannot be retrieved from the implementing environment (e.g. the No 56–59 whole-volume PDFs on a plain-HTTP host), record the target URL and mark the item's licence `UNRESOLVED — <reason>`. If the project owner supplies those files, follow the acquisition-record precedent in `docs/sources/acquisition/2026-09-18/`: checksums and metadata only.
6. Propose, in the output document only, the `Source` values for *Onomastica* — `source_key`, `name`, `publisher`, `source_type`, `granularity`, `geographic_scope`, `temporal_from`/`temporal_to`, `authority_tier`, `production_status`, `homepage_or_reference_url`, and whether a `parent_source_id` (IJP PAN) is warranted — using only enum members that exist in migration 0003, each with a one-line justification.
7. Propose one `RightsProfile` per distinct licence situation found (e.g. no statement; © only; the No 64 Creative Commons statement). Fill each field only from a recorded statement or licence text, and `UNKNOWN` otherwise. While the No 64 inconsistency stands, its `commercial_use` stays `UNKNOWN` — under `docs/canonical/11` §9.4, `commercial_use = UNKNOWN` means the source may not silently enter a paid report.
8. Map `docs/canonical/12` §20.5's fifteen questions onto *Onomastica* content: which ones the recorded statements answer, and which stay open for the project owner's outreach. Add the questions this spike surfaces — at least: which licence applies to No 64; what terms apply to No 56–63; whether terms differ between channels.

## 5. Out of scope

Do not create, stub, scaffold or "prepare for" any of the following. Their absence is a success condition.

- Any database table, migration, row or domain type. The `Source` and `RightsProfile` values are proposals in a document; registering them belongs to a later task, after D-002 is decided.
- Article PDFs, page images or article text in the repository, in any form — including as a fixture. Metadata, URLs and checksums only.
- Text extraction pipelines, a surname index, NLP or LLM processing, `EvidenceItem`, `Claim`, `ConfidenceAssessment`, `Citation`.
- Raw object storage (INF-001), queues or workers.
- Resolving D-002 or changing its status, and contacting IJP PAN — both are the project owner's.
- Getting past journals.pan.pl's browser-verification page with a headless browser or by any other means, or routing around the environment's network policy (e.g. to reach the plain-HTTP host).
- Harvesting beyond what the inventory needs. Requests are sequential, with a pause between them, and back off when the site signals load.
- Any other journal, IJP PAN's ISNP dictionary, Polona, or any other source.

## 6. Expected repository outputs

Exact paths are the implementing session's call within these constraints (follow existing conventions — see `docs/CODEMAP.md`):

- **`docs/sources/onomastica.md`** — the source record: every §7 item answered or marked `UNRESOLVED — <reason>`, the `Source` and `RightsProfile` proposals, and the §20.5 question map.
- **An acquisition record** beside the existing one, e.g. `docs/sources/acquisition/<YYYY-MM-DD>-onomastica/`: a README with provenance (as in `docs/sources/acquisition/2026-09-18/README.md`), the item inventory as CSV, `SHA256SUMS.txt` for the bytes retrieved, and verbatim metadata captures (OAI responses) under `metadata/`, which `.prettierignore` already excludes. No article bytes.
- **`docs/DECISIONS_NEEDED.md` D-002** — an update note with the recorded licence facts and the open questions. Status unchanged unless the project owner decides.
- **`docs/CODEMAP.md`** — updated if the new paths need listing.
- **`PROGRESS.md`** — facts only: what was verified, against which live source, on what date, and what could not be verified and why.

## 7. Acceptance criteria

Each item must have a recorded answer in the output document — a verified fact with its source and retrieval date — **or** an explicit `UNRESOLVED — <reason>`. A plausible-sounding guess is a failure of this task, not a partial success.

1. Every channel publishing *Onomastica*, with base URL and access method.
2. Coverage per channel: volumes and years, with item counts per volume.
3. Identifier schemes per channel, and how items map across channels (DOI, or volume + pages + title only).
4. OAI-PMH endpoint(s), set(s), metadata formats and record counts, as returned live.
5. An inventory row for every item any channel lists, each with an HTTP outcome and, where bytes were retrieved, a SHA-256.
6. Every retrieved item's printed rights/licence statements recorded verbatim with page and link targets; items with none recorded as "none found".
7. The rights fields of every metadata format checked, including empty ones.
8. Each channel's journal-level terms, quoted with URL and retrieval date.
9. The No 64 inconsistency (licence name vs printed URL vs link target) confirmed or refuted, including whether the OJS channel states a different licence for the same items.
10. Terms for No 56–63 established from a published statement, or `UNRESOLVED`.
11. Proposed `Source` values, all valid against migration 0003's enums.
12. Proposed `RightsProfile`(s), every field sourced or `UNKNOWN`; `commercial_use` never inferred.
13. The §20.5 question map, plus the new questions for the project owner.
14. D-002 updated with facts; status unchanged unless the project owner decided otherwise.

## 8. Verification

Run these from a clean checkout and report actual output. No code should change, so they must pass unchanged — they guard against accidental edits outside `docs/`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Additionally:

- `sha256sum -c` of the committed `SHA256SUMS.txt` against the retrieved bytes, run in the implementing session before the bytes are discarded — report the actual output;
- by inspection: every §7 item has an answer or an explicit `UNRESOLVED — <reason>`; the inventory's row count per channel equals the channel's own total (e.g. OAI `completeListSize`), or the difference is explained; `git diff --stat` shows no PDF, image or article text; `docs/canonical/` is unchanged.

## 9. Definition of done

- Every item in §7 is answered or explicitly marked unresolved with a stated reason — never guessed.
- The acquisition record lets another session re-verify every retrieved file by checksum without the bytes being in the repository.
- D-002 reflects the recorded facts; its status is whatever the project owner decided, and unchanged otherwise.
- `docs/CODEMAP.md` and `PROGRESS.md` are updated with facts only; `docs/canonical/` is untouched.
- The complete `git diff` has been reviewed file by file; nothing from §5 is present.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin any *Onomastica* ingestion, and do not write the next task file.

## 10. Failure conditions / fail-closed behaviour

- **Never fabricate or infer** a licence term, coverage, count, date, identifier or URL. If the live source cannot establish an item in §7, record `UNRESOLVED — <reason>` and keep it open in D-002 (`AGENTS.md` §9).
- **Environment dependency — check this first.** The task needs outbound HTTPS to `journals.pan.pl` and `onomastica.ijp.pan.pl`. Attempt each before substantive work. If either is blocked by the session's network policy, stop and report the blocker rather than reconstructing facts from §2's observations or from memory.
- **Browser-verification page:** back off and retry later. If it persists, record the affected items as `UNRESOLVED — site served a browser-verification page`. Never use a headless browser or any other means to get past it.
- **Plain-HTTP or unreachable hosts:** record the target and mark the item `UNRESOLVED`, or use files the project owner supplies. No workarounds.
- **Automated access prohibited:** if a channel's published terms prohibit automated access, stop automated retrieval on that channel and record it — `docs/canonical/11` §9.4: `automated_access = PROHIBITED` → no automated production connector.
- **Conflicting licence statements:** record every version with its location. Never pick one, and never let the more permissive reading set a `RightsProfile` field.
