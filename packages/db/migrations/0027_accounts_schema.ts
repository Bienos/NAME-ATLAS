import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Free accounts (TASK-061, ADR-0027): their own schema.
 *
 * Everything lives in schema `accounts`, never in `public`. The register's
 * read-only role is granted `SELECT` on `public`'s tables, and on every table
 * the build role creates there from now on; it is granted nothing here. The
 * role that reads and writes these tables, `nameatlas_app`, is granted no table
 * in `public`. No column below references a surname or any table of the
 * register, so the public cache cannot hold a user-to-family association
 * (`ARCHITECTURE.md` §7).
 *
 * - `users`: one row per account, in one of two states. **Pending**: the address
 *   was typed into the sign-up form, and nothing else is known (the password and
 *   the terms are null). **Complete**: the person who controls the mailbox
 *   followed the link and chose a password and accepted the terms, which is the
 *   only moment either is recorded (ADR-0027 §2.1). A user who is pending cannot
 *   sign in, and a password chosen by whoever typed an address could be
 *   pre-registered against someone else's mailbox, which this order rules out.
 *   `email` is as the reader typed it, trimmed; `email_normalised` is what is
 *   unique and what is looked up. The password is only ever the scrypt string
 *   (`scrypt$N=…,r=…,p=…$salt$key`).
 * - `sessions`: a signed-in browser. Only the SHA-256 of the cookie's token is
 *   stored, so a database read cannot be replayed as a session.
 * - `email_tokens`: a verification or a reset link's token, stored as its
 *   SHA-256, used once.
 * - `sign_in_failures`: one row per failed sign-in, keyed by the SHA-256 of the
 *   address typed (known or not, so the throttle says nothing about whether an
 *   account exists). Deleted after an hour by the code that writes them.
 *
 * Every user-owned table cascades on delete: deleting an account removes its
 * rows at once (the reader's erasure right).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`CREATE SCHEMA IF NOT EXISTS accounts`.execute(db);

  await sql`
    CREATE TABLE accounts.users (
      user_id            uuid PRIMARY KEY,
      email              text NOT NULL,
      email_normalised   text NOT NULL,
      language           text NOT NULL,
      -- Null while the account is pending; set together when it is completed.
      password_hash      text,
      email_verified_at  timestamptz,
      terms_version      text,
      terms_accepted_at  timestamptz,
      created_at         timestamptz NOT NULL,
      updated_at         timestamptz NOT NULL,
      last_sign_in_at    timestamptz,
      CONSTRAINT users_email_normalised_unique UNIQUE (email_normalised),
      CONSTRAINT users_email_shape CHECK (
        email_normalised = lower(email_normalised)
        AND length(email_normalised) BETWEEN 3 AND 254
        AND position('@' IN email_normalised) > 1
      ),
      CONSTRAINT users_language_known CHECK (language IN ('pl', 'en')),
      CONSTRAINT users_password_hash_scrypt CHECK (password_hash LIKE 'scrypt$%'),
      -- Pending (all four null) or complete (all four set), never half of each.
      CONSTRAINT users_pending_or_complete CHECK (
        (email_verified_at IS NULL) = (password_hash IS NULL)
        AND (email_verified_at IS NULL) = (terms_version IS NULL)
        AND (email_verified_at IS NULL) = (terms_accepted_at IS NULL)
      )
    )
  `.execute(db);

  await sql`
    CREATE TABLE accounts.sessions (
      session_id    uuid PRIMARY KEY,
      user_id       uuid NOT NULL REFERENCES accounts.users (user_id) ON DELETE CASCADE,
      token_hash    bytea NOT NULL,
      created_at    timestamptz NOT NULL,
      last_used_at  timestamptz NOT NULL,
      expires_at    timestamptz NOT NULL,
      CONSTRAINT sessions_token_hash_unique UNIQUE (token_hash),
      CONSTRAINT sessions_token_hash_sha256 CHECK (octet_length(token_hash) = 32),
      CONSTRAINT sessions_expiry_after_creation CHECK (expires_at > created_at)
    )
  `.execute(db);
  await sql`CREATE INDEX sessions_user_idx ON accounts.sessions (user_id)`.execute(db);
  await sql`CREATE INDEX sessions_expiry_idx ON accounts.sessions (expires_at)`.execute(db);

  await sql`CREATE TYPE accounts.email_token_purpose AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD')`.execute(
    db,
  );
  await sql`
    CREATE TABLE accounts.email_tokens (
      token_id    uuid PRIMARY KEY,
      user_id     uuid NOT NULL REFERENCES accounts.users (user_id) ON DELETE CASCADE,
      purpose     accounts.email_token_purpose NOT NULL,
      token_hash  bytea NOT NULL,
      created_at  timestamptz NOT NULL,
      expires_at  timestamptz NOT NULL,
      used_at     timestamptz,
      CONSTRAINT email_tokens_token_hash_unique UNIQUE (token_hash),
      CONSTRAINT email_tokens_token_hash_sha256 CHECK (octet_length(token_hash) = 32),
      CONSTRAINT email_tokens_expiry_after_creation CHECK (expires_at > created_at)
    )
  `.execute(db);
  // The throttle on mail counts a user's recent tokens of one purpose.
  await sql`
    CREATE INDEX email_tokens_user_purpose_idx
      ON accounts.email_tokens (user_id, purpose, created_at)
  `.execute(db);

  await sql`
    CREATE TABLE accounts.sign_in_failures (
      email_hash  bytea NOT NULL,
      failed_at   timestamptz NOT NULL,
      CONSTRAINT sign_in_failures_hash_sha256 CHECK (octet_length(email_hash) = 32)
    )
  `.execute(db);
  await sql`
    CREATE INDEX sign_in_failures_lookup_idx ON accounts.sign_in_failures (email_hash, failed_at)
  `.execute(db);
  await sql`CREATE INDEX sign_in_failures_age_idx ON accounts.sign_in_failures (failed_at)`.execute(
    db,
  );
}

/**
 * A down migration must never delete accounts. With a user stored it refuses
 * and changes nothing, as `0006` refuses while a sharp-s pair is stored; with
 * none it removes the schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const users = await sql<{ n: string }>`SELECT count(*)::text AS n FROM accounts.users`.execute(
    db,
  );
  if (Number(users.rows[0]?.n ?? "0") > 0) {
    throw new Error(
      "refusing to drop schema accounts: it holds users (ADR-0027 §2.12). Delete them deliberately first.",
    );
  }
  await sql`DROP SCHEMA accounts CASCADE`.execute(db);
}
