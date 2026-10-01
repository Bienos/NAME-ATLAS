# ADR-0025 — After a search, the surname opens as a deck of cards over the full page

- **Status:** Accepted 2026-10-01, by the project owner's decision on the prototype: "ok, lets do it".
- **Date:** 2026-10-01
- **Deciders:** the project owner, 2026-10-01: "default are cards that you swipe with info about your surname", with "a button that shows you full normal website", "for desktop and mobile", and "it must open when someone types surname". Asked about the cards proposal, they chose: link the other grammatical form ("yes, with that label"), show localities with the same name under a warning line, and keep publication languages off the page.
- **Relates to:** ADR-0022 (the journey as screens; §3 rejected a scripted pager), ADR-0021 (the dusk direction), ADR-0012 (evidence at the foot), TASK-053, TASK-054.
- **Prototype:** the artifact "Name Atlas Deck", built on real data for NOWAK, KOWALSKI and ZAREMBA.

## 1. Context

- The surname page answers in one long page of chapters (TASK-053). The owner wants the first thing a person sees after typing a surname to be a deck of cards: one answer per card, swiped on a phone and stepped through on a desktop.
- ADR-0022 §3 rejected "a scripted pager that shows one screen at a time". A pager hides the rest of the answer from readers without script, from crawlers and from the honesty tests, which assert that nothing in the result view is hidden.
- A full-screen layer shown to visitors who arrive from a search engine reads as an interstitial over the content they asked for.
- Two facts the cards need are not in the contract: the surnames just above and below on the same list, and a surname's other grammatical form on the other list.

## 2. Decision

1. **The deck is a layer over the complete page, never a replacement for it.** The page renders in full, exactly as today. The deck is drawn by script on top of it, from the same validated response, and adds no fact the page does not show. Without script, the page is all there is. This keeps ADR-0022 §3's reasons: nothing in the result view is hidden or removed.
2. **The deck opens after a search on the site.** The search redirect adds `?view=cards` to the surname's address, and the canonical URL does not change. A visit without the parameter, such as one from a search engine, shows the page with a "Zobacz karty" / "See the cards" button that opens the deck. "Cała strona" / "Full page" closes the deck and removes the parameter.
3. **One answer per card, and a card only where there is an answer.** The cards are: the surname with both counts, rarity, neighbours on the list, where it is most common, change over time, the other grammatical form, meaning, old print, what else is in Polona's catalogue, and the summary. A section that is not ready gets no card. Each card carries its source and date on its face.
4. **Neighbours are read, not derived on the page.** The contract gains `neighbours`: for each list, the surnames whose active `CURRENT_RANK` is within two places of the surname's own, with their counts. They follow the rights of the rank claims. A tie at the surname's own place is not listed; where more surnames share a neighbouring place than fit, which of them are listed is fixed by the surname id, not ranked.
5. **The other grammatical form is a fixed rule over the register, stated as a form.** A surname ending in -ski, -cki or -dzki pairs with the same stem ending in -ska, -cka or -dzka, and the reverse. The pair is shown only when both are in the register and the other form has a rank on the other list. The card calls it the other grammatical form and says it states nothing about kinship. No other ending is paired.
6. **Publication languages stay off the page.** Polona's per-language counts remain stored and unshown, because a line such as "pages in Yiddish" invites a reading about bearers' ethnicity (`PRODUCT.md` §8).
7. **Localities with the same name and famous bearers are later cards**, each with its own task: the first needs the TERYT lookup and its warning line, the second a new source (Wikidata) and a decision about living people.

## 3. Why not the alternatives

- **Replacing the page with the deck.** It hides the answer from readers without script, from crawlers and from the honesty tests (ADR-0022 §3).
- **Opening the deck on every visit.** Visitors from a search engine asked for a page; a layer over it is an interstitial.
- **Pairing every adjectival ending (-y/-a, -i/-a).** Those pairs are less regular and collide with nouns. The -ski/-cki/-dzki rule is regular, and the owner approved the label, not a broader rule.

## 4. Consequences

- Contract `surname-result` 1.10 adds `neighbours` and `other_form`.
- The deck is presentation only: its tests assert that every figure on a card is the one the page prints. So the page gains what the cards add: the rarity chapter shows the neighbours and the other form, and the archive chapter shows Polona's catalogue records by kind.
- A surname picked from the search box's suggestions opens the deck too: it is a search on the site.
- The prototype's famous-people and localities cards are not built here.
