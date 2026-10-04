# ADR-0033 — Google sign-in beside email and password, by hand, with no identity service

- **Status:** Accepted for build, 2026-10-04. The project owner asked for "the Google sign-in and login" to the family tree, with a way in from the header and from the landing page, chose from the mockups of 2026-10-04, and answered "go with your recommendations": Google and email now, Apple later; keep email and password; let Google go live before the mail is ready; both places on the landing page. Going live waits on the owner's items in §5.
- **Date:** 2026-10-04
- **Deciders:** the project owner.
- **Amends:** ADR-0027 §2.1, "no social sign-in, no magic link, no third-party identity service". Google is now a second way in. The rest of §2.1 stands: there is still no magic link and no hosted identity service.
- **Relates to:** ADR-0027 (accounts), ADR-0029 and D-034 (the tree, now free with an account), `ARCHITECTURE.md` §7.
- **Implemented by:** TASK-084.

## 1. Context

- The owner wants readers to sign up before they build a family tree, and wants Google as the first way to do it.
- ADR-0027 chose email and password and refused social sign-in, partly because "a hosted identity service would be one more processor of readers' addresses". Google sign-in does not need such a service: OpenID Connect's authorization-code flow is two HTTP requests the site can make itself.
- Accounts are off in production, waiting on the owner's Resend account, sending domain and variables (ADR-0027 §5). Google sign-in sends no mail.

## 2. Decision

1. **Google is a second way in; email and password stay.** Apple, Facebook and other providers are not built. Apple needs a paid developer account; the owner will decide when traffic from iPhones justifies it.
2. **By hand, over `fetch`.** `packages/accounts/src/google.ts` builds the authorization request (`response_type=code`, `scope=openid email`, a random `state`, PKCE S256) and redeems the code at Google's token endpoint with the client secret and the verifier. No SDK, no library, no hosted service. **New dependency: none.**
3. **The ID token is decoded, not verified against Google's keys.** It comes straight from Google's token endpoint over TLS, in exchange for a code that only this site's secret and this browser's verifier can redeem. OpenID Connect Core §3.1.3.7 allows the TLS validation to stand in for the signature check in this case. The issuer, the audience (and `azp` when there are several), the expiry and the issue time are still checked. An ID token from any other place (a form, a query, a cookie) is never accepted. This is what lets §2.2 need no JWT library.
4. **Linking, in this order** (`signInWithGoogle`):
   1. A Google account already linked (by its `sub`, never by address) signs its user in. If that user never took the terms step, it is sent back there.
   2. Otherwise Google must say the address is verified, or the sign-in is refused and nothing is stored.
   3. An account with that address is linked to the Google account. Google's verification proves control of the mailbox, which is the same proof ADR-0027's sign-up link asks for, so this does not reopen pre-hijacking: nobody can get a verified Google address they do not control. A complete account is signed in; a pending one goes to the terms step, and every unspent sign-up link of it is spent, so whoever typed the address cannot later choose the password. An account already linked to a *different* Google account is refused.
   4. A new address becomes a pending account, linked, and goes to the terms step.
   5. **Nobody is signed in before accepting the terms themselves.** The terms step carries a one-hour token of a new purpose, `GOOGLE_TERMS`, in its address, as the sign-up link carries its token; it is never mailed.
5. **What is stored** (migration 0032): `accounts.identities` (provider, Google's `sub`, the user, two times), unique per provider and subject and per user and provider, cascading with the user. A complete account may now have no password: `users_pending_or_complete` requires the address verified and the terms set together, and a password only on a complete account. Google's name, picture and tokens are never stored or logged.
6. **An account without a password** is deleted on its page by ticking a confirmation (the session is the proof there is), and may set a password through the reset mail when mail is configured.
7. **The browser's side.** `GET /api/account/google` keeps the state, the verifier, the language and the checked `next` in a ten-minute `HttpOnly`, `SameSite=Lax` cookie (`__Host-` and `Secure` over HTTPS) and redirects to Google. `GET /api/account/google/callback` checks the state against the cookie in constant time, clears the cookie on every answer, and answers with a 303 and a status word, as ADR-0027's routes do. The `next` a sign-in may return to is a surname's page (TASK-064) or the tree's page, nothing else.
8. **On and off.** Accounts need `ACCOUNTS_DATABASE_URL`, `SITE_ORIGIN` and `CRON_SECRET`, then at least one way in, each complete or absent: `RESEND_API_KEY` with `ACCOUNTS_MAIL_FROM`, or `GOOGLE_CLIENT_ID` with `GOOGLE_CLIENT_SECRET`. With Google alone the email forms and the mail's steps are not there (404), and the two routes that only send mail answer 404. With neither, everything is off as before.
9. **The privacy notice** gains a section on Google sign-in and Google Ireland Limited in its list, only when Google is configured. The terms are unchanged.

## 3. Alternatives considered

- **Auth.js, Clerk, Auth0, Supabase Auth, Firebase Auth.** Each is a dependency or a processor, and the accounts, sessions and throttles already exist. Rejected for the reason ADR-0027 gave.
- **Verifying the ID token's signature against Google's JWKS** (with `jose`). Correct, but adds a dependency and a key cache for a check the TLS channel already makes in this flow. It becomes necessary if an ID token is ever accepted from the browser (Google One Tap, the JavaScript button); this ADR does not build those.
- **Asking for the password of an existing account before linking it.** Safer against a Google account whose address someone else's workspace admin controls, but that admin already controls the mailbox. Rejected as friction with no gain over §2.4.3.
- **A header that shows the signed-in reader's initials and a menu.** The header is rendered at build into static pages; reading the session there would make every page dynamic. Not built: the header's account button leads to the account, which sends a signed-out reader to sign-in.

## 4. Consequences

- A reader can open an account and start a tree with one click, and accounts can go live before the mail is ready.
- Migration 0032 follows 0030 (`family_safeguards`) and 0031 (`given_names`, #81), both on `main`; the VM's `accounts` step applies whichever of them it has not yet applied, in order.
- Google is a second party the notice names. The notice's statements are not a lawyer's review (ADR-0023 §2.5).

## 5. Going live: the owner's part

1. The `Register VM` workflow's `accounts` step, again, to apply migration 0032.
2. A Google Cloud project with its OAuth consent screen and a Web client whose redirect URI is `SITE_ORIGIN` + `/api/account/google/callback` (`ops/vm/README.md`).
3. In Vercel: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the three base variables (`ACCOUNTS_DATABASE_URL`, `SITE_ORIGIN`, `CRON_SECRET`), then a redeploy.
4. For the tree: `FAMILY_TREE_ENABLED=1` and ADR-0029's preconditions (TASK-049's backup; the legal review D-031 names).
