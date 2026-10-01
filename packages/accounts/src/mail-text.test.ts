import { describe, expect, it } from "vitest";
import { resetMail, verificationMail } from "./mail-text.js";

const LINK = "https://name-atlas-two.vercel.app/pl/konto/zaloz?token=abc_DEF-123";

describe("TASK-061: the messages", () => {
  it("carry the address, the link and a subject, in both languages and both kinds", () => {
    for (const [make, kind] of [
      [verificationMail, "sign-up"],
      [resetMail, "reset"],
    ] as const) {
      for (const language of ["pl", "en"] as const) {
        const mail = make("anna@example.com", language, LINK);
        expect(mail.to, `${kind} ${language}`).toBe("anna@example.com");
        expect(mail.subject.length).toBeGreaterThan(10);
        expect(mail.text).toContain(LINK);
        expect(mail.html).toContain(`href="${LINK.replaceAll("&", "&amp;")}"`);
      }
    }
  });

  it("say different things in Polish and English, and for sign-up and reset", () => {
    const pl = verificationMail("a@b.pl", "pl", LINK);
    const en = verificationMail("a@b.pl", "en", LINK);
    const reset = resetMail("a@b.pl", "pl", LINK);
    expect(pl.subject).not.toBe(en.subject);
    expect(pl.subject).not.toBe(reset.subject);
    expect(pl.text).toContain("regulamin");
    expect(en.text).toContain("terms");
    expect(reset.text).not.toContain("regulamin");
  });

  it("tell a reader who did not ask to ignore the message", () => {
    expect(verificationMail("a@b.pl", "pl", LINK).text).toContain("zignoruj");
    expect(verificationMail("a@b.pl", "en", LINK).text).toContain("ignore");
    expect(resetMail("a@b.pl", "pl", LINK).text).toContain("zignoruj");
    expect(resetMail("a@b.pl", "en", LINK).text).toContain("ignore");
  });

  it("escape what goes into the HTML part", () => {
    const mail = verificationMail("a@b.pl", "en", 'https://x.test/?a=1&b="2"<script>');
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("&lt;script&gt;");
    expect(mail.html).toContain("&amp;b=&quot;2&quot;");
  });
});
