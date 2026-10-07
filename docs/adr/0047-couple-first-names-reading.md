# ADR-0047 — "Co mówią Wasze imiona razem": a reading of two first names' sourced meanings for a couple, written by a model, with shared motifs; free now, 15,99 zł when the owner says so

- **Status:** Proposed 2026-10-06. It becomes accepted when the project owner merges the pull request that carries it.
- **Date:** 2026-10-06
- **Deciders:** the project owner, in D-050 (2026-10-06). Asked for first-name compatibility for couples "na bazie ich znaczenia", with an explanation written by AI, paid, and for a price, they were offered three framings and answered:
  - **"B czyli a i b"**: a reading of the two sourced meanings with no verdict (A), plus shared motifs (B).
  - On showing each name's own meaning free on the baby-names page: **"tak i gdzieś jeszcze"** ("yes, and somewhere else too"). Read here as: also on the couple page itself, for both names, before anything is generated. The owner may name another place.
  - On the price: **"narazie darmowe ale bedzie kosztowac 15.99 PLN i w kazdym pakiecie drozszym"** ("free for now, but it will cost 15,99 PLN and be in every dearer package"). Read as: build now, free with an account; the price comes later, by the owner's word.
- **Extends:** ADR-0035 (the surname couple report; its §2.3, no verdict, stands word for word and binds this page), ADR-0045 (the `GIVEN_NAME_MEANING` claims this reads), ADR-0013 (OpenAI; this is the first use of a model), ADR-0037 (a product of its own when priced).
- **Relates to:** D-046 (coverage of the meanings), D-043 (nothing written by the project), D-033 (no count of first name and surname: the page shows no surname), `docs/canonical/19` §66–67 (OpenAI vendor baseline, project isolation), PRODUCT.md §5, §7.
- **Implemented by:** TASK-156 (the page, the reading; written as TASK-150 and renumbered on 2026-10-07, see the task). The free meaning on the baby-names page (§2.2) was built by TASK-151 the same day. Shared motifs and the price are the next two tasks, not yet numbered.

## 1. Context

1. The surname couple report (ADR-0035, TASK-100) sets two surnames' facts side by side and forbids any score, percentage, verdict or prediction about the couple. Given names are not on it.
2. First-name meanings are claims (ADR-0045, TASK-147): one `GIVEN_NAME_MEANING` per name from Buryan 1933 and Yonge 1884. On the committed files, 168 names have a claim, 107 a meaning (a quoted gloss), 61 only a language of origin. They are shown only in the full-name report (28,99 zł). Common modern names have nothing (D-046). Migration 0044 and the files are not yet on the VM. Later the same day TASK-150 added Brückner 1927's entries: on the three committed files, 181 names have a claim, 116 a meaning, 65 an origin only (counted 2026-10-07).
3. No source states whether two names suit each other. A verdict or a percentage would be a figure nothing measures (AGENTS.md §9, PRODUCT.md §7.1, §7.7).
4. ARCHITECTURE.md §4 lets a model "structure or synthesise evidence" and never assign confidence; ADR-0013 names OpenAI, keeps the key server-side and leaves the model, the prompt and the cost limit to the first task. No model code exists.
5. The owner wants couples to be able to ask the question, with an explanation written by AI, and one's own name answered free.

## 2. Decision

1. **The page.** `/pl/imiona-pary?a={imię}&b={imię}` and `/en/couple-names?a={name}&b={name}`, title **"Co mówią Wasze imiona razem"** / "What your names say together". Signed-in only, as the baby-names page is; `noindex`, in no sitemap, `private, no-store`. On only when `COUPLE_NAMES_ENABLED` is exactly `1` (the meanings are not on production yet). Any two names, in any order, of any sex; the same name twice is allowed. No surname anywhere on it.
2. **What is free, with an account.**
   - Each first name's origin and meaning as its claim states it, with the work, year, page, the verbatim gloss, the marked translation and the assessment, exactly as the full-name report shows it (ADR-0045 §5), on **the baby-names single-name page** and on **the couple page** for both names, before anything is generated. A name no admissible work explains says so, in the report's words.
   - **The reading, for now.** Until the owner turns the price on, every signed-in reader may ask for it.
3. **The reading (framing A).** Written by the model from the two names' claim payloads and nothing else: the works, origins, glosses, translations and locators. It is shown under the heading **"Odczytanie Name Atlas"** / "A Name Atlas reading", with one line that names the model and says it is an interpretation of the sourced meanings below, neither a fact nor a judgement of the couple. Rules it must keep, checked by code before it is shown:
   - no verdict, score, percentage, hearts or prediction about the couple, and none of TASK-100 §3.4's words ("pasujecie", "dopasowanie", "zgodność", "match", "compatible", "made for each other"), nor "procent", "percent", "%", nor any digit;
   - nothing that is not in the input: no meaning, etymology, saint, history, famous bearer or trait the works do not state; the works named as given;
   - 120–220 words in each language, Polish and English from one call, addressed to the two readers.
   A text that fails the check is generated once more; a second failure shows "Odczytanie nie powstało" and the meanings stay. A reading needs a quoted meaning on both sides: a name with an origin only, or with no claim, gets no reading, and the page says which name and why. The model is never asked to fill the gap (D-043).
4. **Stored once, never changed.** A reading is generated on the reader's request (a button, one `POST`), not on page view, and stored in the public database (migration 0047, `given_name_readings`) keyed by the unordered pair, the two claim ids and the prompt version, with the model's name and the time. The next reader of the same pair gets the stored text. A superseded claim makes a new reading; the old row stays; rows are never updated or deleted. A reading is about two names as words (`SHARED`, ADR-0045 §2) and holds no account, so it is not private family data (PRODUCT.md §7.9).
5. **Shared motifs (framing B), the next task.** A fixed vocabulary of motif codes in code (light, strength, God, nature, peace, victory, …). A derive step sends each name's quoted glosses to the model and stores 0–3 codes from the vocabulary per name (`given_name_motifs`: name, claim, codes, model, prompt version, time), as model output beside the claim, never a claim value or a confidence. The page shows **"Wasze imiona łączy: …"** as words, with no count, and nothing when nothing is shared. The motifs may also be given to the reading's prompt. A name whose claim changed is tagged again.
6. **The price, when the owner says so: 15,99 zł, one-time, a product of its own,** key `couplenames`, "Imiona pary" / "Couple's names", held by every tier dearer than it (`smaller` 28,99 zł, `couple` 89,99 zł, `family` 199 zł, and the 800 zł tier). That task widens `purchases_tier_known` (as 0042 did), adds the product to `CHECKOUT_TIERS` (test mode first, as TASK-144), names the entitlement `COUPLE_NAMES_TIERS`, and gates the reading on it; the meanings on both pages stay free. Until then the page shows no price. ADR-0023 §2.5 holds: nothing is sold before the legal and tax gates.
7. **The model and its data** (`docs/canonical/19` §66–67). The prompt holds the two names and their claim payloads only: no account, e-mail, surname, free text or anything the reader typed (a name is sent only after it resolved to a name on the lists). `OPENAI_API_KEY` is read at call time, server-side, never logged or stored, and belongs to a project used for public name generation only (§67). The model is one constant; the task picks a current small model and records the measured cost of one reading. A global cap on new readings per day bounds the cost; the pair cache bounds the total (at most one reading per pair of the 107 names with a meaning, about 5,700 pairs today).
8. **What does not change.** ADR-0035 in full: the surname couple report keeps its contents and its §2.3; this page is a page of its own, not a part of it, and may be linked from it later. PRODUCT.md §7. D-043: no meaning is written or guessed by the project or the model.

## 3. Why not the alternatives

- **A verdict or a percentage (framing C).** Advised against twice; the owner did not choose it. It would need to supersede ADR-0035 §2.3 and amend PRODUCT.md §7.1 and §7.7.
- **Letting the model supply a meaning the works lack.** It would close the coverage gap (fact 2) and break D-043 and PRODUCT.md §7.1: a meaning with no source behind it. Coverage grows by Brückner's transcription and Grzenia's permission (D-046), not by the model.
- **A rule-written text instead of a model.** The owner asked for AI; a template over two glosses would be thin. The model's text is bounded by the input and the checks instead.
- **Generating on page view.** Every visit of every pair would pay a call; a button, a stored row per pair and a daily cap make the cost a function of pairs, not of views.
- **Storing readings in the accounts database.** A reading is about two names, not about a person; the public database keeps it with the claims it reads, and no reader is tied to a pair.
- **Selling it inside the `couple` tier only.** No new product, but 89,99 zł prices out the impulse purchase the page is for; the owner set 15,99 zł and every dearer package.

## 4. Consequences

- One new page per language, dark behind a flag; the free baby-names page gains the meaning block; a new migration (0047) and a small model client with no new dependency (plain `fetch`). The first model call in the product, with tests that stub it.
- With Buryan and Yonge, a reading exists for an estimated 3–4 couples in 100 (D-050, fact 3, an estimate). Most pairs get the free, honest answer that one name has no sourced meaning. The page becomes worth linking widely when Brückner is imported or Grzenia's permission arrives.
- Three tasks: TASK-156 (page, free meanings, reading); then the motifs; then the price. Each is one bounded change.
- PRODUCT.md §6 names the free meanings and the future 15,99 zł product.
