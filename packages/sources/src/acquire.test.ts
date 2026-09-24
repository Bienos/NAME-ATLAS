import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { localFileName, verifyResourceBytes } from "./acquire.js";
import { sha256Hex } from "./importer.js";
import {
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_NATIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
  PESEL_REGIONAL_MALE_2026,
} from "./registry.js";
import type { PeselResourceDescriptor } from "./registry.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const ALL = [
  PESEL_NATIONAL_MALE_2026,
  PESEL_NATIONAL_FEMALE_2026,
  PESEL_REGIONAL_MALE_2026,
  PESEL_REGIONAL_FEMALE_2026,
];

describe("localFileName", () => {
  it("matches the fixture names, so the runbook's paths and the fetched files agree", () => {
    expect(ALL.map(localFileName)).toEqual([
      "national-male-2026-01-20.csv",
      "national-female-2026-01-20.csv",
      "regional-male-2026-01-20.csv",
      "regional-female-2026-01-20.csv",
    ]);
  });
});

describe("verifyResourceBytes", () => {
  it("refuses a committed excerpt: it is not the official resource", () => {
    for (const resource of ALL) {
      const bytes = readFileSync(path.join(repoRoot, "fixtures/pesel", localFileName(resource)));
      expect(verifyResourceBytes(resource, bytes).kind).toBe("SIZE_MISMATCH");
    }
  });

  it("checks the checksum when the size happens to match", () => {
    const bytes = new Uint8Array(PESEL_NATIONAL_MALE_2026.official_byte_size);
    const verdict = verifyResourceBytes(PESEL_NATIONAL_MALE_2026, bytes);
    expect(verdict.kind).toBe("CHECKSUM_MISMATCH");
    if (verdict.kind === "MATCH") throw new Error("unreachable");
    expect(verdict.actual).toBe(sha256Hex(bytes));
    expect(verdict.expected).toBe(PESEL_NATIONAL_MALE_2026.official_sha256);
  });

  it("accepts bytes whose size and digest both match", () => {
    const bytes = new TextEncoder().encode("Nazwisko aktualne,Liczba\n");
    const pinned: PeselResourceDescriptor = {
      ...PESEL_NATIONAL_MALE_2026,
      official_byte_size: bytes.byteLength,
      official_sha256: sha256Hex(bytes),
    };
    expect(verifyResourceBytes(pinned, bytes)).toEqual({ kind: "MATCH" });
  });
});
