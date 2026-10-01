# ADR-0027 — free accounts: email and password, in their own schema, written by their own role

- **Status:** Accepted for build, 2026-10-01. The project owner chose the shape on 2026-10-01 and said "Ok go" to building accounts on the defaults in §2 (Resend for email, a separate schema and role for the data). Going live waits on the owner's items in §5.
- **Date:** 2026-10-01
- **Deciders:** the project owner.
  - On the account: after the cards, readers "click login to share it with friends and access the next tier" (ADR-0026).
  - Asked how people sign in, they chose "Email + password".
  - Asked about living people in a tree, they said real people may be added "only after approving T[&]C that would highlight that … when they create [an] account".
- **Amends:** ADR-0017 §2.3 and TASK-042 §2, "the web app writes nothing". From this ADR it writes to one schema, `accounts`, and nowhere else.
- **Relates to:** ADR-0026 (the tiers), `ARCHITECTURE.md` §7 (the public / private data boundary), `PRODUCT.md` §7.9, TASK-049 (the off-host backup), TASK-046 (the privacy notice), `docs/canonical/19`.
- **Implemented by:** TASK-061 (the schema and the library, dark). The pages, the VM role and the download gate are their own tasks (§5).

## 1. Context

- ADR-0026 puts a free account between the free cards and the 29,99 zł tier. It holds what a reader saves and shares, and later the tree they build.
- Nothing in the project writes user data. The web app connects as `nameatlas_web`, a `SELECT`-only role. The register is rebuilt from public files by scripts that never drop the database.
- `ARCHITECTURE.md` §7: "the public surname cache must never contain a user ↔ family association". An account that sits in a table of the register's own schema, readable by the register's own role, would make that a promise kept by convention.
- TASK-049 says "there is no user-written data" and that a restore of the VM's dump has never been tested. There is no off-host copy.

## 2. Decision

1. **Email and password. The form takes an address and nothing else; the password and the acceptance of the terms are given by the person who follows the link in the mail.** The account exists as *pending* until then, and a pending account cannot sign in. The other order, a password chosen at the form and confirmed by the link, lets anyone register somebody else's address with a password they know and wait for its owner to confirm it ("pre-hijacking"), and lets a stranger tick the terms for them. Choosing the password at the link is also one step fewer for the reader: address, link, password, signed in. No social sign-in, no magic link, no third-party identity service: the owner chose email and password, and a hosted identity service would be one more processor of readers' addresses.
2. **The data is in schema `accounts` of the production database,** owned by the build role, **written and read only by a new role, `nameatlas_app`.** The read-only `nameatlas_web` has no grant on it. `nameatlas_app` has no grant on `public`. No account table references a surname or any table of the register, and no register query joins an account table. The web app holds a second pool for it, created only when `ACCOUNTS_DATABASE_URL` is set. Every other query keeps the read-only pool.
3. **A separate schema, not a separate database,** because the rebuild scripts never drop the database and one PgBouncer already fronts it. A separate database would give the same isolation for a second migrator, a second set of generated types and a second pooler entry.
4. **Passwords are hashed with scrypt from Node's `crypto`,** N = 2^16, r = 8, p = 2 (64 MiB, one of OWASP's listed scrypt settings), a 16-byte random salt and a 64-byte key, stored as `scrypt$N=…,r=…,p=…$salt$key` so the parameters can rise later without a migration. It adds no dependency; Argon2id would add a native one. Verification is constant-time. A sign-in for an address with no account, or a pending one, still computes a hash against a fixed dummy, so timing does not say whether the account exists. A password is 10 to 128 characters after NFKC normalisation, not equal to the address, and not on a short list of the commonest. There are no composition rules (NIST SP 800-63B).
5. **A session is an opaque 32-byte random token in an `HttpOnly`, `Secure`, `SameSite=Lax` cookie.** The database holds only its SHA-256. A session lasts 30 days, and is renewed to 30 days again when it is used with fewer than 15 left. A password reset or an account deletion ends every session of the user.
6. **Email tokens are 32 random bytes, stored as SHA-256, used once.** A sign-up token lasts 24 hours, a reset token 1 hour. Spending one is a POST of the form the link opens (the password, and the terms), never the GET, so a mail scanner that opens the link does not spend it. A pending address whose link lapsed is deleted after 7 days.
7. **Nothing says whether an address has an account.** Sign-up and reset answer the same whether or not it does. Sign-up for an address that has an account sends no mail, so it cannot be used to mail someone else; the page tells a reader who may already have an account where to sign in or reset. A wrong password, an unknown address and a pending one get the same answer. Eight failed sign-ins for one address in 15 minutes refuse further sign-ins for it for the rest of the window; the failures are stored as a SHA-256 of the address and deleted after an hour.
8. **Sending mail is the caller's job.** The library returns the message to send and never calls the network on its own: the routes send it after answering, so the answer's timing does not depend on the mail provider. The default sender is **Resend's HTTP API** (`RESEND_API_KEY`, `ACCOUNTS_MAIL_FROM`), through `fetch`: no dependency. Without both variables accounts are off.
9. **Completing sign-up records the terms version and the time the reader accepted them,** by the person who controls the address. The text, and the clause about living people in a tree, come with the pages and the tree; a changed version asks for acceptance again.
10. **Deleting an account deletes its rows at once** (`ON DELETE CASCADE`), the reader's erasure right.
11. **Nothing logs an address, a password or a token.** Events carry the user's id.
12. **A down migration never deletes accounts:** `0027` refuses to go down while any user exists, as `0006` refuses while data would be lost.

## 3. Why not the alternatives

- **A hosted identity service (Supabase Auth, Neon Auth, Clerk).** It works, and it would hold readers' addresses and password hashes at a vendor the privacy notice would then name. The data is already on one host the owner controls.
- **Argon2id.** The better algorithm in the abstract, with a native module that must build for Vercel's runtime. scrypt at OWASP's setting is adequate and has no install risk.
- **Magic links only.** No password to store, and the owner chose email and password.
- **Putting accounts in `public`.** The register's role could read them, and the register's default privileges would grant it every new table.
- **A second database.** See §2.3.

## 4. Consequences

- ADR-0017's "the web app writes nothing" is no longer true. The rule that stays: it writes only through `ACCOUNTS_DATABASE_URL`, only to `accounts`, as `nameatlas_app`.
- `TASK-049` §2.3 ("no user-written data") becomes false once accounts are on. **For an email and a password hash, losing the VM means readers register again. For a family tree it would lose their work,** so an off-host, restore-tested backup (TASK-049) is a precondition of the tree task, not of this one.
- The privacy notice, which says the site stores nothing in the browser and processes no accounts, changes in the same change as the pages (TASK-062): the session cookie, the stored address and hash, the failed-sign-in hashes, the mail provider as a processor, the terms version.
- Sending mail needs a domain the owner controls, verified with Resend (SPF and DKIM). Without one, mail goes only to the owner's own address.
- Accounts are dark until the owner supplies the items in §5 and the VM runs the role file. Until then the library is in the repository and nothing in production calls it.

## 5. What goes live, and who does it

1. **TASK-062, the pages:** sign-up, completing it, sign-in, sign-out, reset, an account page with deletion, the header link, the privacy notice and the terms, and a daily scheduled call of `purgeExpired`, on which the 7-day retention of a pending address depends.
2. **TASK-063, the VM:** `ops/vm/accounts-roles.sql` run by `provision.sh`, PgBouncer's user list for `nameatlas_app`, the role's password as a GitHub secret.
3. **The owner:** a Resend account and API key, a sending domain verified there, the role password secret, and the four Vercel environment variables (`ACCOUNTS_DATABASE_URL`, `RESEND_API_KEY`, `ACCOUNTS_MAIL_FROM`, and `SITE_ORIGIN` if it is not set).
4. **TASK-064, the gate:** the card download behind a sign-in.
