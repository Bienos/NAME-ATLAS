# 2026-10-04 — review of the privacy notice and the terms (PL + EN)

Not a legal opinion. The legal review D-031 and `docs/canonical/19` §11 require is still open; nothing here closes it.

Variants reviewed: base (accounts off), + accounts, + accounts + tree, + accounts + Google (`legalDocument()` in `apps/web/src/lib/legal-text.ts:347-359`).
Checklist: `docs/canonical/19` §2.1–2.6; GDPR art. 13, 14, 20, 21, 77; UŚUDE art. 8 ust. 3; PT art. 399.

## Phase 1 — findings

Classes: FACT (text vs code), REQUIRED-GAP (law requires it, fact known), JUDGEMENT (owner/lawyer decides → `docs/DECISIONS_NEEDED.md`), WORDING.
"PL+EN" means the same defect in both languages.

| ID | Doc | Lang | Variant | Current text | Problem | Evidence | Class | Proposed fix |
|---|---|---|---|---|---|---|---|---|
| F-01 | privacy | PL+EN | base | "przetwarzamy Twój adres, imię (jeśli je podasz) i treść wiadomości" | The contact form also sends a topic and the page language. | `apps/web/src/lib/contact-routes.ts:63-77,91-97` | FACT | List "temat" / "topic" and the page language. |
| F-02 | privacy | PL+EN | base | "Jeśli napiszesz do nas e-mail…" | The "report a problem" link pre-fills the page address and the surname(s) into your email. The notice does not say so. | `apps/web/src/lib/report-link.tsx:20-32`; `compare-view.tsx:304-308` | FACT | One sentence: the link pre-fills the page address and surname, and you send it yourself. |
| F-03 | privacy | PL+EN | accounts | "jeden plik cookie z identyfikatorem sesji (HttpOnly, Secure, SameSite=Lax)… Znika po wylogowaniu." | No name or lifetime is given. The cookie is `__Host-na_session` with Max-Age of 400 days. It is valid only while the server session lives (30 days, renewable), and it is cleared on sign-out. | `apps/web/src/lib/session-cookie.ts:17,21-32`; `packages/accounts/src/service.ts:38,662-668,682-685` | FACT | Name the cookie. Say the browser keeps it up to 400 days but it stops working when the 30-day session ends, and it is removed on sign-out. |
| F-04 | privacy | PL+EN | accounts | "Skróty nieudanych logowań kasujemy po godzinie." | The records stop counting after 1 h. They are deleted at the next failed sign-in or at the daily purge, so at most about 25 h later. A successful sign-in deletes them at once. | `packages/accounts/src/service.ts:392-395,403,821-824`; `vercel.json` cron `17 3 * * *` | FACT | "po godzinie przestają się liczyć; kasujemy je najpóźniej w ciągu doby" |
| F-05 | privacy | PL+EN | accounts | the list of stored account data | Omitted: when the address was confirmed and when the account last changed; for each session, when it was created, last used and expires; for each link, its purpose (confirmation, password reset, terms step) and its times. | `packages/db/migrations/0027…:42-115`; `0032…:170` | FACT | Add these to the list. |
| F-06 | privacy | PL+EN | accounts | (none) | No retention is stated for sessions or links. The daily purge deletes expired sessions, and deletes links 7 days after they expire. | `packages/accounts/src/service.ts:806-824` | REQUIRED-GAP (art. 13(2)(a)) | Add both periods. |
| F-07 | privacy | PL+EN | accounts | "Własne dzienniki serwisu nie zawierają adresu IP ani wyszukiwanego nazwiska." (base) | True, but with accounts on, the server log records the account id (on creation and deletion) and the tree id. These logs are kept by Vercel. | `apps/web/src/lib/account-routes.ts:200,221,292`; `tree-routes.ts:268`; `packages/logging/src/logger.ts:65` | FACT | Accounts variant: the logs carry the account and tree id, never the address or the content. |
| F-08 | privacy | PL+EN | accounts, tree | Resend item: "wysyłanie wiadomości z linkiem do konta…" | Resend also sends the password-reset mail and the tree invitation mail. The invitation goes to a third person's address and names the tree owner by their account address. | `packages/accounts/src/mail-text.ts:62-111`; `apps/web/src/lib/tree-mail.ts:33-91`; `tree-routes.ts:401`; `packages/accounts/src/mailer.ts:32` | FACT | Accounts: "links to open the account and to reset the password". Tree: add the invitations. |
| F-09 | privacy | PL+EN | tree | "przechowujemy… imiona, nazwisko, nazwisko rodowe, rok i miejsce urodzenia…, rok zgonu, oznaczenie, czy osoba żyje, Twoje uwagi… powiązania rodzic–dziecko" | Omitted: the "approximate year" marks; the place of death (TERYT code and name); the parent's role (mother, father, parent); who added the person; the claim (who confirmed the card, and when); the "no contact" mark; the hidden fields; invitations (address hash, sender, times, answer); the suppression list. The status is a choice of three (living, deceased, unknown), not yes/no. | `packages/db/migrations/0028…:48-49,75-154`; `0033…:43-51,68-102` | FACT | Complete the list. |
| F-10 | privacy | PL+EN | tree | "zapis, kto i kiedy coś zmienił (bez treści zmiany)" | The record also holds the kind of action and which person it concerns. | `0028…:52-58,147-154`; `0033…:62-65` | FACT | "…who, when, what kind of change and which person (without the content)" |
| F-11 | terms + privacy | PL+EN | tree | "Osobę bez roku zgonu traktujemy jako żyjącą." / "osoby żyjące i te bez roku zgonu" | Wrong rule. A person can be marked deceased without a year. Everyone not marked deceased (living or unknown) is treated as living. A year of death on its own marks the person deceased. | `packages/family/src/rules.ts:20-21,129-130`; `0028…:89,102` | FACT | "Osobę, której nie oznaczysz jako zmarłej, traktujemy jako żyjącą; rok zgonu oznacza ją jako zmarłą." |
| F-12 | terms + privacy | PL+EN | tree | "nie udostępniamy ich osobom, które zaprosisz do drzewa, dopóki sam tego nie włączysz" / "osoby, które do niego zaprosisz, widzą osoby zmarłe" | No page or route lets an owner add a member. `addMember` exists in the service, but nothing in `apps/web` calls it. The text describes a feature the site does not offer. | `packages/family/src/service.ts:799-835` (comment: "the invitation flow … is not here"); no caller in `apps/web/src` | FACT | Drop the member sentences. Say the tree is seen by you alone (plus a person who confirmed their card, who sees and corrects that card). The member rule returns when member invitations ship. |
| F-13 | privacy | PL+EN | tree | "przechowujemy jedynie jego skrót w ramach tego drzewa, żeby nie zaprosić tego adresu ponownie, gdy osoba odpowie…" | The hash is kept on every invitation (pending and answered), not only after a refusal. A "not me" or "no contact" answer, or a claimant leaving, also puts it on the tree's suppression list. The link lasts 14 days. The mail names the owner by their account address. Nobody whose birth year makes them under 18 can be invited. | `0033…:68-102,214-215,256-290`; `apps/web/src/lib/tree-mail.ts:61-68`; `packages/family/src/rules.ts:199-204,237-240` | FACT | Rewrite the paragraph with these facts. |
| F-14 | privacy | PL+EN | tree | "Drzewo przechowujemy tak długo, jak istnieje konto." | Not stated: the change record, invitations and suppressions last as long as the tree. When someone else's account is deleted, their id is removed from those records, but the records stay in the tree. | `0028…:149-150,294-304`; `0033…:43,74,79` | REQUIRED-GAP (art. 13(2)(a)) | Add one sentence. |
| F-15 | privacy | PL+EN | accounts + tree | Oracle item: "trzyma też dane konta (wyżej)" | The server also holds the family trees. | `0028…` (schema `family` on the same database) | FACT | Tree variant: "dane konta i drzew". |
| F-16 | privacy | PL+EN | tree | "W każdej chwili możesz je pobrać." | Export is a JSON file. | `apps/web/src/lib/tree-export.ts:49-50` | WORDING | "(plik JSON)" |
| G-01 | privacy | PL+EN | base, accounts | "Masz prawo dostępu…, sprostowania, usunięcia i ograniczenia… oraz prawo sprzeciwu" | The right to data portability is missing. It applies where the basis is art. 6(1)(b): the waiting list, enquiries, the account, the tree. | GDPR art. 13(2)(b), 20 | REQUIRED-GAP | Add portability for data given under art. 6(1)(b). (No processing relies on consent today, so withdrawal of consent is not applicable yet.) |
| G-02 | privacy | PL+EN | all | (none) | No statement on whether providing data is required. Known facts: reading needs nothing; a reply needs an address; an account needs an address (and a password unless Google is used). | GDPR art. 13(2)(e) | REQUIRED-GAP | One paragraph. |
| G-03 | privacy | PL | base | "Możesz wnieść skargę do Prezesa UODO…" | The EN text adds "or to the authority where you live"; the PL text does not. | GDPR art. 77(1); `legal-text.ts:133` vs `:203` | REQUIRED-GAP (PL/EN parity) | Add it to PL. |
| G-04 | terms | PL+EN | base | "Nie wolno zakłócać działania serwisu…" | No ban on supplying unlawful content. The contact form and the tree both take user content. | UŚUDE art. 8 ust. 3 pkt 2 lit. b | REQUIRED-GAP | Add "Nie wolno przesyłać treści o charakterze bezprawnym." |
| J-01 | privacy | PL+EN | base | "tak długo, jak to potrzebne do załatwienia sprawy" | No retention period is set for emails, contact-form messages (the Gmail mailbox and Resend's logs), enquiries or well-known bearers. | GDPR art. 13(2)(a) | JUDGEMENT → D-035 | — |
| J-02 | privacy + terms | PL+EN | tree | "przechowujemy je na Twoje zlecenie w ramach tej samej umowy" | Art. 6(1)(b) covers the account holder, not the relatives they enter. Open: the basis for the controller's processing of third parties' data, and how art. 14 information reaches them. | GDPR art. 6, 14(5); D-031 | JUDGEMENT → D-036 | — |
| J-03 | privacy | PL+EN | base | "bez plików cookie" | Whether the Vercel Analytics script (no cookie, no storage, but it sends from the device) falls under PT art. 399 consent. `canonical/19` §2.4 says counsel is required. | PT art. 399; `site-analytics.tsx:13-19` | JUDGEMENT → D-037 | — |
| J-04 | privacy | PL+EN | base, Google | "Google — skrzynka pocztowa…"; "Google działa jako osobny administrator"; "Oracle — serwer…" | Open: the role and legal entity for Gmail (a consumer mailbox), the Google sign-in role, Oracle's contracting entity and DPA, and whether the Vercel and Resend DPAs are accepted. None of this is in the repo. | GDPR art. 13(1)(e)-(f), 28 | JUDGEMENT → D-038 | — |
| J-05 | privacy | — | tree | "przechowujemy jedynie jego skrót" | The hash is unsalted `sha256("accounts:email:"+address)`, the same key the accounts use. It can be linked across trees and to accounts. Whether that is acceptable pseudonymisation needs a decision; changing it is a code task. | `packages/accounts/src/tokens.ts:32-33`; `tree-routes.ts:394` | JUDGEMENT → D-039 | — |
| J-06 | terms | PL+EN | base | "reklamacje… prosimy zgłaszać na adres…" | No deadline for answering a complaint (reklamacja) and no description of what to include. | UŚUDE art. 8 ust. 3 pkt 4; UPK art. 7a | JUDGEMENT → D-040 | — |
| J-07 | terms | PL+EN | base, accounts | "Zmiany regulaminu publikujemy na tej stronie z nową datą." / "Możemy zamknąć konto…" | Open: how and how early account holders are told of changes (today the code asks for re-acceptance only at the tree's consent step); how the contract is formed and ended without an account; notice before we close an account. | UŚUDE art. 8 ust. 3 pkt 3; KC art. 384, 385³; `service.ts:622-633`; `tree-routes.ts:121-128` | JUDGEMENT → D-041 | — |
| J-08 | privacy | — | accounts, tree | (none; `legal-accounts.ts:27-30` notes it) | Backup retention for account and tree data once TASK-049 runs in production. The tooling includes both schemas; nothing is uploaded yet. | STATUS "Backup tooling" | JUDGEMENT → D-035 | — |
| P-01 | terms | — | paid | — | The paid tiers ("Wkrótce") will need: withdrawal and its loss for digital content, conformity remedies (UPK ch. 5b), price and payment, invoicing, ODR. Not written now. | ADR-0023 §2.5; D-024 | flag only | — |

No finding: the analytics paragraph (slug, query and hash stripped, `analytics-path.ts:45-70`; no Speed Insights); no `localStorage`, `sessionStorage`, `document.cookie` or `indexedDB` anywhere, so "no cookies or similar data" holds without accounts; the only cookies are `__Host-na_session` and `__Host-na_google` (600 s, cleared on callback, `google-routes.ts:53-85,153`); the offer forms are `mailto:` only (`offer-form.tsx:57,77-79`); the rate-limit IP is held in memory for 60 s and never logged (`middleware.ts:29,46`; `request-policy.ts`); the CSP and `next/font` load nothing from third parties at runtime; Google scope `openid email` and the identities columns (`google.ts:56-66`; `0032…:184-190`); scrypt and SHA-256 claims (`password.ts`, `tokens.ts`); deletion cascades (`0027`, `0028:64`, `0032:186`); no cross-tree matching exists; D-028 (no tree expiry, no purge of `family`); the shown date is always `legalUpdated()` (`legal-page.tsx:212,223`).

Found in passing, outside this task's scope (code, not text):

1. Account deletion fails for a user who has claimed a card in someone else's tree. `family.persons.claimed_by_user_id … ON DELETE SET NULL` leaves `claimed_at` set, which violates CHECK `persons_claim_pair` (`0033…:43,47`; `packages/accounts/src/service.ts:795`). Reproduced on a scratch PostgreSQL 16 with a two-table model: "new row … violates check constraint".
2. `analytics-path.ts:32-42` does not redact the person id on the claimed-card route `/pl/konto/drzewa/karta/{personId}` (`tree-paths.ts:147-164`).

## Phase 2 — what changed

The project owner approved the table on 2026-10-04. Only the legal modules, their tests and one date assertion in `offer-page.test.ts` changed in code.

- `apps/web/src/lib/legal-text.ts` (base): F-01, F-02, G-01 (portability), G-02 (a new section, "Czy musisz podać dane" / "Whether you must give data"), G-03, G-04 (unlawful content in "Dozwolone korzystanie" / "Acceptable use").
- `apps/web/src/lib/legal-accounts.ts`: F-03, F-04, F-05, F-06, F-07 (the account id in the logs), F-08 (reset mail), and G-02 for accounts (address and password required, no password with Google). The module now also expects the base's "Czy musisz podać dane" heading and throws without it.
- `apps/web/src/lib/legal-tree.ts`: F-08 (invitations), F-09–F-16. The tree variant now also replaces the Oracle and Resend items, and throws when either is missing. The "members" sentences are gone (F-12).
- `legal-google.ts`: unchanged.
- Decisions: D-035–D-041 added to `docs/DECISIONS_NEEDED.md` (J-01–J-08); P-01 points to D-024 and ADR-0023 §2.5.

### Dates

| Constant | Before | After | Why |
|---|---|---|---|
| `LEGAL_UPDATED.privacy` | 2026-10-03 | 2026-10-04 | base notice changed (F-01, F-02, G-01–G-03) |
| `LEGAL_UPDATED.terms` | 2026-09-30 | 2026-10-04 | base terms changed (G-04) |
| `TREE_LEGAL_UPDATED` | 2026-10-03 | **2026-10-04, bumped** | the tree clause changed (F-11, F-12). Accounts that accepted an earlier version are asked again at the consent step before their next living person. No account exists in production (accounts are off), so nobody is asked today. |
| `ACCOUNTS_LEGAL_UPDATED` | 2026-10-01 | **2026-10-01, not bumped** | The accounts variant's own terms text did not change. It cannot share the tree's date: the consent check compares versions as text (`tree-routes.ts:128`), so an account opened with the tree off would then skip the tree clause. The owner chose this option on 2026-10-04. Consequence: with accounts on and the tree **off**, the terms page shows 2026-10-04 while a new account records 2026-10-01. With the tree on (production's `FAMILY_TREE_ENABLED=1`), the shown and recorded dates are both 2026-10-04. Recorded in D-041. |
| `GOOGLE_LEGAL_UPDATED` | 2026-10-04 | unchanged | the Google section did not change |

Shown dates, from `legalUpdated()`: privacy 2026-10-04 and terms 2026-10-04 in every variant.

## Verification (run on 2026-10-04, real results)

- `pnpm --filter web test`: 77 files, 823 tests passed. The first run failed one test, `offer-page.test.ts` "is matched by the privacy notice…", which pinned `LEGAL_UPDATED.terms` to 2026-09-30; after updating that assertion, all passed. The legal tests now also assert the new statements (cookie name and 400 days, the one-day deletion of failed sign-ins, the 7-day links, portability, the required-data section, the unlawful-content clause, the tree's death place, parent roles, 14 days, 18 years, JSON, and that the member sentences are gone, with the Oracle and Resend items single and naming the tree, with and without Google).
- `pnpm --filter web typecheck` (`tsc -p tsconfig.json --noEmit`): exit 0.
- `pnpm lint`: passes. The first run flagged an unused import in `legal-google.test.ts`, which was removed.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm exec prettier --check` on the changed files: clean.
- `pnpm --filter web build` with the flags off: exit 0, all four pages static (○). `next start` on :3301; Playwright with the pre-installed Chromium at 390 × 844 opened `/pl/prywatnosc`, `/en/privacy`, `/pl/regulamin`, `/en/terms`. Each returned 200 with `<time datetime="2026-10-04">` ("4 października 2026 r." / "4 October 2026") and the base headings, including the new section. `scrollWidth` was 390 = `clientWidth` (no horizontal scroll).
- The same build with accounts, tree and Google on (placeholder local values for the seven variables plus `FAMILY_TREE_ENABLED=1`; no database or mail was contacted): exit 0, and the four pages again 200 with date 2026-10-04 and no horizontal scroll at 390 px. The privacy page carries the account, tree and Google sections; the terms carry "Konto" and "Drzewo i osoby żyjące". The PL page's HTML contains `__Host-na_session`, "dane konta i drzew", "zaproszeń do potwierdzenia karty", "Google Ireland Limited" and "najpóźniej w ciągu doby".

## Not verified

- The accounts + Google combination with the tree off was checked by unit tests only, not in the browser.
- Vendor statements (Vercel's log and analytics retention, the Resend and Vercel DPF/SCC claims) were not re-read; they are unchanged from the earlier text.
- Production was not deployed or checked; this change's deployment is recorded on its merged PR.
- No lawyer has reviewed any of this. D-031 and `docs/canonical/19` §11 remain open.
- The two code bugs above (claimant account deletion; the claimed-card route in analytics) are not fixed here. Queueing them as separate tasks failed (the tool timed out); they need their own tasks.

## After the review: Google Analytics (#126) merged into this branch

TASK-109 (#126, ADR-0038) reached `main` after the review was done. It adds Google Analytics behind a consent banner and its own text in `legal-text.ts` and `legal-accounts.ts`. This branch merged it on 2026-10-04 and kept both sets of changes; `LEGAL_UPDATED.terms` stays at this review's 2026-10-04. Two of the review's statements no longer hold:

- the "no finding" line said there was no `localStorage` and only two cookies. Since #126, the consent choice is kept in `localStorage` (`google-analytics.ts:19`), and after consent Google sets `_ga` and `_ga_<id>`. #126's own text covers these; this review did not re-check that text.
- G-01 said no processing relied on consent. Google Analytics now relies on consent (art. 6(1)(a)), and #126's text states the right to withdraw it.

After the merge: `pnpm --filter web test` 78 files and 830 tests passed; `typecheck`, `pnpm lint`, `pnpm check:ids` and Prettier pass. The browser check was not repeated after the merge.
