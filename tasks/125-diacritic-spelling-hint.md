# TASK-125 — Leading a reader who typed without diacritics to the surname they most likely meant

- **Status:** IMPLEMENTED 2026-10-05 on `claude/compassionate-cerf-h2dyuj` (`docs/progress/2026-10-05-diacritic-spelling-hint.md`).
- **Requested by:** the project owner, 2026-10-05, from what production showed: a reader who types a surname without Polish letters lands on a near-empty page for a rare ASCII spelling, and nothing points to the form they almost certainly meant.
- **Specification:** `docs/canonical/13` §6.1 (the Polish diacritic fold is for retrieval, never identity); `docs/contracts/surname-result.md` (1.12 → 1.13); `docs/contracts/surname-prefix.md` (its order; the response is unchanged).
- **Depends on:** TASK-055 (rank claims read beside a surname, `other_form`), the suggest-as-you-type route (`prefix.ts`, migration 0020's trigram index on the folded key).
- **Number:** 124 is #149's (open when this began, merged as `4aa1c04` before this change's pull request); 125 was free on `main` @ `93db9a1` and in the open pull requests. No ADR, decision or migration number is taken.
- **Model guidance:** implementation session.

## 1. What production showed (2026-10-05, public API on name-atlas.pl)

- `surname-results?surname=wisniewski` → `RESOLVED`, WISNIEWSKI, 105 men and 95 women, `suggestions: null`. WIŚNIEWSKI has 53,079 men (203 women), WIŚNIEWSKA 54,177 women.
- `surname-results?surname=dabrowa` → DABROWA, 2 men and 7 women. DĄBROWA has 1,142 men and 1,211 women.
- ZMUDA TRZEBIATOWSKI has 248 men and 2 women, ŻMUDA TRZEBIATOWSKI 88 men, ŻMUDA-TRZEBIATOWSKI 224 men. Here the ASCII form is the larger. ZMUDA has 689 women (647 men), ŻMUDA 4,828 men (4,729 women).
- `surname-prefix?q=wisniew` → WISNIEWSKI, WISNIEWSKA, WIŚNIEWSKA, WIŚNIEWSKI, …: a match spelled as typed came first whatever its count (`prefix.ts`, `bool_or(… LIKE exact) desc` before `max(v.count) desc`).

Both spellings are separate, genuine register entries. The data is right; the reader is not led.

## 2. The threshold (a product choice, proposed here)

**Five times.** A surname found only through the fold goes ahead of one spelled as typed, and the surname page asks "Szukasz …?", when its larger count on one list is at least 5 × the other's larger count on one list. One constant, `OTHER_SPELLING_RATIO` in `@name-atlas/resolver`, used by both.

Why five: a reader who drops the diacritics competes with the genuine ASCII spelling only in the share of readers who type that way. So a diacritic form *r* times as common is the likelier meaning when more than 1 in *r* readers drops them. That share has not been measured. Five assumes at least one reader in five, which is plausible on phones and foreign keyboards. Ten (the request's example) would leave ZMUDA (689) before ŻMUDA (4,828, 7.0×). Ordering by count alone would also demote a spelling the reader typed *with* diacritics whenever its ASCII form is merely larger. On the counts above, five puts WIŚNIEWSKI (505×), DĄBROWA (173×) and ŻMUDA (7.0×) first. It keeps ZMUDA TRZEBIATOWSKI before ŻMUDA TRZEBIATOWSKI (0.35×). The owner may change the figure; it is one line.

## 3. In scope

1. **Suggest-as-you-type order.** `prefixSuggestions` takes up to eight matches spelled as typed and up to eight found only through the fold, each kind already most common first (one query, a window per kind). `orderPrefixMatches` (pure, exported) merges them: a folded match goes first only when `outranksTypedSpelling` says so. A surname with no count comes after every surname with one. The response and its schema (`1.0`) are unchanged.
2. **The surname result's `other_spelling` (contract 1.13).** `readOtherSpelling` in `@name-atlas/truth` reads the surnames whose folded key equals this one's. It keeps the one with the largest active `CURRENT_RANK` count, with that claim's list and date, and only when `outranksTypedSpelling` holds against this surname's own largest rank count. It is read beside the neighbours and the other form, on rarity's rights, and only when rarity is `READY`. Script-confusable, merged and inactive surnames are never given. The contract's `suggestions` stays reserved for a query that did not resolve (1.3's rule), so the field is new, required and nullable: 1.12 → 1.13, recorded in `docs/contracts/surname-result.md`.
3. **The page's line.** One line under the answer in the first screen: "Szukasz WIŚNIEWSKI? 53 079 osób (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r." / "Looking for WIŚNIEWSKI? 53,079 people (male) in the PESEL register on 20 January 2026." The name links to the search for it. Nothing about kinship, and nothing saying the reader misspelled.

## 4. Out of scope

- The deck of cards and the share cards. A search on the site opens the deck over the page (`?view=cards`), so a reader sees the line once the deck is closed. A card for it is a separate change.
- Folding spaces and hyphens: ŻMUDA-TRZEBIATOWSKI is not ZMUDA TRZEBIATOWSKI's other spelling. On the counts above it would not be shown anyway (224 < 5 × 248).
- The fuzzy suggestions (`candidates.ts`) and any change to resolution: an exact surname still resolves to itself.
- Measuring how many readers type without diacritics.

## 5. Acceptance criteria

- **AC-1.** `orderPrefixMatches` puts WIŚNIEWSKA and WIŚNIEWSKI before WISNIEWSKI and WISNIEWSKA, DĄBROWA before DABROWA and ŻMUDA before ZMUDA. It keeps ZMUDA TRZEBIATOWSKI before ŻMUDA TRZEBIATOWSKI, and a spelling typed with diacritics before its rarer ASCII form. Five times moves a match ahead and 4.99 times does not. An absent count is never zero (unit tests, `packages/resolver`).
- **AC-2.** Against PostgreSQL, `wisn` gives WIŚNIEWSKA, WIŚNIEWSKI, WISNIEWSKI. `dabrowa` gives DĄBROWA, DABROWA, and `zmuda t` gives ZMUDA TRZEBIATOWSKI, ŻMUDA TRZEBIATOWSKI (integration). The same test fails on the old order.
- **AC-3.** `readOtherSpelling` gives WISNIEWSKI's page WIŚNIEWSKI (53,079, men's list) and DABROWA's page DĄBROWA (1,211, women's list). It gives nothing to ZMUDA TRZEBIATOWSKI, ŻMUDA TRZEBIATOWSKI, WIŚNIEWSKI or DĄBROWA, and never offers a script-confusable surname or reads a superseded claim (integration).
- **AC-4.** The contract accepts `other_spelling` only on a resolved surname. It refuses one that is the surname itself, any other rule code, a zero count, and a response without the field (unit tests). The schema is 1.13.
- **AC-5.** WISNIEWSKI's rendered page carries the line in both languages, linked, inside the first screen after the answer. DABROWA's names DĄBROWA on the women's list. ZMUDA TRZEBIATOWSKI's has no line. No kinship or misspelling word is in it. Polish plural forms agree (web tests).

## 6. Verification

```bash
pnpm --filter @name-atlas/resolver test
pnpm --filter @name-atlas/contracts test
pnpm --filter web test
TEST_DATABASE_URL=postgres://… pnpm test:integration
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm check:ids
pnpm --filter web build
```
