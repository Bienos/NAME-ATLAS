# TASK-050 — A way for readers to report a wrong or missing fact

- **Status:** SPECIFIED 2026-09-30, not started. One of five launch hygiene tasks (046–050).
- **Requested by:** the project owner, 2026-09-30 (see TASK-046).
- **Milestone:** none in `PLAN.md`.
- **Depends on:** TASK-047 (the contact address), for the simplest form of this task.
- **Model guidance:** implementation session.

## 1. Goal

A reader who thinks a surname page is wrong, or who knows something it does not, can say so from that page in one step, and the report reaches the owner with the page it was about. Reports never change a claim by themselves (`docs/canonical/19` §116: research issue → source review → claim reassessment).

## 2. Facts (checked on `main` @ `107ff65`, 2026-09-30)

1. There is no feedback route, form or link today.
2. The site keeps no user data and has no accounts. A stored-reports table would be the first personal data it holds (a free-text message may contain a name, a family story, an email address); that changes TASK-046's privacy notice and needs retention and deletion rules.
3. `POST /api/v1/events` exists but, by design, accepts only an allow-listed event name and no free text. It must not be widened for this.
4. §133 separates factual disputes from rights and privacy complaints; the channel should let the reader say which.

## 3. In scope

The smallest option the owner picks under §5 U-1. The default, if the owner does not choose otherwise, is **option A**:

- **A. A prefilled email link.** On every surname page and the comparison page, "Zgłoś błąd / Report a problem", a `mailto:` to TASK-047's address with the subject holding the surname and the page URL, and a body prompting for what is wrong and the source, if any. No server code, no storage, no new personal data on the server.
- **B. GitHub issues.** A link to a prefilled issue form in a public repository. Only if the owner wants reports public, and only in a repository that is public; readers need a GitHub account.
- **C. A form posting to the site.** Only with a decision on storage, retention, spam protection and the privacy notice; out of scope for this task if chosen, it becomes its own task.

Plus, for A or B: a line on the contact page (TASK-047) and a test that the link is present on both page types and carries the surname and URL, encoded.

## 4. Out of scope

- Storing reports on the server, a moderation queue, or any change to claims from a report.
- Analytics on the link.

## 5. Unknowns

- **U-1. Decided by the project owner on 2026-09-30: option A**, the prefilled email.

## 6. Acceptance criteria

- **AC-1.** Every surname page and the comparison page, in both languages, show the link; following it opens a message (or issue) whose subject names the surname and whose body carries the page URL.
- **AC-2.** No new route stores or logs free text.
- **AC-3.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```
