# ADR-0045 — First-name origins and meanings: two public-domain works, as claims

- **Status:** Proposed 2026-10-06. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-06
- **Deciders:** the project owner decided what may be shown in D-046 (2026-10-06) and asked for this build: "yes build the first-name meanings". This ADR records how it is stored, derived and shown.
- **Extends:** ADR-0008 (onomastic sources and the `SURNAME_MEANING` chain), ADR-0041 (the full-name report). ADR-0041's "a meaning section for first names needs its own decision" is this decision.
- **Relates to:** D-043, D-046, ADR-0032 §1 (given names are words), TASK-122, TASK-124.
- **Implemented by:** TASK-147.

## Context

1. D-043 allows a first name's meaning only from a dictionary whose publisher gives free permission, or from a public-domain work; never Wiktionary, never a paid licence, nothing written by the project.
2. The search (`docs/sources/given-name-meanings.md`) found no public-domain Polish dictionary of first names. Two works cover part of the lists:
   - Buryan 1933, chapter A, names the language of origin of about 120 names and gives a meaning for a few.
   - Yonge 1884's Glossary gives a root language and an English meaning for about 100 Polish forms.
3. D-046 allows Buryan's origin quoted with its page, and Yonge's meaning verbatim in English with a literal Polish translation marked as Name Atlas's. It is the one exception to "nothing written by the project". Brückner 1927 waits on a transcription from page images, and Grzenia's book on permission.
4. Surname meanings already run curated file → source record → evidence → `INTERPRETATION` claim → confidence → citation (ADR-0008). Given-name claims are `SHARED` in scope (0038).

## Decision

1. **The files.** Each work's first-name entries are a committed file in `sources/given-name-meanings/`, `"kind": "GIVEN_NAME_MEANINGS"`, citing its work as ADR-0008 §4 requires. Each entry holds:
   - the name as the lists spell it, and the form the work prints;
   - the origin, as a code (`he`, `arc`, `grc`, `la`, `gem`, `sla`, `lt`) and in the work's own words;
   - the work's meaning, verbatim, if it gives one;
   - a translation, only of a meaning, only into Polish, only `"by": "Name Atlas"`;
   - the page or Glossary line, and the work's sentence or line verbatim.

   The parser refuses an entry with neither an origin nor a meaning, a translation with no meaning to translate or by anyone else, an unknown code, an entry without a page or quotation, and a name given twice.
2. **Storage.** A file is one source record of its work's source, with the id `{source_key}:{year}:given-names`. A work's surname file and its first-name file never replace each other, and a source holding both is `MIXED`. The surname chain reads only entries with a `surname`, so it never sees these. Migration 0044 adds `GIVEN_NAME_MEANING` to `claim_type` and holds it at `SHARED`.
3. **The claim.** There is one `GIVEN_NAME_MEANING` claim per name, an `INTERPRETATION`:
   - one piece of evidence per work's entry, the quotation as its excerpt;
   - one citation per work, with the entry's locator;
   - every work's entry in the payload, in order of publication.

   Re-deriving keeps a claim whose works are unchanged. A claim whose works changed is superseded, and one no file supports any more is retracted. A name no work explains has no claim.
4. **Confidence** compares the stated origins, never the meanings, which the works write in different languages:
   - one work: POSSIBLE;
   - two or more works stating the same origin, and none another: LIKELY;
   - two different origins: CONFLICTING, both kept, flagged for review;
   - never VERIFIED.
5. **The report.** `full_name_report@1` freezes the claim in the first name's facts. The first-name chapter shows "Pochodzenie i znaczenie / Origin and meaning", one row per work:
   - the work and page, with its footnote;
   - the origin, in the project's word for the language with the work's words beside it;
   - the meaning, verbatim; on the Polish page Yonge's line is followed by "przekład Name Atlas: …" and a note that the translation is ours;
   - the work's words;
   - then the assessment.

   The chapter's claims include the meaning, as SUPPORT. "What we don't know" names the meaning only when no work explains the name. A version frozen under `@0` reads as having no meaning.

## Why not the alternatives

- **Rows in a table of their own** instead of claims: the report shows claims only (ADR-0001), and a meaning without evidence, confidence and citation would be the one fact without them.
- **Reusing `SURNAME_MEANING`'s shape** (root, gloss, formation type): first-name works state a language and a meaning, not a root and a formation; forcing them in would invent fields.
- **Comparing meanings for confidence:** Yonge's are English and Buryan's Polish. Comparing would mean comparing our translation, which is not a source.
- **Showing only Yonge's English on both pages:** D-046 §2 chose the translation, marked.

## Consequences

- On the full 2026-01-20 lists, 168 names get a claim: 139 POSSIBLE, 27 LIKELY, 2 CONFLICTING (TOMASZ, MACIEJ: Hebrew in Buryan, Aramaic in Yonge). This was measured locally. Common modern names such as Krzysztof, Łukasz, Joanna and Julia have none, and the report says so.
- The two works are old and not linguists' dictionaries (tier C, `LEGAL_REVIEW_REQUIRED` like Buryan's surname file). The page names author and year beside every reading.
- A later work (Brückner, or Grzenia with permission) is a new file of the same format. It adds a row and may move a name to LIKELY or CONFLICTING.
- `ops/vm/given-names.sh` imports both files and derives the meanings after the counts. The production database gets them when the step is next run.
