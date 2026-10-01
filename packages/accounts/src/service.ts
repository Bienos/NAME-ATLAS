import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import type { Kysely } from "kysely";
import { resetMail, verificationMail } from "./mail-text.js";
import type { Language, OutgoingMail } from "./mail-text.js";
import type { PasswordHasher } from "./password.js";
import type { AccountsDB, EmailTokenPurpose } from "./schema.js";
import { emailKey, hashToken, isTokenShape, newToken } from "./tokens.js";
import { checkEmail, checkPassword } from "./validation.js";
import type { PasswordProblem } from "./validation.js";

/**
 * Accounts (ADR-0027): sign-up, completing it, sign-in, sessions, password
 * reset and deletion, over schema `accounts`.
 *
 * **The order of sign-up is the security design.** The form takes an address and
 * nothing else. The password and the acceptance of the terms are given by the
 * person who follows the link in the mail, so they are the mailbox's owner's and
 * nobody else's. Had the password been set at the form, anyone could register
 * somebody else's address with a password they know and wait for its owner to
 * confirm it ("pre-hijacking"), and a stranger could tick the terms for them.
 *
 * What the service will not do is as important as what it does:
 *
 * - **It never sends mail.** A function that has a message to send returns it,
 *   and the route sends it after answering, so the provider's latency cannot tell
 *   a caller whether an address has an account.
 * - **It never says whether an address has an account.** Sign-up and reset
 *   answer the same either way; sign-in answers `REJECTED` for an unknown
 *   address, a pending one and a wrong password alike, and spends the same hash
 *   time on each.
 * - **It never stores a token.** Sessions and mail tokens are kept as their
 *   SHA-256.
 * - **It never logs.** There is nothing here to scrub.
 */

export const SESSION_DAYS = 30;
/** A session with less than this left is renewed when it is used. */
export const SESSION_RENEW_BELOW_DAYS = 15;
export const VERIFY_HOURS = 24;
export const RESET_HOURS = 1;
/** Mails of one kind sent to one existing account in an hour. */
export const MAIL_PER_HOUR = 3;
/** Failed sign-ins for one address in the window, after which sign-in is refused for it. */
export const FAILURES_MAX = 8;
export const FAILURES_WINDOW_MINUTES = 15;
/** Failure rows are deleted after this long. */
export const FAILURES_KEEP_HOURS = 1;
/** A pending account whose link was never followed is deleted after this long. */
export const PENDING_KEEP_DAYS = 7;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const MINUTE = 60_000;

export interface AccountLinks {
  /** The absolute address the sign-up mail links to, carrying the token. */
  verify(token: string, language: Language): string;
  /** The absolute address the reset mail links to, carrying the token. */
  reset(token: string, language: Language): string;
}

export interface AccountsDeps {
  readonly db: Kysely<AccountsDB>;
  readonly hasher: PasswordHasher;
  readonly links: AccountLinks;
  readonly now?: () => Date;
  readonly newId?: () => string;
  readonly newToken?: () => string;
}

export type SignUpResult =
  /** The same answer for a new address and an existing one. `mail` is null when there is none to send. */
  | { readonly kind: "CHECK_EMAIL"; readonly mail: OutgoingMail | null }
  | { readonly kind: "INVALID"; readonly problem: "EMAIL" };

export type CompleteProblem = "TERMS" | PasswordProblem;

export type CompleteResult =
  | {
      readonly kind: "SIGNED_IN";
      readonly userId: string;
      readonly sessionToken: string;
      readonly expiresAt: Date;
    }
  | { readonly kind: "INVALID_OR_EXPIRED" }
  /** A weak password, or the terms not accepted. The token is not spent, so the reader may try again. */
  | { readonly kind: "INVALID"; readonly problem: CompleteProblem };

export type SignInResult =
  | {
      readonly kind: "SIGNED_IN";
      readonly userId: string;
      readonly sessionToken: string;
      readonly expiresAt: Date;
    }
  /** Unknown address, pending account, or wrong password. */
  | { readonly kind: "REJECTED" }
  | { readonly kind: "THROTTLED" };

export interface Session {
  readonly userId: string;
  readonly email: string;
  readonly language: Language;
  readonly termsVersion: string;
  readonly termsAcceptedAt: Date;
  /** After any renewal: the cookie's lifetime should follow it. */
  readonly expiresAt: Date;
}

export type ResetResult =
  | { readonly kind: "OK" }
  | { readonly kind: "INVALID_OR_EXPIRED" }
  | { readonly kind: "INVALID"; readonly problem: PasswordProblem };

export type DeleteResult =
  | { readonly kind: "DELETED" }
  | { readonly kind: "WRONG_PASSWORD" }
  | { readonly kind: "NOT_FOUND" };

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" && error !== null && (error as { code?: unknown }).code === "23505"
  );
}

export function createAccounts(deps: AccountsDeps) {
  const { db, hasher, links } = deps;
  const now = deps.now ?? (() => new Date());
  const newId = deps.newId ?? randomUUID;
  const makeToken = deps.newToken ?? (() => newToken());
  const after = (from: Date, ms: number) => new Date(from.getTime() + ms);

  /** A hash made once, to spend the same time on an unknown address as on a known one. */
  let dummy: Promise<string> | undefined;
  const dummyHash = () => (dummy ??= hasher.hash("a password nobody has chosen"));

  async function recentTokens(
    userId: string,
    purpose: EmailTokenPurpose,
    at: Date,
  ): Promise<number> {
    const row = await db
      .selectFrom("email_tokens")
      .select(sql<number>`count(*)::int`.as("n"))
      .where("user_id", "=", userId)
      .where("purpose", "=", purpose)
      .where("created_at", ">", after(at, -HOUR))
      .executeTakeFirstOrThrow();
    return row.n;
  }

  async function issueToken(
    userId: string,
    purpose: EmailTokenPurpose,
    at: Date,
    lifetimeMs: number,
  ): Promise<string> {
    const token = makeToken();
    await db
      .insertInto("email_tokens")
      .values({
        token_id: newId(),
        user_id: userId,
        purpose,
        token_hash: hashToken(token),
        created_at: at,
        expires_at: after(at, lifetimeMs),
        used_at: null,
      })
      .execute();
    return token;
  }

  async function startSession(userId: string, at: Date) {
    const token = makeToken();
    const expiresAt = after(at, SESSION_DAYS * DAY);
    await db
      .insertInto("sessions")
      .values({
        session_id: newId(),
        user_id: userId,
        token_hash: hashToken(token),
        created_at: at,
        last_used_at: at,
        expires_at: expiresAt,
      })
      .execute();
    return { token, expiresAt };
  }

  return {
    /**
     * Takes an address and, for one with no complete account, returns the message
     * that lets its owner finish. For one that has an account it returns the same
     * answer with no message, so the form cannot be used to mail someone else.
     */
    async signUp(input: {
      readonly email: string;
      readonly language: Language;
    }): Promise<SignUpResult> {
      const email = checkEmail(input.email);
      if (!email.ok) return { kind: "INVALID", problem: "EMAIL" };
      const language: Language = input.language === "en" ? "en" : "pl";
      const at = now();

      const existing = await db
        .selectFrom("users")
        .select(["user_id", "email_verified_at"])
        .where("email_normalised", "=", email.normalised)
        .executeTakeFirst();

      let userId: string;
      if (existing === undefined) {
        userId = newId();
        try {
          await db
            .insertInto("users")
            .values({
              user_id: userId,
              email: email.email,
              email_normalised: email.normalised,
              language,
              password_hash: null,
              email_verified_at: null,
              terms_version: null,
              terms_accepted_at: null,
              created_at: at,
              updated_at: at,
              last_sign_in_at: null,
            })
            .execute();
        } catch (error) {
          // A concurrent sign-up for the same address won: it sends the message.
          if (isUniqueViolation(error)) return { kind: "CHECK_EMAIL", mail: null };
          throw error;
        }
      } else if (existing.email_verified_at === null) {
        // Pending: another message, unless three went out in the last hour.
        userId = existing.user_id;
        if ((await recentTokens(userId, "VERIFY_EMAIL", at)) >= MAIL_PER_HOUR) {
          return { kind: "CHECK_EMAIL", mail: null };
        }
        await db
          .updateTable("users")
          .set({ language, updated_at: at })
          .where("user_id", "=", userId)
          .execute();
      } else {
        // Complete: nothing is sent.
        return { kind: "CHECK_EMAIL", mail: null };
      }

      const token = await issueToken(userId, "VERIFY_EMAIL", at, VERIFY_HOURS * HOUR);
      return {
        kind: "CHECK_EMAIL",
        mail: verificationMail(email.email, language, links.verify(token, language)),
      };
    },

    /**
     * The mailbox's owner finishes sign-up: they choose a password and accept the
     * terms, which confirms the address and signs them in. A weak password or
     * unaccepted terms are refused without spending the token.
     */
    async completeSignUp(input: {
      readonly token: unknown;
      readonly password: string;
      readonly termsVersion: string;
      readonly termsAccepted: boolean;
    }): Promise<CompleteResult> {
      if (!isTokenShape(input.token)) return { kind: "INVALID_OR_EXPIRED" };
      const at = now();

      const found = await db
        .selectFrom("email_tokens as t")
        .innerJoin("users as u", "u.user_id", "t.user_id")
        .select(["t.token_id", "u.user_id", "u.email_normalised"])
        .where("t.token_hash", "=", hashToken(input.token))
        .where("t.purpose", "=", "VERIFY_EMAIL")
        .where("t.used_at", "is", null)
        .where("t.expires_at", ">", at)
        .where("u.email_verified_at", "is", null)
        .executeTakeFirst();
      if (found === undefined) return { kind: "INVALID_OR_EXPIRED" };

      if (!input.termsAccepted) return { kind: "INVALID", problem: "TERMS" };
      const problem = checkPassword(input.password, found.email_normalised);
      if (problem !== null) return { kind: "INVALID", problem };
      const passwordHash = await hasher.hash(input.password);

      const completed = await db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("email_tokens")
          .select(["token_id", "user_id"])
          .where("token_id", "=", found.token_id)
          .where("used_at", "is", null)
          .forUpdate()
          .executeTakeFirst();
        if (row === undefined) return false;
        await trx
          .updateTable("users")
          .set({
            password_hash: passwordHash,
            email_verified_at: at,
            terms_version: input.termsVersion,
            terms_accepted_at: at,
            last_sign_in_at: at,
            updated_at: at,
          })
          .where("user_id", "=", row.user_id)
          .execute();
        // Every unspent token of the user is spent, this one included.
        await trx
          .updateTable("email_tokens")
          .set({ used_at: at })
          .where("user_id", "=", row.user_id)
          .where("used_at", "is", null)
          .execute();
        return true;
      });
      if (!completed) return { kind: "INVALID_OR_EXPIRED" };

      const session = await startSession(found.user_id, at);
      return {
        kind: "SIGNED_IN",
        userId: found.user_id,
        sessionToken: session.token,
        expiresAt: session.expiresAt,
      };
    },

    /**
     * Signs in. Eight failures for one address in 15 minutes refuse it for the
     * rest of the window, whether or not the address has an account.
     */
    async signIn(input: {
      readonly email: string;
      readonly password: string;
    }): Promise<SignInResult> {
      const checked = checkEmail(input.email);
      // The throttle's key is the address as far as it can be read, so a
      // malformed one is throttled too.
      const normalised = checked.ok
        ? checked.normalised
        : String(input.email).trim().toLowerCase().slice(0, 254);
      const key = emailKey(normalised);
      const at = now();

      const failures = await db
        .selectFrom("sign_in_failures")
        .select(sql<number>`count(*)::int`.as("n"))
        .where("email_hash", "=", key)
        .where("failed_at", ">", after(at, -FAILURES_WINDOW_MINUTES * MINUTE))
        .executeTakeFirstOrThrow();
      if (failures.n >= FAILURES_MAX) return { kind: "THROTTLED" };

      const user = checked.ok
        ? await db
            .selectFrom("users")
            .selectAll()
            .where("email_normalised", "=", checked.normalised)
            .executeTakeFirst()
        : undefined;

      // A pending account has no password: it is verified against the dummy, as
      // an unknown address is, and fails the same way.
      const stored = user?.password_hash ?? (await dummyHash());
      const correct = await hasher.verify(stored, input.password);

      if (user === undefined || user.password_hash === null || !correct) {
        await db
          .deleteFrom("sign_in_failures")
          .where("failed_at", "<", after(at, -FAILURES_KEEP_HOURS * HOUR))
          .execute();
        await db
          .insertInto("sign_in_failures")
          .values({ email_hash: key, failed_at: at })
          .execute();
        return { kind: "REJECTED" };
      }

      await db.deleteFrom("sign_in_failures").where("email_hash", "=", key).execute();
      const session = await startSession(user.user_id, at);
      await db
        .updateTable("users")
        .set({
          last_sign_in_at: at,
          // A hash made with weaker parameters than today's is replaced now,
          // while the password is in hand.
          ...(hasher.needsRehash(user.password_hash)
            ? { password_hash: await hasher.hash(input.password), updated_at: at }
            : {}),
        })
        .where("user_id", "=", user.user_id)
        .execute();
      return {
        kind: "SIGNED_IN",
        userId: user.user_id,
        sessionToken: session.token,
        expiresAt: session.expiresAt,
      };
    },

    /** The session a cookie's token names, renewed when it is past half-life; null for none. */
    async sessionFromToken(token: unknown): Promise<Session | null> {
      if (!isTokenShape(token)) return null;
      const at = now();
      const row = await db
        .selectFrom("sessions as s")
        .innerJoin("users as u", "u.user_id", "s.user_id")
        .select([
          "s.session_id",
          "s.expires_at",
          "u.user_id",
          "u.email",
          "u.language",
          "u.terms_version",
          "u.terms_accepted_at",
        ])
        .where("s.token_hash", "=", hashToken(token))
        .where("s.expires_at", ">", at)
        .where("u.email_verified_at", "is not", null)
        .executeTakeFirst();
      // A session exists only for a complete account, so the terms are set.
      if (row === undefined || row.terms_version === null || row.terms_accepted_at === null) {
        return null;
      }

      let expiresAt = row.expires_at;
      if (expiresAt.getTime() - at.getTime() < SESSION_RENEW_BELOW_DAYS * DAY) {
        expiresAt = after(at, SESSION_DAYS * DAY);
        await db
          .updateTable("sessions")
          .set({ expires_at: expiresAt, last_used_at: at })
          .where("session_id", "=", row.session_id)
          .execute();
      }
      return {
        userId: row.user_id,
        email: row.email,
        language: row.language,
        termsVersion: row.terms_version,
        termsAcceptedAt: row.terms_accepted_at,
        expiresAt,
      };
    },

    /** Ends the session a token names. A token that names none is not an error. */
    async signOut(token: unknown): Promise<void> {
      if (!isTokenShape(token)) return;
      await db.deleteFrom("sessions").where("token_hash", "=", hashToken(token)).execute();
    },

    /**
     * Returns the reset message for a complete account, and null otherwise or
     * when three went out in the last hour. The caller cannot tell the two apart.
     */
    async requestPasswordReset(input: {
      readonly email: string;
      readonly language: Language;
    }): Promise<{ readonly mail: OutgoingMail | null }> {
      const checked = checkEmail(input.email);
      if (!checked.ok) return { mail: null };
      const user = await db
        .selectFrom("users")
        .select(["user_id", "email", "email_verified_at"])
        .where("email_normalised", "=", checked.normalised)
        .executeTakeFirst();
      if (user === undefined || user.email_verified_at === null) return { mail: null };
      const at = now();
      if ((await recentTokens(user.user_id, "RESET_PASSWORD", at)) >= MAIL_PER_HOUR) {
        return { mail: null };
      }
      const language: Language = input.language === "en" ? "en" : "pl";
      // One live reset link at a time: an older one is spent.
      await db
        .updateTable("email_tokens")
        .set({ used_at: at })
        .where("user_id", "=", user.user_id)
        .where("purpose", "=", "RESET_PASSWORD")
        .where("used_at", "is", null)
        .execute();
      const token = await issueToken(user.user_id, "RESET_PASSWORD", at, RESET_HOURS * HOUR);
      return { mail: resetMail(user.email, language, links.reset(token, language)) };
    },

    /**
     * Sets a new password with a reset token and ends every session of the user,
     * so whoever held the old password is signed out. A weak password is refused
     * without spending the token, so the reader can try again.
     */
    async resetPassword(input: {
      readonly token: unknown;
      readonly newPassword: string;
    }): Promise<ResetResult> {
      if (!isTokenShape(input.token)) return { kind: "INVALID_OR_EXPIRED" };
      const at = now();

      const found = await db
        .selectFrom("email_tokens as t")
        .innerJoin("users as u", "u.user_id", "t.user_id")
        .select(["t.token_id", "u.user_id", "u.email_normalised"])
        .where("t.token_hash", "=", hashToken(input.token))
        .where("t.purpose", "=", "RESET_PASSWORD")
        .where("t.used_at", "is", null)
        .where("t.expires_at", ">", at)
        .where("u.email_verified_at", "is not", null)
        .executeTakeFirst();
      if (found === undefined) return { kind: "INVALID_OR_EXPIRED" };

      const problem = checkPassword(input.newPassword, found.email_normalised);
      if (problem !== null) return { kind: "INVALID", problem };
      const passwordHash = await hasher.hash(input.newPassword);

      return db.transaction().execute(async (trx) => {
        const row = await trx
          .selectFrom("email_tokens")
          .select(["token_id", "user_id"])
          .where("token_id", "=", found.token_id)
          .where("used_at", "is", null)
          .forUpdate()
          .executeTakeFirst();
        if (row === undefined) return { kind: "INVALID_OR_EXPIRED" } as const;
        await trx
          .updateTable("users")
          .set({ password_hash: passwordHash, updated_at: at })
          .where("user_id", "=", row.user_id)
          .execute();
        await trx
          .updateTable("email_tokens")
          .set({ used_at: at })
          .where("user_id", "=", row.user_id)
          .where("used_at", "is", null)
          .execute();
        await trx.deleteFrom("sessions").where("user_id", "=", row.user_id).execute();
        return { kind: "OK" } as const;
      });
    },

    /** Deletes the account and, by cascade, its sessions and tokens, once the password is confirmed. */
    async deleteAccount(input: {
      readonly userId: string;
      readonly password: string;
    }): Promise<DeleteResult> {
      const user = await db
        .selectFrom("users")
        .select(["user_id", "password_hash"])
        .where("user_id", "=", input.userId)
        .executeTakeFirst();
      if (user === undefined || user.password_hash === null) return { kind: "NOT_FOUND" };
      if (!(await hasher.verify(user.password_hash, input.password))) {
        return { kind: "WRONG_PASSWORD" };
      }
      await db.deleteFrom("users").where("user_id", "=", user.user_id).execute();
      return { kind: "DELETED" };
    },

    /**
     * Removes what has expired: sessions, week-old tokens, hour-old failures, and
     * pending accounts whose link was never followed and has lapsed. It is for a
     * scheduled job, and the retention the privacy notice will state for a pending
     * address (7 days, `PENDING_KEEP_DAYS`) holds only while that job runs at least
     * daily (TASK-062).
     */
    async purgeExpired(): Promise<{
      readonly sessions: number;
      readonly tokens: number;
      readonly failures: number;
      readonly pending: number;
    }> {
      const at = now();
      const sessions = await db
        .deleteFrom("sessions")
        .where("expires_at", "<", at)
        .executeTakeFirst();
      const tokens = await db
        .deleteFrom("email_tokens")
        .where("expires_at", "<", after(at, -7 * DAY))
        .executeTakeFirst();
      const failures = await db
        .deleteFrom("sign_in_failures")
        .where("failed_at", "<", after(at, -FAILURES_KEEP_HOURS * HOUR))
        .executeTakeFirst();
      // A pending address is personal data kept for no purpose once its link has
      // lapsed. One with a live link is left alone, however old the row.
      const pending = await db
        .deleteFrom("users")
        .where("email_verified_at", "is", null)
        .where("created_at", "<", after(at, -PENDING_KEEP_DAYS * DAY))
        .where(({ not, exists, selectFrom }) =>
          not(
            exists(
              selectFrom("email_tokens as t")
                .select("t.token_id")
                .whereRef("t.user_id", "=", "users.user_id")
                .where("t.used_at", "is", null)
                .where("t.expires_at", ">", at),
            ),
          ),
        )
        .executeTakeFirst();
      return {
        sessions: Number(sessions.numDeletedRows),
        tokens: Number(tokens.numDeletedRows),
        failures: Number(failures.numDeletedRows),
        pending: Number(pending.numDeletedRows),
      };
    },
  };
}

export type Accounts = ReturnType<typeof createAccounts>;
