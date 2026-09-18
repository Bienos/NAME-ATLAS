import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PeselSchemaError } from "./errors.js";
import { PESEL_HEADER } from "./schema.js";
import { parsePeselFile } from "./parser.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.resolve(__dirname, "../../../fixtures/pesel");

function readFixture(name: string): string {
  return readFileSync(path.join(FIXTURES_DIR, name), "utf-8");
}

const CRLF = "\r\n";

/** Builds a minimal valid one-row file with the confirmed shape, for negative tests. */
function buildFile(rows: string[]): string {
  return [PESEL_HEADER, ...rows].join(CRLF) + CRLF;
}

describe("parsePeselFile — real fixtures (TASK-002 §8 item 20: valid input)", () => {
  it("parses the committed male fixture without error", () => {
    const rows = parsePeselFile(readFixture("national-male-2026-01-20.csv"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual({ surname: "NOWAK", count: 98387 });
  });

  it("parses the committed female fixture without error", () => {
    const rows = parsePeselFile(readFixture("national-female-2026-01-20.csv"));
    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toEqual({ surname: "NOWAK", count: 99738 });
  });

  it("preserves a surname built from a base letter plus a standalone combining mark, unmodified", () => {
    const rows = parsePeselFile(readFixture("national-male-2026-01-20.csv"));
    const dogan = rows.find((r) => r.count === 5 && r.surname.startsWith("DOG"));
    expect(dogan?.surname).toBe("DOG̈AN");
  });

  it("preserves a surname containing a forward slash, unmodified", () => {
    const rows = parsePeselFile(readFixture("national-male-2026-01-20.csv"));
    expect(rows.some((r) => r.surname === "W/SILASSIE")).toBe(true);
  });

  it("preserves trailing whitespace in a surname, unmodified (does not trim)", () => {
    const rows = parsePeselFile(readFixture("national-female-2026-01-20.csv"));
    expect(rows.some((r) => r.surname === "SCHIED ")).toBe(true);
  });

  it("accepts the confirmed suppression-boundary count of exactly 2", () => {
    const rows = parsePeselFile(readFixture("national-male-2026-01-20.csv"));
    expect(rows.some((r) => r.count === 2)).toBe(true);
  });
});

describe("parsePeselFile — fail-closed schema drift (TASK-002 §8 item 20: drift rejection)", () => {
  it("rejects a header that does not match exactly", () => {
    const file = buildFile(["NOWAK,1000"]).replace(PESEL_HEADER, "Nazwisko,Liczba");
    expect(() => parsePeselFile(file)).toThrow(PeselSchemaError);
    expect(() => parsePeselFile(file)).toThrow(/header/i);
  });

  it("rejects a row with a missing column", () => {
    const file = buildFile(["NOWAKBEZLICZBY"]);
    expect(() => parsePeselFile(file)).toThrow(/2 columns, found 1/);
  });

  it("rejects a row with an extra column", () => {
    const file = buildFile(["NOWAK,1000,EXTRA"]);
    expect(() => parsePeselFile(file)).toThrow(/2 columns, found 3/);
  });

  it("rejects a non-numeric count", () => {
    const file = buildFile(["NOWAK,dużo"]);
    expect(() => parsePeselFile(file)).toThrow(/not a plain non-negative integer/);
  });

  it("rejects a count of exactly 1 (below the confirmed suppression threshold)", () => {
    const file = buildFile(["RZADKIE,1"]);
    expect(() => parsePeselFile(file)).toThrow(/below the confirmed minimum/);
  });

  it("rejects a count of 0", () => {
    const file = buildFile(["ZERO,0"]);
    expect(() => parsePeselFile(file)).toThrow(/below the confirmed minimum/);
  });

  it("rejects a negative count", () => {
    const file = buildFile(["UJEMNE,-5"]);
    // a leading '-' fails the plain-digit pattern before the range check runs
    expect(() => parsePeselFile(file)).toThrow(/not a plain non-negative integer/);
  });

  it("rejects an empty surname", () => {
    const file = buildFile([",5"]);
    expect(() => parsePeselFile(file)).toThrow(/surname column is empty/);
  });

  it("rejects LF-only line endings", () => {
    const file = buildFile(["NOWAK,1000"]).replaceAll(CRLF, "\n");
    expect(() => parsePeselFile(file)).toThrow(/bare LF or CR/);
  });

  it("rejects a file missing its trailing line terminator", () => {
    const file = buildFile(["NOWAK,1000"]).slice(0, -CRLF.length);
    expect(() => parsePeselFile(file)).toThrow(/trailing/);
  });

  it("rejects a completely empty file", () => {
    expect(() => parsePeselFile("")).toThrow(/no header row/);
  });

  it("reports the correct 1-indexed line number for a bad data row", () => {
    const file = buildFile(["NOWAK,1000", "BAD,x"]);
    try {
      parsePeselFile(file);
      expect.fail("expected parsePeselFile to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(PeselSchemaError);
      expect((error as PeselSchemaError).line).toBe(3);
    }
  });
});
