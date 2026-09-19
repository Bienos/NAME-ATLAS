# Acquisition record — 2026-09-18

Provenance record for the acquisition run that corroborated TASK-002's PESEL source pinning.
**No raw source bytes are stored here**, by design (`AGENTS.md` §6; only checksums, metadata and small fixtures are versioned).

The authoritative Name Atlas record of what the PESEL source is remains `docs/sources/pesel.md`.
This directory is the evidence underneath it.

## What this is

On 2026-09-18 the project owner ran an automated acquisition tool on their own machine and produced
`NAME_ATLAS_ALL_DOWNLOADED_DATA.zip` — 138,623,907 bytes,
`sha256 555bc4da551058746a181dc16acaa66e28f39bd98e8ef3c405ff89270a9fb6ea`, generated `2026-09-18T17:44:29Z`.
It contains raw source files for several countries plus the genuine `api.dane.gov.pl` JSON:API metadata
responses captured for each.

The archive was transferred into a working session, reassembled, and verified: zip integrity OK,
**46 of 46 data files matched the archive's own `SHA256SUMS.txt`**, zero mismatches.

## What is kept here, and why

| Path | What it is |
|---|---|
| `SHA256SUMS.txt` | The archive's own checksum list, verbatim, all 46 files. Lets any future holder of the archive re-verify it, and lets a re-download be checked against what was actually verified here. |
| `ACQUISITION_REPORT.md` | The acquisition tool's own report, verbatim. |
| `metadata/*.official_resource.json` | The genuine `api.dane.gov.pl` JSON:API responses for the four 2026 PESEL resources and the dataset. These are the primary evidence for the download URLs, portal timestamps and native format recorded in `fixtures/pesel/source-manifest.json`. |
| `metadata/pesel_*_2026_*.json` (without `.official_resource`) | The acquisition tool's per-source record for the same four resources, including its HTTP details. |

**These files are a verbatim capture of an external tool's output.** They are retained as evidence, not as
Name Atlas assertions. In particular the tool's own `task_D001_status` and `product_validation` fields are
*its* claims about *its* run; they are not this project's record and carry no authority here.

## Where the raw bytes live

**Not in this repository, and not on any machine this project controls.** The working session that verified
the archive runs in an ephemeral container that is reclaimed after the session ends. The durable copy is the
project owner's own (`NAME_ATLAS_ALL_DOWNLOADED_DATA.zip`, plus the source files' original public endpoints).

If the archive is lost, the checksums above make re-acquisition verifiable: re-download from the endpoints
recorded in `fixtures/pesel/source-manifest.json` and check against `SHA256SUMS.txt`. A mismatch means the
publisher changed the file, which is itself a finding and must be recorded, not worked around.

## Findings that constrain future use

These are the reasons this record exists rather than a bare checksum file.

1. **Two "different years" are byte-identical.** `pesel_national_2021_female_35279` and
   `pesel_national_2022_female_38772` have the same SHA-256
   (`9af26480ed3035e7e6b9349033c4ccd76bee3eeb5e8ac7ce299a8d00ba0b62e0`) and the same byte size (4,141,803) —
   two distinct resource IDs, two distinct advertised years, one file. Whatever that means at the publisher's
   end, it means **the archive's earlier annual snapshots cannot be treated as a comparable year-over-year
   series** without establishing, per year, what each resource actually contains. This is evidence against
   casual trend use, not a defect in the archive.
2. **Four of 50 sources failed to download** (`us_census_2010_surnames`, `teryt_wmrodz`, `prng_localities_xlsx`,
   `prg_voivodeships`) — recorded in `ACQUISITION_REPORT.md`. 46/50 attempted, 46/46 of those verified.
3. **Nothing here except the 2026 national PESEL pair is ingested, parsed, fixtured or rights-reviewed.**
   The archive also holds US Census, France INSEE, Belgium, GeoNames, TERYT and Morfeusz data. Multi-country
   coverage is an explicit MVP non-goal (`PRODUCT.md` §8 item 9). Possessing bytes is not authorisation to use
   them.
4. **Regional PESEL resources are observed, not adopted.** See D-004 in `docs/DECISIONS_NEEDED.md` — the
   adoption decision and the binding semantic restriction on registered-residence geography are unchanged by
   anything in this directory.
