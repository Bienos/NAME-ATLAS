/**
 * Acquisition checks for the registered PESEL resources.
 *
 * The importer downloads nothing (TASK-004 §8), and that stays true: fetching
 * is a separate step, `bin/fetch-pesel.ts`, whose only job is to put the exact
 * official bytes on disk. This module is its pure half — where a resource is
 * kept locally, and whether a set of bytes is the one the registry pins.
 *
 * A mismatch is never repaired or tolerated. If the publisher has replaced a
 * file, its bytes are a different resource version, and importing them under
 * this registry entry would attach the wrong provenance to every row.
 */
import { sha256Hex } from "./importer.js";
import type { PeselResourceDescriptor } from "./registry.js";

/** `data/<role>-<data_date>.csv`, e.g. `national-male-2026-01-20.csv` — the names `docs/LOCAL_DATABASE.md` uses. */
export function localFileName(resource: PeselResourceDescriptor): string {
  return `${resource.role.replace("_", "-")}-${resource.data_date}.csv`;
}

export type ResourceBytesVerdict =
  | { readonly kind: "MATCH" }
  | {
      readonly kind: "SIZE_MISMATCH" | "CHECKSUM_MISMATCH";
      readonly expected: string;
      readonly actual: string;
    };

/** Whether `bytes` are exactly the official resource the registry pins. Size first: it is cheaper and names the likelier failure. */
export function verifyResourceBytes(
  resource: PeselResourceDescriptor,
  bytes: Uint8Array,
): ResourceBytesVerdict {
  if (bytes.byteLength !== resource.official_byte_size) {
    return {
      kind: "SIZE_MISMATCH",
      expected: String(resource.official_byte_size),
      actual: String(bytes.byteLength),
    };
  }
  const actual = sha256Hex(bytes);
  if (actual !== resource.official_sha256) {
    return { kind: "CHECKSUM_MISMATCH", expected: resource.official_sha256, actual };
  }
  return { kind: "MATCH" };
}
