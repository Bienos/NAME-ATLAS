import { describe, expect, it } from "vitest";
import { fullNameQuery, fullNameRequest } from "./full-name-compare-request.js";

/** TASK-155 AC-5 — the full-name comparison's query. Pure. */
describe("fullNameRequest", () => {
  it("is an empty form, without an error, when nothing was typed", () => {
    const request = fullNameRequest({});
    expect(request.rows).toHaveLength(4);
    expect(request.people).toEqual([]);
    expect(request.error).toBeNull();
  });

  it("reads two to four complete people, in order, skipping empty rows", () => {
    const request = fullNameRequest({
      f1: " Zofia ",
      s1: "Nowak",
      f3: "Jan",
      s3: "Kowalski",
      f4: "Ola",
      s4: "Wiśniewska",
    });
    expect(request.error).toBeNull();
    expect(request.people).toEqual([
      { given: "Zofia", surname: "Nowak" },
      { given: "Jan", surname: "Kowalski" },
      { given: "Ola", surname: "Wiśniewska" },
    ]);
  });

  it("refuses a row with only one of its two fields", () => {
    expect(fullNameRequest({ f1: "Zofia", s1: "Nowak", f2: "Jan" }).error).toBe("HALF");
    expect(fullNameRequest({ f1: "Zofia", s1: "Nowak", s2: "Kowalski" }).error).toBe("HALF");
  });

  it("asks for a second person when only one is typed", () => {
    expect(fullNameRequest({ f1: "Zofia", s1: "Nowak" }).error).toBe("NEEDS_TWO");
  });

  it("never reads a fifth person", () => {
    const query: Record<string, string> = {};
    for (let n = 1; n <= 5; n += 1) {
      query[`f${n}`] = `Imię${n}`;
      query[`s${n}`] = `Nazwisko${n}`;
    }
    const request = fullNameRequest(query);
    expect(request.people).toHaveLength(4);
    expect(request.people.map((p) => p.given)).not.toContain("Imię5");
  });

  it("bounds what was typed and takes the first of a repeated field", () => {
    const request = fullNameRequest({ f1: ["Zofia", "Ewa"], s1: "N".repeat(500) });
    expect(request.rows[0]).toEqual({ given: "Zofia", surname: "N".repeat(80) });
  });
});

describe("fullNameQuery", () => {
  it("carries the typed rows to the other language, encoded", () => {
    const { rows } = fullNameRequest({
      f1: "Zofia",
      s1: "Żmuda-Trzebiatowski",
      f3: "a&b",
      s3: "x",
    });
    expect(fullNameQuery(rows)).toBe("?f1=Zofia&s1=%C5%BBmuda-Trzebiatowski&f3=a%26b&s3=x");
    expect(fullNameQuery(fullNameRequest({}).rows)).toBe("");
  });
});
