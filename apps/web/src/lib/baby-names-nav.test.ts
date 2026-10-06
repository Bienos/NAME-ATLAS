import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ACCOUNTS_ENV } from "./accounts-config.js";
import { BABY_NAMES_ENV, BABY_NAMES_PATHS } from "./baby-names-config.js";
import { resetAccountsRuntimeForTests } from "./accounts-runtime.js";
import { SiteNav } from "./site-nav.js";
import type { NavPlace } from "./site-nav.js";

const ON: Record<string, string> = {
  ACCOUNTS_DATABASE_URL: "postgres://app:pw@127.0.0.1:1/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test",
  CRON_SECRET: "cron-secret",
};

const nav = (lang: "pl" | "en", current: NavPlace = null) =>
  renderToStaticMarkup(createElement(SiteNav, { lang, otherPath: "/", current }));

afterEach(() => {
  vi.unstubAllEnvs();
  resetAccountsRuntimeForTests();
});

describe("the header's baby-names link (TASK-143, AC-1)", () => {
  it("is absent with accounts on but the page's flag off", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    expect(nav("pl")).not.toContain(BABY_NAMES_PATHS.pl);
    expect(nav("en")).not.toContain(BABY_NAMES_PATHS.en);
  });

  it("is absent with the flag on but accounts off, where the page is a 404", () => {
    vi.stubEnv(BABY_NAMES_ENV, "1");
    for (const name of ACCOUNTS_ENV) vi.stubEnv(name, "");
    expect(nav("pl")).not.toContain(BABY_NAMES_PATHS.pl);
  });

  it("is there, in each language, to the page's own address, before the account, when both are on", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv(BABY_NAMES_ENV, "1");
    const pl = nav("pl");
    // The links are drawn twice: in the header and in the phone's menu.
    expect(pl.split(`href="${BABY_NAMES_PATHS.pl}"`)).toHaveLength(3);
    expect(pl).toContain(">Imiona dla dziecka<");
    expect(pl.indexOf(">Imiona dla dziecka<")).toBeLessThan(pl.indexOf(">Konto<"));
    const en = nav("en");
    expect(en.split(`href="${BABY_NAMES_PATHS.en}"`)).toHaveLength(3);
    expect(en).toContain(">Baby names<");
  });

  it("marks itself as the current page, and only then", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv(BABY_NAMES_ENV, "1");
    expect(nav("pl", "babyNames")).toContain(
      `class="nav-babyNames" href="${BABY_NAMES_PATHS.pl}" aria-current="page"`,
    );
    expect(nav("pl")).not.toContain(`href="${BABY_NAMES_PATHS.pl}" aria-current`);
  });
});
