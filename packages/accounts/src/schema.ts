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
  /**
   * Null while the account is pending, and for a complete one made through
   * Google until its owner sets a password by the reset mail (migration 0032).
   */
  password_hash: string | null;
  /** Set, with the two terms columns, when the account is completed. */
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

/** `GOOGLE_TERMS` (migration 0032) carries a first Google sign-in to the terms step; it is never mailed. */
export type EmailTokenPurpose = "VERIFY_EMAIL" | "RESET_PASSWORD" | "GOOGLE_TERMS";

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

/** An outside account that may sign a user in (migration 0032, ADR-0033). Only Google today. */
export interface IdentitiesTable {
  identity_id: string;
  user_id: string;
  provider: "GOOGLE";
  /** Google's `sub`: stable, never the address. */
  subject: string;
  created_at: Date;
  last_used_at: Date;
}

/** What a reader bought (migration 0035, TASK-111): one row per paid test-mode Checkout Session. */
export interface PurchasesTable {
  purchase_id: string;
  /** Null once the account is deleted; the record of the sale stays. */
  user_id: string | null;
  tier: PurchaseTier;
  checkout_session_id: string;
  /** In grosze, VAT included. */
  amount_total: number;
  currency: "pln";
  /** Always false: the table refuses a live purchase (ADR-0023 §2.5). */
  livemode: boolean;
  paid_at: Date;
}

/** The sellable tiers of ADR-0037; the 800 zł tier is not sold yet. */
export type PurchaseTier = "smaller" | "couple" | "family";

export interface AccountsDB {
  identities: IdentitiesTable;
  purchases: PurchasesTable;
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
