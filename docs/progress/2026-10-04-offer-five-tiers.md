# 2026-10-04 — TASK-104: the offer page shows the owner's five tiers (ADR-0037)

Branch `claude/offer-tiers-adr`, on `origin/main` @ `f56f86e` (#118). Numbers: ADR-0036 and TASK-103 are taken by open pull requests #108 and #117, so this change takes ADR-0037 and TASK-104.

## Changed

- `docs/adr/0037-five-tiers.md` (new, proposed): the five tiers from D-025, all one-time; supersedes ADR-0026 §2.1 and §4's open questions; keeps ADR-0026 §2.2–§2.6 (no buy button, email only, partner unnamed, no DNA or health data by email).
- `tasks/104-offer-five-tiers.md` (new).
- `apps/web/src/lib/offer-text.ts`: five tiers in Polish and English. Free: the cards, share card, full page and comparison, famous bearers; the note now says the coming free account holds a tree of up to 5 people, connected through ancestors who have died, with matches up to second cousins. Paid, all "Wkrótce": "Małe poszukiwania" / "Smaller research" 28,99 zł, "Para" / "Couple" 89,99 zł, "Przegląd rodziny" / "Family review" 199 zł, "Badanie genealogiczne" / "Genealogist research" 800 zł. Every paid tier lists one shared line, the tree unlock. "Couple" adds the couple report (ADR-0035, "no score about the couple"); 800 zł keeps ADR-0026 §2.4's four service lines. The page's lede says the paid tiers are one-time payments. `waitlistMailto` takes the tier and puts its name and price in the subject; the enquiry's subject names the 800 zł tier.
- `apps/web/src/lib/offer-form.tsx`, `offer-page.tsx`: the form takes the tier; each of 28,99, 89,99 and 199 zł gets a waiting list, 800 zł the enquiry.
- `apps/web/src/lib/landing-sections.tsx`: the strip's waiting-list link goes to `#tier-smaller` (the strip renders whatever tiers `offerDocument` holds, so it now shows five).
- Tests: `offer-page.test.ts` (five prices, four "Wkrótce", a waiting-list link per paid tier, the new subjects, a new test that 28,99 and 199 zł list only the unlock and that both languages have the same shape), `landing-sections.test.ts` (five tiers, `#tier-smaller`).
- `PRODUCT.md` §6 (five tiers) and §8 (non-goal 11 holds: one-time payments); `docs/adr/0026-…` status line; `docs/DECISIONS_NEEDED.md` D-025 and D-024 status lines; `docs/CODEMAP.md`'s offer row; `STATUS.md`.

## Verified (run locally on this branch)

- `pnpm lint`: exit 0, no findings.
- `pnpm typecheck`: exit 0 (all packages, `apps/web` included).
- `pnpm test`: exit 0; `apps/web` 77 files, 821 tests passed; every other package's suite passed.
- `pnpm check:ids`: "every task, ADR, migration and decision number is used once".
- `pnpm format:check`: "All matched files use Prettier code style!" (after `prettier --write` on `offer-page.test.ts`).

## Not verified

- GitHub Actions is not starting jobs on this account (every run fails in about 2 s with no runner), so CI did not verify this change; only the local runs above did.
- The page was not rendered in a browser or by `next build`; it was checked through the unit tests' server rendering only. The strip's and page's layout with five tiers relies on the existing `auto-fit` grids and was not looked at.
- Nothing was deployed.

## Missing (not confirmed by the owner)

- What the 28,99 zł "smaller research" and 199 zł "family review" tiers hold beyond the tree unlock. The 2026-10-01 draft was not confirmed, so the page lists only the unlock for them.
- The Polish tier names are this session's renderings of the owner's English working names (ADR-0037 §2.3); the owner may change them.
- Two strings outside the offer page still name "Nazwisko i rodzina", a tier that no longer exists: the tree landing's eyebrow and "Część pakietu …" line (`tree-text.ts`; the tree pages are dark), and the bearers chapter's "Pozostałe osoby ({n}) pokażemy w raporcie „Nazwisko i rodzina”" (`messages.ts`; no bearers are loaded in production). Which tier, if any, shows the remaining bearers is not decided. Left out of scope (TASK-104 §4).
- The tree's 5-person cap, the second-cousin limit and the paid unlock are not built; checkout and accounts are unchanged.
