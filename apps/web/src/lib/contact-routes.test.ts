import { createMemoryMailer } from "@name-atlas/accounts";
import type { Mailer } from "@name-atlas/accounts";
import { describe, expect, it } from "vitest";
import { CONTACT_INBOX } from "./contact.js";
import { contactMailConfig, handleContactPost } from "./contact-routes.js";
import { CONTACT_POLICY, policyFor } from "./request-policy.js";

const HOST = "name-atlas.test";

function post(fields: Record<string, string>, headers: Record<string, string> = {}): Request {
  return new Request(`https://${HOST}/api/contact`, {
    method: "POST",
    headers: {
      host: HOST,
      origin: `https://${HOST}`,
      "content-type": "application/x-www-form-urlencoded",
      ...headers,
    },
    body: new URLSearchParams(fields),
  });
}

const GOOD = {
  lang: "pl",
  name: "Ewa",
  email: "ewa@example.com",
  topic: "Błąd w danych",
  message: "Liczba dla NOWAK\r\nwygląda źle.",
};

function deps(mailer: Mailer | null) {
  const warnings: string[] = [];
  return {
    warnings,
    deps: { mailer, log: { warn: (event: string) => void warnings.push(event) } },
  };
}

describe("POST /api/contact", () => {
  it("sends the message to the owner with the writer as reply-to, then 303s to the page", async () => {
    const mailer = createMemoryMailer();
    const response = await handleContactPost(post(GOOD), deps(mailer).deps);
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("/pl/kontakt?status=sent#form");
    expect(mailer.sent).toHaveLength(1);
    const [mail] = mailer.sent;
    expect(mail?.to).toBe(CONTACT_INBOX);
    expect(mail?.replyTo).toBe("ewa@example.com");
    expect(mail?.subject).toBe("Name Atlas, kontakt: Błąd w danych");
    expect(mail?.text).toContain("Od: Ewa <ewa@example.com>");
    expect(mail?.text).toContain("Liczba dla NOWAK\nwygląda źle.");
  });

  it("answers JSON when the form's script asks for it", async () => {
    const response = await handleContactPost(
      post({ ...GOOD, lang: "en" }, { accept: "application/json" }),
      deps(createMemoryMailer()).deps,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "sent" });
  });

  it("refuses a bad address or an empty message, and sends nothing", async () => {
    const mailer = createMemoryMailer();
    for (const fields of [
      { ...GOOD, email: "not-an-address" },
      { ...GOOD, message: "   " },
      { ...GOOD, message: "x".repeat(5_001) },
    ]) {
      const response = await handleContactPost(post(fields), deps(mailer).deps);
      expect(response.headers.get("location")).toBe("/pl/kontakt?status=invalid#form");
    }
    expect(mailer.sent).toHaveLength(0);
  });

  it("escapes the message in the HTML part and drops an unknown topic", async () => {
    const mailer = createMemoryMailer();
    await handleContactPost(
      post({ ...GOOD, topic: "<b>x</b>", message: "<script>1</script>" }),
      deps(mailer).deps,
    );
    expect(mailer.sent[0]?.html).toContain("&lt;script&gt;1&lt;/script&gt;");
    expect(mailer.sent[0]?.subject).toBe("Name Atlas, kontakt: Inne");
  });

  it("tells a filled hidden field it was sent, and sends nothing", async () => {
    const mailer = createMemoryMailer();
    const response = await handleContactPost(post({ ...GOOD, website: "spam" }), deps(mailer).deps);
    expect(response.headers.get("location")).toBe("/pl/kontakt?status=sent#form");
    expect(mailer.sent).toHaveLength(0);
  });

  it("says sending is not switched on without a mail configuration", async () => {
    const response = await handleContactPost(post(GOOD), deps(null).deps);
    expect(response.headers.get("location")).toBe("/pl/kontakt?status=unavailable#form");
  });

  it("says it failed, and logs the provider's status only, when the provider refuses", async () => {
    const failing: Mailer = { send: () => Promise.reject(new Error("boom")) };
    const { deps: d, warnings } = deps(failing);
    const response = await handleContactPost(post(GOOD), d);
    expect(response.headers.get("location")).toBe("/pl/kontakt?status=failed#form");
    expect(warnings).toEqual(["contact_mail_failed"]);
  });

  it("refuses a post from another site", async () => {
    const response = await handleContactPost(
      post(GOOD, { origin: "https://evil.test" }),
      deps(createMemoryMailer()).deps,
    );
    expect(response.status).toBe(403);
  });

  it("is held to its own rate bucket", () => {
    expect(policyFor("/api/contact")).toBe(CONTACT_POLICY);
  });
});

describe("contactMailConfig", () => {
  const env = (vars: Record<string, string>) => vars as NodeJS.ProcessEnv;
  it("needs the key and a sender, its own or the accounts'", () => {
    expect(contactMailConfig(env({}))).toBeNull();
    expect(contactMailConfig(env({ RESEND_API_KEY: "k" }))).toBeNull();
    expect(contactMailConfig(env({ RESEND_API_KEY: "k", ACCOUNTS_MAIL_FROM: "a@x.pl" }))).toEqual({
      apiKey: "k",
      from: "a@x.pl",
    });
    expect(
      contactMailConfig(
        env({
          RESEND_API_KEY: "k",
          ACCOUNTS_MAIL_FROM: "a@x.pl",
          CONTACT_MAIL_FROM: "c@x.pl",
        }),
      )?.from,
    ).toBe("c@x.pl");
  });
});
