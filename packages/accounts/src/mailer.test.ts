import { describe, expect, it } from "vitest";
import { loadMailConfig } from "./config.js";
import { createMemoryMailer, createResendMailer, MailError } from "./mailer.js";
import type { OutgoingMail } from "./mail-text.js";

const MAIL: OutgoingMail = {
  to: "anna@example.com",
  subject: "Temat",
  text: "Treść",
  html: "<p>Treść</p>",
};
const CONFIG = { apiKey: "re_secret_key_123", from: "Name Atlas <konto@example.com>" };

function fakeFetch(respond: (url: string, init: RequestInit) => Response | Promise<Response>) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = ((url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init: init ?? {} });
    return Promise.resolve(respond(String(url), init ?? {}));
  }) as typeof fetch;
  return { fn, calls };
}

describe("TASK-061 AC-9: the Resend mailer", () => {
  it("posts the documented request", async () => {
    const { fn, calls } = fakeFetch(() => new Response('{"id":"1"}', { status: 200 }));
    await createResendMailer(CONFIG, fn).send(MAIL);
    expect(calls).toHaveLength(1);
    const [call] = calls;
    expect(call?.url).toBe("https://api.resend.com/emails");
    expect(call?.init.method).toBe("POST");
    const headers = call?.init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer re_secret_key_123");
    expect(headers["Content-Type"]).toBe("application/json");
    expect(JSON.parse(String(call?.init.body))).toEqual({
      from: "Name Atlas <konto@example.com>",
      to: ["anna@example.com"],
      subject: "Temat",
      text: "Treść",
      html: "<p>Treść</p>",
    });
    expect(call?.init.signal).toBeInstanceOf(AbortSignal);
  });

  it("throws the status, and neither the key nor the provider's body, on a non-2xx answer", async () => {
    const { fn } = fakeFetch(
      () =>
        new Response('{"message":"anna@example.com is not allowed; key re_secret_key_123"}', {
          status: 403,
        }),
    );
    const error = await createResendMailer(CONFIG, fn)
      .send(MAIL)
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(error).toBeInstanceOf(MailError);
    expect((error as MailError).status).toBe(403);
    expect((error as MailError).message).toBe("the mail provider answered 403");
    expect(JSON.stringify(error)).not.toContain("re_secret_key_123");
    expect((error as MailError).message).not.toContain("anna@example.com");
  });

  it("throws a MailError without a status when the provider cannot be reached, and without the cause", async () => {
    const fn = (() =>
      Promise.reject(
        new TypeError("fetch failed: getaddrinfo ENOTFOUND re_secret_key_123"),
      )) as typeof fetch;
    const error = await createResendMailer(CONFIG, fn)
      .send(MAIL)
      .then(
        () => null,
        (e: unknown) => e,
      );
    expect(error).toBeInstanceOf(MailError);
    expect((error as MailError).status).toBeNull();
    expect((error as MailError).message).toBe("the mail provider could not be reached");
    expect((error as MailError).cause).toBeUndefined();
  });

  it("is replaced in tests by a mailer that only collects", async () => {
    const memory = createMemoryMailer();
    await memory.send(MAIL);
    expect(memory.sent).toEqual([MAIL]);
  });
});

describe("TASK-061: the mail configuration", () => {
  it("needs both variables, and trims them", () => {
    expect(
      loadMailConfig({ RESEND_API_KEY: " k ", ACCOUNTS_MAIL_FROM: " Name <a@b.pl> " }),
    ).toEqual({
      apiKey: "k",
      from: "Name <a@b.pl>",
    });
  });

  it("is null, meaning accounts are off, when either is missing or blank", () => {
    expect(loadMailConfig({})).toBeNull();
    expect(loadMailConfig({ RESEND_API_KEY: "k" })).toBeNull();
    expect(loadMailConfig({ ACCOUNTS_MAIL_FROM: "Name <a@b.pl>" })).toBeNull();
    expect(
      loadMailConfig({ RESEND_API_KEY: "  ", ACCOUNTS_MAIL_FROM: "Name <a@b.pl>" }),
    ).toBeNull();
  });
});
