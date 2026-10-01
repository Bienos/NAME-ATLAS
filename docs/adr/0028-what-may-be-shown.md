# ADR-0028 — What may be shown: published statistics, old print, archives, famous bearers, readers' trees and partners' data

- **Status:** Accepted 2026-10-01, by the project owner's instruction in the session that wrote it: "do it best way but show all". A lawyer's review before anything is sold stays a gate (ADR-0023 §2.5); this record is the project's rule, not legal advice.
- **Date:** 2026-10-01
- **Deciders:** the project owner.
  - They asked for the most that can lawfully be shown in every tier, in one place, so that the paid tiers sell real data and no page shows what it may not.
- **Resolves:** ADR-0025 §2.7's "a decision about living people" for famous bearers, and `STATUS.md`'s "More cards" precondition for Wikidata.
- **Relates to:** `docs/canonical/19` §4, §9–§13 and §169, `ARCHITECTURE.md` §5 and §7, `PRODUCT.md` §7 and §8, ADR-0007 (rights per asset), ADR-0014 and ADR-0024 (Polona), ADR-0026 (the tiers), ADR-0027 (accounts), `docs/sources/candidate-sources.md` §18 and §28–29.

## 1. Context

- The site holds published statistics (the PESEL register, all editions 2019–2026, TERYT), Polona's archive availability for 2,723 surnames, and 25 meanings from Buryan 1933.
- Next come famous bearers (Wikidata), links to State Archives registers (Szukaj w Archiwach), accounts with a family tree, paid reports and a genealogist service. A partnership with the Polish Genealogical Society (PTG) for Geneteka is being sought.
- The rules for these are spread over `docs/canonical/19`, `PRODUCT.md` and four ADRs. Each new card has had to ask again what it may show about living people.
- Polish civil registers pass to the State Archives, and become open there, 100 years after the end of the year of registration for births and 80 years for marriages and deaths (Prawo o aktach stanu cywilnego, art. 28). Before that, a copy goes only to someone with a legal interest. GDPR does not apply to the dead (recital 27), but copyright, database rights and archive terms still do (`docs/canonical/19` §9).

## 2. Decision

1. **Published statistics: show all of it, in every tier, free included.** Every count, rank, share, region and edition the publisher published, including the smallest counts, with its source and date. A count is never set beside a person, a place of residence or anything that would point at one bearer, and suppressed is never zero (`PRODUCT.md` §7.4). Selling these figures is not a paid feature: they stay free (`PRODUCT.md` §5).
2. **Old print (Polona): ADR-0024 as it stands.** Counts are words, not people. Only public-domain pages are quoted, at most 300 characters, linked to Polona and credited. A quoted page may be an armorial. It is shown as a dated print that contains the word, never as the reader's arms or descent: `PRODUCT.md` §8 non-goal 5 holds.
3. **Archives: link, never copy, and never name a person on a public page.**
   - A page may list which registers exist for a place: parish or civil office, kind (births, marriages, deaths), years, archive and fonds, whether scans are online, and a link to them on Szukaj w Archiwach. Every series for the place is listed, of every denomination, with no suggestion of a bearer's religion (`PRODUCT.md` §7.8).
   - No scan or index of a person is copied into the site.
   - No public page, share card or cache holds a named person from a register, at any age of record (`docs/canonical/19` §11 and §169: not a people-finder).
4. **Person-level records exist only in two private places,** never public, never shared by default, never indexed:
   - **the reader's own tree** (ADR-0026 §2.5): what they enter, private to them and those they invite;
   - **the genealogist's report** for the client who ordered it.

   In both, a record from a register may name a person only when the record is past the archive period of rule 3's context (births 100 years, marriages and deaths 80), or the person is known to have died, or the client is that person or has the legal interest the registry office would ask for. A person whose living status is unknown is treated as living (`docs/canonical/19` §10): an old record is not proof of death.
5. **Famous bearers (Wikidata, CC0).**
   - Only people with an article in the Polish or English Wikipedia, which is the test for a public figure.
   - **Died:** name, years of birth and death, what they are known for, the Wikipedia link.
   - **Living, or status unknown:** name, what they are known for, the Wikipedia link. No date or place of birth, no photo, no relatives, no place of residence.
   - Every card says "shares the surname — not your relative" and is ordered by how widely known, as ADR-0026 §2.1 says.
   - A person who asks to be removed is removed, with no question about their reason.
6. **What readers enter is theirs.** A tree or a family-surnames view is private to the reader, holds living people only after the terms (ADR-0026 §2.5), matches other readers' trees only on people who have died, never feeds a public page or the public cache (`ARCHITECTURE.md` §7), and is deleted with the account (ADR-0027 §2.10).
7. **Partners' data (Geneteka and others): statistics only, under a written agreement, and nothing before it.**
   - No automated access to Geneteka, GenBaza, FamilySearch or any genealogy database without one (`PRODUCT.md` §10; database right).
   - Under an agreement, a surname page may show counts of records per surname by parish and decade, the earliest and latest year, and the written forms, credited to the partner and linked to its search. No individual's name, date or record.
8. **Comparisons of two or more surnames compare surnames, never people.** A couple or family view may show where the surnames' bearers overlap today and in the published data. It never states or scores that two people are related, and it never makes a health, genetic or "safe to have children" claim. A comparison label always says it describes everyone carrying each surname.
9. **Sensitive context stays out.** No ethnicity, religion, politics, health or genetics is inferred from a surname (`PRODUCT.md` §7.8). A record that carries persecution, repression, adoption or similar context (`docs/canonical/19` §13) may support a surname-level statement ("appears in collection Y in 1946") and nothing about a reader's family.
10. **Price never unlocks a person.** No tier, at any price, shows a living or unknown-status person's record, or turns rule 3's public-page limit into a paid feature. The paid tiers sell depth on the surname, the reader's own tree, and a genealogist's private work.

## 3. Surfaces at a glance

| Data | Free page, cards, share card | Account | Paid surname report | Genealogist's report (private) |
|---|---|---|---|---|
| Published statistics, every edition | All | All | All, with analysis | All |
| Old print (Polona) | Counts, up to three public-domain quotes | Same | Full list of public-domain pages | Same |
| Archive registers for a place | List of series with links | Same | Full index of series for the surname's places | Records read by the genealogist, rule 4 |
| Famous bearers | Rule 5 | Same | Rule 5, the full list | Rule 5 |
| Reader's tree | None | Private, rule 6 | Private, rule 6 | Client's own, rule 4 |
| Partner statistics (with an agreement) | Counts by parish and decade | Same | With analysis | Same |
| Named persons from registers | Never | Never | Never | Rule 4 only |

## 4. Why not the alternatives

- **Hide small counts.** The publisher released them openly under CC0, and hiding them would make the free answer less true. The risk in a count is in what it is joined with, which rule 1 forbids.
- **Show old register entries on public pages, past 100 or 80 years.** Openness in an archive's reading room is not a licence to republish, the person may be alive, and it would make the site a people-finder.
- **Living famous bearers with full Wikidata fields.** Wikidata is CC0, but a birth date, birthplace and relatives add nothing to "shares the surname" and are what a profile of a living person should leave out.
- **Collect Geneteka by script until an agreement exists.** It is a database the society built and protects, and `PRODUCT.md` §10 requires permission.

## 5. Consequences

- The Wikidata famous-bearers card can be specified as a task: its living-people rule is rule 5.
- An archive-index card over Szukaj w Archiwach can be specified as a task under rule 3.
- The PTG approach asks for exactly rule 7's statistics (`docs/sources/candidate-sources.md` §18).
- The terms and privacy notice for the tree and the genealogist service carry rules 4 and 6 when those pages are built.
- The tiers' names and prices are D-025. This record names no price, so either answer leaves it true.
