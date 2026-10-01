import { afterEach, describe, expect, it } from "vitest";
import { accountLinks, accountsRuntime, resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { ACCOUNTS_LEGAL_UPDATED } from "./legal-text.js";

const ON = {
  ACCOUNTS_DATABASE_URL: "postgres://app:pw@127.0.0.1:1/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test/",
  CRON_SECRET: "cron-secret",
};

/** A made-up environment (Next's typing demands `NODE_ENV` of a real one). */
const env = (values: Record<string, string | undefined>) => values as unknown as NodeJS.ProcessEnv;

afterEach(() => resetAccountsRuntimeForTests());

describe("the accounts runtime (TASK-062)", () => {
  it("is null, and touches nothing, when accounts are off", () => {
    for (const name of Object.keys(ON)) {
      resetAccountsRuntimeForTests();
      const values: Record<string, string | undefined> = { ...ON };
      delete values[name];
      expect(accountsRuntime(env(values)), name).toBeNull();
    }
  });

  it("is made once, over its own pool, without connecting, and records the terms' date", () => {
    const runtime = accountsRuntime(env(ON));
    expect(runtime).not.toBeNull();
    expect(runtime?.secure).toBe(true);
    expect(runtime?.cronSecret).toBe("cron-secret");
    expect(runtime?.termsVersion).toBe(ACCOUNTS_LEGAL_UPDATED);
    expect(accountsRuntime(env(ON))).toBe(runtime);
  });

  it("serves cookies without Secure where the site is on plain HTTP", () => {
    const runtime = accountsRuntime(env({ ...ON, SITE_ORIGIN: "http://localhost:3000" }));
    expect(runtime?.secure).toBe(false);
  });

  it("links a mail to the page in the reader's language, absolute, carrying the token", () => {
    const links = accountLinks("https://atlas.example.test");
    expect(links.verify("tok", "pl")).toBe(
      "https://atlas.example.test/pl/konto/potwierdz?token=tok",
    );
    expect(links.verify("tok", "en")).toBe(
      "https://atlas.example.test/en/account/confirm?token=tok",
    );
    expect(links.reset("tok", "pl")).toBe(
      "https://atlas.example.test/pl/konto/nowe-haslo?token=tok",
    );
    expect(links.reset("tok", "en")).toBe(
      "https://atlas.example.test/en/account/new-password?token=tok",
    );
  });
});
