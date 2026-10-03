import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Kysely, PostgresDialect, sql } from "kysely";
import { createMigrator, createPool } from "@name-atlas/db";
import { migrateTestDatabase, startTestDatabase } from "@name-atlas/testing";
import type { TestDatabase } from "@name-atlas/testing";
import {
  createAccounts,
  createAccountsDb,
  createPasswordHasher,
  emailKey,
  FAILURES_MAX,
  hashToken,
  MAIL_PER_HOUR,
  SESSION_DAYS,
} from "@name-atlas/accounts";
import type { AccountsDB, OutgoingMail, PasswordHasher } from "@name-atlas/accounts";

/**
 * TASK-061: accounts over a real PostgreSQL, as the role that will run them.
 *
 * Everything below goes through a connection that logs in as `nameatlas_app`,
 * created by `ops/vm/accounts-roles.sql` — the file `provision.sh` will run, not
 * a copy — so a flow that passes here passes with the grants that ship.
 *
 * The clock is a variable the service reads (`deps.now`), not fake timers:
 * those would stall the database driver. Every address and password here is
 * invented.
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ROLES_SQL = readFileSync(path.join(repoRoot, "ops/vm/accounts-roles.sql"), "utf8");

const APP_PASSWORD = "app-role-test-password";
const WEB_PASSWORD = "web-role-test-password";
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const GOOD = "mój kot ma na imię burek";
const TERMS = "2026-10-01";

function urlAs(connectionUri: string, user: string, password: string): string {
  const url = new URL(connectionUri);
  url.username = user;
  url.password = password;
  return url.toString();
}

function tokenOf(mail: OutgoingMail | null): string {
  const found = /token=([A-Za-z0-9_-]{43})/u.exec(mail?.text ?? "");
  if (found?.[1] === undefined) throw new Error("the message has no token");
  return found[1];
}

describe("accounts (TASK-061, ADR-0027)", () => {
  let database: TestDatabase | undefined;
  let appPool: ReturnType<typeof createPool> | undefined;
  let webPool: ReturnType<typeof createPool> | undefined;
  let clock = new Date("2026-10-01T12:00:00.000Z");
  const advance = (ms: number) => {
    clock = new Date(clock.getTime() + ms);
  };

  const db = (): TestDatabase => {
    if (!database) throw new Error("test database was not started");
    return database;
  };
  const app = (): ReturnType<typeof createPool> => {
    if (!appPool) throw new Error("app pool was not started");
    return appPool;
  };

  // Cheap scrypt for the many hashes below, counted so a test can see how many
  // verifications an outcome costs.
  const base = createPasswordHasher({ N: 1_024, r: 8, p: 1 });
  const verifyCalls: string[] = [];
  const hasher: PasswordHasher = {
    hash: (password) => base.hash(password),
    verify: (stored, password) => {
      verifyCalls.push(stored);
      return base.verify(stored, password);
    },
    needsRehash: (stored) => base.needsRehash(stored),
  };
  const links = {
    verify: (token: string, language: string) =>
      `https://test.example/${language}/account/create?token=${token}`,
    reset: (token: string, language: string) =>
      `https://test.example/${language}/account/reset?token=${token}`,
  };

  let accounts: ReturnType<typeof createAccounts>;
  const rows = async <T>(text: string, values: unknown[] = []): Promise<T[]> =>
    (await db().pool.query(text, values)).rows as T[];

  /** Signs an address up and completes it: a complete account, signed out. */
  async function account(email: string, password = GOOD): Promise<string> {
    const signUp = await accounts.signUp({ email, language: "pl" });
    if (signUp.kind !== "CHECK_EMAIL") throw new Error("sign-up refused");
    const done = await accounts.completeSignUp({
      token: tokenOf(signUp.mail),
      password,
      termsVersion: TERMS,
      termsAccepted: true,
    });
    if (done.kind !== "SIGNED_IN") throw new Error("completion refused");
    await accounts.signOut(done.sessionToken);
    return done.userId;
  }

  beforeAll(async () => {
    database = await startTestDatabase();
    await migrateTestDatabase(database);

    // What provision.sh has made by the time it runs the roles file: the build
    // role and the read-only web role, with the web role's grants on `public`.
    await sql`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nameatlas') THEN
          CREATE ROLE nameatlas;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'nameatlas_web') THEN
          CREATE ROLE nameatlas_web LOGIN;
        END IF;
      END
      $$
    `.execute(db().db);
    await sql.raw(`ALTER ROLE nameatlas_web PASSWORD '${WEB_PASSWORD}'`).execute(db().db);
    await sql`
      DO $$
      BEGIN
        EXECUTE format('GRANT CONNECT ON DATABASE %I TO nameatlas_web', current_database());
      END
      $$
    `.execute(db().db);
    await sql`GRANT USAGE ON SCHEMA public TO nameatlas_web`.execute(db().db);
    await sql`GRANT SELECT ON ALL TABLES IN SCHEMA public TO nameatlas_web`.execute(db().db);

    // The file under test.
    await sql.raw(ROLES_SQL).execute(db().db);
    await sql.raw(`ALTER ROLE nameatlas_app PASSWORD '${APP_PASSWORD}'`).execute(db().db);

    appPool = createPool({
      databaseUrl: urlAs(db().connectionUri, "nameatlas_app", APP_PASSWORD),
    });
    webPool = createPool({
      databaseUrl: urlAs(db().connectionUri, "nameatlas_web", WEB_PASSWORD),
    });
    accounts = createAccounts({
      db: createAccountsDb(appPool),
      hasher,
      links,
      now: () => clock,
    });
  });

  afterAll(async () => {
    await appPool?.end();
    await webPool?.end();
    await database?.stop();
  });

  describe("sign-up and completing it", () => {
    it("takes an address only, and stores a pending user with no password and no terms (AC-1)", async () => {
      const result = await accounts.signUp({
        email: "  Anna.Pending@Example.com ",
        language: "pl",
      });
      expect(result.kind).toBe("CHECK_EMAIL");
      if (result.kind !== "CHECK_EMAIL") return;
      expect(result.mail?.to).toBe("Anna.Pending@Example.com");
      expect(result.mail?.subject).toMatch(/Potwierdź/u);
      expect(result.mail?.text).toContain("https://test.example/pl/account/create?token=");

      const [user] = await rows<Record<string, unknown>>(
        "SELECT * FROM accounts.users WHERE email_normalised = 'anna.pending@example.com'",
      );
      expect(user).toMatchObject({
        email: "Anna.Pending@Example.com",
        language: "pl",
        password_hash: null,
        email_verified_at: null,
        terms_version: null,
        terms_accepted_at: null,
        last_sign_in_at: null,
      });
    });

    it("refuses an address that cannot be one, and stores nothing", async () => {
      const before = await rows<{ n: string }>("SELECT count(*)::text AS n FROM accounts.users");
      expect(await accounts.signUp({ email: "not-an-address", language: "pl" })).toEqual({
        kind: "INVALID",
        problem: "EMAIL",
      });
      const after = await rows<{ n: string }>("SELECT count(*)::text AS n FROM accounts.users");
      expect(after).toEqual(before);
    });

    it("keeps no token, only its SHA-256 (AC-2)", async () => {
      const result = await accounts.signUp({ email: "hashed.token@example.com", language: "en" });
      if (result.kind !== "CHECK_EMAIL") throw new Error("sign-up refused");
      const token = tokenOf(result.mail);
      const dump = await rows<{ row: string }>(
        "SELECT row_to_json(t)::text AS row FROM accounts.email_tokens t",
      );
      expect(dump.some((r) => r.row.includes(token))).toBe(false);
      const stored = await rows<{ token_hash: Buffer }>(
        "SELECT token_hash FROM accounts.email_tokens WHERE token_hash = $1",
        [hashToken(token)],
      );
      expect(stored).toHaveLength(1);
      expect(result.mail?.text).toContain("terms");
    });

    it("answers the same, with no message, for an address that has a complete account (AC-1)", async () => {
      await account("complete.one@example.com");
      const usersBefore = await rows<{ n: string }>(
        "SELECT count(*)::text AS n FROM accounts.users",
      );
      const tokensBefore = await rows<{ n: string }>(
        "SELECT count(*)::text AS n FROM accounts.email_tokens",
      );
      const again = await accounts.signUp({ email: "COMPLETE.one@example.com", language: "pl" });
      expect(again).toEqual({ kind: "CHECK_EMAIL", mail: null });
      expect(await rows("SELECT count(*)::text AS n FROM accounts.users")).toEqual(usersBefore);
      expect(await rows("SELECT count(*)::text AS n FROM accounts.email_tokens")).toEqual(
        tokensBefore,
      );
    });

    it("sends a pending address a fresh message, at most three an hour (AC-1)", async () => {
      const email = "three.an.hour@example.com";
      for (let i = 0; i < MAIL_PER_HOUR; i++) {
        const result = await accounts.signUp({ email, language: "pl" });
        expect(result.kind === "CHECK_EMAIL" && result.mail !== null, `mail ${String(i + 1)}`).toBe(
          true,
        );
      }
      expect(await accounts.signUp({ email, language: "pl" })).toEqual({
        kind: "CHECK_EMAIL",
        mail: null,
      });
      advance(61 * MINUTE);
      const later = await accounts.signUp({ email, language: "en" });
      expect(later.kind === "CHECK_EMAIL" && later.mail !== null).toBe(true);
      // The latest language is the one the next message uses.
      const [user] = await rows<{ language: string }>(
        "SELECT language FROM accounts.users WHERE email_normalised = $1",
        [email],
      );
      expect(user?.language).toBe("en");
    });

    it("finishes with a password and the terms, signs in, and spends the token once (AC-2)", async () => {
      const result = await accounts.signUp({ email: "finish@example.com", language: "pl" });
      if (result.kind !== "CHECK_EMAIL") throw new Error("sign-up refused");
      const token = tokenOf(result.mail);

      const done = await accounts.completeSignUp({
        token,
        password: GOOD,
        termsVersion: TERMS,
        termsAccepted: true,
      });
      expect(done.kind).toBe("SIGNED_IN");
      if (done.kind !== "SIGNED_IN") return;
      expect(done.expiresAt.getTime()).toBe(clock.getTime() + SESSION_DAYS * DAY);

      const [user] = await rows<Record<string, unknown>>(
        "SELECT * FROM accounts.users WHERE email_normalised = 'finish@example.com'",
      );
      expect(user?.["password_hash"]).toMatch(/^scrypt\$N=1024,r=8,p=1\$/u);
      expect(user?.["email_verified_at"]).toEqual(clock);
      expect(user?.["terms_version"]).toBe(TERMS);
      expect(user?.["terms_accepted_at"]).toEqual(clock);
      expect(user?.["last_sign_in_at"]).toEqual(clock);

      // Spent: marked so, and the same link does nothing a second time.
      const unspent = await rows<{ n: string }>(
        "SELECT count(*)::text AS n FROM accounts.email_tokens WHERE user_id = $1 AND used_at IS NULL",
        [done.userId],
      );
      expect(unspent[0]?.n).toBe("0");
      expect(
        await accounts.completeSignUp({
          token,
          password: GOOD,
          termsVersion: TERMS,
          termsAccepted: true,
        }),
      ).toEqual({ kind: "INVALID_OR_EXPIRED" });
    });

    it("refuses a weak password or unaccepted terms without spending the token (AC-2)", async () => {
      const result = await accounts.signUp({ email: "retry@example.com", language: "pl" });
      if (result.kind !== "CHECK_EMAIL") throw new Error("sign-up refused");
      const token = tokenOf(result.mail);
      expect(
        await accounts.completeSignUp({
          token,
          password: "short",
          termsVersion: TERMS,
          termsAccepted: true,
        }),
      ).toEqual({ kind: "INVALID", problem: "TOO_SHORT" });
      expect(
        await accounts.completeSignUp({
          token,
          password: "retry@example.com",
          termsVersion: TERMS,
          termsAccepted: true,
        }),
      ).toEqual({ kind: "INVALID", problem: "SAME_AS_EMAIL" });
      expect(
        await accounts.completeSignUp({
          token,
          password: GOOD,
          termsVersion: TERMS,
          termsAccepted: false,
        }),
      ).toEqual({ kind: "INVALID", problem: "TERMS" });
      const [still] = await rows<{ password_hash: string | null }>(
        "SELECT password_hash FROM accounts.users WHERE email_normalised = 'retry@example.com'",
      );
      expect(still?.password_hash).toBeNull();
      expect(
        (
          await accounts.completeSignUp({
            token,
            password: GOOD,
            termsVersion: TERMS,
            termsAccepted: true,
          })
        ).kind,
      ).toBe("SIGNED_IN");
    });

    it("refuses an expired, unknown or other-purpose token (AC-2)", async () => {
      const result = await accounts.signUp({ email: "expiring@example.com", language: "pl" });
      if (result.kind !== "CHECK_EMAIL") throw new Error("sign-up refused");
      const token = tokenOf(result.mail);
      advance(25 * HOUR);
      expect(
        await accounts.completeSignUp({
          token,
          password: GOOD,
          termsVersion: TERMS,
          termsAccepted: true,
        }),
      ).toEqual({ kind: "INVALID_OR_EXPIRED" });
      expect(
        await accounts.completeSignUp({
          token: "A".repeat(43),
          password: GOOD,
          termsVersion: TERMS,
          termsAccepted: true,
        }),
      ).toEqual({ kind: "INVALID_OR_EXPIRED" });

      // A reset link cannot complete a sign-up, and a sign-up link cannot reset a password.
      await account("purposes@example.com");
      const reset = await accounts.requestPasswordReset({
        email: "purposes@example.com",
        language: "pl",
      });
      const pending = await accounts.signUp({
        email: "purposes.pending@example.com",
        language: "pl",
      });
      if (pending.kind !== "CHECK_EMAIL") throw new Error("sign-up refused");
      expect(
        await accounts.completeSignUp({
          token: tokenOf(reset.mail),
          password: GOOD,
          termsVersion: TERMS,
          termsAccepted: true,
        }),
      ).toEqual({ kind: "INVALID_OR_EXPIRED" });
      expect(
        await accounts.resetPassword({ token: tokenOf(pending.mail), newPassword: GOOD }),
      ).toEqual({
        kind: "INVALID_OR_EXPIRED",
      });
    });

    it("lets nobody take an address they do not control (AC-3a)", async () => {
      const victim = "victim@example.com";
      // The attacker's whole power over the form is to have a message sent to the owner.
      const attack = await accounts.signUp({ email: victim, language: "pl" });
      expect(attack.kind).toBe("CHECK_EMAIL");
      for (const guess of [GOOD, "password123456", "attacker-chosen-pw-1"]) {
        expect(await accounts.signIn({ email: victim, password: guess })).toEqual({
          kind: "REJECTED",
        });
      }
      const [pending] = await rows<{
        password_hash: string | null;
        email_verified_at: Date | null;
      }>(
        "SELECT password_hash, email_verified_at FROM accounts.users WHERE email_normalised = $1",
        [victim],
      );
      expect(pending).toEqual({ password_hash: null, email_verified_at: null });

      // The owner follows the link and chooses their own password.
      const ownerLink = await accounts.signUp({ email: victim, language: "pl" });
      const done = await accounts.completeSignUp({
        token: tokenOf(ownerLink.kind === "CHECK_EMAIL" ? ownerLink.mail : null),
        password: "the owner's own passphrase",
        termsVersion: TERMS,
        termsAccepted: true,
      });
      expect(done.kind).toBe("SIGNED_IN");
      expect(
        (await accounts.signIn({ email: victim, password: "the owner's own passphrase" })).kind,
      ).toBe("SIGNED_IN");
      expect(await accounts.signIn({ email: victim, password: GOOD })).toEqual({
        kind: "REJECTED",
      });

      // Once complete, another sign-up changes nothing.
      const [before] = await rows<{ password_hash: string }>(
        "SELECT password_hash FROM accounts.users WHERE email_normalised = $1",
        [victim],
      );
      await accounts.signUp({ email: victim, language: "en" });
      const [after] = await rows<{ password_hash: string }>(
        "SELECT password_hash FROM accounts.users WHERE email_normalised = $1",
        [victim],
      );
      expect(after).toEqual(before);
    });
  });

  describe("signing in", () => {
    it("rejects an unknown address, a pending one and a wrong password alike, and verifies a hash each time (AC-3)", async () => {
      await account("signin.known@example.com");
      await accounts.signUp({ email: "signin.pending@example.com", language: "pl" });
      const cases: [string, string][] = [
        ["signin.ghost@example.com", GOOD],
        ["signin.pending@example.com", GOOD],
        ["signin.known@example.com", "the wrong password"],
        ["not-an-address", GOOD],
      ];
      for (const [email, password] of cases) {
        const before = verifyCalls.length;
        expect(await accounts.signIn({ email, password }), email).toEqual({ kind: "REJECTED" });
        // One verification each, against a real hash or the dummy: the time says nothing.
        expect(verifyCalls.length - before, email).toBe(1);
      }
      const before = verifyCalls.length;
      const ok = await accounts.signIn({ email: "signin.known@example.com", password: GOOD });
      expect(ok.kind).toBe("SIGNED_IN");
      expect(verifyCalls.length - before).toBe(1);
    });

    it("refuses sign-in after eight failures for an address in 15 minutes, known or not (AC-3)", async () => {
      await account("throttled@example.com");
      for (let i = 0; i < FAILURES_MAX; i++) {
        expect(
          await accounts.signIn({ email: "throttled@example.com", password: `wrong-${String(i)}` }),
        ).toEqual({
          kind: "REJECTED",
        });
      }
      // Even the right password is refused for the rest of the window.
      expect(await accounts.signIn({ email: "throttled@example.com", password: GOOD })).toEqual({
        kind: "THROTTLED",
      });
      // The same for an address with no account, so the throttle says nothing about existence.
      for (let i = 0; i < FAILURES_MAX; i++) {
        await accounts.signIn({
          email: "nobody.at.all@example.com",
          password: `wrong-${String(i)}`,
        });
      }
      expect(await accounts.signIn({ email: "nobody.at.all@example.com", password: GOOD })).toEqual(
        {
          kind: "THROTTLED",
        },
      );
      // Not for anyone else.
      await account("unaffected@example.com");
      expect(
        (await accounts.signIn({ email: "unaffected@example.com", password: GOOD })).kind,
      ).toBe("SIGNED_IN");

      advance(16 * MINUTE);
      const again = await accounts.signIn({ email: "throttled@example.com", password: GOOD });
      expect(again.kind).toBe("SIGNED_IN");
      // A success clears the address's failures.
      const left = await rows<{ n: string }>(
        "SELECT count(*)::text AS n FROM accounts.sign_in_failures WHERE email_hash = $1",
        [emailKey("throttled@example.com")],
      );
      expect(left[0]?.n).toBe("0");
    });

    it("re-hashes a password stored with weaker parameters, while it is in hand", async () => {
      await account("rehash@example.com");
      const weak = createPasswordHasher({ N: 1_024, r: 8, p: 1 });
      const stronger = createAccounts({
        db: createAccountsDb(app()),
        hasher: createPasswordHasher({ N: 2_048, r: 8, p: 1 }),
        links,
        now: () => clock,
      });
      const [before] = await rows<{ password_hash: string }>(
        "SELECT password_hash FROM accounts.users WHERE email_normalised = 'rehash@example.com'",
      );
      expect(weak.needsRehash(before?.password_hash ?? "")).toBe(false);
      expect((await stronger.signIn({ email: "rehash@example.com", password: GOOD })).kind).toBe(
        "SIGNED_IN",
      );
      const [after] = await rows<{ password_hash: string }>(
        "SELECT password_hash FROM accounts.users WHERE email_normalised = 'rehash@example.com'",
      );
      expect(after?.password_hash).toMatch(/^scrypt\$N=2048,r=8,p=1\$/u);
      expect((await accounts.signIn({ email: "rehash@example.com", password: GOOD })).kind).toBe(
        "SIGNED_IN",
      );
    });
  });

  describe("sessions", () => {
    it("are stored as a hash, found while valid, renewed past half-life and refused after expiry (AC-4)", async () => {
      await account("sessions@example.com");
      const signedIn = await accounts.signIn({ email: "sessions@example.com", password: GOOD });
      if (signedIn.kind !== "SIGNED_IN") throw new Error("sign-in refused");
      const token = signedIn.sessionToken;

      const dump = await rows<{ row: string }>(
        "SELECT row_to_json(s)::text AS row FROM accounts.sessions s",
      );
      expect(dump.some((r) => r.row.includes(token))).toBe(false);

      const first = await accounts.sessionFromToken(token);
      expect(first).toMatchObject({
        userId: signedIn.userId,
        email: "sessions@example.com",
        language: "pl",
        termsVersion: TERMS,
      });
      expect(first?.expiresAt.getTime()).toBe(signedIn.expiresAt.getTime());

      // Under half-life: left as it is. Past it: renewed to a full 30 days.
      advance(10 * DAY);
      expect((await accounts.sessionFromToken(token))?.expiresAt.getTime()).toBe(
        signedIn.expiresAt.getTime(),
      );
      advance(6 * DAY);
      const renewed = await accounts.sessionFromToken(token);
      expect(renewed?.expiresAt.getTime()).toBe(clock.getTime() + SESSION_DAYS * DAY);

      advance(SESSION_DAYS * DAY + HOUR);
      expect(await accounts.sessionFromToken(token)).toBeNull();
    });

    it("end on sign-out, and a token that names nothing is not an error (AC-4)", async () => {
      await account("signout@example.com");
      const signedIn = await accounts.signIn({ email: "signout@example.com", password: GOOD });
      if (signedIn.kind !== "SIGNED_IN") throw new Error("sign-in refused");
      expect(await accounts.sessionFromToken(signedIn.sessionToken)).not.toBeNull();
      await accounts.signOut(signedIn.sessionToken);
      expect(await accounts.sessionFromToken(signedIn.sessionToken)).toBeNull();
      await accounts.signOut(signedIn.sessionToken);
      await accounts.signOut("A".repeat(43));
      await accounts.signOut(undefined);
      expect(await accounts.sessionFromToken("A".repeat(43))).toBeNull();
    });

    it("never send a malformed token to the database (AC-2)", async () => {
      const queries: string[] = [];
      const counting = new Kysely<AccountsDB>({
        dialect: new PostgresDialect({ pool: app() }),
        log: (event) => {
          if (event.level === "query") queries.push(event.query.sql);
        },
      }).withSchema("accounts");
      const probe = createAccounts({ db: counting, hasher, links, now: () => clock });
      const bad = ["", "short", "../../etc/passwd", `${"A".repeat(42)}'`, null, undefined, 42];
      for (const token of bad) {
        expect(await probe.sessionFromToken(token)).toBeNull();
        await probe.signOut(token);
        expect(
          await probe.completeSignUp({
            token,
            password: GOOD,
            termsVersion: TERMS,
            termsAccepted: true,
          }),
        ).toEqual({
          kind: "INVALID_OR_EXPIRED",
        });
        expect(await probe.resetPassword({ token, newPassword: GOOD })).toEqual({
          kind: "INVALID_OR_EXPIRED",
        });
      }
      expect(queries).toEqual([]);
    });
  });

  describe("resetting a password", () => {
    it("is offered only to a complete account, and says nothing otherwise (AC-5)", async () => {
      await account("reset.known@example.com");
      await accounts.signUp({ email: "reset.pending@example.com", language: "pl" });
      const known = await accounts.requestPasswordReset({
        email: "reset.known@example.com",
        language: "en",
      });
      expect(known.mail?.subject).toMatch(/Reset/u);
      expect(known.mail?.text).toContain("https://test.example/en/account/reset?token=");
      expect(
        await accounts.requestPasswordReset({ email: "reset.ghost@example.com", language: "pl" }),
      ).toEqual({
        mail: null,
      });
      expect(
        await accounts.requestPasswordReset({ email: "reset.pending@example.com", language: "pl" }),
      ).toEqual({
        mail: null,
      });
      expect(await accounts.requestPasswordReset({ email: "nonsense", language: "pl" })).toEqual({
        mail: null,
      });
    });

    it("refuses a weak password without spending the token, then sets it and ends every session (AC-5)", async () => {
      await account("reset.flow@example.com");
      const one = await accounts.signIn({ email: "reset.flow@example.com", password: GOOD });
      const two = await accounts.signIn({ email: "reset.flow@example.com", password: GOOD });
      if (one.kind !== "SIGNED_IN" || two.kind !== "SIGNED_IN") throw new Error("sign-in refused");

      const request = await accounts.requestPasswordReset({
        email: "reset.flow@example.com",
        language: "pl",
      });
      const token = tokenOf(request.mail);
      expect(await accounts.resetPassword({ token, newPassword: "short" })).toEqual({
        kind: "INVALID",
        problem: "TOO_SHORT",
      });
      expect(
        await accounts.resetPassword({ token, newPassword: "a brand new passphrase" }),
      ).toEqual({ kind: "OK" });

      expect(await accounts.sessionFromToken(one.sessionToken)).toBeNull();
      expect(await accounts.sessionFromToken(two.sessionToken)).toBeNull();
      expect(await accounts.signIn({ email: "reset.flow@example.com", password: GOOD })).toEqual({
        kind: "REJECTED",
      });
      expect(
        (
          await accounts.signIn({
            email: "reset.flow@example.com",
            password: "a brand new passphrase",
          })
        ).kind,
      ).toBe("SIGNED_IN");
      // Spent.
      expect(
        await accounts.resetPassword({ token, newPassword: "yet another passphrase" }),
      ).toEqual({
        kind: "INVALID_OR_EXPIRED",
      });
    });

    it("keeps one live link at a time, for an hour, and three requests an hour (AC-5)", async () => {
      await account("reset.links@example.com");
      const first = await accounts.requestPasswordReset({
        email: "reset.links@example.com",
        language: "pl",
      });
      const second = await accounts.requestPasswordReset({
        email: "reset.links@example.com",
        language: "pl",
      });
      expect(
        await accounts.resetPassword({
          token: tokenOf(first.mail),
          newPassword: "an older link's passphrase",
        }),
      ).toEqual({
        kind: "INVALID_OR_EXPIRED",
      });
      const third = await accounts.requestPasswordReset({
        email: "reset.links@example.com",
        language: "pl",
      });
      expect(third.mail).not.toBeNull();
      expect(
        await accounts.requestPasswordReset({ email: "reset.links@example.com", language: "pl" }),
      ).toEqual({
        mail: null,
      });
      advance(HOUR + MINUTE);
      expect(
        await accounts.resetPassword({
          token: tokenOf(second.mail),
          newPassword: "an expired link's passphrase",
        }),
      ).toEqual({ kind: "INVALID_OR_EXPIRED" });
      expect(
        await accounts.resetPassword({
          token: tokenOf(third.mail),
          newPassword: "an expired link's passphrase",
        }),
      ).toEqual({ kind: "INVALID_OR_EXPIRED" });
      expect(
        (await accounts.requestPasswordReset({ email: "reset.links@example.com", language: "pl" }))
          .mail,
      ).not.toBeNull();
    });
  });

  describe("deleting an account", () => {
    it("needs the password, then removes the user, its sessions and its tokens (AC-5)", async () => {
      const userId = await account("delete.me@example.com");
      const signedIn = await accounts.signIn({ email: "delete.me@example.com", password: GOOD });
      if (signedIn.kind !== "SIGNED_IN") throw new Error("sign-in refused");
      await accounts.requestPasswordReset({ email: "delete.me@example.com", language: "pl" });

      expect(await accounts.deleteAccount({ userId, password: "not the password" })).toEqual({
        kind: "WRONG_PASSWORD",
      });
      expect(await rows("SELECT 1 FROM accounts.users WHERE user_id = $1", [userId])).toHaveLength(
        1,
      );

      expect(await accounts.deleteAccount({ userId, password: GOOD })).toEqual({ kind: "DELETED" });
      for (const table of ["users", "sessions", "email_tokens"]) {
        expect(
          await rows(`SELECT 1 FROM accounts.${table} WHERE user_id = $1`, [userId]),
          table,
        ).toHaveLength(0);
      }
      expect(await accounts.sessionFromToken(signedIn.sessionToken)).toBeNull();
      expect(await accounts.signIn({ email: "delete.me@example.com", password: GOOD })).toEqual({
        kind: "REJECTED",
      });
      expect(await accounts.deleteAccount({ userId, password: GOOD })).toEqual({
        kind: "NOT_FOUND",
      });
    });
  });

  describe("purging what has expired", () => {
    it("removes expired sessions, old tokens, old failures and a lapsed pending address, and keeps the rest (AC-5)", async () => {
      await account("purge.live@example.com");
      const live = await accounts.signIn({ email: "purge.live@example.com", password: GOOD });
      if (live.kind !== "SIGNED_IN") throw new Error("sign-in refused");
      await accounts.signIn({ email: "purge.failures@example.com", password: "wrong" });

      // A pending address whose link lapsed a week ago, and one with a live link.
      await accounts.signUp({ email: "purge.lapsed@example.com", language: "pl" });
      advance(8 * DAY);
      await accounts.signUp({ email: "purge.fresh@example.com", language: "pl" });

      advance(SESSION_DAYS * DAY);
      await accounts.signUp({ email: "purge.fresh@example.com", language: "pl" });
      const purged = await accounts.purgeExpired();
      expect(purged.sessions).toBeGreaterThanOrEqual(1);
      expect(purged.failures).toBeGreaterThanOrEqual(1);
      expect(purged.pending).toBeGreaterThanOrEqual(1);

      const lapsed = await rows(
        "SELECT 1 FROM accounts.users WHERE email_normalised = 'purge.lapsed@example.com'",
      );
      const fresh = await rows(
        "SELECT 1 FROM accounts.users WHERE email_normalised = 'purge.fresh@example.com'",
      );
      expect(lapsed).toHaveLength(0);
      expect(fresh).toHaveLength(1);
      // The complete account stays, its session gone with its expiry.
      expect(
        await rows(
          "SELECT 1 FROM accounts.users WHERE email_normalised = 'purge.live@example.com'",
        ),
      ).toHaveLength(1);
      expect(await accounts.sessionFromToken(live.sessionToken)).toBeNull();
    });
  });

  describe("the two roles (AC-7)", () => {
    it("lets the accounts role work in its schema and nowhere else", async () => {
      const [timeout] = (await app().query("SHOW statement_timeout")).rows as {
        statement_timeout: string;
      }[];
      expect(timeout?.statement_timeout).toBe("10s");
      expect(
        (await app().query("SELECT count(*)::int AS n FROM accounts.users")).rows[0],
      ).toBeDefined();

      for (const statement of [
        "SELECT 1 FROM surnames LIMIT 1",
        "SELECT 1 FROM claims LIMIT 1",
        "CREATE TABLE accounts.evil (x int)",
        "DROP TABLE accounts.users",
        "TRUNCATE accounts.users",
        "ALTER TABLE accounts.users ADD COLUMN evil int",
      ]) {
        await expect(app().query(statement), statement).rejects.toMatchObject({ code: "42501" });
      }
    });

    it("gives the read-only role the register and nothing of accounts", async () => {
      const web = (): ReturnType<typeof createPool> => {
        if (!webPool) throw new Error("web pool was not started");
        return webPool;
      };
      expect((await web().query("SELECT count(*)::int AS n FROM surnames")).rows[0]).toBeDefined();
      for (const table of ["users", "sessions", "email_tokens", "sign_in_failures"]) {
        await expect(
          web().query(`SELECT 1 FROM accounts.${table} LIMIT 1`),
          table,
        ).rejects.toMatchObject({
          code: "42501",
        });
      }
      await expect(web().query("DELETE FROM accounts.users")).rejects.toMatchObject({
        code: "42501",
      });
    });

    it("keeps accounts out of the register's own schema and the register out of accounts", async () => {
      const inPublic = await rows<{ table_name: string }>(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','sessions','email_tokens','sign_in_failures')",
      );
      expect(inPublic).toEqual([]);
      // No foreign key crosses the register's boundary in either direction, and
      // the only references into `accounts` come from the other private schema,
      // `family` (TASK-066, ADR-0029 §2.1), never from `public`.
      const crossing = await rows<{ n: string }>(`
        SELECT count(*)::text AS n
        FROM pg_constraint c
        JOIN pg_class f ON f.oid = c.conrelid
        JOIN pg_namespace fn ON fn.oid = f.relnamespace
        JOIN pg_class t ON t.oid = c.confrelid
        JOIN pg_namespace tn ON tn.oid = t.relnamespace
        WHERE c.contype = 'f' AND ((fn.nspname = 'public') <> (tn.nspname = 'public'))
      `);
      expect(crossing[0]?.n).toBe("0");
      const intoAccounts = await rows<{ nspname: string }>(`
        SELECT DISTINCT fn.nspname
        FROM pg_constraint c
        JOIN pg_class f ON f.oid = c.conrelid
        JOIN pg_namespace fn ON fn.oid = f.relnamespace
        JOIN pg_class t ON t.oid = c.confrelid
        JOIN pg_namespace tn ON tn.oid = t.relnamespace
        WHERE c.contype = 'f' AND tn.nspname = 'accounts' AND fn.nspname <> 'accounts'
        ORDER BY 1
      `);
      expect(intoAccounts.map((r) => r.nspname)).toEqual(["family"]);
    });
  });

  describe("the migration (AC-8)", () => {
    it("refuses to go down while a user is stored, and removes the schema when none is", async () => {
      const migrator = createMigrator(db().db);
      // Step past the migrations above 0027 first (0028, the family schema, which
      // holds no tree here, 0029 and 0030).
      await migrator.migrateTo("0027_accounts_schema");
      const refused = await migrator.migrateDown();
      expect(String(refused.error)).toMatch(/refusing to drop schema accounts/u);
      expect(await rows("SELECT 1 FROM accounts.users LIMIT 1")).toHaveLength(1);

      await db().pool.query("DELETE FROM accounts.users");
      const down = await migrator.migrateDown();
      expect(down.error).toBeUndefined();
      expect(down.results?.map((r) => r.migrationName)).toEqual(["0027_accounts_schema"]);
      expect(await rows("SELECT 1 FROM pg_namespace WHERE nspname = 'accounts'")).toHaveLength(0);

      // And back up, with the grants the roles file makes.
      const up = await migrator.migrateToLatest();
      expect(up.error).toBeUndefined();
      await sql.raw(ROLES_SQL).execute(db().db);
      expect(
        (await app().query("SELECT count(*)::int AS n FROM accounts.users")).rows[0],
      ).toBeDefined();
    });
  });
});
