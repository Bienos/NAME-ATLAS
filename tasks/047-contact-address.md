# TASK-047 — A published contact address

- **Status:** SPECIFIED 2026-09-30, not started. One of five launch hygiene tasks (046–050).
- **Requested by:** the project owner, 2026-09-30 (see TASK-046).
- **Milestone:** none in `PLAN.md`.
- **Depends on:** the owner choosing the address (§5 U-1). Nothing in code.
- **Model guidance:** small implementation session.

## 1. Goal

A reader, a rights holder or a data subject can reach the project. One address, shown on a contact page and in every footer, and in `/.well-known/security.txt` for security reports.

## 2. Facts (checked on `main` @ `107ff65`, 2026-09-30)

1. No page carries a contact today; `grep -rn "mailto" apps/web/src` finds nothing.
2. `docs/canonical/19` §133 (notice and takedown) names four inbound kinds: rights complaints, living-person privacy complaints, archive/provider complaints and factual disputes. One address may serve all four at launch; the page says which to use it for.
3. `docs/canonical/19` §149 lists incident contact roles; at launch they are one person, the owner.

## 3. In scope

- `/pl/kontakt` and `/en/contact`: the address, what to write about (a wrong fact, a rights or privacy request, a security problem), and that no reply time is promised unless the owner gives one.
- The address in every footer, next to TASK-046's links if they exist.
- `apps/web/public/.well-known/security.txt` (RFC 9116): `Contact:`, `Expires:` one year out, `Preferred-Languages: pl, en`, `Canonical:`.
- The address stored once, in `messages.ts` or one constant, not repeated per page.
- A test for the two routes and the file.

## 4. Out of scope

- A contact form (that is TASK-050's question, and it needs a place to deliver to).
- Setting up the mailbox, forwarding or a domain. The owner does that.

## 5. Unknowns

- **U-1.** The address. A mailbox on a domain the project controls is better than a personal one, but the site has no custom domain yet (`name-atlas-two.vercel.app`). The owner decides. The session never invents or guesses an address.

## 6. Acceptance criteria

- **AC-1.** Both routes return 200 and show the address as a `mailto:` link.
- **AC-2.** Every page type shows the address or a link to the contact page in its footer.
- **AC-3.** `/.well-known/security.txt` is served with `Content-Type: text/plain` and passes the RFC 9116 required fields (`Contact`, `Expires`).
- **AC-4.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 7. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
curl -sI <deployment>/.well-known/security.txt
```
