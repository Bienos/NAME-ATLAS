# ADR-0003 — `SourceRecord` granularity for bulk datasets, and the `source_records` uniqueness key

- **Status:** Accepted
- **Date:** 2026-09-19
- **Deciders:** project owner + TASK-004 specification session
- **Depends on:** ADR-0002 (PostgreSQL access and query layer)
- **Supersedes:** the `source_records` index line in `docs/canonical/11`'s index specification, for the case described below. Nothing else in `docs/canonical/11` or `12` is altered.
- **Resolves:** `docs/DECISIONS_NEEDED.md` D-006 · `tasks/004-pesel-surname-ingestion.md` §14 U-8

## Context

Two canonical documents disagree about what one `SourceRecord` represents when the source is a bulk dataset rather than a per-item API.

**Version-scoped reading — `docs/canonical/12`.** §3.1's `BULK_DATASET` pattern is `DOWNLOAD VERSION → checksum → raw object storage → staging validation → canonical import → atomic snapshot activation`, and §9.2 is titled "versioned full-snapshot import". Checksumming and versioning are operations on a file. `docs/canonical/11` §9.2 additionally specifies `raw_payload` as "size-limited", which argues against one record per CSV row.

**Row-scoped reading — `docs/canonical/11`.** §37.2's worked example shows `SourceRecord SR1` with `external_record_id: row/resource identifier` and `raw_payload: {surname: "[SURNAME]", count: 2481}` — a single CSV row. The field gloss itself says "row/resource", so the canonical model does not commit.

The two readings are not merely stylistic, because `docs/canonical/11`'s index specification mandates:

```text
UNIQUE source_records(source_id, external_record_id) WHERE external_record_id IS NOT NULL
```

Under the version-scoped reading `external_record_id` is naturally the publisher's resource id (`1148808`). PESEL is refreshed annually (`docs/canonical/12` §9.9), and `docs/canonical/12` §9.3 plus `ARCHITECTURE.md` §10 invariant 6 require that a reissued resource produce a **new** immutable record superseding the old one rather than an in-place update. Two records for `1148808` then collide on that index. The index and the supersession requirement cannot both hold literally.

For scale: the two 2026 national resources carry 408,182 and 420,082 rows.

## Decision

**One `SourceRecord` represents one resource version. `external_record_id` stays the publisher's own bare identifier, and the uniqueness key over `source_records` becomes `(source_id, external_record_id, content_hash)`.**

| Element | Value |
|---|---|
| Granularity | one record per imported resource version |
| `external_record_id` | the publisher's resource id, verbatim (`1148808`, `1148811`) |
| `record_type` | `API_OBJECT` — the payload stored is literally the `api.dane.gov.pl` resource object; the CSV is its `csv_download_url` representation |
| `raw_payload` | the publisher's resource-metadata object, not a data row |
| `content_hash` | the verified SHA-256 of the imported bytes |
| Uniqueness | `UNIQUE source_records(source_id, external_record_id, content_hash) WHERE external_record_id IS NOT NULL` |
| Reissue behaviour | a new row; the prior row gets `record_status = 'UPDATED'` and the new row's `supersedes_source_record_id` points at it |

Individual CSV rows are **not** `SourceRecord`s. A row's evidential content reaches the model as a `DistributionValue` under a surname-scoped `DistributionSnapshot`, which is where `docs/canonical/11` §6.1–§6.2 puts it.

## Why

- It is the only reading under which `content_hash`, the `BULK_DATASET` checksum step and the annual-refresh supersession rule all mean something. A per-row record has no file to checksum and no version to supersede.
- It keeps `external_record_id` honest as the "Native source identifier" that `docs/canonical/11` §9.2 calls for. Encoding a version discriminator into that column (`1148808@ce4238fe`) was considered and rejected: it satisfies the canonical index literally but makes the column stop being the publisher's identifier, which is a quieter and more misleading deviation than the one recorded here.
- It respects `raw_payload`'s stated size limit. Row granularity would write ~828k payload rows per full import and multiply them on every refresh.
- The deviation is narrow. Adding `content_hash` to the key only permits multiple records where they differ in content — exactly the supersession case. It forbids nothing the canonical index forbade, because a duplicate import of identical bytes still collides, which is what makes idempotent re-ingestion safe.

## Consequences

- `docs/canonical/11`'s index line is **not** implemented verbatim. Any future reader comparing schema to canonical text will find this difference; this ADR is the reason, and the migration must carry a comment pointing here.
- Idempotence rests on this key: re-importing identical bytes hits the unique constraint on `(source_id, external_record_id, content_hash)` and is a no-op.
- `TASK-004` §14 U-8 is closed. AC-06, AC-22 and §9 invariant 7 may now be written in concrete form.
- Row granularity remains available to a future source whose natural unit genuinely is the record (a per-item REST API, an archival catalogue entry). This ADR governs `BULK_DATASET` connectors, not every connector.

## Do not revisit unless

- a source appears whose bulk resources have no stable publisher identifier, so `external_record_id` cannot carry one; or
- `docs/canonical/11`'s index specification is itself revised, at which point this ADR should be reconciled with it rather than silently kept.

A session's convenience, or a preference for matching canonical text literally at the cost of the supersession invariant, are **not** reasons to revisit this.
