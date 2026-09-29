# TASK-032 — Onomastica source spike

> **History.** This spec was written on 2026-09-24 as "TASK-006" on branch `claude/relaxed-meitner-s6445i`, which was based on an old commit and never merged. It was carried onto `main` under the next free number. On 2026-09-29 it was reconciled with `main` before the project owner approved it:
>
> - D-002 was resolved on 2026-09-21 by ADR-0008. The spike now assesses *Onomastica* against ADR-0008 §4's four admissibility conditions instead of updating D-002.
> - A proposed `RightsProfile` must fit ADR-0007 as well as migration `0003`'s enums.
> - A later ingestion would be ADR-0008's curated source file (`packages/sources/src/onomastics.ts`), so the proposals are mapped onto it.
> - Progress is recorded in `docs/progress/` and `STATUS.md`. `PROGRESS.md` is frozen.
>
> §2's exploratory observations are kept as written on 2026-09-24.

- **Status:** APPROVED 2026-09-29 by the project owner, after this reconciliation. Not started.
- **Milestone:** none assigned. Serves ADR-0008's Path B (D-002, resolved 2026-09-21): meaning comes from attributed sources, or it is a stated gap, and it launched at zero coverage. Also serves `PLAN.md`'s parallel track "onomastics licence/partnership outreach".
- **Depends on:**
  - TASK-004: the `Source`/`RightsProfile` model, `packages/db/migrations/0003_source_rights_distribution.ts`. As of 2026-09-29, no later migration changes those tables or their enums.
  - TASK-021: ADR-0007's evaluation per asset kind and surface, `packages/truth/src/rights.ts`.
  - TASK-022: ADR-0008's curated onomastic source file and its import, `packages/sources/src/onomastics.ts`.
- **Blocks:** nothing. Its record informs any later *Onomastica* ingestion task and the project owner's outreach to IJP PAN.
- **Model guidance:** a research-capable session with outbound HTTPS to `journals.pan.pl` and `onomastica.ijp.pan.pl` (see "Environment dependency" under Failure conditions). On 2026-09-29 `onomastica.ijp.pan.pl` answered 301 to `https://onomastica.ijppan.pl/`, and journals.pan.pl's OAI-PMH endpoint answered `Identify` with HTTP 200.
- **Canonical epic:** none. `docs/canonical/23` defines SPIKE-01 to SPIKE-05 only; this spike serves `docs/canonical/10` §5.3 (critical blocker — Polish etymology / onomastics) and §11.3

## 1. Goal

Eliminate uncertainty about *Onomastica* — the proper-names journal of the Institute of Polish Language, Polish Academy of Sciences (IJP PAN) — as a lawful scholarly source for ADR-0008's Path B, before any *Onomastica* `Source`, `SourceRecord` or `RightsProfile` row, ingestion, text extraction or claim is built.

This task produces **a record, not a pipeline**: which channels publish the journal, what each covers, how items are identified, what licence terms each item actually carries, and which `Source` and `RightsProfile` values those facts support. Any later ingestion task and the project owner's outreach must be able to rely on it without re-deriving any of it, and without guessing.

## 2. Why this task exists

D-002 was resolved on 2026-09-21 by ADR-0008: meaning is built claim by claim from attributed sources (Path B), or it is a stated gap, and Path A — a licence or partnership with IJP PAN — stays open. Meaning launched at zero coverage: every surname returns `NO_SOURCED_MEANING` until an admissible source is ingested. Under ADR-0008 §4 a source may support a meaning claim only if all four hold:

1. it is citable;
2. its rights permit the surface under ADR-0007's gate;
3. it is `C_SCHOLARLY_SECONDARY` or better;
4. its licence basis is stated.

`docs/canonical/10` §5.3 names the same fallback, and §11.3 requires the first slice to support both `origin_status = INSUFFICIENT_DATA` and a small number of surnames with lawful, traceable onomastic evidence.

*Onomastica* is a peer-reviewed onomastics journal published by IJP PAN — the same rights holder whose dictionary (ISNP) has verified content but unconfirmed commercial rights (`docs/canonical/12` §2.1, as cited in D-002's record). D-002's record states that being free to read establishes no permission for bulk commercial ingestion, caching or redistribution. Whether *Onomastica* items can meet ADR-0008 §4 therefore depends on per-item facts nobody has recorded yet.

`docs/sources/candidate-sources.md` item 6 records a check of the journal's own site made on 2026-09-24, covering vols 59–69 and sampled licences. Like the observations below, it must be re-verified before anything from it enters the output.

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

1. `https://onomastica.ijp.pan.pl` (on 2026-09-29 it redirected to `https://onomastica.ijppan.pl/index.php/ONOM`) — About, copyright, licence and open-access policy pages; the issue archive (which volumes exist, from which year); article landing pages (DOI and licence as displayed); the site's OAI-PMH endpoint, if it exposes one.
2. `https://journals.pan.pl/dlibra/oai-pmh-repository.xml` — `Identify`, `ListMetadataFormats`, a full `ListRecords` for set `pan:journals:onomastica`, and one record in each non-`oai_dc` format, to see whether any format carries rights or publication IDs.
3. `https://journals.pan.pl/Content/<edition>` for each item — the hosted file, or the `url-publication.xml` redirect target. Record redirect targets without following them to hosts the environment cannot reach.
4. The legal code of each Creative Commons licence named in a statement (`creativecommons.org`), only to record what each version permits — no legal interpretation beyond the licence text.
5. `docs/canonical/11` §9.1 (`Source`), §9.2 (`SourceRecord`), §9.4 (`RightsProfile`, including its hard rights rules); `docs/canonical/12` §20 (IJP PAN partnership connector) and §20.5 (questions to IJP PAN); `docs/canonical/10` §5.3 and §11.3.
6. `packages/db/migrations/0003_source_rights_distribution.ts` — the implemented enums every proposal must use. Confirm on `main` that no later migration changes `sources`, `rights_profiles` or their enums.
7. ADR-0007 and `packages/truth/src/rights.ts` (`evaluateRightsMatrix`); ADR-0008 and `packages/sources/src/onomastics.ts` (the curated source file, its admissibility checks and the `sources` values its import writes).

Do not read other canonical documents; nothing here touches resolution, evidence, claims or the API.

## 4. In scope

1. Identify every channel that publishes *Onomastica* content — at least journals.pan.pl (dLibra) and onomastica.ijp.pan.pl (OJS) — and record for each: base URL, access method (OAI-PMH endpoint and set, file URL pattern), volumes and years covered, identifier schemes (dLibra edition/publication IDs, DOIs), and which channel the publisher names as canonical, if it names one.
2. Build a reproducible item inventory: one row per item (article, review, obituary, report, front matter) per channel, with volume, year, pages, title, authors, item type, the channel's identifiers, DOI where one exists, file URL, retrieval date, HTTP outcome, SHA-256 of any bytes retrieved (bytes not committed), and the licence fields from item 3. Link rows for the same item across channels only on an identical DOI, or on identical volume + pages + title — never on a guess.
3. For every item whose file was retrieved, record every rights or licence statement exactly as printed — text, page, and link-annotation target — plus the rights fields of every metadata format that has any. Record inconsistencies as found, such as §2 observation 5, without choosing between them.
4. Record each channel's journal-level terms exactly as published, quoted with URL and retrieval date.
5. For items whose files cannot be retrieved from the implementing environment (e.g. the No 56–59 whole-volume PDFs on a plain-HTTP host), record the target URL and mark the item's licence `UNRESOLVED — <reason>`. If the project owner supplies those files, follow the acquisition-record precedent in `docs/sources/acquisition/2026-09-18/`: checksums and metadata only.
6. Propose, in the output document only, the `Source` values for *Onomastica* — `source_key`, `name`, `publisher`, `source_type`, `granularity`, `geographic_scope`, `temporal_from`/`temporal_to`, `authority_tier`, `production_status`, `homepage_or_reference_url`, and whether a `parent_source_id` (IJP PAN) is warranted — using only enum members that exist on `main`, each with a one-line justification. State how the proposal maps onto `importOnomasticSource`, which writes one `sources` row per work with fixed values (`source_type = DICTIONARY`, `granularity = SURNAME`, `geographic_scope = {PL}`), and record any misfit rather than resolving it.
7. Propose one `RightsProfile` per distinct licence situation found (e.g. no statement; © only; the No 64 Creative Commons statement). Fill each field only from a recorded statement or licence text, and `UNKNOWN` otherwise. While the No 64 inconsistency stands, its `commercial_use` stays `UNKNOWN` — under `docs/canonical/11` §9.4, `commercial_use = UNKNOWN` means the source may not silently enter a paid report. For each profile, record:
   - the ADR-0008 §4 condition 4 licence basis it supports: `PUBLIC_DOMAIN` with a reason, `OPEN_LICENCE` by name, `LICENCE_AGREEMENT`, or none;
   - ADR-0007's decision per asset and surface, computed by `evaluateRightsMatrix` in a throwaway script outside the repository. Record the command and its output.
8. Map `docs/canonical/12` §20.5's fifteen questions onto *Onomastica* content: which ones the recorded statements answer, and which stay open for the project owner's outreach. Add the questions this spike surfaces — at least: which licence applies to No 64; what terms apply to No 56–63; whether terms differ between channels.

## 5. Out of scope

Do not create, stub, scaffold or "prepare for" any of the following. Their absence is a success condition.

- Any database table, migration, row or domain type. The `Source` and `RightsProfile` values are proposals in a document; registering them belongs to a later task, which under ADR-0008 would be a curated source file, not a connector.
- Article PDFs, page images or article text in the repository, in any form — including as a fixture. Metadata, URLs and checksums only.
- Text extraction pipelines, a surname index, NLP or LLM processing, `EvidenceItem`, `Claim`, `ConfidenceAssessment`, `Citation`.
- Raw object storage (INF-001), queues or workers.
- Changing D-002 (resolved) or ADR-0008, and contacting IJP PAN — both are the project owner's.
- Any code or test in the repository. The ADR-0007 evaluation in §4 item 7 runs outside it.
- Getting past journals.pan.pl's browser-verification page with a headless browser or by any other means, or routing around the environment's network policy (e.g. to reach the plain-HTTP host).
- Harvesting beyond what the inventory needs. Requests are sequential, with a pause between them, and back off when the site signals load.
- Any other journal, IJP PAN's ISNP dictionary, Polona, or any other source.

## 6. Expected repository outputs

Exact paths are the implementing session's call within these constraints (follow existing conventions — see `docs/CODEMAP.md`):

- **`docs/sources/onomastica.md`** — the source record: every §7 item answered or marked `UNRESOLVED — <reason>`, the `Source` and `RightsProfile` proposals, and the §20.5 question map.
- **An acquisition record** beside the existing one, e.g. `docs/sources/acquisition/<YYYY-MM-DD>-onomastica/`: a README with provenance (as in `docs/sources/acquisition/2026-09-18/README.md`), the item inventory as CSV, `SHA256SUMS.txt` for the bytes retrieved, and verbatim metadata captures (OAI responses) under `metadata/`, which `.prettierignore` already excludes. No article bytes.
- **`docs/DECISIONS_NEEDED.md`** — D-002 and ADR-0008 are unchanged. A new entry is added only if the spike surfaces a decision only the project owner can take. Its number is the next one free on `main` and in open pull requests (`AGENTS.md` §11).
- **`docs/CODEMAP.md`** — updated if the new paths need listing.
- **`docs/progress/<YYYY-MM-DD>-onomastica-source-spike.md`** — facts only: what was verified, against which live source, on what date, and what could not be verified and why. Also rewrite the lines of `STATUS.md` the change makes untrue. `PROGRESS.md` is frozen.
- **`docs/sources/INVENTORY.md` §6** — a row for the captures, as for Polona.

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
11. Proposed `Source` values, all valid against the enums on `main`, mapped onto `importOnomasticSource` with any misfit recorded.
12. Proposed `RightsProfile`(s), every field sourced or `UNKNOWN`; `commercial_use` never inferred.
13. The §20.5 question map, plus the new questions for the project owner.
14. Each licence situation assessed against ADR-0008 §4's four conditions: each condition met, not met, or `UNRESOLVED — <reason>`. D-002 and ADR-0008 are unchanged.

## 8. Verification

Run these from a clean checkout and report actual output. No code should change, so they must pass unchanged — they guard against accidental edits outside `docs/`:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm test
pnpm build
```

Additionally:

- `sha256sum -c` of the committed `SHA256SUMS.txt` against the retrieved bytes, run in the implementing session before the bytes are discarded — report the actual output;
- by inspection: every §7 item has an answer or an explicit `UNRESOLVED — <reason>`; the inventory's row count per channel equals the channel's own total (e.g. OAI `completeListSize`), or the difference is explained; `git diff --stat` shows no PDF, image or article text; `docs/canonical/` is unchanged.

## 9. Definition of done

- Every item in §7 is answered or explicitly marked unresolved with a stated reason — never guessed.
- The acquisition record lets another session re-verify every retrieved file by checksum without the bytes being in the repository.
- The ADR-0008 §4 assessment is recorded for every licence situation; D-002 and ADR-0008 are unchanged.
- `docs/CODEMAP.md`, `docs/sources/INVENTORY.md`, the `docs/progress/` record and `STATUS.md` are updated with facts only; `docs/canonical/` is untouched.
- The complete `git diff` has been reviewed file by file; nothing from §5 is present.
- Work is committed on the designated branch with a descriptive message.
- **STOP.** Do not begin any *Onomastica* ingestion, and do not write the next task file.

## 10. Failure conditions / fail-closed behaviour

- **Never fabricate or infer** a licence term, coverage, count, date, identifier or URL. If the live source cannot establish an item in §7, record `UNRESOLVED — <reason>` and keep it open in `docs/sources/onomastica.md` (`AGENTS.md` §9).
- **Environment dependency — check this first.** The task needs outbound HTTPS to `journals.pan.pl` and `onomastica.ijp.pan.pl`. Attempt each before substantive work. If either is blocked by the session's network policy, stop and report the blocker rather than reconstructing facts from §2's observations or from memory.
- **Browser-verification page:** back off and retry later. If it persists, record the affected items as `UNRESOLVED — site served a browser-verification page`. Never use a headless browser or any other means to get past it.
- **Plain-HTTP or unreachable hosts:** record the target and mark the item `UNRESOLVED`, or use files the project owner supplies. No workarounds.
- **Automated access prohibited:** if a channel's published terms prohibit automated access, stop automated retrieval on that channel and record it — `docs/canonical/11` §9.4: `automated_access = PROHIBITED` → no automated production connector.
- **Conflicting licence statements:** record every version with its location. Never pick one, and never let the more permissive reading set a `RightsProfile` field.
