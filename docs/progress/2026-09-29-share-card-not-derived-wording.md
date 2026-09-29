# 2026-09-29 — TASK-037: the share card tells the truth about a surname not yet derived

Scope authority: `tasks/037-share-card-not-derived-wording.md`. It was written and implemented in this change, because the project owner asked for the fix ("do the share card fix", 2026-09-29).

The defect was found by the re-verification of TASK-023–025. It is item 1 under "Found, not fixed" in `2026-09-29-verify-task-023-025.md`.

## Changed

- **`apps/web/src/lib/og-facts.ts`.**
  - The card previously gave every population state other than READY and RIGHTS_BLOCKED the caveat "Zbiór nie podaje liczby dla tego nazwiska" / "The dataset publishes no count for this surname".
  - For `UNAVAILABLE` with `NOT_DERIVED_YET` it now uses `UI[lang].heroNotDerived`. That is the sentence the page's snapshot and metadata description already use: „Rejestr PESEL zawiera to nazwisko, ale jego liczby nie zostały jeszcze opracowane.” / "The PESEL register lists this surname, but its figures have not been prepared yet."
  - The doc comment now names the not-yet-derived case.
  - The rights-blocked and no-count sentences are unchanged. Each is true for its own case.
- **`apps/web/src/lib/og-facts.test.ts`.** Two tests:
  - `NOT_DERIVED_YET` in both languages: the caveat equals the page's sentence, it says neither "nie podaje liczby" nor "publishes no count", there are no lines, and there is no digit run of two or more.
  - `NO_APPLICABLE_EVIDENCE` keeps the no-count sentence in both languages.
- **`tasks/037-share-card-not-derived-wording.md`** is new.
- **`docs/CODEMAP.md`** lists it.
- **`STATUS.md`**: the "Next" item for this defect is removed, and the lines this change made untrue are rewritten.

No contract, read path, page, layout or styling changed.

## Verified

| Command | Result |
|---|---|
| `pnpm exec vitest run src/lib/og-facts.test.ts` (in `apps/web`) with the fix stashed | **Failed**, as it should. The new `NOT_DERIVED_YET` test received "Zbiór nie podaje liczby dla tego nazwiska", which is the defect. 1 failed, 7 passed. |
| The same, with the fix | 8 passed |
| `pnpm check:ids` | passed |
| `pnpm typecheck` | passed |
| `pnpm lint` | passed |
| `pnpm format:check` | passed |
| `pnpm test` | passed: 1,062 tests, which is 1,060 plus the two new ones |
| `pnpm build` | passed |

**Live check.** The built app (`next start`) ran against the local register from `2026-09-29-verify-task-023-025.md`: all four files imported, 304 surnames derived.

- `GET /api/v1/surname-results?surname=ŻYWUSKI` returns RESOLVED, with population `UNAVAILABLE` and `NOT_DERIVED_YET`.
- `/pl/nazwisko/żywuski/opengraph-image` returns 200 `image/png`, 56,131 B. It was rendered and inspected. It reads „Rejestr PESEL zawiera to nazwisko, ale jego liczby nie zostały jeszcze opracowane.” over two lines, with no number.
- `/en/surname/żywuski/opengraph-image` returns 200 `image/png`, 54,255 B. It reads "The PESEL register lists this surname, but its figures have not been prepared yet.", with no number.
- `/pl/nazwisko/nowak/opengraph-image` is byte-identical to the card captured before the fix (58,580 B, compared with `cmp`).

## Not verified

- The integration and golden suites were not run. This change touches only a pure function in `apps/web` and its unit test, and neither suite imports `og-facts.ts`. CI runs both.
- The card in a messaging app's link preview. It was inspected as a PNG only.
- Production. Nothing was deployed. Production runs `0eb4814`, and its seven loaded surnames are all derived, so the defect could not appear there.
- `NO_APPLICABLE_EVIDENCE` live. In the local register every surname in the regional files also has a national row ("no national row 0"), so no resolved surname reaches that reason. The unit test covers it.
