import { describe, expect, it } from "vitest";
import { surnamePrefixResponseSchema } from "./surname-prefix.js";

const ok = {
  schema_version: "1.0",
  status: "SUGGESTIONS",
  items: [
    { display_name: "WIŚNIEWSKA", path: "/pl/nazwisko/wisniewska" },
    { display_name: "A/GADIR", path: null },
  ],
};

describe("surnamePrefixResponseSchema", () => {
  it("accepts suggestions with and without an address", () => {
    expect(surnamePrefixResponseSchema.safeParse(ok).success).toBe(true);
  });

  it("carries no figure: an extra field such as a count is stripped, not passed on", () => {
    const parsed = surnamePrefixResponseSchema.parse({
      ...ok,
      items: [{ display_name: "NOWAK", path: "/pl/nazwisko/nowak", count: 98387, score: 0.9 }],
    });
    expect(parsed.items[0]).toEqual({ display_name: "NOWAK", path: "/pl/nazwisko/nowak" });
  });

  it("refuses more than eight items, and items on a non-suggestion status", () => {
    const nine = Array.from({ length: 9 }, (_, i) => ({ display_name: `A${i}`, path: null }));
    expect(surnamePrefixResponseSchema.safeParse({ ...ok, items: nine }).success).toBe(false);
    expect(surnamePrefixResponseSchema.safeParse({ ...ok, status: "TOO_SHORT" }).success).toBe(
      false,
    );
  });

  it("refuses a path that is not a surname page", () => {
    const bad = { ...ok, items: [{ display_name: "NOWAK", path: "https://evil.example/x" }] };
    expect(surnamePrefixResponseSchema.safeParse(bad).success).toBe(false);
  });
});
