import { sql } from "kysely";
import type { Kysely } from "kysely";

/**
 * Google sign-in (TASK-084, ADR-0033): schema `accounts` learns a second way in.
 *
 * - `identities`: one row per outside account that may sign a user in. Today
 *   the only provider is `GOOGLE`, and `subject` is Google's `sub`, the
 *   account's stable identifier (never its address, which can change). One
 *   outside account belongs to one user, and a user has at most one of each
 *   provider. It cascades with the user, as every user-owned table does.
 * - `users`: a complete account no longer needs a password, because one made
 *   through Google has none until its owner sets one by the reset mail. A
 *   complete account is still one whose address is verified and whose terms
 *   are accepted, the three set together; a pending account still has no
 *   password, so nobody can choose one for an address they do not control
 *   (ADR-0027 §2.1).
 * - `email_tokens` gains the purpose `GOOGLE_TERMS`: the one-hour token that
 *   carries a first Google sign-in from the callback to the terms step. It is
 *   never mailed.
 *
 * No column here holds anything Google sent beyond the subject: no name, no
 * picture, no Google token.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function up(db: Kysely<any>): Promise<void> {
  await sql`ALTER TYPE accounts.email_token_purpose ADD VALUE IF NOT EXISTS 'GOOGLE_TERMS'`.execute(
    db,
  );

  await sql`ALTER TABLE accounts.users DROP CONSTRAINT users_pending_or_complete`.execute(db);
  await sql`
    ALTER TABLE accounts.users ADD CONSTRAINT users_pending_or_complete CHECK (
      (email_verified_at IS NULL) = (terms_version IS NULL)
      AND (email_verified_at IS NULL) = (terms_accepted_at IS NULL)
      AND (password_hash IS NULL OR email_verified_at IS NOT NULL)
    )
  `.execute(db);

  await sql`
    CREATE TABLE accounts.identities (
      identity_id  uuid PRIMARY KEY,
      user_id      uuid NOT NULL REFERENCES accounts.users (user_id) ON DELETE CASCADE,
      provider     text NOT NULL,
      subject      text NOT NULL,
      created_at   timestamptz NOT NULL,
      last_used_at timestamptz NOT NULL,
      CONSTRAINT identities_provider_known CHECK (provider IN ('GOOGLE')),
      CONSTRAINT identities_subject_shape CHECK (length(subject) BETWEEN 1 AND 255),
      CONSTRAINT identities_provider_subject_unique UNIQUE (provider, subject),
      CONSTRAINT identities_user_provider_unique UNIQUE (user_id, provider)
    )
  `.execute(db);
}

/**
 * Refuses while any identity is stored, or while any complete account has no
 * password (the old constraint would reject it): a down migration must never
 * delete or break an account.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Kysely's Migration interface requires Kysely<any>.
export async function down(db: Kysely<any>): Promise<void> {
  const held = await sql<{ n: string }>`
    SELECT ((SELECT count(*) FROM accounts.identities)
          + (SELECT count(*) FROM accounts.users
              WHERE email_verified_at IS NOT NULL AND password_hash IS NULL))::text AS n
  `.execute(db);
  if (Number(held.rows[0]?.n ?? "0") > 0) {
    throw new Error(
      "refusing to undo 0032: Google identities or password-less accounts are stored (ADR-0033).",
    );
  }
  await sql`DROP TABLE accounts.identities`.execute(db);
  await sql`DELETE FROM accounts.email_tokens WHERE purpose = 'GOOGLE_TERMS'`.execute(db);
  await sql`ALTER TABLE accounts.users DROP CONSTRAINT users_pending_or_complete`.execute(db);
  await sql`
    ALTER TABLE accounts.users ADD CONSTRAINT users_pending_or_complete CHECK (
      (email_verified_at IS NULL) = (password_hash IS NULL)
      AND (email_verified_at IS NULL) = (terms_version IS NULL)
      AND (email_verified_at IS NULL) = (terms_accepted_at IS NULL)
    )
  `.execute(db);
  // An enum value cannot be dropped; `GOOGLE_TERMS` stays, unused.
}
