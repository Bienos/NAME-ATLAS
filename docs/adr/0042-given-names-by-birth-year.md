# ADR-0042 — First names given to children, by year: stored beside ADR-0032's tables

- **Status:** Proposed 2026-10-06. The first build (TASK-135) is internal: no page, no contract and no claim reads it.
- **Deciders:** the project owner decided the section on 2026-10-06 (D-044) and asked for its import as the first build step. This ADR records the storage and the ingest rules. The product rules (who sees what, the 5,99 zł tier) are D-044's and ADR-0037's and are not changed here.
- **Supersedes:** nothing. It extends ADR-0032, whose rules hold unchanged.

## Context

1. **The source:** dane.gov.pl dataset 219, "Imiona nadawane dzieciom w Polsce", from the PESEL register, published by the Ministry of Digital Affairs (institution 333). Read from the publisher's API on 2026-10-06: `license_name` is `CC0 1.0`, updated yearly, 84 resources.
2. **The cut-off,** in the dataset's own note: "Do roku 2012 imiona z liczbą wystąpień poniżej 5 nie były umieszczane na liście, od 2013 r. granicą tą jest liczba 2". The files agree: the smallest count is 5 in every list up to 2012 and 2 in every list from 2013.
3. **The national first-name files,** read from the bytes on 2026-10-06:
   - 2000–2019 are one CSV, resource 21457: header `Rok,Imię,Liczba,Płeć`, sex `M` or `K`, 24,461 rows, 8,064,304 children.
   - 2019–2025 are a file per year and sex. 2019's are native CSV (21453, 21455). 2020–2025 are XLSX, and the portal serves each as CSV too (`/resources/{id}/csv`, which redirects to the media file). Every one of those CSVs has the header `IMIĘ_PIERWSZE,PŁEĆ,LICZBA_WYSTĄPIEŃ`, except 2022's two, which have `IMIĘ PIERWSZE,PŁEĆ,LICZBA WYSTĄPIENIEŃ`.
   - Every file is UTF-8 without a byte-order mark, with CRLF line ends. No file has a placeholder (`BRAK DANYCH` and the others), a one-character name or a full stop.
4. **2019 twice:** 21457's 2019 rows and the 2019 files 21453 and 21455 agree exactly: 812 boys' names (199,134 children) and 823 girls' names (188,557), every name with the same count.
5. ADR-0032's tables hold one count per name per source record. A file of forty lists (twenty years, two sexes) does not fit that without forty source records for one file.

## Decision

1. **Two tables beside ADR-0032's, sharing its identity.**
   - `given_name_birth_lists`: one published list, a year of birth and a sex, inside one source record. It stores the publisher's cut-off for its year, and the list's own row count and children as read from the file (placeholders included, so a later share is taken over the publisher's whole list), and its comparability group (`pesel_birth_given_names_first_{year}_{sex}`).
   - `given_name_birth_counts`: the publisher's count for one given name on one list.
   - A name is the same `given_names` identity as in ADR-0032 (§1 there): MARIA on a birth list and MARIA on the living-register list are one name with separate counts in separate tables.
2. **Absent is not zero.** No zero is stored. A name with no row in a year was given fewer times than that list's cut-off: fewer than 5 up to 2012, fewer than 2 from 2013. The cut-off is stored on each list, so a later claim can say which.
3. **One list per year and sex, never two.** 2000–2019 come from resource 21457 alone. The 2019 files (21453, 21455) are not imported: they agree with 21457 (Context 4), and importing both would give 2019 two lists to be summed or chosen between. The registry holds every year from 2000 to 2025 for each sex exactly once, and a unit test fails if a second resource covers a year and sex already covered.
4. **Never summed.** The boys' and the girls' lists, and the lists of different years, are never summed. Each list carries its own comparability group.
5. **ADR-0032 still holds.** A placeholder is read, counted and reported, never a name. A one-character or full-stop form is stored verbatim and flagged (`form_review`), not shown. Neither occurs in the 2000–2025 national files; the rules are applied anyway.
6. **Source and rights.** A new source, `pl_pesel_birth_given_names`, with its own CC0 rights profile whose values match the surname source's (D-007's judgement, same publisher and licence), checked against the publisher on 2026-10-06. Ingestion keeps TASK-004's and TASK-078's posture:
   - the rights gate, then the checksum before parsing;
   - fail closed on any change of shape: the header exactly, the column count, a known year and sex, a plain count no lower than the year's cut-off, and every expected list present with no other;
   - one transaction per resource;
   - idempotent on identical bytes;
   - a new version of a resource supersedes the old source record, whose lists stay; a reader takes the ACTIVE record's lists.
7. **XLSX through the portal's CSV.** 2020–2025 are read from the portal's CSV of each XLSX resource, pinned by checksum, as the surname editions are. No XLSX dependency is added.
8. **No claim yet.** This ADR stores; it derives nothing. The yearly count and rank are the next task.

## Consequences

- Migration 0040 adds the two tables. It needs no enum value: `GIVEN_NAME` exists since 0031.
- A name only on the birth lists is a `given_names` row with no `given_name_counts` row. TASK-122's derivation then finds no list for it and writes nothing, as it would for any name with no count.
- The voivodeship files, the half-year files, second names and the civil registry office (USC) files are not imported here. Each is a further list of a year and a sex (with a region, a half-year or a name position) and needs its own decision on where that dimension goes.
- `pnpm import:given-name-births` loads a file already on disk; it downloads nothing. Nothing is loaded on staging or production by this ADR.
