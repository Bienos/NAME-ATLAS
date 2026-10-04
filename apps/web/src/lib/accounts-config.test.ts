import { loadGoogleConfig, loadMailConfig } from "@name-atlas/accounts";
import { loadAccountsDbConfig } from "@name-atlas/db";
import { describe, expect, it } from "vitest";
import {
  ACCOUNTS_BASE_ENV,
  ACCOUNTS_ENV,
  accountsEnabled,
  GOOGLE_ENV,
  googleEnabled,
  mailEnabled,
  missingAccountsEnv,
} from "./accounts-config.js";

/** A made-up environment as the library readers take it (Next's typing demands `NODE_ENV` of a real one). */
const env = (values: Record<string, string | undefined>) => values as unknown as NodeJS.ProcessEnv;

const ALL = {
  ACCOUNTS_DATABASE_URL: "postgres://app@host/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test",
  CRON_SECRET: "cron-secret",
};

describe("accountsEnabled (TASK-062, AC-1)", () => {
  it("is on only when all five variables are set", () => {
    expect(accountsEnabled(ALL)).toBe(true);
    expect(missingAccountsEnv(ALL)).toEqual([]);
    for (const name of ACCOUNTS_ENV) {
      const without: Record<string, string | undefined> = { ...ALL };
      delete without[name];
      expect(accountsEnabled(without), name).toBe(false);
      expect(missingAccountsEnv(without), name).toEqual([name]);
    }
  });

  it("treats an empty or blank value as unset", () => {
    expect(accountsEnabled({ ...ALL, CRON_SECRET: "" })).toBe(false);
    expect(accountsEnabled({ ...ALL, CRON_SECRET: "   " })).toBe(false);
    expect(accountsEnabled({})).toBe(false);
  });

  it("names the variables that are missing and never a value", () => {
    const missing = missingAccountsEnv({ ...ALL, RESEND_API_KEY: undefined, CRON_SECRET: "" });
    expect(missing).toEqual(["RESEND_API_KEY", "CRON_SECRET"]);
    expect(JSON.stringify(missing)).not.toContain("re_key");
  });

  it("agrees with the library's own readers on the three it shares", () => {
    // The gate reads names, the runtime reads values through the packages: they must not drift.
    expect(loadAccountsDbConfig(env(ALL))).not.toBeNull();
    expect(loadMailConfig(env(ALL))).not.toBeNull();
    const noDb = { ...ALL, ACCOUNTS_DATABASE_URL: undefined };
    expect(loadAccountsDbConfig(env(noDb))).toBeNull();
    expect(accountsEnabled(noDb)).toBe(false);
    const noMail = { ...ALL, ACCOUNTS_MAIL_FROM: undefined };
    expect(loadMailConfig(env(noMail))).toBeNull();
    expect(accountsEnabled(noMail)).toBe(false);
    const noKey = { ...ALL, RESEND_API_KEY: " " };
    expect(loadMailConfig(env(noKey))).toBeNull();
    expect(accountsEnabled(noKey)).toBe(false);
  });
});

describe("the ways in (TASK-084, ADR-0033)", () => {
  const BASE = {
    ACCOUNTS_DATABASE_URL: ALL.ACCOUNTS_DATABASE_URL,
    SITE_ORIGIN: ALL.SITE_ORIGIN,
    CRON_SECRET: ALL.CRON_SECRET,
  };
  const GOOGLE = { GOOGLE_CLIENT_ID: "id.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "s" };

  it("turns accounts on with Google alone, without the mail", () => {
    expect(accountsEnabled({ ...BASE, ...GOOGLE })).toBe(true);
    expect(googleEnabled({ ...BASE, ...GOOGLE })).toBe(true);
    expect(mailEnabled({ ...BASE, ...GOOGLE })).toBe(false);
    expect(missingAccountsEnv({ ...BASE, ...GOOGLE })).toEqual([]);
  });

  it("offers each way only when it is complete", () => {
    expect(googleEnabled({ ...ALL, GOOGLE_CLIENT_ID: "x" })).toBe(false);
    expect(mailEnabled(ALL)).toBe(true);
    expect(googleEnabled({ ...ALL, ...GOOGLE })).toBe(true);
    expect(mailEnabled({ ...ALL, ...GOOGLE })).toBe(true);
  });

  it("needs the base whatever the way in", () => {
    for (const name of ACCOUNTS_BASE_ENV) {
      const without: Record<string, string | undefined> = { ...BASE, ...GOOGLE };
      delete without[name];
      expect(accountsEnabled(without), name).toBe(false);
      expect(missingAccountsEnv(without), name).toEqual([name]);
    }
  });

  it("agrees with the library's Google reader", () => {
    expect(loadGoogleConfig(env({ ...BASE, ...GOOGLE }))).not.toBeNull();
    expect(loadGoogleConfig(env({ ...BASE, GOOGLE_CLIENT_ID: "x" }))).toBeNull();
    expect(GOOGLE_ENV).toEqual(["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"]);
  });
});
