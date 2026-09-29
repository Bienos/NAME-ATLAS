# 2026-09-29 — TASK-023 AC-1 and AC-8 amended by the project owner

This follows `2026-09-29-verify-task-023-025.md` (#21). That record found that two of TASK-023's criteria no longer hold as written, because the page was later changed on purpose:

- **AC-1.** Since #11, the rarity chapter shows „1 na X” and the rank above the claim that states them.
- **AC-8.** Three client components were added: the share button, suggest-as-you-type and the map.

The session offered the project owner two choices: amend the criteria to match the page, or change the page to match the criteria. The owner chose to amend them ("ok", 2026-09-29).

## Changed

- `tasks/023-result-experience-claims-evidence-snapshot.md`:
  - **AC-1** keeps its text and gains a note. A figure may appear outside a claim only as a copy of a figure that a claim on the same page states with its assessment word, source kind, scope and date. This covers the snapshot, and the rarity chapter's „1 na X” and rank.
  - **AC-8** keeps its text and gains a note:
    - no inline event-handler attribute;
    - client-side JavaScript only in the share button, the suggest-as-you-type search and the voivodeship map;
    - the page works fully without JavaScript.
  - **Status:** all eight criteria hold.
- `tasks/017-free-surname-result-page.md`:
  - **AC-10** said "no client component", the same rule as TASK-023 AC-8, and it has not held since TASK-024 added the share button.
  - It gains the same note.
- `STATUS.md`:
  - the open question on AC-1 and AC-8 is removed from "Blocked on the project owner";
  - the "Last rewritten" line, the open pull requests and the branch list are rewritten.

No code changed. The page is exactly as it was.

## Why the amended criteria hold

The evidence was gathered on `main` @ `5636e95`, and is in `2026-09-29-verify-task-023-025.md`. Between `5636e95` and this branch, `main` changed only documents (#20).

**AC-1.**

- On NOWAK, each list in the rarity chapter holds, in this order:
  - the display figure „około 1 na 215”;
  - the scale;
  - the rank, #1;
  - the claim itself.
- The claim's statement is „Około 1 na 215 osób ujętych w rejestrze PESEL (mężczyźni) nosiło nazwisko NOWAK na dzień 20 stycznia 2026 r.” Its second line says the surname ranks first. It carries "Zweryfikowane", "Dane urzędowe" and "Polska · Ministerstwo Cyfryzacji · 20 stycznia 2026 r.".
- MELNYK's lists follow the same pattern.
- The snapshot's figures are the counts, the 1 in X values and the strongest region. The chapters' claims state each of them.

**AC-8.**

- None of the 9 pages fetched carries an `on*=` attribute.
- `apps/web/src` has exactly three `'use client'` files: `share-button.tsx`, `surname-combobox.tsx` and `voivodeship-map.tsx`.
- With JavaScript disabled:
  - the search form submitted to `/pl/nazwisko/kowalczyk`;
  - NOWAK's regional table rendered 34 rows;
  - the share link was visible as text.

**TASK-017 AC-10.** `pnpm build` passed on `5636e95`. The page is server-rendered, with the same three client components.

## Verified

| Command | Result |
|---|---|
| `pnpm check:ids` | passed |
| `pnpm format:check` | passed |

## Not run

Tests and the build were not re-run, because this change touches only documents. They were run on `5636e95` for the verification, and passed.
