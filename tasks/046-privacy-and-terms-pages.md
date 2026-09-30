# TASK-046 — Privacy notice and terms of use pages, in Polish and English

- **Status:** SPECIFIED 2026-09-30, not started. One of five launch hygiene tasks (046–050) the project owner asked for on 2026-09-30.
- **Requested by:** the project owner, 2026-09-30: "add the small launch hygiene tasks: privacy and terms pages, a contact, headers, an off-host backup and a feedback channel."
- **Milestone:** none in `PLAN.md`. Launch hygiene for the free site as it is today.
- **Depends on:** nothing. TASK-047 (contact) supplies the address both pages name; if 047 has not landed, this task uses the same owner-supplied address (§4 U-2).
- **Model guidance:** implementation session. The wording is the owner's to approve; the session drafts, it does not publish legal text on its own authority.

## 1. Goal

Two static pages in each language, linked from every page's footer: a privacy notice that describes **only what the site actually does today**, and short terms of use. Nothing in either page promises or describes a feature that does not exist (accounts, payments, reports, analytics vendors, cookies for tracking).

## 2. Facts that shape the work (checked on `main` @ `107ff65`, 2026-09-30)

1. **No analytics vendor, no tracking cookies.** `apps/web/src/app/api/v1/events/route.ts` logs an allow-listed event name and nothing else. No `posthog`, `@vercel/analytics` or `document.cookie` in `apps/web/src`. Anything this session finds to the contrary goes into the notice, not around it.
2. **IP addresses are processed.** `apps/web/src/lib/rate-limit.ts` keys its in-memory limiter on `x-forwarded-for` / `x-real-ip`. Vercel (hosting, region `fra1`) keeps request logs. The database is on an Oracle Cloud VM in Frankfurt (ADR-0017). These are the processors to name; their retention is to be read from their own documentation, not guessed.
3. **Surnames typed into the search are sent to the server** (`/api/v1/surname-prefix`, `/api/v1/surname-results`). Whether the structured logger writes the surname must be checked in `packages/logging` and the routes, and the notice must say what is true.
4. **The data shown is aggregate public-register data** (PESEL surname lists, TERYT, Buryan 1933); no page shows a living individual.
5. **Required topics** are listed in `docs/canonical/19` §163 (terms) and §164 (privacy notice). Most of §163 (accounts, payments, consumer rights for paid products) does not apply yet; the terms say so by leaving them out, not by describing them.
6. **Routing.** Polish pages live under `apps/web/src/app/pl/`, English under `apps/web/src/app/en/`; strings live in `apps/web/src/lib/messages.ts`. Footers render `t.footer` in `app/page.tsx`, `lib/surname-page.tsx` and `lib/compare-view.tsx`.

## 3. In scope

- `/pl/prywatnosc`, `/en/privacy`, `/pl/regulamin`, `/en/terms`: static server components, no database read, `lang` set, in the sitemap.
- The privacy notice covers §164's topics that apply: controller and contact, data categories (IP address, request metadata, typed surnames if logged), purposes (serving pages, abuse protection, error diagnosis), lawful basis (legitimate interest, GDPR Art. 6(1)(f)), processors (Vercel, Oracle), transfers, retention, rights, complaint to the Prezes UODO, no profiling, "no cookies beyond those strictly necessary" only if that is true.
- The terms cover: what the service is, evidence and uncertainty, a surname is not a family and no ancestry is guaranteed, availability "as is", acceptable use (no bulk scraping beyond `robots.txt` and the rate limits), source attribution and the sources' own licences, liability within what Polish consumer law permits, governing law, the contact.
- A footer link to both pages on every page, in both languages.
- A test that each of the four routes renders and that each footer carries the two links.
- A "last updated" date on each page.

## 4. Out of scope

- A cookie banner or consent manager (nothing to consent to; add one when something needs it, `docs/canonical/19` §165–166).
- Terms for accounts, payments, reports or user content.
- Legal review by counsel. The pages say nothing that is not true; whether they are sufficient is the owner's call.

## 5. Unknowns the owner must answer before merge

- **U-1.** The controller: the owner's legal name or business name and postal address, as they want them published.
- **U-2.** The contact address (shared with TASK-047).
- **U-3.** Approval of the drafted wording in both languages.

**Answers the project owner gave on 2026-09-30:**

- U-1: the name "Patryk cicbowski" and the place "ilawa hehe". This is read as Iława, with no street address given. Before publishing, confirm the spelling of the surname and whether a postal address is wanted.
- U-2: `cihypatryk@gmail.com`, in `apps/web/src/lib/site-footer.tsx` since TASK-047.

If U-1 or U-2 is missing the session writes `[OWNER: …]` placeholders and the pull request stays a draft. It never invents a name or address.

## 6. Acceptance criteria

- **AC-1.** The four routes return 200 locally and render the approved text; `lang` is `pl` or `en` accordingly.
- **AC-2.** Every page type (landing, surname, comparison, the new pages) shows both links in its footer.
- **AC-3.** Every statement in the privacy notice about what is collected, logged or kept is traced, in the progress record, to the file or vendor document it rests on.
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then `curl -sI` on the four routes of a preview or production deployment, recorded with the date.
