# 2026-09-30 — TASK-046: the privacy notice and terms of use

## What changed

- `apps/web/src/lib/legal-text.ts` (new) holds both documents in Polish and English, `CONTROLLER_NAME = "Patryk Cicbowski"` and `CONTROLLER_PLACE = "Iława"` (the owner's answers on 2026-09-30: this name, the town only), `LEGAL_UPDATED = "2026-09-30"`, and `legalPath`.
- `apps/web/src/lib/legal-page.tsx` (new) and four static routes: `app/pl/prywatnosc`, `app/en/privacy`, `app/pl/regulamin` and `app/en/terms`.
- `apps/web/src/lib/contact.ts` (new): `CONTACT_EMAIL` moved here from `site-footer.tsx`, which re-exports it. The move breaks the import cycle `site-footer` → `legal-text` → `site-footer`.
- `SiteFooter` also links "Prywatność / Privacy" and "Regulamin / Terms". `messages.ts` has the two link words, and `globals.css` has `.legal-updated`.
- `lib/legal-page.test.ts` (new) has 6 tests: every section renders in both languages; both documents name the controller, the place and the address; Polish and English have the same number of sections; the language switch and canonical addresses; the footer links; and the no-cookies statement.

## What each statement rests on

- **No cookies or browser storage:** `grep -rn "localStorage|sessionStorage|cookie" apps/web/src` outside tests finds nothing.
- **No analytics vendor:** `app/api/v1/events/route.ts` logs an allow-listed event name only.
- **The app's logs hold neither the IP nor the surname:** every `log.*` call in `apps/web/src` was read. `surname-results` and `page.tsx` say so in comments. `surname-prefix` logs a length band. `middleware.ts` does not log.
- **The IP is held in memory for the one-minute window:** `middleware.ts` and `lib/rate-limit.ts` (`windowMs: 60_000`, entries evicted after the window).
- **Vercel keeps request logs for 1 hour to 1 day depending on plan, with the request path and search parameters:** `vercel.com/docs/logs/runtime`, "Limits" and "Log details", page `last_updated: 2026-08-28`, read 2026-09-30. The table gives Hobby 1 hour and Pro 1 day. The project's plan was not visible through the Vercel connector, so the notice gives the range.
- **Vercel relies on the EU-U.S. Data Privacy Framework and standard contractual clauses:** `vercel.com/legal/privacy-policy`, read 2026-09-30. Region `fra1`: `STATUS.md`.
- **Oracle gets the surname query but not the visitor's IP:** ADR-0017. The functions connect to PgBouncer on the VM, and the VM never sees the visitor.
- **Google processes email:** the address is a Gmail address.

## Verification (run 2026-09-30, `main` @ `35aa48d` plus this change)

- `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` each exit 0. `apps/web`: 312 tests passed.
- `pnpm start -p 3100`: the four routes return 200 with their `<h2>` titles. Chromium's full-page screenshot of `/pl/prywatnosc` showed every section, the date and the footer links, with no console message other than CSP report-only ones.

## Deviations and not verified

- The task's §3 put the pages "in the sitemap". The sitemap lists surname pages only, not even the landing, and indexing is off, so the legal pages were not added.
- U-3: the owner's approval of the wording is asked for on the pull request.
- The pages on a deployment were not checked. Whether the text is legally sufficient was not reviewed by counsel; that was out of scope.
