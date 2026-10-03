# ADR-0030 — Well-known bearers of a surname, from Wikidata, living people included

- **Status:** Accepted 2026-10-03, by the project owner's decision in the session that wrote it.
- **Date:** 2026-10-03
- **Deciders:** the project owner. Asked to build "the famous bearers card from Wikidata", then, asked whether living people may be named: "I only want to use famous people with specific surname … so it should include living people".
- **Resolves:** ADR-0025 §2.7's open condition for this card ("a new source (Wikidata) and a decision about living people").
- **Relates to:** ADR-0025 (the deck), ADR-0026 (the tiers: "famous bearers" in "Nazwisko i rodzina"), ADR-0024 (the pattern of a source's query output as a claim), `docs/canonical/12` §13 (the Wikidata connector), `docs/canonical/17` hard case 14 ("famous historical person with user's surname"), D-033 (counting people by full name, which this does not do).

## 1. Context

- Wikidata is in the source catalogue as `global_wikidata` (TASK-038): structured data under CC0, `docs/canonical/12` §7 "NOW", every rights dimension the catalogue states `ALLOWED`. `docs/canonical/12` §13.3 classes it `COMMUNITY_STRUCTURED`: good for identifiers, labels and leads, never on its own for origin or family.
- A person's family name is `P734`, pointing at a family-name item. Many Polish women are filed under the masculine item ("Kowalski"), and double surnames under one of their parts, so the item alone does not give the exact surname. Observed 2026-10-03: the items labelled "Kowalska" or "Kowalski" carry 3,392 person rows once duplicates are counted; 55 people with a Wikipedia article are named exactly KOWALSKA.
- `docs/canonical/11` §11 has no claim type for this.
- Some of these people are alive. Their names and short descriptions are already public on Wikipedia and Wikidata, but republishing them is processing personal data under the GDPR.

## 2. Decision

1. **The card answers "who well known has this surname?"** with people whose own name, as Wikidata labels it (Polish, else default, else English, without Wikipedia's disambiguation in brackets), ends with exactly the surname as a whole word. A person filed under "Kowalski" is a KOWALSKA bearer only if her name ends with "Kowalska"; "Nowak-Michalska" is not a NOWAK.
2. **The query is bounded and polite.** One query for the people filed under the family-name items labelled with the surname (and, for a feminine -ska/-cka/-dzka form, its masculine item), restricted to humans with an article in at least one Wikipedia; a second only for the descriptions and articles of those kept. At least one second apart, a user agent naming Name Atlas and its contact page, a timeout, three tries, and the service's own `Retry-After` honoured. Queried ahead of time by a loader, never when a page is viewed.
3. **What the page states is `NOTABLE_BEARERS`**, a new claim type on `ARCHIVE_AVAILABILITY`'s pattern: a `FACT` about the query's output, `VERIFIED` within the queried scope, surname-level only (migration 0029). It carries the count of exact bearers, how many have a date of death in Wikidata, and up to 20 people ordered by how many Wikimedia sites have a page on them (`sitelinks`), then by id. Evidence type `OTHER`: Wikidata is neither an authoritative index nor scholarship.
4. **Living people are included, within limits.** Only people with a Wikipedia article (public figures by that test), only what Wikidata states publicly (name, a one-line description of at most 200 characters, years of birth and death, a link to the article and to the item), no photographs, no dates finer than a year. A missing date of death is shown as no date, never as "living".
5. **Anyone named may be removed.** The page links to the contact page beside the list; the privacy notice states the basis (legitimate interest, art. 6(1)(f) GDPR) and the right to object. A request is honoured by adding the person's Wikidata id to `WIKIDATA_EXCLUDED_PEOPLE` and re-running the load for the surname, which supersedes the claim; the person leaves the count too.
6. **Refreshed every 30 days.** People's entries change faster than Polona's catalogue; the loader skips a surname queried within 30 days.
7. **The free page shows three; the paid report all it keeps.** The free page, the deck and search engines list the first three and the count; the `PAID` and `INTERNAL` surfaces list all (up to 20). The rest is named as coming in the "Nazwisko i rodzina" report (ADR-0026), which is not built.
8. **A shared surname is not a family.** Every surface that names people says so beside them (`docs/canonical/17` hard case 14).

## 3. Why not the alternatives

- **Deceased people only.** Safer, but the owner chose to include living people, and the most recognisable bearers of many surnames are alive. The limits in §2.4–2.5 are the cost of that choice.
- **Matching on the family-name item alone.** It would list every Kowalski on the KOWALSKA page, and the user asked for the exact surname.
- **Restricting to Polish citizens.** Not asked for, and it would drop well-known emigrants and their descendants. The description says who each person is.
- **Wikidata's `wbgetentities` API for the details.** It answered "too many requests" from this network on 2026-10-03; the query service answered the same in a bounded second query.

## 4. Consequences

- The surname result contract gains `bearers` (schema 1.12; 1.11 is `localities`, open in #70 and #77).
- `global_wikidata` is inserted from the source catalogue on first use, with the catalogue's profile unchanged.
- The privacy notice names the processing (both languages, dated 2026-10-03). It is not a lawyer's review (ADR-0023 §2.5).
- Counting how many people in Poland hold a given first name and surname is not part of this, and has no source: D-033.
