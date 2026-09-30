# TASK-041 — A simpler landing page: three numbers, the full atlas on its own page

- **Status:** IN PROGRESS (2026-09-30).
- **Requested by:** the project owner, 2026-09-30, after seeing TASK-040 live: "I think that landing page is over compalicated tbh", then "please think what would be intersting for my audience to check and then apply these deisgns and go live".
- **Milestone:** none in `PLAN.md`; a presentation change to TASK-040.
- **Depends on:** TASK-040 (the list-facts artefact, `listFacts()`, and the three plates) and ADR-0015. The data path is unchanged.
- **Blocks:** nothing.

---

## 1. Goal

The landing page's job is the search. TASK-040 put three full plates under it: every chart twice, a list switch, an index, fact cards, caveats and method codes, about 7 000 px on a phone. This task keeps the search first, puts **three numbers** under it that a first-time visitor will want to read and repeat, and moves the full plates to their own page, `/atlas`.

## 2. What the audience is here for, and the three numbers

**Who visits:** people curious about their own surname, mostly on phones, often from a search or a shared link. They have seconds, not minutes.

**What works for them:** numbers that are surprising, about people rather than statistics, and easy to say to someone else. The three strongest facts TASK-040 already derives, in this order:

1. **82 people.** At 82 random people, the chance that two share a surname passes one half (50,56% on the male list, 50,70% on the female list).
   - It is the surname version of the birthday paradox, and the most surprising of the three.
   - It is relatable: a school year or a wedding.
2. **5 people.** At least half the surnames on each list are carried by at most 5 people. Yet the typical man carries a surname shared by 738 men, and the typical woman by 756 women.
   - This is why "is my surname rare?" is a real question, and it points back to the search.
3. **921 surnames.** In a crowd of 1 000 people there are on average about 921 different surnames. About 86% of them have nobody else there with their surname.

No other figure is added. Each is already in the artefact, derived, verified and live since TASK-040.

## 3. Design

- **Landing:** hero and search unchanged. Under them, one short section with:
  - a small heading and three cards;
  - one shared source line, with the date and a note that the lists are counted separately and never summed;
  - one link, "Zobacz, jak to policzyliśmy →", to `/atlas`.
- **Each card:** the question, one big number, one sentence and one tiny graphic.
  - The sentence gives the men's and the women's figure, so both lists are always named.
  - The big number stands for both lists only when the two lists round to the same displayed figure (82 and 82; 5 and 5; 921,1 and 920,9 → 921). It is then labelled as the figure on both lists. When they differ, the card shows both.
- **Tiny graphics.** All are presentation geometry of stored values:
  - 82: the shared-surname curve with its 50% line and the point at 82;
  - 5: a small log axis with the typical surname (5) and the typical person's surname (738);
  - 921: the seeded example crowd of 1 000 dots, with shared surnames in accent.
- **No list switch, no index, no per-card caveat block, no method codes on the landing.** Every caveat and method stays on `/atlas`.
- **Motion:** only a reveal on entering the viewport, only under `prefers-reduced-motion: no-preference`. Numbers are in the DOM from the start.
- **`/atlas` (and `?lang=en`):** a page with the site header and footer, a back link to the search, and TASK-040's section and plates unchanged.

## 4. In scope

1. `apps/web`:
   - the three-card section, its copy in Polish and English, styles and tests;
   - `page.tsx`, which renders the cards instead of the plates, and still fails soft;
   - the `/atlas` route rendering `ListAtlas`.
2. `PRODUCT.md` §5: the scope line names the atlas page.
3. This task file, `STATUS.md`, `docs/CODEMAP.md` and a `docs/progress/` record.

## 5. Out of scope

- Any new figure, derivation or artefact change (TASK-040, ADR-0015).
- The later plates and their decisions (TASK-040 §6, U-1 to U-4).
- A named surname anywhere on the landing page.
- The hero, the search and the most-common-surnames section, which are unchanged.
- The sitemap: `/atlas` is not added.

## 6. Acceptance criteria

- **AC-01:** With no query, the landing page renders the three cards from `listFacts()` and not the plates. It renders nothing if `listFacts()` throws (tested).
- **AC-02:** Every card names both lists with their own figures. No rendered figure is a sum of the two lists, and no surname string appears (tested). The copy guard (TASK-040 AC-07) passes on the card markup.
- **AC-03:** A card's big number is shown once only when both lists format to the same text, and it is labelled as the figure on both lists. When they differ, both are shown (tested with a fixture where they differ).
- **AC-04:** `/atlas` renders TASK-040's section with all three plates. The landing links to it (tested).
- **AC-05:** At 360, 390 and 1280 px there is no horizontal overflow and no console error. No target is under 44 px. Motion appears only under `no-preference`. Checked in a built app with Playwright.
- **AC-06:** `pnpm check:ids`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test` and `pnpm build` pass.

## 7. Verification

```bash
pnpm check:ids && pnpm typecheck && pnpm lint && pnpm format:check
pnpm test
pnpm build
```

## 8. Definition of done

The acceptance criteria are shown by commands and tests that were run, and the progress record lists the real results. The owner asked for it to go live: merge, deploy `main` to production, and verify the live page. **STOP.**
