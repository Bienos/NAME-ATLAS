import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { accountPath } from "./account-paths.js";
import { SiteNav } from "./site-nav.js";

const ON = {
  ACCOUNTS_DATABASE_URL: "postgres://app@host/db",
  RESEND_API_KEY: "re_key",
  ACCOUNTS_MAIL_FROM: "Name Atlas <konto@example.test>",
  SITE_ORIGIN: "https://atlas.example.test",
  CRON_SECRET: "cron-secret",
};

const nav = (lang: "pl" | "en") =>
  renderToStaticMarkup(createElement(SiteNav, { lang, otherPath: "/" }));

afterEach(() => vi.unstubAllEnvs());

describe("the header's account link (TASK-062, AC-1, AC-2)", () => {
  it("is absent while accounts are off", () => {
    for (const lang of ["pl", "en"] as const) {
      expect(nav(lang)).not.toContain(accountPath(lang, "account"));
    }
  });

  it("is there, in each language, once all five variables are set, in the bar and in the phone menu", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    const pl = nav("pl");
    expect(pl.split('href="/pl/konto"')).toHaveLength(3);
    expect(pl).toContain(">Konto<");
    const en = nav("en");
    expect(en.split('href="/en/account"')).toHaveLength(3);
    expect(en).toContain(">Account<");
  });

  it("is absent again when one variable is missing", () => {
    for (const [name, value] of Object.entries(ON)) vi.stubEnv(name, value);
    vi.stubEnv("RESEND_API_KEY", "");
    expect(nav("pl")).not.toContain("/pl/konto");
  });
});
