# TASK-163 — The full report, announced on the deck's last card, in the share studio and on a page of what it holds

- **Status:** IMPLEMENTED 2026-10-07 (`docs/progress/2026-10-07-full-report-teaser.md`).
- **Requested by:** the project owner, 2026-10-07. Mockups first: "is premium report ready it should show on the last card for free with information that there is paid premium pdf showing what other information is available it should be glowing and then the next should be on the card where you have share cards and video telling about this again do mock ups". Then, on the mockups' teaser page ("Zapowiedź w aplikacji"): "can you make it go live". Asked, the owner chose "Everything in the 3 mockups", a new branch and pull request, and a merge after local checks.
- **Decision:** ADR-0037 §2, amended in this change: the full-name report is announced as "Wkrótce" before it can be bought. ADR-0026 §2.2 and ADR-0023 §2.5 still hold: no buy button, and the waiting-list email is the one way to ask.
- **Numbers:** TASK-163 (162 is on `main`, #194; #190 holds TASK-159). `pnpm check:ids` exit 0.

## In scope

1. **The deck's last card ("Podsumowanie"):** a glowing block after its figures, before its way on. It holds:
   - "Pełny raport · PDF" and "Dopisz imię. Raport opowie o imieniu i nazwisku.";
   - five lines on what the report holds, the surname in one;
   - "Zobacz próbkę →" to the page below;
   - the 28,99 zł tier's price, as the offer page states it;
   - "Wkrótce." with "Powiadom mnie", the tier's waiting-list email.

   The card's body scrolls where the block does not fit. The glow stops under reduced motion.
2. **The share studio:**
   - **A glowing block:** "Ten PDF ma jedną stronę. Pełny raport ma dziesięć rozdziałów.", a first-name field that opens the page below, a table of what the one-page PDF and the report each hold, "Zobacz próbkę raportu →", and the same "Wkrótce" with the email.
   - **The video:** a checkbox "Na końcu: zapowiedź pełnego raportu", on by default. It ends the clip on a closing plate drawn by the card route (`?layer=outro`). The plate replaces the full clip's closing summary, and the short clip takes one card fewer, so neither runs longer.
3. **The page of what the report holds:** `/pl/nazwisko/{slug}/pelny-raport?imie=` and `/en/surname/{slug}/full-report?name=`.
   - **The sample:** for a typed first name, the report's first chapter. That is the name's count and rank on each PESEL list of first names, its latest figures as a name given to children, and its origin as each admissible work states it, with numbered notes. All of it comes from claims on the FREE surface, as the baby-names page reads them. An absence is said, never 0; the lists are never summed.
   - **The rest of the page:** the ten chapters' names, the "what we don't know" example, the price, "Wkrótce" and the email.
   - **Sign-in:** with accounts on, the sample is for signed-in readers, as first-name figures are on the baby-names page. Signed out, the reader gets a sign-in that returns to the page (`safeNext`).
   - **Indexing:** `noindex`, dynamic, in no sitemap.

## Out of scope

- The PDF itself and its design (the next task).
- The six-page sample of the mockups' second page, and any checkout or buy button.
- Storing an address; the email is the reader's own.
- A fixed example name ("Z raportu dla imienia Piotr"). The studio's field opens the sample for the reader's own name instead, so no figure is fixed in the page.
- Any change to the report, its claims or its tiers.

## Acceptance

- **AC-1:** the last card shows the block in both languages. The block's only figure is the tier's price; every other figure on the deck is still one the page prints. It has the waiting-list email and no buy button or checkout.
- **AC-2:** the studio shows its block whatever the download gate. Its form sends the name to the page under `imie` / `name`.
- **AC-3:** with the checkbox on, the clip ends on the closing plate in place of the closing summary. The full clip stays within 7–20 s and the short one within 7–8 s, as without it. `?layer=outro` is drawn behind the same gate as every layer.
- **AC-4:** the page shows the sample from claims for a known name. It says so for an unknown, a held or an invalid name, or when the database cannot answer. It asks a reader without a session to sign in, and reads nothing for them.
- **AC-5:** nothing is wider than a 390 px screen.

## Verification

`.github/workflows/ci.yml`'s steps, locally. The pages are checked under `next start` against a local copy of real data, at 390 and 1440 px.
