# 2026-10-05 — TASK-131: leading a reader who typed without diacritics to the surname they most likely meant

Branch `claude/compassionate-cerf-h2dyuj`, from `origin/main` at `93db9a1` (TASK-123), rebased onto `4aa1c04` (TASK-124, #149, merged meanwhile) before the pull request. Task: `tasks/131-diacritic-spelling-hint.md`. Numbered 125 because #149 holds 124; renumbered 131 on 2026-10-06, when it was merged after #150 had taken 125. Requested by the owner from what production showed.

## Observed before the change

Read through the public API on `https://name-atlas.pl`, 2026-10-05:

- `GET /api/v1/surname-results?surname=wisniewski`: `RESOLVED`, WISNIEWSKI, 105 (men) and 95 (women) on 2026-01-20, `other_form` WISNIEWSKA 86. `?surname=wiśniewski`: WIŚNIEWSKI 53,079 and 203; WIŚNIEWSKA 54,177 (women).
- `?surname=dabrowa`: DABROWA 2 and 7. `?surname=dąbrowa`: DĄBROWA 1,142 and 1,211.
- `?surname=zmuda trzebiatowski`: ZMUDA TRZEBIATOWSKI 248 and 2. ŻMUDA TRZEBIATOWSKI 88 (men only), ŻMUDA-TRZEBIATOWSKI 224, ZMUDA-TRZEBIATOWSKI 61 and 2. ZMUDA 647 and 689, ŻMUDA 4,828 and 4,729.
- `GET /api/v1/surname-prefix?q=wisniew`: WISNIEWSKI, WISNIEWSKA, WIŚNIEWSKA, WIŚNIEWSKI, WIŚNIEWICZ, …. `q=dabrow`: DABROWSKI, DABROWSKA, DABROWA, DĄBROWSKA, DĄBROWSKI, DĄBROWA, …. `q=zmuda`: ZMUDA, ZMUDA TRZEBIATOWSKA, … with ŻMUDA seventh.

## Changed

- `packages/resolver/src/prefix.ts`: `OTHER_SPELLING_RATIO = 5`, `outranksTypedSpelling` and `orderPrefixMatches` (pure, exported). The query now returns each match's largest national count and its place within its own kind (key starts with the input as typed, or found only through the fold). At most `limit` of each kind leave the database (`row_number()` over the kind). The merge puts a folded match first only at ≥ 5×. The response is unchanged. New `prefix.test.ts`.
- `packages/truth/src/other-spelling.ts` (new): `readOtherSpelling`. It reads the surname with the same folded key and the largest active `CURRENT_RANK` count, with that claim's list and date, when it is ≥ 5× this surname's largest rank count. Script-confusable, merged and inactive surnames are left out. `query.ts` reads it beside the neighbours and the other form (only when rarity is `READY`, on rarity's surface) into `other_spelling`, and is null on every other path.
- `packages/contracts/src/surname-result.ts`: `otherSpellingSchema` (`rule_code: "POLISH_DIACRITIC_FOLD"`), `other_spelling` required and nullable. Refinements: only when `RESOLVED`, never the surname itself. Schema `1.12` → `1.13`. `suggestions` keeps 1.3's rule (present exactly when not `RESOLVED`), so the field could not go there.
- `apps/web`: `otherSpellingParts` in `messages.ts` ("Szukasz WIŚNIEWSKI? 53 079 osób (mężczyźni) w rejestrze PESEL na dzień 20 stycznia 2026 r." / "Looking for WIŚNIEWSKI? 53,079 people (male) in the PESEL register on 20 January 2026."). `Snapshot` takes a `notice` under the answer, and `Result` passes the linked line. `.other-spelling` in `globals.css`. `sections.test.ts` names `other_spelling` as a field that is not a chapter.
- Docs: `docs/contracts/surname-result.md` (1.13: example, rules 35–36, the accepted rendering, compatibility); `docs/contracts/surname-prefix.md` (the order); `docs/CODEMAP.md` (a row); the task file.
- Tests: fixtures gain `other_spelling: null` and schema `1.13`. New cases are in `prefix.test.ts`, `surname-result.test.ts`, `messages.test.ts`, `result-view.test.ts`, `tests/integration/src/surname-prefix.test.ts` and `tests/integration/src/other-spelling.test.ts` (new). The ASCII-larger case is ZMUDA TRZEBIATOWSKI (248) against ŻMUDA TRZEBIATOWSKI (88).

The threshold (five times, not the request's example of ten) and its reasoning are in the task file §2.

## Verified

PostgreSQL 16.14 with PostGIS installed in the session container; the integration and golden suites ran against it through `TEST_DATABASE_URL`.

- `pnpm --filter @name-atlas/resolver exec vitest run src/prefix.test.ts`: 10 passed.
- `pnpm test`: exit 0. resolver 112, contracts 146, truth 395, web 925 (88 files), and every other package passed. The first run had 1 web failure: `sections.test.ts` requires every contract field to be a chapter or listed as not one. `other_spelling` was then listed.
- `TEST_DATABASE_URL=… pnpm test:integration`: 39 files, 475 tests passed, exit 0. One `pool_idle_client_error` (57P01) line was logged during teardown, with no failed test.
- The new `surname-prefix.test.ts` against the old ordering (the `main` version of `prefix.ts`): 1 failed (`wisn` gave WISNIEWSKI first), 8 passed. With the change: 9 passed.
- `TEST_DATABASE_URL=… pnpm test:golden`: 4 files, 364 tests passed, exit 0.
- `pnpm typecheck`: exit 0. `pnpm lint`: exit 0. `pnpm format:check`: "All matched files use Prettier code style!" `pnpm check:ids`: "every task, ADR, migration and decision number is used once". `pnpm --filter web build`: exit 0.
- After the rebase onto `4aa1c04` (one conflict, STATUS.md's "Last rewritten" line): `pnpm format:check`, `pnpm lint`, `pnpm typecheck` and `pnpm check:ids` passed again; `pnpm test` exit 0 (web 930, truth 395, resolver 112, contracts 146); `pnpm test:integration` 40 files, 481 tests passed; `pnpm test:golden` 364 passed; `pnpm --filter web build` exit 0. The screenshots and the old-order check below were made before the rebase and not repeated.
- The fold match's plan at scale: a scratch database with 650,002 synthetic keys and the same GIN index. `translate(canonical_key, …) LIKE 'wisniewski'` ran as a Bitmap Index Scan on `surnames_fold_key_trgm`, 0.294 ms. On the integration suite's ~20 surnames the planner prefers the small btree, so no plan assertion was kept there.
- The rendered `Result` for WISNIEWSKI (production's counts) with `globals.css`, screenshotted in Chromium at 390 × 844 and 1280 × 900: the line sits under the answer and tally, before the two list columns, with the name linked. There is no horizontal overflow at either width.

## Not verified

- Production and staging: nothing deployed. The live API still orders `wisniew` as above until a release.
- The prefix query's time on the full register. The window adds a sort per kind, where there was one sort before; the 4.4 µs a match in the prefix contract predates it.
- The page in the running app with the site's dusk world and fonts: the screenshots carry the stylesheet only. The deck (`?view=cards`) and the share cards do not show the line (out of scope).
- How many readers type without diacritics: the ratio of five rests on an assumption, not a measurement (task file §2).
- `pnpm test:e2e`: not run.
- A report version frozen under 1.12 no longer parses as 1.13, and the report preview shows its "frozen under an earlier data contract" notice, as after every earlier bump. Whether production holds any such version was not checked.

## Landed

On 2026-10-06, at the owner's request, `origin/main` @ `2d5c29b` (#150, TASK-125) was merged into `claude/compassionate-cerf-h2dyuj`. The change was renumbered TASK-131 (the task file, this record, `STATUS.md`, `docs/CODEMAP.md`, the contracts' notes and the code comments); #150's TASK-125 references are untouched. Only `STATUS.md` conflicted: "Last rewritten" names this change, and the other-spelling line follows `main`'s search-head line. `main`'s surname-result contract was still 1.12, so 1.13 stands. Run on the merged tree, with dependencies from `pnpm install --frozen-lockfile`:

- `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm check:ids`: exit 0.
- `pnpm test`: exit 0 (web 951, truth 395, contracts 146, resolver 112, among the rest).
- `pnpm build`: exit 0.
- `pnpm test:integration` with `TEST_DATABASE_URL` on a local PostgreSQL 16 with PostGIS 3: exit 0, 42 files, 489 tests, `other-spelling.test.ts` and `surname-prefix.test.ts` among them.
- `pnpm test:golden`, the same server: exit 0, 364 tests.
- Not run: `pnpm test:e2e`. GitHub Actions starts no jobs on this account, so there is no CI result.
