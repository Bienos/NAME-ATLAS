import { describe, expect, it } from "vitest";
import {
  ACCOUNT_ACTIONS,
  ACCOUNT_STEPS,
  accountPath,
  actionPath,
  isAccountAction,
  stepFromSlug,
} from "./account-paths.js";

const LANGS = ["pl", "en"] as const;

describe("the account's addresses (TASK-062)", () => {
  it("names the account page and its steps in each language", () => {
    expect(accountPath("pl", "account")).toBe("/pl/konto");
    expect(accountPath("en", "account")).toBe("/en/account");
    expect(accountPath("pl", "sign-in")).toBe("/pl/konto/zaloguj");
    expect(accountPath("en", "sign-in")).toBe("/en/account/sign-in");
    expect(accountPath("pl", "confirm")).toBe("/pl/konto/potwierdz");
    expect(accountPath("en", "new-password")).toBe("/en/account/new-password");
  });

  it("gives every step its own address in each language", () => {
    for (const lang of LANGS) {
      const paths = ACCOUNT_STEPS.map((step) => accountPath(lang, step));
      expect(new Set(paths).size, lang).toBe(ACCOUNT_STEPS.length);
    }
  });

  it("round-trips: the segments of an address name the step it was built from", () => {
    for (const lang of LANGS) {
      for (const step of ACCOUNT_STEPS) {
        const path = accountPath(lang, step);
        const segments = path.split("/").slice(3);
        expect(stepFromSlug(lang, segments), `${lang} ${step}`).toBe(step);
      }
    }
  });

  it("answers null (a 404) for a slug that is no step, another language's, or too deep", () => {
    expect(stepFromSlug("pl", ["nope"])).toBeNull();
    expect(stepFromSlug("pl", ["sign-in"])).toBeNull();
    expect(stepFromSlug("en", ["zaloguj"])).toBeNull();
    expect(stepFromSlug("pl", ["zaloguj", "extra"])).toBeNull();
    expect(stepFromSlug("pl", undefined)).toBe("account");
    expect(stepFromSlug("pl", [])).toBe("account");
  });

  it("puts a query on an address, encoded", () => {
    expect(accountPath("pl", "sign-up", { status: "sent" })).toBe("/pl/konto/zaloz?status=sent");
    expect(accountPath("en", "confirm", { token: "a-b_c", status: "too-short" })).toBe(
      "/en/account/confirm?token=a-b_c&status=too-short",
    );
    expect(accountPath("pl", "account", { status: "a b&c" })).toBe("/pl/konto?status=a+b%26c");
  });

  it("knows the seven actions and their routes", () => {
    expect(ACCOUNT_ACTIONS).toHaveLength(7);
    for (const action of ACCOUNT_ACTIONS) {
      expect(isAccountAction(action)).toBe(true);
      expect(actionPath(action)).toBe(`/api/account/${action}`);
    }
    for (const word of ["", "constructor", "SIGN-IN", "sign-in/x", "__proto__"]) {
      expect(isAccountAction(word), word).toBe(false);
    }
  });
});
