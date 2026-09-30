/**
 * `fixtures/teryt/source-manifest.json`, the TERYT acquisition record
 * (TASK-039 §4 item 1), read at run time so the checksums the importer
 * expects cannot drift from the recorded ones.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TerytFileInput } from "./importer.js";
import type { TerytFile } from "./plan.js";

const TERYT_MANIFEST_PATH = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../../fixtures/teryt/source-manifest.json",
);

export interface TerytManifestResource {
  readonly registry: TerytFile;
  readonly resource_id: string;
  readonly retrieved_at: string;
  readonly csv: { readonly member: string; readonly sha256: string; readonly data_rows: number };
  readonly excerpt: { readonly path: string; readonly sha256: string; readonly data_rows: number };
}

export interface TerytManifest {
  readonly source_key: string;
  readonly acquisition: { readonly page_url: string };
  readonly terms: readonly unknown[];
  readonly resources: readonly TerytManifestResource[];
}

export function readTerytManifest(filePath: string = TERYT_MANIFEST_PATH): TerytManifest {
  const manifest = JSON.parse(readFileSync(filePath, "utf8")) as TerytManifest;
  for (const registry of ["TERC", "SIMC"] as const) {
    const found = manifest.resources.filter((r) => r.registry === registry);
    if (found.length !== 1) {
      throw new Error(`TERYT manifest must describe exactly one ${registry} resource`);
    }
  }
  return manifest;
}

/**
 * The importer's input for one file, from the manifest.
 *
 * `excerpt: true` expects the committed excerpt's checksum, and says so in the
 * stored payload. The payload is the manifest's own acquisition record,
 * never synthesised.
 */
export function terytFileInput(
  manifest: TerytManifest,
  registry: TerytFile,
  bytes: Uint8Array,
  options: { readonly excerpt?: boolean; readonly expectedSha256?: string } = {},
): TerytFileInput {
  const resource = manifest.resources.find((r) => r.registry === registry);
  if (!resource) {
    throw new Error(`TERYT manifest has no ${registry} resource`);
  }
  const excerpt = options.excerpt === true;
  return {
    bytes,
    expectedSha256:
      options.expectedSha256 ?? (excerpt ? resource.excerpt.sha256 : resource.csv.sha256),
    rawPayload: {
      imported_bytes: excerpt ? "EXCERPT" : "FULL_CSV_MEMBER",
      acquisition: manifest.acquisition,
      terms: manifest.terms,
      resource,
    },
    retrievedAt: resource.retrieved_at,
    sourceUrl: manifest.acquisition.page_url,
  };
}
