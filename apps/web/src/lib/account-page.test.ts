import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ACCOUNT_STEPS, accountPath } from "./account-paths.js";
import {
  accountMetadata,
  AccountView,
  decideAccountPage,
  stepNeedsSession,
} from "./account-page.js";
import type { AccountPageData, SessionView } from "./account-page.js";
import { ACCOUNT_TEXT, statusWords } from "./account-text.js";

const LANGS = ["pl", "en"] as const;
const TOKEN = "k".repeat(43);
const SESSION: SessionView = {
  email: "reader@example.test",
  termsVersion: "2026-10-01",
  termsAcceptedOn: "2026-10-02",
};

function decide(
  lang: "pl" | "en",
  segments: readonly string[] | undefined,
  query: Record<string, string> = {},
  session: SessionView | null = null,
  enabled = true,
) {
  return decideAccountPage({ enabled, lang, segments, query, session });
}

function data(
  overrides: Partial<AccountPageData> & Pick<AccountPageData, "step">,
): AccountPageData {
  return { lang: "pl", status: null, token: null, session: null, next: null, ...overrides };
}

function render(d: AccountPageData): string {
  return renderToStaticMarkup(createElement(AccountView, { data: d })).replaceAll("&amp;", "&");
}

describe("what each account address shows (TASK-062)", () => {
  it("is a 404 when accounts are off, whatever the address (AC-1)", () => {
    for (const lang of LANGS) {
      for (const step of ACCOUNT_STEPS) {
        const segments = accountPath(lang, step).split("/").slice(3);
        expect(decide(lang, segments, {}, SESSION, false), `${lang} ${step}`).toEqual({
          kind: "not-found",
        });
      }
    }
  });

  it("is a 404 for a step that does not exist", () => {
    expect(decide("pl", ["nope"])).toEqual({ kind: "not-found" });
    expect(decide("en", ["zaloguj"])).toEqual({ kind: "not-found" });
    expect(decide("pl", ["zaloguj", "x"])).toEqual({ kind: "not-found" });
  });

  it("sends a reader who is not signed in from the account to sign-in, and a signed-in one the other way", () => {
    expect(decide("pl", undefined)).toEqual({ kind: "redirect", to: "/pl/konto/zaloguj" });
    expect(decide("en", [])).toEqual({ kind: "redirect", to: "/en/account/sign-in" });
    expect(decide("pl", ["zaloguj"], {}, SESSION)).toEqual({ kind: "redirect", to: "/pl/konto" });
    expect(decide("en", ["sign-up"], {}, SESSION)).toEqual({ kind: "redirect", to: "/en/account" });
    // The reset steps work signed in or out.
    expect(decide("pl", ["reset"], {}, SESSION).kind).toBe("view");
    expect(decide("en", ["new-password"], { token: TOKEN }, SESSION).kind).toBe("view");
  });

  it("only asks the database who is signed in on the three steps that care", () => {
    const needing = ACCOUNT_STEPS.filter(stepNeedsSession);
    expect(needing).toEqual(["account", "sign-in", "sign-up"]);
  });

  it("prints a status word the step knows and drops any other, including names every object has", () => {
    const known = decide("pl", ["zaloguj"], { status: "rejected" });
    expect(known).toMatchObject({ kind: "view", data: { status: "rejected" } });
    for (const word of ["nope", "constructor", "__proto__", "toString", "<b>x</b>", "sent"]) {
      expect(decide("pl", ["zaloguj"], { status: word }), word).toMatchObject({
        kind: "view",
        data: { status: null },
      });
    }
  });

  it("shows a token form only with a token shaped like one; otherwise it says the link is no good", () => {
    const withToken = decide("pl", ["potwierdz"], { token: TOKEN });
    expect(withToken).toMatchObject({ kind: "view", data: { token: TOKEN, status: null } });
    const bad: Record<string, string>[] = [
      {},
      { token: "short" },
      { token: `${TOKEN}!` },
      { token: "" },
    ];
    for (const query of bad) {
      expect(decide("pl", ["potwierdz"], query), JSON.stringify(query)).toMatchObject({
        kind: "view",
        data: { token: null, status: "expired" },
      });
    }
    expect(decide("en", ["new-password"], {})).toMatchObject({
      data: { token: null, status: "expired" },
    });
    // A password problem keeps the token and the form.
    expect(decide("pl", ["potwierdz"], { token: TOKEN, status: "too-short" })).toMatchObject({
      data: { token: TOKEN, status: "too-short" },
    });
  });
});

describe("the six pages as markup (AC-5, AC-6, AC-8)", () => {
  it("sign-in posts an address and a password, and carries no token", () => {
    for (const lang of LANGS) {
      const html = render(data({ lang, step: "sign-in" }));
      expect(html).toContain('action="/api/account/sign-in"');
      expect(html).toContain('method="post"');
      expect(html).toContain(`name="lang" value="${lang}"`);
      expect(html).toContain('name="email"');
      expect(html).toContain('autoComplete="current-password"');
      expect(html).not.toContain('name="token"');
      expect(html).toContain(accountPath(lang, "sign-up"));
      expect(html).toContain(accountPath(lang, "reset"));
    }
  });

  it("sign-up asks for an address and nothing else: no password, no terms (ADR-0027 §2.1)", () => {
    for (const lang of LANGS) {
      const html = render(data({ lang, step: "sign-up" }));
      expect(html).toContain('action="/api/account/sign-up"');
      expect(html).toContain('name="email"');
      expect(html).not.toContain('name="password"');
      expect(html).not.toContain('name="terms"');
      expect(html).not.toContain('type="password"');
    }
  });

  it("the reset request asks for an address and posts to the reset-request route", () => {
    const html = render(data({ step: "reset" }));
    expect(html).toContain('action="/api/account/reset-request"');
    expect(html).not.toContain('name="password"');
  });

  it("confirm, with a token, sets a password and asks for the terms, with links to both documents", () => {
    for (const lang of LANGS) {
      const html = render(data({ lang, step: "confirm", token: TOKEN }));
      expect(html).toContain('action="/api/account/complete"');
      expect(html).toContain(`name="token" value="${TOKEN}"`);
      expect(html).toContain('autoComplete="new-password"');
      expect(html).toContain('minLength="10"');
      expect(html).toMatch(
        /<input(?=[^>]*type="checkbox")(?=[^>]*name="terms")(?=[^>]*required)[^>]*>/u,
      );
      expect(html).toContain(lang === "pl" ? "/pl/regulamin" : "/en/terms");
      expect(html).toContain(lang === "pl" ? "/pl/prywatnosc" : "/en/privacy");
    }
  });

  it("confirm and new-password show no form, and no token field, once the link is spent or missing", () => {
    for (const step of ["confirm", "new-password"] as const) {
      const html = render(data({ step, token: null, status: "expired" }));
      expect(html).not.toContain("<form");
      expect(html).not.toContain('name="token"');
      expect(html).toContain('role="alert"');
    }
    // Even with a token in hand, `expired` shows no form to spend it on.
    expect(render(data({ step: "confirm", token: TOKEN, status: "expired" }))).not.toContain(
      "<form",
    );
  });

  it("new-password asks for one password and posts to the reset route", () => {
    const html = render(data({ step: "new-password", token: TOKEN }));
    expect(html).toContain('action="/api/account/reset"');
    expect(html).toContain(`name="token" value="${TOKEN}"`);
    expect(html).not.toContain('name="terms"');
  });

  it("the account shows who is signed in, a sign-out, and a deletion that asks for the password", () => {
    for (const lang of LANGS) {
      const html = render(data({ lang, step: "account", session: SESSION }));
      expect(html).toContain("reader@example.test");
      expect(html).toContain('action="/api/account/sign-out"');
      expect(html).toContain('action="/api/account/delete"');
      expect(html).toMatch(/action="\/api\/account\/delete"[\s\S]*type="password"/u);
    }
  });

  it("words the terms line without a doubled full stop, in both languages", () => {
    for (const lang of LANGS) {
      const html = render(data({ lang, step: "account", session: SESSION }));
      expect(html, lang).not.toContain("..");
      expect(html, lang).toContain(lang === "pl" ? "1 października 2026 r." : "1 October 2026");
    }
  });

  it("escapes what it prints from the session", () => {
    const html = render(
      data({
        step: "account",
        session: { ...SESSION, email: '"><img src=x onerror=alert(1)>@x.test' },
      }),
    );
    expect(html).not.toContain("<img");
    expect(html).toContain("&lt;img");
  });

  it("announces a problem at once and an ordinary message politely", () => {
    expect(render(data({ step: "sign-in", status: "rejected" }))).toContain('role="alert"');
    expect(render(data({ step: "sign-in", status: "signedout" }))).toContain('role="status"');
  });

  it("links the same step in the other language", () => {
    expect(render(data({ lang: "pl", step: "sign-in" }))).toContain(accountPath("en", "sign-in"));
    expect(render(data({ lang: "en", step: "sign-up" }))).toContain(accountPath("pl", "sign-up"));
  });

  it("has a heading on every page in both languages", () => {
    for (const lang of LANGS) {
      for (const step of ACCOUNT_STEPS) {
        const html = render(
          data({
            lang,
            step,
            token: step === "confirm" || step === "new-password" ? TOKEN : null,
            session: step === "account" ? SESSION : null,
          }),
        );
        expect(html, `${lang} ${step}`).toContain(`<h2>${ACCOUNT_TEXT[lang].headings[step]}</h2>`);
      }
    }
  });
});

describe("the pages' metadata (AC-10)", () => {
  it("keeps every step out of search, and the two token steps from sending a Referer to another site", () => {
    for (const lang of LANGS) {
      for (const step of ACCOUNT_STEPS) {
        const meta = accountMetadata(lang, step);
        expect(meta.robots, `${lang} ${step}`).toEqual({ index: false, follow: false });
        const token = step === "confirm" || step === "new-password";
        expect(meta.referrer, `${lang} ${step}`).toBe(token ? "same-origin" : undefined);
      }
    }
  });
});

describe("the words (AC-12)", () => {
  it("has the same status words on each step in both languages, and none empty", () => {
    for (const step of ACCOUNT_STEPS) {
      const pl = Object.keys(ACCOUNT_TEXT.pl.status[step]).sort();
      const en = Object.keys(ACCOUNT_TEXT.en.status[step]).sort();
      expect(en, step).toEqual(pl);
      for (const lang of LANGS) {
        for (const word of pl) {
          expect(
            statusWords(lang, step, word)?.text.length,
            `${lang} ${step} ${word}`,
          ).toBeGreaterThan(5);
        }
      }
    }
  });

  it("fills every heading, lede, button and link in both languages", () => {
    for (const lang of LANGS) {
      const t = ACCOUNT_TEXT[lang];
      for (const step of ACCOUNT_STEPS) expect(t.headings[step].length).toBeGreaterThan(2);
      for (const text of Object.values(t.submit)) expect(text.length).toBeGreaterThan(2);
      for (const text of Object.values(t.links)) expect(text.length).toBeGreaterThan(2);
      expect(t.nav.length).toBeGreaterThan(2);
    }
    expect(ACCOUNT_TEXT.pl.headings["sign-in"]).not.toBe(ACCOUNT_TEXT.en.headings["sign-in"]);
  });

  it("words the sign-up and reset messages so they hold for an address with an account and one without", () => {
    for (const lang of LANGS) {
      const sent = statusWords(lang, "sign-up", "sent")?.text ?? "";
      const reset = statusWords(lang, "reset", "sent")?.text ?? "";
      // Both are conditional ("if…"): neither says an account exists or does not.
      expect(sent.toLowerCase()).toMatch(/jeśli|if/u);
      expect(reset.toLowerCase()).toMatch(/jeśli|if/u);
    }
  });

  it("says one thing for a wrong password, an unknown address and a pending account", () => {
    for (const lang of LANGS) {
      const text = statusWords(lang, "sign-in", "rejected")?.text ?? "";
      expect(text.length).toBeGreaterThan(20);
      expect(Object.keys(ACCOUNT_TEXT[lang].status["sign-in"])).not.toContain("unknown");
      expect(Object.keys(ACCOUNT_TEXT[lang].status["sign-in"])).not.toContain("pending");
    }
  });

  it("knows no status word for an unknown name", () => {
    expect(statusWords("pl", "sign-in", "constructor")).toBeNull();
    expect(statusWords("pl", "sign-in", null)).toBeNull();
  });
});

describe("the sign-in's way back to a surname (TASK-064, AC-7)", () => {
  const NEXT = "/pl/nazwisko/kowalski?view=cards";

  it("carries a safe address as a hidden field of the sign-in form and nowhere else", () => {
    const decision = decide("pl", ["zaloguj"], { next: NEXT });
    expect(decision).toMatchObject({ kind: "view", data: { step: "sign-in", next: NEXT } });
    if (decision.kind !== "view") throw new Error("a view");
    const html = render(decision.data);
    expect(html).toContain(`<input type="hidden" name="next" value="${NEXT}"/>`);
    // Not a link and not a second field: the sign-up and reset links stay as they were.
    expect(html.split(NEXT)).toHaveLength(2);
  });

  it("says nothing about it when the address is not a surname page of this site", () => {
    for (const next of ["https://evil.test/", "//evil.test", "/pl/konto", "/pl/nazwisko/..", ""]) {
      const decision = decide("pl", ["zaloguj"], { next });
      expect(decision, next).toMatchObject({ kind: "view", data: { next: null } });
      if (decision.kind !== "view") throw new Error("a view");
      expect(render(decision.data)).not.toContain('name="next"');
    }
  });

  it("has no field when there is no address, and ignores one on any other step", () => {
    expect(render(data({ step: "sign-in" }))).not.toContain('name="next"');
    for (const [lang, segments] of [
      ["pl", ["zaloz"]],
      ["pl", ["reset"]],
      ["en", ["sign-up"]],
    ] as const) {
      expect(decide(lang, segments, { next: NEXT })).toMatchObject({
        kind: "view",
        data: { next: null },
      });
    }
  });

  it("sends a reader who is already signed in on to the page, or to the account without one", () => {
    expect(decide("pl", ["zaloguj"], { next: NEXT }, SESSION)).toEqual({
      kind: "redirect",
      to: NEXT,
    });
    expect(decide("pl", ["zaloguj"], { next: "https://evil.test/" }, SESSION)).toEqual({
      kind: "redirect",
      to: "/pl/konto",
    });
    expect(decide("pl", ["zaloguj"], {}, SESSION)).toEqual({ kind: "redirect", to: "/pl/konto" });
  });
});
