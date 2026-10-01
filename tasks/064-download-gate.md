# TASK-064 — The sign-in gate on the share-card image: the story-size card needs an account when accounts are on

- **Status:** IMPLEMENTED 2026-10-01 on `claude/friendly-brown-6n5iwu`; record: `docs/progress/2026-10-01-download-gate.md`.
- **Requested by:** the project owner, 2026-10-01: "go", on the plan that names this as the step after TASK-063. Earlier wording: "at the end should be log in button to be able to download a share card". The owner did not say whether sharing the page's link should wait for a sign-in; this task leaves it as it is.
- **Decision:** ADR-0027 §5.4 (amended here). Also ADR-0026 (the offer's free tier lists "a share card per answer"; this task does not change what the tiers promise).
- **Depends on:** TASK-061, TASK-062, TASK-063, on `main` at `65ed574`.
- **Model guidance:** implementation session.

## 1. Goal

When accounts are on, the story-size image of a deck card (`/pl/nazwisko/{slug}/karta/{card}`, `/en/surname/{slug}/card/{card}`) is served only to a reader with a valid session. A reader without one who presses the deck's share button is told so and given a link to sign in, which returns them to the surname they came from. **When accounts are off nothing changes**, which is the state of production today.

## 2. Facts (checked on `main` @ `65ed574`, 2026-10-01)

1. The image route is public and cached at the edge for an hour (`share-route.ts`, `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`). The only thing that fetches it is the deck's button (`deck-client.tsx`, `shareCard`), which fetches it as a file for the system share sheet or a download. Nothing links to it.
2. The 1200×630 card (`opengraph-image`) is another route and another image. It is the page's `og:image`, which a link preview needs without a session, and the summary section shows it and offers it as "Zapisz obraz" / "Save image". **It stays public**: gating it would break link previews and would gate an image the page already displays.
3. The surname page is rendered for everyone alike. It does not read the session, and this task keeps it that way: a page that read the cookie could not be cached and would put a reader's state into a response other readers might receive.
4. `sessionFromToken` (`@name-atlas/accounts`) returns the session for a valid cookie, renewing its row past half-life, and `null` otherwise. The cookie's lifetime is 400 days, so renewing in a route handler needs no new cookie (ADR-0027 §2.5, amended in TASK-062).
5. The sign-in action answers a 303 to the account page. It carries nothing about where the reader came from.

## 3. In scope

- **`apps/web/src/lib/download-gate.ts`:** one function, `downloadGate(runtime, cookieHeader)`, that answers `off` (accounts are off), `open` (a valid session), `sign-in` (no cookie, or one that names no session) or `unavailable` (the accounts database cannot answer). No cookie means no database read.
- **`share-route.ts`:** takes that verdict. `off` behaves exactly as today. `open` serves the image with `Cache-Control: private, no-store`. `sign-in` answers 401 with `no-store`. `unavailable` answers 503 with `Retry-After`. An unknown card is still a 404 first, and the gate comes **before** the register is read, so an anonymous request costs no register query and learns nothing about which surnames exist.
- **The two route files** compute the verdict from the request's `Cookie` and `accountsRuntime()`.
- **A `next` return for sign-in only:** `safeNext` in `account-paths.ts` accepts a surname page of this site (`/pl/nazwisko/{slug}` or `/en/surname/{slug}`, optionally with `?view=cards`) and nothing else. The sign-in page carries it in a hidden field and, if the reader is already signed in, sends them there; the sign-in action redirects there on success and keeps it on a failure. It is validated again by the action, never trusted from the form.
- **The deck:** on a 401 the deck shows, for that card, "Obraz zapiszesz po zalogowaniu." / "Sign in to save the image." with one link to the sign-in page carrying `next`. The surname page passes the prompt only when accounts are on; with them off the deck is as it was.
- **Tests:** the gate's verdicts; the route's order (404, gate, register) and its headers for each verdict; `safeNext` against hostile values; the sign-in action's redirect and its refusal of an unsafe `next`; the sign-in page's hidden field and its bounce; the deck's labels and the messages' parity.
- **Docs:** this file, ADR-0027 §5.4, `docs/CODEMAP.md`, `STATUS.md` (including the lines stale since #68), a progress record.

## 4. Out of scope

- The 1200×630 image, the "Zapisz obraz" link in the summary section and the button that shares the page's link, **left as they are on purpose** (§2.2). Whether any of them should wait for a sign-in is the owner's call (ADR-0026 §1 quotes "click login to share it with friends"); each is a small change and would change what a reader gets today.
- Carrying `next` through sign-up and the mail. The mail's link would hold the surname the reader looked at, which the privacy notice does not describe. A reader who signs up in the same browser has a session cookie in the tab that still shows the deck, and presses the button again.
- Turning accounts on (the owner's Resend key, sending domain and the five variables), the offer page's wording, any paid tier, and D-025.
- Limits on how many images one account may take, and any use of the account's identity in the image.

## 5. Acceptance criteria

- **AC-1.** With accounts off, `shareCardResponse` and the two routes behave as they did: public cache header, no cookie read, no database (unit, and the plain build served locally).
- **AC-2.** With accounts on and no session cookie, the route answers 401 with `Cache-Control: no-store` and `WWW-Authenticate`, and the register is not read; with a cookie that names no session, the same; with the accounts database down, 503 with `Retry-After` (unit).
- **AC-3.** With accounts on and a valid session, the route reads the register and the image's `Cache-Control` is `private, no-store`, never `public` (unit; a local run against a real PostgreSQL shows the route passing the gate).
- **AC-4.** An unknown card is 404 whatever the session (unit).
- **AC-5.** `safeNext` returns the value for a surname page of this site, with or without `?view=cards`, and `null` for: an absolute URL, `//host`, `/\host`, a path with `..` or a dot segment, another page of this site, an encoded newline, a fragment, any other query, a value over 200 characters, and anything that is not a string (unit).
- **AC-6.** A successful sign-in with a safe `next` redirects to it; with an unsafe one, to the account page; a failed one returns to the sign-in page with `next` kept; no redirect carries an address or a password (unit).
- **AC-7.** The sign-in page carries `next` as a hidden field only when it is safe, and a signed-in reader who opens it with a safe `next` is sent there (unit).
- **AC-8.** The deck's prompt and link exist in both languages, and the surname page gives the deck the prompt only when accounts are on (unit). The 401 branch of the button is run in a browser against a real server (§6).
- **AC-9.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test` and `build` exit 0.

## 6. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
```

Then a local run: the accounts-on build, PostgreSQL with the roles file applied, a stand-in for Resend's endpoint and headless Chromium. Anonymous: the route answers 401 and the deck's button shows the prompt, whose link leads to the sign-in page with `next`. Signing in there returns to the surname page with the deck open. Signed in: the route passes the gate. What the local register does not hold (it is empty here) and what it cannot show goes into the progress record.
