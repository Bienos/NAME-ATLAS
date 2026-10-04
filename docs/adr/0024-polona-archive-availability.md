# ADR-0024 — Polona: automated access, its source default, and archive availability on the surname page

- **Status:** Accepted 2026-10-01, by the project owner's decision in the session that wrote it.
- **Date:** 2026-10-01
- **Deciders:** the project owner. Asked what "it's signed off" covered, they chose "Polona access". Asked how far the connector may go, they chose "Everything allowed": also download page text (OCR) and scans to find every mention.
- **Amended by:** ADR-0036 (2026-10-04): §2.2's interval is now 250 ms; the rest of §2.2 stands.
- **Resolves:** D-021 items 1 and 4 (`docs/DECISIONS_NEEDED.md`). Items 2 and 3 were resolved by ADR-0014.
- **Relates to:** ADR-0007 (rights per asset), ADR-0014 (Polona metadata and attribution), `docs/sources/polona.md` (TASK-031), `docs/canonical/11` §11 (`ARCHIVE_AVAILABILITY`), `docs/canonical/23` M3.

## 1. Context

- TASK-031 mapped Polona's search, object, OCR and IIIF endpoints and built a parser, but no connector, because Polona's terms say nothing about automated querying, request rates or caching (D-021 item 1), and Polona states rights per object with no source-wide default (item 4).
- Under ADR-0007 §6 an object's rights can only tighten its source's. With a source default of `UNKNOWN`, even a public-domain object stays `UNKNOWN`, so nothing from Polona could ever surface.
- One search request returns a total and facets (type, licence, place of publication, language). The full-text search can be limited to works that are not copyright-protected and to a date range (`temporalFilters.dates.startRange`/`endRange`, observed 2026-10-01).

## 2. Decision

1. **Automated access is allowed** for the search API, object records, OCR downloads and IIIF images, and what is retrieved may be kept (D-021 item 1). This is the owner's judgement, recorded as one, not a confirmation from Biblioteka Narodowa.
2. **The connector stays polite.** One request at a time, at least one second apart, a user agent that names Name Atlas and its contact page, a timeout, and a back-off on errors. It asks only what a surname needs, a fixed set of searches per surname, and never walks the collection.
3. **The Polona source default allows every dimension** (D-021 item 4): metadata, transcription, image, database, automated access, commercial use, redistribution and local cache, with attribution required ("Polona, Biblioteka Narodowa"). Each object's own licence then tightens it as ADR-0007 §6 and `POLONA_RIGHTS_MAPPING` say, so the text and scans of a protected work stay refused.
4. **What the surname page states is `ARCHIVE_AVAILABILITY`** (`docs/canonical/11` §11): a `FACT` about Polona's search output, `VERIFIED` within the searched scope. It carries:
   - the word searched and the date of the search;
   - how many catalogue records match, by type;
   - how many pages of works that are not copyright-protected contain the word, in total, by period of publication and by place of publication;
   - up to three examples, taken only from public-domain works, each with an excerpt of at most 300 characters (`TRANSCRIPTION_EXCERPT_MAX_CHARS`) and a link to the page in Polona.
5. **A match is a word, not a person or a family.** Polona's search is morphological: it matches inflected forms, and the word may be something other than the surname. TASK-031's hand sample found 72 of 90 hits to be the surname. The page says so wherever the counts appear, and never presents a count as people, ancestors or "mentions of your family".
6. **Loading is bounded and refreshed.** The loader searches the surnames ranked highest in either register list, a rank limit at a time, skips a surname searched within the last 90 days, and supersedes its claim when the result changes.
7. **Examples fail closed.** A record whose licence and statement do not classify as public domain under `classifyPolonaRights` is never quoted; it still counts. A response whose envelope does not parse is not stored, and the surname is retried on a later run.

## 3. Why not the alternatives

- **Search only, nothing kept.** The owner chose to allow everything; storing the summary is what lets the page answer without calling Polona per visit.
- **Calling Polona when a page is viewed.** That would put a third party's latency in front of every surname page, and the page would show a fact that never passed through the truth layer.
- **Counting only verified surname occurrences.** That needs per-hit review or OCR alignment (the `HISTORICAL_OCCURRENCE` claim). It is the right next step for the paid report, not a reason to show nothing now.

## 4. Consequences

- A `pl_polona` source and its rights profile exist; the catalogue still leaves Polona to its own module.
- The surname result contract gains an `archive` section (schema 1.8; 1.7 is TASK-051's).
- `ARCHIVE_AVAILABILITY` claims are the first inventory the paid report's eligibility (ADR-0023, `PRODUCT.md` §6) can be built on.
- New rights statements that Polona serves appear in the loader's report as skipped examples, to be added to the vocabulary deliberately.
