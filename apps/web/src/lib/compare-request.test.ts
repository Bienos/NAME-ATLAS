import { describe, expect, it } from "vitest";
import { comparisonPath, comparisonRequest } from "./compare-request.js";

describe("the comparison route's query (TASK-052)", () => {
  it("compares two addresses as before", () => {
    expect(comparisonRequest({ a: "nowak", b: "kowalski" }, "pl")).toEqual({
      kind: "COMPARE",
      a: "nowak",
      b: "kowalski",
    });
  });

  it("turns two typed surnames into addresses by the slug rule, and redirects", () => {
    expect(comparisonRequest({ qa: " Nowak ", qb: "WIŚNIEWSKA" }, "pl")).toEqual({
      kind: "REDIRECT",
      to: "/pl/porownaj?a=nowak&b=wi%C5%9Bniewska",
    });
    expect(comparisonRequest({ qa: "Kowalska-Nowak", qb: "Zaremba" }, "en")).toEqual({
      kind: "REDIRECT",
      to: "/en/compare?a=kowalska-nowak&b=zaremba",
    });
  });

  it("keeps the picker, with an error, when a typed surname makes no address", () => {
    expect(comparisonRequest({ qa: "Nowak", qb: "" }, "pl")).toEqual({
      kind: "PICK",
      first: "Nowak",
      second: "",
      error: true,
    });
    expect(comparisonRequest({ qa: "Nowak", qb: "!!!" }, "pl")).toMatchObject({
      kind: "PICK",
      error: true,
    });
  });

  it("shows the picker without an error when the page is opened bare or with one address", () => {
    expect(comparisonRequest({}, "pl")).toEqual({
      kind: "PICK",
      first: "",
      second: "",
      error: false,
    });
    expect(comparisonRequest({ a: "nowak" }, "en")).toEqual({
      kind: "PICK",
      first: "nowak",
      second: "",
      error: false,
    });
  });

  it("encodes the slugs in the address", () => {
    expect(comparisonPath("o'neil", "a b", "pl")).toBe("/pl/porownaj?a=o'neil&b=a%20b");
  });
});
