import { MailError } from "@name-atlas/accounts";
import type { OutgoingMail } from "@name-atlas/accounts";
import { describe, expect, it, vi } from "vitest";
import {
  handleAccountPost,
  handleAccountsPurge,
  isSameSiteRequest,
  problemStatus,
} from "./account-routes.js";
import type { AccountRouteDeps } from "./account-routes.js";

const ORIGIN = "https://atlas.test";
const TOKEN = "T".repeat(43);
const SESSION = "S".repeat(43);

/** What a reader types. Each is unique, so a leak into a redirect or a log is found by `includes`. */
const EMAIL = "reader.secret@example.test";
const PASSWORD = "correct horse battery staple 7731";

interface Fakes {
  readonly deps: AccountRouteDeps;
  readonly accounts: {
    [K in keyof AccountRouteDeps["accounts"]]: ReturnType<typeof vi.fn>;
  };
  readonly sent: OutgoingMail[];
  readonly tasks: (() => Promise<void>)[];
  readonly logged: { event: string; fields: unknown }[];
  readonly send: ReturnType<typeof vi.fn>;
}

function fakes(secure = true): Fakes {
  const accounts = {
    signUp: vi.fn(),
    completeSignUp: vi.fn(),
    signIn: vi.fn(),
    sessionFromToken: vi.fn(),
    signOut: vi.fn(() => Promise.resolve()),
    requestPasswordReset: vi.fn(),
    resetPassword: vi.fn(),
    deleteAccount: vi.fn(),
  };
  const sent: OutgoingMail[] = [];
  const tasks: (() => Promise<void>)[] = [];
  const logged: { event: string; fields: unknown }[] = [];
  const send = vi.fn((mail: OutgoingMail) => {
    sent.push(mail);
    return Promise.resolve();
  });
  const deps: AccountRouteDeps = {
    accounts: accounts as unknown as AccountRouteDeps["accounts"],
    mailer: { send },
    after: (task) => tasks.push(task),
    secure,
    termsVersion: "2026-10-01",
    log: {
      info: (event, fields) => logged.push({ event, fields }),
      warn: (event, fields) => logged.push({ event, fields }),
    },
  };
  return { deps, accounts, sent, tasks, logged, send };
}

const MAIL: OutgoingMail = { to: EMAIL, subject: "s", text: "t", html: "<p>t</p>" };

function post(
  action: string,
  fields: Readonly<Record<string, string>>,
  options: {
    origin?: string | null;
    cookie?: string;
    type?: string;
    headers?: Record<string, string>;
  } = {},
): Request {
  const headers = new Headers({
    "content-type": options.type ?? "application/x-www-form-urlencoded",
    ...options.headers,
  });
  const origin = options.origin === undefined ? ORIGIN : options.origin;
  if (origin !== null) headers.set("origin", origin);
  if (options.cookie !== undefined) headers.set("cookie", options.cookie);
  return new Request(`${ORIGIN}/api/account/${action}`, {
    method: "POST",
    headers,
    body: new URLSearchParams(fields).toString(),
  });
}

function location(response: Response): string {
  expect(response.status).toBe(303);
  return response.headers.get("location") ?? "";
}

describe("is the request from this site (TASK-062, AC-3)", () => {
  const at = (headers: Record<string, string>) =>
    new Request(`${ORIGIN}/api/account/sign-in`, { method: "POST", headers });

  it("accepts this site's own Origin", () => {
    expect(isSameSiteRequest(at({ origin: ORIGIN }))).toBe(true);
  });

  it("refuses another site's, an unparsable one and a non-web one", () => {
    for (const origin of [
      "https://evil.test",
      "not a url",
      "chrome-extension://abc",
      "https://atlas.test.evil.test",
    ]) {
      expect(isSameSiteRequest(at({ origin })), origin).toBe(false);
    }
  });

  it("takes a null Origin, which a no-referrer page makes the browser write, only with Sec-Fetch-Site: same-origin", () => {
    expect(isSameSiteRequest(at({ origin: "null", "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameSiteRequest(at({ origin: "null", "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameSiteRequest(at({ origin: "null", "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameSiteRequest(at({ origin: "null" }))).toBe(false);
  });

  it("compares with the host the browser asked for, not the one the server believes it has", () => {
    // Next fills `request.url`'s host from its own configuration (`localhost`).
    const asked = (headers: Record<string, string>) =>
      new Request("http://localhost:3100/api/account/sign-in", { method: "POST", headers });
    expect(
      isSameSiteRequest(asked({ origin: "http://127.0.0.1:3100", host: "127.0.0.1:3100" })),
    ).toBe(true);
    expect(
      isSameSiteRequest(
        asked({
          origin: "https://atlas.test",
          "x-forwarded-host": "atlas.test",
          host: "internal:3000",
        }),
      ),
    ).toBe(true);
    expect(
      isSameSiteRequest(
        asked({ origin: "https://atlas.test", "x-forwarded-host": "other.test, atlas.test" }),
      ),
    ).toBe(false);
    expect(isSameSiteRequest(asked({ origin: "https://evil.test", host: "atlas.test" }))).toBe(
      false,
    );
    // Neither header: the request's own url is the last resort.
    expect(isSameSiteRequest(asked({ origin: "http://localhost:3100" }))).toBe(true);
  });

  it("falls back to Sec-Fetch-Site only when there is no Origin", () => {
    expect(isSameSiteRequest(at({ "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameSiteRequest(at({ "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameSiteRequest(at({ "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameSiteRequest(at({}))).toBe(false);
    // A foreign Origin is not rescued by a Sec-Fetch-Site header.
    expect(
      isSameSiteRequest(at({ origin: "https://evil.test", "sec-fetch-site": "same-origin" })),
    ).toBe(false);
  });
});

describe("the account's POST routes: what they refuse before anything is read (AC-3)", () => {
  it("answers 403 and calls nothing for another site, or for no origin at all", async () => {
    for (const origin of ["https://evil.test", null]) {
      const f = fakes();
      const response = await handleAccountPost(
        "sign-in",
        post("sign-in", { email: EMAIL, password: PASSWORD }, { origin }),
        f.deps,
      );
      expect(response.status, String(origin)).toBe(403);
      for (const fn of Object.values(f.accounts)) expect(fn).not.toHaveBeenCalled();
    }
  });

  it("answers 404 for an action that does not exist, 400 for a body that is not a form or is too big", async () => {
    const f = fakes();
    expect((await handleAccountPost("constructor", post("x", {}), f.deps)).status).toBe(404);
    expect(
      (
        await handleAccountPost(
          "sign-in",
          post("sign-in", {}, { type: "application/json" }),
          f.deps,
        )
      ).status,
    ).toBe(400);
    const big = post("sign-in", { email: EMAIL }, { headers: { "content-length": "99999" } });
    expect((await handleAccountPost("sign-in", big, f.deps)).status).toBe(400);
    expect(f.accounts.signIn).not.toHaveBeenCalled();
  });

  it("treats a field too long to be one of ours as empty", async () => {
    const f = fakes();
    f.accounts.signIn.mockResolvedValue({ kind: "REJECTED" });
    await handleAccountPost(
      "sign-in",
      post("sign-in", { email: EMAIL, password: "x".repeat(5000) }),
      f.deps,
    );
    expect(f.accounts.signIn).toHaveBeenCalledWith({ email: EMAIL, password: "" });
  });
});

describe("sign-up (AC-4)", () => {
  it("answers one redirect for a new address and an existing one, and sends the mail after, not before", async () => {
    const created = fakes();
    created.accounts.signUp.mockResolvedValue({ kind: "CHECK_EMAIL", mail: MAIL });
    const existing = fakes();
    existing.accounts.signUp.mockResolvedValue({ kind: "CHECK_EMAIL", mail: null });

    const a = await handleAccountPost(
      "sign-up",
      post("sign-up", { email: EMAIL, lang: "pl" }),
      created.deps,
    );
    const b = await handleAccountPost(
      "sign-up",
      post("sign-up", { email: EMAIL, lang: "pl" }),
      existing.deps,
    );

    expect(location(a)).toBe("/pl/konto/zaloz?status=sent");
    expect(location(b)).toBe(location(a));
    // The answer has gone; the mail has not been sent yet.
    expect(created.send).not.toHaveBeenCalled();
    expect(created.tasks).toHaveLength(1);
    await created.tasks[0]?.();
    expect(created.sent).toEqual([MAIL]);
    expect(existing.tasks).toHaveLength(0);
  });

  it("passes the language to the service, and answers in it", async () => {
    const f = fakes();
    f.accounts.signUp.mockResolvedValue({ kind: "CHECK_EMAIL", mail: null });
    const response = await handleAccountPost(
      "sign-up",
      post("sign-up", { email: EMAIL, lang: "en" }),
      f.deps,
    );
    expect(location(response)).toBe("/en/account/sign-up?status=sent");
    expect(f.accounts.signUp).toHaveBeenCalledWith({ email: EMAIL, language: "en" });
    f.accounts.signUp.mockClear();
    await handleAccountPost("sign-up", post("sign-up", { email: EMAIL, lang: "de" }), f.deps);
    expect(f.accounts.signUp).toHaveBeenCalledWith({ email: EMAIL, language: "pl" });
  });

  it("answers `email` for a malformed address and sends nothing", async () => {
    const f = fakes();
    f.accounts.signUp.mockResolvedValue({ kind: "INVALID", problem: "EMAIL" });
    const response = await handleAccountPost(
      "sign-up",
      post("sign-up", { email: "nope", lang: "pl" }),
      f.deps,
    );
    expect(location(response)).toBe("/pl/konto/zaloz?status=email");
    expect(f.tasks).toHaveLength(0);
  });

  it("logs a failed send by its status alone: no address, no body", async () => {
    const f = fakes();
    f.accounts.signUp.mockResolvedValue({ kind: "CHECK_EMAIL", mail: MAIL });
    f.send.mockRejectedValueOnce(new MailError("the mail provider answered 403", 403));
    await handleAccountPost("sign-up", post("sign-up", { email: EMAIL, lang: "pl" }), f.deps);
    await f.tasks[0]?.();
    expect(f.logged).toEqual([{ event: "account_mail_failed", fields: { status: 403 } }]);
    expect(JSON.stringify(f.logged)).not.toContain(EMAIL);
  });
});

describe("completing the sign-up (AC-5)", () => {
  const form = { token: TOKEN, password: PASSWORD, terms: "on", lang: "pl" };

  it("signs the reader in: the cookie is set, HttpOnly, SameSite=Lax and Secure, and the page is the account's", async () => {
    const f = fakes();
    f.accounts.completeSignUp.mockResolvedValue({
      kind: "SIGNED_IN",
      userId: "u-1",
      sessionToken: SESSION,
      expiresAt: new Date(),
    });
    const response = await handleAccountPost("complete", post("complete", form), f.deps);
    expect(location(response)).toBe("/pl/konto?status=welcome");
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie.startsWith(`__Host-na_session=${SESSION};`)).toBe(true);
    for (const part of ["HttpOnly", "SameSite=Lax", "Secure", "Path=/"])
      expect(cookie).toContain(part);
    expect(f.logged).toEqual([{ event: "account_created", fields: { userId: "u-1" } }]);
  });

  it("records the server's terms version and the box as ticked, never a version the form sends", async () => {
    const f = fakes();
    f.accounts.completeSignUp.mockResolvedValue({ kind: "INVALID_OR_EXPIRED" });
    await handleAccountPost(
      "complete",
      post("complete", { ...form, termsVersion: "1999-01-01" }),
      f.deps,
    );
    expect(f.accounts.completeSignUp).toHaveBeenCalledWith({
      token: TOKEN,
      password: PASSWORD,
      termsVersion: "2026-10-01",
      termsAccepted: true,
    });
    f.accounts.completeSignUp.mockClear();
    const { terms: _terms, ...unticked } = form;
    await handleAccountPost("complete", post("complete", unticked), f.deps);
    expect(f.accounts.completeSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ termsAccepted: false }),
    );
  });

  it("returns a weak password or an unticked box to the form, keeping the token", async () => {
    const f = fakes();
    for (const problem of ["TOO_SHORT", "TOO_LONG", "SAME_AS_EMAIL", "TOO_COMMON", "TERMS"]) {
      f.accounts.completeSignUp.mockResolvedValueOnce({ kind: "INVALID", problem });
      const response = await handleAccountPost("complete", post("complete", form), f.deps);
      expect(location(response), problem).toBe(
        `/pl/konto/potwierdz?status=${problemStatus(problem)}&token=${TOKEN}`,
      );
      expect(response.headers.get("set-cookie"), problem).toBeNull();
    }
  });

  it("says `expired` for a link that has lapsed or been used, and drops the token", async () => {
    const f = fakes();
    f.accounts.completeSignUp.mockResolvedValue({ kind: "INVALID_OR_EXPIRED" });
    const response = await handleAccountPost("complete", post("complete", form), f.deps);
    expect(location(response)).toBe("/pl/konto/potwierdz?status=expired");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it("does not carry a token that is not shaped like one into a redirect", async () => {
    const f = fakes();
    f.accounts.completeSignUp.mockResolvedValue({ kind: "INVALID", problem: "TOO_SHORT" });
    const response = await handleAccountPost(
      "complete",
      post("complete", { ...form, token: "<script>" }),
      f.deps,
    );
    expect(location(response)).toBe("/pl/konto/potwierdz?status=too-short");
  });
});

describe("sign-in (AC-6)", () => {
  const form = { email: EMAIL, password: PASSWORD, lang: "en" };

  it("sets the cookie and goes to the account", async () => {
    const f = fakes();
    f.accounts.signIn.mockResolvedValue({
      kind: "SIGNED_IN",
      userId: "u-1",
      sessionToken: SESSION,
      expiresAt: new Date(),
    });
    const response = await handleAccountPost("sign-in", post("sign-in", form), f.deps);
    expect(location(response)).toBe("/en/account");
    expect(response.headers.get("set-cookie")).toContain(`__Host-na_session=${SESSION}`);
  });

  it("goes on to the surname page the form names (TASK-064, AC-6)", async () => {
    const f = fakes();
    f.accounts.signIn.mockResolvedValue({
      kind: "SIGNED_IN",
      userId: "u-1",
      sessionToken: SESSION,
      expiresAt: new Date(),
    });
    const next = "/pl/nazwisko/kowalski?view=cards";
    const response = await handleAccountPost("sign-in", post("sign-in", { ...form, next }), f.deps);
    expect(location(response)).toBe(next);
    expect(response.headers.get("set-cookie")).toContain(`__Host-na_session=${SESSION}`);
  });

  it("goes to the account, not where an unsafe address says, however it is written", async () => {
    const f = fakes();
    f.accounts.signIn.mockResolvedValue({
      kind: "SIGNED_IN",
      userId: "u-1",
      sessionToken: SESSION,
      expiresAt: new Date(),
    });
    for (const next of [
      "https://evil.test/",
      "//evil.test",
      "/\\evil.test",
      "/pl/konto/zaloguj",
      "/pl/nazwisko/..",
      "/pl/nazwisko/kowalski\r\nSet-Cookie: x=y",
      "",
    ]) {
      const response = await handleAccountPost(
        "sign-in",
        post("sign-in", { ...form, next }),
        f.deps,
      );
      expect(location(response), next).toBe("/en/account");
    }
  });

  it("keeps the page to return to when the sign-in fails, and carries no address or password", async () => {
    const f = fakes();
    const next = "/en/surname/nowak?view=cards";
    f.accounts.signIn.mockResolvedValue({ kind: "REJECTED" });
    const rejected = await handleAccountPost("sign-in", post("sign-in", { ...form, next }), f.deps);
    expect(location(rejected)).toBe(
      "/en/account/sign-in?status=rejected&next=%2Fen%2Fsurname%2Fnowak%3Fview%3Dcards",
    );
    f.accounts.signIn.mockResolvedValue({ kind: "THROTTLED" });
    const throttled = await handleAccountPost(
      "sign-in",
      post("sign-in", { ...form, next }),
      f.deps,
    );
    expect(location(throttled)).toContain("status=throttled&next=");
    for (const response of [rejected, throttled]) {
      const where = decodeURIComponent(location(response));
      expect(where).not.toContain(EMAIL);
      expect(where).not.toContain(PASSWORD);
    }
    // An unsafe one is dropped from the redirect too.
    const dropped = await handleAccountPost(
      "sign-in",
      post("sign-in", { ...form, next: "https://evil.test/" }),
      f.deps,
    );
    expect(location(dropped)).toBe("/en/account/sign-in?status=throttled");
  });

  it("answers one word for a wrong password, an unknown address and a pending one, and `throttled` for a throttled one", async () => {
    const f = fakes();
    f.accounts.signIn.mockResolvedValue({ kind: "REJECTED" });
    const rejected = await handleAccountPost("sign-in", post("sign-in", form), f.deps);
    expect(location(rejected)).toBe("/en/account/sign-in?status=rejected");
    expect(rejected.headers.get("set-cookie")).toBeNull();
    f.accounts.signIn.mockResolvedValue({ kind: "THROTTLED" });
    const throttled = await handleAccountPost("sign-in", post("sign-in", form), f.deps);
    expect(location(throttled)).toBe("/en/account/sign-in?status=throttled");
  });

  it("uses the unprefixed cookie name, without Secure, where the site is served over HTTP", async () => {
    const f = fakes(false);
    f.accounts.signIn.mockResolvedValue({
      kind: "SIGNED_IN",
      userId: "u",
      sessionToken: SESSION,
      expiresAt: new Date(),
    });
    const response = await handleAccountPost("sign-in", post("sign-in", form), f.deps);
    const cookie = response.headers.get("set-cookie") ?? "";
    expect(cookie.startsWith(`na_session=${SESSION};`)).toBe(true);
    expect(cookie).not.toContain("Secure");
  });
});

describe("sign-out, reset and deletion (AC-7, AC-8)", () => {
  const cookie = `__Host-na_session=${SESSION}`;

  it("signs out the session the cookie names, clears the cookie, and works with no session at all", async () => {
    const f = fakes();
    const response = await handleAccountPost(
      "sign-out",
      post("sign-out", { lang: "pl" }, { cookie }),
      f.deps,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj?status=signedout");
    expect(f.accounts.signOut).toHaveBeenCalledWith(SESSION);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    await handleAccountPost("sign-out", post("sign-out", { lang: "pl" }), f.deps);
    expect(f.accounts.signOut).toHaveBeenLastCalledWith(null);
  });

  it("clears the cookie even when the session's row could not be ended, and says so in the log by name only", async () => {
    const f = fakes();
    f.accounts.signOut.mockRejectedValue(new Error(`db down for ${EMAIL}`));
    const response = await handleAccountPost(
      "sign-out",
      post("sign-out", { lang: "en" }, { cookie }),
      f.deps,
    );
    expect(location(response)).toBe("/en/account/sign-in?status=signedout");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(f.logged).toEqual([{ event: "account_sign_out_failed", fields: { error: "Error" } }]);
    expect(JSON.stringify(f.logged)).not.toContain(EMAIL);
  });

  it("answers a reset request the same whether or not a mail goes out, and sends it after", async () => {
    const withMail = fakes();
    withMail.accounts.requestPasswordReset.mockResolvedValue({ mail: MAIL });
    const without = fakes();
    without.accounts.requestPasswordReset.mockResolvedValue({ mail: null });
    const a = await handleAccountPost(
      "reset-request",
      post("reset-request", { email: EMAIL, lang: "pl" }),
      withMail.deps,
    );
    const b = await handleAccountPost(
      "reset-request",
      post("reset-request", { email: EMAIL, lang: "pl" }),
      without.deps,
    );
    expect(location(a)).toBe("/pl/konto/reset?status=sent");
    expect(location(b)).toBe(location(a));
    expect(withMail.send).not.toHaveBeenCalled();
    await withMail.tasks[0]?.();
    expect(withMail.sent).toEqual([MAIL]);
    expect(without.tasks).toHaveLength(0);
  });

  it("resets: the sessions are gone, this browser's cookie too, and the reader signs in again", async () => {
    const f = fakes();
    f.accounts.resetPassword.mockResolvedValue({ kind: "OK" });
    const response = await handleAccountPost(
      "reset",
      post("reset", { token: TOKEN, password: PASSWORD, lang: "pl" }),
      f.deps,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj?status=reset");
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(f.accounts.resetPassword).toHaveBeenCalledWith({ token: TOKEN, newPassword: PASSWORD });
  });

  it("returns a weak new password to the form with its token, and says `expired` for a lapsed link", async () => {
    const f = fakes();
    f.accounts.resetPassword.mockResolvedValueOnce({ kind: "INVALID", problem: "TOO_COMMON" });
    const weak = await handleAccountPost(
      "reset",
      post("reset", { token: TOKEN, password: "x", lang: "en" }),
      f.deps,
    );
    expect(location(weak)).toBe(`/en/account/new-password?status=too-common&token=${TOKEN}`);
    f.accounts.resetPassword.mockResolvedValueOnce({ kind: "INVALID_OR_EXPIRED" });
    const lapsed = await handleAccountPost(
      "reset",
      post("reset", { token: TOKEN, password: PASSWORD, lang: "en" }),
      f.deps,
    );
    expect(location(lapsed)).toBe("/en/account/new-password?status=expired");
  });

  it("needs a session to delete, and sends a reader without one to sign in", async () => {
    const f = fakes();
    f.accounts.sessionFromToken.mockResolvedValue(null);
    const response = await handleAccountPost(
      "delete",
      post("delete", { password: PASSWORD, lang: "pl" }, { cookie }),
      f.deps,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj");
    expect(f.accounts.deleteAccount).not.toHaveBeenCalled();
  });

  it("deletes the signed-in account (the session's user, never one the form names), clears the cookie, and logs the id", async () => {
    const f = fakes();
    f.accounts.sessionFromToken.mockResolvedValue({ userId: "u-real" });
    f.accounts.deleteAccount.mockResolvedValue({ kind: "DELETED" });
    const response = await handleAccountPost(
      "delete",
      post("delete", { password: PASSWORD, userId: "u-other", lang: "pl" }, { cookie }),
      f.deps,
    );
    expect(location(response)).toBe("/pl/konto/zaloguj?status=deleted");
    expect(f.accounts.deleteAccount).toHaveBeenCalledWith({ userId: "u-real", password: PASSWORD });
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(f.logged).toEqual([{ event: "account_deleted", fields: { userId: "u-real" } }]);
  });

  it("keeps the account and the cookie when the password is wrong", async () => {
    const f = fakes();
    f.accounts.sessionFromToken.mockResolvedValue({ userId: "u-real" });
    f.accounts.deleteAccount.mockResolvedValue({ kind: "WRONG_PASSWORD" });
    const response = await handleAccountPost(
      "delete",
      post("delete", { password: "nope", lang: "en" }, { cookie }),
      f.deps,
    );
    expect(location(response)).toBe("/en/account?status=wrong-password");
    expect(response.headers.get("set-cookie")).toBeNull();
  });
});

describe("what never leaves a route (AC-12)", () => {
  it("puts no address, password or token into a redirect, a log line or a cookie other than the session's", async () => {
    const f = fakes();
    f.accounts.signUp.mockResolvedValue({ kind: "CHECK_EMAIL", mail: null });
    f.accounts.signIn.mockResolvedValue({ kind: "REJECTED" });
    f.accounts.requestPasswordReset.mockResolvedValue({ mail: null });
    f.accounts.completeSignUp.mockResolvedValue({ kind: "INVALID_OR_EXPIRED" });
    f.accounts.resetPassword.mockResolvedValue({ kind: "INVALID_OR_EXPIRED" });
    const form = { email: EMAIL, password: PASSWORD, token: TOKEN, terms: "on", lang: "pl" };
    for (const action of ["sign-up", "sign-in", "reset-request", "complete", "reset"]) {
      const response = await handleAccountPost(action, post(action, form), f.deps);
      const seen = JSON.stringify([...response.headers.entries()]);
      expect(seen, action).not.toContain(EMAIL);
      expect(seen, action).not.toContain("secret");
      expect(seen, action).not.toContain(PASSWORD);
      expect(response.headers.get("cache-control"), action).toBe("no-store");
    }
    expect(JSON.stringify(f.logged)).not.toContain(EMAIL);
    expect(JSON.stringify(f.logged)).not.toContain(PASSWORD);
  });

  it("answers a service failure with a status word on the page the reader came from, and logs the error's name only", async () => {
    const f = fakes();
    f.accounts.signIn.mockRejectedValue(new Error(`connect ECONNREFUSED for ${EMAIL}`));
    const response = await handleAccountPost(
      "sign-in",
      post("sign-in", { email: EMAIL, password: PASSWORD, lang: "en" }),
      f.deps,
    );
    expect(location(response)).toBe("/en/account/sign-in?status=error");
    expect(f.logged).toEqual([
      { event: "account_route_failed", fields: { action: "sign-in", error: "Error" } },
    ]);
    expect(JSON.stringify(f.logged)).not.toContain("ECONNREFUSED");
  });

  it("keeps the token when a token form fails on our side, so the reader can try again", async () => {
    const f = fakes();
    f.accounts.completeSignUp.mockRejectedValue(new Error("down"));
    const response = await handleAccountPost(
      "complete",
      post("complete", { token: TOKEN, password: PASSWORD, terms: "on", lang: "pl" }),
      f.deps,
    );
    expect(location(response)).toBe(`/pl/konto/potwierdz?status=error&token=${TOKEN}`);
  });

  it("names the status word for each of the service's problems", () => {
    expect(problemStatus("TOO_SHORT")).toBe("too-short");
    expect(problemStatus("SAME_AS_EMAIL")).toBe("same-as-email");
    expect(problemStatus("TERMS")).toBe("terms");
  });
});

describe("the daily purge (AC-9)", () => {
  const log = { info: vi.fn(), warn: vi.fn() };
  const get = (authorization?: string) =>
    new Request("https://atlas.test/api/cron/accounts-purge", {
      headers: authorization === undefined ? {} : { authorization },
    });
  const COUNTS = { sessions: 3, tokens: 2, failures: 1, pending: 4 };

  it("does nothing, and says so, when accounts are off", async () => {
    const response = await handleAccountsPurge(get(), null, log);
    expect(response.status).toBe(204);
  });

  it("refuses a call without the bearer, or with a wrong one, and purges nothing", async () => {
    const purgeExpired = vi.fn();
    const runtime = { accounts: { purgeExpired }, cronSecret: "s3cret" };
    for (const header of [
      undefined,
      "",
      "Bearer",
      "Bearer wrong",
      "s3cret",
      "bearer s3cret",
      "Bearer s3cret2",
    ]) {
      const response = await handleAccountsPurge(get(header), runtime, log);
      expect(response.status, String(header)).toBe(401);
    }
    expect(purgeExpired).not.toHaveBeenCalled();
  });

  it("purges with the bearer and answers counts and nothing else", async () => {
    const purgeExpired = vi.fn(() => Promise.resolve(COUNTS));
    const response = await handleAccountsPurge(
      get("Bearer s3cret"),
      { accounts: { purgeExpired }, cronSecret: "s3cret" },
      log,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(COUNTS);
    expect(purgeExpired).toHaveBeenCalledTimes(1);
  });

  it("answers 500 without the error's text when the purge fails", async () => {
    const purgeExpired = vi.fn(() => Promise.reject(new Error("secret detail")));
    const response = await handleAccountsPurge(
      get("Bearer s3cret"),
      { accounts: { purgeExpired }, cronSecret: "s3cret" },
      log,
    );
    expect(response.status).toBe(500);
    expect(await response.text()).not.toContain("secret detail");
  });
});
