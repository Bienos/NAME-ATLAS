import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { decodePeselBytes } from "./decode.js";
import { PeselSchemaError } from "./errors.js";
import { parsePeselRegionalFile } from "./regional-parser.js";
import {
  isPeselRegionalGeographyValue,
  PESEL_REGIONAL_GEOGRAPHY_VALUES,
  PESEL_REGIONAL_HEADER,
} from "./regional-schema.js";
import { readVoivodeshipCorrespondence } from "./voivodeships.js";

/**
 * TASK-011 — the regional file shape, tested against the committed real
 * fixtures and against deliberately mutated copies of them.
 *
 * The fixtures are verbatim excerpts of the official resources
 * (`docs/sources/pesel-regional.md`); the mutations below are synthetic and
 * exist only to prove the parser refuses them.
 */
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const readFixture = (name: string): string =>
  decodePeselBytes(readFileSync(path.join(repoRoot, "fixtures/pesel", name)));

const MALE = readFixture("regional-male-2026-01-20.csv");
const FEMALE = readFixture("regional-female-2026-01-20.csv");

/** Rebuilds a file from rows, with the confirmed header and terminator. */
function file(rows: readonly string[]): string {
  return [PESEL_REGIONAL_HEADER, ...rows].join("\r\n") + "\r\n";
}

describe("parsePeselRegionalFile against the committed fixtures", () => {
  it("parses both fixtures and returns every row", () => {
    expect(parsePeselRegionalFile(MALE)).toHaveLength(40);
    expect(parsePeselRegionalFile(FEMALE)).toHaveLength(38);
  });

  it("keeps the raw strings: no trim, no case change, no normalisation", () => {
    for (const row of parsePeselRegionalFile(MALE)) {
      expect(row.geography).toBe(row.geography.normalize("NFC"));
      expect(row.surname.trim()).not.toBe("");
      expect(Number.isInteger(row.count)).toBe(true);
      expect(row.count).toBeGreaterThanOrEqual(2);
    }
  });

  it("covers all 16 voivodeship values across the male fixture", () => {
    const seen = new Set(parsePeselRegionalFile(MALE).map((r) => r.geography));
    expect([...seen].sort()).toEqual([...PESEL_REGIONAL_GEOGRAPHY_VALUES].sort());
  });

  it("admits a surname appearing in several voivodeships — that is data, not a duplicate", () => {
    const rows = parsePeselRegionalFile(MALE);
    const bySurname = new Map<string, number>();
    for (const row of rows) bySurname.set(row.surname, (bySurname.get(row.surname) ?? 0) + 1);
    expect(Math.max(...bySurname.values())).toBeGreaterThan(1);
  });
});

describe("parsePeselRegionalFile fails closed", () => {
  it("rejects the national two-column header", () => {
    expect(() => parsePeselRegionalFile("Nazwisko aktualne,Liczba\r\nNOWAK,5\r\n")).toThrow(
      PeselSchemaError,
    );
  });

  it("rejects a 17th geography value rather than accommodating it", () => {
    // A value outside the closed set has no recorded TERC code, so it has no
    // Place to reference — and a code is never guessed (D-004).
    expect(() => parsePeselRegionalFile(file(["ZAGRANICA,NOWAK,5"]))).toThrow(
      /not one of the 16 confirmed voivodeship values/u,
    );
    expect(() => parsePeselRegionalFile(file(["dolnośląskie,NOWAK,5"]))).toThrow(
      /not one of the 16 confirmed/u,
    );
    expect(() => parsePeselRegionalFile(file(["MAZOWIECKIE ,NOWAK,5"]))).toThrow(
      /not one of the 16 confirmed/u,
    );
  });

  it("rejects a count below the confirmed per-cell suppression threshold", () => {
    for (const bad of ["MAZOWIECKIE,NOWAK,1", "MAZOWIECKIE,NOWAK,0"]) {
      expect(() => parsePeselRegionalFile(file([bad]))).toThrow(
        /below the confirmed minimum valid value 2/u,
      );
    }
  });

  it("rejects the wrong column count, a non-numeric count and an empty surname", () => {
    expect(() => parsePeselRegionalFile(file(["MAZOWIECKIE,NOWAK"]))).toThrow(
      /expected 3 columns/u,
    );
    expect(() => parsePeselRegionalFile(file(["MAZOWIECKIE,NOWAK,5,extra"]))).toThrow(
      /expected 3 columns/u,
    );
    expect(() => parsePeselRegionalFile(file(["MAZOWIECKIE,NOWAK,five"]))).toThrow(
      /not a plain non-negative integer/u,
    );
    expect(() => parsePeselRegionalFile(file(["MAZOWIECKIE,,5"]))).toThrow(
      /surname column is empty/u,
    );
  });

  it("rejects LF line endings and a missing trailing terminator", () => {
    expect(() => parsePeselRegionalFile(`${PESEL_REGIONAL_HEADER}\nMAZOWIECKIE,NOWAK,5\n`)).toThrow(
      /bare LF or CR/u,
    );
    expect(() => parsePeselRegionalFile(`${PESEL_REGIONAL_HEADER}\r\nMAZOWIECKIE,NOWAK,5`)).toThrow(
      /trailing line terminator/u,
    );
  });

  it("reports the line number of the first violation, not just that one exists", () => {
    try {
      parsePeselRegionalFile(file(["MAZOWIECKIE,NOWAK,5", "MAZOWIECKIE,KOWALSKI,1"]));
      throw new Error("expected a schema error");
    } catch (error) {
      expect(error).toBeInstanceOf(PeselSchemaError);
      expect((error as PeselSchemaError).line).toBe(3);
    }
  });
});

describe("the closed geography value set", () => {
  it("holds exactly the 16 voivodeships and compares without transformation", () => {
    expect(PESEL_REGIONAL_GEOGRAPHY_VALUES).toHaveLength(16);
    expect(isPeselRegionalGeographyValue("MAZOWIECKIE")).toBe(true);
    expect(isPeselRegionalGeographyValue("mazowieckie")).toBe(false);
    expect(isPeselRegionalGeographyValue("MAZOWIECKIE ")).toBe(false);
  });

  it("carries no value for abroad or unknown — the residual is a finding, not a bucket", () => {
    for (const value of PESEL_REGIONAL_GEOGRAPHY_VALUES) {
      expect(value).not.toMatch(/ZAGRANICA|NIEZNANE|BRAK|INNE/u);
    }
  });
});

describe("the TERC correspondence this task seeds places from", () => {
  it("maps all 16 values, by exact equality, with the register's identity recorded", () => {
    const correspondence = readVoivodeshipCorrespondence();
    expect(correspondence.entries).toHaveLength(16);
    expect(correspondence.registerReferenceDate).toBe("2026-01-01");
    expect(correspondence.tercFileSha256).toMatch(/^[0-9a-f]{64}$/u);
    for (const entry of correspondence.entries) {
      expect(entry.terc_code).toMatch(/^[0-9]{2}$/u);
      expect(entry.match).toBe("EXACT_STRING_EQUALITY");
      expect(entry.terc_name_dod).toBe("województwo");
    }
  });

  it("covers exactly the values the parser accepts — one source of truth, checked", () => {
    const fromFile = readVoivodeshipCorrespondence().entries.map(
      (entry) => entry.observed_geography_value,
    );
    expect(fromFile.sort()).toEqual([...PESEL_REGIONAL_GEOGRAPHY_VALUES].sort());
  });
});
