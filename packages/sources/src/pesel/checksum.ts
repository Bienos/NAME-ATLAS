/**
 * Content pinning for PESEL ingestion (TASK-004 AC-01, AC-20, §10).
 *
 * The checksum is verified against the raw bytes BEFORE they are decoded or
 * parsed, so a changed resource is reported as a finding rather than
 * imported. A file that would also fail the schema validator still reports
 * the checksum mismatch, because the checksum is checked first.
 */
import { createHash } from "node:crypto";
import { PeselImportError } from "./errors.js";

const SHA256_HEX = /^[0-9a-f]{64}$/u;

/** Lowercase hex SHA-256 of the given bytes. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * Fails closed unless `bytes` hash to `expectedSha256`.
 *
 * `expectedSha256` is always supplied by the caller and never read from the
 * source registry: the registry holds the checksums of the FULL official
 * resources, and the repository's committed fixtures are excerpts of them.
 * Treating one as the other would assert a provenance that does not hold
 * (TASK-004 §12 rule 1).
 */
export function assertContentHash(bytes: Uint8Array, expectedSha256: string): string {
  if (!SHA256_HEX.test(expectedSha256)) {
    throw new PeselImportError(
      "checksum_mismatch",
      `expected checksum is not a lowercase hex SHA-256: ${JSON.stringify(expectedSha256)}`,
    );
  }
  const actual = sha256Hex(bytes);
  if (actual !== expectedSha256) {
    throw new PeselImportError(
      "checksum_mismatch",
      `resource bytes do not match the expected checksum (expected ${expectedSha256}, got ${actual}); ` +
        "a changed resource is a finding to report, not something to import",
    );
  }
  return actual;
}
