import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNTS_ENV } from "./accounts-config.js";
import { accountsRuntime, resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { familyRuntime, resetFamilyRuntimeForTests } from "./family-runtime.js";
import { ACCOUNTS_LEGAL_UPDATED, TREE_LEGAL_UPDATED } from "./legal-text.js";
import { policyFor, TREE_POLICY, ACCOUNT_POLICY } from "./request-policy.js";
import { SiteNav } from "./site-nav.js";
import { treeLandingPath } from "./tree-paths.js";

const ON: Record<string, string> = {
  ACCOUNTS_DATABASE_URL: "postgres://app:pw@127.0.0.1:1/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test",
  CRON_SECRET: "cron-secret",
};

const nav = (lang: "pl" | "en") =>
  renderToStaticMarkup(createElement(SiteNav, { lang, otherPath: "/" }));
const env = (values: Record<string, string | undefined>) => values as unknown as NodeJS.ProcessEnv;

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
  resetFamilyRuntimeForTests();
});

describe("the header's trees link (TASK-073, AC-1)", () => {
  it("is absent with accounts on but the tree off", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    expect(nav("pl")).toContain(">Konto<");
    expect(nav("pl")).not.toContain("/pl/konto/drzewa");
    expect(nav("en")).not.toContain("/en/account/trees");
  });

  it("is there, in each language, beside the account, to the landing page, when the tree is on", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv("FAMILY_TREE_ENABLED", "1");
    const pl = nav("pl");
    expect(pl.split(`href="${treeLandingPath("pl")}"`)).toHaveLength(3);
    expect(pl).not.toContain('href="/pl/konto/drzewa"');
    expect(pl).toContain(">Drzewa<");
    expect(pl.indexOf(">Konto<")).toBeLessThan(pl.indexOf(">Drzewa<"));
    expect(nav("en")).toContain(">Trees<");
    expect(nav("en")).toContain(`href="${treeLandingPath("en")}"`);
  });

  it("is absent again when accounts go off, whatever the tree's variable says", () => {
    vi.stubEnv("FAMILY_TREE_ENABLED", "1");
    for (const name of ACCOUNTS_ENV) vi.stubEnv(name, "");
    expect(nav("pl")).not.toContain(treeLandingPath("pl"));
  });
});

describe("the runtimes and the policy (TASK-073)", () => {
  it("the family runtime is null while the tree is off and shares the accounts pool when on", () => {
    expect(familyRuntime(env(ON))).toBeNull();
    resetFamilyRuntimeForTests();
    const runtime = familyRuntime(env({ ...ON, FAMILY_TREE_ENABLED: "1" }));
    expect(runtime).not.toBeNull();
    expect(runtime?.livingTermsVersion).toBe(TREE_LEGAL_UPDATED);
    expect(runtime?.secure).toBe(true);
    expect(familyRuntime(env({ ...ON, FAMILY_TREE_ENABLED: "1" }))).toBe(runtime);
    expect(accountsRuntime(env({ ...ON, FAMILY_TREE_ENABLED: "1" }))?.pool).toBeDefined();
  });

  it("a sign-up records the tree variant's terms date only when the tree is on", () => {
    expect(accountsRuntime(env(ON))?.termsVersion).toBe(ACCOUNTS_LEGAL_UPDATED);
    resetAccountsRuntimeForTests();
    expect(accountsRuntime(env({ ...ON, FAMILY_TREE_ENABLED: "1" }))?.termsVersion).toBe(
      TREE_LEGAL_UPDATED,
    );
  });

  it("the tree's routes have their own bucket", () => {
    expect(policyFor("/api/tree/add-person")).toBe(TREE_POLICY);
    expect(policyFor("/api/account/sign-in")).toBe(ACCOUNT_POLICY);
    expect(TREE_POLICY.limit).toBeGreaterThan(ACCOUNT_POLICY.limit);
  });
});
