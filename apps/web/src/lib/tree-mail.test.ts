import { describe, expect, it } from "vitest";
import { invitationMail } from "./tree-mail.js";

describe("the invitation mail (TASK-094, AC-1)", () => {
  const link = "https://atlas.test/pl/konto/drzewa/zaproszenie?t=" + "T".repeat(43);

  it("names the owner and the link, and nothing of the invited person", () => {
    const mail = invitationMail("relative@example.test", "pl", link, "owner@example.test");
    expect(mail.to).toBe("relative@example.test");
    expect(mail.text).toContain("owner@example.test");
    expect(mail.text).toContain(link);
    expect(mail.text).toContain("14 dni");
    expect(mail.html).toContain(`<a href="${link}">`);
    expect(mail.text).not.toMatch(/19\d\d|20\d\d/u);
  });

  it("escapes what it puts into the html", () => {
    const mail = invitationMail("r@example.test", "en", link, "<b>owner</b>@example.test");
    expect(mail.html).not.toContain("<b>");
    expect(mail.html).toContain("&lt;b&gt;owner&lt;/b&gt;@example.test");
    expect(mail.subject).toContain("Name Atlas");
  });

  it("has the same shape in both languages", () => {
    const pl = invitationMail("r@example.test", "pl", link, "o@example.test");
    const en = invitationMail("r@example.test", "en", link, "o@example.test");
    expect(pl.text.split("\n").length).toBe(en.text.split("\n").length);
    expect(pl.html.split("\n").length).toBe(en.html.split("\n").length);
  });
});
