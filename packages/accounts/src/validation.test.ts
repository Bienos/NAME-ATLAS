import { describe, expect, it } from "vitest";
import { checkEmail, checkPassword } from "./validation.js";

describe("TASK-061: an address", () => {
  it("is trimmed, and its normalised form is lower case", () => {
    const checked = checkEmail("  Anna.Nowak@Example.COM ");
    expect(checked).toEqual({
      ok: true,
      email: "Anna.Nowak@Example.COM",
      normalised: "anna.nowak@example.com",
    });
  });

  it("accepts the ordinary shapes", () => {
    for (const ok of [
      "a@b.pl",
      "anna+cards@example.com",
      "żaneta@przykład.pl",
      "x.y-z_1@sub.example.co.uk",
    ]) {
      expect(checkEmail(ok).ok, ok).toBe(true);
    }
  });

  it("refuses what cannot be an address", () => {
    for (const bad of [
      "",
      "no-at-sign",
      "@no-local.pl",
      "two@@example.com",
      "a@b@example.com",
      "spaces in@example.com",
      "anna@example",
      "anna@.example.com",
      "anna@example.com.",
      "anna@exa..mple.com",
      "line\nbreak@example.com",
      "nul\u0000byte@example.com",
      "esc\u001bchar@example.com",
      `${"a".repeat(65)}@example.com`,
      `a@${"b".repeat(250)}.pl`,
      null,
      42,
    ]) {
      expect(checkEmail(bad).ok, String(bad)).toBe(false);
    }
  });
});

describe("TASK-061: a password", () => {
  it("is 10 to 128 characters, counted in characters not bytes", () => {
    expect(checkPassword("123456789", null)).toBe("TOO_SHORT");
    expect(checkPassword("żółć-żółć-1", null)).toBeNull(); // 11 characters, more bytes
    expect(checkPassword("ąęśćżźńół", null)).toBe("TOO_SHORT"); // 9 characters, 18 bytes
    expect(checkPassword("a-b".repeat(43), null)).toBe("TOO_LONG"); // 129
    expect(checkPassword("a-b".repeat(42) + "xy", null)).toBeNull(); // 128
  });

  it("is not the address, in any case", () => {
    expect(checkPassword("Anna.Nowak@Example.com", "anna.nowak@example.com")).toBe("SAME_AS_EMAIL");
  });

  it("is not one of the commonest, or one character repeated", () => {
    expect(checkPassword("Password123", null)).toBe("TOO_COMMON");
    expect(checkPassword("QWERTYUIOP", null)).toBe("TOO_COMMON");
    expect(checkPassword("aaaaaaaaaaaa", null)).toBe("TOO_COMMON");
  });

  it("has no composition rules: a long lower-case phrase is fine", () => {
    expect(checkPassword("mój kot ma na imię burek", null)).toBeNull();
    expect(checkPassword("correcthorsebatterystaple", null)).toBeNull();
  });
});
