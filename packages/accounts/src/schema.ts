import { Kysely, PostgresDialect } from "kysely";
import type { createPool } from "@name-atlas/db";
import type { Language } from "./mail-text.js";

/**
 * The tables of schema `accounts` (migration 0027), typed by hand.
 *
 * Not generated: `pnpm db:generate-types` reads `public.*` only, and these tables
 * are deliberately outside it, so the register's types and the register's role
 * never see them (ADR-0027 §2.2).
 */

export interface UsersTable {
  user_id: string;
  email: string;
  email_normalised: string;
  language: Language;
  /** Null while the account is pending: set, with the next three, when the mailbox's owner completes it. */
  password_hash: string | null;
  email_verified_at: Date | null;
  terms_version: string | null;
  terms_accepted_at: Date | null;
  created_at: Date;
  updated_at: Date;
  last_sign_in_at: Date | null;
}

export interface SessionsTable {
  session_id: string;
  user_id: string;
  token_hash: Buffer;
  created_at: Date;
  last_used_at: Date;
  expires_at: Date;
}

export type EmailTokenPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD";

export interface EmailTokensTable {
  token_id: string;
  user_id: string;
  purpose: EmailTokenPurpose;
  token_hash: Buffer;
  created_at: Date;
  expires_at: Date;
  used_at: Date | null;
}

export interface SignInFailuresTable {
  email_hash: Buffer;
  failed_at: Date;
}

export interface AccountsDB {
  users: UsersTable;
  sessions: SessionsTable;
  email_tokens: EmailTokensTable;
  sign_in_failures: SignInFailuresTable;
}

/**
 * The typed Kysely instance over the accounts pool, with every table in schema
 * `accounts`. The pool must be the accounts role's (`ACCOUNTS_DATABASE_URL`),
 * never the read-only one.
 */
export function createAccountsDb(pool: ReturnType<typeof createPool>): Kysely<AccountsDB> {
  return new Kysely<AccountsDB>({ dialect: new PostgresDialect({ pool }) }).withSchema("accounts");
}
