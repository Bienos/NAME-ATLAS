# DECISIONS_NEEDED.md — unresolved decisions

Only decisions that **materially affect implementation** and are not yet resolved. Speculative future choices do not belong here.

Resolved decisions move to `docs/adr/` and are deleted from this file.

Status legend: **BLOCKS TASK-00N** · **BLOCKS MILESTONE** · **NON-BLOCKING NOW**

---

## D-046 — RESOLVED (2026-10-06): first-name meanings: Buryan's origins, Brückner's entries, Yonge's meanings in both languages, and a request for permission

**Status:** RESOLVED. It amends D-043 §3 for one case only: a translation (see 2). Recorded in `docs/sources/given-name-meanings.md` §6.
**Owner:** project owner.
**Raised by:** the search of 2026-10-06, `docs/sources/given-name-meanings.md`, which D-043 asked for. The owner answered the four questions the same day in a Claude Code session.

**Facts** (measured on the 2026-01-20 lists, shares of people):
- No public-domain Polish dictionary of first names was found.
- Three public-domain works cover part of the lists:
  - **Buryan 1933**: origins. Men 35.3%, women 24.7%.
  - **Brückner 1927**: some entries. At most men 15.9% and women 4.0%.
  - **Yonge 1884**: meanings in English. Men 25.7%, women 10.0%.
- Together they reach men 48.1% and women 33.5%.

**The answers:**
1. **Buryan's origin: yes.** Where no meaning exists, the report may show a name's language of origin as Buryan 1933 states it, quoted, with the page.
2. **Yonge: also translated into Polish.** Offered "English page only", "also translated into Polish" or "not at all", the owner chose the translation. Yonge's meaning is quoted verbatim on the English page, and on the Polish page it is shown translated.
   - The translation is a literal rendering of his words only, marked as Name Atlas's translation, beside the original and the citation.
   - It adds nothing Yonge does not say.
   - This is the one exception to D-043's "nothing written by the project". No meaning is still guessed or composed.
3. **Brückner: yes.** His own entries for first names are transcribed from the page images (Wielkopolska Biblioteka Cyfrowa's copy, "domena publiczna"), never from the OCR, and quoted verbatim with the page.
4. **Permission: yes.** A request is drafted for the owner to send: `docs/sources/given-name-permission-request.md`. It goes to Wydawnictwo Nomen Omen for Jan Grzenia's *Nasze imiona. 200 najczęściej nadawanych imion polskich w XX wieku* (2010). Nothing from that book is used unless written permission arrives.

**Confirmed the same day:** another of the owner's sessions relayed the owner's words there, "go with your recommendations on D-046", which would have made answer 2 "English page only". Asked which should stand, the owner chose "Also translate to Polish" again, and chose to keep the drafted letter.

**What it does not change:** D-043 otherwise; no Wiktionary, no paid licence. D-033: no count of people with both names.

**Follow-ups, not decided here:** importing Buryan's chapter A, Brückner's name entries and Yonge's Polish index lines, and showing them in the full-name report's first-name chapter (a task); sending the letter (the owner).

---

## D-045 — RESOLVED (2026-10-06): the baby-names page is in the header, and its paid full figures cost 8,99 zł, not 5,99 zł

**Status:** RESOLVED. Recorded in ADR-0037 (amended), ADR-0032, `PRODUCT.md` §6 and TASK-143. It amends D-044 §2 and §3 and nothing else of D-044.
**Owner:** project owner.
**Raised by:** the owner, 2026-10-06, in a Claude Code session, once the page was live in production and Google sign-in worked: "działa ale to powinno byc dostepne tez z gornego panelu jakos i potem cala lista dostepna za 8.99 PLN".

What was decided, in this session's reading of those words (the owner may correct it):

1. **The header:** the page is reachable from the site's header, in both languages: "Imiona dla dziecka" / "Baby names", between the offer and the trees. It is drawn for every visitor, signed in or not, only while the page exists (the flag on and accounts on), and leads to the page, which asks a signed-out visitor to sign in. TASK-143.
2. **The price:** the paid view D-044 §2 describes (every year since 2000 with the rank in each, and the rest of D-044 §2's list) costs **8,99 zł**, one payment, for every name. 8,99 zł replaces 5,99 zł. The text "5,99 zł" in D-044 is the decision as first made.

**What it does not change:**
- Everything else in D-044: the free basic view, signed-in only, every tier from 28,99 zł up including the full figures, and the paid tier not unlocking the tree (D-044 §5). TASK-114's code still lifts the tree cap for any recorded purchase, so the 8,99 zł product must not exist before that is changed.
- The payment gates (ADR-0023 §2.5): there is still no product, no checkout and no buy button for it. The page keeps showing it as "Wkrótce".

**Built (TASK-144, 2026-10-06):** the product's key is `babynames`, in test-mode checkout only; the tree cap is lifted by `TREE_UNLOCK_TIERS` (`smaller`, `couple`, `family`) alone, so a `babynames` purchase does not lift it. No buy button is on any public page.

**Not decided:** whether "cała lista" ("the whole list") means more than D-044's paid view, for example a browsable list of all names for a year, ranked, with their direction. This record reads it as the paid view D-044 already describes, which is every name's figures; a list that can be browsed without typing a name is a new feature and needs its own answer.

---

## D-044 — RESOLVED (2026-10-06): first names given to children by year, for parents: signed-in only, a free basic view, the full numbers for 5,99 zł

**Status:** RESOLVED. Recorded in ADR-0037 (amended), ADR-0032 and `PRODUCT.md` §6; §6 below, and its amendment of 2026-10-06, in ADR-0043 §4.
**Amended later the same day by D-045:** the price is 8,99 zł, not 5,99 zł, and the page is in the header. The 5,99 zł below is the decision as first made.
**Owner:** project owner.
**Raised by:** the owner, 2026-10-06, in a Claude Code session: a section where mothers and fathers can see how many children were given a first name in each year, to choose a more or a less common name.

**The source** (read on 2026-10-06; nothing imported): dane.gov.pl dataset 219, "Imiona nadawane dzieciom w Polsce", from the PESEL register, published by the Ministry of Digital Affairs (institution 333), CC0 1.0, updated yearly. It holds 84 resources:
- first names for 2000–2019 in one file (resource 21457; columns `Rok`, `Imię`, `Liczba`, `Płeć`; 24,461 rows);
- for each year from 2019 to 2025, first and second names by sex, nationally and by voivodeship;
- for 2024 and 2025, first names by civil registry office (USC);
- half-year files, the latest for the first half of 2026 (resources 2474883 and 2474886, 2026-08-19).

The dataset's note: names given fewer than 5 times were left off the lists up to 2012, and fewer than 2 times from 2013 ("Do roku 2012 imiona z liczbą wystąpień poniżej 5 nie były umieszczane na liście, od 2013 r. granicą tą jest liczba 2"). The 2000–2019 file agrees: its smallest count is 5 in every year to 2012 and 2 from 2013.

The answers, in the owner's words where they gave them:

1. **Who sees it:** signed-in readers only ("only for signed in").
2. **Free and paid:** "there should be some accesible easy data but for more numbers it would cost 5.99pln to access". Then, by multiple choice:
   - **free, with an account:** a name's count and rank in the latest full year, and whether it is rising or falling;
   - **for 5,99 zł:** every year since 2000 with the rank in each, the voivodeships, the current year's half-year figures, and comparing names.
3. **What 5,99 zł buys:** by multiple choice, every name, in one one-time payment.
4. **The other paid tiers:** by multiple choice, every tier from 28,99 zł up (28,99, 89,99, 199 and 800 zł) includes it.
5. **The tree:** by multiple choice, the 5,99 zł purchase does not unlock the tree. The tree unlock stays with the tiers from 28,99 zł up. This narrows D-025 §3's "any paid tier".

**What it does not change:**
- A name missing from a year means fewer than 5 (to 2012) or fewer than 2 (from 2013), never zero (`AGENTS.md` §10).
- ADR-0032 still holds: two lists are never summed, a placeholder is never a name, and a doubtful form is not shown until reviewed.
- The payment gates (ADR-0023 §2.5) still hold: the tier stays "Wkrótce" until it can lawfully be sold. Being signed-in only, the section also waits for accounts in production.
- TASK-114's code lifts the tree cap for any recorded purchase. That is still true of every product checkout sells today (28,99, 89,99 and 199 zł). Before a 5,99 zł product exists, the entitlement must leave it out.

Nothing is built by this record.

**Answered later the same day** (the owner accepted this session's three proposals: "go with your suggestions"):
6. **Rising or falling:** (amended 2026-10-06, below: shares, not counts) the latest full year's count against the count five years earlier, on the same list (boys or girls). More than 10% higher is rising, more than 10% lower is falling, anything else is steady.
   - Both years are from 2013 on, where the cut-off is 2. A name absent five years earlier but on the latest list is rising: its earlier count is below 2 and its latest at least 2.
   - A name absent from the latest list has no free count, rank or direction; the page says it was given fewer than 2 times.
   - Edge cases beyond these are for the claims task, which may not treat an absent count as zero.

   **Amended 2026-10-06: compare shares, not counts.** The text above is §6 as first decided; TASK-137 built it as `given_name_birth_trend@1`. The children on the published lists fell from 186,590 boys and 176,829 girls in 2020 to 126,404 and 119,788 in 2025 (−32%, TASK-136's record), and under the count rule almost every popular name read falling: ZOFIA was rank 1 but falling, though her share of listed girls went only from 4.0% to 3.7%. Asked whether to compare share instead, the owner answered, in a Claude Code session, "yes switch to share and merge it". From this amendment (ADR-0043 §4, `given_name_birth_trend@2`, TASK-139):
   - **Share:** a name's count ÷ that list's `people_sum`, the children on that published list as read from the file. It is a share of the children on the published list, not of all births: names below the cut-off are not in the denominator.
   - **Comparison:** the latest list's share against the share five years earlier, on the same sex's list; the latest year is read from the data. More than 10% higher (relative to the earlier share) is rising, more than 10% lower is falling, anything else is steady. Whole numbers only, by cross-multiplication.
   - **Absent five years earlier:** the earlier count is at most that list's cut-off minus one. Rising only if the rule holds for that largest count; otherwise no direction is stated. Never zero. The first text's "absent five years earlier is rising" no longer holds without that check.
   - **Absent from the latest list:** no direction, as before.
   - **Unchanged:** the five-year window, the 10% threshold, and boys' and girls' lists never mixed.
   - A trend claim of the count rule does not stay active once the share rule has run.
7. **One page or many:** one page with a search box, not a page per name (`PRODUCT.md` §8, non-goal 14).
8. **The section's name:** "Imiona dla dziecka" in Polish and "Baby names" in English, the working names ADR-0037 §3 already uses.

**Not decided:** second names and civil registry offices; the section's address.

**Follow-ups, not decided here:** an ADR and task to import dataset 219, which also settle where its voivodeship and half-year files sit beside ADR-0032's tables; the yearly count and rank claims; the section's page; the 5,99 zł price in test-mode checkout (TASK-111) and its entitlement.

---

## D-043 — RESOLVED (2026-10-05): the full-name report: paid in the 28,99 zł tier, every listed name, meanings only from a free permission or the public domain

**Status:** RESOLVED. Recorded in ADR-0037 (amended), ADR-0032 and `PRODUCT.md` §6.
**Owner:** project owner.
**Raised by:** STATUS's "full-name report" line (design draft of 2026-10-03) left six product questions open. The owner answered them on 2026-10-05 in a Claude Code session.

The answers, in the owner's words where they gave them:

1. **Free or paid:** paid ("płatny").
2. **Which tier:** the smallest ("za najmniejszy tier"), which is "smaller research", 28,99 zł (ADR-0037). Nothing was said about the 89,99, 199 and 800 zł tiers; whether they include the report is not decided.
3. **Meaning sources:** a dictionary with a licence. Asked to choose between that and not paying for a licence, the owner asked "da sie to zrobic za free?", and then accepted this: meanings come only from a dictionary whose publisher gives **free** permission for short quotations with attribution, or from works in the **public domain** (in Poland, 70 years after the author's death). Until one of those exists, the report shows the PESEL statistics and no meaning, and no meaning is guessed or written by the project.
4. **Wiktionary (Wikisłownik):** no.
5. **Paying for a dictionary licence:** no.
6. **How many names first:** every name on the list ("Wszystkie z listy"; 71,433 given names on the 2026-01-20 first-name lists, TASK-078). ADR-0032 §4 still holds: a placeholder is never a name, and a doubtful form (one character, or a full stop) is not shown until reviewed. A name without a meaning shows its statistics only.

**What it does not change:** D-033 (no count of people with an exact first name and surname) stays open; the report does not multiply shares into such a count. The payment gates (ADR-0023 §2.5) still hold: the tier stays "Wkrótce" until it can lawfully be sold. Nothing is built by this record.

**Follow-ups, not decided here:** a request to dictionary publishers for free permission, and a search for public-domain given-name dictionaries, each a task of its own; the `GIVEN_NAME_POPULATION` and `GIVEN_NAME_RANK` claims; the report itself; the offer page naming the report in the 28,99 zł tier once it exists.

---

## D-042 — Google Analytics page views without consent (PT art. 399, GDPR art. 6(1)(f), 21)

**Status:** NON-BLOCKING NOW. **Owner:** project owner, legal counsel (`docs/canonical/19` §2.4: "LEGAL COUNSEL REVIEW REQUIRED"). **Raised by:** TASK-115 (ADR-0040).

Facts: since TASK-115, Google's script (`gtag.js`) is in every page and, on `name-atlas.pl`, sends a page view for every visitor, including one who pressed "Reject". Until "Accept", consent mode keeps `analytics_storage` denied, so Google sets no cookie (`apps/web/src/lib/consent-banner.tsx`); the request still carries the IP address, the redacted address, the referrer and details of the browser and device to Google Ireland and Google LLC (USA). The notice now rests those page views on art. 6(1)(f) GDPR and the cookies on consent (`apps/web/src/lib/legal-text.ts`). The site offers no way to stop the page views short of blocking the script; the notice's right to object is by email. D-037 asks the same art. 399 question for Vercel Web Analytics, which is first-party and cookieless.

Options: (a) counsel confirms that page views without cookies need no consent and that art. 6(1)(f) holds; (b) back to ADR-0038's rule: nothing goes to Google before "Accept"; (c) keep the page views but stop them after "Reject".
**Recommendation (not a decision):** ask counsel together with D-037; until then the notice states what is sent.

---

## D-041 — the terms: how they change for account holders, how the contract starts and ends, and our closing of an account

**Status:** NON-BLOCKING NOW (no account exists in production); needed before accounts go on. **Owner:** project owner, with legal review. **Raised by:** the legal review of 2026-10-04 (`docs/progress/2026-10-04-legal-review.md`, J-07).

Facts: the terms say "Zmiany regulaminu publikujemy na tej stronie z nową datą." The code asks an account holder to accept a newer version only at the tree's consent step (`apps/web/src/lib/tree-routes.ts:121-128`; `packages/accounts/src/service.ts:622-633`). The terms version is a date compared as text, so the tree clause's version must be later than the version accepted without the tree. When the base terms and the tree clause change on the same day, as they did on 2026-10-04, an account opened with the tree off records `ACCOUNTS_LEGAL_UPDATED` (2026-10-01) while the page shows 2026-10-04. The account terms say we may close an abusive account and "napiszemy o tym na adres konta", with no notice period. The terms do not say when the contract is formed or ends for a reader without an account.

Options: (a) email account holders a set number of days before a change takes effect, with the right to delete the account before then; (b) ask for re-acceptance at the next sign-in for every change; (c) keep publishing only (today's text). Separately: track the tree clause's acceptance apart from the terms version, so that the two dates cannot collide (a code task).
**Recommendation (not a decision):** (a) with 14 days' notice for changes that are not purely in the user's favour, plus the separate tree-clause record; state formation and ending for readers without an account (by use; ends when they stop); give a notice and a way to object before closing an account, except for abuse in progress.

---

## D-040 — the terms: how a complaint (reklamacja) is made and how fast it is answered

**Status:** NON-BLOCKING NOW. **Owner:** project owner. **Raised by:** the legal review of 2026-10-04 (J-06).

Facts: the terms say only that complaints go to the contact address (`apps/web/src/lib/legal-text.ts`, "Zgłoszenia i reklamacje"). UŚUDE art. 8 ust. 3 pkt 4 requires the terms to set the complaint procedure. Ustawa o prawach konsumenta art. 7a deems a consumer's complaint accepted if not answered within 14 days (to be confirmed by the lawyer for a free service).

Options: (a) 14 days, with what a complaint should contain (the address, the page, what is wrong) and that the answer comes by email; (b) a shorter deadline; (c) leave as is.
**Recommendation (not a decision):** (a).

---

## D-039 — the tree invitation keeps an unsalted hash of the invitee's address

**Status:** NON-BLOCKING NOW; decide before the tree goes live. **Owner:** project owner, with legal review. **Raised by:** the legal review of 2026-10-04 (J-05).

Facts: an invitation stores `address_hash` = `sha256("accounts:email:" + normalised address)` (`apps/web/src/lib/tree-routes.ts:394`; `packages/accounts/src/tokens.ts:32-33`), the same key as `accounts.sign_in_failures`. It is not salted per tree, so it can be matched across trees and against a known address. It is kept on every invitation and on the tree's suppression list for as long as the tree (`packages/db/migrations/0033_family_invitations.ts:68-102`). The notice now says "skrót"; it does not claim the hash cannot be linked.

Options: (a) keep it, and say in the notice that it is a hash of the address; (b) a keyed hash (HMAC with a server secret), still global, so the suppression works; (c) a per-tree salt, so that it cannot be linked across trees.
**Recommendation (not a decision):** (b) or (c), as a code task with a migration. (c) matches the per-tree suppression list the notice describes most closely.

---

## D-038 — processors and their roles: Gmail, Google sign-in, Oracle, and the DPAs

**Status:** NON-BLOCKING NOW. **Owner:** project owner. **Raised by:** the legal review of 2026-10-04 (J-04).

Facts: the notice names "Google — skrzynka pocztowa" (the contact address is a consumer Gmail address, `apps/web/src/lib/contact.ts:8`), "Google Ireland Limited … osobny administrator" for sign-in (`legal-google.ts`, already marked as awaiting legal review), and "Oracle — serwer bazy danych we Frankfurcie" with no legal entity. The repo does not record whether the Vercel, Resend or Oracle data processing terms were accepted, or which Oracle entity holds the contract.

Options: (a) confirm each entity and DPA and name them in the notice; (b) move the mailbox to a business mailbox with a DPA (Google Workspace or another provider).
**Recommendation (not a decision):** (a) now; (b) before taking payments.

---

## D-037 — Vercel Web Analytics and terminal storage consent (PT art. 399)

**Status:** NON-BLOCKING NOW. **Owner:** project owner, legal counsel (`docs/canonical/19` §2.4: "LEGAL COUNSEL REVIEW REQUIRED"). **Raised by:** the legal review of 2026-10-04 (J-03).

Facts: the script sets no cookie and stores nothing in the browser (no `localStorage`, `sessionStorage`, `document.cookie` or `indexedDB` anywhere in `apps/web/src`). It runs in the browser and sends each page view to `/_vercel/insights` (`apps/web/src/lib/site-analytics.tsx:47-49`). Vercel Speed Insights, added on 2026-10-05, is in the same position: its script sets no cookie, stores nothing, and sends each page's speed measurements to `/_vercel/speed-insights` (`site-analytics.tsx:56-67`). The notice relies on art. 6(1)(f) GDPR for both and asks no consent.

Options: (a) counsel confirms that no consent is needed; (b) a consent banner before the script loads; (c) server-side counting only.
**Recommendation (not a decision):** ask counsel; until then keep (a)'s text, which states the facts.

---

## D-036 — the legal basis for relatives entered in a tree, and how they are informed (GDPR art. 6, 14)

**Status:** BLOCKS the tree's release, together with D-031's legal review. **Owner:** project owner, legal counsel. **Raised by:** the legal review of 2026-10-04 (J-02).

Facts: the notice says data about other people is kept "na Twoje zlecenie w ramach tej samej umowy" (art. 6(1)(b)). A contract with the account holder is not a basis for processing a relative's data. Only an invited, adult, living person receives anything (one invitation email, `apps/web/src/lib/tree-mail.ts`); others are never told.

Options: (a) art. 6(1)(f) for the controller's storage, with the account holder's household activity as the source, and art. 14(5)(b) (disproportionate effort) for not informing each person; (b) treat Name Atlas as the account holder's processor (art. 28) for that data; (c) keep the current text.
**Recommendation (not a decision):** (a), stated in the notice once counsel agrees.

---

## D-035 — retention periods the code does not set

**Status:** NON-BLOCKING NOW. **Owner:** project owner. **Raised by:** the legal review of 2026-10-04 (J-01, J-08).

Facts: the notice says emails and contact messages are kept "tak długo, jak to potrzebne do załatwienia sprawy", and the waiting list "do startu usługi albo do Twojej prośby o wypisanie". They live in the Gmail mailbox and in Resend's sending logs, and no period is set for either. Well-known bearers stay until the next data refresh after an objection, with no period otherwise. Backups (TASK-049) will hold the accounts and family schemas, and their retention is not yet stated in the notice.

Options: (a) a fixed period per category, for example messages 12 months after the matter is closed, the waiting list until launch plus 3 months; (b) keep the "as long as needed" wording.
**Recommendation (not a decision):** (a), with the backup retention added to the notice when TASK-049's upload runs in production.

---

## D-034 — RESOLVED (2026-10-04): the family tree is free with an account

**Resolution:** The project owner, 2026-10-04: "tree free with sign up". Any complete account may build a tree at no cost; it is no longer in the 29,99 zł tier. This supersedes D-029 ("paid; the tree stays dark until checkout exists"). The offer page moves the tree to the free tier (TASK-084). The paid tier keeps connecting trees, extra research, the report and the well-known bearers.

**What it does not change:** going live still needs accounts on, the restore-tested off-host backup (TASK-049, ADR-0029's precondition) and `FAMILY_TREE_ENABLED=1`. The legal review D-031 names was asked about on 2026-10-04 and not yet answered. A limit on the number of trees is not decided. TASK-112 builds the 5-person cap below. It enforces it on the server, with no account holding a paid tier until checkout exists. The second-cousin limit waits for tree matching, which does not exist yet. (2026-10-04, D-025 §3: the owner set two limits in principle: matches beyond second cousins, and adding more people, need a paid tier. Later the same day: a free tree holds 5 people, and any paid tier unlocks more people and matches beyond second cousins.)

---

## D-033 — "how many people hold this exact first name and surname" for the paid tier: from which source, if any?

**Status:** NON-BLOCKING NOW. It blocks that figure in the paid report, nothing else.
**Owner:** project owner.
**Raised by:** TASK-073's session, 2026-10-03. Asked about the famous-bearers card, the owner added: "then in premium search also how many people are holding the exact name and surname".

Facts, checked 2026-10-03:

- The PESEL surname lists this project imports count people per surname only (TASK-002, TASK-004).
- dane.gov.pl publishes PESEL first-name lists separately, by sex and by first or second name (a search for "imiona PESEL" returned, among others, resource 21495 "lista imion męskich w rejestrze PESEL stan na 21.01.2020 - imię pierwsze" and 54111 for 2024, second names). The first five results were all first-name lists. **No published table pairing first name with surname was found**; the search was not exhaustive.
- Multiplying a first name's share by a surname's count assumes the two are independent. They are not (first names follow sex, age and region, and so do surnames), so the product is a model estimate, not a count. `AGENTS.md` §9 forbids presenting it as one, and ADR-0001 keeps estimates apart from facts.

Options:

1. **Ask the data holder.** A request to the Ministry of Digital Affairs (the PESEL register's controller) for counts of first name and surname pairs, with small cells suppressed as the surname lists already are. A reply may take weeks, and may refuse.
2. **Show a labelled estimate.** The independence product, stated as an estimate with its assumption and range, on the paid surface only. Needs an ADR that admits a modelled figure, and a method.
3. **Do not offer it.** Keep the paid tier to what sources state.

The assistant's recommendation, not a decision: option 1 first; option 3 until an answer comes. Option 2 would put a number on the page that no source states.

---

## D-032 — `pl_teryt`'s redistribution, and the SEO surface for the localities section

**Status:** NON-BLOCKING NOW. It blocks nothing: the surname page is rendered on the free surface, where the stored profile allows the section, and the page's indexability folds the rights of the surname's claims, which the localities lookup is not.
**Owner:** project owner.
**Raised by:** the localities task's session (TASK-066 then, TASK-090 now), 2026-10-01.

Facts, as the code and the stored data stand:

- TASK-038 seeds `pl_teryt` with `commercial_use = ALLOWED`, `automated_access = ALLOWED`, every other permission `UNKNOWN`, `review_status = LEGAL_REVIEW_REQUIRED`, no legal review. `evaluateSurface` answers `ALLOWED` for `FREE` and `BLOCKED` for `SEO` (`REDISTRIBUTION_UNRESOLVED`) on that profile. TASK-066's localities section follows it: shown on the free page, `RIGHTS_BLOCKED` when queried on the SEO surface.
- `apps/web/src/lib/seo-surface.ts` decides a page's indexability by folding the rights profiles behind the surname's **claims**. The localities are a lookup, not a claim, so a page with a matching locality is indexable exactly as before and shows TERYT data whose own SEO surface is blocked.
- GUS's terms, quoted in `fixtures/teryt/source-manifest.json` (read 2026-09-30): "Rejestr terytorialny TERYT jest jawny", and the TERC, SIMC and ULIC files "udostępniane są bezpłatnie wszystkim użytkownikom", including "pobieranie zbiorów pełnych". No attribution wording and no redistribution wording is on either page.

To decide, one of:

1. Set `pl_teryt`'s `redistribution` to `ALLOWED` on those terms, as a data migration recorded as the owner's judgement (the shape of migration 0008 for PESEL's D-007). The section's SEO surface then opens and the question closes.
2. Fold the sections that are not claims (today only the localities) into the page's SEO gate. Every page with a matching locality then becomes `noindex` until (1).
3. Leave it: the free page shows the section, an explicit SEO-surface query is refused, and indexability ignores it.

The assistant's recommendation, not a decision: (1). The terms quoted say the register is public and its full files are free for every user to download; nothing on them restricts redistribution.

---

## D-031 — RESOLVED (2026-10-01): the proposal stands, subject to legal review

**Resolution:** The project owner: "it's ok". A relative who declines contact stays as a row the owner alone sees, never shown to a member or matched, with the address suppressed per tree (ADR-0029 §2.6.23). The legal review `docs/canonical/19` §11 requires still precedes the invitation feature; its outcome may reduce the row further.

### D-031 (original record) — a relative who says "nie chcę kontaktu": what may the owner keep?

**Status:** NON-BLOCKING NOW. It blocks the invitation feature (ADR-0029 §2.6), not the tree.
**Owner:** project owner, with legal review (`docs/canonical/19` §11: a lawful-basis assessment and an Article 14 assessment before person-level data about third parties).
**Raised by:** ADR-0029 §2.6.23, 2026-10-01.

A tree owner writes down a living relative. The relative, invited, answers that they want no contact. ADR-0029 proposes: the row stays visible to the owner alone, is never shown to a member or matched, and the address cannot be invited again. The open question is whether that is enough, or whether the relative's objection must also reduce the row (to a name and a relationship, or to nothing). The GDPR's household exemption covers the owner's own notes and does not obviously cover a platform that stores them; what Name Atlas, as the platform, must do on an objection is the legal question. The answer sets the "Nie chcę kontaktu" screen's text and what `contact_declined` does to the row.

---

## D-030 — RESOLVED (2026-10-01): mObywatel through an integrator, a bank identity as the fallback; the release stays with the verification task

**Resolution:** The project owner: "ok" to the session's lean. The provider's terms and price are read on the day the verification task starts; nothing is recorded here. Verification is included in the 29,99 zł tier (resolved earlier the same day). Recorded in ADR-0029 §2.6.25.

### D-030 (original record) — identity verification: which provider, and in which release

**Status:** NON-BLOCKING NOW. It blocks "Czy jestem w czyimś drzewie?" (ADR-0029 §2.6.25), nothing earlier.
**Owner:** project owner.
**Raised by:** ADR-0029, 2026-10-01.

The search for oneself across other people's trees is answered only to a person who has proved their name and birth date. The candidates, each to be read on the day with its terms and price (none is recorded here):

- (a) **mObywatel's confirmation for businesses** (`info.mobywatel.gov.pl/dla-instytucji`): data straight from the state registers, by QR code, remotely; integration through the ministry's process, or through a Polish integrator that already offers it.
- (b) **mojeID (KIR)**, identity confirmed through the person's bank;
- (c) a **commercial provider** (document plus liveness), priced per check;
- (d) the **European Digital Identity Wallet**, in test in Poland in 2026, with a free sandbox; not yet something to sell on.

Whichever is chosen, the product stores the provider's reference, the verified name and birth date and the date of verification, never the document or the PESEL number, and the processing needs a DPIA screening (`docs/canonical/19` §11). Resolved on 2026-10-01 by the owner: verification is included in the 29,99 zł tier, not sold on its own. The provider and the release remain open.

---

## D-029 — RESOLVED (2026-10-01): paid; the tree stays dark until checkout exists (superseded by D-034, 2026-10-04: free)

**Resolution:** The project owner: "make it paid". The tree is built and tested (TASK-066 onward) and shown to nobody until the 29,99 zł tier can be sold (ADR-0023 §2.5, D-024). Recorded in ADR-0029 §2.5.19.

### D-029 (original record) — the tree before checkout exists: dark, or free for every complete account?

**Status:** NON-BLOCKING NOW. It blocks the first tree page, not the schema.
**Owner:** project owner.
**Raised by:** ADR-0029 §2.5.19, 2026-10-01.

ADR-0026 puts the tree in the 29,99 zł tier. That tier cannot be sold until the items in ADR-0023 §2.5 exist (a business, Stripe, consumer terms), and D-024 is open. So when the tree pages are built, either:

- (a) they are dark: built and tested, shown to nobody until checkout exists;
- (b) every complete account may build one tree, free, until checkout exists, and the tiers are then told apart by a limit (one tree and a number of people on the free tier; more, documents and connections on the paid one). ADR-0026 §2.1 lets the free tier grow; `PRODUCT.md` §5 says the free answer is never put behind the paid tiers, which (b) keeps.

(b) gives real readers to learn from and a backup that holds something worth restoring. It also means the privacy notice and the terms carry the tree from the first page.

---

## D-028 — RESOLVED (2026-10-01): never: a tree lives as long as its account

**Resolution:** The project owner: "never". No expiry; a tree is deleted only with its account (cascade) or by its owner. The privacy notice states it so. Recorded in ADR-0029 §2.4.15.

### D-028 (original record) — a tree's retention when its account goes quiet

**Status:** NON-BLOCKING NOW. It blocks nothing until the first account is a year old; the answer goes into the privacy notice.
**Owner:** project owner.
**Raised by:** ADR-0029 §2.4.15, 2026-10-01.

ADR-0029 ties a tree's life to its account: deleting the account deletes the tree, and nothing expires on its own. `docs/canonical/19` §4 asks for "shorter explicit retention" for family data. The choices:

- (a) no expiry: a tree stays until its owner deletes the account;
- (b) an account with no sign-in for N years (N to be chosen) is warned by email, and deleted with its trees M months later if nobody signs in.

(b) is what the notice would state as a period. (a) states "for as long as the account exists".

---

## D-027 — documents in the tree: when, and where they are stored

**Status:** NON-BLOCKING NOW. ADR-0029 §2.2.6 leaves uploads out of the first release; this decides whether and when they come.
**Owner:** project owner.
**Raised by:** ADR-0029, 2026-10-01.

The chosen design marks a person *ze źródła* when a document (a scan of a record) is attached. Storing a file needs what the database does not: object storage in the EU (`docs/canonical/23` §6.3 names S3 in an EU region; TASK-049 chose Cloudflare R2 for backups), encryption, a size cap, a virus check, and a second backup. The questions:

1. Is a document attached in the first paid release, or does `source_note` (a typed citation) do until readers ask?
2. Where: the R2 account TASK-049 will create, with its EU jurisdiction setting, or S3 in Frankfurt?
3. Are photographs of people documents? A photograph of a living person is personal data of a third party with no record behind it. The safer first answer is records only: birth, marriage, death, and the like.

Until answered, nothing in the tree takes a file.

---

## D-026 — RESOLVED: primary product domain selected

The owner selected `name-atlas.pl` as primary and `nameatlas.pl` as alternate on 2026-10-02 (TASK-067, `docs/DOMAIN_SETUP.md`). The earlier no-domain conclusion is superseded. Mail-domain verification in Resend remains an account go-live prerequisite; the selected domain alone does not verify a sender.

---

## D-025 — the tiers the owner named on 2026-10-01 evening, against ADR-0026's

**Status:** ANSWERED 2026-10-04 (below). ADR-0037 (proposed 2026-10-04, TASK-104) records the set and supersedes ADR-0026's tiers; the offer page follows it on that branch. This entry is deleted when ADR-0037 is accepted. Still open, and not blocking: what else the 28,99 zł and 199 zł tiers hold.
**Owner:** project owner.
**Raised by:** ADR-0028's session, 2026-10-01.

**2026-10-04, ADR-0035's session:** asked to "confirm 'couple' replaces the current tiers (D-025)", the owner answered "ok". Asked to be sure whether that meant the whole set or only the couple tier, they answered "a, whole set". §1 is answered: the set replaces ADR-0026's tiers, and the offer page will follow it. They also chose framing "A" for the couple tier: the two surnames' facts side by side, with no score (ADR-0035, TASK-100). What the other new tiers hold is still not confirmed, and §2–§4 were open then.

**2026-10-04, later the same session:** asked whether the 800 zł tier keeps DNA, the owner answered "dna yes in 800 tier". §2 is answered: the 800 zł "genealogist research" tier replaces the 499 zł "Genealogia z DNA" tier, with DNA analysis in it, and stays "coming soon". ADR-0026 §2.4's rules for it carry over: the partner is not named, and the page asks readers not to send DNA results or health data by email. §3 is half answered by D-034: the tree is free with an account. Still open: which tier holds famous bearers (and connecting trees), and §4.

**2026-10-04, later the same session:** asked which tier holds famous bearers and connecting trees, the owner answered: "famous berers free connecting tress free but then to unlock more than 2nd cousins or add more ppl oyu have to have paid tier". §3 is answered:

- famous bearers are free;
- connecting trees is free;
- a paid tier is needed to see matches beyond second cousins, and to add more people than the free limit.

Not yet said: which paid tier unlocks those (any, or a named one), and how many people the free tree holds. §4 is still open.

**2026-10-04, later the same session:** asked whether each price is paid once or monthly, the owner answered "once as not sure how to make a subscription from it yet". §4 is half answered: every tier is a one-time payment for now. Still open in §4 (and D-024): whether the reader pays the 800 zł to Name Atlas or to the partner.

**2026-10-04, later the same session (answered through a multiple-choice prompt):**

- Free tree: "Free, small cap": building and connecting trees are free, up to a cap on people, with matches shown up to second cousins.
- The cap: "5 people": a free tree holds 5 people; a sixth needs a paid tier.
- Which tier unlocks more people and matches beyond second cousins: "Any paid tier", the 28,99 zł tier included.
- Who takes the 800 zł: "Name Atlas": the reader pays on the site, and Name Atlas pays the partner.

**D-025 is answered in full.** The tiers, with what has been confirmed:

| Tier | Price | Confirmed |
|---|---|---|
| Free (account) | 0 | the cards, the comparison, famous bearers, a family tree of up to 5 people, connecting trees with matches up to second cousins |
| "smaller research" | 28,99 zł | unlocks the tree beyond 5 people and matches beyond second cousins |
| "couple" | 89,99 zł | the couple report (ADR-0035), and the tree unlock |
| "family review" | 199 zł | the tree unlock |
| "genealogist research" | 800 zł | research by a partner genealogist with DNA analysis, paid to Name Atlas, "coming soon"; the tree unlock |

All prices are one-time payments for now. What else the 28,99 and 199 zł tiers hold, beyond the tree unlock, was drafted in the owner's 2026-10-01 chat and is not confirmed. An ADR superseding ADR-0026 should fix this table before the offer page or checkout changes. The 800 zł payee answers D-024's second question for the new tier, and makes Name Atlas the seller of the partner's service, which the consumer terms and invoicing (ADR-0023 §2.5) must cover.

ADR-0026 (accepted 2026-10-01, live on `/pl/oferta`) has three tiers: free, "Nazwisko i rodzina" 29,99 zł, "Genealogia z DNA" 499 zł. Later the same day, in a chat outside this repository, the owner described a different set, reached after sign-in from the download or share button:

- "smaller research", 28,99 zł;
- "couple", 89,99 zł;
- "family review", 199 zł;
- "genealogist research", 800 zł, "coming soon".

What each holds was drafted in that chat and not yet confirmed by the owner.

To supersede ADR-0026, the owner needs to confirm:

1. that this set replaces ADR-0026's tiers, and the offer page follows it;
2. whether the 800 zł genealogist tier replaces the 499 zł "Genealogia z DNA" tier, and whether DNA stays in it;
3. where the tree and famous bearers sit: ADR-0026 put both in the 29,99 zł tier;
4. D-024's question again, for each new price: one payment or recurring, and who takes the 800 zł.

ADR-0028 (what may be shown) names no price, so it holds under either set.

---

## D-024 — the paid tiers: one payment or recurring, and who takes the 499 zł?

**Status:** ANSWERED 2026-10-04 for the owner's new tier set (D-025): every tier is one payment for now, and the 800 zł tier that replaces the 499 zł one is paid to Name Atlas. Recorded in ADR-0037 §2.1 and §2.4.
**Owner:** project owner.
**Raised by:** TASK-057 (ADR-0026 §4), 2026-10-01.

ADR-0026 sets the prices: 29.99 zł for "Nazwisko i rodzina" and 499 zł for "Genealogia z DNA". It does not settle how each is paid:

- **29.99 zł.** The tier holds a tree the reader keeps building, so it could be:
  - (a) one payment for lasting access;
  - (b) one payment per surname report, with the tree free to keep;
  - (c) a recurring payment. That would lift `PRODUCT.md` §8's non-goal 11 (no subscriptions) for this tier.
- **499 zł.** A partner does the research:
  - (a) the reader pays Name Atlas, which pays the partner;
  - (b) the reader pays the partner directly, and Name Atlas only passes the enquiry on.

  (a) makes Name Atlas the seller of a person's service, with the consumer terms ADR-0023 §2.5 lists.

The offer page states only the prices, so either answer leaves it true.

---

## D-023 — TERYT external-id namespaces: `TERYT` (code) or `TERYT_TERC` (`docs/canonical/12` §11.3)?

**Status:** NON-BLOCKING NOW. Nothing is built or blocked on it.
**Owner:** project owner, or an ADR.
**Raised by:** TASK-039, 2026-09-30.

`docs/canonical/12` §11.3 says TERYT ids are stored with `namespace = TERYT_SIMC / TERYT_TERC / TERYT_ULIC`. Since TASK-011, `main` has stored the 16 voivodeship TERC codes under `entity_external_ids.provider_key = 'TERYT'`. TASK-039 kept `TERYT` for every TERC code (voivodeship, powiat, gmina) and used `TERYT_SIMC` for locality ids. SIMC needed its own namespace: a seven-digit SIMC id and a seven-digit TERC gmina code can be the same digits.

Renaming `TERYT` to `TERYT_TERC` would re-identify rows that other rows already reference, so TASK-039 did not do it. The options:

- (a) Keep `TERYT` for TERC and record the deviation in an ADR.
- (b) A data migration renames `TERYT` to `TERYT_TERC`, and `TERYT_PROVIDER_KEY` changes with it.

Neither changes any behaviour today.

---

## D-022 — RESOLVED (2026-09-30): *Onomastica* is a meaning source, on its printed CC BY-ND 4.0 licence

**Resolution**, decided by the project owner on 2026-09-30, reversing their answer of 2026-09-29: option (b). The owner's words: "bring back onomastica … use that source".

- The project relies on the licence each article prints, CC BY-ND 4.0 International, for the OJS copies of vols 64 (2020) onward. This is the project owner's judgement, recorded as such, as D-007 was for PESEL. The contradicting statements (below) are unchanged, and the rights profiles stay `LEGAL_REVIEW_REQUIRED`: no lawyer has reviewed the reliance.
- Only the OJS copies are used. The journals.pan.pl copies of vol. 64, which print a BY-NC-ND URL, are not.
- Vols 56–63 stay out: they state no licence, and this decision does not grant one.
- Only verbatim excerpts are published, each cited to its page, never an adaptation, because of the NoDerivatives term. The open legal question N7 in `docs/sources/onomastica.md` §13 (whether a gloss or root is "Adapted Material") therefore does not arise for what is published.
- TASK-069 imports the first article. D-002 and ADR-0008 are unchanged.

**The answer of 2026-09-29**, superseded: option (c), "Drop Onomastica".

**Original record, for reference**

### D-022 (original record) — *Onomastica*: may Name Atlas rely on the licence the journal declares for vol. 64 (2020) onward?

**Status (when raised):** BLOCKS any *Onomastica* ingestion task, which is not written. NON-BLOCKING for everything else.
**Owner:** project owner. The rights holder is Instytut Języka Polskiego PAN. The journal's site gives the address `onomastica@ijppan.pl`.
**Raised by:** TASK-032, 2026-09-29. Evidence: `docs/sources/onomastica.md` §6–§9, §12 and §14.

**The statements, as read on 2026-09-29.** All but the last are on the journal's own site or in its DOAJ record:

- **"Essential facts"** is the page DOAJ records as the journal's licence terms. Its "Copyright and Licensing Policy" says: "From vol. 64 (2020) the articles published in Onomastica are available under a Creative Commons licence Attribution-NoDerivatives 4.0 International (CC BY-ND 4.0)". DOAJ's record gives the same licence.
- **The articles:** 174 of the 177 article PDFs of vols 64–69 print the same licence on page 1, with the `by-nd/4.0/` URL. Three one-page notes print nothing.
- **The Guidelines page says otherwise:** "The content published in the journal is fully protected by the copyright law. The Editors are currently working on introducing a specified type of the Creative Commons license in the future."
- **The agreement template** linked from Guidelines names "Creative Commons Attribution - No Derivative Works 3.0" and links `http://creativecommons.org/licenses/by-sa/3.0/`.
- **Every page** shows an unlinked BY-ND 3.0 badge.
- **The OJS article metadata** carries a copyright line and an empty licence URL.
- **journals.pan.pl serves different files for the same articles.** Its 23 vol. 64 copies print "Creative Commons Attribution-NoDerivatives 4.0 Poland (CC BY-ND 4.0)" with the URL `https://creativecommons.org/licenses/by-nc-nd/4.0/deed.pl`, a non-commercial licence, and link the BY-ND legal code.

**What follows today:**

- TASK-032's fail-closed rule keeps every permission `UNKNOWN` while the statements conflict (§12). ADR-0008 §4's condition 4 is therefore `UNRESOLVED`, and no *Onomastica* article is admissible.
- Vols 56–63 (2012–2019) state no licence at all. Only a licence from the rights holder would admit them; this decision does not.

**Options:**

- (a) ask IJP PAN to confirm the licence per volume before any ingestion. The questions are drafted as N1–N9 in `docs/sources/onomastica.md` §13.
- (b) rely on the declared policy and each article's own statement for vols 64–69, as the project owner's judgement recorded as such, as D-007 did for PESEL. Vols 56–63 stay out.
- (c) leave *Onomastica* out of Path B, and look for other attributed sources.

**Consequence if unresolved:** no *Onomastica* article can support a meaning claim. ADR-0008's "no sourced meaning" stays the result for any surname only this journal discusses.

---

## D-021 — RESOLVED (2026-10-01): Polona: may a connector query it automatically, and what is its source default? (items 2 and 3 by ADR-0014, items 1 and 4 by ADR-0024)

**Status:** RESOLVED. The project owner decided items 1 and 4 on 2026-10-01 ("Everything allowed"; ADR-0024). Items 2 and 3 were decided on 2026-09-29 (ADR-0014).
**Owner:** project owner. For confirmation from the rights holder, Polona's FAQ names Biblioteka Narodowa's Pracownia Praw Autorskich, `ppa@bn.org.pl`.
**Raised by:** TASK-031, 2026-09-29. Evidence: `docs/sources/polona.md` §4, §11 and §12, and `packages/truth/src/polona-rights.test.ts`.

1. **May a connector query Polona automatically, and may it keep what it retrieves?** RESOLVED 2026-10-01 by ADR-0024 §2.1–2.2: yes, for search, object records, OCR and IIIF, at a polite rate, and what is retrieved may be kept. The owner's judgement, not Biblioteka Narodowa's confirmation.
   - An earlier answer, "approve poona" on 2026-09-30, was recorded on #43's branch as option (b): the documented search API only, at a polite rate, with `automated_access` and `local_cache` left `UNKNOWN`. The owner's "Everything allowed" of 2026-10-01 supersedes it.
   - Polona's terms ("Regulamin e-usługi Biblioteka Cyfrowa Polona", read 2026-09-29) never mention automated querying, request rates or caching.
   - Its user manual calls the search API an "otwarte API" (open API) and links developer instructions. Those instructions state no licence, rate or caching rule.
   - The object-metadata, IIIF and OCR-download endpoints a connector also needs are documented nowhere; they are the web app's own requests.
   - The spike therefore records `automated_access = UNKNOWN` and `local_cache = UNKNOWN`. ADR-0007 §1, as amended by ADR-0014, already refuses text and scans whose permission is `UNKNOWN` on every public surface.
   - It does not stop the connector itself. `connectorExecutable()` implements `docs/canonical/12` §6.4's gate literally and refuses only `PROHIBITED`.
   - On 2026-09-29 the project owner chose to decide this later.

   Options:
   - (a) obtain Biblioteka Narodowa's confirmation before any automated run;
   - (b) allow the documented search API only, at a stated polite rate, until confirmed;
   - (c) treat the published "otwarte API" as permission for search, and decide separately for object metadata and OCR downloads.

2. **RESOLVED 2026-09-29 by ADR-0014 §1.** The question was which part of ADR-0007 governs metadata whose rights are `UNKNOWN`.
   - The project owner kept §4: metadata follows the metadata row, which refuses only `PROHIBITED`.
   - ADR-0007 §1's refusal of `UNKNOWN` on public surfaces now applies to transcription and image.
   - A public-domain Polona object's catalogue record may therefore be cited, while its text and scan follow their own permissions.
   - No code changed, because `rights.ts` already behaved this way.

3. **RESOLVED 2026-09-29 by ADR-0014 §2.** The question was what attribution a public-domain Polona object carries.
   - The connector stores a per-object `attribution_text`: the creator when Polona names one, the title, then "Polona, Biblioteka Narodowa", with values as Polona serves them.
   - ADR-0007 §5 displays it verbatim.

4. **What is Polona's source-level default?** RESOLVED 2026-10-01 by ADR-0024 §2.3: every dimension allowed, attribution required; each object's licence tightens it.
   - Polona states rights per object and states no source-wide default.
   - ADR-0007 §6 lets an object layer only tighten its source. Under a `Source` default of `UNKNOWN`, even a public-domain object stays `UNKNOWN`, as the test pins.
   - The connector's `RightsProfile` default therefore decides whether per-object rights can have any effect. It must be chosen deliberately, not left to `completeRights`' defaults.

Consequence if unresolved:

- the connector task cannot be specified lawfully (item 1);
- no Polona object could ever surface (item 4).

---

## D-020 — RESOLVED (2026-09-24): light only; superseded for the whole site by ADR-0021 (2026-10-01)

**Resolution**, decided by the project owner 2026-09-24 ("why can't I change it to white", asked of
a page that followed the operating system into Archive Night): option 1, **light only**. The two
`@media (prefers-color-scheme: dark)` blocks are deleted from `apps/web/src/app/globals.css`, so a
reader who prefers dark sees Paper. This is what the Visual System asks ("Do **not** build Name Atlas
visually around dark mode"; Archive Night only for narrative moments), so it needs no ADR.
`apps/web/src/app/icon.svg` keeps its own night colours: they concern the browser's tab strip, not
the page.

---

## D-019 — RESOLVED (TASK-027, ADR-0010)

**Resolution**, decided by the project owner 2026-09-21: a persisted slug in its **own table**, keyed
`(locale, slug)`, with superseded rows kept and answered by a permanent redirect; collisions
disambiguated by a **stable short id derived from `surname_id`** (Crockford base32, six characters),
never by a sequence number.

The reasoning is in `docs/adr/0010-persisted-slugs-and-sitemap.md`. In short: a table can hold a
retired address, so a corrected display form does not break a URL a crawler already indexed, and
`(locale, slug)` is the key §25's future ASCII aliases will need. A suffix that is a function of the
entity cannot be reassigned by a re-import; an ordinal can, and a reassigned suffix points an indexed
URL at a different family's page.

Implemented by migration `0018_surname_slugs`, `@name-atlas/seo`, `pnpm seo:backfill-slugs` and the
`robots.txt` / `sitemap.xml` routes. `UNIQUE (locale, slug)` and a partial
`UNIQUE (locale, surname_id) WHERE is_current` make both invariants database facts; integration tests
assert that each index refuses.

---

## D-001 — RESOLVED (TASK-002)

**Resolution:** the exact official PESEL surname source is pinned, understood, and safety-railed. Full detail: `docs/sources/pesel.md`.

- **Dataset:** `dane.gov.pl` dataset `1681` ("Nazwiska występujące w rejestrze PESEL"), slug `1681,nazwiska-osob-zyjacych-wystepujace-w-rejestrze-pesel`, publisher institution `333` (Ministerstwo Cyfryzacji), licence CC0 1.0, updated yearly.
- **National production resources (the ingestion target):** male `1148808` ("Nazwiska męskie - stan na 2026-01-20"), female `1148811` ("Nazwiska żeńskie - stan na 2026-01-20"), both `data_date = 2026-01-20`.
- **File-level facts, verified directly from the actual downloaded bytes:** SHA-256 checksums, exact byte sizes, UTF-8 encoding (no BOM), comma delimiter, no quoting, CRLF line endings, exact header (`Nazwisko aktualne,Liczba`), 2 columns, row counts (408,182 male / 420,082 female), sort order, value ranges, and — directly from the bytes, not just from portal metadata — that no row has `Liczba ≤ 1`, corroborating the suppression rule.
- **Semantics confirmed:** living persons only, current-surname field, single-occurrence surnames excluded, missing row ≠ zero (`BELOW_PUBLICATION_THRESHOLD_OR_ABSENT`).
- **Deliverables:** `fixtures/pesel/national-male-2026-01-20.csv` and `national-female-2026-01-20.csv` (22/23 real rows each, verbatim from source, covering common surnames, Polish diacritics, the real suppression boundary, foreign-script surnames, a combining-mark artefact, an embedded-slash surname, and a trailing-whitespace artefact), `fixtures/pesel/source-manifest.json` (machine-readable metadata), and `@name-atlas/sources` (`packages/sources`) — a schema description and fail-closed parser/validator, tested against both real fixtures and a deliberately mutated case per drift category (21 tests, all passing).

**How it was resolved:** `dane.gov.pl`/`api.dane.gov.pl` remained network-egress-blocked for every session that worked this task (confirmed repeatedly: `WebFetch` → `EGRESS_BLOCKED`, `curl` → `CONNECT tunnel failed, response 403`, DNS resolves fine so this is a policy block, not a connectivity fault). The project owner manually retrieved the dataset metadata, then the resource listing, then the two actual national CSV files, and supplied each directly. Nothing was fabricated, inferred, or reconstructed from the canonical corpus to fill a gap at any stage; every item that could not yet be verified was carried forward as explicitly unresolved until the next supply closed it. No mirror or third-party source was used; no different (e.g. deceased-inclusive) dataset was substituted; no 2025-or-earlier resource was substituted for the current 2026 one.

**Both previously-carried residual items are now CLOSED (2026-09-19).** They are recorded here so the history is readable; neither is outstanding work.

1. **Download URLs — CLOSED.** The literal per-resource endpoints are now recorded verbatim in `fixtures/pesel/source-manifest.json` (`official_source_url`, `official_source_media_file_url`, `official_resource_metadata_url`) for all four resources. They were read from genuine `api.dane.gov.pl` JSON:API metadata captured during the project owner's acquisition run, not constructed by this session from a URL pattern.
2. **Portal timestamps — CLOSED.** Resource-level `created`/`modified`/`verified` are `2026-01-28T13:47:34Z` (male `1148808`) and `2026-01-28T13:48:39Z` (female `1148811`); `retrieved_at` is `2026-09-18T17:40:00Z` and `2026-09-18T17:39:46Z` respectively. The comparison the residual asked for can now be made and the answer is that they differ: the portal timestamps are **eight days later** than the PESEL reference date `data_date = 2026-01-20`. The four concepts stay distinct fields and must still never be inferred from one another.

**One new source fact established while closing these (not a residual, a finding):** the resource's **native published format is XLSX**; the CSV that Name Atlas pins is a portal-generated conversion served from the official `csv_download_url` endpoint. Both checksum-pinned CSVs were independently corroborated along a second acquisition path (the project owner's automated run, archive generated `2026-09-18T17:44:29Z`, verified 46/46 against its own `SHA256SUMS.txt`) and matched `fixtures/pesel/source-manifest.json` byte-for-byte. TASK-004 must continue to pin the CSV bytes it actually parses by checksum, and must not assume CSV and XLSX are interchangeable without re-verification.

The rarity/`1-in-X` denominator question from this decision's original scope (below) is a TASK-004/TASK-005 modelling decision, not a source-verification fact, and remains open for whichever task designs `RARITY_CONTEXT`.

**Original decision, for reference:** the source is the `dane.gov.pl` dataset *"Nazwiska występujące w rejestrze PESEL"*, dataset 1681, published by the Ministry of Digital Affairs, covering surnames of living people using the current-surname field, omitting surnames occurring only once, excluding deceased people, updated annually, national not regional. What had to be pinned before ingestion — resource ID(s) and file(s), the resource structure, the resource reference date distinct from the portal update date, a checksum, reuse/attribution metadata, and the absence-is-not-zero semantics — is now resolved as recorded above, except the two residual items noted.

**Why it blocked:** ingesting before this was pinned would have produced a `DistributionSnapshot` with unverifiable provenance and a rarity claim that may be arithmetically invalid. That risk is now closed for the national production pair.

Do not revisit unless the 2026 resources are superseded by a new annual snapshot (a routine, expected refresh — repeat this verification for the new resource, do not assume it matches this record) or a resource-level fact recorded above is found to be wrong on closer inspection.

**Before any refresh, read `docs/sources/pesel-annual-series.md`** (added 2026-09-19). Every file-level fact recorded above for the 2026 national pair was independently re-verified against the full source bytes on that date and holds exactly, including the combining-mark counts and the `SCHIED ` whitespace artefact, and both committed fixtures were confirmed to be verbatim excerpts carrying full-resource counts. That record also carries two findings that make a refresh unsafe to assume: the 2019 resources use the header `nazwisko,liczba`, whose field is `nazwisko` and not `nazwisko aktualne`, so a pre-2020 resource may not carry the current-surname field at all; and national resources `35279` (labelled 2021 female) and `38772` (labelled 2022 female) are byte-identical, so a publisher resource id and a year label cannot be inferred from one another.

---

## D-002 — RESOLVED (2026-09-21) by ADR-0008

**Resolution: Path B — meaning comes from attributed sources, or it is a stated gap; and Path A is
left open at zero cost.** Decided on the project owner's instruction to implement the open decisions
rather than leave them waiting on outreach. Full record:
`docs/adr/0008-onomastics-path-b-attributed-sources.md`. Implemented by
`tasks/022-surname-meaning-truth-chain.md`.

What the decision settles:

1. **Path B is the build.** Meaning is derived claim-by-claim from works that can be cited and whose
   rights permit the surface — not from a bulk ingestion of a partnership-required dictionary.
2. **A meaning is never generated.** No suffix-pattern inference, no morphological guess, no model
   -written etymology, not even hedged. `-ski` is not evidence of anything the product may state.
3. **The gap is a first-class result.** `NO_SOURCED_MEANING` is a state the contract carries and the
   page renders in both languages. Meaning launches at **zero coverage**, which is the correct state
   and is stated per surname rather than hidden.
4. **Admissibility is four conditions, all required** — citable work, rights permitting the surface,
   reliability tier `C_SCHOLARLY_SECONDARY` or better, and a stated licence basis. Enforced at import,
   where a refusal is a result.
5. **Competing interpretations are both kept**, the claim is assessed `CONFLICTING`, and neither is
   preferred. `VERIFIED` is unreachable for a meaning.

**Why this unblocks rather than pre-empts.** Path A — a licence or partnership with IJP PAN — remains
the better product outcome and is still the project owner's to pursue. It is no longer *blocking*,
because ADR-0007's rights gate makes either answer safe: an IJP PAN profile carrying
`review_status = BLOCKED` is refused on every public surface while internal research stays open, and a
licence later is a new `Source`, a new `rights_profile` and an import — not a rebuild. Nothing can
leak while the conversation happens, and nothing must be rewritten when it concludes.

**Still to obtain, and still the project owner's:** a licence or partnership with IJP PAN (or another
specialist onomastic rights holder), or a decision to stay on public-domain scholarship. Note the
constraint that has not changed: ISNP's PESEL frequency/geography base is **2014**, so it is a meaning
source and never a current-data source.

**Original record, for reference**

### D-002 (original record) — Onomastics rights and source strategy

**Status (superseded):** BLOCKS the meaning/etymology capability (M2 onward). NON-BLOCKING for M0–M1.
**Owner:** project owner (commercial/legal outreach).

IJP PAN's *Internet Dictionary of Polish Surnames* is the strongest specialist source, but (`docs/canonical/12` §2.1, `docs/canonical/10` §5.3):

- its PESEL frequency/geography base is **2014**, so it is not a current-data source;
- being free to read establishes no permission for bulk commercial ingestion, caching or redistribution — status is partnership-required / legal-review.

Decision required:

- **Path A** — secure a commercial licence or partnership with IJP PAN or another specialist onomastic rights holder; or
- **Path B** — build meaning/origin claim-by-claim from lawful scholarly and public-domain sources, accepting lower coverage and more `INSUFFICIENT_DATA` results.

Either way, define what the product shows when neither path yields evidence for a surname. The answer must be an honest gap, never a generated etymology.

---

## D-003 — RESOLVED (2026-09-21) by ADR-0007

**Resolution: rights are evaluated per asset kind, per surface, and fail closed.** Decided on the
project owner's instruction to implement the open decisions rather than leave them waiting on
outreach. Full record: `docs/adr/0007-rights-per-asset-and-surface.md`. Implemented by
`tasks/021-rights-per-asset-and-surface.md`.

All five questions the original record raised are answered, and each answer is executable code rather
than a policy statement:

1. **Unknown or unreadable rights → fail closed.** `UNKNOWN` on `FREE`/`PAID`/`SEO` is a refusal, not
   a maybe, on every dimension — extending the treatment §6.4 already gave `commercial_use`. An
   unparseable stored value reads as `UNKNOWN`, never as `ALLOWED`. `INTERNAL` stays open for metadata
   so that rights review is possible at all.
2. **OCR** is stored whatever the rights say, because without the matched text there is no
   `EvidenceItem`; publishing an excerpt requires an explicit `transcription_rights = ALLOWED` and is
   capped at **300 code points**, with truncation reported rather than silent.
3. **Scans** are reproduced only on an explicit `image_rights = ALLOWED` (§6.4 taken literally, so
   `CONDITIONAL` is not enough). Everything else is `LOCATOR_ONLY`: the object may be named and linked
   at a stable locator, never copied, cropped, proxied or re-hosted.
4. **Surfaces** are unlocked per (asset kind × surface) by `evaluateRightsMatrix`, not per source. The
   metadata row delegates to the existing `evaluateSurface`, so nothing PESEL already publishes moved.
5. **Attribution** is `attributionFor`: the rights holder's own wording verbatim when stored, else a
   line composed from owner and rights URL — and a required attribution that cannot be built **blocks**
   rather than publishes.

**What this ADR does not claim.** It asserts nothing about what Polona's or Biblioteka Narodowa's
terms actually say. It decides what Name Atlas does with whatever they say. The per-object values must
still be read from each object at ingest, which `docs/canonical/12` §16.3 already requires as a
retrieval stage.

**Still to obtain from the rights holder** (no longer blocking, because the defaults are safe): the
confirmed per-object rights values themselves, and confirmation that the attribution wording Name
Atlas displays is acceptable to Biblioteka Narodowa.

**Original record, for reference**

### D-003 (original record) — Polona rights per surface: metadata, OCR/transcription, image

**Status (superseded):** BLOCKS M3 (historical discovery). NON-BLOCKING now.
**Owner:** project owner + rights review, informed by the TASK-010 Polona spike.

Polona exposes object-level rights and they differ per object (`docs/canonical/12` §16.4). Three permissions must be modelled and evaluated **independently**: `metadata_rights`, `transcription_rights` (OCR), `image_rights`.

Decision required:

- the default posture when an object's rights are unknown or unreadable (proposed: fail closed — internal use only, no free/premium/SEO surface);
- whether OCR text extracted from a public-domain scan may be stored, excerpted and cited, and at what length;
- whether scans may be reproduced at all, or only linked with a stable locator;
- which surfaces (free / premium / SEO / share) each permission combination unlocks;
- attribution text and format required per rights state.

Consequence if unresolved: historical evidence can be discovered but not lawfully surfaced, which turns M3 into internal-only work.

---

## D-004 — RESOLVED (2026-09-20)

**Resolution: Preferred — adopt the current official regional pair `1148786` / `1148790` as a *registered-domicile* regional distribution, voivodeship only, with the residual stated on every claim.** Decided by the project owner, 2026-09-20. Specified as `tasks/011-voivodeship-places-and-regional-ingestion.md` (storage: the voivodeship `Place` foundation and the regional importer), to be followed by TASK-012 (the `CURRENT_DISTRIBUTION` truth chain). Not implemented yet.

What the decision settles, and what it does not:

- **Settled:** the source is adopted; the `Place` foundation's voivodeship subset moves from M3 into M2; the hard semantic restriction below is binding on every snapshot and every claim — *województwo zameldowania na pobyt stały* is permanent registered residence, never origin, ancestry, birthplace, historical distribution or unqualified current residence; the ~21.7 % / 19.8 % residual TASK-008 measured is carried verbatim as coverage, never explained away and never redistributed.
- **Not settled:** the resource-level licence (D-007, which gates paid surfaces, not ingestion — the same position as the national pair); the cause of the residual (`UNRESOLVED` until the publisher answers); anything below voivodeship level.

The original record is kept below because its findings — the semantic restriction, the preflight, the spike's measurements — are the evidence the decision rests on.

---

## D-004 (original record) — Current regional surname map availability

**Status:** Source *existence* now VERIFIED (see below). Adoption decision, framing, and all implementation remain BLOCKED/future scope. NON-BLOCKING for the paid MVP critical path. **BLOCKS any `CURRENT_DISTRIBUTION` task** — see the 2026-09-19 preflight update below.
**Owner:** project owner (data licensing + framing decision).

### Update — current regional resource identified (project-owner-supplied, via TASK-002)

While verifying the national PESEL production resources for D-001, the project owner identified a current, official, dated regional resource pair on the same `dane.gov.pl` dataset 1681: male resource `1148786`, female resource `1148790`, both dated `2026-01-20` (same reference date as the national pair). Full detail: `docs/sources/pesel.md`.

**This verifies that a current, lawful, official regional PESEL resource exists** — the specific fact `docs/canonical/10` §5.2 flagged as unestablished. This is a narrower finding than "D-004 is resolved": it answers *whether a current source exists*, not *whether/how Name Atlas should use it*. The "Preferred" path below is accordingly closer than it was, but the decision below — and everything about actually building a map — is still open, and **no map, regional claim, or regional ingestion logic was built or is authorised by this finding.**

### Update — regional resource bytes and metadata now observed (2026-09-19), adoption still open

The same verification run that closed D-001's residual items also covered the regional pair. Now recorded in `fixtures/pesel/source-manifest.json` under `regional_resources_not_ingested`: SHA-256 checksums (`0eb31d19…1b51` male, `cd0c100e…6989` female), byte sizes (16,615,897 / 17,900,370), official download and metadata endpoints, portal timestamps (`created`/`modified`/`verified` = `2026-01-28T13:32:49Z` male, `13:35:13Z` female; `retrieved_at` `2026-09-18`), native format XLSX, and the **observed** header row `Województwo zameldowania na pobyt stały,Nazwisko aktualne,Liczba` — read from the actual bytes, not assumed.

**The licence question below is not closed and got sharper, not softer.** The resource-level metadata returned by `api.dane.gov.pl` for these resources carries **no licence, rights or terms attribute at all** (checked across the full attribute set of both regional and both national resources). Licence is stated only at dataset level. So dataset-level CC0 1.0 remains the only licence statement on record, and "the resource inherits it" remains an assumption this project has not verified — it must be confirmed with the publisher before any regional adoption, not inferred from the absence of a contrary field.

**Nothing about adoption changed.** The regional files were not copied into the repository, not parsed, not fixtured, and no regional logic exists. Observing bytes is not authorisation to use them; the decision below is still the gate.

### Update — `CURRENT_DISTRIBUTION` truth-chain preflight (2026-09-19): not actionable, no task file written

A planning session was asked to specify a `CURRENT_DISTRIBUTION` truth-chain task (requested as "TASK-007") and to first determine from repository evidence whether an approved source contains surname distribution by geography. Full record: `docs/sources/pesel-regional.md`.

**Finding:** the approved production source (national pair `1148808`/`1148811`) contains no geography. The regional pair above is the only candidate, and it cannot support the task yet:

- it carries **no administrative code** — column 1 is an uppercase voivodeship name string (observed: `DOLNOŚLĄSKIE`); the full value set is unverified; the repository has no `places`, no `entity_external_ids`, no TERYT data and no place connector, so canonical geographic identity cannot be assigned without inventing it;
- **suppression semantics are unverified** — whether the single-occurrence exclusion applies per (surname, voivodeship) cell or nationally is unstated, the minimum `Liczba` was never inspected, and the relationship between regional sums and national counts is unknown; the acquisition tool itself flagged both for review;
- resource-level licence remains unconfirmed (above);
- the tables and code the chain must build on do not exist: TASK-004 (`DistributionSnapshot`/`DistributionValue`, `Source`, `RightsProfile`, `SourceRecord`) is specified but not implemented; TASK-005 (`EvidenceItem`/`Claim`/`ConfidenceAssessment`/`Citation`) is neither specified nor implemented.

**Consequently no distribution truth-chain task file was created.** The gate for a distribution capability is now enumerated, in order: (1) the adoption decision below; (2) resource-level rights confirmation; (3) TASK-004 implemented; (4) TASK-005 implemented; (5) a **PESEL regional source spike** (the smallest prerequisite — evidence and fixtures only, TASK-002 pattern; now specified as `tasks/007-pesel-regional-source-spike.md`, not started); (6) a voivodeship `Place` foundation with TERYT external IDs; (7) regional ingestion; (8) the truth chain itself. Steps 5 and 1–2 can proceed in parallel — the spike produces the suppression, reconciliation and value-set facts this decision needs, without adopting anything.

**Not decided here:** adoption, framing, rights posture. The spike was numbered TASK-007 at the project owner's request; the distribution truth chain itself has no number yet. The reviewed plan's own TASK-007 is the search/profile API, and its TASK-006 is complete current-surname intelligence; a distribution task is not numbered anywhere in `PLAN.md` or the reviewed plan (current geography is "Track B — research/license; if unavailable: not blocking").

**Hard semantic restriction, established by the project owner and binding on any future use of this resource:** the regional dimension is *województwo zameldowania na pobyt stały* — voivodeship of **permanent registered residence** (a legal registration record) for the current-surname holder. It must never be presented as: surname origin, ancestry, birthplace, historical distribution, or (without qualification) necessarily current physical residence — registered domicile and actual current residence can differ. Any future claim built on this resource must state that exact scope, not a looser gloss.

No lawful, genuinely current regional surname dataset is established (`docs/canonical/10` §5.2). The open PESEL surname dataset is national.

Decision required — one of:

- **Preferred** — licence a lawful dataset with appropriately current counts at voivodeship/powiat or equivalent level. **A candidate now exists** (resources `1148786`/`1148790` above) — the remaining decision is whether registered-domicile geography, framed with the restriction above, is an acceptable basis for a "current regional distribution" product feature, and on what licence terms (resource metadata has now been checked and carries no licence field at all, so resource-level licence is still not independently confirmed — see the 2026-09-19 update above).
- **Fallback A** — use an older regional dataset, labelled with its actual snapshot date (e.g. "regional distribution in the 2014 PESEL snapshot"), clearly marked as not current;
- **Fallback B** — ship without modern regional distribution, keeping current national count → rarity → origin/meaning → historical evidence.

**Forbidden regardless of decision:** distributing a current national total across regions using old proportions and presenting the result as current fact. Current national count, current regional distribution, older regional distribution and historical occurrence map are four distinct things and must never be collapsed. Presenting registered-domicile geography as surname origin, ancestry, birthplace, historical distribution, or unqualified current physical residence is equally forbidden (see restriction above).

Until the adoption/framing decision above is made, the current map stays conditional, no map is built, and the product ships without it. TASK-002 and every task before M2's current-geography capability must not implement any regional-distribution logic on the strength of this finding alone.

### Findings — `CURRENT_DISTRIBUTION` preflight (2026-09-19). Status and decision unchanged.

A read-only preflight was run for a requested `CURRENT_DISTRIBUTION` truth-chain task. It found the capability **not actionable from current repository evidence** and wrote no task file. Findings only; this does not narrow or widen the decision above. Full record: `docs/sources/pesel-regional.md`.

What the preflight established from committed evidence:

- **The candidate resources carry no geographic identifier.** The geography column holds an uppercase voivodeship *name string*; there is no TERYT code, no ISO 3166-2, no code of any kind. Canonical requires `DistributionValue.place_id` → `Place` with a TERYT external ID (`docs/canonical/11` §6.2, §20.3, §32; `12` §11), and no `places`, `place_names`, `administrative_memberships` or `entity_external_ids` table exists, nor any TERYT connector or ingested TERC data. A voivodeship-name → TERC correspondence must be established from TERYT data and never typed from memory.
- **Granularity is one level only** — voivodeship. No powiat, no gmina, no locality.
- **The suppression grain is unverified.** The single-occurrence exclusion is confirmed for the *national* files from their bytes; whether it applies per (surname, voivodeship) cell, and whether any `0` or `1` rows exist regionally, has never been observed. The acquisition tool's own warning on both regional records: "Regional cell suppression and reconciliation with national totals require review."
- **Reconciliation with national totals is an observation nobody has made**, so no equality invariant between regional sums and national counts may be assumed or specified.
- **The resource-level licence gap is confirmed negative again**, from the full attribute key set of both regional resource objects: no licence, rights or terms attribute exists at resource level. This is the same gap D-007 tracks for the national pair.
- **`Liczba` means the same unverified thing regionally as nationally** — the publisher's "liczba wystąpień", occurrences, not stated people (TASK-004 §14 U-4, open). The male/female partition basis is likewise unstated (U-1, open), so the two partitions must never be summed.
- **No accepted task ingests geographic data.** TASK-004 writes `geography_level = 'NATIONAL'` and `place_id = null` for every row and excludes regional ingestion; the parser hard-codes the two-column national shape, so a three-column regional file fails closed today.

Consequence for sequencing: before any `CURRENT_DISTRIBUTION` task can be specified honestly, the decision above and the resource-level rights question must be answered, the Truth Layer must exist on the branch carrying the work, the regional bytes must be verified by a source spike — now specified as `tasks/008-pesel-regional-source-spike.md`, which informs this decision without deciding it — and a voivodeship `Place` foundation with TERYT external IDs must exist. Pulling that foundation forward from M3 is itself a sequencing decision for the project owner. `docs/canonical/12` §10 Scenario C and `docs/canonical/23` §24 remain fully supported: the map chapter is marked unavailable, not faked, and does not block the MVP.

### Findings — TASK-008 regional source spike, execution attempt BLOCKED (2026-09-19). Status and decision unchanged.

The spike was attempted and stopped at its own environment gate: the two regional CSV files were not supplied, and `api.dane.gov.pl`, `dane.gov.pl`, `api.stat.gov.pl` and `eteryt.stat.gov.pl` are all policy-blocked at the network gateway — DNS resolves to `185.41.93.178`, the CONNECT tunnel is refused with 403. The same block D-001 recorded for TASK-002. Supply remains manual. Full record with the commands and their output: `docs/sources/pesel-regional.md`.

Three acceptance items that do not depend on the bytes were completed, and they add findings here:

- **The resource-level licence gap is now confirmed by an auditable check, not an eyeball.** A recursive key scan of both regional resource objects for `licen[cs]|rights|terms|condition|copyright|reuse|attribution|waiver|cc0`, excluding the JSON:API container key, returns **NONE** across all 34 attribute keys of each, including the nested `files` and `supplements` arrays. At dataset level `license_name` is the bare string `CC0 1.0` while `license_chosen` is `null` and every `license_condition_*` field is empty, `false` or `null`. This sharpens the gap: there is no resource-level grant to inherit and no stated condition set at dataset level either. The publisher confirmation this decision and D-007 require is still not reported.
- **`special_signs` is empty on all four 2026 resources**, national and regional. The portal supports declaring special signs — the vocabulary for marking a suppressed, unavailable or not-applicable cell in band — and these resources declare none. This is evidence about the metadata, not the bytes: a suppressed regional cell would have to be represented by row absence rather than by any declared marker. It does not establish what the bytes contain.
- **The publisher's suppression wording does not address the per-cell grain.** The dataset `notes` field says, in full, that "Nazwiska z pojedynczą liczbą wystąpień oraz dane dot. osób zmarłych nie zostały uwzględnione w zestawieniu" — surnames with a single occurrence, and data on deceased persons, were not included in the compilation. It is written once, at dataset level, for a dataset holding both national and regional resources, and says nothing about (surname, voivodeship) cells. So whether the exclusion applies per cell cannot be answered from the publisher's text in either direction; only the bytes, reconciled against the national counts, can settle it. Attributing either reading to the publisher would be fabrication.
- **Each resource offers three representations** — XLSX native, CSV, and a JSON-LD roughly 44 times the CSV's size. Any future ingestion must keep pinning the bytes it actually parses and must not treat the three as interchangeable.

Nothing was adopted, ingested, fixtured or approved. No TERC code was read or written. The manifest was deliberately left unedited, because everything the spike would add to it is bytes-dependent.

### Findings — TASK-008 EXECUTED, regional bytes verified (2026-09-19). Status and decision still unchanged.

The project owner supplied both regional CSV files and both full national files. Each was checksum-verified against `fixtures/pesel/source-manifest.json` before any row was read. 23 of the spike's 27 acceptance items are now verified from the bytes. Full record, with every command and figure: `docs/sources/pesel-regional.md`, section "TASK-008 executed". Nothing was ingested, no `RightsProfile` exists, and this decision's status, options and adoption gate are untouched.

**Two findings materially change what an adoption decision is choosing between.**

**1. Suppression is per cell — previously unresolved, now settled from the bytes.** `Liczba` never falls below 2 and no row carries 0 or 1, in either file. The publisher's single-occurrence exclusion therefore applies to each (surname, voivodeship) cell, not only to the national count. About a fifth of all rows — 19.7% male, 21.6% female — sit exactly at that boundary of 2. Consequently **53.8% of national male surnames and 50.8% of female have no regional row at all**, and a surname with over a thousand bearers nationally can still be entirely absent. An absent cell means zero, or one suppressed bearer, or a bearer with no voivodeship value; never a confirmed zero.

**2. The 16 voivodeship values do not account for the national totals, and per-cell suppression cannot explain the gap.** Male: 21,197,537 nationally against 16,590,111 across all cells, leaving **4,607,426 bearers (21.74%) in no voivodeship row**. Female: 4,263,939 (19.78%). Suppression caps out at 684,961 and 676,743 respectively. The decisive proof: all 3,106 male and 3,561 female surnames present in **all 16** voivodeships — where suppression can hide nothing at all — are still short, by 971,775 and 849,705 bearers, a median of 10.2% and 8.1% of their national counts. `NOWAK` has a row in every voivodeship and is short by 11,418.

**A second mechanism exists and the publisher does not state what it is.** Candidates consistent with the field's own name, *voivodeship of permanent registered residence*: bearers with no permanent registration in Poland, bearers registered abroad, or a further undocumented exclusion. `UNRESOLVED`; none may be asserted.

**The gap is systematically biased**, which is what makes it a decision input rather than a footnote. Coverage rises from 78.6% for surnames with 2–9 male bearers to 89.3% above 10,000, and individual surnames diverge far more sharply: `MELNYK` 6,442 national against a regional sum of 210, `KOVALCHUK` 5,382 against 66, `SHEVCHENKO` 5,217 against 69, `BOIKO` 4,616 against 56, `NGUYỄN` 3,730 against 169 — against `NOWAK` at 86,969 of 98,387. Any regional surface built on this resource understates every region, unevenly, and most severely for surnames of recent-migration origin. That sharpens the binding restriction already recorded above: for some surnames this dimension describes only a small minority of their bearers, so even a correctly labelled "registered domicile" map would mislead unless the residual is shown alongside it.

**The only reconciliation invariant the source supports** is `regional sum ≤ national count`, which holds for every surname with zero exceptions in either file. Equality holds for roughly a quarter of surnames and must never be asserted or enforced.

**Still blocking, both on one missing input.** The geography column carries no administrative code of any kind, so a voivodeship-name to TERYT TERC correspondence could not be established: the TERC archive file was not supplied and `api.stat.gov.pl` and `eteryt.stat.gov.pl` are egress-blocked. No TERC code was read or written. A voivodeship `Place` foundation therefore remains unspecifiable, and the resource-level licence confirmation is still not reported.

---

### Findings — TERYT TERC correspondence established (2026-09-20). Status and decision unchanged.

The project owner supplied the TERC register on 2026-09-20, closing TASK-008's items 23, 24 and 10.
Full record: `docs/sources/pesel-regional.md`, section "TERYT TERC correspondence". The file is
`fixtures/teryt/voivodeship-terc-correspondence.json`.

**All 16 observed geography values map to a current TERC voivodeship code; none is unmapped.** The
comparison is exact string equality, byte for byte against the TERC `NAZWA` field. No normalisation
was applied and none is claimed: both sides are already NFC and every value already matches its
TERC name including case and diacritics, so a folding step could not have changed any outcome. The
register's reference date is `2026-01-01`, ten days before the PESEL resources' own `2026-01-20`.

The TERC zip's SHA-256 equals the value already committed in the acquisition archive's
`SHA256SUMS.txt`, so it is an authentic archive copy. The GUS hosts remain egress-blocked and were
not reached, so `docs/canonical/12` §2.1's rights statement is quoted rather than re-verified. No
raw TERYT file is committed.

**What this changes for this decision: one objection, and only one.** The
`CURRENT_DISTRIBUTION` preflight recorded that the regional candidate "carries no geographic
identifier at all: a voivodeship name string, no TERYT code, no ISO 3166-2, while canonical
requires Place plus a TERYT external ID". That objection is now answered — the codes exist, are
official, and are documented. A later task could build a voivodeship `Place` foundation without
inventing anything.

**What this does not change.** No `Place`, table, migration or connector was created, and none is
authorised. The two findings that decide whether a regional surface is honest are untouched:
per-cell suppression leaves 53.8% of national male and 50.8% of female surnames with no regional
row, and 21.74% of male and 19.78% of female bearers appear in no voivodeship row for a reason the
publisher does not state. The resource-level licence is still unconfirmed (D-007). The binding
semantic restriction on registered-domicile geography is unchanged. **This decision's status,
options and adoption gate are exactly as they were.**

---

## D-005 — RESOLVED (TASK-001)

**Resolution:** pin `postgis/postgis:16-3.4@sha256:44126d872ac91993766c341e369c539e8196614321765d36a6f1bab0419a5fa5` everywhere PostgreSQL is needed — local development, CI and Testcontainers.

- The digest was confirmed against Docker Hub's registry API at implementation time (not guessed): PostgreSQL 16, PostGIS 3.4.2.
- Used in `packages/testing/src/postgres-container.ts` (`POSTGRES_TEST_IMAGE`, Testcontainers), and in `.github/workflows/ci.yml`'s `services.postgres` block (same tag+digest, kept in sync by comment).
- Because `postgis/postgis` is built on top of the official `postgres` image, it carries every contrib module the stock image ships, including `pg_trgm`, in addition to PostGIS — one image satisfies both extensions.
- The bootstrap migration (`packages/db/migrations/0001_bootstrap_extensions.ts`) runs `CREATE EXTENSION IF NOT EXISTS postgis` and `CREATE EXTENSION IF NOT EXISTS pg_trgm`. Both are asserted present by `tests/integration/src/extensions.test.ts` (querying `pg_extension`), not by eye.
- Locally, this was additionally cross-checked against `postgresql-16` + the `postgresql-16-postgis-3` apt package (PostgreSQL 16.13, PostGIS 3.4.2) — see PROGRESS.md for why, and for the exact verification performed against a real database.

No further action needed. Do not revisit unless the pinned digest is deliberately rotated (a new ADR-0002-adjacent decision, not a re-litigation of the choice of image).

---

## D-006 — RESOLVED (TASK-004 specification, 2026-09-19)

**Resolution:** one `SourceRecord` per **resource version**; `external_record_id` stays the publisher's bare resource id; the uniqueness key becomes `(source_id, external_record_id, content_hash)`. Recorded in full, with the rejected alternatives and their costs, in **`docs/adr/0003-source-record-granularity.md`**.

The decision resolves a genuine contradiction between two canonical documents — `docs/canonical/12` §3.1/§9.2 (version-scoped `BULK_DATASET` import) versus `docs/canonical/11` §37.2's row-scoped worked example — and deliberately deviates from `docs/canonical/11`'s `UNIQUE source_records(source_id, external_record_id)` index line, which cannot coexist with the annual-refresh supersession requirement in `docs/canonical/12` §9.3 and `ARCHITECTURE.md` §10 invariant 6. ADR-0003 is the authority; the migration must carry a comment pointing at it.

No further action needed. Do not revisit except on the two conditions ADR-0003 names.

---

## D-007 — RESOLVED (2026-09-20), together with TASK-004 §14 U-4 and U-6

Three decisions the project owner took on 2026-09-20, each a judgement recorded as one, none a publisher confirmation. Together they make the publisher enquiry optional rather than necessary: it would replace judgement with confirmation, and blocks nothing.

**D-007 — licence: rely on the dataset-level CC0 1.0 declaration and the statutory re-use right.** CC0 1.0 Universal is a waiver of all copyright and database rights to the fullest extent the law allows; it permits copying, modification, redistribution and commercial use without permission or attribution. dane.gov.pl declares it once, at dataset level (`license_name`), and attaches licences at dataset level by design — a resource is a file within a dataset; Polish open-data law adds a statutory right to re-use public sector information, commercially included. The remaining gap (no resource-level licence field; `license_chosen` null) is accepted. Implemented: `PESEL_RIGHTS_PROFILE` in `packages/sources/src/registry.ts` now records `commercial_use = ALLOWED`, `redistribution = ALLOWED`, `review_status = APPROVED`, with the basis in `notes`; migration `0008_pesel_rights_decision` brings a populated database's stored profile to the same values. Effect: every PESEL claim's surface eligibility is now `INTERNAL / FREE / PAID / SEO` all `ALLOWED`; the paid-surface gate is open. Attribution stays in the profile because the product attributes everything it publishes (PRODUCT.md §7), not because CC0 requires it.

**U-4 — unit: `PEOPLE`, on the field's definition.** Recorded as the 2026-09-20 amendment to ADR-0004; the accepted English and Polish sentence templates are in `docs/contracts/surname-result.md`. "Estimated" was considered and rejected: the number is an exact count of records with a defined universe, and the honest form is the count with its scope.

**U-6 — denominator: rarity is stated over the published universe.** The denominator for `RARITY_CONTEXT` is the sum of the published counts of the same resource — 21,197,537 for the male register at 2026-01-20 — which is exact and derivable, and every rarity statement is labelled "of people counted in the register", never "of Poles". The register's true living-person total stays unknown (single-bearer surnames are excluded from publication; the register holds emigrants), and `distribution_snapshots.universe_size` stays null. Specified as `tasks/014-rarity-context-truth-chain.md`.

The original record is kept below because its analysis of the gap is what the decision was taken against.

---

## D-007 (original record) — PESEL resource-level licence confirmation (gates paid surfaces, not ingestion)

**Status:** NON-BLOCKING for TASK-004 and M1. **BLOCKS M5/M6** — no PESEL-derived evidence may enter a paid report until this is closed.
**Owner:** project owner (publisher contact + legal review).

Split out of TASK-004 §14 U-2 when the project owner answered that item on 2026-09-19. U-2 settled *what posture to seed now*; it deliberately did **not** settle the underlying licence question, which is this entry.

### The gap

Licence is stated by the publisher at **dataset** level only: dataset `1681` carries `license_name = "CC0 1.0"`, read from the portal's own dataset metadata. The **resource**-level metadata returned by `api.dane.gov.pl` carries **no licence, rights or terms attribute at all** — checked across the full attribute set of all four 2026 resources (both national, both regional) and recorded in `fixtures/pesel/source-manifest.json` under `licence_provenance`. The same gap is noted from the regional angle in D-004.

"The resource inherits the dataset licence" is therefore an assumption this project has not verified. It is very probably correct — an open-government portal publishing a dataset under CC0 does not usually intend its resources to be differently licensed — but *probably correct* is not the standard for a term that a paid product would rely on.

### Current posture (already in effect, TASK-004 §14 U-2)

The seeded PESEL `RightsProfile` carries `commercial_use = UNKNOWN`, `redistribution = UNKNOWN` and `review_status = LEGAL_REVIEW_REQUIRED`. By `docs/canonical/12` §6.4 this sets `evidence.paid_surface_eligible = false` automatically, so the gate is already closed in code rather than by memory. Ingestion, internal use and the free surface are unaffected — the only hard gate on ingestion is `automated_access == PROHIBITED`, which is not met.

### What closing this requires

1. Confirmation from Ministerstwo Cyfryzacji, or from a portal term that binds resources to their dataset's licence, that resources `1148808` and `1148811` are covered by the dataset's CC0 1.0 dedication.
2. A read of dane.gov.pl's own terms of use — not yet done, and also the residual behind `automated_access = ALLOWED` in the same profile.
3. A legal review of commercial reuse, at which point `review_status` may move off `LEGAL_REVIEW_REQUIRED` and `commercial_use` / `redistribution` off `UNKNOWN`.

Because `RightsProfile` is versioned and immutable once applied (`docs/canonical/11` §9.4), closing this creates a **new** profile rather than editing the seeded one.

### Do not

- Do not set `commercial_use = ALLOWED` on the strength of the dataset-level statement alone. That is precisely the inference this entry exists to prevent.
- Do not treat the absence of a resource-level licence field as permission. Absence of a contrary field is not a grant — the same reasoning D-004 already records.

---

## D-008 — RESOLVED (TASK-005 implementation, 2026-09-19)

**Resolution: Option A — `docs/canonical/11` binds. `docs/canonical/14`'s MODEL CHANGE PROPOSALS are not ratified and are not implemented.**

Decided by the project owner, 2026-09-19. Concretely:

- `EvidenceType` is `docs/canonical/11` §9.5's 9-member enum; the PESEL value is `OFFICIAL_DATASET_FIELD`, **not** `docs/canonical/14` §4's `OFFICIAL_DATASET_VALUE`.
- `EvidenceItem` carries §9.5's fields only. No `directness`, `evidence_scope`, `extraction_method`, `extraction_version`, `extraction_confidence`, `independence_group_id` or `source_authority_class` (14-A).
- `ClaimEvidence.relationship` is `SUPPORTS | CONTRADICTS | CONTEXT` (§10.2). No `QUALIFIES`, `CONTEXTUALISES` or `LEAD_ONLY` (14-D).
- The `CURRENT_POPULATION` payload uses `docs/canonical/14` §14.1's field naming (`count`, `distribution_snapshot_id`, `country_code`, `snapshot_date`, `source_population_scope`) — the dedicated claim-payload section, and the only one carrying `source_population_scope`.

**No ADR is required**, because nothing here deviates from a canonical specification: this selects the ratified schema over a document's own unratified proposals. `docs/canonical/14` §29.1's dataset caveats are carried by its second branch — "SourceRecord scope metadata" — which TASK-004 already persists on `distribution_snapshots.universe_description` and `coverage_notes`.

Adding a proposal field later is an additive, nullable-column migration. Do not revisit unless a proposal is actually ratified.

---

## D-009 — RESOLVED (TASK-005 implementation, 2026-09-19)

**Resolution: Option A — create a minimal synchronous `research_runs` table now.**

Decided by the project owner, 2026-09-19.

`docs/canonical/11` §248 marks `ResearchRun` **P0** and §22.1 gives its schema. `PLAN.md`'s M3 item is the *asynchronous runtime* — `ResearchModuleRun`, the outbox, Redis/Valkey, BullMQ — not the audit record itself. Creating the audit record at M1 therefore reconciles the two rather than deviating from either, and it is what makes `docs/canonical/14` §19's "why does Name Atlas currently believe this?" answerable at all.

Scope of what was built:

- One row per derivation invocation, written synchronously by the derivation service.
- `run_type = 'BASIC_SURNAME'`, `run_status` and `qa_status` set from the run's real outcome.
- `prompt_manifest` and `model_manifest` are stored as **empty JSON objects**, because no prompt and no model exist at M1. That emptiness is recorded in `PROGRESS.md` and must not later be read as "no prompt was used but one could have been" — it means the fields were genuinely inapplicable.
- No queue, no outbox, no module runs, no scheduler. Those remain M3.

`EvidenceItem.created_by_run_id` and `Claim.created_by_run_id` are consequently NOT NULL as `docs/canonical/11` specifies, with no lineage gap. **No ADR is required** — nothing deviates from a canonical specification.

---

## D-010 — RESOLVED (2026-09-19)

**Resolution: Option B — widen the unit enum. PESEL-derived `CURRENT_POPULATION` responses carry `SURNAME_OCCURRENCES`, not `"PEOPLE"`.**

Decided by the project owner, 2026-09-19. Recorded in full, with the rejected alternatives and the conditions for revisiting, in **`docs/adr/0004-population-value-unit.md`**.

This **deviates from `docs/canonical/16` §26**, which fixes the unit as a single-member literal `"PEOPLE"`. The deviation exists because the publisher describes *"liczba wystąpień"* — occurrences — and never states that one occurrence is one living person (TASK-004 §14 **U-4**, still open). Since `ARCHITECTURE.md` §6 forbids the frontend from deriving facts, the unit is fixed at the contract boundary, so a response built literally to §26 would publish an assertion the truth layer beneath it is forbidden to make.

`"PEOPLE"` remains in the enum, unused. It is what PESEL switches to if U-4 is answered affirmatively — a change of emitted value, not of schema. The contract schema must carry a comment pointing at ADR-0004.

`tasks/006-surname-result-read-api.md` is unblocked by this. **D-007 remains open** and the publisher enquiry is still worth sending: it is the route to answering U-4, and to opening the paid surface.

---

## D-011 — RESOLVED (TASK-009 implementation, 2026-09-19)

**Resolution: Option A — create `evidence_dependencies` now.** The derived-statistic lineage that `docs/canonical/14` §30 specifies is implemented as specified.

Decided by the project owner, 2026-09-19. Concretely:

- Migration `0005_current_rank` creates `evidence_dependencies` per `docs/canonical/11` §9.6, as a link from a derived `EvidenceItem` to each upstream `EvidenceItem` it depends on.
- The link carries a **role**, `evidence_dependency_role`, so the two inputs `docs/canonical/14` §30 names are distinguishable in the data rather than merely both present: `COUNT` for the subject surname's own value and `UNIVERSE` for the evidence establishing the ranked set. That distinction is the whole reason `ClaimEvidence` alone was insufficient. The enum is staged like the others in `0002` and `0004`: further roles arrive by `ALTER TYPE … ADD VALUE` when a later derived claim needs them (`DENOMINATOR` is the obvious next one, for `RARITY_CONTEXT`).
- `claim_type` gains `CURRENT_RANK` by `ALTER TYPE … ADD VALUE`, the pattern migration `0004`'s own header named.

**No ADR is required**, because nothing deviates from a canonical specification: this implements `docs/canonical/11` §9.6 and `docs/canonical/14` §30 as written. §9.6's "This can be P1 if `ClaimEvidence` links are sufficient for the first vertical slice" was a conditional deferral, and the condition expired when a claim with two differently-roled inputs arrived.

**Verified while implementing, and worth recording:** PostgreSQL 16 permits `ALTER TYPE … ADD VALUE` inside a transaction alongside a `CREATE TABLE` referencing that type, but **using** the new value in the same transaction fails with `unsafe use of new value`. Migrations run in a transaction, so a future migration must never add an enum value and insert a row carrying it in one step. Tested directly rather than assumed.

Option B (link both inputs through `ClaimEvidence` and record an ADR) and Option C (one opaque composite evidence item) were rejected. Option C would have made "why do we believe this rank?" unanswerable by traversal.

---

## D-014 — RESOLVED (TASK-010, 2026-09-20)

**Resolution: Option C — a mixed-script row in an authoritative register creates its own identity, with the finding persisted.** Decided by the project owner, 2026-09-20. Implemented as `tasks/010-mixed-script-rows-in-bulk-ingestion.md`; what was run is in `PROGRESS.md`.

**No ADR**, because nothing deviates from canon: `docs/canonical/13` §10.4 says of Latin + Cyrillic lookalikes *"review/security flag. Do not reject automatically; historical/OCR text can genuinely contain mixed scripts."* What rejected was TASK-004's implementer choice U-5(a), now narrowed for this one finding and no other.

Concretely:

- `resolveSurname(db, input, { mixedScript: "RESOLVE_FLAGGED" })` lets a `MIXED_SCRIPT_REVIEW` input reach the T0/T1 lookup on its exact key; the resolution carries the real match status **and** the finding. The default is unchanged — the query path still returns `REVIEW_REQUIRED` and never touches the database for such input.
- Migration `0007_script_flags` adds `surnames.mixed_script` and `surnames.script_confusable_flag` (`CHECK (NOT script_confusable_flag OR mixed_script)`), written exactly as detected. Default `false` is a fact for every existing row: the importer refused mixed-script rows until now.
- The importer resolves with `RESOLVE_FLAGGED`, creates a flagged row's identity with the flags, reports it under `mixedScriptRows` (line and verbatim surname), and still aborts the run on `MULTIPLE_EXACT` or any other finding. Nothing is mapped, folded or merged; `HODŽIЌ` is stored as `HODŽIЌ`, key `hodžiќ`.

Options A (quarantine and import the rest — leaves the universe permanently incomplete, so the rank still refuses) and B (per-row human adjudication — the more principled answer, needing a mechanism that does not exist) were not chosen; the original record below explains each.

---

## D-014 (original record) — two official rows mix Latin and Cyrillic letters, so the female resource cannot be imported

**Status:** RESOLVED above. Kept verbatim because the code-point evidence and the option analysis are the record.
**Owner:** project owner, on a resolver-policy question with a source-data cause.

Found 2026-09-20 by running the full import after D-013 was resolved. The male resource imported cleanly — 408,182 of 408,182 rows, zero quarantined. The female import **failed and wrote nothing**, which is TASK-004 U-5 option (a) working as specified:

```text
[import] FAILED (UNRESOLVED_ROWS): 2 row(s) could not be resolved unambiguously
[import]   line 338202: HODŽIЌ — REVIEW_REQUIRED
[import]   line 420083: ЌATOVIЌ — REVIEW_REQUIRED
```

### What the two rows actually contain

Read from the official bytes, code point by code point:

| Line | Value | Code points | `Liczba` |
|---|---|---|---:|
| 338,202 | `HODŽIЌ` | `H O D` + U+017D LATIN CAPITAL Z WITH CARON + `I` + **U+040C CYRILLIC CAPITAL LETTER KJE** | 2 |
| 420,083 | `ЌATOVIЌ` | **U+040C** + `A T O V I` + **U+040C** | 2 |

Both sit at `Liczba = 2`, the publisher's minimum publishable value. Both are single-script-violating by one letter: every other character is Latin. U+040C is visually close to a Latin `K` with an acute, so the likely story is a data-entry homoglyph for a South Slavic surname (`HODŽIĆ`, `KATOVIĆ` would be the ordinary spellings) — **plausible, and not verified.** Nothing here should be treated as established beyond the code points above.

`detectScripts` sees Latin and Cyrillic in one token, `validateSurnameInput` returns `MIXED_SCRIPT_REVIEW`, the resolver reports `REVIEW_REQUIRED`, and U-5 aborts the whole resource rather than guessing. Every layer behaved exactly as designed; the designs simply do not yet say what to do with an authoritative register that contains such a row.

### Why it cannot be fixed silently

`docs/canonical/13` §5.6 is explicit: a mixed Latin/Cyrillic string should `flag MIXED_SCRIPT_REVIEW` "rather than silently normalize one script into the other", and confusable-skeleton equality is never surname identity evidence. So mapping U+040C to `K`, to `Ć`, or to anything else is out. `ARCHITECTURE.md` §10 invariant 8 points the same way: orthography is identity-bearing.

### Options

**Option A — quarantine `MIXED_SCRIPT_REVIEW` rows, import the rest, count them in the report.** Narrows U-5 from "any unresolved row aborts" to "a mixed-script row is quarantined and counted; anything else still aborts". Cheapest, and the reconciliation report already makes the shortfall visible. **But it does not unblock the female rank**, and that matters: the completeness gate compares persisted rows against `official_row_count`, so 420,080 of 420,082 is an incomplete universe and `CURRENT_RANK` would still refuse — correctly. It also means two real surnames are absent from the product, and absence must never be read as zero.

**Option B — adjudicate the two rows as data.** Record an explicit review decision per row: accept each as its own `Surname` with its bytes verbatim, flagged as reviewed, or attach it as a `NameForm` of an existing Latin-script surname with an explicit, eligible association. Keeps the import complete — 420,082 persisted, gate satisfied, female ranks unblocked — and is what the canonical review model anticipates. Cost: it needs a mechanism that does not exist yet (a stored, auditable adjudication), and a human decision per row, repeated at every annual refresh.

**Option C — let a mixed-script row resolve and create its own identity, flagged for review.** The resolver would stop refusing and instead create the surname with its exact code points, recording the mixed-script finding on the row. Nothing is normalised and nothing is merged, so §5.6's prohibition is respected in substance — §5.6 is about not *fusing* scripts, and the flag exists for query-time security, not for refusing the publisher's own register. Keeps the import complete and needs no per-row human step. Cost: the review flag becomes a thing the product must surface and act on rather than a gate, and a genuinely confusable pair could enter the corpus as two near-identical identities.

### Recommendation

**Option C for bulk ingestion of an authoritative register, with the flag persisted** — the publisher's row is evidence of what the register says, and refusing it loses data while resolving nothing. Option B is the more principled answer and the better one if the adjudication mechanism is wanted anyway; Option A is not sufficient on its own, because it leaves the female universe permanently incomplete. Whichever is chosen, the mixed-script *finding* must be stored, never discarded.

### Do not

- Do not map U+040C to any Latin letter, and do not use confusable skeletons as identity (§5.6).
- Do not merge either row into an existing surname without an explicit, recorded decision.
- Do not silence `MIXED_SCRIPT_REVIEW` generally to get the import through: the same policy protects the query path, where it is doing real work.
- Do not widen the completeness gate to accept a short universe. A rank over 420,080 of 420,082 rows would be a claim about a set nobody holds.

### What is blocked until this is answered

- The female national resource `1148811` cannot be imported, so female `CURRENT_POPULATION` and `CURRENT_RANK` exist only over the 23-row fixture.
- Any surface needing both sexes. The male side is complete and unaffected.

---

## D-013 — RESOLVED (ADR-0005, 2026-09-20)

**Resolution: Option A — the canonical identity key folds with Unicode *simple* case folding, as `canonical_key_v2`.** Decided by the project owner, 2026-09-20. Full detail, including the measurement, what it deviates from and what it now owes elsewhere: `docs/adr/0005-canonical-key-simple-case-folding.md`.

Concretely:

- `canonicalKey` applies simple case folding **per code point** instead of full folding, so `ẞ` folds to `ß` rather than to `ss` and the sharp-s surnames keep separate identities. Only the case step changed; every key containing no code point the two folds treat differently is byte-identical to its v1 form.
- Per code point removes the *context* sensitivity of `toLowerCase` (Greek `Σ` becoming final `ς` at the end of a word), and a table of **22 letterform variants** — final sigma, long s, the Greek symbol letters, nine Cyrillic historic forms, `ẛ`, the micro sign, ypogegrammeni — does the rest: without it a surname written in ordinary Greek case would not match the same surname in capitals. `toLowerCase`'s one expanding case, U+0130, is discarded so the fold stays 1:1, which is also what Unicode does with it.
- `CANONICAL_KEY_VERSION` / `NORMALIZATION_VERSION` are `canonical_key_v2`; `RESOLUTION_METHOD_VERSION` is `exact_resolver_v2`. Normalisation is part of the resolution method, so a resolution stored under v1 must not claim replayability under v2's rules. `canonical_key_v1` was not changed in place, and `fullCaseFold` stays exported: it is what produced the v1 keys the migration rewrites, and the regression test uses it to show the defect was real.
- **Migration `0006_canonical_key_v2`** re-keys `surnames.canonical_key` and `name_forms.search_key` from the stored display text and stamps both version columns. It carries a frozen copy of the pipeline rather than importing the resolver, because a migration must mean the same thing when replayed after a v3 exists; `migrator.test.ts` pins that the copy agrees with the live function today. It recomputes rather than pattern-matching, because a v1 key cannot be inverted — `gross` could have come from `GROSS` or from `GROẞ`.
- The migration computes and collision-checks every new key before writing one row, and aborts naming both display forms if two collide. `down()` recomputes v1 keys and therefore refuses on any database holding a sharp-s pair — v1 cannot represent that data, and merging two real surnames is what invariant 8 forbids.

**Measured with the real `canonicalKey` export over both full official resources:** `canonical_key_v2` produces 408,182 and 420,082 distinct keys — **zero collisions**, one key per source surname, across all 828,264 real surnames. Under v1 there were 171, every one the sharp S. Proven exhaustively rather than by example: `normalize.property.test.ts` re-derives Unicode's simple-fold relation from the runtime over every code point and asserts the fold neither joins what Unicode separates nor separates what it joins.

**What this unblocked, verified by running on 2026-09-20:** the male national resource `1148808` imported in full — 408,182 of 408,182 rows, zero quarantined — and `CURRENT_RANK`'s passing path now produces real claims over it (`NOWAK` rank 1 of 408,182; `GROẞ` and `GROSS` ranking separately). The female resource `1148811` is blocked on a different cause, **D-014**. `RARITY_CONTEXT` still waits on U-6's denominator. `PROGRESS.md` records the runs.

**One consequence that is now owed elsewhere:** `ß`≡`ss` is a real retrieval expectation for a user typing `GROSS`, and it is deliberately absent from the exact tier. Whichever task builds the fuzzy tiers owes German orthographic equivalence as an explicit versioned rule, the way §6.1 handles Polish diacritics.

Options B (adjudicate the 171 collisions by hand) and C (a suffix-disambiguated key) were rejected; ADR-0005 records why.

---

## D-012 — RESOLVED (2026-09-20)

**Resolution: Option C — keep `--webpack`, revisit on a defined trigger.** Decided by the project owner, 2026-09-20, as recommended.

Nothing is built, changed or removed. `--webpack` stays an explicit, supported Next flag, the packages keep exporting raw TypeScript with `.js` specifiers, and the emitted worker output stays runnable by plain Node. **No ADR** is required: nothing deviates from a canonical specification, and `docs/canonical/23` §7 already leaves the build orchestrator optional.

Option B stays rejected on its merits rather than on cost: it is the cheapest to type and the only one that invalidates a property that currently holds. Option A is the agreed destination once any trigger below fires, and is a task at that point, not a refactor slipped into another change.

**Revisit when any of these becomes true** — unchanged from the record below: Turbopack gains extension aliasing; a workspace package needs publishing or consuming outside the monorepo; dev-loop speed becomes a real complaint rather than a theoretical one; or a second app starts consuming the packages.

---

## D-012 (original record) — the workspace-package build baseline: keep `--webpack`, compile to `dist`, or drop the `.js` extensions?

**Status:** RESOLVED above. Kept verbatim because the findings were established by running.
**Owner:** project owner, on a repository-convention question.

Recorded 2026-09-19. The project owner's original framing called this "workspace package build compatibility"; no task ever existed for it.

### The situation

Every workspace package exports raw TypeScript — `exports: {".": "./src/index.ts"}` — and its internal imports carry explicit `.js` extensions. `apps/web` therefore pins `next dev --webpack` and `next build --webpack`, with `next.config.ts` supplying `resolve.extensionAlias` so the bundler applies TypeScript's rule that a `.js` specifier may be satisfied by a `.ts` file.

### What this session established by running, not by reading

1. **Turbopack genuinely cannot resolve these specifiers.** `next build --turbopack` fails with `module-not-found` across `packages/truth/src/index.ts` and `packages/db/src/index.ts`. TASK-006's note is accurate, not stale.
2. **There is no Turbopack configuration that fixes it.** Next 16.3.5 offers `turbopack.resolveAlias` and `turbopack.resolveExtensions`. The first maps bare module specifiers, not relative paths; the second supplies extensions for *extensionless* imports. An explicit `./derive.js` request is neither case.
3. **A bare `next build` now fails with a guard**, not a resolution error: Next 16 refuses to build when a `webpack` config is present and no `turbopack` config is, and suggests passing a flag explicitly or setting `turbopack: {}`. The repo's scripts pass `--webpack`, so the normal path is unaffected, but anyone running `next dev` bare gets a confusing error.
4. **The stated reason for the `.js` extensions does not hold.** `next.config.ts` calls them "the NodeNext convention the rest of the repo uses so `tsx`, Node and vitest can run them directly". `tsconfig.base.json` sets **`moduleResolution: "Bundler"`**, under which TypeScript does not require explicit extensions at all. The comment has been corrected to state this; the convention may still be *wanted*, but not for the reason recorded.
5. **Blast radius of changing the convention: 138 import statements across 50 files**, in all seven packages and all three apps.
6. **Nothing runs the emitted worker output.** `apps/worker` has `build: tsc -p tsconfig.json` and `start: tsx src/index.ts`, so `dist/` is produced and never executed. It matters anyway — see Option B's cost.

### Options

**Option A — compile the packages to `dist`.** Each package gains a build script and points `exports` at `./dist/index.js` with `types` at `./dist/index.d.ts`, ideally with a `development` export condition still pointing at `src` so the test and `tsx` loops keep working against source. Fixes Turbopack, keeps the emitted output runnable by plain Node, and is the prerequisite if a package is ever published. Costs: a topological build step before any app build (pnpm's `-r run` already orders topologically, so no orchestrator is needed — `docs/canonical/23` §7 keeps Turborepo optional); and real care so tests and CLIs do not silently run against a stale `dist`. This is what TASK-006 called "the cleaner long-term fix".

**Option B — drop the `.js` extensions and let Turbopack resolve extensionless imports.** Cheapest to execute: 138 mechanical edits, fully verifiable by the existing 193 unit and 113 integration tests. Legal under `moduleResolution: Bundler`. **Cost, and it is a real one:** the emitted JavaScript would then carry extensionless relative imports, which plain Node cannot resolve under `type: module`. Today `apps/worker`'s `dist` is Node-runnable; after this it would not be, so `pnpm build` would produce output that cannot run. That trades a portability property away for bundler convenience.

**Option C — keep `--webpack`, and revisit on a defined trigger.** Nothing is broken. `--webpack` is a supported, explicit Next flag. Costs: the dev loop forgoes Turbopack's speed, and the bare-command guard in finding 3 is a papercut.

### Recommendation

**Option C for now, Option A when a trigger fires.** Nothing is broken, both alternatives give something real away, and M2 still has product capability pending — `AGENTS.md` §6's "no unrelated refactors" and "smallest complete version" both point at leaving a working build alone. Option B is explicitly **not** recommended: it is the cheapest to type and the only one that makes a currently-valid property invalid.

Revisit when any of these becomes true:

- Turbopack gains extension aliasing, which reduces this to deleting the `webpack` block;
- a workspace package needs to be published or consumed outside the monorepo, which requires Option A regardless;
- the dev-loop speed becomes a real complaint rather than a theoretical one;
- a second app starts consuming the packages, which doubles the cost of the workaround.

### Do not

- Do not adopt Option B on the grounds that it is the smallest diff.
- Do not add `turbopack: {}` to silence the guard in finding 3: that makes Turbopack the default builder, and finding 1 shows the build then fails.
- Do not remove the `webpack` block or the `--webpack` flags while the packages export raw TypeScript.

---

## D-018 — RESOLVED (2026-09-20)

**Resolution:** option (a), supersede — decided by **authority, not recency**. When more than one `SourceRecord` exists for one publisher resource id, the record whose `content_hash` matches the registry's `official_sha256` is the one that counts; claims derived from the others are marked `SUPERSEDED`. Implemented in `packages/truth/src/derive.ts` (`authoritativeSnapshots`, `supersede`), covered by `tests/integration/src/claim-supersession.test.ts`.

Choosing on authority rather than import order matters: re-importing an older or truncated copy of a resource cannot displace the real one, and the rule works retroactively on data already imported rather than depending on what the importer knew at the time.

**When no record for a resource is complete, they all stay active.** A partial import is then the only thing that exists, `CURRENT_POPULATION` has no universe requirement, and a count from it is honest about its own scope — which is the state the committed fixtures are in, and why the refusal tests still work.

Nothing is deleted. `docs/canonical/11` keeps claim history, so a superseded claim remains readable.

### Observed

Before: `NOWAK` returned four population observations and the result page rendered its count twice per partition. After: two active claims, two superseded, two observations, and the page shows each count once.

### Still open, deliberately

The rule runs at derivation. `source_records.supersedes_source_record_id` exists and is **not** set by the importer, so the lineage between two imports of one resource is not recorded at import time — only the consequence is. Wiring that is an importer-side follow-up, not a correctness gap: the authority rule does not need it.

### Do not

- Do not deduplicate in a presentation layer. Which claim is true is not a rendering question.
- Do not switch the rule to recency. A re-imported truncated file must not win.
- Do not add a unique constraint on `(source_id, external_record_id)` — ADR-0003 chose per-fetch granularity deliberately.

---

## D-015 — RESOLVED (2026-09-20)

**Resolution:** the low-coverage threshold for a published distribution is **0.50**, confirmed by the project owner. A distribution built on fewer than half of a surname's bearers is not a distribution of that surname.

The value lives in one place, `DISTRIBUTION_LOW_COVERAGE_THRESHOLD` (`packages/truth/src/version.ts`), and every claim stores the threshold it was judged against as `low_coverage_threshold`, so a stored claim states its own basis and a later change is visible rather than retroactive. Changing it means changing the constant and re-deriving; nothing else moves.

Observed effect over 310 derived claims: 276 `READY`, 34 `LOW_COVERAGE`, 0 `COVERAGE_UNKNOWN`. `NOWAK` (0.884 male, 0.896 female) is `READY`; `MELNYK` (0.033 both) is `LOW_COVERAGE`, which is the case the state exists for — 210 placed bearers of 6,442 registered must never be rendered as where the surname is found.

Three rules stand and are not revisitable by moving the number:

- low coverage never lowers confidence, because the counts are exactly what the source says and only the scope differs (`ARCHITECTURE.md` §10 invariant 2);
- `COVERAGE_UNKNOWN` is presented exactly as `LOW_COVERAGE`, because not knowing what share of the bearers a set of cells represents is not a licence to present it as the whole;
- a regional count is never divided by a national count in any field under any name.

---

## D-016 — RESOLVED (ADR-0006, 2026-09-20)

**Resolution:** GIN (`gin_trgm_ops`) on `surnames.canonical_key`, retrieved with a length-dependent similarity threshold. Full record and measurements: `docs/adr/0006-trigram-index-gin.md`; implemented by `packages/db/migrations/0012_surname_trigram_index.ts`.

Measured on the real 598,476-surname table: GIN is 18 MB against GiST's 43 MB, builds in 1.9 s against 6.4 s, and answers a top-25 query in 4.9 ms against 160 ms. GiST's distinguishing capability — unthresholded nearest neighbours via `<->` — is the thing this feature must not use, because a short or unlike input's nearest neighbours are an alphabet walk of real surnames and returning nothing is the correct answer.

The cost is that ranking cannot be done by the database. That cost is zero: TASK-015 measured trigram order putting the intended surname first in 53 of 100 cases where the resolver's rerank got 80, so ordering by trigram distance would have been ordering by the wrong thing.

Do not revisit on the strength of `docs/canonical/13` §23.1's wording alone — ADR-0006 exists to answer it. Revisit by rebuilding both indexes on the then-current register and re-running the three figures, or if a path appears that genuinely needs unthresholded top-K on the interactive surface.

---

## D-017 — RESOLVED (TASK-015 implementation, 2026-09-20)

**Resolution:** option (a). Fuzzy suggestions are offered only at and above **six characters**; a shorter input returns `INPUT_TOO_SHORT` with an empty candidate list and a message saying why. The value lives in `MIN_FUZZY_INPUT_LENGTH` (`packages/resolver/src/candidates.ts`) with its measurement; full figures in `PROGRESS.md`.

Measured on the real register over 94 single-edit cases on four-to-five-character surnames: the best any threshold achieved was 30 first-place hits, with the shortlist saturated at the cap for every query and **0 of 25 transpositions recovered at any threshold**. `NOWK` retrieves `NOWS`, `NOWY`, `NOWE` and `NOWA`, all real surnames, all at similarity 0.429. None of that is a correction worth showing, and option (c) — lowering the threshold and accepting the noise — was ruled out for that reason.

Option (b), a second retrieval path for short inputs such as a bounded Levenshtein scan or a deletion-neighbourhood key, remains available as **its own task** if the owner wants it. It needs its own measurement before anyone may claim it works; nothing is blocked while it does not exist.

At six characters and above the feature does work: roughly four in five single-edit typos come back first, and the exact figures per length band are recorded rather than summarised.

---

## Reviewed and not blocking TASK-001

Recorded so they are not re-raised:

- **Deployment host / blueprint details** — `docs/canonical/23` §6 recommends a single EU hosting plane. TASK-001 only needs CI and a local database; no hosting account is required to complete it.
- **Contract generator and OpenAPI version** — contract *semantics* are canonical (`docs/canonical/16` §1.3); generator choice is implementation detail, decided when contracts are actually built at M2.
- **Build orchestrator (Turborepo or equivalent)** — explicitly optional (`docs/canonical/23` §7). Not needed at TASK-001.
- **Analytics tooling** — decided in `docs/canonical/18`; not implemented before M2 and consent-gated when it is.
- **Payment provider** — decided in `docs/canonical/20`; irrelevant until M6 and deliberately blocked until premium inventory is proven.
