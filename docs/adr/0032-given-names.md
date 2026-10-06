# ADR-0032 — Given names: a second name type, kept apart from surnames

- **Status:** Proposed 2026-10-03. The first build (TASK-078) is internal: no page, no contract and no claim read it.
- **Deciders:** the project owner asked on 2026-10-03 to "design adding full name report to paid so you can find name meaning", and then to "start the first-name statistics". This ADR records the storage that start needs. The product questions (which tier, free or paid, which meaning sources) are open in the design draft and are not decided here. The owner answered them on 2026-10-05 (D-043): paid, in the 28,99 zł tier; every listed name; meanings only from a free publisher's permission or the public domain, never Wiktionary and never a paid licence.
- **Supersedes:** nothing. It adds an entity that `docs/canonical/11` does not have.

## Context

1. The product so far is surnames only (`PRODUCT.md`). `docs/canonical/11` has no given-name entity, and `docs/canonical/13` §55 lists "deep person/given-name linkage" under what not to build yet. Linking a given name to a person is still out. Statistics about a given name as a word are a different thing, and this ADR adds only that.
2. The PESEL given-name lists are published by the same publisher as the surname lists, under the same licence: dane.gov.pl dataset 1667, "Lista imion występujących w rejestrze PESEL", CC0 1.0, yearly. Read on 2026-10-03, the 2026-01-20 first-name files are resource 1159669 (male) and 1159670 (female).
   - The dataset's own note says single occurrences and deceased people are left out ("Pojedyncze wystąpienia oraz dane dot. osób zmarłych nie zostały umieszczone na liście").
3. The files are not clean lists of names. Read from the bytes on 2026-10-03:
   - **Publisher placeholders:** `BRAK DANYCH`, 1,001 people on the male list and 128 on the female; also `BRAK IMIENIA`, `BRAK`, `BRAKDANYCH`, `-` and `XXX`.
   - **Single letters:** `I`, `M`, `E`.
   - **Abbreviated forms:** `MD.`, `MA.`, `ROMEO JR.`.
   - **Compound foreign names in one field:** `JUAN CARLOS`.
   - **Turkish, Vietnamese and other diacritics:** `ALİ`, `THỊ`.
   - Under the resolver's `canonicalKey`, no two rows of one file share a key, and no row is mixed-script.
4. `ARCHITECTURE.md` §10 makes `DistributionSnapshot` surname-scoped, and that invariant stays.
5. **Concentration,** measured on the same bytes: the 200 most common first names cover 92.7% of people on the male list and 93.5% on the female list; the 300 most common cover 94.8% and 96.1%.

## Decision

1. **A separate identity.** Given names get their own table, `given_names`, beside `surnames`, with entity type `GIVEN_NAME`.
   - **Identity:** the written form under the resolver's `canonicalKey` (and its version), unique, stored verbatim as `canonical_display`.
   - **One identity per written form:** a name on both the male and the female list (MARIA) is one identity with two counts. Sex is a property of the list, not of the name.
   - **Never mixed with surnames:** a given name and a surname with the same letters (MAREK, the name, and MAREK, the surname) are two entities, and no claim, count or page joins them.
2. **Given-name-scoped counts.** Counts go into `given_name_counts`, one row per (given name, source record).
   - It is not a `DistributionSnapshot`, and the surname-scoped invariant is untouched.
   - The count is the publisher's own, at least 2 (the lists leave out single occurrences); a name absent from a list has no row, never a zero.
   - The name's position (`FIRST` or `SECOND`) and the list's sex belong to the resource, as they do for surname partitions. They are carried by the descriptor and the source record's comparability group, so two lists are never summed.
3. **Placeholders are not names.** A fixed, reviewed list of exact strings (`BRAK DANYCH`, `BRAKDANYCH`, `BRAK IMIENIA`, `BRAK`, `-`, `XXX`) is read, counted and reported by the import, and never becomes a given name. The file's total of people still includes them, so a later share is taken over the publisher's whole universe.
4. **Doubtful forms are stored, flagged and not shown.** A row of one character, or one containing a full stop, is imported verbatim with `form_review = 'INITIAL_OR_ABBREVIATION'`. A later surface must leave it out until someone has reviewed it. No form is guessed, expanded or corrected.
5. **Source and rights.** A new source, `pl_pesel_given_names`, has its own CC0 rights profile. Its values match the surname source's, checked again on 2026-10-03. Ingestion follows TASK-004's posture:
   - checksum before parsing;
   - fail closed on any change of shape;
   - one transaction;
   - idempotent on identical bytes;
   - a new version of a resource supersedes the old one, never rewrites it.
6. **No claim yet.** This ADR stores; it derives nothing. `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` are the next task, through the same evidence → claim → confidence → citation chain as the surname claims.
7. **Privacy.** The lists are aggregates of a public register and hold nothing about a person. When a reader later types a full name, the rules in the design draft's §5 apply: processed in memory, never logged or put in a URL, and never combined with a surname count into "N people called X Y".

## Consequences

- Migration 0031 adds `GIVEN_NAME` to `entity_type` and `source_granularity`, plus the two tables. It follows `main`'s 0029 (#84) and #76's 0030 (family safeguards).
- Second names, earlier editions (2019–2025), the deceased-inclusive list (dataset 1501) and births by year (dataset 219) each fit the same tables as further resources. They are not imported here.
- A later page that shows a given name reads claims, not this table (ADR-0001, `ARCHITECTURE.md` §6).
- §6 is carried out by TASK-122 (2026-10-05): migration 0038 adds the two claim types and a `BASIC_GIVEN_NAME` run type; ranks are refused unless the stored names are the complete official list.
- The full-name report (TASK-124, ADR-0041) is the first surface to read the given-name claims. §4 and §7 hold there: a flagged form gets no report, and the two names are never combined into a count.
- D-044 (2026-10-06) gives births by year (dataset 219) a use: a signed-in section for parents, with a free basic view and the full figures in a 5,99 zł tier (ADR-0037, amended). Its import, and where its voivodeship and half-year files sit beside these tables, are for that build's own ADR. Its lists left out names given fewer than 5 times up to 2012 and fewer than 2 from 2013, so an absent name is never a zero.
- ADR-0042 (2026-10-06, TASK-136) stores dataset 219's national first-name lists for 2000–2025 beside these tables: `given_name_birth_lists` (a year, a sex and the publisher's cut-off) and `given_name_birth_counts`, sharing `given_names`. Every rule above holds there.
