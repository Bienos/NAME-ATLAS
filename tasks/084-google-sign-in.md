# TASK-084 — Google sign-in, and the family tree's ways in from the header and the landing page; dark

- **Status:** IMPLEMENTED 2026-10-04. Record: `docs/progress/2026-10-04-google-sign-in.md`.
- **Requested by:** the project owner, 2026-10-04: people should have access to the family tree only after they sign up, with Google sign-in and other options, a way in from the header and one on the landing page. After the mockups: "go with your recommendations, tree free with sign up".
- **Decision:** ADR-0033 (Google sign-in), D-034 (the tree is free with an account), ADR-0027 (accounts), ADR-0029 (the tree).
- **Depends on:** TASK-061–064 (accounts), TASK-076 (the tree's pages), all on `main`.
- **Number:** 084 is free on `main` and in open pull requests (082, 083, 085 and 086 are on `main`; nothing open claims 084). ADR-0033, D-034 and migration 0032 likewise (ADR-0032 and migrations 0030 and 0031 are on `main`).

## 1. Goal

A reader can open an account, and come back to it, with "Continue with Google" as well as with email and password, and reaches the family tree from the header and from the landing page, returning to the tree after signing in. **Dark:** nothing changes in production until the owner sets the variables in ADR-0033 §5.

## 2. In scope

- Migration 0032: `accounts.identities`; a complete account may have no password; the token purpose `GOOGLE_TERMS`.
- `@name-atlas/accounts`: `google.ts` (configuration, the authorization address with PKCE, the code exchange, the ID token's claims); `signInWithGoogle`, `completeGoogleSignUp`; `deleteAccount` with a confirmation for an account without a password; `Session.hasPassword`.
- The web app: accounts on with the base and at least one way in (`accounts-config.ts`); `GET /api/account/google` and `/api/account/google/callback` (`google-routes.ts`); the `google-complete` action; the terms step `/pl/konto/witaj`, `/en/account/welcome`; the Google button on sign-in and sign-up; the email forms and the mail's steps only with mail; the account page for an account without a password; `next` may be the tree's page; the tree's sign-in redirects and its landing page's buttons return to the tree.
- The header: the account link last, drawn as a button.
- The landing page: one line under the search and a section after "Co dostaniesz", only when the tree is on.
- The offer page: the tree moves to the free tier (D-034).
- The privacy notice: a section on Google sign-in and Google Ireland Limited, only when Google is configured.
- `ops/vm/README.md`: the owner's Google steps.

## 3. Out of scope

- Apple, Facebook or any other provider; Google One Tap or Google's JavaScript button.
- A header that shows who is signed in (ADR-0033 §3).
- Linking or unlinking Google from the account page.
- Limits on a free tree.
- Turning anything on in production.

## 4. Acceptance criteria

- **AC-1.** With no way in configured, every account page and route, both Google routes included, answers 404 and the legal pages read as before; with Google alone, accounts are on and the email forms, the mail's steps and the two mail routes are absent (unit).
- **AC-2.** The start route sets an `HttpOnly`, `SameSite=Lax`, ten-minute cookie with a fresh state and verifier and redirects to Google with `openid email`, the state and an S256 challenge; the secret and the verifier never appear in the address (unit).
- **AC-3.** The callback refuses a missing cookie, a missing or different state and a missing code without calling Google, and clears the cookie on every answer; nothing Google sent is logged or put in an address (unit).
- **AC-4.** A first Google sign-in makes a pending account and no session until the terms are accepted; a known Google account signs in; an address with an account is linked and keeps its password; an unverified address is refused and nothing is stored; an account linked to a different Google account is refused; a pending email sign-up completed through Google spends its mailed link; the terms token lapses after an hour (integration, as `nameatlas_app`).
- **AC-5.** An account without a password is deleted only with the confirmation ticked, and its Google link goes with it; the web role reads nothing of `accounts.identities`; migration 0032 refuses to go down while it holds an identity (integration).
- **AC-6.** The ID token's issuer, audience, expiry and issue time are checked, and a malformed token is refused (unit).
- **AC-7.** `pnpm typecheck`, `lint`, `format:check`, `check:ids`, `test`, `build`, `test:integration` and `test:golden` exit 0.

## 5. Verification

```
pnpm typecheck && pnpm lint && pnpm format:check && pnpm check:ids && pnpm test && pnpm build
TEST_DATABASE_URL=… pnpm test:integration && pnpm test:golden
```
