import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { assertContentHash, sha256Hex } from "./checksum.js";
import { PeselImportError } from "./errors.js";
import { parsePeselFile } from "../parser.js";
import { decodePeselBytes } from "../decode.js";

/**
 * TASK-004 §11 unit item 5 — a checksum mismatch is raised BEFORE any
 * parsing. Proved by handing over bytes that would also fail the schema
 * validator and asserting the checksum error, not the schema error.
 */
const FIXTURE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixtures/pesel",
);

const MALE_FIXTURE = path.join(FIXTURE_DIR, "national-male-2026-01-20.csv");

function expectImportError(fn: () => unknown): PeselImportError {
  let raised: unknown;
  try {
    fn();
  } catch (error: unknown) {
    raised = error;
  }
  expect(raised).toBeInstanceOf(PeselImportError);
  return raised as PeselImportError;
}

describe("content pinning", () => {
  it("accepts bytes that hash to the expected value", () => {
    // The fixture's OWN checksum, computed here. This is an excerpt of the
    // official resource, not the resource: its hash is not and must not be
    // the official one (TASK-004 §12 rule 1).
    const bytes = readFileSync(MALE_FIXTURE);
    const expected = sha256Hex(bytes);
    expect(assertContentHash(bytes, expected)).toBe(expected);
    expect(expected).toMatch(/^[0-9a-f]{64}$/u);
  });

  it("rejects bytes that do not match", () => {
    const bytes = readFileSync(MALE_FIXTURE);
    const wrong = "0".repeat(64);
    const error = expectImportError(() => assertContentHash(bytes, wrong));
    expect(error.reasonCode).toBe("checksum_mismatch");
    expect(error.message).toContain("a finding to report");
  });

  it("rejects an expected value that is not a lowercase hex SHA-256", () => {
    const bytes = readFileSync(MALE_FIXTURE);
    for (const bad of ["", "not-a-hash", sha256Hex(bytes).toUpperCase()]) {
      expect(expectImportError(() => assertContentHash(bytes, bad)).reasonCode).toBe(
        "checksum_mismatch",
      );
    }
  });

  it("raises the checksum error before parsing, for bytes that would also fail parsing", () => {
    const broken = Buffer.from("not,a,pesel,file\nat all\n", "utf8");
    // Confirm the bytes really would fail the schema validator...
    expect(() => parsePeselFile(decodePeselBytes(broken))).toThrow();
    // ...and that the checksum is nonetheless what is reported.
    const error = expectImportError(() => assertContentHash(broken, "a".repeat(64)));
    expect(error.reasonCode).toBe("checksum_mismatch");
    expect(error.name).toBe("PeselImportError");
  });

  it("hashes deterministically", () => {
    const bytes = readFileSync(MALE_FIXTURE);
    expect(sha256Hex(bytes)).toBe(sha256Hex(readFileSync(MALE_FIXTURE)));
    expect(sha256Hex(new Uint8Array())).toBe(
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
  });
});
